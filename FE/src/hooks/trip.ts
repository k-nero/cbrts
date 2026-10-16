import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tripApi } from '@/apis/trip';
import type { TripRecordInput } from '@/interfaces';

export const useTrips = (audience: 'escort' | 'staff' | 'customer') => useQuery({
  queryKey: ['trips', audience], queryFn: () => tripApi.list(audience), refetchInterval: audience === 'customer' ? 15_000 : false,
});

export const useTripRecord = (audience: 'escort' | 'staff', code: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: TripRecordInput) => tripApi.record(audience, code, input),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['trips'] }); },
  });
};
