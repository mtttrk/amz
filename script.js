var t = "work", y = "break";
var b = (h, m) => { let d = new Date(); d.setHours(h, m, 0, 0); return d; };

// Класс таймера
class d extends EventTarget {
    constructor(startTime, breaks, endTime) {
        super();
        this.startTime = startTime;
        this.breaks = breaks; // публичное свойство
        this.endTime = endTime;
        this.currentTime = startTime;
        this.intervalId = null;
        this.currentKind = "work";
        this.currentBreakIndex = 0;
    }

    start() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.intervalId = setInterval(() => { this.tick(); }, 1000);
    }

    setBreaks(breaks) {
        this.breaks = breaks;
        this.currentBreakIndex = 0;
    }

    tick() {
        this.checkBreaks();
    }

    checkBreaks() {
        let now = new Date();
        let brk = this.breaks[this.currentBreakIndex];
        if (!brk) return;

        if (this.currentTime < brk.start && now >= brk.start) {
            this.dispatchElapsed(brk.start, "break");
            this.checkBreaks();
            return;
        }

        if (this.currentTime < brk.end && now >= brk.end) {
            this.dispatchElapsed(brk.end, "work");
            if (this.currentBreakIndex < this.breaks.length - 1) this.currentBreakIndex += 1;
            this.checkBreaks();
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

// Класс перерыва
class e {
    constructor(start, end) { this.start = start; this.end = end; }
    static fromStartAndDuration(start, mins) {
        return new e(start, new Date(start.getTime() + mins * 60000));
    }
}

// Событие таймера
class j extends Event {
    constructor(elapsed, kind) { super("time-passed"); this._elapsed = elapsed; this._kind = kind; }
    get elapsed() { return this._elapsed; }
    get kind() { return this._kind; }
}

// Определение смены
var shiftLabel = document.getElementById("current-shift");
var currentShift = "";
function getShiftStartAndBreaks() {
    let now = new Date(), hour = now.getHours(), minute = now.getMinutes();
    let start = new Date(); start.setSeconds(0, 0);
    let breaks = [];

    if ((hour > 6 && hour < 16) || (hour === 6 && minute >= 0) || (hour === 16 && minute <= 30)) {
        start.setHours(6, 0); currentShift = "Dzienna";
        breaks.push(e.fromStartAndDuration(b(12, 30), 30));
    } else {
        start.setHours(17, 30);
        if (hour < 4 || (hour === 4 && minute === 0)) start.setDate(start.getDate() - 1);
        currentShift = "Nocna";
        breaks.push(e.fromStartAndDuration(b(22, 15), 30));
    }

    if (shiftLabel) shiftLabel.textContent = currentShift;
    return { start, breaks };
}

// Элементы страницы
var n = document.getElementById("log"),
    io = document.getElementById("timer"),
    co = document.getElementById("timer-uph-dev"),
    a = document.getElementById("uph-goal"),
    w = a.value, O = 1 / w,
    fo = document.getElementById("nt"),
    so = document.getElementById("bt"),
    mo = document.getElementById("uph"),
    ho = document.getElementById("udev"),
    go = document.getElementById("units"),
    to = document.getElementById("ps"),
    bo = document.getElementById("tdev"),
    l = document.getElementById("add-button"),
    eo = document.getElementById("problem-button"),
    no = document.getElementById("sub-button"),
    devPositiveElem = document.getElementById("dev-positive"),
    devNegativeElem = document.getElementById("dev-negative"),
    extraBreakElem = document.getElementById("extra-break"),
    timeToCatchElem = document.getElementById("time-to-catch"),
    brkH = document.getElementById("brk2-h"),
    brkM = document.getElementById("brk2-m");

var A = 0, X = 0, s = 0, Y = 0;

function updateBreak() {
    f.setBreaks([e.fromStartAndDuration(b(Number(brkH.value), Number(brkM.value)), 30)]);
}
brkH.addEventListener("input", updateBreak);
brkM.addEventListener("input", updateBreak);
a.addEventListener("input", () => { w = a.value; O = 1 / w; L(); });

// Кнопки
l.addEventListener("click", () => { s += 1; f.dispatchElapsed(new Date(), t); });
eo.addEventListener("click", () => { Y += 1; to.textContent = Y; });
no.addEventListener("click", () => { s -= 1; f.dispatchElapsed(new Date(), t); });

// Создание таймера
var { start, breaks } = getShiftStartAndBreaks();
var f = new d(start, breaks, new Date(start.getTime() + 12 * 3600000));

// Кнопка «Rozpocznij od teraz»
var startNowBtn = document.getElementById("start-now-button");
startNowBtn.addEventListener("click", () => {
    let now = new Date();
    let currentUnits = s;
    let currentProblem = Y;

    f = new d(now, breaks, new Date(now.getTime() + 12 * 3600000));
    A = 0; X = 0;
    s = currentUnits; Y = currentProblem;

    f.addEventListener("time-passed", (e) => {
        let minutes = (e.elapsed / 60000).toFixed(2);
        switch (e.kind) {
            case t: A += e.elapsed; n.textContent = `W ${minutes}m\n${n.textContent}`; break;
            case y: X += e.elapsed; n.textContent = `B ${minutes}m\n${n.textContent}`; break;
        }
        L();
    });

    f.start();
    L();
});

// Основной расчёт
var L = () => {
    fo.value = (A / 3600000).toFixed(2);
    so.value = (X / 3600000).toFixed(2);
    go.textContent = s;

    let hoursWorked = A / 3600000,
        expected = w * hoursWorked,
        dev = s - expected,
        speed = s / hoursWorked;

    mo.textContent = isFinite(speed) ? speed.toFixed(2) : "0";

    if (dev > 0) { devPositiveElem.textContent = dev.toFixed(1); devNegativeElem.textContent = "0"; }
    else if (dev < 0) { devPositiveElem.textContent = "0"; devNegativeElem.textContent = Math.abs(dev).toFixed(1); }
    else { devPositiveElem.textContent = "0"; devNegativeElem.textContent = "0"; }

    extraBreakElem.textContent = dev > 0 ? (dev / w * 60).toFixed(0) : "0";

    if (speed < w && speed > 0) { let remaining = expected - s; let timeToCatch = remaining / speed; timeToCatchElem.textContent = (timeToCatch * 60).toFixed(0); }
    else timeToCatchElem.textContent = "0";

    ho.value = dev.toFixed(1);
    bo.value = (O * dev).toFixed(2);
    to.textContent = Y;
    l.classList.add("warn"); setTimeout(() => { l.classList.remove("warn"); }, 1100);
};

// Таймер
f.addEventListener("time-passed", (e) => {
    let minutes = (e.elapsed / 60000).toFixed(2);
    switch (e.kind) {
        case t: A += e.elapsed; n.textContent = `W ${minutes}m\n${n.textContent}`; break;
        case y: X += e.elapsed; n.textContent = `B ${minutes}m\n${n.textContent}`; break;
    }
    L();
});

setInterval(() => {
    let elapsed = f.getElapsed(new Date()) + 1;
    io.value = elapsed;
    let c = 1 / (elapsed / 3600000) - w;
    co.value = Math.round(c);
}, 100);

L();
f.start();
