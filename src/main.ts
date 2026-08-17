interface Drink {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  updated_at: string;
}

const form = document.querySelector<HTMLFormElement>('#add-form')!;
const nameInput = document.querySelector<HTMLInputElement>('#add-name')!;
const unitInput = document.querySelector<HTMLInputElement>('#add-unit')!;
const quantityInput = document.querySelector<HTMLInputElement>('#add-quantity')!;
const errorEl = document.querySelector<HTMLParagraphElement>('#error')!;
const emptyEl = document.querySelector<HTMLParagraphElement>('#empty')!;
const table = document.querySelector<HTMLTableElement>('#drinks-table')!;
const tbody = document.querySelector<HTMLTableSectionElement>('#drinks-body')!;

function showError(message: string) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearError() {
  errorEl.hidden = true;
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { 'content-type': 'application/json', ...options.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function renderDrinks(drinks: Drink[]) {
  tbody.innerHTML = '';

  if (drinks.length === 0) {
    table.hidden = true;
    emptyEl.hidden = false;
    return;
  }

  emptyEl.hidden = true;
  table.hidden = false;

  for (const drink of drinks) {
    const tr = document.createElement('tr');

    const nameTd = document.createElement('td');
    nameTd.textContent = drink.name;

    const unitTd = document.createElement('td');
    unitTd.textContent = drink.unit;

    const qtyTd = document.createElement('td');
    const controls = document.createElement('div');
    controls.className = 'qty-controls';

    const minusBtn = document.createElement('button');
    minusBtn.type = 'button';
    minusBtn.textContent = '−';
    minusBtn.disabled = drink.quantity <= 0;
    minusBtn.addEventListener('click', () => adjustQuantity(drink, -1));

    const qtyValue = document.createElement('span');
    qtyValue.className = 'qty-value';
    qtyValue.textContent = String(drink.quantity);

    const plusBtn = document.createElement('button');
    plusBtn.type = 'button';
    plusBtn.textContent = '+';
    plusBtn.addEventListener('click', () => adjustQuantity(drink, 1));

    controls.append(minusBtn, qtyValue, plusBtn);
    qtyTd.appendChild(controls);

    const actionsTd = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'row-delete';
    deleteBtn.textContent = 'Remove';
    deleteBtn.addEventListener('click', () => deleteDrink(drink));
    actionsTd.appendChild(deleteBtn);

    tr.append(nameTd, unitTd, qtyTd, actionsTd);
    tbody.appendChild(tr);
  }
}

async function loadDrinks() {
  try {
    const drinks = await api<Drink[]>('/api/drinks');
    clearError();
    renderDrinks(drinks);
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Failed to load drinks');
  }
}

async function adjustQuantity(drink: Drink, delta: number) {
  const quantity = Math.max(0, drink.quantity + delta);
  try {
    await api(`/api/drinks/${drink.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
    clearError();
    await loadDrinks();
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Failed to update quantity');
  }
}

async function deleteDrink(drink: Drink) {
  try {
    await api(`/api/drinks/${drink.id}`, { method: 'DELETE' });
    clearError();
    await loadDrinks();
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Failed to remove drink');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const unit = unitInput.value.trim();
  const quantity = Number(quantityInput.value);

  if (!name || !unit || !Number.isFinite(quantity) || quantity < 0) {
    showError('Enter a name, unit, and non-negative quantity.');
    return;
  }

  try {
    await api('/api/drinks', {
      method: 'POST',
      body: JSON.stringify({ name, unit, quantity }),
    });
    clearError();
    form.reset();
    nameInput.focus();
    await loadDrinks();
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Failed to add drink');
  }
});

loadDrinks();
