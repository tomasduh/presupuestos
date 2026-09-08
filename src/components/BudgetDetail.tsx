import { useEffect, useMemo, useState } from 'react';
import type { BudgetDetail as BudgetDetailType, Product, Category } from '../lib/types';
import { formatCOP } from '../lib/format';
import { FiArrowLeft, FiEdit2, FiMinus, FiPlus, FiSearch, FiTrash2, FiImage } from 'react-icons/fi';
import AccordionSection from './AccordionSection';

interface Props {
  budgetId: string;
}

export default function BudgetDetail({ budgetId }: Props) {
  const [budget, setBudget] = useState<BudgetDetailType | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [editingSettings, setEditingSettings] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  async function loadAll() {
    setLoading(true);
    const [budgetRes, productsRes, categoriesRes] = await Promise.all([
      fetch(`/api/budgets/${budgetId}`),
      fetch('/api/products'),
      fetch('/api/categories'),
    ]);
    if (!budgetRes.ok) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const budgetData = await budgetRes.json();
    setBudget(budgetData);
    setNameDraft(budgetData.name);
    setProducts(await productsRes.json());
    setCategories(await categoriesRes.json());
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, [budgetId]);

  const addedProductIds = useMemo(
    () => new Set(budget?.items.map((i) => i.product_id) ?? []),
    [budget]
  );

  const total = useMemo(
    () => budget?.items.reduce((sum, i) => sum + i.price * i.quantity, 0) ?? 0,
    [budget]
  );

  const catalogGrouped = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = products.filter((p) => {
      const matchesSearch = !term || p.name.toLowerCase().includes(term);
      const matchesCategory = !filterCategory || p.category_id === filterCategory;
      return matchesSearch && matchesCategory;
    });
    const map = new Map<string, Product[]>();
    for (const p of filtered) {
      const key = p.category_name ?? 'Sin categoría';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return Array.from(map.entries());
  }, [products, search, filterCategory]);

  async function addProduct(productId: string) {
    await fetch(`/api/budgets/${budgetId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, quantity: 1 }),
    });
    loadAll();
  }

  async function removeItem(itemId: string) {
    await fetch(`/api/budgets/${budgetId}/items/${itemId}`, { method: 'DELETE' });
    loadAll();
  }

  async function changeQuantity(itemId: string, quantity: number) {
    if (quantity < 1) return;
    await fetch(`/api/budgets/${budgetId}/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    });
    loadAll();
  }

  async function saveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!nameDraft.trim()) return;
    await fetch(`/api/budgets/${budgetId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameDraft.trim() }),
    });
    setEditingSettings(false);
    loadAll();
  }

  if (loading) return <p className="page-subtitle">Cargando...</p>;
  if (notFound || !budget)
    return (
      <div className="card empty-state">
        <p>No se encontró este presupuesto.</p>
        <a className="btn" href="/" style={{ textDecoration: 'none' }}>
          Volver a presupuestos
        </a>
      </div>
    );

  return (
    <div>
      <a
        href="/"
        style={{
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <FiArrowLeft /> Volver a presupuestos
      </a>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 8 }}>
        <div>
          <h1>{budget.name}</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            {budget.items.length} {budget.items.length === 1 ? 'producto' : 'productos'}
          </p>
        </div>
        <button className="secondary" onClick={() => setEditingSettings((v) => !v)}>
          {editingSettings ? (
            'Cancelar'
          ) : (
            <>
              <FiEdit2 /> Editar
            </>
          )}
        </button>
      </div>

      {editingSettings && (
        <form className="card" onSubmit={saveSettings} style={{ margin: '16px 0' }}>
          <div className="field">
            <label>Nombre</label>
            <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
          </div>
          <button type="submit">Guardar cambios</button>
        </form>
      )}

      <div className="card" style={{ margin: '20px 0' }}>
        <p className="page-subtitle" style={{ margin: '0 0 4px' }}>
          Total a ahorrar
        </p>
        <p style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>{formatCOP(total)}</p>
      </div>

      <h2>Productos en este presupuesto</h2>
      {budget.items.length === 0 ? (
        <div className="card empty-state" style={{ marginBottom: 28 }}>
          <p>Todavía no agregaste productos. Elegilos de la lista de abajo.</p>
        </div>
      ) : (
        <div className="grid grid-3" style={{ marginBottom: 28 }}>
          {budget.items.map((item) => (
            <div className="card" key={item.id}>
              {item.image_path ? (
                <img
                  src={item.image_path}
                  alt={item.name}
                  style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: 110,
                    borderRadius: 8,
                    marginBottom: 10,
                    background: 'var(--bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                  }}
                >
                  <FiImage size={28} />
                </div>
              )}
              <p style={{ fontWeight: 600, margin: '0 0 4px' }}>{item.name}</p>
              <p style={{ margin: '0 0 10px', color: 'var(--text-muted)' }}>
                {formatCOP(item.price)} c/u · {formatCOP(item.price * item.quantity)}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="secondary" onClick={() => changeQuantity(item.id, item.quantity - 1)}>
                  <FiMinus />
                </button>
                <span style={{ minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                <button className="secondary" onClick={() => changeQuantity(item.id, item.quantity + 1)}>
                  <FiPlus />
                </button>
                <button
                  className="danger"
                  style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={() => removeItem(item.id)}
                >
                  <FiTrash2 /> Quitar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2>Agregar productos</h2>
      <div className="grid grid-2" style={{ marginBottom: 16, maxWidth: 640 }}>
        <div className="field">
          <label>
            <FiSearch style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Buscar
          </label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto..."
          />
        </div>
        <div className="field">
          <label>Categoría</label>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="card empty-state">
          <p>No hay productos cargados todavía.</p>
          <a className="btn" href="/productos" style={{ textDecoration: 'none' }}>
            Cargar productos
          </a>
        </div>
      ) : (
        catalogGrouped.map(([categoryName, items]) => (
          <AccordionSection
            key={categoryName}
            title={categoryName}
            count={items.length}
            open={Boolean(search.trim() || filterCategory)}
          >
            <div className="grid grid-3">
              {items.map((p) => {
                const added = addedProductIds.has(p.id);
                return (
                  <div className="card" key={p.id}>
                    {p.image_path ? (
                      <img
                        src={p.image_path}
                        alt={p.name}
                        style={{
                          width: '100%',
                          height: 100,
                          objectFit: 'cover',
                          borderRadius: 8,
                          marginBottom: 10,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: 100,
                          borderRadius: 8,
                          marginBottom: 10,
                          background: 'var(--bg)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <FiImage size={24} />
                      </div>
                    )}
                    <p style={{ fontWeight: 600, margin: '0 0 4px', fontSize: '0.9rem' }}>{p.name}</p>
                    <p style={{ margin: '0 0 10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {formatCOP(p.price)}
                    </p>
                    <button
                      className={added ? 'secondary' : ''}
                      style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      onClick={() => addProduct(p.id)}
                    >
                      <FiPlus /> {added ? 'Agregar otro' : 'Agregar'}
                    </button>
                  </div>
                );
              })}
            </div>
          </AccordionSection>
        ))
      )}
    </div>
  );
}
