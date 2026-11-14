HNL MARK — AI STUDIO ORIGINAL UI AS THE PRIMARY APP
DEV TEST 2.5.14-STUDIO — 14 Nov 2026

USER DECISION: Use original AI Studio React interface as the primary APK experience, then add missing functions. Do not re-skin the old HTML page. Keep current HNL Mark engine as reversible and accessible advanced workspace.

ARCHITECTURE
- Android Java ENTRY points to studio/index.html built from studio-ui/src/App.tsx + original AI Studio components.
- Root assets/www/index.html and original app.js/video.js remain byte-equivalent (apart from version banners in Android-only JS). No Timemark renderer is rewritten.
- React CameraApkScreen now uses navigator.mediaDevices.getUserMedia + MediaRecorder, not scene/mock images. Native fallback opens original HNL engine. Save image/video ORIGINALS to device MediaStore and isolated IndexedDB; don't advertise that native React camera media is already watermarked.
- React library uses separate hnlmark-studio-media-v1 IndexedDB, does not alter legacy library. Project ZIP includes original media; restore adds new ID without overwriting old entries.
- Real 22 preset IDs map exactly to the original engine (timemark, site, minimal, ribbon, clean, tech, cinema, compact, clock, none, and 12 independent). The React overlay is only a fast preview. Exact Timemark export uses original editor opened as same-origin legacy iframe. No placeholder Timemark.
- React UI logo uses original HNL PNG from source.
- Android debug isolated applicationIdSuffix .trial2514. Do not uninstall TEST12/Production.

CONSTRAINTS / PENDING
1. React photo/video camera preview and recording on real Android devices: permission, rotation, native picker and MediaStore, back button.
2. Original Timemark output exact check, imported media forwarding and legacy editor fullscreen.
3. Verify APK screenshot on both portrait/landscape and with rotation lock.
4. Verify video save: WebM codec may not be supported on all Android WebViews. Use HNL original engine fallback when unavailable.
5. Fallback legacy library and new React isolated library are independent; do not claim automatic migration. Backup data before removing apps.
6. No changes to main/Production. Runtime Golden remains PENDING until device testing.
