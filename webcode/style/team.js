// Раздел 10: парное программирование (между вкладками) и Git-симулятор
(() => {
  const $ = (s) => document.querySelector(s);

  /* ---------- парное программирование ---------- */
  const ta = $("#shared"),
    roomEl = $("#room"),
    peersEl = $("#peers"),
    lineEl = $("#peerline");
  const me = Math.random().toString(36).slice(2, 7);
  const peers = new Map();
  let ch;
  ta.value =
    '// Парное программирование\nfunction hello(name) {\n  return "Привет, " + name;\n}\n';
  const lineOf = () => ta.value.slice(0, ta.selectionStart).split("\n").length;
  const send = (m) => ch && ch.postMessage({ id: me, line: lineOf(), ...m });
  function show() {
    peersEl.textContent = "Подключено: " + (1 + peers.size);
    lineEl.textContent = [...peers.values()]
      .map((p) => `Партнёр сейчас на строке ${p.line}`)
      .join(". ");
  }
  function join() {
    if (typeof BroadcastChannel === "undefined") {
      lineEl.textContent = "Этот браузер не поддерживает BroadcastChannel.";
      return;
    }
    send({ t: "bye" });
    ch && ch.close();
    peers.clear();
    ch = new BroadcastChannel(
      "viesdi-room-" + (roomEl.value.trim() || "viesdi"),
    );
    ch.onmessage = (e) => {
      const m = e.data;
      if (m.id === me) return;
      if (m.t === "bye") peers.delete(m.id);
      else {
        peers.set(m.id, { line: m.line, seen: Date.now() });
        if (m.t === "text") {
          const pos = Math.min(ta.selectionStart, m.text.length);
          ta.value = m.text;
          ta.setSelectionRange(pos, pos);
        }
        if (m.t === "hello") send({ t: "text", text: ta.value }); // новичок получает текущий код комнаты
      }
      show();
    };
    send({ t: "hello" });
    show();
  }
  ta.addEventListener("input", () => send({ t: "text", text: ta.value }));
  ["keyup", "click"].forEach((ev) =>
    ta.addEventListener(ev, () => send({ t: "caret" })),
  );
  roomEl.addEventListener("change", join);
  setInterval(() => {
    send({ t: "ping" });
    peers.forEach((p, id) => {
      if (Date.now() - p.seen > 6000) peers.delete(id);
    });
    show();
  }, 2000);
  addEventListener("pagehide", () => send({ t: "bye" }));
  join();

  /* ---------- Git-симулятор ---------- */
  const G = {};
  const mk = (msg, parents, lane) => {
    const id = "c" + ++G.n;
    G.commits[id] = { id, msg, parents, lane, i: G.order.length };
    G.order.push(id);
    G.fresh.add(id);
    return id;
  };
  const anc = (id, s = new Set()) => {
    if (id && !s.has(id)) {
      s.add(id);
      G.commits[id].parents.forEach((p) => anc(p, s));
    }
    return s;
  };
  const tip = () => G.branches[G.head];
  const lane = () => G.lanes[G.head];

  function reset() {
    Object.assign(G, {
      commits: {},
      order: [],
      branches: {},
      lanes: { main: 0 },
      head: "main",
      n: 0,
      fresh: new Set(),
    });
    G.branches.main = mk("init", [], 0);
    say("Репозиторий создан. Ты на ветке main.");
    render();
  }
  function say(t) {
    $("#gitmsg").textContent = t;
  }

  function run(cmd) {
    G.fresh = new Set();
    const [c, a, b] = cmd
      .trim()
      .replace(/^git\s+/, "")
      .split(/\s+/);
    const newBranch = (name) => {
      G.branches[name] = tip();
      G.lanes[name] = Object.keys(G.lanes).length;
    };
    let res;
    if (c === "commit") {
      G.branches[G.head] = mk("правка " + (G.n + 1), [tip()], lane());
      res = `Коммит ${tip()} на ветке ${G.head}.`;
    } else if (c === "branch") {
      res = !a
        ? "Укажи имя: git branch feature"
        : G.branches[a]
          ? `Ветка ${a} уже есть.`
          : (newBranch(a), `Ветка ${a} создана на коммите ${tip()}.`);
    } else if (c === "checkout" || c === "switch") {
      const name = a === "-b" ? b : a;
      if (!name) res = "Укажи ветку: git checkout main";
      else if (a === "-b") {
        if (G.branches[name]) res = `Ветка ${name} уже есть.`;
        else {
          newBranch(name);
          G.head = name;
          res = `Создана ветка ${name}, ты на ней.`;
        }
      } else if (!G.branches[name]) res = `Ветки ${name} нет.`;
      else {
        G.head = name;
        res = `Теперь ты на ветке ${name}.`;
      }
    } else if (c === "merge") {
      const X = G.branches[a],
        H = tip();
      if (!a || !X) res = `Ветки ${a || ""} нет.`;
      else if (anc(H).has(X)) res = "Уже актуально: нечего сливать.";
      else if (anc(X).has(H)) {
        G.branches[G.head] = X;
        res = `Fast-forward: ${G.head} передвинута на ${X}.`;
      } else {
        G.branches[G.head] = mk(`Merge ${a}`, [H, X], lane());
        res = `Слияние: создан merge-коммит ${tip()} с двумя родителями.`;
      }
    } else if (c === "rebase") {
      const X = G.branches[a],
        H = tip();
      if (!a || !X) res = `Ветки ${a || ""} нет.`;
      else if (a === G.head || (anc(H).has(X) && !anc(X).has(H)))
        res = "Уже поверх неё: нечего переносить.";
      else if (anc(X).has(H)) {
        G.branches[G.head] = X;
        res = `Fast-forward: ${G.head} передвинута на ${X}.`;
      } else {
        const known = anc(X);
        const mine = [...anc(H)]
          .filter((id) => !known.has(id) && G.commits[id].parents.length < 2)
          .sort((p, q) => G.commits[p].i - G.commits[q].i);
        let base = X;
        mine.forEach((id) => {
          base = mk(G.commits[id].msg, [base], lane());
        });
        G.branches[G.head] = base;
        res = `Rebase: ${mine.length} коммит(а) перенесены поверх ${a}. Старые остались бледными: на них никто не указывает.`;
      }
    } else if (c === "cherry-pick") {
      if (!a || !G.commits[a]) res = `Коммита ${a || ""} нет.`;
      else if (anc(tip()).has(a)) res = `Коммит ${a} уже есть в ${G.head}.`;
      else {
        G.branches[G.head] = mk(G.commits[a].msg, [tip()], lane());
        res = `Копия коммита ${a} создана как ${tip()}.`;
      }
    } else
      res =
        "Не знаю такую команду. Попробуй: commit, branch, checkout, merge, rebase, cherry-pick.";
    say(res);
    render();
  }

  function render() {
    const X = (i) => 46 + i * 54,
      Y = (l) => 40 + l * 62;
    const reach = new Set(
      Object.values(G.branches).flatMap((t) => [...anc(t)]),
    );
    const lanes = Math.max(...Object.values(G.lanes)) + 1;
    const w = X(G.order.length) + 150,
      h = Y(lanes - 1) + 50;
    let edges = "",
      nodes = "",
      labels = "";
    for (const id of G.order) {
      const c = G.commits[id],
        gh = reach.has(id) ? "" : " ghost";
      for (const p of c.parents) {
        const q = G.commits[p],
          x1 = X(q.i),
          y1 = Y(q.lane),
          x2 = X(c.i),
          y2 = Y(c.lane),
          m = (x1 + x2) / 2;
        edges += `<path class="edge${G.fresh.has(id) ? " new" : ""}${reach.has(id) && reach.has(p) ? "" : " ghost"}" d="M${x1} ${y1}C${m} ${y1} ${m} ${y2} ${x2} ${y2}"/>`;
      }
      const cur = id === tip();
      nodes += `<g class="cm${G.fresh.has(id) ? " new" : ""}${gh}"><title>${id}: ${c.msg}</title><circle class="node${cur ? " cur" : ""}" cx="${X(c.i)}" cy="${Y(c.lane)}" r="15"/><text class="nid" x="${X(c.i)}" y="${Y(c.lane) + 4}">${id}</text></g>`;
    }
    const slot = {};
    for (const [name, id] of Object.entries(G.branches)) {
      const c = G.commits[id],
        k = (slot[id] = (slot[id] ?? -1) + 1),
        cur = name === G.head;
      const text = (cur ? "HEAD → " : "") + name,
        tw = text.length * 7.4 + 14;
      labels += `<g class="lbl${cur ? "" : " other"}"><rect x="${X(c.i) + 22}" y="${Y(c.lane) - 10 + k * 22}" width="${tw}" height="20" rx="3"/><text x="${X(c.i) + 29}" y="${Y(c.lane) + 4 + k * 22}">${text}</text></g>`;
    }
    const svg = $("#gsvg");
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("width", w);
    svg.setAttribute("height", h);
    svg.innerHTML = edges + nodes + labels;
    svg.setAttribute(
      "aria-label",
      "Граф коммитов. " +
        Object.entries(G.branches)
          .map(([n, id]) => `${n} указывает на ${id}`)
          .join(", ") +
        `. Текущая ветка: ${G.head}.`,
    );
  }

  const chips = [
    "git commit",
    "git branch feature",
    "git checkout feature",
    "git checkout main",
    "git merge feature",
    "git rebase main",
    "git cherry-pick c2",
  ];
  $("#gitchips").innerHTML =
    chips
      .map((c) => `<span role="button" tabindex="0" data-c="${c}">${c}</span>`)
      .join("") +
    '<span role="button" tabindex="0" data-c="@demo">▶ Пример</span><span role="button" tabindex="0" data-c="@reset">Сбросить</span>';
  let busy = false;
  function demo() {
    if (busy) return;
    busy = true;
    reset();
    const steps = [
      "git commit",
      "git branch feature",
      "git checkout feature",
      "git commit",
      "git commit",
      "git checkout main",
      "git commit",
      "git merge feature",
    ];
    steps.forEach((s, i) =>
      setTimeout(
        () => {
          $("#gitcmd").value = s;
          run(s);
          if (i === steps.length - 1) busy = false;
        },
        700 * (i + 1),
      ),
    );
  }
  function act(c) {
    if (c === "@demo") demo();
    else if (c === "@reset") reset();
    else {
      $("#gitcmd").value = c;
      run(c);
    }
  }
  $("#gitchips").addEventListener("click", (e) => {
    const c = e.target.closest("[data-c]");
    if (c) act(c.dataset.c);
  });
  $("#gitchips").addEventListener("keydown", (e) => {
    const c = e.target.closest("[data-c]");
    if (c && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      act(c.dataset.c);
    }
  });
  $("#gitgo").addEventListener("click", () => run($("#gitcmd").value));
  $("#gitcmd").addEventListener("keydown", (e) => {
    if (e.key === "Enter") run(e.target.value);
  });
  reset();
})();
