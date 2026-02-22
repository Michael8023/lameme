import type { PoopRecord } from "../types";
import { supabase } from "./supabase";

export interface UserProfile {
  nickname: string;
  avatarUrl: string;
  heightCm: number | null;
  weightKg: number | null;
  age: number | null;
}

type PoopRow = {
  id: string;
  user_id: string;
  start_time: number;
  end_time: number;
  beijing_timestamp: number;
  beijing_time: string;
  duration: number;
  hardness: number;
  smoothness: number;
  location: string;
  mood: string;
  note: string;
  date: string;
};

type ProfileRow = {
  nickname: string | null;
  avatar_url: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  age: number | null;
};

const defaultProfile: UserProfile = {
  nickname: "",
  avatarUrl: "",
  heightCm: null,
  weightKg: null,
  age: null,
};

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  const userId = data.user?.id;
  if (!userId) throw new Error("未登录");
  return userId;
}

function mapRowToRecord(row: Partial<PoopRow> & Record<string, any>): PoopRecord {
  return {
    id: String(row.id),
    startTime: Number(row.start_time ?? row.startTime ?? 0),
    endTime: Number(row.end_time ?? row.endTime ?? 0),
    beijingTimestamp: Number(row.beijing_timestamp ?? row.beijingTimestamp ?? Date.now()),
    beijingTime: String(row.beijing_time ?? row.beijingTime ?? ""),
    duration: Number(row.duration ?? 0),
    hardness: Number(row.hardness ?? 4),
    smoothness: Number(row.smoothness ?? 3),
    location: String(row.location ?? "home"),
    mood: String(row.mood ?? "relaxed"),
    note: String(row.note ?? ""),
    date: String(row.date ?? ""),
  };
}

function mapRecordToRow(record: PoopRecord, userId: string) {
  return {
    id: record.id,
    user_id: userId,
    start_time: record.startTime,
    end_time: record.endTime,
    beijing_timestamp: record.beijingTimestamp,
    beijing_time: record.beijingTime,
    duration: record.duration,
    hardness: record.hardness,
    smoothness: record.smoothness,
    location: record.location,
    mood: record.mood,
    note: record.note,
    date: record.date,
  };
}

export async function fetchCloudState() {
  const userId = await getCurrentUserId();

  const [{ data: recordRows, error: recordsError }, { data: settingsRow, error: settingsError }, { data: profileRow, error: profileError }] = await Promise.all([
    supabase
      .from("poop_records")
      .select("*")
      .eq("user_id", userId)
      .order("beijing_timestamp", { ascending: false, nullsFirst: false })
      .order("start_time", { ascending: false }),
    supabase.from("user_settings").select("hourly_salary").eq("user_id", userId).maybeSingle(),
    supabase
      .from("profiles")
      .select("nickname, avatar_url, height_cm, weight_kg, age")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (recordsError) throw new Error(recordsError.message);
  if (settingsError) throw new Error(settingsError.message);
  if (profileError) throw new Error(profileError.message);

  const records = (recordRows ?? []).map((row) => mapRowToRecord(row as Record<string, any>));

  const hourlySalary = Math.max(1, Number(settingsRow?.hourly_salary ?? 1));
  if (!settingsRow) {
    const { error } = await supabase.from("user_settings").upsert(
      { user_id: userId, hourly_salary: hourlySalary },
      { onConflict: "user_id" }
    );
    if (error) throw new Error(error.message);
  }

  const profile: UserProfile = {
    nickname: profileRow?.nickname ?? "",
    avatarUrl: profileRow?.avatar_url ?? "",
    heightCm: profileRow?.height_cm ?? null,
    weightKg: profileRow?.weight_kg ?? null,
    age: profileRow?.age ?? null,
  };

  return { records, hourlySalary, profile };
}

export async function createRecord(record: PoopRecord) {
  const userId = await getCurrentUserId();
  const payload = mapRecordToRow(record, userId);
  const { error } = await supabase.from("poop_records").insert(payload);
  if (error) throw new Error(error.message);
}

export async function patchRecord(id: string, patch: Partial<PoopRecord>) {
  const userId = await getCurrentUserId();
  const payload: Record<string, unknown> = {};

  if (patch.startTime !== undefined) payload.start_time = patch.startTime;
  if (patch.endTime !== undefined) payload.end_time = patch.endTime;
  if (patch.beijingTimestamp !== undefined) payload.beijing_timestamp = patch.beijingTimestamp;
  if (patch.beijingTime !== undefined) payload.beijing_time = patch.beijingTime;
  if (patch.duration !== undefined) payload.duration = patch.duration;
  if (patch.hardness !== undefined) payload.hardness = patch.hardness;
  if (patch.smoothness !== undefined) payload.smoothness = patch.smoothness;
  if (patch.location !== undefined) payload.location = patch.location;
  if (patch.mood !== undefined) payload.mood = patch.mood;
  if (patch.note !== undefined) payload.note = patch.note;
  if (patch.date !== undefined) payload.date = patch.date;

  const { error } = await supabase
    .from("poop_records")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function removeRecord(id: string) {
  const userId = await getCurrentUserId();
  const { error } = await supabase.from("poop_records").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function removeAllRecords() {
  const userId = await getCurrentUserId();
  const { error } = await supabase.from("poop_records").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function saveHourlySalary(hourlySalary: number) {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: userId, hourly_salary: Math.max(1, hourlySalary) }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

export async function saveProfile(patch: Partial<UserProfile>) {
  const userId = await getCurrentUserId();

  const payload = {
    user_id: userId,
    nickname: patch.nickname ?? "",
    avatar_url: patch.avatarUrl ?? "",
    height_cm: patch.heightCm ?? null,
    weight_kg: patch.weightKg ?? null,
    age: patch.age ?? null,
  };

  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

export const cloudDefaults = {
  profile: defaultProfile,
};
