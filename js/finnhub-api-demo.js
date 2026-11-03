async function getQuote() {
  const symbolInput = document.getElementById('symbol');
  const output = document.getElementById('output');

  const symbol = symbolInput.value.trim().toUpperCase();
  if (!symbol) {
    output.textContent = 'Please enter a stock symbol.';
    return;
  }

  output.textContent = 'Loading...';

  try {
    const url = `/api/quote?symbol=${encodeURIComponent(symbol)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const data = await response.json();

    // Finnhub returns all zeros when the symbol is unknown.
    if (data.c === 0 && data.h === 0 && data.l === 0) {
      output.textContent = `No data found for symbol "${symbol}".`;
      return;
    }

    const change = data.d;
    const changePercent = data.dp;
    const changeSign = change >= 0 ? '+' : '';

    const heading = document.createElement('h2');
    heading.textContent = symbol;

    const price = document.createElement('p');
    price.textContent = `Current price: $${data.c.toFixed(2)}`;

    const changeEl = document.createElement('p');
    changeEl.textContent = `Change: ${changeSign}${change.toFixed(2)} (${changeSign}${changePercent.toFixed(2)}%)`;

    const details = document.createElement('ul');
    const rows = [
      ['Open', data.o],
      ['High', data.h],
      ['Low', data.l],
      ['Previous close', data.pc],
    ];
    for (const [label, value] of rows) {
      const item = document.createElement('li');
      item.textContent = `${label}: $${value.toFixed(2)}`;
      details.append(item);
    }

    output.replaceChildren(heading, price, changeEl, details);
  } catch (error) {
    output.textContent = `Could not load stock data: ${error.message}`;
  }
}
