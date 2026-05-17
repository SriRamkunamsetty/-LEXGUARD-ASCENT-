import type { DecodedIdToken } from "firebase-admin/auth";

export type VerifyIdTokenFn = (token: string) => Promise<DecodedIdToken>;
