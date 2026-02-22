import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BadgeCheck,
  Download,
  FileSpreadsheet,
  LogOut,
  Pencil,
  RotateCcw,
  Trash2,
  UserCircle2,
  X,
} from "lucide-react";
import { HARDNESS_MAP } from "../types";
import { getFunctionsBaseUrl, supabase } from "../lib/supabase";
import { usePoopStore } from "../store";
import type { PoopRecord } from "../types";

type Medal = {
  id: string;
  icon: string;
  name: string;
  description: string;
  unlocked: boolean;
};

const CHART_WIDTH = 320;
const CHART_HEIGHT = 140;

function sanitizeHeaderValue(raw: string | undefined) {
  return (raw ?? "")
    .trim()
    .replace(/^['"]+|['"]+$/g, "")
    .replace(/[\r\n\t]/g, "");
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function getDateFromRecord(r: PoopRecord) {
  if (r.date) return r.date;
  if (r.beijingTime) return r.beijingTime.slice(0, 10);
  const d = new Date(r.startTime || Date.now());
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getHourFromRecord(r: PoopRecord) {
  if (r.beijingTime?.length >= 13) return Number(r.beijingTime.slice(11, 13));
  return new Date(r.startTime).getHours();
}

function pointForIndex(index: number, length: number, value: number, maxValue: number) {
  const x = (index / Math.max(1, length - 1)) * (CHART_WIDTH - 16) + 8;
  const y = CHART_HEIGHT - (value / Math.max(1, maxValue)) * (CHART_HEIGHT - 20) - 10;
  return { x, y };
}

function profileBy(records: PoopRecord[]) {
  if (!records.length) {
    return { emoji: "🧪", title: "待激活选手", desc: "记录达到 5 次后画像更准确" };
  }

  const avgHardness = records.reduce((s, r) => s + r.hardness, 0) / records.length;
  const avgSmooth = records.reduce((s, r) => s + r.smoothness, 0) / records.length;
  const avgDuration = records.reduce((s, r) => s + r.duration, 0) / records.length;

  if (avgHardness >= 5.1 || avgSmooth <= 2.2) {
    return { emoji: "🧱", title: "便秘型选手", desc: "质量偏硬或顺畅度偏低，建议补水+纤维" };
  }
  if (avgHardness <= 3.4 && avgSmooth >= 3.8 && avgDuration <= 360) {
    return { emoji: "🌊", title: "流畅型选手", desc: "速度与质量整体优秀，状态稳定" };
  }
  return { emoji: "⚖️", title: "平衡型选手", desc: "各项指标均衡，继续保持规律作息" };
}

function buildMedals(records: PoopRecord[]) {
  const total = records.length;
  const totalDuration = records.reduce((s, r) => s + r.duration, 0);
  const avgSmooth = total ? records.reduce((s, r) => s + r.smoothness, 0) / total : 0;
  const qualityRate = total
    ? (records.filter((r) => r.hardness >= 3 && r.hardness <= 5 && r.smoothness >= 3).length / total) * 100
    : 0;
  const months = new Set(records.map((r) => getDateFromRecord(r).slice(0, 7))).size;

  const medals: Medal[] = [
    { id: "rookie", icon: "🥉", name: "开坑新秀", description: "累计记录达到 10 次。", unlocked: total >= 10 },
    { id: "freq", icon: "🥇", name: "高频输出奖", description: "累计记录达到 120 次。", unlocked: total >= 120 },
    { id: "quality", icon: "🏅", name: "流畅王者", description: "质量达标率达到 70%。", unlocked: qualityRate >= 70 },
    { id: "smooth", icon: "💎", name: "丝滑大师", description: "平均顺畅度达到 4.2。", unlocked: avgSmooth >= 4.2 },
    { id: "endurance", icon: "⏳", name: "持久观察员", description: "总时长累计达到 20 小时。", unlocked: totalDuration >= 20 * 3600 },
    { id: "stable", icon: "🎖️", name: "稳定坚持奖", description: "活跃月份达到 8 个月。", unlocked: months >= 8 },
  ];

  return medals;
}

export default function MyPage() {
  const { records, profile, setProfile, clearRecords, cloudError, resetForSignOut } = usePoopStore();

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showOnlyUnlocked, setShowOnlyUnlocked] = useState(false);
  const [selectedMedal, setSelectedMedal] = useState<Medal | null>(null);
  const [draft, setDraft] = useState(profile);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteNickname, setDeleteNickname] = useState("");
  const [deleting, setDeleting] = useState(false);

  const today = new Date();
  const monthStart = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`;
  const monthEnd = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(
    new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  )}`;
  const [rangeStart, setRangeStart] = useState(monthStart);
  const [rangeEnd, setRangeEnd] = useState(monthEnd);

  const profileResult = useMemo(() => profileBy(records), [records]);
  const medals = useMemo(() => buildMedals(records), [records]);
  const medalsToShow = useMemo(
    () => (showOnlyUnlocked ? medals.filter((m) => m.unlocked) : medals),
    [medals, showOnlyUnlocked]
  );

  const filteredForAnalytics = useMemo(() => {
    const from = rangeStart <= rangeEnd ? rangeStart : rangeEnd;
    const to = rangeStart <= rangeEnd ? rangeEnd : rangeStart;

    return records.filter((r) => {
      const date = getDateFromRecord(r);
      return date >= from && date <= to;
    });
  }, [records, rangeStart, rangeEnd]);

  const analytics = useMemo(() => {
    const dateMap: Record<string, number> = {};
    filteredForAnalytics.forEach((r) => {
      const d = getDateFromRecord(r);
      dateMap[d] = (dateMap[d] || 0) + r.duration;
    });

    const durationSeries = Object.entries(dateMap)
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([date, duration]) => ({ date, duration }));

    const hourBins = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
    filteredForAnalytics.forEach((r) => {
      const h = Math.max(0, Math.min(23, getHourFromRecord(r)));
      hourBins[h].count += 1;
    });

    const qualityBars = HARDNESS_MAP.map((h) => ({
      level: h.level,
      name: h.name,
      emoji: h.emoji,
      count: filteredForAnalytics.filter((r) => r.hardness === h.level).length,
      color: h.color,
    }));

    return { durationSeries, hourBins, qualityBars };
  }, [filteredForAnalytics]);

  const lineChartData = useMemo(() => {
    const data = analytics.durationSeries;
    if (!data.length) return { path: "", points: [], max: 0 };

    const max = Math.max(...data.map((d) => d.duration), 1);
    const points = data.map((d, i) => {
      const p = pointForIndex(i, data.length, d.duration, max);
      return { ...p, date: d.date, duration: d.duration };
    });

    const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    return { path, points, max };
  }, [analytics.durationSeries]);

  const hourMax = useMemo(() => Math.max(...analytics.hourBins.map((v) => v.count), 1), [analytics.hourBins]);
  const qualityMax = useMemo(() => Math.max(...analytics.qualityBars.map((v) => v.count), 1), [analytics.qualityBars]);

  React.useEffect(() => {
    setDraft(profile);
  }, [profile]);

  const saveDraft = async () => {
    setSaving(true);
    setMessage("");
    try {
      await setProfile(draft);
      setMessage("个人资料已同步到云端");
      setShowEditModal(false);
    } catch (error) {
      setMessage(`保存失败：${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      setSaving(false);
    }
  };

  const onAvatarFile = async (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) return;
      setDraft((prev) => ({ ...prev, avatarUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const exportJson = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      timezone: "Asia/Shanghai",
      total: records.length,
      profile,
      records,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `poop-records-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const header = ["ID", "北京时间", "日期", "时长(秒)", "类型", "顺畅度", "地点", "心情", "备注"];
    const rows = records.map((r) => {
      const type = HARDNESS_MAP[r.hardness - 1]?.name || String(r.hardness);
      return [
        r.id,
        r.beijingTime || "",
        r.date,
        String(r.duration),
        type,
        String(r.smoothness),
        r.location,
        r.mood,
        (r.note || "").replace(/\n/g, " "),
      ];
    });

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `poop-records-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAll = async () => {
    if (!records.length) return;
    if (!window.confirm("确认清空所有云端记录吗？该操作不可恢复。")) return;

    setSaving(true);
    setMessage("");
    try {
      await clearRecords();
      setMessage("已清空云端记录");
    } catch (error) {
      setMessage(`清空失败：${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    resetForSignOut();
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setMessage("");
    try {
      if (!profile.nickname?.trim()) {
        throw new Error("当前账号未设置昵称，请先在资料里设置昵称后再注销");
      }

      const input = deleteNickname.trim();
      if (input !== profile.nickname.trim()) {
        throw new Error("昵称不匹配，已取消注销");
      }

      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      let accessToken = currentSession?.access_token ?? "";
      if (!accessToken) {
        const {
          data: { session: refreshedSession },
        } = await supabase.auth.refreshSession();
        accessToken = refreshedSession?.access_token ?? "";
      }

      if (!accessToken) {
        throw new Error("登录已过期，请重新登录后再注销账号");
      }

      const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
      if (userErr || !userData.user) {
        throw new Error("登录凭证无效，请重新登录后再注销账号");
      }

      const base = getFunctionsBaseUrl();
      const anonKey = sanitizeHeaderValue(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);
      if (!base || !anonKey) {
        throw new Error("缺少环境变量，请检查 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY");
      }

      const resp = await fetch(`${base}/delete-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ confirmNickname: input }),
      });

      const result = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const reason = result?.message || result?.code || `HTTP ${resp.status}`;
        throw new Error(String(reason));
      }

      await supabase.auth.signOut();
      resetForSignOut();
      setShowDeleteModal(false);
    } catch (error) {
      setMessage(`注销失败：${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-50 pb-24 relative overflow-hidden">
      <motion.div
        className="absolute -top-16 -left-10 w-44 h-44 rounded-full bg-amber-300/30 blur-2xl"
        animate={{ x: [0, 8, 0], y: [0, 6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-28 -right-10 w-36 h-36 rounded-full bg-yellow-300/30 blur-2xl"
        animate={{ x: [0, -10, 0], y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      <header className="px-4 pt-safe pt-6 pb-3 relative z-10">
        <h1 className="text-xl font-black text-rose-900">我的</h1>
        {/* <p className="text-sm text-rose-500">可爱版个人中心</p> */}
      </header>

      <div className="px-4 space-y-4 relative z-10">
        <section className="bg-white/90 backdrop-blur rounded-3xl p-4 shadow-sm border border-pink-100">
          <div className="flex items-start gap-3">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-rose-100 border border-rose-200 grid place-items-center shrink-0">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <UserCircle2 className="w-10 h-10 text-rose-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-rose-900 truncate">{profile.nickname || "未设置昵称"}</p>
              <p className="text-xs text-rose-500 mt-1">身高：{profile.heightCm ?? "-"} cm</p>
              <p className="text-xs text-rose-500">体重：{profile.weightKg ?? "-"} kg</p>
              <p className="text-xs text-rose-500">年龄：{profile.age ?? "-"}</p>
            </div>

            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="px-3 py-1.5 rounded-xl bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1"
            >
              <Pencil className="w-3.5 h-3.5" /> 编辑
            </button>
          </div>
        </section>

        <section className="bg-white/90 backdrop-blur rounded-3xl p-4 shadow-sm border border-fuchsia-100 text-center">
          <p className="text-xs text-fuchsia-500 tracking-[0.18em]">PROFILE</p>
          <motion.p
            className="text-2xl font-black mt-2 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-amber-500 bg-clip-text text-transparent"
            initial={{ opacity: 0.6, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {profileResult.emoji} {profileResult.title}
          </motion.p>
          <p className="text-sm text-slate-500 mt-1">{profileResult.desc}</p>
          <p className="text-xs text-slate-400 mt-2">累计记录：{records.length} 次</p>
        </section>

        <section className="bg-white/90 backdrop-blur rounded-3xl p-4 shadow-sm border border-pink-100 space-y-3">
          <p className="font-bold text-rose-900">统计图</p>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
              className="px-3 py-2 bg-rose-50 border border-rose-100 rounded-xl text-sm"
            />
            <input
              type="date"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
              className="px-3 py-2 bg-rose-50 border border-rose-100 rounded-xl text-sm"
            />
          </div>

          <div className="bg-rose-50 rounded-2xl p-3">
            <p className="text-sm font-bold text-rose-900 mb-2">拉屎时长折线图</p>
            {analytics.durationSeries.length ? (
              <div>
                <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="w-full h-36">
                  <defs>
                    <linearGradient id="lineGradMe" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#fb7185" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>

                  <motion.path
                    d={lineChartData.path}
                    fill="none"
                    stroke="url(#lineGradMe)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0.6 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />

                  <line x1="8" y1="8" x2="8" y2={CHART_HEIGHT - 8} stroke="#d8b4fe" strokeWidth="1" />
                  <line x1="8" y1={CHART_HEIGHT - 8} x2={CHART_WIDTH - 8} y2={CHART_HEIGHT - 8} stroke="#d8b4fe" strokeWidth="1" />

                  {lineChartData.points.map((p, i) => (
                    <motion.circle
                      key={`${p.date}-${i}`}
                      cx={p.x}
                      cy={p.y}
                      r={lineChartData.points.length === 1 ? 5 : 3.2}
                      fill="#e11d48"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.15 + i * 0.05, type: "spring", stiffness: 260 }}
                    />
                  ))}
                </svg>
                <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                  <span>Y: 0秒</span>
                  <span>Y: {Math.round(lineChartData.max)}秒</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                  <span>{analytics.durationSeries[0].date}</span>
                  <span>{analytics.durationSeries[analytics.durationSeries.length - 1].date}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">该日期范围暂无数据</p>
            )}
          </div>

          <div className="bg-amber-50 rounded-2xl p-3">
            <p className="text-sm font-bold text-amber-900 mb-2">每日时间分布图（0-23点）</p>
            <div className="flex gap-2">
              <div className="w-8 h-28 flex flex-col justify-between text-[10px] text-slate-400">
                <span>{hourMax}</span>
                <span>0</span>
              </div>
              <div className="flex-1">
                <div className="grid grid-cols-12 gap-1 items-end h-28 border-l border-b border-amber-200 px-1 pb-1">
                  {analytics.hourBins.filter((_, i) => i % 2 === 0).map((b) => {
                    const h = Math.max(6, (b.count / hourMax) * 100);
                    return (
                      <motion.div
                        key={b.hour}
                        initial={{ height: 0, opacity: 0.7 }}
                        animate={{ height: `${h}%`, opacity: 1 }}
                        transition={{ delay: b.hour * 0.01 + 0.1, duration: 0.4 }}
                        className="bg-gradient-to-t from-amber-500 to-rose-300 rounded-t"
                        title={`${b.hour}:00 ${b.count}次`}
                      />
                    );
                  })}
                </div>
                <div className="grid grid-cols-6 text-[10px] text-slate-400 mt-1">
                  {[0, 4, 8, 12, 16, 20].map((h) => (
                    <span key={h} className="text-center">{h}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-fuchsia-50 rounded-2xl p-3">
            <p className="text-sm font-bold text-fuchsia-900 mb-2">拉屎质量柱状图</p>
            <div className="space-y-1.5">
              {analytics.qualityBars.map((q) => {
                const w = Math.max(6, (q.count / qualityMax) * 100);
                return (
                  <div key={q.level} className="flex items-center gap-2">
                    <span className="text-xs w-16 shrink-0">{q.emoji} {q.level}</span>
                    <div className="h-3 flex-1 bg-white rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${w}%` }}
                        transition={{ duration: 0.45 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: q.color }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-6 text-right">{q.count}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 ml-[72px]">
              <div className="h-px bg-fuchsia-200" />
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                <span>0</span>
                <span>{Math.round(qualityMax / 2)}</span>
                <span>{qualityMax}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white/90 backdrop-blur rounded-3xl p-4 shadow-sm border border-pink-100">
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold text-rose-900">奖章墙</p>
            <button
              type="button"
              onClick={() => setShowOnlyUnlocked((v) => !v)}
              className="text-xs px-2 py-1 rounded-lg bg-rose-100 text-rose-600"
            >
              {showOnlyUnlocked ? "显示全部" : "只看已解锁"}
            </button>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {medalsToShow.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMedal(m)}
                className="rounded-xl p-2 bg-rose-50 hover:bg-rose-100 transition"
              >
                <span className={`text-2xl ${m.unlocked ? "" : "grayscale opacity-40"}`}>{m.icon}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={exportJson}
            className="py-2.5 rounded-xl bg-white text-blue-700 shadow-sm border border-blue-100 text-sm font-medium flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> JSON
          </button>
          <button
            type="button"
            onClick={exportExcel}
            className="py-2.5 rounded-xl bg-white text-emerald-700 shadow-sm border border-emerald-100 text-sm font-medium flex items-center justify-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
        </section>

        <section className="space-y-2">
          <button
            type="button"
            disabled={saving}
            onClick={clearAll}
            className="w-full py-2.5 rounded-xl bg-red-50 text-red-600 shadow-sm border border-red-100 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <RotateCcw className="w-4 h-4" /> 清空云端记录
          </button>

          <button
            type="button"
            onClick={logout}
            className="w-full py-2.5 rounded-xl bg-slate-800 text-white text-sm font-medium flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> 退出登录
          </button>

          <button
            type="button"
            onClick={() => {
              setDeleteNickname("");
              setShowDeleteModal(true);
            }}
            className="w-full py-2.5 rounded-xl bg-black text-white text-sm font-medium flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> 注销账号
          </button>
        </section>

        {(message || cloudError) && (
          <p className="text-sm text-center text-slate-600">{message || `云端错误：${cloudError}`}</p>
        )}
      </div>

      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-8 space-y-4"
            >
              <div className="flex items-center justify-between">
                <p className="font-bold text-lg text-rose-900">编辑个人信息</p>
                <button onClick={() => setShowEditModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-rose-100 border border-rose-200 grid place-items-center shrink-0">
                  {draft.avatarUrl ? (
                    <img src={draft.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle2 className="w-10 h-10 text-rose-400" />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onAvatarFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-500"
                />
              </div>

              <input
                value={draft.nickname || ""}
                onChange={(e) => setDraft((prev) => ({ ...prev, nickname: e.target.value }))}
                placeholder="昵称"
                className="w-full px-3 py-2 rounded-xl bg-rose-50 border border-rose-100 text-sm"
              />

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  min={80}
                  max={260}
                  value={draft.heightCm ?? ""}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, heightCm: e.target.value ? Number(e.target.value) : null }))
                  }
                  placeholder="身高(cm)"
                  className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-100 text-sm"
                />
                <input
                  type="number"
                  min={20}
                  max={300}
                  value={draft.weightKg ?? ""}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, weightKg: e.target.value ? Number(e.target.value) : null }))
                  }
                  placeholder="体重(kg)"
                  className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-100 text-sm"
                />
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={draft.age ?? ""}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, age: e.target.value ? Number(e.target.value) : null }))
                  }
                  placeholder="年龄"
                  className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-100 text-sm"
                />
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={saveDraft}
                className="w-full py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold disabled:opacity-60"
              >
                {saving ? "保存中..." : "保存修改"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-5 w-full max-w-sm"
            >
              <p className="font-bold text-lg text-slate-900">确认注销账号</p>
              <p className="text-sm text-slate-500 mt-1">
                输入你的昵称 <span className="font-semibold text-slate-800">{profile.nickname || "(未设置)"}</span> 以确认。注销后账号及后端数据会被彻底删除。
              </p>
              <input
                value={deleteNickname}
                onChange={(e) => setDeleteNickname(e.target.value)}
                placeholder="输入昵称确认"
                className="mt-3 w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
              />
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="py-2 rounded-xl bg-slate-100 text-slate-700 text-sm"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={deleteAccount}
                  className="py-2 rounded-xl bg-black text-white text-sm disabled:opacity-60"
                >
                  {deleting ? "注销中..." : "确认注销"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedMedal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6"
            onClick={() => setSelectedMedal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-5 w-full max-w-sm text-center relative"
            >
              <button
                type="button"
                onClick={() => setSelectedMedal(null)}
                className="absolute right-3 top-3 p-1 rounded hover:bg-slate-100"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
              <p className={`text-5xl ${selectedMedal.unlocked ? "" : "grayscale opacity-40"}`}>{selectedMedal.icon}</p>
              <p className="font-bold text-lg text-slate-800 mt-2">{selectedMedal.name}</p>
              <p className="text-sm text-slate-500 mt-1">{selectedMedal.description}</p>
              <p className={`text-sm mt-2 ${selectedMedal.unlocked ? "text-emerald-600" : "text-slate-400"}`}>
                {selectedMedal.unlocked ? (
                  <span className="inline-flex items-center gap-1"><BadgeCheck className="w-4 h-4" />已解锁</span>
                ) : (
                  "未解锁"
                )}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
