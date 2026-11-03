import apiV1Instance from '@/config/axios';
import type { Handover, TripPage, TripRecord, TripRecordInput, TripView } from '@/interfaces';

const partParam = (audience: 'escort' | 'staff' | 'customer', part?: string) =>
  part ? { [audience === 'escort' ? 'tripCode' : 'trip']: part } : undefined;

export const tripApi = {
  list: async (audience: 'escort' | 'staff' | 'customer', page: number) =>
    (await apiV1Instance.get<TripPage>(`/${audience}/trips`, { params: { page, size: 20 } })).data,
  /**
   * `part` opens one trip of a job that spans trips (US-F5-06, US-F3-16): its id for staff and the
   * customer, its TRP code for the escort, who may crew more than one leg of a journey.
   */
  get: async (audience: 'escort' | 'staff' | 'customer', code: string, part?: string) =>
    (
      await apiV1Instance.get<TripView>(`/${audience}/trips/${code}`, {
        params: partParam(audience, part),
      })
    ).data,
  record: async (
    audience: 'escort' | 'staff',
    code: string,
    input: TripRecordInput,
    part?: string,
  ) =>
    (
      await apiV1Instance.post<TripRecord>(`/${audience}/trips/${code}/records`, input, {
        params: partParam(audience, part),
      })
    ).data,
  /** US-F6-02: the customer accepts the handover. */
  acceptHandover: async (code: string) =>
    (await apiV1Instance.post<Handover>(`/customer/trips/${code}/handover/accept`)).data,
  /** US-F6-02: the customer raises a discrepancy; the logistics manager is alerted. */
  reportDiscrepancy: async (code: string, description: string) =>
    (
      await apiV1Instance.post<Handover>(`/customer/trips/${code}/handover/discrepancy`, {
        description,
      })
    ).data,
};
