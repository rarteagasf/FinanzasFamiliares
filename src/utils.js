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
