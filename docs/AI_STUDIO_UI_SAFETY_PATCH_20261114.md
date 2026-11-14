HNL Mark AI Studio primary — safety followup to DEV 6a7862c (14/11/2026)

- Continue the exact DEV React UI, original HNL Mark Timemark engine untouched.
- Persist photo/video originals in IndexedDB BEFORE state tells users they are saved, and warn explicitly if Android MediaStore save fails.
- Block closing camera/system Back while recording/finalizing to avoid losing in-flight video.
- On page visibility loss, request MediaRecorder stop to finalize the recording.
- System Back routes home/overlay correctly without unloading media recorder.
- Change Android TEST14 to fullUser orientation: all four directions when supported, Android rotation lock respected.
- Native Android package remains TEST14 isolated `.trial2514`; no Production change.
- Pending actual Android runtime tests; not Runtime Golden.
