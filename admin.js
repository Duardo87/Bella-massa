// admin.js
// Painel de administração - controla 100% do site via localStorage (chave: appData)
// Proteção simples por senha (persistente). Sessão persistente.

(() => {
  const LS_KEY = "appData";
  const LS_PASS = "adminPassword";
  const LS_SESSION = "adminLogged";
  let data = null;
  let editingProductIndex = null;

  // elements
  const loginSection = document.getElementById("loginSection");
  const adminApp = document.getElementById("adminApp");
  const adminTitle = document.getElementById("adminTitle");
  const btnLogin = document.getElementById("btnLogin");
  const adminPasswordInput = document.getElementById("adminPasswordInput");
  const btnLogout = document.getElementById("btnLogout");
  const btnExport = document.getElementById("btnExport");
  const btnExportFile = document.getElementById("btnExportFile");
  const btnImportFile = document.getElementById("btnImportFile");
  const fileImport = document.getElementById("fileImport");
  const fileImport2 = document.getElementById("fileImport2");
  const btnSaveAll = document.getElementById("btnSaveAll");
  const novaSenha = document.getElementById("novaSenha");
  const btnChangePass = document.getElementById("btnChangePass");
  const btnImportQuick = document.getElementById("btnImportQuick");

  // general config
  const nomePizzaria = document.getElementById("nomePizzaria");
  const whatsapp = document.getElementById("whatsapp");
  const lojaAberta = document.getElementById("lojaAberta");
  const horario = document.getElementById("horario");
  const pedidoMinimo = document.getElementById("pedidoMinimo");
  const kmGratis = document.getElementById("kmGratis");
  const valorKm = document.getElementById("valorKm");
  const limiteKm = document.getElementById("limiteKm");
  const mensagensAviso = document.getElementById("mensagensAviso");
  const tempoEntrega = document.getElementById("tempoEntrega");

  // categorias
  const novaCategoria = document.getElementById("novaCategoria");
  const btnAddCategoria = document.getElementById("btnAddCategoria");
  const categoriasList = document.getElementById("categoriasList");
  const prodCategoria = document.getElementById("prodCategoria");

  // produtos
  const prodNome = document.getElementById("prodNome");
  const prodPrecoP = document.getElementById("prodPrecoP");
  const prodPrecoM = document.getElementById("prodPrecoM");
  const prodPrecoG = document.getElementById("prodPrecoG");
  const prodDesc = document.getElementById("prodDesc");
  const prodMaisVendido = document.getElementById("prodMaisVendido");
  const prodFile = document.getElementById("prodFile");
  const prodPreview = document.getElementById("prodPreview");
  const btnAddProd = document.getElementById("btnAddProd");
  const produtosList = document.getElementById("produtosList");

  // extras
  const extraNome = document.getElementById("extraNome");
  const extraPreco = document.getElementById("extraPreco");
  const btnAddExtra = document.getElementById("btnAddExtra");
  const extrasList = document.getElementById("extrasList");

  // utility
  function fetchDefaultJson() {
    return fetch("app.json").then(r => r.json()).catch(() => ({}));
  }

  async function loadData() {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      try {
        data = JSON.parse(raw);
        return;
      } catch(e){}
    }
    data = await fetchDefaultJson();
    // normalize structure
    data.config = data.config || {};
    data.categorias = Array.isArray(data.categorias) ? data.categorias.map(c => typeof c === "string" ? {nome:c, ativo:true} : {...c, ativo: c.ativo!==false}) : [];
    data.produtos = data.produtos || [];
    data.bordas = data.bordas || [];
    data.adicionais = data.adicionais || [];
    data.bebidas = data.bebidas || [];
    data.ofertas = data.ofertas || [];
    data.promocoes = data.promocoes || [];
    saveLocal(false);
  }

  function saveLocal(announce = true) {
    localStorage.setItem(LS_KEY, JSON.stringify(data, null, 2));
    if (announce) {
      // notify other tabs
      try {
        localStorage.setItem("__appDataUpdatedAt", Date.now().toString());
        window.dispatchEvent(new Event("appDataUpdated"));
      } catch(e){}
    }
  }

  // render functions
  function renderAdminTitle(){
    adminTitle.innerText = `🍕 Admin — ${data.config.nomePizzaria || "Pizzaria"}`;
  }

  function renderGeneral(){
    nomePizzaria.value = data.config.nomePizzaria || "";
    whatsapp.value = data.config.whatsapp || "";
    lojaAberta.value = data.config.lojaAberta===false ? "false" : "true";
    horario.value = data.config.horario || "";
    pedidoMinimo.value = data.config.pedidoMinimo != null ? data.config.pedidoMinimo : "";
    kmGratis.value = data.config.kmGratis != null ? data.config.kmGratis : "";
    valorKm.value = data.config.valorKm != null ? data.config.valorKm : "";
    limiteKm.value = data.config.limiteKm != null ? data.config.limiteKm : "";
    mensagensAviso.value = typeof data.config.meioAMeio === "object" ? (data.config.meioAMeio.aviso||"") : (data.promocoes && data.promocoes[0] || "");
    tempoEntrega.value = data.config.tempoEntrega || "";
  }

  function renderCategorias(){
    categoriasList.innerHTML = "";
    prodCategoria.innerHTML = "";
    data.categorias.forEach((c, idx) => {
      const row = document.createElement("div"); row.className = "list-item";
      const meta = document.createElement("div"); meta.className = "meta";
      const title = document.createElement("div"); title.innerHTML = `<strong>${c.nome}</strong>`;
      const sub = document.createElement("div"); sub.className = "muted"; sub.innerText = `Ativo: ${c.ativo!==false ? "Sim" : "Não"}`;
      meta.appendChild(title); meta.appendChild(sub);

      const actions = document.createElement("div"); actions.className = "actions";
      const btnUp = document.createElement("button"); btnUp.textContent = "↑"; btnUp.className = "small";
      const btnDown = document.createElement("button"); btnDown.textContent = "↓"; btnDown.className = "small";
      const btnEdit = document.createElement("button"); btnEdit.textContent = "Editar"; btnEdit.className = "small";
      const btnToggle = document.createElement("button"); btnToggle.textContent = c.ativo!==false ? "Desativar" : "Ativar"; btnToggle.className = "small";
      const btnDel = document.createElement("button"); btnDel.textContent = "Remover"; btnDel.className = "small";

      btnUp.onclick = () => { if(idx>0){ const tmp = data.categorias[idx-1]; data.categorias[idx-1]=data.categorias[idx]; data.categorias[idx]=tmp; saveLocal(); renderCategorias(); renderProdutosList(); } };
      btnDown.onclick = () => { if(idx < data.categorias.length-1){ const tmp = data.categorias[idx+1]; data.categorias[idx+1]=data.categorias[idx]; data.categorias[idx]=tmp; saveLocal(); renderCategorias(); renderProdutosList(); } };
      btnEdit.onclick = () => {
        const novo = prompt("Editar nome da categoria", c.nome);
        if(novo!==null && novo.trim()!==""){ data.categorias[idx].nome = novo.trim(); saveLocal(); renderCategorias(); renderProdutosList(); }
      };
      btnToggle.onclick = () => { data.categorias[idx].ativo = !data.categorias[idx].ativo; saveLocal(); renderCategorias(); renderProdutosList(); };
      btnDel.onclick = () => {
        if(confirm("Remover categoria? Isso NÃO removerá produtos (eles ficarão sem categoria).")) {
          data.categorias.splice(idx,1); saveLocal(); renderCategorias(); renderProdutosList();
        }
      };

      actions.appendChild(btnUp); actions.appendChild(btnDown); actions.appendChild(btnEdit); actions.appendChild(btnToggle); actions.appendChild(btnDel);
      row.appendChild(meta); row.appendChild(actions);
      categoriasList.appendChild(row);

      // populate select
      const opt = document.createElement("option"); opt.value = c.nome; opt.innerText = c.nome + (c.ativo===false ? " (inativa)" : "");
      prodCategoria.appendChild(opt);
    });
  }

  function renderProdutosList(){
    produtosList.innerHTML = "";
    data.produtos.forEach((p, idx) => {
      const row = document.createElement("div"); row.className = "list-item";
      const preview = document.createElement("img"); preview.className="img-preview";
      preview.src = p.imagem || placeholderDataUri();
      const meta = document.createElement("div"); meta.className="meta";
      const title = document.createElement("div"); title.innerHTML = `<strong>${p.nome}</strong> ${p.maisVendido? "🔥":""}`;
      const sub = document.createElement("div"); sub.className="muted";
      const precos = p.precos || {};
      sub.innerText = `${p.categoria || "—"} — P ${precos.P||"-"} / M ${precos.M||"-"} / G ${precos.G||"-"}`;
      meta.appendChild(title); meta.appendChild(sub);

      const actions = document.createElement("div"); actions.className="actions";
      const btnEdit = document.createElement("button"); btnEdit.textContent = "Editar"; btnEdit.className="small";
      const btnToggle = document.createElement("button"); btnToggle.textContent = p.ativo===false ? "Ativar" : "Desativar"; btnToggle.className="small";
      const btnDel = document.createElement("button"); btnDel.textContent = "Excluir"; btnDel.className="small";

      btnEdit.onclick = () => {
        editingProductIndex = idx;
        loadProductToForm(p);
      };
      btnToggle.onclick = () => { data.produtos[idx].ativo = !data.produtos[idx].ativo; saveLocal(); renderProdutosList(); };
      btnDel.onclick = () => { if(confirm("Excluir produto?")){ data.produtos.splice(idx,1); saveLocal(); renderProdutosList(); } };

      actions.appendChild(btnEdit); actions.appendChild(btnToggle); actions.appendChild(btnDel);
      row.appendChild(preview); row.appendChild(meta); row.appendChild(actions);
      produtosList.appendChild(row);
    });
  }

  function renderExtras(){
    extrasList.innerHTML = "";
    const merged = [...(data.bordas||[]), ...(data.adicionais||[])];
    merged.forEach((e, idx) => {
      const row = document.createElement("div"); row.className="list-item";
      const meta = document.createElement("div"); meta.className="meta";
      meta.innerHTML = `<strong>${e.nome}</strong><div class="muted">R$ ${e.preco?.toFixed?.(2)||e.preco}</div>`;
      const actions = document.createElement("div");
      const btnDel = document.createElement("button"); btnDel.textContent="Remover"; btnDel.className="small";
      btnDel.onclick = () => {
        const targetList = idx < (data.bordas||[]).length ? "bordas" : "adicionais";
        const realIdx = idx < (data.bordas||[]).length ? idx : idx - (data.bordas||[]).length;
        if(confirm("Remover item?")){ data[targetList].splice(realIdx,1); saveLocal(); renderExtras(); }
      };
      actions.appendChild(btnDel);
      row.appendChild(meta); row.appendChild(actions);
      extrasList.appendChild(row);
    });
  }

  // helpers
  function placeholderDataUri(){
    // simple SVG placeholder
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='100%' height='100%' fill='#eee'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#bbb' font-size='20'>Sem imagem</text></svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  function loadProductToForm(p){
    prodNome.value = p.nome || "";
    prodDesc.value = p.descricao || "";
    prodPrecoP.value = (p.precos && p.precos.P) || "";
    prodPrecoM.value = (p.precos && p.precos.M) || "";
    prodPrecoG.value = (p.precos && p.precos.G) || "";
    prodMaisVendido.checked = !!p.maisVendido;
    prodPreview.src = p.imagem || placeholderDataUri();
    prodCategoria.value = p.categoria || (data.categorias[0] && data.categorias[0].nome) || "";
    btnAddProd.textContent = "Salvar alterações";
    window.scrollTo({top:0,behavior:"smooth"});
  }

  // actions
  btnLogin.onclick = async () => {
    const p = adminPasswordInput.value || "";
    const stored = localStorage.getItem(LS_PASS) || "admin123";
    if (p === stored) {
      localStorage.setItem(LS_SESSION, "1");
      showAdmin();
    } else {
      alert("Senha incorreta.");
    }
  };

  btnLogout.onclick = () => {
    localStorage.removeItem(LS_SESSION);
    hideAdmin();
  };

  btnSaveAll.onclick = () => {
    applyFormToData();
    saveLocal();
    alert("Salvo.");
  };

  btnExportFile.onclick = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "app.json";
    a.click();
  };

  btnExport.onclick = () => {
    applyFormToData();
    saveLocal();
    alert("Dados salvos no localStorage.");
  };

  btnImportFile.onclick = () => fileImport2.click();
  fileImport2.onchange = (e) => {
    const f = e.target.files[0];
    if(!f) return;
    const r = new FileReader();
    r.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        data = parsed;
        saveLocal();
        renderAll();
        alert("Importado com sucesso.");
      } catch(err){ alert("Arquivo inválido."); }
    };
    r.readAsText(f);
  };

  btnImportQuick.onclick = () => fileImport.click();
  fileImport.onchange = (e) => {
    const f = e.target.files[0];
    if(!f) return;
    const r = new FileReader();
    r.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        data = parsed;
        saveLocal();
        renderAll();
        alert("Importado com sucesso.");
      } catch(err){ alert("Arquivo inválido."); }
    };
    r.readAsText(f);
  };

  btnAddCategoria.onclick = () => {
    const nome = (novaCategoria.value || "").trim();
    if(!nome) return alert("Nome vazio");
    data.categorias.push({nome, ativo:true});
    novaCategoria.value = "";
    saveLocal();
    renderCategorias();
    renderProdutosList();
  };

  btnAddProd.onclick = () => {
    const nome = (prodNome.value || "").trim();
    if(!nome) return alert("Nome do produto vazio");
    const precos = { P: parseFloat(prodPrecoP.value) || 0, M: parseFloat(prodPrecoM.value) || 0, G: parseFloat(prodPrecoG.value) || 0 };
    const novo = {
      nome,
      categoria: prodCategoria.value || (data.categorias[0] && data.categorias[0].nome) || "",
      descricao: prodDesc.value || "",
      imagem: prodPreview.src || "",
      maisVendido: !!prodMaisVendido.checked,
      precos,
      ativo: true
    };
    if(editingProductIndex == null){
      data.produtos.push(novo);
    } else {
      data.produtos[editingProductIndex] = novo;
      editingProductIndex = null;
      btnAddProd.textContent = "Criar produto";
    }
    // reset
    prodNome.value = "";
    prodDesc.value = "";
    prodPrecoP.value = prodPrecoM.value = prodPrecoG.value = "";
    prodMaisVendido.checked = false;
    prodPreview.src = "";
    saveLocal();
    renderProdutosList();
  };

  prodFile.onchange = (e) => {
    const f = e.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      prodPreview.src = ev.target.result; // base64
    };
    reader.readAsDataURL(f);
  };

  btnAddExtra.onclick = () => {
    const n = (extraNome.value||"").trim();
    const p = parseFloat(extraPreco.value) || 0;
    if(!n) return alert("Nome vazio");
    data.adicionais = data.adicionais || [];
    data.adicionais.push({nome:n, preco:p});
    extraNome.value = ""; extraPreco.value = "";
    saveLocal(); renderExtras();
  };

  btnChangePass.onclick = () => {
    const np = novaSenha.value || "";
    if(!np) return alert("Digite a nova senha");
    localStorage.setItem(LS_PASS, np);
    novaSenha.value = "";
    alert("Senha alterada");
  };

  // apply form fields to data object
  function applyFormToData(){
    data.config = data.config || {};
    data.config.nomePizzaria = nomePizzaria.value || "";
    data.config.whatsapp = (whatsapp.value || "").replace(/\D/g,'');
    data.config.lojaAberta = lojaAberta.value === "true";
    data.config.horario = horario.value || "";
    data.config.pedidoMinimo = parseFloat(pedidoMinimo.value) || 0;
    data.config.kmGratis = parseFloat(kmGratis.value) || 0;
    data.config.valorKm = parseFloat(valorKm.value) || 0;
    data.config.limiteKm = parseFloat(limiteKm.value) || 0;
    data.config.tempoEntrega = tempoEntrega.value || "";
    // meio a meio aviso persistido
    data.config.meioAMeio = data.config.meioAMeio || {};
    data.config.meioAMeio.aviso = mensagensAviso.value || "";
  }

  // UI show/hide
  function showAdmin(){
    loginSection.classList.add("hidden");
    adminApp.classList.remove("hidden");
    adminApp.removeAttribute("aria-hidden");
    renderAll();
  }
  function hideAdmin(){
    loginSection.classList.remove("hidden");
    adminApp.classList.add("hidden");
    adminApp.setAttribute("aria-hidden","true");
  }

  function renderAll(){
    renderAdminTitle();
    renderGeneral();
    renderCategorias();
    renderProdutosList();
    renderExtras();
    // ensure select for categories is updated
    if(data.categorias.length && !prodCategoria.value) prodCategoria.value = data.categorias[0].nome;
  }

  // session check on load
  (async ()=>{
    await loadData();
    const logged = !!localStorage.getItem(LS_SESSION);
    if(logged) showAdmin();
    else hideAdmin();
  })();

  // react to outside updates
  window.addEventListener("storage", (e) => {
    if(e.key === "__appDataUpdatedAt" || e.key === LS_KEY){
      try{
        const raw = localStorage.getItem(LS_KEY);
        data = JSON.parse(raw);
        renderAll();
      }catch(e){}
    }
  });
  window.addEventListener("appDataUpdated", () => {
    try{
      const raw = localStorage.getItem(LS_KEY);
      data = JSON.parse(raw);
      renderAll();
    }catch(e){}
  });

  // keep admin form inputs live-bound (save on change)
  [nomePizzaria, whatsapp, lojaAberta, horario, pedidoMinimo, kmGratis, valorKm, limiteKm, mensagensAviso, tempoEntrega]
    .forEach(el => el.addEventListener("change", () => { applyFormToData(); saveLocal(); renderAll(); }));

})();