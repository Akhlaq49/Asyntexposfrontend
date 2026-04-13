import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { mediaUrl } from '../../services/api';
import {
  createWebContent,
  deleteWebContent,
  getWebContents,
  updateWebContent,
  WebContentItem,
  WebContentSection,
} from '../../services/webContentService';

type FormState = {
  section: WebContentSection;
  title: string;
  subtitle: string;
  content: string;
  linkUrl: string;
  buttonText: string;
  sortOrder: number;
  status: string;
};

const defaultForm: FormState = {
  section: 'header',
  title: '',
  subtitle: '',
  content: '',
  linkUrl: '',
  buttonText: '',
  sortOrder: 0,
  status: 'active',
};

const sectionOptions: WebContentSection[] = ['header', 'banner', 'slider', 'near_slider', 'footer'];

const WebContentManager: React.FC = () => {
  const [items, setItems] = useState<WebContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await getWebContents(selectedSection || undefined);
      setItems(data);
    } catch (error: any) {
      setMessage({ type: 'danger', text: error?.response?.data?.message || 'Failed to load web content.' });
    } finally {
      setLoading(false);
    }
  }, [selectedSection]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const groupedCounts = useMemo(() => {
    return sectionOptions.reduce<Record<string, number>>((acc, key) => {
      acc[key] = items.filter((i) => i.section === key).length;
      return acc;
    }, {});
  }, [items]);

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
    setImageFile(null);
  };

  const onEdit = (item: WebContentItem) => {
    setEditingId(item.id);
    setForm({
      section: (item.section as WebContentSection) || 'header',
      title: item.title || '',
      subtitle: item.subtitle || '',
      content: item.content || '',
      linkUrl: item.linkUrl || '',
      buttonText: item.buttonText || '',
      sortOrder: item.sortOrder || 0,
      status: item.status || 'active',
    });
    setImageFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onDelete = async (id: number) => {
    if (!window.confirm('Delete this web content item?')) return;
    try {
      await deleteWebContent(id);
      setMessage({ type: 'success', text: 'Web content deleted successfully.' });
      await loadItems();
    } catch (error: any) {
      setMessage({ type: 'danger', text: error?.response?.data?.message || 'Failed to delete item.' });
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        section: form.section,
        title: form.title,
        subtitle: form.subtitle,
        content: form.content,
        linkUrl: form.linkUrl,
        buttonText: form.buttonText,
        sortOrder: Number(form.sortOrder) || 0,
        status: form.status,
      };

      if (editingId) {
        await updateWebContent(editingId, payload, imageFile);
        setMessage({ type: 'success', text: 'Web content updated successfully.' });
      } else {
        await createWebContent(payload, imageFile);
        setMessage({ type: 'success', text: 'Web content created successfully.' });
      }

      resetForm();
      await loadItems();
    } catch (error: any) {
      setMessage({ type: 'danger', text: error?.response?.data?.message || 'Failed to save web content.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4 className="fw-bold">Web Content Manager</h4>
            <h6>Manage dynamic storefront content for header, banners, slider and footer</h6>
          </div>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type} alert-dismissible fade show`} role="alert">
          {message.text}
          <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
        </div>
      )}

      <div className="card mb-4">
        <div className="card-header py-3 d-flex align-items-center justify-content-between">
          <h5 className="card-title mb-0">{editingId ? 'Edit Content' : 'Add Content'}</h5>
          {editingId && (
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={resetForm}>
              Cancel Edit
            </button>
          )}
        </div>
        <div className="card-body">
          <form onSubmit={onSubmit}>
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label">Section</label>
                <select
                  className="form-select"
                  value={form.section}
                  onChange={(e) => setForm((prev) => ({ ...prev, section: e.target.value as WebContentSection }))}
                >
                  {sectionOptions.map((section) => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Sort Order</label>
                <input
                  className="form-control"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Image</label>
                <input
                  className="form-control"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Title</label>
                <input
                  className="form-control"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Subtitle</label>
                <input
                  className="form-control"
                  value={form.subtitle}
                  onChange={(e) => setForm((prev) => ({ ...prev, subtitle: e.target.value }))}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Link URL</label>
                <input
                  className="form-control"
                  placeholder="/shop or https://..."
                  value={form.linkUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, linkUrl: e.target.value }))}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Button Text</label>
                <input
                  className="form-control"
                  value={form.buttonText}
                  onChange={(e) => setForm((prev) => ({ ...prev, buttonText: e.target.value }))}
                />
              </div>
              <div className="col-12">
                <label className="form-label">Content</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={form.content}
                  onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                ></textarea>
                <small className="text-muted">
                  For footer menu links you can enter lines like: About Us|/about (one per line).
                </small>
              </div>
            </div>

            <div className="mt-3">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update Content' : 'Create Content'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header py-3 d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0">Content List</h5>
          <div className="d-flex align-items-center gap-2">
            <select
              className="form-select"
              style={{ minWidth: 180 }}
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
            >
              <option value="">All Sections</option>
              {sectionOptions.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={loadItems}>
              Refresh
            </button>
          </div>
        </div>
        <div className="card-body">
          <div className="mb-3 d-flex gap-2 flex-wrap">
            {sectionOptions.map((section) => (
              <span key={section} className="badge bg-light text-dark">
                {section}: {groupedCounts[section] || 0}
              </span>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered align-middle">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Section</th>
                    <th>Title</th>
                    <th>Image</th>
                    <th>Link</th>
                    <th>Status</th>
                    <th>Sort</th>
                    <th style={{ minWidth: 130 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-4">
                        No web content found.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>{item.section}</td>
                        <td>
                          <div className="fw-semibold">{item.title || '-'}</div>
                          <small className="text-muted">{item.subtitle || '-'}</small>
                        </td>
                        <td>
                          {item.imageUrl ? (
                            <img
                              src={mediaUrl(item.imageUrl)}
                              alt={item.title || 'content'}
                              style={{ width: 70, height: 45, objectFit: 'cover', borderRadius: 4 }}
                            />
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          <small>{item.linkUrl || '-'}</small>
                        </td>
                        <td>
                          <span className={`badge ${item.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                            {item.status}
                          </span>
                        </td>
                        <td>{item.sortOrder}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <button type="button" className="btn btn-sm btn-primary" onClick={() => onEdit(item)}>
                              Edit
                            </button>
                            <button type="button" className="btn btn-sm btn-danger" onClick={() => onDelete(item.id)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default WebContentManager;
