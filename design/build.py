# -*- coding: utf-8 -*-
"""
Генерує п'ять варіантів дизайну TenderWin: design/variant-N/index.html (+ стани форми).
Запуск: python3 design/build.py
Тексти — зі спільного design/content.py, тому однакові в усіх варіантах.
"""
import os
from content import *  # noqa: F401,F403

ROOT = os.path.dirname(os.path.abspath(__file__))
FIXEL = """@font-face{font-family:"Fixel";src:url("../../site/fonts/FixelText-Regular.woff2") format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:"Fixel";src:url("../../site/fonts/FixelText-SemiBold.woff2") format("woff2");font-weight:600;font-display:swap}
@font-face{font-family:"Fixel";src:url("../../site/fonts/FixelText-Bold.woff2") format("woff2");font-weight:700;font-display:swap}
@font-face{font-family:"Fixel Display";src:url("../../site/fonts/FixelDisplay-ExtraBold.woff2") format("woff2");font-weight:800;font-display:swap}
"""

BASE = """*{box-sizing:border-box}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{margin:0}
img,svg{max-width:100%}
a{color:inherit}
h1,h2,h3,p{margin:0}
.nw{white-space:nowrap}
.wrap{max-width:var(--wrap,1180px);margin-inline:auto;padding-inline:20px}
.ic{width:20px;height:20px;flex-shrink:0}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:.55em;font:inherit;font-weight:700;text-decoration:none;cursor:pointer;line-height:1.2;text-align:center;border:1.5px solid transparent}
.btn .ic{width:18px;height:18px}
.btn-block{width:100%}
details summary{cursor:pointer;list-style:none}
details summary::-webkit-details-marker{display:none}
.field{margin-bottom:16px}
.field label{display:block}
.field input,.field textarea{width:100%;font:inherit;max-width:100%}
.field textarea{min-height:104px;resize:vertical}
.field .hint,.field .err{display:block}
.field .err:empty{display:none}
.c-line .v,.c-line .k,.c-line small{display:block}
.row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.row .field{margin-bottom:16px}
@media(max-width:560px){.row{grid-template-columns:1fr;gap:0}}
.check{display:flex;gap:10px;align-items:flex-start;cursor:pointer;margin:0 0 14px}
.check input{width:18px;height:18px;margin-top:3px;flex-shrink:0}
.formmsg:empty{display:none}
.formmsg .more{display:block;margin-top:6px;font-weight:500}
.mobilebar{display:none}
.zd{position:fixed;right:18px;bottom:18px;z-index:70;width:58px;height:58px;border-radius:50%;display:grid;place-items:center}
.zd .ic{width:24px;height:24px}
.zd-label{position:absolute;right:66px;white-space:nowrap;font:600 11px/1.2 system-ui,sans-serif;padding:4px 7px;border-radius:6px;background:rgba(0,0,0,.72);color:#fff}
@media(max-width:740px){
  .mobilebar{display:flex;align-items:center;gap:12px;position:fixed;left:0;right:0;bottom:0;z-index:60;padding:10px 14px calc(10px + env(safe-area-inset-bottom,0px))}
  .mobilebar .mb-text{flex:1;min-width:0;font-size:.86rem;line-height:1.3}
  .mobilebar .btn{white-space:nowrap}
  body{padding-bottom:78px}
  .zd{bottom:88px;right:14px;width:52px;height:52px}
}
@media(max-width:359px){.mobilebar .mb-text{display:none}.mobilebar .btn{flex:1}}
.posts-note{font-size:.88rem;margin-top:6px}
.m-only{display:none}
@media(max-width:980px){.m-only{display:block}.d-only{display:none !important}}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
/* захист від горизонтальної прокрутки на 320 px */
.hero-grid>*,.form-grid>*,.form-wrap>*,.layout>*,.split>*,.margin-sec>*,.cols>*,.two>*,.cards>*,.grid2>*,.ledger-row>*,
.price-box>*,.price-card>*,.pricing>*,.person>*,.steps>*,.row>*,.foot-top>*{min-width:0}
input,textarea{min-width:0}
.c-line .v,.c-line .v a,.foot-bottom,.contacts p,.formmsg{overflow-wrap:anywhere}
@media(max-width:420px){.nav-phone{font-size:.88rem}.logo{font-size:1rem !important;letter-spacing:.02em !important}.logo svg{width:26px;height:26px}}
"""


def page(n, title, css, body, fonts_css=False):
    fonts = '<link rel="stylesheet" href="../fonts/fonts.css">' if fonts_css else ""
    return f"""<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Варіант {n}: {title} — TenderWin (макет)</title>
<meta name="robots" content="noindex">
{fonts}
<style>
{FIXEL}{BASE}{css}
</style>
</head>
<body>
{body}
</body>
</html>
"""


def header(cls, logo_html, phone_cls="nav-phone", btn_cls="btn btn-primary btn-sm"):
    return (f'<header class="{cls}"><div class="wrap nav">{logo_html}{nav_links()}'
            f'<div class="nav-cta"><a class="{phone_cls}" href="{PHONE_HREF}">{PHONE}</a>'
            f'<a class="{btn_cls}" href="#zayavka">{BTN_MAIN}</a></div></div></header>')


