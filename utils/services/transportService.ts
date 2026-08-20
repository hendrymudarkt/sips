'use client';

export async function fetchTransportList(params: Record<string, string>): Promise<Response> {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) p.append(k, v);
  });
  return fetch(`/api/transport?${p.toString()}`, { credentials: 'include' });
}

export async function createTransport(formData: FormData): Promise<Response> {
  const csrfToken = document.cookie.match(/csrf_token=([^;]+)/)?.[1];
  if (csrfToken && !formData.has('_csrf_token')) {
    formData.append('_csrf_token', csrfToken);
  }
  const headers: Record<string, string> = {};
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  return fetch('/api/transport', {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers,
  });
}

export async function updateTransport(id: string, formData: FormData): Promise<Response> {
  const csrfToken = document.cookie.match(/csrf_token=([^;]+)/)?.[1];
  if (csrfToken && !formData.has('_csrf_token')) {
    formData.append('_csrf_token', csrfToken);
  }
  const headers: Record<string, string> = {};
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  return fetch(`/api/transport/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: formData,
    credentials: 'include',
    headers,
  });
}

export async function deleteTransport(id: string, file: File): Promise<Response> {
  const body = new FormData();
  body.append('ba_deleted', file);
  body.append('_method', 'DELETE');
  const csrfToken = document.cookie.match(/csrf_token=([^;]+)/)?.[1];
  if (csrfToken) body.append('_csrf_token', csrfToken);
  const headers: Record<string, string> = {};
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  return fetch(`/api/transport/${encodeURIComponent(id)}`, {
    method: 'POST',
    body,
    credentials: 'include',
    headers,
  });
}

export async function fetchMasterUsers(params: Record<string, string>): Promise<Response> {
  const url = new URL('/api/master/sips-users', window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.append(key, value);
  });
  return fetch(url.toString(), { credentials: 'include' });
}

export async function fetchVehicles(): Promise<Response> {
  const url = new URL('/api/master/sips-kendaraan', window.location.origin);
  url.searchParams.append('vehiclegroupcode', 'DT,TR,MB,RT');
  return fetch(url.toString(), { credentials: 'include' });
}
