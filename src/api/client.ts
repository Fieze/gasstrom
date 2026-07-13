export interface ApiErrorPayload {
    error?: string;
    details?: string[];
}

export class ApiError extends Error {
    status: number;
    details: string[];

    constructor(status: number, payload: ApiErrorPayload) {
        super(payload.error || `Request failed with status ${status}`);
        this.name = 'ApiError';
        this.status = status;
        this.details = payload.details || [];
    }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const response = await fetch(path, { credentials: 'same-origin', ...init, headers });
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const payload = isJson ? await response.json() : undefined;
    if (!response.ok) {
        if (response.status === 401 && !path.startsWith('/api/auth/')) window.dispatchEvent(new Event('gasstrom:unauthorized'));
        throw new ApiError(response.status, payload || {});
    }
    return payload as T;
}
