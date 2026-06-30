/* 영양제 트래커 — 정적 화면을 실제 DB(API)와 연결하는 공유 스크립트.
   owner 는 경로(/screens/{slug}/...)에서 자동 감지, page 는 body[data-nutr-page] 로 구분. */
(function () {
  "use strict";

  function owner() {
    const m = location.pathname.match(/\/screens\/([^/]+)\//);
    return m ? m[1] : null; // 'nahuiyun' | 'nahuiseong'
  }
  function localDate() {
    const d = new Date();
    const p = (n) => (n < 10 ? "0" : "") + n;
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
    );
  }

  const CAT_LABEL = {
    multivitamin: "종합비타민",
    omega3: "오메가-3",
    vitamin_c: "비타민 C",
    mineral: "미네랄",
    probiotic: "유산균",
  };
  const CAT_ICON = {
    multivitamin: "pill",
    omega3: "opacity",
    vitamin_c: "wb_sunny",
    mineral: "bolt",
    probiotic: "science",
  };
  const catLabel = (c) => CAT_LABEL[c] || "기타";
  const catIcon = (c) => CAT_ICON[c] || "medication";

  // 라벨 사진을 캔버스로 축소해 data URL(JPEG) 로 변환 — 업로드 용량 최소화
  function downscaleToDataUrl(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let w = img.width,
            h = img.height;
          const scale = Math.min(1, maxDim / Math.max(w, h));
          w = Math.round(w * scale);
          h = Math.round(h * scale);
          const c = document.createElement("canvas");
          c.width = w;
          c.height = h;
          c.getContext("2d").drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL("image/jpeg", quality));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const TIMING_LABEL = { morning: "아침", noon: "점심", evening: "저녁", "": "시간대 미지정" };
  const TIMING_ICON = { morning: "light_mode", noon: "wb_sunny", evening: "bedtime", "": "schedule" };
  const TIMING_ORDER = ["morning", "noon", "evening", ""];
  const timingLabel = (t) => TIMING_LABEL[t] || TIMING_LABEL[""];
  const timingIcon = (t) => TIMING_ICON[t] || TIMING_ICON[""];
  const nutrText = (list) =>
    (Array.isArray(list) ? list : [])
      .map((n) => (n.amount ? n.name + " " + n.amount : n.name))
      .join(" · ");

  // ── 보관함 ───────────────────────────────────────────────
  async function initStorage() {
    const box = document.getElementById("supp-list");
    if (!box) return;
    try {
      // 제품은 나희윤·나희성 공동 풀
      const r = await fetch("/api/supplements");
      const d = await r.json();
      const items = d.supplements || [];
      if (!items.length) {
        box.innerHTML =
          '<div class="col-span-full text-center text-on-surface-variant font-body-sm py-8">등록된 영양제가 없습니다. 하단 “등록” 메뉴에서 추가하세요.</div>';
        return;
      }
      box.innerHTML = items
        .map((s) => {
          const badges = (Array.isArray(s.nutrients) ? s.nutrients : [])
            .map(
              (n) =>
                '<span class="px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm">' +
                esc(n.amount ? n.name + " " + n.amount : n.name) +
                "</span>"
            )
            .join("");
          return (
            '<div class="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4 card-transition pill-shadow flex flex-col gap-3">' +
            '<div class="flex justify-between items-start">' +
            '<div class="flex gap-4">' +
            (s.image_url
              ? '<div class="w-12 h-12 rounded-xl overflow-hidden bg-surface-container-high shrink-0"><img src="' +
                esc(s.image_url) +
                '" alt="라벨" class="w-full h-full object-cover"></div>'
              : '<div class="w-12 h-12 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary">' +
                "<span class=\"material-symbols-outlined\" style=\"font-variation-settings: 'FILL' 1;\">" +
                catIcon(s.category) +
                "</span></div>") +
            "<div>" +
            '<h3 class="font-headline-sm text-headline-sm text-on-surface">' +
            esc(s.name) +
            "</h3>" +
            '<p class="font-label-sm text-label-sm text-on-surface-variant">' +
            esc(s.brand || "") +
            "</p></div></div>" +
            '<div class="flex items-center gap-1">' +
            '<a href="register.html?edit=' +
            s.id +
            '" class="text-on-surface-variant hover:text-primary active:scale-90 transition-all" title="수정"><span class="material-symbols-outlined">edit</span></a>' +
            '<button data-del="' +
            s.id +
            '" class="text-error/60 hover:text-error active:scale-90 transition-all" title="삭제"><span class="material-symbols-outlined">delete</span></button>' +
            "</div>" +
            "</div>" +
            '<div class="flex flex-wrap gap-2 mt-1">' +
            '<span class="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm">' +
            esc(catLabel(s.category)) +
            "</span>" +
            (s.timing
              ? '<span class="px-2 py-0.5 rounded bg-primary-container text-on-primary-container font-label-sm text-label-sm inline-flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">' +
                timingIcon(s.timing) +
                "</span>" +
                esc(timingLabel(s.timing)) +
                "</span>"
              : "") +
            badges +
            "</div></div>"
          );
        })
        .join("");
      box.querySelectorAll("button[data-del]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (!confirm("이 영양제를 삭제할까요?")) return;
          await fetch("/api/supplements/" + btn.getAttribute("data-del"), {
            method: "DELETE",
          });
          initStorage();
        });
      });
    } catch (e) {
      box.innerHTML =
        '<div class="col-span-full text-center text-error font-body-sm py-8">목록을 불러오지 못했습니다.</div>';
    }
  }

  // ── 오늘의 복용 ──────────────────────────────────────────
  function setProgress(total, done) {
    const pct = total ? Math.round((done / total) * 100) : 0;
    const tot = document.getElementById("total-count");
    const comp = document.getElementById("completed-count");
    const ptext = document.getElementById("percentage-text");
    const circle = document.getElementById("progress-circle");
    if (tot) tot.textContent = total;
    if (comp) comp.textContent = done;
    if (ptext) ptext.textContent = pct + "%";
    if (circle) {
      const C = 2 * Math.PI * 38; // r=38
      circle.setAttribute("stroke-dasharray", C.toFixed(2));
      circle.setAttribute("stroke-dashoffset", (C * (1 - pct / 100)).toFixed(2));
    }
  }
  async function initToday() {
    const box = document.getElementById("today-list");
    if (!box) return;
    const o = owner();
    const date = localDate();
    const dateEl = document.getElementById("current-date");
    if (dateEl) {
      const d = new Date();
      dateEl.textContent = d.getFullYear() + "년 " + (d.getMonth() + 1) + "월 " + d.getDate() + "일";
    }
    try {
      const r = await fetch("/api/intake?owner=" + o + "&date=" + date);
      const d = await r.json();
      const items = d.items || [];
      if (!items.length) {
        box.innerHTML =
          '<div class="text-center text-on-surface-variant font-body-sm py-8">등록된 영양제가 없습니다. 하단 “등록” 메뉴에서 추가하세요.</div>';
        setProgress(0, 0);
        return;
      }
      const itemHTML = (s) =>
        '<label class="glass-card flex items-center p-md rounded-xl cursor-pointer active:scale-[0.98] transition-all hover:bg-surface-container-low">' +
        '<div class="relative flex items-center justify-center w-6 h-6 mr-md">' +
        '<input type="checkbox" data-sid="' +
        s.id +
        '" class="peer opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"' +
        (s.taken ? " checked" : "") +
        ">" +
        '<div class="w-6 h-6 rounded-full border-2 border-outline-variant peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center">' +
        '<span class="material-symbols-outlined text-white text-[16px] hidden peer-checked:block">check</span></div></div>' +
        '<div class="flex-grow">' +
        '<div class="flex items-center gap-sm">' +
        '<span class="font-headline-sm text-headline-sm text-on-surface">' +
        esc(s.name) +
        "</span>" +
        '<span class="px-2 py-0.5 bg-secondary-fixed text-on-secondary-fixed rounded-full font-label-sm text-label-sm">' +
        esc(catLabel(s.category)) +
        "</span></div>" +
        '<div class="font-body-sm text-body-sm text-on-surface-variant">' +
        esc([s.brand, nutrText(s.nutrients)].filter(Boolean).join(" • ")) +
        "</div></div>" +
        '<div class="w-12 h-12 bg-primary-container/20 rounded-lg flex items-center justify-center text-primary">' +
        "<span class=\"material-symbols-outlined\" style=\"font-variation-settings: 'FILL' 1;\">" +
        catIcon(s.category) +
        "</span></div></label>";
      // 복용 시간대(아침/점심/저녁/미지정)별 그룹화
      box.innerHTML = TIMING_ORDER.map((t) => {
        const g = items.filter((s) => (s.timing || "") === t);
        if (!g.length) return "";
        return (
          '<div class="flex flex-col gap-md">' +
          '<h3 class="font-label-md text-label-md text-on-surface-variant flex items-center gap-xs">' +
          '<span class="material-symbols-outlined text-[18px]">' +
          timingIcon(t) +
          "</span>" +
          esc(timingLabel(t)) +
          "</h3>" +
          '<div class="flex flex-col gap-sm">' +
          g.map(itemHTML).join("") +
          "</div></div>"
        );
      }).join("");
      const recount = () =>
        setProgress(
          items.length,
          box.querySelectorAll('input[type="checkbox"]:checked').length
        );
      recount();
      box.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        cb.addEventListener("change", async () => {
          recount();
          try {
            await fetch("/api/intake", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                owner: o,
                supplement_id: Number(cb.getAttribute("data-sid")),
                date: date,
                taken: cb.checked,
              }),
            });
          } catch (e) {
            /* 무시: 화면 상태는 유지 */
          }
        });
      });
    } catch (e) {
      box.innerHTML =
        '<div class="text-center text-error font-body-sm py-8">불러오지 못했습니다.</div>';
    }
  }

  // ── 통계 ────────────────────────────────────────────────
  async function initStats() {
    const o = owner();
    try {
      const r = await fetch("/api/stats?owner=" + o);
      const d = await r.json();
      const score = d.adherence7d || 0;
      const sEl = document.getElementById("adherence-score");
      if (sEl) sEl.textContent = score + "%";
      const ring = document.getElementById("adherence-ring");
      if (ring) {
        const C = 2 * Math.PI * 40; // r=40
        ring.setAttribute("stroke-dasharray", C.toFixed(2));
        ring.setAttribute("stroke-dashoffset", (C * (1 - score / 100)).toFixed(2));
      }
      const sub = document.getElementById("adherence-sub");
      if (sub)
        sub.textContent =
          "최근 7일 복용률입니다. (오늘 " +
          (d.today ? d.today.taken : 0) +
          "/" +
          (d.today ? d.today.total : 0) +
          "개 복용)";
      const list = document.getElementById("nutrient-list");
      if (list) {
        const items = d.nutrientsToday || [];
        if (!items.length) {
          list.innerHTML =
            '<div class="glass-card p-md rounded-xl shadow-sm text-center text-on-surface-variant font-body-sm">오늘 복용한 영양제가 없습니다. “오늘” 탭에서 복용 체크를 하세요.</div>';
        } else {
          list.innerHTML = items
            .map(
              (n) =>
                '<div class="glass-card p-md rounded-xl shadow-sm flex justify-between items-center">' +
                '<div class="flex items-center gap-sm">' +
                '<div class="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">' +
                '<span class="material-symbols-outlined">nutrition</span></div>' +
                '<p class="font-label-md text-label-md">' +
                esc(n.name) +
                "</p></div>" +
                '<span class="font-label-md text-label-md text-primary">' +
                esc(n.amounts && n.amounts.length ? n.amounts.join(" + ") : "섭취") +
                "</span></div>"
            )
            .join("");
        }
      }
    } catch (e) {
      /* 무시 */
    }
  }

  // ── 제품 등록 ────────────────────────────────────────────
  function nutrientRowHTML(name, amount) {
    return (
      '<div class="flex items-center gap-sm bg-surface-container-low p-sm rounded-lg border border-outline-variant/30">' +
      '<div class="flex-1"><input class="nutr-name w-full bg-transparent border-none p-0 font-body-sm text-on-surface focus:ring-0" placeholder="성분명" type="text" value="' +
      esc(name || "") +
      '"></div>' +
      '<div class="w-24"><input class="nutr-amount w-full bg-transparent border-none p-0 font-label-md text-primary text-right focus:ring-0" placeholder="함량" type="text" value="' +
      esc(amount || "") +
      '"></div>' +
      '<button type="button" class="nutr-del text-error/60 hover:text-error active:scale-90 transition-all"><span class="material-symbols-outlined text-xl">close</span></button>' +
      "</div>"
    );
  }
  function showPhoto(url) {
    const hidden = document.getElementById("reg-image-url");
    const wrap = document.getElementById("reg-photo-preview");
    const img = document.getElementById("reg-photo-img");
    if (hidden) hidden.value = url;
    if (img) img.src = url;
    if (wrap) wrap.classList.remove("hidden");
  }
  function clearPhoto() {
    const hidden = document.getElementById("reg-image-url");
    const wrap = document.getElementById("reg-photo-preview");
    if (hidden) hidden.value = "";
    if (wrap) wrap.classList.add("hidden");
  }
  function setupPhoto() {
    const scanBtn = document.getElementById("scan-btn");
    const input = document.getElementById("reg-photo-input");
    const removeBtn = document.getElementById("reg-photo-remove");
    if (scanBtn && input) scanBtn.addEventListener("click", () => input.click());
    if (removeBtn) removeBtn.addEventListener("click", clearPhoto);
    if (input)
      input.addEventListener("change", async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        const label = scanBtn ? scanBtn.querySelector("span:last-child") : null;
        const prev = label ? label.textContent : "";
        if (label) label.textContent = "업로드 중…";
        try {
          const dataUrl = await downscaleToDataUrl(file, 1280, 0.8);
          const r = await fetch("/api/upload-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dataUrl: dataUrl, filename: "label" }),
          });
          const d = await r.json();
          if (r.ok && d.url) showPhoto(d.url);
          else alert("사진 업로드 실패: " + (d.error || r.status));
        } catch (e) {
          alert("사진 처리 중 오류가 발생했습니다.");
        } finally {
          if (label) label.textContent = prev;
          input.value = "";
        }
      });
  }

  let editId = null;
  async function initRegister() {
    const form = document.getElementById("reg-form");
    if (!form) return;
    const listEl = document.getElementById("nutrient-list");
    const addBtn = document.getElementById("add-nutrient");
    if (addBtn && listEl)
      addBtn.addEventListener("click", () =>
        listEl.insertAdjacentHTML("beforeend", nutrientRowHTML("", ""))
      );
    if (listEl)
      listEl.addEventListener("click", (e) => {
        const del = e.target.closest(".nutr-del");
        if (del) del.closest("div.flex").remove();
      });

    // 라벨 스캔(카메라 촬영 → 축소 → 업로드)
    setupPhoto();

    // 수정 모드: ?edit=<id> 가 있으면 기존 데이터 로드
    const qid = new URLSearchParams(location.search).get("edit");
    if (!qid) return;
    try {
      const r = await fetch("/api/supplements/" + qid);
      if (!r.ok) return;
      const d = await r.json();
      const s = d.supplement;
      if (!s) return; // 공동 제품 — 누구나 수정 가능
      editId = s.id;
      const setVal = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.value = v || "";
      };
      setVal("reg-name", s.name);
      setVal("reg-brand", s.brand);
      setVal("reg-category", s.category);
      setVal("reg-timing", s.timing);
      if (s.image_url) showPhoto(s.image_url);
      if (listEl) {
        const rows = (Array.isArray(s.nutrients) ? s.nutrients : [])
          .map((n) => nutrientRowHTML(n.name, n.amount))
          .join("");
        listEl.innerHTML = rows || nutrientRowHTML("", "");
      }
      const title = document.getElementById("reg-title");
      if (title) title.textContent = "제품 수정";
      const sub = document.getElementById("reg-sub");
      if (sub) sub.textContent = "영양제 정보를 수정하세요.";
      const lbl = document.getElementById("reg-submit-label");
      if (lbl) lbl.textContent = "수정 완료";
    } catch (e) {
      /* 무시 */
    }
  }
  async function submitRegister(ev) {
    if (ev) ev.preventDefault();
    const o = owner();
    const name = (document.getElementById("reg-name") || {}).value || "";
    const brand = (document.getElementById("reg-brand") || {}).value || "";
    const category = (document.getElementById("reg-category") || {}).value || "";
    const timing = (document.getElementById("reg-timing") || {}).value || "";
    const image_url = (document.getElementById("reg-image-url") || {}).value || "";
    const nutrients = [];
    document.querySelectorAll("#nutrient-list > div").forEach((row) => {
      const nm = (row.querySelector(".nutr-name") || {}).value || "";
      const am = (row.querySelector(".nutr-amount") || {}).value || "";
      if (nm.trim()) nutrients.push({ name: nm.trim(), amount: am.trim() });
    });
    if (!name.trim()) {
      alert("제품명을 입력하세요.");
      return;
    }
    const url = editId ? "/api/supplements/" + editId : "/api/supplements";
    const method = editId ? "PUT" : "POST";
    try {
      const r = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: o, name, brand, category, timing, image_url, nutrients }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        alert((editId ? "수정" : "등록") + " 실패: " + (e.error || r.status));
        return;
      }
      location.href = "storage.html";
    } catch (e) {
      alert((editId ? "수정" : "등록") + " 중 오류가 발생했습니다.");
    }
  }

  window.NUTR = { submitRegister: submitRegister };

  function boot() {
    const page = document.body ? document.body.getAttribute("data-nutr-page") : null;
    if (page === "storage") initStorage();
    else if (page === "today") initToday();
    else if (page === "stats") initStats();
    else if (page === "register") initRegister();
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
