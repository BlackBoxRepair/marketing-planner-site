/* ========= 你只要改這兩行 ========= */
const SUPABASE_URL = "https://udycidkswyqasnzwlmqv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeWNpZGtzd3lxYXNuendsbXF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2ODYzNzUsImV4cCI6MjA4ODI2MjM3NX0.Gu68eely_7xJrRBAuevEXzPt93Hnzr1fVwnz3SSp3pk ";
/* ================================= */

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);

function qs(name){
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function setMsg(el, text){
  if (!el) return;
  el.textContent = text || "";
}

function ymLink(year_month){
  return `./month.html?ym=${encodeURIComponent(year_month)}`;
}

async function fetchMonths(){
  const { data, error } = await supabase
    .from("months")
    .select("*")
    .order("year_month", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function upsertMonth({year_month, theme, notes}){
  const { data, error } = await supabase
    .from("months")
    .upsert({ year_month, theme, notes }, { onConflict: "year_month" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateMonthById(id, payload){
  const { data, error } = await supabase
    .from("months")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function deleteMonthById(id){
  const { error } = await supabase
    .from("months")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

async function getMonthByYearMonth(year_month){
  const { data, error } = await supabase
    .from("months")
    .select("*")
    .eq("year_month", year_month)
    .single();

  if (error) throw error;
  return data;
}

/* ===== Playbook weeks ===== */
async function listWeeks(month_id){
  const { data, error } = await supabase
    .from("playbook_weeks")
    .select("*")
    .eq("month_id", month_id)
    .order("week", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function createWeek(month_id, week){
  const { data, error } = await supabase
    .from("playbook_weeks")
    .insert({ month_id, week })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateWeek(id, payload){
  const { data, error } = await supabase
    .from("playbook_weeks")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/* ===== Campaigns ===== */
async function listCampaigns(month_id){
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("month_id", month_id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function upsertCampaign(payload){
  // If payload.id exists -> update, else insert
  if (payload.id){
    const id = payload.id;
    delete payload.id;
    const { data, error } = await supabase
      .from("campaigns")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from("campaigns")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

async function deleteCampaign(id){
  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/* ===== Change log ===== */
async function listChangeLogsForMonth(month_id){
  // join not used; fetch campaigns then logs
  const campaigns = await listCampaigns(month_id);
  const ids = campaigns.map(c => c.id);
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("change_log")
    .select("*")
    .in("campaign_id", ids)
    .order("timestamp", { ascending: false });

  if (error) throw error;

  // attach campaign name
  const map = new Map(campaigns.map(c => [c.id, c.campaign_name]));
  return (data || []).map(r => ({...r, campaign_name: map.get(r.campaign_id) || ""}));
}

async function addChangeLog(payload){
  const { data, error } = await supabase
    .from("change_log")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function deleteChangeLog(id){
  const { error } = await supabase
    .from("change_log")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/* ========= UI ========= */
function monthCard(m){
  const div = document.createElement("div");
  div.className = "item";
  div.innerHTML = `
    <div class="item-title">${m.year_month}｜${escapeHtml(m.theme)}</div>
    <div class="item-sub">${escapeHtml(m.notes || "")}</div>
    <div class="item-actions">
      <a class="ghost" href="${ymLink(m.year_month)}">進入本月 →</a>
    </div>
  `;
  return div;
}

function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function weekItem(w){
  const div = document.createElement("div");
  div.className = "item";
  div.innerHTML = `
    <div class="row space-between">
      <div>
        <div class="item-title">${w.week}</div>
        <div class="item-sub">Focus：${escapeHtml(w.focus || "")}</div>
      </div>
      <button class="ghost" data-action="saveWeek">儲存</button>
    </div>
    <div class="grid-3" style="margin-top:10px">
      <label>
        <span>Focus（測試/放大/優化/收斂）</span>
        <input data-field="focus" value="${escapeHtml(w.focus || "")}" />
      </label>
      <label class="col-span-3">
        <span>Plan（本週要做什麼）</span>
        <input data-field="plan" value="${escapeHtml(w.plan || "")}" />
      </label>
    </div>
    <div class="msg" data-msg></div>
  `;

  div.querySelector('[data-action="saveWeek"]').addEventListener("click", async () => {
    const focus = div.querySelector('[data-field="focus"]').value.trim();
    const plan = div.querySelector('[data-field="plan"]').value.trim();
    const msg = div.querySelector("[data-msg]");
    try{
      await updateWeek(w.id, { focus, plan });
      setMsg(msg, "已儲存 ✅");
      setTimeout(()=>setMsg(msg,""), 1200);
    }catch(e){
      setMsg(msg, `儲存失敗：${e.message}`);
    }
  });

  return div;
}

function campaignItem(c, onEdit, onDelete, onAddLog){
  const div = document.createElement("div");
  div.className = "item";

  div.innerHTML = `
    <div class="row space-between">
      <div>
        <div class="item-title">${escapeHtml(c.campaign_name)}</div>
        <div class="item-sub">${escapeHtml(c.platform)}｜${escapeHtml(c.store)}｜${escapeHtml(c.product)}｜${escapeHtml(c.theme)}｜${escapeHtml(c.objective)}｜${escapeHtml(c.status)}</div>
        <div class="item-sub">期間：${c.start_date || "-"} ～ ${c.end_date || "-"}</div>
        <div class="item-sub">預算：${escapeHtml(c.budget_note || "")}</div>
      </div>
      <div class="item-actions">
        <button class="ghost" data-act="edit">編輯</button>
        <button class="ghost" data-act="log">新增變更</button>
        <button class="danger" data-act="del">刪除</button>
      </div>
    </div>
  `;

  div.querySelector('[data-act="edit"]').addEventListener("click", ()=>onEdit(c));
  div.querySelector('[data-act="del"]').addEventListener("click", ()=>onDelete(c));
  div.querySelector('[data-act="log"]').addEventListener("click", ()=>onAddLog(c));

  return div;
}

function logItem(l, onDelete){
  const div = document.createElement("div");
  div.className = "item";
  const dt = new Date(l.timestamp);
  div.innerHTML = `
    <div class="row space-between">
      <div>
        <div class="item-title">${escapeHtml(l.campaign_name)}｜${escapeHtml(l.change_type)}</div>
        <div class="item-sub">${dt.toLocaleString()}</div>
        <div class="item-sub">Before：${escapeHtml(l.before || "")}</div>
        <div class="item-sub">After：${escapeHtml(l.after || "")}</div>
        <div class="item-sub">原因/假設：${escapeHtml(l.hypothesis || "")}</div>
      </div>
      <button class="danger" data-act="del">刪除</button>
    </div>
  `;
  div.querySelector('[data-act="del"]').addEventListener("click", ()=>onDelete(l));
  return div;
}

/* ========= Public API ========= */
const Planner = {
  async initIndex(){
    const msg = $("msg");
    const list = $("monthsList");
    const btn = $("btnCreateMonth");
    const btnRefresh = $("btnRefresh");

    const render = async () => {
      list.innerHTML = "";
      try{
        const months = await fetchMonths();
        if (!months.length){
          list.innerHTML = `<div class="item"><div class="item-title">目前還沒有月份</div><div class="item-sub">先在上方新增一個月份吧。</div></div>`;
          return;
        }
        months.forEach(m => list.appendChild(monthCard(m)));
      }catch(e){
        list.innerHTML = `<div class="item"><div class="item-title">讀取失敗</div><div class="item-sub">${escapeHtml(e.message)}</div></div>`;
      }
    };

    btn.addEventListener("click", async ()=>{
      const year_month = $("yearMonth").value.trim();
      const theme = $("theme").value.trim();
      const notes = $("notes").value.trim();

      if (!/^\d{4}-\d{2}$/.test(year_month)){
        setMsg(msg, "月份格式請用 YYYY-MM（例如 2026-03）");
        return;
      }
      if (!theme){
        setMsg(msg, "請填主題（Theme）");
        return;
      }

      try{
        await upsertMonth({ year_month, theme, notes });
        $("yearMonth").value = "";
        $("theme").value = "";
        $("notes").value = "";
        setMsg(msg, "新增成功 ✅");
        setTimeout(()=>setMsg(msg,""), 1200);
        await render();
      }catch(e){
        setMsg(msg, `新增失敗：${e.message}`);
      }
    });

    btnRefresh.addEventListener("click", render);
    await render();
  },

  async initMonth(){
    const ym = qs("ym");
    if (!ym){
      alert("缺少 ym 參數，請從月份列表進入。");
      window.location.href = "./index.html";
      return;
    }

    // UI refs
    const msgMonth = $("msgMonth");
    const weeksList = $("weeksList");
    const campaignsList = $("campaignsList");
    const logList = $("logList");

    let month = null;

    const setTitle = () => {
      $("pageTitle").textContent = `${month.year_month}｜${month.theme}`;
      $("pageSub").textContent = `第二層：W1~W4 節奏 + 活動 + 變更紀錄（${month.year_month}）`;
    };

    const load = async () => {
      try{
        month = await getMonthByYearMonth(ym);
        $("mYearMonth").value = month.year_month;
        $("mTheme").value = month.theme || "";
        $("mNotes").value = month.notes || "";
        setTitle();
      }catch(e){
        alert(`讀取月份失敗：${e.message}`);
        window.location.href = "./index.html";
        return;
      }

      await renderWeeks();
      await renderCampaigns();
      await renderLogs();
    };

    const renderWeeks = async () => {
      weeksList.innerHTML = "";
      try{
        const weeks = await listWeeks(month.id);
        if (!weeks.length){
          weeksList.innerHTML = `<div class="item"><div class="item-title">尚未建立 W1~W4</div><div class="item-sub">點上方「一鍵建立 W1~W4」。</div></div>`;
          return;
        }
        weeks.forEach(w => weeksList.appendChild(weekItem(w)));
      }catch(e){
        weeksList.innerHTML = `<div class="item"><div class="item-title">讀取失敗</div><div class="item-sub">${escapeHtml(e.message)}</div></div>`;
      }
    };

    const renderCampaigns = async () => {
      campaignsList.innerHTML = "";
      try{
        const campaigns = await listCampaigns(month.id);
        if (!campaigns.length){
          campaignsList.innerHTML = `<div class="item"><div class="item-title">尚未建立活動</div><div class="item-sub">點「新增活動」建立本月投放活動。</div></div>`;
          return;
        }

        campaigns.forEach(c => {
          campaignsList.appendChild(
            campaignItem(
              c,
              (c)=>openCampaignModal(c),
              async (c)=>{
                if (!confirm(`確定刪除活動？\n${c.campaign_name}`)) return;
                try{
                  await deleteCampaign(c.id);
                  await renderCampaigns();
                  await renderLogs();
                }catch(e){
                  alert(`刪除失敗：${e.message}`);
                }
              },
              (c)=>openLogModal(c)
            )
          );
        });

      }catch(e){
        campaignsList.innerHTML = `<div class="item"><div class="item-title">讀取失敗</div><div class="item-sub">${escapeHtml(e.message)}</div></div>`;
      }
    };

    const renderLogs = async () => {
      logList.innerHTML = "";
      try{
        const logs = await listChangeLogsForMonth(month.id);
        if (!logs.length){
          logList.innerHTML = `<div class="item"><div class="item-title">目前沒有變更紀錄</div><div class="item-sub">在活動卡片點「新增變更」即可新增。</div></div>`;
          return;
        }
        logs.forEach(l => logList.appendChild(logItem(l, async (l)=>{
          if (!confirm("確定刪除此變更紀錄？")) return;
          try{
            await deleteChangeLog(l.id);
            await renderLogs();
          }catch(e){
            alert(`刪除失敗：${e.message}`);
          }
        })));
      }catch(e){
        logList.innerHTML = `<div class="item"><div class="item-title">讀取失敗</div><div class="item-sub">${escapeHtml(e.message)}</div></div>`;
      }
    };

    // month actions
    $("btnSaveMonth").addEventListener("click", async ()=>{
      try{
        const theme = $("mTheme").value.trim();
        const notes = $("mNotes").value.trim();
        if (!theme){
          setMsg(msgMonth, "主題不能為空");
          return;
        }
        month = await updateMonthById(month.id, { theme, notes });
        setTitle();
        setMsg(msgMonth, "已儲存 ✅");
        setTimeout(()=>setMsg(msgMonth,""), 1200);
      }catch(e){
        setMsg(msgMonth, `儲存失敗：${e.message}`);
      }
    });

    $("btnDeleteMonth").addEventListener("click", async ()=>{
      if (!confirm(`確定刪除此月份？\n${month.year_month}`)) return;
      try{
        await deleteMonthById(month.id);
        alert("已刪除");
        window.location.href = "./index.html";
      }catch(e){
        alert(`刪除失敗：${e.message}`);
      }
    });

    $("btnRefreshMonth").addEventListener("click", load);

    $("btnInitWeeks").addEventListener("click", async ()=>{
      try{
        const existing = await listWeeks(month.id);
        const need = ["W1","W2","W3","W4"].filter(w => !existing.some(x => x.week === w));
        for (const w of need){
          await createWeek(month.id, w);
        }
        await renderWeeks();
      }catch(e){
        alert(`建立失敗：${e.message}`);
      }
    });

    // Campaign modal
    const modal = $("modal");
    const modalMsg = $("modalMsg");
    const openModal = () => modal.classList.remove("hidden");
    const closeModal = () => modal.classList.add("hidden");

    $("modalClose").addEventListener("click", closeModal);
    $("btnNewCampaign").addEventListener("click", ()=>openCampaignModal(null));

    const openCampaignModal = (c) => {
      setMsg(modalMsg, "");
      $("cId").value = c?.id || "";
      $("modalTitle").textContent = c ? "編輯活動" : "新增活動";

      $("cPlatform").value = c?.platform || "META";
      $("cStore").value = c?.store || "勤美";
      $("cProduct").value = c?.product || "電池更換";
      $("cTheme").value = c?.theme || month.theme || "";
      $("cObjective").value = c?.objective || "MSG";
      $("cName").value = c?.campaign_name || "";
      $("cStart").value = c?.start_date || "";
      $("cEnd").value = c?.end_date || "";
      $("cBudget").value = c?.budget_note || "";
      $("cStatus").value = c?.status || "規劃中";

      openModal();
    };

    $("modalSave").addEventListener("click", async ()=>{
      const id = $("cId").value.trim() || null;

      const payload = {
        month_id: month.id,
        platform: $("cPlatform").value,
        store: $("cStore").value,
        product: $("cProduct").value,
        theme: $("cTheme").value.trim(),
        objective: $("cObjective").value,
        campaign_name: $("cName").value.trim(),
        start_date: $("cStart").value || null,
        end_date: $("cEnd").value || null,
        budget_note: $("cBudget").value.trim(),
        status: $("cStatus").value
      };

      if (!payload.theme){
        setMsg(modalMsg, "主題（Theme）必填");
        return;
      }
      if (!payload.campaign_name){
        setMsg(modalMsg, "活動名稱必填");
        return;
      }
      if (id) payload.id = id;

      try{
        await upsertCampaign(payload);
        closeModal();
        await renderCampaigns();
        await renderLogs();
      }catch(e){
        setMsg(modalMsg, `儲存失敗：${e.message}`);
      }
    });

    // Log modal
    const logModal = $("logModal");
    const logMsg = $("logMsg");
    const openLog = () => logModal.classList.remove("hidden");
    const closeLog = () => logModal.classList.add("hidden");

    $("logClose").addEventListener("click", closeLog);

    const openLogModal = (c) => {
      setMsg(logMsg, "");
      $("lCampaignId").value = c.id;
      $("lType").value = "預算";
      $("lBefore").value = "";
      $("lAfter").value = "";
      $("lHypo").value = "";
      openLog();
    };

    $("logSave").addEventListener("click", async ()=>{
      const campaign_id = $("lCampaignId").value;
      const payload = {
        campaign_id,
        change_type: $("lType").value,
        before: $("lBefore").value.trim(),
        after: $("lAfter").value.trim(),
        hypothesis: $("lHypo").value.trim(),
      };
      try{
        await addChangeLog(payload);
        closeLog();
        await renderLogs();
      }catch(e){
        setMsg(logMsg, `儲存失敗：${e.message}`);
      }
    });

    await load();
  }
};

window.Planner = Planner;
