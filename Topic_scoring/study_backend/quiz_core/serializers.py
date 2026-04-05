"""
quiz/serializers.py

DRF serializers for all Quiz Engine models and API request/response shapes.
"""

from rest_framework import serializers
from .models import Question, UserProfile, Attempt


# ─── Question ─────────────────────────────────────────────────────────────────

class QuestionSerializer(serializers.ModelSerializer):
    """
    Serializer for GET /api/questions/.
    Deliberately EXCLUDES correct_answer so it is never sent to the client during quizzing.
    """
    topic_name = serializers.CharField(source='topic.name', read_only=True)

    class Meta:
        model = Question
        fields = [
            'id',
            'text',
            'options',
            'topic',
            'topic_name',
            'difficulty',
            'expected_time_seconds',
            'solution_image',
        ]
        # correct_answer intentionally omitted


class QuestionBankSerializer(serializers.ModelSerializer):
    """
    Full serializer for the question bank UI — includes correct_answer.
    Used by GET /api/questions/bank/
    """
    topic_name = serializers.CharField(source='topic.name', read_only=True)
    last_correct = serializers.SerializerMethodField()
    last_time = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            'id',
            'text',
            'options',
            'correct_answer',
            'topic',
            'topic_name',
            'difficulty',
            'expected_time_seconds',
            'solution_image',
            'last_correct',
            'last_time',
        ]

    def get_last_correct(self, obj):
        if hasattr(obj, 'latest_attempt') and obj.latest_attempt:
            return obj.latest_attempt[0].is_correct
        return None

    def get_last_time(self, obj):
        if hasattr(obj, 'latest_attempt') and obj.latest_attempt:
            return obj.latest_attempt[0].time_taken
        return None


class QuestionAdminSerializer(serializers.ModelSerializer):
    """
    Full serializer used internally (e.g. admin or answer checking).
    Includes correct_answer — never expose this to the public API.
    """

    class Meta:
        model = Question
        fields = '__all__'


# ─── Quiz Session ──────────────────────────────────────────────────────────────

class QuizSessionStartSerializer(serializers.Serializer):
    quiz_length = serializers.IntegerField(
        min_value=1,
        help_text="Expected number of questions for this session."
    )


# ─── Submit Answer ────────────────────────────────────────────────────────────

class SubmitAnswerSerializer(serializers.Serializer):
    """
    Validates the POST body for /api/submit/.
    Handles optional audio as either a file upload or a URL string.
    """

    question_id = serializers.IntegerField(
        help_text="Primary key of the Question being answered."
    )
    session_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="ID of the QuizSession this attempt belongs to."
    )
    selected_answer = serializers.CharField(
        max_length=255,
        help_text="The answer string the user chose."
    )
    time_taken = serializers.IntegerField(
        min_value=0,
        help_text="Seconds taken to answer (from frontend timer)."
    )
    bookmarked = serializers.BooleanField(
        default=False,
        help_text="Whether the user bookmarked this question."
    )
    notes_text = serializers.CharField(
        required=False,
        allow_blank=True,
        default='',
        help_text="Optional text note."
    )
    # Accept either a file upload OR a URL; both are optional
    notes_audio = serializers.FileField(
        required=False,
        allow_null=True,
        help_text="Optional audio file upload."
    )

    def validate_question_id(self, value):
        """Ensure the referenced question exists."""
        if not Question.objects.filter(pk=value).exists():
            raise serializers.ValidationError(
                f"Question with id={value} does not exist."
            )
        return value

    def validate_selected_answer(self, value):
        """Basic sanity: answer must not be empty."""
        if not value.strip():
            raise serializers.ValidationError("selected_answer cannot be blank.")
        return value.strip()


class SubmitAnswerResponseSerializer(serializers.Serializer):
    """Shape of the response returned by /api/submit/."""

    attempt_id = serializers.IntegerField()
    is_correct = serializers.BooleanField()
    correct_answer = serializers.CharField()
    solution_image = serializers.URLField(allow_null=True)
    message = serializers.CharField()
    notes_audio_url = serializers.URLField(
        required=False, 
        allow_null=True,
        help_text="URL to the saved audio file."
    )


# ─── Attempt ─────────────────────────────────────────────────────────────────

class AttemptSerializer(serializers.ModelSerializer):
    """Full attempt detail (used for bookmarks list, history, etc.)."""

    question = QuestionSerializer(read_only=True)
    notes_audio_url = serializers.SerializerMethodField(
        help_text="Absolute URL to the uploaded audio file, if any."
    )

    class Meta:
        model = Attempt
        fields = [
            'id',
            'question',
            'selected_answer',
            'is_correct',
            'time_taken',
            'bookmarked',
            'notes_text',
            'notes_audio_url',
            'created_at',
        ]

    def get_notes_audio_url(self, obj):
        """Return the full URL to the audio file if one exists."""
        if obj.notes_audio:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.notes_audio.url)
            return obj.notes_audio.url
        return None


# ─── User Profile ─────────────────────────────────────────────────────────────

class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'username',
            'email',
            'accuracy',
            'avg_time',
            'weak_topics',
            'strong_topics',
            'updated_at',
        ]


# ─── Analysis Response ────────────────────────────────────────────────────────

class TopicAttemptSerializer(serializers.Serializer):
    """Simple serializer for attempt history within a topic."""
    question_text = serializers.CharField()
    selected_answer = serializers.CharField()
    correct_answer = serializers.CharField()
    is_correct = serializers.BooleanField()
    time_taken = serializers.IntegerField()
    created_at = serializers.DateTimeField()


class TopicPerformanceSerializer(serializers.Serializer):
    """Per-topic breakdown returned by the analysis engine."""

    topic = serializers.CharField()
    chapter_name = serializers.CharField()
    total = serializers.IntegerField()
    correct = serializers.IntegerField()
    accuracy = serializers.FloatField()
    avg_time = serializers.FloatField()
    mastery_score = serializers.IntegerField()
    status = serializers.CharField()
    ai_feedback = serializers.CharField()
    attempts = TopicAttemptSerializer(many=True)


class AnalysisResponseSerializer(serializers.Serializer):
    """Shape of the full response from GET /api/analysis/."""

    total_attempted = serializers.IntegerField()
    total_correct = serializers.IntegerField()
    overall_accuracy = serializers.FloatField()
    avg_time_per_question = serializers.FloatField()
    topic_performance = TopicPerformanceSerializer(many=True)
    weak_topics = serializers.ListField(child=serializers.CharField())
    strong_topics = serializers.ListField(child=serializers.CharField())
