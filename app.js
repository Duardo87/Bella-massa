// ==================================================
// CONFIG / STORAGE
// ==================================================
const STORAGE_KEY = "pizzaria-data";

const DEFAULT_DATA = {
  store: { name: "Bella Massa", phone: "5562993343622" },
  promo: null,
  products: [],
  extras: [],
  theme: "auto"
};

let data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_DATA;
let cart = [];
let selectedProduct = null;

const save = () =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

// ==================================================
// SITE PÚBLICO
// ==================================================
function renderPublic() {
  applyTheme();
  renderHeader();
  renderCategories();
  renderPromo(); // 🔥 PROMO AO ENTRAR
}

// ==================================================
// HEADER
// ==================================================
function renderHeader() {
  document.getElementById("store-name").innerText = data.store.name;
  document.getElementById("store-phone").href =
    "https://wa.me/" + data.store.phone;
}

// ==================================================
// TEMA (AUTO / DARK / LIGHT)
// ==================================================
function applyTheme() {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme =
    data.theme === "auto" ? (prefersDark ? "dark" : "light") : data.theme;

  document.body.classList.toggle("dark", theme === "dark");
}

// ==================================================
// CATEGORIAS (ESTILO iFOOD)
// ==================================================
function renderCategories() {
  const categories = [...new Set(data.products.map(p => p.category))];
  const nav = document.getElementById("categories");
  nav.innerHTML = "";

  categories.forEach((cat, index) => {
    const btn = document.createElement("button");
    btn.textContent = cat;
    if (index === 0) btn.classList.add("active");

    btn.onclick = () => {
      document
        .querySelectorAll(".categories button")
        .forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderProducts(cat);
    };

    nav.appendChild(btn);
  });

  if (categories.length) renderProducts(categories[0]);
}

// ==================================================
// PRODUTOS
// ==================================================
function renderProducts(category) {
  const grid = document.getElementById("products");
  grid.innerHTML = "";

  data.products
    .filter(p => p.category === category)
    .forEach(p => {
      grid.innerHTML += `
        <div class="product-card">
          ${p.best ? `<span class="badge">⭐ Mais pedido</span>` : ""}
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

// ==================================================
// MODAL DE ADICIONAIS (APÓS ESCOLHER SABOR)
// ==================================================
function openExtras(id) {
  selectedProduct = data.products.find(p => p.id === id);
  if (!selectedProduct) return;

  closeAnyModal();

  const extrasAtivos = (data.extras || []).filter(e => e.active !== false);

  const modal = document.createElement("div");
  modal.className = "promo-overlay";
  modal.id = "extras-modal";

  modal.innerHTML = `
    <div class="promo-card">
      <h3>➕ Adicionais</h3>

      ${
        extrasAtivos.length
          ? extrasAtivos.map(e => `
            <label class="extra-item">
              <input type="checkbox" value="${e.id}">
              <span>${e.name}</span>
              <strong>R$ ${e.price.toFixed(2)}</strong>
            </label>
          `).join("")
          : `<p style="opacity:.6">Nenhum adicional disponível</p>`
      }

      <button class="btn btn-green" onclick="confirmExtras()">
        Adicionar ao pedido
      </button>
      <button class="btn btn-ghost" onclick="closeAnyModal()">Cancelar</button>
    </div>
  `;

  document.body.appendChild(modal);
}

function confirmExtras() {
  cart.push(selectedProduct);

  document
    .querySelectorAll("#extras-modal input:checked")
    .forEach(chk => {
      const extra = data.extras.find(e => e.id == chk.value);
      if (extra) cart.push(extra);
    });

  closeAnyModal();
  renderCart();
}

// ==================================================
// PROMOÇÃO DO DIA (COM CONTADOR ATÉ MEIA-NOITE)
// ==================================================
function renderPromo() {
  if (!data.promo || !data.promo.active) return;

  const todayKey = "promoClosed-" + new Date().toISOString().slice(0, 10);
  if (localStorage.getItem(todayKey)) return;

  closeAnyModal();

  const modal = document.createElement("div");
  modal.className = "promo-overlay";

  modal.innerHTML = `
    <div class="promo-card">
      ${data.promo.image ? `<img src="${data.promo.image}">` : ""}
      <h2>🔥 Promoção do Dia</h2>
      <p>${data.promo.description}</p>
      <strong>R$ ${data.promo.price.toFixed(2)}</strong>
      <div id="promo-timer"></div>

      <button class="btn btn-green" onclick="acceptPromo()">Aproveitar</button>
      <button class="btn btn-ghost" onclick="closePromo()">Depois</button>
    </div>
  `;

  document.body.appendChild(modal);
  startDailyCountdown();
}

function startDailyCountdown() {
  const el = document.getElementById("promo-timer");

  function update() {
    const now = new Date();
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const diff = end - now;
    if (diff <= 0) {
      el.innerText = "⏰ Últimos minutos!";
      return;
    }

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    el.innerText = `⏰ Termina hoje em ${h}h ${m}m ${s}s`;
  }

  update();
  setInterval(update, 1000);
}

function closePromo() {
  const todayKey = "promoClosed-" + new Date().toISOString().slice(0, 10);
  localStorage.setItem(todayKey, "1");
  closeAnyModal();
}

function acceptPromo() {
  cart.push({
    name: data.promo.description,
    price: data.promo.price
  });
  closePromo();
  renderCart();
}

// ==================================================
// COMBO INTELIGENTE
// ==================================================
function sugestaoCombo(total) {
  if (total < 40) return "🔥 Combo Individual: adicione um refri";
  if (total < 80) return "🔥 Combo Casal: adicione pizza broto";
  return "🔥 Combo Família: pizza grande com desconto";
}

// ==================================================
// CARRINHO / RESUMO FINAL
// ==================================================
function renderCart() {
  const div = document.getElementById("cart");
  div.classList.remove("hidden");

  let total = 0;
  let html = "<h3>🧾 Seu pedido</h3>";

  cart.forEach(i => {
    total += i.price;
    html += `<p>${i.name} — R$ ${i.price.toFixed(2)}</p>`;
  });

  html += `
    <div class="combo-suggestion">${sugestaoCombo(total)}</div>
    <strong>Total: R$ ${total.toFixed(2)}</strong>
    <button class="btn btn-green" onclick="sendToWhatsApp()">
      Enviar no WhatsApp
    </button>
  `;

  div.innerHTML = html;
}

// ==================================================
// WHATSAPP
// ==================================================
function sendToWhatsApp() {
  let msg = `Pedido - ${data.store.name}%0A%0A`;
  let total = 0;

  cart.forEach(i => {
    total += i.price;
    msg += `• ${i.name} R$ ${i.price.toFixed(2)}%0A`;
  });

  msg += `%0ATotal: R$ ${total.toFixed(2)}`;

  window.open(
    `https://wa.me/${data.store.phone}?text=${msg}`,
    "_blank"
  );
}

// ==================================================
function closeAnyModal() {
  document.querySelectorAll(".promo-overlay").forEach(m => m.remove());
}

save();
window.app = { renderPublic };