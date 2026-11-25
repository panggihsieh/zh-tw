import fs from 'node:fs';
import {loadEnv} from 'vite';

const env={...loadEnv('production',process.cwd(),'VITE_'),...process.env};
let config;
try{config=JSON.parse(env.VITE_FIREBASE_CONFIG||'');}catch{throw Error('Missing Firebase build configuration. Restore .env.local or VITE_FIREBASE_CONFIG before deploying.');}
for(const key of ['apiKey','authDomain','projectId','appId']){
 if(typeof config[key]!=='string'||!config[key].trim())throw Error('Incomplete Firebase build configuration: '+key);
}
const files=fs.readdirSync('dist/assets').filter(name=>name.endsWith('.js'));
if(!files.some(name=>{
 const text=fs.readFileSync('dist/assets/'+name,'utf8');
 return text.includes(config.appId)&&text.includes(config.projectId);
}))throw Error('Built JavaScript is missing the configured Firebase application. Rebuild before deploying.');
console.log('Firebase login build configuration check passed.');

if(!env.VITE_GOOGLE_CLIENT_ID?.endsWith(".apps.googleusercontent.com"))throw Error("Missing Google Drive OAuth client ID. Set VITE_GOOGLE_CLIENT_ID before deploying.");
console.log("Google Drive OAuth build configuration check passed.");
