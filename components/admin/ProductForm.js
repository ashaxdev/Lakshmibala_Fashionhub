'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Plus, Trash2, Upload, Loader2, X } from 'lucide-react';

const SIZE_OPTIONS = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Free Size','32','34','36','38','40','75','80','85','90','95','100'];

const PRESET_COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Red', hex: '#E53935' },
  { name: 'Pink', hex: '#E91E8C' },
  { name: 'Magenta', hex: '#D81B60' },
  { name: 'Orange', hex: '#FB8C00' },
  { name: 'Yellow', hex: '#FDD835' },
  { name: 'Green', hex: '#43A047' },
  { name: 'Blue', hex: '#1E88E5' },
  { name: 'Navy', hex: '#1A237E' },
  { name: 'Purple', hex: '#8E24AA' },
  { name: 'Beige', hex: '#D7CCC8' },
  { name: 'Brown', hex: '#6D4C41' },
  { name: 'Grey', hex: '#9E9E9E' },
];

function emptyVariant() {
  return { color: '', colorHex: '#E91E8C', images: [''], price: '', compareAtPrice: '', sizes: [{ size: 'M', stock: 0, sku: '' }] };
}

// Per-slot upload button with preview thumbnail
function ImageSlot({ value, onChange, onRemove, showRemove }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onChange(data.url);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-2 mb-2">
      {/* Thumbnail or upload trigger */}
      <div
        onClick={() => !uploading && fileRef.current?.click()}
        className="w-12 h-12 rounded-lg border-2 border-dashed border-brand-ink/20 flex items-center justify-center cursor-pointer hover:border-brand-magenta transition-colors overflow-hidden shrink-0 relative bg-brand-cream"
      >
        {value ? (
          <img src={value} alt="" className="w-full h-full object-cover" />
        ) : uploading ? (
          <Loader2 size={16} className="animate-spin text-brand-magenta" />
        ) : (
          <Upload size={14} className="text-brand-ink/30" />
        )}
        {uploading && value && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <Loader2 size={14} className="animate-spin text-brand-magenta" />
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {/* URL input — still editable manually */}
      <input
        placeholder="https://... or click thumbnail to upload"
        className="border rounded-lg px-3 py-2 text-sm flex-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />

      {showRemove && (
        <button type="button" onClick={onRemove} className="text-brand-ink/40 hover:text-brand-magenta shrink-0">
          <X size={15} />
        </button>
      )}
    </div>
  );
}

