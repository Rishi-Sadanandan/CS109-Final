// Conversation Analysis Module
// Tracks and analyzes each message in the conversation

// Global variables
let conversationEntries = [];
let messageEmotionScores = [];

// Expose variables globally for direct access
window.conversationEntries = conversationEntries;
window.messageEmotionScores = messageEmotionScores;

/**
 * Add a new conversation entry with text, emotion scores, and facial data
 * @param {Object} entry - The conversation entry
 * @param {string} entry.role - 'user' or 'system'
 * @param {string} entry.text - The message text
 * @param {Object} entry.textEmotion - Emotion scores from text analysis
 * @param {Object} entry.facialEmotion - Emotion scores from facial analysis at the time
 * @param {Object} entry.openAIEmotion - Emotion scores from OpenAI analysis
 * @param {number} entry.timestamp - When the message was sent
 */
function addConversationEntry(entry) {
    // Ensure the entry has all required fields
    const completeEntry = {
        role: entry.role || 'user',
        text: entry.text || '',
        textEmotion: entry.textEmotion || { happy: 0.33, neutral: 0.34, sad: 0.33 },
        facialEmotion: entry.facialEmotion || null,
        openAIEmotion: entry.openAIEmotion || null, // Add OpenAI emotion data
        timestamp: entry.timestamp || Date.now(),
        sessionTime: getSessionTime() // Add session time in seconds
    };
    
    // Add to conversation history
    conversationEntries.push(completeEntry);
    
    // Update global variable
    window.conversationEntries = conversationEntries;
    
    // If this is a user message, add to emotion scores for reporting
    if (entry.role === 'user') {
        messageEmotionScores.push({
            text: entry.text,
            textEmotion: entry.textEmotion,
            facialEmotion: entry.facialEmotion,
            openAIEmotion: entry.openAIEmotion, // Add OpenAI emotion data
            timestamp: entry.timestamp,
            sessionTime: completeEntry.sessionTime
        });
        
        // Update global variable
        window.messageEmotionScores = messageEmotionScores;
    }
    
    // Log for debugging
    console.log('Added conversation entry:', completeEntry);
}

/**
 * Get the current session time in seconds
 * @returns {number} Session time in seconds
 */
function getSessionTime() {
    if (!window.sessionStartTime) return 0;
    
    // Calculate session duration
    const duration = Math.floor((Date.now() - window.sessionStartTime) / 1000);
    console.log('Current session duration:', duration, 'seconds');
    
    // Update global session duration
    window.sessionDuration = duration;
    
    return duration;
}

/**
 * Get all conversation entries
 * @returns {Array} All conversation entries
 */
function getConversationEntries() {
    return conversationEntries;
}

/**
 * Get user message emotion scores
 * @returns {Array} User message emotion scores
 */
function getMessageEmotionScores() {
    return messageEmotionScores;
}

/**
 * Helper function to get conversation data for direct-report.js
 * @returns {Array} User message emotion scores
 */
function _getConversationData() {
    console.log('CONVERSATION-ANALYSIS.JS: Providing conversation data');
    return messageEmotionScores;
}

// Expose the helper function globally
window._getConversationData = _getConversationData;

/**
 * Clear all conversation data
 */
function clearConversationData() {
    conversationEntries = [];
    messageEmotionScores = [];
    
    // Update global variables
    window.conversationEntries = [];
    window.messageEmotionScores = [];
    
    console.log('Conversation data cleared');
}

/**
 * Generate a comprehensive report of the conversation and emotional analysis
 * @param {boolean} isEndOfSession - Whether this is an end-of-session report
 * @returns {string} HTML report
 */
