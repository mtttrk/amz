var t="work", y="break";
var b=(h,m)=>{let d=new Date(); d.setHours(h,m,0,0); return d;};

// Таймер
class d extends EventTarget{
  constructor(startTime, breaks, endTime){
    super();
    this.startTime=startTime;
    this.breaks=breaks;
    this.endTime=endTime;
    this.currentTime=startTime;
    this.intervalId=null;
    this.currentKind="work";
    this.currentBreakIndex=0;
    this.totalWork=0;
    this.totalBreak=0;
  }
  start(){
    if(this.intervalId) clearInterval(this.intervalId);
    this.intervalId=setInterval(()=>this.tick(),1000);
  }
  setBreaks(breaks){this.breaks=breaks; this.currentBreakIndex=0;}
  tick(){
    let now=new Date();
    let brk=this.breaks[this.currentBreakIndex];
    if(brk){
      if(this.currentTime<brk.start && now>=brk.start) this.dispatchElapsed(brk.start,y);
      else if(this.currentTime<brk.end && now>=brk.end){
        this.dispatchElapsed(brk.end,t);
        if(this.currentBreakIndex<this.breaks.length-1) this.currentBreakIndex++;
      }
    }
  }
  getElapsed(now){return now-this.currentTime;}
  dispatchElapsed(time,kind){
    let limitedTime=new Date(Math.min(time.getTime(),this.endTime.getTime()));
    let elapsed=this.getElapsed(limitedTime);
    let event=new j(elapsed,this.currentKind);
    this.dispatchEvent(event);
    this.currentTime=limitedTime;
    this.currentKind=kind;
  }
}

// Перерывы
class e{
  constructor(start,end){this.start=start; this.end=end;}
  static fromStartAndDuration(start,mins){return new e(start,new Date(start.getTime()+mins*60000));}
}

// Событие
class j extends Event{
  constructor(elapsed,kind){super("time-passed"); this._elapsed=elapsed; this._kind=kind;}
  get elapsed(){return this._elapsed;}
  get kind(){return this._kind;}
}

// DOM
var fo=document.getElementById("nt"),
    brkH=document.getElementById("brk2-h"),
    brkM=document.getElementById("brk2-m"),
    mo=document.getElementById("units"),
    uphGoalInput=document.getElementById("uph-goal"),
    to=document.getElementById("ps"),
    devPositiveElem=document.getElementById("dev-positive"),
    devNegativeElem=document.getElementById("dev-negative"),
    extraBreakElem=document.getElementById("extra-break"),
    timeToCatchElem=document.getElementById("time-to-catch"),
    addBtn=document.getElementById("add-button"),
    subBtn=document.getElementById("sub-button"),
    psBtn=document.getElementById("problem-button"),
    startNowBtn=document.getElementById("start-now-button"),
    shiftLabel=document.getElementById("current-shift");

var A=0,X=0,s=0,Y=0;
var w=uphGoalInput.value,O=1/w;

// Обновление смены
function updateShift(){
  let now=new Date(), h=now.getHours(), m=now.getMinutes();
  if((h>6 && h<16)||(h===6 && m>=0)||(h===16 && m<=30)) shiftLabel.textContent="Dzienna";
  else shiftLabel.textContent="Nocna";
}
setInterval(updateShift,60000);
updateShift();

// Определяем старт и перерывы
function getShiftStartAndBreaks(){
  let now=new Date(),h=now.getHours(),m=now.getMinutes();
  let start=new Date(); start.setSeconds(0,0);
  let breaks=[];
  if((h>6 && h<16)||(h===6 && m>=0)||(h===16 && m<=30)){
    start.setHours(6,0);
    breaks.push(e.fromStartAndDuration(b(12,30),30));
  } else {
    start.setHours(17,30);
    if(h<4||(h===4 && m===0)) start.setDate(start.getDate()-1);
    breaks.push(e.fromStartAndDuration(b(22,15),30));
  }
  return {start,breaks};
}

// Таймер
var {start,breaks}=getShiftStartAndBreaks();
var f=new d(start,breaks,new Date(start.getTime()+12*3600000));

// Обновление перерыва
function updateBreak(){f.setBreaks([e.fromStartAndDuration(b(Number(brkH.value),Number(brkM.value)),30)]);}
brkH.addEventListener("input",updateBreak);
brkM.addEventListener("input",updateBreak);

// Цель
uphGoalInput.addEventListener("input",()=>{w=uphGoalInput.value;O=1/w;L();});

// Кнопки
addBtn.addEventListener("click",()=>{s++; f.dispatchElapsed(new Date(),t);});
subBtn.addEventListener("click",()=>{s--; f.dispatchElapsed(new Date(),t);});
psBtn.addEventListener("click",()=>{Y++; to.textContent=Y;});

// Rozpocznij od teraz
startNowBtn.addEventListener("click",()=>{
  let now=new Date();
  let currentUnits=s,currentPS=Y;
  f=new d(now,breaks,new Date(now.getTime()+12*3600000));
  A=0; X=0; s=currentUnits; Y=currentPS;
  f.addEventListener("time-passed",handleTick);
  f.start();
  L();
});

// Тик
function handleTick(e){
  if(e.kind===t) A+=e.elapsed;
  if(e.kind===y) X+=e.elapsed;
  L();
}

// Расчёты
function L(){
  fo.value=(A/3600000).toFixed(2);
  mo.textContent=s;
  to.textContent=Y;

  let hoursWorked=A/3600000,
      expected=w*hoursWorked,
      dev=s-expected,
      speed=hoursWorked>0?s/hoursWorked:0;

  devPositiveElem.textContent=dev>0?dev.toFixed(1):"0";
  devNegativeElem.textContent=dev<0?Math.abs(dev).toFixed(1):"0";

  let timeWorkedMinutes=A/60000;
  let extraTime=speed>w?((speed-w)/w)*timeWorkedMinutes:0;
  extraBreakElem.textContent=Math.round(extraTime);

  if(speed>0 && speed<w) timeToCatchElem.textContent=Math.round((expected-s)/speed*60);
  else timeToCatchElem.textContent="0";
}

f.addEventListener("time-passed",handleTick);
f.start();
L();
