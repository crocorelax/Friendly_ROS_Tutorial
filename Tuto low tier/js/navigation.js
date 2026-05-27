// ════════════════════════════════════════════
// NAVIGATION ENTRE ÉCRANS
// ════════════════════════════════════════════

function goMenu() {
  stopFlag = true;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('menuScreen').classList.add('active');
  updateMenuCards();
}

function startEditor() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('editorScreen').classList.add('active');
  initEditor();
}

function startLevel(n) {
  if (n > getUnlockedLevel()) {
    _showMenuNotif(`🔒 Termine le niveau ${n - 1} d'abord !`);
    return;
  }
  currentLevel = n;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('gameScreen').classList.add('active');
  initGame(n);
}

function testMap() { startLevel(1); }
