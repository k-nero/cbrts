import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { vehicleApi } from '@/apis/vehicle';
import type {
  CreateVehicleInput,
  UpdateVehicleInput,
  VehicleBookingInput,
  VehicleKind,
} from '@/interfaces';

export const useVehicles = (params?: { page?: number; size?: number; sort?: string }) => {
  return useQuery({
    queryKey: ['vehicles', params],
    queryFn: () => vehicleApi.list(params),
  });
};

export const useActiveVehicles = () => {
  return useQuery({
    queryKey: ['vehicles', 'active'],
    queryFn: () => vehicleApi.listActive(),
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
