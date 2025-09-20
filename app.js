(function () {
    // ===== Helpers =====
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
    const toast = $("#toast");
    const notify = t => { toast.textContent = t; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 1800); };
    const norm = s => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const UID = () => (crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8); return v.toString(16) }));
    const digits = s => String(s || '').replace(/\D/g, '');

    // ===== Storage (LS → Mem) =====
    const Mem = { s: {}, get: k => Mem.s[k], set: (k, v) => Mem.s[k] = v, del: k => delete Mem.s[k] };
    function hasLocal() { try { const k = '__t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch { return false; } }
    const useLocal = hasLocal();
    const DB = { get: k => useLocal ? localStorage.getItem(k) : Mem.get(k), set: (k, v) => useLocal ? localStorage.setItem(k, v) : Mem.set(k, v), del: k => useLocal ? localStorage.removeItem(k) : Mem.del(k) };
    const K = { USERS: 'up_users_v1', SESSION: 'up_session_v1', CLIENTS: 'up_clients_v1', ORCS: 'up_orcs_v1', SALES: 'up_sales_v1', PRODS: 'up_prods_v1' };
    $("#storeMode").textContent = 'Armazenamento: ' + (useLocal ? 'localStorage (persistente)' : 'memória (temporário)');

    // ===== Data helpers =====
    const getUsers = () => { try { return JSON.parse(DB.get(K.USERS) || '[]') } catch { return [] } };
    const saveUsers = v => DB.set(K.USERS, JSON.stringify(v));
    const getClients = () => { try { return JSON.parse(DB.get(K.CLIENTS) || '[]') } catch { return [] } };
    const saveClients = v => DB.set(K.CLIENTS, JSON.stringify(v));
    const getOrcs = () => { try { return JSON.parse(DB.get(K.ORCS) || '[]') } catch { return [] } };
    const saveOrcs = v => DB.set(K.ORCS, JSON.stringify(v));
    const getSales = () => { try { return JSON.parse(DB.get(K.SALES) || '[]') } catch { return [] } };
    const saveSales = v => DB.set(K.SALES, JSON.stringify(v));
    const getProds = () => { try { return JSON.parse(DB.get(K.PRODS) || '[]') } catch { return [] } };
    const saveProds = v => DB.set(K.PRODS, JSON.stringify(v));
    const getSession = () => { try { return JSON.parse(DB.get(K.SESSION) || 'null') } catch { return null } };
    const setSession = s => DB.set(K.SESSION, JSON.stringify(s));
    const clearSession = () => DB.del(K.SESSION);

    // ===== Seeds =====
    (function seed() {
        if (!getUsers().length) {
            saveUsers([{ id: UID(), name: 'Administrador', email: 'admin@smart', pass: '123456', role: 'admin' }]);
        }
        if (!getClients().length) {
            saveClients([{ id: UID(), name: 'Empresa Demo LTDA', email: 'contato@demo.com.br', cnpj: '12.345.678/0001-95' }]);
        }
        if (!getOrcs().length) {
            saveOrcs([{ id: UID(), num: 1023, cliente: 'Empresa Demo LTDA', total: 1299.90, status: 'Aberto', itens: [{ prod: 'Tela iPhone', q: 1, v: 1299.90 }], criadoEm: Date.now() }]);
        }
        if (!getSales().length) { saveSales([]); }
        if (!getProds().length) {
            saveProds([
                { id: UID(), sku: 'CABO-USBC-1M', desc: 'Cabo USB-C 1m', preco: 29.90, estoque: 25 },
                { id: UID(), sku: 'CARREG-20W', desc: 'Carregador 20W', preco: 79.90, estoque: 12 }
            ]);
        }
    })();

    // ===== Código automático/aleatório para produtos =====
    function nextProdCode(list) {
        const max = list.reduce((m, p) => Math.max(m, Number(p.cod || 0)), 1000);
        return max + 1;
    }
    function genRandomCode(list) {
        const usados = new Set(list.map(p => String(p.cod)));
        for (let i = 0; i < 10000; i++) {
            const r = Math.floor(1000 + Math.random() * 900000);
            if (!usados.has(String(r))) return r;
        }
        return nextProdCode(list);
    }
    (function migrateProdCodes() {
        const list = getProds();
        let changed = false;
        let baseMax = list.reduce((m, p) => Math.max(m, Number(p.cod || 0)), 1000);
        for (const p of list) {
            if (!p.cod) { baseMax += 1; p.cod = baseMax; changed = true; }
        }
        if (changed) saveProds(list);
    })();

    // ===== CNPJ =====
    function maskCNPJ(v) {
        v = digits(v).slice(0, 14);
        return v.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
    }
    function isValidCNPJ(cnpj) {
        let v = digits(cnpj); if (!v || v.length !== 14) return false; if (/^(\d)\1{13}$/.test(v)) return false;
        let len = 12, nums = v.substring(0, len), digs = v.substring(len), sum = 0, pos = len - 7;
        for (let i = len; i >= 1; i--) { sum += nums.charAt(len - i) * pos--; if (pos < 2) pos = 9; }
        let r = (sum % 11 < 2) ? 0 : 11 - (sum % 11); if (r != digs.charAt(0)) return false;
        len = 13; nums = v.substring(0, len); sum = 0; pos = len - 7;
        for (let i = len; i >= 1; i--) { sum += nums.charAt(len - i) * pos--; if (pos < 2) pos = 9; }
        r = (sum % 11 < 2) ? 0 : 11 - (sum % 11); return (r == digs.charAt(1));
    }

    // ===== Auth =====
    function login(email, pass) {
        const e = norm(email), p = String(pass || '');
        const u = getUsers().find(x => norm(x.email) === e && x.pass === p);
        return u ? ({ uid: u.id, name: u.name, email: u.email, role: u.role, ts: Date.now() }) : null;
    }
    function registerCliente({ name, email, pass, cnpj }) {
        if (!isValidCNPJ(cnpj)) throw new Error('CNPJ inválido.');
        const users = getUsers(); const e = norm(email);
        if (users.some(u => norm(u.email) === e)) throw new Error('E-mail já cadastrado.');
        users.push({ id: UID(), name, email: e, pass: String(pass), role: 'cliente' }); saveUsers(users);
        const clients = getClients(); clients.push({ id: UID(), name, email: e, cnpj: maskCNPJ(cnpj) }); saveClients(clients);
    }

    // ===== UI por Role =====
    function applyRole(role) {
        $$('.menubar .dropdown').forEach(d => {
            const roles = (d.getAttribute('data-roles') || '').split(/\s+/).filter(Boolean);
            d.classList.toggle('hidden', roles.length && !roles.includes(role));
        });
        $$('.submenu a').forEach(a => {
            const roles = (a.getAttribute('data-roles') || a.dataset.roles || '').split(/\s+/).filter(Boolean);
            a.classList.toggle('hidden', roles.length && !roles.includes(role));
        });
    }
    function ensureUI() {
        const s = getSession();
        const auth = $("#auth"), userBox = $("#userBox"), btnLogin = $("#btnLogin");
        if (!s) { auth.classList.remove('hidden'); userBox.classList.add('hidden'); btnLogin.classList.add('hidden'); return; }
        auth.classList.add('hidden'); userBox.classList.remove('hidden'); btnLogin.classList.add('hidden');
        $("#avatar").textContent = (s.name?.[0] || '?').toUpperCase();
        $("#userInfo").textContent = `${s.name} • ${s.email} • ${s.role}`;
        applyRole(s.role);
    }

    // ===== Busca / Topo =====
    const dlg = $("#searchModal"), ipt = $("#searchInput"), res = $("#searchResults");
    function openSearch() { if (dlg?.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); setTimeout(() => ipt.focus(), 80); }
    function closeSearch() { if (dlg?.close) dlg.close(); else dlg.removeAttribute("open"); }
    $("#btnSearch").addEventListener("click", openSearch);
    document.addEventListener("keydown", e => {
        if (e.key === "/") { e.preventDefault(); openSearch(); }
        if (e.key === "Escape" && dlg?.open) { closeSearch(); }
        if (e.key === "g") { window._gPressed = true; setTimeout(() => window._gPressed = false, 700); }
        if (window._gPressed && e.key.toLowerCase() === "c") { e.preventDefault(); route('clientes'); }
        if (window._gPressed && e.key.toLowerCase() === "o") { e.preventDefault(); route('orcamentos'); }
    });
    ipt.addEventListener("input", e => {
        const q = e.target.value.toLowerCase().trim(); if (!q) { res.textContent = ''; return; }
        const base = [
            ...getClients().map(c => `Cliente: ${c.name} (${c.cnpj || 's/ CNPJ'})`),
            ...getProds().map(p => `Produto: ${p.desc} (SKU ${p.sku}, Cód ${p.cod}) • R$ ${Number(p.preco || 0).toFixed(2)}`),
            ...getOrcs().map(o => `Orçamento #${o.num} • ${o.cliente} • R$ ${o.total.toFixed(2)}`),
            ...getSales().map(s => `Venda #${s.num} • ${s.cliente} • R$ ${s.total.toFixed(2)}`)
        ];
        const found = base.filter(t => t.toLowerCase().includes(q));
        res.innerHTML = found.length ? 'Resultados:<br>• ' + found.join('<br>• ') : 'Nada encontrado…';
    });
    $("#btnBell").addEventListener("click", () => notify("Você tem novas notificações"));
    $("#btnDocs").addEventListener("click", () => { route('documentos'); notify('Abrindo documentos…'); });
    $("#btnPrint").addEventListener("click", () => window.print());
    $("#btnLogin").addEventListener("click", () => $("#auth").classList.remove('hidden'));
    $("#logoutBtn").addEventListener("click", () => { clearSession(); notify('Sessão encerrada.'); ensureUI(); });

    // ===== KPIs fake =====
    const rnd = (a, b) => (Math.random() * (b - a) + a) | 0;
    setInterval(() => { $("#k1").textContent = 'R$ ' + rnd(1200, 4200); $("#k2").textContent = rnd(3, 18); $("#k3").textContent = rnd(1, 12); $("#k4").textContent = rnd(5, 28) + ' SKUs'; }, 3200);

    // ===== Views =====
    const V = {
        clientes: () => {
            const cl = getClients(); return `
      <article class="card" style="grid-column:span 12">
        <h3>Clientes</h3>
        <div class="toolbar">
          <button id="cNew" class="btn">Novo cliente (CNPJ)</button>
          <input id="cSearch" placeholder="Buscar por nome, e-mail ou CNPJ" style="flex:1;padding:10px;border:1px solid var(--border);border-radius:10px"/>
          <button id="cExport" class="btn ghost">Exportar JSON</button>
          <label for="cImport" class="btn ghost" style="cursor:pointer">Importar JSON<input id="cImport" type="file" accept="application/json" style="display:none"></label>
        </div>
        <div style="overflow:auto;border:1px solid var(--border);border-radius:12px">
          <table>
            <thead><tr><th>Razão Social</th><th>E-mail</th><th>CNPJ</th><th style="width:160px">Ações</th></tr></thead>
            <tbody id="cBody">
              ${cl.map(c => `
              <tr data-id="${c.id}">
                <td>${c.name}</td><td>${c.email}</td><td>${c.cnpj || '-'}</td>
                <td>
                  <button class="btn ghost" data-act="edit">Editar</button>
                  <button class="btn bad" data-act="del">Excluir</button>
                </td>
              </tr>`).join('') || `<tr><td colspan="4" class="muted">Nenhum cliente.</td></tr>`}
            </tbody>
          </table>
        </div>
      </article>`;
        },

        produtos: () => {
            const ps = getProds(); return `
      <article class="card" style="grid-column:span 12">
        <h3>Produtos</h3>
        <div class="toolbar">
          <button id="pNew" class="btn">Novo item</button>
          <input id="pSearch" placeholder="Buscar por descrição, SKU ou código" style="flex:1;padding:10px;border:1px solid var(--border);border-radius:10px"/>
          <button id="pExport" class="btn ghost">Exportar JSON</button>
          <label class="btn ghost" style="cursor:pointer">Importar JSON
            <input id="pImport" type="file" accept="application/json" style="display:none">
          </label>
        </div>
        <div style="overflow:auto;border:1px solid var(--border);border-radius:12px">
          <table>
            <thead>
              <tr>
                <th style="width:120px">Código</th>
                <th style="width:160px">SKU</th>
                <th>Descrição</th>
                <th style="width:140px">Preço</th>
                <th style="width:120px">Estoque</th>
                <th style="width:200px">Ações</th>
              </tr>
            </thead>
            <tbody id="pGrid">
              ${ps.map(p => `
                <tr data-id="${p.id}">
                  <td>${p.cod}</td>
                  <td>${p.sku}</td>
                  <td>${p.desc}</td>
                  <td>R$ ${Number(p.preco || 0).toFixed(2)}</td>
                  <td>${p.estoque | 0}</td>
                  <td>
                    <button class="btn ghost" data-act="edit">Editar</button>
                    <button class="btn bad" data-act="del">Excluir</button>
                  </td>
                </tr>`).join('') || `<tr><td colspan="6" class="muted">Nenhum item cadastrado.</td></tr>`}
            </tbody>
          </table>
        </div>
      </article>

      <!-- Modal de novo produto (com campo CÓDIGO) -->
      <dialog id="prodDlg" class="search">
        <div class="search-body">
          <h3 style="margin:0 0 8px">Novo produto</h3>
          <div class="grid" style="margin-top:6px">
            <div class="field">
              <label for="pfCod">Código</label>
              <div class="row">
                <input id="pfCod" placeholder="em branco = automático • A = aleatório" style="flex:1;padding:10px;border:1px solid var(--border);border-radius:10px"/>
                <button id="pfGen" class="btn ghost" type="button" style="white-space:nowrap">Gerar</button>
              </div>
              <div class="muted" id="pfCodHint">—</div>
            </div>
            <div class="field"><label for="pfSku">SKU</label><input id="pfSku" placeholder="Ex.: CABO-USBC-1M"/></div>
            <div class="field"><label for="pfDesc">Descrição</label><input id="pfDesc" placeholder="Ex.: Cabo USB-C 1m"/></div>
            <div class="row">
              <div class="field" style="flex:1"><label for="pfPreco">Preço</label><input id="pfPreco" type="number" step="0.01" min="0" value="0"/></div>
              <div class="field" style="flex:1"><label for="pfEst">Estoque</label><input id="pfEst" type="number" step="1" min="0" value="0"/></div>
            </div>
            <div class="row" style="justify-content:flex-end;gap:8px">
              <button id="pfCancel" class="btn ghost" type="button">Cancelar</button>
              <button id="pfSave" class="btn ok" type="button">Salvar</button>
            </div>
          </div>
        </div>
      </dialog>
    `;
        },

        orcamentos: () => {
            const os = getOrcs(); return `
      <article class="card" style="grid-column:span 12">
        <h3>Orçamentos</h3>
        <div class="toolbar">
          <button id="oNew" class="btn">Novo orçamento</button>
          <input id="oSearch" placeholder="Buscar por número ou cliente" style="flex:1;padding:10px;border:1px solid var(--border);border-radius:10px"/>
        </div>
        <div style="overflow:auto;border:1px solid var(--border);border-radius:12px">
          <table>
            <thead><tr><th>#</th><th>Cliente</th><th>Total</th><th>Status</th><th style="width:240px">Ações</th></tr></thead>
            <tbody id="oBody">
              ${os.map(o => `
              <tr data-id="${o.id}">
                <td>${o.num}</td><td>${o.cliente}</td><td>R$ ${o.total.toFixed(2)}</td><td>${o.status}</td>
                <td>
                  <button class="btn ghost" data-act="print">Imprimir</button>
                  <button class="btn ok" data-act="approve">Aprovar</button>
                  <button class="btn bad" data-act="del">Excluir</button>
                </td>
              </tr>`).join('') || `<tr><td colspan="5" class="muted">Nenhum orçamento.</td></tr>`}
            </tbody>
          </table>
        </div>
      </article>`;
        },

        pdv: () => {
            const cs = getClients(); const opts = cs.map(c => `<option value="${c.name}">${c.name}</option>`).join(''); return `
      <article class="card" style="grid-column:span 12">
        <h3>PDV / Balcão</h3>
        <div class="row">
          <label style="flex:2">Cliente<br>
            <select id="pCliente" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:10px">
              ${opts || '<option value="">— cadastre clientes —</option>'}
            </select>
          </label>
          <label style="flex:3">Produto (cód, SKU ou descrição)<br>
            <div class="ac-wrap">
              <input id="pDesc" placeholder="Ex.: 1001 ou CABO-USBC-1M ou 'cabo usb'" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:10px"/>
              <div id="pSug" class="ac-list hidden"></div>
            </div>
          </label>
          <label style="flex:1">Qtd<br>
            <input id="pQtd" type="number" min="1" value="1" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:10px"/>
          </label>
          <label style="flex:1">Preço<br>
            <input id="pPreco" type="number" min="0" step="0.01" value="0" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:10px"/>
          </label>
          <button id="pAdd" class="btn ok" style="align-self:flex-end;height:42px">INCLUIR</button>
        </div>

        <div style="overflow:auto;border:1px solid var(--border);border-radius:12px;margin-top:8px">
          <table>
            <thead><tr><th>Item</th><th style="width:120px">Qtd</th><th style="width:160px">Preço</th><th style="width:120px">Subtotal</th><th style="width:120px">Ações</th></tr></thead>
            <tbody id="pBody"><tr><td colspan="5" class="muted">Inclua itens para iniciar a venda.</td></tr></tbody>
          </table>
        </div>

        <div class="row" style="justify-content:flex-end;margin-top:8px">
          <div class="badge" id="pSel" style="display:none"></div>
          <div class="badge" id="pTotal">Total: R$ 0,00</div>
          <button id="pClear" class="btn ghost">Limpar</button>
          <button id="pFinish" class="btn">Finalizar Venda</button>
        </div>
        <div class="muted">Dicas: digite o <b>código</b> e pressione Enter; use ↑/↓ para navegar nas sugestões e Enter para selecionar.</div>
      </article>`;
        },

        vendas: () => {
            const ss = getSales().slice().sort((a, b) => b.criadoEm - a.criadoEm);
            return `
      <article class="card" style="grid-column:span 12">
        <h3>Vendas</h3>
        <div class="toolbar">
          <input id="sSearch" placeholder="Buscar por #, cliente ou item" style="flex:1;padding:10px;border:1px solid var(--border);border-radius:10px"/>
          <button id="sExport" class="btn ghost">Exportar JSON</button>
        </div>
        <div style="overflow:auto;border:1px solid var(--border);border-radius:12px">
          <table>
            <thead><tr>
              <th style="width:100px">#</th>
              <th>Cliente</th>
              <th style="width:160px">Itens</th>
              <th style="width:140px">Total</th>
              <th style="width:180px">Data</th>
              <th style="width:240px">Ações</th>
            </tr></thead>
            <tbody id="sBody">
              ${ss.map(s => `
                <tr data-id="${s.id}">
                  <td>${s.num}</td>
                  <td>${s.cliente}</td>
                  <td>${s.itens.length}</td>
                  <td>R$ ${Number(s.total).toFixed(2)}</td>
                  <td>${new Date(s.criadoEm).toLocaleString('pt-BR')}</td>
                  <td>
                    <button class="btn ghost" data-act="print">Imprimir</button>
                    <button class="btn ok" data-act="edit">Editar</button>
                    <button class="btn bad" data-act="del">Excluir</button>
                  </td>
                </tr>`).join('') || `<tr><td colspan="6" class="muted">Nenhuma venda concluída.</td></tr>`}
            </tbody>
          </table>
        </div>
      </article>

      <!-- Modal de edição de venda -->
      <dialog id="saleDlg" class="search">
        <div class="search-body">
          <h3 style="margin:0 0 8px">Editar venda <span id="sdNum" class="badge"></span></h3>
          <div id="sdClient" class="muted" style="margin-bottom:8px"></div>

          <div style="overflow:auto;border:1px solid var(--border);border-radius:10px">
            <table>
              <thead><tr>
                <th style="width:90px">Cód</th>
                <th>Descrição</th>
                <th style="width:100px">Qtd</th>
                <th style="width:140px">Preço</th>
                <th style="width:120px">Subtotal</th>
                <th style="width:90px">Ações</th>
              </tr></thead>
              <tbody id="sdBody"></tbody>
            </table>
          </div>

          <div class="row" style="margin-top:8px">
            <input id="sdAddCod" placeholder="Código" style="width:120px;padding:10px;border:1px solid var(--border);border-radius:10px"/>
            <input id="sdAddQtd" type="number" min="1" value="1" style="width:100px;padding:10px;border:1px solid var(--border);border-radius:10px"/>
            <input id="sdAddPreco" type="number" min="0" step="0.01" value="0" style="width:140px;padding:10px;border:1px solid var(--border);border-radius:10px"/>
            <button id="sdAddBtn" class="btn">Adicionar item</button>
            <div id="sdHint" class="muted">Informe o <b>código</b>; se preço 0, uso o preço do produto.</div>
          </div>

          <div class="row" style="justify-content:flex-end;margin-top:10px;gap:8px">
            <div id="sdTotal" class="badge">Total: R$ 0,00</div>
            <button id="sdCancel" class="btn ghost" type="button">Cancelar</button>
            <button id="sdSave" class="btn ok" type="button">Salvar alterações</button>
          </div>
        </div>
      </dialog>`;
        },

        backup: () => `<article class="card" style="grid-column:span 12">
      <h3>Backup</h3>
      <div class="toolbar">
        <button id="bExport" class="btn">Exportar tudo (JSON)</button>
        <label class="btn ghost" style="cursor:pointer">Importar tudo (JSON)<input id="bImport" type="file" accept="application/json" style="display:none"></label>
      </div>
      <p class="muted">Inclui usuários, clientes, produtos, orçamentos e vendas.</p>
    </article>`,

        fornecedores: () => `<article class="card" style="grid-column:span 12"><h3>Fornecedores</h3><p>Gestão de parceiros e prazos.</p></article>`,
        tecnicos: () => `<article class="card" style="grid-column:span 12"><h3>Técnicos</h3><p>Perfis e metas.</p></article>`,
        trocas: () => `<article class="card" style="grid-column:span 12"><h3>Trocas & Devoluções</h3><p>Controle de RMA.</p></article>`,
        catalogo: () => `<article class="card" style="grid-column:span 12"><h3>Catálogo Online</h3><p>Publicar produtos no site.</p></article>`,
        whatsapp: () => `<article class="card" style="grid-column:span 12"><h3>WhatsApp Vendas</h3><p>Atalhos e templates.</p></article>`,
        relatorios: () => `<article class="card" style="grid-column:span 12"><h3>Relatórios</h3><p>Gráficos e exportações.</p></article>`,
        config: () => `<article class="card" style="grid-column:span 12"><h3>Configurações</h3><p>Preferências do sistema.</p></article>`,
        documentos: () => `<article class="card" style="grid-column:span 12"><h3>Documentos</h3><p>Notas, recibos e PDFs recentes.</p></article>`
    };

    function route(name) {
        $("#view").innerHTML = V[name] ? V[name]() : V.documentos();
        if (name === 'clientes') bindClientes();
        if (name === 'orcamentos') bindOrcs();
        if (name === 'pdv') bindPDV();
        if (name === 'backup') bindBackup();
        if (name === 'produtos') bindProdutos();
        if (name === 'vendas') bindVendas();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    $$(".submenu a").forEach(a => a.addEventListener("click", e => { e.preventDefault(); route(a.dataset.view); notify('Abrindo: ' + a.textContent.trim()); }));

    // ===== Clientes =====
    function bindClientes() {
        var tbody = $("#cBody");
        var cNew = $("#cNew");
        var cSearch = $("#cSearch");
        var cExport = $("#cExport");
        var cImport = $("#cImport");

        // ===== Helpers =====
        function dBounce(fn, ms) { var t = null; return function () { clearTimeout(t); var a = arguments, ctx = this; t = setTimeout(function () { fn.apply(ctx, a); }, ms || 150); }; }
        function emailKey(e) { return norm(e); }
        function looksLikeEmail(e) { e = String(e || "").trim(); return e.indexOf("@") > 0 && e.indexOf(" ") < 0 && e.lastIndexOf("@") < e.length - 1; }
        function strictEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim()); }
        function digits(s) { return String(s || "").replace(/\D/g, ""); }

        // CPF/CNPJ (usa isValidCNPJ/maskCNPJ globais já existentes)
        function maskCPF(v) {
            v = String(v || "").replace(/\D/g, "").slice(0, 11);
            return v.replace(/^(\d{3})(\d)/, "$1.$2")
                .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
                .replace(/\.(\d{3})(\d)/, ".$1-$2");
        }
        function isValidCPF(cpf) {
            var v = String(cpf || "").replace(/\D/g, "");
            if (v.length !== 11 || /^(\d)\1{10}$/.test(v)) return false;
            var s = 0, r, i; for (i = 1; i <= 9; i++) s += parseInt(v.substring(i - 1, i), 10) * (11 - i);
            r = (s * 10) % 11; if (r === 10 || r === 11) r = 0; if (r !== parseInt(v.substring(9, 10), 10)) return false;
            s = 0; for (i = 1; i <= 10; i++) s += parseInt(v.substring(i - 1, i), 10) * (12 - i);
            r = (s * 10) % 11; if (r === 10 || r === 11) r = 0; return r === parseInt(v.substring(10, 11), 10);
        }

        function lowerKeys(obj) {
            var out = {}, k;
            if (!obj || typeof obj !== 'object') return out;
            for (k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) out[String(k).toLowerCase().trim()] = obj[k]; }
            return out;
        }

        // ---------- PICKERS reforçados ----------
        function pickName(row) {
            var r = lowerKeys(row);
            var direct = (r.name || r.nome || r["razão social"] || r["razao social"] || r.razao_social || r.razao || r.fantasia || r.empresa || r.cliente || "").toString().trim();
            if (direct) return direct;

            // fallback: tente colunas genéricas quando houver cabeçalho mapeado (ex.: "column2":"SMART...", "header_column2":"nome")
            // se a própria linha já estiver com rótulos convertidos (ex.: "Nome": "João"), o bloco acima já teria pegado.
            // aqui tentamos heurísticas:
            var best = "";
            Object.keys(r).forEach(function (k) {
                if (!r[k]) return;
                // nomes costumam ser strings com letras, e chaves que contenham "nome", "razão", "fantasia", "cliente"
                if (/(nome|raz[aã]o|fantasia|cliente)/i.test(k)) best = String(r[k]).trim();
            });
            if (best) return best;

            // última tentativa: escolha a maior string alfabética (evita números/códigos)
            var candidate = "";
            Object.keys(r).forEach(function (k) {
                var v = String(r[k] || "").trim();
                if (v && /[A-Za-zÀ-ú]/.test(v) && v.length > candidate.length) candidate = v;
            });
            return candidate;
        }
        function pickEmail(row) {
            var r = lowerKeys(row);
            var e = (r.email || r["e-mail"] || r.mail || r.contato || r["e mail"] || "").toString().trim();
            if (e) return e;
            // varre chaves para achar algo com @
            for (var k in r) { if (!Object.prototype.hasOwnProperty.call(r, k)) continue; var v = String(r[k] || "").trim(); if (/@/.test(v)) return v; }
            return "";
        }
        function pickPhone(row) {
            var r = lowerKeys(row);
            var e = (r.telefone || r["telefone 1"] || r["telefone1"] || r.celular || r.whatsapp || r.phone || r.tel || r["whats"] || r["cel"] || "").toString().trim();
            if (e) return e;
            // varre chaves sugestivas
            for (var k in r) {
                if (!Object.prototype.hasOwnProperty.call(r, k)) continue;
                if (/(tel|fone|cel|whats|whatsapp|telefone|cell|phone)/i.test(k)) {
                    var v = String(r[k] || "").trim(); if (digits(v).length >= 8) return v;
                }
            }
            return "";
        }
        function pickDocRaw(row) {
            var r = lowerKeys(row);
            var direct = (r.cnpj || r.cpf || r.doc || r.documento || r.document || r.taxid || r.inscricao || r["cnpj/cpf"] || "").toString().trim();
            if (direct) return direct;

            // varre chaves para achar cpf/cnpj dentro de nomes compostos
            for (var k in r) {
                if (!Object.prototype.hasOwnProperty.call(r, k)) continue;
                if (/(cnpj|cpf|documento|doc|taxid|inscri[çc][aã]o)/i.test(k)) {
                    var v = String(r[k] || "").trim();
                    var dg = digits(v);
                    if (dg.length === 11 || dg.length === 14) return v;
                }
            }
            return "";
        }
        function normalizeDoc(doc) {
            var only = String(doc || "").replace(/\D/g, "");
            if (only.length === 14 && isValidCNPJ(only)) return { key: "cnpj", masked: maskCNPJ(only), digits: only };
            if (only.length === 11 && isValidCPF(only)) return { key: "cpf", masked: maskCPF(only), digits: only };
            return null;
        }

        // ===== Busca (debounce) =====
        if (cSearch) {
            cSearch.addEventListener('input', dBounce(function (e) {
                var q = norm(e.target.value);
                $$("tbody#cBody tr").forEach(function (tr) {
                    var txt = norm(tr.textContent);
                    tr.style.display = txt.indexOf(q) >= 0 ? '' : 'none';
                });
            }, 120));
        }

        // ===== Exportar =====
        if (cExport) {
            cExport.addEventListener('click', function () {
                var blob = new Blob([JSON.stringify({ clients: getClients() }, null, 2)], { type: 'application/json' });
                var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'clientes.json'; a.click(); URL.revokeObjectURL(a.href);
            });
        }

        // ===== Importar JSON / XLS / XLSX / CSV =====
        if (cImport) {
            cImport.addEventListener('change', function (e) {
                var f = e.target && e.target.files && e.target.files[0];
                if (!f) return;

                // --- Normalizador: trata JSON "array com cabeçalho na primeira linha"
                function normalizeArrayWithHeaderFirstRow(arr) {
                    if (!Array.isArray(arr) || !arr.length) return arr;

                    var first = arr[0] || {};
                    var fk = Object.keys(first);
                    if (!fk.length) return arr;

                    // Heurística: primeiro objeto "parece" cabeçalho se:
                    // - seus valores são strings curtas e descritivas (ex.: "Nome", "Razão social", "CNPJ/CPF")
                    // - as chaves têm padrão genérico (ex.: "Column2", "Clientes")
                    var headerScore = 0, i;
                    for (i = 0; i < fk.length; i++) {
                        var v = String(first[fk[i]] || "").trim();
                        if (!v) continue;
                        if (v.length <= 30 && /nome|raz[aã]o|cnpj|cpf|documento|email|telefone|whats|cidade|estado|c[óo]digo|codigo/i.test(v)) headerScore++;
                    }
                    var genericKeyScore = fk.filter(function (k) { return /column\d+|^clientes$|^column$/i.test(k); }).length;

                    // se bater os dois critérios, converte
                    if (headerScore >= Math.max(2, Math.ceil(fk.length * 0.2)) && genericKeyScore >= 1) {
                        // monta mapa: "Column5" -> "CNPJ/CPF" (em lower)
                        var map = {};
                        fk.forEach(function (k) {
                            var label = String(first[k] || "").trim();
                            if (label) map[k] = label; // manter com acento; pickers usam lowerKeys nos objetos finais
                        });

                        var out = [];
                        for (i = 1; i < arr.length; i++) {
                            var src = arr[i] || {}, obj = {};
                            Object.keys(src).forEach(function (k) {
                                var nk = map[k] || k; // se não tiver mapeamento, mantém
                                obj[nk] = src[k];
                            });
                            out.push(obj);
                        }
                        return out;
                    }
                    return arr;
                }

                function parseJSON(file) {
                    return file.text().then(function (txt) {
                        var data = {};
                        try { data = JSON.parse(txt || "{}"); } catch (e) { throw new Error("JSON inválido"); }
                        var arr = Array.isArray(data) ? data : (Array.isArray(data.clients) ? data.clients : []);
                        if (!arr.length && data && typeof data === 'object') {
                            // também aceita {data:[...]} ou {registros:[...]}
                            if (Array.isArray(data.data)) arr = data.data;
                            else if (Array.isArray(data.registros)) arr = data.registros;
                        }
                        return normalizeArrayWithHeaderFirstRow(arr);
                    });
                }

                // Tenta SheetJS (robusto) → tenta modo objeto → se falhar, detecta cabeçalho por pontuação
                function parseWithSheetJS(file) {
                    return file.arrayBuffer().then(function (buf) {
                        var wb = XLSX.read(buf, { type: 'array' });
                        var ws = wb.Sheets[wb.SheetNames[0]];
                        if (!ws) throw new Error("Arquivo sem planilhas.");

                        // Tentativa A: objeto direto
                        var asObj = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
                        if (Array.isArray(asObj) && asObj.length) {
                            // Normaliza caso a primeira linha seja cabeçalho-embutido
                            asObj = normalizeArrayWithHeaderFirstRow(asObj);
                            var ok = 0, sample = Math.min(asObj.length, 15), i;
                            for (i = 0; i < sample; i++) {
                                var r = asObj[i];
                                if (pickName(r) || pickEmail(r) || pickDocRaw(r)) ok++;
                            }
                            if (ok > 0) return asObj;
                        }

                        // Tentativa B: header detection (até 200 linhas)
                        var rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
                        var bestIdx = -1, bestScore = -1, i, j;
                        var keys = ["nome", "razão", "razao", "cliente", "email", "e-mail", "cpf", "cnpj", "documento", "doc", "telefone", "whatsapp"];
                        function scoreRow(arr) {
                            var s = 0;
                            var joined = arr.join(" ").toLowerCase();
                            for (var k = 0; k < keys.length; k++) { if (joined.indexOf(keys[k]) > -1) s += 2; }
                            for (var x = 0; x < arr.length; x++) {
                                var cell = String(arr[x] || "");
                                if (/@/.test(cell)) s += 1;
                                var dg = digits(cell);
                                if (dg.length === 11 || dg.length === 14) s += 1;
                            }
                            return s;
                        }
                        var limit = Math.min(rows.length, 200);
                        for (i = 0; i < limit; i++) {
                            var sc = scoreRow(rows[i] || []);
                            if (sc > bestScore) { bestScore = sc; bestIdx = i; }
                        }
                        if (bestIdx < 0) throw new Error("Não foi possível localizar cabeçalho.");

                        var headers = (rows[bestIdx] || []).map(function (h) { return (h == null ? "" : String(h)).trim(); });
                        var out = [], r, c, obj;
                        for (r = bestIdx + 1; r < rows.length; r++) {
                            var line = rows[r] || [];
                            var allEmpty = true;
                            for (c = 0; c < line.length; c++) { if (String(line[c] || "").trim().length) { allEmpty = false; break; } }
                            if (allEmpty) continue;
                            obj = {};
                            for (c = 0; c < headers.length; c++) {
                                var key = headers[c] || ("col_" + c);
                                obj[key] = (line[c] == null ? "" : line[c]);
                            }
                            out.push(obj);
                        }
                        return out;
                    });
                }

                function parseCSVfallback(file) {
                    return file.text().then(function (txt) {
                        var lines = txt.split(/\r?\n/).filter(function (l) { return l.trim().length > 0; });
                        if (!lines.length) return [];
                        var sep = lines[0].indexOf(";") > -1 ? ";" : ",";
                        function splitCSV(line) {
                            var res = [], cur = "", inQ = false, i, ch;
                            for (i = 0; i < line.length; i++) {
                                ch = line[i];
                                if (ch === '\"') { inQ = !inQ; continue; }
                                if (ch === sep && !inQ) { res.push(cur); cur = ""; } else cur += ch;
                            }
                            res.push(cur);
                            return res.map(function (x) { return x.replace(/^\"|\"$/g, "").trim(); });
                        }
                        var headers = splitCSV(lines[0]);
                        var out = [], i, j;
                        for (i = 1; i < lines.length; i++) {
                            var cols = splitCSV(lines[i]); var obj = {};
                            for (j = 0; j < headers.length; j++) { obj[headers[j]] = (cols[j] == null ? "" : cols[j]); }
                            out.push(obj);
                        }
                        return out;
                    });
                }

                function parseFile(file) {
                    var name = String(file.name || "");
                    if (/\.json$/i.test(name)) return parseJSON(file);
                    if (typeof XLSX !== "undefined") return parseWithSheetJS(file);
                    if (/\.csv$/i.test(name)) return parseCSVfallback(file);
                    return Promise.reject(new Error("Formato não suportado sem SheetJS (XLS/XLSX exigem a biblioteca)."));
                }

                parseFile(f).then(function (incoming) {
                    if (!Array.isArray(incoming) || !incoming.length) throw new Error('Nenhum registro encontrado (esperado array, ou {clients:[...]}).');

                    var cur = getClients();

                    // índice de duplicidade
                    var byKey = new Map();
                    var k, ce, cdn, tel, nm;
                    for (k = 0; k < cur.length; k++) {
                        ce = emailKey(cur[k].email || ""); if (ce) byKey.set("email:" + ce, true);
                        cdn = (cur[k].cnpj || cur[k].cpf || "").toString().replace(/\D/g, ""); if (cdn) byKey.set("doc:" + cdn, true);
                        tel = digits(cur[k].telefone || cur[k].celular || cur[k].whatsapp || ""); if (tel.length >= 8) byKey.set("tel:" + tel, true);
                        nm = norm(cur[k].name || ""); if (nm) byKey.set("name:" + nm, true);
                    }

                    var added = 0, dupE = 0, dupD = 0, dupT = 0, dupN = 0, bad = 0, nodoc = 0;

                    for (var i = 0; i < incoming.length; i++) {
                        var row = incoming[i] || {};

                        var name = pickName(row);
                        var emailRaw = pickEmail(row);
                        var phoneRaw = pickPhone(row);
                        var emailOk = looksLikeEmail(emailRaw) ? emailKey(emailRaw) : "";
                        var phoneDigits = digits(phoneRaw);
                        var docInfo = normalizeDoc(pickDocRaw(row));

                        if (!name) { bad++; continue; }

                        var key = "";
                        if (emailOk) key = "email:" + emailOk;
                        else if (docInfo) key = "doc:" + docInfo.digits;
                        else if (phoneDigits.length >= 8) key = "tel:" + phoneDigits;
                        else key = "name:" + norm(name);

                        if (byKey.has(key)) {
                            if (key.indexOf("email:") === 0) dupE++;
                            else if (key.indexOf("doc:") === 0) dupD++;
                            else if (key.indexOf("tel:") === 0) dupT++;
                            else dupN++;
                            continue;
                        }

                        var toPush = { id: UID(), name: name };
                        if (emailOk) toPush.email = emailOk;
                        if (phoneDigits.length >= 8) toPush.telefone = phoneDigits;
                        if (docInfo) { toPush[docInfo.key] = docInfo.masked; } else { nodoc++; }

                        cur.push(toPush);
                        byKey.set(key, true);
                        added++;
                    }

                    saveClients(cur);
                    if (cSearch) cSearch.value = '';
                    notify('Importados: ' + added + ' • dup(email): ' + dupE + ' • dup(doc): ' + dupD + ' • dup(tel): ' + dupT + ' • dup(nome): ' + dupN + ' • inválidos: ' + bad + (nodoc ? (' • sem doc válido: ' + nodoc) : ''));
                    route('clientes');
                }).catch(function (err) {
                    console.error("Import Clientes - detalhe do erro:", err);
                    notify('Erro ao importar: ' + (err && err.message ? err.message : 'erro desconhecido'));
                });

                e.target.value = '';
            });
        }

        // ===== Novo cliente (manual mantém CNPJ obrigatório) =====
        if (cNew) {
            cNew.addEventListener('click', function () {
                var nameIn = prompt('Razão Social:');
                var name = (nameIn === null ? '' : nameIn).trim();
                if (!name) return;

                var emailIn = prompt('E-mail:');
                var email = (emailIn === null ? '' : emailIn).trim();
                if (!email || !strictEmail(email)) { notify('E-mail inválido.'); return; }

                var cnpjIn = prompt('CNPJ (somente números):');
                var cnpj = (cnpjIn === null ? '' : cnpjIn).trim();
                if (!isValidCNPJ(cnpj)) { notify('CNPJ inválido.'); return; }

                var cur = getClients(), i;
                for (i = 0; i < cur.length; i++) {
                    if (emailKey(cur[i].email || '') === emailKey(email)) {
                        notify('E-mail já cadastrado no CLIENTES.');
                        return;
                    }
                }
                cur.push({ id: UID(), name: name, email: emailKey(email), cnpj: maskCNPJ(cnpj) });
                saveClients(cur);
                notify('Cliente incluído.');
                route('clientes');
            });
        }

        // ===== Ações (delegation) =====
        if (tbody) {
            tbody.addEventListener('click', function (ev) {
                var btn = ev.target && ev.target.closest && ev.target.closest('button[data-act]');
                if (!btn) return;

                var act = btn.getAttribute('data-act');
                var tr = btn.closest('tr');
                var id = tr ? tr.getAttribute('data-id') : null;

                var list = getClients();
                var idx = -1, i;
                for (i = 0; i < list.length; i++) { if (list[i].id === id) { idx = i; break; } }
                if (idx < 0) return;

                if (act === 'del') {
                    if (confirm('Excluir este cliente?')) {
                        list.splice(idx, 1);
                        saveClients(list);
                        notify('Excluído.');
                        route('clientes');
                    }
                    return;
                }

                if (act === 'edit') {
                    var c = list[idx];

                    var nameIn = prompt('Razão Social:', c.name);
                    var name = ((nameIn === null ? c.name : nameIn) || '').trim() || c.name;

                    var emailIn = prompt('E-mail:', c.email || '');
                    var email = ((emailIn === null ? (c.email || '') : emailIn) || '').trim();
                    if (email && !strictEmail(email)) { notify('E-mail inválido.'); return; }

                    var cnpjIn = prompt('CNPJ:', c.cnpj || '');
                    var cnpj = ((cnpjIn === null ? (c.cnpj || '') : cnpjIn) || '').trim();
                    if (cnpj && !isValidCNPJ(cnpj)) { notify('CNPJ inválido.'); return; }

                    // evita duplicidade de e-mail ao editar (se houver e-mail)
                    for (i = 0; i < list.length; i++) {
                        if (i !== idx && email && emailKey(list[i].email || '') === emailKey(email)) {
                            notify('Já existe outro cliente com este e-mail.');
                            return;
                        }
                    }

                    var updated = { id: c.id, name: name };
                    if (email) updated.email = emailKey(email);
                    if (cnpj) updated.cnpj = maskCNPJ(cnpj);
                    if (c.cpf) updated.cpf = c.cpf;
                    if (c.telefone) updated.telefone = c.telefone;

                    list[idx] = updated;
                    saveClients(list);
                    notify('Atualizado.');
                    route('clientes');
                }
            });
        }
    }
    // ===== Produtos (CRUD + modal + códigos) =====
    function bindProdutos() {
        const grid = $("#pGrid");
        const btnExport = $("#pExport");
        const inpImport = $("#pImport");
        const btnImportar = $("#btnImportar");

        // ===== renderizar produtos =====
        function renderProds() {
            const list = getProds();
            grid.innerHTML = "";
            list.forEach(p => {
                const tr = document.createElement("tr");
                tr.setAttribute("data-id", p.id);
                tr.innerHTML = `
                <td>${p.cod}</td>
                <td>${p.sku}</td>
                <td>${p.desc}</td>
                <td>R$ ${Number(p.preco).toFixed(2)}</td>
                <td>${p.estoque}</td>
                <td>
                    <button data-act="edit">✏️</button>
                    <button data-act="del">🗑️</button>
                </td>
            `;
                grid.appendChild(tr);
            });
        }

        // ===== normalizador de chave =====
        const normKey = s => String(s || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();

        function rowToProd(row) {
            // converte as chaves em um objeto normalizado
            const map = {};
            for (const k in row) map[normKey(k)] = row[k];

            return {
                cod: parseInt(map["codigo"] || map["cod"] || map["id"] || 0),
                sku: String(map["sku"] || map["referencia"] || map["ref"] || "").trim(),
                desc: String(map["descricao"] || map["nome"] || map["produto"] || "").trim(),
                preco: parseFloat(String(map["preco"] || map["preço"] || map["valor"] || "0").replace(",", ".")) || 0,
                estoque: parseInt(map["estoque"] || map["quantidade"] || map["qtd"] || 0)
            };
        }

        // ===== exportar JSON/CSV =====
        btnExport?.addEventListener("click", () => {
            const list = getProds();
            if (!list.length) { notify("Nenhum produto para exportar."); return; }

            // JSON
            const blobJson = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
            const aJson = document.createElement("a");
            aJson.href = URL.createObjectURL(blobJson);
            aJson.download = "produtos.json";
            aJson.click();

            // CSV
            const headers = ["cod", "sku", "desc", "preco", "estoque"];
            const rows = list.map(p => [
                p.cod,
                `"${p.sku}"`,
                `"${p.desc}"`,
                Number(p.preco).toFixed(2).replace(".", ","),
                p.estoque
            ].join(";"));
            const csv = [headers.join(";"), ...rows].join("\n");
            const blobCsv = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const aCsv = document.createElement("a");
            aCsv.href = URL.createObjectURL(blobCsv);
            aCsv.download = "produtos.csv";
            aCsv.click();

            notify("Produtos exportados com sucesso!");
        });

        // ===== importar =====
        btnImportar?.addEventListener("click", () => inpImport.click());

        inpImport?.addEventListener("change", async e => {
            const f = e.target.files?.[0]; if (!f) return;

            async function parseFile(file) {
                // JSON
                if (/\.json$/i.test(file.name)) {
                    const data = JSON.parse(await file.text());
                    return Array.isArray(data) ? data : data.produtos || [];
                }
                // CSV
                if (/\.csv$/i.test(file.name)) {
                    const text = await file.text();
                    const [header, ...lines] = text.split(/\r?\n/).filter(Boolean);
                    const keys = header.split(/[;,]/);
                    return lines.map(l => {
                        const cols = l.split(/[;,]/);
                        const obj = {};
                        keys.forEach((k, i) => obj[k] = cols[i] || "");
                        return obj;
                    });
                }
                // XLS / XLSX
                if (/\.(xls|xlsx)$/i.test(file.name)) {
                    const buf = await file.arrayBuffer();
                    const wb = XLSX.read(buf, { type: "array" });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    return XLSX.utils.sheet_to_json(ws, { defval: "" });
                }
                throw new Error("Formato não suportado.");
            }

            try {
                const rawRows = await parseFile(f);
                console.log("Arquivo importado:", rawRows); // 🔎 DEBUG
                const cur = getProds();
                let added = 0;

                for (const r of rawRows) {
                    const prod = rowToProd(r);
                    if (!prod.sku || !prod.desc) continue;
                    cur.push({ id: UID(), ...prod });
                    added++;
                }

                saveProds(cur);
                notify(`Importados ${added} produtos.`);
                renderProds();
            } catch (err) {
                console.error("Erro na importação:", err);
                notify("Falha ao importar produtos.");
            }
            e.target.value = ""; // reseta input
        });

        renderProds();
    }

    // ===== Orçamentos =====
    function renderReceipt(o) {
        const itensHTML = o.itens.map(i => `<tr><td>${i.prod}</td><td style="text-align:right">${i.q}</td><td style="text-align:right">R$ ${i.v.toFixed(2)}</td></tr>`).join('');
        return `<div class="receipt">
      <h3 style="margin:0 0 8px">Recibo #${o.num}</h3>
      <div style="font-size:14px;color:#374151">Cliente: <b>${o.cliente}</b> • Status: <b>${o.status}</b></div>
      <table style="width:100%;margin-top:8px;border-collapse:collapse">
        <thead><tr><th style="text-align:left">Item</th><th style="text-align:right">Qtd</th><th style="text-align:right">Valor</th></tr></thead>
        <tbody>${itensHTML}</tbody>
      </table>
      <div style="margin-top:8px;font-weight:800;text-align:right">Total: R$ ${o.total.toFixed(2)}</div>
      <div style="margin-top:8px;font-size:12px;color:#6b7280">Emitido em ${new Date(o.criadoEm).toLocaleString('pt-BR')}</div>
    </div>`;
    }
    function bindOrcs() {
        const tbody = $("#oBody"), oNew = $("#oNew"), oSearch = $("#oSearch");
        oNew?.addEventListener('click', () => {
            const cs = getClients(); if (!cs.length) { notify('Cadastre um cliente primeiro.'); return; }
            const cliente = prompt('Cliente (digite o nome exato):', cs[0].name); if (!cliente) return;
            const prod = prompt('Item/Produto:', 'Serviço técnico'); if (!prod) return;
            const q = Number(prompt('Quantidade:', '1')) || 1;
            const v = Number(prompt('Valor unitário:', '100')) || 100;
            const os = getOrcs(); const num = (Math.max(0, ...os.map(x => x.num || 0)) + 1) || 1000;
            const o = { id: UID(), num, cliente, total: q * v, status: 'Aberto', itens: [{ prod, q, v }], criadoEm: Date.now() };
            os.push(o); saveOrcs(os); notify('Orçamento criado.'); route('orcamentos');
        });
        oSearch?.addEventListener('input', (e) => {
            const q = norm(e.target.value);
            $$("tbody#oBody tr").forEach(tr => {
                const txt = norm(tr.textContent); tr.style.display = txt.includes(q) ? '' : 'none';
            });
        });
        tbody?.querySelectorAll('button[data-act]').forEach(btn => {
            btn.addEventListener('click', () => {
                const act = btn.getAttribute('data-act'), id = btn.closest('tr').getAttribute('data-id');
                const os = getOrcs(); const i = os.findIndex(x => x.id === id); if (i < 0) return;
                if (act === 'del') { if (confirm('Excluir este orçamento?')) { os.splice(i, 1); saveOrcs(os); notify('Excluído.'); route('orcamentos'); } return; }
                if (act === 'approve') { os[i].status = 'Aprovado'; saveOrcs(os); notify('Aprovado.'); route('orcamentos'); return; }
                if (act === 'print') {
                    const wrap = document.createElement('div'); wrap.innerHTML = renderReceipt(os[i]); document.body.appendChild(wrap);
                    window.print(); setTimeout(() => wrap.remove(), 200);
                }
            });
        });
    }

    // ===== Vendas: helpers =====
    function renderSaleReceipt(v) {
        const fmt = n => 'R$ ' + Number(n).toFixed(2).replace('.', ',');
        return `<div class="receipt">
      <h3 style="margin:0 0 8px">Comprovante de Venda #${v.num}</h3>
      <div style="font-size:14px;color:#374151">Cliente: <b>${v.cliente}</b> • Status: <b>${v.status || 'Concluída'}</b></div>
      <table style="width:100%;margin-top:8px;border-collapse:collapse">
        <thead><tr><th style="text-align:left">Item</th><th style="text-align:right">Qtd</th><th style="text-align:right">Valor</th></tr></thead>
        <tbody>${v.itens.map(i => `<tr><td>${i.cod ? `[${i.cod}] ` : ''}${i.desc}</td><td style="text-align:right">${i.q}</td><td style="text-align:right">${fmt(i.p)}</td></tr>`).join('')}</tbody>
      </table>
      <div style="margin-top:8px;font-weight:800;text-align:right">Total: ${fmt(v.total)}</div>
      <div style="margin-top:8px;font-size:12px;color:#6b7280">Emitido em ${new Date(v.criadoEm).toLocaleString('pt-BR')}</div>
    </div>`;
    }
    function recalcSaleTotal(venda) {
        venda.total = venda.itens.reduce((s, i) => s + Number(i.q || 0) * Number(i.p || 0), 0);
        return venda.total;
    }

    // ===== Vendas (listagem/edição) =====
    function bindVendas() {
        const tbody = $("#sBody"), sSearch = $("#sSearch"), sExport = $("#sExport");
        const dlg = $("#saleDlg"), sdNum = $("#sdNum"), sdClient = $("#sdClient"), sdBody = $("#sdBody"), sdTotal = $("#sdTotal");
        const sdAddCod = $("#sdAddCod"), sdAddQtd = $("#sdAddQtd"), sdAddPreco = $("#sdAddPreco"), sdAddBtn = $("#sdAddBtn");
        const sdCancel = $("#sdCancel"), sdSave = $("#sdSave");

        let current = null; let original = null;
        const fmt = n => 'R$ ' + Number(n).toFixed(2).replace('.', ',');

        function openDlg(venda) {
            original = JSON.parse(JSON.stringify(venda));
            current = JSON.parse(JSON.stringify(venda));
            sdNum.textContent = '#' + current.num;
            sdClient.textContent = `Cliente: ${current.cliente}`;
            renderItems();
            dlg?.showModal?.();
        }
        function closeDlg() { try { dlg?.close?.(); } catch { } current = null; original = null; }

        function renderItems() {
            if (!current.itens.length) {
                sdBody.innerHTML = `<tr><td colspan="6" class="muted">Sem itens. Adicione abaixo.</td></tr>`;
            } else {
                sdBody.innerHTML = current.itens.map((i, idx) => `
          <tr>
            <td>${i.cod || '-'}</td>
            <td>${i.desc}</td>
            <td><input data-i="${idx}" data-f="q" type="number" min="1" value="${i.q}" style="width:90px;padding:6px;border:1px solid var(--border);border-radius:8px"/></td>
            <td><input data-i="${idx}" data-f="p" type="number" min="0" step="0.01" value="${Number(i.p).toFixed(2)}" style="width:130px;padding:6px;border:1px solid var(--border);border-radius:8px"/></td>
            <td style="text-align:right">${fmt(i.q * i.p)}</td>
            <td><button class="btn bad" data-act="rem" data-i="${idx}">Remover</button></td>
          </tr>`).join('');
                sdBody.querySelectorAll('input[data-f]').forEach(inp => {
                    inp.addEventListener('input', () => {
                        const i = Number(inp.dataset.i), f = inp.dataset.f;
                        let v = f === 'q' ? parseInt(inp.value || 0) : Number(inp.value || 0);
                        if (f === 'q' && v < 1) v = 1;
                        if (f === 'p' && v < 0) v = 0;
                        current.itens[i][f] = v;
                        recalcSaleTotal(current);
                        renderItems();
                    });
                });
                sdBody.querySelectorAll('button[data-act="rem"]').forEach(b => {
                    b.addEventListener('click', () => { const i = Number(b.dataset.i); current.itens.splice(i, 1); recalcSaleTotal(current); renderItems(); });
                });
            }
            recalcSaleTotal(current);
            sdTotal.textContent = `Total: ${fmt(current.total)}`;
        }

        sdAddBtn.addEventListener('click', () => {
            const codRaw = (sdAddCod.value || '').trim();
            if (!codRaw) { notify('Informe o código.'); return; }
            const cod = Number(codRaw.replace(/\D/g, ''));
            const qtd = Number(sdAddQtd.value || 1);
            let prec = Number(sdAddPreco.value || 0);

            const prods = getProds();
            const p = prods.find(x => Number(x.cod) === cod);

            if (p) {
                if (!prec || prec <= 0) prec = Number(p.preco || 0);
                current.itens.push({ cod, desc: p.desc, q: qtd, p: prec });
            } else {
                if (!prec || prec <= 0) { notify('Produto não encontrado — informe um preço.'); return; }
                current.itens.push({ desc: `Item ${cod}`, q: qtd, p: prec });
            }
            sdAddCod.value = ''; sdAddQtd.value = '1'; sdAddPreco.value = '0';
            recalcSaleTotal(current); renderItems();
        });

        sdCancel.addEventListener('click', closeDlg);
        sdSave.addEventListener('click', () => {
            const prods = getProds();
            const sumBy = (arr) => arr.reduce((m, i) => { if (!i.cod) return m; m[i.cod] = (m[i.cod] || 0) + Number(i.q || 0); return m; }, {});
            const oldMap = sumBy(original.itens);
            const newMap = sumBy(current.itens);

            for (const codStr of new Set([...Object.keys(oldMap), ...Object.keys(newMap)])) {
                const cod = Number(codStr);
                const p = prods.find(x => Number(x.cod) === cod);
                if (!p) continue;
                const available = Number(p.estoque || 0) + Number(oldMap[cod] || 0);
                if (Number(newMap[cod] || 0) > available) {
                    notify(`Estoque insuficiente para [${cod}] — disponível ${available}, solicitado ${newMap[cod]}.`);
                    return;
                }
            }
            let changed = false;
            for (const codStr of new Set([...Object.keys(oldMap), ...Object.keys(newMap)])) {
                const cod = Number(codStr);
                const p = prods.find(x => Number(x.cod) === cod);
                if (!p) continue;
                const available = Number(p.estoque || 0) + Number(oldMap[cod] || 0);
                const finalQty = available - Number(newMap[cod] || 0);
                p.estoque = Math.max(0, finalQty);
                changed = true;
            }
            if (changed) saveProds(prods);

            recalcSaleTotal(current);
            const all = getSales();
            const i = all.findIndex(x => x.id === current.id);
            if (i >= 0) { current.atualizadoEm = Date.now(); all[i] = current; saveSales(all); }

            notify('Venda atualizada com sucesso.');
            closeDlg();
            route('vendas');
        });

        sSearch?.addEventListener('input', e => {
            const q = (e.target.value || '').toLowerCase().trim();
            Array.from(tbody?.children || []).forEach(tr => {
                const txt = tr.textContent.toLowerCase();
                tr.style.display = txt.includes(q) ? '' : 'none';
            });
        });

        sExport?.addEventListener('click', () => {
            const blob = new Blob([JSON.stringify({ sales: getSales() }, null, 2)], { type: 'application/json' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'vendas.json'; a.click(); URL.revokeObjectURL(a.href);
        });

        tbody?.querySelectorAll('button[data-act]').forEach(btn => {
            btn.addEventListener('click', () => {
                const act = btn.getAttribute('data-act');
                const id = btn.closest('tr').getAttribute('data-id');
                const all = getSales(); const i = all.findIndex(s => s.id === id); if (i < 0) return;
                if (act === 'print') {
                    const wrap = document.createElement('div'); wrap.innerHTML = renderSaleReceipt(all[i]); document.body.appendChild(wrap);
                    window.print(); setTimeout(() => wrap.remove(), 200);
                    return;
                }
                if (act === 'edit') { openDlg(all[i]); return; }
                if (act === 'del') {
                    if (!confirm('Excluir venda e devolver itens ao estoque?')) return;
                    const prods = getProds();
                    for (const it of all[i].itens) {
                        if (!it.cod) continue;
                        const p = prods.find(x => Number(x.cod) === Number(it.cod));
                        if (p) p.estoque = Number(p.estoque || 0) + Number(it.q || 0);
                    }
                    saveProds(prods);
                    all.splice(i, 1); saveSales(all);
                    notify('Venda excluída e estoque ajustado.');
                    route('vendas');
                }
            });
        });
    }

    // ===== PDV / Balcão (auto-complete + preço auto + estoque) =====
    function bindPDV() {
        const selC = $("#pCliente"), inpD = $("#pDesc"), inpQ = $("#pQtd"), inpP = $("#pPreco");
        const btnAdd = $("#pAdd"), tbody = $("#pBody"), lblTotal = $("#pTotal"), btnFinish = $("#pFinish"), btnClear = $("#pClear"), badgeSel = $("#pSel");
        const sugBox = $("#pSug");

        let itens = []; let selIndex = -1; let sugData = []; let selProd = null;
        const fmt = v => 'R$ ' + Number(v).toFixed(2).replace('.', ',');

        const findByCode = (code) => {
            const n = Number(String(code).replace(/\D/g, ''));
            if (!n) return null;
            return getProds().find(p => Number(p.cod) === n) || null;
        };
        const findBySku = (skuTxt) => {
            const s = String(skuTxt || '').toLowerCase().trim();
            return getProds().find(p => String(p.sku || '').toLowerCase().trim() === s) || null;
        };
        const findByDesc = (dTxt) => {
            const s = String(dTxt || '').toLowerCase().trim();
            return getProds().find(p => String(p.desc || '').toLowerCase().trim() === s) || null;
        };

        const inCartQty = (cod) => itens.filter(i => Number(i.cod || 0) === Number(cod)).reduce((s, i) => s + Number(i.q || 0), 0);
        const availableFor = (cod) => {
            const p = getProds().find(x => Number(x.cod) === Number(cod));
            if (!p) return 0;
            return (Number(p.estoque) || 0) - inCartQty(cod);
        };

        function renderSug() {
            if (!sugData.length) { sugBox.classList.add('hidden'); sugBox.innerHTML = ''; selIndex = -1; return; }
            sugBox.classList.remove('hidden');
            sugBox.innerHTML = sugData.map((p, i) => `
        <div class="ac-item ${i === selIndex ? 'active' : ''}" data-i="${i}">
          <div class="ac-left">
            <span class="ac-code">${p.cod}</span>
            <div>
              <div><b>${p.desc}</b></div>
              <div class="ac-meta">SKU ${p.sku} • estoque ${p.estoque | 0}</div>
            </div>
          </div>
          <div>R$ ${Number(p.preco || 0).toFixed(2)}</div>
        </div>`).join('');
            sugBox.querySelectorAll('.ac-item').forEach(el => {
                el.addEventListener('mousedown', (ev) => { ev.preventDefault(); pickProduct(sugData[Number(el.dataset.i)]); });
            });
        }
        function buildSug(q) {
            const list = getProds();
            const txt = q.toLowerCase().trim();
            if (!txt) { sugData = []; renderSug(); return; }
            const onlyDigits = /^\d+$/.test(txt);
            let arr = [];
            if (onlyDigits) {
                const code = Number(txt);
                arr = list.filter(p => Number(p.cod) === code || String(p.sku || '').toLowerCase().includes(txt));
                if (!arr.length) arr = list.filter(p => String(p.cod).startsWith(txt));
            } else {
                arr = list.filter(p => String(p.sku || '').toLowerCase().includes(txt) || String(p.desc || '').toLowerCase().includes(txt));
            }
            const txtNum = Number(txt);
            arr.sort((a, b) => {
                const aExact = Number(a.cod) === txtNum ? 1 : 0, bExact = Number(b.cod) === txtNum ? 1 : 0;
                if (bExact - aExact) return bExact - aExact;
                const aStarts = String(a.cod).startsWith(txt) ? 1 : 0, bStarts = String(b.cod).startsWith(txt) ? 1 : 0;
                if (bStarts - aStarts) return bStarts - aStarts;
                return String(a.desc).localeCompare(String(b.desc));
            });
            sugData = arr.slice(0, 8);
            selIndex = sugData.length ? 0 : -1;
            renderSug();
        }

        function badgeText(p) {
            const disp = availableFor(p.cod);
            return `Selecionado: Cód ${p.cod} • SKU ${p.sku} • Estoque disp. ${disp}`;
        }

        function pickProduct(p) {
            selProd = p || null;
            if (selProd) {
                inpD.value = `${selProd.cod} - ${selProd.desc}`;
                inpP.value = Number(selProd.preco || 0).toFixed(2);
                badgeSel.style.display = 'inline-block';
                badgeSel.textContent = badgeText(selProd);
            } else {
                badgeSel.style.display = 'none';
                badgeSel.textContent = '';
            }
            sugData = []; renderSug();
            inpQ.focus();
        }
        function autoPickByCode(rawVal) {
            const val = String(rawVal || '').trim();
            if (!val) return;
            const m = val.match(/^(\d{3,})/);
            if (m) {
                const prod = findByCode(m[1]);
                if (prod) { pickProduct(prod); }
            }
        }

        inpD.addEventListener('input', e => {
            const val = e.target.value.trim();
            if (/^\d+$/.test(val)) {
                const p = findByCode(val);
                if (p) { pickProduct(p); return; }
            }
            selProd = null; badgeSel.style.display = 'none'; badgeSel.textContent = '';
            buildSug(val);
        });
        inpD.addEventListener('keydown', e => {
            if (sugBox.classList.contains('hidden')) {
                if (e.key === 'Enter') { e.preventDefault(); autoPickByCode(inpD.value); }
                return;
            }
            if (e.key === 'ArrowDown') { e.preventDefault(); selIndex = (selIndex + 1) % sugData.length; renderSug(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); selIndex = (selIndex - 1 + sugData.length) % sugData.length; renderSug(); }
            else if (e.key === 'Enter') { e.preventDefault(); if (selIndex >= 0) pickProduct(sugData[selIndex]); }
            else if (e.key === 'Escape') { sugData = []; renderSug(); }
        });
        inpD.addEventListener('blur', () => setTimeout(() => autoPickByCode(inpD.value), 50));
        inpD.addEventListener('change', () => autoPickByCode(inpD.value));

        function renderCart() {
            if (!itens.length) { tbody.innerHTML = `<tr><td colspan="5" class="muted">Inclua itens para iniciar a venda.</td></tr>`; }
            else {
                tbody.innerHTML = itens.map((i, idx) => `
          <tr>
            <td>${i.cod ? `[${i.cod}] ` : ''}${i.desc}</td>
            <td>${i.q}</td>
            <td>${fmt(i.p)}</td>
            <td>${fmt(i.q * i.p)}</td>
            <td><button class="btn bad" data-i="${idx}" data-act="rem">Remover</button></td>
          </tr>`).join('');
                tbody.querySelectorAll('button[data-act="rem"]').forEach(b => b.addEventListener('click', () => {
                    const i = Number(b.dataset.i); itens.splice(i, 1);
                    if (selProd) { badgeSel.textContent = badgeText(selProd); }
                    update();
                }));
            }
            const total = itens.reduce((s, i) => s + i.q * i.p, 0);
            lblTotal.textContent = `Total: ${fmt(total)}`;
            btnFinish.disabled = !(selC.value && itens.length);
        }
        const update = () => renderCart();

        function guessProdFromInput() {
            const raw = String(inpD.value || '').trim();
            if (!raw) return null;
            const m = raw.match(/^(\d{3,})/);
            if (m) { return findByCode(m[1]); }
            const bySku = findBySku(raw); if (bySku) return bySku;
            const byDesc = findByDesc(raw); if (byDesc) return byDesc;
            return null;
        }

        function addItem() {
            const q = Number(inpQ.value) || 0;
            let p = Number(inpP.value) || 0;
            let desc = String(inpD.value || '').trim();

            let prod = selProd || guessProdFromInput();

            if (prod) {
                const disp = availableFor(prod.cod);
                if (q <= 0) { notify('Qtd inválida.'); inpQ.focus(); return; }
                if (disp <= 0) { notify(`Sem estoque para ${prod.desc} (Cód ${prod.cod}).`); return; }
                if (q > disp) { notify(`Estoque insuficiente. Disponível: ${disp}`); return; }
                if (!p || p <= 0) p = Number(prod.preco || 0);
                desc = prod.desc;
                itens.push({ cod: prod.cod, desc, q, p });
                badgeSel.textContent = badgeText(prod);
            } else {
                if (!desc) { notify('Informe o produto.'); inpD.focus(); return; }
                if (q <= 0) { notify('Qtd inválida.'); inpQ.focus(); return; }
                if (p < 0) { notify('Preço inválido.'); inpP.focus(); return; }
                itens.push({ desc, q, p });
            }

            inpD.value = ''; selProd = null; badgeSel.style.display = 'none'; badgeSel.textContent = '';
            inpQ.value = 1; inpP.value = 0; inpD.focus(); update();
        }

        $("#pAdd").addEventListener('click', addItem);
        inpP.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } });
        $("#pClear").addEventListener('click', () => { itens = []; if (selProd) { badgeSel.textContent = badgeText(selProd); } update(); });

        function applyStockDeduction() {
            const list = getProds();
            let changed = false;
            for (const i of itens) {
                if (!i.cod) continue;
                const p = list.find(x => Number(x.cod) === Number(i.cod));
                if (!p) continue;
                p.estoque = Math.max(0, (Number(p.estoque) || 0) - Number(i.q || 0));
                changed = true;
            }
            if (changed) saveProds(list);
        }

        $("#pFinish").addEventListener('click', () => {
            if (!selC.value || !itens.length) { return; }
            for (const i of itens) {
                if (!i.cod) continue;
                const disp = availableFor(i.cod);
                if (i.q > disp) { notify(`Estoque ficou insuficiente para [${i.cod}] – disponível ${disp}. Ajuste a venda.`); return; }
            }

            const sales = getSales(); const num = (Math.max(0, ...sales.map(s => s.num || 0)) + 1) || 2000;
            const total = itens.reduce((s, i) => s + i.q * i.p, 0);
            const venda = { id: UID(), num, cliente: selC.value, itens, total, status: 'Concluída', criadoEm: Date.now() };
            sales.push(venda); saveSales(sales);
            applyStockDeduction();

            notify('Venda concluída e estoque atualizado!');
            const wrap = document.createElement('div');
            wrap.innerHTML = `<div class="receipt">
        <h3 style="margin:0 0 8px">Comprovante de Venda #${venda.num}</h3>
        <div style="font-size:14px;color:#374151">Cliente: <b>${venda.cliente}</b> • Status: <b>${venda.status}</b></div>
        <table style="width:100%;margin-top:8px;border-collapse:collapse">
          <thead><tr><th style="text-align:left">Item</th><th style="text-align:right">Qtd</th><th style="text-align:right">Valor</th></tr></thead>
          <tbody>${venda.itens.map(i => `<tr><td>${i.cod ? `[${i.cod}] ` : ''}${i.desc}</td><td style="text-align:right">${i.q}</td><td style="text-align:right">${fmt(i.p)}</td></tr>`).join('')}</tbody>
        </table>
        <div style="margin-top:8px;font-weight:800;text-align:right">Total: ${fmt(venda.total)}</div>
        <div style="margin-top:8px;font-size:12px;color:#6b7280">Emitido em ${new Date(venda.criadoEm).toLocaleString('pt-BR')}</div>
      </div>`;
            document.body.appendChild(wrap);
            window.print(); setTimeout(() => wrap.remove(), 200);
            itens = []; update();
        });

        update();
    }

    // ===== Backup =====
    function bindBackup() {
        $("#bExport")?.addEventListener('click', () => {
            const payload = { version: 1, exportedAt: new Date().toISOString(), users: getUsers(), clients: getClients(), products: getProds(), orcs: getOrcs(), sales: getSales() };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'backup_uniplus.json'; a.click(); URL.revokeObjectURL(a.href);
            notify('Backup exportado.');
        });
        $("#bImport")?.addEventListener('change', async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            try {
                const text = await f.text(); const data = JSON.parse(text || '{}');
                if (Array.isArray(data.users)) saveUsers(data.users);
                if (Array.isArray(data.clients)) saveClients(data.clients);
                if (Array.isArray(data.products)) saveProds(data.products);
                if (Array.isArray(data.orcs)) saveOrcs(data.orcs);
                if (Array.isArray(data.sales)) saveSales(data.sales);
                (function migrateAfterImport() {
                    const list = getProds(); let changed = false; let base = list.reduce((m, p) => Math.max(m, Number(p.cod || 0)), 1000);
                    for (const p of list) { if (!p.cod) { base += 1; p.cod = base; changed = true; } }
                    if (changed) saveProds(list);
                })();
                notify('Backup importado.');
            } catch { notify('Falha ao importar'); }
            e.target.value = '';
        });
    }

    // ===== Auth handlers =====
    $("#regCNPJ").addEventListener('input', e => e.target.value = maskCNPJ(e.target.value));
    $("#loginForm").addEventListener('submit', ev => {
        ev.preventDefault();
        const s = login($("#loginEmail").value, $("#loginPass").value);
        if (!s) { notify('Credenciais inválidas'); return; }
        setSession(s); notify('Bem-vindo(a), ' + s.name); ensureUI();
    });
    $("#regForm").addEventListener('submit', ev => {
        ev.preventDefault();
        const name = $("#regName").value.trim(), email = $("#regEmail").value.trim(), pass = $("#regPass").value, cnpj = $("#regCNPJ").value;
        if (!name || !email || !pass || !cnpj) { notify('Preencha todos os campos'); return; }
        if (!isValidCNPJ(cnpj)) { notify('CNPJ inválido'); return; }
        try {
            registerCliente({ name, email, pass, cnpj });
            const s = login(email, pass); setSession(s); notify('Cliente cadastrado e logado'); ensureUI();
        } catch (e) { notify(e.message || 'Erro'); }
    });
    $("#fillDemo").addEventListener('click', () => {
        $("#regName").value = 'Empresa Nova LTDA';
        $("#regEmail").value = 'contato@exemplo.com.br';
        $("#regCNPJ").value = maskCNPJ('12345678000195');
        $("#regPass").value = '123456';
    });

    // ===== Init =====
    ensureUI();
    route('pdv'); // abre no PDV para testar
    const s = getSession(); if (s) { ensureUI(); }
})();


