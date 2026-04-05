lucide.createIcons();

const DATA = {
  heatmap: (function(){
    const d = {};
    const today = new Date();
    const pat = [
      14,18,22,16,0,8,5,   20,17,25,19,0,12,6,
      0,15,21,18,24,0,9,   16,22,19,0,28,14,7,
      12,0,20,23,17,11,0,  18,16,24,20,0,15,8,
      0,22,19,26,17,0,11,  14,20,0,23,18,16,9,
      0,17,21,24,0,19,13,  22,18,0,25,20,14,7,
      15,0,23,21,18,0,12,  0,19,22,17,24,0,10,
      16,21,0,25,19,15,8,  0,20,18,22,0,17,11,
      18,14,0,21,23,16,0,  22,19,25,0,18,13,7,
      0,16,20,24,18,0,11,  19,23,17,0,26,14,8,
      15,0,22,20,18,14,0,  21,17,24,0,19,15,9,
      0,18,23,21,0,17,12,  22,16,0,24,20,13,7,
      14,19,0,23,18,16,0,  20,22,17,25,0,14,9,
      0,18,21,24,0,19,11,  17,23,0,22,18,15,8,
      16,0,24,20,0,18,12,  22,17,25,0,20,14,8,
      0,19,21,18,24,0,11,  16,22,0,25,19,15,7,
      18,14,0,22,20,17,0,  23,18,26,0,21,13,8,
    ];

    let longPat = [];
    for(let i=0; i<4; i++) longPat = longPat.concat(pat);

    for(let i=0;i<longPat.length;i++){
      const dt = new Date(today);
      dt.setDate(today.getDate() - i);
      d[dt.toISOString().slice(0,10)] = longPat[i] || 0;
    }
    return d;
  })(),
};

const MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const today = new Date();

function heatColor(n, max){
  if(!n) return '#101622';
  const t = n / max;
  if(t < .15) return '#134e4a';
  if(t < .35) return '#0f766e';
  if(t < .55) return '#0d9488';
  if(t < .75) return '#14B8A6';
  return '#5eead4';
}

function buildHeatmap(numWeeks){
  const grid = document.getElementById('heat-grid');
  const mRow = document.getElementById('month-row');
  grid.innerHTML = '';
  mRow.innerHTML = '';

  const start = new Date(today);
  start.setDate(today.getDate() - (numWeeks*7) - today.getDay());
  const max = Math.max(...Object.values(DATA.heatmap), 1);

  const weeks = [];
  for(let w=0; w<numWeeks; w++){
    const wk=[];
    for(let d=0; d<7; d++){
      const dt=new Date(start);
      dt.setDate(start.getDate()+w*7+d);
      if(dt<=today){const k=dt.toISOString().slice(0,10); wk.push({dt,k,n:DATA.heatmap[k]||0});}
      else wk.push(null);
    }
    weeks.push(wk);
  }

  let lastM=-1;
  weeks.forEach((wk,wi)=>{
    const f=wk.find(c=>c);
    if(!f)return;
    const m=f.dt.getMonth();
    if(m!==lastM){
      lastM=m;
      const lbl=document.createElement('div');
      lbl.className='month-lbl';
      lbl.textContent=MN[m];
      const pct=(wi/numWeeks)*100;
      lbl.style.left=`calc(${pct}%)`;
      mRow.appendChild(lbl);
    }
  });

  weeks.forEach((wk,wi)=>{
    const col=document.createElement('div');
    col.className='week-col';
    wk.forEach((day,di)=>{
      const cell=document.createElement('div');
      cell.className='hcell';
      cell.style.background = day ? heatColor(day.n, max) : 'transparent';
      if(!day) { cell.style.visibility = 'hidden'; }

      if(day){
        cell.onclick = () => {
          document.querySelectorAll('.hcell').forEach(c=>c.classList.remove('active-cell'));
          cell.classList.add('active-cell');
          showDetails(day);
        };
      }
      col.appendChild(cell);
    });
    grid.appendChild(col);
  });
}

function showDetails(day) {
  document.getElementById('unselected-state').style.display = 'none';
  const det = document.getElementById('detail-container');
  det.style.display = 'flex';
  det.style.animation = 'none';
  det.offsetHeight;
  det.style.animation = 'slideInFade 0.4s cubic-bezier(0.22,1,0.36,1) forwards';

  const dateStr = `${DAYS[day.dt.getDay()]}, ${MONTHS[day.dt.getMonth()]} ${day.dt.getDate()}, ${day.dt.getFullYear()}`;
  document.getElementById('dt-date').textContent = dateStr;
  document.getElementById('dt-vol').textContent = day.n;

  if(day.n === 0) {
    document.getElementById('db-math').textContent = 0; document.getElementById('db-phy').textContent = 0; document.getElementById('db-chem').textContent = 0;
  } else {
    document.getElementById('db-math').textContent = Math.round(day.n * 0.5);
    document.getElementById('db-phy').textContent = Math.round(day.n * 0.3);
    document.getElementById('db-chem').textContent = day.n - Math.round(day.n * 0.5) - Math.round(day.n * 0.3);
  }
}

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.remove('active');
      const iIcon = b.querySelector('i:last-child');
      const svgIcon = b.querySelector('svg:last-child');
      if (iIcon) iIcon.style.opacity = '0';
      if (svgIcon) svgIcon.style.opacity = '0';
    });
    btn.classList.add('active');

    const iIcon = btn.querySelector('i:last-child');
    const svgIcon = btn.querySelector('svg:last-child');
    if (iIcon) iIcon.style.opacity = '1';
    if (svgIcon) svgIcon.style.opacity = '1';

    const w = parseInt(btn.dataset.w);

    const wrap = document.getElementById('heatmap-wrap');
    wrap.style.opacity = '0';
    setTimeout(() => {
      buildHeatmap(w);
      wrap.style.opacity = '1';
    }, 400);
  };
});

let tot=0, act=0;
Object.values(DATA.heatmap).forEach(v=>{tot+=v; if(v>0)act++;});
document.getElementById('s-tot').textContent = tot.toLocaleString();
document.getElementById('s-act').textContent = act.toLocaleString();

buildHeatmap(26);
