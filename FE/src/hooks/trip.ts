import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tripApi } from '@/apis/trip';
import { queryKeys } from '@/constant/query';
import { TripStatusEnum, type TripRecordInput } from '@/interfaces';

export const useTrips = (audience: 'escort' | 'staff' | 'customer', page: number) =>
  useQuery({
    queryKey: queryKeys.trips.list(audience, page),
    queryFn: () => tripApi.list(audience, page),
    // The office board follows the trips on the road (US-F4-04).
    refetchInterval: audience === 'staff' ? 30_000 : false,
  });

/** `part` is one trip of a job that spans trips: its id, or its TRP code for the escort (tripApi.get). */
export const useTrip = (audience: 'escort' | 'staff' | 'customer', code: string, part?: string) =>
  useQuery({
    queryKey: [...queryKeys.trips.one(audience, code), part ?? 'current'],
    queryFn: () => tripApi.get(audience, code, part),
    enabled: Boolean(code),
    // The customer follows a trip on the road; once it's delivered nothing moves, so stop polling.
    refetchInterval: (query) =>
      audience === 'customer' && query.state.data?.tripStatus !== TripStatusEnum.DELIVERED
        ? 15_000
        : false,
  });

export const useTripRecord = (audience: 'escort' | 'staff', code: string, part?: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: TripRecordInput) => tripApi.record(audience, code, input, part),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.trips.lists() });
      await client.invalidateQueries({ queryKey: queryKeys.trips.one(audience, code) });
    },
  });
};

/** The customer's answer to the handover (US-F6-02): the trip reloads with it. */
const useHandoverAnswer = <V>(code: string, answer: (v: V) => Promise<unknown>) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: answer,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.trips.one('customer', code) });
      await client.invalidateQueries({ queryKey: queryKeys.trips.lists() });
    },
  });
};

export const useAcceptHandover = (code: string) =>
  useHandoverAnswer(code, () => tripApi.acceptHandover(code));

export const useReportDiscrepancy = (code: string) =>
  useHandoverAnswer(code, (description: string) => tripApi.reportDiscrepancy(code, description));
