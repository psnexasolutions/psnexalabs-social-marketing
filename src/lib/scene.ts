import {z} from 'zod';
const position=z.number().finite().min(-10000).max(10000),colour=z.string().regex(/^#[0-9a-f]{6}$/i);
const common={id:z.string().min(1).max(100),x:position,y:position,fill:colour};
export const SceneSchema=z.object({width:z.number().int().min(100).max(4096),height:z.number().int().min(100).max(4096),background:colour,layers:z.array(z.discriminatedUnion('type',[z.object({...common,type:z.literal('text'),text:z.string().max(2000),size:z.number().min(1).max(500)}),z.object({...common,type:z.literal('rect'),width:z.number().min(1).max(4096),height:z.number().min(1).max(4096)})])).max(200)});
