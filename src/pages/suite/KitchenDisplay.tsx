import React, { useCallback, useEffect, useState } from 'react';
import suite from '../../services/suiteService';

type Ticket = Awaited<ReturnType<typeof suite.kitchen>>[number];
const NEXT: Record<string, string> = { New: 'Preparing', Preparing: 'Ready', Ready: 'Served' };

/** Kitchen screen: open tickets per station, oldest first, refreshed every 10 seconds. */
const KitchenDisplay: React.FC = () => {
  const [stations, setStations] = useState<{ id: number; name: string }[]>([]);
  const [stationId, setStationId] = useState<number | ''>('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setTickets(await suite.kitchen(stationId || undefined)); setError(''); }
    catch { setError('Connection lost. Retrying…'); }
  }, [stationId]);

  useEffect(() => { suite.stations().then(setStations).catch(() => setStations([])); }, []);
  useEffect(() => { void load(); const t = window.setInterval(() => void load(), 10000); return () => window.clearInterval(t); }, [load]);

  const bump = async (t: Ticket) => {
    const next = NEXT[t.status];
    if (!next) return;
    setTickets((ts) => (next === 'Served' ? ts.filter((x) => x.id !== t.id) : ts.map((x) => (x.id === t.id ? { ...x, status: next } : x))));
    try { await suite.ticketStatus(t.id, next); } catch { void load(); }
  };

  const colour = (t: Ticket) => (t.status === 'Ready' ? 'border-success' : t.minutes >= 20 ? 'border-danger' : t.minutes >= 10 ? 'border-warning' : 'border-secondary');

  return (
    <div className="p-3" style={{ minHeight: '100vh', background: 'var(--bs-tertiary-bg, #f4f5f7)' }}>
      <div className="d-flex align-items-center gap-2 mb-3">
        <h4 className="mb-0 me-3"><i className="ti ti-chef-hat me-1" />Kitchen</h4>
        <div className="btn-group">
          <button type="button" className={`btn btn-sm ${!stationId ? 'btn-dark' : 'btn-light'}`} onClick={() => setStationId('')}>All stations</button>
          {stations.map((s) => <button key={s.id} type="button" className={`btn btn-sm ${stationId === s.id ? 'btn-dark' : 'btn-light'}`} onClick={() => setStationId(s.id)}>{s.name}</button>)}
        </div>
        <span className="ms-auto text-muted">{tickets.length} open</span>
        {error && <span className="text-danger ms-2">{error}</span>}
      </div>
      <div className="row g-3">
        {tickets.length === 0 && <p className="text-muted fs-18">No open tickets.</p>}
        {tickets.map((t) => (
          <div key={t.id} className="col-12 col-sm-6 col-lg-4 col-xxl-3">
            <div className={`card border-3 h-100 ${colour(t)}`}>
              <div className="card-header d-flex justify-content-between align-items-center">
                <div><b className="fs-16">{t.table ? `Table ${t.table}` : t.orderType ?? 'Order'}</b><div className="text-muted fs-12">{t.bill} · {t.station}</div></div>
                <div className="text-end"><div className={`fw-bold ${t.minutes >= 20 ? 'text-danger' : ''}`}>{t.minutes} min</div><div className="fs-12">{t.status}</div></div>
              </div>
              <div className="card-body">
                {t.items.map((i, n) => (
                  <div key={n} className="mb-2"><span className="fw-bold fs-16 me-2">{i.quantity}×</span><span className="fs-16">{i.itemName}</span>
                    {i.notes && <div className="text-danger fs-13 ms-4">{i.notes}</div>}</div>
                ))}
              </div>
              <div className="card-footer p-0">
                <button type="button" className={`btn w-100 rounded-0 ${t.status === 'New' ? 'btn-warning' : t.status === 'Preparing' ? 'btn-success' : 'btn-secondary'}`} onClick={() => void bump(t)}>
                  {t.status === 'New' ? 'Start cooking' : t.status === 'Preparing' ? 'Ready' : 'Served'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KitchenDisplay;