function generateComprehensiveReport(isEndOfSession = false) {
    try {
        console.log('CONVERSATION-ANALYSIS.JS: Starting report generation...');
        console.log('Message emotion scores:', messageEmotionScores);
        
        // Check if we have enough data
        if (!messageEmotionScores || messageEmotionScores.length < 1) {
            console.warn('Not enough conversation data for report');
            return '<p>Not enough conversation data to generate a meaningful report. Please have a longer conversation before generating a report.</p>';
        }
        
        // Get emotion history from facial analysis
        let facialHistory = [];
        let facialSummary = { stability: 'Unknown', trend: 'Unknown', confidence: 'Low' };
        
        if (typeof getEmotionHistory === 'function') {
            facialHistory = getEmotionHistory() || [];
            console.log('Facial history length:', facialHistory.length);
            
            if (typeof getEmotionSummary === 'function') {
                facialSummary = getEmotionSummary() || facialSummary;
            }
        } else {
            console.warn('getEmotionHistory function not available');
        }
        
        // Calculate average text emotions
        const textEmotions = messageEmotionScores.map(entry => entry.textEmotion);
        const avgTextEmotions = calculateAverageEmotions(textEmotions);
        const dominantTextEmotion = findDominantEmotion(avgTextEmotions);
        
        console.log('Average text emotions:', avgTextEmotions);
        console.log('Dominant text emotion:', dominantTextEmotion);
        
        // Calculate average facial emotions if available
        let avgFacialEmotions = { happy: 0.33, neutral: 0.34, sad: 0.33 };
        let dominantFacialEmotion = 'neutral';
        let hasFacialData = false;
        
        if (facialHistory && facialHistory.length > 0) {
            const facialEmotions = facialHistory.map(entry => entry.emotions);
            avgFacialEmotions = calculateAverageEmotions(facialEmotions);
            dominantFacialEmotion = findDominantEmotion(avgFacialEmotions);
            hasFacialData = true;
            
            console.log('Average facial emotions:', avgFacialEmotions);
            console.log('Dominant facial emotion:', dominantFacialEmotion);
        }
        
        // NEW: Calculate average OpenAI emotions if available
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
            
            console.log('Average OpenAI emotions:', avgOpenAIEmotions);
            console.log('Dominant OpenAI emotion:', dominantOpenAIEmotion);
        }
        
        // Calculate correlation between text and facial emotions
        let correlation = calculateCorrelation();
        console.log('Text-facial correlation:', correlation);
        
        // Analyze emotion state transitions
        const stateAnalysis = analyzeEmotionTransitions(facialHistory);
        console.log('Emotion state analysis:', stateAnalysis);
        
        // Analyze conversation sentiment history using Bayes' rule
        const sentimentAnalysis = analyzeConversationSentiment();
        console.log('Conversation sentiment analysis:', sentimentAnalysis);
        
        // Generate the report HTML
        let reportHtml = `
            <div class="comprehensive-report">
                <div class="report-section">
                    <h3>${isEndOfSession ? 'Session Summary' : 'Session Overview'}</h3>
                    <p>Session duration: ${formatTime(sessionDuration || 0)}</p>
                    <p>Messages analyzed: ${messageEmotionScores.length}</p>
                    <p>Facial samples collected: ${facialHistory.length}</p>
                    ${hasOpenAIData ? `<p>OpenAI analyses performed: ${openAIEmotions.length}</p>` : ''}
                    ${isEndOfSession ? '<p><strong>Session completed</strong></p>' : ''}
                </div>
                
                <!-- Conversation Analysis Section -->
                <div class="report-section">
                    <h3>Conversation Sentiment Analysis</h3>
                    <div class="emotion-source">
                        <h4>Bayesian Updated Sentiment</h4>
                        <p>Dominant emotion: <strong>${sentimentAnalysis.dominantEmotion.emotion}</strong> (${(sentimentAnalysis.dominantEmotion.value * 100).toFixed(1)}%)</p>
                        <div class="emotion-bars">
                            <div class="emotion-bar">
                                <span class="emotion-label">Happy:</span>
                                <div class="bar-container">
                                    <div class="bar happy-bar" style="width: ${(sentimentAnalysis.bayesianSentiment.happy * 100).toFixed(1)}%"></div>
                                    <span class="bar-value">${(sentimentAnalysis.bayesianSentiment.happy * 100).toFixed(1)}%</span>
                                </div>
                            </div>
                            <div class="emotion-bar">
                                <span class="emotion-label">Neutral:</span>
                                <div class="bar-container">
                                    <div class="bar neutral-bar" style="width: ${(sentimentAnalysis.bayesianSentiment.neutral * 100).toFixed(1)}%"></div>
                                    <span class="bar-value">${(sentimentAnalysis.bayesianSentiment.neutral * 100).toFixed(1)}%</span>
                                </div>
                            </div>
                            <div class="emotion-bar">
                                <span class="emotion-label">Sad:</span>
                                <div class="bar-container">
                                    <div class="bar sad-bar" style="width: ${(sentimentAnalysis.bayesianSentiment.sad * 100).toFixed(1)}%"></div>
                                    <span class="bar-value">${(sentimentAnalysis.bayesianSentiment.sad * 100).toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                        <p class="analysis-insight">${sentimentAnalysis.insight}</p>
                    </div>
                </div>
                
                <!-- Conversation Timeline Section -->
                <div class="report-section">
                    <h3>Conversation Sentiment Timeline</h3>
                    ${sentimentAnalysis.sentimentHistory.length >= 3 ? 
                      createConversationTimelineChart(sentimentAnalysis.sentimentHistory) : 
                      '<p>Not enough conversation data to generate a sentiment timeline.</p>'}
                    <div class="bayesian-explanation">
                        <h4>Bayesian Updating Explained</h4>
                        <p>This chart demonstrates sequential Bayesian updating of beliefs about your emotional state based on each message. The dashed lines show the raw sentiment values from each message, while the solid lines show how our belief about your emotional state evolves as we incorporate each new piece of evidence using Bayes' rule.</p>
                        <p>Bayes' rule allows us to update our prior beliefs with new evidence to form a posterior belief: P(Emotion|Message) ∝ P(Message|Emotion) × P(Emotion)</p>
                    </div>
                </div>
                
                <!-- Facial Timeline Section -->
                <div class="report-section">
                    <h3>Emotion Timeline</h3>
                    ${facialHistory.length >= 5 ? createEmotionTimelineChart(facialHistory) : '<p>Not enough data to generate an emotion timeline.</p>'}
                </div>
                
                <div class="report-section">
                    <h3>Dual Analysis Comparison</h3>
                    <div class="analysis-comparison-chart">
                        <canvas id="comparison-chart" width="600" height="300"></canvas>
                    </div>
                    <p class="chart-explanation">This chart compares the emotional distributions from your messages (text analysis) and your facial expressions (visual analysis).</p>
                </div>
                
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
                        <p class="analysis-insight">${generateTextInsight(dominantTextEmotion.emotion, avgTextEmotions)}</p>
                    </div>
                </div>
                
                ${hasOpenAIData ? `
                <div class="report-section">
                    <h3>OpenAI Emotional Analysis</h3>
                    <div class="emotion-source">
                        <h4>From Advanced AI Analysis</h4>
                        <p>Dominant emotion: <strong>${dominantOpenAIEmotion.emotion}</strong> (${(dominantOpenAIEmotion.value * 100).toFixed(1)}%)</p>
                        <div class="emotion-bars">
                            <div class="emotion-bar">
                                <span class="emotion-label">Happy:</span>
                                <div class="bar-container">
                                    <div class="bar happy-bar" style="width: ${(avgOpenAIEmotions.happy * 100).toFixed(1)}%"></div>
                                    <span class="bar-value">${(avgOpenAIEmotions.happy * 100).toFixed(1)}%</span>
                                </div>
                            </div>
                            <div class="emotion-bar">
                                <span class="emotion-label">Neutral:</span>
                                <div class="bar-container">
                                    <div class="bar neutral-bar" style="width: ${(avgOpenAIEmotions.neutral * 100).toFixed(1)}%"></div>
                                    <span class="bar-value">${(avgOpenAIEmotions.neutral * 100).toFixed(1)}%</span>
                                </div>
                            </div>
                            <div class="emotion-bar">
                                <span class="emotion-label">Sad:</span>
                                <div class="bar-container">
                                    <div class="bar sad-bar" style="width: ${(avgOpenAIEmotions.sad * 100).toFixed(1)}%"></div>
                                    <span class="bar-value">${(avgOpenAIEmotions.sad * 100).toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                        <p class="analysis-insight">OpenAI's advanced emotional analysis detected primarily <strong>${dominantOpenAIEmotion.emotion}</strong> emotions in your messages, providing a deeper understanding of your emotional state.</p>
                    </div>
                </div>
                ` : ''}
                
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
                        <p class="analysis-insight">${generateFacialInsight(dominantFacialEmotion.emotion, facialSummary)}</p>
                    </div>
                </div>
                
                <div class="report-section">
                    <h3>Correlation Analysis</h3>
                    <div class="emotion-correlation">
                        <p>Correlation between facial expressions and message sentiment: <strong>${formatCorrelation(correlation)}</strong></p>
                        <p>${interpretCorrelation(correlation)}</p>
                        <p>${generateEmotionalInsight(dominantTextEmotion.emotion, dominantFacialEmotion.emotion, correlation)}</p>
                    </div>
                </div>
                
                <div class="report-section">
                    <h3>Message-by-Message Analysis</h3>
                    <table class="message-analysis">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Message</th>
                                <th>Text Sentiment</th>
                                <th>Facial Expression</th>
                                <th>Alignment</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${generateMessageRows()}
                        </tbody>
                    </table>
                </div>
                
                <div class="report-section">
                    <h3>Bayesian Methods Applied</h3>
                    <ul>
                        <li><strong>Bayes' Rule:</strong> P(Mood|Evidence) ∝ P(Evidence|Mood) × P(Mood)</li>
                        <li><strong>Multiple Evidence Sources:</strong> Combining facial expressions, text sentiment, and OpenAI analysis</li>
                        <li><strong>Conditional Independence:</strong> Assuming facial, text, and OpenAI evidence are independent given mood</li>
                        <li><strong>Temporal Smoothing:</strong> Using weighted historical data to reduce noise in emotional measurements</li>
                        <li><strong>Correlation Analysis:</strong> Measuring alignment between different emotional signals</li>
                        <li><strong>Maximum A Posteriori (MAP):</strong> Selecting the most likely mood state</li>
                        <li><strong>Bayesian Fusion:</strong> Using Bayes' rule to combine traditional NLP with advanced AI analysis</li>
                        <li><strong>State Transition Analysis:</strong> Analyzing changes between emotional states over time</li>
                        <li><strong>Time Series Analysis:</strong> Tracking emotional patterns throughout the session</li>
                        <li><strong>Sequential Bayesian Updating:</strong> Progressively updating beliefs with each new message</li>
                        <li><strong>Conversation Sentiment Analysis:</strong> Applying Bayes' rule to message history</li>
                    </ul>
                </div>
                
                <div class="report-section">
                    <h3>Emotion State Analysis</h3>
                    <div class="emotion-state-analysis">
                        <p><strong>Dominant State:</strong> ${stateAnalysis.dominantState}</p>
                        <p><strong>Transitions:</strong> ${stateAnalysis.transitions}</p>
                        <p><strong>Transition Rate:</strong> ${stateAnalysis.transitionRate.toFixed(2)} transitions per minute</p>
                        <p class="analysis-insight">${stateAnalysis.insight}</p>
                    </div>
                </div>
            </div>
            
            <script>
                // Create comparison chart
                setTimeout(() => {
                    const ctx = document.getElementById('comparison-chart');
                    if (ctx) {
                        new Chart(ctx, {
                            type: 'bar',
                            data: {
                                labels: ['Happy', 'Neutral', 'Sad'],
                                datasets: [
                                    {
                                        label: 'Text Analysis',
                                        data: [
                                            ${(avgTextEmotions.happy * 100).toFixed(1)},
                                            ${(avgTextEmotions.neutral * 100).toFixed(1)},
                                            ${(avgTextEmotions.sad * 100).toFixed(1)}
                                        ],
                                        backgroundColor: 'rgba(54, 162, 235, 0.7)',
                                        borderColor: 'rgba(54, 162, 235, 1)',
                                        borderWidth: 1
                                    },
                                    ${hasFacialData ? `{
                                        label: 'Facial Analysis',
                                        data: [
                                            ${(avgFacialEmotions.happy * 100).toFixed(1)},
                                            ${(avgFacialEmotions.neutral * 100).toFixed(1)},
                                            ${(avgFacialEmotions.sad * 100).toFixed(1)}
                                        ],
                                        backgroundColor: 'rgba(255, 99, 132, 0.7)',
                                        borderColor: 'rgba(255, 99, 132, 1)',
                                        borderWidth: 1
                                    }` : ''},
                                    ${hasOpenAIData ? `{
                                        label: 'OpenAI Analysis',
                                        data: [
                                            ${(avgOpenAIEmotions.happy * 100).toFixed(1)},
                                            ${(avgOpenAIEmotions.neutral * 100).toFixed(1)},
                                            ${(avgOpenAIEmotions.sad * 100).toFixed(1)}
                                        ],
                                        backgroundColor: 'rgba(75, 192, 192, 0.7)',
                                        borderColor: 'rgba(75, 192, 192, 1)',
                                        borderWidth: 1
                                    }` : ''}
                                ].filter(Boolean)
                            },
                            options: {
                                responsive: true,
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        max: 100,
                                        title: {
                                            display: true,
                                            text: 'Percentage (%)'
                                        }
                                    }
                                },
                                plugins: {
                                    title: {
                                        display: true,
                                        text: 'Comparison of Text and Facial Emotion Analysis'
                                    },
                                    legend: {
                                        position: 'top'
                                    }
                                }
                            }
                        });
                    }
                }, 100);
            </script>
        `;
        
        console.log('Report HTML generated successfully');
        return reportHtml;
    } catch (error) {
        console.error('Error generating comprehensive report:', error);
        return '<p>An error occurred while generating the report. Please try again later.</p>';
    }
}