# =====================================================================
# ВАРІАНТ 1 — «Еволюція»: чинна темно-синя й золота палітра, більше повітря, пропозиція в першому екрані
# =====================================================================
V1_CSS = """
:root{--ink:#0B1B2B;--ink2:#112538;--gold:#D9A441;--gold2:#ECC06A;--ivory:#FAF7F0;--paper:#fff;--text:#13202D;--muted:#4C5D6E;--line:#E4DED2;--wrap:1200px}
body{font-family:"Fixel",system-ui,sans-serif;font-size:17px;line-height:1.65;color:var(--text);background:var(--ivory);-webkit-font-smoothing:antialiased}
h1,h2{font-family:"Fixel Display","Fixel",sans-serif;font-weight:800;letter-spacing:-.025em;line-height:1.1}
h3{font-size:1.15rem;line-height:1.3}
.btn{border-radius:12px;padding:.95em 1.6em;font-size:1rem}
.btn-primary{background:var(--gold);color:#241602;border-color:var(--gold)}
.btn-primary:hover{background:var(--gold2)}
.btn-secondary{color:#fff;border-color:rgba(255,255,255,.35)}
.btn-sm{padding:.62em 1.1em;font-size:.94rem}
:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
.top{position:sticky;top:0;z-index:50;background:rgba(11,27,43,.96);border-bottom:1px solid rgba(255,255,255,.07)}
.nav{display:flex;align-items:center;gap:26px;height:72px}
.logo{display:flex;gap:10px;align-items:center;color:#fff;text-decoration:none;font:800 1.2rem "Fixel Display",sans-serif}
.logo-t span{color:var(--gold)}
.nav-links{display:flex;gap:24px;margin-left:auto;font-weight:600;font-size:.95rem}
.nav-links a{color:#C7D4E1;text-decoration:none}
.nav-cta{display:flex;gap:18px;align-items:center}
.nav-phone{color:#fff;font-weight:700;text-decoration:none;white-space:nowrap}
@media(max-width:1120px){.nav-links{display:none}.nav-cta{margin-left:auto}}
@media(max-width:640px){.nav-cta .btn{display:none}.nav{height:62px}}
.hero{background:radial-gradient(800px 420px at 90% 0%,rgba(217,164,65,.16),transparent 60%),var(--ink);color:#E9F0F6;padding:84px 0 92px}
.hero-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:64px;align-items:center}
@media(max-width:980px){.hero-grid{grid-template-columns:1fr;gap:36px}.hero{padding:40px 0 56px}}
.kicker{display:inline-block;font-size:.84rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);margin-bottom:20px}
.hero h1{font-size:clamp(2rem,4.8vw,3.4rem);color:#fff}
.lede{margin-top:20px;font-size:1.14rem;color:#C9D6E2;max-width:58ch}
.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}
@media(max-width:520px){.actions .btn{flex:1 1 100%}}
.hero-note{margin-top:14px;font-size:.92rem;color:#A9BCCF}
.m-offer{margin-top:22px;padding:16px 18px;border:1px solid rgba(217,164,65,.55);border-radius:14px;background:rgba(255,255,255,.05)}
.m-offer b{display:block;font:800 1.2rem/1.3 "Fixel Display",sans-serif;color:#fff}.m-offer .price{color:var(--gold)}
.m-offer .sub{display:block;margin-top:6px;color:#C9D6E2;font-size:.95rem}
.offer-card{background:#fff;color:var(--text);border-radius:22px;padding:34px 32px;box-shadow:0 30px 60px -28px rgba(0,0,0,.6);position:relative}
.offer-card::before{content:"";position:absolute;inset:0 0 auto 0;height:5px;border-radius:22px 22px 0 0;background:var(--gold)}
.offer-card .lbl{font-size:.8rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#7A5410}
.offer-card .offer-line b{display:block;font:800 1.5rem/1.25 "Fixel Display",sans-serif;margin-top:10px;letter-spacing:-.02em}
.offer-card .price{display:block;font-size:3.1rem;line-height:1;color:var(--ink)}
.offer-card .sub{display:block;margin-top:12px;color:var(--muted);font-size:1rem}
.offer-card .desc{margin-top:18px;padding-top:18px;border-top:1px solid var(--line);color:var(--muted);font-size:.96rem}
.offer-card .btn{margin-top:24px;width:100%}
section{padding:96px 0}
@media(max-width:700px){section{padding:64px 0}}
.sec-head{max-width:760px;margin-bottom:44px}
.eyebrow{display:flex;gap:12px;align-items:center;font-size:.8rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#7A5410;margin-bottom:14px}
.eyebrow b{font:800 .95rem "Fixel Display",sans-serif;color:var(--gold);letter-spacing:0}
.sec-head h2{font-size:clamp(1.7rem,3.4vw,2.5rem);color:var(--ink)}
.sec-head p{margin-top:14px;font-size:1.1rem;color:var(--muted)}
.grid2{display:grid;grid-template-columns:1.1fr .9fr;gap:24px}
@media(max-width:860px){.grid2{grid-template-columns:1fr}}
.card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:32px}
.card h3{font-size:1.3rem;margin-bottom:14px;color:var(--ink)}
.checklist{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.checklist li{display:flex;gap:12px}
.checklist .ic{color:#1F7A55;margin-top:3px}
.card p{color:var(--muted)}
.note{margin-top:22px;padding:18px 22px;border-left:4px solid var(--gold);background:#fff;border-radius:0 12px 12px 0;color:#4A3A12}
.person{display:grid;grid-template-columns:200px 1fr;gap:40px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:22px;padding:36px}
@media(max-width:700px){.person{grid-template-columns:1fr;padding:26px}}
.photo{aspect-ratio:4/5;border-radius:16px;background:repeating-linear-gradient(135deg,#EFE9DC 0 12px,#F6F1E6 12px 24px);display:grid;place-items:center;text-align:center;font-size:.8rem;color:#7A6A4A;padding:12px}
.person h3{font:800 1.6rem "Fixel Display",sans-serif;color:var(--ink)}
.person blockquote{margin:16px 0 0;font-size:1.12rem;line-height:1.6}
.person .meta{margin-top:14px;color:var(--muted);font-size:.92rem}
.steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,1fr);gap:0;border:1px solid var(--line);border-radius:20px;background:#fff;overflow:hidden}
@media(max-width:1000px){.steps{grid-template-columns:repeat(2,1fr)}}
@media(max-width:600px){.steps{grid-template-columns:1fr}}
.step{padding:30px 26px;border-right:1px solid var(--line)}
.step:last-child{border-right:0}
@media(max-width:1000px){.step{border-bottom:1px solid var(--line)}}
.step-top{display:flex;gap:10px;align-items:center;margin-bottom:16px}
.step-n{font:800 2.4rem/1 "Fixel Display",sans-serif;color:var(--gold)}
.tag{font-size:.74rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#1F7A55;background:#E7F4EE;padding:4px 9px;border-radius:6px}
.step h3{margin-bottom:8px;color:var(--ink)}
.step p{color:var(--muted);font-size:.98rem}
.step-link{display:inline-block;margin-top:12px;font-weight:700;color:var(--ink);text-decoration-color:var(--gold);text-underline-offset:4px}
.price-band{background:var(--ink);color:#E9F0F6}
.price-box{display:grid;grid-template-columns:1.4fr .6fr;border:1px solid rgba(217,164,65,.5);border-radius:24px;overflow:hidden}
@media(max-width:860px){.price-box{grid-template-columns:1fr}}
.price-main{padding:44px}
.price-main h2{font-size:clamp(1.5rem,3vw,2.2rem);color:#fff}
.price-main p{margin-top:16px;color:#C9D6E2}
.price-main .limits{padding-top:16px;border-top:1px solid rgba(255,255,255,.12);font-size:.96rem;color:#A9BCCF}
.price-side{background:rgba(255,255,255,.04);padding:44px;display:flex;flex-direction:column;justify-content:center;gap:14px;border-left:1px solid rgba(217,164,65,.3)}
.price-side .big{font:800 3.4rem/1 "Fixel Display",sans-serif;color:var(--gold)}
.price-side p{color:#C9D6E2}
.fine{margin-top:22px;color:#A9BCCF;font-size:.96rem}
.fine b{color:#fff}
.price-band .eyebrow{color:var(--gold)}
.faq{max-width:900px}
.faq details{border-bottom:1px solid var(--line)}
.faq summary{padding:22px 48px 22px 0;font-weight:700;font-size:1.08rem;position:relative;color:var(--ink)}
.faq summary::after{content:"+";position:absolute;right:6px;top:18px;font:800 1.5rem "Fixel Display";color:var(--gold)}
.faq details[open] summary::after{content:"–"}
.faq .answer{padding:0 0 22px;color:var(--muted);max-width:80ch}
.faq ol{padding-left:1.3em;margin:10px 0 0}
.faq li+li{margin-top:6px}
.form-sec{background:var(--ink);color:#E9F0F6}
.form-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:56px;align-items:start}
@media(max-width:940px){.form-grid{grid-template-columns:1fr}}
.form-sec h2{font-size:clamp(1.7rem,3.4vw,2.5rem);color:#fff}
.form-sec .sub{margin-top:12px;color:#C9D6E2}
.form{margin-top:28px;background:var(--ink2);border:1px solid #27445F;border-radius:20px;padding:30px}
.field label{font-weight:700;font-size:.9rem;margin-bottom:7px;color:#D3DEE8}
.req{color:var(--gold)}.opt{font-weight:500;color:#A9BCCF}
.field input,.field textarea{padding:13px 14px;border-radius:11px;border:1.5px solid #4F76A0;background:#0A1726;color:#fff}
.field input::placeholder,.field textarea::placeholder{color:#8AA2B8}
.field input[aria-invalid=true]{border-color:#FFB4AB}
.hint{font-size:.83rem;color:#A9BCCF;margin-top:5px}
.err{font-size:.88rem;font-weight:600;color:#FFB4AB;margin-top:5px}
.check{font-size:.92rem;color:#C9D6E2}
.check a{color:var(--gold)}
.check input{accent-color:var(--gold)}
.formmsg{margin-top:16px;padding:15px 18px;border-radius:11px;background:#E7F4EE;color:#145C40;font-weight:600}
.form-note{margin-top:14px;font-size:.86rem;color:#A9BCCF}
.btn-block{padding:1em}
.contacts{background:var(--ink2);border:1px solid #27445F;border-radius:20px;padding:30px;margin-top:108px}
@media(max-width:940px){.contacts{margin-top:0}}
.contacts h3{color:#fff;font-size:1.3rem}
.contacts>p{margin-top:8px;color:#C9D6E2;font-size:.97rem}
.c-line{display:flex;gap:14px;align-items:center;padding:14px 0;border-bottom:1px solid #27445F}
.c-line .ic{color:var(--gold)}
.c-line .k{display:block;font-size:.74rem;letter-spacing:.1em;text-transform:uppercase;color:#A9BCCF;font-weight:700}
.c-line .v a{color:#fff;font-weight:700;text-decoration:none;border-bottom:1px solid rgba(217,164,65,.5)}
.c-line small a{color:#D3DEE8;font-size:.86rem}
.executor{margin-top:14px;font-size:.86rem;color:#A9BCCF}
.posts{background:var(--ivory);padding:48px 0;border-top:1px solid var(--line)}
.posts-link a{font-weight:700;color:var(--ink)}
.posts-note{color:var(--muted)}
.footer{background:#07131F;color:#A9BCCF;padding:52px 0 34px;font-size:.93rem}
.foot-top{display:flex;flex-wrap:wrap;gap:28px;justify-content:space-between}
.foot-about{max-width:52ch}.foot-about p{margin-top:12px}
.foot-about a,.foot-links a,.foot-bottom a,.foot-privacy a{color:#D3DEE8;text-decoration:none}
.foot-links{display:flex;flex-wrap:wrap;gap:10px 22px}
.foot-privacy{margin-top:24px}
.foot-bottom{margin-top:24px;padding-top:20px;border-top:1px solid #23405C;display:flex;flex-wrap:wrap;gap:8px 24px;justify-content:space-between}
.mobilebar{background:rgba(11,27,43,.97);color:#E9F0F6;border-top:1px solid #23405C}
.mobilebar .btn{padding:.8em 1.1em}
.zd{background:var(--gold);color:#241602;box-shadow:0 10px 24px -8px rgba(0,0,0,.5)}
"""


def v1(state=""):
    body = f"""{header("top", logo())}
<main id="top">
<div class="hero"><div class="wrap hero-grid">
  <div><p class="kicker">{KICKER}</p><h1>{H1}</h1><p class="lede">{LEDE}</p>
    <div class="m-only m-offer">{offer_block()}</div>{hero_buttons()}<p class="hero-note">{HERO_NOTE}</p></div>
  <div class="offer-card d-only"><p class="lbl">Пропозиція</p>{offer_block()}<p class="desc">{PRICE_DESC}</p><a class="btn btn-primary" href="#zayavka">{BTN_MAIN}</a></div>
</div></div>
<section id="rezultat"><div class="wrap">
  <div class="sec-head"><p class="eyebrow"><b>01</b>{RES_EYEBROW}</p><h2>{RES_H2}</h2><p>{RES_LEDE}</p></div>
  <div class="grid2"><div class="card"><h3>{STRUCT_LABEL}</h3>{result_list()}</div>
  <div class="card"><h3>{CONS_H3}</h3><p>{CONS_TEXT}</p></div></div>
  <p class="note">{RES_NOTE}</p></div></section>
<section id="khto" style="padding-top:0"><div class="wrap">
  <div class="sec-head"><p class="eyebrow"><b>02</b>{WHO_EYEBROW}</p><h2>{WHO_H2}</h2></div>
  <div class="person"><div class="photo">{WHO_PHOTO_NOTE}</div><div><h3>{WHO_NAME}</h3><blockquote>{WHO_QUOTE}</blockquote><p class="meta">{WHO_META}</p></div></div>
</div></section>
<section id="yak" style="padding-top:0"><div class="wrap">
  <div class="sec-head"><p class="eyebrow"><b>03</b>{HOW_EYEBROW}</p><h2>{HOW_H2}</h2></div>{steps()}</div></section>
<section id="vartist" class="price-band"><div class="wrap">
  <p class="eyebrow"><b>04</b>{PRICE_EYEBROW}</p>
  <div class="price-box"><div class="price-main"><h2>{PRICE_H2}</h2><p>{PRICE_DESC}</p><p class="limits">{PRICE_LIMITS}</p></div>
  <div class="price-side"><span class="big">3{NB}499 <small style="font-size:1.2rem">грн</small></span><p>{PRICE_INCL}</p><a class="btn btn-primary" href="#zayavka">{BTN_MAIN}</a></div></div>
  <p class="fine"><b>{CONTRACT}</b> {REMOTE}</p></div></section>
<section id="pytannya"><div class="wrap"><div class="sec-head"><p class="eyebrow"><b>05</b>{FAQ_EYEBROW}</p><h2>{FAQ_H2}</h2></div>{faq()}</div></section>
<section id="zayavka" class="form-sec"><div class="wrap form-grid">
  <div><p class="eyebrow" style="color:var(--gold)"><b>06</b>{FORM_EYEBROW}</p><h2>{FORM_H2}</h2><p class="sub">{FORM_SUB}</p>{form(state=state)}</div>
  {contacts()}</div></section>
{posts()}
</main>
{footer()}
{mobilebar()}{zadarma()}"""
    return page(1, "Еволюція", V1_CSS, body)


