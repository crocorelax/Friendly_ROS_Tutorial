// ══ TUTORIAL ══

const TUTORIAL_STEPS = [
  {
    target: null,
    title: '👋 Bienvenue dans BipBoup ROS Workstation',
    html: `Simulateur ROS2 pour la <b>Coupe de France de Robotique 2026</b> — équipe BipBoup (3iL Ingénieurs).<br><br>
Ce simulateur reproduit fidèlement l'interface de contrôle d'un vrai robot ROS2 : topics live, vue RViz2, arène officielle, terminal interactif, navigation autonome et scripts.<br><br>
Clique sur <b>Suivant →</b> pour découvrir chaque zone.`,
  },
  {
    target: '#topicsList',
    title: '📡 Topics ROS2',
    html: `Un <b>topic</b> est un canal de données entre nodes (pattern publish/subscribe). Les valeurs se mettent à jour en temps réel.<br><br>
<code>/scan</code> — LiDAR : distances aux obstacles (360°, bruit simulé)<br>
<code>/cmd_vel</code> — commande de vitesse (linear.x, angular.z)<br>
<code>/odom</code> — position estimée par odométrie (avec dérive!)<br>
<code>/battery_state</code> — niveau de batterie du robot<br>
<code>/tf</code> — arbre de transformations map→odom→base_link<br>
<code>/estop</code> — arrêt d'urgence (true = robot immobilisé)<br><br>
Clique sur un topic pour le sélectionner et suivre sa valeur.`,
  },
  {
    target: '#nodesList',
    title: '⚙️ Nodes actifs',
    html: `Un <b>node</b> est un processus ROS2 indépendant avec une responsabilité précise.<br><br>
🟢 <b>robot_state_publisher</b> — publie la géométrie du robot (TF tree)<br>
🟢 <b>lidar_driver</b> — driver du RPLIDAR A2 (10 Hz, 90 rayons simulés)<br>
🔴 <b>nav2_bringup</b> — stack de navigation (costmap, path planning)<br>
🔴 <b>bipboup_strategy</b> — logique de match et décision autonome<br>
🟢 <b>rosbridge_server</b> — pont WebSocket vers l'interface<br><br>
🔴 = non démarré → lance <code>ros2 launch bipboup robot.launch.py</code>`,
  },
  {
    target: '#rvizCanvas',
    title: '🗺️ RViz2 — Vue capteurs',
    html: `Visualisation en temps réel des données capteurs, comme RViz dans ROS2.<br><br>
<span style="color:#00d68f">●</span> <b>Points verts</b> — scan LiDAR : un point par rayon, bruit ±${0.08} simulé<br>
<span style="color:#a78bfa">─</span> <b>Traînée violette</b> — historique odométrie (dérive accumulée visible)<br>
<span style="color:#38bdf8">□</span> <b>Contours bleus</b> — carte obstacles (occupancy grid)<br>
<span style="color:#38bdf8">▣</span> <b>Robot</b> — position + flèche direction de déplacement<br>
<span style="color:#f97316">✕</span> <b>Marqueur orange</b> — goal de navigation en cours<br><br>
Les <b>boutons LiDAR / Odom / Carte / Robot</b> activent/désactivent chaque couche.`,
    targetPad: 4,
  },
  {
    target: '#arenaCanvas',
    title: '🌿 Arène — Coupe de France 2026',
    html: `Vue de dessus de l'arène officielle — thème <b>Jardins Partagés</b> — 3m × 2m.<br><br>
🌱 <b>Plantes ×4</b> — 10 pts chacune, à approcher avec le robot<br>
🍽 <b>Garde-manger</b> — 25 pts, objectif haute valeur (côté droit)<br>
🔵 <b>Zone bleue</b> — départ de ton équipe (gauche)<br>
🔴 <b>Zone rouge</b> — départ adversaire (droite)<br>
⬜ <b>Bacs A–F + mur central</b> — obstacles à éviter<br><br>
💡 <b>Clique directement sur l'arène</b> pour envoyer le robot à cet endroit — un <code>nav_to</code> est envoyé automatiquement !`,
  },
  {
    target: '#termPane',
    title: '> Terminal ROS2',
    html: `Interface de commande interactive pour piloter le robot.<br><br>
<b>Tab</b> → autocomplétion &nbsp;·&nbsp; <b>↑↓</b> → historique<br><br>
<b>Démarrage :</b><br>
<code>ros2 launch bipboup robot.launch.py</code><br>
<code>estop off</code><br><br>
<b>Pilotage :</b><br>
<code>teleop</code> — clavier ZQSD / flèches<br>
<code>nav_to 80 60</code> — navigation autonome (survole arène pour coords)<br>
<code>auto_collect</code> — collecte automatique<br>
<code>scripts</code> — éditeur de scripts séquentiels<br><br>
Tape <code>help</code> pour la référence complète.`,
  },
  {
    target: '#logPane',
    title: '📋 ROS Log',
    html: `Messages générés par les nodes en temps réel, comme <code>ros2 topic echo /rosout</code>.<br><br>
<span style="color:#22d3ee"><b>INFO</b></span> — opérations normales (scan OK, goal atteint…)<br>
<span style="color:#eab308"><b>WARN</b></span> — avertissements (batterie faible, dérive odométrie…)<br>
<span style="color:#ef4444"><b>ERROR</b></span> — erreurs critiques (LOW_BATTERY, ODOM_DRIFT…)<br>
<span style="color:#4a5568"><b>DEBUG</b></span> — état interne verbose (position, mode stratégie…)<br><br>
Les <b>boutons filtres</b> activent/désactivent chaque niveau. DEBUG est désactivé par défaut (très verbeux).`,
  },
  {
    target: '.rviz-toolbar',
    title: '🎛️ Barres d\'outils',
    html: `<b>Toolbar RViz :</b><br>
<b>LiDAR</b> — affiche/masque le scan laser<br>
<b>Odom</b> — affiche/masque la traînée odométrie<br>
<b>Carte</b> — affiche/masque les obstacles sur la carte<br>
<b>Robot</b> — affiche/masque le modèle du robot<br>
<b>Reset vue</b> — remet le robot à sa position initiale<br><br>
<b>Bouton Scripts</b> (terminal) : ouvre l'éditeur de scripts séquentiels.<br>
<b>💡 / 🏆</b> (barre titre) : tutoriel et guide complet.`,
  },
  {
    target: null,
    title: '🚀 Démarrage rapide — 4 étapes',
    html: `<b>Étape 1</b> <small style="color:var(--muted)">— démarrer les nodes</small><br>
<code>ros2 launch bipboup robot.launch.py</code><br><br>
<b>Étape 2</b> <small style="color:var(--muted)">— relâcher l'arrêt d'urgence</small><br>
<code>estop off</code><br><br>
<b>Étape 3</b> <small style="color:var(--muted)">— choisir un mode de pilotage</small><br>
<code>teleop</code> &nbsp;·&nbsp; <code>auto_collect</code> &nbsp;·&nbsp; clic arène<br><br>
<b>Étape 4</b> <small style="color:var(--muted)">— lancer le match (100 secondes)</small><br>
<code>ros2 run bipboup start_match</code><br><br>
<span style="color:var(--green)">Bonne chance ! 🏆</span> &nbsp;·&nbsp; <span style="color:var(--muted)">Consulte le guide 🏆 pour plus de détails.</span>`,
  },
];

