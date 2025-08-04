// DIGITAL MENU - Multi-Restaurant App (v1.0)

// --- FIREBASE INIT ---
const firebaseConfig = {
  apiKey: "AIzaSyAVmsiSzszfgCEk5qqnX57pGigoQtUafAU",
  authDomain: "food-tracker-fca47.firebaseapp.com",
  projectId: "food-tracker-fca47",
  storageBucket: "food-tracker-fca47.appspot.com",
  messagingSenderId: "769456892190",
  appId: "1:769456892190:web:9c2a2e7d676f1f2d85010f"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage ? firebase.storage() : null; // Optional: enable Firebase Storage for images

// --- CONSTANTS ---
const DEFAULT_LANG = "en";
const LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "uk", name: "Українська", flag: "🇺🇦" },
  { code: "ro", name: "Română", flag: "🇷🇴" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "el", name: "Ελληνικά", flag: "🇬🇷" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "fa", name: "فارسی", flag: "🇮🇷" },
  { code: "he", name: "עברית", flag: "🇮🇱" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "th", name: "ไทย", flag: "🇹🇭" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "sv", name: "Svenska", flag: "🇸🇪" },
  { code: "no", name: "Norsk", flag: "🇳🇴" },
  { code: "da", name: "Dansk", flag: "🇩🇰" },
  { code: "fi", name: "Suomi", flag: "🇫🇮" },
  { code: "cs", name: "Čeština", flag: "🇨🇿" },
  { code: "hu", name: "Magyar", flag: "🇭🇺" }
];
const ALLERGENS = [
  { value: "gluten", label: "Gluten Free" },
  { value: "vegan", label: "Vegan" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "nutfree", label: "Nut Free" },
  { value: "dairyfree", label: "Dairy Free" },
  { value: "halal", label: "Halal" }
];

// --- CATEGORY DATA ---
const MAIN_CATEGORIES = [
  "Antipasti", "Primi Piatti", "Secondi piatti Carne", "Secondi piatti Pesce", "Contorni",
  "Pizza", "Dessert", "Caffe", "Drinks", "Cocktails", "Wines", "Hot tea", "Hot Chocolate", "Liqueur"
];
// Submenus for Drinks/Wines/Allergens
const SUBCATEGORIES = {
  "Drinks": ["Soft drinks", "Beer", "Non-alcoholic drinks", "Juice", "Water"],
  "Wines": ["Red wines", "White wines", "Sparkling wines", "Rosé wines", "By glass wines"],
  "Allergen": ALLERGENS.map(a => a.label)
};

let restaurantId = null; // Current restaurant context

