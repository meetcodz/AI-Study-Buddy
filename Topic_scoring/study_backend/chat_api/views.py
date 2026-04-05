import json
import os
from openai import OpenAI
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from dotenv import load_dotenv
from django.shortcuts import render

# Reload .env every time module loads
load_dotenv(settings.BASE_DIR / '.env', override=True)

@csrf_exempt
def show_chat(request):
    """ Serves the frontend chat.html file as a Django template """
    return render(request, 'chat_api/chat.html')

@csrf_exempt
def api_chat(request):
    """
    POST /api/chat/
    Uses OpenRouter (same key as PDF ingestion) to power the chatbot.
    Accepts: { "history": [{"role": "user", "parts": [{"text": "..."}]}, ...] }
    Returns: { "reply": "..." }
    """
    if request.method != 'POST':
        return JsonResponse({"reply": "Only POST allowed"}, status=405)

    try:
        data = json.loads(request.body)
        history = data.get('history', [])

        if not history:
            return JsonResponse({"reply": "No message provided."}, status=400)

        api_key = os.getenv("OPENROUTER_API_KEY")
        model   = os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash")

        if not api_key:
            return JsonResponse({"reply": "Server error: OPENROUTER_API_KEY not set in .env"}, status=500)

        # Convert Gemini-format history → OpenAI-format messages
        messages = [
            {
                "role": "system",
                "content": (
                    "You are StudyCoach AI, a helpful and encouraging academic assistant. "
                    "For simple greetings be brief (1-2 sentences). "
                    "For complex academic topics give clear, structured explanations. "
                    "Always be concise — maximum 300 words."
                )
            }
        ]

        for turn in history:
            role = "user" if turn.get("role") == "user" else "assistant"
            text = turn.get("parts", [{}])[0].get("text", "")
            messages.append({"role": role, "content": text})

        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )

        response = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=400,
        )

        reply = response.choices[0].message.content
        return JsonResponse({"reply": reply})

    except Exception as e:
        return JsonResponse({"reply": f"AI error: {str(e)}"}, status=500)
