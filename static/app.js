// app.js
// Dynamically builds the evaluation form from criteres.json data.


// ===== CONSTANTS =====

// Points awarded based on importance level (matches criteres.json logic)
const IMPORTANCE_POINTS = {
    redhibitoire: 30,
    essentiel: 20,
    important: 8,
    bonus: 4
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
    initPhotoPreview();
    initSubmitButton();
});

// ===== DATA LOADING =====

async function loadCriteres() {
    try {
        const response = await fetch("/api/criteres");
        const data = await response.json();
        window.criteresData = data;
        buildForm(data);

        // Check if we're editing a saved evaluation from a slug in the URL
        const params = new URLSearchParams(window.location.search);
        const slug = params.get("slug");

        if (slug) {
            // Load from the server and pre-fill
            const evalResponse = await fetch(`/api/evaluations/${slug}`);
            const evalData = await evalResponse.json();
            // Store in sessionStorage so prefillForm() can use it
            sessionStorage.setItem("logement-eval-result", JSON.stringify(evalData));
        }

        prefillForm();

    } catch (error) {
        document.getElementById("form-container").innerHTML =
            "<p>Erreur lors du chargement des critères.</p>";
        console.error("Failed to load criteres:", error);
    }
}


// ===== FORM BUILDER =====

function buildForm(data) {
    const container = document.getElementById("form-container");
    container.innerHTML = "";

    data.familles.forEach(famille => {
        const section = buildFamilySection(famille);
        container.appendChild(section);
    });

    applyConditions();
    applyAutoCompletions();
    attachChangeListeners();
    updateScoreDisplay(); // initialize the display
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
    const select = document.createElement("select");
    select.id = critere.id;
    select.name = critere.id;
    select.classList.add("note-select");

    const noteLabels = window.criteresData.note_labels;

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "— Non évalué —";
    select.appendChild(defaultOption);

    for (let i = 1; i <= 5; i++) {
        const opt = document.createElement("option");
        opt.value = i;
        opt.dataset.score = (i - 1) / 4;
        // Use String(i) to correctly match the string keys in note_labels
        opt.textContent = noteLabels[String(i)];
        select.appendChild(opt);
    }

    return select;
}

// ===== CONDITIONS =====

function applyConditions() {
    // Hide or show categories and criteria based on their "condition" field.
    // A condition means: only show this element if another criterion has value "satisfait".

    const data = window.criteresData;

    data.familles.forEach(famille => {
        famille.categories.forEach(categorie => {

            // --- Category-level condition ---
            if (categorie.condition) {
                const conditionMet = isCritereSatisfait(categorie.condition.critere_id);
                const block = document.querySelector(
                    `.category-block[data-categorie-id="${categorie.id}"]`
                );
                if (block) {
                    // Show or hide the entire category block
                    block.style.display = conditionMet ? "block" : "none";
                }
            }

            // --- Criterion-level condition ---
            categorie.criteres.forEach(critere => {
                if (critere.condition) {
                    const conditionMet = isCritereSatisfait(critere.condition.critere_id);
                    const row = document.querySelector(
                        `.critere-row[data-critere-id="${critere.id}"]`
                    );
                    if (row) {
                        row.style.display = conditionMet ? "flex" : "none";
                    }
                }
            });

        });
    });
}


function isCritereSatisfait(critereId, valeursAcceptees = null) {
    // Returns true if the given criterion is considered "satisfied".
    // - If valeurs_acceptees is provided: value must be in that list
    // - For etat fields: must be explicitly set to "satisfait"
    // - For other fields: any non-empty value counts
    const input = document.getElementById(critereId);
    if (!input) return false;

    // If specific accepted values are defined, check against them
    if (valeursAcceptees) {
        return valeursAcceptees.includes(input.value);
    }

    const hasEtatOptions = input.querySelector('option[value="satisfait"]') !== null;
    if (hasEtatOptions) {
        return input.value === "satisfait";
    } else {
        return input.value !== "";
    }
}


// ===== AUTO-COMPLETIONS =====

