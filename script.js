let currentOfferId = "";
const GAS_URL = "https://script.google.com/macros/s/AKfycbx_FI6eN8AONYMFqtBFF792ymRvmFdZSrfkMICwKbgvp2ExavZWIAK72P5Vdsy8FSQrGA/exec";

/* ============================
   DINAMIKUS OLDALBETÖLTÉS
============================ */

function loadPage(page, linkElement) {
    fetch(page)
        .then(res => res.ok ? res.text() : Promise.reject(res.status))
        .then(html => {
            const box = document.getElementById("content-box");
            const header = document.querySelector(".fixed-header");

            if (box) {
                delete box.dataset.calcInited;
                delete box.dataset.pdfInited;
            }

            box.innerHTML = html;

            const boxTop = box.getBoundingClientRect().top;
            const headerHeight = header.offsetHeight;

            if (boxTop < 0 || boxTop > window.innerHeight) {
                const absoluteTop = box.getBoundingClientRect().top + window.scrollY;
                window.scrollTo({
                    top: absoluteTop - headerHeight - 10,
                    behavior: "smooth"
                });
            }

            if (page === "kapcsolat.html") initContactForm();
            if (page === "kalkulator.html") {
                initCalculator();
                initDownloadButton();
            }

            document.querySelectorAll("nav ul li a").forEach(a => a.classList.remove("active"));
            if (linkElement) linkElement.classList.add("active");

            document.querySelectorAll(".footer-links a").forEach(a => {
                a.classList.toggle("active-footer", a.getAttribute("data-page") === page);
            });
        })
        .catch(() => {
            document.getElementById("content-box").innerHTML =
                "<p style='text-align:center;color:red;'>Nem sikerült betölteni az oldalt.</p>";
        });
}

document.addEventListener("DOMContentLoaded", () => {
    const defaultLink = document.querySelector('a[data-page="rolam.html"]');
    loadPage("rolam.html", defaultLink);
});


/* ============================
   AJÁNLATSZÁM LEKÉRÉS
============================ */

async function fetchOfferId() {
    const res = await fetch(`${GAS_URL}?action=getOfferId`, {
        method: "GET"
    });

    const text = await res.text();

    if (!res.ok) {
        throw new Error("Nem sikerült ajánlatszámot kérni.");
    }

    if (text.startsWith("OK|")) {
        return text.split("|")[1];
    }

    throw new Error(text || "Ismeretlen hiba az ajánlatszám lekérésekor.");
}


/* ============================
   HERO GOMB → KAPCSOLAT ŰRLAPRA GÖRGETÉS
============================ */

function goToContact() {
    const link = document.querySelector('a[data-page="kapcsolat.html"]');

    loadPage("kapcsolat.html", link);

    setTimeout(() => {
        const target = document.getElementById("uzenetkuldes");
        if (target) {
            const headerHeight = document.querySelector(".fixed-header").offsetHeight;
            const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 10;

            window.scrollTo({
                top: top,
                behavior: "smooth"
            });
        }
    }, 350);
}


/* ============================
   KAPCSOLAT OLDAL – FORM KEZELŐ
============================ */

function initContactForm() {
    const form = document.getElementById("contactForm");
    const statusBox = document.getElementById("status");
    if (!form) return;

    form.addEventListener("submit", async e => {
        e.preventDefault();

        try {
            statusBox.textContent = "Küldés...";
            statusBox.style.color = "blue";

            const formData = new FormData(form);

            const policyAccepted = document.getElementById("policy")?.checked;
            formData.set("policy", policyAccepted ? "Elfogadva" : "Nincs elfogadva");

            const offerId = await fetchOfferId();
            currentOfferId = offerId;
            formData.set("offerId", offerId);

            const response = await fetch(GAS_URL, {
                method: "POST",
                body: formData
            });

            const res = await response.text();

            if (res.startsWith("OK|")) {
                const savedOfferId = res.split("|")[1];
                currentOfferId = savedOfferId;
                statusBox.textContent = "Üzenet elküldve! Azonosító: " + savedOfferId;
                statusBox.style.color = "green";
                form.reset();
            } else if (res === "OK") {
                statusBox.textContent = "Üzenet elküldve!";
                statusBox.style.color = "green";
                form.reset();
            } else {
                statusBox.textContent = "Hiba történt: " + res;
                statusBox.style.color = "red";
            }
        } catch (err) {
            statusBox.textContent = "Hiba történt: " + (err?.message || "Ismeretlen hiba");
            statusBox.style.color = "red";
        }
    });
}


