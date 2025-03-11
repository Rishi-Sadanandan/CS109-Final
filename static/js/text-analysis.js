/**
 * Text analysis for sentiment detection and response generation
 */

// Global variables
let lastTextDist = { happy: 0.33, neutral: 0.34, sad: 0.33 };
let moodContext = {
    currentMood: 'neutral',
    confidence: 'low',
    topics: []
};
let conversationHistory = [];
const MAX_HISTORY = 10;

// Add a user message to the chat
function addUserMessage(text) {
    // Create message element
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'user-message');
    messageElement.textContent = text;
    
    // Add to chat
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Add to conversation history
    conversationHistory.push({
        role: 'user',
        text: text,
        timestamp: Date.now()
    });
    
    // Keep history at a reasonable size
    if (conversationHistory.length > MAX_HISTORY) {
        conversationHistory.shift();
    }
}

// Add a system message to the chat
function addSystemMessage(text) {
    // Create message element
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'system-message');
    messageElement.textContent = text;
    
    // Add to chat
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Add to conversation history
    conversationHistory.push({
        role: 'system',
        text: text,
        timestamp: Date.now()
    });
    
    // Keep history at a reasonable size
    if (conversationHistory.length > MAX_HISTORY) {
        conversationHistory.shift();
    }
    
    // Add to conversation analysis with system role
    if (typeof addConversationEntry === 'function') {
        addConversationEntry({
            role: 'system',
            text: text,
            textEmotion: { happy: 0.33, neutral: 0.34, sad: 0.33 }, // Neutral for system messages
            timestamp: Date.now()
        });
    }
}

// Extract topics from text
function extractTopics(text) {
    // Simple keyword extraction
    const keywords = text.toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .split(/\s+/) // Split by whitespace
        .filter(word => word.length > 3) // Only words longer than 3 chars
        .filter(word => !['this', 'that', 'with', 'from', 'have', 'what', 'when', 'where', 'which', 'there', 'their', 'about'].includes(word)); // Remove common words
    
    // Count occurrences
    const counts = {};
    keywords.forEach(word => {
        counts[word] = (counts[word] || 0) + 1;
    });
    
    // Sort by count
    const topics = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3) // Top 3 topics
        .map(entry => entry[0]);
    
    return topics;
}

/**
 * Analyze text emotion using OpenAI API
 * @param {string} text - The text to analyze
 * @returns {Promise<Object>} - The emotion distribution (happy, neutral, sad)
 */
async function analyzeTextWithOpenAI(text) {
    try {
        console.log('Analyzing text with OpenAI:', text);
        
        // Send to server for OpenAI-based emotion analysis
        const response = await fetch('/analyze_emotion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
        });
        
        if (!response.ok) {
            console.error('Error analyzing text with OpenAI:', await response.text());
            return null;
        }
        
        const data = await response.json();
        console.log('OpenAI emotion analysis:', data);
        
        if (data.error) {
            console.warn('OpenAI analysis warning:', data.error);
        }
        
        return data.emotion_distribution;
    } catch (error) {
        console.error('Error in OpenAI text analysis:', error);
        return null;
    }
}

/**
 * Apply Bayes' rule to combine two emotion distributions
 * @param {Object} prior - The prior distribution
 * @param {Object} likelihood - The likelihood distribution
 * @returns {Object} - The posterior distribution
 */
function applyBayesRule(prior, likelihood) {
    // Calculate the unnormalized posterior
    const unnormalizedPosterior = {
        happy: prior.happy * likelihood.happy,
        neutral: prior.neutral * likelihood.neutral,
        sad: prior.sad * likelihood.sad
    };
    
    // Calculate the normalization constant
    const normalizationConstant = 
        unnormalizedPosterior.happy + 
        unnormalizedPosterior.neutral + 
        unnormalizedPosterior.sad;
    
    // Normalize the posterior
    const posterior = {
        happy: unnormalizedPosterior.happy / normalizationConstant,
        neutral: unnormalizedPosterior.neutral / normalizationConstant,
        sad: unnormalizedPosterior.sad / normalizationConstant
    };
    
    console.log('Bayes update:', { prior, likelihood, posterior });
    return posterior;
}

