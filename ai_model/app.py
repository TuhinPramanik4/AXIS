from flask import Flask, request, jsonify
from flask_pymongo import PyMongo
import os

app = Flask(__name__)

# MongoDB Configuration
app.config["MONGO_URI"] = "mongodb+srv://sahapriyanshu88:ezyCplrNUtcKPuiH@cluster0.4qyhzir.mongodb.net/mental_health_db"
mongo = PyMongo(app)

# Keywords for sentiment classification
EMERGENCY_KEYWORDS = {"suicidal", "kill myself", "hopeless", "self-harm", "end life"}
NEGATIVE_KEYWORDS = {"depressed", "not feeling well", "stressed", "anxious", "sad", "overwhelmed"}
POSITIVE_KEYWORDS = {"happy", "good", "better", "great", "relaxed"}

# Daily Check-in Questions
DAILY_QUESTIONS = [
    "How are you feeling today?",
    "Did you sleep well last night?",
    "Have you socialized or talked to someone today?",
    "Did you take time to relax?",
    "Are you feeling overwhelmed?"
]

# Helper Functions
def classify_sentiment(message):
    """Classifies user message as Positive, Negative, or Emergency."""
    msg_lower = message.lower()
    if any(word in msg_lower for word in EMERGENCY_KEYWORDS):
        return "emergency"
    elif any(word in msg_lower for word in NEGATIVE_KEYWORDS):
        return "negative"
    elif any(word in msg_lower for word in POSITIVE_KEYWORDS):
        return "positive"
    return "neutral"

def update_user_progress(user_id, responses):
    """Logs user responses and calculates progress score."""
    try:
        user_record = mongo.db.progress.find_one({"user_id": user_id})
        
        # If user doesn't exist, create a new record with an empty logs field
        if not user_record:
            user_record = {"user_id": user_id, "logs": []}
        
        # If the 'logs' field is missing, initialize it as an empty list
        if "logs" not in user_record:
            user_record["logs"] = []
        
        user_record["logs"].append(responses)
        
        # Update or create the record in the database
        mongo.db.progress.update_one(
            {"user_id": user_id},
            {"$set": {"logs": user_record["logs"]}},
            upsert=True
        )
    except Exception as e:
        print(f"Error updating user progress: {e}")
        raise

def evaluate_progress(user_id):
    """Analyzes user history to provide feedback."""
    user_record = mongo.db.progress.find_one({"user_id": user_id})
    if not user_record:
        return "I'm here to support you. Let me know how you're feeling."
    
    logs = user_record.get("logs", [])
    negative_count = sum(1 for entry in logs if classify_sentiment(" ".join(entry)) == "negative")
    total_logs = len(logs)
    
    if total_logs == 0:
        return "I’m here to support you. Let me know how you're feeling."
    
    if negative_count >= total_logs / 2:
        return "It looks like you've been feeling down. Try relaxation techniques or reach out to someone you trust."
    
    return "You're maintaining a balance. Keep engaging in activities that help your well-being!"

# Routes
@app.route('/daily_checkin', methods=['POST'])
def daily_checkin():
    """Handles user daily check-in responses."""
    data = request.get_json()
    
    if not data or 'user_id' not in data or 'responses' not in data:
        return jsonify({"error": "Missing 'user_id' or 'responses' field in request."}), 400
    
    user_id = data['user_id']
    responses = data['responses']
    
    update_user_progress(user_id, responses)
    score = sum(1 for response in responses if classify_sentiment(response) == "positive")
    advice = evaluate_progress(user_id)
    
    return jsonify({
        "message": "Daily check-in recorded successfully.",
        "score": score,
        "advice": advice
    }), 200

@app.route('/progress', methods=['GET'])
def progress():
    """Fetches user progress over time."""
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({"error": "Missing 'user_id' parameter."}), 400
    
    advice = evaluate_progress(user_id)
    
    return jsonify({
        "message": "Here's your progress update:",
        "advice": advice
    }), 200

@app.route('/support', methods=['GET'])
def support():
    """Provides a general support message."""
    return jsonify({
        "message": "Our mental wellness support system is available 24/7. Feel free to chat anytime."
    }), 200

# Run Server
if __name__ == '__main__':
    try:
        port = int(os.environ.get("PORT", 5000))
        debug_mode = os.getenv("FLASK_DEBUG", "False").lower() == "true"
        app.run(host='0.0.0.0', port=port, debug=debug_mode)
    except Exception as e:
        print(f"Error starting Flask application: {e}")
