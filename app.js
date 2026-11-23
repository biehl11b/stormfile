(function(){
/* In the App Store / Google Play app, native/src/native.js sets SF_NATIVE so StormFile can use the phone's own share sheet, Face ID and calendar. */
const NAT = window.SF_NATIVE || null;
const TEST = !(NAT && NAT.store);
/* Two store versions: the iPhone app talks only about iPhone things and the Android app only about Android things
   (Apple rejects apps that mention other phones, guideline 2.3.10). The web version mentions both. */
const PLAT = NAT ? (NAT.platform === 'ios' ? 'ios' : 'android') : 'web';
const BIOS = () => ({ios:'Face ID or Touch ID', android:'fingerprint or face unlock', web:'Face ID or fingerprint'})[PLAT];
const CLOUD = () => ({ios:'iCloud Drive', android:'Google Drive', web:'iCloud Drive, Google Drive'})[PLAT]; // the shared test version shows tester notes; the App Store / Google Play version doesn't
const YEAR = 2026;
const CPI = 0.031;
const fmt = n => '$' + Math.round(n).toLocaleString('en-US');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Math.random().toString(36).slice(2,9);

/* ---------- Sample policies, as the AI reader would return them ---------- */
const HOME_POLICY = {
  carrier:'Gulf Harbor Mutual (sample)', form:'HO-3 Homeowners', number:'HO3-4471-SAMPLE',
  renewal:'2027-06-01', agent:'Sample Agency · (228) 555-0142', claimPhone:'1-800-555-0199',
  coverages:[
    {key:'A',name:'Your house',plain:'Pays to rebuild the house itself',limit:285000,src:'Dec. page, line A'},
    {key:'B',name:'Other structures',plain:'Fence, shed, detached garage',limit:28500,src:'Dec. page, line B'},
    {key:'C',name:'Your stuff',plain:'Furniture, clothes, electronics. Pays the price of a new item.',limit:142500,src:'Endorsement HO 04 90, p. 1'},
    {key:'D',name:'Hotel and food',plain:'Extra living costs if you can’t stay home',limit:57000,src:'Section I, Coverage D, p. 4'},
    {key:'E',name:'Liability',plain:'If someone is hurt on your property and sues',limit:300000,src:'Dec. page, line E'}
  ],
  deductibles:{allPerils:2500, hurricanePct:5}, inflationGuardPct:4, roofRCYears:15,
  ale:{months:12, civilWeeks:2, src:'Section I, Coverage D \u2013 Loss of Use, p. 4',
    civilRule:'Pays up to 2 weeks when a government order keeps you out because of damage nearby from a cause this policy covers, like wind.'},
  notCovered:[
    {sev:'bad',title:'Flood or storm surge',plain:'Rising water from any source is excluded. You need a separate flood policy (NFIP or private).',src:'Section I Exclusions, A.3, p. 11',quote:'We do not insure for loss caused by water damage, meaning flood, surface water, waves, tidal water…'},
    {sev:'warn',title:'Code upgrades when rebuilding',plain:'No "ordinance or law" coverage. If the county requires a higher foundation or new wiring, you pay the difference.',src:'Section I Exclusions, A.1, p. 10',quote:'Ordinance or Law, meaning any ordinance or law requiring or regulating the construction…'},
    {sev:'warn',title:'Sewer or drain backup',plain:'Water backing up through drains is excluded. An endorsement costs about $50–$100 a year.',src:'Section I Exclusions, A.3.c, p. 11',quote:'Water or water-borne material which backs up through sewers or drains…'},
    {sev:'warn',title:'Cars, campers and trailers',plain:'Motor vehicles, campers and trailers are not covered. They need an auto or RV policy with comprehensive coverage. Boats pay at most $1,500.',src:'Section I, Property Not Covered, p. 3',quote:'We do not cover motor vehicles\u2026 trailers, campers\u2026 Watercraft limited to $1,500\u2026'},
    {sev:'warn',title:'Mold is capped',plain:'Mold cleanup pays at most $10,000, even after a covered roof leak.',src:'Endorsement HO 04 27, p. 2',quote:'The most we will pay for "fungi", wet or dry rot, or bacteria is $10,000…'}
  ],
  covered:[
    {title:'Wind and hail',plain:'Covered, but a 5% hurricane deductible applies to named storms.',src:'Hurricane Deductible Endorsement, p. 1'},
    {title:'Fallen trees',plain:'Damage to the house from a tree is covered. Tree removal pays up to $1,000.',src:'Section I, Additional Coverages, p. 5'}
  ]
};
const RENTAL_POLICY = {
  carrier:'Gulf Harbor Mutual (sample)', form:'DP-3 Landlord Dwelling', number:'DP3-2218-SAMPLE',
  renewal:'2027-03-01', agent:'Sample Agency · (228) 555-0142', claimPhone:'1-800-555-0199',
  coverages:[
    {key:'A',name:'The rental house',plain:'Pays to rebuild the house',limit:210000,src:'Dec. page, line A'},
    {key:'B',name:'Other structures',plain:'Fence, shed, carport',limit:21000,src:'Dec. page, line B'},
    {key:'C',name:'Your property at the rental',plain:'Appliances, blinds and yard equipment you own. Paid at used value.',limit:15000,src:'Dec. page, line C'},
    {key:'D',name:'Lost rent',plain:'Rent you lose while the house is being repaired',limit:21000,src:'Coverage D – Fair Rental Value, p. 3'},
    {key:'L',name:'Liability',plain:'If a tenant or guest is hurt and sues',limit:300000,src:'Liability Endorsement DL 24 01'}
  ],
  deductibles:{allPerils:2500, hurricanePct:2}, inflationGuardPct:0,
  notCovered:[
    {sev:'bad',title:'Flood or storm surge',plain:'Excluded. This rental has a separate NFIP flood policy on file.',src:'General Exclusions, A.3, p. 9',quote:'We do not insure for loss caused by flood, surface water, waves…'},
    {sev:'warn',title:'Your tenant’s belongings',plain:'Not covered at all. Your tenant needs their own renter’s insurance.',src:'Coverage C, p. 2',quote:'We cover property usual to the maintenance of the dwelling and owned by you…'},
    {sev:'warn',title:'Empty for more than 60 days',plain:'If the house sits vacant over 60 days, vandalism and broken glass are no longer covered.',src:'Conditions, Vacancy, p. 12',quote:'If the dwelling has been vacant for more than 60 consecutive days…'},
    {sev:'warn',title:'Your property is paid at used value',plain:'Coverage C pays what a 6-year-old refrigerator is worth today, not the cost of a new one.',src:'Loss Settlement, p. 10',quote:'Personal property at actual cash value at the time of loss…'}
  ],
  covered:[
    {title:'Wind and hail',plain:'Covered, with a 2% hurricane deductible.',src:'Windstorm Deductible Endorsement'},
    {title:'Lost rent',plain:'Pays the monthly rent while repairs keep the house empty.',src:'Coverage D, p. 3'}
  ]
};
const BUSINESS_POLICY = {
  carrier:'Gulf Harbor Mutual (sample)', form:'Businessowners Policy (BOP)', number:'BOP-9035-SAMPLE',
  renewal:'2027-01-15', agent:'Sample Agency · (228) 555-0142', claimPhone:'1-800-555-0199',
  coverages:[
    {key:'BLD',name:'Building',plain:'Pays to repair or rebuild the building',limit:420000,src:'Dec. page, Building'},
    {key:'BPP',name:'Equipment and inventory',plain:'Kitchen equipment, furniture, stock, computers',limit:160000,src:'Dec. page, Business Personal Property'},
    {key:'BI',name:'Lost income',plain:'Lost profit plus bills you keep paying (payroll, loans) while closed for repairs',limit:180000,src:'Business Income, p. 6'},
    {key:'EE',name:'Extra expense',plain:'Costs to reopen faster, like a temporary location or rental equipment',limit:25000,src:'Extra Expense, p. 7'},
    {key:'L',name:'Liability',plain:'If a customer is hurt and sues',limit:1000000,src:'Section II, p. 18'}
  ],
  deductibles:{allPerils:1000, hurricanePct:3}, inflationGuardPct:2, coinsurancePct:80, waitHours:72,
  notCovered:[
    {sev:'bad',title:'Flood or storm surge',plain:'Excluded. Federal flood insurance for businesses tops out at $500,000 building and $500,000 contents.',src:'Exclusions, B.1.g, p. 14',quote:'Flood, surface water, waves, tides, tidal waves, overflow of any body of water…'},
    {sev:'warn',title:'Power outage from off-site damage',plain:'If the storm knocks out the power grid but your building is fine, lost income is not covered.',src:'Exclusions, B.1.e, p. 14',quote:'The failure of power, communication, water or other utility service supplied to the described premises…'},
    {sev:'warn',title:'Food spoilage',plain:'Food that spoils during a power outage is not covered without a spoilage endorsement.',src:'Exclusions, B.2.d, p. 15',quote:'Spoilage of perishable goods due to… power outage…'},
    {sev:'warn',title:'First 72 hours closed',plain:'Lost income starts paying 72 hours after the damage. The first 3 days are on you.',src:'Business Income, waiting period, p. 6',quote:'We will not pay for any loss during the first 72 hours…'}
  ],
  covered:[
    {title:'Wind and hail',plain:'Covered, with a 3% named storm deductible.',src:'Named Storm Deductible Endorsement'},
    {title:'Lost income after damage',plain:'Up to 12 months, once the building is damaged by a covered cause.',src:'Business Income, p. 6'}
  ]
};

const TYPES = {
  home:{label:'Home',building:'A',contents:'C',loss:'D',buildingName:'House coverage',contentsName:'Your stuff',lossName:'Hotel & food',
    lossHelp:'Log every hotel night, meal and extra mile while you can’t live at home.',roomsTitle:'Rooms & photos',tab:'Rooms',area:'room',
    itemHint:'e.g. Dining table',mapLabel:'Your home',policy:HOME_POLICY,
    rooms:['Living room','Kitchen','Primary bedroom','Bathrooms','Garage']},
  rental:{label:'Rental',building:'A',contents:'C',loss:'D',buildingName:'House coverage',contentsName:'Your property there',lossName:'Lost rent',
    lossHelp:'Log each month of rent you lose while the house can’t be rented.',roomsTitle:'What you own at the rental',tab:'Rooms',area:'area',
    itemHint:'e.g. Washer',mapLabel:'Your rental',policy:RENTAL_POLICY,
    rooms:['Kitchen appliances','Laundry','HVAC & water heater','Yard & exterior']},
  business:{label:'Business',building:'BLD',contents:'BPP',loss:'BI',buildingName:'Building coverage',contentsName:'Equipment & inventory',lossName:'Lost income & extra costs',
    lossHelp:'Log lost sales, payroll you keep paying, and extra costs like a temporary location.',roomsTitle:'Areas & equipment',tab:'Areas',area:'area',
    itemHint:'e.g. Commercial ice machine',mapLabel:'Your business',policy:BUSINESS_POLICY,
    rooms:['Front of house','Equipment','Stock room','Office']}
};

const room = (name, items=[], photos=0) => ({id:uid(), name, photos, items:items.map(([n,v,y,r])=>({n,v,y,r:r||''})), open:false});
const blankClaim = () => ({number:'',adjuster:'',adjPhone:'',dateOfLoss:'',log:[],receipts:[],status:'home',orderDate:'',mileRate:0.70});

const clone = o => JSON.parse(JSON.stringify(o));
const newPolicy = type => Object.assign(clone(TYPES[type].policy), {id:uid()});
const DEFAULT_STATE = () => {
  const hp = Object.assign(clone(HOME_POLICY),{id:uid()}), rp = Object.assign(clone(RENTAL_POLICY),{id:uid()}), bp = Object.assign(clone(BUSINESS_POLICY),{id:uid()});
  bp.locations = 2;
  const home = {id:uid(), type:'home', name:'Our house', address:'Gulf Coast, MS', inPath:true, policyId:hp.id,
    info:{sqft:1850, cps:172, localInfl:5.8, flood:'none'}, exterior:[], manual:{}, claim:blankClaim(),
    upgrades:[{n:'Roof replacement (architectural shingles)',v:14800,y:2019,r:'Contractor invoice'},{n:'HVAC system, 4-ton',v:7600,y:2022,r:''},{n:'Impact windows (14)',v:12400,y:2023,r:'Contractor invoice'}],
    vehicles:[{n:'2021 Ford F-150',kind:'Car or truck',cov:'auto-comp'},{n:'2019 travel trailer, 24 ft',kind:'Camper or RV',cov:'none'},{n:'Bass boat and trailer',kind:'Boat',cov:'home-limited'}],
    rooms:[room('Living room',[['Samsung 65" TV',1100,2023,'Best Buy receipt'],['Leather sectional',2400,2021,'Furniture store receipt'],['Coffee table',350,2019],['Area rug 8x10',420,2022]],2),
           room('Kitchen',[['Refrigerator, French door',2200,2022],['Microwave',240,2024],['Cookware set',380,2020]],1),
           room('Primary bedroom',[['King bed and frame',1900,2021]]), room('Bedroom 2'),
           room('Garage',[['Riding mower',2900,2020]]), room('Bathrooms')]};
  const rental = {id:uid(), type:'rental', name:'Rental house', address:'Baton Rouge, LA', inPath:false, policyId:rp.id,
    info:{sqft:1400, cps:160, localInfl:5.1, flood:'nfip', rent:1650, tenant:'Sample tenant · (225) 555-0118', renterProof:false},
    exterior:[], manual:{}, claim:blankClaim(),
    rooms:[room('Kitchen appliances',[['Refrigerator',1400,2020],['Electric range',900,2020],['Dishwasher',650,2021]],1),
           room('Laundry',[['Washer',750,2022],['Dryer',700,2022]]), room('HVAC & water heater',[['3-ton AC unit',5200,2018],['Water heater, 50 gal',1300,2021],['Thermostat',180,2021]],1),
           room('Yard & exterior')]};
  const biz = {id:uid(), type:'business', name:'Coastal Grill', address:'Gulfport, MS', inPath:true, policyId:bp.id,
    info:{sqft:3200, cps:190, localInfl:5.8, flood:'none', monthlyNeed:26000, monthsClosed:8, stockReport:''},
    exterior:[], manual:{}, claim:blankClaim(),
    rooms:[room('Dining room',[['Tables and chairs (seats 80)',9600,2021],['TVs (4)',2400,2022],['Host stand and decor',1800,2021]],2),
           room('Kitchen equipment',[['6-burner commercial range',6500,2021],['Walk-in cooler',14000,2019],['Fryers (2)',4200,2022],['Hood system',11000,2019]],1),
           room('Bar',[['Ice machine',3800,2023]]), room('Office',[['POS system',3800,2023],['Laptop and printer',1400,2024],['Safe',900,2019]])]};
  const biz2 = {id:uid(), type:'business', name:'Coastal Grill – Long Beach', address:'Long Beach, MS', inPath:true, policyId:bp.id,
    info:{sqft:2400, cps:190, localInfl:5.8, flood:'nfip', monthlyNeed:18000, monthsClosed:8, stockReport:'Stock report · Sept 2026'},
    exterior:[], manual:{}, claim:blankClaim(),
    rooms:[room('Dining room',[['Tables and chairs (seats 50)',6200,2022],['Patio furniture',2800,2023],['TVs (2)',1200,2022]],1),
           room('Kitchen equipment',[['Flat-top grill',3900,2022],['Reach-in coolers (2)',5600,2022],['Fryer',2100,2022]],1),
           room('Office',[['POS system',3200,2023]])]};
  return {sample:true, tab:'home', current:home.id, threat:'none', policyReads:3, policies:[hp,rp,bp], properties:[home,rental,biz,biz2]};
};

let S;
function load(){
  try{ const raw = localStorage.getItem('stormfile_v4'); S = raw ? JSON.parse(raw) : DEFAULT_STATE(); }
  catch(e){ S = DEFAULT_STATE(); }
  if(!S.properties || !S.properties.length || !S.policies) S = DEFAULT_STATE();
  S.properties.forEach(p=>{ p.upgrades = p.upgrades||[]; p.vehicles = p.vehicles||[]; p.claim = Object.assign(blankClaim(), p.claim); });
}
function save(){ try{ localStorage.setItem('stormfile_v4', JSON.stringify(S)); }catch(e){} }
const cur = () => S.properties.find(p=>p.id===S.current) || S.properties[0];
const polOf = P => (P && P.policyId) ? (S.policies.find(x=>x.id===P.policyId) || null) : null;
const usersOf = id => S.properties.filter(x=>x.policyId===id);
const polLabel = p => `${p.form} · ${p.number}`;

/* ---------- Calculations ---------- */
const itemToday = it => it.v * Math.pow(1+CPI, Math.max(0, YEAR - it.y));
function invTotals(P){
  let today=0, count=0;
  P.rooms.forEach(r => r.items.forEach(it => { today+=itemToday(it); count++; }));
  return {today,count};
}
const roomPhotos = r => r.photos + (r.photoData||[]).length;
const nowISO = () => new Date().toISOString();
const plural = (n, w) => n + ' ' + w + (n===1?'':'s');
const fmtWhen = iso => { if(!iso) return ''; const d = new Date(iso); if(isNaN(d)) return ''; return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) + ', ' + d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}); };
const fmtDay = iso => { if(!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); };
function logEvt(P, what){ P.history = P.history || []; P.history.push({at: nowISO(), what}); if(P.history.length > 400) P.history.splice(0, P.history.length - 400); }
const lockedAt = P => P.claim && P.claim.lockedAt;
const isAfterLock = (P, o) => !!(lockedAt(P) && o && o.addedAt && o.addedAt > P.claim.lockedAt);
function photoObj(x){ return typeof x === 'string' ? {src:x} : (x || {}); }
const safeImg = src => /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(String(src||'')) ? src : '';

/* Read the date a photo was taken from its EXIF data (JPEG only). */
async function exifDate(file){
  try{
    if(!/jpe?g/i.test(file.type||'') && !/\.jpe?g$/i.test(file.name||'')) return null;
    const buf = await file.slice(0, 256*1024).arrayBuffer(); const v = new DataView(buf);
    if(v.getUint16(0) !== 0xFFD8) return null;
    let off = 2;
    while(off < v.byteLength - 4){
      const marker = v.getUint16(off); const len = v.getUint16(off+2);
      if(marker === 0xFFE1 && v.getUint32(off+4) === 0x45786966){
        const t = off + 10, le = v.getUint16(t) === 0x4949;
        const u16 = o => v.getUint16(t+o, le), u32 = o => v.getUint32(t+o, le);
        const readStr = (o, n) => { let x=''; for(let k=0;k<n-1;k++){ const c=v.getUint8(t+o+k); if(!c) break; x+=String.fromCharCode(c);} return x; };
        const scan = (ifd, want) => { const n = u16(ifd); for(let k=0;k<n;k++){ const e = ifd+2+k*12; const tag = u16(e); if(want[tag]) return {tag, cnt:u32(e+4), val:u32(e+8)}; } return null; };
        const ifd0 = u32(4);
        let dt = null;
        const sub = scan(ifd0, {0x8769:1});
        if(sub){ const d = scan(sub.val, {0x9003:1, 0x9004:1}); if(d) dt = readStr(d.val, d.cnt); }
        if(!dt){ const d0 = scan(ifd0, {0x0132:1}); if(d0) dt = readStr(d0.val, d0.cnt); }
        if(!dt) return null;
        const m = dt.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/); if(!m) return null;
        return new Date(+m[1], +m[2]-1, +m[3], +m[4], +m[5]).toISOString();
      }
      if((marker & 0xFF00) !== 0xFF00) break;
      off += 2 + len;
    }
  }catch(e){}
  return null;
}
/* Ask the phone for its location once per batch of photos; never blocks for long. */
function getGPS(){
  return new Promise(res=>{
    if(!navigator.geolocation) return res(null);
    let done = false; const fin = x => { if(!done){ done = true; res(x); } };
    setTimeout(()=>fin(null), 9000);
    try{ navigator.geolocation.getCurrentPosition(p=>fin({lat:+p.coords.latitude.toFixed(4), lng:+p.coords.longitude.toFixed(4), acc:Math.round(p.coords.accuracy)}), ()=>fin(null), {enableHighAccuracy:false, timeout:8000, maximumAge:120000}); }catch(e){ fin(null); }
  });
}
const shrinkP = f => new Promise(r=>shrink(f, r));

/* ---------- Files on this phone (full-size photos, receipts) ---------- */
const DBNAME = 'stormfile', STORE = 'files';
let dbP = null;
function db(){
  if(!dbP) dbP = new Promise((res, rej)=>{
    try{ const rq = indexedDB.open(DBNAME, 1);
      rq.onupgradeneeded = () => { const d = rq.result; if(!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, {keyPath:'id'}); };
      rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); }catch(e){ rej(e); }
  });
  return dbP;
}
async function idbDo(mode, fn){ const d = await db(); return new Promise((res, rej)=>{ const tx = d.transaction(STORE, mode); const st = tx.objectStore(STORE); let out; const r = fn(st); if(r) r.onsuccess = () => { out = r.result; }; tx.oncomplete = () => res(out); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); }); }
const putFile = rec => idbDo('readwrite', st => st.put(rec));
const getFile = id => id ? idbDo('readonly', st => st.get(id)) : Promise.resolve(null);
const delFile = id => id ? idbDo('readwrite', st => st.delete(id)) : Promise.resolve();
const allFileIds = () => idbDo('readonly', st => st.getAllKeys());
const clearFiles = () => idbDo('readwrite', st => st.clear());
const fid = () => 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2,8);

/* Decode an image once; return a full-size copy for claims and a small preview for the screen. */
function loadImg(file){
  return new Promise((res, rej)=>{ const u = URL.createObjectURL(file); const img = new Image();
    img.onload = () => { URL.revokeObjectURL(u); res(img); }; img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('img')); }; img.src = u; });
}
function drawTo(img, max, type, q){
  const s = Math.min(1, max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round((img.naturalWidth||img.width)*s)); c.height = Math.max(1, Math.round((img.naturalHeight||img.height)*s));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return {canvas:c, w:c.width, h:c.height};
}
async function processPhoto(file){
  const img = await loadImg(file);
  const full = drawTo(img, 2048);
  const blob = await new Promise(r=>full.canvas.toBlob(r, 'image/jpeg', 0.86));
  if(!blob) throw new Error('blob');
  const thumb = drawTo(img, 320).canvas.toDataURL('image/jpeg', 0.72);
  return {blob, thumb, w:full.w, h:full.h};
}
/* Save a receipt or document as-is (images are trimmed to a sensible size). */
async function storeDoc(file){
  const id = fid();
  if(/^image\//.test(file.type||'') && !/heic|heif/i.test(file.type||'')){
    try{ const p = await processPhoto(file); await putFile({id, name:file.name||'receipt.jpg', type:'image/jpeg', blob:p.blob, w:p.w, h:p.h, at:nowISO()}); return {id, kind:'image', thumb:p.thumb}; }catch(e){}
  }
  await putFile({id, name:file.name||'document', type:file.type||'application/octet-stream', blob:file, at:nowISO()});
  return {id, kind:/pdf/i.test(file.type||'')?'pdf':'file'};
}
let viewerUrl = null;
async function openViewer(id, fallbackSrc, caption){
  let src = fallbackSrc || '', isPdf = false, name = '';
  try{ const rec = await getFile(id); if(rec && rec.blob){ if(viewerUrl) URL.revokeObjectURL(viewerUrl); viewerUrl = URL.createObjectURL(rec.blob); src = viewerUrl; isPdf = /pdf/i.test(rec.type||''); name = rec.name||''; } }catch(e){}
  if(!src) return toast('That file isn’t on this phone anymore.');
  const ov = document.createElement('div'); ov.className = 'overlay viewer'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true');
  ov.innerHTML = `<div class="viewer-box">${isPdf ? `<p class="small">PDF receipt: ${esc(name)}</p><a class="btn-like" href="${esc(src)}" target="_blank" rel="noopener">Open the PDF</a>` : `<img src="${esc(src)}" alt="${esc(caption||'Photo')}">`}
    ${caption?`<p class="small">${esc(caption)}</p>`:''}<button class="primary" data-closeviewer="1">Close</button></div>`;
  ov.addEventListener('click', e=>{ if(e.target===ov || e.target.closest('[data-closeviewer]')){ ov.remove(); if(viewerUrl){ URL.revokeObjectURL(viewerUrl); viewerUrl = null; } } });
  document.body.appendChild(ov);
}
async function addPhotos(P, files, target, label, source){
  const list = [...files]; if(!list.length) return;
  toast('Saving ' + list.length + ' photo' + (list.length>1?'s':'') + '…');
  const gps = await getGPS();
  let added = 0;
  for(const f of list){
    const taken = await exifDate(f);
    let ph = null;
    try{ ph = await processPhoto(f); }catch(e){}
    if(!ph){ const src = await shrinkP(f); if(!src) continue; target.push({src, addedAt: nowISO(), taken, gps, source}); added++; continue; }
    const id = fid();
    try{ await putFile({id, name:f.name||'photo.jpg', type:'image/jpeg', blob:ph.blob, w:ph.w, h:ph.h, at:nowISO()}); }
    catch(e){ toast('This phone is out of space for photos. Free up space, then try again.'); break; }
    target.push({id, src:ph.thumb, w:ph.w, h:ph.h, addedAt: nowISO(), taken, gps, source});
    added++;
  }
  if(!added) return toast('Those photos couldn’t be read. Try a JPG or a new photo.');
  logEvt(P, `Added ${added} photo${added>1?'s':''}: ${label}${source==='camera'?' (camera)':' (from library)'}${gps?'':' · no location'}${isAfterLock(P,{addedAt:nowISO()})?' · after claim started':''}`);
  S.sample = false; save(); render();
  toast(gps ? 'Saved with date, time and location.' : 'Saved with date and time. Location was not available.');
}
function photoGrid(P, list, alt){
  if(!list || !list.length) return '';
  return `<div class="thumbs">${list.map(x=>{ const o = photoObj(x); const after = isAfterLock(P,o);
    const when = o.taken ? 'Taken ' + fmtDay(o.taken) : o.addedAt ? 'Added ' + fmtDay(o.addedAt) : (o.date ? 'Added ' + esc(o.date) : 'Sample');
    if(!safeImg(o.src)) return '';
    return `<figure class="ph${after?' after':''}"><button class="phbtn" data-viewphoto="${esc(o.id||'')}" data-thumb="${esc(safeImg(o.src))}" data-cap="${esc(alt + (o.taken?' \u00B7 taken '+fmtDay(o.taken):o.addedAt?' \u00B7 added '+fmtWhen(o.addedAt):'') + (o.gps?' \u00B7 '+o.gps.lat+', '+o.gps.lng:''))}" aria-label="View ${esc(alt)} full size"><img src="${esc(safeImg(o.src))}" alt="${esc(alt)}"></button><figcaption>${when}${o.gps?' · GPS':''}${after?'<br><strong style="color:var(--amber)">After claim</strong>':''}</figcaption></figure>`; }).join('')}</div>`;
}
function photoButtons(attr, label){
  return `<div class="photo-btns">
    <label class="upload">Take ${label}<input type="file" ${attr} data-source="camera" accept="image/*" capture="environment" multiple></label>
    <label class="upload">From photo library<input type="file" ${attr} data-source="library" accept="image/*" multiple></label>
  </div>`;
}
const BIG = 1000;
function missingReceipts(P){
  const items = []; P.rooms.forEach(r=>r.items.forEach(it=>{ if(it.v>=BIG && !it.r) items.push(it.n); }));
  (P.upgrades||[]).forEach(u=>{ if(!u.r) items.push(u.n); });
  return items;
}
const VCOV = {
  'auto-comp':{t:'Auto policy with comprehensive',tone:'ok',why:'Flood, wind and falling trees are covered, minus your deductible.'},
  'auto-liab':{t:'Liability only',tone:'bad',why:'Storm and flood damage to the vehicle is not covered without comprehensive.'},
  'rv':{t:'RV or boat policy',tone:'ok',why:'Check that it includes comprehensive or "physical damage" coverage.'},
  'home-limited':{t:'Only on homeowners',tone:'warn',why:'Homeowners pays at most $1,500 for a boat and nothing for campers or vehicles.'},
  'none':{t:'Not insured',tone:'bad',why:'A storm loss here comes entirely out of pocket.'}
};
const VKINDS = ['Car or truck','Camper or RV','Boat','Golf cart or ATV','Trailer'];
const CATS = {home:['Lodging','Extra meals','Mileage','Pet boarding','Laundry','Storage','Other'],
  rental:['Lost rent','Repairs to prevent more damage','Other'],
  business:['Lost sales','Payroll','Temporary location','Equipment rental','Other']};
const roomDone = r => roomPhotos(r)>0 && r.items.length>=3;
function hurDedOf(pol, building){
  const d = pol.deductibles || {};
  if(d.hurricanePct) return building*d.hurricanePct/100;
  if(d.hurricaneFlat) return d.hurricaneFlat;
  return d.allPerils || 0;
}
function hurDedLabel(pol, cfg){
  const d = pol.deductibles || {};
  if(d.hurricanePct) return `Hurricane deductible (${d.hurricanePct}% of ${cfg.buildingName.toLowerCase()})`;
  if(d.hurricaneFlat) return 'Hurricane deductible (flat amount)';
  return 'Hurricane deductible (no separate one found, so the regular deductible applies)';
}
function calc(P){
  if(!polOf(P)) return null;
  const cfg = TYPES[P.type], pol = polOf(P), i = P.info;
  const lim = k => (pol.coverages.find(c=>c.key===k)||{limit:0}).limit;
  const building = lim(cfg.building), contents = lim(cfg.contents), loss = lim(cfg.loss);
  const rebuild = i.sqft * i.cps;
  const r = {building, contents, loss, rebuild,
    rebuildNext: rebuild*(1+i.localInfl/100), buildingNext: building*(1+pol.inflationGuardPct/100),
    hurDed: hurDedOf(pol, building), inv: invTotals(P), ratio: rebuild ? building/rebuild : 1};
  if(P.type==='rental'){ r.rentNeed = (i.rent||0)*12; }
  if(P.type==='business'){
    r.noCoins = !pol.coinsurancePct;
    r.coinsReq = rebuild*(pol.coinsurancePct||0)/100;
    r.coinsOK = building >= r.coinsReq;
    r.coinsFactor = r.coinsReq ? Math.min(1, building/r.coinsReq) : 1;
    r.examplePaid = Math.max(0, 100000*r.coinsFactor - pol.deductibles.allPerils);
    r.biNeed = (i.monthlyNeed||0)*(i.monthsClosed||0);
  }
  return r;
}
const buildingOK = (P,c) => !!c && (P.type==='business' ? c.coinsOK : c.ratio>=1);
function tasks(P){
  const c = calc(P), cfg = TYPES[P.type];
  const done = P.rooms.filter(roomDone).length;
  const list = [
    {title:'Upload the policy',why:'So StormFile can explain the coverage',done:!!polOf(P),w:20,go:'policy'},
    {title:'Decide on flood coverage',why:P.info.flood==='none'?'No flood policy. New ones take 30 days to start.':'Flood decision on file',done:P.info.flood!=='none',w:15,go:'policy'},
    {title:'Photograph the outside',why:'Roof and all four sides. This is your dated "before" proof.',done:P.exterior.length>=4,w:15,progress:`${P.exterior.length} of 4 photos`,go:'inventory'},
    {title:`Document every ${cfg.area}`,why:`At least one photo and 3 items per ${cfg.area}`,done:done===P.rooms.length,w:30,progress:`${done} of ${P.rooms.length}`,frac:P.rooms.length?done/P.rooms.length:0,go:'inventory'},
    {title:'Fix the building coverage gap',
     why: !c ? 'Upload the policy first' : P.type==='business'
       ? (c.noCoins?'No coinsurance rule found on the policy':c.coinsOK?`Meets the ${polOf(P).coinsurancePct}% coinsurance rule`:`Below the ${polOf(P).coinsurancePct}% coinsurance rule. Claims get cut.`)
       : (c.ratio>=1?'Coverage keeps up with rebuild cost':`Rebuilding costs ${fmt(c.rebuild-c.building)} more than the coverage`),
     done:buildingOK(P,c),w:10,go:'policy'}
  ];
  const miss = missingReceipts(P);
  list.push({title:'Save receipts for big-ticket items',why:miss.length?`${miss.length} item${miss.length>1?'s':''} over $1,000 or home upgrades without a receipt`:'Receipts on file for everything over $1,000',done:!miss.length,w:10,go:'inventory'});
  const badV = (P.vehicles||[]).filter(v=>VCOV[v.cov].tone!=='ok');
  if((P.vehicles||[]).length) list.push({title:'Insure vehicles and campers for storms',why:badV.length?`${badV.map(v=>v.n).join(', ')} not fully covered`:'All vehicles have storm coverage',done:!badV.length,w:5,go:'inventory'});
  if(P.type==='rental') list.push({title:'Get proof of tenant’s renter’s insurance',why:'Your policy doesn’t cover their belongings',done:!!P.info.renterProof,w:10,go:'policy'});
  if(P.type==='business'){
    list.push({title:'Upload a stock report',why:'Inventory changes weekly. A recent report proves what was on the shelves.',done:!!P.info.stockReport,w:10,go:'inventory'});
    list.push({title:'Check lost-income coverage',why:!c?'Upload the policy first':c.loss>=c.biNeed?'Covers your estimated closure':`${fmt(c.biNeed-c.loss)} short if closed ${P.info.monthsClosed} months`,done:!!c&&c.loss>=c.biNeed,w:10,go:'policy'});
  }
  return list;
}
function score(P){
  const ts = tasks(P), tot = ts.reduce((s,t)=>s+t.w,0);
  return Math.round(ts.reduce((s,t)=> s + (t.done ? t.w : (t.frac ? t.w*t.frac : 0)), 0) / tot * 100);
}
const tone = r => r>=1 ? 'ok' : r>=0.9 ? 'warn' : 'bad';
const toneVar = t => t==='ok'?'green':t==='warn'?'amber':'red';

