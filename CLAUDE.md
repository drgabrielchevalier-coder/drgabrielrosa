# CLAUDE.md — Dr Gabriel Rosa (site + gestão clínica)

Projeto em produção, **não é greenfield**. Evoluir o que existe; nunca reconstruir do zero.

## Identidade
- Repo: `drgabrielchevalier-coder/drgabrielrosa` · produção: https://drgabrielrosa.implantstore.com.br
- Hosting: Hostinger (PHP + MySQL), `public_html` = raiz do repo
- Branch de produção: `main` (Git do hPanel com auto-deploy a cada push/merge)
- Versão do app: `release.json` (atual 2.15.0)
- E-mail oficial: drgabrielchevalier@gmail.com (usar em todo o site e no AUTH_EMAIL padrão)
- CRO-RJ 52957 · WhatsApp clínico 5521967329133 · Instagram @dr_gabrielrosa · GR Scan https://grscan.implantstore.com.br/

## Stack
PHP + JS vanilla + MySQL. Sem Next/React/Node no runtime. Sem build step no front.

```
index.html      hub Instagram (Para pacientes × Para dentistas/GR Scan) — DirectoryIndex #1
home.php        site profissional (tratamentos, prova social Lattes em #credenciais)
login.php → index.php   painel de gestão (sessão PHP)
forgot-password.php / reset-password.php
api/            APIs JSON em PHP
assets/{css,js,img,data}
scripts/        build/import/testes (node .mjs, python, sh)
uploads/        sem execução de PHP (.htaccess)
```

`.htaccess`: `DirectoryIndex index.html home.php login.php index.php`

## Mapa de código
- `assets/js/app.js` (~6.7k linhas): núcleo do painel (state, pacientes, baixas, kanban, estoque, dashboard, settings, import histórico)
- `assets/js/clinic-billing.js`: motor de regras por clínica (`ChevalierBilling.settleCase`)
- Formulário de tratamento (app.js `treatmentLineRow`/`settleLines`): cada procedimento tem "Valor do procedimento" (`lines[].practicedValue`); o "Honorário a receber" (`p.value`) é calculado pela regra da clínica (percentual, fixo ou misto da ficha `clinicPrices`, ou a regra geral da clínica). Ficha "fixo" com valor igual ao preço (`isFullValuePrice`) = sem regra → honorário = valor digitado. Regras por procedimento da clínica (`billing.procedureRules`, com `category`) valem **linha a linha** em `settleLines` (fixo/percentual/misto); procedimento sem regra segue o Padrão da clínica ("demais procedimentos"). A IA de regra (`api/billing-rule-ai.php` + `billing-rule-ai-lib.php`) recebe o catálogo e devolve `categories[]` + `default`.
- `assets/js/procedure-catalog.js`, `dental-catalog.js`: catálogo
- `assets/js/nfe-stock.js`: NF-e → estoque, materiais controlados
- `assets/js/cost-link.js`: vínculo NF-e × boletos em Custos (`ChevalierCostLink`). A NF-e (`kind:'nfe'`, em `state.costs`) **não é custo**: só agrupa os pagamentos (boletos ou pagamento à vista, com `nfeCostId`) e dá entrada no estoque; `effectiveValue(NF)=0`. Totais de custos devem usar `costEffectiveValue`. Custos tem 3 visões (Por compra, Boletos a pagar, Por status). Teste: `scripts/test-fase6-nfe-boletos.mjs`
- `assets/js/circular-navigation.js`: menu circular em JS puro (`CircularNavigation.create`), demo em `circular-navigation.html` (noindex)
- Importação assistida (honorários): na Revisão a IA (`api/procedure-match-ai.php` + `procedure-match-lib.php`) interpreta descrições livres ("Rasp c/ prof + Rest 24") em procedimentos do catálogo + dente; usuário ajusta por descrição; mapeamentos confirmados ficam em `settings.procTextMap`; procedimentos inexistentes são criados (`createdBy:'import-ia'`). Lançamentos usam o cadastro existente da clínica (`importHistoricoPatients` com `linkPeople`).
- Pacientes → "Cadastrar lista de pacientes" (`openPeopleBatchModal`): cria só `state.people` (nome + clínica) a partir de CSV/XLSX/TXT ou colado; ignora já cadastrados na clínica e desmarca nomes parecidos. Visão "Cadastros" lista as pessoas. **Nunca versionar nomes de pacientes** (o repo vai para o `public_html`).
- `assets/js/import-assist.js`: wizard de importação (CSV/XLSX/HTML; PDF/foto e planilha fora do padrão via IA em `api/import-ai.php` + `import-ai-lib.php`): arquivo → mapeamento (sugerido pela IA) → revisão linha a linha → confirmar · `planning-calendar.js`: agenda · `scan-tools.js`: boleto/barcode
- `assets/css/app.css` (painel), `landing.css` + `landing.js` (home.php)
- `api/state.php`: GET/POST do estado
- `api/ops-wipe-lib.php`, `api/reset-ops.php`: wipe operacional
- `api/historico-lib.php` + `assets/data/*-historico.json` (Allon, Daniele, Gerlúcia, Particular, Custos)
- `api/auth-lib.php`, `db.php`, `config.php`, `app-version-lib.php` (cache-bust via `chevalier_asset_url`)
- IA: `billing-rule-ai.php`, `procedure-cost-ai.php`, `tomography-ai.php`, `price-sync.php` · NFS-e: `notaas-nfse.php`
- Brand: `assets/img/brand/*` (header usa `logo-horizontal-on-dark.png`, dourada)

