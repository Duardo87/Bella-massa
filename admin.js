/* =========================
   ADMIN.JS - FINAL 100%
   Bella Massa Pizzaria
========================= */

const STORAGE_KEY = "admin-data";
const AUTH_KEY = "__admin_auth__";
const $ = id => document.getElementById(id);
const uid = () => Date.now() + Math.floor(Math.random() * 1000);

/* =========================
   LOGIN BLINDADO
========================= */
function loginAdmin(){
  const user = loginUser.value.trim();
  const pass = loginPass.value.trim();

  if(!user || !pass){
    alert("Informe usuário e senha");
    return;
  }

  const saved = JSON.parse(localStorage.getItem(AUTH_KEY));

  // Primeiro acesso define login
  if(!saved){
    localStorage.setItem(
      AUTH_KEY,
      JSON.stringify({ u: btoa(user), p: btoa(pass) })
    );
  } else {
    if(btoa(user) !== saved.u || btoa(pass) !== saved.p){
      alert("Login inválido");
      return;
    }
  }

  loginBox.classList.add("hidden");
  admin.classList.remove("hidden");
  loadAdmin();
}

/* =========================
   DATABASE
========================= */
function loadDB(){
  return (
    JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
      store:{ name:"", phone:"", open:"", close:"" },
      categories:[],
      products:[],
      extras:[],
      borders:[],
      promoWeek:{}
    }
  );
}

function saveDB(d){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
}

/* =========================
   INIT
========================= */
function loadAdmin(){
  const d = loadDB();

  storeName.value = d.store.name || "";
  storePhone.value = d.store.phone || "";
  openTime.value = d.store.open || "";
  closeTime.value = d.store.close || "";

  renderCategories();
  renderProducts();
  renderExtras();
  renderBorders();
  renderPromoWeek();
}

/* =========================
   STORE
========================= */
function saveStore(){
  const d = loadDB();
  d.store = {
    name: storeName.value,
    phone: storePhone.value.replace(/\D/g,""),
    open: openTime.value,
    close: closeTime.value
  };
  saveDB(d);
  alert("Dados da loja salvos");
}

/* =========================
   CATEGORIES
========================= */
function addCategory(){
  const d = loadDB();
  if(!catName.value.trim()) return;

  d.categories.push({
    id: uid(),
    name: catName.value,
    order: d.categories.length + 1,
    active: true
  });

  catName.value = "";
  saveDB(d);
  renderCategories();
}

function renderCategories(){
  const d = loadDB();

  catList.innerHTML = d.categories
    .sort((a,b)=>a.order-b.order)
    .map((c,i)=>`
      <div class="row">
        <input value="${c.name}" onchange="editCategory(${c.id},this.value)">
        <button onclick="toggleCategory(${c.id})">${c.active?"👁":"⏸"}</button>
        <button onclick="moveCategory(${i},-1)">⬆</button>
        <button onclick="moveCategory(${i},1)">⬇</button>
        <button onclick="deleteCategory(${c.id})">🗑</button>
      </div>
    `).join("");

  prodCat.innerHTML = d.categories
    .filter(c=>c.active)
    .map(c=>`<option value="${c.id}">${c.name}</option>`)
    .join("");
}

function editCategory(id,value){
  const d = loadDB();
  d.categories.find(c=>c.id===id).name = value;
  saveDB(d);
}

function toggleCategory(id){
  const d = loadDB();
  const c = d.categories.find(c=>c.id===id);
  c.active = !c.active;
  saveDB(d);
  renderCategories();
}

function moveCategory(i,dir){
  const d = loadDB();
  const arr = d.categories.sort((a,b)=>a.order-b.order);
  if(!arr[i+dir]) return;
  [arr[i].order, arr[i+dir].order] = [arr[i+dir].order, arr[i].order];
  saveDB(d);
  renderCategories();
}

function deleteCategory(id){
  if(!confirm("Apagar categoria e produtos?")) return;
  const d = loadDB();
  d.categories = d.categories.filter(c=>c.id!==id);
  d.products = d.products.filter(p=>p.categoryId!==id);
  saveDB(d);
  renderCategories();
  renderProducts();
}

/* =========================
   PRODUCTS
========================= */
function addProduct(){
  const d = loadDB();

  if(!prodName.value.trim()) return;

  const p = {
    id: uid(),
    categoryId: +prodCat.value,
    name: prodName.value,
    desc: prodDesc.value,
    prices:{
      P: priceP.value ? +priceP.value : null,
      M: priceM.value ? +priceM.value : null,
      G: priceG.value ? +priceG.value : null
    },
    maxFlavors: +prodFlavors.value || 1,
    image: null,
    order: d.products.length + 1,
    active: true
  };

  const file = prodImage.files[0];
  if(file){
    const reader = new FileReader();
    reader.onload = ()=>{
      p.image = reader.result;
      d.products.push(p);
      saveDB(d);
      renderProducts();
      clearProductForm();
    };
    reader.readAsDataURL(file);
  } else {
    d.products.push(p);
    saveDB(d);
    renderProducts();
    clearProductForm();
  }
}

function clearProductForm(){
  prodName.value="";
  prodDesc.value="";
  priceP.value="";
  priceM.value="";
  priceG.value="";
  prodFlavors.value="";
  prodImage.value="";
}

