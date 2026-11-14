HNL MARK — UI PORT TEST 2.5.12 (14 Nov 2026)

UI from user-supplied untitled.zip: React/Vite prototype, visually translated into existing frontend. The implementation does not run React or use mock data. Camera, Video, photo source retention, 22 timestamp presets including Timemark and Timemark Verified, Android native picker, IndexedDB, MediaStore stay original.

New preview and library CSS surface use navy. Responsive stamp thumbnails: 2 columns for phones. Dedicated TEST package vn.hnl.xaydung.hnlmark.trial2512 ensures side-by-side installation with TEST11 and Production. Do not uninstall old builds; export original photo library ZIP before any app migration.

Review: CI syntax and source checkpoint PASS on first UI commit 8ae28fc. Browser UI smoke 4 viewports web+APK-sim 8/8 PASS; real physical Android camera, video recording/reopen, gallery, save, share, both landscape sides and offline data not runtime tested. Subsequent version-isolation build and CI must be verified independently.

Source-only UI files: hnl-studio-ui.js, hnl-studio-ui.css; index.html, package_web.py and sw.js linking. No change to main/Production.

Regression guard: when videoPanel is visible, all navigation modes retain the real video editor/result/save UI rather than hiding its parent import panel. Source-level + WebView interaction tests required; physical-device testing remains pending.
