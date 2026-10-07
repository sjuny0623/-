/* =========================================================
   KEYWORDMASTER — main.js  (Vanilla JS, 의존성 없음)
   ========================================================= */
'use strict';

/* ─────────────────────────────────────────────
   폼 전송 설정 — 백엔드 교체 지점은 여기 한 곳
   · Web3Forms : 'https://api.web3forms.com/submit' (FORM_FORMAT = 'web3forms')  ← 현재 사용
       신청 내용을 접근 키를 발급받은 메일 주소로 전달. 받는 주소는 키에 묶여 있어 페이지 소스에 드러나지 않음.
       키를 바꾸려면 https://web3forms.com 에서 받는 메일 주소로 새 Access Key 를 발급받아 WEB3FORMS_KEY 에 넣기
   · Formspree : 'https://formspree.io/f/xxxxxxxx'  (FORM_FORMAT = 'formspree')
   · FormSubmit: 'https://formsubmit.co/ajax/받을주소' (FORM_FORMAT = 'formsubmit')
   설정이 비어 있으면 전송하지 않고 '실패'로 처리한다 → 설정 누락이 가짜 성공으로 위장되어 리드가 사라지는 일 방지
   ───────────────────────────────────────────── */
const FORM_ENDPOINT   = 'https://api.web3forms.com/submit';
const FORM_FORMAT     = 'web3forms';
const WEB3FORMS_KEY   = 'dddb5271-df62-4205-9d71-20a5c592f1aa';   // Web3Forms Access Key (신청 접수용 메일 주소로 발급)
const FORM_TIMEOUT_MS = 12000;
const CONTACT_EMAIL   = '';            // [PLACEHOLDER] 전송 실패 시 안내할 대표 이메일 (비어 있으면 표시 안 함)

/* ─────────────────────────────────────────────
   리드 1차 분류 — 사이트에는 보이지 않고, 전송 데이터에만 lead_score / lead_grade 로 담긴다.
   [조정 가능] 점수와 등급 기준은 실제 계약 전환 데이터를 보며 수정
   ───────────────────────────────────────────── */
const LEAD_RULES = {
  budget:  { '100만 원 미만': 0, '100~300만 원': 1, '300~1,000만 원': 3, '1,000만 원 이상': 4 },
  timing:  { '바로': 2, '1개월 안': 2, '3개월 안': 1, '알아보는 중': 0 },
  role:    { '대표': 2, '마케팅 담당': 1, '기타 직원': 0 },
  tracking:{ '네': 0, '아니요': 1, '잘 모르겠음': 1 },
  industry:{ '병원·의원': 1, '법률·세무·전문직': 1, '교육·학원': 1, '레저·외식·매장': 1, '쇼핑몰·커머스': 0, '기타': 0 },
  scopeWide: 1,   // 필요한 마케팅 영역 3개 이상 또는 '전체 통합 운영'
  benchmark: 1,   // 닮고 싶거나 앞서고 싶은 업체를 적은 경우 — 목표가 구체적인 신청
  grade: [ [8, 'A'], [5, 'B'], [0, 'C'] ],   // 점수 이상 → 등급
};

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ── Hero: 헤드라인을 글자 단위로 나눔 (로드 연출 전에 실행) ── */
(function splitHeroTitle() {
  const title = document.getElementById('heroTitle');
  const hero = document.querySelector('.hero');
  if (!title || !hero) return;
  let i = 0;
  function splitIn(parent, hl) {
    let k = 0;
    [...parent.childNodes].forEach(node => {
      if (node.nodeType === 1 && node.classList.contains('hl')) { splitIn(node, true); return; }
      if (node.nodeType !== 3) return;               // 커서·굴러가는 단어는 그대로 둠
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(word => {
        if (!word) return;
        if (/^\s+$/.test(word)) { frag.appendChild(document.createTextNode(' ')); return; }
        const w = document.createElement('span'); w.className = 'w';
        [...word].forEach(c => {
          const s = document.createElement('span'); s.className = hl ? 'ch hc' : 'ch'; s.textContent = c;
          s.style.setProperty('--i', i++); if (hl) s.style.setProperty('--j', k++); w.appendChild(s);
        });
        frag.appendChild(w);
      });
      parent.replaceChild(frag, node);
    });
  }
  title.querySelectorAll('.line__in').forEach(line => { line.setAttribute('aria-hidden', 'true'); splitIn(line, false); });
  hero.classList.add('has-chars');
})();

/* ── Hero: 배경 빛이 마우스 쪽으로 아주 조금 따라옴 (데스크톱, 동작 줄이기 꺼짐일 때만) ── */
(function heroPointer() {
  const bg = document.querySelector('.hero__bg');
  if (!bg || !window.matchMedia('(hover: hover) and (pointer: fine)').matches || reduceMotion.matches) return;
  let tx = 0, ty = 0, x = 0, y = 0, raf = null;
  function tick() {
    x += (tx - x) * 0.06; y += (ty - y) * 0.06;
    const h = bg.parentElement; h.style.setProperty('--mx', x.toFixed(3)); h.style.setProperty('--my', y.toFixed(3));
    raf = (Math.abs(tx - x) > 0.001 || Math.abs(ty - y) > 0.001) ? requestAnimationFrame(tick) : null;
  }
  document.querySelector('.hero').addEventListener('pointermove', e => {
    tx = (e.clientX / innerWidth) * 2 - 1; ty = (e.clientY / innerHeight) * 2 - 1;
    if (!raf) raf = requestAnimationFrame(tick);
  });
})();

/* ── 메뉴 호버 롤: 글자를 두 겹으로 만들어 위로 굴러가게 ── */
(function navRoll() {
  document.querySelectorAll('.site-nav__list a').forEach(a => {
    const label = a.textContent.trim();
    a.classList.add('roll');
    a.innerHTML = '<span class="roll__box"><span>' + label + '</span><span aria-hidden="true">' + label + '</span></span>';
  });
})();

/* ── 로드 연출 1회 (히어로) ── */
requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-loaded')));

