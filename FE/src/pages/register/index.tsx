import { type FC, type ReactNode, useId } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { Flex } from 'antd';
import { z } from 'zod';

import Brand from '@/components/Brand';
import Footer from '@/components/Footer';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui';
import { useRegister } from '@/hooks/auth';
import { apiErrorMessage } from '@/lib';
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

const PASSWORD_MIN = 12;

const schema = z
  .object({
    clubName: z.string().trim().min(1, 'Enter the club or owner name.'),
    country: z.object({ label: z.string(), value: z.string() }).nullable(),
    lastName: z.string().trim().min(1, 'Enter your family name.'),
    firstName: z.string().trim().min(1, 'Enter your given name.'),
    email: z.email('Enter the email you’ll sign in with.'),
    phone: z.string().trim().max(20, 'At most 20 characters.'),
    password: z.string(),
    terms: z.boolean(),
  })
  .superRefine((val, ctx) => {
    if (val.country === null) {
      ctx.addIssue({ code: 'custom', path: ['country'], message: 'Pick the club’s country.' });
    }
    // Name the rule and the value (DESIGN.md, Access).
    if (val.password.length < PASSWORD_MIN) {
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: `At least ${PASSWORD_MIN} characters. Yours has ${val.password.length}.`,
      });
    }
    if (!val.terms) {
      ctx.addIssue({ code: 'custom', path: ['terms'], message: 'Agree to the terms to continue.' });
    }
  });
type RegisterForm = z.infer<typeof schema>;

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

const FormGroup: FC<{ title: string; children: ReactNode }> = ({ title, children }) => {
  const id = useId();
  return (
    <div
      role="group"
      aria-labelledby={id}
      className="flex flex-col gap-3.5 border-t border-line pt-[18px]"
    >
      <h2 id={id} className="type-h4 m-0 text-ink">
        {title}
      </h2>
      {children}
    </div>
  );
};

/**
 * Create a club account (DESIGN.md, Access): for racing clubs and horse owners only; staff
 * accounts come by invite. The new account is signed in and lands on its home.
 */
const RegisterPage = () => {
  const router = useCustomRouter();
  const register = useRegister();
  const methods = useFormCustom<RegisterForm>({
    resolver: zodResolver(schema),
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
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-line px-10">
        <Brand />
        <ThemeToggle />
      </header>
      <Flex style={{ flex: 1 }}>
        <Flex vertical gap={32} style={{ width: 720, padding: '96px 120px 64px 160px' }}>
          <Flex vertical gap={12}>
            <h1 className="m-0 font-display text-[44px] leading-[50px] font-normal text-ink">
              Create a club account
            </h1>
            <p className="m-0 text-[15px] text-ink-2">
              For racing clubs and horse owners. Staff accounts come by invite from your logistics
              manager.
            </p>
          </Flex>
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
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      name="lastName"
                      label="Family name"
                      component="text"
                      componentProps={{ autoComplete: 'family-name' }}
                    />
                    <FormField
                      name="firstName"
                      label="Given name"
                      component="text"
                      componentProps={{ autoComplete: 'given-name' }}
                    />
                  </div>
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
                <div className="flex items-center gap-1 border-t border-line pt-5">
                  <span className="type-body-s text-ink-2">Already have an account?</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => router.push(router.paths.get('login'))}
                  >
                    Sign in
                  </Button>
                </div>
              </>
            )}
          </FormWrapper>
        </Flex>
        <aside
          aria-labelledby="next-title"
          className="flex flex-1 flex-col border-l border-line bg-sunken"
          style={{ padding: '96px 120px 64px 96px' }}
        >
          <h2 id="next-title" className="type-h3 m-0 pb-4 text-ink">
            What happens next
          </h2>
          <ol className="m-0 flex max-w-[480px] list-none flex-col p-0">
            {NEXT_STEPS.map(([title, body], i) => (
              <li key={title} className="flex gap-3.5 border-t border-line py-3.5">
                <span
                  aria-hidden
                  className={[
                    'type-caption grid size-7 shrink-0 place-items-center rounded-full border',
                    i === 0 ? 'border-ink text-ink' : 'border-line-strong text-ink-3',
                  ].join(' ')}
                >
                  {i + 1}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="type-label-m text-ink">
                    {title}
                    {i === 0 && <span className="sr-only"> (this step)</span>}
                  </span>
                  <span className="type-body-s text-ink-2">{body}</span>
                </span>
              </li>
            ))}
          </ol>
        </aside>
      </Flex>
      <Footer size="compact" />
    </Flex>
  );
};

export default RegisterPage;
