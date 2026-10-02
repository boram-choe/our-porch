// 현재 집중 운영 지역. 지역을 넓힐 때는 이 목록만 고치면 된다.
export const LAUNCH_AREA = {
  label: "서대문구 남가좌동·북가좌동",
  dongs: ["남가좌동", "북가좌동"],
};

// "남가좌1동" → "남가좌동"
const normalizeDong = (s: string) => s.trim().replace(/\d+(동)$/, "$1");

/** 집중 운영 지역(남가좌동·북가좌동) 안의 공간인지 */
export function isLaunchArea(neighborhood?: string | null): boolean {
  if (!neighborhood) return false;
  const n = normalizeDong(neighborhood);
  return LAUNCH_AREA.dongs.some((d) => normalizeDong(d) === n);
}
