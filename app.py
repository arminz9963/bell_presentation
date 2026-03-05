import os
import re
import json
import tempfile
import time
from flask import Flask, render_template, request, jsonify
from logic import convert_mp4_to_mp3, transcribe_audio, get_api_key, get_ai_cuts
from flask_cors import CORS
import ast

api_key = get_api_key("api_key.txt")
app = Flask(__name__, template_folder='', static_folder='')

CORS(app)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/upload", methods=["POST"])
def upload():
    mp4_file = request.files["video"]

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as temp_video:
        mp4_file.save(temp_video)
        temp_video_path = temp_video.name

    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_audio:
        temp_audio_path = temp_audio.name

    try:
        start = time.time()
        convert_mp4_to_mp3(temp_video_path, temp_audio_path)
        transkript = transcribe_audio(temp_audio_path, api_key)
        end = time.time()
        print(f"Transkription abgeschlossen in {end - start:.2f} Sekunden")
    finally:
        os.remove(temp_video_path)
        os.remove(temp_audio_path)

    return jsonify(transkript)


@app.route("/cut_video", methods=["POST"])
def cut_video():
    data = request.get_json()
    transkript = data.get("transkript")
    beschreibung = data.get("beschreibung")
    token = data.get("token")
    port = data.get("port")
    ip = data.get("ip")

    print(f"Transkript empfangen: {len(transkript)} Wörter")
    print(f"Beschreibung: {beschreibung}")

    # Beschreibung mit JSON-Hinweis erweitern, damit die KI strukturiert antwortet
    beschreibung_mit_format = (
        f"{beschreibung}\n\n"
        "Antworte NUR mit einem JSON-Array im Format: "
        '[{"start": <sekunden>, "end": <sekunden>}, ...] '
        "ohne weiteren Text."
    )

    raw_answer = get_ai_cuts(transkript, beschreibung_mit_format, token, ip, port)
    print(f"KI-Antwort: {raw_answer}")

    # JSON-Schnitte aus der Antwort extrahieren
    try:
        parsed = ast.literal_eval(raw_answer.strip())
        cuts = [{"start": s, "end": e} for s, e in parsed]

    except (ValueError, SyntaxError):
        print("Konnte keine Schnitte aus der KI-Antwort parsen.")
        cuts = []

    return jsonify({
        "status": "success",
        "raw_answer": raw_answer,
        "cuts": cuts  # Liste von {"start": x, "end": y}
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)