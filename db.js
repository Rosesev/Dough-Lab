// ===== BoulanPâtiss'Learn – Base de données hybride =====
// Utilisateurs : localStorage
// Cours, exercices, devoirs, rendus : Supabase

const SUPABASE_URL = 'https://bwrcvagarvifdzqtbrla.supabase.co';
const SUPABASE_KEY = 'sb_publishable_YOwv2JFD2O8xR5ujSSA2bA_2CLKOmI_';
const SB_HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// ===== SUPABASE ASYNC =====
async function sbGet(table) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?select=*', { headers: SB_HEADERS });
  if (!res.ok) throw new Error('Erreur lecture ' + table);
  return await res.json();
}

async function sbInsert(table, item) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + table, {
    method: 'POST', headers: SB_HEADERS, body: JSON.stringify(item)
  });
  if (!res.ok) throw new Error('Erreur insertion ' + table);
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

async function sbUpdate(table, id, updates) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?id=eq.' + id, {
    method: 'PATCH', headers: SB_HEADERS, body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error('Erreur update ' + table);
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

async function sbDelete(table, id) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?id=eq.' + id, {
    method: 'DELETE', headers: SB_HEADERS
  });
  if (!res.ok) throw new Error('Erreur delete ' + table);
}

async function sbWhere(table, filters) {
  let url = SUPABASE_URL + '/rest/v1/' + table + '?select=*';
  for (const [k, v] of Object.entries(filters)) {
    url += '&' + k + '=eq.' + encodeURIComponent(v);
  }
  const res = await fetch(url, { headers: SB_HEADERS });
  if (!res.ok) throw new Error('Erreur filtre ' + table);
  return await res.json();
}

// ===== UTILISATEURS (localStorage) =====
const USERS_KEY = 'bpl_users';
let _users = [
  { id: 'severine.rose', nom: 'Mme Rosé', prenom: 'Séverine', initiales: 'SR', role: 'prof', pw: 'Sr31107155!!!', classe: null }
];

function loadUsers() {
  const raw = localStorage.getItem(USERS_KEY);
  if (raw) {
    try {
      const saved = JSON.parse(raw);
      saved.forEach(u => { if (!_users.find(x => x.id === u.id)) _users.push(u); });
    } catch(e) {}
  }
}

function saveUsers() {
  localStorage.setItem(USERS_KEY, JSON.stringify(_users));
}

loadUsers();

// ===== DB (interface unifiée) =====
const DB = {
  // Utilisateurs (sync)
  getUser(id) { return _users.find(u => u.id === id) || null; },
  getEleves() { return _users.filter(u => u.role === 'eleve'); },

  insert(table, item) {
    if (table === 'users') {
      item.id = item.id || ('user_' + Date.now());
      _users.push(item);
      saveUsers();
      return item;
    }
    // Supabase tables
    item.id = item.id || (table + '_' + Date.now());
    return sbInsert(table, item);
  },

  delete(table, id) {
    if (table === 'users') {
      _users = _users.filter(u => u.id !== id);
      saveUsers();
      return;
    }
    return sbDelete(table, id);
  },

  update(table, id, updates) {
    if (table === 'users') {
      const i = _users.findIndex(u => u.id === id);
      if (i >= 0) { _users[i] = Object.assign({}, _users[i], updates); saveUsers(); }
      return _users.find(u => u.id === id);
    }
    return sbUpdate(table, id, updates);
  },

  // Async pour Supabase
  async get(table) { return await sbGet(table); },
  async getById(table, id) {
    const rows = await sbWhere(table, { id });
    return rows[0] || null;
  },
  async where(table, filters) { return await sbWhere(table, filters); },

  // Résultats (localStorage)
  getResultatsEleve(eleveId) {
    const raw = localStorage.getItem('bpl_resultats_' + eleveId);
    return raw ? JSON.parse(raw) : [];
  },
  addResultat(eleveId, exerciceId, score, total, type) {
    const key = 'bpl_resultats_' + eleveId;
    const raw = localStorage.getItem(key);
    let resultats = raw ? JSON.parse(raw) : [];
    resultats = resultats.filter(r => !(r.exerciceId === exerciceId));
    resultats.push({ exerciceId, score, total, type, date: new Date().toISOString().slice(0,10) });
    localStorage.setItem(key, JSON.stringify(resultats));
  },

  // Progression (localStorage)
  getProgressionCours(eleveId, coursId) {
    const raw = localStorage.getItem('bpl_prog_' + eleveId);
    const progs = raw ? JSON.parse(raw) : [];
    return progs.find(p => p.coursId === coursId) || null;
  },
  setProgressionCours(eleveId, coursId, pct) {
    const key = 'bpl_prog_' + eleveId;
    const raw = localStorage.getItem(key);
    let progs = raw ? JSON.parse(raw) : [];
    const i = progs.findIndex(p => p.coursId === coursId);
    if (i >= 0) progs[i].pct = pct; else progs.push({ coursId, pct });
    localStorage.setItem(key, JSON.stringify(progs));
  },

  // Rendu élève (via Supabase)
  async getRenduEleve(devoirId, eleveId) {
    const rows = await sbWhere('rendus', { devoirId, eleveId });
    return rows[0] || null;
  },

  reset() {
    localStorage.clear();
    loadUsers();
  }
};
