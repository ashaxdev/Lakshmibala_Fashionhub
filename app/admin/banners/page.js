'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, X, Upload, Loader2 } from 'lucide-react';

const emptyForm = {
  title: '', subtitle: '', image: '', link: '',
  buttonText: 'Shop Now', sortOrder: 0, isActive: true,
};

export default function AdminBannersPage() {
  const [banners, setBanners] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState('');
  const fileRef = useRef();

  async function load() {
    const res = await fetch('/api/banners?all=true');
    const data = await res.json();
    setBanners(data.banners || []);
  }
  useEffect(() => { load(); }, []);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // local preview instantly
    setPreview(URL.createObjectURL(file));

    // upload to Cloudinary via our API route
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setForm((f) => ({ ...f, image: data.url }));
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.message);
      setPreview('');
    } finally {
      setUploading(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.image) { toast.error('Please upload an image'); return; }
    const res = await fetch('/api/banners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success('Banner added');
      setShowForm(false);
      setForm(emptyForm);
      setPreview('');
      load();
    }
  }

  function closeForm() {
    setShowForm(false);
    setForm(emptyForm);
    setPreview('');
  }

  async function toggleActive(b) {
    await fetch(`/api/banners/${b._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !b.isActive }),
    });
    load();
  }

  async function remove(id) {
    if (!confirm('Delete this banner?')) return;
    await fetch(`/api/banners/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-2xl font-bold text-brand-magenta">Homepage Banners</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-1 text-sm">
          <Plus size={16} /> Add Banner
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card-soft p-5 mb-6 space-y-3">
          <div className="flex justify-between">
            <h2 className="font-semibold">New Banner</h2>
            <button type="button" onClick={closeForm}><X size={18} /></button>
          </div>

          {/* Image upload */}
          <div
            onClick={() => !uploading && fileRef.current?.click()}
            className="w-full h-36 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-brand-magenta transition-colors overflow-hidden relative"
          >
            {preview ? (
              <img src={preview} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-brand-ink/40 text-sm">
                <Upload size={24} />
                <span>Click to choose image</span>
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-brand-magenta" />
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

          <input placeholder="Title" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input placeholder="Subtitle" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          <input placeholder="Link (e.g. /category/umbrella-kurtis)" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
          <input placeholder="Button text" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.buttonText} onChange={(e) => setForm({ ...form, buttonText: e.target.value })} />
          <input type="number" placeholder="Sort order" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />

          <button className="btn-primary text-sm" disabled={uploading}>
            {uploading ? 'Uploading…' : 'Create'}
          </button>
        </form>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {banners.map((b) => (
          <div key={b._id} className="card-soft overflow-hidden">
            <img src={b.image} alt={b.title} className="w-full h-32 object-cover" />
            <div className="p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{b.title || '(no title)'}</p>
                <p className="text-xs text-brand-ink/50">Order: {b.sortOrder}</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs flex items-center gap-1">
                  <input type="checkbox" checked={b.isActive} onChange={() => toggleActive(b)} /> Active
                </label>
                <button onClick={() => remove(b._id)} className="text-brand-magenta"><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}