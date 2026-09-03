import type { Country } from "./types";
import { asiaCountries } from "./countries/asia";
import { europeCountries } from "./countries/europe";
import { africaCountries } from "./countries/africa";
import { northAmericaCountries } from "./countries/northAmerica";
import { southAmericaCountries } from "./countries/southAmerica";
import { oceaniaCountries } from "./countries/oceania";

/**
 * 世界197か国の完全データセット。
 * 公式統計（世界銀行、IMF、外務省、国連等）および確固たる歴史年表に基づく。
 */
export const countries: Country[] = [
  ...asiaCountries,
  ...europeCountries,
  ...africaCountries,
  ...northAmericaCountries,
  ...southAmericaCountries,
  ...oceaniaCountries,
];

export const countryById = new Map(countries.map((c) => [c.id, c]));
export const countryByIso3 = new Map(countries.map((c) => [c.iso3, c]));
export const getCountry = (code: string) =>
  countryByIso3.get(code.toUpperCase()) ?? countryById.get(code);
