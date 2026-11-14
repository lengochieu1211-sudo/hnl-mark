/** One dispatch table for every offered or legacy stamp across photo/video. */
import type {OrientationDeg,WatermarkConfig} from '../types/hnl';
import {drawOriginalTimemark} from './timemarkRenderer';
import {drawSimpleStamp,isSimpleStamp} from './simpleStampRenderer';
import {drawIndependentStamp,isIndependentStamp} from './independentStampRenderer';

export const isRenderableStamp=(id:string):boolean=>
 id==='timemark'||id==='none'||isSimpleStamp(id)||isIndependentStamp(id);

export function drawConfiguredStamp(
 ctx:CanvasRenderingContext2D,width:number,height:number,config:WatermarkConfig,
 orientation:OrientationDeg=0,code?:string,logo?:HTMLImageElement|ImageBitmap,
):void{
 if(config.templateId==='none')return;
 if(isSimpleStamp(config.templateId)){drawSimpleStamp(ctx,width,height,config,orientation,logo);return;}
 if(config.templateId==='timemark'){drawOriginalTimemark(ctx,width,height,config,orientation,code,logo);return;}
 if(isIndependentStamp(config.templateId)){drawIndependentStamp(ctx,width,height,config,orientation,code,logo);return;}
 throw new Error(`Mẫu dấu không tồn tại hoặc chưa hỗ trợ kết xuất: ${config.templateId}`);
}
