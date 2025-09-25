export class View {
  constructor() {
    this.searchBtn = document.getElementById("searchBtn");
    this.filterBtn = document.getElementById("filterBtn");
    this.restartBtn = document.getElementById("restartBtn");
    this.dateInput = document.getElementById("dateLimit"); 
    this.priceInput = document.getElementById("priceInput");
    this.communeInput = document.getElementById("communeInput");
    this.communeList = document.getElementById("communeList");
    this.resultsDiv = document.getElementById("results");
    this.loader = document.getElementById("loader");
    this.card1 = document.getElementById("card-1");
    this.card2 = document.getElementById("card-2");
    this.card3 = document.getElementById("card-3");
    this.resultCount = document.getElementById("result-count"); // Ajouter la référence
  }

  toggleLoader(show) {
    this.loader.style.display = show ? "block" : "none";
  }

  populateCommunes(communes) {
    this.communeList.innerHTML = "";
    communes.forEach((commune) => {
      const option = document.createElement("option");
      option.value = commune;
      this.communeList.appendChild(option);
    });
  }

  displayResults(annonces) {
    const resultsDiv = this.resultsDiv;
    resultsDiv.innerHTML = "<h2>Résultats :</h2>";

    if (!annonces.length) {
      this.resultCount.textContent = "Nombre d'annonces trouvées : 0";
      resultsDiv.innerHTML += "<p>Aucun résultat trouvé.</p>";
      return;
    }

    // Mettre à jour le nombre d'annonces trouvées
    this.resultCount.textContent = `Nombre d'annonces trouvées : ${annonces.length}`;

    annonces.forEach(({ url, label }) => {
      const link = document.createElement("a");
      link.href = url;
      link.textContent = label;
      link.target = "_blank";
      resultsDiv.appendChild(link);
    });
  }

  showCard(card) {
    // Masquer toutes les cartes
    [this.card1, this.card2, this.card3].forEach(c => c.classList.remove("active"));
    // Afficher la carte souhaitée
    card.classList.add("active");
  }

  resetFields() {
    this.dateInput.value = "";
    this.priceInput.value = "";
    this.communeInput.value = "";
    this.communeList.innerHTML = "";
    this.resultsDiv.innerHTML = "";
    this.resultCount.textContent = "Nombre d'annonces trouvées : 0"; // Réinitialiser
  }
}
