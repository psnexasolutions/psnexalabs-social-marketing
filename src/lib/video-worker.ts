import {adminDb} from './supabase/server';
import {googleVideoRequest,extractInlineVideo,boundedJSON} from './google-video';
export async function deliverVideo(){
 if(process.env.ENABLE_GOOGLE_VIDEO!=='true')return {disabled:true};
 const key=process.env.GOOGLE_VIDEO_API_KEY;if(!key||!process.env.GOOGLE_VIDEO_MODEL)throw Error('VIDEO_SERVER_SETUP_REQUIRED');
 const db=adminDb();const {data,error}=await db.rpc('claim_video_job');if(error)throw Error('VIDEO_CLAIM_FAILED');const j=data?.[0];if(!j)return {claimed:0};
 async function finish(p:Record<string,unknown>){const {error}=await db.from('video_generation_jobs').update(p).eq('id',j.id).eq('state','SENDING');if(error)throw Error('VIDEO_RECEIPT_WRITE_FAILED');}
 let providerId:string|undefined;
 try{
  const body=googleVideoRequest(j);
  if(j.provider_model!==process.env.GOOGLE_VIDEO_MODEL){await finish({state:'FAILED',last_error:'MODEL_CONFIGURATION_CHANGED'});return {id:j.id,state:'FAILED'};}
  const r=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(body),signal:AbortSignal.timeout(120000),redirect:'error'});
  if(!r.ok){const state=[400,401,403,404,422].includes(r.status)?'FAILED':'UNKNOWN';await finish({state,last_error:'GOOGLE_HTTP_'+r.status});return {id:j.id,state};}
  const result=await boundedJSON(r);providerId=typeof result.id==='string'?result.id:undefined;const bytes=extractInlineVideo(result);
  const path=`${j.organisation_id}/${j.brand_id}/${j.id}.mp4`;
  const {error:upload}=await db.storage.from('generated-video').upload(path,bytes,{contentType:'video/mp4',upsert:false});if(upload)throw Error('VIDEO_STORAGE_FAILED');
  await finish({state:'READY',provider_id:providerId,output_path:path});return {id:j.id,state:'READY'};
 }catch(e){await finish({state:'UNKNOWN',provider_id:providerId,last_error:e instanceof Error&&/^[A-Z_]+$/.test(e.message)?e.message:'AMBIGUOUS_PROVIDER_RESULT'});return {id:j.id,state:'UNKNOWN'};}
}
