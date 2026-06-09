// fiche.js
// Reads the evaluation result from sessionStorage and renders the summary page.

document.addEventListener("DOMContentLoaded", async () => {
    const pathParts = window.location.pathname.split("/");
    const slug = pathParts[2];

    if (slug) {
        try {
            const response = await fetch(`/api/evaluations/${slug}`);
            const data = await response.json();

            if (data.error) {
                document.getElementById("fiche-container").innerHTML =
                    `<p class="loading">Évaluation introuvable. <a href="/">Retour à l'accueil</a></p>`;
                return;
            }

            if (data.photoUrl) {
                data.photoSrc = data.photoUrl;
            }

            renderFiche(data);

        } catch (err) {
            console.error("Failed to load evaluation:", err);
        }

    } else {
        const raw = sessionStorage.getItem("logement-eval-result");

        if (!raw) {
            document.getElementById("fiche-container").innerHTML =
                `<p class="loading">Aucune évaluation trouvée. <a href="/">Retour à l'accueil</a></p>`;
            return;
        }

        renderFiche(JSON.parse(raw));
    }
});

function cleanEtatText(value) {
    if (!value) return value;

    return value
        // enlève uniquement les emojis d'état
        .replace(/\s?[✅⚠️❌➖]\s?/g, " ")
        // nettoie les espaces multiples
        .replace(/\s+/g, " ")
        .trim();
}


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

    initActions(data);
}


/* =========================
   HEADER
========================= */

function renderPropertyHeader(data) {

    const card = document.createElement("div");
    card.classList.add("fiche-property-card");

    const img = document.createElement("img");
    img.classList.add("fiche-photo");
    img.alt = data.propertyName;

    img.src = (data.photoSrc && data.photoSrc !== window.location.href)
        ? data.photoSrc
        : "/static/house_placeholder.png";

    card.appendChild(img);

    const info = document.createElement("div");
    info.classList.add("fiche-property-info");

    const name = document.createElement("h2");
    name.textContent = data.propertyName;
    info.appendChild(name);

    if (data.propertyPrice) {
        const price = document.createElement("p");
        price.classList.add("property-price");
        price.textContent =
            parseInt(data.propertyPrice).toLocaleString("fr-FR") + " €";
        info.appendChild(price);
    }

    if (data.propertyUrl) {
        const link = document.createElement("a");
        link.href = data.propertyUrl;
        link.target = "_blank";
        link.textContent = "Voir l'annonce →";
        link.classList.add("listing-link");
        info.appendChild(link);
    }

    const pct = data.score.percentage;

    const scoreBlock = document.createElement("div");
    scoreBlock.classList.add("global-score");
    scoreBlock.innerHTML = `
        <span class="score-number" style="color:${scoreColor(pct)}">${pct}</span>
        <span class="score-label">/ 100</span>
    `;

    info.appendChild(scoreBlock);
    card.appendChild(info);

    return card;
}


/* =========================
   ALERTS
========================= */

function renderAlerts(alerts) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("alerts-wrapper");

    if (alerts.redhibitoires.length) {
        wrapper.appendChild(renderAlertBlock(
            "⛔ Points rédhibitoires non satisfaits",
            alerts.redhibitoires,
            "alert-block-red",
            null
        ));
    }

    if (alerts.faibles.length) {
        wrapper.appendChild(renderAlertBlock(
            "⚠️ Points faibles",
            alerts.faibles,
            "alert-block-orange",
            3
        ));
    }

    if (alerts.forts.length) {
        wrapper.appendChild(renderAlertBlock(
            "✅ Points forts",
            alerts.forts,
            "alert-block-green",
            3
        ));
    }

    return wrapper;
}


function stripEtatEmoji(value) {
    if (!value) return value;

    // suppression UNIQUEMENT des emojis d'états connus
    return value
        .replaceAll("✅", "")
        .replaceAll("⚠️", "")
        .replaceAll("❌", "")
        .replaceAll("➖", "")
        .trim();
}


function renderAlertBlock(title, items, cssClass, limit) {
    const block = document.createElement("div");
    block.classList.add("alert-block", cssClass);

    const h3 = document.createElement("h3");
    h3.textContent = title;
    block.appendChild(h3);

    const list = document.createElement("ul");

    const displayed = limit ? items.slice(0, limit) : items;

    displayed.forEach(item => {
        const li = document.createElement("li");

        li.innerHTML = `
            <strong>${item.label}</strong>
            <span class="alert-value">
                ${stripEtatEmoji(item.displayValue)}
            </span>
        `;

        list.appendChild(li);
    });

    if (limit && items.length > limit) {
        const more = document.createElement("li");
        more.classList.add("alert-more");
        more.textContent = `+ ${items.length - limit} autres…`;
        list.appendChild(more);
    }

    block.appendChild(list);
    return block;
}


/* =========================
   FAMILY SCORES
========================= */

function renderFamilyScores(familles) {
    const block = document.createElement("div");
    block.classList.add("family-scores-block");

    const title = document.createElement("h3");
    title.textContent = "Score par famille";
    block.appendChild(title);

    familles.forEach(famille => {
        if (famille.score === null) return;

        const row = document.createElement("div");
        row.classList.add("family-score-row");

        const label = document.createElement("span");
        label.classList.add("family-score-label");
        label.textContent = famille.label;

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


/* =========================
   DETAILS (inchangé sauf sécurité)
========================= */

function renderDetails(familles) {
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
                badge.textContent =
                    critere.importance.charAt(0).toUpperCase() +
                    critere.importance.slice(1);

                const label = document.createElement("span");
                label.classList.add("detail-label");
                label.textContent = critere.label;

                const value = document.createElement("span");
                value.classList.add("detail-value");
                value.textContent = cleanEtatText(critere.displayValue);
                
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


/* =========================
   SCORE COLOR
========================= */

function scoreColor(p) {
    if (p >= 75) return "#1e8449";
    if (p >= 50) return "#d35400";
    return "#c0392b";
}


/* =========================
   ACTIONS
========================= */

function initActions(data) {
    const btn = document.getElementById("btn-sauvegarder");

    const pathParts = window.location.pathname.split("/");
    const slugInUrl = pathParts[2];
    const comingFromForm = !!sessionStorage.getItem("logement-eval-result");

    if (slugInUrl && !comingFromForm) {
        btn.disabled = true;
        btn.title = "Aucune modification à sauvegarder";
    }

    btn.addEventListener("click", async () => {
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
                data.slug = result.slug;

                sessionStorage.setItem("logement-eval-slug", result.slug);

                setTimeout(() => {
                    sessionStorage.removeItem("logement-eval-result");
                    window.location.href = "/";
                }, 800);
            } else {
                btn.textContent = "❌ Erreur";
                btn.disabled = false;
            }
        } catch (err) {
            console.error(err);
            btn.textContent = "❌ Erreur";
            btn.disabled = false;
        }
    });

    document.getElementById("btn-modifier").addEventListener("click", () => {
        if (data.slug) {
            window.location.href = `/evaluer?slug=${data.slug}`;
        } else {
            window.location.href = "/evaluer";
        }
    });
}