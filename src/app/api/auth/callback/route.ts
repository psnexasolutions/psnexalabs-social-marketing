import {userDb} from '@/lib/supabase/server';
import {NextResponse} from 'next/server';
export async function GET(r:Request){const url=new URL(r.url);const code=url.searchParams.get('code');if(code){const db=await userDb();const {error}=await db.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL('/',process.env.APP_URL??url.origin));}return NextResponse.redirect(new URL('/login?error=auth',process.env.APP_URL??url.origin));}
