import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, createUserWithEmailAndPassword, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getDatabase, ref, onValue, off, set, get, update, remove, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
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
let adminModeActive = sessionStorage.getItem('adminMode') !== 'false';
let adminQueueMemory = {}; 
let currentCommentRef = null; // Mencegah listener dobel pada komentar

// ==========================================
// 1. SISTEM TRANSLATE (i18n)
// ==========================================
let currentLang = localStorage.getItem('lang') || 'id';
const uiTranslations = {
    id: {
        "info": "Informasi", "ok": "Oke", "confirm": "Konfirmasi", "cancel": "Batal", "sure": "Yakin",
        "crop_banner": "Crop Banner Server", "crop_desc": "Sesuaikan area terang (Rasio 468x60).", "crop_save": "Crop & Simpan",
        "reject_item": "Tolak Item", "reject_reason": "Alasan penolakan (dikirim ke user).", "reject_placeholder": "Contoh: File rusak...", "reject_submit": "Tolak Item",
        "edit_item": "Edit Item", "edit_img_url": "URL Gambar Preview:", "edit_file_url": "URL File Download:", "save_update": "Simpan Update",
        "loading_sys": "Memuat sistem...", "error_title": "Terjadi Kesalahan", "error_msg": "Gagal memuat akun, coba lagi.", "try_again": "Coba Lagi",
        "select_option": "Pilih Opsi", "by": "Oleh:", "description": "Deskripsi", "comments": "Komentar", "comment_placeholder": "Tulis komentar...", "send_comment": "Kirim Komentar",
        "login_comment_prompt": "Silakan masuk untuk memberikan komentar.", "loading_comments": "Memuat...", "nav_admin": "Admin Panel", "mode_admin": "Mode Admin", 
        "nav_translate": "Translate UI (EN)", "nav_help": "Layanan / Bantuan", "nav_login": "Masuk / Daftar", "login_title": "Masuk ke Akun", "no_account": "Belum punya akun?", 
        "register_here": "Daftar di sini", "email_placeholder": "Alamat Email", "pass_placeholder": "Password (Min 6)", "btn_login": "Masuk", "or_via": "atau via", 
        "login_google": "Masuk dengan Google", "create_user": "Buat Username", "user_rule": "Hanya huruf, angka, dan underscore (3-16 karakter).", "save_user": "Simpan Username",
        "search_placeholder": "Cari item...", "nav_home": "Beranda", "nav_upload": "Upload", "nav_profile": "Profil", "my_profile": "Profil Saya",
        "total_up": "Total Upload", "total_down": "Total Download", "menu_content": "Konten Saya", "menu_notif": "Notifikasi", "menu_settings": "Pengaturan Akun", "menu_logout": "Keluar Akun",
        "list_content": "Daftar Konten Saya", "no_content": "Belum ada konten.", "history_notif": "Riwayat Notifikasi", "edit_profile": "Edit Profil", "edit_bio": "Edit Bio (Maks 80 kar):",
        "save_bio": "Simpan Bio", "change_user": "Ganti Username (Batas 1x / 30 Hari):", "btn_change": "Ubah", "change_pass": "Ganti Password (Hanya via Email):",
        "old_pass": "Password Lama", "new_pass": "Password Baru (Min 6)", "confirm_pass": "Konfirmasi Password Baru", "update_pass": "Update Password",
        "title_upload": "Kirim Baru", "lbl_cat": "Kategori*", "lbl_title": "Judul Item*", "lbl_server_name": "Nama Server*", "lbl_server_loc": "Negara / Lokasi Server*",
        "lbl_version": "Versi MCPE*", "lbl_img": "Gambar Preview*", "url_img": "URL Gambar...", "lbl_file": "File Download / Mod*", "url_file": "URL File Download...", "btn_upload": "Upload Sekarang",
        "review_queue": "Antrean Review", "no_queue": "Tidak ada antrean."
    },
    en: {
        "info": "Information", "ok": "OK", "confirm": "Confirm", "cancel": "Cancel", "sure": "Sure",
        "crop_banner": "Crop Server Banner", "crop_desc": "Adjust bright area (Ratio 468x60).", "crop_save": "Crop & Save",
        "reject_item": "Reject Item", "reject_reason": "Reason for rejection (sent to user).", "reject_placeholder": "Example: Broken file...", "reject_submit": "Reject Item",
        "edit_item": "Edit Item", "edit_img_url": "Preview Image URL:", "edit_file_url": "Download File URL:", "save_update": "Save Update",
        "loading_sys": "Loading system...", "error_title": "An Error Occurred", "error_msg": "Failed to load account, try again.", "try_again": "Try Again",
        "select_option": "Select Option", "by": "By:", "description": "Description", "comments": "Comments", "comment_placeholder": "Write a comment...", "send_comment": "Send Comment",
        "login_comment_prompt": "Please login to comment.", "loading_comments": "Loading...", "nav_admin": "Admin Panel", "mode_admin": "Admin Mode", 
        "nav_translate": "Translate UI (ID)", "nav_help": "Support / Help", "nav_login": "Login / Register", "login_title": "Login to Account", "no_account": "Don't have an account?", 
        "register_here": "Register here", "email_placeholder": "Email Address", "pass_placeholder": "Password (Min 6)", "btn_login": "Login", "or_via": "or via", 
        "login_google": "Login with Google", "create_user": "Create Username", "user_rule": "Letters, numbers, and underscores only (3-16 chars).", "save_user": "Save Username",
        "search_placeholder": "Search items...", "nav_home": "Home", "nav_upload": "Upload", "nav_profile": "Profile", "my_profile": "My Profile",
        "total_up": "Total Uploads", "total_down": "Total Downloads", "menu_content": "My Content", "menu_notif": "Notifications", "menu_settings": "Account Settings", "menu_logout": "Logout",
        "list_content": "My Content List", "no_content": "No content yet.", "history_notif": "Notification History", "edit_profile": "Edit Profile", "edit_bio": "Edit Bio (Max 80 char):",
        "save_bio": "Save Bio", "change_user": "Change Username (Limit 1x / 30 Days):", "btn_change": "Change", "change_pass": "Change Password (Email only):",
        "old_pass": "Old Password", "new_pass": "New Password (Min 6)", "confirm_pass": "Confirm New Password", "update_pass": "Update Password",
        "title_upload": "Submit New", "lbl_cat": "Category*", "lbl_title": "Item Title*", "lbl_server_name": "Server Name*", "lbl_server_loc": "Country / Location*",
        "lbl_version": "MCPE Version*", "lbl_img": "Preview Image*", "url_img": "Image URL...", "lbl_file": "Download File / Mod*", "url_file": "Download File URL...", "btn_upload": "Upload Now",
        "review_queue": "Review Queue", "no_queue": "No queue."
    }
};

window.applyTranslation = () => {
    const dict = uiTranslations[currentLang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = dict[key];
            else el.innerText = dict[key];
        }
    });
};

window.toggleAutoTranslate = (e) => {
    if(e) e.preventDefault();
    currentLang = currentLang === 'id' ? 'en' : 'id';
    localStorage.setItem('lang', currentLang);
    const cb = document.getElementById('auto-translate-checkbox');
    if(cb) cb.checked = (currentLang === 'en');
    window.applyTranslation();
};
document.addEventListener('DOMContentLoaded', () => {
    const cb = document.getElementById('auto-translate-checkbox');
    if(cb) cb.checked = (currentLang === 'en');
    window.applyTranslation();
});


