import React, { useEffect, useState } from 'react';
import api from '../../services/api';

interface Approver { id: number; name: string; role: string }
interface Props {
  quotation: { id: number; reference: string; customerName: string; grandTotal: number; approvalStatus?: string | null; approvalSentTo?: string | null; approvalNote?: string | null; approvalBy?: string | null };
  onClose: () => void;
  onDone: (text: string) => void;
}

const money = (n: number) => `Rs ${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const errText = (e: any, f: string) => e?.response?.data?.message || f;

/** Staff: send a quotation to the Admin / Super Admin (one or more) for approval, or take a pending request back */
const SendForApprovalModal: React.FC<Props> = ({ quotation: q, onClose, onDone }) => {
  const [approvers, setApprovers] = useState<Approver[] | null>(null);
  const [chosen, setChosen] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = q.approvalStatus === 'Pending';
  const discarded = q.approvalStatus === 'Discarded';

  useEffect(() => {
    api.get<Approver[]>('/quotation-approvals/approvers')
      .then((r) => setApprovers(r.data))   // nothing ticked: the staff member chooses
      .catch(() => setError('Could not load the admins.'));
  }, []);

  const toggle = (id: number) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const all = approvers ? approvers.length > 0 && chosen.length === approvers.length : false;

  const send = async () => {
    if (chosen.length === 0) { setError('Choose who to send it to.'); return; }
    setBusy(true); setError('');
    try {
      await api.post(`/quotations/${q.id}/approval-request`, { recipientIds: chosen, message: message.trim() || undefined });
      const names = approvers!.filter((a) => chosen.includes(a.id)).map((a) => a.name).join(', ');
      onDone(`${q.reference} sent for approval to ${names}. You can convert it to a sale once it is approved.`);
    } catch (e) { setError(errText(e, 'Could not send it.')); }
    setBusy(false);
  };
  const withdraw = async () => {
    setBusy(true); setError('');
    try { await api.post(`/quotations/${q.id}/approval-request/withdraw`); onDone(`Approval request for ${q.reference} taken back.`); }
    catch (e) { setError(errText(e, 'Could not take it back.')); }
    setBusy(false);
  };

  return (
    <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">Send {q.reference} for approval</h4>
            <button type="button" className="btn-close" onClick={onClose} disabled={busy} />
          </div>
          <div className="modal-body">
            <p className="mb-2"><strong>{q.customerName}</strong> - {money(q.grandTotal)}</p>
            {pending && (
              <div className="alert alert-warning py-2">
                Waiting for approval from <strong>{q.approvalSentTo}</strong>. Sending again replaces that request (e.g. to send it to someone else).
              </div>
            )}
            {discarded && (
              <div className="alert alert-danger py-2">
                Discarded by <strong>{q.approvalBy}</strong>{q.approvalNote && <>: "{q.approvalNote}"</>}. Change the quotation if needed and send it again.
              </div>
            )}
            <label className="form-label mb-1">Send to</label>
            {!approvers ? <div className="text-muted small">Loading...</div> : approvers.length === 0 ? (
              <div className="alert alert-danger py-2 mb-0">The company has no active Admin or Super Admin to approve it.</div>
            ) : (
              <div className="border rounded p-2 mb-3">
                {approvers.length > 1 && (
                  <div className="form-check mb-1">
                    <input className="form-check-input" type="checkbox" id="appr-all" checked={all} onChange={() => setChosen(all ? [] : approvers.map((a) => a.id))} />
                    <label className="form-check-label fw-semibold" htmlFor="appr-all">All of them</label>
                  </div>
                )}
                {approvers.map((a) => (
                  <div className="form-check" key={a.id}>
                    <input className="form-check-input" type="checkbox" id={`appr-${a.id}`} checked={chosen.includes(a.id)} onChange={() => toggle(a.id)} />
                    <label className="form-check-label" htmlFor={`appr-${a.id}`}>{a.name} <span className="badge bg-light text-dark border ms-1">{a.role}</span></label>
                  </div>
                ))}
              </div>
            )}
            <label className="form-label mb-1">Message <small className="text-muted">(optional)</small></label>
            <textarea className="form-control" rows={2} maxLength={500} placeholder="e.g. Customer wants delivery this week" value={message} onChange={(e) => setMessage(e.target.value)} />
            {error && <div className="alert alert-danger py-2 mt-3 mb-0">{error}</div>}
          </div>
          <div className="modal-footer">
            {pending && <button type="button" className="btn btn-outline-danger me-auto" onClick={withdraw} disabled={busy}>Take back request</button>}
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={send} disabled={busy || !approvers?.length || chosen.length === 0}>
              <i className="ti ti-send me-1" />{busy ? 'Sending...' : pending ? 'Send again' : 'Send for approval'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendForApprovalModal;
