(function(){
  "use strict";

  var CAT_LABEL = {chamado:"Chamado", usuario:"Usuário", email:"E-mail", falha:"Falha", outro:"Outro"};
  var CAT_CLASS = {chamado:"cat-chamado", usuario:"cat-usuario", email:"cat-email", falha:"cat-falha", outro:"cat-outro"};
  var ST_LABEL = {aberto:"Aberto", pendente:"Pendente", em_processo:"Em processo", fechado:"Fechado"};
  var ST_ORDER = ["aberto","pendente","em_processo","fechado"];
  var TIPO_LABEL = {falha:"Falha", duvida:"Dúvida", solicitacao:"Solicitação", melhoria:"Melhoria"};
  var ASSIGNEE_LABEL = {"ADRIANO":"Adriano", "ALISSON OLIVEIRA":"Alisson Oliveira", "LUCAS":"Lucas", "GABRIEL":"Gabriel", "GUILHERME":"Guilherme"};
  var MODULOS = ["ORGSMART","DOCUMENTO FISCAL","PROCESSO ALERTA","ATIVO IMOBILIZADO","CRM","ORGTOOLS",
    "PONTO DE VENDAS","FOLHA","CONTROLE DE ESTOQUE","REEMBOLSO","COMPRAS","AUTENTICAÇÃO","CONSULTA",
    "CONTABILIDADE","FINANCEIRO","PRESTAÇÃO DE CONTAS","ASSISTÊNCIA SOCIAL"];

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

  var state = { fixed: null, tasks: null, tickets: null, implantacoes: null, canEdit: true };
  var db = null, userNS = null;

  var LocalStore = {
    get: function(col) {
      try { return JSON.parse(localStorage.getItem('app_db_' + col) || '[]'); }
      catch(e) { return []; }
    },
    set: function(col, data) {
      try { localStorage.setItem('app_db_' + col, JSON.stringify(data)); }
      catch(e) {}
    }
  };

  function notifyLocalChange(col) {
    if (col === 'tasks_fixed') state.fixed = LocalStore.get('tasks_fixed');
    if (col === 'tasks_oneoff') state.tasks = LocalStore.get('tasks_oneoff');
    if (col === 'tickets') state.tickets = LocalStore.get('tickets');
    if (col === 'implantacoes') state.implantacoes = LocalStore.get('implantacoes');
    renderAll();
  }

  function getStorage() {
    if (db) return db;
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

  var modulosOptionsHtml = MODULOS.map(function(m){ return '<option value="'+m+'">'+m+'</option>'; }).join('');

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
  function trashSvg(){ return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'; }

  function renderFixed(){
    var list = document.getElementById('fixedList');
    if(!list) return;
    var items = state.fixed;
    if(items === null){
      list.innerHTML = '<div class="empty">Carregando…</div>';
      return;
    }
    if(items.length === 0){
      list.innerHTML = '<div class="empty"><div class="big">Nenhuma tarefa fixa ainda</div>Adicione as rotinas que se repetem todo dia.</div>';
      return;
    }
    var today = todayStr();
    list.innerHTML = items.map(function(it){
      var done = it.lastDone === today;
      var empStr = (it.empresa ? esc(it.empresa) : '') + (it.codigo ? ' (' + esc(it.codigo) + ')' : '');
      var dueHtml = it.dueDate ? '<span class="due" style="font-weight:600">Entrega: ' + fmtDate(it.dueDate) + '</span>' : '';
      var doneHtml = (done && it.lastDone) ? '<span class="tag tipo-melhoria">Concluído em ' + fmtDate(it.lastDone) + '</span>' : '';

      return '<div class="fixed-item'+(done?' done':'')+'" data-id="'+it.id+'">'+
        '<button class="check'+(done?' on':'')+'" data-act="toggleFixed" data-id="'+it.id+'" aria-label="Concluir">'+(done?checkSvg():'')+'</button>'+
        '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px">'+
          '<span class="title">'+esc(it.title)+'</span>'+
          '<div style="display:flex;gap:8px;align-items:center;font-size:12px;color:var(--fg-muted);flex-wrap:wrap">'+
            (empStr ? '<span class="tag modulo">'+empStr+'</span>' : '')+
            dueHtml+
            doneHtml+
          '</div>'+
        '</div>'+
        '<span class="tag '+CAT_CLASS[it.category]+'">'+CAT_LABEL[it.category]+'</span>'+
        '<button class="icon-btn" data-act="delFixed" data-id="'+it.id+'" title="Remover">'+trashSvg()+'</button>'+
      '</div>';
    }).join('');
  }

  function taskCardHtml(t, today){
    var late = !t.done && t.dueDate && t.dueDate < today;
    var isToday = !t.done && t.dueDate === today;
    var cls = 'task-card pri-'+t.priority + (late?' late':'') + (isToday?' today':'');
    var dueHtml = t.dueDate ? '<span class="due'+(late?' late':'')+'">Entrega: '+fmtDate(t.dueDate)+'</span>' : '<span>sem prazo</span>';
    var empStr = (t.empresa ? esc(t.empresa) : '') + (t.codigo ? ' (' + esc(t.codigo) + ')' : '');
    var completedHtml = (t.done && t.completedAt) ? '<span class="tag tipo-melhoria">Concluído em ' + fmtDate(t.completedAt) + '</span>' : '';

    return '<div class="'+cls+'" data-id="'+t.id+'">'+
      '<button class="check'+(t.done?' on':'')+'" data-act="toggleTask" data-id="'+t.id+'" aria-label="Concluir">'+(t.done?checkSvg():'')+'</button>'+
      '<div class="body">'+
        '<div class="title">'+esc(t.title)+'</div>'+
        '<div class="meta">'+
          '<span class="pri-dot"></span>'+
          dueHtml+
          (empStr ? '<span class="tag modulo">'+empStr+'</span>' : '')+
          '<span class="tag '+CAT_CLASS[t.category]+'">'+CAT_LABEL[t.category]+'</span>'+
          completedHtml+
        '</div>'+
      '</div>'+
      '<div class="actions"><button class="icon-btn" data-act="delTask" data-id="'+t.id+'" title="Remover">'+trashSvg()+'</button></div>'+
    '</div>';
  }

  function renderTasks(){
    var el = document.getElementById('taskGroups');
    if(!el) return;
    var tasks = state.tasks;
    if(tasks === null){ el.innerHTML = '<div class="empty">Carregando…</div>'; return; }
    if(tasks.length === 0){
      el.innerHTML = '<div class="empty"><div class="big">Nenhuma tarefa avulsa</div>Use o campo acima para registrar uma demanda assim que ela surgir, antes de esquecer.</div>';
      return;
    }
    var today = todayStr();
    var open = tasks.filter(function(t){ return !t.done; });
    var done = tasks.filter(function(t){ return t.done; });
    var late = open.filter(function(t){ return t.dueDate && t.dueDate < today; });
    var dueToday = open.filter(function(t){ return t.dueDate === today; });
    var upcoming = open.filter(function(t){ return t.dueDate && t.dueDate > today; }).sort(function(a,b){ return a.dueDate < b.dueDate ? -1 : 1; });
    var noDate = open.filter(function(t){ return !t.dueDate; });

    function group(label, arr, lateClass){
      if(arr.length===0) return '';
      return '<div class="group">'+
        '<div class="group-head'+(lateClass?' late':'')+'"><span class="label">'+label+'</span><span class="count">'+arr.length+'</span><span class="bar"></span></div>'+
        arr.map(function(t){ return taskCardHtml(t, today); }).join('') +
      '</div>';
    }

    var html = '';
    html += group('Atrasadas', late, true);
    html += group('Hoje', dueToday, false);
    html += group('Próximos dias', upcoming, false);
    html += group('Sem prazo', noDate, false);

    if(done.length){
      html += '<details class="collapsible"><summary>Concluídas ('+done.length+')</summary>'+
        done.map(function(t){ return taskCardHtml(t, today); }).join('') +
      '</details>';
    }
    el.innerHTML = html || '<div class="empty">Tudo em dia por aqui.</div>';
  }

  function ticketCardHtml(t, today){
    var alert = t.status !== 'fechado' && t.nextFollowUp && t.nextFollowUp <= today;
    var html = '<div class="ticket'+(alert?' due-alert':'')+'" data-id="'+t.id+'">';
    if(alert) html += '<span class="chip-alert">Cobrar hoje</span>';
    html += '<div class="row1"><div><div class="client">'+esc(t.client)+'</div><div class="subject">'+esc(t.subject)+'</div></div></div>';
    html += '<div style="display:flex;gap:6px;flex-wrap:wrap">'+
      (t.tipo ? '<span class="tag tipo-'+t.tipo+'">'+TIPO_LABEL[t.tipo]+'</span>' : '') +
      (t.modulo ? '<span class="tag modulo">'+esc(t.modulo)+'</span>' : '') +
      (t.assignee ? '<span class="tag assignee">'+esc(ASSIGNEE_LABEL[t.assignee]||t.assignee)+'</span>' : '') +
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
    renderFixed();
    renderTasks();
    renderLanes();
    renderImplantacoes();
    var hintEl = document.getElementById('hint');
    if(hintEl){
      var loaded = state.fixed !== null && state.tasks !== null && state.tickets !== null && state.implantacoes !== null;
      hintEl.textContent = loaded ? 'Seus dados ficam salvos automaticamente neste sistema.' : 'Carregando seus dados…';
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

  function addFixed(){
    var el = document.getElementById('fixedTitle');
    if(!el) return;
    var title = el.value.trim();
    if(!title) return;
    var cat = document.getElementById('fixedCat').value;
    var empresa = (document.getElementById('fixedEmpresa') ? document.getElementById('fixedEmpresa').value.trim() : "") || null;
    var codigo = (document.getElementById('fixedCodigo') ? document.getElementById('fixedCodigo').value.trim() : "") || null;
    var due = (document.getElementById('fixedDue') ? document.getElementById('fixedDue').value : "") || null;

    getStorage().collection('tasks_fixed').doc(uid()).set({
      title: title,
      category: cat,
      empresa: empresa,
      codigo: codigo,
      dueDate: due,
      lastDone: null,
      createdAt: Date.now()
    });

    el.value = '';
    if(document.getElementById('fixedEmpresa')) document.getElementById('fixedEmpresa').value = '';
    if(document.getElementById('fixedCodigo')) document.getElementById('fixedCodigo').value = '';
    if(document.getElementById('fixedDue')) document.getElementById('fixedDue').value = '';
  }

  function addTask(){
    var el = document.getElementById('taskTitle');
    if(!el) return;
    var title = el.value.trim();
    if(!title) return;
    var cat = document.getElementById('taskCat').value;
    var due = document.getElementById('taskDue').value || null;
    var pri = document.getElementById('taskPri').value;
    var empresa = (document.getElementById('taskEmpresa') ? document.getElementById('taskEmpresa').value.trim() : "") || null;
    var codigo = (document.getElementById('taskCodigo') ? document.getElementById('taskCodigo').value.trim() : "") || null;

    getStorage().collection('tasks_oneoff').doc(uid()).set({
      title: title,
      category: cat,
      dueDate: due,
      priority: pri,
      empresa: empresa,
      codigo: codigo,
      done: false,
      completedAt: null,
      createdAt: Date.now()
    });

    el.value = '';
    if(document.getElementById('taskEmpresa')) document.getElementById('taskEmpresa').value = '';
    if(document.getElementById('taskCodigo')) document.getElementById('taskCodigo').value = '';
    document.getElementById('taskDue').value = '';
  }

  var editingTicketId = null;
  function openTicketPanel(id){
    editingTicketId = id || null;
    var t = id ? (state.tickets||[]).find(function(x){ return x.id===id; }) : null;
    document.getElementById('ticketPanelTitle').textContent = t ? 'Editar chamado' : 'Novo chamado';
    document.getElementById('t_client').value = t ? t.client : '';
    document.getElementById('t_subject').value = t ? t.subject : '';
    document.getElementById('t_tipo').value = t ? (t.tipo||'falha') : 'falha';
    document.getElementById('t_modulo').value = t ? (t.modulo||'') : '';
    document.getElementById('t_assignee').value = t ? (t.assignee||'') : '';
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
    document.addEventListener('click', function(e){
      var b = e.target.closest('[data-act]');
      if(!b) return;
      var act = b.dataset.act, id = b.dataset.id;
      if(act === 'toggleFixed'){
        var it = (state.fixed||[]).find(function(x){ return x.id===id; });
        var today = todayStr();
        var isDone = (it && it.lastDone === today);
        getStorage().collection('tasks_fixed').doc(id).update({ lastDone: isDone ? null : today });
      } else if(act === 'delFixed'){
        getStorage().collection('tasks_fixed').doc(id).delete();
      } else if(act === 'toggleTask'){
        var t = (state.tasks||[]).find(function(x){ return x.id===id; });
        var nowDone = !(t && t.done);
        getStorage().collection('tasks_oneoff').doc(id).update({
          done: nowDone,
          completedAt: nowDone ? todayStr() : null
        });
      } else if(act === 'delTask'){
        getStorage().collection('tasks_oneoff').doc(id).delete();
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

    var addFixedBtn = document.getElementById('addFixedBtn');
    if(addFixedBtn) addFixedBtn.addEventListener('click', addFixed);

    ['fixedTitle', 'fixedEmpresa', 'fixedCodigo'].forEach(function(id){
      var input = document.getElementById(id);
      if(input) input.addEventListener('keydown', function(e){ if(e.key==='Enter') addFixed(); });
    });

    var addTaskBtn = document.getElementById('addTaskBtn');
    if(addTaskBtn) addTaskBtn.addEventListener('click', addTask);

    ['taskTitle', 'taskEmpresa', 'taskCodigo'].forEach(function(id){
      var input = document.getElementById(id);
      if(input) input.addEventListener('keydown', function(e){ if(e.key==='Enter') addTask(); });
    });

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

    var moduloSel = document.getElementById('t_modulo');
    if(moduloSel) moduloSel.innerHTML = '<option value="">Selecione…</option>' + modulosOptionsHtml;

    applyTab();
  }

  function initLocalStorageFallback(){
    state.fixed = LocalStore.get('tasks_fixed');
    state.tasks = LocalStore.get('tasks_oneoff');
    state.tickets = LocalStore.get('tickets');
    state.implantacoes = LocalStore.get('implantacoes');
    renderAll();
  }

  function start(){
    setupEvents();
    if(window.claude && window.claude.use){
      Promise.all([window.claude.use('db'), window.claude.use('user')]).then(function(res){
        db = res[0]; userNS = res[1];
        if(!db){ initLocalStorageFallback(); return; }

        db.collection('tasks_fixed').onSnapshot(function(snap){
          state.fixed = snap.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); })
            .sort(function(a,b){ return (a.createdAt||0) - (b.createdAt||0); });
          renderAll();
        }, function(){ initLocalStorageFallback(); });

        db.collection('tasks_oneoff').onSnapshot(function(snap){
          state.tasks = snap.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); })
            .sort(function(a,b){ return (a.createdAt||0) - (b.createdAt||0); });
          renderAll();
        }, function(){ initLocalStorageFallback(); });

        db.collection('tickets').onSnapshot(function(snap){
          state.tickets = snap.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); })
            .sort(function(a,b){ return (b.createdAt||0) - (a.createdAt||0); });
          renderAll();
        }, function(){ initLocalStorageFallback(); });

        db.collection('implantacoes').onSnapshot(function(snap){
          state.implantacoes = snap.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); })
            .sort(function(a,b){ return (b.createdAt||0) - (a.createdAt||0); });
          renderAll();
        }, function(){ initLocalStorageFallback(); });
      }).catch(function(){
        initLocalStorageFallback();
      });
    } else {
      initLocalStorageFallback();
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();