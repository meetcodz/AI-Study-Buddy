const GEMINI_MODEL = 'gemini-2.5-flash';

const SYS = `You are StudyCoach AI — a strict academic study assistant exclusively for students.

YOUR ONLY PURPOSE is to help with academic and educational topics:
- Explaining academic concepts
- Exam prep
- Summarising notes
- Creating study plans
- Solving problems step by step

STRICT RULES:
Stay academic. Be concise. End with a follow-up.`;


let history = [];
let busy = false;

const now = () => new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });

function resize(el) {
  el.style.height = '22px';
  el.style.height = Math.min(el.scrollHeight, 110) + 'px';
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send();
  }
}

function addMsg(role, text) {
  const C = document.getElementById('msgs');

  const g = document.createElement('div');
  g.className = 'msg-group';

  const row = document.createElement('div');
  row.className = `msg-row ${role}`;

  const av = document.createElement('div');
  av.className = 'm-avatar';
  av.textContent = role === 'ai' ? '🎓' : '🧑';

  const b = document.createElement('div');
  b.className = 'bubble';

  if (role === 'ai') {
    b.innerHTML = `<div class="ai-label">✦ StudyCoach</div>`;
  } else {
    const t = document.createTextNode(text);
    const ts = document.createElement('span');
    ts.className = 'b-time';
    ts.textContent = now();
    b.appendChild(t);
    b.appendChild(ts);
  }

  row.appendChild(av);
  row.appendChild(b);
  g.appendChild(row);
  C.appendChild(g);

  C.scrollTop = C.scrollHeight;

  return b;
}

function showTyping() {
  const C = document.getElementById('msgs');

  const g = document.createElement('div');
  g.className = 'typing-group';
  g.id = 'typingEl';

  const av = document.createElement('div');
  av.className = 'm-avatar';
  av.style.cssText = 'background:linear-gradient(135deg,#4f7cff,#8b5cf6)';
  av.textContent = '🎓';

  const b = document.createElement('div');
  b.className = 't-bubble';
  b.innerHTML = '<span></span><span></span><span></span>';

  g.appendChild(av);
  g.appendChild(b);
  C.appendChild(g);

  C.scrollTop = C.scrollHeight;
}

function hideTyping() {
  document.getElementById('typingEl')?.remove();
}

async function typeText(el, text) {
  el.innerHTML = `<div class="ai-label">✦ StudyCoach</div>`;
  let i = 0;

  while (i < text.length) {
    el.innerHTML += text[i];
    i++;
    document.getElementById('msgs').scrollTop = document.getElementById('msgs').scrollHeight;
    await new Promise(r => setTimeout(r, 10 + Math.random() * 20));
  }

  el.innerHTML += `<span class="b-time">${now()}</span>`;
}

async function send(txt) {
  const inp = document.getElementById('inp');
  const msg = (txt ?? inp.value).trim();
  if (!msg || busy) return;

  document.getElementById('suggWrap').style.display = 'none';

  inp.value = '';
  resize(inp);

  addMsg('user', msg);
  history.push({ role: 'user', parts: [{ text: msg }] });

  busy = true;
  document.getElementById('sendBtn').disabled = true;

  showTyping();

  try {
    const res = await fetch("/api/chat/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ history })
    });

    const data = await res.json();
    hideTyping();

    const reply = data.reply;

    history.push({ role: 'model', parts: [{ text: reply }] });

    const bubble = addMsg('ai', '');
    await typeText(bubble, reply);

  } catch (err) {
    hideTyping();
    history.pop();
    addMsg('ai', 'Connection issue — please try again.');
    console.error(err);
  }

  busy = false;
  document.getElementById('sendBtn').disabled = false;
  inp.focus();
}

function useSugg(btn) {
  send(btn.textContent.replace(/^\S+\s/, '').trim());
}

function clearChat() {
  history = [];
  const C = document.getElementById('msgs');
  C.innerHTML = `
    <div class="divider"><span>Today</span></div>
    <div class="msg-group">
      <div class="msg-row ai">
        <div class="m-avatar">🎓</div>
        <div class="bubble">
          <div class="ai-label">✦ StudyCoach</div>
          Fresh start — what are you studying?
          <span class="b-time">${now()}</span>
        </div>
      </div>
    </div>`;
  document.getElementById('suggWrap').style.display = 'block';
}
