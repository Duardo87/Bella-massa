// ==================================================
// admin.js (corrigido e robusto)
// ==================================================

// ==================================================
// LOGIN CONFIG
// ==================================================
const ADMIN_USER = "admin";
const ADMIN_PASS = "123456"; // mantém compatível com admin.html

const KEY = "pizzaria-data";

// ==================================================
// DOM helper
// ==================================================
const $ = id => document.getElementById(id) || null;

// ==================================================
// DOM refs (serão preenchidas no DOMContentLoaded)
let loginDiv, adminDiv;
let inputUser, inputPass;

// ==================================================
// DEFAULT DATA
// ==================================================
const DEFAULT_DATA = {
  store: { name: "", phone: "" },
  categories: [],
  products: [],
  extras: [],
  borders: [],
  promo: null
};

// ==================================================
// INIT
// ==================================================
document.addEventListener("DOMContentLoaded", () => {
  loginDiv = $("login");
  adminDiv = $("admin");

  inputUser = $("loginUser");
  inputPass = $("loginPass");

  // se existir um botão local com id btnLogin (algumas versões do admin.html têm)
  const btnLocal = $("btnLogin");
  if (btnLocal) {
    btnLocal.addEventListener("click", () => login());
  }

  // Enter na senha realiza login
  if (inputPass) {
    inputPass.addEventListener("keydown", (e) => {
      if (e.key === "Enter") login();
    });
  }
});

// ==================================================
// LOGIN
// ==================================================
function login() {
  const user = (inputUser?.value || "").trim();
  const pass = (inputPass?.value || "").trim();

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    if (loginDiv) loginDiv.classList.add("hidden");
    if (adminDiv) adminDiv.classList.remove("hidden");

    // chama loadAdmin se existir (defensivo)
    try {
      if (typeof loadAdmin === "function") {
        loadAdmin();
      } else {
        // chamar a nossa implementação local
        localLoadAdmin();
      }
    } catch (err) {
      console.warn("Erro ao inicializar admin:", err);
    }
  } else {
    alert("Login inválido");
  }
}

function logout() {
  location.reload();
}

// ==================================================
// STORAGE (seguro)
// ==================================================
function loadDB() {
  let raw = {};
  try {
    raw = JSON.parse(localStorage.getItem(KEY)) || {};
  } catch (e) {
    raw = {};
  }

  return {
    ...DEFAULT_DATA,
    ...raw,
    store: { ...DEFAULT_DATA.store, ...(raw.store || {}) },
    categories: Array.isArray(raw.categories) ? raw.categories : [],
    products: Array.isArray(raw.products) ? raw.products : [],
    extras: Array.isArray(raw.extras) ? raw.extras : [],
    borders: Array.isArray(raw.borders) ? raw.borders : [],
    promo: raw.promo || null
  };
}

function saveDB(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Erro ao salvar localStorage:", e);
  }
}

// ==================================================
// ADMIN LOAD (compatível + seguro)
// ==================================================
function localLoadAdmin() {
  const d = loadDB();

  if ($("storeName")) $("storeName").value = d.store.name || "";
  if ($("storePhone")) $("storePhone").value = d.store.phone || "";

  renderCategories();
  renderProducts();
  renderExtras();
  renderBorders();
}

// Se `loadAdmin` for chamado por admin.html (externo), vamos garantir existir
if (typeof window.loadAdmin !== "function") {
  window.loadAdmin = localLoadAdmin;
}

// ==================================================
// STORE
// ==================================================
function saveStore() {
  const d = loadDB();
  const nameEl = $("storeName");
  const phoneEl = $("storePhone");

  if (nameEl) d.store.name = nameEl.value.trim();
  if (phoneEl) {
    // limpa caracteres não numéricos para WhatsApp
    d.store.phone = phoneEl.value.replace(/\D/g, "").trim();
  }

  saveDB(d);
  alert("Loja salva");
}

