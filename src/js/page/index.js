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
const DEADZONE_PX   = 2;    // 미세 떨림 억제(작게)
const INTENT_VEL    = 0.6;  // px/ms | 이 속도 넘으면 방향 의도 확정
const INTENT_DIST   = 14;   // px    | 총 이동이 이만큼 넘으면 의도 확정
const DIR_BIAS_PX   = 24;   // px    | 느린 드래그일 때도 "마지막 방향" 쪽으로 중간점 바이어스
const MIN_DUR       = 80;
const MAX_DUR       = 180;



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
  interact('.sheet').draggable({
  allowFrom: '.sheet-handle',
  ignoreFrom: '.sheet-content',
  inertia: false, // 의도 스냅을 빠르게
  listeners: {
    start(e){
      const el = e.target;
      el.classList.remove('anim');

      const m = el.style.transform.match(/[-\d.]+/);
      e.interaction.el      = el;
      e.interaction.ty      = m ? parseFloat(m[0]) : vh();
      e.interaction.sy      = getClientY(e);
      e.interaction.moved   = 0;
      e.interaction.lastVy  = 0;
      e.interaction.totalDy = 0;   // 총 이동량(의도 판정용)
    },
    move(e){
      const el = e.interaction.el;
      if (!el) return;

      el.classList.remove('anim');

      const cy = getClientY(e);
      const dy = cy - e.interaction.sy;

      // deadzone
      if (e.interaction.moved < DEADZONE_PX) {
        e.interaction.moved += Math.abs(dy);
        e.interaction.sy = cy;
        return;
      }

      // 속도/누적 이동 추적
      const vy = e.dt ? (dy / e.dt) : 0;
      e.interaction.lastVy  = vy;
      e.interaction.totalDy += dy;

      // 상단 라버밴드(원한다면 유지)
      let next = e.interaction.ty + dy;
      if (next < 0) {
        const over = -next;
        next = -Math.pow(over, 0.92);
      }

      e.interaction.ty = setY(el, next, false);
      e.interaction.sy = cy;
    },
    end(e){
      const el = e.interaction.el;
      if (!el) return;

      const cur = e.interaction.ty;
      const [openY, peekY] = snaps();

      // === 1) 방향 의도 강제 ===
      // 위로 끌었으면(빠르거나/멀거나) → 무조건 openY
      if (e.interaction.lastVy < -INTENT_VEL || e.interaction.totalDy < -INTENT_DIST) {
        snapTo(openY);
        return;
      }
      // 아래로 끌었으면(빠르거나/멀거나) → 무조건 peekY
      if (e.interaction.lastVy >  INTENT_VEL || e.interaction.totalDy >  INTENT_DIST) {
        snapTo(peekY);
        return;
      }

      // === 2) 느린 드래그: 마지막 방향에 바이어스 주기 ===
      const mid  = (openY + peekY) / 2;
      const bias = (e.interaction.totalDy < 0 ? -DIR_BIAS_PX : DIR_BIAS_PX);
      const target = (cur > mid + bias) ? peekY : openY;
      snapTo(target);

      function snapTo(targetY){
        const dist = Math.abs(targetY - cur);
        const dur  = Math.max(MIN_DUR, Math.min(MAX_DUR, Math.round(dist * 0.4)));
        el.style.transition = `transform ${dur}ms cubic-bezier(.25,.9,.2,1)`;
        el.classList.add('anim');
        setY(el, targetY, true);
        el.addEventListener('transitionend', () => { el.style.transition=''; }, { once:true });
      }
    }
  }
});
});