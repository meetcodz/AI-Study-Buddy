"""
quiz/models.py

Core database models for the AI Quiz Engine.
Models: Question, UserProfile, Attempt
"""

from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator


# ─── Tag ──────────────────────────────────────────────────────────────────────

class Tag(models.Model):
    """
    Represents a classification tag (e.g., 'biology', 'equations').
    """
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


# ─── Chapter ──────────────────────────────────────────────────────────────────

class Chapter(models.Model):
    """
    Higher-level grouping of topics, required by UI.
    """
    name = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

# ─── Topic ────────────────────────────────────────────────────────────────────

class Topic(models.Model):
    """
    Categorizes group of questions and holds the AI calculated Mastery Score.
    """
    STATUS_CHOICES = [
        ('Weak', 'Weak (Needs Practice)'),
        ('Average', 'Average'),
        ('Strong', 'Strong (Spaced Repetition)'),
    ]

    name = models.CharField(max_length=255, unique=True)
    chapter = models.ForeignKey(Chapter, on_delete=models.SET_NULL, null=True, blank=True, related_name='topics')
    tags = models.ManyToManyField(Tag, related_name='topics', blank=True)
    
    mastery_score = models.IntegerField(
        default=50,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="AI calculated mastery score (0-100)"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='Average'
    )
    last_evaluated = models.DateTimeField(null=True, blank=True)
    recommended_subtopics = models.JSONField(
        default=list,
        blank=True,
        help_text="List of precise sub-topics generated dynamically by the AI for focused study."
    )
    ai_feedback = models.TextField(
        blank=True,
        null=True,
        help_text="AI's reasoning for the current mastery level."
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.status} ({self.mastery_score}%)"

    class Meta:
        verbose_name = 'Topic'
        verbose_name_plural = 'Topics'


# ─── Question ─────────────────────────────────────────────────────────────────

class Question(models.Model):
    """
    Represents a single quiz question with multiple-choice options.
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
    topic = models.ForeignKey(
        Topic, 
        on_delete=models.CASCADE, 
        related_name='questions',
        help_text="The topic this question belongs to."
    )
    tags = models.ManyToManyField(Tag, related_name='questions', blank=True)
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
    expected_time_seconds = models.PositiveIntegerField(default=60)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['topic', 'difficulty']
        verbose_name = 'Question'
        verbose_name_plural = 'Questions'

    def __str__(self):
        return f"[{self.topic.name}] {self.text[:60]}..."

    @property
    def chapter(self):
        return self.topic.chapter if getattr(self.topic, 'chapter', None) else None

    @property
    def choices(self):
        if not self.options: return []
        labels = ['A', 'B', 'C', 'D', 'E']
        return list(zip(labels[:len(self.options)], self.options))

    @property
    def correct_option_text(self):
        return self.correct_answer

    @property
    def ui_correct_letter(self):
        try:
            return chr(65 + self.options.index(self.correct_answer))
        except (ValueError, AttributeError):
            return "A"


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
    topic_name = models.CharField(max_length=255, blank=True, null=True, help_text="Custom name for this quiz session.")
    mastery_score = models.IntegerField(default=0)
    status = models.CharField(max_length=20, default='Average')
    ai_feedback = models.TextField(blank=True, null=True)
    recommended_subtopics = models.JSONField(default=list, blank=True)
    
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
    hints_used = models.PositiveIntegerField(
        default=0,
        help_text="Number of hints used during this attempt."
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