/**
 * Generate rows for the message analysis table
 * @returns {string} HTML for table rows
 */
function generateMessageRows() {
    let rows = '';
    
    messageEmotionScores.forEach(entry => {
        // Find dominant emotions
        const dominantText = findDominantEmotion(entry.textEmotion);
        
        // Get facial emotion if available, otherwise use placeholder
        let dominantFacial = { emotion: 'unknown', value: 0 };
        if (entry.facialEmotion) {
            dominantFacial = findDominantEmotion(entry.facialEmotion);
        }
        
        // Calculate alignment
        const alignment = dominantText.emotion === dominantFacial.emotion 
            ? 'Aligned' 
            : (dominantFacial.emotion === 'unknown' ? 'Unknown' : 'Misaligned');
        
        // Format time
        const timeStr = formatTime(entry.sessionTime);
        
        // Truncate message if too long
        const message = entry.text.length > 50 
            ? entry.text.substring(0, 47) + '...' 
            : entry.text;
        
        // Create row
        rows += `
            <tr>
                <td>${timeStr}</td>
                <td>${message}</td>
                <td>${dominantText.emotion} (${(dominantText.value * 100).toFixed(0)}%)</td>
                <td>${dominantFacial.emotion !== 'unknown' ? `${dominantFacial.emotion} (${(dominantFacial.value * 100).toFixed(0)}%)` : 'Not available'}</td>
                <td>${alignment}</td>
            </tr>
        `;
    });
    
    return rows;
}

