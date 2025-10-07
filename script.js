// script.js — обновлённый, устраняющий проблему с кнопками и дублированием слушателей

var t = "work", y = "break";
var b = (h, m) => { let d = new Date(); d.setHours(h, m, 0, 0); return d; };

// Классы — таймер / перерыв / событие (как в предыдущих версиях)
class d extends EventTarget {
  constructor(startTime, breaks, endTime) {
    super();
    this.startTime = startTime;
    this.breaks = breaks || [];
    this.endTime = endTime;
    this.currentTime = startTime;
    this.intervalId = null;
    this.currentKind = "work";
    this.currentBreakIndex = 0;
  }
  start() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => this.tick(), 1000);
  }
  stop() { if (this.intervalId) clearInterval(this.intervalId); this.intervalId = null; }
  setBreaks(breaks) { this.breaks = breaks || []; this.currentBreakIndex = 0; }
  tick() {
    let now = new Date();
    let brk = this.breaks[this.currentBreakIndex];
    if (!brk) return;
    if (this.currentTime < brk.start && now >= brk.start) {
      this.dispatchElapsed(brk.start, y);
      return;
    }
    if (this.currentTime < brk.end && now >= brk.end) {
      this.dispatchElapsed(brk.end, t);
      if (this.currentBreakIndex < this.breaks.length - 1) this.currentBreakIndex++;
      return;
    }
  }
  getElapsed(now) { return now - this.currentTime; }
  dispatchElapsed(time, kind) {
    let limitedTime = new Date(Math.min(time.getTime(), this.endTime.getTime()));
    let elapsed = this.getElapsed(limitedTime);
    let event = new j(elapsed, this.currentKind);
    this.dispatchEvent(event);
    this.currentTime = limitedTime;
    this.currentKind = kind;
  }
}

class e {
  constructor(start, end) { this.start = start; this.end = end; }
  static fromStartAndDuration(start, mins) { return new e(start, new Date(start.getTime() + mins * 60000)); }
}

class j extends Event {
  constructor(elapsed, kind) { super("time-passed"); this._elapsed = elapsed; this._kind = kind; }
  get elapsed() { return this._elapsed; }
  get kind() { return this._kind; }
}

// === DOM ===
const fo = document.getElementById("nt");              // Czas pracy (readonly input)
const brkH = document.getElementById("brk2-h");        // Czas rozpoczęcia przerwy: hours
const brkM = document.getElementById("brk2-m");        // minutes
const unitsSpan = document.getElementById("units");    // Paczki w godzinę (фактические пачки)
const uphGoalInput = document.getElementById("uph-goal"); // Norma w godzinę (input)
const psSpan = document.getElementById("ps");          // Problem Solve
const devPositiveElem = document.getElementById("dev-positive");
const devNegativeElem = document.getElementById("dev-negative");
const extraBreakElem = document.getElementById("extra-break");
const timeToCatchElem = document.getElementById("time-to-catch");
const addBtn = document.getElementById("add-button");
const subBtn = document.getElementById("sub-button");
const psBtn = document.getElementById("problem-button");
const startNowBtn = document.getElementById("start-now-button");
const shiftLabel = document.getElementById("current-shift");

// === state ===
let A = 0; // ms work
let X = 0; // ms break
let s = 0; // packs done
let Y = 0; // problem solve count
let w = Number(uphGoalInput.value) || 23; // norma/hour
let O = 1 / w;

// timer instance handling (attach/detach listeners safely)
let { start: defaultStart, breaks: defaultBreaks } = (function getShiftStartAndBreaks() {
  let now = new Date(), hour = now.getHours(), minute = now.getMinutes();
  let start = new Date(); start.setSeconds(0, 0);
  let breaks = [];
  if ((hour > 6 && hour < 16) || (hour === 6 && minute >= 0) || (hour === 16 && minute <= 30)) {
    start.setHours(6, 0);
    breaks.push(e.fromStartAndDuration(b(12, 30), 30));
  } else {
    start.setHours(17, 30);
    if (hour < 4 || (hour === 4 && minute === 0)) start.setDate(start.getDate() - 1);
    breaks.push(e.fromStartAndDuration(b(22, 15), 30));
  }
  return { start, breaks };
})();

