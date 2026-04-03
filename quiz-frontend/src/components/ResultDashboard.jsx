import { useState } from 'react';

const API_BASE = 'http://127.0.0.1:8000';

/**
 * Computes per-session analytics from the quiz results array.
 * No backend call needed — everything is derived from the submission responses.
 */
function computeSessionAnalytics(results) {
  const total = results.length;
  const correct = results.filter((r) => r.is_correct).length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100 * 100) / 100 : 0;
  const totalTime = results.reduce((sum, r) => sum + (r.time_taken || 0), 0);
  const avgTime = total > 0 ? Math.round((totalTime / total) * 100) / 100 : 0;

  // Per-topic breakdown
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
      topic,
      total: s.total,
      correct: s.correct,
      accuracy: Math.round((s.correct / s.total) * 100 * 100) / 100,
      avg_time: Math.round((s.timeSum / s.total) * 100) / 100,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);

  const weakTopics = topicPerformance.filter((t) => t.accuracy < 50).map((t) => t.topic);
  const strongTopics = topicPerformance.filter((t) => t.accuracy >= 75).map((t) => t.topic);

  return { total, correct, accuracy, avgTime, topicPerformance, weakTopics, strongTopics };
}

export default function ResultDashboard({ quizResults, onRetake }) {
  const [expanded, setExpanded] = useState(null);

  if (!quizResults || quizResults.length === 0) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
        <div className="bg-orb bg-orb-1" /><div className="bg-orb bg-orb-2" /><div className="bg-orb bg-orb-3" />
        <div className="glass-card p-10 text-center max-w-md relative z-10">
          <span className="text-4xl mb-4 block">📭</span>
          <h2 className="text-lg font-bold text-text-primary mb-2">No results yet</h2>
          <button onClick={onRetake} className="btn-primary mt-4">Take a Quiz</button>
        </div>
      </div>
    );
  }

  const { total, correct, accuracy, avgTime, topicPerformance, weakTopics, strongTopics } =
    computeSessionAnalytics(quizResults);

  const emoji = accuracy >= 80 ? '🏆' : accuracy >= 50 ? '💪' : '📖';
  const gradeLabel =
    accuracy >= 80 ? 'Excellent' :
    accuracy >= 60 ? 'Good Job' :
    accuracy >= 40 ? 'Keep Practicing' : 'Needs Improvement';

  return (
    <div className="relative min-h-screen px-4 py-10 overflow-hidden">
      <div className="bg-orb bg-orb-1" /><div className="bg-orb bg-orb-2" /><div className="bg-orb bg-orb-3" />

      <div className="max-w-3xl mx-auto relative z-10 space-y-6">

        {/* ── Hero Card ──────────────────────────────────────────────── */}
        <div className="glass-card p-8 text-center">
          <span className="text-5xl block mb-3">{emoji}</span>
          <h1 className="text-3xl font-extrabold text-text-primary mb-1">Quiz Complete!</h1>
          <p className="text-text-secondary text-sm mb-6">{gradeLabel}</p>

          {/* Accuracy ring */}
          <div className="relative inline-flex items-center justify-center mb-6">
            <svg width="140" height="140" viewBox="0 0 140 140" className="transform -rotate-90">
              <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(129,140,248,0.1)" strokeWidth="10"/>
              <circle
                cx="70" cy="70" r="60" fill="none"
                stroke="url(#grad)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(accuracy / 100) * 377} 377`}
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#818cf8"/>
                  <stop offset="100%" stopColor="#34d399"/>
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-text-primary">{accuracy}%</span>
              <span className="text-xs text-text-muted">Accuracy</span>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="dashboard-metric-card">
              <div className="text-2xl font-bold text-accent">{correct}</div>
              <div className="text-xs text-text-muted mt-1">Correct</div>
            </div>
            <div className="dashboard-metric-card">
              <div className="text-2xl font-bold text-text-primary">{total}</div>
              <div className="text-xs text-text-muted mt-1">Attempted</div>
            </div>
            <div className="dashboard-metric-card">
              <div className="text-2xl font-bold text-[#fbbf24]">{avgTime}s</div>
              <div className="text-xs text-text-muted mt-1">Avg Time</div>
            </div>
          </div>
        </div>

        {/* ── Topic Performance ──────────────────────────────────────── */}
        {topicPerformance.length > 0 && (
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <span>📊</span> Topic Performance
            </h2>
            <div className="space-y-4">
              {topicPerformance.map((tp) => {
                const barColor =
                  tp.accuracy >= 75 ? 'bg-emerald-500' :
                  tp.accuracy >= 50 ? 'bg-[#fbbf24]' : 'bg-red-500';
                return (
                  <div key={tp.topic}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-medium text-text-secondary">{tp.topic}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-text-muted">{tp.correct}/{tp.total}</span>
                        <span className={`text-sm font-bold ${
                          tp.accuracy >= 75 ? 'text-emerald-400' :
                          tp.accuracy >= 50 ? 'text-[#fbbf24]' : 'text-red-400'
                        }`}>
                          {tp.accuracy}%
                        </span>
                      </div>
                    </div>
                    <div className="progress-track">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                        style={{ width: `${tp.accuracy}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Weak / Strong Topics ───────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2">
              <span>🔴</span> Topics to Revise
            </h3>
            {weakTopics.length === 0 ? (
              <p className="text-xs text-text-muted italic">No weak topics — great work!</p>
            ) : (
              <ul className="space-y-2">
                {weakTopics.map((t) => (
                  <li key={t} className="flex items-center gap-2 text-sm text-text-secondary">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />{t}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2">
              <span>🟢</span> Strong Topics
            </h3>
            {strongTopics.length === 0 ? (
              <p className="text-xs text-text-muted italic">Keep practicing to master topics!</p>
            ) : (
              <ul className="space-y-2">
                {strongTopics.map((t) => (
                  <li key={t} className="flex items-center gap-2 text-sm text-text-secondary">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />{t}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Review Your Answers ─────────────────────────────────────── */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
            <span>📝</span> Review Your Answers
          </h2>
          <div className="space-y-2">
            {quizResults.map((r) => {
              const isOpen = expanded === r.attempt_id;
              return (
                <div key={r.attempt_id}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : r.attempt_id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                      r.is_correct ? 'bg-emerald-500/10 hover:bg-emerald-500/15' : 'bg-red-500/10 hover:bg-red-500/15'
                    }`}
                  >
                    <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      r.is_correct ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                      {r.is_correct ? '✓' : '✗'}
                    </span>
                    <span className="text-text-secondary truncate flex-1">{r.question.text}</span>
                    <span className="text-text-muted text-xs flex-shrink-0">{r.time_taken}s</span>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
                      className={`flex-shrink-0 text-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  {isOpen && (
                    <div className="mt-1 ml-8 mr-2 p-4 rounded-lg bg-[rgba(30,41,59,0.5)] border border-[rgba(255,255,255,0.05)] space-y-3">
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-text-muted text-xs w-24">Your answer:</span>
                          <span className={`font-medium ${r.is_correct ? 'text-emerald-400' : 'text-red-400'}`}>
                            {r.selected_answer}
                          </span>
                        </div>
                        {!r.is_correct && (
                          <div className="flex items-center gap-2">
                            <span className="text-text-muted text-xs w-24">Correct:</span>
                            <span className="font-medium text-emerald-400">{r.correct_answer}</span>
                          </div>
                        )}
                        <p className="text-text-muted text-xs mt-1 italic">{r.message}</p>
                      </div>

                      {r.solution_image && (
                        <div className="solution-image-card mt-3">
                          <div className="px-3 py-1.5 border-b border-[rgba(255,255,255,0.05)] flex items-center gap-2">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                              <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.2"/>
                              <circle cx="5.5" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                              <path d="M1 11l3.5-3.5L8 11l3-4 4 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span className="text-xs text-text-muted font-medium">Solution</span>
                          </div>
                          <img
                            src={r.solution_image.startsWith('http') ? r.solution_image : `${API_BASE}${r.solution_image}`}
                            alt="Solution"
                            className="w-full"
                            loading="lazy"
                          />
                        </div>
                      )}

                      {r.notes_audio_url && (
                        <div className="mt-3 bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                          <div className="text-xs font-medium text-text-secondary mb-2 flex items-center gap-1.5">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1a2.5 2.5 0 0 0-2.5 2.5v4a2.5 2.5 0 0 0 5 0v-4A2.5 2.5 0 0 0 8 1z" stroke="currentColor" strokeWidth="1.3"/><path d="M3.5 7v.5a4.5 4.5 0 0 0 9 0V7M8 12.5V15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                            Your Saved Voice Note
                          </div>
                          <audio controls src={r.notes_audio_url} className="w-full h-8" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Retake Button ──────────────────────────────────────────── */}
        <div className="text-center pb-6">
          <button onClick={onRetake} className="btn-primary px-10 py-3 text-base">
            🔄 Take Another Quiz
          </button>
        </div>
      </div>
    </div>
  );
}
