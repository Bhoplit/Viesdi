const $ = (s) => document.querySelector(s);

/* ---------- приветствие ---------- */
const splash = $("#splash");
const logo = $(".logo");
logo.innerHTML = [...logo.textContent].map((c) => `<span>${c}</span>`).join("");

splash.addEventListener("pointermove", (e) => {
  splash.style.setProperty("--x", e.clientX + "px");
  splash.style.setProperty("--y", e.clientY + "px");
});

let entered = false;
function enter() {
  if (entered) return;
  entered = true;
  splash.classList.add("fold"); // скручиваем в кружок
  setTimeout(() => {
    // кружок исчезает
    splash.classList.add("gone");
    document.body.classList.remove("lock");
    typeCode();
  }, 950);
  setTimeout(() => splash.remove(), 1500);
}
splash.addEventListener("click", enter);
splash.addEventListener("keydown", (e) => {
  if (e.key === "Enter") enter();
});
splash.focus();

/* ---------- печать кода в терминале ---------- */
function typeCode() {
  const out = $("#term");
  const full = [
    "$ viesdi start",
    "> html: строим скелет",
    "<h1>Привет, мир!</h1>",
    "> css: делаем красиво",
    "h1 { color: white; }",
    "> js: оживляем",
    'console.log("gg ez");',
    "> готово. поехали",
  ].join("\n");
  const t0 = performance.now(),
    cps = 36;
  (function frame(now) {
    const n = Math.min(full.length, Math.floor(((now - t0) / 1000) * cps));
    out.textContent = full.slice(0, n);
    if (n < full.length) requestAnimationFrame(frame);
  })(t0);
}

/* ---------- песочница ---------- */
const ed = $("#ed"),
  out = $("#out");
const render = () => {
  out.srcdoc = ed.value;
};
ed.addEventListener("input", render);
render();

/* ---------- пасхалки ---------- */
function pop(html, ms, cls = "") {
  const d = document.createElement("div");
  d.className = "egg " + cls;
  d.innerHTML = html;
  d.onclick = () => d.remove();
  document.body.append(d);
  setTimeout(() => d.remove(), ms);
}
function beep(count = 1, freq = 900) {
  try {
    const a = new AudioContext();
    for (let i = 0; i < count; i++) {
      const o = a.createOscillator(),
        g = a.createGain();
      o.frequency.value = freq;
      g.gain.value = 0.05;
      o.connect(g);
      g.connect(a.destination);
      o.start(a.currentTime + i * 0.25);
      o.stop(a.currentTime + i * 0.25 + 0.12);
    }
  } catch {}
}

// Fortnite — код Konami, GTA 5 — «gta»
const konami =
  "ArrowUp,ArrowUp,ArrowDown,ArrowDown,ArrowLeft,ArrowRight,ArrowLeft,ArrowRight,b,a";
let keys = [],
  typed = "";
addEventListener("keydown", (e) => {
  if (e.target.closest("textarea")) return;
  keys = [...keys, e.key.length === 1 ? e.key.toLowerCase() : e.key].slice(-10);
  if (keys.join() === konami) {
    document.body.classList.toggle("cyber");
    pop(
      "<small>FORTNITE</small>VICTORY ROYALE<small>#1 — ты победил все баги</small>",
      4500,
    );
  }
  if (e.key.length === 1) {
    typed = (typed + e.key.toLowerCase()).slice(-3);
    if (typed === "gta") pop("WASTED", 3500, "wasted");
  }
});

// CS2 — 5 кликов по логотипу
let clicks = 0,
  timer;
$("#brand").addEventListener("click", () => {
  clearTimeout(timer);
  timer = setTimeout(() => (clicks = 0), 1500);
  if (++clicks === 5) {
    clicks = 0;
    beep(4);
    pop(
      "<small>COUNTER-STRIKE 2</small>The bomb has been planted",
      3000,
      "bomb",
    );
    setTimeout(
      () =>
        pop("<small>ROUND OVER</small>Counter-Terrorists Win", 3500, "bomb"),
      3200,
    );
  }
});

