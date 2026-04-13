#!/usr/bin/env bash
# exit on error
set -o errexit

# Install dependencies
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# Create static directory if it doesn't exist
mkdir -p staticfiles

# Collect static files
python manage.py collectstatic --no-input

# Run migrations
python manage.py migrate

# Seed data if data_dump.json exists
if [ -f data_dump.json ]; then
    echo "Seeding data from data_dump.json..."
    python manage.py loaddata data_dump.json
fi
