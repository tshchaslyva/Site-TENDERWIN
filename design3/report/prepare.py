# -*- coding: utf-8 -*-
"""
Готує звіти для переглядача: сторінки PDF → зображення WebP (звичайне й чітке), координати фрагментів, зміст,
текст сторінок для читачів екрана. Перевіряє знеособлення (метадані, анотації, вкладення, коди, пошта, телефони).

Запуск із кореня репозиторію:  python3 design3/report/prepare.py            → design3/dist/report/ (публічно: заглушки)
                                python3 design3/report/prepare.py --private  → design3/dist-private/report/ (справжні звіти)
Результат: зображення сторінок, PDF для завантаження, reports.json
Оригінальні приватні звіти в публічний репозиторій не кладіть — лише погоджену знеособлену копію.
"""
import json, os, re, shutil, sys
import pymupdf  # PyMuPDF
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CFG = os.path.join(ROOT, "design3", "report", "reports.config.json")
PRIVATE = "--private" in sys.argv
OUT = os.path.join(ROOT, "design3", "dist-private" if PRIVATE else "dist", "report")
WIDTHS = {"": 1000, "@2x": 2000, "-t": 200}   # ширина зображення сторінки в пікселях; -t — мініатюра


def norm(s):
    s = s.replace(" ", " ").replace("’", "'").replace("ʼ", "'").replace("`", "'")
    return re.sub(r"\s+", " ", s).strip().lower()


def page_lines(page):
    out = []
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            t = "".join(s["text"] for s in l["spans"])
            if t.strip():
                out.append({"bbox": l["bbox"], "text": t})
    out.sort(key=lambda l: (round(l["bbox"][1]), l["bbox"][0]))
    return out


def range_text(page, start, end=None):
    """Текст фрагмента (для цитати в поясненні)"""
    lines = page_lines(page)
    ns, ne = norm(start), norm(end) if end else None
    i = next((k for k, l in enumerate(lines) if ns in norm(l["text"])), 0)
    j = next((k for k in range(i, len(lines)) if ne and ne in norm(lines[k]["text"])), i)
    return re.sub(r"\s+", " ", " ".join(l["text"] for l in lines[i:j + 1])).strip()


def find_range(page, start, end=None):
    """Прямокутник від рядка з текстом start до рядка з end (включно), у пунктах PDF"""
    lines = page_lines(page)
    ns, ne = norm(start), norm(end) if end else None
    i = next((k for k, l in enumerate(lines) if ns in norm(l["text"])), None)
    if i is None:
        raise SystemExit(f"  ✗ Не знайдено рядок «{start}» на сторінці {page.number + 1}")
    j = i
    if ne:
        j = next((k for k in range(i, len(lines)) if ne in norm(lines[k]["text"])), None)
        if j is None:
            raise SystemExit(f"  ✗ Не знайдено кінцевий рядок «{end}» на сторінці {page.number + 1}")
    xs0 = [l["bbox"][0] for l in lines[i:j + 1]]
    ys0 = [l["bbox"][1] for l in lines[i:j + 1]]
    xs1 = [l["bbox"][2] for l in lines[i:j + 1]]
    ys1 = [l["bbox"][3] for l in lines[i:j + 1]]
    return [min(xs0), min(ys0), max(xs1), max(ys1)]


def pct(rect, page, pad=4):
    w, h = page.rect.width, page.rect.height
    x0, y0, x1, y1 = rect[0] - pad, rect[1] - pad, rect[2] + pad, rect[3] + pad
    return {"x": round(max(0, x0) / w * 100, 3), "y": round(max(0, y0) / h * 100, 3),
            "w": round((min(w, x1) - max(0, x0)) / w * 100, 3), "h": round((min(h, y1) - max(0, y0)) / h * 100, 3)}