// ==================================================
// CATEGORIAS
// ==================================================
function addCategory() {
  const input = $("catName");
  if (!input) return alert("Campo de categoria não encontrado");
  const name = input.value.trim();
  if (!name) return alert("Digite a categoria");

  const d = loadDB();
  if (!d.categories.includes(name)) {
    d.categories.push(name);
    saveDB(d);
  }
  input.value = "";
  renderCategories();
}

function renderCategories() {
  const d = loadDB();
  const list = $("catList");
  const select = $("prodCat");

  if (list) list.innerHTML = "";
  if (select) {
    select.innerHTML = "";
    select.insertAdjacentHTML("beforeend", `<option value="">Selecione...</option>`);
  }

  d.categories.forEach(cat => {
    if (list) list.insertAdjacentHTML("beforeend", `<p>${cat}</p>`);
    if (select) select.insertAdjacentHTML("beforeend", `<option value="${cat}">${cat}</option>`);
  });
}

// ==================================================
// PRODUTOS
// ==================================================
function addProduct() {
  const nameEl = $("prodName");
  const priceEl = $("prodPrice");
  const catEl = $("prodCat");
  const imgEl = $("prodImage");
  const descEl = $("prodDesc");
  const flavorsEl = $("prodFlavors");
  const bestEl = $("prodBest");

  const name = nameEl ? nameEl.value.trim() : "";
  const price = priceEl ? Number(priceEl.value) : NaN;
  const cat = catEl ? catEl.value : "";
  const imgFile = imgEl?.files && imgEl.files[0] ? imgEl.files[0] : null;

  if (!name) return alert("Digite o nome do produto");
  if (!isFinite(price)) return alert("Digite o preço do produto");
  if (!cat) return alert("Selecione a categoria");

  const d = loadDB();

  const addAndSave = (imageData) => {
    d.products.push({
      id: Date.now(),
      name,
      desc: descEl ? descEl.value.trim() : "",
      price: Number(price),
      category: cat,
      image: imageData || null,
      maxFlavors: flavorsEl ? Number(flavorsEl.value) || 2 : 2,
      best: bestEl ? !!bestEl.checked : false
    });

    saveDB(d);
    // atualiza listagens
    renderProducts();
    renderCategories(); // atualiza select também
    // limpa campos
    if (nameEl) nameEl.value = "";
    if (descEl) descEl.value = "";
    if (priceEl) priceEl.value = "";
    if (flavorsEl) flavorsEl.value = "";
    if (imgEl) imgEl.value = "";
    if (bestEl) bestEl.checked = false;

    alert("Produto adicionado");
  };

  if (imgFile) {
    const reader = new FileReader();
    reader.onload = () => addAndSave(reader.result);
    reader.onerror = () => {
      console.warn("Erro ao ler imagem, salvando sem imagem");
      addAndSave(null);
    };
    reader.readAsDataURL(imgFile);
  } else {
    // imagem opcional — adiciona sem imagem
    addAndSave(null);
  }
}

function renderProducts() {
  const d = loadDB();
  const list = $("productList");
  if (!list) return;

  if (!Array.isArray(d.products) || d.products.length === 0) {
    list.innerHTML = "<p style='opacity:.6'>Nenhum produto</p>";
    return;
  }

  list.innerHTML = d.products
    .map(p => {
      const max = p.maxFlavors || 2;
      return `<p>${escapeHtml(p.name)} — R$ ${Number(p.price).toFixed(2)} <small>(até ${max} sabores)</small></p>`;
    })
    .join("");
}

// ==================================================
// EXTRAS
// ==================================================
function addExtra() {
  const nameEl = $("extraName");
  const priceEl = $("extraPrice");
  const name = nameEl ? nameEl.value.trim() : "";
  const price = priceEl ? Number(priceEl.value) : NaN;
  if (!name) return alert("Digite o nome do adicional");
  if (!isFinite(price)) return alert("Digite o preço do adicional");

  const d = loadDB();
  d.extras.push({
    id: Date.now(),
    name,
    price: Number(price),
    active: true
  });
  saveDB(d);
  if (nameEl) nameEl.value = "";
  if (priceEl) priceEl.value = "";
  renderExtras();
}

