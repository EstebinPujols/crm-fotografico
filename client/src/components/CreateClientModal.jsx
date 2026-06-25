import { useState } from 'react';
import Button from './Button';
import clientService from '../services/clientService';
import messageService from '../services/messageService';

export default function CreateClientModal({ open, phone, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.target);
    const payload = {
      first_name: fd.get('first_name')?.trim(),
      last_name: fd.get('last_name')?.trim(),
      phone: fd.get('phone')?.trim() || null,
      email: fd.get('email')?.trim() || null,
      address: fd.get('address')?.trim() || null,
      notes: fd.get('notes')?.trim() || null,
    };
    try {
      const res = await clientService.create(payload);
      const newClient = res?.data || res?.client || res;
      if (newClient?.id && phone) {
        await messageService.linkClient(phone, newClient.id);
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar el cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 max-w-lg w-full shadow-lg animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h4 className="text-headline-md font-semibold text-primary">Nuevo Cliente</h4>
          <button
            type="button"
            onClick={onClose}
            className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer"
          >
            close
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
            <span className="material-symbols-outlined text-sm">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">
                Nombre <span className="text-red-400">*</span>
              </label>
              <input
                name="first_name"
                required
                placeholder="María"
                className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">
                Apellido <span className="text-red-400">*</span>
              </label>
              <input
                name="last_name"
                required
                placeholder="Gómez"
                className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">Teléfono</label>
              <input
                name="phone"
                defaultValue={phone || ''}
                readOnly={!!phone}
                className={`w-full h-10 px-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b] ${phone ? 'bg-gray-50 text-on-surface-variant' : ''}`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">Email</label>
              <input
                name="email"
                type="email"
                placeholder="cliente@email.com"
                className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">Dirección</label>
            <input
              name="address"
              placeholder="Av. 27 de Febrero #123, Santo Domingo"
              className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">Notas</label>
            <textarea
              name="notes"
              placeholder="Notas internas sobre el cliente…"
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b] resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                  Guardando…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Crear Cliente
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
