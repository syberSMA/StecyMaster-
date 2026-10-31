import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getDatabase, ref, onValue, set, get, update, remove, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { staticItems } from "./data-static.js";

const firebaseConfig = {
  apiKey: "AIzaSyDKAeiozNSKsrt2m91D0utim2VvddzE-cw",
  authDomain: "stetecymasterfire.firebaseapp.com",
  databaseURL: "https://stetecymasterfire-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "stetecymasterfire",
  storageBucket: "stetecymasterfire.firebasestorage.app",
  messagingSenderId: "636144676167",
  appId: "1:636144676167:web:a4c658d64778d5323b3062"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Global State
let currentUser = null; let currentUsername = null; let isAdmin = false; let isSignUpMode = false;
let globalAllItems = []; let currentCategoryFilter = 'Semua'; let currentSearchQuery = '';
let localImageBase64 = null; let localFileBase64 = null; let currentRejectItem = null;
let currentDetailItemId = null; let lastCommentTime = 0; 
let autoTranslateEnabled = localStorage.getItem('autoTranslate') === 'true';
let currentLang = localStorage.getItem('lang') || 'id';

// ================= ICONS SVG MAPPING =================
const catIcons = {
    'Semua': '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
    'Mod': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
    'Texture': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    'Map': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
    'Launcher': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>',
    'Plugin Server': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>',
    'MCPE and Craftman': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="17" cy="12" r="2"></circle><path d="M7 12h4m-2-2v4"></path></svg>',
    'Server': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="5" rx="1"></rect><rect x="2" y="15" width="20" height="5" rx="1"></rect><circle cx="6" cy="6.5" r="1"></circle><circle cx="6" cy="17.5" r="1"></circle></svg>'
};
const flagIcons = { 'Indonesia': 'id', 'Amerika Serikat': 'us', 'India': 'in', 'Singapura': 'sg', 'Malaysia': 'my', 'Brasil': 'br', 'Rusia': 'ru', 'Inggris': 'gb' };

function formatDate(timestamp) { if(!timestamp) return ''; return new Intl.DateTimeFormat('id-ID', {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'}).format(new Date(timestamp)); }

function renderCategoryChips() {
    const cont = document.getElementById('category-filter-container'); if(!cont) return; cont.innerHTML = '';
    Object.keys(catIcons).forEach(cat => {
        const isActive = cat === currentCategoryFilter;
        cont.innerHTML += `<button class="chip ${isActive?'active':''}" onclick="window.setCategoryFilter('${cat}', this)">${catIcons[cat]} <span>${cat}</span></button>`;
    });
}
document.addEventListener('DOMContentLoaded', renderCategoryChips);

window.toggleAutoTranslate = (e) => { if(e) e.preventDefault(); autoTranslateEnabled = !autoTranslateEnabled; localStorage.setItem('autoTranslate', autoTranslateEnabled); const cb = document.getElementById('auto-translate-checkbox'); if(cb) cb.checked = autoTranslateEnabled; };

let activeDialogs = [];
window.openDialog = (id) => { document.getElementById('dialogLayer').classList.remove('hidden'); document.getElementById('dialogLayer').classList.add('active'); document.getElementById(id).classList.add('active'); activeDialogs.push(id); document.body.style.overflow = 'hidden'; };
window.closeDialog = (id) => { document.getElementById(id).classList.remove('active'); activeDialogs = activeDialogs.filter(d => d !== id); if(activeDialogs.length === 0) { document.getElementById('dialogLayer').classList.remove('active'); setTimeout(() => document.getElementById('dialogLayer').classList.add('hidden'), 300); document.body.style.overflow = ''; } };
window.closeTopDialog = () => { if(activeDialogs.length > 0) window.closeDialog(activeDialogs[activeDialogs.length - 1]); };
document.addEventListener('keydown', (e) => { if(e.key === 'Escape') window.closeTopDialog(); });
window.showModalAlert = (msg) => { document.getElementById('dialog-alert-msg').innerText = msg; window.openDialog('dialog-alert'); };
window.showModalConfirm = (msg, onConfirmCallback) => { document.getElementById('dialog-confirm-msg').innerText = msg; document.getElementById('btn-dialog-confirm').onclick = () => { window.closeDialog('dialog-confirm'); onConfirmCallback(); }; window.openDialog('dialog-confirm'); };
window.copyText = (text) => { navigator.clipboard.writeText(text).then(() => { window.showModalAlert(`Berhasil menyalin: ${text}`); }); };

// ================= FORCE DOWNLOAD VIA PROXY API & ANCHOR DOWNLOAD =================
window.downloadBase64File = (dataUrl, filename) => {
    const a = document.createElement('a'); a.href = dataUrl; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
};

window.handleDownload = async (url, itemId) => {
    if (!url || url === '#') return;
    
    // Logic Poin Download: User mendownload file, poin dikalkulasi
    if (currentUser && itemId) {
        try {
            const snapItem = await get(ref(db, `items_public/${itemId}/downloadsData/${currentUser.uid}`));
            if(!snapItem.exists()) {
                await update(ref(db), { [`items_public/${itemId}/downloadsData/${currentUser.uid}`]: true });
                // Simulate points (Ideally Cloud Functions) - simplified check
                const snapDls = await get(ref(db, `items_public/${itemId}/downloadsData`));
                const totalDls = snapDls.exists() ? Object.keys(snapDls.val()).length : 1;
                const uploaderId = (await get(ref(db, `items_public/${itemId}/uid`))).val();
                if(uploaderId && uploaderId !== currentUser.uid && totalDls % 5 === 0 && totalDls <= 150) {
                    const snapPts = await get(ref(db, `profiles/${uploaderId}/points`));
                    await update(ref(db, `profiles/${uploaderId}`), {points: (snapPts.val() || 0) + 1});
                }
            }
        } catch(e) {}
    }

    if(url.startsWith('data:')) { window.downloadBase64File(url, "downloaded_file"); return; }

    let finalUrl = url; let isRedirect = false; let providerName = '';
    const lowerUrl = url.toLowerCase();
    
    if (lowerUrl.includes('mediafire.com')) { providerName = 'MediaFire'; isRedirect = true; }
    else if (lowerUrl.includes('drive.google.com')) { providerName = 'Google Drive'; isRedirect = true; }
    else if (lowerUrl.includes('linkvertise.com') || lowerUrl.includes('adf.ly')) { providerName = 'Situs Pihak Ketiga'; isRedirect = true; } 
    else if (lowerUrl.includes('dropbox.com')) { finalUrl = url.replace('?dl=0', '?dl=1'); if (!finalUrl.includes('?dl=1')) finalUrl += (finalUrl.includes('?') ? '&dl=1' : '?dl=1'); }

    if (isRedirect) {
        window.showModalConfirm(`Tautan diamankan oleh ${providerName}. Anda akan diarahkan ke halaman resmi penyedia untuk mengunduh. Lanjutkan?`, () => window.open(finalUrl, '_blank'));
    } else {
        const proxyUrl = '/api/download?url=' + encodeURIComponent(finalUrl);
        let iframe = document.getElementById('download-iframe');
        if (!iframe) { iframe = document.createElement('iframe'); iframe.id = 'download-iframe'; iframe.style.display = 'none'; document.body.appendChild(iframe); }
        iframe.src = proxyUrl;
    }
};

// ================= BOTTOM SHEETS =================
const categoryOptions = ['Mod', 'Texture', 'Map', 'Launcher', 'Plugin Server', 'MCPE and Craftman', 'Server'];
const versionOptions = ['0.15.10', '0.14.3', '0.14.3 - 0.15.10'];
function getSafeIcon(cat) { if(!catIcons[cat]) return ''; return catIcons[cat].replace('<svg ', '<svg style="width:20px; height:20px; flex-shrink:0; margin-right:8px; display:inline-block;" '); }

window.openCategorySheet = () => {
   document.getElementById('sheet-title').innerText = "Pilih Kategori";
   const opts = document.getElementById('sheet-options'); opts.innerHTML = '';
   const currentWrap = document.getElementById('selected-category-text-wrap').querySelector('span');
   const current = currentWrap ? currentWrap.innerText.trim() : 'Mod';
   categoryOptions.forEach(cat => {
       const isSel = cat === current; const checkSVG = isSel ? `<svg class="sheet-option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>` : '';
       opts.innerHTML += `<div class="sheet-option ${isSel ? 'selected' : ''}" onclick="window.selectCategoryForm('${cat}')"><div class="flex items-center" style="gap:10px;">${catIcons[cat]} <span>${cat}</span></div> ${checkSVG}</div>`;
   });
   document.getElementById('bottom-sheet-overlay').classList.add('active');
};
window.selectCategoryForm = (cat) => {
   document.getElementById('selected-category-text-wrap').innerHTML = `${getSafeIcon(cat)} <span>${cat}</span>`;
   window.closeBottomSheet();
   const labelFile = document.getElementById('label-file-download');
   if(labelFile) { const maxText = cat === 'MCPE and Craftman' ? '90MB' : '5MB'; labelFile.innerHTML = `File Download / Mod* <span style="font-weight:normal; font-size:10px; display:block;">(Max ${maxText})</span>`; }
   if(cat === 'Server') { document.getElementById('wrapper-title-standard').classList.add('hidden'); document.getElementById('wrapper-title-server').classList.remove('hidden'); document.getElementById('form-file-container').classList.add('hidden'); } else { document.getElementById('wrapper-title-standard').classList.remove('hidden'); document.getElementById('wrapper-title-server').classList.add('hidden'); document.getElementById('form-file-container').classList.remove('hidden'); }
};

window.openVersionSheet = () => {
   document.getElementById('sheet-title').innerText = "Versi MCPE";
   const opts = document.getElementById('sheet-options'); opts.innerHTML = '';
   const current = document.getElementById('selected-version-text').innerText;
   versionOptions.forEach(ver => {
       const isSel = ver === current; const checkSVG = isSel ? `<svg class="sheet-option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>` : '';
       opts.innerHTML += `<div class="sheet-option ${isSel ? 'selected' : ''}" onclick="window.selectVersionForm('${ver}')">${ver} ${checkSVG}</div>`;
   });
   document.getElementById('bottom-sheet-overlay').classList.add('active');
};
window.selectVersionForm = (ver) => { document.getElementById('selected-version-text').innerText = ver; window.closeBottomSheet(); };

window.openCountrySheet = () => {
   document.getElementById('sheet-title').innerText = "Pilih Negara Server";
   const opts = document.getElementById('sheet-options'); opts.innerHTML = '';
   const currentWrap = document.getElementById('selected-country-text-wrap').querySelector('span');
   const current = currentWrap ? currentWrap.innerText.trim() : 'Indonesia';
   Object.keys(flagIcons).forEach(country => {
       const isSel = country === current; const checkSVG = isSel ? `<svg class="sheet-option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>` : '';
       opts.innerHTML += `<div class="sheet-option ${isSel ? 'selected' : ''}" onclick="window.selectCountryForm('${country}')"><div class="flex items-center" style="gap:10px;"><img src="https://flagcdn.com/${flagIcons[country]}.svg" style="width:24px; height:18px; object-fit:contain; border-radius:2px;"><span>${country}</span></div> ${checkSVG}</div>`;
   });
   document.getElementById('bottom-sheet-overlay').classList.add('active');
};
window.selectCountryForm = (country) => { document.getElementById('selected-country-text-wrap').innerHTML = `<img src="https://flagcdn.com/${flagIcons[country]}.svg" style="width:20px; height:15px; object-fit:contain; border-radius:2px;"> <span>${country}</span>`; window.closeBottomSheet(); };

window.closeBottomSheet = () => { document.getElementById('bottom-sheet-overlay').classList.remove('active'); };
window.switchScreen = (id) => { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); window.scrollTo(0, 0); };
window.requireLoginAndSwitch = (id) => { if(currentUser) window.switchScreen(id); else { window.showModalAlert("Silakan masuk untuk mengakses halaman ini."); window.switchScreen('screen-login'); } };
window.toggleDrawer = (id) => { const isAct = document.getElementById(id).classList.contains('active'); window.closeAllDrawers(); if(!isAct) { document.getElementById(id).classList.add('active'); document.getElementById('drawer-overlay').classList.add('active'); } };
window.closeAllDrawers = () => { document.querySelectorAll('.side-drawer').forEach(el => el.classList.remove('active')); document.getElementById('drawer-overlay').classList.remove('active'); };

function getRoleBadge(role) {
    if (role === 'admin' || role === 'dev') return `<span class="badge-role badge-dev"><svg viewBox="0 0 24 24" style="width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2;"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg> Dev</span>`;
    return `<span class="badge-role badge-user"><svg viewBox="0 0 24 24" style="width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> User</span>`;
}
function generateDefaultAvatar(name) {
    const c = document.createElement('canvas'); c.width = 100; c.height = 100; const ctx = c.getContext('2d');
    ctx.fillStyle = '#ff8c00'; ctx.fillRect(0,0,100,100); ctx.fillStyle = '#000000'; ctx.font = 'bold 50px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText((name || '?').charAt(0).toUpperCase(), 50, 50); return c.toDataURL('image/jpeg', 0.8);
}

window.toggleAuthMode = () => { isSignUpMode = !isSignUpMode; document.getElementById('login-error').innerText = ''; };
window.processEmailAuth = async () => {
  const email = document.getElementById('auth-email').value.trim(); const password = document.getElementById('auth-password').value;
  if (!email || !password) { document.getElementById('login-error').innerText = 'Isi form dengan lengkap.'; return; }
  document.getElementById('auth-submit-btn').disabled = true;
  try { if (isSignUpMode) await createUserWithEmailAndPassword(auth, email, password); else await signInWithEmailAndPassword(auth, email, password);
  } catch (err) { document.getElementById('login-error').innerText = err.message; document.getElementById('auth-submit-btn').disabled = false; }
};
window.customLogout = () => { window.closeAllDrawers(); window.showModalConfirm("Keluar dari Akun?", () => { signOut(auth).then(() => { isAdmin = false; currentUser = null; currentUsername = null; window.switchScreen('screen-login'); updateHeaderAuthUI();}); }); };

function updateHeaderAuthUI() {
    if(currentUser) {
        document.getElementById('btn-login-header').classList.add('hidden');
    } else {
        document.getElementById('btn-login-header').classList.remove('hidden'); document.getElementById('drawer-menu-admin').classList.add('hidden');
        document.getElementById('sidebar-profile-img').src = "https://via.placeholder.com/60"; document.getElementById('sidebar-name').innerText = "Tamu"; document.getElementById('sidebar-role').innerHTML = "";
    }
}

async function proceedToHome(user, pData) {
     currentUsername = pData.username; isAdmin = pData.role === 'admin' || pData.role === 'dev';
     document.getElementById('profile-name').innerHTML = `${currentUsername} ${pData.points >= 150 ? '<span class="verified-icon"><svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></span>' : ''}`;
     document.getElementById('sidebar-name').innerText = currentUsername;
     const dp = pData.avatar || user.photoURL || generateDefaultAvatar(currentUsername);
     document.getElementById('profile-img').src = dp; document.getElementById('sidebar-profile-img').src = dp;
     document.getElementById('profile-role-badge').innerHTML = getRoleBadge(pData.role); document.getElementById('sidebar-role').innerHTML = getRoleBadge(pData.role);
     
     // Update Points UI
     let pts = pData.points || 0;
     let level = pts >= 150 ? (pts >= 400 ? (pts >= 800 ? 3 : 2) : 1) : 0;
     let nextTgt = level === 0 ? 150 : (level === 1 ? 400 : (level === 2 ? 800 : 9999));
     document.getElementById('profile-level-info').innerText = `Level ${level} (${pts} Poin)`;
     document.getElementById('profile-next-target').innerText = `${pts} / ${nextTgt} Poin menuju Level ${level+1}`;
     document.getElementById('profile-progress-bar').style.width = `${Math.min((pts/nextTgt)*100, 100)}%`;
     
     document.getElementById('stat-upload').innerText = pData.itemCount || 0;
     document.getElementById('stat-points').innerText = pts;
     
     if(isAdmin) document.getElementById('drawer-menu-admin').classList.remove('hidden'); else document.getElementById('drawer-menu-admin').classList.add('hidden');
     
     // Daily Login Points Logic
     const today = new Date().toISOString().split('T')[0];
     if(pData.lastDailyLogin !== today) {
         await update(ref(db, `profiles/${user.uid}`), { lastDailyLogin: today, points: pts + 2 });
     }
     
     if(isAdmin) loadPendingItems(); window.switchScreen('screen-home'); fetchAllItemsAndRender();
     document.getElementById('selected-category-text-wrap').innerHTML = `${getSafeIcon('Mod')} <span>Mod</span>`;
}

setPersistence(auth, browserLocalPersistence).then(() => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user; updateHeaderAuthUI();
      try {
          const pSnap = await get(ref(db, `profiles/${user.uid}`));
          if (pSnap.exists() && pSnap.val().username) { proceedToHome(user, pSnap.val()); } 
          else {
             const uSnap = await get(ref(db, `users/${user.uid}/username`));
             if (uSnap.exists() && uSnap.val()) {
                 const oldUsername = uSnap.val(); const oldUserLower = oldUsername.toLowerCase(); const isAdm = (await get(ref(db, `admins/${user.uid}`))).val() === true;
                 const updates = {}; updates[`profiles/${user.uid}`] = { username: oldUsername, role: isAdm ? 'admin' : 'user', joinedAt: serverTimestamp(), avatar: user.photoURL || '', itemCount: 0, points: 0 }; updates[`usernames/${oldUserLower}`] = user.uid;
                 await update(ref(db), updates); proceedToHome(user, updates[`profiles/${user.uid}`]);
             } else { window.switchScreen('screen-username'); }
          }
      } catch (err) { document.getElementById('screen-error-msg').innerText = "Gagal memuat akun: " + err.message; window.switchScreen('screen-error'); }
    } else {
      currentUser = null; currentUsername = null; isAdmin = false; updateHeaderAuthUI(); window.switchScreen('screen-home'); fetchAllItemsAndRender();
      document.getElementById('selected-category-text-wrap').innerHTML = `${getSafeIcon('Mod')} <span>Mod</span>`;
    }
  });
}).catch(() => { window.switchScreen('screen-home'); fetchAllItemsAndRender(); });

