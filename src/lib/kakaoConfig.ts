// 카카오 지도 JavaScript 키. 환경변수가 있으면 그 값을 쓰고, 없으면 기존 공개 키를 쓴다.
// (JS 키는 브라우저에 노출되는 값이며, 카카오 개발자 콘솔의 JavaScript SDK 도메인 제한으로 보호한다.)
export const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "4e959900c93f0a3268a637079835bb73";
export const KAKAO_LIBRARIES: ("services")[] = ["services"];