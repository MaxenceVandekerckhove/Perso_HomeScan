# app.py
# Flask application entry point.
# Defines all routes for serving pages and handling evaluation data.

import json
import os
import re
import base64
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

# Folder where all evaluations are stored
EVALUATIONS_DIR = "evaluations"


def charger_criteres():
    """Read and return the contents of criteres.json."""
    with open("criteres.json", encoding="utf-8") as f:
        return json.load(f)


def slugify(text):
    """
    Convert a property name into a clean folder-safe slug.
    Example: "Maison Dupont" -> "maison-dupont"
    """
    text = text.lower().strip()
    # Replace accented characters
    accents = {
        'à': 'a', 'â': 'a', 'ä': 'a', 'é': 'e', 'è': 'e', 'ê': 'e',
        'ë': 'e', 'î': 'i', 'ï': 'i', 'ô': 'o', 'ö': 'o', 'ù': 'u',
        'û': 'u', 'ü': 'u', 'ç': 'c', 'ñ': 'n'
    }
    for accented, plain in accents.items():
        text = text.replace(accented, plain)
    # Replace any non-alphanumeric character with a hyphen
    text = re.sub(r'[^a-z0-9]+', '-', text)
    # Remove leading/trailing hyphens
    text = text.strip('-')
    return text


# --- PAGE ROUTES ---

@app.route("/")
def home():
    """Home page — lists all saved evaluations."""
    return render_template("home.html")

@app.route("/evaluer")
def index():
    """Evaluation form page."""
    return render_template("index.html")


@app.route("/fiche")
def fiche():
    """Summary page — data is passed via sessionStorage."""
    return render_template("fiche.html")


# --- API ROUTES ---

@app.route("/api/criteres")
def api_criteres():
    """Return the full criteres.json as JSON."""
    return jsonify(charger_criteres())


@app.route("/api/sauvegarder", methods=["POST"])
def api_sauvegarder():
    """
    Save an evaluation to disk.
    Creates a folder per property under /evaluations/<slug>/
    and writes evaluation.json + photo.jpg if a photo is provided.
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data received"}), 400

    slug = slugify(data.get("propertyName", "bien-sans-nom"))
    folder = os.path.join(EVALUATIONS_DIR, slug)
    os.makedirs(folder, exist_ok=True)

    photo_src = data.get("photoSrc")
    # Keep the existing filename if the photo was already saved
    photo_filename = data.get("photoFilename")

    if photo_src and photo_src.startswith("data:image"):
        # New photo uploaded as base64 — save it to disk
        header, b64data = photo_src.split(",", 1)
        ext = header.split("/")[1].split(";")[0]  # e.g. "jpeg"
        photo_filename = f"photo.{ext}"
        photo_path = os.path.join(folder, photo_filename)
        with open(photo_path, "wb") as f:
            f.write(base64.b64decode(b64data))

    # If photoSrc is a URL (already saved), the existing photoFilename is kept as-is
    # No need to re-save the image file

    data["photoSrc"] = None
    data["photoFilename"] = photo_filename
    data["slug"] = slug

    json_path = os.path.join(folder, "evaluation.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return jsonify({"success": True, "slug": slug})


@app.route("/api/evaluations")
def api_evaluations():
    """
    Return a list of all saved evaluations (summary only).
    Used by the dashboard page (coming in a later step).
    """
    if not os.path.exists(EVALUATIONS_DIR):
        return jsonify([])

    evaluations = []
    for slug in os.listdir(EVALUATIONS_DIR):
        json_path = os.path.join(EVALUATIONS_DIR, slug, "evaluation.json")
        if os.path.exists(json_path):
            with open(json_path, encoding="utf-8") as f:
                data = json.load(f)
            evaluations.append({
                "slug": slug,
                "propertyName": data.get("propertyName"),
                "propertyPrice": data.get("propertyPrice"),
                "score": data.get("score"),
                "photoFilename": data.get("photoFilename")
            })

    return jsonify(evaluations)


@app.route("/api/evaluations/<slug>")
def api_evaluation(slug):
    """
    Return the full evaluation data for a given slug.
    Used to pre-fill the form when editing an existing evaluation.
    """
    json_path = os.path.join(EVALUATIONS_DIR, slug, "evaluation.json")

    if not os.path.exists(json_path):
        return jsonify({"error": "Evaluation not found"}), 404

    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    # Re-attach the photo as a URL path so the browser can display it
    if data.get("photoFilename"):
        data["photoUrl"] = f"/evaluations/{slug}/{data['photoFilename']}"

    return jsonify(data)


@app.route("/evaluations/<slug>/<filename>")
def serve_photo(slug, filename):
    """Serve a saved property photo as a static file."""
    from flask import send_from_directory
    return send_from_directory(os.path.join(EVALUATIONS_DIR, slug), filename)

@app.route("/fiche/<slug>")
def fiche_sauvegardee(slug):
    """Display the summary page for a saved evaluation."""
    return render_template("fiche.html")

@app.route("/api/evaluations/<slug>", methods=["DELETE"])
def api_supprimer(slug):
    """
    Delete a saved evaluation and its folder from disk.
    """
    import shutil
    folder = os.path.join(EVALUATIONS_DIR, slug)

    if not os.path.exists(folder):
        return jsonify({"error": "Evaluation not found"}), 404

    shutil.rmtree(folder)
    return jsonify({"success": True})

# --- START ---

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0")
