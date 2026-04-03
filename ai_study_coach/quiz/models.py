"""
quiz/models.py

Core database models for the AI Quiz Engine.
Models: Question, UserProfile, Attempt
"""

from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator


# ─── Question ─────────────────────────────────────────────────────────────────

class Question(models.Model):
    """
    Represents a single quiz question with multiple-choice options.

    options field stores a JSON array of strings, e.g.:
        ["Paris", "London", "Berlin", "Madrid"]

    correct_answer stores one of those strings, e.g.: "Paris"
    """

    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    ]

    text = models.TextField(help_text="The question text shown to the user.")
    options = models.JSONField(
        help_text="List of answer options as a JSON array, e.g. ['A', 'B', 'C', 'D']"
    )
    correct_answer = models.CharField(
        max_length=255,
        help_text="The correct answer string. Must match one of the options."
    )
    topic = models.CharField(
        max_length=100,
        db_index=True,
        help_text="Topic/subject of the question, e.g. 'Mathematics', 'History'."
    )
    difficulty = models.CharField(
        max_length=10,
        choices=DIFFICULTY_CHOICES,
        default='medium',
        db_index=True,
    )
    solution_image = models.URLField(
        blank=True,
        null=True,
        help_text="Optional URL to an image showing the detailed solution."
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['topic', 'difficulty']
        verbose_name = 'Question'
        verbose_name_plural = 'Questions'

    def __str__(self):
        return f"[{self.topic}] {self.text[:60]}..."


# ─── User Profile ─────────────────────────────────────────────────────────────

class UserProfile(models.Model):
    """
    Extends the built-in User model with learning analytics data.
    Created automatically when a new User is registered (via signal).
    """

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    accuracy = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        help_text="Overall accuracy as a percentage (0–100)."
    )
    avg_time = models.FloatField(
        default=0.0,
        help_text="Average time taken per question in seconds."
    )
    weak_topics = models.JSONField(
        default=list,
        blank=True,
        help_text="Topics where accuracy < 50%. Computed by analysis engine."
    )
    strong_topics = models.JSONField(
        default=list,
        blank=True,
        help_text="Topics where accuracy > 75%. Computed by analysis engine."
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'

    def __str__(self):
        return f"Profile of {self.user.username}"


# ─── Quiz Session ──────────────────────────────────────────────────────────────

class QuizSession(models.Model):
    """
    Groups a series of Attempts together into a single quiz run.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sessions'
    )
    quiz_length = models.PositiveIntegerField(
        help_text="Expected number of questions for this session."
    )
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']
        verbose_name = 'Quiz Session'
        verbose_name_plural = 'Quiz Sessions'

    def __str__(self):
        return f"Session {self.id} | {self.user.username} | {self.quiz_length} Qs"


# ─── Attempt ──────────────────────────────────────────────────────────────────

class Attempt(models.Model):
    """
    Records a single question attempt by a user.
    Each submission from /api/submit/ creates one Attempt row.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='attempts'
    )
    session = models.ForeignKey(
        QuizSession,
        on_delete=models.CASCADE,
        related_name='attempts',
        null=True,
        blank=True,
        help_text="The session this attempt belongs to."
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='attempts'
    )
    selected_answer = models.CharField(
        max_length=255,
        help_text="The answer the user chose."
    )
    is_correct = models.BooleanField(
        default=False,
        help_text="Set automatically by comparing selected_answer to correct_answer."
    )
    time_taken = models.PositiveIntegerField(
        help_text="Time taken to answer, in seconds. Sent from the frontend timer."
    )
    bookmarked = models.BooleanField(
        default=False,
        help_text="True if the user marked this question for later review."
    )
    notes_text = models.TextField(
        blank=True,
        null=True,
        help_text="Optional text note added by the user for this question."
    )
    notes_audio = models.FileField(
        upload_to='audio_notes/%Y/%m/%d/',
        blank=True,
        null=True,
        help_text="Optional audio note file upload."
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Attempt'
        verbose_name_plural = 'Attempts'
        # Prevent duplicate attempts for the same question in the same session
        # (remove this constraint if you allow reattempts)
        indexes = [
            models.Index(fields=['user', 'question']),
        ]

    def __str__(self):
        status = '✓' if self.is_correct else '✗'
        return f"{self.user.username} | Q#{self.question_id} | {status}"
