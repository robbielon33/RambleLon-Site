import test from 'node:test';
import assert from 'node:assert/strict';
import { testServer } from '../scripts/test-server.js';
test('booking API protects records, validates input, orders DC first, persists overrides, and queues one acknowledgment',async()=>{
 const server=await testServer();
 try{
 const request=async(path,{body,method='GET',cookie}={})=>{const response=await fetch(server.base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});return {response,data:await response.json()};};
 assert.equal((await request('/api/bookings')).response.status,401);
 assert.equal((await request('/api/emails')).response.status,401);
 const base={name:'API guest',email:'api@example.com',date:'2099-01-01',location:'DC',venue:'Flash',eventType:'Wedding',duration:'2',musicFreedom:'yes',gear:'yes'};
 assert.equal((await request('/api/bookings',{method:'POST',body:{...base,date:'2020-01-01'}})).response.status,400);
 const dc=await request('/api/bookings',{method:'POST',body:base});assert.equal(dc.response.status,201);assert.ok(!('recommendation' in dc.data));
 await request('/api/bookings',{method:'POST',body:{...base,location:'Other',city:'Baltimore',venue:'Private event'}});
 const login=await request('/api/login',{method:'POST',body:{password:'ramblelon-local-demo'}});const cookie=login.response.headers.get('set-cookie').split(';')[0];assert.equal(login.response.status,200);
 const bookings=await request('/api/bookings',{cookie});assert.equal(bookings.data[0].id,dc.data.id);assert.equal(bookings.data[0].recommendation.total,15150);
 assert.equal((await request('/api/bookings/'+dc.data.id,{method:'PATCH',body:{quote:10,status:'new'}})).response.status,401);
 assert.equal((await request('/api/bookings/'+dc.data.id,{cookie,method:'PATCH',body:{quote:-1,status:'new'}})).response.status,400);
 assert.equal((await request('/api/bookings/'+dc.data.id,{cookie,method:'PATCH',body:{quote:12000,status:'discussing'}})).response.status,200);
 const updated=(await request('/api/bookings',{cookie})).data[0];assert.equal(updated.quote,12000);assert.equal(updated.status,'discussing');
 let email;
 for(let i=0;i<30;i++){email=(await request('/api/emails',{cookie})).data.find(e=>e.booking_id===dc.data.id);if(email.status==='preview')break;await new Promise(r=>setTimeout(r,100));}
 assert.equal(email.status,'preview');assert.match(email.body,/does not confirm/);assert.ok(!email.body.includes('15000')&&!email.body.includes('12000'));assert.equal((await request('/api/emails',{cookie})).data.filter(e=>e.booking_id===dc.data.id).length,1);
 await request('/api/logout',{method:'POST',cookie});assert.equal((await request('/api/bookings',{cookie})).response.status,401);
 }finally{await server.close();}
});

test('Render HTTPS proxy supports secure login cookies and rejects cross-origin writes',async()=>{
 const server=await testServer({NODE_ENV:'production',RENDER:'true'});
 try{
  const host=new URL(server.base).host;
  const response=await fetch(server.base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json','X-Forwarded-Proto':'https','Origin':`https://${host}`},body:JSON.stringify({password:'ramblelon-local-demo'})});
  assert.equal(response.status,200);
  const cookie=response.headers.get('set-cookie');
  assert.match(cookie,/; Secure/i);assert.match(cookie,/; HttpOnly/i);assert.match(cookie,/; SameSite=Strict/i);
  const authenticated=await fetch(server.base+'/api/bookings',{headers:{cookie:cookie.split(';')[0],'X-Forwarded-Proto':'https'}});assert.equal(authenticated.status,200);
  const blocked=await fetch(server.base+'/api/logout',{method:'POST',headers:{cookie:cookie.split(';')[0],'X-Forwarded-Proto':'https',Origin:'https://other.example'}});assert.equal(blocked.status,403);
  const health=await fetch(server.base+'/healthz');assert.equal(health.status,200);assert.deepEqual(await health.json(),{ok:true});
 }finally{await server.close();}
});
