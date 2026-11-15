/** A quick choice must match the detailed template picker, without resetting
 * the captured date, location, logo file, original image or editing history. */
import type {WatermarkConfig,WatermarkTemplate} from '../types/hnl';
export function quickTemplateSelectionPatch(template:Pick<WatermarkTemplate,'id'|'group'|'accentHex'>):Partial<WatermarkConfig>{
 return {
  templateId:template.id,
  accentColor:template.accentHex,
  ...(template.id==='custom-stamp'?{showLogo:true}
    :template.group==='simple'?{showLogo:false}:{}),
 };
}