## Persistência
- Cliente: `localStorage['chevalier_gestao_v1']`. Servidor: MySQL `app_state` (id=1, payload JSON), `schemaVersion: 5`
- Shape: `clinics, materials, procedures, patients, people, costs, payroll, prostheses, reminders, plans, importBatches, nfImports, stockLedger, imports{...flags seladas}, settings, schemaVersion, opsWipeVersion, opsWipedAt`
- `patients` = tratamentos/recebíveis, com `payments[]`. Clínicas: allon, daniele, gerlucia, particular.

## Regras invioláveis
1. **Segredos só no servidor**, em `api/config.local.php` (DB_*, AUTH_*, OPENAI_API_KEY, NOTAAS_*, SMTP). Nunca commitar, nunca sobrescrever. O setup não pode recriar esse arquivo.
2. **Guarda anti-wipe** em `api/state.php` (`STATE_WIPE_GUARD`, 409). Não afrouxar. Apagar dados só com `__forceWipe` / `reset-ops.php` explícito.
3. **Wipe selado**: `chevalier_ops_wipe_version()` (PHP) e `OPS_WIPE_VERSION` (app.js) = 1. **Não incrementar**, porque incrementar apaga a produção de novo. Históricos selados não podem ser reimportados automaticamente.
4. **Baixas parciais** (app.js): `markReceived`, `setReceiveMode`, `refreshReceivePreview`, `commitReceivePayment`, `voidPatientPayment`, `balance`, `paymentStatusOf`, `syncPatientPaymentStatus`, `patientPayments`, `sumActivePayments`, `paymentHistoryHtml`.
   - `p.value` (valor original) nunca muda. Proibido receber acima do saldo.
   - Cada baixa é anexada a `payments[]` (`mode` parcial/total, `balanceAfter`, `method`, `receipt`).
   - Estorno não apaga nada: marca `voided` e cria um lançamento `estorno` com `reverses`. `received` é recalculado pelo ledger ativo.
   - Status especiais (Retrabalho, Não vai receber, Aguardando acerto) são preservados.
5. Preservar o motor `clinic-billing.js`.
6. Landings: hub (`index.html`) ≠ site profissional (`home.php`). Não confundir card clínico (paciente) com GR Scan (dentistas).
7. Deploy = `main`. Nunca subir zip parcial em `public_html` (apaga o app). FTP Actions é só fallback (secrets `FTP_*` ausentes).
8. O repo inteiro vai para `public_html`. Arquivos internos (`*.md`, `scripts/`, `.github/`, `README-INSTALACAO.txt`) são bloqueados no `.htaccess`. Nunca colocar segredo em arquivo versionado.

## Fluxo de trabalho (deploy automático)
- Trabalhar sempre em branch `claude/<nome>` (nunca `cursor/...`). Mudanças pontuais, sem refactors amplos.
- Push em `claude/**` dispara `.github/workflows/auto-merge-claude.yml`: checa segredos, wipe selado, `php -l`, `node --check` e `scripts/test-*.mjs`. Se tudo passar, faz merge em `main` → o Git do hPanel publica (auto-deploy ligado: main, diretório raiz).
- Ou seja: **push em `claude/**` = produção**. Rodar as checagens localmente antes do push. Não abrir PR, a menos que o usuário peça.
- Check falhou ou conflito → nada vai para `main`. Corrigir na branch e fazer push de novo.
- Pausa: variável de repo `AUTO_MERGE_CLAUDE=off`.
- Ao mudar CSS/JS, os assets já são versionados por `chevalier_asset_url`. Em mudança visível ao usuário, atualizar `release.json` (version/name/releasedAt/changes).
- Checagens rápidas: `php -l <arquivo>` nos PHP alterados; `node --check assets/js/<arquivo>.js`; testes em `scripts/test-*.mjs` (`node scripts/test-fase3-recebiveis.mjs` etc.).
- Local: `php -S localhost:8000` na raiz (sem `config.local.php` o painel cai no localStorage).
- Textos de UI e commits em português.
