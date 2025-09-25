// model/model.js

export class Model {
  
  constructor() {
    this.collectedUrls = []; // Stocker les URLs collectées
  }
  
  
  /**
   * Envoie un message au content script et retourne la réponse.
   * @param {string} action 
   * @param {Array<any>} args 
   * @returns {Promise<any>}
   */
  sendMessage(action, args = []) {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) return reject("Aucun onglet actif.");
        chrome.tabs.sendMessage(tabs[0].id, { action, args }, (response) => {
          if (chrome.runtime.lastError) return reject(chrome.runtime.lastError.message);
          resolve(response);
        });
      });
    });
  }

  /**
   * Collecte des communes en parcourant les pages jusqu'à la limite d'années.
   * @param {string} endDate 
   * @returns {Promise<Array<string>>}
   */
  async fetchCommunes(endDate) {
    const response = await this.sendMessage("collectCommunes", [endDate]);
    this.collectedUrls = response.urls; 
    return response.communes;
  }

 /**
   * Filtrage des annonces en fonction du prix et de la commune.
   * Les URLs collectées sont automatiquement utilisées.
   * @param {number} maxPrice
   * @param {string} commune
   * @returns {Promise<Array<{url: string, label: string}>>}
   */
 async filterAnnonces(maxPrice, commune) {
  if (!this.collectedUrls || this.collectedUrls.length === 0) {
    throw new Error("Aucune URL collectée pour effectuer le filtrage.");
  }

  const response = await this.sendMessage("filterAnnonces", [maxPrice, commune, this.collectedUrls]);
  return response.annonces;
}
}
