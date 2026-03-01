import React from 'react';

interface Props {
  onExportExcel: () => void;
  onExportPDF: () => void;
}

const ExportButtons: React.FC<Props> = ({ onExportExcel, onExportPDF }) => (
  <div className="d-flex gap-2">
    <button className="btn btn-success btn-sm" onClick={onExportExcel} title="Export to Excel">
      <i className="ti ti-file-spreadsheet me-1"></i>Excel
    </button>
    <button className="btn btn-danger btn-sm" onClick={onExportPDF} title="Export to PDF">
      <i className="ti ti-file-type-pdf me-1"></i>PDF
    </button>
  </div>
);

export default ExportButtons;
