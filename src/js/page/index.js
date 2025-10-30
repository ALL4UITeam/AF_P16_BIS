
import { buttonClick, toggleTab } from '../common/ui.js'

// Tab
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tab--container").forEach(initTabGroup);
});

function initTabGroup(groupEl) {
  const tabs   = groupEl.querySelectorAll(".tab--item");
  const panels = groupEl.querySelectorAll(".tab--panel");

  groupEl.addEventListener("click", (e) => {
    const tab = e.target.closest(".tab--item");
    if (!tab || !groupEl.contains(tab)) return;

    const targetId = tab.getAttribute("data-tab");
    if (!targetId) return;

    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");

    panels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === targetId);
    
    });
  });
}

// Toggle
document.addEventListener("DOMContentLoaded", function () {
  const toggles = document.querySelectorAll("[data-toggle]");

  toggles.forEach(toggle => {
    toggle.addEventListener("click", () => {
      const group = toggle.dataset.group;

      if (group) {
        document.querySelectorAll(`[data-group="${group}"]`).forEach(el => {
          el.classList.remove("active");
        });
        toggle.classList.add("active");
      } else {
        toggle.classList.toggle("active");
      }
    });
  });
});

// wGraphWrap 그래프
$(document).ready(function (){
    $('.GaugeMeter').gaugeMeter();
});


// 버스 tooltip
// document.querySelectorAll('.bus').forEach($bus => {
//   const plate = $bus.dataset.plate;
//   const type  = $bus.dataset.type;
//   const load  = $bus.dataset.load; // 여유/보통/혼잡 등

//   const cls = load === '여유' ? 'ok' : load === '보통' ? 'warn' : 'bad';
//   $bus.querySelector('.tooltip').innerHTML = `
//     <div>${plate}</div>
//     <div>${type}</div>
//     <div class="load ${cls}">${load}</div>
//   `;
// });





// ===== Bottom Sheet (≤768px only) with .Map class toggle =====
const vh = () => window.innerHeight;

const PEEK = 300;      // 피크 높이(px)
const DEADZONE_PX = 2; // 미세 떨림 억제
const INTENT_VEL  = 0.6;  // px/ms | 이 속도 넘으면 방향 의도 확정
const INTENT_DIST = 14;   // px    | 총 이동이 이만큼 넘으면 의도 확정
const DIR_BIAS_PX = 24;   // 느린 드래그 시 마지막 방향 바이어스
const MIN_DUR = 80;
const MAX_DUR = 180;

function setY(el, y, anim = true) {
  const floor = vh() - PEEK; // 하단 한계(피크)
  const clamped = Math.max(0, Math.min(y, floor)); // 0(풀오픈) ~ floor(피크)
  el.classList.toggle("anim", !!anim);
  el.style.transform = `translateY(${clamped}px)`;
  return clamped;
}

function snaps() {
  return [0, vh() - PEEK]; // [openY, peekY]
}

function getClientY(e) {
  if (typeof e.client?.y === "number") return e.client.y; // PointerEvent
  if (typeof e.clientY === "number") return e.clientY;     // MouseEvent
  const t =
    (e.touches && e.touches[0]) ||
    (e.changedTouches && e.changedTouches[0]);             // TouchEvent
  if (t) return typeof t.clientY === "number" ? t.clientY : t.pageY;
  if (typeof e.pageY === "number") return e.pageY;
  return 0;
}

// .Map 클래스 토글 헬퍼
function setMapActiveBySheet(el, active) {
  const map = el.closest?.(".Map") || document.querySelector(".Map");
  if (!map) return;
  map.classList.toggle("is-sheet-open", !!active);
}

