export const demoBrand='11111111-1111-4111-8111-111111111111';
export const starterScene={width:1080,height:1080,background:'#f4efe7',layers:[{id:'kicker',type:'text',x:85,y:130,text:'YOUR NEXT CHAPTER',fill:'#5647d6',size:27},{id:'headline',type:'text',x:80,y:300,text:'Good stories.\nReal impact.',fill:'#192329',size:105},{id:'shape',type:'rect',x:580,y:630,width:390,height:310,fill:'#ff8055'},{id:'body',type:'text',x:85,y:745,text:'Make your brand\nworth remembering.',fill:'#192329',size:35},{id:'brand',type:'text',x:85,y:970,text:'STUDIO NORTH  /  2026',fill:'#5647d6',size:24}]};
export const initialDemo:Record<string,any[]>={
 brands:[{id:demoBrand,name:'Studio North',industry:'Creative services',website:'https://example.com',timezone:'Pacific/Auckland',locale:'en-NZ',version:1}],
 campaigns:[{id:'campaign-demo',brand_id:demoBrand,name:'Stories worth sharing',objective:'Turn expertise into qualified enquiries',budget_minor:150000,currency:'NZD',version:1}],
 content_posts:[{id:'post-demo',brand_id:demoBrand,title:'Good stories. Real impact.',locale:'en-NZ',current_revision_id:'revision-demo',version:1}],
 content_revisions:[{id:'revision-demo',post_id:'post-demo',revision_no:1,caption:'Behind every great brand is a story worth telling. Here is how we help you find yours.',scene:starterScene,state:'DRAFT',version:1}],
 competitors:[{id:'competitor-demo',brand_id:demoBrand,name:'Example Creative Co.',relation:'DIRECT',market:'New Zealand',status:'active',version:1}],
 social_accounts:[],publishing_targets:[],marketing_recommendations:[],designs:[],assets:[],audit_events:[],memberships:[],intelligence_observations:[]};
