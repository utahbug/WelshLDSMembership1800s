(() => {
  const exactSourceRoute = () => {
    const parameters = new URLSearchParams(location.search);
    return Boolean(parameters.get("collection") && (parameters.get("image") || parameters.get("imageFilename")));
  };
  const show = () => {
    if (document.querySelector(".source-route-status")) return;
    const main = document.querySelector("main");
    if (!main) return;
    const status = document.createElement("p");
    status.className = "source-route-status";
    status.setAttribute("role", "status");
    status.textContent = "Loading source…";
    main.prepend(status);
    document.documentElement.classList.add("source-route-pending");
  };
  const finish = () => {
    document.documentElement.classList.remove("source-route-pending");
    document.querySelector(".source-route-status")?.remove();
  };

  if (exactSourceRoute()) show();
  document.addEventListener("click", (event) => {
    const link = event.target.closest?.("a.people-source-link");
    if (!link) return;
    try {
      const destination = new URL(link.href, location.href);
      if (destination.origin === location.origin && destination.pathname.endsWith("/index.html") && destination.searchParams.get("collection")) show();
    } catch {}
  });
  document.addEventListener("load", (event) => { if (event.target?.id === "recordImage") finish(); }, true);
  document.addEventListener("error", (event) => { if (event.target?.id === "recordImage") finish(); }, true);
})();
