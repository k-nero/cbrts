import client from '@/config/axios';

import { makeCrudApi } from './crudFactory';
import type {
  CrewMember,
  JobDetail,
  JobListParams,
  JobSummary,
  TripLoad,
  MoveHorse,
  RoutePlan,
  ShareTripResult,
  TripJob,
} from '@/interfaces';

export const jobApi = {
  getDetail: (id: string) => client.get<JobDetail>(`/staff/jobs/${id}`).then((r) => r.data),

  getLoadPlan: (jobId: string) =>
    client.get<TripLoad>(`/staff/jobs/${jobId}/load-plan`).then((r) => r.data),

  createLoadPlan: (jobId: string, vehicleId?: string) =>
    client
      .post<TripLoad>(`/staff/jobs/${jobId}/load-plan`, null, { params: { vehicleId } })
      .then((r) => r.data),

  changeLoadPlanVehicle: (jobId: string, vehicleId: string, tripVehicleId?: string) =>
    client
      .put<TripLoad>(`/staff/jobs/${jobId}/load-plan/vehicle`, null, {
        params: { vehicleId, tripVehicleId },
      })
      .then((r) => r.data),

  /** Adds a trailer to the trip's convoy (US-F3-10); the trip's plans reopen. */
  addTrailer: (jobId: string, vehicleId: string) =>
    client
      .post<TripLoad>(`/staff/jobs/${jobId}/load-plan/vehicles`, null, { params: { vehicleId } })
      .then((r) => r.data),

  /** Takes a trailer out of the convoy with its placements, crew and booking. */
  removeTrailer: (jobId: string, tripVehicleId: string) =>
    client
      .delete<TripLoad>(`/staff/jobs/${jobId}/load-plan/vehicles/${tripVehicleId}`)
      .then((r) => r.data),

  moveHorse: (jobId: string, move: MoveHorse) =>
    client.post<TripLoad>(`/staff/jobs/${jobId}/load-plan/move`, move).then((r) => r.data),

  autoArrange: (jobId: string) =>
    client.post<TripLoad>(`/staff/jobs/${jobId}/load-plan/auto-arrange`).then((r) => r.data),

  confirmLoadPlan: (jobId: string) =>
    client.post<TripLoad>(`/staff/jobs/${jobId}/load-plan/confirm`).then((r) => r.data),

  getRoutePlans: (jobId: string) =>
    client.get<RoutePlan[]>(`/staff/jobs/${jobId}/route-plans`).then((r) => r.data),

  confirmRoutePlan: (jobId: string, planId: string, changeReason?: string) =>
    client
      .post<RoutePlan>(`/staff/jobs/${jobId}/route-plans/${planId}/confirm`, null, {
        params: { changeReason },
      })
      .then((r) => r.data),

  /** Approved jobs that could join this job's trip (US-F3-11). */
  getShareCandidates: (jobId: string) =>
    client.get<TripJob[]>(`/staff/jobs/${jobId}/trip/candidates`).then((r) => r.data),

  /** Puts another job on this job's trip; the trip's plans reopen. */
  shareTrip: (jobId: string, otherJobId: string) =>
    client
      .post<ShareTripResult>(`/staff/jobs/${jobId}/trip/jobs`, { jobId: otherJobId })
      .then((r) => r.data),

  /** Takes a job off this job's trip onto a trip of its own. */
  takeOffTrip: (jobId: string, otherJobId: string) =>
    client.delete<TripJob>(`/staff/jobs/${jobId}/trip/jobs/${otherJobId}`).then((r) => r.data),

  getCrew: (jobId: string) =>
    client.get<CrewMember[]>(`/staff/jobs/${jobId}/crew`).then((r) => r.data),

  assignCrew: (
    jobId: string,
    crew: { userId: string; crewRole: string }[],
    tripVehicleId?: string,
  ) =>
    client
      .post<CrewMember[]>(`/staff/jobs/${jobId}/crew`, { tripVehicleId, crew })
      .then((r) => r.data),

  signOff: (jobId: string) =>
    client.post<JobDetail>(`/staff/jobs/${jobId}/sign-off`).then((r) => r.data),
};

/**
 * The jobs list as a CRUD resource, so the Jobs page pages, sorts and searches the way Users & roles does.
 * Jobs are created by approving a request and change on the job page, so only `list` is ever called.
 */
export const jobsListApi = makeCrudApi<JobSummary, never, JobListParams>('/staff/jobs');
