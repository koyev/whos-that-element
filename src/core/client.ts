export function getClientModule(options: {
  triggerKey: string;
  endpoint: string;
}): string {
  const key = JSON.stringify(options.triggerKey);
  const endpoint = JSON.stringify(options.endpoint);
  return `
const KEY = ${key};
const ENDPOINT = ${endpoint};
let hovered = null;
let on = false;
document.addEventListener('keydown', (e) => { if (e.key === KEY) on = true; });
document.addEventListener('keyup', (e) => {
  if (e.key === KEY) { on = false; if (hovered) { hovered.style.outline = ''; hovered = null; } }
});
document.addEventListener('mouseover', (e) => {
  if (!on) return;
  let el = e.target;
  while (el && !el.dataset.wtc) el = el.parentElement;
  if (el && el !== hovered) {
    if (hovered) hovered.style.outline = '';
    hovered = el;
    el.style.outline = '2px solid #4af';
  }
});
document.addEventListener('click', (e) => {
  if (!on || !hovered) return;
  e.preventDefault();
  e.stopPropagation();
  const parts = hovered.dataset.wtc.split(':');
  const col = parts.pop();
  const line = parts.pop();
  const file = parts.join(':');
  fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file, line, col }) });
}, true);
`.trim();
}