/* ---------- карточки курсов: плавное открытие/закрытие ---------- */
document.querySelectorAll(".card-head").forEach((btn) =>
  btn.addEventListener("click", () => {
    const open = btn.parentElement.classList.toggle("open");
    btn.setAttribute("aria-expanded", open);
  }),
);

/* ---------- наклон картинок за курсором ---------- */
document.querySelectorAll(".tilt").forEach((el) => {
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty(
      "--ry",
      ((e.clientX - r.left) / r.width - 0.5) * 14 + "deg",
    );
    el.style.setProperty(
      "--rx",
      (0.5 - (e.clientY - r.top) / r.height) * 14 + "deg",
    );
  });
  el.addEventListener("pointerleave", () => {
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  });
});

/* ---------- XP-полоска как в играх ---------- */
const xp = $(".xp i");
let leveled = false;
addEventListener(
  "scroll",
  () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, scrollY / max) : 0;
    xp.style.transform = `scaleX(${p})`;
    if (p > 0.995 && !leveled && entered) {
      leveled = true;
      pop("<small>LEVEL UP</small>Ты долистал до конца", 2500, "bomb");
    }
  },
  { passive: true },
);

/* ---------- бегущая строка: слова всегда заполняют всю ширину и появляются заново ---------- */
function buildMarquee() {
  const track = $(".marquee div");
  const base = [...track.children].slice(0, 5); // один набор слов
  track.replaceChildren(...base.map((n) => n.cloneNode(true)));
  const w = track.scrollWidth; // ширина одного набора
  const sets = Math.ceil(innerWidth / w) + 1; // сколько наборов нужно, чтобы не было пустоты
  for (let i = 0; i < sets; i++)
    base.forEach((n) => track.append(n.cloneNode(true)));
  track.style.setProperty("--w", w + "px");
  track.style.setProperty("--d", (w / 90).toFixed(2) + "s"); // скорость ~90 px/с
}
document.fonts.ready.then(buildMarquee);
let rz;
addEventListener("resize", () => {
  clearTimeout(rz);
  rz = setTimeout(buildMarquee, 150);
});

/* ---------- появление блоков при прокрутке (бары, линия релизов) ---------- */
const io = new IntersectionObserver(
  (es) =>
    es.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    }),
  { threshold: 0.3 },
);
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

/* ---------- пасхалка: /do a barrel roll в редакторе ---------- */
function barrelRoll() {
  const h = document.documentElement;
  h.style.transformOrigin = `${innerWidth / 2}px ${scrollY + innerHeight / 2}px`;
  h.classList.remove("roll");
  void h.offsetWidth;
  h.classList.add("roll");
  setTimeout(() => h.classList.remove("roll"), 1250);
}
ed.addEventListener("input", () => {
  if (/\/do a barrel roll/i.test(ed.value)) {
    ed.value = ed.value.replace(/\/do a barrel roll/gi, "");
    barrelRoll();
    render();
  }
});

/* ---------- пасхалка: ASCII-арт в консоли (F12) ---------- */
const art = String.raw`
 __     _____ _____ ____  ____ ___
 \ \   / /_ _| ____/ ___||  _ \_ _|
  \ \ / / | ||  _| \___ \| | | | |
   \ V /  | || |___ ___) | |_| | |
    \_/  |___|_____|____/|____/___|`;
console.log(
  "%c" + art,
  "color:#fff;background:#000;font:bold 12px monospace;padding:6px",
);
console.log(
  "%cСекретный код: %cVIESDI-GG",
  "color:#888;font:14px monospace",
  "color:#000;background:#fff;font:bold 14px monospace;padding:2px 8px",
);
console.log("%c↑ ↑ ↓ ↓ ← → ← → B A", "color:#0ff;font:12px monospace");