/* ---------- Storm levels ---------- */
const LEVELS = {
  none:{name:'All clear',short:'All clear',cadence:'Weekly, only if tasks are unfinished',tone:'ok',msg:'No storms are forecast to reach this property.'},
  preseason:{name:'Pre-season (May)',short:'Pre-season',cadence:'A few times a week',tone:'info',msg:'Hurricane season starts June 1. This is the best time to finish your records.'},
  forecast:{name:'Storm forecast toward you',short:'Forecast',cadence:'Once a day',tone:'warn',msg:'Tropical Storm Delia (sample) is forecast to reach the Mississippi coast in about 5 days.'},
  watch:{name:'Hurricane watch',short:'Watch',cadence:'Twice a day',tone:'bad',msg:'Hurricane conditions are possible here within 48 hours.'},
  warning:{name:'Hurricane warning',short:'Warning',cadence:'Twice a day until landfall',tone:'bad',msg:'Hurricane conditions are expected within 36 hours. Finish the final checklist now.'},
  after:{name:'Storm has passed',short:'After',cadence:'Claim mode',tone:'info',msg:'The storm has moved inland. Only go back once officials say it is safe.'}
};
const active = () => ['forecast','watch','warning','after'].includes(S.threat);
const DEMO = () => !!S.sample && TEST; // the storm-alert demo (Tropical Storm Delia) is only in the shared test version
const levelFor = P => (DEMO() && active() && !P.inPath) ? 'none' : S.threat;
/* With your own properties StormFile doesn't track storms yet, so you choose what's happening and it shows the right checklist. */
const OWN_LEVELS = {
  none:{name:'Getting ready',short:'Getting ready',tone:'ok',msg:'Use the quiet months to finish your photos, receipts and policy details.'},
  preseason:{name:'Getting ready',short:'Getting ready',tone:'ok',msg:'Use the quiet months to finish your photos, receipts and policy details.'},
  forecast:{name:'Storm on the way',short:'Storm on the way',tone:'bad',msg:'Finish the final checklist. Follow official alerts and leave if you are told to evacuate.'},
  watch:{name:'Storm on the way',short:'Storm on the way',tone:'bad',msg:'Finish the final checklist. Follow official alerts and leave if you are told to evacuate.'},
  warning:{name:'Storm on the way',short:'Storm on the way',tone:'bad',msg:'Finish the final checklist. Follow official alerts and leave if you are told to evacuate.'},
  after:{name:'After the storm',short:'After the storm',tone:'info',msg:'Only go back once officials say it is safe. Photograph the damage before you clean up.'}
};
const lvOf = P => DEMO() ? LEVELS[levelFor(P)] : {...LEVELS[levelFor(P)], ...OWN_LEVELS[levelFor(P)]};

/* ---------- Views ---------- */
function ringSVG(pct){
  const r=46, c=2*Math.PI*r, off=c*(1-pct/100);
  const col = pct>=80?'var(--green)':pct>=50?'var(--amber)':'var(--red)';
  return `<svg class="ring" viewBox="0 0 108 108" role="img" aria-label="Storm readiness ${pct} of 100">
    <circle cx="54" cy="54" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="10"/>
    <circle cx="54" cy="54" r="${r}" fill="none" stroke="${col}" stroke-width="10" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 54 54)"/>
    <text x="54" y="58" text-anchor="middle" fill="var(--fg)" font-family="IBM Plex Mono, monospace" font-size="24" font-weight="500">${pct}</text>
    <text x="54" y="76" text-anchor="middle" fill="var(--muted)" font-family="IBM Plex Sans, sans-serif" font-size="10">of 100</text>
  </svg>`;
}

function viewHome(){
  const P = cur(), cfg = TYPES[P.type], sc = score(P), lv = lvOf(P), c = calc(P), ts = tasks(P);
  const next = ts.filter(t=>!t.done);
  return `
  <section class="stack">
    <p class="label">${esc(cfg.label)} · ${esc(P.address)}</p>
    <h1>${esc(P.name)}</h1>
    ${S.renaming?'':`<button class="src" data-act="rename" style="align-self:flex-start">Edit name and city</button>`}
  </section>
  ${S.renaming ? `<div class="card" style="border-color:var(--accent)">
    <h2>About this property</h2>
    <label class="field">Name<input id="rnName" value="${esc(P.name)}" placeholder="e.g. Our house"></label>
    <div class="grid2">
      <label class="field">Type<select id="rnType"><option value="home" ${P.type==='home'?'selected':''}>Home I live in</option><option value="rental" ${P.type==='rental'?'selected':''}>Rental I own</option><option value="business" ${P.type==='business'?'selected':''}>Business</option></select></label>
      <label class="field">City<input id="rnAddr" value="${esc(String(P.address==='Add your city'?'':P.address).replace(/,\s*[A-Za-z]{2}\s*$/,''))}" placeholder="Pass Christian" autocomplete="address-level2"></label>
    </div>
    <label class="field">State<select id="rnState">${stateOptions(stateOf(P))}</select></label>
    <p class="small muted">Your state sets which storm and fire seasons StormFile reminds you about.</p>
    <button class="primary" data-act="saveName">Save and add the policy</button>
  </div>` : ''}
  ${INSTALLED ? '' : `<div class="card" style="border-color:var(--accent)">
    <h2>Install StormFile on your phone</h2>
    ${INSTALL_EVT ? `<p class="small">Add StormFile to your home screen so it opens like any other app, full screen, even without signal.</p>
      <button class="primary" data-act="install">Install app</button>`
    : IS_IOS ? `<ol class="steps small"><li>Open this page in <strong>Safari</strong>. If you came from a text, email or Facebook, tap the compass icon or <strong>Open in Safari</strong> first.</li><li>Tap the <strong>\u22EF</strong> (three dots) next to the web address, then <strong>Share</strong>. On older iPhones, tap the <strong>Share</strong> button (square with an arrow) at the bottom.</li><li>Scroll down and tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li><li>Open StormFile from the new icon.</li></ol>
      <p class="small muted">Using Chrome? Tap the Share icon at the top right of the address bar, then Add to Home Screen.</p>`
    : `<ol class="steps small"><li>Open this in <strong>Chrome</strong>.</li><li>Tap the <strong>\u22EE</strong> menu, then <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li><li>Open StormFile from the new icon.</li></ol>`}
    ${IS_IOS && !S.sample ? `<div class="alert warn" style="background:var(--bg)"><p class="small"><strong>Important on iPhone:</strong> if StormFile isn\u2019t on your Home Screen, Safari can erase what you\u2019ve saved after about a week of not opening it. Add it to your Home Screen, and make a backup in Settings.</p></div>` : ''}
    <p class="small muted">Your information is saved only on this phone. Once it\u2019s installed, always open StormFile from the icon so your records stay in one place.</p>
  </div>`}
  ${(()=>{ if(S.sample) return ''; const list = seasonHeadsUp(P); if(!list.length) return '';
    const soon = list.find(h=>h.win.state==='soon'), lead = soon || list[0];
    return `<div class="card" style="border-color:${soon?'var(--amber)':'var(--red)'}">
      <div class="row"><h2>Seasons in ${esc(STATE_NAME[stateOf(P)])}</h2></div>
      ${list.map(h=>`<div class="row" style="flex-wrap:nowrap"><div class="stack" style="gap:0;min-width:0"><strong>${esc(h.name)}</strong><span class="small muted">${esc(mdLabel(h.start))} \u2013 ${esc(mdLabel(h.end))}</span></div>
        <span class="chip ${h.win.state==='now'?'bad':'warn'}">${h.win.state==='now'?'In season now':'Starts in '+plural(h.win.days,'day')}</span></div>`).join('')}
      <p class="small"><strong>Next step:</strong> ${esc(lead.prep[0])}.</p>
      <button data-go="storm">See the get-ready lists</button></div>`; })()}
  ${(()=>{ const due = backupDue(); return due ? `<div class="card" style="border-color:var(--amber)">
    <div class="row"><h2>Back up your records</h2><span class="chip warn">Recommended</span></div>
    <p class="small">${esc(due)} If a storm takes this phone, a backup is the only copy of your photos and receipts.</p>
    <button class="primary" data-go="settings">Make a backup</button></div>` : ''; })()}
  ${S.hideWelcome || !S.sample ? '' : `<div class="card" style="border-color:var(--amber);background:var(--amber-bg)">
    <div class="row"><span class="label" style="color:var(--amber)">${TEST?'Test version':'Sample data'}</span><button class="src" data-act="hideWelcome">Hide</button></div>
    <h2>${TEST?'Thanks for testing StormFile':'Take a look around'}</h2>
    <p class="small">StormFile helps Gulf Coast homeowners understand their insurance and get ready for a hurricane claim. Everything here is sample data. Nothing you enter leaves this phone.</p>
    <ol class="steps small">
      <li>Open <strong>Policy</strong> to see a sample policy explained in plain English.</li>
      <li>Tap the property name at the top to switch to the rental or the restaurant.</li>
      ${TEST ? `<li>On <strong>Storm</strong>, tap Forecast, Watch and Warning to see the alerts change.</li>
      <li>On <strong>Claim</strong>, set the situation to "Under a mandatory evacuation order."</li>` : `<li>On <strong>Storm</strong>, tap “Storm on the way” to see that checklist.</li>
      <li>On <strong>Claim</strong>, tap “Start a claim” to see the next step, deadlines, letters and the claim packet.</li>`}
    </ol>
    <button class="primary" data-go="feedback">Give feedback (2 minutes)</button>
  </div>`}
  ${S.ownStarted ? '' : `<div class="card" style="border-color:var(--accent)">
    <h2>Use your own home</h2>
    <p class="small">Set up your real home, rental or business. Have your declarations page handy. Everything you enter is saved only on this phone, never sent anywhere.</p>
    <button class="primary" data-act="startOwn">Start with my own property</button>
    <p class="small muted">This removes the sample properties. You can add more places later.</p>
  </div>`}
  ${!LIVE ? '' : `<div class="card" style="border-color:var(--accent)">
    <h2>Try it with a real policy</h2>
    <p class="small">Upload a photo or PDF of a homeowners, landlord or business <strong>declarations page</strong>. StormFile reads it and shows what\u2019s covered in plain English.</p>
    <label class="upload">Upload declarations page<input type="file" id="decUploadNew" accept="image/*,application/pdf"></label>
    <p class="small muted">Adds it as a new property. Read on your Claude account; the file isn\u2019t saved.</p>
  </div>`}
  <div class="card">
    <div class="score-wrap">
      ${ringSVG(sc)}
      <div class="stack" style="min-width:0">
        <span class="chip ${lv.tone==='info'?'info':lv.tone}" style="align-self:flex-start"><span class="dot"></span>${esc(lv.name)}</span>
        <p class="small">${sc>=80?'Records are in good shape.':sc>=50?'Partway there. A few tasks left before a storm.':'If a storm hit today, this claim would be hard to prove.'}</p>
        <button class="small-btn ghost" data-go="storm" style="align-self:flex-start">${DEMO()?'Storm alerts':'Storm prep'}</button>
      </div>
    </div>
  </div>
  ${c ? `<div class="grid2">
    <div class="card"><span class="label">${esc(cfg.buildingName)}</span>
      <span class="num" style="font-size:20px">${fmt(c.building)}</span>
      ${P.type==='business'
        ? `<span class="chip ${c.noCoins?'info':c.coinsOK?'ok':'bad'}">${c.noCoins?'No coinsurance rule found':c.coinsOK?'Meets '+polOf(P).coinsurancePct+'% rule':'Below '+polOf(P).coinsurancePct+'% rule'}</span>`
        : `<span class="chip ${tone(c.ratio)}">${c.ratio>=1?'Enough to rebuild':fmt(c.rebuild-c.building)+' short'}</span>`}</div>
    <div class="card"><span class="label">Hurricane deductible</span>
      <span class="num" style="font-size:20px">${fmt(c.hurDed)}</span>
      <span class="chip warn">Paid before insurance</span></div>
  </div>`:''}
  <div class="card">
    <div class="row"><h2>Next steps</h2><span class="muted small">${next.length} left</span></div>
    <div>
    ${ts.map(t=>`<div class="task">
      <span class="check ${t.done?'done':''}" aria-hidden="true">${t.done?'✓':''}</span>
      <div class="stack" style="gap:2px;flex:1;min-width:0">
        <strong>${esc(t.title)}</strong>
        <span class="small muted">${esc(t.why)}</span>
        ${t.progress&&!t.done?`<span class="small num">${esc(t.progress)}</span>`:''}
      </div>
      ${t.done?'':`<button class="small-btn" data-go="${t.go}">Go</button>`}
    </div>`).join('')}
    </div>
  </div>
  <div class="card">
    <div class="row"><h2>All properties</h2><span class="muted small">${S.properties.length}</span></div>
    <div class="stack">
    ${S.properties.map(p=>{ const s=score(p), l=levelFor(p); return `<button class="prop" data-prop="${p.id}" aria-current="${p.id===P.id}">
      <div class="stack" style="gap:0;min-width:0"><span class="typetag" data-es="${({home:'Casa',rental:'Alquiler',business:'Negocio'})[p.type]||''}">${esc(TYPES[p.type].label)}</span><strong>${esc(p.name)}</strong>
        <span class="small muted">${esc(p.address)}${DEMO()&&active()&&p.inPath?' · <span style="color:var(--red);font-weight:600">In storm path</span>':''}</span></div>
      <span class="sc" style="color:var(--${s>=80?'green':s>=50?'amber':'red'})">${s}</span></button>`;}).join('')}
    </div>
    <details class="add" ${S.openAdd?'open':''}><summary>+ Add a property</summary>
      <form class="stack" id="addProp">
        <label class="field">Name<input id="apName" placeholder="e.g. Camp house" required></label>
        <div class="grid2">
          <label class="field">Type<select id="apType"><option value="home">Home</option><option value="rental">Rental</option><option value="business">Business</option></select></label>
          <label class="field">City<input id="apAddr" placeholder="Biloxi" required></label>
        </div>
        <label class="field">State<select id="apState" required>${stateOptions(stateOf(P))}</select></label>
        <label class="field">Insurance policy
          <select id="apPolicy">
            <option value="">Its own policy (upload next)</option>
            ${S.policies.filter(po=>usersOf(po.id).length).map(po=>`<option value="${po.id}">Same policy as ${esc(usersOf(po.id).map(u=>u.name).join(', '))} (${esc(po.form)})</option>`).join('')}
          </select></label>
        <p class="small muted">Some owners have one policy for several places, like a business policy that lists two locations.</p>
        <button class="primary" type="submit">Add property</button>
      </form>
    </details>
  </div>
  <p class="foot">${S.sample?'Sample data · ':''}StormFile organizes your records. It isn’t insurance advice.</p>`;
}

function viewPolicy(){
  const P = cur(), cfg = TYPES[P.type], p = polOf(P), i = P.info;
  if(!p) return `
  <section class="stack"><p class="label">${esc(P.name)}</p><h1>Add the policy</h1></section>
  <div class="card">
    <p>Grab your <strong>declarations page</strong>. It\u2019s the 1\u20133 page summary your insurer emails or mails at every renewal, with your coverage amounts and deductibles.</p>
    <button class="primary" data-go="policyForm">Enter it by hand (about 3 minutes)</button>
    ${LIVE ? `<label class="upload">Or upload a photo or PDF for Claude to read<input type="file" id="polUpload" accept="image/*,application/pdf"></label>
    <p class="small muted">Claude reads it on your Claude account. The file itself isn\u2019t saved.</p>` : ''}
    <p class="small muted">Everything you enter stays on this phone.</p>
    <button class="ghost" data-act="demoPolicy">Use a sample ${esc(cfg.label.toLowerCase())} policy</button>
    ${S.policies.some(po=>usersOf(po.id).length)?`<label class="field">Or use a policy you already uploaded
      <select id="polSwitch"><option value="new" selected>Choose a policy</option>${S.policies.filter(po=>usersOf(po.id).length).map(po=>`<option value="${po.id}">${esc(po.form)} · ${esc(usersOf(po.id).map(u=>u.name).join(', '))}</option>`).join('')}</select></label>`:''}
  </div>`;
  const c = calc(P);
  return `
  <section class="stack">
    <p class="label">${esc(p.carrier)} · ${esc(p.form)}</p>
    <h1>What ${esc(P.name)} is covered for</h1>
  </section>
  <div class="alert warn" style="background:var(--surface)">
    <strong>Confirm anything that surprises you</strong>
    <p class="small">StormFile explains your policy. It doesn\u2019t decide coverage. If you think you have more coverage than this shows, or less, check with your agent or insurance company before you rely on it.</p>
    ${p.agent && p.agent!=='Not entered' && p.agent!=='Not shown' ? `<span class="small muted">Your agent: ${esc(p.agent)}</span>` : ''}
  </div>
  ${p.manual?`<div class="alert ok" style="background:var(--surface)"><strong>Built from what you entered</strong>
    <p class="small">Items marked \u201CCheck full policy\u201D come from your answers or are common gaps. Confirm them with your agent.</p>
    <button class="small-btn" data-go="policyForm" style="align-self:flex-start">Edit policy details</button></div>`:''}
  ${p.live?`<div class="alert ok" style="background:var(--surface)"><strong>Read from the uploaded declarations page</strong>
    <p class="small">Claude read this summary from ${esc(p.fileName||'the upload')}. Check it against the document. Items marked \u201CCheck full policy\u201D are common for this kind of policy but aren\u2019t shown on a declarations page.</p>
    ${p.notes?`<p class="small muted">${esc(p.notes)}</p>`:''}</div>`:''}

  <div class="card">
    <div class="grid2">
      <label class="field">Policy number<input id="polNum" value="${esc(p.number)}"></label>
      <label class="field">Renews<input id="polRenew" type="date" value="${esc(p.renewal)}"></label>
    </div>
    <div class="row small"><span class="muted">Agent</span><span>${esc(p.agent)}</span></div>
    <div class="row small"><span class="muted">Claims line</span><span class="num">${esc(p.claimPhone)}</span></div>
    ${(()=>{ const others = usersOf(p.id).filter(x=>x.id!==P.id); return others.length ? `<div class="alert ok" style="background:var(--bg)"><strong>This policy also covers ${esc(others.map(o=>o.name).join(', '))}</strong>
      <p class="small">One policy, ${others.length+1} locations. Changes you make here apply to all of them. Check the policy’s schedule of locations for the limit at each place.</p></div>` : ''; })()}
    <label class="field">Policy for this property
      <select id="polSwitch">
        ${S.policies.filter(po=>po.id===p.id || usersOf(po.id).length).map(po=>`<option value="${po.id}" ${po.id===p.id?'selected':''}>${esc(polLabel(po))}${po.id===p.id?'':' (also used by '+esc(usersOf(po.id).map(u=>u.name).join(', '))+')'}</option>`).join('')}
        <option value="new">Upload a separate policy</option>
      </select></label>
  </div>

  <div class="card">
    <h2>Covered</h2>
    <div>${p.coverages.map(cv=>`<div class="kv"><div class="k stack" style="gap:2px">
      <strong>${esc(cv.name)}</strong><span class="small muted">${esc(cv.plain)}</span>
      <button class="src" style="align-self:flex-start" data-src="${esc(cv.src)}">${esc(cv.src)}</button></div>
      <span class="v">${fmt(cv.limit)}</span></div>`).join('')}</div>
    ${p.covered.map(x=>`<div class="stack" style="gap:2px"><span class="chip ok" style="align-self:flex-start"><span class="dot"></span>${esc(x.title)}</span>
      <span class="small">${esc(x.plain)}</span><button class="src" style="align-self:flex-start" data-src="${esc(x.src)}">${esc(x.src)}</button></div>`).join('')}
  </div>

  <div class="card">
    <h2>Not covered</h2>
    ${p.notCovered.map(x=>`<div class="alert ${x.sev}">
      <div class="row"><strong>${esc(x.title)}</strong>${x.fromPage===false?'<span class="chip info">Check full policy</span>':''}</div>
      <p class="small">${esc(x.plain)}</p>
      ${x.quote?`<details><summary class="src" style="display:inline">${esc(x.src)}</summary><p class="quote" style="margin-top:6px">\u201C${esc(x.quote)}\u201D</p>${S.lang==='es'?'<p class="small muted">Quoted from your policy, which is in English.</p>':''}</details>`:`<span class="small muted">${esc(x.src)}</span>`}
    </div>`).join('')}
  </div>

  <div class="card">
    <h2>Out of pocket in a hurricane</h2>
    ${whatsLink('hurDed')}
    <div class="kv"><span class="k">${esc(hurDedLabel(p, cfg))}</span><span class="v">${fmt(c.hurDed)}</span></div>
    <div class="kv"><span class="k">Other claims deductible</span><span class="v">${fmt((p.deductibles||{}).allPerils||0)}</span></div>
    ${P.type==='business' && p.waitHours?`<div class="kv"><span class="k">Lost income during the first ${p.waitHours} hours</span><span class="v">${fmt(i.monthlyNeed*12/365*p.waitHours/24)}</span></div>`:''}
  </div>

  ${P.type==='business' ? `
  ${c.noCoins ? `<div class="card"><h2>Coinsurance rule</h2><p class="small">No coinsurance percentage was found on this document. Many business policies require 80\u201390%. Check the full policy or ask the agent.</p></div>` : `<div class="card">
    <div class="row"><h2>The ${p.coinsurancePct}% rule</h2><span class="chip ${c.coinsOK?'ok':'bad'}">${c.coinsOK?'You pass':'Penalty applies'}</span></div>
    <p class="small">This policy requires insuring the building for at least ${p.coinsurancePct}% of what it costs to rebuild. If you’re under, every claim gets cut by the same share, even small ones.</p>
    <div class="grid2">
      <label class="field">Square feet<input id="sqft" type="number" inputmode="numeric" value="${i.sqft}"></label>
      <label class="field">Local build cost per sq ft<input id="cps" type="number" inputmode="numeric" value="${i.cps}"></label>
    </div>
    <div class="kv"><span class="k">Cost to rebuild</span><span class="v">${fmt(c.rebuild)}</span></div>
    <div class="kv"><span class="k">Required (${p.coinsurancePct}%)</span><span class="v">${fmt(c.coinsReq)}</span></div>
    <div class="kv"><span class="k">Your building coverage</span><span class="v">${fmt(c.building)}</span></div>
    ${c.coinsOK?'':`<div class="alert bad"><strong>On a $100,000 claim, the insurer would pay about ${fmt(c.examplePaid)}</strong>
      <p class="small">You carry ${Math.round(c.coinsFactor*100)}% of the required amount, so they pay ${Math.round(c.coinsFactor*100)}% of the loss, minus the deductible. Raising building coverage to ${fmt(c.coinsReq)} removes the penalty.</p></div>`}
  </div>`}
  <div class="card">
    <div class="row"><h2>Lost income check</h2><span class="chip ${c.loss>=c.biNeed?'ok':'bad'}">${c.loss>=c.biNeed?'Covered':'Short'}</span></div>
    <div class="grid2">
      <label class="field">Monthly profit + bills you’d keep paying<input id="monthlyNeed" type="number" inputmode="numeric" value="${i.monthlyNeed}"></label>
      <label class="field">Months to reopen after a bad storm<input id="monthsClosed" type="number" inputmode="numeric" value="${i.monthsClosed}"></label>
    </div>
    <div class="kv"><span class="k">You’d need</span><span class="v">${fmt(c.biNeed)}</span></div>
    <div class="kv"><span class="k">Your lost income coverage</span><span class="v">${fmt(c.loss)}</span></div>
    <p class="small muted">After Katrina, many Gulf Coast businesses took 6–12 months to reopen. Payroll is often the biggest bill.</p>
  </div>` : `
  <div class="card">
    <div class="row"><h2>Enough to rebuild?</h2><span class="chip ${tone(c.ratio)}">${c.ratio>=1?'Covered':'Underinsured'}</span></div>
    <div class="grid2">
      <label class="field">Square feet<input id="sqft" type="number" inputmode="numeric" value="${i.sqft}"></label>
      <label class="field">Local build cost per sq ft<input id="cps" type="number" inputmode="numeric" value="${i.cps}"></label>
    </div>
    <div class="kv"><span class="k">Cost to rebuild today</span><span class="v">${fmt(c.rebuild)}</span></div>
    <div class="kv"><span class="k">${esc(cfg.buildingName)}</span><span class="v">${fmt(c.building)}</span></div>
    <div class="meter" aria-hidden="true"><i style="width:${Math.min(100,c.ratio*100/1.3).toFixed(1)}%;background:var(--${toneVar(tone(c.ratio))})"></i></div>
    <p class="small">${c.ratio>=1?`Coverage is ${fmt(c.building-c.rebuild)} above the estimated rebuild cost.`:`Rebuilding would cost about <strong>${fmt(c.rebuild-c.building)}</strong> more than the policy pays. Worth asking your agent about.`}</p>
  </div>`}

  ${P.type==='rental' ? `
  <div class="card">
    <div class="row"><h2>Lost rent</h2><span class="chip ${c.loss>=c.rentNeed?'ok':'warn'}">${c.loss>=c.rentNeed?'12 months covered':Math.floor(c.loss/(i.rent||1))+' months covered'}</span></div>
    <label class="field">Monthly rent<input id="rent" type="number" inputmode="numeric" value="${i.rent}"></label>
    <div class="kv"><span class="k">A year of rent</span><span class="v">${fmt(c.rentNeed)}</span></div>
    <div class="kv"><span class="k">Lost rent coverage</span><span class="v">${fmt(c.loss)}</span></div>
    <p class="small muted">Major hurricane repairs often take 6–12 months because contractors are booked up.</p>
  </div>
  <div class="card">
    <h2>Tenant</h2>
    <div class="row small"><span class="muted">Contact</span><span>${esc(i.tenant)}</span></div>
    <label class="field">Renter’s insurance proof
      <select id="renterProof"><option value="" ${!i.renterProof?'selected':''}>Not on file</option><option value="yes" ${i.renterProof?'selected':''}>On file</option></select></label>
    ${i.renterProof?'':`<div class="alert warn"><p class="small">Your landlord policy doesn’t cover the tenant’s belongings. Ask for a copy of their renter’s insurance before hurricane season.</p></div>`}
  </div>` : ''}

  ${p.renewal ? `<div class="card">
    <div class="row"><h2>Renewal reminders</h2><span class="chip info">Renews ${esc(fmtDay(p.renewal+'T12:00:00'))}</span></div>
    <p class="small">Get a reminder 45 days before your policy renews, so there\u2019s time to check your coverage and talk to your agent, plus one on the renewal date to add the new declarations page.</p>
    <button class="primary" data-act="calRenewal">Add renewal reminders to my calendar</button>
  </div>` : ''}
  <div class="card">
    <h2>Inflation check</h2>
    <p class="small muted">Rechecked automatically 45 days before renewal on ${esc(p.renewal)}.</p>
    <label class="field">Local construction cost rise per year (%)<input id="infl" type="number" step="0.1" value="${i.localInfl}"></label>
    <div class="tblwrap"><table>
      <tr><td></td><td class="label" style="text-align:right">At renewal</td></tr>
      <tr><td>Rebuild cost (+${i.localInfl}%)</td><td>${fmt(c.rebuildNext)}</td></tr>
      <tr><td>${esc(cfg.buildingName)} with inflation guard (+${p.inflationGuardPct}%)</td><td>${fmt(c.buildingNext)}</td></tr>
      <tr><td><strong>Gap</strong></td><td><strong>${c.buildingNext>=c.rebuildNext?'None':fmt(c.rebuildNext-c.buildingNext)}</strong></td></tr>
    </table></div>
    ${i.localInfl>p.inflationGuardPct?`<div class="alert warn"><p class="small">${p.inflationGuardPct?`The policy raises coverage ${p.inflationGuardPct}% a year`:'The policy has no inflation guard'}, but local building costs are rising ${i.localInfl}%. The gap grows each year.</p></div>`:''}
  </div>

  <div class="card">
    <h2>${esc(cfg.contentsName)}</h2>
    <div class="kv"><span class="k">Logged so far (today’s prices)</span><span class="v">${fmt(c.inv.today)}</span></div>
    <div class="kv"><span class="k">Coverage</span><span class="v">${fmt(c.contents)}</span></div>
    <p class="small muted">${c.inv.count} items logged${P.type==='business'?'. Stock on hand comes from your stock report.':'.'}</p>
  </div>

  <div class="card">
    <h2>Flood policy</h2>
    <label class="field">Status
      <select id="flood">
        <option value="none" ${i.flood==='none'?'selected':''}>No flood policy</option>
        <option value="nfip" ${i.flood==='nfip'?'selected':''}>NFIP flood policy</option>
        <option value="private" ${i.flood==='private'?'selected':''}>Private flood policy</option>
        <option value="declined" ${i.flood==='declined'?'selected':''}>Decided not to buy</option>
      </select></label>
    ${i.flood==='none'?`<div class="alert bad"><strong>New flood policies take 30 days to start</strong><p class="small">Buying one after a storm forms is too late.${P.type==='business'?' Federal business flood coverage caps at $500,000 building and $500,000 contents, so ask about private excess flood too.':' Ask your agent before hurricane season.'}</p></div>`:''}
  </div>

  <div class="card">
    <h3>Update the policy</h3>
    ${LIVE ? `<p class="small muted">Got a renewal? Upload the new declarations page and StormFile rereads it. Policy reads on this account: <span class="num">${S.policyReads}</span>.</p>
    <label class="upload">Upload new declarations page (photo or PDF)<input type="file" id="polUpload" accept="image/*,application/pdf"></label>`
    : `<p class="small muted">Got a renewal? Change the amounts to match your new declarations page.</p>
    <button class="small-btn" data-go="policyForm" style="align-self:flex-start">Edit policy details</button>`}
  </div>
  <p class="foot">StormFile explains policies in plain words. It is not insurance advice. Confirm coverage with your licensed agent.</p>`;
}

