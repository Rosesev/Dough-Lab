// ===== Dough Lab =====
let currentUser = null, examState = null, noteTargetId = null;
let quizQuestions = [], quizIndex = 0, quizScore = 0, quizAnswered = false;
let pendingExamId = null, examTimerInterval = null, questionBlocks = [];
let pendingCoursFile = null, pendingExerciceFile = null, pendingRenduProfFile = null;
window.loginRole = 'eleve';

// AUTH
function togglePw(a,b){var i=document.getElementById(a),e=document.getElementById(b);if(!i||!e)return;i.type=i.type==='password'?'text':'password';e.textContent=i.type==='password'?'👁':'🙈';}
function fillDemo(id,pw,role){window.loginRole=role;document.getElementById('tab-eleve').classList.toggle('active',role==='eleve');document.getElementById('tab-prof').classList.toggle('active',role==='prof');document.getElementById('login-id').value=id;document.getElementById('login-pw').value=pw;}

function doLogin(){
  var id=document.getElementById('login-id').value.trim();
  var pw=document.getElementById('login-pw').value.trim();
  var role=window.loginRole||'eleve';
  var user=DB.getUser(id);
  if(!user){showLoginError('Identifiant introuvable.');return;}
  if(user.pw!==pw){showLoginError('Mot de passe incorrect.');return;}
  if(user.role!==role){showLoginError('Rôle incorrect.');return;}
  currentUser=user;
  document.getElementById('login-error').classList.remove('show');
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  initApp();
}

function showLoginError(msg){var el=document.getElementById('login-error');el.textContent=msg;el.classList.add('show');}
function doLogout(){currentUser=null;stopExamTimer();document.getElementById('app').classList.add('hidden');document.getElementById('login-screen').classList.remove('hidden');document.getElementById('login-id').value='';document.getElementById('login-pw').value='';document.getElementById('login-error').classList.remove('show');}
function hardReset(){if(confirm('Réinitialiser ?')){localStorage.clear();location.reload(true);}}

function initApp(){
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
  var el=document.getElementById('page-'+page);if(el)el.classList.add('active');
  document.querySelectorAll('.nav-link[data-page="'+page+'"]').forEach(function(l){l.classList.add('active');});
  var r={accueil:renderAccueil,cours:renderCours,exercices:renderExercices,travaux:renderTravaux,examens:renderExamens,resultats:renderResultats,'gestion-cours':renderGestionCours,'gestion-exercices':renderGestionExercices,'gestion-travaux':renderGestionTravaux,'gestion-eleves':renderGestionEleves};
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
    var all=await SB.get('cours');
    var cours=all.filter(function(c){return!coursFilter||c.titre.toLowerCase().includes(coursFilter)||(c.matiere&&c.matiere.toLowerCase().includes(coursFilter));});
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
        html+='<div class="list-row" onclick="openCours(\''+c.id+'\')" style="cursor:pointer"><div class="list-row-icon" style="background:'+(colors[c.matiere]||'var(--cream-dark)')+'">'+typeEmoji(c.type)+'</div><div class="list-row-info"><div class="list-row-title">'+c.titre+(c.nouveau?' <span class="tag tag-new">Nouveau</span>':'')+'</div><div class="list-row-sub">'+typeLabel(c.type)+(c.description?' · '+String(c.description).slice(0,60)+'…':'')+'</div>'+(currentUser.role==='eleve'?'<div class="progress-bar" style="margin-top:6px"><div class="progress-fill" style="width:'+pct+'%"></div></div>':'')+'</div><span style="font-size:11px;color:var(--text-light)">'+formatDate(c.date)+'</span></div>';
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
    var all=await SB.get('exercices');
    var exercices=all.filter(function(e){return e.type==='exercice';});
    document.getElementById('exercices-grid').innerHTML=exercices.map(function(e){
      var qs=Array.isArray(e.questions)?e.questions:(e.questions?JSON.parse(e.questions):[]);
      var res=DB.getResultatsEleve(currentUser.id).find(function(r){return r.exerciceId===e.id;});
      return'<div class="resource-card" onclick="startExercice(\''+e.id+'\')"><div class="card-emoji">✏️</div><span class="card-badge badge-exercice">Exercice</span><div class="card-title">'+e.titre+'</div><div class="card-sub">'+e.matiere+'</div><div class="card-sub">'+qs.length+' questions</div><div class="card-sub" style="color:'+(res?'var(--green)':'var(--text-light)')+'">'+( res?'🏆 '+res.score+'/'+res.total:'Pas encore fait')+'</div></div>';
    }).join('')||emptyState('✏️','Aucun exercice disponible');
  }catch(e){showErr('exercices-grid','Erreur chargement.');}
}

