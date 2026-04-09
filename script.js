// Инициализация хранилища (вызываем при загрузке)
function initStorage() {
    if (!localStorage.getItem('users')) {
        const users = [
            { username: 'Анна', password: '123', avatar: 'А' },
            { username: 'Дмитрий', password: '123', avatar: 'Д' }
        ];
        localStorage.setItem('users', JSON.stringify(users));
    }
    if (!localStorage.getItem('chats')) {
        const chats = [
            { id: 1, name: 'Анна', avatar: 'А', lastMessage: 'Привет!', lastTime: Date.now() },
            { id: 2, name: 'Дмитрий', avatar: 'Д', lastMessage: 'Как дела?', lastTime: Date.now() },
            { id: 3, name: 'Поддержка', avatar: 'П', lastMessage: 'Чем помочь?', lastTime: Date.now() }
        ];
        localStorage.setItem('chats', JSON.stringify(chats));
    }
    if (!localStorage.getItem('messages')) {
        const messages = [
            { chatId: 1, sender: 'Анна', text: 'Привет!', timestamp: Date.now() - 3600000, isMine: false },
            { chatId: 2, sender: 'Дмитрий', text: 'Как дела?', timestamp: Date.now() - 7200000, isMine: false }
        ];
        localStorage.setItem('messages', JSON.stringify(messages));
    }
}

// Вызов при загрузке любой страницы
initStorage();

// ========== СТРАНИЦА ВХОДА ==========
function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const users = JSON.parse(localStorage.getItem('users'));
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        localStorage.setItem('currentUser', username);
        window.location.href = 'chats.html';
    } else {
        document.getElementById('loginMessage').innerText = 'Неверное имя или пароль';
    }
}

function register() {
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    if (username === '' || password === '') {
        document.getElementById('regMessage').innerText = 'Заполните поля';
        return;
    }
    const users = JSON.parse(localStorage.getItem('users'));
    if (users.find(u => u.username === username)) {
        document.getElementById('regMessage').innerText = 'Пользователь уже существует';
        return;
    }
    users.push({ username, password, avatar: username[0] });
    localStorage.setItem('users', JSON.stringify(users));
    document.getElementById('regMessage').innerText = 'Регистрация успешна! Теперь войдите.';
    // Автоматически переключаем на вкладку входа
    document.querySelector('.tab[data-tab="login"]').click();
    document.getElementById('loginUsername').value = username;
    document.getElementById('loginPassword').value = '';
}

function showRecovery() {
    const dialog = document.getElementById('recoveryDialog');
    dialog.style.display = dialog.style.display === 'none' ? 'block' : 'none';
}

function recoverPassword() {
    const username = document.getElementById('recoveryUsername').value.trim();
    const users = JSON.parse(localStorage.getItem('users'));
    const user = users.find(u => u.username === username);
    if (user) {
        const newPass = prompt('Новый пароль для ' + username);
        if (newPass && newPass.trim() !== '') {
            user.password = newPass.trim();
            localStorage.setItem('users', JSON.stringify(users));
            document.getElementById('recoveryMessage').innerText = 'Пароль изменён!';
        } else {
            document.getElementById('recoveryMessage').innerText = 'Пароль не может быть пустым';
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

// ========== СТРАНИЦА СПИСКА ЧАТОВ ==========
if (window.location.pathname.includes('chats.html')) {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) window.location.href = 'index.html';

    document.getElementById('userInfo').innerHTML = `<strong>${currentUser}</strong>`;
    renderChats();

    document.getElementById('searchChats').addEventListener('input', (e) => {
        renderChats(e.target.value);
    });
}

function renderChats(filter = '') {
    const chats = JSON.parse(localStorage.getItem('chats'));
    const filtered = chats.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()));
    const container = document.getElementById('chatsList');
    if (!container) return;
    container.innerHTML = '';
    filtered.forEach(chat => {
        const div = document.createElement('div');
        div.className = 'chat-item';
        div.innerHTML = `
            <div class="chat-avatar">${chat.avatar}</div>
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

// ========== СТРАНИЦА ЧАТА ==========
if (window.location.pathname.includes('chat.html')) {
    const urlParams = new URLSearchParams(window.location.search);
    const chatId = parseInt(urlParams.get('chatId'));
    const chats = JSON.parse(localStorage.getItem('chats'));
    const chat = chats.find(c => c.id === chatId);
    if (!chat) window.location.href = 'chats.html';

    document.getElementById('chatName').innerText = chat.name;
    renderMessages(chatId);

    // Авто-обновление каждую секунду
    setInterval(() => renderMessages(chatId), 1000);
}

function renderMessages(chatId) {
    const messages = JSON.parse(localStorage.getItem('messages'));
    const chatMessages = messages.filter(m => m.chatId === chatId);
    const currentUser = localStorage.getItem('currentUser');
    const container = document.getElementById('messagesArea');
    if (!container) return;
    container.innerHTML = '';
    chatMessages.forEach(msg => {
        const div = document.createElement('div');
        div.className = `message ${msg.sender === currentUser ? 'message-mine' : ''}`;
        div.innerHTML = `
            <div>${escapeHtml(msg.text)}</div>
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
    const currentUser = localStorage.getItem('currentUser');
    const chats = JSON.parse(localStorage.getItem('chats'));
    const chat = chats.find(c => c.id === chatId);
    const messages = JSON.parse(localStorage.getItem('messages'));
    const newMsg = {
        chatId: chatId,
        sender: currentUser,
        text: text,
        timestamp: Date.now(),
        isMine: true
    };
    messages.push(newMsg);
    localStorage.setItem('messages', JSON.stringify(messages));
    // Обновить последнее сообщение в чате
    chat.lastMessage = text;
    chat.lastTime = Date.now();
    localStorage.setItem('chats', JSON.stringify(chats));
    input.value = '';
    renderMessages(chatId);
}

function goBack() {
    window.location.href = 'chats.html';
}

// Простая защита от XSS
function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}
