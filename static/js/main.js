/**
 * Main JavaScript file for Bayesian Mood Buddy
 * Initializes and connects all components
 */

// Global variables
let sessionTimer = null;
let sessionStartTime = null;
let sessionDuration = 0;

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing application...');
    
    // Initialize the mood chart
    initMoodChart();
    console.log('Mood chart initialized');
    
    // Add event listeners for session controls
    const startSessionButton = document.getElementById('start-session');
    const endSessionButton = document.getElementById('end-session');
    
    startSessionButton.addEventListener('click', function() {
        console.log('Start session button clicked');
        startSession();
        updateSessionUI(true);
        startSessionTimer();
    });
    
    endSessionButton.addEventListener('click', function() {
        console.log('End session button clicked');
        endSession();
        updateSessionUI(false);
        stopSessionTimer();
    });
    
    // Add event listener for Generate Full Report button
    const generateFullReportButton = document.getElementById('generate-full-report');
    if (generateFullReportButton) {
        generateFullReportButton.addEventListener('click', function() {
            console.log('Generate Full Report button clicked');
            generateFullReport();
        });
    }
    
    // Add event listeners for camera controls
    const startCameraButton = document.getElementById('start-camera');
    const stopCameraButton = document.getElementById('stop-camera');
    
    startCameraButton.addEventListener('click', async function() {
        console.log('Start camera button clicked');
        startCameraButton.disabled = true; // Disable button during initialization
        startCameraButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
        
        const success = await startCamera();
        
        if (success) {
            startCameraButton.disabled = true;
            stopCameraButton.disabled = false;
            console.log('Camera started successfully');
        } else {
            startCameraButton.disabled = false;
            startCameraButton.innerHTML = '<i class="fas fa-play"></i> Start Camera';
            console.log('Failed to start camera');
        }
    });
    
    stopCameraButton.addEventListener('click', function() {
        console.log('Stop camera button clicked');
        stopCamera();
        startCameraButton.disabled = false;
        startCameraButton.innerHTML = '<i class="fas fa-play"></i> Start Camera';
        stopCameraButton.disabled = true;
        console.log('Camera stopped');
    });
    
    // Initially disable stop button
    stopCameraButton.disabled = true;
    
    // Add event listeners for text input
    const textInput = document.getElementById('text-input');
    const sendButton = document.getElementById('send-button');
    
    function handleTextSubmit() {
        const text = textInput.value.trim();
        if (text) {
            console.log('Sending text for analysis:', text);
            processUserInput(text);
            textInput.value = '';
        }
    }
    
    sendButton.addEventListener('click', handleTextSubmit);
    
    textInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            handleTextSubmit();
        }
    });
    
    // Add event listeners for voice controls
    const startVoiceButton = document.getElementById('start-voice');
    const stopVoiceButton = document.getElementById('stop-voice');
    const toggleVoiceButton = document.getElementById('toggle-voice');
    
    startVoiceButton.addEventListener('click', function() {
        console.log('Start voice button clicked');
        startListening();
    });
    
    stopVoiceButton.addEventListener('click', function() {
        console.log('Stop voice button clicked');
        stopListening();
    });
    
    toggleVoiceButton.addEventListener('click', function() {
        console.log('Toggle voice button clicked');
        toggleSpeech();
    });
    
    // Add event listeners for mood correction
    const correctMoodButton = document.getElementById('correct-mood');
    const correctionOptions = document.getElementById('correction-options');
    const cancelCorrectionButton = document.getElementById('cancel-correction');
    
    correctMoodButton.addEventListener('click', function() {
        console.log('Correct mood button clicked');
        correctionOptions.classList.remove('hidden');
    });
    
    cancelCorrectionButton.addEventListener('click', function() {
        console.log('Cancel correction button clicked');
        correctionOptions.classList.add('hidden');
    });
    
    // Add event listeners for mood buttons
    const moodButtons = document.querySelectorAll('.mood-btn');
    moodButtons.forEach(button => {
        button.addEventListener('click', function() {
            const mood = this.getAttribute('data-mood');
            console.log(`Mood button clicked: ${mood}`);
            correctMood(mood);
        });
    });
    
    // Add event listener for reset button
    const resetButton = document.getElementById('reset-system');
    resetButton.addEventListener('click', function() {
        console.log('Reset button clicked');
        resetSystem();
    });
    
    // Hide the Generate Report button as it's no longer needed
    const generateReportButton = document.getElementById('generate-report');
    if (generateReportButton) {
        generateReportButton.style.display = 'none';
    }
    
    // Remove the proactive mode toggle button from the UI
    const toggleProactiveButton = document.getElementById('toggle-proactive');
    if (toggleProactiveButton) {
        toggleProactiveButton.style.display = 'none';
    }
    
    // Initialize speech recognition
    initSpeechRecognition();
    
    // Set up periodic updates for emotion statistics
    setInterval(updateEmotionStats, 30000); // Update every 30 seconds
    
    // Welcome message
    setTimeout(() => {
        addSystemMessage("Welcome! I'll analyze your emotions through our conversation and facial expressions. To get started, click 'Start Session' and enable your camera. You can speak to me by pressing the microphone button or typing in the chat box.");
    }, 1000);
    
    // Initialize UI
    initializeUI();
});