async function startExercice(id){
  try{
    var ex=await SB.getById('exercices',id);if(!ex)return;
    quizQuestions=Array.isArray(ex.questions)?ex.questions:JSON.parse(ex.questions);
    quizIndex=0;quizScore=0;quizAnswered=false;
    document.getElementById('exercices-home').classList.add('hidden');
    document.getElementById('exercice-player').classList.remove('hidden');
    renderQuizQuestion(ex,id);
  }catch(e){showToast('Erreur','error');}
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
      var mesRendus=rendus.filter(function(r){return r.eleveId===u.id;});
      var aFaire=devoirs.filter(function(d){return!mesRendus.find(function(r){return r.devoirId===d.id;});});
      var faits=devoirs.filter(function(d){return mesRendus.find(function(r){return r.devoirId===d.id;});});
      if(aFaire.length){html+='<h2 class="section-title" style="margin-bottom:12px">Devoirs à rendre</h2>';aFaire.forEach(function(d){var late=new Date(d.deadline)<new Date();html+='<div class="devoir-card"><div class="devoir-card-header"><div><div class="devoir-card-title">'+d.titre+'</div><div class="devoir-card-meta">Avant le '+formatDate(d.deadline)+'</div></div><span class="tag '+(late?'tag-urgent':'')+'" style="'+(!late?'background:var(--green-light);color:var(--green)':'')+'">'+(late?'En retard':'À rendre')+'</span></div><div class="devoir-card-consignes">'+d.consignes+'</div><div class="upload-zone" onclick="simulateUpload(\''+d.id+'\')"><div class="upload-zone-icon">📤</div><div>Cliquez pour déposer</div></div></div>';});}
      if(faits.length){html+='<h2 class="section-title" style="margin:24px 0 12px">Travaux rendus</h2>';faits.forEach(function(d){var rendu=mesRendus.find(function(r){return r.devoirId===d.id;});html+='<div class="devoir-card"><div class="devoir-card-header"><div><div class="devoir-card-title">'+d.titre+'</div><div class="devoir-card-meta">Rendu le '+formatDate(rendu.date)+'</div></div>'+(rendu.note!==null?'<span class="note-badge" style="color:'+(rendu.note>=10?'var(--green)':'var(--red)')+'">'+rendu.note+'/20</span>':'<span class="tag" style="background:var(--orange-light);color:var(--orange)">En correction</span>')+'</div>'+(rendu.commentaire?'<div class="commentaire-box"><div class="commentaire-label">Commentaire</div>'+rendu.commentaire+'</div>':'')+'</div>';});}
      if(!devoirs.length)html=emptyState('📭','Aucun devoir assigné');
    }else{
      html+='<div style="display:flex;justify-content:flex-end;margin-bottom:16px"><button class="btn-primary" onclick="showModal(\'modal-add-devoir\')">+ Créer un devoir</button></div>';
      devoirs.forEach(function(d){var nb=rendus.filter(function(r){return r.devoirId===d.id;}).length;html+='<div class="devoir-card"><div class="devoir-card-header"><div><div class="devoir-card-title">'+d.titre+'</div><div class="devoir-card-meta">Avant le '+formatDate(d.deadline)+' · '+nb+' rendu(s)</div></div><button class="btn-danger btn-sm" onclick="deleteDevoir(\''+d.id+'\')">Supprimer</button></div><div class="devoir-card-consignes">'+d.consignes+'</div></div>';});
      if(!devoirs.length)html+=emptyState('📋','Aucun devoir créé');
    }
    document.getElementById('travaux-content').innerHTML=html;
  }catch(e){showErr('travaux-content','Erreur chargement travaux.');}
}

