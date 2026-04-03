"""
quiz/apps.py

App configuration — connects signals on app ready.
"""

from django.apps import AppConfig


class QuizConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'quiz'
    verbose_name = 'Quiz Engine'

    def ready(self):
        # Import signals so they are connected when Django starts
        import quiz.signals  # noqa: F401
