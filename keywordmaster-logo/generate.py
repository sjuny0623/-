# 키워드마스터 로고 생성기 — 글자는 Pretendard 외곽선(path)으로 변환해 글꼴 없이도 똑같이 보이게
import os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

INK, DEEP, BLUE, ICE, STONE, WHITE = '#0A1024', '#121A33', '#2340E0', '#A9BBFF', '#EDEEEA', '#FFFFFF'
FONTS = {w: TTFont(f'pretendard-{w}.ttf') for w in (700, 800, 900)}

def text_path(txt, weight, size, x=0, y=0, track=0.0):
    """baseline (x,y) 에 txt 를 놓은 path d 와 전체 폭을 돌려줌. track = 자간(em)"""
    f = FONTS[weight]; gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f['head'].unitsPerEm
    s = size / upm; pen = SVGPathPen(gs); cx = x
    for i, ch in enumerate(txt):
        g = cmap[ord(ch)]
        tp = TransformPen(pen, (s, 0, 0, -s, cx, y))
        gs[g].draw(tp)
        cx += f['hmtx'][g][0] * s + (track * size if i < len(txt) - 1 else 0)
    return pen.getCommands(), cx - x

def cap_height(weight, size):
    f = FONTS[weight]; return f['OS/2'].sCapHeight * size / f['head'].unitsPerEm

# ── 심볼 (100×100 격자) ──────────────────────────────────────────
def sym_A(tile=BLUE, stem=WHITE, up=ICE, low=WHITE, r=22):
    """A. 커서 K — 세로획은 검색창 커서, 위 팔은 오른쪽 위로 솟는 상승선"""
    return (f'<rect width="100" height="100" rx="{r}" fill="{tile}"/>'
            f'<rect x="24" y="22" width="11" height="56" rx="2" fill="{stem}"/>'
            f'<path d="M40 53.5 L67 22 H81 L40 69.5 Z" fill="{up}"/>'
            f'<path d="M50.5 54.6 L58.6 45.4 L81 78 H67.4 Z" fill="{low}"/>')

def sym_B(tile=BLUE, ring=WHITE, caret=ICE, r=22):
    """B. 검색 렌즈 — 돋보기 안에서 깜빡이는 커서"""
    return (f'<rect width="100" height="100" rx="{r}" fill="{tile}"/>'
            f'<circle cx="44" cy="44" r="21" fill="none" stroke="{ring}" stroke-width="10"/>'
            f'<path d="M60 60 L77 77" stroke="{ring}" stroke-width="11" stroke-linecap="round"/>'
            f'<rect x="41" y="32" width="6" height="24" rx="1.5" fill="{caret}"/>')

def sym_C(tile=INK, sel=BLUE, k=WHITE, caret=ICE, r=22):
    """C. 선택된 키워드 — 드래그해 고른(선택) 글자 K 와 그 뒤 커서"""
    d, w = text_path('K', 900, 56, 0, 0)
    ch = cap_height(900, 56)
    bx, by, bw, bh = 18, 22, 52, 56
    tx = bx + (bw - w) / 2; ty = by + (bh + ch) / 2
    d, _ = text_path('K', 900, 56, tx, ty)
    return (f'<rect width="100" height="100" rx="{r}" fill="{tile}"/>'
            f'<rect x="{bx}" y="{by}" width="{bw}" height="{bh}" rx="4" fill="{sel}"/>'
            f'<path d="{d}" fill="{k}"/>'
            f'<rect x="74" y="18" width="7" height="64" rx="1.5" fill="{caret}"/>')

# ── 워드마크 ──────────────────────────────────────────────────────
def wordmark(size, x, y, c1, c2, weight=800, track=-0.012, caret=None, sel=None):
    """KEYWORD + MASTER 두 색. caret: 끝 커서 색. sel: MASTER 뒤 선택 영역 색(C안)"""
    d1, w1 = text_path('KEYWORD', weight, size, x, y, track)
    gap = track * size
    x2 = x + w1 + gap
    d2, w2 = text_path('MASTER', weight, size, x2, y, track)
    ch = cap_height(weight, size)
    out = ''
    if sel:
        pad = size * 0.08
        out += f'<rect x="{x2 - pad:.1f}" y="{y - ch - pad*1.3:.1f}" width="{w2 + pad*2:.1f}" height="{ch + pad*2.6:.1f}" rx="{size*0.06:.1f}" fill="{sel}"/>'
    out += f'<path d="{d1}" fill="{c1}"/><path d="{d2}" fill="{c2}"/>'
    end = x2 + w2
    if caret:
        cx = end + size * (0.16 if sel else 0.07)
        out += f'<rect x="{cx:.1f}" y="{y - ch - size*0.06:.1f}" width="{size*0.075:.1f}" height="{ch + size*0.12:.1f}" fill="{caret}"/>'
        end = cx + size * 0.075
    return out, end - x

def svg(w, h, body, bg=None):
    b = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}">{b}{body}</svg>'

