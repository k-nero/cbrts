import type { User } from '../types';
import { type CrudListParams, makeCrudApi } from './crudFactory';

export interface UserInput {
    firstName: string;
    lastName: string;
    /** Required on create; absent on update (the server keeps the existing address). */
    email?: string;
    /** Required on create; absent on update. */
    password?: string;
    phone?: string | null;
    /** Role names (e.g. ["TRANSPORT_SPECIALIST"]); the backend matches by name. */
    roles?: string[];
}

export interface UserListParams extends CrudListParams {
    role?: string;
}

export const usersApi = makeCrudApi<User, UserInput, UserListParams>('/admin/users');