// ══ STATE ══
let _tutStep  = 0;
let _tutActive = false;

// ══ PUBLIC API ══

function startTutorial() {
  _tutStep  = 0;
  _tutActive = true;
  _renderStep();
}

function closeTutorial() {
  _tutActive = false;
  document.getElementById('tutSpotlight').style.display = 'none';
  document.getElementById('tutCard').style.display      = 'none';
  document.getElementById('tutOverlay').style.display   = 'none';
}

function nextTutStep() {
  if (_tutStep < TUTORIAL_STEPS.length - 1) { _tutStep++; _renderStep(); }
  else closeTutorial();
}

function prevTutStep() {
  if (_tutStep > 0) { _tutStep--; _renderStep(); }
}

// ══ RENDER ══

function _renderStep() {
  const step     = TUTORIAL_STEPS[_tutStep];
  const overlay  = document.getElementById('tutOverlay');
  const spotlight= document.getElementById('tutSpotlight');
  const card     = document.getElementById('tutCard');

  overlay.style.display   = 'block';
  spotlight.style.display = 'block';
  card.style.display      = 'flex';

  // Contenu de la card
  card.querySelector('.tut-title').textContent  = step.title;
  card.querySelector('.tut-body').innerHTML     = step.html;
  card.querySelector('.tut-prev').disabled      = _tutStep === 0;
  const nextBtn = card.querySelector('.tut-next');
  nextBtn.textContent = _tutStep === TUTORIAL_STEPS.length - 1 ? 'Terminer ✓' : 'Suivant →';

  // Compteur
  card.querySelector('.tut-counter').textContent = `${_tutStep + 1} / ${TUTORIAL_STEPS.length}`;

  if (!step.target) {
    // Pas de spotlight — card centrée
    spotlight.style.cssText = 'display:none';
    _centerCard(card);
  } else {
    const el = document.querySelector(step.target);
    if (!el) { nextTutStep(); return; }
    const pad = step.targetPad || 6;
    const r   = el.getBoundingClientRect();
    spotlight.style.cssText = `
      display:block;
      left:${r.left - pad}px; top:${r.top - pad}px;
      width:${r.width + pad*2}px; height:${r.height + pad*2}px;
    `;
    // Forcer un reflow pour que la card connaisse sa taille réelle
    card.style.visibility = 'hidden';
    card.style.display = 'flex';
    requestAnimationFrame(() => {
      _positionCard(card, {
        left: r.left - pad, top: r.top - pad,
        right: r.right + pad, bottom: r.bottom + pad,
        width: r.width + pad*2, height: r.height + pad*2,
      });
      card.style.visibility = 'visible';
    });
  }
}

function _centerCard(card) {
  card.style.left      = '50%';
  card.style.top       = '50%';
  card.style.transform = 'translate(-50%,-50%)';
  card.style.visibility= 'visible';
}

function _positionCard(card, sr) {
  card.style.transform = 'none';
  const cw = card.offsetWidth, ch = card.offsetHeight;
  const vw = window.innerWidth,  vh = window.innerHeight;
  const gap = 14;

  let left, top;

  // Ordre de préférence : bas → droite → haut → gauche
  if (sr.bottom + ch + gap < vh) {
    top  = sr.bottom + gap;
    left = Math.max(gap, Math.min(vw - cw - gap, sr.left));
  } else if (sr.right + cw + gap < vw) {
    left = sr.right + gap;
    top  = Math.max(gap, Math.min(vh - ch - gap, sr.top));
  } else if (sr.top - ch - gap > 0) {
    top  = sr.top - ch - gap;
    left = Math.max(gap, Math.min(vw - cw - gap, sr.left));
  } else {
    left = Math.max(gap, sr.left - cw - gap);
    top  = Math.max(gap, Math.min(vh - ch - gap, sr.top));
  }

  card.style.left = left + 'px';
  card.style.top  = top  + 'px';
}
