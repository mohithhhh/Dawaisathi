// Supabase disabled — mock client (no-auth mode)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const noopAuth: any = {
  getSession: async () => ({ data: { session: null }, error: null }),
  onAuthStateChange: (_cb: unknown) => ({ data: { subscription: { unsubscribe: () => {} } } }),
  signOut: async () => ({ error: null }),
  signInWithOtp: async () => ({ error: { message: "Auth not configured" } }),
  verifyOtp: async () => ({ data: { session: null }, error: { message: "Auth not configured" } }),
};

export function createClient() {
  return { auth: noopAuth };
}
