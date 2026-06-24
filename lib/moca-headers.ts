// Header names shared between the browser client and the API routes.
// Kept in a dependency-free module so it is safe to import from client code
// (importing from anthropic.ts would pull the SDK into the browser bundle).

/** Per-client Anthropic key forwarded from the Moca Hub session. */
export const ANTHROPIC_KEY_HEADER = "x-moca-anthropic-key";
/** Moca client id from the validated session (scopes persisted data). */
export const MOCA_CLIENT_HEADER = "x-moca-client-id";
/** Moca user id from the validated session. */
export const MOCA_USER_HEADER = "x-moca-user-id";
