// ===== Dough Lab =====
let currentUser = null, examState = null, noteTargetId = null;
let quizQuestions = [], quizIndex = 0, quizScore = 0, quizAnswered = false;
let pendingExamId = null, examTimerInterval = null, questionBlocks = [];
let pendingCoursFile = null, pendingExerciceFile = null, pendingRenduProfFile = null;
window.loginRole = 'eleve';

// AUTH
function togglePw(a,b){var i=document.getElementById(a),e=document.getElementById(b);if(!i||!e)return;i.type=i.type==='password'?'text':'password';e.textContent=i.type==='password'?'👁':'🙈';}
function fillDemo(id,pw,role){window.loginRole=role;document.getElementById('tab-eleve').classList.toggle('active',role==='eleve');document.getElementById('tab-prof').classList.toggle('active',role==='prof');document.getElementById('login-id').value=id;document.getElementById('login-pw').value=pw;}

async function doLogin(){
  var id=document.getElementById('login-id').value.trim();
  var pw=document.getElementById('login-pw').value.trim();
  var role=window.loginRole||'eleve';
  var btn=document.querySelector('.btn-login');
  if(btn){btn.disabled=true;btn.textContent='Connexion…';}
  var user=null;
  try{
    user=await DB.login(id,pw);
    await DB.ready();
  }catch(e){
    console.error(e);
    if(btn){btn.disabled=false;btn.textContent='Se connecter →';}
    showLoginError('Connexion impossible. Vérifiez votre connexion internet.');
    return;
  }
  if(btn){btn.disabled=false;btn.textContent='Se connecter →';}
  if(!user){showLoginError('Identifiant ou mot de passe incorrect.');return;}
  if(user.role!==role){showLoginError('Rôle incorrect.');return;}
  currentUser=user;
  document.getElementById('login-error').classList.remove('show');
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  initApp();
}

function showLoginError(msg){var el=document.getElementById('login-error');el.textContent=msg;el.classList.add('show');}
function doLogout(){currentUser=null;try{DB.logout();}catch(e){}stopExamTimer();document.getElementById('app').classList.add('hidden');document.getElementById('login-screen').classList.remove('hidden');document.getElementById('login-id').value='';document.getElementById('login-pw').value='';document.getElementById('login-error').classList.remove('show');}
function hardReset(){if(confirm('Réinitialiser ?')){localStorage.clear();location.reload(true);}}

function initApp(){
  // Enlever hidden de toutes les pages
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('hidden');p.classList.remove('active');});
  var u=currentUser;
  document.getElementById('nav-avatar').textContent=u.initiales;
  document.getElementById('nav-name').textContent=u.nom;
  document.getElementById('nav-role').textContent=u.role==='prof'?'Professeur':'Élève';
  document.getElementById('welcome-h1').textContent='Bonjour '+u.prenom+' 👋';
  document.getElementById('welcome-p').textContent=u.role==='prof'?'Espace enseignant · Bac Pro Boulangerie-Pâtisserie':u.classe+' · Bienvenue sur votre espace';
  document.querySelectorAll('.prof-only').forEach(function(el){el.classList.toggle('hidden',u.role!=='prof');});
  goTo('accueil');
}

function goTo(page){
  if(examState&&page!=='examens'){if(!confirm('Quitter l\'examen ?'))return;stopExam();}
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.nav-link').forEach(function(l){l.classList.remove('active');});
  var el=document.getElementById('page-'+page);
  if(el){el.classList.remove('hidden');el.classList.add('active');}
  document.querySelectorAll('.nav-link[data-page="'+page+'"]').forEach(function(l){l.classList.add('active');});
  var r={accueil:renderAccueil,cours:renderCours,exercices:renderExercices,travaux:renderTravaux,examens:renderExamens,resultats:renderResultats,outils:renderOutils,'gestion-outils':renderGestionOutils,'gestion-cours':renderGestionCours,'gestion-exercices':renderGestionExercices,'gestion-travaux':renderGestionTravaux,'gestion-eleves':renderGestionEleves};
  if(r[page])r[page]();
}

function loading(id,msg){var el=document.getElementById(id);if(el)el.innerHTML='<div class="empty-state"><div class="empty-state-icon">⏳</div><div>'+(msg||'Chargement...')+'</div></div>';}
function emptyState(i,t){return'<div class="empty-state"><div class="empty-state-icon">'+i+'</div><div>'+t+'</div></div>';}
function stat(i,v,l,c){return'<div class="stat-card"><div class="stat-icon">'+i+'</div><div class="stat-val" style="color:var('+c+')">'+v+'</div><div class="stat-lab">'+l+'</div></div>';}
function showErr(id,msg){var el=document.getElementById(id);if(el)el.innerHTML='<div class="empty-state"><div class="empty-state-icon">⚠️</div><div>'+msg+'</div></div>';}

// ACCUEIL
async function renderAccueil(){
  var u=currentUser;
  loading('stats-row','Chargement...');loading('recent-activity','Chargement...');loading('todo-list','');
  try{
    var cours=await SB.get('cours');
    var exercices=await SB.get('exercices');
    var devoirs=await SB.get('devoirs');
    var rendus=await SB.get('rendus');
    if(u.role==='prof'){
      var aCorreger=rendus.filter(function(r){return r.note===null;}).length;
      document.getElementById('stats-row').innerHTML=stat('👥',DB.getEleves().length,'Élèves','--brown')+stat('📚',cours.length,'Cours','--blue')+stat('📋',aCorreger,'À corriger','--orange')+stat('🎯',exercices.length,'Exercices','--green');
      document.getElementById('recent-activity').innerHTML=rendus.slice(-3).reverse().map(function(r){var d=devoirs.find(function(x){return x.id===r.devoirId;});var e=DB.getUser(r.eleveId);return'<div class="list-row"><div class="list-row-icon" style="background:var(--orange-light)">📤</div><div class="list-row-info"><div class="list-row-title">'+(e?e.nom:r.eleveId)+' – '+(d?d.titre:'')+'</div><div class="list-row-sub">'+formatDate(r.date)+'</div></div>'+(r.note!==null?'<span class="note-badge" style="color:var(--green)">'+r.note+'/20</span>':'<span class="tag tag-urgent">À corriger</span>')+'</div>';}).join('')||emptyState('📭','Aucun rendu récent');
      document.getElementById('todo-list').innerHTML='<div class="todo-item"><div class="todo-urgency" style="background:var(--red)"></div><div><div class="todo-title">Travaux à corriger</div><div class="todo-sub">'+aCorreger+' en attente</div></div></div>';
    }else{
      var mesRendus=rendus.filter(function(r){return r.eleveId===u.id;});
      var aRendre=devoirs.filter(function(d){return!mesRendus.find(function(r){return r.devoirId===d.id;})&&new Date(d.deadline)>=new Date();}).length;
      document.getElementById('stats-row').innerHTML=stat('📚',cours.length,'Cours disponibles','--blue')+stat('✏️',exercices.filter(function(e){return e.type==='exercice';}).length,'Exercices','--green')+stat('📤',aRendre,'Devoirs à rendre','--orange')+stat('📋',exercices.filter(function(e){return e.type==='examen';}).length,'Examens','--brown');
      var newCours=cours.filter(function(c){return c.nouveau;}).slice(0,3);
      document.getElementById('recent-activity').innerHTML=newCours.map(function(c){return'<div class="list-row"><div class="list-row-icon" style="background:var(--blue-light)">'+typeEmoji(c.type)+'</div><div class="list-row-info"><div class="list-row-title">'+c.titre+'</div><div class="list-row-sub">Nouveau cours</div></div><span class="tag tag-new">Nouveau</span></div>';}).join('')||emptyState('📭','Aucune activité récente');
      var todos=devoirs.filter(function(d){return!mesRendus.find(function(r){return r.devoirId===d.id;});});
      document.getElementById('todo-list').innerHTML=todos.length?todos.map(function(d){var late=new Date(d.deadline)<new Date();return'<div class="todo-item"><div class="todo-urgency" style="background:'+(late?'var(--red)':'var(--gold)')+'"></div><div><div class="todo-title">'+d.titre+'</div><div class="todo-sub">Avant le '+formatDate(d.deadline)+'</div></div></div>';}).join(''):emptyState('✅','Tous vos devoirs sont rendus !');
    }
  }catch(e){console.error(e);showErr('stats-row','Erreur connexion. Vérifiez votre connexion internet.');}
}

// COURS
var coursFilter='';
function filterCours(v){coursFilter=v.toLowerCase();renderCours();}

