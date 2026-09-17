import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // Handle CORS preflight options request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Authenticate caller using Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anonClient = createClient(supabaseUrl, anonKey || serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser }, error: callerAuthErr } = await anonClient.auth.getUser();

    if (callerAuthErr || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid authentication session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Admin verification via Service Role client
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role, is_active")
      .or(`id.eq.${callerUser.id},user_id.eq.${callerUser.id}`)
      .maybeSingle();

    const isCallerAdmin = callerProfile && callerProfile.is_active !== false && ["admin", "owner"].includes(callerProfile.role);

    if (!isCallerAdmin) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Only active admin users can create or manage staff accounts" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Parse Request Body
    const body = await req.json();
    const action = body.action || "create";

    // ACTION 1: CREATE STAFF ACCOUNT
    if (action === "create") {
      const email = (body.email || "").trim().toLowerCase();
      const password = (body.password || "").trim();
      const fullName = (body.full_name || "").trim();
      const role = body.role || "billing_staff";
      const branch = body.branch || "Trichy - Sandhukadai";
      const phone = body.phone || "";

      if (!email || !fullName || !password) {
        return new Response(
          JSON.stringify({ error: "Full Name, Email Address, and Initial Password are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (password.length < 6) {
        return new Response(
          JSON.stringify({ error: "Password must be at least 6 characters long" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Call Supabase Admin Auth API to create Auth user with auto email confirmation
      const { data: authData, error: createAuthErr } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role, branch },
      });

      if (createAuthErr) {
        let errorMsg = createAuthErr.message;
        let statusCode = 400;

        if (errorMsg.toLowerCase().includes("already registered") || errorMsg.toLowerCase().includes("already exists")) {
          errorMsg = "A user with this email address already exists.";
        } else if (errorMsg.toLowerCase().includes("rate limit") || createAuthErr.status === 429) {
          errorMsg = "Too many requests. Please wait and try again.";
          statusCode = 429;
        }

        return new Response(
          JSON.stringify({ error: errorMsg }),
          { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const newAuthUser = authData.user;

      // Create / Upsert Profile Record using actual Auth User ID
      const profilePayload = {
        id: newAuthUser.id,
        user_id: newAuthUser.id,
        full_name: fullName,
        email,
        phone,
        role,
        branch,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: createdProfile, error: profileErr } = await adminClient
        .from("profiles")
        .upsert(profilePayload, { onConflict: "user_id" })
        .select()
        .single();

      // Rollback safety: Delete Auth User if profile creation fails
      if (profileErr) {
        console.error("Profile upsert failed, rolling back Auth user:", profileErr);
        await adminClient.auth.admin.deleteUser(newAuthUser.id);
        return new Response(
          JSON.stringify({ error: `Failed to create profile record: ${profileErr.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          user: createdProfile || profilePayload,
          message: `Staff account for ${fullName} (${email}) created successfully.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION 2: UPDATE STAFF PASSWORD BY ADMIN
    if (action === "update_password") {
      const targetUserId = body.user_id;
      const newPassword = (body.password || "").trim();

      if (!targetUserId || !newPassword) {
        return new Response(
          JSON.stringify({ error: "User ID and New Password are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (newPassword.length < 6) {
        return new Response(
          JSON.stringify({ error: "Password must be at least 6 characters long" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateErr } = await adminClient.auth.admin.updateUserById(targetUserId, {
        password: newPassword,
      });

      if (updateErr) {
        return new Response(
          JSON.stringify({ error: `Failed to update password: ${updateErr.message}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Staff password updated successfully." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION 3: DELETE STAFF USER BY ADMIN
    if (action === "delete_user") {
      const targetUserId = body.user_id;
      if (!targetUserId) {
        return new Response(
          JSON.stringify({ error: "User ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if trying to delete owner
      const { data: targetProfile } = await adminClient
        .from("profiles")
        .select("email, role")
        .or(`id.eq.${targetUserId},user_id.eq.${targetUserId}`)
        .maybeSingle();

      if (targetProfile && targetProfile.email.toLowerCase().includes("owner")) {
        return new Response(
          JSON.stringify({ error: "Cannot delete the primary Owner / Admin account." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete from profiles
      await adminClient.from("profiles").delete().or(`id.eq.${targetUserId},user_id.eq.${targetUserId}`);

      // Delete from Supabase Auth
      const { error: deleteAuthErr } = await adminClient.auth.admin.deleteUser(targetUserId);

      if (deleteAuthErr) {
        console.warn("Auth user delete warning:", deleteAuthErr);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Staff user account deleted successfully." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action requested" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