window.saveUsername = async () => {
  const username = document.getElementById('input-username').value.trim(); const usernameLower = username.toLowerCase();
  const errEl = document.getElementById('username-error'); const btn = document.getElementById('btn-save-username');
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) { errEl.innerText = "Tidak valid."; return; }
  btn.disabled = true; btn.innerText = "Menyimpan..."; errEl.innerText = "";
  try {
    const unSnap = await get(ref(db, `usernames/${usernameLower}`));
    if (unSnap.exists() && unSnap.val() !== currentUser.uid) { errEl.innerText = "Username terpakai!"; btn.disabled = false; btn.innerText = "Simpan"; return; }
    const isAdm = (await get(ref(db, `admins/${currentUser.uid}`))).val() === true; const dp = currentUser.photoURL || generateDefaultAvatar(username);
    const updates = {}; updates[`usernames/${usernameLower}`] = currentUser.uid; updates[`profiles/${currentUser.uid}`] = { username: username, avatar: dp, role: isAdm ? 'admin' : 'user', joinedAt: serverTimestamp(), itemCount: 0, points: 0 };
    await update(ref(db), updates); proceedToHome(currentUser, updates[`profiles/${currentUser.uid}`]);
  } catch (e) { errEl.innerText = "Akses ditolak. " + e.message; btn.disabled = false; btn.innerText = "Simpan"; }
};

