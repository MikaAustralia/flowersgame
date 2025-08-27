/* ============================================================
  Flower Rush — "Pick a Flower"
  Простая маркетинговая мини-игра: собери заказ за время.

  ✅ Что ожидается в HTML (минимум):
  ------------------------------------------------------------
  <div id="startScreen">
    <select id="difficulty">
      <option value="easy">Лёгкий</option>
      <option value="medium">Средний</option>
      <option value="hard">Сложный</option>
    </select>
    <button id="playBtn">Играть</button>
  </div>

  <div id="hud" style="display:none">
    <div id="timer">⏳ 00:30</div>
    <div id="score">Очки: 0</div>
    <div id="order">
      <ul id="orderList"></ul>
    </div>
  </div>

  <div id="gameField" style="display:none"></div>

  <div id="resultScreen" style="display:none">
    <h2 id="resultTitle"></h2>
    <p id="resultDetails"></p>
    <div id="promoWrap" style="display:none">Ваш промокод: <b id="promoCode"></b></div>
    <button id="playAgainBtn">Играть снова</button>
  </div>
  ------------------------------------------------------------

  💡 Картинки цветов (необязательно):
  Если положите PNG в /assets/flowers/{id}.png — игра их подхватит.
  Иначе покажет эмодзи.

  ✨ Под мобильные устройства всё кликается (pointer events).
============================================================ */

