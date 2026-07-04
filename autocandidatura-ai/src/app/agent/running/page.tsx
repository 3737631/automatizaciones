'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AgentStatusBadge from '@/components/AgentStatusBadge';
import AgentStepTimeline from '@/components/AgentStepTimeline';
import AgentControls from '@/components/AgentControls';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import type { AgentStatus, StepUpdate } from '@/types';
import { Bot, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';

interface PollResponse {
  status: AgentStatus;
  steps: StepUpdate[];
  total_offers_found?: number;
  total_applications_sent?: number;
}

function AgentRunningInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const runId = searchParams.get('id');
  const mountedRef = useRef(true);

  const [status, setStatus] = useState<AgentStatus>('running');
  const [steps, setSteps] = useState<StepUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  const [stats, setStats] = useState({ offers: 0, applications: 0 });

  const pollStatus = useCallback(async () => {
    if (!runId) return;
    try {
      const res = await fetch(`/api/agent/status?runId=${runId}`);
      if (!res.ok) throw new Error('Error al obtener estado');
      const data: PollResponse = await res.json();
      if (!mountedRef.current) return;

      setStatus(data.status);
      setSteps(data.steps);
      if (data.total_offers_found !== undefined || data.total_applications_sent !== undefined) {
        setStats({
          offers: data.total_offers_found ?? 0,
          applications: data.total_applications_sent ?? 0,
        });
      }

      if (data.status === 'completed' || data.status === 'stopped' || data.status === 'error') {
        setCompleted(true);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Error de conexión');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    mountedRef.current = true;
    if (!runId) {
      setLoading(false);
      setError('No se encontró el ID de ejecución');
      return;
    }
    pollStatus();
    const interval = setInterval(pollStatus, 2000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [runId, pollStatus]);

  const handlePause = async () => {
    try {
      const res = await fetch('/api/agent/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId }),
      });
      if (!res.ok) throw new Error('Error al pausar');
      setStatus('paused');
    } catch {
      setError('No se pudo pausar el agente');
    }
  };

  const handleResume = async () => {
    try {
      const res = await fetch('/api/agent/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId }),
      });
      if (!res.ok) throw new Error('Error al reanudar');
      setStatus('running');
    } catch {
      setError('No se pudo reanudar el agente');
    }
  };

  const handleStop = async () => {
    try {
      const res = await fetch('/api/agent/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId }),
      });
      if (!res.ok) throw new Error('Error al detener');
      setStatus('stopped');
      setCompleted(true);
    } catch {
      setError('No se pudo detener el agente');
    }
  };

  const handleChangeInstructions = () => {
    router.push('/agent');
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <LoadingState message="Conectando con el agente..." />
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <ErrorState message={error} onRetry={pollStatus} />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-blue-50/50 to-white px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Bot className="w-7 h-7 text-blue-600" />
              Agente en ejecución
            </h1>
            <p className="text-gray-500 mt-1">
              {status === 'running' && 'Buscando ofertas y enviando candidaturas...'}
              {status === 'paused' && 'Agente en pausa'}
              {status === 'completed' && 'Proceso completado'}
              {status === 'stopped' && 'Proceso detenido'}
              {status === 'error' && 'Se ha producido un error'}
            </p>
          </div>
          <AgentStatusBadge status={status} />
        </div>

        {completed && status !== 'error' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-800 font-medium">
                {status === 'completed' ? 'Agente completado' : 'Agente detenido'}
              </span>
            </div>
            <button
              onClick={() => router.push(`/results?runId=${runId}`)}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Ver resultados
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="text-sm text-red-700">{error || 'Se produjo un error durante la ejecución'}</span>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Progreso</h2>
          <AgentStepTimeline steps={steps} />
        </div>

        {(stats.offers > 0 || stats.applications > 0) && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
            <div className="flex gap-6">
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.offers}</p>
                <p className="text-xs text-gray-500">Ofertas encontradas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.applications}</p>
                <p className="text-xs text-gray-500">Candidaturas enviadas</p>
              </div>
            </div>
          </div>
        )}

        <AgentControls
          status={status}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
          onChangeInstructions={handleChangeInstructions}
        />
      </div>
    </div>
  );
}

export default function AgentRunningPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-4rem)] flex items-center justify-center"><LoadingState message="Cargando..." /></div>}>
      <AgentRunningInner />
    </Suspense>
  );
}
