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

from django.core.management.base import BaseCommand, CommandError
from quiz_core.ingestion_service import ingest_and_generate_questions
from quiz_core.models import Question

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Ingest a PDF file, extract text, generate quiz questions via OpenRouter, and save to database.'

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
            '--dry-run', action='store_true',
            help='Extract text and generate questions but do NOT save to DB.'
        )

    def handle(self, *args, **options):
        pdf_path = options['pdf_path']
        topic = options['topic']
        per_chunk = options['per_chunk']
        chunk_size = options['chunk_size']
        dry_run = options['dry_run']

        # ── Validate PDF ──────────────────────────────────────────────────────
        if not os.path.isfile(pdf_path):
            raise CommandError(f'File not found: {pdf_path}')

        self.stdout.write(self.style.NOTICE(f'📄 Starting ingestion for: {pdf_path}'))
        
        try:
            # Use the centralized service
            # This handles text extraction, chunking, LLM calls, and DB saving
            total_saved = ingest_and_generate_questions(
                pdf_path=pdf_path,
                topic=topic,
                per_chunk=per_chunk,
                chunk_size=chunk_size,
                dry_run=dry_run
            )

            if dry_run:
                self.stdout.write(self.style.SUCCESS(
                    f'✅ DRY RUN complete: {total_saved} questions would have been generated.'
                ))
            else:
                self.stdout.write(self.style.SUCCESS(
                    f'✅ Ingestion complete: {total_saved} questions saved to DB.'
                ))

        except Exception as exc:
            self.stderr.write(self.style.ERROR(f'✗ Ingestion failed: {exc}'))
            raise CommandError(str(exc))
