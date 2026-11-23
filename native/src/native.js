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
        // iPhone can allow "add events only". Android has no add-only choice: the phone must list your calendars to find the
        // main one, so StormFile asks for calendar access there. It only adds the reminders you chose; it never reads your events.
        var a = window.SF_NATIVE.platform === 'android' ? await CAL.requestFullCalendarAccess() : await CAL.requestWriteOnlyCalendarAccess();
        if(!a || a.result !== 'granted') return window.SF_NATIVE.platform === 'android' ? 'oneByOne' : 'fallback'; // Android's calendar can't open a calendar file
        for(var i = 0; i < events.length; i++) await CAL.createEvent(ev(events[i]));
        return true;
      }catch(e){ return cancelled(e) ? false : 'fallback'; }
    },
    /* Android without calendar access: open the calendar's own new-event screen for each reminder in turn (no access needed). */
    addEventsOneByOne: async function(events){
      for(var i = 0; i < events.length; i++){
        var e = events[i], o = {title:e.title, description:e.description, startDate:e.startDate, endDate:e.endDate};
        if(e.yearly) o.recurrence = {frequency:'yearly', interval:1};
        try{ await CAL.createEventWithPrompt(o); }catch(err){ if(cancelled(err)) return false; }
      }
      return true;
    },
    /* Age check required by some states (Texas now; Utah, Louisiana and California in 2027). StormFile asks Apple or Google
       only where the law applies. Returns 'ok', 'minor' (under 18), 'unverified' (age not shared) or 'verify' (confirm age in Google Play).
       Only a yes/no is kept on the phone; the age range is never stored or sent anywhere. If the check can't run (offline,
       old phone, store problem), StormFile stays usable so records are never locked away during a storm. */
    ageCheck: async function(){
      var AGE = P('AgeSignals'), KEY = 'stormfile_age_ok';
      var wait = function(p, ms){ return Promise.race([p, new Promise(function(_, no){ setTimeout(function(){ no(new Error('timeout')); }, ms); })]); };
      var was = function(){ try{ return localStorage.getItem(KEY) === '1'; }catch(e){ return false; } };
      var keep = function(v){ try{ if(v) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); }catch(e){} };
      if(!AGE) return 'ok';
      try{
        var a = await wait(AGE.isAvailable(), 5000); if(!a || !a.available) return 'ok';
        var req = await wait(AGE.getRegulatoryRequirements(), 8000);
        if(!req || !req.ageAssuranceRequired) return 'ok';
      }catch(e){ return 'ok'; }
      try{
        var r = await wait(AGE.requestAgeRange({ageGates:[18]}), 180000);
        var g = (r && r.ageRange) || {};
        if(r && r.status === 'SHARED'){
          if(g.lowerBound != null && g.lowerBound >= 18){ keep(true); return 'ok'; }
          if(g.upperBound != null && g.upperBound < 18){ keep(false); return 'minor'; }
          if(g.lowerBound != null && g.lowerBound < 18 && g.upperBound == null){ keep(false); return 'minor'; }
        }
        if(r && r.status === 'VERIFICATION_REQUIRED') return was() ? 'ok' : 'verify';
        if(r && r.status === 'NOT_SHARED') return 'unverified';
        return was() ? 'ok' : 'unverified';
      }catch(e){ return was() ? 'ok' : 'unverified'; }
    },
    wipe: function(){ FS.rmdir({path:OUT, directory:'CACHE', recursive:true}).catch(function(){}); },
    onBack: function(handler){ APP.addListener('backButton', function(){ if(!handler()) APP.minimizeApp().catch(function(){}); }); }
  };
  /* Links: outside websites open in the phone's browser; PDF receipts open in the share sheet. */
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[target="_blank"]'); if(!a) return;
    var href = a.getAttribute('href') || '';
    /* StormFile's own Privacy Policy, Terms and Help pages open on the web in the phone's browser */
    var own = a.href.indexOf(location.origin + '/') === 0 && /^[a-z]+\.html([?#].*)?$/.test(a.href.slice(location.origin.length + 1));
    if(own){ e.preventDefault(); window.location.href = 'https://biehl11b.github.io/stormfile/' + a.href.slice(location.origin.length + 1); return; }
    if(/^https?:/i.test(a.href)){ e.preventDefault(); window.location.href = a.href; return; }
    if(/^blob:/.test(href)){ e.preventDefault(); fetch(href).then(function(r){ return r.blob(); }).then(function(b){ return saveFile('receipt.pdf', b); }).catch(function(){}); }
  }, true);
  /* Larger text: follow the phone's text size setting (iPhone Larger Text / Android Font size), now and whenever StormFile comes back to the front */
  var TZ = P('TextZoom');
  function textSize(){ if(TZ && TZ.getPreferred) TZ.getPreferred().then(function(r){ if(r && r.value) return TZ.set({value:Math.min(Math.max(r.value, 1), 2.4)}); }).catch(function(){}); }
  textSize(); APP.addListener('resume', textSize);
  /* hide the logo screen once StormFile has drawn its first screen */
  window.addEventListener('load', function(){ try{ var SP = P('SplashScreen'); SP && SP.hide && SP.hide().catch(function(){}); }catch(e){} });
  setTimeout(function(){ FS.rmdir({path:OUT, directory:'CACHE', recursive:true}).catch(function(){}); }, 5000);
  try{ console.log('SF_NATIVE_OK ' + JSON.stringify({platform:window.SF_NATIVE.platform, plugins:Object.keys(C.Plugins || {}).sort()})); }catch(e){}
})();
