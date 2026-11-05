#!/usr/bin/env python3
"""Build assets/data/*-historico.json from /tmp/notion-sync/*.json Notion dumps."""
from __future__ import annotations

import glob
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SYNC = Path(__import__("os").environ.get("NOTION_SYNC_DIR", "/tmp/notion-sync"))
OUT = ROOT / "assets/data"
IMPORTS = OUT / "imports"


def import_hash(prefix: str, parts: list) -> str:
    raw = "|".join(str(p) for p in parts if p)
    h = 0
    for ch in raw:
        h = ((h << 5) - h + ord(ch)) & 0xFFFFFFFF
        if h >= 0x80000000:
            h -= 0x100000000
        h = int(h)
    return f"{prefix}-{abs(h):08x}{len(raw):x}"


def money(v) -> float:
    if v is None or v == "":
        return 0.0
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).replace("R$", "").replace(" ", "").strip()
    if not s or re.match(r"^não$", s, re.I):
        return 0.0
    if re.search(r"\d,\d{2}$", s):
        s = s.replace(".", "").replace(",", ".")
    else:
        s = s.replace(",", "")
    try:
        n = float(s)
    except ValueError:
        return 0.0
    return n if n == n else 0.0


def date_iso(v) -> str:
    if v is None:
        return ""
    s = str(v).strip()
    if re.match(r"^\d{4}-\d{2}-\d{2}", s):
        return s[:10]
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})", s)
    if m:
        d, mo, y = m.groups()
        return f"{y}-{mo.zfill(2)}-{d.zfill(2)}"
    return ""


def month_ref_label(v: str) -> str:
    return str(v or "").split("(")[0].strip()


def pick(row: dict, names: list[str]):
    for n in names:
        if n in row and row[n] is not None and str(row[n]).strip() != "":
            return row[n]
        for k, val in row.items():
            if k.strip().lower() == n.strip().lower() and val is not None and str(val).strip() != "":
                return val
    for n in names:
        for k, val in row.items():
            if n.lower() in k.lower() and val is not None and str(val).strip() != "":
                return val
    return ""


def relation_urls(raw) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(x) for x in raw]
    s = str(raw).strip()
    if not s:
        return []
    try:
        arr = json.loads(s)
        if isinstance(arr, list):
            return [str(x) for x in arr]
    except json.JSONDecodeError:
        pass
    return [s]


def month_name_from_relation(raw, month_map: dict[str, str]) -> str:
    for url in relation_urls(raw):
        key = url.rstrip("/").split("/")[-1]
        for mk, name in month_map.items():
            if key in mk or mk in url:
                if name:
                    return name
    return ""


def load_month_map() -> dict[str, str]:
    path = SYNC / "months.json"
    rows = json.loads(path.read_text()) if path.exists() else []
    m = {}
    for row in rows:
        url = str(row.get("url") or "")
        nome = row.get("Nome")
        if url and nome:
            m[url] = str(nome)
            key = url.rstrip("/").split("/")[-1]
            m[key] = str(nome)
    return m


def guess_procedure(obs, tipo):
    t = f"{obs or ''} {tipo or ''}".lower()
    tooth_m = re.search(r"\b([1-4]\d)\b", str(obs or ""))
    tooth = tooth_m.group(1) if tooth_m else ""
    if re.search(r"endodontia|endo ", t):
        if re.search(r"[1-4][678]", tooth) or "multi" in t:
            return "proc-endo-multi"
        return "proc-endo-uni"
    if "protocolo" in t:
        return "p5"
    if "coroa" in t and "implante" in t:
        return "p3"
    if "implante" in t and "enxerto" in t:
        return "p2"
    if "implante" in t and "coroa" in t:
        return "p4"
    if re.search(r"implante|plantio|cirurgia", t):
        return "p1"
    if "restaura" in t:
        return "p6"
    return "proc-historico-livre"


