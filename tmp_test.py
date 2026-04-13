import os
from dotenv import load_dotenv
load_dotenv('Topic_scoring/study_backend/.env', override=True)
import google.generativeai as genai

api_key = os.getenv('GEMINI_API_KEY')
model_name = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-lite')

log = []
log.append(f"KEY: {api_key[:20] if api_key else 'None'}")
log.append(f"MODEL: {model_name}")

try:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)
    response = model.generate_content('Say hello in one sentence.')
    log.append(f"SUCCESS! REPLY: {response.text}")
except Exception as e:
    log.append(f"ERROR: {str(e)[:200]}")

with open('test_result.txt', 'w') as f:
    f.write('\n'.join(log))

print('\n'.join(log))
