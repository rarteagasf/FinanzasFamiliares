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

export function normalizeDecimalInput(value) {
  let str = String(value);
  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '');
  } else {
    str = str.replace(/\./g, ',');
  }
  const cleaned = str.match(/^-?[0-9,]*/)?.[0] || '';
  const idx = cleaned.indexOf(',');
  if (idx !== -1) {
    return cleaned.substring(0, idx + 1) + cleaned.substring(idx + 1).replace(/,/g, '');
  }
  return cleaned;
}

export function onNumKeyDown(e) {
  if ((e.key === 'Delete' && e.location === 3) || e.key === '.') {
    e.preventDefault();
    const input = e.target;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    input.setRangeText(',', start, end, 'end');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
