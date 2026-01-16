/* =========================
   APP.JS FINAL
========================= */

let data, cart=[], currentProduct=null, deliveryFee=null;
const $ = id => document.getElementById(id);

/* ===== LOAD ===== */
async function loadData(){
  const res = await fetch("./app.json?v="+Date.now());
  return res.json();
}

document.addEventListener("DOMContentLoaded", async ()=>{
  data = await loadData();

  $("storeName").textContent = data.store.name;
  $("storePhone").href = `https://wa.me/${data.store.phone}`;
  $("whatsFloat").href = `https://wa.me/${data.store.phone}`;
  $("btnCart").onclick = ()=>$("cartBox").classList.toggle("hidden");

  renderCategories();
});

/* ===== DISTÂNCIA ===== */
function getDistanceKm(lat1,lon1,lat2,lon2){
  const R=6371;
  const dLat=(lat2-lat1)*Math.PI/180;
  const dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*
    Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

/* ===== GEO ===== */
function useMyLocation(){
  navigator.geolocation.getCurrentPosition(pos=>{
    const {lat,lng,freeKm,priceKm,maxKm} = data.delivery;

    const km = getDistanceKm(
      lat, lng,
      pos.coords.latitude,
      pos.coords.longitude
    );

    if(km > maxKm) return alert("🚫 Fora da área de entrega");

    deliveryFee = km <= freeKm
      ? 0
      : Math.ceil((km - freeKm) * priceKm);

    $("deliveryInfo").textContent =
      deliveryFee===0
        ? `🚚 Entrega grátis (${km.toFixed(1)} km)`
        : `🚚 Taxa R$ ${deliveryFee.toFixed(2)} (${km.toFixed(1)} km)`;

    renderCart();
  },()=>alert("Não foi possível obter localização"));
}

/* ===== MENU ===== */
function renderCategories(){
  const cats = data.categories.filter(c=>c.active).sort((a,b)=>a.order-b.order);
  categories.innerHTML="";
  cats.forEach((c,i)=>{
    categories.innerHTML+=`
      <button class="${i===0?'active':''}" onclick="renderProducts(${c.id},this)">
        ${c.name}
      </button>`;
  });
  if(cats.length) renderProducts(cats[0].id);
}

function renderProducts(catId,btn){
  document.querySelectorAll(".categories button").forEach(b=>b.classList.remove("active"));
  if(btn) btn.classList.add("active");

  products.innerHTML="";
  data.products.filter(p=>p.active&&p.categoryId===catId).forEach(p=>{
    const price = Object.values(p.prices).find(v=>v);
    const badge = p.featured ? `<span class="badge">🏆 Mais pedida</span>` : "";

    products.innerHTML+=`
      <div class="product-card">
        ${badge}
        ${p.image?`<img src="${p.image}">`:""}
        <h3>${p.name}</h3>
        <p>${p.desc||""}</p>
        <strong>A partir de R$ ${price.toFixed(2)}</strong>
        <button onclick="openModal(${p.id})">Escolher</button>
      </div>`;
  });
}

/* ===== MODAL ===== */
function openModal(id){
  currentProduct=data.products.find(p=>p.id===id);

  sizeOptions.innerHTML="<h4>Tamanho</h4>";
  Object.entries(currentProduct.prices).forEach(([s,v])=>{
    if(v){
      sizeOptions.innerHTML+=`
        <label><input type="radio" name="size" value="${s}" data-price="${v}">
        ${s} - R$ ${v}</label><br>`;
    }
  });

  borderOptions.innerHTML="<h4>Borda</h4>";
  data.borders.filter(b=>b.active).forEach(b=>{
    borderOptions.innerHTML+=`
      <label><input type="radio" name="border" value="${b.name}" data-price="${b.price}">
      ${b.name} (+R$ ${b.price})</label><br>`;
  });

  extraOptions.innerHTML="<h4>Adicionais</h4>";
  data.extras.filter(e=>e.active).forEach(e=>{
    extraOptions.innerHTML+=`
      <label><input type="checkbox" data-name="${e.name}" data-price="${e.price}">
      ${e.name} (+R$ ${e.price})</label><br>`;
  });

  modal.classList.remove("hidden");
}
function closeModal(){ modal.classList.add("hidden"); }

function confirmProduct(){
  const size=document.querySelector("input[name=size]:checked");
  if(!size) return alert("Escolha o tamanho");

  let total=Number(size.dataset.price);
  let desc=`${currentProduct.name} (${size.value})`;

  const border=document.querySelector("input[name=border]:checked");
  if(border){ total+=+border.dataset.price; desc+=` | Borda ${border.value}`; }

  document.querySelectorAll("#extraOptions input:checked").forEach(e=>{
    total+=+e.dataset.price; desc+=` | +${e.dataset.name}`;
  });

  cart.push({desc,total});
  closeModal();
  renderCart();
}

/* ===== CART ===== */
function renderCart(){
  let total = deliveryFee || 0;
  cartItems.innerHTML="";

  cart.forEach((i,idx)=>{
    total+=i.total;
    cartItems.innerHTML+=`
      <p>${i.desc} - R$ ${i.total.toFixed(2)}
      <button onclick="cart.splice(${idx},1);renderCart()">❌</button></p>`;
  });

  if(deliveryFee!==null){
    cartItems.innerHTML+=`<p>🚚 Entrega: R$ ${(deliveryFee||0).toFixed(2)}</p>`;
  }

  cartTotal.textContent = "Total: R$ " + total.toFixed(2);
}

/* ===== WHATS ===== */
function sendWhats(){
  if(deliveryFee===null) return alert("Calcule a entrega 📍");
  if(!cart.length) return alert("Carrinho vazio");

  const street=street.value, number=number.value, district=district.value;
  const payment=payment.value, obs=obs.value;
  if(!street||!number||!district||!payment) return alert("Preencha tudo");

  let msg="🧾 *Pedido*%0A%0A";
  let total=deliveryFee;

  cart.forEach(i=>{
    total+=i.total;
    msg+=`• ${i.desc} — R$ ${i.total.toFixed(2)}%0A`;
  });

  msg+=`🚚 Entrega: R$ ${(deliveryFee||0).toFixed(2)}%0A`;
  msg+=`*TOTAL:* R$ ${total.toFixed(2)}%0A`;
  msg+=`📍 ${street}, ${number} - ${district}%0A`;
  msg+=`💳 ${payment}%0A`;
  if(obs) msg+=`💬 ${obs}`;

  window.open(`https://wa.me/${data.store.phone}?text=${msg}`);
}