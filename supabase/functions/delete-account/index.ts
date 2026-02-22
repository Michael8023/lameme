import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type DeleteBody = {
  confirmNickname?: string;
};

const json = (status: number, data: Record<string, unknown>) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });

const isMissingTableError = (message: string) => {
  const msg = message.toLowerCase();
  return msg.includes("does not exist") || msg.includes("42p01");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(200, { ok: true });
  if (req.method !== "POST") return json(405, { code: "METHOD_NOT_ALLOWED", message: "Use POST." });

  const url = Deno.env.get("SB_URL");
  const serviceRoleKey = Deno.env.get("SB_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    return json(500, {
      code: "SERVER_CONFIG_ERROR",
      message: "Missing SB_URL or SB_SERVICE_ROLE_KEY.",
    });
  }

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return json(401, { code: "MISSING_AUTH", message: "Missing authorization header." });
  }
  const accessToken = authHeader.slice(7).trim();

  let body: DeleteBody;
  try {
    body = await req.json();
  } catch {
    return json(400, { code: "INVALID_JSON", message: "Request body must be valid JSON." });
  }

  const confirmNickname = String(body.confirmNickname ?? "").trim();
  if (!confirmNickname) {
    return json(400, { code: "MISSING_NICKNAME", message: "confirmNickname is required." });
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return json(401, {
      code: "INVALID_TOKEN",
      message: userError?.message ?? "Invalid access token.",
    });
  }

  const userId = userData.user.id;

  const { data: profileRow, error: profileErr } = await admin
    .from("profiles")
    .select("nickname")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileErr) {
    return json(500, { code: "PROFILE_READ_FAILED", message: profileErr.message });
  }

  const nickname = String(profileRow?.nickname ?? "").trim();
  if (!nickname) {
    return json(400, {
      code: "NICKNAME_NOT_SET",
      message: "Please set nickname before account deletion.",
    });
  }

  if (confirmNickname !== nickname) {
    return json(400, { code: "NICKNAME_MISMATCH", message: "Nickname does not match." });
  }

  // Cleanup required tables first.
  const requiredCleanup = [
    await admin.from("poop_records").delete().eq("user_id", userId),
    await admin.from("user_settings").delete().eq("user_id", userId),
    await admin.from("profiles").delete().eq("user_id", userId),
  ];
  const requiredErr = requiredCleanup.find((r) => r.error);
  if (requiredErr?.error) {
    return json(500, {
      code: "CLEANUP_FAILED",
      message: requiredErr.error.message,
    });
  }

  // Optional tables: skip if table is not created in current schema.
  const optionalCleanup = [
    await admin.from("invite_code_usages").delete().eq("user_id", userId),
    await admin.from("invite_codes").update({ created_by: null }).eq("created_by", userId),
  ];

  const optionalErr = optionalCleanup.find(
    (r) => r.error && !isMissingTableError(r.error.message)
  );
  if (optionalErr?.error) {
    return json(500, {
      code: "CLEANUP_FAILED",
      message: optionalErr.error.message,
    });
  }

  const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
  if (deleteErr) {
    return json(500, { code: "DELETE_USER_FAILED", message: deleteErr.message });
  }

  return json(200, {
    code: "OK",
    message: "Account deleted successfully.",
  });
});