/* ── 헤더: 히어로를 벗어나면 solid ── */
(function initHeader() {
  const header = document.getElementById('siteHeader');
  if (!header) return;
  const update = () => header.classList.toggle('is-solid', window.scrollY > 24 || document.body.classList.contains('menu-open'));
  update();
  window.addEventListener('scroll', update, { passive: true });
})();

/* ── 모바일 메뉴 ── */
(function initMenu() {
  const toggle = document.getElementById('menuToggle');
  const nav = document.getElementById('siteNav');
  const header = document.getElementById('siteHeader');
  if (!toggle || !nav) return;
  const mq = window.matchMedia('(max-width: 1023px)');

  function setOpen(open, returnFocus) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    header.classList.toggle('is-solid', open || window.scrollY > 24);
    if (open) {
      const first = nav.querySelector('a');
      if (first) first.focus({ preventScroll: true });
    } else if (returnFocus) {
      toggle.focus({ preventScroll: true });
    }
  }

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true', false));
  nav.addEventListener('click', e => { if (e.target.closest('a') && mq.matches) setOpen(false, false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) setOpen(false, true);
    // 포커스 순환: 열린 메뉴 안에서만
    if (e.key === 'Tab' && nav.classList.contains('is-open')) {
      const items = [toggle, ...nav.querySelectorAll('a')];
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  mq.addEventListener('change', () => { if (!mq.matches) setOpen(false, false); });
})();

/* ── 현재 섹션 메뉴 표시 ── */
(function initActiveNav() {
  const links = [...document.querySelectorAll('.site-nav__list a[href^="#"]')];
  const map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
  const targets = [...map.keys()].map(id => document.getElementById(id)).filter(Boolean);
  if (!('IntersectionObserver' in window) || !targets.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const link = map.get(entry.target.id);
      if (entry.isIntersecting) {
        links.forEach(l => l.removeAttribute('aria-current'));
        link.setAttribute('aria-current', 'true');
      } else if (link.hasAttribute('aria-current')) {
        link.removeAttribute('aria-current');
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  targets.forEach(t => io.observe(t));
})();

/* ── FAQ 아코디언 (한 번에 하나) ── */
(function initFaq() {
  const list = document.getElementById('faqList');
  if (!list) return;
  const buttons = [...list.querySelectorAll('.acc__btn')];

  function setOpen(btn, open) {
    btn.setAttribute('aria-expanded', String(open));
    document.getElementById(btn.getAttribute('aria-controls')).classList.toggle('is-open', open);
  }
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const willOpen = btn.getAttribute('aria-expanded') !== 'true';
      buttons.forEach(b => { if (b !== btn) setOpen(b, false); });
      setOpen(btn, willOpen);
    });
  });
})();

/* ── Problem 자가 점검: 누른 항목 수를 보여주고, 신청서에 함께 담는다 ── */
(function initPains() {
  const items = [...document.querySelectorAll('.pain')];
  const result = document.getElementById('painsResult');
  const hidden = document.getElementById('fSelfCheck');
  if (!items.length) return;
  items.forEach(btn => btn.addEventListener('click', () => {
    btn.setAttribute('aria-pressed', String(btn.getAttribute('aria-pressed') !== 'true'));
    const on = items.filter(b => b.getAttribute('aria-pressed') === 'true');
    result.textContent = on.length ? on.length + '개 해당됩니다. 원인은 대부분 하나입니다.' : '';
    if (hidden) hidden.value = on.map(b => b.dataset.pain).join(', ');
  }));
})();

/* ─────────────────────────────────────────────
   폼 전송 어댑터 — 성공은 {ok:true}, 실패는 모두 throw
   ───────────────────────────────────────────── */
class SubmitError extends Error {
  constructor(kind, message) { super(message); this.kind = kind; } // config | timeout | network | server
}

async function submitContactForm(payload) {
  if (!FORM_ENDPOINT) throw new SubmitError('config', 'FORM_ENDPOINT 미설정');
  if (FORM_FORMAT === 'web3forms' && !WEB3FORMS_KEY) throw new SubmitError('config', 'WEB3FORMS_KEY 미설정');

  const subject = '[키워드마스터 ' + payload.lead_grade + '등급] 무료 상담 신청 — ' + payload.company;
  // 메일에서 읽기 쉽게: 한글 항목명 + 신청서 순서. 빈 선택 항목은 '-'
  const v = x => (x === undefined || x === null || x === '') ? '-' : String(x);
  const fields = {
    '리드 등급': payload.lead_grade + ' (' + payload.lead_score + '점)',
    '회사명': v(payload.company),
    '업종': v(payload.industry),
    '담당자': v(payload.name) + ' / ' + v(payload.role),
    '연락처': v(payload.phone),
    '이메일': v(payload.email),
    '홈페이지': v(payload.website),
    '필요한 마케팅 영역': v(payload.scope),
    '시작 희망 시점': v(payload.timing),
    '광고 성과를 문의 수로 확인': v(payload.tracking),
    '월 광고 예산': v(payload.budget),
    '닮고 싶거나 앞서고 싶은 업체': v(payload.benchmark),
    '기타 상담 내용': v(payload.message),
    '자가 점검(Problem 섹션)': v(payload.self_check),
    '개인정보 동의 시각': new Date(payload.agreed_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false }) + ' (한국 시간)',
    '신청 페이지': v(payload.page),
  };
  let body = { ...payload, _subject: subject };
  if (FORM_FORMAT === 'web3forms') {
    body = {
      access_key: WEB3FORMS_KEY,
      subject,
      from_name: '키워드마스터 웹사이트',
      replyto: payload.email,                          // 메일에서 '답장'을 누르면 신청자에게 바로
      ...fields,
    };
  }
  if (FORM_FORMAT === 'formsubmit') {
    body = { _subject: subject, _template: 'table', _captcha: 'false', _replyto: payload.email, ...fields };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FORM_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    throw new SubmitError(err.name === 'AbortError' ? 'timeout' : 'network', err.message);
  } finally {
    clearTimeout(timer);
  }
  let data = null;
  try { data = await res.json(); } catch (e) { /* 본문 없음 */ }
  // Web3Forms 는 success 를 true/false 로, FormSubmit 은 문자열("true"/"false")로 돌려줌
  if (!res.ok || (data && (data.success === false || data.success === 'false'))) throw new SubmitError('server', 'HTTP ' + res.status);
  return { ok: true };
}

