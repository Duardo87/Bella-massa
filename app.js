// app.js (ajustado para ler TUDO do admin via localStorage e reagir a mudanças)
const R = 6371;
let data = {};
let carrinho = [], produtoAtual = null, selecao = {}, taxaEntrega = 0, distanciaKm = null;

document.addEventListener("DOMContentLoaded", async () => {
  await loadData();
  renderAll();
  bindEventos();
  // listen for cross-tab changes and custom events
  window.addEventListener("storage", (e) => {
    if (e.key === "appData" || e.key === "__appDataUpdatedAt") {
      loadData().then(() => {
        renderAll();
        atualizarCarrinho();
      });
    }
  });
  window.addEventListener("appDataUpdated", () => {
    loadData().then(() => {
      renderAll();
      atualizarCarrinho();
    });
  });
});

async function loadData() {
  const raw = localStorage.getItem("appData");
  if (raw) {
    try {
      data = JSON.parse(raw);
      normalizeData();
      return;
    } catch (e) {
      console.warn("appData inválido, tentando app.json");
    }
  }
  try {
    data = await (await fetch("app.json")).json();
  } catch (e) {
    data = {};
  }
  normalizeData();
  localStorage.setItem("appData", JSON.stringify(data));
}

function normalizeData(){
  data.config = data.config || {};
  data.categorias = Array.isArray(data.categorias) ? data.categorias.map(c => typeof c === "string" ? {nome:c, ativo:true} : {...c, ativo: c.ativo!==false}) : [];
  data.produtos = Array.isArray(data.produtos) ? data.produtos.map(p => ({...p, ativo: p.ativo===false ? false : true})) : [];
  data.bebidas = data.bebidas || [];
  data.ofertas = data.ofertas || [];
  data.promocoes = data.promocoes || [];
  data.bordas = data.bordas || [];
  data.adicionais = data.adicionais || [];
  // defaults
  data.config.nomePizzaria = data.config.nomePizzaria || "Pizzaria";
  data.config.whatsapp = data.config.whatsapp || "";
  data.config.lojaAberta = data.config.lojaAberta !== false;
  data.config.kmGratis = data.config.kmGratis != null ? data.config.kmGratis : 3;
  data.config.valorKm = data.config.valorKm != null ? data.config.valorKm : 2;
  data.config.limiteKm = data.config.limiteKm != null ? data.config.limiteKm : 10;
  data.config.pedidoMinimo = data.config.pedidoMinimo != null ? data.config.pedidoMinimo : 0;
  data.config.tempoEntrega = data.config.tempoEntrega || "";
  // meio a meio message fallback
  if (!data.config.meioAMeio) data.config.meioAMeio = { ativo: false, aviso: "" };
}

function renderAll(){
  renderHeader();
  renderCarousel();
  renderPromoDia();
  renderCategorias();
  renderProdutos();
}

function renderHeader(){
  const statusEl = document.getElementById("statusLoja");
  statusEl.innerText = data.config.lojaAberta ? "ABERTO AGORA" : "FECHADO";
  if(data.config.lojaAberta){
    statusEl.classList.add("open");
  } else statusEl.classList.remove("open");
  document.getElementById("horario").innerText = data.config.horario || "";
  document.getElementById("tempoEntrega").innerText = data.config.tempoEntrega ? `⏱ ${data.config.tempoEntrega}` : "";
  const logo = document.querySelector(".logo");
  if(logo) logo.innerText = (data.config.nomePizzaria || "Pizzaria") + " 🍕";
  // WhatsApp: keep button behavior (open cart)
  const btnWhats = document.getElementById("btnWhats");
  if(btnWhats){
    btnWhats.onclick = (e) => { e.preventDefault(); document.getElementById("cart").classList.add("active"); };
  }
  // aviso meio a meio
  const avisoMeio = document.getElementById("avisoMeio");
  if(avisoMeio) avisoMeio.innerText = (data.config.meioAMeio && data.config.meioAMeio.aviso) || "";
}

