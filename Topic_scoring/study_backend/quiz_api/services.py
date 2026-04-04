import os
import json
import google.generativeai as genai
from django.db.models import Count
from django.conf import settings
from .models import Tag, Topic, Question, QuizAttempt

# Configure Gemini once at the module level
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def ingest_question(question_text, options, correct_answer, base_difficulty, tag_names):
    """
    Ingests a single question. Parses its tags to route it to an existing Topic,
    or creates a new Topic automatically if no suitable match is found.
    """
    # 1. Ensure all Tags exist in the DB
    tag_objects = []
    for t_name in tag_names:
        # Convert tags to lowercase for consistency
        tag_obj, created = Tag.objects.get_or_create(name=t_name.lower().strip())
        tag_objects.append(tag_obj)
        
    if not tag_objects:
        raise ValueError("A question must have at least one tag to be routed to a topic.")

    # 2. Find the best matching Topic based on tag overlap
    best_topic = Topic.objects.filter(tags__in=tag_objects) \
        .annotate(shared_tags_count=Count('tags')) \
        .order_by('-shared_tags_count') \
        .first()
        
    # 3. Create a new Topic if no match
    if not best_topic:
        primary_tag_name = tag_names[0].capitalize()
        new_topic_name = f"{primary_tag_name} Concepts"
        
        best_topic = Topic.objects.create(
            name=new_topic_name,
            mastery_score=50,
            status='Average'
        )
        best_topic.tags.set(tag_objects)

    # 4. Save the Question
    new_question = Question.objects.create(
        topic=best_topic,
        question_text=question_text,
        options=options,
        correct_answer=correct_answer,
        base_difficulty=base_difficulty
    )
    
    new_question.tags.set(tag_objects)
    
    for t_obj in tag_objects:
        best_topic.tags.add(t_obj)

    return new_question


def process_quiz_submission(question_id, selected_option, time_spent_seconds, hints_used):
    """
    Records a user's quiz attempt in the DB and triggers the AI evaluation.
    """
    try:
        question = Question.objects.get(id=question_id)
    except Question.DoesNotExist:
        return {"error": "Question not found"}

    is_correct = (selected_option == question.correct_answer)
    
    attempt = QuizAttempt.objects.create(
        question=question,
        is_correct=is_correct,
        time_spent_seconds=time_spent_seconds,
        hints_used=hints_used
    )
    
    # Trigger AI Scoring
    new_score, new_status = evaluate_topic_mastery_via_ai(attempt)
    
    # Update the Topic Mastery Status
    topic = question.topic
    topic.mastery_score = new_score
    topic.status = new_status
    topic.save()
    
    return {
        "success": True,
        "is_correct": is_correct,
        "new_topic_score": new_score,
        "new_topic_status": new_status
    }

def evaluate_topic_mastery_via_ai(latest_attempt):
    """
    Evaluates a student's topic mastery using Google Gemini AI, considering the 
    last 10 attempts to determine a cumulative "Topic-Level" score.
    """
    topic = latest_attempt.question.topic
    question = latest_attempt.question
    
    # 1. Fetch historical context (Last 10 attempts for this topic)
    recent_attempts = QuizAttempt.objects.filter(question__topic=topic).order_by('-created_at')[:10]
    history_summary = []
    for att in reversed(recent_attempts):
        history_summary.append({
            "correct": att.is_correct,
            "time": att.time_spent_seconds,
            "hints": att.hints_used,
            "difficulty": att.question.base_difficulty
        })

    # 2. Update last_evaluated timestamp
    from django.utils import timezone
    topic.last_evaluated = timezone.now()
    topic.save()

    # 3. Attempt Real AI Evaluation if API Key is available
    if GEMINI_API_KEY:
        try:
            model = genai.GenerativeModel("gemini-2.5-flash")
            
            prompt = f"""
            Role: You are an expert AI Study Coach specializing in persistent Topic Mastery.
            Task: Calculate a new cumulative Mastery Score for the topic: '{topic.name}'.
            
            Current Topic Context:
            - Current Stored Mastery Score: {topic.mastery_score}/100
            - Current Level: {topic.status}
            
            Historical Trend (Last 10 Attempts, chronologically):
            {json.dumps(history_summary, indent=2)}
            
            Latest Attempt (Just finished):
            - Question Text: {question.question_text}
            - Difficulty: {question.base_difficulty}
            - Result: {'Correct' if latest_attempt.is_correct else 'Incorrect'}
            - Time Spent: {latest_attempt.time_spent_seconds} seconds
            - Hints Used: {latest_attempt.hints_used}
            
            Scoring Guidelines:
            - Look at the trend! If the student is consistently improving, reward growth.
            - A single mistake after a long streak of correct answers should NOT drop the score drastically.
            - Persistent high speed and accuracy on 'Hard' questions should push the score toward 100.
            - Heavy hint usage and slow answers on 'Easy' questions should lower the score.
            
            Return ONLY a valid JSON object:
            {{
              "score": number (0-100),
              "status": "Weak" | "Average" | "Strong",
              "reason": "Explain how this newest attempt shifted their overall topic mastery"
            }}
            """
            
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            
            ai_data = json.loads(response.text)
            print(f"[TOPIC SCORE] {topic.name}: {ai_data['score']} ({ai_data['status']}) - {ai_data['reason']}")
            
            return int(ai_data['score']), ai_data['status']
            
        except Exception as e:
            print(f"[AI ERROR] Gemini API failed: {e}. Falling back to heuristic.")
    
    # 4. HEURISTIC FALLBACK (Simple trend logic)
    score = topic.mastery_score
    if latest_attempt.is_correct:
        score += 10
    else:
        score -= 15
    
    score = max(0, min(100, score))
    status = 'Weak' if score <= 40 else ('Strong' if score >= 76 else 'Average')
    
    return score, status
