'use client';

import { useEffect, useRef } from 'react';
import { Circle, Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StepUpdate } from '@/types';

interface AgentStepTimelineProps {
  steps: StepUpdate[];
}

const stepIcon = (status: StepUpdate['status']) => {
  switch (status) {
    case 'pending':
      return <Circle className="w-4 h-4 text-gray-400" />;
    case 'processing':
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    case 'completed':
      return <Check className="w-4 h-4 text-green-500" />;
    case 'error':
      return <X className="w-4 h-4 text-red-500" />;
  }
};

const lineColors: Record<StepUpdate['status'], string> = {
  pending: 'bg-gray-200',
  processing: 'bg-blue-400',
  completed: 'bg-green-400',
  error: 'bg-red-400',
};

export default function AgentStepTimeline({ steps }: AgentStepTimelineProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

  if (steps.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        No hay pasos todavía. Inicia el agente para ver el progreso.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const isProcessing = step.status === 'processing';

        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center bg-white border-2 transition-all',
                isProcessing ? 'border-blue-400 shadow-md shadow-blue-200' : 'border-gray-200'
              )}>
                {stepIcon(step.status)}
              </div>
              {!isLast && (
                <div className={cn(
                  'w-0.5 h-full min-h-[24px]',
                  lineColors[step.status]
                )} />
              )}
            </div>
            <div className={cn('pb-6 flex-1', isLast && 'pb-0')}>
              <p className={cn(
                'text-sm font-medium',
                step.status === 'pending' && 'text-gray-400',
                step.status === 'processing' && 'text-blue-700',
                step.status === 'completed' && 'text-green-700',
                step.status === 'error' && 'text-red-700',
                isProcessing && 'animate-pulse'
              )}>
                {step.step_name}
              </p>
              {step.details && (
                <p className="text-xs text-gray-500 mt-0.5">{step.details}</p>
              )}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
