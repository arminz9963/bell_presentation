// ==================== globale Variablen ==================== //
const videoInput        = document.getElementById("VideoInput");
const videoPlayer       = document.getElementById("VideoPlayer");
const videoPlayer2      = document.getElementById("VideoPlayer2");
const videoInputLabel   = document.getElementById("VideoInputLabel");
const restContainer     = document.getElementById("schnitt");
const CutVideoBtn       = document.getElementById("CutVideoBtn");
const PlayCutBtn        = document.getElementById("PlayCutBtn");
const VideoContainer    = document.getElementById("VideoContainer");
const schnittListe      = document.getElementById("schnittListe");
const rawAnswerPanel    = document.getElementById("rawAnswerPanel");
const rawAnswerHeader   = document.getElementById("rawAnswerHeader");
const rawAnswerContent  = document.getElementById("rawAnswerContent");
const BeschreibungInput = document.getElementById("BeschreibungInput");

let Schnitte = [];
let aktuellerSchnitt = 0;
let transkript = null;


// ==================== Event Listener ==================== //

videoPlayer.addEventListener("loadeddata", function () {
    const formData = new FormData();
    formData.append("video", videoInput.files[0]);

    fetch("/upload", {
        method: "POST",
        body: formData,
    })
        .then((response) => response.json())
        .then((data) => {
            transkript = data;
            console.log("Transkription abgeschlossen:", transkript);
        })
        .catch((error) => {
            console.error("Fehler bei der Transkription:", error);
            alert("Die Groq Server sind momentan überlastet. Bitte versuche es später erneut.");
        });
});

videoInput.addEventListener("change", function () {
    const file = this.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        videoPlayer.src = url;
        videoPlayer.load();
        videoPlayer2.src = url;
        videoPlayer2.load();
    }

    videoInputLabel.style.display = "none";
    VideoContainer.style.display  = "block";
    restContainer.style.display   = "block";
});

rawAnswerHeader.addEventListener("click", function () {
    const isOpen = rawAnswerContent.style.display === "block";
    rawAnswerContent.style.display = isOpen ? "none" : "block";
    document.getElementById("rawArrow").style.transform = isOpen ? "" : "rotate(180deg)";
});

CutVideoBtn.addEventListener("click", function () {
    const beschreibung = BeschreibungInput.value;

    if (!transkript) {
        alert("Die Transkription ist noch nicht abgeschlossen – bitte habe einen Moment Geduld.");
        return;
    }

    CutVideoBtn.disabled = true;
    CutVideoBtn.innerHTML = `
        <svg class="spinner" style="width:16px;height:16px;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        KI arbeitet…`;

    fetch("/cut_video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transkript, beschreibung }),
    })
        .then((response) => response.json())
        .then((data) => {
            console.log("Antwort vom Server:", data);

            CutVideoBtn.disabled = false;
            CutVideoBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" style="width:16px;height:16px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                </svg>
                Schneide das Video`;

            zeigeRawAnswer(data.raw_answer);

            if (data.cuts && data.cuts.length > 0) {
                Schnitte = data.cuts.map((c) => [c.start, c.end]);
                aktuellerSchnitt = 0;
                zeigeSchnittButtons();
                PlayCutBtn.style.display = "flex";
            } else {
                schnittListe.innerHTML = `<p style="font-size:0.875rem;color:#fbbf24;">⚠ Keine Schnitte gefunden – sieh dir die Raw Answer an.</p>`;
                PlayCutBtn.style.display = "none";
            }
        })
        .catch((error) => {
            console.error("Fehler:", error);
            CutVideoBtn.disabled = false;
            CutVideoBtn.textContent = "Schneide das Video";
            alert("Fehler beim Senden der Daten!");
        });
});

PlayCutBtn.addEventListener("click", function () {
    if (Schnitte.length === 0) {
        alert("Keine Schnitte vorhanden!");
        return;
    }
    aktuellerSchnitt = 0;
    springenZumSchnitt(0);
});

videoPlayer2.addEventListener("timeupdate", function () {
    onTimeUpdate(Schnitte);
});


// ==================== Funktionen ==================== //

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    const ms  = Math.floor((seconds % 1) * 100);
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
}

function springenZumSchnitt(index) {
    if (index < Schnitte.length) {
        videoPlayer2.currentTime = Schnitte[index][0];
        videoPlayer2.play();
        aktuellerSchnitt = index;
        document.querySelectorAll(".schnitt-btn").forEach((btn, i) => {
            btn.style.borderColor = i === index ? "#6366f1" : "#1f2937";
            btn.style.color       = i === index ? "#a5b4fc" : "#9ca3af";
            btn.style.background  = i === index ? "rgba(99,102,241,0.1)" : "#111827";
        });
    } else {
        videoPlayer2.pause();
    }
}

function onTimeUpdate(Schnitte) {
    if (aktuellerSchnitt >= Schnitte.length) return;
    const [, end] = Schnitte[aktuellerSchnitt];
    if (videoPlayer2.currentTime >= end) {
        aktuellerSchnitt++;
        springenZumSchnitt(aktuellerSchnitt);
    }
}

function zeigeSchnittButtons() {
    schnittListe.innerHTML = "";
    Schnitte.forEach(([start, end], index) => {
        const btn = document.createElement("button");
        btn.className = "schnitt-btn";
        btn.style.cssText = `
            background: #111827;
            border: 1px solid #1f2937;
            color: #9ca3af;
            font-size: 0.75rem;
            font-weight: 500;
            padding: 6px 12px;
            border-radius: 8px;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.15s;
        `;
        btn.textContent = `Schnitt ${index + 1}:  ${formatTime(start)} → ${formatTime(end)}`;
        btn.addEventListener("click", () => springenZumSchnitt(index));
        schnittListe.appendChild(btn);
    });
}

function zeigeRawAnswer(text) {
    rawAnswerContent.textContent = text || "(Keine Antwort erhalten)";
    rawAnswerPanel.style.display = "block";
    rawAnswerContent.style.display = "block";
    document.getElementById("rawArrow").style.transform = "rotate(180deg)";
}