/**
 * Calculate average emotions from an array of emotion objects
 * @param {Array} emotionArray - Array of emotion objects
 * @returns {Object} Average emotions
 */
function calculateAverageEmotions(emotionArray) {
    if (!emotionArray || emotionArray.length === 0) {
        return { happy: 0.33, neutral: 0.34, sad: 0.33 };
    }
    
    const avgEmotions = {
        happy: 0,
        neutral: 0,
        sad: 0
    };
    
    emotionArray.forEach(emotion => {
        avgEmotions.happy += emotion.happy || 0;
        avgEmotions.neutral += emotion.neutral || 0;
        avgEmotions.sad += emotion.sad || 0;
    });
    
    const count = emotionArray.length;
    avgEmotions.happy /= count;
    avgEmotions.neutral /= count;
    avgEmotions.sad /= count;
    
    return avgEmotions;
}

/**
 * Find the dominant emotion in an emotion object
 * @param {Object} emotions - Emotion object
 * @returns {Object} Dominant emotion and its value
 */
function findDominantEmotion(emotions) {
    let dominantEmotion = 'neutral';
    let dominantValue = emotions.neutral;
    
    if (emotions.happy > dominantValue) {
        dominantEmotion = 'happy';
        dominantValue = emotions.happy;
    }
    
    if (emotions.sad > dominantValue) {
        dominantEmotion = 'sad';
        dominantValue = emotions.sad;
    }
    
    return { emotion: dominantEmotion, value: dominantValue };
}

