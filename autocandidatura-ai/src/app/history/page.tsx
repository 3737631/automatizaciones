'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import type { AgentRun } from '@/types';
import { Clock, ChevronRight, Bot, Calendar, Search, Send, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

export default function HistoryPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const token = localStorage.getItem('autocandidatura_session_token');
      const supabase = createClient(token || undefined);

      const { data, error } = await supabase
        .from('agent_runs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRuns((data as AgentRun[]) || []);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Error al cargar historial');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const statusConfig: Record<string, { label: string; className: string }> = {
    completed: { label: 'Completado', className: 'bg-green-100 text-green-700' },
    running: { label: 'En ejecución', className: 'bg-blue-100 text-blue-700' },
    paused: { label: 'En pausa', className: 'bg-yellow-100 text-yellow-700' },
    stopped: { label: 'Detenido', className: 'bg-gray-100 text-gray-600' },
    error: { label: 'Error', className: 'bg-red-100 text-red-700' },
    idle: { label: 'Inactivo', className: 'bg-gray-100 text-gray-400' },
  };

  const handleViewResults = (runId: string) => {
    router.push(`/results?runId=${runId}`);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-blue-50/50 to-white px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Historial</h1>
            <p className="text-gray-500 mt-1">Todas las ejecuciones de tu agente</p>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Cargando historial..." />
        ) : fetchError ? (
          <ErrorState message={fetchError} onRetry={fetchHistory} />
        ) : runs.length === 0 ? (
          <EmptyState
            title="Sin ejecuciones"
            description="Aún no has activado ningún agente. Configura uno para empezar."
            icon={<Bot className="w-8 h-8" />}
            action={{ label: 'Configurar agente', onClick: () => router.push('/agent') }}
          />
        ) : (
          <div className="space-y-3">
            {runs.map((run) => {
              const config = statusConfig[run.status] || statusConfig.idle;
              const isExpanded = expandedId === run.id;

              return (
                <div
                  key={run.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : run.id)}
                    className="w-full p-5 flex items-center justify-between text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
                          {config.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {formatDate(run.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Search className="w-3.5 h-3.5 text-gray-400" />
                          {run.total_offers_found} ofertas
                        </span>
                        <span className="flex items-center gap-1">
                          <Send className="w-3.5 h-3.5 text-gray-400" />
                          {run.total_applications_sent} candidaturas
                        </span>
                        {run.total_errors > 0 && (
                          <span className="flex items-center gap-1 text-red-500">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {run.total_errors} errores
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 ml-4 text-gray-400">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-gray-500">Inicio</p>
                          <p className="text-gray-800 font-medium">{formatDate(run.started_at)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Fin</p>
                          <p className="text-gray-800 font-medium">
                            {run.finished_at ? formatDate(run.finished_at) : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Ofertas encontradas</p>
                          <p className="text-gray-800 font-medium">{run.total_offers_found}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Candidaturas enviadas</p>
                          <p className="text-gray-800 font-medium">{run.total_applications_sent}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleViewResults(run.id)}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Ver resultados
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