APP_PROGRESS = [
    "Orçamento",
    "Em tratamento",
    "Planejar caso",
    "Solicitar material",
    "Em fila / agendado",
    "Aguardo pós Cirúrgico",
    "Aguardando cicatrização",
    "Aguardando moldagem",
    "Moldagem",
    "Enviado para Laboratório",
    "Aguardando Prova",
    "Aguardando Cimentação",
    "Alta",
]
APP_FINANCE = {
    "À receber",
    "Recebido parcial",
    "Aguardando acerto",
    "Retrabalho",
    "Não vai receber",
    "Faturado / Recebido",
}


def is_lab_status(lab_raw) -> bool:
    s = str(lab_raw or "").strip().lower()
    if not s:
        return False
    return bool(re.match(r"^(não|nao|moldagem|prova\s*ok)$", s) or re.search(r"ciment", s))


def sync_flow(progress, obs, lab_flag="") -> bool:
    t = f"{progress or ''} {obs or ''} {lab_flag or ''}".lower()
    return bool(re.search(r"prova|moldagem|laborat|ciment|protese|prótese|coroa", t))


def fin_status(fin: str, honor: float) -> tuple[str, float]:
    f = str(fin or "").strip()
    fl = f.lower()
    if re.search(r"n[aã]o vai receber", fl):
        return "Não vai receber", 0.0
    if re.search(r"retrabalho", fl):
        return "Retrabalho", 0.0
    if re.search(r"aguardando acerto", fl):
        return "Aguardando acerto", 0.0
    if re.search(r"parcial|recebido parte", fl):
        return "Recebido parcial", round(honor * 0.5, 2)
    # Acordo no Notion = quitado por acordo → gráficos como recebido
    if re.search(r"acordo", fl):
        return "Faturado / Recebido", honor
    if re.search(r"faturado|recebido", fl) and not re.search(r"n[aã]o recebeu", fl):
        return "Faturado / Recebido", honor
    return "À receber", 0.0


def map_progress(raw_progress, lab_raw, status: str, fin_raw) -> str:
    p = str(raw_progress or "").strip()
    lab = str(lab_raw or "").strip()
    if re.search(r"faturado|recebido\s*\(\$\)", p, re.I) or re.match(r"^recebido", p, re.I):
        p = "Alta" if status == "Faturado / Recebido" else "Em tratamento"
    aliases = {
        "re-moldagem": "Moldagem",
        "remoldagem": "Moldagem",
        "aguardando prova": "Aguardando Prova",
        "aguardando entrega": "Enviado para Laboratório",
        "aguardando liberação": "Em tratamento",
        "aguardando liberacao": "Em tratamento",
        "enviado para reembasamento": "Enviado para Laboratório",
        "enviado para acrilização": "Enviado para Laboratório",
        "enviado para acrilizacao": "Enviado para Laboratório",
        "ajuste": "Em tratamento",
        "in progress": "Em tratamento",
        "não retornou": "Em tratamento",
        "nao retornou": "Em tratamento",
    }
    key = p.lower().rstrip()
    if key in aliases:
        p = aliases[key]
    else:
        for stage in APP_PROGRESS:
            if stage.lower() == key:
                p = stage
                break
    if is_lab_status(lab):
        ll = lab.lower()
        if ll == "moldagem":
            p = "Moldagem"
        elif ll.startswith("prova"):
            p = "Aguardando Prova"
        elif "ciment" in ll:
            p = "Alta" if status == "Faturado / Recebido" else "Aguardando Cimentação"
    if re.match(r"^moldagem$", str(fin_raw or "").strip(), re.I):
        p = "Moldagem"
    if status == "Faturado / Recebido" and p in ("", "Em tratamento", "Orçamento") and (
        not lab or re.match(r"^n[aã]o$", lab, re.I) or not is_lab_status(lab)
    ):
        p = "Alta"
    if p not in APP_PROGRESS:
        p = "Em tratamento"
    return p


