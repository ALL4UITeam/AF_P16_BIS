// Tab
document.addEventListener("DOMContentLoaded", function () {
    const tabs = document.querySelectorAll(".tab--item");
    const panels = document.querySelectorAll(".tab--panel");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const target = tab.getAttribute("data-tab");

            // 탭 버튼 활성화 처리
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            // 패널 보이기/숨기기
            panels.forEach(panel => {
                panel.classList.remove("active");
                if (panel.id === target) {
                    panel.classList.add("active");
                }
            });
        });
    });
});

$(document).ready(function (){
    $('.GaugeMeter').gaugeMeter();
});







const vh = () => window.innerHeight;

const PEEK = 80; // 피크 높이(px) — 한 곳에서만 관리
const DEADZONE_PX = 6; // 이만큼은 무시 (미세 흔들림 방지)
const FLICK_VEL = 1.2; // px/ms 이상이면 플릭으로 판단
const MIN_DUR = 140; // 스냅 애니 최소 시간
const MAX_DUR = 320; // 스냅 애니 최대 시간

function setY(el, y, anim = true) {
  const floor = vh() - PEEK; // 하단 한계: 피크 위치
  const clamped = Math.max(0, Math.min(y, floor)); // 0(풀오픈) ~ 피크 사이로 고정
  el.classList.toggle("anim", !!anim);
  el.style.transform = `translateY(${clamped}px)`;
  return clamped;
}

function snaps() {
  return [0, vh() - PEEK];
} // 열림 / 피크
function nearest(y) {
  const s = snaps();
  return s.reduce((a, b) => (Math.abs(b - y) < Math.abs(a - y) ? b : a), s[0]);
}

// 터치/포인터/마우스 공통 Y좌표
function getClientY(e) {
  if (typeof e.client?.y === "number") return e.client.y; // PointerEvent
  if (typeof e.clientY === "number") return e.clientY; // MouseEvent
  const t =
    (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]); // TouchEvent
  if (t) return typeof t.clientY === "number" ? t.clientY : t.pageY;
  if (typeof e.pageY === "number") return e.pageY;
  return 0;
}

document.addEventListener("DOMContentLoaded", () => {
  const sheet = document.querySelector(".sheet");
  if (!sheet) return;

  // 초기 위치: 피크
  setY(sheet, vh() - PEEK, false);

  // 리사이즈 시 현재 위치만 안전 보정
  addEventListener("resize", () => {
    const m = sheet.style.transform.match(/[-\d.]+/);
    const ty = m ? parseFloat(m[0]) : vh();
    setY(sheet, Math.min(ty, vh()), false);
  });

  // 핸들에서만 드래그
  interact(".sheet").draggable({
    allowFrom: ".sheet-handle",
    ignoreFrom: ".sheet-content",
    inertia: true, // ← 관성 켜기(플릭 시 move가 추가로 더 들어옵니다)
    listeners: {
      start(e) {
        const el = e.target;
        el.classList.remove("anim"); // 드래그 중엔 transition off

        const m = el.style.transform.match(/[-\d.]+/);
        e.interaction.el = el;
        e.interaction.ty = m ? parseFloat(m[0]) : vh();
        e.interaction.sy = getClientY(e);
        e.interaction.lastVy = 0;
        e.interaction.moved = 0; // deadzone 체크용 누적
      },
      move(e) {
        const el = e.interaction.el;
        if (!el) return;

        el.classList.remove("anim"); // 방어적으로 오프

        const cy = getClientY(e);
        const dy = cy - e.interaction.sy;

        // deadzone: 처음 몇 px는 무시
        if (e.interaction.moved < DEADZONE_PX) {
          e.interaction.moved += Math.abs(dy);
          e.interaction.sy = cy;
          return;
        }

        // 속도(px/ms) 추정 (e.dt는 ms)
        const vy = e.dt ? dy / e.dt : 0;
        e.interaction.lastVy = vy;

        // 라버밴드: 상단(열림) 위로 더 끌면 저항
        let next = e.interaction.ty + dy;
        if (next < 0) {
          const over = -next;
          next = -Math.pow(over, 0.85); // 저항감 (지수는 취향에 맞게)
        }

        e.interaction.ty = setY(el, next, false);
        e.interaction.sy = cy;
      },
      end(e) {
        const el = e.interaction.el;
        if (!el) return;

        const cur = e.interaction.ty;
        const snapsArr = snaps();

        // 속도 기반 플릭 스냅
        let target;
        if (Math.abs(e.interaction.lastVy) > FLICK_VEL) {
          target = e.interaction.lastVy < 0 ? snapsArr[0] : snapsArr[1]; // 위로 플릭=열림, 아래 플릭=피크
        } else {
          target = nearest(cur); // 느린 드래그는 기존 최근접 스냅
        }

        // 거리 비례 애니 시간
        const dist = Math.abs(target - cur);
        const dur = Math.max(
          MIN_DUR,
          Math.min(MAX_DUR, Math.round(dist * 0.65))
        );

        // 이 스냅 애니메이션에만 한시적으로 duration 적용
        el.style.transition = `transform ${dur}ms cubic-bezier(.2,.8,.2,1)`;
        el.classList.add("anim");
        setY(el, target, true);

        // 애니 끝나면 transition 인라인만 정리(선택)
        const tidy = () => {
          el.style.transition = "";
          el.removeEventListener("transitionend", tidy);
        };
        el.addEventListener("transitionend", tidy, { once: true });
      },
    },
  });
});