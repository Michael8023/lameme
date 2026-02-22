import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { usePoopStore } from "../store";
import { HARDNESS_MAP } from "../types";

export default function CalendarPage() {
  const navigate = useNavigate();
  const { records } = usePoopStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthRecords = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    return records.filter((r) => r.date.startsWith(prefix));
  }, [records, year, month]);

  const recordsByDate = useMemo(() => {
    const map: Record<string, typeof records> = {};
    monthRecords.forEach((r) => {
      if (!map[r.date]) map[r.date] = [];
      map[r.date].push(r);
    });
    return map;
  }, [monthRecords]);

  // Health trend data for month
  const weeklyStats = useMemo(() => {
    const weeks: { week: number; avgHardness: number; count: number; avgDuration: number }[] = [];
    for (let w = 0; w < 5; w++) {
      const startDay = w * 7 + 1;
      const endDay = Math.min((w + 1) * 7, daysInMonth);
      const weekRecords = monthRecords.filter((r) => {
        const day = parseInt(r.date.split("-")[2]);
        return day >= startDay && day <= endDay;
      });
      if (weekRecords.length > 0) {
        weeks.push({
          week: w + 1,
          avgHardness:
            weekRecords.reduce((s, r) => s + r.hardness, 0) /
            weekRecords.length,
          count: weekRecords.length,
          avgDuration:
            weekRecords.reduce((s, r) => s + r.duration, 0) /
            weekRecords.length,
        });
      }
    }
    return weeks;
  }, [monthRecords, daysInMonth]);

  const selectedRecords = selectedDate ? recordsByDate[selectedDate] || [] : [];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

  // Monthly summary
  const monthSummary = useMemo(() => {
    if (monthRecords.length === 0) return null;
    const avgHardness = monthRecords.reduce((s, r) => s + r.hardness, 0) / monthRecords.length;
    const avgDuration = monthRecords.reduce((s, r) => s + r.duration, 0) / monthRecords.length;
    const totalDuration = monthRecords.reduce((s, r) => s + r.duration, 0);
    const idealCount = monthRecords.filter((r) => r.hardness >= 3 && r.hardness <= 5).length;
    return { avgHardness, avgDuration, totalDuration, count: monthRecords.length, idealCount };
  }, [monthRecords]);

  const getDietAdvice = (avgHardness: number) => {
    if (avgHardness < 3) return { emoji: "🥤", text: "建议多喝水、增加膳食纤维，多吃蔬菜水果和全谷物" };
    if (avgHardness <= 5) return { emoji: "✅", text: "肠道状态良好！继续保持均衡饮食和规律作息" };
    return { emoji: "🍚", text: "建议清淡饮食，避免油腻辛辣，适当补充益生菌" };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-50">
      <header className="flex items-center px-4 pt-safe pt-6 pb-3">
        <button
          onClick={() => navigate("/")}
          className="p-2 -ml-2 rounded-xl hover:bg-emerald-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-emerald-800" />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold text-emerald-900 pr-9">
          📅 肠道日历
        </h1>
      </header>

      <div className="px-4 pb-20 space-y-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between bg-white rounded-2xl p-3 shadow-sm">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="font-bold text-gray-800">
            {year}年{month + 1}月
          </span>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((d) => (
              <div key={d} className="text-center text-xs text-gray-400 py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }, (_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayRecords = recordsByDate[dateStr];
              const isSelected = selectedDate === dateStr;
              const isToday = dateStr === new Date().toISOString().split("T")[0];

              return (
                <motion.button
                  key={day}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all ${
                    isSelected
                      ? "bg-emerald-500 text-white shadow-md"
                      : isToday
                      ? "bg-emerald-100 text-emerald-700"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <span className={`font-medium ${isSelected ? "text-white" : ""}`}>
                    {day}
                  </span>
                  {dayRecords && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayRecords.slice(0, 3).map((_, idx) => (
                        <div
                          key={idx}
                          className={`w-1 h-1 rounded-full ${
                            isSelected ? "bg-white" : "bg-amber-400"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Records */}
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-4 shadow-sm"
          >
            <h3 className="font-bold text-gray-800 mb-3">
              {selectedDate} 的记录
            </h3>
            {selectedRecords.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">
                这一天没有记录 📭
              </p>
            ) : (
              <div className="space-y-2">
                {selectedRecords.map((r) => {
                  const info = HARDNESS_MAP[r.hardness - 1];
                  return (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gray-50"
                    >
                      <span className="text-2xl">{info.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">
                          {info.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(r.startTime).toLocaleTimeString("zh-CN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          · {Math.floor(r.duration / 60)}分{r.duration % 60}秒
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Health Trend Chart */}
        {weeklyStats.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4">📊 本月肠道趋势</h3>

            {/* Hardness Trend Bar Chart */}
            <div className="space-y-3">
              <p className="text-xs text-gray-500">每周平均硬度指数</p>
              <div className="space-y-2">
                {weeklyStats.map((ws) => {
                  const pct = (ws.avgHardness / 7) * 100;
                  const isIdeal = ws.avgHardness >= 3 && ws.avgHardness <= 5;
                  return (
                    <div key={ws.week} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-12 shrink-0">
                        第{ws.week}周
                      </span>
                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: ws.week * 0.1 }}
                          className={`h-full rounded-full ${
                            isIdeal
                              ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                              : ws.avgHardness < 3
                              ? "bg-gradient-to-r from-amber-400 to-amber-500"
                              : "bg-gradient-to-r from-orange-400 to-red-400"
                          }`}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-600 w-8 text-right">
                        {ws.avgHardness.toFixed(1)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 text-[10px] text-gray-400 mt-2">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-amber-400" /> 偏硬
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" /> 理想
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-orange-400" /> 偏软
                </span>
              </div>
            </div>

            {/* Frequency dots */}
            <div className="mt-6">
              <p className="text-xs text-gray-500 mb-2">每周排便次数</p>
              <div className="flex justify-around">
                {weeklyStats.map((ws) => (
                  <div key={ws.week} className="flex flex-col items-center gap-1">
                    <div className="flex flex-col gap-0.5">
                      {Array.from({ length: ws.count }, (_, i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.3 + i * 0.05 }}
                          className="w-3 h-3 rounded-full bg-amber-400"
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-gray-400">
                      W{ws.week}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Monthly Summary */}
        {monthSummary && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-800">📋 月度总结</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-amber-700">
                  {monthSummary.count}
                </p>
                <p className="text-xs text-amber-500">总排便次数</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-emerald-700">
                  {Math.round((monthSummary.idealCount / monthSummary.count) * 100)}%
                </p>
                <p className="text-xs text-emerald-500">理想占比</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">
                  {Math.floor(monthSummary.avgDuration / 60)}分
                </p>
                <p className="text-xs text-blue-500">平均时长</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-purple-700">
                  {monthSummary.avgHardness.toFixed(1)}
                </p>
                <p className="text-xs text-purple-500">平均硬度</p>
              </div>
            </div>

            {/* Diet Advice */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4">
              <p className="font-bold text-emerald-800 mb-1">
                {getDietAdvice(monthSummary.avgHardness).emoji} 饮食建议
              </p>
              <p className="text-sm text-emerald-700 leading-relaxed">
                {getDietAdvice(monthSummary.avgHardness).text}
              </p>
            </div>
          </div>
        )}

        {monthRecords.length === 0 && (
          <div className="text-center py-12">
            <span className="text-5xl">📭</span>
            <p className="text-gray-400 mt-4">这个月还没有记录哦</p>
            <p className="text-gray-300 text-sm">去首页开始你的第一次蹲坑吧！</p>
          </div>
        )}
      </div>
    </div>
  );
}