def notion_row_to_csv_row(row: dict, month_map: dict, kind: str) -> dict:
    """Map Notion SQL row → pseudo-CSV columns for mapHonorarioRows."""
    mref_raw = pick(row, ["Mês Referencia novo", "Resumo Financeiro", "💲 Resumo Financeiro"])
    mname = month_name_from_relation(mref_raw, month_map)
    mref_display = f"{mname} ({relation_urls(mref_raw)[0]})" if mname and relation_urls(mref_raw) else mname

    out = {
        "Nome": pick(row, ["Nome"]),
        "Data": date_iso(pick(row, ["date:Data:start", "Data"])),
        "Data da Cobrança": date_iso(pick(row, ["date:Data da Cobrança:start", "Data da Cobrança"])),
        "Financeiro": pick(row, ["Financeiro"]),
        "Observação": pick(row, ["Observação", "Observacao"]),
        "Texto": pick(row, ["Texto"]),
        "Progresso": pick(row, ["Progresso"]) or "Em tratamento",
        "Tipo": pick(row, ["Tipo"]),
        "Componentes": pick(row, ["Componentes"]),
        "CC": pick(row, ["CC", "CC "]),
        "Clinica": pick(row, ["Clinica", "Clínica"]),
    }
    if mref_display:
        out["Mês Referencia novo"] = mref_display

    practiced = money(pick(row, ["Valor Procedimento", "Valor"]))
    lab_raw = pick(row, ["Lab", "Lab ", "Laboratório"])

    if kind == "allon":
        out["Valor Procedimento"] = practiced
        honor = round(practiced * 0.27, 2) if practiced else 0.0
        out["Honorários"] = honor
        out["Lab"] = lab_raw or "Não"
    elif kind == "daniele":
        honor = money(pick(row, ["Honorários", "Honorarios"]))
        out["Honorários"] = honor
        out["Valor"] = honor
    elif kind in ("gerlucia", "particular"):
        val = money(pick(row, ["Valor"]))
        lab = money(lab_raw) if lab_raw is not None else 0.0
        comp = money(pick(row, ["Componentes"]))
        cc = money(pick(row, ["CC", "CC "]))
        honor = (val - lab - comp - cc) / 2.0
        out["Valor"] = val
        out["A receber"] = honor
        out["Lab"] = lab_raw if lab_raw is not None else ""
        out["Lab "] = lab_raw if kind == "gerlucia" else out.get("Lab")
    return out


def map_honorario_rows(rows: list[dict], meta: dict, month_map: dict, kind: str) -> dict:
    clinic_id = meta["clinicId"]
    prefix = meta.get("prefix") or clinic_id[:3]
    origin = meta.get("origin") or ("Particular" if clinic_id == "particular" else "Prestação")
    records = []
    for row in rows:
        csv_row = notion_row_to_csv_row(row, month_map, kind)
        name = str(pick(csv_row, ["Nome", "Paciente"])).strip()
        if not name:
            continue
        honor = money(pick(csv_row, ["Honorários", "Honorarios"])) or money(pick(csv_row, ["A receber"]))
        practiced = money(pick(csv_row, ["Valor", "Valor Procedimento"])) or honor
        lab_raw = pick(csv_row, ["Lab", "Lab ", "Laboratório"])
        if kind == "allon":
            lab = 0 if re.match(r"^não$", str(lab_raw or "").strip(), re.I) else money(lab_raw)
        else:
            lab = money(lab_raw) if lab_raw not in (None, "") else 0.0
        components = money(pick(csv_row, ["Componentes"]))
        clinical = money(pick(csv_row, ["CC", "CC "])) or money(pick(csv_row, ["Clinica", "Clínica"]))
        date = date_iso(pick(csv_row, ["Data"])) or datetime.now(timezone.utc).strftime("%Y-%m-%d")
        due = date_iso(pick(csv_row, ["Data da Cobrança"])) or date
        fin = str(pick(csv_row, ["Financeiro"]) or "")
        obs = str(pick(csv_row, ["Observação", "Observacao", "Texto"]) or "").strip()
        raw_progress = pick(csv_row, ["Progresso"])
        tipo = pick(csv_row, ["Tipo"])
        mref = month_ref_label(
            pick(csv_row, ["Mês Referencia novo", "Mes Referencia novo", "Resumo Financeiro", "💲 Resumo Financeiro"])
        )
        status, received = fin_status(fin, honor)
        if status not in APP_FINANCE:
            status = "À receber"
            received = 0.0
        progress = map_progress(raw_progress, lab_raw, status, fin)
        procedure_id = guess_procedure(obs, tipo)
        tooth_m = re.search(r"\b([1-4]\d)\b", obs)
        tooth = tooth_m.group(1) if tooth_m else ""
        lab_flag = str(lab_raw).strip() if is_lab_status(lab_raw) else ""
        records.append(
            {
                "importId": import_hash(prefix, [clinic_id, name, date, honor, obs, practiced]),
                "name": name,
                "date": date,
                "due": due,
                "status": status,
                "progress": progress,
                "value": honor,
                "received": received,
                "practicedValue": practiced,
                "observation": obs,
                "notes": f"{obs} [{mref}]".strip() if mref else obs,
                "monthRef": mref,
                "procedureId": procedure_id,
                "tooth": tooth,
                "lab": lab,
                "components": components,
                "clinical": clinical,
                "syncFlow": sync_flow(progress, obs, lab_flag),
                "labFlag": lab_flag,
            }
        )
    return {
        "version": 2,
        "kind": "patients",
        "clinicId": clinic_id,
        "origin": origin,
        "count": len(records),
        "records": records,
        "source": meta.get("source", "Notion MCP sync"),
    }


