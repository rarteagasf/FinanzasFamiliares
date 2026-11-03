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

export function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

export function formatCurrency(value) {
  const num = Number(value);
  if (isNaN(num)) return '0,00 €';
  // Formateo manual para garantizar separador de miles (.) y decimal (,) en español
  const fixed = Math.abs(num).toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = num < 0 ? '-' : '';
  return `${sign}${intFormatted},${decPart} €`;
}

export function formatNumber(value, options = {}) {
  const num = Number(value);
  if (isNaN(num)) return '0';
  return num.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2, ...options });
}

export function formatInputDecimal(value) {
  const num = Number(value);
  if (isNaN(num)) return '';
  return num.toFixed(2).replace('.', ',');
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

export function getLinkInfo(concepto) {
  if (!concepto) return { concept: '', loanId: null, cardId: null };
  const loanMatch = concepto.match(/\s*\[loan:([^\]]+)\]/);
  if (loanMatch) {
    return {
      concept: concepto.replace(/\s*\[loan:([^\]]+)\]/, '').trim(),
      loanId: loanMatch[1],
      cardId: null
    };
  }
  const cardMatch = concepto.match(/\s*\[card:([^\]]+)\]/);
  if (cardMatch) {
    return {
      concept: concepto.replace(/\s*\[card:([^\]]+)\]/, '').trim(),
      loanId: null,
      cardId: cardMatch[1]
    };
  }
  return { concept: concepto, loanId: null, cardId: null };
}

export function setLinkInfo(concept, loanId, cardId) {
  let clean = concept ? String(concept).replace(/\s*\[(loan|card):[^\]]+\]/g, '').trim() : '';
  if (loanId) {
    clean += ` [loan:${loanId}]`;
  } else if (cardId) {
    clean += ` [card:${cardId}]`;
  }
  return clean;
}