// --- UTILS ---
function $(x) { return document.getElementById(x); }
function bySel(sel) { return document.querySelector(sel); }
function byAll(sel) { return document.querySelectorAll(sel); }
function htmlEncode(txt) { return (txt || "").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function formatPrice(price) {
  let p = price ? price.toString().replace('.',',') : "";
  return p ? "€ " + p : "";
}
function imgOrDefault(img) {
  return img || "192.png";
}
function makeQR(url, el) {
  el.innerHTML = "";
  let qr = document.createElement("img");
  qr.alt = "QR code";
  qr.src = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" + encodeURIComponent(url);
  qr.style = "border-radius:18px;margin:10px;";
  el.appendChild(qr);
}

// --- FIREBASE HELPERS ---
function restaurantRef(id) {
  return db.collection("restaurants").doc(id || restaurantId);
}
function dishesRef() {
  return restaurantRef().collection("dishes");
}
function getAllRestaurants() {
  return db.collection("restaurants").get();
}
function addRestaurant(data) {
  return db.collection("restaurants").add(data);
}
function updateRestaurant(id, data) {
  return db.collection("restaurants").doc(id).update(data);
}
function createInitialRestaurant() {
  return addRestaurant({
    name: "Ristorante Demo",
    username: "admin",
    password: "Zain@123",
    logo: "",
    created: firebase.firestore.FieldValue.serverTimestamp()
  });
}
function getRestaurantByLogin(username, password) {
  return db.collection("restaurants")
    .where("username", "==", username)
    .where("password", "==", password)
    .limit(1).get()
    .then(qs => qs.empty ? null : { id: qs.docs[0].id, ...qs.docs[0].data() });
}
function getDishes(callback) {
  dishesRef().onSnapshot(snap => {
    let arr = [];
    snap.forEach(doc => arr.push({ id: doc.id, ...doc.data() }));
    callback(arr);
  });
}
function uploadImg(file, cb) {
  if (!storage || !file) return cb("");
  let fname = "img_" + Date.now() + "_" + Math.random().toString(36).substr(2,6);
  let ref = storage.ref("dish_images/" + restaurantId + "/" + fname);
  ref.put(file).then(snap => ref.getDownloadURL()).then(url => cb(url));
}

// --- ROUTING (detect admin or public) ---
let isAdmin = location.pathname.includes("admin");
let adminData = null;

// --- APP INIT ---
document.addEventListener("DOMContentLoaded", () => {
  if (isAdmin) adminPage();
  else publicMenuPage();
});

// =======================
//      ADMIN PANEL
// =======================

function adminPage() {
  // Elements
  const loginSection = $("loginSection");
  const adminPanelSection = $("adminPanelSection");
  const loginForm = $("loginForm");
  const usernameInput = $("username");
  const passwordInput = $("password");
  const logoutBtn = $("logoutBtn");
  const adminTable = $("adminTable").querySelector("tbody");
  const dishForm = $("dishForm");
  const resetBtn = $("resetBtn");
  const categorySelect = $("categorySelect");
  const tagsSelect = $("tagsSelect");
  const imgPreview = $("imgPreview");
  const addSpecialBtn = $("addSpecialBtn");
  const addMenuGiornoBtn = $("addMenuGiornoBtn");
  const editRestaurantBtn = $("editRestaurantBtn");
  const restaurantModal = $("restaurantModal");
  const restaurantForm = $("restaurantForm");
  const logoPreview = $("logoPreview");
  const restaurantNameInput = $("restaurantNameInput");
  const restaurantLogoInput = $("restaurantLogoInput");
  const adminUserInput = $("adminUserInput");
  const adminPassInput = $("adminPassInput");
  const adminRestaurantLogo = $("adminRestaurantLogo");
  const adminRestaurantName = $("adminRestaurantName");

  // Fill categories and allergens
  categorySelect.innerHTML = MAIN_CATEGORIES.map(cat => `<option>${cat}</option>`).join("") +
    `<option>Piatti del Giorno</option><option>Menu del Giorno</option>`;
  tagsSelect.innerHTML = ALLERGENS.map(a => `<option value="${a.value}">${a.label}</option>`).join("");

  // Login
  let currentAdmin = JSON.parse(localStorage.getItem("dm_admin")||"null");
  if (currentAdmin) tryLogin(currentAdmin.username, currentAdmin.password);

  loginForm.onsubmit = e => {
    e.preventDefault();
    let u = usernameInput.value.trim(), p = passwordInput.value;
    tryLogin(u, p);
  };

  function tryLogin(u, p) {
    getRestaurantByLogin(u, p).then(rest => {
      if (!rest) { alert("Credenziali non valide"); return; }
      adminData = rest;
      restaurantId = rest.id;
      localStorage.setItem("dm_admin", JSON.stringify({ username: u, password: p, id: rest.id }));
      loginSection.style.display = "none";
      adminPanelSection.style.display = "";
      logoutBtn.style.display = "";
      renderAdminHeader(rest);
      loadDishes();
    });
  }

  logoutBtn.onclick = () => {
    localStorage.removeItem("dm_admin");
    location.reload();
  };

  // Render admin header
  function renderAdminHeader(rest) {
    adminRestaurantLogo.src = rest.logo || "192.png";
    adminRestaurantName.textContent = rest.name || "Ristorante";
  }

  // Edit restaurant modal
  editRestaurantBtn.onclick = () => {
    restaurantModal.style.display = "flex";
    restaurantNameInput.value = adminData.name || "";
    adminUserInput.value = adminData.username || "";
    adminPassInput.value = adminData.password || "";
    logoPreview.innerHTML = adminData.logo ? `<img src="${adminData.logo}" style="width:45px;height:45px;border-radius:9px;">` : "";
  };
  $("modalCancelBtn").onclick = () => { restaurantModal.style.display = "none"; };
  restaurantForm.onsubmit = e => {
    e.preventDefault();
    let name = restaurantNameInput.value.trim();
    let user = adminUserInput.value.trim();
    let pass = adminPassInput.value;
    let logoFile = restaurantLogoInput.files[0];
    let updateData = { name, username: user, password: pass };
    let done = url => {
      if (url) updateData.logo = url;
      updateRestaurant(restaurantId, updateData).then(() => {
        alert("Salvato!");
        restaurantModal.style.display = "none";
        adminData = { ...adminData, ...updateData, logo: url || adminData.logo };
        renderAdminHeader(adminData);
      });
    };
    if (logoFile) uploadImg(logoFile, done);
    else done();
  };
  restaurantLogoInput.onchange = e => {
    if (e.target.files && e.target.files[0]) {
      let fr = new FileReader();
      fr.onload = ev => { logoPreview.innerHTML = `<img src="${ev.target.result}" style="width:45px;height:45px;border-radius:9px;">`; };
      fr.readAsDataURL(e.target.files[0]);
    }
  };

  // Dishes CRUD
  let editingId = null;
  dishForm.onsubmit = e => {
    e.preventDefault();
    let fd = new FormData(dishForm);
    let data = {
      category: fd.get("category"),
      name: fd.get("name"),
      ingredients: fd.get("ingredients"),
      price: fd.get("price"),
      tags: Array.from(tagsSelect.selectedOptions).map(o=>o.value),
      visible: true
    };
    let imgFile = fd.get("image");
    let doSave = url => {
      if (url) data.img = url;
      if (editingId) {
        dishesRef().doc(editingId).update(data).then(resetForm);
      } else {
        dishesRef().add(data).then(resetForm);
      }
    };
    if (imgFile && imgFile.size>0) uploadImg(imgFile, doSave);
    else doSave();
  };
  resetBtn.onclick = resetForm;
  function resetForm() {
    dishForm.reset();
    editingId = null;
    imgPreview.innerHTML = "";
    dishForm.querySelector("button[type=submit]").textContent = "Salva";
  }

  // Edit dish
  adminTable.onclick = e => {
    let btn = e.target;
    let row = btn.closest("tr");
    let id = row?.dataset.id;
    if (btn.classList.contains("edit-btn")) {
      let d = JSON.parse(row.dataset.dish);
      editingId = id;
      for (let key of ["category","name","ingredients","price"]) dishForm[key].value = d[key]||"";
      Array.from(tagsSelect.options).forEach(opt => opt.selected = (d.tags||[]).includes(opt.value));
      imgPreview.innerHTML = d.img ? `<img src="${d.img}" style="width:40px;border-radius:7px;">` : "";
      dishForm.querySelector("button[type=submit]").textContent = "Aggiorna";
    }
    if (btn.classList.contains("delete-btn")) {
      if (confirm("Eliminare questo piatto?")) dishesRef().doc(id).delete();
    }
    if (btn.classList.contains("hide-btn")) {
      let visible = btn.dataset.visible==="true";
      dishesRef().doc(id).update({ visible: !visible });
    }
  };

  // Special: Hide/show, specials, menu del giorno
  addSpecialBtn.onclick = () => {
    categorySelect.value = "Piatti del Giorno";
    window.scrollTo({ top: dishForm.offsetTop, behavior: "smooth" });
  };
  addMenuGiornoBtn.onclick = () => {
    categorySelect.value = "Menu del Giorno";
    window.scrollTo({ top: dishForm.offsetTop, behavior: "smooth" });
  };

  // Render admin table
  function loadDishes() {
    getDishes(arr => {
      adminTable.innerHTML = arr.map(d => `
        <tr data-id="${d.id}" data-dish='${JSON.stringify(d)}'>
          <td>${htmlEncode(d.category)}</td>
          <td>${htmlEncode(d.name)}</td>
          <td>${htmlEncode(d.ingredients)}</td>
          <td>${formatPrice(d.price)}</td>
          <td class="img-cell">${d.img ? `<img src="${d.img}">` : ""}</td>
          <td>${(d.tags||[]).map(t => ALLERGENS.find(a=>a.value==t)?.label).join(", ")}</td>
          <td>
            <button class="action-btn hide-btn" data-visible="${!!d.visible}">
              ${d.visible ? "Visibile" : "Nascosto"}
            </button>
          </td>
          <td>
            <button class="action-btn edit-btn">Modifica</button>
            <button class="action-btn delete-btn delete-btn">Elimina</button>
          </td>
        </tr>
      `).join("");
    });
  }
}

// =======================
//      PUBLIC MENU
// =======================

function publicMenuPage() {
  // Elements
  const restaurantLogo = $("restaurantLogo");
  const restaurantName = $("restaurantName");
  const categoryBtns = $("categoryBtns");
  const submenuBar = $("submenuBar");
  const searchInput = $("searchInput");
  const menuGrid = $("menuGrid");
  const specialsSection = $("specialsSection");
  const giornoSection = $("giornoSection");
  const specialsGrid = $("specialsGrid");
  const giornoGrid = $("giornoGrid");
  const specialsTitle = $("specialsTitle");
  const giornoTitle = $("giornoTitle");
  const categoryTitle = $("categoryTitle");
  const qrSection = $("qrSection");
  const languageSelect = $("languageSelect");

  // Load all restaurants, pick one by URL or show default
  getAllRestaurants().then(qs => {
    let arr = [];
    qs.forEach(doc => arr.push({ id: doc.id, ...doc.data() }));
    // Restaurant id by ?r= in url, else show first
    let urlParams = new URLSearchParams(location.search);
    let rid = urlParams.get("r") || (arr.length && arr[0].id);
    restaurantId = rid;
    let rest = arr.find(r => r.id == restaurantId);
    if (!rest) {
      restaurantName.textContent = "Ristorante non trovato";
      return;
    }
    restaurantLogo.src = rest.logo || "192.png";
    restaurantName.textContent = rest.name || "Ristorante";

    // Setup QR code
    let publicUrl = location.origin + location.pathname + "?r=" + rest.id;
    makeQR(publicUrl, qrSection);

    // Multi-language select
    languageSelect.innerHTML = LANGUAGES.map(l => `<option value="${l.code}">${l.flag} ${l.name}</option>`).join("");
    languageSelect.value = localStorage.getItem("dm_lang") || DEFAULT_LANG;
    languageSelect.onchange = () => {
      localStorage.setItem("dm_lang", languageSelect.value);
      renderAll();
    };

    // Load and render menu
    getDishes(arr => {
      // --- Render main categories ---
      function renderCategories() {
        categoryBtns.innerHTML = "";
        MAIN_CATEGORIES.concat(["Allergen"]).forEach(cat => {
          let btn = document.createElement("button");
          btn.className = "category-btn";
          btn.textContent = cat;
          btn.onclick = () => selectCategory(cat);
          categoryBtns.appendChild(btn);
        });
      }
      renderCategories();

      // --- Category filter & submenu ---
      let currentCategory = MAIN_CATEGORIES[0];
      let currentSubmenu = null;
      function selectCategory(cat) {
        currentCategory = cat;
        currentSubmenu = null;
        renderAll();
        if (SUBCATEGORIES[cat]) {
          submenuBar.style.display = "";
          submenuBar.innerHTML = SUBCATEGORIES[cat].map(sub =>
            `<button class="submenu-btn">${sub}</button>`).join("");
          Array.from(submenuBar.children).forEach((btn, i) => {
            btn.onclick = () => { currentSubmenu = SUBCATEGORIES[cat][i]; renderAll(); };
          });
        } else {
          submenuBar.style.display = "none";
        }
        // Highlight selected
        Array.from(categoryBtns.children).forEach(b => {
          b.classList.toggle("active", b.textContent===cat);
        });
      }

      // --- Search ---
      searchInput.oninput = renderAll;

      // --- Main render function ---
      function renderAll() {
        // Language
        let lang = languageSelect.value || DEFAULT_LANG;
        let tr = x => x; // TODO: Add translation logic with Google Translate API if needed

        // Filter data
        let list = arr.filter(d => d.visible !== false);
        if (currentCategory === "Allergen" && currentSubmenu) {
          let allergenVal = ALLERGENS.find(a=>a.label===currentSubmenu)?.value;
          list = list.filter(d => (d.tags||[]).includes(allergenVal));
        } else if (SUBCATEGORIES[currentCategory] && currentSubmenu) {
          list = list.filter(d => (d.subcategory===currentSubmenu || (d.category===currentCategory && d.subcategory===currentSubmenu)));
        } else if (currentCategory !== "Allergen") {
          list = list.filter(d => d.category===currentCategory);
        }
        // Search filter
        let search = searchInput.value.trim().toLowerCase();
        if (search) list = list.filter(d =>
          d.name?.toLowerCase().includes(search) ||
          d.ingredients?.toLowerCase().includes(search)
        );

        // Specials
        let specials = arr.filter(d => d.category==="Piatti del Giorno" && d.visible!==false);
        let giorno = arr.filter(d => d.category==="Menu del Giorno" && d.visible!==false);

        // Render specials & giorno
        specialsTitle.textContent = specials.length ? "Piatti del Giorno" : "";
        specialsGrid.innerHTML = specials.map(d => dishCard(d, lang)).join("");
        giornoTitle.textContent = giorno.length ? "Menu del Giorno" : "";
        giornoGrid.innerHTML = giorno.map(d => dishCard(d, lang)).join("");

        // Render category title
        categoryTitle.textContent =
          (currentCategory==="Allergen" && currentSubmenu)
            ? "Allergeni: " + currentSubmenu
            : currentCategory;

        // Main menu grid
        menuGrid.innerHTML = list.map(d => dishCard(d, lang)).join("");
      }
      // Dish card
      function dishCard(d, lang) {
        return `<div class="menu-card">
          ${d.img? `<img class="dish-img" src="${d.img}">` : ""}
          <div class="dish-name">${htmlEncode(d.name)}</div>
          <div class="dish-ingredients">${htmlEncode(d.ingredients)}</div>
          <div class="dish-price">${formatPrice(d.price)}</div>
          <div class="dish-tags">
            ${(d.tags||[]).map(t =>
              `<span class="dish-tag">${ALLERGENS.find(a=>a.value==t)?.label||t}</span>`
            ).join("")}
          </div>
        </div>`;
      }

      // Initial select and render
      selectCategory(MAIN_CATEGORIES[0]);
    });
  });
}
