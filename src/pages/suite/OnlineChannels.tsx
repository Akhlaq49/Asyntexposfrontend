import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/suite/Modal';
import { LocationSelect, statusBadge, useLocations } from '../../components/suite/Pickers';
import suite, { ChannelConnection } from '../../services/suiteService';
import { apiError } from '../../services/pharmacyService';

type Row = Awaited<ReturnType<typeof suite.channels>>[number];
type Log = Awaited<ReturnType<typeof suite.channelLog>>;

const blank: Partial<ChannelConnection> = { shopDomain: '', accessToken: '', webhookSecret: '', syncProducts: true, syncStock: true, syncPrices: true, importOrders: true, status: 'Active' };

/** Shopify: products, prices and stock go out from Asyntex; orders come back in as sales. */
const OnlineChannels: React.FC = () => {
  const locations = useLocations();
  const [rows, setRows] = useState<Row[]>([]);
  const [edit, setEdit] = useState<Partial<ChannelConnection> | null>(null);
  const [log, setLog] = useState<{ id: number; data: Log } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setRows(await suite.channels()); }
    catch (err) { Swal.fire({ icon: 'error', title: 'Could not load channels', text: apiError(err) }); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!edit) return;
    setBusy(true);
    try {
      await suite.saveChannel(edit.id ?? null, { ...edit, locationId: edit.locationId ?? locations.find((l) => l.sellsOnline)?.id ?? locations[0]?.id });
      setEdit(null);
      void load();
    } catch (err) { Swal.fire({ icon: 'error', title: 'Could not save', text: apiError(err) }); }
    finally { setBusy(false); }
  };

  const run = async (label: string, fn: () => Promise<unknown>, done: (r: any) => string) => {
    setBusy(true);
    try { const r = await fn(); Swal.fire({ icon: 'success', title: label, text: done(r) }); void load(); }
    catch (err) { Swal.fire({ icon: 'error', title: `${label} failed`, text: apiError(err) }); }
    finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Online Channels" subtitle="Connect a Shopify store. Asyntex publishes products, prices and branch stock; Shopify orders come back as sales."
        breadcrumbs={[{ title: 'Sales' }, { title: 'Online Channels' }]}
        actions={<button type="button" className="btn btn-primary" onClick={() => setEdit({ ...blank })}><i className="ti ti-plus me-1" />Connect Shopify</button>} />

      {rows.length === 0 && (
        <div className="card"><div className="card-body">
          <h6>How to connect</h6>
          <ol className="fs-13 mb-0">
            <li>In Shopify admin: Settings → Apps → Develop apps → Create an app.</li>
            <li>Give it the Admin API scopes <code>write_products</code>, <code>write_inventory</code>, <code>read_locations</code>, <code>read_orders</code>, then install it and copy the Admin API access token.</li>
            <li>Click <b>Connect Shopify</b> here, paste the store address and the token, and pick the branch whose stock is published.</li>
            <li>In Shopify: Settings → Notifications → Webhooks, add <b>Order creation</b>, <b>Order payment</b> and <b>Order cancellation</b> pointing to the webhook address shown here (JSON). Paste Shopify's signing secret into the connection.</li>
          </ol>
        </div></div>
      )}

      {rows.map(({ connection: c, linkedProducts, pending, failed }) => (
        <div className="card" key={c.id}>
          <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div><i className="ti ti-brand-shopee me-1" /><b>{c.shopDomain}</b> {statusBadge(c.status)}
              <div className="text-muted fs-12">Stock from {locations.find((l) => l.id === c.locationId)?.name ?? '—'} · {linkedProducts} products linked · {pending} waiting · {failed} failed{c.lastSyncAt && ` · last sync ${new Date(c.lastSyncAt + 'Z').toLocaleString()}`}</div></div>
            <div className="d-flex gap-1 flex-wrap">
              <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => void run('Connection works', () => suite.testChannel(c.id), (r) => `${r.shop} · ${r.locations.length} Shopify location(s)`)}>Test</button>
              <button type="button" className="btn btn-sm btn-outline-primary" disabled={busy} onClick={() => void run('Products queued', () => suite.syncProducts(c.id), (r) => `${r.queued} product(s) will be published within a minute.`)}>Publish products</button>
              <button type="button" className="btn btn-sm btn-outline-primary" disabled={busy} onClick={() => void run('Stock queued', () => suite.syncStock(c.id), (r) => `${r.queued} stock level(s) queued.`)}>Push stock</button>
              <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => void run('Sent', () => suite.processNow(), (r) => `${r.sent} update(s) sent to Shopify.`)}>Send now</button>
              {failed > 0 && <button type="button" className="btn btn-sm btn-warning" disabled={busy} onClick={() => void run('Retrying', () => suite.retryFailed(c.id), (r) => `${r.requeued} update(s) and ${r.reimported} order(s) retried.`)}>Retry failed</button>}
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={async () => setLog({ id: c.id, data: await suite.channelLog(c.id) })}>Log</button>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setEdit({ ...c })} aria-label="Edit"><i className="ti ti-edit" /></button>
            </div>
          </div>
          <div className="card-body fs-13">
            {c.lastError && <div className="alert alert-danger py-2">{c.lastError}</div>}
            <div>Webhook address: <code className="user-select-all">{c.webhookUrl}</code></div>
            <div className="text-muted mt-1">Prescription-only and controlled medicines are never published. Stock pushed is the unexpired stock at the chosen branch.</div>
          </div>
        </div>
      ))}

      <Modal show={!!edit} title={edit?.id ? 'Edit Shopify connection' : 'Connect Shopify'} onClose={() => setEdit(null)} size="lg"
        footer={<>
          {edit?.id && <button type="button" className="btn btn-outline-danger me-auto" onClick={async () => { const ok = await Swal.fire({ icon: 'warning', title: 'Disconnect?', showCancelButton: true }); if (ok.isConfirmed) { await suite.deleteChannel(edit.id!); setEdit(null); void load(); } }}>Disconnect</button>}
          <button type="button" className="btn btn-light" onClick={() => setEdit(null)}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>Save</button></>}>
        {edit && (
          <div className="row g-3">
            <div className="col-md-6"><label className="form-label">Store address</label>
              <input className="form-control" placeholder="yourstore.myshopify.com" value={edit.shopDomain ?? ''} onChange={(e) => setEdit({ ...edit, shopDomain: e.target.value })} /></div>
            <div className="col-md-6"><label className="form-label">Branch whose stock is published</label>
              <LocationSelect locations={locations} value={edit.locationId ?? ''} onChange={(v) => setEdit({ ...edit, locationId: v || undefined })} allowAll="Choose…" /></div>
            <div className="col-md-6"><label className="form-label">Admin API access token</label>
              <input className="form-control" type="password" autoComplete="off" value={edit.accessToken ?? ''} onChange={(e) => setEdit({ ...edit, accessToken: e.target.value })} /></div>
            <div className="col-md-6"><label className="form-label">Webhook signing secret</label>
              <input className="form-control" type="password" autoComplete="off" value={edit.webhookSecret ?? ''} onChange={(e) => setEdit({ ...edit, webhookSecret: e.target.value })} /></div>
            <div className="col-md-6"><label className="form-label">Shopify location ID (optional)</label>
              <input className="form-control" placeholder="Filled in by Test" value={edit.externalLocationId ?? ''} onChange={(e) => setEdit({ ...edit, externalLocationId: e.target.value })} /></div>
            <div className="col-md-6"><label className="form-label">Status</label>
              <select className="form-select" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}><option>Active</option><option>Paused</option></select></div>
            <div className="col-12 d-flex flex-wrap gap-4">
              {(['syncProducts', 'syncStock', 'syncPrices', 'importOrders'] as const).map((k) => (
                <label key={k} className="form-check"><input type="checkbox" className="form-check-input" checked={!!edit[k]} onChange={(e) => setEdit({ ...edit, [k]: e.target.checked })} />
                  <span className="form-check-label">{{ syncProducts: 'Publish products', syncStock: 'Push stock', syncPrices: 'Push prices', importOrders: 'Import orders' }[k]}</span></label>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <Modal show={!!log} title="Channel log" onClose={() => setLog(null)} size="xl">
        {log && (
          <div className="row g-3">
            <div className="col-lg-6">
              <h6>Orders from Shopify</h6>
              <table className="table table-sm"><thead><tr><th>Order</th><th>Status</th><th>Sale</th><th>When</th></tr></thead>
                <tbody>{log.data.orders.map((o) => <tr key={o.id}><td>{o.externalNumber ?? o.externalOrderId}{o.error && <div className="text-danger fs-12">{o.error}</div>}</td><td>{statusBadge(o.status)}</td><td>{o.saleId ? <a href={`/sale-receipt/${o.saleId}`}>#{o.saleId}</a> : ''}</td><td className="fs-12">{new Date(o.importedAt + 'Z').toLocaleString()}</td></tr>)}</tbody></table>
            </div>
            <div className="col-lg-6">
              <h6>Updates to Shopify</h6>
              <table className="table table-sm"><thead><tr><th>What</th><th>Status</th><th>Tries</th><th>When</th></tr></thead>
                <tbody>{log.data.outbox.map((o) => <tr key={o.id}><td>{o.kind === 'Product' ? 'Product' : 'Stock'}: {o.product ?? o.entityId}{o.lastError && <div className="text-danger fs-12">{o.lastError}</div>}</td><td>{statusBadge(o.status)}</td><td>{o.attempts}</td><td className="fs-12">{new Date((o.sentAt ?? o.createdAt) + 'Z').toLocaleString()}</td></tr>)}</tbody></table>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default OnlineChannels;
