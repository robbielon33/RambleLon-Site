import express from 'express';
import session from 'express-session';
import fileStoreFactory from 'session-file-store';
import { rateLimit } from 'express-rate-limit';
import nodemailer from 'nodemailer';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, timingSafeEqual, scryptSync } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { venues, validate, recommendation } from './lib/booking.js';
const production = process.env.NODE_ENV === 'production';
if (production && (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET)) throw Error('Set ADMIN_PASSWORD and SESSION_SECRET before production startup.');
const adminPassword = process.env.ADMIN_PASSWORD || 'ramblelon-local-demo';
const salt = randomBytes(16); const passwordHash = scryptSync(adminPassword, salt, 64);
const dir = resolve(process.env.DATA_DIR || '.data'); mkdirSync(dir,{recursive:true});
const db = new DatabaseSync(resolve(dir,'ramblelon.sqlite'));
db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS bookings (id TEXT PRIMARY KEY, created TEXT NOT NULL, data TEXT NOT NULL, status TEXT NOT NULL DEFAULT \'new\', quote INTEGER, email_status TEXT NOT NULL DEFAULT \'pending\'); CREATE TABLE IF NOT EXISTS emails (id INTEGER PRIMARY KEY, booking_id TEXT NOT NULL, recipient TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT \'pending\');');
const app = express(); app.disable('x-powered-by');
// Render terminates HTTPS at its reverse proxy, one hop from this service.
if (process.env.RENDER === 'true') app.set('trust proxy', 1);
const FileStore = fileStoreFactory(session);
app.use((req,res,next)=>{res.set('X-Content-Type-Options','nosniff');res.set('Referrer-Policy','same-origin');res.set('X-Frame-Options','DENY');next();});
app.use(express.json({limit:'30kb'}));
app.use(session({store:production ? new FileStore({path:resolve(dir,'sessions'),ttl:8*60*60,retries:1}) : undefined,secret:process.env.SESSION_SECRET || randomBytes(32).toString('hex'),resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:'strict',secure:production,maxAge:8*60*60*1000}}));
app.use('/api',(req,res,next)=>{res.set('Cache-Control','no-store');if (!['GET','HEAD'].includes(req.method) && req.get('origin') && req.get('origin') !== `${req.protocol}://${req.get('host')}`) return res.status(403).json({error:'Cross-origin request rejected.'});next();});
const auth = (req,res,next)=>req.session.admin ? next() : res.status(401).json({error:'Sign in required.'});
app.get('/healthz',(req,res)=>{db.prepare('SELECT 1').get();res.json({ok:true});});
app.get('/api/options',(req,res)=>res.json({venues}));
app.post('/api/login',rateLimit({windowMs:15*60*1000,limit:15}), (req,res,next)=>{
 const candidate = typeof req.body?.password === 'string' && req.body.password.length <= 1024 ? req.body.password : '';
 if (!timingSafeEqual(scryptSync(candidate,salt,64),passwordHash)) return res.status(401).json({error:'Incorrect password.'});
 req.session.regenerate(err=>{if(err)return next(err);req.session.admin=true;res.json({ok:true});});
});
app.get('/api/session',(req,res)=>res.json({authenticated:!!req.session.admin}));
app.post('/api/logout',auth,(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.post('/api/bookings',rateLimit({windowMs:60*60*1000,limit:100}), (req,res)=>{
 const {value,errors}=validate(req.body || {}); if(Object.keys(errors).length)return res.status(400).json({errors});
 const id = randomBytes(12).toString('hex');
 const subject = 'RambleLon — request received';
 const body = `Hi ${value.name},\n\nThanks for thinking of RambleLon! Your ${value.eventType.toLowerCase()} inquiry for ${value.date} has been received.\n\nReference: ${id}\n\nI’ll review your event details and follow up. This acknowledgment does not confirm availability, a booking, or a price.\n\nRambleLon`;
 db.exec('BEGIN');try{db.prepare('INSERT INTO bookings (id,created,data) VALUES (?,?,?)').run(id,new Date().toISOString(),JSON.stringify(value));db.prepare('INSERT INTO emails (booking_id,recipient,subject,body) VALUES (?,?,?,?)').run(id,value.email,subject,body);db.exec('COMMIT');}catch(err){db.exec('ROLLBACK');throw err;}
 res.status(201).json({id,message:'Request received. RambleLon will review your details before confirming availability or a quote.'});
});
app.get('/api/bookings',auth,(req,res)=>{
 const rows=db.prepare('SELECT * FROM bookings ORDER BY created DESC').all().map(r=>({...r,data:JSON.parse(r.data)})).map(r=>({...r,recommendation:recommendation(r.data)}));
 rows.sort((a,b)=>Number(b.recommendation.local)-Number(a.recommendation.local));res.json(rows);
});
app.patch('/api/bookings/:id',auth,(req,res)=>{
 const {status,quote}=req.body || {};
 if(!['new','discussing','confirmed','declined'].includes(status) || !Number.isSafeInteger(quote) || quote<0 || quote>1000000)return res.status(400).json({error:'Choose a valid status and quote in whole dollars (0–1,000,000).'});
 const result=db.prepare('UPDATE bookings SET status=?,quote=? WHERE id=?').run(status,quote,req.params.id);
 if(!result.changes)return res.status(404).json({error:'Request not found.'});res.json({ok:true});
});
app.get('/api/emails',auth,(req,res)=>res.json(db.prepare('SELECT * FROM emails ORDER BY id DESC').all()));
let sending=false;
async function deliver(){
 if(sending)return;sending=true;
 try{for(const email of db.prepare("SELECT * FROM emails WHERE status='pending'").all()){
 try {
 if(process.env.SMTP_HOST){
  if(!process.env.MAIL_FROM)throw Error('MAIL_FROM is required for SMTP');
  const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT || 587),secure:process.env.SMTP_PORT==='465',requireTLS:process.env.SMTP_PORT!=='465',auth:process.env.SMTP_USER ? {user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}:undefined});
  await transport.sendMail({from:process.env.MAIL_FROM,to:email.recipient,subject:email.subject,text:email.body});
 }
 const status=process.env.SMTP_HOST?'sent':'preview';
 db.prepare('UPDATE emails SET status=? WHERE id=?').run(status,email.id);db.prepare('UPDATE bookings SET email_status=? WHERE id=?').run(status,email.booking_id);
 }catch{db.prepare("UPDATE emails SET status='failed' WHERE id=?").run(email.id);db.prepare("UPDATE bookings SET email_status='failed' WHERE id=?").run(email.booking_id);console.error('Acknowledgment email failed; inspect SMTP configuration. Booking retained.');}
 }}finally{sending=false;}
}
setInterval(deliver,1000).unref();
app.get('/dashboard', (req,res)=>res.sendFile(resolve('public/dashboard.html')));
app.use(express.static(resolve('public')));
app.use((err,req,res,next)=>{res.status(err.status === 400 ? 400 : 500).json({error:err.status === 400 ? 'Invalid JSON.' : 'Something went wrong. Please try again.'});});
app.listen(Number(process.env.PORT || 3000),'0.0.0.0',()=>console.log(`RambleLon listening on ${process.env.PORT || 3000}; email: ${process.env.SMTP_HOST?'SMTP':'local preview'}`));
