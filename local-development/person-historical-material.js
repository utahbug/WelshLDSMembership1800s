(() => {
  let relationshipPromise;
  const loadRelationships = () => relationshipPromise ||= fetch("data/person-publication-links.json")
    .then((response) => {
      if (!response.ok) throw new Error(`Person/publication relationships returned ${response.status}`);
      return response.json();
    })
    .then((data) => Array.isArray(data.relationships) ? data.relationships : []);
  const normalized = (value) => String(value || "").trim().toLocaleLowerCase("en");
  const textAfterLabel = (root, label) => {
    const fact = [...root.querySelectorAll(".people-fact")].find((item) => normalized(item.querySelector("strong")?.textContent) === `${normalized(label)}:`);
    return fact ? fact.textContent.replace(/^.*?:\s*/, "").trim() : "";
  };
  const relationForCard = (relations, card) => relations.find((relation) => {
    const match = relation.personMatch || {};
    return normalized(card.querySelector("h2")?.textContent) === normalized(match.nameAsWritten)
      && normalized(textAfterLabel(card, "Branch")) === normalized(match.branch)
      && (!match.entryNumber || normalized(textAfterLabel(card, "Entry")) === normalized(match.entryNumber));
  });
  const relationForRecord = (relations, record) => relations.find((relation) => {
    const match = relation.personMatch || {};
    return normalized(record.nameAsWritten) === normalized(match.nameAsWritten)
      && normalized(record.branch) === normalized(match.branch)
      && normalized(record.collectionId) === normalized(match.collectionId)
      && normalized(record.entryNumber) === normalized(match.entryNumber);
  });
  const section = (relation) => {
    const aside = document.createElement("section");
    aside.className = "person-related-historical-material";
    aside.setAttribute("aria-labelledby", `related-historical-${relation.id}`);
    aside.innerHTML = `<h3 id="related-historical-${relation.id}">${relation.heading}</h3><p><strong>${relation.reference}</strong></p><p>${relation.researchNote}</p><p class="person-related-evidence">${relation.evidenceNote}</p><p><a class="people-source-link" href="${relation.viewerUrl}">View publication<span class="people-source-link-icon" aria-hidden="true"></span></a></p>`;
    return aside;
  };
  window.WELSH_PERSON_HISTORICAL_MATERIAL = {
    async appendForRecord(container, record) {
      if (!container || container.querySelector(".person-related-historical-material")) return;
      const relation = relationForRecord(await loadRelationships(), record);
      if (relation) container.append(section(relation));
    },
  };
  async function enhanceCards(root = document) {
    const relations = await loadRelationships();
    root.querySelectorAll(".people-result").forEach((card) => {
      if (card.querySelector(".person-related-historical-material")) return;
      const relation = relationForCard(relations, card);
      if (relation) card.append(section(relation));
    });
    const branch = document.querySelector("#branchTitle")?.textContent?.trim();
    root.querySelectorAll(".branch-member-record").forEach((member) => {
      const details = member.querySelector(".branch-member-record-details");
      if (!details || details.querySelector(".person-related-historical-material")) return;
      const relation = relations.find((candidate) => normalized(candidate.personMatch?.nameAsWritten) === normalized(member.querySelector("summary")?.textContent)
        && normalized(candidate.personMatch?.branch) === normalized(branch));
      if (relation) details.append(section(relation));
    });
  }
  enhanceCards().catch(console.error);
  new MutationObserver((changes) => {
    if (changes.some((change) => change.addedNodes.length)) enhanceCards().catch(console.error);
  }).observe(document.body, { childList: true, subtree: true });
})();
