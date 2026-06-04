import { query } from "@/lib/db/pool";
import type { City } from "@/lib/domain/types";

type CityRow = {
  id: number;
  city_name: string;
};

export async function listCities(): Promise<City[]> {
  const result = await query<CityRow>(
    `SELECT id, city_name
     FROM cities
     ORDER BY CASE WHEN city_name = 'No definido' THEN 0 ELSE 1 END, city_name`,
  );

  return result.rows.map((row) => ({ id: row.id, name: row.city_name }));
}