/* ============================
   KALKULÁTOR – INIT
============================ */

function initCalculator() {
    const tables = document.querySelectorAll(".calc-table");
    const form = document.getElementById("calcContactForm");
    const statusBox = document.getElementById("calc-status");

    if (!tables.length) return;

    document.querySelectorAll(".calc-table input[type='number']").forEach(input => {
        input.addEventListener("input", updateCalc);
    });

    updateCalc();

    document.querySelectorAll(".row-reset").forEach(btn => {
        btn.addEventListener("click", () => {
            const row = btn.closest("tr");
            const input = row.querySelector("input");
            const sum = row.querySelector(".sum");

            if (input) input.value = "";
            if (sum) sum.textContent = "";

            updateCalc();
        });
    });

    const resetBtn = document.getElementById("calcReset");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            document.querySelectorAll(".calc-table input[type='number']").forEach(input => {
                input.value = "";
                input.disabled = false;
            });

            document.querySelectorAll(".calc-table .sum").forEach(sum => {
                sum.textContent = "";
            });

            const totalBox = document.getElementById("total");
            if (totalBox) totalBox.textContent = "0 Ft";

            currentOfferId = "";
        });
    }

    if (form) {
        form.addEventListener("submit", async e => {
            e.preventDefault();

            try {
                statusBox.textContent = "Küldés...";
                statusBox.style.color = "blue";

                let text = "Kalkulátor ajánlatkérés:\n\n";
                let total = document.getElementById("total")?.textContent || "0 Ft";

                document.querySelectorAll(".calc-table tr").forEach(row => {
                    const name = row.children[0]?.textContent?.trim() || "";
                    const unit = row.children[1]?.textContent?.trim() || "";
                    const qty = row.querySelector("input")?.value || 0;
                    const sum = row.querySelector(".sum")?.textContent || "";

                    if (Number(qty) > 0) {
                        text += `${name} – ${qty} ${unit} – ${sum}\n`;
                    }
                });

                text += `\nVégösszeg: ${total}\n`;

                const msg = document.getElementById("calcMessage");
                if (msg) {
                    if (msg.value.trim() !== "") {
                        msg.value += "\n\n" + text;   // hozzáfűzi
                    } else {
                        msg.value = text;            // ha üres, akkor csak beteszi
                    }
                }

                const formData = new FormData(form);

                const policyAccepted = document.getElementById("policy2")?.checked;
                formData.set("policy", policyAccepted ? "Igen" : "Nem");
                formData.set("policy2", policyAccepted ? "Igen" : "Nem");

                const callbackChecked = document.getElementById("callbackReq")?.checked;
                formData.set("callbackReq", callbackChecked ? "Igen" : "Nem");

                const offerId = await fetchOfferId();
                currentOfferId = offerId;
                formData.set("offerId", offerId);

                const pdf = await generateCalculatorPdfBase64(offerId);
                if (pdf?.base64) {
                    formData.set("pdfBase64", pdf.base64);
                    formData.set("pdfName", `stravill-arajanlat-${offerId}.pdf`);
                }

                const response = await fetch(GAS_URL, {
                    method: "POST",
                    body: formData
                });

                const res = await response.text();

                if (res.startsWith("OK|")) {
                    const savedOfferId = res.split("|")[1];
                    currentOfferId = savedOfferId;
                    statusBox.textContent = "Ajánlatkérés elküldve! Azonosító: " + savedOfferId;
                    statusBox.style.color = "green";
                    form.reset();

                    document.querySelectorAll(".calc-table input[type='number']").forEach(input => {
                        input.disabled = false;
                    });

                    updateCalc();
                } else if (res === "OK") {
                    statusBox.textContent = "Ajánlatkérés elküldve!";
                    statusBox.style.color = "green";
                    form.reset();

                    document.querySelectorAll(".calc-table input[type='number']").forEach(input => {
                        input.disabled = false;
                    });

                    updateCalc();
                } else {
                    statusBox.textContent = "Hiba történt: " + res;
                    statusBox.style.color = "red";
                }
            } catch (err) {
                statusBox.textContent = "Hiba történt: " + (err?.message || "Ismeretlen hiba");
                statusBox.style.color = "red";
            }
        });
    }
}


