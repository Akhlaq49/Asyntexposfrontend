import React from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, LanguageCode } from '../../i18n';

const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const handleLanguageChange = (code: LanguageCode) => {
    i18n.changeLanguage(code);
  };

  return (
    <li className="nav-item dropdown has-arrow flag-nav nav-item-box">
      <a className="nav-link dropdown-toggle" data-bs-toggle="dropdown" href="#">
        <img src={currentLang.flag} alt={t(`header.${currentLang.code === 'en' ? 'english' : currentLang.code === 'ar' ? 'arabic' : 'urdu'}`)} className="img-fluid" />
      </a>
      <div className="dropdown-menu dropdown-menu-right">
        {LANGUAGES.map((lang) => (
          <a
            key={lang.code}
            href="#"
            className={`dropdown-item ${i18n.language === lang.code ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleLanguageChange(lang.code);
            }}
          >
            <img src={lang.flag} alt="" height="16" className="me-2" />
            {lang.nativeLabel}
          </a>
        ))}
      </div>
    </li>
  );
};

export default LanguageSwitcher;
