import confetti from 'canvas-confetti'

export function fireWinConfetti() {
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.55 },
    colors: ['#e6ab35', '#4A6741', '#fefcf8', '#D4A853', '#8B6914'],
    gravity: 0.9,
    scalar: 1.1,
  })
}