let timer = new d(defaultStart, defaultBreaks, new Date(defaultStart.getTime() + 12 * 3600000));
let tickListener = null;

function attachTimer(newTimer) {
  // отписываем старый
  if (tickListener && timer) {
    try { timer.removeEventListener("time-passed", tickListener); } catch (e) { /* ignore */ }
    try { timer.stop(); } catch(e){/* ignore */}
  }
  timer = newTimer;
  tickListener = function (e) {
    if (e.kind === t) A += e.elapsed;
    if (e.kind === y) X += e.elapsed;
    L();
  };
  timer.addEventListener("time-passed", tickListener);
  timer.start();
}

// initial attach
attachTimer(timer);

// === shift label update (realtime) ===
function updateShift() {
  let now = new Date(), h = now.getHours(), m = now.getMinutes();
  if ((h > 6 && h < 16) || (h === 6 && m >= 0) || (h === 16 && m <= 30)) shiftLabel.textContent = "Dzienna";
  else shiftLabel.textContent = "Nocna";
}
updateShift();
setInterval(updateShift, 60000);

// === break update (manual) ===
function updateBreak() {
  const hh = Number(brkH.value);
  const mm = Number(brkM.value);
  // обновляем breaks для текущего timer и для будущих перезапусков
  const newBreak = e.fromStartAndDuration(b(hh, mm), 30);
  timer.setBreaks([newBreak]);
}
brkH.addEventListener("input", updateBreak);
brkM.addEventListener("input", updateBreak);

// === uph change ===
uphGoalInput.addEventListener("input", () => {
  w = Number(uphGoalInput.value) || 1;
  O = 1 / w;
  L();
});

// === buttons logic (уже не вызываем dispatchElapsed тут) ===
addBtn.addEventListener("click", () => { s = Number(s) + 1; L(); });
subBtn.addEventListener("click", () => { s = Number(s) - 1; if (s < 0) s = 0; L(); });
psBtn.addEventListener("click", () => { Y = Number(Y) + 1; L(); });

// === Rozpocznij od teraz ===
startNowBtn.addEventListener("click", () => {
  let now = new Date();
  const savedS = s, savedY = Y;
  const newTimer = new d(now, timer.breaks.slice(), new Date(now.getTime() + 12 * 3600000));
  A = 0; X = 0; s = savedS; Y = savedY;
  attachTimer(newTimer);
  L();
});

// === вычисления ===
function L() {
  // Czas pracy (часы в десятичном виде)
  fo.value = (A / 3600000).toFixed(2);

  // Paczki (фактические)
  unitsSpan.textContent = s;

  // Problem Solve
  psSpan.textContent = Y;

  // расчёты
  let hoursWorked = A / 3600000;
  let expected = w * hoursWorked;
  let dev = s - expected;
  let speed = hoursWorked > 0 ? s / hoursWorked : 0; // ед/час

  // отклонения
  devPositiveElem.textContent = dev > 0 ? dev.toFixed(1) : "0";
  devNegativeElem.textContent = dev < 0 ? Math.abs(dev).toFixed(1) : "0";

  // корректный расчёт дополнительного времени на перерыв:
  // дополнительное время = ((speed - norma)/norma) * время_работы_в_минутах
  let timeWorkedMinutes = A / 60000;
  let extraTime = 0;
  if (speed > w && timeWorkedMinutes > 0) {
    extraTime = ((speed - w) / w) * timeWorkedMinutes;
  }
  extraBreakElem.textContent = Math.round(extraTime);

  // время до догонения нормы: (expected - s) / speed -> в часах, затем в минутах
  if (speed > 0 && speed < w && hoursWorked > 0) {
    let remaining = expected - s; // положительное, если отстаём
    let timeToCatchHours = remaining / speed; // часы
    timeToCatchElem.textContent = Math.max(0, Math.round(timeToCatchHours * 60));
  } else {
    timeToCatchElem.textContent = "0";
  }
}

// start updating display
L();