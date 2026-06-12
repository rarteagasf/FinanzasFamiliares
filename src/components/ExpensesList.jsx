import { useState } from 'react';
import { useStore } from '../store/useStore';
import { parseNum, parseIntNum, normalizeDecimalInput, formatCurrency, formatInputDecimal } from '../utils';
import { RefreshCw, ArrowUpDown, Filter, Plus, Edit2, Trash2, Copy, Settings, Check, X as XIcon, Wallet } from 'lucide-react';
import Modal from './ui/Modal';
import { toast } from 'sonner';

export default function ExpensesList() {
  const { expenses, entities, balances, resetExpensesState, addExpense, updateExpense, deleteExpense, addEntity, deleteEntity } = useStore();
  
  const [sortBy, setSortBy] = useState('dia'); // 'dia' | 'entidad'
  const [filterEntidad, setFilterEntidad] = useState('ALL');

  // Modal states (Adding / Fallback editing)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  
  const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
  const [newEntityName, setNewEntityName] = useState('');

  const [formData, setFormData] = useState({ dia: 1, concepto: '', importe: 0, entidad: '', estado: 'X' });

  // Inline Editing State
  const [inlineEditingId, setInlineEditingId] = useState(null);
  const [inlineForm, setInlineForm] = useState({});

  // Confirmation State
  const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const handleReset = (entidad) => {
    setConfirmState({
      isOpen: true,
      title: 'Confirmar reinicio de estados',
      message: `¿Estás seguro de reiniciar a "Pendiente" todos los estados de los gastos de "${entidad}"?`,
      onConfirm: () => {
        resetExpensesState(entidad);
        toast.success(`Estados de ${entidad} reseteados`);
      }
    });
  };

  const getSortedAndFiltered = () => {
    let result = [...expenses];
    if (filterEntidad !== 'ALL') {
      result = result.filter(e => e.entidad === filterEntidad);
    }
    result.sort((a, b) => {
      if (sortBy === 'dia') return a.dia - b.dia;
      if (sortBy === 'entidad') return a.entidad.localeCompare(b.entidad);
      return 0;
    });
    return result;
  };

  const displayedExpenses = getSortedAndFiltered();

  const getEntityColor = (name) => {
    const ent = entities.find(e => e.name === name);
    return ent ? ent.color : 'var(--text-muted)';
  };

  const openExpenseModal = (expense = null) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({ ...expense });
    } else {
      setEditingExpense(null);
      setFormData({ dia: 1, concepto: '', importe: 0, entidad: entities[0]?.name || '', estado: 'X' });
    }
    setIsExpenseModalOpen(true);
  };

  const saveExpense = async (e) => {
    e.preventDefault();
    if (editingExpense) {
      setConfirmState({
        isOpen: true,
        title: 'Confirmar actualización',
        message: `¿Estás seguro de guardar los cambios para el gasto "${formData.concepto}"?`,
        onConfirm: async () => {
          const { error } = await updateExpense(editingExpense.id, formData);
          if (!error) toast.success('Gasto actualizado');
          else toast.error('Error al actualizar');
          setIsExpenseModalOpen(false);
        }
      });
    } else {
      const { error } = await addExpense(formData);
      if (!error) toast.success('Gasto añadido');
      else toast.error('Error al añadir');
      setIsExpenseModalOpen(false);
    }
  };

  const handleDelete = async (id) => {
    const expense = expenses.find(e => e.id === id);
    setConfirmState({
      isOpen: true,
      title: 'Confirmar eliminación',
      message: `¿Estás seguro de eliminar el gasto "${expense?.concepto || ''}"?`,
      onConfirm: async () => {
        const { error } = await deleteExpense(id);
        if (!error) toast.success('Gasto eliminado');
      }
    });
  };

  const handleDuplicate = async (expense) => {
    const duplicated = { ...expense };
    delete duplicated.id; 
    const { error } = await addExpense(duplicated);
    if (!error) toast.success('Gasto duplicado');
  };

  const handleCreateEntity = async (e) => {
    e.preventDefault();
    if (!newEntityName.trim()) return;
    const { error } = await addEntity({ name: newEntityName, color: '#94a3b8' });
    if (!error) {
      toast.success('Entidad creada');
      setNewEntityName('');
    } else {
      toast.error('Error al crear entidad');
    }
  };

  const handleDeleteEntity = async (id) => {
    const { error } = await deleteEntity(id);
    if (!error) toast.success('Entidad eliminada');
  };

  // --- Inline Editing Logic ---
  const startInlineEditing = (expense) => {
    setInlineEditingId(expense.id);
    setInlineForm({ ...expense, importe: formatInputDecimal(expense.importe) });
  };

  const cancelInlineEditing = () => {
    setInlineEditingId(null);
    setInlineForm({});
  };

  const saveInlineEditing = async () => {
    const saveData = {
      ...inlineForm,
      dia: parseIntNum(inlineForm.dia),
      importe: parseNum(inlineForm.importe),
    };
    setConfirmState({
      isOpen: true,
      title: 'Confirmar edición en línea',
      message: `¿Estás seguro de guardar los cambios del gasto "${inlineForm.concepto}"?`,
      onConfirm: async () => {
        const { error } = await updateExpense(inlineEditingId, saveData);
        if (!error) {
          toast.success('Guardado');
          setInlineEditingId(null);
        } else {
          toast.error('Error al guardar');
        }
      }
    });
  };


  const totalPendienteCaixa = expenses
    .filter(e => e.estado === 'X' && e.entidad === 'CAIXABANK')
    .reduce((acc, curr) => acc + curr.importe, 0);
    
  const totalPendienteING = expenses
    .filter(e => e.estado === 'X' && e.entidad === 'ING')
    .reduce((acc, curr) => acc + curr.importe, 0);

  const dispCaixa = (balances?.caixabank || 0) - totalPendienteCaixa;
  const dispING = (balances?.ing_nomina || 0) - totalPendienteING;

  return (
    <div className="expenses-view">
      
      {/* Barra de Saldos de Cuentas */}
      <div className="balances-summary-bar" style={{
        display: 'flex',
        gap: '1.5rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        background: 'var(--bg-card)',
        padding: '0.85rem 1.25rem',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          <Wallet size={16} />
          <span>Saldos de Cuentas:</span>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.825rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--caixabank)' }}>CaixaBank</span>
            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
              {formatCurrency(balances?.caixabank || 0)} 
              <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.35rem', fontSize: '0.75rem' }}>
                (Disp: {formatCurrency(dispCaixa)})
              </span>
            </span>
          </div>
          <div style={{ width: '1px', height: '22px', background: 'var(--border)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.825rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--ing)' }}>ING Nómina</span>
            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
              {formatCurrency(balances?.ing_nomina || 0)} 
              <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.35rem', fontSize: '0.75rem' }}>
                (Disp: {formatCurrency(dispING)})
              </span>
            </span>
          </div>
          <div style={{ width: '1px', height: '22px', background: 'var(--border)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.825rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>ING Naranja</span>
            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{formatCurrency(balances?.ing_naranja || 0)}</span>
          </div>
          <div style={{ width: '1px', height: '22px', background: 'var(--border)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.825rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Hucha</span>
            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{formatCurrency(balances?.hucha || 0)}</span>
          </div>
        </div>
      </div>

      <div className="card expenses-toolbar">
        <div className="toolbar-filters">
          <div className="filter-group">
            <label className="filter-label">
              <Filter size={14} />
              Filtrar
            </label>
            <select className="input" value={filterEntidad} onChange={(e) => setFilterEntidad(e.target.value)}>
              <option value="ALL">Todas</option>
              {entities.map(ent => <option key={ent.id} value={ent.name}>{ent.name}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">
              <ArrowUpDown size={14} />
              Ordenar
            </label>
            <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="dia">Día</option>
              <option value="entidad">Entidad</option>
            </select>
          </div>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-secondary" onClick={() => setIsEntityModalOpen(true)}>
            <Settings size={16} /> Entidades
          </button>
          {entities.map(ent => (
            <button key={ent.id} className="btn btn-danger" onClick={() => handleReset(ent.name)}>
              <RefreshCw size={16} /> Reset {ent.name}
            </button>
          ))}
          <button className="btn btn-primary" onClick={() => openExpenseModal()}>
            <Plus size={16} /> Añadir
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Día</th>
                <th>Concepto</th>
                <th>Importe</th>
                <th>Entidad</th>
                <th>Estado</th>
                <th className="td-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {displayedExpenses.map(expense => {
                const isEditing = inlineEditingId === expense.id;
                
                return (
                  <tr key={expense.id} onDoubleClick={() => !isEditing && startInlineEditing(expense)}>
                    {isEditing ? (
                      <>
                        <td><input type="number" className="input" style={{ width: '60px', padding: '0.25rem' }} value={inlineForm.dia} onChange={e => setInlineForm({...inlineForm, dia: parseIntNum(e.target.value)})} min="1" max="31" onKeyDown={e => { if (e.key === 'Enter') saveInlineEditing(); if (e.key === 'Escape') cancelInlineEditing(); }} /></td>
                        <td><input type="text" className="input" style={{ width: '100%', padding: '0.25rem' }} value={inlineForm.concepto} onChange={e => setInlineForm({...inlineForm, concepto: e.target.value})} onKeyDown={e => { if (e.key === 'Enter') saveInlineEditing(); if (e.key === 'Escape') cancelInlineEditing(); }} /></td>
                        <td><input type="text" inputMode="decimal" className="input" style={{ width: '100px', padding: '0.25rem' }} value={inlineForm.importe} onChange={e => setInlineForm({...inlineForm, importe: normalizeDecimalInput(e.target.value)})} onKeyDown={e => { if (e.key === 'Enter') saveInlineEditing(); if (e.key === 'Escape') cancelInlineEditing(); }} /></td>
                        <td>
                          <select className="input" style={{ padding: '0.25rem' }} value={inlineForm.entidad} onChange={e => setInlineForm({...inlineForm, entidad: e.target.value})}>
                            {entities.map(ent => <option key={ent.id} value={ent.name}>{ent.name}</option>)}
                          </select>
                        </td>
                        <td>
                          <select className="input" style={{ padding: '0.25rem' }} value={inlineForm.estado} onChange={e => setInlineForm({...inlineForm, estado: e.target.value})}>
                            <option value="P">Pagado</option>
                            <option value="X">Pendiente</option>
                            <option value="-">No aplica</option>
                          </select>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                            <button className="btn" style={{ padding: '0.25rem', background: 'transparent' }} onClick={saveInlineEditing}>
                              <Check size={16} color="var(--success)" />
                            </button>
                            <button className="btn" style={{ padding: '0.25rem', background: 'transparent' }} onClick={cancelInlineEditing}>
                              <XIcon size={16} color="var(--danger)" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ fontWeight: 600 }}>{expense.dia}</td>
                        <td>{expense.concepto}</td>
                        <td>{formatCurrency(expense.importe)}</td>
                        <td>
                          <select 
                            className="input" 
                            style={{ padding: '0.25rem', border: 'none', background: 'transparent', color: getEntityColor(expense.entidad), fontWeight: 600, cursor: 'pointer' }}
                            value={expense.entidad}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              const oldValue = expense.entidad;
                              setConfirmState({
                                isOpen: true,
                                title: 'Confirmar cambio de entidad',
                                message: `¿Estás seguro de cambiar la entidad de "${expense.concepto}" de "${oldValue}" a "${newValue}"?`,
                                onConfirm: () => updateExpense(expense.id, { entidad: newValue }),
                              });
                            }}
                          >
                            {entities.map(ent => <option key={ent.id} value={ent.name}>{ent.name}</option>)}
                          </select>
                        </td>
                        <td>
                          <select 
                            className="input" 
                            style={{ 
                              padding: '0.25rem 0.5rem', 
                              borderRadius: '9999px',
                              background: expense.estado === 'P' ? 'var(--badge-p-bg)' : expense.estado === 'X' ? 'var(--badge-x-bg)' : 'var(--badge-none-bg)',
                              color: expense.estado === 'P' ? 'var(--success)' : expense.estado === 'X' ? 'var(--danger)' : 'var(--text-muted)',
                              fontWeight: 600,
                              border: 'none',
                              outline: 'none',
                              cursor: 'pointer'
                            }}
                            value={expense.estado}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              const oldValue = expense.estado;
                              const getEstadoLabel = (est) => est === 'P' ? 'Pagado' : est === 'X' ? 'Pendiente' : 'No aplica';
                              setConfirmState({
                                isOpen: true,
                                title: 'Confirmar cambio de estado',
                                message: `¿Estás seguro de cambiar el estado de "${expense.concepto}" de "${getEstadoLabel(oldValue)}" a "${getEstadoLabel(newValue)}"?`,
                                onConfirm: () => updateExpense(expense.id, { estado: newValue }),
                              });
                            }}
                          >
                            <option value="P">Pagado</option>
                            <option value="X">Pendiente</option>
                            <option value="-">No aplica</option>
                          </select>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                            <button className="btn" style={{ padding: '0.25rem', background: 'transparent' }} title="Editar en Ventana" onClick={() => openExpenseModal(expense)}>
                              <Edit2 size={16} color="var(--text-muted)" />
                            </button>
                            <button className="btn" style={{ padding: '0.25rem', background: 'transparent' }} title="Duplicar" onClick={() => handleDuplicate(expense)}>
                              <Copy size={16} color="var(--text-muted)" />
                            </button>
                            <button className="btn" style={{ padding: '0.25rem', background: 'transparent' }} title="Eliminar" onClick={() => handleDelete(expense.id)}>
                              <Trash2 size={16} color="var(--danger)" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Añadir/Editar Gasto */}
      <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title={editingExpense ? "Editar Gasto" : "Nuevo Gasto"}>
        <form onSubmit={saveExpense}>
          <div className="form-group"><label>Día</label><input type="number" className="input" value={formData.dia} onChange={e => setFormData({...formData, dia: parseInt(e.target.value)})} required min="1" max="31" /></div>
          <div className="form-group"><label>Concepto</label><input type="text" className="input" value={formData.concepto} onChange={e => setFormData({...formData, concepto: e.target.value})} required /></div>
          <div className="form-group"><label>Importe (€)</label><input type="text" inputMode="decimal" className="input" value={formatInputDecimal(formData.importe)} onChange={e => setFormData({...formData, importe: parseNum(normalizeDecimalInput(e.target.value))})} required /></div>
          <div className="form-group"><label>Entidad</label><select className="input" value={formData.entidad} onChange={e => setFormData({...formData, entidad: e.target.value})} required>{entities.map(ent => <option key={ent.id} value={ent.name}>{ent.name}</option>)}</select></div>
          <div className="form-group"><label>Estado Inicial</label><select className="input" value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value})}><option value="X">Pendiente</option><option value="P">Pagado</option><option value="-">No aplica</option></select></div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Guardar Gasto</button>
        </form>
      </Modal>

      {/* Modal Entidades */}
      <Modal isOpen={isEntityModalOpen} onClose={() => setIsEntityModalOpen(false)} title="Gestionar Entidades">
        <div style={{ marginBottom: '1.5rem' }}>
          {entities.map(ent => (
            <div key={ent.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 600, color: ent.color }}>{ent.name}</span>
              <button className="btn btn-danger" style={{ padding: '0.25rem' }} onClick={() => handleDeleteEntity(ent.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={handleCreateEntity} style={{ display: 'flex', gap: '0.5rem' }}>
          <input type="text" className="input" placeholder="Nueva entidad..." value={newEntityName} onChange={e => setNewEntityName(e.target.value)} required />
          <button type="submit" className="btn btn-primary">Añadir</button>
        </form>
      </Modal>

      {/* Modal Confirmación Genérico */}
      <Modal 
        isOpen={confirmState.isOpen} 
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} 
        title={confirmState.title || 'Confirmar Acción'}
      >
        <p style={{ marginBottom: '1.5rem', color: 'var(--text-main)' }}>{confirmState.message}</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={() => {
            confirmState.onConfirm();
            setConfirmState(prev => ({ ...prev, isOpen: false }));
          }}>
            Confirmar
          </button>
        </div>
      </Modal>
    </div>
  );
}
