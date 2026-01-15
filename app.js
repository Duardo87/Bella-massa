/* ================= DELIVERY CONFIG ================= */
const DELIVERY_ORIGIN = "Rua Flores das Paineiras, Flores do Cerrado, Goiânia - GO, 74481-866";
const FREE_KM = 3;
const PRICE_PER_KM = 2;
const GOOGLE_API_KEY = "AIzaSyA5nq8HIxuHZpFL365jwquYwTjnwUyqKcI";

let data = null;
let cart = [];
let currentProduct = null;
let selectedSize = null;
let deliveryFee = 0;

const $ = id => document.getElementById(id);

/* ================= LOAD ================= */
async function loadData(){
  const res = await fetch("./app.json?v=" + Date.now());
  return await res.json();
}

document.addEventListener("DOMContentLoaded", async ()=>{
  data = await loadData();
  $("storeName").textContent = data.store.name;
  $("storePhone").href = `https://wa.me/${data.store.phone}`;
  $("whatsFloat").href = `https://wa.me/${data.store.phone}`;
  $("btnCart").onclick = ()=>$("cartBox").classList.toggle("hidden");
  loadPromo();
  renderCategories();
});

/* ================= PROMO ================= */
function loadPromo(){
  const promo = data.promoWeek?.[new Date().getDay()];
  if(!promo || !promo.active) return;
  $("promoTitle").textContent = promo.title;
  $("promoPrice").textContent = "R$ " + promo.price.toFixed(2);
  $("promoBanner").classList.remove("hidden");
  $("promoBtn").onclick = ()=>{
    cart.push({desc: promo.title, total: promo.price});
    renderCart();
  };
}

/* ================= MENU ================= */
function renderCategories(){
  const cats = data.categories.filter(c=>c.active).sort((a,b)=>a.order-b.order);
  $("categories").innerHTML = "";
  cats.forEach((c,i)=>{
    $("categories").innerHTML += `<button class="${i===0?'active':''}" onclick="renderProducts(${c.id},this)">${c.name}</button>`;
  });
  if(cats.length) renderProducts(cats[0].id);
}

function renderProducts(catId,btn){
  document.querySelectorAll(".categories button").forEach(b=>b.classList.remove("active"));
  if(btn) btn.classList.add("active");

  $("products").innerHTML = "";
  data.products.filter(p=>p.active && p.categoryId===catId).forEach(p=>{
    $("products").innerHTML += `
      <div class="product-card">
        ${p.image?`<img src="${p.image}">`:""}
        <h3>${p.name}</h3>
        <p>${p.desc||""}</p>
        <button onclick="openSizeModal(${p.id})">Escolher</button>
      </div>`;
  });
}

/* ================= SIZE MODAL ================= */
function openSizeModal(id){
  currentProduct = data.products.find(p=>p.id===id);
  $("sizeOptions").innerHTML = "";
  Object.entries(currentProduct.prices).forEach(([k,v])=>{
    if(v) $("sizeOptions").innerHTML += `<label><input type="radio" name="size" value="${k}" data-price="${v}"> ${k} - R$ ${v}</label><br>`;
  });
  $("modal").classList.remove("hidden");
}

function closeModal(){
  $("modal").classList.add("hidden");
}

function confirmSize(){
  const opt = document.querySelector("input[name=size]:checked");
  if(!opt) return alert("Escolha o tamanho");
  cart.push({desc:`${currentProduct.name} (${opt.value})`, total:Number(opt.dataset.price)});
  closeModal();
  renderCart();
}

/* ================= CART ================= */
function renderCart(){
  let total = 0;
  $("cartItems").innerHTML = "";
  cart.forEach((i,idx)=>{
    total += i.total;
    $("cartItems").innerHTML += `<p>${i.desc} - R$ ${i.total.toFixed(2)} <button onclick="cart.splice(${idx},1);renderCart()">❌</button></p>`;
  });
  $("cartTotal").textContent = "Total: R$ " + total.toFixed(2);
}

/* ================= DELIVERY ================= */
async function calculateDelivery(addr){
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(DELIVERY_ORIGIN)}&destinations=${encodeURIComponent(addr)}&key=${GOOGLE_API_KEY}`;
  const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
  const json = await res.json();
  const km = json.rows[0].elements[0].distance.value / 1000;
  deliveryFee = km <= FREE_KM ? 0 : Math.ceil((km - FREE_KM) * PRICE_PER_KM);
  $("deliveryInfo").textContent = km <= FREE_KM ? `🚚 Entrega grátis (${km.toFixed(1)} km)` : `📍 ${km.toFixed(1)} km • Taxa R$ ${deliveryFee.toFixed(2)}`;
  return {km, fee: deliveryFee};
}

/* ================= WHATS ================= */
async function sendWhats(){
  if(!cart.length) return alert("Carrinho vazio");

  const street=$("street").value.trim(), number=$("number").value.trim(), district=$("district").value.trim();
  const payment=$("payment").value, obs=$("obs").value.trim();
  if(!street||!number||!district||!payment) return alert("Preencha endereço e pagamento");

  const addr = `${street}, ${number}, ${district}, Goiânia - GO`;
  const calc = await calculateDelivery(addr);

  let msg="🧾 *Pedido Bella Massa*%0A%0A", total=0;
  cart.forEach(i=>{total+=i.total; msg+=`• ${i.desc} — R$ ${i.total.toFixed(2)}%0A`;});
  total+=calc.fee;

  msg+=`%0A🚚 Entrega: R$ ${calc.fee.toFixed(2)}%0A`;
  msg+=`*TOTAL:* R$ ${total.toFixed(2)}%0A`;
  msg+=`📍 Endereço: ${addr}%0A💳 Pagamento: ${payment}%0A`;
  if(obs) msg+=`💬 Obs: ${obs}`;

  window.open(`https://wa.me/${data.store.phone}?text=${msg}`);
}