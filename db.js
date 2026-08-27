// ===== Dough Lab – localStorage =====
const DB_KEY = 'doughlab_db';
const DEFAULT_DB = {
  users: [{ id: 'severine.rose', nom: 'Mme Rosé', prenom: 'Séverine', initiales: 'SR', role: 'prof', pw: 'Sr31107155!!!', classe: null }],
  cours: [], exercices: [], devoirs: [], rendus: [], resultats: [], progression: []
};
const DB = {
  _data: null,
  load() {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) { try { this._data = JSON.parse(raw); } catch(e) { this._data = JSON.parse(JSON.stringify(DEFAULT_DB)); } }
    else { this._data = JSON.parse(JSON.stringify(DEFAULT_DB)); this.save(); }
    if (!this._data.users.find(u => u.id === 'severine.rose')) { this._data.users.push({ id: 'severine.rose', nom: 'Mme Rosé', prenom: 'Séverine', initiales: 'SR', role: 'prof', pw: 'Sr31107155!!!', classe: null }); this.save(); }
    return this._data;
  },
  save() { localStorage.setItem(DB_KEY, JSON.stringify(this._data)); },
  get(table) { return this._data[table] || []; },
  getById(table, id) { return (this._data[table] || []).find(x => x.id === id) || null; },
  insert(table, item) { if (!this._data[table]) this._data[table] = []; item.id = item.id || (table + '_' + Date.now()); this._data[table].push(item); this.save(); return item; },
  update(table, id, updates) { const idx = (this._data[table] || []).findIndex(x => x.id === id); if (idx >= 0) { this._data[table][idx] = Object.assign({}, this._data[table][idx], updates); this.save(); } return this.getById(table, id); },
  delete(table, id) { this._data[table] = (this._data[table] || []).filter(x => x.id !== id); this.save(); },
  where(table, predicate) { return (this._data[table] || []).filter(predicate); },
  getUser(id) { return this.getById('users', id); },
  getEleves() { return this.where('users', u => u.role === 'eleve'); },
  getProgressionCours(eleveId, coursId) { return this.where('progression', p => p.eleveId === eleveId && p.coursId === coursId)[0] || null; },
  setProgressionCours(eleveId, coursId, pct) { const ex = this.where('progression', p => p.eleveId === eleveId && p.coursId === coursId)[0]; if (ex) this.update('progression', ex.id, { pct }); else this.insert('progression', { eleveId, coursId, pct }); },
  getRenduEleve(devoirId, eleveId) { return this.where('rendus', r => r.devoirId === devoirId && r.eleveId === eleveId)[0] || null; },
  getResultatsEleve(eleveId) { return this.where('resultats', r => r.eleveId === eleveId); },
  addResultat(eleveId, exerciceId, score, total, type) { this._data.resultats = this._data.resultats.filter(r => !(r.eleveId === eleveId && r.exerciceId === exerciceId)); return this.insert('resultats', { eleveId, exerciceId, score, total, date: new Date().toISOString().slice(0,10), type }); },
  reset() { this._data = JSON.parse(JSON.stringify(DEFAULT_DB)); this.save(); }
};
DB.load();
