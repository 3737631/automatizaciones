'use client';

import { useState } from 'react';
import { Building2, Mail, Calendar, ExternalLink, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import type { Application } from '@/types';

interface ApplicationResultCardProps {
  application: Application;
}

const statusConfig: Record<string, { icon: typeof CheckCircle; className: string; label: string }> = {
  sent: { icon: CheckCircle, className: 'bg-green-100 text-green-700', label: 'Enviado' },
  failed: { icon: XCircle, className: 'bg-red-100 text-red-700', label: 'Error' },
  prepared: { icon: Clock, className: 'bg-yellow-100 text-yellow-700', label: 'Preparado' },
};

export default function ApplicationResultCard({ application }: ApplicationResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[application.status] || statusConfig.prepared;
  const StatusIcon = config.icon;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <h3 className="text-base font-semibold text-gray-900 truncate">{application.company}</h3>
          </div>
          <p className="text-sm text-gray-500 mt-0.5 ml-6">{application.subject}</p>
        </div>
        <span className={cn(
          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0',
          config.className
        )}>
          <StatusIcon className="w-3 h-3" />
          {config.label}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-3 ml-6 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Mail className="w-3 h-3" />
          {application.application_email}
        </span>
        {application.sent_at && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(application.sent_at)}
          </span>
        )}
      </div>

      <div className="mt-3 ml-6">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          {expanded ? (
            <>Ocultar mensaje <ChevronUp className="w-3 h-3" /></>
          ) : (
            <>Ver mensaje <ChevronDown className="w-3 h-3" /></>
          )}
        </button>
        {expanded && (
          <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
            {application.message}
          </div>
        )}
      </div>

      {application.error_message && application.status === 'failed' && (
        <div className="mt-3 flex items-start gap-1.5 text-sm text-red-500 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{application.error_message}</span>
        </div>
      )}
    </div>
  );
}
