const GAS_URL = "https://script.google.com/macros/s/AKfycbx_FI6eN8AONYMFqtBFF792ymRvmFdZSrfkMICwKbgvp2ExavZWIAK72P5Vdsy8FSQrGA/exec";
const GA_MEASUREMENT_ID = "G-Y6NQ4G486W";
const GOOGLE_MAPS_EMBED_URL = "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d10969.609170720607!2d20.6672226!3d46.579284!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47443f2d22d977cf%3A0xd12daeff6b3b374d!2sStrassenreiter%20Attila%20Villanyszerel%C5%91%20E.V.!5e0!3m2!1shu!2hu!4v1772120210144!5m2!1shu!2hu";
let currentOfferId = "";
let analyticsLoaded = false;
let reviewsLoaded = false;
let activePageRequest = null;

const CONTENT_PAGES = new Set([
"rolam.html",
    "szolgaltatasok.html",
    "arlista.html",
    "galeria.html",
    "kapcsolat.html",
    "kalkulator.html",
    "impresszum.html",
    "adatkezeles.html",
    "cookie.html",
    "blog.html",
    "videok.html"
]);;

const PDF_HEADER_LOGO_PATH = "icons/fejlec.png";
let pdfHeaderLogoCache = null;
const SCRIPT_LOAD_TIMEOUT = 12000;
const PAGE_META = {
"rolam.html": {
        title: "Villanyszerelő Orosháza – Rólam | StraVill",
        description: "Ismerje meg StraVill – Strassenreiter Attila egyéni vállalkozó villanyszerelő szolgáltatásait Orosházán és környékén.",
        canonical: "https://www.stravill.hu/#rolam.html"
    },
    "szolgaltatasok.html": {
        title: "Szolgáltatások | StraVill villanyszerelő Orosháza",
        description: "Villanyszerelési szolgáltatások Orosházán: hibakeresés, szerelvénycsere, hálózat kiépítés, gépbekötés és felújítás.",
        canonical: "https://www.stravill.hu/#szolgaltatasok.html"
    },
    "arlista.html": {
        title: "Árlista | StraVill villanyszerelő Orosháza",
        description: "Tájékoztató villanyszerelési árak Orosházán és környékén: konnektorcsere, lámpaszerelés, hibajavítás, hálózat felújítás.",
        canonical: "https://www.stravill.hu/#arlista.html"
    },
    "galeria.html": {
        title: "Galéria | StraVill villanyszerelő Orosháza",
        description: "Korábbi villanyszerelési munkák és referenciák képekben Orosházán és környékén.",
        canonical: "https://www.stravill.hu/#galeria.html"
    },
    "kapcsolat.html": {
        title: "Kapcsolat | StraVill villanyszerelő Orosháza",
        description: "Vegye fel a kapcsolatot StraVill – Strassenreiter Attila villanyszerelővel Orosházán. Telefon, e-mail, cím és üzenetküldés.",
        canonical: "https://www.stravill.hu/#kapcsolat.html"
    },
    "kalkulator.html": {
        title: "Kalkulátor és ajánlatkérés | StraVill",
        description: "Villanyszerelési kalkulátor és ajánlatkérés Orosházán. Számolja ki a várható költségeket, majd kérjen ajánlatot online.",
        canonical: "https://www.stravill.hu/#kalkulator.html"
    },
    "impresszum.html": {
        title: "Impresszum | StraVill",
        description: "StraVill impresszum és vállalkozási adatok.",
        canonical: "https://www.stravill.hu/#impresszum.html"
    },
    "adatkezeles.html": {
        title: "Adatkezelési tájékoztató | StraVill",
        description: "StraVill adatkezelési tájékoztató: személyes adatok kezelése, jogalapok, adatfeldolgozók és érintetti jogok.",
        canonical: "https://www.stravill.hu/#adatkezeles.html"
    },
    "cookie.html": {
        title: "Cookie tájékoztató | StraVill",
        description: "StraVill cookie tájékoztató: sütik, helyi tárhely, hozzájárulás-kezelés és külső szolgáltatások ismertetése.",
        canonical: "https://www.stravill.hu/#cookie.html"
    }
,
"blog.html": {
    title: "Blog | StraVill",
    description: "StraVill blog: tippek, tudnivalók és villanyszerelési bejegyzések.",
    canonical: "https://www.stravill.hu/#blog.html"
},
"videok.html": {
    title: "Videók | StraVill",
    description: "StraVill videók: villanyszerelési munkák, bemutatók és rövid tartalmak.",
    canonical: "https://www.stravill.hu/#videok.html"
}

};

function setMetaContent(selector, value, attribute = "content") {
    const element = document.querySelector(selector);
    if (!element || !value) return;
    element.setAttribute(attribute, value);
}

function updatePageMeta(page) {
    const meta = PAGE_META[page] || PAGE_META["rolam.html"];
    document.title = meta.title;
    setMetaContent('meta[name="description"]', meta.description);
    setMetaContent('meta[property="og:title"]', meta.title);
    setMetaContent('meta[property="og:description"]', meta.description);
    setMetaContent('meta[name="twitter:title"]', meta.title);
    setMetaContent('meta[name="twitter:description"]', meta.description);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical && meta.canonical) canonical.setAttribute('href', meta.canonical);
}


function getStorage() {
    try {
        return window.localStorage;
    } catch (error) {
        console.warn("A localStorage nem elérhető ebben a böngészőben vagy módban.", error);
        return null;
    }
}

function safeStorageSet(key, value) {
    const storage = getStorage();
    if (!storage) return false;
    try {
        storage.setItem(key, value);
        return true;
    } catch (error) {
        console.warn(`Nem sikerült menteni ezt a kulcsot: ${key}`, error);
        return false;
    }
}

