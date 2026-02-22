import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Trash2, MapPin, Clock, X } from "lucide-react";
import { usePoopStore } from "../store";
import {
  HARDNESS_MAP,
  MOOD_OPTIONS,
  LOCATION_OPTIONS,
} from "../types";
import type { PoopRecord } from "../types";

export default function HistoryPage() {
  const navigate = useNavigate();
  const { records, deleteRecord } = usePoopStore();
  const [selectedRecord, setSelectedRecord] = useState<PoopRecord | null>(null);

  const groupedRecords = useMemo(() => {
    const groups: Record<string, typeof records> = {};
    records.forEach((r) => {
      if (!groups[r.date]) groups[r.date] = [];
      groups[r.date].push(r);
    });
    return Object.entries(groups).sort(
      ([a], [b]) => new Date(b).getTime() - new Date(a).getTime()
    );
  }, [records]);

  const getMoodInfo = (value: string) =>
    MOOD_OPTIONS.find((m) => m.value === value) || MOOD_OPTIONS[2];
  const getLocationInfo = (value: string) => {
    const matched = LOCATION_OPTIONS.find((l) => l.value === value);
    if (matched) return matched;
    return { emoji: "📍", label: value || "自定义地点", value };
  };

  const formatDate = (dateStr: string) => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];
    if (dateStr === today) return "今天";
    if (dateStr === yesterday) return "昨天";
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50">
      <header className="flex items-center px-4 pt-safe pt-6 pb-3">
        <button
          onClick={() => navigate("/")}
          className="p-2 -ml-2 rounded-xl hover:bg-blue-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-blue-800" />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold text-blue-900 pr-9">
          📜 排泄历史
        </h1>
      </header>

      <div className="px-4 pb-20">
        {records.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl">🚽</span>
            <p className="text-gray-400 mt-4">还没有排泄记录</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/")}
              className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-xl text-sm"
            >
              去记录一下
            </motion.button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Total Stats */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 flex items-center justify-between">
              <span className="text-sm text-gray-500">总计记录</span>
              <span className="font-bold text-blue-800 text-lg">
                {records.length} 次
              </span>
            </div>

            {groupedRecords.map(([date, dayRecords]) => (
              <div key={date}>
                <h3 className="text-sm font-bold text-gray-500 mb-2 px-1">
                  {formatDate(date)}{" "}
                  <span className="font-normal text-gray-400">
                    · {dayRecords.length}次
                  </span>
                </h3>
                <div className="space-y-2">
                  {dayRecords.map((r, idx) => {
                    const info = HARDNESS_MAP[r.hardness - 1];
                    const loc = getLocationInfo(r.location);
                    const moodInfo = getMoodInfo(r.mood);
                    return (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => setSelectedRecord(r)}
                        className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                          style={{
                            backgroundColor: info.color + "15",
                          }}
                        >
                          {info.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 text-sm">
                            {info.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              {new Date(r.startTime).toLocaleTimeString(
                                "zh-CN",
                                { hour: "2-digit", minute: "2-digit" }
                              )}
                            </span>
                            <span>·</span>
                            <span>{Math.floor(r.duration / 60)}分{r.duration % 60}秒</span>
                            <span>·</span>
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-3 h-3" />
                              {loc.emoji} {loc.label}
                            </span>
                          </div>
                        </div>
                        <span className="text-lg">{moodInfo.emoji}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record Detail Modal */}
      <AnimatePresence>
        {selectedRecord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"
            onClick={() => setSelectedRecord(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-10 space-y-4"
            >
              {/* Close */}
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-gray-800">记录详情</h3>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="p-1 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {(() => {
                const info = HARDNESS_MAP[selectedRecord.hardness - 1];
                const loc = getLocationInfo(selectedRecord.location);
                const moodInfo = getMoodInfo(selectedRecord.mood);
                return (
                  <>
                    <div className="flex items-center gap-4">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                        style={{ backgroundColor: info.color + "15" }}
                      >
                        {info.emoji}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 text-lg">
                          {info.name}
                        </p>
                        <p className="text-sm text-gray-400">
                          {info.description}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400">排泄时间</p>
                        <p className="font-medium text-gray-700 mt-0.5">
                          {new Date(selectedRecord.startTime).toLocaleString("zh-CN", {
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400">蹲坑时长</p>
                        <p className="font-medium text-gray-700 mt-0.5">
                          {Math.floor(selectedRecord.duration / 60)}分
                          {selectedRecord.duration % 60}秒
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400">地点</p>
                        <p className="font-medium text-gray-700 mt-0.5">
                          {loc.emoji} {loc.label}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400">心情</p>
                        <p className="font-medium text-gray-700 mt-0.5">
                          {moodInfo.emoji} {moodInfo.label}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400">硬度分型</p>
                        <p className="font-medium text-gray-700 mt-0.5">
                          第{selectedRecord.hardness}型
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400">顺畅度</p>
                        <p className="font-medium text-gray-700 mt-0.5">
                          {["艰难", "费劲", "一般", "顺畅", "丝滑"][selectedRecord.smoothness - 1]}
                        </p>
                      </div>
                    </div>

                    {selectedRecord.note && (
                      <div className="bg-amber-50 rounded-xl p-3">
                        <p className="text-xs text-amber-500 mb-1">💬 心情笔记</p>
                        <p className="text-sm text-amber-800">
                          {selectedRecord.note}
                        </p>
                      </div>
                    )}

                    <div className="bg-emerald-50 rounded-xl p-3">
                      <p className="text-xs text-emerald-500 mb-1">
                        🤖 拟人化评价
                      </p>
                      <p className="text-sm text-emerald-800 italic">
                        "{info.evaluation}"
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        deleteRecord(selectedRecord.id);
                        setSelectedRecord(null);
                      }}
                      className="w-full py-3 text-red-500 bg-red-50 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> 删除此记录
                    </button>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
