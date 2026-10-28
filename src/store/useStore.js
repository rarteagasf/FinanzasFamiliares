import { create } from 'zustand';
import { createClient } from '@supabase/supabase-js';
import { getLinkInfo, getInputInfo, getCardEntity } from '../utils';

const normalizeString = (str) => {
  if (!str) return '';
  return str.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

export const isLoanMatching = (concept, loanId, loan) => {
  if (loanId) return loanId === loan.id;
  const cleanConcept = normalizeString(concept);
  const cleanEntidad = normalizeString(loan.entidad);
  if (!cleanConcept || !cleanEntidad) return false;
  return cleanConcept === cleanEntidad || 
    (cleanConcept.includes('prestamo') && cleanConcept.includes(cleanEntidad));
};

export const isCardMatching = (concept, cardId, card) => {
  if (cardId) return cardId === card.id;
  const cleanConcept = normalizeString(concept);
  const cleanTarjeta = normalizeString(card.tarjeta);
  if (!cleanConcept || !cleanTarjeta) return false;

  if (cleanConcept === cleanTarjeta || cleanConcept.includes(cleanTarjeta) || cleanTarjeta.includes(cleanConcept)) {
    return true;
  }

  // Fallbacks para denominaciones habituales
  if (cleanConcept.includes('visa classic') && cleanTarjeta.includes('visa caixabank')) return true;
  if (cleanConcept.includes('caixabank paym') && cleanTarjeta.includes('visa caixabank')) return true;
  if (cleanConcept.includes('mastercard ing') && cleanTarjeta.includes('visa ing')) return true;

  return false;
};

const isEntityMatch = (expenseEntity, targetEntity) => {
  if (!targetEntity || targetEntity === 'ALL') return true;
  if (!expenseEntity) return false;
  return expenseEntity.trim().toLowerCase() === targetEntity.trim().toLowerCase();
};

const getBalanceAccountsForEntity = (entityName) => {
  if (!entityName || entityName === 'ALL') return ['caixabank', 'hucha', 'ing_nomina', 'ing_naranja'];
  const norm = entityName.trim().toUpperCase();
  if (norm.includes('ING')) return ['ing_nomina', 'ing_naranja'];
  if (norm.includes('CAIXA')) return ['caixabank'];
  return ['caixabank', 'hucha', 'ing_nomina', 'ing_naranja'];
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const familyToken = import.meta.env.VITE_FAMILY_TOKEN;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-family-token': familyToken || '',
    },
  },
});

import initialData from '../data/initialData.json';

const STORAGE_KEY = 'finanzas_cache_v1';

const getInitialCache = () => {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && Array.isArray(parsed.months) && parsed.months.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error al leer caché local:', e);
  }
  return initialData;
};

const saveStoreToCache = (state) => {
  try {
    const current = getInitialCache();
    const activeId = state.selectedMonthId;
    let updatedExpenses = current.expenses ? [...current.expenses] : [];
    if (activeId && state.expenses) {
      updatedExpenses = updatedExpenses.filter(e => e.month_id !== activeId).concat(state.expenses);
    }
    if (state.prevPendingExpenses && state.prevPendingExpenses.length > 0) {
      state.prevPendingExpenses.forEach(p => {
        const idx = updatedExpenses.findIndex(e => e.id === p.id);
        if (idx !== -1) {
          const { isFromPreviousMonth, originalMonthName, ...cleanP } = p;
          updatedExpenses[idx] = cleanP;
        }
      });
    }
    let updatedBalances = current.balances ? [...current.balances] : [];
    if (activeId && state.balances) {
      updatedBalances = updatedBalances.filter(b => b.month_id !== activeId).concat({ ...state.balances, month_id: activeId });
    }
    const newCache = {
      ...current,
      months: state.months?.length ? state.months : current.months,
      entities: state.entities?.length ? state.entities : current.entities,
      loans: state.loans?.length ? state.loans : current.loans,
      cards: state.cards?.length ? state.cards : current.cards,
      reminders: state.reminders?.length ? state.reminders : current.reminders,
      expenses: updatedExpenses,
      balances: updatedBalances
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newCache));
  } catch (e) {
    console.warn('Error al guardar en caché local:', e);
  }
};