# =====================================================================
# ВАРІАНТ 2 — «Редакційний»: світлий папір, класичний антиквенний шрифт, бордовий акцент
# =====================================================================
V2_CSS = """
:root{--paper:#FBFAF7;--ink:#17171A;--muted:#55504A;--rule:#D8D2C7;--acc:#7A1E2C;--acc2:#5E1521;--soft:#F3EFE7;--wrap:1240px}
body{font-family:"Fixel",system-ui,sans-serif;font-size:17px;line-height:1.7;color:var(--ink);background:var(--paper)}
h1,h2,h3{font-family:"Source Serif 4",Georgia,serif;font-weight:600;letter-spacing:-.01em;line-height:1.15}
.btn{border-radius:2px;padding:1em 1.7em;font-size:.98rem;letter-spacing:.02em}
.btn-primary{background:var(--acc);color:#fff}
.btn-primary:hover{background:var(--acc2)}
.btn-secondary{color:var(--ink);border-color:var(--ink);background:transparent}
.btn-sm{padding:.65em 1.1em;font-size:.92rem}
:focus-visible{outline:3px solid var(--acc);outline-offset:3px}
.top{border-bottom:1px solid var(--ink);background:var(--paper);position:sticky;top:0;z-index:50}
.nav{display:flex;align-items:center;gap:28px;height:74px}
.logo{display:flex;gap:10px;align-items:center;text-decoration:none;color:var(--ink);font:700 1.25rem "Source Serif 4",serif;letter-spacing:.06em}
.logo-t span{color:var(--acc)}
.nav-links{display:flex;gap:24px;margin-left:auto;font-size:.92rem}
.nav-links a{text-decoration:none;color:var(--muted)}
.nav-cta{display:flex;gap:18px;align-items:center}
.nav-phone{text-decoration:none;font-weight:700;white-space:nowrap}
@media(max-width:1160px){.nav-links{display:none}.nav-cta{margin-left:auto}}
@media(max-width:640px){.nav-cta .btn{display:none}.nav{height:62px}}
.hero{padding:72px 0 64px;border-bottom:1px solid var(--rule)}
.hero-grid{display:grid;grid-template-columns:1.45fr .8fr;gap:72px;align-items:center}
@media(max-width:980px){.hero-grid{grid-template-columns:1fr;gap:34px}.hero{padding:36px 0 44px}}
.kicker{font-size:.8rem;letter-spacing:.2em;text-transform:uppercase;color:var(--acc);font-weight:700;padding-bottom:16px;border-bottom:1px solid var(--rule);margin-bottom:26px}
.hero h1{font-size:clamp(2.3rem,5.6vw,4.4rem);font-weight:600;line-height:1.04;letter-spacing:-.02em}
.lede{margin-top:26px;font-family:"Source Serif 4",serif;font-size:1.28rem;line-height:1.55;color:#2C2A27;max-width:56ch}
.actions{display:flex;gap:14px;flex-wrap:wrap;margin-top:30px}
@media(max-width:520px){.actions .btn{flex:1 1 100%}}
.hero-note{margin-top:14px;font-size:.92rem;color:var(--muted)}
@media(max-width:600px){.hero h1{font-size:2.1rem}.lede{font-size:1.1rem;margin-top:18px}}
.offer-box{border-top:4px solid var(--acc);background:#fff;padding:28px 28px 26px;box-shadow:0 1px 0 var(--rule)}
.m-box{margin-top:22px;padding:18px 18px 16px}.m-box .offer-line b{margin-top:0}.m-box .offer-line .price{font-size:2.2rem}
.offer-box .lbl{font-size:.76rem;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);font-weight:700}
.offer-line b{display:block;font:600 1.45rem/1.3 "Source Serif 4",serif;margin-top:10px}
.offer-line .price{display:block;font-size:3rem;color:var(--acc);line-height:1.05}
.offer-line .sub{display:block;margin-top:12px;color:var(--muted);font-size:.98rem}
.margin-sec{display:grid;grid-template-columns:220px 1fr;gap:48px;padding:80px 0;border-bottom:1px solid var(--rule)}
@media(max-width:860px){.margin-sec{grid-template-columns:1fr;gap:12px;padding:52px 0}}
.mlabel{font-size:.78rem;letter-spacing:.2em;text-transform:uppercase;color:var(--acc);font-weight:700;padding-top:10px;border-top:2px solid var(--acc);align-self:start}
.mlabel span{display:block;font:600 2.2rem/1 "Source Serif 4",serif;letter-spacing:0;color:var(--ink);margin-top:10px}
.mbody h2{font-size:clamp(1.8rem,3.6vw,2.7rem)}
.mbody>p.lead{margin-top:16px;font-family:"Source Serif 4",serif;font-size:1.2rem;color:#2C2A27;max-width:62ch}
.cols{display:grid;grid-template-columns:1.2fr .8fr;gap:44px;margin-top:34px}
@media(max-width:860px){.cols{grid-template-columns:1fr;gap:26px}}
.cols h3{font-size:1.35rem;margin-bottom:12px}
.checklist{list-style:none;margin:0;padding:0;counter-reset:c}
.checklist li{display:flex;gap:14px;padding:12px 0;border-top:1px solid var(--rule)}
.checklist li::before{counter-increment:c;content:counter(c,upper-roman) ".";font:600 1rem "Source Serif 4",serif;color:var(--acc);min-width:28px}
.checklist .ic{display:none}
.aside-card{background:var(--soft);padding:26px;border-left:3px solid var(--acc)}
.aside-card p{color:#3A3631}
.note{margin-top:30px;font-family:"Source Serif 4",serif;font-style:italic;font-size:1.12rem;color:#3A3631;max-width:70ch}
.person{display:grid;grid-template-columns:180px 1fr;gap:34px;margin-top:30px;align-items:start}
@media(max-width:600px){.person{grid-template-columns:1fr}}
.photo{aspect-ratio:4/5;background:repeating-linear-gradient(45deg,#ECE6DB 0 10px,#F4F0E8 10px 20px);display:grid;place-items:center;text-align:center;font-size:.78rem;color:#6B6257;padding:10px;filter:grayscale(1)}
.person h3{font-size:1.6rem}
.person blockquote{margin:14px 0 0;font:400 1.3rem/1.5 "Source Serif 4",serif;color:#2C2A27}
.person blockquote::before{content:"«";color:var(--acc)}.person blockquote::after{content:"»";color:var(--acc)}
.person .meta{margin-top:14px;font-size:.92rem;color:var(--muted)}
.steps{list-style:none;margin:30px 0 0;padding:0;display:grid;gap:0}
.step{display:grid;grid-template-columns:90px 1fr;gap:6px 24px;padding:24px 0;border-top:1px solid var(--rule)}
.step-top{grid-row:span 3;display:flex;flex-direction:column;gap:8px}
.step-n{font:600 3.2rem/1 "Source Serif 4",serif;color:var(--acc)}
.tag{font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:var(--muted)}
.step h3{font-size:1.3rem}
.step p{color:var(--muted);max-width:64ch}
.step-link{font-weight:700;color:var(--acc)}
.ledger{margin-top:30px;border-top:2px solid var(--ink);border-bottom:2px solid var(--ink)}
.ledger-row{display:grid;grid-template-columns:1fr auto;gap:24px;padding:22px 0;border-bottom:1px solid var(--rule);align-items:baseline}
.ledger-row:last-child{border-bottom:0}
.ledger-row h3{font-size:1.45rem}
.ledger-row .amt{font:600 2.6rem/1 "Source Serif 4",serif;color:var(--acc);white-space:nowrap}
.ledger-row p{color:var(--muted)}
.ledger .btn{margin-top:4px}
@media(max-width:600px){.ledger-row{grid-template-columns:1fr}.ledger-row .amt{font-size:2.2rem}}
.fine{margin-top:18px;font-size:.95rem;color:var(--muted)}
.fine b{color:var(--ink)}
.faq{margin-top:26px;border-top:1px solid var(--ink)}
.faq details{border-bottom:1px solid var(--rule)}
.faq summary{padding:20px 44px 20px 0;font:600 1.2rem/1.4 "Source Serif 4",serif;position:relative}
.faq summary::after{content:"+";position:absolute;right:4px;top:16px;font:400 1.6rem "Source Serif 4";color:var(--acc)}
.faq details[open] summary::after{content:"−"}
.faq .answer{padding:0 0 22px;color:#3A3631;max-width:76ch}
.faq ol{margin:10px 0 0;padding-left:1.3em}
.form-wrap{display:grid;grid-template-columns:1.25fr .75fr;gap:48px;margin-top:28px}
@media(max-width:940px){.form-wrap{grid-template-columns:1fr}}
.form{background:#fff;border:1px solid var(--rule);padding:32px}
.field label{font-size:.88rem;font-weight:700;margin-bottom:6px}
.req{color:var(--acc)}.opt{font-weight:400;color:var(--muted)}
.field input,.field textarea{padding:12px 2px;border:0;border-bottom:1.5px solid #6E675E;background:transparent;border-radius:0}
.field textarea{border:1.5px solid #6E675E;padding:12px}
.field input:focus,.field textarea:focus{outline:none;border-color:var(--acc);box-shadow:0 2px 0 0 var(--acc)}
.field input[aria-invalid=true]{border-color:#B42318}
.field input::placeholder,.field textarea::placeholder{color:#76706A}
.hint{font-size:.82rem;color:var(--muted);margin-top:5px}
.err{font-size:.86rem;font-weight:600;color:#B42318;margin-top:5px}
.check{font-size:.92rem;color:#3A3631}
.check a{color:var(--acc)}
.check input{accent-color:var(--acc)}
.btn-block{padding:1.05em}
.formmsg{margin-top:16px;padding:14px 16px;background:#EEF5EF;border-left:3px solid #1E6B47;color:#1E5A3D;font-weight:600}
.formmsg a{color:inherit}
.form-note{margin-top:14px;font-size:.85rem;color:var(--muted)}
.contacts{border-top:4px solid var(--ink);padding-top:22px}
.contacts h3{font-size:1.5rem}
.contacts>p{margin-top:10px;color:#3A3631}
.c-line{display:flex;gap:14px;align-items:center;padding:13px 0;border-bottom:1px solid var(--rule)}
.c-line .ic{color:var(--acc)}
.c-line .k{display:block;font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);font-weight:700}
.c-line .v a{font-weight:700;text-decoration:none;border-bottom:1px solid var(--acc)}
.c-line small a{font-size:.86rem;color:var(--muted)}
.executor{margin-top:14px;font-size:.86rem;color:var(--muted)}
.posts{padding:44px 0;border-bottom:1px solid var(--rule)}
.eyebrow{font-size:.78rem;letter-spacing:.2em;text-transform:uppercase;color:var(--acc);font-weight:700}
.posts-link a{font:600 1.25rem "Source Serif 4",serif}
.posts-note{color:var(--muted)}
.footer{background:var(--ink);color:#C9C3BA;padding:52px 0 32px;font-size:.92rem}
.footer .logo{color:#fff}.footer .logo-t span{color:#E6B3BC}
.foot-top{display:flex;flex-wrap:wrap;gap:28px;justify-content:space-between}
.foot-about{max-width:54ch}.foot-about p{margin-top:12px}
.footer a{color:#EDE8E0;text-decoration:none}
.foot-links{display:flex;flex-wrap:wrap;gap:10px 22px}
.foot-privacy{margin-top:24px}
.foot-bottom{margin-top:24px;padding-top:18px;border-top:1px solid #3A3833;display:flex;flex-wrap:wrap;gap:8px 24px;justify-content:space-between}
.mobilebar{background:var(--paper);border-top:2px solid var(--ink)}
.mobilebar .btn{padding:.8em 1.1em}
.zd{background:var(--ink);color:#fff;border-radius:50%}
"""