// Analyze text for sentiment and update the model
async function analyzeText(text) {
    if (!text || text.trim() === '') return;
    
    try {
        console.log('Analyzing text:', text);
        
        // Add user message to chat
        addUserMessage(text);
        
        // Extract topics
        const topics = extractTopics(text);
        
        // Check for special responses first
        const specialResponse = checkForSpecialResponses(text);
        if (specialResponse) {
            addSystemMessage(specialResponse);
            return;
        }
        
        // Initialize default distribution in case server request fails
        let textDistribution = { happy: 0.33, neutral: 0.34, sad: 0.33 };
        let usedLocalAnalysis = false;
        
        try {
            // Send to server for sentiment analysis
            const response = await fetch('/classify_text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Use the server's text distribution
                textDistribution = data.text_distribution;
                console.log('Server sentiment analysis:', textDistribution);
            } else {
                console.error('Error analyzing text:', await response.text());
                // Use local analysis
                textDistribution = analyzeTextSentiment(text);
                usedLocalAnalysis = true;
            }
        } catch (serverError) {
            console.error('Error sending text to server:', serverError);
            // Use local analysis
            textDistribution = analyzeTextSentiment(text);
            usedLocalAnalysis = true;
        }
        
        // If we used local analysis, check for specific phrases to override
        if (usedLocalAnalysis) {
            const lowerText = text.toLowerCase();
            
            // Check for explicit positive statements
            if (lowerText.includes('feeling good') || 
                lowerText.includes('feel good') || 
                lowerText.includes('feeling great') || 
                lowerText.includes('feel great') || 
                lowerText.includes('pretty good') || 
                lowerText.includes('doing well') || 
                lowerText.includes('going well')) {
                
                console.log('Overriding to positive sentiment based on explicit statement');
                textDistribution = { happy: 0.7, neutral: 0.2, sad: 0.1 };
            }
            
            // Check for explicit negative statements
            if (lowerText.includes('feeling bad') || 
                lowerText.includes('feel bad') || 
                lowerText.includes('feeling sad') || 
                lowerText.includes('feel sad') || 
                lowerText.includes('not well') || 
                lowerText.includes('not good')) {
                
                console.log('Overriding to negative sentiment based on explicit statement');
                textDistribution = { happy: 0.1, neutral: 0.2, sad: 0.7 };
            }
        }
        
        // NEW: Get OpenAI-based emotional analysis
        const openAIDistribution = await analyzeTextWithOpenAI(text);
        
        // If OpenAI analysis is available, combine it with the existing analysis using Bayes' rule
        if (openAIDistribution) {
            console.log('Combining with OpenAI analysis:', openAIDistribution);
            
            // Use the existing textDistribution as prior and OpenAI as likelihood
            textDistribution = applyBayesRule(textDistribution, openAIDistribution);
            
            console.log('Combined sentiment distribution:', textDistribution);
        }
        
        console.log('Final sentiment distribution:', textDistribution);
        
        // Store text distribution for potential mood correction
        lastTextDist = textDistribution;
        
        // Update mood context based only on text analysis
        updateMoodContext(textDistribution);
        
        // Add topics to context
        if (topics.length > 0) {
            moodContext.topics = [...new Set([...moodContext.topics, ...topics])].slice(0, 5);
        }
        
        // Get current facial emotion if available (for logging only, not for response generation)
        let facialEmotion = null;
        if (typeof getAveragedEmotions === 'function') {
            facialEmotion = getAveragedEmotions();
        }
        
        // Add to conversation analysis
        if (typeof addConversationEntry === 'function') {
            addConversationEntry({
                role: 'user',
                text: text,
                textEmotion: textDistribution,
                facialEmotion: facialEmotion,
                timestamp: Date.now(),
                openAIEmotion: openAIDistribution || null // Add OpenAI analysis to the entry
            });
        }
        
        // Update UI with text sentiment (completely separate from facial analysis)
        updateMoodChart(textDistribution);
        updateMoodIndicator(textDistribution);
        
        // Generate response using OpenAI API if available
        let botResponse;
        console.log('Generating response...');
        
        try {
            // Show typing indicator
            showTypingIndicator();
            
            if (typeof generateTherapistResponse === 'function') {
                // Generate response using OpenAI
                console.log('Using OpenAI for response generation');
                botResponse = await generateTherapistResponse(text, textDistribution);
                console.log('Response received:', botResponse);
            } else {
                // Fallback to hardcoded responses
                console.log('OpenAI handler not available, using fallback');
                botResponse = generateResponse(textDistribution, text);
            }
            
            // Hide typing indicator
            hideTypingIndicator();
        } catch (responseError) {
            console.error('Error generating response:', responseError);
            hideTypingIndicator();
            
            // Use fallback response
            botResponse = "I'm not sure I understood. Could you tell me more?";
        }
        
        // Add system response
        addSystemMessage(botResponse);
        
        // Speak the response if speech is enabled
        if (typeof speakText === 'function') {
            speakText(botResponse);
        }
        
    } catch (error) {
        console.error('Error in text analysis process:', error);
        
        // Provide a more helpful error message
        const errorMessage = "I didn't catch that. How are you feeling?";
        addSystemMessage(errorMessage);
        
        // Try to speak the error message
        if (typeof speakText === 'function') {
            speakText(errorMessage);
        }
    }
}

