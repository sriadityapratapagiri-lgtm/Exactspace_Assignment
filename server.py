import json
import os
from flask import Flask, jsonify

DATA_FILE =os.environ.get("DATA_FILE", "scraped_data.json")
PORT = int(os.environ.get("PORT", "5000"))

app = Flask(__name__)
app.json.sort_keys = False

def load_data():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

@app.route("/")
def index():
    try:
        return jsonify(load_data())
    except FileNotFoundError:
        return jsonify({"error": "f{DATA_FILE} not found"}), 500
    except json.JSONDecodeError:
        return jsonify({"error":"Scraped data is not valid JSON"}), 500
@app.route("/health")
def health():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT)
