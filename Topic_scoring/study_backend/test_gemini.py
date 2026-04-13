import os
import google.generativeai as genai
from dotenv import load_dotenv

# Try to find the .env file in the current directory
load_dotenv('.env')

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("API_KEY IS MISSING IN .ENV")
    exit(1)

genai.configure(api_key=api_key)

try:
    print(f"Key: {api_key[:10]}...")
    models = list(genai.list_models())
    names = [m.name for m in models]
    print("Available Gemini Models:")
    for n in names:
        print(n)
except Exception as e:
    print(f"Error listing models: {e}")
