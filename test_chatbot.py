import requests
import json

URL = "http://127.0.0.1:8000/api/chat/"
data = {
    "history": [
        {"role": "user", "parts": [{"text": "Hello, study assistant!"}]}
    ]
}

try:
    print(f"Testing {URL}...")
    response = requests.post(URL, json=data, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
