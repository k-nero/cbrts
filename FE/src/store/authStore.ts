import { jwtDecode } from 'jwt-decode';
import { create } from 'zustand';

import { authApi } from '../api/auth';
import type { RoleName, User } from '../types';
import { RoleNameEnum } from '../types';

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

interface DecodedAccessToken {
    sub?: string;
    roles?: string[];
    exp?: number;
    iat?: number;
}

interface AuthState {
    tokens: AuthTokens | null;
    /** Derived from the access token, kept in sync by {@link AuthState.setSession}. */
    roles: string[];
    me: User | null;
    setMe: (user: User | null) => void;
    setSession: (tokens: AuthTokens | null) => void;
    logout: () => void;
}

const STORAGE_KEY = 'ef.auth';

function readStorage(): AuthTokens | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === null) {
            return null;
        }
        const parsed = JSON.parse(raw) as unknown;
        if (
            typeof parsed === 'object' &&
            parsed !== null &&
            'accessToken' in parsed &&
            'refreshToken' in parsed &&
            typeof (parsed as AuthTokens).accessToken === 'string' &&
            typeof (parsed as AuthTokens).refreshToken === 'string'
        ) {
            return parsed as AuthTokens;
        }
        return null;
    } catch {
        return null;
    }
}

function rolesFromAccessToken(accessToken: string | undefined): string[] {
    if (accessToken === undefined || accessToken === '') {
        return [];
    }
    try {
        const decoded = jwtDecode<DecodedAccessToken>(accessToken);
        if (Array.isArray(decoded.roles)) {
            return decoded.roles;
        }
        return [];
    } catch {
        return [];
    }
}

const initialTokens = readStorage();

export const useAuthStore = create<AuthState>((set) => ({
    tokens: initialTokens,
    roles: rolesFromAccessToken(initialTokens?.accessToken),
    me: null,
    setMe: (user) => set({ me: user }),
    setSession: (newTokens) => {
        if (newTokens !== null) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newTokens));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
        set({
            tokens: newTokens,
            roles: rolesFromAccessToken(newTokens?.accessToken),
            ...(newTokens === null ? { me: null } : {}),
        });
    },
    logout: () => {
        const refreshToken = useAuthStore.getState().tokens?.refreshToken;
        if (refreshToken !== undefined && refreshToken !== '') {
            // Best-effort server-side revocation so the refresh token can't be
            // used to mint new sessions after logout. The local session is
            // cleared regardless of whether this request succeeds.
            void authApi.logout(refreshToken).catch(() => {});
        }
        useAuthStore.getState().setSession(null);
    },
}));

// --- Selectors (reuse these so derivations stay consistent across callers) ---

export const selectIsAuthenticated = (s: AuthState): boolean => s.tokens?.accessToken !== undefined;

export const selectRoles = (s: AuthState): string[] => s.roles;

export const selectAccessToken = (s: AuthState): string | null => s.tokens?.accessToken ?? null;

// --- Role → landing-route helpers ---

/** Where each role lands after sign-in: its own work, not a shared dashboard. */
export const ROLE_HOMES: Record<RoleName, string> = {
    LOGISTICS_MANAGER: '/staff/overview',
    TRANSPORT_SPECIALIST: '/staff/jobs',
    FLEET_COORDINATOR: '/staff/jobs',
    ESCORT: '/escort',
    CUSTOMER: '/app',
};

const ROLE_PRIORITY: readonly RoleName[] = [
    RoleNameEnum.LOGISTICS_MANAGER,
    RoleNameEnum.TRANSPORT_SPECIALIST,
    RoleNameEnum.FLEET_COORDINATOR,
    RoleNameEnum.ESCORT,
    RoleNameEnum.CUSTOMER,
];

/** The signed-in user's main role: the first of theirs in ROLE_PRIORITY. */
export function primaryRole(roles: string[]): RoleName | null {
    return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? null;
}

export function primaryRoleHome(roles: string[]): string {
    const role = primaryRole(roles);
    // Authenticated but no recognized role: /forbidden explains it instead of looping via /login.
    return role !== null ? ROLE_HOMES[role] : '/forbidden';
}
