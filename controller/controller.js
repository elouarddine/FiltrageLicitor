// controller/controller.js

import { Model } from "../model/model.js";
import { View } from "../view/view.js";

export class Controller {
  constructor(model, view) {
    this.model = model;
    this.view = view;

    // Bindings
    this.handleSearch = this.handleSearch.bind(this);
    this.handleFilter = this.handleFilter.bind(this);
    this.handleRestart = this.handleRestart.bind(this);
  }

  init() {
    this.view.searchBtn.addEventListener("click", this.handleSearch);
    this.view.filterBtn.addEventListener("click", this.handleFilter);
    this.view.restartBtn.addEventListener("click", this.handleRestart);
  }

  async handleSearch() {
    const dateLimit = this.view.dateInput.value.trim();
    if (!dateLimit) {
      alert("Veuillez sélectionner une date limite valide.");
      return;
    }
    this.view.toggleLoader(true);
    try {
      const communes = await this.model.fetchCommunes(dateLimit);
      this.view.populateCommunes(communes);
      this.view.showCard(this.view.card2);
    } catch (error) {
      console.error("[Controller] Erreur lors de la recherche des communes :", error);
      alert("Une erreur est survenue lors de la recherche des communes.");
    } finally {
      this.view.toggleLoader(false);
    }
  }
  

  async handleFilter() {
    const maxPriceInput = this.view.priceInput.value.trim();
    const communeInput = this.view.communeInput.value.trim();
  
    // Convertir maxPrice en nombre si c'est spécifié
    const maxPrice = maxPriceInput ? parseInt(maxPriceInput, 10) : null;
  
    // Vérifier que maxPrice est valide si spécifié
    if (maxPriceInput && (isNaN(maxPrice) || maxPrice < 0)) {
      alert("Veuillez entrer un prix maximum valide.");
      return;
    }
  
    // Vérifier que la commune est spécifiée si nécessaire
    if (!maxPriceInput && !communeInput) {
      alert("Veuillez entrer au moins un critère de filtrage (prix maximum ou commune).");
      return;
    }
  
    // Activer le loader
    this.view.toggleLoader(true);
  
    try {
      // Appeler la méthode filterAnnonces avec les critères donnés
      const annonces = await this.model.filterAnnonces(maxPrice, communeInput);
  
      // Afficher les résultats dans la vue
      this.view.displayResults(annonces);
  
      // Passer à l'écran suivant
      this.view.showCard(this.view.card3);
    } catch (error) {
      console.error("[Controller] Erreur lors du filtrage des annonces :", error);
      alert("Une erreur est survenue lors du filtrage des annonces.");
    } finally {
      // Désactiver le loader
      this.view.toggleLoader(false);
    }
  }
  

  handleRestart() {
    this.view.resetFields();
    this.view.showCard(this.view.card1);
  }
}

// Initialisation de l'extension
document.addEventListener("DOMContentLoaded", () => {
  const model = new Model();
  const view = new View();
  const controller = new Controller(model, view);
  controller.init();
});
