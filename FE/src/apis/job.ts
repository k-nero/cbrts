import client from '@/config/axios';

import { makeCrudApi } from './crudFactory';
import type {
  CrewMember,
  FlightAllocation,
  FlightAllocationInput,
  FlightInput,
  JobDetail,
  JobListParams,
  JobSummary,
  TripLoad,
  MoveHorse,
  RoutePlan,
  ShareSuggestion,
  ShareTripResult,
  JoinableTrip,
  JourneyCorridor,
  TripJob,
  TripPart,
  JobClosing,
  Corridor,
  RouteDraftInput,
  BorderCrossing,
  Place,
} from '@/interfaces';

/**
 * Every planning call takes an optional `trip`: one trip of the job's journey when it travels as a
 * chain of trips (US-F3-16). Left out, the server plans the job's current trip.
 */
export const jobApi = {
  getDetail: (id: string, trip?: string) =>
    client.get<JobDetail>(`/staff/jobs/${id}`, { params: { trip } }).then((r) => r.data),

  getLoadPlan: (jobId: string, trip?: string) =>
    client
      .get<TripLoad>(`/staff/jobs/${jobId}/load-plan`, { params: { trip } })
      .then((r) => r.data),

  createLoadPlan: (jobId: string, vehicleId?: string, trip?: string) =>
    client
      .post<TripLoad>(`/staff/jobs/${jobId}/load-plan`, null, { params: { vehicleId, trip } })
      .then((r) => r.data),

  changeLoadPlanVehicle: (
    jobId: string,
    vehicleId: string,
    tripVehicleId?: string,
    trip?: string,
  ) =>
    client
      .put<TripLoad>(`/staff/jobs/${jobId}/load-plan/vehicle`, null, {
        params: { vehicleId, tripVehicleId, trip },
      })
      .then((r) => r.data),

  /** Adds a trailer to the trip's convoy (US-F3-10); the trip's plans reopen. */
  addTrailer: (jobId: string, vehicleId: string, trip?: string) =>
    client
      .post<TripLoad>(`/staff/jobs/${jobId}/load-plan/vehicles`, null, {
        params: { vehicleId, trip },
      })
      .then((r) => r.data),

  /** Takes a trailer out of the convoy with its placements, crew and booking. */
  removeTrailer: (jobId: string, tripVehicleId: string, trip?: string) =>
    client
      .delete<TripLoad>(`/staff/jobs/${jobId}/load-plan/vehicles/${tripVehicleId}`, {
        params: { trip },
      })
      .then((r) => r.data),

  moveHorse: (jobId: string, move: MoveHorse, trip?: string) =>
    client
      .post<TripLoad>(`/staff/jobs/${jobId}/load-plan/move`, move, { params: { trip } })
      .then((r) => r.data),

  autoArrange: (jobId: string, trip?: string) =>
    client
      .post<TripLoad>(`/staff/jobs/${jobId}/load-plan/auto-arrange`, null, { params: { trip } })
      .then((r) => r.data),

  confirmLoadPlan: (jobId: string, acceptedWarnings: string[] = [], trip?: string) =>
    client
      .post<TripLoad>(
        `/staff/jobs/${jobId}/load-plan/confirm`,
        { acceptedWarnings },
        { params: { trip } },
      )
      .then((r) => r.data),

  getRoutePlans: (jobId: string, trip?: string) =>
    client
      .get<RoutePlan[]>(`/staff/jobs/${jobId}/route-plans`, { params: { trip } })
      .then((r) => r.data),

  /** US-F3-17: saves the trip's route draft, a new version when its route is confirmed. */
  saveRouteDraft: (jobId: string, draft: RouteDraftInput, trip?: string) =>
    client
      .post<RoutePlan>(`/staff/jobs/${jobId}/route-plans`, draft, { params: { trip } })
      .then((r) => r.data),

  confirmRoutePlan: (jobId: string, planId: string, changeReason?: string, trip?: string) =>
    client
      .post<RoutePlan>(`/staff/jobs/${jobId}/route-plans/${planId}/confirm`, null, {
        params: { changeReason, trip },
      })
      .then((r) => r.data),

  /** Approved jobs that could share this job's trailer, with what combining means (US-F3-13). */
  getShareSuggestions: (jobId: string, trip?: string) =>
    client
      .get<ShareSuggestion[]>(`/staff/jobs/${jobId}/trip/suggestions`, { params: { trip } })
      .then((r) => r.data),

  /** Puts another job on this job's trip; the trip's plans reopen. */
  shareTrip: (jobId: string, otherJobId: string, acceptedWarnings: string[] = [], trip?: string) =>
    client
      .post<ShareTripResult>(
        `/staff/jobs/${jobId}/trip/jobs`,
        { jobId: otherJobId, acceptedWarnings },
        { params: { trip } },
      )
      .then((r) => r.data),

  /** US-F3-18: the confirmed trips this job's trip could join. */
  getJoinableTrips: (jobId: string, trip?: string) =>
    client
      .get<JoinableTrip[]>(`/staff/jobs/${jobId}/trip/joinable`, { params: { trip } })
      .then((r) => r.data),

  /** US-F3-18: puts this job's trip on a confirmed trip; both trips' plans reopen. */
  joinTrip: (jobId: string, tripId: string, acceptedWarnings: string[], trip?: string) =>
    client
      .post<ShareTripResult>(
        `/staff/jobs/${jobId}/trip/join`,
        { tripId, acceptedWarnings },
        { params: { trip } },
      )
      .then((r) => r.data),

  /** Takes a job off this job's trip onto a trip of its own. */
  takeOffTrip: (jobId: string, otherJobId: string, trip?: string) =>
    client
      .delete<TripJob>(`/staff/jobs/${jobId}/trip/jobs/${otherJobId}`, { params: { trip } })
      .then((r) => r.data),

  /** US-F3-21: the corridors the next trip can run, read from the city the journey has reached. */
  journeyCorridors: (jobId: string) =>
    client.get<JourneyCorridor[]>(`/staff/jobs/${jobId}/journey/corridors`).then((r) => r.data),

  /** US-F3-21: adds a trip on `corridorId` to the end of the job's journey. */
  /** US-F3-22: drafts the job's journey from its quoted route, every road route drafted and timed. */
  draftJourney: (jobId: string) =>
    client.post<TripPart[]>(`/staff/jobs/${jobId}/journey/draft`).then((r) => r.data),

  addTrip: (jobId: string, corridorId: string) =>
    client
      .post<TripPart[]>(`/staff/jobs/${jobId}/journey/trips`, { corridorId })
      .then((r) => r.data),

  /** US-F3-21: takes the journey's last trip off before it departs. */
  removeTrip: (jobId: string, tripId: string) =>
    client.delete<TripPart[]>(`/staff/jobs/${jobId}/journey/trips/${tripId}`).then((r) => r.data),

  /** US-F3-21: sets the flight of a flight trip; its times become the airport stops' times. */
  setFlight: (jobId: string, tripId: string, flight: FlightInput) =>
    client
      .put<JobDetail>(`/staff/jobs/${jobId}/journey/trips/${tripId}/flight`, flight)
      .then((r) => r.data),

  getCrew: (jobId: string, trip?: string) =>
    client.get<CrewMember[]>(`/staff/jobs/${jobId}/crew`, { params: { trip } }).then((r) => r.data),

  /** A trailer's crew, or with `flight` the trip's flight crew (flying grooms, the flight vet). */
  assignCrew: (
    jobId: string,
    crew: { userId: string; crewRole: string }[],
    tripVehicleId?: string,
    flight = false,
    trip?: string,
  ) =>
    client
      .post<CrewMember[]>(
        `/staff/jobs/${jobId}/crew`,
        { tripVehicleId, crew, flight },
        { params: { trip } },
      )
      .then((r) => r.data),

  /** US-F3-15: one job's consignment on its trip's flight: air waybill, stall positions, class. */
  updateFlightAllocation: (
    jobId: string,
    flightId: string,
    input: FlightAllocationInput,
    trip?: string,
  ) =>
    client
      .put<FlightAllocation>(`/staff/jobs/${jobId}/flights/${flightId}/allocation`, input, {
        params: { trip },
      })
      .then((r) => r.data),

  signOff: (jobId: string, trip?: string) =>
    client
      .post<JobDetail>(`/staff/jobs/${jobId}/sign-off`, null, { params: { trip } })
      .then((r) => r.data),

  /** US-F6-04: whether the job can close, and how it was closed. */
  closing: (jobId: string) =>
    client.get<JobClosing>(`/staff/jobs/${jobId}/closing`).then((r) => r.data),

  close: (jobId: string) =>
    client.post<JobClosing>(`/staff/jobs/${jobId}/close`).then((r) => r.data),
};

/**
 * The jobs list as a CRUD resource, so the Jobs page pages, sorts and searches the way Users & roles does.
 * Jobs are created by approving a request and change on the job page, so only `list` is ever called.
 */
export const jobsListApi = makeCrudApi<JobSummary, never, JobListParams>('/staff/jobs');

/** The catalog corridors, for the next trip of a journey (US-F3-16); there are a few dozen at most. */
export const corridorApi = {
  list: () =>
    client
      .get<{ content: Corridor[] }>('/staff/corridors', { params: { size: 200, sort: 'code' } })
      .then((r) => r.data.content),
};

/** What a route plan's stops can be (US-F3-17): every catalogued place, and the border crossings. */
export const routeStopApi = {
  places: (q: string) =>
    client
      .get<{ content: Place[] }>('/staff/places', { params: { q, size: 20 } })
      .then((r) => r.data.content),
  borderCrossings: () =>
    client.get<BorderCrossing[]>('/staff/border-crossings').then((r) => r.data),
};
