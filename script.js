/* ============================
   DINAMIKUS OLDALBETÖLTÉS
============================ */

function loadPage(page, linkElement) {
    fetch(page)
        .then(res => res.ok ? res.text() : Promise.reject(res.status))
        .then(html => {
            const box = document.getElementById("content-box");
            const header = document.querySelector(".fixed-header");

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
            if (page === "kalkulator.html") initCalculator();

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

    form.addEventListener("submit", e => {
        e.preventDefault();
        statusBox.textContent = "Küldés...";
        statusBox.style.color = "blue";

        const formData = new FormData(form);

        const policyAccepted = document.getElementById("policy").checked;
        formData.set("policy", policyAccepted ? "Elfogadva" : "Nincs elfogadva");

        fetch("https://script.google.com/macros/s/AKfycbx_FI6eN8AONYMFqtBFF792ymRvmFdZSrfkMICwKbgvp2ExavZWIAK72P5Vdsy8FSQrGA/exec", {
            method: "POST",
            body: formData
        })
        .then(r => r.text())
        .then(res => {
            if (res === "OK") {
                statusBox.textContent = "Üzenet elküldve!";
                statusBox.style.color = "green";
                form.reset();
            } else {
                statusBox.textContent = "Hiba történt: " + res;
                statusBox.style.color = "red";
            }
        })
        .catch(() => {
            statusBox.textContent = "Hálózati hiba történt.";
            statusBox.style.color = "red";
        });
    });
}


/* ============================
   KALKULÁTOR – INIT (KÁRTYÁS VERZIÓ)
============================ */

function initCalculator() {
    const tables = document.querySelectorAll(".calc-table");
    const form = document.getElementById("calcContactForm");
    const statusBox = document.getElementById("calc-status");

    // Ha nincs egyetlen kalkulátor tábla sem → kilép
    if (!tables.length) return;

    // Minden input figyelése
    document.querySelectorAll(".calc-table input[type='number']").forEach(input => {
        input.addEventListener("input", updateCalc);
    });

    updateCalc();

    /* SOR RESET GOMBOK */
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

    /* NAGY RESET GOMB */
    const resetBtn = document.getElementById("calcReset");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {

            document.querySelectorAll(".calc-table input[type='number']").forEach(input => {
                input.value = "";
            });

            document.querySelectorAll(".calc-table .sum").forEach(sum => {
                sum.textContent = "";
            });

            const totalBox = document.getElementById("total");
            if (totalBox) totalBox.textContent = "0 Ft";
        });
    }

    /* AJÁNLATKÉRÉS */
    if (form) {
        form.addEventListener("submit", e => {
            e.preventDefault();

            statusBox.textContent = "Küldés...";
            statusBox.style.color = "blue";

            let text = "Kalkulátor ajánlatkérés:\n\n";
            let total = document.getElementById("total")?.textContent || "0 Ft";

            document.querySelectorAll(".calc-table tr").forEach(row => {
                const name = row.children[0].textContent;
                const unit = row.children[1].textContent;
                const qty = row.querySelector("input")?.value || 0;
                const sum = row.querySelector(".sum")?.textContent || "";

                if (qty > 0) {
                    text += `${name} – ${qty} ${unit} – ${sum}\n`;
                }
            });

            text += `\nVégösszeg: ${total}\n`;

            const msg = document.getElementById("calcMessage");
            if (msg) {
                msg.value = msg.value + "\n\n" + text;
            }

            const formData = new FormData(form);

            const policyAccepted = document.getElementById("policy2").checked;
            formData.set("policy", policyAccepted ? "Elfogadva" : "Nincs elfogadva");

            fetch("https://script.google.com/macros/s/AKfycbx_FI6eN8AONYMFqtBFF792ymRvmFdZSrfkMICwKbgvp2ExavZWIAK72P5Vdsy8FSQrGA/exec", {
                method: "POST",
                body: formData
            })
            .then(r => r.text())
            .then(res => {
                if (res === "OK") {
                    statusBox.textContent = "Ajánlatkérés elküldve!";
                    statusBox.style.color = "green";
                    form.reset();
                } else {
                    statusBox.textContent = "Hiba történt: " + res;
                    statusBox.style.color = "red";
                }
            })
            .catch(() => {
                statusBox.textContent = "Hálózati hiba történt.";
                statusBox.style.color = "red";
            });
        });
    }
}


/* ============================
   KALKULÁTOR – SZÁMOLÓ FUNKCIÓ (KÁRTYÁS VERZIÓ)
============================ */

function updateCalc() {
    let total = 0;

    document.querySelectorAll(".calc-table tr").forEach(row => {
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
    function gtag(){ dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', 'G-Y6NQ4G486W', { anonymize_ip: true });
}


/* ============================
   TÉMA VÁLTÓ (LIGHT / DARK / AUTO)
============================ */

function applyTheme(mode) {
    const body = document.body;
    const toggle = document.getElementById("themeToggle");

    if (mode === "light") {
        body.classList.remove("dark");
        body.classList.add("light");
        toggle.textContent = "🌙";
        return;
    }

    if (mode === "dark") {
        body.classList.remove("light");
        body.classclassList.add("dark");
        toggle.textContent = "☀️";
        return;
    }

    const hour = new Date().getHours();
    const isDay = hour >= 6 && hour < 18;

    body.classList.toggle("light", isDay);
    body.classList.toggle("dark", !isDay);
    toggle.textContent = isDay ? "🌙" : "☀️";
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
