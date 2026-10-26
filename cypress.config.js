import { defineConfig } from 'cypress';
export default defineConfig({projectId:process.env.CYPRESS_PROJECT_ID || 'njigat',e2e:{baseUrl:'http://127.0.0.1:3000',supportFile:false},video:false,viewportWidth:1280,viewportHeight:900});
