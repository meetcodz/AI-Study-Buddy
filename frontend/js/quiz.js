const API_BASE = 'http://127.0.0.1:8000';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
const QUIZ_OPTIONS = [
  { count: 10, icon: 'zap', label: 'Quick Quiz', desc: 'Perfect for a warm-up', color: 'text-amber-400' },
  { count: 20, icon: 'book', label: 'Standard Quiz', desc: 'Balanced practice session', color: 'text-blue-400' },
  { count: 30, icon: 'trophy', label: 'Challenge Mode', desc: 'Put yourself to the test', color: 'text-purple-400' },
];

let state = {
  view: 'setup', 
  quizLength: null,
  topic: null,
  results: null
};

const appContainer = document.getElementById('quiz-app-container');

function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function renderApp() {
  appContainer.innerHTML = '';
  if (state.view === 'setup') {
    renderQuizSetup();
  } else if (state.view === 'quiz') {
    renderActiveQuiz();
  } else if (state.view === 'results') {
    renderResultDashboard();
  }
  if (window.lucide) {
    setTimeout(() => lucide.createIcons(), 10);
  }
}




function renderQuizSetup() {
  let selectedLength = null;
  let file = null;
  let topicInput = '';
  let uploadStatus = 'idle'; 
  let errorMsg = null;
  let uploadResult = null;

  const renderSetupUI = () => {
    appContainer.innerHTML = `
      <div class="relative min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden">
        <!-- Background orbs -->
        <div class="bg-orb bg-orb-1"></div>
        <div class="bg-orb bg-orb-2"></div>
        <div class="bg-orb bg-orb-3"></div>

        <div class="glass-card w-full max-w-xl p-8 md:p-10 relative z-10 text-center">
          <!-- Header -->
          <div class="mb-8">
            <span class="text-5xl mb-4 block flex justify-center" style="animation: bounce 2s infinite;"><i data-lucide="graduation-cap" style="width: 48px; height: 48px; color: var(--accent);"></i></span>
            <h1 class="text-3xl md:text-4xl font-extrabold text-text-primary tracking-tight mb-2">AI Study Coach</h1>
            <p class="text-text-secondary text-sm md:text-base">Upload your study material or choose a quiz length</p>
          </div>

          <!-- PDF Uploader Section -->
          <div class="mb-6" id="pdf-uploader-section"></div>

          <!-- Divider -->
          <div class="flex items-center gap-4 mb-6">
            <div class="flex-1 h-px bg-glass-border"></div>
            <span class="text-xs font-semibold text-text-muted uppercase tracking-widest">or use existing questions</span>
            <div class="flex-1 h-px bg-glass-border"></div>
          </div>

          <!-- Quiz length cards -->
          <div class="grid gap-3 mb-8" id="quiz-length-options">
            ${QUIZ_OPTIONS.map(opt => `
              <button data-len="${opt.count}" class="option-card flex items-center gap-4 px-5 py-5 text-left w-full ${selectedLength === opt.count ? 'selected' : ''}">
                <span class="flex-shrink-0 ${opt.color || 'text-accent'}"><i data-lucide="${opt.icon}" style="width: 28px; height: 28px;"></i></span>
                <div class="flex-1">
                  <div class="text-base font-semibold ${selectedLength === opt.count ? 'text-accent' : 'text-text-primary'}">${opt.label}</div>
                  <div class="text-xs text-text-muted mt-0.5">${opt.desc}</div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-2xl font-extrabold ${selectedLength === opt.count ? 'text-accent' : 'text-text-secondary'}">${opt.count}</span>
                  <span class="text-xs text-text-muted">Qs</span>
                </div>
                ${selectedLength === opt.count ? `<span class="text-accent"><i data-lucide="check-circle" style="width: 22px; height: 22px;"></i></span>` : ''}
              </button>
            `).join('')}
          </div>

          <!-- Start button -->
          <button id="start-existing-btn" ${!selectedLength ? 'disabled' : ''} class="btn-primary w-full py-4 text-lg tracking-wide flex items-center justify-center gap-2">
            Start Quiz
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>

          <p class="text-text-muted text-xs mt-5">Upload a PDF to generate fresh questions, or select a length to quiz from the existing bank.</p>
        </div>
      </div>
    `;

    
    const uploaderDiv = document.getElementById('pdf-uploader-section');
    if (uploadStatus === 'idle' || uploadStatus === 'error') {
      uploaderDiv.innerHTML = `
        <div class="option-card p-6 w-full text-left relative overflow-hidden">
          <div class="flex items-center gap-3 mb-5">
            <span class="text-accent"><i data-lucide="file-text" style="width: 28px; height: 28px;"></i></span>
            <div>
              <h3 class="text-base font-bold text-text-primary">Upload Study Material</h3>
              <p class="text-xs text-text-muted mt-0.5">Upload a PDF and let the AI generate quiz questions from it</p>
            </div>
          </div>
          ${!file ? `
            <button id="pdf-trigger-btn" class="w-full border-2 border-dashed border-text-muted/30 rounded-xl p-8 text-center hover:border-accent/50 hover:bg-accent-soft transition-all duration-300 group">
              <p class="text-sm font-semibold text-text-secondary group-hover:text-text-primary transition-colors">Click to select a PDF</p>
            </button>
          ` : `
            <div class="flex items-center gap-3 p-4 rounded-xl border border-accent/30 bg-accent-soft/60">
              <span class="text-sm font-medium text-text-primary truncate flex-1">${file.name}</span>
              <button id="clear-file-btn" class="text-text-muted hover:text-red-400 transition-colors p-1" title="Remove file">Clear</button>
            </div>
            <div class="mt-4">
              <label class="text-xs font-semibold text-text-muted uppercase tracking-widest mb-1.5 block">Topic Name</label>
              <input type="text" id="topic-input" value="${topicInput}" placeholder="e.g. Molecular Biology" class="w-full px-4 py-2.5 rounded-lg text-sm bg-surface-light border border-glass-border text-text-primary focus:outline-none focus:border-accent">
            </div>
            ${errorMsg ? `<div class="mt-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10"><p class="text-xs text-red-400 font-medium flex items-center gap-2"><i data-lucide="alert-circle" style="width: 14px; height: 14px;"></i> ${errorMsg}</p></div>` : ''}
            <button id="generate-pdf-btn" class="btn-primary w-full mt-5 py-3 flex items-center justify-center gap-2"><i data-lucide="sparkles" style="width: 18px; height: 18px;"></i> Generate Questions with AI</button>
          `}
          <input type="file" id="real-file-input" accept=".pdf" class="hidden">
        </div>
      `;
    } else if (uploadStatus === 'uploading' || uploadStatus === 'generating') {
      uploaderDiv.innerHTML = `
        <div class="option-card p-8 w-full text-center">
          <h3 class="text-lg font-bold text-text-primary mb-1">${uploadStatus === 'uploading' ? 'Uploading PDF…' : 'AI is reading your document…'}</h3>
          <p class="text-xs text-text-muted">The LLM is crafting questions. Please wait.</p>
        </div>
      `;
    } else if (uploadStatus === 'complete') {
      uploaderDiv.innerHTML = `
        <div class="option-card p-8 w-full text-center">
          <h3 class="text-lg font-bold text-text-primary mb-1">Questions Generated!</h3>
          <p class="text-sm text-text-secondary"><span class="font-bold text-accent">${uploadResult?.questions_added || 0}</span> questions added.</p>
        </div>
      `;
    }

    attachListeners();
  };

  const attachListeners = () => {
    
    document.querySelectorAll('#quiz-length-options .option-card').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedLength = parseInt(btn.getAttribute('data-len'));
        renderSetupUI();
      });
    });

    const startBtn = document.getElementById('start-existing-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (selectedLength) {
          state.quizLength = selectedLength;
          state.topic = null;
          state.view = 'quiz';
          renderApp();
        }
      });
    }

    
    const pdfTrigger = document.getElementById('pdf-trigger-btn');
    const realInput = document.getElementById('real-file-input');
    if (pdfTrigger && realInput) {
      pdfTrigger.addEventListener('click', () => realInput.click());
      realInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          file = e.target.files[0];
          uploadStatus = 'idle';
          renderSetupUI();
        }
      });
    }

    const clearBtn = document.getElementById('clear-file-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        file = null; uploadStatus = 'idle'; renderSetupUI();
      });
    }

    const topicInputEl = document.getElementById('topic-input');
    if (topicInputEl) {
      topicInputEl.addEventListener('input', (e) => { topicInput = e.target.value; });
    }

    const genBtn = document.getElementById('generate-pdf-btn');
    if (genBtn) {
      genBtn.addEventListener('click', async () => {
        if (!file) return;
        uploadStatus = 'uploading';
        errorMsg = null;
        renderSetupUI();

        const formData = new FormData();
        formData.append('pdf_file', file);
        formData.append('topic', topicInput || 'General');

        setTimeout(() => {
          if (uploadStatus === 'uploading') { uploadStatus = 'generating'; renderSetupUI(); }
        }, 600);

        try {
          const res = await fetch(`${API_BASE}/api/upload-pdf/`, {
            method: 'POST',
            body: formData,
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Server returned ${res.status}`);
          }
          const data = await res.json();
          uploadResult = data;
          uploadStatus = 'complete';
          renderSetupUI();
          
          setTimeout(() => {
            state.quizLength = 10;
            state.topic = data.topic;
            state.view = 'quiz';
            renderApp();
          }, 2000);
        } catch (err) {
          uploadStatus = 'error';
          errorMsg = err.message || 'Something went wrong during generation.';
          renderSetupUI();
        }
      });
    }
  };

  renderSetupUI();
}




function renderActiveQuiz() {
  let questions = [];
  let currentIndex = 0;
  let selectedAnswers = {};
  let timeTaken = {};
  let displayTime = 0;
  
  let loading = true;
  let errorMsg = null;
  let submitting = false;
  let sessionId = null;

  
  let voiceNotes = {}; 
  let voiceUrls = {};  
  let recording = false;
  let recordingTime = 0;
  let mediaRecorder = null;
  let audioChunks = [];
  let recInterval = null;
  
  let timerInterval = null;
  let startTime = null;
  let prevTime = 0;

  
  const initQuiz = async () => {
    try {
      const resSession = await fetch(`${API_BASE}/api/sessions/start/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz_length: state.quizLength })
      });
      if (!resSession.ok) throw new Error(`Session error: ${resSession.status}`);
      const sessionData = await resSession.json();
      sessionId = sessionData.session_id;

      let qUrl = `${API_BASE}/api/questions/?limit=${state.quizLength}`;
      if (state.topic) qUrl += `&topic=${encodeURIComponent(state.topic)}`;
      
      const resQ = await fetch(qUrl);
      if (!resQ.ok) throw new Error(`Server error: ${resQ.status}`);
      const data = await resQ.json();
      
      if (!data.questions || data.questions.length === 0) throw new Error('No questions returned.');
      questions = data.questions;
      loading = false;
      startQuestionTimer();
      renderQuizUI();
    } catch (err) {
      errorMsg = err.message;
      loading = false;
      renderQuizUI();
    }
  };

  const captureTime = () => {
    if (!startTime || questions.length === 0) return;
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const qId = questions[currentIndex]?.id;
    if (qId != null) {
      timeTaken[qId] = prevTime + elapsed;
    }
  };

  const startQuestionTimer = () => {
    if (questions.length === 0) return;
    captureTime();
    const qId = questions[currentIndex]?.id;
    prevTime = timeTaken[qId] || 0;
    displayTime = prevTime;
    startTime = Date.now();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      displayTime = prevTime + elapsed;
      const tDisp = document.getElementById('timer-display-text');
      if (tDisp) tDisp.textContent = formatTime(displayTime);
    }, 1000);
  };

  const stopRecordingIfActive = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    if (recInterval) { clearInterval(recInterval); recInterval = null; }
    recording = false;
    recordingTime = 0;
  };

  const submitAll = async () => {
    stopRecordingIfActive();
    captureTime();
    
    const finalTime = { ...timeTaken };
    const currQ = questions[currentIndex];
    if (currQ) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      finalTime[currQ.id] = prevTime + elapsed;
    }

    submitting = true;
    renderQuizUI();

    try {
      const finalResults = [];
      for (const q of questions) {
        const answer = selectedAnswers[q.id];
        if (!answer) continue;

        const audioBlob = voiceNotes[q.id];
        let res;

        if (audioBlob) {
          const formData = new FormData();
          formData.append('question_id', q.id);
          formData.append('selected_answer', answer);
          formData.append('time_taken', finalTime[q.id] || 0);
          formData.append('bookmarked', 'false');
          if (sessionId) formData.append('session_id', sessionId);
          formData.append('notes_audio', audioBlob, `note_q${q.id}.webm`);
          res = await fetch(`${API_BASE}/api/submit/`, { method: 'POST', body: formData });
        } else {
          const payload = {
            question_id: q.id, selected_answer: answer,
            time_taken: finalTime[q.id] || 0, bookmarked: false,
          };
          if (sessionId) payload.session_id = sessionId;
          res = await fetch(`${API_BASE}/api/submit/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Submit failed for question ${q.id}`);
        }
        const data = await res.json();
        finalResults.push({ ...data, question: q, selected_answer: answer, time_taken: finalTime[q.id] || 0 });
      }

      if (timerInterval) clearInterval(timerInterval);
      state.results = finalResults;
      state.view = 'results';
      renderApp();

    } catch (err) {
      errorMsg = err.message;
      submitting = false;
      renderQuizUI();
    }
  };

  const renderQuizUI = () => {
    if (loading) {
      appContainer.innerHTML = `
        <div class="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
          <div class="bg-orb bg-orb-1"></div><div class="bg-orb bg-orb-2"></div><div class="bg-orb bg-orb-3"></div>
          <div class="glass-card p-12 text-center relative z-10">
            <div class="inline-block w-10 h-10 border-4 border-accent/30 border-t-accent rounded-full animate-spin mb-4"></div>
            <p class="text-text-secondary text-sm">Loading questions…</p>
          </div>
        </div>
      `;
      return;
    }
    if (errorMsg && !submitting) {
      appContainer.innerHTML = `
        <div class="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
          <div class="bg-orb bg-orb-1"></div><div class="bg-orb bg-orb-2"></div><div class="bg-orb bg-orb-3"></div>
          <div class="glass-card p-10 text-center max-w-md relative z-10">
            <h2 class="text-lg font-bold text-text-primary mb-2">Error</h2>
            <p class="text-text-secondary text-sm mb-6">${errorMsg}</p>
            <button id="go-back-setup" class="btn-primary">Go Back</button>
          </div>
        </div>
      `;
      document.getElementById('go-back-setup')?.addEventListener('click', () => { state.view = 'setup'; renderApp(); });
      return;
    }
    if (submitting) {
      appContainer.innerHTML = `
        <div class="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
          <div class="bg-orb bg-orb-1"></div><div class="bg-orb bg-orb-2"></div><div class="bg-orb bg-orb-3"></div>
          <div class="glass-card p-12 text-center relative z-10">
            <div class="inline-block w-10 h-10 border-4 border-accent/30 border-t-accent rounded-full animate-spin mb-4"></div>
            <p class="text-text-primary font-semibold mb-1">Submitting your answers…</p>
          </div>
        </div>
      `;
      return;
    }

    const question = questions[currentIndex];
    const isLast = currentIndex === questions.length - 1;
    const answeredCount = Object.keys(selectedAnswers).length;
    const progress = ((currentIndex + 1) / questions.length) * 100;
    const hasVoiceNote = !!voiceNotes[question.id];
    
    let diffColor = 'badge-easy';
    if(question.difficulty === 'medium') diffColor = 'badge-medium';
    if(question.difficulty === 'hard') diffColor = 'badge-hard';

    appContainer.innerHTML = `
      <div class="relative min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden">
        <div class="bg-orb bg-orb-1"></div><div class="bg-orb bg-orb-2"></div><div class="bg-orb bg-orb-3"></div>
        <div class="glass-card w-full max-w-2xl p-8 md:p-10 relative z-10">
          
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <button id="back-to-setup" class="text-text-muted hover:text-text-primary transition-colors mr-1">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 15l-5-5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <h1 class="text-lg font-bold text-text-primary tracking-tight">AI Study Coach</h1>
            </div>
            <div class="flex items-center gap-3">
              <div class="timer-display">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M8 4v4l2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <span id="timer-display-text">${formatTime(displayTime)}</span>
              </div>
              <span class="badge ${diffColor}">${question.difficulty}</span>
              <span class="badge" style="background: rgba(129,140,248,0.12); color: #818cf8;">${question.topic}</span>
            </div>
          </div>

          <div class="mb-8">
            <div class="flex justify-between items-center mb-2">
              <span class="text-xs font-semibold text-text-muted uppercase tracking-widest">Question ${currentIndex + 1} of ${questions.length}</span>
              <span class="text-xs font-semibold text-accent">${Math.round(progress)}%</span>
            </div>
            <div class="progress-track"><div class="progress-fill" style="width: ${progress}%"></div></div>
          </div>

          <div class="question-enter">
            <h2 class="text-xl md:text-2xl font-semibold text-text-primary leading-relaxed mb-8">${question.text}</h2>
            <div class="grid gap-3" id="options-container">
              ${question.options.map((option, idx) => {
                const isSel = selectedAnswers[question.id] === option;
                return `
                  <button data-opt="${option.replace(/"/g, '&quot;')}" class="option-btn option-card flex items-center gap-4 px-5 py-4 text-left w-full ${isSel ? 'selected' : ''}">
                    <span class="option-label">${OPTION_LETTERS[idx]}</span>
                    <span class="text-sm md:text-base font-medium ${isSel ? 'text-accent' : 'text-text-secondary'}">${option}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <div class="mt-6 flex items-center gap-3 flex-wrap" id="voice-container">
            ${recording ? `
              <button id="stop-rec-btn" class="voice-btn voice-btn-recording">
                <span class="rec-dot"></span>
                <span>Recording ${formatTime(recordingTime)}</span>
              </button>
            ` : `
              <button id="start-rec-btn" class="voice-btn" ${hasVoiceNote ? 'disabled' : ''}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1a2.5 2.5 0 0 0-2.5 2.5v4a2.5 2.5 0 0 0 5 0v-4A2.5 2.5 0 0 0 8 1z" stroke="currentColor" stroke-width="1.3"/><path d="M3.5 7v.5a4.5 4.5 0 0 0 9 0V7M8 12.5V15" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                <span>${hasVoiceNote ? 'Note recorded' : 'Record voice note'}</span>
              </button>
            `}
            ${hasVoiceNote && !recording ? `
              <audio controls src="${voiceUrls[question.id]}" class="voice-audio"></audio>
              <button id="del-rec-btn" class="text-red-400 text-xs flex items-center gap-1">Delete</button>
            ` : ''}
          </div>

          <div class="flex items-center justify-between mt-8">
            <button id="prev-btn" ${currentIndex === 0 ? 'disabled' : ''} class="btn-ghost flex items-center gap-2">Previous</button>
            <div class="hidden sm:flex flex-wrap justify-center gap-1.5 max-w-[40%]">
              ${questions.map((q, idx) => `
                <button data-idx="${idx}" class="nav-dot w-2.5 h-2.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'bg-accent scale-125 shadow-[0_0_8px_rgba(129,140,248,0.5)]' : selectedAnswers[q.id] ? 'bg-accent/40' : 'bg-text-muted/30'}"></button>
              `).join('')}
            </div>
            ${isLast ? `
              <button id="finish-btn" ${answeredCount === 0 ? 'disabled' : ''} class="btn-primary !bg-gradient-to-r !from-emerald-500 !to-teal-500">Finish & Submit</button>
            ` : `
              <button id="next-btn" class="btn-primary">Next</button>
            `}
          </div>
        </div>
      </div>
    `;

    attachQuizListeners();
  };

  const attachQuizListeners = () => {
    document.getElementById('back-to-setup')?.addEventListener('click', () => {
      if (timerInterval) clearInterval(timerInterval);
      state.view = 'setup';
      renderApp();
    });

    document.querySelectorAll('.option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        captureTime();
        const option = btn.getAttribute('data-opt');
        selectedAnswers[questions[currentIndex].id] = option;
        renderQuizUI();
      });
    });

    document.getElementById('prev-btn')?.addEventListener('click', () => {
      stopRecordingIfActive(); captureTime(); currentIndex--; startQuestionTimer(); renderQuizUI();
    });
    document.getElementById('next-btn')?.addEventListener('click', () => {
      stopRecordingIfActive(); captureTime(); currentIndex++; startQuestionTimer(); renderQuizUI();
    });
    document.getElementById('finish-btn')?.addEventListener('click', submitAll);

    document.querySelectorAll('.nav-dot').forEach(btn => {
      btn.addEventListener('click', () => {
        stopRecordingIfActive();
        captureTime();
        currentIndex = parseInt(btn.getAttribute('data-idx'));
        startQuestionTimer();
        renderQuizUI();
      });
    });

    
    document.getElementById('start-rec-btn')?.addEventListener('click', async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunks, { type: 'audio/webm' });
          const qId = questions[currentIndex].id;
          voiceNotes[qId] = blob;
          voiceUrls[qId] = URL.createObjectURL(blob);
          stream.getTracks().forEach((t) => t.stop());
          recording = false;
          if (recInterval) { clearInterval(recInterval); recInterval = null; }
          recordingTime = 0;
          renderQuizUI();
        };
        mediaRecorder.start();
        recording = true;
        recordingTime = 0;
        renderQuizUI();
        recInterval = setInterval(() => {
          recordingTime++;
          const tDisp = document.querySelector('.rec-dot + span');
          if (tDisp) tDisp.textContent = `Recording ${formatTime(recordingTime)}`;
        }, 1000);
      } catch (e) {
        alert("Microphone access denied or error.");
      }
    });

    document.getElementById('stop-rec-btn')?.addEventListener('click', () => {
      stopRecordingIfActive();
    });
    document.getElementById('del-rec-btn')?.addEventListener('click', () => {
      const qId = questions[currentIndex].id;
      if (voiceUrls[qId]) URL.revokeObjectURL(voiceUrls[qId]);
      delete voiceNotes[qId];
      delete voiceUrls[qId];
      renderQuizUI();
    });
  };

  initQuiz();
}




function renderResultDashboard() {
  const results = state.results || [];
  
  const total = results.length;
  const correct = results.filter((r) => r.is_correct).length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100 * 100) / 100 : 0;
  const totalTime = results.reduce((sum, r) => sum + (r.time_taken || 0), 0);
  const avgTime = total > 0 ? Math.round((totalTime / total) * 100) / 100 : 0;

  const topicMap = {};
  results.forEach((r) => {
    const topic = r.question.topic || 'General';
    if (!topicMap[topic]) topicMap[topic] = { total: 0, correct: 0, timeSum: 0 };
    topicMap[topic].total += 1;
    topicMap[topic].timeSum += r.time_taken || 0;
    if (r.is_correct) topicMap[topic].correct += 1;
  });

  const topicPerformance = Object.entries(topicMap)
    .map(([topic, s]) => ({
      topic, total: s.total, correct: s.correct,
      accuracy: Math.round((s.correct / s.total) * 100 * 100) / 100,
      avg_time: Math.round((s.timeSum / s.total) * 100) / 100,
    })).sort((a, b) => a.accuracy - b.accuracy);

  const weakTopics = topicPerformance.filter((t) => t.accuracy < 50).map((t) => t.topic);
  const strongTopics = topicPerformance.filter((t) => t.accuracy >= 75).map((t) => t.topic);

  const iconName = accuracy >= 80 ? 'trophy' : accuracy >= 50 ? 'trending-up' : 'book-open';
  const iconColor = accuracy >= 80 ? 'text-amber-400' : accuracy >= 50 ? 'text-blue-400' : 'text-text-muted';
  const gradeLabel = accuracy >= 80 ? 'Excellent' : accuracy >= 60 ? 'Good Job' : accuracy >= 40 ? 'Keep Practicing' : 'Needs Improvement';

  let expandedIndex = -1;

  const renderDashboardUI = () => {
    appContainer.innerHTML = `
      <div class="relative min-h-screen px-4 py-10 overflow-hidden">
        <div class="bg-orb bg-orb-1"></div><div class="bg-orb bg-orb-2"></div><div class="bg-orb bg-orb-3"></div>

        <div class="max-w-3xl mx-auto relative z-10 space-y-6">
          <div class="glass-card p-8 text-center">
            <span class="text-5xl block mb-3 flex justify-center ${iconColor}"><i data-lucide="${iconName}" style="width: 48px; height: 48px;"></i></span>
            <h1 class="text-3xl font-extrabold text-text-primary mb-1">Quiz Complete!</h1>
            <p class="text-text-secondary text-sm mb-6">${gradeLabel}</p>

            <div class="relative inline-flex items-center justify-center mb-6">
              <svg width="140" height="140" viewBox="0 0 140 140" class="transform -rotate-90">
                <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(129,140,248,0.1)" stroke-width="10"/>
                <circle cx="70" cy="70" r="60" fill="none" class="circle-progress" stroke="url(#grad)" stroke-width="10" stroke-linecap="round" stroke-dasharray="0 377" />
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#818cf8"/>
                    <stop offset="100%" stop-color="#34d399"/>
                  </linearGradient>
                </defs>
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-3xl font-extrabold text-text-primary">${accuracy}%</span>
                <span class="text-xs text-text-muted">Accuracy</span>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <div class="dashboard-metric-card"><div class="text-2xl font-bold text-accent">${correct}</div><div class="text-xs text-text-muted mt-1">Correct</div></div>
              <div class="dashboard-metric-card"><div class="text-2xl font-bold text-text-primary">${total}</div><div class="text-xs text-text-muted mt-1">Attempted</div></div>
              <div class="dashboard-metric-card"><div class="text-2xl font-bold text-[#fbbf24]">${avgTime}s</div><div class="text-xs text-text-muted mt-1">Avg Time</div></div>
            </div>
          </div>

          ${topicPerformance.length > 0 ? `
            <div class="glass-card p-6">
              <h2 class="text-lg font-bold text-text-primary mb-4 flex items-center gap-2"><span><i data-lucide="bar-chart-2" style="width: 20px; height: 20px; color: var(--accent);"></i></span> Topic Performance</h2>
              <div class="space-y-4">
                ${topicPerformance.map(tp => {
                  const bc = tp.accuracy >= 75 ? 'bg-emerald-500' : tp.accuracy >= 50 ? 'bg-yellow-400' : 'bg-red-500';
                  const tc = tp.accuracy >= 75 ? 'text-emerald-400' : tp.accuracy >= 50 ? 'text-yellow-400' : 'text-red-400';
                  return `
                    <div>
                      <div class="flex justify-between items-center mb-1.5">
                        <span class="text-sm font-medium text-text-secondary">${tp.topic}</span>
                        <div class="flex items-center gap-3">
                          <span class="text-xs text-text-muted">${tp.correct}/${tp.total}</span>
                          <span class="text-sm font-bold ${tc}">${tp.accuracy}%</span>
                        </div>
                      </div>
                      <div class="progress-track"><div class="h-full rounded-full transition-all duration-700 ease-out ${bc}" style="width: ${tp.accuracy}%"></div></div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="glass-card p-5">
               <h3 class="text-sm font-bold text-red-400 mb-3 flex items-center gap-2"><i data-lucide="alert-circle" style="width: 16px; height: 16px;"></i> Topics to Revise</h3>
               <ul class="space-y-2">${weakTopics.map(t => `<li class="flex items-center gap-2 text-sm text-text-secondary"><span class="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0"></span>${t}</li>`).join('') || '<p class="text-xs text-text-muted italic">No weak topics!</p>'}</ul>
            </div>
            <div class="glass-card p-5">
               <h3 class="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2"><i data-lucide="check-circle" style="width: 16px; height: 16px;"></i> Strong Topics</h3>
               <ul class="space-y-2">${strongTopics.map(t => `<li class="flex items-center gap-2 text-sm text-text-secondary"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"></span>${t}</li>`).join('') || '<p class="text-xs text-text-muted italic">Keep practicing!</p>'}</ul>
            </div>
          </div>

          <div class="glass-card p-6">
            <h2 class="text-lg font-bold text-text-primary mb-4 flex items-center gap-2"><i data-lucide="clipboard-list" style="width: 20px; height: 20px; color: var(--accent);"></i> Review Your Answers</h2>
            <div class="space-y-2">
              ${results.map((r, i) => {
                const isOpen = expandedIndex === i;
                return `
                  <div>
                    <button data-idx="${i}" class="rev-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left ${r.is_correct ? 'bg-emerald-500/10 hover:bg-emerald-500/15' : 'bg-red-500/10 hover:bg-red-500/15'}">
                      <span class="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${r.is_correct ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}"><i data-lucide="${r.is_correct ? 'check' : 'x'}" style="width: 12px; height: 12px;"></i></span>
                      <span class="text-text-secondary truncate flex-1">${r.question.text}</span>
                      <span class="text-text-muted text-xs flex-shrink-0">${r.time_taken}s</span>
                    </button>
                    ${isOpen ? `
                      <div class="mt-1 ml-8 mr-2 p-4 rounded-lg bg-[rgba(30,41,59,0.5)] border border-[rgba(255,255,255,0.05)] space-y-3">
                        <div class="flex items-center gap-2 text-sm"><span class="text-text-muted text-xs w-24">Your answer:</span> <span class="font-medium ${r.is_correct ? 'text-emerald-400' : 'text-red-400'}">${r.selected_answer}</span></div>
                        ${!r.is_correct ? `<div class="flex items-center gap-2 text-sm"><span class="text-text-muted text-xs w-24">Correct:</span> <span class="font-medium text-emerald-400">${r.correct_answer}</span></div>` : ''}
                        <p class="text-text-muted text-xs mt-1 italic">${r.message || ''}</p>
                        ${r.solution_image ? `<div class="solution-image-card mt-3"><img src="${r.solution_image.startsWith('http') ? r.solution_image : API_BASE+r.solution_image}" class="w-full"></div>` : ''}
                        ${r.notes_audio_url ? `<div class="mt-3 bg-slate-800/50 rounded-lg p-3 border border-slate-700/50"><div class="text-xs font-medium text-text-secondary mb-2">Voice Note</div><audio controls src="${API_BASE}${r.notes_audio_url.startsWith('/')?r.notes_audio_url:'/'+r.notes_audio_url}" class="w-full h-8"></audio></div>` : ''}
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          
          <div class="text-center pb-6">
            <button id="retake-btn" class="btn-primary px-10 py-3 text-base flex items-center justify-center gap-2 mx-auto"><i data-lucide="rotate-ccw" style="width: 18px; height: 18px;"></i> Take Another Quiz</button>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      const circle = document.querySelector('.circle-progress');
      if (circle) circle.style.strokeDasharray = `${(accuracy / 100) * 377} 377`;
    }, 100);

    
    document.getElementById('retake-btn').addEventListener('click', () => {
      state.results = null; state.view = 'setup'; renderApp();
    });
    document.querySelectorAll('.rev-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'));
        expandedIndex = (expandedIndex === idx) ? -1 : idx;
        renderDashboardUI();
      });
    });
  };

  renderDashboardUI();
}


renderApp();
