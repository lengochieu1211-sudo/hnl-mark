import { ViewportPreset, WatermarkConfig, WatermarkTemplate } from '../types/hnl';

export const WATERMARK_TEMPLATES: WatermarkTemplate[] = [
  {id:'custom-stamp',code:'S-04',name:'Dấu tùy chỉnh',group:'simple',summary:'Tùy chọn ngày giờ, vị trí, ghi chú, logo',accentHex:'#E2B74B',surfaceMode:'minimal-text'},
  {id:'simple-datetime',code:'S-01',name:'Chỉ ngày + giờ',group:'simple',summary:'Chữ gọn · Không khung · 4 góc',accentHex:'#F8FAFC',surfaceMode:'minimal-text'},
  {id:'simple-date',code:'S-02',name:'Chỉ ngày',group:'simple',summary:'Chỉ hiện ngày · 4 góc',accentHex:'#F8FAFC',surfaceMode:'minimal-text'},
  {id:'simple-time',code:'S-03',name:'Chỉ giờ',group:'simple',summary:'Chỉ hiện giờ · 4 góc',accentHex:'#F8FAFC',surfaceMode:'minimal-text'},
  {
    "id": "timemark",
    "code": "TM-01",
    "name": "Timemark · Verified",
    "group": "timemark-legacy",
    "summary": "Mẫu thiết kế nguyên bản HNL Mark",
    "accentHex": "#E2B74B",
    "surfaceMode": "glass-dark"
  },
  {
    "id": "site",
    "code": "TM-02",
    "name": "Công trường",
    "group": "timemark-legacy",
    "summary": "Mẫu thiết kế nguyên bản HNL Mark",
    "accentHex": "#E2B74B",
    "surfaceMode": "stripe-gold"
  },
  {
    "id": "minimal",
    "code": "TM-03",
    "name": "Tối giản",
    "group": "timemark-legacy",
    "summary": "Mẫu thiết kế nguyên bản HNL Mark",
    "accentHex": "#E2B74B",
    "surfaceMode": "minimal-text"
  },
  {
    "id": "ribbon",
    "code": "TM-04",
    "name": "Thanh ngang",
    "group": "timemark-legacy",
    "summary": "Mẫu thiết kế nguyên bản HNL Mark",
    "accentHex": "#E2B74B",
    "surfaceMode": "strip-footer"
  },
  {
    "id": "clean",
    "code": "TM-05",
    "name": "Hiện đại",
    "group": "timemark-legacy",
    "summary": "Mẫu thiết kế nguyên bản HNL Mark",
    "accentHex": "#E2B74B",
    "surfaceMode": "glass-dark"
  },
  {
    "id": "tech",
    "code": "TM-06",
    "name": "Kỹ thuật",
    "group": "timemark-legacy",
    "summary": "Mẫu thiết kế nguyên bản HNL Mark",
    "accentHex": "#E2B74B",
    "surfaceMode": "badge-card"
  },
  {
    "id": "cinema",
    "code": "TM-07",
    "name": "Điện ảnh",
    "group": "timemark-legacy",
    "summary": "Mẫu thiết kế nguyên bản HNL Mark",
    "accentHex": "#E2B74B",
    "surfaceMode": "glass-dark"
  },
  {
    "id": "compact",
    "code": "TM-08",
    "name": "Một dòng",
    "group": "timemark-legacy",
    "summary": "Mẫu thiết kế nguyên bản HNL Mark",
    "accentHex": "#E2B74B",
    "surfaceMode": "minimal-text"
  },
  {
    "id": "clock",
    "code": "TM-09",
    "name": "Chỉ giờ",
    "group": "timemark-legacy",
    "summary": "Mẫu thiết kế nguyên bản HNL Mark",
    "accentHex": "#E2B74B",
    "surfaceMode": "led-digital"
  },
  {
    "id": "none",
    "code": "TM-10",
    "name": "Ảnh nguyên bản",
    "group": "timemark-legacy",
    "summary": "Mẫu thiết kế nguyên bản HNL Mark",
    "accentHex": "#E2B74B",
    "surfaceMode": "minimal-text"
  },
  {
    "id": "site-log",
    "code": "HNL-01",
    "name": "Nhật ký thi công",
    "group": "hnl-independent",
    "summary": "Mẫu độc lập từ HNL Mark gốc",
    "accentHex": "#E2B74B",
    "surfaceMode": "stripe-gold"
  },
  {
    "id": "inspection",
    "code": "HNL-02",
    "name": "Hồ sơ nghiệm thu",
    "group": "hnl-independent",
    "summary": "Mẫu độc lập từ HNL Mark gốc",
    "accentHex": "#E2B74B",
    "surfaceMode": "badge-card"
  },
  {
    "id": "shift",
    "code": "HNL-03",
    "name": "Ca làm việc",
    "group": "hnl-independent",
    "summary": "Mẫu độc lập từ HNL Mark gốc",
    "accentHex": "#E2B74B",
    "surfaceMode": "glass-dark"
  },
  {
    "id": "geo",
    "code": "HNL-04",
    "name": "Dấu địa điểm",
    "group": "hnl-independent",
    "summary": "Mẫu độc lập từ HNL Mark gốc",
    "accentHex": "#E2B74B",
    "surfaceMode": "badge-card"
  },
  {
    "id": "survey",
    "code": "HNL-05",
    "name": "Ảnh khảo sát",
    "group": "hnl-independent",
    "summary": "Mẫu độc lập từ HNL Mark gốc",
    "accentHex": "#E2B74B",
    "surfaceMode": "glass-dark"
  },
  {
    "id": "blueprint",
    "code": "HNL-06",
    "name": "Kỹ thuật xanh",
    "group": "hnl-independent",
    "summary": "Mẫu độc lập từ HNL Mark gốc",
    "accentHex": "#E2B74B",
    "surfaceMode": "glass-dark"
  },
  {
    "id": "bottom-strip",
    "code": "HNL-07",
    "name": "Dải chân ảnh",
    "group": "hnl-independent",
    "summary": "Mẫu độc lập từ HNL Mark gốc",
    "accentHex": "#E2B74B",
    "surfaceMode": "strip-footer"
  },
  {
    "id": "memory",
    "code": "HNL-08",
    "name": "Ảnh kỷ niệm",
    "group": "hnl-independent",
    "summary": "Mẫu độc lập từ HNL Mark gốc",
    "accentHex": "#E2B74B",
    "surfaceMode": "badge-card"
  },
  {
    "id": "led",
    "code": "HNL-09",
    "name": "Đồng hồ LED",
    "group": "hnl-independent",
    "summary": "Mẫu độc lập từ HNL Mark gốc",
    "accentHex": "#E2B74B",
    "surfaceMode": "led-digital"
  },
  {
    "id": "journey",
    "code": "HNL-10",
    "name": "Du lịch",
    "group": "hnl-independent",
    "summary": "Mẫu độc lập từ HNL Mark gốc",
    "accentHex": "#E2B74B",
    "surfaceMode": "strip-footer"
  },
  {
    "id": "corner",
    "code": "HNL-11",
    "name": "Góc tối giản",
    "group": "hnl-independent",
    "summary": "Mẫu độc lập từ HNL Mark gốc",
    "accentHex": "#E2B74B",
    "surfaceMode": "minimal-text"
  },
  {
    "id": "metadata",
    "code": "HNL-12",
    "name": "Thông tin ảnh",
    "group": "hnl-independent",
    "summary": "Mẫu độc lập từ HNL Mark gốc",
    "accentHex": "#E2B74B",
    "surfaceMode": "strip-footer"
  }
];