// ==========================================
// 2. RESOURCE DATA (IKON KATEGORI, DLL)
// ==========================================
const catIcons = {
    'Semua': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
    'Mod': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
    'Texture': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    'Map': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
    'Launcher': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>',
    'Plugin Server': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>',
    'MCPE and Craftman': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="17" cy="12" r="2"></circle><path d="M7 12h4m-2-2v4"></path></svg>',
    'Server': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="5" rx="1"></rect><rect x="2" y="15" width="20" height="5" rx="1"></rect><circle cx="6" cy="6.5" r="1"></circle><circle cx="6" cy="17.5" r="1"></circle></svg>'
};
const flagIcons = { 'Indonesia': 'id', 'Amerika Serikat': 'us', 'India': 'in', 'Singapura': 'sg', 'Malaysia': 'my', 'Brasil': 'br', 'Rusia': 'ru', 'Inggris': 'gb' };

function formatDate(timestamp) { if(!timestamp) return ''; return new Intl.DateTimeFormat('id-ID', {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'}).format(new Date(timestamp)); }
function getSafeIcon(cat) { return catIcons[cat] || ''; }

function renderCategoryChips() {
    const cont = document.getElementById('category-filter-container'); if(!cont) return; cont.innerHTML = '';
    Object.keys(catIcons).forEach(cat => {
        const isActive = cat === currentCategoryFilter;
        cont.innerHTML += `<button class="chip ${isActive?'active':''}" onclick="window.setCategoryFilter('${cat}', this)">${catIcons[cat]} <span>${cat}</span></button>`;
    });
}
document.addEventListener('DOMContentLoaded', renderCategoryChips);

// ==========================================
// 3. UI HELPER (MODALS & NAVIGATION)
// ==========================================
let activeDialogs = [];
window.openDialog = (id) => { const el = document.getElementById(id); if(!el) return; document.getElementById('dialogLayer')?.classList.remove('hidden'); document.getElementById('dialogLayer')?.classList.add('active'); el.classList.add('active'); activeDialogs.push(id); document.body.style.overflow = 'hidden'; };
window.closeDialog = (id) => { const el = document.getElementById(id); if(!el) return; el.classList.remove('active'); activeDialogs = activeDialogs.filter(d => d !== id); if(activeDialogs.length === 0) { document.getElementById('dialogLayer')?.classList.remove('active'); setTimeout(() => document.getElementById('dialogLayer')?.classList.add('hidden'), 300); document.body.style.overflow = ''; } };
window.closeTopDialog = () => { if(activeDialogs.length > 0) window.closeDialog(activeDialogs[activeDialogs.length - 1]); };
document.addEventListener('keydown', (e) => { if(e.key === 'Escape') window.closeTopDialog(); });
window.showModalAlert = (msg) => { const el = document.getElementById('dialog-alert-msg'); if(el) { el.innerText = msg; window.openDialog('dialog-alert'); } };
window.showModalConfirm = (msg, onConfirmCallback) => { const el = document.getElementById('dialog-confirm-msg'); if(el) { el.innerText = msg; document.getElementById('btn-dialog-confirm').onclick = () => { window.closeDialog('dialog-confirm'); onConfirmCallback(); }; window.openDialog('dialog-confirm'); } };
window.copyText = (text) => { navigator.clipboard.writeText(text).then(() => { window.showModalAlert(`Berhasil disalin!`); }); };

window.downloadBase64File = (dataUrl, filename) => { const a = document.createElement('a'); a.href = dataUrl; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); };
window.handleDownload = async (url, itemId, event) => {
    if (!url || url === '#') return;
    if(url.startsWith('data:')) { window.downloadBase64File(url, "downloaded_file"); return; }
    let finalUrl = url; let isRedirect = false; let providerName = ''; const lowerUrl = url.toLowerCase();
    
    if (lowerUrl.includes('mediafire.com')) { providerName = 'MediaFire'; isRedirect = true; }
    else if (lowerUrl.includes('drive.google.com')) { providerName = 'Google Drive'; isRedirect = true; }
    else if (lowerUrl.includes('linkvertise.com') || lowerUrl.includes('adf.ly')) { providerName = 'Situs Pihak Ketiga'; isRedirect = true; } 
    else if (lowerUrl.includes('dropbox.com')) { finalUrl = url.replace('?dl=0', '?dl=1'); if (!finalUrl.includes('?dl=1')) finalUrl += (finalUrl.includes('?') ? '&dl=1' : '?dl=1'); }

    if (isRedirect) { 
        window.showModalConfirm(`Tautan diamankan oleh ${providerName}. Lanjutkan ke web penyedia?`, () => window.open(finalUrl, '_blank')); 
    } else {
        const btn = event?.currentTarget;
        const origHTML = btn ? btn.innerHTML : '';
        if(btn) btn.innerHTML = '<div class="loader-inline"></div> Menyumbangkan...';
        
        try {
            const proxyUrl = '/api/download?url=' + encodeURIComponent(finalUrl);
            const response = await fetch(proxyUrl);
            if(!response.ok) throw new Error("Gagal Unduh");
            
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            
            const uniqueId = Math.floor(Math.random() * 100000);
            let filename = url.split('/').pop().split('?')[0] || 'file.zip';
            if (!filename.includes('.')) filename += '.zip';
            a.download = `stecy_${uniqueId}_${filename}`;
            
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => { window.URL.revokeObjectURL(blobUrl); document.body.removeChild(a); if(btn) btn.innerHTML = origHTML; }, 1000);
        } catch(e) {
            let iframe = document.getElementById('download-iframe');
            if (!iframe) { iframe = document.createElement('iframe'); iframe.id = 'download-iframe'; iframe.style.display = 'none'; document.body.appendChild(iframe); }
            iframe.src = '/api/download?url=' + encodeURIComponent(finalUrl) + '&t=' + Date.now();
            if(btn) btn.innerHTML = origHTML;
        }
    }
};

window.closeBottomSheet = () => { document.getElementById('bottom-sheet-overlay')?.classList.remove('active'); };
window.switchScreen = (id) => { 
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); 
    const el = document.getElementById(id); 
    if(el) { el.classList.remove('hidden'); window.scrollTo(0, 0); }
    
    // Inisiasi form otomatis agar Icon Mod muncul saat di tab Upload
    if(id === 'screen-add') {
        const wrap = document.getElementById('selected-category-text-wrap');
        if(wrap && wrap.innerHTML === '') window.selectCategoryForm('Mod');
    }
};
window.requireLoginAndSwitch = (id) => { if(currentUser) window.switchScreen(id); else { window.showModalAlert("Silakan masuk untuk mengakses halaman ini."); window.switchScreen('screen-login'); } };
window.toggleDrawer = (id) => { const el = document.getElementById(id); if(!el) return; const isAct = el.classList.contains('active'); window.closeAllDrawers(); if(!isAct) { el.classList.add('active'); document.getElementById('drawer-overlay')?.classList.add('active'); } };
window.closeAllDrawers = () => { document.querySelectorAll('.side-drawer').forEach(el => el.classList.remove('active')); document.getElementById('drawer-overlay')?.classList.remove('active'); };

// ==========================================
// 4. FORM OPTIONS & CATEGORIES
// ==========================================
const categoryOptions = ['Mod', 'Texture', 'Map', 'Launcher', 'Plugin Server', 'MCPE and Craftman', 'Server'];
const versionOptions = ['0.15.10', '0.14.3', '0.14.3 - 0.15.10'];