function safeStorageGet(key) {
    const storage = getStorage();
    if (!storage) return null;
    try {
        return storage.getItem(key);
    } catch (error) {
        console.warn(`Nem sikerült kiolvasni ezt a kulcsot: ${key}`, error);
        return null;
    }
}

function safeStorageRemove(key) {
    const storage = getStorage();
    if (!storage) return false;
    try {
        storage.removeItem(key);
        return true;
    } catch (error) {
        console.warn(`Nem sikerült törölni ezt a kulcsot: ${key}`, error);
        return false;
    }
}

function normalizePdfText(value) {
    return String(value || "")
        .replace(/[–—]/g, "-")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
}

function escapePdfText(value) {
    return String(value || "").replace(/[–—]/g, "-");
}

function getSafePdfText(value, useUnicodeFont = true) {
    return useUnicodeFont ? escapePdfText(value) : normalizePdfText(value);
}

async function getPdfHeaderLogo() {
    if (pdfHeaderLogoCache !== null) return pdfHeaderLogoCache;
    try {
        const response = await fetch(`${PDF_HEADER_LOGO_PATH}?v=20260313`);
        if (!response.ok) throw new Error("Logo fetch failed");
        const blob = await response.blob();
        pdfHeaderLogoCache = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.warn("A PDF fejléc logó nem tölthető be.", error);
        pdfHeaderLogoCache = "";
    }
    return pdfHeaderLogoCache;
}

function $(selector, root = document) {
    return root.querySelector(selector);
}

function $$(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
}

function updateHeaderOffset() {
    const header = $(".fixed-header");
    const offset = header ? Math.ceil(header.offsetHeight + 12) : 108;
    document.documentElement.style.setProperty("--header-offset", `${offset}px`);
    return offset;
}

function getHeaderOffset() {
    return updateHeaderOffset();
}

function scrollToElement(element) {
    if (!element) return;
    const top = element.getBoundingClientRect().top + window.scrollY - getHeaderOffset();
    window.scrollTo({ top, behavior: "smooth" });
}

function updateActiveLinks(page) {
    $$("nav [data-page], .footer-links [data-page]").forEach(link => {
        const isActive = link.getAttribute("data-page") === page;
        const inNav = !!link.closest("nav");
        link.classList.toggle("active", isActive && inNav);
        link.classList.toggle("active-footer", isActive && !!link.closest(".footer-links"));
        if (inNav) {
            if (isActive) link.setAttribute("aria-current", "page");
            else link.removeAttribute("aria-current");
        }
    });
}

function getLinkTarget(link) {
    if (!link) return null;
    return {
        page: link.dataset.page || null,
        anchorId: link.dataset.anchor || null
    };
}

function buildHash(page, anchorId = "") {
    const safePage = CONTENT_PAGES.has(page) ? page : "rolam.html";
    const safeAnchor = anchorId ? String(anchorId).trim() : "";
    return safeAnchor ? `#${safePage}|${safeAnchor}` : `#${safePage}`;
}

function parseHash(hash = window.location.hash) {
    const raw = String(hash || "").replace(/^#/, "").trim();
    if (!raw) return null;

    const [pagePart, anchorPart = ""] = raw.split("|");
    const page = CONTENT_PAGES.has(pagePart) ? pagePart : null;
    if (!page) return null;

    return {
        page,
        anchorId: anchorPart || null
    };
}

function syncHash(page, anchorId = "", replace = false) {
    const nextHash = buildHash(page, anchorId);
    const currentHash = window.location.hash || "";
    if (currentHash === nextHash) return;

    if (replace) {
        history.replaceState(null, "", nextHash);
    } else {
        history.pushState(null, "", nextHash);
    }
}

async function loadPage(page, linkElement = null, options = {}) {
    const targetPage = CONTENT_PAGES.has(page) ? page : "rolam.html";
    const contentBox = $("#content-box");
    if (!contentBox) return;

    if (activePageRequest) activePageRequest.abort();
    activePageRequest = new AbortController();

    try {
        const response = await fetch(targetPage, {
            cache: "default",
            signal: activePageRequest.signal
        });
        if (!response.ok) throw new Error(String(response.status));

        const html = await response.text();
        contentBox.innerHTML = html;
        contentBox.dataset.page = targetPage;

        if (options.updateHash !== false) {
            syncHash(targetPage, options.anchorId || "", !!options.replaceHash);
        }

        updateActiveLinks(targetPage);
        updatePageMeta(targetPage);
        initPageFeatures(targetPage);
        initDeferredMedia(contentBox);
        normalizeExternalConsentCards(document);
        updateHeaderOffset();

        requestAnimationFrame(() => {
            const anchorTarget = options.anchorId ? document.getElementById(options.anchorId) : null;
            if (anchorTarget) {
                scrollToElement(anchorTarget);
            } else if (options.scroll !== false) {
                scrollToElement(contentBox);
            }
        });

        linkElement?.blur?.();
    } catch (error) {
        if (error?.name === "AbortError") return;
        console.error(error);
        contentBox.innerHTML = "<p style='text-align:center;color:red;'>Nem sikerült betölteni az oldalt.</p>";
    } finally {
        if (activePageRequest?.signal?.aborted === false) {
            activePageRequest = null;
        }
    }
}

function initPageFeatures(page) {
    if (page === "kapcsolat.html") {
        initContactForm();
        initMapEmbed();
    }
    if (page === "kalkulator.html") {
        initCalculator();
        initDownloadButton();
    }
}

async function fetchOfferId() {
    const response = await fetch(`${GAS_URL}?action=getOfferId`, { method: "GET" });
    const text = await response.text();

    if (!response.ok) throw new Error("Nem sikerült ajánlatszámot kérni.");
    if (text.startsWith("OK|")) return text.split("|")[1];
    throw new Error(text || "Ismeretlen hiba az ajánlatszám lekérésekor.");
}

function setStatus(statusBox, message, type = "info") {
    if (!statusBox) return;
    statusBox.textContent = message;
    statusBox.dataset.state = type;
}

function validateForm(form, statusBox) {
    if (form.checkValidity()) return true;
    form.reportValidity();
    setStatus(statusBox, "Kérjük, töltse ki a kötelező mezőket.", "error");
    return false;
}

function initContactForm() {
    const form = $("#contactForm");
    const statusBox = $("#status");
    if (!form || form.dataset.bound === "1") return;
    form.dataset.bound = "1";

    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (!validateForm(form, statusBox)) return;

        try {
            setStatus(statusBox, "Küldés...", "info");

            const formData = new FormData(form);
            formData.set("policy", $("#policyContact")?.checked ? "Igen" : "Nem");
            formData.set("callbackReq", $("#callbackReqContact")?.checked ? "Igen" : "Nem");

            const offerId = await fetchOfferId();
            currentOfferId = offerId;
            formData.set("offerId", offerId);

            const response = await fetch(GAS_URL, { method: "POST", body: formData });
            const result = await response.text();

            if (result.startsWith("OK|")) {
                currentOfferId = result.split("|")[1];
                setStatus(statusBox, `Üzenet elküldve! Azonosító: ${currentOfferId}`, "success");
                form.reset();
            } else if (result === "OK") {
                setStatus(statusBox, "Üzenet elküldve!", "success");
                form.reset();
            } else {
                throw new Error(result);
            }
        } catch (error) {
            console.error(error);
            setStatus(statusBox, `Hiba történt: ${error?.message || "Ismeretlen hiba"}`, "error");
        }
    });
}