// Start session timer
function startSessionTimer() {
    sessionStartTime = Date.now();
    sessionDuration = 0;
    updateSessionTime();
    
    sessionTimer = setInterval(updateSessionTime, 1000);
}

// Stop session timer
function stopSessionTimer() {
    if (sessionTimer) {
        clearInterval(sessionTimer);
        sessionTimer = null;
    }
}

// Update session time display
function updateSessionTime() {
    if (!sessionStartTime) return;
    
    const currentTime = Date.now();
    sessionDuration = Math.floor((currentTime - sessionStartTime) / 1000);
    
    const minutes = Math.floor(sessionDuration / 60);
    const seconds = sessionDuration % 60;
    
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const sessionTimeElement = document.getElementById('session-time');
    if (sessionTimeElement) {
        sessionTimeElement.textContent = timeString;
    }
}

// Update session UI
function updateSessionUI(active) {
    const sessionIndicator = document.getElementById('session-indicator');
    
    if (active) {
        sessionIndicator.textContent = 'Session Active';
        sessionIndicator.classList.remove('inactive');
        sessionIndicator.classList.add('active');
    } else {
        sessionIndicator.textContent = 'Session Inactive';
        sessionIndicator.classList.remove('active');
        sessionIndicator.classList.add('inactive');
    }
}

// Update emotion stats display
function updateEmotionStats() {
    // Only update if we have emotion history
    if (typeof getEmotionSummary !== 'function') return;
    
    const summary = getEmotionSummary();
    
    // Update stats display
    const stabilityElement = document.getElementById('emotion-stability');
    const trendElement = document.getElementById('emotion-trend');
    const confidenceElement = document.getElementById('emotion-confidence');
    
    if (stabilityElement) stabilityElement.textContent = summary.stability || 'Unknown';
    if (trendElement) trendElement.textContent = summary.trend || 'Unknown';
    if (confidenceElement) confidenceElement.textContent = summary.confidence || 'Low';
}

// Generate comprehensive report
function generateComprehensiveReport(isEndOfSession = false) {
    console.log('MAIN.JS: generateComprehensiveReport called, delegating to conversation-analysis.js implementation');
    
    // Check if the conversation-analysis.js implementation is available
    if (typeof window.generateComprehensiveReport === 'function' && 
        window.generateComprehensiveReport !== generateComprehensiveReport) {
        console.log('MAIN.JS: Delegating to window.generateComprehensiveReport');
        return window.generateComprehensiveReport(isEndOfSession);
    }
    
    console.warn('MAIN.JS: window.generateComprehensiveReport not available, using fallback');
    
    // Fallback implementation - just return a message directing to use the conversation-analysis.js implementation
    return `
        <div class="report-section">
            <h3>Report Generation Error</h3>
            <p>The enhanced report from conversation-analysis.js is not available.</p>
            <p>Please check the console for errors and ensure that conversation-analysis.js is loaded before main.js.</p>
        </div>
    `;
}

