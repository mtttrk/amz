// --- Константы ---
const WORK = "work";
const BREAK = "break";
const MANUAL_BREAK_DURATION = 30; // Длительность ручной "автоматической" паузы в минутах (30 минут по умолчанию)

// --- Утилиты ---
const setTime = (h, m) => { let d = new Date(); d.setHours(h, m, 0, 0); return d; };
const formatTime = (ms) => {
    let totalSeconds = Math.round(ms / 1000);
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
};

// --- Перерывы ---
class BreakPeriod {
    constructor(start, end) { this.start = start; this.end = end; }
    static fromStartAndDuration(start, mins) {
        return new BreakPeriod(start, new Date(start.getTime() + mins * 60000));
    }
}

// --- Событие времени ---
class TimeEvent extends Event {
    constructor(elapsed, kind) { super("time-passed"); this._elapsed = elapsed; this._kind = kind; }
    get elapsed() { return this._elapsed; }
    get kind() { return this._kind; }
}

// --- Таймер ---
class Timer extends EventTarget {
    constructor(startTime, breaks, endTime) {
        super();
        this.startTime = startTime;
        this.breaks = breaks;
        this.endTime = endTime;
        this.currentTime = startTime;
        this.currentKind = WORK;
        this.currentBreakIndex = 0;
        this.intervalId = null;
        this.isManualBreakActive = false;
        this.manualBreakStart = null;
    }

    start() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.currentTime = new Date();
        this.intervalId = setInterval(() => this.tick(), 1000);
    }
    
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    setBreaks(breaks) { this.breaks = breaks; this.currentBreakIndex = 0; }

    toggleManualBreak(isActive) {
        let now = new Date();
        if (isActive && !this.isManualBreakActive) {
            this.dispatchElapsed(now, BREAK); // Завершаем текущий период (работа/перерыв)
            this.manualBreakStart = now;
            this.isManualBreakActive = true;
            this.currentKind = BREAK;
        } else if (!isActive && this.isManualBreakActive) {
            this.dispatchElapsed(now, WORK); // Завершаем ручной перерыв
            this.manualBreakStart = null;
            this.isManualBreakActive = false;
            this.currentKind = WORK;
        }
    }

    tick() {
        let now = new Date();
        if (this.isManualBreakActive) {
            // Если активен ручной перерыв, автоматические перерывы игнорируются
            this.currentTime = now;
            return;
        }

        let brk = this.breaks[this.currentBreakIndex];
        
        // Автоматические перерывы
        if (brk) {
            if (this.currentTime.getTime() < brk.start.getTime() && now.getTime() >= brk.start.getTime()) {
                this.dispatchElapsed(brk.start, BREAK);
            } else if (this.currentTime.getTime() < brk.end.getTime() && now.getTime() >= brk.end.getTime()) {
                this.dispatchElapsed(brk.end, WORK);
                if (this.currentBreakIndex < this.breaks.length - 1) this.currentBreakIndex++;
            }
        }
    }

    getElapsed(now) { return now.getTime() - this.currentTime.getTime(); }

    dispatchElapsed(time, nextKind) {
        let limitedTime = new Date(Math.min(time.getTime(), this.endTime.getTime()));
        let elapsed = this.getElapsed(limitedTime);
        if (elapsed > 0) {
            let event = new TimeEvent(elapsed, this.currentKind);
            this.dispatchEvent(event);
        }
        this.currentTime = limitedTime;
        this.currentKind = nextKind;
    }
}

// --- DOM элементы ---
const fo = document.getElementById("nt"), // Czas pracy
    brkH = document.getElementById("brk2-h"),
    brkM = document.getElementById("brk2-m"),
    mo = document.getElementById("units"), // Paczki
    speedElem = document.getElementById("speed"), // Paczki/godz.
    uphGoalInput = document.getElementById("uph-goal"),
    psCountElem = document.getElementById("ps-count"), // PS Counter
    devPositiveElem = document.getElementById("dev-positive"),
    devNegativeElem = document.getElementById("dev-negative"),
    extraBreakElem = document.getElementById("extra-break"),
    timeToCatchElem = document.getElementById("time-to-catch"),
    addBtn = document.getElementById("add-button"),
    subBtn = document.getElementById("sub-button"),
    psBtn = document.getElementById("ps-button"),
    startNowBtn = document.getElementById("start-now-button"),
    resetBtn = document.getElementById("reset-button"),
    manualBreakBtn = document.getElementById("manual-break-button"),
    breakToggleBtn = document.getElementById("break-toggle-button"),
    shiftLabel = document.getElementById("current-shift");

// --- Состояние приложения ---
let netWorkTime = 0, // A - Время работы (мс)
    breakTime = 0,   // X - Время перерывов (мс)
    psTime = 0,      // Новая переменная для Problem Solve Time (мс)
    packagesCount = 0, // s - Количество пачек
    psCounter = 0;   // Y - Количество PS

let uphGoal = Number(uphGoalInput.value);
let isPsActive = false; // Состояние PS

// --- Определение смены ---
function updateShift() {
    let now = new Date(), h = now.getHours();
    // Смена "Dzienna" (Дневная) с 6:00 до 16:30
    if ((h >= 6 && h < 16) || (h === 16 && now.getMinutes() <= 30)) {
        shiftLabel.textContent = "Dzienna";
    } else {
        shiftLabel.textContent = "Nocna";
    }
}
setInterval(updateShift, 60000);
updateShift();

// --- Определяем перерывы (автоматическая логика) ---
function getShiftBreaks() {
    let breaks = [];
    let now = new Date(), h = now.getHours();
    // Дневная смена: 12:30
    if ((h >= 6 && h < 16) || (h === 16 && now.getMinutes() <= 30)) {
        breaks.push(BreakPeriod.fromStartAndDuration(setTime(12, 30), 30));
    // Ночная смена: 22:15
    } else {
        breaks.push(BreakPeriod.fromStartAndDuration(setTime(22, 15), 30));
    }
    return breaks;
}