// Update mood context based on new distribution
function updateMoodContext(distribution) {
    // Find dominant mood
    let maxProb = 0;
    let dominantMood = 'neutral';
    
    for (const mood in distribution) {
        if (distribution[mood] > maxProb) {
            maxProb = distribution[mood];
            dominantMood = mood;
        }
    }
    
    // Determine confidence level
    let confidence = 'moderate';
    if (maxProb > 0.7) {
        confidence = 'high';
    } else if (maxProb > 0.5) {
        confidence = 'moderate';
    } else {
        confidence = 'low';
    }
    
    // Update context
    moodContext.currentMood = dominantMood;
    moodContext.confidence = confidence;
}



// Check for special responses
function checkForSpecialResponses(text) {
    const lowerText = text.toLowerCase();
    
    // Check for report request
    if (lowerText.includes('generate report') || 
        lowerText.includes('show report') || 
        lowerText.includes('create report') ||
        lowerText.includes('emotional report') ||
        lowerText.includes('analysis report')) {
        
        // Generate comprehensive report if available
        if (typeof generateComprehensiveReport === 'function') {
            const reportHtml = generateComprehensiveReport();
            
            // Create a special message element for the report
            const chatMessages = document.getElementById('chat-messages');
            const reportElement = document.createElement('div');
            reportElement.classList.add('message', 'system-message', 'report-message');
            reportElement.innerHTML = reportHtml;
            
            // Add to chat
            chatMessages.appendChild(reportElement);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            return "I've generated a comprehensive emotional analysis report based on our conversation and your facial expressions.";
        }
        
        return "I'll generate a comprehensive emotional analysis report for you.";
    }
    
    // Check for help request
    if (lowerText.includes('help') && 
        (lowerText.includes('how') || lowerText.includes('what') || lowerText.includes('?'))) {
        return "I'm your Bayesian Mood Buddy. I analyze your emotions through facial expressions and our conversation. You can chat with me normally, and I'll respond based on your emotional state. Try enabling your camera for more accurate analysis. You can ask for a report at any time to see a comprehensive analysis of your emotional patterns.";
    }
    
    // No special response needed
    return null;
}

// Get a random response from an array of options
function getRandomResponse(options) {
    const index = Math.floor(Math.random() * options.length);
    return options[index];
}

// Get the last text distribution
function getLastTextDistribution() {
    return lastTextDist;
}

// Show typing indicator
function showTypingIndicator() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    // Create typing indicator if it doesn't exist
    let typingIndicator = document.getElementById('typing-indicator');
    if (!typingIndicator) {
        typingIndicator = document.createElement('div');
        typingIndicator.id = 'typing-indicator';
        typingIndicator.className = 'message system-message typing-indicator';
        typingIndicator.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
        chatMessages.appendChild(typingIndicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } else {
        typingIndicator.style.display = 'block';
    }
}

// Hide typing indicator
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.style.display = 'none';
    }
}

