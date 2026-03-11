// Управление каналами

function renderChannelsList(searchTerm = '') {
    let db = loadDB();
    let channels = db.channels || [];
    let filtered = channels.filter(ch => 
        ch.subscribers && ch.subscribers.includes(app.currentUser.phone) &&
        (ch.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
         (ch.username && ch.username.toLowerCase().includes(searchTerm.toLowerCase())))
    );
    app.elements.channelsListEl.innerHTML = '';
    if (!filtered.length) {
        app.elements.channelsListEl.innerHTML = '<div style="padding:20px;text-align:center;color:#8e9aa6;">Нет каналов</div>';
        return;
    }
    filtered.forEach(ch => {
        let div = document.createElement('div');
        div.className = `channel-item ${ch.id === app.currentContactId ? 'active' : ''}`;
        let badges = '';
        if (ch.badges?.purple) badges += '<span class="verified purple">✓</span>';
        if (ch.badges?.red) badges += '<span class="verified red">✓</span>';
        div.innerHTML = `
            <div class="channel-avatar">${ch.avatar ? `<img src="${ch.avatar}">` : '📢'}</div>
            <div class="channel-info">
                <div class="channel-name">${ch.name} ${badges}</div>
                <div class="channel-subscribers">${ch.subscribers ? ch.subscribers.length : 0} подписчиков</div>
                ${ch.username ? `<div class="channel-username">@${ch.username}</div>` : ''}
            </div>
        `;
        div.onclick = () => switchChannelView(ch.id);
        app.elements.channelsListEl.appendChild(div);
    });
}

function switchChannelView(chId) {
    if (app.unsubscribeMessages && app.unsubscribeMessages.unsubscribe) app.unsubscribeMessages.unsubscribe();
    if (app.unsubscribeTyping && app.unsubscribeTyping.unsubscribe) app.unsubscribeTyping.unsubscribe();
    if (app.unsubscribeMessageUpdates && app.unsubscribeMessageUpdates.unsubscribe) app.unsubscribeMessageUpdates.unsubscribe();

    app.currentContactId = String(chId);
    app.messagesOffset = 0;
    app.hasMoreMessages = true;
    renderChannelsList(app.elements.channelSearchInput.value);
    let db = loadDB();
    let ch = db.channels.find(c => c.id == chId);
    if (!ch) return;
    let badges = '';
    if (ch.badges?.purple) badges += '<span class="verified purple">✓</span>';
    if (ch.badges?.red) badges += '<span class="verified red">✓</span>';
    app.elements.chatHeaderTitle.innerHTML = `${ch.name} ${badges}`;
    app.elements.chatHeaderSubtitle.textContent = `${ch.subscribers ? ch.subscribers.length : 0} подписчиков`;
    app.elements.chatHeaderActions.innerHTML = '';
    let isAdmin = ch.createdBy === app.currentUser.phone;
    if (!isAdmin) {
        let btn = document.createElement('button');
        btn.textContent = 'Отписаться';
        btn.onclick = () => {
            let idx = ch.subscribers.indexOf(app.currentUser.phone);
            if (idx !== -1) ch.subscribers.splice(idx, 1);
            let db = loadDB();
            let index = db.channels.findIndex(c => c.id == ch.id);
            if (index !== -1) {
                db.channels[index].subscribers = ch.subscribers;
                saveDB(db);
            }
            renderChannelsList();
            clearChatArea();
        };
        app.elements.chatHeaderActions.appendChild(btn);
    } else {
        let settingsBtn = document.createElement('button');
        settingsBtn.textContent = '⚙️ Настройки';
        settingsBtn.onclick = () => {
            app.elements.channelSettingsName.value = ch.name;
            app.elements.channelSettingsUsername.value = ch.username || '';
            app.elements.channelSettingsModal.style.display = 'flex';
            window.currentChannelForSettings = ch.id;
        };
        app.elements.chatHeaderActions.appendChild(settingsBtn);
    }
    loadMessages(chId, false);
    if (isAdmin) {
        app.elements.chatInput.style.display = 'flex';
        app.elements.messageInput.disabled = false;
        app.elements.sendButton.disabled = false;
    } else {
        app.elements.chatInput.style.display = 'none';
    }
}

