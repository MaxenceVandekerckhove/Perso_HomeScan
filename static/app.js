// app.js
// Dynamically builds the evaluation form from criteres.json data.


// ===== CONSTANTS =====

// Points awarded based on importance level (matches criteres.json logic)
const IMPORTANCE_POINTS = {
    redhibitoire: 20,
    essentiel: 12,
    important: 7,
    bonus: 3
};

// Multiplier applied to points based on the satisfaction state
const ETAT_MULTIPLIERS = {
    satisfait: 1.0,
    partiel: 0.5,
    non_satisfait: 0.0,
    non_applicable: null  // excluded from scoring entirely
};


// ===== ENTRY POINT =====

// Wait for the page to be fully loaded before doing anything
document.addEventListener("DOMContentLoaded", () => {
    loadCriteres();
});


// ===== DATA LOADING =====

async function loadCriteres() {
    try {
        // Fetch the criteria data from our Flask API
        const response = await fetch("/api/criteres");
        const data = await response.json();

        // Store the full data globally so other functions can access it later
        window.criteresData = data;

        // Build the form from the loaded data
        buildForm(data);

    } catch (error) {
        document.getElementById("form-container").innerHTML =
            "<p>Erreur lors du chargement des critères.</p>";
        console.error("Failed to load criteres:", error);
    }
}


// ===== FORM BUILDER =====

function buildForm(data) {
    const container = document.getElementById("form-container");
    container.innerHTML = ""; // clear the loading message

    // Loop through each family (e.g. "Localisation", "Structure"…)
    data.familles.forEach(famille => {
        const section = buildFamilySection(famille);
        container.appendChild(section);
    });
}


function buildFamilySection(famille) {
    // Create the <section> block for one family
    const section = document.createElement("section");
    section.classList.add("family-section");
    section.dataset.familleId = famille.id;

    // Family title
    const title = document.createElement("h2");
    title.classList.add("family-title");
    title.textContent = `${famille.emoji} ${famille.label}`;
    section.appendChild(title);

    // Loop through categories inside this family
    famille.categories.forEach(categorie => {
        const block = buildCategoryBlock(categorie);
        section.appendChild(block);
    });

    return section;
}


function buildCategoryBlock(categorie) {
    // Create the white card block for one category
    const block = document.createElement("div");
    block.classList.add("category-block");
    block.dataset.categorieId = categorie.id;

    // Category title
    const title = document.createElement("h3");
    title.classList.add("category-title");
    title.textContent = `${categorie.emoji} ${categorie.label}`;
    block.appendChild(title);

    // Loop through criteria inside this category
    categorie.criteres.forEach(critere => {
        const row = buildCritereRow(critere);
        block.appendChild(row);
    });

    return block;
}


function buildCritereRow(critere) {
    // Create one row for a single criterion
    const row = document.createElement("div");
    row.classList.add("critere-row");
    row.dataset.critereId = critere.id;

    // --- Left side: label + importance badge ---
    const labelWrapper = document.createElement("div");
    labelWrapper.classList.add("critere-label");

    const labelText = document.createElement("span");
    labelText.textContent = critere.label;

    const badge = document.createElement("span");
    badge.classList.add("importance-badge", `badge-${critere.importance}`);
    // Display the emoji from the JSON importance levels
    const importanceInfo = window.criteresData.importance_niveaux[critere.importance];
    badge.textContent = `${importanceInfo.emoji} ${importanceInfo.label}`;

    labelWrapper.appendChild(labelText);
    labelWrapper.appendChild(badge);

    // --- Right side: input control ---
    const inputWrapper = document.createElement("div");
    inputWrapper.classList.add("critere-input");

    // Build the appropriate input based on type_reponse
    // If no type_reponse is defined, default to a simple etat selector
    const typeReponse = critere.type_reponse || "etat";
    const input = buildInput(critere, typeReponse);
    inputWrapper.appendChild(input);

    row.appendChild(labelWrapper);
    row.appendChild(inputWrapper);

    return row;
}


// ===== INPUT BUILDERS =====

function buildInput(critere, typeReponse) {
    // Route to the correct input builder based on type_reponse
    switch (typeReponse) {
        case "choix_unique":
        case "intervalle":
            // Both are rendered as a <select> with scored options
            return buildSelectInput(critere);

        case "nombre":
            // Rendered as a <select> with numeric options
            return buildSelectInput(critere);

        case "note":
            // Rendered as a 1–5 star/number selector
            return buildNoteInput(critere);

        case "etat":
        default:
            // Rendered as a simple satisfied/partial/unsatisfied selector
            return buildEtatInput(critere);
    }
}


function buildEtatInput(critere) {
    // Simple <select> with the four possible etat values
    const select = document.createElement("select");
    select.id = critere.id;
    select.name = critere.id;

    const etats = window.criteresData.etat_valeurs;

    // Add a blank default option
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "— Non évalué —";
    select.appendChild(defaultOption);

    // Add one option per etat value
    Object.entries(etats).forEach(([valeur, info]) => {
        const option = document.createElement("option");
        option.value = valeur;
        option.textContent = `${info.emoji} ${info.label}`;
        select.appendChild(option);
    });

    return select;
}


function buildSelectInput(critere) {
    // <select> built from the options array defined in the criterion
    const select = document.createElement("select");
    select.id = critere.id;
    select.name = critere.id;

    // Add a blank default option
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "— Non évalué —";
    select.appendChild(defaultOption);

    // Add one option per entry in critere.options
    critere.options.forEach(option => {
        const opt = document.createElement("option");
        opt.value = option.valeur;
        opt.dataset.score = option.score; // store the score for later calculation
        opt.textContent = option.label;
        select.appendChild(opt);
    });

    return select;
}


function buildNoteInput(critere) {
    // <select> with values 1 to 5, using note_labels from the JSON
    const select = document.createElement("select");
    select.id = critere.id;
    select.name = critere.id;
    select.classList.add("note-select");

    const noteLabels = window.criteresData.note_labels;

    // Add a blank default option
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "— Non évalué —";
    select.appendChild(defaultOption);

    // Add options 1 to 5
    for (let i = 1; i <= 5; i++) {
        const opt = document.createElement("option");
        opt.value = i;
        // Score is normalized: note 1 = 0.0, note 5 = 1.0
        opt.dataset.score = (i - 1) / 4;
        opt.textContent = `${i} — ${noteLabels[i]}`;
        select.appendChild(opt);
    }

    return select;
}