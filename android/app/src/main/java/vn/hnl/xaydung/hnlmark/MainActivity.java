package vn.hnl.xaydung.hnlmark;

import android.Manifest;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.ValueCallback;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.webkit.WebViewAssetLoader;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Offline Android-specific shell around the exact HNLMark DEV web core.
 * No remote host is allowed to load into the privileged WebView.
 */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String ENTRY = "https://" + HOST + "/assets/www/index.html";
    private static final int REQ_FILES = 400;
    private static final int REQ_MEDIA_PERMISSIONS = 401;
    private static final int NAVY = Color.rgb(19, 38, 58);
    private static final int GOLD = Color.rgb(255, 210, 83);

    private FrameLayout root;
    private LinearLayout chromeHeader;
    private LinearLayout chromeTabs;
    private WebView web;
    private View fullscreenView;
    private WebChromeClient.CustomViewCallback fullscreenCallback;
    private ValueCallback<Uri[]> fileCallback;
    private PermissionRequest pendingMediaRequest;
    private String[] pendingResources;
    private boolean cameraImmersive;
    private final Map<String, SaveSession> sessions = new ConcurrentHashMap<>();

    private static final class SaveSession {
        final Uri uri;
        final OutputStream stream;
        SaveSession(Uri uri, OutputStream stream) { this.uri = uri; this.stream = stream; }
    }

    private int dp(float v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }

    private TextView text(String label, int sp, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(label);
        t.setTextColor(color);
        t.setTextSize(sp);
        t.setGravity(Gravity.CENTER_VERTICAL);
        if (bold) t.setTypeface(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD);
        return t;
    }

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(NAVY);
        getWindow().setNavigationBarColor(Color.BLACK);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);

        root = new FrameLayout(this);
        LinearLayout app = new LinearLayout(this);
        app.setOrientation(LinearLayout.VERTICAL);
        app.setBackgroundColor(Color.rgb(237, 242, 248));
        root.addView(app, new FrameLayout.LayoutParams(-1, -1));

        chromeHeader = new LinearLayout(this);
        chromeHeader.setOrientation(LinearLayout.HORIZONTAL);
        chromeHeader.setGravity(Gravity.CENTER_VERTICAL);
        chromeHeader.setPadding(dp(16), 0, dp(15), 0);
        chromeHeader.setBackgroundColor(NAVY);
        LinearLayout.LayoutParams headerLayout = new LinearLayout.LayoutParams(-1, dp(52));
        app.addView(chromeHeader, headerLayout);

        TextView title = text("HNLMark", 19, Color.WHITE, true);
        chromeHeader.addView(title, new LinearLayout.LayoutParams(0, -1, 1f));
        TextView offline = text("●  OFFLINE", 11, GOLD, true);
        chromeHeader.addView(offline);

        web = new WebView(this);
        app.addView(web, new LinearLayout.LayoutParams(-1, 0, 1f));

        chromeTabs = new LinearLayout(this);
        chromeTabs.setOrientation(LinearLayout.HORIZONTAL);
        chromeTabs.setBackgroundColor(NAVY);
        chromeTabs.setPadding(dp(6), dp(3), dp(6), dp(3));
        app.addView(chromeTabs, new LinearLayout.LayoutParams(-1, dp(61)));
        addTab("Chụp", android.R.drawable.ic_menu_camera, "capture");
        addTab("Thư viện", android.R.drawable.ic_menu_gallery, "library");
        addTab("Cài dấu", android.R.drawable.ic_menu_edit, "stamp");
        addTab("Xuất", android.R.drawable.ic_menu_save, "export");

        setContentView(root);
        initializeWeb();
    }

    private void addTab(String label, int iconId, String command) {
        LinearLayout item = new LinearLayout(this);
        item.setOrientation(LinearLayout.VERTICAL);
        item.setGravity(Gravity.CENTER);
        item.setClickable(true);
        item.setFocusable(true);
        item.setContentDescription(label);
        item.setPadding(0, dp(3), 0, dp(2));
        ImageView image = new ImageView(this);
        image.setImageResource(iconId);
        if (image.getDrawable() != null) image.getDrawable().mutate().setTint(GOLD);
        item.addView(image, new LinearLayout.LayoutParams(dp(23), dp(23)));
        TextView name = text(label, 10, Color.WHITE, false);
        name.setGravity(Gravity.CENTER);
        item.addView(name, new LinearLayout.LayoutParams(-1, dp(18)));
        chromeTabs.addView(item, new LinearLayout.LayoutParams(0, -1, 1f));
        item.setOnClickListener(v -> {
            if (web != null) {
                web.evaluateJavascript(
                    "window.HNLAndroidApp && window.HNLAndroidApp.chooseTab(" +
                    org.json.JSONObject.quote(command) + ")", null);
            }
        });
    }

    private boolean trusted(Uri uri) {
        return uri != null && "https".equalsIgnoreCase(uri.getScheme())
            && HOST.equalsIgnoreCase(uri.getHost());
    }

    private void initializeWeb() {
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setBackgroundColor(Color.rgb(237, 242, 248));
        web.addJavascriptInterface(new NativeBridge(), "HNLAndroidBridge");

        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .setDomain(HOST)
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();

        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                if (trusted(req.getUrl())) return loader.shouldInterceptRequest(req.getUrl());
                // No external page/resource can access the native JS bridge.
                return new WebResourceResponse("text/plain", "UTF-8",
                    new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                if (trusted(req.getUrl())) return false;
                Uri uri = req.getUrl();
                if ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (Exception ignored) { toast("Không mở được liên kết."); }
                }
                return true;
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (trusted(Uri.parse(url))) {
                    view.evaluateJavascript(
                        "document.body.classList.add('hnl-android-apk');" +
                        "window.HNLAndroidApp && window.HNLAndroidApp.chooseTab('capture')",
                        null);
                }
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> handleWebPermission(request));
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest request) {
                if (pendingMediaRequest == request) {
                    pendingMediaRequest = null;
                    pendingResources = null;
                }
            }
            @Override public boolean onShowFileChooser(
                WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent pick = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                pick.addCategory(Intent.CATEGORY_OPENABLE);
                pick.setType("*/*");
                pick.putExtra(Intent.EXTRA_MIME_TYPES,
                    new String[] {"image/*", "video/*", "application/zip", "application/octet-stream"});
                pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,
                    params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                pick.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try {
                    startActivityForResult(Intent.createChooser(pick, "Chọn ảnh, video hoặc dự án"), REQ_FILES);
                } catch (Exception e) {
                    fileCallback.onReceiveValue(null);
                    fileCallback = null;
                    toast("Không mở được trình chọn file.");
                }
                return true;
            }
            @Override public void onShowCustomView(View view, CustomViewCallback callback) {
                if (fullscreenView != null) { callback.onCustomViewHidden(); return; }
                fullscreenView = view;
                fullscreenCallback = callback;
                root.addView(view, new FrameLayout.LayoutParams(-1, -1));
                setChromeVisible(false);
                web.setVisibility(View.GONE);
                getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
            }
            @Override public void onHideCustomView() { hideFullscreen(); }
        });
        web.loadUrl(ENTRY);
    }

    private void handleWebPermission(PermissionRequest request) {
        if (!trusted(request.getOrigin())) { request.deny(); return; }
        if (pendingMediaRequest != null) { request.deny(); return; }
        List<String> webResources = new ArrayList<>();
        List<String> androidPermissions = new ArrayList<>();
        List<String> requested = Arrays.asList(request.getResources());
        if (requested.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
            webResources.add(PermissionRequest.RESOURCE_VIDEO_CAPTURE);
            androidPermissions.add(Manifest.permission.CAMERA);
        }
        if (requested.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
            webResources.add(PermissionRequest.RESOURCE_AUDIO_CAPTURE);
            androidPermissions.add(Manifest.permission.RECORD_AUDIO);
        }
        if (webResources.isEmpty() || webResources.size() != requested.size()) {
            request.deny();
            return;
        }
        boolean allGranted = true;
        for (String p : androidPermissions) {
            if (checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED) allGranted = false;
        }
        if (allGranted) {
            request.grant(webResources.toArray(new String[0]));
            return;
        }
        pendingMediaRequest = request;
        pendingResources = webResources.toArray(new String[0]);
        requestPermissions(androidPermissions.toArray(new String[0]), REQ_MEDIA_PERMISSIONS);
    }

    @Override public void onRequestPermissionsResult(
        int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode != REQ_MEDIA_PERMISSIONS || pendingMediaRequest == null) return;
        boolean allowed = results.length == permissions.length && results.length > 0;
        for (int result : results) allowed &= result == PackageManager.PERMISSION_GRANTED;
        PermissionRequest p = pendingMediaRequest;
        String[] resources = pendingResources;
        pendingMediaRequest = null;
        pendingResources = null;
        if (allowed && resources != null) p.grant(resources);
        else { p.deny(); toast("Chưa cấp quyền camera/micro."); }
    }

    @Override protected void onActivityResult(int code, int resultCode, Intent data) {
        super.onActivityResult(code, resultCode, data);
        if (code != REQ_FILES || fileCallback == null) return;
        ValueCallback<Uri[]> callback = fileCallback;
        fileCallback = null;
        callback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
    }

    private void setChromeVisible(boolean visible) {
        chromeHeader.setVisibility(visible ? View.VISIBLE : View.GONE);
        chromeTabs.setVisibility(visible ? View.VISIBLE : View.GONE);
    }

    private void hideFullscreen() {
        if (fullscreenView == null) return;
        root.removeView(fullscreenView);
        fullscreenView = null;
        if (fullscreenCallback != null) fullscreenCallback.onCustomViewHidden();
        fullscreenCallback = null;
        web.setVisibility(View.VISIBLE);
        if (!cameraImmersive) {
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
            setChromeVisible(true);
        }
    }

    @Override public void onConfigurationChanged(Configuration config) {
        super.onConfigurationChanged(config);
        if (web != null) web.post(() ->
            web.evaluateJavascript("window.dispatchEvent(new Event('resize'))", null));
    }

    @Override public void onBackPressed() {
        if (fullscreenView != null) { hideFullscreen(); return; }
        if (cameraImmersive) {
            web.evaluateJavascript(
                "(function(){if(document.body.classList.contains('hnl-video-live'))" +
                "document.getElementById('videoClose')?.click();" +
                "else document.getElementById('closeCamera')?.click();})()", null);
            return;
        }
        web.evaluateJavascript(
            "(function(){const m=document.getElementById('libraryModal');" +
            "if(m&&!m.hidden){document.getElementById('closeLibrary')?.click();return true;}" +
            "return false;})()",
            value -> {
                if (!"true".equals(value)) moveTaskToBack(true);
            });
    }

    @Override protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
    }

    @Override protected void onPause() {
        if (web != null) web.onPause();
        super.onPause();
    }

    @Override protected void onDestroy() {
        for (String token : new ArrayList<>(sessions.keySet())) abortSession(token);
        if (web != null) {
            web.loadUrl("about:blank");
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    private void toast(String text) {
        runOnUiThread(() -> Toast.makeText(this, text, Toast.LENGTH_LONG).show());
    }

    private String beginSession(String requestedName, String mime) {
        String name = requestedName == null ? "HNLMark" : requestedName
            .replaceAll("[\\\\/:*?\"<>|\\r\\n]", "_");
        if (name.length() > 120) name = name.substring(name.length() - 120);
        if (name.isEmpty()) name = "HNLMark";
        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
        values.put(MediaStore.MediaColumns.MIME_TYPE,
            mime == null || mime.isEmpty() ? "application/octet-stream" : mime);
        values.put(MediaStore.MediaColumns.RELATIVE_PATH,
            Environment.DIRECTORY_DOWNLOADS + "/HNLMark");
        values.put(MediaStore.MediaColumns.IS_PENDING, 1);
        Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
        if (uri == null) return "";
        try {
            OutputStream stream = getContentResolver().openOutputStream(uri);
            if (stream == null) throw new IOException("No output stream");
            String token = UUID.randomUUID().toString();
            sessions.put(token, new SaveSession(uri, stream));
            return token;
        } catch (Exception e) {
            getContentResolver().delete(uri, null, null);
            return "";
        }
    }

    private boolean appendSession(String token, String base64) {
        SaveSession s = sessions.get(token);
        if (s == null) return false;
        try {
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            synchronized (s) { s.stream.write(bytes); }
            return true;
        } catch (Exception e) { return false; }
    }

    private boolean finishSession(String token) {
        SaveSession s = sessions.remove(token);
        if (s == null) return false;
        try {
            synchronized (s) { s.stream.flush(); s.stream.close(); }
            ContentValues done = new ContentValues();
            done.put(MediaStore.MediaColumns.IS_PENDING, 0);
            if (getContentResolver().update(s.uri, done, null, null) < 1)
                throw new IOException("MediaStore finalization rejected");
            toast("Đã lưu vào Tải xuống/HNLMark");
            return true;
        } catch (Exception e) {
            try { s.stream.close(); } catch (Exception ignored) {}
            getContentResolver().delete(s.uri, null, null);
            return false;
        }
    }

    private void abortSession(String token) {
        SaveSession s = sessions.remove(token);
        if (s == null) return;
        try { s.stream.close(); } catch (IOException ignored) {}
        getContentResolver().delete(s.uri, null, null);
    }

    /** Exposed only to trusted appassets content; all external WebView URLs blocked. */
    public final class NativeBridge {
        @JavascriptInterface public String beginSave(String name, String mime) {
            return beginSession(name, mime);
        }
        @JavascriptInterface public boolean appendSave(String token, String base64) {
            return appendSession(token, base64);
        }
        @JavascriptInterface public boolean finishSave(String token) {
            return finishSession(token);
        }
        @JavascriptInterface public void abortSave(String token) {
            abortSession(token);
        }
        @JavascriptInterface public void cameraState(boolean active) {
            runOnUiThread(() -> {
                cameraImmersive = active;
                if (fullscreenView == null) {
                    setChromeVisible(!active);
                    if (active) getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
                    else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
                }
            });
        }
    }
}
