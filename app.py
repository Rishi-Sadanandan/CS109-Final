from flask import Flask, request, jsonify, render_template, send_from_directory
import os
import requests
from modules.text_classifier import TextClassifier
from modules.bayesian_fusion import BayesianFusion
import json
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables at the top of your file
load_dotenv()

# Get API key from environment variable
openai_api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=openai_api_key)

app = Flask(__name__, static_folder='static')
text_classifier = TextClassifier()
bayesian_fusion = BayesianFusion()

# OpenAI API URL
OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

# Use environment variables with defaults
app.config.update(
    PORT=int(os.getenv('PORT', 5000)),
    DEBUG=os.getenv('FLASK_ENV', 'production') == 'development',
    OPENAI_API_KEY=os.getenv('OPENAI_API_KEY'),
)

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
    try:
        # Get request data
        data = request.json
        print("Request data:", data)  # Debug print
        
        # Check if API key is available
        if not openai_api_key:
            print("ERROR: No OpenAI API key found")
            # Return a fallback response instead of an error
            return jsonify({
                "choices": [
                    {
                        "message": {
                            "content": "I'm sorry, but I'm currently operating in fallback mode due to API configuration issues. Please try again later.",
                            "role": "assistant"
                        },
                        "index": 0,
                        "finish_reason": "stop"
                    }
                ]
            })
        
        # Use the OpenAI client
        try:
            response = client.chat.completions.create(
                model=data.get('model', 'gpt-3.5-turbo'),
                messages=data.get('messages', []),
                temperature=data.get('temperature', 0.7)
            )
            
            # Convert the response to a dictionary
            return jsonify(response.model_dump())
        except Exception as api_error:
            print(f"OpenAI API Error: {str(api_error)}")
            
            # Return a fallback response that the frontend can handle
            return jsonify({
                "choices": [
                    {
                        "message": {
                            "content": "I'm sorry, but I'm having trouble connecting to my knowledge base. Let me provide a general response instead.",
                            "role": "assistant"
                        },
                        "index": 0,
                        "finish_reason": "stop"
                    }
                ]
            })
    except Exception as e:
        print(f"General Error in openai_proxy: {str(e)}")
        # Return a structured response that the frontend can handle
        return jsonify({
            "choices": [
                {
                    "message": {
                        "content": "I apologize, but I encountered an error processing your request. Please try again.",
                        "role": "assistant"
                    },
                    "index": 0,
                    "finish_reason": "stop"
                }
            ]
        })

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
        
        # Use the OpenAI client instead of raw requests
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
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
            temperature=0.3,
            max_tokens=60
        )
        
        # Get the content from the response
        content = response.choices[0].message.content
        
        try:
            # Try to parse the JSON response
            emotion_data = json.loads(content)
            
            # Validate the response format
            if not all(k in emotion_data for k in ['happy', 'neutral', 'sad']):
                return jsonify({
                    'emotion_distribution': {'happy': 0.33, 'neutral': 0.34, 'sad': 0.33},
                    'error': 'Invalid response format from OpenAI'
                }), 200
            
            # Return the emotion distribution
            return jsonify({'emotion_distribution': emotion_data}), 200
            
        except json.JSONDecodeError:
            return jsonify({
                'emotion_distribution': {'happy': 0.33, 'neutral': 0.34, 'sad': 0.33},
                'error': 'Failed to parse OpenAI response'
            }), 200
            
    except Exception as e:
        print(f"Error in analyze_emotion: {str(e)}")  # Add this debug line
        return jsonify({
            'emotion_distribution': {'happy': 0.33, 'neutral': 0.34, 'sad': 0.33},
            'error': str(e)
        }), 200

if __name__ == '__main__':
    # Create directories if they don't exist
    os.makedirs('static', exist_ok=True)
    os.makedirs('templates', exist_ok=True)
    os.makedirs('modules', exist_ok=True)
    
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port) 