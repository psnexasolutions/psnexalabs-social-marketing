import {deliverVideo} from '@/lib/video-worker';
import {safeEqual,apiError,noStore} from '@/lib/security';
export const runtime='nodejs';
export const maxDuration=180;
export async function GET(r:Request){try{const s=process.env.CRON_SECRET;if(!s||!safeEqual(r.headers.get('authorization')??'',`Bearer ${s}`))throw Error('FORBIDDEN');return Response.json(await deliverVideo(),{headers:noStore});}catch(e){return apiError(e);}}
