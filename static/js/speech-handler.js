/**
 * Speech handler for voice recognition and synthesis
 * Uses the Web Speech API
 */

// Global variables
let recognition = null;
let speechSynthesis = window.speechSynthesis;
let isListening = false;
let isSpeechEnabled = true;
let lastInteractionTime = Date.now();
let isSpeaking = false;
let speechQueue = [];
let sessionActive = false;
let emotionAnalysisInterval = 20000; // Analyze emotions every 20 seconds
let lastEmotionAnalysisTime = Date.now();
let conversationStage = 'initial'; // Track conversation stage
let userReportedMood = null; // Store user's self-reported mood
let hasAskedAboutMood = false; // Track if we've asked about mood discrepancy
let lastResponse = ''; // Track last response to avoid repetition
let conversationTopics = []; // Track conversation topics

// Initialize speech recognition
function initSpeechRecognition() {
    try {
        // Check if speech recognition is supported
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.error('Speech recognition not supported');
            document.getElementById('start-voice').disabled = true;
            document.getElementById('voice-status').textContent = 'Voice input not supported in this browser';
            return false;
        }
        
        // Create speech recognition object
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        
        // Configure recognition
        recognition.continuous = false; // Changed to false for more intuitive push-to-talk
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        // Set up event handlers
        recognition.onstart = function() {
            isListening = true;
            document.getElementById('voice-status').textContent = 'Listening...';
            document.getElementById('start-voice').classList.add('hidden');
            document.getElementById('stop-voice').classList.remove('hidden');
            document.getElementById('start-voice').classList.add('active');
        };
        
        recognition.onend = function() {
            isListening = false;
            document.getElementById('voice-status').textContent = '';
            document.getElementById('start-voice').classList.remove('hidden');
            document.getElementById('stop-voice').classList.add('hidden');
            document.getElementById('start-voice').classList.remove('active');
        };
        
        recognition.onresult = function(event) {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');
            
            document.getElementById('voice-status').textContent = transcript;
            
            // If this is a final result, process it
            if (event.results[0].isFinal) {
                document.getElementById('text-input').value = transcript;
                // Small delay to show what was recognized before sending
                setTimeout(() => {
                    processUserInput(transcript);
                    lastInteractionTime = Date.now();
                }, 500);
            }
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error', event.error);
            document.getElementById('voice-status').textContent = 'Error: ' + event.error;
            isListening = false;
            document.getElementById('start-voice').classList.remove('hidden');
            document.getElementById('stop-voice').classList.add('hidden');
        };
        
        console.log('Speech recognition initialized');
        
        return true;
    } catch (error) {
        console.error('Error initializing speech recognition:', error);
        document.getElementById('start-voice').disabled = true;
        document.getElementById('voice-status').textContent = 'Voice input error: ' + error.message;
        return false;
    }
}

// Process user input and advance conversation
function processUserInput(text) {
    // First, analyze the text for sentiment
    analyzeText(text);
    
    // Extract topics from text
    const topics = extractTopicsFromText(text);
    if (topics.length > 0) {
        conversationTopics = [...new Set([...conversationTopics, ...topics])].slice(0, 5);
    }
    
    // Check if the user is reporting their mood
    if (conversationStage === 'asked_feeling' || conversationStage === 'initial') {
        detectUserReportedMood(text);
    }
    
    // Advance conversation based on current stage
    advanceConversation(text);
}

