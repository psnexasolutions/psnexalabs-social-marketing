import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub'$$;
` .replace("select nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub'","select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid"));
await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 grant usage on schema public,auth to authenticated,service_role;grant execute on all functions in schema auth to authenticated,service_role;
 create table storage.buckets(id text primary key,name text,public bool,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;`);
for(const f of (await readdir('supabase/migrations')).sort()){console.log('Applying',f);await db.exec(await readFile('supabase/migrations/'+f,'utf8'));}
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
await db.exec(`insert into auth.users(id,email) values('${uid}','owner@example.test'),('${other}','other@example.test');`);
async function identity(id:string){await db.exec(`reset role;set role authenticated;select set_config('request.jwt.claims','{"sub":"${id}","email":"owner@example.test"}',false);`);}
await identity(uid);
const oid=(await db.query<{id:string}>(`select create_workspace('Test organisation') id`)).rows[0].id;
const brand=(await db.query<{id:string}>(`insert into brands(organisation_id,name,timezone,locale) values($1,'Test brand','UTC','en') returning id`,[oid])).rows[0].id;
async function cmd(op:string,args:unknown){return (await db.query<{r:any}>('select app_command($1,$2,$3::jsonb) r',[oid,op,JSON.stringify(args)])).rows[0].r;}
const args={brandId:brand,title:'My story',caption:'Original text',idempotencyKey:'save-test-key-1'};
const first=await cmd('save_post',args),second=await cmd('save_post',args);assert.equal(first.id,second.id);
await assert.rejects(()=>cmd('save_post',{...args,caption:'changed'}),/IDEMPOTENCY_CONFLICT/);
await cmd('approve',{revisionId:first.revisionId,expectedVersion:1});
await identity(other);
assert.equal((await db.query('select * from brands where organisation_id=$1',[oid])).rows.length,0,'RLS hides another tenant');
await assert.rejects(()=>cmd('save_post',{...args,idempotencyKey:'cross-tenant-key'}),/FORBIDDEN/);
await assert.rejects(()=>db.query(`insert into memberships(organisation_id,user_id,status,role) values($1,$2,'active','owner')`,[oid,other]),/permission denied/);
await identity(uid);await db.exec('reset role');
const count=await db.query<{count:number}>(`select count(*)::int count from information_schema.tables where table_schema='public' and table_type='BASE TABLE'`);
assert.equal(count.rows[0].count,181);
// Seed a verified test-only account through privileged fixture setup.
const prov=(await db.query<{id:string}>(`select id from providers where key='x'`)).rows[0].id;
const conn=(await db.query<{id:string}>(`insert into social_connections(organisation_id,brand_id,provider_id,connected_by,external_subject,status) values($1,$2,$3,$4,'123','active') returning id`,[oid,brand,prov,uid])).rows[0].id;
const account=(await db.query<{id:string}>(`insert into social_accounts(organisation_id,brand_id,provider_id,connection_id,external_id,account_type,display_name,status,provider_key,publish_enabled) values($1,$2,$3,$4,'123','USER','Test','active','x',true) returning id`,[oid,brand,prov,conn])).rows[0].id;
await identity(uid);
const plan=await cmd('prepare',{revisionId:first.revisionId,accountIds:[account],idempotencyKey:'prepare-test-key'});
const commitArgs={planId:plan.id,planHash:plan.planHash,idempotencyKey:'commit-test-key'};
const batch=await cmd('commit',commitArgs);assert.equal((await cmd('commit',commitArgs)).id,batch.id);
assert.equal((await db.query('select * from publishing_targets where batch_id=$1',[batch.id])).rows.length,1);
await assert.rejects(()=>cmd('commit',{...commitArgs,idempotencyKey:'different-commit-key'}),/PLAN_EXPIRED_OR_USED/);
// Workflow tables cannot be forged through the public PostgREST role.
await assert.rejects(()=>db.query(`update content_revisions set caption='unapproved edit' where id=$1`,[first.revisionId]),/permission denied/);
await db.exec('reset role;set role service_role');const claimed=await db.query('select * from claim_publish_targets(5)');assert.equal(claimed.rows.length,1);
await db.exec('reset role');await db.query(`update publishing_targets set lease_until=now()-interval '1 minute' where batch_id=$1`,[batch.id]);await db.exec('set role service_role');assert.equal((await db.query('select * from claim_publish_targets(5)')).rows.length,0);
assert.equal((await db.query<{state:string}>('select state from publishing_targets where batch_id=$1',[batch.id])).rows[0].state,'UNKNOWN');

