import { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE = 'http://127.0.0.1:8000';
const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function Quiz({ quizLength = 10, topic = null, questionIds = null, onBack, onFinish }) {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeTaken, setTimeTaken] = useState({});
  const [displayTime, setDisplayTime] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  // ── Voice note state ────────────────────────────────────────────────────
  const [voiceNotes, setVoiceNotes] = useState({});       // { questionId: Blob }
  const [voiceUrls, setVoiceUrls] = useState({});         // { questionId: objectURL }
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recTimerRef = useRef(null);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const prevTimeRef = useRef(0);

  // ── Capture elapsed time ──────────────────────────────────────────────────
  const captureTime = useCallback(() => {
    if (!startTimeRef.current || questions.length === 0) return;
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
    const questionId = questions[currentIndex]?.id;
    if (questionId == null) return;
    setTimeTaken((prev) => ({ ...prev, [questionId]: prevTimeRef.current + elapsed }));
  }, [questions, currentIndex]);

  // ── Timer per question ────────────────────────────────────────────────────
  useEffect(() => {
    if (questions.length === 0) return;
    captureTime();
    const questionId = questions[currentIndex]?.id;
    prevTimeRef.current = timeTaken[questionId] || 0;
    setDisplayTime(prevTimeRef.current);
    startTimeRef.current = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      setDisplayTime(prevTimeRef.current + elapsed);
    }, 1000);
    setAnimKey((k) => k + 1);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, questions]);

  // ── Fetch questions & start session ───────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setError(null);

    // 1. Start session
    fetch(`${API_BASE}/api/sessions/start/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quiz_length: quizLength })
    })
      .then((res) => { if (!res.ok) throw new Error(`Session error: ${res.status}`); return res.json(); })
      .then((sessionData) => {
        setSessionId(sessionData.session_id);
        // 2. Fetch questions (filter by topic or ids if provided)
        let questionsUrl = `${API_BASE}/api/questions/?limit=${quizLength}`;
        if (questionIds && questionIds.length > 0) {
          questionsUrl += `&ids=${questionIds.join(',')}`;
        } else if (topic) {
          questionsUrl += `&topic=${encodeURIComponent(topic)}`;
        }
        return fetch(questionsUrl);
      })
      .then((res) => { if (!res.ok) throw new Error(`Server error: ${res.status}`); return res.json(); })
      .then((data) => {
        if (!data.questions || data.questions.length === 0) throw new Error('No questions returned.');
        setQuestions(data.questions);
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [quizLength, topic]);

  // ── Stop recording when navigating away ───────────────────────────────────
  const stopRecordingIfActive = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
    setRecording(false);
    setRecordingTime(0);
  }, []);

  // ── Voice note handlers ───────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const qId = questions[currentIndex]?.id;
        if (qId != null) {
          const url = URL.createObjectURL(blob);
          setVoiceNotes((prev) => ({ ...prev, [qId]: blob }));
          setVoiceUrls((prev) => ({ ...prev, [qId]: url }));
        }
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
        setRecordingTime(0);
      };

      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
      setRecordingTime(0);
      recTimerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      setError('Microphone access denied. Please allow microphone access.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const deleteVoiceNote = (qId) => {
    if (voiceUrls[qId]) URL.revokeObjectURL(voiceUrls[qId]);
    setVoiceNotes((prev) => { const n = { ...prev }; delete n[qId]; return n; });
    setVoiceUrls((prev) => { const n = { ...prev }; delete n[qId]; return n; });
  };

  const handleSelect = (option) => {
    captureTime();
    setSelectedAnswers((prev) => ({ ...prev, [question.id]: option }));
  };

  const goNext = () => {
    if (currentIndex < questions.length - 1) { stopRecordingIfActive(); captureTime(); setCurrentIndex((i) => i + 1); }
  };
  const goPrev = () => {
    if (currentIndex > 0) { stopRecordingIfActive(); captureTime(); setCurrentIndex((i) => i - 1); }
  };
  const jumpTo = (idx) => {
    if (idx !== currentIndex) { stopRecordingIfActive(); captureTime(); setCurrentIndex(idx); }
  };

  // ── Submit all answers (multipart/form-data when audio exists) ────────────
  const handleSubmit = async () => {
    stopRecordingIfActive();
    captureTime();

    const finalTime = { ...timeTaken };
    if (questions[currentIndex]) {
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      finalTime[questions[currentIndex].id] = prevTimeRef.current + elapsed;
    }

    setSubmitting(true);

    try {
      const results = [];
      for (const q of questions) {
        const answer = selectedAnswers[q.id];
        if (!answer) continue;

        const audioBlob = voiceNotes[q.id];
        let res;

        if (audioBlob) {
          // multipart/form-data when audio note is present
          const formData = new FormData();
          formData.append('question_id', q.id);
          formData.append('selected_answer', answer);
          formData.append('time_taken', finalTime[q.id] || 0);
          formData.append('bookmarked', 'false');
          if (sessionId) formData.append('session_id', sessionId);
          formData.append('notes_audio', audioBlob, `note_q${q.id}.webm`);

          res = await fetch(`${API_BASE}/api/submit/`, { method: 'POST', body: formData });
        } else {
          // plain JSON when no audio
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
        results.push({ ...data, question: q, selected_answer: answer, time_taken: finalTime[q.id] || 0 });
      }

      if (timerRef.current) clearInterval(timerRef.current);
      if (onFinish) onFinish(results);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  // ── Loading / Error / Submitting states ───────────────────────────────────
  if (loading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
        <div className="bg-orb bg-orb-1" /><div className="bg-orb bg-orb-2" /><div className="bg-orb bg-orb-3" />
        <div className="glass-card p-12 text-center relative z-10">
          <div className="inline-block w-10 h-10 border-4 border-accent/30 border-t-accent rounded-full animate-spin mb-4" />
          <p className="text-text-secondary text-sm">Loading questions…</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
        <div className="bg-orb bg-orb-1" /><div className="bg-orb bg-orb-2" /><div className="bg-orb bg-orb-3" />
        <div className="glass-card p-10 text-center max-w-md relative z-10">
          <span className="text-4xl mb-4 block">⚠️</span>
          <h2 className="text-lg font-bold text-text-primary mb-2">Failed to load questions</h2>
          <p className="text-text-secondary text-sm mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={onBack} className="btn-ghost">Go Back</button>
            <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
          </div>
        </div>
      </div>
    );
  }
  if (submitting) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
        <div className="bg-orb bg-orb-1" /><div className="bg-orb bg-orb-2" /><div className="bg-orb bg-orb-3" />
        <div className="glass-card p-12 text-center relative z-10">
          <div className="inline-block w-10 h-10 border-4 border-accent/30 border-t-accent rounded-full animate-spin mb-4" />
          <p className="text-text-primary font-semibold mb-1">Submitting your answers…</p>
          <p className="text-text-muted text-xs">Checking {Object.keys(selectedAnswers).length} answers against the database</p>
        </div>
      </div>
    );
  }

  const question = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const answeredCount = Object.keys(selectedAnswers).length;
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const hasVoiceNote = !!voiceNotes[question.id];

  const difficultyClass =
    question.difficulty === 'easy' ? 'badge-easy'
    : question.difficulty === 'medium' ? 'badge-medium' : 'badge-hard';

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden">
      <div className="bg-orb bg-orb-1" /><div className="bg-orb bg-orb-2" /><div className="bg-orb bg-orb-3" />

      <div className="glass-card w-full max-w-2xl p-8 md:p-10 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="text-text-muted hover:text-text-primary transition-colors mr-1" title="Back to setup">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 15l-5-5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            )}
            <span className="text-2xl">🎓</span>
            <h1 className="text-lg font-bold text-text-primary tracking-tight">AI Study Coach</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="timer-display" title="Time spent on this question">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 4v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>{formatTime(displayTime)}</span>
            </div>
            <span className={`badge ${difficultyClass}`}>{question.difficulty}</span>
            <span className="badge" style={{ background: 'rgba(129,140,248,0.12)', color: '#818cf8' }}>{question.topic}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-widest">Question {currentIndex + 1} of {questions.length}</span>
            <span className="text-xs font-semibold text-accent">{Math.round(progress)}%</span>
          </div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
        </div>

        {/* Question + Options */}
        <div key={animKey} className="question-enter">
          <h2 className="text-xl md:text-2xl font-semibold text-text-primary leading-relaxed mb-8">{question.text}</h2>
          <div className="grid gap-3">
            {question.options.map((option, idx) => {
              const isSelected = selectedAnswers[question.id] === option;
              return (
                <button key={option} onClick={() => handleSelect(option)}
                  className={`option-card flex items-center gap-4 px-5 py-4 text-left w-full ${isSelected ? 'selected' : ''}`}>
                  <span className="option-label">{OPTION_LETTERS[idx]}</span>
                  <span className={`text-sm md:text-base font-medium ${isSelected ? 'text-accent' : 'text-text-secondary'}`}>{option}</span>
                  {isSelected && (
                    <span className="ml-auto text-accent">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6 10l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Voice Note Recorder ──────────────────────────────────────── */}
        <div className="mt-6 flex items-center gap-3 flex-wrap">
          {recording ? (
            <button onClick={stopRecording} className="voice-btn voice-btn-recording">
              <span className="rec-dot" />
              <span>Recording {formatTime(recordingTime)}</span>
              <span className="text-xs opacity-70 ml-1">— tap to stop</span>
            </button>
          ) : (
            <button onClick={startRecording} className="voice-btn" disabled={hasVoiceNote}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1a2.5 2.5 0 0 0-2.5 2.5v4a2.5 2.5 0 0 0 5 0v-4A2.5 2.5 0 0 0 8 1z" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M3.5 7v.5a4.5 4.5 0 0 0 9 0V7M8 12.5V15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <span>{hasVoiceNote ? 'Note recorded' : 'Record voice note'}</span>
            </button>
          )}

          {hasVoiceNote && !recording && (
            <>
              <audio controls src={voiceUrls[question.id]} className="voice-audio" />
              <button onClick={() => deleteVoiceNote(question.id)} className="text-red-400 hover:text-red-300 transition-colors text-xs flex items-center gap-1" title="Delete note">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Delete
              </button>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <button onClick={goPrev} disabled={currentIndex === 0} className="btn-ghost flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Previous
          </button>

          <div className="hidden sm:flex flex-wrap justify-center gap-1.5 max-w-[40%]">
            {questions.map((q, idx) => (
              <button key={q.id} onClick={() => jumpTo(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? 'bg-accent scale-125 shadow-[0_0_8px_rgba(129,140,248,0.5)]'
                  : selectedAnswers[q.id] ? 'bg-accent/40' : 'bg-text-muted/30'
                }`} />
            ))}
          </div>

          {isLastQuestion ? (
            <button onClick={handleSubmit} disabled={answeredCount === 0}
              className="btn-primary flex items-center gap-2 !bg-gradient-to-r !from-emerald-500 !to-teal-500">
              Finish & Submit
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          ) : (
            <button onClick={goNext} className="btn-primary flex items-center gap-2">
              Next
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
        </div>

        <div className="text-center mt-6">
          <span className="text-xs text-text-muted">{answeredCount} of {questions.length} answered</span>
        </div>
      </div>
    </div>
  );
}
