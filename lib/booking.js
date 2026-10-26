export const venues = { DC: ['Private event', 'Bertha', 'Flash', 'Echostage', 'Other'], Other: ['Private event', 'Other'] };
export function validate(input) {
  const errors = {};
  const fields = ['name','email','date','location','venue','eventType','duration','musicFreedom','gear'];
  const value = Object.fromEntries(fields.map(k => [k, typeof input[k] === 'string' ? input[k].trim() : '']));
  value.notes = typeof input.notes === 'string' ? input.notes.trim() : '';
  value.otherVenue = typeof input.otherVenue === 'string' ? input.otherVenue.trim() : '';
  value.city = typeof input.city === 'string' ? input.city.trim() : '';
  for (const key of fields) if (!value[key]) errors[key] = 'This field is required.';
  for (const [key, val] of Object.entries(value)) if (val.length > 2000) errors[key] = 'Please use 2,000 characters or fewer.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) errors.email = 'Enter a valid email address.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.date) || !Number.isFinite(Date.parse(value.date)) || new Date(value.date).toISOString().slice(0,10) !== value.date || value.date < new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date())) errors.date = 'Choose today or a future date.';
  if (!venues[value.location]?.includes(value.venue)) errors.venue = 'Choose a venue for this location.';
  if (value.location === 'Other' && !value.city) errors.city = 'Enter the city.';
  if (value.venue === 'Other' && !value.otherVenue) errors.otherVenue = 'Enter the venue name.';
  if (!['Fashion pop-up','Private event','Club night','Wedding','Other'].includes(value.eventType)) errors.eventType = 'Choose an event type.';
  if (!['yes','no'].includes(value.musicFreedom)) errors.musicFreedom = 'Choose an option.';
  if (!['yes','no'].includes(value.gear)) errors.gear = 'Choose an option.';
  if (!Number.isFinite(Number(value.duration)) || Number(value.duration) <= 0 || Number(value.duration) > 24) errors.duration = 'Enter a set length between 0 and 24 hours.';
  return {value, errors};
}
export function recommendation(b) {
  const wedding = b.eventType === 'Wedding';
  const items = [{ label: wedding ? 'Wedding base · Love is priceless. Requests from your uncle aren’t.' : 'Base fee', amount: wedding ? 15000 : 500 }];
  if (b.gear === 'yes') items.push({ label: 'Bring my own gear · Transporting speakers isn’t free.', amount:150 });
  return { items, total: items.reduce((sum,i)=>sum+i.amount,0), local: b.location === 'DC', review: b.musicFreedom !== 'yes' ? 'Discuss musical freedom before accepting.' : null };
}
