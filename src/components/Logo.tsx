// 여긴뭐가 로고: 지도 핀 안의 빈 가게(차양)와 물음표 — "여기 뭐가 생기면 좋을까?"
// public/logo.svg, src/app/icon.svg 와 같은 그림이다.
export default function Logo({ size = 44, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label="여긴뭐가" className={className}>
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FCD34D" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#logo-bg)" />
      <path d="M32 57C32 57 13 41 13 27a19 19 0 0 1 38 0C51 41 32 57 32 57Z" fill="#0B1020" />
      <path d="M21 25.5 23.5 17h17l2.5 8.5a3.2 3.2 0 0 1-6.3 0 3.2 3.2 0 0 1-6.4 0 3.2 3.2 0 0 1-6.4 0 3.2 3.2 0 0 1-6.3 0Z" fill="#FBBF24" />
      <path d="M28.3 33.2a3.9 3.9 0 1 1 5.6 3.5c-1.4.7-1.9 1.4-1.9 2.8" fill="none" stroke="#FBBF24" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="43.8" r="1.6" fill="#FBBF24" />
    </svg>
  );
}
