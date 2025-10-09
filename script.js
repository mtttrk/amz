// Final clean centered tracker with auto-start by first + click
// script.js

// Elements
const elTime = document.getElementById('nt');
const elUnits = document.getElementById('units');
const elUPH = document.getElementById('uph-actual');
const elDevPos = document.getElementById('dev-positive');
const elDevNeg = document.getElementById('dev-negative');
const elExtra = document.getElementById('extra-break');
const elCatch = document.getElementById('time-to-catch');
const addBtn = document.getElementById('add-button');
const normMinusBtn = document.getElementById('norm-minus');
const psBtn = document.getElementById('ps-button');
const psMinusBtn = document.getElementById('ps-minus');
const resetBtn = document.getElementById('reset-button');
const brkH = document.getElementById('brk-h');
const brkM = document.getElementById('brk-m');
const psCountEl = document.getElementById('ps');
const normInput = document.getElementById('norm-input');

// State
let startTime = null;
let packs = 0;
let psCount = 0;
let timerId = null;
let lastAddAt = 0;
let goalPerHour = 23;
const MIN_ADD_INTERVAL = 500; // ms

// Load saved norm if present
try {
  const saved = localStorage.getItem('tracker_norm');
  if (saved !== null) {
    goalPerHour = parseFloat(saved) || goalPerHour;
    normInput.value = goalPerHour;
  } else {
    normInput.value = goalPerHour;
  }
} catch (e) {
  // localStorage might be blocked — silently ignore
  normInput.value = goalPerHour;
}

// Helpers
function pad2(n){ return n.toString().padStart(2,'0'); }
function formatTimeMs(ms){
  if(!isFinite(ms) || ms <= 0) return '0:00';
  const tMin = Math.floor(ms / 60000);
  const h = Math.floor(tMin / 60);
  const m = tMin % 60;
  return `${h}:${pad2(m)}`;
}

function getBreakIntervalForDate(ref){
  const h = Math.max(0, Math.min(23, +brkH.value || 0));
  const m = Math.max(0, Math.min(59, +brkM.value || 0));
  const s = new Date(ref);
  s.setHours(h, m, 0, 0);
  return { start: s, end: new Date(s.getTime() + 30 * 60000) };
}

function overlap(a1,a2,b1,b2){
  return Math.max(0, Math.min(a2,b2) - Math.max(a1,b1));
}

// compute total worked milliseconds excluding the configured 30min break
// considers break of the "current day" and previous day to handle sessions crossing midnight
function computeWorkedMs(now){
  if(!startTime) return 0;
  const s = startTime.getTime();
  const e = now.getTime();
  if(e <= s) return 0;

  const brkCurr = getBreakIntervalForDate(now);
  const brkPrev = getBreakIntervalForDate(new Date(now.getTime() - 86400000)); // previous day same hour

  const overlapMs =
    overlap(s,e,brkCurr.start.getTime(),brkCurr.end.getTime()) +
    overlap(s,e,brkPrev.start.getTime(),brkPrev.end.getTime());

  const worked = Math.max(0, e - s - overlapMs);
  return worked;
}

// Update UI values
function updateAll(){
  const now = new Date();
  const workedMs = computeWorkedMs(now);
  elTime.value = formatTimeMs(workedMs);
  elUnits.textContent = packs;

  const hrs = workedMs / 3600000;
  const uph = hrs > 0 ? packs / hrs : 0;
  elUPH.textContent = uph > 0 ? uph.toFixed(2) : '0.00';

  const expected = goalPerHour * hrs;
  const dev = packs - expected;
  elDevPos.textContent = dev > 0 ? dev.toFixed(1) : '0';
  elDevNeg.textContent = dev < 0 ? Math.abs(dev).toFixed(1) : '0';

  const timeMin = Math.round(workedMs / 60000);
  elExtra.textContent = (uph > goalPerHour) ? Math.round(((uph - goalPerHour) / goalPerHour) * timeMin) : '0';

  if (uph > 0 && uph < goalPerHour) {
    const remaining = Math.max(0, expected - packs); // how many behind expected so far
    const minutesToCatch = Math.ceil((remaining / uph) * 60);
    elCatch.textContent = isFinite(minutesToCatch) ? minutesToCatch : '0';
  } else {
    elCatch.textContent = '0';
  }
}

// Timer control
function startTimer(){
  if(timerId) clearInterval(timerId);
  updateAll();
  timerId = setInterval(updateAll, 1000);
}

// Handlers
addBtn.addEventListener('click', () => {
  const now = Date.now();
  if (now - lastAddAt < MIN_ADD_INTERVAL) return;
  lastAddAt = now;

  if(!startTime){
    startTime = new Date();
    startTimer();
  }
  packs++;
  addBtn.classList.add('pressed');
  setTimeout(() => addBtn.classList.remove('pressed'), 140);
  updateAll();
});

// decrease packs
normMinusBtn.addEventListener('click', () => {
  if (packs > 0) packs--;
  updateAll();
});

// PS counters
psBtn.addEventListener('click', () => { psCount++; psCountEl.textContent = psCount; });
psMinusBtn.addEventListener('click', () => { if(psCount>0) psCount--; psCountEl.textContent = psCount; });

// Reset
resetBtn.addEventListener('click', () => {
  if (timerId) clearInterval(timerId);
  timerId = null;
  startTime = null;
  packs = 0;
  psCount = 0;
  lastAddAt = 0;

  elUnits.textContent = '0';
  elUPH.textContent = '0.00';
  elDevPos.textContent = '0';
  elDevNeg.textContent = '0';
  elExtra.textContent = '0';
  elCatch.textContent = '0';
  elTime.value = '0:00';
  psCountEl.textContent = '0';
});

// norm input — update goalPerHour and persist
normInput.addEventListener('input', () => {
  const v = parseFloat(normInput.value);
  goalPerHour = (isFinite(v) && v > 0) ? v : 0;
  try { localStorage.setItem('tracker_norm', String(goalPerHour)); } catch(e){}
  updateAll();
});

// break inputs trigger update
brkH.addEventListener('input', updateAll);
brkM.addEventListener('input', updateAll);

// initial render
updateAll();