function viewInventory(){
  const P = cur(), cfg = TYPES[P.type], inv = invTotals(P);
  const done = P.rooms.filter(roomDone).length;
  return `
  <section class="stack"><p class="label">${esc(P.name)}</p><h1>${esc(cfg.roomsTitle)}</h1></section>
  ${lockedAt(P)?`<div class="lockbar"><strong>Before-storm record locked</strong><span class="muted">${fmtWhen(lockedAt(P))}. You can still add things; they\u2019re marked \u201Cadded after claim.\u201D</span></div>`:''}
  <div class="card">
    <div class="row"><span class="label">Logged value today</span><span class="num" style="font-size:20px">${fmt(inv.today)}</span></div>
    <div class="meter"><i style="width:${P.rooms.length?(done/P.rooms.length*100).toFixed(0):0}%;background:var(--accent)"></i></div>
    <span class="small muted">${done} of ${P.rooms.length} ${cfg.area}s complete · ${inv.count} items</span>
    ${(()=>{ const m = missingReceipts(P); return m.length ? `<div class="alert warn" style="background:var(--bg)"><strong>${m.length} big-ticket item${m.length>1?'s':''} without a receipt</strong><p class="small">${esc(m.join(', '))}. Snap a photo of the receipt, or find it in your email. Adjusters often question high-value items with no proof.</p></div>` : `<span class="chip ok" style="align-self:flex-start">Receipts on file for everything over $1,000</span>`; })()}
  </div>

  ${P.type==='business'?`<div class="card">
    <div class="row"><h2>Stock report</h2><span class="chip ${P.info.stockReport?'ok':'warn'}">${P.info.stockReport?'On file':'Missing'}</span></div>
    <p class="small muted">Upload an inventory report from your POS or bookkeeping software instead of photographing every item. Update it monthly and before a storm.</p>
    ${P.info.stockReport?`<p class="small">${esc(P.info.stockReport)}</p>`:''}
    <label class="upload">Upload stock report<input type="file" id="stockUpload" accept=".csv,.xlsx,.pdf,image/*"></label>
  </div>`:''}

  ${P.type==='rental'?`<div class="alert warn" style="background:var(--surface)"><p class="small">Only log what <strong>you</strong> own at the rental. The tenant’s furniture and belongings are on their renter’s insurance.</p></div>`:''}

  <div class="card">
    <div class="row"><h2>Outside of the building</h2><span class="chip ${P.exterior.length>=4?'ok':'warn'}">${P.exterior.length} of 4</span></div>
    <p class="small muted">Roof, front, back, both sides. Each photo is saved with the date, time and location to prove the condition before a storm.</p>
    ${photoGrid(P, P.exterior, 'Exterior photo')}
    ${photoButtons('data-extphoto="1"', 'exterior photos')}
  </div>

  ${(()=>{ const ups = P.upgrades||[], po = polOf(P);
    const roof = ups.find(u=>/roof/i.test(u.n)), age = roof ? YEAR-roof.y : null, rc = po && po.roofRCYears;
    return `<div class="card">
    <div class="row"><h2>${P.type==='business'?'Building upgrades':'Home upgrades & big repairs'}</h2><span class="chip ${ups.some(u=>!u.r)?'warn':'ok'}">${ups.filter(u=>u.r).length} of ${ups.length} receipts</span></div>
    <p class="small muted">A new roof, AC, windows or remodel raises what it costs to rebuild. Adjusters usually ask how old the roof is first.</p>
    ${roof && rc ? `<div class="alert ${age<rc?'ok':'warn'}" style="background:var(--bg)"><p class="small">Roof is ${age} years old. ${age<rc?`This policy pays full replacement for roofs under ${rc} years old.`:`Roofs over ${rc} years old are paid at used value on this policy.`}</p></div>` : ''}
    ${ups.length?`<div class="tblwrap"><table>${ups.map((u,i)=>`<tr><td>${esc(u.n)}<br><span class="small muted">${u.y}</span> ${u.r?(u.rid?`<button class="chip ok chipbtn" data-viewfile="${esc(u.rid)}" data-cap="${esc('Receipt: '+u.n)}">Receipt \u2713 View</button>`:`<span class="chip ok">Receipt \u2713</span>`):`<label class="src" style="cursor:pointer;position:relative;color:var(--amber);font-weight:600">Add receipt<input type="file" data-upreceipt="${i}" accept="image/*,application/pdf" style="position:absolute;width:1px;height:1px;opacity:0"></label>`}</td><td>${fmt(u.v)}<br><button class="src" data-delup="${i}">Remove</button></td></tr>`).join('')}</table></div>`:'<p class="small muted">Nothing added yet.</p>'}
    <form class="stack" id="addUpgrade">
      <label class="field">Upgrade or repair<input id="upN" placeholder="e.g. Roof replacement" required></label>
      <div class="grid2">
        <label class="field">Cost<input id="upV" type="number" inputmode="numeric" placeholder="14000" required></label>
        <label class="field">Year done<input id="upY" type="number" inputmode="numeric" value="${YEAR}"></label>
      </div>
      <button type="submit">Add upgrade</button>
    </form>
  </div>`; })()}

  <div class="stack">
  ${P.rooms.map(r=>{
    const tot = r.items.reduce((s,it)=>s+itemToday(it),0);
    const ok = roomDone(r);
    return `<div class="room">
      <button class="room-head" data-room="${r.id}" aria-expanded="${!!r.open}">
        <div class="stack" style="gap:2px;min-width:0"><strong>${esc(r.name)}</strong>
          <span class="small muted">${roomPhotos(r)} photos · ${r.items.length} items · <span class="num">${fmt(tot)}</span></span></div>
        <span class="chip ${ok?'ok':'warn'}">${ok?'Done':'To do'}</span>
      </button>
      ${r.open?`<div class="room-body">
        ${photoGrid(P, r.photoData, r.name + ' photo')}
        ${r.photos?`<span class="small muted">${Number(r.photos)||0} sample photo${r.photos>1?'s':''} on file</span>`:''}
        ${photoButtons('data-roomphoto="' + r.id + '"', 'photos')}
        ${r.items.length?`<div class="tblwrap"><table>${r.items.map((it,i)=>`<tr><td>${esc(it.n)}<br><span class="small muted">Bought ${it.y} for ${fmt(it.v)}${it.addedAt?' \u00B7 logged '+fmtDay(it.addedAt):''}</span>${isAfterLock(P,it)?' <span class="chip warn">Added after claim</span>':''}<br>${it.r?(it.rid?`<button class="chip ok chipbtn" data-viewfile="${esc(it.rid)}" data-cap="${esc('Receipt: '+it.n)}">Receipt \u2713 View</button>`:`<span class="chip ok">Receipt \u2713</span>`):`<label class="src" style="cursor:pointer;position:relative${it.v>=BIG?';color:var(--amber);font-weight:600':''}">${it.v>=BIG?'Big-ticket: add receipt':'Add receipt'}<input type="file" data-itemreceipt="${r.id}:${i}" accept="image/*,application/pdf" style="position:absolute;width:1px;height:1px;opacity:0"></label>`}</td><td>${fmt(itemToday(it))}<br><button class="src" data-delitem="${r.id}:${i}">Remove</button></td></tr>`).join('')}</table></div>`:'<p class="small muted">No items yet. Start with the most expensive things.</p>'}
        <form class="stack" data-additem="${r.id}">
          <label class="field">Item<input name="n" id="n-${r.id}" placeholder="${esc(cfg.itemHint)}" required></label>
          <div class="grid2">
            <label class="field">Price paid<input name="v" id="v-${r.id}" type="number" inputmode="numeric" placeholder="800" required></label>
            <label class="field">Year bought<input name="y" id="y-${r.id}" type="number" inputmode="numeric" value="${YEAR}"></label>
          </div>
          <button class="primary" type="submit">Add item</button>
        </form>
      </div>`:''}
    </div>`;}).join('')}
  </div>
  <form class="row" id="addRoom" style="flex-wrap:nowrap">
    <input id="roomName" placeholder="Add a${cfg.area==='area'?'n area':' room'}" required>
    <button type="submit">Add</button>
  </form>

  <div class="card">
    <h2>Vehicles, campers & boats</h2>
    <p class="small muted">Homeowners and business property policies don\u2019t cover these. Each needs its own policy with comprehensive coverage to pay for flood or wind damage.</p>
    ${(P.vehicles||[]).length?`<div class="stack">${P.vehicles.map((v,i)=>{ const c=VCOV[v.cov]; return `<div class="stack" style="gap:4px;padding-block:8px;border-bottom:1px solid var(--line)">
      <div class="row"><div class="stack" style="gap:0;min-width:0"><strong>${esc(v.n)}</strong><span class="small muted">${esc(v.kind)}</span></div><span class="chip ${c.tone}">${esc(c.t)}</span></div>
      <span class="small">${esc(c.why)}</span>
      <div class="row" style="flex-wrap:nowrap"><select data-vcov="${i}" aria-label="Coverage for ${esc(v.n)}">${Object.entries(VCOV).map(([k,o])=>`<option value="${k}" ${k===v.cov?'selected':''}>${esc(o.t)}</option>`).join('')}</select><button class="small-btn ghost" data-delveh="${i}">Remove</button></div>
    </div>`; }).join('')}</div>`:'<p class="small muted">No vehicles added.</p>'}
    <form class="stack" id="addVehicle">
      <label class="field">Vehicle<input id="vhN" placeholder="e.g. 2020 Honda Pilot" required></label>
      <div class="grid2">
        <label class="field">Type<select id="vhK">${VKINDS.map(k=>`<option>${k}</option>`).join('')}</select></label>
        <label class="field">Insured by<select id="vhC">${Object.entries(VCOV).map(([k,o])=>`<option value="${k}">${esc(o.t)}</option>`).join('')}</select></label>
      </div>
      <button type="submit">Add vehicle</button>
    </form>
    <p class="small muted">Before a storm, photograph each one with the VIN and odometer, then move it to higher ground. It\u2019s the one thing you can usually save.</p>
  </div>`;
}

function checklist(P, level){
  const cfg = TYPES[P.type], c = calc(P);
  const m = P.manual || (P.manual = {});
  const missing = P.rooms.filter(r=>!roomDone(r)).map(r=>r.name);
  const mk = (id,t,d) => ({id,t,d,manual:true,done:!!m[id]});
  if(level==='after') return [
    mk('safe','Wait until officials say it’s safe','Watch for downed power lines and standing water'),
    mk('dmg','Photograph damage before cleaning up','Match the angles of your "before" photos'),
    mk('tarp','Prevent more damage','Tarp the roof and keep receipts for supplies'),
    {t:'Open the claim',d:'Call the claims line, then add the claim number in the Claim tab',done:!!P.claim.number}
  ];
  const base = [
    {t:`Finish missing ${cfg.area}s`, d: missing.length? missing.join(', ') : 'Everything documented', done:!missing.length},
    {t:'Photograph roof and all four sides', d:`${P.exterior.length} of 4 exterior photos`, done:P.exterior.length>=4},
    {t:'Know the hurricane deductible', d: c?`${fmt(c.hurDed)} before insurance pays`:'Upload the policy', done:!!c}
  ];
  if(P.type==='business') base.push({t:'Upload this month’s stock report',d:P.info.stockReport||'Not on file',done:!!P.info.stockReport});
  if(level!=='watch' && level!=='warning') return base;
  const fin = [{t:'Save the claims phone number', d: polOf(P)? polOf(P).claimPhone : 'Upload the policy first', done:!!polOf(P)}];
  if((P.vehicles||[]).length) fin.push(mk('veh','Move vehicles, campers and boats to higher ground','Photograph each one first, with the VIN and odometer'));
  if(P.type==='home') fin.push(mk('bag','Put documents in a waterproof bag','IDs, deed, policy, medications list'), mk('night','Take "night before" photos','Quick video walkthrough of every room'));
  if(P.type==='rental') fin.push(mk('tenant','Text the tenant the storm plan','Shutters, where to send damage photos, your phone number'), mk('night','Ask the tenant for "night before" photos','Or drive by and take exterior photos yourself'));
  if(P.type==='business') fin.push(mk('backup','Back up sales records and payroll','You’ll need 12 months of records for a lost income claim'), mk('equip','Raise or move equipment off the floor','Unplug and lift what you can'), mk('night','Take "night before" photos','Shelves, coolers and equipment'));
  return base.concat(fin);
}

function notifications(P, level){
  const n = P.name;
  const map = {
    none:[['Weekly',`${n}: take 5 minutes and finish one ${TYPES[P.type].area}. You’re at ${score(P)}/100.`]],
    preseason:[['Mon',`Hurricane season starts June 1. ${n} has ${tasks(P).filter(t=>!t.done).length} tasks left.`],['Thu','Flood policies take 30 days to start.']],
    forecast:[['8:00 AM',`Tropical Storm Delia may reach ${n} in 5 days. Finish your photos today.`]],
    watch:[['8:00 AM',`Hurricane watch for ${n}. ${checklist(P,'watch').filter(t=>!t.done).length} checklist items left.`],['6:00 PM','Photograph the roof while it’s still daylight.']],
    warning:[['8:00 AM',`Hurricane warning for ${n}. Final checklist now.`],['6:00 PM','Last chance for "night before" photos. Stay safe.']],
    after:[['9:00 AM',`The storm has passed ${n}. When it’s safe, start documenting damage.`]]
  };
  return map[level];
}

function coneSVG(P, level){
  const near = level==='watch'||level==='warning', show = level==='forecast'||near;
  const label = TYPES[P.type].mapLabel;
  if(active() && !P.inPath) return `<svg class="cone" viewBox="0 0 400 140" role="img" aria-label="This property is outside the storm path">
    <rect width="400" height="140" fill="var(--surface-2)"/>
    <text x="200" y="64" text-anchor="middle" fill="var(--fg)" font-size="15" font-weight="600" font-family="IBM Plex Sans, sans-serif">${esc(P.address)} is outside Delia’s path</text>
    <text x="200" y="88" text-anchor="middle" fill="var(--muted)" font-size="12" font-family="IBM Plex Sans, sans-serif">Alerts for this property stay weekly</text></svg>`;
  return `<svg class="cone" viewBox="0 0 400 200" role="img" aria-label="Sample storm forecast map">
    <rect width="400" height="200" fill="var(--surface-2)"/>
    <path d="M0 40 L120 46 L170 60 L210 52 L260 64 L320 50 L400 58 L400 0 L0 0 Z" fill="var(--line)"/>
    <text x="20" y="28" fill="var(--muted)" font-size="11" font-family="IBM Plex Sans, sans-serif">${esc(P.address)}</text>
    <circle cx="190" cy="56" r="5" fill="var(--accent)"/>
    <text x="198" y="78" fill="var(--fg)" font-size="11" font-family="IBM Plex Sans, sans-serif" font-weight="600">${esc(label)}</text>
    ${show?`<path d="M${near?'150 190':'60 195'} L${near?'230 190':'260 195'} L${near?'205 64':'230 70'} L${near?'175 64':'150 70'} Z" fill="var(--amber)" opacity=".28"/>
    <path d="M${near?'190 185':'160 190'} L190 70" stroke="var(--amber)" stroke-width="2" stroke-dasharray="5 5"/>
    <circle cx="${near?190:160}" cy="${near?150:180}" r="9" fill="var(--red)"/>
    <text x="${near?204:174}" y="${near?154:184}" fill="var(--fg)" font-size="11" font-family="IBM Plex Sans, sans-serif" font-weight="600">Delia (sample)</text>`:
    `<text x="200" y="140" text-anchor="middle" fill="var(--muted)" font-size="13" font-family="IBM Plex Sans, sans-serif">${level==='after'?'Storm moved inland':'No active storms nearby'}</text>`}
  </svg>`;
}

function viewStorm(){
  const P = cur(), level = levelFor(P), lv = lvOf(P), list = checklist(P, level), demo = DEMO();
  const inPath = S.properties.filter(p=>p.inPath);
  return `
  <section class="stack"><p class="label">${esc(P.name)} · ${demo?'storm alerts':'storm prep'}</p><h1>${esc(lv.name)}</h1></section>
  <div class="alert ${lv.tone==='info'?'ok':lv.tone}" style="background:var(--surface)"><p>${esc(demo && active() && !P.inPath ? 'Delia isn’t headed toward this property.' : lv.msg)}</p>
    ${demo?`<span class="small muted">Alerts: <strong>${esc(lv.cadence)}</strong></span>`:''}</div>
  ${demo ? coneSVG(P, level) : `<div class="card">
    <h2>What’s happening?</h2>
    <p class="small">StormFile doesn’t track storms on its own yet. Pick what’s happening and it shows the right checklist. For forecasts and warnings, follow the National Hurricane Center and your local officials.</p>
    <div class="levels">${[['none','Getting ready'],['watch','Storm on the way'],['after','Storm has passed']].map(([k,t])=>`<button data-level="${k}" aria-pressed="${OWN_LEVELS[S.threat].name===OWN_LEVELS[k].name}">${t}</button>`).join('')}</div>
    <a class="btn-like" href="https://www.hurricanes.gov" target="_blank" rel="noopener noreferrer">Open the National Hurricane Center</a>
  </div>`}
  ${demo && active() && S.properties.length>1 ? `<div class="card"><h3>Your properties in the path</h3>
    <div class="stack">${S.properties.map(p=>`<button class="prop" data-prop="${p.id}" aria-current="${p.id===P.id}">
      <div class="stack" style="gap:0;min-width:0"><strong>${esc(p.name)}</strong><span class="small muted">${esc(p.address)}</span></div>
      <span class="chip ${p.inPath?'bad':'ok'}">${p.inPath?LEVELS[S.threat].short:'Not in path'}</span></button>`).join('')}</div>
    <p class="small muted">${inPath.length} of ${S.properties.length} properties get daily alerts.</p></div>`:''}
  <div class="card">
    <h2>${level==='after'?'After the storm':level==='watch'||level==='warning'?'Final checklist':'Before the storm'}</h2>
    <div>${list.map(t=>`<div class="task">
      ${t.manual?`<button class="check ${t.done?'done':''}" data-manual="${t.id}" aria-pressed="${t.done}" aria-label="Mark ${esc(t.t)} done" style="min-height:0;padding:0">${t.done?'✓':''}</button>`:`<span class="check ${t.done?'done':''}" aria-hidden="true">${t.done?'✓':''}</span>`}
      <div class="stack" style="gap:2px;min-width:0"><strong>${esc(t.t)}</strong><span class="small muted">${esc(t.d)}</span></div></div>`).join('')}</div>
    ${level==='after'?`<button class="primary" data-go="claim">Start claim mode</button>`:''}
  </div>
  ${!demo?'':`<div class="card">
    <h3>What your phone would show</h3>
    ${notifications(P, level).map(([t,m])=>`<div class="notif"><span class="ic">S</span><div class="stack" style="gap:0;min-width:0"><span class="small muted">StormFile · ${esc(t)}</span><span class="small">${esc(m)}</span></div></div>`).join('')}
  </div>`}
  ${(()=>{ const st = stateOf(P), list = stateSeasons(P);
    if(!st) return `<div class="card" style="border-color:var(--amber)"><h2>Seasons where this property is</h2>
      <p class="small">Pick the state for ${esc(P.name)} to see its hurricane, wildfire, tornado and winter seasons and get reminders before each one.</p>
      <label class="field">State<select id="pState">${stateOptions('')}</select></label></div>`;
    return `<div class="card">
      <div class="row"><h2>Seasons in ${esc(STATE_NAME[st])}</h2><button class="src" data-act="changeState">Change state</button></div>
      ${list.length ? list.map(h=>{ const w = h.win; const badge = w && w.state==='now' ? '<span class="chip bad">In season now</span>' : w && w.days<=30 ? `<span class="chip warn">Starts in ${plural(w.days,'day')}</span>` : `<span class="chip info">${esc(mdLabel(h.start))}</span>`;
        return `<details class="season"><summary><div class="row" style="flex-wrap:nowrap"><div class="stack" style="gap:0;min-width:0"><strong>${esc(h.name)}</strong><span class="small muted">${esc(mdLabel(h.start))} \u2013 ${esc(mdLabel(h.end))}${h.official?' (official)':' (typical)'}</span></div>${badge}</div></summary>
          <p class="small">${esc(h.peak)}</p><p class="label" style="margin-top:4px">Get ready</p><ul class="small" style="margin:4px 0 0;padding-left:18px">${h.prep.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>`; }).join('')
        : '<p class="small">No major storm or fire season is listed for this state. You can still add reminders to review your records each year.</p>'}
      <p class="small muted">Hurricane dates are the official season. Other seasons are the usual times of highest risk and change from year to year. Always follow local weather alerts and evacuation orders.</p>
      ${list.length?`<button class="primary" data-act="calSeason">Add yearly reminders to my calendar</button>
      <p class="small muted">Adds a \u201Cget ready\u201D reminder 3 weeks before each season and one on the day it starts, repeating every year.</p>`:''}
    </div>`; })()}
  <button class="card linkcard" data-go="resources"><div class="stack" style="gap:2px;min-width:0"><strong>Emergency and disaster help</strong><span class="small muted">Your state’s emergency agency, FEMA and the National Hurricane Center</span></div><span aria-hidden="true">›</span></button>
  ${!demo?'':`<div class="card">
    <h3>Try each alert level</h3>
    <p class="small muted">This sample shows how storm alerts could work. In it, the house and the restaurant are in Delia’s path and the Baton Rouge rental is not.</p>
    <div class="levels">${Object.entries(LEVELS).map(([k,v])=>`<button data-level="${k}" aria-pressed="${S.threat===k}">${esc(v.short)}</button>`).join('')}</div>
  </div>`}`;
}

function packetBody(P, cfg, inv){ return `
    <p class="small">One PDF with everything the adjuster needs: your policy summary, dated photos, ${esc(cfg.contentsName.toLowerCase())} list with receipts, ${esc(cfg.lossName.toLowerCase())}, call log and record history. It\u2019s made on this phone; nothing is uploaded.</p>
    <div class="kv"><span class="k">${esc(cfg.contentsName)}<br><span class="small muted">${plural(inv.count,'item')} at today\u2019s prices</span></span><span class="v">${fmt(inv.today)}</span></div>
    <div class="kv"><span class="k">Photos<br><span class="small muted">${P.exterior.length + P.rooms.reduce((s,r)=>s+roomPhotos(r),0)} dated photos</span></span><span class="v">${lockedAt(P)?'Locked':'Not locked'}</span></div>
    <fieldset class="stack" style="border:0;padding:0;margin:0;gap:6px"><legend class="label" style="margin-bottom:4px">Include</legend>
      <label class="check-row"><input type="checkbox" id="pk-policy" checked> Policy summary</label>
      <label class="check-row"><input type="checkbox" id="pk-photos" checked> Photos</label>
      <label class="check-row"><input type="checkbox" id="pk-receipts" checked> Receipt images</label>
      <label class="check-row"><input type="checkbox" id="pk-history" checked> Record history</label>
    </fieldset>
    ${(S.me||{}).name?'':'<p class="small muted">Tip: add your name and phone in Settings so they print on the packet.</p>'}
    <button class="primary" data-act="packet">Make the claim packet (PDF)</button>
`; }
/* A section that opens with a tap; remembers whether it was left open. */
function sec(id, title, status, body, opts){ opts = opts || {}; S.open = S.open || {};
  const open = (S.open[id] != null ? S.open[id] : !!opts.open);
  return `<details class="card sec" data-sec="${id}" id="sec-${id}" ${open?'open':''}${opts.style?` style="${opts.style}"`:''}>
    <summary><span class="sec-t"><span class="sec-h">${title}</span>${status?`<span class="sec-s">${status}</span>`:''}</span><span class="sec-c" aria-hidden="true"></span></summary>
    <div class="stack sec-b">${body}</div></details>`; }
const claimStarted = P => !!(P.claim.started || P.claim.number || P.claim.dateOfLoss || lockedAt(P) || P.claim.receipts.length || P.claim.log.length);
function claimNextStep(P){ const cl = P.claim, p = polOf(P);
  if(!cl.number) return {t:`Report the damage to your insurance company${p&&p.claimPhone?` at ${p.claimPhone}`:''}. Write the claim number they give you below.`, tel:p&&p.claimPhone};
  if(!cl.dateOfLoss) return {t:'Enter the date of loss (the day the storm hit).'};
  if(!lockedAt(P)) return {t:'Lock your before-storm record, so the adjuster can see your list was made before the damage.', act:'lockRecord', btn:'Lock my before-storm record'};
  if(!cl.adjuster) return {t:'When an adjuster is assigned, add their name, phone and email below.'};
  return {t:'Write down every call, keep every receipt, and make the claim packet when the adjuster asks for your list.'};
}
function viewClaim(){
  const P = cur(), cfg = TYPES[P.type], cl = P.claim, p = polOf(P), c = calc(P);
  const spent = cl.receipts.reduce((s,r)=>s+r.amt,0);
  const limit = c ? c.loss : 0;
  const inv = invTotals(P);
  if(!claimStarted(P)) return `
  <section class="stack"><p class="label">${esc(P.name)} · claim mode</p><h1>The claim</h1></section>
  <div class="card" style="border-color:var(--accent)">
    <h2>Had storm damage?</h2>
    <p class="small">Start here. StormFile walks you through it one step at a time:</p>
    <ol class="small steps"><li>Report it and save the claim number</li><li>Lock your before-storm record</li><li>Write down every call and keep every receipt</li><li>Send the adjuster one PDF with everything</li></ol>
    <button class="primary" data-act="startClaim">Start a claim</button>
    ${p&&p.claimPhone?`<p class="small muted">Your insurance company’s claims line: ${telLink(p.claimPhone)}</p>`:''}
  </div>
  ${sec('packet', 'Claim packet', '', packetBody(P, cfg, inv))}
  <button class="card linkcard" data-go="resources"><div class="stack" style="gap:2px;min-width:0"><strong>Claim stuck? Get help${stateOf(P)?' in '+esc(STATE_NAME[stateOf(P)]):''}</strong><span class="small muted">Your state insurance department, FEMA, SBA and flood insurance contacts</span></div><span aria-hidden="true">›</span></button>`;
  const nx = claimNextStep(P);
  return `
  <section class="stack"><p class="label">${esc(P.name)} · claim mode</p><h1>The claim</h1></section>
  <div class="alert info nextstep"><p class="label">Your next step</p><p>${esc(nx.t)}</p>${nx.tel?`<a class="btn-like" href="${esc(telHref(nx.tel))}">Call ${esc(nx.tel)}</a>`:''}${nx.act?`<button class="primary" data-act="${nx.act}">${esc(nx.btn)}</button>`:''}</div>
  <div class="card">
    <h2>Claim details</h2>
    <div class="grid2">
      <label class="field">Claim number<input id="clNum" value="${esc(cl.number)}" placeholder="From the insurer"></label>
      <label class="field">Date of loss<input id="clDate" type="date" value="${esc(cl.dateOfLoss)}"></label>
      <label class="field">Adjuster name<input id="clAdj" value="${esc(cl.adjuster)}"></label>
      <label class="field">Adjuster phone<input id="clAdjPh" type="tel" value="${esc(cl.adjPhone)}"></label>
      <label class="field">Adjuster email<input id="clAdjEmail" type="email" value="${esc(cl.adjEmail||'')}"></label>
    </div>
    ${p?`<div class="row small"><span class="muted">Policy</span><span class="num">${esc(p.number)}</span></div>`:''}
    ${cl.number?`<span class="chip ok" style="align-self:flex-start"><span class="dot"></span>Claim saved</span>`:`<p class="small muted">Call ${p?esc(p.claimPhone):'the insurer'} to open a claim, then enter the number here.</p>`}
    <div class="whatsrow">${whatsLink('lossDate')}${whatsLink('adjuster')}</div>
  </div>

  ${deadlinesCard(P)}
  ${sec('lock', 'Before-storm record', `<span class="chip ${lockedAt(P)?'ok':'warn'}">${lockedAt(P)?'Locked':'Not locked'}</span>`, `${lockedAt(P) ? (()=>{
      const items = P.rooms.flatMap(r=>r.items), photos = P.exterior.concat(P.rooms.flatMap(r=>(r.photoData||[]).map(photoObj)));
      const iAfter = items.filter(x=>isAfterLock(P,x)).length, pAfter = photos.filter(x=>isAfterLock(P,x)).length;
      return `<p class="small">Locked ${fmtWhen(lockedAt(P))}. Everything logged before then is your before-storm record and can\u2019t be removed.</p>
      <div class="kv"><span class="k">Before the storm</span><span class="v">${plural(items.length-iAfter,'item')} \u00B7 ${plural(photos.length-pAfter + P.rooms.reduce((s,r)=>s+r.photos,0),'photo')}</span></div>
      <div class="kv"><span class="k">Added after the claim started</span><span class="v">${plural(iAfter,'item')} \u00B7 ${plural(pAfter,'photo')}</span></div>`; })()
    : `<p class="small">When you file a claim, lock your record. Everything you logged before the storm is frozen, and anything added later is clearly marked. It shows the adjuster your list wasn\u2019t built after the damage.</p>
      <button class="primary" data-act="lockRecord">Lock my before-storm record</button>
      <p class="small muted">Enter the date of loss above first. This can\u2019t be undone.</p>`}`)}
  ${sec('packet', 'Claim packet', `<span class="sec-n">${plural(inv.count,'item')}</span>`, packetBody(P, cfg, inv))}

  ${P.type==='home' ? (()=>{ const ale = p && p.ale, st = cl.status;
    const days = cl.orderDate ? Math.max(0, Math.floor((Date.now() - new Date(cl.orderDate+'T00:00').getTime())/86400000)) + 1 : 0;
    return sec('away', 'Out of your home?', st==='home'?'<span class="chip ok">At home</span>':st==='evac'?'<span class="chip warn">Evacuated</span>':'<span class="chip bad">Not livable</span>', `
    <label class="field">Your situation
      <select id="clStatus">
        <option value="home" ${st==='home'?'selected':''}>Living at home</option>
        <option value="evac" ${st==='evac'?'selected':''}>Under a mandatory evacuation order</option>
        <option value="unlivable" ${st==='unlivable'?'selected':''}>Home is not livable</option>
      </select></label>
    ${st==='home'?`<p class="small muted">If you\u2019re ordered to evacuate or the house can\u2019t be lived in, change this and start saving every receipt. This is called additional living expense.</p>`:''}
    ${whatsLink('ale')}
    ${st==='evac'?`<label class="field">Date of the evacuation order<input id="clOrder" type="date" value="${esc(cl.orderDate)}"></label>
      ${ale?`<div class="alert warn" style="background:var(--bg)"><strong>What this policy says</strong><p class="small">${esc(ale.civilRule)}</p>
        <p class="small">An order issued before the storm, with no damage nearby yet, is often not covered. Some insurers pay anyway, so keep every receipt.</p>
        <button class="src" style="align-self:flex-start" data-src="${esc(ale.src)}">${esc(ale.src)}</button></div>
      ${days?`<div class="row small"><span>Day <span class="num">${days}</span> of ${ale.civilWeeks*7} under the evacuation rule</span><span class="num">${Math.max(0, ale.civilWeeks*7-days)} days left</span></div>
      <div class="meter"><i style="width:${Math.min(100,days/(ale.civilWeeks*7)*100).toFixed(0)}%;background:var(--amber)"></i></div>`:''}
      <p class="small muted">If the house is damaged and can\u2019t be lived in when the order lifts, switch to "Home is not livable." Coverage continues past 2 weeks.</p>`:'<p class="small muted">Upload the policy to see what it says about evacuations.</p>'}`:''}
    ${st==='unlivable'?`<div class="alert ok" style="background:var(--bg)"><p class="small">Pays reasonable extra costs while the home is repaired, up to ${fmt(limit)}${ale?` or ${ale.months} months`:''}. That includes a hotel or rental house, extra meal costs, mileage, laundry, pet boarding and storage.</p>${ale?`<button class="src" style="align-self:flex-start" data-src="${esc(ale.src)}">${esc(ale.src)}</button>`:''}</div>`:''}
    <p class="small muted"><strong>Only the extra cost counts.</strong> If you normally spend $600 a month on groceries and spend $1,100 eating out, the extra $500 is what you claim.</p>`, {open: st!=='home'}); })() : ''}

  ${sec('costs', esc(cfg.lossName), `<span class="sec-n num">${limit?`${fmt(spent)} / ${fmt(limit)}`:fmt(spent)}</span>`, `
    <div class="meter"><i style="width:${limit?Math.min(100,spent/limit*100).toFixed(1):0}%;background:var(--accent)"></i></div>
    ${cl.receipts.length ? `<div class="tblwrap"><table>
      ${Object.entries(cl.receipts.reduce((a,r)=>{ a[r.cat||'Other']=(a[r.cat||'Other']||0)+r.amt; return a; },{})).map(([k,v])=>`<tr><td><strong>${esc(k)}</strong></td><td>${fmt(v)}</td></tr>`).join('')}
    </table></div>
    <details><summary class="src" style="display:inline">See all ${cl.receipts.length} expenses</summary><div class="tblwrap" style="margin-top:6px"><table>${cl.receipts.slice().reverse().map(r=>`<tr><td>${esc(r.what)}<br><span class="small muted">${esc(r.cat||'Other')} \u00B7 ${esc(r.date)}</span> ${r.r?(r.rid?`<button class="chip ok chipbtn" data-viewfile="${esc(r.rid)}" data-cap="${esc('Receipt: '+r.what)}">Receipt \u2713 View</button>`:'<span class="chip ok">Receipt \u2713</span>'):'<span class="chip warn">No receipt</span>'}</td><td>${fmt(r.amt)}</td></tr>`).join('')}</table></div></details>`
    : `<p class="small muted">${esc(cfg.lossHelp)}</p>`}
    <form class="stack" id="addReceipt">
      <div class="grid2">
        <label class="field">Type<select id="rcCat">${CATS[P.type].map(c=>`<option>${c}</option>`).join('')}</select></label>
        <label class="field">${P.type==='home'?'Amount, or miles for Mileage':'Amount'}<input id="rcAmt" type="number" inputmode="decimal" placeholder="240" required></label>
      </div>
      <label class="field">What it was for<input id="rcWhat" placeholder="${P.type==='rental'?'November rent':P.type==='business'?'Payroll, week 1':'Hotel in Jackson, 2 nights'}" required></label>
      <label class="upload">Attach receipt photo (optional)<input type="file" id="rcFile" accept="image/*,application/pdf" capture="environment"></label>
      <span class="small muted" id="rcFileName"></span>
      <button class="primary" type="submit">Add expense</button>
      ${P.type==='home'?`<label class="field">Mileage rate per mile<input id="clRate" type="number" step="0.01" value="${cl.mileRate}"></label>`:''}
    </form>`)}

  ${sec('log', 'Call & email log', `<span class="sec-n">${plural(cl.log.length,'entry').replace('entrys','entries')}</span>`, `
    ${cl.log.length?`<div>${cl.log.slice().reverse().map(l=>`<div class="kv"><span class="k">${esc(l.note)}</span><span class="small muted">${esc(l.date)}</span></div>`).join('')}</div>`:'<p class="small muted">Write down every call: who you spoke with and what they promised.</p>'}
    <form class="stack" id="addLog">
      <label class="field">Note<input id="logNote" placeholder="Spoke with adjuster, inspection Tuesday" required></label>
      <button type="submit">Add to log</button>
    </form>`)}

  ${sec('letters', 'Letters', '', `
    <p class="small">Put it in writing. Pick a letter, check the wording, then copy it or open it in your email.</p>
    <label class="field">Letter<select id="ltKind">${Object.entries(LETTERS).filter(([k,v])=>!v.only||v.only===P.type).map(([k,v])=>`<option value="${k}" ${S.ltKind===k?'selected':''}>${esc(v.label)}</option>`).join('')}</select></label>
    <label class="field">${({followup:'What was discussed (leave blank to use your last log entry)', supplement:'What you found', complaint:'What\u2019s gone wrong with your claim'})[S.ltKind||'followup']||'Anything to add (optional)'}<textarea id="ltExtra">${esc(S.ltExtra||'')}</textarea></label>
    <textarea id="ltOut" readonly style="min-height:220px;font-size:13px;background:var(--surface-2)">${esc(letterText(P, LETTERS[S.ltKind]&&(!LETTERS[S.ltKind].only||LETTERS[S.ltKind].only===P.type)?S.ltKind:'followup', S.ltExtra||''))}</textarea>
    <div class="grid2">
      <button data-act="ltCopy">Copy letter</button>
      <a class="btn-like" id="ltMail" href="${esc(ltMailto(P))}">Open in email</a>
    </div>
    ${S.ltKind==='complaint' ? (()=>{ const st = stateOf(P), ins = RES_INS[st]; return ins ? `<p class="small">Send this to the ${esc(ins[0])}: paste it into their online complaint form${ins[3]?` (${extLink(ins[3],'open the form')})`:''}, or call ${telLink(ins[2])}. Attach your claim packet if the form allows it.</p>` : '<p class="small">Pick the property\u2019s state on the Help screen to see where to send this.</p>'; })() : (cl.adjEmail?'':'<p class="small muted">Add the adjuster\u2019s email above to address it automatically.</p>')}
    <p class="small muted">These are templates to help you write clearly. They aren\u2019t legal advice. Read and edit before you send.</p>
    ${S.lang==='es' ? '<p class="small">Letters go to your insurance company, so they\u2019re written in English.</p>' : ''}`)}

  ${sec('follow', 'Follow-up reminder', '', `
    <p class="small">Insurance companies give dates: when to expect a call, a check or an inspection. Put the date on your calendar so it doesn\u2019t slip.</p>
    <div class="grid2">
      <label class="field">Date<input id="fuDate" type="date" value="${esc(S.fuDate||'')}"></label>
      <label class="field">What to check<input id="fuNote" value="${esc(S.fuNote||'')}" placeholder="Adjuster said estimate by this date"></label>
    </div>
    <button class="primary" data-act="calFollow">Add to my calendar</button>`)}

  ${sec('history', 'Record history', `<span class="sec-n">${plural((P.history||[]).length,'change')}</span>`, `
    <p class="small muted">Every addition, removal and receipt is saved with the date and time. It can\u2019t be edited.</p>
    ${(P.history||[]).length ? `<div class="hist">${(P.history||[]).slice().reverse().slice(0, S.histAll?400:12).map(h=>`<div><span>${esc(h.what)}</span><span>${fmtWhen(h.at)}</span></div>`).join('')}</div>
      ${(P.history||[]).length>12?`<button class="src" data-act="showAllHist" style="align-self:flex-start">${S.histAll?'Show fewer':'Show all'}</button>`:''}`
      : '<p class="small muted">Nothing yet. Changes appear here as you add items, photos and receipts.</p>'}`)}

  ${sec('stalled', 'Claim stalled or underpaid?', '', `    <p class="small">A licensed public adjuster works for you, not the insurer. They usually charge a share of the claim. Your state insurance department can tell you whether one is licensed, and can step in if your insurer stops answering.${P.type==='business'?' Business claims, especially lost income, are where they help most.':''}</p>
    ${whatsLink('pa')}
    <button data-go="resources">Get help in your state</button>`)}`;
}

