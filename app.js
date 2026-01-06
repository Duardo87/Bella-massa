// ============================
// CONFIG / STORAGE
// ============================
const STORAGE_KEY = "pizzaria-data";

const DEFAULT_DATA = {
  store: { name: "Bella Massa", phone: "5562993343622" },
  promo: null,
  products: [],
  extras: [
    { id: 1, name: "Borda recheada", price: 5 },
    { id: 2, name: "Extra queijo", price: 6 },
    { id: 3, name: "Catupiry", price: 6 }
  ],
  theme: "auto" // auto | light | dark
};

let data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_DATA;
let cart = [];
let selectedProduct = null;

const save = () =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

// ============================
// SITE PUBLICO
// ============================
function renderPublic() {
  applyTheme();
  renderHeader();
  renderCategories();
  renderPromo();
}

function renderHeader() {
  document.getElementById("store-name").innerText = data.store.name;
  document.getElementById("store-phone").href =
    "https://wa.me/" + data.store.phone;
}

// ============================
// TEMA ESCURO
// ============================
function applyTheme() {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme =
    data.theme === "auto" ? (prefersDark ? "dark" : "light") : data.theme;
  
  document.body.classList.toggle("dark", theme === "dark");
}

// ============================
// CATEGORIAS AUTOMÁTICAS
// ============================
function renderCategories() {
  const cats = [...new Set((data.products || []).map(p => p.category))];
  const el = document.getElementById("categories");
  el.innerHTML = "";
  
  cats.forEach((cat, i) => {
    const btn = document.createElement("button");
    btn.innerText = cat;
    btn.className = i === 0 ? "active" : "";
    btn.onclick = () => {
      document
        .querySelectorAll(".categories button")
        .forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderProducts(cat);
    };
    el.appendChild(btn);
  });
  
  if (cats.length) renderProducts(cats[0]);
}

// ============================
// PRODUTOS
// ============================
function renderProducts(category) {
  const grid = document.getElementById("products");
  grid.innerHTML = "";
  
  data.products
    .filter(p => p.category === category)
    .forEach(p => {
      grid.innerHTML += `
        <div class="product-card">
          ${p.best ? `<span class="badge">⭐ Mais Pedido</span>` : ""}
          <img src="${p.image}">
          <h3>${p.name}</h3>
          <p>${p.desc}</p>
          <div class="price">R$ ${p.price.toFixed(2)}</div>
          <button class="btn btn-green" onclick="openExtras(${p.id})">
            Adicionar
          </button>
        </div>
      `;
    });
}

// ============================
// MODAL DE ADICIONAIS (VISUAL)
// ============================
function openExtras(id) {
  selectedProduct = data.products.find(p => p.id === id);
  if (!selectedProduct) return;
  
  const modal = document.createElement("div");
  modal.className = "promo-overlay";
  modal.innerHTML = `
    <div class="promo-card">
      <h3>➕ Adicionais</h3>
      ${data.extras
        .map(
          e => `
        <label style="display:flex;justify-content:space-between;margin:8px 0">
          <span>${e.name}</span>
          <input type="checkbox" value="${e.id}">
          <span>R$ ${e.price}</span>
        </label>
      `
        )
        .join("")}

      <button class="btn btn-green" onclick="confirmExtras()">Confirmar</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    </div>
  `;
  document.body.appendChild(modal);
}

function confirmExtras() {
  cart.push(selectedProduct);
  
  document
    .querySelectorAll(".promo-card input[type=checkbox]:checked")
    .forEach(chk => {
      const extra = data.extras.find(e => e.id == chk.value);
      if (extra) cart.push(extra);
    });
  
  closeModal();
  renderCart();
}

function closeModal() {
  document.querySelector(".promo-overlay")?.remove();
}

// ============================
// PROMOÇÃO DO DIA + CONTADOR
// ============================
function renderPromo() {
  if (!data.promo || !data.promo.active) return;
  
  const fim = data.promo.start + data.promo.minutes * 60000;
  if (Date.now() > fim) return;
  if (sessionStorage.getItem("promoClosed")) return;
  
  const modal = document.createElement("div");
  modal.className = "promo-overlay";
  modal.innerHTML = `
    <div class="promo-card">
      <img src="${data.promo.image}">
      <h2>${data.promo.title}</h2>
      <p>${data.promo.description}</p>
      <strong>R$ ${data.promo.price.toFixed(2)}</strong>
      <div id="promo-timer"></div>
      <button class="btn btn-green" onclick="acceptPromo()">Aproveitar</button>
      <button class="btn btn-ghost" onclick="closePromo()">Depois</button>
    </div>
  `;
  document.body.appendChild(modal);
  animatedCountdown(fim);
}

function animatedCountdown(fim) {
  const el = document.getElementById("promo-timer");
  const t = setInterval(() => {
    const diff = fim - Date.now();
    if (diff <= 0) return clearInterval(t);
    
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    el.innerText = `⏰ ${m}:${s.toString().padStart(2, "0")}`;
    
    if (m === 0) el.style.color = "red";
  }, 1000);
}

function closePromo() {
  sessionStorage.setItem("promoClosed", "1");
  closeModal();
}

function acceptPromo() {
  cart.push({ name: data.promo.description, price: data.promo.price });
  closePromo();
  renderCart();
}

// ============================
// COMBO INTELIGENTE
// ============================
function sugestaoCombo(total) {
  if (total < 40) return "🔥 Combo Individual: adicione refri";
  if (total < 80) return "🔥 Combo Casal: adicione broto";
  return "🔥 Combo Família: pizza grande com desconto";
}

// ============================
// RESUMO ESTILO iFOOD
// ============================
function renderCart() {
  const div = document.getElementById("cart");
  div.classList.remove("hidden");
  
  let total = 0;
  div.innerHTML = "<h3>🧾 Seu pedido</h3>";
  
  cart.forEach(i => {
    total += i.price;
    div.innerHTML += `<p>${i.name} — R$ ${i.price.toFixed(2)}</p>`;
  });
  
  div.innerHTML += `
    <div style="margin:8px 0;font-size:14px">
      ${sugestaoCombo(total)}
    </div>
    <strong>Total: R$ ${total.toFixed(2)}</strong>
    <button class="btn btn-green" onclick="sendToWhatsApp()">
      Enviar no WhatsApp
    </button>
  `;
}

// ============================
// WHATSAPP
// ============================
function sendToWhatsApp() {
  let msg = `Pedido - ${data.store.name}%0A%0A`;
  let total = 0;
  
  cart.forEach(i => {
    total += i.price;
    msg += `• ${i.name} R$ ${i.price.toFixed(2)}%0A`;
  });
  
  msg += `%0ATotal: R$ ${total.toFixed(2)}`;
  window.open(`https://wa.me/${data.store.phone}?text=${msg}`, "_blank");
}

// ============================
// EXPORT / IMPORT JSON
// ============================
function exportJSON() {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "backup-pizzaria.json";
  a.click();
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    data = JSON.parse(reader.result);
    save();
    location.reload();
  };
  reader.readAsText(file);
}

save();
window.app = { renderPublic };