"""
Management command to reset all quiz attempt data.
Usage: python manage.py reset_stats
"""

from django.core.management.base import BaseCommand
from quiz_core.models import Attempt, UserProfile


class Command(BaseCommand):
    help = 'Deletes all Attempt records and resets UserProfiles (fresh start).'

    def handle(self, *args, **options):
        attempt_count = Attempt.objects.count()
        Attempt.objects.all().delete()

        profile_count = UserProfile.objects.update(
            accuracy=0.0,
            avg_time=0.0,
            weak_topics=[],
            strong_topics=[],
        )

        self.stdout.write(self.style.SUCCESS(
            f'✅ Reset complete: {attempt_count} attempts deleted, {profile_count} profiles reset.'
        ))
