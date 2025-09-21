export const cfg = {
  port: Number(process.env.PORT || 8081),
  mode: (process.env.DB_MODE || 'mem').toLowerCase(),
  payloadCap: Number(process.env.PAYLOAD_BYTES_CAP || 2048),
  ratePerMin: Number(process.env.API_RATE_PER_MIN || 120),
  jsonLimit: `${Number(process.env.JSON_LIMIT_BYTES || 8192)}b`, // 8KB default
};
