# app.py
# Point d'entrée de l'application Flask.
# Ce fichier démarre le serveur et définit les routes (= les URLs disponibles).

import json
from flask import Flask, render_template, jsonify

# Crée l'application Flask.
# __name__ indique à Flask où se trouve le projet (pour trouver templates/ et static/).
app = Flask(__name__)


def charger_criteres():
    """
    Lit et retourne le contenu de criteres.json.
    On centralise cette lecture dans une fonction pour ne pas la dupliquer.
    """
    with open("criteres.json", encoding="utf-8") as f:
        return json.load(f)


# --- ROUTES ---

@app.route("/")
def index():
    """
    Route principale : répond à http://localhost:5000/
    render_template cherche le fichier dans le dossier templates/.
    """
    return render_template("index.html")


@app.route("/api/criteres")
def api_criteres():
    """
    Route API : répond à http://localhost:5000/api/criteres
    Renvoie criteres.json tel quel, au format JSON.
    Le JavaScript de la page appellera cette route pour construire le formulaire.
    """
    return jsonify(charger_criteres())


# --- DÉMARRAGE ---

if __name__ == "__main__":
    # debug=True : rechargement automatique à chaque modification du code.
    # À désactiver en production.
    app.run(debug=True)