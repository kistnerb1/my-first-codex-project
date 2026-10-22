import {mkdir,copyFile,writeFile,rm} from 'node:fs/promises';
const files=['index.html','style.css','app.js','finance.js'];
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for(const file of files)await copyFile(file,`dist/${file}`);
await writeFile('dist/.nojekyll','');
console.log('Built dist/ for /my-first-codex-project/. Relative asset URLs also support local preview.');
