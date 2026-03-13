const GAS_URL = "https://script.google.com/macros/s/AKfycbx_FI6eN8AONYMFqtBFF792ymRvmFdZSrfkMICwKbgvp2ExavZWIAK72P5Vdsy8FSQrGA/exec";
let currentOfferId = "";
let analyticsLoaded = false;

const CONTENT_PAGES = new Set([
    "rolam.html",
    "szolgaltatasok.html",
    "arlista.html",
    "galeria.html",
    "kapcsolat.html",
    "kalkulator.html",
    "impresszum.html",
    "adatkezeles.html",
    "cookie.html"
]);

function $(selector, root = document) {
    return root.querySelector(selector);
}

function $$(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
}

function getHeaderOffset() {
    const header = $(".fixed-header");
    return header ? header.offsetHeight + 10 : 10;
}

function scrollToElement(element) {
    if (!element) return;
    const top = element.getBoundingClientRect().top + window.scrollY - getHeaderOffset();
    window.scrollTo({ top, behavior: "smooth" });
}

function updateActiveLinks(page) {
    $$("nav [data-page], .footer-links [data-page]").forEach(link => {
        const isActive = link.getAttribute("data-page") === page;
        link.classList.toggle("active", isActive && !!link.closest("nav"));
        link.classList.toggle("active-footer", isActive && !!link.closest(".footer-links"));
    });
}

async function loadPage(page, linkElement = null, options = {}) {
    const targetPage = CONTENT_PAGES.has(page) ? page : "rolam.html";
    const contentBox = $("#content-box");
    if (!contentBox) return;

    try {
        const response = await fetch(targetPage, { cache: "no-store" });
        if (!response.ok) throw new Error(String(response.status));

        contentBox.innerHTML = await response.text();
        contentBox.dataset.page = targetPage;

        updateActiveLinks(targetPage);
        initPageFeatures(targetPage);

        if (options.anchorId) {
            requestAnimationFrame(() => scrollToElement(document.getElementById(options.anchorId)));
        } else if (options.scroll !== false) {
            requestAnimationFrame(() => scrollToElement(contentBox));
        }

        linkElement?.blur?.();
    } catch (error) {
        console.error(error);
        contentBox.innerHTML = "<p style='text-align:center;color:red;'>Nem sikerült betölteni az oldalt.</p>";
    }
}

