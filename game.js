(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const log = (...a) => console.log("[FlowerRush]", ...a);
  const err = (...a) => console.error("[FlowerRush]", ...a);

  // Сложности
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
      this.ticker = null;

      // UI бинды (надежно)
      this.bindUI();
      this.showStart();
      log("Инициализировано");
    }

    bindUI() {
      const mustHave = [
        "startScreen","difficulty","playBtn","hud","timer","score",
        "orderList","gameField","resultScreen","resultTitle",
        "resultDetails","promoWrap","promoCode","playAgainBtn"
      ];
      const miss = mustHave.filter(id=>!$(id));
      if (miss.length) err("Не найдены элементы:", miss);

      // 1) Прямая привязка
      $("playBtn")?.addEventListener("click", () => this.start());
      $("playAgainBtn")?.addEventListener("click", () => this.showStart());
      $("difficulty")?.addEventListener("change", (e) => {
        this.diff = DIFFICULTY[e.target.value] || DIFFICULTY.easy;
      });

      // 2) Делегирование (на случай переотрисовки)
      document.addEventListener("click", (e) => {
        const t = e.target;
        if (t && t.id === "playBtn") { this.start(); }
        if (t && t.id === "playAgainBtn") { this.showStart(); }
      });

      // 3) Глобальный хук — можно вызвать из HTML: onclick="flowerStart()"
      window.flowerStart = () => this.start();
    }

    // Экраны
    showStart() {
      this.stopTimers();
      this.toggle("startScreen", true);
      this.toggle("hud", false);
      this.toggle("gameField", false);
      this.toggle("resultScreen", false);
      this.setText("timer", "⏳ 00:30");
      this.setText("score", "Очки: 0");
      $("orderList") && ( $("orderList").innerHTML = "" );
    }

    // Старт игры
    start() {
      log("Старт игры");
      // Заказ
      const pool = [...FLOWERS];
      const n = this.diff.orderItems;
      this.order = [];
      this.collected = {};
      for (let i = 0; i < n; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        const f = pool.splice(idx, 1)[0];
        const need = 1 + Math.floor(Math.random() * 3); // 1..3
        this.order.push({ ...f, need });
        this.collected[f.id] = 0;
      }
      this.renderOrder();

      // Состояние/таймер
      this.score = 0;
      this.setText("score", "Очки: 0");
      this.endAt = Date.now() + this.diff.timerSec * 1000;

      // Показ экрана
      this.toggle("startScreen", false);
      this.toggle("hud", true);
      this.toggle("gameField", true);
      this.toggle("resultScreen", false);

      // Тикер таймера
      this.stopTimers();
      this.ticker = setInterval(() => this.tick(), 250);

      // Спавн
      this.spawnLoop();
    }

    tick() {
      const left = Math.max(0, Math.ceil((this.endAt - Date.now()) / 1000));
      this.setText("timer", "⏳ " + left);
      if (left <= 0) this.finish(false);
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
      if (!$("gameField") || !$("gameField").style || $("gameField").style.display === "none") return;
      if (Date.now() >= this.endAt) return;
      this.spawnOne();
      setTimeout(() => this.spawnLoop(), 600 + Math.random() * 350);
    }

    spawnOne() {
      const field = $("gameField");
      if (!field) return;
      const flower = FLOWERS[Math.floor(Math.random() * FLOWERS.length)];
      const el = document.createElement("div");
      el.dataset.type = "flower";
      el.dataset.id = flower.id;
      el.textContent = flower.emoji;
      el.style.position = "absolute";
      el.style.top = (10 + Math.random() * 80) + "%";
      el.style.left = (10 + Math.random() * 80) + "%";
      el.style.fontSize = (26 + Math.floor(Math.random() * 10)) + "px";
      el.style.cursor = "pointer";
      el.addEventListener("pointerdown", () => this.clickFlower(el), { passive: true });
      field.appendChild(el);
      setTimeout(() => el.remove(), 2000);
    }

    clickFlower(el) {
      const id = el?.dataset?.id;
      const item = this.order.find(f => f.id === id);
      if (item && this.collected[id] < item.need) {
        this.collected[id]++;
        this.score += 10;
        this.setText("score", "Очки: " + this.score);
        this.updateOrderRow(item);
        if (this.isDone()) this.finish(true);
      } else {
        this.score = Math.max(0, this.score - 5);
        this.setText("score", "Очки: " + this.score);
      }
      el.remove();
    }

    updateOrderRow(item) {
      const li = $("order_" + item.id);
      if (li) li.textContent = `${item.emoji} ${item.label} ${this.collected[item.id]}/${item.need}`;
    }

    isDone() {
      return this.order.every(f => this.collected[f.id] >= f.need);
    }

    finish(win) {
      this.stopTimers();
      this.toggle("hud", false);
      this.toggle("gameField", false);
      this.toggle("resultScreen", true);
      this.setText("resultTitle", win ? "Букет готов! 💐" : "Упс, время вышло ⏳");
      this.setText("resultDetails", "Очки: " + this.score);

      const promoWrap = $("promoWrap");
      if (win && promoWrap) {
        promoWrap.style.display = "";
        const code = "FLWR-" + Math.random().toString(36).substring(2, 8).toUpperCase();
        this.setText("promoCode", code);
      } else if (promoWrap) {
        promoWrap.style.display = "none";
      }
      log("Финиш. Победа:", win, "Очки:", this.score);
    }

    // Helpers
    toggle(id, show) { const n = $(id); if (n) n.style.display = show ? "" : "none"; }
    setText(id, t) { const n = $(id); if (n) n.textContent = t; }
    stopTimers() { if (this.ticker) clearInterval(this.ticker); this.ticker = null; }
  }

  // Запуск
  window.addEventListener("DOMContentLoaded", () => {
    // Экземпляр в глобале — на всякий случай
    window.flowerGame = new Game();
    log("DOMContentLoaded → Game создан");
  });
})();
