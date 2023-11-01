declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string;
      NODE_ENV: string;
      DATABASE_URL: string;
      POLYGON_ID_ISSUER_API_URL: string;
      POLYGON_ID_ISSUER_API_USERNAME: string;
      POLYGON_ID_ISSUER_API_PASSWORD: string;
      POLYGON_ID_ISSUER_DID: string;
      POLYGON_ID_SCHEMA_ID: string;
      ADMIN_API_SECRET: string;
      DEFAULT_RPC: string;
    }
  }
}
export {};
