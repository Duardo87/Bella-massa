// ==================================================
// CONFIG
// ==================================================
const ADMIN_USER = "admin";
const ADMIN_PASS = "123456";
const STORAGE_KEY = "pizzaria-data";

const $ = id => document.getElementById(id);

let db = null;
let editingProductIndex = null;

// ==================================================
// AUTH
// ==================================================
function login() {
  if ($("loginUser").value !== ADMIN_USER || $("loginPass").value !== ADMIN_PASS) {
    alert("Login inválido");
    return;
  }
  $("login").classList.add("hidden");
  $("admin").classList.remove("hidden");
  loadAdmin();
}

function logout() {
  location.reload();
}

// ==================================================
// LOAD / SAVE
// ==================================================
function loadAdmin() {
  try {
    db = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {}

  if (!db) {
    db = {
      store: { name: "", phone: "" },
      categories: [],
      products: [],
      extras: [],
      borders: [],
      promoByDay: {}
    };
  }

  renderProducts();
}

function saveDB() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

// ==================================================
// PRODUCTS
// ==================================================
function renderProducts() {
  const list = $("productList");
  if (!list) return;

  list.innerHTML = "";

  db.products.forEach((p, i) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <strong>${p.name}</strong> - R$ ${p.price}
    `;
    div.onclick = () => loadProductToForm(i);
    list.appendChild(div);
  });
}

function loadProductToForm(index) {
  const p = db.products[index];
  editingProductIndex = index;

  $("prodName").value = p.name;
  $("prodDesc").value = p.description;
  $("prodPrice").value = p.price;
  $("prodCategory").value = p.category;
  $("prodImage").value = p.image || "";

  $("btnAddProduct").innerText = "💾 Salvar Alterações";
}

function addOrUpdateProduct() {
  const product = {
    name: $("prodName").value.trim(),
    description: $("prodDesc").value.trim(),
    price: Number($("prodPrice").value),
    category: $("prodCategory").value,
    image: $("prodImage").value || null
  };

  if (!product.name || !product.price) {
    alert("Preencha nome e preço");
    return;
  }

  if (editingProductIndex !== null) {
    db.products[editingProductIndex] = product;
    editingProductIndex = null;
    $("btnAddProduct").innerText = "➕ Adicionar Produto";
  } else {
    db.products.push(product);
  }

  saveDB();
  clearProductForm();
  renderProducts();
}

function clearProductForm() {
  $("prodName").value = "";
  $("prodDesc").value = "";
  $("prodPrice").value = "";
  $("prodCategory").value = "";
  $("prodImage").value = "";
}

// ==================================================
// INIT
// ==================================================
window.login = login;
window.logout = logout;
window.addOrUpdateProduct = addOrUpdateProduct;