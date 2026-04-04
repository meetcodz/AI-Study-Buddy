const API_BASE = "http://localhost:8000/api";

async function fetchTopics() {
    const list = document.getElementById("topics-list");
    list.innerHTML = "Loading...";
    try {
        const res = await fetch(`${API_BASE}/topics/`);
        const data = await res.json();
        list.innerHTML = "";
        
        if (data.topics.length === 0) {
            list.innerHTML = "<p>No topics found. Did you run test_demo.py first?</p>";
        }

        data.topics.forEach(t => {
            const statusClass = t.status === 'Weak' ? 'weak' : (t.status === 'Strong' ? 'strong' : 'average');
            let questionsHtml = "";
            t.questions.forEach(q => {
                questionsHtml += `<li style="font-size: 0.85em; margin-bottom: 4px;">• ${q.text} <small>(${q.difficulty})</small></li>`;
            });

            list.innerHTML += `
                <div class="topic-card">
                    <h4>${t.name} <span class="${statusClass}">(${t.status})</span></h4>
                    <p style="font-size: 0.9em; color:#8b949e; margin-bottom: 8px;">Score: ${t.mastery_score}/100 | Tags: ${t.tags.join(", ")}</p>
                    <div style="border-top: 1px solid #30363d; padding-top: 10px;">
                        <span style="font-size: 0.8em; color: #7d8590; text-transform: uppercase;">Stored Questions:</span>
                        <ul style="list-style: none; padding: 0; margin: 8px 0 0 0;">${questionsHtml || "<li>No questions stored yet.</li>"}</ul>
                    </div>
                </div>
            `;
        });
    } catch(e) {
        list.innerHTML = `<p style="color:red;">Error fetching topics: ${e.message}. Is Django running?</p>`;
    }
}

let currentQuestion = null;

async function fetchRandomQuestion() {
    const area = document.getElementById("quiz-area");
    try {
        const res = await fetch(`${API_BASE}/questions/random/`);
        if(!res.ok) throw new Error("No questions available");
        const q = await res.json();
        currentQuestion = q;
        
        document.getElementById("q-topic").textContent = q.topic_id;
        document.getElementById("q-text").textContent = q.text;
        
        const optsContainer = document.getElementById("q-options");
        optsContainer.innerHTML = "";
        
        q.options.forEach(opt => {
            const btn = document.createElement("button");
            btn.className = "option-btn";
            btn.textContent = opt;
            btn.onclick = () => submitAnswer(opt);
            optsContainer.appendChild(btn);
        });
        
        area.style.display = "block";
    } catch(e) {
        alert(e.message);
    }
}

async function submitAnswer(selectedOption) {
    const timeSpent = parseInt(document.getElementById("q-time").value) || 10;
    const hintsUsed = parseInt(document.getElementById("q-hints").value) || 0;
    
    const payload = {
        question_id: currentQuestion.question_id,
        selected_option: selectedOption,
        time_spent_seconds: timeSpent,
        hints_used: hintsUsed
    };

    try {
        const res = await fetch(`${API_BASE}/quiz/submit/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        
        let msg = result.is_correct ? "CORRECT!" : "INCORRECT!";
        msg += `\nTopic Score updated to: ${result.new_topic_score}/100 (${result.new_topic_status})`;
        alert(msg);
        
        document.getElementById("quiz-area").style.display = "none";
        
        // Refresh the dashboard immediately to visually track changes
        fetchTopics();
    } catch(e) {
        alert("Failed to submit: " + e.message);
    }
}

// Auto-fetch topics on load
fetchTopics();
