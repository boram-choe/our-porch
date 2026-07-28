import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get('lat');
  const lngStr = searchParams.get('lng');
  const neighborhood = searchParams.get('neighborhood') || '';

  const apiKeyStore = process.env.SEOUL_OPEN_API_KEY_STOR;

  if (!apiKeyStore) {
    return NextResponse.json({ error: 'API Key not configured' }, { status: 500 });
  }

  try {
    let selectedTrdarCd: string | null = null;
    let trdarName = "";

    // 1. 상권영역 API를 호출하여 동 이름(neighborhood)으로 상권 코드 찾기
    if (neighborhood) {
      // TbgisTrdarRelm (상권영역) API 호출 (한 번에 최대 1000개. 총 1650여 개이므로 2번 호출)
      const areaUrl1 = `http://openapi.seoul.go.kr:8088/${apiKeyStore}/json/TbgisTrdarRelm/1/1000/`;
      const areaUrl2 = `http://openapi.seoul.go.kr:8088/${apiKeyStore}/json/TbgisTrdarRelm/1001/2000/`;
      
      const [areaRes1, areaRes2] = await Promise.all([
        fetch(areaUrl1),
        fetch(areaUrl2)
      ]);

      let areas: any[] = [];
      if (areaRes1.ok) {
        const areaData1 = await areaRes1.json();
        if (areaData1.TbgisTrdarRelm?.row) areas = [...areas, ...areaData1.TbgisTrdarRelm.row];
      }
      if (areaRes2.ok) {
        const areaData2 = await areaRes2.json();
        if (areaData2.TbgisTrdarRelm?.row) areas = [...areas, ...areaData2.TbgisTrdarRelm.row];
      }

      if (areas.length > 0) {
        // 행정동명(ADSTRD_CD_NM) 또는 상권명(TRDAR_CD_NM)에 동 이름(neighborhood)이 포함된 상권 찾기
        const matchedAreas = areas.filter((a: any) => 
          (a.ADSTRD_CD_NM && a.ADSTRD_CD_NM.includes(neighborhood)) || 
          (a.TRDAR_CD_NM && a.TRDAR_CD_NM.includes(neighborhood))
        );
        
        if (matchedAreas.length > 0) {
          // 가장 넓은 영역(RELM_AR)을 가진 상권을 대표로 선택하거나 첫 번째 선택
          matchedAreas.sort((a: any, b: any) => Number(b.RELM_AR || 0) - Number(a.RELM_AR || 0));
          selectedTrdarCd = matchedAreas[0].TRDAR_CD;
          trdarName = matchedAreas[0].TRDAR_CD_NM;
        }
      }
    }

    // 2. 서울시 상권-점포 API 데이터 가져오기
    // 특정 상권코드를 찾았으면 해당 상권코드로 직접 조회, 없으면 전체 조회 후 좌표 해시로 폴백
    let storeUrl = '';
    if (selectedTrdarCd) {
      // 연도/분기는 임의의 최근 데이터(예: 2023 1분기 -> 20231) 또는 생략 가능여부 확인
      // API 명세상 모두 생략하고 전체 조회 후 필터링하는 방식이 안전 (단 1000개 제한)
      // 최신 데이터를 위해 연도/분기를 고정하지 않고 1000개를 불러오되, 특정 상권코드로 좁힙니다.
      storeUrl = `http://openapi.seoul.go.kr:8088/${apiKeyStore}/json/VwsmTrdarStorQq/1/1000/2023/1/A/${selectedTrdarCd}`;
    } else {
      storeUrl = `http://openapi.seoul.go.kr:8088/${apiKeyStore}/json/VwsmTrdarStorQq/1/1000/2023/1/`;
    }

    let response = await fetch(storeUrl);
    
    // 만약 2023/1로 데이터가 없으면 분기를 제거한 URL로 폴백 시도
    if (!response.ok || (await response.clone().json()).RESULT?.CODE === 'INFO-200') {
      storeUrl = `http://openapi.seoul.go.kr:8088/${apiKeyStore}/json/VwsmTrdarStorQq/1/1000/`;
      response = await fetch(storeUrl);
    }

    if (!response.ok) {
      throw new Error(`API response status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.RESULT && data.RESULT.CODE !== 'INFO-000') {
      if (data.VwsmTrdarStorQq && data.VwsmTrdarStorQq.RESULT.CODE === 'INFO-000') {
        // 정상
      } else {
        throw new Error(`API Error: ${data.RESULT.MESSAGE || data.VwsmTrdarStorQq?.RESULT.MESSAGE}`);
      }
    }

    const rows = data.VwsmTrdarStorQq.row;
    
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'No data found' }, { status: 404 });
    }

    let targetRows = rows;

    // 상권 코드를 못 찾았을 경우 좌표 해시 기반 폴백 로직
    if (!selectedTrdarCd) {
      const trdarCodes = Array.from(new Set(rows.map((r: any) => r.TRDAR_CD)));
      selectedTrdarCd = trdarCodes.length > 0 ? String(trdarCodes[0]) : null;

      if (latStr && lngStr) {
        const latInt = Math.floor(parseFloat(latStr) * 100000);
        const lngInt = Math.floor(parseFloat(lngStr) * 100000);
        const seed = latInt + lngInt;
        selectedTrdarCd = String(trdarCodes[seed % trdarCodes.length]);
      }
      
      targetRows = rows.filter((r: any) => r.TRDAR_CD === selectedTrdarCd);
      trdarName = neighborhood ? `${neighborhood} 인근` : "해당 지역";
    }

    // 점포 수(STOR_CO) 기준으로 오름차순 정렬 (가장 점포가 없거나 적은 업종 도출)
    targetRows.sort((a: any, b: any) => {
      const countA = a.STOR_CO || 0;
      const countB = b.STOR_CO || 0;
      return countA - countB;
    });

    const candidates = targetRows.map((r: any) => r.SVC_INDUTY_CD_NM);
    
    // 유의미한 추천을 위해 생소한 업종 필터링
    const validCandidates = candidates.filter((c: string) => {
      const ignored = ['여관', '고시원', '통신기기수리', '가전제품수리', '건축물청소', '부동산중개업', '세무사사무소', '법무사사무소', '자동차수리', '자동차미용', '노래방', 'PC방', '당구장', '골프연습장'];
      return !ignored.includes(c) && c !== undefined && c !== null;
    });

    // 중복 제거
    const uniqueCandidates = Array.from(new Set(validCandidates));

    // 3개 선택
    const recommendations = uniqueCandidates.slice(0, 3);
    
    // 3개가 안되면 기본값 추가
    const fallbacks = ["독립 서점", "샐러드 전문점", "세탁소"];
    while (recommendations.length < 3) {
      const fallback = fallbacks.find(f => !recommendations.includes(f));
      if (fallback) recommendations.push(fallback);
      else break;
    }

    return NextResponse.json({
      success: true,
      trdarCd: selectedTrdarCd,
      trdarName: trdarName || "동네 상권",
      recommendations: recommendations.slice(0, 3),
    });

  } catch (error: any) {
    console.error('Seoul API Fetch Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch Seoul API' }, { status: 500 });
  }
}
