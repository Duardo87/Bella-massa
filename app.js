/* =========================
   APP.JS FINAL – FECHADO
========================= */

let data, cart = [], currentProduct = null;
let deliveryFee = null;
const $ = id => document.getElementById(id);

/* ===== LOAD ===== */
async function loadData(){
  const res = await fetch("./app.json?v=" + Date.now());
  return res.json();
}

document.addEventListener("DOMContentLoaded", async ()=>{
  data = await loadData();

  storeName.textContent = data.store.name;
  storePhone.href = `https://wa.me/${data.store.phone}`;

  if(data.storeInfo){
    storeDeliveryTime.textContent = data.storeInfo.deliveryTime;
    storeAddress.textContent = data.storeInfo.address;
    storeMinOrder.textContent = `R$ ${Number(data.storeInfo.minOrder).toFixed(2)}`;
  }

  btnCart.onclick = ()=>cartBox.classList.toggle("hidden");

  renderHero();
  renderCategories();
});

/* ===== HERO / CARROSSEL ===== */
function renderHero(){
  const slides = (data.banners || []).filter(b=>b.active);

  if(!slides.length){
    heroSlides.innerHTML = `
      <div class="hero-slide active" style="background:#111">
        <div class="hero-content">
          <h2>${data.store.name}</h2>
          <p>Peça agora sua pizza 🍕</p>
          <button onclick="scrollToMenu()">Ver cardápio</button>
        </div>
      </div>`;
    return;
  }

  let index = 0;
  heroSlides.innerHTML = slides.map((b,i)=>`
    <div class="hero-slide ${i===0?'active':''}" style="background-image:url(${b.image})">
      <div class="hero-content">
        <h2>${b.title}</h2>
        <p>${b.desc}</p>
        <button onclick="scrollToMenu()">${b.button}</button>
      </div>
    </div>
  `).join("");

  setInterval(()=>{
    const s = document.querySelectorAll(".hero-slide");
    s.forEach(el=>el.classList.remove("active"));
    index = (index + 1) % s.length;
    s[index].classList.add("active");
  }, 5000);
}

function scrollToMenu(){
  categories.scrollIntoView({behavior:"smooth"});
}

/* ===== CATEGORIAS ===== */
function renderCategories(){
  const cats = data.categories.filter(c=>c.active).sort((a,b)=>a.order-b.order);
  categories.innerHTML = "";
  cats.forEach((c,i)=>{
    categories.innerHTML += `
      <button onclick="renderProducts(${c.id})">${c.name}</button>
    `;
  });
  if(cats.length) renderProducts(cats[0].id);
}

/* ===== PRODUTOS ===== */
function renderProducts(catId){
  products.innerHTML = "";
  data.products.filter(p=>p.active && p.categoryId===catId).forEach(p=>{
    const price = Object.values(p.prices).find(v=>v);
    const badge = p.featured ? `<span class="badge">🏆 Mais pedida</span>` : "";

    products.innerHTML += `
      <div class="product-card">
        ${badge}
        ${p.image?`<img src="${p.image}">`:""}
        <h3>${p.name}</h3>
        <p>${p.desc||""}</p>
        <strong>A partir de R$ ${price.toFixed(2)}</strong>
        <button onclick="openModal(${p.id})">Escolher</button>
      </div>
    `;
  });
}

/* ===== MODAL ===== */
function openModal(id){
  currentProduct = data.products.find(p=>p.id===id);
  modalTitle.textContent = currentProduct.name;

  sizeOptions.innerHTML = "<h4>Tamanho</h4>";
  Object.entries(currentProduct.prices).forEach(([s,v])=>{
    if(v){
      sizeOptions.innerHTML += `
        <label><input type="radio" name="size" data-price="${v}"> ${s} - R$ ${v}</label><br>
      `;
    }
  });

  borderOptions.innerHTML = "<h4>Borda</h4>";
  data.borders.filter(b=>b.active).forEach(b=>{
    borderOptions.innerHTML += `
      <label><input type="radio" name="border" data-price="${b.price}"> ${b.name}</label><br>
    `;
  });

  extraOptions.innerHTML = "<h4>Adicionais</h4>";
  data.extras.filter(e=>e.active).forEach(e=>{
    extraOptions.innerHTML += `
      <label><input type="checkbox" data-name="${e.name}" data-price="${e.price}"> ${e.name}</label><br>
    `;
  });

  modal.classList.remove("hidden");
}

