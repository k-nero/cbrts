import client from '@/config/axios';

import { makeCrudApi } from './crudFactory';
import type {
  CrewMember,
  JobDetail,
  JobListParams,
  JobSummary,
  LoadPlan,
  MoveHorse,
  RoutePlan,
} from '@/interfaces';

export const jobApi = {
  getDetail: (id: string) => client.get<JobDetail>(`/staff/jobs/${id}`).then((r) => r.data),

  getLoadPlan: (jobId: string) =>
    client.get<LoadPlan>(`/staff/jobs/${jobId}/load-plan`).then((r) => r.data),

  createLoadPlan: (jobId: string, vehicleId?: string) =>
    client
      .post<LoadPlan>(`/staff/jobs/${jobId}/load-plan`, null, { params: { vehicleId } })
      .then((r) => r.data),

  changeLoadPlanVehicle: (jobId: string, vehicleId: string) =>
    client
      .put<LoadPlan>(`/staff/jobs/${jobId}/load-plan/vehicle`, null, { params: { vehicleId } })
      .then((r) => r.data),

  moveHorse: (jobId: string, move: MoveHorse) =>
    client.post<LoadPlan>(`/staff/jobs/${jobId}/load-plan/move`, move).then((r) => r.data),

  autoArrange: (jobId: string) =>
    client.post<LoadPlan>(`/staff/jobs/${jobId}/load-plan/auto-arrange`).then((r) => r.data),

  confirmLoadPlan: (jobId: string) =>
    client.post<LoadPlan>(`/staff/jobs/${jobId}/load-plan/confirm`).then((r) => r.data),

  getRoutePlans: (jobId: string) =>
    client.get<RoutePlan[]>(`/staff/jobs/${jobId}/route-plans`).then((r) => r.data),

  confirmRoutePlan: (jobId: string, planId: string, changeReason?: string) =>
    client
      .post<RoutePlan>(`/staff/jobs/${jobId}/route-plans/${planId}/confirm`, null, {
        params: { changeReason },
      })
      .then((r) => r.data),

  getCrew: (jobId: string) =>
    client.get<CrewMember[]>(`/staff/jobs/${jobId}/crew`).then((r) => r.data),

  assignCrew: (jobId: string, crew: { userId: string; crewRole: string }[]) =>
    client.post<CrewMember[]>(`/staff/jobs/${jobId}/crew`, { crew }).then((r) => r.data),

  signOff: (jobId: string) =>
    client.post<JobDetail>(`/staff/jobs/${jobId}/sign-off`).then((r) => r.data),
};

/**
 * The jobs list as a CRUD resource, so the Jobs page pages, sorts and searches the way Users & roles does.
 * Jobs are created by approving a request and change on the job page, so only `list` is ever called.
 */
export const jobsListApi = makeCrudApi<JobSummary, never, JobListParams>('/staff/jobs');
