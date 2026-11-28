/** Deadline-based frame pacing. Missed slots are discarded, never replayed.
 * A small tolerance accounts for floating-point and display scheduling jitter. */
export function createVideoFramePacer(fps:number){
 const interval=1000/Math.min(30,Math.max(15,Number.isFinite(fps)?fps:30));
 let deadline:number|null=null;
 return (now:number)=>{
  if(!Number.isFinite(now))return false;
  if(deadline===null)deadline=now;
  if(now+.5<deadline)return false;
  deadline+=Math.max(1,Math.floor((now+.5-deadline)/interval)+1)*interval;
  return true;
 };
}
export function videoCanvasFilter(brightness:number,colorFilter:string){
 const neutral=colorFilter==='none'||colorFilter==='brightness(100%) contrast(100%) saturate(100%)';
 if(brightness===1&&neutral)return 'none';
 return `brightness(${brightness})${neutral?'':' '+colorFilter}`;
}
