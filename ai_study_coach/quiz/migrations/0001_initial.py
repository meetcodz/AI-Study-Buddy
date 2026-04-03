"""
Generated migration for quiz app - initial schema.
Run: python manage.py migrate
"""

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.core.validators


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ── Question ──────────────────────────────────────────────────────────
        migrations.CreateModel(
            name='Question',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.TextField(help_text='The question text shown to the user.')),
                ('options', models.JSONField(help_text="List of answer options as a JSON array, e.g. ['A', 'B', 'C', 'D']")),
                ('correct_answer', models.CharField(help_text='The correct answer string. Must match one of the options.', max_length=255)),
                ('topic', models.CharField(db_index=True, help_text="Topic/subject of the question, e.g. 'Mathematics', 'History'.", max_length=100)),
                ('difficulty', models.CharField(
                    choices=[('easy', 'Easy'), ('medium', 'Medium'), ('hard', 'Hard')],
                    db_index=True,
                    default='medium',
                    max_length=10,
                )),
                ('solution_image', models.URLField(blank=True, null=True, help_text='Optional URL to an image showing the detailed solution.')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Question',
                'verbose_name_plural': 'Questions',
                'ordering': ['topic', 'difficulty'],
            },
        ),

        # ── UserProfile ───────────────────────────────────────────────────────
        migrations.CreateModel(
            name='UserProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='profile',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('accuracy', models.FloatField(
                    default=0.0,
                    help_text='Overall accuracy as a percentage (0–100).',
                    validators=[
                        django.core.validators.MinValueValidator(0.0),
                        django.core.validators.MaxValueValidator(100.0),
                    ],
                )),
                ('avg_time', models.FloatField(default=0.0, help_text='Average time taken per question in seconds.')),
                ('weak_topics', models.JSONField(blank=True, default=list, help_text='Topics where accuracy < 50%.')),
                ('strong_topics', models.JSONField(blank=True, default=list, help_text='Topics where accuracy > 75%.')),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'User Profile',
                'verbose_name_plural': 'User Profiles',
            },
        ),

        # ── Attempt ───────────────────────────────────────────────────────────
        migrations.CreateModel(
            name='Attempt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='attempts',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('question', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='attempts',
                    to='quiz.question',
                )),
                ('selected_answer', models.CharField(help_text='The answer the user chose.', max_length=255)),
                ('is_correct', models.BooleanField(default=False, help_text='Set automatically by comparing answers.')),
                ('time_taken', models.PositiveIntegerField(help_text='Time taken to answer, in seconds.')),
                ('bookmarked', models.BooleanField(default=False, help_text='True if the user bookmarked this question.')),
                ('notes_text', models.TextField(blank=True, null=True, help_text='Optional text note.')),
                ('notes_audio', models.FileField(
                    blank=True,
                    null=True,
                    upload_to='audio_notes/%Y/%m/%d/',
                    help_text='Optional audio note file upload.',
                )),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
            ],
            options={
                'verbose_name': 'Attempt',
                'verbose_name_plural': 'Attempts',
                'ordering': ['-created_at'],
            },
        ),

        # ── Indexes ───────────────────────────────────────────────────────────
        migrations.AddIndex(
            model_name='attempt',
            index=models.Index(fields=['user', 'question'], name='quiz_attemp_user_id_idx'),
        ),
    ]
