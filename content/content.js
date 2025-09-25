console.log("[Content Script] Content script chargé.");

/**
 * Collecte toutes les communes et les détails de pagination.
 * @param {string} endDate - Date limite pour la collecte (format "YYYY-MM-DD").
 * @returns {Promise<{communesByUrl: Object, paginationByUrl: Object, allUniqueCommunes: Array<string>, allUrls: Array<string>}>}
 */
async function collectCommunesWithPagination(endDate) {
  console.log("[Content Script] Début de la collecte des communes avec endDate =", endDate);

  const communesByUrl = new Map();
  const paginationByUrl = new Map();
  const visitedUrls = new Set();
  const stack = [window.location.href];
  const allUniqueCommunes = new Set();

  const initialDate = new Date();
  const limitDate = new Date(endDate);

  const normalizeDay = (day) => day.replace("er", "");
  const convertMonthToNumber = (monthWord) => {
    const months = {
      janvier: "01", février: "02", mars: "03", avril: "04", mai: "05", juin: "06",
      juillet: "07", août: "08", septembre: "09", octobre: "10", novembre: "11", décembre: "12",
    };
    return months[monthWord.toLowerCase()] || "01";
  };

  const isDateValid = (year, month, day) => {
    const pageDate = new Date(`${year}-${month}-${day}`);
    return pageDate >= limitDate && pageDate <= initialDate;
  };

  while (stack.length > 0) {
    const batch = stack.splice(0, 5); // Traite les URLs par lot pour réduire les appels
    const promises = batch.map(async (url) => {
      if (visitedUrls.has(url)) return;
      visitedUrls.add(url);

      try {
        const response = await fetch(url);
        if (!response.ok) return;

        const html = await response.text();
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = html;

        // Collecte des liens historiques
        const historyLinks = Array.from(tempDiv.querySelectorAll("#traversing-hearings ul li a[href]"));
        for (const link of historyLinks) {
          const match = link.href.match(/\/(\w+)-(\d+(er)*)-(\w+)-(\d{4})\.html/);
          if (match) {
            const [_, dayOfWeek, rawDay, er, monthWord, year] = match;
            const day = normalizeDay(rawDay);
            const month = convertMonthToNumber(monthWord);

            if (isDateValid(year, month, day)) {
              const fullUrl = new URL(link.href, window.location.origin).href;
              if (!visitedUrls.has(fullUrl)) {
                stack.push(fullUrl);
              }
            }
          }
        }

        // Gestion de la pagination
        const pagination = tempDiv.querySelector("nav.Pagination");
        if (pagination) {
          const paginationLinks = Array.from(pagination.querySelectorAll("a.PageNav[href]"))
            .map((link) => new URL(link.href, window.location.origin).href)
            .filter((pageUrl) => !visitedUrls.has(pageUrl));

          paginationByUrl.set(url, paginationLinks.length);
          stack.push(...paginationLinks);
        } else {
          paginationByUrl.set(url, 1);
        }
      } catch (error) {
        console.error("[Content Script] Erreur lors de la collecte des URLs :", error);
      }
    });

    await Promise.all(promises); // Traite chaque lot simultanément
  }

  console.log("[Content Script] URLs collectées :", Array.from(visitedUrls));

  // Collecte des communes pour chaque URL
  const communePromises = Array.from(visitedUrls).map(async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) return;

      const html = await response.text();
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;

      const cityElements = tempDiv.querySelectorAll(".AdResults .City");
      const pageCommunes = Array.from(cityElements).map((cityElem) => cityElem.innerText.trim());

      pageCommunes.forEach((commune) => allUniqueCommunes.add(commune));
      communesByUrl.set(url, Array.from(new Set(pageCommunes)));
    } catch (error) {
      console.error("[Content Script] Erreur lors de la collecte des communes :", error);
    }
  });

  await Promise.all(communePromises);

  return {
    communesByUrl: Object.fromEntries(communesByUrl),
    paginationByUrl: Object.fromEntries(paginationByUrl),
    allUniqueCommunes: Array.from(allUniqueCommunes),
    allUrls: Array.from(visitedUrls),
  };
}

/**
 * Filtre les annonces en fonction du prix et de la commune sur toutes les URLs collectées.
 * @param {number} maxPrice - Prix maximum.
 * @param {string} commune - Commune cible.
 * @param {Array<string>} urls - URLs collectées pour le filtrage.
 * @returns {Promise<Array<{url: string, label: string}>>}
 */
async function filterAllAnnonces(maxPrice, commune, urls) {
  console.log("[Content Script] Début du filtrage des annonces avec maxPrice =", maxPrice, "et commune =", commune);
  const results = [];
  const seenUrls = new Set(); // Pour éliminer les doublons

  const promises = urls.map(async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) return;

      const html = await response.text();
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;

      // Filtrage des annonces
      tempDiv.querySelectorAll(".AdResults .Ad").forEach((ad) => {
        const cityElem = ad.querySelector(".City");
        const priceElem = ad.querySelector(".PriceNumber");
        const adUrl = ad.href.startsWith("/") ? `https://www.licitor.com${ad.href}` : ad.href;

        if (!cityElem || !priceElem) return;

        const city = cityElem.innerText.trim();
        const price = parseInt(priceElem.innerText.replace(/[^\d]/g, ""), 10);

        // Appliquer les critères de filtrage
        if ((commune && city.toLowerCase() !== commune.toLowerCase()) || (maxPrice && price > maxPrice)) return;

        // Ajouter au résultat uniquement si l'URL n'a pas été déjà vue
        if (!seenUrls.has(adUrl)) {
          seenUrls.add(adUrl);
          results.push({
            url: adUrl,
            label: `(${city}) - ${price.toLocaleString()} €`,
          });
        }
      });
    } catch (error) {
      console.error("[Content Script] Erreur lors du traitement de l'URL :", url, error);
    }
  });

  await Promise.all(promises);

  // Affichage ligne par ligne
  console.log("[Content Script] Annonces filtrées (uniques) :");
  results.forEach((result, index) => {
    console.log(`[${index + 1}] URL: ${result.url}, Label: ${result.label}`);
  });

  return results;
}



// Gestion des messages pour le content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Content Script] Message reçu :", message);

  if (message.action === "collectCommunes") {
    collectCommunesWithPagination(message.args[0])
      .then((result) => sendResponse({ communes: result.allUniqueCommunes, urls: result.allUrls }))
      .catch((error) => {
        console.error("[Content Script] Erreur dans collectCommunes :", error);
        sendResponse({ communes: [], urls: [] });
      });
    return true;
  }

  if (message.action === "filterAnnonces") {
    const [maxPrice, commune, urls] = message.args;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      console.error("[Content Script] Les URLs fournies sont invalides ou vides.");
      sendResponse({ annonces: [] });
      return true;
    }

    filterAllAnnonces(maxPrice, commune, urls)
      .then((annonces) => sendResponse({ annonces }))
      .catch((error) => {
        console.error("[Content Script] Erreur dans filterAnnonces :", error);
        sendResponse({ annonces: [] });
      });

    return true;
  }
});
