/** Android's OrientationEventListener and Display rotation produce a residual
 * *device* angle relative to WebView coordinates. To keep text upright, the
 * *stamp* rotates OPPOSITE that residual (inverse transform).
 * For auto-rotate: physical=90, display=270 => residual=0, stamp=0.
 * For rotation lock: physical=90, display=0 => stamp=-90, NOT +90.
 * The earlier +90 placed text upside down (180-degree error) on landscape
 * shots with locked portrait display. Inverting both quarter-turns preserves
 * the 0/180 cases and avoids double rotation on auto-rotating displays.
 * Shared by live preview, JPEG export and live stamped video frames.
 */
import type {OrientationDeg} from '../types/hnl';
export function normalizeStampAngle(value:number):OrientationDeg{
 if(!Number.isFinite(value))return 0;
 const mod=((Math.round(value/90)*90)%360+360)%360;
 return mod===270?-90:mod===180?180:mod===90?90:0;
}
export function resolveStampOrientation(physicalDegrees:number,displayDegrees:number):OrientationDeg{
 return normalizeStampAngle(-(physicalDegrees+displayDegrees));
}