async function renderCours(){
  loading('cours-list');
  try{
    await DB.refresh();
    var all=await SB.get('cours');
    var classeColors={'Toutes':'var(--brown)','2nde Bac Pro':'var(--green)','1ère Bac Pro':'var(--blue)','Terminale Bac Pro':'var(--red)'};
    var aujourd_hui=new Date().toISOString().slice(0,10);
    // Filtrer par classe de l'élève (prof voit tout)
    var cours=all.filter(function(c){
      if(currentUser.role==='prof') return true;
      // Vérifier la date de visibilité
      if(c.visible_from&&c.visible_from>aujourd_hui) return false;
      if(!c.classe||c.classe==='Toutes') return true;
      return c.classe===currentUser.classe;
    }).filter(function(c){
      return!coursFilter||c.titre.toLowerCase().includes(coursFilter)||(c.matiere&&c.matiere.toLowerCase().includes(coursFilter));
    });
    // Trier par classe puis alphabétiquement
    var ordreClasse={'Toutes':0,'2nde Bac Pro':1,'1ère Bac Pro':2,'Terminale Bac Pro':3};
    cours.sort(function(a,b){
      var oa=ordreClasse[a.classe]||0,ob=ordreClasse[b.classe]||0;
      if(oa!==ob)return oa-ob;
      return(a.titre||'').localeCompare(b.titre||'','fr');
    });
    var byMatiere={};
    cours.forEach(function(c){if(!byMatiere[c.matiere])byMatiere[c.matiere]=[];byMatiere[c.matiere].push(c);});
    var colors={'Technologie professionnelle':'var(--blue-light)','Sciences appliquées':'var(--green-light)','Gestion & économie':'var(--orange-light)','Arts appliqués':'#FDF0F7','PSE':'#F5F0FD'};
    var html='';
    if(!Object.keys(byMatiere).length)html=emptyState('📚','Aucun cours disponible');
    for(var mat in byMatiere){
      html+='<div class="matiere-group"><div class="matiere-label">'+mat+'</div>';
      byMatiere[mat].forEach(function(c){
        var prog=DB.getProgressionCours(currentUser.id,c.id);
        var pct=prog?prog.pct:0;
        var classeBadge=currentUser.role==='prof'&&c.classe&&c.classe!=='Toutes'?'<span style="font-size:10px;padding:2px 8px;border-radius:20px;background:var(--cream-dark);color:'+(classeColors[c.classe]||'var(--text-light)')+';font-weight:600;margin-left:6px">'+c.classe+'</span>':'';
        var programmeBadge=currentUser.role==='prof'&&c.visible_from&&c.visible_from>aujourd_hui?'<span style="font-size:10px;padding:2px 8px;border-radius:20px;background:var(--orange-light);color:var(--orange);font-weight:600;margin-left:6px">⏳ Visible le '+formatDate(c.visible_from)+'</span>':'';
        html+='<div class="list-row" onclick="openCours(\''+c.id+'\')" style="cursor:pointer">'+
          '<div class="list-row-icon" style="background:'+(colors[c.matiere]||'var(--cream-dark)')+'">'+typeEmoji(c.type)+'</div>'+
          '<div class="list-row-info">'+
          '<div class="list-row-title">'+c.titre+(c.nouveau?' <span class="tag tag-new">Nouveau</span>':'')+classeBadge+programmeBadge+'</div>'+
          '<div class="list-row-sub">'+typeLabel(c.type)+(c.description?' · '+String(c.description).slice(0,60)+'…':'')+'</div>'+
          (currentUser.role==='eleve'?'<div class="progress-bar" style="margin-top:6px"><div class="progress-fill" style="width:'+pct+'%"></div></div>':'')+
          '</div><span style="font-size:11px;color:var(--text-light)">'+formatDate(c.date)+'</span></div>';
      });
      html+='</div>';
    }
    document.getElementById('cours-list').innerHTML=html;
  }catch(e){console.error(e);showErr('cours-list','Erreur chargement cours.');}
}

async function openCours(id){
  try{
    var c=await SB.getById('cours',id);
    if(!c)return;
    if(currentUser.role==='eleve'){var prog=DB.getProgressionCours(currentUser.id,id);DB.setProgressionCours(currentUser.id,id,prog?Math.max(prog.pct,50):50);}
    if(c.fileData)previewFileRaw(c.fileData,c.fileName,c.fileMime);
    else if(c.url&&c.url!=='#')window.open(c.url,'_blank');
    else showToast('Aucun fichier joint');
  }catch(e){showToast('Erreur ouverture cours','error');}
}

// EXERCICES
async function renderExercices(){
  document.getElementById('exercices-home').classList.remove('hidden');
  document.getElementById('exercice-player').classList.add('hidden');
  loading('exercices-grid');
  try{
    await DB.refresh();
    var all=await SB.get('exercices');
    var aujourd_hui=new Date().toISOString().slice(0,10);
    var exercices=all.filter(function(e){
      if(currentUser.role==='prof') return e.type==='exercice';
      if(e.type!=='exercice') return false;
      if(e.visible_from&&e.visible_from>aujourd_hui) return false;
      return true;
    });
    document.getElementById('exercices-grid').innerHTML=exercices.map(function(e){
      var qs=Array.isArray(e.questions)?e.questions:(e.questions?JSON.parse(e.questions):[]);
      var res=DB.getResultatsEleve(currentUser.id).find(function(r){return String(r.exerciceId)===String(e.id);});
      return'<div class="resource-card" onclick="startExercice(\''+e.id+'\')"><div class="card-emoji">✏️</div><span class="card-badge badge-exercice">Exercice</span><div class="card-title">'+e.titre+'</div><div class="card-sub">'+e.matiere+'</div><div class="card-sub">'+qs.length+' questions</div><div class="card-sub" style="color:'+(res?'var(--green)':'var(--text-light)')+'">'+( res?'🏆 '+res.score+'/'+res.total:'Pas encore fait')+'</div></div>';
    }).join('')||emptyState('✏️','Aucun exercice disponible');
  }catch(e){showErr('exercices-grid','Erreur chargement.');}
}

async function startExercice(id){
  try{
    var ex=await SB.getById('exercices',id);if(!ex)return;
    var qs=Array.isArray(ex.questions)?ex.questions:(ex.questions?JSON.parse(ex.questions):[]);
    quizQuestions=qs;quizIndex=0;quizScore=0;quizAnswered=false;
    document.getElementById('exercices-home').classList.remove('active');
    document.getElementById('exercices-home').classList.add('hidden');
    document.getElementById('exercice-player').classList.remove('hidden');

    // Si fichier joint sans questions → afficher directement le fichier
    if(ex.fileData && qs.length===0){
      document.getElementById('exercice-player').innerHTML='<div class="quiz-player"><div style="margin-bottom:16px"><h2 class="section-title">'+ex.titre+'</h2><p style="color:var(--text-mid);font-size:13px">'+ex.matiere+'</p></div>'+(ex.fileMime&&ex.fileMime.startsWith('image/')?'<img src="'+ex.fileData+'" style="max-width:100%;border-radius:var(--radius)">':ex.fileMime==='application/pdf'?'<iframe src="'+ex.fileData+'" style="width:100%;height:500px;border:none;border-radius:var(--radius)"></iframe>':'<div style="text-align:center;padding:32px"><div style="font-size:48px">📄</div><div style="margin:12px 0">'+ex.fileName+'</div><a href="'+ex.fileData+'" download="'+ex.fileName+'" class="btn-primary" style="text-decoration:none">⬇ Télécharger</a></div>')+'<div style="margin-top:16px"><button class="btn-secondary" onclick="renderExercices()">← Retour</button></div></div>';
      return;
    }

    // Si fichier joint ET questions → afficher le fichier puis les questions
    if(ex.fileData && qs.length>0){
      document.getElementById('exercice-player').innerHTML='<div class="quiz-player"><div style="margin-bottom:16px"><h2 class="section-title">'+ex.titre+'</h2><p style="color:var(--text-mid);font-size:13px">'+ex.matiere+' · Document joint</p>'+(ex.fileMime==='application/pdf'?'<iframe src="'+ex.fileData+'" style="width:100%;height:300px;border:none;border-radius:var(--radius);margin-top:10px"></iframe>':ex.fileMime&&ex.fileMime.startsWith('image/')?'<img src="'+ex.fileData+'" style="max-width:100%;border-radius:var(--radius);margin-top:10px">':'<a href="'+ex.fileData+'" download="'+ex.fileName+'" class="btn-gold btn-sm" style="text-decoration:none;display:inline-block;margin-top:10px">📎 Télécharger le document</a>')+'</div><button class="btn-primary" onclick="startQuizPart(\''+id+'\')">Commencer le QCM →</button><button class="btn-secondary" onclick="renderExercices()" style="margin-left:8px">← Retour</button></div>';
      return;
    }

    renderQuizQuestion(ex,id);
  }catch(e){console.error(e);showToast('Erreur','error');}
}

async function startQuizPart(id){
  var ex=await SB.getById('exercices',id);
  var qs=Array.isArray(ex.questions)?ex.questions:JSON.parse(ex.questions);
  quizQuestions=qs;quizIndex=0;quizScore=0;quizAnswered=false;
  renderQuizQuestion(ex,id);
}

function renderQuizQuestion(ex,exId){
  if(quizIndex>=quizQuestions.length){
    var note=((quizScore/quizQuestions.length)*20).toFixed(1);
    var emoji=quizScore===quizQuestions.length?'🏆':quizScore>=quizQuestions.length*0.6?'👍':'💪';
    DB.addResultat(currentUser.id,exId,quizScore,quizQuestions.length,'exercice');
    document.getElementById('exercice-player').innerHTML='<div class="quiz-player"><div class="quiz-results"><div class="result-emoji">'+emoji+'</div><div class="result-score">'+quizScore+'/'+quizQuestions.length+'</div><div class="result-sub">Note : <strong>'+note+'/20</strong></div><div style="margin-top:24px;display:flex;gap:10px;justify-content:center"><button class="btn-primary" onclick="startExercice(\''+exId+'\')">Recommencer</button><button class="btn-secondary" onclick="renderExercices()">Retour</button></div></div></div>';
    return;
  }
  var q=quizQuestions[quizIndex];var letters=['A','B','C','D'];
  document.getElementById('exercice-player').innerHTML='<div class="quiz-player"><div class="quiz-header"><div><div class="quiz-progress-text">Question '+(quizIndex+1)+' sur '+quizQuestions.length+'</div><div class="progress-bar" style="width:240px;margin-top:6px"><div class="progress-fill" style="width:'+((quizIndex/quizQuestions.length)*100)+'%"></div></div></div><div class="quiz-score-live">Score : '+quizScore+'/'+quizIndex+'</div></div><div class="quiz-question-card"><div class="quiz-q-text">'+q.q+'</div><div class="quiz-opts" id="opts-container">'+q.opts.map(function(o,i){return'<div class="quiz-opt" id="opt-'+i+'" onclick="selectOpt('+i+','+q.correct+',\''+exId+'\')"><div class="opt-letter">'+letters[i]+'</div><span>'+o+'</span></div>';}).join('')+'</div><div id="quiz-feedback" style="display:none;margin-top:16px"></div><div class="quiz-actions" style="margin-top:16px"><button class="btn-secondary" onclick="renderExercices()">Quitter</button></div></div></div>';
}

