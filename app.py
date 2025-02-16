import numpy as np
import tensorflow as tf
from tensorflow import keras
from flask import Flask, request, jsonify
import random
import pandas as pd
from sklearn.preprocessing import StandardScaler
import joblib

# Initialize Flask app
app = Flask(__name__)

# Load the trained Keras model
try:
    model = keras.models.load_model("heart_rate_model.keras")
    print("✅ Model loaded successfully!")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    model = None

# Load CSV and StandardScaler
try:
    df = pd.read_csv("fitness_tracker_dataset.csv")  # Ensure CSV is in the same directory
    X = df[['sleep_hours', 'calories_burned', 'active_minutes', 'heart_rate_avg']]

    scaler = StandardScaler()
    scaler.fit(X)

    joblib.dump(scaler, "../scaler.pkl")  # Save the scaler for future use
    print("✅ Scaler initialized successfully!")
except Exception as e:
    print(f"❌ Error loading CSV: {e}")
    scaler = None

# Load the pre-trained scaler
try:
    scaler = joblib.load("../scaler.pkl")
except Exception as e:
    print(f"❌ Error loading scaler: {e}")
    scaler = None


@app.route('/predict', methods=['POST'])
def predict():
    if model is None or scaler is None:
        return jsonify({"error": "Model or Scaler not loaded correctly."})

    try:
        # Parse incoming JSON data
        data = request.json
        if not data:
            return jsonify({"error": "No data received. Ensure you're sending JSON."})

        # Extract features
        input_data = np.array([[
            data.get('sleep_hours', 0),
            data.get('calories_burned', 0),
            data.get('active_minutes', 0),
            data.get('heart_rate_avg', 0)
        ]])

        # Standardize the input
        input_data_scaled = scaler.transform(input_data)

        # Predict
        prediction = model.predict(input_data_scaled)

        # Response logic
        if prediction[0][0] > 0.5:
            return jsonify({
                "alert": "⚠ High heart rate detected!",
                "suggestions": suggest_relaxation()
            })
        else:
            return jsonify({"message": "✅ Heart rate is normal. Keep up the healthy lifestyle!"})
    except Exception as e:
        return jsonify({"error": str(e)})


# Function to suggest relaxation
def suggest_relaxation():
    suggestions = [
        "🧘 Try deep breathing exercises: Inhale for 4 seconds, hold for 7, exhale for 8.",
        "🎵 Listen to calming music to relax your mind.",
        "💧 Drink a glass of cold water and rest for a few minutes.",
        "🛌 Take a short power nap to reset your body.",
        "🏞 Go for a walk in fresh air and focus on your breathing.",
        "📵 Reduce screen time and do a 5-minute guided meditation.",
        "☕ Have a cup of herbal tea like chamomile or green tea."
    ]

    music_links = [
        "https://www.youtube.com/watch?v=1ZYbU82GVz4",  # Relaxing music
        "https://www.youtube.com/watch?v=2OEL4P1Rz04",  # Meditation music
        "https://www.youtube.com/watch?v=5qap5aO4i9A",  # Lo-fi chill music
        "https://www.youtube.com/watch?v=WRPPLcpUz68",  # Nature sounds for relaxation
        "https://www.youtube.com/watch?v=WUXEeAXywCY"  # 528Hz Healing frequency
    ]

    return {
        "tip": random.choice(suggestions),
        "music_recommendation": random.choice(music_links)
    }


if __name__ == '__main__':
    app.run(debug=True)
