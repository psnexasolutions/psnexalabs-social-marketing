import json,re,pathlib
root=pathlib.Path(__file__).parent
catalogue=json.load(open(root/'docs/source-catalogue.json'))
(root/'supabase/migrations').mkdir(parents=True,exist_ok=True)
(root/'src/lib').mkdir(parents=True,exist_ok=True)
(root/'docs').mkdir(exist_ok=True)
global_names={'organisations','users','permissions','providers','metric_definitions','webhook_intake','plans'}
refs={'source_id':'competitor_sources','policy_id':'intelligence_source_policies','capture_job_id':'intelligence_capture_jobs','capture_id':'intelligence_captures','comparison_id':'comparison_snapshots','observation_id':'intelligence_observations','set_id':'recommendation_sets','recommendation_id':'marketing_recommendations','plan_id':'publish_plans','authorisation_id':'publish_action_authorisations','grant_id':'mcp_client_grants','server_id':'mcp_server_registry','capability_id':'publishing_capability_snapshots','social_account_id':'social_accounts','content_revision_id':'content_revisions','membership_id':'memberships','brand_id':'brands','competitor_id':'competitors','owned_brand_id':'brands','old_capture_id':'intelligence_captures','new_capture_id':'intelligence_captures','mcp_grant_id':'mcp_client_grants','batch_id':'publication_batches','subscription_id':'intelligence_alert_subscriptions'}
T={}; source={}
for item in catalogue:
 name=item['name'].split(' ')[0]; source[name]=item
 fields=item['fields'].split('; retain')[0].replace('GLOBAL: ','')
 fields=fields.replace('window_start/end timestamp','window_start timestamp, window_end timestamp').replace('period_start/end timestamp','period_start timestamp, period_end timestamp').replace('checked_at/expires_at timestamp','checked_at timestamp, expires_at timestamp')
 cols=T.setdefault(name,{})
 sep=';' if ';' in fields else ','
 for raw in fields.split(sep):
  raw=raw.strip();m=re.match(r'([a-z_]+)([~?]?)\s+(.*)',raw)
  if not m:continue
  col,nullable,spec=m.groups()
  if col in {'id','created_at','updated_at','version'}:continue
  typ='text';target=None
  arrow=re.search(r'→\s*([a-z_]+)',spec)
  if arrow:target=arrow[1];typ='uuid'
  elif spec.startswith('FK'):
   target=spec[2:].strip() or refs.get(col)
   target={'membership':'memberships'}.get(target,target);typ='uuid'
   if target is None and col in ['created_by','actor_id','reviewer_id','approved_by','owner_id','verified_by']:target='memberships'
  else:
   typ=spec.split()[0].lower()
   if typ=='enum':typ='text'
   if typ=='timestamp':typ='timestamptz'
  cols[col]={'type':typ,'required':not bool(nullable),'ref':target}
# Named joins specified in V2 prose.
T['content_revision_rights']={'revision_id':{'type':'uuid','required':True,'ref':'content_revisions'},'release_id':{'type':'uuid','required':True,'ref':'talent_releases'}}
T['content_revision_agreements']={'revision_id':{'type':'uuid','required':True,'ref':'content_revisions'},'agreement_id':{'type':'uuid','required':True,'ref':'creator_agreements'}}
def add(t,c,ty='text',req=False,ref=None,default=None):T[t][c]={'type':ty,'required':req,'ref':ref,'default':default}
add('memberships','role',req=True,default="'viewer'")
add('organisations','prohibit_self_approval','bool',True,default='false')
add('content_revisions','caption',req=True,default="''");add('content_revisions','scene','jsonb',True,default="'{}'::jsonb")
add('content_revisions','approved_by','uuid',False,'users');add('content_revisions','approved_at','timestamptz')
add('content_revisions','media_asset_id','uuid',False,'assets');add('content_revisions','script_revision_id','uuid',False,'script_revisions')
add('design_revisions','scene','jsonb',True,default="'{}'::jsonb")
add('social_accounts','provider_key',req=True,default="'export'")
add('social_accounts','publish_enabled','bool',True,default='false')
add('oauth_credentials','encrypted_token',req=True,default="''")
add('oauth_states','verifier_ciphertext');add('oauth_states','organisation_membership_id','uuid',False,'memberships')
add('publishing_targets','plan_target_id','uuid',False,'publish_plan_targets');add('publishing_targets','accepted_at','timestamptz')
add('publishing_targets','last_reconciled_at','timestamptz');add('publishing_targets','provider_receipt')
add('publication_attempts','request_hash');add('publication_attempts','ambiguity_reason')
add('publish_plans','target_accounts','uuid[]',True,default="'{}'::uuid[]")
add('publish_plans','mcp_grant_id','uuid',False,'mcp_client_grants')
add('mcp_client_grants','token_hash');add('mcp_client_grants','user_id','uuid',True,'users')
add('competitor_sources','current_policy_id','uuid',False,'intelligence_source_policies')
add('localisations','approved_subtitle_track_id','uuid',False,'subtitle_tracks')
# Short FK names resolved by actual catalogue.
for t,cols in T.items():
 for c,x in cols.items():
  if x['ref'] and x['ref'] not in T:raise Exception((t,c,x))
