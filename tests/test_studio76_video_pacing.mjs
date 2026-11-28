import assert from 'node:assert/strict';
import {createVideoFramePacer,videoCanvasFilter} from '../studio-ui/src/services/videoFramePacer.ts';
for(const hz of [60,90,120])for(const fps of [24,30]){
 const pace=createVideoFramePacer(fps);let drawn=0;
 for(let i=0;i<hz*10;i++)if(pace(i*1000/hz))drawn++;
 assert.equal(drawn,fps*10,`${hz}Hz -> ${fps}FPS`);
 console.log(`PASS ${hz}Hz / ${fps}FPS: ${drawn} frames in 10 seconds`);
}
const pace=createVideoFramePacer(30);
assert.equal(pace(0),true);assert.equal(pace(10),false);assert.equal(pace(500),true);assert.equal(pace(500),false);assert.equal(pace(501),false);assert.equal(pace(533.34),true);
assert.equal(videoCanvasFilter(1,'brightness(100%) contrast(100%) saturate(100%)'),'none');
assert.equal(videoCanvasFilter(1,'none'),'none');
assert.equal(videoCanvasFilter(.8,'none'),'brightness(0.8)');
assert.equal(videoCanvasFilter(1,'saturate(125%)'),'brightness(1) saturate(125%)');
console.log('PASS TEST76: fixed deadline pacing, no catch-up burst, neutral canvas filter bypass');