/**
 * Calculate correlation between facial and text emotions
 * @returns {number} Correlation coefficient (-1 to 1)
 */
function calculateCorrelation() {
    // Need at least 2 data points for correlation
    if (messageEmotionScores.length < 2) {
        return 0;
    }
    
    // Filter entries that have both facial and text emotions
    const pairedData = messageEmotionScores.filter(entry => entry.facialEmotion !== null);
    
    if (pairedData.length < 2) {
        return 0;
    }
    
    // Calculate "positivity scores" (happy - sad) for each data point
    const textScores = pairedData.map(entry => entry.textEmotion.happy - entry.textEmotion.sad);
    const facialScores = pairedData.map(entry => entry.facialEmotion.happy - entry.facialEmotion.sad);
    
    // Calculate means
    const textMean = textScores.reduce((sum, score) => sum + score, 0) / textScores.length;
    const facialMean = facialScores.reduce((sum, score) => sum + score, 0) / facialScores.length;
    
    // Calculate correlation coefficient
    let numerator = 0;
    let textDenominator = 0;
    let facialDenominator = 0;
    
    for (let i = 0; i < textScores.length; i++) {
        const textDiff = textScores[i] - textMean;
        const facialDiff = facialScores[i] - facialMean;
        
        numerator += textDiff * facialDiff;
        textDenominator += textDiff * textDiff;
        facialDenominator += facialDiff * facialDiff;
    }
    
    // Avoid division by zero
    if (textDenominator === 0 || facialDenominator === 0) {
        return 0;
    }
    
    return numerator / Math.sqrt(textDenominator * facialDenominator);
}

/**
 * Format correlation coefficient for display
 * @param {number} correlation - Correlation coefficient
 * @returns {string} Formatted correlation
 */
function formatCorrelation(correlation) {
    return correlation.toFixed(2) + ' (' + 
        (correlation >= 0.7 ? 'Strong positive' : 
         correlation >= 0.3 ? 'Moderate positive' : 
         correlation >= -0.3 ? 'Weak/No correlation' : 
         correlation >= -0.7 ? 'Moderate negative' : 
         'Strong negative') + ')';
}

/**
 * Interpret correlation between facial and text emotions
 * @param {number} correlation - Correlation coefficient
 * @returns {string} Interpretation
 */
function interpretCorrelation(correlation) {
    if (correlation >= 0.7) {
        return "Your facial expressions strongly match the emotions in your messages, suggesting emotional congruence.";
    } else if (correlation >= 0.3) {
        return "Your facial expressions moderately align with the emotions in your messages.";
    } else if (correlation >= -0.3) {
        return "There's little relationship between your facial expressions and message emotions, suggesting they may be conveying different aspects of your emotional state.";
    } else if (correlation >= -0.7) {
        return "Your facial expressions tend to show opposite emotions from your messages, which could indicate complex emotional processing.";
    } else {
        return "Your facial expressions strongly contradict the emotions in your messages, suggesting potential emotional masking or incongruence.";
    }
}

