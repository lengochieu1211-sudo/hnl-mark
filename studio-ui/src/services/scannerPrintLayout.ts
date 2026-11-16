/** Point-exact physical print placement for two ID-1 Vietnamese CCCD sides.
 * Print at Actual Size 100%; no image pixel scaling can set a printer's scale. */
export function idCardPrintLayout(pw:number,ph:number,margin:number,count:number,gap:number){
 if(!Number.isInteger(count)||count<1||count>2)throw Error('Chỉ hỗ trợ một hoặc hai mặt CCCD trên mỗi trang');
 const w=85.60*72/25.4,h=53.98*72/25.4;
 const used=count*w+(count-1)*gap;
 if(used>pw-2*margin||h>ph-2*margin)
  throw Error('Khổ giấy hoặc lề không đủ chỗ in CCCD 85,60 × 53,98 mm. Chọn A4 hay giảm lề.');
 return Array.from({length:count},(_,i)=>({w,h,x:(pw-used)/2+i*(w+gap),y:(ph-h)/2}));
}

