import "server-only";

import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env";

/**
 * Service-role client — bypasses Row Level Security.
 * Only for trusted server-side work (seeding, aggregate recalculation, admin
 * routes). Never pass user-supplied filters straight into a query made with it.
 */
export function createAdminClient() {
  return createClient(publicEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