/* ── 신청서: 검증 → 분류 → 전송 → 성공 / 실패 ── */
(function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const submitBtn = document.getElementById('contactSubmit');
  const status = document.getElementById('formStatus');
  const honeypot = document.getElementById('fWebsite');
  const btnHTML = submitBtn.innerHTML;
  let submitting = false;

  const $ = id => document.getElementById(id);
  const radio = name => (form.querySelector('input[name="' + name + '"]:checked') || {}).value || '';
  const fieldsetOf = name => form.querySelector('input[name="' + name + '"]').closest('fieldset');

  // 필수 항목 규칙: 순서대로 검사하고, 첫 오류로 포커스를 옮긴다
  const rules = [
    { key: 'timing',   group: true, err: 'qTimeErr',    msg: '시작 희망 시점을 선택해 주세요.' },
    { key: 'tracking', group: true, err: 'qTrackErr',   msg: '해당하는 항목을 선택해 주세요.' },
    { key: 'budget',   group: true, err: 'qBudgetErr',  msg: '월 광고 예산을 선택해 주세요.' },
    { id: 'fCompany',  err: 'fCompanyErr',  check: v => v ? '' : '회사명을 입력해 주세요.' },
    { id: 'fIndustry', err: 'fIndustryErr', check: v => v ? '' : '업종을 선택해 주세요.' },
    { id: 'fName',     err: 'fNameErr',     check: v => v ? '' : '담당자 이름을 입력해 주세요.' },
    { id: 'fRole',     err: 'fRoleErr',     check: v => v ? '' : '직책을 선택해 주세요.' },
    { id: 'fPhone',    err: 'fPhoneErr',    check: v => {
        const n = v.replace(/[\s.]/g, '');
        if (!n) return '연락처를 입력해 주세요.';
        return /^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(n) ? '' : '연락처 형식을 확인해 주세요. 예) 010-1234-5678';
      } },
    { id: 'fEmail',    err: 'fEmailErr',    check: v => {
        if (!v) return '이메일을 입력해 주세요.';
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : '이메일 형식을 확인해 주세요.';
      } },
    { id: 'fPrivacy',  err: 'fPrivacyErr',  checkbox: true, check: c => c ? '' : '개인정보 수집·이용에 동의해 주세요.' },
  ];

  function target(r) { return r.group ? fieldsetOf(r.key) : $(r.id); }
  function message(r) {
    if (r.group) return radio(r.key) ? '' : r.msg;
    const el = $(r.id);
    return r.check(r.checkbox ? el.checked : el.value.trim());
  }
  function setErr(r, msg) {
    $(r.err).textContent = msg;
    const el = target(r);
    if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  }
  function validate() {
    let first = null;
    rules.forEach(r => { const m = message(r); setErr(r, m); if (m && !first) first = r; });
    return first;
  }
  // 오류 표시 후에는 고치는 즉시 메시지를 지운다
  rules.forEach(r => {
    const el = target(r);
    el.addEventListener(r.group || r.checkbox || el.tagName === 'SELECT' ? 'change' : 'input', () => {
      if (el.hasAttribute('aria-invalid')) setErr(r, message(r));
    });
  });

  function scoreLead(d) {
    const pick = (table, v) => table[v] || 0;
    const score = pick(LEAD_RULES.budget, d.budget) + pick(LEAD_RULES.timing, d.timing) + pick(LEAD_RULES.role, d.role)
      + pick(LEAD_RULES.tracking, d.tracking) + pick(LEAD_RULES.industry, d.industry)
      + ((d.scopeCount >= 3 || /전체 통합 운영/.test(d.scope)) ? LEAD_RULES.scopeWide : 0)
      + (d.benchmark ? LEAD_RULES.benchmark : 0);
    const grade = LEAD_RULES.grade.find(([min]) => score >= min)[1];
    return { score, grade };
  }

  function setBusy(busy) {
    submitting = busy;
    submitBtn.setAttribute('aria-busy', String(busy));
    submitBtn.disabled = busy;
    if (busy) submitBtn.textContent = '보내는 중…';
    else submitBtn.innerHTML = btnHTML;
  }
  const showStatus = nodes => status.replaceChildren(...nodes);
  const doneMsg = '신청서가 접수됐습니다. 영업일 기준 1일 안에 담당자가 연락드립니다.';

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (submitting) return;
    showStatus([]);

    const first = validate();
    if (first) {
      const el = first.group ? fieldsetOf(first.key).querySelector('input') : $(first.id);
      el.focus({ preventScroll: true });
      el.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'center' });
      return;
    }
    if (honeypot && honeypot.value) { form.reset(); showStatus([doneMsg]); return; }

    const data = {
      budget: radio('budget'), tracking: radio('tracking'), timing: radio('timing'),
      scope: [...form.querySelectorAll('input[name="scope"]:checked')].map(i => i.value).join(', '),
      scopeCount: form.querySelectorAll('input[name="scope"]:checked:not(#scopeAll)').length,
      company: $('fCompany').value.trim(), industry: $('fIndustry').value,
      name: $('fName').value.trim(), role: $('fRole').value,
      phone: $('fPhone').value.trim(), email: $('fEmail').value.trim(),
      website: $('fSite').value.trim(), benchmark: ($('fBench') || {}).value ? $('fBench').value.trim() : '', message: $('fMsg').value.trim(),
      self_check: ($('fSelfCheck') || {}).value || '',
    };
    const lead = scoreLead(data);
    const payload = {
      ...data, lead_score: lead.score, lead_grade: lead.grade,
      privacy_agreed: true, agreed_at: new Date().toISOString(), page: location.href.split('#')[0],
    };

    setBusy(true);
    try {
      await submitContactForm(payload);
      form.reset();
      setBusy(false);
      showStatus([doneMsg]);
    } catch (err) {
      setBusy(false);
      const reason = {
        config: '온라인 접수가 아직 준비 중입니다.',
        timeout: '응답이 지연되고 있습니다.',
        network: '네트워크 연결을 확인해 주세요.',
        server: '일시적인 오류로 접수되지 않았습니다.',
      }[err.kind] || '접수되지 않았습니다.';
      const nodes = [reason + ' 입력하신 내용은 그대로 남아 있으니 잠시 후 다시 보내 주세요.'];
      if (CONTACT_EMAIL) {
        const a = document.createElement('a');
        a.href = 'mailto:' + CONTACT_EMAIL; a.textContent = CONTACT_EMAIL;
        nodes.push(' 계속 안 되면 ', a, '로 알려주세요.');
      }
      showStatus(nodes);
      if (window.console) console.info('[contact] submit failed:', err.kind);
    }
  });
})();

