'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Mail, FileText, Trash2, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  danger,
  loading,
}: {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${danger ? 'bg-red-50' : 'bg-yellow-50'}`}>
              {danger ? (
                <Trash2 className={`w-4 h-4 ${danger ? 'text-red-600' : 'text-yellow-600'}`} />
              ) : (
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
              )}
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
              danger
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? 'Eliminando...' : 'Confirmar'}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PrivacyPage() {
  const router = useRouter();
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [hasCV, setHasCV] = useState(false);

  // Dialogs
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [showDeleteCV, setShowDeleteCV] = useState(false);
  const [showDeleteHistory, setShowDeleteHistory] = useState(false);
  const [showDeleteAll, setShowDeleteAll] = useState(false);

  const [disconnecting, setDisconnecting] = useState(false);
  const [deletingCV, setDeletingCV] = useState(false);
  const [deletingHistory, setDeletingHistory] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const email = localStorage.getItem('autocandidatura_connected_email');
    if (email) setConnectedEmail(email);
    const cv = localStorage.getItem('autocandidatura_cv_analysis');
    if (cv) setHasCV(true);
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const token = localStorage.getItem('autocandidatura_session_token');
      if (token) {
        const supabase = createClient(token);
        await supabase.from('sessions').update({ connected_email: null }).eq('session_token', token);
      }
      localStorage.removeItem('autocandidatura_connected_email');
      setConnectedEmail(null);
      showSuccess('Correo desconectado correctamente');
    } catch {
      showSuccess('Error al desconectar correo');
    } finally {
      setDisconnecting(false);
      setShowDisconnect(false);
    }
  };

  const handleDeleteCV = async () => {
    setDeletingCV(true);
    try {
      localStorage.removeItem('autocandidatura_cv_analysis');
      setHasCV(false);
      showSuccess('CV eliminado correctamente');
    } finally {
      setDeletingCV(false);
      setShowDeleteCV(false);
    }
  };

  const handleDeleteHistory = async () => {
    setDeletingHistory(true);
    try {
      const token = localStorage.getItem('autocandidatura_session_token');
      if (token) {
        const supabase = createClient(token);
        const { data: session } = await supabase
          .from('sessions')
          .select('id')
          .eq('session_token', token)
          .single();
        if (session) {
          await supabase.from('agent_runs').delete().eq('session_id', session.id);
        }
      }
      showSuccess('Historial eliminado correctamente');
    } catch {
      showSuccess('Error al eliminar historial');
    } finally {
      setDeletingHistory(false);
      setShowDeleteHistory(false);
    }
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const token = localStorage.getItem('autocandidatura_session_token');
      if (token) {
        const supabase = createClient(token);
        const { data: session } = await supabase
          .from('sessions')
          .select('id')
          .eq('session_token', token)
          .single();
        if (session) {
          await Promise.all([
            supabase.from('agent_runs').delete().eq('session_id', session.id),
            supabase.from('applications').delete().eq('session_id', session.id),
            supabase.from('job_offers').delete().eq('session_id', session.id),
            supabase.from('agent_instructions').delete().eq('session_id', session.id),
            supabase.from('cvs').delete().eq('session_id', session.id),
            supabase.from('sessions').delete().eq('id', session.id),
          ]);
        }
      }
      localStorage.removeItem('autocandidatura_connected_email');
      localStorage.removeItem('autocandidatura_cv_analysis');
      localStorage.removeItem('autocandidatura_session_token');
      setConnectedEmail(null);
      setHasCV(false);
      showSuccess('Todos los datos han sido eliminados');
    } catch {
      showSuccess('Error al eliminar datos');
    } finally {
      setDeletingAll(false);
      setShowDeleteAll(false);
    }
  };

  const sections = [
    {
      title: 'Tu privacidad',
      icon: Shield,
      content: (
        <div className="text-sm text-gray-600 space-y-3 leading-relaxed">
          <p>
            AutoCandidatura AI trata tus datos con la máxima confidencialidad. Tu correo electrónico se usa
            exclusivamente para enviar candidaturas a ofertas de empleo que tú hayas autorizado.
          </p>
          <p>
            Tu currículum se analiza mediante IA para extraer tu perfil profesional. El archivo original no se
            almacena después del análisis.
          </p>
          <p>
            No compartimos tus datos con terceros. No vendemos información. No enviamos spam. Solo candidaturas
            a ofertas reales con canal de candidatura verificado.
          </p>
          <p>
            Puedes desconectar tu correo, borrar tu CV, eliminar el historial o borrar todos tus datos en
            cualquier momento usando las opciones de esta página.
          </p>
        </div>
      ),
    },
    {
      title: 'Desconectar correo',
      icon: Mail,
      action: {
        label: 'Desconectar correo',
        onClick: () => setShowDisconnect(true),
        disabled: !connectedEmail,
      },
      status: connectedEmail || 'No hay correo conectado',
    },
    {
      title: 'Borrar CV',
      icon: FileText,
      action: {
        label: 'Borrar CV analizado',
        onClick: () => setShowDeleteCV(true),
        disabled: !hasCV,
      },
      status: hasCV ? 'CV almacenado' : 'No hay CV guardado',
    },
    {
      title: 'Borrar historial',
      icon: Trash2,
      action: {
        label: 'Borrar historial de ejecuciones',
        onClick: () => setShowDeleteHistory(true),
      },
      status: 'Elimina todas las ejecuciones del agente',
    },
    {
      title: 'Borrar todos los datos',
      icon: AlertTriangle,
      danger: true,
      action: {
        label: 'Borrar todos mis datos',
        onClick: () => setShowDeleteAll(true),
      },
      status: 'Elimina correo, CV, historial y sesión. Esta acción no se puede deshacer.',
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-blue-50/50 to-white px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
            <Shield className="w-4 h-4" />
            Privacidad
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Privacidad y datos</h1>
          <p className="text-gray-500 mt-2 text-lg">Controla tus datos y privacidad</p>
        </div>

        {successMsg && (
          <div className="mb-6 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {successMsg}
          </div>
        )}

        <div className="space-y-4">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.title}
                className={`bg-white rounded-xl border shadow-sm p-6 ${
                  section.danger ? 'border-red-200' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      section.danger ? 'bg-red-50' : 'bg-blue-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${section.danger ? 'text-red-500' : 'text-blue-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900">{section.title}</h3>
                    {typeof section.content === 'string' ? (
                      <p className="text-sm text-gray-500 mt-1">{section.content}</p>
                    ) : (
                      <div className="mt-2">{section.content}</div>
                    )}
                    {section.status && !section.content && (
                      <p className="text-sm text-gray-500 mt-1">{section.status}</p>
                    )}
                    {section.action && (
                      <button
                        onClick={section.action.onClick}
                        disabled={section.action.disabled}
                        className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          section.danger
                            ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-100 disabled:text-gray-400'
                            : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400'
                        }`}
                      >
                        {section.action.label}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p className="text-sm text-yellow-800 font-medium">
            No enviamos spam. Solo candidaturas a ofertas reales.
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            Siempre puedes pausar o detener el agente desde el panel de ejecución.
          </p>
        </div>

        <p className="text-xs text-gray-400 text-center mt-8">
          Al usar AutoCandidatura AI aceptas que tus datos se procesen según lo descrito. Puedes solicitar la
          eliminación completa de tus datos en cualquier momento.
        </p>
      </div>

      <ConfirmDialog
        open={showDisconnect}
        title="Desconectar correo"
        description="Se eliminará la conexión con tu correo electrónico. El agente dejará de funcionar hasta que conectes uno nuevo."
        onConfirm={handleDisconnect}
        onCancel={() => setShowDisconnect(false)}
        loading={disconnecting}
      />
      <ConfirmDialog
        open={showDeleteCV}
        title="Borrar CV"
        description="Se eliminará el análisis de tu currículum. Deberás subirlo de nuevo para usarlo con el agente."
        onConfirm={handleDeleteCV}
        onCancel={() => setShowDeleteCV(false)}
        loading={deletingCV}
      />
      <ConfirmDialog
        open={showDeleteHistory}
        title="Borrar historial"
        description="Se eliminarán todas las ejecuciones del agente y sus resultados. Esta acción no se puede deshacer."
        onConfirm={handleDeleteHistory}
        onCancel={() => setShowDeleteHistory(false)}
        loading={deletingHistory}
      />
      <ConfirmDialog
        open={showDeleteAll}
        title="Borrar todos los datos"
        description="Se eliminará tu correo, CV, historial de ejecuciones, ofertas, candidaturas y sesión. Esta acción no se puede deshacer."
        onConfirm={handleDeleteAll}
        onCancel={() => setShowDeleteAll(false)}
        danger
        loading={deletingAll}
      />
    </div>
  );
}
