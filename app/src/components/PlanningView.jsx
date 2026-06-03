import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Landmark, CreditCard, Plus, Edit2, Trash2, Check, X as XIcon } from 'lucide-react';
import Modal from './ui/Modal';
import { toast } from 'sonner';

export default function PlanningView() {
  const { loans, cards, addLoan, updateLoan, deleteLoan, addCard, updateCard, deleteCard } = useStore();

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

  // Totals Loans
  const totalPrestamosCapital = loans.reduce((acc, curr) => acc + curr.capital_inicial, 0);
  const totalPrestamosTotal = loans.reduce((acc, curr) => acc + (curr.total_a_pagar || 0), 0);
  const totalPrestamosCuota = loans.reduce((acc, curr) => acc + curr.cuota, 0);
  const totalPrestamosPendiente = loans.reduce((acc, curr) => acc + curr.pendiente, 0);

  // Totals Cards
  const totalTarjetasCredito = cards.reduce((acc, curr) => acc + curr.credito, 0);
  const totalTarjetasCuota = cards.reduce((acc, curr) => acc + curr.cuota, 0);
  const totalTarjetasPendiente = cards.reduce((acc, curr) => acc + Math.abs(curr.pendiente), 0);
  const totalTarjetasDisponible = cards.reduce((acc, curr) => acc + curr.disponible, 0);

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
    setEditingLoanId(loan.id);
    setInlineLoanForm({ ...loan });
  };
  const saveInlineLoan = async () => {
    const { error } = await updateLoan(editingLoanId, inlineLoanForm);
    if (!error) { toast.success('Guardado'); setEditingLoanId(null); }
    else toast.error('Error al guardar');
  };

  // --- CARDS ADD ---
  const openCardModal = () => {
    setCardForm({ tarjeta: '', credito: 0, cuota: 0, pendiente: 0, disponible: 0 });
    setIsCardModalOpen(true);
  };

  const handleNewCardChange = (field, value) => {
    let numVal = parseFloat(value) || 0;
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
    setEditingCardId(card.id);
    setInlineCardForm({ ...card, pendiente: Math.abs(card.pendiente) });
  };

  const handleInlineCardChange = (field, value) => {
    let numVal = parseFloat(value) || 0;
    let newForm = { ...inlineCardForm, [field]: numVal };
    if (field === 'credito') newForm.disponible = numVal - newForm.pendiente;
    else if (field === 'pendiente') newForm.disponible = newForm.credito - numVal;
    else if (field === 'disponible') newForm.pendiente = newForm.credito - numVal;
    setInlineCardForm(newForm);
  };

  const saveInlineCard = async () => {
    const saveForm = { ...inlineCardForm, pendiente: Math.abs(inlineCardForm.pendiente) };
    const { error } = await updateCard(editingCardId, saveForm);
    if (!error) { toast.success('Guardado'); setEditingCardId(null); }
    else toast.error('Error al guardar');
  };

  return (
    <div className="planning-view">
      
      {/* Préstamos */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="card-title" style={{ margin: 0 }}><Landmark size={24} color="var(--primary)" /> Préstamos</h2>
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
              {loans.map(loan => {
                const isEditing = editingLoanId === loan.id;
                return (
                  <tr key={loan.id} onDoubleClick={() => !isEditing && startLoanEdit(loan)}>
                    {isEditing ? (
                      <>
                        <td><input type="text" className="input" style={{ width: '100%', padding: '0.25rem' }} value={inlineLoanForm.entidad} onChange={e => setInlineLoanForm({...inlineLoanForm, entidad: e.target.value})} /></td>
                        <td><input type="number" step="0.01" className="input" style={{ width: '80px', padding: '0.25rem' }} value={inlineLoanForm.capital_inicial} onChange={e => setInlineLoanForm({...inlineLoanForm, capital_inicial: parseFloat(e.target.value)})} /></td>
                        <td className="hide-tablet"><input type="number" step="0.01" className="input" style={{ width: '80px', padding: '0.25rem' }} value={inlineLoanForm.total_a_pagar} onChange={e => setInlineLoanForm({...inlineLoanForm, total_a_pagar: parseFloat(e.target.value)})} /></td>
                        <td className="hide-tablet"><input type="date" className="input" style={{ width: '110px', padding: '0.25rem' }} value={inlineLoanForm.fecha_inicial} onChange={e => setInlineLoanForm({...inlineLoanForm, fecha_inicial: e.target.value})} /></td>
                        <td className="hide-tablet"><input type="date" className="input" style={{ width: '110px', padding: '0.25rem' }} value={inlineLoanForm.fecha_final} onChange={e => setInlineLoanForm({...inlineLoanForm, fecha_final: e.target.value})} /></td>
                        <td><input type="number" className="input" style={{ width: '50px', padding: '0.25rem' }} value={inlineLoanForm.cuotas} onChange={e => setInlineLoanForm({...inlineLoanForm, cuotas: parseInt(e.target.value)})} /></td>
                        <td className="hide-tablet"><input type="number" step="0.01" className="input" style={{ width: '50px', padding: '0.25rem' }} value={inlineLoanForm.interes} onChange={e => setInlineLoanForm({...inlineLoanForm, interes: parseFloat(e.target.value)})} /></td>
                        <td><input type="number" step="0.01" className="input" style={{ width: '70px', padding: '0.25rem' }} value={inlineLoanForm.cuota} onChange={e => setInlineLoanForm({...inlineLoanForm, cuota: parseFloat(e.target.value)})} /></td>
                        <td><input type="number" className="input" style={{ width: '50px', padding: '0.25rem' }} value={inlineLoanForm.faltan} onChange={e => setInlineLoanForm({...inlineLoanForm, faltan: parseInt(e.target.value)})} /></td>
                        <td><input type="number" step="0.01" className="input" style={{ width: '80px', padding: '0.25rem' }} value={inlineLoanForm.pendiente} onChange={e => setInlineLoanForm({...inlineLoanForm, pendiente: parseFloat(e.target.value)})} /></td>
                        <td className="td-actions">
                          <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                            <button className="btn" style={{ padding: '0.25rem', background: 'transparent' }} onClick={saveInlineLoan}><Check size={16} color="var(--success)" /></button>
                            <button className="btn" style={{ padding: '0.25rem', background: 'transparent' }} onClick={() => setEditingLoanId(null)}><XIcon size={16} color="var(--danger)" /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="fw-600">{loan.entidad}</td>
                        <td>{loan.capital_inicial.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                        <td className="hide-tablet">{(loan.total_a_pagar || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                        <td className="hide-tablet">{loan.fecha_inicial}</td>
                        <td className="hide-tablet">{loan.fecha_final}</td>
                        <td>{loan.cuotas}</td>
                        <td className="hide-tablet">{loan.interes}%</td>
                        <td>{loan.cuota.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                        <td>{loan.faltan}</td>
                        <td className="fw-600">{loan.pendiente.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
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
                <td>{totalPrestamosCapital.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                <td className="hide-tablet">{totalPrestamosTotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                <td className="hide-tablet"></td>
                <td className="hide-tablet"></td>
                <td></td>
                <td className="hide-tablet"></td>
                <td>{totalPrestamosCuota.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                <td></td>
                <td>{totalPrestamosPendiente.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tarjetas */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="card-title" style={{ margin: 0 }}><CreditCard size={24} color="var(--warning)" /> Tarjetas</h2>
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
              {cards.map(card => {
                const isEditing = editingCardId === card.id;
                return (
                <tr key={card.id} onDoubleClick={() => !isEditing && startCardEdit(card)}>
                  {isEditing ? (
                    <>
                      <td><input type="text" className="input" style={{ width: '100%', padding: '0.25rem' }} value={inlineCardForm.tarjeta} onChange={e => setInlineCardForm({...inlineCardForm, tarjeta: e.target.value})} /></td>
                      <td><input type="number" step="0.01" className="input" style={{ width: '100px', padding: '0.25rem' }} value={inlineCardForm.credito} onChange={e => handleInlineCardChange('credito', e.target.value)} /></td>
                      <td><input type="number" step="0.01" className="input" style={{ width: '100px', padding: '0.25rem' }} value={inlineCardForm.cuota} onChange={e => handleInlineCardChange('cuota', e.target.value)} /></td>
                      <td><input type="number" step="0.01" className="input" style={{ width: '100px', padding: '0.25rem', color: 'var(--danger)' }} value={inlineCardForm.pendiente} onChange={e => handleInlineCardChange('pendiente', e.target.value)} /></td>
                      <td><input type="number" step="0.01" className="input" style={{ width: '100px', padding: '0.25rem', color: 'var(--success)' }} value={inlineCardForm.disponible} onChange={e => handleInlineCardChange('disponible', e.target.value)} /></td>
                      <td className="td-actions">
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                          <button className="btn" style={{ padding: '0.25rem', background: 'transparent' }} onClick={saveInlineCard}><Check size={16} color="var(--success)" /></button>
                          <button className="btn" style={{ padding: '0.25rem', background: 'transparent' }} onClick={() => setEditingCardId(null)}><XIcon size={16} color="var(--danger)" /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ fontWeight: 600 }}>{card.tarjeta}</td>
                      <td>{card.credito.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                      <td>{card.cuota.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                      <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{Math.abs(card.pendiente).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 600 }}>{card.disponible.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
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
                <td>{totalTarjetasCredito.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                <td>{totalTarjetasCuota.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                <td style={{ color: 'var(--danger)' }}>{totalTarjetasPendiente.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                <td style={{ color: 'var(--success)' }}>{totalTarjetasDisponible.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
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
            <div className="form-group" style={{ flex: 1 }}><label>Capital Inicial</label><input type="number" step="0.01" className="input" value={loanForm.capital_inicial} onChange={e => setLoanForm({...loanForm, capital_inicial: parseFloat(e.target.value)})} required /></div>
            <div className="form-group" style={{ flex: 1 }}><label>Total a Pagar</label><input type="number" step="0.01" className="input" value={loanForm.total_a_pagar} onChange={e => setLoanForm({...loanForm, total_a_pagar: parseFloat(e.target.value)})} required /></div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}><label>Fecha Inicial</label><input type="date" className="input" value={loanForm.fecha_inicial} onChange={e => setLoanForm({...loanForm, fecha_inicial: e.target.value})} /></div>
            <div className="form-group" style={{ flex: 1 }}><label>Fecha Final</label><input type="date" className="input" value={loanForm.fecha_final} onChange={e => setLoanForm({...loanForm, fecha_final: e.target.value})} /></div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}><label>Cuotas Totales</label><input type="number" className="input" value={loanForm.cuotas} onChange={e => setLoanForm({...loanForm, cuotas: parseInt(e.target.value)})} required /></div>
            <div className="form-group" style={{ flex: 1 }}><label>Interés (%)</label><input type="number" step="0.01" className="input" value={loanForm.interes} onChange={e => setLoanForm({...loanForm, interes: parseFloat(e.target.value)})} required /></div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}><label>Cuota Mensual</label><input type="number" step="0.01" className="input" value={loanForm.cuota} onChange={e => setLoanForm({...loanForm, cuota: parseFloat(e.target.value)})} required /></div>
            <div className="form-group" style={{ flex: 1 }}><label>Faltan</label><input type="number" className="input" value={loanForm.faltan} onChange={e => setLoanForm({...loanForm, faltan: parseInt(e.target.value)})} required /></div>
          </div>
          <div className="form-group"><label>Capital Pendiente</label><input type="number" step="0.01" className="input" value={loanForm.pendiente} onChange={e => setLoanForm({...loanForm, pendiente: parseFloat(e.target.value)})} required /></div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Crear Préstamo</button>
        </form>
      </Modal>

      {/* Modal Nueva Tarjeta */}
      <Modal isOpen={isCardModalOpen} onClose={() => setIsCardModalOpen(false)} title="Nueva Tarjeta">
        <form onSubmit={saveNewCard}>
          <div className="form-group"><label>Nombre Tarjeta</label><input type="text" className="input" value={cardForm.tarjeta} onChange={e => setCardForm({...cardForm, tarjeta: e.target.value})} required /></div>
          <div className="form-group"><label>Crédito Total</label><input type="number" step="0.01" className="input" value={cardForm.credito} onChange={e => handleNewCardChange('credito', e.target.value)} required /></div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}><label>Pendiente (Ocupado)</label><input type="number" step="0.01" className="input" value={cardForm.pendiente} onChange={e => handleNewCardChange('pendiente', e.target.value)} required /></div>
            <div className="form-group" style={{ flex: 1 }}><label>Disponible</label><input type="number" step="0.01" className="input" value={cardForm.disponible} onChange={e => handleNewCardChange('disponible', e.target.value)} required /></div>
          </div>
          <div className="form-group"><label>Próximo Recibo (Cuota)</label><input type="number" step="0.01" className="input" value={cardForm.cuota} onChange={e => handleNewCardChange('cuota', e.target.value)} required /></div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Crear Tarjeta</button>
        </form>
      </Modal>

    </div>
  );
}
