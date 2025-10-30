
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

// ===== 패널 리스트 드래그 =====
const vh = () => window.innerHeight;

const PEEK = 300;
const DEADZONE_PX = 2;
const INTENT_VEL  = 0.6;   // px/ms
const INTENT_DIST = 14;    // px
const DIR_BIAS_PX = 24;
const MIN_DUR = 80;
const MAX_DUR = 180;

const sheetState = new WeakMap(); 

function setY(el, y, anim = true) {
  const floor = vh() - PEEK;
  const clamped = Math.max(0, Math.min(y, floor));
  el.classList.toggle("anim", !!anim);
  el.style.transform = `translateY(${clamped}px)`;
  return clamped;
}
function snaps() { return [0, vh() - PEEK]; }
function getClientY(e) {
  if (typeof e.client?.y === "number") return e.client.y;
  if (typeof e.clientY === "number") return e.clientY;
  const t=(e.touches&&e.touches[0])||(e.changedTouches&&e.changedTouches[0]);
  if (t) return typeof t.clientY === "number" ? t.clientY : t.pageY;
  if (typeof e.pageY === "number") return e.pageY;
  return 0;
}

// === .Map 클래스 토글: 여러 시트 집계 ===
function setMapOpenAggregated(root) {
  const map = root.closest?.(".Map") || document.querySelector(".Map");
  if (!map) return;
  const anyOpen = root.parentElement
    ? [...map.querySelectorAll(".sheet")].some(s => s.dataset.open === "true")
    : false;
  map.classList.toggle("is-sheet-open", anyOpen);
}

// 시트 1개 활성화
function enableOneSheet(sheetEl) {
  if (sheetState.get(sheetEl)?.interactable) return;

  // 초기 위치: 피크
  setY(sheetEl, vh() - PEEK, false);
  sheetEl.dataset.open = "false";
  setMapOpenAggregated(sheetEl);

  // 리사이즈 보정
  const resizeHandler = () => {
    const m = sheetEl.style.transform.match(/[-\d.]+/);
    const ty = m ? parseFloat(m[0]) : vh();
    setY(sheetEl, Math.min(ty, vh()), false);
  };
  window.addEventListener("resize", resizeHandler);

  // 드래그 활성
  const interactable = interact(sheetEl).draggable({
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

        if (e.interaction.moved < DEADZONE_PX) {
          e.interaction.moved += Math.abs(dy);
          e.interaction.sy = cy;
          return;
        }

        const vy = e.dt ? dy / e.dt : 0;
        e.interaction.lastVy = vy;
        e.interaction.totalDy += dy;

        let next = e.interaction.ty + dy;
        if (next < 0) {
          const over = -next;
          next = -Math.pow(over, 0.92);
        }

        e.interaction.ty = setY(el, next, false);
        e.interaction.sy = cy;

        // 실시간 힌트: 중앙선 기준으로 data-open 예측
        // const [openY, peekY] = snaps();
        // const mid = (openY + peekY) / 2;
        // el.dataset.open = (e.interaction.ty <= mid) ? "true" : "false";
        // setMapOpenAggregated(el);
      },
      end(e) {
        const el = e.interaction.el;
        if (!el) return;

        const cur = e.interaction.ty;
        const [openY, peekY] = snaps();

        // 스냅 실행 함수
        function snapTo(targetY) {
          const dist = Math.abs(targetY - cur);
          const willOpen = targetY === openY;

          if (dist < 0.5) {
            el.classList.remove("anim");
            el.style.transition = "";
            setY(el, targetY, false);
            el.dataset.open = willOpen ? "true" : "false";
            setMapOpenAggregated(el);
            return;
          }

          const dur = Math.max(MIN_DUR, Math.min(MAX_DUR, Math.round(dist * 0.4)));
          el.style.transition = `transform ${dur}ms cubic-bezier(.25,.9,.2,1)`;
          el.classList.add("anim");
          setY(el, targetY, true);

          let done = false;
          const finalize = () => {
            if (done) return;
            done = true;
            el.style.transition = "";
            el.dataset.open = willOpen ? "true" : "false";
            setMapOpenAggregated(el);
          };
          el.addEventListener("transitionend", finalize, { once: true });
          setTimeout(finalize, dur + 60); // fallback
        }

        if (e.interaction.lastVy < -INTENT_VEL || e.interaction.totalDy < -INTENT_DIST) {
          snapTo(openY);
          return;
        }
        if (e.interaction.lastVy > INTENT_VEL || e.interaction.totalDy > INTENT_DIST) {
          snapTo(peekY);
          return;
        }

        const mid = (openY + peekY) / 2;
        const bias = e.interaction.totalDy < 0 ? -DIR_BIAS_PX : DIR_BIAS_PX;
        const target = cur > mid + bias ? peekY : openY;
        snapTo(target);
      },
    },
  });

  sheetState.set(sheetEl, { interactable, resizeHandler });
}

function disableOneSheet(sheetEl) {
  const state = sheetState.get(sheetEl);
  if (state?.interactable) {
    state.interactable.unset();
  }
  if (state?.resizeHandler) {
    window.removeEventListener("resize", state.resizeHandler);
  }
  sheetState.delete(sheetEl);

  sheetEl.classList.remove("anim");
  sheetEl.style.transition = "";
  sheetEl.style.transform = ""; 
  sheetEl.dataset.open = "false";
  setMapOpenAggregated(sheetEl);
}

document.addEventListener("DOMContentLoaded", () => {
  const sheets = [...document.querySelectorAll(".sheet")];
  if (!sheets.length) return;

  const mq = window.matchMedia("(max-width: 768px)");

  function applyResponsiveState(e) {
    if (e.matches) {
      sheets.forEach(enableOneSheet);
    } else {

      sheets.forEach(disableOneSheet);
    }
  }

  applyResponsiveState(mq);
  (mq.addEventListener ? mq.addEventListener("change", applyResponsiveState)
                       : mq.addListener(applyResponsiveState));
});