def v2(state=""):
    body = f"""{header("top", logo(mark_bg="#17171A", mark_fg="#E6B3BC"))}
<main id="top"><div class="wrap">
<div class="hero"><div class="hero-grid">
  <div><p class="kicker">{KICKER}</p><h1>{H1}</h1><p class="lede">{LEDE}</p><div class="m-only offer-box m-box">{offer_block()}</div>{hero_buttons(arrow=False)}<p class="hero-note">{HERO_NOTE}</p></div>
  <div class="offer-box d-only"><p class="lbl">Пропозиція</p>{offer_block()}</div>
</div></div>
<div class="margin-sec" id="rezultat"><p class="mlabel">{RES_EYEBROW}<span>I</span></p><div class="mbody">
  <h2>{RES_H2}</h2><p class="lead">{RES_LEDE}</p>
  <div class="cols"><div><h3>{STRUCT_LABEL}</h3>{result_list()}</div><div class="aside-card"><h3>{CONS_H3}</h3><p>{CONS_TEXT}</p></div></div>
  <p class="note">{RES_NOTE}</p></div></div>
<div class="margin-sec" id="khto"><p class="mlabel">{WHO_EYEBROW}<span>II</span></p><div class="mbody"><h2>{WHO_H2}</h2>
  <div class="person"><div class="photo">{WHO_PHOTO_NOTE}</div><div><h3>{WHO_NAME}</h3><blockquote>{WHO_QUOTE}</blockquote><p class="meta">{WHO_META}</p></div></div></div></div>
<div class="margin-sec" id="yak"><p class="mlabel">{HOW_EYEBROW}<span>III</span></p><div class="mbody"><h2>{HOW_H2}</h2>{steps()}</div></div>
<div class="margin-sec" id="vartist"><p class="mlabel">{PRICE_EYEBROW}<span>IV</span></p><div class="mbody">
  <div class="ledger"><div class="ledger-row"><h3>{PRICE_H2}</h3><span class="amt">{PRICE}</span></div>
  <div class="ledger-row"><p>{PRICE_DESC} {PRICE_INCL}</p><a class="btn btn-primary" href="#zayavka">{BTN_MAIN}</a></div>
  <div class="ledger-row"><p>{PRICE_LIMITS}</p></div></div>
  <p class="fine"><b>{CONTRACT}</b> {REMOTE}</p></div></div>
<div class="margin-sec" id="pytannya"><p class="mlabel">{FAQ_EYEBROW}<span>V</span></p><div class="mbody"><h2>{FAQ_H2}</h2>{faq()}</div></div>
<div class="margin-sec" id="zayavka"><p class="mlabel">{FORM_EYEBROW}<span>VI</span></p><div class="mbody"><h2>{FORM_H2}</h2><p class="lead">{FORM_SUB}</p>
  <div class="form-wrap">{form(state=state)}{contacts()}</div></div></div>
</div>
{posts()}
</main>
{footer(logo_html=logo(mark_bg="#2A2A2E", mark_fg="#E6B3BC"))}
{mobilebar()}{zadarma()}"""
    return page(2, "Редакційний", V2_CSS, body, fonts_css=True)