async function simulateUpload(devoirId){
  try{await SB.insert('rendus',{devoirId:devoirId,eleveId:currentUser.id,date:new Date().toISOString().slice(0,10),note:null,commentaire:null,fileName:'travail_'+currentUser.id+'.pdf'});showToast('✅ Travail déposé !','success');renderTravaux();}catch(e){showToast('Erreur dépôt','error');}
}

async function deleteDevoir(id){if(!confirm('Supprimer ?'))return;try{await SB.delete('devoirs',id);renderTravaux();showToast('Devoir supprimé');}catch(e){showToast('Erreur','error');}}

// EXAMENS
async function renderExamens(){
  document.getElementById('examens-home').classList.remove('hidden');
  document.getElementById('exam-player').classList.add('hidden');
  loading('examens-grid');
  try{
    var all=await SB.get('exercices');
    var examens=all.filter(function(e){return e.type==='examen';});
    document.getElementById('examens-grid').innerHTML=examens.map(function(e){
      var qs=Array.isArray(e.questions)?e.questions:(e.questions?JSON.parse(e.questions):[]);
      var done=DB.getResultatsEleve(currentUser.id).find(function(r){return r.exerciceId===e.id;});
      return'<div class="resource-card" onclick="'+(currentUser.role==='eleve'?'confirmStartExam(\''+e.id+'\')':'showToast(\'Accès via Gérer les exercices\')')+'"><div class="card-emoji">📋</div><span class="card-badge badge-examen">Examen</span><div class="card-title">'+e.titre+'</div><div class="card-sub">'+e.matiere+'</div><div class="card-sub">⏱ '+e.duree+' min · '+qs.length+' questions</div>'+(done?'<div class="card-sub" style="color:var(--green)">✅ '+done.score+'/'+done.total+'</div>':'')+'</div>';
    }).join('')||emptyState('📋','Aucun examen disponible');
  }catch(e){showErr('examens-grid','Erreur chargement.');}
}

async function confirmStartExam(id){
  try{
    pendingExamId=id;var ex=await SB.getById('exercices',id);
    var qs=Array.isArray(ex.questions)?ex.questions:JSON.parse(ex.questions);
    document.getElementById('exam-confirm-info').innerHTML='<div style="background:var(--red-light);border-radius:var(--radius);padding:16px;margin-bottom:16px;font-size:13px;color:#8B2020;line-height:1.7"><strong>'+ex.titre+'</strong><br>Durée : '+ex.duree+' min · '+qs.length+' questions<br>⚠️ Une fois démarré, vous ne pouvez plus naviguer.</div>';
    showModal('modal-confirm-exam');
  }catch(e){showToast('Erreur','error');}
}

async function startExamConfirmed(){
  closeAllModals();
  try{
    var ex=await SB.getById('exercices',pendingExamId);if(!ex)return;
    var qs=Array.isArray(ex.questions)?ex.questions:JSON.parse(ex.questions);
    examState={id:pendingExamId,questions:qs,index:0,answers:[],remaining:ex.duree*60};
    document.getElementById('examens-home').classList.add('hidden');
    document.getElementById('exam-player').classList.remove('hidden');
    renderExamQuestion();startExamTimer();
  }catch(e){showToast('Erreur','error');}
}

