import { appModules, type AppModulePermission } from "@/lib/domain/types";
import { badRequest } from "@/lib/http/errors";
import { isRecord, normalizeString } from "@/lib/validation/common";

export type LoginInput = {
  identifier: string;
  password: string;
};

export type CreateUserInput = {
  username: string;
  email: string;
  fullName: string;
  password: string;
  active: boolean;
  permissions: AppModulePermission[];
};

export type UpdateUserInput = Partial<Omit<CreateUserInput, "password">> & {
  password?: string;
};

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizePermissions(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value.filter((item): item is AppModulePermission =>
        typeof item === "string" && appModules.includes(item as AppModulePermission),
      ),
    ),
  );
}

export function parseLoginInput(payload: unknown): LoginInput {
  if (!isRecord(payload)) throw badRequest("El cuerpo de la solicitud debe ser un objeto JSON.");

  const identifier = normalizeString(payload.identifier);
  const password = normalizeString(payload.password);
  const errors: Record<string, string> = {};

  if (!identifier) errors.identifier = "Usuario o correo requerido.";
  if (!password) errors.password = "Contraseña requerida.";
  if (Object.keys(errors).length > 0) throw badRequest("Credenciales no válidas.", errors);

  return { identifier: identifier as string, password: password as string };
}

export function parseCreateUserInput(payload: unknown): CreateUserInput {
  if (!isRecord(payload)) throw badRequest("El cuerpo de la solicitud debe ser un objeto JSON.");

  const username = normalizeString(payload.username)?.toLowerCase();
  const email = normalizeString(payload.email)?.toLowerCase();
  const fullName = normalizeString(payload.fullName);
  const password = normalizeString(payload.password);
  const permissions = normalizePermissions(payload.permissions);
  const active = normalizeBoolean(payload.active, true);
  const errors: Record<string, string> = {};

  if (!username) errors.username = "Usuario requerido.";
  if (!email || !email.includes("@")) errors.email = "Correo inválido.";
  if (!fullName) errors.fullName = "Nombre requerido.";
  if (!password) errors.password = "Contraseña requerida.";
  if (permissions.length === 0) errors.permissions = "Debe seleccionar al menos un módulo.";
  if (Object.keys(errors).length > 0) throw badRequest("Datos del usuario no válidos.", errors);

  return {
    username: username as string,
    email: email as string,
    fullName: fullName as string,
    password: password as string,
    active,
    permissions,
  };
}

export function parseUpdateUserInput(payload: unknown): UpdateUserInput {
  if (!isRecord(payload)) throw badRequest("El cuerpo de la solicitud debe ser un objeto JSON.");

  const input: UpdateUserInput = {};
  const errors: Record<string, string> = {};

  if (payload.username !== undefined) {
    const username = normalizeString(payload.username)?.toLowerCase();
    if (!username) errors.username = "Usuario requerido.";
    else input.username = username;
  }

  if (payload.email !== undefined) {
    const email = normalizeString(payload.email)?.toLowerCase();
    if (!email || !email.includes("@")) errors.email = "Correo inválido.";
    else input.email = email;
  }

  if (payload.fullName !== undefined) {
    const fullName = normalizeString(payload.fullName);
    if (!fullName) errors.fullName = "Nombre requerido.";
    else input.fullName = fullName;
  }

  if (payload.password !== undefined) {
    const password = normalizeString(payload.password);
    if (!password) errors.password = "Contraseña requerida.";
    else input.password = password;
  }

  if (payload.active !== undefined) {
    input.active = normalizeBoolean(payload.active, true);
  }

  if (payload.permissions !== undefined) {
    const permissions = normalizePermissions(payload.permissions);
    if (permissions.length === 0) errors.permissions = "Debe seleccionar al menos un módulo.";
    else input.permissions = permissions;
  }

  if (Object.keys(errors).length > 0) throw badRequest("Datos del usuario no válidos.", errors);
  if (Object.keys(input).length === 0) throw badRequest("Debe informar al menos un campo para actualizar.");

  return input;
}
