/**
 * Face detection and expression recognition using face-api.js
 */

// Global variables
let video = null;
let overlay = null;
let isRunning = false;
let detectionInterval = null;
let modelsLoaded = false;
let emotionHistory = [];
let emotionAnalysisTimer = null;
let lastEmotionReport = Date.now() - 60000; // Set to 1 minute ago to allow initial report
let smoothedEmotions = { happy: 0.33, neutral: 0.34, sad: 0.33 };
let smoothingFactor = 0.8; // Higher value means more smoothing (0-1)
let detectionFrequency = 2000; // Milliseconds between detections (slower to reduce CPU usage)
let consecutiveFailures = 0;
let maxConsecutiveFailures = 5;
let emotionBuffer = []; // Buffer to store emotions for averaging
let emotionBufferMaxSize = 10; // Store 10 samples (20 seconds at 2 second intervals)

// Store the last camera-based mood distribution
let lastCameraDist = { happy: 0.33, neutral: 0.34, sad: 0.33 };

// Check if face-api.js is loaded
function isFaceApiLoaded() {
    return typeof faceapi !== 'undefined';
}

// Wait for face-api.js to load
async function waitForFaceApi(maxAttempts = 10, interval = 500) {
    return new Promise((resolve) => {
        let attempts = 0;
        
        const checkFaceApi = () => {
            attempts++;
            console.log(`Checking for face-api.js (attempt ${attempts}/${maxAttempts})...`);
            
            if (isFaceApiLoaded()) {
                console.log('face-api.js is loaded!');
                resolve(true);
                return;
            }
            
            if (attempts >= maxAttempts) {
                console.error('face-api.js failed to load after maximum attempts');
                resolve(false);
                return;
            }
            
            setTimeout(checkFaceApi, interval);
        };
        
        checkFaceApi();
    });
}

// Initialize face detection
async function initFaceDetection() {
    try {
        // Wait for face-api.js to load
        const faceApiLoaded = await waitForFaceApi();
        if (!faceApiLoaded) {
            throw new Error('face-api.js failed to load');
        }
        
        // Check if models are already loaded
        if (modelsLoaded) {
            console.log('Face detection models already loaded');
            return true;
        }

        console.log('Loading face detection models...');
        
        // Set the model URL explicitly
        const modelUrl = window.location.origin + '/static/models';
        console.log('Model URL:', modelUrl);
        
        // Load face-api.js models
        await faceapi.loadTinyFaceDetectorModel(modelUrl);
        await faceapi.loadFaceExpressionModel(modelUrl);
        
        console.log('Face detection models loaded successfully');
        modelsLoaded = true;
        return true;
    } catch (error) {
        console.error('Error loading face detection models:', error);
        return false;
    }
}

// Start the camera
async function startCamera() {
    video = document.getElementById('video');
    overlay = document.getElementById('overlay');
    const cameraStatus = document.getElementById('camera-status');
    
    try {
        // Check if models are loaded, if not, load them
        const loaded = await initFaceDetection();
        if (!loaded) {
            cameraStatus.textContent = 'Error loading face detection models';
            return false;
        }
        
        // Get user media
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            } 
        });
        
        // Set video source
        video.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise(resolve => {
            video.onloadedmetadata = () => {
                resolve();
            };
        });
        
        // Set canvas dimensions to match video
        overlay.width = video.videoWidth;
        overlay.height = video.videoHeight;
        
        // Reset variables
        emotionHistory = [];
        consecutiveFailures = 0;
        smoothedEmotions = { happy: 0.33, neutral: 0.34, sad: 0.33 };
        
        // Start detection loop
        isRunning = true;
        cameraStatus.textContent = 'Camera active, analyzing expressions...';
        
        // Start detection at regular intervals
        detectionInterval = setInterval(detectExpressions, detectionFrequency);
        
        // Start emotion analysis timer
        startEmotionAnalysis();
        
        // No system message about analysis - work silently
        
        return true;
    } catch (error) {
        console.error('Error starting camera:', error);
        cameraStatus.textContent = 'Error starting camera: ' + error.message;
        return false;
    }
}

