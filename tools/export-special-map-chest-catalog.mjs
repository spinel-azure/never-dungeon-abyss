import {readFile,writeFile,readdir,mkdir,copyFile} from 'node:fs/promises';
import {resolve,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createChestCatalog} from '../data/special-map-chest-catalog.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const output=process.argv[2];
if(!output)throw Error('出力先フォルダを指定してください。node tools/export-special-map-chest-catalog.mjs E:/GitHub/nda-special-map-chest-generator');
const catalog=createChestCatalog();
// Conservative reference flags supplement explicit metadata; never an exclusion policy.
const files=(await readdir(resolve(root,'data'))).filter(f=>/quest|boss|event|zodiac/.test(f)&&f.endsWith('.js'));
const refs=await Promise.all(files.map(async f=>[f,await readFile(resolve(root,'data',f),'utf8')]));
for(const c of catalog.candidates){const found=refs.filter(([,s])=>s.includes('"'+c.id+'"')||s.includes("'"+c.id+"'")).map(([f])=>f);if(found.length)c.notices.push('要確認：依頼・ボス・イベント関連コードに参照あり（専用品とは限りません）：'+found.join(', '));}
catalog.generatedAt=new Date().toISOString();catalog.sourceRepository=root;
catalog.fingerprint=createHash('sha256').update(JSON.stringify(catalog.candidates)).digest('hex');
const core=await readFile(resolve(root,'data/special-map-chest-core.js'),'utf8');
await mkdir(resolve(output),{recursive:true});
await writeFile(resolve(output,'catalog.js'),'window.NDA_CHEST_CATALOG = '+JSON.stringify(catalog,null,2)+';\n');
await writeFile(resolve(output,'catalog.json'),JSON.stringify(catalog,null,2));
await writeFile(resolve(output,'chest-core.js'),core.replace(/^export /gm,'')+'\nwindow.NDAChest={SCHEMA_VERSION,COLORS,MAX_COUNT,emptyChestDocument,probabilities,validateChestDocument,exportChestDocument,compileChestTables};\n');
for(const file of ['index.html','style.css','app.js','使い方.txt'])await copyFile(resolve(root,'tools/special-map-chest-editor',file),resolve(output,file));
await writeFile(resolve(output,'update-catalog.cmd'),'@echo off\r\nnode "'+fileURLToPath(import.meta.url)+'" "%~dp0."\r\nif errorlevel 1 echo Update failed. Check Node.js installation and repository path.\r\npause\r\n');
console.log(JSON.stringify({output:resolve(output),candidates:catalog.candidates.length,fingerprint:catalog.fingerprint}));
