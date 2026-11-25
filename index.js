// ================= TEMA =================
function temaYangila() {
  const joriy = localStorage.getItem("tema") || "tungi";
  document.documentElement.setAttribute("data-tema", joriy);
  document.getElementById("tema-tugma").textContent = joriy === "tungi" ? "☀️" : "🌙";
  document.querySelector('meta[name="theme-color"]').content = joriy === "tungi" ? "#0a0e14" : "#f5f7fa";
}

document.getElementById("tema-tugma").addEventListener("click", () => {
  const joriy = document.documentElement.getAttribute("data-tema");
  const yangi = joriy === "tungi" ? "kunduz" : "tungi";
  localStorage.setItem("tema", yangi);
  temaYangila();
});

// ================= SOAT =================
function soatniYangila() {
  document.getElementById("soat").textContent = new Date().toTimeString().slice(0, 5);
}
setInterval(soatniYangila, 1000);
soatniYangila();

// ================= GLOBAL =================
let barchaTavarlar = [];
let ustamaMap = {};

// ================= TURLARNI YUKLASH (faqat soni > 0) =================
async function turlarniYukla() {
  const { data } = await sb.from("tavarlar")
    .select("tur_id, turlar(id, nomi)")
    .gt("soni", 0);

  const turMap = {};
  (data || []).forEach(t => {
    if (t.turlar) turMap[t.turlar.id] = t.turlar.nomi;
  });

  const sel = document.getElementById("f-tur");
  const joriy = sel.value;
  sel.innerHTML = `<option value="">— Barchasi —</option>` +
    Object.entries(turMap)
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, nomi]) => `<option value="${id}">${nomi}</option>`)
      .join("");

  if (joriy && turMap[joriy]) sel.value = joriy;
}

// ================= MODEL FILTRI (turga bog'liq, faqat soni > 0) =================
function modelFiltrniYangila() {
  const turId = document.getElementById("f-tur").value;
  const sel = document.getElementById("f-model");
  const joriy = sel.value;

  const modellar = new Set();
  barchaTavarlar.forEach(t => {
    if (Number(t.soni) <= 0) return;
    if (turId && String(t.tur_id) !== String(turId)) return;
    if (t.model) modellar.add(t.model);
  });

  sel.innerHTML = `<option value="">— Barchasi —</option>` +
    [...modellar].sort().map(m => `<option value="${m}">${m}</option>`).join("");

  if (joriy && [...modellar].includes(joriy)) sel.value = joriy;
  else sel.value = "";
}

// ================= MARKA FILTRI (tur+modelga bog'liq, faqat soni > 0) =================
function markaFiltrniYangila() {
  const turId = document.getElementById("f-tur").value;
  const model = document.getElementById("f-model").value;
  const sel = document.getElementById("f-marka");
  const joriy = sel.value;

  const markalar = new Set();
  barchaTavarlar.forEach(t => {
    if (Number(t.soni) <= 0) return;
    if (turId && String(t.tur_id) !== String(turId)) return;
    if (model && t.model !== model) return;
    if (t.marka) markalar.add(t.marka);
  });

  sel.innerHTML = `<option value="">— Barchasi —</option>` +
    [...markalar].sort().map(m => `<option value="${m}">${m}</option>`).join("");

  if (joriy && [...markalar].includes(joriy)) sel.value = joriy;
  else sel.value = "";
}

// ================= SOTUV NARXINI HISOBLASH (ustama bilan) =================
function sotuvNarxHisobla(t) {
  const u = ustamaMap[t.tur_id];
  if (!u) return t.tan_narx || 0;
  let narx = Number(t.tan_narx) || 0;
  if (u.foiz > 0) narx += narx * (Number(u.foiz) / 100);
  if (u.qiymat > 0) narx += Number(u.qiymat);
  return Math.round(narx);
}

// ================= ASOSIY QIDIRUV =================
function qidir() {
  const turId = document.getElementById("f-tur").value;
  const model = document.getElementById("f-model").value;
  const marka = document.getElementById("f-marka").value;
  const matn = document.getElementById("q-input").value;

  // Faqat soni > 0
  let natija = barchaTavarlar.filter(t => Number(t.soni) > 0);

  // Filtrlar
  if (turId) natija = natija.filter(t => String(t.tur_id) === String(turId));
  if (model) natija = natija.filter(t => t.model === model);
  if (marka) natija = natija.filter(t => t.marka === marka);

  // Matn bo'yicha ketma-ket toraytirish
  if (matn.trim()) {
    const sozlar = matn.toLowerCase().trim().split(/\s+/).filter(Boolean);
    for (const soz of sozlar) {
      natija = natija.filter(t => {
        const m = [t.kod, t.model, t.marka, t.turlar?.nomi]
          .filter(Boolean).join(" ").toLowerCase();
        return m.includes(soz);
      });
    }
  }

   // Natija sarlavhasi — faqat nechta natija
  const sarlavha = document.getElementById("natija-sarlavha");
  const soni = natija.length;

  if (matn.trim() || turId || model || marka) {
    sarlavha.classList.remove("gizli");
    document.getElementById("natija-soni").textContent = `${soni} ta natija`;
  } else {
    sarlavha.classList.add("gizli");
  }

  // Jadval
  const tbody = document.getElementById("natija-tbody");
  if (!soni) {
    tbody.innerHTML = `<tr><td colspan="4" class="bosh">Natija topilmadi</td></tr>`;
    return;
  }

  tbody.innerHTML = natija.map(t => {
    const sotuv = sotuvNarxHisobla(t);
    return `<tr>
      <td class="kod">${t.kod}</td>
      <td>
        <div class="model-nom">${t.model || "—"}</div>
        ${t.marka ? `<div class="marka-nom">${t.marka}${t.turlar?.nomi ? " · " + t.turlar.nomi : ""}</div>` : ""}
      </td>
      <td class="markaz">${t.soni}</td>
      <td class="ong">${fmtSom(sotuv)}</td>
    </tr>`;
  }).join("");
}

// ================= HODISALAR =================
document.getElementById("f-tur").addEventListener("change", () => {
  modelFiltrniYangila();
  markaFiltrniYangila();
  qidir();
});
document.getElementById("f-model").addEventListener("change", () => {
  markaFiltrniYangila();
  qidir();
});
document.getElementById("f-marka").addEventListener("change", qidir);

let qTimer = null;
document.getElementById("q-input").addEventListener("input", () => {
  clearTimeout(qTimer);
  qTimer = setTimeout(qidir, 200);
});

document.getElementById("q-tozalash").addEventListener("click", () => {
  document.getElementById("q-input").value = "";
  document.getElementById("f-tur").value = "";
  document.getElementById("f-model").value = "";
  document.getElementById("f-marka").value = "";
  modelFiltrniYangila();
  markaFiltrniYangila();
  qidir();
});

// ================= ISHGA TUSHIRISH =================
async function ishgaTushir() {
  temaYangila();

  // Tavarlarni yuklash
  const { data } = await sb.from("tavarlar")
    .select("*, turlar(nomi)")
    .order("kod");
  barchaTavarlar = data || [];

  // Ustamalar
  const { data: u } = await sb.from("ustamalar").select("tur_id, foiz, qiymat");
  ustamaMap = {};
  (u || []).forEach(x => (ustamaMap[x.tur_id] = x));

  // Filtrlarni to'ldirish
  await turlarniYukla();
  modelFiltrniYangila();
  markaFiltrniYangila();
  qidir();
}

ishgaTushir();