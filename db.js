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

// ===== Utilisateurs — table "users" dans Supabase (partagée par tous les appareils) =====
// Ancien stockage local (gardé en secours hors-ligne + pour migrer automatiquement
// les comptes déjà créés sur cet appareil avant la mise à jour).
const USERS_KEY = 'doughlab_users_v2';
let _users = [
  { id: 'severine.rose', nom: 'Mme Rosé', prenom: 'Séverine', initiales: 'SR', role: 'prof', pw: 'Sr31107155!!!', classe: null }
];

// Sauvegarde locale de secours. IMPORTANT : cette fonction ne doit JAMAIS faire
// disparaître un compte déjà présent en local (sinon un compte qui n'a pas pu
// être envoyé vers Supabase serait définitivement perdu). On fusionne donc
// toujours avec ce qui est déjà stocké sur l'appareil.
function saveUsersLocalBackup() {
  try {
    let local = [];
    try { local = JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch(e) { local = []; }
    if (!Array.isArray(local)) local = [];
    const merged = _users.slice();
    local.forEach(u => {
      if (u && u.id && !merged.find(x => x.id === u.id)) merged.push(u);
    });
    localStorage.setItem(USERS_KEY, JSON.stringify(merged));
  } catch(e) {}
}

// Migre vers Supabase les comptes qui n'existent que dans le stockage local de cet
// appareil (créés avant la correction, ou créés hors-ligne).
let _migrationErrors = [];
async function _migrateLocalUsers() {
  _migrationErrors = [];
  let local = [];
  try { local = JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch(e) { return; }
  if (!Array.isArray(local)) return;
  for (const u of local) {
    if (u && u.id && !_users.find(x => x.id === u.id)) {
      try {
        await SB.insert('users', u);
        _users.push(u);
      } catch(e) {
        // Échec d'envoi : on garde quand même le compte utilisable sur cet
        // appareil, et on retentera au prochain chargement.
        _users.push(u);
        _migrationErrors.push(u.id);
        console.error('Migration du compte ' + u.id + ' impossible :', e);
      }
    }
  }
  if (_migrationErrors.length) {
    console.warn('Comptes non synchronisés avec Supabase (conservés en local) : ' + _migrationErrors.join(', '));
  }
}

// Charge les comptes depuis Supabase au démarrage. Tant que cette promesse n'est
// pas résolue, DB.getUser()/DB.getEleves() peuvent encore renvoyer les valeurs par
// défaut ci-dessus (utile hors-ligne) — le login attend explicitement ce chargement.
const _usersReady = (async function loadUsers() {
  try {
    const remote = await SB.get('users');
    if (Array.isArray(remote)) {
      // Fusionne avec les valeurs par défaut au lieu de les remplacer, pour que le
      // compte professeur reste toujours accessible même si sa ligne manque côté Supabase.
      const merged = _users.slice();
      remote.forEach(u => {
        const idx = merged.findIndex(x => x.id === u.id);
        if (idx >= 0) merged[idx] = u; else merged.push(u);
      });
      _users = merged;
    }
  } catch(e) {
    console.error('Chargement des comptes distants impossible (hors-ligne ?), utilisation du secours local.', e);
  }
  await _migrateLocalUsers();
  saveUsersLocalBackup();
})();

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
  ready: () => Promise.all([_usersReady, _dataReady]),
  refresh: () => _loadResultats(),
  migrationErrors: () => _migrationErrors.slice(),
  getUser: id => _users.find(u => u.id === id) || null,
  getEleves: () => _users.filter(u => u.role === 'eleve'),
  async addUser(user) {
    await SB.insert('users', user);
    _users.push(user);
    saveUsersLocalBackup();
  },
  async removeUser(id) {
    await SB.delete('users', id);
    _users = _users.filter(u => u.id !== id);
    saveUsersLocalBackup();
  },
  getResultatsEleve,
  addResultat,
  getProgressionCours,
  setProgressionCours
};

// Alias global pour compatibilité
function getUser(id) { return DB.getUser(id); }
