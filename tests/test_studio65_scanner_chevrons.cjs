/** TEST65: real Lucide chevrons on Smart Scan collapsible sections. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('../studio-ui/node_modules/typescript')}catch{ts=require('typescript')}
const fn=path.join(__dirname,'../studio-ui/src/components/scanner/DocumentScannerScreen.tsx');
const source=fs.readFileSync(fn,'utf8');
const result=ts.transpileModule(source,{fileName:fn,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
assert.equal(result.diagnostics?.length||0,0,'Scanner TSX syntax must parse');
assert.match(source,/ChevronDown,ChevronRight.*from 'lucide-react'/);
assert.doesNotMatch(source,/⌄/,'Avoid text-glyph caret');
for(const label of ['Nắn giấy bị gấp','Tách nhiều giấy tờ','Xoay / lật ảnh']){
 const match=source.match(new RegExp('<summary[^>]*>'+label.replace('/','\\/')+' <span[^>]*><ChevronDown size=\\{20\\}'));
 assert.ok(match,'Lucide ChevronDown required for '+label);
}
assert.equal((source.match(/<ChevronDown size=\{20\}/g)||[]).length,3,'Three collapse headings');
assert.ok(source.includes('group-open:rotate-180'),'Chevron rotates on open');
assert.ok(source.includes('group-open/help:rotate-90'),'Help-chevron rotates independently');
assert.equal((source.match(/<ChevronRight size=\{16\}/g)||[]).length,5,'Five help sections');
assert.ok(source.includes('[&::-webkit-details-marker]:hidden'),'Hide browser default disclosure triangle');
const gradle=fs.readFileSync(path.join(__dirname,'../android/app/build.gradle'),'utf8');
assert.ok(gradle.includes("applicationIdSuffix '.trial2570'")&&gradle.includes('HNLMark STUDIO 70'),'TEST65 APK installs alongside TEST64');
console.log('PASS TEST65: consistent Lucide collapse icons and isolated debug APK');
