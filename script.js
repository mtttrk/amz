var t = "work", y = "break";
var b = (hour, min) => { let d = new Date(); d.setHours(hour, min, 0, 0); return d; };

class d extends EventTarget {
    #o = null; #r = []; #i = 0; #s = "work"; #c = null; #m = null;
    constructor(o, i, r){super(); this.#c=o; this.#r=i; this.#m=r;}
    start(){ if(this.#o!==null) clearInterval(this.#o); this.intervalId=setInterval(()=>{this.#h()},1000);}
    setBreaks(o){this.#r=o;}
    #h(){this.#f();}
    #f(){
        let now=new Date(), i=this.#i, r=this.#r[this.#i]; if(!r) return;
        if(this.#c<r.start && now>=r.start){ this.dispatchElapsed(r.start,"break"); this.#f(); return; }
        if(this.#c<r.end && now>=r.end){ this.dispatchElapsed(r.end,"work"); if(this.#i<this.#r.length-1)this.#i+=1; this.#f(); return; }
    }
    getElapsed(now){return now-this.#c;}
    dispatchElapsed(o, kind){ let r=new Date(Math.min(o.getTime(),this.#m.getTime())), elapsed=this.getElapsed(r), event=new j(elapsed,this.#s); this.dispatchEvent(event); this.#c=r; this.#s=kind; }
}

class e { constructor(o,i){this.start=o; this.end=i;} static fromStartAndDuration(o, mins){return new e(o,new Date(o.getTime()+mins*60000));} }
class j extends Event{ #o; #r; constructor(elapsed, kind){super("time-passed"); this.#o=elapsed; this.#r=kind;} get elapsed(){return this.#o;} get kind(){return this.#r;}}

// ---- Автоматическое определение смены и перерывов ----
var shiftLabel = document.getElementById("current-shift");
var currentShift = "";
function getShiftStartAndBreaks() {
    let now = new Date(), hour=now.getHours(), minute=now.getMinutes();
    let start=new Date(); start.setSeconds(0,0); 
    let breaks=[];
    if((hour>6 && hour<16) || (hour===6 && minute>=0) || (hour===16 && minute<=30)){
        start.setHours(6,0); currentShift="Dzienna"; breaks.push(e.fromStartAndDuration(b(12,30),30));
    } else {
        start.setHours(17,30); 
        if(hour<4 || (hour===4 && minute===0)) start.setDate(start.getDate()-1);
        currentShift="Nocna"; breaks.push(e.fromStartAndDuration(b(22,15),30));
    }
    if(shiftLabel) shiftLabel.textContent=currentShift;
    return {start, breaks};
}

var {start, breaks} = getShiftStartAndBreaks();
var f = new d(start, breaks, new Date(start.getTime()+12*3600*1000));

// ---- Подключение элементов ----
var n=document.getElementById("log"), io=document.getElementById("timer"), co=document.getElementById("timer-uph-dev"),
a=document.getElementById("uph-goal"), w=a.value, O=1/w;
a.addEventListener("input",()=>{ w=a.value; O=1/w; L(); });

var fo=document.getElementById("nt"), so=document.getElementById("bt"), mo=document.getElementById("uph"),
ho=document.getElementById("udev"), go=document.getElementById("units"), to=document.getElementById("ps"),
bo=document.getElementById("tdev"), l=document.getElementById("add-button"), eo=document.getElementById("problem-button"),
no=document.getElementById("sub-button"), devPositiveElem=document.getElementById("dev-positive"),
devNegativeElem=document.getElementById("dev-negative"), extraBreakElem=document.getElementById("extra-break"),
timeToCatchElem=document.getElementById("time-to-catch");

var A=0, X=0, s=0, Y=0;
var C=document.getElementById("units-force"); C.addEventListener("input",()=>{s=Number(C.value); L();});

// ---- Кнопки ----
l.addEventListener("click",()=>{s+=1; f.dispatchElapsed(new Date(), t);});
eo.addEventListener("click",()=>{Y+=1; f.dispatchElapsed(new Date(), t);});
no.addEventListener("click",()=>{s-=1; f.dispatchElapsed(new Date(), t);});

// ---- Основной расчёт ----
var L=()=>{
    C.value=s; fo.value=A; so.value=X; go.textContent=s;
    let hoursWorked=A/3600000, expected=w*hoursWorked, dev=s-expected;
    let speed = s/hoursWorked; mo.textContent=isFinite(speed)?speed.toFixed(2):"0";
    
    // Разделение отклонений
    if(dev>0){ devPositiveElem.textContent=dev.toFixed(1); devNegativeElem.textContent="0"; }
    else if(dev<0){ devPositiveElem.textContent="0"; devNegativeElem.textContent=Math.abs(dev).toFixed(1); }
    else{ devPositiveElem.textContent="0"; devNegativeElem.textContent="0"; }

    // Дополнительное время на перерыв
    extraBreakElem.textContent = dev>0 ? (dev/w*60).toFixed(0) : "0";

    // Время до догоняния нормы
    if(speed < w && speed>0){ 
        let remaining = expected - s;
        let timeToCatch = remaining / speed;
        timeToCatchElem.textContent = (timeToCatch*60).toFixed(0);
    } else timeToCatchElem.textContent = "0";

    ho.value=dev.toFixed(1); bo.value=(O*dev).toFixed(2); to.textContent=Y;
    l.classList.add("warn"); setTimeout(()=>{l.classList.remove("warn");},1100);
};

// ---- Таймер ----
f.addEventListener("time-passed",(e)=>{
    let minutes=(e.elapsed/60000).toFixed(2);
    switch(e.kind){case t:A+=e.elapsed; n.textContent=`W ${minutes}m\n${n.textContent}`; break;
                     case y:X+=e.elapsed; n.textContent=`B ${minutes}m\n${n.textContent}`; break;}
    L();
});

setInterval(()=>{
    let elapsed=f.getElapsed(new Date())+1;
    io.value=elapsed;
    let c=1/(elapsed/3600000)-w;
    co.value=Math.round(c);
},100);

// ---- Запуск таймера ----
f.start();