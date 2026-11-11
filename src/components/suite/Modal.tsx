import React, { useEffect } from 'react';

interface Props {
  show: boolean;
  title: React.ReactNode;
  onClose: () => void;
  size?: 'sm' | 'lg' | 'xl';
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/** Plain Bootstrap modal driven by React state (no jQuery). */
const Modal: React.FC<Props> = ({ show, title, onClose, size, footer, children }) => {
  // Escape closes the dialog wherever focus is (but not while a SweetAlert is on top).
  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.swal2-container')) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [show, onClose]);

  if (!show) return null;
  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
        <div className={`modal-dialog modal-dialog-centered modal-dialog-scrollable${size ? ` modal-${size}` : ''}`}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
};

export default Modal;
