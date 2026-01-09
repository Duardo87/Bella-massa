// ================= CONFIG =================
const WHATS_PHONE = "5562993343622";

let data = null;
let cart = [];

// ================= LOAD DATA =================
async function loadData() {
  try {
    const res = await fetch("./app.json?v=" + Date.now());
    return await res.json();
  } catch (e) {
    console.error("Erro ao carregar app.json", e);
    return {};
  }
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", async () => {
  data = await loadData();
  renderHeader();
  renderCategories();
  showPromoOfDay();
});

// ================= HEADER =================
function renderHeader() {
  document.getElementById("store-name").textContent = data.store.name;
  document.getElementById("store-phone").href =
    `https://wa.me/${data.store.phone}`;
}
// ================= PROMOÇÃO =================
function showPromoOfDay() {
  if (!data.promoWeek) return;
  const day = new Date().getDay();
  const promo = data.promoWeek[day];
  if (!promo || !promo.active) return;

  openModal(`
    <h2>🔥 ${promo.title}</h2>
    ${promo.image ? `<img src="${promo.image}" style="width:100%;border-radius:10px">` : ""}
    <strong>R$ ${promo.price.toFixed(2)}</strong>
    <button class="btn btn-green" onclick="addPromo('${promo.title}',${promo.price})">
      Adicionar ao pedido
    </button>
    <button class="btn btn-ghost" onclick="closeModal()">Fechar</button>
  `);
}

function addPromo(name, price) {
  cart.push({ name, price });
  closeModal();
  renderCart();
}

// ================= CATEGORIAS =================
function renderCategories() {
  const nav = document.getElementById("categories");
  nav.innerHTML = "";

  const cats = data.categories
    .filter(c => c.active)
    .sort((a, b) => a.order - b.order);

  cats.forEach((c, i) => {
    nav.innerHTML += `
      <button class="${i === 0 ? "active" : ""}" onclick="renderProducts(${c.id}, this)">
        ${c.name}
      </button>
    `;
  });

  if (cats.length) renderProducts(cats[0].id);
}

// ================= PRODUTOS =================
function renderProducts(categoryId, btn) {
  document.querySelectorAll("#categories button")
    .forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");

  const grid = document.getElementById("products");
  grid.innerHTML = "";

  data.products
    .filter(p => p.active && p.categoryId === categoryId)
    .sort((a, b) => a.order - b.order)
    .forEach(p => {
      grid.innerHTML += `
        <div class="product-card">
          ${p.image ? `<img src="${p.image}">` : ""}
          <h3>${p.name}</h3>
          <p>${p.desc || ""}</p>
          <button onclick="startOrder(${p.id})">Adicionar</button>
        </div>
      `;
    });
}

// ================= FLUXO DO PEDIDO =================
let currentProduct = null;
let selectedFlavors = [];
let selectedSize = null;
let selectedBorder = null;
let selectedExtras = [];

function startOrder(id) {
  currentProduct = data.products.find(p => p.id === id);
  selectedFlavors = [];
  selectedSize = null;
  selectedBorder = null;
  selectedExtras = [];
  chooseFlavors();
}

// -------- SABORES --------
function chooseFlavors() {
  openModal(`
    <h3>Escolha até ${currentProduct.maxFlavors} sabores</h3>
    ${data.products
      .filter(p => p.active && p.categoryId === currentProduct.categoryId)
      .map(p => `
        <label>
          <input type="checkbox" value="${p.name}">
          ${p.name}
        </label>
      `).join("")}
    <button onclick="confirmFlavors()">Continuar</button>
  `);
}

function confirmFlavors() {
  selectedFlavors = [...document.querySelectorAll(".promo-card input:checked")]
    .map(i => i.value);

  if (!selectedFlavors.length || selectedFlavors.length > currentProduct.maxFlavors) {
    alert("Quantidade de sabores inválida");
    return;
  }
  chooseSize();
}

