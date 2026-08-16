(() => {
  const more = document.querySelector(".people-scope-more");
  const details = document.querySelector("#peopleFullSearchDetails");
  const scopeNote = document.querySelector(".people-search-scope-note");
  if (more && scopeNote) {
    const prompt = document.createElement("span");
    prompt.className = "people-full-search-prompt";
    prompt.textContent = "Enter a name, place, date, title, or phrase.";
    more.after(prompt);
  }
  if (more && details) more.addEventListener("click", () => {
    const expanded = more.getAttribute("aria-expanded") === "true";
    more.setAttribute("aria-expanded", String(!expanded));
    more.textContent = expanded ? "Details" : "Hide details";
    details.hidden = expanded;
  });

  const arrowGroup = document.querySelector(".search-sticky-nav .research-nav-arrows");
  const results = document.querySelector("#peopleResults, #researchResults");
  if (!arrowGroup || !results) return;

  let frame = 0;
  const update = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const pageHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      const meaningfulOverflow = pageHeight - window.innerHeight > Math.max(180, window.innerHeight * 0.2);
      arrowGroup.hidden = !meaningfulOverflow;
    });
  };

  new MutationObserver(update).observe(results, { childList: true, subtree: true, characterData: true });
  if (window.ResizeObserver) new ResizeObserver(update).observe(results);
  window.addEventListener("resize", update, { passive: true });
  window.addEventListener("load", update, { once: true });
  update();
})();
