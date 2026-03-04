import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, LanguageCode } from '../../i18n';

const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLAnchorElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const handleLanguageChange = (code: LanguageCode) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!open && toggleRef.current) {
      const rect = toggleRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        left: Math.max(8, rect.right - 170),
      });
    }
    setOpen(prev => !prev);
  }, [open]);

  // Close on outside click / scroll
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('click', close);
    document.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const dropdownMenu = open
    ? ReactDOM.createPortal(
        <div
          ref={menuRef}
          className="dropdown-menu show"
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            zIndex: 10000,
            minWidth: 170,
            padding: 8,
            display: 'block',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {LANGUAGES.map((lang) => (
            <a
              key={lang.code}
              href="#"
              className={`dropdown-item ${i18n.language === lang.code ? 'active' : ''}`}
              style={{
                padding: '9px 16px',
                borderRadius: 5,
                fontWeight: 500,
              }}
              onClick={(e) => {
                e.preventDefault();
                handleLanguageChange(lang.code);
              }}
            >
              <img src={lang.flag} alt="" height="16" className="me-2" />
              {lang.nativeLabel}
            </a>
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <li className="nav-item dropdown has-arrow flag-nav nav-item-box">
      <a
        ref={toggleRef}
        className="nav-link dropdown-toggle"
        href="#"
        onClick={handleToggle}
      >
        <img src={currentLang.flag} alt={t(`header.${currentLang.code === 'en' ? 'english' : currentLang.code === 'ar' ? 'arabic' : 'urdu'}`)} className="img-fluid" />
      </a>
      {dropdownMenu}
    </li>
  );
};

export default LanguageSwitcher;
