let data = {};
let cart = [];
let currentProduct = null;
let deliveryFee = 0;

const $ = id => document.getElementById(id);

/* ================= LOAD ================= */
async function loadData(){
  try{
    const r = await fetch("app.json?" + Date.now());
    return await r.json();
  }catch{
    return {};
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  data = await loadData();

  data.store ||= {};
  data.delivery ||= { lat:0, lng:0, freeKm:0, priceKm:0, maxKm:0 };
  data.categories ||= [];
  data.products ||= [];
  data.extras ||= [];
  data.borders ||= [];
  data.promoWeek ||= {};
  data.storeInfo ||= { deliveryTime:"30 - 50 min", address:"", minOrder:0 };

  storeName.textContent = data.store.name || "Loja";
  storePhone.href = "https://wa.me/" + (data.store.phone || "");

  storeDeliveryTime.textContent = data.storeInfo.deliveryTime;
  storeAddress.textContent = data.storeInfo.address || "";
  storeMinOrder.textContent = "R$ " + Number(data.storeInfo.minOrder).toFixed(2);

  btnCart.onclick = () => cartBox.classList.toggle("hidden");

  renderWeeklyPromo();
  renderCategories();
});

/* ================= PROMO WEEK ================= */
function renderWeeklyPromo(){
  const days = ["sun","mon","tue","wed","thu","fri","sat"];
  const today = days[new Date().getDay()];
  const promo = data.promoWeek[today];

  if(!promo || !promo.active) return;

  const promoBox = document.createElement("div");
  promoBox.style.background = "#0f0f0f";
  promoBox.style.color = "#fff";
  promoBox.style.padding = "14px";
  promoBox.style.margin = "10px";
  promoBox.style.borderRadius = "16px";
  promoBox.style.fontWeight = "700";

  promoBox.innerHTML = `
    🔥 ${promo.title}
    <div style="font-size:14px;font-weight:400;margin-top:4px">
      Apenas R$ ${Number(promo.price).toFixed(2)}
    </div>
  `;

  document.body.insertBefore(promoBox, document.body.firstChild);
}

/* ================= CATEGORIES ================= */
function renderCategories(){
  categories.innerHTML = "";
  data.categories.filter(c=>c.active).sort((a,b)=>a.order-b.order)
    .forEach(c=>{
      categories.innerHTML += `<button onclick="renderProducts(${c.id})">${c.name}</button>`;
    });
  if(data.categories.length) renderProducts(data.categories[0].id);
}

/* ================= PRODUCTS ================= */
function renderProducts(catId){
  products.innerHTML = "";
  data.products.filter(p=>p.active && p.categoryId===catId).forEach(p=>{
    const price = getBasePrice(p);
    products.innerHTML += `
      <div class="product-card">
        ${p.image?`<img src="${p.image}">`:""}
        <h3>${p.name}</h3>
        <p>${p.desc||""}</p>
        <strong>A partir de R$ ${price.toFixed(2)}</strong>
        <button onclick="openModal(${p.id})">Escolher</button>
      </div>
    `;
  });
}

/* ================= HELPERS ================= */
function getBasePrice(p){
  return Math.max(...Object.values(p.prices||{}).filter(v=>v));
}

