const password='ramblelon-local-demo';
const inquiry=(overrides={})=>({name:'Cypress guest',email:'guest@example.com',date:'2099-06-15',location:'DC',venue:'Flash',eventType:'Club night',duration:'2',musicFreedom:'yes',gear:'no',...overrides});
const login=()=>cy.request('POST','/api/login',{password});
describe('RambleLon booking desk',()=>{
 it('protects private requests and email previews',()=>{cy.request({url:'/api/bookings',failOnStatusCode:false}).its('status').should('eq',401);cy.request({url:'/api/emails',failOnStatusCode:false}).its('status').should('eq',401);cy.request({method:'POST',url:'/api/login',body:{password:'incorrect'},failOnStatusCode:false}).its('status').should('eq',401);});
 it('changes venue options with location and clears stale values',()=>{
 cy.visit('/#booking');cy.get('[name=location]').select('DC');cy.get('[name=venue] option').then(options=>expect([...options].map(o=>o.value)).to.include.members(['Private event','Bertha','Flash','Echostage','Other']));
 cy.get('[name=venue]').select('Flash');cy.get('[name=location]').select('Other');cy.get('[name=venue]').should('have.value','').find('option').should('have.length',3);cy.get('[name=city]').should('be.visible');cy.get('[name=venue]').select('Other');cy.get('[name=otherVenue]').should('be.visible');
 });
 it('submits the real form and creates a private acknowledgment without pricing',()=>{
 cy.visit('/#booking');cy.get('[name=name]').type('Fashion guest');cy.get('[name=email]').type('fashion@example.com');cy.get('[name=date]').type('2099-06-15');cy.get('[name=eventType]').select('Fashion pop-up');cy.get('[name=location]').select('DC');cy.get('[name=venue]').select('Bertha');cy.get('[name=duration]').type('3');cy.get('[name=musicFreedom]').select('yes');cy.get('[name=gear]').select('yes');
 cy.intercept('POST','/api/bookings').as('submit');cy.get('#inquiry button').click();cy.wait('@submit').then(({response})=>{
 expect(response.statusCode).to.eq(201);const id=response.body.id;cy.get('#form-result').should('contain',id);login();cy.visit('/dashboard');cy.get(`[data-id="${id}"]`).should('contain','LOCAL PRIORITY').and('contain','$650');
 cy.get('#refresh').click();cy.get('#emails',{timeout:10000}).should('contain','fashion@example.com');
 cy.request('/api/emails').then(({body})=>{const email=body.find(e=>e.booking_id===id);expect(email.body).to.contain('does not confirm');expect(email.body).not.to.contain('$650');expect(['pending','preview']).to.include(email.status);});
 });
 });
 for(const [eventType,gear,total] of [['Private event','no',500],['Private event','yes',650],['Wedding','no',15000],['Wedding','yes',15150]])it(`recommends $${total} for ${eventType}, gear=${gear}`,()=>{
 cy.request('POST','/api/bookings',inquiry({eventType,gear})).then(({body})=>{login();cy.visit('/dashboard');cy.get(`[data-id="${body.id}"] .recommended`).should('contain',`$${total.toLocaleString('en-US')}`);});
 });
 it('saves an override across reloads without emailing the quote',()=>{
 cy.request('POST','/api/bookings',inquiry({eventType:'Wedding',gear:'yes'})).then(({body})=>{const id=body.id;login();cy.visit('/dashboard');cy.get(`[data-id="${id}"]`).within(()=>{cy.get('[name=quote]').clear().type('12000');cy.get('[name=status]').select('discussing');cy.contains('button','Save draft').click();});cy.get('#notice').should('contain','No quote email was sent');cy.reload();cy.get(`[data-id="${id}"] [name=quote]`).should('have.value','12000');cy.get(`[data-id="${id}"] [name=status]`).should('have.value','discussing');cy.request('/api/emails').then(({body})=>{expect(body.filter(e=>e.booking_id===id)).to.have.length(1);expect(body.find(e=>e.booking_id===id).body).not.to.contain('12000');});});
 });
 it('rejects invalid requests server-side',()=>{cy.request({method:'POST',url:'/api/bookings',body:inquiry({date:'2020-01-01',location:'Other'}),failOnStatusCode:false}).then(r=>{expect(r.status).to.eq(400);expect(r.body.errors).to.have.keys('date','city','venue');});});
 it('prioritizes DC ahead of newer out-of-town inquiries',()=>{cy.request('POST','/api/bookings',inquiry({location:'Other',city:'Baltimore',venue:'Private event'}));login();cy.request('/api/bookings').then(({body})=>{const firstOther=body.findIndex(b=>!b.recommendation.local);expect(firstOther).to.be.greaterThan(0);expect(body.slice(firstOther).every(b=>!b.recommendation.local)).to.eq(true);});});
 it('works on a phone and signs out',()=>{login();cy.viewport('iphone-6');cy.visit('/dashboard');cy.contains('button','Sign out').click();cy.get('#login').should('be.visible');cy.get('#dashboard').should('not.be.visible');cy.request({url:'/api/bookings',failOnStatusCode:false}).its('status').should('eq',401);cy.visit('/#booking');cy.get('[name=name]').should('be.visible');cy.document().then(doc=>expect(doc.documentElement.scrollWidth).to.be.at.most(375));});
});