/* ── 시안3: 헤더 페이지 진행선 ── */
(function initPageProgress() {
  const bar = document.getElementById('pageProgress');
  if (!bar) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.setProperty('--pp', max > 0 ? (window.scrollY / max).toFixed(4) : 0);
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
})();

/* ── 스크롤 연출 ── */
(function initScrollEffects() {
  const canAnimate = 'IntersectionObserver' in window && !reduceMotion.matches;

  // A. 섹션 헤드라인 줄 단위 리빌: <br> 기준으로 줄을 나눠 감싼다 (HTML 원본은 그대로)
  const titles = document.querySelectorAll('#problemTitle, #oneTitle, #reportTitle, .cta__title');
  titles.forEach(el => {
    const lines = el.innerHTML.split(/<br\s*\/?>/i).map(s => s.trim()).filter(Boolean);
    el.innerHTML = lines.map(l => '<span class="rl"><span class="rl__in">' + l + '</span></span>').join('');
    el.classList.add('reveal-title');
  });

  // B. 핵심 문장 채우기: 어절 단위로 감싸고, 문장이 화면을 지나가는 정도에 따라 순서대로 채운다
  const fills = [...document.querySelectorAll('.cause__title, .band__text')];
  fills.forEach(el => {
    const parts = el.innerHTML.split(/(<br\s*\/?>|<br class="[^"]*"\s*\/?>)/i);
    el.innerHTML = parts.map(part => /^<br/i.test(part) ? part
      : part.split(/(\s+)/).map(w => w.trim() ? '<span class="fill-w">' + w + '</span>' : w).join('')).join('');
    el.classList.add('fill-text');
  });

  if (!canAnimate) {
    titles.forEach(el => el.classList.add('is-in'));
    document.querySelectorAll('.fill-w').forEach(w => w.classList.add('is-on'));
    document.querySelectorAll('.work-grid .case').forEach(c => c.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
  titles.forEach(el => io.observe(el));
  document.querySelectorAll('.work-grid .case').forEach(c => io.observe(c));

  let ticking = false;
  function updateFill() {
    ticking = false;
    const vh = window.innerHeight;
    fills.forEach(el => {
      const words = el.querySelectorAll('.fill-w');
      const r = el.getBoundingClientRect();
      // 문장 윗변이 화면 85% 지점에 오면 시작, 문장 아랫변이 화면 45% 지점에 오면 전부 채움
      const start = vh * 0.85, end = vh * 0.45;
      const p = Math.min(1, Math.max(0, (start - r.top) / (start - end + r.height)));
      const n = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('is-on', i < n));
    });
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(updateFill); } }, { passive: true });
  window.addEventListener('resize', updateFill);
  updateFill();
})();

/* ── 문의폼 · 필요한 마케팅 영역 ──
   '전체 통합 운영'을 고르면 모든 영역이 함께 선택되고, 하나라도 빼면 '전체'는 해제 */
(function initScopeField() {
  const set = document.getElementById('scopeSet');
  if (!set) return;
  const all = document.getElementById('scopeAll');
  const items = [...set.querySelectorAll('input[name="scope"]')].filter(i => i !== all);
  function update() { set.classList.toggle('is-all', all.checked); }
  all.addEventListener('change', () => { items.forEach(i => { i.checked = all.checked; }); update(); });
  items.forEach(i => i.addEventListener('change', () => { all.checked = items.every(x => x.checked); update(); }));
  set.closest('form').addEventListener('reset', () => setTimeout(update, 0));
})();

/* ── 신청서 2단계: 1) 우리 회사 상황 → 2) 회사와 연락 정보 ──
   자바스크립트가 없으면 한 장으로 보임. 1단계 필수 항목을 확인한 뒤에만 넘어감 */
(function initFormSteps() {
  const form = document.getElementById('contactForm');
  const next = document.getElementById('stepNext');
  const back = document.getElementById('stepBack');
  if (!form || !next || !back) return;
  const now = document.getElementById('stepNow');
  const groups = [
    ['timing', 'qTimeErr', '시작 희망 시점을 선택해 주세요.'],
    ['tracking', 'qTrackErr', '해당하는 항목을 선택해 주세요.'],
    ['budget', 'qBudgetErr', '월 광고 예산을 선택해 주세요.'],
  ];
  const go = (n, focus) => {
    form.dataset.step = String(n);
    now.textContent = String(n);
    const top = form.closest('.form-card').getBoundingClientRect().top + window.scrollY - (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 64) - 16;
    if (window.scrollY > top) window.scrollTo({ top, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    if (focus) setTimeout(() => focus.focus({ preventScroll: true }), 50);
  };
  form.dataset.step = '1';
  next.addEventListener('click', () => {
    let first = null;
    groups.forEach(([name, errId, msg]) => {
      const checked = form.querySelector('input[name="' + name + '"]:checked');
      const fs = form.querySelector('input[name="' + name + '"]').closest('fieldset');
      document.getElementById(errId).textContent = checked ? '' : msg;
      if (checked) fs.removeAttribute('aria-invalid'); else { fs.setAttribute('aria-invalid', 'true'); first = first || fs; }
    });
    if (first) { first.querySelector('input').focus({ preventScroll: true }); first.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'center' }); return; }
    go(2, document.getElementById('fCompany'));
  });
  back.addEventListener('click', () => go(1, form.querySelector('#formStep1 input')));
  // 사례 카드에서 들어온 경우에도 1단계부터 시작
  form.addEventListener('reset', () => setTimeout(() => { form.dataset.step = '1'; now.textContent = '1'; }, 0));
})();

