import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="fixed inset-0 overflow-y-auto bg-slate-950 text-slate-300 p-6 md:p-12 font-sans">
      <div className="max-w-3xl mx-auto bg-slate-900 p-8 rounded-2xl border border-white/10 shadow-xl my-4">
        <h1 className="text-2xl font-black text-amber-400 mb-8 pb-4 border-b border-white/10">여긴뭐가 개인정보 처리방침</h1>
        
        <div className="space-y-6 text-sm leading-relaxed">
          <p>
            '여긴뭐가' (이하 '서비스')는 이용자의 개인정보를 중요하게 생각하며, "개인정보보호법" 등 관련 법령을 준수하고 있습니다.
            본 개인정보 처리방침을 통해 이용자가 제공하는 개인정보가 어떠한 용도와 방식으로 이용되고 있는지 안내해 드립니다.
          </p>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">1. 수집하는 개인정보 항목 및 수집 방법</h2>
            <p>운영자(개인사업자 채담)는 서비스 제공을 위해 아래와 같은 개인정보를 수집하고 있습니다.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>필수항목:</strong> 카카오 계정 식별자, 닉네임, 페르소나 데이터(설정된 성별, 연령대, 활동 시간 등), 접속 위치정보(GPS 기반 동네 인증용)</li>
              <li><strong>선택항목:</strong> 프로필 사진, 카카오톡 채널 추가 여부(마케팅 수신 동의 시)</li>
              <li><strong>자동수집항목:</strong> 서비스 이용 기록, 접속 로그, 쿠키, 접속 IP 정보</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">2. 개인정보의 수집 및 이용 목적</h2>
            <p>운영자는 수집한 개인정보를 다음의 목적을 위해 활용합니다.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>회원 관리:</strong> 본인 확인, 불량 회원의 부정 이용 방지, 가입 의사 확인</li>
              <li><strong>서비스 제공:</strong> 위치 기반 공실 정보 표시, 사용자 간 커뮤니티 투표 기능 제공</li>
              <li><strong>신규 서비스 개발 및 통계:</strong> <strong><span className="text-amber-400">수집된 페르소나 및 투표 데이터는 통계 작성, 학술 연구 또는 상권분석 리포트(B2B/B2C) 판매 시 개인을 전혀 특정할 수 없는 비식별화(가명/익명)된 통계 데이터 형태로만 가공되어 활용 및 제공됩니다.</span></strong></li>
              <li><strong>마케팅 및 광고 (동의 시):</strong> 신규 서비스(제품) 개발 및 특화, 이벤트 등 광고성 정보 전달</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">3. 개인정보의 보유 및 이용 기간</h2>
            <p>원칙적으로, 개인정보 수집 및 이용 목적이 달성된 후(회원 탈퇴 시)에는 해당 정보를 지체 없이 파기합니다. 단, 관계법령의 규정에 의하여 보존할 필요가 있는 경우 운영자는 아래와 같이 관계법령에서 정한 일정한 기간 동안 회원정보를 보관합니다.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
              <li>접속에 관한 기록보존: 3개월 (통신비밀보호법)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">4. 개인정보의 파기절차 및 방법</h2>
            <p>운영자는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체없이 파기합니다. 파기절차 및 방법은 다음과 같습니다.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>파기절차:</strong> 목적이 달성된 정보는 별도의 DB로 옮겨져 내부 방침 및 기타 관련 법령에 의한 정보보호 사유에 따라 일정 기간 저장된 후 파기됩니다.</li>
              <li><strong>파기방법:</strong> 전자적 파일형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">5. 위치정보의 수집 및 이용</h2>
            <p>운영자는 사용자의 현재 위치를 기반으로 '동네 인증'을 수행하기 위해 일회성으로 GPS 좌표를 수집합니다. 인증된 위치정보는 단순 주소(동 단위) 텍스트로만 변환되어 저장되며, 사용자의 실시간 이동 경로를 별도로 추적하거나 서버에 영구적으로 기록하지 않습니다.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">6. 개인정보 보호책임자</h2>
            <p>운영자는 고객의 개인정보를 보호하고 개인정보와 관련한 불만을 처리하기 위하여 아래와 같이 관련 부서 및 개인정보 보호책임자를 지정하고 있습니다.</p>
            <div className="bg-white/5 p-4 rounded-lg mt-3">
              <p><strong>개인정보 보호책임자</strong></p>
              <p>성명: 최보람</p>
              <p>이메일: (운영용 이메일을 입력해주세요)</p>
            </div>
            <p className="mt-3">이용자는 서비스의 이용과정에서 발생하는 모든 개인정보보호 관련 민원을 개인정보 보호책임자 혹은 담당부서로 신고하실 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">7. 부칙</h2>
            <p>본 방침은 서비스 오픈일로부터 시행됩니다.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
