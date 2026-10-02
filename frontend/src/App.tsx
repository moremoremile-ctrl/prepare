import { useState } from 'react';

type Status = 'idle' | 'loading' | 'success' | 'error';

const messages: Record<Status, string> = {
  idle: 'ボタンを押して API への接続を確認してください。',
  loading: 'API に接続しています…',
  success: '接続成功。開発環境の準備ができました。',
  error: '接続できませんでした。API の起動を確認して再試行してください。',
};

export default function App() {
  const [status, setStatus] = useState<Status>('idle');

  async function checkConnection() {
    setStatus('loading');
    try {
      const response = await fetch('/api/health', {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error('HTTP error');
      const body: unknown = await response.json();
      if (
        typeof body !== 'object' ||
        body === null ||
        !('status' in body) ||
        body.status !== 'ok'
      ) {
        throw new Error('Unexpected response');
      }
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  return (
    <main>
      <p className="eyebrow">PREPARE / DEVELOPMENT</p>
      <h1>ここから、はじめよう。</h1>
      <p className="intro">React と FastAPI をつなぐ、小さな開発環境。</p>
      <section aria-label="API 接続チェック">
        <span className="tag">GET /api/health</span>
        <h2>接続チェック</h2>
        <p role="status" aria-live="polite" data-state={status}>
          {messages[status]}
        </p>
        <button disabled={status === 'loading'} onClick={checkConnection}>
          {status === 'loading' ? '確認中…' : 'API に接続する'}
        </button>
      </section>
      <footer>TypeScript + React · Python + FastAPI</footer>
    </main>
  );
}
