let lastT = null;

function loop(ts) {
  if (!lastT) lastT = ts;
  const dt = Math.min((ts - lastT) / 1000, .05);
  lastT = ts;

  if (simMode) simStep(dt);

  drawLidar();
  drawCamera(dt);
  drawOdom();
  drawGyro();
  drawCompass();
  updateDataUI();

  requestAnimationFrame(loop);
}

initCanvases();
setInterval(rotateExpl, 5000);
rotateExpl();
requestAnimationFrame(loop);
