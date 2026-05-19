export interface UserInfo {
  role: string;
  id: string;
  tenantId: string;
}

export function decodeToken(token: string): UserInfo | null {
  try {
    const tokenStr = token.includes(".") ? atob(token.split(".")[1]) : atob(token);
    const payload = JSON.parse(tokenStr);
    return { role: payload.role || "", id: payload.id || "", tenantId: payload.tenantId || "" };
  } catch {
    return null;
  }
}

export function useUserRole(): UserInfo | null {
  const token = typeof window !== "undefined" ? localStorage.getItem("wop_token") : null;
  if (!token) return null;
  return decodeToken(token);
}

export function getUserRole(): string | null {
  const token = typeof window !== "undefined" ? localStorage.getItem("wop_token") : null;
  if (!token) return null;
  const info = decodeToken(token);
  return info?.role ?? null;
}
