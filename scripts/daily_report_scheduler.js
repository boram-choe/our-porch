const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

// Next.js 환경변수 로더 적용 (.env.local 로드)
try {
  const { loadEnvConfig } = require('@next/env');
  loadEnvConfig(process.cwd());
  console.log("Next.js 환경 변수를 성공적으로 로드했습니다.");
} catch (e) {
  console.warn("Next.js 환경 변수 로더 로드 실패. process.env로 직접 대체합니다.");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pgqpttycdzbeidyfsniq.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_cqIWlwKAk46diZeW-PnJxg_Jy4en7yd';
const supabase = createClient(supabaseUrl, supabaseKey);

// 메일 발송 수신자
const TARGET_EMAIL = 'amychoe1529@gmail.com';

// 툇마루단 조사원 및 팀 멤버 실명/역할 매핑
const MEMBER_MAP = {
  'ceo': '최보람 (대표)',
  'ops01': '김팀장 (운영자)',
  '11010101': '박주민 (툇마루단 조사원)',
  's01': '박주민 (툇마루단 조사원)'
};

function getReporterName(id) {
  if (!id) return '게스트 (비회원)';
  if (MEMBER_MAP[id]) return MEMBER_MAP[id];
  
  if (id.length > 20) {
    return `${id.substring(0,8)}... (인증회원)`;
  }
  return id;
}

async function run() {
  console.log("=== [여긴뭐가] 데일리 실시간 비즈니스 & 조사 보고서 생성 시작 ===");

  const kstNow = new Date();
  const startTime = new Date(kstNow.getTime() - 24 * 60 * 60 * 1000).toISOString(); // 24시간 전
  const endTime = kstNow.toISOString();

  console.log(`집계 기간 (UTC): ${startTime} ~ ${endTime}`);

  try {
    // 1. 공실 데이터 전체 미리 조회 (인메모리 조인용 및 툇마루단 미비용)
    const { data: allVacancies, error: errVac } = await supabase
      .from('vacancies')
      .select('*')
      .order('created_at', { ascending: false });

    if (errVac) throw errVac;

    // 2. 미결 제보내역 쿼리 (status = 'pending')
    const { data: pendingReports, error: errRep } = await supabase
      .from('reports')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (errRep) throw errRep;

    // 인메모리 수동 매핑 (DB 외래키 제약조건 부재 시 안정적 동작 보장)
    pendingReports.forEach(r => {
      r.vacancies = allVacancies.find(v => v.id === r.vacancy_id) || null;
    });

    // 3. 툇마루단 즉각 실사 확인 필요 공실 분류
    const pendingVacancies = allVacancies.filter(v => {
      const isMissingDetails = v.deposit === null || v.monthly_rent === null || v.image_url === null;
      const isNotCompleted = v.status !== 'completed' && v.status !== 'hidden' && v.status !== 'merged';
      return isMissingDetails && isNotCompleted;
    });

    // 4. 신규 활동 통계 (최근 24시간 내 발생 지표)
    const { data: newUsers } = await supabase.from('user_profiles').select('*').gte('created_at', startTime).lte('created_at', endTime);
    const { data: newVotes } = await supabase.from('votes').select('*').gte('created_at', startTime).lte('created_at', endTime);
    const { data: newComments } = await supabase.from('comments').select('*').gte('created_at', startTime).lte('created_at', endTime);

    // 5. UUID별 전체 누적 상상 포인트 & 랭킹 집계
    const { data: allUsers } = await supabase.from('user_profiles').select('*');
    const { data: allVotes } = await supabase.from('votes').select('*');
    const { data: allComments } = await supabase.from('comments').select('*');

    const rankings = allUsers.map(u => {
      const userVotes = allVotes.filter(v => v.user_id === u.id);
      const userComments = allComments.filter(c => c.user_id === u.id);
      const score = (userVotes.length * 50) + (userComments.length * 50);
      return {
        nickname: u.nickname,
        uuid: u.id,
        votesCount: userVotes.length,
        commentsCount: userComments.length,
        score
      };
    }).sort((a, b) => b.score - a.score).slice(0, 5);

    // ==========================================
    // 📨 프리미엄 HTML 메일 템플릿 빌드
    // ==========================================
    let reportsHtml = "";
    if (pendingReports.length === 0) {
      reportsHtml = `<p style="color: #64748b; font-size: 13px; text-align: center; padding: 20px; border: 1px dashed #cbd5e1; border-radius: 12px; margin: 0;">현재 해결 대기 중인 주민 분쟁/등록 제보내역이 없습니다. 🎉</p>`;
    } else {
      pendingReports.forEach((r, i) => {
        reportsHtml += `
          <div style="background-color: #f8fafc; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 12px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-weight: 900; font-size: 13px; color: #1e293b; background-color: #fef3c7; color: #d97706; padding: 2px 8px; border-radius: 999px;">제보 #${i+1} [접수]</span>
              <span style="font-size: 11px; color: #94a3b8;">${new Date(r.created_at).toLocaleString('ko-KR')}</span>
            </div>
            <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>제보 내용</strong>: "${r.content}"</p>
            <p style="margin: 4px 0; font-size: 12px; color: #64748b;">📍 <strong>대상 공실</strong>: ${r.vacancies ? r.vacancies.landmark : '미매핑 공실'}</p>
            <p style="margin: 4px 0; font-size: 12px; color: #0f172a;">🆔 <strong>공실 ID</strong>: <code style="background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 11px;">${r.vacancies ? (r.vacancies.display_id || r.vacancies.id) : '없음'}</code></p>
            <p style="margin: 4px 0; font-size: 11px; color: #94a3b8;">👤 제보 유저 UUID: ${r.user_id}</p>
          </div>
        `;
      });
    }

    let vacanciesHtml = "";
    if (pendingVacancies.length === 0) {
      vacanciesHtml = `<tr><td colspan="6" style="color: #64748b; font-size: 13px; text-align: center; padding: 20px; border: 1px dashed #cbd5e1; border-radius: 12px; margin: 0;">조사원 실사가 필요한 미비 공실이 없습니다. 완벽합니다! ✨</td></tr>`;
    } else {
      pendingVacancies.forEach((v, i) => {
        const missing = [];
        if (v.deposit === null) missing.push("💸 보증금");
        if (v.monthly_rent === null) missing.push("💸 월세");
        if (v.image_url === null) missing.push("📸 현장 실사사진");

        vacanciesHtml += `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 8px; font-size: 13px; font-weight: bold; color: #0f172a;">${v.landmark}</td>
            <td style="padding: 12px 8px; font-size: 11px; color: #475569; font-family: monospace;"><code>${v.display_id || v.id}</code></td>
            <td style="padding: 12px 8px; font-size: 12px; color: #334155;">${v.address || '상세주소 미비'}</td>
            <td style="padding: 12px 8px; font-size: 11px; color: #ef4444; font-weight: bold;">${missing.join(', ')}</td>
            <td style="padding: 12px 8px; font-size: 12px; color: #475569; font-weight: bold;">${getReporterName(v.registered_by)}</td>
            <td style="padding: 12px 8px; font-size: 11px; color: #94a3b8;">${new Date(v.created_at).toLocaleDateString('ko-KR')}</td>
          </tr>
        `;
      });
    }

    let rankingsHtml = "";
    rankings.forEach((rk, i) => {
      rankingsHtml += `
        <tr style="border-bottom: 1px solid #f1f5f9; background-color: ${i===0 ? '#fffbeb' : '#ffffff'};">
          <td style="padding: 10px 8px; text-align: center; font-weight: bold; color: ${i===0 ? '#d97706' : '#64748b'};">${i+1}위</td>
          <td style="padding: 10px 8px; font-size: 13px; font-weight: bold; color: #1e293b;">${rk.nickname}</td>
          <td style="padding: 10px 8px; font-size: 11px; font-family: monospace; color: #94a3b8;">${rk.uuid.substring(0,8)}...</td>
          <td style="padding: 10px 8px; font-size: 12px; text-align: center; color: #334155;">🗳️ ${rk.votesCount} | 💬 ${rk.commentsCount}</td>
          <td style="padding: 10px 8px; font-size: 13px; font-weight: 900; text-align: right; color: #b45309;">${rk.score}p</td>
        </tr>
      `;
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #334155; }
          .container { max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
          .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 35px 24px; text-align: center; border-bottom: 4px solid #f59e0b; }
          .header h1 { color: #f59e0b; margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; }
          .header p { color: #94a3b8; margin: 8px 0 0 0; font-size: 13px; font-weight: bold; }
          .content { padding: 24px; }
          .section-title { font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 28px; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; display: flex; align-items: center; }
          .stats-card { background-color: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 20px; border: 1px solid #f1f5f9; display: flex; justify-content: space-around; text-align: center; }
          .stat-item h3 { font-size: 22px; margin: 0; color: #0f172a; font-weight: 900; }
          .stat-item p { font-size: 11px; margin: 4px 0 0 0; color: #64748b; font-weight: bold; }
          .table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          .table th { background-color: #f8fafc; text-align: left; padding: 10px 8px; font-size: 11px; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
          .footer { background-color: #f8fafc; text-align: center; padding: 20px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>여긴뭐가 실시간 데일리 비즈니스 리포트</h1>
            <p>골목 공실 상상 프로젝트 • 베타 버전 활성화 분석</p>
          </div>
          <div class="content">
            <div style="font-size: 12px; color: #64748b; margin-bottom: 20px; font-weight: bold; text-align: right;">
              📅 집계 일시: ${kstNow.toLocaleString('ko-KR')}
            </div>

            <!-- 최근 24시간 실시간 지표 -->
            <div class="stats-card">
              <div class="stat-item">
                <h3>+${newUsers ? newUsers.length : 0}</h3>
                <p>신규 가입 유저</p>
              </div>
              <div class="stat-item">
                <h3>+${newVotes ? newVotes.length : 0}</h3>
                <p>신규 상상 투표</p>
              </div>
              <div class="stat-item">
                <h3>+${newComments ? newComments.length : 0}</h3>
                <p>신규 작성 의견</p>
              </div>
            </div>

            <!-- 미결 제보내역 목록 -->
            <div class="section-title">🗳️ 미결 주민 분쟁 / 제보내역 [회신 대기]</div>
            <p style="font-size: 12px; color: #64748b; margin-top: -6px; margin-bottom: 12px;">※ 관리자 회신 및 해결 처리가 완료되면 다음날 보고서에서 자동으로 지워집니다.</p>
            ${reportsHtml}

            <!-- 툇마루단 실사 대기 목록 -->
            <div class="section-title">🔍 툇마루단 즉각 실사조사 필요 공실 목록</div>
            <p style="font-size: 12px; color: #64748b; margin-top: -6px; margin-bottom: 12px;">※ 보증금/월세 조건 및 실사 사진 정보가 비어 있는 신규 등록 공실 목록입니다.</p>
            <table class="table">
              <thead>
                <tr>
                  <th style="width: 22%;">공실명</th>
                  <th style="width: 15%;">공실 ID</th>
                  <th style="width: 25%;">제보 주소</th>
                  <th style="width: 15%;">누락 항목</th>
                  <th style="width: 15%;">최초 제보자</th>
                  <th style="width: 8%;">등록일</th>
                </tr>
              </thead>
              <tbody>
                ${vacanciesHtml}
              </tbody>
            </table>

            <!-- 상위 활동 랭킹 -->
            <div class="section-title">👑 골목 상상 리더보드 (탑 이웃 5선)</div>
            <table class="table">
              <thead>
                <tr>
                  <th style="text-align: center; width: 10%;">순위</th>
                  <th style="width: 25%;">닉네임</th>
                  <th style="width: 20%;">고유 UUID</th>
                  <th style="text-align: center; width: 25%;">참여 이력</th>
                  <th style="text-align: right; width: 20%;">누적 상상 포인트</th>
                </tr>
              </thead>
              <tbody>
                ${rankingsHtml}
              </tbody>
            </table>
          </div>
          <div class="footer">
            본 메일은 여긴뭐가 자동화 모듈에 의해 발송되었습니다.<br>
            © 2026 여긴뭐가 골목상상 프로젝트. All Rights Reserved.
          </div>
        </div>
      </body>
      </html>
    `;

    // 5. 이메일 발송
    const senderEmail = process.env.SENDER_EMAIL;
    const senderPassword = process.env.SENDER_PASSWORD;

    if (!senderEmail || !senderPassword) {
      console.warn("⚠️ 경고: .env.local에 SENDER_EMAIL 또는 SENDER_PASSWORD가 설정되지 않았습니다.");
      console.warn("이메일 발송은 건너뛰고 최신 리포트 파일을 로컬 'scripts/latest_daily_report.html' 에 저장합니다.");

      const savePath = path.join(__dirname, 'latest_daily_report.html');
      fs.writeFileSync(savePath, emailHtml, 'utf8');
      console.log(`로컬 저장 성공: ${savePath}`);
      return;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: senderEmail,
        pass: senderPassword
      }
    });

    const mailOptions = {
      from: `"여긴뭐가 자동보고 시스템" <${senderEmail}>`,
      to: TARGET_EMAIL,
      subject: `[여긴뭐가] 실시간 데일리 비즈니스 & 미결 제보 분석 보고서 (${kstNow.toLocaleDateString('ko-KR')})`,
      html: emailHtml
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ 이메일 발송 완벽 성공! Message ID: ${info.messageId}`);

  } catch (e) {
    console.error("❌ 데일리 보고서 생성/발송 중 치명적 오류 발생:", e);
  }
}

run();
