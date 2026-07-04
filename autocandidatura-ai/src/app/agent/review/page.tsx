'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { sendSelectedOffers } from '@/lib/agent/client-engine';
import { Send, CheckCircle, AlertCircle, Edit3, Building, Mail, Target } from 'lucide-react';

interface ReviewOffer {
  offer: {
    title?: string;
    company?: string;
    description?: string | null;
    application_email?: string | null;
    city?: string | null;
    work_mode?: string | null;
  };
  score: number;
  reason: string;
  subject: string;
  message: string;
}

export default function ReviewPage() {
  const router = useRouter();
  const [offers, setOffers] = useState<ReviewOffer[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<number | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ sent: number; errors: number } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem('autocandidatura_review_offers') : null;
      if (!raw) {
        router.replace('/agent');
        return;
      }
      const parsed = JSON.parse(raw) as ReviewOffer[];
      setOffers(parsed);
      setSelected(new Set(parsed.map((_, i) => i)));
    } catch {
      router.replace('/agent');
    }
  }, [router]);

  const toggleOffer = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const startEdit = (idx: number) => {
    setEditing(idx);
    setEditSubject(offers[idx].subject);
    setEditMessage(offers[idx].message);
  };

  const saveEdit = (idx: number) => {
    setOffers((prev) => prev.map((o, i) => i === idx ? { ...o, subject: editSubject, message: editMessage } : o));
    setEditing(null);
  };

  const handleSend = async () => {
    const selectedOffers = offers.filter((_, i) => selected.has(i));
    if (selectedOffers.length === 0) return;

    setSending(true);
    setError('');

    try {
      const sessionId = typeof window !== 'undefined' ? window.localStorage.getItem('autocandidatura_review_session_id') || '' : '';
      const runId = typeof window !== 'undefined' ? window.localStorage.getItem('autocandidatura_review_run_id') || '' : '';
      const result = await sendSelectedOffers(
        selectedOffers.map((o) => ({ ...o, message: o.message })),
        sessionId,
        runId,
      );
      setSent(result);
      localStorage.removeItem('autocandidatura_review_offers');
    } catch {
      setError('Error al enviar las candidaturas');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-b from-blue-50/50 to-white px-4">
        <div className="max-w-md w-full text-center bg-white rounded-xl border border-green-200 shadow-sm p-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Candidaturas enviadas</h2>
          <p className="text-gray-600 mb-6">
            {sent.sent} candidaturas enviadas{ sent.errors > 0 ? `, ${sent.errors} errores` : '' }
          </p>
          <button
            onClick={() => router.push('/results')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            Ver resultados
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-blue-50/50 to-white px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Revisa tus candidaturas</h1>
          <p className="text-gray-500 mt-2">Personaliza el mensaje de cada oferta antes de enviar</p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-4 mb-6">
          {offers.map((item, idx) => {
            const isSelected = selected.has(idx);
            const isEditing = editing === idx;

            return (
              <div key={idx} className={`bg-white rounded-xl border shadow-sm p-5 transition-colors ${isSelected ? 'border-blue-300' : 'border-gray-200'}`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleOffer(idx)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{item.offer.title}</h3>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{item.score}%</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1"><Building className="w-3 h-3" />{item.offer.company}</span>
                      {item.offer.city && <span>{item.offer.city}</span>}
                      {item.offer.work_mode && <span>{item.offer.work_mode}</span>}
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{item.offer.application_email}</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{item.reason}</p>

                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editSubject}
                          onChange={(e) => setEditSubject(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                        />
                        <textarea
                          value={editMessage}
                          onChange={(e) => setEditMessage(e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(idx)} className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">Guardar</button>
                          <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 font-medium">{item.subject}</p>
                        <p className="text-xs text-gray-600 whitespace-pre-line line-clamp-2">{item.message}</p>
                        <button onClick={() => startEdit(idx)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1">
                          <Edit3 className="w-3 h-3" />Editar mensaje
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-4 bg-white border border-gray-200 rounded-xl shadow-lg p-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">{selected.size}</span> de {offers.length} seleccionadas
          </p>
          <button
            onClick={handleSend}
            disabled={selected.size === 0 || sending}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? (
              <>Enviando...</>
            ) : (
              <><Send className="w-4 h-4" />Enviar {selected.size} candidaturas</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