/**
 * Generate emotional insight based on dominant emotions and correlation
 * @param {string} textEmotion - Dominant text emotion
 * @param {string} facialEmotion - Dominant facial emotion
 * @param {number} correlation - Correlation coefficient
 * @returns {string} Emotional insight
 */
function generateEmotionalInsight(textEmotion, facialEmotion, correlation) {
    if (textEmotion === facialEmotion) {
        if (textEmotion === 'happy') {
            return "Your messages and facial expressions both consistently conveyed positive emotions, suggesting genuine happiness or contentment during our conversation.";
        } else if (textEmotion === 'sad') {
            return "Both your messages and facial expressions indicate negative emotions, suggesting you may be experiencing genuine sadness or distress.";
        } else {
            return "Your messages and facial expressions both show primarily neutral emotions, suggesting a calm or balanced emotional state.";
        }
    } else {
        if (correlation < -0.3) {
            return "There's a notable discrepancy between your facial expressions and message content, which might indicate complex emotional processing or potential emotional masking.";
        } else {
            return `Your messages tend to convey ${textEmotion} emotions while your facial expressions show more ${facialEmotion} emotions. This could reflect different aspects of your emotional experience.`;
        }
    }
}

/**
 * Format time in MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time
 */
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generate insight for text analysis
 * @param {string} dominantEmotion - The dominant emotion
 * @param {Object} emotions - Emotion distribution
 * @returns {string} Insight text
 */
function generateTextInsight(dominantEmotion, emotions) {
    switch (dominantEmotion) {
        case 'happy':
            return `Your messages predominantly conveyed positive emotions. The language patterns you used suggest an optimistic or content state of mind during our conversation.`;
        case 'sad':
            return `Your messages predominantly conveyed negative emotions. The language patterns you used suggest you may have been experiencing some distress or sadness during our conversation.`;
        case 'neutral':
            return `Your messages predominantly conveyed neutral emotions. The language patterns you used suggest a balanced or moderate emotional state during our conversation.`;
        default:
            return `Your messages showed a mix of emotions during our conversation.`;
    }
}

/**
 * Generate insight for facial analysis
 * @param {string} dominantEmotion - The dominant emotion
 * @param {Object} summary - Facial emotion summary
 * @returns {string} Insight text
 */
function generateFacialInsight(dominantEmotion, summary) {
    let insight = '';
    
    switch (dominantEmotion) {
        case 'happy':
            insight = `Your facial expressions predominantly displayed happiness. Your face showed signs of positive emotions throughout the session.`;
            break;
        case 'sad':
            insight = `Your facial expressions predominantly displayed sadness. Your face showed signs of negative emotions throughout the session.`;
            break;
        case 'neutral':
            insight = `Your facial expressions were predominantly neutral. Your face showed balanced or moderate emotional expressions throughout the session.`;
            break;
        default:
            insight = `Your facial expressions showed a mix of emotions during the session.`;
    }
    
    // Add trend information if available
    if (summary && summary.trend) {
        if (summary.trend === "becoming more positive") {
            insight += ` There was a noticeable trend toward more positive expressions as the session progressed.`;
        } else if (summary.trend === "becoming more negative") {
            insight += ` There was a noticeable trend toward more negative expressions as the session progressed.`;
        } else if (summary.trend === "stable") {
            insight += ` Your facial expressions remained relatively consistent throughout the session.`;
        }
    }
    
    return insight;
}

/**
 * Create an emotion history timeline chart
 * @param {Array} history - The emotion history data
 * @returns {string} HTML for the chart
 */
