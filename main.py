# main.py
# FastAPI 서버 (회원가입 / 로그인 API)
from fastapi.middleware.cors import CORSMiddleware

from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, constr
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from db import SessionLocal, init_db, User


# FastAPI 앱 생성
app = FastAPI()

# ---- CORS 설정 (프론트랑 통신 허용) ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # 로컬에서 편하게 테스트하려고 일단 모두 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# -------------------------------------

# =========================
# 비밀번호 해시 설정 (pbkdf2_sha256)
# =========================
# bcrypt 대신 pbkdf2_sha256 사용 → 72바이트 길이 제한 문제 없음
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
    """평문 비밀번호 → 해시 문자열로 변환"""
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """입력 비밀번호와 DB에 저장된 해시가 같은지 검사"""
    return pwd_context.verify(password, password_hash)


# =========================
# DB 세션 dependency
# =========================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =========================
# Pydantic 요청/응답 모델
# =========================
class SignupRequest(BaseModel):
    email: EmailStr
    # 너무 긴 비밀번호는 막기 (passlib 쪽에서도 안전)
    password: constr(min_length=6, max_length=80)


class LoginRequest(BaseModel):
    email: EmailStr
    password: constr(min_length=6, max_length=80)


class SimpleResponse(BaseModel):
    message: str


# =========================
# 앱 시작 시 DB 초기화
# =========================
@app.on_event("startup")
def on_startup():
    # db.py 안의 init_db() : 테이블 생성
    init_db()


# =========================
# 회원가입 API
# =========================
@app.post("/api/signup", response_model=SimpleResponse)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    # 1) 이미 가입된 이메일인지 확인
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 가입된 이메일입니다.",
        )

    # 2) 비밀번호 해시 생성
    pwd_hash = hash_password(req.password)

    # 3) User 객체 생성 & 저장
    user = User(email=req.email, password_hash=pwd_hash)
    db.add(user)
    db.commit()

    return SimpleResponse(message="회원가입 성공")


# =========================
# 로그인 API
# =========================
@app.post("/api/login", response_model=SimpleResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    # 1) 이메일로 유저 조회
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="가입되지 않은 이메일입니다.",
        )

    # 2) 비밀번호 검증
    if not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="비밀번호가 일치하지 않습니다.",
        )

    # 진짜 서비스라면 여기서 JWT 발급 or 세션 쿠키 설정
    return SimpleResponse(message="로그인 성공")