/* ── 모바일 하단 고정 CTA: Hero 를 지나면 보이고, 문의 섹션이 보이면 숨김 ── */
(function initMobileCta() {
  const bar = document.getElementById('mobileCta');
  const hero = document.querySelector('.hero');
  const contact = document.getElementById('contact');
  if (!bar || !hero || !contact || !('IntersectionObserver' in window)) return;
  let pastHero = false, atContact = false;
  const update = () => {
    const on = pastHero && !atContact;
    bar.classList.toggle('is-on', on);
    if (on) bar.removeAttribute('inert'); else bar.setAttribute('inert', '');
  };
  new IntersectionObserver(es => { pastHero = !es[0].isIntersecting; update(); }, { threshold: 0.15 }).observe(hero);
  new IntersectionObserver(es => { atContact = es[0].isIntersecting; update(); }, { rootMargin: '0px 0px -30% 0px' }).observe(contact);
})();

/* ── Hero 헤드라인 롤: "마케팅의 [검색광고 → … → 모든 키워드]를, 마스터하다." ──
   헤드라인 등장 뒤 한 번만 재생. 단어 폭이 달라도 부드럽게 늘고 줄어듦.
   동작 줄이기·자바스크립트 없음 → '모든 키워드' 고정 */
(function heroRoll() {
  const roll = document.getElementById('heroRoll');
  const index = document.getElementById('heroIndex');
  const heroEl = document.querySelector('.hero');
  if (!roll || reduceMotion.matches) { if (heroEl) heroEl.classList.add('is-mastered'); return; }
  const words = roll.dataset.words.split('|');
  const items = index ? [...index.querySelectorAll('.hero__ix')] : [];
  // 단어들을 세로로 쌓은 트랙 구성
  roll.textContent = '';
  const track = document.createElement('span'); track.className = 'roll__track';
  words.forEach((w, n) => {
    const s = document.createElement('span'); s.className = 'roll__w';
    if (n === words.length - 1 && w.includes('키워드')) {
      s.classList.add('roll__w--final');
      s.append(w.replace('키워드', ''));
      const h = document.createElement('span'); h.className = 'hl hl--k';
      [...'키워드'].forEach((c, k) => { const x = document.createElement('span'); x.className = 'hc'; x.textContent = c; x.style.setProperty('--j', k); h.appendChild(x); });
      s.appendChild(h);
    } else s.textContent = w;
    track.appendChild(s);
  });
  roll.appendChild(track);
  const els = [...track.children];
  const widthOf = i => els[i].getBoundingClientRect().width;
  let cur = 0;
  function show(i, animate) {
    cur = i;
    roll.classList.toggle('no-anim', !animate);
    track.style.transform = `translateY(${-i * 100 / words.length}%)`;
    roll.style.width = widthOf(i) + 'px';
    roll.classList.toggle('is-final', i === words.length - 1);
    items.forEach((it, k) => it.classList.toggle('is-on', k <= Math.min(i, items.length - 1)));
    if (index) index.classList.toggle('is-all', i === words.length - 1);
    if (i === words.length - 1 && animate) setTimeout(() => heroEl.classList.add('is-mastered'), 420);
  }
  // 글꼴이 준비된 뒤 폭을 재고 시작
  const start = () => {
    show(0, false);
    const STEP = 460, START = 1100;
    words.forEach((_, i) => { if (i) setTimeout(() => show(i, true), START + i * STEP + (i === words.length - 1 ? 180 : 0)); });
  };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start);
  window.addEventListener('resize', () => { roll.classList.add('no-anim'); roll.style.width = widthOf(cur) + 'px'; });
})();

/* ── Services: 카드 등장 + 강조 ──
   마우스: 올린 카드 강조 (CSS :hover). 터치(호버 없음): 화면 가운데에 온 카드 강조. */
(function initSvc() {
  const cards = [...document.querySelectorAll('#svcGrid .svc')];
  const enough = document.getElementById('svcEnough');
  if (!cards.length) return;
  const cols = () => window.matchMedia('(max-width: 1023px)').matches ? 2 : 3;
  cards.forEach((c, i) => c.style.setProperty('--d', (i % cols()) * 90 + 'ms'));
  const all = enough ? [...cards, enough] : cards;
  if (!('IntersectionObserver' in window) || reduceMotion.matches) all.forEach(el => el.classList.add('is-in'));
  else {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: 0.25 });
    all.forEach(el => io.observe(el));
  }
  if (!window.matchMedia('(hover: hover)').matches && 'IntersectionObserver' in window) {
    const mid = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-active', e.isIntersecting)), { rootMargin: '-42% 0px -42% 0px' });
    cards.forEach(c => mid.observe(c));
  }
})();

/* ── Services: 상담에 담기 ──
   카드를 누르면 '담았어요' → 신청서 '필요한 마케팅 영역'에 같은 항목이 체크됨 (data-scope, 여러 개는 | 로 구분).
   신청서에서 항목을 해제하면 그 항목을 쓰는 카드도 해제. 담은 서비스는 카드 아래 띠와 모바일 하단 버튼에 표시.
   마우스: 올린 카드에 커서 위치를 따라오는 빛 (--mx, --my) */
