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
      {/* only the working collapse toggle: the theme's PDF / Excel / Print / Refresh icons here had no action (pages add their own working buttons) */}
      <ul className="table-top-head ms-2">
        <li>
          <a className="btn btn-sm btn-outline-secondary btn-action" data-bs-toggle="tooltip" data-bs-placement="top" title={t('common.collapse')} href="#" id="collapse-header">{t('common.collapse')}</a>
        </li>
      </ul>
    </div>
  );
};

export default PageHeader;
