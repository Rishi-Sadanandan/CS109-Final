import numpy as np
from collections import defaultdict

class BayesianFusion:
    """
    Bayesian fusion module that combines evidence from text and camera
    to estimate the user's mood.
    
    This implements a Bayesian update approach where:
    P(Mood|Evidence) ∝ P(Evidence|Mood) * P(Mood)
    
    With multiple independent evidence sources:
    P(Mood|Text,Camera) ∝ P(Text|Mood) * P(Camera|Mood) * P(Mood)
    """
    
    def __init__(self):
        # Initialize mood categories
        self.moods = ['happy', 'neutral', 'sad']
        
        # Initialize prior distribution (uniform)
        self.posterior = {mood: 1/3 for mood in self.moods}
        
        # Sensor reliability (Beta distribution parameters)
        # For each sensor and each mood, we track alpha and beta parameters
        # Higher alpha/(alpha+beta) means higher reliability
        self.reliability = {
            'camera': {mood: {'alpha': 2, 'beta': 1} for mood in self.moods},
            'text': {mood: {'alpha': 2, 'beta': 1} for mood in self.moods}
        }
        
        # Store the last distributions for potential corrections
        self.last_camera_dist = None
        self.last_text_dist = None
    
    def update(self, camera_dist=None, text_dist=None):
        """
        Update the posterior distribution based on new evidence.
        
        Args:
            camera_dist: Distribution over moods from camera
            text_dist: Distribution over moods from text
        
        This implements the Bayesian update formula:
        P(Mood|Evidence) ∝ P(Evidence|Mood) * P(Mood)
        
        With multiple evidence sources and assuming conditional independence:
        P(Mood|Camera,Text) ∝ P(Camera|Mood) * P(Text|Mood) * P(Mood)
        """
        # Start with current posterior as prior for this update
        prior = self.posterior.copy()
        
        # Initialize unnormalized posterior
        unnorm_posterior = {mood: prior[mood] for mood in self.moods}
        
        # Update with camera distribution if provided
        if camera_dist is not None:
            self.last_camera_dist = camera_dist
            
            # Apply reliability weighting to camera distribution
            weighted_camera_dist = self._apply_reliability(camera_dist, 'camera')
            
            # Update unnormalized posterior with camera evidence
            for mood in self.moods:
                unnorm_posterior[mood] *= weighted_camera_dist.get(mood, 1/3)
        
        # Update with text distribution if provided
        if text_dist is not None:
            self.last_text_dist = text_dist
            
            # Apply reliability weighting to text distribution
            weighted_text_dist = self._apply_reliability(text_dist, 'text')
            
            # Update unnormalized posterior with text evidence
            for mood in self.moods:
                unnorm_posterior[mood] *= weighted_text_dist.get(mood, 1/3)
        
        # Normalize posterior
        total = sum(unnorm_posterior.values())
        if total > 0:  # Avoid division by zero
            self.posterior = {mood: prob/total for mood, prob in unnorm_posterior.items()}
    
    def _apply_reliability(self, distribution, sensor_type):
        """
        Apply reliability weighting to a sensor's distribution.
        
        The reliability is used to "soften" the distribution based on
        how reliable we believe the sensor is for each mood.
        
        Args:
            distribution: The original distribution from the sensor
            sensor_type: 'camera' or 'text'
            
        Returns:
            A weighted distribution
        """
        weighted_dist = {}
        
        for mood in self.moods:
            # Get reliability parameters for this sensor and mood
            alpha = self.reliability[sensor_type][mood]['alpha']
            beta = self.reliability[sensor_type][mood]['beta']
            
            # Calculate reliability factor (expected value of Beta distribution)
            reliability = alpha / (alpha + beta)
            
            # Weight the probability by reliability
            # This pulls the probability toward 1/3 (uniform) based on reliability
            orig_prob = distribution.get(mood, 1/3)
            weighted_dist[mood] = reliability * orig_prob + (1 - reliability) * (1/3)
        
        # Normalize the weighted distribution
        total = sum(weighted_dist.values())
        return {mood: prob/total for mood, prob in weighted_dist.items()}
    
    def update_reliability(self, correct_mood, camera_dist=None, text_dist=None):
        """
        Update sensor reliability based on user correction.
        
        Args:
            correct_mood: The correct mood provided by the user
            camera_dist: The last camera distribution
            text_dist: The last text distribution
        """
        # Use stored distributions if not provided
        camera_dist = camera_dist or self.last_camera_dist
        text_dist = text_dist or self.last_text_dist
        
        # Update camera reliability if we have camera data
        if camera_dist:
            for mood in self.moods:
                # If this is the correct mood, increase alpha (true positive)
                if mood == correct_mood:
                    self.reliability['camera'][mood]['alpha'] += camera_dist.get(mood, 0)
                # If this is not the correct mood, increase beta (false positive)
                else:
                    self.reliability['camera'][mood]['beta'] += camera_dist.get(mood, 0)
        
        # Update text reliability if we have text data
        if text_dist:
            for mood in self.moods:
                # If this is the correct mood, increase alpha (true positive)
                if mood == correct_mood:
                    self.reliability['text'][mood]['alpha'] += text_dist.get(mood, 0)
                # If this is not the correct mood, increase beta (false positive)
                else:
                    self.reliability['text'][mood]['beta'] += text_dist.get(mood, 0)
    
    def get_posterior(self):
        """
        Get the current posterior distribution.
        """
        return self.posterior
    
    def set_posterior(self, new_posterior):
        """
        Set the posterior distribution directly.
        """
        self.posterior = new_posterior
    
    def reset(self):
        """
        Reset the posterior to uniform distribution.
        """
        self.posterior = {mood: 1/3 for mood in self.moods}
        
    def get_most_likely_mood(self):
        """
        Get the most likely mood based on current posterior.
        """
        return max(self.posterior.items(), key=lambda x: x[1])[0] 