let calculatorRowsCache = null;

function parsePrice(value) {
    return Number(String(value || "").replace(/[^\d.-]/g, "")) || 0;
}

function getCalculatorRows(forceRefresh = false) {
    if (!forceRefresh && Array.isArray(calculatorRowsCache) && calculatorRowsCache.length) {
        return calculatorRowsCache.map(item => ({
            ...item,
            qty: Number(item.input?.value || 0)
        }));
    }

    calculatorRowsCache = $$(".calc-table tr").map((row, index) => {
        const cells = row.children;
        const input = row.querySelector("input[type='number']");
        const name = cells[0]?.textContent?.trim() || `Tétel ${index + 1}`;
        const unit = cells[1]?.textContent?.trim() || "";
        if (input) {
            input.setAttribute("aria-label", `${name} mennyiség (${unit || "db"})`);
        }
        return {
            row,
            input,
            name,
            unit,
            price: parsePrice(cells[2]?.textContent),
            sumCell: row.querySelector(".sum")
        };
    });

    return getCalculatorRows();
}

function getSelectedCalculatorItems() {
    return getCalculatorRows()
        .filter(item => item.qty > 0)
        .map(item => ({
            name: item.name,
            unit: item.unit,
            qty: item.qty,
            price: item.price,
            sum: item.qty * item.price
        }));
}

function hasCalculatorData() {
    return getCalculatorRows().some(item => item.qty > 0);
}

function updateCalc() {
    const rows = getCalculatorRows();
    const materialRow = rows.find(item => item.name === "Teljes felújítás (anyaggal)");

    rows.forEach(item => {
        if (item.input) item.input.disabled = false;
    });

    if (materialRow && materialRow.qty > 0) {
        rows.forEach(item => {
            if (item.input && item !== materialRow) {
                item.input.value = "";
                item.input.disabled = true;
            }
        });
    }

    let total = 0;
    rows.forEach(item => {
        const sum = item.input?.disabled ? 0 : item.qty * item.price;
        if (item.sumCell) item.sumCell.textContent = sum ? `${sum.toLocaleString("hu-HU")} Ft` : "";
        total += sum;
    });

    const totalBox = $("#total");
    if (totalBox) totalBox.textContent = `${total.toLocaleString("hu-HU")} Ft`;
}

function resetCalculator() {
    $$(".calc-table input[type='number']").forEach(input => {
        input.value = "";
        input.disabled = false;
    });
    updateCalc();
}

function attachCalculatorSummary(messageField) {
    if (!messageField) return;

    const selectedItems = getSelectedCalculatorItems();
    if (!selectedItems.length) return;

    const totalText = $("#total")?.textContent || "0 Ft";
    const lines = selectedItems.map(item => `${item.name} – ${item.qty} ${item.unit} – ${item.sum.toLocaleString("hu-HU")} Ft`);
    const calcText = [
        "---- KALKULÁTOR AJÁNLAT ----",
        "Kalkulátor ajánlatkérés:",
        "",
        ...lines,
        "",
        `Végösszeg: ${totalText}`,
        "---- KALKULÁTOR VÉGE ----"
    ].join("\n");

    const currentText = messageField.value.trim();
    if (currentText.includes("---- KALKULÁTOR AJÁNLAT ----")) {
        const before = currentText.split("---- KALKULÁTOR AJÁNLAT ----")[0].trim();
        messageField.value = before ? `${before}\n\n${calcText}` : calcText;
    } else {
        messageField.value = currentText ? `${currentText}\n\n${calcText}` : calcText;
    }

}

