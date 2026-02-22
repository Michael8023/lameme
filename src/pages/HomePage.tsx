import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { usePoopStore } from "../store";

export default function HomePage() {
  const navigate = useNavigate();
  const { records } = usePoopStore();
  const todayCount = records.filter(
    (r) => r.date === new Date().toISOString().split("T")[0]
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-50 flex flex-col">
      <header className="pt-safe px-6 pt-8 pb-2">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-amber-900">排便检测器</h1>
          <p className="text-amber-600 text-sm mt-1">关爱肠道，从每一次记录开始</p>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-8">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mb-4 text-center"
        >
          <span className="text-sm text-amber-700 bg-amber-100 px-4 py-1.5 rounded-full">
            今日已记录 <strong>{todayCount}</strong> 次
          </span>
        </motion.div>

        <motion.button
          type="button"
          onClick={() => navigate("/timer")}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          className="relative w-56 h-56 rounded-full flex items-center justify-center group"
        >
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 opacity-30"
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.15, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="absolute inset-3 rounded-full bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500 shadow-xl shadow-amber-300/50 flex items-center justify-center">
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-amber-50 to-orange-100 flex flex-col items-center justify-center gap-1">
              <motion.span
                className="text-7xl leading-none"
                animate={{ rotate: [0, -5, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                🚽
              </motion.span>
              <span className="text-amber-800 font-bold text-lg mt-1">开始计时</span>
              <span className="text-amber-600 text-xs">点击进入计时页</span>
            </div>
          </div>
        </motion.button>
      </div>
    </div>
  );
}
