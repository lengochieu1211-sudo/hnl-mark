/** Camera pixels already follow display rotation in Android WebView.
 * Only the remaining physical-to-display difference belongs on the stamp.
 * Keep this pure helper shared by all templates and capture paths.
 */
import type {OrientationDeg} from '../types/hnl';
export function normalizeStampAngle(value:number):OrientationDeg{
 if(!Number.isFinite(value))return 0;
 const mod=((Math.round(value/90)*90)%360+360)%360;
 return mod===270?-90:mod===180?180:mod===90?90:0;
}
export function resolveStampOrientation(physicalDegrees:number,displayDegrees:number):OrientationDeg{
 return normalizeStampAngle(physicalDegrees-displayDegrees);
}
