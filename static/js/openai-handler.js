/**
 * OpenAI API integration for generating therapist-like responses
 */

// API configuration - using our proxy endpoint
const API_URL = '/openai_proxy';
const MODEL = 'gpt-3.5-turbo';

// Conversation history for context
let aiConversationHistory = [];
const MAX_HISTORY_LENGTH = 10; // Keep last 10 exchanges for context

// Track API failures to avoid repeated errors
let apiFailureCount = 0;
const MAX_API_FAILURES = 3;
let lastUserMessage = '';

// Flag to force local response generation for testing
const FORCE_LOCAL_RESPONSES = false;

// We're always using the API key now
const isApiKeySet = true;

// Hide API key section when the page loads
document.addEventListener('DOMContentLoaded', function() {
    const apiKeySection = document.querySelector('.api-key-section');
    if (apiKeySection) {
        apiKeySection.style.display = 'none';
    }
});

/**
 * Generate a therapist-like response using OpenAI API
 * @param {string} userMessage - The user's message
 * @param {Object} emotionalState - The emotional state detected from the message
 * @returns {Promise<string>} The generated response
 */
async function generateTherapistResponse(userMessage, emotionalState) {
    try {
        // Store the user message for fallback responses
        lastUserMessage = userMessage;
        
        // If API key is not set or we've had too many API failures, use local response generation
        if (!isApiKeySet || FORCE_LOCAL_RESPONSES || apiFailureCount >= MAX_API_FAILURES) {
            console.warn('Using local response generation', 
                         !isApiKeySet ? '(API key not set)' : 
                         FORCE_LOCAL_RESPONSES ? '(forced)' : 
                         '(due to API failures)');
            return generateLocalResponse(userMessage, emotionalState);
        }
        
        // Add user message to conversation history
        aiConversationHistory.push({
            role: 'user',
            content: userMessage
        });
        
        // Prepare the system message with context about the user's emotional state
        const dominantEmotion = getDominantEmotion(emotionalState);
        const systemMessage = {
            role: 'system',
            content: `You are a compassionate and conversational therapist. 
            
            The client's message has been analyzed and shows the following emotional probabilities:
            - Happy: ${(emotionalState.happy * 100).toFixed(1)}%
            - Neutral: ${(emotionalState.neutral * 100).toFixed(1)}%
            - Sad: ${(emotionalState.sad * 100).toFixed(1)}%
            
            Their dominant emotion appears to be ${dominantEmotion}.
            
            IMPORTANT RULES:
            1. Keep your response to 1-2 short sentences maximum
            2. Be warm, genuine and conversational
            3. Never mention percentages or the analysis directly
            4. Don't label yourself as an AI, assistant, or therapist
            5. Focus on asking thoughtful questions that encourage self-reflection
            6. Respond naturally as if in a real conversation
            7. Your response must be directly relevant to what the user just said`
        };
        
        // Prepare messages for the API call
        const messages = [
            systemMessage,
            ...aiConversationHistory.slice(-MAX_HISTORY_LENGTH)
        ];
        
        console.log('Sending request to OpenAI API via proxy...');
        
        // Make the API call through our proxy endpoint
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: messages,
                temperature: 0.7,
                max_tokens: 60 // Reduced to ensure shorter responses
            })
        });
        
        // Check if the response is ok
        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenAI API error:', errorText);
            apiFailureCount++;
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        // Parse the response
        const data = await response.json();
        console.log('API response data:', data);
        
        // Extract the generated text
        const generatedText = data.choices?.[0]?.message?.content?.trim();
        
        if (!generatedText) {
            console.error('No content in API response:', data);
            apiFailureCount++;
            throw new Error('No response generated');
        }
        
        // Reset API failure count on success
        apiFailureCount = 0;
        
        // Add the assistant's response to the conversation history
        aiConversationHistory.push({
            role: 'assistant',
            content: generatedText
        });
        
        // Keep history at a reasonable size
        if (aiConversationHistory.length > MAX_HISTORY_LENGTH * 2) {
            aiConversationHistory = aiConversationHistory.slice(-MAX_HISTORY_LENGTH * 2);
        }
        
        console.log('OpenAI response:', generatedText);
        return generatedText;
    } catch (error) {
        console.error('Error generating therapist response:', error);
        apiFailureCount++;
        
        // Provide a fallback response based on emotional state and user message
        return generateLocalResponse(userMessage, emotionalState);
    }
}

