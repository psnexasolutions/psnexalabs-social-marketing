import {command} from '@/lib/api';
import {apiError,jsonBody,requireOrigin,hash,randomToken,noStore} from '@/lib/security';
export async function POST(r:Request){try{requireOrigin(r);const {org,operation,args}=await jsonBody(r);if(operation==='create_mcp_token'){const token='bos_'+randomToken();const result=await command(org,operation,{...args,tokenHash:hash(token)});return Response.json({...result,token},{headers:noStore});}return Response.json(await command(org,operation,args),{headers:noStore});}catch(e){return apiError(e);}}
