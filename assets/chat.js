(() => {
  'use strict';

  const model = 'gemini-3.5-flash-lite';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const systemInstruction = `당신은 광주 인스타 연구소(광인소)의 AI 상담원입니다. 한국어로 친절하고 구체적으로 답하세요.
광인소는 광주 지역 사업자들의 SNS 콘텐츠 마케팅을 돕는 팀이며 사명은 "광주 대표님들의 자립을 돕는다"입니다.
자립은 단순한 인스타그램 사용법이 아니라 내 사업의 강점을 이해하고, 내 이야기를 콘텐츠로 만들고, 고객에게 직접 알리는 힘입니다. 단순 대행보다 대표가 스스로 미디어를 만들어가는 것을 중요하게 생각합니다.
프로그램은 사업자의 상황과 필요에 따라 선택하며 모두 순서대로 수강할 필요는 없습니다.
1. 무료 컨설팅: 사업과 계정을 함께 분석하고 SNS 운영 방향을 잡습니다.
2. 원데이 클래스: 콘텐츠 소재, 노출 원리, 릴스, 계정 운영의 기본을 알려드립니다.
3. 5주 코칭 프로그램: 대표가 직접 콘텐츠를 기획하고 제작할 수 있도록 실제 계정을 함께 운영합니다.
4. 콘텐츠 구독 대행: 대표의 경험과 사업의 강점을 발굴해 콘텐츠로 기획·촬영·제작합니다.
광인소는 자신의 인스타그램을 직접 운영해 광주 지역 대표님들과 접점을 만들고 무료 컨설팅과 클래스, 코칭과 제작으로 연결합니다. 가르치는 방법을 자신의 사업에도 적용합니다.
광주관광공사와 호남대학교 앵커사업단이 주관하는 호남문화관광주간 홍보 콘텐츠 제작에 참여하며, 호남의 관광자원과 사업을 카드뉴스와 릴스 콘텐츠로 기획·제작하고 있습니다.
사업의 업종과 상황을 확인하고 스스로 실행할 수 있는 콘텐츠 아이디어와 적합한 프로그램을 제안하세요. 필요한 질문은 한 번에 1~2개만 하세요.
무료 컨설팅 이외 프로그램의 가격, 수업 일정, 신청 링크, 연락처, 계정 주소, 조회수, 실적, 예약 가능 여부는 제공된 정보가 없으므로 지어내지 마세요. 견적·계약·예약을 확정하거나 팔로워·매출 증가를 보장하지 마세요.
당신은 AI이며 실제 직원과의 상담을 연결하거나 신청을 접수할 수 없습니다. API 키나 개인정보를 대화에 입력하도록 요청하지 마세요.
응답은 간결한 일반 텍스트로 작성하세요.`;

  const keyInput = document.querySelector('#gemini-key');
  const input = document.querySelector('#chat-input');
  const form = document.querySelector('#chat-form');
  const log = document.querySelector('#chat-messages');
  const status = document.querySelector('#chat-status');
  const send = document.querySelector('#send-chat');
  const stop = document.querySelector('#stop-chat');
  const toggle = document.querySelector('#toggle-key');
  const suggestions = [...document.querySelectorAll('[data-chat-prompt]')];
  const welcome = log.firstElementChild.cloneNode(true);
  let history = [];
  let active = null;

  function setStatus(message, error = false) {
    status.textContent = message;
    status.dataset.error = String(error);
  }

  function addMessage(role, text) {
    const bubble = document.createElement('div');
    bubble.className = `chat-message ${role}`;
    const label = document.createElement('strong');
    label.textContent = role === 'user' ? '나' : 'AI 상담원';
    const content = document.createElement('p');
    content.textContent = text;
    bubble.append(label, content);
    log.append(bubble);
    log.scrollTop = log.scrollHeight;
    return bubble;
  }

  function setBusy(busy) {
    send.disabled = busy;
    input.disabled = busy;
    keyInput.disabled = busy;
    suggestions.forEach(button => { button.disabled = busy; });
    stop.hidden = !busy;
    form.setAttribute('aria-busy', String(busy));
  }

  function cancel() {
    if (!active) return;
    const request = active;
    active = null;
    request.controller.abort();
    request.bubble.remove();
    setBusy(false);
  }

  toggle.addEventListener('click', () => {
    const visible = keyInput.type === 'password';
    keyInput.type = visible ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', String(visible));
    toggle.textContent = visible ? '키 숨기기' : '키 보기';
  });

  function reset() {
    cancel();
    history = [];
    log.replaceChildren(welcome.cloneNode(true));
    input.value = '';
  }

  document.querySelector('#clear-key').addEventListener('click', () => {
    reset();
    keyInput.value = '';
    keyInput.type = 'password';
    toggle.setAttribute('aria-pressed', 'false');
    toggle.textContent = '키 보기';
    setStatus('API 키와 대화를 지웠습니다.');
    keyInput.focus();
  });

  document.querySelector('#reset-chat').addEventListener('click', () => {
    reset();
    setStatus('새로운 상담을 시작하세요.');
    input.focus();
  });

  stop.addEventListener('click', () => {
    cancel();
    setStatus('응답을 취소했습니다. 입력한 내용을 다시 보낼 수 있습니다.');
    input.focus();
  });

  suggestions.forEach(button => button.addEventListener('click', () => {
    input.value = button.dataset.chatPrompt;
    input.focus();
  }));

  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  function apiError(code) {
    if (code === 400 || code === 401) return 'API 키 또는 요청을 확인해 주세요. 유효한 Gemini API 키가 필요합니다.';
    if (code === 403) return 'API 사용 권한이 없습니다. 키의 Gemini API 권한과 사용 가능한 지역을 확인해 주세요.';
    if (code === 404) return `${model} 모델을 사용할 수 없습니다. 모델명과 해당 키의 접근 권한을 확인해 주세요.`;
    if (code === 429) return '요청 한도 또는 할당량을 초과했습니다. Google AI Studio에서 할당량·결제를 확인하거나 잠시 후 다시 시도해 주세요.';
    return 'Gemini 서비스에서 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (active) return;
    const key = keyInput.value.trim();
    const text = input.value.trim();
    if (!key) {
      setStatus('먼저 나의 Gemini API 키를 입력해 주세요.', true);
      keyInput.focus();
      return;
    }
    if (!text || text.length > 4000) {
      setStatus('상담 내용을 1~4,000자로 입력해 주세요.', true);
      input.focus();
      return;
    }

    const userTurn = { role: 'user', parts: [{ text }] };
    const request = { controller: new AbortController(), bubble: addMessage('user', text), timedOut: false };
    active = request;
    setBusy(true);
    setStatus('AI 상담원이 답변을 작성하고 있습니다…');
    const timeout = setTimeout(() => {
      request.timedOut = true;
      request.controller.abort();
    }, 60000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        signal: request.controller.signal,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [...history.slice(-20), userTurn],
          generationConfig: { maxOutputTokens: 2048 }
        })
      });
      if (!response.ok) throw new Error(apiError(response.status));
      const data = await response.json();
      if (active !== request) return;
      const candidate = data.candidates?.[0];
      if (data.promptFeedback?.blockReason || (candidate?.finishReason && !['STOP', 'MAX_TOKENS'].includes(candidate.finishReason))) {
        throw new Error('이 질문에 대한 답변이 제한되었습니다. 내용을 바꾸어 다시 질문해 주세요.');
      }
      const answer = (candidate?.content?.parts || [])
        .filter(part => !part.thought && typeof part.text === 'string')
        .map(part => part.text).join('\n').trim();
      if (!answer) throw new Error('답변을 받지 못했습니다. 질문을 조금 더 구체적으로 작성해 주세요.');
      addMessage('assistant', answer);
      history = [...history, userTurn, { role: 'model', parts: [{ text: answer }] }].slice(-20);
      input.value = '';
      setStatus(candidate.finishReason === 'MAX_TOKENS' ? '답변이 길어 일부만 표시되었습니다. 이어서 질문해 주세요.' : '답변이 도착했습니다. 이어서 질문해 보세요.');
    } catch (error) {
      if (active !== request) return;
      request.bubble.remove();
      const message = request.timedOut ? '응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.'
        : error instanceof TypeError ? 'Gemini에 연결하지 못했습니다. 인터넷 연결과 브라우저의 API 접근을 확인해 주세요.'
        : error instanceof SyntaxError ? 'Gemini 응답을 읽지 못했습니다. 다시 시도해 주세요.'
        : error.message;
      setStatus(message, true);
    } finally {
      clearTimeout(timeout);
      if (active === request) {
        active = null;
        setBusy(false);
        input.focus();
      }
    }
  });
})();
