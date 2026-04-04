import { useState, useRef } from 'react';

const API_BASE = 'http://127.0.0.1:8000';

/**
 * PDFUploader — A glassmorphic component that lets users upload a PDF,
 * sends it to the Django backend for Ollama-powered question generation,
 * and reports success via the onQuestionsGenerated callback.
 *
 * Props:
 *   onQuestionsGenerated(count, topic)  — called when questions are saved to DB
 */
export default function PDFUploader({ onQuestionsGenerated }) {
  const [file, setFile] = useState(null);
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState('idle'); // idle | uploading | generating | complete | error
  const [result, setResult] = useState(null);   // { questions_added, topic }
  const [errorMsg, setErrorMsg] = useState(null);
  const fileInputRef = useRef(null);

  // ── File selection ──────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setStatus('idle');
      setErrorMsg(null);
      setResult(null);
    }
  };

  const clearFile = () => {
    setFile(null);
    setStatus('idle');
    setErrorMsg(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Upload + Generate ──────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) return;

    setStatus('uploading');
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('pdf_file', file);
    formData.append('topic', topic || 'General');

    try {
      // Switch to "generating" after a brief uploading flash
      setTimeout(() => setStatus((s) => (s === 'uploading' ? 'generating' : s)), 600);

      const res = await fetch(`${API_BASE}/api/upload-pdf/`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
      setStatus('complete');

      // Notify parent after a brief success animation
      if (onQuestionsGenerated) {
        setTimeout(() => onQuestionsGenerated(data.questions_added, data.topic), 2000);
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Something went wrong during generation.');
    }
  };

  // ── Idle / Error State ─────────────────────────────────────────────────────
  if (status === 'idle' || status === 'error') {
    return (
      <div className="option-card p-6 w-full text-left relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-3xl">📄</span>
          <div>
            <h3 className="text-base font-bold text-text-primary">Upload Study Material</h3>
            <p className="text-xs text-text-muted mt-0.5">
              Upload a PDF and let the AI generate quiz questions from it
            </p>
          </div>
        </div>

        {/* Drop zone / File display */}
        {!file ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-text-muted/30 rounded-xl p-8 text-center
                       hover:border-accent/50 hover:bg-accent-soft transition-all duration-300 group"
          >
            <svg className="mx-auto mb-3 text-text-muted group-hover:text-accent transition-colors" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-sm font-semibold text-text-secondary group-hover:text-text-primary transition-colors">
              Click to select a PDF
            </p>
            <p className="text-xs text-text-muted mt-1">PDF files up to 10 MB</p>
          </button>
        ) : (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-accent/30 bg-accent-soft/60">
            <svg className="text-accent flex-shrink-0" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="text-sm font-medium text-text-primary truncate flex-1">{file.name}</span>
            <button onClick={clearFile} className="text-text-muted hover:text-red-400 transition-colors p-1" title="Remove file">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />

        {/* Topic input */}
        {file && (
          <div className="mt-4">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-1.5 block">
              Topic Name
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Molecular Biology Ch 4"
              className="w-full px-4 py-2.5 rounded-lg text-sm font-medium
                         bg-surface-light border border-glass-border text-text-primary
                         placeholder:text-text-muted/60
                         focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30
                         transition-all duration-200"
            />
          </div>
        )}

        {/* Error message */}
        {status === 'error' && errorMsg && (
          <div className="mt-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10">
            <p className="text-xs text-red-400 font-medium">⚠ {errorMsg}</p>
          </div>
        )}

        {/* Generate button */}
        {file && (
          <button onClick={handleUpload} className="btn-primary w-full mt-5 py-3 flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Generate Questions with AI
          </button>
        )}
      </div>
    );
  }

  // ── Uploading / Generating State ───────────────────────────────────────────
  if (status === 'uploading' || status === 'generating') {
    return (
      <div className="option-card p-8 w-full text-center">
        {/* Spinner */}
        <div className="relative w-16 h-16 mx-auto mb-5">
          <div className="absolute inset-0 rounded-full border-4 border-accent/20" />
          <div className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin" />
          <span className="absolute inset-0 flex items-center justify-center text-2xl animate-pulse">🤖</span>
        </div>

        <h3 className="text-lg font-bold text-text-primary mb-1">
          {status === 'uploading' ? 'Uploading PDF…' : 'AI is reading your document…'}
        </h3>
        <p className="text-xs text-text-muted max-w-xs mx-auto">
          {status === 'generating'
            ? 'The LLM is analyzing your study material and crafting questions. This may take up to a minute — please keep this tab open.'
            : 'Sending your file to the server securely.'}
        </p>

        {/* Subtle pulsing dots */}
        <div className="flex justify-center gap-1.5 mt-5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-accent"
              style={{ animation: `rec-pulse 1s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Complete State ─────────────────────────────────────────────────────────
  return (
    <div className="option-card p-8 w-full text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(52, 211, 153, 0.15)', border: '2px solid rgba(52, 211, 153, 0.4)' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-text-primary mb-1">Questions Generated!</h3>
      <p className="text-sm text-text-secondary">
        <span className="font-bold text-accent">{result?.questions_added || 0}</span> questions added
        {result?.topic ? <> under topic <span className="font-bold text-accent">"{result.topic}"</span></> : null}
      </p>
      <p className="text-xs text-text-muted mt-3 animate-pulse">Starting your quiz…</p>
    </div>
  );
}
