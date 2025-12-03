document.addEventListener('DOMContentLoaded', () => {
  initSearchCategoryDropdown();

  initNewsList();

  initResearchList();
});


// 검색창 드롭다운
function initSearchCategoryDropdown() {

  // 검색 카테고리 요소 찾기
  const category = document.querySelector('.search-category');
  if (!category) return;  // 이 페이지에 없으면 그냥 종료

  const toggleBtn = category.querySelector('.search-category-toggle');
  const menu = category.querySelector('.search-category-menu');

  // 버튼 클릭 -> 메뉴 열기/닫기
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();   // 이벤트 버블링 방지 (바깥 클릭 처리와 충돌 방지)
    category.classList.toggle('open');
  });

  // 메뉴 항목 클릭 -> 선택 적용
  menu.addEventListener('click', (e) => {
    if (e.target.tagName.toLowerCase() !== 'li') return;

    const selected = e.target.dataset.value;
    toggleBtn.textContent = selected;   // 버튼 글자 변경
    category.classList.remove('open');  // 메뉴 닫기

    console.log("선택한 검색 카테고리:", selected);
  });

  // 바깥 영역 클릭하면 닫기
  document.addEventListener('click', (event) => {
    if (!category.contains(event.target)) {
      category.classList.remove('open');
    }
  });
}


//news.html과 연결되는 js 뉴스 리스트 자동 추가

function initNewsList() {
  const listEl = document.getElementById('news-list');
  if (!listEl) return;  // 이 페이지가 아니면 그냥 패스

  fetch('news_sample.csv')
    .then(res => res.text())
    .then(text => {
      const rows = parseCSV(text);

      // 카드들 생성
      rows.forEach(row => {

        console.log('row.url =',row.url);

        const card = document.createElement('div');
        card.className = 'card';
        card.style.marginBottom = '12px';

        card.innerHTML = `
          <div style="font-size:15px; font-weight:600; margin-bottom:4px;">
            <a href="${row.url}" target="_blank">
              ${row.title}
            </a>
          </div>
          <div style="font-size:12px; color:#6b7280; margin-bottom:6px;">
            ${row.press} | ${row.date}
          </div>
        `;

        listEl.appendChild(card);
      });
    })
    .catch(err => {
      console.error('뉴스 CSV 로드 에러:', err);
    });
  }

  //CSV를 json 형식으로 파싱
  function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',');

  const rows = lines.slice(1).map(line => {
    const cols = line.split(',');
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = cols[i];
    });
    return obj;
  });

  return rows;
}

//research1.html과 연결되는 js 리서치 리스트 자동 추가
function initResearchList() {
  const listEl = document.getElementById('research-list');
  if (!listEl) return;  // 이 페이지가 아니면 그냥 패스

  fetch('research_sample.csv')
    .then(res => res.text())
    .then(text => {
      const rows = parseCSV(text);

      // 카드들 생성
      rows.forEach(row => {

        console.log('row.url =',row.url);

        const card = document.createElement('div');
        card.className = 'card';
        card.style.marginBottom = '12px';

        card.innerHTML = `
          <div style="font-size:13px; margin-bottom:4px;">
            ${row.stock}
          </div> 
          <div style="font-size:15px; font-weight:600; margin-bottom:4px;">
            <a href="${row.url}" target="_blank">
              ${row.title}
            </a>
          </div>
          <div style="font-size:12px; color:#6b7280; margin-bottom:6px;">
            ${row.broker} | ${row.date} | ${row.rating}
          </div>
        `;

        listEl.appendChild(card);
      });
    })
    .catch(err => {
      console.error('뉴스 CSV 로드 에러:', err);
    });
  }


// ===== 로그인 모달 관련 =====


// 0. 백엔드 API 기본 주소
const API_BASE = "http://127.0.0.1:8000";

// 1. 로그인 상태 (localStorage)
const AUTH_KEY = "isLoggedIn";
let isLoggedIn = false;

// localStorage에서 상태 읽기
(function loadAuthState() {
  try {
    const saved = localStorage.getItem(AUTH_KEY);
    isLoggedIn = saved === "true";
  } catch (e) {
    isLoggedIn = false;
  }
})();

// 전역 DOM 참조 (나중에 채움)
let loginModal;
let openLoginBtn;
let closeBtn;
let tabs;
let panels;
let loginForm;
let signupForm;
let messageEl;
let googleBtn;
let kakaoBtn;


// 2. UI에 로그인 상태 반영
function applyAuthStateToUI() {
  if (!openLoginBtn) return;

  if (isLoggedIn) {
    openLoginBtn.textContent = "로그아웃";
    openLoginBtn.classList.add("logged-in");
    if (loginModal) loginModal.classList.add("hidden");
  } else {
    openLoginBtn.textContent = "로그인";
    openLoginBtn.classList.remove("logged-in");
  }
}

function setAuthState(loggedIn) {
  isLoggedIn = loggedIn;
  try {
    localStorage.setItem(AUTH_KEY, loggedIn ? "true" : "false");
  } catch (e) {
    console.warn("localStorage 사용 불가:", e);
  }
  applyAuthStateToUI();
}


// 3. login.html 조각 로드
async function loadLoginFragment() {
  try {
    const res = await fetch("login.html");
    if (!res.ok) {
      console.error("login.html 로드 실패:", res.status);
      return;
    }
    const html = await res.text();
    document.body.insertAdjacentHTML("beforeend", html);
  } catch (e) {
    console.error("login.html fetch 에러:", e);
  }
}


// 4. 모달/이벤트 초기화
function showPanel(panelId) {
  if (!panels) return;
  panels.forEach((p) => p.classList.remove("active"));
  const target = document.getElementById(panelId);
  if (target) target.classList.add("active");
}

