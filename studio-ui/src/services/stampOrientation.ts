/** Android's OrientationEventListener degrees rotate CLOCKWISE, while
 * Display#getRotation degrees rotate COUNTERCLOCKWISE (Android documentation).
 * The remaining angle between physical device orientation and the preview's
 * display coordinate system is therefore their SUM, not their difference.
 * E.g. physical 90 + display 270 = 0 (auto-rotated landscape), while
 * physical 90 + display 0 = 90 (portrait rotation-lock).
 * Both preview and encoded photo/video watermarks use this helper.
 */
import type {OrientationDeg} from '../types/hnl';
export function normalizeStampAngle(value:number):OrientationDeg{
 if(!Number.isFinite(value))return 0;
 const mod=((Math.round(value/90)*90)%360+360)%360;
 return mod===270?-90:mod===180?180:mod===90?90:0;
}
export function resolveStampOrientation(physicalDegrees:number,displayDegrees:number):OrientationDeg{
 return normalizeStampAngle(physicalDegrees+displayDegrees);
}
