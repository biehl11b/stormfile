/* Test stand-in for Capacitor: pretends to be the iPhone app and records every call to the phone's features. */
window.__calls = [];
(function(){
  var rec = function(plugin, fn, ret){ return function(a){ window.__calls.push([plugin, fn, a === undefined ? null : JSON.parse(JSON.stringify(a))]); return Promise.resolve(typeof ret === 'function' ? ret(a) : ret); }; };
  var plugins = {
    Filesystem: {writeFile: rec('Filesystem','writeFile', function(a){ return {uri:'file:///cache/' + a.path}; }), rmdir: rec('Filesystem','rmdir', {})},
    Share: {share: rec('Share','share', {})},
    App: {addListener: function(ev, fn){ window.__calls.push(['App','addListener',ev]); if(ev === 'backButton') window.__back = fn; return Promise.resolve({remove:function(){}}); }, minimizeApp: rec('App','minimizeApp', {})},
    NativeBiometric: {isAvailable: rec('NativeBiometric','isAvailable', {isAvailable:true}), verifyIdentity: rec('NativeBiometric','verifyIdentity', {})},
    CapacitorCalendar: {createEventWithPrompt: rec('CapacitorCalendar','createEventWithPrompt', {id:'e1'}), requestWriteOnlyCalendarAccess: rec('CapacitorCalendar','requestWriteOnlyCalendarAccess', {result:'granted'}), createEvent: rec('CapacitorCalendar','createEvent', {id:'e2'})},
    SplashScreen: {hide: rec('SplashScreen','hide', {})}
  };
  window.Capacitor = {isNativePlatform: function(){ return true; }, getPlatform: function(){ return 'ios'; }, Plugins: plugins, registerPlugin: function(n){ return plugins[n]; }};
})();
