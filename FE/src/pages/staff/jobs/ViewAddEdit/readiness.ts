import { groomsRequired, horsesForCrew } from './crew';

import type { JobDetail, TripPart } from '@/interfaces';

/** done: nothing left. todo: the trip planners' next step. locked: the clearance gate. waiting: on someone else. */
export type ReadinessState = 'done' | 'todo' | 'locked' | 'waiting';

/** Where a step is done: the trip's load plan, the Clearance tab, or the manager's sign-off. */
export type ReadinessAction = 'load-plan' | 'crew' | 'clearance' | 'sign-off';

export interface ReadinessStep {
  key: 'route' | 'load' | 'flight' | 'crew' | 'clearance' | 'sign-off' | 'handed-on';
  label: string;
  state: ReadinessState;
  /** What was found, in words. */
  detail: string;
  action?: ReadinessAction;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Each trailer's crew against the API's rule: a driver, and a groom per three horses on it (US-F3-06). */
function crewGaps(job: JobDetail): string[] {
  const trailers = job.loadPlan?.vehicles ?? [];
  const convoy = trailers.length > 1;
  return trailers.flatMap((t) => {
    const onTrailer = job.crew.filter((c) => c.tripVehicleId === t.tripVehicleId);
    const placed = t.stalls.filter((s) => Boolean(s.horse)).length;
    const needed = groomsRequired(horsesForCrew(placed, convoy, job.horses.length));
    const grooms = onTrailer.filter(
      (c) => c.crewRole === 'GROOM' || c.crewRole === 'FLYING_GROOM',
    ).length;
    const gaps = [];
    if (!onTrailer.some((c) => c.crewRole === 'DRIVER')) gaps.push('a driver');
    if (grooms < needed) gaps.push(plural(needed - grooms, 'more groom'));
    return gaps.length ? [`${t.vehicleCode} needs ${gaps.join(' and ')}`] : [];
  });
}

/**
 * What a trip needs before it can leave, in the order the API checks it on sign-off and on departure
 * (TransportJobService.signOffTripPlan, TripService.requireDepartureAllowed): a confirmed route, a confirmed load
 * plan (on a flight, the airline's flight and its times instead), its crew, the clearance gate, the manager's sign-off, and the horses handed on by the trip before. Only the
 * first open step is anyone's to act on; the ones after it wait.
 */
export function departureReadiness(
  job: JobDetail,
  part: TripPart | null,
  previous: TripPart | null,
  routeConfirmed: boolean,
): ReadinessStep[] {
  const load = job.loadPlan;
  const flies = part?.mode === 'AIR';
  const gaps = crewGaps(job);
  // A flight's crew are its flying grooms and flight vet (US-F3-15); a road trip's, each trailer's.
  const flightCrew = job.crew.filter((c) => c.onFlight);
  const crewDone = flies
    ? flightCrew.length > 0
    : job.crew.length > 0 && (load ? gaps.length === 0 : true);
  const flight = (job.routePlan?.legs ?? []).find((l) => l.mode === 'AIR')?.flight ?? null;
  const flightTimed = Boolean(flight?.scheduledDepartureAt && flight?.scheduledArrivalAt);
  const signedOff = Boolean(job.tripSignedOffAt);
  // The trip before hands the horses on when it records their delivery at the transfer stop.
  const handedOn = !previous || previous.status === 'DELIVERED';

  const steps: ReadinessStep[] = [
    {
      key: 'route',
      label: 'Route',
      state: routeConfirmed ? 'done' : 'todo',
      detail: routeConfirmed
        ? 'Confirmed.'
        : job.routePlan
          ? 'Confirm the draft route to set the trip’s dates.'
          : 'No route yet: plan it to set the trip’s dates.',
    },
    flies
      ? {
          key: 'flight',
          label: 'Flight',
          state: flightTimed ? 'done' : 'todo',
          detail: flightTimed
            ? `${flight?.airline} ${flight?.flightNo}, times set.`
            : 'Enter the airline’s flight and its times.',
        }
      : {
          key: 'load',
          label: 'Load plan',
          state: load?.status === 'CONFIRMED' ? 'done' : 'todo',
          detail:
            load?.status === 'CONFIRMED'
              ? `Confirmed${load.confirmedByName ? ` by ${load.confirmedByName}` : ''}.`
              : load && load.unassignedHorses.length > 0
                ? `${plural(load.unassignedHorses.length, 'horse')} still to place.`
                : 'Place every horse and confirm the plan.',
          action: 'load-plan',
        },
    {
      key: 'crew',
      label: 'Crew',
      state: crewDone ? 'done' : 'todo',
      detail: flies
        ? crewDone
          ? `${plural(flightCrew.length, 'person', 'people')} on the flight.`
          : 'No flying grooms or flight vet assigned yet.'
        : crewDone
          ? `${plural(job.crew.length, 'person', 'people')} assigned.`
          : job.crew.length === 0
            ? 'No driver or grooms assigned yet.'
            : `${gaps.join('; ')}.`,
      action: 'crew',
    },
    {
      key: 'clearance',
      label: 'Clearance',
      state: job.clearanceGateState === 'Clear' ? 'done' : 'locked',
      detail:
        job.clearanceGateSummary ||
        (job.clearanceGateState === 'Clear'
          ? 'Clear to depart.'
          : 'The dossier isn’t ready for clearance yet.'),
      action: 'clearance',
    },
    {
      key: 'sign-off',
      label: 'Sign-off',
      state: signedOff ? 'done' : 'todo',
      detail: signedOff
        ? `Signed off${job.tripSignedOffBy ? ` by ${job.tripSignedOffBy}` : ''}.`
        : 'The logistics manager signs off the route, load and crew together.',
      action: 'sign-off',
    },
  ];
  if (previous && part)
    steps.push({
      key: 'handed-on',
      label: 'Horses handed on',
      state: handedOn ? 'done' : 'waiting',
      detail: handedOn
        ? `${previous.tripCode ?? 'The trip before'} handed them on.`
        : `${previous.tripCode ?? 'The trip before'} hands them on in ${part.startCity ?? 'the city this trip starts from'}; it can’t leave before then.`,
    });

  // Everything after the first open step waits on it, whatever it holds itself.
  const first = steps.findIndex((s) => s.state !== 'done');
  return steps.map((s, i) =>
    first >= 0 && i > first && s.state === 'todo' ? { ...s, state: 'waiting' } : s,
  );
}

/** The step the trip waits on: the first one not done, or null when it can leave. */
export const nextStep = (steps: ReadinessStep[]) => steps.find((s) => s.state !== 'done') ?? null;

/** Who holds a step, named for the job: its coordinator, its transport specialist, the manager or the escort. */
export function stepOwner(job: JobDetail, step: ReadinessStep) {
  if (step.key === 'clearance') return job.transportSpecialist ?? 'Transport specialist';
  if (step.key === 'sign-off') return 'Logistics manager';
  if (step.key === 'handed-on') return 'The escort';
  return job.coordinator ?? 'Fleet coordinator';
}

/** Steps the trip planners do themselves: the route, the load plan or flight, and the crew. */
export const isPlannerStep = (step: ReadinessStep) =>
  step.key === 'route' || step.key === 'load' || step.key === 'flight' || step.key === 'crew';
