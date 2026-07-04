// ISTQB 문제풀이 앱 로직
(function(){
  const MODULE_STORAGE_KEY = "istqb_quiz_active_module";
  const MODULES = {
    TA: {
      label: "Test Analyst",
      titleFull: "ISTQB Advanced Level — Test Analyst 문제풀이",
      titleShort: "ISTQB AL-TA 문제풀이",
      footer: "ISTQB_AL_TA_v4.0_샘플문제_v4.1_한글_v1.1.pdf 기반",
      get: () => (typeof TA_QUESTIONS !== "undefined" ? TA_QUESTIONS : []),
    },
    TM: {
      label: "Test Manager",
      titleFull: "ISTQB Advanced Level — Test Manager 문제풀이",
      titleShort: "ISTQB AL-TM 문제풀이",
      footer: "ISTQB_CTAL-TM_v3.0_샘플문제_v1.3.3_한글_v1.0.pdf 기반",
      get: () => (typeof TM_QUESTIONS !== "undefined" ? TM_QUESTIONS : []),
    },
    TTA: {
      label: "Technical Test Analyst",
      titleFull: "ISTQB Advanced Level — Technical Test Analyst 문제풀이",
      titleShort: "ISTQB AL-TTA 문제풀이",
      footer: "ISTQB_AL_TTA_v4.0_샘플문제_v4.2_한글_v1.0.pdf 기반",
      get: () => (typeof TTA_QUESTIONS !== "undefined" ? TTA_QUESTIONS : []),
    },
  };

  let currentModule = "TA";
  let QUESTIONS = [];
  let byId = {};
  let STORAGE_KEY = "";

  // ---- state ----
  let state = {
    answers: {}, // id -> {selected:[...], submitted:bool, correct:bool, order:[...], match:{...}}
  };

  let filter = "all";
  let shuffled = false;
  let workingOrder = [];
  let currentIdx = 0;

  const el = sel => document.querySelector(sel);
  const qnav = el("#qnav");
  const qnavGrid = el("#qnavGrid");
  const qnavSummary = el("#qnavSummary");
  const qnavToggle = el("#qnavToggle");
  const questionCard = el("#questionCard");
  const progressText = el("#progressText");
  const scoreText = el("#scoreText");
  const progressFill = el("#progressFill");
  const prevBtn = el("#prevBtn");
  const nextBtn = el("#nextBtn");
  const submitBtn = el("#submitBtn");
  const filterSelect = el("#filterSelect");
  const shuffleToggle = el("#shuffleToggle");
  const resetBtn = el("#resetBtn");
  const footerNote = el("#footerNote");
  const titleFullEl = el(".title-full");
  const titleShortEl = el(".title-short");
  const moduleTrigger = el("#moduleTrigger");
  const moduleMenu = el("#moduleMenu");
  const moduleOptions = document.querySelectorAll(".module-option");
  let navExpanded = false;

  function loadState(){
    state = { answers: {} };
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw) state = JSON.parse(raw);
    }catch(e){ /* ignore */ }
  }
  function saveState(){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){}
  }

  function setMenuOpen(v){
    moduleMenu.classList.toggle("open", v);
    moduleTrigger.setAttribute("aria-expanded", v ? "true" : "false");
  }

  function updateModuleUI(){
    const m = MODULES[currentModule];
    titleFullEl.textContent = m.titleFull;
    titleShortEl.textContent = m.titleShort;
    footerNote.textContent = m.footer;
    document.title = m.titleShort;
    moduleOptions.forEach(btn=>{
      btn.classList.toggle("active", btn.getAttribute("data-module") === currentModule);
    });
  }

  function loadModule(id){
    if(!MODULES[id]) return;
    currentModule = id;
    try{ localStorage.setItem(MODULE_STORAGE_KEY, id); }catch(e){}
    QUESTIONS = MODULES[id].get();
    byId = {};
    QUESTIONS.forEach(q => byId[q.id] = q);
    STORAGE_KEY = "istqb_quiz_state_v1_" + id;
    loadState();
    filter = "all";
    filterSelect.value = "all";
    shuffled = false;
    shuffleToggle.checked = false;
    currentIdx = 0;
    updateModuleUI();
    applyFilter();
    renderAll();
  }
  function getAns(id){
    if(!state.answers[id]) state.answers[id] = {selected:[], submitted:false, correct:false, order:null, match:null};
    return state.answers[id];
  }

  function shuffle(arr){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  function applyFilter(){
    let list = QUESTIONS.slice();
    if(filter === "main") list = list.filter(q=>q.section==="main");
    else if(filter === "appendix") list = list.filter(q=>q.section==="appendix");
    else if(filter === "wrong") list = list.filter(q=>{ const a=state.answers[q.id]; return a && a.submitted && !a.correct; });
    else if(filter === "unanswered") list = list.filter(q=>{ const a=state.answers[q.id]; return !a || !a.submitted; });

    workingOrder = list.map(q=>q.id);
    if(shuffled) workingOrder = shuffle(workingOrder);
    if(workingOrder.length === 0){ currentIdx = 0; }
    else if(currentIdx >= workingOrder.length) currentIdx = 0;
  }

  function renderNav(){
    qnavGrid.innerHTML = "";
    const curId = workingOrder[currentIdx];
    let currentEl = null;
    workingOrder.forEach(qid=>{
      const q = byId[qid];
      const div = document.createElement("div");
      div.className = "qnav-item";
      div.textContent = q.id;
      const a = state.answers[q.id];
      if(a && a.submitted){
        div.classList.add(a.correct ? "correct" : "incorrect");
      }
      if(q.id === curId){ div.classList.add("current"); currentEl = div; }
      div.addEventListener("click", ()=>{
        const idx = workingOrder.indexOf(q.id);
        if(idx >= 0){ currentIdx = idx; renderAll(); }
      });
      qnavGrid.appendChild(div);
    });
    if(qnavSummary){
      qnavSummary.textContent = workingOrder.length ? `${currentIdx+1} / ${workingOrder.length}` : "0 / 0";
    }
    if(currentEl){
      currentEl.scrollIntoView({block:"nearest", inline:"center"});
    }
  }

  function setNavExpanded(v){
    navExpanded = v;
    qnavGrid.classList.toggle("expanded", navExpanded);
    if(qnavToggle) qnavToggle.textContent = navExpanded ? "문제 목록 접기 ▴" : "문제 목록 펼치기 ▾";
  }

  function computeScore(){
    let earned = 0, total = 0;
    QUESTIONS.forEach(q=>{
      total += q.points;
      const a = state.answers[q.id];
      if(a && a.submitted && a.correct) earned += q.points;
    });
    return {earned, total};
  }

  function renderProgress(){
    const answeredCount = QUESTIONS.filter(q=>{ const a=state.answers[q.id]; return a && a.submitted; }).length;
    progressText.textContent = `${answeredCount} / ${QUESTIONS.length} 문항 풀이 완료`;
    const {earned, total} = computeScore();
    scoreText.textContent = `점수: ${earned} / ${total}`;
    progressFill.style.width = (QUESTIONS.length? (answeredCount/QUESTIONS.length*100):0) + "%";
  }

  function textToHtml(text){
    // escape then convert tables-looking blocks (lines containing '|') into <pre>, rest as formatted text
    const esc = s => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const inlineFormat = s => esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.+?)__/g, "<u>$1</u>");
    const lines = text.split("\n");
    let html = "";
    let buffer = [];
    let inPre = false;
    function flushPre(){
      if(buffer.length){
        html += "<pre>" + esc(buffer.join("\n")) + "</pre>";
        buffer = [];
      }
    }
    lines.forEach(line=>{
      const isTableLine = line.includes("|") || /^\[.*\]$/.test(line.trim()) || line.includes("-->");
      if(isTableLine){
        if(!inPre){ inPre = true; }
        buffer.push(line);
      } else {
        if(inPre){ flushPre(); inPre = false; }
        const trimmed = line.trim();
        if(/^[•▪]/.test(trimmed)){
          html += `<span class="bullet-line">${inlineFormat(line)}</span>\n`;
        } else {
          html += inlineFormat(line) + "\n";
        }
      }
    });
    if(inPre) flushPre();
    return html;
  }

  function renderTable(t){
    const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    let html = `<div class="table-wrap">`;
    if(t.caption) html += `<div class="table-caption">${esc(t.caption)}</div>`;
    html += `<table class="q-table">`;
    if(t.headers){
      html += `<thead><tr>` + t.headers.map(h=>`<th>${esc(h)}</th>`).join("") + `</tr></thead>`;
    }
    html += `<tbody>`;
    t.rows.forEach(row=>{
      html += `<tr>` + row.map((cell,i)=>{
        const tag = (t.headerCol && i===0) ? "th" : "td";
        return `<${tag}>${esc(cell)}</${tag}>`;
      }).join("") + `</tr>`;
    });
    html += `</tbody></table></div>`;
    return html;
  }

  function renderQuestion(){
    if(QUESTIONS.length === 0){
      const m = MODULES[currentModule];
      questionCard.innerHTML = `<div class="q-text"><strong>${escapeHtml(m.label)} 샘플문제가 아직 준비되지 않았습니다.</strong><br>PDF가 추가되면 이 화면에 문제가 표시됩니다. 좌측 상단 제목을 눌러 다른 모듈(TA/TM/TTA)로 전환할 수 있습니다.</div>`;
      submitBtn.disabled = true;
      submitBtn.textContent = "정답확인";
      return;
    }
    if(workingOrder.length === 0){
      questionCard.innerHTML = `<div class="q-text">현재 필터 조건에 해당하는 문제가 없습니다.</div>`;
      submitBtn.disabled = true;
      submitBtn.textContent = "정답확인";
      return;
    }
    const qid = workingOrder[currentIdx];
    const q = byId[qid];
    const ans = getAns(qid);

    const typeLabel = {single:"단일 선택", multi:"복수 선택", order:"순서 배열", match:"매칭"}[q.type];
    let html = `<div class="q-meta">
      <span class="q-badge">${q.section === "main" ? "본문제" : "부록"} #${q.id}</span>
      <span class="q-badge points">${q.points}점</span>
      <span class="q-badge type">${typeLabel}</span>
    </div>`;
    html += `<div class="q-text">${textToHtml(q.text)}</div>`;
    if(q.image){
      html += `<div class="q-image-wrap"><img src="${q.image}" alt="${escapeHtml(q.imageAlt||'')}" class="q-image"></div>`;
    }
    if(q.tables){
      q.tables.forEach(t => { html += renderTable(t); });
    }
    if(q.text2){
      html += `<div class="q-text">${textToHtml(q.text2)}</div>`;
    }

    if(q.type === "single" || q.type === "multi"){
      html += `<div class="options" id="optionsWrap">`;
      q.options.forEach(opt=>{
        const selected = ans.selected.includes(opt.key);
        let cls = "option" + (selected ? " selected":"");
        if(ans.submitted){
          cls += " locked";
          const isCorrectKey = q.answer.includes(opt.key);
          if(isCorrectKey) cls += " opt-correct";
          else if(selected) cls += " opt-incorrect";
        }
        const inputType = q.type === "single" ? "radio" : "checkbox";
        html += `<label class="${cls}" data-key="${opt.key}">
          <input type="${inputType}" name="opt" value="${opt.key}" ${selected?"checked":""} ${ans.submitted?"disabled":""}>
          <span><span class="opt-key">${opt.key})</span>${opt.text}</span>
        </label>`;
      });
      html += `</div>`;
    } else if(q.type === "order"){
      const keys = Object.keys(q.items);
      const userOrder = ans.order || ["","","",""];
      html += `<div class="order-wrap">`;
      for(let i=0;i<q.correctOrder.length;i++){
        const disabled = ans.submitted ? "disabled" : "";
        html += `<div class="order-row"><span class="slot-label">활동 ${i+1}</span>
          <select data-slot="${i}" ${disabled}>
            <option value="">선택...</option>
            ${keys.map(k=>`<option value="${k}" ${userOrder[i]===k?"selected":""}>${k}) ${q.items[k]}</option>`).join("")}
          </select></div>`;
      }
      html += `</div>`;
      if(ans.submitted){
        html += `<div class="q-text" style="margin-top:10px;font-size:13px;color:var(--muted)">정답 순서: ${q.correctOrder.map(k=>`${k}) ${q.items[k]}`).join(" → ")}</div>`;
      }
    } else if(q.type === "match"){
      const userMatch = ans.match || {};
      html += `<div class="match-wrap">`;
      q.leftItems.forEach(li=>{
        const disabled = ans.submitted ? "disabled" : "";
        html += `<div class="match-row">
          <span class="item-label">${li.key}</span>
          <span class="item-text">${li.text}</span>
          <select data-item="${li.key}" ${disabled}>
            <option value="">선택...</option>
            ${q.rightGroups.map(g=>`<option value="${g.key}" ${userMatch[li.key]===g.key?"selected":""}>${g.key}</option>`).join("")}
          </select>
        </div>`;
      });
      html += `<div class="q-text" style="margin-top:6px;font-size:12.5px;color:var(--muted)">${q.rightGroups.map(g=>g.text).join(" / ")}</div>`;
      html += `</div>`;
    }

    if(ans.submitted){
      html += `<div class="feedback show ${ans.correct?"correct":"incorrect"}">
        <div class="fb-title">${ans.correct ? "정답입니다!" : "오답입니다."}</div>
        <div class="fb-answer">${answerSummary(q)}</div>
        <div class="fb-explain">${escapeHtml(q.explanation)}</div>
      </div>`;
    }

    questionCard.innerHTML = html;
    attachOptionHandlers(q, ans);

    submitBtn.disabled = ans.submitted;
    submitBtn.textContent = ans.submitted ? "채점 완료" : "정답확인";
  }

  function answerSummary(q){
    if(q.type === "single" || q.type === "multi"){
      return "정답: " + q.answer.map(k=>k+")").join(", ");
    } else if(q.type === "order"){
      return "정답 순서: " + q.correctOrder.join(" - ");
    } else if(q.type === "match"){
      return "정답: " + Object.keys(q.correctMatch).map(k=>`${k}-${q.correctMatch[k]}`).join(", ");
    }
    return "";
  }

  function escapeHtml(s){
    return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  function attachOptionHandlers(q, ans){
    if(ans.submitted) return;
    if(q.type === "single" || q.type === "multi"){
      const labels = questionCard.querySelectorAll(".option");
      labels.forEach(label=>{
        const input = label.querySelector("input");
        input.addEventListener("change", (e)=>{
          e.stopPropagation();
          const key = label.getAttribute("data-key");
          if(q.type === "single"){
            ans.selected = [key];
          } else {
            const idx = ans.selected.indexOf(key);
            if(idx >= 0) ans.selected.splice(idx,1);
            else ans.selected.push(key);
          }
          saveState();
          renderQuestion();
        });
      });
    } else if(q.type === "order"){
      const selects = questionCard.querySelectorAll("select[data-slot]");
      if(!ans.order) ans.order = ["","","",""];
      selects.forEach(s=>{
        s.addEventListener("change", ()=>{
          const slot = parseInt(s.getAttribute("data-slot"),10);
          ans.order[slot] = s.value;
          saveState();
        });
      });
    } else if(q.type === "match"){
      const selects = questionCard.querySelectorAll("select[data-item]");
      if(!ans.match) ans.match = {};
      selects.forEach(s=>{
        s.addEventListener("change", ()=>{
          const item = s.getAttribute("data-item");
          ans.match[item] = s.value;
          saveState();
        });
      });
    }
  }

  function checkCorrect(q, ans){
    if(q.type === "single" || q.type === "multi"){
      const sel = ans.selected.slice().sort();
      const cor = q.answer.slice().sort();
      return sel.length === cor.length && sel.every((v,i)=>v===cor[i]);
    } else if(q.type === "order"){
      const o = ans.order || [];
      return q.correctOrder.every((v,i)=>o[i]===v);
    } else if(q.type === "match"){
      const m = ans.match || {};
      return Object.keys(q.correctMatch).every(k=> m[k] === q.correctMatch[k]);
    }
    return false;
  }

  function submitCurrent(){
    if(workingOrder.length === 0) return;
    const qid = workingOrder[currentIdx];
    const q = byId[qid];
    const ans = getAns(qid);
    if(ans.submitted) return;

    if(q.type === "single" || q.type === "multi"){
      if(ans.selected.length === 0){ alert("답을 선택해 주세요."); return; }
    } else if(q.type === "order"){
      if(!ans.order || ans.order.includes("") || new Set(ans.order).size !== ans.order.length){
        alert("모든 슬롯에 서로 다른 항목을 배정해 주세요."); return;
      }
    } else if(q.type === "match"){
      const missing = q.leftItems.some(li => !(ans.match && ans.match[li.key]));
      if(missing){ alert("모든 항목을 매칭해 주세요."); return; }
    }

    ans.submitted = true;
    ans.correct = checkCorrect(q, ans);
    saveState();
    renderAll();
  }

  function goPrev(){
    if(currentIdx > 0){ currentIdx--; renderAll(); }
  }
  function goNext(){
    if(currentIdx < workingOrder.length-1){ currentIdx++; renderAll(); }
  }

  function renderAll(){
    applyFilterKeepIndex();
    renderNav();
    renderQuestion();
    renderProgress();
    prevBtn.disabled = currentIdx <= 0;
    nextBtn.disabled = currentIdx >= workingOrder.length-1;
  }

  function applyFilterKeepIndex(){
    const curId = workingOrder[currentIdx];
    applyFilter();
    if(curId){
      const idx = workingOrder.indexOf(curId);
      if(idx >= 0) currentIdx = idx;
    }
  }

  filterSelect.addEventListener("change", ()=>{
    filter = filterSelect.value;
    currentIdx = 0;
    applyFilter();
    renderAll();
  });
  shuffleToggle.addEventListener("change", ()=>{
    shuffled = shuffleToggle.checked;
    currentIdx = 0;
    applyFilter();
    renderAll();
  });
  resetBtn.addEventListener("click", ()=>{
    if(confirm("모든 답안과 점수 기록을 초기화할까요?")){
      state = {answers:{}};
      saveState();
      renderAll();
    }
  });
  prevBtn.addEventListener("click", goPrev);
  nextBtn.addEventListener("click", goNext);
  submitBtn.addEventListener("click", submitCurrent);
  if(qnavToggle){
    qnavToggle.addEventListener("click", ()=> setNavExpanded(!navExpanded));
  }

  moduleTrigger.addEventListener("click", (e)=>{
    e.stopPropagation();
    setMenuOpen(!moduleMenu.classList.contains("open"));
  });
  moduleOptions.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      setMenuOpen(false);
      const id = btn.getAttribute("data-module");
      if(id && id !== currentModule) loadModule(id);
    });
  });
  document.addEventListener("click", (e)=>{
    if(moduleMenu.classList.contains("open") && !moduleMenu.contains(e.target) && e.target !== moduleTrigger && !moduleTrigger.contains(e.target)){
      setMenuOpen(false);
    }
  });
  document.addEventListener("keydown", (e)=>{
    if(e.key === "Escape") setMenuOpen(false);
  });

  // init
  setNavExpanded(false);
  let initialModule = "TA";
  try{
    const saved = localStorage.getItem(MODULE_STORAGE_KEY);
    if(saved && MODULES[saved]) initialModule = saved;
  }catch(e){ /* ignore */ }
  loadModule(initialModule);
})();
