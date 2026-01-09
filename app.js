/* ==================================================
   STATE / HELPERS
================================================== */
let data = null;
let cart = [];
let currentProduct = null;
let step = 1;
let sel = { size:null, flavors:[], border:null, extras:[] };

const $ = id => document.getElementById(id);

/* ==================================================
   LOAD DATA
================================================== */
async function loadData(){
  const res = await fetch("./app.json?v=" + Date.now());
  return await res.json();
}

/* ==================================================
   INIT
================================================== */
document.addEventListener("DOMContentLoaded", async () => {
  data = await loadData();

  if ($("storePhone")) $("storePhone").href = `https://wa.me/${data.store.phone}`;
  if ($("whatsFloat")) $("whatsFloat").href = `https://wa.me/${data.store.phone}`;
  if ($("btnCart")) $("btnCart").onclick = () => toggleCart();

  loadPromo();
  renderCategories();
  renderReviews();

  if (data && data.store && $("storeName")) {
    $("storeName").textContent = data.store.name;
  }
});

/* ==================================================
   PROMOÇÃO DO DIA
================================================== */
function loadPromo(){
  if (!data.promoWeek) return;

  const today = new Date().getDay();
  const promo = data.promoWeek[today];
  if (!promo || !promo.active) return;

  $("promoTitle").textContent = promo.title;
  $("promoDesc").textContent = promo.desc || "";
  $("promoPrice").textContent = "R$ " + Number(promo.price).toFixed(2);
  $("promoBanner").classList.remove("hidden");

  $("promoBtn").onclick = () => {
    cart.push({
      desc: promo.title + (promo.desc ? " – " + promo.desc : ""),
      total: Number(promo.price)
    });
    renderCart();
  };
}

/* ==================================================
   CATEGORIES / PRODUCTS
================================================== */
function renderCategories(){
  const cats = (data.categories || [])
    .filter(c => c.active)
    .sort((a,b)=>a.order-b.order);

  $("categories").innerHTML = "";
  cats.forEach((c,i)=>{
    $("categories").innerHTML +=
      `<button class="${i===0?'active':''}" onclick="renderProducts(${c.id},this)">
        ${c.name}
      </button>`;
  });

  if (cats.length) renderProducts(cats[0].id);
}

function renderProducts(catId, btn){
  document.querySelectorAll(".categories button")
    .forEach(b=>b.classList.remove("active"));
  if (btn) btn.classList.add("active");

  $("products").innerHTML = "";
  (data.products || [])
    .filter(p => p.active && p.categoryId === catId)
    .forEach(p=>{
      $("products").innerHTML += `
        <div class="product-card">
          ${p.badge ? `<span class="badge">${p.badge}</span>` : ""}
          ${p.image ? `<img src="${p.image}" loading="lazy">` : ""}
          <h3>${p.name}</h3>
          <p>${p.desc || ""}</p>
          <button onclick="startOrder(${p.id}); fbEvent('ViewContent')">
            Escolher
          </button>
        </div>`;
    });
}

/* ==================================================
   WIZARD
================================================== */
function startOrder(id){
  currentProduct = data.products.find(p=>p.id===id);
  step = 1;
  sel = { size:null, flavors:[], border:null, extras:[] };
  $("modal").classList.remove("hidden");
  $("nextStep").textContent = "Continuar";
  renderStep();
}

$("prevStep").onclick = () => { if (step>1){ step--; renderStep(); } };
$("nextStep").onclick = () => nextStep();

function renderStep(){
  if (step===1) stepSize();
  if (step===2) stepFlavors();
  if (step===3) stepBorder();
  if (step===4) stepExtras();
}

function stepSize(){
  $("stepTitle").textContent = "📏 Tamanho";
  let html = "";
  Object.entries(currentProduct.prices || {}).forEach(([k,v])=>{
    html += `<label>
      <input type="radio" name="size" value="${k}" data-price="${v}">
      ${k} - R$ ${v}
    </label><br>`;
  });
  $("stepContent").innerHTML = html;
}

function stepFlavors(){
  if (!currentProduct.maxFlavors || currentProduct.maxFlavors === 1){
    step++; renderStep(); return;
  }
  $("stepTitle").textContent = `🍕 Escolha até ${currentProduct.maxFlavors} sabores`;
  let html = "";
  data.products
    .filter(p => p.categoryId === currentProduct.categoryId && p.prices)
    .forEach(p=>{
      html += `<label>
        <input type="checkbox" value="${p.name}" data-prices='${JSON.stringify(p.prices)}'>
        ${p.name}
      </label><br>`;
    });
  $("stepContent").innerHTML = html;
}

