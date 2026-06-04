import { useState } from 'react';
import { useStore } from '../store/useStore';
import { parseNum, parseIntNum } from '../utils';
import { RefreshCw, ArrowUpDown, Filter, Plus, Edit2, Trash2, Copy, Settings, Check, X as XIcon } from 'lucide-react';
import Modal from './ui/Modal';
import { toast } from 'sonner';

export default function ExpensesList() {
  const { expenses, entities, resetExpensesState, addExpense, updateExpense, deleteExpense, addEntity, deleteEntity } = useStore();
  
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

  const handleReset = (entidad) => {
    resetExpensesState(entidad);
    toast.success(`Estados de ${entidad} reseteados`);
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
      const { error } = await updateExpense(editingExpense.id, formData);
      if (!error) toast.success('Gasto actualizado');
      else toast.error('Error al actualizar');
    } else {
      const { error } = await addExpense(formData);
      if (!error) toast.success('Gasto añadido');
      else toast.error('Error al añadir');
    }
    setIsExpenseModalOpen(false);
  };

  const handleDelete = async (id) => {
    const { error } = await deleteExpense(id);
    if (!error) toast.success('Gasto eliminado');
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
    setInlineForm({ ...expense });
  };

  const cancelInlineEditing = () => {
    setInlineEditingId(null);
    setInlineForm({});
  };

  const saveInlineEditing = async () => {
    const { error } = await updateExpense(inlineEditingId, inlineForm);
    if (!error) {
      toast.success('Guardado');
      setInlineEditingId(null);
    } else {
      toast.error('Error al guardar');
    }
  };

  return (
    <div className="expenses-view">
      
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
                        <td><input type="number" className="input" style={{ width: '60px', padding: '0.25rem' }} value={inlineForm.dia} onChange={e => setInlineForm({...inlineForm, dia: parseIntNum(e.target.value)})} min="1" max="31" /></td>
                        <td><input type="text" className="input" style={{ width: '100%', padding: '0.25rem' }} value={inlineForm.concepto} onChange={e => setInlineForm({...inlineForm, concepto: e.target.value})} /></td>
                        <td><input type="number" step="0.01" className="input" style={{ width: '100px', padding: '0.25rem' }} value={inlineForm.importe} onChange={e => setInlineForm({...inlineForm, importe: parseNum(e.target.value)})} /></td>
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
                        <td>{expense.importe.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                        <td>
                          <select 
                            className="input" 
                            style={{ padding: '0.25rem', border: 'none', background: 'transparent', color: getEntityColor(expense.entidad), fontWeight: 600, cursor: 'pointer' }}
                            value={expense.entidad}
                            onChange={(e) => updateExpense(expense.id, { entidad: e.target.value })}
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
                            onChange={(e) => updateExpense(expense.id, { estado: e.target.value })}
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
          <div className="form-group"><label>Importe (€)</label><input type="number" step="0.01" className="input" value={formData.importe} onChange={e => setFormData({...formData, importe: parseNum(e.target.value)})} required /></div>
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
    </div>
  );
}