// Инициализация обработчиков каналов
function initChannels() {
    app.elements.channelSearchInput.addEventListener('input', (e) => {
        renderChannelsList(e.target.value);
    });

    app.elements.createChannelBtn.addEventListener('click', () => {
        app.elements.createChannelModal.style.display = 'flex';
    });

    app.elements.confirmCreateChannel.addEventListener('click', () => {
        let name = app.elements.channelNameInput.value.trim();
        let username = app.elements.channelUsernameInput.value.trim().toLowerCase();
        if (!name) return;

        let db = loadDB();
        if (username && db.channels.find(c => c.username === username)) {
            alert('Этот @юзернейм уже занят');
            return;
        }

        if (app.elements.channelAvatarInput.files[0]) {
            let reader = new FileReader();
            reader.onload = ev => {
                let avatar = ev.target.result;
                finishCreate(name, username, avatar);
            };
            reader.readAsDataURL(app.elements.channelAvatarInput.files[0]);
        } else {
            finishCreate(name, username, null);
        }
    });

    app.elements.cancelCreateChannel.addEventListener('click', () => {
        app.elements.createChannelModal.style.display = 'none';
        app.elements.channelNameInput.value = '';
        app.elements.channelUsernameInput.value = '';
    });

    app.elements.saveChannelSettings.addEventListener('click', () => {
        let chId = window.currentChannelForSettings;
        if (!chId) return;
        let name = app.elements.channelSettingsName.value.trim();
        let username = app.elements.channelSettingsUsername.value.trim().toLowerCase();
        let avatar = null;
        if (app.elements.channelSettingsAvatarInput.files[0]) {
            let reader = new FileReader();
            reader.onload = ev => {
                avatar = ev.target.result;
                updateChannel(chId, name, username, avatar);
            };
            reader.readAsDataURL(app.elements.channelSettingsAvatarInput.files[0]);
        } else {
            updateChannel(chId, name, username, null);
        }
    });

    app.elements.closeChannelSettings.addEventListener('click', () => {
        app.elements.channelSettingsModal.style.display = 'none';
    });

    app.elements.deleteChannelBtn.addEventListener('click', () => {
        let chId = window.currentChannelForSettings;
        if (!chId) return;
        if (!confirm('Вы уверены, что хотите удалить этот канал? Это действие необратимо.')) return;
        let db = loadDB();
        db.channels = db.channels.filter(c => c.id != chId);
        saveDB(db);
        app.elements.channelSettingsModal.style.display = 'none';
        initMode('channels');
        clearChatArea();
    });

    // Кнопка "Все каналы"
    let allChannelsBtn = document.getElementById('showAllChannelsBtn');
    if (!allChannelsBtn) {
        allChannelsBtn = document.createElement('button');
        allChannelsBtn.id = 'showAllChannelsBtn';
        allChannelsBtn.textContent = '📢 Все каналы';
        allChannelsBtn.style.margin = '10px';
        allChannelsBtn.style.padding = '10px';
        allChannelsBtn.style.width = 'calc(100% - 20px)';
        allChannelsBtn.style.border = 'none';
        allChannelsBtn.style.borderRadius = '20px';
        allChannelsBtn.style.background = '#2b5278';
        allChannelsBtn.style.color = '#fff';
        allChannelsBtn.style.cursor = 'pointer';
        app.elements.channelActions.appendChild(allChannelsBtn);
    }

    allChannelsBtn.addEventListener('click', () => {
        let db = loadDB();
        let allChannels = db.channels;
        app.elements.allChannelsList.innerHTML = '';
        allChannels.forEach(ch => {
            let div = document.createElement('div');
            div.style.padding = '10px'; div.style.borderBottom = '1px solid #2b3945';
            let isSub = ch.subscribers && ch.subscribers.includes(app.currentUser.phone);
            div.innerHTML = `
                <strong>${ch.name}</strong> (${ch.subscribers ? ch.subscribers.length : 0} подписчиков)<br>
                <small>Создатель: ${ch.createdBy ? ch.createdBy.slice(0,5) + '...' : 'неизвестно'}</small>
            `;
            let btn = document.createElement('button');
            btn.textContent = isSub ? '✓ Подписан' : 'Подписаться';
            btn.disabled = isSub;
            btn.onclick = () => {
                if (!isSub) {
                    if (!ch.subscribers) ch.subscribers = [];
                    ch.subscribers.push(app.currentUser.phone);
                    let db = loadDB();
                    let index = db.channels.findIndex(c => c.id == ch.id);
                    if (index !== -1) {
                        db.channels[index].subscribers = ch.subscribers;
                        saveDB(db);
                    }
                    btn.disabled = true;
                    btn.textContent = '✓ Подписан';
                    renderChannelsList();
                }
            };
            div.appendChild(btn);
            app.elements.allChannelsList.appendChild(div);
        });
        app.elements.allChannelsModal.style.display = 'flex';
    });

    app.elements.closeAllChannelsModal.addEventListener('click', () => {
        app.elements.allChannelsModal.style.display = 'none';
    });
}

function finishCreate(name, username, avatar) {
    let newCh = {
        id: Date.now() + Math.random(),
        name,
        username,
        avatar,
        createdBy: app.currentUser.phone,
        subscribers: [app.currentUser.phone],
        badges: {}
    };
    let db = loadDB();
    db.channels.push(newCh);
    saveDB(db);
    app.elements.channelNameInput.value = '';
    app.elements.channelUsernameInput.value = '';
    app.elements.channelAvatarInput.value = '';
    app.elements.createChannelModal.style.display = 'none';
    initMode('channels');
    switchChannelView(newCh.id);
}

function updateChannel(chId, name, username, avatar) {
    let db = loadDB();
    let index = db.channels.findIndex(c => c.id == chId);
    if (index !== -1) {
        if (name) db.channels[index].name = name;
        db.channels[index].username = username || null;
        if (avatar) db.channels[index].avatar = avatar;
        saveDB(db);
    }
    app.elements.channelSettingsModal.style.display = 'none';
    renderChannelsList();
    switchChannelView(chId);
}

window.renderChannelsList = renderChannelsList;
window.switchChannelView = switchChannelView;
window.initChannels = initChannels;
