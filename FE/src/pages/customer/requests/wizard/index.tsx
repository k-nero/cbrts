import { type FC, useEffect, useRef, useState } from 'react';
import { type Resolver, useFormState, useWatch } from 'react-hook-form';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import type { AxiosError } from 'axios';

import { RequestLoadState } from '../components/RequestNotFound';
import { RequestPass } from '../components/RequestPass';

import HorsesStep from './HorsesStep';
import ReviewStep from './ReviewStep';
import RouteStep from './RouteStep';
import ServiceStep from './ServiceStep';
import { wizardSchema } from './wizardSchema';

import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import PageHeader from '@/components/PageHeader';
import { Steps } from '@/components/ui';
import { useRequest, useRoutes, useSaveRequest, useWizardHorses } from '@/hooks/request';
import type { ApiError, Blocker, Horse, Route, TransportRequest } from '@/interfaces';
import {
  apiErrorView,
  EMPTY_WIZARD,
  firstOpenStep,
  formatDate,
  formRefusal,
  fromRequest,
  holdsStep,
  blockerFieldErrors,
  liveBlockers,
  revealSelector,
  shownBlockers,
  STEP_FIELDS,
  stepOfBlocker,
  toDraftInput,
  WIZARD_STEPS,
  type FieldStep,
  type WizardStep,
  type WizardValues,
} from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

/** What every step is given by the page (spec §5.1). */
export type StepProps = {
  /** The last saved draft; undefined on /requests/new. */
  saved: TransportRequest | undefined;
  /** The saved blockers still standing: a change to a step retires its blockers. */
  live: Blocker[];
  /** The club's active horses. */
  horses: Horse[];
  /** The corridors between the two places ([] until both are places). */
  routes: Route[];
  /** The corridor shown: the draft's mode's, else road's, else the only one. */
  route: Route | null;
  notRun: boolean;
  saving: boolean;
  /** A live blocker keeps the customer on this step until its field changes. */
  held: boolean;
  /** The step's callout sentence after a refused save. */
  refusal: string | null;
  onContinue: () => void;
  onBack: () => void;
  goTo: (step: WizardStep) => void;
};

const STEP_LABELS = ['Horses', 'Route & dates', 'Service', 'Review'];

/** Refusals that belong on a field; everything else is the step's callout (spec §5.6). */
const FIELDS_BY_CODE: Record<string, string> = {
  SAME_PLACE: 'destination',
  PLACE_OR_TEXT: 'destination',
  DATE_FLEX: 'departureDate',
  ARRIVAL_WINDOW: 'arriveOn',
  MODE_OPTIONS: 'mode',
};
const SHOWN_FIELDS = Object.values(STEP_FIELDS).flat() as string[];

const errorCode = (error: unknown): string | undefined =>
  (error as AxiosError<Partial<ApiError>> | undefined)?.response?.data?.error;

/**
 * The kit's inputs give React Hook Form no focusable ref: bring the refusal into view instead, a
 * step-level one at its callout above the footer. Two frames, so the callout has rendered.
 */
const revealRefusal = (stepLevel: boolean) =>
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const target = document.querySelector(revealSelector(stepLevel));
      if (target) target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }),
  );

