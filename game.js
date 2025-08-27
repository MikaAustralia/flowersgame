(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const log = (...a) => console.log("[FlowerRush]", ...a);

  // Режимы сложности
  const DIFFICULTY = {
    easy:   { timerSec: 40, orderItems: 3 },
    medium: { timerSec: 30, orderItems: 4 },
    hard:   { timerSec: 20, orderItems: 5 }
  };

  // Цветы
  const FLOWERS = [
    { id: "rose",  label: "Роза",    emoji: "🌹" },
    { id: "peony", label: "Пион",    emoji: "🌸" },
    { id: "daisy", label: "Ромашка", emoji: "🌼" },
    { id: "tulip", label: "Тюльпан", emoji: "🌷" },
    { id: "lily",  label: "Лилия",   emoji: "🌺" }
  ];

  class Game {
    constructor() {
      this.diff = DIFFICULTY.easy;
      this.timer = 0;
      this.order = [];
      this.collected = {};
      this.endAt = 0;
      this.score = 0;
      this.interval = null;

      // Привязка кнопок
      const playBtn = $("playBtn");
      if (playBtn) playBtn.addEventListener("click", () => this.start());

      const playAgainBtn = $("playAgainBtn");
      if (playAgainBtn) playAgainBtn.addEventListener("click", () => this.showStart());

      const diffSel = $("difficulty");
      if (diffSel) {
        diffSel.addEventListener("change", e => {
          const key = e.target.value;
          this.diff = DIFFICULTY[key] || DIFFICULTY.easy;
        });
      }

      this.showStart();
      log("Игра инициализирована");
    }

    showStart() {
      this._show("startScreen");
      this._hide("hud");
      this._hide("gameField");
      this._hide("resultScreen");
    }

    start() {
      log("Старт игры");
      // Генерация заказа
      this.order = [];
      this.collected = {};
      const pool = [...FLOWERS];
      for (let i = 0; i < this.diff.orderItems; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        const f = pool.splice(idx, 1)[0];
        const need = 1 + Math.floor(Math.random() * 3); // 1–3
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
      this.spawnOne();
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
      el.style.top = (10 + Math.random() * 80) + "%";
      el.style.left = (10 + Math.random() * 80) + "%";
      el.style.fontSize = (26 + Math.floor(Math.random()*10)) + "px";
      el.style.cursor = "pointer";
      el.addEventListener("click", () => this.clickFlower(el));
      field.appendChild(el);
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
        this.score = Math.max(0, this.score - 5);
        this._setText("score", "Очки: " + this.score);
      }
      el.remove();
    }

    _updateOrderRow(item) {
      const li = $("order_" + item.id);
      if (li) li.textContent = `${item.emoji} ${item.label} ${this.collected[item.id]}/${item.need}`;
    }

    isDone() {
      return this.order.every(f => this.collected[f.id] >= f.need);
    }

    finish(win) {
      clearInterval(this.interval);
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
    }

    // --- helpers ---
    _show(id) { const n = $(id); if (n) n.style.display = ""; }
    _hide(id) { const n = $(id); if (n) n.style.display = "none"; }
    _setText(id, text) { const n = $(id); if (n) n.textContent = text; }
  }

  // Запуск после загрузки DOM
  window.addEventListener("DOMContentLoaded", () => {
    new Game();
    log("DOMContentLoaded → Game создан");
  });
})();
