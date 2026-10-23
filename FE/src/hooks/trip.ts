import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tripApi } from '@/apis/trip';
import { queryKeys } from '@/constant/query';
import { TripStatusEnum, type TripRecordInput } from '@/interfaces';

export const useTrips = (audience: 'escort' | 'staff' | 'customer', page: number) =>
  useQuery({
    queryKey: queryKeys.trips.list(audience, page),
    queryFn: () => tripApi.list(audience, page),
    refetchInterval: 10_000,
  });

export const useTrip = (audience: 'escort' | 'staff' | 'customer', code: string) =>
  useQuery({
    queryKey: queryKeys.trips.one(audience, code),
    queryFn: () => tripApi.get(audience, code),
    enabled: Boolean(code),
    // Polling in real time while the trip is in transit (stops once delivered)
    refetchInterval: (query) =>
      query.state.data?.tripStatus !== TripStatusEnum.DELIVERED ? 10_000 : false,
  });

export const useTripRecord = (audience: 'escort' | 'staff', code: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: TripRecordInput) => tripApi.record(audience, code, input),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.trips.lists() });
      await client.invalidateQueries({ queryKey: queryKeys.trips.one(audience, code) });
    },
  });
};