function initCalculator() {
    const form = $("#calcContactForm");
    const statusBox = $("#calc-status");

    getCalculatorRows(true).forEach(item => {
        if (!item.input || item.input.dataset.bound === "1") return;
        item.input.dataset.bound = "1";
        item.input.addEventListener("input", updateCalc);
        const resetButton = item.row.querySelector(".row-reset");
        if (resetButton && resetButton.dataset.bound !== "1") {
            resetButton.dataset.bound = "1";
            resetButton.addEventListener("click", () => {
                item.input.value = "";
                item.input.disabled = false;
                updateCalc();
            });
        }
    });

    const resetButton = $("#calcReset");
    if (resetButton && resetButton.dataset.bound !== "1") {
        resetButton.dataset.bound = "1";
        resetButton.addEventListener("click", resetCalculator);
    }

    updateCalc();

    if (!form || form.dataset.bound === "1") return;
    form.dataset.bound = "1";

    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (!validateForm(form, statusBox)) return;

        const messageField = $("#calcMessage");
        const rawMessage = messageField?.value.trim() || "";
        const calcSelected = hasCalculatorData();

        if (!calcSelected && !rawMessage) {
            setStatus(statusBox, "Írjon üzenetet vagy töltsön ki legalább egy kalkulátor tételt.", "error");
            return;
        }

        try {
            setStatus(statusBox, "Küldés...", "info");

            if (calcSelected) attachCalculatorSummary(messageField);

            const formData = new FormData(form);
            const policyAccepted = $("#policyCalc")?.checked;
            formData.set("policy", policyAccepted ? "Igen" : "Nem");
            formData.set("policy2", policyAccepted ? "Igen" : "Nem");
            formData.set("callbackReq", $("#callbackReqCalc")?.checked ? "Igen" : "Nem");

            const offerId = await fetchOfferId();
            currentOfferId = offerId;
            formData.set("offerId", offerId);

            if (calcSelected) {
                const pdf = await generateCalculatorPdfBase64(offerId);
                if (pdf?.base64) {
                    formData.set("pdfBase64", pdf.base64);
                    formData.set("pdfName", `stravill-arajanlat-${offerId}.pdf`);
                }
            }

            const response = await fetch(GAS_URL, { method: "POST", body: formData });
            const result = await response.text();

            if (result.startsWith("OK|")) {
                currentOfferId = result.split("|")[1];
                setStatus(statusBox, `Ajánlatkérés elküldve! Azonosító: ${currentOfferId}`, "success");
                form.reset();
                resetCalculator();
            } else if (result === "OK") {
                setStatus(statusBox, "Ajánlatkérés elküldve!", "success");
                form.reset();
                resetCalculator();
            } else {
                throw new Error(result);
            }
        } catch (error) {
            console.error(error);
            setStatus(statusBox, `Hiba történt: ${error?.message || "Ismeretlen hiba"}`, "error");
        }
    });
}