function selectOpt(chosen,correct,exId){
  if(quizAnswered)return;quizAnswered=true;
  var letters=['A','B','C','D'];var isCorrect=chosen===correct;if(isCorrect)quizScore++;
  document.querySelectorAll('.quiz-opt').forEach(function(el,i){el.classList.add('disabled');if(i===correct)el.classList.add('correct');else if(i===chosen&&!isCorrect)el.classList.add('wrong');});
  var fb=document.getElementById('quiz-feedback');var q=quizQuestions[quizIndex];
  fb.style.display='block';fb.className='quiz-feedback '+(isCorrect?'feedback-correct':'feedback-wrong');
  fb.innerHTML=(isCorrect?'✅ Bonne réponse !':'❌ Bonne réponse : <strong>'+letters[correct]+'. '+q.opts[correct]+'</strong>')+(q.explication?'<br><span style="font-size:12px;display:block;margin-top:4px">'+q.explication+'</span>':'');
  document.querySelector('.quiz-actions').innerHTML='<button class="btn-primary" onclick="nextQuestion(\''+exId+'\')">Question suivante →</button><button class="btn-secondary" onclick="renderExercices()">Quitter</button>';
}

async function nextQuestion(exId){quizIndex++;quizAnswered=false;var ex=await SB.getById('exercices',exId);renderQuizQuestion(ex,exId);}

// TRAVAUX
async function renderTravaux(){
  loading('travaux-content');
  try{
    var u=currentUser;
    var devoirs=await SB.get('devoirs');
    var rendus=await SB.get('rendus');
    var html='';
    if(u.role==='eleve'){
      var mesRendus=rendus.filter(function(r){return String(r.eleveId)===String(u.id);});
      var aFaire=devoirs.filter(function(d){return!mesRendus.find(function(r){return String(r.devoirId)===String(d.id);});});
      var faits=devoirs.filter(function(d){return mesRendus.find(function(r){return String(r.devoirId)===String(d.id);});});
      if(aFaire.length){
        html+='<h2 class="section-title" style="margin-bottom:12px">Devoirs à rendre</h2>';
        aFaire.forEach(function(d){
          var late=new Date(d.deadline)<new Date();
          html+='<div class="devoir-card"><div class="devoir-card-header"><div><div class="devoir-card-title">'+d.titre+'</div><div class="devoir-card-meta">Avant le '+formatDate(d.deadline)+'</div></div><span class="tag '+(late?'tag-urgent':'')+'" style="'+(!late?'background:var(--green-light);color:var(--green)':'')+'">'+(late?'En retard':'À rendre')+'</span></div><div class="devoir-card-consignes">'+d.consignes+'</div>'+(d.url?'<div style="margin-bottom:10px"><a href="'+d.url+'" target="_blank" class="btn-gold btn-sm" style="text-decoration:none;display:inline-block">🔗 Ouvrir le lien</a></div>':'')+(d.fileData?'<div style="margin-bottom:10px"><a href="'+d.fileData+'" download="'+d.fileName+'" class="btn-gold btn-sm" style="text-decoration:none;display:inline-block">📎 Télécharger le document</a></div>':'')+'<div class="upload-zone" onclick="ouvrirUploadEleve(\''+d.id+'\')"><div class="upload-zone-icon">📤</div><div style="font-weight:500">Déposer votre travail</div><div style="font-size:12px;margin-top:4px;color:var(--text-light)">PDF, Word, image – max 4 Mo</div></div></div>';
        });
      }
      if(faits.length){
        html+='<h2 class="section-title" style="margin:24px 0 12px">Travaux rendus</h2>';
        faits.forEach(function(d){
          var rendu=mesRendus.find(function(r){return String(r.devoirId)===String(d.id);});
          html+='<div class="devoir-card"><div class="devoir-card-header"><div><div class="devoir-card-title">'+d.titre+'</div><div class="devoir-card-meta">✅ Rendu le '+formatDate(rendu.date)+(rendu.fileName?' · 📎 '+rendu.fileName:'')+'</div></div>'+(rendu.note!==null?'<span class="note-badge" style="color:'+(rendu.note>=10?'var(--green)':'var(--red)')+'">'+rendu.note+'/20</span>':'<span class="tag" style="background:var(--orange-light);color:var(--orange)">En correction</span>')+'</div>'+(rendu.commentaire?'<div class="commentaire-box"><div class="commentaire-label">💬 Commentaire du professeur</div>'+rendu.commentaire+'</div>':'')+'</div>';
        });
      }
      if(!devoirs.length)html=emptyState('📭','Aucun devoir assigné');
      if(devoirs.length&&!aFaire.length&&!faits.length)html=emptyState('✅','Tous vos devoirs sont rendus !');
    }else{
      html+='<div style="display:flex;justify-content:flex-end;margin-bottom:16px"><button class="btn-primary" onclick="showModal(\'modal-add-devoir\')">+ Créer un devoir</button></div>';
      devoirs.forEach(function(d){var nb=rendus.filter(function(r){return r.devoirId===d.id;}).length;html+='<div class="devoir-card"><div class="devoir-card-header"><div><div class="devoir-card-title">'+d.titre+'</div><div class="devoir-card-meta">Avant le '+formatDate(d.deadline)+' · '+nb+' rendu(s)</div></div><button class="btn-danger btn-sm" onclick="deleteDevoir(\''+d.id+'\')">Supprimer</button></div><div class="devoir-card-consignes">'+d.consignes+'</div></div>';});
      if(!devoirs.length)html+=emptyState('📋','Aucun devoir créé');
    }
    document.getElementById('travaux-content').innerHTML=html;
  }catch(e){showErr('travaux-content','Erreur chargement travaux.');}
}

function ouvrirUploadEleve(devoirId) {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.mp4,.mov';
  input.onchange = function() {
    if (!input.files[0]) return;
    var file = input.files[0];
    if (file.size > 20*1024*1024) { showToast('Fichier trop lourd (max 20 Mo)', 'error'); return; }
    showToast('⏳ Envoi en cours…');
    var path = 'rendus/' + devoirId + '_' + currentUser.id + '_' + Date.now() + '_' + file.name.replace(/\s/g,'_');
    SB.uploadFile(file, path).then(function(fileUrl) {
      return SB.insert('rendus', {
        devoirId: devoirId,
        eleveId: currentUser.id,
        date: new Date().toISOString().slice(0,10),
        note: null,
        commentaire: null,
        fileName: file.name,
        fileData: fileUrl,
        fileMime: file.type
      });
    }).then(function() {
      showToast('✅ Travail déposé !', 'success');
      renderTravaux();
    }).catch(function(e) {
      console.error(e);
      showToast('Erreur dépôt : ' + e.message, 'error');
    });
  };
  input.click();
}

async function deleteDevoir(id){if(!confirm('Supprimer ?'))return;try{await SB.delete('devoirs',id);renderTravaux();showToast('Devoir supprimé');}catch(e){showToast('Erreur','error');}}

// EXAMENS
async function renderExamens(){
  document.getElementById('examens-home').classList.remove('hidden');
  document.getElementById('exam-player').classList.add('hidden');
  loading('examens-grid');
  try{
    await DB.refresh();
    var all=await SB.get('exercices');
    var aujourd_hui=new Date().toISOString().slice(0,10);
    var examens=all.filter(function(e){
      if(currentUser.role==='prof') return e.type==='examen';
      if(e.type!=='examen') return false;
      if(e.visible_from&&e.visible_from>aujourd_hui) return false;
      return true;
    });
    document.getElementById('examens-grid').innerHTML=examens.map(function(e){
      var qs=Array.isArray(e.questions)?e.questions:(e.questions?JSON.parse(e.questions):[]);
      var done=DB.getResultatsEleve(currentUser.id).find(function(r){return String(r.exerciceId)===String(e.id);});
      var onclick=currentUser.role==='eleve'?(done?'showToast(\'⛔ Examen déjà passé – résultat enregistré\',\'error\')':'confirmStartExam(\''+e.id+'\')'):'previewExamen(\''+e.id+'\')';
      return'<div class="resource-card" onclick="'+onclick+'" style="'+(done&&currentUser.role==='eleve'?'opacity:0.7;cursor:not-allowed':'')+'">'+
        '<div class="card-emoji">'+(done&&currentUser.role==='eleve'?'🔒':'📋')+'</div>'+
        '<span class="card-badge badge-examen">Examen</span>'+
        '<div class="card-title">'+e.titre+'</div>'+
        '<div class="card-sub">'+e.matiere+'</div>'+
        '<div class="card-sub">⏱ '+e.duree+' min · '+qs.length+' questions</div>'+
        (currentUser.role==='prof'?'<div class="card-sub" style="color:var(--blue)">👁 Cliquer pour prévisualiser</div>':
          done?'<div class="card-sub" style="color:var(--green)">✅ Passé – '+(done.total>1?((done.score/done.total)*20).toFixed(0)+'/20':'Participation enregistrée')+'</div>'+
               '<div class="card-sub" style="color:var(--red);font-size:11px">🔒 Ne peut plus être recommencé</div>':
          '<div class="card-sub" style="color:var(--text-light)">Non encore passé</div>')+
        '</div>';
    }).join('')||emptyState('📋','Aucun examen disponible');
  }catch(e){showErr('examens-grid','Erreur chargement.');}
}

