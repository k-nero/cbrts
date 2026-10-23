import client from '@/config/axios';

import { makeCrudApi } from './crudFactory';

import type {
  CreateVehicleInput,
  PagedResponse,
  UpdateVehicleInput,
  Vehicle,
  VehicleBooking,
  VehicleBookingInput,
  VehicleKind,
} from '@/interfaces';

export const vehicleApi = {
  list: (params?: { page?: number; size?: number; sort?: string }) =>
    client.get<PagedResponse<Vehicle>>('/staff/vehicles', { params }).then((r) => r.data),

  listActive: () => client.get<Vehicle[]>('/staff/vehicles/active').then((r) => r.data),

  get: (id: string) => client.get<Vehicle>(`/staff/vehicles/${id}`).then((r) => r.data),

  create: (body: CreateVehicleInput) =>
    client.post<Vehicle>('/staff/vehicles', body).then((r) => r.data),

  update: (id: string, body: UpdateVehicleInput) =>
    client.put<Vehicle>(`/staff/vehicles/${id}`, body).then((r) => r.data),

  book: (body: VehicleBookingInput) =>
    client.post<VehicleBooking>('/staff/vehicles/bookings', body).then((r) => r.data),

  getFleetCalendar: (params?: { from?: string; to?: string; vehicleKind?: VehicleKind }) =>
    client.get<VehicleBooking[]>('/staff/fleet-calendar', { params }).then((r) => r.data),
};

/** The Vehicles page list (paged, sorted by the server) and its Add vehicle. */
export const vehiclesApi = makeCrudApi<Vehicle, CreateVehicleInput>('/staff/vehicles');
