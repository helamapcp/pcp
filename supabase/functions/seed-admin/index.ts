import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if admin already exists
    const { data: existingProfiles } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("username", "admin")
      .maybeSingle();

    if (existingProfiles) {
      return new Response(
        JSON.stringify({ message: "Admin user already exists", userId: existingProfiles.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin user in auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: "admin@pvc-pcp.local",
      password: "admin_password_2026",
      email_confirm: true,
      user_metadata: {
        username: "admin",
        full_name: "Super Admin",
      },
    });

    if (authError) {
      throw new Error(`Auth error: ${authError.message}`);
    }

    const userId = authData.user.id;

    // Assign admin role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });

    if (roleError) {
      throw new Error(`Role error: ${roleError.message}`);
    }

    // Seed default categories
    const defaultCategories = [
      "Resinas",
      "Cargas/Aditivos",
      "Pigmentos",
      "Capstock",
      "Produção (PMP)",
      "Sucata",
    ];

    const { data: categories, error: catError } = await supabase
      .from("categories")
      .upsert(
        defaultCategories.map((name) => ({ name })),
        { onConflict: "name" }
      )
      .select();

    if (catError) {
      console.error("Category seed error:", catError);
    }

    // Seed default products
    if (categories && categories.length > 0) {
      const catMap: Record<string, string> = {};
      categories.forEach((c: any) => { catMap[c.name] = c.id; });

      const defaultProducts = [
        { name: "Resina SP 750 PRIME", category: "Resinas", weight: 1250 },
        { name: "Resina SP 750 OFF", category: "Resinas", weight: 1250 },
        { name: "SP-90", category: "Resinas", weight: 1250 },
        { name: "Dióxido de Titânio", category: "Cargas/Aditivos", weight: 25 },
        { name: "Micron 1/9 CD", category: "Cargas/Aditivos", weight: 1250 },
        { name: "CPE", category: "Cargas/Aditivos", weight: 500 },
        { name: "Estearato de calcio Ceasit Chemson", category: "Cargas/Aditivos", weight: 500 },
        { name: "Carbonato Ouro Branco", category: "Cargas/Aditivos", weight: 1250 },
        { name: "CZ1856 P12", category: "Cargas/Aditivos", weight: 500 },
        { name: "CZ1290 B", category: "Cargas/Aditivos", weight: 500 },
        { name: "Estearina L-12", category: "Cargas/Aditivos", weight: 500 },
        { name: "Cera SP 15", category: "Cargas/Aditivos", weight: 500 },
        { name: "CZP 754", category: "Cargas/Aditivos", weight: 500 },
        { name: "Drapex", category: "Cargas/Aditivos", weight: 500 },
        { name: "LP 40", category: "Cargas/Aditivos", weight: 500 },
        { name: "Colormatch Ochre", category: "Pigmentos", weight: 25 },
        { name: "Colormatch Blue", category: "Pigmentos", weight: 25 },
        { name: "Pigmento Liquido Ochre", category: "Pigmentos", weight: 200 },
        { name: "Pigmento Liquido Cinza", category: "Pigmentos", weight: 200 },
        { name: "Pigmento Liquido Marfim", category: "Pigmentos", weight: 200 },
        { name: "Capstock Terracota Remo", category: "Capstock", weight: 1250 },
        { name: "Capstock Marfim Remo", category: "Capstock", weight: 1250 },
        { name: "Capstock Branco Remo", category: "Capstock", weight: 1250 },
        { name: "Composto Telha", category: "Produção (PMP)", weight: 1250 },
        { name: "Composto Forro", category: "Produção (PMP)", weight: 1250 },
        { name: "Varredura", category: "Sucata", weight: 1 },
      ];

      const { error: prodError } = await supabase.from("products").insert(
        defaultProducts.map((p) => ({
          name: p.name,
          category_id: catMap[p.category] || null,
          unit_weight_kg: p.weight,
        }))
      );

      if (prodError) {
        console.error("Product seed error:", prodError);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Admin user created and data seeded successfully",
        userId,
        credentials: { username: "admin@pvc-pcp.local", password: "admin_password_2026" },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
