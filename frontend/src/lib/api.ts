export interface InjectResult {
  ok: boolean;
  result: string | null;
  error_type: 'dcs_error' | 'http_error' | 'connection_error' | null;
  message: string | null;
  status_code: number | null;
}

/** Injects `code` into the live mission via the backend proxy (never calls dcs-serve directly - ADR 0001). */
export async function injectScript(code: string, signal: AbortSignal): Promise<InjectResult> {
  const response = await fetch('/api/inject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`backend returned HTTP ${response.status}`);
  }

  return response.json();
}

export interface Template {
  id: string;
  name: string;
  code: string;
}

export async function listTemplates(): Promise<Template[]> {
  const response = await fetch('/api/templates');
  if (!response.ok) {
    throw new Error(`backend returned HTTP ${response.status}`);
  }
  return response.json();
}

/** Creates a template, or overwrites the existing one with the same name. Returns the full list. */
export async function saveTemplate(name: string, code: string): Promise<Template[]> {
  const response = await fetch('/api/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, code }),
  });
  if (!response.ok) {
    throw new Error(`backend returned HTTP ${response.status}`);
  }
  return response.json();
}

/** Returns the full list after deletion. */
export async function deleteTemplate(id: string): Promise<Template[]> {
  const response = await fetch(`/api/templates/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(`backend returned HTTP ${response.status}`);
  }
  return response.json();
}
