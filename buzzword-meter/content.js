const BUZZWORDS = [
  'thrive', 'impact', 'cross-functional', 'fast-paced', 'leverage', 'end-to-end',
  'ownership', 'passionate', 'ambiguity', 'innovative', 'world-class',
  'best-in-class', 'self-starter', 'north star', 'seamless', 'synergy'
];

function countBuzzwords(words) {
  const text = document.body.innerText.toLowerCase();
  let total = 0;
  for (const word of words) {
    total += text.split(word).length - 1;
  }
  return total;
}

function showBanner(score) {
  // Avoid inserting multiple banners if the script somehow runs more than once.
  const existing = document.getElementById('buzzword-banner');
  if (existing) {
    existing.remove();
  }

  const banner = document.createElement('div');
  banner.id = 'buzzword-banner';
  banner.textContent = `Buzzword score: ${score}`;
  document.body.prepend(banner);
}

showBanner(countBuzzwords(BUZZWORDS));
