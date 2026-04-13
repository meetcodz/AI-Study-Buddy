const API_BASE = 'http://127.0.0.1:8000';

document.addEventListener('DOMContentLoaded', () => {
    const subjectsContainer = document.getElementById('subjects-nav');
    const topicsContainer = document.getElementById('topics-list');
    
    // Stats elements
    const statTotal = document.getElementById('stat-total');
    const statAccuracy = document.getElementById('stat-accuracy');
    const statTime = document.getElementById('stat-time');
    const statWeakest = document.getElementById('stat-weakest');
    const overallSummary = document.getElementById('overall-summary');

    let analysisData = {};
    let currentSubject = '';

    async function fetchAnalysisData() {
        try {
            const response = await fetch(`${API_BASE}/api/analysis/`);
            if (!response.ok) throw new Error('Failed to fetch analysis data');
            
            const data = await response.json();
            
            // Update Stats Grid
            if (statTotal) statTotal.textContent = data.total_attempted;
            if (statAccuracy) statAccuracy.textContent = `${Math.round(data.overall_accuracy)}%`;
            if (statTime) statTime.textContent = `${Math.round(data.avg_time_per_question)}s`;
            if (statWeakest) statWeakest.textContent = data.weak_topics.length > 0 ? data.weak_topics[0] : 'None';
            
            if (overallSummary) {
                overallSummary.innerHTML = `You've mastered <span style="color:#14B8A6; font-weight:600;">${data.strong_topics.length}</span> topics. Keep pushing!`;
            }

            // Group topics by chapter
            const grouped = {};
            if (data.topic_performance && data.topic_performance.length > 0) {
                data.topic_performance.forEach(tp => {
                    const chapter = tp.chapter_name || 'General';
                    if (!grouped[chapter]) grouped[chapter] = [];
                    
                    grouped[chapter].push({
                        topic_id: tp.topic_id || 0, // Placeholder if not in JSON yet
                        topic: tp.topic,
                        mastery_score: tp.mastery_score || 0,
                        status: tp.status || 'Average',
                        ai_feedback: tp.ai_feedback || "Take more quizzes to get AI feedback.",
                        total: tp.total,
                        accuracy: tp.accuracy,
                        avg_time: tp.avg_time,
                        questions: (tp.attempts || []).map(at => ({
                            text: at.question_text || "Question text unavailable",
                            userAnswer: at.selected_answer || "N/A",
                            correctAnswer: at.correct_answer || "N/A",
                            isCorrect: at.is_correct || false
                        }))
                    });
                });
            }

            analysisData = grouped;

            // New: Handle Session Performance (Quiz-by-Quiz)
            if (data.session_performance && data.session_performance.length > 0) {
                analysisData['Quiz History'] = data.session_performance.map(sp => ({
                    topic: sp.topic_name,
                    mastery_score: sp.mastery_score,
                    status: sp.status,
                    ai_feedback: sp.ai_feedback,
                    recommended_subtopics: sp.recommended_subtopics || [],
                    total: sp.quiz_length,
                    accuracy: sp.accuracy,
                    avg_time: 0, // Session-level avg time not computed here yet
                    isSession: true,
                    date: new Date(sp.completed_at).toLocaleDateString()
                }));
            }

            const subjects = Object.keys(analysisData);
            if (subjects.length > 0) {
                if (!currentSubject || !subjects.includes(currentSubject)) {
                    currentSubject = subjects[0];
                }
                renderSubjects();
                renderTopics();
            } else {
                topicsContainer.innerHTML = '<div style="color: #8892A4; padding: 40px; text-align: center;">No analysis data found.<br>Complete a quiz to see your insights.</div>';
            }

        } catch (error) {
            console.error('Error:', error);
            if (overallSummary) overallSummary.innerHTML = `<span style="color: #EF4444;">Error: ${error.message}</span>`;
        }
    }

    function renderSubjects() {
        subjectsContainer.innerHTML = '';
        Object.keys(analysisData).forEach(subject => {
            const btn = document.createElement('div');
            btn.className = `subject-pill ${subject === currentSubject ? 'active' : ''}`;
            btn.innerHTML = `<i data-lucide="book" style="width: 14px; height: 14px;"></i> ${subject}`;
            btn.addEventListener('click', () => {
                currentSubject = subject;
                renderSubjects();
                renderTopics();
            });
            subjectsContainer.appendChild(btn);
        });
        if (window.lucide) lucide.createIcons();
    }

    function renderTopics() {
        topicsContainer.innerHTML = '';
        const topics = analysisData[currentSubject];

        if (!topics) return;

        topics.forEach((tData) => {
            const card = document.createElement('div');
            card.className = 'topic-card';

            const questionsHTML = (tData.questions && tData.questions.length > 0) ? tData.questions.map(q => `
                <div class="question-item">
                    <div class="q-header">
                        <span class="q-status ${q.isCorrect ? 'correct' : 'incorrect'}">${q.isCorrect ? 'Correct' : 'Incorrect'}</span>
                    </div>
                    <div class="q-body">
                        <p style="background: linear-gradient(135deg, #fff 0%, #8892A4 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 8px;"><strong>Q:</strong> ${q.text}</p>
                        <p style="font-size: 13px; color: #8892A4;">
                            <strong>Your Answer:</strong> ${q.userAnswer} 
                            ${!q.isCorrect ? `<br><strong style="color: #14B8A6;">Correct:</strong> ${q.correctAnswer}` : ''}
                        </p>
                    </div>
                </div>
            `).join('') : '<div style="grid-column: 1/-1; padding: 30px; text-align: center; color: #4B5563; font-size: 13px; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.05);"><i data-lucide="info" style="width:16px; margin-bottom:8px; opacity:0.5;"></i><br>No recent question details available for this topic.</div>';

            const isSession = tData.isSession;
            const subtopicsHTML = (tData.recommended_subtopics && tData.recommended_subtopics.length > 0) ? `
                <div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px;">
                    ${tData.recommended_subtopics.map(s => `<span style="font-size: 10px; padding: 4px 10px; border-radius: 100px; background: rgba(59, 130, 246, 0.1); color: #3B82F6; border: 1px solid rgba(59, 130, 246, 0.2);">${s}</span>`).join('')}
                </div>
            ` : '';

            card.innerHTML = `
                <div class="topic-header" onclick="this.parentElement.classList.toggle('open')">
                    <div class="topic-info-left">
                        <div class="topic-title">${tData.topic} ${isSession ? `<span style="font-size: 11px; opacity: 0.5; font-weight: normal; margin-left: 8px;">${tData.date}</span>` : ''}</div>
                        <div class="topic-meta">
                            <span><i data-lucide="${isSession ? 'calendar' : 'file-question'}" style="width:14px;"></i> ${tData.total} ${isSession ? 'Questions' : 'Qs'}</span>
                            <span><i data-lucide="activity" style="width:14px;"></i> ${isSession ? 'Session Accuracy' : 'Mastery'}: ${tData.accuracy}%</span>
                            <div class="mastery-progress-bg">
                                <div class="mastery-progress-fill" style="width: ${tData.accuracy}%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="topic-toggle">
                        <i data-lucide="chevron-down" style="color: #4B5563;"></i>
                    </div>
                </div>
                <div class="topic-content">
                    <div class="topic-content-inner">
                        <div class="ai-feedback-module" style="background: rgba(20, 184, 166, 0.03); border-color: rgba(20, 184, 166, 0.1);">
                            <div class="ai-feedback-header" style="color: #14B8A6;">
                                <i data-lucide="sparkles" style="width: 14px;"></i> ${isSession ? 'Quiz Performance Insights' : 'AI Insights'}
                            </div>
                            <div class="ai-feedback-text">${tData.ai_feedback}</div>
                            ${subtopicsHTML}
                        </div>
                        ${!isSession ? `
                        <div class="questions-grid">
                            ${questionsHTML}
                        </div>
                        ` : `
                        <div style="padding: 20px; text-align: center; color: #8892A4; font-size: 13px;">
                            Detailed session breakdown is coming soon. Click to review this quiz in your history.
                        </div>
                        `}
                    </div>
                </div>
            `;
            topicsContainer.appendChild(card);
        });
        if (window.lucide) lucide.createIcons();
    }

    fetchAnalysisData();
});

