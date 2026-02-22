import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Calendar, DollarSign, History, Home } from "lucide-react";

const NAV_ITEMS = [
  { icon: Home, label: "蹲坑", path: "/", color: "text-orange-600" },
  { icon: Calendar, label: "日历", path: "/calendar", color: "text-emerald-600" },
  { icon: History, label: "历史", path: "/history", color: "text-blue-600" },
  { icon: DollarSign, label: "薪酬", path: "/salary", color: "text-amber-700" },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed left-0 right-0 bottom-0 z-40 px-4 pb-safe pb-3">
      <div className="mx-auto max-w-lg rounded-2xl border border-white/60 bg-white/90 p-2 shadow-xl backdrop-blur-md">
        <div className="grid grid-cols-4 gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.path === "/"
              ? location.pathname === "/" || location.pathname === "/timer"
              : location.pathname === item.path ||
                location.pathname.startsWith(`${item.path}/`);

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 transition ${
                  isActive ? "bg-gray-100" : "hover:bg-gray-50"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full ${
                    isActive ? "bg-white shadow-sm ring-1 ring-gray-200" : ""
                  }`}
                >
                  <item.icon
                    className={`h-4 w-4 ${item.color} ${
                      isActive ? "stroke-[2.5]" : "stroke-[2]"
                    }`}
                  />
                </span>
                <span
                  className={`text-xs ${
                    isActive ? "font-semibold text-gray-900" : "text-gray-500"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