/* ================= MODAL ================= */
function openModal(id){
  currentProduct = data.products.find(p=>p.id===id);
  modalTitle.textContent = currentProduct.name;

  sizeOptions.innerHTML = `
    <div id="halfAlert" style="display:none;
      background:#fff3cd;color:#856404;
      padding:8px 12px;border-radius:8px;
      margin-bottom:10px;font-size:13px">
      ℹ️ Pizza meio a meio é cobrada pelo <strong>sabor de maior valor</strong>
    </div>
    <h4>Sabores (até 2)</h4>
  `;

  data.products
    .filter(p=>p.categoryId===currentProduct.categoryId && p.active)
    .forEach(p=>{
      sizeOptions.innerHTML += `
        <label class="flavor-item" style="display:block;margin-bottom:12px">
          <input type="checkbox" class="flavorCheck"
            data-name="${p.name}"
            data-price="${getBasePrice(p)}">
          <strong>🍕 ${p.name}</strong>
          <span style="float:right;font-weight:700">
            R$ ${getBasePrice(p).toFixed(2)}
          </span>
          <div style="font-size:13px;color:#666;margin-left:22px;margin-top:4px">
            ${p.desc||""}
          </div>
          <div class="badgeMax" style="display:none;
            margin-left:22px;margin-top:4px;
            font-size:12px;color:#b40000;font-weight:700">
            🔥 Maior valor
          </div>
        </label>
      `;
    });

  borderOptions.innerHTML = "<h4>Borda</h4>";
  data.borders.filter(b=>b.active).forEach(b=>{
    borderOptions.innerHTML += `
      <label>
        <input type="radio" name="border" data-price="${Number(b.price)}">
        ${b.name} (+ R$ ${Number(b.price).toFixed(2)})
      </label><br>
    `;
  });

  extraOptions.innerHTML = "<h4>Adicionais</h4>";
  data.extras.filter(e=>e.active).forEach(e=>{
    extraOptions.innerHTML += `
      <label>
        <input type="checkbox" data-price="${Number(e.price)}" data-name="${e.name}">
        ${e.name} (+ R$ ${Number(e.price).toFixed(2)})
      </label><br>
    `;
  });

  modal.classList.remove("hidden");

  document.querySelectorAll(".flavorCheck").forEach(chk=>{
    chk.addEventListener("change",()=>{
      const selected=[...document.querySelectorAll(".flavorCheck:checked")];
      const alertBox=$("#halfAlert");

      if(selected.length>2){
        chk.checked=false;
        alert("Você pode escolher até 2 sabores");
        return;
      }

      document.querySelectorAll(".flavor-item").forEach(i=>{
        i.style.border="none";
        i.style.padding="0";
        i.querySelector(".badgeMax").style.display="none";
      });

      alertBox.style.display = selected.length===2 ? "block" : "none";

      if(selected.length){
        const max=Math.max(...selected.map(s=>Number(s.dataset.price)));
        selected.forEach(s=>{
          if(Number(s.dataset.price)===max){
            const item=s.closest(".flavor-item");
            item.style.border="2px solid #0f0f0f";
            item.style.padding="8px";
            item.style.borderRadius="10px";
            item.querySelector(".badgeMax").style.display="block";
          }
        });
      }
    });
  });
}

function closeModal(){ modal.classList.add("hidden"); }

/* ================= CONFIRM ================= */
function confirmProduct(){
  const flavors=[...document.querySelectorAll(".flavorCheck:checked")];
  if(!flavors.length) return alert("Escolha pelo menos 1 sabor");

  let total=Math.max(...flavors.map(f=>Number(f.dataset.price)));
  let desc="Pizza: "+flavors.map(f=>f.dataset.name).join(" / ");

  document.querySelectorAll("input[name=border]:checked")
    .forEach(b=>{ total+=Number(b.dataset.price)||0; desc+=" + borda"; });

  document.querySelectorAll("#extraOptions input:checked")
    .forEach(e=>{ total+=Number(e.dataset.price)||0; desc+=" + "+e.dataset.name; });

  cart.push({desc,total});
  closeModal();
  renderCart();
}

/* ================= CART ================= */
function renderCart(){
  cartItems.innerHTML="";
  let total=deliveryFee||0;
  cart.forEach((i,idx)=>{
    total+=i.total;
    cartItems.innerHTML+=`
      <p>${i.desc} — R$ ${i.total.toFixed(2)}
      <button onclick="cart.splice(${idx},1);renderCart()">❌</button></p>`;
  });
  cartTotal.textContent="Total: R$ "+total.toFixed(2);
}

/* ================= DELIVERY ================= */
function getDistanceKm(a,b,c,d){
  const R=6371;
  const dLat=(c-a)*Math.PI/180;
  const dLon=(d-b)*Math.PI/180;
  const x=Math.sin(dLat/2)**2+
    Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

function useMyLocation(){
  navigator.geolocation.getCurrentPosition(pos=>{
    const d=data.delivery;
    const km=getDistanceKm(d.lat,d.lng,pos.coords.latitude,pos.coords.longitude);
    if(km>d.maxKm) return alert("Fora da área");

    deliveryFee=km<=d.freeKm?0:Math.ceil((km-d.freeKm)*d.priceKm);
    deliveryInfo.textContent=deliveryFee===0?"Entrega grátis":"Entrega R$ "+deliveryFee.toFixed(2);
    renderCart();
  });
}

/* ================= WHATSAPP ================= */
function sendWhats(){
  if(!cart.length) return alert("Carrinho vazio");
  let total=deliveryFee;
  let msg="🍕 *Pedido Bella Massa*%0A";
  cart.forEach(i=>{ total+=i.total; msg+=`• ${i.desc} — R$ ${i.total.toFixed(2)}%0A`; });
  msg+=`🚚 Entrega: R$ ${deliveryFee.toFixed(2)}%0A*TOTAL:* R$ ${total.toFixed(2)}`;
  window.location.href=`https://wa.me/${data.store.phone}?text=${msg}`;
}