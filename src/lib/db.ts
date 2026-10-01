// src/lib/db.ts
// Supabase CRUD 헬퍼 함수 모음
import { supabase } from "./supabase";

// ─── 조사원(팀원) 세션 토큰 ─────────────────────────────────────────────────
const TEAM_TOKEN_KEY = "gongsil_team_token";
export function getTeamToken(): string | null {
  try { return typeof window !== "undefined" ? localStorage.getItem(TEAM_TOKEN_KEY) : null; } catch { return null; }
}
export function setTeamToken(token: string | null) {
  try {
    if (typeof window === "undefined") return;
    if (token) localStorage.setItem(TEAM_TOKEN_KEY, token);
    else localStorage.removeItem(TEAM_TOKEN_KEY);
  } catch { /* 저장소 접근 불가 시 무시 */ }
}

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
  real_name: string;
  role: "CEO" | "OPS" | "SURVEYOR";
  city: string;
  gu: string;
  dong: string;
  phone: string | null;
  hire_date: string;
  base_salary: number | null;
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

  // 동 이름 정규화: 끝의 숫자 제거 ("남가좌1동" -> "남가좌동", "남가좌2동" -> "남가좌동")
  const normalizeDong = (s: string) => s.replace(/\d+(동)$/, '$1').replace(/[\u00B7\u2027].*/, '');

  if (cityEntry) {
    // 구/군 찾기
    const guEntry = Object.entries(cityEntry[1].gus).find(([_, data]) => 
      data.name.includes(gu) || gu.includes(data.name)
    );
    if (guEntry) {
      g = guEntry[0];
      // 행정동 찾기: 완전 일치 → 양방향 includes → 정규화 동종 비교 순서
      const dongEntry = Object.entries(guEntry[1].dongs).find(([_, name]) => {
        if (name === dong || name.includes(dong) || dong.includes(name)) return true;
        // 정규화 비교: "남가좌동" ↔ "남가좌1동" 등 매칭
        return normalizeDong(name) === normalizeDong(dong);
      });
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

  // 동 이름 정규화: 끝의 숫자 제거
  const normalizeDong = (s: string) => s.replace(/\d+(동)$/, '$1').replace(/[\u00B7\u2027].*/, '');

  if (cityEntry) {
    const guEntry = Object.entries(cityEntry[1].gus).find(([_, data]) => 
      data.name.includes(gu) || gu.includes(data.name)
    );
    if (guEntry) {
      g = guEntry[0];
      const dongEntry = Object.entries(guEntry[1].dongs).find(([_, name]) => {
        if (name === dong || name.includes(dong) || dong.includes(name)) return true;
        return normalizeDong(name) === normalizeDong(dong);
      });
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

export async function fetchUserProfile(userId: string): Promise<DbUserProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("프로필 조회 오류:", error.message);
    return null;
  }
  return data;
}

export async function saveUserProfile(profile: {
  id?: string;
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
  const payload: any = {
    nickname: profile.nickname,
    neighborhood: profile.neighborhood,
    lat: profile.lat,
    lng: profile.lng,
    gender: profile.gender || null,
    age_range: profile.ageRange || null,
    activity_times: profile.activityTimes || [],
    persona_ids: profile.personaIds || [],
    persona_label: profile.personaLabel || null,
  };

  if (profile.id) {
    payload.id = profile.id;
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(payload, { onConflict: "id" })
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
    status: v.status || 'pending',
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

  // 조사원(팀원) 로그인 상태면 서버 RPC로 저장 (직접 테이블 쓰기 권한 없음)
  const teamToken = getTeamToken();
  if (teamToken) {
    const { data, error } = await supabase.rpc("staff_save_vacancy", {
      p_token: teamToken,
      p_id: v.id || null,
      p: commonPayload,
    });
    if (error) {
      console.error("공실 저장 오류:", error);
      return { id: null, error: error.message };
    }
    if (data?.error === "unauthorized") return { id: null, error: "로그인이 만료되었습니다. 다시 로그인해주세요." };
    if (data?.error) return { id: null, error: data.error === "not_found" ? "데이터를 찾을 수 없습니다." : data.error };
    return { id: data?.id ?? null, error: null };
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
    
    const savedId = data[0].id;

    // [입점 확정] status=completed 전환 시 → 투표자 전원 알림 발송 (관리자 경로. 조사원 경로는 서버에서 처리)
    if (v.status === 'completed' && v.id) {
      try {
        const storeName = v.surveyRemarks?.replace('[입점 확정] ', '') || '';
        await notifyVotersOnMovein(v.id, v.landmark || v.address || '이 공간', storeName);
      } catch (notifErr) {
        console.warn('입점 알림 발송 중 오류 (무시):', notifErr);
      }
    }

    return { id: savedId, error: null };
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
  // 1. 해당 공실에 대해 동일 유저가 이전에 남긴 투표가 있다면 완전히 삭제 (1인 1공실 1투표 권한 준수)
  const { error: deleteError } = await supabase
    .from("votes")
    .delete()
    .eq("vacancy_id", v.vacancyId)
    .eq("user_id", v.userId);

  if (deleteError) {
    console.warn("기존 투표 제거 실패 (삽입 계속 진행):", deleteError.message);
  }

  // 2. 신규 투표 삽입
  const { error } = await supabase.from("votes").insert({
    vacancy_id: v.vacancyId,
    user_id: v.userId,
    category: v.category,
    category_icon: v.categoryIcon || null,
    comment: v.comment || null,
  });

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
  const token = getTeamToken();
  if (!token) return [];
  const { data, error } = await supabase.rpc("team_list", { p_token: token });
  if (error) {
    console.error("팀원 조회 오류:", error.message);
    return [];
  }
  return (data ?? []) as TeamMember[];
}

export async function saveTeamMember(m: Partial<TeamMember> & { password?: string }): Promise<{ id: string | null; error: string | null }> {
  const token = getTeamToken();
  if (!token) return { id: null, error: "로그인이 필요합니다." };

  // ID는 동네 기존 인원수 기반으로 생성하고, 중복이면 다음 번호로 재시도 (기존 팀원을 덮어쓰지 않음)
  const existing = m.id ? [] : await fetchTeamMembers();
  const base = existing.filter(t => t.city === m.city && t.gu === m.gu && t.dong === m.dong).length;

  for (let attempt = 0; attempt < 20; attempt++) {
    const id = m.id || generateMemberId(m.city || "", m.gu || "", m.dong || "", base + 1 + attempt);
    const { data, error } = await supabase.rpc("team_create_member", {
      p_token: token,
      p: {
        id,
        password: m.password || id, // 비밀번호가 없으면 ID와 동일하게 부여
        real_name: m.real_name,
        role: m.role || "SURVEYOR",
        city: m.city,
        gu: m.gu,
        dong: m.dong,
        phone: m.phone,
        hire_date: m.hire_date,
        base_salary: m.base_salary || 0,
      },
    });
    if (error) {
      console.error("팀원 저장 오류:", error.message);
      return { id: null, error: error.message };
    }
    if (data?.error === "duplicate_id" && !m.id) continue;
    if (data?.error) return { id: null, error: data.error === "forbidden" ? "권한이 없습니다." : data.error };
    return { id: data?.id ?? id, error: null };
  }
  return { id: null, error: "사용 가능한 ID를 만들지 못했습니다." };
}

export async function updateTeamMemberPassword(newPassword: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase.rpc("team_change_password", { p_token: getTeamToken(), p_new: newPassword });
  if (error) return { error: error.message };
  if (data?.error === "too_short") return { error: "비밀번호는 6자 이상이어야 합니다." };
  if (data?.error) return { error: "권한이 없습니다. 다시 로그인해주세요." };
  setTeamToken(null);
  return { error: null };
}

export async function resetTeamMemberPassword(memberId: string, newPassword: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase.rpc("team_reset_password", { p_token: getTeamToken(), p_member_id: memberId, p_new: newPassword });
  if (error) return { error: error.message };
  if (data?.error === "too_short") return { error: "비밀번호는 6자 이상이어야 합니다." };
  if (data?.error) return { error: "권한이 없습니다." };
  return { error: null };
}

export type TeamLoginResult =
  | { member: TeamMember; error: null }
  | { member: null; error: "invalid" | "locked" | "network" };

export async function loginTeamMember(id: string, password: string): Promise<TeamLoginResult> {
  const { data, error } = await supabase.rpc("team_login", { p_id: id, p_password: password });
  if (error || !data) return { member: null, error: "network" };
  if (data.error) return { member: null, error: data.error === "locked" ? "locked" : "invalid" };
  setTeamToken(data.token);
  return { member: data.member as TeamMember, error: null };
}

/** 저장된 토큰이 아직 유효하면 팀원 정보를 돌려준다 (페이지 진입 시 세션 복원용) */
export async function restoreTeamSession(): Promise<TeamMember | null> {
  const token = getTeamToken();
  if (!token) return null;
  const { data, error } = await supabase.rpc("team_me", { p_token: token });
  if (error) return null; // 네트워크 오류: 토큰은 유지
  if (!data) { setTeamToken(null); return null; }
  return data as TeamMember;
}

export async function logoutTeamMember(): Promise<void> {
  const token = getTeamToken();
  setTeamToken(null);
  if (token) await supabase.rpc("team_logout", { p_token: token });
}

// ─── 공실 정보 정정 제보 및 회신(메시지함) ─────────────────────────────────────────

export interface DbReport {
  id: string;
  vacancy_id: string;
  user_id: string;
  report_type: 'dispute' | 'movein';
  content: string;
  status: 'pending' | 'resolved';
  reply_content: string | null;
  created_at: string;
  updated_at: string;
  // UI 결합 필드
  landmark?: string;
  address?: string;
}

export async function submitDisputeReport(report: {
  vacancyId: string;
  userId: string;
  reportType: 'dispute' | 'movein';
  content: string;
}): Promise<{ id: string | null; error: string | null }> {
  const payload = {
    vacancy_id: report.vacancyId,
    user_id: report.userId,
    report_type: report.reportType,
    content: report.content,
    status: 'pending',
    reply_content: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('reports')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    console.error("제보 저장 오류:", error.message);
    return { id: null, error: error.message };
  }
  return { id: data ? data.id : null, error: null };
}

export async function fetchUserReports(userId: string): Promise<DbReport[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error("제보 조회 오류:", error?.message);
    return [];
  }
  return data as DbReport[];
}

export async function fetchVacancyReports(vacancyId: string): Promise<DbReport[]> {
  const token = getTeamToken();
  const { data, error } = token
    ? await supabase.rpc('staff_vacancy_reports', { p_token: token, p_vacancy_id: vacancyId })
    : await supabase.from('reports').select('*').eq('vacancy_id', vacancyId).order('created_at', { ascending: false });

  if (error || !data) {
    console.error("공실 제보 조회 오류:", error?.message);
    return [];
  }
  return data as DbReport[];
}

export async function updateReportReply(reportId: string, replyContent: string): Promise<{ error: string | null }> {
  const token = getTeamToken();
  if (token) {
    const { data, error } = await supabase.rpc('staff_reply_report', { p_token: token, p_report_id: reportId, p_reply: replyContent });
    if (error) return { error: error.message };
    if (data?.error) return { error: "권한이 없거나 로그인이 만료되었습니다." };
    return { error: null };
  }
  const { error } = await supabase
    .from('reports')
    .update({
      reply_content: replyContent,
      status: 'resolved',
      updated_at: new Date().toISOString()
    })
    .eq('id', reportId);

  if (error) {
    console.error("제보 회신 저장 오류:", error.message);
    return { error: error.message };
  }
  return { error: null };
}


// ─── 알림(Notifications) ──────────────────────────────────────────────────

export interface DbNotification {
  id: string;
  user_id: string;
  type: 'movein' | 'reply' | 'system';
  title: string;
  body: string;
  vacancy_id: string | null;
  is_read: boolean;
  created_at: string;
}

/** 특정 유저의 알림 목록 조회 */
export async function fetchUserNotifications(userId: string): Promise<DbNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.warn('알림 조회 오류:', error.message);
    return [];
  }
  return (data ?? []) as DbNotification[];
}

/** 읽지 않은 알림 개수 */
export async function fetchUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) return 0;
  return count ?? 0;
}

