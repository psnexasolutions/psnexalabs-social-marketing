import {test,expect} from '@playwright/test';
test('demo: edit creative, save, approve and protect publication',async({page})=>{await page.goto('/');await expect(page.getByText('Let’s make something matter.')).toBeVisible();await page.getByRole('button',{name:'Open design studio'}).click();await page.getByLabel('Post title').fill('Original test creative');await page.getByRole('button',{name:'Save as content draft'}).click();await expect(page.getByRole('heading',{name:'Original test creative'})).toBeVisible();const card=page.locator('article').filter({has:page.getByRole('heading',{name:'Original test creative'})});await card.getByRole('button',{name:'Approve',exact:true}).click();await card.getByRole('button',{name:'Prepare publish'}).click();await expect(page.getByRole('button',{name:'Check and prepare'})).toBeDisabled();});
test('mobile: no page-wide overflow',async({page})=>{await page.setViewportSize({width:390,height:844});await page.goto('/');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.getByRole('button',{name:'Open menu'}).click();await expect(page.getByRole('button',{name:'Competitor intelligence',exact:true})).toBeVisible();});

test('performance studio stores a plan and keeps unapproved export disabled',async({page})=>{
 await page.goto('/growth');
 await expect(page.locator('.playbook-card')).toHaveCount(8);
 await page.getByRole('button',{name:'Create a media plan'}).click();
 await page.getByLabel('Plan name').fill('Creative testing plan');
 await page.getByLabel('Planned budget').fill('1200');
 await page.getByLabel('Creative hypothesis').fill('Product demonstration increases qualified enquiries.');
 await page.getByRole('button',{name:'Save media plan'}).click();
 await page.getByRole('tab',{name:'Media buying'}).click();
 await expect(page.getByRole('heading',{name:'Creative testing plan'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Export paused specification'})).toBeDisabled();
});