# =====================================================================
# ВАРІАНТ 3 — «Аналітична записка»: сторінка як документ, бічна панель із ціною, примітки-посилання
# =====================================================================
V3_CSS = """
:root{--bg:#EEF2F5;--sheet:#fff;--ink:#0E1726;--muted:#46576A;--line:#D6DEE6;--acc:#0F6B63;--acc2:#0B544E;--hl:#E3F1EE;--mono:"IBM Plex Mono",ui-monospace,monospace;--wrap:1240px}
body{font-family:"IBM Plex Sans",system-ui,sans-serif;font-size:17px;line-height:1.65;color:var(--ink);background:var(--bg)}
h1,h2,h3{font-weight:600;letter-spacing:-.015em;line-height:1.18}
.btn{border-radius:8px;padding:.95em 1.5em;font-size:1rem}
.btn-primary{background:var(--acc);color:#fff}
.btn-primary:hover{background:var(--acc2)}
.btn-secondary{background:#fff;color:var(--ink);border-color:#9FB0C0}
.btn-sm{padding:.6em 1em;font-size:.92rem}
:focus-visible{outline:3px solid #F2B705;outline-offset:2px}
.top{background:var(--ink);color:#fff;position:sticky;top:0;z-index:50}
.nav{display:flex;align-items:center;gap:24px;height:64px}
.logo{display:flex;gap:10px;align-items:center;color:#fff;text-decoration:none;font:600 1.12rem var(--mono);letter-spacing:.04em}
.logo-t span{color:#7FD1C5}
.nav-links{display:flex;gap:22px;margin-left:auto;font-size:.9rem;font-family:var(--mono)}
.nav-links a{color:#C6D2DE;text-decoration:none}
.nav-cta{display:flex;gap:16px;align-items:center}
.nav-phone{color:#fff;text-decoration:none;font-weight:600;white-space:nowrap}
@media(max-width:1160px){.nav-links{display:none}.nav-cta{margin-left:auto}}
@media(max-width:640px){.nav-cta .btn{display:none}}
.layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:32px;align-items:start;padding:36px 0 64px}
@media(max-width:1060px){.layout{grid-template-columns:1fr;padding-top:20px}}
.sheet{background:var(--sheet);border:1px solid var(--line);border-radius:6px;padding:48px 56px;box-shadow:0 18px 40px -30px rgba(14,23,38,.35)}
@media(max-width:700px){.sheet{padding:26px 20px}}
.sheet+.sheet{margin-top:22px}
.memo-head{display:flex;flex-wrap:wrap;gap:8px 22px;font:500 .8rem var(--mono);color:var(--muted);padding-bottom:14px;border-bottom:1px dashed var(--line);margin-bottom:24px;text-transform:uppercase;letter-spacing:.06em}
.memo-head b{color:var(--acc)}
.kicker{font:500 .86rem var(--mono);color:var(--acc);margin-bottom:12px}
.hero h1{font-size:clamp(2rem,4.6vw,3.3rem)}
.lede{margin-top:18px;font-size:1.14rem;color:#24364A;max-width:62ch}
.offer-line{margin-top:24px;padding:18px 20px;background:var(--hl);border-left:4px solid var(--acc);border-radius:0 8px 8px 0}
.offer-line b{display:block;font-size:1.3rem}
.offer-line .price{color:var(--acc)}
.offer-line .sub{display:block;margin-top:6px;color:#24364A}
.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}
@media(max-width:520px){.actions .btn{flex:1 1 100%}}
.hero-note{margin-top:12px;font-size:.92rem;color:var(--muted)}
.chap{font:500 .82rem var(--mono);color:var(--acc);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px}
.sheet h2{font-size:clamp(1.6rem,3vw,2.2rem)}
.sheet .lead{margin-top:12px;color:#24364A;font-size:1.06rem;max-width:66ch}
.two{display:grid;grid-template-columns:1.1fr .9fr;gap:28px;margin-top:26px}
@media(max-width:860px){.two{grid-template-columns:1fr}}
.checklist{list-style:none;margin:0;padding:0;counter-reset:f}
.checklist li{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--line)}
.checklist li::before{counter-increment:f;content:"[" counter(f) "]";font:500 .9rem var(--mono);color:var(--acc);min-width:32px;padding-top:2px}
.checklist .ic{display:none}
.box{border:1px solid var(--line);border-radius:8px;padding:22px}
.box h3{font-size:1.18rem;margin-bottom:10px}
.box p{color:var(--muted)}
.doc{border:1px solid var(--line);border-radius:8px;padding:18px;background:#FAFCFD;font-size:.86rem}
.doc-head{display:flex;gap:10px;align-items:center;padding-bottom:10px;border-bottom:1px solid var(--line)}
.doc-head small{color:var(--muted);font-family:var(--mono)}
.doc-head em{margin-left:auto;font-style:normal;font:600 .72rem var(--mono);color:var(--acc);background:var(--hl);padding:3px 7px;border-radius:4px}
.doc-t{font:600 .74rem var(--mono);text-transform:uppercase;color:var(--acc);margin:12px 0 6px}
.doc-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:6px 0;border-bottom:1px dashed var(--line);color:var(--muted)}
.doc-row i{height:7px;border-radius:4px;background:#E4EAF0;width:var(--w);align-self:center}
.doc-row u{text-decoration:none;font-family:var(--mono);font-size:.76rem;color:#24364A}
.doc-mini{display:flex;gap:10px;margin-top:10px;color:var(--muted)}.doc-mini i{flex:1;height:7px;background:#E4EAF0;border-radius:4px;align-self:center}
.doc-foot{display:flex;justify-content:space-between;margin-top:12px;padding:10px 12px;background:var(--ink);color:#fff;border-radius:6px}
.doc-foot b{color:#7FD1C5;font-weight:600}
.cap{margin-top:8px;font:500 .78rem var(--mono);color:var(--muted)}
.note{margin-top:22px;padding:14px 18px;background:#FFF8E5;border:1px solid #F0DDA8;border-radius:8px;color:#5A4500}
.person{display:grid;grid-template-columns:150px 1fr;gap:26px;margin-top:22px}
@media(max-width:600px){.person{grid-template-columns:1fr}}
.photo{aspect-ratio:1;border:1px dashed #9FB0C0;border-radius:8px;display:grid;place-items:center;text-align:center;font:500 .74rem var(--mono);color:var(--muted);padding:10px}
.person h3{font-size:1.4rem}
.person blockquote{margin:10px 0 0;color:#24364A;font-size:1.08rem}
.person .meta{margin-top:10px;font-size:.9rem;color:var(--muted)}
.steps{list-style:none;margin:24px 0 0;padding:0;position:relative}
.steps::before{content:"";position:absolute;left:19px;top:8px;bottom:8px;width:2px;background:var(--line)}
.step{position:relative;padding:0 0 26px 62px}
.step-top{display:flex;gap:10px;align-items:center;margin-bottom:6px}
.step-n{position:absolute;left:0;top:-4px;width:40px;height:40px;border-radius:50%;background:#fff;border:2px solid var(--acc);display:grid;place-items:center;font:600 1rem var(--mono);color:var(--acc)}
.tag{font:600 .74rem var(--mono);color:var(--acc);background:var(--hl);padding:3px 8px;border-radius:4px}
.step h3{font-size:1.15rem;margin-bottom:6px}
.step p{color:var(--muted)}
.step-link{font-weight:600;color:var(--acc)}
.price-table{width:100%;border-collapse:collapse;margin-top:22px;font-size:1rem}
.price-table th,.price-table td{text-align:left;padding:14px 12px;border-bottom:1px solid var(--line);vertical-align:top}
.price-table th{font:500 .78rem var(--mono);text-transform:uppercase;color:var(--muted);letter-spacing:.06em}
.price-table .sum{font:600 1.6rem var(--mono);color:var(--acc);white-space:nowrap;text-align:right}
.limits{margin-top:16px;color:var(--muted);font-size:.95rem}
.fine{margin-top:12px;font-size:.95rem;color:var(--muted)}
.fine b{color:var(--ink)}
.faq{margin-top:20px}
.faq details{border-bottom:1px solid var(--line)}
.faq summary{padding:16px 40px 16px 0;font-weight:600;position:relative}
.faq summary::after{content:"+";position:absolute;right:4px;top:12px;font:500 1.3rem var(--mono);color:var(--acc)}
.faq details[open] summary::after{content:"−"}
.faq .answer{padding:0 0 18px;color:#24364A}
.faq ol{margin:8px 0 0;padding-left:1.3em}
.form{margin-top:20px}
.field label{font-weight:600;font-size:.9rem;margin-bottom:6px}
.req{color:#B42318}.opt{font-weight:400;color:var(--muted)}
.field input,.field textarea{padding:12px 13px;border:1.5px solid #73859A;border-radius:6px;background:#fff}
.field input::placeholder,.field textarea::placeholder{color:#6B7C8E}
.field input:focus,.field textarea:focus{outline:none;border-color:var(--acc);box-shadow:0 0 0 3px rgba(15,107,99,.2)}
.field input[aria-invalid=true]{border-color:#B42318;background:#FFF7F6}
.hint{font-size:.82rem;color:var(--muted);margin-top:4px}
.err{font-size:.86rem;font-weight:600;color:#B42318;margin-top:4px}
.check{font-size:.92rem}
.check a{color:var(--acc)}
.check input{accent-color:var(--acc)}
.formmsg{margin-top:14px;padding:14px 16px;border-radius:8px;background:var(--hl);color:#0B4F49;font-weight:600;border:1px solid #BFE0DA}
.form-note{margin-top:12px;font-size:.85rem;color:var(--muted)}
.rail{position:sticky;top:84px;display:grid;gap:18px}
@media(max-width:1060px){.rail{position:static}}
.summary{background:var(--ink);color:#E6EDF3;border-radius:8px;padding:26px}
.summary .lbl{font:500 .76rem var(--mono);text-transform:uppercase;color:#9FB6CB;letter-spacing:.08em}
.summary .big{display:block;font:600 2.6rem/1 var(--mono);color:#7FD1C5;margin:10px 0 6px}
.summary p{font-size:.95rem;color:#C6D2DE}
.summary .small{margin:10px 0 18px;font-size:.9rem;color:#C6D2DE}
.summary .btn{width:100%}
.contacts{background:#fff;border:1px solid var(--line);border-radius:8px;padding:22px}
.contacts h3{font-size:1.15rem}
.contacts>p{margin-top:8px;font-size:.92rem;color:var(--muted)}
.c-line{display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)}
.c-line .ic{color:var(--acc)}
.c-line .k{display:block;font:500 .7rem var(--mono);text-transform:uppercase;color:var(--muted)}
.c-line .v a{font-weight:600;text-decoration:none;border-bottom:1px solid var(--acc);font-size:.95rem}
.c-line small a{font-size:.84rem;color:var(--muted)}
.executor{margin-top:10px;font-size:.84rem;color:var(--muted)}
.posts{padding:0 0 40px}
.posts .wrap>*{background:#fff}
.eyebrow{font:500 .82rem var(--mono);color:var(--acc);text-transform:uppercase}
.posts .wrap{border:1px dashed #9FB0C0;border-radius:8px;padding:22px;background:#fff;max-width:1200px}
.posts-link a{font-weight:600;color:var(--acc)}
.posts-note{color:var(--muted)}
.footer{background:var(--ink);color:#B7C5D3;padding:44px 0 30px;font-size:.9rem}
.foot-top{display:flex;flex-wrap:wrap;gap:24px;justify-content:space-between}
.foot-about{max-width:54ch}.foot-about p{margin-top:10px}
.footer a{color:#E6EDF3;text-decoration:none}
.foot-links{display:flex;flex-wrap:wrap;gap:8px 20px;font-family:var(--mono);font-size:.85rem}
.foot-privacy{margin-top:20px}
.foot-bottom{margin-top:20px;padding-top:16px;border-top:1px solid #23344A;display:flex;flex-wrap:wrap;gap:8px 20px;justify-content:space-between}
.mobilebar{background:#fff;border-top:1px solid var(--line);box-shadow:0 -8px 24px -16px rgba(0,0,0,.4)}
.mobilebar .mb-text{font-family:var(--mono);font-size:.8rem}
.mobilebar .btn{padding:.8em 1.1em}
.zd{background:var(--acc);color:#fff;border-radius:14px}
@media(max-width:600px){.hero .memo-head{display:none}.hero.sheet{padding:22px 18px}.hero h1{font-size:1.85rem}.lede{font-size:1.02rem;margin-top:12px}
  .offer-line{margin-top:16px;padding:12px 14px}.offer-line b{font-size:1.12rem}.actions{margin-top:16px}}
"""


def v3(state=""):
    rail = f"""<aside class="rail"><div class="summary"><span class="lbl">Пропозиція</span><span class="big">3{NB}499 грн</span>
<p>за аналіз і консультацію</p><p class="small">{OFFER_SUB}</p>
<a class="btn btn-primary" href="#zayavka">{BTN_MAIN}</a></div>{contacts()}</aside>"""
    body = f"""{header("top", logo(mark_bg="#0F6B63", mark_fg="#fff"))}
<main id="top"><div class="wrap layout"><div>
<article class="sheet hero"><div class="memo-head"><span><b>TenderWin</b></span><span>Аналіз відхилення</span><span>Prozorro</span><span>24 години</span></div>
  <p class="kicker">// {KICKER}</p><h1>{H1}</h1><p class="lede">{LEDE}</p>{offer_block()}{hero_buttons()}<p class="hero-note">{HERO_NOTE}</p></article>
<section class="sheet" id="rezultat"><p class="chap">§1 · {RES_EYEBROW}</p><h2>{RES_H2}</h2><p class="lead">{RES_LEDE}</p>
  <div class="two"><div>{result_list()}</div><div>{structure_doc()}<p class="cap">{STRUCT_CAPTION}</p></div></div>
  <div class="box" style="margin-top:22px"><h3>{CONS_H3}</h3><p>{CONS_TEXT}</p></div><p class="note">{RES_NOTE}</p></section>
<section class="sheet" id="khto"><p class="chap">§2 · {WHO_EYEBROW}</p><h2>{WHO_H2}</h2>
  <div class="person"><div class="photo">{WHO_PHOTO_NOTE}</div><div><h3>{WHO_NAME}</h3><blockquote>{WHO_QUOTE}</blockquote><p class="meta">{WHO_META}</p></div></div></section>
<section class="sheet" id="yak"><p class="chap">§3 · {HOW_EYEBROW}</p><h2>{HOW_H2}</h2>{steps()}</section>
<section class="sheet" id="vartist"><p class="chap">§4 · {PRICE_EYEBROW}</p><h2>{PRICE_H2}</h2>
  <table class="price-table"><thead><tr><th>Склад</th><th style="text-align:right">Сума</th></tr></thead>
  <tbody><tr><td>{PRICE_DESC} {PRICE_INCL}</td><td class="sum">{PRICE}</td></tr></tbody></table>
  <p class="limits">{PRICE_LIMITS}</p><p class="fine"><b>{CONTRACT}</b> {REMOTE}</p>
  <p style="margin-top:18px"><a class="btn btn-primary" href="#zayavka">{BTN_MAIN}</a></p></section>
<section class="sheet" id="pytannya"><p class="chap">§5 · {FAQ_EYEBROW}</p><h2>{FAQ_H2}</h2>{faq()}</section>
<section class="sheet" id="zayavka"><p class="chap">§6 · {FORM_EYEBROW}</p><h2>{FORM_H2}</h2><p class="lead">{FORM_SUB}</p>{form(state=state)}</section>
</div>{rail}</div>
{posts()}
</main>
{footer(logo_html=logo(mark_bg="#0F6B63", mark_fg="#fff"))}
{mobilebar()}{zadarma()}"""
    return page(3, "Аналітична записка", V3_CSS, body, fonts_css=True)


