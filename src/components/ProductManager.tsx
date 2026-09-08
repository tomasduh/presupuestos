import { useEffect, useMemo, useState } from 'react';
import type { Category, Product } from '../lib/types';
import { formatCOP } from '../lib/format';
import { FiPlus, FiEdit2, FiTrash2, FiImage, FiUpload, FiTag, FiX } from 'react-icons/fi';
import AccordionSection from './AccordionSection';

interface FormState {
  id: string | null;
  name: string;
  price: string;
  category_id: string;
  images: string[];
}

const emptyForm: FormState = { id: null, name: '', price: '', category_id: '', images: [] };

export default function ProductManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [newCategoryMode, setNewCategoryMode] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');

  async function loadAll() {
    setLoading(true);
    const [catsRes, prodsRes] = await Promise.all([fetch('/api/categories'), fetch('/api/products')]);
    setCategories(await catsRes.json());
    setProducts(await prodsRes.json());
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const grouped = useMemo(() => {
    const filtered = filterCategory ? products.filter((p) => p.category_id === filterCategory) : products;
    const map = new Map<string, Product[]>();
    for (const p of filtered) {
      const key = p.category_name ?? 'Sin categoría';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return Array.from(map.entries());
  }, [products, filterCategory]);

  function openNewForm() {
    setForm(emptyForm);
    setError('');
    setShowForm(true);
    setNewCategoryMode(false);
  }

  function openEditForm(p: Product) {
    setForm({
      id: p.id,
      name: p.name,
      price: String(p.price),
      category_id: p.category_id ?? '',
      images: p.images,
    });
    setError('');
    setShowForm(true);
    setNewCategoryMode(false);
  }

  async function handleImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    setUploading(true);
    setError('');
    const uploaded: string[] = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'No se pudo subir la imagen');
        continue;
      }
      const body = await res.json();
      uploaded.push(body.path);
    }
    setUploading(false);
    if (uploaded.length > 0) {
      setForm((f) => ({ ...f, images: [...f.images, ...uploaded] }));
    }
  }

  function removeImage(imagePath: string) {
    setForm((f) => ({ ...f, images: f.images.filter((p) => p !== imagePath) }));
  }

  async function createCategory() {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'No se pudo crear la categoría');
      return;
    }
    const category = await res.json();
    setCategories((c) => [...c, category]);
    setForm((f) => ({ ...f, category_id: category.id }));
    setNewCategoryName('');
    setNewCategoryMode(false);
  }

  async function createQuickCategory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = quickCategoryName.trim();
    if (!trimmed) return;
    setCategoryError('');
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setCategoryError(body.error ?? 'No se pudo crear la categoría');
      return;
    }
    const category = await res.json();
    setCategories((c) => [...c, category]);
    setQuickCategoryName('');
    setAddingCategory(false);
  }

  async function saveProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Ponele un nombre al producto');
      return;
    }
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) {
      setError('Ingresá un precio válido');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      name: form.name.trim(),
      price,
      category_id: form.category_id || null,
      images: form.images,
    };
    const res = await fetch(form.id ? `/api/products/${form.id}` : '/api/products', {
      method: form.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'No se pudo guardar el producto');
      return;
    }
    setShowForm(false);
    setForm(emptyForm);
    loadAll();
  }

  async function deleteProduct(id: string) {
    if (!confirm('¿Eliminar este producto? También se quitará de los presupuestos donde esté.')) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    loadAll();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <h1>Productos</h1>
          <p className="page-subtitle">Cargá los artículos que necesitás para tu casa nueva.</p>
        </div>
        <button onClick={openNewForm}>
          <FiPlus /> Nuevo producto
        </button>
      </div>

      {showForm && (
        <form className="card" onSubmit={saveProduct} style={{ marginBottom: 24 }}>
          <h2>{form.id ? 'Editar producto' : 'Nuevo producto'}</h2>
          <div className="grid grid-2">
            <div className="field">
              <label>Nombre</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: Juego de sábanas"
                autoFocus
              />
            </div>
            <div className="field">
              <label>Precio (COP)</label>
              <input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="Ej: 85000"
              />
            </div>
          </div>

          <div className="field">
            <label>Categoría</label>
            {!newCategoryMode ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                >
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button type="button" className="secondary" onClick={() => setNewCategoryMode(true)}>
                  <FiPlus /> Nueva
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nombre de la categoría"
                  autoFocus
                />
                <button type="button" onClick={createCategory}>
                  Crear
                </button>
                <button type="button" className="secondary" onClick={() => setNewCategoryMode(false)}>
                  Cancelar
                </button>
              </div>
            )}
          </div>

          <div className="field">
            <label>
              <FiImage style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Imágenes (opcional)
            </label>
            <input
              id="product-images-input"
              className="file-input"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              onChange={handleImagesChange}
            />
            <div className="image-uploader">
              {form.images.map((imagePath) => (
                <div className="image-thumb" key={imagePath}>
                  <img src={imagePath} alt="preview" />
                  <button
                    type="button"
                    className="danger image-thumb-remove"
                    onClick={() => removeImage(imagePath)}
                    title="Quitar imagen"
                  >
                    <FiX size={12} />
                  </button>
                </div>
              ))}
              <label htmlFor="product-images-input" className="image-add-btn">
                <FiUpload size={16} />
                {uploading ? 'Subiendo...' : 'Agregar'}
              </label>
            </div>
          </div>

          {error && <p className="error-text">{error}</p>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving || uploading}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" className="secondary" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {!loading && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FiTag /> Categorías
          </h2>
          <div className="category-manager">
            {categories.map((c) => (
              <span className="category-chip" key={c.id}>
                {c.name}
              </span>
            ))}
            {!addingCategory ? (
              <button type="button" className="secondary" onClick={() => setAddingCategory(true)}>
                <FiPlus /> Nueva categoría
              </button>
            ) : (
              <form
                onSubmit={createQuickCategory}
                style={{ display: 'flex', gap: 8, alignItems: 'center' }}
              >
                <input
                  value={quickCategoryName}
                  onChange={(e) => setQuickCategoryName(e.target.value)}
                  placeholder="Ej: Jardín"
                  autoFocus
                  style={{ width: 180 }}
                />
                <button type="submit">Crear</button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setAddingCategory(false);
                    setQuickCategoryName('');
                    setCategoryError('');
                  }}
                >
                  Cancelar
                </button>
              </form>
            )}
          </div>
          {categoryError && <p className="error-text">{categoryError}</p>}

          {categories.length > 0 && (
            <div className="field" style={{ maxWidth: 280, marginTop: 12 }}>
              <label>Filtrar por categoría</label>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="">Todas</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p className="page-subtitle">Cargando...</p>
      ) : products.length === 0 ? (
        <div className="card empty-state">
          <p>Todavía no cargaste ningún producto.</p>
          <button onClick={openNewForm}>
            <FiPlus /> Cargar el primero
          </button>
        </div>
      ) : (
        grouped.map(([categoryName, items]) => (
          <AccordionSection key={categoryName} title={categoryName} count={items.length}>
            <div className="grid grid-3">
              {items.map((p) => (
                <div className="card" key={p.id}>
                  {p.image_path ? (
                    <div style={{ position: 'relative', marginBottom: 10 }}>
                      <img
                        src={p.image_path}
                        alt={p.name}
                        style={{
                          width: '100%',
                          height: 120,
                          objectFit: 'cover',
                          borderRadius: 8,
                          display: 'block',
                        }}
                      />
                      {p.images.length > 1 && (
                        <span className="image-count-badge">+{p.images.length - 1}</span>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: 120,
                        borderRadius: 8,
                        marginBottom: 10,
                        background: 'var(--bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-muted)',
                        fontSize: '0.8rem',
                      }}
                    >
                      <FiImage size={28} />
                    </div>
                  )}
                  <p style={{ fontWeight: 600, margin: '0 0 4px' }}>{p.name}</p>
                  <p style={{ margin: '0 0 10px', color: 'var(--text-muted)' }}>{formatCOP(p.price)}</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      onClick={() => openEditForm(p)}
                    >
                      <FiEdit2 /> Editar
                    </button>
                    <button
                      className="danger"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      onClick={() => deleteProduct(p.id)}
                    >
                      <FiTrash2 /> Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </AccordionSection>
        ))
      )}
    </div>
  );
}
