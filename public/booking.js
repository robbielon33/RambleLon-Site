const form=document.querySelector('#inquiry');
const result=document.querySelector('#form-result');
const location=form.elements.location, venue=form.elements.venue;
let venues;
try{const r=await fetch('/api/options');if(!r.ok)throw Error();({venues}=await r.json());}catch{result.textContent='The booking form is temporarily unavailable. Please refresh to try again.';form.querySelector('button').disabled=true;}
function toggle(id,visible){const label=document.getElementById(id);label.hidden=!visible;label.querySelector('input').disabled=!visible;label.querySelector('input').required=visible;if(!visible)label.querySelector('input').value='';}
location.addEventListener('change',()=>{venue.replaceChildren(new Option('Choose a venue',''));for(const v of venues?.[location.value]||[])venue.add(new Option(v,v));venue.disabled=!location.value;toggle('city-field',location.value==='Other');toggle('other-venue-field',false);});
venue.addEventListener('change',()=>toggle('other-venue-field',venue.value==='Other'));
form.addEventListener('submit',async e=>{
 e.preventDefault();result.textContent='';form.querySelectorAll('.field-error').forEach(n=>n.remove());form.querySelectorAll('[aria-invalid]').forEach(n=>n.removeAttribute('aria-invalid'));
 if(!form.reportValidity())return;
 const button=form.querySelector('button');button.disabled=true;
 try{
 const r=await fetch('/api/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});const data=await r.json();
 if(!r.ok){if(data.errors){for(const [key,message] of Object.entries(data.errors)){const field=form.elements[key];if(field){field.setAttribute('aria-invalid','true');const error=document.createElement('span');error.className='field-error';error.textContent=message;field.parentElement.append(error);}}form.querySelector('[aria-invalid]')?.focus();}throw Error(data.error||'Please check the highlighted details.');}
 result.textContent=`Thanks! Your request is in. Reference: ${data.id}. RambleLon will review your details and follow up. This isn’t a confirmed booking or quote.`;
 form.reset();venue.replaceChildren(new Option('Choose a location first',''));venue.disabled=true;toggle('city-field',false);toggle('other-venue-field',false);
 }catch(error){result.textContent=error.message||'Could not submit your request. Please try again.';}finally{button.disabled=false;}
});
