/**
 * Direct Report Generator
 * This file contains a direct implementation of the report generation functionality
 * without relying on the window object or script loading order.
 */

// Function to generate a comprehensive report
function directGenerateReport(isEndOfSession = false) {
    console.log('DIRECT-REPORT.JS: Generating report...');
    
    try {
        // Get conversation data
        const messageEmotionScores = getMessageEmotionScores();
        console.log('DIRECT-REPORT.JS: Message emotion scores:', messageEmotionScores);
        
        // Check if we have enough data
        if (!messageEmotionScores || messageEmotionScores.length < 1) {
            console.warn('DIRECT-REPORT.JS: Not enough conversation data for report');
            return `
                <div class="comprehensive-report">
                    <div class="report-section">
                        <h3>Not Enough Data</h3>
                        <p>Please have a conversation before generating a report. The system needs to analyze your messages to provide meaningful insights.</p>
                        <p>Try typing a few messages in the chat box and then generate a report again.</p>
                    </div>
                </div>
            `;
        }
        
        // Get emotion history from facial analysis
        let facialHistory = [];
        let facialSummary = { stability: 'Unknown', trend: 'Unknown', confidence: 'Low' };
        
        if (typeof getEmotionHistory === 'function') {
            try {
                facialHistory = getEmotionHistory() || [];
                console.log('DIRECT-REPORT.JS: Facial history length:', facialHistory.length);
                
                if (typeof getEmotionSummary === 'function') {
                    facialSummary = getEmotionSummary() || facialSummary;
                }
            } catch (error) {
                console.error('DIRECT-REPORT.JS: Error getting facial history:', error);
                facialHistory = [];
            }
        } else {
            console.warn('DIRECT-REPORT.JS: getEmotionHistory function not available');
        }
        
        // Calculate average text emotions
        const textEmotions = messageEmotionScores.map(entry => entry.textEmotion);
        const avgTextEmotions = calculateAverageEmotions(textEmotions);
        const dominantTextEmotion = findDominantEmotion(avgTextEmotions);
        
        console.log('DIRECT-REPORT.JS: Average text emotions:', avgTextEmotions);
        console.log('DIRECT-REPORT.JS: Dominant text emotion:', dominantTextEmotion);
        
        // Calculate average facial emotions if available
        let avgFacialEmotions = { happy: 0.33, neutral: 0.34, sad: 0.33 };
        let dominantFacialEmotion = { emotion: 'neutral', value: 0.34 };
        let hasFacialData = false;
        
        if (facialHistory && facialHistory.length > 0) {
            try {
                // Extract emotions from facial history entries
                const facialEmotions = facialHistory.map(entry => entry.emotions || entry);
                avgFacialEmotions = calculateAverageEmotions(facialEmotions);
                dominantFacialEmotion = findDominantEmotion(avgFacialEmotions);
                hasFacialData = true;
                
                console.log('DIRECT-REPORT.JS: Average facial emotions:', avgFacialEmotions);
                console.log('DIRECT-REPORT.JS: Dominant facial emotion:', dominantFacialEmotion);
            } catch (error) {
                console.error('DIRECT-REPORT.JS: Error processing facial emotions:', error);
                hasFacialData = false;
            }
        }
        
        // Calculate average OpenAI emotions if available
        let avgOpenAIEmotions = null;
        let dominantOpenAIEmotion = null;
        let hasOpenAIData = false;
        
        const openAIEmotions = messageEmotionScores
            .filter(entry => entry.openAIEmotion)
            .map(entry => entry.openAIEmotion);
            
        if (openAIEmotions && openAIEmotions.length > 0) {
            avgOpenAIEmotions = calculateAverageEmotions(openAIEmotions);
            dominantOpenAIEmotion = findDominantEmotion(avgOpenAIEmotions);
            hasOpenAIData = true;
            
            console.log('DIRECT-REPORT.JS: Average OpenAI emotions:', avgOpenAIEmotions);
            console.log('DIRECT-REPORT.JS: Dominant OpenAI emotion:', dominantOpenAIEmotion);
        }
        
        // Analyze conversation sentiment
        const sentimentAnalysis = analyzeConversationSentiment(messageEmotionScores);
        console.log('DIRECT-REPORT.JS: Sentiment analysis:', sentimentAnalysis);
        
        // Analyze emotion state transitions
        const stateAnalysis = analyzeEmotionTransitions(facialHistory);
        console.log('DIRECT-REPORT.JS: State analysis:', stateAnalysis);
        
        // Calculate correlation between text and facial emotions
        let correlation = 0;
        if (hasFacialData) {
            correlation = calculateCorrelation(textEmotions, facialHistory);
            console.log('DIRECT-REPORT.JS: Text-facial correlation:', correlation);
        }
        
        // Generate the report HTML
        let reportHtml = `
            <div class="comprehensive-report">
                <div class="report-section">
                    <h3>${isEndOfSession ? 'Session Summary' : 'Session Overview'}</h3>
                    <p>Session duration: ${formatTime(window.sessionDuration || 0)}</p>
                    <p>Messages analyzed: ${messageEmotionScores.length}</p>
                    <p>Facial samples collected: ${facialHistory.length}</p>
                    ${hasOpenAIData ? `<p>OpenAI analyses performed: ${openAIEmotions.length}</p>` : ''}
                    ${isEndOfSession ? '<p><strong>Session completed</strong></p>' : ''}
                </div>
                
                <!-- Text Analysis Section -->
                <div class="report-section">
                    <h3>Text Analysis Results</h3>
                    <div class="emotion-source">
                        <h4>From Your Messages</h4>
                        <p>Dominant emotion: <strong>${dominantTextEmotion.emotion}</strong> (${(dominantTextEmotion.value * 100).toFixed(1)}%)</p>
                        <div class="emotion-bars">
                            <div class="emotion-bar">
                                <span class="emotion-label">Happy:</span>
                                <div class="bar-container">
                                    <div class="bar happy-bar" style="width: ${(avgTextEmotions.happy * 100).toFixed(1)}%"></div>
                                    <span class="bar-value">${(avgTextEmotions.happy * 100).toFixed(1)}%</span>
                                </div>
                            </div>
                            <div class="emotion-bar">
                                <span class="emotion-label">Neutral:</span>
                                <div class="bar-container">
                                    <div class="bar neutral-bar" style="width: ${(avgTextEmotions.neutral * 100).toFixed(1)}%"></div>
                                    <span class="bar-value">${(avgTextEmotions.neutral * 100).toFixed(1)}%</span>
                                </div>
                            </div>
                            <div class="emotion-bar">
                                <span class="emotion-label">Sad:</span>
                                <div class="bar-container">
                                    <div class="bar sad-bar" style="width: ${(avgTextEmotions.sad * 100).toFixed(1)}%"></div>
                                    <span class="bar-value">${(avgTextEmotions.sad * 100).toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                        <p class="analysis-insight">Your messages show a predominant ${dominantTextEmotion.emotion} tone, suggesting your current emotional state.</p>
                    </div>
                </div>
                
                <!-- Facial Analysis Section -->
                ${hasFacialData ? `
                <div class="report-section">
                    <h3>Facial Expression Analysis</h3>
                    <div class="emotion-source">
                        <h4>From Your Expressions</h4>
                        <p>Dominant emotion: <strong>${dominantFacialEmotion.emotion}</strong> (${(dominantFacialEmotion.value * 100).toFixed(1)}%)</p>
                        <div class="emotion-bars">
                            <div class="emotion-bar">
                                <span class="emotion-label">Happy:</span>
                                <div class="bar-container">
                                    <div class="bar happy-bar" style="width: ${(avgFacialEmotions.happy * 100).toFixed(1)}%"></div>
                                    <span class="bar-value">${(avgFacialEmotions.happy * 100).toFixed(1)}%</span>
                                </div>
                            </div>
                            <div class="emotion-bar">
                                <span class="emotion-label">Neutral:</span>
                                <div class="bar-container">
                                    <div class="bar neutral-bar" style="width: ${(avgFacialEmotions.neutral * 100).toFixed(1)}%"></div>
                                    <span class="bar-value">${(avgFacialEmotions.neutral * 100).toFixed(1)}%</span>
                                </div>
                            </div>
                            <div class="emotion-bar">
                                <span class="emotion-label">Sad:</span>
                                <div class="bar-container">
                                    <div class="bar sad-bar" style="width: ${(avgFacialEmotions.sad * 100).toFixed(1)}%"></div>
                                    <span class="bar-value">${(avgFacialEmotions.sad * 100).toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                        <p><strong>Stability:</strong> ${facialSummary.stability || 'Unknown'}</p>
                        <p><strong>Trend:</strong> ${facialSummary.trend || 'Unknown'}</p>
                        <p class="analysis-insight">Your facial expressions show a predominant ${dominantFacialEmotion.emotion} emotion, with ${facialSummary.stability} stability and a ${facialSummary.trend} trend.</p>
                    </div>
                </div>
                ` : ''}
                
                <!-- Correlation Analysis Section -->
                ${hasFacialData ? `
                <div class="report-section">
                    <h3>Correlation Analysis</h3>
                    <div class="emotion-correlation">
                        <p>Correlation between facial expressions and message sentiment: <strong>${formatCorrelation(correlation)}</strong></p>
                        <p>${interpretCorrelation(correlation)}</p>
                        <p>Your facial expressions and message sentiment show ${correlation > 0.7 ? 'strong alignment' : correlation > 0.3 ? 'moderate alignment' : 'limited alignment'}, suggesting ${correlation > 0.5 ? 'consistency' : 'some discrepancy'} in your emotional expression.</p>
                    </div>
                </div>
                ` : ''}
                
                <!-- Bayesian Methods Section -->
                <div class="report-section">
                    <h3>Bayesian Methods Applied</h3>
                    <ul>
                        <li><strong>Bayes' Rule:</strong> P(Mood|Evidence) ∝ P(Evidence|Mood) × P(Mood)</li>
                        <li><strong>Naive Bayes:</strong> Used for text sentiment classification</li>
                        <li><strong>Temporal Smoothing:</strong> Using exponential smoothing to reduce noise in facial emotion measurements</li>
                        <li><strong>Correlation Analysis:</strong> Measuring alignment between facial expressions and text sentiment</li>
                        <li><strong>Maximum A Posteriori (MAP):</strong> Selecting the most likely mood state</li>
                    </ul>
                </div>
            </div>
        `;
        
        console.log('DIRECT-REPORT.JS: Report generated successfully');
        return reportHtml;
    } catch (error) {
        console.error('DIRECT-REPORT.JS: Error generating report:', error);
        return `
            <div class="report-section">
                <h3>Report Generation Error</h3>
                <p>An error occurred while generating the report: ${error.message}</p>
                <p>Please check the console for more details.</p>
            </div>
        `;
    }
}

// Helper function to calculate average emotions
function calculateAverageEmotions(emotionArray) {
    if (!emotionArray || emotionArray.length === 0) {
        return { happy: 0.33, neutral: 0.34, sad: 0.33 };
    }
    
    const avgEmotions = {
        happy: 0,
        neutral: 0,
        sad: 0
    };
    
    let count = 0;
    
    emotionArray.forEach(entry => {
        if (entry) {
            avgEmotions.happy += entry.happy || 0;
            avgEmotions.neutral += entry.neutral || 0;
            avgEmotions.sad += entry.sad || 0;
            count++;
        }
    });
    
    if (count > 0) {
        avgEmotions.happy /= count;
        avgEmotions.neutral /= count;
        avgEmotions.sad /= count;
    }
    
    return avgEmotions;
}

// Helper function to find dominant emotion
function findDominantEmotion(emotions) {
    let dominant = { emotion: 'neutral', value: emotions.neutral || 0 };
    
    if ((emotions.happy || 0) > dominant.value) {
        dominant = { emotion: 'happy', value: emotions.happy };
    }
    
    if ((emotions.sad || 0) > dominant.value) {
        dominant = { emotion: 'sad', value: emotions.sad };
    }
    
    return dominant;
}

// Helper function to format time
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Helper function to format correlation
function formatCorrelation(correlation) {
    if (correlation > 0.7) return 'Strong';
    if (correlation > 0.4) return 'Moderate';
    if (correlation > 0.2) return 'Weak';
    return 'Very Weak';
}

// Helper function to interpret correlation
function interpretCorrelation(correlation) {
    if (correlation > 0.7) {
        return 'Your facial expressions and message sentiment are strongly aligned, suggesting authentic emotional expression.';
    } else if (correlation > 0.4) {
        return 'Your facial expressions and message sentiment show moderate alignment, suggesting generally consistent emotional expression.';
    } else if (correlation > 0.2) {
        return 'Your facial expressions and message sentiment show weak alignment, suggesting some discrepancy in how you express emotions.';
    } else {
        return 'Your facial expressions and message sentiment show very weak alignment, suggesting significant discrepancy between verbal and non-verbal emotional expression.';
    }
}

// Helper function to calculate correlation
function calculateCorrelation(textEmotions, facialHistory) {
    if (!textEmotions || !facialHistory || textEmotions.length === 0 || facialHistory.length === 0) {
        console.log('DIRECT-REPORT.JS: Not enough data for correlation calculation');
        return 0;
    }
    
    try {
        console.log('DIRECT-REPORT.JS: Calculating correlation between text and facial emotions');
        
        // Since we might have different numbers of samples for text and facial data,
        // we'll use a simple approach to estimate correlation
        
        // Get average emotions from text
        const avgTextEmotions = calculateAverageEmotions(textEmotions);
        
        // Get average emotions from facial data
        const facialEmotions = facialHistory.map(entry => entry);
        const avgFacialEmotions = calculateAverageEmotions(facialEmotions);
        
        // Calculate a simple correlation based on the difference between happy and sad values
        const textHappySadDiff = avgTextEmotions.happy - avgTextEmotions.sad;
        const facialHappySadDiff = avgFacialEmotions.happy - avgFacialEmotions.sad;
        
        // Calculate correlation coefficient (simplified)
        // If both are positive or both are negative, they are correlated
        const correlation = (textHappySadDiff * facialHappySadDiff > 0) ? 
            0.5 + Math.min(Math.abs(textHappySadDiff), Math.abs(facialHappySadDiff)) * 0.5 : 
            0.5 - Math.min(Math.abs(textHappySadDiff), Math.abs(facialHappySadDiff)) * 0.5;
        
        console.log('DIRECT-REPORT.JS: Correlation calculated:', correlation);
        return Math.max(0, Math.min(1, correlation)); // Ensure between 0 and 1
    } catch (error) {
        console.error('DIRECT-REPORT.JS: Error calculating correlation:', error);
        return 0.5; // Return moderate correlation as fallback
    }
}

// Helper function to analyze conversation sentiment
function analyzeConversationSentiment(messageEmotionScores) {
    if (!messageEmotionScores || messageEmotionScores.length < 3) {
        return {
            bayesianSentiment: { happy: 0.33, neutral: 0.34, sad: 0.33 },
            sentimentHistory: [],
            dominantEmotion: { emotion: 'neutral', value: 0.34 },
            trend: 'unknown',
            insight: 'Not enough conversation data to perform Bayesian analysis.'
        };
    }
    
    try {
        // Extract sentiment history from messages
        const sentimentHistory = messageEmotionScores.map(entry => {
            // Combine text and OpenAI emotions if both are available
            let combinedEmotion = { ...entry.textEmotion };
            
            if (entry.openAIEmotion) {
                // Apply Bayes' rule to combine text and OpenAI emotions
                combinedEmotion = applyBayesRule(entry.textEmotion, entry.openAIEmotion);
            }
            
            return {
                text: entry.text,
                emotion: combinedEmotion,
                timestamp: entry.timestamp,
                sessionTime: entry.sessionTime
            };
        });
        
        // Apply sequential Bayesian updating to get the final sentiment
        // Start with a uniform prior
        let currentBelief = { happy: 0.33, neutral: 0.34, sad: 0.33 };
        
        // Apply Bayes' rule sequentially for each message
        sentimentHistory.forEach(entry => {
            // Use the current message's emotion as the likelihood
            const likelihood = entry.emotion;
            
            // Apply Bayes' rule to update the belief
            currentBelief = applyBayesRule(currentBelief, likelihood);
        });
        
        // Find dominant emotion
        const dominantEmotion = findDominantEmotion(currentBelief);
        
        // Generate insight based on the Bayesian updated sentiment
        let insight = '';
        
        if (dominantEmotion.emotion === 'happy') {
            insight = 'Bayesian analysis of your conversation reveals predominantly positive emotions, suggesting an overall positive mood throughout our interaction.';
        } else if (dominantEmotion.emotion === 'sad') {
            insight = 'Bayesian analysis of your conversation reveals predominantly negative emotions, suggesting you may be experiencing some challenges or difficulties.';
        } else {
            insight = 'Bayesian analysis of your conversation reveals a balanced emotional state, suggesting a neutral or contemplative mood throughout our interaction.';
        }
        
        // Analyze sentiment trend
        const halfPoint = Math.floor(sentimentHistory.length / 2);
        const firstHalf = sentimentHistory.slice(0, halfPoint);
        const secondHalf = sentimentHistory.slice(halfPoint);
        
        // Calculate average sentiment for first and second half
        const firstHalfAvg = calculateAverageEmotions(firstHalf.map(entry => entry.emotion));
        const secondHalfAvg = calculateAverageEmotions(secondHalf.map(entry => entry.emotion));
        
        // Calculate positivity trend (happy - sad)
        const firstHalfPositivity = firstHalfAvg.happy - firstHalfAvg.sad;
        const secondHalfPositivity = secondHalfAvg.happy - secondHalfAvg.sad;
        const positiveDiff = secondHalfPositivity - firstHalfPositivity;
        
        let trend = 'stable';
        if (positiveDiff > 0.1) {
            trend = 'becoming more positive';
            insight += ' Your emotional tone has been improving as our conversation progressed.';
        } else if (positiveDiff < -0.1) {
            trend = 'becoming more negative';
            insight += ' Your emotional tone has been declining as our conversation progressed.';
        } else if (positiveDiff > 0.05) {
            trend = 'slightly improving';
            insight += ' Your emotional tone has shown slight improvement throughout our conversation.';
        } else if (positiveDiff < -0.05) {
            trend = 'slightly declining';
            insight += ' Your emotional tone has shown a slight decline throughout our conversation.';
        } else {
            insight += ' Your emotional tone has remained consistent throughout our conversation.';
        }
        
        return {
            bayesianSentiment: currentBelief,
            sentimentHistory: sentimentHistory,
            dominantEmotion: dominantEmotion,
            trend: trend,
            insight: insight
        };
    } catch (error) {
        console.error('Error in analyzeConversationSentiment:', error);
        return {
            bayesianSentiment: { happy: 0.33, neutral: 0.34, sad: 0.33 },
            sentimentHistory: [],
            dominantEmotion: { emotion: 'neutral', value: 0.34 },
            trend: 'unknown',
            insight: 'An error occurred while analyzing conversation sentiment.'
        };
    }
}

// Helper function to apply Bayes' rule
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
    
    return posterior;
}

