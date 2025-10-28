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
document.addEventListener("DOMContentLoaded", function() {
  const tabs = document.querySelectorAll(".tab--item");
  const panels = document.querySelectorAll(".tab--panel");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-tab");
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      panels.forEach((panel) => {
        panel.classList.remove("active");
        if (panel.id === target) {
          panel.classList.add("active");
        }
      });
    });
  });
});
$(document).ready(function() {
  $(".GaugeMeter").gaugeMeter();
});
const vh = () => window.innerHeight;
const PEEK = 80;
const DEADZONE_PX = 6;
const FLICK_VEL = 1.2;
const MIN_DUR = 140;
const MAX_DUR = 320;
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
function nearest(y) {
  const s = snaps();
  return s.reduce((a, b) => Math.abs(b - y) < Math.abs(a - y) ? b : a, s[0]);
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
document.addEventListener("DOMContentLoaded", () => {
  const sheet = document.querySelector(".sheet");
  if (!sheet) return;
  setY(sheet, vh() - PEEK, false);
  addEventListener("resize", () => {
    const m = sheet.style.transform.match(/[-\d.]+/);
    const ty = m ? parseFloat(m[0]) : vh();
    setY(sheet, Math.min(ty, vh()), false);
  });
  interact(".sheet").draggable({
    allowFrom: ".sheet-handle",
    ignoreFrom: ".sheet-content",
    inertia: true,
    // ← 관성 켜기(플릭 시 move가 추가로 더 들어옵니다)
    listeners: {
      start(e) {
        const el = e.target;
        el.classList.remove("anim");
        const m = el.style.transform.match(/[-\d.]+/);
        e.interaction.el = el;
        e.interaction.ty = m ? parseFloat(m[0]) : vh();
        e.interaction.sy = getClientY(e);
        e.interaction.lastVy = 0;
        e.interaction.moved = 0;
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
        let next = e.interaction.ty + dy;
        if (next < 0) {
          const over = -next;
          next = -Math.pow(over, 0.85);
        }
        e.interaction.ty = setY(el, next, false);
        e.interaction.sy = cy;
      },
      end(e) {
        const el = e.interaction.el;
        if (!el) return;
        const cur = e.interaction.ty;
        const snapsArr = snaps();
        let target;
        if (Math.abs(e.interaction.lastVy) > FLICK_VEL) {
          target = e.interaction.lastVy < 0 ? snapsArr[0] : snapsArr[1];
        } else {
          target = nearest(cur);
        }
        const dist = Math.abs(target - cur);
        const dur = Math.max(
          MIN_DUR,
          Math.min(MAX_DUR, Math.round(dist * 0.65))
        );
        el.style.transition = `transform ${dur}ms cubic-bezier(.2,.8,.2,1)`;
        el.classList.add("anim");
        setY(el, target, true);
        const tidy = () => {
          el.style.transition = "";
          el.removeEventListener("transitionend", tidy);
        };
        el.addEventListener("transitionend", tidy, { once: true });
      }
    }
  });
});
