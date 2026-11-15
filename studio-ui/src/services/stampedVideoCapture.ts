/**
 * Stamp the actual frames being recorded, not a CSS-only preview overlay.
 * The original live camera MediaStream remains owned by CameraApkScreen.
 * No silent unmarked-video fallback is allowed.
 */
import type { OrientationDeg, WatermarkConfig } from '../types/hnl';
import {prepareTimemarkFont} from './timemarkRenderer';
import {loadWatermarkLogo} from './watermarkLogo';
import {drawConfiguredStamp,isRenderableStamp} from './stampRenderer';
import {capturedPhotoTurn,orientedFrameSize} from './capturedPhotoOrientation';

type StampedCapture = {
  stream: MediaStream;
  stop: () => void;
  width: number;
  height: number;
};

export async function createStampedVideoCapture(
  video: HTMLVideoElement,
  config: WatermarkConfig,
  orientation: OrientationDeg | (()=>OrientationDeg),
  physicalAngle: number,
  photoCode: string,
  lens: 'front' | 'rear',
  zoom: number,
  brightness: number,
  desiredFps: number,
): Promise<StampedCapture> {
  if(!isRenderableStamp(config.templateId))throw new Error('Không tìm thấy bộ xuất video cho mẫu dấu này.');
  if (video.videoWidth <= 0 || video.videoHeight <= 0 || video.readyState < 2) {
    throw new Error('Khung hình camera chưa sẵn sàng để ghi dấu.');
  }
  // Normalize the source raster before stamping/encoding: a WebView camera
  // may still serve portrait frames with the handset held landscape.
  const startStampAngle=typeof orientation==='function'?orientation():orientation;
  const turn=capturedPhotoTurn(video.videoWidth,video.videoHeight,physicalAngle,startStampAngle);
  const dimensions=orientedFrameSize(video.videoWidth,video.videoHeight,turn);
  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx || typeof canvas.captureStream !== 'function') {
    throw new Error('WebView không hỗ trợ quay video có dấu trực tiếp (CanvasCapture).');
  }
  await prepareTimemarkFont(config.fontKey);
  const logo=await loadWatermarkLogo(config);
  const fps = Math.min(30, Math.max(15, desiredFps));
  let active = true;
  let frameId = 0;
  let previousFrame = 0;
  const frame = (now: number) => {
    if (!active) return;
    frameId = window.requestAnimationFrame(frame);
    if (now - previousFrame < 1000 / fps) return;
    previousFrame = now;
    if (video.readyState < 2) return;
    const rawWidth=video.videoWidth, rawHeight=video.videoHeight;
    ctx.save();
    ctx.translate(canvas.width/2,canvas.height/2);
    ctx.rotate(turn*Math.PI/180);
    if(lens==='front')ctx.scale(-1,1);
    const sourceW=rawWidth/zoom, sourceH=rawHeight/zoom;
    ctx.filter=`brightness(${brightness})`;
    ctx.drawImage(video,(rawWidth-sourceW)/2,(rawHeight-sourceH)/2,
      sourceW,sourceH,-rawWidth/2,-rawHeight/2,rawWidth,rawHeight);
    ctx.restore();
    if (config.templateId !== 'none') {
      const timestamp = config.autoTime ? {...config,dateTimeIso: toLocalTime(new Date())} : config;
      // The frame is already physically upright; do not rotate its stamp twice.
      drawConfiguredStamp(ctx,canvas.width,canvas.height,timestamp,0,photoCode,logo);
    }
  };
  const stream = canvas.captureStream(fps);
  frame(performance.now());
  return {
    stream,
    width: canvas.width,
    height: canvas.height,
    stop: () => {
      active = false;
      window.cancelAnimationFrame(frameId);
      stream.getTracks().forEach(track => track.stop());
    },
  };
}

function toLocalTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
