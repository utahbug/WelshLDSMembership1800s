(() => {
  if (window.WELSH_RECORD_CATALOG?.edition === "public") return;
  const tools = document.querySelector(".site-menu nav");
  if (!tools || tools.querySelector('[href="people-search.html"]')) return;
  const link = document.createElement("a"); link.href = "people-search.html"; link.textContent = "People-name search (local)";
  tools.insertBefore(link, tools.querySelector('[href="welsh-saints-research.html"]'));
})();
