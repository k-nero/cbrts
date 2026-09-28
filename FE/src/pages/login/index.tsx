import { useLocation } from 'react-router-dom';
import {
  CheckOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  TagOutlined,
} from '@ant-design/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Flex } from 'antd';
import { z } from 'zod';

import Brand from '@/components/Brand';
import Footer from '@/components/Footer';
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

/** What the account keeps for a club (the Access design's aside). */
const ACCOUNT_KEEPS: [string, string, React.ReactNode][] = [
  [
    'What you owe, and by when',
    'Every upload and answer we need from you, sorted by deadline, each with its due date.',
    <ClockCircleOutlined key="i" />,
  ],
  [
    'Documents checked against your travel dates',
    'Each test and certificate is checked against the day the horse travels, ' +
      'not the day you upload it.',
    <FileTextOutlined key="i" />,
  ],
  [
    'Quotations you can read line by line',
    'Every line says how it was worked out. You accept or decline in one place.',
    <TagOutlined key="i" />,
  ],
  [
    'Your horses, entered once',
    'Passport details, size and handling needs are reused on every move.',
    <CheckOutlined key="i" />,
  ],
];

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
      <header className="flex h-16 shrink-0 items-center border-b border-line px-10">
        <Brand />
      </header>
      <Flex style={{ flex: 1 }}>
        <Flex vertical gap={32} style={{ width: 720, padding: '96px 120px 64px 160px' }}>
          <Flex vertical gap={12}>
            <h1 className="m-0 font-display text-[44px] leading-[50px] font-normal text-ink">
              Sign in
            </h1>
            <p className="m-0 text-[15px] text-ink-2">
              One sign-in for racing clubs and EquiFreight staff.
            </p>
          </Flex>
          <FormWrapper
            methods={methods}
            isSubmitting={login.isPending}
            onFinish={onSubmit}
            force
            style={{ width: 440 }}
          >
            {({ FormField }) => (
              <>
                <FormField
                  name="email"
                  label="Email"
                  component="text"
                  componentProps={{ autoComplete: 'email', autoFocus: true }}
                />
                <FormField
                  name="password"
                  label="Password"
                  component="password"
                  componentProps={{ autoComplete: 'current-password' }}
                />
                <SubmitButton type="primary" block label="Sign in" />
                <p className="m-0 border-t border-line pt-5 text-[13px] leading-5 text-ink-3">
                  Staff sign in here too, with the email your invite was sent to. Your role decides
                  where you land.
                </p>
              </>
            )}
          </FormWrapper>
        </Flex>
        <aside
          className="flex-1 border-l border-line bg-sunken"
          style={{ padding: '96px 120px 64px 96px' }}
        >
          <Flex vertical style={{ maxWidth: 480 }}>
            <h2 className="m-0 pb-4 font-display text-[22px] leading-7 font-semibold text-ink">
              One account for every move
            </h2>
            {ACCOUNT_KEEPS.map(([title, body, icon]) => (
              <Flex key={title} gap={14} className="border-t border-line py-3.5">
                <span className="pt-0.5 text-[18px] text-ink-3">{icon}</span>
                <Flex vertical gap={2}>
                  <span className="text-[14px] font-medium text-ink">{title}</span>
                  <span className="text-[13px] leading-5 text-ink-2">{body}</span>
                </Flex>
              </Flex>
            ))}
          </Flex>
        </aside>
      </Flex>
      <Footer size="compact" />
    </Flex>
  );
};

export default LoginPage;