/* ---------- Enter a policy by hand ---------- */
const PF_LIMITS = {
  home:[['A','Coverage A – Dwelling','Your house','Pays to rebuild the house itself'],['B','Coverage B – Other structures','Other structures','Fence, shed, detached garage'],['C','Coverage C – Personal property','Your stuff','Furniture, clothes, electronics'],['D','Coverage D – Loss of use','Hotel and food','Extra living costs if you can’t stay home'],['E','Coverage E – Personal liability','Liability','If someone is hurt on your property and sues'],['F','Coverage F – Medical payments','Medical payments','Small medical bills for guests hurt on your property']],
  rental:[['A','Coverage A – Dwelling','The rental house','Pays to rebuild the house'],['B','Coverage B – Other structures','Other structures','Fence, shed, carport'],['C','Coverage C – Personal property','Your property there','Appliances and items you own at the rental'],['D','Coverage D – Fair rental value','Lost rent','Rent you lose while it’s being repaired'],['L','Liability','Liability','If a tenant or guest is hurt and sues']],
  business:[['BLD','Building','Building','Pays to repair or rebuild the building'],['BPP','Business personal property','Equipment and inventory','Equipment, furniture, stock, computers'],['BI','Business income','Lost income','Lost profit and ongoing bills while closed for repairs'],['EE','Extra expense','Extra expense','Costs to reopen faster'],['L','Liability','Liability','If a customer is hurt and sues']]
};
const YNU = [['yes','Yes'],['no','No'],['unsure','Not sure']];
function pfSelect(id, label, opts, val, help){
  return `<label class="field">${esc(label)}<select id="pf-${id}">${opts.map(([v,t])=>`<option value="${v}" ${v===val?'selected':''}>${esc(t)}</option>`).join('')}</select>${help?`<span class="small muted">${esc(help)}</span>`:''}</label>`;
}
function viewPolicyForm(){
  const P = cur(), cfg = TYPES[P.type], old = polOf(P), a = (old && old.manual && old.answers) || {};
  const v = k => esc(a[k] == null ? '' : a[k]);
  return `
  <section class="stack"><p class="label">${esc(P.name)}</p><h1>Enter your policy</h1>
    <p class="small muted">Start with the 5 numbers below. Everything else is optional.</p></section>
  <form class="stack" id="policyForm" style="gap:16px">
  <div class="card">
    <h2>The 5 numbers that matter</h2>
    <p class="small muted">All five are usually on page 1 of your ${whats('dec','declarations page')}.</p>
    <label class="field"><span>1. Insurance company</span><input id="pf-carrier" value="${v('carrier')}" placeholder="Name at the top of the page"></label>
    <label class="field"><span>2. Policy number</span><input id="pf-number" value="${v('number')}"></label>
    <label class="field"><span>3. ${esc(cfg.buildingName)} (${esc((PF_LIMITS[P.type].find(x=>x[0]===cfg.building)||[])[1]||'')})</span><input id="pf-lim-${cfg.building}" type="number" inputmode="numeric" placeholder="$" value="${v('lim'+cfg.building)}"></label>
    ${pfSelect('windType','4. Hurricane or wind deductible',[['pct','A percentage (like 2% or 5%)'],['flat','A dollar amount'],['same','Same as the regular deductible'],['excluded','Wind is excluded from this policy'],['unsure','Not sure']], a.windType||'pct','Look for “Windstorm or Hail” or “Hurricane” near the deductibles. “Exclude Wind: Not Applicable” means wind IS covered.')}
    <label class="field" id="pf-windAmtWrap" ${['pct','flat'].includes(a.windType||'pct')?'':'hidden'}>Percentage or dollar amount<input id="pf-windAmt" type="number" inputmode="decimal" placeholder="5 for 5%, or 2500" value="${v('windAmt')}"></label>
    ${whatsLink('hurDed')}
    <label class="field"><span>5. Renewal date</span><input id="pf-renewal" type="date" value="${v('renewal')}"></label>
    <p class="small muted">Leave anything blank you can\u2019t find. You can fill it in later.</p>
  </div>
  <details class="card sec" data-sec="pf-more" id="sec-pf-more" ${(S.open||{})['pf-more'] || ['claimPhone','agent','form','allPerils','roofYear'].some(k=>a[k]) ? 'open' : ''}>
    <summary><span class="sec-t"><span class="sec-h">More details (optional)</span><span class="sec-s sec-n">Makes the coverage check more complete</span></span><span class="sec-c" aria-hidden="true"></span></summary>
    <div class="stack sec-b">
    <div class="grid2">
      <label class="field">Claims phone<input id="pf-claimPhone" type="tel" value="${v('claimPhone')}"></label>
      <label class="field">Policy type<input id="pf-form" value="${v('form')}" placeholder="${P.type==='business'?'e.g. BOP':P.type==='rental'?'e.g. DP-3':'e.g. HO-3 or HO-5'}"></label>
    </div>
    <label class="field">Agent name and phone<input id="pf-agent" value="${v('agent')}"></label>
    <h3>Other coverage amounts</h3>
    <p class="small muted">Usually in a box called \u201cCoverage Information\u201d or \u201cLimits of Liability.\u201d</p>
    <div class="grid2">${PF_LIMITS[P.type].filter(([k])=>k!==cfg.building).map(([k,lab])=>`<label class="field">${esc(lab)}<input id="pf-lim-${k}" type="number" inputmode="numeric" placeholder="$" value="${v('lim'+k)}"></label>`).join('')}</div>
    <label class="field">Regular deductible (\u201cAll other perils\u201d)<input id="pf-allPerils" type="number" inputmode="numeric" placeholder="$" value="${v('allPerils')}"></label>
    <h3>Other coverage</h3>
    ${pfSelect('flood','Do you have a separate flood policy?',[['nfip','Yes, NFIP (FEMA) flood'],['private','Yes, private flood'],['no','No'],['unsure','Not sure']], a.flood||'unsure','Homeowners and business policies almost never cover flood or storm surge.')}
    ${P.type!=='business'?pfSelect('ordinance','Ordinance or law coverage?',YNU,a.ordinance||'unsure','Pays extra to rebuild to current code. “No Coverage” on the page means no.'):''}
    ${P.type!=='business'?whatsLink('ordinance'):''}
    ${P.type==='home'?pfSelect('contentsRC','How is your stuff paid?',[['rc','Replacement cost (price of new)'],['acv','Actual cash value (used value)'],['unsure','Not sure']],a.contentsRC||'unsure','“Personal Property Replacement Cost: Not Applicable” usually means used value.'):''}
    ${P.type==='home'?whatsLink('rcacv'):''}
    ${pfSelect('waterBackup','Water or sewer backup coverage?',YNU,a.waterBackup||'unsure')}
    ${P.type!=='business'?pfSelect('mold','Mold coverage?',YNU,a.mold||'unsure'):''}
    ${P.type==='business'?`<div class="grid2">
      <label class="field">Coinsurance %<input id="pf-coins" type="number" inputmode="numeric" placeholder="80" value="${v('coins')}"></label>
      <label class="field">Business income waiting period (hours)<input id="pf-wait" type="number" inputmode="numeric" placeholder="72" value="${v('wait')}"></label></div>${whatsLink('coins')}`:''}
      <h3>About the property</h3>
    <p class="small muted">Some declarations pages list these. Used for the “enough to rebuild?” check.</p>
    <div class="grid2">
      <label class="field">Square feet<input id="pf-sqft" type="number" inputmode="numeric" value="${esc(P.info.sqft||'')}"></label>
      <label class="field">Year the roof was replaced<input id="pf-roofYear" type="number" inputmode="numeric" value="${v('roofYear')}"></label>
    </div>
      </div>
  </details>
  <button class="primary" type="submit">Show what I’m covered for</button>
  <button class="ghost" type="button" data-go="policy">Cancel</button>
  </form>`;
}
function buildManualPolicy(P, a){
  const cfg = TYPES[P.type], money = n => '$' + Math.round(n).toLocaleString('en-US');
  const coverages = PF_LIMITS[P.type].filter(([k])=>a['lim'+k]>0).map(([k,lab,name,plain])=>({key:k,name,plain,limit:a['lim'+k],src:'You entered: '+lab}));
  const building = a['lim'+cfg.building] || 0;
  const d = {allPerils:a.allPerils||0, hurricanePct:null, hurricaneFlat:null};
  if(a.windType==='pct' && a.windAmt) d.hurricanePct = a.windAmt;
  if(a.windType==='flat' && a.windAmt) d.hurricaneFlat = a.windAmt;
  const covered = [], notCovered = [];
  const you = 'From what you entered';
  if(a.windType==='excluded') notCovered.push({sev:'bad',title:'Wind and hail',plain:'Wind is excluded. Hurricane wind damage needs a separate wind policy, such as through the Mississippi Windstorm Underwriting Association.',src:you,quote:'',fromPage:true});
  else if(a.windType==='pct' && a.windAmt) covered.push({title:'Wind and hail',plain:`Covered. You pay the first ${a.windAmt}% of ${cfg.buildingName.toLowerCase()}${building?` (${money(building*a.windAmt/100)})`:''} of wind or hail damage.`,src:you});
  else if(a.windType==='flat' && a.windAmt) covered.push({title:'Wind and hail',plain:`Covered. You pay the first ${money(a.windAmt)} of wind or hail damage.`,src:you});
  else if(a.windType==='same') covered.push({title:'Wind and hail',plain:'Covered with your regular deductible.',src:you});
  else notCovered.push({sev:'warn',title:'Wind coverage not confirmed',plain:'Check whether wind is covered and what the wind deductible is. On the Gulf Coast it’s often separate.',src:'Check full policy',quote:'',fromPage:false});
  if(a.flood==='no') notCovered.push({sev:'bad',title:'Flood or storm surge',plain:'No flood policy. Rising water isn’t covered, even when a hurricane causes it. New flood policies usually take 30 days to start.',src:you,quote:'',fromPage:true});
  else if(a.flood==='unsure') notCovered.push({sev:'warn',title:'Flood or storm surge',plain:'This kind of policy almost never covers flood. Check whether you have a separate flood policy.',src:'Check full policy',quote:'',fromPage:false});
  else covered.push({title:'Flood',plain:'Covered by a separate flood policy. Keep its policy number in your records too.',src:you});
  if(a.ordinance==='no') notCovered.push({sev:'warn',title:'Code upgrades when rebuilding',plain:'No ordinance or law coverage. If the county requires a raised foundation or new wiring, you pay the extra cost.',src:you,quote:'',fromPage:true});
  if(a.contentsRC==='acv') notCovered.push({sev:'warn',title:'Your stuff is paid at used value',plain:'Belongings are paid at what they’re worth today, not the price of new. Ask about a replacement cost endorsement.',src:you,quote:'',fromPage:true});
  if(a.waterBackup==='no') notCovered.push({sev:'warn',title:'Sewer or drain backup',plain:'Water backing up through drains isn’t covered. An add-on usually costs $50–$100 a year.',src:you,quote:'',fromPage:true});
  if(a.mold==='no') notCovered.push({sev:'warn',title:'Mold',plain:'Mold cleanup isn’t covered, even after a covered leak. Dry out water damage fast.',src:you,quote:'',fromPage:true});
  if(P.type==='rental') notCovered.push({sev:'warn',title:'Your tenant’s belongings',plain:'Landlord policies don’t cover the tenant’s things. Ask them for proof of renter’s insurance.',src:'Check full policy',quote:'',fromPage:false});
  notCovered.push({sev:'warn',title:'Cars, campers and boats',plain:'Vehicles aren’t covered by a property policy. They need auto or RV coverage with comprehensive.',src:'Check full policy',quote:'',fromPage:false});
  if(a.roofYear){ const age = YEAR - a.roofYear; covered.push({title:'Roof',plain:`Roof is about ${age} year${age===1?'':'s'} old. Newer roofs are usually paid at full replacement cost; ask your agent where your policy draws the line.`,src:you}); }
  return {id:uid(), manual:true, answers:a, carrier:a.carrier||'Your insurer', form:a.form||cfg.label+' policy', number:a.number||'Not entered', renewal:a.renewal||'',
    agent:a.agent||'Not entered', claimPhone:a.claimPhone||'Not entered', coverages, deductibles:d, inflationGuardPct:0,
    coinsurancePct:a.coins||null, waitHours:a.wait||null, ale:null, covered, notCovered, notes:''};
}

/* ---------- Tester feedback ---------- */
const FB_Q = [
  {id:'who',q:'Which describes you best?',opts:['Homeowner','Renter','Landlord','Business owner','Insurance agent','Adjuster or contractor','Other']},
  {id:'rating',q:'How useful would this be to you?',opts:['1 Not useful','2','3','4','5 Very useful']},
  {id:'best',q:'Which part was most useful?',opts:['Policy in plain English','Do I have enough?','Rooms and receipts','Storm alerts','Claim and living expenses','Vehicles and campers','Multiple properties']},
  {id:'pay',q:'Would you pay for it?',opts:['No, only if free','$2–3 a month','$5 a month','$40 a year','More, if my agent gave it to me']},
  {id:'flood',q:'Before today, did you know if your policy covers flood?',opts:['Yes','No','Not sure']},
  {id:'deduct',q:'Do you know your hurricane deductible in dollars?',opts:['Yes','No','Not sure']}
];
const FB_T = [
  {id:'confusing',q:'What was confusing or hard to use?'},
  {id:'missing',q:'What’s missing that you’d want?'},
  {id:'name',q:'Your name and city (optional)'}
];
if(!TEST){ const i = FB_Q.findIndex(x=>x.id==='pay'); if(i>=0) FB_Q.splice(i,1);
  const b = FB_Q.find(x=>x.id==='best'); if(b) b.opts = b.opts.map(o=>o==='Storm alerts'?'Storm and fire seasons':o); }
function fbText(){
  const f = S.fb || {};
  const lines = ['StormFile feedback'];
  FB_Q.forEach(x=>{ if(f[x.id]) lines.push(`${x.q} ${f[x.id]}`); });
  FB_T.forEach(x=>{ if(f[x.id] && f[x.id].trim()) lines.push(`${x.q} ${f[x.id].trim()}`); });
  return lines.join('\n');
}
function viewFeedback(){
  const f = S.fb || (S.fb = {});
  const answered = FB_Q.filter(x=>f[x.id]).length;
  return `
  <section class="stack"><p class="label">${TEST?'Test version':'StormFile'}</p><h1>Your feedback</h1>
    <p class="small muted">${TEST?'Six taps':'A few taps'} and a few words. When you\u2019re done, tap Email my answers and they come straight to us.</p></section>
  ${FB_Q.map(x=>`<div class="card"><h3>${esc(x.q)}</h3><div class="choices" role="group" aria-label="${esc(x.q)}">
    ${x.opts.map(o=>`<button data-fbq="${x.id}" data-fba="${esc(o)}" aria-pressed="${f[x.id]===o}">${esc(o)}</button>`).join('')}</div></div>`).join('')}
  ${FB_T.map(x=>`<div class="card"><label class="field" style="color:var(--fg);font-size:15px;font-weight:600">${esc(x.q)}
    ${x.id==='name'?`<input id="fb-${x.id}" data-fbt="${x.id}" value="${esc(f[x.id]||'')}">`:`<textarea id="fb-${x.id}" data-fbt="${x.id}">${esc(f[x.id]||'')}</textarea>`}</label></div>`).join('')}
  <div class="card" style="border-color:var(--accent)">
    <div class="row"><h2>Send it</h2><span class="small muted">${answered} of ${FB_Q.length} answered</span></div>
    <a class="btn-like" id="fbMail" style="background:var(--accent);color:var(--accent-fg);border-color:var(--accent)" href="${esc(`mailto:info@coastlinecode.com?subject=${encodeURIComponent('StormFile feedback')}&body=${encodeURIComponent(fbText())}`)}">Email my answers to StormFile</a>
    <button data-act="fbCopy">Copy my answers</button>
    <p class="small muted">The email goes to info@coastlinecode.com. If your email app doesn\u2019t open, copy your answers and send them to that address${TEST?', or text them to the person who shared StormFile with you':''}.</p>
    <textarea id="fbOut" readonly style="min-height:140px;font-size:13px">${esc(fbText())}</textarea>
  </div>`;
}

/* ---------- Bytes ---------- */
function u8ToB64(u8){ let x=''; const CH=0x8000; for(let i=0;i<u8.length;i+=CH) x+=String.fromCharCode.apply(null,u8.subarray(i,i+CH)); return btoa(x); }
function b64ToU8(b){ const x=atob(b); const u=new Uint8Array(x.length); for(let i=0;i<x.length;i++) u[i]=x.charCodeAt(i); return u; }
const enc = new TextEncoder(), dec = new TextDecoder();

/* ---------- PIN and Face ID / fingerprint lock (same design as KidArmor) ---------- */
const PINKEY='stormfile.pin', BIOKEY='stormfile.bio', LOCKKEY='stormfile.lockstate';
async function pinHash(pin, saltB64, iter){ iter = iter || (saltB64?100000:600000); const salt = saltB64 ? b64ToU8(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const k = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2', salt, iterations:iter, hash:'SHA-256'}, k, 256)); return {s:u8ToB64(salt), h:u8ToB64(bits), i:iter}; }
const getJ = k => { try{ return JSON.parse(localStorage.getItem(k)||'null'); }catch(e){ return null; } };
const setJ = (k,v) => { try{ v==null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); }catch(e){} };
const pinRec = () => getJ(PINKEY), bioRec = () => getJ(BIOKEY);
const BIONAME = () => IS_IOS ? 'Face ID' : 'your fingerprint';
async function bioSupported(){ if(NAT) return NAT.bioSupported(); try{ if(window.self!==window.top) return false; }catch(e){ return false; }
  if(!window.isSecureContext || !window.PublicKeyCredential || !PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) return false;
  try{ return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); }catch(e){ return false; } }
async function bioEnroll(){ if(NAT){ await NAT.bioVerify('Turn on '+BIONAME()+' for StormFile'); setJ(BIOKEY, {native:true}); return; } const id = crypto.getRandomValues(new Uint8Array(16));
  const cred = await navigator.credentials.create({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)), rp:{name:'StormFile'}, user:{id, name:'StormFile', displayName:'StormFile'},
    pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}], authenticatorSelection:{authenticatorAttachment:'platform', userVerification:'required', residentKey:'discouraged'}, timeout:60000, attestation:'none'}});
  setJ(BIOKEY, {id:u8ToB64(new Uint8Array(cred.rawId))}); }
async function bioUnlock(){ const r = bioRec(); if(!r) return false; if(NAT){ try{ await NAT.bioVerify('Unlock StormFile'); return true; }catch(e){ return false; } }
  try{ const a = await navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)), allowCredentials:[{type:'public-key', id:b64ToU8(r.id), transports:['internal','hybrid']}], userVerification:'required', timeout:60000}});
    if(!a) return false; const flags = new Uint8Array(a.response.authenticatorData)[32]; return !!(flags & 0x04); }catch(e){ return false; } }
const lockState = () => getJ(LOCKKEY) || {n:0, rounds:0, until:0};
let BIO_OK = false;
function showLock(){
  if(document.querySelector('.lockscreen')) return; const rec = pinRec(); if(!rec) return; const bio = !!bioRec();
  const l = document.createElement('div'); l.className = 'lockscreen'; l.setAttribute('role','dialog'); l.setAttribute('aria-modal','true'); l.setAttribute('aria-label','StormFile is locked');
  l.innerHTML = `<div class="brand">Storm<span>File</span></div><h2>StormFile is locked</h2>
    ${bio?`<p class="small" id="lockBioMsg">Signing you in with ${BIONAME()}…</p><button class="primary" id="lockBio" type="button">Use ${BIONAME()}</button><p class="small muted">or enter your PIN</p>`:`<p class="small">Enter your PIN to open your records.</p>`}
    <label class="field" for="lockPin" style="align-items:center">PIN<input id="lockPin" type="password" inputmode="numeric" autocomplete="current-password" style="max-width:200px;text-align:center;font-size:20px;letter-spacing:.2em"></label>
    <button class="${bio?'ghost':'primary'}" id="lockGo" type="button">Unlock with PIN</button><p class="small" id="lockErr" role="alert" style="color:var(--red)"></p>
    <p class="small muted" style="margin-top:auto">Forgot your PIN? It can’t be reset, because nobody else holds your records. You can erase this app’s data in your phone’s settings and restore from a backup file.</p>`;
  document.body.appendChild(l);
  const behind = [...document.body.children].filter(x=>x!==l && !x.inert); behind.forEach(x=>x.inert=true);
  const done = () => { l.remove(); behind.forEach(x=>x.inert=false); setJ(LOCKKEY, {n:0, rounds:0, until:0}); };
  const go = async () => { const st = lockState();
    if(Date.now() < st.until){ l.querySelector('#lockErr').textContent = `Too many tries. Wait ${Math.ceil((st.until-Date.now())/1000)} seconds.`; return; }
    const inp = l.querySelector('#lockPin'); const h = await pinHash(inp.value.trim(), rec.s, rec.i||100000);
    if(h.h === rec.h) return done();
    inp.value = ''; const n = (st.n||0) + 1;
    if(n >= 5){ const rounds = (st.rounds||0)+1, secs = Math.min(3600, 30*2**(rounds-1)); setJ(LOCKKEY, {n:0, rounds, until:Date.now()+secs*1000});
      l.querySelector('#lockErr').textContent = `Too many tries. Wait ${secs>=120?Math.round(secs/60)+' minutes':secs+' seconds'}.`; }
    else { setJ(LOCKKEY, {n, rounds:st.rounds||0, until:st.until||0}); l.querySelector('#lockErr').textContent = 'That PIN isn’t right.'; } };
  l.querySelector('#lockGo').onclick = go; l.querySelector('#lockPin').onkeydown = e => { if(e.key==='Enter') go(); };
  const lb = l.querySelector('#lockBio');
  const tryBio = async auto => { if(!lb || lb.disabled) return; lb.disabled = true; const ok = await bioUnlock(); lb.disabled = false;
    if(ok){ done(); toast('Signed in with ' + BIONAME()); return; }
    l.querySelector('#lockBioMsg').textContent = auto ? `Tap Use ${BIONAME()} to sign in.` : `${BIONAME()} didn’t sign you in. Try again, or enter your PIN.`; };
  if(lb){ lb.onclick = () => tryBio(false); setTimeout(()=>tryBio(true), 350); }
  setTimeout(()=>{ try{ if(!bio) l.querySelector('#lockPin').focus(); }catch(e){} }, 50);
}
let hiddenAt = 0;
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) hiddenAt = Date.now(); else if(hiddenAt && Date.now()-hiddenAt > 60000) showLock(); });

/* ---------- Encrypted backup (whole account + every photo and receipt) ---------- */
async function aesKey(secret, salt, iter){ const base = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2', salt, iterations:iter, hash:'SHA-256'}, base, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']); }
async function sealJson(obj, secret, iter=150000){ const salt = crypto.getRandomValues(new Uint8Array(16)), nonce = crypto.getRandomValues(new Uint8Array(12));
  const key = await aesKey(secret.normalize('NFKC'), salt, iter);
  const ct = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv:nonce}, key, enc.encode(JSON.stringify(obj))));
  return JSON.stringify({format:'stormfile', type:'backup', v:1, kdf:{alg:'PBKDF2-SHA256', iter, salt:u8ToB64(salt)}, cipher:{alg:'AES-256-GCM', nonce:u8ToB64(nonce)}, data:u8ToB64(ct)}); }
async function openJson(text, secret){ let env; const bad = 'This isn’t a StormFile backup file.';
  try{ env = JSON.parse(text); }catch(e){ throw new Error(bad); }
  if(!env || env.format!=='stormfile' || !env.data || !env.kdf || !env.cipher) throw new Error(bad);
  const it = env.kdf.iter; if(!Number.isInteger(it) || it<1 || it>2000000) throw new Error(bad);
  const key = await aesKey(secret.normalize('NFKC'), b64ToU8(env.kdf.salt), it);
  let pt; try{ pt = await crypto.subtle.decrypt({name:'AES-GCM', iv:b64ToU8(env.cipher.nonce)}, key, b64ToU8(env.data)); }catch(e){ throw new Error('That passphrase doesn’t match this backup.'); }
  return JSON.parse(dec.decode(new Uint8Array(pt))); }
function fileIdsInState(st){ const ids = new Set(); const add = x => { if(x && x.id) ids.add(x.id); };
  (st.properties||[]).forEach(P=>{ (P.exterior||[]).forEach(add); (P.rooms||[]).forEach(r=>{ (r.photoData||[]).forEach(x=>add(photoObj(x))); r.items.forEach(it=>{ if(it.rid) ids.add(it.rid); }); });
    (P.upgrades||[]).forEach(u=>{ if(u.rid) ids.add(u.rid); }); ((P.claim||{}).receipts||[]).forEach(r=>{ if(r.rid) ids.add(r.rid); }); });
  return [...ids]; }
async function saveFile(filename, blob){
  if(NAT) return NAT.saveFile(filename, blob);
  // Phones: the share sheet lets people save straight to Files, iCloud Drive or Google Drive.
  try{ const f = new File([blob], filename, {type: blob.type || 'application/octet-stream'});
    if(navigator.canShare && navigator.canShare({files:[f]}) && /iphone|ipad|android/i.test(navigator.userAgent)){ await navigator.share({files:[f], title:filename}); return true; } }
  catch(e){ if(e && e.name==='AbortError') return false; }
  try{ const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u), 15000); return true; }
  catch(e){ toast('Saving files isn’t available here.'); return false; }
}
const today = () => new Date().toISOString().slice(0,10);
async function makeBackup(pass){
  save(); const files = {};
  for(const id of fileIdsInState(S)){ try{ const r = await getFile(id); if(r && r.blob) files[id] = {name:r.name, type:r.type, w:r.w, h:r.h, b64:u8ToB64(new Uint8Array(await r.blob.arrayBuffer()))}; }catch(e){} }
  const text = await sealJson({app:'StormFile', made:nowISO(), state:S, files}, pass);
  return new Blob([text], {type:'application/json'});
}
async function restoreBackup(text, pass){
  const v = await openJson(text, pass);
  if(!v || !v.state || !Array.isArray(v.state.properties)) throw new Error('This backup is missing its records.');
  for(const [id, f] of Object.entries(v.files||{})){ await putFile({id, name:f.name, type:f.type, w:f.w, h:f.h, blob:new Blob([b64ToU8(f.b64)], {type:f.type}), at:nowISO()}); }
  S = v.state; S.tab = 'home'; S.agreed = true; load2(); save();
  return S.properties.length;
}
function load2(){ S.properties.forEach(p=>{ p.upgrades = p.upgrades||[]; p.vehicles = p.vehicles||[]; p.claim = Object.assign(blankClaim(), p.claim); }); }
function hasRealData(){ return !S.sample && S.properties.some(P => (P.history||[]).length || P.policyId || P.rooms.some(r=>r.items.length || (r.photoData||[]).length)); }
function backupDue(){
  if(!hasRealData()) return null;
  const last = S.lastBackupAt ? new Date(S.lastBackupAt).getTime() : 0;
  const lastChange = Math.max(0, ...S.properties.flatMap(P => (P.history||[]).map(h => new Date(h.at).getTime() || 0)));
  if(!last) return 'You haven’t made a backup yet.';
  if(lastChange > last && Date.now() - last > 7*86400000) return `Your last backup was ${fmtDay(S.lastBackupAt)}, and you’ve added things since.`;
  if(Date.now() - last > 30*86400000) return `Your last backup was ${fmtDay(S.lastBackupAt)}.`;
  return null;
}

/* ---------- Claim packet PDF (made on this phone) ---------- */
let pdfLibP = null;
function loadPdfLib(){ if(window.PDFLib) return Promise.resolve(window.PDFLib);
  if(!pdfLibP) pdfLibP = new Promise((res, rej)=>{ const sc = document.createElement('script'); sc.src = 'vendor/pdf-lib.min.js'; sc.onload = () => res(window.PDFLib); sc.onerror = () => { pdfLibP = null; rej(new Error('pdf')); }; document.head.appendChild(sc); });
  return pdfLibP; }
