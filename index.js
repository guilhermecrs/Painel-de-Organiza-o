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
      { id: "melhoria", label: "Melhoria", color: "green", builtIn: true },
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

  var SUMMARY_METRIC_OPTIONS = [
    { id: "completed_all",   label: "Automático: Cards Concluídos (Todos)" },
    { id: "completed_today", label: "Automático: Cards Concluídos (Hoje)" },
    { id: "completed_month", label: "Automático: Cards Concluídos (Este mês)" },
    { id: "validated",       label: "Automático: Validados p/ Sistema" },
    { id: "total_tasks",     label: "Automático: Total de Cards no Quadro" },
    { id: "late",            label: "Automático: Tarefas Atrasadas" },
    { id: "due_today",       label: "Automático: Vencem Hoje" },
    { id: "on_time",         label: "Automático: Tarefas no Prazo" },
    { id: "open_tickets",    label: "Automático: Chamados Abertos" },
    { id: "falhas_abertas",  label: "Automático: Falhas em Aberto" },
    { id: "impl_pend",       label: "Automático: Implantações Pendentes" },
    { id: "manual",          label: "Manual: Digitar valor personalizado" }
  ];

  var SUMMARY_ACCENT_OPTIONS = [
    { id: "green",   label: "Verde (Concluído)" },
    { id: "blue",    label: "Azul (Destaque)" },
    { id: "amber",   label: "Âmbar (Atenção)" },
    { id: "red",     label: "Vermelho (Alerta)" },
    { id: "default", label: "Neutro" }
  ];

  var DEFAULT_SUMMARY_CARDS = [
    { id: "completed",   label: "Cards Concluídos",        sub: "Total finalizado", visible: true, metric: "completed_all", manualValue: "0", accent: "green" },
    { id: "late",        label: "Tarefas Atrasadas",       sub: "",                 visible: true, metric: "late",          manualValue: "0", accent: "red" },
    { id: "dueToday",    label: "Vencem Hoje",             sub: "",                 visible: true, metric: "due_today",     manualValue: "0", accent: "amber" },
    { id: "onTime",      label: "Tarefas no Prazo",        sub: "",                 visible: true, metric: "on_time",       manualValue: "0", accent: "blue" },
    { id: "openTickets", label: "Chamados Abertos",        sub: "",                 visible: true, metric: "open_tickets",  manualValue: "0", accent: "default" },
    { id: "implPend",    label: "Implantações Pendentes",  sub: "",                 visible: true, metric: "impl_pend",     manualValue: "0", accent: "red" }
  ];

  var COL_COLORS = ["blue", "amber", "purple", "green", "red", "slate"];
  var DEFAULT_TASK_COLS = [
    {
      id: "todo",
      title: "A Fazer",
      color: "blue",
      isDone: false,
      order: 0,
      autoOccurring: "A demanda foi registrada na fila de atendimento e aguarda início da execução.",
      autoExpecting: "Assim que um técnico assumir o card, ele será movido para Em Andamento."
    },
    {
      id: "doing",
      title: "Em Andamento",
      color: "amber",
      isDone: false,
      order: 1,
      autoOccurring: "A equipe técnica já está analisando e executando esta tarefa.",
      autoExpecting: "Você receberá uma nova atualização assim que a solução for concluída ou precisar de validação."
    },
    {
      id: "done",
      title: "Concluído",
      color: "green",
      isDone: true,
      order: 2,
      autoOccurring: "A atividade foi finalizada e validada com sucesso.",
      autoExpecting: "Nenhuma ação adicional é necessária no momento."
    }
  ];

  /* Gera textos automáticos inteligentes conforme o nome do quadro */
  function getDefaultColumnAutomation(title, isDone){
    var t = String(title || "").toLowerCase();
    if(isDone || /conclu|finaliz|fechad|entregu|pront/.test(t)){
      return {
        occurring: "A atividade foi finalizada e entregue conforme solicitado.",
        expecting: "Nenhuma ação adicional é necessária; o histórico permanece registrado para consulta."
      };
    }
    if(/penden|aguard|bloque|espera|terceir|cliente/.test(t)){
      return {
        occurring: "A tarefa foi pausada porque depende de retorno, aprovação ou recurso externo.",
        expecting: "Assim que a pendência for respondida, o card retornará para a fila de execução."
      };
    }
    if(/valid|homolog|test|revis|confer/.test(t)){
      return {
        occurring: "A execução técnica foi concluída e o item está em conferência/homologação.",
        expecting: "Se aprovado na validação, seguirá para Concluído; caso precise de ajustes, voltará para execução."
      };
    }
    if(/andament|fazend|execu|process|desenvolv/.test(t)){
      return {
        occurring: "A equipe técnica já está atuando diretamente nesta demanda.",
        expecting: "O card será atualizado assim que a etapa técnica for concluída."
      };
    }
    return {
      occurring: 'O card entrou na etapa "' + (title || "Atual") + '" e está sob acompanhamento.',
      expecting: "O próximo passo será registrado assim que houver evolução nesta etapa."
    };
  }

  function getColumnAutomationTexts(col){
    if(!col) return getDefaultColumnAutomation("", false);
    var fallback = getDefaultColumnAutomation(col.title, !!col.isDone);
    return {
      occurring: (col.autoOccurring && col.autoOccurring.trim()) ? col.autoOccurring.trim() : fallback.occurring,
      expecting: (col.autoExpecting && col.autoExpecting.trim()) ? col.autoExpecting.trim() : fallback.expecting
    };
  }

  /* FORMATADORES DE DATA CONFIÁVEIS */
  function todayStr(){
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }
  function nowDateTimeStr(){
    var d = new Date();
    var dd = String(d.getDate()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var hh = String(d.getHours()).padStart(2, '0');
    var mi = String(d.getMinutes()).padStart(2, '0');
    return dd + "/" + mm + " às " + hh + ":" + mi;
  }
  function fmtDate(s){
    if(!s) return "";
    var p = s.split("-");
    if(p.length!==3) return s;
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
  function showToast(msg, subMsg, actionLabel, onAction){
    var el = document.getElementById('toast');
    if(!el) return;
    var html = '<div>' + esc(msg) + '</div>';
    if(subMsg) html += '<div class="toast-sub">' + esc(subMsg) + '</div>';
    if(actionLabel) html += '<button type="button" class="toast-action" id="toastActionBtn">' + esc(actionLabel) + '</button>';
    el.innerHTML = html;
    el.hidden = false;

    if(actionLabel && typeof onAction === 'function'){
      var btn = document.getElementById('toastActionBtn');
      if(btn) btn.addEventListener('click', function(){
        el.hidden = true;
        onAction();
      });
    }

    if(toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ el.hidden = true; }, subMsg ? 5500 : 3200);
  }

  var state = { tasks: null, taskColumns: null, tickets: null, implantacoes: null, customOptions: null, summaryConfig: null, canEdit: true };
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

  /* --- Configuração & Cálculo dos Indicadores Superiores --- */
  function cloneDefaultSummaryCards(){
    return DEFAULT_SUMMARY_CARDS.map(function(c){ return Object.assign({}, c); });
  }

  function getSummaryCardsConfig(){
    if(Array.isArray(state.summaryConfig) && state.summaryConfig.length){
      return state.summaryConfig;
    }
    return cloneDefaultSummaryCards();
  }

  function computeSummaryMetricValue(metric){
    var today = todayStr();
    var monthPrefix = today.slice(0, 7);
    var tasks = state.tasks || [];
    var tickets = state.tickets || [];
    var impls = state.implantacoes || [];
    var pendingTasks = tasks.filter(function(t){ return !t.done; });

    switch(metric){
      case "completed_all":
        return tasks.filter(function(t){ return !!t.done; }).length;
      case "completed_today":
        return tasks.filter(function(t){ return !!t.done && t.completedAt === today; }).length;
      case "completed_month":
        return tasks.filter(function(t){ return !!t.done && t.completedAt && t.completedAt.slice(0, 7) === monthPrefix; }).length;
      case "validated":
        return tasks.filter(function(t){ return !!t.validado; }).length;
      case "total_tasks":
        return tasks.length;
      case "late":
        return pendingTasks.filter(function(t){ return t.dueDate && t.dueDate < today; }).length;
      case "due_today":
        return pendingTasks.filter(function(t){ return t.dueDate === today; }).length;
      case "on_time":
        return pendingTasks.filter(function(t){ return !t.dueDate || t.dueDate > today; }).length;
      case "open_tickets":
        return tickets.filter(function(t){ return t.status !== 'fechado'; }).length;
      case "falhas_abertas":
        return tickets.filter(function(t){ return t.tipo === 'falha' && t.status !== 'fechado'; }).length;
      case "impl_pend":
        return impls.filter(function(i){ return i.status !== 'concluida' && (i.demandas||[]).some(function(d){ return !d.concluida; }); }).length;
      default:
        return 0;
    }
  }

  function renderSummary(){
    var el = document.getElementById('summary');
    if(!el) return;
    var cards = getSummaryCardsConfig().filter(function(c){ return c.visible !== false; });

    if(cards.length === 0){
      el.innerHTML = '<div class="stat" data-stat-id="">'+
        '<span class="stat-edit-badge">✎ Editar</span>'+
        '<div class="n">—</div>'+
        '<div class="l">Nenhum indicador visível</div>'+
        '<div class="sub-note">Clique aqui ou em "Personalizar indicadores" para ativar.</div>'+
      '</div>';
      return;
    }

    el.innerHTML = cards.map(function(c){
      var isManual = (c.metric === 'manual');
      var val = isManual
        ? (c.manualValue != null && String(c.manualValue).trim() !== '' ? String(c.manualValue) : '0')
        : computeSummaryMetricValue(c.metric);
      var numVal = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
      var accent = c.accent || 'default';

      var cls = 'stat';
      if(accent === 'red'){
        if(isManual || numVal > 0) cls += ' alert';
      } else if(accent === 'green'){
        cls += ' tone-green';
      } else if(accent === 'blue'){
        cls += ' tone-blue';
      } else if(accent === 'amber'){
        if(isManual || numVal > 0) cls += ' tone-amber';
      }

      return '<div class="'+cls+'" data-stat-id="'+esc(c.id)+'" title="Clique para editar este card ou alterar os dados">'+
        '<span class="stat-edit-badge">✎ Editar</span>'+
        '<div class="n">'+esc(val)+'</div>'+
        '<div class="l">'+esc(c.label || 'Indicador')+'</div>'+
        (c.sub ? '<div class="sub-note">'+esc(c.sub)+'</div>' : '')+
      '</div>';
    }).join('');
  }

  /* --- Modal de Personalização dos Cards Superiores --- */
  var draftSummaryCards = [];
  var focusSummaryCardId = null;

  function renderSummaryConfigModalList(){
    var listEl = document.getElementById('scConfigList');
    if(!listEl) return;

    listEl.innerHTML = draftSummaryCards.map(function(card, idx){
      var isManual = (card.metric === 'manual');
      var autoCurrentVal = isManual ? (card.manualValue || '0') : computeSummaryMetricValue(card.metric);
      var isFocused = (focusSummaryCardId && focusSummaryCardId === card.id);
      var canDelete = draftSummaryCards.length > 1;

      var metricOptionsHtml = SUMMARY_METRIC_OPTIONS.map(function(m){
        return '<option value="'+esc(m.id)+'"'+(card.metric === m.id ? ' selected' : '')+'>'+esc(m.label)+'</option>';
      }).join('');

      var accentOptionsHtml = SUMMARY_ACCENT_OPTIONS.map(function(a){
        return '<option value="'+esc(a.id)+'"'+(card.accent === a.id ? ' selected' : '')+'>'+esc(a.label)+'</option>';
      }).join('');

      return '<div class="sc-item-card'+(isFocused ? ' is-focused' : '')+(card.visible === false ? ' is-disabled' : '')+'" data-cfg-idx="'+idx+'" data-cfg-id="'+esc(card.id)+'">'+
        '<div class="sc-item-top">'+
          '<label class="sc-toggle-label">'+
            '<input type="checkbox" data-scfg="visible" data-idx="'+idx+'"'+(card.visible !== false ? ' checked' : '')+'>'+
            '<span>Exibir no painel superior</span>'+
          '</label>'+
          '<div class="sc-item-tools">'+
            (idx > 0 ? '<button type="button" class="lane-mini-btn" data-scfg-act="up" data-idx="'+idx+'" title="Mover para cima">↑</button>' : '')+
            (idx < draftSummaryCards.length - 1 ? '<button type="button" class="lane-mini-btn" data-scfg-act="down" data-idx="'+idx+'" title="Mover para baixo">↓</button>' : '')+
            (canDelete ? '<button type="button" class="lane-mini-btn del" data-scfg-act="del" data-idx="'+idx+'" title="Remover card">✕</button>' : '')+
          '</div>'+
        '</div>'+
        '<div class="sc-grid-fields">'+
          '<label>Título do card *'+
            '<input type="text" data-scfg="label" data-idx="'+idx+'" value="'+esc(card.label || '')+'" placeholder="Ex.: Cards Concluídos">'+
          '</label>'+
          '<label>Fonte dos dados'+
            '<select data-scfg="metric" data-idx="'+idx+'">'+metricOptionsHtml+'</select>'+
          '</label>'+
          '<label>'+(isManual ? 'Valor (Editável) *' : 'Valor atual')+
            '<input type="text" data-scfg="manualValue" data-idx="'+idx+'" value="'+esc(isManual ? (card.manualValue || '0') : autoCurrentVal)+'"'+(isManual ? ' placeholder="Digite…"' : ' disabled')+'>'+
          '</label>'+
        '</div>'+
        '<div class="sc-grid-sub">'+
          '<label>Subtítulo / Observação'+
            '<input type="text" data-scfg="sub" data-idx="'+idx+'" value="'+esc(card.sub || '')+'" placeholder="Ex.: Meta: 20 no mês">'+
          '</label>'+
          '<label>Cor de destaque'+
            '<select data-scfg="accent" data-idx="'+idx+'">'+accentOptionsHtml+'</select>'+
          '</label>'+
        '</div>'+
      '</div>';
    }).join('');
  }

  function openSummaryModal(cardId){
    focusSummaryCardId = cardId || null;
    draftSummaryCards = getSummaryCardsConfig().map(function(c){ return Object.assign({}, c); });
    renderSummaryConfigModalList();
    var ov = document.getElementById('summaryConfigOverlay');
    if(ov) ov.hidden = false;

    if(cardId){
      setTimeout(function(){
        var targetCard = document.querySelector('.sc-item-card[data-cfg-id="'+cardId+'"]');
        if(targetCard){
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          var inp = targetCard.querySelector('input[data-scfg="label"]');
          if(inp){ inp.focus(); inp.select(); }
        }
      }, 30);
    }
  }

  function closeSummaryModal(){
    var ov = document.getElementById('summaryConfigOverlay');
    if(ov) ov.hidden = true;
    draftSummaryCards = [];
    focusSummaryCardId = null;
  }

  function saveSummaryModal(){
    var cleaned = draftSummaryCards.map(function(c, i){
      var lbl = (c.label || '').trim() || ('Indicador ' + (i + 1));
      return {
        id: c.id || uid(),
        label: lbl,
        sub: (c.sub || '').trim(),
        visible: c.visible !== false,
        metric: c.metric || 'completed_all',
        manualValue: (c.manualValue != null && String(c.manualValue).trim() !== '') ? String(c.manualValue).trim() : '0',
        accent: c.accent || 'default'
      };
    });

    state.summaryConfig = cleaned;
    LocalStore.set('summary_config', cleaned);
    closeSummaryModal();
    renderSummary();
    showToast('Painel superior atualizado!');
  }

  function addNewSummaryCardDraft(){
    var newCard = {
      id: uid(),
      label: 'Novo Indicador',
      sub: 'Editado manualmente',
      visible: true,
      metric: 'manual',
      manualValue: '0',
      accent: 'blue'
    };
    draftSummaryCards.push(newCard);
    focusSummaryCardId = newCard.id;
    renderSummaryConfigModalList();
    setTimeout(function(){
      var target = document.querySelector('.sc-item-card[data-cfg-id="'+newCard.id+'"]');
      if(target){
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        var inp = target.querySelector('input[data-scfg="label"]');
        if(inp){ inp.focus(); inp.select(); }
      }
    }, 30);
  }

  function resetSummaryModal(){
    draftSummaryCards = cloneDefaultSummaryCards();
    focusSummaryCardId = null;
    renderSummaryConfigModalList();
  }

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
    if(targetSelect){
      targetSelect.value = newId;
      if(meta.selectId === 'tk_category') syncValidationBadgeUI();
    }
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

  function getDoneColumn(){
    var cols = getSortedTaskCols();
    return cols.find(function(c){ return !!c.isDone; })
      || cols.find(function(c){ return c.id === 'done' || /conclu/i.test(c.title || ''); })
      || cols[cols.length - 1];
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
        order: c.order,
        autoOccurring: c.autoOccurring,
        autoExpecting: c.autoExpecting
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

  /* --- Gerador de Atualização Automática de Movimentação --- */
  function buildTransitionLogEntry(fromCol, toCol){
    var texts = getColumnAutomationTexts(toCol);
    return {
      id: uid(),
      type: "auto_move",
      fromTitle: fromCol ? fromCol.title : "Novo",
      toTitle: toCol ? toCol.title : "",
      occurring: texts.occurring,
      expecting: texts.expecting,
      timestamp: nowDateTimeStr(),
      createdAt: Date.now()
    };
  }

  function moveTaskToColumn(taskId, newColId, silent){
    var task = (state.tasks || []).find(function(t){ return t.id === taskId; });
    if(!task) return;
    var cols = getSortedTaskCols();
    var fromCol = cols.find(function(c){ return c.id === task.status; });
    var toCol = cols.find(function(c){ return c.id === newColId; });
    if(!toCol) return;

    var isDoneCol = !!toCol.isDone;
    var history = Array.isArray(task.updatesLog) ? task.updatesLog.slice() : [];
    var entry = null;

    if(task.status !== newColId){
      entry = buildTransitionLogEntry(fromCol, toCol);
      history.unshift(entry);
    }

    var upd = {
      status: newColId,
      done: isDoneCol,
      completedAt: isDoneCol ? (task.completedAt || todayStr()) : null,
      updatesLog: history,
      updatedAt: Date.now()
    };

    getStorage().collection('tasks_oneoff').doc(taskId).update(upd);

    if(entry && !silent){
      showToast(
        entry.fromTitle + " ➔ " + entry.toTitle,
        "O que está ocorrendo: " + entry.occurring + " | O que esperar: " + entry.expecting,
        "Editar / Comentar",
        function(){ openTaskPanel(taskId); }
      );
    }
  }

  /* --- Modal de Configuração da Mensagem Automática por Quadro --- */
  var editingColAutoId = null;

  function openColAutoModal(colId){
    var col = getSortedTaskCols().find(function(c){ return c.id === colId; });
    if(!col) return;
    editingColAutoId = colId;
    var texts = getColumnAutomationTexts(col);
    document.getElementById('colAutoModalTitle').textContent = 'Quadro: ' + col.title;
    document.getElementById('ca_occurring').value = texts.occurring;
    document.getElementById('ca_expecting').value = texts.expecting;
    document.getElementById('colAutoOverlay').hidden = false;
    setTimeout(function(){ document.getElementById('ca_occurring').focus(); }, 20);
  }

  function closeColAutoModal(){
    document.getElementById('colAutoOverlay').hidden = true;
    editingColAutoId = null;
  }

  function saveColAutoModal(){
    if(!editingColAutoId) return;
    var occ = document.getElementById('ca_occurring').value.trim();
    var exp = document.getElementById('ca_expecting').value.trim();
    if(!occ){ document.getElementById('ca_occurring').focus(); return; }
    if(!exp){ document.getElementById('ca_expecting').focus(); return; }

    getStorage().collection('task_columns').doc(editingColAutoId).update({
      autoOccurring: occ,
      autoExpecting: exp
    });
    closeColAutoModal();
    showToast("Regra de atualização automática salva!");
  }

  function resetColAutoModal(){
    if(!editingColAutoId) return;
    var col = getSortedTaskCols().find(function(c){ return c.id === editingColAutoId; });
    if(!col) return;
    var def = getDefaultColumnAutomation(col.title, !!col.isDone);
    document.getElementById('ca_occurring').value = def.occurring;
    document.getElementById('ca_expecting').value = def.expecting;
  }

  /* --- Exportar & Importar Backup (.json) --- */
  var pendingBackupData = null;

  function exportBackup(){
    var payload = {
      app: "mesa-suporte",
      version: 5,
      exportedAt: new Date().toISOString(),
      data: {
        tasks_oneoff: state.tasks || LocalStore.get('tasks_oneoff'),
        task_columns: state.taskColumns || LocalStore.get('task_columns'),
        tickets: state.tickets || LocalStore.get('tickets'),
        implantacoes: state.implantacoes || LocalStore.get('implantacoes'),
        custom_options: state.customOptions || LocalStore.getObj('custom_options'),
        summary_config: state.summaryConfig || LocalStore.get('summary_config')
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
          custom_options: (data.custom_options && typeof data.custom_options === 'object') ? data.custom_options : {},
          summary_config: Array.isArray(data.summary_config) && data.summary_config.length ? data.summary_config : cloneDefaultSummaryCards()
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
    LocalStore.set('summary_config', pendingBackupData.summary_config);

    state.tasks = pendingBackupData.tasks_oneoff;
    state.taskColumns = pendingBackupData.task_columns;
    state.tickets = pendingBackupData.tickets;
    state.implantacoes = pendingBackupData.implantacoes;
    state.customOptions = pendingBackupData.custom_options;
    state.summaryConfig = pendingBackupData.summary_config;

    refreshAllSelects();
    normalizeTasksAndColumns();
    closeBackupModal();
    renderAll();
    showToast("Backup restaurado com sucesso!");
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
    var doneBtnHtml = !isDoneCol
      ? '<button type="button" class="card-done-btn" data-act="completeTask" data-id="'+t.id+'" title="Concluir e mover para o quadro Concluído">✓ Concluído</button>'
      : '';

    var logs = Array.isArray(t.updatesLog) ? t.updatesLog : [];
    var latest = logs.length ? logs[0] : null;
    var latestHtml = '';
    if(latest){
      var routeText = latest.type === 'manual'
        ? '💬 Comentário (' + esc(latest.timestamp || '') + ')'
        : '⚡ ' + esc(latest.fromTitle || '') + ' ➔ ' + esc(latest.toTitle || '');
      latestHtml = '<div class="card-latest-update" title="Clique no card para ver o histórico completo ('+logs.length+')">'+
        '<div class="upd-route"><span>'+routeText+'</span><span>'+(logs.length > 1 ? '+'+(logs.length-1) : '')+'</span></div>'+
        (latest.occurring ? '<div class="upd-line"><b>Ocorrendo:</b> '+esc(latest.occurring)+'</div>' : '')+
        (latest.expecting ? '<div class="upd-line"><b>Esperar:</b> '+esc(latest.expecting)+'</div>' : '')+
      '</div>';
    }

    return '<div class="'+cls+'" data-id="'+t.id+'" draggable="true">'+
      '<div class="body">'+
        '<div class="title">'+esc(t.title)+'</div>'+
        (t.notes ? '<div class="excerpt">'+esc(t.notes)+'</div>' : '')+
        latestHtml+
        '<div class="meta">'+
          '<span class="pri-dot c-'+esc(priColor)+'" title="Prioridade: '+esc(priOpt.label)+'"></span>'+
          validadoHtml+
          dueHtml+
          (empStr ? '<span class="tag modulo">'+empStr+'</span>' : '')+
          '<span class="tag opt-'+esc(catColor)+'">'+esc(catOpt.label)+'</span>'+
          completedHtml+
        '</div>'+
        doneBtnHtml+
      '</div>'+
      '<div class="actions"><button class="icon-btn" data-act="delTask" data-id="'+t.id+'" title="Remover">'+trashSvg()+'</button></div>'+
    '</div>';
  }

  /* --- ORDENAÇÃO E RENDERIZAÇÃO DOS CARDS --- */
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

    var sortedTasks = tasks.slice().sort(function(a, b){
      var dateA = a.dueDate || '9999-12-31';
      var dateB = b.dueDate || '9999-12-31';

      if(dateA < dateB) return -1;
      if(dateA > dateB) return 1;

      var pWeight = { "alta": 3, "media": 2, "baixa": 1 };
      var pA = pWeight[a.priority] || 0;
      var pB = pWeight[b.priority] || 0;

      if(pA > pB) return -1;
      if(pA < pB) return 1;
      return 0;
    });

    sortedTasks.forEach(function(t){
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
            '<button class="lane-mini-btn auto-btn" data-act="configColAuto" data-id="'+esc(col.id)+'" title="Configurar atualização automática ao mover para este quadro">⚡</button>'+
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
        '<input type="text" id="newColTitleInput" placeholder="Nome do quadro (ex.: Pendentes, Validação)">'+
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

  /* --- Modal / Sub-aba de Edição, Histórico e Validação do Card --- */
  var editingTaskId = null;
  var draftUpdatesLog = [];

  function renderTaskActivityFeed(){
    var feedEl = document.getElementById('tk_activityFeed');
    var countEl = document.getElementById('tk_activityCount');
    if(!feedEl || !countEl) return;

    countEl.textContent = draftUpdatesLog.length + (draftUpdatesLog.length === 1 ? ' registro' : ' registros');

    if(draftUpdatesLog.length === 0){
      feedEl.innerHTML = '<div class="activity-empty">Nenhuma atualização registrada ainda. Mova o card de quadro ou registre uma atualização acima.</div>';
      return;
    }

    feedEl.innerHTML = draftUpdatesLog.map(function(item){
      var isManual = item.type === 'manual';
      var badgeText = isManual
        ? '💬 Atualização manual'
        : '⚡ ' + esc(item.fromTitle || '') + ' ➔ ' + esc(item.toTitle || '');

      return '<div class="activity-item'+(isManual ? ' is-manual' : '')+'">'+
        '<div class="activity-item-top">'+
          '<span class="activity-badge">'+badgeText+'</span>'+
          '<span class="activity-time">'+esc(item.timestamp || '')+'</span>'+
          '<button type="button" class="activity-del-btn" data-del-log-id="'+esc(item.id)+'" title="Remover registro">✕</button>'+
        '</div>'+
        (item.occurring ? '<div class="activity-field"><strong>O que está ocorrendo:</strong> '+esc(item.occurring)+'</div>' : '')+
        (item.expecting ? '<div class="activity-field"><strong>O que esperar:</strong> '+esc(item.expecting)+'</div>' : '')+
      '</div>';
    }).join('');
  }

  function addManualCommentToDraft(){
    var occEl = document.getElementById('tk_newCommentStatus');
    var expEl = document.getElementById('tk_newCommentNext');
    var occ = occEl ? occEl.value.trim() : '';
    var exp = expEl ? expEl.value.trim() : '';
    if(!occ && !exp){
      if(occEl) occEl.focus();
      return;
    }

    draftUpdatesLog.unshift({
      id: uid(),
      type: "manual",
      occurring: occ || null,
      expecting: exp || null,
      timestamp: nowDateTimeStr(),
      createdAt: Date.now()
    });

    if(occEl) occEl.value = '';
    if(expEl) expEl.value = '';
    renderTaskActivityFeed();
  }

  function isFalhaOrMelhoriaCategory(categoryId){
    if(!categoryId) return false;
    var opt = findOption('task_categories', categoryId);
    var text = ((opt && opt.label) ? opt.label : categoryId)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return text.indexOf('falha') !== -1 || text.indexOf('melhoria') !== -1;
  }

  function syncValidationBadgeUI(){
    var chk = document.getElementById('tk_validado');
    var catSel = document.getElementById('tk_category');
    var box = document.getElementById('validationBox');
    var badge = document.getElementById('tk_valStatusBadge');
    var msg = document.getElementById('tk_validationMsg');
    var valPorLabel = document.getElementById('tk_validadoPorLabel');
    if(!chk || !box || !badge) return;
    if(msg) msg.hidden = true;

    var exigeValidador = catSel && isFalhaOrMelhoriaCategory(catSel.value);
    if(valPorLabel){
      valPorLabel.textContent = exigeValidador
        ? 'Validado por *'
        : 'Validado por (opcional)';
    }

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

    document.getElementById('tk_newCommentStatus').value = '';
    document.getElementById('tk_newCommentNext').value = '';
    draftUpdatesLog = (t && Array.isArray(t.updatesLog)) ? t.updatesLog.slice() : [];
    renderTaskActivityFeed();

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
    draftUpdatesLog = [];
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

    var pendingOcc = document.getElementById('tk_newCommentStatus').value.trim();
    var pendingExp = document.getElementById('tk_newCommentNext').value.trim();
    if(pendingOcc || pendingExp){
      draftUpdatesLog.unshift({
        id: uid(),
        type: "manual",
        occurring: pendingOcc || null,
        expecting: pendingExp || null,
        timestamp: nowDateTimeStr(),
        createdAt: Date.now()
      });
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

    if(validado && isFalhaOrMelhoriaCategory(category) && !validadoPor){
      showTaskValidationError('Para cards de Falha ou Melhoria, informe a pessoa que validou no campo "Validado por".');
      document.getElementById('tk_validadoPor').focus();
      return;
    }

    if(validado && !empresa && !notes){
      showTaskValidationError('Para validar para o sistema, preencha ao menos a Empresa ou a Descrição do card.');
      return;
    }

    var cols = getSortedTaskCols();
    var targetCol = cols.find(function(c){ return c.id === status; });
    var isDoneCol = !!(targetCol && targetCol.isDone);
    var existing = editingTaskId ? (state.tasks||[]).find(function(x){ return x.id === editingTaskId; }) : null;

    var generatedEntry = null;
    if(existing && existing.status !== status && targetCol){
      var fromCol = cols.find(function(c){ return c.id === existing.status; });
      generatedEntry = buildTransitionLogEntry(fromCol, targetCol);
      draftUpdatesLog.unshift(generatedEntry);
    } else if(!existing && targetCol){
      generatedEntry = buildTransitionLogEntry(null, targetCol);
      draftUpdatesLog.unshift(generatedEntry);
    }

    var data = {
      title: title,
      empresa: empresa,
      codigo: codigo,
      status: status,
      category: category,
      priority: priority,
      dueDate: dueDate,
      notes: notes,
      updatesLog: draftUpdatesLog,
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

    if(generatedEntry && existing){
      showToast(
        generatedEntry.fromTitle + " ➔ " + generatedEntry.toTitle,
        "O que está ocorrendo: " + generatedEntry.occurring + " | O que esperar: " + generatedEntry.expecting
      );
    }
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
    var initialLog = targetCol ? [buildTransitionLogEntry(null, targetCol)] : [];

    inlineCardColId = null;
    getStorage().collection('tasks_oneoff').doc(uid()).set({
      title: title,
      category: 'chamado',
      dueDate: null,
      priority: 'media',
      empresa: null,
      codigo: null,
      notes: null,
      updatesLog: initialLog,
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
    var autoTexts = getDefaultColumnAutomation(title, isDone);

    addingColOpen = false;
    getStorage().collection('task_columns').doc(uid()).set({
      title: title,
      color: newColColor,
      isDone: isDone,
      order: maxOrder + 1,
      autoOccurring: autoTexts.occurring,
      autoExpecting: autoTexts.expecting
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

    // Eventos do Painel Superior Personalizável
    var openSummaryConfigBtn = document.getElementById('openSummaryConfigBtn');
    if(openSummaryConfigBtn) openSummaryConfigBtn.addEventListener('click', function(){ openSummaryModal(null); });

    var scCloseXBtn = document.getElementById('scCloseXBtn');
    if(scCloseXBtn) scCloseXBtn.addEventListener('click', closeSummaryModal);

    var scCancelBtn = document.getElementById('scCancelBtn');
    if(scCancelBtn) scCancelBtn.addEventListener('click', closeSummaryModal);

    var scSaveBtn = document.getElementById('scSaveBtn');
    if(scSaveBtn) scSaveBtn.addEventListener('click', saveSummaryModal);

    var scResetBtn = document.getElementById('scResetBtn');
    if(scResetBtn) scResetBtn.addEventListener('click', resetSummaryModal);

    var scAddCardBtn = document.getElementById('scAddCardBtn');
    if(scAddCardBtn) scAddCardBtn.addEventListener('click', addNewSummaryCardDraft);

    var summaryConfigOverlay = document.getElementById('summaryConfigOverlay');
    if(summaryConfigOverlay) summaryConfigOverlay.addEventListener('click', function(e){
      if(e.target.id === 'summaryConfigOverlay') closeSummaryModal();
    });

    var scConfigList = document.getElementById('scConfigList');
    if(scConfigList){
      scConfigList.addEventListener('input', function(e){
        var el = e.target.closest('[data-scfg]');
        if(!el) return;
        var idx = parseInt(el.dataset.idx, 10);
        var field = el.dataset.scfg;
        if(isNaN(idx) || !draftSummaryCards[idx]) return;
        if(field === 'label' || field === 'sub' || field === 'manualValue'){
          draftSummaryCards[idx][field] = el.value;
        }
      });

      scConfigList.addEventListener('change', function(e){
        var el = e.target.closest('[data-scfg]');
        if(!el) return;
        var idx = parseInt(el.dataset.idx, 10);
        var field = el.dataset.scfg;
        if(isNaN(idx) || !draftSummaryCards[idx]) return;

        if(field === 'visible'){
          draftSummaryCards[idx].visible = !!el.checked;
          renderSummaryConfigModalList();
        } else if(field === 'metric'){
          var prevMetric = draftSummaryCards[idx].metric;
          var newMetric = el.value;
          if(newMetric === 'manual' && prevMetric !== 'manual'){
            draftSummaryCards[idx].manualValue = String(computeSummaryMetricValue(prevMetric));
          }
          draftSummaryCards[idx].metric = newMetric;
          renderSummaryConfigModalList();
          if(newMetric === 'manual'){
            setTimeout(function(){
              var valInp = scConfigList.querySelector('input[data-scfg="manualValue"][data-idx="'+idx+'"]');
              if(valInp){ valInp.focus(); valInp.select(); }
            }, 20);
          }
        } else if(field === 'accent'){
          draftSummaryCards[idx].accent = el.value;
        }
      });

      scConfigList.addEventListener('click', function(e){
        var btn = e.target.closest('[data-scfg-act]');
        if(!btn) return;
        var idx = parseInt(btn.dataset.idx, 10);
        var act = btn.dataset.scfgAct;
        if(isNaN(idx) || !draftSummaryCards[idx]) return;

        if(act === 'up' && idx > 0){
          var tmpUp = draftSummaryCards[idx];
          draftSummaryCards[idx] = draftSummaryCards[idx - 1];
          draftSummaryCards[idx - 1] = tmpUp;
          renderSummaryConfigModalList();
        } else if(act === 'down' && idx < draftSummaryCards.length - 1){
          var tmpDown = draftSummaryCards[idx];
          draftSummaryCards[idx] = draftSummaryCards[idx + 1];
          draftSummaryCards[idx + 1] = tmpDown;
          renderSummaryConfigModalList();
        } else if(act === 'del' && draftSummaryCards.length > 1){
          draftSummaryCards.splice(idx, 1);
          renderSummaryConfigModalList();
        }
      });
    }

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

    // Eventos do Modal de Automação de Quadro
    var colAutoCloseXBtn = document.getElementById('colAutoCloseXBtn');
    if(colAutoCloseXBtn) colAutoCloseXBtn.addEventListener('click', closeColAutoModal);

    var colAutoCancelBtn = document.getElementById('colAutoCancelBtn');
    if(colAutoCancelBtn) colAutoCancelBtn.addEventListener('click', closeColAutoModal);

    var colAutoSaveBtn = document.getElementById('colAutoSaveBtn');
    if(colAutoSaveBtn) colAutoSaveBtn.addEventListener('click', saveColAutoModal);

    var colAutoResetBtn = document.getElementById('colAutoResetBtn');
    if(colAutoResetBtn) colAutoResetBtn.addEventListener('click', resetColAutoModal);

    var colAutoOverlay = document.getElementById('colAutoOverlay');
    if(colAutoOverlay) colAutoOverlay.addEventListener('click', function(e){
      if(e.target.id === 'colAutoOverlay') closeColAutoModal();
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

    // Adicionar comentário manual dentro do modal do card
    var addCommentBtn = document.getElementById('tk_addCommentBtn');
    if(addCommentBtn) addCommentBtn.addEventListener('click', addManualCommentToDraft);

    document.addEventListener('click', function(e){
      // Editar card do painel superior ao clicar no próprio card
      var statCard = e.target.closest('.stat[data-stat-id]');
      if(statCard){
        openSummaryModal(statCard.dataset.statId || null);
        return;
      }

      // Remover item do histórico no modal do card
      var delLogBtn = e.target.closest('[data-del-log-id]');
      if(delLogBtn){
        var logId = delLogBtn.dataset.delLogId;
        draftUpdatesLog = draftUpdatesLog.filter(function(item){ return item.id !== logId; });
        renderTaskActivityFeed();
        return;
      }

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
        } else if(act === 'completeTask'){
          e.stopPropagation();
          var doneCol = getDoneColumn();
          if(doneCol){
            moveTaskToColumn(id, doneCol.id, false);
          }
        } else if(act === 'configColAuto'){
          openColAutoModal(id);
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

    // --- Drag & Drop (Estilo Trello) com Reset Seguro ---
    var draggingTask = null;

    function resetDragState(){
      if(draggingTask){
        draggingTask.classList.remove('dragging');
        draggingTask = null;
      }
      document.querySelectorAll('.task-lane-body').forEach(function(el){
        el.classList.remove('drag-over');
      });
      setTimeout(function(){ isDraggingCard = false; }, 50);
    }

    document.addEventListener('dragstart', function(e){
      var taskCard = e.target.closest('.task-card');
      if(taskCard){
        isDraggingCard = true;
        draggingTask = taskCard;
        setTimeout(function(){
          if(draggingTask) draggingTask.classList.add('dragging');
        }, 0);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', taskCard.dataset.id);
      }
    });

    document.addEventListener('dragend', resetDragState);

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
          resetDragState();
          if(lane && id){
            moveTaskToColumn(id, lane.dataset.st, false);
          }
        } else {
          resetDragState();
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

    var tkCategorySel = document.getElementById('tk_category');
    if(tkCategorySel) tkCategorySel.addEventListener('change', syncValidationBadgeUI);

    var taskOverlay = document.getElementById('taskOverlay');
    if(taskOverlay) taskOverlay.addEventListener('click', function(e){
      if(e.target.id === 'taskOverlay') closeTaskPanel();
    });

    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape'){
        var sumOv = document.getElementById('summaryConfigOverlay');
        if(sumOv && !sumOv.hidden){ closeSummaryModal(); return; }
        var caOv = document.getElementById('colAutoOverlay');
        if(caOv && !caOv.hidden){ closeColAutoModal(); return; }
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
    var savedSummary = LocalStore.get('summary_config');
    state.summaryConfig = (Array.isArray(savedSummary) && savedSummary.length) ? savedSummary : cloneDefaultSummaryCards();
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