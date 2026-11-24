/** TEST70: build identity is immutable and visible in a compact settings detail. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const config=read('studio-ui/vite.config.ts'),ui=read('studio-ui/src/components/stamps/StampsAndSettingsScreen.tsx');
const src=read('studio-ui/src/services/buildInfo.ts'),gradle=read('android/app/build.gradle');
assert.ok(config.includes('__HNL_BUILD_INFO__')&&config.includes('new Date().toISOString()'));
assert.ok(config.includes('GITHUB_SHA')&&config.includes('packageInfo.version'));
assert.ok(src.includes("timeZone: 'Asia/Ho_Chi_Minh'")&&src.includes('Chưa xác định'));
assert.ok(ui.includes('Thông tin ứng dụng')&&ui.includes('Ngày giờ tạo bản build')&&ui.includes('hnlBuildInfo.sourceSha'));
assert.ok(ui.includes('<details')&&ui.includes('Đây là giờ đóng gói'));
assert.match(gradle,/applicationIdSuffix '\.trial\d+'/);
assert.match(gradle,/HNLMark STUDIO \d+/);
assert.match(gradle,/applicationId 'vn.hnl.xaydung.hnlmark'/);
assert.match(gradle,/versionCode 2547/);
console.log('PASS TEST70: app version/immutable build timestamp/HEAD visible, isolated Android TEST suffix');
