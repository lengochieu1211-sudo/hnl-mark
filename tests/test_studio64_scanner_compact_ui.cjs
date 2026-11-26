/** TEST64: compact Smart Scan control density and shared live image preview. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('../studio-ui/node_modules/typescript')}catch{ts=require('typescript')}
const pathToUi=path.join(__dirname,'../studio-ui/src/components/scanner/DocumentScannerScreen.tsx');
const s=fs.readFileSync(pathToUi,'utf8');
const check=ts.transpileModule(s,{fileName:pathToUi,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
assert.equal(check.diagnostics?.length||0,0,'Scanner TSX syntax');
for(const name of ['main-preview','compact-preview','fold-section','multi-section','rotate-section'])assert.ok(s.includes('data-hnl-scan-'+name+'="true"'),name);
assert.ok(s.includes('sticky top-0 z-30')&&s.includes("scroller.addEventListener('scroll',onScroll"),'Compact preview remains in scrolling workspace');
assert.ok(s.includes('previewBottom<top-4&&editorBottom>top+210'),'No overlay outside the editor');
assert.ok(s.includes('scanLiveResultUrl||(!editingHasUnsavedCorners&&editing.processed)'),'Uses existing true-render preview rather than stale image');
assert.ok(s.includes("setScanSharpnessLevelDraft(level);setScanSharpnessDraft(level===0?'off':'auto');setShowResult(true);"),'Sharpness updates preview');
assert.ok(s.includes('setScanColorDraft(prev=>({...prev,[key]:value}));setShowResult(true);'),'Color updates preview');
assert.ok(s.includes('Hướng dẫn chỉnh màu')&&!s.includes('Kéo cặp điểm xanh đến chỗ nếp gấp trên hai cạnh đối diện'));
const gradle=fs.readFileSync(path.join(__dirname,'../android/app/build.gradle'),'utf8');
assert.ok(gradle.includes("applicationIdSuffix '.trial2575'")&&gradle.includes('HNLMark STUDIO 75'));
console.log('PASS TEST64: mobile sticky live preview, concise guidance, parallel APK');
