(() => {
  const host = location.hostname.toLowerCase();
  const beta = window.WELSH_RESEARCH_BETA === true;
  const localContext = location.protocol === "file:" || host === "localhost" || host === "127.0.0.1" || host === "::1" || /^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host);
  if (!beta && !localContext && window.WELSH_RECORD_CATALOG?.edition !== "local" && window.WELSH_RECORD_CATALOG?.edition !== "portable") return;
  document.querySelectorAll("[data-local-feature]").forEach((element) => { element.hidden = false; });
  if (beta) return;
  const tools = document.querySelector(".site-menu nav");
  if (!tools || tools.querySelector('[href="people-search.html"]')) return;
  const link = document.createElement("a"); link.href = "people-search.html"; link.textContent = "Member Search";
  tools.insertBefore(link, tools.querySelector('[href="welsh-saints-research.html"]'));
})();
