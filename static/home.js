// home.js
// Loads and displays all saved evaluations on the home page.

document.addEventListener("DOMContentLoaded", () => {
    // Clear any leftover session data from a previous evaluation
    sessionStorage.removeItem("logement-eval-result");
    sessionStorage.removeItem("logement-eval-slug");

    loadEvaluations();
});


async function loadEvaluations() {
    const container = document.getElementById("evaluations-container");

    try {
        const response = await fetch("/api/evaluations");
        const evaluations = await response.json();

        if (evaluations.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>Aucune évaluation sauvegardée pour l'instant.</p>
                    <a href="/evaluer" class="btn-primary">Commencer une évaluation</a>
                </div>
            `;
            return;
        }

        container.innerHTML = "";
        evaluations.forEach(evaluation => {
            container.appendChild(buildCard(evaluation));
        });

    } catch (err) {
        console.error("Failed to load evaluations:", err);
        container.innerHTML = "<p>Erreur lors du chargement des évaluations.</p>";
    }
}


function buildCard(evaluation) {
    const card = document.createElement("div");
    card.classList.add("property-card");

    // --- Photo ---
    const photoWrapper = document.createElement("div");
    photoWrapper.classList.add("card-photo");

    if (evaluation.photoFilename) {
        const img = document.createElement("img");
        img.src = `/evaluations/${evaluation.slug}/${evaluation.photoFilename}`;
        img.alt = evaluation.propertyName;
        photoWrapper.appendChild(img);
    } else {
        // Placeholder if no photo
        photoWrapper.classList.add("card-photo-placeholder");
        photoWrapper.textContent = "🏠";
    }

    // --- Info ---
    const info = document.createElement("div");
    info.classList.add("card-info");

    const name = document.createElement("h2");
    name.textContent = evaluation.propertyName;
    info.appendChild(name);

    if (evaluation.propertyPrice) {
        const price = document.createElement("p");
        price.classList.add("card-price");
        price.textContent = parseInt(evaluation.propertyPrice).toLocaleString("fr-FR") + " €";
        info.appendChild(price);
    }

    // --- Score badge ---
    const pct = evaluation.score?.percentage;
    if (pct !== null && pct !== undefined) {
        const score = document.createElement("div");
        score.classList.add("card-score");
        score.style.color = scoreColor(pct);
        score.innerHTML = `<span class="score-big">${pct}</span><span class="score-suffix">/100</span>`;
        info.appendChild(score);
    }

    // --- Actions ---
    const actions = document.createElement("div");
    actions.classList.add("card-actions");

    const btnFiche = document.createElement("a");
    btnFiche.href = `/fiche/${evaluation.slug}`;
    btnFiche.classList.add("btn-primary");
    btnFiche.textContent = "Voir la fiche";

    const btnModifier = document.createElement("a");
    btnModifier.href = `/evaluer?slug=${evaluation.slug}`;
    btnModifier.classList.add("btn-secondary");
    btnModifier.textContent = "Modifier";

    const btnSupprimer = document.createElement("button");
    btnSupprimer.classList.add("btn-danger");
    btnSupprimer.textContent = "Supprimer";
    btnSupprimer.addEventListener("click", async () => {
        const response = await fetch(`/api/evaluations/${evaluation.slug}`, {
            method: "DELETE"
        });
        const result = await response.json();
        if (result.success) {
            card.remove();
            const container = document.getElementById("evaluations-container");
            if (container.children.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <p>Aucune évaluation sauvegardée pour l'instant.</p>
                        <a href="/evaluer" class="btn-primary">Commencer une évaluation</a>
                    </div>
                `;
            }
        }
    });

    actions.appendChild(btnFiche);
    actions.appendChild(btnModifier);
    actions.appendChild(btnSupprimer);

    // Append actions to info, then info to card
    info.appendChild(actions);
    card.appendChild(photoWrapper);
    card.appendChild(info);

    return card;
}


function scoreColor(percentage) {
    if (percentage >= 75) return "#1e8449";
    if (percentage >= 50) return "#d35400";
    return "#c0392b";
}