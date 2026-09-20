const TOKEN_KEY = 'cg_token';

export type TokenClaims = {
  userId: string;
  username: string;
};

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function decodeToken(token: string): TokenClaims | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.sub || !payload.username) return null;
    return { userId: payload.sub, username: payload.username };
  } catch {
    return null;
  }
}
