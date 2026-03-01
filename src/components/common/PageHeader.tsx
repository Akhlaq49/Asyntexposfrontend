import React from 'react';


interface BreadcrumbItem {
  title: string;
  path?: string;
}

interface PageHeaderProps {
  title: string;
  breadcrumbs: BreadcrumbItem[];
  actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, breadcrumbs: _breadcrumbs, actions }) => {
  return (
    <div className="page-header">
      <div className="add-item d-flex">
        <div className="page-title">
          <h4>{title}</h4>
          <h6>Manage your {title.toLowerCase()}</h6>
        </div>
      </div>
      {actions && (
        <div className="page-btn">
          {actions}
        </div>
      )}
      <ul className="table-top-head">
        <li>
          <a data-bs-toggle="tooltip" data-bs-placement="top" title="Pdf" href="#">
            <img src="/assets/img/icons/pdf.svg" alt="pdf" />
          </a>
        </li>
        <li>
          <a data-bs-toggle="tooltip" data-bs-placement="top" title="Excel" href="#">
            <img src="/assets/img/icons/excel.svg" alt="excel" />
          </a>
        </li>
        <li>
          <a data-bs-toggle="tooltip" data-bs-placement="top" title="Print" href="#">
            <i data-feather="printer" className="feather-rotate-ccw"></i>
          </a>
        </li>
        <li>
          <a data-bs-toggle="tooltip" data-bs-placement="top" title="Refresh" href="#">
            <i data-feather="rotate-ccw" className="feather-rotate-ccw"></i>
          </a>
        </li>
        <li>
          <a data-bs-toggle="tooltip" data-bs-placement="top" title="Collapse" href="#" id="collapse-header">
            <i data-feather="chevron-up" className="feather-chevron-up"></i>
          </a>
        </li>
      </ul>
    </div>
  );
};

export default PageHeader;