function initLoginUI() {
  // 공통 헤더 로그인 버튼 (각 페이지에 있음)
  openLoginBtn = document.querySelector(".login-open-btn");

  // 방금 insert된 모달 내부 요소들
  loginModal = document.getElementById("login-modal");
  closeBtn   = document.querySelector(".modal-close");
  tabs       = document.querySelectorAll(".modal-tab");
  panels     = document.querySelectorAll(".modal-panel");
  loginForm  = document.getElementById("login-form");
  signupForm = document.getElementById("signup-form");
  messageEl  = document.getElementById("auth-message");
  naverBtn  = document.getElementById("naver-login-btn");
  kakaoBtn   = document.getElementById("kakao-login-btn");

  const emailSignupLink = document.getElementById("go-signup-link");
  const backToLoginLink = document.getElementById("back-to-login-link");

  // 현재 저장된 로그인 상태를 버튼/모달에 반영
  applyAuthStateToUI();

  // --- 상단 로그인 / 로그아웃 버튼 ---
  if (openLoginBtn) {
    openLoginBtn.addEventListener("click", () => {
      // 이미 로그인된 상태면 → 로그아웃 처리
      if (openLoginBtn.classList.contains("logged-in")) {
        setAuthState(false);      // 버튼 '로그인' 으로 변경
        if (messageEl) messageEl.textContent = "";
        return;
      }

      // 로그인 안 된 상태면 → 모달 오픈
      if (loginModal) {
        loginModal.classList.remove("hidden");
        if (messageEl) {
          messageEl.textContent = "";
          messageEl.style.color = "#ef4444";
        }
      }
    });
  }

  // --- 모달 X 버튼 ---
  if (closeBtn && loginModal) {
    closeBtn.addEventListener("click", () => {
      loginModal.classList.add("hidden");
    });
  }

  // --- 배경 클릭 시 모달 닫기 ---
  if (loginModal) {
    loginModal.addEventListener("click", (e) => {
      if (e.target === loginModal) {
        loginModal.classList.add("hidden");
      }
    });
  }

  // --- 탭 전환 (로그인 / 회원가입) ---
  if (tabs && panels) {
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.target;
        tabs.forEach((t) => t.classList.remove("active"));
        panels.forEach((p) => p.classList.remove("active"));

        tab.classList.add("active");
        const panel = document.getElementById(target);
        if (panel) panel.classList.add("active");

        if (messageEl) messageEl.textContent = "";
      });
    });
  }
  
  // --- "이메일로 회원가입" 클릭 시 회원가입 패널로 전환 ---
 if (emailSignupLink) {
    emailSignupLink.addEventListener("click", () => {
      showPanel("signup-panel");
      if (messageEl) messageEl.textContent = "";
    });
  }

  // --- "로그인 화면으로 돌아가기" 클릭 시 로그인 패널로 전환 ---
  if (backToLoginLink) {
    backToLoginLink.addEventListener("click", () => {
      showPanel("login-panel");
      if (messageEl) messageEl.textContent = "";
    });
  }

  // --- 로그인 폼 submit ---
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (messageEl) {
        messageEl.textContent = "";
        messageEl.style.color = "#ef4444";
      }

      const formData = new FormData(loginForm);
      const payload = {
        email: formData.get("email"),
        password: formData.get("password"),
      };

      try {
        const res = await fetch(`${API_BASE}/api/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (res.ok) {
          if (messageEl) {
            messageEl.style.color = "#16a34a";
            messageEl.textContent = data.message || "로그인 성공";
          }
          setAuthState(true); // 로그인 상태로 전환 + 모달 닫기
        } else {
          if (messageEl) {
            messageEl.style.color = "#ef4444";
            messageEl.textContent =
              data.detail || data.message || "로그인 실패";
          }
        }
      } catch (err) {
        console.error(err);
        if (messageEl) {
          messageEl.style.color = "#ef4444";
          messageEl.textContent = "서버와 통신 중 오류가 발생했습니다.";
        }
      }
    });
  }

  // --- 회원가입 폼 submit ---
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (messageEl) {
        messageEl.textContent = "";
        messageEl.style.color = "#ef4444";
      }

      const formData = new FormData(signupForm);
      const pwd = formData.get("password");
      const pwd2 = formData.get("password_confirm");

      if (pwd !== pwd2) {
        if (messageEl) {
          messageEl.textContent = "비밀번호가 서로 다릅니다.";
        }
        return;
      }

      const payload = {
        email: formData.get("email"),
        password: pwd,
      };

      try {
        const res = await fetch(`${API_BASE}/api/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (res.ok) {
          if (messageEl) {
            messageEl.style.color = "#16a34a";
            messageEl.textContent =
              data.message || "회원가입 성공. 이제 로그인 해 주세요.";
          }
        } else {
          if (messageEl) {
            messageEl.style.color = "#ef4444";
            messageEl.textContent =
              data.detail || data.message || "회원가입 실패";
          }
        }
      } catch (err) {
        console.error(err);
        if (messageEl) {
          messageEl.style.color = "#ef4444";
          messageEl.textContent = "서버와 통신 중 오류가 발생했습니다.";
        }
      }
    });
  }

  // --- 소셜 로그인 (더미) ---
  if (naverBtn) {
    naverBtn.addEventListener("click", () => {
      window.location.href = "/auth/naver";
    });
  }
  if (kakaoBtn) {
    kakaoBtn.addEventListener("click", () => {
      window.location.href = "/auth/kakao";
    });
  }
}


// 5. 페이지 로드 시 실행
document.addEventListener("DOMContentLoaded", async () => {
  // 1) login.html 조각을 body에 붙이고
  await loadLoginFragment();
  // 2) 그 다음 DOM 요소들을 찾아서 이벤트 연결
  initLoginUI();
});
