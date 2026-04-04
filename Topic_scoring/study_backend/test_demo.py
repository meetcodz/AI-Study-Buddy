import urllib.request
import json
import time

BASE_URL = "http://localhost:8000/api"

DEMO_QUESTIONS = [
    {
        "question_text": "What is the capital of France?",
        "options": ["London", "Berlin", "Paris", "Madrid"],
        "correct_answer": "Paris",
        "base_difficulty": "Easy",
        "tags": ["geography", "europe", "capitals"]
    },
    {
        "question_text": "What is 15 * 4?",
        "options": ["45", "60", "75", "90"],
        "correct_answer": "60",
        "base_difficulty": "Easy",
        "tags": ["math", "multiplication"]
    },
    {
        "question_text": "Who wrote 'Hamlet'?",
        "options": ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"],
        "correct_answer": "William Shakespeare",
        "base_difficulty": "Medium",
        "tags": ["literature", "authors"]
    }
]

def make_post_request(endpoint, data):
    url = f"{BASE_URL}/{endpoint}"
    req = urllib.request.Request(url, method="POST")
    req.add_header('Content-Type', 'application/json')
    data_bytes = json.dumps(data).encode('utf-8')
    try:
        with urllib.request.urlopen(req, data=data_bytes) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Failed to connect. Is the Django server running at {BASE_URL}? Error: {e}")
        return None

print("--- 1. FEEDING DEMO QUESTIONS INTO DATABASE ---")
question_ids = []
for q in DEMO_QUESTIONS:
    print(f"Ingesting: {q['question_text']}")
    response = make_post_request("questions/ingest/", q)
    if response:
        print(f"  -> Success! Assigned to auto-created Topic: {response['assigned_topic']}")
        question_ids.append(response.get('question_id'))
    time.sleep(0.5)

if not question_ids:
    print("\nSkipping quiz tests because the server is not reachable.")
    exit()

print("\n--- 2. SIMULATING STUDENT QUIZ ATTEMPTS ---")

# Let's pretend a student answers the first question correctly AND fast!
print("Simulating: Student answers 'Capital of France' correctly and fast.")
mock_attempt_1 = {
    "question_id": question_ids[0],
    "selected_option": "Paris",
    "time_spent_seconds": 4, # Fast
    "hints_used": 0
}
resp1 = make_post_request("quiz/submit/", mock_attempt_1)
if resp1:
    print(f"  -> Result: Correct. New Topic Score: {resp1['new_topic_score']} (Status: {resp1['new_topic_status']})")


# Let's pretend the student gets the second question wrong and uses hints.
print("\nSimulating: Student answers Math question wrong, after taking a long time and using hints.")
mock_attempt_2 = {
    "question_id": question_ids[1],
    "selected_option": "75", # Wrong
    "time_spent_seconds": 45, # Very slow
    "hints_used": 2 # Used hints!
}
resp2 = make_post_request("quiz/submit/", mock_attempt_2)
if resp2:
    print(f"  -> Result: Wrong. New Topic Score: {resp2['new_topic_score']} (Status: {resp2['new_topic_status']})")

print("\nTest complete! You can open pgAdmin to verify the data is physically there.")
