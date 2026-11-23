/* StormFile phone app. Copyright (c) 2026 Coastline Code LLC. */
package com.coastlinecode.stormfile;

import android.app.Application;
import android.util.Log;
import android.webkit.WebSettings;
import android.webkit.WebView;

/**
 * Loads the phone's web viewer (Android System WebView) once, before StormFile's screen is created.
 *
 * Learned from KidArmor: on some phones (seen on Android 10) the very first time an app uses the web viewer,
 * Android adds the viewer's resources to the app and restarts the app's screen to pick them up. Capacitor's
 * screen doesn't come back from that restart, so the app stayed blank. Loading the viewer here, before any
 * screen exists, means there is nothing to restart.
 *
 * StormFile's store test showed that loading the viewer's settings alone isn't enough on Android 10 with
 * WebView 74: the screen still restarted 0.6 s after opening and stayed blank. Creating (and throwing away) one
 * web view here also adds the viewer's resources to the app before the first screen.
 */
public class StormFileApp extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        try {
            WebSettings.getDefaultUserAgent(this);
            new WebView(this).destroy();
            Log.i("SF_LIFE", "web viewer ready before the first screen");
        } catch (Throwable t) {
            Log.w("SF_LIFE", "couldn't load the web viewer early: " + t);
        }
    }
}
