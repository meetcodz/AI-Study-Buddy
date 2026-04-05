import os
import json
import logging
import textwrap
from openai import OpenAI
from django.conf import settings
from .models import Topic, Attempt
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

SCORING_PROMPT = textwrap.dedent("""\
You are an expert Study Coach AI. You need to evaluate the student's mastery of the topic "{topic_name}".
Below are the recent question attempts by the student in this topic:

{attempts_text}

Based on their performance, evaluate the student's topic mastery.
You must return a JSON response with exactly three fields:
1. "mastery_score": An integer from 0 to 100.
2. "status": One of ["Weak", "Average", "Strong"].
3. "ai_feedback": A short, constructive paragraph explaining why they received this score and what they should focus on.

IMPORTANT: Return ONLY valid JSON, do not include markdown or external text.
""")

def evaluate_topic_mastery(user, topic):
    """
    Evaluates a user's mastery of a specific topic using OpenRouter.
    Reads recent attempts, formats a prompt, parses the LLM JSON response, 
    and saves the mastery_score, status, and ai_feedback directly onto the Topic model.
    """
    load_dotenv(settings.BASE_DIR / '.env')
    
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        logger.error("OPENROUTER_API_KEY not set!")
        raise ValueError("OPENROUTER_API_KEY is not set.")
    
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )
    model_name = os.environ.get("OPENROUTER_MODEL", "google/gemini-2.0-flash-001")
    
    attempts = Attempt.objects.filter(user=user, question__topic=topic).select_related('question').order_by('-created_at')[:20]
    
    if not attempts.exists():
        return None
        
    attempts_text_list = []
    for at in attempts:
        q = at.question
        status_text = "Correct" if at.is_correct else f"Incorrect (Chose '{at.selected_answer}', Correct was '{q.correct_answer}')"
        attempts_text_list.append(f"Q: {q.text}\nDifficulty: {q.difficulty}\nResult: {status_text}\nTime taken: {at.time_taken}s")
        
    attempts_text = "\n\n".join(attempts_text_list)
    prompt = SCORING_PROMPT.format(topic_name=topic.name, attempts_text=attempts_text)
    
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_text = response.choices[0].message.content
        
        # Clean JSON
        import re
        cleaned = re.sub(r'^```(?:json)?\s*', '', raw_text, flags=re.MULTILINE)
        cleaned = re.sub(r'```\s*$', '', cleaned, flags=re.MULTILINE)
        cleaned = cleaned.strip()
        
        # Fallback to extract JSON block inside the text
        match = re.search(r'\{.*\}', cleaned, re.DOTALL)
        if match:
            cleaned = match.group()
            
        data = json.loads(cleaned)
        
        topic.mastery_score = int(data.get("mastery_score", 50))
        status_val = data.get("status", "Average")
        if status_val not in ["Weak", "Average", "Strong"]:
            status_val = "Average"
        topic.status = status_val
        topic.ai_feedback = data.get("ai_feedback", "")
        
        from django.utils import timezone
        topic.last_evaluated = timezone.now()
        topic.save()
        
        logger.info(f"Updated Topic '{topic.name}' mastery to {topic.mastery_score}")
        return {
            "topic_id": topic.id,
            "topic_name": topic.name,
            "mastery_score": topic.mastery_score,
            "status": topic.status,
            "ai_feedback": topic.ai_feedback
        }
        
    except Exception as e:
        logger.error(f"Error evaluating topic mastery: {e}")
        return None