function closeModal(){
  modal.classList.add("hidden");
}

function confirmProduct(){
  const size = document.querySelector("input[name=size]:checked");
  if(!size) return alert("Escolha o tamanho");

  let total = Number(size.dataset.price);
  let desc = currentProduct.name;

  document.querySelectorAll("input[name=border]:checked").forEach(b=>{
    total += Number(b.dataset.price);
    desc += " + borda";
  });

  document.querySelectorAll("#extraOptions input:checked").forEach(e=>{
    total += Number(e.dataset.price);
    desc += ` +${e.dataset.name}`;
  });

  cart.push({desc,total});
  closeModal();
  renderCart();
}

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

/* ===== GEOLOCALIZAÇÃO ===== */
function useMyLocation(){
  navigator.geolocation.getCurrentPosition(pos=>{
    const {lat,lng,freeKm,priceKm,maxKm} = data.delivery;

    const km = getDistanceKm(
      lat, lng,
      pos.coords.latitude,
      pos.coords.longitude
    );

    if(km > maxKm){
      alert("🚫 Fora da área de entrega");
      return;
    }

    deliveryFee = km <= freeKm
      ? 0
      : Math.ceil((km - freeKm) * priceKm);

    deliveryInfo.textContent =
      deliveryFee===0
        ? `🚚 Entrega grátis (${km.toFixed(1)} km)`
        : `🚚 Entrega R$ ${deliveryFee.toFixed(2)} (${km.toFixed(1)} km)`;

    renderCart();
  },()=>alert("Não foi possível obter localização"));
}

/* ===== CARRINHO ===== */
function renderCart(){
  let total = deliveryFee || 0;
  cartItems.innerHTML = "";

  cart.forEach((i,idx)=>{
    total += i.total;
    cartItems.innerHTML += `
      <p>${i.desc} - R$ ${i.total.toFixed(2)}
      <button onclick="cart.splice(${idx},1);renderCart()">❌</button></p>
    `;
  });

  cartTotal.textContent = `Total: R$ ${total.toFixed(2)}`;
}

/* ===== WHATSAPP ===== */
function sendWhats(){
  if(deliveryFee === null) return alert("Calcule a entrega 📍");
  if(!cart.length) return alert("Carrinho vazio");

  const min = Number(data.storeInfo?.minOrder || 0);
  const totalPedido = cart.reduce((s,i)=>s+i.total,0);

  if(totalPedido < min){
    alert(`Pedido mínimo: R$ ${min.toFixed(2)}`);
    return;
  }

  const rua = street.value;
  const numero = number.value;
  const bairro = district.value;
  const pagamento = payment.value;
  const obs = obs.value;

  if(!rua || !numero || !bairro || !pagamento){
    alert("Preencha endereço e pagamento");
    return;
  }

  let msg = "🧾 *Pedido Bella Massa*%0A";
  let total = deliveryFee;

  cart.forEach(i=>{
    total += i.total;
    msg += `• ${i.desc} — R$ ${i.total.toFixed(2)}%0A`;
  });

  msg += `🚚 Entrega: R$ ${deliveryFee.toFixed(2)}%0A`;
  msg += `*TOTAL:* R$ ${total.toFixed(2)}%0A`;
  msg += `📍 ${rua}, ${numero} - ${bairro}%0A`;
  msg += `💳 ${pagamento}%0A`;
  if(obs) msg += `💬 ${obs}`;

  window.location.href = `https://wa.me/${data.store.phone}?text=${msg}`;
}