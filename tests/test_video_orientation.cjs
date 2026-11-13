/* Deterministic orientation regression — no camera hardware needed. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {videoTurn,normalize}=require('../orientation.js');
const code=fs.readFileSync('video.js','utf8');
const examples=[
 [{mode:'camera',rawWidth:1080,rawHeight:1920,portrait:true,side:1},0],
 [{mode:'camera',rawWidth:1920,rawHeight:1080,portrait:false,side:1},0],
 [{mode:'camera',rawWidth:1080,rawHeight:1920,portrait:false,side:1},270],
 [{mode:'camera',rawWidth:1080,rawHeight:1920,portrait:false,side:-1},90],
 [{mode:'camera',rawWidth:1920,rawHeight:1080,portrait:true,side:1},90],
 [{mode:'file',rawWidth:1080,rawHeight:1920,portrait:false,side:1},0],
 [{mode:'file',rawWidth:1920,rawHeight:1080,portrait:true,side:-1,manual:180},180],
 [{mode:'camera',rawWidth:1080,rawHeight:1920,portrait:false,side:1,manual:180},90]
];
for(const [opts,expected] of examples)assert.equal(videoTurn(opts),expected,JSON.stringify(opts));
assert.equal(normalize(360),0);
assert.equal(normalize(-90),270);
assert.equal((code.match(/window\.HNLVideoOrientation\.videoTurn\(/g)||[]).length,2,'preview and recorder must use SAME function');
assert(!code.includes('physicalSide>=0?90:270'),'must not reintroduce inverted side mapping');
console.log('PASS: camera source orientation vs physical landscape, manual rotation, video-file preserve, freeze on start');
