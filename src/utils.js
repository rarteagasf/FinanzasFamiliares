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

  const expenseKeywordRegex = /(?:pagar|pago|abonar|comprar|compra|transferencia|recibo|factura|cuota|alquiler|seguro|impuesto|taller|revision|suscripcion|renovar|deuda|tarjeta|prestamo)/i;
  const incomeKeywordRegex = /(?:cobrar|cobro|ingresar|ingreso|recibir|percibir|sueldo|nomina)/i;
  const currencyRegex = /(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|euros?)\b/gi;
  const generalNumberRegex = /\b(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\b/g;

  const hasCurrency = /(?:\d|\b)\s*(?:€|euros?)\b/i.test(rawText);
  const hasExpenseKeywords = expenseKeywordRegex.test(normalizedText);

  // Un recordatorio es factible si está pendiente y contiene un importe monetario o palabras clave de gasto
  const isFeasible = !reminder.completado && (hasCurrency || hasExpenseKeywords);

  // Extracción inteligente de importe
  // Separamos en cláusulas (por puntos, comas, conectores condicionales)
  const clauses = rawText.split(/(?:[.;\n]+|\b(?:cuando|si no|luego|despues|después)\b)/i)
    .map(c => c.trim())
    .filter(Boolean);

  let bestAmount = '';
  let bestClauseForConcept = '';

  for (const clause of clauses) {
    const normClause = clause.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const isExpenseClause = expenseKeywordRegex.test(normClause);
    const isIncomeClause = incomeKeywordRegex.test(normClause);

    // Buscar importes en la cláusula
    const matches = [...clause.matchAll(currencyRegex)];
    if (matches.length > 0) {
      const matchVal = matches[0][1];
      if (isExpenseClause && !isIncomeClause) {
        bestAmount = matchVal;
        bestClauseForConcept = clause;
        break; // Prioridad máxima encontrada
      } else if (!isIncomeClause && !bestAmount) {
        bestAmount = matchVal;
        bestClauseForConcept = clause;
      }
    }
  }

  // Fallback si no se encontró con símbolo € pero hay cláusula de gasto con número
  if (!bestAmount) {
    for (const clause of clauses) {
      const normClause = clause.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (expenseKeywordRegex.test(normClause)) {
        const numMatches = [...clause.matchAll(generalNumberRegex)];
        if (numMatches.length > 0) {
          bestAmount = numMatches[0][1];
          bestClauseForConcept = clause;
          break;
        }
      }
    }
  }

  // Fallback general al primer importe con €
  if (!bestAmount) {
    const allMatches = [...rawText.matchAll(currencyRegex)];
    if (allMatches.length > 0) {
      bestAmount = allMatches[allMatches.length - 1][1]; // Solemos poner el pago al final
    }
  }

  // Limpieza del concepto
  let conceptBase = bestClauseForConcept || rawText;

  // Si hay conector de bifurcación "o llamarlo..." o "si no..." lo cortamos
  conceptBase = conceptBase.split(/\b(?:o llamarlo|o llamar|si no he cobrado|si no cobro)\b/i)[0].trim();

  // Eliminar importes y símbolos monetarios del concepto
  conceptBase = conceptBase.replace(/(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|euros?)\b/gi, '').trim();

  // Limpiar muletillas introductorias habituales
  conceptBase = conceptBase.replace(/^(?:tengo que|hay que|recordar|hacer|toca|debemos|debo)\s+/i, '');
  conceptBase = conceptBase.replace(/^(?:pagar|hacer transferencia a|transferencia a|abonar|comprar|ingresar)\s+(?:a|al|a la|el|la|los|las)?\s*/i, '');
  conceptBase = conceptBase.replace(/^(?:a|al|a la|el|la)\s+/i, '');
  conceptBase = conceptBase.trim();

  // Si quedó muy vacío o es confuso, usar una versión amigable
  if (!conceptBase || conceptBase.length < 3) {
    conceptBase = rawText.slice(0, 50).trim();
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



