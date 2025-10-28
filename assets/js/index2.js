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
const sheet = document.querySelector(".sheet");
const PEEK = 80;
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
  return ((_a = e.client) == null ? void 0 : _a.y) ?? e.clientY ?? e.pageY ?? 0;
}
function getStartTarget(e) {
  var _a, _b, _c;
  const raw = ((_b = (_a = e.interaction) == null ? void 0 : _a.downEvent) == null ? void 0 : _b.target) || ((_c = e.downEvent) == null ? void 0 : _c.target) || e.target || null;
  return raw && raw.nodeType !== 1 ? raw.parentElement : raw;
}
addEventListener("DOMContentLoaded", () => setY(sheet, vh() - PEEK, false));
addEventListener("resize", () => {
  const m = sheet.style.transform.match(/[-\d.]+/);
  const ty = m ? parseFloat(m[0]) : vh();
  setY(sheet, Math.min(ty, vh()), false);
});
interact(".sheet").draggable({
  inertia: false,
  listeners: {
    start(e) {
      const el = e.target;
      const content = el.querySelector(".sheet-content");
      const m = el.style.transform.match(/[-\d.]+/);
      const curTy = m ? parseFloat(m[0]) : vh();
      const startTarget = getStartTarget(e);
      if (startTarget && content && content.contains(startTarget) && content.scrollTop > 0) {
        e.interaction.stop();
        return;
      }
      el.classList.remove("anim");
      e.interaction.el = el;
      e.interaction.content = content;
      e.interaction.sy = getClientY(e);
      e.interaction.ty = curTy;
      e.interaction.startedInContent = !!(startTarget && content && content.contains(startTarget));
    },
    move(e) {
      const el = e.interaction.el;
      if (!el) return;
      const cy = getClientY(e);
      const dy = cy - e.interaction.sy;
      if (e.interaction.startedInContent && e.interaction.content && e.interaction.content.scrollTop > 0) {
        e.interaction.sy = cy;
        return;
      }
      e.interaction.ty = setY(el, e.interaction.ty + dy, false);
      e.interaction.sy = cy;
    },
    end(e) {
      const el = e.interaction.el;
      if (!el) return;
      setY(el, nearest(e.interaction.ty), true);
    }
  }
});