async function confirmStartExam(id){
  try{
    pendingExamId=id;
    var ex=await SB.getById('exercices',id);
    var qs=Array.isArray(ex.questions)?ex.questions:(ex.questions?JSON.parse(ex.questions):[]);
    // Vérifier si l'élève a déjà passé cet examen
    var dejaPasse=DB.getResultatsEleve(currentUser.id).find(function(r){return String(r.exerciceId)===String(id);});
    if(dejaPasse){
      showToast('⛔ Vous avez déjà passé cet examen. Résultat enregistré.','error');
      return;
    }
    document.getElementById('exam-confirm-info').innerHTML='<div style="background:var(--red-light);border-radius:var(--radius);padding:16px;margin-bottom:16px;font-size:13px;color:#8B2020;line-height:1.7"><strong>'+ex.titre+'</strong><br>Durée : '+ex.duree+' min · '+qs.length+' questions<br><br>⚠️ <strong>Règles importantes :</strong><br>• Ne quittez pas cette page pendant l\'examen<br>• Ne changez pas d\'onglet ou de fenêtre<br>• Tout changement de page sera détecté et l\'examen sera soumis automatiquement<br>• <strong>L\'examen ne peut être passé qu\'une seule fois</strong></div>';
    showModal('modal-confirm-exam');
  }catch(e){showToast('Erreur','error');}
}

async function startExamConfirmed(){
  closeAllModals();
  try{
    var ex=await SB.getById('exercices',pendingExamId);if(!ex)return;
    var qs=Array.isArray(ex.questions)?ex.questions:(ex.questions?JSON.parse(ex.questions):[]);
    // Si pas de questions mais document joint → afficher le document directement
    if(qs.length===0&&(ex.fileData||ex.url)){
      examState={id:pendingExamId,questions:[],index:0,answers:[],remaining:ex.duree*60,triche:0,ex:ex};
      document.getElementById('examens-home').classList.add('hidden');
      document.getElementById('exam-player').classList.remove('hidden');
      if(currentUser.role==='eleve'){
        document.addEventListener('visibilitychange',detecterTriche);
        window.addEventListener('blur',detecterTriche);
      }
      startExamTimer();
      // Afficher le document avec chronomètre
      var ressource='';
      if(ex.fileData){
        if(ex.fileMime==='application/pdf') ressource='<iframe src="'+ex.fileData+'" style="width:100%;height:450px;border:none;border-radius:var(--radius)"></iframe>';
        else if(ex.fileMime&&ex.fileMime.startsWith('image/')) ressource='<img src="'+ex.fileData+'" style="max-width:100%;border-radius:var(--radius)">';
        else ressource='<a href="'+ex.fileData+'" download="'+ex.fileName+'" class="btn-primary" style="text-decoration:none;display:inline-block">📎 Télécharger le document</a>';
      }
      if(ex.url) ressource+='<div style="margin-top:12px"><a href="'+ex.url+'" target="_blank" class="btn-gold btn-sm" style="text-decoration:none;display:inline-block">🔗 Ouvrir la ressource</a></div>';
      document.getElementById('exam-player').innerHTML=
        '<div class="exam-topbar"><div><div class="exam-topbar-title">'+ex.titre+'</div><div class="exam-topbar-sub">Document à consulter – rendez votre travail sur papier</div></div><div class="exam-timer" id="exam-timer-display">--:--</div></div>'+
        '<div class="quiz-player">'+
        '<div style="background:var(--orange-light);border-radius:var(--radius);padding:12px 16px;margin-bottom:16px;font-size:13px;color:var(--orange)">⚠️ Consultez le document ci-dessous. Répondez sur papier. Cliquez "Terminer" quand vous avez fini.</div>'+
        ressource+
        '<div style="margin-top:20px;display:flex;gap:10px">'+
        '<button class="btn-primary" onclick="finishExam(false)">✅ Terminer l\'examen</button>'+
        '<button class="btn-danger btn-sm" onclick="if(confirm(\'Abandonner ?\'))stopExam()">Abandonner</button>'+
        '</div></div>';
      updateTimerDisplay();
      return;
    }
    examState={id:pendingExamId,questions:qs,index:0,answers:[],remaining:ex.duree*60,triche:0,ex:ex};
    document.getElementById('examens-home').classList.add('hidden');
    document.getElementById('exam-player').classList.remove('hidden');
    if(currentUser.role==='eleve'){
      document.addEventListener('visibilitychange',detecterTriche);
      window.addEventListener('blur',detecterTriche);
    }
    renderExamQuestion();startExamTimer();
  }catch(e){showToast('Erreur','error');}
}

async function previewExamen(id){
  try{
    var ex=await SB.getById('exercices',id);if(!ex)return;
    var qs=Array.isArray(ex.questions)?ex.questions:(ex.questions?JSON.parse(ex.questions):[]);
    document.getElementById('examens-home').classList.add('hidden');
    document.getElementById('exam-player').classList.remove('hidden');
    var ressource='';
    if(ex.fileData){
      if(ex.fileMime==='application/pdf') ressource='<iframe src="'+ex.fileData+'" style="width:100%;height:250px;border:none;border-radius:var(--radius);margin-bottom:16px"></iframe>';
      else if(ex.fileMime&&ex.fileMime.startsWith('image/')) ressource='<img src="'+ex.fileData+'" style="max-width:100%;border-radius:var(--radius);margin-bottom:16px">';
      else ressource='<a href="'+ex.fileData+'" download="'+ex.fileName+'" class="btn-gold btn-sm" style="text-decoration:none;display:inline-block;margin-bottom:16px">📎 '+ex.fileName+'</a>';
    }
    if(ex.url) ressource+='<div style="margin-bottom:16px"><a href="'+ex.url+'" target="_blank" class="btn-gold btn-sm" style="text-decoration:none;display:inline-block">🔗 Lien ressource</a></div>';
    document.getElementById('exam-player').innerHTML=
      '<div style="background:var(--blue-light);border-radius:var(--radius-lg);padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between">'+
      '<div><div style="font-weight:600;color:var(--blue)">👁 Prévisualisation professeur – '+ex.titre+'</div>'+
      '<div style="font-size:12px;color:var(--blue);margin-top:2px">'+ex.matiere+' · '+ex.duree+' min · '+qs.length+' questions</div></div>'+
      '<button class="btn-secondary btn-sm" onclick="stopExam()">← Retour</button></div>'+
      '<div class="quiz-player">'+ressource+
      (qs.length?qs.map(function(q,i){var letters=['A','B','C','D'];return'<div class="quiz-question-card" style="margin-bottom:12px"><div style="font-size:11px;color:var(--text-light);margin-bottom:8px">Question '+(i+1)+'</div><div class="quiz-q-text" style="font-size:16px">'+q.q+'</div><div class="quiz-opts">'+q.opts.map(function(o,j){return'<div class="quiz-opt '+(j===q.correct?'correct disabled':'disabled')+'"><div class="opt-letter">'+letters[j]+'</div><span>'+o+'</span></div>';}).join('')+'</div>'+(q.explication?'<div style="margin-top:8px;font-size:12px;color:var(--text-mid);background:var(--cream-dark);padding:8px;border-radius:var(--radius)">💡 '+q.explication+'</div>':'')+'</div>';}).join(''):emptyState('📋','Aucune question QCM – document joint uniquement'))+
      '</div>';
  }catch(e){showToast('Erreur','error');}
}

function detecterTriche(){
  if(!examState)return;
  if(document.hidden||document.visibilityState==='hidden'){
    examState.triche++;
    if(examState.triche>=2){
      finishExam(false, true);
    } else {
      showToast('⚠️ Avertissement : ne quittez pas la page ! ('+examState.triche+'/2)', 'error');
    }
  }
}

function renderExamQuestion(){
  if(!examState)return;
  if(examState.index>=examState.questions.length){finishExam();return;}
  var q=examState.questions[examState.index];
  var letters=['A','B','C','D'];
  var ex=examState.ex||{};

  // Afficher document ou lien si présent
  var ressource='';
  if(ex.fileData){
    if(ex.fileMime==='application/pdf'){
      ressource='<div style="margin-bottom:16px"><iframe src="'+ex.fileData+'" style="width:100%;height:250px;border:none;border-radius:var(--radius)"></iframe></div>';
    } else if(ex.fileMime&&ex.fileMime.startsWith('image/')){
      ressource='<div style="margin-bottom:16px"><img src="'+ex.fileData+'" style="max-width:100%;border-radius:var(--radius)"></div>';
    } else {
      ressource='<div style="margin-bottom:16px"><a href="'+ex.fileData+'" download="'+ex.fileName+'" class="btn-gold btn-sm" style="text-decoration:none;display:inline-block">📎 Télécharger le document</a></div>';
    }
  }
  if(ex.url){
    ressource+='<div style="margin-bottom:16px"><a href="'+ex.url+'" target="_blank" class="btn-gold btn-sm" style="text-decoration:none;display:inline-block">🔗 Ouvrir la ressource</a></div>';
  }

  // Avertissement triche
  var trichemsg=examState.triche>0?'<div style="background:var(--red-light);color:var(--red);padding:8px 12px;border-radius:var(--radius);font-size:12px;margin-bottom:12px;font-weight:500">⚠️ Avertissement '+examState.triche+'/2 – Ne quittez pas la page !</div>':'';

  document.getElementById('exam-player').innerHTML=
    '<div class="exam-topbar"><div><div class="exam-topbar-title">'+ex.titre+'</div><div class="exam-topbar-sub">Question '+(examState.index+1)+'/'+examState.questions.length+'</div></div><div class="exam-timer" id="exam-timer-display">--:--</div></div>'+
    '<div class="quiz-player">'+
    trichemsg+
    '<div class="progress-bar" style="margin-bottom:20px"><div class="progress-fill" style="width:'+((examState.index/examState.questions.length)*100)+'%"></div></div>'+
    ressource+
    '<div class="quiz-question-card"><div class="quiz-q-text">'+q.q+'</div><div class="quiz-opts" id="exam-opts">'+
    q.opts.map(function(o,i){return'<div class="quiz-opt" onclick="selectExamOpt('+i+')"><div class="opt-letter">'+letters[i]+'</div><span>'+o+'</span></div>';}).join('')+
    '</div></div>'+
    '<div style="display:flex;gap:10px;margin-top:16px">'+
    '<button class="btn-primary" onclick="nextExamQuestion()">'+(examState.index<examState.questions.length-1?'Question suivante →':'Terminer l\'examen')+'</button>'+
    '<button class="btn-danger btn-sm" onclick="if(confirm(\'Abandonner l\'examen ?\'))stopExam()">Abandonner</button>'+
    '</div></div>';
  updateTimerDisplay();
}

