import React from 'react';
import { ProfitLine, quotationProfit } from '../../utils/quotationProfit';

const fmt = (n: number) => `PKR ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/**
 * The quotation's profit, for admins only (never printed): products sold less their purchase prices
 * (Inventory > Purchase Prices), plus installation, testing and commissioning.
 */
const QuotationProfitBox: React.FC<{
  lines: ProfitLine[]; discount: number; installation: number; purchasePriceOf: (productId: number) => number | null | undefined;
}> = ({ lines, discount, installation, purchasePriceOf }) => {
  if (lines.length === 0) return null;
  const p = quotationProfit(lines, discount, installation, purchasePriceOf);
  return (
    <div className="card border mb-0 d-print-none quotation-profit">
      <div className="card-body py-2">
        <div className="d-flex justify-content-between align-items-baseline flex-wrap gap-2">
          <strong>Profit <small className="text-muted fw-normal">(only you see this; not printed)</small></strong>
          <span className={`fs-5 fw-semibold ${p.profit < 0 ? 'text-danger' : 'text-success'} profit-total`}>{fmt(p.profit)} <small className="text-muted fs-6">({p.profitPercent}%)</small></span>
        </div>
        <div className="small text-muted d-flex flex-wrap gap-3 mt-1">
          <span>Products: {fmt(p.sales)}</span>
          <span>- Purchase price: {fmt(p.cost)}</span>
          <span>= Product margin: <span className={p.productMargin < 0 ? 'text-danger' : ''}>{fmt(p.productMargin)}</span></span>
          <span>+ Installation, testing &amp; commissioning: {fmt(p.installation)}</span>
        </div>
        {p.unknownCost.length > 0 && (
          <div className="small text-warning mt-1">No purchase price (not in the inventory), counted as 0: {p.unknownCost.join(', ')}</div>
        )}
      </div>
    </div>
  );
};

export default QuotationProfitBox;
