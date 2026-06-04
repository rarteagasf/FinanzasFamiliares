export function parseNum(value) {
  if (value === '' || value === null || value === undefined) return 0;
  const str = String(value).replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

export function parseIntNum(value) {
  if (value === '' || value === null || value === undefined) return 0;
  const str = String(value).replace(',', '.');
  const num = parseInt(str, 10);
  return isNaN(num) ? 0 : num;
}

export function onNumKeyDown(e) {
  if ((e.key === 'Delete' && e.location === 3) || e.key === '.') {
    e.preventDefault();
    const input = e.target;
    if (input.value.includes('.') || input.value.includes(',')) return;
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    ).set;
    nativeSetter.call(input, input.value + ',');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