function renderCarousel(){
  const carousel = document.getElementById("carousel");
  carousel.innerHTML = "";
  (data.promocoes || []).forEach(p => {
    const d = document.createElement("div"); d.innerText = p; carousel.appendChild(d);
  });
}

function renderPromoDia(){
  const promoDia = document.getElementById("promoDia");
  const dias = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
  promoDia.innerText = `🔥 Promoção de ${dias[new Date().getDay()]} ativa hoje!`;
}

function renderCategorias(){
  const categoriasEl = document.getElementById("categorias");
  categoriasEl.innerHTML = "";
  (data.categorias || []).forEach(c => {
    if(c.ativo===false) return; // only active categories show
    const b = document.createElement("button");
    b.innerText = c.nome;
    b.onclick = () => renderProdutos(c.nome);
    categoriasEl.appendChild(b);
  });
}

function renderProdutos(cat){
  const produtosEl = document.getElementById("produtos");
  produtosEl.innerHTML = "";
  // Bebidas
  if(!cat || cat === "Bebidas"){
    (data.bebidas || []).forEach(b => {
      const d = document.createElement("div"); d.className = "produto";
      d.innerHTML = `<div class="info"><h3>${b.nome}</h3><p>R$ ${b.preco.toFixed(2)}</p></div><button>Adicionar bebida</button>`;
      d.querySelector("button").onclick = () => {
        carrinho.push({tipo:"bebida",nome:b.nome,preco:b.preco});
        atualizarCarrinho();
      };
      produtosEl.appendChild(d);
    });
    if(cat === "Bebidas") return;
  }
  // Ofertas
  if(!cat || cat === "Ofertas"){
    (data.ofertas || []).forEach(o => {
      const d = document.createElement("div"); d.className = "produto";
      d.innerHTML = `<div class="info"><h3>${o.nome}</h3><p>${o.descricao||""}</p><p><strong>R$ ${Number(o.preco||0).toFixed(2)}</strong></p></div><button>Adicionar</button>`;
      d.querySelector("button").onclick = () => {
        carrinho.push({tipo:"combo",nome:o.nome,descricao:o.descricao,preco:parseFloat(o.preco||0)});
        atualizarCarrinho();
      };
      produtosEl.appendChild(d);
    });
    if(cat === "Ofertas") return;
  }
  // Produtos gerais: only products whose category is active and product active
  (data.produtos || []).filter(p => p.ativo!==false && (!cat || p.categoria === cat)).forEach(p => {
    const d = document.createElement("div"); d.className = "produto";
    const imgSrc = imgForProduct(p.imagem);
    const mais = p.maisVendido ? "🔥" : "";
    const precoBase = p.precos && p.precos.P ? Number(p.precos.P).toFixed(2) : "0.00";
    d.innerHTML = `<img src="${imgSrc}" onerror="this.src='${placeholderDataUri()}'"><div class="info"><h3>${p.nome} ${mais}</h3><p>${p.descricao||""}</p><p>A partir de R$ ${precoBase}</p></div><button>Adicionar</button>`;
    d.querySelector("button").onclick = () => abrirModal(p);
    produtosEl.appendChild(d);
  });
}

function imgForProduct(im){
  if(!im) return placeholderDataUri();
  if(typeof im === "string" && im.startsWith("data:")) return im;
  // allow relative paths too
  return im;
}

function placeholderDataUri(){
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='100%' height='100%' fill='#eee'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#bbb' font-size='20'>Sem imagem</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function abrirModal(p){
  produtoAtual = p;
  selecao = {tamanho:null,sabores:[],extras:[],obs:""};
  const avisoLimite = document.getElementById("avisoLimite");
  avisoLimite.style.display = "none";
  document.getElementById("modalNome").innerText = p.nome;
  document.getElementById("modalDesc").innerText = p.descricao || "";
  renderTamanhos();
  renderSabores();
  renderExtras();
  atualizarModalTotal();
  document.getElementById("pizzaModal").style.display = "flex";
}

