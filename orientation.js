/* HNLMark orientation: browser-compatible pure source-frame rotation.
   Camera media frames may use portrait pixels even in physical landscape when
   Android locks the browser's portrait viewport. Keep preview and recording
   on the same rotation function, freeze only on MediaRecorder start. */
(function(root){
'use strict';
function normalize(value){return (((Math.round(Number(value)||0)%360)+360)%360);}
function videoTurn({mode='camera',rawWidth=0,rawHeight=0,portrait=true,side=1,inverted=false,manual=0}={}){
 if(!rawWidth||!rawHeight)return normalize(manual);
 if(mode!=='camera')return normalize(manual);
 const rawPortrait=rawHeight>=rawWidth;
 if(rawPortrait===!!portrait)return normalize(manual+(inverted?180:0));
 // Match the already-working still-camera sensor convention. Applying
 // the *opposite* direction here was causing 180-degree video inversion.
 const base=portrait?90:(side>=0?90:270);
 return normalize(base+manual+(inverted?180:0));
}
const api=Object.freeze({videoTurn,normalize});
root.HNLVideoOrientation=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
