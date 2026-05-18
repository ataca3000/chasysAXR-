import { useState } from 'react';
import { UploadCloud, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { uploadFileToS3 } from '../../services/storage/s3';

export function S3Uploader() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string>('Selecciona un archivo para subir a S3.');
  const [url, setUrl] = useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setStatus('idle');
    setMessage(selected ? `Archivo listo: ${selected.name}` : 'Selecciona un archivo para subir a S3.');
    setUrl('');
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus('error');
      setMessage('No hay archivo seleccionado.');
      return;
    }

    try {
      setStatus('uploading');
      setMessage('Generando presign y subiendo archivo...');
      const key = `uploads/${Date.now()}-${file.name}`;
      const uploadedUrl = await uploadFileToS3(file, key);
      setUrl(uploadedUrl);
      setMessage('Carga completada correctamente.');
      setStatus('done');
    } catch (error: any) {
      setStatus('error');
      setMessage(error?.message ?? 'Error inesperado durante la subida.');
    }
  };

  const handleUploadSample = async () => {
    try {
      setStatus('uploading');
      setMessage('Generando archivo de ejemplo y subiendo...');
      const content = `GoPilot iAgnt sample upload - ${new Date().toISOString()}`;
      const blob = new Blob([content], { type: 'text/plain' });
      const sampleFile = new File([blob], `sample-${Date.now()}.txt`, { type: 'text/plain' });
      const key = `uploads/sample-${Date.now()}.txt`;
      const uploadedUrl = await uploadFileToS3(sampleFile, key);
      setUrl(uploadedUrl);
      setMessage('Carga de ejemplo completada.');
      setStatus('done');
    } catch (error: any) {
      setStatus('error');
      setMessage(error?.message ?? 'Error al subir el archivo de ejemplo.');
    }
  };

  return (
    <div className="glass-panel p-4 rounded-3xl border border-white/10 bg-black/40 shadow-lg shadow-black/10">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h4 className="text-sm font-semibold text-white">Subida segura a S3</h4>
          <p className="text-[11px] text-slate-400">Prueba el flujo de almacenamiento local en tu instancia.</p>
        </div>
        <div className="flex items-center gap-2">
          {status === 'uploading' ? <Loader2 className="h-4 w-4 animate-spin text-google-blue" /> : null}
          {status === 'done' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : null}
          {status === 'error' ? <XCircle className="h-4 w-4 text-rose-400" /> : null}
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-[11px] uppercase tracking-[0.24em] text-slate-400">Archivo</label>
        <input
          type="file"
          onChange={handleFileChange}
          className="w-full rounded-lg border border-white/10 bg-[#0f172a] px-3 py-2 text-sm text-slate-200"
        />

        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || status === 'uploading'}
          className="w-full rounded-xl bg-google-blue px-4 py-2 text-[11px] font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UploadCloud size={16} className="inline-block mr-2" /> SUBIR A S3
        </button>

        <button
          type="button"
          onClick={handleUploadSample}
          disabled={status === 'uploading'}
          className="w-full rounded-xl bg-google-green px-4 py-2 text-[11px] font-semibold text-black transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 mt-2"
        >
          <UploadCloud size={14} className="inline-block mr-2" /> SUBIR EJEMPLO
        </button>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-[12px] text-slate-300">
          {message}
          {url ? (
            <div className="mt-2 text-[11px] text-green-300 break-all">
              URL: <a href={url} target="_blank" rel="noreferrer" className="underline">{url}</a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default S3Uploader;
