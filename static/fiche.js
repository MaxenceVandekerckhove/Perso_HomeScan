// fiche.js
// Reads the evaluation result from sessionStorage and renders the summary page.

document.addEventListener("DOMContentLoaded", () => {
    const raw = sessionStorage.getItem("logement-eval-result");

    if (!raw) {
        document.getElementById("fiche-container").innerHTML =
            `<p class="loading">Aucune évaluation trouvée. 
            <a href="/">Retourner au formulaire</a></p>`;
        return;
    }

    const data = JSON.parse(raw);
    renderFiche(data);
});


function renderFiche(data) {
    const container = document.getElementById("fiche-container");
    container.innerHTML = "";

    container.appendChild(renderPropertyHeader(data));

    if (data.alerts.length > 0) {
        container.appendChild(renderAlerts(data.alerts));
    }

    container.appendChild(renderFamilyScores(data.familles));
    container.appendChild(renderDetails(data.familles));
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
    // Red warning block listing all unsatisfied redhibitoire criteria
    const block = document.createElement("div");
    block.classList.add("alerts-block");

    const title = document.createElement("h3");
    title.textContent = "⛔ Points rédhibitoires non satisfaits";
    block.appendChild(title);

    const list = document.createElement("ul");
    alerts.forEach(alert => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${alert.label}</strong> 
            <span class="alert-famille">${alert.familleLabel}</span>
            <span class="alert-value">${alert.displayValue}</span>`;
        list.appendChild(li);
    });

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