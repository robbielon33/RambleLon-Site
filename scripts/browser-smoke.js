import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { testServer } from './test-server.js';
const server=await testServer();let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.goto(server.base);
 const input=(name)=>page.locator(`[name="${name}"]`);
 await input('location').selectOption('DC');await input('venue').selectOption('Flash');
 await input('location').selectOption('Other');assert.equal(await input('venue').inputValue(),'');
 await input('venue').selectOption('Other');assert.ok(await input('otherVenue').isVisible());
 await input('location').selectOption('DC');await input('venue').selectOption('Bertha');
 await input('name').fill('Browser guest');await input('email').fill('browser@example.com');await input('date').fill('2099-06-15');await input('eventType').selectOption('Wedding');await input('duration').fill('3');await input('musicFreedom').selectOption('yes');await input('gear').selectOption('yes');
 await page.getByRole('button',{name:'SEND MY REQUEST'}).click();await page.locator('#form-result').filter({hasText:'Your request is in'}).waitFor();
 console.log('PASS: location-dependent venues and real inquiry submission');
 const unauthorized=await page.request.get(server.base+'/api/bookings');assert.equal(unauthorized.status(),401);
 await page.goto(server.base+'/dashboard');await input('password').fill('ramblelon-local-demo');await page.getByRole('button',{name:'Sign in'}).click();
 await page.locator('.recommended').filter({hasText:'$15,150'}).waitFor();assert.match(await page.locator('#requests').innerText(),/LOCAL PRIORITY/);
 await input('quote').fill('12000');await input('status').selectOption('discussing');await page.getByRole('button',{name:'Save draft'}).click();await page.locator('#notice').filter({hasText:'No quote email was sent'}).waitFor();await page.reload();await input('quote').waitFor();assert.equal(await input('quote').inputValue(),'12000');assert.equal(await input('status').inputValue(),'discussing');
 for(let i=0;i<30;i++){await page.getByRole('button',{name:'Refresh requests'}).click();if((await page.locator('#emails').innerText()).includes('preview'))break;await page.waitForTimeout(150);}
 const email=await page.locator('#emails').innerText();assert.match(email,/browser@example.com/);assert.match(email,/preview/);assert.match(email,/does not confirm/);assert.ok(!email.includes('15,150')&&!email.includes('12000'));
 console.log('PASS: authenticated dashboard, wedding + gear pricing, persistent override, private email preview');
 await page.setViewportSize({width:375,height:812});await page.getByRole('button',{name:'Sign out'}).click();await page.locator('#login').waitFor();assert.equal((await page.request.get(server.base+'/api/emails')).status(),401);
 await page.goto(server.base+'/#booking');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=375));await page.screenshot({path:'/tmp/ramblelon-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'/tmp/ramblelon-desktop.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: mobile layout, sign-out protection, no browser JavaScript errors');
}finally{await browser?.close();await server.close();}