function renderExamQuestion(){
  if(!examState)return;
  if(examState.index>=examState.questions.length){finishExam();return;}
  var q=examState.questions[examState.index];var letters=['A','B','C','D'];
  document.getElementById('exam-player').innerHTML='<div class="exam-topbar"><div><div class="exam-topbar-title">Examen en cours</div><div class="exam-topbar-sub">Question '+(examState.index+1)+'/'+examState.questions.length+'</div></div><div class="exam-timer" id="exam-timer-display">--:--</div></div><div class="quiz-player"><div class="progress-bar" style="margin-bottom:20px"><div class="progress-fill" style="width:'+((examState.index/examState.questions.length)*100)+'%"></div></div><div class="quiz-question-card"><div class="quiz-q-text">'+q.q+'</div><div class="quiz-opts" id="exam-opts">'+q.opts.map(function(o,i){return'<div class="quiz-opt" onclick="selectExamOpt('+i+')"><div class="opt-letter">'+letters[i]+'</div><span>'+o+'</span></div>';}).join('')+'</div></div><div style="display:flex;gap:10px;margin-top:16px"><button class="btn-primary" onclick="nextExamQuestion()">'+(examState.index<examState.questions.length-1?'Question suivante →':'Terminer')+'</button><button class="btn-danger btn-sm" onclick="if(confirm(\'Abandonner ?\'))stopExam()">Abandonner</button></div></div>';
  updateTimerDisplay();
}

function selectExamOpt(i){document.querySelectorAll('#exam-opts .quiz-opt').forEach(function(el,j){el.classList.toggle('selected',j===i);});examState.answers[examState.index]=i;}
function nextExamQuestion(){examState.index++;renderExamQuestion();}
function startExamTimer(){updateTimerDisplay();examTimerInterval=setInterval(function(){examState.remaining--;updateTimerDisplay();if(examState.remaining<=0){clearInterval(examTimerInterval);finishExam(true);}},1000);}
function updateTimerDisplay(){var el=document.getElementById('exam-timer-display');if(!el||!examState)return;var m=Math.floor(examState.remaining/60),s=examState.remaining%60;el.textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');el.classList.toggle('warning',examState.remaining<120);}
function stopExam(){clearInterval(examTimerInterval);examTimerInterval=null;examState=null;document.getElementById('examens-home').classList.remove('hidden');document.getElementById('exam-player').classList.add('hidden');renderExamens();}
function stopExamTimer(){clearInterval(examTimerInterval);examTimerInterval=null;examState=null;}
function finishExam(timeout){clearInterval(examTimerInterval);examTimerInterval=null;var score=0;examState.questions.forEach(function(q,i){if(examState.answers[i]===q.correct)score++;});DB.addResultat(currentUser.id,examState.id,score,examState.questions.length,'examen');var note=((score/examState.questions.length)*20).toFixed(1);document.getElementById('exam-player').innerHTML='<div style="max-width:500px"><div class="quiz-results"><div class="result-emoji">'+(timeout?'⏰':score>=examState.questions.length*0.6?'🎓':'📚')+'</div><div class="result-score">'+score+'/'+examState.questions.length+'</div><div class="result-sub">Note : <strong>'+note+'/20</strong></div><div style="margin-top:24px"><button class="btn-primary" onclick="stopExam()">Retour</button></div></div></div>';examState=null;showToast('📋 Examen terminé – Note : '+note+'/20','success');}

// RÉSULTATS
function renderResultats(){
  var resultats=DB.getResultatsEleve(currentUser.id);
  if(!resultats.length){document.getElementById('resultats-content').innerHTML=emptyState('📊','Aucun résultat pour l\'instant');return;}
  var notes=resultats.map(function(r){return(r.score/r.total)*20;});
  var moy=notes.length?(notes.reduce(function(a,b){return a+b;},0)/notes.length).toFixed(1):'–';
  document.getElementById('resultats-content').innerHTML='<div class="stats-row" style="margin-bottom:28px">'+stat('📊',moy,'Moyenne','--brown')+stat('📝',resultats.length,'Exercices réalisés','--blue')+'</div><table class="result-detail-table"><thead><tr><th>Exercice</th><th>Score</th><th>Note</th><th>Date</th></tr></thead><tbody>'+resultats.slice().reverse().map(function(r){var n=((r.score/r.total)*20).toFixed(1);return'<tr><td>'+r.exerciceId+'</td><td>'+r.score+'/'+r.total+'</td><td style="color:'+(parseFloat(n)>=10?'var(--green)':'var(--red)')+'">'+n+'</td><td style="font-size:12px;color:var(--text-light)">'+formatDate(r.date)+'</td></tr>';}).join('')+'</tbody></table>';
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
    var item={titre:titre,matiere:document.getElementById('nc-matiere').value,type:document.getElementById('nc-type').value,url:document.getElementById('nc-url').value||'#',description:document.getElementById('nc-desc').value,date:new Date().toISOString().slice(0,10),nouveau:true};
    if(pendingCoursFile){item.fileData=pendingCoursFile.fileData;item.fileName=pendingCoursFile.fileName;item.fileMime=pendingCoursFile.fileMime;}
    await SB.insert('cours',item);
    pendingCoursFile=null;closeAllModals();renderGestionCours();showToast('✅ Cours ajouté !','success');
  }catch(e){console.error(e);showToast('Erreur ajout cours : '+e.message,'error');}
}

