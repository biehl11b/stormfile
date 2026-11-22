/* StormFile phone app: connects the app to the phone's own features. Copyright (c) 2026 Coastline Code LLC.
   Loaded before app.js only in the App Store / Google Play build. Sets window.SF_NATIVE, which app.js uses. */
(function(){
  var C = window.Capacitor;
  if(!(C && C.isNativePlatform && C.isNativePlatform())) return;
  var P = function(n){ return C.registerPlugin ? C.registerPlugin(n) : (C.Plugins && C.Plugins[n]); };
  var FS = P('Filesystem'), SH = P('Share'), APP = P('App'), BIO = P('NativeBiometric'), CAL = P('CapacitorCalendar');
  var OUT = 'stormfile-out';
  document.documentElement.classList.add('native');
  function b64(blob){ return new Promise(function(ok, no){ var r = new FileReader(); r.onload = function(){ ok(String(r.result).split(',')[1]); }; r.onerror = no; r.readAsDataURL(blob); }); }
  function cancelled(e){ return /cancel/i.test((e && e.message) || String(e || '')); }
  async function saveFile(filename, blob){
    var name = String(filename).replace(/[\\/:*?"<>|]+/g, '-');
    try{
      try{ await FS.rmdir({path:OUT, directory:'CACHE', recursive:true}); }catch(e){} /* keep only the file being shared now */
      var w = await FS.writeFile({path:OUT + '/' + name, data:await b64(blob), directory:'CACHE', recursive:true});
      await SH.share({title:name, files:[w.uri]}); return true;
    }catch(e){ return false; }
  }
  window.SF_NATIVE = {
    platform: C.getPlatform ? C.getPlatform() : '',
    store: true, // App Store / Google Play version: no tester notes
    saveFile: saveFile,
    bioSupported: async function(){ try{ var r = await BIO.isAvailable(); return !!(r && r.isAvailable); }catch(e){ return false; } },
    bioVerify: function(reason){ return BIO.verifyIdentity({reason:reason, title:'StormFile'}); },
    /* Calendar: one reminder opens the phone's own "new event" screen. Several (renewal, storm seasons) are added together
       after the person allows calendar access. Returns true (added), false (cancelled) or 'fallback' (share an .ics file instead). */
    addEvents: async function(events){
      var ev = function(e){ var o = {title:e.title, description:e.description, startDate:e.startDate, endDate:e.endDate, alerts:e.alerts};
        if(e.yearly) o.recurrence = {frequency:'yearly', interval:1}; return o; };
      try{
        if(events.length === 1){ var r = await CAL.createEventWithPrompt(ev(events[0])); return !!(r && r.id) || window.SF_NATIVE.platform === 'android'; }
        var a = await CAL.requestWriteOnlyCalendarAccess();
        if(!a || a.result !== 'granted') return 'fallback';
        for(var i = 0; i < events.length; i++) await CAL.createEvent(ev(events[i]));
        return true;
      }catch(e){ return cancelled(e) ? false : 'fallback'; }
    },
    wipe: function(){ FS.rmdir({path:OUT, directory:'CACHE', recursive:true}).catch(function(){}); },
    onBack: function(handler){ APP.addListener('backButton', function(){ if(!handler()) APP.minimizeApp().catch(function(){}); }); }
  };
  /* Links: outside websites open in the phone's browser; PDF receipts open in the share sheet. */
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[target="_blank"]'); if(!a) return;
    var href = a.getAttribute('href') || '';
    if(/^https?:/i.test(a.href)){ e.preventDefault(); window.location.href = a.href; return; }
    if(/^blob:/.test(href)){ e.preventDefault(); fetch(href).then(function(r){ return r.blob(); }).then(function(b){ return saveFile('receipt.pdf', b); }).catch(function(){}); }
  }, true);
  /* hide the logo screen once StormFile has drawn its first screen */
  window.addEventListener('load', function(){ try{ var SP = P('SplashScreen'); SP && SP.hide && SP.hide().catch(function(){}); }catch(e){} });
  setTimeout(function(){ FS.rmdir({path:OUT, directory:'CACHE', recursive:true}).catch(function(){}); }, 5000);
  try{ console.log('SF_NATIVE_OK ' + JSON.stringify({platform:window.SF_NATIVE.platform, plugins:Object.keys(C.Plugins || {}).sort()})); }catch(e){}
})();
