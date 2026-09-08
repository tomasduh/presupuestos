import { useEffect, useState } from 'react';
import type { Budget } from '../lib/types';
import { formatCOP } from '../lib/format';
import { FiPlus, FiX, FiArrowRight, FiPackage } from 'react-icons/fi';

export default function BudgetsHome() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadBudgets() {
    setLoading(true);
    const res = await fetch('/api/budgets');
    setBudgets(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    loadBudgets();
  }, []);

  async function createBudget(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Ponele un nombre al presupuesto');
      return;
    }
    setSaving(true);
    setError('');
    const res = await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'No se pudo crear el presupuesto');
      return;
    }
    const budget = await res.json();
    setName('');
    setShowForm(false);
    window.location.href = `/presupuestos/${budget.id}`;
  }

  async function deleteBudget(id: string) {
    if (!confirm('¿Eliminar este presupuesto? Esta acción no se puede deshacer.')) return;
    await fetch(`/api/budgets/${id}`, { method: 'DELETE' });
    loadBudgets();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <h1>Presupuestos de mudanza</h1>
          <p className="page-subtitle">
            Armá distintos escenarios con los productos que necesitás y descubrí cuánto tenés que
            ahorrar.
          </p>
        </div>
        <button onClick={() => setShowForm((v) => !v)}>
          {showForm ? (
            'Cancelar'
          ) : (
            <>
              <FiPlus /> Nuevo presupuesto
            </>
          )}
        </button>
      </div>

      {showForm && (
        <form className="card" onSubmit={createBudget} style={{ marginBottom: 24 }}>
          <div className="field">
            <label>Nombre del presupuesto</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Depto básico"
              autoFocus
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" disabled={saving}>
            {saving ? 'Creando...' : 'Crear presupuesto'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="page-subtitle">Cargando...</p>
      ) : budgets.length === 0 ? (
        <div className="card empty-state">
          <p>Todavía no creaste ningún presupuesto.</p>
          <button onClick={() => setShowForm(true)}>
            <FiPlus /> Crear el primero
          </button>
        </div>
      ) : (
        <div className="grid grid-2">
          {budgets.map((b) => (
            <div className="card" key={b.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <a href={`/presupuestos/${b.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                  <h2 style={{ marginBottom: 4 }}>{b.name}</h2>
                </a>
                <button className="ghost" onClick={() => deleteBudget(b.id)} title="Eliminar">
                  <FiX />
                </button>
              </div>
              <p className="page-subtitle" style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiPackage /> {b.item_count} {b.item_count === 1 ? 'producto' : 'productos'}
              </p>
              <p style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px' }}>
                {formatCOP(b.total)}
              </p>
              <div style={{ marginTop: 14 }}>
                <a
                  className="btn"
                  href={`/presupuestos/${b.id}`}
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  Ver detalle <FiArrowRight />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
