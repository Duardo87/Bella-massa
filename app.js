let data=null, cart=[], currentProduct=null;
let step=1, sel={size:null,flavors:[],border:null,extras:[]};
const $=id=>document.getElementById(id);

async function loadData(){
  const r=await fetch("./app.json?v="+Date.now());
  return r.json();
}

document.addEventListener("DOMContentLoaded",async()=>{
  data=await loadData();
  loadPromo(); // ✅ agora data já existe
  $("storePhone").href=`https://wa.me/${data.store.phone}`;
  $("whatsFloat").href=`https://wa.me/${data.store.phone}`;
  $("btnCart").onclick=()=>toggleCart();
  renderCategories();
});

function renderCategories(){
  const c=data.categories.filter(x=>x.active).sort((a,b)=>a.order-b.order);
  $("categories").innerHTML="";
  c.forEach((cat,i)=>{
    $("categories").innerHTML+=
      `<button class="${i===0?'active':''}" onclick="renderProducts(${cat.id},this)">${cat.name}</button>`;
  });
  if(c.length) renderProducts(c[0].id);
}

function renderProducts(id,btn){
  document.querySelectorAll(".categories button").forEach(b=>b.classList.remove("active"));
  if(btn) btn.classList.add("active");
  $("products").innerHTML="";
  data.products.filter(p=>p.active&&p.categoryId===id).forEach(p=>{
    $("products").innerHTML+=`
      <div class="product-card">
        <h3>${p.name}</h3>
        <p>${p.desc||""}</p>
        <button onclick="startOrder(${p.id})">Escolher</button>
      </div>`;
  });
}

/* ===== MODAL ETAPAS ===== */
function startOrder(id){
  currentProduct=data.products.find(p=>p.id===id);
  step=1; sel={size:null,flavors:[],border:null,extras:[]};
  $("modal").classList.remove("hidden");
  renderStep();
}

$("prevStep").onclick=()=>{ if(step>1){step--;renderStep();}};
$("nextStep").onclick=()=>nextStep();

function renderStep(){
  if(step===1) sizeStep();
  if(step===2) flavorStep();
  if(step===3) borderStep();
  if(step===4) extraStep();
}

function sizeStep(){
  $("stepTitle").textContent="📏 Tamanho";
  let h="";
  Object.entries(currentProduct.prices).forEach(([k,v])=>{
    h+=`<label><input type="radio" name="size" value="${k}" data-price="${v}"> ${k} - R$ ${v}</label><br>`;
  });
  $("stepContent").innerHTML=h;
}

function flavorStep(){
  if(!currentProduct.maxFlavors||currentProduct.maxFlavors===1){
    step++; renderStep(); return;
  }
  $("stepTitle").textContent=`🍕 Escolha até ${currentProduct.maxFlavors} sabores`;
  let h="";
  data.products.filter(p=>p.categoryId===currentProduct.categoryId&&p.prices)
    .forEach(p=>{
      h+=`<label><input type="checkbox" value="${p.name}" data-prices='${JSON.stringify(p.prices)}'> ${p.name}</label><br>`;
    });
  $("stepContent").innerHTML=h;
}

function borderStep(){
  $("stepTitle").textContent="🥖 Borda (opcional)";
  let h="";
  (data.borders||[]).filter(b=>b.active).forEach(b=>{
    h+=`<label><input type="radio" name="border" value="${b.name}" data-price="${b.price}"> ${b.name} (+R$ ${b.price})</label><br>`;
  });
  $("stepContent").innerHTML=h;
}

function extraStep(){
  $("stepTitle").textContent="➕ Adicionais";
  let h="";
  (data.extras||[]).filter(e=>e.active).forEach(e=>{
    h+=`<label><input type="checkbox" value="${e.name}" data-price="${e.price}"> ${e.name} (+R$ ${e.price})</label><br>`;
  });
  $("stepContent").innerHTML=h;
  $("nextStep").textContent="Adicionar ao carrinho";
}

function nextStep(){
  if(step===1){
    const s=document.querySelector("input[name=size]:checked");
    if(!s){alert("Escolha o tamanho");return;}
    sel.size=s;
  }
  if(step===2 && currentProduct.maxFlavors>1){
    const f=[...$("stepContent").querySelectorAll("input:checked")];
    if(!f.length){alert("Escolha ao menos 1 sabor");return;}
    if(f.length>currentProduct.maxFlavors){alert("Máx sabores atingido");return;}
    sel.flavors=f;
  }
  if(step===3) sel.border=document.querySelector("input[name=border]:checked");
  if(step===4){ sel.extras=[...$("stepContent").querySelectorAll("input:checked")]; finalize(); return;}
  step++; renderStep();
}

function finalize(){
  let total=Number(sel.size.dataset.price);
  let desc=`${currentProduct.name} (${sel.size.value})`;

  if(sel.flavors.length){
    let max=0;
    sel.flavors.forEach(f=>{
      const p=JSON.parse(f.dataset.prices)[sel.size.value]||0;
      max=Math.max(max,p);
    });
    total=max;
    desc+=" – "+sel.flavors.map(f=>f.value).join(" + ");
  }

  if(sel.border){ total+=Number(sel.border.dataset.price); desc+=" + Borda "+sel.border.value; }
  sel.extras.forEach(e=>{ total+=Number(e.dataset.price); desc+=" + "+e.value; });

  cart.push({desc,total});
  $("modal").classList.add("hidden");
  $("nextStep").textContent="Continuar";
  renderCart();
}

/* ===== CARRINHO ===== */
function renderCart(){
  let h="", t=0;
  cart.forEach((i,idx)=>{
    t+=i.total;
    h+=`<p>${i.desc} - R$ ${i.total.toFixed(2)}
      <button onclick="cart.splice(${idx},1);renderCart()">❌</button></p>`;
  });
  $("cartItems").innerHTML=h;
  $("cartTotal").textContent="Total: R$ "+t.toFixed(2);
  $("cartBox").classList.remove("hidden");
}

function toggleCart(){ $("cartBox").classList.toggle("hidden"); }

function sendWhats(){
  if(!cart.length){alert("Carrinho vazio");return;}
  const addr=$("address").value.trim();
  const pay=$("payment").value;
  if(!addr||!pay){alert("Preencha endereço e pagamento");return;}

  let msg="🧾 *Pedido Bella Massa*%0A";
  let t=0;
  cart.forEach(i=>{ t+=i.total; msg+=`• ${i.desc} — R$ ${i.total.toFixed(2)}%0A`; });
  msg+=`%0A*Total:* R$ ${t.toFixed(2)}%0A🏠 ${addr}%0A💳 ${pay}`;
  if($("obs").value) msg+=`%0A💬 ${$("obs").value}`;

  window.open(`https://wa.me/${data.store.phone}?text=${msg}`);
}function loadPromo(){
  if(!data.promo || !data.promo.active) return;

  const today = new Date().getDay();
  const promo = data.promo.days?.[today];
  if(!promo) return;

  $("promoTitle").textContent = promo.title;
  $("promoDesc").textContent = promo.desc;
  $("promoPrice").textContent = "R$ " + promo.price.toFixed(2);
  $("promoBanner").classList.remove("hidden");

  $("promoBtn").onclick = () => {
    cart.push({
      desc: promo.title + " – " + promo.desc,
      total: promo.price
    });
    renderCart();
  };
}