/** 알림 읽음 처리 (단건 또는 전체) */
export async function markNotificationsRead(userId: string, notificationId?: string): Promise<void> {
  let query = supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
  if (notificationId) query = (query as any).eq('id', notificationId);
  await query;
}

/** 입점 확정 시 해당 공실 투표자 전원에게 알림 생성 */
export async function notifyVotersOnMovein(
  vacancyId: string,
  vacancyName: string,
  storeName: string
): Promise<void> {
  // 1. 해당 공실에 투표한 유저 ID 목록 수집 (중복 제거)
  const { data: votes, error: voteErr } = await supabase
    .from('votes')
    .select('user_id')
    .eq('vacancy_id', vacancyId);

  if (voteErr || !votes || votes.length === 0) return;

  const uniqueUserIds = [...new Set(votes.map((v: any) => v.user_id as string))];

  // 2. 알림 내용 구성
  const title = storeName
    ? `✨ ${vacancyName}에 '${storeName}'이(가) 입점했어요!`
    : `✨ ${vacancyName}에 새 가게가 입점했어요!`;

  const body = storeName
    ? `당신이 상상했던 공간에 실제로 가게가 생겼어요. 동네에 새 명소를 함께 응원해봐요! 🎉`
    : `당신이 투표했던 공실에 드디어 입점이 확정되었습니다. 동네 변화를 지켜봐요! 🏠`;

  // 3. 투표자 전원 알림 배치 INSERT
  const notifications = uniqueUserIds.map(userId => ({
    user_id: userId,
    type: 'movein' as const,
    title,
    body,
    vacancy_id: vacancyId,
    is_read: false,
    created_at: new Date().toISOString(),
  }));

  const { error: insertErr } = await supabase.from('notifications').insert(notifications);
  if (insertErr) console.error('알림 일괄 생성 오류:', insertErr.message);
  else console.log(`입점 알림 ${notifications.length}명에게 발송 완료`);
}


/** 일반 사용자의 제보로 공실 비고(survey_remarks)만 갱신 (다른 컬럼은 건드리지 않음) */
export async function updateVacancyRemarks(vacancyId: string, surveyRemarks: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("vacancies")
    .update({ survey_remarks: surveyRemarks, updated_at: new Date().toISOString() })
    .eq("id", vacancyId);
  return { error: error ? error.message : null };
}
