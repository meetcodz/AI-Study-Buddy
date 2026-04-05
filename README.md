# 🚀 StudyFlow — Your AI-Powered Learning Companion

**StudyFlow** is a premium, all-in-one learning platform designed to help students master complex subjects through AI-generated quizzes, deep performance analytics, and structured focus sessions.

By bridging the gap between static study material and dynamic testing, StudyFlow transforms your PDFs into interactive learning experiences.

---

## ✨ Key Features

### 🧠 AI Quiz Engine
- **PDF Ingestion**: Upload your textbook or notes (PDF) and let our AI generate high-quality multiple-choice questions automatically.
- **Instant Feedback**: Get immediate results and detailed solutions for every question.
- **Bookmarks**: Save difficult questions for later review in your personal Question Bank.

### 📊 Performance Analytics
- **Topic Intelligence**: Visualize your knowledge across subjects with our Topic Radar (Spider Graph).
- **Accuracy Trends**: Track your growth over time with interactive line charts per topic.
- **AI Mastery Scoring**: Receive qualitative AI feedback on your mastery of specific chapters.
- **Activity Heatmap**: Stay consistent with a GitHub-style activity grid of your study sessions.

### 🕒 Focus & Productivity
- **Focus Timer**: Built-in Pomodoro timer with customizable Focus/Break intervals.
- **Session Tracking**: Monitor your total focus time and daily question goals.
- **Exam Countdown**: Keep your eyes on the prize with a live countdown to your target exam dates.

### 🤖 StudyBot AI
- **24/7 Assistant**: An integrated AI chatbot to explain difficult concepts or answer quick study queries on the fly.

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3 (Glassmorphism), JavaScript (ES6+), Lucide Icons.
- **Backend**: Python 3.9+, Django, Django Rest Framework.
- **AI Power**: Google Gemini (via OpenRouter), PDFPlumber.
- **Database**: PostgreSQL (Recommended) or SQLite.

---

## 🚀 Getting Started

Follow these steps to get StudyFlow running on your local machine.

### 1. Prerequisites
Ensure you have **Python 3.9+** installed. You will also need a **Gemini API Key** from [OpenRouter](https://openrouter.ai/) or Google AI Studio.

### 2. Backend Setup
Navigate to the study backend directory:
```bash
cd Topic_scoring/study_backend
```

Create a `.env` file in this directory and add your keys:
```env
GEMINI_API_KEY=your_openrouter_key_here
OPENROUTER_MODEL=google/gemini-2.0-flash-001
```

Install the required Python packages:
```bash
pip install django djangorestframework django-cors-headers google-generativeai python-dotenv pdfplumber
```

Initialize the database:
```bash
python manage.py migrate
```

Start the API server:
```bash
python manage.py runserver
```
The backend will now be running at `http://127.0.0.1:8000`.

### 3. Frontend Execution
The frontend is built with vanilla web technologies, so no installation is required!

1. Navigate to the `frontend/` folder.
2. Open `finaldash.html` in your favorite browser.
3. *Recommended*: Use the **Live Server** extension in VS Code for the best experience.

---

## 📂 Project Structure

- `frontend/` — The complete user interface (HTML/CSS/JS).
- `Topic_scoring/study_backend/` — Django API handling logic, AI integration, and data storage.
- `Topic_scoring/study_backend/quiz_core/` — The heart of the quiz engine and AI scoring logic.
- `Quiz/` — Legacy quiz modules (for reference).

---

## 🧪 Ingesting your first PDF
To populate the app with your own custom questions from a PDF, run this management command:

```bash
python manage.py ingest_pdf path/to/your_notes.pdf --topic "Mathematics" --per-chunk 5
```

---

## 🤝 Contributing
Feel free to fork this project and submit PRs! We are always looking to improve the AI prompts and UI aesthetics.

---

> [!IMPORTANT]
> Ensure the Django backend is running before using the Quiz, Analytics, or Chatbot features, as they rely on API connectivity.
