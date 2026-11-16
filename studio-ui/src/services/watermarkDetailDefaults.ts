/** Restore only visual controls; preserve template, date, GPS, text, uploaded
 * logo, media, capture sequence, save destination and device preferences. */
import type {WatermarkConfig} from '../types/hnl';
export function buildStampDetailResetPatch(defaults:WatermarkConfig,templateAccent:string):Partial<WatermarkConfig>{
 return {
  fontKey:defaults.fontKey,
  fontSizePx:defaults.fontSizePx,
  textColor:defaults.textColor,
  accentColor:templateAccent,
  bgOpacity:defaults.bgOpacity,
  timemarkBackgroundEnabled:defaults.timemarkBackgroundEnabled,
  showLogo:defaults.showLogo,
  logoSide:defaults.logoSide,
  timemarkLogoEnabled:defaults.timemarkLogoEnabled,
  logoPosition:defaults.logoPosition,
  logoCustomPos:{...defaults.logoCustomPos},
  logoSizePct:defaults.logoSizePct,
  positionPreset:defaults.positionPreset,
  customPos:{...defaults.customPos},
  customShowDateTime:defaults.customShowDateTime,
  customShowLocation:defaults.customShowLocation,
  customShowNote:defaults.customShowNote,
  showCoordinates:defaults.showCoordinates,
  showPhotoCode:defaults.showPhotoCode,
 };
}
