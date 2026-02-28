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

            if (page === "kapcsolat.html") {
                initContactForm();
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
        formData.append("policy", form.policy.checked ? "Elfogadva" : "Nincs elfogadva");

        fetch("https://script.google.com/macros/s/AKfycbxQpEr7w9WMgfBHwFB5qQ6gqe8hMQOKTFrE9sKku_11Iz5l3KYULNMLG8oGBmzDEThr/exec", {
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
        body.classList.add("dark");
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
