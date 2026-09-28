import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Form } from 'antd';
import { z } from 'zod';

import { authApi } from '../../api/auth';
import { Brand } from '../../layouts/AppShell';
import { ControlledInput, ControlledPassword, useZodForm } from '../../lib/form';
import {
    primaryRoleHome,
    selectIsAuthenticated,
    selectRoles,
    useAuthStore,
} from '../../store/authStore.ts';

const schema = z.object({
    email: z.email('Enter the email you sign in with.'),
    password: z.string().min(1, 'Enter your password.'),
});

/** One sign-in for racing clubs and staff; the account's role decides where it lands. */
export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const isAuthenticated = useAuthStore(selectIsAuthenticated);
    const roles = useAuthStore(selectRoles);
    const setSession = useAuthStore((s) => s.setSession);
    const [error, setError] = useState<string | null>(null);
    const { control, handleSubmit, formState } = useZodForm(schema, {
        defaultValues: { email: '', password: '' },
    });

    if (isAuthenticated) {
        return <Navigate to={primaryRoleHome(roles)} replace />;
    }

    const onSubmit = handleSubmit(async ({ email, password }) => {
        setError(null);
        try {
            setSession(await authApi.login(email, password));
            const from = (location.state as { from?: { pathname?: string } } | null)?.from
                ?.pathname;
            navigate(from ?? primaryRoleHome(useAuthStore.getState().roles), { replace: true });
        } catch {
            // Never say whether the email has an account (DESIGN.md, Access).
            setError('Email or password doesn’t match.');
        }
    });

    return (
        <div className="flex min-h-screen flex-col bg-canvas">
            <header className="flex h-16 items-center border-b border-line px-10">
                <Brand />
            </header>
            <main className="flex flex-1 justify-center pt-24">
                <div className="flex w-[440px] flex-col gap-8">
                    <div className="flex flex-col gap-3">
                        <h1 className="m-0 font-display text-[44px] leading-[50px] font-normal text-ink">
                            Sign in
                        </h1>
                        <p className="m-0 text-[15px] text-ink-2">
                            One sign-in for racing clubs and EquiFreight staff.
                        </p>
                    </div>
                    <Form layout="vertical" requiredMark={false} onSubmitCapture={onSubmit}>
                        {error !== null ? (
                            <Alert type="error" showIcon message={error} className="mb-5" />
                        ) : null}
                        <ControlledInput
                            control={control}
                            name="email"
                            label="Email"
                            autoComplete="email"
                        />
                        <ControlledPassword
                            control={control}
                            name="password"
                            label="Password"
                            autoComplete="current-password"
                        />
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            loading={formState.isSubmitting}
                        >
                            Sign in
                        </Button>
                    </Form>
                </div>
            </main>
        </div>
    );
}