const defaultSeed = getInitialCache();
const defaultActiveMonth = defaultSeed.months?.find(m => m.status === 'open') || defaultSeed.months?.[0];
const defaultExpenses = defaultSeed.expenses?.filter(e => e.month_id === defaultActiveMonth?.id) || [];
const defaultBalance = defaultSeed.balances?.find(b => b.month_id === defaultActiveMonth?.id) || {
  caixabank: 0,
  hucha: 0,
  ing_nomina: 0,
  ing_naranja: 0
};

// Calculate initial previous pending expenses for the active month
const initialSortedMonths = [...(defaultSeed.months || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
const initialCurIdx = initialSortedMonths.findIndex(m => m.id === defaultActiveMonth?.id);
let initialPrevPending = [];
if (initialCurIdx > 0) {
  const prevM = initialSortedMonths[initialCurIdx - 1];
  initialPrevPending = (defaultSeed.expenses || [])
    .filter(e => e.month_id === prevM.id && e.estado === 'X')
    .map(e => ({ ...e, isFromPreviousMonth: true, originalMonthName: prevM.name }));
}

export const useStore = create((set, get) => ({
  months: defaultSeed.months || [],
  selectedMonthId: defaultActiveMonth?.id || null,
  
  entities: defaultSeed.entities || [],
  expenses: defaultExpenses,
  prevPendingExpenses: initialPrevPending,
  loans: defaultSeed.loans || [],
  cards: defaultSeed.cards || [],
  balances: defaultBalance,
  reminders: defaultSeed.reminders || [],
  
  loading: false,
  isOffline: false,

  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
  targetCardId: null,
  targetCardTimestamp: 0,
  navigateToCard: (cardId) => set({ activeTab: 'planning', targetCardId: cardId, targetCardTimestamp: Date.now() }),
  clearTargetCard: () => set({ targetCardId: null }),

  // Calculator global state & actions
  isCalculatorOpen: false,
  activeInputInfo: null,
  openCalculator: (targetElementOrInfo = null) => {
    let inputInfo = null;
    if (targetElementOrInfo) {
      if (targetElementOrInfo instanceof HTMLElement) {
        inputInfo = getInputInfo(targetElementOrInfo);
      } else if (typeof targetElementOrInfo === 'object') {
        inputInfo = targetElementOrInfo;
      }
    } else {
      const activeEl = document.activeElement;
      if (
        activeEl instanceof HTMLInputElement &&
        !activeEl.closest('.calculator-modal-content') &&
        (activeEl.type === 'number' || activeEl.type === 'text' || activeEl.inputMode === 'decimal')
      ) {
        inputInfo = getInputInfo(activeEl);
      } else {
        const prev = get().activeInputInfo;
        if (prev?.element && document.body.contains(prev.element)) {
          inputInfo = prev;
        }
      }
    }
    set({
      isCalculatorOpen: true,
      activeInputInfo: inputInfo || null
    });
  },
  closeCalculator: () => set({ isCalculatorOpen: false }),
  setActiveInputInfo: (info) => set({ activeInputInfo: info }),

  // Load Initial Data
  fetchInitialData: async () => {
    set({ loading: true });
    try {
      // Fetch months & entities
      const { data: monthsData, error: monthsError } = await supabase.from('months').select('*').order('created_at', { ascending: false });
      const { data: entitiesData, error: entitiesError } = await supabase.from('entities').select('*');
      
      if (monthsError || !monthsData || monthsData.length === 0) {
        console.warn('Supabase no devolvió meses (posible fallo de conexión o 401). Manteniendo datos locales.');
        set({ loading: false, isOffline: true });
        return;
      }

      const activeMonth = monthsData?.find(m => m.status === 'open') || monthsData?.[0];
      
      // Fetch global data
      const { data: loansData } = await supabase.from('loans').select('*');
      const { data: cardsData } = await supabase.from('cards').select('*');
      const { data: remindersData } = await supabase.from('reminders').select('*').order('created_at', { ascending: false });

      set({ 
        months: monthsData || [], 
        entities: entitiesData || [],
        selectedMonthId: activeMonth?.id || null,
        loans: loansData || [],
        cards: cardsData || [],
        reminders: remindersData || [],
        isOffline: false
      });

      if (activeMonth) {
        await get().fetchMonthData(activeMonth.id);
      }

      // Update local storage cache in the background
      try {
        const fullExport = await get().exportAllData();
        if (fullExport.months?.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(fullExport));
        }
      } catch (cacheErr) {
        console.warn('Error al guardar en caché local:', cacheErr);
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
      set({ isOffline: true });
    } finally {
      set({ loading: false });
    }
  },

  // Fetch Data for specific month
  fetchMonthData: async (monthId) => {
    set({ loading: true, selectedMonthId: monthId });
    
    try {
      const { data: expensesData, error: expError } = await supabase.from('expenses').select('*').eq('month_id', monthId);
      const { data: balancesData, error: balError } = await supabase.from('balances').select('*').eq('month_id', monthId).single();
      
      if (expError || !expensesData) {
        console.warn('Supabase no devolvió gastos para el mes', monthId, '(error o sin conexión). Usando datos en caché.');
        const cache = getInitialCache();
        const cachedExp = cache.expenses?.filter(e => e.month_id === monthId) || [];
        const cachedBal = cache.balances?.find(b => b.month_id === monthId) || { caixabank: 0, hucha: 0, ing_nomina: 0, ing_naranja: 0 };
        
        const sorted = [...(cache.months || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const currentIndex = sorted.findIndex(m => m.id === monthId);
        let prevExpensesData = [];
        if (currentIndex > 0) {
          const prevMonth = sorted[currentIndex - 1];
          prevExpensesData = (cache.expenses || [])
            .filter(e => e.month_id === prevMonth.id && e.estado === 'X')
            .map(e => ({ ...e, isFromPreviousMonth: true, originalMonthName: prevMonth.name }));
        }

        set({ 
          expenses: cachedExp,
          prevPendingExpenses: prevExpensesData,
          balances: cachedBal,
          loading: false,
          isOffline: true
        });
        return;
      }

      // Fetch previous month's unpaid expenses
      const { months } = get();
      const sorted = [...months].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const currentIndex = sorted.findIndex(m => m.id === monthId);
      let prevExpensesData = [];
      if (currentIndex > 0) {
        const prevMonth = sorted[currentIndex - 1];
        const { data: prevData } = await supabase
          .from('expenses')
          .select('*')
          .eq('month_id', prevMonth.id)
          .eq('estado', 'X'); // Only unpaid
        if (prevData) {
          prevExpensesData = prevData.map(e => ({ ...e, isFromPreviousMonth: true, originalMonthName: prevMonth.name }));
        }
      }
      
      set({ 
        expenses: expensesData || [],
        prevPendingExpenses: prevExpensesData,
        balances: balancesData || { caixabank: 0, hucha: 0, ing_nomina: 0, ing_naranja: 0 },
        loading: false,
        isOffline: false
      });
    } catch (err) {
      console.error('Error in fetchMonthData:', err);
      set({ loading: false, isOffline: true });
    }
  },

  addExpense: async (expense) => {
    const { selectedMonthId } = get();
    const { id: _, created_at: __, loanId: ___, cardId: ____, ...cleanExpense } = expense;
    const tempId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'temp_' + Date.now();
    const newExpense = { ...cleanExpense, id: tempId, month_id: selectedMonthId, created_at: new Date().toISOString() };
    
    set(state => {
      const nextExpenses = [...state.expenses, newExpense];
      const nextState = { ...state, expenses: nextExpenses };
      saveStoreToCache(nextState);
      return { expenses: nextExpenses };
    });

    try {
      const { data, error } = await supabase.from('expenses').insert({ ...cleanExpense, month_id: selectedMonthId }).select().single();
      if (!error && data) {
        set(state => {
          const nextExpenses = state.expenses.map(e => e.id === tempId ? data : e);
          const nextState = { ...state, expenses: nextExpenses };
          saveStoreToCache(nextState);
          return { expenses: nextExpenses };
        });
        return { data, error: null };
      }
      return { data: newExpense, error, savedLocally: true };
    } catch (err) {
      return { data: newExpense, error: err, savedLocally: true };
    }
  },

  updateExpense: async (id, updates) => {
    const { id: _, created_at: __, month_id: ___, loanId: ____, cardId: _____, ...cleanUpdates } = updates;
    
    // Optimistic update and immediately persist in local cache
    set(state => {
      const nextExpenses = state.expenses.map(e => e.id === id ? { ...e, ...cleanUpdates } : e);
      const nextPrev = (state.prevPendingExpenses || []).map(e => e.id === id ? { ...e, ...cleanUpdates } : e);
      const nextState = { ...state, expenses: nextExpenses, prevPendingExpenses: nextPrev };
      saveStoreToCache(nextState);
      return { expenses: nextExpenses, prevPendingExpenses: nextPrev };
    });

    try {
      const { error } = await supabase.from('expenses').update(cleanUpdates).eq('id', id);
      if (error) {
        console.warn('Supabase no pudo guardar el cambio (mantenido localmente):', error.message);
        return { error, savedLocally: true };
      }
      return { success: true };
    } catch (err) {
      console.warn('Fallo de red al conectar con Supabase (mantenido localmente):', err);
      return { error: err, savedLocally: true };
    }
  },

  deleteExpense: async (id) => {
    set(state => {
      const nextExpenses = state.expenses.filter(e => e.id !== id);
      const nextPrev = (state.prevPendingExpenses || []).filter(e => e.id !== id);
      const nextState = { ...state, expenses: nextExpenses, prevPendingExpenses: nextPrev };
      saveStoreToCache(nextState);
      return { expenses: nextExpenses, prevPendingExpenses: nextPrev };
    });

    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      return { error, savedLocally: !!error };
    } catch (err) {
      return { error: err, savedLocally: true };
    }
  },

  resetExpensesState: async (entidad) => {
    const { expenses } = get();
    const prevExpenses = [...expenses];
    
    const newExpenses = expenses.map((e) => {
      if (entidad === 'ALL' || e.entidad === entidad) {
        return { ...e, estado: e.estado === 'P' ? 'X' : e.estado };
      }
      return e;
    });
    set({ expenses: newExpenses });

    const updates = newExpenses.filter(e => e.estado !== prevExpenses.find(p => p.id === e.id).estado);
    for (const update of updates) {
      await supabase.from('expenses').update({ estado: update.estado }).eq('id', update.id);
    }
  },

  // CRUD ENTITIES
  addEntity: async (entity) => {
    const { data, error } = await supabase.from('entities').insert(entity).select().single();
    if (!error && data) {
      set(state => ({ entities: [...state.entities, data] }));
    }
    return { data, error };
  },
  
  updateEntity: async (id, updates) => {
    const prev = get().entities;
    set(state => ({ entities: state.entities.map(e => e.id === id ? { ...e, ...updates } : e) }));
    const { id: _, created_at: __, ...cleanUpdates } = updates;
    const { error } = await supabase.from('entities').update(cleanUpdates).eq('id', id);
    if (error) set({ entities: prev });
    return { error };
  },

  deleteEntity: async (id) => {
    const prev = get().entities;
    set(state => ({ entities: state.entities.filter(e => e.id !== id) }));
    const { error } = await supabase.from('entities').delete().eq('id', id);
    if (error) set({ entities: prev });
    return { error };
  },

  // CRUD CARDS
  addCard: async (card) => {
    const { isPaidThisMonth, paidAmount, ...cleanCard } = card;
    const adjustedCard = { ...cleanCard, cuota: Math.min(cleanCard.cuota, cleanCard.pendiente) };
    const { data, error } = await supabase.from('cards').insert(adjustedCard).select().single();
    if (!error && data) {
      set(state => ({ cards: [...state.cards, data] }));
    }
    return { data, error };
  },

  updateCard: async (id, updates) => {
    const prev = get().cards;
    const card = prev.find(c => c.id === id);
    const nextPendiente = updates.pendiente !== undefined ? updates.pendiente : (card ? card.pendiente : 0);
    const nextCuota = updates.cuota !== undefined ? updates.cuota : (card ? card.cuota : 0);
    const adjustedCuota = Math.min(nextCuota, nextPendiente);
    
    const { isPaidThisMonth, paidAmount, ...cleanUpdatesObj } = { ...updates, cuota: adjustedCuota };

    set(state => ({ cards: state.cards.map(c => c.id === id ? { ...c, ...cleanUpdatesObj } : c) }));
    const { id: _, created_at: __, ...cleanUpdates } = cleanUpdatesObj;
    const { error } = await supabase.from('cards').update(cleanUpdates).eq('id', id);
    if (error) set({ cards: prev });
    return { error };
  },

  deleteCard: async (id) => {
    const prev = get().cards;
    set(state => ({ cards: state.cards.filter(c => c.id !== id) }));
    const { error } = await supabase.from('cards').delete().eq('id', id);
    if (error) set({ cards: prev });
    return { error };
  },

  // CRUD LOANS
  addLoan: async (loan) => {
    const { isPaidThisMonth, ...cleanLoan } = loan;
    const adjustedLoan = { ...cleanLoan, pendiente: cleanLoan.faltan * cleanLoan.cuota };
    const { data, error } = await supabase.from('loans').insert(adjustedLoan).select().single();
    if (!error && data) {
      set(state => ({ loans: [...state.loans, data] }));
    }
    return { data, error };
  },

  updateLoan: async (id, updates) => {
    const prev = get().loans;
    const loan = prev.find(l => l.id === id);
    const nextFaltan = updates.faltan !== undefined ? updates.faltan : (loan ? loan.faltan : 0);
    const nextCuota = updates.cuota !== undefined ? updates.cuota : (loan ? loan.cuota : 0);
    const nextPendiente = nextFaltan * nextCuota;
    const cleanUpdatesObj = { ...updates, faltan: nextFaltan, cuota: nextCuota, pendiente: nextPendiente };

    const { isPaidThisMonth, ...cleanUpdatesObjCleaned } = cleanUpdatesObj;

    set(state => ({ loans: state.loans.map(l => l.id === id ? { ...l, ...cleanUpdatesObjCleaned } : l) }));
    const { id: _, created_at: __, ...cleanUpdates } = cleanUpdatesObjCleaned;
    const { error } = await supabase.from('loans').update(cleanUpdates).eq('id', id);
    if (error) set({ loans: prev });
    return { error };
  },

  deleteLoan: async (id) => {
    const prev = get().loans;
    set(state => ({ loans: state.loans.filter(l => l.id !== id) }));
    const { error } = await supabase.from('loans').delete().eq('id', id);
    if (error) set({ loans: prev });
    return { error };
  },

  // CRUD REMINDERS
  addReminder: async (reminder) => {
    const { data, error } = await supabase.from('reminders').insert(reminder).select().single();
    if (!error && data) {
      set(state => ({ reminders: [data, ...state.reminders] }));
    }
    return { data, error };
  },

  updateReminder: async (id, updates) => {
    const prevReminders = get().reminders;
    set(state => ({
      reminders: state.reminders.map(r => r.id === id ? { ...r, ...updates } : r)
    }));

    const { id: _, created_at: __, ...cleanUpdates } = updates;
    const { error } = await supabase.from('reminders').update(cleanUpdates).eq('id', id);
    if (error) {
      set({ reminders: prevReminders });
    }
    return { error };
  },

  deleteReminder: async (id) => {
    const prevReminders = get().reminders;
    set(state => ({
      reminders: state.reminders.filter(r => r.id !== id)
    }));
    const { error } = await supabase.from('reminders').delete().eq('id', id);
    if (error) {
      set({ reminders: prevReminders });
    }
    return { error };
  },

  updateBalance: async (account, value) => {
    const { balances, selectedMonthId } = get();
    const newBalances = { ...balances, [account]: value };
    
    set(state => {
      const nextState = { ...state, balances: newBalances };
      saveStoreToCache(nextState);
      return { balances: newBalances };
    });

    try {
      await supabase.from('balances').update({ [account]: value }).eq('month_id', selectedMonthId);
    } catch (e) {
      console.warn('Error al actualizar saldos en Supabase (guardado en local):', e);
    }
  },

  closeAndCreateMonth: async (currentMonthId, newMonthName) => {
    set({ loading: true });
    try {
      let newMonth;
      
      // 1. Check if new month already exists or create it
      const { data: existingMonths } = await supabase
        .from('months')
        .select('*')
        .eq('name', newMonthName);

      if (existingMonths && existingMonths.length > 0) {
        newMonth = existingMonths[0];
      } else {
        const { data: createdMonth, error: newMonthError } = await supabase
          .from('months')
          .insert({ name: newMonthName, status: 'open' })
          .select()
          .single();

        if (newMonthError || !createdMonth) {
          throw new Error('Error al crear el nuevo mes: ' + newMonthError?.message);
        }
        newMonth = createdMonth;
      }

      // Close all other months to ensure only newMonth is open
      const { error: closeMonthError } = await supabase
        .from('months')
        .update({ status: 'closed' })
        .neq('id', newMonth.id);
      
      if (closeMonthError) {
        throw new Error('Error al cerrar los meses anteriores: ' + closeMonthError.message);
      }

      // 2. Fetch expenses of current month
      const { data: currentExpenses, error: fetchExpensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('month_id', currentMonthId);

      if (fetchExpensesError) {
        throw new Error('Error al obtener gastos para clonar: ' + fetchExpensesError.message);
      }

      // 3. Handle Balances: Copy current balances to new month
      const { balances } = get();
      const { data: existingTargetBalance } = await supabase
        .from('balances')
        .select('*')
        .eq('month_id', newMonth.id)
        .maybeSingle();

      if (existingTargetBalance) {
        await supabase
          .from('balances')
          .update({
            caixabank: balances.caixabank || 0,
            hucha: balances.hucha || 0,
            ing_nomina: balances.ing_nomina || 0,
            ing_naranja: balances.ing_naranja || 0
          })
          .eq('id', existingTargetBalance.id);
      } else {
        const newBalanceObj = {
          month_id: newMonth.id,
          caixabank: balances.caixabank || 0,
          hucha: balances.hucha || 0,
          ing_nomina: balances.ing_nomina || 0,
          ing_naranja: balances.ing_naranja || 0
        };
        const { error: balanceError } = await supabase
          .from('balances')
          .insert(newBalanceObj);

        if (balanceError) {
          throw new Error('Error al inicializar los saldos: ' + balanceError.message);
        }
      }

      // 4. Clone expenses & update loan and card baselines
      if (currentExpenses && currentExpenses.length > 0) {
        const { loans, cards } = get();

        const loanPaidCounts = {};
        const cardPaidTotals = {};

        for (const exp of currentExpenses) {
          if (exp.estado === 'P') {
            const { loanId, cardId, concept } = getLinkInfo(exp.concepto);
            
            const resolvedLoan = loans.find(l => isLoanMatching(concept, loanId, l));
            if (resolvedLoan) {
              loanPaidCounts[resolvedLoan.id] = (loanPaidCounts[resolvedLoan.id] || 0) + 1;
            }

            const resolvedCard = cards.find(c => isCardMatching(concept, cardId, c));
            if (resolvedCard) {
              cardPaidTotals[resolvedCard.id] = (cardPaidTotals[resolvedCard.id] || 0) + exp.importe;
            }
          }
        }

        // Apply Loan updates to Supabase
        for (const loan of loans) {
          const paidCount = loanPaidCounts[loan.id] || 0;
          if (paidCount > 0) {
            const nextFaltan = Math.max(0, loan.faltan - paidCount);
            const nextPendiente = nextFaltan * loan.cuota;
            await supabase
              .from('loans')
              .update({ faltan: nextFaltan, pendiente: nextPendiente })
              .eq('id', loan.id);
          }
        }

        // Apply Card updates to Supabase
        for (const card of cards) {
          const paidAmount = cardPaidTotals[card.id] || 0;
          if (paidAmount > 0) {
            const nextPendiente = Math.max(0, card.pendiente - paidAmount);
            const nextDisponible = card.credito - nextPendiente;
            const nextCuota = Math.min(card.cuota, nextPendiente);
            await supabase
              .from('cards')
              .update({ pendiente: nextPendiente, disponible: nextDisponible, cuota: nextCuota })
              .eq('id', card.id);
          }
        }

        const clonedExpenses = currentExpenses.map(exp => ({
          month_id: newMonth.id,
          dia: exp.dia,
          concepto: exp.concepto,
          importe: exp.importe,
          entidad: exp.entidad,
          estado: exp.estado === '-' ? '-' : 'X'
        }));

        const { error: insertExpensesError } = await supabase
          .from('expenses')
          .insert(clonedExpenses);

        if (insertExpensesError) {
          throw new Error('Error al clonar los gastos: ' + insertExpensesError.message);
        }
      }

      // 5. Reload all data
      await get().fetchInitialData();
      await get().fetchMonthData(newMonth.id);
      
      return { success: true };
    } catch (err) {
      console.error(err);
      set({ loading: false });
      return { success: false, error: err.message };
    }
  },

  revertMonthClose: async (monthToDeleteId, monthToReopenId) => {
    set({ loading: true });
    try {
      // Revert paid loan increments and card deductions before deleting expenses
      const { loans, cards } = get();
      const { data: monthExpenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('month_id', monthToDeleteId);

      const loanPaidCounts = {};
      const cardPaidTotals = {};

      for (const exp of (monthExpenses || [])) {
        if (exp.estado === 'P') {
          const { loanId, cardId, concept } = getLinkInfo(exp.concepto);
          
          const resolvedLoan = loans.find(l => isLoanMatching(concept, loanId, l));
          if (resolvedLoan) {
            loanPaidCounts[resolvedLoan.id] = (loanPaidCounts[resolvedLoan.id] || 0) + 1;
          }

          const resolvedCard = cards.find(c => isCardMatching(concept, cardId, c));
          if (resolvedCard) {
            cardPaidTotals[resolvedCard.id] = (cardPaidTotals[resolvedCard.id] || 0) + exp.importe;
          }
        }
      }

      // Revert Loans in Supabase
      for (const loan of loans) {
        const paidCount = loanPaidCounts[loan.id] || 0;
        if (paidCount > 0) {
          const nextFaltan = loan.faltan + paidCount;
          const nextPendiente = nextFaltan * loan.cuota;
          await supabase
            .from('loans')
            .update({ faltan: nextFaltan, pendiente: nextPendiente })
            .eq('id', loan.id);
        }
      }

      // Revert Cards in Supabase
      for (const card of cards) {
        const paidAmount = cardPaidTotals[card.id] || 0;
        if (paidAmount > 0) {
          const nextPendiente = card.pendiente + paidAmount;
          const nextDisponible = card.credito - nextPendiente;
          const nextCuota = Math.min(card.cuota, nextPendiente);
          await supabase
            .from('cards')
            .update({ pendiente: nextPendiente, disponible: nextDisponible, cuota: nextCuota })
            .eq('id', card.id);
        }
      }

      // Delete expenses of the month
      const { error: deleteExpensesError } = await supabase
        .from('expenses')
        .delete()
        .eq('month_id', monthToDeleteId);
      
      if (deleteExpensesError) {
        throw new Error('Error al eliminar los gastos del mes: ' + deleteExpensesError.message);
      }

      // Delete balances of the month
      const { error: deleteBalancesError } = await supabase
        .from('balances')
        .delete()
        .eq('month_id', monthToDeleteId);

      if (deleteBalancesError) {
        throw new Error('Error al eliminar los saldos del mes: ' + deleteBalancesError.message);
      }

      // Delete month record
      const { error: deleteMonthError } = await supabase
        .from('months')
        .delete()
        .eq('id', monthToDeleteId);

      if (deleteMonthError) {
        throw new Error('Error al eliminar el registro del mes: ' + deleteMonthError.message);
      }

      // Reopen previous month
      const { error: reopenMonthError } = await supabase
        .from('months')
        .update({ status: 'open' })
        .eq('id', monthToReopenId);

      if (reopenMonthError) {
        throw new Error('Error al reabrir el mes anterior: ' + reopenMonthError.message);
      }

      await get().fetchInitialData();
      await get().fetchMonthData(monthToReopenId);

      return { success: true };
    } catch (err) {
      console.error(err);
      set({ loading: false });
      return { success: false, error: err.message };
    }
  },

  getDynamicLoans: () => {
    const { loans, expenses } = get();
    return loans.map(loan => {
      const paidExpense = expenses.find(e => {
        if (e.estado !== 'P') return false;
        const { loanId, concept } = getLinkInfo(e.concepto);
        return isLoanMatching(concept, loanId, loan);
      });

      if (paidExpense) {
        const nextFaltan = Math.max(0, loan.faltan - 1);
        const nextPendiente = nextFaltan * loan.cuota;
        return {
          ...loan,
          faltan: nextFaltan,
          pendiente: nextPendiente,
          isPaidThisMonth: true,
        };
      }

      return {
        ...loan,
        pendiente: loan.faltan * loan.cuota,
        isPaidThisMonth: false,
      };
    });
  },

  getDynamicCards: () => {
    const { cards, expenses } = get();
    return cards.map(card => {
      const paidAmount = expenses
        .filter(e => {
          if (e.estado !== 'P') return false;
          const { cardId, concept } = getLinkInfo(e.concepto);
          return isCardMatching(concept, cardId, card);
        })
        .reduce((sum, e) => sum + e.importe, 0);

      if (paidAmount > 0) {
        const nextPendiente = Math.max(0, card.pendiente - paidAmount);
        const nextDisponible = card.credito - nextPendiente;
        return {
          ...card,
          cuota: Math.min(card.cuota, nextPendiente),
          pendiente: nextPendiente,
          disponible: nextDisponible,
          isPaidThisMonth: true,
          paidAmount,
        };
      }

      return {
        ...card,
        cuota: Math.min(card.cuota, card.pendiente),
        isPaidThisMonth: false,
        paidAmount: 0,
      };
    });
  },

  getUnlistedCardReceipts: () => {
    const { expenses } = get();
    const dynamicCards = get().getDynamicCards();
    return dynamicCards
      .map(card => {
        const cuota = card.cuota || 0;
        if (cuota <= 0) return null;

        const expensesForCard = (expenses || []).filter(e => {
          const { cardId, concept } = getLinkInfo(e.concepto);
          return isCardMatching(concept, cardId, card);
        });

        const alreadyCovered = expensesForCard
          .filter(e => e.estado === 'X' || e.estado === 'P')
          .reduce((sum, e) => sum + e.importe, 0);

        const remainingReceipt = Math.max(0, cuota - alreadyCovered);
        if (remainingReceipt <= 0) return null;

        const ent = getCardEntity(card);
        return {
          id: `card_receipt_${card.id}`,
          isCardReceipt: true,
          cardId: card.id,
          dia: 1,
          concepto: `Recibo ${card.tarjeta}`,
          importe: remainingReceipt,
          entidad: ent,
          estado: 'X'
        };
      })
      .filter(Boolean);
  },

  exportAllData: async () => {
    const { data: months } = await supabase.from('months').select('*');
    const { data: entities } = await supabase.from('entities').select('*');
    const { data: expenses } = await supabase.from('expenses').select('*');
    const { data: balances } = await supabase.from('balances').select('*');
    const { data: loans } = await supabase.from('loans').select('*');
    const { data: cards } = await supabase.from('cards').select('*');
    const { data: reminders } = await supabase.from('reminders').select('*');
    return { months, entities, expenses, balances, loans, cards, reminders };
  },

  importAllData: async (data) => {
    const { months, entities, expenses, balances, loans, cards, reminders } = data;

    // Delete in FK-safe order
    await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('balances').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('cards').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('loans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('reminders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('months').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('entities').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Insert in FK-safe order
    if (entities?.length) await supabase.from('entities').insert(entities);
    if (months?.length) await supabase.from('months').insert(months);
    if (loans?.length) await supabase.from('loans').insert(loans);
    if (cards?.length) await supabase.from('cards').insert(cards);
    if (balances?.length) await supabase.from('balances').insert(balances);
    if (expenses?.length) await supabase.from('expenses').insert(expenses);
    if (reminders?.length) await supabase.from('reminders').insert(reminders);

    // Reload all data
    await get().fetchInitialData();
  },
}));