window.openCategorySheet = () => {
   const opts = document.getElementById('sheet-options'); if(opts) opts.innerHTML = '';
   const currentWrap = document.getElementById('selected-category-text-wrap')?.querySelector('span');
   const current = currentWrap ? currentWrap.innerText.trim() : 'Mod';
   if(opts){
       categoryOptions.forEach(cat => {
           const isSel = cat === current; const checkSVG = isSel ? `<svg class="sheet-option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>` : '';
           opts.innerHTML += `<div class="sheet-option ${isSel ? 'selected' : ''}" onclick="window.selectCategoryForm('${cat}')"><div class="flex items-center" style="gap:10px;">${catIcons[cat]} <span>${cat}</span></div> ${checkSVG}</div>`;
       });
   }
   document.getElementById('bottom-sheet-overlay')?.classList.add('active');
};

window.selectCategoryForm = (cat) => {
   const wrap = document.getElementById('selected-category-text-wrap');
   if(wrap) wrap.innerHTML = `${getSafeIcon(cat)} <span>${cat}</span>`;
   window.closeBottomSheet();
   
   const ws = document.getElementById('wrapper-title-standard'); 
   const wsrv = document.getElementById('wrapper-title-server'); 
   const wf = document.getElementById('form-file-container');
   const fileImg = document.getElementById('file-img');
   const labelImg = document.getElementById('label-img-preview');
   const inputImg = document.getElementById('add-img');
   
   if(cat === 'Server') { 
       if(ws) ws.classList.add('hidden'); 
       if(wsrv) wsrv.classList.remove('hidden'); 
       if(wf) wf.classList.add('hidden'); 
       if(fileImg) fileImg.accept = "image/*, video/mp4, video/webm";
       if(inputImg) inputImg.placeholder = "URL Gambar / GIF / Video...";
       if(labelImg) labelImg.innerHTML = `<span data-i18n="lbl_img">Gambar / Banner Server*</span> <span style="font-weight:normal; font-size:10px; display:block;">(Max 8MB, GIF/Video support, rasio 468x60)</span>`;
   } else { 
       if(ws) ws.classList.remove('hidden'); 
       if(wsrv) wsrv.classList.add('hidden'); 
       if(wf) wf.classList.remove('hidden'); 
       if(fileImg) fileImg.accept = "image/jpeg, image/png, image/webp";
       if(inputImg) inputImg.placeholder = "URL Gambar...";
       if(labelImg) labelImg.innerHTML = `<span data-i18n="lbl_img">Gambar Preview*</span> <span style="font-weight:normal; font-size:10px; display:block;">(Max 5MB, format JPG/PNG/WEBP)</span>`;
   }
};

window.openVersionSheet = () => {
   const opts = document.getElementById('sheet-options'); if(opts) opts.innerHTML = '';
   const current = document.getElementById('selected-version-text')?.innerText || '0.15.10';
   if(opts){
       versionOptions.forEach(ver => {
           const isSel = ver === current; const checkSVG = isSel ? `<svg class="sheet-option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>` : '';
           opts.innerHTML += `<div class="sheet-option ${isSel ? 'selected' : ''}" onclick="window.selectVersionForm('${ver}')">${ver} ${checkSVG}</div>`;
       });
   }
   document.getElementById('bottom-sheet-overlay')?.classList.add('active');
};
window.selectVersionForm = (ver) => { const el = document.getElementById('selected-version-text'); if(el) el.innerText = ver; window.closeBottomSheet(); };

window.openCountrySheet = () => {
   const opts = document.getElementById('sheet-options'); if(opts) opts.innerHTML = '';
   const currentWrap = document.getElementById('selected-country-text-wrap')?.querySelector('span');
   const current = currentWrap ? currentWrap.innerText.trim() : 'Indonesia';
   if(opts) {
       Object.keys(flagIcons).forEach(country => {
           const isSel = country === current; const checkSVG = isSel ? `<svg class="sheet-option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>` : '';
           opts.innerHTML += `<div class="sheet-option ${isSel ? 'selected' : ''}" onclick="window.selectCountryForm('${country}')"><div class="flex items-center" style="gap:10px;"><img src="https://flagcdn.com/${flagIcons[country]}.svg" style="width:24px; height:18px; object-fit:contain; border-radius:2px;"><span>${country}</span></div> ${checkSVG}</div>`;
       });
   }
   document.getElementById('bottom-sheet-overlay')?.classList.add('active');
};
window.selectCountryForm = (country) => { const el = document.getElementById('selected-country-text-wrap'); if(el) el.innerHTML = `<img src="https://flagcdn.com/${flagIcons[country]}.svg" style="width:20px; height:15px; object-fit:contain; border-radius:2px;"> <span>${country}</span>`; window.closeBottomSheet(); };


// ==========================================
// 5. AUTH & PROFIL LENGKAP
// ==========================================
function getRoleBadge(role) {
    if ((role === 'admin' || role === 'dev') && adminModeActive) return `<span class="badge-role badge-dev"><svg viewBox="0 0 24 24" style="width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2;"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg> Dev</span>`;
    return `<span class="badge-role badge-user"><svg viewBox="0 0 24 24" style="width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> User</span>`;
}
function generateDefaultAvatar(name) {
    const c = document.createElement('canvas'); c.width = 100; c.height = 100; const ctx = c.getContext('2d');
    ctx.fillStyle = '#ff8c00'; ctx.fillRect(0,0,100,100); ctx.fillStyle = '#000000'; ctx.font = 'bold 50px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText((name || '?').charAt(0).toUpperCase(), 50, 50); return c.toDataURL('image/jpeg', 0.8);
}

window.toggleAuthMode = () => { isSignUpMode = !isSignUpMode; const errEl = document.getElementById('login-error'); if(errEl) errEl.innerText = ''; };
window.processEmailAuth = async () => {
  const email = document.getElementById('auth-email')?.value.trim(); const password = document.getElementById('auth-password')?.value;
  if (!email || !password) { window.showModalAlert('Isi form dengan lengkap.'); return; }
  const btn = document.getElementById('auth-submit-btn'); if(btn) btn.disabled = true;
  try { if (isSignUpMode) await createUserWithEmailAndPassword(auth, email, password); else await signInWithEmailAndPassword(auth, email, password);
  } catch (err) { const errEl = document.getElementById('login-error'); if(errEl) errEl.innerText = err.message; if(btn) btn.disabled = false; }
};
window.customLogout = () => { window.closeAllDrawers(); window.showModalConfirm("Keluar dari Akun?", () => { signOut(auth).then(() => { isAdmin = false; currentUser = null; currentUsername = null; window.switchScreen('screen-login'); updateHeaderAuthUI();}); }); };

function updateHeaderAuthUI() {
    const loginBtn = document.getElementById('btn-login-header');
    const adminMenu = document.getElementById('drawer-menu-admin');
    const adminToggle = document.getElementById('drawer-menu-admin-toggle');
    const profImg = document.getElementById('sidebar-profile-img');
    const profName = document.getElementById('sidebar-name');
    const profRole = document.getElementById('sidebar-role');

    if(currentUser) {
        if(loginBtn) loginBtn.classList.add('hidden');
        if(isAdmin) {
             if(adminToggle) adminToggle.classList.remove('hidden');
             const cb = document.getElementById('admin-mode-checkbox');
             if(cb) cb.checked = adminModeActive;
             if(adminMenu) { if(adminModeActive) adminMenu.classList.remove('hidden'); else adminMenu.classList.add('hidden'); }
        } else {
             if(adminMenu) adminMenu.classList.add('hidden');
             if(adminToggle) adminToggle.classList.add('hidden');
        }
    } else {
        if(loginBtn) loginBtn.classList.remove('hidden'); 
        if(adminMenu) adminMenu.classList.add('hidden');
        if(adminToggle) adminToggle.classList.add('hidden');
        if(profImg) profImg.src = "https://via.placeholder.com/60"; 
        if(profName) profName.innerText = "Tamu"; 
        if(profRole) profRole.innerHTML = "";
    }
}