window.handleProfileUpload = async (event) => {
  const file = event.target.files[0]; if (!file) return;
  if (!file.type.startsWith('image/')) return;
  try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = async () => {
          try {
              const canvas = document.createElement('canvas'); const size = Math.min(img.width, img.height); const targetSize = 256; canvas.width = targetSize; canvas.height = targetSize; const ctx = canvas.getContext('2d');
              const offsetX = (img.width - size) / 2; const offsetY = (img.height - size) / 2; ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, targetSize, targetSize);
              let base64Image = canvas.toDataURL('image/jpeg', 0.8); 
              await update(ref(db, `profiles/${currentUser.uid}`), { avatar: base64Image });
              document.getElementById('profile-img').src = base64Image; document.getElementById('sidebar-profile-img').src = base64Image;
          } catch(err) { window.showModalAlert("Error upload."); }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
  } catch (error) {}
};

window.openUserProfile = async (uid) => {
    if(!currentUser) { window.showModalAlert("Silakan masuk/login untuk melihat profil."); return; }
    try {
        const pSnap = await get(ref(db, `profiles/${uid}`)); if(!pSnap.exists()) return; const p = pSnap.val();
        document.getElementById('pub-profile-img').src = p.avatar || generateDefaultAvatar(p.username);
        const isVer = p.points >= 150 ? '<span class="verified-icon"><svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></span>' : '';
        document.getElementById('pub-profile-name').innerHTML = `${p.username} ${isVer}`; 
        document.getElementById('pub-profile-role').innerHTML = getRoleBadge(p.role);
        document.getElementById('pub-profile-bio').innerText = p.bio || (uid === currentUser.uid ? 'Belum ada bio.' : '');
        document.getElementById('pub-profile-joined').innerText = formatDate(p.joinedAt); document.getElementById('pub-profile-items').innerText = p.itemCount || 0;
        if(uid === currentUser.uid) { document.getElementById('pub-profile-edit-section').classList.remove('hidden'); document.getElementById('input-pub-bio').value = p.bio || ''; } else { document.getElementById('pub-profile-edit-section').classList.add('hidden'); }
        window.openDialog('dialog-user-profile');
    } catch(e) { window.showModalAlert("Gagal memuat profil."); }
};
window.saveBio = async () => { const bio = document.getElementById('input-pub-bio').value.trim(); if(bio.length > 80) return; try { await update(ref(db, `profiles/${currentUser.uid}`), {bio: bio}); document.getElementById('pub-profile-bio').innerText = bio; window.showModalAlert("Bio disimpan."); } catch(e) { window.showModalAlert("Error."); } };
window.saveBioSelf = async () => { const bio = document.getElementById('input-self-bio').value.trim(); if(bio.length > 80) return; try { await update(ref(db, `profiles/${currentUser.uid}`), {bio: bio}); window.showModalAlert("Bio disimpan."); } catch(e) {} };

