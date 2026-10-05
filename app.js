const searchInput = document.getElementById("searchInput");
const resultsBody = document.getElementById("resultsBody");
const summaryDiv = document.getElementById("summary");

// Фейковые данные аукциона (на реальном API заменить fetch)
let auctionData = [];

async function loadAuctionData() {
  try {
    const response = await fetch('/auction/lots');
    if (!response.ok) throw new Error('Ошибка получения данных');
    auctionData = await response.json();
    renderResults(auctionData);
  } catch (err) {
    console.error("Ошибка загрузки данных аукциона:", err);
    summaryDiv.innerHTML = `<div>Не удалось получить данные аукциона. Попробуйте позже.</div>`;
  }
}

function renderResults(results) {
  resultsBody.innerHTML = "";
  summaryDiv.innerHTML = "";

  if (results.length === 0) {
    resultsBody.innerHTML = "<tr><td colspan='5'>Ничего не найдено</td></tr>";
    return;
  }

  let totalQuantity = 0;
  let minPricePerUnit = Infinity;

  results.forEach((item, index) => {
    const unitPrice = item.total_price / item.quantity;
    if (unitPrice < minPricePerUnit) minPricePerUnit = unitPrice;
    totalQuantity += item.quantity;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.quantity} шт</td>
      <td>${item.total_price.toLocaleString('ru-RU')} ₽</td>
      <td class="price-per-unit">${unitPrice.toFixed(0)} ₽ / шт</td>
      <td>${item.seller}</td>
    `;
    resultsBody.appendChild(row);
  });

  summaryDiv.innerHTML = `
    <div>Самая низкая цена: ${minPricePerUnit.toFixed(0)} ₽ / шт</div>
    <div>Всего товара: ${totalQuantity} шт</div>
    <div>Обновлено: только что</div>
  `;
}

searchInput.addEventListener("input", async (e) => {
  const query = e.target.value.trim();
  let results = auctionData;

  if (query) {
    results = auctionData.filter(item =>
      item.name.toLowerCase().includes(query)
    );
  }

  renderResults(results);
});

window.onload = () => {
  loadAuctionData();
};
