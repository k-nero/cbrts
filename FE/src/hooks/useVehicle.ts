import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vehicleApi } from '@/apis/vehicle';
import type {
  CreateVehicleInput,
  UpdateVehicleInput,
  VehicleBookingInput,
  VehicleKind,
} from '@/interfaces';

export const useVehicles = (params?: { page?: number; size?: number }) => {
  return useQuery({
    queryKey: ['vehicles', params],
    queryFn: () => vehicleApi.list(params),
  });
};

export const useActiveVehicles = () => {
  return useQuery({
    queryKey: ['vehicles', 'active'],
    queryFn: async () => {
      const res = await vehicleApi.list({ size: 100 });
      return (res.content ?? []).filter((v) => v.status === 'ACTIVE');
    },
  });
};

export const useVehicle = (id: string) => {
  return useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => vehicleApi.get(id),
    enabled: !!id,
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
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
