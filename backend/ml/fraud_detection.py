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
        joblib.dump(self.model, 'ml/fraud_model.pkl')
        return "Fraud detection model trained successfully!"
    
    def predict(self, transaction):

        if not self.is_trained:

            self.model = joblib.load(
                'ml/fraud_model.pkl'
            )

            self.is_trained = True

        features = [[
            transaction["amount"],
            transaction["category_encoded"]
        ]]

        prediction = self.model.predict(features)[0]

        return {
            "is_fraud": prediction == -1,
            "fraud_probability": 90 if prediction == -1 else 10,
            "confidence": "High" if prediction == -1 else "Low"
        }

# Initialize
fraud_detector = FraudDetector()
