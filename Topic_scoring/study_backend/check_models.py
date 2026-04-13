import os
import google.generativeai as genai
from django.conf import settings
from dotenv import load_dotenv
import sys

# Try to find the .env file
env_path = 'c:/Users/modig/Downloads/Mainfolder/AI-Study-Buddy/Topic_scoring/study_backend/.env'
load_dotenv(env_path)

api_key = os.getenv("GEMINI_API_KEY")
print(f"Using API Key: {api_key[:10]}...")

genai.configure(api_key=api_key)

try:
    print("Attempting to list models...")
    models = list(genai.list_models())
    if not models:
        print("No models found or returned.")
    for m in models:
        print(f"ID: {m.name}, Display: {m.display_name}")
except Exception as e:
    print(f"FATAL ERROR: {e}")
    import traceback
    traceback.print_exc()
