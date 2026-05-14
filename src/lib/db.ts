// src/lib/db.ts
// Supabase CRUD 헬퍼 함수 모음
import { supabase } from "./supabase";

// ─── 타입 ────────────────────────────────────────────────────────────────────

// 사진 업로드 함수
export async function uploadImage(file: File): Promise<string | null> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = `images/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('vacancies')
    .upload(filePath, file);

  if (uploadError) {
    console.error("이미지 업로드 오류:", uploadError.message);
    return null;
  }

  const { data } = supabase.storage
    .from('vacancies')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

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
  area: string | null;
  vacancy_period: string | null;
  images: string | null; // 다중 이미지 URL (쉼표로 구분된 문자열)
  status: string | null; // available, completed, hidden, merged, rejected
  hidden_reason: string | null; // 공실아님, 관계자요청, 기타
  hidden_comment: string | null; // 상세 사유
  merged_into_id: string | null; // 통합된 대상 공실 ID
  rejection_reason: string | null; // 사용자 제보 거절/비공개 사유
  created_at: string;
  updated_at: string;
  last_modified_by: string | null;
  display_id: string | null;
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

export interface TeamMember {
  id: string;
  password: string;
  real_name: string;
  role: "CEO" | "OPS" | "SURVEYOR";
  city: string;
  gu: string;
  dong: string;
  phone: string;
  hire_date: string;
  base_salary: number;
}


// ─── 숫자 ID 체계 매핑 (2-2-2-4) ──────────────────────────────────────────────
import regionsData from "../data/regions.json";

const regions = regionsData as Record<string, { 
  name: string, 
  gus: Record<string, { 
    name: string, 
    dongs: Record<string, string> 
  }> 
}>;

export const generateSpaceId = (city: string, gu: string, dong: string, serial: number) => {
  // 시/도 찾기 (예: "서울" -> "서울특별시")
  const cityEntry = Object.entries(regions).find(([_, data]) => 
    data.name.includes(city) || city.includes(data.name)
  );
  const c = cityEntry ? cityEntry[0] : "99";

  let g = "99";
  let d = "99";

  if (cityEntry) {
    // 구/군 찾기
    const guEntry = Object.entries(cityEntry[1].gus).find(([_, data]) => 
      data.name.includes(gu) || gu.includes(data.name)
    );
    if (guEntry) {
      g = guEntry[0];
      // 행정동 찾기
      const dongEntry = Object.entries(guEntry[1].dongs).find(([_, name]) => 
        name.includes(dong) || dong.includes(name)
      );
      if (dongEntry) {
        d = dongEntry[0];
      }
    }
  }

  const s = String(serial).padStart(4, '0');
  return `${c}${g}${d}${s}`;
};

export const generateMemberId = (city: string, gu: string, dong: string, serial: number) => {
  // 시/도 찾기
  const cityEntry = Object.entries(regions).find(([_, data]) => 
    data.name.includes(city) || city.includes(data.name)
  );
  const c = cityEntry ? cityEntry[0] : "99";

  let g = "99";
  let d = "99";

  if (cityEntry) {
    const guEntry = Object.entries(cityEntry[1].gus).find(([_, data]) => 
      data.name.includes(gu) || gu.includes(data.name)
    );
    if (guEntry) {
      g = guEntry[0];
      const dongEntry = Object.entries(guEntry[1].dongs).find(([_, name]) => 
        name.includes(dong) || dong.includes(name)
      );
      if (dongEntry) {
        d = dongEntry[0];
      }
    }
  }

  const s = String(serial).padStart(2, '0');
  return `${c}${g}${d}${s}`;
};


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
    .select("id");

  if (error) {
    console.error("프로필 저장 오류:", error.message);
    return null;
  }
  return (data && data.length > 0) ? data[0].id : null;
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
  vacancyPeriod?: string | null;
  // 툇마루단 데이터
  imageUrl?: string | null;
  deposit?: number | null;
  monthlyRent?: number | null;
  managementFee?: number | null;
  surveyRemarks?: string | null;
  realtorName?: string | null;
  realtorPhone?: string | null;
  area?: string | null;
  images?: string[]; // 다중 이미지 배열
  status?: string | null;
  hiddenReason?: string | null;
  hiddenComment?: string | null;
  mergedIntoId?: string | null;
  rejectionReason?: string | null;
  lastModifiedBy?: string | null;
  displayId?: string | null;
  id?: string | null; // 기존 공실 수정용 ID
}): Promise<{ id: string | null; error: string | null }> {
  const commonPayload = {
    landmark: v.landmark,
    address: v.address,
    floor: v.floor,
    lat: v.lat,
    lng: v.lng,
    neighborhood: v.neighborhood,
    registered_by: v.userId || null,
    vacancy_period: v.vacancyPeriod || null,
    image_url: (v.images && v.images.length > 0) ? v.images[0] : (v.imageUrl || null),
    deposit: v.deposit ?? null,
    monthly_rent: v.monthlyRent ?? null,
    management_fee: v.managementFee ?? null,
    survey_remarks: v.surveyRemarks || null,
    realtor_name: v.realtorName || null,
    realtor_phone: v.realtorPhone || null,
    area: v.area || null,
    images: v.images && v.images.length > 0 ? v.images.join(',') : null,
    status: v.status || 'available',
    hidden_reason: v.hiddenReason || null,
    hidden_comment: v.hiddenComment || null,
    merged_into_id: v.mergedIntoId || null,
    rejection_reason: v.rejectionReason || null,
    last_modified_by: v.lastModifiedBy || null,
    updated_at: new Date().toISOString(),
  } as any;

  // 신규 등록 시에만 고유 ID 자동 생성
  if (!v.id && !v.displayId) {
    const { count } = await supabase
      .from('vacancies')
      .select('*', { count: 'exact', head: true })
      .eq('neighborhood', v.neighborhood);
    
    // 주소에서 시/도 및 구/군 추출 (예: "서울특별시 서대문구..." -> "서울특별시", "서대문구")
    const addrParts = (v.address || "").split(' ');
    const city = addrParts[0] || "서울";
    const gu = addrParts[1] || "서대문구";
    
    commonPayload.display_id = generateSpaceId(city, gu, v.neighborhood || "", (count || 0) + 1);
  } else if (v.displayId) {
    commonPayload.display_id = v.displayId;
  }

  if (v.id) {
    // 기존 공실 업데이트
    console.log("공실 업데이트 시도 ID:", v.id, "데이터:", commonPayload);
    const { data, error, count } = await supabase
      .from("vacancies")
      .update(commonPayload)
      .eq("id", v.id)
      .select("id");
    
    if (error) {
      console.error("공실 업데이트 오류:", error);
      return { id: null, error: error.message };
    }
    
    // [추가] 통합(merged) 처리 시 투표 및 댓글 이관 로직
    if (v.status === 'merged' && v.mergedIntoId) {
      try {
        // 1. 통합 대상 공실의 UUID(id) 찾기
        const { data: targetVacancy } = await supabase
          .from('vacancies')
          .select('id')
          .eq('display_id', v.mergedIntoId.trim())
          .single();

        if (targetVacancy) {
          // 2. 투표(votes) 이관
          const { error: voteError } = await supabase
            .from('votes')
            .update({ vacancy_id: targetVacancy.id })
            .eq('vacancy_id', v.id);
          
          if (voteError) console.error("투표 이관 오류:", voteError.message);

          // 3. 댓글(comments) 이관
          const { error: commentError } = await supabase
            .from('comments')
            .update({ vacancy_id: targetVacancy.id })
            .eq('vacancy_id', v.id);

          if (commentError) console.error("댓글 이관 오류:", commentError.message);
          
          console.log(`공실 ${v.id}의 데이터가 ${targetVacancy.id}로 이관되었습니다.`);
        }
      } catch (mergeErr) {
        console.error("통합 이관 처리 중 예외 발생:", mergeErr);
      }
    }
    
    if (!data || data.length === 0) {
      console.warn("업데이트된 행이 없음. 권한 문제일 가능성이 큼.");
      return { id: null, error: "데이터를 찾을 수 없거나 수정 권한이 없습니다. (DB 정책 확인 필요)" };
    }
    
    return { id: data[0].id, error: null };
  } else {
    // 신규 공실 등록
    console.log("신규 공실 등록 시도:", commonPayload);
    const { data, error } = await supabase
      .from("vacancies")
      .insert(commonPayload)
      .select("id");
    
    if (error) {
      console.error("공실 등록 오류:", error);
      return { id: null, error: error.message };
    }
    
    if (!data || data.length === 0) {
      return { id: null, error: "데이터 등록에 실패했습니다." };
    }
    
    return { id: data[0].id, error: null };
  }
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

// ─── 팀원 관리 (Team Members) ──────────────────────────────────────────────

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("팀원 조회 오류:", error.message);
    return [];
  }
  return data ?? [];
}

export async function saveTeamMember(m: Partial<TeamMember>): Promise<{ id: string | null; error: string | null }> {
  // ID 자동 생성 로직 (해당 동네의 기존 인원수 기반)
  let generatedId = m.id;
  if (!generatedId) {
    const { count } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('city', m.city)
      .eq('gu', m.gu)
      .eq('dong', m.dong);
    
    generatedId = generateMemberId(m.city || "", m.gu || "", m.dong || "", (count || 0) + 1);
  }

  const payload = {
    id: generatedId,
    password: m.password || generatedId, // 비밀번호가 없으면 ID와 동일하게 부여
    real_name: m.real_name,
    role: m.role || 'SURVEYOR',
    city: m.city,
    gu: m.gu,
    dong: m.dong,
    phone: m.phone,
    hire_date: m.hire_date || new Date().toISOString().split('T')[0],
    base_salary: m.base_salary || 0,
  };


  const { data, error } = await supabase
    .from("team_members")
    .upsert(payload)
    .select("id");

  if (error) {
    console.error("팀원 저장 오류:", error.message);
    return { id: null, error: error.message };
  }

  return { id: (data && data.length > 0) ? data[0].id : null, error: null };
}

export async function updateTeamMemberPassword(id: string, newPassword: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('team_members')
    .update({ password: newPassword })
    .eq('id', id);
  return { error: error ? error.message : null };
}

export async function loginTeamMember(id: string, password: string): Promise<TeamMember | null> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('id', id.trim())
    .eq('password', password.trim())
    .single();
  
  if (error || !data) return null;
  return data;
}

