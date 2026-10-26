import { type Location, useLocation } from 'react-router-dom';
import {
  CheckOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  TagOutlined,
} from '@ant-design/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Flex } from 'antd';
import { motion } from 'motion/react';
import type { AxiosError } from 'axios';

import { type LoginForm, loginSchema } from './schema';

import signInPhoto from '@/assets/photos/draft-signin-grey-window.jpg';
import Brand from '@/components/Brand';
import Footer from '@/components/Footer';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import ThemeToggle from '@/components/ThemeToggle';
import { Button, PhotoPanel } from '@/components/ui';
import { useLogin } from '@/hooks/auth';
import { rise, settle, stagger } from '@/lib/motion';
import type { ApiError } from '@/interfaces';
import { canSignedInOpen, useCustomRouter } from '@/router/route.hook';
import { primaryRoleHome, useAuthStore } from '@/stores/authStore';
import React from 'react';

/**
 * What the account keeps for a club (the Access design's aside). On the photograph only the titles
 * are shown, so the list stays on the dark end of the scrim.
 */
const ACCOUNT_KEEPS: [string, React.ReactNode][] = [
  ['What you owe, and by when', <ClockCircleOutlined key="i" />],
  ['Documents checked against your travel dates', <FileTextOutlined key="i" />],
  ['Quotations you can read line by line', <TagOutlined key="i" />],
  ['Your horses, entered once', <CheckOutlined key="i" />],
];

/** One sign-in for racing clubs and staff; the account's role decides where it lands. */
const LoginPage = () => {
  const router = useCustomRouter();
  const location = useLocation();
  const login = useLogin();
  const methods = useFormCustom<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = methods.handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
      // Back to the page the guard sent us from, but only if this account may open it: the last
      // account on this browser may have been someone else's.
      const from = (location.state as { from?: Partial<Location> } | null)?.from;
      const { roles } = useAuthStore.getState();
      const target =
        from?.pathname !== undefined && canSignedInOpen(from.pathname, roles)
          ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
          : primaryRoleHome(roles);
      router.replace(target, { force: true });
    } catch (error) {
      // Never say whether the email has an account (DESIGN.md, Access): the server says the same
      // for both, and only names a removed account once its password matched.
      const message = (error as AxiosError<Partial<ApiError>>).response?.data?.message;
      methods.setError('form_error', { message: message ?? 'Email or password doesn’t match.' });
    }
  });

  return (
    <Flex vertical style={{ minHeight: '100vh' }}>
      <header className="h-16 shrink-0 border-b border-line px-10">
        <Flex align="center" justify="space-between" className="h-full">
          <Brand />
          <ThemeToggle />
        </Flex>
      </header>
      <Flex style={{ flex: 1 }}>
        {/* The heading, then the form, rise into place once (lib/motion). */}
        <motion.div
          className="flex flex-col gap-8"
          style={{ width: 720, padding: '96px 120px 64px 160px' }}
          variants={stagger(0.08)}
          initial="hidden"
          animate="shown"
        >
          <motion.div variants={rise} className="flex flex-col gap-3">
            <h1 className="m-0 font-display text-[44px] leading-[50px] font-normal text-ink">
              Sign in
            </h1>
            <p className="m-0 text-[15px] text-ink-2">
              One sign-in for racing clubs and EquiFreight staff.
            </p>
          </motion.div>
          <motion.div variants={rise}>
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
                  <Flex align="center" gap={4}>
                    <span className="type-body-s text-ink-2">New to EquiFreight?</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      trailingIcon="arrow-right"
                      onClick={() => router.push(router.paths.get('register'))}
                    >
                      Create a club account
                    </Button>
                  </Flex>
                  <p className="m-0 border-t border-line pt-5 text-[13px] leading-5 text-ink-3">
                    Staff sign in here too, with the email your invite was sent to. Your role
                    decides where you land.
                  </p>
                </>
              )}
            </FormWrapper>
          </motion.div>
        </motion.div>
        <PhotoPanel
          src={signInPhoto}
          alt="A hand rests on a grey horse's rugged neck as it looks out of a trailer window."
          direction="to bottom"
          scrim={[
            [0, 0],
            [0.3, 0.15],
            [0.55, 0.7],
            [1, 0.96],
          ]}
          className="flex flex-1 flex-col justify-end"
          style={{ padding: '96px 120px 64px 96px' }}
        >
          {/* What the account keeps arrives line by line, after the form. */}
          <motion.div variants={stagger(0.06, 0.3)} initial="hidden" animate="shown">
            <Flex
              component="aside"
              vertical
              aria-labelledby="keeps-title"
              className="max-w-[480px]"
            >
              <motion.h2
                variants={settle}
                id="keeps-title"
                className="m-0 pb-4 font-display text-[22px] leading-7 font-semibold text-ink"
              >
                One account for every move
              </motion.h2>
              {ACCOUNT_KEEPS.map(([title, icon]) => (
                <motion.div key={title} variants={settle} className="border-t border-line py-3.5">
                  <Flex gap={14} align="center">
                    <span className="text-[18px] text-ink-3">{icon}</span>
                    <span className="text-[14px] font-medium text-ink">{title}</span>
                  </Flex>
                </motion.div>
              ))}
            </Flex>
          </motion.div>
        </PhotoPanel>
      </Flex>
      <Footer size="compact" />
    </Flex>
  );
};

export default LoginPage;
