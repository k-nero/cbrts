import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tripApi } from '@/apis/trip';
import { queryKeys } from '@/constant/query';
import { TripStatusEnum, type TripRecordInput } from '@/interfaces';

export const useTrips = (audience: 'escort' | 'staff' | 'customer', page: number) =>
  useQuery({
    queryKey: queryKeys.trips.list(audience, page),
    queryFn: () => tripApi.list(audience, page),
  });

export const useTrip = (audience: 'escort' | 'staff' | 'customer', code: string, tripId?: string) =>
  useQuery({
    queryKey: [...queryKeys.trips.one(audience, code), tripId ?? 'current'],
    queryFn: () => tripApi.get(audience, code, tripId),
    enabled: Boolean(code),
    // The customer follows a trip on the road; once it's delivered nothing moves, so stop polling.
    refetchInterval: (query) =>
      audience === 'customer' && query.state.data?.tripStatus !== TripStatusEnum.DELIVERED
        ? 15_000
        : false,
  });

export const useTripRecord = (audience: 'escort' | 'staff', code: string, tripId?: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: TripRecordInput) => tripApi.record(audience, code, input, tripId),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.trips.lists() });
      await client.invalidateQueries({ queryKey: queryKeys.trips.one(audience, code) });
    },
  });
};
