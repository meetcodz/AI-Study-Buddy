"""
quiz/signals.py

Django signals for the quiz app.
Automatically creates a UserProfile whenever a new User is registered.
"""

from django.db.models.signals import post_save
from django.contrib.auth.models import User
from django.dispatch import receiver
from .models import UserProfile


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Create a blank UserProfile for every new User."""
    if created:
        UserProfile.objects.get_or_create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Ensure profile is saved when User is saved."""
    if hasattr(instance, 'profile'):
        instance.profile.save()