// Stop the camera
function stopCamera() {
    const cameraStatus = document.getElementById('camera-status');
    
    if (video && video.srcObject) {
        // Stop all tracks
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    
    // Clear detection interval
    if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
    }
    
    // Clear emotion analysis timer
    if (emotionAnalysisTimer) {
        clearInterval(emotionAnalysisTimer);
        emotionAnalysisTimer = null;
    }
    
    // Clear canvas
    if (overlay) {
        const context = overlay.getContext('2d');
        context.clearRect(0, 0, overlay.width, overlay.height);
    }
    
    isRunning = false;
    cameraStatus.textContent = 'Camera inactive';
    
    // Clear emotion history
    emotionHistory = [];
}

// Start emotion analysis timer
function startEmotionAnalysis() {
    // Clear any existing timer
    if (emotionAnalysisTimer) {
        clearInterval(emotionAnalysisTimer);
    }
    
    // Set up timer to analyze emotions every 30 seconds
    emotionAnalysisTimer = setInterval(() => {
        // Only provide analysis if we have enough data and it's been at least 60 seconds since last report
        if (emotionHistory.length >= 10 && (Date.now() - lastEmotionReport) >= 60000) {
            // Don't provide vocal analysis during the session - just update internal data
            updateInternalEmotionalAnalysis();
            lastEmotionReport = Date.now();
        }
    }, 10000); // Check every 10 seconds
}

// Update internal emotional analysis without speaking
function updateInternalEmotionalAnalysis() {
    if (emotionHistory.length < 10) {
        console.log('Not enough data for emotional analysis');
        return;
    }
    
    // Calculate average emotions
    const avgEmotions = {
        happy: 0,
        neutral: 0,
        sad: 0
    };
    
    emotionHistory.forEach(entry => {
        avgEmotions.happy += entry.happy;
        avgEmotions.neutral += entry.neutral;
        avgEmotions.sad += entry.sad;
    });
    
    const count = emotionHistory.length;
    avgEmotions.happy /= count;
    avgEmotions.neutral /= count;
    avgEmotions.sad /= count;
    
    // Find dominant emotion
    let dominantEmotion = 'neutral';
    let dominantValue = avgEmotions.neutral;
    
    if (avgEmotions.happy > dominantValue) {
        dominantEmotion = 'happy';
        dominantValue = avgEmotions.happy;
    }
    
    if (avgEmotions.sad > dominantValue) {
        dominantEmotion = 'sad';
        dominantValue = avgEmotions.sad;
    }
    
    // Determine confidence level
    let confidence = 'moderate';
    if (dominantValue > 0.7) {
        confidence = 'high';
    } else if (dominantValue > 0.5) {
        confidence = 'moderate';
    } else {
        confidence = 'low';
    }
    
    // Get emotion summary
    const summary = getEmotionSummary();
    
    // Log analysis but don't speak it
    console.log('Facial emotion analysis:', {
        dominantEmotion,
        dominantValue,
        confidence,
        trend: summary.trend,
        stability: summary.stability
    });
}

// Detect facial expressions
async function detectExpressions() {
    if (!isRunning || !video || !overlay) return;
    
    try {
        // Detect faces with expressions
        const detections = await faceapi.detectAllFaces(
            video, 
            new faceapi.TinyFaceDetectorOptions({
                inputSize: 320,
                scoreThreshold: 0.5
            })
        ).withFaceExpressions();
        
        // Clear previous drawings
        const context = overlay.getContext('2d');
        context.clearRect(0, 0, overlay.width, overlay.height);
        
        // If no faces detected
        if (!detections || detections.length === 0) {
            consecutiveFailures++;
            
            // If too many consecutive failures, show a message
            if (consecutiveFailures === maxConsecutiveFailures) {
                console.log('No face detected for several frames');
                document.getElementById('camera-status').textContent = 'No face detected';
            }
            
            return;
        }
        
        // Reset consecutive failures counter
        consecutiveFailures = 0;
        document.getElementById('camera-status').textContent = 'Analyzing expressions...';
        
        // Draw detections on canvas
        faceapi.draw.drawDetections(overlay, detections);
        
        // Process the first detected face
        const face = detections[0];
        if (face && face.expressions) {
            // Map face-api expressions to our mood categories
            const expressionToMood = mapExpressionsToMoods(face.expressions);
            
            // Apply temporal smoothing to reduce fluctuations
            smoothedEmotions = applySmoothing(expressionToMood, smoothedEmotions, smoothingFactor);
            
            // Add to emotion buffer for averaging
            emotionBuffer.push({ ...smoothedEmotions, timestamp: Date.now() });
            
            // Keep buffer at a reasonable size
            if (emotionBuffer.length > emotionBufferMaxSize) {
                emotionBuffer.shift();
            }
            
            // Update last camera distribution with smoothed values
            lastCameraDist = { ...smoothedEmotions };
            
            // Add to emotion history (use smoothed values)
            emotionHistory.push({ ...smoothedEmotions, timestamp: Date.now() });
            
            // Keep history at a reasonable size (last 5 minutes = 150 entries at 2 seconds per detection)
            if (emotionHistory.length > 150) {
                emotionHistory.shift();
            }
            
            // Draw expression probabilities
            drawExpressionProbabilities(context, face, smoothedEmotions);
            
            // Send to server for Bayesian update
            updateWithCameraData(smoothedEmotions);
        }
    } catch (error) {
        console.error('Error detecting expressions:', error);
        consecutiveFailures++;
    }
}

