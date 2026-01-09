let data = null;
let cart = [];
const $ = id => document.getElementById(id);

async function loadData(){
  const res = await fetch("./app.json?v=" + Date.now());
  return await res.json();
}

document.addEventListener("DOMContentLoaded", async () => {
  data = await loadData();

  $("storeName").textContent = data.store.name;
  $("storePhone").href = `https://wa.me/${data.store.phone}`;
  $("whatsFloat").href = `https://wa.me/${data.store.phone}`;

  $("btnCart").onclick = () => {
    if(cart.length === 0){
      alert("Seu carrinho está vazio");
      return;
    }
    toggleCart();
  };

  renderCategories();
  renderReviews();
});

function renderCategories(){
  const cats = data.categories.filter(c=>c.active).sort((a,b)=>a.order-b.order);
  $("categories").innerHTML = "";

  cats.forEach((c,i)=>{
    $("categories").innerHTML += `
      <button class="${i===0?"active":""}" onclick="renderProducts(${c.id},this)">
        ${c.name}
      </button>`;
  });

  if(cats.length) renderProducts(cats[0].id);
}

function renderProducts(catId, btn){
  document.querySelectorAll(".categories button")
    .forEach(b => b.classList.remove("active"));
  if(btn) btn.classList.add("active");

  $("products").innerHTML = "";

  data.products
    .filter(p => p.active && p.categoryId === catId)
    .sort((a,b) => a.order - b.order)
    .forEach(p => {

      // ✅ SUPORTE A price E prices
      let price = null;

      if (typeof p.price === "number") {
        price = p.price;
      } else if (p.prices) {
        price = p.prices.G ?? p.prices.M ?? p.prices.P ?? null;
      }

      const disabled = price === null;

      $("products").innerHTML += `
        <div class="product-card">
          ${p.image ? `<img src="${p.image}">` : ""}
          <h3>${p.name} ${p.featured ? "🔥 Mais Pedido" : ""}</h3>
          <p>${p.desc || ""}</p>
          <button 
            ${disabled ? "disabled" : ""}
            onclick="addCart('${p.name}', ${price})">
            ${disabled ? "Indisponível" : "Adicionar"}
          </button>
        </div>
      `;
    });
}

function addCart(name,price){
  cart.push({name,price});
  renderCart();
}

function renderCart(){
  let total = 0;
  $("cartBox").innerHTML = "<h3>Pedido</h3>";

  cart.forEach((i,idx)=>{
    total += i.price;
    $("cartBox").innerHTML += `
      <p>${i.name} - R$ ${i.price.toFixed(2)}
      <button onclick="removeItem(${idx})">❌</button></p>`;
  });

  $("cartBox").innerHTML += `
    <strong>Total: R$ ${total.toFixed(2)}</strong>
    <button onclick="sendWhats()">Enviar WhatsApp</button>`;
}

function removeItem(i){
  cart.splice(i,1);
  if(cart.length===0) $("cartBox").classList.add("hidden");
  else renderCart();
}

function toggleCart(){
  $("cartBox").classList.toggle("hidden");
}

function sendWhats(){
  let msg = "🧾 Pedido:%0A";
  cart.forEach(i=>msg += `- ${i.name} R$ ${i.price.toFixed(2)}%0A`);
  window.open(`https://wa.me/${data.store.phone}?text=${msg}`);
}

function renderReviews(){
  if(!data.reviews || !data.reviews.items.length) return;

  $("reviews").classList.remove("hidden");

  let idx = 0;
  const items = data.reviews.items.filter(r=>r.active);
  $("reviews").innerHTML = `<h2>${data.reviews.rating} ⭐ (${data.reviews.countTotal})</h2><div id="rev"></div>`;

  setInterval(()=>{
    const r = items[idx];
    $("rev").innerHTML = `<p><strong>${r.name}</strong>: ${r.text}</p>`;
    idx = (idx + 1) % items.length;
  },4000);
}