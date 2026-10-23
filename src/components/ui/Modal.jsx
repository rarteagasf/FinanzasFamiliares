import { X, Calculator } from 'lucide-react';
import { useEffect } from 'react';
import { useStore } from '../../store/useStore';

export default function Modal({ isOpen, onClose, title, children, closeOnOverlayClick = false, showCalculator = true }) {
  const openCalculator = useStore(state => state.openCalculator);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      const hasOtherModals = document.querySelector('.modal-overlay');
      if (!hasOtherModals) {
        document.body.style.overflow = 'unset';
      }
    }
    return () => {
      const hasOtherModals = document.querySelector('.modal-overlay');
      if (!hasOtherModals) {
        document.body.style.overflow = 'unset';
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {showCalculator && (
              <button
                className="modal-close"
                onClick={() => openCalculator()}
                type="button"
                title="Calculadora"
                aria-label="Abrir calculadora"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Calculator size={18} />
              </button>
            )}
            <button className="modal-close" onClick={onClose} type="button" aria-label="Cerrar">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