// Update mood insights based on current posterior
function updateMoodInsights() {
    const insightElement = document.getElementById('mood-insight');
    if (!insightElement) return;
    
    // Get current posterior if available
    let currentMood = 'neutral';
    let currentPosterior = null;
    
    try {
        if (moodChart && moodChart.data && moodChart.data.datasets[0].data) {
            const data = moodChart.data.datasets[0].data;
            currentPosterior = {
                happy: data[0],
                neutral: data[1],
                sad: data[2]
            };
            
            // Find dominant mood
            let maxProb = 0;
            for (const mood in currentPosterior) {
                if (currentPosterior[mood] > maxProb) {
                    maxProb = currentPosterior[mood];
                    currentMood = mood;
                }
            }
        }
    } catch (error) {
        console.error('Error getting current mood:', error);
    }
    
    // Generate insight based on mood
    let insight = '';
    switch (currentMood) {
        case 'happy':
            insight = getRandomInsight([
                "Your positive emotional state is being detected through both visual and linguistic cues.",
                "The Bayesian model is detecting strong signals of positive emotion.",
                "Your happiness is reflected in both your expressions and language patterns.",
                "The probability distribution is showing a strong bias toward positive emotions.",
                "I'm detecting consistent patterns of positive emotional expression."
            ]);
            break;
            
        case 'neutral':
            insight = getRandomInsight([
                "Your emotional signals are currently balanced across the spectrum.",
                "The Bayesian model is detecting a relatively neutral emotional state.",
                "Your expressions and language are showing moderate emotional intensity.",
                "The probability distribution is fairly evenly distributed across emotional states.",
                "I'm detecting a balanced pattern of emotional expression."
            ]);
            break;
            
        case 'sad':
            insight = getRandomInsight([
                "I'm detecting signals that suggest you might be experiencing some negative emotions.",
                "The Bayesian model is indicating a higher probability of sadness in your expressions.",
                "Your emotional patterns are showing some signs of negative valence.",
                "The probability distribution is currently weighted toward the sad emotional state.",
                "I'm here to listen if you'd like to talk about what's on your mind."
            ]);
            break;
            
        default:
            insight = "I'll analyze your emotions through facial expressions and conversation. Try starting the camera and chatting with me.";
    }
    
    insightElement.textContent = insight;
}

// Get a random insight from an array of options
function getRandomInsight(options) {
    const index = Math.floor(Math.random() * options.length);
    return options[index];
}

// Function to check if models directory exists
async function createModelsDirectory() {
    try {
        // Check if models directory exists
        const response = await fetch('/static/models/tiny_face_detector_model-weights_manifest.json', {
            method: 'HEAD'
        });
        
        if (response.ok) {
            console.log('Face detection models already exist');
            return true;
        } else {
            console.log('Face detection models not found');
            addSystemMessage('Face detection models not found. Please run the download_models.py script first.');
            return false;
        }
    } catch (error) {
        console.error('Error checking for face detection models:', error);
        addSystemMessage('Error checking for face detection models. Please run the download_models.py script first.');
        return false;
    }
}