window.switchProfileTab = (tab) => {
    document.querySelectorAll('.profile-content-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-${tab}`).classList.remove('hidden');
};

window.handleSearch = (query) => { currentSearchQuery = query.toLowerCase(); renderItemsToUI(); };
window.setCategoryFilter = (category, btnElement) => { currentCategoryFilter = category; renderCategoryChips(); renderItemsToUI(); };

function fetchAllItemsAndRender() {
  onValue(ref(db, 'items_public'), (snapshot) => {
    let dynamicItems = [];
    if (snapshot.exists()) { snapshot.forEach(child => { dynamicItems.push({ id: child.key, source: 'firebase', ...child.val() }); }); }
    globalAllItems = [...staticItems, ...dynamicItems]; 
    renderItemsToUI(); 
  });
}

function fetchServerStatus(id, target) {
  const statusEl = document.getElementById(`status-${id}`); const playersEl = document.getElementById(`players-${id}`);
  if (!statusEl) return;
  const [host, portRaw] = target.split(':'); const port = portRaw || '19132';
  fetch(`/api/server?host=${host}&port=${port}`).then(res => res.json()).then(data => {
      if (data.online) { statusEl.className = 'badge-status online'; statusEl.innerText = 'Online'; if(playersEl) playersEl.innerText = `${data.players.online} / ${data.players.max}`; } 
      else { statusEl.className = 'badge-status offline'; statusEl.innerText = data.error === 'Timeout' ? 'Timeout' : 'Offline'; }
    }).catch(() => { statusEl.className = 'badge-status offline'; statusEl.innerText = 'Error'; });
}
setInterval(() => {
  if (!document.getElementById('screen-home').classList.contains('hidden')) {
      if (currentCategoryFilter === 'Semua' || currentCategoryFilter === 'Server') { document.querySelectorAll('.badge-status').forEach(el => { const t = el.getAttribute('data-target'); const id = el.id.replace('status-', ''); if (t) fetchServerStatus(id, t); }); }
  }
}, 30000);

// ================= SISTEM VOTE BINTANG REAL-TIME & ANTI-ABUSE =================
window.toggleVote = async (itemId) => {
    if (!currentUser) { window.showModalAlert("Silakan masuk/login untuk mem-vote!"); return; }
    const item = globalAllItems.find(i => i.id === itemId); if (!item) return;

    if (item.uid === currentUser.uid && item.source !== 'github') { window.showModalAlert("Kamu tidak bisa vote server milikmu sendiri."); return; }

    const isVoted = item.votes && item.votes[currentUser.uid];
    let currentStars = item.stars || 0;
    const updates = {};
    if (isVoted) {
        updates[`items_public/${itemId}/votes/${currentUser.uid}`] = null;
        updates[`items_public/${itemId}/stars`] = Math.max(0, currentStars - 1);
    } else {
        updates[`items_public/${itemId}/votes/${currentUser.uid}`] = true;
        updates[`items_public/${itemId}/stars`] = currentStars + 1;
        // Poin untuk uploader
        if (item.uid && item.uid !== currentUser.uid && currentStars < 40) {
            get(ref(db, `profiles/${item.uid}/points`)).then(s => {
                update(ref(db, `profiles/${item.uid}`), { points: (s.val() || 0) + 2 });
            });
        }
    }
    try { await update(ref(db), updates); } catch(e) { window.showModalAlert("Gagal mengirim vote."); }
}

window.openDetail = async (itemId) => {
    const item = globalAllItems.find(i => i.id === itemId); if(!item) return;
    currentDetailItemId = itemId;
    
    // SERVER DILARANG BUKA DETAIL
    if (item.category.toLowerCase() === 'server') return;

    document.getElementById('detail-img').src = item.url_img; document.getElementById('detail-title').innerText = item.title; document.getElementById('detail-uploader-name').innerText = item.username || 'System';
    
    let uploaderRole = 'member'; let avatarUrl = generateDefaultAvatar(item.username); let isVer = '';
    if(item.uid) {
         try { const pSnap = await get(ref(db, `profiles/${item.uid}`)); if(pSnap.exists()) { const p = pSnap.val(); uploaderRole = p.role; avatarUrl = p.avatar || generateDefaultAvatar(item.username); if(p.points >= 150) isVer = '<span class="verified-icon"><svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></span>'; } } catch(e){}
    } else if (item.source === 'github') uploaderRole = 'dev';
    
    document.getElementById('detail-uploader-badge').innerHTML = getRoleBadge(uploaderRole); document.getElementById('detail-uploader-avatar').src = avatarUrl;
    document.getElementById('detail-uploader-name').innerHTML = `${item.username || 'System'} ${isVer}`;
    document.getElementById('detail-uploader-avatar').onclick = () => { if(item.uid) window.openUserProfile(item.uid); }; document.getElementById('detail-uploader-name').onclick = () => { if(item.uid) window.openUserProfile(item.uid); };
    document.getElementById('detail-category').innerText = item.category; document.getElementById('detail-version').innerText = item.version || 'All Vers.'; document.getElementById('detail-desc').innerText = item.desc_id || item.desc || '-';
    
    const actionContainer = document.getElementById('detail-action-container');
    const dlIconSVG = `<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
    actionContainer.innerHTML = `<button class="btn btn-primary" onclick="window.handleDownload('${item.url_file}', '${item.id}')">${dlIconSVG} Download File</button>`;

    loadComments(itemId);
    if(currentUser){ document.getElementById('comment-form-container').classList.remove('hidden'); document.getElementById('comment-login-prompt').classList.add('hidden'); } 
    else { document.getElementById('comment-form-container').classList.add('hidden'); document.getElementById('comment-login-prompt').classList.remove('hidden'); }
    document.getElementById('screen-detail-container').classList.add('active'); document.body.style.overflow = 'hidden';
}
window.closeDetailAndLogin = () => { document.getElementById('screen-detail-container').classList.remove('active'); document.body.style.overflow=''; window.switchScreen('screen-login'); }

let globalProfilesCache = {};
function renderItemsToUI() {
  const container = document.getElementById('public-items-container'); container.innerHTML = '';
  const myContentContainer = document.getElementById('my-content-list'); if(myContentContainer) myContentContainer.innerHTML = '';

  let displayItems = globalAllItems;
  
  // EXCLUDE SERVER FROM "SEMUA"
  if (currentCategoryFilter === 'Semua') {
      displayItems = displayItems.filter(item => item.category.toLowerCase() !== 'server');
  } else {
      displayItems = displayItems.filter(item => item.category.toLowerCase() === currentCategoryFilter.toLowerCase());
  }

  if (currentSearchQuery.trim() !== '') displayItems = displayItems.filter(item => item.title.toLowerCase().includes(currentSearchQuery));
  if (currentCategoryFilter === 'Server') displayItems.sort((a,b) => (b.stars || 0) - (a.stars || 0)); else displayItems.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
  
  if (displayItems.length === 0) { container.innerHTML = `<p style="text-align:center; color: var(--text-muted); padding:20px;">Tidak ditemukan.</p>`; }

  const isSpecific = currentCategoryFilter !== 'Semua'; 
  const dlIconSVG = `<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;

  let htmlBuf = '';
  displayItems.forEach(item => {
      const isUploaderAdmin = item.source === 'github'; 
      const userRoleBadge = item.source === 'github' ? getRoleBadge('dev') : `<span id="badge-${item.id}">${getRoleBadge('member')}</span>`;
      let isVer = '';
      if(item.uid) { get(ref(db, `profiles/${item.uid}`)).then(s=>{ if(s.exists()){ const p=s.val(); const el=document.getElementById(`badge-${item.id}`); if(el) el.innerHTML = getRoleBadge(p.role); if(p.points >= 150){ const vEl=document.getElementById(`ver-${item.id}`); if(vEl) vEl.innerHTML = '<span class="verified-icon"><svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></span>'; } } }); }

      if (item.category.toLowerCase() === 'server') {
        const ipTarget = item.server_ip ? `${item.server_ip}:${item.server_port || 19132}` : item.version; 
        const countryFlag = item.country ? `<div class="server-flag-badge"><img src="https://flagcdn.com/${flagIcons[item.country] || 'id'}.svg" style="width:16px; object-fit:contain; border-radius:2px;"></div>` : '';
        const isVoted = currentUser && item.votes && item.votes[currentUser.uid];
        const starClass = isVoted ? 'badge-star voted' : 'badge-star';
        
        // Cek video/gif atau img
        const isVideo = item.url_img && (item.url_img.includes('data:video') || item.url_img.endsWith('.mp4'));
        const mediaHTML = isVideo ? `<video src="${item.url_img}" class="server-banner-media" autoplay loop muted playsinline></video>` : `<img src="${item.url_img}" class="server-banner-media lazy-img" loading="lazy" onload="this.classList.add('loaded'); this.parentElement.classList.remove('skeleton')" onerror="this.src='https://via.placeholder.com/468x60'; this.classList.add('loaded'); this.parentElement.classList.remove('skeleton')">`;
        
        setTimeout(()=>fetchServerStatus(item.id, ipTarget), 100);

        htmlBuf += `
        <div class="card-server-compact">
            <div class="server-banner-wrapper skeleton">
                ${mediaHTML}
                ${countryFlag}
            </div>
            <div class="server-body-compact">
                <div class="server-header-row">
                    <div class="server-title-row">
                        <span class="server-title-text">${item.title}</span>
                        <span id="ver-${item.id}"></span>
                        ${userRoleBadge}
                    </div>
                    <button class="icon-btn btn-copy-ip" onclick="window.copyText('${ipTarget}')" style="padding:4px; border:none; background:none;">
                        <svg class="icon icon-sm" viewBox="0 0 24 24" stroke="currentColor"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                </div>
                <div class="server-ip-text"><svg class="icon" style="width:12px; height:12px;" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"></path><circle cx="12" cy="9" r="2.5"></circle></svg> ${ipTarget}</div>
                
                <div class="server-badges-row">
                    <div class="badge-status" id="status-${item.id}" data-target="${ipTarget}">Mengecek...</div>
                    <div class="${starClass}" onclick="window.toggleVote('${item.id}')">
                        <svg style="width:14px; height:14px;" viewBox="0 0 24 24" fill="${isVoted ? '#fbc02d' : 'none'}" stroke="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        <span>${item.stars || 0}</span>
                    </div>
                    <div class="badge-players">
                        <svg style="width:14px; height:14px;" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        <span id="players-${item.id}">0 / 0</span>
                    </div>
                </div>
            </div>
        </div>`;
      } else {
        const cardClass = isSpecific ? 'card-vertical' : 'card-horizontal';
        let actionBtnHTML = `<button class="btn btn-primary" onclick="event.stopPropagation(); window.handleDownload('${item.url_file}', '${item.id}')" style="flex:1;">${dlIconSVG} Download</button>`;
        htmlBuf += `
        <div class="${cardClass}" onclick="window.openDetail('${item.id}')">
          <div class="card-img-wrapper skeleton"><img src="${item.url_img}" class="card-img lazy-img" loading="lazy" onload="this.classList.add('loaded'); this.parentElement.classList.remove('skeleton')" onerror="this.src='https://via.placeholder.com/300'; this.classList.add('loaded'); this.parentElement.classList.remove('skeleton')"></div>
          <div class="card-body">
            <h3 class="font-bold text-main" style="margin-bottom:4px;">${item.title}</h3>
            <div style="font-size:11px; margin-bottom:8px; color:var(--text-muted); display:flex; align-items:center;" onclick="event.stopPropagation(); window.openUserProfile('${item.uid}')">
               Oleh: <span class="text-main" style="margin-left:4px; margin-right:4px;">${item.username || 'System'}</span> <span id="ver-${item.id}"></span> ${userRoleBadge}
            </div>
            <div>
               <span class="card-meta">${item.category}</span> ${item.version ? `<span class="card-meta" style="background:none; border:1px solid var(--border-color); color:var(--text-muted);">${item.version}</span>` : ''}
            </div>
            <p class="card-desc">${item.desc_id || item.desc || ''}</p>
            <div class="flex" style="gap:10px;">${actionBtnHTML}</div>
          </div>
        </div>`;
      }
      
      // Render to Profile My Content if owned
      if (currentUser && item.uid === currentUser.uid && myContentContainer) {
          myContentContainer.innerHTML += `
            <div class="card-horizontal" style="height:auto; min-height:80px; align-items:center;">
                <div class="card-img-wrapper" style="width:80px; min-width:80px;"><img src="${item.url_img}" class="card-img"></div>
                <div class="card-body" style="padding:8px;">
                    <h3 style="font-size:13px; margin-bottom:4px;">${item.title}</h3>
                    <div style="font-size:10px; color:var(--success); font-weight:bold; margin-bottom:4px;"><svg class="icon icon-sm" style="width:10px;height:10px;vertical-align:middle;" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg> Approved</div>
                    <div style="font-size:10px; color:var(--text-muted);"><svg class="icon icon-sm" style="width:10px;height:10px;" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> ${item.downloadsData ? Object.keys(item.downloadsData).length : 0} Dls</div>
                </div>
                <button class="icon-btn" style="color:var(--danger); border-color:var(--danger); margin-right:10px;" onclick="window.deletePublicItem('${item.id}', '${item.title}')"><svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
            </div>
          `;
      }
  });
  container.innerHTML = htmlBuf;
}

// ================= CROPPER JS & BYPASS GIF/VIDEO =================
let cropperInstance = null;
window.handleLocalImage = (e) => {
  const file = e.target.files[0]; if (!file) return;
  const currentCat = document.getElementById('selected-category-text-wrap').innerText.trim();
  const isServer = currentCat === 'Server';
  const maxSizeMB = isServer ? 8 : 5;
  if (file.size > maxSizeMB * 1024 * 1024) { window.showModalAlert(`Ukuran maksimal gambar/video preview adalah ${maxSizeMB}MB!`); e.target.value = ''; return; }

  const reader = new FileReader();
  reader.onload = (ev) => { 
      // Bypass Cropper jika GIF atau Video
      if (isServer && (file.type === 'image/gif' || file.type.startsWith('video/'))) {
          localImageBase64 = ev.target.result; 
          document.getElementById('img-status').innerText = file.type.startsWith('video') ? `✓ Video/GIF Terpilih` : `✓ GIF dipilih`; 
          document.getElementById('add-img').value = ""; 
      } 
      else if (isServer) {
          document.getElementById('cropper-image').src = ev.target.result;
          window.openDialog('dialog-cropper');
          if (cropperInstance) cropperInstance.destroy();
          cropperInstance = new Cropper(document.getElementById('cropper-image'), { aspectRatio: 468 / 60, viewMode: 1, background: false, zoomable: true });
      } else {
          localImageBase64 = ev.target.result; 
          document.getElementById('img-status').innerText = `✓ Gambar dipilih`; 
          document.getElementById('add-img').value = ""; 
      }
  };
  reader.readAsDataURL(file);
};
window.confirmCrop = () => { if(!cropperInstance) return; const canvas = cropperInstance.getCroppedCanvas({ width: 468, height: 60 }); localImageBase64 = canvas.toDataURL('image/jpeg', 0.9); document.getElementById('img-status').innerText = '✓ Banner di-crop (468x60)'; window.closeDialog('dialog-cropper'); }
window.cancelCrop = () => { window.closeDialog('dialog-cropper'); document.getElementById('add-img').value = ''; document.getElementById('file-img').value = ''; }
window.handleLocalFile = (e) => { const file = e.target.files[0]; if (!file) return; const currentCat = document.getElementById('selected-category-text-wrap').innerText.trim(); const maxMB = (currentCat === 'MCPE and Craftman') ? 90 : 5; if (file.size > maxMB * 1024 * 1024) { window.showModalAlert(`Max ${maxMB}MB!`); e.target.value = ''; return; } const reader = new FileReader(); reader.onload = (e) => { localFileBase64 = e.target.result; document.getElementById('file-status').innerText = `✓ File dipilih`; document.getElementById('add-file').value = ""; }; reader.readAsDataURL(file); };

window.submitItem = async () => {
  if (!currentUser) return;
  const catWrap = document.getElementById('selected-category-text-wrap').querySelector('span');
  const cat = catWrap ? catWrap.innerText.trim() : 'Mod';
  const desc_id = document.getElementById('add-desc').value.trim();
  const finalImg = localImageBase64 || document.getElementById('add-img').value.trim();
  const version = document.getElementById('selected-version-text').innerText;
  const countryWrap = document.getElementById('selected-country-text-wrap').querySelector('span');
  const country = countryWrap ? countryWrap.innerText.trim() : 'Indonesia';
  
  let title, finalFile, serverIp, serverPort;
  if (cat === 'Server') {
    title = document.getElementById('add-server-name').value.trim(); serverIp = document.getElementById('add-server-ip').value.trim(); serverPort = document.getElementById('add-server-port').value.trim() || "19132"; finalFile = '#'; 
    if (!title || !serverIp || !desc_id || !finalImg) { window.showModalAlert("Form tidak lengkap!"); return; }
  } else {
    title = document.getElementById('add-title').value.trim(); finalFile = localFileBase64 || document.getElementById('add-file').value.trim();
    if (!title || !desc_id || !finalImg || !finalFile) { window.showModalAlert("Form tidak lengkap!"); return; }
  }
  document.getElementById('btn-submit-item').disabled = true;
  const data = { title, category: cat, version, desc_id, url_img: finalImg, url_file: finalFile, uid: currentUser.uid, username: currentUsername, createdAt: serverTimestamp(), stars: 0 };
  if(cat === 'Server') { data.server_ip = serverIp; data.server_port = serverPort; data.country = country; }

  try {
    if (isAdmin) { await push(ref(db, 'items_public'), data); window.showModalAlert("Dipublikasikan!"); } 
    else { await push(ref(db, 'items_pending'), data); window.showModalAlert("Terkirim ke antrean!"); }
    window.switchScreen('screen-home');
    document.getElementById('add-title').value = ''; document.getElementById('add-server-name').value = ''; document.getElementById('add-server-ip').value = ''; document.getElementById('add-desc').value = ''; document.getElementById('add-img').value = ''; document.getElementById('add-file').value = ''; document.getElementById('img-status').innerText = ''; document.getElementById('file-status').innerText = ''; localImageBase64 = null; localFileBase64 = null;
  } catch (e) { window.showModalAlert("Error."); }
  document.getElementById('btn-submit-item').disabled = false;
};

// ================= ADMIN REVIEW =================
function loadPendingItems() {
  if(!isAdmin) return;
  onValue(ref(db, 'items_pending'), (snapshot) => {
    const container = document.getElementById('pending-items-container'); container.innerHTML = ''; let count = 0;
    if (snapshot.exists()) {
      snapshot.forEach(child => {
        count++; const item = child.val();
        let testBtnHTML = item.category === 'Server' ? `<button class="btn btn-secondary" style="flex:1; padding:8px; font-size:12px;" onclick="window.copyText('${item.server_ip}:${item.server_port}')">Salin IP</button>` : `<button class="btn btn-secondary" style="flex:1; padding:8px; font-size:12px;" onclick="window.handleDownload('${item.url_file}')">Test File</button>`;
        container.innerHTML += `
          <div class="admin-queue-card">
              <div class="admin-queue-header">
                  <div>
                      <h4 class="font-bold text-main" style="margin-bottom:4px;">${item.title}</h4>
                      <span class="badge-role badge-user"><svg viewBox="0 0 24 24" style="width:10px;height:10px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> ${item.username}</span>
                  </div>
                  <span class="card-meta" style="margin:0;">${item.category}</span>
              </div>
              <div class="flex" style="gap:10px;">
                <button class="btn btn-secondary" style="flex:1; padding:8px; font-size:12px;" onclick="window.open('${item.url_img}', '_blank')">Lihat Banner</button>
                ${testBtnHTML}
              </div>
              <div class="admin-queue-actions">
                <button class="btn btn-danger" style="flex:1;" onclick="window.promptReject('${child.key}', '${item.uid}', '${item.title}')">Tolak</button>
                <button class="btn btn-success" style="flex:1;" onclick="window.approveItem('${child.key}', '${item.uid}', '${item.title}')">Terima (+15 Poin)</button>
              </div>
          </div>`;
      });
    } else { container.innerHTML = `<p style="text-align:center; color:var(--text-muted);">Tidak ada antrean.</p>`; }
  });
}
window.approveItem = async (id, uid, title) => { try { const snap = await get(ref(db, `items_pending/${id}`)); if(snap.exists()){ await set(ref(db, `items_public/${id}`), snap.val()); await remove(ref(db, `items_pending/${id}`)); await push(ref(db, `notifications/${uid}`), { type: 'accepted', title: title, time: serverTimestamp(), read: false }); const pSnap = await get(ref(db, `profiles/${uid}`)); if(pSnap.exists()) { await update(ref(db, `profiles/${uid}`), {points: (pSnap.val().points||0) + 15, itemCount: (pSnap.val().itemCount||0) + 1}); } window.showModalAlert("Disetujui!"); } } catch(e) {} };
window.promptReject = (id, uid, title) => { currentRejectItem = { id, uid, title }; document.getElementById('reject-reason').value = ''; window.openDialog('dialog-reject-admin'); };
window.submitReject = async () => { if (!currentRejectItem) return; try { await remove(ref(db, `items_pending/${currentRejectItem.id}`)); await push(ref(db, `notifications/${currentRejectItem.uid}`), { type: 'rejected', title: currentRejectItem.title, reason: document.getElementById('reject-reason').value.trim() || '-', time: serverTimestamp(), read: false }); window.closeDialog('dialog-reject-admin'); window.showModalAlert("Ditolak."); currentRejectItem = null; } catch(e) {} };
window.deletePublicItem = (id, title) => { window.showModalConfirm(`Hapus permanen: "${title}"?`, async () => { try { await remove(ref(db, `items_public/${id}`)); } catch(e){} }); };

window.updateCommentCounter = (inputId, counterId) => { document.getElementById(counterId).innerText = `${document.getElementById(inputId).value.length}/200`; };
const trashIconSVG = `<svg class="icon" style="width:14px; height:14px;" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

function loadComments(itemId) {
    const commentsList = document.getElementById('comments-list'); commentsList.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:13px;">Memuat...</p>`;
    onValue(ref(db, `comments/${itemId}`), async (snapshot) => {
        commentsList.innerHTML = ''; if (!snapshot.exists()) { commentsList.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:13px;">Belum ada komentar.</p>`; return; }
        const allComments = []; snapshot.forEach(child => { allComments.push({ id: child.key, ...child.val() }); });
        const mainComments = allComments.filter(c => !c.parentId).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        const replies = allComments.filter(c => c.parentId);
        if (mainComments.length === 0) return;

        for (const comment of mainComments) {
            let avatarUrl = generateDefaultAvatar(comment.username); let roleBadge = getRoleBadge('member');
            if(globalProfilesCache[comment.uid]) { avatarUrl=globalProfilesCache[comment.uid].avatar || avatarUrl; roleBadge=getRoleBadge(globalProfilesCache[comment.uid].role); }
            else { try { const pSnap = await get(ref(db, `profiles/${comment.uid}`)); if(pSnap.exists()){ globalProfilesCache[comment.uid]=pSnap.val(); avatarUrl=pSnap.val().avatar||avatarUrl; roleBadge=getRoleBadge(pSnap.val().role); } } catch(e){} }
            const isOwner = currentUser && (currentUser.uid === comment.uid || isAdmin);
            commentsList.innerHTML += `
            <div class="comment-item">
                <div class="comment-header">
                    <div class="comment-author-info"><img src="${avatarUrl}" class="comment-avatar"><span class="comment-author">${comment.username}</span> ${roleBadge}</div>
                    <span class="comment-date">${formatDate(comment.createdAt)}</span>
                </div>
                <p class="comment-text">${escapeHtml(comment.text)}</p>
                ${isOwner ? `<button class="comment-action-btn danger" onclick="window.deleteComment('${itemId}', '${comment.id}')">${trashIconSVG} Hapus</button>` : ''}
            </div>`;
        }
    });
}
window.postComment = async () => { if(!currentUser) return; const tEl = document.getElementById('new-comment-text'); const txt = tEl.value.trim(); if(!txt) return; const now = Date.now(); if(now - lastCommentTime < 30000) { window.showModalAlert(`Tunggu sebentar.`); return; } try { const refC = push(ref(db, `comments/${currentDetailItemId}`)); const updates = {}; updates[`comments/${currentDetailItemId}/${refC.key}`] = { uid: currentUser.uid, username: currentUsername, text: txt, createdAt: serverTimestamp(), parentId: null }; updates[`users/${currentUser.uid}/lastCommentAt`] = serverTimestamp(); await update(ref(db), updates); lastCommentTime = now; tEl.value = ''; window.updateCommentCounter('new-comment-text', 'new-comment-counter'); } catch(e) {} }
window.deleteComment = async (itemId, commentId) => { window.showModalConfirm("Yakin menghapus komentar ini?", async () => { try { await update(ref(db), {[`comments/${itemId}/${commentId}`]: null}); } catch(e) {} }); }
function escapeHtml(u) { return (u||"").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
window.translateDesc = async () => { const el = document.getElementById('detail-desc'); const bEl = document.getElementById('text-translate-desc'); const isT = el.dataset.translated === "true"; const orig = el.dataset.originalText; if(isT) { el.innerText = orig; el.dataset.translated = "false"; bEl.innerText = t('translate'); } else { bEl.innerText = "..."; try { const tgt = currentLang === 'id' ? 'id' : 'en'; const res = await translateText(orig, tgt); if(res !== "ALREADY_SAME"){ el.innerText = res; el.dataset.translated = "true"; bEl.innerText = t('show_original'); } else {bEl.innerText = t('translate');} } catch(e) {bEl.innerText = t('translate');} } }
