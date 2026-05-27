// ══ HANDBOOK — Guide complet ══

const HANDBOOK_SECTIONS = [
  {
    id: 'overview',
    label: 'Vue d\'ensemble',
    icon: '🤖',
    html: `<h3>BipBoup ROS Workstation</h3>
<p>Ce simulateur reproduit l'environnement de contrôle du robot <b>BipBoup</b> de l'équipe <b>3iL Ingénieurs</b> pour la <b>Coupe de France de Robotique 2026</b>.</p>

<h4>Qu'est-ce que ROS2 ?</h4>
<p><b>ROS2 (Robot Operating System 2)</b> est un framework open-source pour la robotique. Il fournit :</p>
<ul>
  <li><b>Topics</b> — canaux de données publish/subscribe</li>
  <li><b>Nodes</b> — processus indépendants communiquant via topics</li>
  <li><b>Services</b> — appels requête/réponse entre nodes</li>
  <li><b>Actions</b> — tâches longues avec feedback (navigation)</li>
  <li><b>TF2</b> — arbre de transformations spatiales</li>
</ul>

<h4>Architecture du robot BipBoup</h4>
<ul>
  <li><b>Base roulante</b> différentielle (2 roues motrices)</li>
  <li><b>RPLIDAR A2</b> — scan laser 360°, 10 Hz, portée 12m</li>
  <li><b>IMU + encodeurs</b> — odométrie, drift possible</li>
  <li><b>Raspberry Pi 4</b> — Ubuntu 22.04, ROS2 Humble</li>
</ul>

<h4>Ce simulateur reproduit</h4>
<ul>
  <li>Topics ROS2 avec valeurs dynamiques et bruit réaliste</li>
  <li>Physique robot (collision, cinématique différentielle)</li>
  <li>LiDAR avec raycast et bruit gaussien</li>
  <li>Dérive odométrique cumulative</li>
  <li>Navigation autonome (contrôleur P cap + vitesse)</li>
  <li>Système de mission et scoring Coupe de France</li>
</ul>`,
  },
  {
    id: 'arena',
    label: 'L\'arène 2026',
    icon: '🌿',
    html: `<h3>Arène — Jardins Partagés 2026</h3>
<p>Dimensions réelles : <b>300 × 200 cm</b>. Deux équipes s'affrontent simultanément, chacune sur sa moitié de terrain.</p>

<h4>Zones</h4>
<ul>
  <li><b>Zone bleue (x: 0–60)</b> — départ équipe bleue (ton équipe)</li>
  <li><b>Zone rouge (x: 240–300)</b> — départ équipe rouge (adversaire)</li>
  <li><b>Zone centrale</b> — terrain partagé, accès libre</li>
</ul>

<h4>Objectifs et scoring</h4>
<table>
  <tr><th>Objectif</th><th>Position</th><th>Points</th></tr>
  <tr><td>🌱 Plante 1</td><td>(80, 60)</td><td>10 pts</td></tr>
  <tr><td>🌱 Plante 2</td><td>(220, 60)</td><td>10 pts</td></tr>
  <tr><td>🌱 Plante 3</td><td>(80, 140)</td><td>10 pts</td></tr>
  <tr><td>🌱 Plante 4</td><td>(220, 140)</td><td>10 pts</td></tr>
  <tr><td>🍽 Garde-manger</td><td>(270, 100)</td><td>25 pts</td></tr>
</table>
<p><b>Score maximum simulateur : 70 pts</b> (missions + objectifs)</p>

<h4>Obstacles</h4>
<ul>
  <li><b>Bacs A–C</b> — rangée du haut (y ≈ 20)</li>
  <li><b>Bacs D–F</b> — rangée du bas (y ≈ 165)</li>
  <li><b>Mur central</b> — obstacle central (x:140, y:80)</li>
</ul>

<h4>Durée du match</h4>
<p><b>100 secondes</b>. Le robot doit marquer un maximum de points avant la fin du chrono. L'arrêt d'urgence coupe le mouvement instantanément.`,
  },
  {
    id: 'commands',
    label: 'Commandes',
    icon: '>_',
    html: `<h3>Référence des commandes</h3>

<h4>Démarrage</h4>
<ul>
  <li><code>ros2 launch bipboup robot.launch.py</code> — démarre nav2 + stratégie</li>
  <li><code>estop off</code> — relâche l'arrêt d'urgence</li>
  <li><code>estop on</code> — active l'arrêt d'urgence</li>
</ul>

<h4>Pilotage manuel</h4>
<ul>
  <li><code>teleop</code> — active/désactive le pilotage clavier</li>
  <li class="indent">Z/↑ avancer · S/↓ reculer · Q/← gauche · D/→ droite · Espace stop</li>
  <li><code>cmd_vel &lt;lin&gt; &lt;ang&gt;</code> — commande directe (ex: <code>cmd_vel 0.5 0.0</code>)</li>
  <li><code>ros2 topic pub /cmd_vel geometry_msgs/msg/Twist "{linear: {x: 0.5}, angular: {z: 0.0}}"</code></li>
</ul>

<h4>Navigation autonome</h4>
<ul>
  <li><code>nav_to &lt;x&gt; &lt;y&gt;</code> — navigation vers des coordonnées arène</li>
  <li class="indent">Survole la carte pour voir les coords en temps réel</li>
  <li class="indent">Ex : <code>nav_to 80 60</code> · <code>nav_to 270 100</code> · <code>nav_to 150 100</code></li>
  <li><code>auto_collect</code> — collecte automatique de toutes les plantes + garde-manger</li>
  <li><code>nav_stop</code> — arrêter la navigation en cours</li>
  <li><b>Clic sur l'arène</b> — envoie un nav_to aux coordonnées cliquées</li>
</ul>

<h4>Scripts</h4>
<ul>
  <li><code>scripts</code> — ouvrir l'éditeur de scripts</li>
  <li><code>ros2 run bipboup run_script "&lt;séquence&gt;"</code></li>
  <li><code>ros2 run bipboup run_script "tour_de_jardin"</code> — script prédéfini</li>
  <li><code>stop_script</code> — interrompre le script en cours</li>
</ul>

<h4>Match</h4>
<ul>
  <li><code>ros2 run bipboup start_match</code> — lancer le chrono (100s)</li>
</ul>

<h4>Diagnostic</h4>
<ul>
  <li><code>ros2 topic list</code> — liste tous les topics</li>
  <li><code>ros2 topic echo /scan</code> — afficher données LiDAR</li>
  <li><code>ros2 topic echo /odom</code> — afficher odométrie</li>
  <li><code>ros2 topic hz /scan</code> — fréquence du topic scan</li>
  <li><code>ros2 node list</code> — liste des nodes actifs</li>
</ul>

<h4>Utilitaires</h4>
<ul>
  <li><code>help</code> — aide complète dans le terminal</li>
  <li><code>clear</code> — vider le terminal</li>
</ul>`,
  },
  {
    id: 'navigation',
    label: 'Navigation & Scripts',
    icon: '🧭',
    html: `<h3>Navigation autonome</h3>

<h4>Comment fonctionne nav_to</h4>
<p>La commande <code>nav_to</code> simule l'action ROS2 <code>NavigateToPose</code> de Nav2. Le robot utilise un <b>contrôleur proportionnel</b> :</p>
<ol>
  <li>Calcule l'angle vers le goal : <code>atan2(ty-y, tx-x)</code></li>
  <li>Tourne pour s'aligner (angular velocity ∝ angle_diff)</li>
  <li>Avance quand aligné (vitesse ∝ distance, max 0.8 m/s)</li>
  <li>S'arrête quand distance &lt; 10 unités du goal</li>
</ol>

<h4>Obstacle avoidance</h4>
<p>Lookahead raycast de 28 unités devant le robot :</p>
<ul>
  <li>Si obstacle détecté → <b>freinage progressif</b> (vitesse ∝ clearance)</li>
  <li>Si obstacle très proche (&lt;14u) → <b>déviation latérale</b> automatique</li>
  <li>Message <code>[nav2] Obstacle détecté</code> dans le terminal</li>
</ul>

<h4>Scripts séquentiels</h4>
<p>Le système de scripts exécute des commandes en séquence, en <b>attendant la fin de chaque nav_to</b> avant de passer à la suivante.</p>

<h4>Syntaxe des scripts</h4>
<ul>
  <li><code>nav_to &lt;x&gt; &lt;y&gt;</code> — navigation vers coordonnées (attend l'arrivée)</li>
  <li><code>wait &lt;secondes&gt;</code> — pause (ex: <code>wait 1.5</code>)</li>
  <li><code>cmd_vel &lt;lin&gt; &lt;ang&gt;</code> — commande directe</li>
  <li><code>estop off / estop on</code></li>
  <li><code># commentaire</code> — lignes ignorées</li>
  <li><code>call &lt;nom_script&gt;</code> — appelle un script prédéfini depuis un autre script</li>
</ul>

<h4>Appel de scripts entre eux</h4>
<p>Un script peut en appeler un autre avec <code>call</code>. Les lignes du script appelé sont injectées à la position courante — l'exécution est séquentielle, pas parallèle.</p>
<pre>
# Script principal
nav_to centre
call rush_gardemanger   ← exécute rush_gardemanger ici
nav_to depart
</pre>

<h4>Scripts prédéfinis</h4>
<ul>
  <li><b>tour_de_jardin</b> — (80,60) → (220,60) → (80,140) → (220,140) → (270,100)</li>
  <li><b>rush_gardemanger</b> — (150,100) → (270,100) direct, priorité haute valeur</li>
  <li><b>zigzag</b> — exploration en zigzag (bonne couverture terrain)</li>
  <li><b>demo_timed</b> — collecte avec pauses (démo réaliste)</li>
</ul>

<h4>Écrire son propre script</h4>
<p>Dans l'éditeur (bouton <b>Scripts</b>) :</p>
<pre>
# Mon script personnalisé
# Survole l'arène pour obtenir les coordonnées
nav_to 80 60
wait 0.5
nav_to 80 140
nav_to 270 100
</pre>`,
  },
  {
    id: 'data',
    label: 'Topics & Nodes',
    icon: '📡',
    html: `<h3>Comprendre les données ROS2</h3>

<h4>Topics — Valeurs importantes</h4>
<ul>
  <li><b>/scan</b> <small>(sensor_msgs/LaserScan)</small><br>
  <code>ranges[]</code> : tableau de distances en mètres pour chaque angle. Valeur &gt; 12 = pas d'obstacle détecté. Le bruit (±0.08) simule les imperfections du capteur.</li>
  <li><b>/odom</b> <small>(nav_msgs/Odometry)</small><br>
  <code>pose.position.x/y</code> : position estimée. <code>drift</code> : erreur accumulée. En vrai, la dérive augmente avec la distance parcourue.</li>
  <li><b>/cmd_vel</b> <small>(geometry_msgs/Twist)</small><br>
  <code>linear.x</code> : vitesse avant/arrière (m/s). <code>angular.z</code> : vitesse de rotation (rad/s). Le robot différentiel convertit ça en vitesses de roues.</li>
  <li><b>/tf</b> <small>(tf2_msgs/TFMessage)</small><br>
  Transformations entre frames : <code>map</code> → <code>odom</code> → <code>base_link</code>. Le drift montre l'écart entre position carte et position odométrie.</li>
</ul>

<h4>Nodes — Rôles détaillés</h4>
<ul>
  <li><b>robot_state_publisher</b> — lit la description URDF du robot et publie les TF des joints. Toujours actif.</li>
  <li><b>lidar_driver</b> — communique avec le RPLIDAR physique (ou simule les scans). Publie /scan à 10 Hz.</li>
  <li><b>nav2_bringup</b> — lance tout le stack Nav2 : global/local planner, costmaps, behavior tree. Nécessaire pour navigation autonome.</li>
  <li><b>bipboup_strategy</b> — node spécifique à l'équipe : décide quels objectifs viser, dans quel ordre, avec quelle priorité.</li>
  <li><b>rosbridge_server</b> — expose ROS2 via WebSocket (port 9090) pour interfaces web comme celle-ci.</li>
</ul>

<h4>Interpréter le ROS Log</h4>
<ul>
  <li><b>DEBUG désactivé par défaut</b> — active-le pour voir la position et l'état interne à chaque tick.</li>
  <li><b>WARN batterie &lt;20%</b> — dans la réalité, cela déclencherait un comportement de retour à la base.</li>
  <li><b>WARN odom drift &gt;0.5m</b> — signifie que la localisation s'est dégradée, un recalage SLAM serait nécessaire.</li>
</ul>`,
  },
  {
    id: 'tips',
    label: 'Astuces & Stratégie',
    icon: '💡',
    html: `<h3>Astuces et stratégie de match</h3>

<h4>Stratégie optimale</h4>
<ol>
  <li><b>Démarrer vite</b> — les 2 premières étapes (launch + estop) ne coûtent pas de temps de match. Fais-les avant <code>start_match</code>.</li>
  <li><b>auto_collect avant start_match</b> — lance <code>auto_collect</code> pour commencer à naviguer, puis <code>start_match</code> dès que le robot bouge.</li>
  <li><b>Priorité garde-manger</b> — 25 pts d'un coup. Le script <code>rush_gardemanger</code> y va directement.</li>
  <li><b>Plantes en chemin</b> — le <code>tour_de_jardin</code> optimise le parcours pour tout récupérer.</li>
</ol>

<h4>Comprendre la dérive odométrique</h4>
<p>La dérive (<code>odomDrift</code>) augmente avec le temps et les rotations. Dans le simulateur :</p>
<ul>
  <li>Elle s'accumule à chaque tick physique</li>
  <li>Visible dans la traînée violette RViz (s'écarte de la vraie position)</li>
  <li>Déclenche un WARN dans le ROS Log quand &gt;0.5m</li>
  <li>Dans un vrai robot : AMCL (Monte Carlo Localization) recalerait la position</li>
</ul>

<h4>Utiliser l'éditeur de scripts</h4>
<ul>
  <li>Le script attend la fin de chaque <code>nav_to</code> — l'ordre des commandes est garanti</li>
  <li>Ajoute des <code>wait 0.5</code> entre les nav_to pour laisser le robot stabiliser sa position</li>
  <li>Commente ton script avec <code>#</code> pour te souvenir de ta logique</li>
  <li>Teste d'abord sans le match, puis relance avec <code>start_match</code></li>
</ul>

<h4>Mode téléop</h4>
<ul>
  <li>Tape <code>teleop</code> puis <b>clique en dehors du terminal</b> pour capturer les touches</li>
  <li>Espace = stop immédiat</li>
  <li>Un clic sur l'arène désactive le téléop et envoie un nav_to</li>
  <li>Retape <code>teleop</code> pour revenir en mode clavier</li>
</ul>

<h4>Débogage</h4>
<ul>
  <li>Active le filtre <b>DEBUG</b> dans le ROS Log pour voir la position à chaque tick</li>
  <li><code>ros2 topic echo /odom</code> pour vérifier la position brute</li>
  <li><code>ros2 topic hz /scan</code> pour vérifier que le LiDAR tourne bien</li>
  <li>Si le robot se bloque, vérifie l'E-STOP et les nodes actifs</li>
</ul>`,
  },
];

let _hbSection = 0;

function openHandbook() {
  document.getElementById('handbookPanel').style.display = 'flex';
  _renderHandbook(0);
}

function closeHandbook() {
  document.getElementById('handbookPanel').style.display = 'none';
}

function _renderHandbook(idx) {
  _hbSection = idx;
  const section = HANDBOOK_SECTIONS[idx];

  // Contenu
  document.getElementById('hbContent').innerHTML = section.html;

  // Nav sidebar — marque actif
  document.querySelectorAll('.hb-nav-item').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });
}

function initHandbook() {
  const nav = document.getElementById('hbNav');
  HANDBOOK_SECTIONS.forEach((s, i) => {
    const btn = document.createElement('div');
    btn.className = 'hb-nav-item' + (i === 0 ? ' active' : '');
    btn.innerHTML = `<span class="hb-nav-icon">${s.icon}</span><span>${s.label}</span>`;
    btn.onclick = () => _renderHandbook(i);
    nav.appendChild(btn);
  });
}
