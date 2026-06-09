// fiche.js
// Reads the evaluation result from sessionStorage and renders the summary page.

document.addEventListener("DOMContentLoaded", async () => {
    // Check if we're loading a saved evaluation from a URL slug
    // e.g. /fiche/maison-dupont
    const pathParts = window.location.pathname.split("/");
    const slug = pathParts[2]; // e.g. "maison-dupont"

    if (slug) {
        // Load from the server
        try {
            const response = await fetch(`/api/evaluations/${slug}`);
            const data = await response.json();

            if (data.error) {
                document.getElementById("fiche-container").innerHTML =
                    `<p class="loading">Évaluation introuvable. <a href="/">Retour à l'accueil</a></p>`;
                return;
            }

            // Restore the photo URL for display
            if (data.photoUrl) {
                data.photoSrc = data.photoUrl;
            }

            renderFiche(data);

        } catch (err) {
            console.error("Failed to load evaluation:", err);
        }

    } else {
        // Load from sessionStorage (coming from the form)
        const raw = sessionStorage.getItem("logement-eval-result");

        if (!raw) {
            document.getElementById("fiche-container").innerHTML =
                `<p class="loading">Aucune évaluation trouvée. <a href="/">Retour à l'accueil</a></p>`;
            return;
        }

        renderFiche(JSON.parse(raw));
    }
});


function renderFiche(data) {
    const container = document.getElementById("fiche-container");
    container.innerHTML = "";

    container.appendChild(renderPropertyHeader(data));

    if (
        data.alerts.redhibitoires.length > 0 ||
        data.alerts.faibles.length > 0 ||
        data.alerts.forts.length > 0
    ) {
        container.appendChild(renderAlerts(data.alerts));
    }

    container.appendChild(renderFamilyScores(data.familles));
    container.appendChild(renderDetails(data.familles));

    // Initialize save and edit buttons
    initActions(data);
}


function renderPropertyHeader(data) {
    // Top card: photo, name, price, global score, and listing link
    const card = document.createElement("div");
    card.classList.add("fiche-property-card");

    // Photo
    if (data.photoSrc && data.photoSrc !== window.location.href) {
        const img = document.createElement("img");
        img.src = data.photoSrc;
        img.classList.add("fiche-photo");
        img.alt = data.propertyName;
        card.appendChild(img);
    }

    // info must be declared before anything tries to append to it
    const info = document.createElement("div");
    info.classList.add("fiche-property-info");

    // Property name
    const name = document.createElement("h2");
    name.textContent = data.propertyName;
    info.appendChild(name);

    // Price — placed right after the name
    if (data.propertyPrice) {
        const price = document.createElement("p");
        price.classList.add("property-price");
        price.textContent = parseInt(data.propertyPrice).toLocaleString("fr-FR") + " €";
        info.appendChild(price);
    }

    // Listing URL
    if (data.propertyUrl) {
        const link = document.createElement("a");
        link.href = data.propertyUrl;
        link.target = "_blank";
        link.textContent = "Voir l'annonce →";
        link.classList.add("listing-link");
        info.appendChild(link);
    }

    // Global score
    const scoreBlock = document.createElement("div");
    scoreBlock.classList.add("global-score");
    const pct = data.score.percentage;
    scoreBlock.innerHTML = `
        <span class="score-number" style="color: ${scoreColor(pct)}">${pct}</span>
        <span class="score-label">/ 100</span>
    `;
    info.appendChild(scoreBlock);

    card.appendChild(info);
    return card;
}


function renderAlerts(alerts) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("alerts-wrapper");

    // --- Redhibitoires — all shown ---
    if (alerts.redhibitoires.length > 0) {
        wrapper.appendChild(renderAlertBlock(
            "⛔ Points rédhibitoires non satisfaits",
            alerts.redhibitoires,
            "alert-block-red",
            null  // no limit
        ));
    }

    // --- Weak points — max 3 ---
    if (alerts.faibles.length > 0) {
        wrapper.appendChild(renderAlertBlock(
            "⚠️ Points faibles",
            alerts.faibles,
            "alert-block-orange",
            3
        ));
    }

    // --- Strong points — max 3 ---
    if (alerts.forts.length > 0) {
        wrapper.appendChild(renderAlertBlock(
            "✅ Points forts",
            alerts.forts,
            "alert-block-green",
            3
        ));
    }

    return wrapper;
}


