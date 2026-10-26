import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { vehicleApi, vehiclesApi } from '@/apis/vehicle';
import { useCrudResource } from '@/hooks/crud';
import type {
  CreateVehicleInput,
  UpdateVehicleInput,
  Vehicle,
  VehicleBookingInput,
  VehicleKind,
} from '@/interfaces';

export const useVehicles = (params?: { page?: number; size?: number; sort?: string }) => {
  return useQuery({
    queryKey: ['vehicles', params],
    queryFn: () => vehicleApi.list(params),
  });
};

/**
 * The Vehicles page: paging, sort and Add vehicle. Keyed under 'vehicles', so a booking or a status
 * change (which invalidate ['vehicles']) refreshes it.
 */
export const useVehicleList = () =>
  useCrudResource<Vehicle, CreateVehicleInput>('vehicles', vehiclesApi);

/**
 * Active vehicles. With a job, for its trip (`tripId`, or its current one): each carries `available` and
 * `unavailableReason`, those that may join it first (US-F3-19).
 */
export const useActiveVehicles = (trip?: { jobId: string; tripId?: string | null }) => {
  return useQuery({
    queryKey: ['vehicles', 'active', trip?.jobId ?? null, trip?.tripId ?? null],
    queryFn: () => vehicleApi.listActive(trip),
  });
};

export const useVehicle = (id: string) => {
  return useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => vehicleApi.get(id),
    enabled: Boolean(id),
  });
};

export const useCreateVehicle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateVehicleInput) => vehicleApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
};

export const useUpdateVehicle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateVehicleInput }) =>
      vehicleApi.update(id, body),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle', id] });
    },
  });
};

export const useBookVehicle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: VehicleBookingInput) => vehicleApi.book(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
};

export const useFleetCalendar = (from?: string, to?: string, vehicleKind?: VehicleKind) => {
  return useQuery({
    queryKey: ['fleet-calendar', from, to, vehicleKind],
    queryFn: () => vehicleApi.getFleetCalendar({ from, to, vehicleKind }),
  });
};
