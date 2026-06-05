import type { QueryResultRow } from "pg";
import { query, withTransaction } from "@/lib/db/pool";
import type { AppModulePermission, AppUser } from "@/lib/domain/types";
import { conflict, notFound } from "@/lib/http/errors";
import { hashPassword, verifyPassword } from "@/lib/auth/passwords";
import type { CreateUserInput, LoginInput, UpdateUserInput } from "@/lib/validation/users";

type UserRow = QueryResultRow & {
  id: string;
  username: string;
  email: string;
  full_name: string;
  password_hash?: string;
  superuser: boolean;
  active: boolean;
  permissions: AppModulePermission[] | null;
  created_at: Date;
  updated_at: Date;
};

function mapUser(row: UserRow): AppUser {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    fullName: row.full_name,
    superuser: row.superuser,
    active: row.active,
    permissions: row.superuser
      ? ["logistics", "fleet", "users"]
      : row.permissions ?? [],
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function isPgError(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error;
}

function userSelect() {
  return `
    SELECT u.id, u.username, u.email, u.full_name, u.superuser, u.active,
      COALESCE(
        ARRAY_AGG(p.module_key ORDER BY p.module_key)
          FILTER (WHERE p.module_key IS NOT NULL),
        ARRAY[]::varchar[]
      )::varchar[] AS permissions,
      u.created_at, u.updated_at
    FROM app_users u
    LEFT JOIN app_user_permissions p ON p.user_id = u.id
  `;
}

export async function listUsers() {
  const result = await query<UserRow>(
    `
      ${userSelect()}
      GROUP BY u.id
      ORDER BY u.superuser DESC, u.created_at DESC
    `,
  );

  return result.rows.map(mapUser);
}

export async function getUserById(id: string) {
  const result = await query<UserRow>(
    `
      ${userSelect()}
      WHERE u.id = $1
      GROUP BY u.id
    `,
    [id],
  );

  const user = result.rows[0];
  if (!user) throw notFound("Usuario no encontrado.");

  return mapUser(user);
}

export async function loginUser(input: LoginInput) {
  const result = await query<UserRow>(
    `
      SELECT u.id, u.username, u.email, u.full_name, u.password_hash, u.superuser, u.active,
        COALESCE(
          ARRAY_AGG(p.module_key ORDER BY p.module_key)
            FILTER (WHERE p.module_key IS NOT NULL),
          ARRAY[]::varchar[]
        )::varchar[] AS permissions,
        u.created_at, u.updated_at
      FROM app_users u
      LEFT JOIN app_user_permissions p ON p.user_id = u.id
      WHERE lower(u.username) = lower($1) OR lower(u.email) = lower($1)
      GROUP BY u.id
    `,
    [input.identifier],
  );

  const user = result.rows[0];
  if (!user || !user.active || !user.password_hash || !verifyPassword(input.password, user.password_hash)) {
    throw conflict("Usuario o contraseña inválidos.");
  }

  return mapUser(user);
}

export async function createUser(input: CreateUserInput) {
  try {
    const userId = await withTransaction(async (client) => {
      const result = await client.query<UserRow>(
        `
          INSERT INTO app_users (username, email, full_name, password_hash, active)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, username, email, full_name, superuser, active,
            ARRAY[]::varchar[] AS permissions, created_at, updated_at
        `,
        [
          input.username,
          input.email,
          input.fullName,
          hashPassword(input.password),
          input.active,
        ],
      );
      const user = result.rows[0];

      await Promise.all(
        input.permissions.map((permission) =>
          client.query(
            "INSERT INTO app_user_permissions (user_id, module_key) VALUES ($1, $2)",
            [user.id, permission],
          ),
        ),
      );

      return user.id;
    });

    return getUserById(userId);
  } catch (error) {
    if (isPgError(error) && error.code === "23505") {
      throw conflict("Ya existe un usuario con ese usuario o correo.");
    }
    throw error;
  }
}

export async function updateUser(id: string, input: UpdateUserInput) {
  await withTransaction(async (client) => {
    const currentResult = await client.query<{ username: string; superuser: boolean }>(
      "SELECT username, superuser FROM app_users WHERE id = $1 FOR UPDATE",
      [id],
    );
    const current = currentResult.rows[0];
    if (!current) throw notFound("Usuario no encontrado.");

    if (current.superuser) {
      if (input.active === false || input.permissions !== undefined || input.username !== undefined) {
        throw conflict("El usuario admin no puede perder permisos, desactivarse ni cambiar de usuario.");
      }
    }

    const assignments: string[] = [];
    const values: unknown[] = [];
    const addAssignment = (column: string, value: unknown) => {
      values.push(value);
      assignments.push(`${column} = $${values.length}`);
    };

    if (input.username !== undefined) addAssignment("username", input.username);
    if (input.email !== undefined) addAssignment("email", input.email);
    if (input.fullName !== undefined) addAssignment("full_name", input.fullName);
    if (input.password !== undefined) addAssignment("password_hash", hashPassword(input.password));
    if (input.active !== undefined) addAssignment("active", input.active);

    try {
      if (assignments.length > 0) {
        values.push(id);
        await client.query(
          `UPDATE app_users SET ${assignments.join(", ")} WHERE id = $${values.length}`,
          values,
        );
      }

      if (input.permissions !== undefined) {
        await client.query("DELETE FROM app_user_permissions WHERE user_id = $1", [id]);
        await Promise.all(
          input.permissions.map((permission) =>
            client.query(
              "INSERT INTO app_user_permissions (user_id, module_key) VALUES ($1, $2)",
              [id, permission],
            ),
          ),
        );
      }
    } catch (error) {
      if (isPgError(error) && error.code === "23505") {
        throw conflict("Ya existe un usuario con ese usuario o correo.");
      }
      throw error;
    }

  });

  return getUserById(id);
}

export async function deleteUser(id: string) {
  return withTransaction(async (client) => {
    const currentResult = await client.query<{ superuser: boolean }>(
      "SELECT superuser FROM app_users WHERE id = $1 FOR UPDATE",
      [id],
    );
    const current = currentResult.rows[0];
    if (!current) throw notFound("Usuario no encontrado.");
    if (current.superuser) throw conflict("El usuario admin no puede eliminarse.");

    await client.query("DELETE FROM app_users WHERE id = $1", [id]);
  });
}