function renderTamanhos(){
  const tamanhos = document.getElementById("tamanhos");
  tamanhos.innerHTML = "";
  if(!produtoAtual || !produtoAtual.precos) return;
  Object.entries(produtoAtual.precos).forEach(([k,v])=>{
    const b = document.createElement("button");
    b.innerText = `${k} R$ ${Number(v).toFixed(2)}`;
    b.onclick = ()=>{ selecao.tamanho = k; atualizarModalTotal(); b.classList.add("active"); Array.from(tamanhos.children).forEach(x=>{ if(x!==b) x.classList.remove("active"); }); };
    tamanhos.appendChild(b);
  });
}

function renderSabores(){
  const sabores = document.getElementById("sabores");
  sabores.innerHTML = "";
  (data.produtos || []).filter(s=>s.ativo!==false).forEach(s=>{
    const b = document.createElement("button");
    b.innerText = s.nome;
    b.onclick = ()=>{
      if(selecao.sabores.includes(s)) selecao.sabores = selecao.sabores.filter(x=>x!==s);
      else if(selecao.sabores.length < (data.config.meioAMeio && data.config.meioAMeio.limiteSabores ? data.config.meioAMeio.limiteSabores : 2)) selecao.sabores.push(s);
      atualizarModalTotal();
      atualizarFeedbackSabores();
    };
    sabores.appendChild(b);
  });
}

function atualizarFeedbackSabores(){
  const avisoLimite = document.getElementById("avisoLimite");
  const buttons = Array.from(document.getElementById("sabores").children);
  const limite = data.config.meioAMeio && data.config.meioAMeio.limiteSabores ? data.config.meioAMeio.limiteSabores : 2;
  if(selecao.sabores.length >= limite){
    avisoLimite.style.display = "block";
    avisoLimite.innerText = `Limite de ${limite} sabores atingido`;
    buttons.forEach(b=>{
      if(!selecao.sabores.some(s=>s.nome===b.innerText)) b.classList.add("disabled");
    });
  } else {
    avisoLimite.style.display = "none";
    buttons.forEach(b=>b.classList.remove("disabled"));
  }
}

function renderExtras(){
  const extrasModal = document.getElementById("extrasModal");
  extrasModal.innerHTML = "";
  const list = [...(data.bordas||[]), ...(data.adicionais||[])];
  list.forEach(e=>{
    const b = document.createElement("button");
    b.innerText = `${e.nome} +R$ ${Number(e.preco||0).toFixed(2)}`;
    b.onclick = ()=>{
      selecao.extras.includes(e) ? selecao.extras = selecao.extras.filter(x=>x!==e) : selecao.extras.push(e);
      atualizarModalTotal();
      b.classList.toggle("active");
    };
    extrasModal.appendChild(b);
  });
}

function atualizarModalTotal(){
  const modalTotal = document.getElementById("modalTotal");
  if(!selecao.tamanho || !selecao.sabores.length){ modalTotal.innerText = "0,00"; return; }
  let total = Math.max(...selecao.sabores.map(s=>s.precos[selecao.tamanho] || 0));
  selecao.extras.forEach(e => total += e.preco || 0);
  modalTotal.innerText = total.toFixed(2);
}

document.getElementById("addPizza").onclick = () => {
  const modalTotal = parseFloat(document.getElementById("modalTotal").innerText || "0");
  if(modalTotal <= 0) return alert("Selecione tamanho e sabores");
  carrinho.push({tipo:"pizza",nome:produtoAtual.nome,sabores:selecao.sabores.map(s=>s.nome),extras:selecao.extras,preco:modalTotal});
  document.getElementById("pizzaModal").style.display = "none";
  atualizarCarrinho();
};

