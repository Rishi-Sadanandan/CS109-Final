import re
import math
from collections import defaultdict, Counter

class TextClassifier:
    """
    A simple Naive Bayes text classifier for sentiment analysis.
    Classifies text into three categories: happy, neutral, sad.
    """
    
    def __init__(self):
        # Initialize word counts for each class
        self.word_counts = {
            'happy': Counter(),
            'neutral': Counter(),
            'sad': Counter()
        }
        
        # Class priors (initially uniform)
        self.class_priors = {
            'happy': 1/3,
            'neutral': 1/3,
            'sad': 1/3
        }
        
        # Total word counts per class
        self.total_counts = {
            'happy': 0,
            'neutral': 0,
            'sad': 0
        }
        
        # Vocabulary size (for Laplace smoothing)
        self.vocab_size = 0
        
        # Train with some seed data
        self._train_with_seed_data()
    
    def _train_with_seed_data(self):
        """
        Train the classifier with seed data to get initial word probabilities.
        """
        happy_texts = [
            "I'm feeling great today!",
            "This is wonderful news!",
            "I'm so happy and excited!",
            "What a fantastic day!",
            "I love this, it's amazing!",
            "I'm thrilled about the results!",
            "This makes me so happy!",
            "I'm feeling joyful and content.",
            "Everything is going perfectly!",
            "I'm delighted with how things turned out."
        ]
        
        neutral_texts = [
            "It's an ordinary day.",
            "I'm feeling okay I guess.",
            "Nothing special to report.",
            "Things are going as expected.",
            "I'm neither happy nor sad.",
            "Just another regular day.",
            "I'm feeling neutral about this.",
            "It is what it is.",
            "I don't have strong feelings either way.",
            "Everything is normal."
        ]
        
        sad_texts = [
            "I'm feeling down today.",
            "This is disappointing news.",
            "I'm so sad and upset.",
            "What a terrible day.",
            "I hate this, it's awful.",
            "I'm devastated about the results.",
            "This makes me so unhappy.",
            "I'm feeling gloomy and depressed.",
            "Everything is going wrong.",
            "I'm heartbroken about what happened."
        ]
        
        # Train with seed data
        for text in happy_texts:
            self._update_counts(text, 'happy')
        
        for text in neutral_texts:
            self._update_counts(text, 'neutral')
        
        for text in sad_texts:
            self._update_counts(text, 'sad')
        
        # Update vocabulary size
        all_words = set()
        for mood in self.word_counts:
            all_words.update(self.word_counts[mood].keys())
        self.vocab_size = len(all_words)
    
    def _tokenize(self, text):
        """
        Convert text to lowercase and split into words.
        Remove punctuation and special characters.
        """
        text = text.lower()
        # Replace punctuation with spaces and split into words
        words = re.findall(r'\b\w+\b', text)
        return words
    
    def _update_counts(self, text, mood):
        """
        Update word counts for a given text and mood.
        """
        words = self._tokenize(text)
        for word in words:
            self.word_counts[mood][word] += 1
            self.total_counts[mood] += 1
    
    def classify(self, text):
        """
        Classify text into happy, neutral, or sad using Naive Bayes.
        Returns a probability distribution over the three classes.
        
        P(Mood|Text) ∝ P(Text|Mood) * P(Mood)
        
        Using log probabilities to avoid underflow:
        log(P(Mood|Text)) = log(P(Text|Mood)) + log(P(Mood)) + constant
        """
        words = self._tokenize(text)
        
        # Calculate log probabilities for each class
        log_probs = {}
        for mood in ['happy', 'neutral', 'sad']:
            # Start with log of prior probability
            log_prob = math.log(self.class_priors[mood])
            
            # Add log probabilities of each word given the class (with Laplace smoothing)
            for word in words:
                # P(word|mood) with Laplace smoothing
                # (count(word, mood) + 1) / (total_words_in_mood + vocab_size)
                word_count = self.word_counts[mood].get(word, 0)
                word_prob = (word_count + 1) / (self.total_counts[mood] + self.vocab_size)
                log_prob += math.log(word_prob)
            
            log_probs[mood] = log_prob
        
        # Convert log probabilities to actual probabilities
        # First, find the maximum log probability to avoid numerical issues
        max_log_prob = max(log_probs.values())
        
        # Compute unnormalized probabilities by exponentiating
        unnorm_probs = {
            mood: math.exp(log_prob - max_log_prob) 
            for mood, log_prob in log_probs.items()
        }
        
        # Normalize to get a proper probability distribution
        total = sum(unnorm_probs.values())
        probs = {
            mood: prob / total 
            for mood, prob in unnorm_probs.items()
        }
        
        return probs
    
    def update(self, text, mood):
        """
        Update the classifier with new labeled data.
        """
        self._update_counts(text, mood)
        
        # Update vocabulary size
        all_words = set()
        for m in self.word_counts:
            all_words.update(self.word_counts[m].keys())
        self.vocab_size = len(all_words) 