'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import EmailConnectCard from '@/components/EmailConnectCard';
import { CheckCircle, ArrowRight } from 'lucide-react';

export default function ConnectEmailPage() {
  const router = useRouter();
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const email = localStorage.getItem('autocandidatura_connected_email');
    if (email) setConnectedEmail(email);
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-b from-blue-50/50 to-white px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Conecta tu correo</h1>
          <p className="text-gray-500 mt-2 text-lg">
            Necesitamos tu correo para enviar las candidaturas desde tu cuenta
          </p>
        </div>

        {connectedEmail ? (
          <div className="bg-white rounded-xl border border-green-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-green-800 mb-2">Correo conectado exitosamente</h2>
            <p className="text-green-600 mb-6 break-all">{connectedEmail}</p>
            <Link
              href="/upload-cv"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg text-base font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
            >
              Siguiente: Subir CV
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        ) : (
          <EmailConnectCard
            onConnected={(email) => {
              setConnectedEmail(email);
              localStorage.setItem('autocandidatura_connected_email', email);
            }}
          />
        )}

        <p className="text-xs text-gray-400 text-center mt-6">
          Solo usamos tu correo para enviar candidaturas a ofertas de empleo. No compartimos tus datos.
        </p>
      </div>
    </div>
  );
}
