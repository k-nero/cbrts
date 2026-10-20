import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tripApi } from '@/apis/trip';
import type { TripRecordInput } from '@/interfaces';

export const useTrips = (audience: 'escort' | 'staff' | 'customer', page: number) =>
  useQuery({
    queryKey: ['trips', audience, page],
    queryFn: () => tripApi.list(audience, page),
  });

export const useTrip = (audience: 'escort' | 'staff' | 'customer', code: string) =>
  useQuery({
    queryKey: ['trip', audience, code],
    queryFn: () => tripApi.get(audience, code),
    enabled: Boolean(code),
    refetchInterval: audience === 'customer' || audience === 'staff' ? 15_000 : false,
  });

export const useTripRecord = (audience: 'escort' | 'staff', code: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: TripRecordInput) => tripApi.record(audience, code, input),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['trips'] });
      await client.invalidateQueries({ queryKey: ['trip', audience, code] });
    },
  });
};
