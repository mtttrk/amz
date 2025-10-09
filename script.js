const elTime=document.getElementById('nt');
const elUnits=document.getElementById('units');
const elUPH=document.getElementById('uph-actual');
const elDevPos=document.getElementById('dev-positive');
const elDevNeg=document.getElementById('dev-negative');
const elExtra=document.getElementById('extra-break');
const elCatch=document.getElementById('time-to-catch');
const addBtn=document.getElementById('add-button');
const normMinusBtn=document.getElementById('norm-minus');
const psBtn=document.getElementById('ps-button');
const psMinusBtn=document.getElementById('ps-minus');
const resetBtn=document.getElementById('reset-button');
const brkH=document.getElementById('brk-h');
const brkM=document.getElementById('brk-m');
const psCountEl=document.getElementById('ps');
const normaInput=document.getElementById('norma-input');

let startTime=null,packs=0,psCount=0,timerId=null,lastAddAt=0;
let goalPerHour=+normaInput.value;
const MIN_ADD_INTERVAL=500;

function pad2(n){return n.toString().padStart(2,'0');}
function formatTimeMs(ms){
  if(!isFinite(ms)||ms<=0)return'00:00:00';
  const totalSec=Math.floor(ms/1000);
  const h=Math.floor(totalSec/3600);
  const m=Math.floor((totalSec%3600)/60);
  const s=totalSec%60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

function getBreakIntervalForDate(ref){
  const h=+brkH.value,m=+brkM.value;
  const s=new Date(ref);
  s.setHours(h,m,0,0);
  return{start:s,end:new Date(s.getTime()+30*60000)};
}
function overlap(a1,a2,b1,b2){return Math.max(0,Math.min(a2,b2)-Math.max(a1,b1));}

function computeWorkedMs(now){
  if(!startTime)return 0;
  const s=startTime.getTime(),e=now.getTime();
  if(e<=s)return 0;
  const brk=getBreakIntervalForDate(now),
        brkPrev=getBreakIntervalForDate(new Date(now.getTime()-86400000));
  const overlapMs=overlap(s,e,brk.start.getTime(),brk.end.getTime())+
                  overlap(s,e,brkPrev.start.getTime(),brkPrev.end.getTime());
  return Math.max(0,e-s-overlapMs);
}

function updateAll(){
  const now=new Date();
  const workedMs=computeWorkedMs(now);
  elTime.value=formatTimeMs(workedMs);
  elUnits.textContent=packs;
  const hrs=workedMs/3600000;
  const uph=hrs>0?packs/hrs:0;
  elUPH.textContent=uph.toFixed(2);
  const expected=goalPerHour*hrs;
  const dev=packs-expected;
  elDevPos.textContent=dev>0?dev.toFixed(1):'0';
  elDevNeg.textContent=dev<0?Math.abs(dev).toFixed(1):'0';
  const timeMin=Math.round(workedMs/60000);
  elExtra.textContent=uph>goalPerHour?Math.round(((uph-goalPerHour)/goalPerHour)*timeMin):'0';
  if(uph>0&&uph<goalPerHour){
    const remaining=Math.max(0,expected-packs);
    const minutesToCatch=Math.ceil((remaining/uph)*60);
    elCatch.textContent=isFinite(minutesToCatch)?minutesToCatch:'0';
  }else elCatch.textContent='0';
}

function startTimer(){if(timerId)clearInterval(timerId);timerId=setInterval(updateAll,1000);}

addBtn.addEventListener('click',()=>{
  const now=Date.now();
  if(now-lastAddAt<MIN_ADD_INTERVAL)return;
  lastAddAt=now;
  if(!startTime){startTime=new Date();startTimer();}
  packs++;
  updateAll();
});

normMinusBtn.addEventListener('click',()=>{if(packs>0)packs--;updateAll();});
psBtn.addEventListener('click',()=>{psCount++;psCountEl.textContent=psCount;});
psMinusBtn.addEventListener('click',()=>{if(psCount>0)psCount--;psCountEl.textContent=psCount;});

resetBtn.addEventListener('click',()=>{
  if(timerId)clearInterval(timerId);
  startTime=null;packs=0;psCount=0;
  elUnits.textContent='0';elUPH.textContent='0.00';
  elDevPos.textContent='0';elDevNeg.textContent='0';
  elExtra.textContent='0';elCatch.textContent='0';
  elTime.value='00:00:00';psCountEl.textContent='0';
});

brkH.addEventListener('input',updateAll);
brkM.addEventListener('input',updateAll);
normaInput.addEventListener('input',()=>{goalPerHour=+normaInput.value||0;updateAll();});