/* ============================
   KALKULÁTOR – SZÁMOLÓ
============================ */

function updateCalc() {
    let total = 0;
    let specialInput = null;
    let specialQty = 0;

    const rows = document.querySelectorAll(".calc-table tr");

    rows.forEach(row => {
        const name = row.children[0]?.textContent?.trim() || "";
        const input = row.querySelector("input");

        if (name === "Teljes felújítás (anyaggal)") {
            specialInput = input;
            specialQty = Number(input?.value || 0);
        }
    });

    document.querySelectorAll(".calc-table input[type='number']").forEach(input => {
        input.disabled = false;
    });

    if (specialInput && specialQty > 0) {
        document.querySelectorAll(".calc-table input[type='number']").forEach(input => {
            if (input !== specialInput) {
                input.value = "";
                input.disabled = true;
            }
        });
    }

    rows.forEach(row => {
        const price = Number(row.children[2]?.textContent || 0);
        const qty = Number(row.querySelector("input")?.value || 0);
        const sumCell = row.querySelector(".sum");

        const sum = price * qty;

        if (sumCell) {
            sumCell.textContent = sum ? sum.toLocaleString("hu-HU") + " Ft" : "";
        }

        total += sum;
    });

    const totalBox = document.getElementById("total");
    if (totalBox) {
        totalBox.textContent = total.toLocaleString("hu-HU") + " Ft";
    }
}


/* ============================
   PDF GENERÁLÁS – KÉZI LETÖLTÉS + EMAILHEZ
============================ */

