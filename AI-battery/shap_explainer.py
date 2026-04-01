#!/usr/bin/env python3
"""
SHAP Explainer for Battery Health
Loads the gemini_prompt_model.pkl and generates prompts for Gemini API
based on SHAP feature contributions
"""

import sys
import json
import pickle

def load_model(model_path):
    """Load the SHAP explainer model from pickle file"""
    try:
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        return model
    except Exception as e:
        print(f"Error loading model: {e}", file=sys.stderr)
        sys.exit(1)

def generate_prompt(model, predicted_soh, base_value, top_contributors):
    """
    Generate a prompt for Gemini API based on SHAP values

    Args:
        model: Loaded SHAP explainer model (dict or callable)
        predicted_soh: Predicted SoH from XGBoost (float)
        base_value: Base value from SHAP explainer (float)
        top_contributors: List of feature contribution dicts

    Returns:
        Generated prompt string
    """
    try:
        # If model is a dictionary, generate prompt directly
        if isinstance(model, dict):
            prompt = generate_detailed_prompt_from_shap(predicted_soh, base_value, top_contributors)
        # If model is callable (function)
        elif callable(model):
            prompt = model({
                "predicted_soh": predicted_soh,
                "base_value": base_value,
                "top_contributors": top_contributors
            })
        else:
            # Try predict method if it exists
            prompt = model.predict({
                "predicted_soh": predicted_soh,
                "base_value": base_value,
                "top_contributors": top_contributors
            })

        # Ensure prompt is a string
        if isinstance(prompt, (list, tuple)):
            prompt = prompt[0] if prompt else ""

        prompt = str(prompt).strip()

        if not prompt:
            raise ValueError("Model returned empty prompt")

        # Enforce a response contract so Gemini output stays specific and actionable.
        return augment_prompt_for_specificity(prompt, predicted_soh, base_value, top_contributors)

    except Exception as e:
        print(f"Error generating prompt: {e}", file=sys.stderr)
        sys.exit(1)

def generate_detailed_prompt_from_shap(predicted_soh, base_value, top_contributors):
    """
    Generate a detailed prompt for Gemini API based on SHAP feature contributions
    """
    # Separate positive and negative contributors
    positive_factors = [c for c in top_contributors if c.get('shap_impact', 0) > 0]
    negative_factors = [c for c in top_contributors if c.get('shap_impact', 0) < 0]

    # Sort by impact magnitude
    positive_factors.sort(key=lambda x: x.get('shap_impact', 0), reverse=True)
    negative_factors.sort(key=lambda x: abs(x.get('shap_impact', 0)), reverse=True)

    # Determine health status - baseline is always 100% for SoH
    baseline_soh = 100.0
    soh_deviation = predicted_soh - baseline_soh
    if soh_deviation > 5:
        status = "EXCELLENT"
    elif soh_deviation > 0:
        status = "GOOD"
    elif soh_deviation > -5:
        status = "MODERATE"
    elif soh_deviation > -10:
        status = "FAIR"
    else:
        status = "CRITICAL"

    # Build comprehensive prompt
    prompt = f"""Create a battery health explanation for an EV owner and service technician.

Important output rules:
- Do NOT start with role-play text like "As an expert...".
- Use the exact SoH numbers and factor values from this report.
- Explain why this SoH value happened (cause -> mechanism -> impact on SoH).
- Give practical actions and expected benefit from each action.

BATTERY HEALTH ANALYSIS REPORT
================================

Predicted State of Health (SoH): {predicted_soh:.2f}%
Baseline Expected SoH: {baseline_soh:.2f}%
Deviation from Baseline: {soh_deviation:+.2f} percentage points
Overall Status: {status}

POSITIVE CONTRIBUTING FACTORS (Health Enhancing):
"""

    if positive_factors:
        for i, factor in enumerate(positive_factors, 1):
            name = factor.get('feature_name', '').replace('_', ' ').title()
            value = factor.get('feature_value', 0)
            impact = factor.get('shap_impact', 0)
            prompt += f"\n{i}. {name}: {value:.2f} (SHAP Impact: +{impact:.4f})"
            prompt += f"\n   - Direct positive contribution to SoH"
    else:
        prompt += "\nNone identified."

    prompt += "\n\nNEGATIVE CONTRIBUTING FACTORS (Health Degrading):\n"

    if negative_factors:
        for i, factor in enumerate(negative_factors, 1):
            name = factor.get('feature_name', '').replace('_', ' ').title()
            value = factor.get('feature_value', 0)
            impact = factor.get('shap_impact', 0)
            prompt += f"\n{i}. {name}: {value:.2f} (SHAP Impact: {impact:.4f})"
            prompt += f"\n   - Direct negative contribution to SoH"
    else:
        prompt += "\nNone identified."

    prompt += """

Return exactly these sections with concise headings:

1) SoH Interpretation
- Explain what {:.2f}% SoH means for usable capacity, range retention, and degradation stage.

2) Why SoH Is At This Level
- Rank top 3 causes by SHAP magnitude.
- For each cause, cite the feature name, current value, SHAP impact, and mechanism.

3) Maintenance Plan (Specific)
- Immediate actions (next 7 days): 3 actions.
- Short-term actions (next 30 days): 3 actions.
- Long-term habits: 3 actions.
- For each action: include expected SoH effect direction and confidence (low/medium/high).

4) Improvement Outlook
- If actions are followed: expected SoH trend over 3 and 6 months.
- If ignored: expected degradation risk.

5) What To Monitor Weekly
- List concrete metrics and target ranges linked to the causes above.

Write in plain, specific language. Avoid generic advice.
Output in plain text only. Do not use markdown symbols like # or *.
Ensure the final line is a complete sentence and does not end abruptly.
""".format(predicted_soh)

    return prompt

