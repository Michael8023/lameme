import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getFunctionsBaseUrl, supabase } from "../lib/supabase";

type Mode = "login" | "register";

function sanitizeHeaderValue(raw: string | undefined) {
  return (raw ?? "")
    .trim()
    .replace(/^['"]+|['"]+$/g, "")
    .replace(/[\r\n\t]/g, "");
}

function isValidHeaderByteString(value: string) {
  return value.length > 0 && /^[\x20-\x7E\x80-\xFF]+$/.test(value);
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);
    if (error) {
      setMessage(`登录失败：${error.message}`);
      return;
    }

    navigate("/");
  };

  const handleRegister = async () => {
    setLoading(true);
    setMessage("");

    const base = getFunctionsBaseUrl();
    const anonKeyRaw = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
    const anonKey = sanitizeHeaderValue(anonKeyRaw);

    if (!base) {
      setLoading(false);
      setMessage("缺少 Supabase 环境变量，请配置 VITE_SUPABASE_URL。");
      return;
    }

    if (!anonKey) {
      setLoading(false);
      setMessage("缺少 Supabase 环境变量，请配置 VITE_SUPABASE_ANON_KEY。");
      return;
    }

    if (!isValidHeaderByteString(anonKey)) {
      setLoading(false);
      setMessage("VITE_SUPABASE_ANON_KEY 格式无效，请去掉引号、换行或特殊字符。");
      return;
    }

    let resp: Response;
    try {
      resp = await fetch(`${base}/beta-signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          nickname: nickname.trim(),
          inviteCode: inviteCode.trim(),
        }),
      });
    } catch (error) {
      setLoading(false);
      setMessage(`注册失败：${error instanceof Error ? error.message : "网络错误"}`);
      return;
    }

    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      setLoading(false);
      setMessage(`注册失败：${json?.message ?? "请检查邀请码或输入信息"}`);
      return;
    }

    const { error: loginErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);
    if (loginErr) {
      setMessage("注册成功，请返回登录。");
      setMode("login");
      return;
    }

    navigate("/");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (mode === "login") {
      await handleLogin();
    } else {
      await handleRegister();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/90 backdrop-blur rounded-3xl shadow-xl p-6 space-y-5"
      >
        <div className="text-center">
          <h1 className="text-2xl font-black text-amber-900">Lameme 内测</h1>
          <p className="text-sm text-amber-600 mt-1">邀请码注册后即可同步到云端</p>
        </div>

        <div className="grid grid-cols-2 bg-gray-100 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-lg py-2 text-sm font-medium ${mode === "login" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
          >
            登录
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`rounded-lg py-2 text-sm font-medium ${mode === "register" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
          >
            注册
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-amber-300 outline-none"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="密码（至少8位）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-amber-300 outline-none"
          />

          {mode === "register" && (
            <>
              <input
                type="text"
                placeholder="昵称（可选）"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-amber-300 outline-none"
              />
              <input
                type="text"
                required
                placeholder="邀请码"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-amber-300 outline-none"
              />
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold disabled:opacity-60"
          >
            {loading ? "处理中..." : mode === "login" ? "登录" : "注册并登录"}
          </button>
        </form>

        {message && <p className="text-sm text-center text-red-500">{message}</p>}
      </motion.div>
    </div>
  );
}
