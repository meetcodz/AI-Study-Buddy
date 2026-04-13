import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv('Topic_scoring/study_backend/.env')
api_key = os.getenv("GEMINI_API_KEY")
model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

if not api_key:
    print("GEMINI_API_KEY not found in .env")
    exit(1)

print(f"Configuring Gemini with key: {api_key[:10]}...")
genai.configure(api_key=api_key)

try:
    model = genai.GenerativeModel(model_name)
    response = model.generate_content("Say hello in 5 words.")
    print(f"SUCCESS: {response.text}")
except Exception as e:
    print(f"FAILURE: {e}")