/**
 * Public template catalog: exactly one original Timemark. Older TM-02..TM-09
 * definitions stay above for reading previously saved projects, but are NOT
 * offered for new selection. No-stamp is a standalone option, not Timemark.
 *
 * The HNL catalog groups templates that share a layout into named variants.
 * Every legacy ID remains stable for IndexedDB and ZIP round trips.
 */
export type TemplateCatalogCategory = 'timemark' | 'simple' | 'independent' | 'none';
export interface TemplateCatalogGroup {
  id: string;
  title: string;
  description: string;
  category: TemplateCatalogCategory;
  templateIds: string[];
}

export const TEMPLATE_CATALOG_GROUPS: TemplateCatalogGroup[] = [
  {id:'original-timemark',title:'Timemark Verified',description:'Mẫu Timemark gốc duy nhất · giữ nguyên',category:'timemark',templateIds:['timemark']},
  {id:'custom-stamp-layout',title:'Dấu tùy chỉnh',description:'Ngày giờ · Vị trí · Ghi chú · Logo',category:'simple',templateIds:['custom-stamp']},
  {id:'date-time',title:'Ngày + giờ',description:'Chỉ ngày và giờ, không khung',category:'simple',templateIds:['simple-datetime']},
  {id:'date-only',title:'Chỉ ngày',description:'Dấu ngày tối giản',category:'simple',templateIds:['simple-date']},
  {id:'time-only',title:'Chỉ giờ',description:'Dấu giờ tối giản',category:'simple',templateIds:['simple-time']},
  {id:'gold-stripe',title:'Thanh vàng hiện trường',description:'Dải vàng nổi bật cho nhật ký công trường',category:'independent',templateIds:['site-log']},
  {id:'detail-card',title:'Thẻ thông tin',description:'Nghiệm thu · Địa điểm · Kỷ niệm',category:'independent',templateIds:['inspection','geo','memory']},
  {id:'dark-glass',title:'Bảng kính',description:'Ca làm việc · Khảo sát · Kỹ thuật',category:'independent',templateIds:['shift','survey','blueprint']},
  {id:'lower-footer',title:'Dải thông tin dưới',description:'Dải chân ảnh · Du lịch · Metadata',category:'independent',templateIds:['bottom-strip','journey','metadata']},
  {id:'digital-clock',title:'Đồng hồ LED',description:'Ngày giờ theo kiểu đồng hồ điện tử',category:'independent',templateIds:['led']},
  {id:'corner-label',title:'Chữ ở góc',description:'Chữ nhỏ, không có thẻ nền',category:'independent',templateIds:['corner']},
  {id:'original-media',title:'Không đóng dấu',description:'Giữ nguyên ảnh/video',category:'none',templateIds:['none']},
];

