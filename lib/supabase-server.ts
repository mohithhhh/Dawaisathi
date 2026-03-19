// Supabase disabled — mock server client (no-auth mode)
export function createServerSupabaseClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
          order: () => ({ limit: async () => ({ data: [], error: null }) }),
        }),
      }),
      insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }), then: () => Promise.resolve({ error: null }) }),
      update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
    }),
  };
}