// Apply temporal smoothing to reduce fluctuations
function applySmoothing(newValues, oldValues, factor) {
    // Simple exponential smoothing
    const simpleSmoothing = {};
    
    for (const key in newValues) {
        if (key in oldValues) {
            simpleSmoothing[key] = factor * oldValues[key] + (1 - factor) * newValues[key];
        } else {
            simpleSmoothing[key] = newValues[key];
        }
    }
    
    // If we have enough history, use it for more sophisticated smoothing
    if (emotionHistory.length >= 5) {
        // Get the last 5 entries from history
        const recentHistory = emotionHistory.slice(-5);
        
        // Calculate weighted average based on recency
        // More recent entries have higher weight
        const weights = [0.1, 0.15, 0.2, 0.25, 0.3]; // Weights sum to 1
        const weightedAvg = {
            happy: 0,
            neutral: 0,
            sad: 0
        };
        
        // Calculate weighted average from history
        for (let i = 0; i < recentHistory.length; i++) {
            const entry = recentHistory[i];
            const weight = weights[i];
            
            weightedAvg.happy += entry.happy * weight;
            weightedAvg.neutral += entry.neutral * weight;
            weightedAvg.sad += entry.sad * weight;
        }
        
        // Combine simple smoothing with history-based smoothing
        const result = {
            happy: 0.7 * simpleSmoothing.happy + 0.3 * weightedAvg.happy,
            neutral: 0.7 * simpleSmoothing.neutral + 0.3 * weightedAvg.neutral,
            sad: 0.7 * simpleSmoothing.sad + 0.3 * weightedAvg.sad
        };
        
        // Normalize to ensure values sum to 1
        const total = result.happy + result.neutral + result.sad;
        result.happy /= total;
        result.neutral /= total;
        result.sad /= total;
        
        return result;
    }
    
    // If we don't have enough history, use simple smoothing
    return simpleSmoothing;
}

// Map face-api expressions to our mood categories (happy, neutral, sad)
function mapExpressionsToMoods(expressions) {
    // Extract relevant expressions
    const happy = expressions.happy;
    const neutral = expressions.neutral;
    
    // Combine negative emotions (sad, angry, fearful, disgusted)
    const sad = expressions.sad + 
                expressions.angry + 
                expressions.fearful + 
                expressions.disgusted;
    
    // Normalize to sum to 1
    const total = happy + neutral + sad;
    
    return {
        happy: happy / total,
        neutral: neutral / total,
        sad: sad / total
    };
}

// Draw expression probabilities on canvas
function drawExpressionProbabilities(context, face, moods) {
    const box = face.detection.box;
    const x = box.x;
    const y = box.y - 50; // Position above face
    
    // Set text properties
    context.font = '16px Arial';
    context.fillStyle = 'white';
    context.strokeStyle = 'black';
    context.lineWidth = 0.5;
    
    // Draw background
    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    context.fillRect(x, y, 200, 50);
    
    // Draw text
    context.fillStyle = 'white';
    context.fillText(`Happy: ${(moods.happy * 100).toFixed(1)}%`, x + 5, y + 20);
    context.fillText(`Neutral: ${(moods.neutral * 100).toFixed(1)}%`, x + 5, y + 35);
    context.fillText(`Sad: ${(moods.sad * 100).toFixed(1)}%`, x + 5, y + 50);
}