function renderProducts(){
  const d = loadDB();

  productList.innerHTML = d.products
    .sort((a,b)=>a.order-b.order)
    .map((p,i)=>`
      <div class="row" style="align-items:center;gap:4px">
        <input value="${p.name}" onchange="editProduct(${p.id},'name',this.value)">
        <input value="${p.desc||""}" onchange="editProduct(${p.id},'desc',this.value)" placeholder="Descrição">
        <input value="${p.prices.P||""}" onchange="editPrice(${p.id},'P',this.value)" placeholder="P">
        <input value="${p.prices.M||""}" onchange="editPrice(${p.id},'M',this.value)" placeholder="M">
        <input value="${p.prices.G||""}" onchange="editPrice(${p.id},'G',this.value)" placeholder="G">
        ${p.image?"📸":"❌"}
        <button onclick="toggleProduct(${p.id})">${p.active?"👁":"⏸"}</button>
        <button onclick="moveProduct(${i},-1)">⬆</button>
        <button onclick="moveProduct(${i},1)">⬇</button>
        <button onclick="deleteProduct(${p.id})">🗑</button>
      </div>
    `).join("");
}

function editProduct(id,field,value){
  const d = loadDB();
  d.products.find(p=>p.id===id)[field] = value;
  saveDB(d);
}

function editPrice(id,size,value){
  const d = loadDB();
  d.products.find(p=>p.id===id).prices[size] = value ? Number(value) : null;
  saveDB(d);
}

function toggleProduct(id){
  const d = loadDB();
  const p = d.products.find(p=>p.id===id);
  p.active = !p.active;
  saveDB(d);
  renderProducts();
}

function moveProduct(i,dir){
  const d = loadDB();
  const arr = d.products.sort((a,b)=>a.order-b.order);
  if(!arr[i+dir]) return;
  [arr[i].order, arr[i+dir].order] = [arr[i+dir].order, arr[i].order];
  saveDB(d);
  renderProducts();
}

function deleteProduct(id){
  if(!confirm("Apagar produto?")) return;
  const d = loadDB();
  d.products = d.products.filter(p=>p.id!==id);
  saveDB(d);
  renderProducts();
}

/* =========================
   EXTRAS
========================= */
function addExtra(){
  const d = loadDB();
  if(!extraName.value.trim()) return;

  d.extras.push({
    id: uid(),
    name: extraName.value,
    price: +extraPrice.value,
    order: d.extras.length + 1,
    active: true
  });

  extraName.value="";
  extraPrice.value="";
  saveDB(d);
  renderExtras();
}

function renderExtras(){
  const d = loadDB();
  extraList.innerHTML = d.extras.map(e=>`
    <div class="row">
      <input value="${e.name}" onchange="editExtra(${e.id},'name',this.value)">
      <input value="${e.price}" onchange="editExtra(${e.id},'price',this.value)">
      <button onclick="deleteExtra(${e.id})">🗑</button>
    </div>
  `).join("");
}

function editExtra(id,field,value){
  const d = loadDB();
  d.extras.find(e=>e.id===id)[field] = field==="price" ? Number(value) : value;
  saveDB(d);
}

function deleteExtra(id){
  const d = loadDB();
  d.extras = d.extras.filter(e=>e.id!==id);
  saveDB(d);
  renderExtras();
}

/* =========================
   BORDERS
========================= */
function addBorder(){
  const d = loadDB();
  if(!borderName.value.trim()) return;

  d.borders.push({
    id: uid(),
    name: borderName.value,
    price: +borderPrice.value,
    order: d.borders.length + 1,
    active: true
  });

  borderName.value="";
  borderPrice.value="";
  saveDB(d);
  renderBorders();
}

function renderBorders(){
  const d = loadDB();
  borderList.innerHTML = d.borders.map(b=>`
    <div class="row">
      <input value="${b.name}" onchange="editBorder(${b.id},'name',this.value)">
      <input value="${b.price}" onchange="editBorder(${b.id},'price',this.value)">
      <button onclick="deleteBorder(${b.id})">🗑</button>
    </div>
  `).join("");
}

function editBorder(id,field,value){
  const d = loadDB();
  d.borders.find(b=>b.id===id)[field] = field==="price" ? Number(value) : value;
  saveDB(d);
}

function deleteBorder(id){
  const d = loadDB();
  d.borders = d.borders.filter(b=>b.id!==id);
  saveDB(d);
  renderBorders();
}

/* =========================
   PROMO WEEK
========================= */
function renderPromoWeek(){
  const d = loadDB();
  const days=["Dom","Seg","Ter","Qua","Qui","Sex","Sab"];

  promoWeek.innerHTML = days.map((day,i)=>`
    <div class="row">
      <strong>${day}</strong>
      <input placeholder="Título" value="${d.promoWeek[i]?.title||""}" onchange="setPromo(${i},'title',this.value)">
      <input type="number" placeholder="Preço" value="${d.promoWeek[i]?.price||""}" onchange="setPromo(${i},'price',this.value)">
      <input type="checkbox" ${d.promoWeek[i]?.active?"checked":""} onchange="setPromo(${i},'active',this.checked)"> Ativa
    </div>
  `).join("");
}

function setPromo(day,field,value){
  const d = loadDB();
  d.promoWeek[day] = d.promoWeek[day] || {};
  d.promoWeek[day][field] = value;
  saveDB(d);
}

/* =========================
   EXPORT
========================= */
function exportAppJSON(){
  const d = loadDB();
  const blob = new Blob([JSON.stringify(d,null,2)],{type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "app.json";
  a.click();
}