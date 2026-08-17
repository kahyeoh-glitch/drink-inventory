interface DrinkSale {
  code: string;
  name: string;
  quantity: number;
}

interface Meta {
  min_date: string;
  max_date: string;
  drink_count: number;
}

const dateInput = document.querySelector<HTMLInputElement>('#sale-date')!;
const totalSummary = document.querySelector<HTMLSpanElement>('#total-summary')!;
const errorEl = document.querySelector<HTMLParagraphElement>('#error')!;
const rangeNote = document.querySelector<HTMLParagraphElement>('#range-note')!;
const table = document.querySelector<HTMLTableElement>('#drinks-table')!;
const tbody = document.querySelector<HTMLTableSectionElement>('#drinks-body')!;

function showError(message: string) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearError() {
  errorEl.hidden = true;
}

async function api<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

function renderSales(sales: DrinkSale[]) {
  tbody.innerHTML = '';
  table.hidden = false;

  let total = 0;
  for (const sale of sales) {
    total += sale.quantity;
    const tr = document.createElement('tr');

    const nameTd = document.createElement('td');
    nameTd.textContent = sale.name;

    const qtyTd = document.createElement('td');
    qtyTd.textContent = String(sale.quantity);
    if (sale.quantity === 0) qtyTd.className = 'qty-zero';

    tr.append(nameTd, qtyTd);
    tbody.appendChild(tr);
  }

  totalSummary.textContent = `${total} bottles sold`;
}

async function loadSalesForDate(date: string) {
  try {
    const sales = await api<DrinkSale[]>(`/api/sales?date=${encodeURIComponent(date)}`);
    clearError();
    renderSales(sales);
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Failed to load sales');
  }
}

async function init() {
  try {
    const meta = await api<Meta>('/api/meta');
    dateInput.min = meta.min_date;
    dateInput.max = meta.max_date;
    dateInput.value = meta.max_date;
    rangeNote.textContent = `Showing historical Grain sales data from ${meta.min_date} to ${meta.max_date} (${meta.drink_count} bottled drinks tracked).`;
    rangeNote.hidden = false;
    await loadSalesForDate(meta.max_date);
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Failed to load data');
  }
}

dateInput.addEventListener('change', () => {
  if (dateInput.value) loadSalesForDate(dateInput.value);
});

init();
