function getEnv(name: string, aliases: string[] = []): string | undefined {
  if (process.env[name]) {
    return process.env[name];
  }

  for (const alias of aliases) {
    if (process.env[alias]) {
      return process.env[alias];
    }
  }

  return undefined;
}

export function getRequiredEnv(name: string, aliases: string[] = []): string {
  const value = getEnv(name, aliases);
  if (!value) {
    const aliasMessage = aliases.length ? ` (or legacy alias: ${aliases.join(', ')})` : '';
    throw new Error(`Missing required environment variable: ${name}${aliasMessage}`);
  }

  return value;
}

export const AUTH_SECRET = getRequiredEnv('AUTH_SECRET', ['NEXTAUTH_SECRET']);

export function getAdminMfaCookieSecret(): string {
  return process.env.ADMIN_MFA_COOKIE_SECRET || AUTH_SECRET;
}

export function getS3Config() {
  return {
    accessKeyId: getRequiredEnv('AWS_ACCESS_KEY_ID'),
    secretAccessKey: getRequiredEnv('AWS_SECRET_ACCESS_KEY'),
    region: getRequiredEnv('AWS_REGION'),
    bucket: getRequiredEnv('AWS_S3_BUCKET', ['AWS_BUCKET_NAME', 'AWS_S3_BUCKET_NAME']),
  };
}
