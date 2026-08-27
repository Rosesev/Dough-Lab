// ===== Dough Lab – Base de données hybride (Supabase + localStorage) =====

const SUPABASE_URL = 'https://bwrcvagarvifdzqtbrla.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3cmN2YWdhcnZpZmR6cXRicmxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExOTExNzAsImV4cCI6MjA5Njc2NzE3MH0.5E75-_rTHBTaOsr90Ksj0Yhm0BFe0J0rZV-SAbRuW_M';

const SB_HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// ===== SUPABASE =====
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
const USERS_KEY = 'doughlab_users';
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

// ===== DB =====
const DB = {
  // Utilisateurs (sync, localStorage)
  getUser(id) { return _users.find(u => u.id === id) || null; },
  getEleves() { return _users.filter(u => u.role === 'eleve'); },

  // Tables Supabase (async)
  async get(table) { return await sbGet(table); },
  async getById(table, id) { const rows = await sbWhere(table, { id }); return rows[0] || null; },
  async where(table, filters) { return await sbWhere(table, filters); },

  async insert(table, item) {
    if (table === 'users') {
      item.id = item.id || ('user_' + Date.now());
      _users.push(item); saveUsers(); return item;
    }
    item.id = item.id || (table + '_' + Date.now());
    return await sbInsert(table, item);
  },

  async update(table, id, updates) {
    if (table === 'users') {
      const i = _users.findIndex(u => u.id === id);
      if (i >= 0) { _users[i] = Object.assign({}, _users[i], updates); saveUsers(); }
      return _users.find(u => u.id === id);
    }
    return await sbUpdate(table, id, updates);
  },

  async delete(table, id) {
    if (table === 'users') {
      _users = _users.filter(u => u.id !== id); saveUsers(); return;
    }
    return await sbDelete(table, id);
  },

  // Résultats (localStorage par élève)
  getResultatsEleve(eleveId) {
    const raw = localStorage.getItem('doughlab_res_' + eleveId);
    return raw ? JSON.parse(raw) : [];
  },
  addResultat(eleveId, exerciceId, score, total, type) {
    const key = 'doughlab_res_' + eleveId;
    let res = JSON.parse(localStorage.getItem(key) || '[]');
    res = res.filter(r => r.exerciceId !== exerciceId);
    res.push({ exerciceId, score, total, type, date: new Date().toISOString().slice(0,10) });
    localStorage.setItem(key, JSON.stringify(res));
  },

  // Progression (localStorage par élève)
  getProgressionCours(eleveId, coursId) {
    const raw = localStorage.getItem('doughlab_prog_' + eleveId);
    const progs = raw ? JSON.parse(raw) : [];
    return progs.find(p => p.coursId === coursId) || null;
  },
  setProgressionCours(eleveId, coursId, pct) {
    const key = 'doughlab_prog_' + eleveId;
    let progs = JSON.parse(localStorage.getItem(key) || '[]');
    const i = progs.findIndex(p => p.coursId === coursId);
    if (i >= 0) progs[i].pct = pct; else progs.push({ coursId, pct });
    localStorage.setItem(key, JSON.stringify(progs));
  }
};
