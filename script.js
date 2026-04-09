// ==================== ИНИЦИАЛИЗАЦИЯ ХРАНИЛИЩА ====================
if (!localStorage.getItem('users')) {
    // Предустановленный пользователь для теста
    const users = [
        { 
            username: 'anna', 
            password: '123', 
            displayName: 'Анна', 
            avatar: null 
        },
        { 
            username: 'dmitry', 
            password: '123', 
            displayName: 'Дмитрий', 
            avatar: null 
        }
    ];
    localStorage.setItem('users', JSON.stringify(users));
}

if (!localStorage.getItem('chats')) {
    const chats = [
        { id: 1, name: 'Анна', username: 'anna', avatar: null, lastMessage: 'Привет!', lastTime: Date.now() },
        { id: 2, name: 'Дмитрий', username: 'dmitry', avatar: null, lastMessage: 'Как дела?', lastTime: Date.now() },
        { id: 3, name: 'Поддержка', username: 'support', avatar: null, lastMessage: 'Чем помочь?', lastTime: Date.now() }
    ];
    localStorage.setItem('chats', JSON.stringify(chats));
}

if (!localStorage.getItem('messages')) {
    const messages = [
        { chatId: 1, sender: 'anna', text: 'Привет!', timestamp: Date.now() - 3600000 },
        { chatId: 2, sender: 'dmitry', text: 'Как дела?', timestamp: Date.now() - 7200000 }
    ];
    localStorage.setItem('messages', JSON.stringify(messages));
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
function getCurrentUser() {
    return localStorage.getItem('currentUser');
}

function getUsers() {
    return JSON.parse(localStorage.getItem('users'));
}

function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
}

function getChats() {
    return JSON.parse(localStorage.getItem('chats'));
}

function saveChats(chats) {
    localStorage.setItem('chats', JSON.stringify(chats));
}

function getMessages() {
    return JSON.parse(localStorage.getItem('messages'));
}

function saveMessages(messages) {
    localStorage.setItem('messages', JSON.stringify(messages));
}

// ==================== СТРАНИЦА ВХОДА ====================
function login() {
    const username = document.getElementById('loginUsername').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value.trim();
    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        localStorage.setItem('currentUser', username);
        window.location.href = 'chats.html';
    } else {
        document.getElementById('loginMessage').innerText = 'Неверный юзернейм или пароль';
    }
}

function register() {
    const username = document.getElementById('regUsername').value.trim().toLowerCase();
    const displayName = document.getElementById('regDisplayName').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    if (!username || !displayName || !password) {
        document.getElementById('regMessage').innerText = 'Заполните все поля';
        return;
    }
    const users = getUsers();
    if (users.find(u => u.username === username)) {
        document.getElementById('regMessage').innerText = 'Пользователь с таким юзернеймом уже существует';
        return;
    }
    const newUser = { username, password, displayName, avatar: null };
    users.push(newUser);
    saveUsers(users);
    // Автоматически создать чат с поддержкой? Можно, но пока просто сообщим
    alert('Регистрация успешна! Теперь войдите.');
    // Переключить на вкладку входа
    document.querySelector('.tab[data-tab="login"]').click();
}

function showRecovery() {
    const dialog = document.getElementById('recoveryDialog');
    dialog.style.display = dialog.style.display === 'none' ? 'block' : 'none';
}

function recoverPassword() {
    const username = document.getElementById('recoveryUsername').value.trim().toLowerCase();
    const users = getUsers();
    const user = users.find(u => u.username === username);
    if (user) {
        const newPass = prompt('Новый пароль для ' + username);
        if (newPass) {
            user.password = newPass;
            saveUsers(users);
            document.getElementById('recoveryMessage').innerText = 'Пароль изменён!';
        }
    } else {
        document.getElementById('recoveryMessage').innerText = 'Пользователь не найден';
    }
}

