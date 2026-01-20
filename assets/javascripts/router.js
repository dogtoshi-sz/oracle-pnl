const routes = {
  "/": {
    html: "../../pages/dashboard.html",
    js: "./renderer.js"
  },
  "/signals": {
    html: "../../pages/signals.html",
    js: "./signals.js"
  }
};

const moduleCache = new Map();
let currentPageCleanup = null;

async function loadPageModule(path) {
  if (moduleCache.has(path)) {
    return moduleCache.get(path);
  }

  const mod = await import(new URL(path, import.meta.url));
  moduleCache.set(path, mod);
  return mod;
}

async function navigate(pathname, push = true) {
  if (currentPageCleanup) {
    currentPageCleanup();
    currentPageCleanup = null;
  }

  const route = routes[pathname] || routes["/"];

  const html = await fetch(
    new URL(route.html, import.meta.url)
  ).then(r => r.text());

  document.getElementById("app-content").innerHTML = html;

  if (route.js) {
    const mod = await loadPageModule(route.js);

    if (mod.onMount) {
      currentPageCleanup = mod.onMount();
    }
  }

  markActiveNav(pathname);

  if (push && window.location.pathname !== pathname) {
    window.history.pushState({}, "", pathname);
  }
}

function markActiveNav(path) {
  document.querySelectorAll(".nav-link").forEach(link => {
    link.classList.toggle(
      "active",
      link.getAttribute("href") === path
    );
  });
}

window.addEventListener("popstate", () => {
  navigate(window.location.pathname, false);
});

document.addEventListener("click", e => {
  const link = e.target.closest("a[href^='/']");
  if (!link) return;

  e.preventDefault();
  navigate(link.getAttribute("href"));
});

navigate(window.location.pathname, false);