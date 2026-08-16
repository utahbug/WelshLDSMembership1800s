(() => {
  if (window.WELSH_RESEARCH_BETA !== true) return;
  document.querySelectorAll("[data-local-feature]").forEach((element) => { element.hidden = false; });
})();
