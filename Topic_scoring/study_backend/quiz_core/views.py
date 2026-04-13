"""
quiz/views.py

All API views for the Quiz Engine.

Endpoints:
    GET  /api/questions/      → Fetch randomised questions (no correct_answer)
    POST /api/submit/         → Submit an answer, store attempt, return result
    GET  /api/analysis/       → Full learning analytics for the current user
    GET  /api/bookmarks/      → All bookmarked attempts for the current user
    GET  /api/profile/        → Current user's learning profile
"""

import logging
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Question, Attempt, QuizSession, Tag, Chapter, Topic
from .serializers import (
    QuestionSerializer,
    QuestionBankSerializer,
    SubmitAnswerSerializer,
    AttemptSerializer,
    UserProfileSerializer,
    AnalysisResponseSerializer,
    QuizSessionStartSerializer,
)
from .services import compute_analysis, get_bookmarked_attempts
from .ai_scoring_service import evaluate_topic_mastery
from .models import Topic

logger = logging.getLogger(__name__)


# ─── GET /api/questions/ ─────────────────────────────────────────────────────

class QuestionListView(APIView):
    """
    Returns a randomised set of questions for a quiz session.

    Query params:
        limit   → number of questions to return (default: 10, max: 50)
        topic   → filter by topic (optional)
        difficulty → filter by difficulty: easy / medium / hard (optional)

    Correct answers are intentionally excluded from the response.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        limit = self._parse_limit(request.query_params.get('limit', 10))
        topic = request.query_params.get('topic', None)
        difficulty = request.query_params.get('difficulty', None)

        qs = Question.objects.select_related('topic').all()

        if difficulty:
            if difficulty not in ('easy', 'medium', 'hard'):
                return Response(
                    {'error': "difficulty must be 'easy', 'medium', or 'hard'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            qs = qs.filter(difficulty=difficulty)

        questions = []
        
        if topic:
            # Prioritize the most recently generated questions for this topic
            topic_qs = qs.filter(topic__name__iexact=topic).order_by('-created_at')
            topic_list = list(topic_qs[:limit])
            
            import random
            random.shuffle(topic_list)
            
            questions.extend(topic_list)
            
            if len(questions) < limit:
                remaining = limit - len(questions)
                rest_qs = qs.exclude(topic__name__iexact=topic).order_by('?')
                rest_list = list(rest_qs[:remaining])
                questions.extend(rest_list)
        else:
            questions = list(qs.order_by('?')[:limit])

        if not questions:
            return Response(
                {'message': 'No questions found matching the given filters.', 'questions': []},
                status=status.HTTP_200_OK,
            )

        serializer = QuestionSerializer(questions, many=True)
        return Response({
            'count': len(serializer.data),
            'questions': serializer.data,
        })

    @staticmethod
    def _parse_limit(raw_limit) -> int:
        try:
            limit = int(raw_limit)
        except (TypeError, ValueError):
            limit = 10
        return max(1, min(limit, 500))  # raised cap to 500 for question bank


# ─── GET /api/questions/bank/ ────────────────────────────────────────────────────

class QuestionBankView(APIView):
    """
    Returns ALL questions WITH correct_answer for the Question Bank UI.
    Not used during quiz play — only for study/review.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from django.db.models import Prefetch

        latest_attempt_qs = Attempt.objects.order_by('-created_at')
        qs = Question.objects.select_related('topic').prefetch_related(
            Prefetch('attempts', queryset=latest_attempt_qs, to_attr='latest_attempt')
        ).order_by('-created_at')[:500]

        serializer = QuestionBankSerializer(qs, many=True)
        return Response({
            'count': len(serializer.data),
            'questions': serializer.data,
        })


# ─── POST /api/sessions/start/ ────────────────────────────────────────────────