// FICHIERS
function readFileAsBase64(file){return new Promise(function(resolve,reject){var r=new FileReader();r.onload=function(e){resolve(e.target.result);};r.onerror=reject;r.readAsDataURL(file);});}
function formatSize(b){if(b<1024)return b+' o';if(b<1048576)return(b/1024).toFixed(0)+' Ko';return(b/1048576).toFixed(1)+' Mo';}
function setupDropZone(zoneId,inputId,labelId,onFile){var zone=document.getElementById(zoneId),input=document.getElementById(inputId);if(!zone||!input)return;zone.onclick=function(){input.click();};input.onchange=function(){if(input.files[0])handleDropFile(input.files[0],labelId,onFile);};zone.ondragover=function(e){e.preventDefault();zone.classList.add('drag-over');};zone.ondragleave=function(){zone.classList.remove('drag-over');};zone.ondrop=function(e){e.preventDefault();zone.classList.remove('drag-over');if(e.dataTransfer.files[0])handleDropFile(e.dataTransfer.files[0],labelId,onFile);};}
function handleDropFile(file,labelId,onFile){if(file.size>4*1024*1024){showToast('Fichier trop lourd (max 4 Mo)','error');return;}var label=document.getElementById(labelId);if(label)label.textContent='📎 '+file.name+' ('+formatSize(file.size)+')';readFileAsBase64(file).then(function(data){onFile({fileData:data,fileName:file.name,fileMime:file.type});});}
function previewFileRaw(fileData,fileName,fileMime){var content=document.getElementById('modal-preview-content');document.getElementById('modal-preview-title').textContent=fileName||'Fichier';if(fileMime&&fileMime.startsWith('image/'))content.innerHTML='<img src="'+fileData+'" style="max-width:100%;border-radius:var(--radius)">';else if(fileMime==='application/pdf')content.innerHTML='<iframe src="'+fileData+'" style="width:100%;height:500px;border:none;border-radius:var(--radius)"></iframe>';else content.innerHTML='<div style="text-align:center;padding:32px"><div style="font-size:48px">📄</div><div style="margin:12px 0">'+fileName+'</div><a href="'+fileData+'" download="'+fileName+'" class="btn-primary" style="text-decoration:none">⬇ Télécharger</a></div>';document.getElementById('modal-preview-dl').href=fileData;document.getElementById('modal-preview-dl').download=fileName||'document';showModal('modal-preview');}
async function previewFileSB(id,table){try{var item=await SB.getById(table,id);if(!item||!item.fileData){showToast('Aucun fichier joint','error');return;}previewFileRaw(item.fileData,item.fileName,item.fileMime||'application/octet-stream');}catch(e){showToast('Erreur','error');}}

