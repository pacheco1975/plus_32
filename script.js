function bindProdutos() {
    const grid = $("#pGrid");
    const btnNew = $("#pNew");
    const inpSearch = $("#pSearch");
    const btnExport = $("#pExport");
    const inpImport = $("#pImport");

    // Modal refs
    const dlg = $("#prodDlg");
    const pfCod = $("#pfCod");
    const pfGen = $("#pfGen");
    const pfCodHint = $("#pfCodHint");
    const pfSku = $("#pfSku");
    const pfDesc = $("#pfDesc");
    const pfPreco = $("#pfPreco");
    const pfEst = $("#pfEst");
    const pfSave = $("#pfSave");
    const pfCancel = $("#pfCancel");

    // ===== helpers =====
    function dBounce(fn, ms) { let t = null; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms || 150); }; }
    const normStr = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    function openModal() {
        const list = getProds();
        pfCod.value = "";
        pfSku.value = "";
        pfDesc.value = "";
        pfPreco.value = "0";
        pfEst.value = "0";
        pfCodHint.textContent = `Dica: deixe em branco para usar automaticamente o próximo código (${nextProdCode(list)}). Digite "A" para gerar aleatório.`;
        dlg?.showModal?.();
        pfSku.focus();
    }
    function closeModal() { try { dlg?.close?.(); } catch { } }

    function genCodeFromRaw(raw, list) {
        const input = String(raw || "").trim();
        if (!input) return nextProdCode(list);              // automático
        if (/^[aA]$/.test(input)) return genRandomCode(list); // aleatório
        const num = Number(input.replace(/\D/g, ""));
        if (!Number.isFinite(num) || num <= 0) throw new Error("Código inválido.");
        if (list.some(p => Number(p.cod) === num)) throw new Error("Já existe produto com este código.");
        return num;
    }

    // ===== UI: gerar/validar código =====
    pfGen?.addEventListener("click", () => {
        const list = getProds();
        pfCod.value = String(genRandomCode(list));
        pfCodHint.textContent = "Gerado aleatoriamente. Você pode alterar se quiser.";
    });
    pfCod?.addEventListener("input", () => {
        const list = getProds();
        const raw = pfCod.value.trim();
        if (!raw) { pfCodHint.textContent = `Automático: será usado ${nextProdCode(list)}.`; return; }
        if (/^[aA]$/.test(raw)) { pfCodHint.textContent = "Aleatório: será gerado um código livre."; return; }
        const num = Number(raw.replace(/\D/g, ""));
        if (!num) { pfCodHint.textContent = "Código inválido."; return; }
        const exists = list.some(p => Number(p.cod) === num);
        pfCodHint.textContent = exists ? "⚠️ Já existe produto com este código." : "✓ Código disponível.";
    });
    pfCancel?.addEventListener("click", closeModal);
    btnNew?.addEventListener("click", openModal);

    // ===== salvar produto =====
    pfSave?.addEventListener("click", () => {
        const list = getProds();
        try {
            const cod = genCodeFromRaw(pfCod.value, list);
            const sku = String(pfSku.value || "").trim();
            const desc = String(pfDesc.value || "").trim();
            const preco = Number(pfPreco.value || 0);
            const estoque = parseInt(pfEst.value || 0);

            if (!sku) { notify("Informe o SKU."); pfSku.focus(); return; }
            if (!desc) { notify("Informe a descrição."); pfDesc.focus(); return; }
            if (!Number.isFinite(preco) || preco < 0) { notify("Preço inválido."); pfPreco.focus(); return; }
            if (!Number.isFinite(estoque) || estoque < 0) { notify("Estoque inválido."); pfEst.focus(); return; }

            if (list.some(p => normStr(p.sku) === normStr(sku))) {
                notify("Já existe um produto com este SKU."); return;
            }

            list.push({ id: UID(), cod, sku, desc, preco, estoque });
            saveProds(list);
            notify(`Produto cadastrado (Cód ${cod}).`);
            closeModal();
            route('produtos');
        } catch (err) { notify(err.message || "Erro ao salvar."); }
    });

    // ===== busca =====
    inpSearch?.addEventListener('input', dBounce(e => {
        const q = normStr(e.target.value);
        Array.from(grid?.children || []).forEach(tr => {
            const txt = normStr(tr.textContent);
            tr.style.display = txt.includes(q) ? '' : 'none';
        });
    }, 120));

    // ===== ações (delegation) =====
    grid?.addEventListener('click', (ev) => {
        const btn = ev.target.closest?.('button[data-act]');
        if (!btn) return;
        const act = btn.getAttribute('data-act');
        const tr = btn.closest('tr');
        const id = tr?.getAttribute('data-id');
        if (!id) return;

        const list = getProds();
        const i = list.findIndex(p => p.id === id);
        if (i < 0) return;

        if (act === 'del') {
            if (confirm('Excluir este item?')) {
                list.splice(i, 1);
                saveProds(list);
                notify('Excluído.');
                route('produtos');
            }
            return;
        }

        if (act === 'edit') {
            const p = list[i];
            const skuIn = prompt('SKU:', p.sku);
            const descIn = prompt('Descrição:', p.desc);
            const precoIn = prompt('Preço:', p.preco);
            const estIn = prompt('Estoque:', p.estoque);

            const sku = (skuIn === null ? p.sku : skuIn).trim();
            const desc = (descIn === null ? p.desc : descIn).trim();
            const preco = precoIn === null ? p.preco : Number(precoIn);
            const estoque = estIn === null ? p.estoque : parseInt(estIn);

            if (!sku || !desc || !Number.isFinite(preco) || preco < 0 || !Number.isFinite(estoque) || estoque < 0) {
                notify('Dados inválidos.'); return;
            }
            if (list.some((x, idx) => idx !== i && normStr(x.sku) === normStr(sku))) {
                notify('Já existe outro produto com este SKU.'); return;
            }
            list[i] = { ...p, sku, desc, preco, estoque };
            saveProds(list);
            notify('Atualizado.');
            route('produtos');
        }
    });

    // ===== export JSON + CSV =====
    btnExport?.addEventListener('click', () => {
        const list = getProds();

        // --- JSON
        const blobJson = new Blob([JSON.stringify({ products: list }, null, 2)], { type: 'application/json' });
        const aJson = document.createElement('a');
        aJson.href = URL.createObjectURL(blobJson);
        aJson.download = 'produtos.json';
        aJson.click();
        URL.revokeObjectURL(aJson.href);

        // --- CSV
        if (list.length) {
            const headers = ["cod", "sku", "desc", "preco", "estoque"];
            const rows = list.map(p =>
                headers.map(h => (p[h] != null ? String(p[h]).replace(/"/g, '""') : "")).join(";")
            );
            const csv = [headers.join(";"), ...rows].join("\n");
            const blobCsv = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const aCsv = document.createElement('a');
            aCsv.href = URL.createObjectURL(blobCsv);
            aCsv.download = 'produtos.csv';
            aCsv.click();
            URL.revokeObjectURL(aCsv.href);
        }
    });

    // ===== import JSON/CSV/XLSX =====
    inpImport?.addEventListener('change', async e => {
        const f = e.target.files?.[0]; if (!f) return;

        // normalizadores
        const normKey = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        function toNumberFlexible(v) {
            if (v == null || v === "") return 0;
            if (typeof v === "number" && Number.isFinite(v)) return v;
            let s = String(v).trim();
            if (/^\d{1,3}(\.\d{3})+,\d+$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
            else if (/^\d+,\d+$/.test(s)) s = s.replace(",", ".");
            return Number(s) || 0;
        }

        // quando a 1ª linha do array contém os valores do cabeçalho
        function headerizeArray(arr) {
            if (!Array.isArray(arr) || !arr.length) return arr;
            const first = arr[0] || {};
            const keys = Object.keys(first);
            const headerHints = Object.values(first).map(v => String(v || "").toLowerCase());
            const looksHeader =
                headerHints.some(v => /c[oó]digo|refer[êe]ncia|nome|descri[cç][aã]o|pre[çc]o|estoque|pre[çc]o unit/.test(v)) ||
                (keys.length > 0 && keys.every(k => /^column\d+$/i.test(k)));
            if (!looksHeader) return arr;

            const map = {}; keys.forEach(k => { map[k] = String(first[k] ?? "").trim() || k; });

            const out = [];
            for (let i = 1; i < arr.length; i++) {
                const src = arr[i] || {}, obj = {};
                for (const k of Object.keys(src)) {
                    obj[map[k] || k] = src[k];
                }
                out.push(obj);
            }
            return out;
        }

        function pick(obj, variants) {
            if (!obj || typeof obj !== "object") return undefined;
            const idx = Object.create(null);
            for (const k in obj) idx[normKey(k)] = k;
            for (const v of variants) {
                const k = idx[normKey(v)];
                if (k != null) return obj[k];
            }
            return undefined;
        }

        // aceita JSON estranho (Produtos/ColumnX), CSV/XLSX PT-BR, e campos nativos
        function rowToProd(row) {
            let cod = pick(row, ["Código", "cod", "codigo", "id", "code", "Produtos"]);
            let sku = pick(row, ["Referência", "referencia", "ref", "sku", "Column2"]);
            let desc = pick(row, ["Nome", "descrição", "descricao", "desc", "produto", "Column3"]);
            let preco = pick(row, ["Preço Unit.", "preco", "preço", "valor", "Column6"]);
            let estoque = pick(row, ["Estoque", "estoque", "quantidade", "qtd", "Column7"]);

            const codNum = Number(String(cod || "").replace(/\D/g, ""));
            const precoNum = toNumberFlexible(preco);
            const estoqueNum = parseInt(String(estoque ?? "").replace(/\D/g, "")) || 0;

            // relaxo: completa quando vier só um dos dois
            if (!desc && sku) desc = String(sku);
            if (!sku && desc) {
                sku = normStr(desc)
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9\-]/g, '')
                    .slice(0, 20) || ('sku-' + Math.random().toString(36).slice(2, 8));
            }

            return { cod: codNum, sku: String(sku || "").trim(), desc: String(desc || "").trim(), preco: precoNum, estoque: estoqueNum };
        }

        // parsers
        function parseCSVText(text) {
            const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
            if (!lines.length) return [];
            const sep = lines[0].includes(";") ? ";" : ",";
            function split(line) {
                const out = []; let cur = "", inQ = false;
                for (let i = 0; i < line.length; i++) {
                    const ch = line[i];
                    if (ch === '\"') { inQ = !inQ; continue; }
                    if (ch === sep && !inQ) { out.push(cur); cur = ""; } else cur += ch;
                }
                out.push(cur);
                return out.map(x => x.replace(/^\"|\"$/g, "").trim());
            }
            const headers = split(lines[0]);
            const arr = [];
            for (let i = 1; i < lines.length; i++) {
                const cols = split(lines[i]); const obj = {};
                headers.forEach((h, idx) => obj[h] = (cols[idx] == null ? "" : cols[idx]));
                arr.push(obj);
            }
            const headersAreColumns = headers.every(h => /^column\d+$/i.test(h));
            if (headersAreColumns) return headerizeArray(arr);
            return arr;
        }

        function tryParseJSONFlexible(text) {
            if (!text || !text.trim()) throw new Error("Arquivo vazio.");
            text = text.replace(/^\uFEFF/, "");         // BOM
            text = text.replace(/,\s*([}\]])/g, "$1");  // vírgula final
            try { return JSON.parse(text); } catch { }

            // NDJSON
            const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            if (lines.length > 1) {
                const arr = []; let ok = 0;
                for (const ln of lines) { try { arr.push(JSON.parse(ln)); ok++; } catch { } }
                if (ok > 0) return arr;
            }

            // aspas simples -> duplas (fallback leve)
            if (/^[\[\{][\s\S]*[\]\}]$/.test(text)) {
                const fixed = text.replace(/'/g, '"');
                try { return JSON.parse(fixed); } catch { }
            }
            throw new Error("JSON mal formatado.");
        }

        async function parseJSON(file) {
            const text = await file.text();
            const data = tryParseJSONFlexible(text);
            if (!Array.isArray(data)) throw new Error("Esperado um array no JSON.");
            return headerizeArray(data);
        }

        async function parseCSV(file) {
            const text = await file.text();
            return parseCSVText(text);
        }

        async function parseSheet(file) {
            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            if (!ws) throw new Error("Planilha vazia.");
            let arr = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
            const first = arr[0] || {};
            const keys = Object.keys(first);
            if (keys.length && keys.every(k => /^column\d+$/i.test(k))) arr = headerizeArray(arr);
            return arr;
        }

        async function parseFile(file) {
            const name = String(file.name || "");
            if (/\.json$/i.test(name)) return parseJSON(file);
            if (/\.csv$/i.test(name)) return parseCSV(file);
            if (typeof XLSX !== "undefined") return parseSheet(file);
            throw new Error("Formato não suportado. Use JSON, CSV ou XLS/XLSX (com SheetJS).");
        }

        try {
            const rawRows = await parseFile(f);
            console.log("Prévia dos dados importados:", rawRows.slice(0, 3));

            const cur = getProds();
            let max = cur.reduce((m, p) => Math.max(m, Number(p.cod || 0)), 1000);
            const bySku = new Map(cur.map(p => [normStr(p.sku || ""), true]));
            const byCod = new Set(cur.map(p => Number(p.cod || 0)));

            let added = 0, dupSku = 0, dupCod = 0, bad = 0;

            for (const row of rawRows) {
                // pula linha totalmente vazia
                if (Object.values(row || {}).every(v => String(v ?? "").trim() === "")) continue;

                const r = rowToProd(row);

                // valida mínimo depois do relaxo
                if (!r.sku || !r.desc) { bad++; continue; }

                let cod = Number(r.cod || 0);
                if (!Number.isFinite(cod) || cod <= 0 || byCod.has(cod)) {
                    if (byCod.has(cod)) dupCod++;
                    do { cod = ++max; } while (byCod.has(cod));
                }

                const skuKey = normStr(r.sku);
                if (bySku.has(skuKey)) { dupSku++; continue; }

                cur.push({
                    id: UID(),
                    cod,
                    sku: r.sku,
                    desc: r.desc,
                    preco: (Number.isFinite(r.preco) && r.preco >= 0 ? r.preco : 0),
                    estoque: (Number.isFinite(r.estoque) && r.estoque >= 0 ? r.estoque : 0)
                });

                bySku.set(skuKey, true);
                byCod.add(cod);
                added++;
            }

            saveProds(cur);
            notify(`Importados: ${added} • dup(SKU): ${dupSku} • dup(cód): ${dupCod} • inválidos: ${bad}`);
            route('produtos');
        } catch (err) {
            console.error("Import Produtos - erro:", err);
            notify('Falha ao importar produtos: ' + (err?.message || 'erro desconhecido'));
        }
        e.target.value = '';
    });
}


