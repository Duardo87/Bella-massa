let data={},cart=[],currentProduct=null,deliveryFee=0;
const $=id=>document.getElementById(id);

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
  data.store=data.store||{};
  data.delivery=data.delivery||{lat:0,lng:0,freeKm:0,priceKm:0,maxKm:0};
  data.categories=data.categories||[];
  data.products=data.products||[];
  data.extras=data.extras||[];
  data.borders=data.borders||[];
  data.banners=data.banners||[];
  data.storeInfo=data.storeInfo||{deliveryTime:"30-50 min",address:"",minOrder:0};

  storeName.textContent=data.store.name||"Loja";
  storePhone.href="https://wa.me/"+(data.store.phone||"");
  storeDeliveryTime.textContent=data.storeInfo.deliveryTime;
  storeAddress.textContent=data.storeInfo.address||"";
  storeMinOrder.textContent="R$ "+Number(data.storeInfo.minOrder).toFixed(2);

  btnCart.onclick=()=>cartBox.classList.toggle("hidden");
  renderHero();
  renderCategories();
});

function renderHero(){
  const slides=(data.banners||[]).filter(b=>b.active);
  if(!slides.length){
    heroSlides.innerHTML=`<div class="hero-slide active" style="background:#111"><div class="hero-content"><h2>${data.store.name||""}</h2><button onclick="scrollToMenu()">Ver cardápio</button></div></div>`;
    return;
  }
}

function scrollToMenu(){categories.scrollIntoView({behavior:"smooth"})}

function renderCategories(){
  categories.innerHTML="";
  data.categories.filter(c=>c.active).sort((a,b)=>a.order-b.order)
    .forEach(c=>categories.innerHTML+=`<button onclick="renderProducts(${c.id})">${c.name}</button>`);
  if(data.categories.length) renderProducts(data.categories[0].id);
}

function renderProducts(cat){
  products.innerHTML="";
  data.products.filter(p=>p.active&&p.categoryId===cat).forEach(p=>{
    const price=Object.values(p.prices||{}).find(v=>v);
    products.innerHTML+=`
    <div class="product-card">
      ${p.image?`<img src="${p.image}">`:""}
      <h3>${p.name}</h3>
      <p>${p.desc||""}</p>
      <strong>A partir de R$ ${Number(price||0).toFixed(2)}</strong>
      <button onclick="openModal(${p.id})">Escolher</button>
    </div>`;
  });
}

function openModal(id){
  currentProduct=data.products.find(p=>p.id===id);
  modalTitle.textContent=currentProduct.name;
  sizeOptions.innerHTML="<h4>Tamanho</h4>";
  Object.entries(currentProduct.prices||{}).forEach(([s,v])=>{
    if(v) sizeOptions.innerHTML+=`<label><input type="radio" name="size" data-price="${v}">${s} R$ ${v}</label><br>`;
  });
  borderOptions.innerHTML="<h4>Borda</h4>";
  data.borders.filter(b=>b.active).forEach(b=>{
    borderOptions.innerHTML+=`<label><input type="radio" name="border" data-price="${b.price}">${b.name}</label><br>`;
  });
  extraOptions.innerHTML="<h4>Adicionais</h4>";
  data.extras.filter(e=>e.active).forEach(e=>{
    extraOptions.innerHTML+=`<label><input type="checkbox" data-price="${e.price}" data-name="${e.name}">${e.name}</label><br>`;
  });
  modal.classList.remove("hidden");
}

function closeModal(){modal.classList.add("hidden")}

function confirmProduct(){
  const s=document.querySelector("input[name=size]:checked");
  if(!s) return alert("Escolha o tamanho");
  let total=Number(s.dataset.price),desc=currentProduct.name;
  document.querySelectorAll("input[name=border]:checked").forEach(b=>total+=Number(b.dataset.price));
  document.querySelectorAll("#extraOptions input:checked").forEach(e=>total+=Number(e.dataset.price));
  cart.push({desc,total});
  closeModal();renderCart();
}

function renderCart(){
  cartItems.innerHTML="";
  let total=deliveryFee;
  cart.forEach((i,x)=>{
    total+=i.total;
    cartItems.innerHTML+=`<p>${i.desc} R$ ${i.total.toFixed(2)} <button onclick="cart.splice(${x},1);renderCart()">❌</button></p>`;
  });
  cartTotal.textContent="Total: R$ "+total.toFixed(2);
}

function getDistanceKm(a,b,c,d){
  const R=6371;
  const dLat=(c-a)*Math.PI/180;
  const dLon=(d-b)*Math.PI/180;
  const x=Math.sin(dLat/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

function useMyLocation(){
  navigator.geolocation.getCurrentPosition(pos=>{
    const d=data.delivery;
    const km=getDistanceKm(d.lat||0,d.lng||0,pos.coords.latitude,pos.coords.longitude);
    if(km>d.maxKm) return alert("Fora da área");
    deliveryFee=km<=d.freeKm?0:Math.ceil((km-d.freeKm)*d.priceKm);
    deliveryInfo.textContent=deliveryFee?`Entrega R$ ${deliveryFee}`:"Entrega grátis";
    renderCart();
  });
}

function sendWhats(){
  if(!cart.length) return alert("Carrinho vazio");
  let msg="Pedido:%0A";
  let total=deliveryFee;
  cart.forEach(i=>{total+=i.total;msg+=`${i.desc} R$ ${i.total}%0A`});
  msg+=`Entrega: R$ ${deliveryFee}%0ATotal: R$ ${total}`;
  window.location.href=`https://wa.me/${data.store.phone}?text=${msg}`;
}