(function initSvcPick() {
  const grid = document.getElementById('svcGrid');
  const set = document.getElementById('scopeSet');
  if (!grid || !set) return;
  const cards = [...grid.querySelectorAll('.svc[data-scope]')];
  const tray = document.getElementById('svcTray');
  const list = document.getElementById('svcTrayList');
  const mcta = document.querySelector('#mobileCta .btn');
  const mctaHTML = mcta ? mcta.innerHTML : '';
  const all = document.getElementById('scopeAll');
  const box = v => [...set.querySelectorAll('input[name="scope"]')].find(i => i.value === v);
  const vals = c => c.dataset.scope.split('|');
  const name = c => c.querySelector('.svc__t').textContent.replace(/\s·\s/g, '·');
  const picked = () => cards.filter(c => c.classList.contains('is-picked'));
  let syncing = false;

  function render() {
    const p = picked();
    cards.forEach(c => {
      const on = c.classList.contains('is-picked');
      const b = c.querySelector('.svc__add');
      b.setAttribute('aria-pressed', String(on));
      b.querySelector('span').textContent = on ? '담았어요' : '상담에 담기';
    });
    if (tray) { tray.hidden = !p.length; list.textContent = p.map(name).join(', '); }
    if (mcta) mcta.innerHTML = p.length ? '담은 서비스 ' + p.length + '개로 상담 받기 <span class="btn__arrow" aria-hidden="true">→</span>' : mctaHTML;
  }
  function toggle(card) {
    const before = new Set(picked().flatMap(vals));
    card.classList.toggle('is-picked');
    const after = new Set(picked().flatMap(vals));
    syncing = true;
    vals(card).forEach(v => {
      const i = box(v); if (!i) return;
      const want = after.has(v);
      if (i.checked !== want && (want || before.has(v))) { i.checked = want; i.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    syncing = false;
    render();
  }
  cards.forEach(c => c.addEventListener('click', e => { if (!e.target.closest('a')) toggle(c); }));
  set.addEventListener('change', e => {
    const i = e.target;
    if (syncing || !i || i.name !== 'scope') return;
    if (i === all) cards.forEach(c => c.classList.toggle('is-picked', i.checked));
    else if (!i.checked) cards.forEach(c => { if (vals(c).includes(i.value)) c.classList.remove('is-picked'); });
    render();
  });
  set.closest('form').addEventListener('reset', () => setTimeout(() => { cards.forEach(c => c.classList.remove('is-picked')); render(); }, 0));

  if (window.matchMedia('(hover: hover)').matches) {
    cards.forEach(c => c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }));
  }
})();

/* ── 섹션 위치 표시 (데스크톱): 지금 읽는 섹션 번호를 오른쪽 가장자리에 표시, 누르면 이동 ──
   Hero 를 지나면 나타남. 밝은 배경 위에서는 짙은 색으로 바뀜 */
(function initRail() {
  const rail = document.getElementById('rail');
  if (!rail || !('IntersectionObserver' in window)) return;
  const defs = [
    ['top', '01', 'Intro'], ['problem', '02', 'Problem'], ['one', '03', 'Services'],
    ['loop', '04', 'How'], ['work', '05', 'Work'], ['start', '06', 'Start'],
    ['faq', '07', 'FAQ'], ['contact', '08', 'Contact'],
  ].filter(([id]) => document.getElementById(id));
  rail.innerHTML = '<ol>' + defs.map(([id, n, name]) =>
    `<li><a href="#${id}" data-id="${id}" aria-label="${n} ${name}"><span class="rail__n">${n} ${name}</span></a></li>`).join('') + '</ol>';
  rail.hidden = false;
  const links = [...rail.querySelectorAll('a')];
  // 1) 현재 섹션: 화면 가운데 줄에 걸친 번호 섹션
  const curIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    links.forEach(a => { const on = a.dataset.id === e.target.id; a.classList.toggle('is-cur', on); if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  }), { rootMargin: '-50% 0px -50% 0px' });
  defs.forEach(([id]) => curIO.observe(document.getElementById(id)));
  // 2) 색: 레일 높이(화면 가운데)에 깔린 모든 섹션의 밝기를 따라감 (띠·푸터 포함)
  const toneIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) rail.classList.toggle('is-light', e.target.classList.contains('theme-light'));
  }), { rootMargin: '-50% 0px -50% 0px' });
  document.querySelectorAll('main > section, .site-footer').forEach(s => toneIO.observe(s));
  // 3) Hero 를 지나면 표시
  new IntersectionObserver(es => rail.classList.toggle('is-on', !es[0].isIntersecting), { threshold: 0.6 }).observe(document.getElementById('top'));
  // 4) 읽은 만큼 세로선 채우기
  const ol = rail.querySelector('ol'); let ticking = false;
  const fill = () => { ticking = false; const max = document.documentElement.scrollHeight - innerHeight; ol.style.setProperty('--p', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0); };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(fill); } }, { passive: true });
  window.addEventListener('resize', fill); fill();
})();

/* ── Start: 기초 판 → 계단 블록 → 첫 달 세 가지, 화면에 들어오면 1회 ── */
(function initStair() {
  const els = ['startStair', 'startKnow'].map(id => document.getElementById(id)).filter(Boolean);
  if (!els.length) return;
  if (!('IntersectionObserver' in window) || reduceMotion.matches) { els.forEach(el => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: 0.3 });
  els.forEach(el => io.observe(el));
})();

/* ── How: 상승 곡선 그래프 ──
   하나의 성장 곡선(갈수록 가팔라지는 지수 곡선)을 먼저 정하고, 막대 꼭대기가 곡선 바로 아래 오도록 높이를 계산.
   마지막 점 너머로 같은 곡선을 점선으로 연장(다음 달). 화면 폭이 바뀌면 다시 계산. */
