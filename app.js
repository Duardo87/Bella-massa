let data={}, cart=[], currentProduct=null, deliveryFee=0;
const $=id=>document.getElementById(id);

/* ===== LOAD ===== */
async function loadData(){
  try{
    const r=await fetch("app.json?"+Date.now());
    return await r.json();
  }catch{
    return {};
  }
}

document.addEventListener("DOMContentLoaded",async()=>{
  data=await loadData();

  data.store ||= {};
  data.delivery ||= {lat:0,lng:0,freeKm:0,priceKm:0,maxKm:0};
  data.categories ||= [];
  data.products ||= [];
  data.extras ||= [];
  data.borders ||= [];
  data.storeInfo ||= {deliveryTime:"30 - 50 min",address:"",minOrder:0};

  storeName.textContent=data.store.name||"Loja";
  storePhone.href="https://wa.me/"+(data.store.phone||"");

  storeDeliveryTime.textContent=data.storeInfo.deliveryTime;
  storeAddress.textContent=data.storeInfo.address||"";
  storeMinOrder.textContent="R$ "+Number(data.storeInfo.minOrder).toFixed(2);

  btnCart.onclick=()=>cartBox.classList.toggle("hidden");

  renderCategories();
});

/* ===== CATEGORIAS ===== */
function renderCategories(){
  categories.innerHTML="";
  const cats=data.categories.filter(c=>c.active).sort((a,b)=>a.order-b.order);
  cats.forEach(c=>{
    categories.innerHTML+=`<button onclick="renderProducts(${c.id})">${c.name}</button>`;
  });
  if(cats.length) renderProducts(cats[0].id);
}

/* ===== PRODUTOS ===== */
function renderProducts(catId){
  products.innerHTML="";
  data.products.filter(p=>p.active && p.categoryId===catId).forEach(p=>{
    const price=Number(Object.values(p.prices||{}).find(v=>v)||0);
    products.innerHTML+=`
      <div class="product-card">
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
  modalTitle.textContent=currentProduct.name;

  sizeOptions.innerHTML="<h4>Tamanho</h4>";
  Object.entries(currentProduct.prices||{}).forEach(([s,v])=>{
    if(v){
      sizeOptions.innerHTML+=`
        <label>
          <input type="radio" name="size" data-price="${Number(v)}">
          ${s} — R$ ${Number(v).toFixed(2)}
        </label><br>`;
    }
  });

  borderOptions.innerHTML="<h4>Borda</h4>";
  data.borders.filter(b=>b.active).forEach(b=>{
    borderOptions.innerHTML+=`
      <label>
        <input type="radio" name="border" data-price="${Number(b.price)}">
        ${b.name} (+ R$ ${Number(b.price).toFixed(2)})
      </label><br>`;
  });

  extraOptions.innerHTML="<h4>Adicionais</h4>";
  data.extras.filter(e=>e.active).forEach(e=>{
    extraOptions.innerHTML+=`
      <label>
        <input type="checkbox" data-price="${Number(e.price)}" data-name="${e.name}">
        ${e.name} (+ R$ ${Number(e.price).toFixed(2)})
      </label><br>`;
  });

  modal.classList.remove("hidden");
}

function closeModal(){
  modal.classList.add("hidden");
}

/* ===== CONFIRMAR PRODUTO ===== */
function confirmProduct(){
  const size=document.querySelector("input[name=size]:checked");
  if(!size) return alert("Escolha o tamanho");

  let total=Number(size.dataset.price);
  let desc=currentProduct.name;

  document.querySelectorAll("input[name=border]:checked").forEach(b=>{
    const v=Number(b.dataset.price)||0;
    total+=v;
    desc+=` + borda`;
  });

  document.querySelectorAll("#extraOptions input:checked").forEach(e=>{
    const v=Number(e.dataset.price)||0;
    total+=v;
    desc+=` + ${e.dataset.name}`;
  });

  cart.push({desc,total});
  closeModal();
  renderCart();
}

/* ===== CARRINHO ===== */
function renderCart(){
  cartItems.innerHTML="";
  let total=Number(deliveryFee)||0;

  cart.forEach((i,idx)=>{
    total+=Number(i.total)||0;
    cartItems.innerHTML+=`
      <p>
        ${i.desc} — R$ ${Number(i.total).toFixed(2)}
        <button onclick="cart.splice(${idx},1);renderCart()">❌</button>
      </p>`;
  });

  cartTotal.textContent="Total: R$ "+total.toFixed(2);
}

/* ===== DISTÂNCIA ===== */
function getDistanceKm(a,b,c,d){
  const R=6371;
  const dLat=(c-a)*Math.PI/180;
  const dLon=(d-b)*Math.PI/180;
  const x=Math.sin(dLat/2)**2+
    Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

/* ===== LOCALIZAÇÃO ===== */
function useMyLocation(){
  navigator.geolocation.getCurrentPosition(pos=>{
    const d=data.delivery;
    const km=getDistanceKm(d.lat,d.lng,pos.coords.latitude,pos.coords.longitude);
    if(km>d.maxKm) return alert("Fora da área de entrega");

    deliveryFee=km<=d.freeKm?0:Math.ceil((km-d.freeKm)*d.priceKm);
    deliveryInfo.textContent=deliveryFee===0
      ?"Entrega grátis"
      :"Entrega R$ "+deliveryFee.toFixed(2);

    renderCart();
  },()=>alert("Não foi possível obter localização"));
}

/* ===== WHATSAPP ===== */
function sendWhats(){
  if(!cart.length) return alert("Carrinho vazio");

  let total=deliveryFee;
  let msg="🧾 *Pedido Bella Massa*%0A";

  cart.forEach(i=>{
    total+=i.total;
    msg+=`• ${i.desc} — R$ ${i.total.toFixed(2)}%0A`;
  });

  msg+=`🚚 Entrega: R$ ${deliveryFee.toFixed(2)}%0A`;
  msg+=`*TOTAL:* R$ ${total.toFixed(2)}`;

  window.location.href=`https://wa.me/${data.store.phone}?text=${msg}`;
}