// ===== Dough Lab – Supabase =====
const SUPABASE_URL = 'https://bwrcvagarvifdzqtbrla.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3cmN2YWdhcnZpZmR6cXRicmxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExOTExNzAsImV4cCI6MjA5Njc2NzE3MH0.5E75-_rTHBTaOsr90Ksj0Yhm0BFe0J0rZV-SAbRuW_M';
const STORAGE_BUCKET = 'doughlab';

const SB = {
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },

  async get(table) {
    const r = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?select=*&order=created_at.asc', { headers: this.headers });
    if (!r.ok) { const e = await r.text(); throw new Error('GET ' + table + ': ' + e); }
    return r.json();
  },

  async getById(table, id) {
    const r = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?id=eq.' + id, { headers: this.headers });
    if (!r.ok) throw new Error('GETID ' + table);
    const rows = await r.json();
    return rows[0] || null;
  },

  async insert(table, item) {
    const r = await fetch(SUPABASE_URL + '/rest/v1/' + table, {
      method: 'POST', headers: this.headers, body: JSON.stringify(item)
    });
    if (!r.ok) { const e = await r.text(); throw new Error('INSERT ' + table + ': ' + e); }
    const rows = await r.json();
    return Array.isArray(rows) ? rows[0] : rows;
  },

  async update(table, id, updates) {
    const r = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?id=eq.' + id, {
      method: 'PATCH', headers: this.headers, body: JSON.stringify(updates)
    });
    if (!r.ok) throw new Error('UPDATE ' + table);
    const rows = await r.json();
    return Array.isArray(rows) ? rows[0] : rows;
  },

  async delete(table, id) {
    const r = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?id=eq.' + id, {
      method: 'DELETE', headers: this.headers
    });
    if (!r.ok) throw new Error('DELETE ' + table);
  },

  async where(table, col, val) {
    const r = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?' + col + '=eq.' + encodeURIComponent(val), { headers: this.headers });
    if (!r.ok) throw new Error('WHERE ' + table);
    return r.json();
  },

  // ===== STORAGE =====
  // Upload un fichier vers Supabase Storage
  async uploadFile(file, path) {
    const storageHeaders = {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': file.type,
      'Cache-Control': '3600',
      'x-upsert': 'true'
    };
    const r = await fetch(SUPABASE_URL + '/storage/v1/object/' + STORAGE_BUCKET + '/' + path, {
      method: 'POST',
      headers: storageHeaders,
      body: file
    });
    if (!r.ok) { const e = await r.text(); throw new Error('UPLOAD: ' + e); }
    return SUPABASE_URL + '/storage/v1/object/public/' + STORAGE_BUCKET + '/' + path;
  },

  // Supprime un fichier du Storage
  async deleteFile(path) {
    const r = await fetch(SUPABASE_URL + '/storage/v1/object/' + STORAGE_BUCKET + '/' + path, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    });
    if (!r.ok) console.warn('Erreur suppression fichier storage:', path);
  },

  // Génère l'URL publique d'un fichier
  fileUrl(path) {
    return SUPABASE_URL + '/storage/v1/object/public/' + STORAGE_BUCKET + '/' + path;
  }
};

// Utilisateurs en localStorage
const USERS_KEY = 'doughlab_users_v2';
let _users = [
  { id: 'severine.rose', nom: 'Mme Rosé', prenom: 'Séverine', initiales: 'SR', role: 'prof', pw: 'Sr31107155!!!', classe: null }
];

(function loadUsers() {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) return;
  try { JSON.parse(raw).forEach(u => { if (!_users.find(x => x.id === u.id)) _users.push(u); }); } catch(e) {}
})();

function saveUsers() { localStorage.setItem(USERS_KEY, JSON.stringify(_users)); }

// Résultats et progression en localStorage (propres à chaque élève)
function getResultatsEleve(eleveId) {
  try { return JSON.parse(localStorage.getItem('dl_res_' + eleveId) || '[]'); } catch(e) { return []; }
}
function addResultat(eleveId, exerciceId, score, total, type) {
  let res = getResultatsEleve(eleveId).filter(r => r.exerciceId !== exerciceId);
  res.push({ exerciceId, score, total, type, date: new Date().toISOString().slice(0,10) });
  localStorage.setItem('dl_res_' + eleveId, JSON.stringify(res));
}
function getProgressionCours(eleveId, coursId) {
  try { return (JSON.parse(localStorage.getItem('dl_prog_' + eleveId) || '[]')).find(p => p.coursId === coursId) || null; } catch(e) { return null; }
}
function setProgressionCours(eleveId, coursId, pct) {
  let progs = [];
  try { progs = JSON.parse(localStorage.getItem('dl_prog_' + eleveId) || '[]'); } catch(e) {}
  const i = progs.findIndex(p => p.coursId === coursId);
  if (i >= 0) progs[i].pct = pct; else progs.push({ coursId, pct });
  localStorage.setItem('dl_prog_' + eleveId, JSON.stringify(progs));
}

// Interface DB unifiée
const DB = {
  getUser: id => _users.find(u => u.id === id) || null,
  getEleves: () => _users.filter(u => u.role === 'eleve'),
  addUser(user) { _users.push(user); saveUsers(); },
  removeUser(id) { _users = _users.filter(u => u.id !== id); saveUsers(); },
  getResultatsEleve,
  addResultat,
  getProgressionCours,
  setProgressionCours
};

// Alias global pour compatibilité
function getUser(id) { return DB.getUser(id); }