def map_custo_rows(rows: list[dict], month_map: dict) -> dict:
    records = []
    for idx, row in enumerate(rows):
        desc = str(pick(row, ["Descrição", "Descricao"])).strip()
        if not desc:
            continue
        value = money(pick(row, ["Valor"]))
        date = date_iso(pick(row, ["date:Data:start", "Data"])) or datetime.now(timezone.utc).strftime("%Y-%m-%d")
        due = date_iso(pick(row, ["date:Vencimento:start", "Vencimento"])) or date
        typ = str(pick(row, ["Tipo"]) or "OUTROS").strip() or "OUTROS"
        center_raw = pick(row, ["CUSTOS", "Centro", "Centro de custo"])
        center = month_name_from_relation(center_raw, month_map) or month_ref_label(str(center_raw or ""))
        center = center or "Geral"
        method = str(pick(row, ["Forma de Pg", "Forma de Pagamento", "Método"]) or "PIX").strip() or "PIX"
        status_raw = str(pick(row, ["Status Pg", "Status"]) or "À PAGAR").strip().upper() or "À PAGAR"
        if re.search(r"PAGO|QUITADO", status_raw):
            status = "PAGO"
        elif re.search(r"PARCEL", status_raw):
            status = "PARCELADO"
        else:
            status = "À PAGAR"
        nf = str(pick(row, ["NF-E", "NF", "NFe"]) or "").strip()
        texto = str(pick(row, ["Texto"]) or "").strip()
        notes = " · ".join(x for x in [f"NF: {nf}" if nf else "", f"Ref {center}" if center != "Geral" else "", texto] if x)
        records.append(
            {
                "importId": import_hash("cost", [str(idx + 1), desc, date, value, typ, due, nf, method]),
                "desc": desc,
                "type": typ,
                "center": center,
                "date": date,
                "due": due,
                "method": method,
                "value": value,
                "status": status,
                "notes": notes,
                "monthRef": center if center != "Geral" else "",
            }
        )
    return {
        "version": 2,
        "kind": "costs",
        "count": len(records),
        "records": records,
        "source": "Controle de Custos (Notion MCP sync)",
    }


def load_allon_rows() -> list[dict]:
    rows = []
    for off in (0, 100, 200, 300, 400):
        path = SYNC / f"allon-{off}.json"
        if path.exists():
            rows.extend(json.loads(path.read_text()))
    return rows


def fmt_money_br(n: float) -> str:
    s = f"{n:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"R$\u00a0{s}"