def privacy_check(doc, label):
    warn = []
    meta = {k: v for k, v in (doc.metadata or {}).items() if v}
    for k in ("author", "keywords"):
        if meta.get(k):
            warn.append(f"метадані {k}: {meta[k]}")
    if doc.embfile_count():
        warn.append(f"вкладені файли: {doc.embfile_count()}")
    text = ""
    for p in doc:
        if list(p.annots() or []):
            warn.append(f"анотації/коментарі на с. {p.number + 1}")
        if p.get_images():
            warn.append(f"зображення на с. {p.number + 1}: {len(p.get_images())} (перевірте підписи, печатки, скани)")
        text += p.get_text() + "\n"
    for name, rx in [("коди ЄДРПОУ/РНОКПП", r"(?<!\d)\d{8}(?!\d)|(?<!\d)\d{10}(?!\d)"), ("електронні адреси", r"[\w.+-]+@[\w-]+\.[\w.]+"),
                     ("телефони", r"\+?38\s?0\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}"), ("ID закупівель", r"UA-\d{4}-\d{2}-\d{2}-\d{6}-[a-z]"),
                     ("назви організацій", r"(?:ТОВ|ПП|ФОП|КСП|ПрАТ|ПАТ|АТ|КП|ДП)\s*[«\"][^»\"\n]{2,40}[»\"]")]:
        found = sorted(set(re.findall(rx, text)))
        if found:
            warn.append(f"{name}: {', '.join(found[:8])}{' …' if len(found) > 8 else ''}")
    print(f"  Перевірка знеособлення «{label}» (перевірте вручну, чи дозволено показувати):")
    for w in warn or ["нічого підозрілого не знайдено"]:
        print("   •", w)


def main():
    cfg = json.load(open(CFG, encoding="utf-8"))
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT, exist_ok=True)
    result = {"explain": cfg["explain"], "documents": []}
    docs = cfg["documents"]
    if PRIVATE:
        docs = cfg.get("private_documents", []) + [d for d in cfg["documents"] if d["id"] in cfg.get("private_with", [])]
        print("ПРИВАТНА збірка: справжні звіти — лише в design3/dist-private/ (не в git)")
    for d in docs:
        src = os.path.join(ROOT, d["pdf"])
        print(f"• {d['title']} ← {d['pdf']}")
        doc = pymupdf.open(src)
        privacy_check(doc, d["title"])
        folder = os.path.join(OUT, d["id"])
        os.makedirs(folder)
        pages = []
        for p in doc:
            item = {"n": p.number + 1, "ratio": round(p.rect.height / p.rect.width, 5), "text": re.sub(r"\s+", " ", p.get_text()).strip()}
            for suf, width in WIDTHS.items():
                pix = p.get_pixmap(matrix=pymupdf.Matrix(width / p.rect.width, width / p.rect.width), alpha=False)
                img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
                name = f"p{p.number + 1}{suf}.webp"
                img.save(os.path.join(folder, name), "WEBP", quality=82 if suf else 80, method=6)
                item["src" + {"": "", "@2x": "2x", "-t": "T"}[suf]] = f"report/{d['id']}/{name}"
            pages.append(item)
        def at(spec, pad=4):
            page = doc[spec["page"] - 1]
            return {"page": spec["page"], **pct(find_range(page, spec["start"], spec.get("end")), page, spec.get("pad", pad))}
        hl = [{"key": h["key"], **at(h), "text": range_text(doc[h["page"] - 1], h["start"], h.get("end"))[:420]} for h in d["highlights"]]
        toc = [{"title": t["title"], **at(t, 2)} for t in d["toc"]]
        shutil.copy(src, os.path.join(OUT, d["publicName"]))
        size_kb = round(os.path.getsize(src) / 1024)
        result["documents"].append({
            "id": d["id"], "short": d["short"], "title": d["title"], "kind": d["kind"], "placeholder": d.get("placeholder", False), "draft": d.get("draft", False),
            "pdf": f"report/{d['publicName']}", "pdfKb": size_kb, "pageCount": doc.page_count,
            "pages": pages, "focus": at(d["focus"]), "highlights": hl, "toc": toc,
        })
        print(f"  ✓ сторінок: {doc.page_count}, фрагментів: {len(hl)}, розділів змісту: {len(toc)}, PDF {size_kb} КБ")
    json.dump(result, open(os.path.join(OUT, "reports.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("готово:", os.path.relpath(OUT, ROOT))


if __name__ == "__main__":
    main()