# Core fields optional in legacy schema are intentionally kept optional in migrations.
# Authorisation pointer inserted on atomic commit; legacy batches remain valid.
for c in ['plan_id','authorisation_id','accepted_at']:T['publication_batches'][c]['required']=False
write_tables=set('brands brand_kits brand_kit_revisions brand_kit_assets personas campaigns campaign_personas campaign_tasks tags asset_tags designs templates comments content_posts contacts consent_events suppressions audience_segments landing_pages forms email_templates message_campaigns automations ad_campaigns experiments report_definitions brand_strategies story_briefs script_revisions claim_evidence productions production_shots shot_assets story_design_links localisations subtitle_tracks creators creator_agreements creator_deliverables talent_releases asset_talent_releases programmes programme_activities competitors competitor_sources'.split())
secret_tables=set('oauth_credentials oauth_states sessions invitations api_clients participant_sessions participant_verifications preview_tokens custom_domains mcp_client_grants mcp_approval_requests publish_action_authorisations webhook_intake webhook_subscriptions crm_connections'.split())
# Public record API never exposes secrets or bypasses workflow tables.
registry={}
for t,cols in T.items():
 if t in secret_tables:continue
 registry[t]={'label':t.replace('_',' ').title(),'writable':t in write_tables,'global':t in global_names,'fields':cols}
(root/'src/lib/catalogue.json').write_text(json.dumps(registry,indent=2))
(root/'docs/schema-catalogue.json').write_text(json.dumps({'tables':T,'source':catalogue},indent=2))
sql=['-- Complete V3 relational catalogue. Generated deterministically; see generate_schema.py.',"create function public.app_digest(v text, algorithm text) returns bytea language sql immutable as $$ select sha256(convert_to(v,'UTF8')) $$;"]
for t,cols in T.items():
 cs=['id uuid primary key default gen_random_uuid()']
 if t not in global_names:cs+=['organisation_id uuid not null references public.organisations(id)']
 cs+=['created_at timestamptz not null default now()','updated_at timestamptz not null default now()','version integer not null default 1 check (version > 0)']
 for c,x in cols.items():
  typ=x['type']; default=x.get('default')
  # No fabricated defaults for required domain fields.
  cs.append(f'"{c}" {typ}'+(' not null' if x['required'] else '')+(f' default {default}' if default else ''))
 if t not in global_names:cs+=['unique (organisation_id,id)']
 sql.append(f'create table public.{t} (\n  '+',\n  '.join(cs)+'\n);')
for t,cols in T.items():
 for c,x in cols.items():
  target=x['ref']
  if not target:continue
  pair=t not in global_names and target not in global_names
  left=f'organisation_id,"{c}"' if pair else f'"{c}"';right='organisation_id,id' if pair else 'id'
  sql.append(f'alter table public.{t} add foreign key ({left}) references public.{target}({right}) deferrable initially immediate;')
  sql.append(f'create index on public.{t} ({left});')
 if t not in global_names:sql.append(f'create index on public.{t}(organisation_id,created_at desc);')
 sql+= [f'alter table public.{t} enable row level security;',f'alter table public.{t} force row level security;']
