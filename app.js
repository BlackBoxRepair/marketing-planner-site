/* ========= 你只要改這兩行 ========= */
const SUPABASE_URL = "https://udycidkswyqasnzwlmqv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWNpZGtzd3lxYXNuendsbXF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2ODYzNzUsImV4cCI6MjA4ODI2MjM3NX0.Gu68eely_7xJrRBAuevEXzPt93Hnzr1fVwnz3SSp3pk ";
/* ================================= */

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);
const esc = (s="") => String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");

function qs(name){
  const u = new URL(location.href);
  return u.searchParams.get(name);
}
function show(el){ el.classList.remove("hidden"); }
function hide(el){ el.classList.add("hidden"); }

async function listProjects(year){
  let q = supabase.from("projects").select("*").order("created_at",{ascending:false});
  if (year && year !== "ALL") q = q.eq("year", Number(year));
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}
async function listYears(){
  const { data, error } = await supabase.from("projects").select("year").order("year",{ascending:false});
  if (error) throw error;
  return [...new Set((data||[]).map(x=>x.year).filter(Boolean))];
}
async function createProject(payload){
  const { data, error } = await supabase.from("projects").insert(payload).select().single();
  if (error) throw error;
  return data;
}
async function getProject(id){
  const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}
async function updateProject(id, payload){
  const { data, error } = await supabase.from("projects").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

/* playbook */
async function listWeeks(project_id){
  const { data, error } = await supabase.from("playbook_weeks")
    .select("*").eq("project_id", project_id).order("week",{ascending:true});
  if (error) throw error;
  return data || [];
}
async function ensureWeeks(project_id){
  const weeks = await listWeeks(project_id);
  const have = new Set(weeks.map(w=>w.week));
  const need = ["W1","W2","W3","W4"].filter(w=>!have.has(w));
  for (const w of need){
    const { error } = await supabase.from("playbook_weeks").insert({ project_id, week: w });
    if (error) throw error;
  }
}
async function saveWeek(id, focus, plan){
  const { error } = await supabase.from("playbook_weeks").update({focus, plan}).eq("id", id);
  if (error) throw error;
}

/* campaigns */
async function listCampaigns(project_id){
  const { data, error } = await supabase.from("campaigns")
    .select("*").eq("project_id", project_id).order("created_at",{ascending:false});
  if (error) throw error;
  return data || [];
}
async function createCampaign(payload){
  const { data, error } = await supabase.from("campaigns").insert(payload).select().single();
  if (error) throw error;
  return data;
}

/* logs */
async function listLogs(project_id){
  const camps = await listCampaigns(project_id);
  const ids = camps.map(c=>c.id);
  if (!ids.length) return [];
  const { data, error } = await supabase.from("change_log")
    .select("*").in("campaign_id", ids).order("timestamp",{ascending:false});
  if (error) throw error;
  const map = new Map(camps.map(c=>[c.id, c.campaign_name]));
  return (data||[]).map(r=>({...r, campaign_name: map.get(r.campaign_id)||""}));
}
async function createLog(payload){
  const { data, error } = await supabase.from("change_log").insert(payload).select().single();
  if (error) throw error;
  return data;
}

/* ========= UI ========= */
const Planner = {
  async initProjectsIndex(){
    const grid = $("grid");
    const yearPill = $("yearPill");
    const dropdown = $("yearDropdown");
    const yearOptions = $("yearOptions");
    let currentYear = "ALL";

    const renderYears = async ()=>{
      const years = await listYears();
      yearOptions.innerHTML = years.map(y=>`<div class="dropdown-item" data-year="${y}">${y}</div>`).join("");
      dropdown.querySelectorAll(".dropdown-item").forEach(el=>{
        el.onclick = async ()=>{
          currentYear = el.dataset.year;
          hide(dropdown);
          await render();
        };
      });
    };

    const render = async ()=>{
      const projects = await listProjects(currentYear);
      grid.innerHTML = projects.map(p=>{
        return `
          <div class="card" data-id="${p.id}">
            <div class="big">${esc(p.title)}</div>
            <div class="meta">
              ${esc(p.year)}｜${esc(p.product||"")}｜${esc(p.theme||"")}<br/>
              ${esc(p.platforms||"")}｜${esc(p.store||"")}｜${esc(p.objective||"")}<br/>
              狀態：${esc(p.status||"")}
            </div>
          </div>
        `;
      }).join("");

      grid.querySelectorAll(".card").forEach(c=>{
        c.onclick = ()=> location.href = `./project.html?id=${encodeURIComponent(c.dataset.id)}`;
      });
    };

    yearPill.onclick = ()=>{
      dropdown.classList.contains("hidden") ? show(dropdown) : hide(dropdown);
    };

    // 點外面關 dropdown
    document.addEventListener("click",(e)=>{
      if (!dropdown.contains(e.target) && e.target !== yearPill) hide(dropdown);
    });

    // ===== 新增專案 modal（這段已修好：按鈕/背景/ESC 都能關）=====
    const modal = $("modal");
    const openBtn = $("btnOpenNewProject");
    const closeBtn = $("btnCloseModal");

    openBtn?.addEventListener("click", () => show(modal));
    closeBtn?.addEventListener("click", () => hide(modal));

    // 點背景關閉（點到卡片本體不會關）
    modal.addEventListener("click", (e) => {
      if (e.target === modal) hide(modal);
    });

    // ESC 關閉
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) hide(modal);
    });

    // 建立專案
    $("btnCreateProject").onclick = async ()=>{
      const msg = $("msg");
      msg.textContent = "";

      const year = Number($("pYear").value.trim());
      const title = $("pTitle").value.trim();
      const product = $("pProduct").value;
      const theme = $("pTheme").value.trim();
      const platforms = $("pPlatforms").value;
      const store = $("pStore").value;
      const objective = $("pObjective").value;
      const status = $("pStatus").value;
      const start_date = $("pStart").value || null;
      const end_date = $("pEnd").value || null;
      const notes = $("pNotes").value.trim();

      if (!year || year < 2000){ msg.textContent = "年度請填正確（例如 2026）"; return; }
      if (!title){ msg.textContent = "專案名稱必填"; return; }

      try{
        await createProject({ year, title, product, theme, platforms, store, objective, status, start_date, end_date, notes });
        hide(modal);
        // 清空欄位
        $("pYear").value=""; $("pTitle").value=""; $("pTheme").value=""; $("pStart").value=""; $("pEnd").value=""; $("pNotes").value="";
        await renderYears();
        await render();
      }catch(e){
        msg.textContent = "建立失敗：" + e.message;
      }
    };

    await renderYears();
    await render();
  },

  async initProjectDetail(){
    const id = qs("id");
    if (!id){ location.href="./index.html"; return; }

    let project = await getProject(id);

    $("ptitle").textContent = project.title;

    $("fYear").value = project.year || "";
    $("fTitle").value = project.title || "";
    $("fProduct").value = project.product || "";
    $("fTheme").value = project.theme || "";
    $("fPlatforms").value = project.platforms || "";
    $("fStore").value = project.store || "";
    $("fObjective").value = project.objective || "";
    $("fStatus").value = project.status || "";
    $("fStart").value = project.start_date || "";
    $("fEnd").value = project.end_date || "";
    $("fNotes").value = project.notes || "";

    const renderWeeks = async ()=>{
      const weeks = await listWeeks(project.id);
      const wrap = $("weeks");
      if (!weeks.length){
        wrap.innerHTML = `<div class="item"><div><div class="t">尚未建立 W1~W4</div><div class="s">點上方「一鍵建立 W1~W4」。</div></div></div>`;
        return;
      }
      wrap.innerHTML = "";
      weeks.forEach(w=>{
        const el = document.createElement("div");
        el.className = "item";
        el.innerHTML = `
          <div>
            <div class="t">${w.week}</div>
            <div class="s">Focus：<input data-f="focus" value="${esc(w.focus||"")}" /></div>
            <div class="s">Plan：<input data-f="plan" value="${esc(w.plan||"")}" /></div>
          </div>
          <div class="actions">
            <button class="pill" data-save>儲存</button>
          </div>
        `;
        el.querySelector("[data-save]").onclick = async ()=>{
          const focus = el.querySelector('[data-f="focus"]').value.trim();
          const plan = el.querySelector('[data-f="plan"]').value.trim();
          await saveWeek(w.id, focus, plan);
        };
        wrap.appendChild(el);
      });
    };

    const renderCampaigns = async ()=>{
      const list = await listCampaigns(project.id);
      const wrap = $("campaigns");
      if (!list.length){
        wrap.innerHTML = `<div class="item"><div><div class="t">尚未建立活動</div><div class="s">點右上「新增活動」。</div></div></div>`;
        return;
      }
      wrap.innerHTML = "";
      list.forEach(c=>{
        const el = document.createElement("div");
        el.className = "item";
        el.innerHTML = `
          <div>
            <div class="t">${esc(c.campaign_name)}</div>
            <div class="s">${esc(c.platform)}｜${esc(c.store)}｜${esc(c.product)}｜${esc(c.theme)}｜${esc(c.objective)}｜${esc(c.status)}</div>
            <div class="s">期間：${c.start_date||"-"} ～ ${c.end_date||"-"}</div>
            <div class="s">預算：${esc(c.budget_note||"")}</div>
          </div>
          <div class="actions">
            <button class="pill" data-log>新增變更</button>
          </div>
        `;
        el.querySelector("[data-log]").onclick = ()=>{
          $("lModal").dataset.cid = c.id;
          show($("lModal"));
        };
        wrap.appendChild(el);
      });
    };

    const renderLogs = async ()=>{
      const list = await listLogs(project.id);
      const wrap = $("logs");
      if (!list.length){
        wrap.innerHTML = `<div class="item"><div><div class="t">目前沒有變更紀錄</div><div class="s">在活動點「新增變更」即可。</div></div></div>`;
        return;
      }
      wrap.innerHTML = "";
      list.forEach(l=>{
        const el = document.createElement("div");
        el.className = "item";
        el.innerHTML = `
          <div>
            <div class="t">${esc(l.campaign_name)}｜${esc(l.change_type)}</div>
            <div class="s">${new Date(l.timestamp).toLocaleString()}</div>
            <div class="s">Before：${esc(l.before||"")}</div>
            <div class="s">After：${esc(l.after||"")}</div>
            <div class="s">原因/假設：${esc(l.hypothesis||"")}</div>
          </div>
        `;
        wrap.appendChild(el);
      });
    };

    $("btnInitWeeks").onclick = async ()=>{
      await ensureWeeks(project.id);
      await renderWeeks();
    };

    $("btnSaveProject").onclick = async ()=>{
      const pmsg = $("pmsg");
      pmsg.textContent = "";
      try{
        project = await updateProject(project.id, {
          year: Number($("fYear").value),
          title: $("fTitle").value.trim(),
          product: $("fProduct").value.trim(),
          theme: $("fTheme").value.trim(),
          platforms: $("fPlatforms").value.trim(),
          store: $("fStore").value.trim(),
          objective: $("fObjective").value.trim(),
          status: $("fStatus").value.trim(),
          start_date: $("fStart").value || null,
          end_date: $("fEnd").value || null,
          notes: $("fNotes").value.trim(),
        });
        $("ptitle").textContent = project.title;
        pmsg.textContent = "已儲存 ✅";
        setTimeout(()=>pmsg.textContent="",1200);
      }catch(e){
        pmsg.textContent = "儲存失敗：" + e.message;
      }
    };

    // ===== Campaign modal =====
    const cModal = $("cModal");
    $("btnNewCampaign").onclick = ()=>{
      $("cName").value = "";
      $("cPlatform").value = project.platforms || "META";
      $("cStore").value = project.store || "勤美";
      $("cProduct").value = project.product || "";
      $("cTheme").value = project.theme || "";
      $("cObjective").value = project.objective || "MSG";
      $("cStatus").value = project.status || "規劃中";
      $("cStart").value = project.start_date || "";
      $("cEnd").value = project.end_date || "";
      $("cBudget").value = "";
      $("cmsg").textContent = "";
      show(cModal);
    };
    $("btnCloseCModal").onclick = ()=>hide(cModal);
    cModal.addEventListener("click",(e)=>{ if (e.target === cModal) hide(cModal); });

    $("btnCreateCampaign").onclick = async ()=>{
      const cmsg = $("cmsg");
      cmsg.textContent = "";
      const campaign_name = $("cName").value.trim();
      if (!campaign_name){ cmsg.textContent="活動名稱必填"; return; }
      try{
        await createCampaign({
          project_id: project.id,
          month_id: null,
          platform: $("cPlatform").value.trim(),
          store: $("cStore").value.trim(),
          product: $("cProduct").value.trim(),
          theme: $("cTheme").value.trim(),
          objective: $("cObjective").value.trim(),
          campaign_name,
          start_date: $("cStart").value || null,
          end_date: $("cEnd").value || null,
          budget_note: $("cBudget").value.trim(),
          status: $("cStatus").value.trim() || "規劃中"
        });
        hide(cModal);
        await renderCampaigns();
      }catch(e){
        cmsg.textContent="建立失敗：" + e.message;
      }
    };

    // ===== Log modal =====
    const lModal = $("lModal");
    $("btnCloseLModal").onclick = ()=>hide(lModal);
    lModal.addEventListener("click",(e)=>{ if (e.target === lModal) hide(lModal); });

    $("btnCreateLog").onclick = async ()=>{
      const lmsg = $("lmsg");
      lmsg.textContent = "";
      const cid = lModal.dataset.cid;
      if (!cid){ lmsg.textContent="請先從活動點『新增變更』"; return; }
      try{
        await createLog({
          campaign_id: cid,
          change_type: $("lType").value.trim() || "其他",
          before: $("lBefore").value.trim(),
          after: $("lAfter").value.trim(),
          hypothesis: $("lHypo").value.trim(),
        });
        hide(lModal);
        $("lType").value=""; $("lBefore").value=""; $("lAfter").value=""; $("lHypo").value="";
        await renderLogs();
      }catch(e){
        lmsg.textContent="儲存失敗：" + e.message;
      }
    };

    // ESC 可關閉任何 modal（如果打開）
    document.addEventListener("keydown",(e)=>{
      if (e.key !== "Escape") return;
      if (!cModal.classList.contains("hidden")) hide(cModal);
      if (!lModal.classList.contains("hidden")) hide(lModal);
    });

    await renderWeeks();
    await renderCampaigns();
    await renderLogs();
  }
};

window.Planner = Planner;
