import Workspace from '@/components/workspace';
import {configured} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{slug:string[]}>}){const {slug}=await params;return <Workspace configured={configured()} initialView={slug[0]}/>;}
