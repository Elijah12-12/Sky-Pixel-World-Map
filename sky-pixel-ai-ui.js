(function (global) {
  'use strict';

  const STORAGE_KEY = 'skyPixelAtlas.conversations.v1';
  const ACTIVE_KEY = 'skyPixelAtlas.activeConversation.v1';
  const MAX_HISTORY = 40;

  const state = { open: false, busy: false, conversations: [], activeId: null, context: {} };
  const els = {};

  const escapeHTML = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
  const uid = () => (global.crypto?.randomUUID?.() || `atlas-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const nowISO = () => new Date().toISOString();

  function markdownLite(text) {
    let safe = escapeHTML(text);
    safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');
    return safe.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  }

  function readStorage() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      state.conversations = Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : [];
      state.activeId = localStorage.getItem(ACTIVE_KEY) || state.conversations[0]?.id || null;
    } catch (_) { state.conversations = []; state.activeId = null; }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.conversations.slice(0, MAX_HISTORY)));
      if (state.activeId) localStorage.setItem(ACTIVE_KEY, state.activeId);
      else localStorage.removeItem(ACTIVE_KEY);
    } catch (_) { /* private mode/storage quota */ }
  }

  function activeConversation() { return state.conversations.find((c) => c.id === state.activeId) || null; }

  function createConversation() {
    const conversation = { id: uid(), title: 'New Atlas conversation', createdAt: nowISO(), updatedAt: nowISO(), messages: [] };
    state.conversations.unshift(conversation);
    state.activeId = conversation.id;
    persist();
    return conversation;
  }

  function ensureConversation() { return activeConversation() || createConversation(); }

  function titleFrom(text) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    return clean.length > 46 ? `${clean.slice(0, 43)}…` : clean || 'Atlas conversation';
  }

  function buildUI() {
    const root = document.createElement('div');
    root.id = 'skyPixelAtlasRoot';
    root.innerHTML = `
      <button class="atlas-launcher atlas-search-launcher" id="skyPixelAtlasLauncher" type="button" aria-controls="skyPixelAtlasSidebar" aria-expanded="false" title="Open Atlas AI"><span class="atlas-launcher__orb" aria-hidden="true"><i></i><i></i><i></i></span><span class="atlas-launcher__label"><strong>AI Atlas</strong><small>Ask the map</small></span></button>
      <button class="sky-pixel-tools-launcher" id="skyPixelToolsLauncher" type="button" aria-controls="skyPixelMapToolsPanel" aria-expanded="false" title="Open Sky Pixel Tools"><span class="sky-pixel-tools-launcher__icon" aria-hidden="true">✦</span><span class="sky-pixel-tools-launcher__label"><strong>Sky Pixel Tools</strong><small>Map controls</small></span></button>
      <div class="atlas-backdrop" id="skyPixelAtlasBackdrop"></div>
      <aside class="atlas-sidebar" id="skyPixelAtlasSidebar" role="dialog" aria-modal="true" aria-label="Atlas AI assistant" aria-hidden="true">
        <header class="atlas-header">
          <div class="atlas-brand"><div class="atlas-brand__mark"><span class="atlas-brand__orb"><i></i><i></i></span></div><div><div class="atlas-brand__eyebrow">Sky Pixel Intelligence</div><div class="atlas-brand__title">AI Atlas</div></div></div>
          <div class="atlas-header__actions">
            <button class="atlas-icon-button" id="skyPixelAtlasNew" type="button" title="New chat" aria-label="New chat">＋</button>
            <button class="atlas-icon-button" id="skyPixelAtlasHistory" type="button" title="Chat history" aria-label="Chat history">☰</button>
            <button class="atlas-icon-button" id="skyPixelAtlasClose" type="button" title="Close Atlas" aria-label="Close Atlas">×</button>
          </div>
        </header>
        <div class="atlas-context-bar"><span class="atlas-context-dot"></span><span class="atlas-context-text" id="skyPixelAtlasContext">Connected to Sky Pixel map</span></div>
        <main class="atlas-main">
          <section class="atlas-view atlas-chat-view">
            <div class="atlas-messages" id="skyPixelAtlasMessages" aria-live="polite"></div>
            <div class="atlas-composer-wrap">
              <form class="atlas-composer" id="skyPixelAtlasForm">
                <textarea class="atlas-input" id="skyPixelAtlasInput" rows="1" maxlength="5000" placeholder="Message AI Atlas…" aria-label="Message Atlas"></textarea>
                <button class="atlas-send" id="skyPixelAtlasSend" type="submit" aria-label="Send message">↑</button>
              </form>
              <div class="atlas-disclaimer">Atlas can control supported map tools. Verify important details.</div>
            </div>
          </section>
          <section class="atlas-view atlas-history-view" aria-label="Atlas chat history">
            <div class="atlas-history-head"><button class="atlas-icon-button" id="skyPixelAtlasHistoryBack" type="button" aria-label="Back to chat">←</button><h3>Chat history</h3></div>
            <div class="atlas-history-list" id="skyPixelAtlasHistoryList"></div>
          </section>
        </main>
      </aside>
      <div class="atlas-toast" id="skyPixelAtlasToast" role="status"></div>`;
    document.body.appendChild(root);

    const searchBox = document.querySelector('.sky-pixel-search-box');
    const launcher = root.querySelector('#skyPixelAtlasLauncher');
    const toolsLauncher = root.querySelector('#skyPixelToolsLauncher');
    if (searchBox && launcher) searchBox.appendChild(launcher);
    if (searchBox && toolsLauncher) searchBox.appendChild(toolsLauncher);

    Object.assign(els, {
      root, launcher, toolsLauncher, backdrop: root.querySelector('#skyPixelAtlasBackdrop'), sidebar: root.querySelector('#skyPixelAtlasSidebar'), close: root.querySelector('#skyPixelAtlasClose'),
      newChat: root.querySelector('#skyPixelAtlasNew'), history: root.querySelector('#skyPixelAtlasHistory'), historyBack: root.querySelector('#skyPixelAtlasHistoryBack'), historyList: root.querySelector('#skyPixelAtlasHistoryList'),
      messages: root.querySelector('#skyPixelAtlasMessages'), form: root.querySelector('#skyPixelAtlasForm'), input: root.querySelector('#skyPixelAtlasInput'), send: root.querySelector('#skyPixelAtlasSend'), context: root.querySelector('#skyPixelAtlasContext'), toast: root.querySelector('#skyPixelAtlasToast')
    });
  }

  function welcomeHTML() {
    return `<div class="atlas-welcome"><div class="atlas-welcome__orb"><i></i><i></i><i></i></div><div class="atlas-welcome__eyebrow">Your Sky Pixel guide</div><h2>What would you like to explore?</h2><p>Ask Atlas about weather, places, nearby destinations, teleport routes, or map controls.</p><div class="atlas-suggestions">
      <button class="atlas-suggestion" data-atlas-prompt="What is the weather in Harlow?"><span class="atlas-suggestion__icon">☁</span><strong>Harlow weather</strong><span>Current conditions and forecast.</span></button>
      <button class="atlas-suggestion" data-atlas-prompt="Show me Mount Noraker"><span class="atlas-suggestion__icon">⌖</span><strong>Open Mount Noraker</strong><span>Move the map and open its panel.</span></button>
      <button class="atlas-suggestion" data-atlas-prompt="What is near Harlow?"><span class="atlas-suggestion__icon">◎</span><strong>Explore nearby</strong><span>Find places close to Harlow.</span></button>
      <button class="atlas-suggestion" data-atlas-prompt="Show the teleport route from Octavian to Harlow"><span class="atlas-suggestion__icon">↗</span><strong>Plan a teleport</strong><span>Use the live teleport network.</span></button>
      <button class="atlas-suggestion" data-atlas-prompt="Turn on Night Mode"><span class="atlas-suggestion__icon">◐</span><strong>Control the map</strong><span>Toggle supported Sky Pixel tools.</span></button>
      <button class="atlas-suggestion" data-atlas-prompt="Tell me about Harlow"><span class="atlas-suggestion__icon">✦</span><strong>Ask about a place</strong><span>Read verified Atlas place data.</span></button>
    </div></div>`;
  }

  function renderMessages() {
    const conversation = activeConversation();
    const messages = conversation?.messages || [];
    els.messages.innerHTML = messages.length ? messages.map((m) => `
      <article class="atlas-message atlas-message--${m.role}">
        ${m.role === 'assistant' ? '<div class="atlas-message__avatar">🧭</div>' : ''}
        <div class="atlas-message__bubble"><div class="atlas-message__content">${markdownLite(m.content)}</div><div class="atlas-message__meta">${new Date(m.createdAt).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}</div></div>
      </article>`).join('') : welcomeHTML();
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function renderHistory() {
    els.historyList.innerHTML = state.conversations.length ? state.conversations.map((c) => `
      <button class="atlas-history-item" type="button" data-conversation-id="${escapeHTML(c.id)}">
        <span class="atlas-history-item__copy"><span class="atlas-history-item__title">${escapeHTML(c.title)}</span><span class="atlas-history-item__date">${new Date(c.updatedAt).toLocaleString()}</span></span>
        <span class="atlas-history-delete" role="button" tabindex="0" aria-label="Delete conversation" data-delete-id="${escapeHTML(c.id)}">×</span>
      </button>`).join('') : '<div class="atlas-empty">No saved conversations yet.</div>';
  }

  function getToolsPanel() {
    return document.getElementById('skyPixelMapToolsPanel');
  }

  function syncToolsLauncher(open) {
    if (!els.toolsLauncher) return;
    els.toolsLauncher.setAttribute('aria-expanded', String(Boolean(open)));
    els.toolsLauncher.classList.toggle('is-active', Boolean(open));
  }

  function closeToolsDrawer() {
    const panel = getToolsPanel();
    if (!panel) return;
    panel.classList.remove('is-tools-drawer-open');
    document.body.classList.remove('sky-pixel-tools-open');
    syncToolsLauncher(false);
    const control = document.getElementById('skyPixelMapToolsMinimize');
    if (control) {
      const collapsed = panel.classList.contains('is-collapsed');
      control.textContent = collapsed ? '+' : '−';
      control.title = collapsed ? 'Expand Map Tools' : 'Minimize Map Tools';
      control.setAttribute('aria-label', control.title);
      control.setAttribute('aria-expanded', String(!collapsed));
    }
  }

  function openToolsDrawer() {
    const panel = getToolsPanel();
    if (!panel) {
      showToast('Sky Pixel Tools panel is unavailable.');
      return;
    }
    if (state.open) setOpen(false);
    panel.classList.remove('is-collapsed');
    panel.classList.add('is-tools-drawer-open');
    document.body.classList.add('sky-pixel-tools-open');
    syncToolsLauncher(true);
    const control = document.getElementById('skyPixelMapToolsMinimize');
    if (control) {
      control.textContent = '×';
      control.title = 'Close Sky Pixel Tools';
      control.setAttribute('aria-label', 'Close Sky Pixel Tools');
      control.setAttribute('aria-expanded', 'true');
    }
    panel.scrollTop = 0;
  }

  function toggleToolsDrawer() {
    const panel = getToolsPanel();
    if (!panel) return openToolsDrawer();
    if (panel.classList.contains('is-tools-drawer-open')) closeToolsDrawer();
    else openToolsDrawer();
  }

  function syncMobileViewportHeight() {
    const viewport = global.visualViewport;
    const height = viewport?.height || global.innerHeight;
    document.documentElement.style.setProperty('--atlas-mobile-vh', `${height}px`);
    if (state.open && global.innerWidth <= 720) {
      els.messages?.scrollTo?.({ top: els.messages.scrollHeight, behavior: 'smooth' });
    }
  }

  function setOpen(open) {
    state.open = Boolean(open);
    if (state.open) closeToolsDrawer();
    els.sidebar.classList.toggle('is-open', state.open);
    els.backdrop.classList.toggle('is-open', state.open);
    els.launcher.setAttribute('aria-expanded', String(state.open));
    els.sidebar.setAttribute('aria-hidden', String(!state.open));
    document.body.classList.toggle('atlas-open', state.open);
    if (state.open) {
      syncMobileViewportHeight();
      setTimeout(() => els.input.focus(), 80);
    }
  }

  function openHistory(open) {
    els.sidebar.classList.toggle('is-history', Boolean(open));
    if (open) renderHistory();
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('is-visible');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => els.toast.classList.remove('is-visible'), 2200);
  }

  function setBusy(busy) { state.busy = busy; els.send.disabled = busy; els.input.disabled = busy; }

  function addThinking() {
    const node = document.createElement('article');
    node.className = 'atlas-message atlas-message--assistant';
    node.id = 'skyPixelAtlasThinking';
    node.innerHTML = '<div class="atlas-message__avatar">🧭</div><div class="atlas-message__bubble"><span class="atlas-thinking" aria-label="Atlas is thinking"><i></i><i></i><i></i></span></div>';
    els.messages.appendChild(node); els.messages.scrollTop = els.messages.scrollHeight;
  }

  function removeThinking() { document.getElementById('skyPixelAtlasThinking')?.remove(); }

  function getLocationContext() {
    const title = document.getElementById('skyPixelPanelTitle')?.textContent?.trim() || document.getElementById('skyPixelCountryInfoTitle')?.textContent?.trim();
    const description = document.getElementById('skyPixelPanelDescription')?.textContent?.trim() || document.getElementById('skyPixelCountryInfoDescription')?.textContent?.trim();
    const coords = document.getElementById('skyPixelPanelCoords')?.textContent?.trim();
    return title ? { title, description, coords } : null;
  }

  function buildContext() {
    return { ...state.context, location: getLocationContext(), map: global.SkyPixelAtlasActions?.getMapContext?.() || { available:false }, page: { title: document.title, url: location.href } };
  }

  async function submit(message) {
    const text = String(message || '').trim();
    if (!text || state.busy) return;
    const conversation = ensureConversation();
    conversation.messages.push({ role:'user', content:text, createdAt:nowISO() });
    if (conversation.messages.length === 1) conversation.title = titleFrom(text);
    conversation.updatedAt = nowISO();
    persist(); renderMessages(); setBusy(true); addThinking();
    global.dispatchEvent(new CustomEvent('sky-pixel-atlas:request-start', { detail: { message: text } }));
    let finalAnswer = '';
    try {
      const answer = await global.SkyPixelAtlasAI.ask({ message:text, history:conversation.messages.slice(0,-1), context:buildContext() });
      finalAnswer = String(answer);
      conversation.messages.push({ role:'assistant', content:finalAnswer, createdAt:nowISO() });
      global.dispatchEvent(new CustomEvent('sky-pixel-atlas:response', { detail: { message: text, answer: finalAnswer } }));
    } catch (error) {
      finalAnswer = `Atlas could not complete that request. ${error?.message || 'Please check the configured AI endpoint.'}`;
      conversation.messages.push({ role:'assistant', content:finalAnswer, createdAt:nowISO() });
      global.dispatchEvent(new CustomEvent('sky-pixel-atlas:response-error', { detail: { message: text, error: error?.message || String(error), answer: finalAnswer } }));
    } finally {
      conversation.updatedAt = nowISO(); persist(); removeThinking(); setBusy(false); renderMessages();
    }
    return finalAnswer;
  }

  function autoGrow() { els.input.style.height = 'auto'; els.input.style.height = `${Math.min(els.input.scrollHeight, 150)}px`; }

  function bindUI() {
    document.body.classList.add('sky-pixel-tools-drawer-ready');
    els.launcher.addEventListener('click', () => setOpen(true));
    els.toolsLauncher?.addEventListener('click', toggleToolsDrawer);
    els.close.addEventListener('click', () => setOpen(false));
    els.backdrop.addEventListener('click', () => setOpen(false));
    els.history.addEventListener('click', () => openHistory(true));
    els.historyBack.addEventListener('click', () => openHistory(false));
    els.newChat.addEventListener('click', () => { createConversation(); openHistory(false); renderMessages(); els.input.focus(); });
    els.form.addEventListener('submit', (event) => { event.preventDefault(); const value = els.input.value; els.input.value=''; autoGrow(); submit(value); });
    els.input.addEventListener('input', autoGrow);
    els.input.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); els.form.requestSubmit(); } });
    els.messages.addEventListener('click', (event) => { const button = event.target.closest('[data-atlas-prompt]'); if (button) submit(button.dataset.atlasPrompt); });
    els.historyList.addEventListener('click', (event) => {
      const deleteTarget = event.target.closest('[data-delete-id]');
      if (deleteTarget) {
        event.preventDefault(); event.stopPropagation();
        const id = deleteTarget.dataset.deleteId;
        state.conversations = state.conversations.filter((c) => c.id !== id);
        if (state.activeId === id) state.activeId = state.conversations[0]?.id || null;
        persist(); renderHistory(); renderMessages(); return;
      }
      const item = event.target.closest('[data-conversation-id]');
      if (item) { state.activeId = item.dataset.conversationId; persist(); openHistory(false); renderMessages(); }
    });
    const toolsMinimize = document.getElementById('skyPixelMapToolsMinimize');
    toolsMinimize?.addEventListener('click', (event) => {
      const panel = getToolsPanel();
      if (!panel?.classList.contains('is-tools-drawer-open')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      closeToolsDrawer();
    }, true);

    global.visualViewport?.addEventListener('resize', syncMobileViewportHeight);
    global.addEventListener('orientationchange', () => setTimeout(syncMobileViewportHeight, 120));
    syncMobileViewportHeight();

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      const panel = getToolsPanel();
      if (panel?.classList.contains('is-tools-drawer-open')) {
        closeToolsDrawer();
        return;
      }
      if (state.open) {
        if (els.sidebar.classList.contains('is-history')) openHistory(false);
        else setOpen(false);
      }
    });
  }

  function bindExploreLinks() {
    document.addEventListener('click', (event) => {
      const link = event.target.closest('#skyPixelAiModeLink, #skyPixelCountryAiModeLink, [data-atlas-open], a[href="#atlas"]');
      if (!link) return;
      event.preventDefault();
      const location = getLocationContext();
      state.context = { source:'explore-with-ai', location };
      els.context.textContent = location?.title ? `Exploring ${location.title}` : 'Connected to Sky Pixel map';
      setOpen(true);
      if (location?.title && (!activeConversation() || activeConversation().messages.length === 0)) els.input.placeholder = `Ask Atlas about ${location.title}…`;
    });
  }

  function publicAPI() {
    global.SkyPixelAtlas = Object.freeze({
      open(context) { state.context = context || {}; if (context?.location?.title) els.context.textContent = `Exploring ${context.location.title}`; setOpen(true); },
      close() { setOpen(false); },
      openTools() { openToolsDrawer(); },
      closeTools() { closeToolsDrawer(); },
      toggleTools() { toggleToolsDrawer(); },
      ask(message, context) { if (context) state.context = context; setOpen(true); return submit(message); },
      newChat() { createConversation(); renderMessages(); },
      getState() { return { open:state.open, busy:state.busy, activeId:state.activeId, context:{...state.context} }; },
      integrations: { ai: global.SkyPixelAtlasAI, actions: global.SkyPixelAtlasActions }
    });
    global.dispatchEvent(new CustomEvent('sky-pixel-atlas:ready', { detail: global.SkyPixelAtlas }));
  }

  function init() {
    if (document.getElementById('skyPixelAtlasRoot')) return;
    readStorage(); buildUI(); bindUI(); bindExploreLinks(); renderMessages(); publicAPI();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true }); else init();
})(window);
