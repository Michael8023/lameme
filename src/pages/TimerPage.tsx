import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, MapPin, SmilePlus } from "lucide-react";
import { usePoopStore } from "../store";
import { HARDNESS_MAP, LOCATION_OPTIONS, MOOD_OPTIONS } from "../types";

type Phase = "timing" | "details" | "result";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getBeijingNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const time = `${get("hour")}:${get("minute")}:${get("second")}`;

  return {
    date,
    beijingTime: `${date} ${time}`,
    beijingTimestamp: Date.now(),
  };
}

export default function TimerPage() {
  const navigate = useNavigate();
  const { currentSession, startSession, endSession, addRecord } = usePoopStore();

  const [phase, setPhase] = useState<Phase>("timing");
  const [elapsed, setElapsed] = useState(0);
  const [finalDuration, setFinalDuration] = useState(0);
  const [hardness, setHardness] = useState(4);
  const [smoothness, setSmoothness] = useState(3);
  const [location, setLocation] = useState("home");
  const [customLocation, setCustomLocation] = useState("");
  const [mood, setMood] = useState("relaxed");
  const [note, setNote] = useState("");
  const [savedRecord, setSavedRecord] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isHidden, setIsHidden] = useState(document.hidden);
  const [isMobile, setIsMobile] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const postTimerNotification = useCallback(async (seconds: number) => {
    if (!("serviceWorker" in navigator) || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({
      type: "TIMER_UPDATE",
      formatted: formatTime(seconds),
    });
  }, []);

  const clearTimerNotification = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({ type: "TIMER_STOP" });
  }, []);

  const hideTimerNotification = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({ type: "TIMER_HIDE" });
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const mobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    setIsMobile(mobileUA);
  }, []);

  useEffect(() => {
    if (phase === "timing" && currentSession.isActive) {
      timerRef.current = setInterval(() => {
        const start = currentSession.startTime || Date.now();
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, currentSession.isActive, currentSession.startTime]);

  useEffect(() => {
    const shouldNotify = isMobile || isHidden;
    if (phase === "timing" && currentSession.isActive && shouldNotify) {
      postTimerNotification(elapsed);
    }
  }, [phase, currentSession.isActive, elapsed, isHidden, isMobile, postTimerNotification]);

  useEffect(() => {
    const onVisibilityChange = () => {
      const hidden = document.hidden;
      setIsHidden(hidden);
      if (hidden && phase === "timing" && currentSession.isActive) {
        postTimerNotification(elapsed);
      } else if (!isMobile) {
        hideTimerNotification();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [phase, currentSession.isActive, elapsed, postTimerNotification, hideTimerNotification, isMobile]);

  const handleStart = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        // Ignore notification permission failure.
      }
    }

    startSession();
    setElapsed(0);
    if (isMobile || document.hidden) await postTimerNotification(0);
  };

  const handleFinish = async () => {
    const duration = endSession();
    const final = duration || elapsed;
    setFinalDuration(final);
    setPhase("details");
    await clearTimerNotification();
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg("");
    const now = new Date();
    const beijingNow = getBeijingNow();
    const selectedLocation =
      location === "__custom__"
        ? customLocation.trim() || "自定义地点"
        : location;

    const duration = finalDuration || elapsed;
    const record = {
      id: `poop-${Date.now()}`,
      startTime: now.getTime() - duration * 1000,
      endTime: now.getTime(),
      beijingTimestamp: beijingNow.beijingTimestamp,
      beijingTime: beijingNow.beijingTime,
      duration,
      hardness,
      smoothness,
      location: selectedLocation,
      mood,
      note,
      date: beijingNow.date,
    };

    try {
      await addRecord(record);
      setSavedRecord(record);
      setPhase("result");
    } catch (error) {
      setErrorMsg(`保存失败：${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = async () => {
    if (currentSession.isActive) {
      endSession();
      await clearTimerNotification();
    }
    navigate("/");
  };

  const hardnessInfo = HARDNESS_MAP[hardness - 1];

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <header className="flex items-center px-4 pt-safe pt-6 pb-3">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 rounded-xl hover:bg-amber-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-amber-800" />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold text-amber-900 pr-9">
          {phase === "timing" ? "蹲坑计时" : phase === "details" ? "记录详情" : "记录完成"}
        </h1>
      </header>

      <AnimatePresence mode="wait">
        {phase === "timing" && (
          <motion.div
            key="timing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center px-6 pt-12"
          >
            <div className="relative w-52 h-52 mb-8">
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-amber-200"
                animate={currentSession.isActive ? { rotate: 360 } : { rotate: 0 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                style={{ borderTopColor: "#f59e0b", borderRightColor: "#f59e0b" }}
              />
              <div className="absolute inset-3 rounded-full bg-white shadow-inner flex flex-col items-center justify-center">
                <span className="text-4xl font-mono font-bold text-amber-800">{formatTime(elapsed)}</span>
                <span className="text-sm text-amber-500 mt-1">
                  {currentSession.isActive ? "计时进行中" : "等待开始"}
                </span>
              </div>
            </div>

            <p className="text-amber-600 text-sm text-center mb-8">
              {currentSession.isActive
                ? "手机端会在通知栏显示并更新计时（需授权通知）"
                : "点击开始后进入计时，你可以稍后再结束并填写详情"}
            </p>

            {currentSession.isActive ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleFinish}
                className="w-full max-w-xs py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-amber-300/40"
              >
                结束计时
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleStart}
                className="w-full max-w-xs py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-emerald-300/40"
              >
                开始计时
              </motion.button>
            )}
          </motion.div>
        )}

        {phase === "details" && (
          <motion.div
            key="details"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-6 pt-4 pb-24 space-y-5"
          >
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
              <p className="text-sm text-amber-600">本次时长</p>
              <p className="text-3xl font-mono font-bold text-amber-800 mt-1">{formatTime(finalDuration)}</p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-amber-900 mb-3">硬度分型</h3>
              <div className="grid grid-cols-7 gap-1.5 mb-3">
                {HARDNESS_MAP.map((h) => (
                  <motion.button
                    key={h.level}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setHardness(h.level)}
                    className={`flex flex-col items-center py-2 rounded-xl text-xs transition-all ${
                      hardness === h.level
                        ? "bg-amber-100 ring-2 ring-amber-400 shadow-sm"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <span className="text-xl">{h.emoji}</span>
                    <span className="text-[10px] mt-0.5 text-gray-500">{h.level}型</span>
                  </motion.button>
                ))}
              </div>
              <div className="rounded-xl p-3 text-sm" style={{ backgroundColor: `${hardnessInfo.color}15` }}>
                <p className="font-bold" style={{ color: hardnessInfo.color }}>
                  {hardnessInfo.emoji} {hardnessInfo.name}
                </p>
                <p className="text-gray-600 text-xs mt-1">{hardnessInfo.description}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-amber-900 mb-3">顺畅度</h3>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <motion.button
                    key={s}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSmoothness(s)}
                    className={`flex-1 py-3 rounded-xl text-center text-sm font-medium transition-all ${
                      smoothness === s
                        ? "bg-emerald-100 ring-2 ring-emerald-400 text-emerald-700"
                        : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> 蹲坑地点
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {LOCATION_OPTIONS.map((loc) => (
                  <motion.button
                    key={loc.value}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setLocation(loc.value)}
                    className={`flex flex-col items-center py-2 rounded-xl text-xs transition-all ${
                      location === loc.value
                        ? "bg-blue-100 ring-2 ring-blue-400"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <span className="text-xl">{loc.emoji}</span>
                    <span className="mt-0.5">{loc.label}</span>
                  </motion.button>
                ))}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setLocation("__custom__")}
                  className={`flex flex-col items-center py-2 rounded-xl text-xs transition-all ${
                    location === "__custom__"
                      ? "bg-blue-100 ring-2 ring-blue-400"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <span className="text-xl">📝</span>
                  <span className="mt-0.5">自定义</span>
                </motion.button>
              </div>

              {location === "__custom__" && (
                <input
                  type="text"
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  placeholder="输入地点，例如：高铁站卫生间"
                  className="mt-3 w-full px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-200"
                />
              )}
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                <SmilePlus className="w-4 h-4" /> 心情状态
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {MOOD_OPTIONS.map((m) => (
                  <motion.button
                    key={m.value}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setMood(m.value)}
                    className={`flex flex-col items-center py-2 rounded-xl text-xs transition-all ${
                      mood === m.value
                        ? "bg-purple-100 ring-2 ring-purple-400"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <span className="text-xl">{m.emoji}</span>
                    <span className="mt-0.5">{m.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-amber-900 mb-3">心情笔记</h3>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="记录一下这次感受..."
                className="w-full h-24 p-3 bg-gray-50 rounded-xl text-sm resize-none border-0 focus:ring-2 focus:ring-amber-300 outline-none"
              />
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-amber-300/40 flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" /> {saving ? "保存中..." : "保存记录"}
            </motion.button>
            {errorMsg && <p className="text-sm text-center text-red-500">{errorMsg}</p>}
          </motion.div>
        )}

        {phase === "result" && savedRecord && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-6 pt-8 flex flex-col items-center"
          >
            <div className="text-7xl mb-4">{hardnessInfo.emoji}</div>
            <h2 className="text-2xl font-bold text-amber-900 mb-2">{hardnessInfo.name}</h2>
            <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-sm mb-4">
              <p className="text-amber-700 text-sm leading-relaxed italic">"{hardnessInfo.evaluation}"</p>
            </div>
            <div className="bg-amber-50 rounded-2xl p-4 w-full max-w-sm mb-8 text-center">
              <p className="text-sm text-amber-600">本次时长</p>
              <p className="text-2xl font-mono font-bold text-amber-800">{formatTime(savedRecord.duration)}</p>
            </div>
            <div className="flex gap-3 w-full max-w-sm">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/")}
                className="flex-1 py-3 bg-white border-2 border-amber-300 text-amber-700 rounded-xl font-medium"
              >
                返回首页
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/history")}
                className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-medium"
              >
                查看历史
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