# =====================================================================
# ВАРІАНТ 4 — «Нічний преміум»: графіт і шампань, закріплена ліва панель із пропозицією
# =====================================================================
V4_CSS = """
:root{--bg:#111316;--panel:#181B1F;--panel2:#1F2328;--text:#ECE7DF;--muted:#B3ACA2;--champ:#CDB68C;--champ2:#E2CFA9;--line:#2E3238;--wrap:1320px}
body{font-family:"Fixel",system-ui,sans-serif;font-size:17px;line-height:1.7;color:var(--text);background:var(--bg)}
h1,h2,h3{font-family:"Cormorant Garamond",Georgia,serif;font-weight:600;letter-spacing:-.005em;line-height:1.08}
.btn{border-radius:999px;padding:1em 1.8em;font-size:.98rem}
.btn-primary{background:var(--champ);color:#17140E}
.btn-primary:hover{background:var(--champ2)}
.btn-secondary{color:var(--text);border-color:#5A5E64}
.btn-sm{padding:.62em 1.15em;font-size:.92rem}
:focus-visible{outline:2px solid var(--champ2);outline-offset:3px}
.split{display:grid;grid-template-columns:minmax(380px,40%) 1fr;min-height:100vh}
@media(max-width:1060px){.split{grid-template-columns:1fr}}
.rail{position:sticky;top:0;height:100vh;padding:40px 52px;display:flex;flex-direction:column;background:radial-gradient(600px 400px at 0% 100%,rgba(205,182,140,.12),transparent 60%),var(--panel);border-right:1px solid var(--line);overflow:auto}
@media(max-width:1060px){.rail{position:static;height:auto;padding:28px 20px 44px;border-right:0;border-bottom:1px solid var(--line)}}
.logo{display:flex;gap:10px;align-items:center;color:var(--text);text-decoration:none;font:600 1.3rem "Cormorant Garamond",serif;letter-spacing:.14em}
.logo-t span{color:var(--champ)}
.rail .nav-mini{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:20px;font-size:.86rem}
.rail .nav-mini a{color:var(--muted);text-decoration:none}
.kicker{margin-top:auto;padding-top:36px;font-size:.78rem;letter-spacing:.24em;text-transform:uppercase;color:var(--champ)}
@media(max-width:1060px){.kicker{padding-top:28px}}
.rail h1{font-size:clamp(2.2rem,3.5vw,3.3rem);margin-top:14px}
.lede{margin-top:20px;color:var(--muted);font-size:1.06rem;max-width:52ch}
.offer-line{margin-top:26px;padding:20px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.offer-line b{display:block;font:600 1.6rem/1.2 "Cormorant Garamond",serif}
.offer-line .price{color:var(--champ);font-size:2.3rem}
.offer-line .sub{display:block;margin-top:8px;color:var(--muted);font-size:.96rem}
.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}
@media(max-width:520px){.actions .btn{flex:1 1 100%}}
.hero-note{margin-top:12px;font-size:.88rem;color:var(--muted)}
.rail-contact{margin-top:22px;font-size:.9rem;color:var(--muted)}
.rail-contact a{color:var(--text);text-decoration:none;border-bottom:1px solid #6A5E49}
.flow{padding:0 64px}
@media(max-width:1060px){.flow{padding:0 20px}}
.flow>section{padding:88px 0;border-bottom:1px solid var(--line);max-width:860px}
@media(max-width:700px){.flow>section{padding:56px 0}}
.idx{font:600 4.6rem/1 "Cormorant Garamond",serif;color:#3A3F46}
.eyebrow{font-size:.76rem;letter-spacing:.24em;text-transform:uppercase;color:var(--champ);margin:6px 0 14px}
.flow h2{font-size:clamp(2rem,3.8vw,3rem)}
.flow .lead{margin-top:16px;color:var(--muted);font-size:1.1rem;max-width:62ch}
.checklist{list-style:none;margin:30px 0 0;padding:0;display:grid;gap:0}
.checklist li{display:flex;gap:14px;padding:16px 0;border-top:1px solid var(--line)}
.checklist .ic{color:var(--champ);margin-top:4px}
.panel{margin-top:26px;background:var(--panel2);border:1px solid var(--line);border-radius:18px;padding:28px}
.panel h3{font-size:1.7rem;margin-bottom:10px}
.panel p{color:var(--muted)}
.note{margin-top:24px;color:var(--muted);font-style:italic;padding-left:18px;border-left:1px solid var(--champ)}
.person{display:grid;grid-template-columns:170px 1fr;gap:32px;margin-top:28px}
@media(max-width:600px){.person{grid-template-columns:1fr}}
.photo{aspect-ratio:3/4;border-radius:999px 999px 18px 18px;border:1px solid var(--line);background:linear-gradient(180deg,#22262B,#191C20);display:grid;place-items:center;text-align:center;font-size:.76rem;color:var(--muted);padding:16px}
.person h3{font-size:2rem}
.person blockquote{margin:12px 0 0;font:500 1.45rem/1.45 "Cormorant Garamond",serif;color:var(--text)}
.person .meta{margin-top:12px;color:var(--muted);font-size:.9rem}
.steps{list-style:none;margin:28px 0 0;padding:0;display:grid;grid-template-columns:repeat(2,1fr);gap:18px}
@media(max-width:700px){.steps{grid-template-columns:1fr}}
.step{background:var(--panel2);border:1px solid var(--line);border-radius:18px;padding:26px}
.step-top{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.step-n{font:600 2.6rem/1 "Cormorant Garamond",serif;color:var(--champ)}
.tag{font-size:.7rem;letter-spacing:.16em;text-transform:uppercase;color:var(--champ);border:1px solid #5B513F;padding:3px 9px;border-radius:999px}
.step h3{font-size:1.5rem;margin-bottom:8px}
.step p{color:var(--muted);font-size:.97rem}
.step-link{color:var(--champ);font-weight:600}
.price{color:var(--champ)}
.pricing{margin-top:28px;display:grid;grid-template-columns:1fr auto;gap:28px;align-items:end;padding:32px;border:1px solid #5B513F;border-radius:22px;background:linear-gradient(135deg,rgba(205,182,140,.08),transparent 60%)}
@media(max-width:700px){.pricing{grid-template-columns:1fr}}
.pricing .amt{font:600 4rem/1 "Cormorant Garamond",serif;color:var(--champ);white-space:nowrap}
.pricing p{color:var(--muted)}
.pricing .limits{margin-top:12px;font-size:.94rem}
.fine{margin-top:18px;color:var(--muted);font-size:.95rem}
.fine b{color:var(--text)}
.faq{margin-top:24px}
.faq details{border-top:1px solid var(--line)}
.faq summary{padding:20px 44px 20px 0;font:600 1.45rem/1.3 "Cormorant Garamond",serif;position:relative}
.faq summary::after{content:"+";position:absolute;right:6px;top:16px;font-size:1.6rem;color:var(--champ)}
.faq details[open] summary::after{content:"−"}
.faq .answer{padding:0 0 22px;color:var(--muted)}
.faq ol{margin:8px 0 0;padding-left:1.3em}
.form-wrap{display:grid;gap:22px;margin-top:26px}
.form{background:var(--panel2);border:1px solid var(--line);border-radius:22px;padding:30px}
.field label{font-size:.88rem;font-weight:600;margin-bottom:7px;color:#DCD5CA}
.req{color:var(--champ)}.opt{font-weight:400;color:var(--muted)}
.field input,.field textarea{padding:13px 16px;border-radius:12px;border:1.5px solid #6C6F75;background:#14171A;color:var(--text)}
.field input::placeholder,.field textarea::placeholder{color:#9A948B}
.field input:focus,.field textarea:focus{outline:none;border-color:var(--champ)}
.field input[aria-invalid=true]{border-color:#FFB4AB}
.hint{font-size:.82rem;color:var(--muted);margin-top:5px}
.err{font-size:.86rem;font-weight:600;color:#FFB4AB;margin-top:5px}
.check{font-size:.92rem;color:#D5CEC3}
.check a{color:var(--champ)}
.check input{accent-color:var(--champ)}
.btn-block{padding:1.05em}
.formmsg{margin-top:16px;padding:14px 18px;border-radius:12px;background:#1E2B23;color:#B8E3C8;border:1px solid #2F5C43;font-weight:600}
.formmsg a{color:inherit}
.form-note{margin-top:14px;font-size:.85rem;color:var(--muted)}
.contacts{background:var(--panel);border:1px solid var(--line);border-radius:22px;padding:28px}
.contacts h3{font-size:1.8rem}
.contacts>p{margin-top:8px;color:var(--muted)}
.c-line{display:flex;gap:14px;align-items:center;padding:13px 0;border-bottom:1px solid var(--line)}
.c-line .ic{color:var(--champ)}
.c-line .k{display:block;font-size:.7rem;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
.c-line .v a{color:var(--text);text-decoration:none;font-weight:600;border-bottom:1px solid #6A5E49}
.c-line small a{color:var(--muted);font-size:.86rem}
.executor{margin-top:12px;font-size:.86rem;color:var(--muted)}
.posts{padding:44px 0}
.posts .wrap{max-width:860px;margin:0;padding:0}
.posts-link a{color:var(--champ);font:600 1.5rem "Cormorant Garamond",serif}
.posts-note{color:var(--muted)}
.footer{background:#0B0C0E;color:var(--muted);padding:48px 0 30px;font-size:.9rem;border-top:1px solid var(--line)}
.foot-top{display:flex;flex-wrap:wrap;gap:24px;justify-content:space-between}
.foot-about{max-width:54ch}.foot-about p{margin-top:10px}
.footer a{color:var(--text);text-decoration:none}
.foot-links{display:flex;flex-wrap:wrap;gap:8px 20px}
.foot-privacy{margin-top:20px}
.foot-bottom{margin-top:20px;padding-top:16px;border-top:1px solid var(--line);display:flex;flex-wrap:wrap;gap:8px 20px;justify-content:space-between}
.mobilebar{background:rgba(17,19,22,.97);border-top:1px solid var(--line);color:var(--text)}
.mobilebar .btn{padding:.8em 1.2em}
.zd{background:var(--champ);color:#17140E}
@media(max-width:1060px){.rail .nav-mini{display:none}}
@media(max-width:600px){.rail h1{font-size:2rem}.rail .lede{font-size:1rem;margin-top:14px}.rail .offer-line{margin-top:16px;padding:14px 0}.rail .offer-line .price{font-size:1.9rem}.rail .actions{margin-top:16px}}
"""


