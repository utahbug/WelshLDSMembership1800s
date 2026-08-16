import * as pdfjsLib from "./assets/pdfjs/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = "./assets/pdfjs/pdf.worker.mjs";

const $ = (selector) => document.querySelector(selector);
const elements = {
  title: $("#bookTitle"), author: $("#bookAuthor"), canvas: $("#bookCanvas"), stage: $("#bookCanvasStage"),
  loadStatus: $("#bookLoadStatus"), pageNumber: $("#pageNumber"), pageTotal: $("#pageTotal"), previous: $("#previousPage"), next: $("#nextPage"),
  sidePrevious: $("#sidePrevious"), sideNext: $("#sideNext"),
  pageTurnHint: $("#bookPageTurnHint"),
  zoomOut: $("#zoomOut"), zoomIn: $("#zoomIn"), fitPage: $("#fitPage"), fitWidth: $("#fitWidth"), print: $("#printBook"),
  searchSection: $("#book-search"), searchForm: $("#bookSearchForm"), searchInput: $("#bookSearchInput"), searchStatus: $("#bookSearchStatus"), searchResults: $("#bookSearchResults"), sourceNote: $("#bookSourceNote"),
};
// Keep the existing in-book search immediately available at every viewport.
// Non-searchable publications hide the entire section after catalog loading.
elements.searchSection.open = true;

let publication;
let pdf;
let currentPage = 1;
let zoom = 1;
let fitMode = "width";
let renderTask;
let searchPages;
let touchStart = null;
let touchWasMulti = false;
let lastTouchActionAt = 0;
let desktopPointerStart = null;
let pageTurnHintTimer = null;

const SWIPE_MINIMUM_PX = 68;
const SWIPE_DIRECTION_RATIO = 1.35;
const SWIPE_MAXIMUM_MS = 850;
const TAP_MAXIMUM_PX = 12;
const TAP_MAXIMUM_MS = 420;
const DESKTOP_CLICK_MAXIMUM_PX = 8;
const PAGE_TURN_ANIMATION_MS = 220;
const PAGE_TURN_HINT_DURATION_MS = 7000;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();

function pageTurnHintStorageKey() {
  return publication ? `welsh-publication-page-turn-hint:${publication.id}` : "";
}

function desktopPageTurnHintsAvailable() {
  return window.matchMedia("(min-width: 620px) and (hover: hover) and (pointer: fine)").matches;
}

function pageTurnHintWasDismissed() {
  try { return localStorage.getItem(pageTurnHintStorageKey()) === "dismissed"; } catch { return false; }
}

function positionPageTurnHint() {
  if (elements.pageTurnHint.hidden) return;
  elements.pageTurnHint.style.left = `${elements.canvas.offsetLeft}px`;
  elements.pageTurnHint.style.top = `${elements.canvas.offsetTop}px`;
  elements.pageTurnHint.style.width = `${elements.canvas.clientWidth}px`;
  elements.pageTurnHint.style.height = `${elements.canvas.clientHeight}px`;
}

function dismissPageTurnHint() {
  if (elements.pageTurnHint.hidden) return;
  elements.pageTurnHint.hidden = true;
  clearTimeout(pageTurnHintTimer);
  try { localStorage.setItem(pageTurnHintStorageKey(), "dismissed"); } catch { /* Storage may be unavailable. */ }
}

function showPageTurnHint() {
  if (!desktopPageTurnHintsAvailable() || pageTurnHintWasDismissed()) return;
  elements.pageTurnHint.hidden = false;
  positionPageTurnHint();
  pageTurnHintTimer = window.setTimeout(dismissPageTurnHint, PAGE_TURN_HINT_DURATION_MS);
}

