async function loadHeader() {
  const res = await fetch("./partials/header.html");
  const html = await res.text();
  document.getElementById("global-header").innerHTML = html;
}

loadHeader();