def rows_to_honor_csv(rows: list[dict], kind: str, month_map: dict) -> str:
    headers = [
        "Nome",
        "Data",
        "Data da Cobrança",
        "Financeiro",
        "Progresso",
        "Honorários",
        "Lab",
        "Componentes",
        "CC",
        "Mês Referencia novo",
        "Observação",
        "Texto",
        "Valor Procedimento",
        "Valor",
        "Tipo",
    ]
    lines = [",".join(headers)]
    for row in rows:
        csv_row = notion_row_to_csv_row(row, month_map, kind)
        name = str(csv_row.get("Nome") or "")
        if not name:
            continue
        honor = money(pick(csv_row, ["Honorários", "A receber"]))
        practiced = money(pick(csv_row, ["Valor Procedimento", "Valor"])) or honor
        lab = pick(csv_row, ["Lab", "Lab "]) or ""
        mref = csv_row.get("Mês Referencia novo", "")
        obs = str(csv_row.get("Observação") or "").replace('"', '""')
        texto = str(csv_row.get("Texto") or "").replace('"', '""')
        fin = str(csv_row.get("Financeiro") or "")
        prog = str(csv_row.get("Progresso") or "")
        data = date_iso(csv_row.get("Data"))
        due = date_iso(csv_row.get("Data da Cobrança"))
        data_br = "/".join(reversed(data.split("-"))) if data else ""
        due_br = "/".join(reversed(due.split("-"))) if due else ""
        def q(s):
            s = str(s or "")
            return f'"{s}"' if "," in s or '"' in s or "\n" in s else s

        line = [
            q(name),
            data_br,
            due_br,
            q(fin),
            q(prog),
            q(fmt_money_br(honor)),
            q(lab),
            q(csv_row.get("Componentes") or ""),
            q(csv_row.get("CC") or csv_row.get("Clinica") or ""),
            q(mref),
            q(obs),
            q(texto),
            q(fmt_money_br(practiced)),
            q(fmt_money_br(money(csv_row.get("Valor"))) if csv_row.get("Valor") not in (None, "") else ""),
            q(csv_row.get("Tipo") or ""),
        ]
        lines.append(",".join(line))
    return "\n".join(lines) + "\n"


def rows_to_custos_csv(rows: list[dict], month_map: dict) -> str:
    headers = ["Descrição", "Tipo", "Valor", "Data", "Vencimento", "CUSTOS", "Forma de Pg", "Status Pg", "NF-E", "Texto"]
    lines = [",".join(headers)]
    for row in rows:
        desc = str(pick(row, ["Descrição"])).strip()
        if not desc:
            continue
        center = month_name_from_relation(pick(row, ["CUSTOS"]), month_map)
        def q(s):
            s = str(s or "")
            return f'"{s}"' if "," in s or '"' in s else s
        date = date_iso(pick(row, ["date:Data:start"]))
        due = date_iso(pick(row, ["date:Vencimento:start"]))
        lines.append(
            ",".join(
                [
                    q(desc),
                    q(pick(row, ["Tipo"])),
                    q(fmt_money_br(money(pick(row, ["Valor"])))),
                    "/".join(reversed(date.split("-"))) if date else "",
                    "/".join(reversed(due.split("-"))) if due else "",
                    q(f"{center} ({relation_urls(pick(row, ['CUSTOS']))[0]})" if center and relation_urls(pick(row, ["CUSTOS"])) else center),
                    q(pick(row, ["Forma de Pg"])),
                    q(pick(row, ["Status Pg"])),
                    q(pick(row, ["NF-E"])),
                    q(pick(row, ["Texto"])),
                ]
            )
        )
    return "\n".join(lines) + "\n"


