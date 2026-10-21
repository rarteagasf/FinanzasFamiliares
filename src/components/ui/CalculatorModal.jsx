import { useState, useEffect, useCallback } from 'react';
import { Calculator, Copy, CornerDownLeft, Download, X, Delete } from 'lucide-react';
import { toast } from 'sonner';
import { parseNum, normalizeDecimalInput, formatInputDecimal } from '../../utils';

export function applyValueToInput(inputElement, value) {
  if (!inputElement || !document.body.contains(inputElement)) return false;

  let formattedValue = '';
  const isTypeNumber = inputElement.type === 'number';

  if (isTypeNumber) {
    formattedValue = String(value);
  } else {
    formattedValue = formatInputDecimal(value);
  }

  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(inputElement, formattedValue);
  } else {
    inputElement.value = formattedValue;
  }

  inputElement.dispatchEvent(new Event('input', { bubbles: true }));
  inputElement.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

const formatDisplayNum = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  const rounded = Math.round(num * 1e8) / 1e8;
  return rounded.toString().replace('.', ',');
};

const executeOp = (a, b, op) => {
  switch (op) {
    case '+': return Math.round((a + b) * 1e8) / 1e8;
    case '-': return Math.round((a - b) * 1e8) / 1e8;
    case '*': return Math.round((a * b) * 1e8) / 1e8;
    case '/': return b === 0 ? 0 : Math.round((a / b) * 1e8) / 1e8;
    default: return b;
  }
};

const getOpSymbol = (op) => {
  switch (op) {
    case '+': return '+';
    case '-': return '−';
    case '*': return '×';
    case '/': return '÷';
    default: return '';
  }
};

