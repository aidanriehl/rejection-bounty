import confetti from "canvas-confetti";

/** Single task completion — side cannons burst */
export function fireConfetti() {
  const colors = ["#6C5CE7", "#00B894", "#FDCB6E", "#E17055", "#74B9FF", "#FFD700"];
  const end = Date.now() + 700;
  const frame = () => {
    confetti({
      particleCount: 6,
      angle: 60,
      spread: 65,
      origin: { x: 0, y: 0.6 },
      colors,
      ticks: 120,
    });
    confetti({
      particleCount: 6,
      angle: 120,
      spread: 65,
      origin: { x: 1, y: 0.6 },
      colors,
      ticks: 120,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

/** 5+ Goal reached — bigger confetti burst (only ~0.3s longer than regular) */
export function fireBigConfetti() {
  const colors = ["#6C5CE7", "#00B894", "#FDCB6E", "#74B9FF", "#FFD700", "#A29BFE", "#FF6B6B", "#FF9FF3", "#F368E0", "#FF9F43"];
  confetti({
    particleCount: 100,
    spread: 360,
    origin: { x: 0.5, y: 0.4 },
    colors,
    startVelocity: 40,
    gravity: 0.9,
    ticks: 140,
  });
  const end = Date.now() + 700;
  const frame = () => {
    confetti({
      particleCount: 6,
      angle: 60,
      spread: 80,
      origin: { x: 0, y: 0.5 },
      colors,
      startVelocity: 35,
      ticks: 140,
    });
    confetti({
      particleCount: 6,
      angle: 120,
      spread: 80,
      origin: { x: 1, y: 0.5 },
      colors,
      startVelocity: 35,
      ticks: 140,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

/** ULTRA 8/8 LEGEND — royal confetti explosion */
export function fireEpicConfetti() {
  const colors = ["#6C5CE7", "#00B894", "#FDCB6E", "#74B9FF", "#FFD700", "#A29BFE", "#55EFC4"];

  // Massive initial starburst
  confetti({
    particleCount: 200,
    spread: 360,
    origin: { x: 0.5, y: 0.4 },
    colors,
    startVelocity: 50,
    gravity: 0.8,
    ticks: 180,
    scalar: 1.2,
  });

  // Delayed second burst
  setTimeout(() => {
    confetti({
      particleCount: 150,
      spread: 360,
      origin: { x: 0.5, y: 0.5 },
      colors,
      startVelocity: 45,
      gravity: 0.8,
      ticks: 150,
      scalar: 1.1,
    });
  }, 300);

  // Multi-source cannons for 2 seconds
  const end = Date.now() + 2000;
  const frame = () => {
    confetti({ particleCount: 8, angle: 60, spread: 90, origin: { x: 0, y: 0.4 }, colors, startVelocity: 40, ticks: 120 });
    confetti({ particleCount: 8, angle: 120, spread: 90, origin: { x: 1, y: 0.4 }, colors, startVelocity: 40, ticks: 120 });
    confetti({ particleCount: 4, angle: 90, spread: 160, origin: { x: 0.5, y: 0 }, colors, startVelocity: 25, ticks: 120 });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}
