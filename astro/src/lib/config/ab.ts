function optionalEnv(key: string, fallback = ''): string {
  return (import.meta.env[key] as string | undefined) ?? fallback;
}

export const siConfig = {
  baseUrl: optionalEnv('SI_API_BASE_URL', 'https://api.superliga.dk'),
  get accessToken() {
    const v = import.meta.env.SI_ACCESS_TOKEN as string | undefined;
    if (!v) throw new Error('Missing SI_ACCESS_TOKEN');
    return v;
  },
} as const;

export const abConfig = {
  teamId: Number(optionalEnv('AB_TEAM_ID', '9805')),
  tournamentId: optionalEnv('AB_TOURNAMENT_ID') ? Number(import.meta.env.AB_TOURNAMENT_ID) : null,
  seasonId: optionalEnv('AB_SEASON_ID') ? Number(import.meta.env.AB_SEASON_ID) : null,
} as const;
