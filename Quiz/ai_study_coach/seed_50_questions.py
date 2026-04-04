import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from quiz.models import Question

# We need a pool of dummy questions
DUMMY_QUESTIONS = [
    {
        "text": "What is the capital of France?",
        "options": ["London", "Berlin", "Paris", "Madrid"],
        "correct_answer": "Paris",
        "topic": "Geography",
        "difficulty": "easy"
    },
    {
        "text": "What is 2 + 2?",
        "options": ["3", "4", "5", "6"],
        "correct_answer": "4",
        "topic": "Math",
        "difficulty": "easy"
    },
    {
        "text": "Which planet is closest to the Sun?",
        "options": ["Venus", "Earth", "Mercury", "Mars"],
        "correct_answer": "Mercury",
        "topic": "Science",
        "difficulty": "easy"
    },
    {
        "text": "What is the largest ocean on Earth?",
        "options": ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
        "correct_answer": "Pacific Ocean",
        "topic": "Geography",
        "difficulty": "medium"
    },
    {
        "text": "Who painted the Mona Lisa?",
        "options": ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Claude Monet"],
        "correct_answer": "Leonardo da Vinci",
        "topic": "Art",
        "difficulty": "medium"
    },
    {
        "text": "What is the chemical formula for water?",
        "options": ["CO2", "H2O", "O2", "NaCl"],
        "correct_answer": "H2O",
        "topic": "Science",
        "difficulty": "easy"
    },
    {
        "text": "In what year did the Titanic sink?",
        "options": ["1905", "1912", "1920", "1931"],
        "correct_answer": "1912",
        "topic": "History",
        "difficulty": "hard"
    },
    {
        "text": "What is the square root of 64?",
        "options": ["6", "7", "8", "9"],
        "correct_answer": "8",
        "topic": "Math",
        "difficulty": "easy"
    },
    {
        "text": "Which element has the atomic number 1?",
        "options": ["Helium", "Hydrogen", "Lithium", "Oxygen"],
        "correct_answer": "Hydrogen",
        "topic": "Science",
        "difficulty": "medium"
    },
    {
        "text": "What is the capital of Japan?",
        "options": ["Seoul", "Beijing", "Tokyo", "Bangkok"],
        "correct_answer": "Tokyo",
        "topic": "Geography",
        "difficulty": "easy"
    },
    {
        "text": "Who wrote 'Hamlet'?",
        "options": ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"],
        "correct_answer": "William Shakespeare",
        "topic": "Literature",
        "difficulty": "medium"
    },
    {
        "text": "What is the largest mammal in the world?",
        "options": ["Elephant", "Blue Whale", "Giraffe", "Hippopotamus"],
        "correct_answer": "Blue Whale",
        "topic": "Biology",
        "difficulty": "easy"
    },
    {
        "text": "How many continents are there?",
        "options": ["5", "6", "7", "8"],
        "correct_answer": "7",
        "topic": "Geography",
        "difficulty": "easy"
    },
    {
        "text": "What is the hardest natural substance on Earth?",
        "options": ["Gold", "Iron", "Diamond", "Platinum"],
        "correct_answer": "Diamond",
        "topic": "Science",
        "difficulty": "medium"
    },
    {
        "text": "What is the main ingredient in guacamole?",
        "options": ["Tomato", "Avocado", "Onion", "Pepper"],
        "correct_answer": "Avocado",
        "topic": "Food",
        "difficulty": "easy"
    },
    {
        "text": "Which gas do plants absorb from the atmosphere?",
        "options": ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"],
        "correct_answer": "Carbon Dioxide",
        "topic": "Biology",
        "difficulty": "easy"
    },
    {
        "text": "Who is known as the 'Father of Computers'?",
        "options": ["Alan Turing", "Charles Babbage", "Bill Gates", "Steve Jobs"],
        "correct_answer": "Charles Babbage",
        "topic": "Technology",
        "difficulty": "hard"
    },
    {
        "text": "What does HTTP stand for?",
        "options": ["HyperText Transfer Protocol", "HyperText Transmission Protocol", "Hyper Transfer Text Protocol", "HyperText Transfer Program"],
        "correct_answer": "HyperText Transfer Protocol",
        "topic": "Technology",
        "difficulty": "medium"
    },
    {
        "text": "What is the boiling point of water in Celsius?",
        "options": ["50", "90", "100", "120"],
        "correct_answer": "100",
        "topic": "Science",
        "difficulty": "easy"
    },
    {
        "text": "Which language is primarily spoken in Brazil?",
        "options": ["Spanish", "Portuguese", "English", "French"],
        "correct_answer": "Portuguese",
        "topic": "Geography",
        "difficulty": "medium"
    },
    {
        "text": "What is the smallest prime number?",
        "options": ["0", "1", "2", "3"],
        "correct_answer": "2",
        "topic": "Math",
        "difficulty": "medium"
    },
    {
        "text": "Which organ in the human body produces insulin?",
        "options": ["Liver", "Pancreas", "Kidney", "Stomach"],
        "correct_answer": "Pancreas",
        "topic": "Biology",
        "difficulty": "hard"
    },
    {
        "text": "What is the currency of the United Kingdom?",
        "options": ["Euro", "Dollar", "Pound Sterling", "Franc"],
        "correct_answer": "Pound Sterling",
        "topic": "Economics",
        "difficulty": "easy"
    },
    {
        "text": "Who developed the theory of relativity?",
        "options": ["Isaac Newton", "Albert Einstein", "Galileo Galilei", "Nikola Tesla"],
        "correct_answer": "Albert Einstein",
        "topic": "Physics",
        "difficulty": "medium"
    },
    {
        "text": "What is the longest river in the world?",
        "options": ["Amazon River", "Nile River", "Yangtze River", "Mississippi River"],
        "correct_answer": "Nile River",
        "topic": "Geography",
        "difficulty": "medium"
    },
    {
        "text": "In computing, what does RAM stand for?",
        "options": ["Read Access Memory", "Random Access Memory", "Rapid Access Memory", "Run Access Memory"],
        "correct_answer": "Random Access Memory",
        "topic": "Technology",
        "difficulty": "easy"
    },
    {
        "text": "What is the symbol for Iron on the periodic table?",
        "options": ["Ir", "Fe", "In", "I"],
        "correct_answer": "Fe",
        "topic": "Chemistry",
        "difficulty": "medium"
    },
    {
        "text": "Who was the first President of the United States?",
        "options": ["Abraham Lincoln", "Thomas Jefferson", "George Washington", "John Adams"],
        "correct_answer": "George Washington",
        "topic": "History",
        "difficulty": "easy"
    },
    {
        "text": "What temperature does water freeze at in Fahrenheit?",
        "options": ["0", "32", "100", "212"],
        "correct_answer": "32",
        "topic": "Science",
        "difficulty": "medium"
    },
    {
        "text": "What is the main component of the sun?",
        "options": ["Liquid lava", "Oxygen", "Hydrogen", "Carbon"],
        "correct_answer": "Hydrogen",
        "topic": "Astronomy",
        "difficulty": "medium"
    },
    {
        "text": "Which famous scientist was awarded the 1921 Nobel Prize in Physics?",
        "options": ["Niels Bohr", "Albert Einstein", "Max Planck", "Marie Curie"],
        "correct_answer": "Albert Einstein",
        "topic": "Physics",
        "difficulty": "hard"
    },
    {
        "text": "What language is the most widely spoken natively in the world?",
        "options": ["English", "Mandarin Chinese", "Spanish", "Hindi"],
        "correct_answer": "Mandarin Chinese",
        "topic": "Linguistics",
        "difficulty": "medium"
    },
    {
        "text": "How many bones are in the adult human body?",
        "options": ["201", "206", "210", "225"],
        "correct_answer": "206",
        "topic": "Biology",
        "difficulty": "medium"
    },
    {
        "text": "Which country invented tea?",
        "options": ["India", "UK", "China", "Japan"],
        "correct_answer": "China",
        "topic": "History",
        "difficulty": "medium"
    },
    {
        "text": "What is the largest internal organ in the human body?",
        "options": ["Heart", "Brain", "Liver", "Lungs"],
        "correct_answer": "Liver",
        "topic": "Biology",
        "difficulty": "hard"
    },
    {
        "text": "Which Apollo mission first landed humans on the Moon?",
        "options": ["Apollo 8", "Apollo 10", "Apollo 11", "Apollo 13"],
        "correct_answer": "Apollo 11",
        "topic": "History",
        "difficulty": "medium"
    },
    {
        "text": "What is the speed of light in a vacuum (approx)?",
        "options": ["300,000 km/s", "150,000 km/s", "1,000,000 km/s", "50,000 km/s"],
        "correct_answer": "300,000 km/s",
        "topic": "Physics",
        "difficulty": "hard"
    },
    {
        "text": "Which string instrument is known as the 'fiddle'?",
        "options": ["Cello", "Viola", "Violin", "Double Bass"],
        "correct_answer": "Violin",
        "topic": "Music",
        "difficulty": "easy"
    },
    {
        "text": "What is the powerhouse of the cell?",
        "options": ["Nucleus", "Ribosome", "Mitochondria", "Endoplasmic Reticulum"],
        "correct_answer": "Mitochondria",
        "topic": "Biology",
        "difficulty": "easy"
    },
    {
        "text": "Which element is liquid at room temperature?",
        "options": ["Iron", "Mercury", "Gold", "Lead"],
        "correct_answer": "Mercury",
        "topic": "Chemistry",
        "difficulty": "medium"
    },
    {
        "text": "What is the capital of Australia?",
        "options": ["Sydney", "Melbourne", "Canberra", "Perth"],
        "correct_answer": "Canberra",
        "topic": "Geography",
        "difficulty": "hard"
    },
    {
        "text": "In which city is the Colosseum located?",
        "options": ["Athens", "Rome", "Paris", "Madrid"],
        "correct_answer": "Rome",
        "topic": "Geography",
        "difficulty": "easy"
    },
    {
        "text": "Who is the author of '1984'?",
        "options": ["Aldous Huxley", "George Orwell", "Ray Bradbury", "J.R.R. Tolkien"],
        "correct_answer": "George Orwell",
        "topic": "Literature",
        "difficulty": "medium"
    },
    {
        "text": "What is the chemical symbol for Sodium?",
        "options": ["So", "Na", "Sd", "N"],
        "correct_answer": "Na",
        "topic": "Chemistry",
        "difficulty": "medium"
    },
    {
        "text": "What planet is known for its rings?",
        "options": ["Jupiter", "Uranus", "Neptune", "Saturn"],
        "correct_answer": "Saturn",
        "topic": "Astronomy",
        "difficulty": "easy"
    },
    {
        "text": "Which artist is famous for cutting off his own ear?",
        "options": ["Vincent van Gogh", "Pablo Picasso", "Salvador Dalí", "Claude Monet"],
        "correct_answer": "Vincent van Gogh",
        "topic": "Art",
        "difficulty": "medium"
    },
    {
        "text": "What is the primary gas found in the Earth's atmosphere?",
        "options": ["Oxygen", "Carbon Dioxide", "Nitrogen", "Argon"],
        "correct_answer": "Nitrogen",
        "topic": "Science",
        "difficulty": "medium"
    },
    {
        "text": "Who directed the movie 'Jurassic Park'?",
        "options": ["James Cameron", "Steven Spielberg", "George Lucas", "Christopher Nolan"],
        "correct_answer": "Steven Spielberg",
        "topic": "Entertainment",
        "difficulty": "easy"
    },
    {
        "text": "What is the smallest country in the world by land area?",
        "options": ["Monaco", "Nauru", "Vatican City", "San Marino"],
        "correct_answer": "Vatican City",
        "topic": "Geography",
        "difficulty": "hard"
    },
    {
        "text": "Which classical composer became deaf later in life?",
        "options": ["Wolfgang Amadeus Mozart", "Johann Sebastian Bach", "Ludwig van Beethoven", "Franz Schubert"],
        "correct_answer": "Ludwig van Beethoven",
        "topic": "Music",
        "difficulty": "medium"
    }
]

import random

current_count = Question.objects.count()
print(f"Current questions in DB: {current_count}")

if current_count < 50:
    needed = 50 - current_count
    
    # Just take as many as we need from the dummy list
    # If we need more than we have, start looping it
    to_create = []
    
    count = 0
    while count < needed:
        q = DUMMY_QUESTIONS[count % len(DUMMY_QUESTIONS)]
        # Add slight variation if we are looping
        text = q['text'] if count < len(DUMMY_QUESTIONS) else f"{q['text']} (Alternative)"
        count += 1
        to_create.append(Question(
            text=text,
            options=q['options'],
            correct_answer=q['correct_answer'],
            topic=q['topic'],
            difficulty=q['difficulty']
        ))
        
    Question.objects.bulk_create(to_create)
    print(f"Seeded {needed} new questions.")
else:
    print("Database already has 50 or more questions.")

print(f"Total questions now: {Question.objects.count()}")

# Verifying random order query works
sample1 = list(Question.objects.order_by('?')[:5].values_list('id', flat=True))
sample2 = list(Question.objects.order_by('?')[:5].values_list('id', flat=True))

print("Randomization check (should be True):", sample1 != sample2)
print("Sample 1 IDs:", sample1)
print("Sample 2 IDs:", sample2)
