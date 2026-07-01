import { create } from 'zustand';
import { createClient } from '@supabase/supabase-js';
import { getLinkInfo } from '../utils';

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

export const useStore = create((set, get) => ({
  theme: localStorage.getItem('theme') || 'dark',
  months: [],
  selectedMonthId: null,
  
  entities: [],
  expenses: [],
  prevPendingExpenses: [],
  loans: [],
  cards: [],
  balances: {
    caixabank: 0,
    hucha: 0,
    ing_nomina: 0,
    ing_naranja: 0
  },
  reminders: [],
  
  loading: false,

  // Load Initial Data
  fetchInitialData: async () => {
    set({ loading: true });
    
    // Fetch months & entities
    const { data: monthsData } = await supabase.from('months').select('*').order('created_at', { ascending: false });
    const { data: entitiesData } = await supabase.from('entities').select('*');
    
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
      reminders: remindersData || []
    });

    if (activeMonth) {
      await get().fetchMonthData(activeMonth.id);
    }
    
    set({ loading: false });
  },

  // Theme
  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    set({ theme: newTheme });
  },

  // Fetch Data for specific month
  fetchMonthData: async (monthId) => {
    set({ loading: true, selectedMonthId: monthId });
    
    const { data: expensesData } = await supabase.from('expenses').select('*').eq('month_id', monthId);
    const { data: balancesData } = await supabase.from('balances').select('*').eq('month_id', monthId).single();
    
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
      loading: false
    });
  },

  // CRUD EXPENSES
  addExpense: async (expense) => {
    const { selectedMonthId } = get();
    const newExpense = { ...expense, month_id: selectedMonthId };
    const { data, error } = await supabase.from('expenses').insert(newExpense).select().single();
    if (!error && data) {
      set(state => ({ expenses: [...state.expenses, data] }));
    }
    return { data, error };
  },

  updateExpense: async (id, updates) => {
    // Optimistic update
    const prevExpenses = get().expenses;
    set(state => ({
      expenses: state.expenses.map(e => e.id === id ? { ...e, ...updates } : e),
    }));

    const { error } = await supabase.from('expenses').update(updates).eq('id', id);
    if (error) {
      set({ expenses: prevExpenses }); // Revert on error
    }
    return { error };
  },

  deleteExpense: async (id) => {
    const prevExpenses = get().expenses;
    set(state => ({
      expenses: state.expenses.filter(e => e.id !== id),
    }));
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) set({ expenses: prevExpenses });
    return { error };
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
    const { error } = await supabase.from('entities').update(updates).eq('id', id);
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
    const { data, error } = await supabase.from('cards').insert(card).select().single();
    if (!error && data) {
      set(state => ({ cards: [...state.cards, data] }));
    }
    return { data, error };
  },

  updateCard: async (id, updates) => {
    const prev = get().cards;
    set(state => ({ cards: state.cards.map(c => c.id === id ? { ...c, ...updates } : c) }));
    const { error } = await supabase.from('cards').update(updates).eq('id', id);
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
    const { data, error } = await supabase.from('loans').insert(loan).select().single();
    if (!error && data) {
      set(state => ({ loans: [...state.loans, data] }));
    }
    return { data, error };
  },

  updateLoan: async (id, updates) => {
    const prev = get().loans;
    set(state => ({ loans: state.loans.map(l => l.id === id ? { ...l, ...updates } : l) }));
    const { error } = await supabase.from('loans').update(updates).eq('id', id);
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

    const { error } = await supabase.from('reminders').update(updates).eq('id', id);
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
    
    set({ balances: newBalances });
    await supabase.from('balances').update({ [account]: value }).eq('month_id', selectedMonthId);
  },

  closeAndCreateMonth: async (currentMonthId, newMonthName) => {
    set({ loading: true });
    try {
      // 1. Insert the new month
      const { data: newMonth, error: newMonthError } = await supabase
        .from('months')
        .insert({ name: newMonthName, status: 'open' })
        .select()
        .single();
      
      if (newMonthError || !newMonth) {
        throw new Error('Error al crear el nuevo mes: ' + newMonthError?.message);
      }

      // 2. Close the current month
      const { error: closeMonthError } = await supabase
        .from('months')
        .update({ status: 'closed' })
        .eq('id', currentMonthId);
      
      if (closeMonthError) {
        throw new Error('Error al cerrar el mes actual: ' + closeMonthError.message);
      }

      // 3. Copy balances (using current local state balances)
      const { balances } = get();
      const { error: balanceError } = await supabase
        .from('balances')
        .insert({
          month_id: newMonth.id,
          caixabank: balances.caixabank || 0,
          hucha: balances.hucha || 0,
          ing_nomina: balances.ing_nomina || 0,
          ing_naranja: balances.ing_naranja || 0
        });

      if (balanceError) {
        throw new Error('Error al inicializar los saldos: ' + balanceError.message);
      }

      // 4. Fetch expenses of current month to clone them
      const { data: currentExpenses, error: fetchExpensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('month_id', currentMonthId);

      if (fetchExpensesError) {
        throw new Error('Error al obtener gastos para clonar: ' + fetchExpensesError.message);
      }

      if (currentExpenses && currentExpenses.length > 0) {
        // Update loans and cards baseline in database for any paid linked expenses
        const { loans, cards } = get();
        for (const exp of currentExpenses) {
          if (exp.estado === 'P') {
            const { loanId, cardId } = getLinkInfo(exp.concepto);
            if (loanId) {
              const loan = loans.find(l => l.id === loanId);
              if (loan) {
                const nextFaltan = Math.max(0, loan.faltan - 1);
                const nextPendiente = Math.max(0, loan.pendiente - loan.cuota);
                await supabase.from('loans').update({ faltan: nextFaltan, pendiente: nextPendiente }).eq('id', loanId);
              }
            } else if (cardId) {
              const card = cards.find(c => c.id === cardId);
              if (card) {
                const nextPendiente = Math.max(0, card.pendiente - exp.importe);
                const nextDisponible = card.credito - nextPendiente;
                await supabase.from('cards').update({ pendiente: nextPendiente, disponible: nextDisponible }).eq('id', cardId);
              }
            }
          }
        }

        // Prepare cloned expenses without their original id (so database generates new UUID)
        const clonedExpenses = currentExpenses.map(exp => ({
          month_id: newMonth.id,
          dia: exp.dia,
          concepto: exp.concepto,
          importe: exp.importe,
          entidad: exp.entidad,
          estado: exp.estado === '-' ? '-' : 'X' // P/X -> X, - -> -
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
      
      // Specifically select the new month
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
      // 1. Delete expenses associated with the month to delete
      const { error: deleteExpensesError } = await supabase
        .from('expenses')
        .delete()
        .eq('month_id', monthToDeleteId);
      
      if (deleteExpensesError) {
        throw new Error('Error al eliminar los gastos del mes: ' + deleteExpensesError.message);
      }

      // 2. Delete balances associated with the month to delete
      const { error: deleteBalancesError } = await supabase
        .from('balances')
        .delete()
        .eq('month_id', monthToDeleteId);

      if (deleteBalancesError) {
        throw new Error('Error al eliminar los saldos del mes: ' + deleteBalancesError.message);
      }

      // 3. Delete the month itself
      const { error: deleteMonthError } = await supabase
        .from('months')
        .delete()
        .eq('id', monthToDeleteId);

      if (deleteMonthError) {
        throw new Error('Error al eliminar el registro del mes: ' + deleteMonthError.message);
      }

      // 4. Set the previous month to open
      const { error: reopenMonthError } = await supabase
        .from('months')
        .update({ status: 'open' })
        .eq('id', monthToReopenId);

      if (reopenMonthError) {
        throw new Error('Error al reabrir el mes anterior: ' + reopenMonthError.message);
      }

      // 5. Reload all data
      await get().fetchInitialData();
      
      // Specifically select and load the reopened month
      await get().fetchMonthData(monthToReopenId);

      return { success: true };
    } catch (err) {
      console.error(err);
      set({ loading: false });
      return { success: false, error: err.message };
    }
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
