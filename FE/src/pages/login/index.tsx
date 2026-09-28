import { useLocation } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Flex } from 'antd';
import { z } from 'zod';

import Brand from '@/components/Brand';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import { useLogin } from '@/hooks/auth';
import { useCustomRouter } from '@/router/route.hook';
import { primaryRoleHome, useAuthStore } from '@/stores/authStore';

const schema = z.object({
  email: z.email('Enter the email you sign in with.'),
  password: z.string().min(1, 'Enter your password.'),
});
type LoginForm = z.infer<typeof schema>;

/** One sign-in for racing clubs and staff; the account's role decides where it lands. */
const LoginPage = () => {
  const router = useCustomRouter();
  const location = useLocation();
  const login = useLogin();
  const methods = useFormCustom<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = methods.handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      router.replace(from ?? primaryRoleHome(useAuthStore.getState().roles), { force: true });
    } catch {
      // Never say whether the email has an account (DESIGN.md, Access).
      methods.setError('form_error', { message: 'Email or password doesn’t match.' });
    }
  });

  return (
    <Flex vertical style={{ minHeight: '100vh' }}>
      <header className="flex h-16 items-center border-b border-line px-10">
        <Brand />
      </header>
      <Flex justify="center" style={{ paddingTop: 96 }}>
        <Flex vertical gap={32} style={{ width: 440 }}>
          <Flex vertical gap={12}>
            <h1 className="m-0 font-display text-[44px] leading-[50px] font-normal text-ink">
              Sign in
            </h1>
            <p className="m-0 text-[15px] text-ink-2">
              One sign-in for racing clubs and EquiFreight staff.
            </p>
          </Flex>
          <FormWrapper methods={methods} isSubmitting={login.isPending} onFinish={onSubmit} force>
            {({ FormField }) => (
              <>
                <FormField
                  name="email"
                  label="Email"
                  component="text"
                  componentProps={{ autoComplete: 'email' }}
                />
                <FormField
                  name="password"
                  label="Password"
                  component="password"
                  componentProps={{ autoComplete: 'current-password' }}
                />
                <SubmitButton type="primary" block label="Sign in" />
              </>
            )}
          </FormWrapper>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default LoginPage;