function selectExamOpt(i){document.querySelectorAll('#exam-opts .quiz-opt').forEach(function(el,j){el.classList.toggle('selected',j===i);});examState.answers[examState.index]=i;}
function nextExamQuestion(){examState.index++;renderExamQuestion();}
function startExamTimer(){updateTimerDisplay();examTimerInterval=setInterval(function(){examState.remaining--;updateTimerDisplay();if(examState.remaining<=0){clearInterval(examTimerInterval);finishExam(true);}},1000);}
function updateTimerDisplay(){var el=document.getElementById('exam-timer-display');if(!el||!examState)return;var m=Math.floor(examState.remaining/60),s=examState.remaining%60;el.textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');el.classList.toggle('warning',examState.remaining<120);}
function stopExam(){
  clearInterval(examTimerInterval);examTimerInterval=null;
  document.removeEventListener('visibilitychange',detecterTriche);
  window.removeEventListener('blur',detecterTriche);
  examState=null;
  document.getElementById('examens-home').classList.remove('hidden');
  document.getElementById('exam-player').classList.add('hidden');
  renderExamens();
}
function stopExamTimer(){
  clearInterval(examTimerInterval);examTimerInterval=null;
  document.removeEventListener('visibilitychange',detecterTriche);
  window.removeEventListener('blur',detecterTriche);
  examState=null;
}
function finishExam(timeout,triche){
  clearInterval(examTimerInterval);examTimerInterval=null;
  document.removeEventListener('visibilitychange',detecterTriche);
  window.removeEventListener('blur',detecterTriche);
  var questions=examState.questions||[];
  var score=0;
  questions.forEach(function(q,i){if(examState.answers[i]===q.correct)score++;});
  var total=questions.length;
  // Si pas de questions (document seul) → enregistrer juste la participation
  if(total===0){
    DB.addResultat(currentUser.id,examState.id,0,1,'examen');
    document.getElementById('exam-player').innerHTML=
      '<div style="max-width:500px"><div class="quiz-results">'+
      '<div class="result-emoji">✅</div>'+
      '<div class="result-score" style="font-size:32px">Terminé !</div>'+
      '<div class="result-sub">Votre participation a été enregistrée.</div>'+
      (triche?'<div style="margin-top:8px;font-size:13px;color:var(--red);font-weight:500">🚨 Soumis automatiquement – changement de page détecté</div>':'')+
      '<div style="margin-top:24px"><button class="btn-primary" onclick="stopExam()">Retour</button></div>'+
      '</div></div>';
    examState=null;
    showToast('✅ Examen terminé !','success');
    return;
  }
  DB.addResultat(currentUser.id,examState.id,score,total,'examen');
  var note=((score/total)*20).toFixed(1);
  var raison=triche?'🚨 Soumis automatiquement – changement de page détecté':timeout?'⏰ Temps écoulé':'';
  document.getElementById('exam-player').innerHTML=
    '<div style="max-width:500px"><div class="quiz-results">'+
    '<div class="result-emoji">'+(triche?'🚨':timeout?'⏰':score>=total*0.6?'🎓':'📚')+'</div>'+
    '<div class="result-score">'+score+'/'+total+'</div>'+
    '<div class="result-sub">Note : <strong>'+note+'/20</strong></div>'+
    (raison?'<div style="margin-top:8px;font-size:13px;color:var(--red);font-weight:500">'+raison+'</div>':'')+
    '<div style="margin-top:8px;font-size:13px;color:var(--text-mid)">Résultats transmis à votre professeur.</div>'+
    '<div style="margin-top:24px"><button class="btn-primary" onclick="stopExam()">Retour</button></div>'+
    '</div></div>';
  examState=null;
  showToast('📋 Examen terminé – Note : '+note+'/20','success');
}

// RÉSULTATS
async function renderResultats(){
  loading('resultats-content');
  await DB.refresh();
  var resultats=DB.getResultatsEleve(currentUser.id);
  SB.get('rendus').then(function(tousRendus){
    return SB.get('devoirs').then(function(devoirs){
      var rendusNotes=tousRendus.filter(function(r){return String(r.eleveId)===String(currentUser.id)&&r.note!==null;});
      if(!resultats.length&&!rendusNotes.length){document.getElementById('resultats-content').innerHTML=emptyState('📊','Aucun résultat pour l\'instant. Faites vos premiers exercices !');return;}
      var notesEx=resultats.map(function(r){return(r.score/r.total)*20;});
      var notesTravaux=rendusNotes.map(function(r){return r.note;});
      var toutesNotes=notesEx.concat(notesTravaux);
      var moy=toutesNotes.length?(toutesNotes.reduce(function(a,b){return a+b;},0)/toutesNotes.length).toFixed(1):'–';
      var html='<div class="stats-row" style="margin-bottom:28px">'+stat('📊',moy,'Moyenne générale','--brown')+stat('📝',resultats.length,'Exercices réalisés','--blue')+stat('📤',rendusNotes.length,'Travaux notés','--orange')+'</div>';
      if(resultats.length){
        html+='<h2 class="section-title" style="margin-bottom:12px">Exercices & examens</h2>';
        html+='<table class="result-detail-table" style="margin-bottom:24px"><thead><tr><th>Exercice</th><th>Score</th><th>Note</th><th>Date</th></tr></thead><tbody>'+resultats.slice().reverse().map(function(r){var n=((r.score/r.total)*20).toFixed(1);return'<tr><td>'+r.exerciceId+'</td><td>'+r.score+'/'+r.total+'</td><td style="font-weight:600;color:'+(parseFloat(n)>=10?'var(--green)':'var(--red)')+'">'+n+'/20</td><td style="font-size:12px;color:var(--text-light)">'+formatDate(r.date)+'</td></tr>';}).join('')+'</tbody></table>';
      }
      if(rendusNotes.length){
        html+='<h2 class="section-title" style="margin-bottom:12px">Travaux notés par le professeur</h2>';
        html+='<table class="result-detail-table"><thead><tr><th>Devoir</th><th>Note</th><th>Commentaire</th><th>Date</th></tr></thead><tbody>'+rendusNotes.map(function(r){var d=devoirs.find(function(x){return String(x.id)===String(r.devoirId);});return'<tr><td style="font-weight:500">'+(d?d.titre:'Devoir')+'</td><td style="font-weight:600;color:'+(r.note>=10?'var(--green)':'var(--red)')+'">'+r.note+'/20</td><td style="font-size:12px;color:var(--text-mid)">'+(r.commentaire||'–')+'</td><td style="font-size:12px;color:var(--text-light)">'+formatDate(r.date)+'</td></tr>';}).join('')+'</tbody></table>';
      }
      document.getElementById('resultats-content').innerHTML=html;
    });
  }).catch(function(e){
    console.error(e);
    document.getElementById('resultats-content').innerHTML=emptyState('⚠️','Erreur chargement résultats');
  });
}

// ===== BOÎTE À OUTILS =====
var categorieColors={'Vie scolaire':'var(--blue-light)','Hygiène & Sécurité':'var(--green-light)','Fiches techniques':'var(--orange-light)','Réglementation':'#F5F0FD','Examens & diplômes':'var(--red-light)','Autre':'var(--cream-dark)'};
var categorieEmojis={'Vie scolaire':'🏫','Hygiène & Sécurité':'🧼','Fiches techniques':'📋','Réglementation':'⚖️','Examens & diplômes':'🎓','Autre':'📄'};

async function renderOutils(){
  loading('outils-content');
  try{
    var outils=await SB.get('outils');
    if(!outils.length){document.getElementById('outils-content').innerHTML=emptyState('🧰','Aucun document disponible pour l\'instant');return;}
    var byCategorie={};
    outils.forEach(function(o){if(!byCategorie[o.categorie])byCategorie[o.categorie]=[];byCategorie[o.categorie].push(o);});
    for(var cat in byCategorie){byCategorie[cat].sort(function(a,b){return(a.titre||'').localeCompare(b.titre||'','fr');});}
    var html='';
    for(var cat in byCategorie){
      html+='<div class="matiere-group"><div class="matiere-label">'+(categorieEmojis[cat]||'📄')+' '+cat+'</div>';
      byCategorie[cat].forEach(function(o){
        html+='<div class="list-row"><div class="list-row-icon" style="background:'+(categorieColors[o.categorie]||'var(--cream-dark)')+'">'+( categorieEmojis[o.categorie]||'📄')+'</div><div class="list-row-info"><div class="list-row-title">'+o.titre+'</div>'+(o.description?'<div class="list-row-sub">'+o.description+'</div>':'')+' </div><div class="list-row-actions">'+(o.fileData?'<button class="btn-primary btn-sm" onclick="previewFileRaw(\''+o.fileData+'\',\''+o.fileName+'\',\''+o.fileMime+'\')">👁 Consulter</button>':'')+(o.url?'<a href="'+o.url+'" target="_blank" class="btn-gold btn-sm" style="text-decoration:none">🔗 Ouvrir</a>':'')+'</div></div>';
      });
      html+='</div>';
    }
    document.getElementById('outils-content').innerHTML=html;
  }catch(e){showErr('outils-content','Erreur chargement.');}
}

async function renderGestionOutils(){
  loading('gestion-outils-content');
  try{
    var outils=await SB.get('outils');
    document.getElementById('gestion-outils-content').innerHTML=outils.length?outils.map(function(o){
      return'<div class="list-row"><div class="list-row-icon" style="background:'+(categorieColors[o.categorie]||'var(--cream-dark)')+'">'+( categorieEmojis[o.categorie]||'📄')+'</div><div class="list-row-info"><div class="list-row-title">'+o.titre+'</div><div class="list-row-sub">'+o.categorie+(o.description?' · '+o.description:'')+(o.fileName?' · <span style="color:var(--green)">📎 '+o.fileName+'</span>':'')+'</div></div><div class="list-row-actions">'+(o.fileData?'<button class="btn-gold btn-sm" onclick="previewFileRaw(\''+o.fileData+'\',\''+o.fileName+'\',\''+o.fileMime+'\')">👁 Voir</button>':'')+(o.url?'<a href="'+o.url+'" target="_blank" class="btn-secondary btn-sm" style="text-decoration:none">🔗</a>':'')+'<button class="btn-danger btn-sm" onclick="deleteOutil('+o.id+')">Supprimer</button></div></div>';
    }).join(''):emptyState('🧰','Aucun document. Ajoutez-en un !');
  }catch(e){showErr('gestion-outils-content','Erreur chargement.');}
}

var pendingOutilFile=null;

async function addOutil(){
  var titre=document.getElementById('no-titre').value.trim();
  if(!titre){showToast('Veuillez saisir un titre','error');return;}
  try{
    var item={titre:titre,categorie:document.getElementById('no-categorie').value,description:document.getElementById('no-description').value||null,url:document.getElementById('no-url').value||null};
    if(pendingOutilFile&&pendingOutilFile.file){
      showToast('⏳ Upload en cours…');
      var path='outils/'+Date.now()+'_'+pendingOutilFile.fileName.replace(/\s/g,'_');
      var fileUrl=await SB.uploadFile(pendingOutilFile.file,path);
      item.fileData=fileUrl;item.fileName=pendingOutilFile.fileName;item.fileMime=pendingOutilFile.fileMime;
    }
    await SB.insert('outils',item);
    pendingOutilFile=null;closeAllModals();renderGestionOutils();showToast('✅ Document ajouté !','success');
  }catch(e){console.error(e);showToast('Erreur ajout','error');}
}

async function deleteOutil(id){
  if(!confirm('Supprimer ce document ?'))return;
  try{await SB.delete('outils',id);renderGestionOutils();showToast('Document supprimé');}catch(e){showToast('Erreur','error');}
}

// PROF : GESTION COURS
async function renderGestionCours(){
  loading('prof-cours-list');
  try{
    var cours=await SB.get('cours');
    document.getElementById('prof-cours-list').innerHTML=cours.length?cours.map(function(c){return'<div class="list-row"><div class="list-row-icon" style="background:var(--blue-light)">'+typeEmoji(c.type)+'</div><div class="list-row-info"><div class="list-row-title">'+c.titre+(c.nouveau?' <span class="tag tag-new">Nouveau</span>':'')+'</div><div class="list-row-sub">'+c.matiere+' · '+typeLabel(c.type)+(c.fileName?' · <span style="color:var(--green)">📎 Fichier joint</span>':'')+'</div></div><div class="list-row-actions">'+(c.fileData?'<button class="btn-gold btn-sm" onclick="previewFileSB(\''+c.id+'\',\'cours\')">👁 Voir</button>':'')+'<button class="btn-secondary btn-sm" onclick="toggleNouveauCours(\''+c.id+'\')">'+(c.nouveau?'Retirer':'Nouveau')+'</button><button class="btn-danger btn-sm" onclick="deleteCours(\''+c.id+'\')">Supprimer</button></div></div>';}).join(''):emptyState('📚','Aucun cours. Ajoutez-en un !');
  }catch(e){showErr('prof-cours-list','Erreur chargement.');}
}

async function toggleNouveauCours(id){try{var c=await SB.getById('cours',id);await SB.update('cours',id,{nouveau:!c.nouveau});renderGestionCours();}catch(e){showToast('Erreur','error');}}
async function deleteCours(id){if(!confirm('Supprimer ?'))return;try{await SB.delete('cours',id);renderGestionCours();showToast('Cours supprimé');}catch(e){showToast('Erreur','error');}}

async function addCours(){
  var titre=document.getElementById('nc-titre').value.trim();
  if(!titre){showToast('Veuillez saisir un titre','error');return;}
  try{
    var item={titre:titre,matiere:document.getElementById('nc-matiere').value,type:document.getElementById('nc-type').value,url:document.getElementById('nc-url').value||'#',description:document.getElementById('nc-desc').value,date:new Date().toISOString().slice(0,10),nouveau:true,classe:document.getElementById('nc-classe').value||'Toutes',visible_from:document.getElementById('nc-visible-from').value||null};
    if(pendingCoursFile&&pendingCoursFile.file){
      showToast('⏳ Upload en cours…');
      var path='cours/'+Date.now()+'_'+pendingCoursFile.fileName.replace(/\s/g,'_');
      var fileUrl=await SB.uploadFile(pendingCoursFile.file,path);
      item.fileData=fileUrl;item.fileName=pendingCoursFile.fileName;item.fileMime=pendingCoursFile.fileMime;
    }
    await SB.insert('cours',item);
    pendingCoursFile=null;closeAllModals();renderGestionCours();showToast('✅ Cours ajouté !','success');
  }catch(e){console.error(e);showToast('Erreur ajout cours : '+e.message,'error');}
}

// FICHIERS
function readFileAsBase64(file){return new Promise(function(resolve,reject){var r=new FileReader();r.onload=function(e){resolve(e.target.result);};r.onerror=reject;r.readAsDataURL(file);});}
function formatSize(b){if(b<1024)return b+' o';if(b<1048576)return(b/1024).toFixed(0)+' Ko';return(b/1048576).toFixed(1)+' Mo';}
function setupDropZone(zoneId,inputId,labelId,onFile){var zone=document.getElementById(zoneId),input=document.getElementById(inputId);if(!zone||!input)return;zone.onclick=function(){input.click();};input.onchange=function(){if(input.files[0])handleDropFile(input.files[0],labelId,onFile);};zone.ondragover=function(e){e.preventDefault();zone.classList.add('drag-over');};zone.ondragleave=function(){zone.classList.remove('drag-over');};zone.ondrop=function(e){e.preventDefault();zone.classList.remove('drag-over');if(e.dataTransfer.files[0])handleDropFile(e.dataTransfer.files[0],labelId,onFile);};}
function handleDropFile(file,labelId,onFile){if(file.size>20*1024*1024){showToast('Fichier trop lourd (max 20 Mo)','error');return;}var label=document.getElementById(labelId);if(label)label.textContent='📎 '+file.name+' ('+formatSize(file.size)+')';onFile({file:file,fileName:file.name,fileMime:file.type});}
function previewFileRaw(fileData,fileName,fileMime){
  var content=document.getElementById('modal-preview-content');
  document.getElementById('modal-preview-title').textContent=fileName||'Fichier';
  // Détecter si c'est une URL Storage ou base64
  var isUrl=fileData&&fileData.startsWith('http');
  if(fileMime&&fileMime.startsWith('image/')){
    content.innerHTML='<img src="'+fileData+'" style="max-width:100%;border-radius:var(--radius)">';
  } else if(fileMime==='application/pdf'){
    content.innerHTML='<iframe src="'+fileData+'" style="width:100%;height:500px;border:none;border-radius:var(--radius)"></iframe>';
  } else {
    content.innerHTML='<div style="text-align:center;padding:32px"><div style="font-size:48px">📄</div><div style="margin:12px 0">'+fileName+'</div><a href="'+fileData+'" '+(isUrl?'target="_blank"':'download="'+fileName+'"')+' class="btn-primary" style="text-decoration:none">'+(isUrl?'🔗 Ouvrir':'⬇ Télécharger')+'</a></div>';
  }
  document.getElementById('modal-preview-dl').href=fileData;
  document.getElementById('modal-preview-dl').download=fileName||'document';
  showModal('modal-preview');
}
async function previewFileSB(id,table){try{var item=await SB.getById(table,id);if(!item||!item.fileData){showToast('Aucun fichier joint','error');return;}previewFileRaw(item.fileData,item.fileName,item.fileMime||'application/octet-stream');}catch(e){showToast('Erreur','error');}}

// PROF : GESTION EXERCICES
async function renderGestionExercices(){
  loading('prof-exercices-list');
  try{
    await DB.refresh();
    var exercices=await SB.get('exercices');
    var eleves=DB.getEleves();
    var html='';
    for(var i=0;i<exercices.length;i++){
      var e=exercices[i];
      var qs=Array.isArray(e.questions)?e.questions:(e.questions?JSON.parse(e.questions):[]);
      // Récupérer les résultats de tous les élèves pour cet exercice
      var resultatsEx=[];
      eleves.forEach(function(elv){
        var res=DB.getResultatsEleve(elv.id).find(function(r){return r.exerciceId===String(e.id)||r.exerciceId===e.id;});
        if(res)resultatsEx.push({eleve:elv,res:res});
      });
      var nbFait=resultatsEx.length;
      var moyEx=nbFait?(resultatsEx.reduce(function(s,r){return s+(r.res.score/r.res.total)*20;},0)/nbFait).toFixed(1):'–';
      var aujourd_hui=new Date().toISOString().slice(0,10);
      var programmeBadge=e.visible_from&&e.visible_from>aujourd_hui?'<span style="font-size:10px;padding:2px 8px;border-radius:20px;background:var(--orange-light);color:var(--orange);font-weight:600;margin-left:4px">⏳ Visible le '+formatDate(e.visible_from)+'</span>':'';
      html+='<div class="list-row" style="flex-wrap:wrap;gap:8px"><div class="list-row-icon" style="background:'+(e.type==='examen'?'var(--red-light)':'var(--blue-light)')+'"> '+(e.type==='examen'?'📋':'✏️')+'</div><div class="list-row-info"><div class="list-row-title">'+e.titre+programmeBadge+'</div><div class="list-row-sub">'+e.matiere+' · '+qs.length+' questions'+(e.duree?' · '+e.duree+' min':'')+(e.fileName?' · <span style="color:var(--green)">📎 '+e.fileName+'</span>':'')+'</div>'+(nbFait>0?'<div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap">'+resultatsEx.map(function(r){var n=((r.res.score/r.res.total)*20).toFixed(0);return'<span style="font-size:11px;padding:2px 8px;border-radius:20px;background:'+(parseInt(n)>=10?'var(--green-light)':'var(--red-light)')+';color:'+(parseInt(n)>=10?'var(--green)':'var(--red)')+'">'+r.eleve.prenom+' : '+n+'/20</span>';}).join('')+'</div>':'<div style="margin-top:4px;font-size:12px;color:var(--text-light)">Aucun élève n\'a encore fait cet exercice</div>')+'</div><div class="list-row-actions" style="align-self:flex-start">'+(e.fileData?'<button class="btn-gold btn-sm" onclick="previewFileSB('+e.id+',\'exercices\')">👁 Voir</button>':'')+'<span style="font-size:11px;padding:2px 8px;border-radius:20px;background:var(--cream-dark)">'+nbFait+'/'+eleves.length+' élèves · moy. '+moyEx+'</span><span class="card-badge '+(e.type==='examen'?'badge-examen':'badge-exercice')+'">'+e.type+'</span><button class="btn-danger btn-sm" onclick="deleteExercice('+e.id+')">Supprimer</button></div></div>';
    }
    document.getElementById('prof-exercices-list').innerHTML=html||emptyState('🎯','Aucun exercice');
  }catch(e){showErr('prof-exercices-list','Erreur chargement.');}
}

async function deleteExercice(id){if(!confirm('Supprimer ?'))return;try{await SB.delete('exercices',id);renderGestionExercices();showToast('Supprimé');}catch(e){showToast('Erreur','error');}}
function toggleExamMode(){document.getElementById('ne-duree-group').style.display=document.getElementById('ne-type').value==='examen'?'block':'none';}
function addQuestion(){var idx=questionBlocks.length;questionBlocks.push({q:'',opts:['','','',''],correct:0,explication:''});var letters=['A','B','C','D'];var div=document.createElement('div');div.className='question-block';div.id='qblock-'+idx;div.innerHTML='<div class="question-block-header"><span class="question-num">Question '+(idx+1)+'</span><button class="btn-secondary btn-sm" onclick="removeQuestion('+idx+')">Supprimer</button></div><div class="form-group"><label>Énoncé</label><textarea class="form-input" rows="2" placeholder="Question…" oninput="questionBlocks['+idx+'].q=this.value"></textarea></div><div class="form-group"><label>Options</label>'+letters.map(function(l,i){return'<div class="option-row"><div class="option-correct '+(i===0?'selected':'')+'" id="oc-'+idx+'-'+i+'" onclick="setCorrect('+idx+','+i+')"></div><input class="form-input" placeholder="Option '+l+'" oninput="questionBlocks['+idx+'].opts['+i+']=this.value" style="flex:1"></div>';}).join('')+'</div><div class="form-group"><label>Explication</label><input class="form-input" placeholder="Explication…" oninput="questionBlocks['+idx+'].explication=this.value"></div>';document.getElementById('questions-list').appendChild(div);}
function setCorrect(qIdx,optIdx){questionBlocks[qIdx].correct=optIdx;[0,1,2,3].forEach(function(i){var el=document.getElementById('oc-'+qIdx+'-'+i);if(el)el.classList.toggle('selected',i===optIdx);});}
function removeQuestion(idx){var el=document.getElementById('qblock-'+idx);if(el)el.remove();questionBlocks[idx]=null;}

async function saveExercice(){
  var titre=document.getElementById('ne-titre').value.trim();
  if(!titre){showToast('Veuillez saisir un titre','error');return;}
  var qs=questionBlocks.filter(Boolean).filter(function(q){return q.q&&q.opts.some(function(o){return o;});});
  // Questions obligatoires seulement si pas de fichier joint
  if(!qs.length&&!pendingExerciceFile){showToast('Ajoutez au moins une question ou joignez un document','error');return;}
  var type=document.getElementById('ne-type').value;
  try{
    var item={titre:titre,type:type,matiere:document.getElementById('ne-matiere').value,duree:type==='examen'?parseInt(document.getElementById('ne-duree').value):null,questions:qs.length?qs:[],url:document.getElementById('ne-url').value||null,visible_from:document.getElementById('ne-visible-from').value||null};
    if(pendingExerciceFile&&pendingExerciceFile.file){
      showToast('⏳ Upload en cours…');
      var path='exercices/'+Date.now()+'_'+pendingExerciceFile.fileName.replace(/\s/g,'_');
      var fileUrl=await SB.uploadFile(pendingExerciceFile.file,path);
      item.fileData=fileUrl;item.fileName=pendingExerciceFile.fileName;item.fileMime=pendingExerciceFile.fileMime;
    }
    await SB.insert('exercices',item);
    closeAllModals();questionBlocks=[];pendingExerciceFile=null;document.getElementById('questions-list').innerHTML='';renderGestionExercices();showToast('✅ Exercice créé !','success');
  }catch(e){showToast('Erreur création exercice','error');}
}

// PROF : TRAVAUX RENDUS
async function renderGestionTravaux(){
  loading('prof-travaux-list');
  try{
    var rendus=await SB.get('rendus');
    var devoirs=await SB.get('devoirs');

    // Suppression automatique des rendus notés de plus de 30 jours
    var maintenant=new Date();
    var aSupprimer=rendus.filter(function(r){
      if(r.note===null)return false;
      var dateRendu=new Date(r.date);
      var diffJours=Math.floor((maintenant-dateRendu)/(1000*60*60*24));
      return diffJours>30;
    });
    if(aSupprimer.length>0){
      await Promise.all(aSupprimer.map(function(r){return SB.delete('rendus',r.id);}));
      rendus=rendus.filter(function(r){return!aSupprimer.find(function(s){return s.id===r.id;});});
      if(aSupprimer.length>0)showToast('🗑 '+aSupprimer.length+' rendu(s) ancien(s) supprimé(s) automatiquement');
    }

    // Filtres actifs
    var filtreClasse=window._filtreRenduClasse||'Toutes';
    var filtreDevoir=window._filtreRenduDevoir||'Tous';

    // Liste des classes des élèves
    var classes=['Toutes','Terminale Bac Pro','1ère Bac Pro','2nde Bac Pro'];

    // Filtrer par classe
    var rendusFiltres=rendus.filter(function(r){
      if(filtreClasse==='Toutes')return true;
      var e=DB.getUser(r.eleveId);
      return e&&e.classe===filtreClasse;
    });

    // Filtrer par devoir
    if(filtreDevoir!=='Tous'){
      rendusFiltres=rendusFiltres.filter(function(r){return String(r.devoirId)===String(filtreDevoir);});
    }

    var html='';

    // Bouton créer devoir
    html+='<div style="display:flex;justify-content:flex-end;margin-bottom:16px"><button class="btn-primary" onclick="showModal(\'modal-add-devoir\')">+ Créer un devoir</button></div>';

    // Filtres classe
    html+='<div class="chip-group">'+classes.map(function(c){return'<div class="chip '+(filtreClasse===c?'active':'')+'" onclick="filtreRenduClasse(\''+c+'\')">'+c+'</div>';}).join('')+'</div>';

    // Filtre devoir
    html+='<div class="form-group" style="margin-bottom:16px"><select class="form-input" onchange="filtreRenduDevoir(this.value)" style="max-width:400px"><option value="Tous">Tous les devoirs</option>'+devoirs.map(function(d){return'<option value="'+d.id+'" '+(filtreDevoir===String(d.id)?'selected':'')+'>'+d.titre+'</option>';}).join('')+'</select></div>';

    // Zone upload prof
    html+='<div style="margin-bottom:16px"><div class="upload-zone" id="prof-upload-zone" style="cursor:pointer;max-width:500px"><div class="upload-zone-icon">📤</div><div style="font-size:13px;font-weight:500">Déposer un document corrigé</div><div id="prof-upload-label" style="margin-top:8px;font-size:12px;color:var(--gold-dark)"></div><input type="file" id="prof-upload-input" style="display:none" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"></div></div>';

    // Liste des rendus
    html+=rendusFiltres.length?rendusFiltres.map(function(r){
      var d=devoirs.find(function(x){return String(x.id)===String(r.devoirId);});
      var e=DB.getUser(r.eleveId);
      var jours=Math.floor((maintenant-new Date(r.date))/(1000*60*60*24));
      var expireIn=30-jours;
      return'<div class="list-row"><div class="status-dot '+(r.note!==null?'dot-green':'dot-orange')+'" style="margin:0 4px"></div><div class="list-row-info"><div class="list-row-title">'+(e?e.nom:r.eleveId)+' – '+(d?d.titre:'Devoir')+'</div><div class="list-row-sub">Rendu le '+formatDate(r.date)+(r.fileName?' · 📎 '+r.fileName:'')+(r.note!==null?' · <span style="color:var(--text-light);font-size:11px">Suppression dans '+expireIn+' j</span>':'')+'</div></div><div class="list-row-actions">'+(r.fileData?'<button class="btn-gold btn-sm" onclick="previewFileRaw(\''+r.fileData+'\',\''+r.fileName+'\',\''+r.fileMime+'\')">👁 Voir</button>':'')+(r.note!==null?'<span class="note-badge" style="color:'+(r.note>=10?'var(--green)':'var(--red)')+'">'+r.note+'/20</span>':'')+'<button class="btn-primary btn-sm" onclick="openNoter('+r.id+')">'+(r.note!==null?'Modifier':'Corriger')+'</button><button class="btn-danger btn-sm" onclick="supprimerRendu('+r.id+')">🗑</button></div></div>';
    }).join(''):emptyState('📥','Aucun travail rendu');

    document.getElementById('prof-travaux-list').innerHTML=html;
    setupDropZone('prof-upload-zone','prof-upload-input','prof-upload-label',function(f){pendingRenduProfFile=f;showToast('📎 '+f.fileName,'success');});
  }catch(e){console.error(e);showErr('prof-travaux-list','Erreur chargement.');}
}

function filtreRenduClasse(c){window._filtreRenduClasse=c;renderGestionTravaux();}
function filtreRenduDevoir(id){window._filtreRenduDevoir=id;renderGestionTravaux();}

async function supprimerRendu(id){
  if(!confirm('Supprimer ce rendu ? Cette action est irréversible.'))return;
  try{await SB.delete('rendus',id);renderGestionTravaux();showToast('Rendu supprimé');}catch(e){showToast('Erreur','error');}
}

async function openNoter(rendId){
  noteTargetId=rendId;
  try{
    var r=await SB.getById('rendus',rendId);
    var devoirs=await SB.get('devoirs');
    var d=devoirs.find(function(x){return x.id===r.devoirId;});
    var e=DB.getUser(r.eleveId);
    document.getElementById('modal-noter-info').innerHTML='<div style="background:var(--cream-dark);border-radius:var(--radius);padding:12px 16px;margin-bottom:16px;font-size:13px"><strong>'+(e?e.nom:r.eleveId)+'</strong> – '+(d?d.titre:'Devoir')+'</div>';
    document.getElementById('noter-note').value=r.note||'';
    document.getElementById('noter-comment').value=r.commentaire||'';
    showModal('modal-noter');
  }catch(e){showToast('Erreur','error');}
}

async function saveNote(){
  var note=parseFloat(document.getElementById('noter-note').value);
  if(isNaN(note)||note<0||note>20){showToast('Note invalide (0-20)','error');return;}
  try{await SB.update('rendus',noteTargetId,{note:note,commentaire:document.getElementById('noter-comment').value});closeAllModals();renderGestionTravaux();showToast('✅ Note enregistrée !','success');}catch(e){showToast('Erreur','error');}
}

// PROF : ÉLÈVES
async function renderGestionEleves(){
  try{ await DB.refreshEleves(); }catch(e){ console.error(e); }
  var eleves=DB.getEleves();
  var classes=['Toutes','Terminale Bac Pro','1ère Bac Pro','2nde Bac Pro'];
  var filtreActif=window._filtreClasse||'Toutes';
  var elevesFiltres=filtreActif==='Toutes'?eleves:eleves.filter(function(e){return e.classe===filtreActif;});
  document.getElementById('prof-eleves-list').innerHTML='<div class="chip-group">'+classes.map(function(c){return'<div class="chip '+(filtreActif===c?'active':'')+'" onclick="filtreClasse(\''+c+'\')">'+c+' ('+(c==='Toutes'?eleves.length:eleves.filter(function(e){return e.classe===c;}).length)+')</div>';}).join('')+'</div>'+(elevesFiltres.length?'<table class="result-detail-table"><thead><tr><th>Élève</th><th>Identifiant</th><th>Classe</th><th>Mot de passe</th><th>Actions</th></tr></thead><tbody>'+elevesFiltres.map(function(e){var col=e.classe==='Terminale Bac Pro'?'var(--red)':e.classe==='1ère Bac Pro'?'var(--blue)':'var(--green)';return'<tr><td><div style="display:flex;align-items:center;gap:8px"><div class="user-avatar" style="width:28px;height:28px;font-size:10px">'+e.initiales+'</div>'+e.nom+'</div></td><td style="font-family:var(--font-mono);font-size:12px">'+e.id+'</td><td><span style="font-size:12px;font-weight:600;color:'+col+'">'+(e.classe||'–')+'</span></td><td style="font-family:var(--font-mono);font-size:12px">'+e.pw+'</td><td><button class="btn-danger btn-sm" onclick="deleteEleve(\''+e.id+'\')">Supprimer</button></td></tr>';}).join('')+'</tbody></table>':emptyState('👥','Aucun élève dans cette classe'));
}

function filtreClasse(c){window._filtreClasse=c;renderGestionEleves();}
document.addEventListener('DOMContentLoaded',function(){var p=document.getElementById('ae-prenom'),n=document.getElementById('ae-nom');if(p)p.addEventListener('input',updateAeId);if(n)n.addEventListener('input',updateAeId);});
function updateAeId(){var p=(document.getElementById('ae-prenom').value||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'');var n=(document.getElementById('ae-nom').value||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'');document.getElementById('ae-id').value=p&&n?p+'.'+n:'';}

async function addEleve(){
  var id=document.getElementById('ae-id').value.trim();
  var prenom=document.getElementById('ae-prenom').value.trim();
  var nom=document.getElementById('ae-nom').value.trim();
  if(!id||!prenom||!nom){showToast('Remplissez prénom et nom','error');return;}
  if(DB.getUser(id)){showToast('Identifiant déjà utilisé','error');return;}
  var classe=document.getElementById('ae-classe').value;
  try{
    await DB.addUser({id:id,nom:prenom+' '+nom,prenom:prenom,initiales:(prenom[0]+nom[0]).toUpperCase(),role:'eleve',pw:document.getElementById('ae-pw').value||'eleve123',classe:classe});
    closeAllModals();renderGestionEleves();showToast('✅ Compte créé : '+id,'success');
  }catch(e){showToast('Erreur : compte non enregistré (vérifiez la connexion internet)','error');}
}

async function deleteEleve(id){
  if(!confirm('Supprimer '+id+' ?'))return;
  try{ await DB.removeUser(id); renderGestionEleves(); showToast('Élève supprimé'); }
  catch(e){ showToast('Erreur lors de la suppression','error'); }
}

var pendingDevoirFile = null;

async function addDevoir(){
  var titre=document.getElementById('nd-titre').value.trim();
  if(!titre){showToast('Veuillez saisir un titre','error');return;}
  try{
    var item={titre:titre,consignes:document.getElementById('nd-consignes').value,deadline:document.getElementById('nd-deadline').value||new Date(Date.now()+7*86400000).toISOString().slice(0,10),creePar:currentUser.id,url:document.getElementById('nd-url').value||null};
    if(pendingDevoirFile&&pendingDevoirFile.file){
      showToast('⏳ Upload en cours…');
      var path='devoirs/'+Date.now()+'_'+pendingDevoirFile.fileName.replace(/\s/g,'_');
      var fileUrl=await SB.uploadFile(pendingDevoirFile.file,path);
      item.fileData=fileUrl;item.fileName=pendingDevoirFile.fileName;item.fileMime=pendingDevoirFile.fileMime;
    }
    await SB.insert('devoirs',item);
    pendingDevoirFile=null;closeAllModals();renderTravaux();showToast('✅ Devoir créé !','success');
  }catch(e){showToast('Erreur création devoir','error');}
}

// MODALS
function showModal(id){
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById(id).classList.remove('hidden');
  if(id==='modal-add-outil'){pendingOutilFile=null;var lo=document.getElementById('no-file-label');if(lo)lo.textContent='';setupDropZone('no-drop-zone','no-file-input','no-file-label',function(f){pendingOutilFile=f;});}
  if(id==='modal-add-cours'){pendingCoursFile=null;var l=document.getElementById('nc-file-label');if(l)l.textContent='';setupDropZone('nc-drop-zone','nc-file-input','nc-file-label',function(f){pendingCoursFile=f;});}
  if(id==='modal-add-exercice'){pendingExerciceFile=null;var l2=document.getElementById('ne-file-label');if(l2)l2.textContent='';setupDropZone('ne-drop-zone','ne-file-input','ne-file-label',function(f){pendingExerciceFile=f;});}
  if(id==='modal-add-devoir'){pendingDevoirFile=null;var l3=document.getElementById('nd-file-label');if(l3)l3.textContent='';setupDropZone('nd-drop-zone','nd-file-input','nd-file-label',function(f){pendingDevoirFile=f;});}
}function closeAllModals(){document.getElementById('modal-overlay').classList.add('hidden');document.querySelectorAll('.modal').forEach(function(m){m.classList.add('hidden');});}

// TOAST
var toastTimeout;
function showToast(msg,type){var t=document.getElementById('toast');t.textContent=msg;t.className='toast '+(type||'');t.classList.remove('hidden');clearTimeout(toastTimeout);toastTimeout=setTimeout(function(){t.classList.add('hidden');},4000);}

// HELPERS
function formatDate(d){if(!d)return'–';return new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});}
function typeEmoji(t){return{pdf:'📄',video:'🎬',fiche:'📋',lien:'🔗'}[t]||'📄';}
function typeLabel(t){return{pdf:'PDF',video:'Vidéo',fiche:'Fiche technique',lien:'Lien externe'}[t]||'Document';}
