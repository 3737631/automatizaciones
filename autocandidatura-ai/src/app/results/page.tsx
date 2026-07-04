'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ResultSummaryCards from '@/components/ResultSummaryCards';
import ApplicationResultCard from '@/components/ApplicationResultCard';
import JobOfferCard from '@/components/JobOfferCard';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import { createClient } from '@/lib/supabase/client';
import type { Application, JobOffer } from '@/types';
import { Bot, BarChart3, RefreshCw } from 'lucide-react';

type Tab = 'applications' | 'offers' | 'errors';

function ResultsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const runId = searchParams.get('runId');

  const [activeTab, setActiveTab] = useState<Tab>('applications');
  const [applications, setApplications] = useState<Application[]>([]);
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [errors, setErrors] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const stats = {
    offersFound: offers.length,
    offersDiscarded: offers.filter((o) => o.status === 'incompatible').length,
    applicationsPrepared: applications.filter((a) => a.status === 'prepared').length,
    applicationsSent: applications.filter((a) => a.status === 'sent').length,
    errors: errors.length,
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const token = localStorage.getItem('autocandidatura_session_token');
      const supabase = createClient(token || undefined);

      const [applicationsRes, offersRes] = await Promise.all([
        supabase.from('applications').select('*').order('created_at', { ascending: false }),
        supabase.from('job_offers').select('*').order('created_at', { ascending: false }),
      ]);

      if (applicationsRes.error) throw applicationsRes.error;
      if (offersRes.error) throw offersRes.error;

      const apps = applicationsRes.data as Application[] || [];
      const offs = offersRes.data as JobOffer[] || [];

      setApplications(apps.filter((a) => a.status !== 'failed'));
      setErrors(apps.filter((a) => a.status === 'failed'));
      setOffers(offs);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Error al cargar resultados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'applications', label: 'Candidaturas enviadas', count: applications.length },
    { key: 'offers', label: 'Ofertas encontradas', count: offers.length },
    { key: 'errors', label: 'Errores', count: errors.length },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-blue-50/50 to-white px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
              <BarChart3 className="w-4 h-4" />
              Resultados
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Resultados del agente</h1>
            <p className="text-gray-500 mt-1">Resumen de lo que ha hecho tu agente</p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {loading ? (
          <LoadingState message="Cargando resultados..." />
        ) : fetchError ? (
          <ErrorState message={fetchError} onRetry={fetchData} />
        ) : (
          <>
            <ResultSummaryCards stats={stats} />

            <div className="mt-8">
              <div className="flex border-b border-gray-200 mb-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.key
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          activeTab === tab.key
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {activeTab === 'applications' && (
                <>
                  {applications.length === 0 ? (
                    <EmptyState
                      title="Sin candidaturas enviadas"
                      description="El agente aún no ha enviado candidaturas. Vuelve más tarde."
                      action={{ label: 'Ir al agente', onClick: () => router.push('/agent') }}
                    />
                  ) : (
                    <div className="space-y-3">
                      {applications.map((app) => (
                        <ApplicationResultCard key={app.id} application={app} />
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'offers' && (
                <>
                  {offers.length === 0 ? (
                    <EmptyState
                      title="Sin ofertas encontradas"
                      description="El agente no ha encontrado ofertas aún."
                      action={{ label: 'Ir al agente', onClick: () => router.push('/agent') }}
                    />
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {offers.map((offer) => (
                        <JobOfferCard key={offer.id} offer={offer} />
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'errors' && (
                <>
                  {errors.length === 0 ? (
                    <EmptyState
                      title="Sin errores"
                      description="No se han registrado errores en esta ejecución."
                    />
                  ) : (
                    <div className="space-y-3">
                      {errors.map((app) => (
                        <ApplicationResultCard key={app.id} application={app} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mt-10 flex justify-center">
              <button
                onClick={() => router.push('/agent')}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg text-base font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
              >
                <Bot className="w-5 h-5" />
                Nuevo agente
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-4rem)] flex items-center justify-center"><LoadingState message="Cargando..." /></div>}>
      <ResultsInner />
    </Suspense>
  );
}
