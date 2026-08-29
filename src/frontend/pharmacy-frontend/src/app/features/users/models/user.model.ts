// User domain models for the users feature module

export interface UserModel {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  tenantId: string;
  isActive: boolean;
}

// DTO shapes mirroring the backend API contracts

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  tenantId: string;
  isActive: boolean;
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  password: string;
}

export interface UpdateUserRequest {
  firstName: string;
  lastName: string;
}

export interface ChangeRoleRequest {
  newRole: string;
}