function renderAlertBlock(title, items, cssClass, limit) {
    const block = document.createElement("div");
    block.classList.add("alert-block", cssClass);

    const h3 = document.createElement("h3");
    h3.textContent = title;
    block.appendChild(h3);

    const list = document.createElement("ul");

    // Apply limit if defined
    const displayed = limit ? items.slice(0, limit) : items;

    displayed.forEach(item => {
        const li = document.createElement("li");
        li.innerHTML = `
            <strong>${item.label}</strong>
            <span class="alert-value">${item.displayValue}</span>
        `;
        list.appendChild(li);
    });

    // Show how many are hidden if limit is applied
    if (limit && items.length > limit) {
        const more = document.createElement("li");
        more.classList.add("alert-more");
        more.textContent = `+ ${items.length - limit} autres…`;
        list.appendChild(more);
    }

    block.appendChild(list);
    return block;
}


function renderFamilyScores(familles) {
    // Summary bar chart — one row per family with a visual score bar
    const block = document.createElement("div");
    block.classList.add("family-scores-block");

    const title = document.createElement("h3");
    title.textContent = "Score par famille";
    block.appendChild(title);

    familles.forEach(famille => {
        if (famille.score === null) return; // skip unevaluated families

        const row = document.createElement("div");
        row.classList.add("family-score-row");

        const label = document.createElement("span");
        label.classList.add("family-score-label");
        label.textContent = `${famille.emoji} ${famille.label}`;

        const barWrapper = document.createElement("div");
        barWrapper.classList.add("score-bar-wrapper");

        const bar = document.createElement("div");
        bar.classList.add("score-bar");
        bar.style.width = `${famille.score}%`;
        bar.style.background = scoreColor(famille.score);

        const scoreText = document.createElement("span");
        scoreText.classList.add("family-score-value");
        scoreText.textContent = `${famille.score} / 100`;

        barWrapper.appendChild(bar);
        row.appendChild(label);
        row.appendChild(barWrapper);
        row.appendChild(scoreText);
        block.appendChild(row);
    });

    return block;
}


function renderDetails(familles) {
    // Full detail section — all families, categories, and criteria
    const block = document.createElement("div");
    block.classList.add("details-block");

    const title = document.createElement("h3");
    title.textContent = "Détail de l'évaluation";
    block.appendChild(title);

    familles.forEach(famille => {
        const familleEl = document.createElement("div");
        familleEl.classList.add("detail-famille");

        const familleTitle = document.createElement("h4");
        familleTitle.textContent = `${famille.emoji} ${famille.label}`;
        familleEl.appendChild(familleTitle);

        famille.categories.forEach(categorie => {
            const catEl = document.createElement("div");
            catEl.classList.add("detail-categorie");

            const catTitle = document.createElement("h5");
            catTitle.textContent = `${categorie.emoji} ${categorie.label}`;
            catEl.appendChild(catTitle);

            categorie.criteres.forEach(critere => {
                const row = document.createElement("div");
                row.classList.add("detail-row");

                const badge = document.createElement("span");
                badge.classList.add("importance-badge", `badge-${critere.importance}`);
                badge.textContent = critere.importance.charAt(0).toUpperCase()
                    + critere.importance.slice(1);

                const label = document.createElement("span");
                label.classList.add("detail-label");
                label.textContent = critere.label;

                const value = document.createElement("span");
                value.classList.add("detail-value");
                value.textContent = critere.displayValue;

                row.appendChild(badge);
                row.appendChild(label);
                row.appendChild(value);
                catEl.appendChild(row);
            });

            familleEl.appendChild(catEl);
        });

        block.appendChild(familleEl);
    });

    return block;
}


function scoreColor(percentage) {
    if (percentage >= 75) return "#1e8449";
    if (percentage >= 50) return "#d35400";
    return "#c0392b";
}

// ===== SAVE & EDIT ACTIONS =====

function initActions(data) {
    // --- Save button ---
    document.getElementById("btn-sauvegarder").addEventListener("click", async () => {
        const btn = document.getElementById("btn-sauvegarder");
        btn.disabled = true;
        btn.textContent = "Sauvegarde…";

        try {
            const response = await fetch("/api/sauvegarder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                btn.textContent = "✅ Sauvegardé";
                // Update the slug in data in case it was just created
                data.slug = result.slug;
                sessionStorage.setItem("logement-eval-slug", result.slug);
            } else {
                btn.textContent = "❌ Erreur";
                btn.disabled = false;
            }
        } catch (err) {
            console.error("Save failed:", err);
            btn.textContent = "❌ Erreur";
            btn.disabled = false;
        }
    });

    // --- Edit button ---
    document.getElementById("btn-modifier").addEventListener("click", () => {
        // If the evaluation has a slug, redirect to the edit URL
        // Otherwise go back to a blank form
        if (data.slug) {
            window.location.href = `/evaluer?slug=${data.slug}`;
        } else {
            window.location.href = "/evaluer";
        }
    });
}