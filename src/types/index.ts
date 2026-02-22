export interface PoopRecord {
  id: string;
  startTime: number;
  endTime: number;
  duration: number; // seconds
  hardness: number; // 1-7 Bristol stool scale
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

export const HARDNESS_MAP: HardnessInfo[] = [
  {
    level: 1,
    emoji: "🪨",
    name: "硬核弹丸",
    description: "分离的硬块，像坚果一样",
    evaluation: "你的肠子在闹脾气！它说：'我太干了，给我点水喝！'",
    advice: "多喝水！每天至少8杯水，增加膳食纤维摄入（燕麦、蔬菜、水果），适当运动促进肠蠕动。",
    color: "#8B4513",
  },
  {
    level: 2,
    emoji: "🌰",
    name: "坎坷香肠",
    description: "腊肠状，但表面有硬块",
    evaluation: "肠道大叔皱着眉头说：'再给我点润滑剂吧...'",
    advice: "增加水分和纤维摄入，每天吃一个苹果或一根香蕉，早起一杯温水有助排便。",
    color: "#A0522D",
  },
  {
    level: 3,
    emoji: "🌭",
    name: "裂纹战士",
    description: "腊肠状，表面有裂纹",
    evaluation: "肠道小哥说：'差一点就完美了，加油！'",
    advice: "接近理想状态！保持当前饮食，可适当增加一些酸奶或发酵食品。",
    color: "#CD853F",
  },
  {
    level: 4,
    emoji: "✨",
    name: "完美金条",
    description: "像蛇一样光滑柔软",
    evaluation: "🎉 恭喜！肠道小精灵跳起了庆祝舞：'这就是传说中的完美之作！'",
    advice: "完美状态！继续保持均衡饮食和良好作息，你的肠道非常开心！",
    color: "#FFD700",
  },
  {
    level: 5,
    emoji: "☁️",
    name: "棉花糖团",
    description: "软块状，边缘清晰",
    evaluation: "肠道管家轻声说：'稍微有点软，但还过得去~'",
    advice: "略微偏软，注意是否纤维摄入不足。可增加全谷物、根茎类蔬菜。",
    color: "#DEB887",
  },
  {
    level: 6,
    emoji: "💧",
    name: "泥浆先生",
    description: "糊状，边缘蓬松模糊",
    evaluation: "肠道医生紧张地说：'我们遇到了一些小麻烦...'",
    advice: "可能消化不良或食物不耐受，避免油腻辛辣食物，注意饮食卫生，适当补充益生菌。",
    color: "#D2691E",
  },
  {
    level: 7,
    emoji: "🌊",
    name: "洪水猛兽",
    description: "水样，无固体块",
    evaluation: "肠道消防员紧急出动：'警报！全体撤离！'",
    advice: "请注意补充水分和电解质！避免脱水，清淡饮食为主。如持续超过2天请就医。",
    color: "#B8860B",
  },
];

export const MOOD_OPTIONS: MoodOption[] = [
  { emoji: "😌", label: "舒畅", value: "relaxed" },
  { emoji: "😊", label: "开心", value: "happy" },
  { emoji: "😐", label: "一般", value: "neutral" },
  { emoji: "😣", label: "费劲", value: "struggling" },
  { emoji: "😰", label: "紧急", value: "urgent" },
  { emoji: "📱", label: "刷手机", value: "phone" },
  { emoji: "📖", label: "看书", value: "reading" },
  { emoji: "🎮", label: "打游戏", value: "gaming" },
];

export const LOCATION_OPTIONS = [
  { emoji: "🏠", label: "家里", value: "home" },
  { emoji: "🏢", label: "公司", value: "office" },
  { emoji: "🏫", label: "学校", value: "school" },
  { emoji: "🏪", label: "商场", value: "mall" },
  { emoji: "🏥", label: "医院", value: "hospital" },
  { emoji: "🚂", label: "车站", value: "station" },
  { emoji: "✈️", label: "机场", value: "airport" },
  { emoji: "🎯", label: "其他", value: "other" },
];
