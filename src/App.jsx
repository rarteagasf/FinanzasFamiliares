import { useState, useEffect, useRef } from 'react';
import Dashboard from './components/Dashboard';
import ExpensesList from './components/ExpensesList';
import PlanningView from './components/PlanningView';
import { Wallet, PieChart, CalendarDays, History, Sun, Moon, Download, Upload } from 'lucide-react';
import { useStore } from './store/useStore';
import { Toaster, toast } from 'sonner';
import { globalStyles } from './stitches/globalStyles';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { months, selectedMonthId, fetchInitialData, fetchMonthData, loading, theme, toggleTheme, exportAllData, importAllData } = useStore();
  const fileInputRef = useRef(null);

  useEffect(() => {
    globalStyles();
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  }, [theme]);

  const handleMonthChange = (e) => {
    fetchMonthData(e.target.value);
  };

  const handleExport = async () => {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'finanzas-personales.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importAllData(data);
      toast.success('Datos importados correctamente');
    } catch (err) {
      toast.error('Error al importar: ' + err.message);
    }
    e.target.value = '';
  };

  if (loading && months.length === 0) {
    return (
      <div className="app-container">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-main)' }}>
          Cargando datos...
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Toaster position="top-right" richColors theme={theme} />
      <header className="app-header">
        <div className="header-top">
          <h1 className="app-title">
            Finanzas Personales
          </h1>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={handleExport} title="Exportar datos">
              <Download size={16} />
            </button>
            <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} title="Importar datos">
              <Upload size={16} />
            </button>
            <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
            <button
              className="btn btn-secondary theme-toggle"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
        <div className="header-bottom">
          <div className="month-selector">
            <History size={16} />
            <select
              className="input"
              value={selectedMonthId || ''}
              onChange={handleMonthChange}
            >
              {months.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.status === 'open' ? '(Actual)' : '(Histórico)'}
                </option>
              ))}
            </select>
          </div>
          <div className="nav-tabs">
            <button
              className={activeTab === 'dashboard' ? 'active' : ''}
              onClick={() => setActiveTab('dashboard')}
            >
              <PieChart size={18} />
              <span>Resumen</span>
            </button>
            <button
              className={activeTab === 'expenses' ? 'active' : ''}
              onClick={() => setActiveTab('expenses')}
            >
              <Wallet size={18} />
              <span>Gastos</span>
            </button>
            <button
              className={activeTab === 'planning' ? 'active' : ''}
              onClick={() => setActiveTab('planning')}
            >
              <CalendarDays size={18} />
              <span>Planificación</span>
            </button>
          </div>
        </div>
      </header>

      <main style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'expenses' && <ExpensesList />}
        {activeTab === 'planning' && <PlanningView />}
      </main>
    </div>
  );
}

export default App;
