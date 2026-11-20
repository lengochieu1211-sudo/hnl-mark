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
    # TEST54 deliberately has a distinct debug package so an ephemeral GitHub
    # debug keystore can never force users to uninstall TEST51 (offline data).
    # Release applicationId, versionCode and signing remain untouched.
    assert re.fullmatch(r'\.trial\d+', suffix.group(1)),"Test APK must have its own package"
    debug_number=int(suffix.group(1).removeprefix('.trial'))
    assert debug_number>=int(code.group(1)),"Debug test build cannot shadow Production"
    studio=json.loads((ROOT/'studio-ui/package.json').read_text(encoding='utf-8'))
    assert studio['version']==release_version+'-studio'
    assert "version:'"+release_version+"'" in bridge
    assert int(label.group(1))==debug_number%100,"Debug app label must match isolated TEST number"

if __name__=='__main__':
    assert_build_identity()
    print('PASS: APK debug suffix/code, studio UI, bridge and label are aligned')
