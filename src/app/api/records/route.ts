import {records,writeRecord} from '@/lib/api';
import {apiError,jsonBody,requireOrigin,noStore} from '@/lib/security';
export async function GET(r:Request){try{const u=new URL(r.url);return Response.json(await records(u.searchParams.get('org')??'',u.searchParams.get('table')??'',Number(u.searchParams.get('limit')??100)),{headers:noStore});}catch(e){return apiError(e);}}
export async function POST(r:Request){try{requireOrigin(r);const b=await jsonBody(r);return Response.json(await writeRecord(b.org,b.table,b.data,b.id,b.version),{headers:noStore});}catch(e){return apiError(e);}}