async function generateCalculatorPdfBase64(offerId = "") {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        throw new Error("A PDF letöltéshez szükséges könyvtár nem töltődött be (jsPDF).");
    }

    if (typeof liberationBase64 === "undefined" || !liberationBase64) {
        throw new Error("A PDF-hez szükséges betűtípus nem töltődött be (dejavu.js / liberationBase64).");
    }

    const { jsPDF } = window.jspdf;
    let doc = new jsPDF({ unit: "mm", format: "a4" });

    async function loadScript(srcUrl) {
        await new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.src = srcUrl;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    if (typeof doc.autoTable !== "function") {
        window.jsPDF = jsPDF;
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/5.0.2/jspdf.plugin.autotable.min.js");
        doc = new jsPDF({ unit: "mm", format: "a4" });
    }

    if (typeof doc.autoTable !== "function") {
        throw new Error("A táblázat plugin nem töltődött be (jspdf-autotable).");
    }

    doc.addFileToVFS("DejaVuSans.ttf", liberationBase64);
    doc.addFont("DejaVuSans.ttf", "DejaVu", "normal");
    doc.setFont("DejaVu");

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;

    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}.`;

    const calcForm = document.getElementById("calcContactForm");

    const clientName =
        calcForm?.querySelector('input[name="name"]')?.value?.trim() || "";

    const clientEmail =
        calcForm?.querySelector('input[name="email"]')?.value?.trim() || "";

    const clientPhone =
        calcForm?.querySelector('input[name="phone"]')?.value?.trim() || "";

    const callbackWanted = document.getElementById("callbackReq")?.checked ? "Igen" : "Nem";

    async function loadLogoDataURL(url) {
        try {
            const res = await fetch(url, { cache: "no-store" });
            if (!res.ok) return null;
            const blob = await res.blob();
            return await new Promise((resolve, reject) => {
                const fr = new FileReader();
                fr.onload = () => resolve(fr.result);
                fr.onerror = reject;
                fr.readAsDataURL(blob);
            });
        } catch {
            return null;
        }
    }

    const logoData = await loadLogoDataURL("icons/fejlec.png");

    const footerText = "© 2026 StraVill – Strassenreiter Attila egyéni vállalkozó. Minden jog fenntartva.";

    function drawHeader(pageNo) {
        doc.setFillColor(245);
        doc.rect(0, 0, pageWidth, 30, "F");

        doc.setFont("DejaVu", "normal");
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text("StraVill árajánlat", pageWidth / 2, 16, { align: "center" });

        if (logoData) {
            const fmt = String(logoData).startsWith("data:image/png") ? "PNG" : "JPEG";
            const targetW = 45;
            const targetH = 18;
            doc.addImage(logoData, fmt, margin, 5, targetW, targetH);
        }

        doc.setDrawColor(220);
        doc.line(margin, 30, pageWidth - margin, 30);
    }

    function drawFooter(pageNo) {
        doc.setFont("DejaVu", "normal");
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(footerText, pageWidth / 2, pageHeight - 8, { align: "center" });
        doc.text(`Oldal ${pageNo}`, pageWidth - margin, pageHeight - 8, { align: "right" });
        doc.setTextColor(0);
    }

    const cards = document.querySelectorAll(".calc-card");
    const blocks = [];

    cards.forEach(card => {
        const title = card.querySelector("h2")?.textContent?.trim() || "";
        const rows = [...card.querySelectorAll("tr")];

        const items = rows.map(r => {
            const name = r.children[0]?.textContent?.trim() || "";
            const unitRaw = r.children[1]?.textContent?.trim() || "";
            const unit = unitRaw.replace(/^\s*\d+\s*/, "");
            const price = Number(r.children[2]?.textContent?.trim() || 0);
            const qty = Number(r.querySelector("input")?.value || 0);
            const sum = price * qty;
            return qty > 0 ? { name, unit, qty, sum } : null;
        }).filter(Boolean);

        if (items.length) {
            blocks.push({ title, items });
        }
    });

    if (!blocks.length) {
        throw new Error("Nincs kiválasztott tétel a kalkulátorban.");
    }

    const totalText = document.getElementById("total")?.textContent || "";

    drawHeader(1);
    drawFooter(1);

    let currentY = 38;

    // Ügyféladatok box
    const boxX = margin;
    const boxY = currentY;
    const boxW = pageWidth - margin * 2;
    const boxH = 34;

    doc.setDrawColor(220);
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, "FD");

    doc.setFont("DejaVu", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text("Ügyféladatok", boxX + 4, boxY + 6);

    const leftX = boxX + 4;
    const rightX = boxX + boxW / 2 + 4;
    const row1Y = boxY + 13;
    const row2Y = boxY + 19;
    const row3Y = boxY + 25;

    doc.setFont("DejaVu", "normal");
    doc.setFontSize(10);

    doc.text(`Név: ${clientName || "-"}`, leftX, row1Y);
    doc.text(`Email: ${clientEmail || "-"}`, leftX, row2Y);
    doc.text(`Telefon: ${clientPhone || "-"}`, leftX, row3Y);

    doc.text(`Visszahívást kér: ${callbackWanted}`, rightX, row1Y);
    doc.text(`Dátum: ${dateStr}`, rightX, row3Y);

    doc.setFont("DejaVu", "bold");
    doc.setFontSize(10.5);
    doc.text(`Ajánlatszám: ${offerId || "-"}`, rightX, row2Y);

    doc.setFont("DejaVu", "normal");
    currentY += 40;

    const common = {
        styles: {
            font: "DejaVu",
            fontSize: 10,
            fontStyle: "normal",
            cellPadding: 3,
            overflow: "linebreak",
            valign: "middle",
            lineColor: [230, 230, 230],
            lineWidth: 0.1
        },
        margin: { left: margin, right: margin, top: 36, bottom: 18 },
        didDrawPage: () => {
            const pageNo = doc.internal.getNumberOfPages();
            drawHeader(pageNo);
            drawFooter(pageNo);
        }
    };

    blocks.forEach((block, index) => {
        const head = [
            [{
                content: block.title,
                colSpan: 3,
                styles: {
                    halign: "center",
                    fillColor: [235, 235, 235],
                    textColor: 0,
                    font: "DejaVu"
                }
            }],
            ["Tétel", "Menny.", "Összeg"]
        ];

        const body = block.items.map(it => [
            it.name,
            `${it.qty} / ${String(it.unit || "").replace(/^\s*\d+\s*/, "")}`,
            `${Number(it.sum || 0).toLocaleString("hu-HU")} Ft`
        ]);

        doc.autoTable({
            ...common,
            startY: index === 0 ? currentY : doc.lastAutoTable.finalY + 4,
            tableWidth: "wrap",
            margin: {
                left: (pageWidth - 178) / 2,
                right: (pageWidth - 178) / 2,
                top: 40,
                bottom: 18
            },
            head,
            body,
            headStyles: {
                fillColor: [248, 248, 248],
                textColor: 60,
                font: "DejaVu"
            },
            bodyStyles: {
                font: "DejaVu"
            },
            columnStyles: {
                0: { cellWidth: 110 },
                1: { cellWidth: 30, halign: "center" },
                2: { cellWidth: 38, halign: "right" }
            }
        });
    });

    const y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : currentY + 10;

    doc.setDrawColor(0);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 14, 2, 2, "S");
    doc.setFont("DejaVu", "bold");
    doc.setFontSize(12);
    doc.text(`Végösszeg: ${totalText}`, margin + 4, y + 9);

    doc.setFont("DejaVu", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    const note = "Az árak tájékoztató jellegűek, a végleges árajánlat helyszíni felmérés után készül.";
    const noteLines = doc.splitTextToSize(note, pageWidth - margin * 2);
    doc.text(noteLines, pageWidth / 2, y + 22, { align: "center" });
    doc.setTextColor(0);

    const dataUri = doc.output("datauristring");
    const base64 = String(dataUri).split(",")[1] || "";
    return { base64, doc };
}

function initDownloadButton() {
    const btn = document.getElementById("downloadPdf") || document.getElementById("downloadOffer");
    if (!btn) return;

    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";

    btn.addEventListener("click", async () => {
        try {
            const { doc } = await generateCalculatorPdfBase64(currentOfferId);
            const fileName = currentOfferId
                ? `stravill-arajanlat-${currentOfferId}.pdf`
                : "stravill-arajanlat.pdf";
            doc.save(fileName);
        } catch (e) {
            console.error(e);
            alert(String(e?.message || "Hiba a PDF generálás közben. Nézd meg a konzolt (F12)."));
        }
    });
}


/* ============================
   COOKIE BANNER
============================ */

document.addEventListener("DOMContentLoaded", () => {
    const banner = document.getElementById("cookie-banner");
    const accept = document.getElementById("cookie-accept");
    const decline = document.getElementById("cookie-decline");

    setTimeout(() => {
        if (!localStorage.getItem("cookie-consent")) {
            banner.style.display = "block";
        }
    }, 150);

    if (accept) {
        accept.onclick = () => {
            localStorage.setItem("cookie-consent", "accepted");
            banner.style.display = "none";
            loadAnalytics();
        };
    }

    if (decline) {
        decline.onclick = () => {
            localStorage.setItem("cookie-consent", "declined");
            banner.style.display = "none";
        };
    }

    if (localStorage.getItem("cookie-consent") === "accepted") {
        loadAnalytics();
    }
});

function loadAnalytics() {
    const script = document.createElement("script");
    script.src = "https://www.googletagmanager.com/gtag/js?id=G-Y6NQ4G486W";
    script.async = true;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    gtag("js", new Date());
    gtag("config", "G-Y6NQ4G486W", { anonymize_ip: true });
}


/* ============================
   TÉMA VÁLTÓ
============================ */

function applyTheme(mode) {
    const body = document.body;
    const toggle = document.getElementById("themeToggle");

    if (mode === "light") {
        body.classList.remove("dark");
        body.classList.add("light");
        if (toggle) toggle.textContent = "🌙";
        return;
    }

    if (mode === "dark") {
        body.classList.remove("light");
        body.classList.add("dark");
        if (toggle) toggle.textContent = "☀️";
        return;
    }

    const hour = new Date().getHours();
    const isDay = hour >= 6 && hour < 18;

    body.classList.toggle("light", isDay);
    body.classList.toggle("dark", !isDay);
    if (toggle) toggle.textContent = isDay ? "🌙" : "☀️";
}

function setTheme(mode) {
    localStorage.setItem("theme-mode", mode);
    applyTheme(mode);
}

document.addEventListener("DOMContentLoaded", () => {
    const saved = localStorage.getItem("theme-mode") || "auto";
    applyTheme(saved);

    const toggle = document.getElementById("themeToggle");
    if (toggle) {
        toggle.onclick = () => {
            const current = localStorage.getItem("theme-mode") || "auto";
            if (current === "auto") setTheme("light");
            else if (current === "light") setTheme("dark");
            else setTheme("auto");
        };
    }
});