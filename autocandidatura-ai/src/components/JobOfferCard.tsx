'use client';

import { MapPin, Building2, Briefcase, ExternalLink, Mail, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JobOffer } from '@/types';

interface JobOfferCardProps {
  offer: JobOffer;
  onView?: () => void;
}

const workModeColors: Record<string, string> = {
  presencial: 'bg-orange-50 text-orange-700 border-orange-200',
  remoto: 'bg-purple-50 text-purple-700 border-purple-200',
  hibrido: 'bg-cyan-50 text-cyan-700 border-cyan-200',
};

const statusColors: Record<string, string> = {
  new: 'bg-gray-100 text-gray-600',
  compatible: 'bg-green-100 text-green-700',
  incompatible: 'bg-red-100 text-red-700',
  applied: 'bg-blue-100 text-blue-700',
  error: 'bg-red-100 text-red-700',
  duplicate: 'bg-yellow-100 text-yellow-700',
};

export default function JobOfferCard({ offer, onView }: JobOfferCardProps) {
  const hasEmail = !!offer.application_email;
  const hasUrl = !!offer.application_url;
  const score = offer.compatibility_score;

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all p-5 cursor-pointer"
      onClick={onView}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900 truncate">{offer.title}</h3>
          <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
            <Building2 className="w-3.5 h-3.5" />
            <span className="truncate">{offer.company}</span>
          </div>
        </div>

        {score !== null && score !== undefined && (
          <div className={cn(
            'shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2',
            score >= 70 ? 'bg-green-50 border-green-300 text-green-700' :
            score >= 40 ? 'bg-yellow-50 border-yellow-300 text-yellow-700' :
            'bg-red-50 border-red-300 text-red-700'
          )}>
            {score}%
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        {offer.city && (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="w-3 h-3" />
            {offer.city}{offer.province ? `, ${offer.province}` : ''}
          </span>
        )}
        {offer.work_mode && (
          <span className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
            workModeColors[offer.work_mode] || 'bg-gray-50 text-gray-600 border-gray-200'
          )}>
            <Briefcase className="w-3 h-3 mr-1" />
            {offer.work_mode}
          </span>
        )}
        {hasEmail && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Mail className="w-3 h-3 mr-1" />
            Email
          </span>
        )}
        {hasUrl && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <ExternalLink className="w-3 h-3 mr-1" />
            Link
          </span>
        )}
      </div>

      {offer.description && (
        <p className="text-sm text-gray-600 mt-3 line-clamp-2">
          {offer.description}
        </p>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <span className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
          statusColors[offer.status] || 'bg-gray-100 text-gray-600'
        )}>
          {offer.status === 'new' && 'Nueva'}
          {offer.status === 'compatible' && 'Compatible'}
          {offer.status === 'incompatible' && 'Incompatible'}
          {offer.status === 'applied' && 'Aplicada'}
          {offer.status === 'error' && 'Error'}
          {offer.status === 'duplicate' && 'Duplicada'}
        </span>
        {onView && (
          <button
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            <Eye className="w-3.5 h-3.5" />
            Ver oferta
          </button>
        )}
      </div>
    </div>
  );
}