/**
 * Generate a response locally without using the API
 * @param {string} userMessage - The user's message
 * @param {Object} emotionalState - The emotional state detected from the message
 * @returns {string} A locally generated response
 */
function generateLocalResponse(userMessage, emotionalState) {
    const lowerMessage = userMessage.toLowerCase();
    
    // Log the emotional state for debugging
    console.log('Generating local response for message:', userMessage);
    console.log('Emotional state:', emotionalState);
    
    // Force recalculation of dominant emotion with clear thresholds
    let dominantEmotion = 'neutral';
    
    // Use stronger thresholds to determine dominant emotion
    if (emotionalState.happy > 0.4) {
        dominantEmotion = 'happy';
        console.log('Detected HAPPY emotion with score:', emotionalState.happy);
    } else if (emotionalState.sad > 0.4) {
        dominantEmotion = 'sad';
        console.log('Detected SAD emotion with score:', emotionalState.sad);
    } else {
        console.log('Detected NEUTRAL emotion');
    }
    
    // Check for specific positive phrases that should always be considered happy
    const strongPositiveIndicators = [
        'good', 'great', 'happy', 'excellent', 'wonderful', 'amazing', 
        'fantastic', 'awesome', 'enjoying', 'enjoy', 'glad', 'pleased',
        'positive', 'well', 'better', 'pretty good'
    ];
    
    for (const indicator of strongPositiveIndicators) {
        if (lowerMessage.includes(indicator)) {
            dominantEmotion = 'happy';
            console.log('Overriding to HAPPY due to positive indicator:', indicator);
            break;
        }
    }
    
    // Check for specific negative phrases that should always be considered sad
    const strongNegativeIndicators = [
        'sad', 'bad', 'depressed', 'unhappy', 'down', 'terrible', 
        'awful', 'horrible', 'miserable', 'not well', 'not good'
    ];
    
    for (const indicator of strongNegativeIndicators) {
        if (lowerMessage.includes(indicator)) {
            dominantEmotion = 'sad';
            console.log('Overriding to SAD due to negative indicator:', indicator);
            break;
        }
    }
    
    // Check for questions in the user's message
    const isQuestion = lowerMessage.includes('?') || 
                      lowerMessage.startsWith('what') || 
                      lowerMessage.startsWith('how') || 
                      lowerMessage.startsWith('why') || 
                      lowerMessage.startsWith('when') || 
                      lowerMessage.startsWith('where') || 
                      lowerMessage.startsWith('do you') || 
                      lowerMessage.startsWith('can you');
    
    // Check for common topics
    const mentionsWork = lowerMessage.includes('work') || 
                         lowerMessage.includes('job') || 
                         lowerMessage.includes('career') || 
                         lowerMessage.includes('boss') || 
                         lowerMessage.includes('colleague');
                         
    const mentionsRelationships = lowerMessage.includes('friend') || 
                                 lowerMessage.includes('family') || 
                                 lowerMessage.includes('partner') || 
                                 lowerMessage.includes('relationship') || 
                                 lowerMessage.includes('marriage') || 
                                 lowerMessage.includes('boyfriend') || 
                                 lowerMessage.includes('girlfriend') || 
                                 lowerMessage.includes('husband') || 
                                 lowerMessage.includes('wife');
                                 
    const mentionsHealth = lowerMessage.includes('health') || 
                          lowerMessage.includes('sick') || 
                          lowerMessage.includes('illness') || 
                          lowerMessage.includes('doctor') || 
                          lowerMessage.includes('hospital') || 
                          lowerMessage.includes('pain');
    
    // Check for greetings or introductions
    const isGreeting = lowerMessage.includes('hello') || 
                      lowerMessage.includes('hi') || 
                      lowerMessage.includes('hey') || 
                      lowerMessage.includes('good morning') || 
                      lowerMessage.includes('good afternoon') || 
                      lowerMessage.includes('good evening');
    
    // Check if user is asking about the system
    const isAboutSystem = lowerMessage.includes('who are you') || 
                         lowerMessage.includes('what are you') || 
                         lowerMessage.includes('how do you work') || 
                         lowerMessage.includes('what do you do');
    
    // Generate appropriate response based on context
    if (isAboutSystem) {
        return getRandomResponse([
            "I'm here to chat and listen. What's on your mind today?",
            "I'm someone you can talk to about your feelings. How are you doing?",
            "I'm here to have a conversation with you. What would you like to talk about?"
        ]);
    } else if (isGreeting) {
        return getRandomResponse([
            "Hello! How are you feeling today?",
            "Hi there! What's on your mind?",
            "Hey! How's your day going so far?"
        ]);
    } else if (isQuestion) {
        if (mentionsWork) {
            return getRandomResponse([
                "Work can be a big part of our lives. How does it affect your wellbeing?",
                "What aspects of your work do you find most challenging?",
                "How does your work environment influence your mood?"
            ]);
        } else if (mentionsRelationships) {
            return getRandomResponse([
                "Relationships can be complex. How are they affecting you?",
                "What aspects of this relationship matter most to you?",
                "How do you feel when you're with this person?"
            ]);
        } else if (mentionsHealth) {
            return getRandomResponse([
                "Health concerns can be stressful. How are you coping?",
                "How is this health situation affecting your daily life?",
                "What support do you have during this health challenge?"
            ]);
        } else {
            return getRandomResponse([
                "That's an interesting question. What are your thoughts on it?",
                "I'm curious to hear more about your perspective on this.",
                "What makes you ask about that?"
            ]);
        }
    } else if (lowerMessage.length < 10) {
        // Short responses often need prompting
        return getRandomResponse([
            "Could you tell me a bit more about that?",
            "I'd like to understand better. Can you elaborate?",
            "What else comes to mind when you think about this?"
        ]);
    } else {
        // Default responses based on emotional state
        console.log('Using emotion-based response for:', dominantEmotion);
        
        switch (dominantEmotion) {
            case 'happy':
                return getRandomResponse([
                    "That sounds really positive! What's contributing to these good feelings?",
                    "I'm glad to hear that. What else is bringing you joy lately?",
                    "It's great that you're feeling this way. What would make it even better?"
                ]);
            case 'sad':
                return getRandomResponse([
                    "I hear that this is difficult. What would help you feel supported right now?",
                    "That sounds challenging. How have you been coping with these feelings?",
                    "I'm sorry you're going through this. What might help, even just a little?"
                ]);
            case 'neutral':
            default:
                return getRandomResponse([
                    "I see. What else has been on your mind lately?",
                    "Thanks for sharing that. How do you feel about it?",
                    "I understand. What would you like to talk about next?"
                ]);
        }
    }
}

/**
 * Get a random response from an array of options
 * @param {Array} options - Array of possible responses
 * @returns {string} A randomly selected response
 */
function getRandomResponse(options) {
    const index = Math.floor(Math.random() * options.length);
    return options[index];
}

/**
 * Get the dominant emotion from an emotional state object
 * @param {Object} emotionalState - The emotional state object
 * @returns {string} The dominant emotion (happy, sad, or neutral)
 */
function getDominantEmotion(emotionalState) {
    let dominantEmotion = 'neutral';
    let dominantValue = emotionalState.neutral || 0;
    
    if ((emotionalState.happy || 0) > dominantValue) {
        dominantEmotion = 'happy';
        dominantValue = emotionalState.happy;
    }
    
    if ((emotionalState.sad || 0) > dominantValue) {
        dominantEmotion = 'sad';
        dominantValue = emotionalState.sad;
    }
    
    return dominantEmotion;
}

/**
 * Reset the conversation history
 */
function resetAIConversationHistory() {
    aiConversationHistory = [];
    apiFailureCount = 0;
    lastUserMessage = '';
}

// Export functions for use in other modules
window.generateTherapistResponse = generateTherapistResponse;
window.resetAIConversationHistory = resetAIConversationHistory; 