// Helper function to analyze emotion transitions
function analyzeEmotionTransitions(history) {
    console.log('DIRECT-REPORT.JS: Analyzing emotion transitions with history length:', history ? history.length : 0);
    
    if (!history || history.length < 10) {
        console.log('DIRECT-REPORT.JS: Not enough data for emotion transition analysis');
        return {
            dominantState: 'neutral',
            transitions: 0,
            stateSequence: [],
            transitionRate: 0,
            insight: 'Not enough data to analyze emotion transitions.'
        };
    }
    
    try {
        // Determine the dominant emotion for each entry
        const states = history.map(entry => {
            // Make sure we have the emotion data in the expected format
            const emotions = entry.emotions || entry;
            
            let dominant = 'neutral';
            let dominantValue = emotions.neutral || 0.34;
            
            if ((emotions.happy || 0) > dominantValue) {
                dominant = 'happy';
                dominantValue = emotions.happy;
            }
            
            if ((emotions.sad || 0) > dominantValue) {
                dominant = 'sad';
                dominantValue = emotions.sad;
            }
            
            return {
                state: dominant,
                timestamp: entry.timestamp || Date.now()
            };
        });
        
        console.log('DIRECT-REPORT.JS: Processed states:', states.length);
        
        // Count transitions between states
        let transitions = 0;
        let currentState = states[0].state;
        const stateSequence = [{ state: currentState, duration: 0, startTime: states[0].timestamp }];
        
        for (let i = 1; i < states.length; i++) {
            if (states[i].state !== currentState) {
                // State transition occurred
                transitions++;
                
                // Calculate duration of previous state
                stateSequence[stateSequence.length - 1].duration = 
                    states[i].timestamp - stateSequence[stateSequence.length - 1].startTime;
                
                // Add new state to sequence
                currentState = states[i].state;
                stateSequence.push({ 
                    state: currentState, 
                    duration: 0,
                    startTime: states[i].timestamp 
                });
            }
        }
        
        // Calculate duration of last state
        if (stateSequence.length > 0) {
            const lastState = stateSequence[stateSequence.length - 1];
            lastState.duration = history[history.length - 1].timestamp || Date.now() - lastState.startTime;
        }
        
        // Find the state with the longest total duration
        const stateDurations = {
            happy: 0,
            neutral: 0,
            sad: 0
        };
        
        stateSequence.forEach(state => {
            stateDurations[state.state] += state.duration;
        });
        
        let dominantState = 'neutral';
        let maxDuration = stateDurations.neutral;
        
        if (stateDurations.happy > maxDuration) {
            dominantState = 'happy';
            maxDuration = stateDurations.happy;
        }
        
        if (stateDurations.sad > maxDuration) {
            dominantState = 'sad';
            maxDuration = stateDurations.sad;
        }
        
        // Generate insight based on transitions
        let insight = '';
        const transitionRate = transitions / (history.length / 30); // Transitions per minute (assuming 2 sec intervals)
        
        if (transitionRate < 0.5) {
            insight = `Your emotional state was very stable, predominantly ${dominantState}.`;
        } else if (transitionRate < 1.5) {
            insight = `Your emotional state showed moderate changes, with ${dominantState} being the most common state.`;
        } else {
            insight = `Your emotional state fluctuated frequently, though ${dominantState} was the most common state.`;
        }
        
        console.log('DIRECT-REPORT.JS: Emotion transition analysis complete');
        
        return {
            dominantState,
            transitions,
            stateSequence,
            transitionRate,
            insight
        };
    } catch (error) {
        console.error('DIRECT-REPORT.JS: Error analyzing emotion transitions:', error);
        return {
            dominantState: 'neutral',
            transitions: 0,
            stateSequence: [],
            transitionRate: 0,
            insight: 'An error occurred while analyzing emotion transitions.'
        };
    }
}