/* PDF standard fonts only know basic Latin characters. */
function pdfText(x){ return String(x == null ? '' : x).replace(/[‘’ʼ]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-').replace(/[·•]/g,'-')
  .replace(/…/g,'...').replace(/✓/g,'yes').replace(/ /g,' ').replace(/[\u0000-\u0008\u000B-\u001F]/g,'').replace(/[^\n\x20-\x7E\xA0-\xFF]/g,'?'); }
async function jpegForPdf(id, thumb, max){
  try{ const rec = await getFile(id); if(rec && rec.blob && /^image\//.test(rec.type||'')){ const img = await loadImg(rec.blob); const d = drawTo(img, max||1400);
      const b = await new Promise(r=>d.canvas.toBlob(r,'image/jpeg',0.8)); return new Uint8Array(await b.arrayBuffer()); } }catch(e){}
  if(thumb && safeImg(thumb) && /^data:image\/jpeg/.test(thumb)) return b64ToU8(thumb.split(',')[1]);
  return null;
}
async function makeClaimPacket(P, opt){
  const PL = await loadPdfLib(); const {PDFDocument, StandardFonts, rgb} = PL;
  const doc = await PDFDocument.create(); doc.setTitle(pdfText(`StormFile claim record - ${P.name}`)); doc.setCreator('StormFile by Coastline Code'); doc.setProducer('StormFile');
  const F = await doc.embedFont(StandardFonts.Helvetica), FB = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 612, H = 792, M = 50, ink = rgb(0.08,0.13,0.17), mute = rgb(0.34,0.40,0.45), line = rgb(0.81,0.85,0.87), accent = rgb(0.05,0.36,0.48), amber = rgb(0.76,0.48,0);
  let page, y;
  const newPage = () => { page = doc.addPage([W,H]); y = H - M; };
  const need = h => { if(y - h < M + 24) newPage(); };
  const wrap = (txt, font, size, width) => { const out = []; String(pdfText(txt)).split('\n').forEach(par=>{ let ln = ''; par.split(/\s+/).forEach(w=>{ const t = ln ? ln+' '+w : w; if(font.widthOfTextAtSize(t,size) > width && ln){ out.push(ln); ln = w; } else ln = t; }); out.push(ln); }); return out; };
  const text = (t, o={}) => { const size = o.size||10, font = o.bold?FB:F, width = o.width||(W-2*M), x = o.x||M, lh = size*1.35;
    const lines = wrap(t, font, size, width); for(const l of lines){ need(lh); page.drawText(l, {x, y:y-size, size, font, color:o.color||ink}); y -= lh; } };
  const gap = h => { y -= h; };
  const h1 = t => { need(40); gap(6); text(t, {size:16, bold:true, color:accent}); page.drawLine({start:{x:M,y:y-2}, end:{x:W-M,y:y-2}, thickness:1, color:line}); gap(10); };
  const kv = (k, v) => { if(v==null || v==='') return; const kl = wrap(k, FB, 10, 160), vl = wrap(v, F, 10, W-2*M-170), n = Math.max(kl.length, vl.length);
    need(n*13.5 + 2);
    for(let i=0;i<n;i++){ if(kl[i]) page.drawText(kl[i], {x:M, y:y-10, size:10, font:FB, color:mute}); if(vl[i]) page.drawText(vl[i], {x:M+170, y:y-10, size:10, font:F, color:ink}); y -= 13.5; } };
  const table = (cols, rows, widths) => { const tw = W-2*M; const ws = widths.map(f=>f*tw); const size = 8.5, lh = 11.5;
    const head = () => { need(18); let x = M; cols.forEach((c,i)=>{ page.drawText(pdfText(c), {x:x+2, y:y-10, size, font:FB, color:mute}); x += ws[i]; }); y -= 14; page.drawLine({start:{x:M,y}, end:{x:W-M,y}, thickness:0.6, color:line}); y -= 3; };
    head();
    rows.forEach(r=>{ const cells = r.map((c,i)=>wrap(c, F, size, ws[i]-6)); const hgt = Math.max(...cells.map(c=>c.length))*lh + 4;
      if(y - hgt < M + 24){ newPage(); head(); }
      let x = M; cells.forEach((c,i)=>{ c.forEach((l,j)=>page.drawText(l, {x:x+2, y:y-9-j*lh, size, font:F, color:ink})); x += ws[i]; });
      y -= hgt; page.drawLine({start:{x:M,y:y+1}, end:{x:W-M,y:y+1}, thickness:0.3, color:line}); }); gap(6); };
  const photoBlock = async (list, label) => {
    const items = (list||[]).map(photoObj).filter(o=>o.id || safeImg(o.src)); if(!items.length) return 0;
    need(30); text(label, {bold:true, size:11}); gap(2);
    const cw = (W-2*M-14)/2; let col = 0, rowH = 0, n = 0;
    for(const o of items){ const bytes = await jpegForPdf(o.id, o.src, 1400); if(!bytes) continue;
      let im; try{ im = await doc.embedJpg(bytes); }catch(e){ continue; }
      const sc = Math.min(cw/im.width, 190/im.height), iw = im.width*sc, ih = im.height*sc;
      const cap = [(o.taken?'Taken '+fmtDay(o.taken):'')+(o.addedAt?(o.taken?' - added ':'Added ')+fmtWhen(o.addedAt):''), o.gps?`Location ${o.gps.lat}, ${o.gps.lng}${o.gps.acc?` (within ${o.gps.acc} m)`:''}`:'', isAfterLock(P,o)?'ADDED AFTER CLAIM STARTED':''].filter(Boolean);
      const bh = 196 + cap.length*10 + 6;
      if(col===0){ if(y - bh < M + 24) newPage(); rowH = bh; }
      const x = M + col*(cw+14);
      page.drawImage(im, {x, y:y-ih, width:iw, height:ih});
      cap.forEach((c,i)=>page.drawText(pdfText(c), {x, y:y-196-i*10-6, size:7.5, font:i===2||c.startsWith('ADDED')?FB:F, color:c.startsWith('ADDED')?amber:mute}));
      n++; col++; if(col===2){ col = 0; y -= rowH; }
    }
    if(col===1) y -= rowH; gap(6); return n;
  };

  const pol = polOf(P), c = calc(P), cl = P.claim, me = S.me || {}, cfg = TYPES[P.type];
  // ---- Cover ----
  newPage();
  page.drawRectangle({x:0, y:H-8, width:W, height:8, color:accent});
  text('CLAIM RECORD', {size:10, bold:true, color:mute}); gap(2);
  text(P.name, {size:24, bold:true}); text(`${cfg.label} - ${P.address}`, {size:12, color:mute}); gap(14);
  kv('Policyholder', me.name); kv('Phone', me.phone); kv('Email', me.email); kv('Mailing address', me.mail);
  gap(6);
  if(pol){ kv('Insurance company', pol.carrier); kv('Policy', `${pol.form} - ${pol.number}`); if(pol.agent && !/^Not /.test(pol.agent)) kv('Agent', pol.agent); }
  kv('Claim number', cl.number || 'Not entered yet'); kv('Date of loss', cl.dateOfLoss); kv('Adjuster', [cl.adjuster, cl.adjPhone].filter(Boolean).join(' - '));
  gap(6);
  const items = P.rooms.flatMap(r=>r.items.map(it=>({...it, room:r.name})));
  const photos = (P.exterior||[]).concat(P.rooms.flatMap(r=>(r.photoData||[]).map(photoObj)));
  kv('Before-storm record', lockedAt(P) ? `Locked ${fmtWhen(lockedAt(P))}. Items and photos logged before then are marked as the before-storm record; anything added later is marked "added after claim."` : 'Not locked yet.');
  kv('Contents logged', `${plural(items.length,'item')}, about ${fmt(c?c.inv.today:invTotals(P).today)} at today's prices`);
  kv('Photos', `${plural(photos.length,'photo')} (${photos.filter(o=>o.gps).length} with location)`);
  kv('Receipts', `${items.filter(i=>i.r).length + (P.upgrades||[]).filter(u=>u.r).length} purchase and upgrade receipts, ${(cl.receipts||[]).filter(r=>r.r).length} expense receipts`);
  kv('Prepared', `${fmtWhen(nowISO())} with StormFile`);
  gap(14);
  text('How this record was made', {bold:true, size:10});
  text('The policyholder created this record with the StormFile app on their own phone. Photos taken or added in the app carry the date and time they were added, the date the camera recorded when available, and the phone\'s location when allowed. Every addition, removal and receipt is listed with its date in the record history at the end of this packet.', {size:9, color:mute});
  gap(6); text('StormFile helps people organize their records. It does not decide coverage or give insurance or legal advice. Coverage is decided by the policy and the insurance company.', {size:8, color:mute});

  // ---- Policy summary ----
  if(pol && opt.policy){ newPage(); h1('Policy summary');
    kv('Insurance company', pol.carrier); kv('Policy type', pol.form); kv('Policy number', pol.number); if(pol.renewal) kv('Expires', fmtDay(pol.renewal+'T12:00:00'));
    gap(6); table(['Coverage','What it pays for','Limit'], pol.coverages.map(x=>[x.name, x.plain, fmt(x.limit)]), [0.28,0.52,0.2]);
    kv(hurDedLabel(pol, cfg), fmt(c.hurDed)); kv('Other claims deductible', fmt((pol.deductibles||{}).allPerils||0));
    if((pol.notCovered||[]).length){ gap(8); text('Limits and exclusions noted', {bold:true}); pol.notCovered.forEach(x=>text(`- ${x.title}: ${x.plain}`, {size:9})); }
    gap(6); text(pol.manual ? 'Summary built from details the policyholder entered from their declarations page.' : 'Summary of the declarations page.', {size:8, color:mute}); }

  // ---- Photos ----
  if(opt.photos && photos.length){ newPage(); h1('Photos');
    await photoBlock(P.exterior, 'Outside of the building');
    for(const r of P.rooms) await photoBlock(r.photoData, r.name); }

  // ---- Contents ----
  if(items.length){ need(140); gap(10); h1(P.type==='business'?'Equipment and contents':'Contents inventory');
    table(['Room','Item','Bought','Paid','Today (est.)','Receipt','Logged'],
      items.map(it=>[it.room, it.n + (isAfterLock(P,it)?' (added after claim)':''), String(it.y||''), fmt(it.v), fmt(itemToday(it)), it.r?'Yes':(it.v>=BIG?'No - over $1,000':'No'), it.addedAt?fmtDay(it.addedAt):'Before tracking']),
      [0.14,0.3,0.08,0.11,0.12,0.13,0.12]);
    text(`Total paid: ${fmt(items.reduce((a,b)=>a+(+b.v||0),0))}    Estimated replacement today: ${fmt(items.reduce((a,b)=>a+itemToday(b),0))}`, {bold:true, size:10});
    text('Today\'s estimate adds about 3.1% a year for price increases. It is an estimate, not an appraisal.', {size:8, color:mute}); }
  if((P.upgrades||[]).length){ need(60); gap(8); h1(P.type==='business'?'Building upgrades':'Home upgrades and repairs');
    table(['Upgrade or repair','Year','Cost','Receipt'], P.upgrades.map(u=>[u.n, String(u.y||''), fmt(u.v), u.r?'Yes':'No']), [0.55,0.12,0.15,0.18]); }
  if((P.vehicles||[]).length){ need(60); gap(8); h1('Vehicles, campers and boats');
    table(['Vehicle','Type','Storm coverage'], P.vehicles.map(v=>[v.n, v.kind, (VCOV[v.cov]||{}).t||'']), [0.45,0.2,0.35]); }

  // ---- Living expenses / lost income ----
  if((cl.receipts||[]).length){ need(140); gap(10); h1(cfg.lossName);
    const st = {home:'Living at home', evac:'Under a mandatory evacuation order', unlivable:'Home is not livable'}[cl.status]; if(P.type==='home' && st) kv('Situation', st + (cl.orderDate?` (order dated ${cl.orderDate})`:''));
    table(['Date','Type','What','Amount','Receipt'], cl.receipts.map(r=>[r.date||'', r.cat||'', r.what, fmt(r.amt), r.r?'Yes':'No']), [0.14,0.18,0.4,0.13,0.15]);
    const byCat = {}; cl.receipts.forEach(r=>{ byCat[r.cat||'Other'] = (byCat[r.cat||'Other']||0) + (+r.amt||0); });
    Object.entries(byCat).forEach(([k,v])=>kv(k, fmt(v))); kv('Total', fmt(cl.receipts.reduce((a,b)=>a+(+b.amt||0),0))); }

  // ---- Calls ----
  if((cl.log||[]).length){ need(80); gap(8); h1('Calls and emails with the insurance company');
    table(['Date','Note'], cl.log.map(l=>[l.at?fmtWhen(l.at):(l.date||''), l.note]), [0.25,0.75]); }

  // ---- Receipts appendix ----
  if(opt.receipts){ const recs = [...items.filter(i=>i.rid).map(i=>({id:i.rid, cap:`Receipt: ${i.n} (${i.room})`})), ...(P.upgrades||[]).filter(u=>u.rid).map(u=>({id:u.rid, cap:`Receipt: ${u.n}`})), ...(cl.receipts||[]).filter(r=>r.rid).map(r=>({id:r.rid, cap:`Expense receipt: ${r.what} (${fmt(r.amt)})`}))];
    if(recs.length){ newPage(); h1('Receipts');
      for(const r of recs){ const rec = await getFile(r.id).catch(()=>null); if(!rec) continue;
        if(/pdf/i.test(rec.type||'')){ try{ const src = await PDFDocument.load(await rec.blob.arrayBuffer(), {ignoreEncryption:true}); const pages = await doc.copyPages(src, src.getPageIndices().slice(0,10));
            need(20); text(r.cap + ' (PDF pages follow)', {bold:true, size:9}); pages.forEach(pg=>doc.addPage(pg)); newPage(); }catch(e){ text(r.cap + ' - PDF could not be added; it is kept in the app.', {size:9, color:mute}); } continue; }
        const bytes = await jpegForPdf(r.id, '', 1600); if(!bytes) continue; let im; try{ im = await doc.embedJpg(bytes); }catch(e){ continue; }
        const sc = Math.min((W-2*M)/im.width, 320/im.height); need(im.height*sc + 26); text(r.cap, {bold:true, size:9}); page.drawImage(im, {x:M, y:y-im.height*sc, width:im.width*sc, height:im.height*sc}); y -= im.height*sc + 14; } } }

  // ---- History ----
  if(opt.history && (P.history||[]).length){ newPage(); h1('Record history');
    text('Every change to this record, in order. StormFile keeps this list automatically and it can\'t be edited in the app.', {size:8.5, color:mute}); gap(4);
    table(['Date and time','What changed'], P.history.map(h=>[fmtWhen(h.at), h.what]), [0.28,0.72]); }

  // ---- Footer on every page ----
  const pages = doc.getPages(), stamp = pdfText(`StormFile claim record - ${P.name} - prepared ${fmtDay(nowISO())}`);
  pages.forEach((pg,i)=>{ const {width} = pg.getSize(); pg.drawText(stamp, {x:M, y:26, size:7.5, font:F, color:mute}); const t = `Page ${i+1} of ${pages.length}`; pg.drawText(t, {x:width-M-F.widthOfTextAtSize(t,7.5), y:26, size:7.5, font:F, color:mute}); });
  const bytes = await doc.save();
  return new Blob([bytes], {type:'application/pdf'});
}

/* ---------- Calendar reminders (.ics, opens the phone's calendar) ---------- */
const icsText = t => pdfText(t).replace(/\\/g,'\\\\').replace(/;/g,'\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
const icsDate = d => d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
const icsFold = l => { const o=[]; while(l.length>73){ o.push(l.slice(0,73)); l=' '+l.slice(73); } o.push(l); return o.join('\r\n'); };
function at9(ymd){ const [y,m,d] = ymd.split('-').map(Number); return new Date(y, m-1, d, 9, 0, 0); }
function addDays(ymd, n){ const d = at9(ymd); d.setDate(d.getDate()+n); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function makeIcs(events){
  const L = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Coastline Code//StormFile//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
  events.forEach((e,i)=>{ const s = at9(e.date), end = new Date(s.getTime()+30*60000);
    L.push('BEGIN:VEVENT', `UID:${Date.now().toString(36)}-${i}-${Math.random().toString(36).slice(2,8)}@stormfile`, `DTSTAMP:${icsDate(new Date())}`, `DTSTART:${icsDate(s)}`, `DTEND:${icsDate(end)}`,
      ...(e.yearly?['RRULE:FREQ=YEARLY']:[]), `SUMMARY:${icsText(e.title)}`, `DESCRIPTION:${icsText(e.desc||'')}`,
      'BEGIN:VALARM','ACTION:DISPLAY',`DESCRIPTION:${icsText(e.title)}`,'TRIGGER:PT0M','END:VALARM',
      ...(e.dayBefore?['BEGIN:VALARM','ACTION:DISPLAY',`DESCRIPTION:${icsText(e.title)}`,'TRIGGER:-P1D','END:VALARM']:[]), 'END:VEVENT'); });
  L.push('END:VCALENDAR'); return L.map(icsFold).join('\r\n') + '\r\n';
}
async function addToCalendar(events, name){
  if(NAT && NAT.addEvents){
    const evs = events.map(e=>{ const st = at9(e.date); return {title:e.title, description:e.desc||'', startDate:st.getTime(), endDate:st.getTime()+30*60000, yearly:!!e.yearly, alerts:e.dayBefore?[-1440,0]:[0]}; });
    const r = await NAT.addEvents(evs);
    if(r === 'oneByOne' && NAT.addEventsOneByOne){ // Android, calendar access not allowed: the calendar opens once per reminder
      toast(`Your calendar will open ${events.length} times, once for each reminder. Tap Save each time.`);
      await new Promise(ok=>setTimeout(ok, 2500)); return NAT.addEventsOneByOne(evs); }
    if(r === true){ toast(events.length>1 ? `${events.length} reminders added to your calendar.` : 'Added to your calendar.'); return true; }
    if(r === false) return false;
    return saveFile(name.replace(/[^\w .-]/g,'') + '.ics', new Blob([makeIcs(events)], {type:'text/calendar'})); // calendar access not given: share the file instead
  }
  const blob = new Blob([makeIcs(events)], {type:'text/calendar'});
  try{ const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name.replace(/[^\w .-]/g,'') + '.ics'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u), 60000);
    toast(events.length>1 ? `Open the file to add ${events.length} reminders to your calendar.` : 'Open the file to add it to your calendar.'); return true; }
  catch(e){ toast('Your calendar couldn\u2019t be opened from here.'); return false; }
}

/* ---------- States and their storm and fire seasons ---------- */
const STATES = [['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['DC','District of Columbia'],['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming']];
const STATE_NAME = Object.fromEntries(STATES);
function stateOf(P){
  if(P.state && STATE_NAME[P.state]) return P.state;
  const a = String(P.address||''); const m = a.match(/,\s*([A-Za-z]{2})\b\.?\s*(\d{5})?\s*$/);
  if(m && STATE_NAME[m[1].toUpperCase()]) return m[1].toUpperCase();
  const hit = STATES.find(([c,n]) => new RegExp('\\b'+n+'\\b','i').test(a)); return hit ? hit[0] : '';
}
/* Seasons: hurricane dates are the official NOAA seasons. The others are typical times of highest risk and vary by year and place. */
const HAZ = {
  hurricane:{name:'Hurricane season', official:true, start:'06-01', end:'11-30', peak:'Peak is mid-August through mid-October.',
    prep:['Photograph every room, closets, the garage, the roof and all four sides','Add receipts for big purchases and home upgrades','Check you have flood coverage. New flood policies usually take 30 days to start','Know your hurricane deductible in dollars (Policy tab)','Plan where you’d stay if ordered to evacuate, and keep receipts if you do','Save a locked backup off this phone']},
  hurricanePac:{name:'Hurricane season', official:true, start:'06-01', end:'11-30', peak:'Central Pacific hurricane season. Most storms come August through October.',
    prep:['Photograph every room, the roof and all four sides','Add receipts for big purchases','Check whether your policy covers hurricane wind and flood','Save a locked backup off this phone']},
  wildfire:{name:'Wildfire season', start:'06-01', end:'10-31', peak:'Fires can start any time it’s dry; this is when risk is usually highest.',
    prep:['Photograph every room, closet, drawer and the garage. After a wildfire there may be nothing left to photograph','Clear dead plants, leaves and anything burnable within 5 feet of the house','Check your policy for smoke damage and living expenses if you have to leave','Know your evacuation zone and keep a go-bag ready','Save a locked backup off this phone']},
  grassfire:{name:'Grass and wildfire season', start:'01-15', end:'04-30', peak:'Dry, windy late winter and spring brings the most grass fires.',
    prep:['Photograph every room and the outside of the house and outbuildings','Clear dry grass and debris near the house and fences','Add receipts for equipment and big purchases','Save a locked backup off this phone']},
  tornado:{name:'Tornado season', start:'03-01', end:'06-30', peak:'Tornadoes can happen any month; spring is the busiest time.',
    prep:['Photograph every room, the roof and all four sides','Know your wind and hail deductible (Policy tab)','Pick your safe spot: a basement, storm shelter or inside room on the lowest floor','Add receipts for big purchases','Save a locked backup off this phone']},
  tornadoFall:{name:'Fall tornado season', start:'11-01', end:'12-31', peak:'The Southeast has a second tornado season in late fall.',
    prep:['Update photos of rooms and the roof','Know your wind and hail deductible (Policy tab)','Review your safe spot','Save a fresh backup']},
  winter:{name:'Winter storms and hard freezes', start:'12-01', end:'02-28', peak:'Freezes can burst pipes and ice can bring down trees and power lines.',
    prep:['Know where your main water shut-off is','Protect outdoor and attic pipes; let faucets drip in a hard freeze','Check what your policy pays for water damage from frozen pipes','Photograph rooms and add receipts for anything new']}
};
const COAST_ATL = ['TX','LA','MS','AL','FL','GA','SC','NC','VA','MD','DE','NJ','NY','CT','RI','MA','NH','ME','DC','PA'];
const STATE_HAZ = (st) => {
  const out = [];
  if(COAST_ATL.includes(st)) out.push({k:'hurricane'});
  if(st==='HI') out.push({k:'hurricanePac'});
  if(st==='CA') out.push({k:'wildfire', start:'06-01', end:'11-30', note:'In California fires can happen year-round; summer and fall are the highest-risk months.'});
  if(['OR','WA','ID','MT'].includes(st)) out.push({k:'wildfire', start:'07-01', end:'10-15'});
  if(['NV','UT','CO','WY'].includes(st)) out.push({k:'wildfire', start:'06-01', end:'10-31'});
  if(['AZ','NM'].includes(st)) out.push({k:'wildfire', start:'04-15', end:'07-31', note:'Risk usually peaks before the summer monsoon rains.'});
  if(st==='AK') out.push({k:'wildfire', start:'05-15', end:'08-31'});
  if(['TX','OK','KS','NE'].includes(st)) out.push({k:'grassfire'});
  if(st==='FL') out.push({k:'grassfire', start:'01-15', end:'05-31', note:'Florida’s dry season, before the summer rains, brings the most wildfires.'});
  if(['TX','OK','KS','NE','SD','ND','MO','AR','LA','MS','AL','TN','KY','IA','IL','IN','OH','GA','MN','WI'].includes(st)) out.push({k:'tornado', start: ['MS','AL','LA','TN','AR','GA','KY'].includes(st) ? '02-15' : '03-15', end: ['MS','AL','LA','TN','AR','GA','KY'].includes(st) ? '05-31' : '06-30'});
  if(['MS','AL','LA','AR','TN','GA'].includes(st)) out.push({k:'tornadoFall'});
  if(st && !['HI','FL'].includes(st)) out.push({k:'winter'});
  return out.map(h => Object.assign({}, HAZ[h.k], {key:h.k}, h.start?{start:h.start}:{}, h.end?{end:h.end}:{}, h.note?{peak:h.note}:{}));
};
const mdDate = (y, md) => { const [m,d] = md.split('-').map(Number); return new Date(y, m-1, d, 9, 0, 0); };
function seasonWindow(h, now){
  now = now || new Date(); const y = now.getFullYear();
  for(const yy of [y-1, y, y+1]){ const s = mdDate(yy, h.start); let e = mdDate(yy, h.end); if(e < s) e = mdDate(yy+1, h.end); e.setHours(23,59);
    if(now >= s && now <= e) return {state:'now', start:s, end:e}; }
  for(const yy of [y, y+1]){ const s = mdDate(yy, h.start); if(s > now){ let e = mdDate(yy, h.end); if(e < s) e = mdDate(yy+1, h.end); return {state:'soon', start:s, end:e, days:Math.ceil((s-now)/86400000)}; } }
  return null;
}
const mdLabel = md => { const [m,d] = md.split('-').map(Number); return new Date(2026, m-1, d).toLocaleDateString('en-US',{month:'long',day:'numeric'}); };
function stateSeasons(P){ const st = stateOf(P); return st ? STATE_HAZ(st).map(h => Object.assign(h, {win:seasonWindow(h)})) : []; }
function seasonHeadsUp(P){
  return stateSeasons(P).filter(h=>h.win && (h.win.state==='now' || h.win.days <= 30))
    .sort((a,b)=> (a.win.state==='now'?0:1) - (b.win.state==='now'?0:1) || (a.win.days||0) - (b.win.days||0));
}
function seasonEventsFor(P){
  const ev = []; const st = stateOf(P);
  stateSeasons(P).forEach(h=>{ const w = h.win || seasonWindow(h); if(!w) return; const s = w.start, ymd = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const prep = new Date(s); prep.setDate(prep.getDate()-21);
    ev.push({date:ymd(prep), yearly:true, title:`StormFile: get ready for ${h.name.toLowerCase()} (${STATE_NAME[st]})`, desc:`${h.name} starts ${mdLabel(h.start)}. Open StormFile and:\n- ${h.prep.join('\n- ')}`});
    ev.push({date:ymd(s), yearly:true, title:`${h.name} starts (${STATE_NAME[st]})`, desc:`${h.peak} Make sure your StormFile record and backup are current.`});
    if(h.key==='hurricane'){ const pk = mdDate(s.getFullYear(), '08-01'); ev.push({date:ymd(pk), yearly:true, title:'StormFile: hurricane season peak is coming', desc:'Peak hurricane season is mid-August through mid-October. Add anything new to StormFile and save a fresh backup.'}); }
  });
  return ev;
}
const stateOptions = sel => `<option value="">Choose a state</option>` + STATES.map(([c,n])=>`<option value="${c}" ${sel===c?'selected':''}>${esc(n)}</option>`).join('');

/* ---------- Letters (templates the person reads and edits before sending) ---------- */
const LETTERS = {
  followup:{label:'Written summary of a phone call', subject:(P,cl)=>`Claim ${cl.number||''} - summary of our conversation`},
  estimate:{label:'Request the adjuster\u2019s estimate and photos', subject:(P,cl)=>`Claim ${cl.number||''} - request for estimate and inspection report`},
  status:{label:'Request a status update', subject:(P,cl)=>`Claim ${cl.number||''} - request for status update`},
  ale:{label:'Request a living-expense advance', subject:(P,cl)=>`Claim ${cl.number||''} - request for additional living expense advance`, only:'home'},
  supplement:{label:'Report more damage found', subject:(P,cl)=>`Claim ${cl.number||''} - additional damage found`},
  policy:{label:'Request a full copy of my policy', subject:(P,cl)=>`Policy ${(polOf(P)||{}).number||''} - request for complete policy copy`},
  complaint:{label:'Complaint to the state insurance department', subject:(P,cl)=>`Request for help with claim ${cl.number||''}${(polOf(P)||{}).carrier?' - '+(polOf(P)||{}).carrier:''}`, toDept:true}
};
function ltMailto(P){ const cl = P.claim, k = LETTERS[S.ltKind] && (!LETTERS[S.ltKind].only || LETTERS[S.ltKind].only===P.type) ? S.ltKind : 'followup';
  let body = letterText(P, k, S.ltExtra||''); if(body.length > 6500) body = body.slice(0,6500);
  return `mailto:${encodeURIComponent(LETTERS[k].toDept ? '' : (cl.adjEmail||''))}?subject=${encodeURIComponent(LETTERS[k].subject(P, cl).replace(/\s+-/,' -'))}&body=${encodeURIComponent(body)}`; }
function letterText(P, kind, extra){
  const cl = P.claim, pol = polOf(P), me = S.me || {}, dt = new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  const to = kind==='complaint' ? 'Dear Consumer Services,' : cl.adjuster ? `Dear ${cl.adjuster},` : 'Dear Claims Department,';
  const ref = [pol && pol.carrier && !/^Your insurer/.test(pol.carrier) ? `Insurance company: ${pol.carrier}` : '', pol && pol.number && pol.number!=='Not entered' ? `Policy number: ${pol.number}` : '', cl.number ? `Claim number: ${cl.number}` : '', cl.dateOfLoss ? `Date of loss: ${fmtDay(cl.dateOfLoss+'T12:00:00')}` : '', `Property: ${P.name}${P.address && P.address!=='Add your city' ? ', '+P.address : ''}`].filter(Boolean).join('\n');
  const sig = ['Sincerely,', me.name || '[Your name]', me.phone || '', me.email || '', me.mail ? 'Mailing address: '+me.mail : ''].filter(Boolean).join('\n');
  const last = (cl.log||[]).slice(-1)[0];
  const daysSince = cl.dateOfLoss ? Math.max(0, Math.floor((Date.now()-at9(cl.dateOfLoss).getTime())/86400000)) : null;
  const spent = (cl.receipts||[]).reduce((a,b)=>a+(+b.amt||0),0);
  const body = {
    followup: `Thank you for speaking with me${last && last.at ? ' on '+fmtDay(last.at) : ''}. I\u2019m writing to confirm what we discussed so we both have the same record:\n\n${extra || (last ? last.note : '[What was discussed, what was agreed, and any dates given]')}\n\nIf anything above doesn\u2019t match your understanding, please let me know in writing.`,
    estimate: `Please send me a copy of the adjuster\u2019s estimate for this claim, including the line-item details, the photos taken during the inspection, and any inspection or engineering reports.\n\n${extra ? extra+'\n\n' : ''}Email is the easiest way to reach me. Thank you.`,
    status: `I\u2019m writing to ask for an update on this claim${daysSince!=null ? `, which began ${plural(daysSince,'day')} ago` : ''}. Please let me know where it stands, what you still need from me, and when I can expect the next step.\n\n${extra ? extra+'\n\n' : ''}Thank you.`,
    ale: `${{evac:'We are under a mandatory evacuation order.', unlivable:'Our home is not livable because of the damage.', home:'We are currently unable to stay in our home.'}[cl.status||'home']} I\u2019m asking for an advance on additional living expenses under this policy while the claim is being handled.\n\nSo far we have spent ${fmt(spent)} on extra costs such as lodging, meals and mileage. I have receipts for these and can send them.\n\n${extra ? extra+'\n\n' : ''}Please let me know what you need from me to process an advance.`,
    supplement: `Since the inspection, I\u2019ve found more damage that wasn\u2019t included in the claim:\n\n${extra || '[Describe what you found, where, and when you found it]'}\n\nI have dated photos and can send them. Please let me know how you\u2019d like to review this additional damage.`,
    complaint: (()=>{
      const st = stateOf(P), today = new Date().toISOString().slice(0,10);
      const log = (cl.log||[]).filter(x=>x && x.note).map(x=>`- ${fmtDay(x.at || x.date)}: ${x.note}`).join('\n');
      const missed = claimDeadlines(P).filter(x=>x.due && x.due < today && x.from!=='loss').map(x=>`- ${x.what.replace(/^Insurer/,'The insurer').replace(/\byour\b/g,'my').replace(/\byou\b/g,'me')} (due about ${fmtDay(x.due+'T12:00:00')}, ${x.n} ${UNIT[x.unit]} ${FROM_LABEL[x.from].replace('after you report','after I reported').replace('your proof','my proof')})`).join('\n');
      return `I\u2019m asking for the department\u2019s help with my insurance claim${pol && pol.carrier && !/^Your insurer/.test(pol.carrier) ? ' with '+pol.carrier : ''}.${cl.adjuster ? ` The adjuster assigned to my claim is ${cl.adjuster}${cl.adjPhone ? ' ('+cl.adjPhone+')' : ''}.` : ''}${cl.reportedOn ? ` I reported the claim on ${fmtDay(cl.reportedOn+'T12:00:00')}.` : ''}${cl.proofOn ? ` The company received my proof of loss on ${fmtDay(cl.proofOn+'T12:00:00')}.` : ''}\n\n`
        + `${extra || '[Describe the problem in a few sentences: for example, no response, no inspection, no estimate, or a payment you think is too low or late.]'}\n\n`
        + (missed ? `Based on the dates above, these time limits${st?' under '+STATE_NAME[st]+' rules':''} appear to have passed:\n${missed}\n\n` : '')
        + (log ? `My record of contacts with the company:\n${log}\n\n` : '')
        + `I can send copies of my photos, receipts, letters and claim packet. Please let me know what else you need from me. Thank you for your help.`;
    })(),
    policy: `Please send me a complete copy of my policy, including the declarations page and every form and endorsement that applies to it.\n\n${extra ? extra+'\n\n' : ''}Email is fine. Thank you.`
  }[kind];
  return `${dt}\n\n${to}\n\n${ref}\n\n${body}\n\n${sig}`;
}


/* ---------- Español: translates what's on screen using es.js. The app is written in English; when Spanish is on, every
   text and label is swapped as it appears, and swapped back when English is chosen. Letters and the claim packet stay English. */
const I18N = (()=>{
  const D = window.SF_ES || {}, exact = new Map(), tpl = [], cache = new Map(), missing = new Set(), done = new Set(Object.values(D)); window.SF_I18N_MISSING = missing; // checked by the tests
  const PAT = {N:'([$]?\\d[\\d,]*(?:\\.\\d+)?%?)', D:'((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \\d{1,2}, \\d{4})', S:'(.+?)', X:'(.+?)',
    M:'(January|February|March|April|May|June|July|August|September|October|November|December)'};
  for(const [k, v] of Object.entries(D)){
    if(!/\{[NDSXM]\}/.test(k)){ exact.set(k, v); continue; }
    const kinds = []; const re = k.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\?\{([NDSXM])\\?\}/g, (m, t)=>{ kinds.push(t); return PAT[t]; });
    tpl.push({re:new RegExp('^' + re + '$'), kinds, v, lit:k.replace(/\{[NDSXM]\}/g,'').length});
  }
  tpl.sort((a,b)=>b.lit - a.lit);
  const esDate = x => { const d = new Date(x); return isNaN(d) ? x : d.toLocaleDateString('es-US', {day:'numeric', month:'short', year:'numeric'}); };
  function tr(text){
    const key = String(text).replace(/\s+/g,' ').trim(); if(!key || !/[A-Za-z]/.test(key)) return text;
    if(cache.has(key)) return cache.get(key);
    if(done.has(key)) return key; // already Spanish
    let out = exact.has(key) ? exact.get(key) : null;
    if(out === null) for(const t of tpl){ const m = key.match(t.re); if(!m) continue;
      const vals = {N:[], D:[], S:[], X:[], M:[]}; t.kinds.forEach((k, i)=>vals[k].push(m[i+1]));
      const pos = {N:0, D:0, S:0, X:0, M:0};
      out = t.v.replace(/\{([NDSXM])\}/g, (z, k)=>{ let v = vals[k][pos[k]++]; if(v == null) v = ''; return k==='D' ? esDate(v) : (k==='N' ? v : (exact.get(v) != null ? exact.get(v) : v)); });
      break; }
    if(out === null){ out = key; missing.add(key); } else done.add(out);
    cache.set(key, out); return out;
  }
  const ORIG = new WeakMap(), ATTRS = ['placeholder','aria-label','title','alt'];
  const skip = el => !el || el.closest('textarea,script,style,[data-notr],.qr');
  function doText(n, on){
    if(skip(n.parentElement)) return;
    if(on){ const cur = n.nodeValue; if(!/[A-Za-z]/.test(cur)) return; const fixed = n.parentElement.getAttribute('data-es'); const t = fixed || tr(cur); /* data-es: a fixed Spanish word where the English is ambiguous */ if(t !== cur.replace(/\s+/g,' ').trim()){ const lead = cur.match(/^\s*/)[0], tail = cur.match(/\s*$/)[0];
        ORIG.set(n, cur); n.nodeValue = lead + t + tail; } }
    else if(ORIG.has(n)){ n.nodeValue = ORIG.get(n); ORIG.delete(n); }
  }
  function doAttrs(el, on){ if(skip(el)) return; for(const a of ATTRS){ const v = el.getAttribute(a); if(!v) continue;
    const k = 'data-en-' + a.replace('-','');
    if(on){ if(el.getAttribute(k) === null || el.getAttribute(k) !== v && tr(el.getAttribute(k)) !== v){ const t = tr(v); if(t !== v){ el.setAttribute(k, v); el.setAttribute(a, t); } } }
    else if(el.hasAttribute(k)){ el.setAttribute(a, el.getAttribute(k)); el.removeAttribute(k); } } }
  function walk(root, on){
    if(root.nodeType === 3){ doText(root, on); return; }
    if(root.nodeType !== 1) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; const list = []; while(n = w.nextNode()) list.push(n); list.forEach(x=>doText(x, on));
    doAttrs(root, on); root.querySelectorAll('[placeholder],[aria-label],[title],[alt]').forEach(e=>doAttrs(e, on));
  }
  let obs = null, busy = false;
  function set(lang){
    document.documentElement.lang = lang;
    if(lang === 'es'){
      walk(document.body, true);
      if(!obs){ obs = new MutationObserver(ms=>{ if(busy) return; busy = true; try{ for(const m of ms){
          if(m.type === 'characterData') doText(m.target, true);
          else if(m.type === 'attributes') doAttrs(m.target, true);
          else m.addedNodes.forEach(x=>walk(x, true)); } } finally { busy = false; } });
        obs.observe(document.body, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:ATTRS}); }
    } else { if(obs){ obs.disconnect(); obs = null; } walk(document.body, false); }
  }
  return {tr, set};
})();
const T = x => (S.lang === 'es' ? I18N.tr(x) : x);

/* ---------- Start screen ---------- */
function viewWelcome(){
  const mine = !S.sample || S.ownStarted;
  return `
  <div class="row" style="justify-content:flex-end" data-notr><button class="small-btn ghost" data-lang="${S.lang==='es'?'en':'es'}" lang="${S.lang==='es'?'en':'es'}">${S.lang==='es'?'English':'Español'}</button></div>
  <section class="stack" style="gap:10px;padding-top:8px">
    <p class="label">StormFile by Coastline Code</p>
    <h1 style="font-size:34px">Be claim-ready before the storm</h1>
    <p>StormFile explains your insurance in plain English, keeps a dated record of your home and belongings, and organizes your claim if a storm hits.</p>
  </section>
  <div class="card">
    <div class="task" style="border:0;padding:0"><span class="check done" aria-hidden="true">✓</span><div class="stack" style="gap:2px"><strong>Your information stays on this phone</strong><span class="small muted">No account and no sign-up. Nothing is uploaded or sold. Lock it with a PIN, ${BIOS()} and keep a locked backup.</span></div></div>
    <div class="task" style="border:0;padding:0"><span class="check done" aria-hidden="true">✓</span><div class="stack" style="gap:2px"><strong>Explains, doesn’t decide</strong><span class="small muted">StormFile helps you understand and organize. It doesn’t sell insurance, give insurance or legal advice, or decide what your policy covers. Confirm coverage with your agent or insurance company.</span></div></div>
    ${!TEST?'':`<div class="task" style="border:0;padding:0"><span class="check done" aria-hidden="true">✓</span><div class="stack" style="gap:2px"><strong>Test version</strong><span class="small muted">This is an early version shared for feedback, so things may change. StormFile, including its name, design and code, belongs to Coastline Code LLC. Please use it for testing and feedback only.</span></div></div>`}
  </div>
  <p class="small muted">By tapping “I agree” you confirm you understand the points above and accept the <a href="terms.html" target="_blank" rel="noopener">Terms of Use</a> and <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a>. Questions: info@coastlinecode.com</p>
  ${mine ? `<button class="primary" data-act="agree">I agree</button>` :
    `<button class="primary" data-act="agreeOwn">I agree — set up my home</button>
     <button data-act="agree">I agree — look around with sample data first</button>`}
  <p class="foot">StormFile is made by Coastline Code LLC, a veteran-owned company in Pass Christian, Mississippi.</p>`;
}

/* ---------- "What's this?" plain-English meanings of insurance words ---------- */
const GLOSS = {
  dec:['Declarations page','The 1–3 page summary at the front of your policy. It lists your coverage amounts, deductibles, policy number and dates. Your insurance company sends a new one every time the policy renews.'],
  deductible:['Deductible','The part of a claim you pay before insurance pays. It’s taken out of the claim payment.'],
  hurDed:['Hurricane or wind deductible','A separate deductible for wind or hurricane damage. It’s often a percentage of your house coverage, so 2% of $300,000 means you pay the first $6,000 of the damage.'],
  covA:['House coverage','The most the policy pays to repair or rebuild the house itself. On many policies it’s called Coverage A – Dwelling.'],
  rcacv:['Replacement cost or actual cash value','Replacement cost pays what it costs to buy a new item like the old one today. Actual cash value pays what the item was worth after wear and age, which is usually much less.'],
  ordinance:['Ordinance or law coverage','Pays the extra cost to rebuild to today’s building codes, like raising the house or new wiring, when the county requires it.'],
  ale:['Additional living expense','Extra costs while you can’t live at home because of covered damage, like a hotel and the extra cost of eating out. Only the amount above your normal spending counts, so keep every receipt.'],
  proof:['Proof of loss','A signed statement of what you’re claiming and how much. Some insurance companies ask for one, and flood (NFIP) policies require it by a deadline.'],
  lossDate:['Date of loss','The day the damage happened. For a hurricane, it’s usually the day the storm hit your area.'],
  claimNo:['Claim number','The number your insurance company gives you when you report the damage. Put it on every call, email and letter.'],
  adjuster:['Adjuster','The person the insurance company assigns to look at the damage and decide what it will pay. They work for the insurance company.'],
  pa:['Public adjuster','A licensed adjuster you hire to handle your claim. They work for you, not the insurance company, and usually charge a percentage of what the claim pays.'],
  nfip:['NFIP','The National Flood Insurance Program, run by FEMA. Most flood policies in the U.S. are NFIP policies, sold through regular insurance agents.'],
  endorsement:['Endorsement','A change or add-on to your policy that adds, removes or limits coverage.'],
  coins:['Coinsurance (the 80% rule)','A rule in many business policies: if the building is insured for less than 80% of what it would cost to rebuild, every claim is cut by the same share.'],
  bi:['Business income','Pays lost profit and the bills you keep paying while your business is closed for repairs from covered damage.'],
  lock:['Before-storm record','Everything you logged before the storm. Locking it freezes it, so the adjuster can see your list wasn’t made after the damage.']
};
const whats = (k, text) => `<button type="button" class="term" data-term="${k}">${esc(text)}</button>`;
const WHATS_Q = {hurDed:'How does a hurricane deductible work?', rcacv:'Replacement cost or used value: what\u2019s the difference?', ordinance:'What\u2019s ordinance or law coverage?', ale:'What counts as additional living expense?', proof:'What\u2019s a proof of loss?', lossDate:'What\u2019s the date of loss?', adjuster:'What does the adjuster do?', pa:'What\u2019s a public adjuster?', coins:'What\u2019s the 80% rule?'};
const whatsLink = k => `<button type="button" class="whats" data-term="${k}">${esc(WHATS_Q[k] || 'What\u2019s this?')}</button>`;
function showTerm(k){ const g = GLOSS[k]; if(!g) return; closeTerm();
  const ov = document.createElement('div'); ov.className = 'overlay viewer termsheet'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true'); ov.setAttribute('aria-labelledby','termT');
  ov.innerHTML = `<div class="viewer-box"><h2 id="termT">${esc(g[0])}</h2><p>${esc(g[1])}</p><button class="primary" data-closeterm="1">Got it</button></div>`;
  ov.addEventListener('click', e=>{ if(e.target===ov || e.target.closest('[data-closeterm]')) closeTerm(); });
  document.body.appendChild(ov); const b = ov.querySelector('[data-closeterm]'); b.focus(); }
let termFrom = null;
function closeTerm(){ const o = document.querySelector('.termsheet'); if(o){ o.remove(); if(termFrom && termFrom.isConnected) termFrom.focus(); } }
function wordsToKnow(){ return sec('words', 'Words to know', '', Object.entries(GLOSS).map(([k,[t,d]])=>`<div class="res"><strong>${esc(t)}</strong><span class="small">${esc(d)}</span></div>`).join('')); }
/* ---------- State and national help (checked against official sites, Nov 2026) ----------
   Insurance departments: NAIC insurance department directory (content.naic.org), with Gulf states, FL, TX, VA, WA, WV, WI, WY
   confirmed on the department's own site. Emergency agencies: each agency's official .gov site. Keep RES_CHECKED current. */
const RES_CHECKED = 'November 2026';
const RES_INS = { // state: [department, website, consumer phone, complaint page (optional)]
  AL:['Alabama Department of Insurance','https://aldoi.gov','1-800-433-3966','https://aldoi.gov/Consumers/FileComplaint.aspx'],
  AK:['Alaska Division of Insurance','https://insurance.alaska.gov','1-800-467-8725'],
  AZ:['Arizona Department of Insurance and Financial Institutions','https://difi.az.gov','602-364-3100'],
  AR:['Arkansas Insurance Department','https://insurance.arkansas.gov','1-800-852-5494'],
  CA:['California Department of Insurance','https://www.insurance.ca.gov','1-800-927-4357'],
  CO:['Colorado Division of Insurance','https://doi.colorado.gov','303-894-7490'],
  CT:['Connecticut Insurance Department','https://portal.ct.gov/cid','1-800-203-3447'],
  DE:['Delaware Department of Insurance','https://insurance.delaware.gov','1-800-282-8611'],
  DC:['DC Department of Insurance, Securities and Banking','https://disb.dc.gov','202-727-8000'],
  FL:['Florida Department of Financial Services, Insurance Consumer Helpline','https://www.myfloridacfo.com/division/consumers','1-877-693-5236','https://www.myfloridacfo.com/division/consumers/needourhelp'],
  GA:['Georgia Office of Insurance and Safety Fire Commissioner','https://oci.georgia.gov','1-800-656-2298'],
  HI:['Hawaii Insurance Division','https://cca.hawaii.gov/ins/','808-586-2790'],
  ID:['Idaho Department of Insurance','https://doi.idaho.gov','1-800-721-3272'],
  IL:['Illinois Department of Insurance','https://insurance.illinois.gov','217-782-4515'],
  IN:['Indiana Department of Insurance','https://www.in.gov/idoi/','1-800-622-4461'],
  IA:['Iowa Insurance Division','https://iid.iowa.gov','1-877-955-1212'],
  KS:['Kansas Department of Insurance','https://insurance.kansas.gov','1-800-432-2484'],
  KY:['Kentucky Department of Insurance','https://insurance.ky.gov','1-800-595-6053'],
  LA:['Louisiana Department of Insurance','https://www.ldi.la.gov','1-800-259-5300','https://www.ldi.la.gov/OnlineServices/ConsumerComplaintForm/Complaints'],
  ME:['Maine Bureau of Insurance','https://www.maine.gov/pfr/insurance/home','1-800-300-5000'],
  MD:['Maryland Insurance Administration','https://insurance.maryland.gov','1-800-492-6116'],
  MA:['Massachusetts Division of Insurance','https://www.mass.gov/orgs/division-of-insurance','617-521-7777'],
  MI:['Michigan Department of Insurance and Financial Services','https://www.michigan.gov/difs','517-284-8800'],
  MN:['Minnesota Department of Commerce','https://mn.gov/commerce','651-539-1500'],
  MS:['Mississippi Insurance Department','https://www.mid.ms.gov','1-800-562-2957','https://www.mid.ms.gov/consumers/request-assistance.aspx'],
  MO:['Missouri Department of Commerce and Insurance','https://dci.mo.gov','573-751-4126'],
  MT:['Montana Commissioner of Securities and Insurance','https://csimt.gov','1-800-332-6148'],
  NE:['Nebraska Department of Insurance','https://doi.nebraska.gov','1-877-564-7323'],
  NV:['Nevada Division of Insurance','https://doi.nv.gov','1-888-872-3234'],
  NH:['New Hampshire Insurance Department','https://www.nh.gov/insurance/','1-800-852-3416'],
  NJ:['New Jersey Department of Banking and Insurance','https://www.state.nj.us/dobi/index.html','1-800-446-7467'],
  NM:['New Mexico Office of Superintendent of Insurance','https://www.osi.state.nm.us','1-855-427-5674'],
  NY:['New York State Department of Financial Services','https://www.dfs.ny.gov','1-800-342-3736'],
  NC:['North Carolina Department of Insurance','https://www.ncdoi.gov','1-855-408-1212'],
  ND:['North Dakota Insurance and Securities Department','https://insurance.nd.gov','1-800-247-0560'],
  OH:['Ohio Department of Insurance','https://insurance.ohio.gov','1-800-686-1526'],
  OK:['Oklahoma Insurance Department','https://www.ok.gov/oid/','1-800-522-0071'],
  OR:['Oregon Division of Financial Regulation','https://dfr.oregon.gov','1-888-877-4894'],
  PA:['Pennsylvania Insurance Department','https://www.insurance.pa.gov','1-877-881-6388'],
  RI:['Rhode Island Division of Insurance','https://dbr.ri.gov/insurance-overview','401-462-9520'],
  SC:['South Carolina Department of Insurance','https://doi.sc.gov','1-800-768-3467'],
  SD:['South Dakota Division of Insurance','https://dlr.sd.gov/insurance','605-773-3563'],
  TN:['Tennessee Department of Commerce and Insurance','https://www.tn.gov/commerce/','1-800-342-4029'],
  TX:['Texas Department of Insurance','https://www.tdi.texas.gov','1-800-252-3439','https://www.tdi.texas.gov/consumer/get-help-with-an-insurance-complaint.html'],
  UT:['Utah Insurance Department','https://insurance.utah.gov','1-800-439-3805'],
  VT:['Vermont Department of Financial Regulation','https://dfr.vermont.gov','802-828-3301'],
  VA:['Virginia Bureau of Insurance','https://scc.virginia.gov/boi/consumerinquiry','1-877-310-6560'],
  WA:['Washington Office of the Insurance Commissioner','https://www.insurance.wa.gov','1-800-562-6900'],
  WV:['West Virginia Offices of the Insurance Commissioner','https://www.wvinsurance.gov','1-888-879-9842'],
  WI:['Wisconsin Office of the Commissioner of Insurance','https://oci.wi.gov','1-800-236-8517'],
  WY:['Wyoming Department of Insurance','https://doi.wyo.gov','307-777-7402'],
};
const RES_EM = { // state: [emergency management agency, website]
  AL:['Alabama Emergency Management Agency','https://ema.alabama.gov'],
  AK:['Alaska Division of Homeland Security and Emergency Management','https://ready.alaska.gov'],
  AZ:['Arizona Department of Emergency and Military Affairs','https://dema.az.gov/emergency-management'],
  AR:['Arkansas Division of Emergency Management','https://dps.arkansas.gov/emergency-management/adem/'],
  CA:['California Governor’s Office of Emergency Services','https://www.caloes.ca.gov'],
  CO:['Colorado Division of Homeland Security and Emergency Management','https://dhsem.colorado.gov'],
  CT:['Connecticut Division of Emergency Management and Homeland Security','https://portal.ct.gov/demhs'],
  DE:['Delaware Emergency Management Agency','https://dema.delaware.gov'],
  DC:['DC Homeland Security and Emergency Management Agency','https://hsema.dc.gov'],
  FL:['Florida Division of Emergency Management','https://www.floridadisaster.org'],
  GA:['Georgia Emergency Management and Homeland Security Agency','https://gema.georgia.gov'],
  HI:['Hawaii Emergency Management Agency','https://dod.hawaii.gov/hiema/'],
  ID:['Idaho Office of Emergency Management','https://ioem.idaho.gov'],
  IL:['Illinois Emergency Management Agency and Office of Homeland Security','https://iemaohs.illinois.gov'],
  IN:['Indiana Department of Homeland Security','https://www.in.gov/dhs/'],
  IA:['Iowa Department of Homeland Security and Emergency Management','https://homelandsecurity.iowa.gov'],
  KS:['Kansas Division of Emergency Management','https://www.kansastag.gov/101/KDEM'],
  KY:['Kentucky Emergency Management','https://kyem.ky.gov'],
  LA:['Governor’s Office of Homeland Security and Emergency Preparedness (GOHSEP)','https://gohsep.la.gov'],
  ME:['Maine Emergency Management Agency','https://www.maine.gov/mema'],
  MD:['Maryland Department of Emergency Management','https://mdem.maryland.gov'],
  MA:['Massachusetts Emergency Management Agency','https://www.mass.gov/mema'],
  MI:['Michigan State Police, Emergency Management and Homeland Security Division','https://www.michigan.gov/msp/divisions/emhsd'],
  MN:['Minnesota Homeland Security and Emergency Management','https://dps.mn.gov/divisions/hsem'],
  MS:['Mississippi Emergency Management Agency (MEMA)','https://www.msema.org'],
  MO:['Missouri State Emergency Management Agency','https://sema.dps.mo.gov'],
  MT:['Montana Disaster and Emergency Services','https://des.mt.gov'],
  NE:['Nebraska Emergency Management Agency','https://nema.nebraska.gov'],
  NV:['Nevada Office of Emergency Management / Homeland Security','https://www.oem.nv.gov'],
  NH:['New Hampshire Homeland Security and Emergency Management','https://www.nh.gov/safety/divisions/hsem/'],
  NJ:['New Jersey Office of Emergency Management','https://www.nj.gov/njoem/'],
  NM:['New Mexico Department of Homeland Security and Emergency Management','https://www.dhsem.nm.gov'],
  NY:['New York State Division of Homeland Security and Emergency Services','https://www.dhses.ny.gov'],
  NC:['North Carolina Emergency Management','https://www.ncdps.gov/our-organization/emergency-management'],
  ND:['North Dakota Department of Emergency Services','https://www.des.nd.gov'],
  OH:['Ohio Emergency Management Agency','https://ema.ohio.gov'],
  OK:['Oklahoma Department of Emergency Management and Homeland Security','https://oklahoma.gov/oem'],
  OR:['Oregon Department of Emergency Management','https://www.oregon.gov/oem'],
  PA:['Pennsylvania Emergency Management Agency','https://www.pa.gov/agencies/pema'],
  RI:['Rhode Island Emergency Management Agency','https://riema.ri.gov'],
  SC:['South Carolina Emergency Management Division','https://www.scemd.org'],
  SD:['South Dakota Office of Emergency Management','https://dps.sd.gov/emergency-services/emergency-management'],
  TN:['Tennessee Emergency Management Agency','https://www.tn.gov/tema'],
  TX:['Texas Division of Emergency Management','https://tdem.texas.gov'],
  UT:['Utah Division of Emergency Management','https://dem.utah.gov'],
  VT:['Vermont Emergency Management','https://vem.vermont.gov'],
  VA:['Virginia Department of Emergency Management','https://www.vdem.virginia.gov'],
  WA:['Washington Emergency Management Division','https://mil.wa.gov/emergency-management-division'],
  WV:['West Virginia Emergency Management Division','https://emd.wv.gov'],
  WI:['Wisconsin Emergency Management','https://wem.wi.gov'],
  WY:['Wyoming Office of Homeland Security','https://hls.wyo.gov'],
};
const RES_MORE = { // extra state programs worth knowing on the coast: [name, what it is, website, phone]
  MS:[['Strengthen Mississippi Homes','Grants of up to $10,000 toward a FORTIFIED roof for owner-occupied, single-family primary homes.','https://www.mid.ms.gov/mississippi-insurance-department/preparedness/mitigation/smh/'],
      ['Mississippi Windstorm Underwriting Association','The state’s wind pool for coastal homes. If your wind coverage is a separate MWUA policy, report wind damage to it.','https://msplans.com/mwua']],
  AL:[['Strengthen Alabama Homes','State program that helps pay for FORTIFIED roofs. Run by the Alabama Department of Insurance.','https://aldoi.gov/SAH/Home.aspx','1-800-433-3966']],
  LA:[['Louisiana Fortify Homes Program','State grants toward a FORTIFIED roof, run by the Louisiana Department of Insurance.','https://ldi.la.gov/fortifyhomes']],
  TX:[['Texas Windstorm Insurance Association (TWIA)','Wind and hail coverage for the Texas coast. File TWIA claims online or by phone.','https://www.twia.org/claims/','1-800-788-8247']],
  FL:[['Citizens Property Insurance','Florida’s state-backed insurer. Claims line is open 24 hours a day.','https://citizensfla.com/report-a-claim','1-866-411-2742']],
};
const RES_NATIONAL = [
  ['FEMA disaster assistance','After a declared disaster, apply for help with temporary housing and repairs insurance doesn’t cover. Helpline 7 a.m. to 11 p.m. Eastern, every day.','https://www.disasterassistance.gov','1-800-621-3362'],
  ['SBA disaster loans','Low-interest disaster loans for homeowners and renters as well as businesses. 8 a.m. to 8 p.m. Eastern, weekdays.','https://www.sba.gov/funding-programs/disaster-assistance','1-800-659-2955'],
  ['Flood insurance (NFIP)','Questions about a flood policy or finding your flood insurer. For a claim, call the company on your flood policy. Flood policies usually require a signed proof of loss within 60 days, so ask your insurer for your deadline.','https://www.floodsmart.gov','1-877-336-2627'],
  ['National Hurricane Center','Official hurricane forecasts and warnings.','https://www.hurricanes.gov'],
  ['Ready.gov','Federal checklists for getting ready for every kind of disaster.','https://www.ready.gov'],
];
const telHref = ph => 'tel:+1' + String(ph).replace(/\D/g,'').replace(/^1(?=\d{10}$)/,'');
const extLink = (url, text) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(text || url.replace(/^https?:\/\/(www\.)?/,'').split('/')[0])}</a>`;
const telLink = ph => `<a class="tel" href="${esc(telHref(ph))}">${esc(ph)}</a>`;
function resItem(name, what, url, phone){
  return `<div class="res"><strong>${esc(name)}</strong>${what?`<span class="small">${esc(what)}</span>`:''}
    <div class="res-links small">${phone?telLink(phone):''}${url?extLink(url):''}</div></div>`;
}

function viewResources(){
  const P = cur(), st = stateOf(P), ins = RES_INS[st], em = RES_EM[st], more = RES_MORE[st] || [];
  return `
  <section class="stack"><p class="label">${esc(P.name)} · help and resources</p><h1>${st ? 'Help in ' + esc(STATE_NAME[st]) : 'Help and resources'}</h1></section>
  ${!st ? `<div class="card" style="border-color:var(--amber)"><h2>Where is this property?</h2>
    <p class="small">Pick the state for ${esc(P.name)} to see its insurance department and emergency agency.</p>
    <label class="field">State<select id="pState">${stateOptions('')}</select></label></div>` : `
  <div class="card">
    <div class="row"><h2>Insurance department</h2><button class="src" data-act="changeState">Change state</button></div>
    <p class="small">If your claim stalls, you can’t get answers, or you think you’re being treated unfairly, the state insurance department can step in. Call first with your policy and claim numbers ready, or file a complaint online.</p>
    ${resItem(ins[0], '', ins[1], ins[2])}
    ${ins[3] ? `<a class="btn-like" href="${esc(ins[3])}" target="_blank" rel="noopener noreferrer">File a complaint online</a>` : ''}
    <p class="small muted">Give them your claim number, the adjuster’s name, and the dates from your Claim tab call log. The claim packet has all of it in one file.</p>
  </div>
  <div class="card">
    <h2>Emergency management</h2>
    <p class="small">Evacuation orders, shelters, and disaster declarations for ${esc(STATE_NAME[st])}. In an emergency, call 911.</p>
    ${resItem(em[0], '', em[1])}
  </div>
  ${more.length ? `<div class="card"><h2>Also in ${esc(STATE_NAME[st])}</h2>${more.map(m=>resItem(m[0], m[1], m[2], m[3])).join('')}</div>` : ''}`}
  <div class="card">
    <h2>National help</h2>
    ${RES_NATIONAL.map(m=>resItem(m[0], m[1], m[2], m[3])).join('')}
  </div>
  ${wordsToKnow()}
  <p class="small muted" style="padding:0 4px">StormFile isn\u2019t a government app and isn\u2019t connected to or approved by any government agency. Each contact above comes from that agency\u2019s own official website, linked with it.</p>
  <p class="small muted" style="padding:0 4px">Checked against official websites in ${RES_CHECKED}. Phone numbers and programs can change. If a number doesn’t work, use the website, and please <a href="mailto:info@coastlinecode.com?subject=${encodeURIComponent('StormFile: wrong contact for ' + (STATE_NAME[st]||'a state'))}">tell us</a>. StormFile isn’t connected to any of these agencies.</p>`;
}

/* ---------- Claim deadlines by state (checked against official sources, Nov 2026) ----------
   from: 'reported' = day you reported the claim, 'proof' = day the insurer got your proof of loss / what it asked for, 'loss' = date of loss.
   unit: 'd' calendar days, 'bd' business days (weekends skipped; holidays not counted, so the real date can be a little later). */
const CLAIM_RULES = {
  TX:{src:[['Texas Department of Insurance','https://tdi.texas.gov/tips/getting-your-insurance-claim-paid.html'],['TWIA','https://www.twia.org/claims/']], items:[
    {from:'reported', n:15, unit:'bd', what:'Insurer must acknowledge your claim, start its review and ask for anything it needs'},
    {from:'proof', n:15, unit:'bd', what:'Insurer must tell you whether it will pay. It can take 45 more days if it tells you why'},
    {note:'Once it agrees to pay, it has 5 business days to pay. After a weather catastrophe, TDI can extend these deadlines by 15 days.'},
    {from:'loss', n:365, unit:'d', what:'TWIA wind policies: last day to report the claim', wind:true}]},
  FL:{src:[['Florida Statutes 627.70131','https://m.flsenate.gov/statutes/627.70131'],['Florida Statutes 627.70132','https://flsenate.gov/laws/statutes/2025/627.70132']], items:[
    {from:'reported', n:7, unit:'d', what:'Insurer must acknowledge your claim'},
    {from:'proof', n:7, unit:'d', what:'Insurer must start its investigation'},
    {from:'proof', n:30, unit:'d', what:'Any physical inspection must be done'},
    {from:'reported', n:60, unit:'d', what:'Insurer must pay or deny the claim, or the part in question, in writing'},
    {note:'The insurer must send you any detailed estimate within 7 days after its adjuster makes it.'},
    {from:'loss', n:365, unit:'d', what:'Last day to give notice of a new or reopened claim'},
    {from:'loss', n:18, unit:'mo', what:'Last day to give notice of a supplemental claim'},
    {note:'For hurricanes and other storms, the date of loss is the day the storm made landfall or the date NOAA verifies.'}]},
  LA:{src:[['Louisiana R.S. 22:1892','https://legis.la.gov/Legis/Law.aspx?d=509041']], items:[
    {from:'reported', n:14, unit:'d', what:'Insurer must start adjusting the loss (30 days after a catastrophic loss)'},
    {from:'proof', n:30, unit:'d', what:'Insurer must pay what it owes and make a written offer to settle'},
    {note:'If you ask in writing, the insurer must give you a copy of the field adjuster’s report within 15 days.'}]},
  AL:{src:[['Alabama Admin. Code 482-1-125','https://admincode.legislature.state.al.us/api/rule/482-1-125-.07']], items:[
    {from:'reported', n:15, unit:'d', what:'Insurer must acknowledge your claim and send any forms you need'},
    {from:'proof', n:30, unit:'d', what:'Insurer must accept or deny the claim, or tell you in writing why it needs more time (unless your policy sets a different time)'},
    {note:'Once it accepts the claim and agrees on the amount, it has 30 days to pay (or the time in your policy). It must answer your letters within 15 days.'}]},
  MS:{none:'StormFile hasn’t found day-by-day deadlines for home insurance claims in Mississippi’s rules. Check the conditions section of your policy, and call the Mississippi Insurance Department if your claim stalls.'}
};
const NFIP_RULE = {from:'loss', n:60, unit:'d', what:'Flood (NFIP) policies: signed proof of loss due, unless FEMA extends it', src:['FEMA','https://www.fema.gov/fact-sheet/submit-flood-insurance-proof-loss-form-within-60-days-loss']};
function addBizDays(iso, n){ const d = new Date(iso+'T12:00:00'); let k = 0; while(k < n){ d.setDate(d.getDate()+1); const w = d.getDay(); if(w && w<6) k++; } return d.toISOString().slice(0,10); }
function ruleDue(cl, r){ const base = {reported:cl.reportedOn, proof:cl.proofOn, loss:cl.dateOfLoss}[r.from]; if(!base) return ''; return r.unit==='bd' ? addBizDays(base, r.n) : r.unit==='mo' ? addMonths(base, r.n) : addDays(base, r.n); }
function addMonths(ymd, n){ const d = at9(ymd), day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth()+n); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth()+1, 0).getDate())); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
const UNIT = {d:'days', bd:'business days', mo:'months'};
const FROM_LABEL = {reported:'after you report the claim', proof:'after the insurer gets your proof of loss', loss:'after the date of loss'};
function claimDeadlines(P){
  const st = stateOf(P), R = CLAIM_RULES[st], cl = P.claim, out = [];
  if(R && R.items) R.items.forEach(r=>{ if(r.note){ out.push({note:r.note}); return; } out.push({...r, due:ruleDue(cl, r)}); });
  if(P.info.flood !== 'no') out.push({...NFIP_RULE, due:ruleDue(cl, NFIP_RULE)});
  return out;
}
function deadlinesCard(P){
  const st = stateOf(P), R = CLAIM_RULES[st], cl = P.claim, list = claimDeadlines(P), today = new Date().toISOString().slice(0,10);
  const dated = list.filter(x=>x.due);
  const next = dated.filter(x=>x.due >= today).sort((a,b)=>a.due<b.due?-1:1)[0];
  return sec('deadlines', `Deadlines${st?' in '+esc(STATE_NAME[st]):''}`, next ? `<span class="sec-n">Next: ${esc(fmtDay(next.due+'T12:00:00'))}</span>` : '', `<div class="stack" id="deadlines">
    <p class="small">Time limits the law sets for your insurance company, and a few for you. Enter your dates and StormFile works out each due date.</p>
    <div class="grid2">
      <label class="field">Day you reported the claim<input id="clReported" type="date" value="${esc(cl.reportedOn||'')}"></label>
      <label class="field">Day they got your proof of loss<input id="clProof" type="date" value="${esc(cl.proofOn||'')}"></label>
    </div>
    ${whatsLink('proof')}
    ${R && R.none ? `<p class="small">${esc(R.none)}</p>` : ''}
    ${!R && st ? `<p class="small">StormFile doesn’t list ${esc(STATE_NAME[st])}’s claim deadlines yet. Ask the ${esc((RES_INS[st]||[])[0]||'state insurance department')} what applies to your claim.</p>` : ''}
    ${list.map(x=> x.note ? `<p class="small muted">${esc(x.note)}</p>` : `<div class="dl ${x.due && x.due < today ? 'past' : ''}">
      <span class="dl-when num">${x.due ? esc(fmtDay(x.due+'T12:00:00')) : '—'}</span>
      <span class="small"><strong>${esc(x.what)}</strong><br><span class="muted">${x.n} ${UNIT[x.unit]} ${FROM_LABEL[x.from]}${x.due?'':' (enter that date above)'}</span></span></div>`).join('')}
    ${dated.length ? `<button class="small-btn" data-act="calDeadlines">Add these dates to my calendar</button>` : ''}
    <p class="small muted">Business-day dates skip weekends but not holidays, so the real date can be a little later. Insurers can sometimes take longer if they tell you why in writing. This is general information, not legal advice. Sources: ${[...(R&&R.src||[]), ...(P.info.flood!=='no'?[NFIP_RULE.src]:[])].map(([t,u])=>extLink(u,t)).join(', ')||'none'}.</p>
  </div>`);
}


/* ---------- Household sharing: a locked copy goes phone to phone; the code to open it is shown as a QR code ----------
   Nothing is uploaded. The file travels however the person sends it (AirDrop, Nearby Share, text, email), and the code that
   unlocks it is only on the sender's screen, so the file alone is useless to anyone else. */
let shareShown = null; // {code, svg} for the copy just sent; kept only while StormFile is open
function loadLib(src, ready){ if(ready()) return Promise.resolve(ready());
  return new Promise((res, rej)=>{ const sc = document.createElement('script'); sc.src = src; sc.onload = () => ready() ? res(ready()) : rej(new Error(src)); sc.onerror = () => rej(new Error(src)); document.head.appendChild(sc); }); }
const loadQrMaker = () => loadLib('vendor/qrcode.js', () => window.qrcode);
const loadQrReader = () => loadLib('vendor/jsQR.js', () => window.jsQR);
const SHARE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function shareCodeNew(){ let s = ''; while(s.length < 16){ for(const x of crypto.getRandomValues(new Uint8Array(24))){ if(x < 256 - 256 % SHARE_ABC.length && s.length < 16) s += SHARE_ABC[x % SHARE_ABC.length]; } } return s.match(/.{4}/g).join('-'); }
function shareCodeClean(x){ const s = String(x||'').toUpperCase().replace(/^STORMFILE-SHARE:/,'').replace(/[^A-Z0-9]/g,''); return s.length===16 ? s.match(/.{4}/g).join('-') : ''; }
async function makeShare(ids, code){
  save(); const props = S.properties.filter(P=>ids.includes(P.id)).map(P=>Object.assign(JSON.parse(JSON.stringify(P)), {origin: P.origin || P.id}));
  const polIds = new Set(props.map(P=>P.policyId).filter(Boolean));
  const pols = S.policies.filter(po=>polIds.has(po.id)).map(po=>Object.assign(JSON.parse(JSON.stringify(po)), {origin: po.origin || po.id}));
  const files = {};
  for(const id of fileIdsInState({properties:props})){ try{ const r = await getFile(id); if(r && r.blob) files[id] = {name:r.name, type:r.type, w:r.w, h:r.h, b64:u8ToB64(new Uint8Array(await r.blob.arrayBuffer()))}; }catch(e){} }
  const text = await sealJson({app:'StormFile', kind:'share', made:nowISO(), from:(S.me||{}).name||'', properties:props, policies:pols, files}, code.replace(/-/g,''));
  return new Blob([text], {type:'application/json'});
}
async function openShare(text, code){
  let v; try{ v = await openJson(text, code.replace(/-/g,'')); }catch(e){ throw new Error(/backup file/.test(e.message||'') ? 'That isn’t a StormFile shared copy. Choose the file that was sent to you.' : 'That code doesn’t open this file. Check the code, or ask for it to be shared again.'); }
  if(!v || v.kind !== 'share' || !Array.isArray(v.properties)) throw new Error(v && v.state ? 'That’s a backup, not a shared copy. Use “Restore from a backup” for it.' : 'That shared copy is missing its records.');
  return v;
}
async function addShare(v){
  for(const [id, f] of Object.entries(v.files||{})){ await putFile({id, name:f.name, type:f.type, w:f.w, h:f.h, blob:new Blob([b64ToU8(f.b64)], {type:f.type}), at:nowISO()}); }
  if(S.sample){ S.properties = []; S.policies = []; S.sample = false; S.ownStarted = true; S.threat = 'none'; }
  const polMap = {};
  (v.policies||[]).forEach(po=>{ const old = po.id, mine = S.policies.find(x=>(x.origin||x.id)===po.origin);
    if(mine){ const keep = mine.id; Object.assign(mine, po, {id:keep}); polMap[old] = keep; } else { const nid = uid(); S.policies.push(Object.assign(po, {id:nid})); polMap[old] = nid; } });
  let added = 0, updated = 0; const who = v.from ? ' from ' + v.from : '';
  v.properties.forEach(P=>{ P.policyId = P.policyId ? (polMap[P.policyId] || null) : null;
    const i = S.properties.findIndex(x=>(x.origin||x.id)===P.origin);
    if(i >= 0){ P.id = S.properties[i].id; S.properties[i] = P; updated++; } else { P.id = uid(); S.properties.push(P); added++; }
    logEvt(P, `Shared copy received${who} (made ${fmtDay(v.made)})`); });
  S.current = (S.properties.find(x=>x.origin===v.properties[0].origin) || S.properties[0]).id;
  load2(); save(); return {added, updated};
}
function shareCard(){
  const mine = hasRealData(), many = S.properties.length > 1;
  return sec('set-share', 'Share with your household', '', `<div class="stack" id="shareCard">
    <p class="small">Give a spouse, family member or co-owner their own copy of your records, photos and receipts. It goes from your phone to theirs. Nothing is uploaded, and there’s no account.</p>
    ${shareShown ? `<div class="stack" style="align-items:center;text-align:center">
        <p class="small"><strong>Step 2.</strong> On their phone, open StormFile → Settings → “Open a shared copy.” They choose the file you sent, then scan this code.</p>
        <div class="qr" role="img" aria-label="QR code with the code below">${shareShown.svg}</div>
        <p class="num" style="font-size:20px;letter-spacing:1px" aria-label="Code ${esc(shareShown.code.split('').join(' '))}">${esc(shareShown.code)}</p>
        <p class="small muted">They can also type the code. Only someone with both the file and this code can open the copy. This is a copy as of today. Share again after big changes, and their phone updates the same places instead of adding new ones.</p>
        <button class="small-btn ghost" data-act="shareDone">Done</button></div>`
    : !mine ? `<p class="small muted">Add your own property first. Sample data can’t be shared.</p>`
    : `${many ? `<fieldset class="stack" style="border:0;padding:0;margin:0"><legend class="small">Places to share</legend>${S.properties.map(P=>`<label class="check-row"><input type="checkbox" data-shareprop="${esc(P.id)}" checked> ${esc(P.name)}</label>`).join('')}</fieldset>` : ''}
      <button class="primary" data-act="shareMake">Share my records</button>
      <p class="small muted"><strong>Step 1</strong> sends a locked file. Pick AirDrop, Nearby Share, a text or an email. <strong>Step 2</strong> shows the code that opens it.</p>`}
    <details ${S.shareOpen?'open':''} data-sharerecv><summary class="src" style="display:inline">Open a shared copy someone sent you</summary>
      <div class="stack" style="margin-top:8px">
        <label class="upload">1. Choose the file they sent<input type="file" id="shFile" accept=".json,application/json"></label>
        <label class="upload">2. Scan their code with your camera<input type="file" id="shScan" accept="image/*" capture="environment"></label>
        <label class="field">Or type the code<input id="shCode" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX"></label>
        <button class="primary" data-act="shareOpen">Add to this phone</button>
        <p class="small muted">Places you already have from them are updated. Everything else on this phone stays as it is.</p>
      </div></details>
  </div>`);
}

/* ---------- Settings screen ---------- */
function viewSettings(){
  const on = !!pinRec(), bio = !!bioRec(), me = S.me || {}, due = backupDue();
  return `
  <section class="stack"><p class="label">StormFile</p><h1>Settings</h1></section>

  <div class="card" id="langCard" data-notr>
    <h2>${S.lang==='es'?'Idioma':'Language'}</h2>
    <div class="levels" style="grid-template-columns:repeat(2,minmax(0,1fr))"><button data-lang="en" aria-pressed="${S.lang!=='es'}" lang="en">English</button><button data-lang="es" aria-pressed="${S.lang==='es'}" lang="es">Español</button></div>
    <p class="small muted">${S.lang==='es'?'StormFile en inglés o en español. Las cartas y el paquete del reclamo se quedan en inglés porque van a su compañía de seguros.':'StormFile in English or Spanish. Letters and the claim packet stay in English because they go to your insurance company.'}</p>
  </div>

  ${sec('set-lock', 'Lock', `<span class="chip ${on?'ok':'warn'}">${on?(bio?'PIN + '+BIONAME():'PIN on'):'Off'}</span>`, `<div class="stack" id="lockCard">
    <p class="small">${on ? (bio ? `StormFile opens with ${BIONAME()}. If that doesn’t work, it asks for your PIN.` : 'StormFile asks for your PIN each time it opens, and after a minute away.') : 'Set a PIN so nobody else can open your policy, photos and claim on this phone. Then you can add ' + BIOS() + '.'}</p>
    <div class="grid2">
      <label class="field">${on?'New PIN':'PIN'} (4–8 digits)<input id="pin1" type="password" inputmode="numeric" autocomplete="new-password"></label>
      <label class="field">Type it again<input id="pin2" type="password" inputmode="numeric" autocomplete="new-password"></label>
    </div>
    <button class="primary" data-act="pinSave">${on?'Change PIN':'Set PIN'}</button>
    ${on?`<button class="ghost" data-act="bioToggle" ${BIO_OK?'':'hidden'}>${bio?'Turn off '+BIONAME():'Turn on '+BIONAME()}</button>
      ${BIO_OK?'':`<p class="small muted">${BIONAME()[0].toUpperCase()+BIONAME().slice(1)} works when StormFile is opened from its icon on your home screen.</p>`}
      <button class="ghost" data-act="pinClear">Turn off the lock</button>`:''}
  </div>`)}

  ${shareCard()}

  ${sec('set-backup', 'Backup', `<span class="chip ${due?'warn':'ok'}">${S.lastBackupAt?'Last: '+fmtDay(S.lastBackupAt):'None yet'}</span>`, `
    <p class="small">Your records live only on this phone. If a storm takes the phone, they go with it. A backup is one locked file with everything, including full-size photos and receipts. Save it to ${CLOUD()} or email it to yourself.</p>
    ${due?`<div class="alert warn" style="background:var(--bg)"><p class="small">${esc(due)}</p></div>`:''}
    <label class="field"><span><strong>Step 1.</strong> Make up a passphrase you\u2019ll remember (8 or more characters)</span><input id="bk1" type="password" autocomplete="new-password"></label>
    <label class="field"><span><strong>Step 2.</strong> Type it again</span><input id="bk2" type="password" autocomplete="new-password"></label>
    <p class="small muted">Write the passphrase down somewhere safe. Without it, nobody can open the backup, including us.</p>
    <p class="small"><strong>Step 3.</strong> Tap the button, then choose ${PLAT==='ios'?'Save to Files (pick iCloud Drive) or Mail':PLAT==='android'?'Drive or your email app':'iCloud Drive, Google Drive or email'}.</p>
    <button class="primary" data-act="bkMake">Save a locked backup</button>
    <details><summary class="src" style="display:inline">Restore from a backup</summary>
      <div class="stack" style="margin-top:8px">
        <label class="upload">Choose the backup file<input type="file" id="rsFile" accept=".json,application/json"></label>
        <label class="field">Passphrase<input id="rsPass" type="password" autocomplete="current-password"></label>
        <button class="primary" data-act="rsGo">Unlock and restore</button>
        <p class="small muted">Restoring replaces everything on this phone with what\u2019s in the backup.</p>
      </div></details>`, {open: !!due, style: due?'border-color:var(--amber)':''})}

  ${sec('set-me', 'About you', me.name?`<span class="sec-n">${esc(me.name)}</span>`:'', `
    <p class="small muted">Used on your letters and claim packet. Saved only on this phone.</p>
    <label class="field">Your name<input id="me-name" value="${esc(me.name||'')}" autocomplete="name"></label>
    <div class="grid2">
      <label class="field">Phone<input id="me-phone" type="tel" value="${esc(me.phone||'')}" autocomplete="tel"></label>
      <label class="field">Email<input id="me-email" type="email" value="${esc(me.email||'')}" autocomplete="email"></label>
    </div>
    <label class="field">Mailing address (if you’re not at home)<input id="me-mail" value="${esc(me.mail||'')}" autocomplete="street-address"></label>`)}

  <button class="card linkcard" data-go="resources"><div class="stack" style="gap:2px;min-width:0"><strong>Help and resources</strong><span class="small muted">Insurance department and emergency contacts for each property’s state</span></div><span aria-hidden="true">›</span></button>
  <button class="card linkcard" data-go="feedback"><div class="stack" style="gap:2px;min-width:0"><strong>Feedback</strong><span class="small muted">Tell us what worked, what didn’t, and what you’d add.</span></div><span aria-hidden="true">›</span></button>

  ${sec('set-about', 'About StormFile', '', `
    <p class="small">StormFile is made by Coastline Code LLC, a veteran-owned company in Pass Christian, Mississippi.</p>
    <p class="small">StormFile helps you organize your insurance and home records. It doesn’t sell insurance, give insurance or legal advice, or decide what your policy covers. Confirm coverage with your agent or insurance company.</p>
    <p class="small muted">${TEST?'This is a test version shared for feedback. ':''}StormFile, including its name, design and code, belongs to Coastline Code LLC. © 2026 Coastline Code LLC.</p>
    <p class="small muted">Questions: info@coastlinecode.com</p>
    <p class="small"><a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a> · <a href="terms.html" target="_blank" rel="noopener">Terms of Use</a> · <a href="support.html" target="_blank" rel="noopener">Help</a></p>`)}

  ${sec('set-erase', 'Erase everything', '', `
    <p class="small">Removes every property, photo, receipt and setting from this phone. Make a backup first if you might want them back.</p>
    <button class="ghost" data-act="wipe" style="color:var(--red)">Erase everything on this phone</button>`)}`;
}

/* ---------- Render + events ---------- */
const VIEWS = {home:viewHome, policy:viewPolicy, inventory:viewInventory, storm:viewStorm, claim:viewClaim, feedback:viewFeedback, policyForm:viewPolicyForm, settings:viewSettings, resources:viewResources};
let LIVE = null;
/* Age check (phone app only): where the law requires it, Apple or Google confirms the person is 18 or older. */
let AGE_GATE = null;
function runAgeCheck(){ if(!(NAT && NAT.ageCheck)) return; NAT.ageCheck().then(v=>{ const was = AGE_GATE; AGE_GATE = v==='ok' ? null : v; if(was !== AGE_GATE) render(); }).catch(()=>{}); }
function viewAgeGate(){
  const ios = NAT && NAT.platform === 'ios', store = ios ? 'your Apple Account' : 'Google Play';
  if(AGE_GATE === 'minor') return `<section class="stack" style="padding-top:24px"><h1>StormFile is for adults</h1>
    <p>StormFile is made for adults 18 and older who manage a home, rental or business. ${ios?'Your Apple Account':'Your Google account'} shows an age under 18, so StormFile can't be used on this phone.</p>
    <p class="small muted">If that age isn't right, update it in ${ios?'Settings on your iPhone (tap your name at the top)':'your Google account or the Play Store'}, then tap Check again.</p>
    <button class="primary" data-act="ageCheck">Check again</button></section>`;
  return `<section class="stack" style="padding-top:24px"><h1>Confirm you're 18 or older</h1>
    <p>Where you live, the law requires apps to confirm through ${store} that you're old enough to use them. StormFile is made for adults 18 and older.</p>
    ${AGE_GATE === 'verify' ? `<p>Open the Play Store and follow its steps to confirm your age, then come back and tap Check again.</p>`
      : `<p>Tap the button below and choose to share your age range.</p>`}
    <button class="primary" data-act="ageCheck">${AGE_GATE === 'verify' ? 'Check again' : 'Share my age range'}</button>
    <p class="small muted">StormFile only learns whether you're over 18, never your birthday. That answer stays on this phone and is never sent to us. Your records stay saved on this phone.</p></section>`;
}
const INSTALLED = !!NAT || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
const IS_IOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
let INSTALL_EVT = null;
window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); INSTALL_EVT = e; if(S && S.tab==='home') render(); });
window.addEventListener('appinstalled', ()=>{ INSTALL_EVT = null; toast('StormFile installed. Open it from your home screen.'); });
const view = document.getElementById('view');
const menuBtn = document.getElementById('menuBtn'), menu = document.getElementById('menu');
function render(){
  const P = cur();
  document.getElementById('menuName').textContent = `${P.name} · ${TYPES[P.type].label}`;
  menu.innerHTML = S.properties.map(p=>{ const po = polOf(p), shared = po && usersOf(po.id).length>1;
    return `<div class="mprop" aria-current="${p.id===P.id}">
      <div class="row" style="flex-wrap:nowrap"><div class="stack" style="gap:0;min-width:0"><span class="typetag" data-es="${({home:'Casa',rental:'Alquiler',business:'Negocio'})[p.type]||''}">${esc(TYPES[p.type].label)}</span><strong>${esc(p.name)}</strong><span class="small muted">${esc(p.address)}</span></div>
        <span class="num" style="color:var(--${score(p)>=80?'green':score(p)>=50?'amber':'red'})">${score(p)}</span></div>
      <div class="mline"><span class="muted">Policy</span><span>${po?esc(polLabel(po))+(shared?' <span class="chip info">Shared</span>':''):'<span style="color:var(--amber);font-weight:600">Not uploaded</span>'}</span></div>
      <div class="mline"><span class="muted">Claim</span><span>${p.claim.number?'#'+esc(p.claim.number):'No open claim'}</span></div>
      <div class="mlinks"><button data-mprop="${p.id}" data-mtab="home">Overview</button><button data-mprop="${p.id}" data-mtab="policy">Policy</button><button data-mprop="${p.id}" data-mtab="claim">Claim</button></div>
    </div>`;}).join('') + `<button class="primary" data-madd="1">+ Add a property</button>`;
  const first = !S.agreed;
  document.querySelector('nav.tabs').hidden = first; menuBtn.hidden = first; document.getElementById('fbBtn').parentElement.hidden = first;
  if(AGE_GATE){ document.querySelector('nav.tabs').hidden = true; menuBtn.hidden = true; document.getElementById('fbBtn').parentElement.hidden = true; view.innerHTML = viewAgeGate(); return; }
  if(first){ view.innerHTML = viewWelcome(); return; }
  view.innerHTML = VIEWS[S.tab]();
  document.querySelectorAll('nav.tabs button').forEach(b=>b.setAttribute('aria-current', b.dataset.tab===S.tab?'page':'false'));
  document.getElementById('tabRooms').textContent = TYPES[P.type].tab;
  document.getElementById('samplePill').hidden = !S.sample || S.tab!=='home';
  document.getElementById('backHome').hidden = S.tab==='home';
  document.getElementById('fbBtn').hidden = S.tab==='settings';
}
function go(tab){ S.tab = tab; save(); render(); window.scrollTo(0,0); }
function toast(msg){
  document.querySelectorAll('.toast').forEach(x=>x.remove());
  const t = document.createElement('div'); t.className='toast'; t.setAttribute('aria-hidden','true'); t.textContent=msg; document.body.appendChild(t);
  const live = document.getElementById('srLive'); if(live){ live.textContent=''; setTimeout(()=>{ live.textContent = msg; }, 50); } // read aloud by VoiceOver / TalkBack
  setTimeout(()=>t.remove(), Math.max(2400, msg.length*45));
}

