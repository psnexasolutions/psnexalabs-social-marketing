import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
export function configured() { return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY); }
export async function userDb() {
 if (!configured()) throw new Error('SETUP_REQUIRED');
 const jar = await cookies();
 return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{cookies:{getAll:()=>jar.getAll(),setAll:items=>{try {items.forEach(({name,value,options})=>jar.set(name,value,options));}catch {/* Server components cannot set cookies. Proxy handles refresh. */}}}});
}
export function adminDb() {
 if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SERVER_SETUP_REQUIRED');
 return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
}
