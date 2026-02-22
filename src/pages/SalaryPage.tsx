import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Settings } from "lucide-react";
import { usePoopStore } from "../store";

export default function SalaryPage() {
  const navigate = useNavigate();
  const { records, hourlySalary, setHourlySalary } = usePoopStore();
  const [showSettings, setShowSettings] = useState(false);
  const [tempSalary, setTempSalary] = useState(String(hourlySalary));

  const currentYear = new Date().getFullYear();

  const yearRecords = useMemo(
    () => records.filter((r) => r.date.startsWith(`${currentYear}`)),
    [records, currentYear]
  );

  const totalSeconds = useMemo(
    () => yearRecords.reduce((s, r) => s + r.duration, 0),
    [yearRecords]
  );

  const totalHours = totalSeconds / 3600;
  const totalSalary = totalHours * hourlySalary;

  // Monthly breakdown
  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthStr = String(i + 1).padStart(2, "0");
      const prefix = `${currentYear}-${monthStr}`;
      const monthRecords = yearRecords.filter((r) =>
        r.date.startsWith(prefix)
      );
      const seconds = monthRecords.reduce((s, r) => s + r.duration, 0);
      return {
        month: i + 1,
        label: `${i + 1}月`,
        count: monthRecords.length,
        seconds,
        salary: (seconds / 3600) * hourlySalary,
      };
    });
    return months;
  }, [yearRecords, currentYear, hourlySalary]);

  const maxMonthSeconds = Math.max(...monthlyData.map((m) => m.seconds), 1);

  // Fun stats
  const funStats = useMemo(() => {
    const avgDuration =
      yearRecords.length > 0
        ? totalSeconds / yearRecords.length
        : 0;
    const longestPoop = yearRecords.reduce(
      (max, r) => (r.duration > max ? r.duration : max),
      0
    );
    const movieCount = Math.floor(totalSeconds / (120 * 60)); // 120min movies
    const noodleBowls = Math.floor(totalSalary / 15); // 15元/bowl
    return { avgDuration, longestPoop, movieCount, noodleBowls };
  }, [yearRecords, totalSeconds, totalSalary]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}小时${m}分钟`;
    return `${m}分钟`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-amber-50">
      <header className="flex items-center px-4 pt-safe pt-6 pb-3">
        <button
          onClick={() => navigate("/")}
          className="p-2 -ml-2 rounded-xl hover:bg-yellow-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-yellow-800" />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold text-yellow-900">
          💰 带薪蹲坑报告
        </h1>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 -mr-2 rounded-xl hover:bg-yellow-100 transition-colors"
        >
          <Settings className="w-5 h-5 text-yellow-700" />
        </button>
      </header>

      <div className="px-4 pb-20 space-y-4">
        {/* Salary Settings */}
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-white rounded-2xl p-4 shadow-sm"
          >
            <p className="text-sm text-gray-600 mb-2">设置时薪（元/小时）</p>
            <div className="flex gap-2">
              <input
                type="number"
                value={tempSalary}
                onChange={(e) => setTempSalary(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-yellow-300 outline-none"
              />
              <button
                onClick={() => {
                  setHourlySalary(Number(tempSalary) || 50);
                  setShowSettings(false);
                }}
                className="px-4 py-2 bg-yellow-500 text-white rounded-xl font-medium"
              >
                确定
              </button>
            </div>
          </motion.div>
        )}

        {/* Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-yellow-400 via-amber-400 to-orange-400 rounded-3xl p-6 text-white shadow-xl shadow-amber-300/30"
        >
          <p className="text-sm opacity-80">{currentYear}年带薪蹲坑总收益</p>
          <motion.p
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.3 }}
            className="text-5xl font-bold mt-2 mb-1"
          >
            ¥{totalSalary.toFixed(2)}
          </motion.p>
          <p className="text-sm opacity-70">
            总计蹲坑 {formatDuration(totalSeconds)} · {yearRecords.length}次
          </p>

          <div className="mt-4 pt-4 border-t border-white/20 flex justify-between text-center">
            <div>
              <p className="text-2xl font-bold">
                {yearRecords.length}
              </p>
              <p className="text-xs opacity-70">总次数</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {formatDuration(totalSeconds)}
              </p>
              <p className="text-xs opacity-70">总时长</p>
            </div>
            <div>
              <p className="text-2xl font-bold">¥{hourlySalary}</p>
              <p className="text-xs opacity-70">时薪</p>
            </div>
          </div>
        </motion.div>

        {/* Monthly Chart */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">📊 月度蹲坑时长</h3>
          <div className="flex items-end gap-1.5 h-40">
            {monthlyData.map((m, i) => {
              const pct = (m.seconds / maxMonthSeconds) * 100;
              return (
                <div
                  key={m.month}
                  className="flex-1 flex flex-col items-center justify-end h-full"
                >
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(pct, 2)}%` }}
                    transition={{ duration: 0.6, delay: i * 0.05 }}
                    className={`w-full rounded-t-lg ${
                      m.seconds > 0
                        ? "bg-gradient-to-t from-amber-400 to-yellow-300"
                        : "bg-gray-100"
                    }`}
                  />
                  <span className="text-[10px] text-gray-400 mt-1">
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Salary Breakdown */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3">💵 月度收益明细</h3>
          <div className="space-y-2">
            {monthlyData
              .filter((m) => m.count > 0)
              .map((m) => (
                <div
                  key={m.month}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl"
                >
                  <span className="text-sm text-gray-600">{m.label}</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-amber-700">
                      ¥{m.salary.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">
                      {m.count}次 · {formatDuration(m.seconds)}
                    </span>
                  </div>
                </div>
              ))}
            {monthlyData.every((m) => m.count === 0) && (
              <p className="text-center text-gray-400 text-sm py-4">
                今年还没有蹲坑记录哦~
              </p>
            )}
          </div>
        </div>

        {/* Fun Stats */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3">🎉 趣味统计</h3>
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-3 text-center"
            >
              <span className="text-3xl">⏱</span>
              <p className="text-lg font-bold text-pink-700 mt-1">
                {formatDuration(funStats.avgDuration)}
              </p>
              <p className="text-xs text-pink-400">平均每次蹲坑</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 text-center"
            >
              <span className="text-3xl">🏆</span>
              <p className="text-lg font-bold text-blue-700 mt-1">
                {formatDuration(funStats.longestPoop)}
              </p>
              <p className="text-xs text-blue-400">最长蹲坑记录</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-3 text-center"
            >
              <span className="text-3xl">🎬</span>
              <p className="text-lg font-bold text-purple-700 mt-1">
                {funStats.movieCount} 部
              </p>
              <p className="text-xs text-purple-400">等于看了这么多电影</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-3 text-center"
            >
              <span className="text-3xl">🍜</span>
              <p className="text-lg font-bold text-orange-700 mt-1">
                {funStats.noodleBowls} 碗
              </p>
              <p className="text-xs text-orange-400">能吃这么多碗面</p>
            </motion.div>
          </div>
        </div>

        {/* Fun message */}
        <div className="text-center py-4">
          <p className="text-sm text-gray-400 italic">
            {totalSalary > 1000
              ? "🎉 蹲坑达人！你已经是带薪拉屎的高手了！"
              : totalSalary > 100
              ? "💪 不错不错，继续努力带薪蹲坑！"
              : "🚀 带薪蹲坑之路才刚刚开始，加油！"}
          </p>
        </div>
      </div>
    </div>
  );
}
