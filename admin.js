const STORAGE_KEY="bella-massa-data";
const AUTH_KEY="bella-massa-auth";
const $=id=>document.getElementById(id);
const uid=()=>Date.now()+Math.floor(Math.random()*1000);
const hash=s=>btoa(unescape(encodeURIComponent(s)));

const DEFAULT_DATA={
  auth:{password:null},
  store:{
    name:"",phone:"",open:"",close:"",
    deliveryTime:"35–50 min",
    deliveryFee:0,
    whatsMsg:""
  },
  categories:[],
  products:[],
  extras:[],
  borders:[],
  promoWeek:{}
};

const loadDB=()=>JSON.parse(localStorage.getItem(STORAGE_KEY))||structuredClone(DEFAULT_DATA);
const saveDB=d=>localStorage.setItem(STORAGE_KEY,JSON.stringify(d));

function autoExport(){
  const d=structuredClone(loadDB());
  delete d.auth;
  const blob=new Blob([JSON.stringify(d,null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="app.json";
  a.click();
}

function loginAdmin(){
  const d=loadDB();
  if(!d.auth.password){
    const p=prompt("Crie a senha do admin:");
    if(!p)return;
    d.auth.password=hash(p);
    saveDB(d);
    localStorage.setItem(AUTH_KEY,"ok");
    location.reload(); return;
  }
  if(hash(loginPass.value)!==d.auth.password) return alert("Senha incorreta");
  localStorage.setItem(AUTH_KEY,"ok");
  loginBox.classList.add("hidden");
  admin.classList.remove("hidden");
  loadAdmin();
}

function logout(){
  localStorage.removeItem(AUTH_KEY);
  location.reload();
}

document.addEventListener("DOMContentLoaded",()=>{
  if(localStorage.getItem(AUTH_KEY)==="ok"){
    loginBox.classList.add("hidden");
    admin.classList.remove("hidden");
    loadAdmin();
  }
});

function loadAdmin(){
  const d=loadDB();
  storeName.value=d.store.name;
  storePhone.value=d.store.phone;
  openTime.value=d.store.open;
  closeTime.value=d.store.close;
  deliveryTime.value=d.store.deliveryTime;
  deliveryFee.value=d.store.deliveryFee;
  whatsMsg.value=d.store.whatsMsg;
  renderCategories();
  renderProducts();
  renderExtras();
  renderBorders();
  renderPromoWeek();
}

function saveStore(){
  const d=loadDB();
  d.store={
    ...d.store,
    name:storeName.value,
    phone:storePhone.value.replace(/\D/g,""),
    open:openTime.value,
    close:closeTime.value,
    deliveryTime:deliveryTime.value,
    deliveryFee:+deliveryFee.value||0,
    whatsMsg:whatsMsg.value
  };
  saveDB(d); autoExport();
  alert("Loja salva");
}

/* CATEGORIAS */
function addCategory(){
  const d=loadDB();
  d.categories.push({id:uid(),name:catName.value,active:true});
  catName.value="";
  saveDB(d); autoExport(); renderCategories();
}
function renderCategories(){
  const d=loadDB();
  catList.innerHTML=d.categories.map(c=>`
    <div class="row">
      <input value="${c.name}" onchange="editCategory(${c.id},this.value)">
      <button onclick="toggleCategory(${c.id})">${c.active?"👁":"⏸"}</button>
    </div>`).join("");
  prodCat.innerHTML=d.categories.filter(c=>c.active)
    .map(c=>`<option value="${c.id}">${c.name}</option>`).join("");
}
function editCategory(id,v){
  const d=loadDB(); d.categories.find(c=>c.id===id).name=v;
  saveDB(d); autoExport();
}
function toggleCategory(id){
  const d=loadDB(); const c=d.categories.find(c=>c.id===id);
  c.active=!c.active; saveDB(d); autoExport(); renderCategories();
}

/* PRODUTOS */
function addProduct(){
  const d=loadDB();
  const p={
    id:uid(),
    categoryId:+prodCat.value,
    name:prodName.value,
    desc:prodDesc.value,
    prices:{P:+priceP.value||null,M:+priceM.value||null,G:+priceG.value||null},
    maxFlavors:+prodFlavors.value||1,
    image:null,
    badges:{bestseller:false,promo:false,offer:false},
    active:true
  };
  const f=prodImage.files[0];
  if(f){
    const r=new FileReader();
    r.onload=()=>{p.image=r.result; d.products.push(p); saveDB(d); autoExport(); renderProducts();}
    r.readAsDataURL(f);
  }else{ d.products.push(p); saveDB(d); autoExport(); renderProducts(); }
}
function renderProducts(){
  const d=loadDB();
  productList.innerHTML=d.products.map(p=>`
    <div class="row">
      ${p.name}
      <label><input type="checkbox" ${p.badges.bestseller?"checked":""}
        onchange="setBadge(${p.id},'bestseller',this.checked)">🔥</label>
      <label><input type="checkbox" ${p.badges.promo?"checked":""}
        onchange="setBadge(${p.id},'promo',this.checked)">⭐</label>
      <label><input type="checkbox" ${p.badges.offer?"checked":""}
        onchange="setBadge(${p.id},'offer',this.checked)">💥</label>
    </div>`).join("");
}
function setBadge(id,t,v){
  const d=loadDB(); d.products.find(p=>p.id===id).badges[t]=v;
  saveDB(d); autoExport();
}

/* EXTRAS */
function addExtra(){ const d=loadDB();
  d.extras.push({id:uid(),name:extraName.value,price:+extraPrice.value});
  saveDB(d); autoExport(); renderExtras();
}
function renderExtras(){
  const d=loadDB();
  extraList.innerHTML=d.extras.map(e=>`<div>${e.name} R$ ${e.price}</div>`).join("");
}

/* BORDAS */
function addBorder(){ const d=loadDB();
  d.borders.push({id:uid(),name:borderName.value,price:+borderPrice.value});
  saveDB(d); autoExport(); renderBorders();
}
function renderBorders(){
  const d=loadDB();
  borderList.innerHTML=d.borders.map(b=>`<div>${b.name} R$ ${b.price}</div>`).join("");
}

/* PROMO */
function renderPromoWeek(){
  const d=loadDB();
  const days=["Dom","Seg","Ter","Qua","Qui","Sex","Sab"];
  promoWeek.innerHTML=days.map((day,i)=>`
    <div>
      <strong>${day}</strong>
      <input placeholder="Título" onchange="setPromo(${i},'title',this.value)">
      <input placeholder="Descrição" onchange="setPromo(${i},'desc',this.value)">
      <input type="number" placeholder="Preço" onchange="setPromo(${i},'price',this.value)">
      <input type="file" onchange="setPromoImg(${i},this)">
      <label><input type="checkbox" onchange="setPromo(${i},'active',this.checked)"> Ativa</label>
    </div>`).join("");
}
function setPromo(d,f,v){
  const db=loadDB(); db.promoWeek[d]=db.promoWeek[d]||{};
  db.promoWeek[d][f]=v; saveDB(db); autoExport();
}
function setPromoImg(d,i){
  const f=i.files[0]; if(!f)return;
  const r=new FileReader();
  r.onload=()=>{const db=loadDB(); db.promoWeek[d]=db.promoWeek[d]||{};
    db.promoWeek[d].image=r.result; saveDB(db); autoExport();}
  r.readAsDataURL(f);
}