// --- Инициализация таймера ---
let now = new Date();
// Устанавливаем конец смены на 12 часов после начала (для простоты)
const shiftEnd = new Date(now.getTime() + 12 * 3600000); 
var timer = new Timer(now, getShiftBreaks(), shiftEnd);

// --- Обновление перерыва вручную ---
function updateBreak() {
    timer.setBreaks([BreakPeriod.fromStartAndDuration(setTime(Number(brkH.value), Number(brkM.value)), MANUAL_BREAK_DURATION)]);
}
brkH.addEventListener("input", updateBreak);
brkM.addEventListener("input", updateBreak);

// --- Обновление нормы ---
uphGoalInput.addEventListener("input", () => { 
    uphGoal = Number(uphGoalInput.value); 
    if (uphGoal <= 0 || isNaN(uphGoal)) { uphGoal = 1; uphGoalInput.value = 1; } // Защита от 0/NaN
    updateUI(); 
});

// --- Кнопки Пакеты ---
addBtn.addEventListener("click", () => { packagesCount++; updateUI(); });
subBtn.addEventListener("click", () => { if (packagesCount > 0) packagesCount--; updateUI(); });

// --- Кнопка PS (Problem Solve) ---
psBtn.addEventListener("click", () => {
    isPsActive = !isPsActive;
    if (isPsActive) {
        psCounter++;
        psBtn.textContent = "PS (ON)";
        psBtn.style.backgroundColor = '#f99';
    } else {
        psBtn.textContent = "PS";
        psBtn.style.backgroundColor = '#ddf';
    }
    psCountElem.textContent = psCounter;
    updateUI();
});

// --- Кнопка Start ---
startNowBtn.addEventListener("click", () => {
    netWorkTime = 0; 
    breakTime = 0;
    psTime = 0;
    packagesCount = 0;
    psCounter = 0;
    timer.currentTime = new Date();
    timer.isManualBreakActive = false;
    breakToggleBtn.classList.remove('break-active');
    breakToggleBtn.textContent = 'Przerwa';
    isPsActive = false;
    psBtn.textContent = "PS";
    psBtn.style.backgroundColor = '#ddf';
    updateUI();
});

// --- Кнопка Reset ---
resetBtn.addEventListener("click", () => {
    // Сброс всех счётчиков (как startNow, но без сброса таймера)
    netWorkTime = 0; 
    breakTime = 0;
    psTime = 0;
    packagesCount = 0;
    psCounter = 0;
    updateUI();
});

// --- Кнопка Auto Break (Manual Update) ---
manualBreakBtn.addEventListener("click", () => {
    updateBreak();
});


// --- Кнопка Przerwa (Ручной перерыв) ---
breakToggleBtn.addEventListener("click", () => {
    const isNowBreak = timer.isManualBreakActive;
    timer.toggleManualBreak(!isNowBreak);

    if (!isNowBreak) {
        breakToggleBtn.classList.add('break-active');
        breakToggleBtn.textContent = 'PRACA';
    } else {
        breakToggleBtn.classList.remove('break-active');
        breakToggleBtn.textContent = 'Przerwa';
    }
    updateUI();
});


// --- Обработчик таймера ---
function handleTimePass(e) {
    if (e.kind === WORK) netWorkTime += e.elapsed;
    if (e.kind === BREAK) breakTime += e.elapsed;
    if (isPsActive) psTime += e.elapsed; // PS считается как время, проведённое в PS
    
    // В исходном коде PS время не учитывалось, добавляем его в общую логику.
    // Важно: PS-время УЖЕ входит в netWorkTime, поэтому для расчёта НЕТТО-рабочего времени мы его ВЫЧИТАЕМ.
    updateUI();
}

// --- Расчёты и вывод (L) ---
function updateUI() {
    const netWorkingTimeMs = netWorkTime - psTime;
    let hoursWorked = netWorkingTimeMs / 3600000;
    
    // Вывод времени
    fo.value = formatTime(netWorkingTimeMs > 0 ? netWorkingTimeMs : 0);
    mo.textContent = packagesCount;
    psCountElem.textContent = psCounter;

    // Расчёты нормы
    let expected = uphGoal * hoursWorked;
    let speed = hoursWorked > 0 ? packagesCount / hoursWorked : 0;
    
    // Вывод скорости
    speedElem.textContent = speed.toFixed(2);

    // Отклонение от нормы
    let dev = packagesCount - expected;
    devPositiveElem.textContent = dev > 0 ? Math.round(dev) : "0";
    devNegativeElem.textContent = dev < 0 ? Math.round(Math.abs(dev)) : "0";

    // Дополнительный перерыв (Dodatk. przerwa)
    let timeWorkedMinutes = netWorkingTimeMs / 60000;
    let extraTime = speed > uphGoal ? ((speed - uphGoal) / uphGoal) * timeWorkedMinutes : 0;
    extraBreakElem.textContent = Math.round(extraTime);

    // Время догнать норму (Dogonienie (min))
    if (speed > 0 && speed < uphGoal) {
        let packsToCatch = expected - packagesCount;
        let timeToCatch = packsToCatch / speed * 60; // (packs / packs/hour) * 60 min/hour
        timeToCatchElem.textContent = Math.round(timeToCatch);
    } else {
        timeToCatchElem.textContent = "0";
    }
}

// --- Старт ---
timer.addEventListener("time-passed", handleTimePass);
timer.start();
updateBreak(); // Инициализация
updateUI(); // Инициализация
