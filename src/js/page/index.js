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
const DEADZONE_PX = 3;      // 미세 떨림 억제 (작게)
const FLICK_VEL   = 1.8;    // px/ms 이상이면 플릭 (빡빡)
const MIN_DUR     = 80;     // 최소 애니 시간 (빠르게)
const MAX_DUR     = 180;    // 최대 애니 시간 (빠르게)
const SNAP_BIAS   = 12;     // 중간값에서 아래로 12px만 더 가면 피크로

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
  inertia: false, // 플릭 관성 대신 "즉시 스냅" 감성으로 빠르게
  listeners: {
    start(e){
      const el = e.target;
      el.classList.remove('anim');

      const m = el.style.transform.match(/[-\d.]+/);
      e.interaction.el   = el;
      e.interaction.ty   = m ? parseFloat(m[0]) : vh();
      e.interaction.sy   = getClientY(e);
      e.interaction.moved = 0;
      e.interaction.lastVy = 0;
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

      // 속도(px/ms)
      const vy = e.dt ? (dy / e.dt) : 0;
      e.interaction.lastVy = vy;

      // 라버밴드(상단 저항) — 더 빳빳하게
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

      // 1) 빠른 플릭이면 방향대로 과감히 결정
      let target;
      if (Math.abs(e.interaction.lastVy) > FLICK_VEL) {
        target = (e.interaction.lastVy < 0) ? openY : peekY;
      } else {
        // 2) 느린 드래그: 중간값에서 아래로 SNAP_BIAS만 넘으면 피크
        const mid = (openY + peekY) / 2;
        target = (cur > mid - SNAP_BIAS) ? peekY : openY;
      }

      const dist = Math.abs(target - cur);
      // 거리에 비례하되 훨씬 짧게
      const dur = Math.max(MIN_DUR, Math.min(MAX_DUR, Math.round(dist * 0.45)));

      el.style.transition = `transform ${dur}ms cubic-bezier(.25,.9,.2,1)`;
      el.classList.add('anim');
      setY(el, target, true);

      el.addEventListener('transitionend', () => {
        el.style.transition = '';
      }, { once: true });
    }
  }
});
});