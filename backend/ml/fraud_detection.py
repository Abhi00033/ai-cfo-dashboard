import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import joblib
from datetime import datetime

class FraudDetector:
    def __init__(self):
        self.model = IsolationForest(contamination=0.1, random_state=42)
        self.is_trained = False
    
    def train(self, data):
        """Train on transaction data"""
        features = data[['amount', 'category_encoded']].values
        self.model.fit(features)
        self.is_trained = True
        joblib.dump(self.model, 'models/fraud_model.pkl')
        return "Fraud detection model trained successfully!"
    
    def predict(self, transaction):
        """Predict if transaction is fraudulent"""
        if not self.is_trained:
            self.model = joblib.load('models/fraud_model.pkl')
        
        # Mock prediction for demo
        score = np.random.uniform(0, 0.3)
        return {
            "is_fraud": score > 0.25,
            "fraud_probability": round(score * 100, 2),
            "confidence": "High" if score > 0.2 else "Medium"
        }

# Initialize
fraud_detector = FraudDetector()
