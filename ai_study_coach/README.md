# 🎓 AI Study Coach — Quiz Engine Backend

A production-ready Django + PostgreSQL backend for an AI-powered quiz engine with learning analytics.

---

## 📁 Project Structure

```
ai_study_coach/
├── config/
│   ├── __init__.py
│   ├── settings.py          # Django settings (DB, DRF, media, etc.)
│   ├── urls.py              # Root URL config
│   └── wsgi.py              # WSGI entry point
│
├── quiz/
│   ├── migrations/
│   │   ├── __init__.py
│   │   └── 0001_initial.py  # Initial DB schema
│   ├── fixtures/
│   │   └── sample_questions.json  # 10 sample questions
│   ├── __init__.py
│   ├── admin.py             # Admin panel config
│   ├── apps.py              # App config + signal wiring
│   ├── models.py            # Question, UserProfile, Attempt
│   ├── serializers.py       # DRF serializers
│   ├── services.py          # Analysis engine (pure business logic)
│   ├── signals.py           # Auto-create UserProfile on User save
│   ├── urls.py              # App-level URL patterns
│   └── views.py             # All API views
│
├── media/                   # Uploaded audio notes (auto-created)
├── manage.py
└── requirements.txt
```

---

## ⚙️ Setup Instructions

### 1. Clone / set up the project

```bash
git clone <your-repo>
cd ai_study_coach
```

### 2. Create and activate a virtual environment

```bash
python -m venv venv
source venv/bin/activate        # Linux/macOS
# venv\Scripts\activate         # Windows
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure PostgreSQL

Create the database:

```sql
CREATE DATABASE ai_study_coach;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE ai_study_coach TO postgres;
```

Or set environment variables to match your setup:

```bash
export DB_NAME=ai_study_coach
export DB_USER=your_db_user
export DB_PASSWORD=your_db_password
export DB_HOST=localhost
export DB_PORT=5432
```

### 5. Run migrations

```bash
python manage.py migrate
```

### 6. Load sample questions

```bash
python manage.py loaddata quiz/fixtures/sample_questions.json
```

### 7. Create a superuser (for admin panel)

```bash
python manage.py createsuperuser
```

### 8. Start the development server

```bash
python manage.py runserver
```

The API is now live at `http://127.0.0.1:8000/`

---

## 🔑 Authentication

All API endpoints require authentication. The project uses **Token Authentication** (DRF).

### Get a token

```bash
curl -X POST http://127.0.0.1:8000/api-auth/login/ \
  -d "username=yourusername&password=yourpassword"
```

Or use the DRF browsable API at `http://127.0.0.1:8000/api-auth/login/`

### Use the token in requests

```bash
curl -H "Authorization: Token <your_token>" http://127.0.0.1:8000/api/questions/
```

### Create a token manually (via Django shell)

```bash
python manage.py shell
>>> from django.contrib.auth.models import User
>>> from rest_framework.authtoken.models import Token
>>> user = User.objects.get(username='yourusername')
>>> token, _ = Token.objects.get_or_create(user=user)
>>> print(token.key)
```

---

## 🔌 API Reference

### 1. `GET /api/questions/`

Returns a randomised set of questions. **Correct answers are never included.**

**Query parameters:**

| Param       | Type   | Default | Description                          |
|-------------|--------|---------|--------------------------------------|
| `limit`     | int    | 10      | Number of questions (max 50)         |
| `topic`     | string | —       | Filter by topic (case-insensitive)   |
| `difficulty`| string | —       | `easy` / `medium` / `hard`           |

**Example:**

```bash
GET /api/questions/?limit=5&topic=Mathematics&difficulty=medium
```

**Response:**

```json
{
  "count": 5,
  "questions": [
    {
      "id": 5,
      "text": "Solve: If x² = 64, what are the possible values of x?",
      "options": ["8 only", "-8 only", "8 and -8", "4 and -4"],
      "topic": "Mathematics",
      "difficulty": "medium",
      "solution_image": null
    }
  ]
}
```

---

### 2. `POST /api/submit/`

Submit a user's answer. Stores the attempt and returns the result.

**Content-Type:** `application/json` or `multipart/form-data` (for audio upload)

**Request body:**

```json
{
  "question_id": 5,
  "selected_answer": "8 and -8",
  "time_taken": 42,
  "bookmarked": false,
  "notes_text": "Remember: x² = 64 has two solutions",
  "notes_audio": "<file upload — optional>"
}
```

| Field           | Type    | Required | Description                              |
|-----------------|---------|----------|------------------------------------------|
| `question_id`   | int     | ✅       | ID of the question being answered        |
| `selected_answer`| string | ✅       | The option the user chose                |
| `time_taken`    | int     | ✅       | Seconds taken (from frontend timer)      |
| `bookmarked`    | bool    | ✅       | Whether to bookmark this question        |
| `notes_text`    | string  | ❌       | Optional text note                       |
| `notes_audio`   | file    | ❌       | Optional audio file upload (multipart)   |

