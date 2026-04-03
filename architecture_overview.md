# AI Study Coach — Complete Workflow & Architecture Guide

This document explains the entire architecture, API endpoints, data flow, and libraries used to build the AI Study Coach Quiz Engine. It's designed to help you understand the system inside out for your hackathon presentation.

---

## 1. Technology Stack & Libraries

### Frontend (User Interface)
*   **React 18** — Core library for building the interactive UI components.
*   **Vite** — High-performance build tool and dev server.
*   **Tailwind CSS v4** — Utility-first CSS framework used for the "glassmorphic" dark-mode styling, gradients, and animations.
*   **Lucide React** (Optional/Icons) — For SVG icons.
*   **MediaRecorder API** — Native browser API used to capture the user's microphone audio for Voice Notes.

### Backend (Server & Database)
*   **Django 5** — Core backend web framework.
*   **Django REST Framework (DRF)** — Used to build the JSON APIs.
*   **PostgreSQL** — Relational database storing users, questions, quiz sessions, and attempts.
*   **django-cors-headers** — Middleware that allows our Vite frontend (port 5173) to securely communicate with Django (port 8000).
*   **pdfplumber** — Python library used to extract text accurately from uploaded PDF study materials.
*   **google-generativeai** — Official Gemini Python SDK used to send text chunks to the LLM to generate multiple-choice questions.

---

## 2. The Data Models (Database Structure)

The backend revolves around 4 primary PostgreSQL tables:

