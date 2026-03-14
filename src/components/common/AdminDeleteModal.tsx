import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { authService } from '../../services/authService';

interface AdminDeleteModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title?: string;
  message?: string;
}

const AdminDeleteModal: React.FC<AdminDeleteModalProps> = ({ show, onClose, onConfirm, title, message }) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (show) {
      setPassword('');
      setError('');
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [show]);

  if (!show) return null;

  const handleSubmit = async () => {
    if (!password.trim()) {
      setError(t('admin_delete.password_required'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const ok = await authService.verifyAdminPassword(password);
      if (!ok) {
        setError(t('admin_delete.invalid_password'));
        setLoading(false);
        return;
      }
      await onConfirm();
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('admin_delete.delete_failed');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) handleSubmit();
  };

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="page-wrapper-new p-0">
            <div className="content p-5 px-3 text-center">
              <span className="rounded-circle d-inline-flex p-2 bg-danger-transparent mb-2">
                <i className="ti ti-trash fs-24 text-danger"></i>
              </span>
              <h4 className="fs-20 fw-bold mb-2 mt-1">{title || t('admin_delete.title')}</h4>
              <p className="mb-3 fs-16">{message || t('admin_delete.message')}</p>
              <div className="mb-3 text-start px-3">
                <label className="form-label fw-medium">
                  <i className="ti ti-lock me-1"></i>
                  {t('admin_delete.enter_password')}
                </label>
                <input
                  ref={inputRef}
                  type="password"
                  className={`form-control ${error ? 'is-invalid' : ''}`}
                  placeholder={t('admin_delete.password_placeholder')}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  autoComplete="off"
                />
              </div>
              {error && <div className="alert alert-danger py-2 px-3 mx-3 text-start">{error}</div>}
              <div className="modal-footer-btn mt-3 d-flex justify-content-center">
                <button
                  type="button"
                  className="btn me-2 btn-secondary fs-13 fw-medium p-2 px-3 shadow-none"
                  onClick={onClose}
                  disabled={loading}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  className="btn btn-danger fs-13 fw-medium p-2 px-3"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <><span className="spinner-border spinner-border-sm me-1"></span>{t('admin_delete.verifying')}</>
                  ) : (
                    t('common.yes_delete')
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDeleteModal;