async function renderPage() {
  if (!pdf) return;
  renderTask?.cancel();
  const page = await pdf.getPage(currentPage);
  const base = page.getViewport({ scale: 1 });
  const sideGutter = window.innerWidth >= 620 ? 96 : 26;
  const availableWidth = Math.max(220, elements.stage.clientWidth - sideGutter);
  const availableHeight = Math.max(360, window.innerHeight - (window.innerWidth < 620 ? 180 : 150));
  let scale = zoom;
  if (fitMode === "width") scale = availableWidth / base.width;
  if (fitMode === "page") scale = Math.min(availableWidth / base.width, availableHeight / base.height);
  scale = clamp(scale, .35, 3.5);
  zoom = scale;
  const viewport = page.getViewport({ scale });
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  elements.canvas.width = Math.floor(viewport.width * pixelRatio);
  elements.canvas.height = Math.floor(viewport.height * pixelRatio);
  elements.canvas.style.width = `${Math.floor(viewport.width)}px`;
  elements.canvas.style.height = `${Math.floor(viewport.height)}px`;
  const context = elements.canvas.getContext("2d", { alpha: false });
  renderTask = page.render({ canvasContext: context, viewport, transform: pixelRatio === 1 ? null : [pixelRatio, 0, 0, pixelRatio, 0, 0] });
  try { await renderTask.promise; } catch (error) { if (error?.name !== "RenderingCancelledException") throw error; }
  elements.pageNumber.value = currentPage;
  elements.previous.disabled = currentPage <= 1;
  elements.next.disabled = currentPage >= pdf.numPages;
  elements.sidePrevious.hidden = currentPage <= 1;
  elements.sideNext.hidden = currentPage >= pdf.numPages;
  elements.loadStatus.hidden = true;
  elements.canvas.setAttribute("aria-label", `Page ${currentPage} of ${pdf.numPages}`);
}

function animatePageTurn(direction) {
  if (!direction || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const className = direction > 0 ? "book-page-turn-forward" : "book-page-turn-backward";
  elements.canvas.classList.remove("book-page-turn-forward", "book-page-turn-backward");
  void elements.canvas.offsetWidth;
  elements.canvas.classList.add(className);
  window.setTimeout(() => elements.canvas.classList.remove(className), PAGE_TURN_ANIMATION_MS);
}

async function goToPage(value) {
  dismissPageTurnHint();
  const page = clamp(Number.parseInt(value, 10) || 1, 1, pdf.numPages);
  const direction = Math.sign(page - currentPage);
  if (!direction) return;
  currentPage = page;
  await renderPage();
  animatePageTurn(direction);
  elements.stage.scrollTo({ top: 0, left: 0 });
}

async function prepareSearchText() {
  if (searchPages) return searchPages;
  elements.searchStatus.textContent = "Preparing book search…";
  if (publication.searchableTextSource && publication.searchableTextSource !== "embedded-pdf-text") {
    const index = await fetch(publication.searchableTextSource).then((response) => {
      if (!response.ok) throw new Error(`Publication search index returned ${response.status}`);
      return response.json();
    });
    if (index.publicationId !== publication.id || index.pageCount !== pdf.numPages) throw new Error("Publication search index does not match the loaded PDF.");
    searchPages = index.pages.map((page) => ({ ...page, normalized: normalize(page.text) }));
    return searchPages;
  }
  searchPages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(" ").replace(/\s+/g, " ").trim();
    searchPages.push({ pageNumber, text, normalized: normalize(text) });
    if (pageNumber % 20 === 0) elements.searchStatus.textContent = `Preparing book search… ${pageNumber} of ${pdf.numPages} pages`;
  }
  return searchPages;
}