1.  **Question**: Stores the MCQ text, the 4 possible options (array), the `correct_answer`, `topic`, `difficulty`, and an optional `solution_image`.
2.  **QuizSession**: Groups a single quiz "run". It tracks who took the quiz, when it started, and how many questions were expected.
3.  **Attempt**: The core tracking table. Every time a user answers *one* question, an [Attempt](file:///c:/Users/Asus/OneDrive/Desktop/quiz_engine_backend/ai_study_coach/quiz/models.py#136-204) row is created. It links to a [QuizSession](file:///c:/Users/Asus/OneDrive/Desktop/quiz_engine_backend/ai_study_coach/quiz/models.py#110-132) and a [Question](file:///c:/Users/Asus/OneDrive/Desktop/quiz_engine_backend/ai_study_coach/quiz/models.py#15-64). It stores what the user selected ([selected_answer](file:///c:/Users/Asus/OneDrive/Desktop/quiz_engine_backend/ai_study_coach/quiz/serializers.py#101-106)), whether they were right (`is_correct`), the `time_taken`, and any uploaded audio file ([notes_audio](file:///c:/Users/Asus/OneDrive/Desktop/quiz_engine_backend/ai_study_coach/quiz/serializers.py#147-155)).
4.  **UserProfile**: Maintains lifetime stats for a user (overall accuracy, average time, weak/strong topics).

---

## 3. The API Endpoints

The frontend communicates with the backend via these 4 REST API endpoints:

| Endpoint | Method | Purpose | Data Flow |
| :--- | :--- | :--- | :--- |
| `/api/sessions/start/` | `POST` | Initializes a new quiz run. | **In:** `{ quiz_length: 10 }`<br>**Out:** `{ session_id: 42 }` |
| `/api/questions/?limit=X` | `GET` | Fetches $X$ random questions. | **Out:** Array of questions. *Note: The `correct_answer` is intentionally hidden from this response so users can't cheat!* |
| `/api/submit/` | `POST` | Grades a single answered question and saves the audio note. | **In:** [question_id](file:///c:/Users/Asus/OneDrive/Desktop/quiz_engine_backend/ai_study_coach/quiz/serializers.py#93-100), [selected_answer](file:///c:/Users/Asus/OneDrive/Desktop/quiz_engine_backend/ai_study_coach/quiz/serializers.py#101-106), `time_taken`, `session_id`, and a [notes_audio](file:///c:/Users/Asus/OneDrive/Desktop/quiz_engine_backend/ai_study_coach/quiz/serializers.py#147-155) blob (sent as `multipart/form-data`).<br>**Out:** `{ is_correct, correct_answer, notes_audio_url }` |
| `/api/analysis/` | `GET` | Calculates lifetime performance. | **Out:** `{ total_score, overall_accuracy, avg_time, weak_topics, strong_topics }` |

---

## 4. The Step-by-Step Application Workflow

Here is exactly what happens from the moment a user opens the app to the moment they finish a quiz.

### Phase A: Setup & Initialization
1.  **User opens `http://localhost:5173/`**: The React [App.jsx](file:///c:/Users/Asus/OneDrive/Desktop/quiz_engine_backend/quiz-frontend/src/App.jsx) component mounts and renders the [QuizSetup.jsx](file:///c:/Users/Asus/OneDrive/Desktop/quiz_engine_backend/quiz-frontend/src/components/QuizSetup.jsx) component.
2.  **User selects lengths (e.g., 10 questions)**: The user clicks a glassmorphic button and hits "Start". The `quizLength` state in [App.jsx](file:///c:/Users/Asus/OneDrive/Desktop/quiz_engine_backend/quiz-frontend/src/App.jsx) is updated to 10. [App.jsx](file:///c:/Users/Asus/OneDrive/Desktop/quiz_engine_backend/quiz-frontend/src/App.jsx) immediately switches the view to render the [Quiz.jsx](file:///c:/Users/Asus/OneDrive/Desktop/quiz_engine_backend/quiz-frontend/src/components/Quiz.jsx) component.

### Phase B: Taking the Quiz (The [Quiz.jsx](file:///c:/Users/Asus/OneDrive/Desktop/quiz_engine_backend/quiz-frontend/src/components/Quiz.jsx) Engine)
1.  **Fetching Data**: As soon as [Quiz.jsx](file:///c:/Users/Asus/OneDrive/Desktop/quiz_engine_backend/quiz-frontend/src/components/Quiz.jsx) mounts, a `useEffect` triggers two API calls:
    *   It POSTs to `/api/sessions/start/` to get a `session_id` (e.g., Session #42).
    *   It GETs `/api/questions/?limit=10` to get an array of 10 question objects.
2.  **The Timer**: A `setInterval` begins counting seconds in the background. If the user clicks "Next" or "Previous", the exact elapsed time for that specific question is saved to a local React dictionary (e.g., `{ question_1: 15s, question_2: 45s }`).
3.  **Voice Notes**: If the user clicks the microphone button, React asks the browser for microphone permissions using `navigator.mediaDevices.getUserMedia()`. The `MediaRecorder` API captures the audio. When the user stops recording, the audio is converted into a binary `Blob` and saved in React state, keyed to that specific question ID.
4.  **Local State**: As the user clicks options (A, B, C, or D), React stores their choices in a dictionary: `{ q1: "Option A", q2: "Option C" }`. *Nothing is sent to the backend yet.*

### Phase C: Submission & Grading
1.  **Hitting Submit**: When the user clicks "Finish & Submit" on the last question, [Quiz.jsx](file:///c:/Users/Asus/OneDrive/Desktop/quiz_engine_backend/quiz-frontend/src/components/Quiz.jsx) loops through every single question they answered.
2.  **The Submissions**: For each question, React makes a `POST` request to `/api/submit/`.
    *   *If there is NO voice note*, it sends a simple JSON payload.
    *   *If there IS a voice note*, it constructs a `FormData` object (packaging the binary Audio Blob + the text data) and sends it as a `multipart/form-data` request.
3.  **Backend Processing**: Django receives the `/api/submit/` request. It checks if the [selected_answer](file:///c:/Users/Asus/OneDrive/Desktop/quiz_engine_backend/ai_study_coach/quiz/serializers.py#101-106) matches the database `correct_answer`. It saves the audio file to the `media/audio_notes/` folder on your hard drive. It creates an [Attempt](file:///c:/Users/Asus/OneDrive/Desktop/quiz_engine_backend/ai_study_coach/quiz/models.py#136-204) record in PostgreSQL linked to Session #42. It then responds to React with the result and the audio URL.
4.  **Transition**: Once all 10 submissions finish successfully, [Quiz.jsx](file:///c:/Users/Asus/OneDrive/Desktop/quiz_engine_backend/quiz-frontend/src/components/Quiz.jsx) passes an array of the results back up to [App.jsx](file:///c:/Users/Asus/OneDrive/Desktop/quiz_engine_backend/quiz-frontend/src/App.jsx), which then switches the view to the [ResultDashboard.jsx](file:///c:/Users/Asus/OneDrive/Desktop/quiz_engine_backend/quiz-frontend/src/components/ResultDashboard.jsx).

### Phase D: The Results Dashboard
1.  **Analytics**: [ResultDashboard.jsx](file:///c:/Users/Asus/OneDrive/Desktop/quiz_engine_backend/quiz-frontend/src/components/ResultDashboard.jsx) takes the array of 10 results and instantly runs math in the browser to calculate:
    *   **Accuracy Check**: [(Total Correct / 10) * 100](file:///c:/Users/Asus/OneDrive/Desktop/quiz_engine_backend/ai_study_coach/quiz/views.py#291-302) (Draws the circular SVG progress ring).
    *   **Topic Grouping**: It looks at the `topic` string of every question, groups them, and calculates accuracy percentages per topic to draw the horizontal progress bars.
    *   **Weak Topics**: Any topic falling below a 60% accuracy threshold is flagged in red.
2.  **Review Section**: At the bottom, a list of questions is rendered. If a user expands a question:
    *   React displays the correct answer vs. what the user selected.
    *   If the Django response included a [notes_audio_url](file:///c:/Users/Asus/OneDrive/Desktop/quiz_engine_backend/ai_study_coach/quiz/serializers.py#147-155), React renders an `<audio controls src="...">` tag, allowing the user to play the exact voice file they stored on the server.
    *   If the Django response included a `solution_image` URL, an `<img>` tag is rendered to visually explain the math/science problem.

---

## 5. The Bonus PDF Ingestion Workflow

To get questions into the database in the first place, we built an AI pipeline pipeline ([ingest_pdf.py](file:///c:/Users/Asus/OneDrive/Desktop/quiz_engine_backend/ai_study_coach/quiz/management/commands/ingest_pdf.py)).

1.  **Execution**: You run `python manage.py ingest_pdf notes.pdf --topic Science`.
2.  **Extraction**: The python script uses `pdfplumber` to open the PDF file and read raw text from every single page, stitching it together.
3.  **Chunking**: Because LLMs have context limits, the script intelligently splits the massive text block into smaller "chunks" (approx 3,000 characters each) at paragraph breaks.
4.  **AI Generation**: For every chunk, the script uses the `google-generativeai` SDK to ping the Gemini API. It sends a strict system prompt instructing Gemini to act as a teacher and return exactly 10 questions formatted as a **JSON Array**.
5.  **Parsing & Saving**: The script uses Regular Expressions to strip away any markdown formatting Gemini might have added, parses the JSON, and uses the Django ORM (`Question.objects.create()`) to save those questions directly into your PostgreSQL database so the React frontend can fetch them!
