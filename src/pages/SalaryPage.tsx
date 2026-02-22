import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Coins, Sparkles } from "lucide-react";
import { usePoopStore } from "../store";

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h <= 0) return `${m} 分钟`;
  return `${h} 小时 ${m} 分钟`;
}

export default function SalaryPage() {
  const navigate = useNavigate();
  const { records, hourlySalary, setHourlySalary } = usePoopStore();
  const [showSetting, setShowSetting] = useState(false);
  const [tempSalary, setTempSalary] = useState(String(hourlySalary || 1));
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const year = new Date().getFullYear();
  const yearRecords = useMemo(() => records.filter((r) => r.date.startsWith(String(year))), [records, year]);
  const totalSeconds = useMemo(() => yearRecords.reduce((s, r) => s + r.duration, 0), [yearRecords]);
  const totalSalary = (totalSeconds / 3600) * (hourlySalary || 1);

  const monthly = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = String(i + 1).padStart(2, "0");
      const list = yearRecords.filter((r) => r.date.startsWith(`${year}-${month}`));
      const sec = list.reduce((s, r) => s + r.duration, 0);
      return {
        month: i + 1,
        sec,
        count: list.length,
        salary: (sec / 3600) * (hourlySalary || 1),
      };
    });
  }, [yearRecords, year, hourlySalary]);

  const maxSec = Math.max(...monthly.map((m) => m.sec), 1);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-50">
      <header className="flex items-center px-4 pt-safe pt-6 pb-3">
        <button onClick={() => navigate("/")} className="p-2 -ml-2 rounded-xl hover:bg-yellow-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-yellow-800" />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold text-yellow-900">带薪蹲坑报告</h1>
        <button onClick={() => setShowSetting((v) => !v)} className="p-2 -mr-2 rounded-xl hover:bg-yellow-100 transition-colors">
          <Coins className="w-5 h-5 text-yellow-700" />
        </button>
      </header>

      <div className="px-4 pb-24 space-y-4">
        <AnimatePresence>
          {showSetting && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className="bg-white rounded-2xl p-4 shadow-sm"
            >
              <p className="text-sm text-gray-600 mb-2">设置时薪（默认 1 元/小时）</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={tempSalary}
                  onChange={(e) => setTempSalary(e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-300 outline-none"
                />
                <button
                  onClick={async () => {
                    const value = Math.max(1, Number(tempSalary) || 1);
                    setSaving(true);
                    setErrorMsg("");
                    try {
                      await setHourlySalary(value);
                      setTempSalary(String(value));
                      setShowSetting(false);
                    } catch (error) {
                      setErrorMsg(`保存失败：${error instanceof Error ? error.message : "未知错误"}`);
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-yellow-500 text-white font-medium"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
              {errorMsg && <p className="text-sm text-red-500 mt-2">{errorMsg}</p>}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-6 text-white bg-gradient-to-br from-yellow-400 via-amber-400 to-orange-500 shadow-xl shadow-amber-200/50"
        >
          <p className="text-sm opacity-80">{year} 年带薪蹲坑总收益</p>
          <p className="text-5xl font-black mt-2">¥{totalSalary.toFixed(2)}</p>
          <p className="text-sm opacity-90 mt-2">总时长 {formatDuration(totalSeconds)} · 共 {yearRecords.length} 次</p>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-white/20 rounded-xl p-2 text-center">
              <p className="text-xl font-bold">{yearRecords.length}</p>
              <p className="text-xs opacity-80">年度次数</p>
            </div>
            <div className="bg-white/20 rounded-xl p-2 text-center">
              <p className="text-xl font-bold">{Math.round(totalSeconds / 60)}</p>
              <p className="text-xs opacity-80">总分钟</p>
            </div>
            <div className="bg-white/20 rounded-xl p-2 text-center">
              <p className="text-xl font-bold">¥{hourlySalary || 1}</p>
              <p className="text-xs opacity-80">时薪</p>
            </div>
          </div>
        </motion.div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="font-bold text-gray-800 mb-3">月度收益柱状图</p>
          <div className="flex items-end gap-1.5 h-44">
            {monthly.map((m, i) => {
              const pct = (m.sec / maxSec) * 100;
              return (
                <div key={m.month} className="flex-1 flex flex-col justify-end items-center h-full">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(4, pct)}%` }}
                    transition={{ delay: i * 0.04, duration: 0.6 }}
                    className={`w-full rounded-t-md ${m.count ? "bg-gradient-to-t from-amber-500 to-yellow-300" : "bg-gray-100"}`}
                  />
                  <span className="text-[10px] text-gray-400 mt-1">{m.month}月</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
          <p className="font-bold text-gray-800">月度明细</p>
          {monthly.filter((m) => m.count > 0).length === 0 ? (
            <p className="text-sm text-gray-400 py-3 text-center">今年还没有记录，先开始一局吧。</p>
          ) : (
            monthly.filter((m) => m.count > 0).map((m) => (
              <div key={m.month} className="bg-gray-50 rounded-xl px-3 py-2 flex items-center justify-between text-sm">
                <span className="text-gray-600">{m.month}月 · {m.count}次</span>
                <span className="font-bold text-amber-700">¥{m.salary.toFixed(2)}</span>
              </div>
            ))
          )}
        </div>

        <div className="text-center text-gray-500 text-sm py-2 flex items-center justify-center gap-1">
          <Sparkles className="w-4 h-4" />
          持续记录，你的年度“带薪蹲坑曲线”会越来越完整
        </div>
      </div>
    </div>
  );
}
