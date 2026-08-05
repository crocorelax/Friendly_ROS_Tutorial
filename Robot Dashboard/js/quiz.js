// ════════════════════════════════════════════════════════════
// QUIZ DIAGNOSTIQUE — Robot Dashboard
// 5 questions sur les capteurs ROS, 20 pts chacune = 100 pts max
// Se déclenche après 10 s de simulation
// Dépend de : auth.js (Supabase), state.js (simMode, simT)
// ════════════════════════════════════════════════════════════

const QUIZ_QUESTIONS = [
  {
    q: 'Quel topic ROS transporte les données du LiDAR ?',
    opts: ['/odom', '/scan', '/tf', '/cmd_vel'],
    correct: 1,
    hint: '/scan publie les mesures LaserScan à ~10 Hz — les distances sur 360°.',
  },
  {
    q: 'Pourquoi le LiDAR corrige-t-il la dérive odométrique ?',
    opts: [
      'Il recale la position sur la carte, sans dérive',
      'Il amplifie la puissance envoyée aux moteurs',
      'Il calcule la vitesse angulaire des roues',
      'Il surveille la tension de la batterie LiPo',
    ],
    correct: 0,
    hint: 'L\'odom intègre des erreurs → drift cumulatif. Le LiDAR se "voit" dans la carte sans jamais dériver.',
  },
  {
    q: 'Quelle est la fréquence typique du topic /imu/data ?',
    opts: ['1 Hz', '10 Hz', '50 Hz', '100 Hz'],
    correct: 3,
    hint: 'L\'IMU tourne à 100 Hz pour capturer les mouvements rapides (vibrations, rotations brusques).',
  },
  {
    q: 'rosbridge WebSocket permet de…',
    opts: [
      'Accéder aux topics ROS depuis un navigateur',
      'Reprogrammer le firmware du robot à distance',
      'Recalibrer les capteurs embarqués du robot',
      'Superviser la charge de la batterie LiPo',
    ],
    correct: 0,
    hint: 'rosbridge traduit les topics ROS en JSON sur WebSocket — c\'est ce qui fait tourner ce dashboard !',
  },
  {
    q: 'Le topic /tf gère…',
    opts: [
      'Les transformations entre les repères (frames)',
      'Les images capturées par la caméra embarquée',
      'La vitesse de translation mesurée par les roues',
      'Les topics filtrés selon leur fréquence d\'émission',
    ],
    correct: 0,
    hint: '/tf diffuse en continu les matrices de transformation entre tous les repères — indispensable pour la navigation.',
  },
];

const quizState = {
  started:    false,
  idx:        0,
  score:      0,
  answered:   false,
  bestDb:     0,
  completed:  false,
  order:      [],  // position affichée → indice original dans q.opts
  correctPos: -1,  // position affichée de la bonne réponse
};

// ── Démarre le quiz après 10 s de simulation ──────────────────
let _quizPollId = null;
function quizStartPolling() {
  if (_quizPollId) return;
  _quizPollId = setInterval(() => {
    if (typeof simMode !== 'undefined' && simMode &&
        typeof simT   !== 'undefined' && simT >= 10 &&
        !quizState.started && !quizState.completed) {
      quizState.started = true;
      clearInterval(_quizPollId);
      quizShowQuestion();
    }
  }, 1000);
}

// ── Affiche la question courante ──────────────────────────────
function quizShowQuestion() {
  if (quizState.idx >= QUIZ_QUESTIONS.length) {
    quizFinish();
    return;
  }
  const q = QUIZ_QUESTIONS[quizState.idx];
  quizState.answered = false;

  // Mélange l'ordre d'affichage à chaque fois — la position (et donc la
  // longueur de la 1ère/dernière option) ne trahit plus la bonne réponse.
  const order = q.opts.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  quizState.order      = order;
  quizState.correctPos = order.indexOf(q.correct);

  document.getElementById('quizOverlay').style.display = '';
  document.getElementById('quizProgress').textContent =
    `${quizState.idx + 1} / ${QUIZ_QUESTIONS.length}`;
  document.getElementById('quizQ').textContent = q.q;
  document.getElementById('quizHint').style.display = 'none';
  document.getElementById('quizHint').textContent = '';

  const optsEl = document.getElementById('quizOpts');
  optsEl.innerHTML = order.map((origIdx, pos) =>
    `<button class="quiz-opt" onclick="quizAnswer(${pos})">${q.opts[origIdx]}</button>`
  ).join('');

  document.getElementById('quizScoreBar').style.display = '';
  document.getElementById('quizScoreEl').textContent = quizState.score;
}

