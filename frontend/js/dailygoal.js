lucide.createIcons();

const DATA = { done: 7, goal: 20, history: [ {d:'Yesterday', s:20, g:20}, {d:'Mon', s:25, g:20}, {d:'Sun', s:10, g:15}, {d:'Sat', s:18, g:18}, {d:'Fri', s:22, g:20} ] };

let done = DATA.done;
let goal = DATA.goal;
const CIRC = 1256.6;

function render() {
  const pct = Math.min(done / goal, 1);
  const met = done >= goal;
  const col = met ? '#F59E0B' : '#14B8A6';
  
  document.getElementById('g-arc').setAttribute('stroke-dashoffset', CIRC * (1 - pct));
  document.getElementById('g-arc').setAttribute('stroke', col);
  document.getElementById('g-pct').textContent = Math.round(pct * 100) + '%';
  document.getElementById('g-pct').style.color = col;

  if (met) {
    document.getElementById('g-headline').innerHTML = 'Goal crushed! <i data-lucide="party-popper" style="width: 20px; height: 20px; display: inline-block; vertical-align: middle;"></i>';
    document.getElementById('g-sub').textContent = 'Amazing work today.';
  } else {
    document.getElementById('g-headline').textContent = `${goal - done} questions to go`;
    document.getElementById('g-sub').textContent = `Keep going, you're ${Math.round(pct * 100)}% there`;
  }

  document.getElementById('g-done').textContent = done;
  document.getElementById('g-goal-disp').textContent = goal;
  if(window.lucide) lucide.createIcons();
}

document.getElementById('g-minus').onclick = () => { if(done>0) { done--; render(); } };
document.getElementById('g-plus').onclick = () => { done++; render(); };

document.getElementById('g-edit-btn').onclick = () => {
  document.getElementById('g-view').style.display = 'none';
  document.getElementById('g-edit-form').style.display = 'flex';
  document.getElementById('g-inp').focus();
};
document.getElementById('g-save').onclick = () => {
  const v = parseInt(document.getElementById('g-inp').value);
  if(v>0) goal = v;
  document.getElementById('g-view').style.display = 'flex';
  document.getElementById('g-edit-form').style.display = 'none';
  render();
};
document.getElementById('g-cancel').onclick = () => {
  document.getElementById('g-view').style.display = 'flex';
  document.getElementById('g-edit-form').style.display = 'none';
};


let histHtml = '';
DATA.history.forEach(h => {
  const met = h.s >= h.g;
  const pct = Math.min(h.s / h.g, 1);
  histHtml += `
    <div class="hc-item">
      <div class="hc-date">${h.d}</div>
      <div class="hc-bars">
        <div class="hc-bar" style="width:${pct*100}%; background:${met?'#14B8A6':'#3B82F6'};"></div>
      </div>
      <div class="hc-score mono ${met?'met':'miss'}">${h.s}</div>
    </div>
  `;
});
document.getElementById('hist-list').innerHTML = histHtml;

render();
