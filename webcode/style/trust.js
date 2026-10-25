// Раздел 9: антиплагиат, признаки копирования, аналитика затыков, доступность
(() => {
  const $ = (s) => document.querySelector(s);
  const store = {
    get(k, d) {
      try {
        return JSON.parse(localStorage.getItem(k)) ?? d;
      } catch {
        return d;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch {}
    },
  };

  /* ---------- доступность: три переключателя, настройки запоминаются ---------- */
  for (const id of ["hc", "big", "calm"]) {
    const el = $("#" + id),
      on = store.get("a11y-" + id, false);
    el.checked = on;
    document.documentElement.classList.toggle(id, on);
    el.addEventListener("change", () => {
      document.documentElement.classList.toggle(id, el.checked);
      store.set("a11y-" + id, el.checked);
    });
  }

  /* ---------- антиплагиат: сравниваем форму кода, а не имена ---------- */
  const KW = new Set(
    "function return if else for while do switch case break continue const let var new class this try catch throw typeof of in async await import export default".split(
      " ",
    ),
  );
  const TOKEN =
    /\/\/.*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\d+(?:\.\d+)?|[A-Za-z_$][\w$]*|=>|===|!==|==|!=|<=|>=|&&|\|\||\+\+|--|\S/g;
  function shape(code) {
    const out = [];
    for (const t of code.match(TOKEN) || []) {
      if (t.startsWith("//") || t.startsWith("/*")) continue; // комментарии не считаем
      if (/^["'`]/.test(t))
        out.push("S"); // любая строка -> S
      else if (/^\d/.test(t))
        out.push("N"); // любое число -> N
      else if (/^[A-Za-z_$]/.test(t))
        out.push(KW.has(t) ? t : "I"); // любое имя -> I
      else out.push(t);
    }
    return out;
  }
  const grams = (t, n = 4) => {
    const s = new Set();
    for (let i = 0; i <= t.length - n; i++) s.add(t.slice(i, i + n).join(" "));
    return s;
  };
  function similarity(a, b) {
    const A = grams(shape(a)),
      B = grams(shape(b));
    if (!A.size || !B.size) return null;
    let x = 0;
    A.forEach((g) => B.has(g) && x++);
    return x / (A.size + B.size - x);
  }
  $("#pa").value =
    "function sumEven(arr) {\n  let total = 0;\n  for (let i = 0; i < arr.length; i++) {\n    if (arr[i] % 2 === 0) {\n      total += arr[i];\n    }\n  }\n  return total;\n}";
  $("#pb").value =
    "function addEvens(list) {\n  let result = 0;\n  for (let k = 0; k < list.length; k++) {\n    if (list[k] % 2 === 0) {\n      result += list[k];\n    }\n  }\n  return result;\n}";
  $("#pgo").addEventListener("click", () => {
    const s = similarity($("#pa").value, $("#pb").value);
    if (s === null) {
      $("#pbar").style.transform = "scaleX(0)";
      $("#pout").textContent = "Слишком мало кода для сравнения.";
      return;
    }
    $("#pbar").style.transform = `scaleX(${s})`;
    const p = Math.round(s * 100);
    $("#pout").textContent =
      `Совпадение формы кода: ${p}%. ` +
      (p >= 80
        ? "Почти одинаковая структура: стоит посмотреть вручную."
        : p >= 50
          ? "Есть заметное сходство."
          : "Решения заметно различаются.");
  });

  /* ---------- признаки копирования (подсказка проверяющему, не приговор) ---------- */
  const aiIn = $("#ai-in"),
    aiOut = $("#ai-out"),
    aiBar = $("#ai-bar");
  let pasted = 0,
    typed = 0,
    timer;
  aiIn.addEventListener("paste", (e) => {
    pasted += (e.clipboardData?.getData("text") || "").length;
  });
  aiIn.addEventListener("keydown", (e) => {
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) typed++;
  });
  aiIn.addEventListener("input", () => {
    if (!aiIn.value) pasted = typed = 0;
    clearTimeout(timer);
    timer = setTimeout(analyse, 300);
  });
  function analyse() {
    const code = aiIn.value,
      lines = code.split("\n").filter((l) => l.trim());
    if (code.length < 20) {
      aiOut.innerHTML = "";
      aiBar.style.transform = "scaleX(0)";
      return;
    }
    const sig = [];
    let score = 0;
    if (pasted >= 80) {
      sig.push(`Код вставлен одним куском: ${pasted} символов`);
      score += 2;
    }
    if (code.length > 60 && typed / code.length < 0.3) {
      sig.push("Почти не набирался вручную");
      score += 2;
    }
    const com = lines.filter((l) => /^\s*(\/\/|\/\*|\*)/.test(l)).length;
    if (lines.length > 3 && com / lines.length > 0.3) {
      sig.push("Комментарии занимают больше трети строк");
      score++;
    }
    if (/\/\*\*/.test(code) && lines.length < 15) {
      sig.push("Подробный JSDoc к очень короткому коду");
      score++;
    }
    if (
      /example usage|here'?s|this function|time complexity|O\(n/i.test(code)
    ) {
      sig.push("Фразы-пояснения, как в ответах чат-ботов");
      score++;
    }
    const risk = score >= 4 ? "высокий" : score >= 2 ? "средний" : "низкий";
    aiBar.style.transform = `scaleX(${Math.min(score / 6, 1)})`;
    aiOut.innerHTML =
      `<li><b>Уровень подозрений: ${risk}.</b> Аккуратно пишут и люди, решает проверяющий.</li>` +
      sig.map((s) => `<li>${s}</li>`).join("");
  }

  /* ---------- аналитика затыков: время на строках и строка выхода ---------- */
  const ed = $("#ed");
  let dwell = store.get("dwell", {}),
    exits = store.get("exits", {});
  let line = 1,
    last = performance.now(),
    active = false,
    touched = false;
  const lineOf = () => ed.value.slice(0, ed.selectionStart).split("\n").length;
  function tick() {
    const now = performance.now(),
      dt = now - last;
    last = now;
    if (active && !document.hidden) {
      dwell[line] = (dwell[line] || 0) + dt;
      touched = true;
    }
    line = lineOf();
  }
  ed.addEventListener("focus", () => {
    last = performance.now();
    active = true;
    line = lineOf();
  });
  ed.addEventListener("blur", () => {
    tick();
    active = false;
  });
  ["click", "keyup"].forEach((ev) => ed.addEventListener(ev, tick));
  function draw() {
    const n = Math.min(ed.value.split("\n").length, 10);
    const rows = [...Array(n)].map((_, i) => ({
      i: i + 1,
      t: (dwell[i + 1] || 0) / 1000,
      x: exits[i + 1] || 0,
    }));
    const max = Math.max(...rows.map((r) => r.t), 1);
    $("#heat").innerHTML = rows
      .map(
        (r) =>
          `<div class="bar"><span>${r.i}</span><b><i style="--v:${r.t / max}"></i></b><em>${Math.round(r.t)} с${r.x ? " ×" + r.x : ""}</em></div>`,
      )
      .join("");
    const top = rows.reduce((a, b) => (b.t > a.t ? b : a), rows[0]);
    const quit = Object.keys(exits).length;
    $("#drop-out").textContent =
      top.t < 1 && !quit
        ? "Данных пока нет: поработай в песочнице."
        : `Дольше всего ты на строке ${top.i} (${Math.round(top.t)} с).` +
          (top.t >= 20 || quit
            ? " Задача отправлена методисту на доработку (демо: пометка хранится в твоём браузере)."
            : "");
  }
  setInterval(() => {
    tick();
    store.set("dwell", dwell);
    draw();
  }, 1000);
  addEventListener("pagehide", () => {
    tick();
    if (touched) {
      exits[line] = (exits[line] || 0) + 1;
      store.set("exits", exits);
      store.set("dwell", dwell);
    }
    // в бою: navigator.sendBeacon('/api/stuck', JSON.stringify({ task: 'sandbox', dwell, exits }));
  });
  $("#drop-reset").addEventListener("click", () => {
    dwell = {};
    exits = {};
    store.set("dwell", {});
    store.set("exits", {});
    draw();
  });
  draw();
})();
