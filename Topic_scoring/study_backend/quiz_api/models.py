from django.db import models
from django.utils import timezone

class Tag(models.Model):
    """
    Represents a classification tag (e.g., 'biology', 'equations').
    """
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

class Topic(models.Model):
    """
    Categorizes group of questions. Also holds the AI calculated Mastery Score.
    """
    STATUS_CHOICES = [
        ('Weak', 'Weak (Needs Practice)'),
        ('Average', 'Average'),
        ('Strong', 'Strong (Spaced Repetition)'),
    ]

    name = models.CharField(max_length=255)
    
    # We associate tags with a topic so we know what this topic is generally about
    tags = models.ManyToManyField(Tag, related_name='topics')
    
    mastery_score = models.IntegerField(default=50)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Average')
    last_evaluated = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.status} ({self.mastery_score})"

class Question(models.Model):
    """
    Stores individual quiz questions and links them to a single Topic.
    """
    DIFFICULTY_CHOICES = [
        ('Easy', 'Easy'),
        ('Medium', 'Medium'),
        ('Hard', 'Hard'),
    ]

    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='questions')
    
    # The actual tags this specific question has
    tags = models.ManyToManyField(Tag, related_name='questions')
    
    question_text = models.TextField()
    options = models.JSONField(help_text="Store a list of possible answers, e.g., ['A', 'B', 'C']")
    correct_answer = models.CharField(max_length=255)
    base_difficulty = models.CharField(max_length=50, choices=DIFFICULTY_CHOICES)

    def __str__(self):
        return self.question_text[:50]

class QuizAttempt(models.Model):
    """
    Stores raw metrics every time a user answers a question. 
    This provides the history needed for the AI algorithm.
    """
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='attempts')
    is_correct = models.BooleanField()
    time_spent_seconds = models.IntegerField(help_text="How long the user took to answer")
    hints_used = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Attempt on {self.question.id} (Correct: {self.is_correct})"
