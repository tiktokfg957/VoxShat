// Работа с друзьями

function renderFriendsView() {
    ensureFriends(app.currentUser);
    const friendsView = app.elements.friendsView;
    friendsView.innerHTML = '';

    let addBtn = document.createElement('button');
    addBtn.textContent = '➕ Добавить друга';
    addBtn.style.margin = '10px';
    addBtn.style.padding = '10px';
    addBtn.style.width = 'calc(100% - 20px)';
    addBtn.style.border = 'none';
    addBtn.style.borderRadius = '20px';
    addBtn.style.background = '#3390ec';
    addBtn.style.color = '#fff';
    addBtn.style.cursor = 'pointer';
    addBtn.onclick = () => {
        app.elements.addFriendModal.style.display = 'flex';
        app.elements.friendSearchResult.innerHTML = '';
    };
    friendsView.appendChild(addBtn);

    // Мои друзья
    let friendsSection = document.createElement('div');
    friendsSection.className = 'friend-section';
    friendsSection.innerHTML = '<h3>Мои друзья</h3>';
    if (app.currentUser.friends.list.length === 0) {
        friendsSection.innerHTML += '<p style="color:#8e9aa6;">Список пуст</p>';
    } else {
        const uniquePhones = [...new Set(app.currentUser.friends.list)];
        let db = loadDB();
        let friendsData = db.users.filter(u => uniquePhones.includes(u.phone));
        friendsData.forEach(f => app.friendsCache.set(f.phone, f));
        uniquePhones.forEach(phone => {
            let friend = app.friendsCache.get(phone);
            if (!friend) return;
            let div = document.createElement('div');
            div.className = 'friend-item';
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
                <div class="friend-avatar">${friend.avatar ? `<img src="${friend.avatar}">` : '👤'}</div>
                <div class="friend-info">
                    <div class="friend-name">${friend.name || friend.username || phone} ${badges}</div>
                    <div class="friend-status">${status}</div>
                </div>
                <button class="msg-btn" style="padding:5px 10px;background:#3390ec;border:none;border-radius:12px;color:#fff;">💬</button>
            `;
            div.querySelector('.msg-btn').onclick = (e) => {
                e.stopPropagation();
                initMode('chats');
                switchContact(phone);
            };
            friendsSection.appendChild(div);
        });
    }
    friendsView.appendChild(friendsSection);

    // Входящие заявки
    let incomingSection = document.createElement('div');
    incomingSection.className = 'friend-section';
    incomingSection.innerHTML = '<h3>Входящие заявки</h3>';
    if (app.currentUser.friends.incoming.length === 0) {
        incomingSection.innerHTML += '<p style="color:#8e9aa6;">Нет входящих заявок</p>';
    } else {
        app.currentUser.friends.incoming.forEach(phone => {
            let db = loadDB();
            let user = db.users.find(u => u.phone === phone);
            if (!user) return;
            let div = document.createElement('div');
            div.className = 'friend-item';
            div.innerHTML = `
                <div class="friend-avatar">${user.avatar ? `<img src="${user.avatar}">` : '👤'}</div>
                <div class="friend-info">
                    <div class="friend-name">${user.name || user.username || phone}</div>
                    <div class="friend-status">@${user.username || 'нет'}</div>
                </div>
                <div style="display:flex;gap:5px;">
                    <button class="accept-btn" data-phone="${phone}" style="padding:5px 10px;background:#4caf50;border:none;border-radius:12px;color:#fff;">✓</button>
                    <button class="reject-btn" data-phone="${phone}" style="padding:5px 10px;background:#f44336;border:none;border-radius:12px;color:#fff;">✗</button>
                </div>
            `;
            div.querySelector('.accept-btn').onclick = (e) => {
                e.stopPropagation();
                acceptFriendRequest(phone);
            };
            div.querySelector('.reject-btn').onclick = (e) => {
                e.stopPropagation();
                rejectFriendRequest(phone);
            };
            incomingSection.appendChild(div);
        });
    }
    friendsView.appendChild(incomingSection);

    // Исходящие заявки
    let outgoingSection = document.createElement('div');
    outgoingSection.className = 'friend-section';
    outgoingSection.innerHTML = '<h3>Исходящие заявки</h3>';
    if (app.currentUser.friends.outgoing.length === 0) {
        outgoingSection.innerHTML += '<p style="color:#8e9aa6;">Нет исходящих заявок</p>';
    } else {
        app.currentUser.friends.outgoing.forEach(phone => {
            let db = loadDB();
            let user = db.users.find(u => u.phone === phone);
            if (!user) return;
            let div = document.createElement('div');
            div.className = 'friend-item';
            div.innerHTML = `
                <div class="friend-avatar">${user.avatar ? `<img src="${user.avatar}">` : '👤'}</div>
                <div class="friend-info">
                    <div class="friend-name">${user.name || user.username || phone}</div>
                    <div class="friend-status">ожидание</div>
                </div>
                <button class="cancel-btn" data-phone="${phone}" style="padding:5px 10px;background:#f44336;border:none;border-radius:12px;color:#fff;">Отменить</button>
            `;
            div.querySelector('.cancel-btn').onclick = (e) => {
                e.stopPropagation();
                cancelFriendRequest(phone);
            };
            outgoingSection.appendChild(div);
        });
    }
    friendsView.appendChild(outgoingSection);
}

// Поиск друга
app.elements.searchFriendBtn.addEventListener('click', () => {
    ensureFriends(app.currentUser);
    let username = app.elements.friendUsername.value.trim();
    if (username.startsWith('@')) username = username.slice(1);
    if (!username) {
        app.elements.friendSearchResult.innerHTML = '<p style="color:#ff9800;">Введите юзернейм</p>';
        return;
    }
    let foundUser = findUserByUsername(username);

    app.elements.friendSearchResult.innerHTML = '';
    if (!foundUser) {
        app.elements.friendSearchResult.innerHTML = '<p style="color:#f44336;">Пользователь не найден</p>';
        return;
    }
    if (foundUser.phone === app.currentUser.phone) {
        app.elements.friendSearchResult.innerHTML = '<p style="color:#f44336;">Это вы сами</p>';
        return;
    }
    if (app.currentUser.friends.list.includes(foundUser.phone)) {
        app.elements.friendSearchResult.innerHTML = '<p style="color:#4caf50;">Уже в друзьях</p>';
        return;
    }
    if (app.currentUser.friends.outgoing.includes(foundUser.phone)) {
        app.elements.friendSearchResult.innerHTML = '<p style="color:#ff9800;">Заявка уже отправлена</p>';
        return;
    }
    if (app.currentUser.friends.incoming.includes(foundUser.phone)) {
        app.elements.friendSearchResult.innerHTML = '<p style="color:#ff9800;">Этот пользователь отправил вам заявку. Примите её во входящих.</p>';
        return;
    }

    app.elements.addFriendModal.style.display = 'none';
    app.elements.friendUsername.value = '';
    showUserProfile(foundUser);
});

function showUserProfile(user) {
    let modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    let badges = '';
    if (user.badges?.blue) badges += '<span class="verified blue">✓</span>';
    if (user.badges?.red) badges += '<span class="verified red">✓</span>';
    modal.innerHTML = `
        <div class="modal-content" style="width:300px;">
            <div class="profile-avatar" style="margin:10px auto;">${user.avatar ? `<img src="${user.avatar}" style="width:100%;height:100%;">` : '👤'}</div>
            <h3>${user.name || user.username || user.phone} ${badges}</h3>
            <p>@${user.username || 'нет'}</p>
            <button id="sendFriendRequestFromProfileBtn" style="padding:10px;background:#3390ec;color:#fff;border:none;border-radius:20px;width:100%;margin-top:10px;">Отправить заявку</button>
            <button id="sendMessageFromProfileBtn" style="padding:10px;background:#4caf50;color:#fff;border:none;border-radius:20px;width:100%;margin-top:5px;">Отправить сообщение</button>
            <button id="closeProfileModalBtn" style="padding:10px;background:#f44336;color:#fff;border:none;border-radius:20px;width:100%;margin-top:5px;">Закрыть</button>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('sendFriendRequestFromProfileBtn').onclick = () => {
        sendFriendRequest(user.phone);
        document.body.removeChild(modal);
    };
    document.getElementById('sendMessageFromProfileBtn').onclick = () => {
        document.body.removeChild(modal);
        initMode('chats');
        switchContact(user.phone);
    };
    document.getElementById('closeProfileModalBtn').onclick = () => {
        document.body.removeChild(modal);
    };
}

function sendFriendRequest(targetPhone) {
    ensureFriends(app.currentUser);
    if (!app.currentUser.friends.outgoing.includes(targetPhone)) {
        app.currentUser.friends.outgoing.push(targetPhone);
    }
    let targetUser = findUserByPhone(targetPhone);
    if (targetUser) {
        ensureFriends(targetUser);
        if (!targetUser.friends.incoming.includes(app.currentUser.phone)) {
            targetUser.friends.incoming.push(app.currentUser.phone);
        }
        saveUser(targetUser);
    }
    saveUser(app.currentUser);
    renderFriendsView();
    alert('Заявка отправлена');
}

function acceptFriendRequest(phone) {
    ensureFriends(app.currentUser);
    app.currentUser.friends.incoming = app.currentUser.friends.incoming.filter(p => p !== phone);
    if (!app.currentUser.friends.list.includes(phone)) app.currentUser.friends.list.push(phone);
    let other = findUserByPhone(phone);
    if (other) {
        ensureFriends(other);
        other.friends.outgoing = other.friends.outgoing.filter(p => p !== app.currentUser.phone);
        if (!other.friends.list.includes(app.currentUser.phone)) other.friends.list.push(app.currentUser.phone);
        saveUser(other);
    }
    saveUser(app.currentUser);
    renderFriendsView();
    renderContacts();
    alert('Заявка принята');
}

function rejectFriendRequest(phone) {
    ensureFriends(app.currentUser);
    app.currentUser.friends.incoming = app.currentUser.friends.incoming.filter(p => p !== phone);
    let other = findUserByPhone(phone);
    if (other) {
        ensureFriends(other);
        other.friends.outgoing = other.friends.outgoing.filter(p => p !== app.currentUser.phone);
        saveUser(other);
    }
    saveUser(app.currentUser);
    renderFriendsView();
}

function cancelFriendRequest(phone) {
    ensureFriends(app.currentUser);
    app.currentUser.friends.outgoing = app.currentUser.friends.outgoing.filter(p => p !== phone);
    let other = findUserByPhone(phone);
    if (other) {
        ensureFriends(other);
        other.friends.incoming = other.friends.incoming.filter(p => p !== app.currentUser.phone);
        saveUser(other);
    }
    saveUser(app.currentUser);
    renderFriendsView();
}

app.elements.closeAddFriendModal.addEventListener('click', () => {
    app.elements.addFriendModal.style.display = 'none';
    app.elements.friendUsername.value = '';
    app.elements.friendSearchResult.innerHTML = '';
});

// Инициализация модуля друзей
function initFriends() {
    // Обработчики уже добавлены выше
}

window.renderFriendsView = renderFriendsView;
window.initFriends = initFriends;
window.sendFriendRequest = sendFriendRequest;
window.acceptFriendRequest = acceptFriendRequest;
window.rejectFriendRequest = rejectFriendRequest;
window.cancelFriendRequest = cancelFriendRequest;
