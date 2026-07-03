'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, FileText, MessageSquare, Bot, Search, Send, Shield, ArrowRight } from 'lucide-react';

const steps = [
  { icon: Mail, title: 'Conecta tu correo', desc: 'Usamos tu Gmail para enviar candidaturas desde tu cuenta real.' },
  { icon: FileText, title: 'Sube tu CV', desc: 'Analizamos tu currículum con IA para entender tu perfil y experiencia.' },
  { icon: MessageSquare, title: 'Escribe tu objetivo', desc: 'Dinos qué trabajo buscas con lenguaje natural.' },
  { icon: Bot, title: 'Activa el agente', desc: 'La IA busca ofertas, las analiza y envía candidaturas por ti.' },
];

const features = [
  {
    icon: Search,
    title: 'Búsqueda inteligente',
    desc: 'La IA encuentra ofertas que encajan contigo analizando miles de anuncios.',
  },
  {
    icon: Send,
    title: 'Candidaturas personalizadas',
    desc: 'Cada mensaje se adapta a la oferta y a tu perfil para maximizar tu éxito.',
  },
  {
    icon: Shield,
    title: 'Envío responsable',
    desc: 'Solo a ofertas reales con canal de candidatura. Sin spam ni envíos masivos.',
  },
];

const stats = [
  { value: '+5,000', label: 'Ofertas analizadas' },
  { value: '92%', label: 'Compatibilidad media' },
  { value: 'Modo ético', label: 'Sin spam garantizado' },
];

export default function LandingPage() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const email = localStorage.getItem('autocandidatura_connected_email');
    setConnected(!!email);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 via-white to-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-28 sm:pb-32 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
            <Bot className="w-4 h-4" />
            Agente de IA para tu búsqueda de empleo
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight max-w-4xl mx-auto">
            Tu agente de{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">IA</span>{' '}
            para encontrar trabajo
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Conecta tu correo, sube tu CV y deja que la IA encuentre ofertas compatibles y envíe candidaturas
            personalizadas por ti.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/connect-email"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-600 text-white rounded-xl text-base font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all hover:shadow-xl hover:shadow-blue-300"
            >
              {connected ? 'Continuar con mi correo' : 'Conectar correo y empezar'}
              <ArrowRight className="w-5 h-5" />
            </Link>
            {connected && (
              <Link
                href="/agent"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-blue-700 rounded-xl text-base font-semibold border-2 border-blue-200 hover:border-blue-400 shadow-sm transition-all"
              >
                <Bot className="w-5 h-5" />
                Ir al agente
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-4">Cómo funciona</h2>
          <p className="text-center text-gray-500 text-lg mb-16 max-w-xl mx-auto">
            Cuatro pasos simples para poner tu búsqueda de empleo en automático
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="text-center group">
                  <div className="relative inline-flex items-center justify-center mb-5">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                      <Icon className="w-7 h-7 text-blue-600" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-md">
                      {i + 1}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 sm:py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-4">
            Todo lo que necesitas en un solo lugar
          </h2>
          <p className="text-center text-gray-500 text-lg mb-16 max-w-xl mx-auto">
            Diseñado para que encuentres trabajo sin pasar horas enviando CVs uno por uno
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all p-8"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-3 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
                  {s.value}
                </p>
                <p className="text-sm text-gray-500 mt-2">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-b from-white to-blue-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            ¿Preparado para dejar de enviar CVs manualmente?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Configura tu agente en menos de 5 minutos y empieza a recibir resultados.
          </p>
          <Link
            href="/connect-email"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-600 text-white rounded-xl text-base font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
          >
            {connected ? 'Continuar' : 'Empezar ahora'}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} AutoCandidatura AI. Todos los derechos reservados.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                Privacidad
              </Link>
              <Link href="/history" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                Historial
              </Link>
              <a
                href="mailto:hola@autocandidatura.ai"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Contacto
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