const defaultInfo = type => type==='business' ? {sqft:2500,cps:185,localInfl:5.5,flood:'none',monthlyNeed:20000,monthsClosed:6,stockReport:''}
  : type==='rental' ? {sqft:1400,cps:165,localInfl:5.5,flood:'none',rent:1500,tenant:'Not added yet',renterProof:false}
  : {sqft:1600,cps:170,localInfl:5.5,flood:'none'};

function loadScript(src){
  return new Promise((res, rej)=>{ const sc=document.createElement('script'); sc.src=src; sc.onload=res; sc.onerror=()=>rej(new Error('load')); document.head.appendChild(sc); });
}
async function loadPdfJs(){
  if(window.pdfjsLib && window.pdfjsWorker) return;
  // pdf.js 2.16.105 (older-browser build), bundled so reading works offline and nothing loads from another website
  await loadScript('vendor/pdf.min.js');
  await loadScript('vendor/pdf.worker.min.js');
}
async function pdfToInput(file, maxImages){
  await loadPdfJs();
  const doc = await window.pdfjsLib.getDocument({data: new Uint8Array(await file.arrayBuffer()), isEvalSupported:false}).promise;
  const pages = Math.min(doc.numPages, 8);
  let text = '';
  for(let n=1; n<=pages; n++){
    const pg = await doc.getPage(n);
    const tc = await pg.getTextContent();
    text += `\n--- Page ${n} ---\n` + tc.items.map(it=>it.str + (it.hasEOL?'\n':' ')).join('');
  }
  if(text.replace(/\s|-|Page \d+/g,'').length > 300) return {text, images:[]};
  const images = [];
  for(let n=1; n<=Math.min(pages, maxImages); n++){
    const pg = await doc.getPage(n);
    const vp = pg.getViewport({scale: 2});
    const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height;
    await pg.render({canvasContext: cv.getContext('2d'), viewport: vp}).promise;
    images.push(await new Promise(r=>cv.toBlob(r,'image/jpeg',0.85)));
  }
  return {text:'', images};
}

