import React from 'react';

export default function TermsOfService() {
  return (
    <div className="fixed inset-0 overflow-y-auto bg-slate-950 text-slate-300 p-6 md:p-12 font-sans">
      <div className="max-w-3xl mx-auto bg-slate-900 p-8 rounded-2xl border border-white/10 shadow-xl my-4">
        <h1 className="text-2xl font-black text-amber-400 mb-8 pb-4 border-b border-white/10">여긴뭐가 서비스 이용약관</h1>
        
        <div className="space-y-6 text-sm leading-relaxed">
          <p>
            '여긴뭐가' (이하 '서비스')를 이용해 주셔서 감사합니다. 본 약관은 개인사업자 채담(이하 '운영자')이 제공하는 서비스의 이용 조건과 절차, 운영자와 이용자 간의 권리·의무 및 책임사항을 규정합니다.
          </p>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">제1조 (목적)</h2>
            <p>본 약관은 운영자가 운영하는 '여긴뭐가' 서비스의 이용과 관련하여 운영자와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">제2조 (용어의 정의)</h2>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>'서비스'</strong>란 운영자가 제공하는 동네 공실 정보 공유 및 커뮤니티 플랫폼 '여긴뭐가'를 의미합니다.</li>
              <li><strong>'이용자'</strong>란 본 약관에 따라 서비스를 이용하는 모든 회원을 말합니다.</li>
              <li><strong>'공실 정보'</strong>란 이용자 또는 운영팀(툇마루단)이 등록한 비어있는 상업 공간에 관한 정보를 의미합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">제3조 (서비스 이용)</h2>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>서비스는 카카오 계정을 통한 소셜 로그인 방식으로 가입 및 이용이 가능합니다.</li>
              <li>이용자는 본 약관에 동의함으로써 서비스를 이용할 수 있습니다.</li>
              <li>미성년자의 서비스 이용은 보호자의 동의를 받아야 합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">제4조 (이용자의 의무)</h2>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>이용자는 이웃을 존중하는 매너를 지켜야 합니다.</li>
              <li>허위 공실 정보, 욕설, 타인 비방, 불법적인 상업 광고 등록 시 예고 없이 이용이 제한될 수 있습니다.</li>
              <li>이용자는 타인의 개인정보를 무단으로 수집·이용하거나 공개해서는 안 됩니다.</li>
              <li>서비스를 이용하여 얻은 정보를 운영자의 사전 동의 없이 상업적 목적으로 활용할 수 없습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">제5조 (운영자의 면책)</h2>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>여긴뭐가는 주민들의 자발적 제보로 운영됩니다. 등록된 공실 정보는 참고용이며, 플랫폼은 실제 부동산 권리관계나 거래에 대해 법적 책임을 지지 않습니다.</li>
              <li>운영자는 이용자 간 발생한 분쟁에 대해 개입할 의무가 없습니다.</li>
              <li>천재지변 또는 불가항력으로 인한 서비스 중단 시 운영자는 책임을 지지 않습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">제6조 (서비스 이용 제한)</h2>
            <p>운영자는 다음 각 호의 경우 이용자의 서비스 이용을 제한하거나 계정을 삭제할 수 있습니다.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>타인의 정보를 도용한 경우</li>
              <li>허위 정보를 반복적으로 등록한 경우</li>
              <li>서비스 운영을 방해하거나 타인에게 피해를 준 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">제7조 (분쟁 해결)</h2>
            <p>서비스 이용과 관련하여 발생한 분쟁은 대한민국 법률에 따라 관할 법원에서 해결합니다.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">제8조 (부칙)</h2>
            <p>본 약관은 서비스 오픈일로부터 시행됩니다.</p>
          </section>

          <div className="bg-white/5 p-4 rounded-lg mt-6">
            <p><strong>운영자</strong></p>
            <p>상호명: 채담</p>
            <p>사업자등록번호: 621-50-01252</p>
            <p>이메일: (운영용 이메일을 입력해주세요)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
