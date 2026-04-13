import json
import os
import google.generativeai as genai
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
    Uses Google Gemini API directly to power the chatbot.
    Accepts: { "history": [{"role": "user", "parts": [{"text": "..."}]}, ...] }
    Returns: { "reply": "..." }
    """
    if request.method != 'POST':
        return JsonResponse({"reply": "Only POST allowed"}, status=405)

    try:
        # Always reload .env fresh to pick up any key changes without restart
        load_dotenv(settings.BASE_DIR / '.env', override=True)

        data = json.loads(request.body)
        raw_history = data.get('history', [])

        if not raw_history:
            return JsonResponse({"reply": "No message provided."}, status=400)

        api_key = os.getenv("GEMINI_API_KEY")
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        
        # Ensure model_name has models/ prefix if manually specified
        if model_name and not model_name.startswith("models/"):
            model_name = f"models/{model_name}"

        if not api_key:
            return JsonResponse({"reply": "Server error: GEMINI_API_KEY not set in .env"}, status=500)

        genai.configure(api_key=api_key)

        model = genai.GenerativeModel(
            model_name=model_name,
            system_instruction=(
                "You are StudyFlow AI, a premium academic assistant. "
                "Help students with concepts, exam prep, and schedules. "
                "Be encouraging but concise (max 300 words). "
                "Use clear formatting and structure in your replies."
            )
        )

        # Build Gemini-format history (all turns except the latest)
        # CRITICAL: Gemini requires strict role alternation: user, model, user, model...
        history = []
        last_role = None
        
        for turn in raw_history[:-1]:
            role = turn.get("role", "user")
            msg_parts = turn.get("parts", [{}])
            msg_text = msg_parts[0].get("text", "") if msg_parts else ""
            
            if msg_text:
                gemini_role = "model" if role in ("model", "assistant") else "user"
                
                # Prevent consecutive same roles (skips if same)
                if gemini_role != last_role:
                    history.append({"role": gemini_role, "parts": [{"text": msg_text}]})
                    last_role = gemini_role

        # The last message is the new user input
        last_msg_parts = raw_history[-1].get("parts", [{}])
        last_msg = last_msg_parts[0].get("text", "") if last_msg_parts else ""
        
        if not last_msg:
            return JsonResponse({"reply": "No valid message text found in last entry."}, status=400)

        chat = model.start_chat(history=history)
        response = chat.send_message(last_msg)

        return JsonResponse({"reply": response.text})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({"reply": f"AI error: {str(e)}"}, status=500)
