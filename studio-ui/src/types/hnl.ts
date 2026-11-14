export type AppRoute = 'camera' | 'review' | 'home' | 'library' | 'stamps' | 'editor' | 'export' | 'scanner';

export type CameraMode = 'photo' | 'video';
export type OrientationDeg = 0 | 90 | -90 | 180;
export type AspectRatioMode = '4:3' | '16:9' | '1:1' | 'full';
export type CameraLens = 'rear' | 'front';

export type VideoResolution = '720p' | '1080p' | '4K';
export type VideoFps = 24 | 30 | 60;
export type VideoQualityLevel = 'Chuẩn' | 'Cao' | 'Tối đa';
export type VideoExportFormat = 'auto' | 'mp4' | 'webm';
export type WatermarkLocationSource = 'manual' | 'photo' | 'device' | 'none';

export interface VideoSettings {
  resolution: VideoResolution;
  fps: VideoFps;
  quality: VideoQualityLevel;
  format?: VideoExportFormat;
}

export type WatermarkGroup = 'timemark-legacy' | 'hnl-independent' | 'simple';

export type WatermarkPositionPreset =
  | 'bottom-left'
  | 'bottom-right'
  | 'top-left'
  | 'top-right'
  | 'bottom-center'
  | 'custom';

export type WatermarkFontKey = 'be-vietnam' | 'jakarta' | 'jetbrains' | 'serif' | 'roboto' | 'condensed' | 'rounded' | 'light' | 'bold' | 'sans' | 'times' | 'courier' | 'handwriting';

export interface WatermarkTemplate {
  id: string;
  code: string;
  name: string;
  group: WatermarkGroup;
  isPlaceholder?: boolean;
  summary: string;
  accentHex: string;
  surfaceMode: 'glass-dark' | 'stripe-gold' | 'minimal-text' | 'badge-card' | 'led-digital' | 'strip-footer';
}

export interface WatermarkConfig {
  templateId: string;
  dateTimeIso: string;
  autoTime: boolean;
  dateFormat: 'DD/MM/YYYY HH:mm:ss' | 'YYYY-MM-DD HH:mm' | 'HH:mm · DD/MM/YYYY';
  locationText: string;
  coordinates: string;
  showCoordinates: boolean;
  /** Explicit user choice. Missing EXIF/GPS is never filled from another photo. */
  locationSource?: WatermarkLocationSource;
  /** Requested video container. Auto uses MP4 only where MediaRecorder supports it. */
  videoFormat?: VideoExportFormat;
  customTitle: string;
  customNote: string;
  /** Custom stamp switches, omitted in older saved projects (defaults on). */
  customShowDateTime?: boolean;
  customShowLocation?: boolean;
  customShowNote?: boolean;
  inspectorName: string;
  fontKey: WatermarkFontKey;
  fontSizePx: number;
  textColor: string;
  accentColor: string;
  bgOpacity: number;
  showLogo: boolean;
  logoSide: 'left' | 'right';
  /** Timemark stays logo-free unless explicitly enabled. */
  timemarkLogoEnabled?: boolean;
  /** Small sanitized data URL so a custom logo survives offline/export/ZIP backup. */
  logoImageDataUrl?: string;
  logoPosition?: WatermarkPositionPreset;
  logoCustomPos?: { xPct:number; yPct:number };
  logoSizePct?: number;
  positionPreset: WatermarkPositionPreset;
  customPos: { xPct: number; yPct: number };
  photoCodePrefix: string;
  photoCodeSeq: number;
  showPhotoCode: boolean;
  perPhotoOverrideEnabled: boolean;
  defaultAspectRatio: AspectRatioMode;
  jpegQuality: number;
}

export type MediaOrigin = 'saved-project' | 'newly-picked';
export type MediaKind = 'photo' | 'video';

export type CropRatio = 'free' | '1:1' | '4:3' | '3:4' | '16:9' | '9:16';

export interface ImageEdits {
  cropRatio: CropRatio;
  centeredFrame: boolean;
  rotationDeg: number;
  flipHorizontal: boolean;
  brightness: number; // 50..150 (100 default)
  contrast: number;   // 50..150 (100 default)
  saturation: number; // 0..180 (100 default)
}

export interface MediaItem {
  /** Original bytes for new media; persisted separately in IndexedDB. */
  rawBlob?: Blob;
  /** Pre-rendered export kept apart from the original, for photo/video playback. */
  stampedBlob?: Blob;
  /** Configuration used to render a separately stored imported-video stamp. */
  stampedConfig?: WatermarkConfig;
  /** True only when video frames were actually encoded with the watermark. */
  isStamped?: boolean;
  captureWatermark?: WatermarkConfig;
  orientationDeg?: OrientationDeg;
  id: string;
  title: string;
  kind: MediaKind;
  origin: MediaOrigin;
  url: string;
  createdAt: string;
  durationSec?: number;
  resolutionLabel: string;
  sizeLabel: string;
  location: string;
  coordinates: string;
  photoCode: string;
  customNote: string;
  templateId: string;
  edits: ImageEdits;
  watermarkOverride?: Partial<WatermarkConfig>;
}

export type LibraryStateMode = 'populated' | 'empty' | 'loading' | 'error';
export type ExportSimStatus = 'idle' | 'exporting' | 'success' | 'error';

export interface ViewportPreset {
  id: string;
  label: string;
  width: number;
  height: number;
  category: 'mobile-portrait' | 'mobile-landscape' | 'tablet' | 'desktop' | 'fluid';
}
