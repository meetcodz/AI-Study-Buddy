from django.urls import path
from . import views

urlpatterns = [
    # Endpoint to receive a new question and route it to tags/topics
    path('api/questions/ingest/', views.api_ingest_question, name='api_ingest_question'),
    
    # Endpoint to receive attempt data from your other computer
    path('api/quiz/submit/', views.api_submit_quiz, name='api_submit_quiz'),
    
    # GET Endpoints for the UI Demo
    path('api/topics/', views.api_get_topics, name='api_get_topics'),
    path('api/questions/random/', views.api_get_random_question, name='api_get_random_question'),
]
