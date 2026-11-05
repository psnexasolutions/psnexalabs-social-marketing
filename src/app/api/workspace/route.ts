import {context} from '@/lib/api';
import {apiError,jsonBody,requireOrigin,noStore} from '@/lib/security';
export async function GET(){try{const {db,user}=await context();const {data,error}=await db.from('memberships').select('*,organisations(*)').eq('user_id',user.id).eq('status','active');if(error)throw new Error('READ_FAILED');return Response.json({user:{id:user.id,email:user.email},memberships:data},{headers:noStore});}catch(e){return apiError(e);}}
export async function POST(r:Request){try{requireOrigin(r);const {name}=await jsonBody(r);const {db}=await context();const {data,error}=await db.rpc('create_workspace',{workspace_name:name});if(error)throw new Error('WORKSPACE_CREATION_FAILED');return Response.json({id:data});}catch(e){return apiError(e);}}
