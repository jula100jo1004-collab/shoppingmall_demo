# Vercel(Client) + Heroku(Server) 배포 가이드

권장 순서: **MongoDB Atlas → Heroku(API) → Vercel(프론트)**  
프론트 빌드에 Heroku API URL이 필요하기 때문입니다.

---

## 0. 사전 준비

- GitHub에 이 저장소 push (`.env`는 커밋하지 말 것)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) 클러스터 + DB 유저 + Network Access `0.0.0.0/0`
- Heroku / Vercel 계정
- Heroku CLI (선택): https://devcenter.heroku.com/articles/heroku-cli

---

## 1. MongoDB Atlas

1. Cluster 생성
2. Database Access에서 사용자 생성
3. Network Access에서 `0.0.0.0/0` 허용 (Heroku dyno용)
4. Connect → Drivers → URI 복사  
   예: `mongodb+srv://USER:PASSWORD@....mongodb.net/shopping-mall?retryWrites=true&w=majority`

---

## 2. Heroku (server)

이 저장소 루트를 Heroku에 연결합니다. 루트 `Procfile` / `package.json`이 `server/`를 실행합니다.

### 앱 생성

```bash
# 저장소 루트에서
heroku login
heroku create your-shopping-api
```

### 환경변수

```bash
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI="mongodb+srv://USER:PASSWORD@....mongodb.net/shopping-mall?retryWrites=true&w=majority"
heroku config:set JWT_SECRET="긴랜덤문자열"
heroku config:set JWT_EXPIRES_IN=1d
# Vercel 배포 후 실제 도메인으로 다시 설정
heroku config:set CLIENT_ORIGIN="https://your-app.vercel.app"
```

### 배포

```bash
git push heroku main
# 브랜치가 master면: git push heroku master
```

### 확인

```bash
heroku open
# 또는
curl https://your-shopping-api.herokuapp.com/api/health
```

헬스체크가 되면 API URL을 메모하세요.  
→ `https://your-shopping-api.herokuapp.com/api`

GitHub 연동 시: Heroku Dashboard → Deploy → GitHub 연결 → Enable Automatic Deploys

---

## 3. Vercel (client)

1. [vercel.com](https://vercel.com) → Add New Project → 이 GitHub 저장소 선택
2. **Root Directory** = `client` (Edit 눌러 설정)
3. Framework Preset = Vite (자동 감지되면 그대로)
4. Build Command = `npm run build`
5. Output Directory = `dist`
6. Environment Variables 추가:

| Name | Value |
|------|--------|
| `VITE_API_BASE_URL` | `https://your-shopping-api.herokuapp.com/api` |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary 클라우드 이름 |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Unsigned 프리셋 |
| `VITE_PORTONE_STORE_ID` | `store-...` |
| `VITE_PORTONE_CHANNEL_KEY` | `channel-key-...` |

7. Deploy

배포 후 나온 URL 예: `https://shopping-mall-demo.vercel.app`

---

## 4. 서로 연결 (필수)

### Heroku CORS

Vercel URL로 `CLIENT_ORIGIN`을 맞춰 주세요 (끝 `/` 없음).

```bash
heroku config:set CLIENT_ORIGIN="https://shopping-mall-demo.vercel.app"
```

프리뷰 URL도 쓰면 콤마로 추가:

```bash
heroku config:set CLIENT_ORIGIN="https://shopping-mall-demo.vercel.app,https://shopping-mall-demo-git-main-xxx.vercel.app"
```

### Vercel API URL

`VITE_API_BASE_URL`이 Heroku API와 다르면 Vercel 환경변수 수정 후 **Redeploy**  
(Vite는 빌드 타임에 env를 넣습니다.)

---

## 5. 배포 후 체크

- [ ] `GET /api/health` 성공
- [ ] 회원가입 / 로그인
- [ ] 상품 목록
- [ ] 장바구니
- [ ] 결제 (PortOne) — 테스트 MID면 소액만
- [ ] 내 주문 / 어드민 주문관리

브라우저에서 CORS 에러가 나면 `CLIENT_ORIGIN`과 Vercel 도메인이 정확히 같은지 확인하세요.

---

## 로컬 vs 배포 환경변수

| 구분 | 로컬 | 배포 |
|------|------|------|
| Client API | `http://localhost:5000/api` | `https://*.herokuapp.com/api` |
| MongoDB | 로컬 또는 Atlas | Atlas 권장 |
| CORS | 미설정 시 전체 허용 | `CLIENT_ORIGIN` 필수 |

---

## 트러블슈팅

- **Heroku `Application Error`**: `heroku logs --tail`로 Mongo URI / JWT 누락 확인
- **Vercel 새로고침 404**: `client/vercel.json` rewrites 확인 (이미 포함됨)
- **결제 후 리다이렉트**: PortOne은 `window.location.origin`을 쓰므로 Vercel 도메인으로 돌아옵니다
- **이미지 업로드 실패**: Cloudinary preset이 Unsigned인지 확인
