const CRUD_API_URL = process.env.NEXT_PUBLIC_CRUD_API_URL ?? 'http://localhost:5001';

export type User = {
  id: number;
  username: string;
  email: string;
};

export type AuthResponse = {
  access_token: string;
  user: User;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${CRUD_API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(response.status, data.error ?? 'Request failed');
  }
  return data as T;
}

export function signup(username: string, email: string, password: string) {
  return postJson<AuthResponse>('/identity/signup', { username, email, password });
}

export function login(email: string, password: string) {
  return postJson<AuthResponse>('/identity/login', { email, password });
}
