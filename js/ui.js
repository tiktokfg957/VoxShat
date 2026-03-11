// ui.js - функции для управления интерфейсом, переключения режимов, рендеринга

// Переключение режимов (Чаты, Каналы, Друзья, Профиль, Настройки)
function initMode(mode) {
    app.currentMode = mode;
    [app.elements.chatsModeBtn, app.elements.channelsModeBtn, app.elements.friendsModeBtn, app.elements.profileModeBtn, app.elements.settingsModeBtn].forEach(b => b.classList.remove('active'));
    app.elements.contactsListEl.style.display = 'none';
    app.elements.channelsListEl.style.display = 'none';
    app.elements.friendsView.style.display = 'none';
    app.elements.profileView.style.display = 'none';
    app.elements.settingsView.style.display = 'none';
    app.elements.channelActions.style.display = 'none';

    if (mode === 'chats') {
        app.elements.chatsModeBtn.classList.add('active');
        app.elements.contactsListEl.style.display = 'block';
        renderContacts();
        if (!app.currentContactId || app.currentContactId === '') {
            if (app.currentUser && app.currentUser.friends && app.currentUser.friends.list.length > 0) {
                switchContact(app.currentUser.friends.list[0]);
            } else {
                clearChatArea();
                app.elements.chatHeaderTitle.textContent = 'Нет чатов';
                app.elements.chatHeaderSubtitle.textContent = 'Добавьте друзей, чтобы начать общение';
            }
        }
    } else if (mode === 'channels') {
        app.elements.channelsModeBtn.classList.add('active');
        app.elements.channelsListEl.style.display = 'block';
        app.elements.channelActions.style.display = 'flex';
        renderChannelsList();
        clearChatArea();
    } else if (mode === 'friends') {
        app.elements.friendsModeBtn.classList.add('active');
        app.elements.friendsView.style.display = 'block';
        ensureFriends(app.currentUser);
        renderFriendsView();
        clearChatArea();
    } else if (mode === 'profile') {
        app.elements.profileModeBtn.classList.add('active');
        app.elements.profileView.style.display = 'flex';
        loadProfileToForm();
        updatePremiumUI();
        clearChatArea();
    } else if (mode === 'settings') {
        app.elements.settingsModeBtn.classList.add('active');
        app.elements.settingsView.style.display = 'flex';
        updateStats();
        clearChatArea();
    }
}

// Контакты (список друзей)
function renderContacts() {
    app.elements.contactsListEl.innerHTML = '';

    if (app.currentUser && app.currentUser.friends && app.currentUser.friends.list) {
        const friendPhones = [...new Set(app.currentUser.friends.list)];
        if (friendPhones.length === 0) {
            app.elements.contactsListEl.innerHTML = '<div style="padding:20px;text-align:center;color:#8e9aa6;">Нет друзей</div>';
            return;
        }
        let db = loadDB();
        let friendsData = db.users.filter(u => friendPhones.includes(u.phone));
        friendsData.forEach(f => app.friendsCache.set(f.phone, f));

        for (let friendPhone of friendPhones) {
            let friend = app.friendsCache.get(friendPhone);
            if (!friend) continue;
            let div = document.createElement('div');
            div.className = `contact ${app.currentContactId === friendPhone ? 'active' : ''}`;
            let avatar = friend.avatar ? `<img src="${friend.avatar}">` : '👤';
            let badges = '';
            if (friend.badges?.blue) badges += '<span class="verified blue">✓</span>';
            if (friend.badges?.red) badges += '<span class="verified red">✓</span>';
            let status = 'онлайн';
            if (friend.last_seen) {
                let diff = Date.now() - new Date(friend.last_seen).getTime();
                if (diff > 120000) {
                    let date = new Date(friend.last_seen);
                    status = 'был ' + date.toLocaleTimeString().slice(0,5);
                }
            }
            div.innerHTML = `
                <div class="contact-avatar">${avatar}</div>
                <div class="contact-info">
                    <div class="contact-name">${friend.name || friend.username || friendPhone} ${badges}</div>
                    <div class="contact-status">${status}</div>
                </div>
            `;
            div.onclick = () => switchContact(friendPhone);
            app.elements.contactsListEl.appendChild(div);
        }
    }
}

function switchContact(id) {
    if (app.unsubscribeMessages && app.unsubscribeMessages.unsubscribe) app.unsubscribeMessages.unsubscribe();
    if (app.unsubscribeTyping && app.unsubscribeTyping.unsubscribe) app.unsubscribeTyping.unsubscribe();
    if (app.unsubscribeMessageUpdates && app.unsubscribeMessageUpdates.unsubscribe) app.unsubscribeMessageUpdates.unsubscribe();

    app.currentContactId = id;
    renderContacts();
    app.messagesOffset = 0;
    app.hasMoreMessages = true;

    const friend = app.friendsCache.get(id) || findUserByPhone(id);
    if (friend) {
        let badges = '';
        if (friend.badges?.blue) badges += '<span class="verified blue">✓</span>';
        if (friend.badges?.red) badges += '<span class="verified red">✓</span>';
        app.elements.chatHeaderTitle.innerHTML = `${friend.name || friend.username || id} ${badges}`;
        let status = 'онлайн';
        if (friend.last_seen) {
            let diff = Date.now() - new Date(friend.last_seen).getTime();
            if (diff > 120000) {
                let date = new Date(friend.last_seen);
                status = 'был ' + date.toLocaleTimeString().slice(0,5);
            }
        }
        app.elements.chatHeaderSubtitle.textContent = status;
    } else {
        let db = loadDB();
        let friendData = db.users.find(u => u.phone === id);
        if (friendData) {
            app.friendsCache.set(id, friendData);
            let badges = '';
            if (friendData.badges?.blue) badges += '<span class="verified blue">✓</span>';
            if (friendData.badges?.red) badges += '<span class="verified red">✓</span>';
            app.elements.chatHeaderTitle.innerHTML = `${friendData.name || friendData.username || id} ${badges}`;
            let status = 'онлайн';
            if (friendData.last_seen) {
                let diff = Date.now() - new Date(friendData.last_seen).getTime();
                if (diff > 120000) {
                    let date = new Date(friendData.last_seen);
                    status = 'был ' + date.toLocaleTimeString().slice(0,5);
                }
            }
            app.elements.chatHeaderSubtitle.textContent = status;
        }
    }
    app.elements.typingIndicator.textContent = '';
    loadMessages(getChatId(id), false);
    app.elements.chatHeaderActions.innerHTML = '';
    app.elements.chatInput.style.display = 'flex';
    app.elements.messageInput.disabled = false;
    app.elements.sendButton.disabled = false;
}

// Обработчики переключения режимов (привязываем в initUI)
function initUI() {
    app.elements.chatsModeBtn.onclick = () => initMode('chats');
    app.elements.channelsModeBtn.onclick = () => initMode('channels');
    app.elements.friendsModeBtn.onclick = () => initMode('friends');
    app.elements.profileModeBtn.onclick = () => initMode('profile');
    app.elements.settingsModeBtn.onclick = () => initMode('settings');
}

// Экспортируем в глобальную область
window.initMode = initMode;
window.renderContacts = renderContacts;
window.switchContact = switchContact;
window.initUI = initUI;