await identity(uid);
const comp=(await db.query<{id:string}>(`insert into competitors(organisation_id,brand_id,name,relation,market,status) values($1,$2,'Peer','DIRECT','NZ','active') returning id`,[oid,brand])).rows[0].id;
const imported={brandId:brand,competitorId:comp,sourceUrl:'https://example.test/source',observation:'The competitor uses public customer testimonials on its home page.',idempotencyKey:'evidence-test-key-1'};
async function intel(op:string,args:unknown){return (await db.query<{r:any}>('select intelligence_command($1,$2,$3::jsonb) r',[oid,op,JSON.stringify(args)])).rows[0].r;}
await intel('import_evidence',imported);
await intel('import_evidence',{...imported,idempotencyKey:'evidence-test-key-2',observation:'Their second message describes the delivery process in three steps.'});
await intel('recommend',{brandId:brand,objective:'More enquiries',idempotencyKey:'recommend-test-key'});
assert.equal((await db.query('select * from marketing_recommendations where organisation_id=$1',[oid])).rows.length,3);
assert.equal((await db.query('select * from competitor_sources where organisation_id=$1',[oid])).rows.length,1);
await cmd('settings',{prohibitSelfApproval:true});
const draft=await cmd('save_post',{...args,idempotencyKey:'new-draft-key'});
await assert.rejects(()=>cmd('approve',{revisionId:draft.revisionId,expectedVersion:1}),/SELF_APPROVAL_PROHIBITED/);
await cmd('settings',{prohibitSelfApproval:false});
await cmd('team_add',{email:'other@example.test',role:'viewer'});
await identity(other);
await assert.rejects(()=>cmd('approve',{revisionId:draft.revisionId,expectedVersion:1}),/FORBIDDEN/);
await assert.rejects(()=>db.query(`insert into campaigns(organisation_id,brand_id,name,objective) values($1,$2,'forged','x')`,[oid,brand]),/row-level security/);
await identity(uid);
const page=(await db.query<{id:string}>(`insert into landing_pages(organisation_id,brand_id,slug,title,draft_blocks) values($1,$2,'hello','Public story','[{"type":"heading","text":"Hello"}]') returning id`,[oid,brand])).rows[0].id;
await db.query('select release_page($1,$2,1)',[oid,page]);
assert.equal((await db.query(`select * from page_releases where page_id=$1 and state='PUBLISHED'`,[page])).rows.length,1);
await assert.rejects(()=>db.query(`select mcp_command(gen_random_uuid(),'commit','{}')`),/permission denied/);

