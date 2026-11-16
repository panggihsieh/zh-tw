import { useEffect, useState } from 'react';
import { signInWithCustomToken } from 'firebase/auth';
import { cloudServices } from './cloudSync';
import './schooliam-login.css';

export function SchoolIamButton() {
  return <a className="schooliam-login" href="/auth/schooliam/login">
    <span className="schooliam-login__mark" aria-hidden="true">S</span>
    <span>SchoolIAM</span><span className="schooliam-login__action">登入</span>
  </a>;
}

let completion: Promise<void> | undefined;
function finish() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code'), state = params.get('state');
  const invalid = params.has('error') || params.getAll('code').length !== 1 || params.getAll('state').length !== 1;
  history.replaceState(null, '', '/auth/schooliam/callback');
  return (async () => {
    if (invalid || !code || !state) throw new Error('登入回呼資料不完整，請重新登入。');
    const response = await fetch('/auth/schooliam/exchange', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state }),
    });
    const result = await response.json();
    if (!response.ok || typeof result.token !== 'string') throw new Error(result.error || 'SchoolIAM 登入失敗');
    await signInWithCustomToken(cloudServices().auth, result.token);
    window.location.replace('/?view=backend');
  })();
}

export function SchoolIamCallback() {
  const [error, setError] = useState('');
  useEffect(() => { void (completion ??= finish()).catch(e => setError(e instanceof Error ? e.message : 'SchoolIAM 登入失敗')); }, []);
  return <main className="backend-login"><h1>SchoolIAM 教師登入</h1>
    <p role={error ? 'alert' : 'status'}>{error || '正在確認教師身分…'}</p>
    {error && <a href="/?view=backend">返回教師登入</a>}
  </main>;
}
