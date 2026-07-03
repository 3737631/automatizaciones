'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CVAnalysisResult } from '@/types';

interface CVUploadCardProps {
  onUploadComplete?: (result: CVAnalysisResult) => void;
}

export default function CVUploadCard({ onUploadComplete }: CVUploadCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<CVAnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setResult(null);
    setError('');
    setProgress(0);
  };

  const handleFile = useCallback((f: File) => {
    setError('');
    if (f.type !== 'application/pdf') {
      setError('Solo se aceptan archivos PDF');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('El archivo no puede superar los 10 MB');
      return;
    }
    setFile(f);
    setResult(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 15, 85));
    }, 300);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/analyze-cv', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(await res.text() || 'Error al analizar el CV');
      }

      const data: CVAnalysisResult = await res.json();
      clearInterval(interval);
      setProgress(100);
      setResult(data);
      onUploadComplete?.(data);
    } catch (err) {
      clearInterval(interval);
      setError(err instanceof Error ? err.message : 'Error al subir el archivo');
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (result) {
    return (
      <div className="bg-white rounded-xl border border-green-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <h3 className="text-lg font-semibold text-gray-900">CV analizado</h3>
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-gray-500 mb-1">Resumen</p>
            <p className="text-gray-800">{result.summary}</p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Habilidades detectadas</p>
            <div className="flex flex-wrap gap-1.5">
              {result.detected_skills.map((skill) => (
                <span key={skill} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Experiencia</p>
            <p className="text-gray-800">{result.detected_experience}</p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Roles compatibles</p>
            <div className="flex flex-wrap gap-1.5">
              {result.compatible_roles.map((role) => (
                <span key={role} className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>
        <button onClick={reset} className="mt-4 text-xs text-gray-400 hover:text-gray-600 underline">
          Subir otro CV
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Sube tu CV</h3>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600">
          Arrastra tu CV aquí o <span className="text-blue-600 font-medium">selecciona un archivo</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">Solo PDF, máximo 10 MB</p>
      </div>

      {file && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="text-sm text-gray-700 truncate">{file.name}</span>
            <span className="text-xs text-gray-400 shrink-0">({formatSize(file.size)})</span>
          </div>
          <button onClick={reset} className="p-1 text-gray-400 hover:text-gray-600 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {uploading && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 text-center">Analizando CV...</p>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-1.5 text-sm text-red-500">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className={cn(
          'mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
          file && !uploading
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analizando...
          </>
        ) : (
          'Analizar CV'
        )}
      </button>
    </div>
  );
}
