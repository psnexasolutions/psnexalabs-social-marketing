import {createHash,randomBytes,createCipheriv,createDecipheriv,timingSafeEqual} from 'node:crypto';
export const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export const randomToken=()=>randomBytes(32).toString('hex');
export function safeEqual(a:string,b:string) {const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
function encryptionKey(){const key=Buffer.from(process.env.TOKEN_ENCRYPTION_KEY??'','hex');if(key.length!==32)throw new Error('ENCRYPTION_SETUP_REQUIRED');return key;}
export function encrypt(text:string){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',encryptionKey(),iv);return Buffer.concat([iv,cipher.update(text),cipher.final(),cipher.getAuthTag()]).toString('base64');}
export function decrypt(value:string){const b=Buffer.from(value,'base64');if(b.length<28)throw new Error('INVALID_CIPHERTEXT');const d=createDecipheriv('aes-256-gcm',encryptionKey(),b.subarray(0,12));d.setAuthTag(b.subarray(-16));return Buffer.concat([d.update(b.subarray(12,-16)),d.final()]).toString();}
export function requireOrigin(request:Request){const expected=new URL(process.env.APP_URL??'http://localhost:3000').origin;if(request.headers.get('origin')!==expected)throw new Error('ORIGIN_REJECTED');}
export async function jsonBody(request:Request,max=2500000){const text=await request.text();if(Buffer.byteLength(text)>max)throw new Error('PAYLOAD_TOO_LARGE');return JSON.parse(text);}
export const noStore={'Cache-Control':'private, no-store'};
export function apiError(e:unknown){const message=e instanceof Error?e.message:'REQUEST_FAILED';const safe=/^[A-Z0-9_]+$/.test(message)?message:'REQUEST_FAILED';console.error('API error',safe);return Response.json({error:safe},{status:safe==='RATE_LIMITED'?429:safe==='UNAUTHENTICATED'?401:safe.includes('FORBIDDEN')||safe==='ORIGIN_REJECTED'?403:400,headers:noStore});}
