// Frontend API client wrapper with auth-aware error handling
export async function api<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.error) msg = body.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// Form-data variant (for file uploads)
export async function apiForm<T = unknown>(
  url: string,
  formData: FormData,
  method = "POST"
): Promise<T> {
  const res = await fetch(url, { method, body: formData });
  if (!res.ok) {
    let msg = `Upload failed (${res.status})`;
    try { const b = await res.json(); if (b.error) msg = b.error; } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}
