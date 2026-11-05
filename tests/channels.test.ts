import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createVariants,normaliseTags,ProposeSchema,AdSchema,researchLinks,VideoSchema} from '../src/lib/channels';
import {extractInlineVideo,googleVideoRequest} from '../src/lib/google-video';
const brand='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const input=ProposeSchema.parse({brandId:brand,channel:'instagram',region:'NZ',evidenceIds:[id],offer:'Our local consultation',proof:'A documented customer example with permission',cta:'Request a consultation',ownTags:['#LocalBusiness'],idempotencyKey:'test-variants-key'});
const evidence={id,channel:'instagram',region:'NZ',observed_at:new Date().toISOString(),tags:['competitor-trademark'],offer:'Their offer',cta:'Their CTA'};
test('regional hypotheses use own tags and reject cross-region or stale evidence',()=>{
 const variants=createVariants(input,[evidence]);assert.equal(variants.length,3);assert.ok(variants.every(v=>v.confidence==='UNTESTED'&&!v.caption.includes('competitor-trademark')&&v.caption.includes('#localbusiness')));
 assert.throws(()=>createVariants(input,[{...evidence,region:'AU'}]),/EVIDENCE_SCOPE_MISMATCH/);
 assert.throws(()=>createVariants(input,[{...evidence,observed_at:'2020-01-01T00:00:00Z'}]),/STALE_EVIDENCE/);
 assert.deepEqual(normaliseTags(['#Test','test',' #Useful ']),['test','useful']);
});
test('public metadata and video drafts reject unsupported fields and missing rights',()=>{
 assert.equal(AdSchema.safeParse({}).success,false);
 assert.equal(VideoSchema.safeParse({brandId:brand,channel:'youtube',title:'Video',prompt:'Create a short original product demonstration',aspectRatio:'9:16',provider:'GOOGLE_API',estimatedCostMinor:100,currency:'NZD',rightsConfirmed:false,idempotencyKey:'test-video-key'}).success,false);
 assert.ok(researchLinks('test & keyword','NZ')[0].url.includes('country=NZ'));
});
test('Google adapter parses documented REST video parts and rejects arbitrary or oversized content',()=>{
 const bytes=Buffer.concat([Buffer.from([0,0,0,16]),Buffer.from('ftypisom'),Buffer.from([0,0,0,0])]);
 assert.deepEqual(extractInlineVideo({steps:[{type:'model_output',content:[{type:'video',mime_type:'video/mp4',data:bytes.toString('base64')}]}]}),bytes);
 assert.throws(()=>extractInlineVideo({steps:[{type:'model_output',content:[{type:'video',mime_type:'video/mp4',data:Buffer.from('untrusted').toString('base64')}]}]}),/INVALID_VIDEO_OUTPUT/);
 assert.throws(()=>googleVideoRequest({prompt:'test',aspect_ratio:'9:16',provider_model:'https://attacker.test'}),/VIDEO_MODEL/);
});