// Start session
function startSession() {
    try {
        console.log('Starting session...');
        
        // Reset any previous session data
        if (typeof clearConversationData === 'function') {
            clearConversationData();
        }
        
        // Reset AI conversation history
        if (typeof resetAIConversationHistory === 'function') {
            resetAIConversationHistory();
        }
        
        // Update UI to show session is active
        updateSessionUI(true);
        
        // Start session timer
        startSessionTimer();
        
        // Initialize speech variables
        window.speechSynthesisEnabled = true;
        window.speechQueue = window.speechQueue || [];
        window.isSpeaking = window.isSpeaking || false;
        
        // Force enable voice immediately
        console.log('Enabling voice...');
        
        // Initialize speech synthesis
        if (typeof window.speechSynthesis !== 'undefined') {
            // Ensure speech synthesis is ready by making a dummy call
            const testUtterance = new SpeechSynthesisUtterance('');
            window.speechSynthesis.speak(testUtterance);
        }
        
        // Update UI to show voice is enabled
        const toggleVoiceButton = document.getElementById('toggle-voice');
        const voiceToggleText = document.getElementById('voice-toggle-text');
        
        if (toggleVoiceButton && voiceToggleText) {
            toggleVoiceButton.classList.add('active');
            voiceToggleText.textContent = 'Mute Voice';
        }
        
        // Add a simple welcome message
        const welcomeMessage = "Hi there! How are you feeling today?";
        
        // Add system message
        if (typeof addSystemMessage === 'function') {
            addSystemMessage(welcomeMessage);
        }
        
        // Speak the welcome message immediately
        if (typeof speakText === 'function') {
            console.log('Speaking welcome message...');
            speakText(welcomeMessage);
        }
        
        // Show the end session button
        const startSessionButton = document.getElementById('start-session');
        const endSessionButton = document.getElementById('end-session');
        
        if (startSessionButton && endSessionButton) {
            startSessionButton.classList.add('hidden');
            endSessionButton.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error starting session:', error);
    }
}

// End session
function endSession() {
    // Stop camera if running
    if (isRunning) {
        stopCamera();
    }
    
    // Stop speech recognition if running
    if (typeof isListening !== 'undefined' && isListening) {
        stopListening();
    }
    
    // Stop session timer
    stopSessionTimer();
    
    // Update UI to show session is inactive
    updateSessionUI(false);
    
    // Hide end session button, show start session button
    const startSessionButton = document.getElementById('start-session');
    const endSessionButton = document.getElementById('end-session');
    
    if (startSessionButton && endSessionButton) {
        startSessionButton.classList.remove('hidden');
        endSessionButton.classList.add('hidden');
    }
    
    // Generate comprehensive report
    generateAndDisplayReport();
    
    // Add a simple closing message
    const closingMessage = "Thanks for chatting with me. I've prepared an emotional analysis report for you.";
    
    // Add system message
    if (typeof addSystemMessage === 'function') {
        addSystemMessage(closingMessage);
    }
    
    // Speak the closing message
    if (typeof speakText === 'function') {
        speakText(closingMessage);
    }
}

// Generate and display the comprehensive report
function generateAndDisplayReport() {
    try {
        console.log('MAIN.JS: generateAndDisplayReport called');
        
        // Use the new function from speech-handler.js if available
        if (typeof generateAndDisplaySessionReport === 'function') {
            console.log('MAIN.JS: Using generateAndDisplaySessionReport from speech-handler.js');
            generateAndDisplaySessionReport(false);
            return;
        }
        
        // Check if the conversation-analysis.js implementation is available directly
        if (typeof window.generateComprehensiveReport === 'function' && 
            window.generateComprehensiveReport !== generateComprehensiveReport) {
            console.log('MAIN.JS: Using window.generateComprehensiveReport directly');
            const reportHtml = window.generateComprehensiveReport(false);
            displayReport(reportHtml);
            return;
        }
        
        // Fallback to the local implementation (which now delegates to conversation-analysis.js)
        console.log('MAIN.JS: Using local generateComprehensiveReport (which delegates)');
        const reportHtml = generateComprehensiveReport(false);
        
        if (!reportHtml) {
            console.error('MAIN.JS: Report generation failed - empty report');
            addSystemMessage("I couldn't generate a complete report. There might not be enough data yet.");
            return;
        }
        
        displayReport(reportHtml);
    } catch (error) {
        console.error('MAIN.JS: Error generating report:', error);
        addSystemMessage("I encountered an error while generating the report. Please try again later.");
    }
}

// Display the report in a modal
function displayReport(reportHtml) {
    if (!reportHtml) {
        console.error('No report HTML to display');
        return;
    }
    
    console.log('Report generated successfully');
    
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
                <h2>Comprehensive Emotional Analysis Report</h2>
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
                        <h1>Comprehensive Emotional Analysis Report</h1>
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
}

// Add a function to initialize the UI
function initializeUI() {
    // The old Generate Report button has been removed
    // The Generate Full Report button is now added directly in the HTML
    console.log('MAIN.JS: UI initialized');
}

// Export functions for use in other modules
// Don't export generateComprehensiveReport to avoid conflicts with conversation-analysis.js
// window.generateComprehensiveReport = generateComprehensiveReport;
window.generateAndDisplayReport = generateAndDisplayReport;

// Log that the main.js exports are ready
console.log('MAIN.JS: Exports ready, generateComprehensiveReport is NOT exported to window object');

// Generate a full report using the conversation-analysis.js implementation directly
function generateFullReport(isEndOfSession = false) {
    console.log('MAIN.JS: Generating full report...');
    
    try {
        let reportHtml = '';
        
        // Try to use our direct report generator first
        if (typeof window.directGenerateReport === 'function') {
            console.log('MAIN.JS: Using direct report generator from direct-report.js');
            try {
                reportHtml = window.directGenerateReport(isEndOfSession);
                console.log(`MAIN.JS: Direct report HTML length: ${reportHtml.length}`);
                if (reportHtml.length > 100) {
                    console.log(`MAIN.JS: Direct report HTML preview: ${reportHtml.substring(0, 100)}...`);
                }
            } catch (directError) {
                console.error('MAIN.JS: Error using direct report generator:', directError);
                reportHtml = `
                    <div class="comprehensive-report">
                        <div class="report-section">
                            <h3>Report Generation Error</h3>
                            <p>An error occurred while generating the report.</p>
                            <p>Please try again after having a conversation.</p>
                        </div>
                    </div>
                `;
            }
        } 
        // If direct report failed or is not available, try conversation-analysis.js implementation
        if (!reportHtml || reportHtml.length < 200) {
            if (typeof window._conversationAnalysisReport === 'function') {
                console.log('MAIN.JS: Using _conversationAnalysisReport from conversation-analysis.js');
                try {
                    reportHtml = window._conversationAnalysisReport(isEndOfSession);
                } catch (convError) {
                    console.error('MAIN.JS: Error using conversation-analysis report:', convError);
                }
            }
            // Fallback to window.generateComprehensiveReport
            else if (typeof window.generateComprehensiveReport === 'function' && 
                    window.generateComprehensiveReport !== generateComprehensiveReport) {
                console.log('MAIN.JS: Using generateComprehensiveReport from conversation-analysis.js');
                try {
                    reportHtml = window.generateComprehensiveReport(isEndOfSession);
                } catch (genError) {
                    console.error('MAIN.JS: Error using window.generateComprehensiveReport:', genError);
                }
            }
            // Last resort - use local implementation
            else {
                console.log('MAIN.JS: Using local generateComprehensiveReport implementation');
                try {
                    reportHtml = generateComprehensiveReport(isEndOfSession);
                } catch (localError) {
                    console.error('MAIN.JS: Error using local generateComprehensiveReport:', localError);
                }
            }
        }
        
        if (!reportHtml || reportHtml.length < 50) {
            reportHtml = `
                <div class="comprehensive-report">
                    <div class="report-section">
                        <h3>Not Enough Data</h3>
                        <p>Please have a conversation before generating a report. The system needs to analyze your messages to provide meaningful insights.</p>
                        <p>Try typing a few messages in the chat box and then generate a report again.</p>
                    </div>
                </div>
            `;
        }
        
        console.log('MAIN.JS: Full report generated successfully, length:', reportHtml.length);
        displayFullReport(reportHtml);
    } catch (error) {
        console.error('MAIN.JS: Error generating full report:', error);
        
        // Display a user-friendly error message without mentioning the console
        const errorHtml = `
            <div class="comprehensive-report">
                <div class="report-section">
                    <h3>Not Enough Data</h3>
                    <p>Please have a conversation before generating a report. The system needs to analyze your messages to provide meaningful insights.</p>
                    <p>Try typing a few messages in the chat box and then generate a report again.</p>
                </div>
            </div>
        `;
        displayFullReport(errorHtml);
    }
}

// Display a full report in a modal
function displayFullReport(reportHtml) {
    if (!reportHtml) {
        console.error('MAIN.JS: No report HTML to display');
        addSystemMessage("I couldn't generate a full report. No report content available.");
        return;
    }
    
    console.log('MAIN.JS: Full report generated successfully, length:', reportHtml.length);
    
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
                <h2>Full Emotional Analysis Report</h2>
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
                    <title>Full Emotional Analysis Report</title>
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
                        <h1>Full Emotional Analysis Report</h1>
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
}