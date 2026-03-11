// Инициализация Supabase (вставьте свои данные)
const SUPABASE_URL = 'https://yczrkdbyssogvqmwylow.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljenJrZGJ5c3NvZ3ZxbXd5bG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODM3MjcsImV4cCI6MjA4ODU1OTcyN30.hW5tWQA6qS8pKYhR_vUJ5EmWy414MjhTH3ktHEikMpk';

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Глобальные переменные
let currentUser = null;           // объект пользователя из auth.user()
let currentUserData = null;       // данные из таблицы users
let currentChatId = null;         // ID открытого чата
let unsubscribeChats = null;      // функция отписки от канала чатов
let unsubscribeMessages = null;   // функция отписки от канала сообщений

// DOM элементы
const authScreen = document.getElementById('auth-screen');
const mainScreen = document.getElementById('main-screen');
const phoneInput = document.getElementById('phone-input');
const usernameInput = document.getElementById('username-input');
const passwordInput = document.getElementById('password-input');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const authError = document.getElementById('auth-error');
const logoutBtn = document.getElementById('logout-btn');
const userPhoneSpan = document.getElementById('user-phone');
const userUsernameSpan = document.getElementById('user-username');
const newChatBtn = document.getElementById('new-chat-btn');
const chatsListDiv = document.getElementById('chats-list');
const chatPartnerSpan = document.getElementById('chat-partner');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const modal = document.getElementById('new-chat-modal');
const closeModal = document.querySelector('.close-modal');
const searchUsernameInput = document.getElementById('search-username');
const searchUserBtn = document.getElementById('search-user-btn');
const searchResultDiv = document.getElementById('search-result');

// Преобразование номера в email для аутентификации
function phoneToEmail(phone) {
    const digits = phone.replace(/\D/g, '');
    return `${digits}@voxshat.com`;
}

// Показать ошибку
function showAuthError(msg) {
    authError.textContent = msg;
}

function clearAuthError() {
    authError.textContent = '';
}

// Получить инициалы для аватарки
function getInitials(username) {
    return username ? username.slice(0, 2).toUpperCase() : 'U';
}

// Форматирование времени
function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
        return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
    }
}

function formatMessageTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ---------- Аутентификация ----------
registerBtn.addEventListener('click', async () => {
    const phone = phoneInput.value.trim();
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!phone || !username || !password) {
        showAuthError('Заполните все поля');
        return;
    }

    // Проверка уникальности username
    const { data: existingUser, error: checkError } = await _supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .maybeSingle();

    if (existingUser) {
        showAuthError('Username уже занят');
        return;
    }

    const email = phoneToEmail(phone);

    // Регистрация в Supabase Auth
    const { data, error } = await _supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                phone: phone,
                username: username
            }
        }
    });

    if (error) {
        showAuthError(error.message);
        return;
    }

    // После успешной регистрации триггер создаст запись в public.users с временными phone и username.
    // Обновляем их на введённые пользователем.
    if (data.user) {
        const { error: updateError } = await _supabase
            .from('users')
            .update({ username: username, phone: phone })
            .eq('id', data.user.id);

        if (updateError) {
            console.error('Ошибка обновления username:', updateError);
            showAuthError('Не удалось установить username, попробуйте ещё раз');
        } else {
            clearAuthError();
        }
    }
});

loginBtn.addEventListener('click', async () => {
    const phone = phoneInput.value.trim();
    const password = passwordInput.value.trim();

    if (!phone || !password) {
        showAuthError('Введите номер и пароль');
        return;
    }

    const email = phoneToEmail(phone);

    const { data, error } = await _supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        showAuthError(error.message);
    } else {
        clearAuthError();
    }
});

logoutBtn.addEventListener('click', async () => {
    await _supabase.auth.signOut();
});

// Следим за состоянием аутентификации
_supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
        currentUser = session.user;
        // Получаем данные пользователя из таблицы users
        const { data: userData, error } = await _supabase
            .from('users')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (userData) {
            currentUserData = userData;
            userPhoneSpan.textContent = userData.phone;
            userUsernameSpan.textContent = `@${userData.username}`;
            authScreen.classList.remove('active');
            mainScreen.classList.add('active');
            loadChats();
        } else {
            console.error('Не удалось загрузить данные пользователя');
        }
    } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        currentUserData = null;
        currentChatId = null;
        if (unsubscribeChats) unsubscribeChats();
        if (unsubscribeMessages) unsubscribeMessages();
        authScreen.classList.add('active');
        mainScreen.classList.remove('active');
        chatsListDiv.innerHTML = '';
        messagesContainer.innerHTML = '';
        chatPartnerSpan.textContent = '';
        messageInput.disabled = true;
        sendBtn.disabled = true;
        phoneInput.value = '';
        usernameInput.value = '';
        passwordInput.value = '';
    }
});