function applyAutoCompletions() {
    // Automatically fill certain criteria when their conditions are all met.
    // Each auto_complete defines an operator (ET/OU) and a list of conditions.

    const data = window.criteresData;

    data.familles.forEach(famille => {
        famille.categories.forEach(categorie => {
            categorie.criteres.forEach(critere => {

                if (!critere.auto_complete) return; // skip if no auto_complete defined

                const { operateur, conditions } = critere.auto_complete;
                const input = document.getElementById(critere.id);
                if (!input) return;

                // Evaluate each condition in the list
                const results = conditions.map(cond =>
                    isCritereSatisfait(cond.critere_id, cond.valeurs_acceptees || null)
                );

                // ET = all conditions must be true
                // OU = at least one condition must be true
                const allMet = operateur === "ET"
                    ? results.every(Boolean)
                    : results.some(Boolean);

                if (allMet) {
                    // Auto-fill and visually lock the field
                    input.value = "satisfait";
                    input.disabled = true;
                    input.title = "Rempli automatiquement";
                } else {
                    // Reset and unlock if conditions are no longer met
                    input.disabled = false;
                    input.title = "";
                    // Only reset if it was previously auto-filled
                    // (don't overwrite a value the user set manually)
                    if (input.dataset.autoFilled === "true") {
                        input.value = "";
                    }
                }

                // Track whether this field is currently auto-filled
                input.dataset.autoFilled = allMet ? "true" : "false";
            });
        });
    });
}


// ===== EVENT LISTENERS =====

function attachChangeListeners() {
    const container = document.getElementById("form-container");

    container.addEventListener("change", () => {
        applyConditions();
        applyAutoCompletions();
        updateScoreDisplay(); // recalculate on every change
    });
}

// ===== SCORING =====

function calculateScore() {
    // Calculate the global score across all evaluated criteria.
    // Returns an object with totalObtained, totalMax, and a 0-100 score.

    let totalObtained = 0;
    let totalMax = 0;

    const data = window.criteresData;

    data.familles.forEach(famille => {
        famille.categories.forEach(categorie => {

            // Skip hidden categories (conditional ones not yet unlocked)
            const categoryBlock = document.querySelector(
                `.category-block[data-categorie-id="${categorie.id}"]`
            );
            if (categoryBlock && categoryBlock.style.display === "none") return;

            categorie.criteres.forEach(critere => {

                // Skip hidden criteria
                const row = document.querySelector(
                    `.critere-row[data-critere-id="${critere.id}"]`
                );
                if (row && row.style.display === "none") return;

                const input = document.getElementById(critere.id);
                if (!input || input.value === "") return; // skip unevaluated

                const pointsMax = IMPORTANCE_POINTS[critere.importance];
                const typeReponse = critere.type_reponse || "etat";

                let obtained = 0;
                let counts = true; // whether this criterion counts toward totalMax

                if (typeReponse === "etat") {
                    const multiplier = ETAT_MULTIPLIERS[input.value];

                    // non_applicable: exclude from scoring entirely
                    if (multiplier === null) {
                        counts = false;
                    } else {
                        obtained = pointsMax * multiplier;
                    }

                } else if (typeReponse === "note") {
                    // Score is stored in the selected option's dataset
                    const selectedOption = input.options[input.selectedIndex];
                    const score = parseFloat(selectedOption.dataset.score);
                    obtained = pointsMax * score;

                } else {
                    // choix_unique, intervalle, nombre
                    const selectedOption = input.options[input.selectedIndex];
                    const score = parseFloat(selectedOption.dataset.score);
                    obtained = pointsMax * score;
                }

                if (counts) {
                    totalObtained += obtained;
                    totalMax += pointsMax;
                }
            });
        });
    });

    // Avoid division by zero if nothing is evaluated yet
    const percentage = totalMax > 0
        ? Math.round((totalObtained / totalMax) * 100)
        : null;

    return { totalObtained, totalMax, percentage };
}


function updateScoreDisplay() {
    // Recalculate and update the score shown in the bottom bar.
    const { percentage } = calculateScore();
    const display = document.getElementById("score-display");

    if (percentage === null) {
        display.textContent = "—";
        display.style.color = "#2c3e50";
    } else {
        display.textContent = `${percentage} / 100`;
        // Color the score based on its value
        display.style.color = scoreColor(percentage);
    }
}


function scoreColor(percentage) {
    // Returns a color hex code based on the score range.
    if (percentage >= 75) return "#1e8449"; // green
    if (percentage >= 50) return "#d35400"; // orange
    return "#c0392b";                        // red
}

// ===== PHOTO PREVIEW =====

