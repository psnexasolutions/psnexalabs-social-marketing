export function googleVideoRequest(job:{prompt:string;aspect_ratio:string;provider_model:string}){
 if(!/^gemini-[a-z0-9.-]+$/.test(job.provider_model))throw Error('VIDEO_MODEL_NOT_CONFIGURED');
 return {model:job.provider_model,input:job.prompt,response_format:{type:'video',aspect_ratio:job.aspect_ratio}};
}
export function extractInlineVideo(result:any){
 const outputs=(result.steps??[]).filter((s:any)=>s.type==='model_output').flatMap((s:any)=>s.content??[]);
 const video=outputs.find((c:any)=>c.type==='video'&&c.mime_type==='video/mp4'&&typeof c.data==='string');
 if(!video||video.data.length>67000000||!/^[A-Za-z0-9+/\r\n]*={0,2}$/.test(video.data))throw Error('INLINE_VIDEO_UNAVAILABLE');
 const bytes=Buffer.from(video.data,'base64');if(bytes.length<12||bytes.length>50000000||bytes.subarray(4,8).toString()!=='ftyp')throw Error('INVALID_VIDEO_OUTPUT');return bytes;
}
export async function boundedJSON(response:Response){
 const reader=response.body?.getReader();if(!reader)throw Error('EMPTY_PROVIDER_RESPONSE');let size=0;const chunks:Uint8Array[]=[];
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>70000000){await reader.cancel();throw Error('PROVIDER_RESPONSE_TOO_LARGE');}chunks.push(value);}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
