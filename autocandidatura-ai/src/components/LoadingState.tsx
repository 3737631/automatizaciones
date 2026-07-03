'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export default function LoadingState({ message, size = 'md' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <Loader2 className={cn('animate-spin text-blue-600', sizeMap[size])} />
      {message && (
        <p className="text-sm text-gray-500 mt-3">{message}</p>
      )}
    </div>
  );
}