function initPhotoPreview() {
    // Handle photo input via three methods:
    // 1. Classic file picker (click)
    // 2. Drag and drop onto the drop zone
    // 3. Paste from clipboard (Ctrl+V)

    const input = document.getElementById("property-photo");
    const dropzone = document.getElementById("photo-dropzone");
    const preview = document.getElementById("photo-preview");
    const hint = document.getElementById("dropzone-hint");

    // --- 1. Classic file picker ---
    input.addEventListener("change", () => {
        if (input.files[0]) showPreview(input.files[0]);
    });

    // --- 2. Drag and drop ---

    // Needed to allow dropping (browser blocks drop by default)
    dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.classList.add("drag-over");
    });

    dropzone.addEventListener("dragleave", () => {
        dropzone.classList.remove("drag-over");
    });

    dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("drag-over");

        // Look for an image file in the dropped items
        const file = [...e.dataTransfer.items]
            .find(item => item.type.startsWith("image/"))
            ?.getAsFile();

        if (file) showPreview(file);
    });

    // --- 3. Paste from clipboard ---
    document.addEventListener("paste", (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.startsWith("image/")) {
                showPreview(item.getAsFile());
                break;
            }
        }
    });

    // --- Preview helper ---
    function showPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
            preview.style.display = "block";
            hint.style.display = "none"; // hide the hint once a photo is set
        };
        reader.readAsDataURL(file);
    }
}

// ===== FORM SUBMISSION =====

function initSubmitButton() {
    // On click, collect all form data and store it in sessionStorage,
    // then navigate to the summary page.

    document.getElementById("submit-btn").addEventListener("click", () => {
        const data = collectFormData();

        if (data.evaluatedCount === 0) {
            alert("Veuillez évaluer au moins un critère avant de continuer.");
            return;
        }

        // Store the snapshot in sessionStorage (cleared when tab is closed)
        sessionStorage.setItem("logement-eval-result", JSON.stringify(data));

        // Navigate to the summary page
        window.location.href = "/fiche";
    });
}


