import React from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/common/PageHeader';

const EmailTemplates: React.FC = () => {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader
        title={t('settings.email_templates')}
        breadcrumbs={[{ title: t('settings.settings') }]}
      />
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set">
            <div className="search-input">
              <a href="#" className="btn btn-searchset"><i className="ti ti-search fs-14"></i></a>
              <input type="text" className="form-control" placeholder={t('settings.search')} />
            </div>
          </div>
        </div>
        <div className="card-body">
          <p>{t('settings.manage_email_templates')}</p>
        </div>
      </div>
    </>
  );
};

export default EmailTemplates;

