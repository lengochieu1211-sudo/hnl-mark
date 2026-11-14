/** Offline-safe font options. The first three families are bundled in the APK.
 * The others use native system faces with predictable fallbacks on Android. */
import type {WatermarkFontKey} from '../types/hnl';
export const FONT_OPTIONS:ReadonlyArray<{value:WatermarkFontKey;label:string}>= [
 {value:'be-vietnam',label:'Be Vietnam Pro · Tiếng Việt'},
 {value:'jakarta',label:'Plus Jakarta Sans · Hiện đại'},
 {value:'jetbrains',label:'JetBrains Mono · Kỹ thuật'},
 {value:'roboto',label:'Roboto · Android'},
 {value:'condensed',label:'Roboto Condensed · Chữ hẹp'},
 {value:'rounded',label:'Sans Rounded · Chữ tròn'},
 {value:'light',label:'Sans Light · Thanh mảnh'},
 {value:'bold',label:'Sans Black · Đậm nổi bật'},
 {value:'sans',label:'Sans-serif · Tối giản'},
 {value:'serif',label:'Georgia · Cổ điển'},
 {value:'times',label:'Times New Roman · Văn bản'},
 {value:'courier',label:'Courier New · Chữ máy'},
 {value:'handwriting',label:'Cursive · Viết tay'},
];
export const FONT_FAMILIES:Record<WatermarkFontKey,string>={
 'be-vietnam':'"Be Vietnam Pro",Arial,sans-serif',
 'jakarta':'"Plus Jakarta Sans",Arial,sans-serif',
 'jetbrains':'"JetBrains Mono",monospace',
 'roboto':'Roboto,"Droid Sans",Arial,sans-serif',
 'condensed':'"Roboto Condensed","sans-serif-condensed",Arial,sans-serif',
 'rounded':'"sans-serif-medium",Arial,sans-serif',
 'light':'"Roboto Light","sans-serif-light",sans-serif',
 'bold':'"Roboto Black","sans-serif-black",sans-serif',
 'sans':'Arial,"Droid Sans",sans-serif',
 'serif':'Georgia,"Noto Serif",serif',
 'times':'"Times New Roman","Noto Serif",serif',
 'courier':'"Courier New",monospace',
 'handwriting':'"casual","Comic Sans MS",cursive',
};
export function watermarkFontFamily(key:WatermarkFontKey):string {return FONT_FAMILIES[key]||FONT_FAMILIES['be-vietnam'];}