(function initHow() {
  const graph = document.getElementById('howGraph');
  const rise = document.getElementById('howRise');
  const svg = document.getElementById('howLine');
  if (!graph || !rise || !svg) return;
  const bars = [...rise.querySelectorAll('.how__bar')];
  const NS = 'http://www.w3.org/2000/svg';
  function draw() {
    const H = rise.clientHeight, W = rise.clientWidth, R = rise.getBoundingClientRect();
    const top = H - 24, base = Math.round(H * 0.285), k = 1.5, lift = 18;
    const cx = bars.map(b => { const r = b.getBoundingClientRect(); return (r.left + r.right) / 2 - R.left; });
    const x1 = cx[cx.length - 1];
    const f = x => base + (top - base) * (Math.exp(k * x / x1) - 1) / (Math.exp(k) - 1);
    bars.forEach((b, i) => { b.style.height = Math.max(44, f(cx[i]) - lift) + 'px'; });
    const pts = []; for (let i = 0; i <= 80; i++) { const x = x1 * i / 80; pts.push([x, H - f(x)]); }
    const line = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
    const area = line + ` L${x1.toFixed(1)} ${H} L0 ${H} Z`;
    const ext = []; for (let i = 0; i <= 40; i++) { const x = x1 + (W - x1) * i / 40; const y = H - f(x); if (y < -14) break; ext.push([x, y]); }
    let extSvg = '';
    if (ext.length > 3) {
      const e1 = ext[ext.length - 1], e0 = ext[ext.length - 3], a = Math.atan2(e1[1] - e0[1], e1[0] - e0[0]);
      const ah = d => [e1[0] - 10 * Math.cos(a + d), e1[1] - 10 * Math.sin(a + d)];
      const [p1, p2] = [ah(0.5), ah(-0.5)];
      extSvg = `<g class="hl-ext"><path d="M${ext.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L')}" fill="none" stroke="#A9BBFF" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="2 8"/>` +
        `<path d="M${p1[0]} ${p1[1]} L${e1[0]} ${e1[1]} L${p2[0]} ${p2[1]}" fill="none" stroke="#A9BBFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    }
    const nodes = cx.map(x => [x, H - f(x)]), last = nodes[nodes.length - 1];
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = extSvg +
      `<path class="hl-area" d="${area}" fill="rgba(169,187,255,.08)"/>` +
      `<path class="hl-main" d="${line}" pathLength="1" fill="none" stroke="#A9BBFF" stroke-width="3" stroke-linecap="round"/>` +
      nodes.slice(0, -1).map((p, i) => `<circle class="hl-node" style="--n:${i}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="5" fill="#121A33" stroke="#A9BBFF" stroke-width="2.5"/>`).join('') +
      `<circle class="hl-node" style="--n:3" cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="8" fill="#A9BBFF"/>` +
      `<circle class="hl-node hl-ripple" style="--n:3" cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="16" fill="none" stroke="#A9BBFF" stroke-opacity=".35" stroke-width="2"/>`;
  }
  let t = null;
  const redraw = () => { clearTimeout(t); t = setTimeout(draw, 80); };
  draw();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  window.addEventListener('resize', redraw);
  if ('ResizeObserver' in window) new ResizeObserver(redraw).observe(rise);
  if (!('IntersectionObserver' in window) || reduceMotion.matches) { graph.classList.add('is-in'); return; }
  const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { graph.classList.add('is-in'); io.disconnect(); } }, { threshold: 0.35 });
  io.observe(graph);
})();

/* ── Contact 헤드라인: "[무엇]부터 시작할까요?" ──
   굴러가는 효과 없이, 신청서 '필요한 마케팅 영역'에서 마지막으로 고른 분야가 들어감.
   마지막 것을 해제하면 그 전에 고른 분야로, 전체 통합 운영 → "전부 함께 시작할까요?", 모두 해제 → "무엇".
   데스크톱에서는 신청서 옆 칸에도 같은 문장이 따라 나타남 */
(function ctaRoll() {
  const word = document.getElementById('ctaRoll');
  const title = document.getElementById('ctaTitle');
  const set = document.getElementById('scopeSet');
  if (!word || !title || !set) return;
  const map = {
    '검색광고': '검색광고', 'SNS 광고': 'SNS 광고', 'SEO / GEO': 'SEO·GEO', '콘텐츠 / 바이럴': '콘텐츠·바이럴',
    '언론보도': '언론보도', '영상광고': '영상광고', '홈페이지 / 랜딩페이지': '홈페이지', '마케팅 컨설팅': '마케팅 컨설팅', '플레이스': '플레이스',
  };
  const swap = (el, text) => {
    if (el.textContent === text) return;
    el.textContent = text;
    if (reduceMotion.matches) return;
    el.classList.remove('is-swap'); void el.offsetWidth; el.classList.add('is-swap');
  };
  const order = [];                                    // 고른 순서 (마지막이 가장 최근)
  const all = document.getElementById('scopeAll');
  function update() {
    const checked = [...set.querySelectorAll('input[name="scope"]:checked')].map(i => i.value).filter(v => v !== '전체 통합 운영');
    for (let k = order.length - 1; k >= 0; k--) if (!checked.includes(order[k])) order.splice(k, 1);
    let text = '무엇';
    if (all && all.checked) text = '전부 함께';
    else if (checked.length) text = map[order.length ? order[order.length - 1] : checked[checked.length - 1]] || '무엇';
    swap(word, text);
    title.classList.toggle('is-all', text === '전부 함께');
    const mini = document.getElementById('ctaMini');   // 태블릿·모바일: 신청서 위에 고정되는 줄
    if (mini) {
      swap(mini.querySelector('.form__mini-w'), text);
      mini.classList.toggle('is-all', text === '전부 함께');
      mini.classList.toggle('is-on', text !== '무엇');
    }
  }
  set.addEventListener('change', e => {
    const input = e.target;
    if (input && input.name === 'scope' && input !== all) {
      const k = order.indexOf(input.value); if (k >= 0) order.splice(k, 1);
      if (input.checked) order.push(input.value);
    }
    update();
  });
  set.closest('form').addEventListener('reset', () => { order.length = 0; setTimeout(update, 0); });
})();

/* ── Hero 신뢰 숫자: 0부터 목표값까지 올라감 (약 1.1초, 한 번만)
   첫 화면에 있으므로 헤드라인 글자가 자리 잡은 뒤(약 0.9초) 시작 ── */
(function initTrustCount() {
  const box = document.getElementById('trustStats');
  if (!box || !('IntersectionObserver' in window) || reduceMotion.matches) return;
  const nums = [...box.querySelectorAll('[data-to]')];
  nums.forEach(n => { n.textContent = '0'; });
  const run = () => {
    const t0 = performance.now(), D = 1100;
    const tick = now => {
      const p = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - p, 3);
      nums.forEach(n => { n.textContent = String(Math.round(+n.dataset.to * e)); });
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); setTimeout(run, 900); } }, { threshold: 0.5 });
  io.observe(box);
})();

