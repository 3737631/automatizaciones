'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadCVFromClient } from '@/lib/cv/client-upload';
import { createSessionFromClient } from '@/lib/supabase/create-session';
import { createClient } from '@/lib/supabase/client';
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
  const [sessionReady, setSessionReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('autocandidatura_session_token');
    const email = localStorage.getItem('autocandidatura_connected_email');
    if (token) {
      setSessionReady(true);
    } else if (email) {
      createSessionFromClient(email, 'mock')
        .then((newToken) => {
          localStorage.setItem('autocandidatura_session_token', newToken);
          setSessionReady(true);
        })
        .catch(() => {
          setError('Sesión no encontrada. Vuelve a conectar tu correo.');
        });
    }
  }, []);

  const reset = () => {
    setFile(null);
    setResult(null);
    setError('');
    setProgress(0);
  };

  const handleFile = useCallback((f: File) => {
    setError('');
    if (f.type !== 'application/pdf') {
      setError('Solo se aceptan archivos PDF.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('El archivo no puede superar los 10 MB.');
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
    setProgress(10);

    try {
      const sessionToken = localStorage.getItem('autocandidatura_session_token');
      if (!sessionToken) {
        throw new Error('Primero conecta tu correo para poder subir el CV.');
      }

      setProgress(20);
      const clientResult = await uploadCVFromClient(file, sessionToken);
      if (!clientResult.success) {
        throw new Error(clientResult.error || 'Error al subir el CV.');
      }

      setProgress(40);

      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const pdfBase64 = btoa(binary);

      setProgress(60);

      let finalResult: CVAnalysisResult;
      try {
        const supabase = createClient();
        const { data, error } = await supabase.functions.invoke('analyze-cv', {
          body: { pdf_base64: pdfBase64 },
        });
        if (!error && data && data.detected_skills) {
          finalResult = {
            summary: data.summary || '',
            detected_skills: data.detected_skills || [],
            detected_experience: data.detected_experience || '',
            compatible_roles: data.compatible_roles || [],
            compatible_sectors: data.compatible_sectors || [],
            recommendations: data.recommendations || [],
          };
        } else {
          throw new Error(data?.error || 'Error de análisis');
        }
      } catch {
        finalResult = {
          summary: 'CV subido correctamente. Análisis básico disponible.',
          detected_skills: ['CV subido'],
          detected_experience: '',
          compatible_roles: [],
          compatible_sectors: [],
          recommendations: ['El análisis detallado se completará al activar el agente.'],
        };
      }

      setProgress(100);
      setResult(finalResult);
      onUploadComplete?.(finalResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir el archivo.');
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
          <h3 className="text-lg font-semibold text-gray-900">CV subido correctamente</h3>
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-gray-500 mb-1">Resumen</p>
            <p className="text-gray-800">{result.summary || 'Pendiente de análisis por el agente.'}</p>
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
          accept="application/pdf"
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
          <p className="text-xs text-gray-500 mt-1 text-center">Subiendo CV...</p>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-1.5 text-sm text-red-500">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {!sessionReady && !error && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Preparando sesión...
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || uploading || !sessionReady}
        className={cn(
          'mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
          file && !uploading && sessionReady
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Subiendo...
          </>
        ) : !sessionReady ? (
          'Preparando sesión...'
        ) : (
          'Subir CV'
        )}
      </button>
    </div>
  );
}
