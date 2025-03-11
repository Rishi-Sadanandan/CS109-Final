/**
 * Client-side Bayesian update functionality
 * Handles mood corrections and system reset
 */

// Send a mood correction to the server
async function correctMood(mood) {
    try {
        // Get the last distributions
        const cameraDist = getLastCameraDistribution();
        const textDist = getLastTextDistribution();
        
        // Send correction to server
        const response = await fetch('/correct_mood', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mood: mood,
                camera_dist: cameraDist,
                text_dist: textDist
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Update UI with corrected posterior
            updateMoodChart(data.posterior);
            updateMoodIndicator(data.posterior);
            
            // Add system message
            addSystemMessage(`I've updated my understanding. You're feeling ${mood}.`);
            
            // Hide correction options
            document.getElementById('correction-options').classList.add('hidden');
        } else {
            console.error('Error correcting mood:', await response.text());
            addSystemMessage('Sorry, there was an error correcting your mood.');
        }
    } catch (error) {
        console.error('Error sending mood correction to server:', error);
        addSystemMessage('Sorry, there was an error processing your correction.');
    }
}

// Reset the system
async function resetSystem() {
    try {
        // Send reset request to server
        const response = await fetch('/reset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Update UI with reset posterior
            updateMoodChart(data.posterior);
            updateMoodIndicator(data.posterior);
            
            // Add system message
            addSystemMessage('System has been reset. Starting fresh!');
        } else {
            console.error('Error resetting system:', await response.text());
            addSystemMessage('Sorry, there was an error resetting the system.');
        }
    } catch (error) {
        console.error('Error sending reset request to server:', error);
        addSystemMessage('Sorry, there was an error resetting the system.');
    }
} 