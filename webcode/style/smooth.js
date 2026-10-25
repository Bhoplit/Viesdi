// Змейка, которая ест баги (404.html)
const cv = document.getElementById("game"),
  cx = cv.getContext("2d"),
  N = 20,
  S = cv.width / N;
let snake,
  dir,
  next,
  bug,
  score,
  over,
  last = 0;
const css = (n) => getComputedStyle(document.body).getPropertyValue(n).trim();
const rnd = () => {
  let p;
  do p = { x: (Math.random() * N) | 0, y: (Math.random() * N) | 0 };
  while (snake.some((s) => s.x === p.x && s.y === p.y));
  return p;
};
function reset() {
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];
  dir = next = { x: 1, y: 0 };
  score = 0;
  over = false;
  bug = rnd();
  document.getElementById("sc").textContent = 0;
}
function step() {
  dir = next;
  const h = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  if (
    h.x < 0 ||
    h.y < 0 ||
    h.x >= N ||
    h.y >= N ||
    snake.some((s) => s.x === h.x && s.y === h.y)
  ) {
    over = true;
    return;
  }
  snake.unshift(h);
  if (h.x === bug.x && h.y === bug.y) {
    document.getElementById("sc").textContent = ++score;
    bug = rnd();
  } else snake.pop();
}
function draw() {
  const fg = css("--fg") || "#fff",
    bg = css("--bg") || "#000";
  cx.fillStyle = bg;
  cx.fillRect(0, 0, cv.width, cv.height);
  cx.fillStyle = fg;
  snake.forEach((s) => cx.fillRect(s.x * S + 1, s.y * S + 1, S - 2, S - 2));
  cx.font = `bold ${S}px monospace`;
  cx.textAlign = "center";
  cx.textBaseline = "middle";
  cx.fillText("Ж", bug.x * S + S / 2, bug.y * S + S / 2 + 1);
  if (over) {
    cx.font = "bold 28px monospace";
    cx.fillText("GAME OVER", cv.width / 2, cv.height / 2);
  }
}
function loop(t) {
  if (!over && t - last > 110) {
    last = t;
    step();
  }
  draw();
  requestAnimationFrame(loop);
}
addEventListener("keydown", (e) => {
  const k = {
    ArrowUp: [0, -1],
    w: [0, -1],
    ArrowDown: [0, 1],
    s: [0, 1],
    ArrowLeft: [-1, 0],
    a: [-1, 0],
    ArrowRight: [1, 0],
    d: [1, 0],
  }[e.key];
  if (k) {
    e.preventDefault();
    if (k[0] !== -dir.x || k[1] !== -dir.y) next = { x: k[0], y: k[1] };
  }
  if (e.key === "Enter") reset();
});
reset();
requestAnimationFrame(loop);
