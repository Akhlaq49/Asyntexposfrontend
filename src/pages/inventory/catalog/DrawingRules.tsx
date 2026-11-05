import React, { useEffect, useState } from 'react';
import { catalogService as svc, CatalogData, DrawingRule, familiesOf } from '../../../services/catalogService';

const errorText = (err: any, fallback: string) => err?.response?.data?.message || fallback;
const POINT: Record<string, string> = {
  light: 'lights', fan: 'fans', exhaust_fan: 'exhaust fans', switch: 'switches', ac_point: 'AC points', tv_point: 'TV points', curtain: 'curtains',
  smoke_detector: 'smoke detectors', main_door: 'main door', intercom: 'intercom', cctv: 'CCTV',
};

/**
 * Drawing rules: what the drawing reader counts (switch boards from lights and fans, a gas sensor per kitchen ...)
 * is fixed in the reader; which of this company's products each rule uses is chosen here, best first - the first
 * one allowed in the plan is used (so Standard and Premium can use different products).
 */
const DrawingRules: React.FC = () => {
  const [cat, setCat] = useState<CatalogData | null>(null);
  const [rules, setRules] = useState<DrawingRule[] | null>(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState<Record<string, string>>({});

  useEffect(() => {
    svc.get().then(setCat).catch((err) => setError(errorText(err, 'Could not load the catalogue.')));
    svc.rules().then((r) => setRules(r.rules)).catch((err) => setError(errorText(err, 'The drawing reader is not running - start it to see its rules.')));
  }, []);

  if (!cat) return <div className="card"><div className="card-body">{error || 'Loading...'}</div></div>;
  const families = familiesOf(cat);
  const products = [...cat.products].sort((a, b) => a.name.localeCompare(b.name));
  const tierNames = (productId: number) => {
    const fam = families.find((f) => f.id === cat.products.find((p) => p.id === productId)?.familyId);
    return fam ? cat.tiers.filter((t) => fam.tierIds.includes(t.id)).map((t) => t.name).join(' + ') || 'no tier' : 'no family';
  };
  const ids = (rule: string, gang: string) => cat.ruleItems.filter((r) => r.ruleName === rule && r.gang === gang).sort((a, b) => a.rank - b.rank).map((r) => r.productId);
  const save = async (rule: string, gang: string, list: number[]) => {
    try { setCat(await svc.saveRule(rule, gang, list)); setError(''); } catch (err) { setError(errorText(err, 'Could not save the rule.')); }
  };
  // rules the company mapped that the reader no longer has are shown too, so they can be cleared
  const known = rules || [];
  const extra = [...new Set(cat.ruleItems.map((r) => r.ruleName))].filter((n) => !known.some((r) => r.name === n))
    .map((name) => ({ name, rule: '', gangs: [...new Set(cat.ruleItems.filter((r) => r.ruleName === name).map((r) => r.gang))], points: [], roomTypes: [] }));

  return (
    <div className="card">
      <div className="card-header">
        <h5 className="card-title mb-0">Products for each drawing rule</h5>
        <small className="text-muted">Best first: the first product whose family is allowed in the chosen plan is used. A rule without products keeps the package quantity.</small>
      </div>
      {error && <div className="alert alert-danger py-2 m-3 mb-0">{error}</div>}
      <div className="card-body p-0">
        <table className="table align-middle mb-0 drawing-rules">
          <thead className="thead-light"><tr><th style={{ minWidth: 220 }}>Rule</th><th>Products, best first</th></tr></thead>
          <tbody>
            {[...known, ...extra].flatMap((r) => r.gangs.map((gang) => {
              const k = `${r.name}|${gang}`;
              const list = ids(r.name, gang);
              return (
                <tr key={k} data-rule={k}>
                  <td>
                    <div className="fw-semibold">{r.name}{gang && ` - ${gang}-gang`}</div>
                    <small className="text-muted">{r.rule === 'other_brand' ? 'one per area with another company\'s automation'
                      : r.points.length ? `from ${r.points.map((p) => POINT[p] || p).join(', ')}` : r.roomTypes.length ? r.roomTypes.join(', ') : r.rule ? '' : 'not a rule of the reader any more'}</small>
                  </td>
                  <td>
                    <div className="d-flex flex-wrap gap-2 align-items-center">
                      {list.map((id, i) => (
                        <span key={id} className="badge bg-light text-dark border d-inline-flex align-items-center gap-1 py-2">
                          <span className="text-muted">{i + 1}.</span> {cat.products.find((p) => p.id === id)?.name || id}
                          <small className="text-muted">({tierNames(id)})</small>
                          <button type="button" className="btn btn-link btn-sm p-0" title="Earlier" disabled={i === 0}
                            onClick={() => save(r.name, gang, list.map((x, j) => (j === i - 1 ? id : j === i ? list[i - 1] : x)))}>◀</button>
                          <button type="button" className="btn btn-link btn-sm p-0 text-danger" title="Remove" onClick={() => save(r.name, gang, list.filter((x) => x !== id))}>×</button>
                        </span>
                      ))}
                      <select className="form-select form-select-sm rule-add" style={{ width: 260 }} value={adding[k] || ''}
                        onChange={(e) => { const id = Number(e.target.value); setAdding((a) => ({ ...a, [k]: '' })); if (id) save(r.name, gang, [...list, id]); }}>
                        <option value="">+ add a product</option>
                        {products.filter((p) => !list.includes(p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  </td>
                </tr>
              );
            }))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DrawingRules;
