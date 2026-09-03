import { countries } from "./countries";
import type { Country, ContinentId } from "./types";

export const byIso3 = (iso3: string): Country | undefined =>
  countries.find((c) => c.iso3.toLowerCase() === iso3.toLowerCase());

export const byMapId = (id: string): Country | undefined => countries.find((c) => c.id === id);

export const learnedIds = (learned: string[]) =>
  new Set(learned.map((i) => byIso3(i)?.id).filter(Boolean) as string[]);

export const filterByContinent = (continent: ContinentId | "all") =>
  continent === "all" ? countries : countries.filter((c) => c.continent === continent);

export const sortedCountries = [...countries].sort((a, b) => a.nameJa.localeCompare(b.nameJa, "ja"));