def lockup(sym, theme, concept):
    """가로형: [심볼] KEYWORDMASTER / 아래 작은 한글 키워드마스터"""
    dark = theme == 'dark'
    c1 = WHITE if dark else INK; c2 = ICE if dark else BLUE
    sub = 'rgba(255,255,255,.62)' if dark else '#565D6E'
    S = 120; size = 64; gx = S + 34
    body = f'<g transform="scale({S/100})">{sym}</g>'
    ch = cap_height(800, size)
    base = S / 2 + ch / 2 - 14
    if concept == 'C':
        wm, ww = wordmark(size, gx, base, c1, WHITE, sel=BLUE, caret=c2)
    else:
        wm, ww = wordmark(size, gx, base, c1, c2)
    ko, kw = text_path('키워드마스터', 700, 24, gx + 2, base + 40, 0.12)
    body += wm + f'<path d="{ko}" fill="{sub}"/>'
    return svg(gx + ww + 6, S, body)

def wordmark_only(theme, concept):
    dark = theme == 'dark'
    c1 = WHITE if dark else INK; c2 = ICE if dark else BLUE
    size = 80; ch = cap_height(800, size)
    if concept == 'C':
        wm, ww = wordmark(size, 4, ch + 14, c1, WHITE, sel=BLUE, caret=c2)
    else:
        wm, ww = wordmark(size, 4, ch + 14, c1, c2, caret=BLUE if not dark else ICE)
    return svg(ww + 12, ch + 30, wm)

os.makedirs('out', exist_ok=True)
SYM = {
  'A': {'blue': sym_A(), 'ink': sym_A(tile=INK, up=BLUE), 'light': sym_A(tile=STONE, stem=INK, up=BLUE, low=INK)},
  'B': {'blue': sym_B(), 'ink': sym_B(tile=INK, caret=BLUE), 'light': sym_B(tile=STONE, ring=INK, caret=BLUE)},
  'C': {'blue': sym_C(tile=BLUE, sel=INK), 'ink': sym_C(), 'light': sym_C(tile=STONE, sel=BLUE, caret=BLUE)},
}
for c in 'ABC':
    for v, s in SYM[c].items():
        open(f'out/{c}-symbol-{v}.svg', 'w').write(svg(100, 100, s))
    prim = SYM[c]['blue'] if c != 'C' else SYM[c]['ink']
    open(f'out/{c}-lockup-dark.svg', 'w').write(lockup(prim, 'dark', c))
    open(f'out/{c}-lockup-light.svg', 'w').write(lockup(SYM[c]['blue'], 'light', c))
    open(f'out/{c}-wordmark-dark.svg', 'w').write(wordmark_only('dark', c))
    open(f'out/{c}-wordmark-light.svg', 'w').write(wordmark_only('light', c))
print(sorted(os.listdir('out')))

# ── A안 추가: 한글 주표기 락업 + 애니메이션 심볼 ─────────────────
def lockup_ko(theme):
    dark = theme == 'dark'
    c1 = WHITE if dark else INK; c2 = ICE if dark else BLUE
    sub = 'rgba(255,255,255,.62)' if dark else '#565D6E'
    S = 120; gx = S + 32
    body = f'<g transform="scale({S/100})">{sym_A()}</g>'
    d1, w1 = text_path('키워드', 800, 62, gx, 74, -0.02)
    d2, w2 = text_path('마스터', 800, 62, gx + w1 - 1.2, 74, -0.02)
    en, ew = text_path('KEYWORDMASTER', 700, 17, gx + 2, 104, 0.28)
    body += f'<path d="{d1}" fill="{c1}"/><path d="{d2}" fill="{c2}"/><path d="{en}" fill="{sub}"/>'
    return svg(gx + max(w1 + w2, ew) + 6, S, body)

open('out/A-lockup-ko-dark.svg', 'w').write(lockup_ko('dark'))
open('out/A-lockup-ko-light.svg', 'w').write(lockup_ko('light'))

anim = ('<style>'
  '.c{animation:blink 1.1s steps(1) 2,stay .01s 2.2s forwards}'
  '.u{transform-origin:35px 62px;transform:scale(0);animation:grow .55s cubic-bezier(.2,.9,.25,1.15) 2.2s forwards}'
  '.l{opacity:0;transform:translate(-8px,-8px);animation:in .4s ease-out 2.5s forwards}'
  '@keyframes blink{50%{opacity:0}}@keyframes stay{to{opacity:1}}'
  '@keyframes grow{to{transform:scale(1)}}@keyframes in{to{opacity:1;transform:none}}'
  '@media (prefers-reduced-motion:reduce){.c,.u,.l{animation:none;opacity:1;transform:none}}'
  '</style>'
  f'<rect width="100" height="100" rx="22" fill="{BLUE}"/>'
  f'<rect class="c" x="24" y="22" width="11" height="56" rx="2" fill="{WHITE}"/>'
  f'<path class="u" d="M40 53.5 L67 22 H81 L40 69.5 Z" fill="{ICE}"/>'
  f'<path class="l" d="M50.5 54.6 L58.6 45.4 L81 78 H67.4 Z" fill="{WHITE}"/>')
open('out/A-symbol-animated.svg', 'w').write(svg(100, 100, anim))
