import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';

interface InvoiceItemDto {
  id: number; description: string; quantity: number; cost: number; discount: number; total: number;
}
interface InvoiceDto {
  id: number; invoiceNo: string; customerId: number | null;
  customerName: string; customerImage: string | null;
  customerAddress: string | null; customerEmail: string | null; customerPhone: string | null;
  fromName: string; fromAddress: string | null; fromEmail: string | null; fromPhone: string | null;
  invoiceFor: string | null;
  subTotal: number; discount: number; discountPercent: number;
  tax: number; taxPercent: number; totalAmount: number;
  paid: number; amountDue: number;
  status: string; notes: string | null; terms: string | null;
  dueDate: string; createdAt: string;
  items: InvoiceItemDto[];
}

const statusBadge = (s: string) => {
  if (s === 'Paid') return 'bg-success';
  if (s === 'Unpaid') return 'bg-danger';
  if (s === 'Overdue') return 'bg-warning';
  return 'bg-secondary';
};

const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const InvoiceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get<InvoiceDto>(`/invoices/${id}`)
      .then(res => setInvoice(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { if (typeof (window as any).feather !== 'undefined') (window as any).feather.replace(); });

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>;
  }

  if (!invoice) {
    return (
      <div className="text-center py-5">
        <h5>Invoice not found</h5>
        <Link to="/invoice" className="btn btn-primary mt-3">Back to Invoices</Link>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4>Invoice Details</h4>
          </div>
        </div>
        <div className="page-btn">
          <Link to="/invoice" className="btn btn-primary">
            <i data-feather="arrow-left" className="me-2"></i>Back to Invoices
          </Link>
        </div>
      </div>

      {/* Invoice Card */}
      <div className="card">
        <div className="card-body">
          {/* Top: Logo + Invoice No */}
          <div className="row justify-content-between align-items-center border-bottom mb-3">
            <div className="col-md-6">
              <div className="mb-2 invoice-logo">
                <img src="/assets/img/logo.svg" width="130" className="img-fluid logo" alt="logo" />
              </div>
              <p>{invoice.fromAddress || ''}</p>
            </div>
            <div className="col-md-6">
              <div className="text-end mb-3">
                <h5 className="text-gray mb-1">Invoice No <span className="text-primary">#{invoice.invoiceNo}</span></h5>
                <p className="mb-1 fw-medium">Created Date : <span className="text-dark">{invoice.createdAt}</span></p>
                <p className="fw-medium">Due Date : <span className="text-dark">{invoice.dueDate}</span></p>
              </div>
            </div>
          </div>

          {/* From / To / Status */}
          <div className="row border-bottom mb-3">
            <div className="col-md-5">
              <p className="text-dark mb-2 fw-semibold">From</p>
              <div>
                <h4 className="mb-1">{invoice.fromName}</h4>
                {invoice.fromAddress && <p className="mb-1">{invoice.fromAddress}</p>}
                {invoice.fromEmail && <p className="mb-1">Email : <span className="text-dark">{invoice.fromEmail}</span></p>}
                {invoice.fromPhone && <p>Phone : <span className="text-dark">{invoice.fromPhone}</span></p>}
              </div>
            </div>
            <div className="col-md-5">
              <p className="text-dark mb-2 fw-semibold">To</p>
              <div>
                <h4 className="mb-1">{invoice.customerName}</h4>
                {invoice.customerAddress && <p className="mb-1">{invoice.customerAddress}</p>}
                {invoice.customerEmail && <p className="mb-1">Email : <span className="text-dark">{invoice.customerEmail}</span></p>}
                {invoice.customerPhone && <p>Phone : <span className="text-dark">{invoice.customerPhone}</span></p>}
              </div>
            </div>
            <div className="col-md-2">
              <div className="mb-3">
                <p className="text-title mb-2 fw-medium">Payment Status</p>
                <span className={`${statusBadge(invoice.status)} text-white fs-10 px-1 rounded`}>
                  <i className="ti ti-point-filled"></i>{invoice.status}
                </span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div>
            {invoice.invoiceFor && (
              <p className="fw-medium">Invoice For : <span className="text-dark fw-medium">{invoice.invoiceFor}</span></p>
            )}
            <div className="table-responsive mb-3">
              <table className="table">
                <thead className="thead-light">
                  <tr>
                    <th>Job Description</th>
                    <th className="text-end">Qty</th>
                    <th className="text-end">Cost</th>
                    <th className="text-end">Discount</th>
                    <th className="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-3">No items</td></tr>
                  ) : invoice.items.map(item => (
                    <tr key={item.id}>
                      <td><h6>{item.description}</h6></td>
                      <td className="text-gray-9 fw-medium text-end">{item.quantity}</td>
                      <td className="text-gray-9 fw-medium text-end">{fmt(item.cost)}</td>
                      <td className="text-gray-9 fw-medium text-end">{fmt(item.discount)}</td>
                      <td className="text-gray-9 fw-medium text-end">{fmt(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="row border-bottom mb-3">
            <div className="col-md-5 ms-auto mb-3">
              <div className="d-flex justify-content-between align-items-center border-bottom mb-2 pe-3">
                <p className="mb-0">Sub Total</p>
                <p className="text-dark fw-medium mb-2">{fmt(invoice.subTotal)}</p>
              </div>
              <div className="d-flex justify-content-between align-items-center border-bottom mb-2 pe-3">
                <p className="mb-0">Discount ({invoice.discountPercent}%)</p>
                <p className="text-dark fw-medium mb-2">{fmt(invoice.discount)}</p>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2 pe-3">
                <p className="mb-0">VAT ({invoice.taxPercent}%)</p>
                <p className="text-dark fw-medium mb-2">{fmt(invoice.tax)}</p>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2 pe-3">
                <h5>Total Amount</h5>
                <h5>{fmt(invoice.totalAmount)}</h5>
              </div>
            </div>
          </div>

          {/* Terms & Notes */}
          <div className="row align-items-center border-bottom mb-3">
            <div className="col-md-7">
              {invoice.terms && (
                <div className="mb-3">
                  <h6 className="mb-1">Terms and Conditions</h6>
                  <p>{invoice.terms}</p>
                </div>
              )}
              {invoice.notes && (
                <div className="mb-3">
                  <h6 className="mb-1">Notes</h6>
                  <p>{invoice.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="d-flex justify-content-center align-items-center mb-4">
        <button className="btn btn-primary d-flex justify-content-center align-items-center me-2" onClick={() => window.print()}>
          <i className="ti ti-printer me-2"></i>Print Invoice
        </button>
      </div>
    </>
  );
};

export default InvoiceDetails;
