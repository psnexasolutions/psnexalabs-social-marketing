import {runPublisher,reconcileAccepted} from '@/lib/publishing';
import {safeEqual,apiError} from '@/lib/security';
export const runtime='nodejs';export const maxDuration=60;
export async function GET(r:Request){if(!process.env.CRON_SECRET||!safeEqual(r.headers.get('authorization')??'',`Bearer ${process.env.CRON_SECRET}`))return Response.json({error:'UNAUTHENTICATED'},{status:401});try{return Response.json({reconciled:await reconcileAccepted(),results:await runPublisher()});}catch(e){return apiError(e);}}
