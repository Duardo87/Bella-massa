let data=null, cart=[], currentProduct=null;
const $=id=>document.getElementById(id);

async function loadData(){
  const res=await fetch("./app.json?v="+Date.now());
  return res.json();
}

document.addEventListener("DOMContentLoaded",async()=>{
  data=await loadData();
  $("storeName").textContent=data.store.name;
  $("storePhone").href=`https://wa.me/${data.store.phone}`;
  $("whatsFloat").href=`https://wa.me/${data.store.phone}`;
  $("btnCart").onclick=()=>toggleCart();
  renderCategories();
});

function renderCategories(){
  const cats=data.categories.filter(c=>c.active).sort((a,b)=>a.order-b.order);
  $("categories").innerHTML="";
  cats.forEach((c,i)=>{
    $("categories").innerHTML+=
      `<button class="${i===0?'active':''}" onclick="renderProducts(${c.id},this)">${c.name}</button>`;
  });
  if(cats.length) renderProducts(cats[0].id);
}

function renderProducts(catId,btn){
  document.querySelectorAll(".categories button").forEach(b=>b.classList.remove("active"));
  if(btn) btn.classList.add("active");
  $("products").innerHTML="";
  data.products.filter(p=>p.active && p.categoryId===catId).forEach(p=>{
    $("products").innerHTML+=`
      <div class="product-card">
        ${p.image?`<img src="${p.image}">`:""}
        <h3>${p.name}</h3>
        <p>${p.desc||""}</p>
        <button onclick="openModal(${p.id})">Escolher</button>
      </div>`;
  });
}

/* ===== MODAL ===== */
function openModal(id){
  currentProduct=data.products.find(p=>p.id===id);
  $("modalTitle").textContent=currentProduct.name;
  let html="";

  html+=`<h4>📏 Tamanho</h4>`;
  Object.entries(currentProduct.prices||{}).forEach(([k,v])=>{
    html+=`<label><input type="radio" name="size" value="${k}" data-price="${v}"> ${k} - R$ ${v}</label><br>`;
  });

  if(currentProduct.maxFlavors && currentProduct.maxFlavors>1){
    html+=`<h4>🍕 Escolha até ${currentProduct.maxFlavors} sabores</h4>`;
    data.products.filter(p=>p.categoryId===currentProduct.categoryId && p.prices)
      .forEach(p=>{
        html+=`<label>
          <input type="checkbox" name="flavor" value="${p.name}" data-prices='${JSON.stringify(p.prices)}'>
          ${p.name}</label><br>`;
      });
  }

  if(data.borders){
    html+=`<h4>🥖 Borda</h4>`;
    data.borders.filter(b=>b.active).forEach(b=>{
      html+=`<label><input type="radio" name="border" value="${b.name}" data-price="${b.price}">
        ${b.name} (+R$ ${b.price})</label><br>`;
    });
  }

  if(data.extras){
    html+=`<h4>➕ Adicionais</h4>`;
    data.extras.filter(e=>e.active).forEach(e=>{
      html+=`<label><input type="checkbox" name="extra" value="${e.name}" data-price="${e.price}">
        ${e.name} (+R$ ${e.price})</label><br>`;
    });
  }

  $("modalSteps").innerHTML=html;
  $("modal").classList.remove("hidden");
}

$("confirmProduct").onclick=function(){
  const size=document.querySelector("input[name=size]:checked");
  if(!size){alert("Escolha o tamanho");return;}

  let total=Number(size.dataset.price);
  let desc=currentProduct.name+" ("+size.value+")";

  if(currentProduct.maxFlavors && currentProduct.maxFlavors>1){
    const flavors=[...document.querySelectorAll("input[name=flavor]:checked")];
    if(!flavors.length){alert("Escolha pelo menos 1 sabor");return;}
    if(flavors.length>currentProduct.maxFlavors){alert("Máx "+currentProduct.maxFlavors+" sabores");return;}

    let maior=0;
    flavors.forEach(f=>{
      const prices=JSON.parse(f.dataset.prices);
      maior=Math.max(maior, prices[size.value]||0);
    });
    total=maior;
    desc+=" – "+flavors.map(f=>f.value).join(" + ");
  }

  const border=document.querySelector("input[name=border]:checked");
  if(border){total+=Number(border.dataset.price);desc+=" + Borda "+border.value;}

  document.querySelectorAll("input[name=extra]:checked").forEach(e=>{
    total+=Number(e.dataset.price);desc+=" + "+e.value;
  });

  cart.push({desc,total});
  closeModal();
  renderCart();
};

function closeModal(){ $("modal").classList.add("hidden"); }

function renderCart(){
  $("cartBox").innerHTML="<h3>Pedido</h3>";
  let total=0;
  cart.forEach((i,idx)=>{
    total+=i.total;
    $("cartBox").innerHTML+=
      `<p>${i.desc} - R$ ${i.total.toFixed(2)}
       <button onclick="cart.splice(${idx},1);renderCart()">❌</button></p>`;
  });
  $("cartBox").innerHTML+=
    `<strong>Total: R$ ${total.toFixed(2)}</strong>
     <button onclick="sendWhats()">Enviar WhatsApp</button>`;
  $("cartBox").classList.remove("hidden");
}

function toggleCart(){ $("cartBox").classList.toggle("hidden"); }

function sendWhats(){
  let msg="🧾 Pedido:%0A";
  cart.forEach(i=>msg+=`- ${i.desc} R$ ${i.total.toFixed(2)}%0A`);
  window.open(`https://wa.me/${data.store.phone}?text=${msg}`);
}