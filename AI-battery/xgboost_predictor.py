#!/usr/bin/env python3
"""
XGBoost Battery Health Predictor
Loads the xgboost_battery_model.pkl and makes predictions
"""

import sys
import json
import pickle
import numpy as np
from pathlib import Path

def load_model(model_path):
    """Load the XGBoost model from pickle file"""
    try:
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        return model
    except Exception as e:
        print(f"Error loading model: {e}", file=sys.stderr)
        sys.exit(1)

def predict_soh(model, voltage, current, temperature, soc, cycle_number):
    """
    Make prediction using XGBoost model

    Args:
        model: Loaded XGBoost model
        voltage: Voltage measured (V)
        current: Current measured (A)
        temperature: Temperature measured (°C)
        soc: State of Charge (%)
        cycle_number: Cycle count

    Returns:
        Predicted SoH value
    """
    try:
        # Create input array with correct shape [1, 5]
        input_data = np.array([[voltage, current, temperature, soc, cycle_number]], dtype=np.float32)

        # Make prediction
        prediction = model.predict(input_data)

        # XGBoost returns array, extract scalar value
        soh = float(prediction[0])

        # Ensure SoH is in valid range
        soh = max(0.0, min(100.0, soh))

        return soh
    except Exception as e:
        print(f"Error making prediction: {e}", file=sys.stderr)
        sys.exit(1)

def main():
    """Main entry point for command line usage"""
    if len(sys.argv) < 7:
        print("Usage: python xgboost_predictor.py <model_path> <voltage> <current> <temperature> <soc> <cycle_number>")
        sys.exit(1)

    model_path = sys.argv[1]
    voltage = float(sys.argv[2])
    current = float(sys.argv[3])
    temperature = float(sys.argv[4])
    soc = float(sys.argv[5])
    cycle_number = int(sys.argv[6])

    # Load model
    model = load_model(model_path)

    # Make prediction
    soh = predict_soh(model, voltage, current, temperature, soc, cycle_number)

    # Output as JSON
    result = {
        "soh": soh,
        "status": "success"
    }

    print(json.dumps(result))

if __name__ == "__main__":
    main()

