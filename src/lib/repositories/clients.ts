import { query } from "@/lib/db/pool";
import type { Client } from "@/lib/domain/types";
import { conflict, notFound } from "@/lib/http/errors";
import type {
  CreateClientInput,
  UpdateClientInput,
} from "@/lib/validation/clients";

type ClientRow = {
  id: string;
  company_name: string;
  business_name: string;
  document_number: string;
  document_type_id: number;
  document_type_name: string;
  phone_number: string;
  city_id: number;
  city_name: string;
  email: string | null;
  created_at: Date;
  updated_at: Date;
};

function mapClient(row: ClientRow): Client {
  return {
    id: row.id,
    companyName: row.company_name,
    businessName: row.business_name,
    documentNumber: row.document_number,
    documentTypeId: row.document_type_id,
    documentTypeName: row.document_type_name,
    phoneNumber: row.phone_number,
    cityId: row.city_id,
    cityName: row.city_name,
    email: row.email,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function isPgError(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error;
}

export async function listClients(search?: string) {
  const value = search?.trim();
  const result = await query<ClientRow>(
    `
      SELECT c.id, c.company_name, c.business_name, c.document_number,
        c.document_type_id, dt.document_type AS document_type_name,
        c.phone_number, c.city_id, city.city_name, c.email, c.created_at, c.updated_at
      FROM clients c
      JOIN document_types dt ON dt.id = c.document_type_id
      JOIN cities city ON city.id = c.city_id
      ${value ? "WHERE c.company_name ILIKE $1 OR c.business_name ILIKE $1 OR c.document_number ILIKE $1 OR dt.document_type ILIKE $1 OR city.city_name ILIKE $1 OR c.email ILIKE $1" : ""}
      ORDER BY c.company_name ASC
    `,
    value ? [`%${value}%`] : [],
  );

  return result.rows.map(mapClient);
}

export async function getClientById(id: string) {
  const result = await query<ClientRow>(
    `
      SELECT c.id, c.company_name, c.business_name, c.document_number,
        c.document_type_id, dt.document_type AS document_type_name,
        c.phone_number, c.city_id, city.city_name, c.email, c.created_at, c.updated_at
      FROM clients c
      JOIN document_types dt ON dt.id = c.document_type_id
      JOIN cities city ON city.id = c.city_id
      WHERE c.id = $1
    `,
    [id],
  );

  if (!result.rows[0]) throw notFound("Cliente no encontrado.");

  return mapClient(result.rows[0]);
}

export async function createClient(input: CreateClientInput) {
  try {
    const result = await query<ClientRow>(
      `
        WITH inserted AS (
          INSERT INTO clients (
            company_name, business_name, document_number, document_type_id, phone_number,
            city_id, email
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        )
        SELECT i.id, i.company_name, i.business_name, i.document_number,
          i.document_type_id, dt.document_type AS document_type_name,
          i.phone_number, i.city_id, city.city_name, i.email, i.created_at, i.updated_at
        FROM inserted i
        JOIN document_types dt ON dt.id = i.document_type_id
        JOIN cities city ON city.id = i.city_id
      `,
      [
        input.companyName,
        input.businessName,
        input.documentNumber,
        input.documentTypeId,
        input.phoneNumber,
        input.cityId,
        input.email,
      ],
    );

    return mapClient(result.rows[0]);
  } catch (error) {
    if (isPgError(error) && error.code === "23505") {
      throw conflict("A client with this document type and number already exists.");
    }
    throw error;
  }
}

export async function updateClient(id: string, input: UpdateClientInput) {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [field, column] of [
    ["companyName", "company_name"],
    ["businessName", "business_name"],
    ["documentNumber", "document_number"],
    ["documentTypeId", "document_type_id"],
    ["phoneNumber", "phone_number"],
    ["cityId", "city_id"],
    ["email", "email"],
  ] as const) {
    if (input[field] === undefined) continue;
    values.push(input[field]);
    assignments.push(`${column} = $${values.length}`);
  }

  values.push(id);

  try {
    const result = await query<ClientRow>(
      `
        WITH updated AS (
          UPDATE clients
          SET ${assignments.join(", ")}
          WHERE id = $${values.length}
          RETURNING *
        )
        SELECT u.id, u.company_name, u.business_name, u.document_number,
          u.document_type_id, dt.document_type AS document_type_name,
          u.phone_number, u.city_id, city.city_name, u.email, u.created_at, u.updated_at
        FROM updated u
        JOIN document_types dt ON dt.id = u.document_type_id
        JOIN cities city ON city.id = u.city_id
      `,
      values,
    );

    if (!result.rows[0]) throw notFound("Cliente no encontrado.");

    if (input.businessName !== undefined) {
      await query(
        "UPDATE transport_requests SET client_name = $1 WHERE client_id = $2",
        [input.businessName, id],
      );
    }

    return mapClient(result.rows[0]);
  } catch (error) {
    if (isPgError(error) && error.code === "23505") {
      throw conflict("A client with this document type and number already exists.");
    }
    throw error;
  }
}

export async function deleteClient(id: string) {
  try {
    const result = await query<{ id: string }>(
      "DELETE FROM clients WHERE id = $1 RETURNING id",
      [id],
    );

    if (!result.rows[0]) throw notFound("Cliente no encontrado.");
  } catch (error) {
    if (isPgError(error) && error.code === "23503") {
      throw conflict("El cliente no puede eliminarse porque tiene solicitudes logísticas asociadas.");
    }
    throw error;
  }
}