// Mobile-friendly color picker: preset swatches with large touch targets,
// plus a bottom-sheet panel for custom colors (hex entry + native picker fallback).
function ColorPicker({ value, onChange }) {
  const [showCustom, setShowCustom] = useState(false);
  const [hexInput, setHexInput] = useState(value || '#000000');
  const nativeRef = useRef();
  const isPreset = PRESET_COLORS.some((c) => c.hex.toLowerCase() === (value || '').toLowerCase());

  function openCustom() {
    setHexInput(value || '#000000');
    setShowCustom(true);
  }

  function isValidHex(hex) {
    return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
  }

  function handleHexChange(e) {
    let val = e.target.value;
    if (val && !val.startsWith('#')) val = '#' + val;
    setHexInput(val);
    if (isValidHex(val)) onChange(val);
  }

  function applyAndClose() {
    if (isValidHex(hexInput)) onChange(hexInput);
    setShowCustom(false);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {PRESET_COLORS.map((c) => (
          <button
            key={c.hex}
            type="button"
            title={c.name}
            onClick={() => onChange(c.hex)}
            className={`w-9 h-9 rounded-full border-2 shrink-0 transition-transform ${
              value?.toLowerCase() === c.hex.toLowerCase()
                ? 'border-brand-magenta scale-110 ring-2 ring-brand-magenta/30'
                : 'border-black/10'
            }`}
            style={{ backgroundColor: c.hex }}
          />
        ))}

        {/* Custom color trigger — opens friendly panel instead of raw native picker */}
        <button
          type="button"
          onClick={openCustom}
          title="Custom color"
          className={`w-9 h-9 rounded-full border-2 shrink-0 flex items-center justify-center overflow-hidden ${
            !isPreset ? 'border-brand-magenta scale-110 ring-2 ring-brand-magenta/30' : 'border-black/10'
          }`}
          style={{ background: isPreset ? 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' : value }}
        >
          <span className="sr-only">Custom color</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="w-5 h-5 rounded-full border border-black/10 shrink-0"
          style={{ backgroundColor: value }}
        />
        <button
          type="button"
          onClick={openCustom}
          className="text-xs text-brand-ink/60 font-mono underline decoration-dotted"
        >
          {value}
        </button>
      </div>

      {/* Mobile-friendly custom color panel */}
      {showCustom && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center bg-black/40"
          onClick={() => setShowCustom(false)}
        >
          <div
            className="bg-white w-full sm:w-80 rounded-t-2xl sm:rounded-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Custom color</h3>
              <button type="button" onClick={() => setShowCustom(false)} className="text-brand-ink/40">
                <X size={18} />
              </button>
            </div>

            {/* Large preview, tappable to open native OS color picker */}
            <button
              type="button"
              onClick={() => nativeRef.current?.click()}
              className="w-full h-20 rounded-xl border border-black/10 mb-4 relative overflow-hidden"
              style={{ backgroundColor: isValidHex(hexInput) ? hexInput : '#fff' }}
            >
              <span className="absolute bottom-1.5 right-2 text-[10px] bg-white/80 px-1.5 py-0.5 rounded text-brand-ink/60">
                Tap to pick visually
              </span>
            </button>
            <input
              ref={nativeRef}
              type="color"
              className="sr-only"
              value={isValidHex(hexInput) ? hexInput : '#000000'}
              onChange={(e) => { setHexInput(e.target.value); onChange(e.target.value); }}
            />

            {/* Hex text entry — easiest path on mobile keyboards */}
            <label className="text-xs font-medium text-brand-ink/60 mb-1 block">Hex code</label>
            <input
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              placeholder="#E91E8C"
              maxLength={7}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm font-mono mb-1 ${
                hexInput && !isValidHex(hexInput) ? 'border-red-400' : ''
              }`}
              value={hexInput}
              onChange={handleHexChange}
            />
            {hexInput && !isValidHex(hexInput) && (
              <p className="text-xs text-red-500 mb-2">Enter a valid hex code, e.g. #E91E8C</p>
            )}

            <button
              type="button"
              onClick={applyAndClose}
              disabled={!isValidHex(hexInput)}
              className="btn-primary w-full mt-3 disabled:opacity-40"
            >
              Use this color
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductForm({ initial, productId }) {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(
    initial || {
      name: '', slug: '', description: '', category: '', fabric: '', tags: [],
      variants: [emptyVariant()],
      isBestSeller: false, isTopSeller: false, isActiveSeller: true, isFeatured: false, isActive: true,
    }
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/categories').then((r) => r.json()).then((d) => setCategories(d.categories || []));
  }, []);

  function update(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function updateVariant(idx, field, value) {
    setForm((f) => { const v = [...f.variants]; v[idx] = { ...v[idx], [field]: value }; return { ...f, variants: v }; });
  }

  function updateVariantImage(vIdx, imgIdx, value) {
    setForm((f) => {
      const variants = [...f.variants];
      const images = [...variants[vIdx].images];
      images[imgIdx] = value;
      variants[vIdx] = { ...variants[vIdx], images };
      return { ...f, variants };
    });
  }

  function removeVariantImage(vIdx, imgIdx) {
    setForm((f) => {
      const variants = [...f.variants];
      const images = variants[vIdx].images.filter((_, i) => i !== imgIdx);
      variants[vIdx] = { ...variants[vIdx], images: images.length ? images : [''] };
      return { ...f, variants };
    });
  }

  function addVariantImage(vIdx) {
    setForm((f) => {
      const variants = [...f.variants];
      variants[vIdx] = { ...variants[vIdx], images: [...variants[vIdx].images, ''] };
      return { ...f, variants };
    });
  }

  function updateSize(vIdx, sIdx, field, value) {
    setForm((f) => {
      const variants = [...f.variants];
      const sizes = [...variants[vIdx].sizes];
      sizes[sIdx] = { ...sizes[sIdx], [field]: value };
      variants[vIdx] = { ...variants[vIdx], sizes };
      return { ...f, variants };
    });
  }

  function addSize(vIdx) {
    setForm((f) => {
      const variants = [...f.variants];
      variants[vIdx] = { ...variants[vIdx], sizes: [...variants[vIdx].sizes, { size: 'L', stock: 0, sku: '' }] };
      return { ...f, variants };
    });
  }

  function removeSize(vIdx, sIdx) {
    setForm((f) => {
      const variants = [...f.variants];
      variants[vIdx] = { ...variants[vIdx], sizes: variants[vIdx].sizes.filter((_, i) => i !== sIdx) };
      return { ...f, variants };
    });
  }

  function addVariant() { setForm((f) => ({ ...f, variants: [...f.variants, emptyVariant()] })); }
  function removeVariant(idx) { setForm((f) => ({ ...f, variants: f.variants.filter((_, i) => i !== idx) })); }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      variants: form.variants.map((v) => ({
        ...v,
        price: Number(v.price),
        compareAtPrice: Number(v.compareAtPrice) || 0,
        images: v.images.filter(Boolean),
        sizes: v.sizes.map((s) => ({ ...s, stock: Number(s.stock) })),
      })),
    };
    const url = productId ? `/api/products/${productId}` : '/api/products';
    const method = productId ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      toast.success(productId ? 'Product updated' : 'Product created');
      router.push('/admin/products');
    } else {
      toast.error(data.error || 'Something went wrong');
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="card-soft p-5 grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Product Name *</label>
          <input required className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={form.name} onChange={(e) => update('name', e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Category *</label>
          <select required className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={form.category?._id || form.category} onChange={(e) => update('category', e.target.value)}>
            <option value="">Select category</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Fabric</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={form.fabric} onChange={(e) => update('fabric', e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Tags (comma separated)</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
            value={Array.isArray(form.tags) ? form.tags.join(', ') : ''}
            onChange={(e) => update('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium">Description</label>
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm mt-1" rows={3} value={form.description} onChange={(e) => update('description', e.target.value)} />
        </div>
        <div className="sm:col-span-2 flex flex-wrap gap-4">
          {[
            ['isBestSeller', 'Bestseller'], ['isTopSeller', 'Top Seller'],
            ['isActiveSeller', 'Active Seller'], ['isFeatured', 'Featured'],
            ['isActive', 'Active (visible on site)'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form[key]} onChange={(e) => update(key, e.target.checked)} /> {label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Variants (Color, Images, Price & Size Stock)</h2>
          <button type="button" onClick={addVariant} className="btn-outline text-sm flex items-center gap-1"><Plus size={16} /> Add Variant</button>
        </div>

        {form.variants.map((v, vIdx) => (
          <div key={vIdx} className="card-soft p-4 mb-4">
            <div className="flex justify-between mb-3">
              <span className="font-medium text-sm">Variant {vIdx + 1}</span>
              {form.variants.length > 1 && (
                <button type="button" onClick={() => removeVariant(vIdx)} className="text-brand-magenta"><Trash2 size={16} /></button>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <input placeholder="Color name (e.g. Green)" className="border rounded-lg px-3 py-2 text-sm" value={v.color} onChange={(e) => updateVariant(vIdx, 'color', e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Price ₹" type="number" className="border rounded-lg px-3 py-2 text-sm" value={v.price} onChange={(e) => updateVariant(vIdx, 'price', e.target.value)} />
                <input placeholder="Compare-at price ₹" type="number" className="border rounded-lg px-3 py-2 text-sm" value={v.compareAtPrice} onChange={(e) => updateVariant(vIdx, 'compareAtPrice', e.target.value)} />
              </div>
            </div>

            <div className="mb-3">
              <p className="text-xs font-medium text-brand-ink/60 mb-2">Swatch color</p>
              <ColorPicker value={v.colorHex} onChange={(hex) => updateVariant(vIdx, 'colorHex', hex)} />
            </div>

            <p className="text-xs font-medium text-brand-ink/60 mb-2">Images for this colour — click thumbnail to upload</p>
            {v.images.map((img, imgIdx) => (
              <ImageSlot
                key={imgIdx}
                value={img}
                onChange={(url) => updateVariantImage(vIdx, imgIdx, url)}
                onRemove={() => removeVariantImage(vIdx, imgIdx)}
                showRemove={v.images.length > 1}
              />
            ))}
            <button type="button" onClick={() => addVariantImage(vIdx)} className="text-xs text-brand-magenta mb-3">
              + Add another image
            </button>

            <p className="text-xs font-medium text-brand-ink/60 mb-1">Sizes & Stock</p>
            {v.sizes.map((s, sIdx) => (
              <div key={sIdx} className="flex gap-2 mb-2 items-center">
                <select className="border rounded-lg px-2 py-1.5 text-sm" value={s.size} onChange={(e) => updateSize(vIdx, sIdx, 'size', e.target.value)}>
                  {SIZE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <input type="number" placeholder="Stock" className="border rounded-lg px-2 py-1.5 text-sm w-24" value={s.stock} onChange={(e) => updateSize(vIdx, sIdx, 'stock', e.target.value)} />
                <input placeholder="SKU (optional)" className="border rounded-lg px-2 py-1.5 text-sm flex-1" value={s.sku} onChange={(e) => updateSize(vIdx, sIdx, 'sku', e.target.value)} />
                <button type="button" onClick={() => removeSize(vIdx, sIdx)} className="text-brand-magenta"><Trash2 size={14} /></button>
              </div>
            ))}
            <button type="button" onClick={() => addSize(vIdx)} className="text-xs text-brand-magenta">+ Add size</button>
          </div>
        ))}
      </div>

      <button disabled={saving} className="btn-primary w-full sm:w-auto">
        {saving ? 'Saving...' : productId ? 'Update Product' : 'Create Product'}
      </button>
    </form>
  );
}