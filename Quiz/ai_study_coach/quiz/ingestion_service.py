"""
quiz/ingestion_service.py

Reusable service layer for PDF ingestion + LLM question generation.
Extracted from the ingest_pdf management command so it can be called
from both CLI and API views.

LLM backend: OpenRouter (OpenAI-compatible API)
PDF parser:  pdfplumber
"""

import os
import re
import json
import textwrap
import logging
import time

from openai import OpenAI
import pdfplumber

from .models import Question

logger = logging.getLogger(__name__)


# ─── Configuration ────────────────────────────────────────────────────────────
# Change these via environment# Read models and keys dynamically inside the pipeline 
# to ensure it always picks up fresh .env changes.
QUESTIONS_PER_CHUNK = 5
CHUNK_SIZE = 15000


# ─── Prompt Template ─────────────────────────────────────────────────────────

PROMPT_TEMPLATE = textwrap.dedent("""\
You are an expert quiz maker. Given the following study material excerpt, \
generate exactly {count} high-quality multiple-choice questions.

RULES:
1. Each question must have exactly 4 options.
2. One option must be the correct answer.
3. Vary difficulty across easy, medium, and hard.
4. Questions must be directly based on the provided text.
5. Return ONLY a valid JSON array — no markdown, no code fences, no explanation.

JSON FORMAT (strict):
[
  {{
    "text": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option B",
    "topic": "{topic}",
    "difficulty": "easy"
  }}
]

STUDY MATERIAL:
---
{chunk}
---

Return ONLY the JSON array. Nothing else.
""")


# ─── PDF Text Extraction ─────────────────────────────────────────────────────

def extract_text(pdf_path: str) -> str:
    """
    Open a PDF with pdfplumber and concatenate every page's text.
    Returns a single string with pages separated by double newlines.
    """
    pages_text = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages_text.append(text)
    return '\n\n'.join(pages_text)


# ─── Text Chunking ───────────────────────────────────────────────────────────

def chunk_text(text: str, max_chars: int = CHUNK_SIZE) -> list[str]:
    """
    Split a long text into smaller chunks at paragraph boundaries (\\n\\n),
    each chunk staying under `max_chars` characters.
    """
    paragraphs = text.split('\n\n')
    chunks = []
    current_chunk = ''

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        # If adding this paragraph would exceed the limit, flush current chunk
        if len(current_chunk) + len(para) + 2 > max_chars and current_chunk:
            chunks.append(current_chunk.strip())
            current_chunk = para
        else:
            current_chunk = current_chunk + '\n\n' + para if current_chunk else para

    # Don't forget the last chunk
    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks


# ─── JSON Parsing (resilient to LLM formatting quirks) ───────────────────────

def parse_json_response(raw: str):
    """
    Attempt to parse a JSON array from raw LLM output.
    Handles:
      - markdown code fences (```json ... ```)
      - leading/trailing whitespace
      - JSON buried inside prose text
    Returns a list[dict] on success, or None on failure.
    """
    # Strip markdown code fences if present
    cleaned = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.MULTILINE)
    cleaned = re.sub(r'```\s*$', '', cleaned, flags=re.MULTILINE)
    cleaned = cleaned.strip()

    # Attempt 1: direct parse
    try:
        result = json.loads(cleaned)
        if isinstance(result, list):
            return result
    except json.JSONDecodeError:
        pass

    # Attempt 2: regex-extract the first [...] block
    match = re.search(r'\[.*\]', cleaned, re.DOTALL)
    if match:
        try:
            result = json.loads(match.group())
            if isinstance(result, list):
                return result
        except json.JSONDecodeError:
            pass

    return None


# ─── Question Validation ─────────────────────────────────────────────────────

def validate_question(q: dict) -> bool:
    """
    Ensure a question dict has the required shape:
      - text (non-empty string)
      - options (list of exactly 4 strings)
      - correct_answer (must be one of the options)
      - difficulty (easy/medium/hard — defaults to medium if invalid)
    """
    if not isinstance(q, dict):
        return False
    if not q.get('text') or not isinstance(q.get('text'), str):
        return False

    options = q.get('options', [])
    if not isinstance(options, list) or len(options) != 4:
        return False
    if not q.get('correct_answer') or q['correct_answer'] not in options:
        return False

    # Normalise difficulty
    if q.get('difficulty', 'medium') not in ('easy', 'medium', 'hard'):
        q['difficulty'] = 'medium'

    return True