class QuizSessionStartView(APIView):
    """
    Starts a new QuizSession for the current user (or guest) and returns its ID.
    Frontend calls this once before fetching questions for a new quiz run.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = QuizSessionStartSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Resolve user (guest fallback)
        from django.contrib.auth.models import User
        if request.user and request.user.is_authenticated:
            user = request.user
        else:
            user, _ = User.objects.get_or_create(
                username='guest',
                defaults={'email': 'guest@aistudycoach.local'},
            )

        session = QuizSession.objects.create(
            user=user,
            quiz_length=serializer.validated_data['quiz_length'],
            topic_name=serializer.validated_data.get('topic_name')
        )

        return Response(
            {'session_id': session.id, 'quiz_length': session.quiz_length},
            status=status.HTTP_201_CREATED
        )


# ─── POST /api/sessions/<id>/complete/ ──────────────────────────────────────

class QuizSessionCompleteView(APIView):
    """
    Marks a session as complete and triggers the AI evaluation for all topics
    that the user encountered during this session.
    """
    permission_classes = [AllowAny]

    def post(self, request, pk):
        from django.utils import timezone
        import threading
        
        session = get_object_or_404(QuizSession, pk=pk)
        
        if not session.completed_at:
            session.completed_at = timezone.now()
            session.save()
            
        # 1. Evaluate individual topics (Global Aggregate)
        attempts = session.attempts.select_related('question__topic').all()
        topics = set(a.question.topic for a in attempts if a.question.topic)
        
        for topic in topics:
            evaluate_topic_mastery(session.user, topic)
            
        # 2. Evaluate the specific Session (Per-Quiz Analytics)
        try:
            from .ai_scoring_service import evaluate_session_mastery
            session_eval = evaluate_session_mastery(session)
        except Exception as e:
            logger.error(f"Session evaluation failed: {e}")
            session_eval = {"error": str(e)}
                
        return Response({
            'message': 'Quiz completed and AI processing finished.',
            'session_id': session.id,
            'evaluation': session_eval
        }, status=status.HTTP_200_OK)


# ─── POST /api/submit/ ────────────────────────────────────────────────────────

class SubmitAnswerView(APIView):
    """
    Accepts a user's answer, checks correctness, stores the attempt.

    Supports:
        - JSON body (no audio)
        - multipart/form-data (with audio file upload)
    """

    permission_classes = [AllowAny]
    # Accept both JSON (no file) and multipart (with audio file)
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        serializer = SubmitAnswerSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        question = get_object_or_404(Question, pk=data['question_id'])

        # ── Check correctness ──────────────────────────────────────────────────
        is_correct = (
            data['selected_answer'].strip().lower()
            == question.correct_answer.strip().lower()
        )

        # ── Resolve user (guest fallback for unauthenticated) ──────────────────
        from django.contrib.auth.models import User
        if request.user and request.user.is_authenticated:
            user = request.user
        else:
            user, _ = User.objects.get_or_create(
                username='guest',
                defaults={'email': 'guest@aistudycoach.local'},
            )

        # ── Handle Session ─────────────────────────────────────────────────────
        session = None
        session_id = data.get('session_id')
        if session_id:
            try:
                session = QuizSession.objects.get(pk=session_id)
            except QuizSession.DoesNotExist:
                pass  # Ignore invalid session IDs (or could error out)

        # ── Build the attempt ──────────────────────────────────────────────────
        attempt = Attempt(
            user=user,
            session=session,
            question=question,
            selected_answer=data['selected_answer'],
            is_correct=is_correct,
            time_taken=data['time_taken'],
            bookmarked=data.get('bookmarked', False),
            notes_text=data.get('notes_text', '') or '',
        )

        # Handle optional audio file upload
        audio_file = request.FILES.get('notes_audio')
        if audio_file:
            attempt.notes_audio = audio_file

        attempt.save()

        logger.info(
            "Attempt saved | user=%s | session=%s | question=%s | correct=%s",
            user.username, session.id if session else None, question.id, is_correct
        )

        # Build audio URL if exists
        notes_audio_url = None
        if attempt.notes_audio:
            notes_audio_url = request.build_absolute_uri(attempt.notes_audio.url)

        return Response({
            'attempt_id': attempt.id,
            'is_correct': is_correct,
            'correct_answer': question.correct_answer,
            'solution_image': question.solution_image,
            'message': 'Correct! Well done.' if is_correct else 'Incorrect. Review the solution.',
            'notes_audio_url': notes_audio_url,
        }, status=status.HTTP_201_CREATED)



# ─── GET /api/analysis/ ───────────────────────────────────────────────────────

class AnalysisView(APIView):
    """
    Returns full learning analytics for the current (or guest) user.
    Also updates the user's UserProfile with fresh computed values.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        from django.contrib.auth.models import User
        if request.user and request.user.is_authenticated:
            user = request.user
        else:
            user, _ = User.objects.get_or_create(
                username='guest',
                defaults={'email': 'guest@aistudycoach.local'},
            )

        analysis_data = compute_analysis(user)

        # Validate the output shape with a serializer (good practice)
        serializer = AnalysisResponseSerializer(data=analysis_data)
        if serializer.is_valid():
            return Response(serializer.validated_data, status=status.HTTP_200_OK)

        # Should never happen, but log if it does
        logger.error("Analysis serializer error: %s", serializer.errors)
        return Response(analysis_data, status=status.HTTP_200_OK)


# ─── POST /api/topics/<id>/evaluate/ ──────────────────────────────────────────

