import React from 'react';
import { QueueOrder, activePurchaseOrders } from '../../utils/saleQueue';

/* Small dashboard for POS Orders: the quotations waiting in the sale queue.
   The advance received on them is shown here, not on the main dashboard (they are not sales yet). */

const money = (n: number) => `Rs ${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const sum = (list: QueueOrder[], f: (o: QueueOrder) => number) => list.reduce((n, o) => n + f(o), 0);

interface Props {
  queue: QueueOrder[];
  /** clicking a box shows the queued orders in the list */
  onShowQueue: () => void;
}

const SaleQueueSummary: React.FC<Props> = ({ queue, onShowQueue }) => {
  const withPo = queue.filter((o) => activePurchaseOrders(o).length > 0);
  const withoutPo = queue.filter((o) => activePurchaseOrders(o).length === 0);
  const toReceive = withPo.filter((o) => activePurchaseOrders(o).some((p) => p.status !== 'Received'));
  const ready = queue.filter((o) => o.stage === 'Ready');
  const paid = queue.filter((o) => o.paid > 0);

  const boxes = [
    { key: 'queue', label: 'Quotations in sale queue', value: String(queue.length), hint: `worth ${money(sum(queue, (o) => o.grandTotal))}`, icon: 'ti-list-check', cls: 'primary' },
    { key: 'po', label: 'Purchase order made', value: money(sum(withPo, (o) => o.grandTotal)),
      hint: `${withPo.length} order(s) · PO cost ${money(sum(withPo, (o) => activePurchaseOrders(o).reduce((n, p) => n + p.total, 0)))}`, icon: 'ti-file-check', cls: 'info' },
    { key: 'nopo', label: 'Purchase order to make', value: money(sum(withoutPo, (o) => o.grandTotal)), hint: `${withoutPo.length} order(s)`, icon: 'ti-clipboard-list', cls: 'danger' },
    { key: 'receive', label: 'Waiting to receive', value: money(sum(toReceive, (o) => o.grandTotal)),
      hint: `${toReceive.length} order(s) - goods not arrived`, icon: 'ti-truck', cls: 'warning' },
    { key: 'ready', label: 'Ready to convert to sale', value: money(sum(ready, (o) => o.grandTotal)), hint: `${ready.length} order(s) - goods arrived`, icon: 'ti-package-import', cls: 'success' },
    { key: 'paid', label: 'Advance received', value: money(sum(queue, (o) => o.paid)),
      hint: `from ${paid.length} order(s) · still due ${money(sum(queue, (o) => o.due))}`, icon: 'ti-cash', cls: 'secondary' },
  ];

  return (
    <div className="mb-3" id="sale-queue-summary">
      <div className="row g-3">
        {boxes.map((b) => (
          <div className="col-sm-6 col-lg-4 col-xxl-2" key={b.key}>
            <div className="card mb-0 h-100" role="button" title="Show the orders in the sale queue" onClick={onShowQueue} data-box={b.key}>
              <div className="card-body p-3 d-flex align-items-center">
                <span className={`avatar avatar-md bg-${b.cls}-transparent text-${b.cls} me-2 flex-shrink-0`}><i className={`ti ${b.icon} fs-18`} /></span>
                <div className="min-w-0">
                  <p className="mb-0 text-muted small">{b.label}</p>
                  <h6 className="mb-0 fw-bold" data-value>{b.value}</h6>
                  <small className="text-muted d-block" style={{ fontSize: 11 }}>{b.hint}</small>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SaleQueueSummary;
