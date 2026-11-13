/* Deterministic orientation regression — no camera hardware needed. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {videoTurn,normalize}=require('../orientation.js');
const code=fs.readFileSync('video.js','utf8');
const examples=[
 [{mode:'camera',rawWidth:1080,rawHeight:1920,portrait:true,side:1},0],
 [{mode:'camera',rawWidth:1920,rawHeight:1080,portrait:false,side:1},0],
 [{mode:'camera',rawWidth:1080,rawHeight:1920,portrait:false,side:1},90],
 [{mode:'camera',rawWidth:1080,rawHeight:1920,portrait:false,side:-1},270],
 [{mode:'camera',rawWidth:1920,rawHeight:1080,portrait:true,side:1},90],
 [{mode:'file',rawWidth:1080,rawHeight:1920,portrait:false,side:1},0],
 [{mode:'file',rawWidth:1920,rawHeight:1080,portrait:true,side:-1,manual:180},180],
 [{mode:'camera',rawWidth:1080,rawHeight:1920,portrait:false,side:1,manual:180},270]
];
for(const [opts,expected] of examples)assert.equal(videoTurn(opts),expected,JSON.stringify(opts));
assert.equal(normalize(360),0);
assert.equal(normalize(-90),270);
assert.ok((code.match(/window\.HNLVideoOrientation\.videoTurn\(/g)||[]).length>=2,'preview and recorder must use SAME function; UI focus layer can also read orientation');
assert.ok(code.includes('const computedTurn=window.HNLVideoOrientation.videoTurn('),'preview uses canonical video rotation');
assert.ok(code.includes('fixedTurn=window.HNLVideoOrientation.videoTurn('),'recorder uses canonical video rotation');
assert(code.includes('ctx.drawImage(workCanvas'),'composed video and stamps must rotate as one image');
assert(code.includes('videoRotate180'),'manual correction should be available');
assert(code.includes('workCanvas.width'),'composite canvas required');
assert.equal(videoTurn({mode:'camera',rawWidth:1080,rawHeight:1920,portrait:true,side:1,inverted:true}),180);
assert.equal(videoTurn({mode:'camera',rawWidth:1080,rawHeight:1920,portrait:false,side:-1,inverted:true}),90);
console.log('PASS: camera rotation matches still photo, upside-down, manual 180, composed overlay/recording');
