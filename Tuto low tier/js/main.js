// ════════════════════════════════════════════
// INITIALISATION GLOBALE
// ════════════════════════════════════════════

function loadDefaultMap() {
  mapData.walls = new Set();
  mapData.goals = [];
  mapData.spawn = {col:6, row:10};

  const walls = [
    [1,1],[2,1],[3,1],[4,1],[7,1],[8,1],[9,1],[10,1],[13,1],[14,1],[15,1],
    [1,3],[1,4],[1,5],[1,7],[1,8],
    [15,3],[15,4],[15,5],[15,7],[15,8],
    [4,4],[5,4],[4,5],[10,4],[11,4],[11,5],
    [6,7],[7,7],[9,7],[10,7],
    [2,9],[3,9],[13,9],[14,9],
    [5,11],[6,11],[10,11],[11,11],
    [4,13],[5,13],[6,13],[10,13],[11,13],[12,13],
  ];
  walls.forEach(([c,r]) => mapData.walls.add(`${c},${r}`));
  mapData.goals = [
    {col:14, row:2,  done:false},
    {col:14, row:9,  done:false},
    {col:2,  row:13, done:false},
  ];
}

// Keyframe shake injectée dynamiquement
const _shakeStyle = document.createElement('style');
_shakeStyle.textContent = `
@keyframes shake{
  0%,100%{transform:translate(0,0)}
  20%{transform:translate(-4px,1px)}
  40%{transform:translate(4px,-1px)}
  60%{transform:translate(-2px,0)}
  80%{transform:translate(2px,1px)}
}`;
document.head.appendChild(_shakeStyle);

loadDefaultMap();
updateMenuCards();

window.addEventListener('resize', () => {
  if (document.getElementById('editorScreen').classList.contains('active')) initEditor();
  else if (document.getElementById('gameScreen').classList.contains('active'))   initGame(currentLevel);
});
