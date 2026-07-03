'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CVUploadCard from '@/components/CVUploadCard';
import LoadingState from '@/components/LoadingState';
import type { CVAnalysisResult } from '@/types';
import { ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';

export default function UploadCVPage() {
  const router = useRouter();
  const [result, setResult] = useState<CVAnalysisResult | null>(null);
  const [hasEmail, setHasEmail] = useState<boolean | null>(null);

  useEffect(() => {
    const email = localStorage.getItem('autocandidatura_connected_email');
    if (!email) {
      router.replace('/connect-email');
    } else {
      setHasEmail(true);
    }
  }, [router]);

  useEffect(() => {
    const stored = localStorage.getItem('autocandidatura_cv_analysis');
    if (stored) {
      try {
        setResult(JSON.parse(stored));
      } catch {
        localStorage.removeItem('autocandidatura_cv_analysis');
      }
    }
  }, []);

  if (hasEmail === null) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <LoadingState message="Verificando sesión..." />
      </div>
    );
  }

  const handleComplete = (analysis: CVAnalysisResult) => {
    localStorage.setItem('autocandidatura_cv_analysis', JSON.stringify(analysis));
    setResult(analysis);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-b from-blue-50/50 to-white px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sube tu currículum</h1>
          <p className="text-gray-500 mt-2 text-lg">
            Analizaremos tu CV con IA para entender tu perfil
          </p>
        </div>

        {result ? (
          <div className="bg-white rounded-xl border border-green-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <h2 className="text-lg font-semibold text-green-800">CV analizado correctamente</h2>
            </div>
            <div className="space-y-3 text-sm mb-6">
              <div>
                <p className="text-gray-500 mb-1">Resumen</p>
                <p className="text-gray-800">{result.summary}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Habilidades detectadas</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.detected_skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <Link
              href="/agent"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg text-base font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
            >
              Siguiente: Configurar agente
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        ) : (
          <CVUploadCard onUploadComplete={handleComplete} />
        )}

        <p className="text-xs text-gray-400 text-center mt-6">
          Tu CV se analiza al instante. No almacenamos el archivo original después del análisis.
        </p>
      </div>
    </div>
  );
}