function collectFormData() {
    // Collect all form values and compute scores per family.
    // Returns a structured object ready to be displayed on the fiche page.

    const criteresData = window.criteresData;

    // Only store photoSrc if a photo is actually displayed
    const photoPreview = document.getElementById("photo-preview");
    const photoSrcRaw = photoPreview.src || "";

    // If the photo is still the server-saved version (URL, not base64),
    // pass back only the filename — no need to re-upload the image file.
    const isExistingPhoto = photoSrcRaw.includes("/evaluations/");
    const photoSrc = photoSrcRaw.startsWith("data:image")
        ? photoSrcRaw      // new photo selected: send as base64
        : isExistingPhoto
            ? photoSrcRaw  // existing photo: keep the URL so fiche.js can display it
            : null;

    // Recover the saved filename and slug if available (set by prefillForm)
    const photoFilename = photoPreview.dataset.photoFilename || null;
    const existingSlug = photoPreview.dataset.photoSlug || null;

    const result = {
        propertyName: document.getElementById("property-name").value || "Bien sans nom",
        propertyUrl: document.getElementById("property-url").value || null,
        propertyPrice: document.getElementById("property-price").value || null,
        photoSrc: photoSrc,
        photoFilename: photoFilename,
        slug: existingSlug,
        score: calculateScore(),
        familles: [],
        formValues: {}, // flat map of all raw input values — used to pre-fill the form on edit
        alerts: {
            redhibitoires: [],  // all unsatisfied redhibitoire criteria
            faibles: [],        // score < 0.5, non-bonus criteria
            forts: []           // score = 1.0, non-bonus criteria
        }
    };

    let evaluatedCount = 0;

    criteresData.familles.forEach(famille => {

        const familleResult = {
            id: famille.id,
            label: famille.label,
            emoji: famille.emoji,
            score: null,
            totalObtained: 0,
            totalMax: 0,
            categories: []
        };

        famille.categories.forEach(categorie => {

            // Skip hidden categories
            const block = document.querySelector(
                `.category-block[data-categorie-id="${categorie.id}"]`
            );
            if (block && block.style.display === "none") return;

            const categorieResult = {
                id: categorie.id,
                label: categorie.label,
                emoji: categorie.emoji,
                criteres: []
            };

            categorie.criteres.forEach(critere => {

                // Skip hidden criteria
                const row = document.querySelector(
                    `.critere-row[data-critere-id="${critere.id}"]`
                );
                if (row && row.style.display === "none") return;

                const input = document.getElementById(critere.id);
                if (!input) return;

                const value = input.value;
                const typeReponse = critere.type_reponse || "etat";
                const pointsMax = IMPORTANCE_POINTS[critere.importance];

                // Store every non-empty raw value in the flat map
                if (value !== "") result.formValues[critere.id] = value;

                let obtained = 0;
                let counts = true;
                let displayValue = "—";

                if (value === "") {
                    counts = false;
                    displayValue = "Non évalué";
                } else if (typeReponse === "etat") {
                    const multiplier = ETAT_MULTIPLIERS[value];
                    const etatsData = criteresData.etat_valeurs[value];
                    displayValue = `${etatsData.emoji} ${etatsData.label}`;

                    if (multiplier === null) {
                        counts = false;
                    } else {
                        obtained = pointsMax * multiplier;
                    }
                } else {
                    const selectedOption = input.options[input.selectedIndex];
                    const score = parseFloat(selectedOption.dataset.score);
                    obtained = pointsMax * score;
                    displayValue = selectedOption.textContent;
                }

                if (counts && value !== "") {
                    familleResult.totalObtained += obtained;
                    familleResult.totalMax += pointsMax;
                    evaluatedCount++;
                }

                // --- Alerts ---

                const isBelowHalf = counts && obtained < pointsMax * 0.5;
                const isPerfect = counts && obtained === pointsMax;
                const isBonus = critere.importance === "bonus";

                // Unsatisfied redhibitoire — all of them
                if (
                    critere.importance === "redhibitoire" &&
                    value !== "" &&
                    counts &&
                    obtained === 0
                ) {
                    result.alerts.redhibitoires.push({
                        label: critere.label,
                        familleLabel: famille.label,
                        displayValue
                    });
                }

                // Weak points — score below 50%, excluding bonus, excluding redhibitoires at 0
                if (
                    !isBonus &&
                    value !== "" &&
                    counts &&
                    isBelowHalf &&
                    obtained > 0
                ) {
                    result.alerts.faibles.push({
                        label: critere.label,
                        familleLabel: famille.label,
                        importance: critere.importance,
                        displayValue
                    });
                }

                // Strong points — perfect score, excluding bonus
                if (!isBonus && value !== "" && isPerfect) {
                    result.alerts.forts.push({
                        label: critere.label,
                        familleLabel: famille.label,
                        importance: critere.importance,
                        displayValue
                    });
                }

                categorieResult.criteres.push({
                    id: critere.id,
                    label: critere.label,
                    importance: critere.importance,
                    displayValue,
                    obtained: counts ? obtained : null,
                    max: counts ? pointsMax : null
                });
            });

            if (categorieResult.criteres.length > 0) {
                familleResult.categories.push(categorieResult);
            }
        });

        // Compute family-level percentage
        if (familleResult.totalMax > 0) {
            familleResult.score = Math.round(
                (familleResult.totalObtained / familleResult.totalMax) * 100
            );
        }

        result.familles.push(familleResult);
    });

    result.evaluatedCount = evaluatedCount;
    return result;
}

// ===== FORM PRE-FILL =====

function prefillForm() {
    // Check if there is evaluation data in sessionStorage.
    // If so, pre-fill all form fields with the saved values.

    const raw = sessionStorage.getItem("logement-eval-result");
    if (!raw) return;

    const data = JSON.parse(raw);

    // --- Property header fields ---
    if (data.propertyName) {
        document.getElementById("property-name").value = data.propertyName;
    }
    if (data.propertyUrl) {
        document.getElementById("property-url").value = data.propertyUrl;
    }
    if (data.propertyPrice) {
        document.getElementById("property-price").value = data.propertyPrice;
    }

    // --- Photo preview ---
    const preview = document.getElementById("photo-preview");
    const hint = document.getElementById("dropzone-hint");

    if (data.photoFilename && data.slug) {
        // Photo already saved on disk — load from server
        preview.src = `/evaluations/${data.slug}/${data.photoFilename}`;
        preview.style.display = "block";
        hint.style.display = "none";

        preview.dataset.photoFilename = data.photoFilename;
        preview.dataset.photoSlug = data.slug;
    } else if (data.photoSrc) {
            // Photo not yet saved — use base64 from sessionStorage
        preview.src = data.photoSrc;
        preview.style.display = "block";
        hint.style.display = "none";
    }

    // --- Criteria fields ---
    // Use the flat formValues map for reliable pre-filling
    if (!data.formValues) return;

    Object.entries(data.formValues).forEach(([critereId, value]) => {
        const input = document.getElementById(critereId);
        if (!input) return;
        input.value = value;
    });

    // Re-apply conditions and score after pre-filling
    applyConditions();
    applyAutoCompletions();
    updateScoreDisplay();
}