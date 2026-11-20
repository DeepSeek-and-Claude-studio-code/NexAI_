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
      settings: 'viewSettings',
      account: 'viewAccount'
    };
    Object.entries(map).forEach(([k, id]) => {
      document.getElementById(id).hidden = k !== v;
    });
    renderAll();
  }

  function renderSidebar() {
    document.getElementById('btnNewChat').textContent = tr('new_chat');
    document.getElementById('btnProjects').textContent = tr('projects');
    document.getElementById('btnArtifacts').textContent = tr('artifacts');
    document.getElementById('btnStudio').textContent = tr('studio');
    document.getElementById('btnNexCode').textContent = tr('nex_code');
    document.getElementById('lblChats').textContent = tr('chats');
    document.getElementById('btnSettings').textContent = tr('settings');
    const accLabel = state.userName || state.account?.displayName || state.account?.email || tr('account');
    document.getElementById('sbAccLabel').textContent = accLabel;
    document.getElementById('sbAvatar').textContent = (accLabel.trim()[0] || 'Я').toUpperCase();

    const list = document.getElementById('chatList');
    list.innerHTML = '';
    for (const c of state.chats) {
      const row = el('div', 'chat-row' + (c.id === state.activeChatId ? ' active' : ''));
      const btn = el('button', 'c-title', c.title);
      btn.onclick = async () => { await window.nexApi.openChat(c.id); showView('chat'); };
      const del = el('button', 'c-del', '×');
      del.onclick = async (e) => { e.stopPropagation(); await window.nexApi.deleteChat(c.id); };
      row.appendChild(btn); row.appendChild(del);
      list.appendChild(row);
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
      settings: tr('settings'),
      account: tr('account')
    };
    document.getElementById('topTitle').textContent = titles[activeView] || agentName();
    document.getElementById('btnModelPill').textContent = currentModelPillText();
    document.getElementById('btnModelPill').hidden = activeView !== 'chat';
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
    for (const m of (chat?.messages || [])) {
      const bubble = el('div', `msg ${m.role}`);
      if (m.text) bubble.appendChild(document.createTextNode(m.text));
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
    }

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

    for (const p of state.projects) {
      const card = el('div', 'card-box');
      const head = el('div', 'flex-row'); head.style.justifyContent = 'space-between';
      const titleBtn = el('button', 'sb-btn', p.name); titleBtn.style.fontWeight = '700';
      titleBtn.onclick = async () => { await window.nexApi.newChat(p.id); showView('chat'); };
      const fBtn = el('button', 'pill-btn small', p.folderPath ? tr('change_folder') : tr('choose_folder'));
      fBtn.onclick = () => window.nexApi.pickProjectFolder(p.id);
      head.appendChild(titleBtn); head.appendChild(fBtn);
      card.appendChild(head);
      card.appendChild(el('small', '', p.folderPath || tr('no_folder')));
      root.appendChild(card);
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
    const bEdit = el('button', 'pill-btn small' + (artifactMode === 'edit' ? ' active' : ''), `${tr('edit')} / ${tr('code')}`);
    bEdit.onclick = () => { artifactMode = 'edit'; renderArtifactDetail(); };
    const spacer = el('span'); spacer.style.flex = '1';
    const bCopy = el('button', 'pill-btn small', tr('copy'));
    bCopy.onclick = () => { navigator.clipboard.writeText(art.content); bCopy.textContent = tr('copied'); };
    const bExp = el('button', 'pill-btn small', tr('export_btn'));
    bExp.onclick = () => window.nexApi.exportArtifact(art.id);
    const bDel = el('button', 'pill-btn small', tr('del_btn'));
    bDel.onclick = async () => { await window.nexApi.deleteArtifact(art.id); showView('artifacts'); };
    bar.appendChild(bView); bar.appendChild(bEdit); bar.appendChild(spacer); bar.appendChild(bCopy); bar.appendChild(bExp); bar.appendChild(bDel);
    root.appendChild(bar);

    if (artifactMode === 'edit') {
      const titleInp = el('input'); titleInp.type = 'text'; titleInp.value = art.title; titleInp.style.marginBottom = '10px';
      const ta = el('textarea'); ta.value = art.content;
      ta.style.cssText = 'width:100%;height:420px;font-family:ui-monospace,monospace;font-size:13px;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:12px;padding:12px;';
      let tmr = null;
      const saveLive = () => { clearTimeout(tmr); tmr = setTimeout(() => window.nexApi.updateArtifact(art.id, ta.value, titleInp.value), 350); };
      titleInp.oninput = saveLive;
      ta.oninput = saveLive;
      root.appendChild(titleInp);
      root.appendChild(ta);
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
      root.appendChild(el('p', 'sub', tr('keys_note')));
      for (const p of constants.PROVIDERS) {
        const st = state.apiKeyStatus[p];
        root.appendChild(el('label', 'field-label', `${p} API Key ${st?.set ? '(' + st.masked + ')' : ''}`));
        const row = el('div', 'flex-row');
        const inp = el('input'); inp.type = 'password'; inp.placeholder = st?.set ? '•••••••• (enter to replace)' : `Paste ${p} key`;
        const saveBtn = el('button', 'btn outline', 'OK');
        saveBtn.onclick = () => window.nexApi.setApiKey(p, inp.value);
        row.appendChild(inp); row.appendChild(saveBtn);
        root.appendChild(row);
      }
      const refRow = el('div', 'flex-row'); refRow.style.marginTop = '16px';
      const refBtn = el('button', 'btn outline', tr('refresh_models'));
      const refMsg = el('small', '');
      refBtn.onclick = async () => {
        refMsg.textContent = '…';
        const r = await window.nexApi.refreshModels();
        refMsg.textContent = r.updated ? `Updated: ${r.updated}` : 'No active keys';
      };
      refRow.appendChild(refBtn); refRow.appendChild(refMsg);
      root.appendChild(refRow);
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
    } else if (activeSettingsTab === 'memory') {
      switchRow(root, tr('mem_auto'), '', state.memoryAutoSave, (v) => window.nexApi.updateSettings({ memoryAutoSave: v }));
      if (!state.memories.length) root.appendChild(el('p', 'sub', tr('mem_empty')));
      else {
        state.memories.forEach((m, idx) => {
          const r = el('div', 'row-item'); r.appendChild(el('span', '', m));
          const del = el('button', 'btn outline', '×'); del.onclick = () => window.nexApi.removeMemory(idx);
          r.appendChild(del); root.appendChild(r);
        });
      }
      const addR = el('div', 'flex-row'); addR.style.marginTop = '12px';
      const inp = el('input'); inp.type = 'text'; inp.placeholder = tr('add_mem');
      const bAdd = el('button', 'btn', tr('add'));
      bAdd.onclick = () => { if (inp.value.trim()) { window.nexApi.addMemory(inp.value); inp.value = ''; } };
      const bClr = el('button', 'btn danger', tr('clear'));
      bClr.onclick = () => window.nexApi.clearMemories();
      addR.appendChild(inp); addR.appendChild(bAdd); addR.appendChild(bClr);
      root.appendChild(addR);
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

    // Google Drive Full File Storage & Auto-Sync
    const syncCard = el('div', 'card-box');
    syncCard.appendChild(el('h3', '', state.lang === 'en' ? 'Google Drive File Storage (All Files)' : 'Хранение всех файлов на Google Диске'));
    syncCard.appendChild(el('p', 'sub', state.lang === 'en'
      ? 'Saves all chats, encrypted API keys, settings, last model, photos, videos, artifacts and attachments directly to your Google Drive (Nex/ folder).'
      : 'Сохраняет на твой Google Диск все чаты, зашифрованные ключи, настройки, последнюю модель, фото, видео, артефакты и вложения (папка Nex/).'
    ));
    const passInp = el('input'); passInp.type = 'password';
    passInp.placeholder = acc.hasDrivePassphrase ? '•••••••• (' + tr('sync_pass') + ')' : tr('sync_pass');
    passInp.style.marginBottom = '10px';
    passInp.onchange = () => { if (passInp.value.trim()) window.nexApi.setDrivePassphrase(passInp.value.trim()); };
    syncCard.appendChild(passInp);
    const syncStatus = el('p', 'sub', driveLiveStatus);
    syncStatus.style.color = 'var(--ok)';

    if (acc.driveConnected) {
      switchRow(syncCard, tr('drive_auto'), tr('drive_auto_d'), acc.driveAutoSync, (v) => window.nexApi.updateSettings({ driveAutoSync: v }));
      const modeTabs = el('div', 'tabs-row'); modeTabs.style.marginTop = '10px';
      [['visible', tr('drive_vis')], ['hidden', tr('drive_hid')]].forEach(([m, lbl]) => {
        const b = el('button', 'pill-btn small' + (acc.driveFolderMode === m ? ' active' : ''), lbl);
        b.onclick = () => window.nexApi.updateSettings({ driveFolderMode: m });
        modeTabs.appendChild(b);
      });
      syncCard.appendChild(modeTabs);

      const gRow = el('div', 'flex-row'); gRow.style.marginBottom = '10px';
      const bUp = el('button', 'btn', tr('sync_up'));
      bUp.onclick = async () => {
        syncStatus.textContent = '…';
        const r = await window.nexApi.syncDriveUpload(passInp.value);
        if (r.ok) {
          const rep = r.report || {};
          syncStatus.textContent = state.lang === 'en'
            ? `Saved to Google Drive (${rep.folderMode === 'visible' ? 'Nex/' : 'appDataFolder'}): uploaded ${rep.uploadedFiles}, unchanged ${rep.skippedFiles}.`
            : `Сохранено на Google Диск (${rep.folderMode === 'visible' ? 'Nex/' : 'appDataFolder'}): загружено ${rep.uploadedFiles}, без изменений ${rep.skippedFiles}.`;
        } else syncStatus.textContent = 'Error: ' + r.error;
      };
      const bDn = el('button', 'btn outline', tr('sync_down'));
      bDn.onclick = async () => {
        syncStatus.textContent = '…';
        const r = await window.nexApi.syncDriveDownload(passInp.value);
        if (r.ok) {
          const rep = r.report || {};
          syncStatus.textContent = state.lang === 'en'
            ? `Restored from Google Drive: downloaded ${rep.downloadedFiles}, already local ${rep.skippedFiles}.`
            : `Загружено с Google Диска: скачано ${rep.downloadedFiles}, уже локально ${rep.skippedFiles}.`;
        } else syncStatus.textContent = 'Error: ' + r.error;
      };
      gRow.appendChild(bUp); gRow.appendChild(bDn);
      syncCard.appendChild(gRow);
    } else {
      const iCid = el('input'); iCid.type = 'text'; iCid.value = acc.googleClientId || '';
      iCid.placeholder = 'Google Cloud Desktop OAuth Client ID'; iCid.style.marginBottom = '8px';
      const bLink = el('button', 'btn', tr('link_drive')); bLink.style.marginBottom = '10px';
      bLink.onclick = async () => {
        syncStatus.textContent = state.lang === 'en' ? 'Opening Google Drive authorization…' : 'Открываю авторизацию Google Диска…';
        const r = await window.nexApi.signInGoogle(iCid.value, Boolean(acc.isSignedIn));
        syncStatus.textContent = r.ok ? 'Google Drive connected!' : 'Error: ' + r.error;
      };
      syncCard.appendChild(iCid); syncCard.appendChild(bLink);
    }

    const vRow = el('div', 'flex-row');
    const bExp = el('button', 'btn outline', tr('vault_exp'));
    bExp.onclick = async () => {
      const r = await window.nexApi.exportVault(passInp.value);
      if (!r.canceled) syncStatus.textContent = r.ok ? `Saved: ${r.filePath}` : 'Error: ' + r.error;
    };
    const bImp = el('button', 'btn outline', tr('vault_imp'));
    bImp.onclick = async () => {
      const r = await window.nexApi.importVault(passInp.value);
      if (!r.canceled) syncStatus.textContent = r.ok ? 'Restored!' : 'Error: ' + r.error;
    };
    vRow.appendChild(bExp); vRow.appendChild(bImp);
    syncCard.appendChild(vRow);
    syncCard.appendChild(syncStatus);
    root.appendChild(syncCard);
  }

  function openModelModal() {
    const modal = document.getElementById('modelModal');
    const body = document.getElementById('modelModalBody');
    body.innerHTML = '';
    modal.hidden = false;

    const keys = {};
    for (const p of constants.PROVIDERS) keys[p] = state.apiKeyStatus[p]?.set;

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
    else if (activeView === 'projects') renderProjects();
    else if (activeView === 'artifacts') renderArtifactsLib();
    else if (activeView === 'artifactDetail') renderArtifactDetail();
    else if (activeView === 'studio') renderStudio();
    else if (activeView === 'settings') renderSettings();
    else if (activeView === 'account') renderAccount();
  }

  async function sendCurrent() {
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
      await window.nexApi.sendMessage({ text, attachments: toSendAtts, genMode });
    } finally {
      isBusy = false;
      renderAll();
    }
  }

  document.getElementById('btnToggleSb').onclick = () => document.getElementById('sidebar').classList.toggle('collapsed');
  document.getElementById('btnToggleComp').onclick = () => window.nexApi.toggleCompanion();
  document.getElementById('btnNewChat').onclick = async () => { await window.nexApi.newChat(null); showView('chat'); };
  document.getElementById('btnProjects').onclick = () => showView('projects');
  document.getElementById('btnArtifacts').onclick = () => showView('artifacts');
  document.getElementById('btnStudio').onclick = () => showView('studio');
  document.getElementById('btnSettings').onclick = () => showView('settings');
  document.getElementById('btnAccount').onclick = () => showView('account');
  document.getElementById('btnNexCode').onclick = () => window.nexApi.openNexCode();
  document.getElementById('btnModelPill').onclick = openModelModal;
  document.getElementById('modelModal').onclick = (e) => { if (e.target.id === 'modelModal') document.getElementById('modelModal').hidden = true; };
  document.getElementById('btnPlus').onclick = (e) => { e.stopPropagation(); const m = document.getElementById('plusMenu'); renderPlusMenu(); m.hidden = !m.hidden; };
  document.addEventListener('click', () => { document.getElementById('plusMenu').hidden = true; });
  document.getElementById('btnSend').onclick = sendCurrent;
  document.getElementById('btnMic').onclick = async () => {
    const active = await window.NexVoice.toggleManualRecord();
    document.getElementById('btnMic').classList.toggle('send-btn', active);
  };

  window.NexVoice.init({
    onTranscript: (text) => {
      document.getElementById('btnMic').classList.remove('send-btn');
      const inp = document.getElementById('chatInput');
      inp.value = text;
      sendCurrent();
    },
    onStatus: (msg) => {
      document.getElementById('statusText').textContent = msg;
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
      document.getElementById('statusText').textContent = data.label || tr('ready');
    }
  });

  window.nexApi.onDriveStatus((msg) => {
    driveLiveStatus = msg || '';
    if (activeView === 'account') renderAccount();
  });

  window.nexApi.onConfirmation((pending) => {
    confirmation = pending;
    if (activeView === 'chat') renderChat();
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