class TopicEvaluateView(APIView):
    """
    Evaluates the topic mastery score of the current user using OpenRouter API.
    Updates the Topic model with the mastery score, status, and AI feedback.
    """

    permission_classes = [AllowAny]

    def post(self, request, topic_id):
        from django.contrib.auth.models import User
        if request.user and request.user.is_authenticated:
            user = request.user
        else:
            user, _ = User.objects.get_or_create(
                username='guest',
                defaults={'email': 'guest@aistudycoach.local'},
            )

        topic = get_object_or_404(Topic, pk=topic_id)

        result = evaluate_topic_mastery(user, topic)
        if not result:
            return Response(
                {'error': 'Not enough data to evaluate topic mastery or LLM processing failed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(result, status=status.HTTP_200_OK)


# ─── GET /api/bookmarks/ ─────────────────────────────────────────────────────

class BookmarkListView(APIView):
    """
    Returns all questions that the user has bookmarked (bookmarked=True).
    Includes the full question details and associated notes.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        bookmarked = get_bookmarked_attempts(request.user)

        if not bookmarked.exists():
            return Response(
                {'message': 'No bookmarked questions yet.', 'bookmarks': []},
                status=status.HTTP_200_OK,
            )

        serializer = AttemptSerializer(
            bookmarked, many=True, context={'request': request}
        )
        return Response({
            'count': bookmarked.count(),
            'bookmarks': serializer.data,
        })


# ─── GET /api/profile/ ───────────────────────────────────────────────────────

class UserProfileView(APIView):
    """
    Returns the learning profile for the authenticated user.
    Profile is updated every time /api/analysis/ is called.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        # get_or_create ensures profile always exists
        profile, created = request.user.profile.__class__.objects.get_or_create(
            user=request.user
        )
        # Re-fetch after possible creation
        from .models import UserProfile
        profile = UserProfile.objects.get(user=request.user)

        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)


# ─── POST /api/upload-pdf/ ───────────────────────────────────────────────────

import tempfile
import os
from .ingestion_service import process_pdf_and_save


class UploadPDFView(APIView):
    """
    Accepts a PDF file upload via multipart/form-data, processes it through
    the Gemini-powered ingestion pipeline, and saves generated questions to DB.

    Request fields:
        pdf_file  → the uploaded PDF (required)
        topic     → topic label for generated questions (optional, default: "General")
    """

    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        pdf_file = request.FILES.get('pdf_file')
        topic = request.data.get('topic', 'General')

        if not pdf_file:
            return Response(
                {'error': 'No PDF file provided. Send a file under the key "pdf_file".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Save uploaded file to a temporary location ────────────────────────
        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                for chunk in pdf_file.chunks():
                    tmp.write(chunk)
                temp_path = tmp.name

            # ── Run the Gemini ingestion pipeline ─────────────────────────────
            questions_saved = process_pdf_and_save(temp_path, topic=topic)

            return Response({
                'message': 'PDF processed successfully!',
                'topic': topic,
                'questions_added': questions_saved,
            }, status=status.HTTP_201_CREATED)

        except ValueError as ve:
            # Raised when pdfplumber extracts no text
            return Response(
                {'error': str(ve)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            logger.error("PDF upload processing failed: %s", exc)
            return Response(
                {'error': f'Processing failed: {exc}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        finally:
            # ── Always clean up the temp file ─────────────────────────────────
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)

# ─── UI View for Questions ──────────────────────────────────────────────────
from django.shortcuts import render
from django.db.models import Q, F, OuterRef, Subquery

def question_list(request):
    qs = Question.objects.select_related('topic', 'topic__chapter').prefetch_related('tags').all()
    user = request.user if request.user.is_authenticated else None
    user_id = request.GET.get('user_id')

    if not user and user_id:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            user = User.objects.get(pk=int(user_id))
        except Exception:
            user = None

    if user:
        latest_attempt = Attempt.objects.filter(
            user=user,
            question=OuterRef('pk')
        ).order_by('-created_at')

        qs = qs.annotate(
            last_correct=Subquery(latest_attempt.values('is_correct')[:1]),
            last_time=Subquery(latest_attempt.values('time_taken')[:1])
        )

    difficulty = request.GET.get('difficulty')
    tag = request.GET.get('tag')
    chapter = request.GET.get('chapter')
    topic = request.GET.get('topic')
    attempted = request.GET.get('attempted')
    slow = request.GET.get('slow')

    if difficulty:
        qs = qs.filter(difficulty=difficulty)
    if tag:
        qs = qs.filter(tags__id=tag)
    if chapter:
        qs = qs.filter(topic__chapter__id=chapter)
    if topic:
        qs = qs.filter(topic__id=topic)

    if user:
        if attempted == 'correct':
            qs = qs.filter(last_correct=True)
        elif attempted == 'wrong':
            qs = qs.filter(last_correct=False)

        if slow == '1':
            qs = qs.filter(last_time__gt=F('expected_time_seconds'))
    elif attempted in ('correct', 'wrong') or slow == '1':
        qs = qs.none()

    tags = Tag.objects.all()
    chapters = Chapter.objects.all()
    topics = Topic.objects.all()

    attempts_map = {}
    if user:
        visible_qs_ids = qs.values_list('id', flat=True)[:500]
        for a in Attempt.objects.filter(user=user, question_id__in=visible_qs_ids).order_by('-created_at'):
            attempts_map.setdefault(a.question_id, []).append({
                'correct': a.is_correct,
                'attempted_at': a.created_at,
                'time_taken_seconds': a.time_taken,
            })

    context = {
        'questions': qs.order_by('difficulty', '-created_at')[:500],
        'tags': tags,
        'chapters': chapters,
        'topics': topics,
        'attempts_map': attempts_map,
    }
    return render(request, 'questions/question_list.html', context)


def upload_pdf_ui(request):
    """
    Renders the UI form for uploading a PDF and converting it to quiz questions.
    """
    return render(request, 'questions/upload_pdf.html')