def main():
    month_map = load_month_map()
    synced_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    summary = {}
    mismatches = []

    jobs = [
        ("allon", load_allon_rows(), {"clinicId": "allon", "prefix": "allon", "origin": "Prestação", "source": "Allon Roter - Controle de Honorários (Notion MCP sync)"}, "allon-historico.json", "imports/allon-honorarios.csv"),
        ("daniele", json.loads((SYNC / "daniele.json").read_text()) if (SYNC / "daniele.json").exists() else [], {"clinicId": "daniele", "prefix": "dan", "origin": "Prestação", "source": "Daniele Belmiro - Controle de Honorários (Notion MCP sync)"}, "daniele-historico.json", "imports/daniele-honorarios.csv"),
        ("gerlucia", json.loads((SYNC / "gerlucia.json").read_text()) if (SYNC / "gerlucia.json").exists() else [], {"clinicId": "gerlucia", "prefix": "ger", "origin": "Prestação", "source": "Gerlúcia - Controle de Honorários (Notion MCP sync)"}, "gerlucia-historico.json", "imports/gerlucia-honorarios.csv"),
        ("particular", json.loads((SYNC / "particular.json").read_text()) if (SYNC / "particular.json").exists() else [], {"clinicId": "particular", "prefix": "par", "origin": "Particular", "source": "Particular - Controle de Honorários (Notion MCP sync)"}, "particular-historico.json", "imports/particular-honorarios.csv"),
    ]

    for kind, raw_rows, meta, out_file, csv_rel in jobs:
        if not raw_rows:
            mismatches.append(f"missing dump for {kind}")
            continue
        data = map_honorario_rows(raw_rows, meta, month_map, kind)
        OUT.joinpath(out_file).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        IMPORTS.mkdir(parents=True, exist_ok=True)
        IMPORTS.joinpath(Path(csv_rel).name).write_text(rows_to_honor_csv(raw_rows, kind, month_map), encoding="utf-8")
        summary[out_file] = data["count"]
        if kind == "allon" and data["count"] != 468:
            mismatches.append(f"allon expected 468 Notion rows, got {len(raw_rows)} raw / {data['count']} mapped")

    custos_rows = json.loads((SYNC / "custos.json").read_text()) if (SYNC / "custos.json").exists() else []
    if custos_rows:
        custos = map_custo_rows(custos_rows, month_map)
        OUT.joinpath("custos-historico.json").write_text(json.dumps(custos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        IMPORTS.joinpath("custos.csv").write_text(rows_to_custos_csv(custos_rows, month_map), encoding="utf-8")
        summary["custos-historico.json"] = custos["count"]

    manifest = {
        "version": 2,
        "format": "csv",
        "importsDir": "assets/data/imports",
        "syncedAt": synced_at,
        "source": "Notion MCP sync (financeiro/progresso/lab alinhados ao app)",
        "mapping": {
            "financeiro": {
                "Faturado / Recebido ($)": "Faturado / Recebido",
                "ACORDO": "Faturado / Recebido",
                "Aguardando Acerto": "Aguardando acerto",
                "NAO VAI RECEBER": "Não vai receber",
                "Recebido Parte": "Recebido parcial",
                "RETRABALHO": "Retrabalho",
                "Moldagem|COBRAR|Finalizar Endo|-|Não recebeu": "À receber",
            },
            "labAllon": {
                "Moldagem": "progresso Moldagem",
                "Prova OK": "progresso Aguardando Prova",
                "Cimentado": "progresso Aguardando Cimentação ou Alta se quitado",
                "Não": "sem lab monetário",
            },
        },
        "sources": [
            {"id": "allon", "file": "allon-historico.json", "csv": "imports/allon-honorarios.csv", "flag": "allonHistoricoV2", "label": "Allon Roter (honorários)", "kind": "patients", "clinicId": "allon"},
            {"id": "daniele", "file": "daniele-historico.json", "csv": "imports/daniele-honorarios.csv", "flag": "danieleHistoricoV2", "label": "Daniele Belmiro (honorários)", "kind": "patients", "clinicId": "daniele"},
            {"id": "gerlucia", "file": "gerlucia-historico.json", "csv": "imports/gerlucia-honorarios.csv", "flag": "gerluciaHistoricoV2", "label": "Gerlúcia (honorários)", "kind": "patients", "clinicId": "gerlucia"},
            {"id": "particular", "file": "particular-historico.json", "csv": "imports/particular-honorarios.csv", "flag": "particularHistoricoV2", "label": "Particular (honorários)", "kind": "patients", "clinicId": "particular"},
            {"id": "custos", "file": "custos-historico.json", "csv": "imports/custos.csv", "flag": "custosHistoricoV2", "label": "Controle de custos", "kind": "costs"},
        ],
    }
    OUT.joinpath("historico-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({"counts": summary, "mismatches": mismatches, "syncedAt": synced_at}, indent=2))


if __name__ == "__main__":
    main()