function decPrompt(text, hint){
  return `You are reading an insurance declarations page (and possibly more policy pages) for a hurricane-preparedness app used by ordinary homeowners on the U.S. Gulf Coast. ${text ? 'The document text is below.' : 'The document is in the attached image(s).'}

Rules:
- Use ONLY what the document shows for numbers, names, dates and limits. Never invent a number. If something isn't shown, use null.
- Write every "plain" field in short, plain English a non-expert understands (under 20 words).
- "quote" must be words copied exactly from the document, under 25 words, or null.
- Do NOT include the insured person's name, mailing address, or any account, loan or ID numbers anywhere in the JSON.
- For "notCovered": list exclusions or limits the document actually shows (fromPage: true, with src and quote). Then add up to 3 important gaps that are COMMON for this kind of policy but not shown on this document, such as flood, if they likely apply (fromPage: false, quote: null, src: "Not on this page. Typical for this policy type; confirm in the full policy."). If the document shows a flood policy or endorsement, don't list flood as a gap.
- Detect the policy type: "home" (HO-3, HO-5, HO-6, DP for owner-occupied), "rental" (landlord or dwelling fire on a rental), or "business" (BOP or commercial property).${hint ? ` The person expects a ${hint} policy, but go by the document.` : ''}
- Coverage keys: for home and rental use A (dwelling), B (other structures), C (personal property), D (loss of use or fair rental value), E or L (liability), F (medical payments), and short codes for any others. For business use BLD (building), BPP (business personal property), BI (business income), EE (extra expense), L (liability), and short codes for others.
- Deductibles: allPerils = the regular deductible in dollars. If there is a hurricane, named storm or windstorm deductible as a percentage, put the number in hurricanePct (5 for 5%); if it's a dollar amount, put it in hurricaneFlat. If wind or hail is EXCLUDED, say so in notCovered as a "bad" item.
- Dates as YYYY-MM-DD. Money as plain numbers with no $ or commas.
- If the image is not an insurance declarations page or is unreadable, return {"error": "short reason"}.

Reply with ONLY a JSON object in this shape:
{"type":"home","carrier":"string","form":"e.g. HO-3 Homeowners","number":"policy number or null","effective":"YYYY-MM-DD or null","renewal":"expiration date YYYY-MM-DD or null","agent":"agency name and phone or null","claimPhone":"claims phone or null","propertyCity":"city and state of the insured property only, e.g. Biloxi, MS, or null",
"coverages":[{"key":"A","name":"Your house","plain":"Pays to rebuild the house itself","limit":285000,"src":"Declarations, Coverage A"}],
"deductibles":{"allPerils":2500,"hurricanePct":5,"hurricaneFlat":null},
"inflationGuardPct":null,"coinsurancePct":null,"waitHours":null,
"ale":{"months":12,"civilWeeks":2,"civilRule":"plain sentence","src":"string"} or null,
"covered":[{"title":"Wind and hail","plain":"string","src":"string"}],
"notCovered":[{"sev":"bad or warn","title":"string","plain":"string","src":"string","quote":"exact words or null","fromPage":true}],
"notes":"one or two plain sentences on anything unclear or worth asking the agent, or null"}
${text ? '\nDOCUMENT TEXT:\n' + text.slice(0, 60000) : ''}`;
}

function cleanPolicy(ai, fileName){
  const num = v => { if(v==null) return 0; const n = typeof v==='number' ? v : parseFloat(String(v).replace(/[^0-9.]/g,'')); return isFinite(n) ? n : 0; };
  const str = (v, d='') => (v==null || v==='null') ? d : String(v).slice(0, 400);
  const type = ['home','rental','business'].includes(ai.type) ? ai.type : 'home';
  const coverages = (Array.isArray(ai.coverages)?ai.coverages:[]).filter(c=>c && c.name).slice(0,14)
    .map(c=>({key:str(c.key).toUpperCase().slice(0,6), name:str(c.name), plain:str(c.plain), limit:num(c.limit), src:str(c.src,'Declarations page')}));
  if(!coverages.some(c=>c.limit>0)) throw {code:'no_limits'};
  const d = ai.deductibles || {};
  const pol = {
    id: uid(), live: true, fileName: str(fileName).slice(0,80),
    carrier: str(ai.carrier,'Insurer not shown'), form: str(ai.form, TYPES[type].label+' policy'),
    number: str(ai.number,'Not shown'), renewal: /^\d{4}-\d{2}-\d{2}$/.test(ai.renewal||'') ? ai.renewal : '',
    agent: str(ai.agent,'Not shown'), claimPhone: str(ai.claimPhone,'Not shown on this page'),
    coverages,
    deductibles: {allPerils: num(d.allPerils), hurricanePct: num(d.hurricanePct) || null, hurricaneFlat: num(d.hurricaneFlat) || null},
    inflationGuardPct: num(ai.inflationGuardPct), coinsurancePct: num(ai.coinsurancePct) || null, waitHours: num(ai.waitHours) || null,
    ale: ai.ale && ai.ale.civilRule ? {months:num(ai.ale.months)||12, civilWeeks:num(ai.ale.civilWeeks)||2, civilRule:str(ai.ale.civilRule), src:str(ai.ale.src,'Loss of use section')} : null,
    covered: (Array.isArray(ai.covered)?ai.covered:[]).slice(0,8).map(x=>({title:str(x.title), plain:str(x.plain), src:str(x.src,'Declarations page')})).filter(x=>x.title),
    notCovered: (Array.isArray(ai.notCovered)?ai.notCovered:[]).slice(0,10).map(x=>({sev:x.sev==='bad'?'bad':'warn', title:str(x.title), plain:str(x.plain), src:str(x.src,'Declarations page'), quote:x.quote?str(x.quote).slice(0,200):'', fromPage: x.fromPage!==false})).filter(x=>x.title),
    notes: str(ai.notes)
  };
  return {type, pol, city: str(ai.propertyCity)};
}

const READ_ERRORS = {
  unavailable:'Live reading works when StormFile is opened inside Claude while signed in. Use the sample policy for now.',
  not_granted:'StormFile needs permission to use Claude to read the page. Reload and choose Allow when asked.',
  sampling_disabled:'Claude isn’t available on this account.',
  images_unavailable:'This view can’t send photos to Claude. Try a PDF with selectable text instead.',
  image_rejected:'That file couldn’t be read as an image. Take a screenshot or a JPG photo of the page and try again.',
  rate_limited:'Too many reads in a short time. Wait a minute and try again.',
  session_expired:'Your Claude sign-in expired. Sign in again and retry.',
  invalid_json:'The page was read but the answer came back garbled. Try again, ideally with a clearer photo.',
  refused:'Claude couldn’t read this document. Try a different photo of the declarations page.',
  no_limits:'No coverage amounts were found. Make sure the whole declarations page is in the photo, in focus and well lit.',
  not_dec:'This doesn’t look like an insurance declarations page.',
  pdf:'That PDF couldn’t be opened. Take a screenshot of the page and upload the image instead.',
  prompt_too_large:'That document is too long. Upload just the declarations pages.',
  cancelled:''
};

let readCtl = null;
async function readDecPage(file, P){
  if(!file) return;
  const ov = document.createElement('div'); ov.className='overlay';
  ov.innerHTML = `<div class="card" role="status" aria-live="polite"><div class="spinner" id="ovSpin"></div><h3 style="text-align:center" id="ovTitle">Reading the declarations page</h3>
    <p class="small muted" id="ovStep" style="text-align:center">Opening ${esc(file.name)}…</p>
    <button class="ghost" id="ovBtn">Cancel</button></div>`;
  document.body.appendChild(ov);
  const step = t => { const el = document.getElementById('ovStep'); if(el) el.textContent = t; };
  readCtl = new AbortController(); const ctl = readCtl;
  let ticker = null;
  const close = () => { clearInterval(ticker); ov.remove(); };
  const fail = code => {
    clearInterval(ticker);
    if(code==='cancelled'){ close(); return; }
    const msg = READ_ERRORS[code] || 'Something went wrong reading the page. Try again in a moment.';
    document.getElementById('ovSpin').hidden = true;
    document.getElementById('ovTitle').textContent = 'Couldn’t read it';
    step(msg);
    const b = document.getElementById('ovBtn'); b.textContent = 'Close'; b.onclick = close;
  };
  document.getElementById('ovBtn').onclick = () => { ctl.abort(); close(); };
  try{
    const hasRuntime = !!(window.claude && window.claude.use);
    const sample = hasRuntime ? await window.claude.use('sample') : null;
    if(!sample){ fail('unavailable'); step(READ_ERRORS.unavailable + (hasRuntime ? ' (Code: S1, reading isn’t enabled for this account or view.)' : ' (Code: S0, not opened inside Claude.)')); return; }
    const lim = await sample.limits().catch(()=>null);
    const maxImg = Math.min(4, (lim && lim.images && lim.images.maxCount) || 0);
    let text = '', images = [];
    const isPdf = file.type==='application/pdf' || /\.pdf$/i.test(file.name);
    if(isPdf){
      step('Opening the PDF…');
      try{ ({text, images} = await pdfToInput(file, Math.max(1, maxImg))); }catch(e){ return fail('pdf'); }
    } else {
      images = [file];
    }
    if(images.length && !maxImg) return fail('images_unavailable');
    images = images.slice(0, maxImg || 1);
    if(ctl.signal.aborted) return;
    const msgs = ['Finding coverage limits…','Checking deductibles…','Looking for exclusions…','Writing the plain-English summary…','Almost done…'];
    let mi = 0; step('Sending to Claude… you may be asked to allow it.');
    ticker = setInterval(()=>{ step(msgs[Math.min(mi++, msgs.length-1)]); }, 6000);
    const opts = {signal: ctl.signal, modelTier:'default', cache:false};
    if(images.length) opts.images = images;
    const ai = await sample.json(decPrompt(text, P ? P.type : ''), opts);
    clearInterval(ticker);
    if(!ai || typeof ai !== 'object' || ai.error) return fail('not_dec');
    const {type, pol, city} = cleanPolicy(ai, file.name);
    S.policies.push(pol);
    if(P){
      if(P.type !== type){ P.type = type; P.info = Object.assign(defaultInfo(type), {flood:P.info.flood}); }
      P.policyId = pol.id;
    } else {
      const np = {upgrades:[], vehicles:[], id:uid(), type, name: city ? `Uploaded: ${city}` : `Uploaded ${TYPES[type].label.toLowerCase()} policy`,
        address: city || 'From uploaded policy', inPath:false, policyId:pol.id, info:defaultInfo(type), exterior:[], manual:{}, claim:blankClaim(),
        rooms: TYPES[type].rooms.map(n=>room(n))};
      S.properties.push(np); S.current = np.id;
    }
    S.policyReads = (S.policyReads||0)+1; S.tab = 'policy';
    save(); close(); render(); window.scrollTo(0,0);
    toast('Policy read. Check it against the document.');
  }catch(e){
    fail(e && e.code ? e.code : 'other');
  }
}

