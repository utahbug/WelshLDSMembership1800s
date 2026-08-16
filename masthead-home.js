(() => {
  const masthead = document.querySelector(".masthead");
  if (!masthead || masthead.classList.contains("masthead-home-link")) return;

  const goHome = () => { location.href = "index.html"; };
  masthead.classList.add("masthead-home-link");
  masthead.tabIndex = 0;
  masthead.setAttribute("role", "link");
  masthead.setAttribute("aria-label", "Home");
  masthead.setAttribute("title", "Home");
  masthead.addEventListener("click", (event) => {
    if (event.target.closest("a, button, input, select, textarea, summary")) return;
    goHome();
  });
  masthead.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    goHome();
  });
})();
