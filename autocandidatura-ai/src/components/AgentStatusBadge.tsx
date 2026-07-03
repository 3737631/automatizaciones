import { cn } from '@/lib/utils';
import type { AgentStatus } from '@/types';

interface AgentStatusBadgeProps {
  status: AgentStatus;
}

const statusConfig: Record<AgentStatus, { label: string; className: string }> = {
  idle: { label: 'Inactivo', className: 'bg-gray-100 text-gray-600' },
  running: { label: 'En ejecución', className: 'bg-green-100 text-green-700 animate-pulse' },
  paused: { label: 'En pausa', className: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Completado', className: 'bg-blue-100 text-blue-700' },
  error: { label: 'Error', className: 'bg-red-100 text-red-700' },
  stopped: { label: 'Detenido', className: 'bg-gray-100 text-gray-600' },
};

export default function AgentStatusBadge({ status }: AgentStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className
      )}
    >
      <span className={cn(
        'w-1.5 h-1.5 rounded-full mr-1.5',
        status === 'running' ? 'bg-green-500' :
        status === 'paused' ? 'bg-yellow-500' :
        status === 'completed' ? 'bg-blue-500' :
        status === 'error' ? 'bg-red-500' : 'bg-gray-400'
      )} />
      {config.label}
    </span>
  );
}
