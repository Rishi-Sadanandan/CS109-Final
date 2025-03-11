/**
 * Chart configuration for visualizing mood distribution
 */

// Initialize the mood chart with default values
let moodChart = null;

// Function to initialize the mood chart
function initMoodChart() {
    const ctx = document.getElementById('mood-chart').getContext('2d');
    
    // Initial data (uniform distribution)
    const data = {
        labels: ['Happy', 'Neutral', 'Sad'],
        datasets: [{
            label: 'Emotional Probability',
            data: [0.33, 0.34, 0.33],
            backgroundColor: [
                'rgba(255, 190, 11, 0.8)',  // Happy (yellow)
                'rgba(76, 201, 240, 0.8)',  // Neutral (blue)
                'rgba(114, 9, 183, 0.8)'    // Sad (purple)
            ],
            borderColor: [
                'rgba(255, 190, 11, 1)',
                'rgba(76, 201, 240, 1)',
                'rgba(114, 9, 183, 1)'
            ],
            borderWidth: 2,
            borderRadius: 8,
            hoverOffset: 4
        }]
    };
    
    // Chart configuration
    const config = {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            family: 'Poppins',
                            size: 12
                        },
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    titleFont: {
                        family: 'Poppins',
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        family: 'Poppins',
                        size: 13
                    },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            return `Probability: ${(value * 100).toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 1,
                    grid: {
                        color: 'rgba(200, 200, 200, 0.2)'
                    },
                    ticks: {
                        font: {
                            family: 'Poppins',
                            size: 11
                        },
                        callback: function(value) {
                            return (value * 100) + '%';
                        }
                    },
                    title: {
                        display: true,
                        text: 'Probability',
                        font: {
                            family: 'Poppins',
                            size: 13,
                            weight: 'bold'
                        },
                        padding: {top: 10, bottom: 10}
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            family: 'Poppins',
                            size: 11
                        }
                    }
                }
            }
        }
    };
    
    // Create the chart
    moodChart = new Chart(ctx, config);
}

// Function to update the mood chart with new distribution
function updateMoodChart(distribution) {
    if (!moodChart) {
        initMoodChart();
    }
    
    // Update chart data
    moodChart.data.datasets[0].data = [
        distribution.happy,
        distribution.neutral,
        distribution.sad
    ];
    
    // Update the chart with animation
    moodChart.update();
}

// Function to update the mood indicator (emoji and text)
function updateMoodIndicator(distribution) {
    const moodLabel = document.getElementById('mood-label');
    const moodEmoji = document.getElementById('mood-emoji');
    const moodInsight = document.getElementById('mood-insight');
    
    // Find the mood with highest probability
    let maxMood = 'neutral';
    let maxProb = distribution.neutral;
    
    if (distribution.happy > maxProb) {
        maxMood = 'happy';
        maxProb = distribution.happy;
    }
    
    if (distribution.sad > maxProb) {
        maxMood = 'sad';
        maxProb = distribution.sad;
    }
    
    // Update the mood label with confidence level
    let confidenceLevel = 'uncertain';
    if (maxProb > 0.8) {
        confidenceLevel = 'very high confidence';
    } else if (maxProb > 0.6) {
        confidenceLevel = 'high confidence';
    } else if (maxProb > 0.4) {
        confidenceLevel = 'moderate confidence';
    } else {
        confidenceLevel = 'low confidence';
    }
    
    moodLabel.textContent = `${maxMood.charAt(0).toUpperCase() + maxMood.slice(1)} (${(maxProb * 100).toFixed(1)}%, ${confidenceLevel})`;
    
    // Update the emoji with animation
    moodEmoji.style.transform = 'scale(1.2)';
    setTimeout(() => {
        // Update the emoji
        switch (maxMood) {
            case 'happy':
                moodEmoji.textContent = '😊';
                break;
            case 'neutral':
                moodEmoji.textContent = '😐';
                break;
            case 'sad':
                moodEmoji.textContent = '😔';
                break;
        }
        
        // Reset animation
        setTimeout(() => {
            moodEmoji.style.transform = 'scale(1)';
        }, 200);
    }, 200);
    
    // Add supportive message if user is sad with high probability
    if (maxMood === 'sad' && maxProb > 0.7) {
        addSystemMessage("I notice you seem sad. Remember that it's okay to feel this way, and things will get better. Is there anything specific you'd like to talk about?");
    }
} 