const WizardForm: FC<{ saved: TransportRequest | undefined; step: WizardStep }> = ({
  saved,
  step,
}) => {
  const router = useCustomRouter();
  const save = useSaveRequest();
  const horsesQuery = useWizardHorses();
  const [refusal, setRefusal] = useState<string | null>(null);
  const [attempted, setAttempted] = useState<FieldStep[]>([]);
  /** Counts saves: a save's form reset clears every error, so the blockers go back on after it. */
  const [saves, setSaves] = useState(0);
  const methods = useFormCustom<WizardValues>({
    resolver: zodResolver(wizardSchema) as unknown as Resolver<WizardValues>,
    defaultValues: saved ? fromRequest(saved) : EMPTY_WIZARD,
  });
  const values = useWatch({ control: methods.control }) as WizardValues;
  const { dirtyFields } = useFormState({ control: methods.control });
  const changed = Object.keys(dirtyFields) as (keyof WizardValues)[];
  const live = shownBlockers(liveBlockers(saved?.blockers ?? [], changed), attempted);

  const placeId = (o: WizardValues['origin']) => (o && !o.__isNew__ ? o.value : null);
  const routesQuery = useRoutes(placeId(values.origin), placeId(values.destination));
  const routes = routesQuery.data ?? [];
  const route =
    routes.find((r) => r.mode === values.mode) ??
    routes.find((r) => r.mode === 'ROAD') ??
    routes[0] ??
    null;
  const notRun =
    (routesQuery.isSuccess && routes.length === 0) ||
    live.some((b) => b.code === 'ROUTE_NOT_RUN' && b.field === 'destination');

  // A refusal is about the values that were sent: any change retires it, as FormWrapper does.
  const valuesKey = JSON.stringify(values);
  useEffect(() => setRefusal(null), [valuesKey]);

  // A standing blocker sits on its field, in the server's sentence; re-applied after every save,
  // because the save's reset clears errors even when the blockers didn't change.
  const fieldErrors = blockerFieldErrors(live);
  const fieldKey = JSON.stringify(fieldErrors);
  const shownOnFields = useRef<(keyof WizardValues)[]>([]);
  useEffect(() => {
    methods.clearErrors(shownOnFields.current);
    shownOnFields.current = [];
    for (const [field, message] of Object.entries(fieldErrors) as [keyof WizardValues, string][]) {
      methods.setError(field, { type: 'server', message });
      shownOnFields.current.push(field);
    }
    // `fieldErrors` is rebuilt every render; its key says when it changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldKey, saves, methods]);

  const index = WIZARD_STEPS.indexOf(step);
  const goTo = (target: WizardStep, id = saved?.id, replace = false) => {
    if (!id) return;
    const href = router.paths.get('request-edit', {
      pathParams: [id],
      queryParams: { step: target },
    });
    if (replace) router.replace(href, { force: true });
    else router.push(href, { force: true });
  };

  /** PUT (or POST) the whole form; the answer becomes the form's new baseline. */
  const persist = async (): Promise<TransportRequest | null> => {
    setRefusal(null);
    try {
      const response = await save.mutateAsync({
        id: saved?.id,
        input: toDraftInput(methods.getValues()),
      });
      methods.reset(fromRequest(response));
      setSaves((n) => n + 1);
      return response;
    } catch (error) {
      if (errorCode(error) === 'REQUEST_NOT_DRAFT' && saved) {
        router.replace(router.paths.get('request-submitted', { pathParams: [saved.id] }), {
          force: true,
        });
        return null;
      }
      const view = formRefusal(
        apiErrorView(
          error,
          FIELDS_BY_CODE,
          "Your draft wasn't saved. Check your connection and try again.",
        ),
        SHOWN_FIELDS,
      );
      Object.entries(view.fields).forEach(([field, message]) =>
        methods.setError(field as keyof WizardValues, { message }),
      );
      setRefusal(view.form);
      revealRefusal(view.form !== null && view.focus === null);
      return null;
    }
  };

  const onContinue = async () => {
    if (step === 'review') return;
    if (step === 'horses' && !saved && methods.getValues('horses').length === 0) {
      setRefusal('Pick at least one horse.');
      revealRefusal(false);
      return;
    }
    setAttempted((done) => (done.includes(step) ? done : [...done, step]));
    if (!(await methods.trigger(STEP_FIELDS[step]))) {
      revealRefusal(false);
      return;
    }
    const response = await persist();
    if (!response) return;
    const holds = (response.blockers ?? []).some((b) => stepOfBlocker(b) === step && holdsStep(b));
    if (!saved) {
      // The first save made the draft: from now on the wizard works on its own address.
      goTo(holds ? 'horses' : 'route', response.id, true);
      return;
    }
    if (holds) revealRefusal(false);
    else goTo(WIZARD_STEPS[index + 1]);
  };

  const onBack = async () => {
    if (index === 0) return;
    if (methods.formState.isDirty && !(await persist())) return;
    goTo(WIZARD_STEPS[index - 1]);
  };

  const props: StepProps = {
    saved,
    live,
    horses: horsesQuery.data ?? [],
    routes,
    route,
    notRun,
    saving: save.isPending,
    held: live.some((b) => stepOfBlocker(b) === step && holdsStep(b)),
    refusal,
    onContinue: () => void onContinue(),
    onBack: () => void onBack(),
    goTo: (target) => goTo(target),
  };

  return (
    <FormWrapper methods={methods} isSubmitting={save.isPending} layout="vertical">
      <div className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-6">
        <div className="flex min-w-0 flex-col gap-6">
          {step === 'horses' && <HorsesStep {...props} query={horsesQuery} />}
          {step === 'route' && <RouteStep {...props} />}
          {step === 'service' && <ServiceStep {...props} />}
          {step === 'review' && <ReviewStep {...props} />}
        </div>
        <RequestPass
          className="sticky top-6"
          values={values}
          live={live}
          route={route}
          notRun={notRun}
          horses={horsesQuery.data ?? []}
          rangeSub={
            step === 'review'
              ? 'Not a quote. Once you approve the quotation, this becomes your travel pass.'
              : undefined
          }
        />
      </div>
    </FormWrapper>
  );
};

/** The request wizard (spec §5): /requests/new, and /requests/{id}/edit?step=… on a draft. */
const RequestWizardPage: FC = () => {
  const { id } = useParams();
  const [params] = useSearchParams();
  const router = useCustomRouter();
  const query = useRequest(id);
  const saved = query.data;

  if (id && !saved) return <RequestLoadState query={query} />;
  if (saved && saved.status !== 'DRAFT')
    return (
      <Navigate to={router.paths.get('request-submitted', { pathParams: [saved.id] })} replace />
    );

  const asked = params.get('step') as WizardStep | null;
  const step: WizardStep = !saved
    ? 'horses'
    : asked && WIZARD_STEPS.includes(asked)
      ? asked
      : firstOpenStep(saved);

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        back={{ label: 'My requests', onClick: () => router.push(router.paths.get('my-requests')) }}
        title="Request transport"
        summary={`${saved ? `Draft saved ${formatDate(saved.updatedAt)}. ` : ''}Your move fills in on the right as you go; the binding price comes as an itemised quotation.`}
      />
      <Steps steps={STEP_LABELS} current={WIZARD_STEPS.indexOf(step)} />
      <WizardForm key={saved?.id ?? 'new'} saved={saved} step={step} />
    </div>
  );
};

export default RequestWizardPage;
