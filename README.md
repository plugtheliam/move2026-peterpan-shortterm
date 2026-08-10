# Move 2026 Peterpan Short-Term Scout

서울 단기임대 후보를 검토하기 위한 공개 대시보드입니다.

## What It Does

- 피터팬 공개 목록 API에서 서울 단기임대 원천 매물을 200건 이상 수집합니다.
- 보증금 500만원 이하, 월세 360만원 이하 원천 풀을 기준으로 가져옵니다.
- 상세 확인이 된 매물은 전용 15평 이상, 2000년 이후 사용승인 여부까지 판정합니다.
- 피터팬 매물 사진, 카카오 로드뷰 썸네일, 지도/후기 검색 링크를 함께 보여줍니다.
- 화면의 `재수집하기` 버튼으로 백그라운드 재수집을 실행하고 브라우저에 결과를 저장합니다.

## Local Run

```bash
npm install
NEXT_PUBLIC_BASE_PATH=/move2026 npm run build
NEXT_PUBLIC_BASE_PATH=/move2026 npm run start -- -H 127.0.0.1 -p 3410
```

Local URL:

```text
http://127.0.0.1:3410/move2026
```

## Production

This app is deployed behind nginx at:

```text
https://me.liamway.com/move2026
```

The production process is managed by PM2 using `ecosystem.config.cjs`.
