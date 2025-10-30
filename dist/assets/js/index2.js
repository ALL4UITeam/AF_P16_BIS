(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tab--container").forEach(initTabGroup);
});
function initTabGroup(groupEl) {
  const tabs = groupEl.querySelectorAll(".tab--item");
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
document.addEventListener("DOMContentLoaded", function() {
  const toggles = document.querySelectorAll("[data-toggle]");
  toggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const group = toggle.dataset.group;
      if (group) {
        document.querySelectorAll(`[data-group="${group}"]`).forEach((el) => {
          el.classList.remove("active");
        });
        toggle.classList.add("active");
      } else {
        toggle.classList.toggle("active");
      }
    });
  });
});
$(document).ready(function() {
  $(".GaugeMeter").gaugeMeter();
});
const vh = () => window.innerHeight;
const PEEK = 300;
const DEADZONE_PX = 2;
const INTENT_VEL = 0.6;
const INTENT_DIST = 14;
const DIR_BIAS_PX = 24;
const MIN_DUR = 80;
const MAX_DUR = 180;
const sheetState = /* @__PURE__ */ new WeakMap();
function setY(el, y, anim = true) {
  const floor = vh() - PEEK;
  const clamped = Math.max(0, Math.min(y, floor));
  el.classList.toggle("anim", !!anim);
  el.style.transform = `translateY(${clamped}px)`;
  return clamped;
}
function snaps() {
  return [0, vh() - PEEK];
}
function getClientY(e) {
  var _a;
  if (typeof ((_a = e.client) == null ? void 0 : _a.y) === "number") return e.client.y;
  if (typeof e.clientY === "number") return e.clientY;
  const t = e.touches && e.touches[0] || e.changedTouches && e.changedTouches[0];
  if (t) return typeof t.clientY === "number" ? t.clientY : t.pageY;
  if (typeof e.pageY === "number") return e.pageY;
  return 0;
}
function setMapOpenAggregated(root) {
  var _a;
  const map = ((_a = root.closest) == null ? void 0 : _a.call(root, ".Map")) || document.querySelector(".Map");
  if (!map) return;
  const anyOpen = root.parentElement ? [...map.querySelectorAll(".sheet")].some((s) => s.dataset.open === "true") : false;
  map.classList.toggle("is-sheet-open", anyOpen);
}
function enableOneSheet(sheetEl) {
  var _a;
  if ((_a = sheetState.get(sheetEl)) == null ? void 0 : _a.interactable) return;
  setY(sheetEl, vh() - PEEK, false);
  sheetEl.dataset.open = "false";
  setMapOpenAggregated(sheetEl);
  const resizeHandler = () => {
    const m = sheetEl.style.transform.match(/[-\d.]+/);
    const ty = m ? parseFloat(m[0]) : vh();
    setY(sheetEl, Math.min(ty, vh()), false);
  };
  window.addEventListener("resize", resizeHandler);
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
      },
      end(e) {
        const el = e.interaction.el;
        if (!el) return;
        const cur = e.interaction.ty;
        const [openY, peekY] = snaps();
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
          setTimeout(finalize, dur + 60);
        }
        if (e.interaction.lastVy < -0.6 || e.interaction.totalDy < -14) {
          snapTo(openY);
          return;
        }
        if (e.interaction.lastVy > INTENT_VEL || e.interaction.totalDy > INTENT_DIST) {
          snapTo(peekY);
          return;
        }
        const mid = (openY + peekY) / 2;
        const bias = e.interaction.totalDy < 0 ? -24 : DIR_BIAS_PX;
        const target = cur > mid + bias ? peekY : openY;
        snapTo(target);
      }
    }
  });
  sheetState.set(sheetEl, { interactable, resizeHandler });
}
function disableOneSheet(sheetEl) {
  const state = sheetState.get(sheetEl);
  if (state == null ? void 0 : state.interactable) {
    state.interactable.unset();
  }
  if (state == null ? void 0 : state.resizeHandler) {
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
  mq.addEventListener ? mq.addEventListener("change", applyResponsiveState) : mq.addListener(applyResponsiveState);
});
