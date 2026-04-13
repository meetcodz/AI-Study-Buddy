"""
quiz/services.py

Analysis Engine — pure Python business logic, no HTTP concerns.
Keeps views thin and logic testable in isolation.
"""

from collections import defaultdict
from django.db.models import QuerySet
from .models import Attempt, UserProfile


# ─── Constants ────────────────────────────────────────────────────────────────

WEAK_TOPIC_THRESHOLD = 50.0    # accuracy % below this → weak
STRONG_TOPIC_THRESHOLD = 75.0  # accuracy % above this → strong


# ─── Core Analysis Function ───────────────────────────────────────────────────

def compute_analysis(user) -> dict:
    """
    Computes full learning analytics for a given user.

    Returns a dict with:
        - total_attempted
        - total_correct
        - overall_accuracy  (0–100, rounded to 2 dp)
        - avg_time_per_question  (seconds, rounded to 2 dp)
        - topic_performance  (list of per-topic dicts)
        - weak_topics        (list of topic names)
        - strong_topics      (list of topic names)

    Also updates the user's UserProfile in-place.

    Edge cases handled:
        - User has zero attempts  → returns zeros, empty lists
        - Topic has no correct    → accuracy is 0.0
    """

    attempts: QuerySet = (
        Attempt.objects
        .filter(user=user)
        .select_related('question')
    )

    # ── Guard: no attempts yet ─────────────────────────────────────────────────
    if not attempts.exists():
        return _empty_analysis()

    # ── Aggregate global stats ─────────────────────────────────────────────────
    total_attempted = attempts.count()
    total_correct = attempts.filter(is_correct=True).count()
    total_time = sum(a.time_taken for a in attempts)

    overall_accuracy = round((total_correct / total_attempted) * 100, 2)
    avg_time = round(total_time / total_attempted, 2)

    # ── Aggregate per-topic stats ──────────────────────────────────────────────
    # Using defaultdict to bucket attempts by topic
    topic_buckets: dict[str, dict] = defaultdict(lambda: {
        'total': 0, 'correct': 0, 'time_sum': 0
    })

    for attempt in attempts:
        topic = attempt.question.topic
        topic_buckets[topic]['total'] += 1
        topic_buckets[topic]['time_sum'] += attempt.time_taken
        if attempt.is_correct:
            topic_buckets[topic]['correct'] += 1

    topic_performance = []
    weak_topics = []
    strong_topics = []

    for topic, stats in topic_buckets.items():
        t_total = stats['total']
        t_correct = stats['correct']
        t_accuracy = round((t_correct / t_total) * 100, 2)
        t_avg_time = round(stats['time_sum'] / t_total, 2)

        # Get recent attempts for this topic
        topic_attempts = attempts.filter(question__topic=topic).order_by('-created_at')[:5]
        attempts_data = []
        for at in topic_attempts:
            attempts_data.append({
                'question_text': at.question.text,
                'selected_answer': at.selected_answer,
                'correct_answer': at.question.correct_answer,
                'is_correct': at.is_correct,
                'time_taken': at.time_taken,
                'created_at': at.created_at.isoformat(),
            })

        topic_performance.append({
            'topic': topic.name,
            'chapter_name': topic.chapter.name if topic.chapter else "General",
            'total': t_total,
            'correct': t_correct,
            'accuracy': t_accuracy,
            'avg_time': t_avg_time,
            'mastery_score': topic.mastery_score,
            'status': topic.status,
            'ai_feedback': topic.ai_feedback or "No AI evaluation yet.",
            'recommended_subtopics': topic.recommended_subtopics,
            'attempts': attempts_data,
        })

        # Classify topic strength
        if t_accuracy < WEAK_TOPIC_THRESHOLD:
            weak_topics.append(topic.name)
        elif t_accuracy > STRONG_TOPIC_THRESHOLD:
            strong_topics.append(topic.name)

    # ── Aggregate per-session stats (Quiz-as-a-Topic) ───────────────────────────
    from .models import QuizSession
    sessions = QuizSession.objects.filter(user=user, completed_at__isnull=False).order_by('-completed_at')[:10]
    session_performance = []
    
    for s in sessions:
        s_attempts = s.attempts.all()
        s_total = s_attempts.count()
        s_correct = s_attempts.filter(is_correct=True).count()
        s_accuracy = round((s_correct / s_total) * 100, 2) if s_total > 0 else 0
        
        session_performance.append({
            'id': s.id,
            'topic_name': s.topic_name or f"Quiz {s.id}",
            'quiz_length': s.quiz_length,
            'started_at': s.started_at.isoformat(),
            'completed_at': s.completed_at.isoformat(),
            'mastery_score': s.mastery_score,
            'status': s.status,
            'ai_feedback': s.ai_feedback or "No session AI feedback yet.",
            'recommended_subtopics': s.recommended_subtopics,
            'accuracy': s.accuracy if hasattr(s, 'accuracy') else s_accuracy,
            'total_correct': s_correct
        })

    # Sort topic list by accuracy ascending (weakest first)
    topic_performance.sort(key=lambda x: x['accuracy'])

    # ── Persist to UserProfile ─────────────────────────────────────────────────
    _update_user_profile(user, overall_accuracy, avg_time, weak_topics, strong_topics)

    return {
        'total_attempted': total_attempted,
        'total_correct': total_correct,
        'overall_accuracy': overall_accuracy,
        'avg_time_per_question': avg_time,
        'topic_performance': topic_performance,
        'session_performance': session_performance,
        'weak_topics': weak_topics,
        'strong_topics': strong_topics,
    }



# ─── Profile Update Helper ────────────────────────────────────────────────────

def _update_user_profile(user, accuracy, avg_time, weak_topics, strong_topics):
    """
    Creates or updates the UserProfile with fresh analytics data.
    Uses get_or_create so this is safe even if the profile doesn't exist yet.
    """
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.accuracy = accuracy
    profile.avg_time = avg_time
    profile.weak_topics = weak_topics
    profile.strong_topics = strong_topics
    profile.save(update_fields=['accuracy', 'avg_time', 'weak_topics', 'strong_topics', 'updated_at'])


# ─── Empty Result Helper ──────────────────────────────────────────────────────

def _empty_analysis() -> dict:
    """Returns a safe zero-state dict when the user has no attempts."""
    return {
        'total_attempted': 0,
        'total_correct': 0,
        'overall_accuracy': 0.0,
        'avg_time_per_question': 0.0,
        'topic_performance': [],
        'weak_topics': [],
        'strong_topics': [],
    }


# ─── Bookmark Helper ──────────────────────────────────────────────────────────

def get_bookmarked_attempts(user) -> QuerySet:
    """
    Returns all bookmarked Attempt objects for a user,
    with the related Question pre-fetched.
    """
    return (
        Attempt.objects
        .filter(user=user, bookmarked=True)
        .select_related('question')
        .order_by('-created_at')
    )