window.toggleAdminMode = () => {
    adminModeActive = !adminModeActive;
    sessionStorage.setItem('adminMode', adminModeActive);
    updateHeaderAuthUI();
    renderItemsToUI();
    if(adminModeActive && isAdmin) loadPendingItems();
};

let splashTimeout = setTimeout(() => {
    try { window.switchScreen('screen-home'); fetchAllItemsAndRender(); } catch(e){}
}, 5000); 

async function proceedToHome(user, pData) {
     try {
         currentUsername = pData.username || 'User'; 
         isAdmin = pData.role === 'admin' || pData.role === 'dev';
         
         const profNameEl = document.getElementById('profile-name');
         const sideNameEl = document.getElementById('sidebar-name');
         const profImgEl = document.getElementById('profile-img');
         const sideImgEl = document.getElementById('sidebar-profile-img');
         const profRoleBadge = document.getElementById('profile-role-badge');
         const sideRoleBadge = document.getElementById('sidebar-role');
         
         if(profNameEl) profNameEl.innerText = currentUsername; 
         if(sideNameEl) sideNameEl.innerText = currentUsername;
         
         const dp = pData.avatar || user.photoURL || generateDefaultAvatar(currentUsername);
         if(profImgEl) profImgEl.src = dp; 
         if(sideImgEl) sideImgEl.src = dp;
         
         const roleB = getRoleBadge(pData.role);
         if(profRoleBadge) profRoleBadge.innerHTML = roleB; 
         if(sideRoleBadge) sideRoleBadge.innerHTML = roleB;
         
         const iUserEl = document.getElementById('input-self-username');
         if(iUserEl) iUserEl.value = currentUsername;
         const iBio = document.getElementById('input-self-bio');
         if(iBio) iBio.value = pData.bio || '';
         
         updateHeaderAuthUI();
         if(isAdmin && adminModeActive) loadPendingItems(); 
         loadNotifications();
         
         window.switchScreen('screen-home'); 
         fetchAllItemsAndRender();
     } catch (e) {
         window.switchScreen('screen-home');
     }
}

setPersistence(auth, browserLocalPersistence).then(() => {
  onAuthStateChanged(auth, async (user) => {
    clearTimeout(splashTimeout); 
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
      } catch (err) { const errEl = document.getElementById('screen-error-msg'); if(errEl) errEl.innerText = "Gagal memuat akun: " + err.message; window.switchScreen('screen-error'); }
    } else {
      currentUser = null; currentUsername = null; isAdmin = false; updateHeaderAuthUI(); window.switchScreen('screen-home'); fetchAllItemsAndRender();
    }
  });
}).catch(() => { clearTimeout(splashTimeout); window.switchScreen('screen-home'); fetchAllItemsAndRender(); });

window.saveUsername = async () => {
  const username = document.getElementById('input-username').value.trim(); const usernameLower = username.toLowerCase();
  const errEl = document.getElementById('username-error'); const btn = document.getElementById('btn-save-username');
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) { if(errEl) errEl.innerText = "Tidak valid."; return; }
  if(btn) { btn.disabled = true; btn.innerText = "Menyimpan..."; } if(errEl) errEl.innerText = "";
  try {
    const unSnap = await get(ref(db, `usernames/${usernameLower}`));
    if (unSnap.exists() && unSnap.val() !== currentUser.uid) { if(errEl) errEl.innerText = "Username terpakai!"; if(btn) { btn.disabled = false; btn.innerText = "Simpan"; } return; }
    const isAdm = (await get(ref(db, `admins/${currentUser.uid}`))).val() === true; const dp = currentUser.photoURL || generateDefaultAvatar(username);
    const updates = {}; updates[`usernames/${usernameLower}`] = currentUser.uid; updates[`profiles/${currentUser.uid}`] = { username: username, avatar: dp, role: isAdm ? 'admin' : 'user', joinedAt: serverTimestamp(), itemCount: 0, points: 0 };
    await update(ref(db), updates); proceedToHome(currentUser, updates[`profiles/${currentUser.uid}`]);
  } catch (e) { if(errEl) errEl.innerText = "Akses ditolak. " + e.message; if(btn) { btn.disabled = false; btn.innerText = "Simpan"; } }
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
              const imgEl1 = document.getElementById('profile-img'); const imgEl2 = document.getElementById('sidebar-profile-img');
              if(imgEl1) imgEl1.src = base64Image; if(imgEl2) imgEl2.src = base64Image;
          } catch(err) { window.showModalAlert("Error upload."); }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
  } catch (error) {}
};


// ==========================================
// 6. PERBAIKAN FUNGSI TAB PROFIL (KONTEN, NOTIF, SETTING)
// ==========================================
window.switchProfileTab = (tab) => {
    document.querySelectorAll('.profile-content-section').forEach(el => {
        el.classList.remove('active');
        el.classList.add('hidden');
    });
    
    const target = document.getElementById(`tab-${tab}`);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }
    
    if (tab === 'content') window.loadMyContent();
    if (tab === 'notif') {
        const badge = document.getElementById('notif-badge-profile');
        if (badge) badge.style.display = 'none';
    }
};

window.loadMyContent = () => {
    const cont = document.getElementById('my-content-list');
    if(!cont || !currentUser) return;
    
    let myItems = globalAllItems.filter(i => i.uid === currentUser.uid).map(i => ({...i, status: 'Approved'}));
    
    get(ref(db, 'items_pending')).then(snap => {
        if(snap.exists()) {
            snap.forEach(child => {
                const val = child.val();
                if(val.uid === currentUser.uid) { myItems.push({id: child.key, status: 'Pending', ...val}); }
            });
        }
        
        if(myItems.length === 0) {
            cont.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size:13px;" data-i18n="no_content">Belum ada konten.</p>';
            return;
        }
        
        myItems.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
        let html = '';
        myItems.forEach(item => {
            const statusBadge = item.status === 'Approved' ? '<span class="item-status-badge status-approved">Approved</span>' : '<span class="item-status-badge status-pending">Pending</span>';
            
            html += `
            <div class="card-horizontal" style="height:auto; min-height:80px; align-items:center; margin-bottom:10px;">
                <div class="card-img-wrapper skeleton" style="width:80px; min-width:80px; height:80px;"><img src="${item.url_img}" class="card-img lazy-img" loading="lazy" onload="this.classList.add('loaded'); this.parentElement.classList.remove('skeleton')"></div>
                <div class="card-body" style="padding:8px;">
                    <h3 style="font-size:13px; margin-bottom:4px;">${item.title}</h3>
                    <div style="font-size:10px; margin-bottom:4px;">${statusBadge}</div>
                    <div style="font-size:10px; color:var(--text-muted);">Kategori: ${item.category}</div>
                </div>
                <button class="icon-btn" style="color:var(--danger); border-color:var(--danger); margin-right:10px; flex-shrink:0;" onclick="window.deletePublicItem('${item.id}', '${item.title}', '${item.status}')"><svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
            </div>`;
        });
        cont.innerHTML = html;
    });
};

