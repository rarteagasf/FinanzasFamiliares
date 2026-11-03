import { useState } from 'react';
import { Calculator } from 'lucide-react';
import Modal from './Modal';
import { useStore } from '../../store/useStore';
import { parseIntNum, parseNum, normalizeDecimalInput, onNumKeyDown, formatInputDecimal, getLinkInfo, setLinkInfo } from '../../utils';

function getInitialFormData(initialData, entities, loans, cards) {
  if (!initialData) {
    return {
      dia: new Date().getDate(),
      concepto: '',
      importe: '',
      entidad: entities?.[0]?.name || 'CAIXABANK',
      estado: 'X',
      loanId: '',
      cardId: ''
    };
  }

  const linkInfo = getLinkInfo(initialData.concepto);
  const resolvedLoan = linkInfo.loanId
    ? loans.find(l => l.id === linkInfo.loanId)
    : null;
  const resolvedCard = linkInfo.cardId
    ? cards.find(c => c.id === linkInfo.cardId)
    : null;

  return {
    dia: initialData.dia !== undefined ? initialData.dia : new Date().getDate(),
    concepto: linkInfo.concept || initialData.concepto || '',
    importe: initialData.importe !== undefined && initialData.importe !== ''
      ? (typeof initialData.importe === 'number' ? formatInputDecimal(initialData.importe) : normalizeDecimalInput(initialData.importe))
      : '',
    entidad: initialData.entidad || entities?.[0]?.name || 'CAIXABANK',
    estado: initialData.estado || 'X',
    loanId: linkInfo.loanId || resolvedLoan?.id || initialData.loanId || '',
    cardId: linkInfo.cardId || resolvedCard?.id || initialData.cardId || ''
  };
}

function ExpenseFormContent({ initialData, onClose, onSubmit, submitLabel }) {
  const { entities, loans, cards, openCalculator } = useStore();
  const [formData, setFormData] = useState(() => getInitialFormData(initialData, entities, loans, cards));

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalConcept = setLinkInfo(formData.concepto, formData.loanId, formData.cardId);
    const numericImporte = parseNum(normalizeDecimalInput(formData.importe));

    const preparedData = {
      dia: parseIntNum(formData.dia) || new Date().getDate(),
      concepto: finalConcept,
      importe: numericImporte,
      entidad: formData.entidad,
      estado: formData.estado,
      loanId: formData.loanId,
      cardId: formData.cardId
    };

    onSubmit(preparedData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Día del mes</label>
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
          placeholder="Ej: Farmacia, Abogado, Compra..."
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
            value={formData.importe}
            onChange={e => setFormData({ ...formData, importe: normalizeDecimalInput(e.target.value) })}
            onKeyDown={onNumKeyDown}
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
        <label>Vincular a Préstamo (Opcional)</label>
        <select
          className="input"
          value={formData.loanId || ''}
          onChange={e => setFormData({ ...formData, loanId: e.target.value, cardId: '' })}
        >
          <option value="">(Ninguno)</option>
          {loans.map(l => (
            <option key={l.id} value={l.id}>{l.entidad} (Cuota: {l.cuota} €)</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Vincular a Tarjeta (Opcional)</label>
        <select
          className="input"
          value={formData.cardId || ''}
          onChange={e => setFormData({ ...formData, cardId: e.target.value, loanId: '' })}
        >
          <option value="">(Ninguna)</option>
          {cards.map(c => (
            <option key={c.id} value={c.id}>{c.tarjeta} (Pendiente: {c.pendiente} €)</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export default function ExpenseFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  title = null,
  submitLabel = 'Guardar Gasto'
}) {
  if (!isOpen) return null;

  const modalTitle = title || (initialData?.id ? 'Editar Gasto' : 'Nuevo Gasto');
  const formKey = initialData?.id || (initialData?.concepto ? `transfer-${initialData.concepto}` : 'new-expense');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
      <ExpenseFormContent
        key={formKey}
        initialData={initialData}
        onClose={onClose}
        onSubmit={onSubmit}
        submitLabel={submitLabel}
      />
    </Modal>
  );
}