// Get averaged emotions from the buffer
function getAveragedEmotions() {
    if (emotionBuffer.length === 0) {
        return null;
    }
    
    // Get emotions from the last 20 seconds
    const cutoffTime = Date.now() - 20000;
    const recentEmotions = emotionBuffer.filter(entry => entry.timestamp >= cutoffTime);
    
    if (recentEmotions.length === 0) {
        return null;
    }
    
    // Calculate average for each emotion
    const avgEmotions = {
        happy: 0,
        neutral: 0,
        sad: 0
    };
    
    recentEmotions.forEach(emotion => {
        avgEmotions.happy += emotion.happy;
        avgEmotions.neutral += emotion.neutral;
        avgEmotions.sad += emotion.sad;
    });
    
    const count = recentEmotions.length;
    avgEmotions.happy /= count;
    avgEmotions.neutral /= count;
    avgEmotions.sad /= count;
    
    return avgEmotions;
}

// Update with camera data - modified to use averaged emotions
async function updateWithCameraData(distribution) {
    try {
        // Only send to server if we have a valid distribution
        if (distribution && typeof distribution === 'object') {
            // Store for potential mood correction
            lastCameraDist = { ...distribution };
            
            // Update facial emotion UI only (completely separate from text analysis)
            updateFacialEmotionUI(distribution);
            
            // Log the facial emotion data for the report
            console.log('Facial emotion analysis:', distribution);
            
            // Don't update the main mood UI or affect the conversation
            // Just send to server for logging purposes
            const response = await fetch('/update_camera', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    distribution: distribution
                })
            });
            
            if (!response.ok) {
                console.error('Error updating with camera data:', await response.text());
            }
        }
    } catch (error) {
        console.error('Error sending camera data to server:', error);
    }
}

// Update facial emotion UI
function updateFacialEmotionUI(distribution) {
    // Find the facial emotion display element
    const facialEmotionDisplay = document.getElementById('facial-emotion-display');
    if (!facialEmotionDisplay) {
        console.warn('Facial emotion display element not found');
        return;
    }
    
    try {
        // Find dominant emotion
        let dominantEmotion = 'neutral';
        let dominantValue = distribution.neutral || 0;
        
        if ((distribution.happy || 0) > dominantValue) {
            dominantEmotion = 'happy';
            dominantValue = distribution.happy;
        }
        
        if ((distribution.sad || 0) > dominantValue) {
            dominantEmotion = 'sad';
            dominantValue = distribution.sad;
        }
        
        // Update the display
        let emoji = '😐';
        if (dominantEmotion === 'happy') emoji = '😊';
        if (dominantEmotion === 'sad') emoji = '😔';
        
        facialEmotionDisplay.innerHTML = `
            <div class="facial-emotion-emoji">${emoji}</div>
            <div class="facial-emotion-label">Facial: ${dominantEmotion} (${(dominantValue * 100).toFixed(0)}%)</div>
            <div class="facial-emotion-bars">
                <div class="emotion-mini-bar">
                    <span class="mini-label">😊</span>
                    <div class="mini-bar-container">
                        <div class="mini-bar happy-bar" style="width: ${((distribution.happy || 0) * 100).toFixed(0)}%"></div>
                    </div>
                </div>
                <div class="emotion-mini-bar">
                    <span class="mini-label">😐</span>
                    <div class="mini-bar-container">
                        <div class="mini-bar neutral-bar" style="width: ${((distribution.neutral || 0) * 100).toFixed(0)}%"></div>
                    </div>
                </div>
                <div class="emotion-mini-bar">
                    <span class="mini-label">😔</span>
                    <div class="mini-bar-container">
                        <div class="mini-bar sad-bar" style="width: ${((distribution.sad || 0) * 100).toFixed(0)}%"></div>
                    </div>
                </div>
            </div>
        `;
        
        // Update emotion stats display
        updateEmotionStats();
    } catch (error) {
        console.error('Error updating facial emotion UI:', error);
    }
}

// Get the last camera distribution
function getLastCameraDistribution() {
    return lastCameraDist;
}

// Get the emotion history
function getEmotionHistory() {
    return emotionHistory;
}

