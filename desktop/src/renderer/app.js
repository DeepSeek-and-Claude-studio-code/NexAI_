'use strict';

(function () {
  const T = {
    ru: {
      new_chat: '+ Новый чат', projects: 'Проекты', artifacts: 'Артефакты', studio: 'Фото и видео', nex_code: 'Nex Code (терминал)',
      chats: 'Чаты', settings: 'Настройки', account: 'Аккаунт',
      ready: 'Готов к работе', write_ph: 'Напиши Нексу…', img_ph: 'Опиши картинку…', vid_ph: 'Опиши видео…',
      add_files: 'Добавить файлы или фото', create_img: 'Создать картинку', create_vid: 'Создать видео',
      web_search: 'Поиск в интернете', memory: 'Память', on: 'Вкл', off: 'Выкл',
      effort: 'Усилие', effort_desc: 'Чем выше усилие, тем дольше и тщательнее думает модель.',
      images_sec: 'Создание картинок', videos_sec: 'Создание видео',
      key_needed: 'нужен ключ', active: 'сейчас', selected: 'выбрано',
      tab_ai: 'ИИ', tab_voice: 'Голос', tab_memory: 'Память', tab_access: 'Доступ', tab_safety: 'Защита', tab_lang: 'Язык',
      keys_note: 'Ключи шифруются через системное хранилище (DPAPI / Keyring) и сохраняются в твоём аккаунте.',
      refresh_models: 'Обновить модели из API',
      voice_label: 'Голос Некса', male: 'Мужской (Некс)', female: 'Женский (Некси)', neutral: 'Нейтральный',
      speech_speed: 'Скорость речи', auto_speak: 'Озвучивать ответы',
      wake_word: 'Откликаться на «Некс»', wake_word_d: 'Постоянно ждёт слово «Некс» (или «Некси»), затем слушает просьбу',
      show_comp: 'Показывать Некса на экране ПК', show_comp_desc: 'Плавающий шар в углу экрана (Ctrl+Alt+N)',
      mem_auto: 'Запоминать из чатов', mem_empty: 'Память пуста.', add_mem: 'Добавить в память', add: 'Добавить', clear: 'Очистить',
      access_desc: 'Без разрешения агент не заходит в эту область.',
      perm_files: 'Файлы папки проекта', perm_files_d: 'Читать и изменять файлы выбранного проекта',
      perm_shell: 'Команды терминала', perm_shell_d: 'Запускать команды PowerShell / Shell с подтверждением',
      perm_apps: 'Приложения и ссылки', perm_apps_d: 'Открывать программы и сайты',
      perm_clip: 'Буфер обмена', perm_clip_d: 'Читать и копировать текст',
      perm_mail: 'Почта', perm_mail_d: 'Читать и отправлять письма (IMAP/SMTP или Gmail OAuth)',
      mail_title: 'Почта (IMAP/SMTP или Gmail OAuth)', save_mail: 'Сохранить почту', test_mail: 'Проверить подключение',
      confirm_buy: 'Подтверждать покупки', confirm_buy_d: 'Всегда спрашивает перед оплатой или заказом — отключить нельзя',
      confirm_act: 'Подтверждать отправку писем и команд', confirm_act_d: 'Спрашивать перед выполнением важных действий',
      lang_title: 'Язык интерфейса', show_welcome: 'Показать приветствие снова',
      proj_desc: 'Привяжи рабочую папку, чтобы агент мог читать, искать и редактировать файлы проекта.',
      new_proj: 'Новый проект', choose_folder: 'Выбрать папку', change_folder: 'Сменить', no_folder: 'Рабочая папка не выбрана',
      art_desc: 'Создавай, редактируй, просматривай и сохраняй презентации, таблицы, документы и HTML.',
      create_art: '+ Создать артефакт', all: 'Все', nothing: 'Пока ничего нет.',
      view: 'Просмотр', edit: 'Править', code: 'Код', copy: 'Копировать', copied: 'Скопировано', export_btn: 'Сохранить файл', del_btn: 'Удалить',
      acc_desc: 'Вход через почту или Google сохраняет ключи, чаты, фото/видео, артефакты, настройки и последнюю выбранную модель.',
      your_name: 'Имя', active_model: 'Последняя выбранная модель',
      sign_in_title: 'Вход в аккаунт', sign_in_sub: 'Сохраняй ключи, чаты, картинки, видео, артефакты, настройки и последнюю модель.',
      email_tab: 'Почта', google_tab: 'Google', sign_in_btn: 'Войти', register_btn: 'Создать аккаунт',
      sign_in_google: 'Войти через Google', sign_out: 'Выйти из аккаунта',
      sync_up: 'Сохранить всё на Google Диск', sync_down: 'Загрузить всё с Google Диска', link_drive: 'Подключить Google Диск',
      drive_auto: 'Автосохранение всех файлов на Google Диск', drive_auto_d: 'Автоматически сохраняет чаты, ключи, фото, видео, артефакты и вложения',
      drive_vis: 'Видимая папка Nex/ на Диске', drive_hid: 'Скрытая папка приложения',
      vault_exp: 'Экспорт бэкапа (.nexvault)', vault_imp: 'Импорт бэкапа (.nexvault)',
      sync_pass: 'Пароль шифрования копии',
      confirm: 'Подтвердить', cancel: 'Отмена', tap_open: 'Нажми, чтобы открыть', show_folder: 'Показать в папке', edit_media: 'Редактировать',
      onb_title: 'Знакомьтесь Некс ваш помощник', onb_sub: 'Работает на твоих API-ключах: управляет файлами, почтой, артефактами, фото и видео только с разрешения.',
      start: 'Начать', skip: 'Пропустить', next: 'Продолжить', done: 'Готово',
      onb_perms: 'Что разрешить на компьютере?', onb_voice: 'Выбери голос', onb_voice_sub: 'От голоса зависит имя и образ: Некс или Некси.',
      onb_keys: 'Добавь ключи API', onb_keys_sub: 'Одного ключа достаточно, остальные можно добавить позже.'
    },
    en: {
      new_chat: '+ New chat', projects: 'Projects', artifacts: 'Artifacts', studio: 'Photo & Video', nex_code: 'Nex Code (Terminal)',
      chats: 'Chats', settings: 'Settings', account: 'Account',
      ready: 'Ready', write_ph: 'Write to Nex…', img_ph: 'Describe the image…', vid_ph: 'Describe the video…',
      add_files: 'Add files or photos', create_img: 'Create image', create_vid: 'Create video',
      web_search: 'Web search', memory: 'Memory', on: 'On', off: 'Off',
      effort: 'Effort', effort_desc: 'Higher effort makes the model think longer and deeper.',
      images_sec: 'Image creation', videos_sec: 'Video creation',
      key_needed: 'key needed', active: 'active', selected: 'selected',
      tab_ai: 'AI', tab_voice: 'Voice', tab_memory: 'Memory', tab_access: 'Access', tab_safety: 'Safety', tab_lang: 'Language',
      keys_note: 'Keys are encrypted using OS secure storage (DPAPI / Keyring) and saved per account.',
      refresh_models: 'Refresh models from APIs',
      voice_label: "Nex's voice", male: 'Male (Nex)', female: 'Female (Nexi)', neutral: 'Neutral',
      speech_speed: 'Speech speed', auto_speak: 'Speak replies aloud',
      wake_word: 'Always listen for "Nex"', wake_word_d: 'Waits for "Nex" (or "Nexi") then listens to your request',
      show_comp: 'Show Nex on desktop screen', show_comp_desc: 'Floating sphere in screen corner (Ctrl+Alt+N)',
      mem_auto: 'Remember from chats', mem_empty: 'Memory is empty.', add_mem: 'Add to memory', add: 'Add', clear: 'Clear',
      access_desc: 'Without permission Nex will not enter that area.',
      perm_files: 'Project folder files', perm_files_d: 'Read and edit files inside the active project folder',
      perm_shell: 'Terminal commands', perm_shell_d: 'Run PowerShell / Shell commands with confirmation',
      perm_apps: 'Apps & URLs', perm_apps_d: 'Open desktop apps and websites',
      perm_clip: 'Clipboard', perm_clip_d: 'Read and copy clipboard text',
      perm_mail: 'Email', perm_mail_d: 'Read and send email (IMAP/SMTP or Gmail OAuth)',
      mail_title: 'Email (IMAP/SMTP or Gmail OAuth)', save_mail: 'Save mail settings', test_mail: 'Test connection',
      confirm_buy: 'Confirm purchases', confirm_buy_d: 'Always asks before paying or ordering — cannot be disabled',
      confirm_act: 'Confirm emails & sensitive actions', confirm_act_d: 'Ask before sending messages or running commands',
      lang_title: 'Interface language', show_welcome: 'Show welcome screen again',
      proj_desc: 'Attach a working folder so Nex can read, search, and edit project files.',
      new_proj: 'New project', choose_folder: 'Choose folder', change_folder: 'Change', no_folder: 'No working folder selected',
      art_desc: 'Create, edit, preview, and export presentations, tables, documents, and HTML.',
      create_art: '+ Create artifact', all: 'All', nothing: 'Nothing yet.',
      view: 'View', edit: 'Edit', code: 'Code', copy: 'Copy', copied: 'Copied', export_btn: 'Export file', del_btn: 'Delete',
      acc_desc: 'Sign in via Email or Google to store & sync keys, chats, photos/videos, artifacts, settings, and last selected model.',
      your_name: 'Name', active_model: 'Last selected model',
      sign_in_title: 'Sign in to Nex', sign_in_sub: 'Save keys, chats, images, videos, artifacts, settings, and last selected model.',
      email_tab: 'Email', google_tab: 'Google', sign_in_btn: 'Sign in', register_btn: 'Create account',
      sign_in_google: 'Sign in with Google', sign_out: 'Sign out',
      sync_up: 'Upload all to Google Drive', sync_down: 'Download all from Google Drive', link_drive: 'Connect Google Drive',
      drive_auto: 'Auto-save all files to Google Drive', drive_auto_d: 'Automatically saves chats, keys, photos, videos, artifacts & attachments',
      drive_vis: 'Visible Nex/ folder in My Drive', drive_hid: 'Hidden appDataFolder',
      vault_exp: 'Export backup (.nexvault)', vault_imp: 'Import backup (.nexvault)',
      sync_pass: 'Backup encryption passphrase',
      confirm: 'Confirm', cancel: 'Cancel', tap_open: 'Click to open', show_folder: 'Show in folder', edit_media: 'Edit',
      onb_title: 'Meet Nex, your assistant', onb_sub: 'Runs on your API keys: manages files, mail, artifacts, photos & videos only with permission.',
      start: 'Get started', skip: 'Skip', next: 'Continue', done: 'Done',
      onb_perms: 'What to allow on this PC?', onb_voice: 'Choose a voice', onb_voice_sub: 'The voice sets the name and look: Nex or Nexi.',
      onb_keys: 'Add your API keys', onb_keys_sub: 'One key is enough; you can add more later.'
    }
  };

  let constants = null;
  let state = null;
  let sphereData = { state: 'idle', label: '', female: false };
  let confirmation = null;
  let activeView = 'chat';
  let activeSettingsTab = 'ai';
  let activeArtifactId = null;
  let artifactMode = 'view';
  let artifactFilter = 'all';
  let editingMediaItem = null;
  let genMode = null;
  let attachments = [];
  let isBusy = false;
  let onbStep = 0;
  let onbAuthTab = 'email';
  let accAuthTab = 'email';
  let authMsg = '';
  let driveLiveStatus = '';
  let nexCodeSnap = null;
  let storageStats = null;
  let devicesSnap = null;
  let devicesCat = 'all';
  let quotaSnap = null;
  let chatSearchQuery = '';
  let memCatFilter = 'all';
  let voiceModeActive = false;
  let vmSphereCtrl = null;
  let storageTab = null;
  let openAccordions = { nex: true };

  const mainSphere = window.NexSphereRenderer.attach(document.getElementById('mainSphere'));
  let onbSphere = null;

  function tr(key) {
    const lang = state?.lang === 'en' ? 'en' : 'ru';
    let s = (T[lang] && T[lang][key]) || T.ru[key] || key;
    if (state?.voice === 'f') {
      if (lang === 'en') s = s.replace(/\bNex(?!i| Atom| Quark| Sel| Foton| Code)\b/g, 'Nexi');
      else s = s.replace(/Некс(?!и)(?:а|у|ом|е)?/g, 'Некси').replace('Готов к работе', 'Готова к работе').replace('ваш помощник', 'ваша помощница');
    }
    return s;
  }

  function agentName() {
    if (state?.lang === 'en') return state?.voice === 'f' ? 'Nexi' : 'Nex';
    return state?.voice === 'f' ? 'Некси' : 'Некс';
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function activeChat() {
    return (state?.chats || []).find(c => c.id === state.activeChatId) || state?.chats?.[0] || null;
  }

  function activeProject() {
    const c = activeChat();
    if (!c || !c.projectId) return null;
    return (state?.projects || []).find(p => p.id === c.projectId) || null;
  }

  function setGenMode(next) {
    genMode = next;
    window.nexApi.updateSettings({ lastGenMode: next });
  }

  function currentModelPillText() {
    const s = state;
    const eff = (constants.EFFORTS.find(e => e.id === s.effort) || constants.EFFORTS[1])[s.lang === 'en' ? 'en' : 'ru'];
    const keys = {};
    for (const p of constants.PROVIDERS) keys[p] = s.apiKeyStatus[p]?.set ? '1' : '';
    let main = `${s.manualProvider} · ${s.manualModel}`;
    if (s.selectedProfileId) {
      const prof = constants.NEX_PROFILES.find(p => p.id === s.selectedProfileId);
      if (prof) {
        let resolved = null;
        if (prof.isMedia) {
          const routes = (genMode === 'video' ? prof.videoRoutes : prof.imageRoutes);
          resolved = routes.find(([pr]) => keys[pr]);
        } else {
          resolved = prof.textRoutes.find(([pr]) => keys[pr]);
        }
        main = `${prof.title} · ${resolved ? resolved[1] : tr('key_needed')}`;
      }
    } else if (genMode === 'image') {
      main = `${tr('create_img')} · ${s.imageModel}`;
    } else if (genMode === 'video') {
      main = `${tr('create_vid')} · ${s.videoModel}`;
    }
    return `${main} · ${eff} ▾`;
  }

  function showView(v) {
    activeView = v;
    const map = {
      chat: 'viewChat',
      projects: 'viewProjects',
      artifacts: 'viewArtifacts',
      artifactDetail: 'viewArtifactDetail',
      studio: 'viewStudio',
      nexcode: 'viewNexCode',
      devices: 'viewDevices',
      settings: 'viewSettings',
      account: 'viewAccount'
    };
    Object.entries(map).forEach(([k, id]) => {
      document.getElementById(id).hidden = k !== v;
    });
    renderAll();
  }

  function applyThemeAndAccent() {
    const mode = state?.themeMode || 'system', prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode);
    document.documentElement.setAttribute('data-accent', state?.voice === 'f' ? 'nexi' : 'nex');
    const shell = document.getElementById('shell'); if (shell) shell.classList.toggle('sb-collapsed', Boolean(state?.sidebarCollapsed));
  }
  function renderFormattedMessage(container, rawText) {
    const text = String(rawText || ''), lines = text.split('\n'); let bodyText = text;
    if (lines[0] && lines[0].startsWith('⚡')) { const det = document.createElement('details'); det.className = 'failover-details'; const sum = document.createElement('summary'); sum.textContent = lines[0]; det.appendChild(sum); container.appendChild(det); bodyText = lines.slice(1).join('\n').trim(); }
    const fenceRx = /```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g; let last = 0, m;
    const appendPlain = (chunk) => { if (!chunk) return; for (const p of chunk.split(/(`[^`\n]+`)/g)) { if (p.startsWith('`') && p.endsWith('`') && p.length >= 2) { const c = document.createElement('code'); c.className = 'inline-code'; c.textContent = p.slice(1, -1); container.appendChild(c); } else if (p) container.appendChild(document.createTextNode(p)); } };
    while ((m = fenceRx.exec(bodyText))) {
      appendPlain(bodyText.slice(last, m.index));
      const lang = (m[1] || 'code').trim(), codeBody = m[2].replace(/\n$/, ''), card = el('div', 'code-card'), head = el('div', 'code-card-head');
      head.appendChild(el('span', '', lang));
      const copyBtn = el('button', 'code-copy-btn', state.lang === 'en' ? 'Copy' : 'Копировать');
      copyBtn.onclick = () => { navigator.clipboard.writeText(codeBody).catch(() => {}); copyBtn.textContent = state.lang === 'en' ? 'Copied ✓' : 'Скопировано ✓'; setTimeout(() => { copyBtn.textContent = state.lang === 'en' ? 'Copy' : 'Копировать'; }, 1400); };
      head.appendChild(copyBtn); card.appendChild(head); card.appendChild(el('pre', '', codeBody)); container.appendChild(card); last = m.index + m[0].length;
    }
    appendPlain(bodyText.slice(last));
  }
  function renderSidebar() {
    applyThemeAndAccent();
    document.getElementById('btnNewChat').textContent = tr('new_chat');
    document.getElementById('btnProjects').textContent = tr('projects');
    document.getElementById('btnArtifacts').textContent = tr('artifacts');
    document.getElementById('btnStudio').textContent = tr('studio');
    document.getElementById('btnNexCode').textContent = tr('nex_code');
    document.getElementById('btnDevices').textContent = tr('devices');
    document.getElementById('lblChats').textContent = tr('chats');
    document.getElementById('btnSettings').textContent = tr('settings');
    const accLabel = state.userName || state.account?.displayName || state.account?.email || tr('account');
    document.getElementById('sbAccLabel').textContent = accLabel;
    document.getElementById('sbAvatar').textContent = (accLabel.trim()[0] || 'Я').toUpperCase();

    const searchInp = document.getElementById('chatSearchInput'); if (searchInp) searchInp.placeholder = state.lang === 'en' ? 'Search chats…' : 'Поиск по чатам…';
    const q = chatSearchQuery.trim().toLowerCase(), list = document.getElementById('chatList'); list.innerHTML = '';
    for (const c of state.chats) {
      let snippet = '';
      if (q) { const th = String(c.title || '').toLowerCase().includes(q), mh = (c.messages || []).find(m => String(m.text || '').toLowerCase().includes(q)); if (!th && !mh) continue; if (mh) snippet = String(mh.text).replace(/\s+/g, ' ').slice(0, 48); }
      const row = el('div', 'chat-row' + (c.id === state.activeChatId ? ' active' : '')), btn = el('button', 'c-title');
      btn.appendChild(el('div', '', c.title)); if (snippet) btn.appendChild(el('div', 'chat-snippet', snippet));
      btn.onclick = async () => { await window.nexApi.openChat(c.id); showView('chat'); };
      const del = el('button', 'c-del', '×'); del.onclick = async (e) => { e.stopPropagation(); await window.nexApi.deleteChat(c.id); };
      row.appendChild(btn); row.appendChild(del); list.appendChild(row);
    }
  }

  function renderTopBar() {
    const c = activeChat();
    const titles = {
      chat: (c && c.title !== 'Новый чат' && c.title !== 'New chat') ? c.title : agentName(),
      projects: tr('projects'),
      artifacts: tr('artifacts'),
      artifactDetail: (state.artifacts.find(a => a.id === activeArtifactId)?.title) || tr('artifacts'),
      studio: tr('studio'),
      nexcode: 'Nex Code',
      devices: tr('devices'),
      settings: tr('settings'),
      account: tr('account')
    };
    document.getElementById('topTitle').textContent = titles[activeView] || agentName();
    document.getElementById('btnModelPill').textContent = currentModelPillText();
    document.getElementById('btnModelPill').hidden = (activeView !== 'chat' && activeView !== 'nexcode');
  }

  function renderChat() {
    mainSphere.update(sphereData.state, state.voice === 'f');
    document.getElementById('statusText').textContent = sphereData.label || tr('ready');

    const proj = activeProject();
    const fb = document.getElementById('folderBar');
    if (proj) {
      fb.hidden = false;
      document.getElementById('folderBarText').textContent = proj.folderPath ? `${proj.name}: ${proj.folderPath}` : `${proj.name}: ${tr('no_folder')}`;
      const btn = document.getElementById('btnChangeFolder');
      btn.textContent = proj.folderPath ? tr('change_folder') : tr('choose_folder');
      btn.onclick = () => window.nexApi.pickProjectFolder(proj.id);
    } else fb.hidden = true;

    const box = document.getElementById('messages');
    box.innerHTML = '';
    const chat = activeChat();
    const msgs = chat?.messages || [];
    const hasUserMsg = msgs.some(m => m.role === 'user' || m.media || m.artifactId);
    if (!hasUserMsg) {
      const hero = el('div', 'welcome-hero');
      hero.appendChild(window.NexIllustrations.create('welcome'));
      hero.appendChild(el('h2', '', state.lang === 'en' ? `What shall we work on${state.userName ? ', ' + state.userName : ''}?` : `Чем займёмся${state.userName ? ', ' + state.userName : ''}?`));
      hero.appendChild(el('p', 'hero-sub', state.lang === 'en'
        ? `${agentName()} can search the web, work with files, create documents, generate visuals, and auto-switch AI providers on quota limits.`
        : `${agentName()} умеет искать в интернете, работать с файлами, создавать документы, фото и видео — и сам переключается на резервную модель при лимите.`));
      const grid = el('div', 'starter-grid');
      const starters = state.lang === 'en'
        ? [['Search', 'Find the latest news and summarize key takeaways'], ['Document', 'Create a structured project plan with timeline and budget'], ['Code', 'Explain and refactor a tricky function cleanly'], ['Visuals', 'Generate a minimalist editorial illustration']]
        : [['Поиск', 'Найди свежие новости по теме и сделай краткую выжимку'], ['Документ', 'Собери структурированный план проекта с этапами и бюджетом'], ['Идеи', 'Разбери сложную задачу по шагам и предложи лучший вариант'], ['Письмо', 'Напиши вежливое и чёткое деловое письмо по моим тезисам']];
      starters.forEach(([tag, prompt]) => {
        const card = el('button', 'starter-card');
        card.appendChild(el('span', 'sc-tag', tag));
        card.appendChild(el('div', 'sc-title', prompt));
        card.onclick = () => { const inp = document.getElementById('chatInput'); inp.value = prompt; inp.focus(); };
        grid.appendChild(card);
      });
      hero.appendChild(grid);
      box.appendChild(hero);
    }
    const renderList = hasUserMsg ? msgs : [], lastAssistantIdx = renderList.map(x => x.role).lastIndexOf('assistant');
    renderList.forEach((m, idx) => {
      const bubble = el('div', `msg ${m.role}`);
      if (m.text) renderFormattedMessage(bubble, m.text);
      if (m.attachmentNames?.length) bubble.appendChild(el('div', 'att-meta', '📎 ' + m.attachmentNames.join(', ')));
      if (m.media?.filePath) {
        const fileUrl = 'file://' + (m.media.filePath.startsWith('/') ? '' : '/') + m.media.filePath.replace(/\\/g, '/');
        if (m.media.isVideo) {
          const vid = el('video', 'gen-vid'); vid.src = fileUrl; vid.controls = true; vid.loop = true;
          bubble.appendChild(vid);
        } else {
          const img = el('img', 'gen-img'); img.src = fileUrl; img.alt = m.media.prompt || '';
          bubble.appendChild(img);
        }
        const mf = el('div', 'media-foot');
        mf.appendChild(el('span', '', m.media.modelName || ''));
        const btns = el('div', 'flex-row');
        const bEdit = el('button', 'pill-btn small', tr('edit_media'));
        bEdit.onclick = () => { editingMediaItem = m.media; showView('studio'); };
        const bRev = el('button', 'pill-btn small', tr('show_folder'));
        bRev.onclick = () => window.nexApi.revealFile(m.media.filePath);
        btns.appendChild(bEdit); btns.appendChild(bRev);
        mf.appendChild(btns);
        bubble.appendChild(mf);
      }
      if (!isBusy && (m.role === 'user' || idx === lastAssistantIdx)) {
        const acts = el('div', 'msg-actions');
        if (m.role === 'user') {
          const bEdit = el('button', 'msg-act-btn', state.lang === 'en' ? '✎ Edit' : '✎ Изменить');
          bEdit.onclick = () => {
            const editBox = el('div', 'flex-row'); editBox.style.marginTop = '8px';
            const inp = el('input'); inp.type = 'text'; inp.value = m.text || '';
            const bSave = el('button', 'btn', 'OK'), bCancel = el('button', 'btn outline', '✕'); bCancel.onclick = () => renderChat();
            bSave.onclick = async () => { const nv = inp.value.trim(); if (!nv) return; const r = await window.nexApi.editMessage({ chatId: chat.id, messageId: m.id, newText: nv }); if (r && r.ok && r.resendText) { isBusy = true; renderChat(); try { await window.nexApi.sendMessage({ text: r.resendText, attachments: [], genMode: null, fromVoice: false }); } finally { isBusy = false; renderChat(); } } };
            editBox.appendChild(inp); editBox.appendChild(bSave); editBox.appendChild(bCancel); bubble.appendChild(editBox); inp.focus();
          };
          acts.appendChild(bEdit);
        }
        if (m.role === 'assistant' && idx === lastAssistantIdx) {
          const bRegen = el('button', 'msg-act-btn', state.lang === 'en' ? '↻ Regenerate' : '↻ Перегенерировать');
          bRegen.onclick = async () => { const r = await window.nexApi.regenerateLast(chat.id); if (r && r.ok && r.resendText) { isBusy = true; renderChat(); try { await window.nexApi.sendMessage({ text: r.resendText, attachments: [], genMode: null, fromVoice: false }); } finally { isBusy = false; renderChat(); } } };
          acts.appendChild(bRegen);
        }
        bubble.appendChild(acts);
      }
      box.appendChild(bubble);

      if (m.artifactId) {
        const art = state.artifacts.find(a => a.id === m.artifactId);
        if (art) {
          const card = el('button', 'art-card');
          card.appendChild(el('span', 'art-icon', art.type.slice(0, 2).toUpperCase()));
          const meta = el('span');
          meta.appendChild(el('b', '', art.title));
          meta.appendChild(el('small', '', `${art.type} · ${tr('tap_open')}`));
          card.appendChild(meta);
          card.onclick = () => { activeArtifactId = art.id; artifactMode = 'view'; showView('artifactDetail'); };
          box.appendChild(card);
        }
      }
    });

    if (isBusy && !confirmation) {
      const td = el('div', 'msg assistant');
      const dots = el('span', 'typing-dots');
      dots.appendChild(el('i')); dots.appendChild(el('i')); dots.appendChild(el('i'));
      td.appendChild(dots);
      box.appendChild(td);
    }

    if (confirmation) {
      const cc = el('div', 'confirm-card');
      cc.appendChild(el('h4', '', confirmation.title));
      cc.appendChild(el('pre', '', confirmation.details));
      const acts = el('div', 'confirm-actions');
      const yes = el('button', 'btn', tr('confirm'));
      yes.onclick = () => window.nexApi.resolveConfirmation(true);
      const no = el('button', 'btn outline', tr('cancel'));
      no.onclick = () => window.nexApi.resolveConfirmation(false);
      acts.appendChild(yes); acts.appendChild(no);
      cc.appendChild(acts);
      box.appendChild(cc);
    }

    box.scrollTop = box.scrollHeight;
    renderChipsAndComposer();
  }

  function renderChipsAndComposer() {
    const bar = document.getElementById('chipsBar');
    bar.innerHTML = '';
    const addChip = (label, onRemove) => {
      const c = el('span', 'chip', label);
      const x = el('button', '', '×');
      x.onclick = onRemove;
      c.appendChild(x);
      bar.appendChild(c);
    };
    if (genMode) {
      const lbl = genMode === 'image' ? `${tr('create_img')} · ${state.imageModel}` : `${tr('create_vid')} · ${state.videoModel}`;
      addChip(lbl, () => { setGenMode(null); renderAll(); });
    }
    if (state.webSearchEnabled) {
      addChip(tr('web_search'), () => window.nexApi.updateSettings({ webSearchEnabled: false }));
    }
    attachments.forEach((a, i) => addChip(a.name, () => { attachments.splice(i, 1); renderChipsAndComposer(); }));
    bar.hidden = !bar.childElementCount;

    const inp = document.getElementById('chatInput');
    inp.placeholder = genMode === 'image' ? tr('img_ph') : genMode === 'video' ? tr('vid_ph') : tr('write_ph');

    const btn = document.getElementById('btnSend');
    if (isBusy) { btn.textContent = '■'; btn.className = 'icon-btn round stop-btn'; }
    else { btn.textContent = '↑'; btn.className = 'icon-btn round send-btn'; }
  }

  function renderPlusMenu() {
    const menu = document.getElementById('plusMenu');
    menu.innerHTML = '';
    const item = (label, badge, isOn, fn) => {
      const b = el('button', '', label);
      if (badge !== null) b.appendChild(el('small', isOn ? 'on' : '', badge));
      b.onclick = (e) => { e.stopPropagation(); fn(); };
      menu.appendChild(b);
    };
    item(tr('add_files'), null, false, async () => {
      menu.hidden = true;
      const picked = await window.nexApi.pickAttachments();
      if (picked.length) { attachments = attachments.concat(picked); renderChipsAndComposer(); }
    });
    item(tr('create_img'), genMode === 'image' ? tr('on') : tr('off'), genMode === 'image', () => {
      setGenMode(genMode === 'image' ? null : 'image'); menu.hidden = true; renderAll();
    });
    item(tr('create_vid'), genMode === 'video' ? tr('on') : tr('off'), genMode === 'video', () => {
      setGenMode(genMode === 'video' ? null : 'video'); menu.hidden = true; renderAll();
    });
    item(tr('web_search'), state.webSearchEnabled ? tr('on') : tr('off'), state.webSearchEnabled, () => {
      window.nexApi.updateSettings({ webSearchEnabled: !state.webSearchEnabled }); menu.hidden = true;
    });
    item(tr('memory'), state.memoryEnabled ? tr('on') : tr('off'), state.memoryEnabled, () => {
      window.nexApi.updateSettings({ memoryEnabled: !state.memoryEnabled }); menu.hidden = true;
    });
  }

  function renderProjects() {
    const root = document.getElementById('viewProjects');
    root.innerHTML = '';
    root.appendChild(el('h2', '', tr('projects')));
    root.appendChild(el('p', 'sub', tr('proj_desc')));

    const addRow = el('div', 'flex-row'); addRow.style.marginBottom = '16px';
    const inp = el('input'); inp.type = 'text'; inp.placeholder = tr('new_proj');
    const btn = el('button', 'btn', tr('add'));
    btn.onclick = async () => { await window.nexApi.createProject(inp.value, ''); inp.value = ''; };
    addRow.appendChild(inp); addRow.appendChild(btn);
    root.appendChild(addRow);

    if (!state.projects.length) {
      const emp = el('div', 'empty-editorial');
      emp.appendChild(window.NexIllustrations.create('projects', 'compact'));
      emp.appendChild(el('p', 'sub', state.lang === 'en' ? 'Create a project and attach a folder so Nex can read and edit files in context.' : 'Создай проект и привяжи папку — тогда Некс сможет работать прямо с твоими файлами.'));
      root.appendChild(emp);
    }
    for (const p of state.projects) {
      const card = el('div', 'card-box');
      const head = el('div', 'flex-row'); head.style.justifyContent = 'space-between';
      const titleBtn = el('button', 'sb-btn', p.name); titleBtn.style.fontWeight = '700';
      titleBtn.onclick = async () => { await window.nexApi.newChat(p.id); showView('chat'); };
      const fBtn = el('button', 'pill-btn small', p.folderPath ? tr('change_folder') : tr('choose_folder'));
      fBtn.onclick = () => window.nexApi.pickProjectFolder(p.id);
      head.appendChild(titleBtn); head.appendChild(fBtn);
      card.appendChild(head); card.appendChild(el('small', '', p.folderPath || tr('no_folder')));
      const rulesTa = el('textarea'); rulesTa.rows = 2; rulesTa.style.marginTop = '8px'; rulesTa.value = p.instructions || '';
      rulesTa.placeholder = state.lang === 'en' ? 'Project rules / instructions…' : 'Правила проекта (стиль кода, роль ИИ)…';
      const pActs = el('div', 'flex-row'); pActs.style.marginTop = '6px';
      const bSaveRules = el('button', 'pill-btn small', state.lang === 'en' ? 'Save Rules' : 'Сохранить правила'), pStat = el('small', '', '');
      bSaveRules.onclick = async () => { await window.nexApi.updateProject({ id: p.id, instructions: rulesTa.value }); pStat.textContent = state.lang === 'en' ? 'Saved ✓' : 'Сохранено ✓'; };
      pActs.appendChild(bSaveRules);
      if (p.folderPath) {
        const bRag = el('button', 'pill-btn small', state.lang === 'en' ? 'Index RAG' : 'Индексировать RAG');
        bRag.onclick = async () => { pStat.textContent = '…'; const r = await window.nexApi.reindexProjectRag(p.id); pStat.textContent = r.ok ? `${r.files} files / ${r.chunks} chunks` : 'Error'; };
        pActs.appendChild(bRag);
      }
      pActs.appendChild(pStat); card.appendChild(rulesTa); card.appendChild(pActs); root.appendChild(card);
    }
  }

  function renderArtifactsLib() {
    const root = document.getElementById('viewArtifacts');
    root.innerHTML = '';
    root.appendChild(el('h2', '', tr('artifacts')));
    root.appendChild(el('p', 'sub', tr('art_desc')));

    const createBox = el('div', 'card-box');
    const cRow = el('div', 'flex-row');
    const tInp = el('input'); tInp.type = 'text'; tInp.placeholder = state.lang === 'en' ? 'New artifact title…' : 'Название артефакта…';
    const tSel = el('select'); tSel.style.width = '180px';
    [['document', 'Document'], ['table', 'Table'], ['presentation', 'Presentation'], ['html', 'HTML']].forEach(([v, l]) => {
      const o = el('option', '', l); o.value = v; tSel.appendChild(o);
    });
    const bCreate = el('button', 'btn', tr('create_art'));
    bCreate.onclick = async () => {
      const art = await window.nexApi.createArtifact(tSel.value, tInp.value);
      activeArtifactId = art.id;
      artifactMode = 'edit';
      showView('artifactDetail');
    };
    cRow.appendChild(tInp); cRow.appendChild(tSel); cRow.appendChild(bCreate);
    createBox.appendChild(cRow);
    root.appendChild(createBox);

    const filters = el('div', 'tabs-row');
    [['all', tr('all')], ['presentation', 'Slides'], ['table', 'Tables'], ['document', 'Docs'], ['html', 'HTML']].forEach(([id, lbl]) => {
      const b = el('button', 'pill-btn small' + (artifactFilter === id ? ' active' : ''), lbl);
      b.onclick = () => { artifactFilter = id; renderArtifactsLib(); };
      filters.appendChild(b);
    });
    root.appendChild(filters);

    const list = state.artifacts.filter(a => artifactFilter === 'all' || a.type === artifactFilter);
    if (!list.length) { root.appendChild(el('p', 'sub', tr('nothing'))); return; }
    for (const a of list) {
      const row = el('div', 'flex-row'); row.style.marginBottom = '8px';
      const card = el('button', 'art-card'); card.style.maxWidth = '100%'; card.style.flex = '1';
      card.appendChild(el('span', 'art-icon', a.type.slice(0, 2).toUpperCase()));
      const meta = el('span'); meta.appendChild(el('b', '', a.title)); meta.appendChild(el('small', '', a.type));
      card.appendChild(meta);
      card.onclick = () => { activeArtifactId = a.id; artifactMode = 'view'; showView('artifactDetail'); };
      const del = el('button', 'btn danger', '×');
      del.onclick = () => window.nexApi.deleteArtifact(a.id);
      row.appendChild(card); row.appendChild(del);
      root.appendChild(row);
    }
  }

  function renderArtifactDetail() {
    const root = document.getElementById('viewArtifactDetail');
    root.innerHTML = '';
    const art = state.artifacts.find(a => a.id === activeArtifactId);
    if (!art) { showView('artifacts'); return; }

    const bar = el('div', 'flex-row'); bar.style.marginBottom = '14px';
    const bView = el('button', 'pill-btn small' + (artifactMode === 'view' ? ' active' : ''), tr('view'));
    bView.onclick = () => { artifactMode = 'view'; renderArtifactDetail(); };
    const bEdit = el('button', 'pill-btn small' + (artifactMode === 'edit' ? ' active' : ''), `${tr('edit')} / ${tr('code')}`); bEdit.onclick = () => { artifactMode = 'edit'; renderArtifactDetail(); };
    const bSplit = el('button', 'pill-btn small' + (artifactMode === 'split' ? ' active' : ''), state.lang === 'en' ? 'Split View' : 'Сплит-экран'); bSplit.onclick = () => { artifactMode = 'split'; renderArtifactDetail(); };
    const spacer = el('span'); spacer.style.flex = '1';
    const bCopy = el('button', 'pill-btn small', tr('copy')); bCopy.onclick = () => { navigator.clipboard.writeText(art.content); bCopy.textContent = tr('copied'); };
    const bExp = el('button', 'pill-btn small', tr('export_btn')); bExp.onclick = () => window.nexApi.exportArtifact(art.id);
    const bPdf = el('button', 'pill-btn small', 'PDF'); bPdf.onclick = () => window.nexApi.exportArtifactPdf(art.id);
    const bDel = el('button', 'pill-btn small', tr('del_btn')); bDel.onclick = async () => { await window.nexApi.deleteArtifact(art.id); showView('artifacts'); };
    bar.appendChild(bView); bar.appendChild(bEdit); bar.appendChild(bSplit); bar.appendChild(spacer); bar.appendChild(bCopy); bar.appendChild(bExp); bar.appendChild(bPdf); bar.appendChild(bDel); root.appendChild(bar);
    if ((art.versions || []).length) {
      const vRow = el('div', 'tabs-row'); vRow.appendChild(el('small', '', state.lang === 'en' ? 'Versions:' : 'Версии:'));
      art.versions.slice(0, 6).forEach((v, vIdx) => { const vb = el('button', 'msg-act-btn', `↩ ${new Date(v.ts).toLocaleTimeString()}`); vb.onclick = () => window.nexApi.restoreArtifactVersion(art.id, vIdx); vRow.appendChild(vb); });
      root.appendChild(vRow);
    }
    if (artifactMode === 'edit' || artifactMode === 'split') {
      const titleInp = el('input'); titleInp.type = 'text'; titleInp.value = art.title; titleInp.style.marginBottom = '10px';
      const ta = el('textarea'); ta.value = art.content; ta.style.cssText = 'width:100%;height:420px;font-family:ui-monospace,monospace;font-size:13px;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:12px;padding:12px;';
      const prevPane = el('div', 'art-preview-pane');
      const updatePreview = () => { if (artifactMode !== 'split') return; prevPane.innerHTML = ''; if (art.type === 'html') { const ifr = document.createElement('iframe'); ifr.sandbox = 'allow-scripts'; ifr.style.cssText = 'width:100%;height:400px;border:none;border-radius:8px;background:#fff;'; ifr.srcdoc = ta.value; prevPane.appendChild(ifr); } else renderFormattedMessage(prevPane, ta.value); };
      let tmr = null; const saveLive = () => { updatePreview(); clearTimeout(tmr); tmr = setTimeout(() => window.nexApi.updateArtifact(art.id, ta.value, titleInp.value), 450); };
      titleInp.oninput = saveLive; ta.oninput = saveLive; root.appendChild(titleInp);
      if (artifactMode === 'split') { const sp = el('div', 'art-split'); sp.appendChild(ta); sp.appendChild(prevPane); root.appendChild(sp); updatePreview(); } else root.appendChild(ta);
      return;
    }

    if (art.type === 'presentation') {
      let slides = [];
      try { slides = JSON.parse(art.content); } catch (_) {}
      if (!Array.isArray(slides) || !slides.length) {
        slides = art.content.split(/\n---\n/).map((chunk, i) => ({ title: `Slide ${i + 1}`, subtitle: chunk.trim(), bullets: [] }));
      }
      let idx = 0;
      const sBox = el('div', 'slide-box');
      const nav = el('div', 'slide-nav');
      const prev = el('button', 'pill-btn small', '‹');
      const cnt = el('span', '');
      const next = el('button', 'pill-btn small', '›');
      const drawSlide = () => {
        const sl = slides[idx] || {};
        sBox.innerHTML = '';
        sBox.appendChild(el('h2', '', sl.title || `Slide ${idx + 1}`));
        if (sl.subtitle || sl.body) sBox.appendChild(el('p', 'sub', sl.subtitle || sl.body));
        const bullets = sl.bullets || sl.items || [];
        if (bullets.length) { const ul = el('ul'); bullets.forEach(b => ul.appendChild(el('li', '', b))); sBox.appendChild(ul); }
        cnt.textContent = `${idx + 1} / ${slides.length}`;
      };
      prev.onclick = () => { idx = (idx - 1 + slides.length) % slides.length; drawSlide(); };
      next.onclick = () => { idx = (idx + 1) % slides.length; drawSlide(); };
      nav.appendChild(prev); nav.appendChild(cnt); nav.appendChild(next);
      root.appendChild(sBox); root.appendChild(nav);
      drawSlide();
    } else if (art.type === 'table') {
      const lines = art.content.trim().split(/\r?\n/).filter(Boolean).map(l => l.split(',').map(x => x.trim()));
      if (!lines.length) { root.appendChild(el('pre', 'code-block', art.content)); return; }
      const headers = lines[0];
      const rows = lines.slice(1).map(r => headers.map((_, i) => r[i] || ''));

      const saveCsv = () => {
        const rebuilt = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        window.nexApi.updateArtifact(art.id, rebuilt, art.title);
      };

      const actRow = el('div', 'flex-row'); actRow.style.marginBottom = '10px';
      const bAddRow = el('button', 'pill-btn small', state.lang === 'en' ? '+ Row' : '+ Строка');
      bAddRow.onclick = () => { rows.push(headers.map(() => '')); saveCsv(); renderArtifactDetail(); };
      const bAddCol = el('button', 'pill-btn small', state.lang === 'en' ? '+ Column' : '+ Колонка');
      bAddCol.onclick = () => { headers.push(`Col ${headers.length + 1}`); rows.forEach(r => r.push('')); saveCsv(); renderArtifactDetail(); };
      actRow.appendChild(bAddRow); actRow.appendChild(bAddCol);
      root.appendChild(actRow);

      const tbl = el('table', 'edit-tbl');
      const thead = el('thead'); const htr = el('tr');
      headers.forEach(h => htr.appendChild(el('th', '', h)));
      thead.appendChild(htr);
      const tbody = el('tbody');
      const tfoot = el('tfoot'); const ftr = el('tr');
      headers.forEach(() => ftr.appendChild(el('td', '', '')));
      tfoot.appendChild(ftr);

      const recalc = () => {
        headers.forEach((_, c) => {
          if (c === 0) { ftr.children[c].textContent = 'Σ'; return; }
          const nums = rows.map(r => parseFloat(String(r[c]).replace(',', '.'))).filter(n => !Number.isNaN(n));
          ftr.children[c].textContent = nums.length ? String(Math.round(nums.reduce((a, b) => a + b, 0) * 100) / 100) : '';
        });
        saveCsv();
      };

      rows.forEach((r, rIdx) => {
        const trEl = el('tr');
        r.forEach((val, cIdx) => {
          const td = el('td', '', val); td.contentEditable = 'true';
          td.oninput = () => { rows[rIdx][cIdx] = td.textContent.trim(); recalc(); };
          trEl.appendChild(td);
        });
        tbody.appendChild(trEl);
      });
      tbl.appendChild(thead); tbl.appendChild(tbody); tbl.appendChild(tfoot);
      recalc();
      root.appendChild(tbl);
    } else if (art.type === 'html') {
      const fr = el('iframe', 'html-frame');
      fr.setAttribute('sandbox', 'allow-scripts');
      fr.srcdoc = art.content;
      root.appendChild(fr);
    } else {
      const doc = el('div', 'card-box');
      art.content.split(/\r?\n/).forEach(line => {
        const s = line.trim();
        if (s.startsWith('# ')) doc.appendChild(el('h2', '', s.slice(2)));
        else if (s.startsWith('## ')) doc.appendChild(el('h3', '', s.slice(3)));
        else if (s.startsWith('- ') || s.startsWith('* ')) doc.appendChild(el('div', '', '• ' + s.slice(2)));
        else doc.appendChild(el('p', '', s));
      });
      root.appendChild(doc);
    }
  }

  function renderStudio() {
    window.NexMediaStudio.render({
      root: document.getElementById('viewStudio'),
      state,
      currentItem: editingMediaItem || state.mediaItems?.[0] || null,
      onSelectItem: (item) => { editingMediaItem = item; renderStudio(); },
      tr
    });
  }

  function switchRow(container, title, desc, checked, onChange, locked = false) {
    const row = el('div', 'row-item');
    const left = el('div');
    left.appendChild(el('div', '', title));
    if (desc) left.appendChild(el('small', '', desc));
    const sw = el('button', 'sw');
    sw.setAttribute('role', 'switch');
    sw.setAttribute('aria-checked', String(Boolean(checked)));
    if (locked) sw.disabled = true;
    else sw.onclick = () => onChange(!checked);
    row.appendChild(left); row.appendChild(sw);
    container.appendChild(row);
  }

  function renderSettings() {
    const root = document.getElementById('viewSettings');
    root.innerHTML = '';
    root.appendChild(el('h2', '', tr('settings')));

    const tabs = el('div', 'tabs-row');
    [
      ['ai', tr('tab_ai')], ['voice', tr('tab_voice')], ['memory', tr('tab_memory')],
      ['access', tr('tab_access')], ['safety', tr('tab_safety')], ['lang', tr('tab_lang')]
    ].forEach(([id, lbl]) => {
      const b = el('button', 'pill-btn small' + (activeSettingsTab === id ? ' active' : ''), lbl);
      b.onclick = () => { activeSettingsTab = id; renderSettings(); };
      tabs.appendChild(b);
    });
    root.appendChild(tabs);

    if (activeSettingsTab === 'ai') {
      const isEn = state.lang === 'en';
      root.appendChild(el('p', 'sub', tr('keys_note')));
      const autoCard = el('div', 'card-box');
      switchRow(autoCard, isEn ? 'Auto-switch AI provider on limit / quota' : 'Автопереключение при исчерпании лимита',
        isEn ? 'Automatically switches to another connected API key on 429 / 402 / 503 limits.' : 'Если у одной нейросети закончился лимит (429 / 402 / 503), Некс сам переключится на другой подключённый ключ.',
        state.autoFailover !== false, (v) => window.nexApi.updateSettings({ autoFailover: v }));
      switchRow(autoCard, isEn ? 'Auto-refresh model lists from APIs' : 'Автообновление списка моделей из API',
        isEn ? 'Automatically fetches latest models when saving a key and every 6 hours.' : 'Самостоятельно подтягивает свежие модели при добавлении ключа и каждые 6 часов.',
        state.autoRefreshModels !== false, (v) => window.nexApi.updateSettings({ autoRefreshModels: v }));
      const refRow = el('div', 'flex-row'); refRow.style.marginTop = '10px';
      const refBtn = el('button', 'btn outline', tr('refresh_models'));
      const refMsg = el('small', '', state.lastModelsRefreshAt ? (isEn ? `Last sync: ${new Date(state.lastModelsRefreshAt).toLocaleTimeString()}` : `Обновлено: ${new Date(state.lastModelsRefreshAt).toLocaleTimeString()}`) : '');
      refBtn.onclick = async () => {
        refMsg.textContent = '…';
        const r = await window.nexApi.refreshModels();
        refMsg.textContent = r.updated ? (isEn ? `Updated ${r.updated} provider(s)` : `Обновлено провайдеров: ${r.updated}`) : (isEn ? 'No active keys' : 'Нет активных ключей');
      };
      refRow.appendChild(refBtn); refRow.appendChild(refMsg);
      autoCard.appendChild(refRow); root.appendChild(autoCard);
      const qCard = el('div', 'card-box'), qHead = el('div', 'flex-row'); qHead.style.justifyContent = 'space-between';
      qHead.appendChild(el('strong', '', isEn ? 'Live Limits & Usage Dashboard' : 'Дашборд лимитов за день'));
      const qRef = el('button', 'pill-btn small', isEn ? 'Refresh' : 'Обновить'); qRef.onclick = async () => { quotaSnap = await window.nexApi.getQuotaDashboard(); renderSettings(); };
      qHead.appendChild(qRef); qCard.appendChild(qHead);
      if (!quotaSnap) { window.nexApi.getQuotaDashboard().then(q => { quotaSnap = q; if (activeView === 'settings' && activeSettingsTab === 'ai') renderSettings(); }); qCard.appendChild(el('p', 'sub', '…')); }
      else {
        const tbl = document.createElement('table'); tbl.className = 'quota-table'; tbl.innerHTML = `<thead><tr><th>#</th><th>${isEn ? 'Provider' : 'Провайдер'}</th><th>${isEn ? 'Status' : 'Статус'}</th><th>${isEn ? 'Req / ~Tok' : 'Запр / ~Ток'}</th><th></th></tr></thead>`;
        const tb = document.createElement('tbody');
        for (const row of (quotaSnap.providers || [])) {
          const trEl = document.createElement('tr'), dotCls = !row.ready ? 'off' : (row.cooldownSec > 0 ? 'warn' : 'ok'), stTxt = !row.ready ? (isEn ? 'No key' : 'Нет ключа') : (row.cooldownSec > 0 ? `${row.cooldownSec}s` : (isEn ? 'Active' : 'Активен'));
          trEl.appendChild(el('td', '', row.priority ? String(row.priority) : '—')); trEl.appendChild(el('td', '', row.provider));
          const tdSt = document.createElement('td'); tdSt.appendChild(el('span', `q-dot ${dotCls}`)); tdSt.appendChild(document.createTextNode(stTxt)); trEl.appendChild(tdSt);
          trEl.appendChild(el('td', '', `${row.requestsToday} / ~${row.estTokensToday}`));
          const tdAct = document.createElement('td'); if (row.cooldownSec > 0) { const bRes = el('button', 'msg-act-btn', isEn ? 'Reset' : 'Сброс'); bRes.onclick = async () => { quotaSnap = await window.nexApi.resetProviderCooldown(row.provider); renderSettings(); }; tdAct.appendChild(bRes); }
          trEl.appendChild(tdAct); tb.appendChild(trEl);
        }
        tbl.appendChild(tb); qCard.appendChild(tbl);
      }
      root.appendChild(qCard);

      const metaMap = constants.PROVIDER_META || {};
      for (const p of constants.PROVIDERS) {
        const st = state.apiKeyStatus[p], info = metaMap[p] || {};
        const badge = (p === 'Custom' && state.customBaseUrl) ? `(${state.customBaseUrl})` : (st?.set ? `(${st.masked})` : '');
        root.appendChild(el('label', 'field-label', `${p} API Key ${badge}`));
        if (info.codingNote) root.appendChild(el('div', 'prov-meta', info.codingNote));
        if (p === 'Custom') {
          const urlRow = el('div', 'flex-row'); urlRow.style.marginBottom = '6px';
          const uInp = el('input'); uInp.type = 'text'; uInp.value = state.customBaseUrl || ''; uInp.placeholder = 'Base URL (e.g. http://localhost:11434/v1 for Ollama)';
          const uBtn = el('button', 'btn outline', 'URL'); uBtn.onclick = () => window.nexApi.updateSettings({ customBaseUrl: uInp.value.trim() });
          urlRow.appendChild(uInp); urlRow.appendChild(uBtn); root.appendChild(urlRow);
        }
        const row = el('div', 'flex-row');
        const inp = el('input'); inp.type = 'password'; inp.placeholder = st?.set ? '•••••••• (enter to replace)' : (info.hint || `Paste ${p} key`);
        const saveBtn = el('button', 'btn outline', 'OK');
        saveBtn.onclick = () => { window.nexApi.setApiKey(p, inp.value); inp.value = ''; };
        row.appendChild(inp); row.appendChild(saveBtn); root.appendChild(row);
      }
    } else if (activeSettingsTab === 'voice') {
      root.appendChild(el('label', 'field-label', tr('voice_label')));
      const vRow = el('div', 'tabs-row');
      [['m', tr('male')], ['f', tr('female')], ['n', tr('neutral')]].forEach(([v, lbl]) => {
        const b = el('button', 'pill-btn small' + (state.voice === v ? ' active' : ''), lbl);
        b.onclick = () => window.nexApi.updateSettings({ voice: v });
        vRow.appendChild(b);
      });
      root.appendChild(vRow);

      root.appendChild(el('label', 'field-label', `${tr('speech_speed')}: ${Number(state.speechRate).toFixed(1)}x`));
      const rng = el('input'); rng.type = 'range'; rng.min = '0.7'; rng.max = '1.4'; rng.step = '0.1'; rng.value = String(state.speechRate);
      rng.onchange = () => window.nexApi.updateSettings({ speechRate: parseFloat(rng.value) });
      root.appendChild(rng);

      switchRow(root, tr('auto_speak'), '', state.autoSpeak, (v) => window.nexApi.updateSettings({ autoSpeak: v }));
      switchRow(root, tr('wake_word'), tr('wake_word_d'), state.wakeWordEnabled, (v) => window.nexApi.updateSettings({ wakeWordEnabled: v }));
      switchRow(root, tr('show_comp'), tr('show_comp_desc'), state.showCompanion, (v) => window.nexApi.updateSettings({ showCompanion: v }));
      const tvRow = el('div', 'flex-row'); tvRow.style.marginTop = '12px';
      const tvBtn = el('button', 'btn outline', state.lang === 'en' ? '🔊 Test Voice' : '🔊 Проверить голос');
      tvBtn.onclick = () => window.nexApi.testVoice();
      tvRow.appendChild(tvBtn);
      root.appendChild(tvRow);
    } else if (activeSettingsTab === 'memory') {
      const isEn = state.lang === 'en';
      switchRow(root, tr('mem_auto'), tr('mem_auto_desc'), state.memoryAutoSave, (v) => window.nexApi.updateSettings({ memoryAutoSave: v }));
      const cats = [['all', isEn ? 'All' : 'Все'], ['personal', isEn ? 'Personal' : 'Личное'], ['work', isEn ? 'Work' : 'Работа'], ['prefs', isEn ? 'Preferences' : 'Предпочтения'], ['projects', isEn ? 'Projects' : 'Проекты']];
      const cRow = el('div', 'tabs-row'); cRow.style.marginTop = '10px';
      cats.forEach(([cid, clbl]) => { const b = el('button', 'pill-btn small' + (memCatFilter === cid ? ' active' : ''), clbl); b.onclick = () => { memCatFilter = cid; renderSettings(); }; cRow.appendChild(b); });
      root.appendChild(cRow);
      const catLabel = (cid) => (cats.find(x => x[0] === cid) || cats[1])[1];
      (state.memories || []).forEach((item, idx) => {
        const text = typeof item === 'string' ? item : item.text, cat = typeof item === 'string' ? 'personal' : (item.category || 'personal');
        if (memCatFilter !== 'all' && cat !== memCatFilter) return;
        const row = el('div', 'row-item'), left = el('div', ''); left.style.flex = '1';
        left.appendChild(el('span', 'mem-cat-badge', catLabel(cat))); left.appendChild(document.createTextNode(text));
        const bEdit = el('button', 'msg-act-btn', '✎'); bEdit.onclick = () => { const inp = el('input'); inp.type = 'text'; inp.value = text; const ok = el('button', 'btn outline', 'OK'); ok.onclick = () => window.nexApi.updateMemory({ index: idx, text: inp.value, category: cat }); row.innerHTML = ''; row.appendChild(inp); row.appendChild(ok); inp.focus(); };
        const del = el('button', 'btn outline', '×'); del.onclick = () => window.nexApi.removeMemory(idx);
        row.appendChild(left); row.appendChild(bEdit); row.appendChild(del); root.appendChild(row);
      });
      const addR = el('div', 'flex-row'); addR.style.marginTop = '12px';
      const cSel = document.createElement('select'); cSel.style.width = '140px'; cats.slice(1).forEach(([cid, clbl]) => { const o = document.createElement('option'); o.value = cid; o.textContent = clbl; cSel.appendChild(o); });
      const inp = el('input'); inp.type = 'text'; inp.placeholder = tr('add_mem');
      const bAdd = el('button', 'btn', tr('add')); bAdd.onclick = () => { if (inp.value.trim()) { window.nexApi.addMemory({ text: inp.value, category: cSel.value }); inp.value = ''; } };
      const bClr = el('button', 'btn danger', tr('clear')); bClr.onclick = () => window.nexApi.clearMemories();
      addR.appendChild(cSel); addR.appendChild(inp); addR.appendChild(bAdd); addR.appendChild(bClr); root.appendChild(addR);
    } else if (activeSettingsTab === 'access') {
      root.appendChild(el('p', 'sub', tr('access_desc')));
      const p = state.permissions;
      switchRow(root, tr('perm_files'), tr('perm_files_d'), p.files, (v) => window.nexApi.updateSettings({ permissions: { files: v } }));
      switchRow(root, tr('perm_shell'), tr('perm_shell_d'), p.shell, (v) => window.nexApi.updateSettings({ permissions: { shell: v } }));
      switchRow(root, tr('perm_apps'), tr('perm_apps_d'), p.apps, (v) => window.nexApi.updateSettings({ permissions: { apps: v } }));
      switchRow(root, tr('perm_clip'), tr('perm_clip_d'), p.clipboard, (v) => window.nexApi.updateSettings({ permissions: { clipboard: v } }));
      switchRow(root, tr('perm_mail'), tr('perm_mail_d'), p.mail, (v) => window.nexApi.updateSettings({ permissions: { mail: v } }));

      const mc = Object.assign({}, state.mailConfigPublic);
      let pwdVal = '__UNCHANGED__', tokVal = '__UNCHANGED__';
      const card = el('div', 'card-box'); card.style.marginTop = '16px';
      card.appendChild(el('h3', '', tr('mail_title')));
      const mTabs = el('div', 'tabs-row');
      [['imap', 'IMAP / SMTP'], ['gmail_oauth', 'Gmail OAuth']].forEach(([m, lbl]) => {
        const b = el('button', 'pill-btn small' + (mc.mode === m ? ' active' : ''), lbl);
        b.onclick = () => { mc.mode = m; window.nexApi.saveMailConfig({ ...mc, password: '__UNCHANGED__', oauthAccessToken: '__UNCHANGED__' }); };
        mTabs.appendChild(b);
      });
      card.appendChild(mTabs);

      if (mc.mode === 'imap') {
        const iEmail = el('input'); iEmail.type = 'text'; iEmail.value = mc.email;
        const iPass = el('input'); iPass.type = 'password'; iPass.placeholder = mc.hasPassword ? '•••••••• (saved)' : 'App Password';
        iPass.oninput = () => { pwdVal = iPass.value; };
        const g1 = el('div', 'grid-2');
        const iHost = el('input'); iHost.type = 'text'; iHost.value = mc.imapHost;
        const iPort = el('input'); iPort.type = 'number'; iPort.value = String(mc.imapPort);
        g1.appendChild(iHost); g1.appendChild(iPort);
        const g2 = el('div', 'grid-2');
        const sHost = el('input'); sHost.type = 'text'; sHost.value = mc.smtpHost;
        const sPort = el('input'); sPort.type = 'number'; sPort.value = String(mc.smtpPort);
        g2.appendChild(sHost); g2.appendChild(sPort);
        card.appendChild(el('label', 'field-label', 'Email')); card.appendChild(iEmail);
        card.appendChild(el('label', 'field-label', 'App Password')); card.appendChild(iPass);
        card.appendChild(el('label', 'field-label', 'IMAP Host / Port')); card.appendChild(g1);
        card.appendChild(el('label', 'field-label', 'SMTP Host / Port')); card.appendChild(g2);
        switchRow(card, 'STARTTLS (port 587)', '', mc.useStartTls, (v) => { mc.useStartTls = v; });

        const actR = el('div', 'flex-row'); actR.style.marginTop = '12px';
        const bSave = el('button', 'btn', tr('save_mail'));
        const bTest = el('button', 'btn outline', tr('test_mail'));
        const statusEl = el('small', '');
        const collect = () => ({
          mode: 'imap', email: iEmail.value, password: pwdVal,
          imapHost: iHost.value, imapPort: Number(iPort.value) || 993,
          smtpHost: sHost.value, smtpPort: Number(sPort.value) || 465,
          useStartTls: mc.useStartTls, oauthAccessToken: '__UNCHANGED__', oauthClientId: mc.oauthClientId
        });
        bSave.onclick = async () => { await window.nexApi.saveMailConfig(collect()); statusEl.textContent = 'Saved.'; };
        bTest.onclick = async () => {
          await window.nexApi.saveMailConfig(collect());
          statusEl.textContent = '…';
          const r = await window.nexApi.testMail();
          statusEl.textContent = r.ok ? `OK (${r.count} emails)` : `Error: ${r.error}`;
        };
        actR.appendChild(bSave); actR.appendChild(bTest); actR.appendChild(statusEl);
        card.appendChild(actR);
      } else {
        const iTok = el('input'); iTok.type = 'password'; iTok.placeholder = mc.hasOAuthToken ? '•••••••• (saved)' : 'Gmail OAuth2 Access Token';
        iTok.oninput = () => { tokVal = iTok.value; };
        const iCid = el('input'); iCid.type = 'text'; iCid.value = mc.oauthClientId || '';
        card.appendChild(el('label', 'field-label', 'OAuth2 Access Token')); card.appendChild(iTok);
        card.appendChild(el('label', 'field-label', 'Client ID')); card.appendChild(iCid);
        const actR = el('div', 'flex-row'); actR.style.marginTop = '12px';
        const bSave = el('button', 'btn', tr('save_mail'));
        const bTest = el('button', 'btn outline', tr('test_mail'));
        const statusEl = el('small', '');
        const collect = () => ({ ...mc, mode: 'gmail_oauth', password: '__UNCHANGED__', oauthAccessToken: tokVal, oauthClientId: iCid.value });
        bSave.onclick = async () => { await window.nexApi.saveMailConfig(collect()); statusEl.textContent = 'Saved.'; };
        bTest.onclick = async () => {
          await window.nexApi.saveMailConfig(collect());
          const r = await window.nexApi.testMail();
          statusEl.textContent = r.ok ? `OK (${r.count} emails)` : `Error: ${r.error}`;
        };
        actR.appendChild(bSave); actR.appendChild(bTest); actR.appendChild(statusEl);
        card.appendChild(actR);
      }
      root.appendChild(card);
    } else if (activeSettingsTab === 'safety') {
      switchRow(root, '🔒 ' + tr('confirm_buy'), tr('confirm_buy_d'), true, () => {}, true);
      switchRow(root, tr('confirm_act'), tr('confirm_act_d'), state.confirmSensitiveActions, (v) => window.nexApi.updateSettings({ confirmSensitiveActions: v }));
    } else if (activeSettingsTab === 'lang') {
      const isEn = state.lang === 'en';
      root.appendChild(el('label', 'field-label', isEn ? 'Appearance Theme' : 'Тема оформления'));
      const thRow = el('div', 'tabs-row');
      [['system', isEn ? 'System' : 'Системная'], ['light', isEn ? 'Warm Light' : 'Тёплая светлая'], ['dark', isEn ? 'AMOLED Dark' : 'AMOLED тёмная']].forEach(([tid, tlbl]) => {
        const b = el('button', 'pill-btn small' + ((state.themeMode || 'system') === tid ? ' active' : ''), tlbl); b.onclick = () => window.nexApi.updateSettings({ themeMode: tid }); thRow.appendChild(b);
      });
      root.appendChild(thRow);
      root.appendChild(el('label', 'field-label', tr('lang_title')));
      const row = el('div', 'tabs-row');
      [['ru', 'Русский'], ['en', 'English']].forEach(([l, lbl]) => {
        const b = el('button', 'pill-btn small' + (state.lang === l ? ' active' : ''), lbl);
        b.onclick = () => window.nexApi.updateSettings({ lang: l });
        row.appendChild(b);
      });
      root.appendChild(row);
      const wBtn = el('button', 'btn outline', tr('show_welcome'));
      wBtn.onclick = () => { onbStep = 0; openOnboarding(); };
      root.appendChild(wBtn);
    }
  }

  function formatBytes(bytes) {
    const b = Number(bytes || 0);
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
    return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  function renderNexCode() {
    const root = document.getElementById('viewNexCode');
    root.innerHTML = '';
    const isEn = state.lang === 'en';
    if (!nexCodeSnap) {
      window.nexApi.nexCodeGet().then(snap => { nexCodeSnap = snap; if (activeView === 'nexcode') renderNexCode(); });
      root.appendChild(el('p', 'sub', isEn ? 'Loading Nex Code…' : 'Загружаю Nex Code…'));
      return;
    }
    const layout = el('div', 'nc-layout');
    const sb = el('div', 'nc-sessions');
    const btnNew = el('button', 'sb-btn primary', isEn ? '+ New session' : '+ Новая сессия');
    btnNew.onclick = async () => { nexCodeSnap = await window.nexApi.nexCodeNew(); renderNexCode(); };
    sb.appendChild(btnNew);
    sb.appendChild(el('div', 'sb-label', isEn ? 'Nex Code History' : 'История Nex Code'));
    const activeId = nexCodeSnap.activeSession?.id;
    for (const s of (nexCodeSnap.sessions || [])) {
      const row = el('div', 'chat-row' + (s.id === activeId ? ' active' : ''));
      const b = el('button', 'c-title', s.title || 'Nex Code'); b.title = s.cwd || '';
      b.onclick = async () => { nexCodeSnap = await window.nexApi.nexCodeOpen(s.id); renderNexCode(); };
      const del = el('button', 'c-del', '×');
      del.onclick = async (e) => { e.stopPropagation(); nexCodeSnap = await window.nexApi.nexCodeDelete(s.id); renderNexCode(); };
      row.appendChild(b); row.appendChild(del); sb.appendChild(row);
    }
    layout.appendChild(sb);

    const main = el('div', 'nc-main'), sess = nexCodeSnap.activeSession || { cwd: '', uiLog: [] };
    const bar = el('div', 'nc-toolbar');
    bar.appendChild(el('span', 'nc-cwd', `📁 ${sess.cwd || ''}`));
    if (nexCodeSnap.hasNexMd) bar.appendChild(el('span', 'dev-badge online', 'NEX.md ✓'));
    const bDir = el('button', 'pill-btn small', isEn ? 'Folder' : 'Папка'); bDir.onclick = async () => { nexCodeSnap = await window.nexApi.nexCodePickFolder(); renderNexCode(); };
    const bAuto = el('button', 'pill-btn small' + (nexCodeSnap.autoApprove ? ' active' : ''), (isEn ? 'Auto: ' : 'Авто: ') + (nexCodeSnap.autoApprove ? 'ON' : 'OFF'));
    bAuto.onclick = async () => { nexCodeSnap = await window.nexApi.nexCodeToggleAuto(!nexCodeSnap.autoApprove); renderNexCode(); };
    const bTerm = el('button', 'pill-btn small', isEn ? 'External Terminal' : 'Внешний терминал'); bTerm.onclick = () => window.nexApi.openNexCode();
    bar.appendChild(bDir); bar.appendChild(bAuto); bar.appendChild(bTerm); main.appendChild(bar);

    if (confirmation) {
      const banner = el('div', 'confirm-box'); banner.appendChild(el('strong', '', confirmation.title)); banner.appendChild(el('p', '', confirmation.details));
      const br = el('div', 'flex-row');
      const okB = el('button', 'btn', isEn ? 'Confirm' : 'Подтвердить'); okB.onclick = () => window.nexApi.resolveConfirmation(true);
      const noB = el('button', 'btn outline', isEn ? 'Cancel' : 'Отмена'); noB.onclick = () => window.nexApi.resolveConfirmation(false);
      br.appendChild(okB); br.appendChild(noB); banner.appendChild(br); main.appendChild(banner);
    }

    const logBox = el('div', 'nc-log'), items = sess.uiLog || [];
    if (!items.length) {
      const hero = el('div', 'welcome-hero');
      hero.appendChild(window.NexIllustrations.create('nexcode'));
      hero.appendChild(el('h2', '', 'Nex Code'));
      hero.appendChild(el('p', 'hero-sub', isEn ? 'Autonomous engineering shell with its own separate history. Reads & edits files, searches the web, inspects git, runs builds and auto-switches AI on limits.' : 'Автономная агентная оболочка с отдельной историей. Сама изучает файлы, гуглит документацию и ошибки, правит код, запускает команды и переключает API при лимите.'));
      const grid = el('div', 'starter-grid');
      const ncStarters = isEn
        ? [['Explore', 'Inspect this project structure and explain how it works'], ['Research', 'Search the web for the latest docs and fix our dependency error'], ['Refactor', 'Find duplicated logic, clean it up, and run tests'], ['Git', 'Check git status & diff and prepare a clean commit summary']]
        : [['Разбор', 'Изучи структуру этой папки и объясни, как устроен проект'], ['Поиск + фикс', 'Найди причину ошибки в коде, погугли решение и исправь'], ['Тесты', 'Запусти сборку/тесты, посмотри ошибки и почини их'], ['Git', 'Проверь git status и diff и предложи чистый коммит']];
      ncStarters.forEach(([tag, pr]) => { const c = el('button', 'starter-card'); c.appendChild(el('span', 'sc-tag', tag)); c.appendChild(el('div', 'sc-title', pr)); c.onclick = () => { inp.value = pr; inp.focus(); }; grid.appendChild(c); });
      hero.appendChild(grid); logBox.appendChild(hero);
    } else {
      for (const item of items) {
        if (item.kind === 'user') logBox.appendChild(el('div', 'msg user', item.text));
        else if (item.kind === 'assistant') logBox.appendChild(el('div', 'msg assistant', item.text));
        else if (item.kind === 'error') logBox.appendChild(el('div', 'msg system', item.text));
        else if (item.kind === 'note') logBox.appendChild(el('div', 'nc-note', item.text));
        else if (item.kind === 'tool') {
          const card = el('div', 'nc-tool-card ' + (item.status || '')), head = el('div', 'nc-tool-head');
          head.appendChild(el('span', '', `${item.status === 'running' ? '⏳' : (item.status === 'error' ? '✕' : '✓')} ${item.tool}`));
          head.appendChild(el('small', '', item.status || '')); card.appendChild(head);
          const argsStr = JSON.stringify(item.args || {}); if (argsStr !== '{}') card.appendChild(el('div', 'nc-tool-args', argsStr.slice(0, 260)));
          if (item.diffText) { const dBox = el('div', 'diff-box'); for (const dl of String(item.diffText).split('\n')) { const cls = dl.startsWith('+ ') ? 'add' : (dl.startsWith('- ') ? 'del' : 'ctx'); dBox.appendChild(el('div', `diff-line ${cls}`, dl)); } card.appendChild(dBox); }
          if (item.checkpointId) { const cp = (sess.checkpoints || []).find(c => c.id === item.checkpointId); const bRb = el('button', 'msg-act-btn', cp?.rolledBack ? (isEn ? 'Rolled back ✓' : 'Откачено ✓') : (isEn ? '↩ Rollback edit' : '↩ Откатить правку')); bRb.disabled = Boolean(cp?.rolledBack); bRb.style.marginTop = '6px'; bRb.onclick = async () => { await window.nexApi.nexCodeRollback(item.checkpointId); }; card.appendChild(bRb); }
          if (item.output) card.appendChild(el('pre', 'nc-tool-out', item.output.slice(0, 1600)));
          logBox.appendChild(card);
        }
      }
    }
    main.appendChild(logBox); logBox.scrollTop = logBox.scrollHeight;

    const comp = el('div', 'composer'), inp = el('textarea');
    inp.rows = 1; inp.placeholder = isEn ? 'Give Nex Code an engineering task (files, terminal, web search)…' : 'Поставь задачу Nex Code (файлы, команды, поиск в интернете)…';
    const sendBtn = el('button', 'icon-btn round send-btn', nexCodeSnap.busy ? '■' : '↑');
    const doSend = async () => {
      if (nexCodeSnap.busy) { await window.nexApi.nexCodeCancel(); return; }
      const val = inp.value.trim(); if (!val) return; inp.value = '';
      const res = await window.nexApi.nexCodeSend(val);
      if (res && !res.ok) { nexCodeSnap = await window.nexApi.nexCodeGet(); renderNexCode(); }
    };
    sendBtn.onclick = doSend;
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); } });
    comp.appendChild(inp); comp.appendChild(sendBtn); main.appendChild(comp);
    layout.appendChild(main); root.appendChild(layout);
  }

  function renderDevices() {
    const root = document.getElementById('viewDevices'); root.innerHTML = ''; const isEn = state.lang === 'en';
    root.appendChild(el('h2', '', tr('devices')));
    root.appendChild(el('p', 'sub', isEn ? 'Manage all 5 Nex ecosystem categories: HUBs, AI Clip, Smart Watch, AR Glasses, and Nex Core PC.' : 'Управление всеми 5 категориями экосистемы Nex: HUBы, Клипса, Часы, Очки и ПК (Nex Core).'));
    if (!devicesSnap) { window.nexApi.devicesGet().then(snap => { devicesSnap = snap; if (activeView === 'devices') renderDevices(); }); root.appendChild(el('p', 'sub', '…')); return; }
    const tabs = el('div', 'tabs-row');
    [['all', isEn ? 'All (5)' : 'Все (5)'], ['hubs', isEn ? 'HUBs' : 'HUBы'], ['clip', isEn ? 'AI Clip' : 'Клипса'], ['watch', isEn ? 'Watch' : 'Часы'], ['glasses', isEn ? 'AR Glasses' : 'Очки'], ['pc', isEn ? 'PC (Nex Core)' : 'ПК (Nex Core)']].forEach(([cid, clbl]) => {
      const b = el('button', 'pill-btn small' + (devicesCat === cid ? ' active' : ''), clbl); b.onclick = () => { devicesCat = cid; renderDevices(); }; tabs.appendChild(b);
    });
    root.appendChild(tabs);
    const eco = devicesSnap.ecosystem || { hubs: [], clip: {}, watch: {}, glasses: {} };
    const saveEco = async (nextEco) => { const r = await window.nexApi.devicesSaveEcosystem(nextEco); if (r && r.ecosystem) devicesSnap.ecosystem = r.ecosystem; renderDevices(); };
    const show = (cat) => devicesCat === 'all' || devicesCat === cat;
    if (show('hubs')) {
      const sec = el('div', 'card-box'); sec.appendChild(el('h3', '', isEn ? 'HUBs (Nex Hub / Nex Hub Ultra)' : 'HUBы (Nex Hub / Nex Hub Ultra)'));
      const wiz = el('div', 'card-box'); wiz.appendChild(el('strong', '', isEn ? 'Connect New Hub (Bluetooth → Wi-Fi → Account)' : 'Подключить новый HUB (Bluetooth → Wi-Fi → Аккаунт)'));
      const wRow = el('div', 'flex-row'); wRow.style.marginTop = '8px';
      const wSel = document.createElement('select'); ['Nex Hub Ultra', 'Nex Hub'].forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; wSel.appendChild(o); });
      const wName = el('input'); wName.type = 'text'; wName.placeholder = isEn ? 'Room / Name' : 'Комната';
      const wWifi = el('input'); wWifi.type = 'text'; wWifi.placeholder = 'Wi-Fi SSID';
      const wBtn = el('button', 'btn', isEn ? 'Pair via BT' : 'Привязать'); wBtn.onclick = async () => { const r = await window.nexApi.devicesHubSetup({ model: wSel.value, name: wName.value || wSel.value, wifiSsid: wWifi.value }); if (r && r.ecosystem) { devicesSnap.ecosystem = r.ecosystem; renderDevices(); } };
      wRow.appendChild(wSel); wRow.appendChild(wName); wRow.appendChild(wWifi); wRow.appendChild(wBtn); wiz.appendChild(wRow); sec.appendChild(wiz);
      const grid = el('div', 'dev-grid');
      (eco.hubs || []).forEach((hub, hIdx) => {
        const card = el('div', 'dev-card'), head = el('div', 'dev-card-head');
        head.appendChild(el('strong', '', `🔊 ${hub.name}`)); head.appendChild(el('span', 'dev-badge' + (hub.connected ? ' online' : ''), hub.connected ? `Wi-Fi · ${hub.wifiSsid || 'Online'}` : (isEn ? 'Standby' : 'Ожидает')));
        card.appendChild(head); card.appendChild(el('small', '', `${hub.model} · ${hub.activity || ''}`));
        const chRow = el('div', 'tabs-row'); [['m', isEn ? 'Nex' : 'Некс'], ['f', isEn ? 'Nexi' : 'Некси']].forEach(([v, lbl]) => { const b = el('button', 'pill-btn small' + (hub.character === v ? ' active' : ''), lbl); b.onclick = () => { eco.hubs[hIdx].character = v; saveEco(eco); }; chRow.appendChild(b); }); card.appendChild(chRow);
        const brRow = el('div', 'dev-slider-row'); brRow.appendChild(el('span', '', isEn ? `Screen: ${hub.brightness}%` : `Яркость: ${hub.brightness}%`)); const br = el('input'); br.type = 'range'; br.min = 0; br.max = 100; br.value = hub.brightness; br.onchange = () => { eco.hubs[hIdx].brightness = Number(br.value); saveEco(eco); }; brRow.appendChild(br); card.appendChild(brRow);
        const vlRow = el('div', 'dev-slider-row'); vlRow.appendChild(el('span', '', isEn ? `Volume: ${hub.volume}%` : `Громкость: ${hub.volume}%`)); const vl = el('input'); vl.type = 'range'; vl.min = 0; vl.max = 100; vl.value = hub.volume; vl.onchange = () => { eco.hubs[hIdx].volume = Number(vl.value); saveEco(eco); }; vlRow.appendChild(vl); card.appendChild(vlRow);
        switchRow(card, isEn ? 'Camera tracking' : 'Слежение камеры', '', Boolean(hub.cameraTracking), (v) => { eco.hubs[hIdx].cameraTracking = v; saveEco(eco); });
        switchRow(card, isEn ? 'Night / DND mode' : 'Ночной режим / Не беспокоить', '', Boolean(hub.nightDnd), (v) => { eco.hubs[hIdx].nightDnd = v; saveEco(eco); });
        const auRow = el('div', 'flex-row'), auSel = document.createElement('select'); ['Яндекс Музыка', 'Spotify', 'YouTube Music', 'Локальное аудио'].forEach(srv => { const o = document.createElement('option'); o.value = srv; o.textContent = srv; if (hub.audioService === srv) o.selected = true; auSel.appendChild(o); }); auSel.onchange = () => { eco.hubs[hIdx].audioService = auSel.value; saveEco(eco); };
        const kBtn = el('button', 'btn outline', isEn ? 'Sync AI Keys' : 'Ключи ИИ'); kBtn.onclick = async () => { const r = await window.nexApi.devicesSyncHubKeys(hub.id); if (r && r.ecosystem) { devicesSnap.ecosystem = r.ecosystem; renderDevices(); } };
        auRow.appendChild(auSel); auRow.appendChild(kBtn); card.appendChild(auRow);
        const icRow = el('div', 'flex-row'), icInp = el('input'); icInp.type = 'text'; icInp.placeholder = isEn ? 'Intercom…' : 'Сказать на колонку…'; const icBtn = el('button', 'btn outline', '📢'); icBtn.onclick = async () => { if (!icInp.value.trim()) return; const r = await window.nexApi.devicesHubIntercom({ hubId: hub.id, message: icInp.value }); if (r && r.ecosystem) { devicesSnap.ecosystem = r.ecosystem; renderDevices(); } }; icRow.appendChild(icInp); icRow.appendChild(icBtn); card.appendChild(icRow);
        grid.appendChild(card);
      });
      sec.appendChild(grid); root.appendChild(sec);
    }
    if (show('clip') || show('watch') || show('glasses')) {
      const grid = el('div', 'dev-grid');
      if (show('clip')) { const clip = eco.clip || {}, c = el('div', 'dev-card'), h = el('div', 'dev-card-head'); h.appendChild(el('strong', '', `🎙 ${clip.name || 'Nex AI Clip'}`)); h.appendChild(el('span', 'dev-badge' + (clip.connected ? ' online' : ''), clip.connected ? `BT · ${clip.battery}%` : 'Bluetooth')); c.appendChild(h); c.appendChild(el('small', '', isEn ? `Battery ${clip.battery}% · Memory ${clip.freeStoragePct}%` : `Заряд ${clip.battery}% · Память ${clip.freeStoragePct}%`)); switchRow(c, isEn ? 'Connected (Bluetooth)' : 'Подключена (Bluetooth)', '', Boolean(clip.connected), (v) => { eco.clip.connected = v; saveEco(eco); }); switchRow(c, isEn ? 'Continuous meeting notes' : 'Постоянный конспект', '', Boolean(clip.continuousNotes), (v) => { eco.clip.continuousNotes = v; saveEco(eco); }); switchRow(c, isEn ? 'Privacy mute' : 'Приватность (выкл. мик/камера)', '', Boolean(clip.privacyMute), (v) => { eco.clip.privacyMute = v; saveEco(eco); }); grid.appendChild(c); }
      if (show('watch')) { const w = eco.watch || {}, c = el('div', 'dev-card'), h = el('div', 'dev-card-head'); h.appendChild(el('strong', '', `⌚ ${w.name || 'Nex Watch'}`)); h.appendChild(el('span', 'dev-badge' + (w.connected ? ' online' : ''), w.connected ? `BT · ${w.battery}%` : 'Bluetooth')); c.appendChild(h); c.appendChild(el('small', '', isEn ? `Battery ${w.battery}% · Pulse ${w.lastPulse} · Sleep ${w.lastSleepHours}h` : `Заряд ${w.battery}% · Пульс ${w.lastPulse} · Сон ${w.lastSleepHours} ч`)); switchRow(c, isEn ? 'Connected (Bluetooth)' : 'Подключены (Bluetooth)', '', Boolean(w.connected), (v) => { eco.watch.connected = v; saveEco(eco); }); switchRow(c, isEn ? 'Quick voice commands' : 'Быстрые голосовые команды', '', Boolean(w.quickVoice), (v) => { eco.watch.quickVoice = v; saveEco(eco); }); switchRow(c, isEn ? 'Silent hints' : 'Тихие подсказки', '', Boolean(w.silentHints), (v) => { eco.watch.silentHints = v; saveEco(eco); }); switchRow(c, isEn ? 'Health context' : 'Контекст здоровья', '', Boolean(w.shareHealthContext), (v) => { eco.watch.shareHealthContext = v; saveEco(eco); }); switchRow(c, isEn ? 'Hub & music remote' : 'Пульт для хаба и музыки', '', Boolean(w.hubMediaRemote), (v) => { eco.watch.hubMediaRemote = v; saveEco(eco); }); grid.appendChild(c); }
      if (show('glasses')) { const g = eco.glasses || {}, c = el('div', 'dev-card'), h = el('div', 'dev-card-head'); h.appendChild(el('strong', '', `👓 ${g.name || 'Nex AR Glasses'}`)); h.appendChild(el('span', 'dev-badge' + (g.connected ? ' online' : ''), g.connected ? `Connected · ${g.battery}%` : 'Bluetooth / Wi-Fi')); c.appendChild(h); const hb = el('div', 'dev-slider-row'); hb.appendChild(el('span', '', isEn ? `HUD: ${g.hudBrightness}%` : `Яркость HUD: ${g.hudBrightness}%`)); const sl = el('input'); sl.type = 'range'; sl.min = 10; sl.max = 100; sl.value = g.hudBrightness || 60; sl.onchange = () => { eco.glasses.hudBrightness = Number(sl.value); saveEco(eco); }; hb.appendChild(sl); c.appendChild(hb); switchRow(c, isEn ? 'Connected' : 'Подключены', '', Boolean(g.connected), (v) => { eco.glasses.connected = v; saveEco(eco); }); switchRow(c, isEn ? 'Live subtitles & translation' : 'Субтитры и синхронный перевод', '', Boolean(g.liveSubtitles), (v) => { eco.glasses.liveSubtitles = v; saveEco(eco); }); switchRow(c, isEn ? 'HUD cards & navigation' : 'Подсказки и навигация', '', Boolean(g.navHints), (v) => { eco.glasses.navHints = v; saveEco(eco); }); const bVis = el('button', 'btn outline', isEn ? '👁 Ask "What do I see?"' : '👁 Спросить «Что я вижу?»'); bVis.onclick = () => { showView('chat'); const inp = document.getElementById('chatInput'); inp.value = isEn ? 'Look at my screen and describe what you see' : 'Посмотри на экран и опиши, что ты видишь'; inp.focus(); }; c.appendChild(bVis); grid.appendChild(c); }
      root.appendChild(grid);
    }
    if (show('pc')) {
      const me = devicesSnap.thisDevice || {}, tel = me.telemetry || {}, meCard = el('div', 'card-box'); meCard.style.marginTop = '12px';
      meCard.appendChild(el('h3', '', `💻 ${me.name || 'Nex Core (Fedora)'}`)); meCard.appendChild(el('p', 'sub', `${me.platform || 'Fedora / Linux'} · IP: ${me.primaryIp || '127.0.0.1'}:${me.port || 47800}`));
      const sg = el('div', 'stats-grid'); [[`${tel.cpuLoadPct ?? 0}%`, `CPU (${tel.cpuCores || 1} cores)`], [`${tel.ramUsedPct ?? 0}%`, `RAM (${tel.ramTotalGb || 0} GB)`], [tel.diskUsedPct !== null && tel.diskUsedPct !== undefined ? `${tel.diskUsedPct}%` : '—', isEn ? 'Disk /' : 'Диск /']].forEach(([v, l]) => { const t = el('div', 'stat-tile'); t.appendChild(el('div', 'st-val', v)); t.appendChild(el('div', 'st-lbl', l)); sg.appendChild(t); }); meCard.appendChild(sg);
      const nameRow = el('div', 'flex-row'); nameRow.style.marginBottom = '10px'; const nInp = el('input'); nInp.type = 'text'; nInp.value = me.name || ''; const nBtn = el('button', 'btn outline', 'OK'); nBtn.onclick = async () => { await window.nexApi.devicesUpdate({ deviceName: nInp.value }); devicesSnap = null; renderDevices(); }; nameRow.appendChild(nInp); nameRow.appendChild(nBtn); meCard.appendChild(nameRow);
      switchRow(meCard, isEn ? 'Allow Android LAN Bridge (47800)' : 'Разрешить управление с Android (47800)', '', me.lanEnabled !== false, async (v) => { await window.nexApi.devicesUpdate({ lanBridgeEnabled: v }); devicesSnap = null; renderDevices(); });
      const tokBox = el('div', 'card-box'); tokBox.style.marginTop = '10px'; tokBox.appendChild(el('strong', '', isEn ? 'Phone Pairing & Clipboard Sync' : 'Сопряжение и буфер обмена')); tokBox.appendChild(el('p', 'sub', `IP: ${me.primaryIp} · Port: ${me.port} · Code: ${me.pairingToken}`)); if (devicesSnap.clipboardPreview) tokBox.appendChild(el('small', '', `${isEn ? 'Clipboard:' : 'Буфер:'} ${devicesSnap.clipboardPreview}`)); const regBtn = el('button', 'btn outline', isEn ? 'Generate New Code' : 'Обновить код'); regBtn.onclick = async () => { await window.nexApi.devicesRegenToken(); devicesSnap = null; renderDevices(); }; tokBox.appendChild(regBtn); meCard.appendChild(tokBox); root.appendChild(meCard);
    }
  }
  function renderAccount() {
    const root = document.getElementById('viewAccount');
    root.innerHTML = '';
    const acc = state.account || {};
    root.appendChild(el('h2', '', tr('account')));
    root.appendChild(el('p', 'sub', tr('acc_desc')));

    // Summary card
    const keyCount = Object.values(state.apiKeyStatus || {}).filter(x => x.set).length;
    const sum = el('div', 'card-box');
    sum.appendChild(el('b', '', acc.isSignedIn ? `${acc.authType.toUpperCase()} · ${acc.email}` : (state.lang === 'en' ? 'Local Guest Profile' : 'Локальный гостевой профиль')));
    sum.appendChild(el('div', '', `${tr('active_model')}: ${currentModelPillText().replace(' ▾', '')}`));
    sum.appendChild(el('small', '', state.lang === 'en'
      ? `Saved: ${keyCount} keys · ${state.chats.length} chats · ${(state.mediaItems || []).length} photos/videos · ${state.artifacts.length} artifacts`
      : `Сохранено: ключей ${keyCount} · чатов ${state.chats.length} · фото/видео ${(state.mediaItems || []).length} · артефактов ${state.artifacts.length}`
    ));
    root.appendChild(sum);

    root.appendChild(el('label', 'field-label', tr('your_name')));
    const nameInp = el('input'); nameInp.type = 'text'; nameInp.value = state.userName || '';
    nameInp.onchange = () => window.nexApi.updateSettings({ userName: nameInp.value });
    root.appendChild(nameInp);

    // Auth block
    const authCard = el('div', 'card-box'); authCard.style.marginTop = '14px';
    if (!acc.isSignedIn) {
      authCard.appendChild(el('h3', '', tr('sign_in_title')));
      const tabs = el('div', 'tabs-row');
      [['email', tr('email_tab')], ['google', tr('google_tab')]].forEach(([id, lbl]) => {
        const b = el('button', 'pill-btn small' + (accAuthTab === id ? ' active' : ''), lbl);
        b.onclick = () => { accAuthTab = id; renderAccount(); };
        tabs.appendChild(b);
      });
      authCard.appendChild(tabs);

      if (accAuthTab === 'email') {
        const iEm = el('input'); iEm.type = 'text'; iEm.placeholder = 'Email'; iEm.style.marginBottom = '8px';
        const iPw = el('input'); iPw.type = 'password'; iPw.placeholder = state.lang === 'en' ? 'Password' : 'Пароль'; iPw.style.marginBottom = '10px';
        const r = el('div', 'flex-row');
        const bIn = el('button', 'btn', tr('sign_in_btn'));
        bIn.onclick = async () => {
          const res = await window.nexApi.signInEmail({ email: iEm.value, password: iPw.value });
          authMsg = res.ok ? `OK: ${res.profile.email}` : res.error;
          renderAccount();
        };
        const bReg = el('button', 'btn outline', tr('register_btn'));
        bReg.onclick = async () => {
          const res = await window.nexApi.registerEmail({ email: iEm.value, password: iPw.value, displayName: nameInp.value });
          authMsg = res.ok ? `Created: ${res.profile.email}` : res.error;
          renderAccount();
        };
        r.appendChild(bIn); r.appendChild(bReg);
        authCard.appendChild(iEm); authCard.appendChild(iPw); authCard.appendChild(r);
      } else {
        const iCid = el('input'); iCid.type = 'text'; iCid.value = acc.googleClientId || '';
        iCid.placeholder = 'Google Cloud Desktop OAuth Client ID'; iCid.style.marginBottom = '10px';
        const bG = el('button', 'btn', tr('sign_in_google'));
        bG.onclick = async () => {
          authMsg = state.lang === 'en' ? 'Opening Google Sign-In in browser…' : 'Открываю вход Google в браузере…';
          renderAccount();
          const res = await window.nexApi.signInGoogle(iCid.value);
          authMsg = res.ok ? `Google: ${res.profile.email}` : res.error;
          renderAccount();
        };
        authCard.appendChild(iCid); authCard.appendChild(bG);
      }
    } else {
      const bOut = el('button', 'btn outline', tr('sign_out'));
      bOut.onclick = async () => { await window.nexApi.signOut(); authMsg = ''; renderAccount(); };
      authCard.appendChild(bOut);
    }
    if (authMsg) authCard.appendChild(el('p', 'sub', authMsg));
    root.appendChild(authCard);

    // Unified Multi-Backend Storage Hub
    const syncCard = el('div', 'card-box');
    const isEn = state.lang === 'en';
    syncCard.appendChild(window.NexIllustrations.create('storage', 'compact'));
    syncCard.appendChild(el('h3', '', isEn ? 'Unified Storage (Photos, Videos, Artifacts, Keys & Chats)' : 'Единое хранилище (фото, видео, артефакты, ключи и чаты)'));
    syncCard.appendChild(el('p', 'sub', isEn
      ? 'Store everything with AES-256-GCM encryption for API keys & chats. Pick WebDAV (Yandex Disk / Nextcloud), S3 (Backblaze B2 / R2 / MinIO), Google Drive, or a local synced folder.'
      : 'Все фото, видео, артефакты, вложения, чаты и шифрованные (AES-256-GCM) API-ключи в одном месте. Выбери WebDAV (Яндекс.Диск / Nextcloud), S3 (Backblaze B2 / R2 / MinIO), Google Диск или локальную папку.'));

    if (!storageStats) {
      window.nexApi.storageGetStats().then(st => { storageStats = st; if (activeView === 'account') renderAccount(); });
    } else {
      const sg = el('div', 'stats-grid');
      [[`${storageStats.photoCount + storageStats.videoCount}`, `${isEn ? 'Photos & Videos' : 'Фото и видео'} · ${formatBytes(storageStats.mediaBytes)}`],
       [`${storageStats.artifactCount}`, `${isEn ? 'Artifacts' : 'Артефакты'} · ${formatBytes(storageStats.artifactBytes)}`],
       [`${storageStats.attachmentCount}`, `${isEn ? 'Attachments' : 'Вложения'} · ${formatBytes(storageStats.attachmentBytes)}`],
       [`${storageStats.chatCount}`, isEn ? 'Chats' : 'Чаты'],
       [`${storageStats.nexCodeCount}`, isEn ? 'Nex Code sessions' : 'Сессии Nex Code'],
       [`${storageStats.keysCount}`, isEn ? 'Encrypted API Keys' : 'Шифр. ключи API']
      ].forEach(([v, l]) => { const t = el('div', 'stat-tile'); t.appendChild(el('div', 'st-val', v)); t.appendChild(el('div', 'st-lbl', l)); sg.appendChild(t); });
      syncCard.appendChild(sg);
    }

    const sc = state.storageConfig || { backend: 'webdav', webdav: {}, s3: {}, localFolder: '' };
    const curBackend = storageTab || sc.backend || 'webdav';
    const bTabs = el('div', 'tabs-row');
    [['webdav', isEn ? 'WebDAV (Yandex / Nextcloud)' : 'WebDAV (Яндекс / Nextcloud)'], ['s3', 'S3 (B2 / R2 / MinIO)'], ['local_folder', isEn ? 'Local Folder' : 'Локальная папка'], ['google_drive', 'Google Drive']].forEach(([id, lbl]) => {
      const b = el('button', 'pill-btn small' + (curBackend === id ? ' active' : ''), lbl);
      b.onclick = async () => { storageTab = id; await window.nexApi.storageSaveConfig({ backend: id }); renderAccount(); };
      bTabs.appendChild(b);
    });
    syncCard.appendChild(bTabs);

    const passInp = el('input'); passInp.type = 'password'; passInp.placeholder = acc.hasDrivePassphrase ? '•••••••• (' + tr('sync_pass') + ')' : tr('sync_pass'); passInp.style.marginBottom = '10px';
    passInp.onchange = () => { if (passInp.value.trim()) window.nexApi.setDrivePassphrase(passInp.value.trim()); };
    syncCard.appendChild(passInp);
    const syncStatus = el('p', 'sub', driveLiveStatus); syncStatus.style.color = 'var(--ok)';

    if (curBackend === 'webdav') {
      const presets = el('div', 'tabs-row');
      [['Яндекс.Диск', 'https://webdav.yandex.ru'], ['Nextcloud', 'https://your-cloud.example/remote.php/dav/files/USERNAME'], ['Koofr', 'https://app.koofr.net/dav/Koofr']].forEach(([name, presetUrl]) => {
        const pb = el('button', 'pill-btn small', name); pb.onclick = () => { iUrl.value = presetUrl; }; presets.appendChild(pb);
      });
      syncCard.appendChild(presets);
      const iUrl = el('input'); iUrl.type = 'text'; iUrl.value = sc.webdav?.url || ''; iUrl.placeholder = 'WebDAV URL (https://webdav.yandex.ru)'; iUrl.style.marginBottom = '8px';
      const iUser = el('input'); iUser.type = 'text'; iUser.value = sc.webdav?.username || ''; iUser.placeholder = isEn ? 'Username / Email' : 'Логин / Почта'; iUser.style.marginBottom = '8px';
      const iPass = el('input'); iPass.type = 'password'; iPass.placeholder = sc.webdav?.hasPassword ? '•••••••• (пароль приложения сохранён)' : (isEn ? 'App password' : 'Пароль приложения (WebDAV)'); iPass.style.marginBottom = '8px';
      const bSave = el('button', 'btn outline', isEn ? 'Save & Test Connection' : 'Сохранить и проверить связь'); bSave.style.marginBottom = '10px';
      bSave.onclick = async () => { syncStatus.textContent = '…'; await window.nexApi.storageSaveConfig({ backend: 'webdav', webdav: { url: iUrl.value, username: iUser.value, password: iPass.value } }); const t = await window.nexApi.storageTest(); syncStatus.textContent = t.ok ? `✓ ${t.message}` : `Ошибка: ${t.error}`; };
      syncCard.appendChild(iUrl); syncCard.appendChild(iUser); syncCard.appendChild(iPass); syncCard.appendChild(bSave);
    } else if (curBackend === 's3') {
      const iEp = el('input'); iEp.type = 'text'; iEp.value = sc.s3?.endpoint || ''; iEp.placeholder = 'Endpoint (https://s3.us-west-004.backblazeb2.com / R2 / MinIO)'; iEp.style.marginBottom = '8px';
      const rRow = el('div', 'flex-row'); rRow.style.marginBottom = '8px';
      const iReg = el('input'); iReg.type = 'text'; iReg.value = sc.s3?.region || 'auto'; iReg.placeholder = 'Region (auto / us-east-1)';
      const iBkt = el('input'); iBkt.type = 'text'; iBkt.value = sc.s3?.bucket || ''; iBkt.placeholder = 'Bucket name'; rRow.appendChild(iReg); rRow.appendChild(iBkt);
      const iAk = el('input'); iAk.type = 'text'; iAk.value = sc.s3?.accessKeyId || ''; iAk.placeholder = 'Access Key ID'; iAk.style.marginBottom = '8px';
      const iSk = el('input'); iSk.type = 'password'; iSk.placeholder = sc.s3?.hasSecret ? '•••••••• (Secret Key saved)' : 'Secret Access Key'; iSk.style.marginBottom = '8px';
      const bSave = el('button', 'btn outline', isEn ? 'Save & Test S3' : 'Сохранить и проверить S3'); bSave.style.marginBottom = '10px';
      bSave.onclick = async () => { syncStatus.textContent = '…'; await window.nexApi.storageSaveConfig({ backend: 's3', s3: { endpoint: iEp.value, region: iReg.value, bucket: iBkt.value, accessKeyId: iAk.value, secretAccessKey: iSk.value } }); const t = await window.nexApi.storageTest(); syncStatus.textContent = t.ok ? `✓ ${t.message}` : `Ошибка: ${t.error}`; };
      syncCard.appendChild(iEp); syncCard.appendChild(rRow); syncCard.appendChild(iAk); syncCard.appendChild(iSk); syncCard.appendChild(bSave);
    } else if (curBackend === 'local_folder') {
      syncCard.appendChild(el('p', 'sub', sc.localFolder ? `📁 ${sc.localFolder}/Nex/` : (isEn ? 'Choose any synced folder (Syncthing, Dropbox, Yandex Disk, Nextcloud).' : 'Выбери любую папку (Syncthing, Dropbox, Яндекс.Диск, Nextcloud) для автозеркалирования всех файлов.')));
      const bPick = el('button', 'btn outline', isEn ? 'Choose Sync Folder' : 'Выбрать папку хранения'); bPick.style.marginBottom = '10px';
      bPick.onclick = async () => { const r = await window.nexApi.storagePickLocalFolder(); if (r && r.ok) { syncStatus.textContent = `✓ ${r.folder}/Nex/`; renderAccount(); } };
      syncCard.appendChild(bPick);
    } else if (curBackend === 'google_drive') {
      if (acc.driveConnected) {
        const modeTabs = el('div', 'tabs-row');
        [['visible', tr('drive_vis')], ['hidden', tr('drive_hid')]].forEach(([m, lbl]) => { const b = el('button', 'pill-btn small' + (acc.driveFolderMode === m ? ' active' : ''), lbl); b.onclick = () => window.nexApi.updateSettings({ driveFolderMode: m }); modeTabs.appendChild(b); });
        syncCard.appendChild(modeTabs);
      } else {
        const iCid = el('input'); iCid.type = 'text'; iCid.value = acc.googleClientId || ''; iCid.placeholder = 'Google Cloud Desktop OAuth Client ID'; iCid.style.marginBottom = '8px';
        const bLink = el('button', 'btn', tr('link_drive')); bLink.style.marginBottom = '10px';
        bLink.onclick = async () => { syncStatus.textContent = isEn ? 'Opening Google Drive authorization…' : 'Открываю авторизацию Google Диска…'; const r = await window.nexApi.signInGoogle(iCid.value, Boolean(acc.isSignedIn)); syncStatus.textContent = r.ok ? 'Google Drive connected!' : 'Error: ' + r.error; };
        syncCard.appendChild(iCid); syncCard.appendChild(bLink);
      }
    }

    switchRow(syncCard, isEn ? 'Auto-sync all files to active storage' : 'Автосохранение всех файлов в хранилище', tr('drive_auto_d'), acc.driveAutoSync, (v) => window.nexApi.updateSettings({ driveAutoSync: v }));
    const gRow = el('div', 'flex-row'); gRow.style.margin = '10px 0';
    const bUp = el('button', 'btn', isEn ? 'Sync All Now ↑' : 'Сохранить всё ↑');
    bUp.onclick = async () => { syncStatus.textContent = '…'; const r = await window.nexApi.storagePushAll(passInp.value); if (r.ok) { const rep = r.report || {}; storageStats = await window.nexApi.storageGetStats(); syncStatus.textContent = isEn ? `Saved (${rep.backend}): uploaded ${rep.uploadedFiles}, unchanged ${rep.skippedFiles}.` : `Сохранено (${rep.backend}): загружено ${rep.uploadedFiles}, без изменений ${rep.skippedFiles}.`; } else syncStatus.textContent = 'Error: ' + r.error; };
    const bDn = el('button', 'btn outline', isEn ? 'Restore All ↓' : 'Загрузить всё ↓');
    bDn.onclick = async () => { syncStatus.textContent = '…'; const r = await window.nexApi.storagePullAll(passInp.value); if (r.ok) { const rep = r.report || {}; storageStats = await window.nexApi.storageGetStats(); syncStatus.textContent = isEn ? `Restored (${rep.backend}): downloaded ${rep.downloadedFiles}, already local ${rep.skippedFiles}.` : `Загружено (${rep.backend}): скачано ${rep.downloadedFiles}, уже локально ${rep.skippedFiles}.`; } else syncStatus.textContent = 'Error: ' + r.error; };
    gRow.appendChild(bUp); gRow.appendChild(bDn); syncCard.appendChild(gRow);

    const vRow = el('div', 'flex-row');
    const bExp = el('button', 'btn outline', tr('vault_exp')); bExp.onclick = async () => { const r = await window.nexApi.exportVault(passInp.value); if (!r.canceled) syncStatus.textContent = r.ok ? `Saved: ${r.filePath}` : 'Error: ' + r.error; };
    const bImp = el('button', 'btn outline', tr('vault_imp')); bImp.onclick = async () => { const r = await window.nexApi.importVault(passInp.value); if (!r.canceled) syncStatus.textContent = r.ok ? 'Restored!' : 'Error: ' + r.error; };
    vRow.appendChild(bExp); vRow.appendChild(bImp); syncCard.appendChild(vRow);
    syncCard.appendChild(syncStatus);
    root.appendChild(syncCard);
  }

  function openModelModal() {
    const modal = document.getElementById('modelModal');
    const body = document.getElementById('modelModalBody');
    body.innerHTML = '';
    modal.hidden = false;

    const keys = {};
    for (const p of constants.PROVIDERS) keys[p] = (p === 'Custom') ? Boolean(state.customBaseUrl) : Boolean(state.apiKeyStatus[p]?.set);

    body.appendChild(el('label', 'field-label', tr('effort')));
    const eRow = el('div', 'tabs-row');
    constants.EFFORTS.forEach(e => {
      const b = el('button', 'pill-btn small' + (state.effort === e.id ? ' active' : ''), e[state.lang === 'en' ? 'en' : 'ru']);
      b.onclick = async () => { await window.nexApi.updateSettings({ effort: e.id }); openModelModal(); };
      eRow.appendChild(b);
    });
    body.appendChild(eRow);
    body.appendChild(el('p', 'sub', tr('effort_desc')));

    const addGroup = (id, title, count, fillFn) => {
      const h = el('button', 'acc-head');
      h.appendChild(el('span', '', title));
      h.appendChild(el('small', '', `${openAccordions[id] ? '▾' : '▸'} ${count}`));
      const box = el('div'); box.hidden = !openAccordions[id];
      h.onclick = () => { openAccordions[id] = !openAccordions[id]; openModelModal(); };
      fillFn(box);
      body.appendChild(h); body.appendChild(box);
    };

    addGroup('nex', 'Nex', constants.NEX_PROFILES.length, (box) => {
      constants.NEX_PROFILES.forEach(p => {
        const b = el('button', 'm-opt profile' + (state.selectedProfileId === p.id ? ' sel' : ''));
        b.appendChild(el('b', '', p.title));
        b.appendChild(el('small', '', state.lang === 'en' ? p.descEn : p.descRu));
        let res = null;
        if (p.isMedia) res = p.imageRoutes.find(([pr]) => keys[pr]) || p.videoRoutes.find(([pr]) => keys[pr]);
        else res = p.textRoutes.find(([pr]) => keys[pr]);
        b.appendChild(el('small', res ? 'ok' : 'warn', res ? `${tr('active')}: ${res[0]} · ${res[1]}` : tr('key_needed')));
        b.onclick = async () => {
          const nextMode = p.isMedia ? (genMode || 'image') : null;
          genMode = nextMode;
          await window.nexApi.updateSettings({ selectedProfileId: p.id, lastGenMode: nextMode });
          modal.hidden = true;
        };
        box.appendChild(b);
      });
    });

    constants.PROVIDERS.forEach(prov => {
      const list = state.modelCatalog[prov] || [];
      addGroup('p_' + prov, prov, list.length, (box) => {
        list.forEach(m => {
          const sel = !state.selectedProfileId && !genMode && state.manualProvider === prov && state.manualModel === m;
          const b = el('button', 'm-opt' + (sel ? ' sel' : ''), m);
          if (sel) b.appendChild(el('small', '', tr('selected')));
          b.onclick = async () => {
            genMode = null;
            await window.nexApi.updateSettings({ selectedProfileId: null, manualProvider: prov, manualModel: m, lastGenMode: null });
            modal.hidden = true;
          };
          box.appendChild(b);
        });
      });
    });

    const imgTotal = Object.values(constants.IMAGE_MODELS).reduce((a, l) => a + l.length, 0);
    addGroup('img', tr('images_sec'), imgTotal, (box) => {
      Object.entries(constants.IMAGE_MODELS).forEach(([prov, list]) => {
        box.appendChild(el('label', 'field-label', prov));
        list.forEach(m => {
          const sel = !state.selectedProfileId && genMode === 'image' && state.imageModel === m;
          const b = el('button', 'm-opt' + (sel ? ' sel' : ''), m);
          b.onclick = async () => {
            genMode = 'image';
            await window.nexApi.updateSettings({ selectedProfileId: null, imageModel: m, lastGenMode: 'image' });
            modal.hidden = true;
          };
          box.appendChild(b);
        });
      });
    });

    const vidTotal = Object.values(constants.VIDEO_MODELS).reduce((a, l) => a + l.length, 0);
    addGroup('vid', tr('videos_sec'), vidTotal, (box) => {
      Object.entries(constants.VIDEO_MODELS).forEach(([prov, list]) => {
        box.appendChild(el('label', 'field-label', prov));
        list.forEach(m => {
          const sel = !state.selectedProfileId && genMode === 'video' && state.videoModel === m;
          const b = el('button', 'm-opt' + (sel ? ' sel' : ''), m);
          b.onclick = async () => {
            genMode = 'video';
            await window.nexApi.updateSettings({ selectedProfileId: null, videoModel: m, lastGenMode: 'video' });
            modal.hidden = true;
          };
          box.appendChild(b);
        });
      });
    });
  }

  function openOnboarding() {
    const ov = document.getElementById('onbOverlay');
    const card = document.getElementById('onbCard');
    ov.hidden = false;
    if (onbSphere) { onbSphere.destroy(); onbSphere = null; }
    card.innerHTML = '';

    const langRow = el('div', 'flex-row'); langRow.style.justifyContent = 'flex-end';
    [['ru', 'Русский'], ['en', 'English']].forEach(([l, lbl]) => {
      const b = el('button', 'pill-btn small' + (state.lang === l ? ' active' : ''), lbl);
      b.onclick = async () => { await window.nexApi.updateSettings({ lang: l }); openOnboarding(); };
      langRow.appendChild(b);
    });
    card.appendChild(langRow);

    const dots = el('div', 'onb-dots');
    for (let i = 0; i < 5; i++) dots.appendChild(el('i', i === onbStep ? 'on' : ''));
    card.appendChild(dots);

    if (onbStep === 0) {
      const cv = el('canvas'); cv.width = 320; cv.height = 320; cv.style.cssText = 'width:160px;height:160px;margin:0 auto;display:block';
      card.appendChild(cv);
      onbSphere = window.NexSphereRenderer.attach(cv);
      onbSphere.update('speaking', state.voice === 'f');
      card.appendChild(el('h2', '', tr('onb_title')));
      card.appendChild(el('p', 'sub', tr('onb_sub')));
      const b1 = el('button', 'btn', tr('start')); b1.style.width = '100%';
      b1.onclick = () => { onbStep = 1; openOnboarding(); };
      const b2 = el('button', 'btn outline', tr('skip')); b2.style.width = '100%'; b2.style.marginTop = '8px';
      b2.onclick = async () => { await window.nexApi.updateSettings({ onboarded: true }); closeOnboarding(); };
      card.appendChild(b1); card.appendChild(b2);
    } else if (onbStep === 1) {
      card.appendChild(el('h2', '', tr('sign_in_title')));
      card.appendChild(el('p', 'sub', tr('sign_in_sub')));
      const tabs = el('div', 'tabs-row'); tabs.style.justifyContent = 'center';
      [['email', tr('email_tab')], ['google', tr('google_tab')]].forEach(([id, lbl]) => {
        const b = el('button', 'pill-btn small' + (onbAuthTab === id ? ' active' : ''), lbl);
        b.onclick = () => { onbAuthTab = id; openOnboarding(); };
        tabs.appendChild(b);
      });
      card.appendChild(tabs);

      const errEl = el('p', 'sub', authMsg);
      if (onbAuthTab === 'email') {
        const iNm = el('input'); iNm.type = 'text'; iNm.placeholder = tr('your_name'); iNm.style.marginBottom = '8px';
        const iEm = el('input'); iEm.type = 'text'; iEm.placeholder = 'Email'; iEm.style.marginBottom = '8px';
        const iPw = el('input'); iPw.type = 'password'; iPw.placeholder = state.lang === 'en' ? 'Password' : 'Пароль'; iPw.style.marginBottom = '10px';
        const r = el('div', 'grid-2');
        const bIn = el('button', 'btn', tr('sign_in_btn'));
        bIn.onclick = async () => {
          const res = await window.nexApi.signInEmail({ email: iEm.value, password: iPw.value });
          if (res.ok) { onbStep = 2; openOnboarding(); } else { authMsg = res.error; openOnboarding(); }
        };
        const bReg = el('button', 'btn outline', tr('register_btn'));
        bReg.onclick = async () => {
          const res = await window.nexApi.registerEmail({ email: iEm.value, password: iPw.value, displayName: iNm.value });
          if (res.ok) { onbStep = 2; openOnboarding(); } else { authMsg = res.error; openOnboarding(); }
        };
        r.appendChild(bIn); r.appendChild(bReg);
        card.appendChild(iNm); card.appendChild(iEm); card.appendChild(iPw); card.appendChild(r);
      } else {
        const iCid = el('input'); iCid.type = 'text'; iCid.value = state.account?.googleClientId || '';
        iCid.placeholder = 'Google Cloud Desktop OAuth Client ID'; iCid.style.marginBottom = '10px';
        const bG = el('button', 'btn', tr('sign_in_google')); bG.style.width = '100%';
        bG.onclick = async () => {
          const res = await window.nexApi.signInGoogle(iCid.value);
          if (res.ok) { onbStep = 2; openOnboarding(); } else { authMsg = res.error; openOnboarding(); }
        };
        card.appendChild(iCid); card.appendChild(bG);
      }
      if (authMsg) card.appendChild(errEl);
      const bSkip = el('button', 'btn outline', tr('skip')); bSkip.style.width = '100%'; bSkip.style.marginTop = '10px';
      bSkip.onclick = () => { onbStep = 2; openOnboarding(); };
      card.appendChild(bSkip);
    } else if (onbStep === 2) {
      card.appendChild(el('h2', '', tr('onb_perms')));
      card.appendChild(el('p', 'sub', tr('access_desc')));
      const p = state.permissions;
      const box = el('div'); box.style.textAlign = 'left';
      switchRow(box, tr('perm_files'), tr('perm_files_d'), p.files, async (v) => { await window.nexApi.updateSettings({ permissions: { files: v } }); openOnboarding(); });
      switchRow(box, tr('perm_shell'), tr('perm_shell_d'), p.shell, async (v) => { await window.nexApi.updateSettings({ permissions: { shell: v } }); openOnboarding(); });
      switchRow(box, tr('perm_apps'), tr('perm_apps_d'), p.apps, async (v) => { await window.nexApi.updateSettings({ permissions: { apps: v } }); openOnboarding(); });
      switchRow(box, tr('perm_mail'), tr('perm_mail_d'), p.mail, async (v) => { await window.nexApi.updateSettings({ permissions: { mail: v } }); openOnboarding(); });
      card.appendChild(box);
      const next = el('button', 'btn', tr('next')); next.style.width = '100%'; next.style.marginTop = '14px';
      next.onclick = () => { onbStep = 3; openOnboarding(); };
      card.appendChild(next);
    } else if (onbStep === 3) {
      const cv = el('canvas'); cv.width = 240; cv.height = 240; cv.style.cssText = 'width:120px;height:120px;margin:0 auto;display:block';
      card.appendChild(cv);
      onbSphere = window.NexSphereRenderer.attach(cv);
      onbSphere.update('speaking', state.voice === 'f');
      card.appendChild(el('h2', '', tr('onb_voice')));
      card.appendChild(el('p', 'sub', tr('onb_voice_sub')));
      const row = el('div', 'grid-2');
      const bm = el('button', 'btn' + (state.voice === 'f' ? ' outline' : ''), tr('male'));
      bm.onclick = async () => { await window.nexApi.updateSettings({ voice: 'm' }); openOnboarding(); };
      const bf = el('button', 'btn' + (state.voice === 'f' ? '' : ' outline'), tr('female'));
      bf.onclick = async () => { await window.nexApi.updateSettings({ voice: 'f' }); openOnboarding(); };
      row.appendChild(bm); row.appendChild(bf);
      card.appendChild(row);
      const next = el('button', 'btn', tr('next')); next.style.width = '100%'; next.style.marginTop = '14px';
      next.onclick = () => { onbStep = 4; openOnboarding(); };
      card.appendChild(next);
    } else {
      card.appendChild(el('h2', '', tr('onb_keys')));
      card.appendChild(el('p', 'sub', tr('onb_keys_sub')));
      const inputs = {};
      constants.PROVIDERS.forEach(p => {
        const i = el('input'); i.type = 'password'; i.placeholder = `${p} API Key`; i.style.marginBottom = '8px';
        inputs[p] = i; card.appendChild(i);
      });
      const finish = el('button', 'btn', tr('done')); finish.style.width = '100%'; finish.style.marginTop = '8px';
      finish.onclick = async () => {
        for (const p of constants.PROVIDERS) {
          if (inputs[p].value.trim()) await window.nexApi.setApiKey(p, inputs[p].value.trim());
        }
        await window.nexApi.updateSettings({ onboarded: true });
        closeOnboarding();
      };
      card.appendChild(finish);
    }
  }

  function closeOnboarding() {
    if (onbSphere) { onbSphere.destroy(); onbSphere = null; }
    document.getElementById('onbOverlay').hidden = true;
  }

  function renderAll() {
    if (!state) return;
    renderSidebar();
    renderTopBar();
    if (activeView === 'chat') renderChat();
    else if (activeView === 'nexcode') renderNexCode();
    else if (activeView === 'devices') renderDevices();
    else if (activeView === 'projects') renderProjects();
    else if (activeView === 'artifacts') renderArtifactsLib();
    else if (activeView === 'artifactDetail') renderArtifactDetail();
    else if (activeView === 'studio') renderStudio();
    else if (activeView === 'nexcode') renderNexCode();
    else if (activeView === 'devices') renderDevices();
    else if (activeView === 'settings') renderSettings();
    else if (activeView === 'account') renderAccount();
  }

  let currentAudioEl = null;
  function stopRendererAudio() {
    if (currentAudioEl) {
      try { currentAudioEl.pause(); currentAudioEl.src = ''; } catch (_) {}
      currentAudioEl = null;
    }
    if (window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
  }

  async function sendCurrent(opts = {}) {
    if (isBusy) { await window.nexApi.cancelGeneration(); return; }
    const inp = document.getElementById('chatInput');
    const text = inp.value.trim();
    if (!text && !attachments.length) return;
    inp.value = '';
    const toSendAtts = attachments.slice();
    attachments = [];
    isBusy = true;
    renderChat();
    try {
      await window.nexApi.sendMessage({ text, attachments: toSendAtts, genMode, fromVoice: Boolean(opts.fromVoice) });
    } finally {
      isBusy = false;
      renderAll();
    }
  }

  document.getElementById('btnToggleSb').onclick = () => { const next = !Boolean(state?.sidebarCollapsed); document.getElementById('shell').classList.toggle('sb-collapsed', next); window.nexApi.updateSettings({ sidebarCollapsed: next }); };
  document.getElementById('chatSearchInput').addEventListener('input', (e) => { chatSearchQuery = e.target.value || ''; renderSidebar(); });
  document.getElementById('btnScreenVision').onclick = async () => { const res = await window.nexApi.captureScreen(); if (res && res.ok) { pendingAttachments.push({ name: res.name, mimeType: res.mimeType, isImage: true, base64: res.base64 }); renderChips(); const inp = document.getElementById('chatInput'); if (!inp.value.trim()) inp.value = state.lang === 'en' ? 'Look at my screen and help me with this' : 'Посмотри на мой экран и помоги разобраться'; inp.focus(); } };
  function openVoiceMode() { voiceModeActive = true; document.getElementById('voiceModeOverlay').hidden = false; document.getElementById('vmTitle').textContent = state.lang === 'en' ? `Live Voice · ${agentName()}` : `Живой голос · ${agentName()}`; document.getElementById('vmStatus').textContent = state.lang === 'en' ? 'Listening…' : 'Слушает…'; if (!vmSphereCtrl && window.NexSphereRenderer) vmSphereCtrl = window.NexSphereRenderer.attach(document.getElementById('vmSphere')); if (vmSphereCtrl) vmSphereCtrl.update('listening', state.voice === 'f'); if (window.NexVoice && !window.NexVoice.isListening()) window.NexVoice.toggleManualListen(); }
  function closeVoiceMode() { voiceModeActive = false; document.getElementById('voiceModeOverlay').hidden = true; window.nexApi.stopSpeech(); if (window.NexVoice && window.NexVoice.isListening()) window.NexVoice.toggleManualListen(); }
  document.getElementById('btnVoiceMode').onclick = openVoiceMode; document.getElementById('btnVmClose').onclick = closeVoiceMode; document.getElementById('btnVmExit').onclick = closeVoiceMode;
  document.getElementById('btnVmBarge').onclick = () => { window.nexApi.stopSpeech(); document.getElementById('vmStatus').textContent = state.lang === 'en' ? 'Listening…' : 'Слушает…'; if (window.NexVoice && !window.NexVoice.isListening()) window.NexVoice.toggleManualListen(); };
  window.__nexOnSpeechFinished = () => { if (voiceModeActive && window.NexVoice && !window.NexVoice.isListening()) setTimeout(() => { if (voiceModeActive && !isBusy && window.NexVoice && !window.NexVoice.isListening()) window.NexVoice.toggleManualListen(); }, 350); };
  document.getElementById('btnToggleComp').onclick = () => window.nexApi.toggleCompanion();
  document.getElementById('btnNewChat').onclick = async () => { await window.nexApi.newChat(null); showView('chat'); };
  document.getElementById('btnProjects').onclick = () => showView('projects');
  document.getElementById('btnArtifacts').onclick = () => showView('artifacts');
  document.getElementById('btnStudio').onclick = () => showView('studio');
  document.getElementById('btnSettings').onclick = () => showView('settings');
  document.getElementById('btnAccount').onclick = () => { storageStats = null; showView('account'); };
  document.getElementById('btnNexCode').onclick = () => showView('nexcode');
  document.getElementById('btnDevices').onclick = () => { devicesSnap = null; showView('devices'); };
  document.getElementById('btnModelPill').onclick = openModelModal;
  document.getElementById('modelModal').onclick = (e) => { if (e.target.id === 'modelModal') document.getElementById('modelModal').hidden = true; };
  document.getElementById('btnPlus').onclick = (e) => { e.stopPropagation(); const m = document.getElementById('plusMenu'); renderPlusMenu(); m.hidden = !m.hidden; };
  document.addEventListener('click', () => { document.getElementById('plusMenu').hidden = true; });
  document.getElementById('btnSend').onclick = () => sendCurrent({ fromVoice: false });
  document.getElementById('btnMic').onclick = async () => {
    const active = await window.NexVoice.toggleManualRecord();
    document.getElementById('btnMic').classList.toggle('send-btn', active);
  };

  window.NexVoice.init({
    onTranscript: (text, meta) => {
      document.getElementById('btnMic').classList.remove('send-btn');
      const inp = document.getElementById('chatInput');
      inp.value = text;
      sendCurrent({ fromVoice: Boolean(meta?.fromVoice) });
    },
    onStatus: (msg) => {
      document.getElementById('statusText').textContent = msg;
    },
    onMicActive: (active) => {
      document.getElementById('btnMic').classList.toggle('send-btn', Boolean(active));
    },
    getLang: () => state?.lang || 'ru',
    isBusy: () => isBusy
  });
  document.getElementById('chatInput').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendCurrent(); } });

  window.nexApi.onStateChanged((next) => {
    state = next;
    genMode = next.lastGenMode || null;
    window.NexVoice.setWakeWordEnabled(Boolean(state.wakeWordEnabled));
    renderAll();
  });

  window.nexApi.onSphereState((data) => {
    sphereData = data;
    if (activeView === 'chat') {
      mainSphere.update(data.state, data.female);
      if (voiceModeActive) { if (vmSphereCtrl) vmSphereCtrl.update(data.state, Boolean(data.female)); const vmSt = document.getElementById('vmStatus'), vmTr = document.getElementById('vmTranscript'); if (vmSt && data.label) vmSt.textContent = data.label; if (vmTr && typeof data.transcript === 'string') vmTr.textContent = data.transcript; }
      document.getElementById('statusText').textContent = data.label || tr('ready');
      const lt = document.getElementById('liveTranscript');
      if (data.transcript) {
        lt.textContent = `«${data.transcript}»`;
        lt.hidden = false;
      } else {
        lt.textContent = '';
        lt.hidden = true;
      }
    }
  });

  window.nexApi.onDriveStatus((msg) => {
    driveLiveStatus = msg || '';
    if (activeView === 'account') renderAccount();
  });

  window.nexApi.onNexCodeUpdate((snap) => { nexCodeSnap = snap; if (activeView === 'nexcode') renderNexCode(); });

  window.nexApi.onConfirmation((pending) => {
    confirmation = pending;
    if (activeView === 'chat') renderChat();
    else if (activeView === 'nexcode') renderNexCode();
    else if (activeView === 'devices') renderDevices();
  });

  window.nexApi.onSpeakingState((speaking) => {
    window.NexVoice.setSpeaking(speaking);
  });

  window.nexApi.onStopSpeaking(() => {
    stopRendererAudio();
    window.NexVoice.setSpeaking(false);
  });

  window.nexApi.onSpeakPayload((payload) => {
    stopRendererAudio();
    if (!payload) { window.nexApi.speechFinished(); return; }
    window.NexVoice.setSpeaking(true);

    if (payload.mode === 'audio' && payload.base64) {
      const audio = new Audio(`data:${payload.mimeType || 'audio/wav'};base64,${payload.base64}`);
      currentAudioEl = audio;
      const done = () => {
        if (currentAudioEl === audio) currentAudioEl = null;
        window.NexVoice.setSpeaking(false);
        window.nexApi.speechFinished();
      };
      audio.onended = done;
      audio.onerror = done;
      audio.play().catch(done);
      return;
    }

    if (payload.mode === 'webspeech' && payload.text && window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(payload.text.slice(0, 1400));
      u.lang = payload.lang === 'en' ? 'en-US' : 'ru-RU';
      u.rate = Number(payload.rate) || 1.0;
      u.pitch = payload.voice === 'f' ? 1.15 : payload.voice === 'n' ? 1.0 : 0.88;
      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        window.NexVoice.setSpeaking(false);
        window.nexApi.speechFinished();
      };
      u.onend = done;
      u.onerror = done;
      window.speechSynthesis.speak(u);
      return;
    }

    window.NexVoice.setSpeaking(false);
    window.nexApi.speechFinished();
  });

  window.nexApi.onSpeakText(({ text, lang, voice, rate }) => {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[#*_`]+/g, ' ').slice(0, 1200));
    u.lang = lang === 'en' ? 'en-US' : 'ru-RU';
    u.rate = Number(rate) || 1.0;
    u.pitch = voice === 'f' ? 1.15 : voice === 'n' ? 1.0 : 0.88;
    window.speechSynthesis.speak(u);
  });

  window.nexApi.getBootstrap().then((boot) => {
    constants = boot.constants;
    state = boot.state;
    genMode = state.lastGenMode || null;
    sphereData = boot.sphere;
    confirmation = boot.confirmation;
    renderAll();
    if (state.wakeWordEnabled) window.NexVoice.setWakeWordEnabled(true);
    if (!state.onboarded) {
      onbStep = 0;
      openOnboarding();
    }
  });
})();