document.addEventListener("DOMContentLoaded", () => {
  const sheet = document.querySelector(".sheet");
  if (!sheet) return;

  // 반응형: 768px 이하에서만 활성
  const mq = window.matchMedia("(max-width: 768px)");
  let interactable = null;
  let resizeHandler = null;

  function enableMobileSheet() {
    if (interactable) return; // 이미 활성화됨

    // 초기 위치: 피크(닫힘에 가까움)
    setY(sheet, vh() - PEEK, false);
    setMapActiveBySheet(sheet, false);

    // 리사이즈 보정
    resizeHandler = () => {
      const m = sheet.style.transform.match(/[-\d.]+/);
      const ty = m ? parseFloat(m[0]) : vh();
      setY(sheet, Math.min(ty, vh()), false);
    };
    window.addEventListener("resize", resizeHandler);

    // 드래그 활성
    interactable = interact(".sheet").draggable({
      allowFrom: ".sheet-handle",
      ignoreFrom: ".sheet-content",
      inertia: false,
      listeners: {
        start(e) {
          const el = e.target;
          el.classList.remove("anim");

          const m = el.style.transform.match(/[-\d.]+/);
          e.interaction.el = el;
          e.interaction.ty = m ? parseFloat(m[0]) : vh();
          e.interaction.sy = getClientY(e);
          e.interaction.moved = 0;
          e.interaction.lastVy = 0;
          e.interaction.totalDy = 0;
        },
        move(e) {
          const el = e.interaction.el;
          if (!el) return;

          el.classList.remove("anim");

          const cy = getClientY(e);
          const dy = cy - e.interaction.sy;

          // deadzone
          if (e.interaction.moved < DEADZONE_PX) {
            e.interaction.moved += Math.abs(dy);
            e.interaction.sy = cy;
            return;
          }

          // 속도/누적 이동 추적
          const vy = e.dt ? dy / e.dt : 0;
          e.interaction.lastVy = vy;
          e.interaction.totalDy += dy;

          // 상단 라버밴드
          let next = e.interaction.ty + dy;
          if (next < 0) {
            const over = -next;
            next = -Math.pow(over, 0.92);
          }

          e.interaction.ty = setY(el, next, false);
          e.interaction.sy = cy;
        },
        end(e) {
          const el = e.interaction.el;
          if (!el) return;

          const cur = e.interaction.ty;
          const [openY, peekY] = snaps();

          // 1) 방향 의도 강제
          if (e.interaction.lastVy < -INTENT_VEL || e.interaction.totalDy < -INTENT_DIST) {
            snapTo(openY); // 열림 → .Map add
            return;
          }
          if (e.interaction.lastVy > INTENT_VEL || e.interaction.totalDy > INTENT_DIST) {
            snapTo(peekY); // 피크 → .Map remove
            return;
          }

          // 2) 느린 드래그: 마지막 방향 바이어스
          const mid = (openY + peekY) / 2;
          const bias = e.interaction.totalDy < 0 ? -DIR_BIAS_PX : DIR_BIAS_PX;
          const target = cur > mid + bias ? peekY : openY;
          snapTo(target);

          function snapTo(targetY) {
            const dist = Math.abs(targetY - cur);
            const willOpen = targetY === openY;

            // 1) 거의 같은 위치로 스냅 → 트랜지션 없이 즉시 확정
            if (dist < 0.5) {
              el.classList.remove("anim");
              el.style.transition = "";
              setY(el, targetY, false);
              setMapActiveBySheet(el, willOpen); // 즉시 토글
              return;
            }

            // 2) 트랜지션 스냅 + transitionend 누락 대비 fallback
            const dur = Math.max(
              MIN_DUR,
              Math.min(MAX_DUR, Math.round(dist * 0.4))
            );
            el.style.transition = `transform ${dur}ms cubic-bezier(.25,.9,.2,1)`;
            el.classList.add("anim");
            setY(el, targetY, true);

            let done = false;
            const finalize = () => {
              if (done) return;
              done = true;
              el.style.transition = "";
              setMapActiveBySheet(el, willOpen);
            };

            // 정상 종료
            el.addEventListener("transitionend", finalize, { once: true });
            // 누락 대비: dur + 약간의 여유
            setTimeout(finalize, dur + 60);
          }
        },
      },
    });
  }

  function disableMobileSheet() {
    if (interactable) {
      interactable.unset();
      interactable = null;
    }
    if (resizeHandler) {
      window.removeEventListener("resize", resizeHandler);
      resizeHandler = null;
    }
    sheet.classList.remove("anim");
    sheet.style.transition = "";
    sheet.style.transform = ""; // 레이아웃 원복
    setMapActiveBySheet(sheet, false); // 데스크톱/비활성 구간에서는 제거
  }

  function applyResponsiveState(e) {
    if (e.matches) enableMobileSheet(); // ≤768px
    else           disableMobileSheet(); // >768px
  }

  // 초기 적용 + 변경 감지
  applyResponsiveState(mq);
  (mq.addEventListener ? mq.addEventListener("change", applyResponsiveState)
                       : mq.addListener(applyResponsiveState));
});
