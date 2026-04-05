"""
quiz/admin.py

Admin panel configuration for the Quiz Engine.
All models are registered with useful list displays and filters.
"""

from django.contrib import admin
from .models import Question, UserProfile, Attempt, Topic, Tag


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('id', 'short_text', 'topic', 'difficulty', 'created_at')
    list_filter = ('difficulty', 'topic')
    search_fields = ('text', 'topic')
    ordering = ('topic', 'difficulty')

    def short_text(self, obj):
        """Display a truncated version of the question text in the list view."""
        return obj.text[:80] + '...' if len(obj.text) > 80 else obj.text
    short_text.short_description = 'Question'


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ('name', 'status', 'mastery_score', 'last_evaluated')
    list_filter = ('status',)
    search_fields = ('name',)
    readonly_fields = ('last_evaluated',)


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'accuracy', 'avg_time', 'updated_at')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('updated_at',)


@admin.register(Attempt)
class AttemptAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'user', 'question_topic', 'selected_answer',
        'is_correct', 'time_taken', 'bookmarked', 'created_at'
    )
    list_filter = ('is_correct', 'bookmarked', 'question__topic', 'question__difficulty')
    search_fields = ('user__username', 'question__text')
    readonly_fields = ('is_correct', 'created_at')
    date_hierarchy = 'created_at'

    def question_topic(self, obj):
        return obj.question.topic
    question_topic.short_description = 'Topic'
