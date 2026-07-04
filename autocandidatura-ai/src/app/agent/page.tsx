'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AgentPromptBox from '@/components/AgentPromptBox';
import ConsentModal from '@/components/ConsentModal';
import LoadingState from '@/components/LoadingState';
import { createClient } from '@/lib/supabase/client';
import type { CVAnalysisResult } from '@/types';
import { Mail, FileText, Bot, ArrowRight, AlertCircle } from 'lucide-react';

export default function AgentPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [cvAnalysis, setCvAnalysis] = useState<CVAnalysisResult | null>(null);
  const [prompt, setPrompt] = useState('');
  const [consentOpen, setConsentOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedEmail = localStorage.getItem('autocandidatura_connected_email');
    if (!storedEmail) {
      router.replace('/connect-email');
      return;
    }
    setEmail(storedEmail);

    const stored = localStorage.getItem('autocandidatura_cv_analysis');
    if (!stored) {
      router.replace('/upload-cv');
      return;
    }
    try {
      setCvAnalysis(JSON.parse(stored));
    } catch {
      router.replace('/upload-cv');
      return;
    }

    setLoading(false);
  }, [router]);

  const handleActivate = async (instruction: string) => {
    setPrompt(instruction);
    setConsentOpen(true);
  };

  const handleConsentAccept = async () => {
    setConsentOpen(false);
    setActivating(true);
    setError('');

    try {
      const token = localStorage.getItem('autocandidatura_session_token');
      const supabase = createClient();

      const { data: sessionData } = await supabase
        .from('sessions')
        .select('id')
        .eq('session_token', token)
        .single();

      let sessionId: string | null = null;

      if (sessionData) {
        sessionId = sessionData.id;
        await supabase.from('sessions').update({ consent_accepted: true }).eq('id', sessionId);
      }

      const { data: instructionData, error: instructionError } = await supabase
        .from('agent_instructions')
        .insert({
          session_id: sessionId,
          raw_instruction: prompt,
        })
        .select('id')
        .single();

      if (instructionError) throw instructionError;

      const { data: runData, error: runError } = await supabase
        .from('agent_runs')
        .insert({
          session_id: sessionId,
          instruction_id: instructionData.id,
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (runError) throw runError;

      localStorage.removeItem('autocandidatura_cv_analysis');
      router.push(`/agent/running?id=${runData.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al activar el agente');
    } finally {
      setActivating(false);
    }
  };

  const handleConsentDecline = () => {
    setConsentOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <LoadingState message="Cargando..." />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-blue-50/50 to-white px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
            <Bot className="w-4 h-4" />
            Configura tu agente
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Configura tu agente</h1>
          <p className="text-gray-500 mt-2 text-lg">
            Escribe qué trabajo buscas y activa el agente
          </p>
        </div>

        {/* Connected info */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Correo:</span>
              <span className="text-gray-800 font-medium">{email}</span>
            </div>
            {cvAnalysis && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">CV:</span>
                <span className="text-gray-800 font-medium">
                  {cvAnalysis.detected_skills.length} habilidades detectadas
                </span>
              </div>
            )}
          </div>
        </div>

        <AgentPromptBox onSubmit={handleActivate} disabled={activating} />

        {error && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <ConsentModal open={consentOpen} onAccept={handleConsentAccept} onDecline={handleConsentDecline} />

        {activating && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Activando agente...</p>
          </div>
        )}
      </div>
    </div>
  );
}
