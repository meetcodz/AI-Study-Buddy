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

from .models import Question, Attempt, QuizSession
from .serializers import (
    QuestionSerializer,
    SubmitAnswerSerializer,
    AttemptSerializer,
    UserProfileSerializer,
    AnalysisResponseSerializer,
    QuizSessionStartSerializer,
)
from .services import compute_analysis, get_bookmarked_attempts

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
        ids_str = request.query_params.get('ids', None)

        # Start with all questions, apply optional filters
        qs = Question.objects.all()

        if ids_str:
            ids_list = [int(i.strip()) for i in ids_str.split(',') if i.strip().isdigit()]
            qs = qs.filter(id__in=ids_list)
        else:
            if topic:
                qs = qs.filter(topic__iexact=topic)

        if difficulty:
            if difficulty not in ('easy', 'medium', 'hard'):
                return Response(
                    {'error': "difficulty must be 'easy', 'medium', or 'hard'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            qs = qs.filter(difficulty=difficulty)

        # Edge case: DB is empty or filters yield nothing
        if not qs.exists():
            return Response(
                {'message': 'No questions found matching the given filters.', 'questions': []},
                status=status.HTTP_200_OK,
            )

        # Randomise and limit
        questions = qs.order_by('?')[:limit]

        serializer = QuestionSerializer(questions, many=True)
        return Response({
            'count': len(serializer.data),
            'questions': serializer.data,
        })

    @staticmethod
    def _parse_limit(raw_limit) -> int:
        """Parse and clamp the limit query parameter."""
        try:
            limit = int(raw_limit)
        except (TypeError, ValueError):
            limit = 10
        return max(1, min(limit, 50))  # clamp between 1 and 50


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
            quiz_length=serializer.validated_data['quiz_length']
        )

        return Response(
            {'session_id': session.id, 'quiz_length': session.quiz_length},
            status=status.HTTP_201_CREATED
        )


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
            saved_ids = process_pdf_and_save(temp_path, topic=topic)

            return Response({
                'message': 'PDF processed successfully!',
                'topic': topic,
                'questions_added': len(saved_ids),
                'question_ids': saved_ids,
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
