const SUPABASE_URL = "https://uaeyhxvkvokhjilathaq.supabase.co";

const SUPABASE_ANON_KEY = "sb_publishable_Rro3qE5-Yf5yd0Hd1pdIpw_12vO6JNK";          // <-- O'ZGARTIRING


const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==== Elementlar ====
const codeInput       = document.getElementById('codeInput');
const markaModelInput = document.getElementById('markaModelInput');
const turFilter       = document.getElementById('turFilter');
const modelFilter     = document.getElementById('modelFilter');
const resultList      = document.getElementById('resultList');
const summary         = document.getElementById('summary');
const countResult     = document.getElementById('countResult');
const countSoni       = document.getElementById('countSoni');
const emptyState      = document.getElementById('emptyState');
const loadingState    = document.getElementById('loadingState');
const errorState      = document.getElementById('errorState');

// ==== Holat ====
let allProducts = [];
let isLoaded = false;

// ==== Xatolik ====
function showError(msg) {
  errorState.hidden = false;
  errorState.textContent = msg;
}
function hideError() {
  errorState.hidden = true;
  errorState.textContent = '';
}

// ==== Ma'lumotlarni yuklash ====
async function loadData() {
  loadingState.hidden = false;
  hideError();

  try {
    // 1) Turlar
    const { data: turlar, error: turError } = await supabaseClient
      .from('tovar_turlari')
      .select('*')
      .order('nomi', { ascending: true });

    if (turError) {
      console.warn('Turlarni yuklashda xatolik:', turError);
      showError(
        "Tur filtri yuklanmadi (" +
        (turError.message || "noma'lum xato") +
        "). Tovarlar baribir ko'rsatiladi."
      );
    } else {
      populateTurFilter(turlar ?? []);
    }

    // 2) Tovarlar
    const { data, error } = await supabaseClient
      .from('tovarlar')
      .select(`
        model_kodi,
        marka,
        model,
        narx,
        soni,
        tur_id,
        tovar_turlari (
          nomi,
          ustama
        )
      `);

    if (error) {
      console.error('Tovarlarni yuklashda xatolik:', error);
      loadingState.hidden = true;
      showError(
        "Ma'lumotlarni yuklab bo'lmadi: " +
        (error.message || "noma'lum xato") +
        ". Supabase RLS yoki API kalitini tekshiring."
      );
      return;
    }

    // Ustama SO'MDA qo'shiladi
    allProducts = (data ?? []).map(item => {
      const tur = Array.isArray(item.tovar_turlari)
        ? item.tovar_turlari[0]
        : item.tovar_turlari;

      const ustama  = Number(tur?.ustama ?? 0);
      const turNomi = tur?.nomi ?? "Noma'lum";
      const yakuniyNarx = Number(item.narx ?? 0) + ustama;

      return { ...item, turNomi, ustama, yakuniyNarx };
    });

    // Model filtri variantlarini yig'ish (noyob modellar)
    populateModelFilter(allProducts);

    isLoaded = true;
    loadingState.hidden = true;
    render(allProducts);

  } catch (err) {
    console.error('Kutilmagan xatolik:', err);
    loadingState.hidden = true;
    showError("Kutilmagan xatolik: " + (err.message || err));
  }
}

// ==== Tur filtri ====
function populateTurFilter(turlar) {
  while (turFilter.options.length > 1) turFilter.remove(1);

  turlar.forEach(tur => {
    const id = tur.id ?? tur.tur_id ?? tur.tovar_tur_id;
    const nomi = tur.nomi ?? tur.name ?? '';
    if (id == null) return;

    const opt = document.createElement('option');
    opt.value = String(id);
    opt.textContent = nomi;
    turFilter.appendChild(opt);
  });
}

// ==== Model filtri (noyob modellar) ====
function populateModelFilter(products) {
  while (modelFilter.options.length > 1) modelFilter.remove(1);

  const models = [...new Set(
    products
      .map(p => (p.model ?? '').trim())
      .filter(m => m.length > 0)
  )].sort((a, b) => a.localeCompare(b, 'uz'));

  models.forEach(model => {
    const opt = document.createElement('option');
    opt.value = model;
    opt.textContent = model;
    modelFilter.appendChild(opt);
  });
}

// ==== Render ====
function render(items) {
  resultList.innerHTML = '';

  if (!items || items.length === 0) {
    emptyState.hidden = false;
    summary.hidden = true;
    return;
  }
  emptyState.hidden = true;

  // Xulosa: natijalar soni + umumiy miqdor
  const totalSoni = items.reduce((sum, it) => sum + Number(it.soni ?? 0), 0);
  summary.hidden = false;
  countResult.textContent = items.length;
  countSoni.textContent = formatNumber(totalSoni);

  const frag = document.createDocumentFragment();

  items.forEach(item => {
    const li = document.createElement('li');
    li.className = 'result-item';
    li.innerHTML = `
      <div class="title">
        ${escapeHtml(item.marka ?? '')} ${escapeHtml(item.model ?? '')}
        <span class="code">${escapeHtml(item.model_kodi ?? '')}</span>
        <span class="tur-badge">${escapeHtml(item.turNomi)}</span>
      </div>
      <div class="meta">
        <span class="soni">Soni: ${formatNumber(item.soni ?? 0)} dona</span>
        <span class="price">${formatNumber(item.yakuniyNarx)} so'm</span>
      </div>
    `;
    frag.appendChild(li);
  });

  resultList.appendChild(frag);
}

// ==== Qidiruv ====
function search() {
  if (!isLoaded) return;

  const codeQ  = codeInput.value.trim().toLowerCase();
  const mmQ    = markaModelInput.value.trim().toLowerCase();
  const turQ   = turFilter.value;
  const modelQ = modelFilter.value.toLowerCase();

  // Hech qanday filtr yo'q
  if (!codeQ && !mmQ && !turQ && !modelQ) {
    render(allProducts);
    return;
  }

  const words = mmQ ? mmQ.split(/\s+/).filter(Boolean) : [];

  const filtered = allProducts.filter(item => {
    // 1) Tur filtri
    if (turQ && String(item.tur_id) !== String(turQ)) return false;

    // 2) Model filtri (aniq moslik, dropdown)
    if (modelQ && (item.model ?? '').toLowerCase() !== modelQ) return false;

    // 3) Model kodi (alohida maydon)
    if (codeQ && !(item.model_kodi ?? '').toLowerCase().includes(codeQ)) return false;

    // 4) Marka va Model (probel bilan ketma-ket)
    if (words.length > 0) {
      const marka = (item.marka ?? '').toLowerCase();
      const model = (item.model ?? '').toLowerCase();
      for (const w of words) {
        if (!marka.includes(w) && !model.includes(w)) return false;
      }
    }

    return true;
  });

  render(filtered);
}

// ==== Yordamchi ====
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNumber(n) {
  const num = Number(n ?? 0);
  return num.toLocaleString('uz-UZ', { maximumFractionDigits: 0 });
}

// ==== Hodisalar ====
codeInput.addEventListener('input', search);
markaModelInput.addEventListener('input', search);
turFilter.addEventListener('change', search);
modelFilter.addEventListener('change', search);

// ==== Boshlash ====
loadData();

// ==== PWA ====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(err => {
      console.warn("SW ro'yxatdan o'tmadi:", err);
    });
  });
}