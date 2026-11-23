/* StormFile: help for phones with an older built-in web viewer (Android System WebView 69-85).
   Loaded before app.js. Does nothing on newer phones. Copyright (c) 2026 Coastline Code LLC.
   Google Play rejected KidArmor's first build because older Android phones couldn't run its newer code,
   so StormFile adds the few missing pieces here and keeps its own code to what WebView 69 understands. */
(function(){
  'use strict';
  // Object.fromEntries (WebView 73+)
  if(!Object.fromEntries) Object.fromEntries = function(list){ var o = {}; Array.prototype.forEach.call(Array.from(list), function(p){ o[p[0]] = p[1]; }); return o; };
  // Blob.arrayBuffer() and Blob.text() (WebView 76+): used for photos, backups and shared files
  function readAs(blob, kind){ return new Promise(function(ok, no){ var r = new FileReader(); r.onload = function(){ ok(r.result); }; r.onerror = function(){ no(r.error); }; r[kind](blob); }); }
  if(window.Blob && !Blob.prototype.arrayBuffer) Blob.prototype.arrayBuffer = function(){ return readAs(this, 'readAsArrayBuffer'); };
  if(window.Blob && !Blob.prototype.text) Blob.prototype.text = function(){ return readAs(this, 'readAsText'); };
  // Spacing between items (flexbox "gap", WebView 84+). Older viewers ignore it and squeeze everything together,
  // so add the same spacing as margins instead. Newer phones are left exactly as they are.
  function flexGapWorks(){
    var d = document.createElement('div'); d.style.cssText = 'display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden';
    d.appendChild(document.createElement('div')); d.appendChild(document.createElement('div'));
    document.documentElement.appendChild(d); var ok = d.scrollHeight === 1; d.remove(); return ok;
  }
  function addGapFallback(){
    if(flexGapWorks()) return;
    document.documentElement.classList.add('no-flexgap');
    var rules = [];
    Array.prototype.forEach.call(document.styleSheets, function(sh){
      var list; try{ list = sh.cssRules; }catch(e){ return; }
      Array.prototype.forEach.call(list || [], function(r){
        if(!r.style || !r.selectorText) return;
        var disp = r.style.display, row = r.style.rowGap || r.style.gridRowGap, col = r.style.columnGap || r.style.gridColumnGap;
        if(!/flex/.test(disp || '') && !(r.style.flexDirection)) return;
        var column = /column/.test(r.style.flexDirection || '');
        r.selectorText.split(',').forEach(function(sel){
          sel = sel.trim(); if(!sel) return;
          if(column && row && row !== '0px' && row !== 'normal') rules.push(sel + '>*+*{margin-top:' + row + '}');
          if(!column && col && col !== '0px' && col !== 'normal') rules.push(sel + '>*+*{margin-left:' + col + '}');
          if(!column && /wrap/.test(r.style.flexWrap || '') && row && row !== '0px') rules.push(sel + '>*{margin-bottom:' + row + '}');
        });
      });
    });
    var st = document.createElement('style'); st.id = 'flexgap-fallback'; st.textContent = rules.join('\n'); document.head.appendChild(st);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addGapFallback); else addGapFallback();
})();
