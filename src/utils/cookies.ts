export interface CookieOptions {
  days?: number;
  path?: string;
  domain?: string;
  sameSite?: 'Strict' | 'Lax' | 'None';
  secure?: boolean;
}

export function getCookie(name: string): string | null {
  const pairs = document.cookie.split(';');
  for (const pair of pairs) {
    const [key, ...rest] = pair.split('=');
    if (key.trim() === name) {
      return decodeURIComponent(rest.join('=').trim());
    }
  }
  return null;
}

export function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  let cookie = `${name}=${encodeURIComponent(value)}`;

  if (options.days) {
    const date = new Date();
    date.setTime(date.getTime() + options.days * 24 * 60 * 60 * 1000);
    cookie += `; expires=${date.toUTCString()}`;
  }

  if (options.path) {
    cookie += `; path=${options.path}`;
  }

  if (options.domain) {
    cookie += `; domain=${options.domain}`;
  }

  if (options.sameSite) {
    cookie += `; SameSite=${options.sameSite}`;
  }

  if (options.secure) {
    cookie += '; Secure';
  }

  document.cookie = cookie;
}

export function deleteCookie(name: string, path?: string): void {
  let cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  if (path) {
    cookie += `; path=${path}`;
  }
  document.cookie = cookie;
}

export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2);
  return `${timestamp}${random}`;
}

export function isLocalStorageAvailable(): boolean {
  try {
    const key = '__storage_test__';
    window.localStorage.setItem(key, 'test');
    window.localStorage.removeItem(key);
    return true;
  } catch (_e) {
    return false;
  }
}

export function isSessionStorageAvailable(): boolean {
  try {
    const key = '__storage_test__';
    window.sessionStorage.setItem(key, 'test');
    window.sessionStorage.removeItem(key);
    return true;
  } catch (_e) {
    return false;
  }
}
