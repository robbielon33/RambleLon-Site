import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
export async function testServer(overrides={}) {
 const dir=mkdtempSync(join(tmpdir(),'ramblelon-tests-'));
 const port=3100;
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,NODE_ENV:'test',PORT:String(port),DATA_DIR:dir,ADMIN_PASSWORD:'ramblelon-local-demo',SMTP_HOST:'',SESSION_SECRET:'test-session-secret-for-isolated-test-server',...overrides},stdio:['ignore','pipe','pipe']});
 let logs='';child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);
 let started=false;child.stdout.on('data',d=>{if(d.toString().includes('RambleLon listening'))started=true;});
 const base=`http://127.0.0.1:${port}`;
 try{for(let i=0;i<100;i++){if(child.exitCode!==null)throw Error(logs);if(started){const r=await fetch(base+'/api/session');if(r.ok)return {base,close:async()=>{child.kill();await new Promise(r=>child.once('exit',r));rmSync(dir,{recursive:true,force:true});}};}await new Promise(r=>setTimeout(r,100));}throw Error('Server did not become ready. '+logs);}catch(error){child.kill();rmSync(dir,{recursive:true,force:true});throw error;}
}
