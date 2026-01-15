/* ================= CONFIG PROFISSIONAL ================= */
const DELIVERY_ORIGIN = "Rua Flores das Paineiras, Flores do Cerrado, Goiânia - GO, 74481-866";
const FREE_KM = 3;
const MAX_KM = 10;
const PRICE_PER_KM = 2;
const GOOGLE_API_KEY = "AIzaSyA5nq8HIxuHZpFL365jwquYwTjnwUyqKcI";

const OPEN_TIME = "18:00";
const CLOSE_TIME = "23:30";

/* ================= STATE ================= */
let data = null;
let cart = [];
let currentProduct = null;
let deliveryFee = 0;

const $ = id => document.getElementById(id);

/* ================= UTILS ================= */
function isOpenNow(){
  const now = new Date();
  const [oh, om] = OPEN_TIME.split(":").map(Number);
  const [ch, cm] = CLOSE_TIME.split(":").map(Number);

  const open = new Date();
  open.setHours(oh, om, 0);

  const close = new Date();
  close.setHours(ch, cm, 0);

  return now >= open && now <= close;
}

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
  $("btnCart").onclick = () => $("cartBox").classList.toggle("hidden");

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
    cart.push({ desc: promo.title, total: promo.price });
    renderCart();
  };
}

/* ================= MENU ================= */
function renderCategories(){
  const cats = data.categories.filter(c=>c.active).sort((a,b)=>a.order-b.order);
  $("categories").innerHTML = "";
  cats.forEach((c,i)=>{
    $("categories").innerHTML += `
      <button class="${i===0?'active':''}" onclick="renderProducts(${c.id},this)">
        ${c.name}
      </button>`;
  });
  if(cats.length) renderProducts(cats[0].id);
}

function renderProducts(catId,btn){
  document.querySelectorAll(".categories button").forEach(b=>b.classList.remove("active"));
  if(btn) btn.classList.add("active");

  $("products").innerHTML = "";
  data.products
    .filter(p=>p.active && p.categoryId===catId)
    .forEach(p=>{
      $("products").innerHTML += `
        <div class="product-card">
          ${p.image?`<img src="${p.image}">`:""}
          <h3>${p.name}</h3>
          <p>${p.desc||""}</p>
          <button onclick="openSizeModal(${p.id})">Escolher</button>
        </div>`;
    });
}

/* ================= TAMANHO ================= */
function openSizeModal(id){
  currentProduct = data.products.find(p=>p.id===id);
  $("sizeOptions").innerHTML = "";

  Object.entries(currentProduct.prices).forEach(([size,price])=>{
    if(price){
      $("sizeOptions").innerHTML += `
        <label>
          <input type="radio" name="size" value="${size}" data-price="${price}">
          ${size} - R$ ${price.toFixed(2)}
        </label><br>`;
    }
  });

  $("modal").classList.remove("hidden");
}

function closeModal(){
  $("modal").classList.add("hidden");
}

function confirmSize(){
  const opt = document.querySelector("input[name=size]:checked");
  if(!opt) return alert("Escolha o tamanho");

  cart.push({
    desc: `${currentProduct.name} (${opt.value})`,
    total: Number(opt.dataset.price)
  });

  closeModal();
  renderCart();
}

/* ================= CARRINHO ================= */
function renderCart(){
  let total = 0;
  $("cartItems").innerHTML = "";

  cart.forEach((i,idx)=>{
    total += i.total;
    $("cartItems").innerHTML += `
      <p>${i.desc} - R$ ${i.total.toFixed(2)}
      <button onclick="cart.splice(${idx},1);renderCart()">❌</button></p>`;
  });

  $("cartTotal").textContent = "Total: R$ " + total.toFixed(2);
}

/* ================= DELIVERY (CORRIGIDO) ================= */
async function calculateDelivery(address){
  try{
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(DELIVERY_ORIGIN)}&destinations=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;

    const res = await fetch(url);
    const json = await res.json();

    if (!json.rows || !json.rows[0].elements[0].distance){
      alert("❌ Não foi possível calcular a entrega. Verifique o endereço.");
      throw new Error("Erro distância");
    }

    const km = json.rows[0].elements[0].distance.value / 1000;

    if(km > MAX_KM){
      alert("🚫 Fora da nossa área de entrega (máx. 10 km)");
      throw new Error("Fora da área");
    }

    deliveryFee = km <= FREE_KM ? 0 : Math.ceil((km - FREE_KM) * PRICE_PER_KM);

    $("deliveryInfo").textContent =
      km <= FREE_KM
        ? `🚚 Entrega grátis (${km.toFixed(1)} km)`
        : `📍 ${km.toFixed(1)} km • Taxa R$ ${deliveryFee.toFixed(2)}`;

    return { km, fee: deliveryFee };

  } catch (err){
    alert("❌ Erro ao calcular entrega. Tente novamente.");
    throw err;
  }
}

/* ================= WHATS ================= */
async function sendWhats(){
  if(!isOpenNow()){
    alert("⏰ Estamos fechados no momento.\nAbrimos das 18:00 às 23:30 ❤️");
    return;
  }

  if(!cart.length){
    alert("Carrinho vazio");
    return;
  }

  const street = $("street").value.trim();
  const number = $("number").value.trim();
  const district = $("district").value.trim();
  const payment = $("payment").value;
  const obs = $("obs").value.trim();

  if(!street || !number || !district || !payment){
    alert("Preencha endereço completo e forma de pagamento");
    return;
  }

  const address = `${street}, ${number}, ${district}, Goiânia - GO`;

  let calc;
  try{
    calc = await calculateDelivery(address);
  }catch{
    return;
  }

  let msg = "🧾 *Pedido Bella Massa*%0A%0A";
  let total = 0;

  cart.forEach(i=>{
    total += i.total;
    msg += `• ${i.desc} — R$ ${i.total.toFixed(2)}%0A`;
  });

  total += calc.fee;

  msg += `%0A🚚 Entrega: R$ ${calc.fee.toFixed(2)}%0A`;
  msg += `*TOTAL:* R$ ${total.toFixed(2)}%0A`;
  msg += `📍 Endereço: ${address}%0A`;
  msg += `💳 Pagamento: ${payment}%0A`;
  if(obs) msg += `💬 Obs: ${obs}`;

  window.open(`https://wa.me/${data.store.phone}?text=${msg}`);
}