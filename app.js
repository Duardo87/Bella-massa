// app.js — versão revisada e mais robusta

// configuração
const STORAGE_KEY = "pizzaria-data";
// coloque o número correto no formato internacional sem símbolos
const WHATS = "5562993343622";

// estado
let cart = [];

// lê dados do localStorage com segurança
function loadData() {
  let raw = {};
  try {
    raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    raw = {};
  }

  return {
    store: { name: "Bella Massa", phone: WHATS, ...(raw.store || {}) },
    products: Array.isArray(raw.products) ? raw.products : [],
    extras: Array.isArray(raw.extras) ? raw.extras : [],
    borders: Array.isArray(raw.borders) ? raw.borders : [],
    promo: raw.promo || null,
    theme: raw.theme || "auto"
  };
}

function formatCurrency(v) {
  return Number(v).toFixed(2).replace(".", ",");
}

// renderiza a página pública (chamar no init)
function renderPublic() {
  const data = loadData();

  const storeNameEl = document.getElementById("store-name");
  const storePhoneEl = document.getElementById("store-phone");

  if (storeNameEl) storeNameEl.textContent = data.store.name || "Bella Massa";
  if (storePhoneEl) storePhoneEl.href = `https://wa.me/${data.store.phone || WHATS}`;

  renderProducts(); // usa dados atuais
}

// renderiza produtos (com suporte a prices ou price único)
function renderProducts() {
  const data = loadData();
  const grid = document.getElementById("products");
  if (!grid) return;

  grid.innerHTML = "";

  if (!Array.isArray(data.products) || data.products.length === 0) {
    grid.innerHTML = `<p style="opacity:.6;padding:16px">Nenhum produto disponível</p>`;
    return;
  }

  data.products.forEach(p => {
    const img = p.image ? `<img src="${p.image}" alt="${escapeHtml(p.name)}">` : "";
    // se existir p.prices como objeto com P/M/G
    let sizeSelectHtml = "";
    if (p.prices && typeof p.prices === "object") {
      // monta opções apenas para chaves existentes (P M G)
      const opts = Object.keys(p.prices)
        .map(k => `<option value="${k}">${k} - R$ ${formatCurrency(p.prices[k])}</option>`)
        .join("");
      sizeSelectHtml = `<select id="size-${p.id}" class="size-select">${opts}</select>`;
    } else {
      // fallback para campo price único
      const price = typeof p.price === "number" ? p.price : (p.prices && p.prices.P ? p.prices.P : 0);
      sizeSelectHtml = `<select id="size-${p.id}" class="size-select">
        <option value="__single">Único - R$ ${formatCurrency(price)}</option>
      </select>`;
    }

    grid.insertAdjacentHTML("beforeend", `
      <div class="product-card">
        ${img}
        <h3>${escapeHtml(p.name)}</h3>
        <p>${escapeHtml(p.desc || "")}</p>
        <div class="price">${typeof p.price === "number" && !p.prices ? `R$ ${formatCurrency(p.price)}` : ""}</div>
        ${sizeSelectHtml}
        <button class="btn btn-green" data-action="add" data-id="${p.id}">
          Adicionar
        </button>
      </div>
    `);
  });
}

// adiciona produto ao carrinho (mantemos função global add para compatibilidade)
function add(id) {
  // delega para a versão interna
  addProductToCart(id);
}
window.add = add; // garante compatibilidade com onclick inline

function addProductToCart(id) {
  const data = loadData();
  const p = data.products.find(x => x.id == id);
  if (!p) {
    alert("Produto não encontrado");
    return;
  }

  // pega o select de tamanho, se existir
  const sizeEl = document.getElementById(`size-${id}`);
  let price = 0;
  let label = p.name;

  if (p.prices && typeof p.prices === "object" && sizeEl) {
    const size = sizeEl.value;
    price = Number(p.prices[size]) || 0;
    label = `${p.name} (${size})`;
  } else if (typeof p.price === "number") {
    price = Number(p.price);
    label = `${p.name}`;
  } else if (p.prices && p.prices.P) {
    price = Number(p.prices.P);
    label = `${p.name}`;
  } else {
    price = 0;
  }

  cart.push({ name: label, price: Number(price) });
  renderCart();
}

// renderiza o carrinho com endereço e forma de pagamento
function renderCart() {
  const div = document.getElementById("cart");
  if (!div) return;

  let total = 0;
  let html = "<h3>🧾 Seu pedido</h3>";

  if (!cart.length) {
    html += "<p style='opacity:.6'>Carrinho vazio</p>";
  } else {
    cart.forEach((i, idx) => {
      total += Number(i.price || 0);
      html += `<p>${escapeHtml(i.name)} — R$ ${formatCurrency(i.price)}</p>`;
    });
  }

  html += `
    <p><strong>Total: R$ ${formatCurrency(total)}</strong></p>

    <input id="address" placeholder="Endereço completo" style="width:100%;padding:8px;margin:6px 0">
    <select id="payment" style="width:100%;padding:8px;margin-bottom:10px">
      <option value="Dinheiro">Dinheiro</option>
      <option value="Pix">Pix</option>
      <option value="Cartão">Cartão</option>
    </select>

    <div style="display:flex;gap:8px">
      <button class="btn btn-green" data-action="send-whats">Enviar no WhatsApp</button>
      <button class="btn btn-ghost" data-action="clear-cart">Limpar</button>
    </div>
  `;

  div.innerHTML = html;
  div.classList.remove("hidden");
}

// envia para WhatsApp (pega address e payment por getElementById)
function send() {
  // compatibilidade: se alguém chamar send() globalmente
  return sendToWhatsApp();
}
window.send = send;

function sendToWhatsApp() {
  const data = loadData();
  if (!data.store || !data.store.phone) {
    alert("WhatsApp da loja não configurado");
    return;
  }

  const address = document.getElementById("address")?.value || "";
  const payment = document.getElementById("payment")?.value || "";

  let msg = `Pedido - ${data.store.name}\n\n`;
  let total = 0;

  if (!cart.length) {
    alert("Carrinho vazio");
    return;
  }

  cart.forEach(i => {
    total += Number(i.price || 0);
    msg += `• ${i.name} - R$ ${formatCurrency(i.price)}\n`;
  });

  msg += `\nTotal: R$ ${formatCurrency(total)}`;
  msg += `\n\nEndereço: ${address}`;
  msg += `\nPagamento: ${payment}`;

  const phone = data.store.phone || WHATS;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
}

// limpar carrinho
function clearCart() {
  cart = [];
  renderCart();
}
window.clearCart = clearCart;

// simples event delegation para botões (compatível com data-action usados acima)
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === "add") addProductToCart(id);
  if (action === "send-whats") sendToWhatsApp();
  if (action === "clear-cart") clearCart();
});

// util
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// expõe renderPublic para index inicializar
window.app = { renderPublic };