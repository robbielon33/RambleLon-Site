import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { testServer } from './test-server.js';
if (process.argv.includes('--record')) {
 if (!process.env.CYPRESS_RECORD_KEY) {
  console.error('Cypress Cloud recording needs CYPRESS_RECORD_KEY. The configured Project ID is njigat. Add them securely in environment settings; never paste the Record Key in chat.');
  process.exit(1);
 }
}
const configDir=`${process.cwd()}/.cache/config`;mkdirSync(configDir,{recursive:true});
const server=await testServer();
try{
 const child=spawn(process.execPath,['node_modules/cypress/bin/cypress','run',...process.argv.slice(2)],{stdio:'inherit',env:{...process.env,XDG_CONFIG_HOME:configDir,XDG_CACHE_HOME:`${process.cwd()}/.cache`,CYPRESS_BASE_URL:server.base,CYPRESS_CACHE_FOLDER:process.env.CYPRESS_CACHE_FOLDER || `${process.cwd()}/.cache/Cypress`,PATH:`${process.cwd()}/.tools/xvfb/usr/bin:${process.env.PATH}`}});
 process.exitCode=await new Promise(r=>child.on('exit',code=>r(code??1)));
}finally{await server.close();}
