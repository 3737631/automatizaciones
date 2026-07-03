'use client';

import { Search, XCircle, FileText, Send, AlertTriangle } from 'lucide-react';

interface ResultSummaryCardsProps {
  stats: {
    offersFound: number;
    offersDiscarded: number;
    applicationsPrepared: number;
    applicationsSent: number;
    errors: number;
  };
}

const cards = [
  { key: 'offersFound', label: 'Ofertas encontradas', icon: Search, value: 'offersFound', color: 'text-blue-600 bg-blue-50' },
  { key: 'offersDiscarded', label: 'Descartadas', icon: XCircle, value: 'offersDiscarded', color: 'text-gray-600 bg-gray-50' },
  { key: 'applicationsPrepared', label: 'Preparadas', icon: FileText, value: 'applicationsPrepared', color: 'text-yellow-600 bg-yellow-50' },
  { key: 'applicationsSent', label: 'Enviadas', icon: Send, value: 'applicationsSent', color: 'text-green-600 bg-green-50' },
  { key: 'errors', label: 'Errores', icon: AlertTriangle, value: 'errors', color: 'text-red-600 bg-red-50' },
] as const;

export default function ResultSummaryCards({ stats }: ResultSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const val = stats[card.value];

        return (
          <div key={card.key} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{val}</p>
                <p className="text-xs text-gray-500">{card.label}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
