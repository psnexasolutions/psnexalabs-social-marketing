import Workspace from '@/components/workspace';
import {configured} from '@/lib/supabase/server';
import {channelPaths} from '@/lib/channels';
import {notFound} from 'next/navigation';
import {z} from 'zod';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{brandId:string;channel:string[]}>}){
 const {brandId,channel}=await params;
 if(!z.uuid().safeParse(brandId).success)notFound();
 const selected=Object.entries(channelPaths).find(([,path])=>path===channel.join('/'))?.[0];if(!selected)notFound();
 return <Workspace configured={configured()} initialView="channels" initialBrand={brandId} initialChannel={selected}/>;
}