(() => {
  "use strict";

  // ---- Настройки сложности ----
  const DIFFICULTY = {
    easy: {
      label: "Лёгкий",
      timerSec: 40,
      spawnEveryMs: [650, 900],   // интервал появления цветов (min..max)
      ttlMs: [2400, 3800],        // время жизни цветка
      maxActive: 8,
      orderItemsRange: [3, 4],    // сколько позиций в заказе
      qtyPerItem: [1, 3],         // сколько штук каждой позиции
      missPenaltySec: 2,
      correctScore: 8,
      wrongScore: -2,
      difficultyBonus: 20
    },
    medium: {
      label: "Средний",
      timerSec: 30,
      spawnEveryMs: [520, 750],
      ttlMs: [2000, 3200],
      maxActive: 10,
      orderItemsRange: [4, 6],
      qtyPerItem: [2, 4],
      missPenaltySec: 2,
      correctScore: 10,
      wrongScore: -3,
      difficultyBonus: 50
    },
    hard: {
      label: "Сложный",
      timerSec: 20,
      spawnEveryMs: [420, 620],
      ttlMs: [1600, 2600],
      maxActive: 12,
      orderItemsRange: [6, 8],
      qtyPerItem: [3, 5],
      missPenaltySec: 3,
      correctScore: 12,
      wrongScore: -4,
      difficultyBonus: 90
    }
  };

  // ---- Каталог цветов ----
  // id — ключ заказа, label — название, emoji — запасной вариант, imgSrc — путь к картинке (если есть)
  const FLOWERS = [
    { id: "rose",        label: "Роза",        emoji: "🌹", imgSrc: "/assets/flowers/rose.png" },
    { id: "peony",       label: "Пион",        emoji: "🌸", imgSrc: "/assets/flowers/peony.png" },
    { id: "daisy",       label: "Ромашка",     emoji: "🌼", imgSrc: "/assets/flowers/daisy.png" },
    { id: "tulip",       label: "Тюльпан",     emoji: "🌷", imgSrc: "/assets/flowers/tulip.png" },
    { id: "hydrangea",   label: "Гортензия",   emoji: "🪻", imgSrc: "/assets/flowers/hydrangea.png" },
    { id: "lily",        label: "Лилия",       emoji: "🌺", imgSrc: "/assets/flowers/lily.png" },
    { id: "gerbera",     label: "Гербера",     emoji: "🌻", imgSrc: "/assets/flowers/gerbera.png" },
    { id: "eustoma",     label: "Эустома",     emoji: "💮", imgSrc: "/assets/flowers/eustoma.png" },
    { id: "anthurium",   label: "Антуриум",    emoji: "🔴", imgSrc: "/assets/flowers/anthurium.png" }
  ];

  // ---- Утилиты ----
  const rndInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const rndFloat = (a, b) => Math.random() * (b - a) + a;
  const rndFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const $ = (id) => document.getElementById(id);
  const safeShow = (el, show) => { if (el) el.style.display = show ? "" : "none"; };
  const fmtTime = (sec) => {
    const s = Math.max(0, Math.floor(sec));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  // ---- Класс игры ----
  class FlowerRushGame {
    constructor() {
      // DOM
      this.elStart = $("startScreen");
      this.elPlayBtn = $("playBtn");
      this.elDiff = $("difficulty");
      this.elHud = $("hud");
      this.elTimer = $("timer");
      this.elScore = $("score");
      this.elOrderList = $("orderList");
      this.elGameField = $("gameField");
      this.elResult = $("resultScreen");
      this.elResultTitle = $("resultTitle");
      this.elResultDetails = $("resultDetails");
      this.elPromoWrap = $("promoWrap");
      this.elPromoCode = $("promoCode");
      this.elPlayAgain = $("playAgainBtn");

      // Состояние
      this.state = "menu"; // menu | playing | finished
      this.diffKey = "easy";
      this.diffCfg = DIFFICULTY.easy;

      this.order = null;         // { items: [{id,label,need,collected}], totalNeed }
      this.activeFlowers = new Set();
      this.spawnTimer = null;
      this.gameTimer = null;
      this.endAt = 0;

      this.score = 0;
      this.clicksTotal = 0;
      this.clicksCorrect = 0;

      // Привязка событий
      this._bindUI();
      this._toMenu();
    }

    _bindUI() {
      if (this.elPlayBtn) {
        this.elPlayBtn.addEventListener("click", () => this.start());
      }
      if (this.elPlayAgain) {
        this.elPlayAgain.addEventListener("click", () => this._toMenu());
      }
      if (this.elDiff) {
        this.elDiff.addEventListener("change", () => {
          const key = this.elDiff.value;
          if (DIFFICULTY[key]) {
            this.diffKey = key;
            this.diffCfg = DIFFICULTY[key];
          }
        });
      }

      // Клик мимо цветов = ничего (но можно добавить штраф, если нужно)
      if (this.elGameField) {
        this.elGameField.addEventListener("pointerdown", (e) => {
          const target = e.target;
          if (target && target.dataset && target.dataset.type === "flower") {
            // обработка в обработчике на элементе цветка
          }
        }, { passive: true });
      }
    }

    _toMenu() {
      this._stopAll();
      this.state = "menu";
      safeShow(this.elStart, true);
      safeShow(this.elHud, false);
      safeShow(this.elGameField, false);
      safeShow(this.elResult, false);
      this._clearField();
      this._resetHUD();
    }

    start() {
      if (!DIFFICULTY[this.diffKey]) this.diffKey = "easy";
      this.diffCfg = DIFFICULTY[this.diffKey];

      // Сброс
      this._stopAll();
      this._clearField();
      this.score = 0;
      this.clicksTotal = 0;
      this.clicksCorrect = 0;

      // Генерация заказа
      this.order = this._makeOrder();
      this._renderOrder();

      // UI
      this.state = "playing";
      safeShow(this.elStart, false);
      safeShow(this.elHud, true);
      safeShow(this.elGameField, true);
      safeShow(this.elResult, false);
      this._updateScore(0);
      this._updateTimer(this.diffCfg.timerSec);

      // Таймер игры
      this.endAt = performance.now() + this.diffCfg.timerSec * 1000;
      this._tickGameTimer();

      // Спавн цветов
      this._scheduleSpawn();
    }

    // ---- Заказ ----
    _makeOrder() {
      // количество позиций
      const [minItems, maxItems] = this.diffCfg.orderItemsRange;
      const uniqueCount = clamp(rndInt(minItems, maxItems), 1, FLOWERS.length);

      // берём случайные позиции без повторов
      const pool = [...FLOWERS];
      const items = [];
      for (let i = 0; i < uniqueCount; i++) {
        const idx = rndInt(0, pool.length - 1);
        const chosen = pool.splice(idx, 1)[0];
        const [qMin, qMax] = this.diffCfg.qtyPerItem;
        const need = rndInt(qMin, qMax);
        items.push({ id: chosen.id, label: chosen.label, need, collected: 0 });
      }

      const totalNeed = items.reduce((s, it) => s + it.need, 0);
      return { items, totalNeed, collected: 0 };
    }

    _renderOrder() {
      if (!this.elOrderList || !this.order) return;
      this.elOrderList.innerHTML = "";
      this.order.items.forEach((it, idx) => {
        const li = document.createElement("li");
        li.dataset.flower = it.id;
        li.style.listStyle = "none";
        li.style.margin = "2px 0";

        const fMeta = FLOWERS.find(f => f.id === it.id);
        const emoji = fMeta?.emoji ?? "💐";

        li.innerHTML = `${emoji} <b>${it.label}</b> — <span class="collected">${it.collected}</span>/<span class="need">${it.need}</span>`;
        this.elOrderList.appendChild(li);
      });
    }

    _updateOrderUIFor(id) {
      const li = this.elOrderList?.querySelector(`li[data-flower="${id}"]`);
      if (!li) return;
      const item = this.order.items.find(i => i.id === id);
      if (!item) return;
      const col = li.querySelector(".collected");
      if (col) col.textContent = String(item.collected);
    }

    // ---- Спавн ----
    _scheduleSpawn() {
      if (this.state !== "playing") return;
      const [minMs, maxMs] = this.diffCfg.spawnEveryMs;
      const delay = rndInt(minMs, maxMs);
      this.spawnTimer = window.setTimeout(() => {
        this._spawnOne();
        this._scheduleSpawn();
      }, delay);
    }

    _spawnOne() {
      if (!this.elGameField || this.state !== "playing") return;
      if (this.activeFlowers.size >= this.diffCfg.maxActive) return;

      // Выбираем любой цветок из каталога (не только из заказа, чтобы были "лишние")
      const flower = rndFrom(FLOWERS);

      // Создаём DOM элемент
      const el = document.createElement("div");
      el.dataset.type = "flower";
      el.dataset.id = flower.id;
      el.style.position = "absolute";
      el.style.userSelect = "none";
      el.style.cursor = "pointer";
      el.style.fontSize = rndInt(20, 34) + "px";
      el.style.lineHeight = "1";
      el.style.transform = `translate(-50%, -50%) rotate(${rndInt(-15, 15)}deg)`;
      el.style.transition = "transform 120ms ease, opacity 140ms ease";

      // Содержимое: PNG (если есть) или эмодзи
      if (flower.imgSrc) {
        const img = document.createElement("img");
        img.src = flower.imgSrc;
        img.alt = flower.label;
        img.style.width = rndInt(36, 58) + "px";
        img.style.height = "auto";
        img.draggable = false;
        el.appendChild(img);
      } else {
        el.textContent = flower.emoji || "💐";
      }

      // Позиция внутри поля (с отступами)
      const rect = this.elGameField.getBoundingClientRect();
      // Используем проценты, чтобы не вылезать за края (поля 8%)
      const topPct = rndFloat(10, 90);
      const leftPct = rndFloat(10, 90);
      el.style.top = topPct + "%";
      el.style.left = leftPct + "%";

      // Обработчик клика
      const clickHandler = (e) => {
        e.stopPropagation();
        this._onFlowerClick(el);
      };
      el.addEventListener("pointerdown", clickHandler, { passive: true });

      // Добавляем и регистрируем
      this.elGameField.appendChild(el);
      this.activeFlowers.add(el);

      // Удаляем по TTL
      const [ttlMin, ttlMax] = this.diffCfg.ttlMs;
      const ttl = rndInt(ttlMin, ttlMax);
      el._despawnTimer = window.setTimeout(() => {
        this._despawn(el);
      }, ttl);
    }

    _despawn(el) {
      if (!el || !this.activeFlowers.has(el)) return;
      this.activeFlowers.delete(el);
      try {
        if (el._despawnTimer) clearTimeout(el._despawnTimer);
        el.style.opacity = "0";
        el.style.transform += " scale(0.85)";
        setTimeout(() => el.remove(), 120);
      } catch {
        el.remove();
      }
    }

    // ---- Клик по цветку ----
    _onFlowerClick(el) {
      if (this.state !== "playing") return;
      this.clicksTotal++;

      const id = el?.dataset?.id;
      const item = this.order.items.find(i => i.id === id && i.collected < i.need);

      if (item) {
        // Попали в нужный цветок
        item.collected += 1;
        this.order.collected += 1;
        this.clicksCorrect++;
        this._updateOrderUIFor(id);

        // Визуальная обратная связь
        el.style.transform += " scale(1.12)";
        el.style.opacity = "0.2";
        setTimeout(() => this._despawn(el), 60);

        // Очки
        this._updateScore(this.diffCfg.correctScore);

        // Проверка победы
        if (this.order.collected >= this.order.totalNeed) {
          this._finish(true);
        }
      } else {
        // Мимо заказа — штраф по времени и очкам
        this._timePenalty(this.diffCfg.missPenaltySec);
        this._updateScore(this.diffCfg.wrongScore);

        // Небольшой "шат" и исчезновение
        el.style.transform += " translateY(4px) scale(0.9)";
        setTimeout(() => this._despawn(el), 80);
      }
    }

    // ---- Таймер игры ----
    _tickGameTimer() {
      if (this.state !== "playing") return;
      const now = performance.now();
      const msLeft = this.endAt - now;
      const secLeft = Math.max(0, Math.ceil(msLeft / 1000));
      this._updateTimer(secLeft);

      if (msLeft <= 0) {
        this._finish(false);
        return;
      }
      this.gameTimer = window.requestAnimationFrame(() => this._tickGameTimer());
    }

    _updateTimer(sec) {
      if (this.elTimer) {
        this.elTimer.textContent = `⏳ ${fmtTime(sec)}`;
      }
    }

    _timePenalty(sec) {
      // Смещаем конец игры ближе на sec секунд
      this.endAt -= sec * 1000;
      // Визуальный флэш таймера
      if (this.elTimer) {
        const old = this.elTimer.style.color;
        this.elTimer.style.color = "#c0392b";
        setTimeout(() => { this.elTimer.style.color = old || ""; }, 200);
      }
    }

    // ---- Очки ----
    _updateScore(delta) {
      this.score = Math.max(0, this.score + delta);
      if (this.elScore) {
        this.elScore.textContent = `Очки: ${this.score}`;
      }
    }

    // ---- Завершение ----
    _finish(win) {
      if (this.state !== "playing") return;
      this.state = "finished";
      this._stopAll();

      // Подсчёт финального счёта с бонусами
      const timeLeftSec = Math.max(0, Math.ceil((this.endAt - performance.now()) / 1000));
      const accuracy = this.clicksTotal ? (this.clicksCorrect / this.clicksTotal) : 0;
      const accScore = Math.round(accuracy * 100); // 0..100
      const final =
        this.score +
        Math.round(timeLeftSec * 5) +
        accScore +
        this.diffCfg.difficultyBonus +
        (win ? 50 : 0);

      // Рейтинг звёзд
      let stars = "★☆☆";
      if (final >= 220) stars = "★★★";
      else if (final >= 140) stars = "★★☆";

      // Промо
      let promo = "";
      if (win) {
        promo = this._genPromoCode();
      }

      // UI
      safeShow(this.elHud, false);
      safeShow(this.elGameField, false);
      safeShow(this.elResult, true);

      if (this.elResultTitle) {
        this.elResultTitle.textContent = win
          ? "Букет готов! 💐"
          : "Упс, время вышло ⏳";
      }

      if (this.elResultDetails) {
        const accPct = Math.round(accuracy * 100);
        this.elResultDetails.innerHTML =
          `Результат: <b>${final}</b> • Точность: <b>${accPct}%</b> • Осталось времени: <b>${fmtTime(timeLeftSec)}</b><br>` +
          `Сложность: <b>${DIFFICULTY[this.diffKey].label}</b> • Рейтинг: <b>${stars}</b>`;
      }

      if (this.elPromoWrap && this.elPromoCode) {
        if (promo) {
          this.elPromoWrap.style.display = "";
          this.elPromoCode.textContent = promo;
        } else {
          this.elPromoWrap.style.display = "none";
        }
      }

      // Чистим поле
      this._clearField();
    }

    _genPromoCode() {
      // Простой купон: FLWR-XXXXXX (буквы/цифры)
      const alph = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let s = "";
      for (let i = 0; i < 6; i++) s += alph[Math.floor(Math.random() * alph.length)];
      return `FLWR-${s}`;
    }

    // ---- Служебные ----
    _stopAll() {
      if (this.spawnTimer) clearTimeout(this.spawnTimer);
      this.spawnTimer = null;
      if (this.gameTimer) cancelAnimationFrame(this.gameTimer);
      this.gameTimer = null;

      // Снять таймеры у активных элементов
      this.activeFlowers.forEach(el => {
        if (el._despawnTimer) clearTimeout(el._despawnTimer);
      });
      this.activeFlowers.clear();
    }

    _clearField() {
      if (!this.elGameField) return;
      this.elGameField.innerHTML = "";
      this.activeFlowers.clear();
    }

    _resetHUD() {
      if (this.elTimer) this.elTimer.textContent = `⏳ ${fmtTime(this.diffCfg.timerSec)}`;
      if (this.elScore) this.elScore.textContent = "Очки: 0";
      if (this.elOrderList) this.elOrderList.innerHTML = "";
    }
  }

  // ---- Запуск ----
  window.addEventListener("DOMContentLoaded", () => {
    // Сделаем игру доступной в window, если понадобится обращаться снаружи
    window.flowerRushGame = new FlowerRushGame();
  });

})();

