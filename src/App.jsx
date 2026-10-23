import { useState, useEffect, useRef } from 'react';
import Dashboard from './components/Dashboard';
import ExpensesList from './components/ExpensesList';
import PlanningView from './components/PlanningView';
import AIChat from './components/AIChat';
import RemindersView from './components/RemindersView';
import { Wallet, PieChart, CalendarDays, CalendarPlus, History, Download, Upload, RotateCcw, MessageSquare, Bell, Calculator, PlusCircle } from 'lucide-react';
import { normalizeDecimalInput, parseNum, getInputInfo } from './utils';
import { useStore } from './store/useStore';
import { Toaster, toast } from 'sonner';
import { globalStyles } from './stitches/globalStyles';
import Modal from './components/ui/Modal';
import CalculatorModal from './components/ui/CalculatorModal';

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
  const {
    activeTab,
    setActiveTab,
    months,
    selectedMonthId,
    fetchInitialData,
    fetchMonthData,
    loading,
    exportAllData,
    importAllData,
    closeAndCreateMonth,
    revertMonthClose,
    reminders,
    entities,
    addExpense,
    isCalculatorOpen,
    activeInputInfo,
    openCalculator,
    closeCalculator,
    setActiveInputInfo
  } = useStore();
  const fileInputRef = useRef(null);
  const [hasNotifiedOverdue, setHasNotifiedOverdue] = useState(false);

  // Close/Create Month Modal States
  const [isCloseMonthModalOpen, setIsCloseMonthModalOpen] = useState(false);
  const [newMonthName, setNewMonthName] = useState('');
  const [closing, setClosing] = useState(false);

  // Revert Month Close States
  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
  const [reverting, setReverting] = useState(false);

  // Quick Expense Modal States
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [quickExpenseData, setQuickExpenseData] = useState({
    dia: new Date().getDate(),
    concepto: '',
    importe: '',
    entidad: 'CAIXABANK',
    estado: 'X'
  });

  useEffect(() => {
    const handleFocusIn = (e) => {
      const target = e.target;
      if (
        target instanceof HTMLInputElement &&
        !target.closest('.calculator-modal-content') &&
        (target.type === 'number' || target.type === 'text' || target.inputMode === 'decimal')
      ) {
        const info = getInputInfo(target);
        if (info) {
          setActiveInputInfo(info);
        }
      }
    };

    window.addEventListener('focusin', handleFocusIn);
    return () => window.removeEventListener('focusin', handleFocusIn);
  }, [setActiveInputInfo]);

  // Atajo global de teclado para la calculadora (F2 o Alt+C)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'F2' || (e.altKey && (e.key === 'c' || e.key === 'C'))) {
        e.preventDefault();
        if (isCalculatorOpen) {
          closeCalculator();
        } else {
          openCalculator();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isCalculatorOpen, openCalculator, closeCalculator]);

  useEffect(() => {
    globalStyles();
    fetchInitialData();
    try {
      if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
        window.screen.orientation.unlock().catch(() => {});
      }
    } catch (err) {
      console.warn('Orientation unlock not supported:', err);
    }

    const handleWheel = (e) => {
      if (e.target instanceof HTMLInputElement && e.target.type === 'number') {
        e.target.blur();
      } else if (document.activeElement && document.activeElement.type === 'number') {
        document.activeElement.blur();
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: true });

    let focusedElement = null;

    const handleFocusIn = (e) => {
      const el = e.target;
      if (
        (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
        !['checkbox', 'radio', 'file', 'button', 'submit', 'reset', 'color', 'range'].includes(el.type) &&
        !el.readOnly &&
        !el.disabled
      ) {
        focusedElement = el;
        requestAnimationFrame(() => {
          if (document.activeElement === el) {
            try {
              el.select();
            } catch {
              // Ignore unsupported input types or selection errors
            }
          }
        });
      }
    };

    const handleMouseUp = (e) => {
      if (focusedElement && e.target === focusedElement) {
        try {
          focusedElement.select();
        } catch {
          // Ignore unsupported input types or selection errors
        }
        focusedElement = null;
      }
    };

    const handleMouseDown = () => {
      focusedElement = null;
    };

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  useEffect(() => {
    if (!loading && !hasNotifiedOverdue) {
      const todayStr = new Date().toISOString().split('T')[0];
      const overdueCount = reminders.filter(r => !r.completado && r.fecha_limite && r.fecha_limite < todayStr).length;
      if (overdueCount > 0) {
        toast.warning(`Tienes ${overdueCount} recordatorio(s) pendiente(s) y vencido(s).`, {
          duration: 6000,
          action: {
            label: 'Ver',
            onClick: () => setActiveTab('reminders')
          }
        });
      }
      setHasNotifiedOverdue(true);
    }
  }, [loading, reminders, hasNotifiedOverdue]);

  const pendingRemindersCount = reminders ? reminders.filter(r => !r.completado).length : 0;

  const handleOpenQuickExpense = () => {
    setQuickExpenseData({
      dia: new Date().getDate(),
      concepto: '',
      importe: '',
      entidad: entities?.[0]?.name || 'CAIXABANK',
      estado: 'X'
    });
    setIsQuickExpenseOpen(true);
  };

  const handleSaveQuickExpense = async (e) => {
    e.preventDefault();
    if (!quickExpenseData.concepto.trim()) {
      toast.error('El concepto es obligatorio');
      return;
    }
    const num = parseNum(normalizeDecimalInput(quickExpenseData.importe));
    if (isNaN(num) || num <= 0) {
      toast.error('Introduce un importe válido');
      return;
    }

    const res = await addExpense({
      dia: Number(quickExpenseData.dia) || new Date().getDate(),
      concepto: quickExpenseData.concepto.trim(),
      importe: num,
      entidad: quickExpenseData.entidad,
      estado: quickExpenseData.estado
    });

    if (res?.savedLocally) {
      toast.info('Gasto registrado en el dispositivo');
    } else if (!res?.error) {
      toast.success('Gasto registrado correctamente');
    } else {
      toast.error('Error al registrar gasto: ' + (res.error?.message || 'Error en el servidor'));
    }
    setIsQuickExpenseOpen(false);
  };

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
      toast.success(`Cierre de mes procesado. Nuevo mes: ${newMonthName}`);
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
      toast.success(`Cierre revertido. Se ha reabierto ${closedMonthToReopen.name}`);
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
      <Toaster position="top-right" richColors />
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
              className="btn btn-secondary"
              onClick={() => openCalculator()}
              title="Calculadora (F2)"
              aria-label="Abrir calculadora"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Calculator size={18} />
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
            <button
              className={activeTab === 'aichat' ? 'active' : ''}
              onClick={() => setActiveTab('aichat')}
            >
              <MessageSquare size={18} />
              <span>Chat IA</span>
            </button>
            <button
              className={activeTab === 'reminders' ? 'active' : ''}
              onClick={() => setActiveTab('reminders')}
              style={
                pendingRemindersCount > 0 && activeTab !== 'reminders'
                  ? { color: 'var(--danger)' }
                  : undefined
              }
            >
              {pendingRemindersCount > 0 ? (
                <span
                  style={{
                    background: activeTab === 'reminders' ? 'white' : 'var(--danger)',
                    color: activeTab === 'reminders' ? 'var(--primary)' : 'white',
                    borderRadius: '9999px',
                    minWidth: '20px',
                    height: '20px',
                    padding: '0 5px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  {pendingRemindersCount}
                </span>
              ) : (
                <Bell size={18} />
              )}
              <span>{pendingRemindersCount === 1 ? 'Recordatorio' : 'Recordatorios'}</span>
            </button>
          </div>
        </div>
      </header>

      <main style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'expenses' && <ExpensesList />}
        {activeTab === 'planning' && <PlanningView />}
        {activeTab === 'aichat' && <AIChat />}
        {activeTab === 'reminders' && <RemindersView />}
      </main>

      {/* Modal Cierre de Mes */}
      <Modal isOpen={isCloseMonthModalOpen} onClose={() => setIsCloseMonthModalOpen(false)} title={`Cerrar ${selectedMonth?.name}`}>
        <form onSubmit={handleCloseMonth}>
          <p style={{ marginBottom: '1.25rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
            ¿Estás seguro de que deseas cerrar el mes de <strong>{selectedMonth?.name}</strong> y crear el nuevo mes de facturación?
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
              <li>Se duplicará la plantilla de gastos mensuales de todas las entidades.</li>
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
            Esta acción eliminará todos los gastos y saldos de {selectedMonth?.name} y reabrirá el mes de {closedMonthToReopen?.name}.
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

      {/* Modal Calculadora Básica */}
      <CalculatorModal
        isOpen={isCalculatorOpen}
        onClose={closeCalculator}
        activeInputInfo={activeInputInfo}
      />

      {/* Botón Flotante Permanente de Registro Diario (FAB) */}
      <button
        type="button"
        className="fab-quick-expense"
        onClick={handleOpenQuickExpense}
        title="Registrar nuevo gasto"
        aria-label="Registrar ticket o nuevo gasto"
      >
        <PlusCircle size={20} />
        <span>Registrar Gasto</span>
      </button>

      {/* Modal Registro Rápido de Gasto */}
      <Modal
        isOpen={isQuickExpenseOpen}
        onClose={() => setIsQuickExpenseOpen(false)}
        title="Registrar Nuevo Gasto"
      >
        <form onSubmit={handleSaveQuickExpense}>
          <div className="form-group">
            <label>Día del mes</label>
            <input
              type="number"
              className="input"
              value={quickExpenseData.dia}
              onChange={e => setQuickExpenseData({ ...quickExpenseData, dia: parseInt(e.target.value, 10) || 1 })}
              onWheel={e => e.target.blur()}
              required
              min="1"
              max="31"
            />
          </div>
          <div className="form-group">
            <label>Concepto</label>
            <input
              type="text"
              className="input"
              value={quickExpenseData.concepto}
              onChange={e => setQuickExpenseData({ ...quickExpenseData, concepto: e.target.value })}
              placeholder="Ej: Compra Mercadona, Farmacia..."
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Importe (€)</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                inputMode="decimal"
                className="input"
                value={quickExpenseData.importe}
                onChange={e => setQuickExpenseData({ ...quickExpenseData, importe: normalizeDecimalInput(e.target.value) })}
                placeholder="0,00"
                required
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling;
                  openCalculator(input);
                }}
                title="Calcular importe"
                aria-label="Calcular importe"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0.75rem', flexShrink: 0 }}
              >
                <Calculator size={18} />
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>Entidad</label>
            <select
              className="input"
              value={quickExpenseData.entidad}
              onChange={e => setQuickExpenseData({ ...quickExpenseData, entidad: e.target.value })}
            >
              {entities.map(ent => (
                <option key={ent.id} value={ent.name}>{ent.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Estado</label>
            <select
              className="input"
              value={quickExpenseData.estado}
              onChange={e => setQuickExpenseData({ ...quickExpenseData, estado: e.target.value })}
            >
              <option value="X">Pendiente (No pagado)</option>
              <option value="P">Pagado</option>
              <option value="-">No aplica</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsQuickExpenseOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ backgroundColor: 'var(--fab-bg)', borderColor: 'var(--fab-bg)', color: '#ffffff' }}
            >
              Guardar Gasto
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default App;