// PROF : GESTION EXERCICES
async function renderGestionExercices(){
  loading('prof-exercices-list');
  try{
    var exercices=await SB.get('exercices');
    document.getElementById('prof-exercices-list').innerHTML=exercices.map(function(e){var qs=Array.isArray(e.questions)?e.questions:(e.questions?JSON.parse(e.questions):[]);return'<div class="list-row"><div class="list-row-icon" style="background:'+(e.type==='examen'?'var(--red-light)':'var(--blue-light)')+'"> '+(e.type==='examen'?'📋':'✏️')+'</div><div class="list-row-info"><div class="list-row-title">'+e.titre+'</div><div class="list-row-sub">'+e.matiere+' · '+qs.length+' questions'+(e.duree?' · '+e.duree+' min':'')+'</div></div><div class="list-row-actions"><span class="card-badge '+(e.type==='examen'?'badge-examen':'badge-exercice')+'">'+e.type+'</span><button class="btn-danger btn-sm" onclick="deleteExercice(\''+e.id+'\')">Supprimer</button></div></div>';}).join('')||emptyState('🎯','Aucun exercice');
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
  if(!qs.length){showToast('Ajoutez au moins une question','error');return;}
  var type=document.getElementById('ne-type').value;
  try{
    var item={titre:titre,type:type,matiere:document.getElementById('ne-matiere').value,duree:type==='examen'?parseInt(document.getElementById('ne-duree').value):null,questions:qs};
    if(pendingExerciceFile){item.fileData=pendingExerciceFile.fileData;item.fileName=pendingExerciceFile.fileName;item.fileMime=pendingExerciceFile.fileMime;}
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
    document.getElementById('prof-travaux-list').innerHTML='<div style="margin-bottom:20px"><div class="upload-zone" id="prof-upload-zone" style="cursor:pointer;max-width:500px"><div class="upload-zone-icon">📤</div><div style="font-size:13px;font-weight:500">Déposer un document corrigé</div><div id="prof-upload-label" style="margin-top:8px;font-size:12px;color:var(--gold-dark)"></div><input type="file" id="prof-upload-input" style="display:none" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"></div></div>'+(rendus.length?rendus.map(function(r){var d=devoirs.find(function(x){return x.id===r.devoirId;});var e=DB.getUser(r.eleveId);return'<div class="list-row"><div class="status-dot '+(r.note!==null?'dot-green':'dot-orange')+'" style="margin:0 4px"></div><div class="list-row-info"><div class="list-row-title">'+(e?e.nom:r.eleveId)+' – '+(d?d.titre:'Devoir')+'</div><div class="list-row-sub">Rendu le '+formatDate(r.date)+'</div></div><div class="list-row-actions">'+(r.note!==null?'<span class="note-badge" style="color:'+(r.note>=10?'var(--green)':'var(--red)')+'">'+r.note+'/20</span>':'')+'<button class="btn-primary btn-sm" onclick="openNoter(\''+r.id+'\')">'+(r.note!==null?'Modifier':'Corriger')+'</button></div></div>';}).join(''):emptyState('📥','Aucun travail rendu'));
    setupDropZone('prof-upload-zone','prof-upload-input','prof-upload-label',function(f){pendingRenduProfFile=f;showToast('📎 '+f.fileName,'success');});
  }catch(e){showErr('prof-travaux-list','Erreur chargement.');}
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
function renderGestionEleves(){
  var eleves=DB.getEleves();
  var classes=['Toutes','Terminale Bac Pro','1ère Bac Pro','2nde Bac Pro'];
  var filtreActif=window._filtreClasse||'Toutes';
  var elevesFiltres=filtreActif==='Toutes'?eleves:eleves.filter(function(e){return e.classe===filtreActif;});
  document.getElementById('prof-eleves-list').innerHTML='<div class="chip-group">'+classes.map(function(c){return'<div class="chip '+(filtreActif===c?'active':'')+'" onclick="filtreClasse(\''+c+'\')">'+c+' ('+(c==='Toutes'?eleves.length:eleves.filter(function(e){return e.classe===c;}).length)+')</div>';}).join('')+'</div>'+(elevesFiltres.length?'<table class="result-detail-table"><thead><tr><th>Élève</th><th>Identifiant</th><th>Classe</th><th>Mot de passe</th><th>Actions</th></tr></thead><tbody>'+elevesFiltres.map(function(e){var col=e.classe==='Terminale Bac Pro'?'var(--red)':e.classe==='1ère Bac Pro'?'var(--blue)':'var(--green)';return'<tr><td><div style="display:flex;align-items:center;gap:8px"><div class="user-avatar" style="width:28px;height:28px;font-size:10px">'+e.initiales+'</div>'+e.nom+'</div></td><td style="font-family:var(--font-mono);font-size:12px">'+e.id+'</td><td><span style="font-size:12px;font-weight:600;color:'+col+'">'+(e.classe||'–')+'</span></td><td style="font-family:var(--font-mono);font-size:12px">'+e.pw+'</td><td><button class="btn-danger btn-sm" onclick="deleteEleve(\''+e.id+'\')">Supprimer</button></td></tr>';}).join('')+'</tbody></table>':emptyState('👥','Aucun élève dans cette classe'));
}

function filtreClasse(c){window._filtreClasse=c;renderGestionEleves();}
document.addEventListener('DOMContentLoaded',function(){var p=document.getElementById('ae-prenom'),n=document.getElementById('ae-nom');if(p)p.addEventListener('input',updateAeId);if(n)n.addEventListener('input',updateAeId);});
function updateAeId(){var p=(document.getElementById('ae-prenom').value||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'');var n=(document.getElementById('ae-nom').value||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'');document.getElementById('ae-id').value=p&&n?p+'.'+n:'';}

function addEleve(){
  var id=document.getElementById('ae-id').value.trim();
  var prenom=document.getElementById('ae-prenom').value.trim();
  var nom=document.getElementById('ae-nom').value.trim();
  if(!id||!prenom||!nom){showToast('Remplissez prénom et nom','error');return;}
  if(DB.getUser(id)){showToast('Identifiant déjà utilisé','error');return;}
  var classe=document.getElementById('ae-classe').value;
  DB.addUser({id:id,nom:prenom+' '+nom,prenom:prenom,initiales:(prenom[0]+nom[0]).toUpperCase(),role:'eleve',pw:document.getElementById('ae-pw').value||'eleve123',classe:classe});
  closeAllModals();renderGestionEleves();showToast('✅ Compte créé : '+id,'success');
}

function deleteEleve(id){if(!confirm('Supprimer '+id+' ?'))return;DB.removeUser(id);renderGestionEleves();showToast('Élève supprimé');}

async function addDevoir(){
  var titre=document.getElementById('nd-titre').value.trim();
  if(!titre){showToast('Veuillez saisir un titre','error');return;}
  try{await SB.insert('devoirs',{titre:titre,consignes:document.getElementById('nd-consignes').value,deadline:document.getElementById('nd-deadline').value||new Date(Date.now()+7*86400000).toISOString().slice(0,10),creePar:currentUser.id});closeAllModals();renderTravaux();showToast('✅ Devoir créé !','success');}catch(e){showToast('Erreur création devoir','error');}
}

// MODALS
function showModal(id){document.getElementById('modal-overlay').classList.remove('hidden');document.getElementById(id).classList.remove('hidden');if(id==='modal-add-cours'){pendingCoursFile=null;var l=document.getElementById('nc-file-label');if(l)l.textContent='';setupDropZone('nc-drop-zone','nc-file-input','nc-file-label',function(f){pendingCoursFile=f;});}if(id==='modal-add-exercice'){pendingExerciceFile=null;var l2=document.getElementById('ne-file-label');if(l2)l2.textContent='';setupDropZone('ne-drop-zone','ne-file-input','ne-file-label',function(f){pendingExerciceFile=f;});}}
function closeAllModals(){document.getElementById('modal-overlay').classList.add('hidden');document.querySelectorAll('.modal').forEach(function(m){m.classList.add('hidden');});}

// TOAST
var toastTimeout;
function showToast(msg,type){var t=document.getElementById('toast');t.textContent=msg;t.className='toast '+(type||'');t.classList.remove('hidden');clearTimeout(toastTimeout);toastTimeout=setTimeout(function(){t.classList.add('hidden');},4000);}

// HELPERS
function formatDate(d){if(!d)return'–';return new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});}
function typeEmoji(t){return{pdf:'📄',video:'🎬',fiche:'📋',lien:'🔗'}[t]||'📄';}
function typeLabel(t){return{pdf:'PDF',video:'Vidéo',fiche:'Fiche technique',lien:'Lien externe'}[t]||'Document';}
