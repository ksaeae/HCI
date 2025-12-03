# db.py
from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    create_engine, Column, Integer, Float, String, Date, Text, ForeignKey
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from sqlalchemy import text

# ============================
# DB 기본 설정  
# ============================
DB_URL = "sqlite:///reports.db"     # 이미 쓰고 있던 DB 파일 이름
engine = create_engine(DB_URL, echo=False, future=True)

Base = declarative_base()
SessionLocal = sessionmaker(bind=engine,
                            autoflush=False,
                            autocommit=False,
                            future=True)


# ============================
# 1) User 테이블 (회원가입/로그인용)
# ============================
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)


# ============================
# 2) 기존 리포트 관련 테이블
# ============================

# 종목
class Stock(Base):
    __tablename__ = "stocks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    stock_code = Column(String(20), unique=True, nullable=False, index=True)
    stock_name = Column(String(100), nullable=False)
    company_info_url = Column(String(500))
    current_price = Column(Integer, nullable=True)

    reports = relationship("Report", back_populates="stock")


# 증권사
class Broker(Base):
    __tablename__ = "brokers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False, index=True)

    reports = relationship("Report", back_populates="broker")


# 애널리스트
class Author(Base):
    __tablename__ = "authors"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False, index=True)

    reports = relationship("Report", back_populates="author")


# 평가의견
class Rating(Base):
    __tablename__ = "ratings"

    code = Column(String(10), primary_key=True)  # 'Buy', 'Sell', 'Hold', 'None'
    description = Column(String(100))

    reports = relationship("Report", back_populates="rating")


# 리포트
class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, autoincrement=True)

    written_date = Column(Date, nullable=False, index=True)
    title = Column(Text, nullable=False)
    fair_price = Column(Integer)
    current_price = Column(Integer)
    expected_return = Column(Float)
    attachment_url = Column(String(500))

    summary = Column(Text, nullable=True)
    novice_content = Column(Text, nullable=True)
    expert_content = Column(Text, nullable=True)

    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False)
    broker_id = Column(Integer, ForeignKey("brokers.id"), nullable=True)
    author_id = Column(Integer, ForeignKey("authors.id"), nullable=True)
    rating_code = Column(String(10), ForeignKey("ratings.code"), nullable=False)

    stock = relationship("Stock", back_populates="reports")
    broker = relationship("Broker", back_populates="reports")
    author = relationship("Author", back_populates="reports")
    rating = relationship("Rating", back_populates="reports")


# ============================
# 공용 함수들 (있던 것 그대로 쓰면 됨)
# ============================

def normalize_str(s: str | None):
    if s is None:
        return None
    s = str(s).strip()
    return s or None

def parse_int(value: str | None):
    if value is None:
        return None
    v = str(value).replace(",", "").strip()
    if v == "":
        return None
    try:
        return int(v)
    except ValueError:
        return None

def parse_float(value: str | None):
    if value is None:
        return None
    v = str(value).replace(",", "").strip()
    if v == "":
        return None
    try:
        return float(v)
    except ValueError:
        return None

def normalize_rating(raw: str | None) -> str:
    if raw is None:
        return "None"

    s = str(raw).strip().lower()
    if s in {"", "nr", "투자의견없음", "n/a", "na", "notrated", "-"}:
        return "None"

    if s in {"buy", "매수", "tradingbuy"}:
        return "Buy"
    if s in {"hold"}:
        return "Hold"
    if s in {"sell", "매도", "underperform"}:
        return "Sell"

    return "None"


# ============================
# DB 초기화 (테이블 생성 + Rating 기본값)
# ============================
def init_db():
    # 모든 테이블 생성 (User, Stock, Report … 전부 여기서 한 번에 만들어짐)
    Base.metadata.create_all(engine)

    # ratings 기본 데이터 채우기
    with SessionLocal() as session:
        for code, desc in [
            ("Buy", "매수"),
            ("Sell", "매도"),
            ("Hold", "보유/중립"),
            ("None", "투자의견 없음"),
        ]:
            if not session.get(Rating, code):
                session.add(Rating(code=code, description=desc))
        session.commit()