function loadNotifications() {
    if(!currentUser) return;
    onValue(ref(db, `notifications/${currentUser.uid}`), (snapshot) => {
        const cont = document.getElementById('notif-list-profile');
        const badge = document.getElementById('notif-badge-profile');
        if(!cont) return;
        if(!snapshot.exists()) {
            cont.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size:13px; margin-top:20px;">Belum ada notifikasi.</p>';
            if(badge) badge.style.display = 'none';
            return;
        }
        let html = ''; let unreadCount = 0;
        const notifs = [];
        snapshot.forEach(c => notifs.push({id: c.key, ...c.val()}));
        notifs.sort((a,b) => (b.time||0) - (a.time||0));
        
        notifs.forEach(n => {
            if(!n.read) unreadCount++;
            const color = n.type === 'accepted' ? 'var(--success)' : 'var(--danger)';
            const icon = n.type === 'accepted' ? '✓' : '✗';
            html += `
            <div class="notif-card" onclick="window.markNotifRead('${n.id}')">
                <div style="font-weight:bold; color:${color}; margin-bottom:4px;">${icon} Item ${n.type === 'accepted' ? 'Disetujui' : 'Ditolak'}</div>
                <div style="font-size:13px; color:var(--text-main); margin-bottom:4px;">${n.title}</div>
                ${n.reason && n.reason !== '-' ? `<div style="font-size:11px; color:var(--text-muted); background:var(--bg-dark); padding:6px; border-radius:4px; margin-top:4px;">Alasan: ${n.reason}</div>` : ''}
            </div>`;
        });
        cont.innerHTML = html;
        if(badge) {
            badge.innerText = unreadCount;
            badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
        }
    });
}
window.markNotifRead = async (id) => {
    try { await update(ref(db, `notifications/${currentUser.uid}/${id}`), {read: true}); } catch(e){}
};

window.saveBioSelf = async () => { const el = document.getElementById('input-self-bio'); if(!el) return; const bio = el.value.trim(); if(bio.length > 80) return; try { await update(ref(db, `profiles/${currentUser.uid}`), {bio: bio}); window.showModalAlert("Bio disimpan."); } catch(e) {} };
window.changeUserPassword = async () => {
    if (!currentUser) return;
    const oldPass = document.getElementById('input-old-password').value;
    const newPass = document.getElementById('input-new-password').value;
    const confPass = document.getElementById('input-confirm-password').value;

    if (!oldPass || !newPass || !confPass) { window.showModalAlert("Harap isi semua kolom password."); return; }
    if (newPass !== confPass) { window.showModalAlert("Password baru dan konfirmasi tidak cocok."); return; }
    if (newPass.length < 6) { window.showModalAlert("Password baru minimal 6 karakter."); return; }

    try {
        const credential = EmailAuthProvider.credential(currentUser.email, oldPass);
        await reauthenticateWithCredential(currentUser, credential);
        await updatePassword(currentUser, newPass);
        
        window.showModalAlert("Password berhasil diubah!");
        document.getElementById('input-old-password').value = '';
        document.getElementById('input-new-password').value = '';
        document.getElementById('input-confirm-password').value = '';
    } catch (error) {
        if (error.code === 'auth/invalid-credential') window.showModalAlert("Password lama salah atau mendaftar menggunakan Google.");
        else window.showModalAlert("Gagal mengubah password: " + error.message);
    }
};
window.changeUsernameSettings = async () => {
    if (!currentUser) return;
    const newName = document.getElementById('input-self-username').value.trim();
    if (!/^[a-zA-Z0-9_]{3,16}$/.test(newName)) { window.showModalAlert("Username hanya boleh berisi huruf, angka, underscore (3-16 karakter)."); return; }
    if (newName === currentUsername) { window.showModalAlert("Username masih sama dengan yang sekarang."); return; }

    try {
        const pSnap = await get(ref(db, `profiles/${currentUser.uid}`));
        const pData = pSnap.val();
        const now = Date.now();
        const lastChange = pData.lastUsernameChange || 0;
        const daysPassed = (now - lastChange) / (1000 * 60 * 60 * 24);
        
        if (daysPassed < 30) {
            const remaining = Math.ceil(30 - daysPassed);
            document.getElementById('username-cooldown-text').innerText = `Anda baru bisa mengganti username dalam ${remaining} hari lagi.`;
            document.getElementById('input-self-username').value = currentUsername; 
            return;
        }

        const usernameLower = newName.toLowerCase();
        const unSnap = await get(ref(db, `usernames/${usernameLower}`));
        if (unSnap.exists()) { window.showModalAlert("Username ini sudah dipakai orang lain."); return; }

        const updates = {};
        if (currentUsername) updates[`usernames/${currentUsername.toLowerCase()}`] = null;
        updates[`usernames/${usernameLower}`] = currentUser.uid;
        updates[`profiles/${currentUser.uid}/username`] = newName;
        updates[`profiles/${currentUser.uid}/lastUsernameChange`] = now; 

        await update(ref(db), updates);
        currentUsername = newName;
        document.getElementById('profile-name').innerText = currentUsername;
        document.getElementById('sidebar-name').innerText = currentUsername;
        document.getElementById('username-cooldown-text').innerText = "Username berhasil diperbarui!";
        document.getElementById('username-cooldown-text').style.color = "var(--success)";
        
    } catch (error) { window.showModalAlert("Gagal mengganti username."); }
};


// ==========================================
// 7. RENDERING ITEM & HAPUS ITEM (ADMIN)
// ==========================================
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
  const homeEl = document.getElementById('screen-home');
  if (homeEl && !homeEl.classList.contains('hidden')) {
      if (currentCategoryFilter === 'Semua' || currentCategoryFilter === 'Server') { document.querySelectorAll('.badge-status').forEach(el => { const t = el.getAttribute('data-target'); const id = el.id.replace('status-', ''); if (t) fetchServerStatus(id, t); }); }
  }
}, 30000);

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
    }
    try { await update(ref(db), updates); } catch(e) { window.showModalAlert("Gagal mengirim vote."); }
}

