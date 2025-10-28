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
const sheet  = document.querySelector('.sheet');
// const handle = document.querySelector('.sheet-handle'); // ← 이제 불필요하면 제거

const PEEK = 80;

function setY(el, y, anim=true){
  const floor = vh() - PEEK;                 // 하단 한계: 피크 위치
  const clamped = Math.max(0, Math.min(y, floor));
  el.classList.toggle('anim', !!anim);
  el.style.transform = `translateY(${clamped}px)`;
  return clamped;
}

function snaps(){
  return [0, vh()-PEEK]; // 열림 / 피크
}
function nearest(y){
  const s = snaps();
  return s.reduce((a,b)=> Math.abs(b-y) < Math.abs(a-y) ? b : a, s[0]);
}

// --- (1) 추가: 유틸 2개 ---
function getClientY(e){ return e.client?.y ?? e.clientY ?? e.pageY ?? 0; }
function getStartTarget(e){
  const raw = e.interaction?.downEvent?.target || e.downEvent?.target || e.target || null;
  return raw && raw.nodeType !== 1 ? raw.parentElement : raw;
}

// 초기 위치: 피크
addEventListener('DOMContentLoaded', () => setY(sheet, vh()-PEEK, false));

// 리사이즈 시 현재 위치만 안전 보정
addEventListener('resize', () => {
  const m = sheet.style.transform.match(/[-\d.]+/);
  const ty = m ? parseFloat(m[0]) : vh();
  setY(sheet, Math.min(ty, vh()), false);
});

// --- (2) 교체: 시트 전체 드래그 ---
interact('.sheet').draggable({
  inertia: false,
  listeners: {
    start(e){
      const el = e.target;
      const content = el.querySelector('.sheet-content');
      const m = el.style.transform.match(/[-\d.]+/);
      const curTy = m ? parseFloat(m[0]) : vh();

      const startTarget = getStartTarget(e);
      if (startTarget && content && content.contains(startTarget) && content.scrollTop > 0) {
        e.interaction.stop();
        return;
      }

      el.classList.remove('anim');
      e.interaction.el = el;
      e.interaction.content = content;
      e.interaction.sy = getClientY(e);
      e.interaction.ty = curTy;
      e.interaction.startedInContent = !!(startTarget && content && content.contains(startTarget));
    },
    move(e){
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
    end(e){
      const el = e.interaction.el;
      if (!el) return;
      setY(el, nearest(e.interaction.ty), true);
    }
  }
});