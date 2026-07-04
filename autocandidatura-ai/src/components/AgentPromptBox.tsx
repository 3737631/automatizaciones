'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentPromptBoxProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

const examples = [
  'Busca trabajo de programador junior en Sevilla',
  'Busca ofertas remotas de frontend con React',
  'Encuentra empresas que busquen desarrollador web y envía mi CV',
  'Busca ofertas de camarero en Málaga y aplica solo a las que tengan email',
];

export default function AgentPromptBox({ onSubmit, disabled }: AgentPromptBoxProps) {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe qué trabajo buscas... Ej: Busca trabajo de programador junior en Sevilla o remoto"
          className={cn(
            'w-full min-h-[100px] resize-none rounded-lg border border-gray-300 p-4 pr-12 text-sm outline-none transition-colors',
            'focus:border-blue-400 focus:ring-2 focus:ring-blue-100',
            disabled && 'bg-gray-50 cursor-not-allowed'
          )}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !text.trim()}
          className={cn(
            'absolute bottom-4 right-4 p-2 rounded-lg transition-colors',
            text.trim() && !disabled
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex flex-wrap gap-2">
          {examples.map((example) => (
            <button
              key={example}
              onClick={() => setText(example)}
              disabled={disabled}
              className="px-3 py-1 text-xs text-gray-500 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400">{text.length} caracteres</span>
      </div>
    </div>
  );
}
