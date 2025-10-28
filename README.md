
# Vite Final Template

✅ **프로젝트 구조**
- `src/`: 소스 코드 (html, scss, js, partials)
- `public/`: 정적 자산 (favicon, 외부 라이브러리 등)
- `dist/`: 빌드 결과물

✅ **개발 서버 실행**
```bash
npm install
npm run dev
```
→ http://localhost:5173/ 에서 개발서버 실행

✅ **빌드 (배포)**
```bash
npm run build
```
→ `dist/`에 최적화된 결과물이 생성

✅ **빌드 결과물**
- 이미지: `assets/images/`
- JS: `assets/js/`
- CSS: `assets/css/`
- 공통코드: `common.js`로 분리
- 모든 HTML의 modulepreload, crossorigin 태그 자동 제거됨
- **base64 인라인** 안함 (모든 asset은 개별 파일로 출력)

✅ **빌드 차이**
- `npm run dev`: 개발 서버, 소스맵, HMR 지원
- `npm run build`: 배포용, 압축 및 최적화 (하지만 config에서 `minify: false`라 압축 안함!)
- `npm run build -- --mode localbuild`: 배포용, 압축 및 최적화 (하지만 config에서 `minify: true`라 압축 함!)



✅ **환경변수**
- `.env` 파일로 사용 가능 (예: `VITE_API_URL`)

✅ **주요 수정 위치**
- 공통 JS: `src/js/common/ui.js`
- 메인 전용 JS: `src/js/page/index.js`
- 서브 전용 JS: `src/js/page/sub.js`
- SCSS: `src/scss/`
- HTML, partials: `src/`
