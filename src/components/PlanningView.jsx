import { useState } from 'react';
import { useStore } from '../store/useStore';
import { parseNum, parseIntNum, normalizeDecimalInput, formatCurrency, formatNumber, formatInputDecimal, formatShortDate, getLinkInfo } from '../utils';
import { Plus, Edit2, Trash2, Check, X as XIcon } from 'lucide-react';
import CurrencyValue from './ui/CurrencyValue';
import Modal from './ui/Modal';
import { toast } from 'sonner';

export default function PlanningView() {
  const { loans, cards, expenses, addLoan, updateLoan, deleteLoan, addCard, updateCard, deleteCard } = useStore();

  // Modals state for NEW items only
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  // Forms state for NEW items
  const [loanForm, setLoanForm] = useState({ entidad: '', capital_inicial: 0, total_a_pagar: 0, fecha_inicial: '', fecha_final: '', cuotas: 0, interes: 0, cuota: 0, faltan: 0, pendiente: 0 });
  const [cardForm, setCardForm] = useState({ tarjeta: '', credito: 0, cuota: 0, pendiente: 0, disponible: 0 });

  // Inline Editing States
  const [editingLoanId, setEditingLoanId] = useState(null);
  const [inlineLoanForm, setInlineLoanForm] = useState({});
  
  const [editingCardId, setEditingCardId] = useState(null);
  const [inlineCardForm, setInlineCardForm] = useState({});

  // Dynamic loan values (considering payments made in the current month)
  const dynamicLoans = loans.map(loan => {
    const paidExpense = expenses.find(e => {
      if (e.estado !== 'P') return false;
      const { loanId } = getLinkInfo(e.concepto);
      return loanId === loan.id;
    });

    if (paidExpense) {
      const nextFaltan = Math.max(0, loan.faltan - 1);
      const nextPendiente = Math.max(0, loan.pendiente - loan.cuota);
      return {
        ...loan,
        faltan: nextFaltan,
        pendiente: nextPendiente,
        isPaidThisMonth: true,
      };
    }

    return {
      ...loan,
      isPaidThisMonth: false,
    };
  });

  // Dynamic card values (considering payments made in the current month)
  const dynamicCards = cards.map(card => {
    const paidAmount = expenses
      .filter(e => {
        if (e.estado !== 'P') return false;
        const { cardId } = getLinkInfo(e.concepto);
        return cardId === card.id;
      })
      .reduce((sum, e) => sum + e.importe, 0);

    if (paidAmount > 0) {
      const nextPendiente = Math.max(0, card.pendiente - paidAmount);
      const nextDisponible = card.credito - nextPendiente;
      return {
        ...card,
        pendiente: nextPendiente,
        disponible: nextDisponible,
        isPaidThisMonth: true,
        paidAmount,
      };
    }

    return {
      ...card,
      isPaidThisMonth: false,
      paidAmount: 0,
    };
  });

  // Totals Loans
  const totalPrestamosCapital = dynamicLoans.reduce((acc, curr) => acc + curr.capital_inicial, 0);
  const totalPrestamosTotal = dynamicLoans.reduce((acc, curr) => acc + (curr.total_a_pagar || 0), 0);
  const totalPrestamosCuota = dynamicLoans.reduce((acc, curr) => acc + curr.cuota, 0);
  const totalPrestamosPendiente = dynamicLoans.reduce((acc, curr) => acc + curr.pendiente, 0);

  // Totals Cards
  const totalTarjetasCredito = dynamicCards.reduce((acc, curr) => acc + curr.credito, 0);
  const totalTarjetasCuota = dynamicCards.reduce((acc, curr) => acc + curr.cuota, 0);
  const totalTarjetasPendiente = dynamicCards.reduce((acc, curr) => acc + Math.abs(curr.pendiente), 0);
  const totalTarjetasDisponible = dynamicCards.reduce((acc, curr) => acc + curr.disponible, 0);

  // --- LOANS ADD ---
  const openLoanModal = () => {
    setLoanForm({ entidad: '', capital_inicial: 0, total_a_pagar: 0, fecha_inicial: '', fecha_final: '', cuotas: 0, interes: 0, cuota: 0, faltan: 0, pendiente: 0 });
    setIsLoanModalOpen(true);
  };

  const saveNewLoan = async (e) => {
    e.preventDefault();
    const { error } = await addLoan(loanForm);
    if (!error) toast.success('Préstamo añadido');
    else toast.error('Error al añadir');
    setIsLoanModalOpen(false);
  };

  const handleLoanDelete = async (id) => {
    const { error } = await deleteLoan(id);
    if (!error) toast.success('Préstamo eliminado');
  };

  // --- LOANS INLINE EDITING ---
  const startLoanEdit = (loan) => {
    const baselineLoan = loans.find(l => l.id === loan.id) || loan;
    setEditingLoanId(baselineLoan.id);
    setInlineLoanForm({
      ...baselineLoan,
      capital_inicial: formatInputDecimal(baselineLoan.capital_inicial),
      total_a_pagar: formatInputDecimal(baselineLoan.total_a_pagar || 0),
      interes: formatInputDecimal(baselineLoan.interes || 0),
      cuota: formatInputDecimal(baselineLoan.cuota),
      pendiente: formatInputDecimal(baselineLoan.pendiente),
    });
  };
  const saveInlineLoan = async () => {
    const saveData = {
      ...inlineLoanForm,
      cuotas: parseIntNum(inlineLoanForm.cuotas),
      faltan: parseIntNum(inlineLoanForm.faltan),
      capital_inicial: parseNum(inlineLoanForm.capital_inicial),
      total_a_pagar: parseNum(inlineLoanForm.total_a_pagar),
      interes: parseNum(inlineLoanForm.interes),
      cuota: parseNum(inlineLoanForm.cuota),
      pendiente: parseNum(inlineLoanForm.pendiente),
    };
    const { error } = await updateLoan(editingLoanId, saveData);
    if (!error) { toast.success('Guardado'); setEditingLoanId(null); }
    else toast.error('Error al guardar');
  };

  // --- CARDS ADD ---
  const openCardModal = () => {
    setCardForm({ tarjeta: '', credito: 0, cuota: 0, pendiente: 0, disponible: 0 });
    setIsCardModalOpen(true);
  };

  const handleNewCardChange = (field, value) => {
    let numVal = parseNum(normalizeDecimalInput(value));
    let newForm = { ...cardForm, [field]: numVal };
    if (field === 'credito') newForm.disponible = numVal - newForm.pendiente;
    else if (field === 'pendiente') {
      newForm.disponible = newForm.credito - numVal;
      if (newForm.cuota === 0) newForm.cuota = numVal;
    } 
    else if (field === 'disponible') newForm.pendiente = newForm.credito - numVal;
    setCardForm(newForm);
  };

  const saveNewCard = async (e) => {
    e.preventDefault();
    const saveForm = { ...cardForm, pendiente: Math.abs(cardForm.pendiente) }; 
    const { error } = await addCard(saveForm);
    if (!error) toast.success('Tarjeta añadida');
    else toast.error('Error al añadir');
    setIsCardModalOpen(false);
  };

  const handleCardDelete = async (id) => {
    const { error } = await deleteCard(id);
    if (!error) toast.success('Tarjeta eliminada');
  };

  // --- CARDS INLINE EDITING ---
  const startCardEdit = (card) => {
    const baselineCard = cards.find(c => c.id === card.id) || card;
    setEditingCardId(baselineCard.id);
    setInlineCardForm({
      ...baselineCard,
      pendiente: formatInputDecimal(Math.abs(baselineCard.pendiente)),
      credito: formatInputDecimal(baselineCard.credito),
      cuota: formatInputDecimal(baselineCard.cuota),
      disponible: formatInputDecimal(baselineCard.disponible),
    });
  };

  const handleInlineCardChange = (field, value) => {
    let cleaned = normalizeDecimalInput(value);
    let numVal = parseNum(cleaned);
    let newForm = { ...inlineCardForm, [field]: cleaned };
    let creditoVal = field === 'credito' ? numVal : parseNum(inlineCardForm.credito);
    let pendienteVal = field === 'pendiente' ? numVal : parseNum(inlineCardForm.pendiente);
    let disponibleVal = field === 'disponible' ? numVal : parseNum(inlineCardForm.disponible);
    if (field === 'credito') newForm.disponible = formatInputDecimal(numVal - pendienteVal);
    else if (field === 'pendiente') newForm.disponible = formatInputDecimal(creditoVal - numVal);
    else if (field === 'disponible') newForm.pendiente = formatInputDecimal(creditoVal - numVal);
    setInlineCardForm(newForm);
  };

  const saveInlineCard = async () => {
    const saveForm = {
      ...inlineCardForm,
      credito: parseNum(inlineCardForm.credito),
      pendiente: Math.abs(parseNum(inlineCardForm.pendiente)),
      cuota: parseNum(inlineCardForm.cuota),
      disponible: parseNum(inlineCardForm.disponible),
    };
    const { error } = await updateCard(editingCardId, saveForm);
    if (!error) { toast.success('Guardado'); setEditingCardId(null); }
    else toast.error('Error al guardar');
  };

  return (
    <div className="planning-view">
      
      {/* Préstamos */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="card-title" style={{ margin: 0 }}>Préstamos</h2>
          <button className="btn btn-primary" onClick={openLoanModal}>
            <Plus size={16} /> Añadir Préstamo
          </button>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Entidad</th>
                <th>Cap. Inicial</th>
                <th className="hide-tablet">Total a Pagar</th>
                <th className="hide-tablet">Inicio</th>
                <th className="hide-tablet">Fin</th>
                <th>Cuotas</th>
                <th className="hide-tablet">Interés</th>
                <th>Cuota</th>
                <th>Faltan</th>
                <th>Pendiente</th>
                <th className="td-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {dynamicLoans.map(loan => {
                const isEditing = editingLoanId === loan.id;
                return (
                  <tr key={loan.id} onDoubleClick={() => !isEditing && startLoanEdit(loan)}>
                    {isEditing ? (
                      <>
                        <td><input type="text" className="input" style={{ width: '100%', padding: '0.25rem' }} value={inlineLoanForm.entidad} onChange={e => setInlineLoanForm({...inlineLoanForm, entidad: e.target.value})} onKeyDown={e => { if (e.key === 'Enter') saveInlineLoan(); if (e.key === 'Escape') setEditingLoanId(null); }} /></td>
                        <td><input type="text" inputMode="decimal" className="input" style={{ width: '80px', padding: '0.25rem' }} value={inlineLoanForm.capital_inicial} onChange={e => setInlineLoanForm({...inlineLoanForm, capital_inicial: normalizeDecimalInput(e.target.value)})} onKeyDown={e => { if (e.key === 'Enter') saveInlineLoan(); if (e.key === 'Escape') setEditingLoanId(null); }} /></td>
                        <td className="hide-tablet"><input type="text" inputMode="decimal" className="input" style={{ width: '80px', padding: '0.25rem' }} value={inlineLoanForm.total_a_pagar} onChange={e => setInlineLoanForm({...inlineLoanForm, total_a_pagar: normalizeDecimalInput(e.target.value)})} onKeyDown={e => { if (e.key === 'Enter') saveInlineLoan(); if (e.key === 'Escape') setEditingLoanId(null); }} /></td>
                        <td className="hide-tablet"><input type="date" className="input" style={{ width: '110px', padding: '0.25rem' }} value={inlineLoanForm.fecha_inicial} onChange={e => setInlineLoanForm({...inlineLoanForm, fecha_inicial: e.target.value})} onKeyDown={e => { if (e.key === 'Enter') saveInlineLoan(); if (e.key === 'Escape') setEditingLoanId(null); }} /></td>
                        <td className="hide-tablet"><input type="date" className="input" style={{ width: '110px', padding: '0.25rem' }} value={inlineLoanForm.fecha_final} onChange={e => setInlineLoanForm({...inlineLoanForm, fecha_final: e.target.value})} onKeyDown={e => { if (e.key === 'Enter') saveInlineLoan(); if (e.key === 'Escape') setEditingLoanId(null); }} /></td>
                        <td><input type="number" className="input" style={{ width: '50px', padding: '0.25rem' }} value={inlineLoanForm.cuotas} onChange={e => setInlineLoanForm({...inlineLoanForm, cuotas: parseIntNum(e.target.value)})} onKeyDown={e => { if (e.key === 'Enter') saveInlineLoan(); if (e.key === 'Escape') setEditingLoanId(null); }} /></td>
                        <td className="hide-tablet"><input type="text" inputMode="decimal" className="input" style={{ width: '50px', padding: '0.25rem' }} value={inlineLoanForm.interes} onChange={e => setInlineLoanForm({...inlineLoanForm, interes: normalizeDecimalInput(e.target.value)})} onKeyDown={e => { if (e.key === 'Enter') saveInlineLoan(); if (e.key === 'Escape') setEditingLoanId(null); }} /></td>
                        <td><input type="text" inputMode="decimal" className="input" style={{ width: '70px', padding: '0.25rem' }} value={inlineLoanForm.cuota} onChange={e => setInlineLoanForm({...inlineLoanForm, cuota: normalizeDecimalInput(e.target.value)})} onKeyDown={e => { if (e.key === 'Enter') saveInlineLoan(); if (e.key === 'Escape') setEditingLoanId(null); }} /></td>
                        <td><input type="number" className="input" style={{ width: '50px', padding: '0.25rem' }} value={inlineLoanForm.faltan} onChange={e => setInlineLoanForm({...inlineLoanForm, faltan: parseIntNum(e.target.value)})} onKeyDown={e => { if (e.key === 'Enter') saveInlineLoan(); if (e.key === 'Escape') setEditingLoanId(null); }} /></td>
                        <td><input type="text" inputMode="decimal" className="input" style={{ width: '80px', padding: '0.25rem' }} value={inlineLoanForm.pendiente} onChange={e => setInlineLoanForm({...inlineLoanForm, pendiente: normalizeDecimalInput(e.target.value)})} onKeyDown={e => { if (e.key === 'Enter') saveInlineLoan(); if (e.key === 'Escape') setEditingLoanId(null); }} /></td>
                        <td className="td-actions">
                          <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                            <button className="btn" style={{ padding: '0.25rem', background: 'transparent' }} onClick={saveInlineLoan}><Check size={16} color="var(--success)" /></button>
                            <button className="btn" style={{ padding: '0.25rem', background: 'transparent' }} onClick={() => setEditingLoanId(null)}><XIcon size={16} color="var(--danger)" /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="fw-600">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            {loan.entidad}
                            {loan.isPaidThisMonth && (
                              <span style={{
                                fontSize: '0.65rem',
                                padding: '0.1rem 0.4rem',
                                background: 'var(--badge-p-bg)',
                                color: 'var(--success)',
                                borderRadius: '9999px',
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap'
                              }}>
                                Pagado
                              </span>
                            )}
                          </div>
                        </td>
                        <td><CurrencyValue value={loan.capital_inicial} /></td>
                        <td className="hide-tablet"><CurrencyValue value={loan.total_a_pagar || 0} /></td>
                        <td className="hide-tablet">{formatShortDate(loan.fecha_inicial)}</td>
                        <td className="hide-tablet">{formatShortDate(loan.fecha_final)}</td>
                        <td>{formatNumber(loan.cuotas)}</td>
                        <td className="hide-tablet">{formatNumber(loan.interes || 0, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%</td>
                        <td><CurrencyValue value={loan.cuota} /></td>
                        <td>{formatNumber(loan.faltan)}</td>
                        <td className="fw-600"><CurrencyValue value={loan.pendiente} /></td>
                        <td className="td-actions">
                          <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                            <button className="btn" style={{ padding: '0.25rem', background: 'transparent' }} title="Editar Inline" onClick={() => startLoanEdit(loan)}>
                              <Edit2 size={16} color="var(--text-muted)" />
                            </button>
                            <button className="btn" style={{ padding: '0.25rem', background: 'transparent' }} onClick={() => handleLoanDelete(loan.id)}>
                              <Trash2 size={16} color="var(--danger)" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
              <tr style={{ background: 'var(--table-total-bg)', fontWeight: 700 }}>
                <td>TOTAL</td>
                <td><CurrencyValue value={totalPrestamosCapital} /></td>
                <td className="hide-tablet"><CurrencyValue value={totalPrestamosTotal} /></td>
                <td className="hide-tablet"></td>
                <td className="hide-tablet"></td>
                <td></td>
                <td className="hide-tablet"></td>
                <td><CurrencyValue value={totalPrestamosCuota} /></td>
                <td></td>
                <td><CurrencyValue value={totalPrestamosPendiente} /></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tarjetas */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="card-title" style={{ margin: 0 }}>Tarjetas</h2>
          <button className="btn btn-primary" onClick={openCardModal}>
            <Plus size={16} /> Añadir Tarjeta
          </button>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Tarjeta</th>
                <th>Crédito</th>
                <th>Próx. Recibo (Cuota)</th>
                <th>Pendiente</th>
                <th>Disponible</th>
                <th className="td-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {dynamicCards.map(card => {
                const isEditing = editingCardId === card.id;
                return (
                <tr key={card.id} onDoubleClick={() => !isEditing && startCardEdit(card)}>
                  {isEditing ? (
                    <>
                      <td><input type="text" className="input" style={{ width: '100%', padding: '0.25rem' }} value={inlineCardForm.tarjeta} onChange={e => setInlineCardForm({...inlineCardForm, tarjeta: e.target.value})} onKeyDown={e => { if (e.key === 'Enter') saveInlineCard(); if (e.key === 'Escape') setEditingCardId(null); }} /></td>
                      <td><input type="text" inputMode="decimal" className="input" style={{ width: '100px', padding: '0.25rem' }} value={inlineCardForm.credito} onChange={e => handleInlineCardChange('credito', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveInlineCard(); if (e.key === 'Escape') setEditingCardId(null); }} /></td>
                      <td><input type="text" inputMode="decimal" className="input" style={{ width: '100px', padding: '0.25rem' }} value={inlineCardForm.cuota} onChange={e => handleInlineCardChange('cuota', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveInlineCard(); if (e.key === 'Escape') setEditingCardId(null); }} /></td>
                      <td><input type="text" inputMode="decimal" className="input" style={{ width: '100px', padding: '0.25rem', color: 'var(--danger)' }} value={inlineCardForm.pendiente} onChange={e => handleInlineCardChange('pendiente', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveInlineCard(); if (e.key === 'Escape') setEditingCardId(null); }} /></td>
                      <td><input type="text" inputMode="decimal" className="input" style={{ width: '100px', padding: '0.25rem', color: 'var(--success)' }} value={inlineCardForm.disponible} onChange={e => handleInlineCardChange('disponible', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveInlineCard(); if (e.key === 'Escape') setEditingCardId(null); }} /></td>
                      <td className="td-actions">
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                          <button className="btn" style={{ padding: '0.25rem', background: 'transparent' }} onClick={saveInlineCard}><Check size={16} color="var(--success)" /></button>
                          <button className="btn" style={{ padding: '0.25rem', background: 'transparent' }} onClick={() => setEditingCardId(null)}><XIcon size={16} color="var(--danger)" /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {card.tarjeta}
                          {card.isPaidThisMonth && (
                            <span style={{
                              fontSize: '0.65rem',
                              padding: '0.1rem 0.4rem',
                              background: 'var(--badge-p-bg)',
                              color: 'var(--success)',
                              borderRadius: '9999px',
                              fontWeight: 'bold',
                              whiteSpace: 'nowrap'
                            }} title={`Se ha pagado un total de ${card.paidAmount.toFixed(2)} €`}>
                              Pagado
                            </span>
                          )}
                        </div>
                      </td>
                      <td><CurrencyValue value={card.credito} /></td>
                      <td><CurrencyValue value={card.cuota} /></td>
                      <td style={{ color: 'var(--danger)', fontWeight: 600 }}><CurrencyValue value={Math.abs(card.pendiente)} /></td>
                      <td style={{ color: 'var(--success)', fontWeight: 600 }}><CurrencyValue value={card.disponible} /></td>
                      <td className="td-actions">
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                          <button className="btn" style={{ padding: '0.25rem', background: 'transparent' }} onClick={() => startCardEdit(card)}>
                            <Edit2 size={16} color="var(--text-muted)" />
                          </button>
                          <button className="btn" style={{ padding: '0.25rem', background: 'transparent' }} onClick={() => handleCardDelete(card.id)}>
                            <Trash2 size={16} color="var(--danger)" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              )})}
              <tr style={{ background: 'var(--table-total-bg)', fontWeight: 700 }}>
                <td>TOTAL</td>
                <td><CurrencyValue value={totalTarjetasCredito} /></td>
                <td><CurrencyValue value={totalTarjetasCuota} /></td>
                <td style={{ color: 'var(--danger)' }}><CurrencyValue value={totalTarjetasPendiente} /></td>
                <td style={{ color: 'var(--success)' }}><CurrencyValue value={totalTarjetasDisponible} /></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo Préstamo */}
      <Modal isOpen={isLoanModalOpen} onClose={() => setIsLoanModalOpen(false)} title="Nuevo Préstamo">
        <form onSubmit={saveNewLoan}>
          <div className="form-group"><label>Entidad / Concepto</label><input type="text" className="input" value={loanForm.entidad} onChange={e => setLoanForm({...loanForm, entidad: e.target.value})} required /></div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}><label>Capital Inicial</label><input type="text" inputMode="decimal" className="input" value={formatInputDecimal(loanForm.capital_inicial)} onChange={e => setLoanForm({...loanForm, capital_inicial: parseNum(normalizeDecimalInput(e.target.value))})} required /></div>
            <div className="form-group" style={{ flex: 1 }}><label>Total a Pagar</label><input type="text" inputMode="decimal" className="input" value={formatInputDecimal(loanForm.total_a_pagar)} onChange={e => setLoanForm({...loanForm, total_a_pagar: parseNum(normalizeDecimalInput(e.target.value))})} required /></div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}><label>Fecha Inicial</label><input type="date" className="input" value={loanForm.fecha_inicial} onChange={e => setLoanForm({...loanForm, fecha_inicial: e.target.value})} /></div>
            <div className="form-group" style={{ flex: 1 }}><label>Fecha Final</label><input type="date" className="input" value={loanForm.fecha_final} onChange={e => setLoanForm({...loanForm, fecha_final: e.target.value})} /></div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}><label>Cuotas Totales</label><input type="number" className="input" value={loanForm.cuotas} onChange={e => setLoanForm({...loanForm, cuotas: parseIntNum(e.target.value)})} required /></div>
            <div className="form-group" style={{ flex: 1 }}><label>Interés (%)</label><input type="text" inputMode="decimal" className="input" value={formatInputDecimal(loanForm.interes)} onChange={e => setLoanForm({...loanForm, interes: parseNum(normalizeDecimalInput(e.target.value))})} required /></div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}><label>Cuota Mensual</label><input type="text" inputMode="decimal" className="input" value={formatInputDecimal(loanForm.cuota)} onChange={e => setLoanForm({...loanForm, cuota: parseNum(normalizeDecimalInput(e.target.value))})} required /></div>
            <div className="form-group" style={{ flex: 1 }}><label>Faltan</label><input type="number" className="input" value={loanForm.faltan} onChange={e => setLoanForm({...loanForm, faltan: parseIntNum(e.target.value)})} required /></div>
          </div>
          <div className="form-group"><label>Capital Pendiente</label><input type="text" inputMode="decimal" className="input" value={formatInputDecimal(loanForm.pendiente)} onChange={e => setLoanForm({...loanForm, pendiente: parseNum(normalizeDecimalInput(e.target.value))})} required /></div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Crear Préstamo</button>
        </form>
      </Modal>

      {/* Modal Nueva Tarjeta */}
      <Modal isOpen={isCardModalOpen} onClose={() => setIsCardModalOpen(false)} title="Nueva Tarjeta">
        <form onSubmit={saveNewCard}>
          <div className="form-group"><label>Nombre Tarjeta</label><input type="text" className="input" value={cardForm.tarjeta} onChange={e => setCardForm({...cardForm, tarjeta: e.target.value})} required /></div>
          <div className="form-group"><label>Crédito Total</label><input type="text" inputMode="decimal" className="input" value={formatInputDecimal(cardForm.credito)} onChange={e => handleNewCardChange('credito', e.target.value)} required /></div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}><label>Pendiente (Ocupado)</label><input type="text" inputMode="decimal" className="input" value={formatInputDecimal(cardForm.pendiente)} onChange={e => handleNewCardChange('pendiente', e.target.value)} required /></div>
            <div className="form-group" style={{ flex: 1 }}><label>Disponible</label><input type="text" inputMode="decimal" className="input" value={formatInputDecimal(cardForm.disponible)} onChange={e => handleNewCardChange('disponible', e.target.value)} required /></div>
          </div>
          <div className="form-group"><label>Próximo Recibo (Cuota)</label><input type="text" inputMode="decimal" className="input" value={formatInputDecimal(cardForm.cuota)} onChange={e => handleNewCardChange('cuota', e.target.value)} required /></div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Crear Tarjeta</button>
        </form>
      </Modal>

    </div>
  );
}
