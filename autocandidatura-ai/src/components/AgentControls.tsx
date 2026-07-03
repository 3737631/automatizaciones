'use client';

import { Pause, Play, Square, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentStatus } from '@/types';

interface AgentControlsProps {
  status: AgentStatus;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onChangeInstructions: () => void;
}

export default function AgentControls({
  status,
  onPause,
  onResume,
  onStop,
  onChangeInstructions,
}: AgentControlsProps) {
  if (status === 'idle') return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {status === 'running' && (
        <>
          <button
            onClick={onPause}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors"
          >
            <Pause className="w-4 h-4" />
            Pausar
          </button>
          <button
            onClick={onStop}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <Square className="w-4 h-4" />
            Detener
          </button>
        </>
      )}

      {status === 'paused' && (
        <>
          <button
            onClick={onResume}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <Play className="w-4 h-4" />
            Reanudar
          </button>
          <button
            onClick={onStop}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <Square className="w-4 h-4" />
            Detener
          </button>
        </>
      )}

      {(status === 'completed' || status === 'stopped' || status === 'error') && (
        <button
          onClick={onChangeInstructions}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Edit3 className="w-4 h-4" />
          Cambiar instrucciones
        </button>
      )}
    </div>
  );
}
