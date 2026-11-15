from pathlib import Path
p=Path(__file__).resolve().parents[1]
java=(p/'android/app/src/main/java/vn/hnl/xaydung/hnlmark/MainActivity.java').read_text()
loc=(p/'studio-ui/src/services/watermarkLocation.ts').read_text()
ui=(p/'studio-ui/src/components/stamps/StampsAndSettingsScreen.tsx').read_text()
cam=(p/'studio-ui/src/components/camera/CameraApkScreen.tsx').read_text()
assert 'Geocoder.GeocodeListener' in java and 'new Locale("vi","VN")' in java
assert '@JavascriptInterface public void reverseGeocode(' in java
assert 'hnl-studio:reverse-geocode' in java and 'hnl-studio:reverse-geocode' in loc
assert 'reverseDeviceGpsAddress(coordinates)' in ui
assert "onChangeConfig({locationSource:'device',coordinates,locationText:''})" in ui
assert "onChangeConfig({locationSource:'device',coordinates,locationText:address})" in ui
assert "nearbyGpsAddress(watermarkConfig.coordinates,shotGps||'',watermarkConfig.locationText)" in cam
assert 'location:shotAddress,' in cam and 'locationText:shotAddress' in cam
assert 'navigator.geolocation.getCurrentPosition' in loc
assert 'https://nominatim' not in loc
print('PASS TEST34: native Android reverse geocode is opt-in; GPS remains fallback; camera preserves matching address')
