import React, { useEffect, useState } from 'react';

export function LoginPanel() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(j => setUser(j.user)).catch(() => {});
  }, []);

  const startOAuth = (provider: 'google' | 'github') => {
    window.location.href = `/api/auth/${provider}`;
  };

  const requestMagic = async () => {
    setMsg('Enviando enlace mágico...');
    const res = await fetch('/api/auth/magic', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
    if (res.ok) setMsg('Revisa la consola del servidor si no tienes SMTP (en dev).');
    else setMsg('Error enviando enlace.');
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
  };

  return (
    <div className="glass-panel p-3 mb-3">
      {user ? (
        <div>
          <div className="text-sm text-white">Conectado como <strong>{user.email}</strong></div>
          <div className="mt-2"><button onClick={logout} className="px-3 py-2 bg-rose-500 text-white rounded">Cerrar sesión</button></div>
        </div>
      ) : (
        <div>
          <div className="flex gap-2 mb-2">
            <button onClick={() => startOAuth('google')} className="flex-1 px-3 py-2 bg-google-blue text-white rounded">Entrar con Google</button>
            <button onClick={() => startOAuth('github')} className="flex-1 px-3 py-2 bg-slate-700 text-white rounded">Entrar con GitHub</button>
          </div>

          <div className="mt-2">
            <input placeholder="tu@correo.com" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 bg-black/40 rounded mb-2" />
            <button onClick={requestMagic} className="w-full px-3 py-2 bg-google-green text-black rounded">Enviar enlace mágico</button>
            <div className="text-xs text-slate-400 mt-2">{msg}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginPanel;
