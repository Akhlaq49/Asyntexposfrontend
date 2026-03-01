import React from 'react';
import PageHeader from '../../components/common/PageHeader';

const Contacts: React.FC = () => {
  return (
    <>
      <PageHeader
        title="Contacts"
        breadcrumbs={[{ title: 'Application' }]}
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
          <p>Manage your contacts here.</p>
        </div>
      </div>
    </>
  );
};

export default Contacts;

