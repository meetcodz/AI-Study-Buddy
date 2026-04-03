"""
Management command to ingest a PDF of study material and generate quiz questions
using pdfplumber (text extraction) + Google Gemini (LLM question generation).

Usage:
    python manage.py ingest_pdf path/to/study_material.pdf --topic "Physics" --per-chunk 10
    python manage.py ingest_pdf path/to/study_material.pdf --api-key "YOUR_KEY"

Environment:
    Set GEMINI_API_KEY environment variable, or pass --api-key flag.
"""

import os
import re
import json
import textwrap
import logging

import pdfplumber
import google.generativeai as genai

from django.core.management.base import BaseCommand, CommandError
from quiz.models import Question

logger = logging.getLogger(__name__)

# ─── Default LLM prompt template ─────────────────────────────────────────────

PROMPT_TEMPLATE = textwrap.dedent("""\
You are an expert quiz maker. Given the following study material excerpt, generate exactly {count} high-quality multiple-choice questions.

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


class Command(BaseCommand):
    help = 'Ingest a PDF file, extract text, generate quiz questions via Gemini, and save to database.'

    def add_arguments(self, parser):
        parser.add_argument('pdf_path', type=str, help='Path to the PDF file to ingest.')
        parser.add_argument(
            '--topic', type=str, default='General',
            help='Topic/subject label for generated questions (default: "General").'
        )
        parser.add_argument(
            '--per-chunk', type=int, default=10,
            help='Number of questions to generate per text chunk (default: 10).'
        )
        parser.add_argument(
            '--chunk-size', type=int, default=3000,
            help='Maximum characters per text chunk sent to the LLM (default: 3000).'
        )
        parser.add_argument(
            '--api-key', type=str, default=None,
            help='Gemini API key (overrides GEMINI_API_KEY env variable).'
        )
        parser.add_argument(
            '--model', type=str, default='gemini-2.0-flash',
            help='Gemini model name (default: gemini-2.0-flash).'
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Extract text and generate questions but do NOT save to DB.'
        )

    def handle(self, *args, **options):
        pdf_path = options['pdf_path']
        topic = options['topic']
        per_chunk = options['per_chunk']
        chunk_size = options['chunk_size']
        model_name = options['model']
        dry_run = options['dry_run']

        # ── Validate PDF ──────────────────────────────────────────────────────
        if not os.path.isfile(pdf_path):
            raise CommandError(f'File not found: {pdf_path}')

        # ── Configure Gemini ──────────────────────────────────────────────────
        api_key = options['api_key'] or os.environ.get('GEMINI_API_KEY')
        if not api_key:
            raise CommandError(
                'No Gemini API key found. Pass --api-key or set GEMINI_API_KEY env variable.'
            )
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name)

        # ── Step 1: Extract text from PDF ────────────────────────────────────
        self.stdout.write(self.style.NOTICE(f'📄 Extracting text from: {pdf_path}'))
        full_text = self._extract_text(pdf_path)

        if not full_text.strip():
            raise CommandError('No text could be extracted from the PDF.')

        self.stdout.write(f'   → Extracted {len(full_text):,} characters of text.')

        # ── Step 2: Chunk the text ───────────────────────────────────────────
        chunks = self._chunk_text(full_text, chunk_size)
        self.stdout.write(f'   → Split into {len(chunks)} chunk(s) of ~{chunk_size} chars each.')

        # ── Step 3: Generate questions per chunk ─────────────────────────────
        total_saved = 0
        total_failed = 0

        for i, chunk in enumerate(chunks, 1):
            self.stdout.write(self.style.NOTICE(
                f'\n🤖 Chunk {i}/{len(chunks)} — Generating {per_chunk} questions…'
            ))

            prompt = PROMPT_TEMPLATE.format(
                count=per_chunk, topic=topic, chunk=chunk
            )

            try:
                response = model.generate_content(prompt)
                raw_text = response.text.strip()

                questions = self._parse_json(raw_text)

                if not questions:
                    self.stderr.write(self.style.WARNING(
                        f'   ⚠ Chunk {i}: LLM returned no valid questions.'
                    ))
                    total_failed += 1
                    continue

                # ── Step 4: Save to DB ───────────────────────────────────────
                for q in questions:
                    if not self._validate_question(q):
                        self.stderr.write(f'   ⚠ Skipping malformed question: {q.get("text", "?")[:50]}')
                        continue

                    if dry_run:
                        self.stdout.write(f'   [DRY-RUN] {q["difficulty"]:6s} | {q["text"][:70]}')
                    else:
                        Question.objects.create(
                            text=q['text'],
                            options=q['options'],
                            correct_answer=q['correct_answer'],
                            topic=q.get('topic', topic),
                            difficulty=q.get('difficulty', 'medium'),
                        )
                    total_saved += 1

            except Exception as exc:
                self.stderr.write(self.style.ERROR(
                    f'   ✗ Chunk {i} failed: {exc}'
                ))
                total_failed += 1
                continue

        # ── Summary ──────────────────────────────────────────────────────────
        self.stdout.write('')
        if dry_run:
            self.stdout.write(self.style.SUCCESS(
                f'✅ DRY RUN complete: {total_saved} questions generated, {total_failed} chunks failed.'
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'✅ Ingestion complete: {total_saved} questions saved to DB, {total_failed} chunks failed.'
            ))

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _extract_text(pdf_path: str) -> str:
        """Extract all text from a PDF using pdfplumber."""
        pages_text = []
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages_text.append(text)
        return '\n\n'.join(pages_text)

    @staticmethod
    def _chunk_text(text: str, max_chars: int) -> list[str]:
        """Split text into chunks at paragraph boundaries, respecting max_chars."""
        paragraphs = text.split('\n\n')
        chunks = []
        current_chunk = ''

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            if len(current_chunk) + len(para) + 2 > max_chars and current_chunk:
                chunks.append(current_chunk.strip())
                current_chunk = para
            else:
                current_chunk = current_chunk + '\n\n' + para if current_chunk else para

        if current_chunk.strip():
            chunks.append(current_chunk.strip())

        return chunks

    @staticmethod
    def _parse_json(raw: str) -> list[dict] | None:
        """
        Parse JSON array from LLM response.
        Handles common issues: markdown fences, trailing commas, etc.
        """
        # Strip markdown code fences if present
        cleaned = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.MULTILINE)
        cleaned = re.sub(r'```\s*$', '', cleaned, flags=re.MULTILINE)
        cleaned = cleaned.strip()

        try:
            result = json.loads(cleaned)
            if isinstance(result, list):
                return result
        except json.JSONDecodeError:
            pass

        # Try to find JSON array in the text
        match = re.search(r'\[.*\]', cleaned, re.DOTALL)
        if match:
            try:
                result = json.loads(match.group())
                if isinstance(result, list):
                    return result
            except json.JSONDecodeError:
                pass

        return None

    @staticmethod
    def _validate_question(q: dict) -> bool:
        """Check that a question dict has all required fields."""
        if not isinstance(q, dict):
            return False
        if not q.get('text') or not isinstance(q.get('text'), str):
            return False
        options = q.get('options', [])
        if not isinstance(options, list) or len(options) != 4:
            return False
        if not q.get('correct_answer') or q['correct_answer'] not in options:
            return False
        if q.get('difficulty', 'medium') not in ('easy', 'medium', 'hard'):
            q['difficulty'] = 'medium'  # fallback
        return True