// Get a summary of emotional patterns
function getEmotionSummary() {
    if (emotionHistory.length < 5) {
        return {
            dominantEmotion: 'neutral',
            stability: 'unknown',
            trend: 'unknown',
            confidence: 'low',
            sampleSize: emotionHistory.length,
            avgEmotions: { happy: 0.33, neutral: 0.34, sad: 0.33 }
        };
    }
    
    // Calculate average emotions
    const avgEmotions = {
        happy: 0,
        neutral: 0,
        sad: 0
    };
    
    emotionHistory.forEach(entry => {
        avgEmotions.happy += entry.happy;
        avgEmotions.neutral += entry.neutral;
        avgEmotions.sad += entry.sad;
    });
    
    const count = emotionHistory.length;
    avgEmotions.happy /= count;
    avgEmotions.neutral /= count;
    avgEmotions.sad /= count;
    
    // Find dominant emotion
    let dominantEmotion = 'neutral';
    let dominantValue = avgEmotions.neutral;
    
    if (avgEmotions.happy > dominantValue) {
        dominantEmotion = 'happy';
        dominantValue = avgEmotions.happy;
    }
    
    if (avgEmotions.sad > dominantValue) {
        dominantEmotion = 'sad';
        dominantValue = avgEmotions.sad;
    }
    
    // Calculate stability (variance)
    const variance = {
        happy: 0,
        neutral: 0,
        sad: 0
    };
    
    emotionHistory.forEach(entry => {
        variance.happy += Math.pow(entry.happy - avgEmotions.happy, 2);
        variance.neutral += Math.pow(entry.neutral - avgEmotions.neutral, 2);
        variance.sad += Math.pow(entry.sad - avgEmotions.sad, 2);
    });
    
    variance.happy /= count;
    variance.neutral /= count;
    variance.sad /= count;
    
    const totalVariance = variance.happy + variance.neutral + variance.sad;
    
    let stability = 'moderate';
    if (totalVariance < 0.01) {
        stability = 'very stable';
    } else if (totalVariance < 0.03) {
        stability = 'stable';
    } else if (totalVariance > 0.1) {
        stability = 'highly variable';
    } else if (totalVariance > 0.05) {
        stability = 'variable';
    }
    
    // Calculate trend (first half vs second half)
    const halfPoint = Math.floor(count / 2);
    const firstHalf = emotionHistory.slice(0, halfPoint);
    const secondHalf = emotionHistory.slice(halfPoint);
    
    const firstHalfAvg = {
        happy: 0,
        neutral: 0,
        sad: 0
    };
    
    const secondHalfAvg = {
        happy: 0,
        neutral: 0,
        sad: 0
    };
    
    firstHalf.forEach(entry => {
        firstHalfAvg.happy += entry.happy;
        firstHalfAvg.neutral += entry.neutral;
        firstHalfAvg.sad += entry.sad;
    });
    
    secondHalf.forEach(entry => {
        secondHalfAvg.happy += entry.happy;
        secondHalfAvg.neutral += entry.neutral;
        secondHalfAvg.sad += entry.sad;
    });
    
    firstHalfAvg.happy /= firstHalf.length;
    firstHalfAvg.neutral /= firstHalf.length;
    firstHalfAvg.sad /= firstHalf.length;
    
    secondHalfAvg.happy /= secondHalf.length;
    secondHalfAvg.neutral /= secondHalf.length;
    secondHalfAvg.sad /= secondHalf.length;
    
    // Calculate positivity score (happy - sad)
    const firstHalfPositivity = firstHalfAvg.happy - firstHalfAvg.sad;
    const secondHalfPositivity = secondHalfAvg.happy - secondHalfAvg.sad;
    const positiveDiff = secondHalfPositivity - firstHalfPositivity;
    
    let trend = 'stable';
    if (positiveDiff > 0.1) {
        trend = 'becoming more positive';
    } else if (positiveDiff < -0.1) {
        trend = 'becoming more negative';
    } else if (positiveDiff > 0.05) {
        trend = 'slightly improving';
    } else if (positiveDiff < -0.05) {
        trend = 'slightly declining';
    }
    
    // Determine confidence level
    let confidence = 'moderate';
    if (dominantValue > 0.7) {
        confidence = 'high';
    } else if (dominantValue > 0.5) {
        confidence = 'moderate';
    } else {
        confidence = 'low';
    }
    
    return {
        dominantEmotion,
        stability,
        trend,
        confidence,
        sampleSize: count,
        avgEmotions
    };
} 