**Response (201 Created):**

```json
{
  "attempt_id": 14,
  "is_correct": true,
  "correct_answer": "8 and -8",
  "solution_image": null,
  "message": "Correct! Well done."
}
```

---

### 3. `GET /api/analysis/`

Returns full learning analytics for the authenticated user. Also updates the user's profile.

**Response:**

```json
{
  "total_attempted": 20,
  "total_correct": 14,
  "overall_accuracy": 70.0,
  "avg_time_per_question": 38.5,
  "topic_performance": [
    {
      "topic": "Mathematics",
      "total": 8,
      "correct": 3,
      "accuracy": 37.5,
      "avg_time": 52.1
    },
    {
      "topic": "Science",
      "total": 6,
      "correct": 5,
      "accuracy": 83.3,
      "avg_time": 25.0
    }
  ],
  "weak_topics": ["Mathematics"],
  "strong_topics": ["Science"]
}
```

**Analysis thresholds:**

| Classification | Accuracy   |
|----------------|------------|
| Weak topic     | < 50%      |
| Neutral        | 50% – 75%  |
| Strong topic   | > 75%      |

---

### 4. `GET /api/bookmarks/`

Returns all bookmarked questions with full details and notes.

**Response:**

```json
{
  "count": 2,
  "bookmarks": [
    {
      "id": 14,
      "question": {
        "id": 5,
        "text": "Solve: If x² = 64...",
        "options": ["8 only", "-8 only", "8 and -8", "4 and -4"],
        "topic": "Mathematics",
        "difficulty": "medium",
        "solution_image": null
      },
      "selected_answer": "8 and -8",
      "is_correct": true,
      "time_taken": 42,
      "bookmarked": true,
      "notes_text": "Remember: x² = 64 has two solutions",
      "notes_audio_url": "http://127.0.0.1:8000/media/audio_notes/2026/03/25/note.mp3",
      "created_at": "2026-03-25T10:00:00Z"
    }
  ]
}
```

---

### 5. `GET /api/profile/`

Returns the current user's learning profile (updated after each `/api/analysis/` call).

**Response:**

```json
{
  "username": "alice",
  "email": "alice@example.com",
  "accuracy": 70.0,
  "avg_time": 38.5,
  "weak_topics": ["Mathematics"],
  "strong_topics": ["Science"],
  "updated_at": "2026-03-25T10:05:00Z"
}
```

---

## 🎤 Audio Notes

To submit a question with an audio note, use `multipart/form-data`:

```bash
curl -X POST http://127.0.0.1:8000/api/submit/ \
  -H "Authorization: Token <your_token>" \
  -F "question_id=5" \
  -F "selected_answer=8 and -8" \
  -F "time_taken=42" \
  -F "bookmarked=true" \
  -F "notes_audio=@/path/to/your/recording.mp3"
```

Audio files are stored in `media/audio_notes/YYYY/MM/DD/` and served at `/media/`.

---

## 🛠️ Admin Panel

Visit `http://127.0.0.1:8000/admin/` and log in with your superuser credentials.

**What you can do in admin:**
- ➕ Add/edit/delete Questions (with full JSON options editor)
- 👤 View User Profiles and learning stats
- 📋 Browse all Attempts with filters for topic, difficulty, correctness
- 🔍 Search questions by text or topic

---

## 🧪 Adding More Sample Data

Via Django Admin:
1. Go to `http://127.0.0.1:8000/admin/quiz/question/add/`
2. Fill in the question text, options as JSON, correct answer, topic, and difficulty

Via the Django shell:

```python
python manage.py shell

from quiz.models import Question

Question.objects.create(
    text="What is the speed of light in a vacuum?",
    options=["300,000 km/s", "150,000 km/s", "450,000 km/s", "200,000 km/s"],
    correct_answer="300,000 km/s",
    topic="Physics",
    difficulty="easy",
)
```

---

## 🧩 Architecture Notes

- **services.py** contains all business logic (analysis engine). It is completely independent of HTTP — easy to test and reuse.
- **signals.py** auto-creates a `UserProfile` for every new `User`, so the profile always exists.
- **Correct answers** are never exposed via `GET /api/questions/`. They are only returned after submission in `POST /api/submit/`.
- **Audio uploads** are stored under `media/audio_notes/` and returned as absolute URLs in bookmark responses.
- **Token Authentication** is used. In production, switch to JWT (e.g. `djangorestframework-simplejwt`).

---

## 🚀 Production Checklist

- [ ] Set `DEBUG = False` in settings
- [ ] Set a strong `SECRET_KEY` (use environment variable)
- [ ] Restrict `ALLOWED_HOSTS` to your domain
- [ ] Use a proper object storage (AWS S3, Cloudflare R2) for `MEDIA_ROOT`
- [ ] Switch to JWT authentication
- [ ] Add rate limiting (e.g. `django-ratelimit`)
- [ ] Set up `gunicorn` + `nginx`
- [ ] Configure HTTPS