# ─── Core Pipeline ───────────────────────────────────────────────────────────

def process_pdf_and_save(
    pdf_path: str,
    topic: str = "General",
    per_chunk: int = QUESTIONS_PER_CHUNK,
) -> int:
    """
    End-to-end pipeline:
      1. Extract text from PDF
      2. Chunk the text
      3. For each chunk, call OpenRouter LLM to generate questions
      4. Parse, validate, and save to the Question table

    Returns the total number of questions saved to the database.
    Raises ValueError if the PDF yields no text.
    """

    # ── Step 1: Extract ───────────────────────────────────────────────────────
    full_text = extract_text(pdf_path)
    if not full_text.strip():
        raise ValueError("Could not extract any text from the provided PDF.")

    print(f"\n[PIPELINE] Extracted {len(full_text)} characters from PDF")
    logger.info("Extracted %d characters from %s", len(full_text), pdf_path)

    # ── Step 2: Chunk ─────────────────────────────────────────────────────────
    chunks = chunk_text(full_text)
    print(f"[PIPELINE] Split into {len(chunks)} chunk(s) of ~{CHUNK_SIZE} chars")
    logger.info("Split into %d chunk(s) of ~%d chars", len(chunks), CHUNK_SIZE)

    # ── Step 3 + 4: Generate → Parse → Save ──────────────────────────────────
    total_saved = 0

    # Dynamically load the .env file and key 
    from dotenv import load_dotenv
    from django.conf import settings
    load_dotenv(settings.BASE_DIR / '.env')

    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY is not set. Cannot call OpenRouter API.")

    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )
    model_name = os.environ.get("OPENROUTER_MODEL", "google/gemini-2.0-flash-001")

    for i, chunk in enumerate(chunks, 1):
        prompt = PROMPT_TEMPLATE.format(
            count=per_chunk, topic=topic, chunk=chunk
        )

        try:
            # Small delay between chunks to be polite to the API
            if i > 1:
                time.sleep(1.0)

            print(f"\n{'='*60}")
            print(f"[CHUNK {i}/{len(chunks)}] Sending {len(chunk)} chars to OpenRouter ({model_name})...")

            # Force immediate flush to ensure it prints to your terminal instantly
            import sys
            sys.stdout.flush()

            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "user", "content": prompt}
                ],
            )
            raw_text = response.choices[0].message.content

            # ── Debug: show what the LLM returned ────────────────────────
            print(f"[CHUNK {i}] ✅ LLM responded ({len(raw_text)} chars)")
            print(f"[CHUNK {i}] Raw response (first 500 chars):")
            print("-" * 40)
            print(raw_text[:500])
            print("-" * 40)

            questions = parse_json_response(raw_text)

            if not questions:
                print(f"[CHUNK {i}] ❌ JSON PARSE FAILED — could not extract a valid JSON array from the response above.")
                logger.warning("Chunk %d/%d: LLM returned no valid questions.", i, len(chunks))
                continue

            print(f"[CHUNK {i}] ✅ Parsed {len(questions)} question(s) from JSON")

            chunk_saved = 0
            for q_idx, q in enumerate(questions, 1):
                if not validate_question(q):
                    print(f"[CHUNK {i}] ❌ Question {q_idx} FAILED validation: {q}")
                    logger.warning(
                        "Chunk %d: skipping malformed question: %s",
                        i, q.get('text', '?')[:50]
                    )
                    continue

                Question.objects.create(
                    text=q['text'],
                    options=q['options'],
                    correct_answer=q['correct_answer'],
                    topic=topic,  # Force it to the requested topic so fetching works properly
                    difficulty=q.get('difficulty', 'medium'),
                )
                chunk_saved += 1
                total_saved += 1

            print(f"[CHUNK {i}] ✅ Saved {chunk_saved} question(s) to DB (total so far: {total_saved})")

        except Exception as exc:
            print(f"\n[!] ❌ ERROR PROCESSING CHUNK {i}/{len(chunks)}:")
            print(f"    Exception type: {type(exc).__name__}")
            print(f"    Exception message: {exc}")
            import traceback
            traceback.print_exc()
            logger.error("Chunk %d/%d failed: %s", i, len(chunks), exc)
            continue

    print(f"\n{'='*60}")
    print(f"[PIPELINE] ✅ DONE — {total_saved} questions saved to DB.")
    logger.info("Ingestion complete: %d questions saved to DB.", total_saved)
    return total_saved
