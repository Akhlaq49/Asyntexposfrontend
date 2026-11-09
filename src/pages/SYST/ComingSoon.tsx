import React from 'react';
import PageHeader from '../../components/common/PageHeader';

const ComingSoon: React.FC = () => {
  return (
    <>
      <PageHeader
        title="Coming Soon"
        breadcrumbs={[{ title: 'Pages' }]}
      />
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set">
            <div className="search-input">
              <a href="#" className="btn btn-searchset"><i className="ti ti-search fs-14"></i></a>
              <input type="text" className="form-control" placeholder="Search" />
            </div>
          </div>
        </div>
        <div className="card-body">
          <p>Manage your coming soon here.</p>
        </div>
      </div>
    </>
  );
};

export default ComingSoon;

