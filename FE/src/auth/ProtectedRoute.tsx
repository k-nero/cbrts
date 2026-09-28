import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { selectIsAuthenticated, selectRoles, useAuthStore } from '../store/authStore.ts';

interface ProtectedRouteProps {
    /** The user needs at least one of these roles; omit to allow any signed-in user. */
    anyOf?: readonly string[];
}

export default function ProtectedRoute({ anyOf }: ProtectedRouteProps) {
    const isAuthenticated = useAuthStore(selectIsAuthenticated);
    const roles = useAuthStore(selectRoles);
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (anyOf !== undefined && !anyOf.some((role) => roles.includes(role))) {
        return <Navigate to="/forbidden" replace />;
    }

    return <Outlet />;
}
