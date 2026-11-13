const fs=require('fs'); const src=fs.readFileSync(__dirname+'/index.src.html','utf8'); const eng=fs.readFileSync(__dirname+'/engine.js','utf8');
if(!src.includes('/*__ENGINE__*/')) throw new Error('placeholder missing');
fs.writeFileSync(__dirname+'/index.html', src.replace('/*__ENGINE__*/', ()=>eng).replace('/*__CAMERAS__*/', ()=>fs.readFileSync(__dirname+'/cameras.js','utf8')));
console.log('built', fs.statSync(__dirname+'/index.html').size, 'bytes');