// Переключение табов
if (document.querySelector('.tabs')) {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const formId = tab.dataset.tab === 'login' ? 'loginForm' : 'registerForm';
            document.querySelectorAll('.form').forEach(f => f.classList.remove('active'));
            document.getElementById(formId).classList.add('active');
            document.getElementById('recoveryDialog').style.display = 'none';
        });
    });
}

// ==================== СТРАНИЦА СПИСКА ЧАТОВ ====================
if (window.location.pathname.includes('chats.html')) {
    const currentUser = getCurrentUser();
    if (!currentUser) window.location.href = 'index.html';

    // Загружаем данные текущего пользователя
    loadUserProfileInfo();
    renderChats();

    document.getElementById('searchChats').addEventListener('input', (e) => {
        renderChats(e.target.value);
    });

    document.getElementById('settingsIcon').addEventListener('click', () => {
        openProfileModal();
    });
}

function loadUserProfileInfo() {
    const currentUser = getCurrentUser();
    const users = getUsers();
    const user = users.find(u => u.username === currentUser);
    if (user) {
        document.getElementById('userDisplayName').innerText = user.displayName || user.username;
        document.getElementById('userUsername').innerText = user.username;
        const avatarDiv = document.getElementById('userAvatar');
        if (user.avatar) {
            avatarDiv.style.backgroundImage = `url(${user.avatar})`;
            avatarDiv.style.backgroundSize = 'cover';
            avatarDiv.innerText = '';
        } else {
            avatarDiv.style.backgroundImage = '';
            avatarDiv.innerText = (user.displayName || user.username).charAt(0).toUpperCase();
        }
    }
}

function renderChats(filter = '') {
    const chats = getChats();
    const currentUser = getCurrentUser();
    const users = getUsers();
    const filtered = chats.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()));
    const container = document.getElementById('chatsList');
    container.innerHTML = '';
    filtered.forEach(chat => {
        // Найти аватар чата (если чат с пользователем, берём аватар того пользователя)
        let avatarUrl = null;
        let avatarLetter = chat.name.charAt(0);
        if (chat.username) {
            const chatUser = users.find(u => u.username === chat.username);
            if (chatUser && chatUser.avatar) {
                avatarUrl = chatUser.avatar;
                avatarLetter = '';
            }
        }
        const div = document.createElement('div');
        div.className = 'chat-item';
        div.innerHTML = `
            <div class="chat-avatar" style="${avatarUrl ? `background-image: url(${avatarUrl}); background-size: cover;` : ''}">${avatarUrl ? '' : avatarLetter}</div>
            <div class="chat-info">
                <div class="chat-name">${chat.name}</div>
                <div class="chat-last">${chat.lastMessage || ''}</div>
            </div>
        `;
        div.onclick = () => {
            localStorage.setItem('currentChat', JSON.stringify(chat));
            window.location.href = `chat.html?chatId=${chat.id}`;
        };
        container.appendChild(div);
    });
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// ==================== ПРОФИЛЬ (МОДАЛЬНОЕ ОКНО) ====================
function openProfileModal() {
    const currentUser = getCurrentUser();
    const users = getUsers();
    const user = users.find(u => u.username === currentUser);
    if (!user) return;

    document.getElementById('editDisplayName').value = user.displayName || '';
    document.getElementById('editPassword').value = '';
    const modalAvatar = document.getElementById('modalAvatar');
    if (user.avatar) {
        modalAvatar.style.backgroundImage = `url(${user.avatar})`;
        modalAvatar.style.backgroundSize = 'cover';
        modalAvatar.innerText = '';
    } else {
        modalAvatar.style.backgroundImage = '';
        modalAvatar.innerText = (user.displayName || user.username).charAt(0).toUpperCase();
    }
    document.getElementById('profileModal').style.display = 'flex';
}

function closeProfileModal() {
    document.getElementById('profileModal').style.display = 'none';
}

