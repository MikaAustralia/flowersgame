(() => {
  "use strict";

  // --- helpers ---
  const $ = id => document.getElementById(id);
  const log = (...a) => console.log("[FlowerRush]", ...a);
  const err = (...a) => console.error("[FlowerRush]", ...a);

  const DIFFICULTY = {
    easy:   { timerSec: 40, orderItems: 3 },
    medium: { timerSec: 30, orderItems: 4 },
    hard:   { timerSec: 20, orderItems: 5 }
  };

  const FLOWERS = [
    { id: "rose",  label: "Роза",    emoji: "🌹" },
    { id: "peony", label: "Пион",    emoji: "🌸" },
    { id: "daisy", label: "Ромашка", emoji: "🌼" },
    { id: "tulip", label: "Тюльпан", emoji: "🌷" },
    { id: "lily",  label: "Лилия",   emoji: "🌺" }
  ];

  class Game {
    constructor() {
      // Проверяем наличие узлов
      const required = [
        "startScreen","difficulty","playBtn","hud","timer","score",
        "orderList","gameField","resultScreen","resultTitle",
        "resultDetails","promoWrap","promoCode","playAgainBtn"
      ];
      const missing = required.filter(id => !$(id));
      if (missing.length) {
        err("Не найдены элементы:", missing);
      }

      // Состояние
      this.diff = DIFFICULTY.easy;
      this.timer = 0;
      this.order = [];
      this.collected = {};
      this.interval = null;
      this.endAt = 0;
      this.score = 0;

      // Привязка событий (надёжно)
      const playBtn = $("playBtn");
      if (playBtn) playBtn.addEventListener("click", () => this.start());
      else err("playBtn не найден");

      const playAgain = $("playAgainBtn");
      if (playAgain) playAgain.addEventListener("click", () => this.showStart());

      const diffSel = $("difficulty");
      if (diffSel) {
        diffSel.addEventListener("change", (e) => {
          const key = e.target.value;
          this.diff = DIFFICULTY[key] || DIFFICULTY.easy;
          log("Сложность:", key, this.diff);
        });
      }

      // Первый экран
      this.showStart();
      log("Игра инициализирована");
    }

    showStart() {
      this._hide("resultScreen");
      this._hide("hud");
      this._hide("gameField");
      this._show("startScreen");
    }

    start() {
      log("Старт игры");
      // заказ
      this.order = [];
      this.collected = {};
      const pool = [...FLOWERS];
      const n = this.diff.orderItems || 3;
      for (let i = 0; i < n; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        const f = pool.splice(idx, 1)[0];
        const need = 1 + Math.floor(Math.random() * 3); // 1..3
        this.order.push({ ...f, need });
        this.collected[f.id] = 0;
      }
      this.renderOrder();

      this.timer = this.diff.timerSec;
      this.score = 0;
      this._setText("score", "Очки: 0");
      this._setText("timer", "⏳ " + this.timer);

      this._hide("startScreen");
      this._show("hud");
      this._show("gameField");
      this._hide("resultScreen");

      this.endAt = Date.now() + this.timer * 1000;
      if (this.interval) clearInterval(this.interval);
      this.interval = setInterval(() => this.tick(), 250);

      this.spawnLoop();
    }

    tick() {
      const left = Math.ceil((this.endAt - Date.now()) / 1000);
      this.timer = Math.max(0, left);
      this._setText("timer", "⏳ " + this.timer);
      if (this.timer <= 0) this.finish(false);
    }

    renderOrder() {
      const ul = $("orderList");
      if (!ul) return;
      ul.innerHTML = "";
      this.order.forEach(f => {
        const li = document.createElement("li");
        li.id = "order_" + f.id;
        li.textContent = `${f.emoji} ${f.label} ${this.collected[f.id]}/${f.need}`;
        ul.appendChild(li);
      });
    }

    spawnLoop() {
      if (this.timer <= 0) return;
      // Спавним цветок
      this.spawnOne();
      // Планируем следующее появление
      setTimeout(() => this.spawnLoop(), 650 + Math.random() * 300);
    }

    spawnOne() {
      const field = $("gameField");
      if (!field || this.timer <= 0) return;
      const flower = FLOWERS[Math.floor(Math.random() * FLOWERS.length)];
      const el = document.createElement("div");
      el.dataset.type = "flower";
      el.dataset.id = flower.id;
      el.textContent = flower.emoji;
      el.style.position = "absolute";
      el.style.userSelect = "none";
      el.style.top = (10 + Math.random() * 80) + "%";
      el.style.left = (10 + Math.random() * 80) + "%";
      el.style.fontSize = (26 + Math.floor(Math.random()*10)) + "px";
      el.style.cursor = "pointer";
      el.addEventListener("pointerdown", () => this.clickFlower(el), { passive: true });
      field.appendChild(el);
      // TTL
      setTimeout(() => el.remove(), 2000);
    }

    clickFlower(el) {
      const id = el?.dataset?.id;
      const item = this.order.find(f => f.id === id);
      if (item && this.collected[id] < item.need) {
        this.collected[id]++;
        this.score += 10;
        this._setText("score", "Очки: " + this.score);
        this._updateOrderRow(item);
        if (this.isDone()) this.finish(true);
      } else {
        // промах / лишний клик
        this.score = Math.max(0, this.score - 5);
        this._setText("score", "Очки: " + this.score);
      }
      el.remove();
    }

    _updateOrderRow(item) {
      const li = $("order_" + item.id);
      if (li) li.textContent = `${item.emoji} ${item.label} ${this.collected[item.id]}/${item.need}`;
    }

    isDone() { return this.order.every(f => this.collected[f.id] >= f.need); }

    finish(win) {
      if (this.interval) clearInterval(this.interval);
      this._hide("hud");
      this._hide("gameField");
      this._show("resultScreen");
      this._setText("resultTitle", win ? "Букет готов! 💐" : "Упс, время вышло ⏳");
      this._setText("resultDetails", "Очки: " + this.score);

      const promoWrap = $("promoWrap");
      if (win && promoWrap) {
        promoWrap.style.display = "";
        const code = "FLWR-" + Math.random().toString(36).substring(2, 8).toUpperCase();
        this._setText("promoCode", code);
      } else if (promoWrap) {
        promoWrap.style.display = "none";
      }
      log("Финиш. Победа:", win, "Очки:", this.score);
    }

    // --- utils ---
    _show(id) { const n = $(id); if (n) n.style.display = ""; }
    _hide(id) { const n = $(id); if (n) n.style.display = "none"; }
    _setText(id, text) { const n = $(id); if (n) n.textContent = text; }
  }

  // Безопасный запуск
  window.addEventListener("DOMContentLoaded", () => {
    try {
      new Game();
      log("DOMContentLoaded → Game создан");
    } catch (e) {
      err("Инициализация провалилась:", e);
    }
  });
})();