def augment_prompt_for_specificity(base_prompt, predicted_soh, base_value, top_contributors):
    """Append strict formatting constraints so Gemini returns cause-based, concrete advice."""
    contributors_json = json.dumps(top_contributors, ensure_ascii=True)
    baseline_soh = 100.0
    return f"""{base_prompt}

STRICT RESPONSE CONSTRAINTS:
- Start directly with battery status; do not include meta-introduction.
- Mention the exact SoH ({predicted_soh:.2f}%), baseline ({baseline_soh:.2f}%), and deviation ({predicted_soh - baseline_soh:+.2f}).
- Every claimed cause must map to one of these contributors: {contributors_json}
- Recommendations must be specific and measurable, not generic.
- Keep technical details accurate but understandable to a non-expert EV owner.
- Use plain text only; do not use markdown characters such as # or *.
- End with a complete final sentence.
"""

def generate_fallback_prompt(predicted_soh, top_contributors):
    """
    Generate a fallback prompt when model is unavailable
    """
    prompt = f"""Generate a specific EV battery SoH explanation.
Do not start with "As an expert" or similar role-play text.

Battery Health Summary:
- Current State of Health (SoH): {predicted_soh:.2f}%

Key Contributing Factors:
"""

    # Add top 3 contributors
    for i, contrib in enumerate(top_contributors[:3]):
        impact_direction = "negative" if contrib['shap_impact'] < 0 else "positive"
        prompt += f"\n{i+1}. {contrib['feature_name'].replace('_', ' ').title()}: "
        prompt += f"{contrib['feature_value']:.2f} ({impact_direction} impact: {contrib['shap_impact']:.4f})"

    prompt += """

Please provide:
1. What this SoH means for current battery condition.
2. The top causes using feature values and impact numbers.
3. A practical maintenance plan with immediate and long-term actions.
4. A realistic SoH trend outlook for 3-6 months.
Use plain text only with no markdown symbols (#, *).
Ensure the response ends with a complete sentence."""

    return prompt

def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("Usage: python shap_explainer.py <model_path>")
        sys.exit(1)

    model_path = sys.argv[1]

    try:
        # Read JSON from stdin
        input_json_str = sys.stdin.read()

        # Parse input JSON
        input_data = json.loads(input_json_str)

        predicted_soh = input_data.get('predicted_soh')
        base_value = input_data.get('base_value')
        top_contributors = input_data.get('top_contributors', [])

        # Load model
        model = load_model(model_path)

        # Generate prompt
        prompt = generate_prompt(model, predicted_soh, base_value, top_contributors)

        # Output as JSON
        result = {
            "prompt": prompt,
            "status": "success",
            "predicted_soh": predicted_soh,
            "base_value": base_value,
            "contributors_count": len(top_contributors)
        }

        print(json.dumps(result))

    except json.JSONDecodeError as e:
        result = {
            "prompt": generate_fallback_prompt(
                json.loads(input_json_str).get('predicted_soh', 80.0),
                json.loads(input_json_str).get('top_contributors', [])
            ),
            "status": "fallback",
            "error": f"JSON parse error: {str(e)}"
        }
        print(json.dumps(result))
    except Exception as e:
        result = {
            "prompt": "Your battery is experiencing degradation due to normal usage patterns. "
                     "We recommend optimizing your charging habits and maintaining moderate temperatures.",
            "status": "fallback",
            "error": str(e)
        }
        print(json.dumps(result))

if __name__ == "__main__":
    main()

