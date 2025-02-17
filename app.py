import os
import random
import numpy as np
import tensorflow as tf
from tensorflow import keras
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
import pandas as pd
from sklearn.preprocessing import StandardScaler
import joblib
from twilio.rest import Client
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Initialize Flask app and SocketIO
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Load the trained Keras model
try:
    model = keras.models.load_model("heart_rate_model.keras")
    print("✅ Model loaded successfully!")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    model = None

# Load CSV and StandardScaler
try:
    df = pd.read_csv("fitness_tracker_dataset.csv")
    X = df[['sleep_hours', 'calories_burned', 'active_minutes', 'heart_rate_avg']]
    scaler = StandardScaler()
    scaler.fit(X)
    joblib.dump(scaler, "scaler.pkl")
    print("✅ Scaler initialized successfully!")
except Exception as e:
    print(f"❌ Error loading CSV: {e}")
    scaler = None

# Load the pre-trained scaler
try:
    scaler = joblib.load("scaler.pkl")
except Exception as e:
    print(f"❌ Error loading scaler: {e}")
    scaler = None

# Twilio credentials
TWILIO_ACCOUNT_SID = "your_twilio_account_sid"
TWILIO_AUTH_TOKEN = "your_twilio_auth_token"
TWILIO_PHONE_NUMBER = "your_twilio_phone_number"

# Elastic Email credentials
EMAIL_SENDER = "your_email@example.com"
EMAIL_PASSWORD = "your_email_password"
SMTP_SERVER = "smtp.elasticemail.com"
SMTP_PORT = 2525

@app.route('/predict', methods=['POST'])
def predict():
    if model is None or scaler is None:
        return jsonify({"error": "Model or Scaler not loaded correctly."})
    
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data received. Ensure you're sending JSON."})
        
        phone_number = data.get("phone_number", "")
        email = data.get("email", "")
        
        if phone_number and not phone_number.startswith("+91"):
            phone_number = "+91" + phone_number
        
        input_data = np.array([[  
            data.get('sleep_hours', 0),
            data.get('calories_burned', 0),
            data.get('active_minutes', 0),
            data.get('heart_rate_avg', 0)
        ]])

        input_data_scaled = scaler.transform(input_data)
        prediction = model.predict(input_data_scaled)
        
        if prediction[0][0] > 0.5:
            alert_message = "⚠ High heart rate detected!"
            suggestions = suggest_relaxation()
            response = {"alert": alert_message, "suggestions": suggestions}
            
            # Emit real-time alert
            socketio.emit('alert', response)
            
            if phone_number:
                send_sms(phone_number, alert_message + " " + suggestions["tip"])
            
            if email:
                send_email(email, alert_message, suggestions)
            
            return jsonify(response)
        else:
            return jsonify({"message": "✅ Heart rate is normal. Keep up the healthy lifestyle!"})
    except Exception as e:
        return jsonify({"error": str(e)})

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
        "https://www.youtube.com/watch?v=1ZYbU82GVz4",
        "https://www.youtube.com/watch?v=2OEL4P1Rz04",
        "https://www.youtube.com/watch?v=5qap5aO4i9A",
        "https://www.youtube.com/watch?v=WRPPLcpUz68",
        "https://www.youtube.com/watch?v=WUXEeAXywCY"
    ]

    return {
        "tip": random.choice(suggestions),
        "music_recommendation": random.choice(music_links)
    }

def send_sms(phone_number, message):
    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        client.messages.create(
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=phone_number
        )
        print(f"✅ SMS sent to {phone_number}")
    except Exception as e:
        print(f"❌ Error sending SMS: {e}")

def send_email(to_email, subject, suggestions):
    try:
        msg = MIMEMultipart()
        msg['From'] = EMAIL_SENDER
        msg['To'] = to_email
        msg['Subject'] = subject
        body = f"{subject}\n\n{suggestions['tip']}\n\nListen to relaxing music: {suggestions['music_recommendation']}"
        msg.attach(MIMEText(body, 'plain'))
        
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL_SENDER, EMAIL_PASSWORD)
        server.sendmail(EMAIL_SENDER, to_email, msg.as_string())
        server.quit()
        print(f"✅ Email sent to {to_email}")
    except Exception as e:
        print(f"❌ Error sending email: {e}")

if __name__ == '__main__':
    socketio.run(app, debug=True)
