import {z} from 'zod';
import {context} from './api';
import {Channel,channelSchemas,ProposeSchema,createVariants,normaliseTags,flowBrief,researchLinks} from './channels';
export const channelTables=['channel_brand_profiles','regional_ad_observations','ad_concept_variants','studio_templates','channel_content_briefs','workspace_video_policies','video_generation_jobs'] as const;
export async function channelWorkspace(org:string,brandId:string,channel:string){
 z.uuid().parse(brandId);Channel.parse(channel);const {db}=await context(org);
 const result=await Promise.all(channelTables.map(async table=>{let q=db.from(table).select('*').eq('organisation_id',org).eq('brand_id',brandId).order('created_at',{ascending:false}).limit(100);if(table!=='workspace_video_policies')q=q.eq('channel',channel);const {data,error}=await q;if(error)throw Error('CHANNEL_READ_FAILED');return [table,data??[]];}));
 return Object.fromEntries(result);
}
export async function channelCommand(org:string,operation:string,input:unknown){
 const {db}=await context(org);
 if(operation==='propose_variants'){
  const a=ProposeSchema.parse(input);if(new Set(a.evidenceIds).size!==a.evidenceIds.length)throw Error('INVALID_EVIDENCE');
  const {data,error}=await db.from('regional_ad_observations').select('*').eq('organisation_id',org).eq('brand_id',a.brandId).in('id',a.evidenceIds);
  if(error)throw Error('EVIDENCE_READ_FAILED');const variants=createVariants(a,data??[]);
  const {data:r,error:e}=await db.rpc('channel_command',{oid:org,op:'save_variants',args:{...a,variants}});if(e)throw Error(/^[A-Z0-9_]+$/.test(e.message)?e.message:'CHANNEL_COMMAND_FAILED');return {...r,variants};
 }
 const schema=channelSchemas[operation];if(!schema)throw Error('OPERATION_NOT_ALLOWED');const parsed=schema.safeParse(input);if(!parsed.success)throw Error('INVALID_CHANNEL_INPUT');
 const a=parsed.data as Record<string,unknown>;
 if(operation==='import_ad')a.tags=normaliseTags(a.tags as string[]);
 if(operation==='create_video_job')a.providerModel=process.env.GOOGLE_VIDEO_MODEL??'';
 const {data,error}=await db.rpc('channel_command',{oid:org,op:operation,args:a});if(error)throw Error(/^[A-Z0-9_]+$/.test(error.message)?error.message:'CHANNEL_COMMAND_FAILED');return data;
}
export async function videoOutput(org:string,id:string){
 z.uuid().parse(id);const {db}=await context(org);const {data:j,error}=await db.from('video_generation_jobs').select('*').eq('organisation_id',org).eq('id',id).single();if(error||!j)throw Error('VIDEO_NOT_FOUND');
 if(j.provider==='FLOW_HANDOFF')return {brief:flowBrief(j),flowURL:'https://flow.google.com/',mode:'MANUAL_HANDOFF'};
 if(j.state!=='READY'||!j.output_path)throw Error('VIDEO_NOT_READY');
 const {data,error:e}=await db.storage.from('generated-video').createSignedUrl(j.output_path,300);if(e)throw Error('OUTPUT_READ_FAILED');return {signedUrl:data.signedUrl,expiresIn:300};
}
export function channelResearch(query:string,region:string){return researchLinks(query.slice(0,200),region);}
