let data=null, cart=[], currentProduct=null;
let step=1, sel={size:null,flavors:[],border:null,extras:[]};
const $=id=>document.getElementById(id);

async function loadData(){
  const res=await fetch("./app.json?v="+Date.now());
  return await res.json();
}

document.addEventListener("DOMContentLoaded",async()=>{
  data=await loadData();

  $("storeName").textContent=data.store.name;
  $("storePhone").href=`https://wa.me/55${data.store.phone}`;
  $("whatsFloat").href=`https://wa.me/55${data.store.phone}`;
  $("btnCart").onclick=toggleCart;

  loadPromo();
  renderCategories();
  renderReviews();
});

function loadPromo(){
  if(!data.promoWeek)return;
  const p=data.promoWeek[new Date().getDay()];
  if(!p||!p.active)return;

  $("promoTitle").textContent=p.title;
  $("promoDesc").textContent=p.desc||"";
  $("promoPrice").textContent="R$ "+Number(p.price).toFixed(2);

  if(p.image){
    $("promoImg").src=p.image;
    $("promoImg").style.display="block";
  }

  $("promoBanner").classList.remove("hidden");
  $("promoBtn").onclick=()=>{
    cart.push({desc:p.title,total:+p.price});
    renderCart();
  };
}

function renderCategories(){
  const cats=data.categories.filter(c=>c.active);
  $("categories").innerHTML="";
  cats.forEach((c,i)=>{
    $("categories").innerHTML+=`
      <button class="${i===0?'active':''}"
      onclick="renderProducts(${c.id},this)">${c.name}</button>`;
  });
  if(cats.length)renderProducts(cats[0].id);
}

function renderProducts(catId,btn){
  document.querySelectorAll(".categories button")
    .forEach(b=>b.classList.remove("active"));
  if(btn)btn.classList.add("active");

  $("products").innerHTML="";
  data.products
    .filter(p=>p.categoryId===catId && p.active!==false)
    .forEach(p=>{
      $("products").innerHTML+=`
      <div class="product-card">
        ${p.image?`<img src="${p.image}">`:""}
        <h3>${p.name}</h3>
        <p>${p.desc||""}</p>
        <button onclick="startOrder(${p.id})">Escolher</button>
      </div>`;
    });
}

function startOrder(id){
  currentProduct=data.products.find(p=>p.id===id);
  step=1; sel={size:null,flavors:[],border:null,extras:[]};
  $("modal").classList.remove("hidden");
  $("nextStep").textContent="Continuar";
  renderStep();
}

$("prevStep").onclick=()=>{if(step>1){step--;renderStep();}};
$("nextStep").onclick=nextStep;

function renderStep(){
  $("flavorWarn").style.display="none";
  if(step===1)stepSize();
  if(step===2)stepFlavors();
  if(step===3)stepBorder();
  if(step===4)stepExtras();
}

function stepSize(){
  $("stepTitle").textContent="📏 Tamanho";
  $("stepContent").innerHTML=Object.entries(currentProduct.prices)
    .map(([k,v])=>`
    <label><input type="radio" name="size" value="${k}" data-price="${v}">
    ${k} - R$ ${v}</label>`).join("");
}

function stepFlavors(){
  if(currentProduct.maxFlavors<=1){step++;renderStep();return;}
  $("stepTitle").textContent="🍕 Sabores";
  $("flavorWarn").style.display="block";
  $("stepContent").innerHTML=data.products
    .filter(p=>p.categoryId===currentProduct.categoryId)
    .map(p=>`
      <label><input type="checkbox" value="${p.name}"
      data-prices='${JSON.stringify(p.prices)}'>${p.name}</label>`).join("");
}

function stepBorder(){
  $("stepTitle").textContent="🥖 Borda";
  $("stepContent").innerHTML=(data.borders||[])
    .map(b=>`
    <label><input type="radio" name="border"
    value="${b.name}" data-price="${b.price}">
    ${b.name} (+R$ ${b.price})</label>`).join("");
}

function stepExtras(){
  $("stepTitle").textContent="➕ Adicionais";
  $("stepContent").innerHTML=(data.extras||[])
    .map(e=>`
    <label><input type="checkbox" value="${e.name}"
    data-price="${e.price}">${e.name} (+R$ ${e.price})</label>`).join("");
  $("nextStep").textContent="Adicionar";
}

function nextStep(){
  if(step===1){
    const s=document.querySelector("input[name=size]:checked");
    if(!s)return alert("Escolha o tamanho");
    sel.size=s;
  }
  if(step===2){
    sel.flavors=[...$("stepContent").querySelectorAll("input:checked")];
  }
  if(step===3){
    sel.border=document.querySelector("input[name=border]:checked");
  }
  if(step===4){
    sel.extras=[...$("stepContent").querySelectorAll("input:checked")];
    finalizeItem(); return;
  }
  step++; renderStep();
}

function finalizeItem(){
  let total=+sel.size.dataset.price;
  let desc=`${currentProduct.name} (${sel.size.value})`;

  if(sel.flavors.length){
    let max=0;
    sel.flavors.forEach(f=>{
      const p=JSON.parse(f.dataset.prices)[sel.size.value]||0;
      if(p>max)max=p;
    });
    total=max;
    desc+=" | Sabores: "+sel.flavors.map(f=>f.value).join(", ");
  }

  if(sel.border){total+=+sel.border.dataset.price; desc+=` | Borda: ${sel.border.value}`;}
  sel.extras.forEach(e=>{total+=+e.dataset.price; desc+=` | ${e.value}`;});

  cart.push({desc,total});
  $("modal").classList.add("hidden");
  renderCart();
}

function toggleCart(){ $("cartBox").classList.toggle("hidden"); }

function renderCart(){
  let total=0;
  $("cartItems").innerHTML=cart.map(i=>{
    total+=i.total;
    return `<p>${i.desc} — R$ ${i.total.toFixed(2)}</p>`;
  }).join("");

  total+=data.store.deliveryFee||0;
  $("cartTotal").textContent=`Total: R$ ${total.toFixed(2)}`;
}

function sendWhats(){
  if(!address.value)return alert("Informe o endereço");
  if(!payment.value)return alert("Escolha pagamento");

  let msg=`🍕 *Pedido Bella Massa*%0A`;
  cart.forEach(i=>msg+=`• ${i.desc} - R$ ${i.total.toFixed(2)}%0A`);
  msg+=`🚚 Taxa: R$ ${(data.store.deliveryFee||0).toFixed(2)}%0A`;
  msg+=`📍 ${address.value}%0A💳 ${payment.value}`;
  if(obs.value)msg+=`%0A📝 ${obs.value}`;

  window.open(`https://wa.me/55${data.store.phone}?text=${msg}`,"_blank");
}

function renderReviews(){
  $("reviews").innerHTML=`
    <div class="review"><strong>Ana</strong> ⭐⭐⭐⭐⭐</div>
    <div class="review"><strong>Marcos</strong> ⭐⭐⭐⭐⭐</div>
  `;
}