// Simple keyword-based sentiment analysis as fallback
function analyzeTextSentiment(text) {
    const lowerText = text.toLowerCase();
    
    // Define sentiment keywords with weights
    const happyWords = [
        {word: 'happy', weight: 2},
        {word: 'good', weight: 1.5},
        {word: 'great', weight: 2},
        {word: 'excellent', weight: 2},
        {word: 'wonderful', weight: 2},
        {word: 'joy', weight: 2},
        {word: 'love', weight: 1.5},
        {word: 'like', weight: 1},
        {word: 'enjoy', weight: 1.5},
        {word: 'glad', weight: 1.5},
        {word: 'pleased', weight: 1.5},
        {word: 'positive', weight: 1.5},
        {word: 'awesome', weight: 2},
        {word: 'fantastic', weight: 2},
        {word: 'amazing', weight: 2},
        {word: 'excited', weight: 1.5},
        {word: 'fun', weight: 1},
        {word: 'nice', weight: 1}
    ];
    
    const sadWords = [
        {word: 'sad', weight: 2},
        {word: 'bad', weight: 1.5},
        {word: 'depressed', weight: 2},
        {word: 'unhappy', weight: 2},
        {word: 'down', weight: 1},
        {word: 'terrible', weight: 2},
        {word: 'hate', weight: 1.5},
        {word: 'dislike', weight: 1},
        {word: 'upset', weight: 1.5},
        {word: 'awful', weight: 2},
        {word: 'horrible', weight: 2},
        {word: 'miserable', weight: 2},
        {word: 'disappointed', weight: 1.5},
        {word: 'worried', weight: 1.5},
        {word: 'anxious', weight: 1.5},
        {word: 'stressed', weight: 1.5},
        {word: 'angry', weight: 1.5},
        {word: 'frustrated', weight: 1.5}
    ];
    
    // Calculate sentiment scores
    let happyScore = 0;
    let sadScore = 0;
    
    // Check for negation words
    const negationWords = ['not', 'no', 'never', "don't", "doesn't", "didn't", "won't", "wouldn't", "can't", "couldn't"];
    const words = lowerText.split(/\s+/);
    
    // Check each word in context
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        
        // Check if this word is preceded by a negation
        const isNegated = i > 0 && negationWords.includes(words[i-1]);
        
        // Check happy words
        const happyMatch = happyWords.find(hw => hw.word === word);
        if (happyMatch) {
            if (isNegated) {
                sadScore += happyMatch.weight; // Negated happy is sad
            } else {
                happyScore += happyMatch.weight;
            }
        }
        
        // Check sad words
        const sadMatch = sadWords.find(sw => sw.word === word);
        if (sadMatch) {
            if (isNegated) {
                happyScore += sadMatch.weight * 0.5; // Negated sad is somewhat happy
            } else {
                sadScore += sadMatch.weight;
            }
        }
    }
    
    // Check for specific positive phrases
    const positivePatterns = [
        'feeling good', 'feel good', 'feeling great', 'feel great', 
        'doing well', 'going well', 'pretty good', 'feeling better',
        'feel better', 'feeling happy', 'feel happy', 'feeling positive',
        'feel positive', 'in a good mood', 'good mood'
    ];
    
    for (const pattern of positivePatterns) {
        if (lowerText.includes(pattern)) {
            happyScore += 3; // Strong boost for these phrases
        }
    }
    
    // Check for specific negative phrases
    const negativePatterns = [
        'feeling bad', 'feel bad', 'feeling sad', 'feel sad',
        'not well', 'not good', 'not great', 'not happy',
        'feeling down', 'feel down', 'in a bad mood', 'bad mood'
    ];
    
    for (const pattern of negativePatterns) {
        if (lowerText.includes(pattern)) {
            sadScore += 3; // Strong boost for these phrases
        }
    }
    
    console.log('Sentiment analysis:', { happyScore, sadScore });
    
    // Calculate distribution
    const total = happyScore + sadScore + 1; // Add 1 to avoid division by zero
    const neutralScore = Math.max(1, 5 - (happyScore + sadScore)); // Higher if both scores are low
    
    const distribution = {
        happy: happyScore / total,
        sad: sadScore / total,
        neutral: neutralScore / total
    };
    
    // Normalize to sum to 1
    const normTotal = distribution.happy + distribution.sad + distribution.neutral;
    distribution.happy /= normTotal;
    distribution.sad /= normTotal;
    distribution.neutral /= normTotal;
    
    console.log('Calculated sentiment distribution:', distribution);
    
    return distribution;
} 