function initPageFeatures(page) {
    if (page === "kapcsolat.html") initContactForm();
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
            formData.set("policy", $("#policyContact")?.checked ? "Elfogadva" : "Nincs elfogadva");
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

function getCalculatorRows() {
    return $$(".calc-table tr").map(row => {
        const cells = row.children;
        const input = row.querySelector("input[type='number']");
        return {
            row,
            input,
            name: cells[0]?.textContent?.trim() || "",
            unit: cells[1]?.textContent?.trim() || "",
            price: Number(cells[2]?.textContent || 0),
            qty: Number(input?.value || 0),
            sumCell: row.querySelector(".sum")
        };
    });
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
    return getSelectedCalculatorItems().length > 0;
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

    getCalculatorRows().forEach(item => {
        if (!item.input) return;
        item.input.addEventListener("input", updateCalc);
        const resetButton = item.row.querySelector(".row-reset");
        if (resetButton) {
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
    if (!window.jspdf || !window.jspdf.jsPDF) throw new Error("A PDF letöltéshez szükséges könyvtár nem töltődött be (jsPDF).");
    if (typeof liberationBase64 === "undefined" || !liberationBase64) throw new Error("A PDF-hez szükséges betűtípus nem töltődött be (dejavu.js / liberationBase64).");

    const items = getSelectedCalculatorItems();
    if (!items.length) throw new Error("Nincs kiválasztott tétel a kalkulátorban.");

    const { jsPDF } = window.jspdf;
    let doc = new jsPDF({ unit: "mm", format: "a4" });

    async function loadScript(srcUrl) {
        await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = srcUrl;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    if (typeof doc.autoTable !== "function") {
        window.jsPDF = jsPDF;
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/5.0.2/jspdf.plugin.autotable.min.js");
        doc = new jsPDF({ unit: "mm", format: "a4" });
    }

    if (typeof doc.autoTable !== "function") throw new Error("A táblázat plugin nem töltődött be (jspdf-autotable).");

    doc.addFileToVFS("DejaVuSans.ttf", liberationBase64);
    doc.addFont("DejaVuSans.ttf", "DejaVu", "normal");
    doc.setFont("DejaVu");

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}.`;

    const calcForm = $("#calcContactForm");
    const clientName = calcForm?.elements?.namedItem("name")?.value?.trim() || "";
    const clientEmail = calcForm?.elements?.namedItem("email")?.value?.trim() || "";
    const clientPhone = calcForm?.elements?.namedItem("phone")?.value?.trim() || "";
    const callbackWanted = $("#callbackReqCalc")?.checked ? "Igen" : "Nem";
    const totalText = $("#total")?.textContent || "";

    function drawHeader(pageNo) {
        doc.setFontSize(15);
        doc.setFont("DejaVu", "bold");
        doc.text("StraVill – Előzetes kalkuláció", margin, 16);
        doc.setFont("DejaVu", "normal");
        doc.setFontSize(9);
        doc.text(`Oldal: ${pageNo}`, pageWidth - margin, 16, { align: "right" });
        doc.setDrawColor(215);
        doc.line(margin, 20, pageWidth - margin, 20);
    }

    function drawFooter(pageNo) {
        doc.setDrawColor(215);
        doc.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);
        doc.setFontSize(8);
        doc.setTextColor(105);
        doc.text("StraVill – Strassenreiter Attila E.V.", margin, pageHeight - 10);
        doc.text(`Oldal ${pageNo}`, pageWidth - margin, pageHeight - 10, { align: "right" });
        doc.setTextColor(0);
    }

    drawHeader(1);
    drawFooter(1);

    let currentY = 28;
    const boxX = margin;
    const boxY = currentY;
    const boxW = pageWidth - margin * 2;
    const boxH = 34;

    doc.setDrawColor(220);
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, "FD");

    doc.setFont("DejaVu", "bold");
    doc.setFontSize(11);
    doc.text("Ügyféladatok", boxX + 4, boxY + 6);

    const leftX = boxX + 4;
    const rightX = boxX + boxW / 2 + 4;

    doc.setFont("DejaVu", "normal");
    doc.setFontSize(10);
    doc.text(`Név: ${clientName || "-"}`, leftX, boxY + 13);
    doc.text(`Email: ${clientEmail || "-"}`, leftX, boxY + 19);
    doc.text(`Telefon: ${clientPhone || "-"}`, leftX, boxY + 25);

    doc.text(`Visszahívást kér: ${callbackWanted}`, rightX, boxY + 13);
    doc.text(`Dátum: ${dateStr}`, rightX, boxY + 25);

    doc.setFont("DejaVu", "bold");
    doc.text(`Ajánlatszám: ${offerId || "-"}`, rightX, boxY + 19);

    currentY += 42;

    doc.autoTable({
        startY: currentY,
        margin: { left: margin, right: margin, top: 24, bottom: 18 },
        head: [["Tétel", "Mennyiség", "Egységár", "Összeg"]],
        body: items.map(item => [
            item.name,
            `${item.qty} ${item.unit.replace(/^\d+\s*/, "")}`.trim(),
            `${item.price.toLocaleString("hu-HU")} Ft`,
            `${item.sum.toLocaleString("hu-HU")} Ft`
        ]),
        styles: {
            font: "DejaVu",
            fontSize: 10,
            cellPadding: 3,
            overflow: "linebreak",
            lineColor: [230, 230, 230],
            lineWidth: 0.1
        },
        headStyles: {
            fillColor: [235, 235, 235],
            textColor: 40,
            font: "DejaVu",
            fontStyle: "bold"
        },
        columnStyles: {
            0: { cellWidth: 88 },
            1: { cellWidth: 34, halign: "center" },
            2: { cellWidth: 32, halign: "right" },
            3: { cellWidth: 32, halign: "right" }
        },
        didDrawPage: ({ pageNumber }) => {
            drawHeader(pageNumber);
            drawFooter(pageNumber);
        }
    });

    const y = (doc.lastAutoTable?.finalY || currentY) + 8;
    doc.setDrawColor(0);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 14, 2, 2, "S");
    doc.setFont("DejaVu", "bold");
    doc.setFontSize(12);
    doc.text(`Végösszeg: ${totalText}`, margin + 4, y + 9);

    doc.setFont("DejaVu", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    const note = "Az árak tájékoztató jellegűek, a végleges árajánlat helyszíni felmérés után készül.";
    doc.text(doc.splitTextToSize(note, pageWidth - margin * 2), pageWidth / 2, y + 22, { align: "center" });
    doc.setTextColor(0);

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
    analyticsLoaded = true;

    const script = document.createElement("script");
    script.src = "https://www.googletagmanager.com/gtag/js?id=G-Y6NQ4G486W";
    script.async = true;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", "G-Y6NQ4G486W", { anonymize_ip: true });
}

function initCookieBanner() {
    const banner = $("#cookie-banner");
    const accept = $("#cookie-accept");
    const decline = $("#cookie-decline");
    if (!banner) return;

    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
        setTimeout(() => {
            banner.style.display = "block";
        }, 150);
    } else if (consent === "accepted") {
        loadAnalytics();
    }

    accept?.addEventListener("click", () => {
        localStorage.setItem("cookie-consent", "accepted");
        banner.style.display = "none";
        loadAnalytics();
    });

    decline?.addEventListener("click", () => {
        localStorage.setItem("cookie-consent", "declined");
        banner.style.display = "none";
    });
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
    localStorage.setItem("theme-mode", mode);
    applyTheme(mode);
}

function initThemeToggle() {
    applyTheme(localStorage.getItem("theme-mode") || "auto");

    const toggle = $("#themeToggle");
    if (!toggle || toggle.dataset.bound === "1") return;
    toggle.dataset.bound = "1";

    toggle.addEventListener("click", () => {
        const current = localStorage.getItem("theme-mode") || "auto";
        if (current === "auto") setTheme("light");
        else if (current === "light") setTheme("dark");
        else setTheme("auto");
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initCookieBanner();
    initThemeToggle();
    const defaultLink = $("a[data-page='rolam.html']");
    loadPage("rolam.html", defaultLink, { scroll: false });
});
