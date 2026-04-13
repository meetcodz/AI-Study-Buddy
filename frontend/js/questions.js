const MOCK_DATA = {
  tags: [{id:1, name:'Core'}, {id:2, name:'Advanced'}, {id:3, name:'Theory'}],
  chapters: [{id:1, name:'Thermodynamics'}, {id:2, name:'Calculus'}, {id:3, name:'Organic Chemistry'}],
  topics: [{id:1, name:'General'}], // Will dynamically populate
  questions: []
};

// Map Django model keys to UI keys
function mapBackendQuestion(q) {
  return {
    id: q.id,
    difficulty: q.difficulty,
    chapter: q.topic_name || 'General',
    topic: q.topic_name || 'General',
    tags: ['Core'],
    text: q.text,
    expected_time: q.expected_time_seconds,
    last_correct: q.last_correct,
    last_time: q.last_time || 0,
    choices: q.options.map((opt, i) => [String.fromCharCode(65+i), opt]),
    correct: String.fromCharCode(65 + q.options.indexOf(q.correct_answer)),
    correct_text: q.correct_answer,
    attempts: []
  };
}

function renderFilters() {
  const c = document.getElementById('filters-container');
  c.innerHTML = `
    <div class="filter-grid">
      <label class="filter-field">
        <span class="filter-label">Difficulty</span>
        <div class="select-wrap">
          <select id="filt-diff">
            <option value="">All</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
          <svg class="select-arrow" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
      </label>
      
      <label class="filter-field">
        <span class="filter-label">Tag</span>
        <div class="select-wrap">
          <select id="filt-tag">
            <option value="">All tags</option>
            ${MOCK_DATA.tags.map(t=>`<option value="${t.name}">${t.name}</option>`).join('')}
          </select>
          <svg class="select-arrow" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
      </label>

      <label class="filter-field">
        <span class="filter-label">Chapter</span>
        <div class="select-wrap">
          <select id="filt-chap">
            <option value="">All chapters</option>
            ${MOCK_DATA.chapters.map(ch=>`<option value="${ch.name}">${ch.name}</option>`).join('')}
          </select>
          <svg class="select-arrow" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
      </label>
      
      <label class="filter-field">
        <span class="filter-label">Topic</span>
        <div class="select-wrap">
          <select id="filt-top">
            <option value="">All topics</option>
            ${MOCK_DATA.topics.map(t=>`<option value="${t.name}">${t.name}</option>`).join('')}
          </select>
          <svg class="select-arrow" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
      </label>
      
      <label class="filter-field">
        <span class="filter-label">Attempts</span>
        <div class="select-wrap">
          <select id="filt-att">
            <option value="">All attempts</option>
            <option value="correct">Correct</option>
            <option value="wrong">Wrong</option>
            <option value="unseen">Unseen</option>
          </select>
          <svg class="select-arrow" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
      </label>

      <label class="filter-field" style="justify-content: flex-end;">
        <span class="filter-label" style="margin-bottom:6px">Timing</span>
        <label class="toggle-wrap">
          <input type="checkbox" id="filt-slow" class="toggle-input">
          <span class="toggle-track"><span class="toggle-thumb"></span></span>
          <span class="toggle-text">Took more than expected</span>
        </label>
      </label>
    </div>
    <div class="filter-actions">
      <button class="btn btn-primary" id="btn-filter"><i data-lucide="filter" style="width:16px;height:16px"></i> Filter</button>
      <button class="btn btn-ghost" id="btn-reset">Reset</button>
    </div>
  `;
}