// -------- TAMANHOS --------
function chooseSize() {
  const p = currentProduct.prices;
  openModal(`
    <button onclick="chooseFlavors()">⬅ Voltar</button>
    <h3>Escolha o tamanho</h3>
    ${p.P ? `<button onclick="setSize('P',${p.P})">Pequena • R$ ${p.P}</button>` : ""}
    ${p.M ? `<button onclick="setSize('M',${p.M})">Média • R$ ${p.M}</button>` : ""}
    ${p.G ? `<button onclick="setSize('G',${p.G})">Grande • R$ ${p.G}</button>` : ""}
  `);
}

function setSize(label, price) {
  selectedSize = { label, price };
  chooseBorder();
}

// -------- BORDAS --------
function chooseBorder() {
  openModal(`
    <button onclick="chooseSize()">⬅ Voltar</button>
    <h3>Borda</h3>
    <button onclick="setBorder(null)">Sem borda</button>
    ${data.borders
      .filter(b => b.active)
      .sort((a,b)=>a.order-b.order)
      .map(b => `
        <button onclick="setBorder(${b.id})">
          ${b.name} + R$ ${b.price}
        </button>
      `).join("")}
  `);
}

function setBorder(id) {
  selectedBorder = id;
  chooseExtras();
}

// -------- EXTRAS --------
function chooseExtras() {
  openModal(`
    <button onclick="chooseBorder()">⬅ Voltar</button>
    <h3>Adicionais</h3>
    ${data.extras
      .filter(e => e.active)
      .sort((a,b)=>a.order-b.order)
      .map(e => `
        <label>
          <input type="checkbox" value="${e.id}">
          ${e.name} + R$ ${e.price}
        </label>
      `).join("")}
    <button onclick="finishOrder()">Adicionar ao pedido</button>
  `);
}

// -------- FINAL --------
function finishOrder() {
  selectedExtras = [...document.querySelectorAll(".promo-card input:checked")]
    .map(i => data.extras.find(e => e.id == i.value));

  let total = selectedSize.price;
  let desc = `${currentProduct.name} (${selectedFlavors.join("/")}) - ${selectedSize.label}`;

  if (selectedBorder) {
    const b = data.borders.find(x => x.id === selectedBorder);
    total += b.price;
    desc += ` | Borda: ${b.name}`;
  }

  selectedExtras.forEach(e => {
    total += e.price;
    desc += ` | Extra: ${e.name}`;
  });

  cart.push({ name: desc, price: total });
  closeModal();
  renderCart();
}

// ================= CARRINHO =================
function renderCart() {
const c = document.getElementById("cart");
c.classList.remove("hidden");
  let total = 0;
  c.innerHTML = "<h3>Pedido</h3>";

  cart.forEach((i, idx) => {
    total += i.price;
    c.innerHTML += `
      <p>
        ${i.name} - R$ ${i.price.toFixed(2)}
        <button onclick="removeItem(${idx})">❌</button>
      </p>
    `;
  });

  c.innerHTML += `
    <textarea id="note" placeholder="Observações"></textarea>
    <input id="address" placeholder="Endereço completo">
    <select id="pay">
      <option>Forma de pagamento</option>
      <option>Dinheiro</option>
      <option>Pix</option>
      <option>Cartão</option>
    </select>
    <strong>Total: R$ ${total.toFixed(2)}</strong>
    <button onclick="sendWhats()">Enviar WhatsApp</button>
  `;
}

function removeItem(i) {
  cart.splice(i, 1);
  renderCart();
}

// ================= WHATSAPP =================
function sendWhats() {
  let msg = `🧾 *Pedido*\n\n`;
  cart.forEach(i => msg += `• ${i.name} — R$ ${i.price.toFixed(2)}\n`);
  msg += `\n📝 Obs: ${note.value}\n📍 Endereço: ${address.value}\n💳 Pagamento: ${pay.value}`;
  window.open(`https://wa.me/${WHATS_PHONE}?text=${encodeURIComponent(msg)}`);
}

// ================= MODAL =================
function openModal(html) {
  closeModal();
  const d = document.createElement("div");
  d.className = "promo-overlay";
  d.innerHTML = `<div class="promo-card">${html}</div>`;
  document.body.appendChild(d);
}
function closeModal() {
  document.querySelectorAll(".promo-overlay").forEach(m => m.remove());
}