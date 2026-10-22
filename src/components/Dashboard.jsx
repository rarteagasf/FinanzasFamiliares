import { useState } from 'react';
import { useStore, isLoanMatching, isCardMatching } from '../store/useStore';
import { ArrowDownCircle, Pencil, Check } from 'lucide-react';
import { parseNum, parseIntNum, normalizeDecimalInput, formatCurrency, formatInputDecimal, onNumKeyDown, getLinkInfo, setLinkInfo } from '../utils';
import CurrencyValue from './ui/CurrencyValue';
import Modal from './ui/Modal';
import { toast } from 'sonner';

export default function Dashboard() {
  const { balances, expenses, prevPendingExpenses = [], cards = [], loans = [], entities, updateBalance, updateExpense, getDynamicCards, navigateToCard } = useStore();
  const [editingAccount, setEditingAccount] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Editing Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({ dia: 1, concepto: '', importe: '', entidad: '', estado: 'X', loanId: '', cardId: '' });

  // Confirmation State
  const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const handleMarkAsPaid = (expense) => {
    const cleanConcept = getLinkInfo(expense.concepto).concept;
    setConfirmState({
      isOpen: true,
      title: 'Confirmar pago',
      message: `¿Estás seguro de marcar como "Pagado" el gasto "${cleanConcept}" (${formatCurrency(expense.importe)})?`,
      onConfirm: async () => {
        const res = await updateExpense(expense.id, { estado: 'P' });
        if (res?.savedLocally) {
          toast.info('Gasto marcado como pagado en el dispositivo');
        } else if (!res?.error) {
          toast.success('Gasto marcado como pagado');
        } else {
          toast.error('Error al actualizar: ' + (res.error?.message || 'Error en el servidor'));
        }
      }
    });
  };

  const openExpenseModal = (expense) => {
    setEditingExpense(expense);
    const linkInfo = getLinkInfo(expense.concepto);
    const resolvedLoan = linkInfo.loanId ? loans?.find(l => l.id === linkInfo.loanId) : loans?.find(l => isLoanMatching(linkInfo.concept, null, l));
    const resolvedCard = linkInfo.cardId ? cards?.find(c => c.id === linkInfo.cardId) : cards?.find(c => isCardMatching(linkInfo.concept, null, c));

    setFormData({
      ...expense,
      concepto: linkInfo.concept,
      importe: formatInputDecimal(expense.importe),
      loanId: linkInfo.loanId || resolvedLoan?.id || '',
      cardId: linkInfo.cardId || resolvedCard?.id || ''
    });
    setIsExpenseModalOpen(true);
  };

  const saveExpense = async (e) => {
    e.preventDefault();
    if (!editingExpense) return;

    const finalConcept = setLinkInfo(formData.concepto, formData.loanId, formData.cardId);
    const numericImporte = parseNum(normalizeDecimalInput(formData.importe));
    const saveData = {
      dia: formData.dia,
      concepto: finalConcept,
      importe: numericImporte,
      entidad: formData.entidad,
      estado: formData.estado
    };

    setConfirmState({
      isOpen: true,
      title: 'Confirmar actualización',
      message: `¿Estás seguro de guardar los cambios para el gasto "${formData.concepto}"?`,
      onConfirm: async () => {
        const res = await updateExpense(editingExpense.id, saveData);
        if (res?.savedLocally) {
          toast.info('Gasto actualizado en el dispositivo');
        } else if (!res?.error) {
          toast.success('Gasto actualizado');
        } else {
          toast.error('Error al actualizar: ' + (res.error?.message || 'Error en el servidor'));
        }
        setIsExpenseModalOpen(false);
      }
    });
  };

  const dynamicCards = getDynamicCards();

  const totalSaldos = (balances.caixabank || 0) + (balances.hucha || 0) + (balances.ing_nomina || 0) + (balances.ing_naranja || 0);
  
  // Calcular gastos pendientes totales
  const totalPendienteCaixa = expenses
    .filter(e => e.estado === 'X' && e.entidad === 'CAIXABANK')
    .reduce((acc, curr) => acc + curr.importe, 0)
    + prevPendingExpenses
    .filter(e => e.estado === 'X' && e.entidad === 'CAIXABANK')
    .reduce((acc, curr) => acc + curr.importe, 0);
    
  const totalPendienteING = expenses
    .filter(e => e.estado === 'X' && e.entidad === 'ING')
    .reduce((acc, curr) => acc + curr.importe, 0)
    + prevPendingExpenses
    .filter(e => e.estado === 'X' && e.entidad === 'ING')
    .reduce((acc, curr) => acc + curr.importe, 0);

  const totalGastosPendientes = totalPendienteCaixa + totalPendienteING;
  
  // Disponible
  const dispCaixa = balances.caixabank - totalPendienteCaixa;
  const dispING = balances.ing_nomina - totalPendienteING;
  const totalDisponible = dispCaixa + dispING + balances.ing_naranja + balances.hucha;

  // Gastos Pendientes para desglose
  const pendingExpenses = [
    ...expenses.filter(e => e.estado === 'X'),
    ...prevPendingExpenses
  ].sort((a, b) => {
    if (a.isFromPreviousMonth && !b.isFromPreviousMonth) return -1;
    if (!a.isFromPreviousMonth && b.isFromPreviousMonth) return 1;
    return a.dia - b.dia;
  });
  const groupedPendientes = {};
  
  // Initialize with known entities to maintain order
  entities.forEach(ent => { groupedPendientes[ent.name] = []; });
  
  pendingExpenses.forEach(exp => {
    if (!groupedPendientes[exp.entidad]) groupedPendientes[exp.entidad] = [];
    groupedPendientes[exp.entidad].push(exp);
  });

  const activeGroups = Object.entries(groupedPendientes).filter(([_, list]) => list.length > 0);

  return (
    <div className="dashboard">
      <div className="grid-3" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <h2 className="card-title">Saldos Totales</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Total Actual</div>
          <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1.5rem' }}>
            <CurrencyValue value={totalSaldos} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { key: 'caixabank', label: 'CaixaBank' },
              { key: 'ing_nomina', label: 'ING Nómina' },
              { key: 'ing_naranja', label: 'ING Naranja' },
              { key: 'hucha', label: 'Hucha' },
            ].map(({ key, label }) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                {editingAccount === key ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    className="input"
                    style={{ width: '120px', padding: '0.15rem 0.5rem', textAlign: 'right' }}
                    value={editValue}
                    autoFocus
                    onChange={e => setEditValue(normalizeDecimalInput(e.target.value))}
                    onBlur={() => { updateBalance(key, parseNum(editValue)); setEditingAccount(null); }}
                    onKeyDown={e => { if (e.key === 'Enter') { updateBalance(key, parseNum(editValue)); setEditingAccount(null); } if (e.key === 'Escape') setEditingAccount(null); }}
                  />
                ) : (
                  <span
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    onClick={() => { setEditingAccount(key); setEditValue(formatInputDecimal(balances[key] || 0)); }}
                    title="Editar saldo"
                  >
                    <CurrencyValue value={balances[key] || 0} />
                    <Pencil size={12} style={{ opacity: 0.4 }} />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="card-title"><ArrowDownCircle size={24} color="var(--danger)" /> Gastos Pendientes</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Total Pendiente</div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--danger)', marginBottom: '1.5rem' }}>
            <CurrencyValue value={totalGastosPendientes} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--caixabank)' }}>CaixaBank Pendiente</span>
              <CurrencyValue value={totalPendienteCaixa} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ing)' }}>ING Pendiente</span>
              <CurrencyValue value={totalPendienteING} />
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">Saldo Disponible</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Libre de cargas</div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--success)', marginBottom: '1.5rem' }}>
            <CurrencyValue value={totalDisponible} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Disponible Caixa</span>
              <CurrencyValue value={dispCaixa} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Disponible ING</span>
              <CurrencyValue value={dispING} />
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 className="card-title">Próximos Recibos Tarjetas</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Tarjeta</th>
                <th>Próx. Recibo</th>
                <th>Pendiente</th>
                <th>Disponible</th>
              </tr>
            </thead>
            <tbody>
              {dynamicCards.map(card => (
                <tr
                  key={card.id}
                  onClick={() => navigateToCard(card.id)}
                  className="clickable-row"
                  title={`Ver detalle de ${card.tarjeta} en Planificación`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigateToCard(card.id);
                    }
                  }}
                >
                  <td style={{ fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {card.tarjeta}
                    </div>
                  </td>
                  <td><CurrencyValue value={card.cuota} /></td>
                  <td style={{ color: 'var(--danger)' }}><CurrencyValue value={Math.abs(card.pendiente)} /></td>
                  <td style={{ color: 'var(--success)', fontWeight: 600 }}><CurrencyValue value={card.disponible} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title"><ArrowDownCircle size={24} color="var(--danger)" /> Desglose Pendientes</h2>
        
        {activeGroups.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>No hay gastos pendientes.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))`, gap: '2rem' }}>
            {activeGroups.map(([entidadName, lista]) => {
              const entidadColor = entities.find(e => e.name === entidadName)?.color || 'var(--text-main)';
              const totalEntidad = lista.reduce((sum, item) => sum + item.importe, 0);

              return (
                <div key={entidadName} style={{ background: 'var(--bg-main)', borderRadius: '8px', padding: '1rem', border: `1px solid ${entidadColor}30` }}>
                  <h3 style={{ margin: '0 0 1rem 0', color: entidadColor, fontSize: '1.1rem', display: 'flex', justifyContent: 'space-between' }}>
                    {entidadName}
                    <CurrencyValue value={totalEntidad} />
                  </h3>
                  <div className="table-container" style={{ margin: 0 }}>
                    <table style={{ fontSize: '0.875rem' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '40px', padding: '0.5rem' }}>Día</th>
                          <th style={{ padding: '0.5rem' }}>Concepto</th>
                          <th style={{ textAlign: 'right', padding: '0.5rem' }}>Importe</th>
                          <th style={{ textAlign: 'center', width: '70px', padding: '0.5rem' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lista.map(expense => (
                          <tr key={expense.id}>
                            <td style={{ padding: '0.5rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                              {expense.isFromPreviousMonth ? `${expense.dia} (Mes Ant.)` : expense.dia}
                            </td>
                            <td style={{ padding: '0.5rem' }}>{getLinkInfo(expense.concepto).concept}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--danger)', fontWeight: 600 }}>
                              <CurrencyValue value={expense.importe} />
                            </td>
                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                                <button
                                  className="btn"
                                  style={{
                                    padding: '0.25rem',
                                    background: 'var(--badge-p-bg)',
                                    color: 'var(--success)',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  title="Marcar como Pagado"
                                  onClick={() => handleMarkAsPaid(expense)}
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  className="btn"
                                  style={{
                                    padding: '0.25rem',
                                    background: 'var(--card-bg, rgba(255,255,255,0.05))',
                                    color: 'var(--text-muted)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  title="Editar gasto"
                                  onClick={() => openExpenseModal(expense)}
                                >
                                  <Pencil size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Editar Gasto */}
      <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title="Editar Gasto">
        <form onSubmit={saveExpense}>
          <div className="form-group">
            <label>Día</label>
            <input 
              type="number" 
              className="input" 
              value={formData.dia} 
              onChange={e => setFormData({ ...formData, dia: parseIntNum(e.target.value) })} 
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
              value={formData.concepto} 
              onChange={e => setFormData({ ...formData, concepto: e.target.value })} 
              required 
            />
          </div>
          <div className="form-group">
            <label>Importe (€)</label>
            <input 
              type="text" 
              inputMode="decimal" 
              className="input" 
              value={formData.importe} 
              onChange={e => setFormData({ ...formData, importe: normalizeDecimalInput(e.target.value) })} 
              onKeyDown={onNumKeyDown} 
              placeholder="0,00" 
              required 
            />
          </div>
          <div className="form-group">
            <label>Entidad</label>
            <select 
              className="input" 
              value={formData.entidad} 
              onChange={e => setFormData({ ...formData, entidad: e.target.value })} 
              required
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
              value={formData.estado} 
              onChange={e => setFormData({ ...formData, estado: e.target.value })}
            >
              <option value="X">Pendiente</option>
              <option value="P">Pagado</option>
              <option value="-">No aplica</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Vincular a Préstamo</label>
            <select 
              className="input" 
              value={formData.loanId || ''} 
              onChange={e => setFormData({ ...formData, loanId: e.target.value, cardId: '' })}
            >
              <option value="">Ninguno</option>
              {loans.map(l => (
                <option key={l.id} value={l.id}>{l.entidad} (Cuota: {l.cuota} €)</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Vincular a Tarjeta</label>
            <select 
              className="input" 
              value={formData.cardId || ''} 
              onChange={e => setFormData({ ...formData, cardId: e.target.value, loanId: '' })}
            >
              <option value="">Ninguna</option>
              {cards.map(c => (
                <option key={c.id} value={c.id}>{c.tarjeta} (Pendiente: {c.pendiente} €)</option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            Guardar Gasto
          </button>
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
