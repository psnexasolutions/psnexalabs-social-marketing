import {deliverConversion} from '@/lib/conversion-worker';
import {safeEqual,apiError,noStore} from '@/lib/security';
export const maxDuration=60;
export async function GET(r:Request){try{const secret=process.env.CRON_SECRET;if(!secret||!safeEqual(r.headers.get('authorization')??'',`Bearer ${secret}`))throw Error('FORBIDDEN');return Response.json(await deliverConversion(),{headers:noStore});}catch(e){return apiError(e);}}
