const $=s=>document.querySelector(s);
async function api(url,options){const r=await fetch(url,options);const data=await r.json();if(!r.ok)throw Error(data.error||'Request failed.');return data;}
function node(tag,text,className){const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;return el;}
function message(text){$('#notice').textContent=text;}
function signedIn(value){$('#login').hidden=value;$('#dashboard').hidden=!value;$('#logout').hidden=!value;if(!value){$('#requests').replaceChildren();$('#emails').replaceChildren();}}
async function load(){
 try{const [bookings,emails]=await Promise.all([api('/api/bookings'),api('/api/emails')]);
 $('#requests').replaceChildren();if(!bookings.length)$('#requests').append(node('p','No requests yet. The dance floor is yours.'));
 for(const b of bookings){
 const card=node('article','','request');card.dataset.id=b.id;
 const title=node('h3',`${b.data.eventType} · ${b.data.name}`);card.append(title);
 if(b.recommendation.local)card.append(node('span','LOCAL PRIORITY · DC','priority'));
 card.append(node('p',`${b.data.date} · ${b.data.location==='DC'?'Washington, DC':b.data.city} · ${b.data.venue==='Other'?b.data.otherVenue:b.data.venue} · ${b.data.duration} hours`));
 card.append(node('p',`${b.data.email} · Gear: ${b.data.gear==='yes'?'Bring your own':'Provided'} · Musical freedom: ${b.data.musicFreedom}`));
 if(b.data.notes)card.append(node('p',b.data.notes));
 if(b.recommendation.review)card.append(node('p',b.recommendation.review,'review'));
 card.append(node('h4',`Recommended quote: $${b.recommendation.total.toLocaleString('en-US')}`,'recommended'));
 for(const item of b.recommendation.items)card.append(node('p',`${item.label} — $${item.amount.toLocaleString('en-US')}`));
 card.append(node('p',`Acknowledgment: ${b.email_status} · Reference: ${b.id}`));
 const form=node('form','','quote-form');const label=node('label','Your quote ($)');const quote=document.createElement('input');quote.name='quote';quote.type='number';quote.min=0;quote.max=1000000;quote.step=1;quote.required=true;quote.value=b.quote??b.recommendation.total;label.append(quote);
 const statusLabel=node('label','Status');const select=document.createElement('select');select.name='status';for(const status of ['new','discussing','confirmed','declined'])select.add(new Option(status,status));select.value=b.status;statusLabel.append(select);const button=node('button','Save draft');button.type='submit';form.append(label,statusLabel,button);
 form.addEventListener('submit',async e=>{e.preventDefault();button.disabled=true;try{await api(`/api/bookings/${b.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({quote:Number(quote.value),status:select.value})});message('Saved. No quote email was sent.');}catch(err){message(err.message);}finally{button.disabled=false;}});
 card.append(form);$('#requests').append(card);
 }
 $('#emails').replaceChildren();if(!emails.length)$('#emails').append(node('p','No acknowledgment emails yet.'));
 for(const email of emails){const card=node('article','','request email');card.append(node('h3',email.subject),node('p',`To: ${email.recipient} · ${email.status}`),node('pre',email.body));$('#emails').append(card);}
 }catch(error){message(error.message);if(error.message==='Sign in required.')signedIn(false);}
}
$('#login').addEventListener('submit',async e=>{e.preventDefault();try{await api('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:e.target.elements.password.value})});e.target.reset();signedIn(true);message('');await load();}catch(error){message(error.message);}});
$('#logout').addEventListener('click',async()=>{try{await api('/api/logout',{method:'POST'});signedIn(false);message('Signed out.');}catch(error){message(error.message);}});
$('#refresh').addEventListener('click',load);
try{const session=await api('/api/session');signedIn(session.authenticated);if(session.authenticated)await load();}catch{message('Could not connect. Please refresh.');}
