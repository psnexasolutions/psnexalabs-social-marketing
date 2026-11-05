import test from 'node:test';import assert from 'node:assert/strict';
import {encrypt,decrypt,requireOrigin,safeEqual} from '../src/lib/security';
import {checkQuery} from '../src/lib/graphql';
import {publish} from '../src/lib/publishing';
test('encrypted provider tokens reject tampering',()=>{process.env.TOKEN_ENCRYPTION_KEY='ab'.repeat(32);const encrypted=encrypt('private-provider-token');assert.equal(decrypt(encrypted),'private-provider-token');const bytes=Buffer.from(encrypted,'base64');bytes[13]^=1;assert.throws(()=>decrypt(bytes.toString('base64')));});
test('cross-origin commands rejected',()=>{process.env.APP_URL='https://brand.example';assert.throws(()=>requireOrigin(new Request('https://brand.example/api/command',{headers:{origin:'https://evil.example'}})));assert.equal(safeEqual('token','token'),true);assert.equal(safeEqual('token','tokens'),false);});
test('GraphQL bounded operations',()=>{checkQuery('{ records(organisationId:"id",entity:"brands") }');assert.throws(()=>checkQuery('query A { a } query B { b }'));assert.throws(()=>checkQuery('{a{b{c{d{e{f{g{h{i}}}}}}}}}'));assert.throws(()=>checkQuery('query { ...A } fragment A on Query { a }'));});
test('unconfigured adapters do not make network calls',async()=>{process.env.ENABLED_PUBLISH_PROVIDERS='';await assert.rejects(()=>publish({provider:'x',externalId:'123',caption:'test',token:'secret'}),/CONNECTOR_DISABLED/);});
