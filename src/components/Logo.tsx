// 여긴뭐가 로고: 열린 지도 핀의 윤곽이 물음표가 되고, 핀 아래 점이 물음표의 점이 된다.
// public/logo.svg, src/app/icon.svg 와 같은 그림이다.
export default function Logo({ size = 44, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label="여긴뭐가" className={className}>
      <rect width="64" height="64" rx="16" fill="#F59E0B" />
      <path d="M32 45C32 45 17 35 17 24.5a15 15 0 0 1 30 0c0 5-3.5 8.5-8 11.2" fill="none" stroke="#0B1020" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="54" r="4.2" fill="#0B1020" />
    </svg>
  );
}