async function generateCalculatorPdfBase64(offerId = "") {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        throw new Error("A PDF letöltéshez szükséges könyvtár nem töltődött be (jsPDF).");
    }

    const items = getSelectedCalculatorItems();
    if (!items.length) {
        throw new Error("Nincs kiválasztott tétel a kalkulátorban.");
    }

    const { jsPDF } = window.jspdf;
    let doc = new jsPDF({ unit: "mm", format: "a4" });

    async function loadScript(srcUrl) {
        return new Promise((resolve, reject) => {
            const existingScript = document.querySelector(`script[src="${srcUrl}"]`);
            if (existingScript?.dataset.loaded === "1") {
                resolve();
                return;
            }
            if (existingScript?.dataset.loading === "1") {
                existingScript.addEventListener("load", () => resolve(), { once: true });
                existingScript.addEventListener("error", () => reject(new Error(`Nem tölthető be: ${srcUrl}`)), { once: true });
                return;
            }

            const script = existingScript || document.createElement("script");
            let timeoutId = window.setTimeout(() => {
                reject(new Error(`Betöltési időtúllépés: ${srcUrl}`));
            }, SCRIPT_LOAD_TIMEOUT);

            const cleanup = () => {
                if (timeoutId) {
                    window.clearTimeout(timeoutId);
                    timeoutId = null;
                }
            };

            script.src = srcUrl;
            script.async = true;
            script.dataset.loading = "1";
            script.onload = () => {
                cleanup();
                script.dataset.loading = "0";
                script.dataset.loaded = "1";
                resolve();
            };
            script.onerror = () => {
                cleanup();
                script.dataset.loading = "0";
                reject(new Error(`Nem tölthető be: ${srcUrl}`));
            };

            if (!existingScript) {
                document.head.appendChild(script);
            }
        });
    }

    if (typeof doc.autoTable !== "function") {
        window.jsPDF = jsPDF;
        const autoTableSources = [
            "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/5.0.2/jspdf.plugin.autotable.min.js",
            "https://cdn.jsdelivr.net/npm/jspdf-autotable@5.0.2/dist/jspdf.plugin.autotable.min.js"
        ];

        let autoTableLoaded = false;
        for (const srcUrl of autoTableSources) {
            try {
                await loadScript(srcUrl);
                autoTableLoaded = true;
                break;
            } catch (error) {
                console.warn("Nem sikerült betölteni az autotable plugint erről a címről:", srcUrl, error);
            }
        }

        if (!autoTableLoaded) {
            throw new Error("A táblázat plugin nem töltődött be (jspdf-autotable).");
        }

        doc = new jsPDF({ unit: "mm", format: "a4" });
    }

    if (typeof doc.autoTable !== "function") {
        throw new Error("A táblázat plugin nem töltődött be (jspdf-autotable).");
    }

    const hasUnicodeFont = typeof liberationBase64 !== "undefined" && !!liberationBase64;
    if (hasUnicodeFont) {
        doc.addFileToVFS("DejaVuSans.ttf", liberationBase64);
        doc.addFont("DejaVuSans.ttf", "DejaVu", "normal");
        doc.addFont("DejaVuSans.ttf", "DejaVu", "bold");
        doc.setFont("DejaVu", "normal");
    } else {
        doc.setFont("helvetica", "normal");
    }

    const fontFamily = hasUnicodeFont ? "DejaVu" : "helvetica";
    const logoDataUrl = await getPdfHeaderLogo();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const margin = 14;
    const topHeaderHeight = 34;
    const footerHeight = 18;
    const usableWidth = pageWidth - margin * 2;

    const colors = {
        navy: [17, 32, 51],
        navySoft: [83, 98, 119],
        blue: [31, 111, 229],
        blueDark: [21, 87, 184],
        blueSoft: [234, 242, 255],
        yellow: [255, 202, 40],
        yellowDark: [240, 180, 0],
        white: [255, 255, 255],
        line: [225, 232, 242],
        lineStrong: [205, 215, 228],
        panel: [248, 251, 255],
        mutedBg: [244, 247, 252]
    };

    function text(value) {
        return getSafePdfText(value, hasUnicodeFont);
    }

    function formatThousands(value) {
        const num = Math.round(Number(value || 0));
        return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    }

    function fmtFt(value) {
        return `${formatThousands(value)} Ft`;
    }

    function roundedPanel(x, y, w, h, fillColor = colors.white, drawColor = colors.line) {
        doc.setFillColor(...fillColor);
        doc.setDrawColor(...drawColor);
        doc.roundedRect(x, y, w, h, 4, 4, "FD");
    }

    function drawHeader(pageNo) {
        doc.setFillColor(...colors.navy);
        doc.rect(0, 0, pageWidth, topHeaderHeight, "F");

        doc.setFillColor(...colors.blue);
        doc.rect(0, topHeaderHeight - 3, pageWidth, 3, "F");

        if (logoDataUrl) {
            try {
                doc.addImage(logoDataUrl, "PNG", margin, 5, 53, 22, undefined, "FAST");
            } catch (error) {
                console.warn("A PDF fejléc logó nem rajzolható ki.", error);
            }
        }

        doc.setFont(fontFamily, "bold");
        doc.setFontSize(16);
        doc.setTextColor(...colors.white);
        doc.text(text("Villanyszerelési árajánlat"), pageWidth - margin, 13, { align: "right" });

        doc.setFont(fontFamily, "normal");
        doc.setFontSize(13);
        doc.setTextColor(230, 236, 245);
        doc.text(text("StraVill"), pageWidth - margin, 20, { align: "right" });

        if (offerId) {
            const offerText = text(`${offerId}`);
            const offerY = 25.5;

            doc.setFont(fontFamily, "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(190, 200, 220);

            const offerWidth = doc.getTextWidth(offerText);
            const offerX = pageWidth - margin - offerWidth;

            doc.text(offerText, pageWidth - margin, offerY, { align: "right" });

            doc.link(offerX, offerY - 3.2, offerWidth, 4.8, {
                url: `https://stravill.hu/ajanlat/${encodeURIComponent(offerId)}`
            });
        }

        doc.setTextColor(0);
    }

    function drawFooter(pageNo) {
        const y = pageHeight - footerHeight;
        doc.setDrawColor(...colors.lineStrong);
        doc.line(margin, y, pageWidth - margin, y);

        doc.setFont(fontFamily, "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...colors.navySoft);

        const centerX = pageWidth / 2;
        const row1Y = pageHeight - 9;
        const row2Y = pageHeight - 5;

        const left1 = text("StraVill - Strassenreiter Attila e.v.");
        const right1 = text("villanyszerelési szolgáltatások");

        const left2 = text("+36 30 493 8929");
        const right2 = text("strassenreiter.a@gmail.com");

        doc.text(left1, centerX - 1.5, row1Y, { align: "right" });
        doc.text(left2, centerX - 1.5, row2Y, { align: "right" });

        doc.text("|", centerX, row1Y, { align: "center" });
        doc.text("|", centerX, row2Y, { align: "center" });

        doc.text(right1, centerX + 1.5, row1Y, { align: "left" });
        doc.text(right2, centerX + 1.5, row2Y, { align: "left" });

        doc.text(`${pageNo}`, pageWidth - margin, pageHeight - 7, { align: "right" });

        doc.setTextColor(0);
    }

    const calcForm = $("#calcContactForm");
    const clientName = calcForm?.elements?.namedItem("name")?.value?.trim() || "";
    const clientEmail = calcForm?.elements?.namedItem("email")?.value?.trim() || "";
    const clientPhone = calcForm?.elements?.namedItem("phone")?.value?.trim() || "";
    const callbackWanted = $("#callbackReqCalc")?.checked ? "Igen" : "Nem";
    const totalValue = items.reduce((sum, item) => sum + item.sum, 0);

    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}.`;

    drawHeader(1);

    let currentY = topHeaderHeight + 10;

    roundedPanel(margin, currentY, usableWidth, 26, colors.panel, colors.line);

    doc.setFont(fontFamily, "bold");
    doc.setFontSize(18);
    doc.setTextColor(...colors.navy);
    doc.text(
        text(offerId ? `Ajánlat azonosító: ${offerId}` : "Ajánlat azonosító: -"),
        margin + 6,
        currentY + 10
    );

    doc.setFont(fontFamily, "normal");
    doc.setFontSize(10);
    doc.setTextColor(...colors.navySoft);
    doc.text(text(`Kiállítás dátuma: ${dateStr}`), margin + 6, currentY + 17);

    doc.setFillColor(...colors.yellow);
    doc.roundedRect(pageWidth - margin - 42, currentY + 5, 36, 10, 3, 3, "F");
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(9);
    doc.setTextColor(...colors.navy);
    doc.text(text("Előzetes kalkuláció"), pageWidth - margin - 24, currentY + 11.7, { align: "center" });

    currentY += 34;

    const clientLines = [
        ["Név", clientName || "-"],
        ["E-mail", clientEmail || "-"],
        ["Telefon", clientPhone || "-"],
        ["Visszahívási igény", callbackWanted]
    ];

    roundedPanel(margin, currentY, usableWidth, 34, colors.white, colors.line);

    doc.setFont(fontFamily, "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...colors.blueDark);
    doc.text(text("Ügyféladatok"), margin + 6, currentY + 8);

    doc.setDrawColor(...colors.line);
    doc.line(margin + 6, currentY + 11, pageWidth - margin - 6, currentY + 11);

    doc.setFont(fontFamily, "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...colors.navy);

    const col1X = margin + 6;
    const col2X = margin + usableWidth / 2 + 2;
    doc.text(text(`${clientLines[0][0]}: ${clientLines[0][1]}`), col1X, currentY + 18);
    doc.text(text(`${clientLines[1][0]}: ${clientLines[1][1]}`), col1X, currentY + 25);
    doc.text(text(`${clientLines[2][0]}: ${clientLines[2][1]}`), col2X, currentY + 18);
    doc.text(text(`${clientLines[3][0]}: ${clientLines[3][1]}`), col2X, currentY + 25);

    currentY += 42;

    doc.setFont(fontFamily, "bold");
    doc.setFontSize(12);
    doc.setTextColor(...colors.navy);
    doc.text(text("Ajánlat részletezése"), margin, currentY);

    currentY += 4;

    doc.autoTable({
        startY: currentY + 3,
        margin: { left: margin, right: margin, top: topHeaderHeight + 8, bottom: 26 },
        head: [["Tétel", "Mennyiség", "Egységár", "Összesen"]],
        body: items.map(item => [
            text(item.name),
            text(`${item.qty} ${item.unit.replace(/^\d+\s*/, "")}`.trim()),
            text(fmtFt(item.price)),
            text(fmtFt(item.sum))
        ]),
        theme: "grid",
        styles: {
            font: fontFamily,
            fontSize: 9.6,
            cellPadding: 3.5,
            overflow: "linebreak",
            lineColor: colors.line,
            lineWidth: 0.2,
            textColor: colors.navy,
            valign: "middle"
        },
        headStyles: {
            fillColor: colors.blue,
            textColor: colors.white,
            font: fontFamily,
            fontStyle: "bold",
            halign: "left"
        },
        alternateRowStyles: {
            fillColor: colors.mutedBg
        },
        bodyStyles: {
            fillColor: colors.white
        },
        columnStyles: {
            0: { cellWidth: 88 },
            1: { cellWidth: 28, halign: "center" },
            2: { cellWidth: 34, halign: "right" },
            3: { cellWidth: 36, halign: "right", fontStyle: "bold" }
        },
        didDrawPage: ({ pageNumber }) => {
            drawHeader(pageNumber);
            drawFooter(pageNumber);
        }
    });

    const finalY = (doc.lastAutoTable?.finalY || currentY) + 8;

    roundedPanel(margin, finalY, usableWidth, 22, colors.blueSoft, colors.blue);

    doc.setFont(fontFamily, "normal");
    doc.setFontSize(10);
    doc.setTextColor(...colors.blueDark);
    doc.text(text("Becsült végösszeg"), margin + 6, finalY + 9);

    doc.setFont(fontFamily, "bold");
    doc.setFontSize(16);
    doc.setTextColor(...colors.navy);
    doc.text(text(fmtFt(totalValue)), pageWidth - margin - 6, finalY + 13, { align: "right" });

    const noteY = finalY + 30;
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(8.8);
    doc.setTextColor(...colors.navySoft);

    const note =
        "Az árak tájékoztató jellegűek, a végleges árajánlat helyszíni felmérés után készül.";

    const noteLines = doc.splitTextToSize(text(note), usableWidth);

    doc.text(
        noteLines,
        margin + usableWidth / 2,
        noteY,
        { align: "center" }
    );

    const dataUri = doc.output("datauristring");
    const base64 = String(dataUri).split(",")[1] || "";
    return { base64, doc };
}

function initDownloadButton() {
    const button = $("#downloadPdf") || $("#downloadOffer");
    if (!button || button.dataset.bound === "1") return;
    button.dataset.bound = "1";

    button.addEventListener("click", async () => {
        try {
            const { doc } = await generateCalculatorPdfBase64(currentOfferId);
            const fileName = currentOfferId ? `stravill-arajanlat-${currentOfferId}.pdf` : "stravill-arajanlat.pdf";
            doc.save(fileName);
        } catch (error) {
            console.error(error);
            alert(String(error?.message || "Hiba a PDF generálás közben."));
        }
    });
}

function loadAnalytics() {
    if (analyticsLoaded) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", {
        analytics_storage: "granted",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied"
    });
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, { anonymize_ip: true });

    const existingScript = document.querySelector(`script[src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`);
    if (existingScript) {
        analyticsLoaded = true;
        return;
    }

    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.async = true;
    script.onload = () => {
        analyticsLoaded = true;
    };
    script.onerror = () => {
        analyticsLoaded = false;
        console.warn("A Google Analytics betöltését a böngésző vagy egy bővítmény blokkolta.");
    };
    document.head.appendChild(script);
}

function setCookieConsent(value) {
    safeStorageSet("cookie-consent", value);
}

function getCookieConsent() {
    return safeStorageGet("cookie-consent");
}

function deleteAnalyticsCookies() {
    const domains = [window.location.hostname, `.${window.location.hostname}`].filter(Boolean);
    const cookieNames = ["_ga", "_ga_" + GA_MEASUREMENT_ID.replace(/[^A-Z0-9]/gi, "")];

    cookieNames.forEach(name => {
        document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
        domains.forEach(domain => {
            document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}; SameSite=Lax`;
        });
    });
}

