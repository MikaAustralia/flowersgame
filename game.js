(() => {
  "use strict";

  const DIFFICULTY = {
    easy: { timerSec: 40, orderItems: 3 },
    medium: { timerSec: 30, orderItems: 4 },
    hard: { timerSec: 20, orderItems: 5 }
  };

  const FLOWERS = [
    { id: "rose", label: "Роза", emoji: "🌹" },
    { id: "peony", label: "Пион", emoji: "🌸" },
    { id: "daisy", label: "Ромашка", emoji: "🌼" },
    { id: "tulip", label: "Тюльпан", emoji: "🌷" },
    { id: "lily", label: "Лилия", emoji: "🌺" }
  ];

  const $ = id => document.getElementById(id);
  const rnd = arr => arr[Math.floor(Math.random() * arr.length)];

  class Game {
    constructor() {
      this.diff = DIFFICULTY.easy;
      this.timer = 0;
      this.order = [];
      this.collected = {};
      this.interval = null;
      this.endAt = 0;
      this.score = 0;

      $("playBtn").onclick = () => this.start();
      $("playAgainBtn").onclick = () => this.showStart();
      $("difficulty").onchange = e => {
        this.diff = DIFFICULTY[e.target.value];
      };

      this.showStart();
    }

    showStart() {
      $("startScreen").style.display = "";
      $("hud").style.display = "none";
      $("gameField").style.display = "none";
      $("resultScreen").style.display = "none";
    }

    start() {
      // заказ
      this.order = [];
      this.collected = {};
      const pool = [...FLOWERS];
      for (let i = 0; i < this.diff.orderItems; i++) {
        const f = pool.splice(Math.floor(Math.random()*pool.length),1)[0];
        this.order.push({ ...f, need: Math.floor(Math.random()*3)+1 });
        this.collected[f.id] = 0;
      }
      this.renderOrder();

      this.timer = this.diff.timerSec;
      this.score = 0;
      $("score").textContent = "Очки: 0";
      $("timer").textContent = "⏳ "+this.timer;

      $("startScreen").style.display = "none";
      $("hud").style.display = "";
      $("gameField").style.display = "";
      $("resultScreen").style.display = "none";

      this.endAt = Date.now() + this.timer*1000;
      this.interval = setInterval(()=>this.tick(),1000);
      this.spawn();
    }

    tick() {
      const left = Math.ceil((this.endAt - Date.now())/1000);
      this.timer = Math.max(0,left);
      $("timer").textContent = "⏳ "+this.timer;
      if (this.timer<=0) this.finish(false);
    }

    renderOrder() {
      $("orderList").innerHTML = "";
      this.order.forEach(f=>{
        const li=document.createElement("li");
        li.textContent = `${f.emoji} ${f.label} ${this.collected[f.id]||0}/${f.need}`;
        li.id = "order_"+f.id;
        $("orderList").appendChild(li);
      });
    }

    spawn() {
      if (this.timer<=0) return;
      const field = $("gameField");
      const flower = rnd(FLOWERS);
      const el=document.createElement("div");
      el.dataset.type="flower";
      el.dataset.id=flower.id;
      el.textContent=flower.emoji;
      el.style.top=Math.random()*90+"%";
      el.style.left=Math.random()*90+"%";
      el.onclick=()=>this.clickFlower(el);
      field.appendChild(el);
      setTimeout(()=>el.remove(),2000);
      setTimeout(()=>this.spawn(),700);
    }

    clickFlower(el){
      const id=el.dataset.id;
      const item=this.order.find(f=>f.id===id);
      if(item && this.collected[id]<item.need){
        this.collected[id]++;
        this.score+=10;
        $("score").textContent="Очки: "+this.score;
        const li=$("order_"+id);
        li.textContent=`${item.emoji} ${item.label} ${this.collected[id]}/${item.need}`;
        if(this.isDone()) this.finish(true);
      }else{
        this.score=Math.max(0,this.score-5);
        $("score").textContent="Очки: "+this.score;
      }
      el.remove();
    }

    isDone(){
      return this.order.every(f=>this.collected[f.id]>=f.need);
    }

    finish(win){
      clearInterval(this.interval);
      $("hud").style.display="none";
      $("gameField").style.display="none";
      $("resultScreen").style.display="";
      $("resultTitle").textContent= win? "Букет готов! 💐":"Упс, время вышло ⏳";
      $("resultDetails").textContent="Очки: "+this.score;
      if(win){
        const code="FLWR-"+Math.random().toString(36).substring(2,8).toUpperCase();
        $("promoWrap").style.display="";
        $("promoCode").textContent=code;
      }else{
        $("promoWrap").style.display="none";
      }
    }
  }

  window.addEventListener("DOMContentLoaded",()=>new Game());
})();
