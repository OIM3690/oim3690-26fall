async function showTowns() {
  const output = document.getElementById('output');
  output.textContent = 'Loading...';

  try {
    const response = await fetch('https://oim.zhili.dev/mass');
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const data = await response.json();
    const heading = document.createElement('h2');
    heading.textContent = data.name;

    const governor = document.createElement('p');
    governor.textContent = `Governor: ${data.governor}`;

    const towns = document.createElement('ul');
    for (const town of data.data) {
      const item = document.createElement('li');
      item.textContent = `${town.name}: pop ${town.population}`;
      towns.append(item);
    }

    output.replaceChildren(heading, governor, towns);
  } catch (error) {
    output.textContent = `Could not load Massachusetts data: ${error.message}`;
  }
}