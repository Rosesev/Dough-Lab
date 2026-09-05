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

  // Appelle une fonction sécurisée de la base (les comptes ne sont accessibles
  // que par ce chemin : la table "users" n'est plus lisible directement).
  async rpc(fn, args) {
    const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + fn, {
      method: 'POST', headers: this.headers, body: JSON.stringify(args || {})
    });
    if (!r.ok) { const e = await r.text(); throw new Error('RPC ' + fn + ': ' + e); }
    return r.json();
  },

  // Insère ou met à jour une ligne selon une contrainte d'unicité
  async upsert(table, item, onConflict) {
    const h = Object.assign({}, this.headers, { 'Prefer': 'return=representation,resolution=merge-duplicates' });
    const r = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?on_conflict=' + onConflict, {
      method: 'POST', headers: h, body: JSON.stringify(item)
    });
    if (!r.ok) { const e = await r.text(); throw new Error('UPSERT ' + table + ': ' + e); }
    const rows = await r.json();
    return Array.isArray(rows) ? rows[0] : rows;
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

// ===== Utilisateurs — table "users" protégée dans Supabase =====
// La table n'est plus lisible ni modifiable directement avec la clé publique.
// Tout passe par des fonctions sécurisées de la base (dl_login, dl_list_eleves,
// dl_add_eleve, dl_remove_eleve), qui vérifient les identifiants avant de
// répondre. Aucun mot de passe n'est donc plus stocké ni exposé côté navigateur.

let _users = [];      // cache en mémoire, rempli après la connexion
let _session = null;  // identifiants du professeur connecté (mémoire vive uniquement)

// Connexion : la base ne renvoie le compte que si identifiant ET mot de passe
// correspondent. Renvoie null si le couple est invalide.
async function loginUser(id, pw) {
  const rows = await SB.rpc('dl_login', { p_id: id, p_pw: pw });
  const u = Array.isArray(rows) ? rows[0] : rows;
  if (!u || !u.id) return null;
  _users = [u].concat(_users.filter(x => x.id !== u.id));
  if (u.role === 'prof') {
    _session = { id: id, pw: pw };
    try { await refreshEleves(); }
    catch(e) { console.error('Chargement de la liste des élèves impossible :', e); }
  }
  return u;
}

// Recharge la liste des élèves (réservée au professeur connecté).
async function refreshEleves() {
  if (!_session) return;
  const rows = await SB.rpc('dl_list_eleves', { p_id: _session.id, p_pw: _session.pw });
  if (Array.isArray(rows)) {
    const profs = _users.filter(u => u.role === 'prof');
    _users = profs.concat(rows);
  }
}

function logoutUser() {
  _session = null;
  _users = [];
}

// ===== Résultats et progression — tables Supabase (partagées par tous les appareils) =====
// Un cache en mémoire permet aux fonctions de lecture de rester synchrones (comme
// avant), pendant que les écritures partent vers Supabase en arrière-plan.
let _resultats = [];   // { eleveId, exerciceId, score, total, type, date }
let _progression = []; // { eleveId, coursId, pct }

function _mapResultat(row) {
  return { eleveId: String(row.eleve_id), exerciceId: String(row.exercice_id),
           score: row.score, total: row.total, type: row.type, date: row.date };
}
function _mapProgression(row) {
  return { eleveId: String(row.eleve_id), coursId: String(row.cours_id), pct: row.pct };
}

// Recharge résultats et progression depuis Supabase.
async function _loadResultats() {
  try {
    const rows = await SB.get('resultats');
    if (Array.isArray(rows)) _resultats = rows.map(_mapResultat);
  } catch(e) { console.error('Chargement des résultats impossible :', e); }
  try {
    const rows = await SB.get('progression');
    if (Array.isArray(rows)) _progression = rows.map(_mapProgression);
  } catch(e) { console.error('Chargement de la progression impossible :', e); }
}
const _dataReady = _loadResultats();

function getResultatsEleve(eleveId) {
  return _resultats.filter(r => r.eleveId === String(eleveId));
}

function addResultat(eleveId, exerciceId, score, total, type) {
  const rec = {
    eleveId: String(eleveId), exerciceId: String(exerciceId),
    score: score, total: total, type: type,
    date: new Date().toISOString().slice(0,10)
  };
  const i = _resultats.findIndex(r => r.eleveId === rec.eleveId && r.exerciceId === rec.exerciceId);
  if (i >= 0) _resultats[i] = rec; else _resultats.push(rec);
  SB.upsert('resultats', {
    eleve_id: rec.eleveId, exercice_id: rec.exerciceId,
    score: rec.score, total: rec.total, type: rec.type, date: rec.date
  }, 'eleve_id,exercice_id').catch(e => {
    console.error('Enregistrement du résultat impossible :', e);
    if (typeof showToast === 'function') showToast('⚠️ Résultat non enregistré (connexion ?)', 'error');
  });
}

function getProgressionCours(eleveId, coursId) {
  return _progression.find(p => p.eleveId === String(eleveId) && p.coursId === String(coursId)) || null;
}

function setProgressionCours(eleveId, coursId, pct) {
  const rec = { eleveId: String(eleveId), coursId: String(coursId), pct: pct };
  const i = _progression.findIndex(p => p.eleveId === rec.eleveId && p.coursId === rec.coursId);
  if (i >= 0) _progression[i] = rec; else _progression.push(rec);
  SB.upsert('progression', {
    eleve_id: rec.eleveId, cours_id: rec.coursId, pct: rec.pct
  }, 'eleve_id,cours_id').catch(e => console.error('Enregistrement de la progression impossible :', e));
}

// Interface DB unifiée
const DB = {
  ready: () => _dataReady,
  refresh: () => _loadResultats(),
  login: loginUser,
  logout: logoutUser,
  refreshEleves: refreshEleves,
  getUser: id => _users.find(u => u.id === id) || null,
  getEleves: () => _users.filter(u => u.role === 'eleve'),
  async addUser(user) {
    if (!_session) throw new Error('Session professeur expirée — reconnectez-vous.');
    await SB.rpc('dl_add_eleve', {
      p_id: _session.id, p_pw: _session.pw,
      e_id: user.id, e_nom: user.nom, e_prenom: user.prenom,
      e_initiales: user.initiales, e_pw: user.pw, e_classe: user.classe
    });
    _users.push(user);
  },
  async updateUser(user) {
    if (!_session) throw new Error('Session professeur expirée — reconnectez-vous.');
    await SB.rpc('dl_update_eleve', {
      p_id: _session.id, p_pw: _session.pw,
      e_id: user.id, e_nom: user.nom, e_prenom: user.prenom,
      e_initiales: user.initiales, e_pw: user.pw, e_classe: user.classe
    });
    const i = _users.findIndex(u => u.id === user.id);
    if (i >= 0) _users[i] = Object.assign({}, _users[i], user);
  },
  async removeUser(id) {
    if (!_session) throw new Error('Session professeur expirée — reconnectez-vous.');
    await SB.rpc('dl_remove_eleve', { p_id: _session.id, p_pw: _session.pw, e_id: id });
    _users = _users.filter(u => u.id !== id);
  },
  getResultatsEleve,
  addResultat,
  getProgressionCours,
  setProgressionCours
};

// Alias global pour compatibilité
function getUser(id) { return DB.getUser(id); }
