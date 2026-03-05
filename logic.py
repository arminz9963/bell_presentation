import subprocess
from groq import Groq
import requests

def convert_mp4_to_mp3(input_file, output_file):
    """
    Konvertiert eine MP4-Datei in eine MP3-Datei mit optionalen Start- und Endzeiten.
    input_file: Pfad zur MP4-Datei
    output_file: Pfad zur MP3-Datei
    """

    # ab: Audio Bitrate
    # ar: Audio Sampling Rate in Hz
    # libmp3lame: MP3 Encoder
    command = ["ffmpeg", "-i", input_file, "-vn",
               "-acodec", "libmp3lame", "-ab", "192k", "-ar", "44100", "-y", output_file]
    
    try:
        # Führt Command im Terminal aus
        subprocess.run(command, check=True)
        print("Datei erfolgreich konvertiert zu MP3.")
    except subprocess.CalledProcessError as e:
        print("Fehler bei der Konvertierung:", e)

def transcribe_audio(file_path, api_key, language="de"):
    """
    Funktion, die ein Transkript (inklusive word-level timestamps) aus einer MP3-Datei, Mithilfe von Groq (Whisper) erstellt.
    """

    client = Groq(api_key=api_key)
    print("Transkription beginnt...")
    with open(file_path, "rb") as file:
        transcription = client.audio.transcriptions.create(
            file=(file_path, file.read()),
            model="whisper-large-v3-turbo",
            prompt="Transkribiere die folgende Audiodatei, beachte die Zeichensetzung",
            language=language,
            temperature=0.0,
            timestamp_granularities=["word"],
            response_format="verbose_json",
        )
        print("Transkript erfolgreich erstellt.")
        return transcription.words
    

def get_api_key(file):
    """"
    Funktion, die den API-Schlüssel aus einer Datei liest.
    """
    with open(file, "r") as f:
        api_key = f.read().strip()
    return api_key

def get_ai_cuts(transcript, description, token, ip, port):
    """
    Funktion, die KI Schnitte erhält nach Angabe des Transkripts und der Beschreibung
    verwendetes Modell 

    Vast.ai zum Mieten der GPU
    llama.cpp template

    token = echo $OPEN_BUTTON_TOKEN im terminal
    ip = ip adresse des server
    port = externer Port vom Port 8000
    """

    TOKEN = token
    IP = ip
    PORT = port

    system = "Schlage passende Schnittpunkte vor basierend auf der Beschreibung und dem Transkript."
    prompt = f"Beschreibung: {description} \n Transkript: {transcript}"

    prompt_formatted = f"### Instruction:\n{system}\n\n### Input:\n{prompt}\n\n### Response:\n"

    antwort = requests.post(f"http://{IP}:{PORT}/completion",
        headers={"Authorization": f"Bearer {TOKEN}"},
        json={
            "prompt": prompt_formatted,
            "n_predict": 1024,
            "stop": ["### Instruction:", "### Input:"]
        }
    ).json()

    return antwort["content"]