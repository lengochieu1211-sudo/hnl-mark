"""Version-independent APK identity guard for all legacy regression scripts."""
from pathlib import Path
import json
import re

ROOT=Path(__file__).resolve().parents[1]

def assert_build_identity():
    gradle=(ROOT/'android/app/build.gradle').read_text(encoding='utf-8')
    bridge=(ROOT/'android/android-app.js').read_text(encoding='utf-8')
    name=re.search(r"versionName\s+'([^']+)'",gradle)
    code=re.search(r"versionCode\s+(\d+)",gradle)
    suffix=re.search(r"applicationIdSuffix\s+'([^']+)'",gradle)
    label=re.search(r"'hnlmark_application_name',\s*'HNLMark STUDIO (\d+)'",gradle)
    assert name and code and suffix and label,"APK version fields missing"
    release_version=name.group(1).removesuffix('-studio-test')
    assert re.fullmatch(r'\d+\.\d+\.\d+',release_version)
    assert name.group(1).endswith('-studio-test') or "versionNameSuffix '-studio-test'" in gradle
    assert suffix.group(1)=='.trial'+code.group(1),"Test APK must be installable in parallel"
    studio=json.loads((ROOT/'studio-ui/package.json').read_text(encoding='utf-8'))
    assert studio['version']==release_version+'-studio'
    assert "version:'"+release_version+"'" in bridge
    patch=release_version.split('.')[2]
    assert label.group(1)==patch

if __name__=='__main__':
    assert_build_identity()
    print('PASS: APK debug suffix/code, studio UI, bridge and label are aligned')