function renderExtras() {
  const d = loadDB();
  const container = $("extraList");
  if (!container) return;

  if (!d.extras || d.extras.length === 0) {
    container.innerHTML = "<p style='opacity:.6'>Nenhum adicional</p>";
    return;
  }

  container.innerHTML = d.extras
    .map(e => `
      <div class="extra-item">
        <strong>${escapeHtml(e.name)}</strong>
        <label>
          <input type="checkbox" ${e.active ? "checked" : ""} onchange="toggleExtra(${e.id}, this.checked)">
          Ativo
        </label>
        <small style="margin-left:8px">R$ ${Number(e.price).toFixed(2)}</small>
      </div>
    `).join("");
}

function toggleExtra(id, active) {
  const d = loadDB();
  const ex = d.extras.find(x => x.id === id);
  if (ex) {
    ex.active = !!active;
    saveDB(d);
    renderExtras();
  }
}

// ==================================================
// BORDAS
// ==================================================
function addBorder() {
  const nameEl = $("borderName");
  const priceEl = $("borderPrice");
  const name = nameEl ? nameEl.value.trim() : "";
  const price = priceEl ? Number(priceEl.value) : NaN;
  if (!name) return alert("Digite o nome da borda");
  if (!isFinite(price)) return alert("Digite o preço da borda");

  const d = loadDB();
  d.borders.push({
    id: Date.now(),
    name,
    price: Number(price),
    active: true
  });
  saveDB(d);
  if (nameEl) nameEl.value = "";
  if (priceEl) priceEl.value = "";
  renderBorders();
}

function renderBorders() {
  const d = loadDB();
  const container = $("borderList");
  if (!container) return;

  if (!d.borders || d.borders.length === 0) {
    container.innerHTML = "<p style='opacity:.6'>Nenhuma borda</p>";
    return;
  }

  container.innerHTML = d.borders
    .map(b => `
      <div class="extra-item">
        <strong>${escapeHtml(b.name)}</strong>
        <label>
          <input type="checkbox" ${b.active ? "checked" : ""} onchange="toggleBorder(${b.id}, this.checked)">
          Ativo
        </label>
        <small style="margin-left:8px">R$ ${Number(b.price).toFixed(2)}</small>
      </div>
    `).join("");
}

function toggleBorder(id, active) {
  const d = loadDB();
  const b = d.borders.find(x => x.id === id);
  if (b) {
    b.active = !!active;
    saveDB(d);
    renderBorders();
  }
}

// ==================================================
// PROMO (opcional)
// ==================================================
function savePromo() {
  const descEl = $("promoDesc");
  const priceEl = $("promoPrice");
  const imgEl = $("promoImage");

  const desc = descEl ? descEl.value.trim() : "";
  const price = priceEl ? Number(priceEl.value) : NaN;
  const file = imgEl?.files && imgEl.files[0] ? imgEl.files[0] : null;

  if (!desc) return alert("Digite a descrição da promoção");
  if (!isFinite(price)) return alert("Digite o preço da promoção");

  const d = loadDB();

  const saveObj = (imgData) => {
    d.promo = {
      active: true,
      description: desc,
      price: Number(price),
      image: imgData || null
    };
    saveDB(d);
    alert("Promoção salva");
    if (descEl) descEl.value = "";
    if (priceEl) priceEl.value = "";
    if (imgEl) imgEl.value = "";
  };

  if (file) {
    const r = new FileReader();
    r.onload = () => saveObj(r.result);
    r.onerror = () => {
      console.warn("Erro ao ler imagem da promoção, salvando sem imagem");
      saveObj(null);
    };
    r.readAsDataURL(file);
  } else {
    saveObj(null);
  }
}

// ==================================================
// UTIL
// ==================================================
function escapeHtml(str) {
  if (!str && str !== 0) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}