function readPolicyDemo(){
  const P = cur();
  const ov = document.createElement('div'); ov.className='overlay';
  ov.innerHTML = `<div class="card" role="status"><div class="spinner"></div><h3 style="text-align:center">Reading the policy</h3>
    <p class="small muted" id="ovStep" style="text-align:center">Finding coverage limits…</p></div>`;
  document.body.appendChild(ov);
  const steps = ['Finding coverage limits…','Checking exclusions…','Writing plain-English summary…'];
  let i=0; const iv = setInterval(()=>{ i++; const el=document.getElementById('ovStep'); if(el&&steps[i]) el.textContent=steps[i]; },700);
  setTimeout(()=>{ clearInterval(iv); ov.remove(); const np = newPolicy(P.type); np.number = np.number.replace('SAMPLE', String(1000+Math.floor(Math.random()*9000))); S.policies.push(np); P.policyId = np.id; S.policyReads=(S.policyReads||0)+1; save(); render(); toast('Policy read. Sample results shown.'); }, 2200);
}

function shrink(file, cb){
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      const s = 160 / Math.max(img.width, img.height);
      const c = document.createElement('canvas'); c.width = Math.round(img.width*s); c.height = Math.round(img.height*s);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      cb(c.toDataURL('image/jpeg',0.7));
    };
    img.onerror = () => cb(null);
    img.src = fr.result;
  };
  fr.onerror = () => cb(null);
  fr.readAsDataURL(file);
}

function setMenu(open){ menu.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); }
menuBtn.addEventListener('click', ()=>setMenu(menu.hidden));
menu.addEventListener('click', e=>{
  const b = e.target.closest('button'); if(!b) return;
  setMenu(false);
  if(b.dataset.madd){ S.openAdd = true; go('home'); setTimeout(()=>{ const f=document.getElementById('apName'); if(f){ f.scrollIntoView({block:'center'}); f.focus(); } },50); return; }
  S.current = b.dataset.mprop; go(b.dataset.mtab);
});
document.addEventListener('click', e=>{ if(!menu.hidden && !e.target.closest('header.top')) setMenu(false); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape') setMenu(false); });
document.getElementById('backHome').addEventListener('click', ()=>go('home'));
document.getElementById('fbBtn').addEventListener('click', ()=>go('settings'));
document.querySelector('nav.tabs').addEventListener('click', e=>{ const b=e.target.closest('button[data-tab]'); if(b) go(b.dataset.tab); });

view.addEventListener('click', e=>{
  const t = e.target.closest('button'); if(!t) return;
  const P = cur();
  if(t.dataset.prop){ S.current = t.dataset.prop; save(); render(); window.scrollTo(0,0); return; }
  if(t.dataset.viewphoto !== undefined && t.classList.contains('phbtn')) return openViewer(t.dataset.viewphoto, t.dataset.thumb, t.dataset.cap);
  if(t.dataset.viewfile) return openViewer(t.dataset.viewfile, '', t.dataset.cap);
  if(t.dataset.go) return go(t.dataset.go);
  if(t.dataset.act==='demoPolicy') return readPolicyDemo();
  if(t.dataset.act==='startOwn'){
    const keepIds = new Set(); S.properties = []; S.policies = S.policies.filter(po=>keepIds.has(po.id));
    S.ownStarted = true; S.sample = false; S.openAdd = true; S.threat = 'none';
    const np = {upgrades:[], vehicles:[], id:uid(), type:'home', name:'My home', address:'Add your city', inPath:false, policyId:null, info:defaultInfo('home'), exterior:[], manual:{}, claim:blankClaim(), rooms:TYPES.home.rooms.map(n=>room(n))};
    S.properties.push(np); S.current = np.id; S.tab = 'home'; S.renaming = true; save(); render(); window.scrollTo(0,0);
    toast('Sample data removed. Name your property below.'); return;
  }
  if(t.dataset.act==='saveName'){
    const n = document.getElementById('rnName').value.trim(), a = document.getElementById('rnAddr').value.trim(), ty = document.getElementById('rnType').value, stv = document.getElementById('rnState').value;
    if(!stv) return toast('Pick your state so StormFile can remind you about its storm seasons.');
    if(n) P.name = n; P.state = stv; P.address = (a ? a.replace(/,\s*[A-Za-z]{2}\s*$/,'') + ', ' : '') + stv;
    if(ty !== P.type){ P.type = ty; P.info = defaultInfo(ty); P.rooms = TYPES[ty].rooms.map(x=>room(x)); P.policyId = null; }
    S.renaming = false; S.tab = P.policyId ? 'home' : 'policy'; save(); render(); window.scrollTo(0,0); return;
  }
  if(t.dataset.act==='rename'){ S.renaming = true; save(); return render(); }
  if(t.dataset.act==='install' && INSTALL_EVT){ const ev = INSTALL_EVT; INSTALL_EVT = null; ev.prompt(); ev.userChoice.finally(()=>render()); return; }
  if(t.dataset.act==='pinSave'){ const a = document.getElementById('pin1').value.trim(), b = document.getElementById('pin2').value.trim();
    if(!/^\d{4,8}$/.test(a)) return toast('Use 4 to 8 digits.'); if(a!==b) return toast('The two PINs don’t match.');
    pinHash(a).then(h=>{ setJ(PINKEY, h); render(); toast('PIN set. StormFile is now locked when you’re away.'); }).catch(()=>toast('Couldn’t set a PIN in this browser.')); return; }
  if(t.dataset.act==='pinClear'){ setJ(PINKEY, null); setJ(BIOKEY, null); render(); return toast('Lock turned off'); }
  if(t.dataset.act==='bioToggle'){ if(bioRec()){ setJ(BIOKEY, null); render(); return toast(`${BIONAME()} turned off. Your PIN still locks StormFile.`); }
    bioEnroll().then(()=>{ render(); toast(`Done. StormFile will open with ${BIONAME()}.`); }).catch(e=>toast(e && e.name==='NotAllowedError' ? `${BIONAME()} wasn’t confirmed. Try again.` : `This browser couldn’t set up ${BIONAME()}.`)); return; }
  if(t.dataset.act==='bkMake'){ const a = document.getElementById('bk1').value, b = document.getElementById('bk2').value;
    if(!hasRealData()) return toast('There’s nothing of yours to back up yet. Sample data isn’t included.');
    if(a.length < 8) return toast('Use a passphrase of at least 8 characters.'); if(a!==b) return toast('The two passphrases don’t match.');
    t.disabled = true; t.textContent = 'Locking your backup…';
    makeBackup(a).then(blob=>saveFile(`StormFile-backup-${today()}.json`, blob)).then(ok=>{ if(ok){ S.lastBackupAt = nowISO(); save(); render(); toast('Backup saved. Keep the file somewhere safe, like ' + ({ios:'iCloud Drive', android:'Google Drive', web:'iCloud Drive or Google Drive'})[PLAT] + '.'); } else { t.disabled=false; t.textContent='Save a locked backup'; } })
      .catch(()=>{ t.disabled=false; t.textContent='Save a locked backup'; toast('The backup didn’t finish. Please try again.'); }); return; }
  if(t.dataset.lang){ const l = t.dataset.lang === 'es' ? 'es' : 'en'; if(l === S.lang) return; S.lang = l; save();
    if(l === 'en') I18N.set('en'); render(); if(l === 'es') I18N.set('es'); return; }
  if(t.dataset.term){ termFrom = t; showTerm(t.dataset.term); return; }
  if(t.dataset.act==='ageCheck'){ runAgeCheck(); return; }
  if(t.dataset.act==='startClaim'){ const P = cur(); P.claim.started = true; logEvt(P, 'Claim started in StormFile'); S.open = S.open || {}; save(); render(); window.scrollTo(0,0); const f = document.getElementById('clNum'); if(f) f.focus({preventScroll:true}); return; }
  if(t.dataset.act==='shareMake'){
    const boxes = [...document.querySelectorAll('[data-shareprop]')], ids = boxes.length ? boxes.filter(b=>b.checked).map(b=>b.dataset.shareprop) : S.properties.map(x=>x.id);
    if(!ids.length) return toast('Pick at least one place to share.');
    const code = shareCodeNew(); t.disabled = true; t.textContent = 'Locking the copy\u2026';
    Promise.all([makeShare(ids, code), loadQrMaker()]).then(([blob, qrcode])=>saveFile(`StormFile-shared-copy-${today()}.json`, blob).then(ok=>{
      if(!ok){ t.disabled=false; t.textContent='Share my records'; return; }
      const q = qrcode(0, 'M'); q.addData('STORMFILE-SHARE:' + code); q.make();
      shareShown = {code, svg:q.createSvgTag({cellSize:6, margin:4, scalable:true})};
      S.properties.filter(x=>ids.includes(x.id)).forEach(x=>logEvt(x, 'Shared a copy with the household'));
      S.open = S.open || {}; S.open['set-share'] = true; save(); render(); const c = document.getElementById('shareCard'); if(c) c.scrollIntoView({block:'start'}); toast('Now show them the code on your screen.'); }))
      .catch(e=>{ console.warn('share', e); t.disabled=false; t.textContent='Share my records'; toast('The copy didn\u2019t finish. Please try again.'); }); return; }
  if(t.dataset.act==='shareDone'){ shareShown = null; render(); return; }
  if(t.dataset.act==='shareOpen'){ const f = document.getElementById('shFile').files[0], code = shareCodeClean(document.getElementById('shCode').value);
    if(!f) return toast('Choose the file they sent you first.'); if(!code) return toast('Scan their code, or type all 16 letters and numbers.');
    t.disabled = true; t.textContent = 'Opening\u2026';
    f.text().then(txt=>openShare(txt, code)).then(addShare).then(r=>{ S.shareOpen = false; S.tab = 'home'; save(); render(); window.scrollTo(0,0);
      const n = x => plural(x,'place').replace('places','places'); toast([r.added?`Added ${n(r.added)}`:'', r.updated?`Updated ${n(r.updated)}`:''].filter(Boolean).join(', ') + ' from the shared copy.'); })
      .catch(e=>{ t.disabled=false; t.textContent='Add to this phone'; toast(e.message || 'Couldn\u2019t open that shared copy.'); }); return; }
  if(t.dataset.act==='rsGo'){ const f = document.getElementById('rsFile').files[0]; if(!f) return toast('Choose your backup file first.');
    if(hasRealData() && !t.dataset.armed){ t.dataset.armed='1'; t.textContent='Tap again to replace what’s on this phone'; setTimeout(()=>{ if(t.isConnected){ delete t.dataset.armed; t.textContent='Unlock and restore'; } }, 6000); return; }
    t.disabled = true; t.textContent = 'Unlocking…';
    f.text().then(txt=>restoreBackup(txt, document.getElementById('rsPass').value)).then(n=>{ render(); window.scrollTo(0,0); toast(`Restored ${plural(n,'property')}.`.replace('propertys','properties')); })
      .catch(e=>{ t.disabled=false; t.textContent='Unlock and restore'; toast(e.message || 'Couldn’t restore that backup.'); }); return; }
  if(t.dataset.act==='wipe'){ if(!t.dataset.armed){ t.dataset.armed='1'; t.textContent='Tap again to erase everything'; setTimeout(()=>{ if(t.isConnected){ delete t.dataset.armed; t.textContent='Erase everything on this phone'; } }, 4000); return; }
    clearFiles().catch(()=>{}).then(()=>{ if(NAT && NAT.wipe) NAT.wipe(); Object.keys(localStorage).filter(k=>/^stormfile/.test(k)).forEach(k=>{ try{ localStorage.removeItem(k); }catch(e){} }); S = DEFAULT_STATE(); S.agreed = false; save(); render(); window.scrollTo(0,0); toast('Everything was erased from this phone.'); }); return; }
  if(t.dataset.act==='packet'){ const o = id => { const el = document.getElementById(id); return !el || el.checked; };
    const opt = {policy:o('pk-policy'), photos:o('pk-photos'), receipts:o('pk-receipts'), history:o('pk-history')};
    t.disabled = true; t.textContent = 'Making your PDF\u2026';
    makeClaimPacket(P, opt).then(blob=>saveFile(`StormFile-claim-${P.name.replace(/[^A-Za-z0-9]+/g,'-').replace(/^-|-$/g,'')||'record'}-${today()}.pdf`, blob))
      .then(ok=>{ if(ok){ logEvt(P, 'Claim packet PDF made'); save(); toast('Claim packet ready. Send it to your adjuster or save it to Files.'); } })
      .catch(e=>{ console.warn(e); toast('The PDF didn\u2019t finish. Try again, or turn off photos to make it smaller.'); })
      .finally(()=>{ if(t.isConnected){ t.disabled = false; t.textContent = 'Make the claim packet (PDF)'; } render(); }); return; }
  if(t.dataset.act==='calRenewal'){ const pol = polOf(P); if(!pol || !pol.renewal) return toast('Add the renewal date first.');
    const evs = [{date:addDays(pol.renewal,-45), title:`StormFile: check ${P.name} coverage before renewal`, desc:`Your ${pol.carrier} policy renews ${fmtDay(pol.renewal+'T12:00:00')}. Open StormFile, check "Enough to rebuild?" and the inflation check, and call your agent about any gaps.`, dayBefore:false},
      {date:pol.renewal, title:`${P.name} policy renews today`, desc:'Add the new declarations page to StormFile and check what changed.', dayBefore:false}].filter(e=>at9(e.date) > new Date());
    if(!evs.length) return toast('That renewal date has passed. Update it first.');
    addToCalendar(evs, `StormFile renewal ${P.name}`).then(ok=>{ if(ok){ logEvt(P, 'Renewal reminders added to calendar'); save(); } }); return; }
  if(t.dataset.act==='calSeason'){ const ev = seasonEventsFor(P); if(!ev.length) return toast('Pick a state first.');
    addToCalendar(ev, `StormFile seasons ${stateOf(P)}`).then(ok=>{ if(ok){ logEvt(P, `Season reminders added to calendar (${STATE_NAME[stateOf(P)]})`); save(); } }); return; }
  if(t.dataset.act==='changeState'){ P.state = ''; P.address = String(P.address||'').replace(/,\s*[A-Za-z]{2}\s*$/,''); P.stateCleared = true; save(); return render(); }
  if(t.dataset.act==='calDeadlines'){ const P = cur(); const ev = claimDeadlines(P).filter(x=>x.due).map(x=>({date:x.due, title:`Claim deadline: ${x.what}`, desc:`${P.name}${P.claim.number?' - claim '+P.claim.number:''}. ${x.n} ${UNIT[x.unit]} ${FROM_LABEL[x.from]}.`, dayBefore:true}));
    addToCalendar(ev, `StormFile claim deadlines ${P.name}`).then(ok=>{ if(ok){ logEvt(P, `Claim deadline reminders added to calendar (${ev.length})`); save(); } }); return; }
  if(t.dataset.act==='calFollow'){ const d = document.getElementById('fuDate').value, n = document.getElementById('fuNote').value.trim();
    if(!d) return toast('Pick a date first.');
    addToCalendar([{date:d, title:`Claim follow-up: ${n || P.name}`, desc:`${P.name}${P.claim.number?' - claim '+P.claim.number:''}. ${n}`, dayBefore:true}], `StormFile follow-up ${d}`).then(ok=>{ if(ok){ logEvt(P, `Follow-up reminder set for ${fmtDay(d+'T12:00:00')}${n?': '+n:''}`); S.fuDate=''; S.fuNote=''; save(); render(); } }); return; }
  if(t.dataset.act==='ltCopy'){ const box = document.getElementById('ltOut'); const txt = box.value;
    const fb = () => { box.removeAttribute('readonly'); box.focus(); box.select(); box.setAttribute('readonly',''); toast('Letter selected. Use Copy on your phone.'); };
    try{ navigator.clipboard.writeText(txt).then(()=>toast('Letter copied'), fb); }catch(e){ fb(); } return; }
  if(t.dataset.act==='agree'){ S.agreed = true; S.agreedAt = nowISO(); save(); render(); window.scrollTo(0,0); return; }
  if(t.dataset.act==='agreeOwn'){ S.agreed = true; S.agreedAt = nowISO(); save(); const b = document.createElement('button'); b.dataset.act = 'startOwn'; view.appendChild(b); b.click(); return; }
  if(t.dataset.act==='hideWelcome'){ S.hideWelcome = true; save(); return render(); }
  if(t.dataset.fbq){ S.fb = S.fb || {}; S.fb[t.dataset.fbq] = t.dataset.fba; save(); const y = window.scrollY; render(); window.scrollTo(0,y); return; }
  if(t.dataset.act==='fbCopy'){
    const txt = fbText(), box = document.getElementById('fbOut');
    const fallback = () => { if(box){ box.focus(); box.select(); } toast('Selected. Copy it from the box.'); };
    try{ navigator.clipboard.writeText(txt).then(()=>toast('Copied. Paste it into a text or email.'), fallback); }catch(e){ fallback(); }
    return;
  }
  if(t.dataset.src) return toast('Opens the policy at ' + t.dataset.src);
  if(t.dataset.room){ const r=P.rooms.find(x=>x.id===t.dataset.room); r.open=!r.open; save(); return render(); }
  if(t.dataset.delitem){ const [rid,i]=t.dataset.delitem.split(':'); const r=P.rooms.find(x=>x.id===rid); const it=r.items[+i];
    if(lockedAt(P) && !isAfterLock(P,it)) return toast('This item is part of your locked before-storm record. Add a note in the claim log instead.');
    r.items.splice(+i,1); logEvt(P, `Removed ${it.n} (${fmt(it.v)}) from ${r.name}`); save(); return render(); }
  if(t.dataset.delup){ const u=P.upgrades[+t.dataset.delup];
    if(lockedAt(P) && !isAfterLock(P,u)) return toast('This upgrade is part of your locked before-storm record.');
    P.upgrades.splice(+t.dataset.delup,1); logEvt(P, `Removed upgrade: ${u.n}`); save(); return render(); }
  if(t.dataset.act==='lockRecord'){
    if(!P.claim.dateOfLoss) return toast('Enter the date of loss above first.');
    P.claim.lockedAt = nowISO(); logEvt(P, `Before-storm record locked (date of loss ${P.claim.dateOfLoss})`); save(); render(); return toast('Before-storm record locked.');
  }
  if(t.dataset.act==='showAllHist'){ S.histAll = !S.histAll; save(); return render(); }
  if(t.dataset.delveh){ P.vehicles.splice(+t.dataset.delveh,1); save(); return render(); }
  if(t.dataset.level){ S.threat=t.dataset.level; save(); return render(); }
  if(t.dataset.manual){ P.manual=P.manual||{}; P.manual[t.dataset.manual]=!P.manual[t.dataset.manual]; save(); return render(); }
});

view.addEventListener('change', e=>{
  const el = e.target, P = cur();
  const num = v => Math.max(0, parseFloat(v)||0);
  if(el.id==='polUpload'){ if(el.files.length) readDecPage(el.files[0], P); return; }
  if(el.id==='decUploadNew'){ if(el.files.length) readDecPage(el.files[0], null); return; }
  if(el.id==='stockUpload'){ if(el.files.length){ P.info.stockReport = `${el.files[0].name} · uploaded ${new Date().toLocaleDateString()}`; save(); render(); toast('Stock report saved'); } return; }
  if(el.dataset.itemreceipt){ if(el.files.length){ const [rid,i]=el.dataset.itemreceipt.split(':'); const it = P.rooms.find(x=>x.id===rid).items[+i]; const f = el.files[0];
    storeDoc(f).then(d=>{ it.rid = d.id; it.r = f.name || 'Receipt'; it.receiptAt = nowISO(); logEvt(P, `Receipt added for ${it.n}`); S.sample=false; save(); render(); toast('Receipt saved'); }).catch(()=>toast('Couldn\u2019t save that receipt. Try a photo instead.')); } return; }
  if(el.dataset.upreceipt){ if(el.files.length){ const u = P.upgrades[+el.dataset.upreceipt]; const f = el.files[0];
    storeDoc(f).then(d=>{ u.rid = d.id; u.r = f.name || 'Receipt'; u.receiptAt = nowISO(); logEvt(P, `Receipt added for ${u.n}`); save(); render(); toast('Receipt saved'); }).catch(()=>toast('Couldn\u2019t save that receipt.')); } return; }
  if(el.dataset.vcov){ P.vehicles[+el.dataset.vcov].cov = el.value; save(); return render(); }
  if(el.id==='rcFile'){ const n=document.getElementById('rcFileName'); if(n) n.textContent = el.files.length ? 'Attached: '+el.files[0].name : ''; return; }
  if(el.dataset.extphoto){ addPhotos(P, el.files, P.exterior, 'outside of the building', el.dataset.source); return; }
  if(el.dataset.roomphoto){
    const r=P.rooms.find(x=>x.id===el.dataset.roomphoto);
    r.photoData = (r.photoData||[]).map(photoObj);
    addPhotos(P, el.files, r.photoData, r.name, el.dataset.source);
    return;
  }
  const map = {
    polNum:()=>{ polOf(P).number = el.value; },
    polRenew:()=>{ polOf(P).renewal = el.value; },
    polSwitch:()=>{ P.policyId = el.value==='new' ? null : el.value; },
    sqft:()=>P.info.sqft=num(el.value), cps:()=>P.info.cps=num(el.value), infl:()=>P.info.localInfl=num(el.value),
    flood:()=>P.info.flood=el.value, rent:()=>P.info.rent=num(el.value), renterProof:()=>P.info.renterProof=!!el.value,
    monthlyNeed:()=>P.info.monthlyNeed=num(el.value), monthsClosed:()=>P.info.monthsClosed=num(el.value),
    clNum:()=>P.claim.number=el.value.trim(), clDate:()=>P.claim.dateOfLoss=el.value,
    clReported:()=>P.claim.reportedOn=el.value, clProof:()=>P.claim.proofOn=el.value,
    clAdj:()=>P.claim.adjuster=el.value, clAdjPh:()=>P.claim.adjPhone=el.value, clAdjEmail:()=>P.claim.adjEmail=el.value.trim(),
    clStatus:()=>P.claim.status=el.value, clOrder:()=>P.claim.orderDate=el.value, clRate:()=>P.claim.mileRate=num(el.value)
  };
  if(el.id==='pState'){ P.state = el.value; P.stateCleared = false; if(el.value && !/,\s*[A-Z]{2}\s*$/.test(P.address||'')) P.address = (P.address && P.address!=='Add your city' ? P.address + ', ' : '') + el.value; save(); render(); if(el.value) toast(`${P.name} is set to ${STATE_NAME[el.value]}.`); return; }
  if(el.id==='pf-windType'){ const w = document.getElementById('pf-windAmtWrap'); if(w) w.hidden = !['pct','flat'].includes(el.value); return; }
  if(el.id==='shScan'){ const f = el.files[0]; if(!f) return; S.shareOpen = true;
    Promise.all([loadQrReader(), loadImg(f)]).then(([jsQR, img])=>{ const d = drawTo(img, 1600), data = d.canvas.getContext('2d').getImageData(0, 0, d.canvas.width, d.canvas.height);
      const r = jsQR(data.data, data.width, data.height, {inversionAttempts:'attemptBoth'}); const code = r && shareCodeClean(r.data);
      if(!code || !/^STORMFILE-SHARE:/i.test(r.data)) return toast('Couldn\u2019t read a StormFile code in that photo. Fill the screen with the code and try again, or type it.');
      const c = document.getElementById('shCode'); if(c){ c.value = code; } toast('Code scanned. Now tap \u201cAdd to this phone.\u201d'); })
      .catch(()=>toast('Couldn\u2019t read that photo. Try again, or type the code.')); el.value=''; return; }
  if(el.id==='ltKind'){ S.ltKind = el.value; S.ltExtra = ''; save(); render(); const c = document.getElementById('ltKind'); if(c) c.scrollIntoView({block:'center'}); return; }
  if(map[el.id]){ map[el.id](); save(); render(); }
});

view.addEventListener('input', e=>{
  const mk = e.target.id && e.target.id.startsWith('me-') ? e.target.id.slice(3) : null;
  if(e.target.id==='ltExtra' || e.target.id==='fuNote' || e.target.id==='fuDate'){ const P = cur();
    if(e.target.id==='ltExtra'){ S.ltExtra = e.target.value; const o = document.getElementById('ltOut'); if(o) o.value = letterText(P, LETTERS[S.ltKind]&&(!LETTERS[S.ltKind].only||LETTERS[S.ltKind].only===P.type)?S.ltKind:'followup', S.ltExtra); const m = document.getElementById('ltMail'); if(m) m.href = ltMailto(P); }
    else S[e.target.id] = e.target.value;
    save(); return; }
  if(mk){ S.me = S.me || {}; S.me[mk] = e.target.value; save(); return; }
  const k = e.target.dataset && e.target.dataset.fbt; if(!k) return;
  S.fb = S.fb || {}; S.fb[k] = e.target.value; save();
  const out = document.getElementById('fbOut'); if(out) out.value = fbText();
  const fm = document.getElementById('fbMail'); if(fm) fm.href = 'mailto:info@coastlinecode.com?subject=' + encodeURIComponent('StormFile feedback') + '&body=' + encodeURIComponent(fbText());
});
view.addEventListener('submit', e=>{
  e.preventDefault();
  const f = e.target, P = cur();
  if(f.dataset.additem){
    const r=P.rooms.find(x=>x.id===f.dataset.additem);
    const n=f.n.value.trim(), v=parseFloat(f.v.value), y=parseInt(f.y.value)||YEAR;
    if(!n||!(v>0)) return toast('Enter an item name and price.');
    r.items.push({n,v,y:Math.min(YEAR,Math.max(1950,y)),r:'',addedAt:nowISO()}); logEvt(P, `Added ${n} (${fmt(v)}, bought ${y}) to ${r.name}`); S.sample=false; save(); render(); toast('Added '+n);
  } else if(f.id==='addRoom'){
    const n=document.getElementById('roomName').value.trim(); if(!n) return;
    P.rooms.push(Object.assign(room(n),{open:true})); save(); render();
  } else if(f.id==='addReceipt'){
    const cat=document.getElementById('rcCat').value, what=document.getElementById('rcWhat').value.trim(), raw=parseFloat(document.getElementById('rcAmt').value);
    if(!what||!(raw>0)) return toast('Enter what it was for and the amount.');
    const file=document.getElementById('rcFile').files[0];
    const amt = cat==='Mileage' ? raw*(P.claim.mileRate||0) : raw;
    const rec = {cat, what: cat==='Mileage' ? `${what} (${raw} mi)` : what, amt, date:new Date().toLocaleDateString(), at:nowISO(), r: file ? (file.name||'Receipt') : ''};
    const finish = () => { P.claim.receipts.push(rec); logEvt(P, `Expense logged: ${cat}, ${fmt(amt)}${file?' with receipt':''}`);
      save(); render(); toast(cat==='Mileage' ? `Added ${raw} miles = ${fmt(amt)}` : 'Expense added'); };
    if(file){ storeDoc(file).then(d=>{ rec.rid = d.id; finish(); }).catch(()=>{ rec.r=''; finish(); toast('Expense added, but the receipt couldn\u2019t be saved.'); }); }
    else finish();
  } else if(f.id==='addUpgrade'){
    const n=document.getElementById('upN').value.trim(), v=parseFloat(document.getElementById('upV').value), y=parseInt(document.getElementById('upY').value)||YEAR;
    if(!n||!(v>0)) return toast('Enter the upgrade and its cost.');
    P.upgrades.push({n,v,y:Math.min(YEAR,Math.max(1950,y)),r:'',addedAt:nowISO()}); logEvt(P, `Added upgrade: ${n} (${fmt(v)}, ${y})`); save(); render(); toast('Added '+n);
  } else if(f.id==='addVehicle'){
    const n=document.getElementById('vhN').value.trim(); if(!n) return;
    P.vehicles.push({n,kind:document.getElementById('vhK').value,cov:document.getElementById('vhC').value,addedAt:nowISO()}); logEvt(P, `Added vehicle: ${n}`); save(); render(); toast('Added '+n);
  } else if(f.id==='addLog'){
    const note=document.getElementById('logNote').value.trim(); if(!note) return;
    P.claim.log.push({note,date:new Date().toLocaleDateString(),at:nowISO()}); logEvt(P, 'Call or email noted'); save(); render();
  } else if(f.id==='policyForm'){
    const g = id => { const el = document.getElementById('pf-'+id); return el ? el.value.trim() : ''; };
    const n = id => { const x = parseFloat(g(id).replace(/[^0-9.]/g,'')); return isFinite(x) && x>0 ? x : 0; };
    const a = {carrier:g('carrier'), form:g('form'), number:g('number'), renewal:g('renewal'), claimPhone:g('claimPhone'), agent:g('agent'),
      allPerils:n('allPerils'), windType:g('windType'), windAmt:n('windAmt'), flood:g('flood'), ordinance:g('ordinance'), contentsRC:g('contentsRC'),
      waterBackup:g('waterBackup'), mold:g('mold'), coins:n('coins'), wait:n('wait'), roofYear:n('roofYear')};
    PF_LIMITS[P.type].forEach(([k])=>a['lim'+k]=n('lim-'+k));
    if(!PF_LIMITS[P.type].some(([k])=>a['lim'+k]>0)) return toast('Enter at least one coverage amount.');
    if((a.windType==='pct'||a.windType==='flat') && !a.windAmt) return toast('Enter the wind deductible amount, or choose Not sure.');
    if(a.windType==='pct' && a.windAmt>25) return toast('That wind percentage looks too high. Enter 5 for 5%.');
    const pol = buildManualPolicy(P, a);
    const old = polOf(P);
    if(old && old.manual){ const others = usersOf(old.id).filter(x=>x.id!==P.id); if(!others.length) S.policies = S.policies.filter(x=>x.id!==old.id); }
    S.policies.push(pol); logEvt(P, old ? 'Policy details updated' : 'Policy entered');
    if(old) usersOf(old.id).forEach(x=>{ if(old.manual) x.policyId = pol.id; });
    P.policyId = pol.id;
    if(a.flood==='nfip'||a.flood==='private') P.info.flood = a.flood; else if(a.flood==='no') P.info.flood = 'none';
    if(n('sqft')) P.info.sqft = n('sqft');
    if(a.roofYear){ P.upgrades = (P.upgrades||[]).filter(u=>!/^Roof \(from policy\)/.test(u.n)); }
    S.tab = 'policy'; save(); render(); window.scrollTo(0,0); toast('Here\u2019s what your policy covers.');
  } else if(f.id==='addProp'){
    const name=document.getElementById('apName').value.trim(), type=document.getElementById('apType').value, city=document.getElementById('apAddr').value.trim(), stv=document.getElementById('apState').value;
    if(!name||!city) return; if(!stv) return toast('Pick the state this property is in.');
    const addr = city.replace(/,\s*[A-Za-z]{2}\s*$/,'') + ', ' + stv;
    const info = defaultInfo(type);
    const np = {upgrades:[], vehicles:[], id:uid(), type, name, address:addr, state:stv, inPath:false, policyId:document.getElementById('apPolicy').value||null, info, exterior:[], manual:{}, claim:blankClaim(), rooms:TYPES[type].rooms.map(n=>room(n))};
    S.properties.push(np); S.current = np.id; S.openAdd = false; S.tab = np.policyId ? 'home' : 'policy'; save(); render(); window.scrollTo(0,0); toast(np.policyId ? 'Added '+name : 'Added '+name+'. Now upload its policy.');
  }
});

load(); if(!VIEWS[S.tab]) S.tab='home';
if(!S.lang) S.lang = /^es\b/i.test(navigator.language || '') ? 'es' : 'en'; // Spanish phones start in Spanish
render(); if(S.lang === 'es') I18N.set('es'); showLock(); runAgeCheck();
bioSupported().then(ok=>{ BIO_OK = ok; if(S.tab==='settings') render(); });
try{ if(navigator.storage && navigator.storage.persist) navigator.storage.persist(); }catch(e){}
if(!NAT && 'serviceWorker' in navigator){ window.addEventListener('load', ()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); }); }
(async ()=>{
  try{
    const sm = window.claude && window.claude.use ? await window.claude.use('sample') : null;
    LIVE = !!sm;
  }catch(e){ LIVE = false; }
  if(S.tab==='home') render();
})();
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeTerm(); });
/* Remember which tap-to-open sections were left open, so they stay open when the screen updates. */
document.addEventListener('toggle', e=>{ const d = e.target; if(d && d.dataset && d.dataset.sec){ S.open = S.open || {}; if(S.open[d.dataset.sec] !== d.open){ S.open[d.dataset.sec] = d.open; save(); } } }, true);
/* Android back button in the phone app: close what's open, then go back to Home. */
if(NAT && NAT.onBack) NAT.onBack(()=>{
  if(document.querySelector('.termsheet')){ closeTerm(); return true; }
  const v = document.querySelector('.viewer'); if(v){ v.querySelector('[data-closeviewer]').click(); return true; }
  if(document.querySelector('.lockscreen')) return true;
  if(!menu.hidden){ setMenu(false); return true; }
  if(S.agreed && S.tab!=='home'){ go('home'); return true; }
  return false;
});
})();
