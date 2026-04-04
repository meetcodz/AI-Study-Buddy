import { useState } from 'react';
import PDFUploader from './PDFUploader';

const QUIZ_OPTIONS = [
  { count: 10, emoji: '⚡', label: 'Quick Quiz', desc: 'Perfect for a warm-up' },
  { count: 20, emoji: '📚', label: 'Standard Quiz', desc: 'Balanced practice session' },
  { count: 30, emoji: '🏆', label: 'Challenge Mode', desc: 'Put yourself to the test' },
];

export default function QuizSetup({ onStart }) {
  const [selected, setSelected] = useState(null);
  const [uploadedTopic, setUploadedTopic] = useState(null);
  const [questionsGenerated, setQuestionsGenerated] = useState(0);

  // Called by PDFUploader when LLM finishes generating questions
  const handleQuestionsGenerated = (count, topic) => {
    setUploadedTopic(topic);
    setQuestionsGenerated(count);
    // Auto-start with the generated questions (always exactly 10 as requested)
    const quizLen = 10;
    onStart(quizLen, topic);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden">
      {/* Background orbs */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      <div className="glass-card w-full max-w-xl p-8 md:p-10 relative z-10 text-center">
        {/* Logo / Header */}
        <div className="mb-8">
          <span className="text-5xl mb-4 block animate-bounce" style={{ animationDuration: '2s' }}>🎓</span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary tracking-tight mb-2">
            AI Study Coach
          </h1>
          <p className="text-text-secondary text-sm md:text-base">
            Upload your study material or choose a quiz length
          </p>
        </div>

        {/* ── PDF Uploader Section ──────────────────────────────────────── */}
        <div className="mb-6">
          <PDFUploader onQuestionsGenerated={handleQuestionsGenerated} />
        </div>

        {/* ── Divider ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-glass-border" />
          <span className="text-xs font-semibold text-text-muted uppercase tracking-widest">or use existing questions</span>
          <div className="flex-1 h-px bg-glass-border" />
        </div>

        {/* Quiz length cards */}
        <div className="grid gap-3 mb-8">
          {QUIZ_OPTIONS.map((opt) => {
            const isSelected = selected === opt.count;
            return (
              <button
                key={opt.count}
                onClick={() => setSelected(opt.count)}
                className={`option-card flex items-center gap-4 px-5 py-5 text-left w-full ${isSelected ? 'selected' : ''}`}
              >
                <span className="text-3xl flex-shrink-0">{opt.emoji}</span>
                <div className="flex-1">
                  <div className={`text-base font-semibold ${isSelected ? 'text-accent' : 'text-text-primary'}`}>
                    {opt.label}
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">{opt.desc}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-extrabold ${isSelected ? 'text-accent' : 'text-text-secondary'}`}>
                    {opt.count}
                  </span>
                  <span className="text-xs text-text-muted">Qs</span>
                </div>
                {isSelected && (
                  <span className="text-accent">
                    <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" />
                      <path d="M6 10l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Start button — for existing questions (no topic filter) */}
        <button
          onClick={() => selected && onStart(selected, null)}
          disabled={!selected}
          className="btn-primary w-full py-4 text-lg tracking-wide flex items-center justify-center gap-2"
        >
          Start Quiz
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <p className="text-text-muted text-xs mt-5">
          Upload a PDF to generate fresh questions, or select a length to quiz from the existing bank.
        </p>
      </div>
    </div>
  );
}

