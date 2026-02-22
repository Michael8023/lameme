export interface PoopRecord {
  id: string;
  startTime: number;
  endTime: number;
  beijingTimestamp: number; // epoch ms, recorded at Asia/Shanghai context
  beijingTime: string; // YYYY-MM-DD HH:mm:ss in Asia/Shanghai
  duration: number; // seconds
  hardness: number; // 1-7
  smoothness: number; // 1-5
  location: string;
  mood: string;
  note: string;
  date: string; // YYYY-MM-DD
}

export interface HardnessInfo {
  level: number;
  emoji: string;
  name: string;
  description: string;
  evaluation: string;
  advice: string;
  color: string;
}

export interface MoodOption {
  emoji: string;
  label: string;
  value: string;
}

export interface LocationOption {
  emoji: string;
  label: string;
  value: string;
}

// 按用户需求定义的 7 种“屎的种类”
export const HARDNESS_MAP: HardnessInfo[] = [
  {
    level: 1,
    emoji: "👻",
    name: "幽灵屎",
    description: "已经感觉拉出来了，但马桶里几乎找不到踪影。",
    evaluation: "隐身技能满点，存在感极低。",
    advice: "保持当前饮食规律，继续观察水分和纤维摄入。",
    color: "#8b5cf6",
  },
  {
    level: 2,
    emoji: "🧻",
    name: "清白屎",
    description: "马桶看得见，但纸上几乎没痕迹。",
    evaluation: "收尾干净利落，省纸达人。",
    advice: "继续保持作息与饮水，稳定输出最重要。",
    color: "#06b6d4",
  },
  {
    level: 3,
    emoji: "💧",
    name: "濡湿屎",
    description: "擦很多次仍感觉没擦干净。",
    evaluation: "湿度偏高，清洁成本上升。",
    advice: "减少油腻辛辣，注意膳食均衡，必要时补充益生菌。",
    color: "#0ea5e9",
  },
  {
    level: 4,
    emoji: "🔁",
    name: "续摊屎",
    description: "本以为结束，结果还要再来一轮。",
    evaluation: "分段输出，节奏有点拖沓。",
    advice: "如厕时尽量专注，放松腹部，避免久蹲与分心。",
    color: "#f59e0b",
  },
  {
    level: 5,
    emoji: "😤",
    name: "额头青筋暴裂屎",
    description: "排便费力，需要明显用力。",
    evaluation: "阻力较高，体验偏艰难。",
    advice: "增加饮水和膳食纤维，适当运动，必要时咨询医生。",
    color: "#f97316",
  },
  {
    level: 6,
    emoji: "😌",
    name: "如释重负屎",
    description: "量大且排完明显轻松。",
    evaluation: "一次释放，幸福感显著提升。",
    advice: "状态不错，继续保持规律饮食与睡眠。",
    color: "#22c55e",
  },
  {
    level: 7,
    emoji: "🏆",
    name: "豪华加长屎",
    description: "体量惊人，担心冲不下去。",
    evaluation: "体积拉满，压迫感十足。",
    advice: "注意补水与排便节奏，避免长时间憋便。",
    color: "#ef4444",
  },
];

export const MOOD_OPTIONS: MoodOption[] = [
  { emoji: "😌", label: "舒畅", value: "relaxed" },
  { emoji: "😊", label: "开心", value: "happy" },
  { emoji: "😐", label: "一般", value: "neutral" },
  { emoji: "😣", label: "费劲", value: "struggling" },
  { emoji: "😰", label: "紧急", value: "urgent" },
  { emoji: "📱", label: "刷手机", value: "phone" },
  { emoji: "📚", label: "看书", value: "reading" },
  { emoji: "🎮", label: "打游戏", value: "gaming" },
];

export const LOCATION_OPTIONS: LocationOption[] = [
  { emoji: "🏠", label: "家里", value: "home" },
  { emoji: "🏢", label: "公司", value: "office" },
  { emoji: "🏫", label: "学校", value: "school" },
  { emoji: "🛍️", label: "商场", value: "mall" },
  { emoji: "🏥", label: "医院", value: "hospital" },
  { emoji: "🚉", label: "车站", value: "station" },
  { emoji: "✈️", label: "机场", value: "airport" },
  { emoji: "📍", label: "其他", value: "other" },
];

