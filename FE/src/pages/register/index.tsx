import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { Col, Flex, Row } from 'antd';
import { motion } from 'motion/react';

import { FormGroup } from './FormGroup';
import { PASSWORD_MIN, type RegisterForm, registerSchema } from './schema';

import Brand from '@/components/Brand';
import Footer from '@/components/Footer';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui';
import { useRegister } from '@/hooks/auth';
import { apiErrorMessage } from '@/lib';
import { rise, settle, stagger } from '@/lib/motion';
import { useCustomRouter } from '@/router/route.hook';
import { primaryRoleHome, useAuthStore } from '@/stores/authStore';

/** The countries EquiFreight serves (the V2 seed); a club is registered in one of them. */
const COUNTRIES = [
  { label: 'Vietnam', value: 'VN' },
  { label: 'Cambodia', value: 'KH' },
  { label: 'Thailand', value: 'TH' },
  { label: 'Laos', value: 'LA' },
  { label: 'Malaysia', value: 'MY' },
  { label: 'Hong Kong', value: 'HK' },
];

/* What happens after sign-up, in order; the first step is this page. */
const NEXT_STEPS: [string, string][] = [
  [
    'Create your account',
    'Your club, and the person who signs in for it. You land on your home straight away.',
  ],
  ['Add your horses', 'Name, microchip, size and temperament. About 3 minutes each.'],
  [
    'Request transport',
    'You see an indicative range straight away, then an itemised quotation within 1 business day. Nothing to pay until you accept one.',
  ],
];

/**
 * Create a club account (DESIGN.md, Access): for racing clubs and horse owners only; staff
 * accounts come by invite. The new account is signed in and lands on its home.
 */
const RegisterPage = () => {
  const router = useCustomRouter();
  const register = useRegister();
  const methods = useFormCustom<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      clubName: '',
      country: null,
      lastName: '',
      firstName: '',
      email: '',
      phone: '',
      password: '',
      terms: false,
    },
  });

  const onSubmit = methods.handleSubmit(async (values) => {
    try {
      await register.mutateAsync({
        clubName: values.clubName,
        countryCode: values.country?.value ?? '',
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email.trim(),
        phone: values.phone || undefined,
        password: values.password,
      });
      router.replace(primaryRoleHome(useAuthStore.getState().roles), { force: true });
    } catch (error) {
      const message = apiErrorMessage(error, 'We couldn’t create the account. Try again.');
      if (isAxiosError(error) && error.response?.status === 409) {
        methods.setError('email', { message });
      } else {
        methods.setError('form_error', { message });
      }
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
              Create a club account
            </h1>
            <p className="m-0 text-[15px] text-ink-2">
              For racing clubs and horse owners. Staff accounts come by invite from your logistics
              manager.
            </p>
          </motion.div>
          <motion.div variants={rise}>
            <FormWrapper
              methods={methods}
              isSubmitting={register.isPending}
              onFinish={onSubmit}
              force
              style={{ width: 440 }}
            >
              {({ FormField }) => (
                <>
                  <FormGroup title="Your club">
                    <FormField
                      name="clubName"
                      label="Club or owner name"
                      component="text"
                      componentProps={{ autoComplete: 'organization', autoFocus: true }}
                    />
                    <FormField
                      name="country"
                      label="Country"
                      component="select"
                      componentProps={{ options: COUNTRIES, placeholder: 'Pick a country' }}
                    />
                  </FormGroup>
                  <FormGroup title="You">
                    <Row gutter={[16, 16]}>
                      <Col span={12}>
                        <FormField
                          name="lastName"
                          label="Family name"
                          component="text"
                          componentProps={{ autoComplete: 'family-name' }}
                        />
                      </Col>
                      <Col span={12}>
                        <FormField
                          name="firstName"
                          label="Given name"
                          component="text"
                          componentProps={{ autoComplete: 'given-name' }}
                        />
                      </Col>
                    </Row>
                    <FormField
                      name="email"
                      label="Email"
                      component="text"
                      componentProps={{
                        autoComplete: 'email',
                        instruction: 'You sign in with it, and bookings are sent to it.',
                      }}
                    />
                    <FormField
                      name="phone"
                      label="Phone (optional)"
                      component="text"
                      componentProps={{ autoComplete: 'tel' }}
                    />
                  </FormGroup>
                  <FormGroup title="Password">
                    <FormField
                      name="password"
                      label="Password"
                      component="password"
                      componentProps={{
                        autoComplete: 'new-password',
                        instruction: `At least ${PASSWORD_MIN} characters.`,
                      }}
                    />
                  </FormGroup>
                  <FormField
                    name="terms"
                    component="checkbox"
                    componentProps={{
                      showLabel: false,
                      children: 'I agree to the terms of service',
                    }}
                  />
                  <SubmitButton type="primary" block label="Create account" />
                  <div className="border-t border-line pt-5">
                    <Flex align="center" gap={4}>
                      <span className="type-body-s text-ink-2">Already have an account?</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(router.paths.get('login'))}
                      >
                        Sign in
                      </Button>
                    </Flex>
                  </div>
                </>
              )}
            </FormWrapper>
          </motion.div>
        </motion.div>
        {/* The next steps arrive one after another, after the form. */}
        <motion.aside
          aria-labelledby="next-title"
          className="flex flex-1 flex-col border-l border-line bg-sunken"
          style={{ padding: '96px 120px 64px 96px' }}
          variants={stagger(0.08, 0.3)}
          initial="hidden"
          animate="shown"
        >
          <motion.h2 variants={settle} id="next-title" className="type-h3 m-0 pb-4 text-ink">
            What happens next
          </motion.h2>
          <Flex component="ol" vertical className="m-0 max-w-[480px] list-none p-0">
            {NEXT_STEPS.map(([title, body], i) => (
              <motion.li key={title} variants={settle} className="border-t border-line py-3.5">
                <Flex gap={14}>
                  <Flex
                    aria-hidden
                    align="center"
                    justify="center"
                    className={[
                      'type-caption size-7 shrink-0 rounded-full border',
                      i === 0 ? 'border-ink text-ink' : 'border-line-strong text-ink-3',
                    ].join(' ')}
                  >
                    {i + 1}
                  </Flex>
                  <Flex component="span" vertical gap={2}>
                    <span className="type-label-m text-ink">
                      {title}
                      {i === 0 && <span className="sr-only"> (this step)</span>}
                    </span>
                    <span className="type-body-s text-ink-2">{body}</span>
                  </Flex>
                </Flex>
              </motion.li>
            ))}
          </Flex>
        </motion.aside>
      </Flex>
      <Footer size="compact" />
    </Flex>
  );
};

export default RegisterPage;
