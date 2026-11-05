import {marketingCommand,exportPlan} from '@/lib/marketing-service';
import {requireOrigin,jsonBody,apiError,noStore} from '@/lib/security';
export async function POST(r:Request){try{requireOrigin(r);const {org,operation,input}=await jsonBody(r,50000);return Response.json(await marketingCommand(org,operation,input),{headers:noStore});}catch(e){return apiError(e);}}
export async function GET(r:Request){try{const q=new URL(r.url).searchParams;return Response.json(await exportPlan(q.get('org')??'',q.get('id')??''),{headers:noStore});}catch(e){return apiError(e);}}
