# Bayesian Mood Buddy

A web application that uses Bayesian inference to estimate a user's mood based on facial expressions and text sentiment.

## Overview

Bayesian Mood Buddy combines two sources of evidence:
1. **Camera-based facial expression recognition** using face-api.js
2. **Text sentiment analysis** using a Naive Bayes classifier

These signals are fused using Bayesian inference to create a posterior distribution over three mood states: Happy, Neutral, and Sad.

## Features

- Real-time facial expression recognition
- Text sentiment analysis
- Bayesian fusion of multiple evidence sources
- Interactive visualization of mood probabilities
- Ability to correct mood predictions to improve system reliability
- Responsive design that works on various screen sizes

## Mathematical Approach

The system implements Bayesian inference as follows:

1. Start with a prior distribution over moods: P(Mood)
2. When new evidence arrives (camera or text), compute:
   - P(Mood|Evidence) ∝ P(Evidence|Mood) * P(Mood)
3. With multiple evidence sources (assuming conditional independence):
   - P(Mood|Camera,Text) ∝ P(Camera|Mood) * P(Text|Mood) * P(Mood)
4. The system also tracks sensor reliability using Beta distributions

## Installation

### Prerequisites

- Python 3.7+
- Flask

### Setup

1. Clone this repository:
   ```
   git clone <repository-url>
   cd bayesian-mood-buddy
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Run the application:
   ```
   python app.py
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:5000
   ```

## Usage

1. **Start the camera** to enable facial expression recognition
2. **Type messages** in the chat box to analyze text sentiment
3. View the **mood distribution chart** to see the current probability estimates
4. Use the **Correct Mood** button if you want to provide feedback on the system's predictions
5. Use the **Reset System** button to start fresh

## Project Structure

- `app.py` - Flask server and main application
- `modules/` - Python modules for text classification and Bayesian fusion
  - `text_classifier.py` - Naive Bayes text classifier
  - `bayesian_fusion.py` - Bayesian inference implementation
- `static/` - Static assets (JavaScript, CSS)
  - `js/` - JavaScript files
  - `css/` - CSS stylesheets
  - `models/` - Face-api.js models (downloaded on first use)
- `templates/` - HTML templates

## CS109 Concepts Applied

- **Naive Bayes Classification** for text sentiment analysis
- **Bayesian Inference** for updating mood probabilities
- **Beta Distributions** for modeling sensor reliability
- **Conditional Independence** assumptions in the Bayesian model
- **Probability Distributions** for representing uncertainty

## Acknowledgments

- face-api.js for facial expression recognition
- Chart.js for visualization