function excerpt(text, normalizedQuery) {
  const normalizedText = normalize(text);
  const position = normalizedText.indexOf(normalizedQuery);
  if (position < 0) return text.slice(0, 180);
  const start = Math.max(0, position - 70);
  const end = Math.min(text.length, position + normalizedQuery.length + 110);
  return `${start ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

async function searchBook(event) {
  event.preventDefault();
  const query = elements.searchInput.value.trim();
  elements.searchResults.replaceChildren();
  elements.searchResults.hidden = true;
  if (!query) { elements.searchStatus.textContent = "Enter a word or phrase from this publication."; return; }
  const normalizedQuery = normalize(query);
  const pages = await prepareSearchText();
  const matches = pages.filter((page) => page.normalized.includes(normalizedQuery));
  elements.searchStatus.textContent = `${matches.length} matching page${matches.length === 1 ? "" : "s"}.`;
  if (!matches.length) return;
  const fragment = document.createDocumentFragment();
  matches.slice(0, 100).forEach((match) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "book-search-result";
    button.innerHTML = `<strong>Page ${match.pageNumber}</strong><span>${escapeHtml(excerpt(match.text, normalizedQuery))}</span>`;
    button.addEventListener("click", async () => { await goToPage(match.pageNumber); elements.stage.scrollIntoView({ behavior: "smooth", block: "start" }); });
    fragment.append(button);
  });
  elements.searchResults.append(fragment);
  elements.searchResults.hidden = false;
}

function printPublication() {
  const frame = document.createElement("iframe");
  frame.className = "book-print-frame";
  frame.src = publication.localDocument || publication.pdf;
  frame.title = "Print publication";
  frame.addEventListener("load", () => { setTimeout(() => { frame.contentWindow?.focus(); frame.contentWindow?.print(); }, 250); });
  document.body.append(frame);
  setTimeout(() => frame.remove(), 60000);
}

function formControl(element) {
  return element?.closest?.("input, textarea, select, button, a, [contenteditable='true']");
}

function pageNeedsHorizontalPanning() {
  return elements.stage.scrollWidth > elements.stage.clientWidth + 24;
}

function beginTouch(event) {
  if (event.touches.length !== 1 || formControl(event.target)) {
    touchStart = null;
    touchWasMulti = event.touches.length > 1;
    return;
  }
  const touch = event.touches[0];
  touchWasMulti = false;
  touchStart = { x: touch.clientX, y: touch.clientY, time: performance.now(), target: event.target };
}

function trackTouch(event) {
  if (event.touches.length > 1) {
    touchWasMulti = true;
    touchStart = null;
  }
}

function endTouch(event) {
  if (!touchStart || touchWasMulti || event.changedTouches.length !== 1 || touchStart.target !== elements.canvas) {
    touchStart = null;
    return;
  }
  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - touchStart.x;
  const deltaY = touch.clientY - touchStart.y;
  const elapsed = performance.now() - touchStart.time;
  const horizontalSwipe = Math.abs(deltaX) >= SWIPE_MINIMUM_PX && Math.abs(deltaX) >= Math.abs(deltaY) * SWIPE_DIRECTION_RATIO && elapsed <= SWIPE_MAXIMUM_MS;
  const tap = Math.abs(deltaX) <= TAP_MAXIMUM_PX && Math.abs(deltaY) <= TAP_MAXIMUM_PX && elapsed <= TAP_MAXIMUM_MS;
  touchStart = null;
  if (horizontalSwipe) {
    lastTouchActionAt = performance.now();
    if (pageNeedsHorizontalPanning()) return;
    if (deltaX < 0 && currentPage < pdf.numPages) goToPage(currentPage + 1);
    if (deltaX > 0 && currentPage > 1) goToPage(currentPage - 1);
    return;
  }
  if (!tap) return;
  lastTouchActionAt = performance.now();
  const box = elements.canvas.getBoundingClientRect();
  const relativeX = touch.clientX - box.left;
  if (relativeX < box.width / 3 && currentPage > 1) goToPage(currentPage - 1);
  if (relativeX > box.width * 2 / 3 && currentPage < pdf.numPages) goToPage(currentPage + 1);
}

function mobileClickZone(event) {
  if (window.innerWidth >= 620 || performance.now() - lastTouchActionAt < 650 || formControl(event.target)) return;
  const box = elements.canvas.getBoundingClientRect();
  const relativeX = event.clientX - box.left;
  if (relativeX < box.width / 3 && currentPage > 1) goToPage(currentPage - 1);
  if (relativeX > box.width * 2 / 3 && currentPage < pdf.numPages) goToPage(currentPage + 1);
}

function beginDesktopPageClick(event) {
  if (window.innerWidth < 620 || event.pointerType !== "mouse" || event.button !== 0 || event.target !== elements.canvas || formControl(event.target)) {
    desktopPointerStart = null;
    return;
  }
  desktopPointerStart = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    scrollLeft: elements.stage.scrollLeft,
    scrollTop: elements.stage.scrollTop,
  };
}

function endDesktopPageClick(event) {
  const start = desktopPointerStart;
  desktopPointerStart = null;
  if (!start || event.pointerId !== start.pointerId || event.pointerType !== "mouse" || event.button !== 0 || event.target !== elements.canvas || formControl(event.target)) return;
  if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > DESKTOP_CLICK_MAXIMUM_PX) return;
  if (Math.abs(elements.stage.scrollLeft - start.scrollLeft) > 2 || Math.abs(elements.stage.scrollTop - start.scrollTop) > 2) return;
  if (window.getSelection()?.toString().trim()) return;
  const box = elements.canvas.getBoundingClientRect();
  const relativeX = event.clientX - box.left;
  if (relativeX < box.width / 2) {
    if (currentPage > 1) goToPage(currentPage - 1);
    return;
  }
  if (currentPage < pdf.numPages) goToPage(currentPage + 1);
}

function keyboardPageTurn(event) {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || formControl(event.target)) return;
  if (event.key === "ArrowLeft" && currentPage > 1) { event.preventDefault(); goToPage(currentPage - 1); }
  if (event.key === "ArrowRight" && currentPage < pdf.numPages) { event.preventDefault(); goToPage(currentPage + 1); }
}

async function start() {
  const catalog = await fetch("data/publications.json").then((response) => response.json());
  const parameters = new URLSearchParams(location.search);
  const requestedId = parameters.get("id") || "call-of-zion";
  const requestedPage = Number.parseInt(parameters.get("page"), 10);
  publication = catalog.publications.find((item) => item.id === requestedId && item.viewerAvailable);
  if (!publication) throw new Error("Publication is not configured for this viewer.");
  document.title = `${publication.title} · Ronald D. Dennis Publications`;
  elements.title.textContent = publication.title;
  elements.author.textContent = [publication.author, publication.year].filter(Boolean).join(" · ");
  elements.searchSection.hidden = !publication.searchable;
  const suppliedSource = publication.suppliedPublicUrl || publication.publicSource;
  const readingCopyLabel = "Reading copy";
  elements.sourceNote.innerHTML = suppliedSource ? `${readingCopyLabel}. <a href="${escapeHtml(suppliedSource)}" target="_blank" rel="noopener">Original publication source</a>` : `${readingCopyLabel}.`;
  pdf = await pdfjsLib.getDocument({ url: publication.localDocument || publication.pdf, standardFontDataUrl: "assets/pdfjs/standard_fonts/" }).promise;
  elements.pageTotal.textContent = `of ${pdf.numPages}`;
  elements.pageNumber.max = pdf.numPages;
  currentPage = Number.isFinite(requestedPage) ? clamp(requestedPage, 1, pdf.numPages) : 1;
  const catalogPages = publication.pageCount || publication.catalogPageCount;
  if (catalogPages !== pdf.numPages) elements.loadStatus.textContent = `Catalog lists ${catalogPages} pages; PDF contains ${pdf.numPages}.`;
  await renderPage();
  showPageTurnHint();
}

elements.pageTurnHint.addEventListener("click", (event) => {
  const side = event.target.closest("[data-page-turn-hint-direction]");
  if (!side) return;
  const direction = side.dataset.pageTurnHintDirection;
  dismissPageTurnHint();
  if (direction === "previous" && currentPage > 1) goToPage(currentPage - 1);
  if (direction === "next" && currentPage < pdf.numPages) goToPage(currentPage + 1);
});

elements.previous.addEventListener("click", () => goToPage(currentPage - 1));
elements.next.addEventListener("click", () => goToPage(currentPage + 1));
elements.sidePrevious.addEventListener("click", () => goToPage(currentPage - 1));
elements.sideNext.addEventListener("click", () => goToPage(currentPage + 1));
elements.pageNumber.addEventListener("change", () => goToPage(elements.pageNumber.value));
elements.pageNumber.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); goToPage(elements.pageNumber.value); } });
elements.zoomOut.addEventListener("click", () => { fitMode = "custom"; zoom = clamp(zoom - .15, .35, 3.5); renderPage(); });
elements.zoomIn.addEventListener("click", () => { fitMode = "custom"; zoom = clamp(zoom + .15, .35, 3.5); renderPage(); });
elements.fitPage.addEventListener("click", () => { fitMode = "page"; renderPage(); });
elements.fitWidth.addEventListener("click", () => { fitMode = "width"; renderPage(); });
elements.searchForm.addEventListener("submit", searchBook);
elements.print.addEventListener("click", printPublication);
elements.canvas.addEventListener("touchstart", beginTouch, { passive: true });
elements.canvas.addEventListener("touchmove", trackTouch, { passive: true });
elements.canvas.addEventListener("touchend", endTouch, { passive: true });
elements.canvas.addEventListener("touchcancel", () => { touchStart = null; touchWasMulti = false; }, { passive: true });
elements.canvas.addEventListener("click", mobileClickZone);
elements.canvas.addEventListener("pointerdown", beginDesktopPageClick);
elements.canvas.addEventListener("pointerup", endDesktopPageClick);
elements.canvas.addEventListener("pointercancel", () => { desktopPointerStart = null; });
document.addEventListener("keydown", keyboardPageTurn);
let resizeTimer;
window.addEventListener("resize", () => {
  if (!desktopPageTurnHintsAvailable()) dismissPageTurnHint();
  else positionPageTurnHint();
  if (fitMode === "custom") return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(renderPage, 120);
});

start().catch((error) => { console.error(error); elements.loadStatus.hidden = false; elements.loadStatus.textContent = "This publication could not be loaded."; });
