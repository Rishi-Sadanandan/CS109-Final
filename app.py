from flask import Flask, request, jsonify, render_template, send_from_directory
import os
import requests
from modules.text_classifier import TextClassifier
from modules.bayesian_fusion import BayesianFusion
import json

# Simple API key variable - replace with your actual OpenAI API key
OPENAI_API_KEY = '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'

app = Flask(__name__, static_folder='static')
text_classifier = TextClassifier()
bayesian_fusion = BayesianFusion()

# OpenAI API URL
OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/classify_text', methods=['POST'])
def classify_text():
    """
    Endpoint to classify text sentiment and update the Bayesian model
    """
    data = request.json
    text = data.get('text', '')
    
    # Get text sentiment distribution
    text_distribution = text_classifier.classify(text)
    
    # Update Bayesian model with text distribution only
    bayesian_fusion.update(text_dist=text_distribution)
    
    # Return the updated posterior distribution
    return jsonify({
        'text_distribution': text_distribution,
        'posterior': bayesian_fusion.get_posterior()
    })

@app.route('/update_camera', methods=['POST'])
def update_camera():
    """
    Endpoint to update the Bayesian model with camera-based emotion distribution
    """
    data = request.json
    camera_distribution = data.get('distribution', {})
    
    # Update Bayesian model with camera distribution only
    bayesian_fusion.update(camera_dist=camera_distribution)
    
    # Return the updated posterior distribution
    return jsonify({
        'posterior': bayesian_fusion.get_posterior()
    })

@app.route('/correct_mood', methods=['POST'])
def correct_mood():
    """
    Endpoint to handle user corrections to the mood prediction
    """
    data = request.json
    correct_mood = data.get('mood', '')
    last_camera_dist = data.get('camera_dist', {})
    last_text_dist = data.get('text_dist', {})
    
    # Update sensor reliability based on user correction
    bayesian_fusion.update_reliability(correct_mood, last_camera_dist, last_text_dist)
    
    # Reset posterior to the corrected mood
    corrected_posterior = {'happy': 0.0, 'neutral': 0.0, 'sad': 0.0}
    corrected_posterior[correct_mood] = 1.0
    bayesian_fusion.set_posterior(corrected_posterior)
    
    return jsonify({
        'posterior': bayesian_fusion.get_posterior(),
        'message': f'Mood corrected to {correct_mood}'
    })

@app.route('/reset', methods=['POST'])
def reset():
    """
    Endpoint to reset the Bayesian model to initial state
    """
    bayesian_fusion.reset()
    return jsonify({
        'posterior': bayesian_fusion.get_posterior(),
        'message': 'Model reset to initial state'
    })

@app.route('/set_api_key', methods=['POST'])
def set_api_key():
    """
    Endpoint to set the OpenAI API key - simplified since we're using a hardcoded key
    """
    return jsonify({'message': 'API key set successfully'})

@app.route('/check_api_key', methods=['GET'])
def check_api_key():
    """
    Endpoint to check if the OpenAI API key is set - simplified since we're using a hardcoded key
    """
    return jsonify({'is_set': True})

@app.route('/openai_proxy', methods=['POST'])
def openai_proxy():
    """
    Proxy endpoint for OpenAI API to handle the API key securely
    """
    try:
        # Get the request data
        data = request.json
        
        # Make the request to OpenAI API
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {OPENAI_API_KEY}'
        }
        
        response = requests.post(OPENAI_API_URL, json=data, headers=headers)
        
        # Return the response from OpenAI
        return response.json(), response.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/analyze_emotion', methods=['POST'])
def analyze_emotion():
    """
    Endpoint to analyze emotion in text using OpenAI API
    Returns probabilities for happy, neutral, and sad emotions
    """
    try:
        # Get the text to analyze
        data = request.json
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Prepare the request to OpenAI
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {OPENAI_API_KEY}'
        }
        
        # Create a prompt that asks for emotional analysis
        prompt = {
            "model": "gpt-3.5-turbo",
            "messages": [
                {
                    "role": "system",
                    "content": """You are an emotional analysis AI. Analyze the emotional content of the user's message and classify it as happy, neutral, or sad.
                    Return ONLY a JSON object with the following format:
                    {"happy": float, "neutral": float, "sad": float}
                    
                    The values should be probabilities that sum to 1.0, representing your confidence in each emotion category.
                    For example: {"happy": 0.7, "neutral": 0.2, "sad": 0.1}
                    
                    DO NOT include any other text or explanation in your response, ONLY the JSON object."""
                },
                {
                    "role": "user",
                    "content": text
                }
            ],
            "temperature": 0.3,
            "max_tokens": 60
        }
        
        # Make the request to OpenAI
        response = requests.post(OPENAI_API_URL, json=prompt, headers=headers)
        
        if response.status_code != 200:
            return jsonify({'error': f'OpenAI API error: {response.text}'}), 500
        
        # Parse the response
        result = response.json()
        content = result.get('choices', [{}])[0].get('message', {}).get('content', '{}')
        
        try:
            # Try to parse the JSON response
            emotion_data = json.loads(content)
            
            # Validate the response format
            if not all(k in emotion_data for k in ['happy', 'neutral', 'sad']):
                # If the response doesn't have the expected keys, return a default distribution
                return jsonify({
                    'emotion_distribution': {'happy': 0.33, 'neutral': 0.34, 'sad': 0.33},
                    'error': 'Invalid response format from OpenAI'
                }), 200
            
            # Return the emotion distribution
            return jsonify({'emotion_distribution': emotion_data}), 200
            
        except json.JSONDecodeError:
            # If the response isn't valid JSON, return a default distribution
            return jsonify({
                'emotion_distribution': {'happy': 0.33, 'neutral': 0.34, 'sad': 0.33},
                'error': 'Failed to parse OpenAI response'
            }), 200
            
    except Exception as e:
        # Return a default distribution in case of any error
        return jsonify({
            'emotion_distribution': {'happy': 0.33, 'neutral': 0.34, 'sad': 0.33},
            'error': str(e)
        }), 200

if __name__ == '__main__':
    # Create directories if they don't exist
    os.makedirs('static', exist_ok=True)
    os.makedirs('templates', exist_ok=True)
    os.makedirs('modules', exist_ok=True)
    
    app.run(debug=True, port=5000) 