export function getCardEntity(card) {
  if (!card) return 'CAIXABANK';
  if (card.entidad) return card.entidad;
  const str = String(card.tarjeta || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (str.includes('ing')) return 'ING';
  if (str.includes('caixa') || str.includes('carrefour')) return 'CAIXABANK';
  return 'CAIXABANK';
}

export function getInputInfo(target) {
  if (!target || !(target instanceof HTMLInputElement)) return null;
  let label = '';
  const formGroup = target.closest('.form-group');
  if (formGroup) {
    label = formGroup.querySelector('label')?.textContent || '';
  } else {
    const td = target.closest('td');
    if (td) {
      const colIndex = td.cellIndex;
      const table = td.closest('table');
      const th = table?.querySelectorAll('thead th')?.[colIndex];
      if (th) {
        label = th.textContent || '';
      }
    }
  }
  if (!label) {
    label = target.placeholder || target.getAttribute('aria-label') || target.name || 'Campo numérico';
  }

  return {
    element: target,
    label: label.replace(/[*:]/g, '').trim(),
    value: target.value
  };
}

export function parseReminderForExpense(reminder, entities = [], loans = [], cards = []) {
  if (!reminder) {
    return {
      isFeasible: false,
      dia: new Date().getDate(),
      concepto: '',
      importe: '',
      entidad: entities?.[0]?.name || 'CAIXABANK',
      estado: 'X',
      loanId: '',
      cardId: ''
    };
  }

  const rawText = String(reminder.texto || '').trim();
  const normalizedText = rawText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Detectar cobros puros (salario, nómina, pensión, prestación, finiquito, devolución hacienda)
  const pureIncomeRegex = /^(?:cobrar|ingreso|cobro|recibir|ingresar)\s+(?:la\s+|el\s+)?(?:nomina|sueldo|pension|paro|prestacion|finiquito|devolucion\s+hacienda)\b/i;
  const isPureIncome = pureIncomeRegex.test(normalizedText);

  // Todo recordatorio pendiente que no sea cobro puro es trasladable a gasto
  const isFeasible = !reminder.completado && !isPureIncome;

  const expenseKeywordRegex = /(?:pagar|pago|abonar|comprar|compra|transferencia|recibo|factura|cuota|alquiler|seguro|impuesto|taller|revision|suscripcion|renovar|deuda|tarjeta|prestamo)/i;
  const incomeKeywordRegex = /(?:cobrar|cobro|ingresar|ingreso|recibir|percibir|sueldo|nomina)/i;

  const currencyRegex = /(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|\$|euros?\b)/gi;
  const prepositionAmountRegex = /(?:\b(?:por|de|importe:?|total:?|precio:?|cantidad:?)\s+)(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\b/gi;
  const decimalNumberRegex = /\b(\d+(?:[.,]\d{1,2}))\b/g;
  const generalNumberRegex = /\b(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\b/g;

  // Extracción inteligente de importe
  // Separamos en cláusulas (por puntos, comas, conectores condicionales)
  const clauses = rawText.split(/(?:[.;\n]+|\b(?:cuando|si no|luego|despues|después)\b)/i)
    .map(c => c.trim())
    .filter(Boolean);

  let bestAmount = '';
  let bestClauseForConcept = '';

  // 1. Buscar en cláusulas de gasto con símbolo monetario
  for (const clause of clauses) {
    const normClause = clause.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const isExpenseClause = expenseKeywordRegex.test(normClause);
    const isIncomeClause = incomeKeywordRegex.test(normClause);

    const matches = [...clause.matchAll(currencyRegex)];
    if (matches.length > 0) {
      const matchVal = matches[0][1];
      if (isExpenseClause && !isIncomeClause) {
        bestAmount = matchVal;
        bestClauseForConcept = clause;
        break;
      } else if (!isIncomeClause && !bestAmount) {
        bestAmount = matchVal;
        bestClauseForConcept = clause;
      }
    }
  }

  // 2. Si no se encontró en cláusula prioritaria, buscar cualquier importe con símbolo €/euros en el texto completo
  if (!bestAmount) {
    const allMatches = [...rawText.matchAll(currencyRegex)];
    if (allMatches.length > 0) {
      bestAmount = allMatches[allMatches.length - 1][1];
    }
  }

  // 3. Si no hay símbolo, buscar importe con preposición o indicador ("de 50", "por 120", "importe: 80")
  if (!bestAmount) {
    const prepMatches = [...rawText.matchAll(prepositionAmountRegex)];
    if (prepMatches.length > 0) {
      bestAmount = prepMatches[0][1];
    }
  }

  // 4. Si aún no hay importe, buscar números decimales
  if (!bestAmount) {
    const decMatches = [...rawText.matchAll(decimalNumberRegex)];
    if (decMatches.length > 0) {
      bestAmount = decMatches[0][1];
    }
  }

  // 5. Fallback a números enteros que no sean años de calendario (2020-2035)
  if (!bestAmount) {
    const allNums = [...rawText.matchAll(generalNumberRegex)];
    for (const match of allNums) {
      const val = parseInt(match[1], 10);
      if (!isNaN(val) && (val < 2020 || val > 2035)) {
        bestAmount = match[1];
        break;
      }
    }
  }

  // LIMPIEZA RIGUROSA DEL CONCEPTO (Garantizando ausencia total de importes)
  let conceptBase = bestClauseForConcept || rawText;

  // Cortar bifurcaciones o condiciones secundarias ("o llamar...", "si no...")
  conceptBase = conceptBase.split(/\b(?:o llamarlo|o llamar|si no he cobrado|si no cobro|cuando pueda)\b/i)[0].trim();

  // 1. Eliminar importes precedidos de preposiciones o frases indicadoras (ej: 'de 60,50€', 'por 45 euros', 'presupuesto de 350')
  conceptBase = conceptBase.replace(/\b(?:por\s+(?:un\s+)?importe(?:\s+de)?|por\s+valor(?:\s+de)?|por\s+la\s+cantidad(?:\s+de)?|presupuesto(?:\s+de)?|importe:?|total:?|precio:?|cantidad:?|por|de)\s*(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|\$|euros?\b)?/gi, ' ');

  // 2. Eliminar cualquier importe con símbolo monetario (€, $, euros)
  conceptBase = conceptBase.replace(/(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|\$|euros?\b)/gi, ' ');

  // 3. Eliminar de forma exacta bestAmount si aún quedara
  if (bestAmount) {
    const amountClean = bestAmount.trim();
    const dotVariant = amountClean.replace(',', '.');
    const commaVariant = amountClean.replace('.', ',');
    const escapeRegex = (s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const pattern = new RegExp(`\\b(?:${escapeRegex(dotVariant)}|${escapeRegex(commaVariant)})\\b`, 'gi');
    conceptBase = conceptBase.replace(pattern, ' ');
  }

  // 4. Eliminar símbolos monetarios sueltos
  conceptBase = conceptBase.replace(/(?:€|\$|\beuros?\b)/gi, ' ');

  // 5. Eliminar números decimales sueltos
  conceptBase = conceptBase.replace(/\b\d+[.,]\d{1,2}\b/g, ' ');

  // 6. Eliminar prefijos de recordatorio y muletillas
  conceptBase = conceptBase.replace(/^(?:recordatorio|recordar|nota):?\s*/i, '');
  conceptBase = conceptBase.replace(/^(?:tengo que|hay que|toca|debemos|debo|acordarse de|no olvidar)\s+/i, '');

  // 7. Eliminar verbos de acción y conectores para extraer el objeto/servicio limpio
  conceptBase = conceptBase.replace(/^(?:pagar|pago de|pago|abonar|abono de|liquidar|liquidación de|ingresar|hacer transferencia a|transferencia a|transferir a|transferir|comprar|compra de|pedir cita|pedir|solicitar)\s+(?:a|al|a la|el|la|los|las|un|una|unos|unas)?\s*/i, '');

  // 8. Eliminar preposiciones y artículos huérfanos al inicio o al final
  conceptBase = conceptBase.replace(/^(?:de|del|por|para|a|al)\s+/i, '');
  conceptBase = conceptBase.replace(/\s+(?:de|del|por|para|a|al|con|en)\s*$/i, '');

  // 9. Limpiar signos de puntuación huérfanos y espacios múltiples
  conceptBase = conceptBase.replace(/\(\s*\)/g, ' ');
  conceptBase = conceptBase.replace(/\[\s*\]/g, ' ');
  conceptBase = conceptBase.replace(/^[\s,.:;_\-–—/|\\]+|[\s,.:;_\-–—/|\\]+$/g, '');
  conceptBase = conceptBase.replace(/\s{2,}/g, ' ').trim();

  // 10. Garantía estricta: NUNCA dejar importes en el concepto ni retornar vacío
  if (!conceptBase || conceptBase.length < 2) {
    conceptBase = 'Gasto recordatorio';
  }

  // Capitalizar la primera letra
  const finalConcept = conceptBase.charAt(0).toUpperCase() + conceptBase.slice(1);

  // Determinar día del gasto
  let dia = new Date().getDate();
  if (reminder.fecha_limite) {
    const parts = reminder.fecha_limite.split('-');
    if (parts.length === 3) {
      const parsedDay = parseInt(parts[2], 10);
      if (!isNaN(parsedDay) && parsedDay >= 1 && parsedDay <= 31) {
        dia = parsedDay;
      }
    }
  }

  // Determinar entidad
  let matchedEntity = entities?.[0]?.name || 'CAIXABANK';
  if (normalizedText.includes('ing')) {
    matchedEntity = 'ING';
  } else if (normalizedText.includes('caixa')) {
    matchedEntity = 'CAIXABANK';
  } else {
    const foundEnt = entities.find(e => normalizedText.includes(e.name.toLowerCase()));
    if (foundEnt) matchedEntity = foundEnt.name;
  }

  // Determinar vinculación a préstamo o tarjeta
  let matchedLoanId = '';
  let matchedCardId = '';

  for (const loan of loans) {
    const loanName = loan.entidad.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (loanName && normalizedText.includes(loanName)) {
      matchedLoanId = loan.id;
      break;
    }
  }

  if (!matchedLoanId) {
    for (const card of cards) {
      const cardName = card.tarjeta.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (cardName && normalizedText.includes(cardName)) {
        matchedCardId = card.id;
        break;
      }
    }
  }

  return {
    isFeasible,
    dia,
    concepto: finalConcept,
    importe: bestAmount ? normalizeDecimalInput(bestAmount) : '',
    entidad: matchedEntity,
    estado: 'X',
    loanId: matchedLoanId,
    cardId: matchedCardId
  };
}

export function applyValueToInput(inputElement, value) {
  if (!inputElement || !document.body.contains(inputElement)) return false;

  const isTypeNumber = inputElement.type === 'number';
  const formattedValue = isTypeNumber ? String(value) : formatInputDecimal(value);

  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(inputElement, formattedValue);
  } else {
    inputElement.value = formattedValue;
  }

  inputElement.dispatchEvent(new Event('input', { bubbles: true }));
  inputElement.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}



