export const ENV = {
  appId: process.env.VITE_APP_ID ?? "ffm-manager",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  cronSecret: process.env.CRON_SECRET ?? "",
  s3: {
    endpoint: process.env.S3_ENDPOINT ?? "",
    region: process.env.S3_REGION ?? "auto",
    bucket: process.env.S3_BUCKET ?? "",
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL ?? "",
  },
};