function renderQuestions(listToRender) {
  const c = document.getElementById('questions-list-container');
  let html = '';
  
  if(listToRender.length === 0) {
    html = `
      <div style="text-align:center; padding: 64px 24px; color: var(--color-text-muted);">
        <i data-lucide="inbox" style="width:36px;height:36px; opacity:0.4; margin:0 auto 16px;"></i>
        <p style="font-size:1.1rem; font-weight:700; color:var(--color-text-secondary); margin-bottom:6px;">No questions found</p>
        <p style="font-size:0.85rem">Try adjusting your filters above.</p>
      </div>
    `;
  } else {
    listToRender.forEach((q, i) => {
      let statCls = 'qcard--unseen';
      if (q.last_correct !== null) statCls = q.last_correct ? 'qcard--correct' : 'qcard--wrong';
      let diffLow = String(q.difficulty).toLowerCase();
      
      html += `
        <article class="qcard ${statCls}" style="animation-delay: ${Math.min(i*50, 500)}ms">
          <div class="qcard-bar"></div>
          <div class="qcard-trigger">
            <div class="qcard-head">
              <div class="qcard-id">
                <span class="qcard-num">Q${q.id}</span>
                <span class="diff-badge diff-badge--${diffLow}">${q.difficulty}</span>
              </div>
              <div class="qcard-badges">
                ${q.tags.map(t=>`<span class="tag-chip">${t}</span>`).join('')}
                <span class="qcard-chevron"><i data-lucide="chevron-down" style="width:18px;height:18px"></i></span>
              </div>
            </div>
            <p class="qcard-text">${q.text}</p>
            <div class="qcard-meta">
              <span class="meta-item"><i data-lucide="book-open" style="width:14px;height:14px"></i> ${q.chapter}</span>
              <span class="meta-sep">›</span>
              <span class="meta-item">${q.topic}</span>
              <span class="meta-sep">·</span>
              <span class="meta-item"><i data-lucide="clock" style="width:14px;height:14px"></i> ${q.expected_time}s expected</span>
              ${q.last_correct !== null ? `
                <span class="meta-sep">·</span>
                <span class="perf-tag ${q.last_correct ? 'perf-tag--ok' : 'perf-tag--fail'}">
                  <span class="perf-status">${q.last_correct ? 'Correct' : 'Wrong'}</span>
                  <span class="perf-time ${q.last_time > q.expected_time ? 'perf-time--slow' : ''}">${q.last_time}s</span>
                </span>
              ` : ''}
            </div>
          </div>
          <div class="qcard-body">
            <div class="qcard-body-inner">
              <div class="options-label">Options</div>
              <ul class="options-list">
                ${q.choices.map(ch => `
                  <li class="option-item" data-letter="${ch[0]}">${ch[1]}</li>
                `).join('')}
              </ul>
              <div class="spoiler-wrap">
                <button class="spoiler-btn"><i data-lucide="eye" style="width:14px;height:14px"></i> Reveal Answer</button>
                <div class="spoiler-content">
                  <i data-lucide="check-circle" style="width:16px;height:16px"></i>
                  <strong>${q.correct}</strong> — ${q.correct_text}
                </div>
              </div>
              ${q.attempts.length > 0 ? `
                <details class="attempts-details">
                   <summary class="attempts-summary">
                     <i data-lucide="history" style="width:14px;height:14px"></i> ${q.attempts.length} attempt(s)
                   </summary>
                   <div class="attempts-list">
                     ${q.attempts.map(a => `
                        <div class="attempt-row ${a.correct ? 'attempt-row--ok' : 'attempt-row--fail'}">
                           <span class="attempt-verdict"><i data-lucide="${a.correct ? 'check' : 'x'}" style="width: 12px; height: 12px;"></i></span>
                           <span class="attempt-date">${a.date}</span>
                           <span class="attempt-time">${a.time}s</span>
                        </div>
                     `).join('')}
                   </div>
                </details>
              ` : `<div class="meta-item" style="margin-top:12px;border-top:1px solid var(--color-glass-border);padding-top:12px">No attempts yet</div>`}
            </div>
          </div>
        </article>
      `;
    });
  }
  
  c.innerHTML = html;
  if(window.lucide) lucide.createIcons();
  
  document.getElementById('q-stats-container').innerHTML = `
    <span class="q-count-pill">
      <span class="pip-dot"></span>
      ${listToRender.length} Question${listToRender.length !== 1 ? 's' : ''}
    </span>
  `;

  attachInteractions();
}

function attachInteractions() {
  document.querySelectorAll('.qcard-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const card = trigger.closest('.qcard');
      const body = card.querySelector('.qcard-body');
      const isOpen = card.classList.toggle('is-open');
      if (isOpen) {
        body.style.height = body.scrollHeight + 'px';
      } else {
        body.style.height = '0';
      }
    });
  });

  document.querySelectorAll('.spoiler-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const content = btn.nextElementSibling;
      const opts = btn.closest('.qcard-body-inner').querySelectorAll('.option-item');
      const correctAttr = content.querySelector('strong').textContent.trim();
      
      content.style.display = 'inline-flex';
      btn.style.display = 'none';
      
      opts.forEach(o => {
        if(o.getAttribute('data-letter') === correctAttr) o.classList.add('correct');
      });
    });
  });
}

function applyFilters() {
  const diffVal = document.getElementById('filt-diff').value;
  const tagVal = document.getElementById('filt-tag').value;
  const chapVal = document.getElementById('filt-chap').value;
  const topVal = document.getElementById('filt-top').value;
  const attVal = document.getElementById('filt-att').value;
  const slowVal = document.getElementById('filt-slow').checked;

  let filtered = MOCK_DATA.questions.filter(q => {
    if(diffVal && String(q.difficulty).toLowerCase() !== diffVal.toLowerCase()) return false;
    if(tagVal && !q.tags.includes(tagVal)) return false;
    if(chapVal && String(q.chapter).toLowerCase() !== chapVal.toLowerCase()) return false;
    if(topVal && String(q.topic).toLowerCase() !== topVal.toLowerCase()) return false;
    
    if(attVal === 'correct' && q.last_correct !== true) return false;
    if(attVal === 'wrong' && q.last_correct !== false) return false;
    if(attVal === 'unseen' && q.last_correct !== null) return false;

    if(slowVal && (q.last_time === null || q.last_time <= q.expected_time)) return false;

    return true;
  });

  renderQuestions(filtered);
}

async function init() {
  renderFilters(); // Initial render

  try {
    const res = await fetch('https://study-backend-k8az.onrender.com/api/questions/bank/');
    if (!res.ok) throw new Error('Network error');
    
    const data = await res.json();
    MOCK_DATA.questions = data.questions.map(mapBackendQuestion);
    
    // Dynamically populate topics/chapters
    const uniqueTopics = [...new Set(MOCK_DATA.questions.map(q => q.topic))];
    MOCK_DATA.topics = uniqueTopics.map((t, i) => ({ id: i, name: t }));
    MOCK_DATA.chapters = uniqueTopics.map((t, i) => ({ id: i, name: t }));
    
    // Re-render filters with real data
    renderFilters();
    
    // Bind listeners after rendering
    document.getElementById('btn-filter').addEventListener('click', applyFilters);
    document.getElementById('btn-reset').addEventListener('click', () => {
      document.getElementById('filt-diff').value = "";
      document.getElementById('filt-tag').value = "";
      document.getElementById('filt-chap').value = "";
      document.getElementById('filt-top').value = "";
      document.getElementById('filt-att').value = "";
      document.getElementById('filt-slow').checked = false;
      renderQuestions(MOCK_DATA.questions);
    });

  } catch (err) {
    console.error("Failed to load live questions:", err);
  }

  renderQuestions(MOCK_DATA.questions);
}

init();