function uploadAvatar() {
    const fileInput = document.getElementById('avatarUpload');
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const avatarData = e.target.result;
        const currentUser = getCurrentUser();
        const users = getUsers();
        const user = users.find(u => u.username === currentUser);
        if (user) {
            user.avatar = avatarData;
            saveUsers(users);
            // Обновить отображение в списке чатов и в модалке
            loadUserProfileInfo();
            const modalAvatar = document.getElementById('modalAvatar');
            modalAvatar.style.backgroundImage = `url(${avatarData})`;
            modalAvatar.style.backgroundSize = 'cover';
            modalAvatar.innerText = '';
            // Обновить аватары в чатах (если чат с этим пользователем)
            const chats = getChats();
            let updated = false;
            chats.forEach(chat => {
                if (chat.username === currentUser) {
                    chat.avatar = avatarData;
                    updated = true;
                }
            });
            if (updated) saveChats(chats);
            renderChats();
        }
    };
    reader.readAsDataURL(file);
}

function saveProfile() {
    const newDisplayName = document.getElementById('editDisplayName').value.trim();
    const newPassword = document.getElementById('editPassword').value.trim();
    const currentUser = getCurrentUser();
    const users = getUsers();
    const user = users.find(u => u.username === currentUser);
    if (!user) return;

    if (newDisplayName) {
        user.displayName = newDisplayName;
        // Обновить имя в списке чатов (если чат с этим пользователем)
        const chats = getChats();
        chats.forEach(chat => {
            if (chat.username === currentUser) {
                chat.name = newDisplayName;
            }
        });
        saveChats(chats);
    }
    if (newPassword) {
        user.password = newPassword;
    }
    saveUsers(users);
    loadUserProfileInfo();
    renderChats();
    document.getElementById('profileMessage').innerText = 'Профиль обновлён!';
    setTimeout(() => {
        document.getElementById('profileMessage').innerText = '';
        closeProfileModal();
    }, 1500);
}

// ==================== СТРАНИЦА ЧАТА ====================
if (window.location.pathname.includes('chat.html')) {
    const urlParams = new URLSearchParams(window.location.search);
    const chatId = parseInt(urlParams.get('chatId'));
    const chats = getChats();
    const chat = chats.find(c => c.id === chatId);
    if (!chat) window.location.href = 'chats.html';

    const currentUser = getCurrentUser();
    // Загрузить аватар собеседника
    const users = getUsers();
    const otherUser = users.find(u => u.username === chat.username);
    if (otherUser && otherUser.avatar) {
        document.getElementById('chatHeaderAvatar').style.backgroundImage = `url(${otherUser.avatar})`;
        document.getElementById('chatHeaderAvatar').style.backgroundSize = 'cover';
        document.getElementById('chatHeaderAvatar').innerText = '';
    } else {
        document.getElementById('chatHeaderAvatar').innerText = chat.name.charAt(0);
    }
    document.getElementById('chatName').innerText = chat.name;
    renderMessages(chatId);

    setInterval(() => renderMessages(chatId), 1000);
}

function renderMessages(chatId) {
    const messages = getMessages();
    const chatMessages = messages.filter(m => m.chatId === chatId);
    const currentUser = getCurrentUser();
    const container = document.getElementById('messagesArea');
    if (!container) return;
    container.innerHTML = '';
    chatMessages.forEach(msg => {
        const isMine = (msg.sender === currentUser);
        const div = document.createElement('div');
        div.className = `message ${isMine ? 'message-mine' : ''}`;
        div.innerHTML = `
            <div>${msg.text}</div>
            <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
        `;
        container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text) return;
    const urlParams = new URLSearchParams(window.location.search);
    const chatId = parseInt(urlParams.get('chatId'));
    const currentUser = getCurrentUser();
    const chats = getChats();
    const chat = chats.find(c => c.id === chatId);
    const messages = getMessages();
    const newMsg = {
        chatId: chatId,
        sender: currentUser,
        text: text,
        timestamp: Date.now()
    };
    messages.push(newMsg);
    saveMessages(messages);
    // Обновить последнее сообщение в чате
    chat.lastMessage = text;
    chat.lastTime = Date.now();
    saveChats(chats);
    input.value = '';
    renderMessages(chatId);
}

function goBack() {
    window.location.href = 'chats.html';
}
