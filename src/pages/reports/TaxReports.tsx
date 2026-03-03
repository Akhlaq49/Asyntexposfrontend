import React from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/common/PageHeader';

const TaxReports: React.FC = () => {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader
        title={t('reports.tax_reports')}
        breadcrumbs={[{ title: t('reports.reports') }]}
      />
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set">
            <div className="search-input">
              <a href="#" className="btn btn-searchset"><i className="ti ti-search fs-14"></i></a>
              <input type="text" className="form-control" placeholder={t('common.search')} />
            </div>
          </div>
        </div>
        <div className="card-body">
          <p>{t('reports.manage_tax_reports')}</p>
        </div>
      </div>
    </>
  );
};

export default TaxReports;