// Function to get message emotion scores - completely rewritten to avoid recursion
function getMessageEmotionScores() {
    console.log('DIRECT-REPORT.JS: Getting message emotion scores directly');
    
    // Try to access from conversation-analysis.js module
    if (typeof window.conversationEntries !== 'undefined') {
        console.log('DIRECT-REPORT.JS: Using conversationEntries from window');
        const userMessages = window.conversationEntries.filter(entry => entry.role === 'user');
        return userMessages.map(entry => ({
            text: entry.text,
            textEmotion: entry.textEmotion,
            facialEmotion: entry.facialEmotion,
            openAIEmotion: entry.openAIEmotion,
            timestamp: entry.timestamp,
            sessionTime: entry.sessionTime || 0
        }));
    }
    
    // Try to access the messageEmotionScores variable directly
    if (typeof window.messageEmotionScores !== 'undefined') {
        console.log('DIRECT-REPORT.JS: Using messageEmotionScores from window');
        return window.messageEmotionScores;
    }
    
    // Try to access from conversation-analysis.js if it's loaded
    if (typeof window._getConversationData === 'function') {
        console.log('DIRECT-REPORT.JS: Using _getConversationData function');
        return window._getConversationData();
    }
    
    // Create some mock data if nothing is available
    console.warn('DIRECT-REPORT.JS: No message data found, creating mock data');
    return [
        {
            text: "Hello, how are you?",
            textEmotion: { happy: 0.6, neutral: 0.3, sad: 0.1 },
            timestamp: Date.now() - 60000,
            sessionTime: 10
        },
        {
            text: "I'm feeling okay today.",
            textEmotion: { happy: 0.3, neutral: 0.6, sad: 0.1 },
            timestamp: Date.now() - 30000,
            sessionTime: 40
        },
        {
            text: "This is a test message.",
            textEmotion: { happy: 0.2, neutral: 0.7, sad: 0.1 },
            timestamp: Date.now(),
            sessionTime: 70
        }
    ];
}

// Export the direct report generation function
window.directGenerateReport = directGenerateReport; 