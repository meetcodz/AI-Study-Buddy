"""
quiz/urls.py

URL patterns for the Quiz Engine API.
All routes are prefixed with /api/ from the root url config.
"""

from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from rest_framework.authtoken.views import obtain_auth_token

from .views import (
    QuestionListView,
    QuestionBankView,
    SubmitAnswerView,
    AnalysisView,
    BookmarkListView,
    UserProfileView,
    QuizSessionStartView,
    UploadPDFView,
    TopicEvaluateView,
)

app_name = 'quiz'

urlpatterns = [
    # GET  /api/questions/        → Randomised questions (no correct_answer) for quiz
    path('questions/', QuestionListView.as_view(), name='questions'),

    # GET  /api/questions/bank/   → All questions WITH correct_answer for question bank UI
    path('questions/bank/', QuestionBankView.as_view(), name='questions_bank'),

    # POST /api/sessions/start/ → Create a new quiz session
    path('sessions/start/', QuizSessionStartView.as_view(), name='session_start'),

    # POST /api/submit/      → Submit an answer, store attempt, return result
    path('submit/', csrf_exempt(SubmitAnswerView.as_view()), name='submit'),

    # GET  /api/analysis/    → Full learning analytics for current user
    path('analysis/', AnalysisView.as_view(), name='analysis'),

    # GET  /api/bookmarks/   → All bookmarked questions
    path('bookmarks/', BookmarkListView.as_view(), name='bookmarks'),

    # GET  /api/profile/     → Current user's learning profile
    path('profile/', UserProfileView.as_view(), name='profile'),

    # POST /api/token/       → Obtain auth token (username + password)
    path('token/', obtain_auth_token, name='api_token_auth'),

    # POST /api/upload-pdf/  → Upload a PDF, generate questions via Gemini
    path('upload-pdf/', csrf_exempt(UploadPDFView.as_view()), name='upload_pdf'),

    # POST /api/topics/<id>/evaluate/  → Evaluate Topic Mastery using OpenRouter
    path('topics/<int:topic_id>/evaluate/', csrf_exempt(TopicEvaluateView.as_view()), name='evaluate_topic'),
]
