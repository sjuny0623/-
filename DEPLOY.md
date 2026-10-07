# 배포 안내 (GitHub Pages + keywordmaster.co.kr)

사이트 파일은 `docs/` 폴더에 있습니다. (버전 기록은 keywordmaster-site-v70.zip 안의 README.md)

1. Settings → Pages → Source: Deploy from a branch → 브랜치 선택, 폴더 `/docs` → Save
2. Custom domain: `keywordmaster.co.kr` (docs/CNAME 에 이미 들어 있음)
3. 카페24 DNS: A 레코드 4개(185.199.108.153 / .109.153 / .110.153 / .111.153), CNAME `www` → `sjuny0623.github.io`
4. DNS 연결 후 Enforce HTTPS 체크