function stepBorder(){
  $("stepTitle").textContent = "🥖 Borda (opcional)";
  let html = "";
  (data.borders || []).filter(b=>b.active).forEach(b=>{
    html += `<label>
      <input type="radio" name="border" value="${b.name}" data-price="${b.price}">
      ${b.name} (+R$ ${b.price})
    </label><br>`;
  });
  $("stepContent").innerHTML = html;
}

function stepExtras(){
  $("stepTitle").textContent = "➕ Adicionais";
  let html = "";
  (data.extras || []).filter(e=>e.active).forEach(e=>{
    html += `<label>
      <input type="checkbox" value="${e.name}" data-price="${e.price}">
      ${e.name} (+R$ ${e.price})
    </label><br>`;
  });
  $("stepContent").innerHTML = html;
  $("nextStep").textContent = "Adicionar ao carrinho";
}

function nextStep(){
  if (step===1){
    const s = document.querySelector("input[name=size]:checked");
    if (!s){ alert("Escolha o tamanho"); return; }
    sel.size = s;
  }

  if (step===2 && currentProduct.maxFlavors>1){
    const f = [...$("stepContent").querySelectorAll("input:checked")];
    if (!f.length){ alert("Escolha ao menos 1 sabor"); return; }
    if (f.length > currentProduct.maxFlavors){ alert("Máx de sabores atingido"); return; }
    sel.flavors = f;
  }

  if (step===3){
    sel.border = document.querySelector("input[name=border]:checked");
  }

  if (step===4){
    sel.extras = [...$("stepContent").querySelectorAll("input:checked")];
    finalizeItem(); return;
  }

  step++; renderStep();
}

function finalizeItem(){
  let total = Number(sel.size.dataset.price);
  let desc = `${currentProduct.name} (${sel.size.value})`;

  if (sel.flavors.length){
    let max = 0;
    sel.flavors.forEach(f=>{
      const prices = JSON.parse(f.dataset.prices);
      const p = prices[sel.size.value] || 0;
      if (p > max) max = p;
    });
    total = max;
    desc += " – " + sel.flavors.map(f=>f.value).join(" + ");
  }

  if (sel.border){
    total += Number(sel.border.dataset.price);
    desc += " + Borda " + sel.border.value;
  }

  sel.extras.forEach(e=>{
    total += Number(e.dataset.price);
    desc += " + " + e.value;
  });

  cart.push({ desc, total });
  $("modal").classList.add("hidden");
  $("nextStep").textContent = "Continuar";
  renderCart();
}

/* ==================================================
   CART
================================================== */
function renderCart(){
  let html = "", total = 0;
  cart.forEach((i,idx)=>{
    total += i.total;
    html += `<p>${i.desc} - R$ ${i.total.toFixed(2)}
      <button onclick="cart.splice(${idx},1);renderCart()">❌</button></p>`;
  });
  $("cartItems").innerHTML = html;
  $("cartTotal").textContent = "Total: R$ " + total.toFixed(2);
  $("cartBox").classList.remove("hidden");
}

function toggleCart(){
  $("cartBox").classList.toggle("hidden");
}

/* ==================================================
   WHATSAPP
================================================== */
function sendWhats(){
  if (!cart.length){ alert("Carrinho vazio"); return; }

  const address = $("address").value.trim();
  const payment = $("payment").value;
  const obs = $("obs").value.trim();

  if (!address || !payment){
    alert("Preencha endereço e forma de pagamento");
    return;
  }

  let msg = "🧾 *Pedido Bella Massa*%0A%0A";
  let total = 0;

  cart.forEach(i=>{
    total += i.total;
    msg += `• ${i.desc} — R$ ${i.total.toFixed(2)}%0A`;
  });

  msg += `%0A*Total:* R$ ${total.toFixed(2)}%0A`;
  msg += `🏠 *Endereço:* ${address}%0A`;
  msg += `💳 *Pagamento:* ${payment}%0A`;
  if (obs) msg += `💬 *Obs:* ${obs}%0A`;

  fbEvent('Lead');
  window.open(`https://wa.me/${data.store.phone}?text=${msg}`);
}

/* ==================================================
   META EVENT
================================================== */
function fbEvent(name){
  if (window && window.fbq) {
    try { fbq('track', name); } catch(e){}
  }
}

/* ==================================================
   REVIEWS
================================================== */
function renderReviews(){
  if (!data.reviews) return;
  $("reviews").innerHTML = data.reviews.map(r=>`
    <div class="review">
      <img src="${r.photo}">
      <div>
        <strong>${r.name}</strong>
        ⭐⭐⭐⭐⭐
        <p>${r.text}</p>
      </div>
    </div>
  `).join("");
}