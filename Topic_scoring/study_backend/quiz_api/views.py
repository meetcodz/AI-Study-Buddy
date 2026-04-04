import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .services import ingest_question, process_quiz_submission
from .models import Topic, Question
import random

@csrf_exempt
def api_ingest_question(request):
    """
    POST endpoint to receive a new question from a dataset and route it to a topic.
    Expected JSON payload:
    {
        "question_text": "What is 2+2?",
        "options": ["2", "3", "4", "5"],
        "correct_answer": "4",
        "base_difficulty": "Easy",
        "tags": ["math", "algebra"]
    }
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            # Call the service logic
            new_question = ingest_question(
                question_text=data['question_text'],
                options=data['options'],
                correct_answer=data['correct_answer'],
                base_difficulty=data['base_difficulty'],
                tag_names=data['tags']
            )
            return JsonResponse({
                "message": "Question ingested successfully",
                "question_id": new_question.id,
                "assigned_topic": new_question.topic.name
            }, status=201)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    
    return JsonResponse({"error": "Only POST allowed"}, status=405)


@csrf_exempt
def api_submit_quiz(request):
    """
    POST endpoint to receive quiz attempt data from your other computer's quiz UI.
    Expected JSON payload:
    {
        "question_id": 1,
        "selected_option": "4",
        "time_spent_seconds": 12,
        "hints_used": 0
    }
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            # Call the service logic that runs the AI scoring
            result = process_quiz_submission(
                question_id=data['question_id'],
                selected_option=data['selected_option'],
                time_spent_seconds=data['time_spent_seconds'],
                hints_used=data['hints_used']
            )
            
            if "error" in result:
                return JsonResponse(result, status=404)
                
            return JsonResponse(result, status=200)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Only POST allowed"}, status=405)

def api_get_topics(request):
    """ GET endpoint to retrieve all topics and their statuses, including nested questions """
    topics = Topic.objects.all()
    data = []
    for t in topics:
        topic_questions = t.questions.all()
        data.append({
            "id": t.id,
            "name": t.name,
            "masteryScore": t.mastery_score,
            "status": t.status,
            "tags": [tag.name for tag in t.tags.all()],
            "questions": [{
                "id": q.id,
                "text": q.question_text,
                "difficulty": q.base_difficulty,
                "correct_answer": q.correct_answer
            } for q in topic_questions]
        })
    return JsonResponse({"topics": data})

def api_get_random_question(request):
    """ GET endpoint to fetch a single random question """
    count = Question.objects.count()
    if count == 0:
        return JsonResponse({"error": "No questions available"}, status=404)
        
    random_idx = random.randint(0, count - 1)
    q = Question.objects.all()[random_idx]
    
    return JsonResponse({
        "question_id": q.id,
        "topic_id": q.topic.id,
        "text": q.question_text,
        "options": q.options,
        "correctAnswer": q.correct_answer,
        "baseDifficulty": q.base_difficulty,
        "tags": [tag.name for tag in q.tags.all()]
    })