export const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = {
  templateId: 'timemark',
  dateTimeIso: '2026-11-13T16:42:18',
  autoTime: true,
  dateFormat: 'DD/MM/YYYY HH:mm:ss',
  locationText: '',
  coordinates: '',
  showCoordinates: true,
  locationSource: 'manual',
  videoFormat: 'auto',
  customTitle: '',
  customNote: '',
  customShowDateTime: true,
  customShowLocation: true,
  customShowNote: true,
  inspectorName: '',
  fontKey: 'be-vietnam',
  fontSizePx: 13,
  textColor: '#F8FAFC',
  accentColor: '#E2B74B',
  bgOpacity: 0.72,
  showLogo: true,
  logoSide: 'left',
  timemarkLogoEnabled: false,
  logoPosition: 'top-right',
  logoCustomPos: { xPct: 85, yPct: 15 },
  logoSizePct: 12,
  positionPreset: 'bottom-left',
  customPos: { xPct: 6, yPct: 76 },
  photoCodePrefix: 'HNL',
  photoCodeSeq: 1,
  showPhotoCode: true,
  perPhotoOverrideEnabled: false,
  defaultAspectRatio: '4:3',
  jpegQuality: 92,
};

export const VIEWPORT_PRESETS: ViewportPreset[] = [
  { id: 'fluid', label: 'Toàn màn hình (Hiện tại)', width: 0, height: 0, category: 'fluid' },
  { id: '320x640', label: '320 × 640 · Android nhỏ', width: 320, height: 640, category: 'mobile-portrait' },
  { id: '360x640', label: '360 × 640 · Android chuẩn', width: 360, height: 640, category: 'mobile-portrait' },
  { id: '393x873', label: '393 × 873 · Pixel / Android mới', width: 393, height: 873, category: 'mobile-portrait' },
  { id: '412x915', label: '412 × 915 · Galaxy / Android lớn', width: 412, height: 915, category: 'mobile-portrait' },
  { id: '844x390', label: '844 × 390 · Ngang gọn', width: 844, height: 390, category: 'mobile-landscape' },
  { id: '915x412', label: '915 × 412 · Ngang Android lớn', width: 915, height: 412, category: 'mobile-landscape' },
  { id: '768x1024', label: '768 × 1024 · Tablet dọc', width: 768, height: 1024, category: 'tablet' },
  { id: '1440x900', label: '1440 × 900 · Desktop', width: 1440, height: 900, category: 'desktop' },
];
