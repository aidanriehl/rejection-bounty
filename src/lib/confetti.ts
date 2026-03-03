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
    });
    confetti({
      particleCount: 6,
      angle: 120,
      spread: 65,
      origin: { x: 1, y: 0.6 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

/** 5/10 Goal reached — screen-filling confetti storm */
export function fireBigConfetti() {
  const colors = ["#FFD700", "#FFA500", "#FF4500", "#6C5CE7", "#00B894", "#E17055", "#FF69B4"];
  confetti({
    particleCount: 150,
    spread: 360,
    origin: { x: 0.5, y: 0.4 },
    colors,
    startVelocity: 45,
    gravity: 0.8,
    ticks: 300,
  });
  const end = Date.now() + 1500;
  const frame = () => {
    confetti({
      particleCount: 8,
      angle: 60,
      spread: 80,
      origin: { x: 0, y: 0.5 },
      colors,
      startVelocity: 35,
    });
    confetti({
      particleCount: 8,
      angle: 120,
      spread: 80,
      origin: { x: 1, y: 0.5 },
      colors,
      startVelocity: 35,
    });
    confetti({
      particleCount: 4,
      angle: 90,
      spread: 120,
      origin: { x: 0.5, y: 0 },
      colors,
      startVelocity: 25,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

/** ULTRA 10/10 LEGEND — absolute screen destruction */
export function fireEpicConfetti() {
  const colors = ["#FFD700", "#FFA500", "#FF4500", "#FF0000", "#FF69B4", "#6C5CE7", "#00B894", "#FFFFFF"];

  // Massive initial starburst
  confetti({
    particleCount: 250,
    spread: 360,
    origin: { x: 0.5, y: 0.4 },
    colors,
    startVelocity: 55,
    gravity: 0.6,
    ticks: 400,
    scalar: 1.3,
  });

  // Delayed second burst
  setTimeout(() => {
    confetti({
      particleCount: 200,
      spread: 360,
      origin: { x: 0.5, y: 0.5 },
      colors,
      startVelocity: 50,
      gravity: 0.7,
      ticks: 350,
      scalar: 1.1,
    });
  }, 400);

  // Long-running multi-source cannons for 5 seconds
  const end = Date.now() + 2500;
  const frame = () => {
    // Left cannon
    confetti({ particleCount: 10, angle: 60, spread: 90, origin: { x: 0, y: 0.4 }, colors, startVelocity: 45 });
    // Right cannon
    confetti({ particleCount: 10, angle: 120, spread: 90, origin: { x: 1, y: 0.4 }, colors, startVelocity: 45 });
    // Top rain
    confetti({ particleCount: 6, angle: 90, spread: 160, origin: { x: 0.5, y: 0 }, colors, startVelocity: 30 });
    // Bottom-left
    confetti({ particleCount: 4, angle: 45, spread: 60, origin: { x: 0.1, y: 0.9 }, colors, startVelocity: 40 });
    // Bottom-right
    confetti({ particleCount: 4, angle: 135, spread: 60, origin: { x: 0.9, y: 0.9 }, colors, startVelocity: 40 });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}