sql.append('alter table public.users add foreign key(id) references auth.users(id) on delete cascade;')
# Natural keys from catalogue constraints plus explicit critical uniqueness.
unique={
 'memberships':['organisation_id,user_id'],'providers':['key'],'permissions':['key'],'roles':['organisation_id,name'],
 'membership_roles':['organisation_id,membership_id,role_id'],'role_permissions':['organisation_id,role_id,permission_id'],
 'brand_grants':['organisation_id,membership_id,brand_id'],'tags':['organisation_id,brand_id,name'],
 'content_revisions':['organisation_id,post_id,revision_no'],'design_revisions':['organisation_id,design_id,revision_no'],
 'content_revision_rights':['organisation_id,revision_id,release_id'],'content_revision_agreements':['organisation_id,revision_id,agreement_id'],
 'idempotency_records':['organisation_id,principal_key,operation,key'],
 'consumer_receipts':['organisation_id,consumer,event_id'],'social_accounts':['organisation_id,provider_id,external_id'],
 'publication_batches':['organisation_id,idempotency_key'], 'publishing_targets':['organisation_id,batch_id,account_id,variant_id'],
 'publication_attempts':['organisation_id,target_id,generation,attempt_no'],
 'comparison_evidence':['organisation_id,comparison_id,observation_id'],
 'comparison_members':['organisation_id,comparison_id,competitor_id'],
 'recommendation_evidence':['organisation_id,recommendation_id,observation_id,relation'],
 'publish_plan_targets':['organisation_id,plan_id,social_account_id,variant_id'],
 'mcp_grant_accounts':['organisation_id,grant_id,social_account_id'],
 'mcp_tool_versions':['organisation_id,server_id,tool_name,schema_hash'],
 'intelligence_schedules':['organisation_id,source_id'],'intelligence_alert_sources':['organisation_id,subscription_id,source_id'],
 'intelligence_alerts':['organisation_id,subscription_id,change_hash'],
 'experiment_assignments':['organisation_id,experiment_id,subject_hash'],
 'programme_enrolments':['organisation_id,programme_id,contact_id'],
 'programme_progress':['organisation_id,enrolment_id,event_id'],
 'consent_events':[],
}
for t,keys in unique.items():
 for key in keys:sql.append(f'create unique index on public.{t} ({key});')
sql.extend(['create unique index on publication_batches(organisation_id,plan_id) where plan_id is not null;', 'create unique index on publishing_targets(organisation_id,plan_target_id) where plan_target_id is not null;', 'create unique index on mcp_client_grants(token_hash) where token_hash is not null;', 'create unique index on publish_action_authorisations(secret_hash);','create index on publishing_targets(state,scheduled_at) where state in (\'QUEUED\',\'SCHEDULED\');', 'create index on outbox_events(available_at) where delivered_at is null;', 'alter table comparison_members add check ((competitor_id is null) <> (owned_brand_id is null));',"alter table memberships add check (role in ('owner','admin','editor','approver','publisher','viewer'));",'alter table intelligence_source_policies add check (retention_days > 0);','alter table comparison_snapshots add check (period_end >= period_start);','alter table production_shots add check (end_ms >= start_ms);'])
(root/'supabase/migrations/202609290001_schema.sql').write_text('\n'.join(sql))
# RLS functions have fixed search_path and no caller-supplied role assertions.
sql=['''create or replace function public.org_role(oid uuid) returns text
language sql stable security definer set search_path = public as $$
 select role from memberships where organisation_id=oid and user_id=auth.uid() and status='active' and archived_at is null limit 1;
$$;
create or replace function public.is_member(oid uuid) returns boolean language sql stable security definer set search_path=public as $$ select public.org_role(oid) is not null $$;
create or replace function public.can_edit(oid uuid) returns boolean language sql stable security definer set search_path=public as $$ select coalesce(public.org_role(oid) in ('owner','admin','editor'),false) $$;
create or replace function public.touch_record() returns trigger language plpgsql set search_path=public as $$
begin new.updated_at=now(); new.version=old.version+1; return new; end $$;
''']
for t in T:
 sql.append(f'create trigger touch before update on {t} for each row execute function touch_record();')
 if t in global_names:
  condition='false'
  if t=='organisations':condition='is_member(id)'
  elif t=='users':condition='id = auth.uid()'
  elif t in {'providers','permissions','metric_definitions','plans'}:condition='true'
 else:condition='is_member(organisation_id)' if t not in secret_tables else 'false'
 sql.append(f'create policy tenant_read on {t} for select to authenticated using ({condition});')
 if t in write_tables:
  sql.append(f'create policy tenant_insert on {t} for insert to authenticated with check (can_edit(organisation_id));')
  sql.append(f'create policy tenant_update on {t} for update to authenticated using (can_edit(organisation_id)) with check (can_edit(organisation_id));')
 # No hard deletes: archive via edit where supported.
 sql.append(f'grant select on {t} to authenticated;')
 if t in write_tables:sql.append(f'grant insert,update on {t} to authenticated;')
 sql.append(f'grant all on {t} to service_role;')
sql.append('''revoke all on all tables in schema public from anon;
revoke all on function org_role(uuid),is_member(uuid),can_edit(uuid) from public;
grant execute on function org_role(uuid),is_member(uuid),can_edit(uuid) to authenticated,service_role;
''')
(root/'supabase/migrations/202609290002_security.sql').write_text('\n'.join(sql))
print('Generated',len(T),'tables;',sum(bool(x['ref']) for cols in T.values() for x in cols.values()),'foreign keys')
