import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper: always return 200 with { error } so supabase.functions.invoke can parse it
function errorResponse(msg: string) {
  return new Response(JSON.stringify({ error: msg }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function okResponse(data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("No authorization header");
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return errorResponse("Unauthorized");
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return errorResponse("Admin access required");
    }

    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { email, password, username, full_name, role } = body;

      // Validate required fields
      if (!email || !password || !username || !full_name || !role) {
        return errorResponse("Todos os campos são obrigatórios");
      }

      // Validate role
      if (!["admin", "gerente", "operador"].includes(role)) {
        return errorResponse("Role inválida. Use: admin, gerente ou operador");
      }

      // Check if username already exists
      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();

      if (existingProfile) {
        return errorResponse("Username já está em uso. Escolha outro.");
      }

      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username, full_name },
      });

      if (authError) {
        const msg = authError.message || "Erro ao criar usuário";
        if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("duplicate")) {
          return errorResponse("Este e-mail já está cadastrado.");
        }
        return errorResponse(msg);
      }

      // Assign role
      const { error: roleError } = await adminClient
        .from("user_roles")
        .upsert({ user_id: authData.user.id, role }, { onConflict: "user_id" });

      if (roleError) {
        return errorResponse(roleError.message);
      }

      return okResponse({ message: "User created", userId: authData.user.id });
    }

    if (action === "update") {
      const { userId, email, password, username, full_name, role } = body;

      const updateData: any = { user_metadata: { username, full_name } };
      if (email) updateData.email = email;
      if (password) updateData.password = password;

      const { error: authError } = await adminClient.auth.admin.updateUserById(userId, updateData);
      if (authError) {
        return errorResponse(authError.message);
      }

      await adminClient
        .from("profiles")
        .update({ username, full_name })
        .eq("id", userId);

      await adminClient
        .from("user_roles")
        .upsert({ user_id: userId, role }, { onConflict: "user_id" });

      return okResponse({ message: "User updated" });
    }

    if (action === "delete") {
      const { userId } = body;

      if (userId === caller.id) {
        return errorResponse("Não é possível deletar a si mesmo");
      }

      const { error: authError } = await adminClient.auth.admin.deleteUser(userId);
      if (authError) {
        return errorResponse(authError.message);
      }

      return okResponse({ message: "User deleted" });
    }

    if (action === "list") {
      const { data: profiles, error } = await adminClient
        .from("profiles")
        .select("id, username, full_name, created_at");

      if (error) {
        return errorResponse(error.message);
      }

      const { data: roles } = await adminClient
        .from("user_roles")
        .select("user_id, role");

      const roleMap: Record<string, string> = {};
      roles?.forEach((r: any) => { roleMap[r.user_id] = r.role; });

      const users = profiles?.map((p: any) => ({
        ...p,
        role: roleMap[p.id] || "operador",
      }));

      return okResponse({ users });
    }

    return errorResponse("Invalid action");
  } catch (error) {
    return errorResponse(error.message || "Erro interno do servidor");
  }
});