function createEmotionTimelineChart(history) {
    if (!history || history.length < 5) {
        return '<p>Not enough data to generate an emotion timeline.</p>';
    }
    
    // Prepare data for the chart
    const timestamps = [];
    const happyValues = [];
    const neutralValues = [];
    const sadValues = [];
    
    // Sample the history to avoid overcrowding the chart
    // If we have more than 30 points, sample to get around 30 points
    const sampleRate = Math.max(1, Math.floor(history.length / 30));
    
    for (let i = 0; i < history.length; i += sampleRate) {
        const entry = history[i];
        const date = new Date(entry.timestamp);
        timestamps.push(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        happyValues.push((entry.happy * 100).toFixed(1));
        neutralValues.push((entry.neutral * 100).toFixed(1));
        sadValues.push((entry.sad * 100).toFixed(1));
    }
    
    // Create a unique ID for the chart
    const chartId = 'emotion-timeline-chart-' + Date.now();
    
    // Return HTML with a canvas and script to create the chart
    return `
        <div class="emotion-timeline-chart">
            <canvas id="${chartId}" width="600" height="300"></canvas>
        </div>
        <script>
            setTimeout(() => {
                const ctx = document.getElementById('${chartId}');
                if (ctx) {
                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: ${JSON.stringify(timestamps)},
                            datasets: [
                                {
                                    label: 'Happy',
                                    data: ${JSON.stringify(happyValues)},
                                    borderColor: 'rgba(75, 192, 192, 1)',
                                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                                    tension: 0.4,
                                    fill: false
                                },
                                {
                                    label: 'Neutral',
                                    data: ${JSON.stringify(neutralValues)},
                                    borderColor: 'rgba(54, 162, 235, 1)',
                                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                                    tension: 0.4,
                                    fill: false
                                },
                                {
                                    label: 'Sad',
                                    data: ${JSON.stringify(sadValues)},
                                    borderColor: 'rgba(255, 99, 132, 1)',
                                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                                    tension: 0.4,
                                    fill: false
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                title: {
                                    display: true,
                                    text: 'Emotion Timeline'
                                },
                                tooltip: {
                                    mode: 'index',
                                    intersect: false
                                }
                            },
                            scales: {
                                y: {
                                    min: 0,
                                    max: 100,
                                    title: {
                                        display: true,
                                        text: 'Emotion Intensity (%)'
                                    }
                                },
                                x: {
                                    title: {
                                        display: true,
                                        text: 'Time'
                                    }
                                }
                            }
                        }
                    });
                }
            }, 100);
        </script>
        <p class="chart-explanation">This chart shows how your emotions changed over time during the session.</p>
    `;
}

/**
 * Analyze emotion state transitions
 * @param {Array} history - The emotion history data
 * @returns {Object} Analysis of state transitions
 */
function analyzeEmotionTransitions(history) {
    if (!history || history.length < 10) {
        return {
            dominantState: 'neutral',
            transitions: 0,
            stateSequence: [],
            insight: 'Not enough data to analyze emotion transitions.'
        };
    }
    
    // Determine the dominant emotion for each entry
    const states = history.map(entry => {
        let dominant = 'neutral';
        let dominantValue = entry.neutral;
        
        if (entry.happy > dominantValue) {
            dominant = 'happy';
            dominantValue = entry.happy;
        }
        
        if (entry.sad > dominantValue) {
            dominant = 'sad';
            dominantValue = entry.sad;
        }
        
        return {
            state: dominant,
            timestamp: entry.timestamp
        };
    });
    
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
        lastState.duration = history[history.length - 1].timestamp - lastState.startTime;
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
    
    return {
        dominantState,
        transitions,
        stateSequence,
        transitionRate,
        insight
    };
}

/**
 * Analyze conversation sentiment history using Bayes' rule
 * @returns {Object} Analysis results including Bayesian updated sentiment
 */
function analyzeConversationSentiment() {
    console.log('Analyzing conversation sentiment with', messageEmotionScores.length, 'messages');
    
    if (!messageEmotionScores || messageEmotionScores.length < 3) {
        console.warn('Not enough conversation data for Bayesian analysis');
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
        
        console.log('Sentiment history created with', sentimentHistory.length, 'entries');
        
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
        
        console.log('Final Bayesian sentiment:', currentBelief);
        
        // Find dominant emotion
        const dominantEmotion = findDominantEmotion(currentBelief);
        console.log('Dominant emotion from Bayesian analysis:', dominantEmotion);
        
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
        
        console.log('Sentiment trend analysis:', { trend, positiveDiff });
        
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
    
    return posterior;
}

/**
 * Create a conversation sentiment timeline chart
 * @param {Array} history - The sentiment history data
 * @returns {string} HTML for the chart
 */
function createConversationTimelineChart(history) {
    console.log('Creating conversation timeline chart with', history.length, 'entries');
    
    if (!history || history.length < 3) {
        console.warn('Not enough conversation data for timeline chart');
        return '<p>Not enough conversation data to generate a sentiment timeline.</p>';
    }
    
    try {
        // Prepare data for the chart
        const timestamps = [];
        const happyValues = [];
        const neutralValues = [];
        const sadValues = [];
        const bayesianHappy = [];
        const bayesianNeutral = [];
        const bayesianSad = [];
        
        // Apply sequential Bayesian updating for each point
        let currentBelief = { happy: 0.33, neutral: 0.34, sad: 0.33 };
        
        // Process each message
        for (let i = 0; i < history.length; i++) {
            const entry = history[i];
            if (!entry || !entry.emotion || !entry.timestamp) {
                console.warn('Invalid entry in history:', entry);
                continue;
            }
            
            const date = new Date(entry.timestamp);
            timestamps.push(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            
            // Add raw emotion values
            happyValues.push((entry.emotion.happy * 100).toFixed(1));
            neutralValues.push((entry.emotion.neutral * 100).toFixed(1));
            sadValues.push((entry.emotion.sad * 100).toFixed(1));
            
            // Update Bayesian belief
            currentBelief = applyBayesRule(currentBelief, entry.emotion);
            
            // Add Bayesian updated values
            bayesianHappy.push((currentBelief.happy * 100).toFixed(1));
            bayesianNeutral.push((currentBelief.neutral * 100).toFixed(1));
            bayesianSad.push((currentBelief.sad * 100).toFixed(1));
        }
        
        console.log('Chart data prepared:', {
            timestamps: timestamps.length,
            happyValues: happyValues.length,
            bayesianValues: bayesianHappy.length
        });
        
        // Create a unique ID for the chart
        const chartId = 'conversation-timeline-chart-' + Date.now();
        
        // Return HTML with a canvas and script to create the chart
        return `
            <div class="conversation-timeline-chart">
                <canvas id="${chartId}" width="600" height="300"></canvas>
            </div>
            <script>
                setTimeout(() => {
                    const ctx = document.getElementById('${chartId}');
                    if (ctx) {
                        new Chart(ctx, {
                            type: 'line',
                            data: {
                                labels: ${JSON.stringify(timestamps)},
                                datasets: [
                                    {
                                        label: 'Happy (Raw)',
                                        data: ${JSON.stringify(happyValues)},
                                        borderColor: 'rgba(75, 192, 192, 0.7)',
                                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                                        borderDash: [5, 5],
                                        tension: 0.4,
                                        fill: false
                                    },
                                    {
                                        label: 'Happy (Bayesian)',
                                        data: ${JSON.stringify(bayesianHappy)},
                                        borderColor: 'rgba(75, 192, 192, 1)',
                                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                                        tension: 0.4,
                                        fill: false
                                    },
                                    {
                                        label: 'Neutral (Raw)',
                                        data: ${JSON.stringify(neutralValues)},
                                        borderColor: 'rgba(54, 162, 235, 0.7)',
                                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                                        borderDash: [5, 5],
                                        tension: 0.4,
                                        fill: false,
                                        hidden: true
                                    },
                                    {
                                        label: 'Neutral (Bayesian)',
                                        data: ${JSON.stringify(bayesianNeutral)},
                                        borderColor: 'rgba(54, 162, 235, 1)',
                                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                                        tension: 0.4,
                                        fill: false,
                                        hidden: true
                                    },
                                    {
                                        label: 'Sad (Raw)',
                                        data: ${JSON.stringify(sadValues)},
                                        borderColor: 'rgba(255, 99, 132, 0.7)',
                                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                                        borderDash: [5, 5],
                                        tension: 0.4,
                                        fill: false
                                    },
                                    {
                                        label: 'Sad (Bayesian)',
                                        data: ${JSON.stringify(bayesianSad)},
                                        borderColor: 'rgba(255, 99, 132, 1)',
                                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                                        tension: 0.4,
                                        fill: false
                                    }
                                ]
                            },
                            options: {
                                responsive: true,
                                plugins: {
                                    title: {
                                        display: true,
                                        text: 'Conversation Sentiment Timeline'
                                    },
                                    tooltip: {
                                        mode: 'index',
                                        intersect: false
                                    },
                                    legend: {
                                        position: 'top',
                                    }
                                },
                                scales: {
                                    y: {
                                        min: 0,
                                        max: 100,
                                        title: {
                                            display: true,
                                            text: 'Sentiment Intensity (%)'
                                        }
                                    },
                                    x: {
                                        title: {
                                            display: true,
                                            text: 'Time'
                                        }
                                    }
                                }
                            }
                        });
                    } else {
                        console.error('Canvas element not found:', chartId);
                    }
                }, 100);
            </script>
            <p class="chart-explanation">This chart shows how your conversation sentiment changed over time. Solid lines show the Bayesian updated beliefs, while dashed lines show the raw sentiment values.</p>
        `;
    } catch (error) {
        console.error('Error creating conversation timeline chart:', error);
        return '<p>An error occurred while generating the sentiment timeline chart.</p>';
    }
}

// Make sure our implementation is used by overriding any existing implementation
if (window.generateComprehensiveReport !== generateComprehensiveReport) {
    console.log('CONVERSATION-ANALYSIS.JS: Overriding existing generateComprehensiveReport implementation');
    window.generateComprehensiveReport = generateComprehensiveReport;
}

// Export functions for use in other modules
window.generateComprehensiveReport = generateComprehensiveReport;
window.getConversationEntries = getConversationEntries;
window.getMessageEmotionScores = getMessageEmotionScores;
window.addConversationEntry = addConversationEntry;
window.clearConversationData = clearConversationData;
window.analyzeConversationSentiment = analyzeConversationSentiment;
window.createConversationTimelineChart = createConversationTimelineChart;
window.applyBayesRule = applyBayesRule;

// Log that the conversation-analysis.js exports are ready
console.log('CONVERSATION-ANALYSIS.JS: Exports ready, generateComprehensiveReport is available on window object'); 