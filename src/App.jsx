import { useState, useEffect, useRef } from 'react';
import Dashboard from './components/Dashboard';
import ExpensesList from './components/ExpensesList';
import PlanningView from './components/PlanningView';
import { Wallet, PieChart, CalendarDays, CalendarPlus, History, Sun, Moon, Download, Upload, RotateCcw } from 'lucide-react';
import { useStore } from './store/useStore';
import { Toaster, toast } from 'sonner';
import { globalStyles } from './stitches/globalStyles';
import Modal from './components/ui/Modal';

const getNextMonthName = (currentName) => {
  if (!currentName) return '';
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const parts = currentName.trim().split(/\s+/);
  if (parts.length < 2) return currentName + ' - Siguiente';
  
  const currentMonthWord = parts[0];
  const currentYearWord = parts[1];
  
  const capitalizedWord = currentMonthWord.charAt(0).toUpperCase() + currentMonthWord.slice(1).toLowerCase();
  const idx = monthNames.indexOf(capitalizedWord);
  if (idx === -1) return currentName + ' - Siguiente';
  
  const nextIdx = (idx + 1) % 12;
  const yearNum = parseInt(currentYearWord, 10);
  const nextYear = nextIdx === 0 ? yearNum + 1 : yearNum;
  
  return `${monthNames[nextIdx]} ${nextYear}`;
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { months, selectedMonthId, fetchInitialData, fetchMonthData, loading, theme, toggleTheme, exportAllData, importAllData, closeAndCreateMonth, revertMonthClose } = useStore();
  const fileInputRef = useRef(null);

  // Close/Create Month Modal States
  const [isCloseMonthModalOpen, setIsCloseMonthModalOpen] = useState(false);
  const [newMonthName, setNewMonthName] = useState('');
  const [closing, setClosing] = useState(false);

  // Revert Month Close States
  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
  const [reverting, setReverting] = useState(false);

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

  const selectedMonth = months.find(m => m.id === selectedMonthId);

  // Find the most recently closed month to reopen
  const closedMonthToReopen = selectedMonth && selectedMonth.status === 'open'
    ? months.find(m => m.status === 'closed')
    : null;

  const openCloseMonthModal = () => {
    if (selectedMonth) {
      setNewMonthName(getNextMonthName(selectedMonth.name));
      setIsCloseMonthModalOpen(true);
    }
  };

  const handleCloseMonth = async (e) => {
    e.preventDefault();
    if (!newMonthName.trim() || !selectedMonthId) return;
    setClosing(true);
    const result = await closeAndCreateMonth(selectedMonthId, newMonthName.trim());
    setClosing(false);
    if (result.success) {
      toast.success(`Mes cerrado. Se ha iniciado el mes de ${newMonthName}`);
      setIsCloseMonthModalOpen(false);
    } else {
      toast.error(`Error al cerrar el mes: ${result.error}`);
    }
  };

  const handleRevertClose = async () => {
    if (!selectedMonthId || !closedMonthToReopen) return;
    setReverting(true);
    const result = await revertMonthClose(selectedMonthId, closedMonthToReopen.id);
    setReverting(false);
    if (result.success) {
      toast.success(`Cierre revertido. Se ha eliminado ${selectedMonth.name} y reabierto ${closedMonthToReopen.name}`);
      setIsRevertModalOpen(false);
    } else {
      toast.error(`Error al revertir: ${result.error}`);
    }
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
              <Upload size={16} />
            </button>
            <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} title="Importar datos">
              <Download size={16} />
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
            {selectedMonth && selectedMonth.status === 'open' && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={openCloseMonthModal}
                  style={{ height: '38px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <CalendarPlus size={16} />
                  <span>Cerrar Mes</span>
                </button>
                {closedMonthToReopen && (
                  <button 
                    className="btn btn-danger" 
                    onClick={() => setIsRevertModalOpen(true)}
                    style={{ height: '38px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <RotateCcw size={16} />
                    <span>Revertir Cierre</span>
                  </button>
                )}
              </div>
            )}
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

      {/* Modal Cierre de Mes */}
      <Modal isOpen={isCloseMonthModalOpen} onClose={() => setIsCloseMonthModalOpen(false)} title={`Cerrar ${selectedMonth?.name}`}>
        <form onSubmit={handleCloseMonth}>
          <p style={{ marginBottom: '1.25rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
            Se cerrará el mes de <strong>{selectedMonth?.name}</strong> y se creará el nuevo mes de facturación.
          </p>
          
          <div style={{ 
            background: 'var(--bg-main)', 
            padding: '0.75rem 1rem', 
            borderRadius: '8px', 
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)'
          }}>
            <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li>Los saldos actuales se traspasarán como saldos iniciales del nuevo mes.</li>
              <li>Se duplicará la plantilla de gastos mensuales de este mes.</li>
              <li>Los estados de pago se resetearán a <strong>"Pendiente"</strong> (salvo los gastos "No aplica").</li>
            </ul>
          </div>

          <div className="form-group">
            <label>Nombre del Nuevo Mes</label>
            <input 
              type="text" 
              className="input" 
              value={newMonthName} 
              onChange={e => setNewMonthName(e.target.value)} 
              required 
              disabled={closing}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsCloseMonthModalOpen(false)} disabled={closing}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={closing}>
              {closing ? 'Procesando...' : 'Cerrar y Crear Mes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Revertir Cierre */}
      <Modal isOpen={isRevertModalOpen} onClose={() => setIsRevertModalOpen(false)} title="Revertir Cierre de Mes">
        <div>
          <p style={{ marginBottom: '1.25rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
            ¿Estás seguro de que deseas eliminar el mes de <strong>{selectedMonth?.name}</strong> y volver a abrir <strong>{closedMonthToReopen?.name}</strong>?
          </p>
          
          <div style={{ 
            background: 'var(--btn-danger-bg)', 
            color: 'var(--danger)',
            padding: '0.75rem 1rem', 
            borderRadius: '8px', 
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            border: '1px solid var(--btn-danger-border)',
            fontWeight: 500
          }}>
            Esta acción es irreversible. Se eliminarán de forma permanente todos los gastos y saldos registrados en {selectedMonth?.name}.
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setIsRevertModalOpen(false)} disabled={reverting}>
              Cancelar
            </button>
            <button className="btn btn-danger" onClick={handleRevertClose} disabled={reverting}>
              {reverting ? 'Revirtiendo...' : 'Sí, revertir y eliminar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default App;
