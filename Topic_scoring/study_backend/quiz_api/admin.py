from django.contrib import admin
from .models import Tag, Topic, Question, QuizAttempt

class QuestionInline(admin.TabularInline):
    model = Question
    extra = 0
    fields = ('question_text', 'base_difficulty', 'correct_answer')

class TopicAdmin(admin.ModelAdmin):
    inlines = [QuestionInline]
    list_display = ('name', 'mastery_score', 'status')

admin.site.register(Tag)
admin.site.register(Topic, TopicAdmin)
admin.site.register(Question)
admin.site.register(QuizAttempt)
