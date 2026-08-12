(() => {
  if (window.WELSH_RESEARCH_BETA !== true) return;
  document.querySelectorAll("[data-local-feature]").forEach((element) => { element.hidden = false; });
  document.querySelectorAll(".footer-project nav").forEach((nav) => {
    const additions = [["historical-names.html", "Historical Names and Variants"], ["familysearch-comparison.html", "FamilySearch comparison"]];
    const workRemaining = nav.querySelector('[href="work-remaining.html"]');
    additions.forEach(([href, label]) => {
      if (nav.querySelector(`[href="${href}"]`)) return;
      const link = document.createElement("a"); link.href = href; link.textContent = label;
      nav.insertBefore(link, workRemaining);
    });
  });
})();
