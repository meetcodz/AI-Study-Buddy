lucide.createIcons();

const MODES = {
  study: { dur: 1500, col: '#14B8A6', label: 'Focus', btnText: 'Start Focus', rgb: '20,184,166' },
  short: { dur: 300,  col: '#8B5CF6', label: 'Short Break', btnText: 'Start Break', rgb: '139,92,246' },
  long:  { dur: 900,  col: '#F59E0B', label: 'Long Break', btnText: 'Start Break', rgb: '245,158,11' },
};

let mode = 'study';
let left = 1500;
let running = false;
let sessions = 3;
let focusMin = 75;
let iv = null;
const CIRC = 1131;

const arc = document.getElementById('timer-arc');
const disp = document.getElementById('timer-display');
const btn = document.getElementById('timer-toggle');
const status = document.getElementById('timer-status');
const lbl = document.getElementById('timer-mode-label');

const pad = n => String(n).padStart(2, '0');
const fmtMs = s => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;

function renderSessions() {
  const row = document.getElementById('sess-row');
  row.innerHTML = '';
  for(let i=0; i<8; i++) {
    const d = document.createElement('div');
    const f = i < sessions;
    d.className = 'sess-dot';
    d.style.background = f ? (i%4===3 ? '#F59E0B' : '#14B8A6') : '#1A2035';
    row.appendChild(d);
  }
  document.getElementById('sess-count').textContent = sessions;
  const h = Math.floor(focusMin / 60);
  document.getElementById('focus-time').textContent = h > 0 ? `${h}h ${focusMin%60}m` : `${focusMin%60}m`;
 
  
  const b = document.getElementById('head-mode-badge');
  b.innerHTML = `<i data-lucide="${mode==='study'?'brain':(mode==='long'?'sunset':'coffee')}" style="width:14px;height:14px;"></i> ${MODES[mode].label}`;
  b.style.color = MODES[mode].col;
  b.style.borderColor = `rgba(${MODES[mode].rgb},0.25)`;
  b.style.background = `rgba(${MODES[mode].rgb},0.1)`;
  lucide.createIcons();
}

function ui() {
  const M = MODES[mode];
  const pct = left / M.dur;
  
  arc.setAttribute('stroke-dashoffset', CIRC * (1 - pct));
  arc.setAttribute('stroke', M.col);
  disp.textContent = fmtMs(left);
  lbl.textContent = M.label;
  lbl.style.color = M.col;
  
  status.style.opacity = running ? '1' : '0';
  status.style.color = M.col;
  
  if(running) {
    btn.innerHTML = `<i data-lucide="pause" style="fill:${M.col}"></i> Pause`;
    btn.style.cssText = `background:rgba(${M.rgb},0.15); color:${M.col}; border:1.5px solid ${M.col}; box-shadow:none; flex:1; height:54px; border-radius:14px; font-family:'Outfit',sans-serif; font-size:16px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all 0.2s;`;
    arc.parentElement.style.filter = `drop-shadow(0 0 32px rgba(${M.rgb},0.4))`;
  } else {
    btn.innerHTML = `<i data-lucide="play" style="fill:#0A0C12"></i> ${M.btnText}`;
    btn.style.cssText = `background:${M.col}; color:#0A0C12; border:none; box-shadow:0 4px 20px rgba(${M.rgb},0.3); flex:1; height:54px; border-radius:14px; font-family:'Outfit',sans-serif; font-size:16px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all 0.2s;`;
    arc.parentElement.style.filter = `drop-shadow(0 0 24px rgba(${M.rgb},0.15))`;
  }
  lucide.createIcons();
}

function tick() {
  left--;
  if(left <= 0) {
    left = 0; running = false; clearInterval(iv); iv = null;
    if(mode==='study') { sessions++; focusMin+=25; }
    renderSessions();
  }
  ui();
}

btn.onclick = () => {
  running = !running;
  if(running) iv = setInterval(tick, 1000);
  else { clearInterval(iv); iv = null; }
  ui();
};

document.getElementById('timer-reset').onclick = () => {
  running = false; clearInterval(iv); iv = null; left = MODES[mode].dur; ui();
};

document.getElementById('timer-skip').onclick = () => {
  running = false; clearInterval(iv); iv = null;
  if(mode==='study') { sessions++; focusMin += Math.round((MODES.study.dur - left)/60); }
  left = 0; ui(); renderSessions();
  setTimeout(() => { left = MODES[mode].dur; ui(); }, 600);
};

document.querySelectorAll('.tab-btn').forEach(t => {
  t.onclick = () => {
    running = false; clearInterval(iv); iv = null;
    mode = t.dataset.mode; left = parseInt(t.dataset.dur);
    document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active'); b.style.color = '#8892A4'; b.style.background = 'transparent'; b.style.boxShadow = 'none'; });
    t.classList.add('active');
    t.style.color = MODES[mode].col; t.style.background = '#161D2C'; t.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
    renderSessions(); ui();
  };
});

renderSessions();
ui();