def v4(state=""):
    nav = "".join(f'<a href="{h}">{t}</a>' for h, t in NAV)
    body = f"""<main id="top"><div class="split">
<aside class="rail">{logo(mark_bg="#26292E", mark_fg="#CDB68C")}<nav class="nav-mini" aria-label="Основні розділи">{nav}</nav>
  <p class="kicker">{KICKER}</p><h1>{H1}</h1><p class="lede">{LEDE}</p>{offer_block()}{hero_buttons(arrow=False)}
  <p class="hero-note">{HERO_NOTE}</p><p class="rail-contact"><a href="{PHONE_HREF}">{PHONE}</a> · <a href="{TG_URL}">{TG_USER}</a></p></aside>
<div class="flow">
<section id="rezultat"><div class="idx">01</div><p class="eyebrow">{RES_EYEBROW}</p><h2>{RES_H2}</h2><p class="lead">{RES_LEDE}</p>{result_list()}
  <div class="panel"><h3>{CONS_H3}</h3><p>{CONS_TEXT}</p></div><p class="note">{RES_NOTE}</p></section>
<section id="khto"><div class="idx">02</div><p class="eyebrow">{WHO_EYEBROW}</p><h2>{WHO_H2}</h2>
  <div class="person"><div class="photo">{WHO_PHOTO_NOTE}</div><div><h3>{WHO_NAME}</h3><blockquote>{WHO_QUOTE}</blockquote><p class="meta">{WHO_META}</p></div></div></section>
<section id="yak"><div class="idx">03</div><p class="eyebrow">{HOW_EYEBROW}</p><h2>{HOW_H2}</h2>{steps()}</section>
<section id="vartist"><div class="idx">04</div><p class="eyebrow">{PRICE_EYEBROW}</p><h2>{PRICE_H2}</h2>
  <div class="pricing"><div><p>{PRICE_DESC}</p><p class="limits">{PRICE_LIMITS}</p></div><div><div class="amt">3{NB}499 <small style="font-size:1.4rem">грн</small></div>
  <p style="margin:8px 0 14px">{PRICE_INCL}</p><a class="btn btn-primary" href="#zayavka">{BTN_MAIN}</a></div></div>
  <p class="fine"><b>{CONTRACT}</b> {REMOTE}</p></section>
<section id="pytannya"><div class="idx">05</div><p class="eyebrow">{FAQ_EYEBROW}</p><h2>{FAQ_H2}</h2>{faq()}</section>
<section id="zayavka"><div class="idx">06</div><p class="eyebrow">{FORM_EYEBROW}</p><h2>{FORM_H2}</h2><p class="lead">{FORM_SUB}</p>
  <div class="form-wrap">{form(state=state)}{contacts()}</div></section>
{posts()}
</div></div></main>
{footer(logo_html=logo(mark_bg="#26292E", mark_fg="#CDB68C"))}
{mobilebar()}{zadarma()}"""
    return page(4, "Нічний преміум", V4_CSS, body, fonts_css=True)


