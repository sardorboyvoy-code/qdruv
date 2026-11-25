// ================= SUPABASE ULANISH =================
const SUPABASE_URL = "https://jqwckwmsmiieaptqligc.supabase.co";
const SUPABASE_KEY = "sb_publishable_HzrGVUPht9qNLOci6SIZyA_1F-XPROA";

const { createClient } = window.supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ================= YORDAMCHILAR =================
function fmtSom(n) {
  if (n == null || isNaN(n)) return "0";
  return Number(n).toLocaleString("ru-RU").replace(/,/g, " ");
}

function fmtSana(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("uz-UZ") + " " +
         d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

function toast(msg, tur = "info") {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.style.cssText =
      "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);" +
      "padding:12px 20px;border-radius:10px;color:#fff;font:14px sans-serif;" +
      "z-index:9999;opacity:0;transition:opacity .3s;pointer-events:none;max-width:90%;";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.background =
    tur === "error" ? "#e53935" : tur === "ok" ? "#2e7d32" : "#333";
  el.style.opacity = "1";
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.style.opacity = "0"), 2500);
}

// ================= SW YANGILANISHINI USHLASH =================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then((reg) => {
      setInterval(() => reg.update(), 60 * 1000);
      reg.addEventListener("updatefound", () => {
        const yangiSW = reg.installing;
        if (!yangiSW) return;
        yangiSW.addEventListener("statechange", () => {
          if (yangiSW.state === "installed" && navigator.serviceWorker.controller) {
            toast("Yangi versiya mavjud, yangilanmoqda...", "info");
            setTimeout(() => {
              yangiSW.postMessage("SKIP_WAITING");
              window.location.reload();
            }, 2000);
          }
        });
      });
    }).catch(() => {});
  });
}