// ── Traitement de la réponse ─────────────────────────────────
function quizAnswer(pos) {
  if (quizState.answered) return;
  quizState.answered = true;

  const q       = QUIZ_QUESTIONS[quizState.idx];
  const correct = pos === quizState.correctPos;
  if (correct) quizState.score += 20;

  // Colorise les boutons
  const btns = document.querySelectorAll('.quiz-opt');
  btns.forEach((b, i) => {
    b.disabled = true;
    if (i === quizState.correctPos) b.classList.add('quiz-opt-correct');
    else if (i === pos && !correct) b.classList.add('quiz-opt-wrong');
  });

  // Affiche l'explication
  const hintEl = document.getElementById('quizHint');
  hintEl.textContent = (correct ? '✅ ' : '❌ ') + q.hint;
  hintEl.style.display = '';
  hintEl.style.color   = correct ? 'var(--green)' : 'var(--red)';

  document.getElementById('quizScoreEl').textContent = quizState.score;

  // Passe à la question suivante après 4 s
  quizState.idx++;
  setTimeout(quizShowQuestion, 4500);
}

// ── Ouverture manuelle (bouton "🎓 Quiz") ──────────────────────
// Rouvre le quiz en cours, ou en démarre un nouveau si déjà terminé.
let _quizCloseTimer = null;

function quizToggleOpen() {
  const overlay = document.getElementById('quizOverlay');
  const hidden  = overlay.style.display === 'none';

  if (!hidden) { overlay.style.display = 'none'; return; }

  clearTimeout(_quizCloseTimer);
  if (quizState.completed) {
    quizState.idx       = 0;
    quizState.score     = 0;
    quizState.completed = false;
    document.getElementById('quizFinishMsg').style.display = 'none';
  }
  quizState.started = true;
  quizShowQuestion();
}

// ── Fin du quiz ───────────────────────────────────────────────
async function quizFinish() {
  quizState.completed = true;
  document.getElementById('quizQ').textContent = '🎉 Quiz terminé !';
  document.getElementById('quizOpts').innerHTML = '';
  document.getElementById('quizHint').style.display = 'none';
  document.getElementById('quizProgress').textContent = 'Terminé';

  const total = quizState.score;
  document.getElementById('quizScoreEl').textContent = total;

  const msg = document.getElementById('quizFinishMsg');
  msg.style.display = '';
  msg.textContent = total === 100 ? '🏆 Score parfait — expert ROS !'
    : total >= 60 ? `💪 ${total}/100 pts — bon travail !`
    : `📚 ${total}/100 pts — relis les explications !`;

  // Enregistre en DB si meilleur score
  if (total > quizState.bestDb) {
    quizState.bestDb = total;
    try {
      const user = Auth.getCurrentUser();
      if (user) await Auth.updateScore(user.username, 'dashboard', total);
    } catch (e) { /* silencieux */ }
  }

  // Ferme après 8 s (annulé si l'utilisateur relance le quiz entre-temps)
  clearTimeout(_quizCloseTimer);
  _quizCloseTimer = setTimeout(() => {
    document.getElementById('quizOverlay').style.display = 'none';
  }, 8000);
}

// ── Init : charge le score DB au démarrage ────────────────────
window.addEventListener('load', () => {
  Auth.init().then(() => {
    const user = Auth.getCurrentUser();
    if (user) quizState.bestDb = user.scores.dashboard || 0;
  }).catch(() => {});
  quizStartPolling();
});
