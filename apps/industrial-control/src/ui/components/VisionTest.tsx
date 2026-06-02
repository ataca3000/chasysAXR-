import { useState } from "react";

export function VisionTest() {
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = (f?: File) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      setFilePreview(data);
    };
    reader.readAsDataURL(f);
  };

  const send = async () => {
    if (!filePreview) return;
    setLoading(true);
    try {
      const base64 = filePreview.split(",")[1] || filePreview;
      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ error: (e as any).message || String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-black/30 rounded-lg">
      <h3 className="font-bold mb-2">Vision Test (Prototype)</h3>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {filePreview && (
        <div className="mt-3">
          <img src={filePreview} alt="preview" className="max-w-full max-h-60 rounded" />
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button onClick={send} disabled={!filePreview || loading} className="px-3 py-2 bg-google-blue rounded">
          {loading ? 'Sending...' : 'Send to /api/vision'}
        </button>
      </div>

      {result && (
        <pre className="mt-3 text-xs bg-white/5 p-3 rounded overflow-auto">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}

export default VisionTest;
