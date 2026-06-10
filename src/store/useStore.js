import { create } from 'zustand';
import { createClient } from '@supabase/supabase-js';

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
  loans: [],
  cards: [],
  balances: {
    caixabank: 0,
    hucha: 0,
    ing_nomina: 0,
    ing_naranja: 0
  },
  
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
    
    set({ 
      months: monthsData || [], 
      entities: entitiesData || [],
      selectedMonthId: activeMonth?.id || null,
      loans: loansData || [],
      cards: cardsData || []
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
    
    set({ 
      expenses: expensesData || [],
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

  updateBalance: async (account, value) => {
    const { balances, selectedMonthId } = get();
    const newBalances = { ...balances, [account]: value };
    
    set({ balances: newBalances });
    await supabase.from('balances').update({ [account]: value }).eq('month_id', selectedMonthId);
  },

  exportAllData: async () => {
    const { data: months } = await supabase.from('months').select('*');
    const { data: entities } = await supabase.from('entities').select('*');
    const { data: expenses } = await supabase.from('expenses').select('*');
    const { data: balances } = await supabase.from('balances').select('*');
    const { data: loans } = await supabase.from('loans').select('*');
    const { data: cards } = await supabase.from('cards').select('*');
    return { months, entities, expenses, balances, loans, cards };
  },

  importAllData: async (data) => {
    const { months, entities, expenses, balances, loans, cards } = data;

    // Delete in FK-safe order
    await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('balances').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('cards').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('loans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('months').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('entities').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Insert in FK-safe order
    if (entities?.length) await supabase.from('entities').insert(entities);
    if (months?.length) await supabase.from('months').insert(months);
    if (loans?.length) await supabase.from('loans').insert(loans);
    if (cards?.length) await supabase.from('cards').insert(cards);
    if (balances?.length) await supabase.from('balances').insert(balances);
    if (expenses?.length) await supabase.from('expenses').insert(expenses);

    // Reload all data
    await get().fetchInitialData();
  },
}));
