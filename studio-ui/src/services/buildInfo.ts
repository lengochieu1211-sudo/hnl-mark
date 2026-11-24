/** Build facts are embedded by Vite once at compile time, not read from the user clock. */
export type HnlBuildInfo = {version:string;createdAtUtc:string;sourceSha:string};
declare const __HNL_BUILD_INFO__: HnlBuildInfo;
export const hnlBuildInfo: HnlBuildInfo = __HNL_BUILD_INFO__;

export function hnlBuildTimeVi(iso: string): string {
  const time = new Date(iso);
  if (!Number.isFinite(time.getTime())) return 'Chưa xác định';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(time) + ' (UTC+7)';
}
