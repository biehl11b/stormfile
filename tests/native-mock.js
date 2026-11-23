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
    SplashScreen: {hide: rec('SplashScreen','hide', {})},
    /* Age check: tests set window.__age = {required, status, lower, upper, fail:'req'|'request'} before the app loads */
    AgeSignals: {
      isAvailable: function(){ window.__calls.push(['AgeSignals','isAvailable',null]); return Promise.resolve({available: !!window.__age}); },
      getRegulatoryRequirements: function(){ window.__calls.push(['AgeSignals','getRegulatoryRequirements',null]); var g = window.__age || {};
        return g.fail === 'req' ? Promise.reject(new Error('NETWORK_ERROR')) : Promise.resolve({ageAssuranceRequired: !!g.required, regulatoryFeatures: []}); },
      requestAgeRange: function(a){ window.__calls.push(['AgeSignals','requestAgeRange',a]); var g = window.__age || {};
        if(g.fail === 'request') return Promise.reject(new Error('NETWORK_ERROR'));
        return Promise.resolve(g.status === 'SHARED' ? {status:'SHARED', ageRange:{lowerBound:g.lower, upperBound:g.upper}} : {status:g.status}); }
    },
    TextZoom: {getPreferred: rec('TextZoom','getPreferred', {value:1.6}), set: rec('TextZoom','set', {})}
  };
  window.Capacitor = {isNativePlatform: function(){ return true; }, getPlatform: function(){ return 'ios'; }, Plugins: plugins, registerPlugin: function(n){ return plugins[n]; }};
})();