// ---------- Загрузка списка чатов ----------
function loadChats() {
    if (!currentUser) return;

    async function fetchChats() {
        const { data: chats, error } = await _supabase
            .from('chats')
            .select(`
                *,
                participant1:users!chats_participant1_fkey(id, phone, username),
                participant2:users!chats_participant2_fkey(id, phone, username)
            `)
            .or(`participant1.eq.${currentUser.id},participant2.eq.${currentUser.id}`)
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Ошибка загрузки чатов:', error);
            return;
        }

        chatsListDiv.innerHTML = '';
        for (const chat of chats) {
            const otherUser = chat.participant1.id === currentUser.id ? chat.participant2 : chat.participant1;
            const lastMessage = chat.last_message || 'Нет сообщений';
            const time = formatTime(chat.updated_at);
            const initials = getInitials(otherUser.username);
            const isSelected = currentChatId === chat.id ? 'selected' : '';

            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${isSelected}`;
            chatItem.dataset.chatId = chat.id;
            chatItem.dataset.otherId = otherUser.id;
            chatItem.dataset.otherUsername = otherUser.username;
            chatItem.innerHTML = `
                <div class="avatar">${initials}</div>
                <div class="chat-info">
                    <div class="chat-name">@${otherUser.username}</div>
                    <div class="last-message">${lastMessage}</div>
                </div>
                <div class="chat-time">${time}</div>
            `;
            chatItem.addEventListener('click', () => selectChat(chat.id, otherUser.id, otherUser.username));
            chatsListDiv.appendChild(chatItem);
        }
    }

    fetchChats();
    // Запускаем polling для обновления списка чатов каждые 2 секунды
    const interval = setInterval(fetchChats, 2000);
    unsubscribeChats = () => clearInterval(interval);
}

// Выбор чата
function selectChat(chatId, otherId, otherUsername) {
    if (currentChatId === chatId) return;
    currentChatId = chatId;
    chatPartnerSpan.textContent = `@${otherUsername}`;
    messageInput.disabled = false;
    sendBtn.disabled = false;
    loadMessages(chatId);
    // Подсветка выбранного чата
    document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('selected'));
    const selected = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
    if (selected) selected.classList.add('selected');
}

// Загрузка сообщений
function loadMessages(chatId) {
    if (unsubscribeMessages) unsubscribeMessages();

    async function fetchMessages() {
        const { data: messages, error } = await _supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Ошибка загрузки сообщений:', error);
            return;
        }

        messagesContainer.innerHTML = '';
        messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${msg.sender_id === currentUser.id ? 'own' : 'other'}`;
            messageDiv.innerHTML = `
                <div class="message-text">${msg.text}</div>
                <div class="message-time">${formatMessageTime(msg.created_at)}</div>
            `;
            messagesContainer.appendChild(messageDiv);
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    fetchMessages();
    // Polling для сообщений
    const interval = setInterval(fetchMessages, 2000);
    unsubscribeMessages = () => clearInterval(interval);
}

// Отправка сообщения
sendBtn.addEventListener('click', async () => {
    const text = messageInput.value.trim();
    if (!text || !currentChatId) return;
    messageInput.value = '';

    const { error } = await _supabase
        .from('messages')
        .insert({
            chat_id: currentChatId,
            sender_id: currentUser.id,
            text: text
        });

    if (error) {
        console.error('Ошибка отправки:', error);
        return;
    }

    // Обновляем last_message и updated_at в чате
    await _supabase
        .from('chats')
        .update({ last_message: text, updated_at: new Date() })
        .eq('id', currentChatId);
});

// ---------- Создание нового чата ----------
newChatBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
    searchUsernameInput.value = '';
    searchResultDiv.innerHTML = '';
});

closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

searchUserBtn.addEventListener('click', async () => {
    const username = searchUsernameInput.value.trim();
    if (!username) {
        searchResultDiv.textContent = 'Введите username';
        return;
    }

    // Ищем пользователя по username
    const { data: users, error } = await _supabase
        .from('users')
        .select('id, username, phone')
        .eq('username', username);

    if (error) {
        searchResultDiv.textContent = 'Ошибка поиска';
        return;
    }

    if (!users || users.length === 0) {
        searchResultDiv.textContent = 'Пользователь не найден';
        return;
    }

    const otherUser = users[0];
    if (otherUser.id === currentUser.id) {
        searchResultDiv.textContent = 'Нельзя начать чат с самим собой';
        return;
    }

    // Проверяем, существует ли уже чат между этими двумя
    const { data: existingChats, error: chatError } = await _supabase
        .from('chats')
        .select('id')
        .or(`and(participant1.eq.${currentUser.id},participant2.eq.${otherUser.id}),and(participant1.eq.${otherUser.id},participant2.eq.${currentUser.id})`);

    if (chatError) {
        searchResultDiv.textContent = 'Ошибка проверки чата';
        return;
    }

    let chatId;
    if (existingChats && existingChats.length > 0) {
        chatId = existingChats[0].id;
    } else {
        // Создаём новый чат
        const { data: newChat, error: insertError } = await _supabase
            .from('chats')
            .insert({
                participant1: currentUser.id,
                participant2: otherUser.id,
                updated_at: new Date()
            })
            .select('id')
            .single();

        if (insertError) {
            searchResultDiv.textContent = 'Ошибка создания чата';
            return;
        }
        chatId = newChat.id;
    }

    modal.style.display = 'none';
    selectChat(chatId, otherUser.id, otherUser.username);
});
