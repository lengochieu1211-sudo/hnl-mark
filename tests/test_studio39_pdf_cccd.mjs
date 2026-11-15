import assert from 'node:assert/strict';
import {idCardPrintLayout} from '../studio-ui/src/services/scannerPrintLayout.ts';
const pt=mm=>mm*72/25.4;
const paper=[pt(210),pt(297)];
for(const n of [1,2]){
 const cards=idCardPrintLayout(...paper,pt(10),n,pt(6));
 assert.equal(cards.length,n);
 for(const card of cards){assert.ok(Math.abs(card.w-pt(85.60))<1e-9);assert.ok(Math.abs(card.h-pt(53.98))<1e-9);
  assert.ok(card.x>=pt(10) && card.x+card.w<=paper[0]-pt(10));
  assert.ok(card.y>=pt(10) && card.y+card.h<=paper[1]-pt(10)); }
 assert.ok(Math.abs(cards[0].x+(cards.at(-1).x+cards.at(-1).w)-paper[0])<1e-9);
}
assert.throws(()=>idCardPrintLayout(pt(130),pt(150),pt(10),2,pt(6)),/Khổ giấy/);
assert.throws(()=>idCardPrintLayout(...paper,pt(10),3,pt(6)),/một hoặc hai/);
console.log('PASS TEST39: exact physical ID-1 85.60×53.98 mm point dimensions, centred A4, bounds');