export default function CalculatorModal({ isOpen, onClose, activeInputInfo }) {
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [equation, setEquation] = useState('');
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [hasCalculated, setHasCalculated] = useState(false);

  // Reset al abrir
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClear = useCallback(() => {
    setDisplay('0');
    setPrevValue(null);
    setOperation(null);
    setEquation('');
    setWaitingForOperand(false);
    setHasCalculated(false);
  }, []);

  const handleDigit = useCallback((digit) => {
    if (waitingForOperand || hasCalculated) {
      setDisplay(digit);
      setWaitingForOperand(false);
      setHasCalculated(false);
    } else {
      setDisplay(prev => (prev === '0' ? digit : prev + digit));
    }
  }, [waitingForOperand, hasCalculated]);

  const handleDecimal = useCallback(() => {
    if (waitingForOperand || hasCalculated) {
      setDisplay('0,');
      setWaitingForOperand(false);
      setHasCalculated(false);
      return;
    }
    if (!display.includes(',')) {
      setDisplay(prev => prev + ',');
    }
  }, [display, waitingForOperand, hasCalculated]);

  const handleToggleSign = useCallback(() => {
    if (display === '0') return;
    if (display.startsWith('-')) {
      setDisplay(display.slice(1));
    } else {
      setDisplay('-' + display);
    }
  }, [display]);

  const handleBackspace = useCallback(() => {
    if (hasCalculated) {
      handleClear();
      return;
    }
    if (waitingForOperand) return;
    setDisplay(prev => {
      if (prev.length <= 1 || (prev.length === 2 && prev.startsWith('-'))) {
        return '0';
      }
      return prev.slice(0, -1);
    });
  }, [hasCalculated, waitingForOperand, handleClear]);

  const handleOperator = useCallback((nextOp) => {
    const currentNum = parseNum(normalizeDecimalInput(display));

    if (prevValue === null) {
      setPrevValue(currentNum);
      setEquation(`${formatDisplayNum(currentNum)} ${getOpSymbol(nextOp)}`);
    } else if (operation && !waitingForOperand) {
      const result = executeOp(prevValue, currentNum, operation);
      setPrevValue(result);
      setDisplay(formatDisplayNum(result));
      setEquation(`${formatDisplayNum(result)} ${getOpSymbol(nextOp)}`);
    } else {
      setEquation(`${formatDisplayNum(prevValue)} ${getOpSymbol(nextOp)}`);
    }

    setOperation(nextOp);
    setWaitingForOperand(true);
    setHasCalculated(false);
  }, [display, prevValue, operation, waitingForOperand]);

  const handlePercentage = useCallback(() => {
    const currentNum = parseNum(normalizeDecimalInput(display));
    let percentVal;
    if (prevValue !== null) {
      // ej: 200 + 20% -> 200 * 0.20 = 40
      percentVal = (prevValue * currentNum) / 100;
    } else {
      percentVal = currentNum / 100;
    }
    setDisplay(formatDisplayNum(percentVal));
    setHasCalculated(false);
  }, [display, prevValue]);

  const handleEquals = useCallback(() => {
    if (prevValue === null || !operation) return;
    const currentNum = parseNum(normalizeDecimalInput(display));
    const result = executeOp(prevValue, currentNum, operation);

    setEquation(`${formatDisplayNum(prevValue)} ${getOpSymbol(operation)} ${formatDisplayNum(currentNum)} =`);
    setDisplay(formatDisplayNum(result));
    setPrevValue(null);
    setOperation(null);
    setWaitingForOperand(false);
    setHasCalculated(true);
  }, [prevValue, operation, display]);

  // Manejo de teclado
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === '.' || e.key === ',') {
        e.preventDefault();
        handleDecimal();
      } else if (e.key === '+' || e.key === '-') {
        e.preventDefault();
        handleOperator(e.key);
      } else if (e.key === '*') {
        e.preventDefault();
        handleOperator('*');
      } else if (e.key === '/') {
        e.preventDefault();
        handleOperator('/');
      } else if (e.key === '%') {
        e.preventDefault();
        handlePercentage();
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEquals();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleDigit, handleDecimal, handleOperator, handlePercentage, handleEquals, handleBackspace, handleClear, onClose]);

  // Acciones con el campo activo
  const handleLoadFromActiveInput = () => {
    if (!activeInputInfo?.element || !document.body.contains(activeInputInfo.element)) {
      toast.warning('No se detecta ningún campo activo');
      return;
    }
    const val = parseNum(normalizeDecimalInput(activeInputInfo.element.value));
    setDisplay(formatDisplayNum(val));
    setPrevValue(null);
    setOperation(null);
    setEquation('');
    setWaitingForOperand(false);
    setHasCalculated(false);
    toast.info(`Valor ${formatDisplayNum(val)} cargado desde "${activeInputInfo.label}"`);
  };

  const handleApplyToActiveInput = () => {
    if (!activeInputInfo?.element || !document.body.contains(activeInputInfo.element)) {
      toast.warning('No hay un campo numérico enfocado');
      return;
    }
    const currentNum = parseNum(normalizeDecimalInput(display));
    const success = applyValueToInput(activeInputInfo.element, currentNum);
    if (success) {
      toast.success(`Resultado ${display} aplicado a "${activeInputInfo.label}"`);
      onClose();
    } else {
      toast.error('No se pudo insertar en el campo');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(display)
      .then(() => toast.success('Resultado copiado al portapapeles'))
      .catch(() => toast.error('Error al copiar al portapapeles'));
  };

  if (!isOpen) return null;

  const isInputAvailable = activeInputInfo?.element && document.body.contains(activeInputInfo.element);

  return (
    <div 
      className="modal-overlay calculator-modal-overlay" 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ zIndex: 1100 }}
    >
      <div 
        className="modal-content calculator-modal-content"
        style={{
          width: '100%',
          maxWidth: '380px',
          padding: '1.25rem',
          borderRadius: '16px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-main)', fontSize: '1.1rem' }}>
            <Calculator size={20} color="var(--primary)" />
            <span>Calculadora</span>
          </div>
          <button 
            type="button"
            className="btn" 
            onClick={onClose}
            style={{ padding: '0.25rem', background: 'transparent', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Barra de contexto del campo activo */}
        <div style={{
          background: 'var(--bg-main)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '0.5rem 0.75rem',
          marginBottom: '0.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.8rem'
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Campo detectado
            </div>
            <div style={{ 
              color: isInputAvailable ? 'var(--text-main)' : 'var(--text-muted)', 
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {isInputAvailable ? activeInputInfo.label : 'Ninguno (selecciona un campo)'}
            </div>
          </div>
          {isInputAvailable && (
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                onClick={handleLoadFromActiveInput}
                title="Cargar valor del campo a la calculadora"
              >
                <Download size={13} />
                <span>Cargar</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                onClick={handleApplyToActiveInput}
                title="Insertar resultado en el campo"
              >
                <CornerDownLeft size={13} />
                <span>Insertar</span>
              </button>
            </div>
          )}
        </div>

        {/* Pantalla / Display */}
        <div style={{
          background: 'var(--bg-main)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          textAlign: 'right',
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            minHeight: '1.25rem',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            fontFamily: 'monospace',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {equation || '\u00A0'}
          </div>
          <div style={{
            fontSize: display.length > 10 ? '1.5rem' : '2rem',
            fontWeight: 700,
            color: 'var(--text-main)',
            fontFamily: 'monospace',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.2
          }}>
            {display}
          </div>
        </div>

        {/* Teclado */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.5rem',
          marginBottom: '0.75rem'
        }}>
          {/* Fila 1 */}
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ height: '44px', fontWeight: 700, color: 'var(--danger)', fontSize: '0.95rem' }}
            onClick={handleClear}
          >
            AC
          </button>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={handleBackspace}
            title="Borrar último dígito"
          >
            <Delete size={18} />
          </button>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ height: '44px', fontWeight: 600, fontSize: '1rem' }}
            onClick={handlePercentage}
          >
            %
          </button>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ height: '44px', fontWeight: 600, fontSize: '1.25rem', background: 'var(--border)' }}
            onClick={() => handleOperator('/')}
          >
            ÷
          </button>

          {/* Fila 2 */}
          <button type="button" className="btn btn-secondary" style={{ height: '44px', fontSize: '1.1rem' }} onClick={() => handleDigit('7')}>7</button>
          <button type="button" className="btn btn-secondary" style={{ height: '44px', fontSize: '1.1rem' }} onClick={() => handleDigit('8')}>8</button>
          <button type="button" className="btn btn-secondary" style={{ height: '44px', fontSize: '1.1rem' }} onClick={() => handleDigit('9')}>9</button>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ height: '44px', fontWeight: 600, fontSize: '1.1rem', background: 'var(--border)' }}
            onClick={() => handleOperator('*')}
          >
            ×
          </button>

          {/* Fila 3 */}
          <button type="button" className="btn btn-secondary" style={{ height: '44px', fontSize: '1.1rem' }} onClick={() => handleDigit('4')}>4</button>
          <button type="button" className="btn btn-secondary" style={{ height: '44px', fontSize: '1.1rem' }} onClick={() => handleDigit('5')}>5</button>
          <button type="button" className="btn btn-secondary" style={{ height: '44px', fontSize: '1.1rem' }} onClick={() => handleDigit('6')}>6</button>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ height: '44px', fontWeight: 600, fontSize: '1.25rem', background: 'var(--border)' }}
            onClick={() => handleOperator('-')}
          >
            −
          </button>

          {/* Fila 4 */}
          <button type="button" className="btn btn-secondary" style={{ height: '44px', fontSize: '1.1rem' }} onClick={() => handleDigit('1')}>1</button>
          <button type="button" className="btn btn-secondary" style={{ height: '44px', fontSize: '1.1rem' }} onClick={() => handleDigit('2')}>2</button>
          <button type="button" className="btn btn-secondary" style={{ height: '44px', fontSize: '1.1rem' }} onClick={() => handleDigit('3')}>3</button>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ height: '44px', fontWeight: 600, fontSize: '1.25rem', background: 'var(--border)' }}
            onClick={() => handleOperator('+')}
          >
            +
          </button>

          {/* Fila 5 */}
          <button type="button" className="btn btn-secondary" style={{ height: '44px', fontSize: '0.95rem' }} onClick={handleToggleSign}>±</button>
          <button type="button" className="btn btn-secondary" style={{ height: '44px', fontSize: '1.1rem' }} onClick={() => handleDigit('0')}>0</button>
          <button type="button" className="btn btn-secondary" style={{ height: '44px', fontSize: '1.1rem', fontWeight: 700 }} onClick={handleDecimal}>,</button>
          <button 
            type="button" 
            className="btn btn-primary" 
            style={{ height: '44px', fontWeight: 700, fontSize: '1.25rem' }}
            onClick={handleEquals}
          >
            =
          </button>
        </div>

        {/* Acciones inferiores */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            onClick={handleCopy}
            title="Copiar resultado al portapapeles"
          >
            <Copy size={15} />
            <span>Copiar</span>
          </button>
          {isInputAvailable && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
              onClick={handleApplyToActiveInput}
            >
              <CornerDownLeft size={15} />
              <span>Insertar en campo</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
