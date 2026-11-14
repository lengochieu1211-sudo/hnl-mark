HNL MARK — AI Studio visual port (2026-11-14)
Source supplied by user: untitled.zip, React/Vite prototype. This port translates visual design and basic navigation into the existing HTML/CSS/JS WebView app; React demo is not embedded or shipped.
Timemark/Timemark Verified: originals from app.js, index.html, style.css preserved, no template placeholders used.
Other independent presets: original untouched.
Changed: new hnl-studio-ui.css/js, index.html stylesheet/script links, Android offline packaging and PWA cache, CI syntax checks.
No change: camera engine, video.js, native Android bridge, MediaStore, IndexedDB, export methods, Android appId/package, main/production.
Risks and required device tests: portrait and both landscape rotations, native camera, picker, video exit/reopen, save/share photos and video, full gallery data, PWA offline cache, Android UI contrast and touch targets. This is UI integration, NOT Runtime Golden.
Original ZIP uses placeholder Timemark templates and mock media, so those are intentionally excluded.
