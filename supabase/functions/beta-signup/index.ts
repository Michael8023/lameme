import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type SignupBody = {
  email?: string;
  password?: string;
  nickname?: string;
  inviteCode?: string;
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

const isEmail = (v: string) => /.+@.+\..+/.test(v);

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

  let body: SignupBody;
  try {
    body = await req.json();
  } catch {
    return json(400, { code: "INVALID_JSON", message: "Request body must be valid JSON." });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "").trim();
  const nickname = String(body.nickname ?? "").trim();
  const inviteCode = String(body.inviteCode ?? "").trim();

  if (!email || !password || !inviteCode) {
    return json(400, {
      code: "MISSING_FIELDS",
      message: "email, password and inviteCode are required.",
    });
  }

  if (!isEmail(email)) {
    return json(400, { code: "INVALID_EMAIL", message: "Invalid email format." });
  }

  if (password.length < 8) {
    return json(400, { code: "WEAK_PASSWORD", message: "Password must be at least 8 chars." });
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) Basic invite code pre-check.
  const { data: inviteRow, error: inviteErr } = await admin
    .from("invite_codes")
    .select("code, enabled, max_uses, used_count, expires_at")
    .eq("code", inviteCode)
    .maybeSingle();

  if (inviteErr) {
    return json(500, { code: "INVITE_CHECK_FAILED", message: inviteErr.message });
  }

  if (!inviteRow || !inviteRow.enabled) {
    return json(400, { code: "INVITE_INVALID", message: "Invite code is invalid." });
  }

  if (inviteRow.expires_at && new Date(inviteRow.expires_at).getTime() < Date.now()) {
    return json(400, { code: "INVITE_EXPIRED", message: "Invite code is expired." });
  }

  if (inviteRow.used_count >= inviteRow.max_uses) {
    return json(400, { code: "INVITE_USED_UP", message: "Invite code has reached max uses." });
  }

  // 2) Create auth user.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nickname },
  });

  if (createErr || !created.user) {
    return json(400, {
      code: "CREATE_USER_FAILED",
      message: createErr?.message ?? "Unable to create user.",
    });
  }

  const userId = created.user.id;

  // 3) Atomically redeem invite code by SQL function.
  const { data: redeemed, error: redeemErr } = await admin.rpc("redeem_invite_code", {
    p_code: inviteCode,
    p_user_id: userId,
  });

  // Compatibility note:
  // `redeem_invite_code` may return boolean, json, or void depending on SQL definition.
  // Treat explicit `false` as failure; treat null/void as success when no error is thrown.
  if (redeemErr || redeemed === false) {
    // rollback auth user if invite redeem fails
    await admin.auth.admin.deleteUser(userId);
    return json(400, {
      code: "INVITE_REDEEM_FAILED",
      message: redeemErr?.message ?? "Failed to redeem invite code.",
    });
  }

  // 4) Ensure profile/settings exist (in case DB trigger is missing).
  const { error: profileErr } = await admin.from("profiles").upsert(
    {
      user_id: userId,
      nickname,
    },
    { onConflict: "user_id" }
  );

  const { error: settingsErr } = await admin.from("user_settings").upsert(
    {
      user_id: userId,
      hourly_salary: 1,
    },
    { onConflict: "user_id" }
  );

  if (profileErr || settingsErr) {
    return json(500, {
      code: "INIT_USER_DATA_FAILED",
      message: profileErr?.message ?? settingsErr?.message ?? "Init profile/settings failed.",
    });
  }

  return json(200, {
    code: "OK",
    message: "Signup succeeded.",
    data: {
      userId,
      email,
      nickname,
    },
  });
});

