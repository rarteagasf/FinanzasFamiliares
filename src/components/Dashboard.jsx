import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { ArrowDownCircle, Pencil, Check, Trash2, ExternalLink } from 'lucide-react';
import { formatCurrency, formatInputDecimal, normalizeDecimalInput, parseNum, getLinkInfo, getCardEntity } from '../utils';
import CurrencyValue from './ui/CurrencyValue';
import Modal from './ui/Modal';
import ExpenseFormModal from './ui/ExpenseFormModal';
import { toast } from 'sonner';

export default function Dashboard() {
  const { balances, expenses, prevPendingExpenses = [], cards = [], entities, updateBalance, addExpense, updateExpense, deleteExpense, getDynamicCards, getUnlistedCardReceipts, navigateToCard } = useStore();
  const [editingAccount, setEditingAccount] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Editing Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // Confirmation State
  const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const handleMarkAsPaid = (expense) => {
    if (expense.isCardReceipt) {
      const card = cards.find(c => c.id === expense.cardId);
      const cardName = card?.tarjeta || expense.concepto;
      setConfirmState({
        isOpen: true,
        title: 'Confirmar pago de recibo',
        message: `¿Estás seguro de registrar como "Pagado" el recibo de "${cardName}" (${formatCurrency(expense.importe)}) en ${expense.entidad}?`,
        onConfirm: async () => {
          const res = await addExpense({
            dia: new Date().getDate(),
            concepto: `${cardName} [card:${expense.cardId}]`,
            importe: expense.importe,
            entidad: expense.entidad,
            estado: 'P'
          });
          if (res?.savedLocally) {
            toast.info('Recibo de tarjeta registrado como pagado en el dispositivo');
          } else if (!res?.error) {
            toast.success('Recibo de tarjeta registrado como pagado');
          } else {
            toast.error('Error al registrar pago: ' + (res.error?.message || 'Error en el servidor'));
          }
        }
      });
      return;
    }

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

  const handleDeleteExpense = (expense) => {
    const cleanConcept = getLinkInfo(expense.concepto).concept;
    setConfirmState({
      isOpen: true,
      title: 'Confirmar eliminación',
      message: `¿Estás seguro de eliminar el gasto "${cleanConcept}" (${formatCurrency(expense.importe)})?`,
      onConfirm: async () => {
        const res = await deleteExpense(expense.id);
        if (res?.savedLocally) {
          toast.info('Gasto eliminado en el dispositivo');
        } else if (!res?.error) {
          toast.success('Gasto eliminado');
        } else {
          toast.error('Error al eliminar: ' + (res.error?.message || 'Error en el servidor'));
        }
      }
    });
  };

  const openExpenseModal = (expense) => {
    setEditingExpense(expense);
    setIsExpenseModalOpen(true);
  };

  const saveExpense = async (saveData) => {
    if (!editingExpense) return;

    setConfirmState({
      isOpen: true,
      title: 'Confirmar actualización',
      message: `¿Estás seguro de guardar los cambios para el gasto "${saveData.concepto}"?`,
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
        setEditingExpense(null);
      }
    });
  };

  const dynamicCards = useMemo(() => {
    return getDynamicCards();
  }, [getDynamicCards]);

  const unlistedCardReceipts = useMemo(() => {
    return getUnlistedCardReceipts ? getUnlistedCardReceipts() : [];
  }, [getUnlistedCardReceipts]);

  const {
    totalSaldos,
    totalPendienteCaixa,
    totalPendienteING,
    totalGastosPendientes,
    dispCaixa,
    dispING,
    totalDisponible
  } = useMemo(() => {
    const unlistedCaixaCards = unlistedCardReceipts
      .filter(r => r.entidad === 'CAIXABANK')
      .reduce((acc, curr) => acc + curr.importe, 0);

    const unlistedINGCards = unlistedCardReceipts
      .filter(r => r.entidad === 'ING')
      .reduce((acc, curr) => acc + curr.importe, 0);

    const totSaldos = (balances.caixabank || 0) + (balances.hucha || 0) + (balances.ing_nomina || 0) + (balances.ing_naranja || 0);

    const totPendienteCaixa = expenses
      .filter(e => e.estado === 'X' && e.entidad === 'CAIXABANK')
      .reduce((acc, curr) => acc + curr.importe, 0)
      + prevPendingExpenses
      .filter(e => e.estado === 'X' && e.entidad === 'CAIXABANK')
      .reduce((acc, curr) => acc + curr.importe, 0)
      + unlistedCaixaCards;
      
    const totPendienteING = expenses
      .filter(e => e.estado === 'X' && e.entidad === 'ING')
      .reduce((acc, curr) => acc + curr.importe, 0)
      + prevPendingExpenses
      .filter(e => e.estado === 'X' && e.entidad === 'ING')
      .reduce((acc, curr) => acc + curr.importe, 0)
      + unlistedINGCards;

    const totGastosPendientes = totPendienteCaixa + totPendienteING;
    const dCaixa = (balances.caixabank || 0) - totPendienteCaixa;
    const dING = (balances.ing_nomina || 0) - totPendienteING;
    const totDisponible = dCaixa + dING + (balances.ing_naranja || 0) + (balances.hucha || 0);

    return {
      totalSaldos: totSaldos,
      totalPendienteCaixa: totPendienteCaixa,
      totalPendienteING: totPendienteING,
      totalGastosPendientes: totGastosPendientes,
      dispCaixa: dCaixa,
      dispING: dING,
      totalDisponible: totDisponible
    };
  }, [balances, expenses, prevPendingExpenses, unlistedCardReceipts]);

  const activeGroups = useMemo(() => {
    const pendingExpenses = [
      ...expenses.filter(e => e.estado === 'X'),
      ...prevPendingExpenses,
      ...unlistedCardReceipts
    ].sort((a, b) => {
      if (a.isFromPreviousMonth && !b.isFromPreviousMonth) return -1;
      if (!a.isFromPreviousMonth && b.isFromPreviousMonth) return 1;
      return a.dia - b.dia;
    });

    const groupedPendientes = {};
    entities.forEach(ent => { groupedPendientes[ent.name] = []; });
    
    pendingExpenses.forEach(exp => {
      if (!groupedPendientes[exp.entidad]) groupedPendientes[exp.entidad] = [];
      groupedPendientes[exp.entidad].push(exp);
    });

    return Object.entries(groupedPendientes).filter(([, list]) => list.length > 0);
  }, [expenses, prevPendingExpenses, unlistedCardReceipts, entities]);

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {card.tarjeta}
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '0.1rem 0.35rem',
                        borderRadius: '4px',
                        background: getCardEntity(card) === 'ING' ? 'rgba(179, 91, 55, 0.12)' : 'rgba(54, 78, 85, 0.12)',
                        color: getCardEntity(card) === 'ING' ? 'var(--ing)' : 'var(--caixabank)',
                        fontWeight: 600
                      }}>
                        {getCardEntity(card)}
                      </span>
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
                          <th style={{ textAlign: 'center', width: '100px', padding: '0.5rem' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lista.map(expense => (
                          <tr key={expense.id}>
                            <td style={{ padding: '0.5rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                              {expense.isCardReceipt ? (
                                <span style={{
                                  fontSize: '0.68rem',
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '4px',
                                  background: 'rgba(59, 130, 246, 0.12)',
                                  color: 'var(--primary)',
                                  fontWeight: 600
                                }}>
                                  Tarj.
                                </span>
                              ) : expense.isFromPreviousMonth ? (
                                `${expense.dia} (Mes Ant.)`
                              ) : (
                                expense.dia
                              )}
                            </td>
                            <td style={{ padding: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <span>{getLinkInfo(expense.concepto).concept}</span>
                                {expense.isCardReceipt && (
                                  <span
                                    style={{
                                      cursor: 'pointer',
                                      fontSize: '0.72rem',
                                      color: 'var(--text-muted)',
                                      textDecoration: 'underline'
                                    }}
                                    onClick={() => navigateToCard(expense.cardId)}
                                    title="Ver tarjeta en Planificación"
                                  >
                                    (Ver Tarjeta)
                                  </span>
                                )}
                              </div>
                            </td>
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
                                  title={expense.isCardReceipt ? "Registrar recibo como Pagado" : "Marcar como Pagado"}
                                  onClick={() => handleMarkAsPaid(expense)}
                                >
                                  <Check size={14} />
                                </button>
                                {expense.isCardReceipt ? (
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
                                    title="Gestionar tarjeta en Planificación"
                                    onClick={() => navigateToCard(expense.cardId)}
                                  >
                                    <ExternalLink size={14} />
                                  </button>
                                ) : (
                                  <>
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
                                    <button
                                      className="btn"
                                      style={{
                                        padding: '0.25rem',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        color: 'var(--danger)',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}
                                      title="Eliminar gasto"
                                      onClick={() => handleDeleteExpense(expense)}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                )}
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

      {/* Modal Editar Gasto (Unificado) */}
      <ExpenseFormModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        onSubmit={saveExpense}
        initialData={editingExpense}
        title="Editar Gasto"
      />

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
