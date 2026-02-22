import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock, MapPin, Pencil, Trash2, X } from "lucide-react";
import { HARDNESS_MAP, LOCATION_OPTIONS, MOOD_OPTIONS } from "../types";
import { usePoopStore } from "../store";
import type { PoopRecord } from "../types";

type EditForm = {
  date: string;
  time: string;
  duration: number;
  hardness: number;
  smoothness: number;
  location: string;
  customLocation: string;
  mood: string;
  note: string;
};

const smoothnessText = ["艰难", "费劲", "一般", "顺畅", "丝滑"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m <= 0) return `${s}秒`;
  return `${m}分${s}秒`;
}

function getDateFromRecord(r: PoopRecord) {
  if (r.date) return r.date;
  if (r.beijingTime) return r.beijingTime.slice(0, 10);
  const d = new Date(r.startTime || Date.now());
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeLabel(ms: number) {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { records, updateRecord, deleteRecord } = usePoopStore();

  const [selectedRecord, setSelectedRecord] = useState<PoopRecord | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const todayRecords = useMemo(() => {
    return [...records]
      .filter((r) => getDateFromRecord(r) === todayStr)
      .sort((a, b) => (b.beijingTimestamp || b.startTime) - (a.beijingTimestamp || a.startTime));
  }, [records, todayStr]);

  const getMoodInfo = (value: string) => MOOD_OPTIONS.find((m) => m.value === value) || MOOD_OPTIONS[2];

  const getLocationInfo = (value: string) => {
    const hit = LOCATION_OPTIONS.find((l) => l.value === value);
    if (hit) return hit;
    return { emoji: "📍", label: value || "自定义地点", value };
  };

  const startEdit = (r: PoopRecord) => {
    const date = getDateFromRecord(r);
    const time =
      r.beijingTime?.slice(11, 16) ||
      `${pad(new Date(r.startTime).getHours())}:${pad(new Date(r.startTime).getMinutes())}`;
    const locationMatched = LOCATION_OPTIONS.some((l) => l.value === r.location);

    setEditForm({
      date,
      time,
      duration: r.duration,
      hardness: r.hardness,
      smoothness: r.smoothness,
      location: locationMatched ? r.location : "__custom__",
      customLocation: locationMatched ? "" : r.location,
      mood: r.mood,
      note: r.note,
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!selectedRecord || !editForm) return;
    setBusy(true);
    setErrorMsg("");

    try {
      const location =
        editForm.location === "__custom__"
          ? editForm.customLocation.trim() || "自定义地点"
          : editForm.location;

      const start = new Date(`${editForm.date}T${editForm.time}:00`).getTime();
      const duration = Math.max(1, Number(editForm.duration) || 1);

      const patch: Partial<PoopRecord> = {
        date: editForm.date,
        startTime: start,
        endTime: start + duration * 1000,
        beijingTime: `${editForm.date} ${editForm.time}:00`,
        beijingTimestamp: selectedRecord.beijingTimestamp || Date.now(),
        duration,
        hardness: editForm.hardness,
        smoothness: editForm.smoothness,
        location,
        mood: editForm.mood,
        note: editForm.note,
      };

      await updateRecord(selectedRecord.id, patch);
      setSelectedRecord({ ...selectedRecord, ...patch } as PoopRecord);
      setEditing(false);
    } catch (error) {
      setErrorMsg(`保存失败：${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm("确认删除此记录？")) return;
    setBusy(true);
    setErrorMsg("");
    try {
      await deleteRecord(id);
      setSelectedRecord(null);
    } catch (error) {
      setErrorMsg(`删除失败：${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50">
      <header className="flex items-center px-4 pt-safe pt-6 pb-3">
        <button onClick={() => navigate("/")} className="p-2 -ml-2 rounded-xl hover:bg-blue-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-blue-800" />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold text-blue-900 pr-9">排便历史</h1>
      </header>

      <div className="px-4 pb-24 space-y-3">
        <h3 className="text-sm font-bold text-gray-500 px-1">
          今天 <span className="font-normal text-gray-400">· {todayRecords.length} 次</span>
        </h3>

        {todayRecords.length === 0 ? (
          <div className="bg-white rounded-2xl p-4 text-center text-sm text-gray-500 shadow-sm">
            今天还没有记录，历史日期请到日历页面查看。
            <button
              onClick={() => navigate("/calendar")}
              className="block mx-auto mt-2 px-4 py-1.5 rounded-lg bg-emerald-50 text-emerald-700"
            >
              去日历查看
            </button>
          </div>
        ) : (
          todayRecords.map((r) => {
            const info = HARDNESS_MAP[r.hardness - 1];
            const loc = getLocationInfo(r.location);
            const mood = getMoodInfo(r.mood);

            return (
              <motion.button
                key={r.id}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  setSelectedRecord(r);
                  setEditing(false);
                  setErrorMsg("");
                }}
                className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 text-left"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                  style={{ backgroundColor: `${info.color}20` }}
                >
                  {info.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm">{info.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      {r.beijingTime?.slice(11, 16) || toTimeLabel(r.startTime)}
                    </span>
                    <span>·</span>
                    <span>{formatDuration(r.duration)}</span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3 h-3" />
                      {loc.emoji} {loc.label}
                    </span>
                  </div>
                </div>
                <span className="text-lg">{mood.emoji}</span>
              </motion.button>
            );
          })
        )}

        {errorMsg && <p className="text-sm text-center text-red-500">{errorMsg}</p>}
      </div>

      <AnimatePresence>
        {selectedRecord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"
            onClick={() => {
              setSelectedRecord(null);
              setEditing(false);
            }}
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
                <h3 className="font-bold text-lg text-gray-800">记录详情</h3>
                <button
                  onClick={() => {
                    setSelectedRecord(null);
                    setEditing(false);
                  }}
                  className="p-1 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {!editing && (() => {
                const info = HARDNESS_MAP[selectedRecord.hardness - 1];
                const mood = getMoodInfo(selectedRecord.mood);
                const loc = getLocationInfo(selectedRecord.location);
                return (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400">北京时间</p>
                        <p className="font-medium">{selectedRecord.beijingTime || "-"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400">时长</p>
                        <p className="font-medium">{formatDuration(selectedRecord.duration)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400">类型</p>
                        <p className="font-medium">{info.emoji} {info.name}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400">顺畅度</p>
                        <p className="font-medium">{smoothnessText[selectedRecord.smoothness - 1]}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400">地点</p>
                        <p className="font-medium">{loc.emoji} {loc.label}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400">心情</p>
                        <p className="font-medium">{mood.emoji} {mood.label}</p>
                      </div>
                    </div>
                    {selectedRecord.note && (
                      <div className="bg-amber-50 rounded-xl p-3 text-sm text-amber-900">{selectedRecord.note}</div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(selectedRecord)}
                        className="flex-1 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <Pencil className="w-4 h-4" />编辑
                      </button>
                      <button
                        onClick={() => onDelete(selectedRecord.id)}
                        disabled={busy}
                        className="flex-1 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        <Trash2 className="w-4 h-4" />删除
                      </button>
                    </div>
                  </>
                );
              })()}

              {editing && editForm && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    />
                    <input
                      type="time"
                      value={editForm.time}
                      onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      min={1}
                      value={editForm.duration}
                      onChange={(e) => setEditForm({ ...editForm, duration: Number(e.target.value) })}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    />
                    <select
                      value={editForm.hardness}
                      onChange={(e) => setEditForm({ ...editForm, hardness: Number(e.target.value) })}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    >
                      {HARDNESS_MAP.map((h) => (
                        <option key={h.level} value={h.level}>{h.level}-{h.name}</option>
                      ))}
                    </select>
                    <select
                      value={editForm.smoothness}
                      onChange={(e) => setEditForm({ ...editForm, smoothness: Number(e.target.value) })}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{n}-{smoothnessText[n - 1]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    >
                      {LOCATION_OPTIONS.map((l) => (
                        <option key={l.value} value={l.value}>{l.label}</option>
                      ))}
                      <option value="__custom__">自定义</option>
                    </select>
                    <select
                      value={editForm.mood}
                      onChange={(e) => setEditForm({ ...editForm, mood: e.target.value })}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    >
                      {MOOD_OPTIONS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  {editForm.location === "__custom__" && (
                    <input
                      type="text"
                      value={editForm.customLocation}
                      onChange={(e) => setEditForm({ ...editForm, customLocation: e.target.value })}
                      placeholder="输入自定义地点"
                      className="px-3 py-2 w-full bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    />
                  )}
                  <textarea
                    value={editForm.note}
                    onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                    placeholder="备注"
                    className="w-full h-20 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(false)} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm">
                      取消
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={busy}
                      className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl text-sm disabled:opacity-60"
                    >
                      保存
                    </button>
                  </div>
                  {errorMsg && <p className="text-sm text-center text-red-500">{errorMsg}</p>}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
