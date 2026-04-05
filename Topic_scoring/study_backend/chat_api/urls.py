from django.urls import path
from .views import api_chat, show_chat

urlpatterns = [
    path('api/chat/', api_chat, name='api_chat'),
    path('chatbot/', show_chat, name='show_chat'),
]
