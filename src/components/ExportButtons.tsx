import React from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  onExportExcel: () => void;
  onExportPDF: () => void;
  /** Print on the letterhead (shown when given) */
  onPrint?: () => void;
}

const ExportButtons: React.FC<Props> = ({ onExportExcel, onExportPDF, onPrint }) => {
  const { t } = useTranslation();
  return (
    <div className="d-flex gap-2">
      <button className="btn btn-success btn-sm" onClick={onExportExcel} title={t('common.export_excel')}>
        <i className="ti ti-file-spreadsheet me-1"></i>{t('common.excel')}
      </button>
      <button className="btn btn-danger btn-sm" onClick={onExportPDF} title={t('common.export_pdf')}>
        <i className="ti ti-file-type-pdf me-1"></i>{t('common.pdf')}
      </button>
      {onPrint && (
        <button className="btn btn-dark btn-sm" onClick={onPrint} title="Print">
          <i className="ti ti-printer me-1"></i>Print
        </button>
      )}
    </div>
  );
};

export default ExportButtons;
