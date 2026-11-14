/** Runtime contract for Android clockwise gravity sensor vs counterclockwise display. */
import assert from 'node:assert/strict';
import {normalizeStampAngle,resolveStampOrientation} from '../studio-ui/src/services/stampOrientation.ts';

// Physical degrees are from OrientationEventListener (CLOCKWISE).
// Display degrees are Surface.ROTATION_* (COUNTERCLOCKWISE).
const autoRotated = [
  [0,0],       // portrait
  [90,270],    // landscape right: +90 physical, -90 display
  [180,180],   // portrait upside-down
  [270,90],    // landscape left
];
for(const [physical,display] of autoRotated){
  assert.equal(resolveStampOrientation(physical,display),0,
    `Unlocked display ${physical}/${display} should not rotate watermark again`);
}
// Rotation lock leaves the display portrait; counter-rotate STAMP against gravity.
const lockedPortrait=[[0,0],[90,-90],[180,180],[270,90]];
for(const [physical,expected] of lockedPortrait){
  assert.equal(resolveStampOrientation(physical,0),expected,
    `Locked portrait physical=${physical}`);
}
// Full 4x4 matrix catches 90/270 sign inversions and 180 double rotation.
for(const p of [0,90,180,270]){
  for(const d of [0,90,180,270]){
    const want=normalizeStampAngle(-(p+d));
    assert.equal(resolveStampOrientation(p,d),want,`${p} OEL + ${d} Display`);
    assert.equal(normalizeStampAngle(resolveStampOrientation(p,d)),want);
  }
}
assert.equal(resolveStampOrientation(-90,0),90);
assert.equal(resolveStampOrientation(450,270),0);
assert.equal(resolveStampOrientation(Number.NaN,0),0);
// The Redmi report is a 180-degree flip of the letters at landscape quarter-turns.
// Regression: both opposite-sign quarter turns MUST stay opposite to device tilt.
assert.equal(resolveStampOrientation(90,0),-90);
assert.equal(resolveStampOrientation(270,0),90);
assert.equal(normalizeStampAngle(resolveStampOrientation(90,0)-90),180);
assert.equal(normalizeStampAngle(resolveStampOrientation(270,0)-(-90)),180);
console.log('PASS: inverse stamp correction for Redmi 90/-90 + 4 unlocked + 4 locked + 16 combos');
