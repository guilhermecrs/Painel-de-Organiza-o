(function(){
  "use strict";

  var ST_LABEL = {aberto:"Aberto", pendente:"Pendente", em_processo:"Em processo", fechado:"Fechado"};
  var ST_ORDER = ["aberto","pendente","em_processo","fechado"];

  var DEFAULT_OPTIONS = {
    task_categories: [
      { id: "chamado", label: "Chamado", color: "blue", builtIn: true },
      { id: "usuario", label: "Criação de usuário", color: "purple", builtIn: true },
      { id: "email", label: "E-mail", color: "amber", builtIn: true },
      { id: "falha", label: "Falha", color: "red", builtIn: true },
      { id: "outro", label: "Outro", color: "slate", builtIn: true }
    ],
    task_priorities: [
      { id: "baixa", label: "Baixa", color: "slate", builtIn: true },
      { id: "media", label: "Média", color: "amber", builtIn: true },
      { id: "alta", label: "Alta", color: "red", builtIn: true }
    ],
    ticket_tipos: [
      { id: "falha", label: "Falha", color: "red", builtIn: true },
      { id: "duvida", label: "Dúvida", color: "slate", builtIn: true },
      { id: "solicitacao", label: "Solicitação", color: "blue", builtIn: true },
      { id: "melhoria", label: "Melhoria", color: "green", builtIn: true }
    ],
    ticket_modulos: [
      "ORGSMART","DOCUMENTO FISCAL","PROCESSO ALERTA","ATIVO IMOBILIZADO","CRM","ORGTOOLS",
      "PONTO DE VENDAS","FOLHA","CONTROLE DE ESTOQUE","REEMBOLSO","COMPRAS","AUTENTICAÇÃO","CONSULTA",
      "CONTABILIDADE","FINANCEIRO","PRESTAÇÃO DE CONTAS","ASSISTÊNCIA SOCIAL"
    ].map(function(m){ return { id: m, label: m, color: "slate", builtIn: true }; }),
    ticket_assignees: [
      { id: "ADRIANO", label: "Adriano", color: "blue", builtIn: true },
      { id: "ALISSON OLIVEIRA", label: "Alisson Oliveira", color: "blue", builtIn: true },
      { id: "LUCAS", label: "Lucas", color: "blue", builtIn: true },
      { id: "GABRIEL", label: "Gabriel", color: "blue", builtIn: true },
      { id: "GUILHERME", label: "Guilherme", color: "blue", builtIn: true }
    ]
  };

  var OPTION_META = {
    task_categories: { title: "Nova Categoria", label: "Nome da categoria *", placeholder: "Ex.: Implantação, Banco de Dados…", selectId: "tk_category", hasColor: true },
    task_priorities: { title: "Nova Prioridade", label: "Nome da prioridade *", placeholder: "Ex.: Crítica, Urgente, Planejada…", selectId: "tk_priority", hasColor: true },
    ticket_tipos:    { title: "Novo Tipo de Chamado", label: "Nome do tipo *", placeholder: "Ex.: Bug Crítico, Suporte Remoto…", selectId: "t_tipo", hasColor: true },
    ticket_modulos:  { title: "Novo Módulo", label: "Nome do módulo *", placeholder: "Ex.: INTEGRAÇÃO API…", selectId: "t_modulo", hasColor: false },
    ticket_assignees:{ title: "Novo Responsável", label: "Nome do responsável *", placeholder: "Ex.: Carlos Silva…", selectId: "t_assignee", hasColor: false }
  };

  var COL_COLORS = ["blue", "amber", "purple", "green", "red", "slate"];
  var DEFAULT_TASK_COLS = [
    { id: "todo", title: "A Fazer", color: "blue", isDone: false, order: 0 },
    { id: "doing", title: "Em Andamento", color: "amber", isDone: false, order: 1 },
    { id: "done", title: "Concluído", color: "green", isDone: true, order: 2 }
  ];

  function todayStr(){ return new Intl.DateTimeFormat('sv-SE').format(new Date()); }
  function fmtDate(s){
    if(!s) return "";
    var p = s.split("-"); if(p.length!==3) return s;
    return p[2]+"/"+p[1];
  }
  function esc(s){
    return String(s==null?"":s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; });
  }
  function uid(){
    if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'id-'+Date.now()+'-'+Math.random().toString(16).slice(2);
  }

  var toastTimer = null;
  function showToast(msg){
    var el = document.getElementById('toast');
    if(!el) return;
    el.textContent = msg;
    el.hidden = false;
    if(toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ el.hidden = true; }, 3200);
  }

  var state = { tasks: null, taskColumns: null, tickets: null, implantacoes: null, customOptions: null, canEdit: true };
  var addingColOpen = false;
  var newColColor = "blue";
  var seedingCols = false;
  var inlineCardColId = null;

  var LocalStore = {
    get: function(col) {
      try { return JSON.parse(localStorage.getItem('app_db_' + col) || '[]'); }
      catch(e) { return []; }
    },
    set: function(col, data) {
      try { localStorage.setItem('app_db_' + col, JSON.stringify(data)); }
      catch(e) {}
    },
    getObj: function(key) {
      try { return JSON.parse(localStorage.getItem('app_db_' + key) || '{}'); }
      catch(e) { return {}; }
    },
    setObj: function(key, data) {
      try { localStorage.setItem('app_db_' + key, JSON.stringify(data)); }
      catch(e) {}
    }
  };

  /* --- Gerenciamento de Opções Dinâmicas dos Select Boxes --- */
  function getOptionsList(group){
    var defaults = DEFAULT_OPTIONS[group] || [];
    var custom = (state.customOptions && Array.isArray(state.customOptions[group])) ? state.customOptions[group] : [];
    var map = {};
    var out = [];
    defaults.forEach(function(item){
      map[item.id] = true;
      out.push(item);
    });
    custom.forEach(function(item){
      if(item && item.id && !map[item.id]){
        map[item.id] = true;
        out.push(item);
      }
    });
    return out;
  }

  function findOption(group, id){
    if(!id) return null;
    var list = getOptionsList(group);
    return list.find(function(x){ return x.id === id; }) || null;
  }

  function populateSelectElement(selectEl, group, selectedValue, emptyLabel){
    if(!selectEl) return;
    var list = getOptionsList(group);
    var html = '';
    if(emptyLabel !== undefined && emptyLabel !== null){
      html += '<option value="">' + esc(emptyLabel) + '</option>';
    }
    list.forEach(function(opt){
      html += '<option value="' + esc(opt.id) + '">' + esc(opt.label) + '</option>';
    });
    selectEl.innerHTML = html;
    if(selectedValue && list.some(function(o){ return o.id === selectedValue; })){
      selectEl.value = selectedValue;
    } else if(emptyLabel !== undefined && emptyLabel !== null && !selectedValue){
      selectEl.value = "";
    } else if(list.length){
      selectEl.value = list[0].id;
    }
  }

  function refreshAllSelects(){
    var catSel = document.getElementById('tk_category');
    if(catSel) populateSelectElement(catSel, 'task_categories', catSel.value || 'chamado');

    var priSel = document.getElementById('tk_priority');
    if(priSel) populateSelectElement(priSel, 'task_priorities', priSel.value || 'media');

    var tipoSel = document.getElementById('t_tipo');
    if(tipoSel) populateSelectElement(tipoSel, 'ticket_tipos', tipoSel.value || 'falha');

    var modSel = document.getElementById('t_modulo');
    if(modSel) populateSelectElement(modSel, 'ticket_modulos', modSel.value || '', 'Selecione…');

    var assSel = document.getElementById('t_assignee');
    if(assSel) populateSelectElement(assSel, 'ticket_assignees', assSel.value || '', 'Sem responsável');
  }

  var activeOptionGroup = null;
  var selectedOptionColor = "blue";

  function renderOptionModalExtras(){
    var meta = OPTION_META[activeOptionGroup];
    if(!meta) return;

    var colorGroup = document.getElementById('optionColorGroup');
    var colorPicker = document.getElementById('optColorPicker');
    if(colorGroup && colorPicker){
      colorGroup.hidden = !meta.hasColor;
      if(meta.hasColor){
        colorPicker.innerHTML = COL_COLORS.map(function(c){
          return '<button type="button" class="color-opt col-color-'+c+(selectedOptionColor===c?' selected':'')+'" data-opt-color="'+c+'" title="Cor '+c+'"></button>';
        }).join('');
      }
    }

    var existingWrap = document.getElementById('optionExistingList');
    if(existingWrap){
      var custom = (state.customOptions && state.customOptions[activeOptionGroup]) || [];
      if(custom.length === 0){
        existingWrap.innerHTML = '';
      } else {
        existingWrap.innerHTML = '<div style="width:100%;font-size:11.5px;color:var(--fg-muted);margin-bottom:2px">Cadastrados por você:</div>' +
          custom.map(function(item){
            return '<span class="existing-opt-chip">'+esc(item.label)+
              '<button type="button" data-del-custom-opt="'+esc(item.id)+'" title="Remover opção">✕</button></span>';
          }).join('');
      }
    }
  }

  function openOptionModal(group){
    var meta = OPTION_META[group];
    if(!meta) return;
    activeOptionGroup = group;
    selectedOptionColor = "blue";
    document.getElementById('optionModalTitle').textContent = meta.title;
    var lbl = document.getElementById('optionNameLabel');
    if(lbl && lbl.firstChild) lbl.firstChild.nodeValue = meta.label + "\n        ";
    var inp = document.getElementById('opt_name');
    inp.placeholder = meta.placeholder;
    inp.value = '';
    renderOptionModalExtras();
    document.getElementById('optionOverlay').hidden = false;
    setTimeout(function(){ inp.focus(); }, 20);
  }

  function closeOptionModal(){
    document.getElementById('optionOverlay').hidden = true;
    activeOptionGroup = null;
  }

  function saveNewOption(){
    if(!activeOptionGroup) return;
    var meta = OPTION_META[activeOptionGroup];
    var inp = document.getElementById('opt_name');
    var rawLabel = inp.value.trim();
    if(!rawLabel){ inp.focus(); return; }

    var label = (activeOptionGroup === 'ticket_modulos' || activeOptionGroup === 'ticket_assignees')
      ? rawLabel.toUpperCase()
      : rawLabel;

    var existing = getOptionsList(activeOptionGroup).find(function(o){
      return o.label.toLowerCase() === rawLabel.toLowerCase() || o.id.toLowerCase() === rawLabel.toLowerCase();
    });

    var targetSelect = document.getElementById(meta.selectId);
    if(existing){
      if(targetSelect) targetSelect.value = existing.id;
      closeOptionModal();
      showToast('Opção "' + existing.label + '" já existe e foi selecionada.');
      return;
    }

    var newId = (activeOptionGroup === 'ticket_modulos' || activeOptionGroup === 'ticket_assignees')
      ? label
      : 'opt_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);

    var newObj = {
      id: newId,
      label: activeOptionGroup === 'ticket_assignees' ? rawLabel : label,
      color: meta.hasColor ? selectedOptionColor : 'slate',
      builtIn: false
    };

    if(!state.customOptions) state.customOptions = {};
    if(!Array.isArray(state.customOptions[activeOptionGroup])) state.customOptions[activeOptionGroup] = [];
    state.customOptions[activeOptionGroup].push(newObj);
    LocalStore.setObj('custom_options', state.customOptions);

    refreshAllSelects();
    if(targetSelect) targetSelect.value = newId;
    closeOptionModal();
    renderAll();
    showToast('"' + newObj.label + '" cadastrado!');
  }

  function deleteCustomOption(optId){
    if(!activeOptionGroup || !state.customOptions || !Array.isArray(state.customOptions[activeOptionGroup])) return;
    state.customOptions[activeOptionGroup] = state.customOptions[activeOptionGroup].filter(function(x){ return x.id !== optId; });
    LocalStore.setObj('custom_options', state.customOptions);
    refreshAllSelects();
    renderOptionModalExtras();
    renderAll();
  }

  function notifyLocalChange(col) {
    if (col === 'tasks_oneoff') state.tasks = LocalStore.get('tasks_oneoff');
    if (col === 'task_columns') state.taskColumns = LocalStore.get('task_columns');
    if (col === 'tickets') state.tickets = LocalStore.get('tickets');
    if (col === 'implantacoes') state.implantacoes = LocalStore.get('implantacoes');
    renderAll();
  }

  function getStorage() {
    return {
      collection: function(col) {
        return {
          doc: function(id) {
            return {
              set: function(data) {
                var list = LocalStore.get(col);
                var idx = list.findIndex(function(x){ return x.id === id; });
                if (idx >= 0) list[idx] = Object.assign({id: id}, data);
                else list.push(Object.assign({id: id}, data));
                LocalStore.set(col, list);
                notifyLocalChange(col);
                return Promise.resolve();
              },
              update: function(data) {
                var list = LocalStore.get(col);
                var idx = list.findIndex(function(x){ return x.id === id; });
                if (idx >= 0) {
                  list[idx] = Object.assign({}, list[idx], data);
                  LocalStore.set(col, list);
                  notifyLocalChange(col);
                }
                return Promise.resolve();
              },
              delete: function() {
                var list = LocalStore.get(col).filter(function(x){ return x.id !== id; });
                LocalStore.set(col, list);
                notifyLocalChange(col);
                return Promise.resolve();
              }
            };
          }
        };
      }
    };
  }

  function getSortedTaskCols(){
    var cols = (state.taskColumns || []).slice().sort(function(a, b){
      return (a.order || 0) - (b.order || 0);
    });
    return cols.length ? cols : DEFAULT_TASK_COLS;
  }

  function seedDefaultTaskCols(){
    if(seedingCols) return;
    seedingCols = true;
    var store = getStorage().collection('task_columns');
    DEFAULT_TASK_COLS.forEach(function(c){
      store.doc(c.id).set({
        title: c.title,
        color: c.color,
        isDone: !!c.isDone,
        order: c.order
      });
    });
    seedingCols = false;
  }

  function normalizeTasksAndColumns(){
    var cols = getSortedTaskCols();
    var colsChanged = false;

    if(cols.length > 1 && cols.every(function(c){ return !!c.isDone; })){
      cols.forEach(function(c){
        if(c.id !== 'done' && !/conclu/i.test(c.title || '')){
          c.isDone = false;
          colsChanged = true;
        }
      });
      if(colsChanged) LocalStore.set('task_columns', cols);
    }

    var colMap = {};
    cols.forEach(function(c){ colMap[c.id] = c; });
    var firstTodoCol = cols.find(function(c){ return !c.isDone; }) || cols[0];
    var firstDoneCol = cols.find(function(c){ return !!c.isDone; }) || cols[cols.length - 1];

    var tasks = state.tasks || [];
    var tasksChanged = false;

    tasks.forEach(function(t){
      var col = t.status && colMap[t.status];
      if(!col){
        col = t.done ? firstDoneCol : firstTodoCol;
        if(col){
          t.status = col.id;
          tasksChanged = true;
        }
      }
      if(col){
        var shouldBeDone = !!col.isDone;
        if(!!t.done !== shouldBeDone){
          t.done = shouldBeDone;
          if(!shouldBeDone) t.completedAt = null;
          tasksChanged = true;
        }
      }
    });

    if(tasksChanged){
      LocalStore.set('tasks_oneoff', tasks);
    }
  }

  /* --- Exportar & Importar Backup (.json) --- */
  var pendingBackupData = null;

  function exportBackup(){
    var payload = {
      app: "mesa-suporte",
      version: 2,
      exportedAt: new Date().toISOString(),
      data: {
        tasks_oneoff: state.tasks || LocalStore.get('tasks_oneoff'),
        task_columns: state.taskColumns || LocalStore.get('task_columns'),
        tickets: state.tickets || LocalStore.get('tickets'),
        implantacoes: state.implantacoes || LocalStore.get('implantacoes'),
        custom_options: state.customOptions || LocalStore.getObj('custom_options')
      }
    };

    var jsonStr = JSON.stringify(payload, null, 2);
    var blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = "mesa-suporte-backup-" + todayStr() + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    try { localStorage.setItem('app_db_last_backup', new Date().toLocaleString('pt-BR')); } catch(e) {}
    renderAll();
    showToast("Backup baixado com sucesso!");
  }

  function handleImportFileSelected(file){
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(ev){
      try {
        var parsed = JSON.parse(ev.target.result);
        var data = (parsed && parsed.data) ? parsed.data : parsed;
        if(!data || (!Array.isArray(data.tasks_oneoff) && !Array.isArray(data.tickets) && !Array.isArray(data.implantacoes))){
          showToast("Arquivo inválido. Selecione um backup da Mesa de Suporte.");
          return;
        }
        pendingBackupData = {
          tasks_oneoff: Array.isArray(data.tasks_oneoff) ? data.tasks_oneoff : [],
          task_columns: Array.isArray(data.task_columns) && data.task_columns.length ? data.task_columns : DEFAULT_TASK_COLS,
          tickets: Array.isArray(data.tickets) ? data.tickets : [],
          implantacoes: Array.isArray(data.implantacoes) ? data.implantacoes : [],
          custom_options: (data.custom_options && typeof data.custom_options === 'object') ? data.custom_options : {}
        };

        var dateLabel = parsed.exportedAt
          ? "Arquivo gerado em " + new Date(parsed.exportedAt).toLocaleString('pt-BR') + ":"
          : "Conteúdo encontrado no arquivo:";
        document.getElementById('backupModalDate').textContent = dateLabel;
        document.getElementById('backupModalSummary').innerHTML =
          '<div>• ' + pendingBackupData.tasks_oneoff.length + ' card(s) de tarefa</div>' +
          '<div>• ' + pendingBackupData.task_columns.length + ' quadro(s)</div>' +
          '<div>• ' + pendingBackupData.tickets.length + ' chamado(s)</div>' +
          '<div>• ' + pendingBackupData.implantacoes.length + ' implantação(ões)</div>';

        document.getElementById('backupOverlay').hidden = false;
      } catch(err){
        showToast("Não foi possível ler o arquivo JSON.");
      }
    };
    reader.readAsText(file);
  }

  function closeBackupModal(){
    document.getElementById('backupOverlay').hidden = true;
    pendingBackupData = null;
  }

  function confirmRestoreBackup(){
    if(!pendingBackupData) return;
    LocalStore.set('tasks_oneoff', pendingBackupData.tasks_oneoff);
    LocalStore.set('task_columns', pendingBackupData.task_columns);
    LocalStore.set('tickets', pendingBackupData.tickets);
    LocalStore.set('implantacoes', pendingBackupData.implantacoes);
    LocalStore.setObj('custom_options', pendingBackupData.custom_options);

    state.tasks = pendingBackupData.tasks_oneoff;
    state.taskColumns = pendingBackupData.task_columns;
    state.tickets = pendingBackupData.tickets;
    state.implantacoes = pendingBackupData.implantacoes;
    state.customOptions = pendingBackupData.custom_options;

    refreshAllSelects();
    normalizeTasksAndColumns();
    closeBackupModal();
    renderAll();
    showToast("Backup restaurado com sucesso!");
  }

  function renderSummary(){
    var el = document.getElementById('summary');
    if(!el) return;
    var today = todayStr();
    var tasks = state.tasks || [];
    var tickets = state.tickets || [];
    var late = tasks.filter(function(t){ return !t.done && t.dueDate && t.dueDate < today; }).length;
    var dueToday = tasks.filter(function(t){ return !t.done && t.dueDate === today; }).length;
    var openTickets = tickets.filter(function(t){ return t.status !== 'fechado'; }).length;
    var toCollect = tickets.filter(function(t){ return t.status !== 'fechado' && t.nextFollowUp && t.nextFollowUp <= today; }).length;
    var impls = state.implantacoes || [];
    var implPend = impls.filter(function(i){ return i.status !== 'concluida' && (i.demandas||[]).some(function(d){ return !d.concluida; }); }).length;
    el.innerHTML =
      '<div class="stat'+(late?' alert':'')+'"><div class="n">'+late+'</div><div class="l">Tarefas atrasadas</div></div>' +
      '<div class="stat"><div class="n">'+dueToday+'</div><div class="l">Vencem hoje</div></div>' +
      '<div class="stat"><div class="n">'+openTickets+'</div><div class="l">Chamados em aberto</div></div>' +
      '<div class="stat'+(toCollect?' alert':'')+'"><div class="n">'+toCollect+'</div><div class="l">Cobranças pendentes</div></div>' +
      '<div class="stat'+(implPend?' alert':'')+'"><div class="n">'+implPend+'</div><div class="l">Implantações c/ pendência</div></div>';
  }

  function checkSvg(){ return '<svg viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.2 11.5L13 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'; }
  function trashSvg(){ return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'; }

  function taskCardHtml(t, today, isDoneCol){
    var late = !isDoneCol && t.dueDate && t.dueDate < today;
    var isToday = !isDoneCol && t.dueDate === today;

    var priId = t.priority || 'media';
    var priOpt = findOption('task_priorities', priId) || { id: priId, label: priId, color: 'amber' };
    var priColor = priOpt.color || 'amber';

    var catId = t.category || 'outro';
    var catOpt = findOption('task_categories', catId) || { id: catId, label: catId, color: 'slate' };
    var catColor = catOpt.color || 'slate';

    var cls = 'task-card pri-'+esc(priId) + (late?' late':'') + (isToday?' today':'') + (isDoneCol?' is-done':'');
    var dueHtml = t.dueDate ? '<span class="due'+(late?' late':'')+'">Entrega: '+fmtDate(t.dueDate)+'</span>' : '';
    var empStr = (t.empresa ? esc(t.empresa) : '') + (t.codigo ? ' (' + esc(t.codigo) + ')' : '');
    var validadoHtml = t.validado ? '<span class="tag validado-ok" title="'+(t.validadoEm ? 'Validado em '+fmtDate(t.validadoEm) : 'Validado')+'">✓ Validado p/ sistema</span>' : '';
    var completedHtml = (isDoneCol && t.completedAt) ? '<span class="tag opt-green">Concluído em ' + fmtDate(t.completedAt) + '</span>' : '';

    return '<div class="'+cls+'" data-id="'+t.id+'" draggable="true">'+
      '<div class="body">'+
        '<div class="title">'+esc(t.title)+'</div>'+
        (t.notes ? '<div class="excerpt">'+esc(t.notes)+'</div>' : '')+
        '<div class="meta">'+
          '<span class="pri-dot c-'+esc(priColor)+'" title="Prioridade: '+esc(priOpt.label)+'"></span>'+
          validadoHtml+
          dueHtml+
          (empStr ? '<span class="tag modulo">'+empStr+'</span>' : '')+
          '<span class="tag opt-'+esc(catColor)+'">'+esc(catOpt.label)+'</span>'+
          completedHtml+
        '</div>'+
      '</div>'+
      '<div class="actions"><button class="icon-btn" data-act="delTask" data-id="'+t.id+'" title="Remover">'+trashSvg()+'</button></div>'+
    '</div>';
  }

  function renderTasks(){
    var el = document.getElementById('taskLanes');
    if(!el) return;
    var tasks = state.tasks;
    if(tasks === null || state.taskColumns === null){
      el.innerHTML = '<div class="empty" style="width:100%">Carregando quadro…</div>';
      return;
    }

    var today = todayStr();
    var cols = getSortedTaskCols();
    var buckets = {};
    cols.forEach(function(c){ buckets[c.id] = []; });

    var firstTodoCol = cols.find(function(c){ return !c.isDone; }) || cols[0];
    var firstDoneCol = cols.find(function(c){ return !!c.isDone; }) || cols[cols.length - 1];

    tasks.forEach(function(t){
      var st = t.status;
      if(st && buckets[st]){
        buckets[st].push(t);
      } else if(t.done && firstDoneCol){
        buckets[firstDoneCol.id].push(t);
      } else if(firstTodoCol){
        buckets[firstTodoCol.id].push(t);
      }
    });

    var lanesHtml = cols.map(function(col, idx){
      var items = buckets[col.id] || [];
      var canMoveLeft = idx > 0;
      var canMoveRight = idx < cols.length - 1;
      var canDelete = cols.length > 1;
      var isAddingInline = (inlineCardColId === col.id);

      var footerHtml = '<div class="lane-foot">';
      if(isAddingInline){
        footerHtml += '<div class="inline-card-form">'+
          '<textarea id="inlineCardTitleInput" placeholder="Digite o título deste card…"></textarea>'+
          '<div style="display:flex;gap:6px;align-items:center">'+
            '<button type="button" class="btn small" data-act="saveInlineCard" data-col="'+esc(col.id)+'">Adicionar card</button>'+
            '<button type="button" class="btn ghost small" data-act="cancelInlineCard">✕</button>'+
          '</div>'+
        '</div>';
      } else {
        footerHtml += '<button type="button" class="add-card-inline-btn" data-act="openInlineCard" data-col="'+esc(col.id)+'">+ Adicionar um card</button>';
      }
      footerHtml += '</div>';

      return '<div class="lane task-lane" data-st="'+esc(col.id)+'">'+
        '<div class="lane-head">'+
          '<button class="col-color-btn col-color-'+esc(col.color||'blue')+'" data-act="cycleColColor" data-id="'+esc(col.id)+'" title="Trocar cor do quadro"></button>'+
          '<span class="lane-title" data-act="editColTitle" data-id="'+esc(col.id)+'" title="Clique para renomear">'+esc(col.title)+'</span>'+
          '<span class="n">'+items.length+'</span>'+
          '<div class="lane-tools">'+
            '<button class="lane-mini-btn'+(col.isDone?' is-done-col':'')+'" data-act="toggleColDone" data-id="'+esc(col.id)+'" title="'+(col.isDone?'Etapa de conclusão (clique para tornar etapa normal)':'Marcar este quadro como etapa de conclusão')+'">✓</button>'+
            (canMoveLeft ? '<button class="lane-mini-btn" data-act="moveColLeft" data-id="'+esc(col.id)+'" title="Mover para esquerda">‹</button>' : '')+
            (canMoveRight ? '<button class="lane-mini-btn" data-act="moveColRight" data-id="'+esc(col.id)+'" title="Mover para direita">›</button>' : '')+
            (canDelete ? '<button class="lane-mini-btn del" data-act="delCol" data-id="'+esc(col.id)+'" title="Excluir quadro">'+trashSvg()+'</button>' : '')+
          '</div>'+
        '</div>'+
        '<div class="lane-body task-lane-body">'+
          (items.length ? items.map(function(t){ return taskCardHtml(t, today, !!col.isDone); }).join('') : '<div class="lane-empty">Arraste um card ou adicione abaixo</div>') +
        '</div>'+
        footerHtml+
      '</div>';
    }).join('');

    var addBoxHtml = '<div class="add-lane-wrap">';
    if(!addingColOpen){
      addBoxHtml += '<button class="add-lane-trigger" data-act="openAddCol">+ Adicionar outro quadro</button>';
    } else {
      addBoxHtml += '<div class="add-lane-form">'+
        '<input type="text" id="newColTitleInput" placeholder="Nome do quadro (ex.: Validação / Homologação)">'+
        '<div class="color-picker-row">'+
          COL_COLORS.map(function(c){
            return '<button type="button" class="color-opt col-color-'+c+(newColColor===c?' selected':'')+'" data-act="pickNewColColor" data-color="'+c+'" title="Cor '+c+'"></button>';
          }).join('')+
        '</div>'+
        '<label class="done-check-label"><input type="checkbox" id="newColDoneCheck"> Concluir tarefa ao mover para cá</label>'+
        '<div class="add-lane-actions">'+
          '<button type="button" class="btn small" data-act="saveNewCol">Adicionar quadro</button>'+
          '<button type="button" class="btn ghost small" data-act="cancelAddCol">✕</button>'+
        '</div>'+
      '</div>';
    }
    addBoxHtml += '</div>';

    el.innerHTML = lanesHtml + addBoxHtml;

    if(addingColOpen){
      var inp = document.getElementById('newColTitleInput');
      if(inp) inp.focus();
    } else if(inlineCardColId){
      var cardInp = document.getElementById('inlineCardTitleInput');
      if(cardInp) cardInp.focus();
    }
  }

  /* --- Modal / Sub-aba de Edição e Validação do Card --- */
  var editingTaskId = null;

  function syncValidationBadgeUI(){
    var chk = document.getElementById('tk_validado');
    var box = document.getElementById('validationBox');
    var badge = document.getElementById('tk_valStatusBadge');
    var msg = document.getElementById('tk_validationMsg');
    if(!chk || !box || !badge) return;
    if(msg) msg.hidden = true;
    if(chk.checked){
      box.classList.add('is-validated');
      badge.classList.add('ok');
      badge.textContent = '✓ Validado p/ sistema';
    } else {
      box.classList.remove('is-validated');
      badge.classList.remove('ok');
      badge.textContent = 'Pendente de validação';
    }
  }

  function openTaskPanel(id, defaultColId){
    editingTaskId = id || null;
    var t = id ? (state.tasks||[]).find(function(x){ return x.id===id; }) : null;
    var cols = getSortedTaskCols();

    var statusSel = document.getElementById('tk_status');
    statusSel.innerHTML = cols.map(function(c){
      return '<option value="'+esc(c.id)+'">'+esc(c.title)+'</option>';
    }).join('');

    var defaultCol = defaultColId || (cols.find(function(c){ return !c.isDone; }) || cols[0]).id;

    document.getElementById('taskModalKicker').textContent = t ? 'Editar & Validar Card' : 'Novo Card no Quadro';
    document.getElementById('taskModalTitle').textContent = t ? t.title : 'Criar nova tarefa';
    document.getElementById('tk_title').value = t ? (t.title||'') : '';
    document.getElementById('tk_empresa').value = t ? (t.empresa||'') : '';
    document.getElementById('tk_codigo').value = t ? (t.codigo||'') : '';
    statusSel.value = (t && t.status && cols.some(function(c){ return c.id===t.status; })) ? t.status : defaultCol;

    populateSelectElement(document.getElementById('tk_category'), 'task_categories', t ? (t.category||'chamado') : 'chamado');
    populateSelectElement(document.getElementById('tk_priority'), 'task_priorities', t ? (t.priority||'media') : 'media');

    document.getElementById('tk_dueDate').value = t ? (t.dueDate||'') : '';
    document.getElementById('tk_completedAt').value = t ? (t.completedAt||'') : '';
    document.getElementById('tk_notes').value = t ? (t.notes||'') : '';

    document.getElementById('tk_validado').checked = !!(t && t.validado);
    document.getElementById('tk_validadoPor').value = t ? (t.validadoPor||'') : '';
    document.getElementById('tk_validacaoObs').value = t ? (t.validacaoObs||'') : '';

    var delBtn = document.getElementById('taskDeleteBtn');
    if(delBtn) delBtn.hidden = !t;

    syncValidationBadgeUI();
    document.getElementById('taskOverlay').hidden = false;
    setTimeout(function(){ document.getElementById('tk_title').focus(); }, 20);
  }

  function closeTaskPanel(){
    document.getElementById('taskOverlay').hidden = true;
    editingTaskId = null;
  }

  function showTaskValidationError(text){
    var msg = document.getElementById('tk_validationMsg');
    if(!msg) return;
    msg.textContent = text;
    msg.hidden = false;
  }

  function saveTaskPanel(){
    var titleEl = document.getElementById('tk_title');
    var title = titleEl.value.trim();
    if(!title){
      showTaskValidationError('Informe o título da tarefa antes de salvar.');
      titleEl.focus();
      return;
    }

    var empresa = document.getElementById('tk_empresa').value.trim() || null;
    var codigo = document.getElementById('tk_codigo').value.trim() || null;
    var status = document.getElementById('tk_status').value;
    var category = document.getElementById('tk_category').value;
    var priority = document.getElementById('tk_priority').value;
    var dueDate = document.getElementById('tk_dueDate').value || null;
    var completedAtInput = document.getElementById('tk_completedAt').value || null;
    var notes = document.getElementById('tk_notes').value.trim() || null;

    var validado = document.getElementById('tk_validado').checked;
    var validadoPor = document.getElementById('tk_validadoPor').value.trim() || null;
    var validacaoObs = document.getElementById('tk_validacaoObs').value.trim() || null;

    if(validado && !empresa && !notes){
      showTaskValidationError('Para validar para o sistema, preencha ao menos a Empresa ou a Descrição do card.');
      return;
    }

    var targetCol = getSortedTaskCols().find(function(c){ return c.id === status; });
    var isDoneCol = !!(targetCol && targetCol.isDone);
    var existing = editingTaskId ? (state.tasks||[]).find(function(x){ return x.id === editingTaskId; }) : null;

    var data = {
      title: title,
      empresa: empresa,
      codigo: codigo,
      status: status,
      category: category,
      priority: priority,
      dueDate: dueDate,
      notes: notes,
      done: isDoneCol,
      completedAt: isDoneCol ? (completedAtInput || (existing && existing.completedAt) || todayStr()) : null,
      validado: validado,
      validadoPor: validado ? validadoPor : null,
      validacaoObs: validado ? validacaoObs : null,
      validadoEm: validado ? ((existing && existing.validadoEm) || todayStr()) : null,
      updatedAt: Date.now()
    };

    if(editingTaskId){
      getStorage().collection('tasks_oneoff').doc(editingTaskId).update(data);
    } else {
      data.createdAt = Date.now();
      getStorage().collection('tasks_oneoff').doc(uid()).set(data);
    }

    closeTaskPanel();
  }

  function saveInlineCard(colId){
    var inp = document.getElementById('inlineCardTitleInput');
    if(!inp) return;
    var title = inp.value.trim();
    if(!title){
      inlineCardColId = null;
      renderTasks();
      return;
    }
    var targetCol = getSortedTaskCols().find(function(c){ return c.id === colId; });
    var isDoneCol = !!(targetCol && targetCol.isDone);

    inlineCardColId = null;
    getStorage().collection('tasks_oneoff').doc(uid()).set({
      title: title,
      category: 'chamado',
      dueDate: null,
      priority: 'media',
      empresa: null,
      codigo: null,
      notes: null,
      status: colId,
      done: isDoneCol,
      completedAt: isDoneCol ? todayStr() : null,
      validado: false,
      validadoPor: null,
      validacaoObs: null,
      validadoEm: null,
      createdAt: Date.now()
    });
  }

  function saveNewTaskColumn(){
    var inp = document.getElementById('newColTitleInput');
    if(!inp) return;
    var title = inp.value.trim();
    if(!title){ inp.focus(); return; }
    var isDone = !!(document.getElementById('newColDoneCheck') && document.getElementById('newColDoneCheck').checked);
    var cols = getSortedTaskCols();
    var maxOrder = cols.reduce(function(max, c){ return Math.max(max, c.order || 0); }, -1);

    addingColOpen = false;
    getStorage().collection('task_columns').doc(uid()).set({
      title: title,
      color: newColColor,
      isDone: isDone,
      order: maxOrder + 1
    });
    newColColor = "blue";
  }

  function startEditColTitle(spanEl, colId){
    var currentTitle = spanEl.textContent;
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'lane-title-input';
    input.value = currentTitle;
    spanEl.replaceWith(input);
    input.focus();
    input.select();

    var finished = false;
    function commit(){
      if(finished) return;
      finished = true;
      var val = input.value.trim();
      if(val && val !== currentTitle){
        getStorage().collection('task_columns').doc(colId).update({ title: val });
      } else {
        renderTasks();
      }
    }

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', function(e){
      if(e.key === 'Enter'){ e.preventDefault(); commit(); }
      if(e.key === 'Escape'){ finished = true; renderTasks(); }
    });
  }

  function moveTaskColumn(colId, dir){
    var cols = getSortedTaskCols();
    var idx = cols.findIndex(function(c){ return c.id === colId; });
    var targetIdx = idx + dir;
    if(idx < 0 || targetIdx < 0 || targetIdx >= cols.length) return;

    var temp = cols[idx];
    cols[idx] = cols[targetIdx];
    cols[targetIdx] = temp;

    var store = getStorage().collection('task_columns');
    cols.forEach(function(c, i){
      store.doc(c.id).update({ order: i });
    });
  }

  function deleteTaskColumn(colId){
    var cols = getSortedTaskCols();
    if(cols.length <= 1) return;
    var remaining = cols.filter(function(c){ return c.id !== colId; });
    var fallback = remaining.find(function(c){ return !c.isDone; }) || remaining[0];

    var tasksStore = getStorage().collection('tasks_oneoff');
    (state.tasks || []).forEach(function(t){
      if(t.status === colId){
        tasksStore.doc(t.id).update({
          status: fallback.id,
          done: !!fallback.isDone,
          completedAt: fallback.isDone ? (t.completedAt || todayStr()) : null
        });
      }
    });

    getStorage().collection('task_columns').doc(colId).delete();
  }

  /* --- Chamados --- */
  function ticketCardHtml(t, today){
    var alert = t.status !== 'fechado' && t.nextFollowUp && t.nextFollowUp <= today;
    var tipoOpt = t.tipo ? (findOption('ticket_tipos', t.tipo) || { label: t.tipo, color: 'slate' }) : null;
    var modOpt = t.modulo ? (findOption('ticket_modulos', t.modulo) || { label: t.modulo }) : null;
    var assOpt = t.assignee ? (findOption('ticket_assignees', t.assignee) || { label: t.assignee }) : null;

    var html = '<div class="ticket'+(alert?' due-alert':'')+'" data-id="'+t.id+'">';
    if(alert) html += '<span class="chip-alert">Cobrar hoje</span>';
    html += '<div class="row1"><div><div class="client">'+esc(t.client)+'</div><div class="subject">'+esc(t.subject)+'</div></div></div>';
    html += '<div style="display:flex;gap:6px;flex-wrap:wrap">'+
      (tipoOpt ? '<span class="tag opt-'+esc(tipoOpt.color||'slate')+'">'+esc(tipoOpt.label)+'</span>' : '') +
      (modOpt ? '<span class="tag modulo">'+esc(modOpt.label)+'</span>' : '') +
      (assOpt ? '<span class="tag assignee">'+esc(assOpt.label)+'</span>' : '') +
    '</div>';
    html += '<div class="dates"><span>Aberto <b>'+fmtDate(t.openedAt)+'</b></span>'+
      (t.expectedClose ? '<span>Previsão <b>'+fmtDate(t.expectedClose)+'</b></span>' : '') +
      (t.status==='fechado' && t.closedAt ? '<span>Fechado <b>'+fmtDate(t.closedAt)+'</b></span>' : '') +
    '</div>';
    html += '<textarea class="notes" data-act="notes" data-id="'+t.id+'" placeholder="O que está acontecendo / por que não foi retornado…">'+esc(t.notes||'')+'</textarea>';
    if(t.status !== 'fechado'){
      html += '<div class="followup">Cobrar em <input type="date" data-act="followup" data-id="'+t.id+'" value="'+(t.nextFollowUp||'')+'">'+
        (t.nextFollowUp ? '<button class="btn ghost small" data-act="clearFollowup" data-id="'+t.id+'">feito</button>' : '') +
      '</div>';
    }
    html += '<div class="foot">'+
      '<select class="statusSel" data-act="status" data-id="'+t.id+'">'+
        ST_ORDER.map(function(s){ return '<option value="'+s+'"'+(s===t.status?' selected':'')+'>'+ST_LABEL[s]+'</option>'; }).join('') +
      '</select>'+
      '<button class="icon-btn" data-act="delTicket" data-id="'+t.id+'" title="Excluir">'+trashSvg()+'</button>'+
    '</div></div>';
    return html;
  }

  function renderFalhaCard(){
    var el = document.getElementById('falhaCard');
    if(!el) return;
    var tickets = state.tickets;
    if(tickets === null){ el.hidden = true; return; }
    var abertas = tickets.filter(function(t){ return t.tipo === 'falha' && t.status !== 'fechado'; }).length;
    el.hidden = false;
    el.innerHTML = '<div class="n">'+abertas+'</div>'+
      '<div class="l">Chamado'+(abertas===1?'':'s')+' de falha em aberto<small>Falhas reportadas por e-mail e outros canais, ainda não fechadas</small></div>';
  }

  function renderLanes(){
    var el = document.getElementById('lanes');
    if(!el) return;
    var tickets = state.tickets;
    renderFalhaCard();
    if(tickets === null){ el.innerHTML = '<div class="empty">Carregando…</div>'; return; }
    var today = todayStr();
    el.innerHTML = ST_ORDER.map(function(st){
      var items = tickets.filter(function(t){ return t.status === st; });
      return '<div class="lane" data-st="'+st+'">'+
        '<div class="lane-head">'+ST_LABEL[st]+'<span class="n">'+items.length+'</span></div>'+
        '<div class="lane-body">'+
          (items.length ? items.map(function(t){ return ticketCardHtml(t, today); }).join('') : '<div class="lane-empty">Nenhum chamado</div>') +
        '</div>'+
      '</div>';
    }).join('');
  }

  /* --- Implantações --- */
  function implCardHtml(i){
    var done = i.status === 'concluida';
    var demandas = i.demandas || [];
    var pendCount = demandas.filter(function(d){ return !d.concluida; }).length;
    var html = '<div class="impl-card'+(done?' done':'')+'" data-id="'+i.id+'">';
    html += '<div class="impl-head">'+
      '<div><div class="nome">'+esc(i.empresa)+'</div><div class="sub">Início '+fmtDate(i.dataInicio)+'</div></div>'+
      '<input class="impl-codigo" data-act="implCodigo" data-id="'+i.id+'" value="'+esc(i.codigo||'')+'" placeholder="Código">'+
      '<div class="right">'+
        (!done && pendCount ? '<span class="impl-priority">'+pendCount+' pendente'+(pendCount>1?'s':'')+' · prioritário</span>' : '') +
        '<select class="impl-statusSel" data-act="implStatus" data-id="'+i.id+'">'+
          '<option value="em_andamento"'+(!done?' selected':'')+'>Em andamento</option>'+
          '<option value="concluida"'+(done?' selected':'')+'>Concluída</option>'+
        '</select>'+
        '<button class="icon-btn" data-act="delImpl" data-id="'+i.id+'" title="Remover empresa">'+trashSvg()+'</button>'+
      '</div>'+
    '</div>';
    html += '<div class="impl-demandas">';
    if(demandas.length === 0){
      html += '<div style="font-size:12.5px;color:var(--fg-muted)">Nenhuma demanda de parametrização registrada.</div>';
    } else {
      demandas.forEach(function(d){
        html += '<div class="impl-demanda'+(d.concluida?' done':'')+'">'+
          '<button class="check'+(d.concluida?' on':'')+'" data-act="toggleDemanda" data-id="'+i.id+'" data-demanda="'+d.id+'" aria-label="Concluir">'+(d.concluida?checkSvg():'')+'</button>'+
          '<span class="title">'+esc(d.titulo)+'</span>'+
          '<span class="datebox"><span>Ab.</span><input type="date" class="data" data-act="demandaData" data-id="'+i.id+'" data-demanda="'+d.id+'" value="'+(d.dataAbertura||'')+'" title="Data de abertura"></span>'+
          '<span class="datebox"><span>Fe.</span><input type="date" class="data" data-act="demandaFechamento" data-id="'+i.id+'" data-demanda="'+d.id+'" value="'+(d.dataFechamento||'')+'" title="Data de fechamento"></span>'+
          '<button class="icon-btn" data-act="delDemanda" data-id="'+i.id+'" data-demanda="'+d.id+'" title="Remover">'+trashSvg()+'</button>'+
        '</div>';
      });
    }
    html += '</div>';
    html += '<div class="impl-add"><input type="text" class="titulo" data-act="demandaInput" data-id="'+i.id+'" placeholder="Nova demanda de parametrização…">'+
      '<input type="date" data-act="demandaInputData" data-id="'+i.id+'" value="'+todayStr()+'" title="Data de abertura">'+
      '<button class="btn small" data-act="addDemanda" data-id="'+i.id+'">Adicionar</button></div>';
    html += '</div>';
    return html;
  }

  function renderImplantacoes(){
    var el = document.getElementById('implGrid');
    if(!el) return;
    var impls = state.implantacoes;
    if(impls === null){ el.innerHTML = '<div class="empty">Carregando…</div>'; return; }
    if(impls.length === 0){
      el.innerHTML = '<div class="empty"><div class="big">Nenhuma empresa em implantação</div>Cadastre as empresas em fase de implantação e suas demandas de parametrização.</div>';
      return;
    }
    var sorted = impls.slice().sort(function(a,b){
      if((a.status==='concluida') !== (b.status==='concluida')) return a.status==='concluida' ? 1 : -1;
      return (b.createdAt||0) - (a.createdAt||0);
    });
    el.innerHTML = sorted.map(implCardHtml).join('');
  }

  function renderAll(){
    renderSummary();
    renderTasks();
    renderLanes();
    renderImplantacoes();
    var hintEl = document.getElementById('hint');
    if(hintEl){
      var lastBackup = null;
      try { lastBackup = localStorage.getItem('app_db_last_backup'); } catch(e) {}
      hintEl.textContent = lastBackup
        ? 'Salvo automaticamente neste navegador · Último backup exportado em ' + lastBackup
        : 'Salvo automaticamente neste navegador · Use "Exportar backup" no topo para salvar uma cópia de segurança.';
    }
  }

  var TAB_NAMES = ['tarefas','chamados','implantacoes'];
  function applyTab(){
    var h = (location.hash || '#tarefas').slice(1);
    if(TAB_NAMES.indexOf(h) === -1) h = 'tarefas';
    TAB_NAMES.forEach(function(name){
      var v = document.getElementById('view-'+name);
      if(v) v.hidden = (h !== name);
    });
    document.querySelectorAll('#tabs a').forEach(function(a){
      a.classList.toggle('active', a.dataset.tab === h);
    });
  }
  window.addEventListener('hashchange', applyTab);

  var editingTicketId = null;
  function openTicketPanel(id){
    editingTicketId = id || null;
    var t = id ? (state.tickets||[]).find(function(x){ return x.id===id; }) : null;
    document.getElementById('ticketPanelTitle').textContent = t ? 'Editar chamado' : 'Novo chamado';
    document.getElementById('t_client').value = t ? t.client : '';
    document.getElementById('t_subject').value = t ? t.subject : '';

    populateSelectElement(document.getElementById('t_tipo'), 'ticket_tipos', t ? (t.tipo||'falha') : 'falha');
    populateSelectElement(document.getElementById('t_modulo'), 'ticket_modulos', t ? (t.modulo||'') : '', 'Selecione…');
    populateSelectElement(document.getElementById('t_assignee'), 'ticket_assignees', t ? (t.assignee||'') : '', 'Sem responsável');

    document.getElementById('t_status').value = t ? t.status : 'aberto';
    document.getElementById('t_opened').value = t ? t.openedAt : todayStr();
    document.getElementById('t_expected').value = t ? (t.expectedClose||'') : '';
    document.getElementById('t_followup').value = t ? (t.nextFollowUp||'') : '';
    document.getElementById('t_notes').value = t ? (t.notes||'') : '';
    document.getElementById('ticketOverlay').hidden = false;
  }
  function closeTicketPanel(){ document.getElementById('ticketOverlay').hidden = true; editingTicketId = null; }
  function saveTicketPanel(){
    var client = document.getElementById('t_client').value.trim();
    var subject = document.getElementById('t_subject').value.trim();
    if(!client || !subject){ document.getElementById('t_client').focus(); return; }
    var data = {
      client: client, subject: subject,
      tipo: document.getElementById('t_tipo').value,
      modulo: document.getElementById('t_modulo').value || null,
      assignee: document.getElementById('t_assignee').value || null,
      status: document.getElementById('t_status').value,
      openedAt: document.getElementById('t_opened').value || todayStr(),
      expectedClose: document.getElementById('t_expected').value || null,
      nextFollowUp: document.getElementById('t_followup').value || null,
      notes: document.getElementById('t_notes').value.trim(),
      updatedAt: Date.now()
    };
    if(data.status === 'fechado') data.closedAt = todayStr();
    if(editingTicketId){
      getStorage().collection('tickets').doc(editingTicketId).update(data);
    } else {
      data.createdAt = Date.now();
      data.closedAt = null;
      getStorage().collection('tickets').doc(uid()).set(data);
    }
    closeTicketPanel();
  }

  function addEmpresa(){
    var nomeEl = document.getElementById('implEmpresa');
    if(!nomeEl) return;
    var nome = nomeEl.value.trim();
    if(!nome) return;
    var codigo = document.getElementById('implCodigo').value.trim();
    var inicio = document.getElementById('implInicio').value || todayStr();
    getStorage().collection('implantacoes').doc(uid()).set({ empresa:nome, codigo: codigo||null, dataInicio:inicio, status:'em_andamento', demandas:[], createdAt: Date.now() });
    nomeEl.value = '';
    document.getElementById('implCodigo').value = '';
    document.getElementById('implInicio').value = '';
  }
  function addDemanda(implId, inputEl){
    var titulo = inputEl.value.trim();
    if(!titulo) return;
    var impl = (state.implantacoes||[]).find(function(x){ return x.id===implId; });
    if(!impl) return;
    var dataInput = document.querySelector('[data-act="demandaInputData"][data-id="'+implId+'"]');
    var dataAbertura = (dataInput && dataInput.value) || todayStr();
    var demandas = (impl.demandas||[]).concat([{ id: uid(), titulo: titulo, concluida:false, dataAbertura: dataAbertura }]);
    getStorage().collection('implantacoes').doc(implId).update({ demandas: demandas });
    inputEl.value = '';
    if(dataInput) dataInput.value = todayStr();
  }
  function updateDemandas(implId, fn){
    var impl = (state.implantacoes||[]).find(function(x){ return x.id===implId; });
    if(!impl) return;
    getStorage().collection('implantacoes').doc(implId).update({ demandas: fn(impl.demandas||[]) });
  }

  function setupEvents(){
    var isDraggingCard = false;

    // Botões de Backup
    var exportBtn = document.getElementById('exportBackupBtn');
    if(exportBtn) exportBtn.addEventListener('click', exportBackup);

    var importBtn = document.getElementById('importBackupBtn');
    var importFile = document.getElementById('importBackupFile');
    if(importBtn && importFile){
      importBtn.addEventListener('click', function(){ importFile.click(); });
      importFile.addEventListener('change', function(){
        if(importFile.files && importFile.files[0]){
          handleImportFileSelected(importFile.files[0]);
          importFile.value = '';
        }
      });
    }

    var backupCloseXBtn = document.getElementById('backupCloseXBtn');
    if(backupCloseXBtn) backupCloseXBtn.addEventListener('click', closeBackupModal);

    var backupCancelBtn = document.getElementById('backupCancelBtn');
    if(backupCancelBtn) backupCancelBtn.addEventListener('click', closeBackupModal);

    var backupConfirmBtn = document.getElementById('backupConfirmBtn');
    if(backupConfirmBtn) backupConfirmBtn.addEventListener('click', confirmRestoreBackup);

    var backupOverlay = document.getElementById('backupOverlay');
    if(backupOverlay) backupOverlay.addEventListener('click', function(e){
      if(e.target.id === 'backupOverlay') closeBackupModal();
    });

    // Eventos do Modal de Cadastro de Nova Opção (+)
    var optCloseXBtn = document.getElementById('optionCloseXBtn');
    if(optCloseXBtn) optCloseXBtn.addEventListener('click', closeOptionModal);

    var optCancelBtn = document.getElementById('optionCancelBtn');
    if(optCancelBtn) optCancelBtn.addEventListener('click', closeOptionModal);

    var optSaveBtn = document.getElementById('optionSaveBtn');
    if(optSaveBtn) optSaveBtn.addEventListener('click', saveNewOption);

    var optNameInput = document.getElementById('opt_name');
    if(optNameInput) optNameInput.addEventListener('keydown', function(e){
      if(e.key === 'Enter'){ e.preventDefault(); saveNewOption(); }
    });

    var optOverlay = document.getElementById('optionOverlay');
    if(optOverlay) optOverlay.addEventListener('click', function(e){
      if(e.target.id === 'optionOverlay') closeOptionModal();
    });

    document.addEventListener('click', function(e){
      // Botão "+" ao lado de qualquer select
      var addOptBtn = e.target.closest('[data-add-opt]');
      if(addOptBtn){
        e.preventDefault();
        openOptionModal(addOptBtn.dataset.addOpt);
        return;
      }

      // Escolha de cor dentro do modal de nova opção
      var optColorBtn = e.target.closest('[data-opt-color]');
      if(optColorBtn){
        selectedOptionColor = optColorBtn.dataset.optColor || 'blue';
        renderOptionModalExtras();
        return;
      }

      // Excluir opção personalizada
      var delOptBtn = e.target.closest('[data-del-custom-opt]');
      if(delOptBtn){
        deleteCustomOption(delOptBtn.dataset.delCustomOpt);
        return;
      }

      var b = e.target.closest('[data-act]');
      if(b){
        var act = b.dataset.act, id = b.dataset.id;
        if(act === 'delTask'){
          e.stopPropagation();
          getStorage().collection('tasks_oneoff').doc(id).delete();
        } else if(act === 'openInlineCard'){
          inlineCardColId = b.dataset.col;
          addingColOpen = false;
          renderTasks();
        } else if(act === 'cancelInlineCard'){
          inlineCardColId = null;
          renderTasks();
        } else if(act === 'saveInlineCard'){
          saveInlineCard(b.dataset.col);
        } else if(act === 'openAddCol'){
          addingColOpen = true;
          inlineCardColId = null;
          renderTasks();
        } else if(act === 'cancelAddCol'){
          addingColOpen = false;
          renderTasks();
        } else if(act === 'pickNewColColor'){
          newColColor = b.dataset.color || 'blue';
          var curVal = document.getElementById('newColTitleInput') ? document.getElementById('newColTitleInput').value : '';
          var curChk = document.getElementById('newColDoneCheck') ? document.getElementById('newColDoneCheck').checked : false;
          renderTasks();
          if(document.getElementById('newColTitleInput')) document.getElementById('newColTitleInput').value = curVal;
          if(document.getElementById('newColDoneCheck')) document.getElementById('newColDoneCheck').checked = curChk;
        } else if(act === 'saveNewCol'){
          saveNewTaskColumn();
        } else if(act === 'editColTitle'){
          startEditColTitle(b, id);
        } else if(act === 'cycleColColor'){
          var col = getSortedTaskCols().find(function(c){ return c.id === id; });
          if(col){
            var nextIdx = (COL_COLORS.indexOf(col.color || 'blue') + 1) % COL_COLORS.length;
            getStorage().collection('task_columns').doc(id).update({ color: COL_COLORS[nextIdx] });
          }
        } else if(act === 'toggleColDone'){
          var col2 = getSortedTaskCols().find(function(c){ return c.id === id; });
          if(col2){
            var newDoneState = !col2.isDone;
            getStorage().collection('task_columns').doc(id).update({ isDone: newDoneState });
            var tasksStore = getStorage().collection('tasks_oneoff');
            (state.tasks || []).forEach(function(t){
              if(t.status === id){
                tasksStore.doc(t.id).update({
                  done: newDoneState,
                  completedAt: newDoneState ? (t.completedAt || todayStr()) : null
                });
              }
            });
            showToast(newDoneState
              ? 'Quadro "' + col2.title + '" definido como etapa de conclusão.'
              : 'Quadro "' + col2.title + '" alterado para etapa em aberto.');
          }
        } else if(act === 'moveColLeft'){
          moveTaskColumn(id, -1);
        } else if(act === 'moveColRight'){
          moveTaskColumn(id, 1);
        } else if(act === 'delCol'){
          deleteTaskColumn(id);
        } else if(act === 'delTicket'){
          getStorage().collection('tickets').doc(id).delete();
        } else if(act === 'clearFollowup'){
          getStorage().collection('tickets').doc(id).update({ nextFollowUp: null });
        } else if(act === 'delImpl'){
          getStorage().collection('implantacoes').doc(id).delete();
        } else if(act === 'addDemanda'){
          var input = document.querySelector('[data-act="demandaInput"][data-id="'+id+'"]');
          if(input) addDemanda(id, input);
        } else if(act === 'toggleDemanda'){
          var demandaId = b.dataset.demanda;
          updateDemandas(id, function(list){
            return list.map(function(d){
              if(d.id !== demandaId) return d;
              var nowDone = !d.concluida;
              return Object.assign({}, d, { concluida: nowDone, dataFechamento: nowDone ? (d.dataFechamento || todayStr()) : d.dataFechamento });
            });
          });
        } else if(act === 'delDemanda'){
          var demandaId2 = b.dataset.demanda;
          updateDemandas(id, function(list){ return list.filter(function(d){ return d.id !== demandaId2; }); });
        }
        return;
      }

      var taskCard = e.target.closest('.task-card');
      if(taskCard && !isDraggingCard){
        openTaskPanel(taskCard.dataset.id);
      }
    });

    document.addEventListener('change', function(e){
      var el = e.target.closest('[data-act]');
      if(!el) return;
      var act = el.dataset.act, id = el.dataset.id;
      if(act === 'status'){
        var upd = { status: el.value };
        if(el.value === 'fechado') upd.closedAt = todayStr();
        getStorage().collection('tickets').doc(id).update(upd);
      } else if(act === 'followup'){
        getStorage().collection('tickets').doc(id).update({ nextFollowUp: el.value || null });
      } else if(act === 'implStatus'){
        getStorage().collection('implantacoes').doc(id).update({ status: el.value });
      } else if(act === 'implCodigo'){
        getStorage().collection('implantacoes').doc(id).update({ codigo: el.value.trim() || null });
      } else if(act === 'demandaData'){
        var demandaId3 = el.dataset.demanda;
        updateDemandas(id, function(list){
          return list.map(function(d){ return d.id===demandaId3 ? Object.assign({}, d, {dataAbertura: el.value || null}) : d; });
        });
      } else if(act === 'demandaFechamento'){
        var demandaId4 = el.dataset.demanda;
        updateDemandas(id, function(list){
          return list.map(function(d){ return d.id===demandaId4 ? Object.assign({}, d, {dataFechamento: el.value || null}) : d; });
        });
      }
    });

    document.addEventListener('blur', function(e){
      var el = e.target.closest('[data-act="notes"]');
      if(!el) return;
      getStorage().collection('tickets').doc(el.dataset.id).update({ notes: el.value.trim() });
    }, true);

    // --- Drag & Drop (Estilo Trello) para os cards de Tarefas ---
    var draggingTask = null;

    document.addEventListener('dragstart', function(e){
      var taskCard = e.target.closest('.task-card');
      if(taskCard){
        isDraggingCard = true;
        draggingTask = taskCard;
        setTimeout(function(){ taskCard.classList.add('dragging'); }, 0);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', taskCard.dataset.id);
      }
    });

    document.addEventListener('dragend', function(){
      if(draggingTask){
        draggingTask.classList.remove('dragging');
        draggingTask = null;
      }
      document.querySelectorAll('.task-lane-body').forEach(function(el){
        el.classList.remove('drag-over');
      });
      setTimeout(function(){ isDraggingCard = false; }, 50);
    });

    var taskLanesContainer = document.getElementById('taskLanes');
    if(taskLanesContainer){
      taskLanesContainer.addEventListener('keydown', function(e){
        if(e.target && e.target.id === 'newColTitleInput'){
          if(e.key === 'Enter'){ e.preventDefault(); saveNewTaskColumn(); }
          if(e.key === 'Escape'){ addingColOpen = false; renderTasks(); }
        } else if(e.target && e.target.id === 'inlineCardTitleInput'){
          if(e.key === 'Enter' && !e.shiftKey){
            e.preventDefault();
            saveInlineCard(inlineCardColId);
          }
          if(e.key === 'Escape'){
            inlineCardColId = null;
            renderTasks();
          }
        }
      });

      taskLanesContainer.addEventListener('dragover', function(e){
        e.preventDefault();
        var laneBody = e.target.closest('.task-lane-body');
        if(laneBody){
          e.dataTransfer.dropEffect = 'move';
          document.querySelectorAll('.task-lane-body').forEach(function(el){
            if(el !== laneBody) el.classList.remove('drag-over');
          });
          laneBody.classList.add('drag-over');
        }
      });

      taskLanesContainer.addEventListener('dragleave', function(e){
        var laneBody = e.target.closest('.task-lane-body');
        if(laneBody && (!e.relatedTarget || !laneBody.contains(e.relatedTarget))){
          laneBody.classList.remove('drag-over');
        }
      });

      taskLanesContainer.addEventListener('drop', function(e){
        e.preventDefault();
        var laneBody = e.target.closest('.task-lane-body');
        if(laneBody){
          laneBody.classList.remove('drag-over');
          var id = (draggingTask && draggingTask.dataset.id) || e.dataTransfer.getData('text/plain');
          var lane = laneBody.closest('.task-lane');
          if(lane && id){
            var newStatus = lane.dataset.st;
            var targetCol = getSortedTaskCols().find(function(c){ return c.id === newStatus; });
            var isDoneCol = !!(targetCol && targetCol.isDone);
            var upd = { status: newStatus };
            if(isDoneCol){
              upd.done = true;
              upd.completedAt = todayStr();
            } else {
              upd.done = false;
              upd.completedAt = null;
            }
            getStorage().collection('tasks_oneoff').doc(id).update(upd);
          }
        }
      });
    }

    // Eventos do Modal de Edição & Validação de Card
    var newTaskModalBtn = document.getElementById('newTaskModalBtn');
    if(newTaskModalBtn) newTaskModalBtn.addEventListener('click', function(){ openTaskPanel(null); });

    var taskCloseXBtn = document.getElementById('taskCloseXBtn');
    if(taskCloseXBtn) taskCloseXBtn.addEventListener('click', closeTaskPanel);

    var taskCancelBtn = document.getElementById('taskCancelBtn');
    if(taskCancelBtn) taskCancelBtn.addEventListener('click', closeTaskPanel);

    var taskSaveBtn = document.getElementById('taskSaveBtn');
    if(taskSaveBtn) taskSaveBtn.addEventListener('click', saveTaskPanel);

    var taskDeleteBtn = document.getElementById('taskDeleteBtn');
    if(taskDeleteBtn) taskDeleteBtn.addEventListener('click', function(){
      if(editingTaskId){
        getStorage().collection('tasks_oneoff').doc(editingTaskId).delete();
      }
      closeTaskPanel();
    });

    var tkValidadoChk = document.getElementById('tk_validado');
    if(tkValidadoChk) tkValidadoChk.addEventListener('change', syncValidationBadgeUI);

    var taskOverlay = document.getElementById('taskOverlay');
    if(taskOverlay) taskOverlay.addEventListener('click', function(e){
      if(e.target.id === 'taskOverlay') closeTaskPanel();
    });

    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape'){
        var optOv = document.getElementById('optionOverlay');
        if(optOv && !optOv.hidden){ closeOptionModal(); return; }
        var ov = document.getElementById('taskOverlay');
        if(ov && !ov.hidden) closeTaskPanel();
        var bov = document.getElementById('backupOverlay');
        if(bov && !bov.hidden) closeBackupModal();
      }
    });

    // Eventos de Chamados e Implantações
    var newTicketBtn = document.getElementById('newTicketBtn');
    if(newTicketBtn) newTicketBtn.addEventListener('click', function(){ openTicketPanel(null); });

    var ticketCancelBtn = document.getElementById('ticketCancelBtn');
    if(ticketCancelBtn) ticketCancelBtn.addEventListener('click', closeTicketPanel);

    var ticketSaveBtn = document.getElementById('ticketSaveBtn');
    if(ticketSaveBtn) ticketSaveBtn.addEventListener('click', saveTicketPanel);

    var ticketOverlay = document.getElementById('ticketOverlay');
    if(ticketOverlay) ticketOverlay.addEventListener('click', function(e){ if(e.target.id==='ticketOverlay') closeTicketPanel(); });

    var lanes = document.getElementById('lanes');
    if(lanes) lanes.addEventListener('dblclick', function(e){
      var card = e.target.closest('.ticket');
      if(card && !e.target.closest('textarea,input,select,button')) openTicketPanel(card.dataset.id);
    });

    var addImplBtn = document.getElementById('addImplBtn');
    if(addImplBtn) addImplBtn.addEventListener('click', addEmpresa);

    var implEmpresa = document.getElementById('implEmpresa');
    if(implEmpresa) implEmpresa.addEventListener('keydown', function(e){ if(e.key==='Enter') addEmpresa(); });

    var implGrid = document.getElementById('implGrid');
    if(implGrid) implGrid.addEventListener('keydown', function(e){
      if(e.key==='Enter' && e.target.closest('[data-act="demandaInput"]')){
        addDemanda(e.target.dataset.id, e.target);
      }
    });

    refreshAllSelects();
    applyTab();
  }

  function start(){
    state.customOptions = LocalStore.getObj('custom_options');
    setupEvents();
    state.tasks = LocalStore.get('tasks_oneoff');
    state.taskColumns = LocalStore.get('task_columns');
    state.tickets = LocalStore.get('tickets');
    state.implantacoes = LocalStore.get('implantacoes');
    if(state.taskColumns.length === 0){
      seedDefaultTaskCols();
    }
    normalizeTasksAndColumns();
    renderAll();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();