// src/lib/db.ts
// Supabase CRUD 헬퍼 함수 모음
import { supabase } from "./supabase";

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface DbVacancy {
  id: string;
  landmark: string;
  address: string | null;
  floor: string | null;
  lat: number;
  lng: number;
  registered_by: string | null;
  neighborhood: string;
  description: string | null;
  // 툇마루단 조사 데이터 추가
  image_url: string | null;
  deposit: number | null;
  monthly_rent: number | null;
  management_fee: number | null;
  survey_remarks: string | null;
  realtor_name: string | null;
  realtor_phone: string | null;
  created_at: string;
}

export interface DbVote {
  id: string;
  vacancy_id: string;
  user_id: string;
  category: string;
  category_icon: string | null;
  comment: string | null;
  created_at: string;
}

export interface DbUserProfile {
  id: string;
  nickname: string;
  neighborhood: string;
  lat: number;
  lng: number;
  gender: string | null;
  age_range: string | null;
  activity_times: string[] | null;
  persona_ids: string[] | null;
  persona_label: string | null;
  is_admin: boolean;
  created_at: string;
}

// ─── 사용자 프로필 ─────────────────────────────────────────────────────────

export async function saveUserProfile(profile: {
  nickname: string;
  neighborhood: string;
  lat: number;
  lng: number;
  gender?: string;
  ageRange?: string;
  activityTimes?: string[];
  personaIds?: string[];
  personaLabel?: string;
}): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .insert({
      nickname: profile.nickname,
      neighborhood: profile.neighborhood,
      lat: profile.lat,
      lng: profile.lng,
      gender: profile.gender || null,
      age_range: profile.ageRange || null,
      activity_times: profile.activityTimes || [],
      persona_ids: profile.personaIds || [],
      persona_label: profile.personaLabel || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("프로필 저장 오류:", error.message);
    return null;
  }
  return data?.id ?? null;
}

// ─── 공실(Vacancies) ──────────────────────────────────────────────────────

export async function fetchVacancies(neighborhood?: string): Promise<DbVacancy[]> {
  let query = supabase.from("vacancies").select("*").order("created_at", { ascending: false });
  if (neighborhood) {
    query = query.eq("neighborhood", neighborhood);
  }
  const { data, error } = await query;
  if (error) {
    console.error("공실 조회 오류:", error.message);
    return [];
  }
  return data ?? [];
}

export async function saveVacancy(v: {
  landmark: string;
  address: string;
  floor: string;
  lat: number;
  lng: number;
  neighborhood: string;
  userId?: string;
  // 툇마루단 데이터
  imageUrl?: string;
  deposit?: number;
  monthlyRent?: number;
  managementFee?: number;
  surveyRemarks?: string;
  realtorName?: string;
  realtorPhone?: string;
}): Promise<string | null> {
  const { data, error } = await supabase
    .from("vacancies")
    .insert({
      landmark: v.landmark,
      address: v.address,
      floor: v.floor,
      lat: v.lat,
      lng: v.lng,
      neighborhood: v.neighborhood,
      registered_by: v.userId || null,
      // 툇마루단 매핑
      image_url: v.imageUrl || null,
      deposit: v.deposit || null,
      monthly_rent: v.monthlyRent || null,
      management_fee: v.management_fee || null,
      survey_remarks: v.survey_remarks || null,
      realtor_name: v.realtor_name || null,
      realtor_phone: v.realtor_phone || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("공실 저장 오류:", error.message);
    return null;
  }
  return data?.id ?? null;
}

// ─── 투표(Votes) ──────────────────────────────────────────────────────────

export async function fetchVotesForVacancy(vacancyId: string): Promise<DbVote[]> {
  const { data, error } = await supabase
    .from("votes")
    .select("*")
    .eq("vacancy_id", vacancyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("투표 조회 오류:", error.message);
    return [];
  }
  return data ?? [];
}

export async function saveVote(v: {
  vacancyId: string;
  userId: string;
  category: string;
  categoryIcon?: string;
  comment?: string;
}): Promise<boolean> {
  const { error } = await supabase.from("votes").upsert({
    vacancy_id: v.vacancyId,
    user_id: v.userId,
    category: v.category,
    category_icon: v.categoryIcon || null,
    comment: v.comment || null,
  }, { onConflict: "vacancy_id,user_id,category" });

  if (error) {
    console.error("투표 저장 오류:", error.message);
    return false;
  }
  return true;
}

// ─── 상권 분석 집계 ───────────────────────────────────────────────────────

export interface VoteAggregation {
  category: string;
  count: number;
}

export interface DemographicSummary {
  neighborhood: string;
  totalVoters: number;
  genderRatio: { male: number; female: number };
  ageGroups: Record<string, number>;
  activityTimes: Record<string, number>;
  topCategories: VoteAggregation[];
}

export async function getNeighborhoodReport(neighborhood: string): Promise<DemographicSummary> {
  // 해당 동네 유저 가져오기
  const { data: users } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("neighborhood", neighborhood);

  // 해당 동네 공실 가져오기
  const { data: vacancies } = await supabase
    .from("vacancies")
    .select("id")
    .eq("neighborhood", neighborhood);

  const vacancyIds = (vacancies ?? []).map((v: any) => v.id);

  // 해당 공실들의 투표 가져오기
  let votes: DbVote[] = [];
  if (vacancyIds.length > 0) {
    const { data } = await supabase
      .from("votes")
      .select("*")
      .in("vacancy_id", vacancyIds);
    votes = data ?? [];
  }

  const userList: DbUserProfile[] = users ?? [];

  // 성별 집계
  const male = userList.filter(u => u.gender === "male").length;
  const female = userList.filter(u => u.gender === "female").length;

  // 연령대 집계
  const ageGroups: Record<string, number> = {};
  userList.forEach(u => {
    if (u.age_range) {
      ageGroups[u.age_range] = (ageGroups[u.age_range] || 0) + 1;
    }
  });

  // 활동시간 집계
  const activityTimes: Record<string, number> = {};
  userList.forEach(u => {
    (u.activity_times || []).forEach((t: string) => {
      activityTimes[t] = (activityTimes[t] || 0) + 1;
    });
  });

  // 업종 투표 집계
  const categoryCount: Record<string, number> = {};
  votes.forEach(v => {
    categoryCount[v.category] = (categoryCount[v.category] || 0) + 1;
  });
  const topCategories = Object.entries(categoryCount)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    neighborhood,
    totalVoters: userList.length,
    genderRatio: { male, female },
    ageGroups,
    activityTimes,
    topCategories,
  };
}
