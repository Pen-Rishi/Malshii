import { create } from 'zustand';

// SHA-256 hash of "malshi" with salt — pre-computed so the credential works globally
// This is the hash of: "malshi" + "gate-cse-master-2024"
const VALID_CREDENTIALS: Record<string, string> = {};

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string): Promise<string> {
  return sha256(password + 'gate-cse-master-2024');
}

// Seed the default account on module load
(async () => {
  const hash = await hashPassword('malshi');
  VALID_CREDENTIALS['malshi'] = hash;
})();

export async function authenticate(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  const trimmedUser = username.trim().toLowerCase();
  const trimmedPass = password.trim();

  if (!trimmedUser || !trimmedPass) {
    return { success: false, error: 'Please enter username and password' };
  }

  // Check registered accounts from localStorage
  const registeredRaw = localStorage.getItem('gate_cse_accounts');
  const registered: Record<string, { hash: string; displayName: string }> = registeredRaw ? JSON.parse(registeredRaw) : {};

  const hash = await hashPassword(trimmedPass);

  // Check built-in credentials first
  if (VALID_CREDENTIALS[trimmedUser] && VALID_CREDENTIALS[trimmedUser] === hash) {
    return { success: true };
  }

  // Check registered accounts
  if (registered[trimmedUser] && registered[trimmedUser].hash === hash) {
    return { success: true };
  }

  return { success: false, error: 'Invalid username or password' };
}

export async function registerAccount(username: string, password: string, displayName: string): Promise<{ success: boolean; error?: string }> {
  const trimmedUser = username.trim().toLowerCase();
  const trimmedPass = password.trim();

  if (trimmedUser.length < 3) return { success: false, error: 'Username must be at least 3 characters' };
  if (trimmedPass.length < 4) return { success: false, error: 'Password must be at least 4 characters' };

  // Check if username is taken (built-in)
  if (VALID_CREDENTIALS[trimmedUser]) {
    return { success: false, error: 'Username already taken' };
  }

  // Check registered accounts
  const registeredRaw = localStorage.getItem('gate_cse_accounts');
  const registered: Record<string, { hash: string; displayName: string }> = registeredRaw ? JSON.parse(registeredRaw) : {};

  if (registered[trimmedUser]) {
    return { success: false, error: 'Username already taken' };
  }

  const hash = await hashPassword(trimmedPass);
  registered[trimmedUser] = { hash, displayName: displayName || trimmedUser };
  localStorage.setItem('gate_cse_accounts', JSON.stringify(registered));

  return { success: true };
}

interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  login: (username: string) => void;
  logout: () => void;
  checkSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  username: null,
  login: (username: string) => {
    sessionStorage.setItem('gate_cse_session', JSON.stringify({ username, loginAt: Date.now() }));
    set({ isAuthenticated: true, username });
  },
  logout: () => {
    sessionStorage.removeItem('gate_cse_session');
    set({ isAuthenticated: false, username: null });
  },
  checkSession: () => {
    const raw = sessionStorage.getItem('gate_cse_session');
    if (raw) {
      try {
        const session = JSON.parse(raw);
        // Session expires after 24 hours
        if (Date.now() - session.loginAt < 24 * 60 * 60 * 1000) {
          set({ isAuthenticated: true, username: session.username });
          return;
        }
      } catch { /* invalid session */ }
    }
    set({ isAuthenticated: false, username: null });
  },
}));