function openCookieSettings() {
    const banner = $("#privacy-consent-panel");
    if (!banner) return;
    banner.style.display = "block";
    banner.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function revokeCookieConsent() {
    safeStorageRemove("cookie-consent");
    deleteAnalyticsCookies();
    analyticsLoaded = false;
    window[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
    openCookieSettings();
}

function setExternalConsent(key, value) {
    safeStorageSet(key, value);
}

function getExternalConsent(key) {
    return safeStorageGet(key);
}

function initCookieBanner() {
    const banner = $("#privacy-consent-panel");
    const accept = $("#cookie-accept");
    const decline = $("#cookie-decline");
    const settingsButton = $("#privacy-settings-trigger");
    if (!banner) return;

    const consent = getCookieConsent();
    if (!consent) {
        setTimeout(() => {
            banner.style.display = "block";
        }, 150);
    } else if (consent === "accepted") {
        window[`ga-disable-${GA_MEASUREMENT_ID}`] = false;
        loadAnalytics();
    } else {
        window[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
    }

    accept?.addEventListener("click", () => {
        setCookieConsent("accepted");
        window[`ga-disable-${GA_MEASUREMENT_ID}`] = false;
        banner.style.display = "none";
        loadAnalytics();
    });

    decline?.addEventListener("click", () => {
        setCookieConsent("declined");
        window[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
        deleteAnalyticsCookies();
        banner.style.display = "none";
    });

    if (settingsButton && settingsButton.dataset.bound !== "1") {
        settingsButton.dataset.bound = "1";
        settingsButton.addEventListener("click", revokeCookieConsent);
    }
}


function normalizeExternalConsentCards(root = document) {
    const blockSet = new Set();

    const reviewsPlaceholder = root.getElementById ? root.getElementById("reviews-placeholder") : null;
    const contactMap = root.querySelector ? root.querySelector(".contact-map") : null;
    const externalBoxes = root.querySelectorAll ? root.querySelectorAll(".external-content-box") : [];

    if (reviewsPlaceholder) blockSet.add(reviewsPlaceholder);
    if (contactMap) blockSet.add(contactMap);
    externalBoxes.forEach(box => blockSet.add(box));

    blockSet.forEach(block => {
        block.style.display = "flex";
        block.style.flexDirection = "column";
        block.style.alignItems = "center";
        block.style.justifyContent = "center";
        block.style.textAlign = "center";
        block.style.gap = "0.9rem";

        block.querySelectorAll("p, .btn, button, a.btn").forEach(element => {
            element.style.marginLeft = "auto";
            element.style.marginRight = "auto";

            if (element.tagName === "P") {
                element.style.textAlign = "center";
                element.style.maxWidth = "640px";
            }

            if (element.matches(".btn, button, a.btn")) {
                element.style.display = "inline-flex";
                element.style.alignItems = "center";
                element.style.justifyContent = "center";
            }
        });
    });
}

function loadMapEmbed() {
    const container = $(".contact-map");
    if (!container || container.dataset.loaded === "1") return;

    container.dataset.loaded = "1";
    setExternalConsent("map-consent", "accepted");
    normalizeExternalConsentCards(document);

    container.innerHTML = `
        <iframe
            title="StraVill térkép"
            src="${GOOGLE_MAPS_EMBED_URL}"
            loading="lazy"
            referrerpolicy="strict-origin-when-cross-origin"
            allowfullscreen>
        </iframe>
        <p><a class="btn yellow-btn" href="https://www.google.com/maps?q=46.579284,20.6672226" target="_blank" rel="noopener noreferrer">Google Maps megnyitása</a></p>
    `;
}

function initMapEmbed() {
    normalizeExternalConsentCards(document);

    if (getExternalConsent("map-consent") === "accepted") {
        loadMapEmbed();
        return;
    }

    const button = $("#loadMapBtn");
    if (!button || button.dataset.bound === "1") return;

    button.dataset.bound = "1";
    button.addEventListener("click", loadMapEmbed);
}

const GOOGLE_REVIEWS_FALLBACK_URL = "https://www.google.com/search?q=StraVill+Strassenreiter+Attila+Villanyszerel%C5%91+E.V.+Orosh%C3%A1za+v%C3%A9lem%C3%A9nyek";

function initReviewSlider() {
    const slider = $("#reviewSlider");
    const track = $("#reviewTrack");
    const prev = $("#reviewPrev");
    const next = $("#reviewNext");
    const dots = Array.from(document.querySelectorAll(".review-dot"));
    const slides = Array.from(document.querySelectorAll(".review-card--slide"));
    const moreLink = $("#googleReviewsMoreLink");

    if (moreLink) moreLink.href = GOOGLE_REVIEWS_FALLBACK_URL;
    if (!slider || !track || !prev || !next || !slides.length) return;

    let currentIndex = 0;
    let autoplayId = null;

    function render(index) {
        currentIndex = (index + slides.length) % slides.length;
        track.style.transform = `translateX(-${currentIndex * 100}%)`;

        slides.forEach((slide, i) => {
            slide.classList.toggle("is-active", i === currentIndex);
            slide.setAttribute("aria-hidden", i === currentIndex ? "false" : "true");
        });

        dots.forEach((dot, i) => {
            dot.classList.toggle("is-active", i === currentIndex);
            dot.setAttribute("aria-current", i === currentIndex ? "true" : "false");
        });
    }

    function stopAutoplay() {
        if (!autoplayId) return;
        clearInterval(autoplayId);
        autoplayId = null;
    }

    function startAutoplay() {
        stopAutoplay();
        autoplayId = window.setInterval(() => render(currentIndex + 1), 5000);
    }

    prev.addEventListener("click", () => {
        render(currentIndex - 1);
        startAutoplay();
    });

    next.addEventListener("click", () => {
        render(currentIndex + 1);
        startAutoplay();
    });

    dots.forEach((dot, index) => {
        dot.addEventListener("click", () => {
            render(index);
            startAutoplay();
        });
    });

    slider.addEventListener("mouseenter", stopAutoplay);
    slider.addEventListener("mouseleave", startAutoplay);
    slider.addEventListener("focusin", stopAutoplay);
    slider.addEventListener("focusout", startAutoplay);

    render(0);
    startAutoplay();
}

function applyTheme(mode) {
    const body = document.body;
    const toggle = $("#themeToggle");

    if (mode === "light") {
        body.classList.remove("dark");
        if (toggle) toggle.textContent = "🌙";
        return;
    }

    if (mode === "dark") {
        body.classList.add("dark");
        if (toggle) toggle.textContent = "☀️";
        return;
    }

    const hour = new Date().getHours();
    const isDay = hour >= 6 && hour < 18;
    body.classList.toggle("dark", !isDay);
    if (toggle) toggle.textContent = isDay ? "🌙" : "☀️";
}

function setTheme(mode) {
    safeStorageSet("theme-mode", mode);
    applyTheme(mode);
}

function initThemeToggle() {
    applyTheme(safeStorageGet("theme-mode") || "auto");

    const toggle = $("#themeToggle");
    if (!toggle || toggle.dataset.bound === "1") return;
    toggle.dataset.bound = "1";

    toggle.addEventListener("click", () => {
        const current = safeStorageGet("theme-mode") || "auto";
        if (current === "auto") setTheme("light");
        else if (current === "light") setTheme("dark");
        else setTheme("auto");
    });
}


function closeMobileMenu() {
    const wrap = document.querySelector('.hamburger-wrap');
    const toggle = $("#navToggle");
    if (wrap) wrap.classList.remove('open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

function initMobileMenu() {
    const wrap = document.querySelector('.hamburger-wrap');
    const toggle = $("#navToggle");
    const menu = $("#hamburgerMenu");
    if (!wrap || !toggle || !menu || toggle.dataset.bound === '1') return;
    toggle.dataset.bound = '1';

    toggle.addEventListener('click', event => {
        event.stopPropagation();
        const willOpen = !wrap.classList.contains('open');
        wrap.classList.toggle('open', willOpen);
        toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });
document.addEventListener('click', event => {
        if (!wrap.contains(event.target)) closeMobileMenu();
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeMobileMenu();
    });

    window.addEventListener('resize', () => {
        closeMobileMenu();
    });
}

function initDeferredMedia(root = document) {
    $$("img", root).forEach(img => {
        if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
        if (img.getAttribute('fetchpriority') === 'high') {
            if (!img.hasAttribute('loading')) img.setAttribute('loading', 'eager');
            return;
        }
        if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
    });
}

function initViewportOptimizations() {
    if (document.body.dataset.viewportBound === "1") return;
    document.body.dataset.viewportBound = "1";

    let resizeRaf = 0;
    const scheduleHeaderOffsetUpdate = () => {
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(() => {
            resizeRaf = 0;
            updateHeaderOffset();
        });
    };

    updateHeaderOffset();
    window.addEventListener("resize", scheduleHeaderOffsetUpdate, { passive: true });
    window.addEventListener("orientationchange", scheduleHeaderOffsetUpdate, { passive: true });
    window.addEventListener("load", scheduleHeaderOffsetUpdate, { passive: true });
}

function initNavigation() {
    if (document.body.dataset.navBound === "1") return;
    document.body.dataset.navBound = "1";

    document.addEventListener("click", event => {
        const link = event.target.closest("a[data-page]");
        if (!link) return;

        const target = getLinkTarget(link);
        if (!target?.page) return;

        event.preventDefault();
        loadPage(target.page, link, { anchorId: target.anchorId });
        closeMobileMenu();
    });

    window.addEventListener("hashchange", () => {
        const route = parseHash();
        if (!route) return;
        const currentPage = $("#content-box")?.dataset.page;
        if (currentPage === route.page) {
            if (route.anchorId) {
                requestAnimationFrame(() => {
                    const anchorTarget = document.getElementById(route.anchorId);
                    if (anchorTarget) scrollToElement(anchorTarget);
                });
            }
            return;
        }
        loadPage(route.page, null, {
            anchorId: route.anchorId,
            scroll: false,
            updateHash: false
        });
    });
}

function safeInit(label, fn) {
    try {
        fn();
    } catch (error) {
        console.error(`${label} hiba:`, error);
    }
}

function bootApp() {
    safeInit("initCookieBanner", () => initCookieBanner());
    safeInit("initThemeToggle", () => initThemeToggle());
    safeInit("initReviewSlider", () => initReviewSlider());
    safeInit("initMobileMenu", () => initMobileMenu());
    safeInit("initNavigation", () => initNavigation());
    safeInit("initDeferredMedia", () => initDeferredMedia(document));
    safeInit("initViewportOptimizations", () => initViewportOptimizations());

    safeInit("initialPageLoad", () => {
        const route = parseHash();
        const initialPage = route?.page || "rolam.html";
        const defaultLink = document.querySelector(`a[data-page='${initialPage}']`) || document.querySelector("a[data-page='rolam.html']");
        loadPage(initialPage, defaultLink, {
            anchorId: route?.anchorId || null,
            scroll: false,
            replaceHash: true
        });
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootApp, { once: true });
} else {
    bootApp();
}

window.loadPage = loadPage;
