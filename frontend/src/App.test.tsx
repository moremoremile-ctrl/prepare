import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

describe('API connection', () => {
  it('shows idle, loading and success and prevents duplicate requests', async () => {
    let resolve!: (value: Response) => void;
    const fetchMock = vi.fn(
      () => new Promise<Response>((done) => (resolve = done)),
    );
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'idle');
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'loading');
    expect(screen.getByRole('button')).toBeDisabled();
    fireEvent.click(screen.getByRole('button'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/health', expect.any(Object));
    resolve(new Response(JSON.stringify({ status: 'ok' })));
    expect(await screen.findByText(/接続成功/)).toBeVisible();
    expect(screen.getByRole('button')).toBeEnabled();
  });

  it.each([
    ['network', () => Promise.reject(new Error('offline'))],
    ['HTTP', () => Promise.resolve(new Response('', { status: 503 }))],
    ['payload', () => Promise.resolve(new Response('{"status":"broken"}'))],
    ['JSON', () => Promise.resolve(new Response('not json'))],
  ])('shows recoverable failure for %s errors', async (_name, failure) => {
    const fetchMock = vi.fn().mockImplementationOnce(failure);
    fetchMock.mockResolvedValue(new Response('{"status":"ok"}'));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByText(/接続できませんでした/)).toBeVisible();
    expect(screen.getByRole('button')).toBeEnabled();
    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByText(/接続成功/)).toBeVisible();
  });
});
