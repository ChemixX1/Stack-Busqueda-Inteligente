// ISO 3166-1 regions, including territories. Display names stay in the interface language.
const regionCodes = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
const regionNames = new Intl.DisplayNames(['es'], { type: 'region' });
export const countries: ReadonlyArray<readonly [string, string]> = [
  ['ALL', 'Todos los países'],
  ...regionCodes.map((code): [string, string] => [code, regionNames.of(code) || code]).sort((a, b) => a[1].localeCompare(b[1], 'es')),
];

export const specificCategories = [
  'Servicios digitales y SaaS',
  'Servicios técnicos y hogar',
  'Servicios profesionales',
  'Manga, anime y cómics',
  'Lectura, libros y novelas',
  'Foros y comunidades',
  'Videojuegos y comunidades',
  'Entretenimiento y streaming',
  'Medios, blogs y portales',
  'Arte, diseño y portafolios',
  'Comercio y tiendas',
  'Marketplaces y clasificados',
  'Empleo y talento',
  'Finanzas y seguros',
  'Industria, agro y logística',
  'Tecnología',
  'Educación',
  'Restaurantes',
  'Salud y bienestar',
  'Deportes y fitness',
  'Turismo y hoteles',
  'Inmobiliarias',
  'Construcción',
  'Automotriz',
  'Belleza',
  'ONGs y organizaciones',
  'Otros',
] as const;

export type SpecificCategory = (typeof specificCategories)[number];

export const categories: string[] = ['Todos los rubros', ...specificCategories];
export const countryName = (code: string) => countries.find(c => c[0] === code)?.[1] || code;
export const priority = (score: number | null) => score === null ? 'Sin evaluar' : score >= 65 ? 'Crítica' : score >= 35 ? 'Alta' : score >= 15 ? 'Media' : 'Baja';