# =====================================================================
# ВАРІАНТ 5 — «Ясність»: світлий, «державно-цифровий» стиль, великі елементи, прогрес кроків
# =====================================================================
V5_CSS = """
:root{--bg:#fff;--surface:#F2F5FA;--ink:#0B1220;--muted:#475467;--line:#DCE3EE;--blue:#1D4ED8;--blue2:#1A3FB0;--yellow:#FFD34D;--green:#0E7A4B;--wrap:1160px}
body{font-family:"Manrope",system-ui,sans-serif;font-size:17px;line-height:1.6;color:var(--ink);background:var(--bg)}
h1,h2,h3{font-weight:800;letter-spacing:-.02em;line-height:1.15}
.btn{border-radius:14px;padding:1em 1.6em;font-size:1.02rem}
.btn-primary{background:var(--blue);color:#fff}
.btn-primary:hover{background:var(--blue2)}
.btn-secondary{background:var(--surface);color:var(--ink);border-color:var(--line)}
.btn-sm{padding:.65em 1.1em;font-size:.95rem}
:focus-visible{outline:3px solid #F59E0B;outline-offset:2px}
.top{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.96);border-bottom:1px solid var(--line)}
.nav{display:flex;align-items:center;gap:24px;height:70px}
.logo{display:flex;gap:10px;align-items:center;color:var(--ink);text-decoration:none;font:800 1.18rem "Manrope",sans-serif}
.logo-t span{color:var(--blue)}
.nav-links{display:flex;gap:22px;margin-left:auto;font-weight:600;font-size:.95rem}
.nav-links a{color:var(--muted);text-decoration:none}
.nav-cta{display:flex;gap:16px;align-items:center}
.nav-phone{color:var(--ink);font-weight:700;text-decoration:none;white-space:nowrap}
@media(max-width:1120px){.nav-links{display:none}.nav-cta{margin-left:auto}}
@media(max-width:640px){.nav-cta .btn{display:none}.nav{height:62px}}
.hero{padding:64px 0 56px;background:linear-gradient(180deg,#F5F8FF,#fff)}
.hero-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:48px;align-items:center}
@media(max-width:980px){.hero-grid{grid-template-columns:1fr;gap:28px}.hero{padding:30px 0 40px}}
.kicker{display:inline-flex;gap:8px;align-items:center;font-weight:700;font-size:.9rem;color:var(--blue);background:#E8EEFE;padding:6px 12px;border-radius:999px;margin-bottom:18px}
.hero h1{font-size:clamp(2rem,4.8vw,3.3rem)}
.lede{margin-top:16px;font-size:1.12rem;color:var(--muted);max-width:58ch}
.offer-line{margin-top:22px;display:flex;flex-direction:column;gap:6px}
.offer-line b{font-size:1.25rem}
.offer-line .price{background:var(--yellow);color:#1A1500;padding:2px 10px;border-radius:8px;margin-right:4px}
.offer-line .sub{color:var(--muted)}
.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}
@media(max-width:520px){.actions .btn{flex:1 1 100%}}
.hero-note{margin-top:12px;font-size:.94rem;color:var(--muted)}
.hero-card{background:#fff;border:1px solid var(--line);border-radius:24px;padding:26px;box-shadow:0 24px 48px -30px rgba(29,78,216,.45)}
.hero-card h2{font-size:1.15rem}
.hero-card ol{list-style:none;margin:16px 0 0;padding:0;display:grid;gap:12px;counter-reset:s}
.hero-card li{display:flex;gap:12px;align-items:flex-start;font-weight:600}
.hero-card li::before{counter-increment:s;content:counter(s);width:30px;height:30px;border-radius:50%;background:#E8EEFE;color:var(--blue);display:grid;place-items:center;font-weight:800;flex-shrink:0;font-size:.9rem}
.hero-card .foot{margin-top:18px;padding-top:16px;border-top:1px solid var(--line);font-size:.92rem;color:var(--muted)}
@media(max-width:980px){.hero-card{display:none}}
section{padding:80px 0}
@media(max-width:700px){section{padding:56px 0}}
.alt{background:var(--surface)}
.sec-head{max-width:720px;margin-bottom:34px}
.eyebrow{font-weight:800;font-size:.86rem;color:var(--blue);margin-bottom:10px}
.sec-head h2{font-size:clamp(1.7rem,3.4vw,2.4rem)}
.sec-head p{margin-top:12px;color:var(--muted);font-size:1.08rem}
.cards{display:grid;grid-template-columns:1.2fr .8fr;gap:20px}
@media(max-width:860px){.cards{grid-template-columns:1fr}}
.card{background:#fff;border:1px solid var(--line);border-radius:20px;padding:28px}
.alt .card{border-color:#fff}
.card h3{font-size:1.25rem;margin-bottom:12px}
.card p{color:var(--muted)}
.checklist{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.checklist li{display:flex;gap:12px;align-items:flex-start}
.checklist .ic{color:#fff;background:var(--green);border-radius:50%;padding:3px;width:22px;height:22px;margin-top:2px}
.note{margin-top:20px;display:flex;gap:12px;padding:16px 18px;border-radius:14px;background:#FFF7DB;color:#5C4500}
.person{display:grid;grid-template-columns:140px 1fr;gap:28px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:24px;padding:28px}
@media(max-width:600px){.person{grid-template-columns:1fr}}
.photo{aspect-ratio:1;border-radius:50%;background:#E8EEFE;display:grid;place-items:center;text-align:center;font-size:.74rem;color:var(--blue);padding:14px;font-weight:700}
.person h3{font-size:1.45rem}
.person blockquote{margin:10px 0 0;color:var(--ink);font-size:1.08rem}
.person .meta{margin-top:10px;color:var(--muted);font-size:.92rem}
.steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,1fr);gap:18px;position:relative}
.steps::before{content:"";position:absolute;top:24px;left:6%;right:6%;height:3px;background:linear-gradient(90deg,var(--blue),#93B0F5)}
@media(max-width:1000px){.steps{grid-template-columns:1fr 1fr}.steps::before{display:none}}
@media(max-width:600px){.steps{grid-template-columns:1fr}}
.step{position:relative}
.step-top{display:flex;gap:10px;align-items:center;margin-bottom:14px}
.step-n{width:50px;height:50px;border-radius:50%;background:var(--blue);color:#fff;display:grid;place-items:center;font-weight:800;font-size:1.2rem;border:5px solid #fff;box-shadow:0 0 0 1px var(--line)}
.tag{font-size:.76rem;font-weight:800;color:var(--green);background:#E3F5EC;padding:4px 10px;border-radius:999px}
.step h3{font-size:1.12rem;margin-bottom:6px}
.step p{color:var(--muted);font-size:.97rem}
.step-link{font-weight:700;color:var(--blue)}
.price-card{display:grid;grid-template-columns:1fr 320px;gap:0;border-radius:24px;overflow:hidden;border:2px solid var(--blue);background:#fff}
@media(max-width:860px){.price-card{grid-template-columns:1fr}}
.pc-main{padding:34px}
.pc-main h2{font-size:clamp(1.5rem,3vw,2.1rem)}
.pc-main p{margin-top:14px;color:var(--muted)}
.pc-cols{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px}
@media(max-width:600px){.pc-cols{grid-template-columns:1fr}}
.pc-cols div{border-radius:14px;padding:16px;font-size:.95rem}
.pc-in{background:#E3F5EC;color:#0B4D31}.pc-out{background:#FDECEC;color:#7A1E16}
.pc-cols b{display:block;margin-bottom:6px}
.pc-side{background:var(--blue);color:#fff;padding:34px;display:flex;flex-direction:column;justify-content:center;gap:12px}
.pc-side .amt{font-size:3.4rem;font-weight:800;line-height:1;letter-spacing:-.03em}
.pc-side .btn{background:#fff;color:var(--blue)}
.fine{margin-top:16px;color:var(--muted);font-size:.96rem}
.fine b{color:var(--ink)}
.faq details{background:#fff;border:1px solid var(--line);border-radius:16px;margin-bottom:10px}
.faq summary{padding:18px 54px 18px 20px;font-weight:700;position:relative}
.faq summary::after{content:"+";position:absolute;right:18px;top:13px;width:28px;height:28px;border-radius:50%;background:#E8EEFE;color:var(--blue);display:grid;place-items:center;font-weight:800}
.faq details[open] summary::after{content:"−"}
.faq .answer{padding:0 20px 18px;color:var(--muted)}
.faq ol{margin:8px 0 0;padding-left:1.3em}
.form-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:28px;align-items:start}
@media(max-width:940px){.form-grid{grid-template-columns:1fr}}
.form{background:#fff;border:1px solid var(--line);border-radius:24px;padding:30px;box-shadow:0 20px 40px -30px rgba(11,18,32,.3)}
.field label{font-weight:700;font-size:.95rem;margin-bottom:8px}
.req{color:#C2410C}.opt{font-weight:500;color:var(--muted)}
.field input,.field textarea{padding:15px 16px;border-radius:12px;border:2px solid #737D8F;background:#fff;font-size:1.02rem}
.field input::placeholder,.field textarea::placeholder{color:#667085}
.field input:focus,.field textarea:focus{outline:none;border-color:var(--blue);box-shadow:0 0 0 4px rgba(29,78,216,.15)}
.field input[aria-invalid=true]{border-color:#C0352B;background:#FFF6F5}
.hint{font-size:.86rem;color:var(--muted);margin-top:6px}
.err{font-size:.9rem;font-weight:700;color:#B42318;margin-top:6px}
.check{font-size:.95rem}
.check a{color:var(--blue)}
.check input{width:22px;height:22px;accent-color:var(--blue)}
.btn-block{padding:1.1em;font-size:1.08rem}
.formmsg{margin-top:16px;padding:16px 18px;border-radius:14px;background:#E3F5EC;color:#0B4D31;font-weight:700}
.formmsg a{color:inherit}
.form-note{margin-top:14px;font-size:.88rem;color:var(--muted)}
.contacts{background:var(--surface);border-radius:24px;padding:28px}
.contacts h3{font-size:1.35rem}
.contacts>p{margin-top:8px;color:var(--muted)}
.c-line{display:flex;gap:14px;align-items:center;padding:13px 0;border-bottom:1px solid var(--line)}
.c-line .ic{color:var(--blue);background:#fff;border-radius:12px;padding:8px;width:38px;height:38px}
.c-line .k{display:block;font-size:.78rem;color:var(--muted);font-weight:700}
.c-line .v a{font-weight:800;color:var(--ink);text-decoration:none}
.c-line small a{color:var(--blue);font-weight:700;font-size:.88rem}
.executor{margin-top:12px;font-size:.88rem;color:var(--muted)}
.posts{padding:40px 0;background:var(--surface)}
.posts-link a{font-weight:800;color:var(--blue)}
.posts-note{color:var(--muted)}
.footer{background:var(--ink);color:#B4BCCB;padding:48px 0 30px;font-size:.92rem}
.footer .logo{color:#fff}.footer .logo-t span{color:#9DB7FF}
.foot-top{display:flex;flex-wrap:wrap;gap:24px;justify-content:space-between}
.foot-about{max-width:54ch}.foot-about p{margin-top:10px}
.footer a{color:#E4E9F2;text-decoration:none}
.foot-links{display:flex;flex-wrap:wrap;gap:8px 20px}
.foot-privacy{margin-top:20px}
.foot-bottom{margin-top:20px;padding-top:16px;border-top:1px solid #243049;display:flex;flex-wrap:wrap;gap:8px 20px;justify-content:space-between}
.mobilebar{background:#fff;border-top:1px solid var(--line);box-shadow:0 -10px 30px -20px rgba(11,18,32,.5)}
.mobilebar .mb-text{font-weight:700}
.mobilebar .btn{padding:.85em 1.2em}
.zd{background:#0B1220;color:#fff}
"""


def v5(state=""):
    hero_card = f"""<div class="hero-card"><h2>{HOW_H2}</h2><ol>{"".join(f"<li>{h}</li>" for h, _, _ in STEPS)}</ol>
<p class="foot">{MOBILE_TEXT}</p></div>"""
    body = f"""{header("top", logo(mark_bg="#1D4ED8", mark_fg="#FFD34D"))}
<main id="top">
<div class="hero"><div class="wrap hero-grid">
  <div><p class="kicker">{KICKER}</p><h1>{H1}</h1><p class="lede">{LEDE}</p>{offer_block()}{hero_buttons()}<p class="hero-note">{HERO_NOTE}</p></div>
  {hero_card}</div></div>
<section id="rezultat"><div class="wrap"><div class="sec-head"><p class="eyebrow">{RES_EYEBROW}</p><h2>{RES_H2}</h2><p>{RES_LEDE}</p></div>
  <div class="cards"><div class="card"><h3>{STRUCT_LABEL}</h3>{result_list()}</div><div class="card"><h3>{CONS_H3}</h3><p>{CONS_TEXT}</p></div></div>
  <p class="note">{icon("info")}<span>{RES_NOTE}</span></p></div></section>
<section id="khto" class="alt"><div class="wrap"><div class="sec-head"><p class="eyebrow">{WHO_EYEBROW}</p><h2>{WHO_H2}</h2></div>
  <div class="person"><div class="photo">{WHO_PHOTO_NOTE}</div><div><h3>{WHO_NAME}</h3><blockquote>{WHO_QUOTE}</blockquote><p class="meta">{WHO_META}</p></div></div></div></section>
<section id="yak"><div class="wrap"><div class="sec-head"><p class="eyebrow">{HOW_EYEBROW}</p><h2>{HOW_H2}</h2></div>{steps()}</div></section>
<section id="vartist" class="alt"><div class="wrap"><div class="sec-head"><p class="eyebrow">{PRICE_EYEBROW}</p></div>
  <div class="price-card"><div class="pc-main"><h2>{PRICE_H2}</h2>
  <div class="pc-cols"><div class="pc-in"><b>Входить</b>{PRICE_DESC}</div>
  <div class="pc-out"><b>Не входить</b>{PRICE_LIMITS}</div></div></div>
  <div class="pc-side"><span class="amt">3{NB}499 <small style="font-size:1.3rem">грн</small></span><p>{PRICE_INCL}</p><a class="btn" href="#zayavka">{BTN_MAIN}</a></div></div>
  <p class="fine"><b>{CONTRACT}</b> {REMOTE}</p></div></section>
<section id="pytannya"><div class="wrap"><div class="sec-head"><p class="eyebrow">{FAQ_EYEBROW}</p><h2>{FAQ_H2}</h2></div>{faq()}</div></section>
<section id="zayavka" class="alt"><div class="wrap"><div class="sec-head"><p class="eyebrow">{FORM_EYEBROW}</p><h2>{FORM_H2}</h2><p>{FORM_SUB}</p></div>
  <div class="form-grid">{form(state=state)}{contacts()}</div></div></section>
{posts()}
</main>
{footer(logo_html=logo(mark_bg="#1D4ED8", mark_fg="#FFD34D"))}
{mobilebar()}{zadarma()}"""
    return page(5, "Ясність", V5_CSS, body, fonts_css=True)


VARIANTS = {1: v1, 2: v2, 3: v3, 4: v4, 5: v5}

if __name__ == "__main__":
    for n, fn in VARIANTS.items():
        d = os.path.join(ROOT, f"variant-{n}")
        os.makedirs(d, exist_ok=True)
        for state, name in [("", "index.html"), ("error", "state-error.html"), ("saved", "state-saved.html")]:
            with open(os.path.join(d, name), "w", encoding="utf-8") as f:
                f.write(fn(state))
    print("готово:", ", ".join(f"variant-{n}" for n in VARIANTS))
