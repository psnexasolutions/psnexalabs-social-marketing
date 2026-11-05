import Workspace from '@/components/workspace';
import {configured} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export default function Page(){return <Workspace configured={configured()} initialView="overview"/>;}
