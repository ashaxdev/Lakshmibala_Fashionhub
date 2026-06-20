'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { formatINR } from '@/lib/utils';

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/products?limit=100');
    const data = await res.json();
    setProducts(data.products || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function remove(id) {
    if (!confirm('Delete this product?')) return;
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Product deleted');
      load();
    } else toast.error('Failed to delete');
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-2xl font-bold text-brand-magenta">Products</h1>
        <Link href="/admin/products/new" className="btn-primary flex items-center gap-1 text-sm"><Plus size={16} /> Add Product</Link>
      </div>

      {loading ? (
        <p className="text-brand-ink/50">Loading...</p>
      ) : (
        <div className="card-soft overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-brand-ink/10 text-brand-ink/50">
                <th className="p-3">Product</th>
                <th className="p-3">Category</th>
                <th className="p-3">Price</th>
                <th className="p-3">Variants</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id} className="border-b border-brand-ink/5">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 text-brand-ink/60">{p.category?.name}</td>
                  <td className="p-3">{formatINR(p.basePrice)}</td>
                  <td className="p-3">{p.variants?.length}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${p.isActive ? 'bg-brand-green/15 text-brand-deepgreen' : 'bg-brand-ink/10 text-brand-ink/50'}`}>
                      {p.isActive ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="p-3 flex gap-2 justify-end">
                    <Link href={`/admin/products/${p._id}/edit`} className="p-1.5 text-brand-magenta"><Pencil size={16} /></Link>
                    <button onClick={() => remove(p._id)} className="p-1.5 text-brand-magenta"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && <p className="text-center text-brand-ink/40 py-10">No products yet. Add your first product!</p>}
        </div>
      )}
    </div>
  );
}
