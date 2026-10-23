(function () {
  var c = window.KISTACK || {};
  // Newsletter forms: post to Buttondown when configured, otherwise explain.
  document.querySelectorAll("form[data-newsletter]").forEach(function (f) {
    if (c.BUTTONDOWN_USERNAME) {
      f.action = "https://buttondown.com/api/emails/embed-subscribe/" + c.BUTTONDOWN_USERNAME;
      f.method = "post";
      f.target = "popupwindow";
      var tag = f.getAttribute("data-newsletter");
      if (tag) { var i = document.createElement("input"); i.type = "hidden"; i.name = "tag"; i.value = tag; f.appendChild(i); }
      f.addEventListener("submit", function () { window.open("https://buttondown.com/" + c.BUTTONDOWN_USERNAME, "popupwindow"); });
    } else {
      f.addEventListener("submit", function (e) { e.preventDefault(); alert("Newsletter not connected yet. Set BUTTONDOWN_USERNAME in assets/config.js."); });
    }
  });
  // Checkout and intake links
  var map = { "pro-kit": c.LEMON_PRO_KIT_URL, "pro-kit-team": c.LEMON_PRO_KIT_TEAM_URL, "review-intake": c.REVIEW_INTAKE_URL };
  document.querySelectorAll("a[data-link]").forEach(function (a) {
    var url = map[a.getAttribute("data-link")];
    if (url) { a.href = url; if (a.getAttribute("data-link").indexOf("pro-kit") === 0) { a.classList.add("lemonsqueezy-button"); } }
    else { a.addEventListener("click", function (e) { e.preventDefault(); alert("Not connected yet. Set the matching URL in assets/config.js."); }); }
  });
  if (c.LEMON_PRO_KIT_URL) { var s = document.createElement("script"); s.src = "https://assets.lemonsqueezy.com/lemon.js"; s.defer = true; document.head.appendChild(s); }
  document.querySelectorAll("[data-email]").forEach(function (el) { if (c.CONTACT_EMAIL) { el.textContent = c.CONTACT_EMAIL; if (el.tagName === "A") el.href = "mailto:" + c.CONTACT_EMAIL; } });
  if (c.PLAUSIBLE_DOMAIN) { var p = document.createElement("script"); p.defer = true; p.setAttribute("data-domain", c.PLAUSIBLE_DOMAIN); p.src = "https://plausible.io/js/script.js"; document.head.appendChild(p); }
})();
