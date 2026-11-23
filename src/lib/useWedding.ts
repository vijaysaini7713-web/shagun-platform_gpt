import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Role = "wedding_owner" | "bride_admin" | "groom_admin" | "finance" | "counter_staff";
export const roleLabel: Record<Role, string> = {
  wedding_owner: "Wedding owner",
  bride_admin: "Bride side admin",
  groom_admin: "Groom side admin",
  finance: "Finance",
  counter_staff: "Counter staff",
};

export function useMyRoles(weddingId: string) {
  return useQuery({
    queryKey: ["roles", weddingId],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data: w } = await supabase.from("weddings").select("*").eq("id", weddingId).maybeSingle();
      if (!w) return { wedding: null, roles: [] as Role[] };
      const { data: m } = await supabase.from("wedding_members").select("role").eq("wedding_id", weddingId).eq("user_id", u.user!.id);
      const { data: t } = await supabase.from("tenants").select("id").eq("id", w.tenant_id).maybeSingle();
      const roles = new Set<Role>((m ?? []).map((r) => r.role as Role));
      if (t) roles.add("wedding_owner"); // tenant owner
      return { wedding: w, roles: [...roles] };
    },
  });
}