/* ── Problem 표: 화면에 들어오면 한 번 재생 (CSS 가 순서를 맡음) ── */
(function initSplit() {
  const t = document.querySelector('.split');
  if (!t) return;
  if (!('IntersectionObserver' in window) || reduceMotion.matches) { t.classList.add('is-in'); return; }
  const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { t.classList.add('is-in'); io.disconnect(); } }, { threshold: 0.4 });
  io.observe(t);
})();

/* ── Work: 성과 사례 카드 ──
   1) 넘기기: 화살표 · 점 · "01 — 07" (가로 스크롤 + 스냅, 손가락으로도 넘김)
   2) 등장: 카드가 화면에 들어오면 입력창에 한 글자씩 입력 →
      주소창은 로딩 막대 → 화면 → 큰 표현(숫자는 0부터 올라감). 카드마다 한 번 */
(function initWork() {
  const track = document.getElementById('workTrack');
  if (!track) return;
  const cards = [...track.querySelectorAll('.wk')];
  const dotsBox = document.getElementById('workDots');
  const count = document.getElementById('workCount');
  const arrows = [...document.querySelectorAll('#workCar .wk-arr')];
  const pad = n => String(n).padStart(2, '0');
  dotsBox.innerHTML = cards.map(() => '<i></i>').join('');
  const dots = [...dotsBox.children];
  const step = () => cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : track.clientWidth;
  function sync() {
    const i = Math.min(cards.length - 1, Math.round(track.scrollLeft / step()));
    const end = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    const cur = end ? cards.length - 1 : i;
    dots.forEach((d, k) => d.classList.toggle('is-on', k === cur));
    if (count) count.textContent = `${pad(cur + 1)} — ${pad(cards.length)}`;
    arrows[0].disabled = track.scrollLeft <= 4;
    arrows[1].disabled = end;
  }
  arrows.forEach(a => a.addEventListener('click', () => track.scrollBy({ left: step() * +a.dataset.dir, behavior: reduceMotion.matches ? 'auto' : 'smooth' })));
  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); track.scrollBy({ left: step() * (e.key === 'ArrowRight' ? 1 : -1) }); }
  });
  let raf = 0;
  track.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync); }, { passive: true });
  window.addEventListener('resize', sync);
  sync();

  // 등장 연출
  if (!('IntersectionObserver' in window) || reduceMotion.matches) { cards.forEach(c => c.classList.add('is-done')); return; }
  track.classList.add('is-anim');
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const countUp = b => {
    const to = +b.dataset.to, dec = +b.dataset.dec || 0, sign = b.dataset.sign || '', t0 = performance.now(), D = 700;
    const tick = now => { const p = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - p, 3); b.textContent = sign + (to * e).toFixed(dec); if (p < 1) requestAnimationFrame(tick); };
    b.textContent = sign + (0).toFixed(dec); requestAnimationFrame(tick);
  };
  cards.forEach(c => { const t = c.querySelector('.wk__txt'); t.textContent = ''; const b = c.querySelector('[data-to]'); if (b) b.textContent = (b.dataset.sign || '') + (0).toFixed(+b.dataset.dec || 0); });
  // 속도: 입력은 글자 수와 상관없이 약 0.3초 안에 끝나고, 화면 → 숫자가 바로 이어짐 (화면 약 0.6초, 숫자 약 0.8초)
  async function play(c) {
    const t = c.querySelector('.wk__txt'), full = t.dataset.text;
    const per = Math.min(40, Math.round(300 / full.length));
    for (let k = 1; k <= full.length; k++) { t.textContent = full.slice(0, k); await wait(per); }
    await wait(70);
    if (c.dataset.kind === 'web') { c.classList.add('is-loading'); await wait(260); }
    c.classList.add('is-shot'); await wait(200);
    c.classList.add('is-metric');
    const b = c.querySelector('[data-to]'); if (b) countUp(b);
    await wait(700); c.classList.add('is-done');
  }
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; io.unobserve(e.target);
    const k = cards.indexOf(e.target);
    setTimeout(() => play(e.target), Math.max(0, k % 3) * 120);   // 한 화면에 함께 들어온 카드는 왼쪽부터 차례로 (짧은 간격)
  }), { threshold: 0.15 });
  cards.forEach(c => io.observe(c));
})();

/* ── How: 단계와 막대 함께 밝히기 ──
   FIND → 노출, CHOOSE → 클릭, CONTACT → 문의 행동, MEASURE → 실제 문의 · 계약 (같은 순서끼리 짝)
   마우스: 올리면 밝아지고 벗어나면 원래대로 / 키보드: 포커스 / 터치: 누르면 켜고, 다시 누르거나 바깥을 누르면 끔 */
(function initHowLink() {
  const graph = document.getElementById('howGraph');
  if (!graph) return;
  const stages = [...graph.querySelectorAll('.how__stg')];
  const cols = [...graph.querySelectorAll('.how__col')];
  if (!stages.length || stages.length !== cols.length) return;
  let cur = -1;
  const set = i => {
    cur = i;
    graph.classList.toggle('is-focus', i >= 0);
    if (i >= 0) graph.classList.add('is-touched');   // 처음 고른 뒤부터 곡선 아래 면이 바로 돌아오게 (첫 등장 지연 없이)
    stages.forEach((s, k) => s.classList.toggle('is-on', k === i));
    cols.forEach((c, k) => c.classList.toggle('is-on', k === i));
  };
  let lastType = 'mouse';
  stages.forEach((s, i) => {
    s.addEventListener('pointerdown', e => { lastType = e.pointerType || 'mouse'; });
    s.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') set(i); });
    s.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') set(-1); });
    // 키보드 포커스만 (터치로 눌렀을 때 생기는 포커스는 아래 click 이 처리)
    s.addEventListener('focus', () => { if (s.matches(':focus-visible')) set(i); });
    s.addEventListener('blur', () => { if (cur === i && lastType === 'mouse') set(-1); });
    s.addEventListener('click', () => { if (lastType !== 'mouse') set(cur === i ? -1 : i); });
  });
  document.addEventListener('click', e => { if (cur >= 0 && !e.target.closest('.how__stg')) set(-1); });
})();
