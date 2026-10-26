import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendation,validate } from '../lib/booking.js';
const base={name:'Test DJ fan',email:'fan@example.com',date:'2099-01-01',location:'DC',venue:'Flash',eventType:'Club night',duration:'2',musicFreedom:'yes',gear:'no'};
for(const [eventType,gear,total] of [['Club night','no',500],['Club night','yes',650],['Wedding','no',15000],['Wedding','yes',15150]])test(`${eventType}, gear=${gear}: $${total}`,()=>{const r=recommendation({...base,eventType,gear});assert.equal(r.total,total);assert.equal(r.items.reduce((n,i)=>n+i.amount,0),total);});
test('DC is prioritized, other cities are not; musical freedom requires review',()=>{assert.equal(recommendation(base).local,true);assert.equal(recommendation({...base,location:'Other'}).local,false);assert.ok(recommendation({...base,musicFreedom:'no'}).review);});
test('valid inquiry passes',()=>assert.deepEqual(validate(base).errors,{}));
test('reject mismatched venues, past dates, and malformed email',()=>{const {errors}=validate({...base,location:'Other',date:'2020-01-01',email:'oops'});for(const key of ['venue','city','date','email'])assert.ok(errors[key]);});
test('reject missing and impossible values',()=>{for(const key of Object.keys(base))assert.ok(validate({...base,[key]:''}).errors[key]);assert.ok(validate({...base,date:'2099-02-31'}).errors.date);assert.ok(validate({...base,duration:'-1'}).errors.duration);assert.ok(validate({...base,venue:'Other'}).errors.otherVenue);});