window.openDetail = async (itemId) => {
    const item = globalAllItems.find(i => i.id === itemId); if(!item) return;
    currentDetailItemId = itemId;
    if (item.category.toLowerCase() === 'server') return;

    const imgEl = document.getElementById('detail-img'); if(imgEl) imgEl.src = item.url_img; 
    const titleEl = document.getElementById('detail-title'); if(titleEl) titleEl.innerText = item.title; 
    const nameEl = document.getElementById('detail-uploader-name'); if(nameEl) nameEl.innerText = item.username || 'System';
    
    let uploaderRole = 'member'; let avatarUrl = generateDefaultAvatar(item.username);
    if(item.uid) {
         try { const pSnap = await get(ref(db, `profiles/${item.uid}`)); if(pSnap.exists()) { const p = pSnap.val(); uploaderRole = p.role; avatarUrl = p.avatar || generateDefaultAvatar(item.username); } } catch(e){}
    } else if (item.source === 'github') uploaderRole = 'dev';
    
    const badgeEl = document.getElementById('detail-uploader-badge'); if(badgeEl) badgeEl.innerHTML = getRoleBadge(uploaderRole); 
    const avatarEl = document.getElementById('detail-uploader-avatar'); if(avatarEl) avatarEl.src = avatarUrl;
    if(nameEl) nameEl.innerHTML = `${item.username || 'System'}`;
    
    const catEl = document.getElementById('detail-category'); if(catEl) catEl.innerText = item.category; 
    const verEl = document.getElementById('detail-version'); if(verEl) verEl.innerText = item.version || 'All Vers.'; 
    const descEl = document.getElementById('detail-desc'); if(descEl) { descEl.innerText = item.desc_id || item.desc || '-'; }

    const actionContainer = document.getElementById('detail-action-container'); 
    const dlIconSVG = `<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;

    // Tambahan tombol Hapus khusus admin di halaman detail
    let adminActionHTML = '';
    if (isAdmin && adminModeActive) {
        adminActionHTML = `<button class="btn btn-danger" onclick="window.deletePublicItem('${item.id}', '${item.title}', 'Approved'); window.document.getElementById('screen-detail-container').classList.remove('active');" style="flex:1; margin-left:10px;">Hapus Item</button>`;
    }

    if(actionContainer) actionContainer.innerHTML = `<div style="display:flex; width:100%;">
         <button class="btn btn-primary" onclick="window.handleDownload('${item.url_file}', '${item.id}', event)" style="flex:2;">${dlIconSVG} Download File</button>
         ${adminActionHTML}
    </div>`;

    loadComments(itemId);
    const cfContainer = document.getElementById('comment-form-container'); const cpPrompt = document.getElementById('comment-login-prompt');
    if(currentUser){ if(cfContainer) cfContainer.classList.remove('hidden'); if(cpPrompt) cpPrompt.classList.add('hidden'); } 
    else { if(cfContainer) cfContainer.classList.add('hidden'); if(cpPrompt) cpPrompt.classList.remove('hidden'); }
    
    const dContainer = document.getElementById('screen-detail-container'); if(dContainer) { dContainer.classList.add('active'); document.body.style.overflow = 'hidden'; }
}
window.closeDetailAndLogin = () => { const dContainer = document.getElementById('screen-detail-container'); if(dContainer) dContainer.classList.remove('active'); document.body.style.overflow=''; window.switchScreen('screen-login'); }

function renderItemsToUI() {
  const container = document.getElementById('public-items-container'); if(!container) return; container.innerHTML = '';

  let displayItems = globalAllItems;
  const isSemua = currentCategoryFilter === 'Semua';
  
  if (isSemua) { displayItems = displayItems.filter(item => item.category.toLowerCase() !== 'server'); } 
  else { displayItems = displayItems.filter(item => item.category.toLowerCase() === currentCategoryFilter.toLowerCase()); }

  if (currentSearchQuery.trim() !== '') displayItems = displayItems.filter(item => item.title.toLowerCase().includes(currentSearchQuery));
  if (currentCategoryFilter === 'Server') displayItems.sort((a,b) => (b.stars || 0) - (a.stars || 0)); else displayItems.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
  
  if (displayItems.length === 0 && container) { container.innerHTML = `<p style="text-align:center; color: var(--text-muted); padding:20px;" data-i18n="no_content">Tidak ditemukan.</p>`; }

  const dlIconSVG = `<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
  let htmlBuf = '';
  
  displayItems.forEach(item => {
      // Tombol Khusus Admin
      let adminEditBtn = ''; let adminDeleteBtn = '';
      if (isAdmin && adminModeActive) {
          adminEditBtn = `<button class="btn btn-secondary" onclick="event.stopPropagation(); window.openAdminEdit('${item.id}', '${item.url_img}', '${item.url_file}')" style="padding:6px 10px; margin-left:auto; font-size:11px;">Edit</button>`;
          adminDeleteBtn = `<button class="btn btn-danger" onclick="event.stopPropagation(); window.deletePublicItem('${item.id}', '${item.title}', 'Approved')" style="padding:6px 10px; font-size:11px; margin-left:6px;">Hapus</button>`;
      }

      if (item.category.toLowerCase() === 'server') {
        const ipTarget = item.server_ip ? `${item.server_ip}:${item.server_port || 19132}` : item.version; 
        const countryFlag = item.country ? `<div class="server-flag-badge"><img src="https://flagcdn.com/${flagIcons[item.country] || 'id'}.svg" style="width:16px; object-fit:contain; border-radius:2px;"></div>` : '';
        const isVoted = currentUser && item.votes && item.votes[currentUser.uid];
        const starClass = isVoted ? 'badge-star voted' : 'badge-star';
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
                    ${adminEditBtn}
                    ${adminDeleteBtn}
                </div>
            </div>
        </div>`;
      } else if (isSemua) {
        htmlBuf += `
        <div class="card-compact-all">
            <div class="card-img-wrapper skeleton"><img src="${item.url_img}" class="card-img lazy-img" loading="lazy" onload="this.classList.add('loaded'); this.parentElement.classList.remove('skeleton')" onerror="this.src='https://via.placeholder.com/150'; this.classList.add('loaded'); this.parentElement.classList.remove('skeleton')"></div>
            <div class="card-body">
                <h3 class="text-main">${item.title}</h3>
                <div style="display:flex; gap:6px; margin-bottom:4px; align-items:center;">
                    <span class="card-meta">${item.category}</span>
                    ${item.version ? `<span class="card-meta" style="background:transparent; border:1px solid var(--border-color); color:var(--text-muted);">${item.version}</span>` : ''}
                </div>
            </div>
            ${adminEditBtn}
            ${adminDeleteBtn}
            <button class="btn-download-compact" onclick="event.stopPropagation(); window.handleDownload('${item.url_file}', '${item.id}', event)">
                <svg class="icon icon-sm" style="width:14px; height:14px;" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </button>
        </div>`;
      } else {
        let actionBtnHTML = `<button class="btn btn-primary" onclick="event.stopPropagation(); window.handleDownload('${item.url_file}', '${item.id}', event)" style="flex:1;">${dlIconSVG} Download</button>`;
        htmlBuf += `
        <div class="card-vertical" onclick="window.openDetail('${item.id}')">
          <div class="card-img-wrapper skeleton"><img src="${item.url_img}" class="card-img lazy-img" loading="lazy" onload="this.classList.add('loaded'); this.parentElement.classList.remove('skeleton')" onerror="this.src='https://via.placeholder.com/300'; this.classList.add('loaded'); this.parentElement.classList.remove('skeleton')"></div>
          <div class="card-body">
            <h3 class="font-bold text-main" style="margin-bottom:4px;">${item.title}</h3>
            <div style="margin-bottom:8px; display:flex; align-items:center;">
               <span class="card-meta">${item.category}</span> ${item.version ? `<span class="card-meta" style="margin-left:6px; background:none; border:1px solid var(--border-color); color:var(--text-muted);">${item.version}</span>` : ''}
               ${adminEditBtn}
               ${adminDeleteBtn}
            </div>
            <p class="card-desc">${item.desc_id || item.desc || ''}</p>
            <div class="flex" style="gap:10px;">${actionBtnHTML}</div>
          </div>
        </div>`;
      }
  });

  if (currentUser) {
      let totalMyUploads = 0; let totalMyDownloads = 0;
      globalAllItems.forEach(it => {
          if (it.uid === currentUser.uid) {
              totalMyUploads++;
              if (it.downloadsData) totalMyDownloads += Object.keys(it.downloadsData).length;
          }
      });
      const statUpEl = document.getElementById('stat-upload'); const statDlEl = document.getElementById('stat-download');
      if (statUpEl) statUpEl.innerText = totalMyUploads;
      if (statDlEl) statDlEl.innerText = totalMyDownloads;
  }
  
  if(container) container.innerHTML = htmlBuf;
  window.applyTranslation(); // Terapkan translate lagi setelah render
}

// ==========================================
// 8. KOMENTAR & UPLOAD
// ==========================================
window.updateCommentCounter = (inputId, counterId) => { const inEl = document.getElementById(inputId); const cEl = document.getElementById(counterId); if(inEl && cEl) cEl.innerText = `${inEl.value.length}/200`; };
const trashIconSVG = `<svg class="icon" style="width:14px; height:14px;" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

let globalProfilesCache = {};
function loadComments(itemId) {
    const commentsList = document.getElementById('comments-list'); if(!commentsList) return; 
    commentsList.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:13px;" data-i18n="loading_comments">Memuat...</p>`;
    
    // PERBAIKAN: Hentikan listener lama agar komentar tidak tampil dobel
    if (currentCommentRef) { off(currentCommentRef); }
    currentCommentRef = ref(db, `comments/${itemId}`);
    
    onValue(currentCommentRef, async (snapshot) => {
        commentsList.innerHTML = ''; 
        if (!snapshot.exists()) { commentsList.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:13px;">Belum ada komentar.</p>`; return; }
        
        const allComments = []; 
        snapshot.forEach(child => { allComments.push({ id: child.key, ...child.val() }); });
        const mainComments = allComments.filter(c => !c.parentId).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        if (mainComments.length === 0) return;

        let htmlBuf = '';
        for (const comment of mainComments) {
            let avatarUrl = generateDefaultAvatar(comment.username); let roleBadge = getRoleBadge('member');
            if(globalProfilesCache[comment.uid]) { avatarUrl=globalProfilesCache[comment.uid].avatar || avatarUrl; roleBadge=getRoleBadge(globalProfilesCache[comment.uid].role); }
            else { try { const pSnap = await get(ref(db, `profiles/${comment.uid}`)); if(pSnap.exists()){ globalProfilesCache[comment.uid]=pSnap.val(); avatarUrl=pSnap.val().avatar||avatarUrl; roleBadge=getRoleBadge(pSnap.val().role); } } catch(e){} }
            const isOwner = currentUser && (currentUser.uid === comment.uid || isAdmin);
            
            htmlBuf += `
            <div class="comment-item">
                <div class="comment-header">
                    <div class="comment-author-info" style="display:flex; align-items:center; gap:8px;"><img src="${avatarUrl}" class="comment-avatar"><span class="comment-author" style="font-weight:bold; font-size:14px; color:var(--text-main);">${comment.username}</span> ${roleBadge}</div>
                    <span class="comment-date" style="font-size:11px; color:var(--text-muted);">${formatDate(comment.createdAt)}</span>
                </div>
                <p class="comment-text">${escapeHtml(comment.text)}</p>
                ${isOwner ? `<button class="comment-action-btn danger" style="color:var(--danger);" onclick="window.deleteComment('${itemId}', '${comment.id}')">${trashIconSVG} Hapus</button>` : ''}
            </div>`;
        }
        commentsList.innerHTML = htmlBuf;
    });
}
window.postComment = async () => { if(!currentUser) return; const tEl = document.getElementById('new-comment-text'); if(!tEl) return; const txt = tEl.value.trim(); if(!txt) return; const now = Date.now(); if(now - lastCommentTime < 30000) { window.showModalAlert(`Tunggu sebentar.`); return; } try { const refC = push(ref(db, `comments/${currentDetailItemId}`)); const updates = {}; updates[`comments/${currentDetailItemId}/${refC.key}`] = { uid: currentUser.uid, username: currentUsername, text: txt, createdAt: serverTimestamp(), parentId: null }; updates[`users/${currentUser.uid}/lastCommentAt`] = serverTimestamp(); await update(ref(db), updates); lastCommentTime = now; tEl.value = ''; window.updateCommentCounter('new-comment-text', 'new-comment-counter'); } catch(e) {} }
window.deleteComment = async (itemId, commentId) => { window.showModalConfirm("Yakin menghapus komentar ini?", async () => { try { await update(ref(db), {[`comments/${itemId}/${commentId}`]: null}); } catch(e) {} }); }
function escapeHtml(u) { return (u||"").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

let cropperInstance = null;
window.handleLocalImage = (e) => {
  const file = e.target.files[0]; if (!file) return;
  const currentCatWrap = document.getElementById('selected-category-text-wrap').querySelector('span');
  const currentCat = currentCatWrap ? currentCatWrap.innerText.trim() : 'Mod';
  const isServer = currentCat === 'Server';
  const maxSizeMB = isServer ? 8 : 5;
  if (file.size > maxSizeMB * 1024 * 1024) { window.showModalAlert(`Ukuran maksimal gambar/video preview adalah ${maxSizeMB}MB!`); e.target.value = ''; return; }

  const reader = new FileReader();
  reader.onload = (ev) => { 
      if (isServer && (file.type === 'image/gif' || file.type.startsWith('video/'))) {
          localImageBase64 = ev.target.result; 
          const statEl = document.getElementById('img-status'); if(statEl) statEl.innerText = file.type.startsWith('video') ? `✓ Video Terpilih` : `✓ GIF dipilih`; 
          const imgEl = document.getElementById('add-img'); if(imgEl) imgEl.value = ""; 
      } 
      else if (isServer) {
          const cImg = document.getElementById('cropper-image'); if(cImg) cImg.src = ev.target.result;
          window.openDialog('dialog-cropper');
          if (cropperInstance) cropperInstance.destroy();
          const cImg2 = document.getElementById('cropper-image');
          if(cImg2) cropperInstance = new Cropper(cImg2, { aspectRatio: 468 / 60, viewMode: 1, background: false, zoomable: true });
      } else {
          localImageBase64 = ev.target.result; 
          const statEl = document.getElementById('img-status'); if(statEl) statEl.innerText = `✓ Gambar dipilih`; 
          const imgEl = document.getElementById('add-img'); if(imgEl) imgEl.value = ""; 
      }
  };
  reader.readAsDataURL(file);
};
window.confirmCrop = () => { if(!cropperInstance) return; const canvas = cropperInstance.getCroppedCanvas({ width: 468, height: 60 }); localImageBase64 = canvas.toDataURL('image/jpeg', 0.9); const statEl = document.getElementById('img-status'); if(statEl) statEl.innerText = '✓ Banner di-crop (468x60)'; window.closeDialog('dialog-cropper'); }
window.cancelCrop = () => { window.closeDialog('dialog-cropper'); const imgEl = document.getElementById('add-img'); if(imgEl) imgEl.value = ''; const fileEl = document.getElementById('file-img'); if(fileEl) fileEl.value = ''; }
window.handleLocalFile = (e) => { const file = e.target.files[0]; if (!file) return; const cw = document.getElementById('selected-category-text-wrap').querySelector('span'); const currentCat = cw ? cw.innerText.trim() : 'Mod'; const maxMB = (currentCat === 'MCPE and Craftman') ? 90 : 5; if (file.size > maxMB * 1024 * 1024) { window.showModalAlert(`Max ${maxMB}MB!`); e.target.value = ''; return; } const reader = new FileReader(); reader.onload = (e) => { localFileBase64 = e.target.result; const statEl = document.getElementById('file-status'); if(statEl) statEl.innerText = `✓ File dipilih`; const addEl = document.getElementById('add-file'); if(addEl) addEl.value = ""; }; reader.readAsDataURL(file); };

window.submitItem = async () => {
  if (!currentUser) return;
  const catWrap = document.getElementById('selected-category-text-wrap').querySelector('span');
  const cat = catWrap ? catWrap.innerText.trim() : 'Mod';
  const desc_id = document.getElementById('add-desc')?.value.trim();
  const finalImg = localImageBase64 || document.getElementById('add-img')?.value.trim();
  const version = document.getElementById('selected-version-text')?.innerText;
  const countryWrap = document.getElementById('selected-country-text-wrap')?.querySelector('span');
  const country = countryWrap ? countryWrap.innerText.trim() : 'Indonesia';
  
  let title, finalFile, serverIp, serverPort;
  if (cat === 'Server') {
    title = document.getElementById('add-server-name')?.value.trim(); serverIp = document.getElementById('add-server-ip')?.value.trim(); serverPort = document.getElementById('add-server-port')?.value.trim() || "19132"; finalFile = '#'; 
    if (!title || !serverIp || !desc_id || !finalImg) { window.showModalAlert("Form tidak lengkap!"); return; }
  } else {
    title = document.getElementById('add-title')?.value.trim(); finalFile = localFileBase64 || document.getElementById('add-file')?.value.trim();
    if (!title || !desc_id || !finalImg || !finalFile) { window.showModalAlert("Form tidak lengkap!"); return; }
  }
  const btnSubmit = document.getElementById('btn-submit-item');
  if(btnSubmit) btnSubmit.disabled = true;
  const data = { title, category: cat, version, desc_id, url_img: finalImg, url_file: finalFile, uid: currentUser.uid, username: currentUsername, createdAt: serverTimestamp(), stars: 0 };
  if(cat === 'Server') { data.server_ip = serverIp; data.server_port = serverPort; data.country = country; }

  try {
    if (isAdmin && adminModeActive) { await push(ref(db, 'items_public'), data); window.showModalAlert("Dipublikasikan!"); } 
    else { await push(ref(db, 'items_pending'), data); window.showModalAlert("Terkirim ke antrean!"); }
    window.switchScreen('screen-home');
    const fTitle = document.getElementById('add-title'); if(fTitle) fTitle.value = ''; 
    const fsrvn = document.getElementById('add-server-name'); if(fsrvn) fsrvn.value = '';
    const fsrvip = document.getElementById('add-server-ip'); if(fsrvip) fsrvip.value = '';
    const fdesc = document.getElementById('add-desc'); if(fdesc) fdesc.value = '';
    const fimg = document.getElementById('add-img'); if(fimg) fimg.value = '';
    const ffile = document.getElementById('add-file'); if(ffile) ffile.value = '';
    const fimgstat = document.getElementById('img-status'); if(fimgstat) fimgstat.innerText = '';
    const ffilestat = document.getElementById('file-status'); if(ffilestat) ffilestat.innerText = '';
    localImageBase64 = null; localFileBase64 = null;
  } catch (e) { window.showModalAlert("Error."); }
  if(btnSubmit) btnSubmit.disabled = false;
};

// ==========================================
// 9. ADMIN PANEL & KELOLA ITEM
// ==========================================
function loadPendingItems() {
  if(!isAdmin || !adminModeActive) return;
  onValue(ref(db, 'items_pending'), (snapshot) => {
    const container = document.getElementById('pending-items-container'); if(!container) return; container.innerHTML = ''; let count = 0;
    adminQueueMemory = {}; 
    
    if (snapshot.exists()) {
      snapshot.forEach(child => {
        count++; const item = child.val();
        adminQueueMemory[child.key] = item; 
        
        let testBtnHTML = item.category === 'Server' 
           ? `<button class="btn btn-secondary" onclick="window.copyText('${item.server_ip}:${item.server_port}')">Salin IP</button>` 
           : `<button class="btn btn-secondary" onclick="window.testAdminFile('${child.key}')">
                 <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Test File
              </button>`;
              
        container.innerHTML += `
          <div class="admin-queue-card">
              <div class="admin-queue-header">
                  <div style="flex:1;">
                      <h4 class="font-bold text-main" style="margin-bottom:4px; font-size:16px;">${item.title}</h4>
                      <span class="card-meta" style="margin:0;">${item.category}</span>
                  </div>
                  <div style="text-align:right; font-size:11px; color:var(--text-muted);">
                      Pengirim:<br><span class="text-main font-bold">${item.username}</span>
                  </div>
              </div>
              <div class="admin-queue-actions">
                <button class="btn btn-secondary" onclick="window.testAdminImage('${child.key}')">
                    <svg class="icon icon-sm" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> Preview
                </button>
                ${testBtnHTML}
              </div>
              <div class="admin-queue-actions" style="margin-top:12px; border-top:1px dashed var(--border-color); padding-top:12px;">
                <button class="btn btn-danger" onclick="window.promptReject('${child.key}', '${item.uid}', '${item.title}')" data-i18n="cancel">Tolak</button>
                <button class="btn btn-success" onclick="window.approveItem('${child.key}', '${item.uid}', '${item.title}')">Terima & Publikasi</button>
              </div>
          </div>`;
      });
    } else { container.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:13px; margin-top:20px;" data-i18n="no_queue">Tidak ada antrean.</p>`; }
    const badgeCount = document.getElementById('pending-count'); if(badgeCount) badgeCount.innerText = count;
  });
}

window.testAdminFile = (key) => { const item = adminQueueMemory[key]; if(item && item.url_file) { window.handleDownload(item.url_file, key); } };
window.testAdminImage = (key) => { const item = adminQueueMemory[key]; if(item && item.url_img) { if (item.url_img.startsWith('data:')) { const newTab = window.open(); newTab.document.body.innerHTML = `<body style="background:#000; margin:0; display:flex; justify-content:center; align-items:center; height:100vh;"><img src="${item.url_img}" style="max-width:100%; max-height:100vh; object-fit:contain;"></body>`; } else { window.open(item.url_img, '_blank'); } } };

window.approveItem = async (id, uid, title) => { try { const snap = await get(ref(db, `items_pending/${id}`)); if(snap.exists()){ await set(ref(db, `items_public/${id}`), snap.val()); await remove(ref(db, `items_pending/${id}`)); await push(ref(db, `notifications/${uid}`), { type: 'accepted', title: title, time: serverTimestamp(), read: false }); const pSnap = await get(ref(db, `profiles/${uid}`)); if(pSnap.exists()) { await update(ref(db, `profiles/${uid}`), {itemCount: (pSnap.val().itemCount||0) + 1}); } window.showModalAlert("Disetujui!"); } } catch(e) {} };
window.promptReject = (id, uid, title) => { currentRejectItem = { id, uid, title }; const rr = document.getElementById('reject-reason'); if(rr) rr.value = ''; window.openDialog('dialog-reject-admin'); };
window.submitReject = async () => { if (!currentRejectItem) return; try { await remove(ref(db, `items_pending/${currentRejectItem.id}`)); const rr = document.getElementById('reject-reason'); await push(ref(db, `notifications/${currentRejectItem.uid}`), { type: 'rejected', title: currentRejectItem.title, reason: rr ? rr.value.trim() : '-', time: serverTimestamp(), read: false }); window.closeDialog('dialog-reject-admin'); window.showModalAlert("Ditolak."); currentRejectItem = null; } catch(e) {} };

window.deletePublicItem = (id, title, status) => { 
    window.showModalConfirm(`Hapus permanen: "${title}"?`, async () => { 
        try { 
            if(status === 'Pending') await remove(ref(db, `items_pending/${id}`));
            else await remove(ref(db, `items_public/${id}`)); 
            window.showModalAlert("Item berhasil dihapus.");
            if(window.loadMyContent) window.loadMyContent(); 
        } catch(e) { window.showModalAlert("Gagal menghapus."); } 
    }); 
};

window.openAdminEdit = (id, imgUrl, fileUrl) => {
    document.getElementById('edit-item-id').value = id;
    document.getElementById('edit-img-url').value = imgUrl;
    document.getElementById('edit-file-url').value = fileUrl;
    window.openDialog('dialog-edit-admin');
};
window.saveAdminEdit = async () => {
    const id = document.getElementById('edit-item-id').value;
    const imgUrl = document.getElementById('edit-img-url').value.trim();
    const fileUrl = document.getElementById('edit-file-url').value.trim();
    if(!imgUrl || !fileUrl) { window.showModalAlert('URL tidak boleh kosong'); return; }
    try {
        await update(ref(db, `items_public/${id}`), { url_img: imgUrl, url_file: fileUrl });
        window.showModalAlert('Berhasil diupdate!');
        window.closeDialog('dialog-edit-admin');
    } catch(e) { window.showModalAlert('Gagal update: ' + e.message); }
};