async function marketing(op:string,args:unknown){return (await db.query<{r:any}>('select marketing_command($1,$2,$3::jsonb) r',[oid,op,JSON.stringify(args)])).rows[0].r;}
const mediaArgs={brandId:brand,name:'Test media plan',objective:'OUTCOME_SALES',funnel:'TOFU',awareness:'problem',budgetMinor:10000,currency:'USD',hypothesis:'A demonstration improves qualified demand',primaryMetric:'new_customers',clickDays:7,viewDays:1,idempotencyKey:'media-plan-test'};
const media=await marketing('create_media_plan',mediaArgs);assert.equal((await marketing('create_media_plan',mediaArgs)).id,media.id);
await assert.rejects(()=>marketing('create_media_plan',{...mediaArgs,name:'Changed'}),/IDEMPOTENCY_CONFLICT/);
await assert.rejects(()=>marketing('approve_media_plan',{brandId:brand,id:media.id,version:1,idempotencyKey:'approve-self-media'}),/SEPARATE_APPROVER_REQUIRED/);
await assert.rejects(()=>db.query(`update media_plans set state='APPROVED' where id=$1`,[media.id]),/permission denied/);
await identity(other);await assert.rejects(()=>marketing('create_media_plan',{...mediaArgs,idempotencyKey:'viewer-media-plan'}),/FORBIDDEN/);
await db.exec('reset role');await db.query(`update memberships set role='approver' where organisation_id=$1 and user_id=$2`,[oid,other]);await identity(other);
await marketing('approve_media_plan',{brandId:brand,id:media.id,version:1,idempotencyKey:'approve-media-plan'});
assert.equal((await db.query<{state:string}>('select state from media_plans where id=$1',[media.id])).rows[0].state,'APPROVED');
await assert.rejects(()=>marketing('approve_media_plan',{brandId:brand,id:media.id,version:1,idempotencyKey:'stale-media-plan'}),/VERSION_CONFLICT/);
await identity(uid);
const signal={brandId:brand,eventId:'order-12345',eventName:'Purchase',eventTime:Math.floor(Date.now()/1000),sourceUrl:'https://example.test/complete',consent:true,emailHash:'a'.repeat(64),value:50,currency:'USD',idempotencyKey:'signal-queue-test'};
await assert.rejects(()=>marketing('queue_signal',{...signal,consent:false}),/CONSENT_REQUIRED/);
const queued=await marketing('queue_signal',signal);assert.equal((await marketing('queue_signal',signal)).id,queued.id);
await assert.rejects(()=>marketing('queue_signal',{...signal,idempotencyKey:'signal-duplicate-test'}),/unique constraint/);
await assert.rejects(()=>db.query('select * from measurement_connections'),/permission denied/);
await db.exec('reset role');await db.query(`insert into measurement_connections(organisation_id,brand_id,dataset_id,encrypted_token,enabled,expires_at) values($1,$2,'123','encrypted-test-fixture',true,now()+interval '1 day')`,[oid,brand]);
await db.exec('set role service_role');assert.equal((await db.query('select * from claim_conversion_signal()')).rows.length,1);assert.equal((await db.query('select * from claim_conversion_signal()')).rows.length,0);
await db.exec('reset role');await db.query(`update conversion_signals set attempt_at=now()-interval '10 minutes' where id=$1`,[queued.id]);await db.exec('set role service_role');assert.equal((await db.query('select * from claim_conversion_signal()')).rows.length,0);
assert.equal((await db.query<{state:string}>('select state from conversion_signals where id=$1',[queued.id])).rows[0].state,'UNKNOWN');
await identity(other);const separate=(await db.query<{id:string}>(`select create_workspace('Separate tenant') id`)).rows[0].id;
await identity(uid);assert.equal((await db.query('select * from media_plans where organisation_id=$1',[separate])).rows.length,0);
// V5: database authority is tested independently of the HTTP validators.
async function channel(op:string,args:unknown){return (await db.query<{r:any}>('select channel_command($1,$2,$3::jsonb) r',[oid,op,JSON.stringify(args)])).rows[0].r;}
await identity(uid);
const profileArgs={brandId:brand,channel:'linkedin-personal',personName:'Founder',identity:'Original experience',audience:'Small business owners',voice:'Clear and helpful',proof:'Approved case example',pillars:['Education'],forbidden:['Guaranteed returns'],idempotencyKey:'v5-profile-key'};
const profile5=await channel('save_profile',profileArgs);assert.equal((await channel('save_profile',profileArgs)).id,profile5.id);
await assert.rejects(()=>channel('save_profile',{...profileArgs,voice:'Changed'}),/IDEMPOTENCY_CONFLICT/);
await assert.rejects(()=>db.query(`update channel_brand_profiles set voice='forged' where id=$1`,[profile5.id]),/permission denied/);
const ad5=await channel('import_ad',{brandId:brand,channel:'instagram',advertiser:'Test only',sourceUrl:'https://example.test/ad',sourceKind:'PUBLIC_POST',externalId:'fixture-ad',region:'NZ',regionBasis:'USER_OBSERVED',observedAt:new Date().toISOString(),copy:'Public fixture text',tags:['local'],headline:'Fixture',offer:'Fixture offer',cta:'Learn more',format:'image',permitted:true,idempotencyKey:'v5-ad-key'});
await assert.rejects(()=>channel('save_variants',{brandId:brand,channel:'instagram',region:'AU',evidenceIds:[ad5.id],variants:[{},{},{}],idempotencyKey:'v5-cross-region'}),/EVIDENCE_SCOPE_MISMATCH/);
await channel('set_video_policy',{brandId:brand,enabled:true,dailyLimitMinor:150,currency:'NZD',idempotencyKey:'v5-video-policy'});
const v5args={brandId:brand,channel:'youtube',title:'QA video only',prompt:'An original product demonstration',aspectRatio:'9:16',provider:'GOOGLE_API',providerModel:'gemini-test',estimatedCostMinor:100,currency:'NZD',rightsConfirmed:true,idempotencyKey:'v5-video-key'};
const v5job=await channel('create_video_job',v5args);
await assert.rejects(()=>channel('approve_video_job',{brandId:brand,id:v5job.id,version:1,idempotencyKey:'v5-self-approve'}),/SEPARATE_APPROVER_REQUIRED/);
await identity(other);await channel('approve_video_job',{brandId:brand,id:v5job.id,version:1,idempotencyKey:'v5-approve-video'});
await assert.rejects(()=>channel('approve_video_job',{brandId:brand,id:v5job.id,version:1,idempotencyKey:'v5-stale-approve'}),/VERSION_CONFLICT/);
await identity(uid);const v5second=await channel('create_video_job',{...v5args,idempotencyKey:'v5-video-key-2'});
await identity(other);await assert.rejects(()=>channel('approve_video_job',{brandId:brand,id:v5second.id,version:1,idempotencyKey:'v5-budget-approve'}),/VIDEO_BUDGET_LIMIT/);
await assert.rejects(()=>db.query(`select channel_command_core($1,$2,'approve_video_job','{}')`,[oid,uid]),/permission denied/);
await db.exec('reset role;set role service_role');assert.equal((await db.query('select * from claim_video_job()')).rows.length,1);assert.equal((await db.query('select * from claim_video_job()')).rows.length,0);
await db.exec('reset role');await db.query(`update video_generation_jobs set attempt_at=now()-interval '11 minutes' where id=$1`,[v5job.id]);await db.exec('set role service_role');assert.equal((await db.query('select * from claim_video_job()')).rows.length,0);assert.equal((await db.query<{state:string}>('select state from video_generation_jobs where id=$1',[v5job.id])).rows[0].state,'UNKNOWN');
await identity(uid);
// V5 MCP grants cannot approve generation and are rechecked for expiry/revocation.
await db.exec('reset role');
const grant5=(await db.query<{id:string}>(`insert into mcp_client_grants(organisation_id,membership_id,client_id,scopes,expires_at,consent_version,user_id) select $1,id,'test-video-client','["read","draft"]'::jsonb,now()+interval '1 hour','v5',$2 from memberships where organisation_id=$1 and user_id=$2 returning id`,[oid,uid])).rows[0].id;
await db.exec('set role service_role');
const viaMcp=await db.query<{r:any}>(`select channel_mcp_command($1,'create_video_job',$2::jsonb) r`,[grant5,JSON.stringify({...v5args,provider:'FLOW_HANDOFF',idempotencyKey:'v5-mcp-video'})]);assert.ok(viaMcp.rows[0].r.id);
await assert.rejects(()=>db.query(`select channel_mcp_command($1,'approve_video_job',$2::jsonb)`,[grant5,JSON.stringify({brandId:brand,id:v5second.id,version:1,idempotencyKey:'v5-mcp-deny-approve'})]),/FORBIDDEN/);
await db.exec('reset role');await db.query('update mcp_client_grants set revoked_at=now() where id=$1',[grant5]);await db.exec('set role service_role');
await assert.rejects(()=>db.query(`select channel_mcp_command($1,'create_video_job',$2::jsonb)`,[grant5,JSON.stringify({...v5args,idempotencyKey:'v5-revoked-draft'})]),/FORBIDDEN/);
await identity(uid);
if(process.env.EXPORT_SCHEMA==='true'){
 await db.exec('reset role');
 const {writeFile}=await import('node:fs/promises');
 const columns=(await db.query(`select table_name,column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema='public' order by table_name,ordinal_position`)).rows;
 const indexes=(await db.query(`select tablename,indexname,indexdef from pg_indexes where schemaname='public' order by tablename,indexname`)).rows;
 const constraints=(await db.query(`select c.relname table_name,con.conname name,pg_get_constraintdef(con.oid) definition from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' order by c.relname,con.conname`)).rows;
 await writeFile('docs/database-schema-v5.json',JSON.stringify({columns,indexes,constraints},null,2));
}
console.log('PASS: 181 tables; tenant isolation, approvals, idempotency, publishing, evidence, headless, MCP, media plans, signal deduplication and worker leases.');await db.close();