// Extract topics from text
function extractTopicsFromText(text) {
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

// Detect user's self-reported mood from text
function detectUserReportedMood(text) {
    const text_lower = text.toLowerCase();
    
    // Simple keyword matching for mood detection
    if (text_lower.includes('happy') || text_lower.includes('good') || text_lower.includes('great') || 
        text_lower.includes('excellent') || text_lower.includes('wonderful') || text_lower.includes('joy')) {
        userReportedMood = 'happy';
    } else if (text_lower.includes('sad') || text_lower.includes('bad') || text_lower.includes('depressed') || 
               text_lower.includes('unhappy') || text_lower.includes('down') || text_lower.includes('terrible')) {
        userReportedMood = 'sad';
    } else if (text_lower.includes('neutral') || text_lower.includes('okay') || text_lower.includes('fine') || 
               text_lower.includes('alright') || text_lower.includes('so-so')) {
        userReportedMood = 'neutral';
    }
    
    console.log('Detected user reported mood:', userReportedMood);
}

// Advance the conversation based on current stage
function advanceConversation(userText) {
    if (!sessionActive) return;
    
    setTimeout(() => {
        // Get current facial emotion data
        let facialMood = getCurrentDominantMood();
        
        switch(conversationStage) {
            case 'initial':
                // After user's first response, ask specifically about feelings
                conversationStage = 'asked_feeling';
                addSystemMessage("How are you feeling right now?");
                break;
                
            case 'asked_feeling':
                // After user reports their feeling, compare with facial analysis
                conversationStage = 'compared_moods';
                
                if (userReportedMood && facialMood && userReportedMood !== facialMood && !hasAskedAboutMood) {
                    hasAskedAboutMood = true;
                    addSystemMessage(`I see ${facialMood} expressions, but you say you're ${userReportedMood}. Tell me more about that.`);
                } else {
                    // If moods match or we couldn't detect a clear self-reported mood
                    addSystemMessage("What would you like to talk about today?");
                    conversationStage = 'open_conversation';
                }
                break;
                
            case 'compared_moods':
                // Move to open conversation after discussing mood discrepancy
                conversationStage = 'open_conversation';
                addSystemMessage("What's on your mind today?");
                break;
                
            case 'open_conversation':
                // Generate a contextual response based on user's input and detected mood
                generateContextualResponse(userText, facialMood);
                break;
                
            default:
                // Default response if stage is unknown
                generateContextualResponse(userText, facialMood);
        }
    }, 1000); // Small delay for natural conversation flow
}

// Get the current dominant mood from facial analysis
function getCurrentDominantMood() {
    try {
        if (moodChart && moodChart.data && moodChart.data.datasets[0].data) {
            const data = moodChart.data.datasets[0].data;
            const moods = {
                happy: data[0],
                neutral: data[1],
                sad: data[2]
            };
            
            // Find dominant mood
            let maxProb = 0;
            let dominantMood = null;
            
            for (const mood in moods) {
                if (moods[mood] > maxProb) {
                    maxProb = moods[mood];
                    dominantMood = mood;
                }
            }
            
            // Only return if confidence is reasonable
            if (maxProb > 0.4) {
                return dominantMood;
            }
        }
    } catch (error) {
        console.error('Error getting current dominant mood:', error);
    }
    
    return null;
}

// Generate a contextual response based on user input and detected mood
function generateContextualResponse(userText, currentMood) {
    // Default to neutral if no mood detected
    currentMood = currentMood || 'neutral';
    
    // Check if we have topics to discuss
    const hasTopic = conversationTopics.length > 0;
    const randomTopic = hasTopic ? conversationTopics[Math.floor(Math.random() * conversationTopics.length)] : null;
    
    // Check for questions in user text
    const isQuestion = userText.includes('?') || 
                      userText.toLowerCase().startsWith('what') || 
                      userText.toLowerCase().startsWith('how') || 
                      userText.toLowerCase().startsWith('why') || 
                      userText.toLowerCase().startsWith('when') || 
                      userText.toLowerCase().startsWith('where');
    
    // Generate response based on context
    let response = '';
    
    // If user asked a question, respond to it
    if (isQuestion) {
        switch (currentMood) {
            case 'happy':
                response = getRandomResponse([
                    "That's a great question! What do you think?",
                    "I'm curious about your thoughts on that too.",
                    "That's something I've wondered about as well. What's your perspective?"
                ]);
                break;
                
            case 'sad':
                response = getRandomResponse([
                    "That's a thoughtful question. How does thinking about this affect you?",
                    "I appreciate you sharing that question with me. What are your thoughts?",
                    "That's something worth reflecting on. What do you think?"
                ]);
                break;
                
            default:
                response = getRandomResponse([
                    "That's an interesting question. What are your thoughts?",
                    "I'd like to hear more about your perspective on that.",
                    "What do you think about that?"
                ]);
        }
    }
    // If we have a topic to discuss, use it
    else if (hasTopic && Math.random() > 0.5) {
        switch (currentMood) {
            case 'happy':
                response = getRandomResponse([
                    `Tell me more about ${randomTopic}. What aspects make you happy?`,
                    `I'd love to hear more about ${randomTopic}. What's going well with that?`,
                    `${randomTopic} seems important to you. How does it contribute to your positive feelings?`
                ]);
                break;
                
            case 'sad':
                response = getRandomResponse([
                    `I notice ${randomTopic} came up. How does that affect your mood?`,
                    `Would you like to talk more about ${randomTopic} and how it's impacting you?`,
                    `Tell me more about your experience with ${randomTopic}.`
                ]);
                break;
                
            default:
                response = getRandomResponse([
                    `I'd like to hear more about ${randomTopic}. What are your thoughts?`,
                    `Tell me more about ${randomTopic}.`,
                    `How do you feel about ${randomTopic}?`
                ]);
        }
    }
    // Otherwise, respond based on mood
    else {
        switch (currentMood) {
            case 'happy':
                response = getRandomResponse([
                    "You seem to be in a positive state. What's contributing to that?",
                    "I notice positive emotions. What's bringing you joy right now?",
                    "What's been making you happy lately?"
                ]);
                break;
                
            case 'sad':
                response = getRandomResponse([
                    "I sense some sadness. What's been on your mind?",
                    "Would you like to talk about what's troubling you?",
                    "Sometimes sharing difficult feelings can help. What's going on?"
                ]);
                break;
                
            default:
                response = getRandomResponse([
                    "How have things been going for you lately?",
                    "What's been most on your mind today?",
                    "Is there something specific you'd like to explore in our conversation?"
                ]);
        }
    }
    
    // Avoid repeating the last response
    if (response === lastResponse) {
        // Try again with a different response
        return generateContextualResponse(userText, currentMood);
    }
    
    // Store this response to avoid repetition
    lastResponse = response;
    
    // Send the response
    addSystemMessage(response);
}

// Get a random response from options
function getRandomResponse(options) {
    return options[Math.floor(Math.random() * options.length)];
}

// Start listening for speech
function startListening() {
    if (!recognition) {
        const initialized = initSpeechRecognition();
        if (!initialized) return;
    }
    
    if (!isListening) {
        try {
            recognition.start();
            console.log('Started listening');
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            
            // If already started, stop and restart
            if (error.name === 'InvalidStateError') {
                recognition.stop();
                setTimeout(() => {
                    if (sessionActive) {
                        recognition.start();
                    }
                }, 500);
            }
        }
    }
}

// Stop listening for speech
function stopListening() {
    if (recognition && isListening) {
        try {
            recognition.stop();
            console.log('Stopped listening');
        } catch (error) {
            console.error('Error stopping speech recognition:', error);
        }
    }
}

// Speak text using speech synthesis
function speakText(text) {
    if (!text) return;
    
    try {
        console.log('Speaking text:', text);
        
        // Force enable speech synthesis
        window.speechSynthesisEnabled = true;
        
        // Cancel any ongoing speech to prevent overlapping
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
        
        // Clear any pending speech in the queue
        if (window.speechQueue) {
            window.speechQueue = [];
        } else {
            window.speechQueue = [];
        }
        
        // Reset speaking state
        window.isSpeaking = false;
        
        // Create utterance
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set voice if available
        if (window.speechSynthesis.getVoices().length > 0) {
            setVoice(utterance, window.speechSynthesis.getVoices());
        } else {
            // If voices aren't loaded yet, wait for them
            window.speechSynthesis.onvoiceschanged = () => {
                setVoice(utterance, window.speechSynthesis.getVoices());
            };
        }
        
        // Set properties
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Speak directly
        window.speechSynthesis.speak(utterance);
    } catch (error) {
        console.error('Error with speech synthesis:', error);
        // Continue without speaking
    }
}

// Process speech queue - No longer needed but kept for compatibility
function processSpeechQueue() {
    // This function is now simplified since we're speaking directly
    window.isSpeaking = false;
}

// Set a good voice for the utterance
function setVoice(utterance, voices) {
    // Try to find a good English voice
    const preferredVoices = [
        'Google UK English Female',
        'Microsoft Libby Online (Natural)',
        'Microsoft Zira Desktop',
        'Samantha',
        'Alex'
    ];
    
    // Look for preferred voices
    for (const name of preferredVoices) {
        const voice = voices.find(v => v.name === name);
        if (voice) {
            utterance.voice = voice;
            return;
        }
    }
    
    // Fallback to any English voice
    const englishVoice = voices.find(v => v.lang.startsWith('en-'));
    if (englishVoice) {
        utterance.voice = englishVoice;
    }
}

// Toggle speech output
function toggleSpeech() {
    window.speechSynthesisEnabled = !window.speechSynthesisEnabled;
    const toggleButton = document.getElementById('toggle-voice');
    const toggleText = document.getElementById('voice-toggle-text');
    
    if (window.speechSynthesisEnabled) {
        toggleButton.innerHTML = '<i class="fas fa-volume-up"></i> <span id="voice-toggle-text">Mute Voice</span>';
        toggleText.textContent = 'Mute Voice';
        console.log('Voice responses enabled');
    } else {
        toggleButton.innerHTML = '<i class="fas fa-volume-mute"></i> <span id="voice-toggle-text">Enable Voice</span>';
        toggleText.textContent = 'Enable Voice';
        console.log('Voice responses disabled');
        
        // Clear speech queue and stop speaking
        window.speechQueue = [];
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
        window.isSpeaking = false;
    }
}

// Start a new session
function startSession() {
    sessionActive = true;
    lastInteractionTime = Date.now();
    lastEmotionAnalysisTime = Date.now();
    conversationStage = 'initial';
    userReportedMood = null;
    hasAskedAboutMood = false;
    lastResponse = '';
    conversationTopics = [];
    
    // Update UI
    const startSessionButton = document.getElementById('start-session');
    const endSessionButton = document.getElementById('end-session');
    
    if (startSessionButton) startSessionButton.classList.add('hidden');
    if (endSessionButton) endSessionButton.classList.remove('hidden');
    
    // Welcome message and initial prompt
    addSystemMessage("Welcome! I'll analyze your emotions through our conversation and facial expressions.");
    
    // Prompt to start camera if not already running
    setTimeout(() => {
        if (!isRunning) {
            addSystemMessage("Please start the camera and tell me about your day.");
        } else {
            addSystemMessage("How has your day been going?");
        }
    }, 1500);
    
    // Start periodic emotion analysis
    startPeriodicEmotionAnalysis();
}

// End the current session
function endSession() {
    sessionActive = false;
    
    // Stop listening
    stopListening();
    
    // Update UI
    const startSessionButton = document.getElementById('start-session');
    const endSessionButton = document.getElementById('end-session');
    
    if (startSessionButton) startSessionButton.classList.remove('hidden');
    if (endSessionButton) endSessionButton.classList.add('hidden');
    
    // Generate final report
    addSystemMessage("Thank you for this session. Here's your emotional analysis report:");
    
    setTimeout(() => {
        // Use the Full Emotional Analysis Report instead of the Comprehensive Emotional Analysis Report
        if (typeof window.generateFullReport === 'function') {
            console.log('SPEECH-HANDLER.JS: Using Full Emotional Analysis Report for end of session');
            window.generateFullReport(true); // Pass true to indicate end of session
        } else {
            console.log('SPEECH-HANDLER.JS: Full Emotional Analysis Report not available, using fallback');
            generateAndDisplaySessionReport(true);
        }
    }, 1000);
    
    // Clear any periodic analysis
    if (window.emotionAnalysisInterval) {
        clearInterval(window.emotionAnalysisInterval);
        window.emotionAnalysisInterval = null;
    }
}

/**
 * Generate and display the session report
 * @param {boolean} isEndOfSession - Whether this is an end-of-session report
 */
function generateAndDisplaySessionReport(isEndOfSession = false) {
    try {
        console.log('SPEECH-HANDLER.JS: Generating session report...');
        
        // Check which report generation function is available
        let reportHtml;
        
        // First try the conversation-analysis.js implementation
        if (typeof window.generateComprehensiveReport === 'function') {
            console.log('SPEECH-HANDLER.JS: Using window.generateComprehensiveReport (from conversation-analysis.js)');
            
            // Force a direct call to the conversation-analysis.js implementation
            const conversationAnalysisImpl = window.generateComprehensiveReport;
            reportHtml = conversationAnalysisImpl(isEndOfSession);
            
            console.log('SPEECH-HANDLER.JS: Report HTML length:', reportHtml ? reportHtml.length : 0);
            console.log('SPEECH-HANDLER.JS: Report HTML preview:', reportHtml ? reportHtml.substring(0, 100) : 'null');
        } 
        // Then try the main.js implementation (which should now delegate to conversation-analysis.js)
        else if (typeof generateComprehensiveReport === 'function') {
            console.log('SPEECH-HANDLER.JS: Using local generateComprehensiveReport (from main.js)');
            reportHtml = generateComprehensiveReport(isEndOfSession);
        }
        // If neither is available, show an error
        else {
            console.error('SPEECH-HANDLER.JS: Report generation function not found');
            addSystemMessage("I couldn't generate a report. The report generation function is not available.");
            return;
        }
        
        if (!reportHtml) {
            console.error('SPEECH-HANDLER.JS: Report generation failed - empty report');
            addSystemMessage("I couldn't generate a complete report. There might not be enough data yet.");
            return;
        }
        
        console.log('SPEECH-HANDLER.JS: Report generated successfully, length:', reportHtml.length);
        console.log('SPEECH-HANDLER.JS: First 100 chars of report:', reportHtml.substring(0, 100));
        
        // Remove any existing report modal
        const existingModal = document.querySelector('.report-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create a modal for the report
        const reportModal = document.createElement('div');
        reportModal.className = 'report-modal';
        
        // Create modal content
        reportModal.innerHTML = `
            <div class="report-modal-content">
                <div class="report-modal-header">
                    <h2>${isEndOfSession ? 'Session Summary Report' : 'Comprehensive Emotional Analysis Report'}</h2>
                    <button class="report-close-btn">&times;</button>
                </div>
                <div class="report-modal-body">
                    ${reportHtml}
                </div>
                <div class="report-modal-footer">
                    <button class="report-print-btn">Print Report</button>
                    <button class="report-close-btn-bottom">Close</button>
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(reportModal);
        
        // Add event listeners for close buttons
        const closeButtons = reportModal.querySelectorAll('.report-close-btn, .report-close-btn-bottom');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                reportModal.remove();
            });
        });
        
        // Add event listener for print button
        const printButton = reportModal.querySelector('.report-print-btn');
        if (printButton) {
            printButton.addEventListener('click', () => {
                // Create a new window for printing
                const printWindow = window.open('', '_blank');
                
                // Add content to the new window
                printWindow.document.write(`
                    <html>
                    <head>
                        <title>Emotional Analysis Report</title>
                        <link rel="stylesheet" href="/static/css/report-styles.css">
                        <style>
                            body { font-family: Arial, sans-serif; padding: 20px; }
                            .print-header { text-align: center; margin-bottom: 20px; }
                            @media print {
                                .no-print { display: none; }
                                button { display: none; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="print-header">
                            <h1>${isEndOfSession ? 'Session Summary Report' : 'Comprehensive Emotional Analysis Report'}</h1>
                            <p>Generated on ${new Date().toLocaleString()}</p>
                        </div>
                        ${reportHtml}
                        <div class="no-print" style="margin-top: 30px; text-align: center;">
                            <button onclick="window.print()">Print</button>
                            <button onclick="window.close()">Close</button>
                        </div>
                    </body>
                    </html>
                `);
                
                // Focus the new window
                printWindow.document.close();
                printWindow.focus();
            });
        }
    } catch (error) {
        console.error('Error generating report:', error);
        addSystemMessage("I encountered an error while generating the report. Please try again later.");
    }
}

// Start periodic emotion analysis
function startPeriodicEmotionAnalysis() {
    // Clear any existing interval
    if (window.emotionAnalysisInterval) {
        clearInterval(window.emotionAnalysisInterval);
    }
    
    // Set up new interval to analyze emotions every 20 seconds
    window.emotionAnalysisInterval = setInterval(() => {
        if (!sessionActive) return;
        
        const currentTime = Date.now();
        // Only analyze if it's been at least 20 seconds since the last analysis
        if (currentTime - lastEmotionAnalysisTime >= emotionAnalysisInterval) {
            lastEmotionAnalysisTime = currentTime;
            
            // Get the averaged emotion data from the last 20 seconds
            if (typeof getAveragedEmotions === 'function') {
                const averagedEmotions = getAveragedEmotions();
                if (averagedEmotions) {
                    // Update the UI with the averaged emotions
                    updateWithAveragedEmotions(averagedEmotions);
                }
            }
        }
    }, 5000); // Check every 5 seconds, but only update if 20 seconds have passed
}

// Update with averaged emotions
function updateWithAveragedEmotions(averagedEmotions) {
    // Update the UI with the averaged emotions
    if (typeof updateMoodIndicator === 'function') {
        updateMoodIndicator(averagedEmotions);
    }
    
    // Update the chart
    if (typeof updateMoodChart === 'function') {
        updateMoodChart(averagedEmotions);
    }
    
    // Update the insights
    if (typeof updateMoodInsights === 'function') {
        updateMoodInsights();
    }
    
    // Send to server for Bayesian update
    if (typeof updateWithCameraData === 'function') {
        updateWithCameraData(averagedEmotions);
    }
}

// Override the addSystemMessage function to include speech
const originalAddSystemMessage = window.addSystemMessage;
window.addSystemMessage = function(text) {
    // Call the original function
    if (originalAddSystemMessage) {
        originalAddSystemMessage(text);
    } else {
        // If the original function isn't available yet, create a message element
        const chatMessages = document.getElementById('chat-messages');
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'system-message');
        messageElement.textContent = text;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Speak the text
    speakText(text);
};

// Enable voice
function enableVoice() {
    try {
        console.log('Enabling voice...');
        window.speechSynthesisEnabled = true;
        
        // Update UI
        const toggleVoiceButton = document.getElementById('toggle-voice');
        const voiceToggleText = document.getElementById('voice-toggle-text');
        
        if (toggleVoiceButton && voiceToggleText) {
            toggleVoiceButton.classList.add('active');
            voiceToggleText.textContent = 'Mute Voice';
        }
        
        // Initialize speech synthesis if needed
        if (typeof window.speechSynthesis === 'undefined') {
            console.warn('Speech synthesis not supported in this browser');
            return;
        }
        
        // Ensure speech synthesis is ready by making a dummy call
        const testUtterance = new SpeechSynthesisUtterance('');
        window.speechSynthesis.speak(testUtterance);
        
        console.log('Voice enabled successfully');
    } catch (error) {
        console.error('Error enabling voice:', error);
    }
} 