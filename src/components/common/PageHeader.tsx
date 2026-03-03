import React from 'react';
import { useTranslation } from 'react-i18next';


interface BreadcrumbItem {
  title: string;
  path?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs: BreadcrumbItem[];
  actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, breadcrumbs: _breadcrumbs, actions }) => {
  const { t } = useTranslation();
  return (
    <div className="page-header">
      <div className="add-item d-flex">
        <div className="page-title">
          <h4>{title}</h4>
          <h6>{subtitle || t('common.manage_your', { title: title.toLowerCase() })}</h6>
        </div>
      </div>
      {actions && (
        <div className="page-btn">
          {actions}
        </div>
      )}
      <ul className="table-top-head">
        <li>
          <a data-bs-toggle="tooltip" data-bs-placement="top" title={t('common.pdf')} href="#">
            <img src="/assets/img/icons/pdf.svg" alt="pdf" />
          </a>
        </li>
        <li>
          <a data-bs-toggle="tooltip" data-bs-placement="top" title={t('common.excel')} href="#">
            <img src="/assets/img/icons/excel.svg" alt="excel" />
          </a>
        </li>
        <li>
          <a data-bs-toggle="tooltip" data-bs-placement="top" title={t('common.print')} href="#">
            <i data-feather="printer" className="feather-rotate-ccw"></i>
          </a>
        </li>
        <li>
          <a data-bs-toggle="tooltip" data-bs-placement="top" title={t('common.refresh')} href="#">
            <i data-feather="rotate-ccw" className="feather-rotate-ccw"></i>
          </a>
        </li>
        <li>
          <a data-bs-toggle="tooltip" data-bs-placement="top" title={t('common.collapse')} href="#" id="collapse-header">
            <i data-feather="chevron-up" className="feather-chevron-up"></i>
          </a>
        </li>
      </ul>
    </div>
  );
};

export default PageHeader;