function atualizarCarrinho(){
  const cartItems = document.getElementById("cartItems");
  cartItems.innerHTML = "";
  let subtotal = 0;
  carrinho.forEach(i=>{
    subtotal += i.preco;
    const d = document.createElement("div");
    d.innerHTML = `<strong>${i.nome}</strong><br>${i.sabores ? i.sabores.join(" / ") : ""}<br>R$ ${Number(i.preco).toFixed(2)}<hr>`;
    cartItems.appendChild(d);
  });
  document.getElementById("subtotal").innerText = `R$ ${subtotal.toFixed(2)}`;
  calcularTaxa(subtotal);
  document.getElementById("cartQtd").innerText = carrinho.length;
}
function removerItemCarrinho(index) {
  carrinho.splice(index, 1);
  atualizarCarrinho();
}
function calcularTaxa(sub){
  if(distanciaKm !== null){ aplicarTaxa(sub); return; }
  if(!navigator.geolocation){ taxaEntrega = 0; atualizarTotais(sub); return; }
  navigator.geolocation.getCurrentPosition(pos=>{
    distanciaKm = haversine(data.config.lojaLat, data.config.lojaLng, pos.coords.latitude, pos.coords.longitude);
    aplicarTaxa(sub);
  }, ()=>{ taxaEntrega = 0; atualizarTotais(sub); });
}

function aplicarTaxa(sub){
  if(distanciaKm > data.config.limiteKm){ alert("🚫 Fora da área de entrega"); taxaEntrega = 0; atualizarTotais(sub); return; }
  taxaEntrega = distanciaKm <= data.config.kmGratis ? 0 : (distanciaKm - data.config.kmGratis) * data.config.valorKm;
  atualizarTotais(sub);
}

function atualizarTotais(sub){
  document.getElementById("taxa").innerText = `R$ ${taxaEntrega.toFixed(2)}`;
  document.getElementById("cartTotal").innerText = `R$ ${(sub + taxaEntrega).toFixed(2)}`;
}

function haversine(lat1,lon1,lat2,lon2){
  const dLat = (lat2-lat1)*Math.PI/180;
  const dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function bindEventos(){
  document.getElementById("openCart").onclick = ()=> document.getElementById("cart").classList.toggle("active");
  document.getElementById("closeModal").onclick = ()=> document.getElementById("pizzaModal").style.display = "none";
  document.getElementById("btnWhats").onclick = e => { e.preventDefault(); document.getElementById("cart").classList.add("active"); };
  document.getElementById("finalizar").onclick = finalizarPedido;
}

function finalizarPedido(){
  if(!data.config.lojaAberta) return alert("Loja fechada");
  if(!carrinho.length) return alert("Carrinho vazio");
  const totalText = document.getElementById("cartTotal").innerText.replace("R$","").trim();
  const total = parseFloat(totalText.replace(",","."));
  if(total < (data.config.pedidoMinimo||0)) return alert(`Pedido mínimo R$ ${Number(data.config.pedidoMinimo||0).toFixed(2)}`);
  if(distanciaKm > (data.config.limiteKm||9999)) return alert("Fora da área de entrega");
  const endereco = document.getElementById("endereco").value.trim();
  if(!endereco) return alert("Informe o endereço");

  let msg = `🍕 *Pedido ${data.config.nomePizzaria || "Pizzaria"}* 🍕\n\n`;
  carrinho.forEach(i=>{
    msg += `• ${i.nome}\n`;
    if(i.sabores) msg += `  Sabores: ${i.sabores.join(" / ")}\n`;
    msg += `  Valor: R$ ${Number(i.preco).toFixed(2)}\n\n`;
  });
  const obs = document.getElementById("obsGeral").value.trim();
  if(obs) msg += `📝 Obs: ${obs}\n\n`;
  msg += `🚚 Taxa: R$ ${taxaEntrega.toFixed(2)}\n`;
  msg += `📍 Endereço: ${endereco}\n`;
  msg += `💰 Total: R$ ${total.toFixed(2)}`;

  const phone = (data.config.whatsapp || "").replace(/\D/g,'');
  if(!phone) return alert("WhatsApp não configurado");
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`);
}