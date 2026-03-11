// ================== НАСТРОЙКИ SUPABASE ==================
const SUPABASE_URL = 'https://yczrkdbyssogvqmwylow.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljenJrZGJ5c3NvZ3ZxbXd5bG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODM3MjcsImV4cCI6MjA4ODU1OTcyN30.hW5tWQA6qS8pKYhR_vUJ5EmWy414MjhTH3ktHEikMpk';
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==================
let currentUser = null;
let currentUserPhone = null;
let currentContactId = '';
let currentMode = 'chats';
let unsubscribeMessages = null;
let unsubscribeTyping = null;
let unsubscribeMessageUpdates = null;
let activeTimers = {};
let resetCode = null;
let editMessageId = null;
let replyToMessage = null;
let isLoadingMessages = false;
let hasMoreMessages = true;
const messagesLimit = 30;
let messagesOffset = 0;
let friendsCache = new Map();

// ================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==================
function validatePhone(p) {
    let cleaned = p.replace(/[^\d+]/g, '');
    return cleaned.startsWith('+') && /^\+\d{8,15}$/.test(cleaned);
}
function validatePassword(pwd) {
    return pwd.length >= 6 && /[a-zA-Z]/.test(pwd) && /[0-9]/.test(pwd);
}
function hashPassword(pwd) {
    return CryptoJS.SHA256(pwd).toString();
}
function isPremium(user) {
    return user.premiumUntil && user.premiumUntil > Date.now();
}
function ensureFriends(user) {
    if (user && !user.friends) {
        user.friends = { list: [], incoming: [], outgoing: [] };
    }
}
function updatePremiumUI() {
    if (currentUser && isPremium(currentUser)) {
        document.getElementById('premiumBadgeHeader').style.display = 'inline';
        document.getElementById('premiumStatus').innerHTML = '⭐ Premium активен';
    } else {
        document.getElementById('premiumBadgeHeader').style.display = 'none';
        document.getElementById('premiumStatus').innerHTML = '';
    }
}
function clearChatArea() {
    document.getElementById('chatHeaderTitle').textContent = 'Выберите чат';
    document.getElementById('chatHeaderSubtitle').textContent = '';
    document.getElementById('chatHeaderActions').innerHTML = '';
    document.getElementById('messagesContainer').innerHTML = '';
    document.getElementById('chatInput').style.display = 'none';
    document.getElementById('typingIndicator').textContent = '';
}
function showFloatingReaction(reaction, x, y) {
    const div = document.createElement('div');
    div.className = 'floating-reaction';
    div.textContent = reaction;
    div.style.left = x + 'px';
    div.style.top = y + 'px';
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 1000);
}

// ================== СТРАНЫ И СТИЛИ ==================
const countries = [
    { name: 'Россия', code: '+7', flag: '🇷🇺' },
    { name: 'Беларусь', code: '+375', flag: '🇧🇾' },
    { name: 'Украина', code: '+380', flag: '🇺🇦' },
    { name: 'США', code: '+1', flag: '🇺🇸' },
    { name: 'Казахстан', code: '+7', flag: '🇰🇿' }
];
let currentCountry = countries[0];

function updateCountryButton() {
    document.getElementById('selectCountryBtn').innerHTML = `${currentCountry.flag} ${currentCountry.name} (${currentCountry.code}) ▼`;
    document.getElementById('phoneInput').value = currentCountry.code;
}
function populateCountryList() {
    const list = document.getElementById('countryList');
    list.innerHTML = '';
    countries.forEach(c => {
        let btn = document.createElement('button');
        btn.textContent = `${c.flag} ${c.name} (${c.code})`;
        btn.style.display = 'block';
        btn.style.width = '100%';
        btn.style.padding = '10px';
        btn.style.margin = '5px 0';
        btn.style.background = '#2b5278';
        btn.style.color = '#fff';
        btn.style.border = 'none';
        btn.style.borderRadius = '20px';
        btn.style.cursor = 'pointer';
        btn.onclick = () => {
            currentCountry = c;
            updateCountryButton();
            document.getElementById('countryModal').style.display = 'none';
        };
        list.appendChild(btn);
    });
}
document.getElementById('selectCountryBtn').onclick = () => { document.getElementById('countryModal').style.display = 'flex'; };
document.getElementById('closeCountryModal').onclick = () => { document.getElementById('countryModal').style.display = 'none'; };
populateCountryList();

fetch('https://ipinfo.io/json?token=141f86a8a7b1d6')
    .then(res => res.json())
    .then(data => {
        const countryCode = data.country;
        if (countryCode === 'RU') currentCountry = countries[0];
        else if (countryCode === 'BY') currentCountry = countries[1];
        else if (countryCode === 'UA') currentCountry = countries[2];
        else if (countryCode === 'US') currentCountry = countries[3];
        else if (countryCode === 'KZ') currentCountry = countries[4];
        updateCountryButton();
    })
    .catch(() => updateCountryButton());

// Эмодзи-пикер
const emojis = ['😊','😂','❤️','👍','🔥','😢','🎉','😍','🤔','👌','🙏','💯','⭐','🍕','⚽','🏀','🎵','📚','✈️','🏠'];
const emojiPicker = document.getElementById('emojiPicker');
emojis.forEach(e => {
    let s = document.createElement('span');
    s.textContent = e;
    s.onclick = () => document.getElementById('messageInput').value += e;
    emojiPicker.appendChild(s);
});

// Стиль
function applyStyle(style) {
    const body = document.body;
    body.classList.remove('classic-style', 'vox-style');
    if (style === 'classic') {
        body.classList.add('classic-style');
    } else {
        body.classList.add('vox-style');
    }
    localStorage.setItem('voxchat_style', style);
}
const savedStyle = localStorage.getItem('voxchat_style') || 'classic';
applyStyle(savedStyle);
document.getElementById('openSettingsBtn').onclick = () => document.getElementById('styleModal').style.display = 'flex';
document.getElementById('openSettingsAppBtn').onclick = () => document.getElementById('styleModal').style.display = 'flex';
document.getElementById('classicStyleBtn').onclick = () => { applyStyle('classic'); document.getElementById('styleModal').style.display = 'none'; };
document.getElementById('voxStyleBtn').onclick = () => { applyStyle('vox'); document.getElementById('styleModal').style.display = 'none'; };
document.getElementById('closeStyleModal').onclick = () => document.getElementById('styleModal').style.display = 'none';

// ================== ФУНКЦИИ РАБОТЫ С ПОЛЬЗОВАТЕЛЯМИ (Supabase) ==================
async function findUserByPhone(phone) {
    const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('phone', phone)
        .single();
    if (error) return null;
    return data;
}
async function findUserByUsername(username) {
    const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .ilike('username', username)
        .maybeSingle();
    if (error) return null;
    return data;
}
async function saveUser(user) {
    const { error } = await supabaseClient
        .from('users')
        .upsert(user, { onConflict: 'phone' });
    if (error) console.error('Ошибка сохранения пользователя:', error);
}
async function deleteUser(phone) {
    await supabaseClient.from('users').delete().eq('phone', phone);
}
async function updateLastSeen() {
    if (!currentUser) return;
    await supabaseClient
        .from('users')
        .update({ last_seen: new Date().toISOString() })
        .eq('phone', currentUser.phone);
}
function startPresenceUpdates() {
    updateLastSeen();
    setInterval(updateLastSeen, 60000);
    document.addEventListener('click', updateLastSeen);
    document.addEventListener('scroll', updateLastSeen);
    document.addEventListener('keydown', updateLastSeen);
}

// ================== ВХОД / РЕГИСТРАЦИЯ ==================
function updateLoginButtonState() {
    let phoneValid = validatePhone(document.getElementById('phoneInput').value);
    let pwdValid = document.getElementById('passwordInput').value.length >= 3;
    document.getElementById('loginBtn').disabled = !(phoneValid && pwdValid);
    document.getElementById('debugInfo').innerHTML = 
        `📱 Телефон: ${phoneValid ? '✅' : '❌'}  🔐 Пароль: ${pwdValid ? '✅' : '❌'}`;
}
document.getElementById('phoneInput').addEventListener('input', updateLoginButtonState);
document.getElementById('passwordInput').addEventListener('input', updateLoginButtonState);

document.getElementById('loginBtn').addEventListener('click', async () => {
    let phone = document.getElementById('phoneInput').value.trim();
    let pwd = document.getElementById('passwordInput').value.trim();
    if (!validatePhone(phone) || pwd.length < 3) return;

    let user = await findUserByPhone(phone);
    if (user) {
        let hashed = hashPassword(pwd);
        if (user.password === pwd || user.password === hashed) {
            if (user.password === pwd) {
                user.password = hashed;
                await saveUser(user);
            }
            currentUser = user;
            document.getElementById('loginScreen').classList.add('fade-out');
            setTimeout(() => {
                document.getElementById('loginScreen').style.display = 'none';
                document.getElementById('app').style.display = 'flex';
                setTimeout(() => document.getElementById('app').classList.add('visible'), 50);
            }, 300);
            afterLogin(phone);
        } else {
            document.getElementById('loginError').textContent = 'Неверный пароль';
        }
    } else {
        // Регистрация
        document.getElementById('registerModal').style.display = 'flex';
        document.getElementById('registerUsername').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('registerPasswordConfirm').value = '';
        document.getElementById('registerError').textContent = '';
        const validateRegForm = () => {
            let username = document.getElementById('registerUsername').value.trim();
            let p1 = document.getElementById('registerPassword').value;
            let p2 = document.getElementById('registerPasswordConfirm').value;
            let usernameValid = username.length >= 3;
            let passwordValid = p1.length >= 6 && /[a-zA-Z]/.test(p1) && /[0-9]/.test(p1) && p1 === p2;
            document.getElementById('confirmRegister').disabled = !(usernameValid && passwordValid);
            if (!usernameValid && username.length > 0) {
                document.getElementById('registerError').textContent = 'Юзернейм должен быть не менее 3 символов';
            } else if (p1 !== p2 && p2.length > 0) {
                document.getElementById('registerError').textContent = 'Пароли не совпадают';
            } else if (!passwordValid && p1.length > 0) {
                document.getElementById('registerError').textContent = 'Пароль: минимум 6 символов, буквы и цифры';
            } else {
                document.getElementById('registerError').textContent = '';
            }
        };
        document.getElementById('registerUsername').addEventListener('input', validateRegForm);
        document.getElementById('registerPassword').addEventListener('input', validateRegForm);
        document.getElementById('registerPasswordConfirm').addEventListener('input', validateRegForm);
        document.getElementById('confirmRegister').onclick = async () => {
            let username = document.getElementById('registerUsername').value.trim().toLowerCase();
            let p1 = document.getElementById('registerPassword').value;
            let existing = await findUserByUsername(username);
            if (existing) {
                alert('Этот @юзернейм уже занят');
                return;
            }
            const hashed = hashPassword(p1);
            const newUser = {
                phone: phone,
                password: hashed,
                username: username,
                name: '',
                avatar: null,
                badges: { blue: false, red: false },
                premiumUntil: null,
                friends: { list: [], incoming: [], outgoing: [] },
                last_seen: new Date().toISOString()
            };
            await saveUser(newUser);
            currentUser = newUser;
            document.getElementById('registerModal').style.display = 'none';
            document.getElementById('loginScreen').classList.add('fade-out');
            setTimeout(() => {
                document.getElementById('loginScreen').style.display = 'none';
                document.getElementById('app').style.display = 'flex';
                setTimeout(() => document.getElementById('app').classList.add('visible'), 50);
            }, 300);
            afterLogin(phone);
        };
        document.getElementById('cancelRegister').onclick = () => { document.getElementById('registerModal').style.display = 'none'; };
    }
});

async function afterLogin(phone) {
    ensureFriends(currentUser);
    currentUserPhone = phone;
    document.getElementById('userPhoneDisplay').textContent = phone.length > 10 ? phone.slice(0,10)+'…' : phone;
    updatePremiumUI();
    startPresenceUpdates();
    initMode('chats');
    initSpeech();
    loadProfileToForm();
    renderContacts();
    renderFriendsView();
    renderChannelsList();
    if (currentUser.friends.list.length > 0) {
        switchContact(currentUser.friends.list[0]);
    } else {
        clearChatArea();
        document.getElementById('chatHeaderTitle').textContent = 'Нет чатов';
        document.getElementById('chatHeaderSubtitle').textContent = 'Добавьте друзей, чтобы начать общение';
    }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    document.getElementById('app').classList.remove('visible');
    setTimeout(() => {
        document.getElementById('app').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'block';
        document.getElementById('loginScreen').classList.remove('fade-out');
    }, 300);
    document.getElementById('phoneInput').value = '+7';
    document.getElementById('passwordInput').value = '';
    document.getElementById('loginBtn').disabled = true;
    document.getElementById('loginError').textContent = '';
    if (unsubscribeMessages && unsubscribeMessages.unsubscribe) unsubscribeMessages.unsubscribe();
    if (unsubscribeTyping && unsubscribeTyping.unsubscribe) unsubscribeTyping.unsubscribe();
    if (unsubscribeMessageUpdates && unsubscribeMessageUpdates.unsubscribe) unsubscribeMessageUpdates.unsubscribe();
    currentUser = null;
    currentUserPhone = null;
    document.getElementById('debugInfo').innerHTML = '';
});

// ================== ЗАБЫЛИ ПАРОЛЬ ==================
document.getElementById('forgotPasswordLink').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('resetModal').style.display = 'flex';
    document.getElementById('resetPhone').value = '+7';
    document.getElementById('resetCodeInput').value = '';
    resetCode = null;
});
document.getElementById('sendResetCodeBtn').addEventListener('click', () => {
    let phone = document.getElementById('resetPhone').value.trim();
    if (validatePhone(phone)) {
        resetCode = Math.floor(1000 + Math.random() * 9000).toString();
        alert(`Код подтверждения: ${resetCode}`);
    } else {
        alert('Введите корректный номер');
    }
});
document.getElementById('verifyResetBtn').addEventListener('click', () => {
    let phone = document.getElementById('resetPhone').value.trim();
    let code = document.getElementById('resetCodeInput').value.trim();
    if (!validatePhone(phone)) { alert('Некорректный номер'); return; }
    if (code !== resetCode) { alert('Неверный код'); return; }
    window.resetPhoneForPassword = phone;
    document.getElementById('resetModal').style.display = 'none';
    document.getElementById('newPasswordModal').style.display = 'flex';
});
document.getElementById('cancelResetBtn').addEventListener('click', () => { document.getElementById('resetModal').style.display = 'none'; });
document.getElementById('setNewPasswordBtn').addEventListener('click', async () => {
    let p1 = document.getElementById('newPassword').value;
    let p2 = document.getElementById('newPasswordConfirm').value;
    if (p1 !== p2) { alert('Пароли не совпадают'); return; }
    if (!validatePassword(p1)) { alert('Пароль должен быть минимум 6 символов, содержать буквы и цифры'); return; }
    let phone = window.resetPhoneForPassword;
    let user = await findUserByPhone(phone);
    if (user) {
        let hashed = hashPassword(p1);
        user.password = hashed;
        await saveUser(user);
        alert('Пароль успешно изменён');
    }
    document.getElementById('newPasswordModal').style.display = 'none';
    document.getElementById('newPassword').value = '';
    document.getElementById('newPasswordConfirm').value = '';
});
document.getElementById('cancelNewPasswordBtn').addEventListener('click', () => { document.getElementById('newPasswordModal').style.display = 'none'; });

// ================== ПРОФИЛЬ ==================
document.getElementById('profileAvatarInput').onchange = function(e) {
    let file = e.target.files[0];
    if (file) {
        let reader = new FileReader();
        reader.onload = ev => {
            document.getElementById('profileAvatar').innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
            currentUser.avatar = ev.target.result;
        };
        reader.readAsDataURL(file);
    }
};
document.getElementById('profileSaveBtn').addEventListener('click', async () => {
    let newUsername = document.getElementById('profileUsername').value.trim().toLowerCase();
    if (newUsername !== currentUser.username) {
        let existing = await findUserByUsername(newUsername);
        if (existing && existing.phone !== currentUser.phone) {
            alert('Этот @юзернейм уже занят');
            return;
        }
    }
    currentUser.username = newUsername;
    currentUser.name = document.getElementById('profileName').value.trim();
    await saveUser(currentUser);
    alert('Сохранено');
    renderContacts();
});
function loadProfileToForm() {
    document.getElementById('profileUsername').value = currentUser.username || '';
    document.getElementById('profileName').value = currentUser.name || '';
    if (currentUser.avatar) {
        document.getElementById('profileAvatar').innerHTML = `<img src="${currentUser.avatar}" style="width:100%;height:100%;object-fit:cover;">`;
    } else {
        document.getElementById('profileAvatar').innerHTML = '<span>👤</span>';
    }
}

// ================== PREMIUM ==================
document.getElementById('showPremiumBtn').addEventListener('click', () => { document.getElementById('premiumModal').style.display = 'flex'; });
document.getElementById('closePremiumModal').addEventListener('click', () => { document.getElementById('premiumModal').style.display = 'none'; });
document.querySelectorAll('.premium-option').forEach(btn => {
    btn.addEventListener('click', async function() {
        let months = parseInt(this.dataset.months);
        if (confirm(`Оформить Premium на ${months} мес. за ${this.dataset.price}₽?`)) {
            let until = Date.now() + months * 30 * 24 * 60 * 60 * 1000;
            currentUser.premiumUntil = until;
            if (!currentUser.badges) currentUser.badges = {};
            currentUser.badges.red = true;
            await saveUser(currentUser);
            updatePremiumUI();
            document.getElementById('premiumModal').style.display = 'none';
            alert('Premium активирован!');
            renderContacts();
        }
    });
});

// ================== УДАЛЕНИЕ АККАУНТА ==================
document.getElementById('deleteAccountBtn').addEventListener('click', async () => {
    if (!confirm('Вы уверены, что хотите удалить свой аккаунт? Это действие необратимо.')) return;
    await supabaseClient.from('messages').delete().eq('sender', currentUser.phone);
    await supabaseClient.from('channels').delete().eq('createdBy', currentUser.phone);
    const { data: allUsers } = await supabaseClient.from('users').select('phone, friends');
    for (let u of allUsers) {
        if (u.friends) {
            let changed = false;
            if (u.friends.list.includes(currentUser.phone)) {
                u.friends.list = u.friends.list.filter(p => p !== currentUser.phone);
                changed = true;
            }
            if (u.friends.incoming.includes(currentUser.phone)) {
                u.friends.incoming = u.friends.incoming.filter(p => p !== currentUser.phone);
                changed = true;
            }
            if (u.friends.outgoing.includes(currentUser.phone)) {
                u.friends.outgoing = u.friends.outgoing.filter(p => p !== currentUser.phone);
                changed = true;
            }
            if (changed) {
                await supabaseClient.from('users').update({ friends: u.friends }).eq('phone', u.phone);
            }
        }
    }
    await supabaseClient.from('users').delete().eq('phone', currentUser.phone);
    alert('Аккаунт удалён. До свидания!');
    document.getElementById('logoutBtn').click();
});

// ================== ПЕРЕКЛЮЧЕНИЕ РЕЖИМОВ ==================
function initMode(mode) {
    currentMode = mode;
    [document.getElementById('chatsModeBtn'), document.getElementById('channelsModeBtn'), document.getElementById('friendsModeBtn'), document.getElementById('profileModeBtn'), document.getElementById('settingsModeBtn')].forEach(b => b.classList.remove('active'));
    document.getElementById('contactsList').style.display = 'none';
    document.getElementById('channelsList').style.display = 'none';
    document.getElementById('friendsView').style.display = 'none';
    document.getElementById('profileView').style.display = 'none';
    document.getElementById('settingsView').style.display = 'none';
    document.getElementById('channelActions').style.display = 'none';

    if (mode === 'chats') {
        document.getElementById('chatsModeBtn').classList.add('active');
        document.getElementById('contactsList').style.display = 'block';
        renderContacts();
        if (!currentContactId || currentContactId === '') {
            if (currentUser && currentUser.friends && currentUser.friends.list.length > 0) {
                switchContact(currentUser.friends.list[0]);
            } else {
                clearChatArea();
                document.getElementById('chatHeaderTitle').textContent = 'Нет чатов';
                document.getElementById('chatHeaderSubtitle').textContent = 'Добавьте друзей, чтобы начать общение';
            }
        }
    } else if (mode === 'channels') {
        document.getElementById('channelsModeBtn').classList.add('active');
        document.getElementById('channelsList').style.display = 'block';
        document.getElementById('channelActions').style.display = 'flex';
        renderChannelsList();
        clearChatArea();
    } else if (mode === 'friends') {
        document.getElementById('friendsModeBtn').classList.add('active');
        document.getElementById('friendsView').style.display = 'block';
        ensureFriends(currentUser);
        renderFriendsView();
        clearChatArea();
    } else if (mode === 'profile') {
        document.getElementById('profileModeBtn').classList.add('active');
        document.getElementById('profileView').style.display = 'flex';
        loadProfileToForm();
        updatePremiumUI();
        clearChatArea();
    } else if (mode === 'settings') {
        document.getElementById('settingsModeBtn').classList.add('active');
        document.getElementById('settingsView').style.display = 'flex';
        updateStats();
        clearChatArea();
    }
}

document.getElementById('chatsModeBtn').onclick = () => initMode('chats');
document.getElementById('channelsModeBtn').onclick = () => initMode('channels');
document.getElementById('friendsModeBtn').onclick = () => initMode('friends');
document.getElementById('profileModeBtn').onclick = () => initMode('profile');
document.getElementById('settingsModeBtn').onclick = () => initMode('settings');

// ================== КОНТАКТЫ ==================
async function renderContacts() {
    const contactsList = document.getElementById('contactsList');
    contactsList.innerHTML = '';

    if (currentUser && currentUser.friends && currentUser.friends.list) {
        const friendPhones = [...new Set(currentUser.friends.list)];
        if (friendPhones.length === 0) {
            contactsList.innerHTML = '<div style="padding:20px;text-align:center;color:#8e9aa6;">Нет друзей</div>';
            return;
        }
        const { data: friendsData } = await supabaseClient
            .from('users')
            .select('*')
            .in('phone', friendPhones);
        if (friendsData) {
            friendsData.forEach(f => friendsCache.set(f.phone, f));
        }

        for (let friendPhone of friendPhones) {
            let friend = friendsCache.get(friendPhone);
            if (!friend) continue;
            let div = document.createElement('div');
            div.className = `contact ${currentContactId === friendPhone ? 'active' : ''}`;
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
            contactsList.appendChild(div);
        }
    }
}

function switchContact(id) {
    if (unsubscribeMessages && unsubscribeMessages.unsubscribe) unsubscribeMessages.unsubscribe();
    if (unsubscribeTyping && unsubscribeTyping.unsubscribe) unsubscribeTyping.unsubscribe();
    if (unsubscribeMessageUpdates && unsubscribeMessageUpdates.unsubscribe) unsubscribeMessageUpdates.unsubscribe();

    currentContactId = id;
    renderContacts();
    messagesOffset = 0;
    hasMoreMessages = true;

    const friend = friendsCache.get(id);
    if (friend) {
        let badges = '';
        if (friend.badges?.blue) badges += '<span class="verified blue">✓</span>';
        if (friend.badges?.red) badges += '<span class="verified red">✓</span>';
        document.getElementById('chatHeaderTitle').innerHTML = `${friend.name || friend.username || id} ${badges}`;
        let status = 'онлайн';
        if (friend.last_seen) {
            let diff = Date.now() - new Date(friend.last_seen).getTime();
            if (diff > 120000) {
                let date = new Date(friend.last_seen);
                status = 'был ' + date.toLocaleTimeString().slice(0,5);
            }
        }
        document.getElementById('chatHeaderSubtitle').textContent = status;
    } else {
        (async () => {
            const { data } = await supabaseClient
                .from('users')
                .select('name, username, badges, last_seen')
                .eq('phone', id)
                .single();
            if (data) {
                friendsCache.set(id, data);
                let badges = '';
                if (data.badges?.blue) badges += '<span class="verified blue">✓</span>';
                if (data.badges?.red) badges += '<span class="verified red">✓</span>';
                document.getElementById('chatHeaderTitle').innerHTML = `${data.name || data.username || id} ${badges}`;
                let status = 'онлайн';
                if (data.last_seen) {
                    let diff = Date.now() - new Date(data.last_seen).getTime();
                    if (diff > 120000) {
                        let date = new Date(data.last_seen);
                        status = 'был ' + date.toLocaleTimeString().slice(0,5);
                    }
                }
                document.getElementById('chatHeaderSubtitle').textContent = status;
            }
        })();
    }
    document.getElementById('typingIndicator').textContent = '';
    subscribeToMessages(id);
    subscribeToTyping(id);
    document.getElementById('chatHeaderActions').innerHTML = '';
    document.getElementById('chatInput').style.display = 'flex';
    document.getElementById('messageInput').disabled = false;
    document.getElementById('sendButton').disabled = false;
}

// ================== ИНДИКАТОР ПЕЧАТАНИЯ ==================
function subscribeToTyping(contactId) {
    let chatId = getChatId(contactId);
    if (!chatId) return;
    if (unsubscribeTyping && unsubscribeTyping.unsubscribe) unsubscribeTyping.unsubscribe();
    unsubscribeTyping = supabaseClient
        .channel(`typing-${chatId}`)
        .on(
            'broadcast',
            { event: 'typing' },
            (payload) => {
                if (payload.payload.sender !== currentUser.phone && payload.payload.chatId === chatId) {
                    document.getElementById('typingIndicator').textContent = 'печатает...';
                    clearTimeout(activeTimers.typing);
                    activeTimers.typing = setTimeout(() => {
                        document.getElementById('typingIndicator').textContent = '';
                    }, 3000);
                }
            }
        )
        .subscribe();
}

function sendTyping() {
    if (!currentUser || !currentContactId) return;
    let chatId = getChatId(currentContactId);
    supabaseClient.channel(`typing-${chatId}`).send({
        type: 'broadcast',
        event: 'typing',
        payload: { sender: currentUser.phone, chatId: chatId }
    });
}

document.getElementById('messageInput').addEventListener('input', () => {
    sendTyping();
});

// ================== СООБЩЕНИЯ ==================
function getChatId(contactId) {
    if (!contactId) return '';
    contactId = String(contactId);
    if (contactId.startsWith('+')) {
        if (!currentUser) return '';
        return `private_${[currentUser.phone, contactId].sort().join('_')}`;
    }
    return contactId;
}

async function loadMessages(chatId, loadMore = false) {
    if (isLoadingMessages) return;
    isLoadingMessages = true;
    const messagesContainer = document.getElementById('messagesContainer');
    if (!loadMore) {
        messagesOffset = 0;
        messagesContainer.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            let skeleton = document.createElement('div');
            skeleton.className = 'skeleton-message';
            messagesContainer.appendChild(skeleton);
        }
    }
    try {
        let query = supabaseClient
            .from('messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('time', { ascending: false })
            .range(messagesOffset, messagesOffset + messagesLimit - 1);
        let { data: msgs, error } = await query;
        if (error) throw error;
        if (!loadMore) messagesContainer.innerHTML = '';
        if (msgs.length < messagesLimit) hasMoreMessages = false;
        msgs.reverse();
        if (loadMore) {
            msgs.forEach(m => {
                m.isMe = (m.sender === currentUser.phone);
                prependMessage(m);
            });
        } else {
            msgs.forEach(m => {
                m.isMe = (m.sender === currentUser.phone);
                appendMessage(m);
            });
        }
        messagesOffset += msgs.length;
    } catch (e) {
        console.error('Ошибка загрузки сообщений:', e);
        if (!loadMore) messagesContainer.innerHTML = '<div style="text-align:center;color:#f44336;">Ошибка загрузки</div>';
    } finally {
        isLoadingMessages = false;
    }
}

function subscribeToMessages(contactId) {
    let chatId = getChatId(contactId);
    if (!chatId) return;
    console.log('📡 Подписка на чат/канал:', chatId);
    loadMessages(chatId, false);

    if (unsubscribeMessages && unsubscribeMessages.unsubscribe) unsubscribeMessages.unsubscribe();
    if (unsubscribeMessageUpdates && unsubscribeMessageUpdates.unsubscribe) unsubscribeMessageUpdates.unsubscribe();

    unsubscribeMessages = supabaseClient
        .channel(`messages-${chatId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `chat_id=eq.${chatId}`
            },
            (payload) => {
                console.log('🔥 Новое сообщение:', payload);
                let newMsg = payload.new;
                newMsg.isMe = (newMsg.sender === currentUser.phone);
                appendMessage(newMsg);
            }
        )
        .subscribe();

    unsubscribeMessageUpdates = supabaseClient
        .channel(`messages-updates-${chatId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'messages',
                filter: `chat_id=eq.${chatId}`
            },
            (payload) => {
                console.log('✏️ Обновление сообщения:', payload);
                updateMessageInUI(payload.new);
            }
        )
        .subscribe();
}

function updateMessageInUI(updatedMsg) {
    const wrapper = document.querySelector(`.message-wrapper[data-id="${updatedMsg.id}"]`);
    if (!wrapper) return;
    const msgDiv = wrapper.querySelector('.message');
    const footer = wrapper.querySelector('.message-footer');
    if (updatedMsg.text !== undefined && msgDiv && !updatedMsg.image) {
        msgDiv.textContent = updatedMsg.text;
    }
    if (updatedMsg.reactions && footer) {
        const reactionBtn = footer.querySelector('.reaction-btn');
        if (reactionBtn) {
            const total = Object.values(updatedMsg.reactions).reduce((a,b)=>a+b,0);
            reactionBtn.innerHTML = `❤️ <span>${total || 0}</span>`;
        }
    }
    wrapper.classList.add('message-update');
    setTimeout(() => wrapper.classList.remove('message-update'), 200);
}

function showReplyBar(msg) {
    let existingBar = document.getElementById('replyBar');
    if (existingBar) existingBar.remove();

    let bar = document.createElement('div');
    bar.id = 'replyBar';
    bar.innerHTML = `
        <span>↩️ Ответ на: ${msg.text || (msg.image ? '📷 Изображение' : '')}</span>
        <button id="cancelReplyBtn">✕</button>
    `;
    document.getElementById('chatInput').parentNode.insertBefore(bar, document.getElementById('chatInput'));
    document.getElementById('cancelReplyBtn').onclick = () => {
        bar.remove();
        replyToMessage = null;
        document.getElementById('messageInput').placeholder = 'Сообщение...';
    };
    document.getElementById('messageInput').placeholder = 'Ваш ответ...';
}

function appendMessage(msg) {
    const messagesContainer = document.getElementById('messagesContainer');
    let w = document.createElement('div');
    w.className = 'message-wrapper';
    w.dataset.id = msg.id;
    w.style.alignSelf = msg.isMe ? 'flex-end' : 'flex-start';

    if (msg.reply_to) {
        let replyDiv = document.createElement('div');
        replyDiv.className = 'reply-indicator';
        replyDiv.style.fontSize = '12px';
        replyDiv.style.opacity = '0.8';
        replyDiv.style.marginBottom = '2px';
        replyDiv.style.padding = '2px 8px';
        replyDiv.style.borderLeft = '3px solid #3390ec';
        replyDiv.style.backgroundColor = 'rgba(51,144,236,0.1)';
        replyDiv.style.borderRadius = '4px';
        replyDiv.textContent = '↩️ Загрузка...';
        w.appendChild(replyDiv);

        supabaseClient
            .from('messages')
            .select('text, image, sender')
            .eq('id', msg.reply_to)
            .single()
            .then(({ data: originalMsg, error }) => {
                if (error || !originalMsg) {
                    replyDiv.textContent = '↩️ Сообщение не найдено';
                    return;
                }
                let replyText = originalMsg.text || (originalMsg.image ? '📷 Изображение' : '');
                replyDiv.textContent = `↩️ ${replyText}`;
            });
    }

    let md = document.createElement('div');
    md.className = `message ${msg.isMe ? 'own' : ''}`;
    if (msg.image) {
        let img = document.createElement('img');
        img.src = msg.image;
        img.onclick = () => window.open(msg.image);
        md.appendChild(img);
    } else {
        md.textContent = msg.text;
    }
    let t = document.createElement('div');
    t.className = 'message-time';
    t.textContent = new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let f = document.createElement('div');
    f.className = 'message-footer';

    let r = document.createElement('button');
    r.className = 'reaction-btn';
    let reactions = msg.reactions || {};
    let totalReactions = Object.values(reactions).reduce((a,b)=>a+b,0);
    r.innerHTML = `❤️ <span>${totalReactions || 0}</span>`;
    r.onclick = (e) => {
        e.stopPropagation();
        currentReactionMsg = msg;
        let rect = e.target.getBoundingClientRect();
        showFloatingReaction('❤️', rect.left, rect.top);
        document.getElementById('reactionPickerModal').style.display = 'flex';
    };
    f.appendChild(r);

    let replyBtn = document.createElement('button');
    replyBtn.className = 'reply-btn';
    replyBtn.innerHTML = '↩️';
    replyBtn.onclick = (e) => {
        e.stopPropagation();
        replyToMessage = msg;
        showReplyBar(msg);
    };
    f.appendChild(replyBtn);

    w.appendChild(md);
    w.appendChild(t);
    w.appendChild(f);
    messagesContainer.appendChild(w);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function prependMessage(msg) {
    const messagesContainer = document.getElementById('messagesContainer');
    let w = document.createElement('div');
    w.className = 'message-wrapper';
    w.dataset.id = msg.id;
    w.style.alignSelf = msg.isMe ? 'flex-end' : 'flex-start';

    if (msg.reply_to) {
        let replyDiv = document.createElement('div');
        replyDiv.style.fontSize = '12px';
        replyDiv.style.opacity = '0.7';
        replyDiv.style.marginBottom = '2px';
        replyDiv.style.padding = '2px 8px';
        replyDiv.style.borderLeft = '3px solid #3390ec';
        replyDiv.style.backgroundColor = 'rgba(51,144,236,0.1)';
        replyDiv.style.borderRadius = '4px';
        replyDiv.textContent = '↩️ Загрузка...';
        w.appendChild(replyDiv);

        supabaseClient
            .from('messages')
            .select('text, image, sender')
            .eq('id', msg.reply_to)
            .single()
            .then(({ data: originalMsg, error }) => {
                if (error || !originalMsg) {
                    replyDiv.textContent = '↩️ Сообщение не найдено';
                    return;
                }
                let replyText = originalMsg.text || (originalMsg.image ? '📷 Изображение' : '');
                replyDiv.textContent = `↩️ ${replyText}`;
            });
    }

    let md = document.createElement('div');
    md.className = `message ${msg.isMe ? 'own' : ''}`;
    if (msg.image) {
        let img = document.createElement('img');
        img.src = msg.image;
        img.onclick = () => window.open(msg.image);
        md.appendChild(img);
    } else {
        md.textContent = msg.text;
    }
    let t = document.createElement('div');
    t.className = 'message-time';
    t.textContent = new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let f = document.createElement('div');
    f.className = 'message-footer';

    let r = document.createElement('button');
    r.className = 'reaction-btn';
    let reactions = msg.reactions || {};
    let totalReactions = Object.values(reactions).reduce((a,b)=>a+b,0);
    r.innerHTML = `❤️ <span>${totalReactions || 0}</span>`;
    r.onclick = (e) => {
        e.stopPropagation();
        currentReactionMsg = msg;
        document.getElementById('reactionPickerModal').style.display = 'flex';
    };
    f.appendChild(r);

    let replyBtn = document.createElement('button');
    replyBtn.className = 'reply-btn';
    replyBtn.innerHTML = '↩️';
    replyBtn.onclick = (e) => {
        e.stopPropagation();
        replyToMessage = msg;
        showReplyBar(msg);
    };
    f.appendChild(replyBtn);

    w.appendChild(md);
    w.appendChild(t);
    w.appendChild(f);
    messagesContainer.insertBefore(w, messagesContainer.firstChild);
}

// ================== РЕАКЦИИ ==================
document.querySelectorAll('.reaction-option').forEach(btn => {
    btn.onclick = async () => {
        let reaction = btn.dataset.reaction;
        if (!currentReactionMsg) return;
        let msg = currentReactionMsg;
        let reactions = msg.reactions || {};
        reactions[reaction] = (reactions[reaction] || 0) + 1;
        try {
            await supabaseClient
                .from('messages')
                .update({ reactions: reactions })
                .eq('id', msg.id);
            document.getElementById('reactionPickerModal').style.display = 'none';
            currentReactionMsg = null;
            showFloatingReaction(reaction, window.innerWidth/2, window.innerHeight/2);
        } catch (error) {
            console.error('Ошибка при обновлении реакции:', error);
            alert('Не удалось поставить реакцию.');
        }
    };
});
document.getElementById('closeReactionPicker').onclick = () => {
    document.getElementById('reactionPickerModal').style.display = 'none';
    currentReactionMsg = null;
};

// ================== ОТПРАВКА СООБЩЕНИЯ ==================
document.getElementById('sendButton').onclick = async () => {
    let text = document.getElementById('messageInput').value.trim();
    if (!text || !currentUser || !currentContactId) return;
    let chatId = getChatId(currentContactId);
    let msgObj = {
        chat_id: chatId,
        sender: currentUser.phone,
        text: text,
        time: new Date().toISOString(),
        reactions: {}
    };
    if (replyToMessage) {
        msgObj.reply_to = replyToMessage.id;
    }
    console.log('📤 Отправка в chatId:', chatId, 'объект:', msgObj);
    try {
        await supabaseClient
            .from('messages')
            .insert([msgObj]);
    } catch (e) {
        alert('Ошибка отправки: ' + e.message);
    }

    document.getElementById('messageInput').value = '';
    let bar = document.getElementById('replyBar');
    if (bar) bar.remove();
    replyToMessage = null;
    document.getElementById('messageInput').placeholder = 'Сообщение...';
};

document.getElementById('messageInput').onkeypress = e => {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('sendButton').click();
    }
};

// ================== ПРОКРУТКА ДЛЯ ПАГИНАЦИИ ==================
document.getElementById('messagesContainer').addEventListener('scroll', () => {
    if (document.getElementById('messagesContainer').scrollTop === 0 && hasMoreMessages && !isLoadingMessages) {
        loadMessages(getChatId(currentContactId), true);
    }
});

// ================== КАНАЛЫ ==================
async function renderChannelsList(searchTerm = '') {
    let { data: channels, error } = await supabaseClient
        .from('channels')
        .select('*');
    if (error) {
        console.error('Ошибка загрузки каналов:', error);
        document.getElementById('channelsList').innerHTML = '<div style="padding:20px;text-align:center;color:#f44336;">Ошибка загрузки каналов</div>';
        return;
    }
    let filtered = (channels || []).filter(ch => 
        ch.subscribers && ch.subscribers.includes(currentUser.phone) &&
        (ch.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
         (ch.username && ch.username.toLowerCase().includes(searchTerm.toLowerCase())))
    );
    document.getElementById('channelsList').innerHTML = '';
    if (!filtered.length) {
        document.getElementById('channelsList').innerHTML = '<div style="padding:20px;text-align:center;color:#8e9aa6;">Нет каналов</div>';
        return;
    }
    filtered.forEach(ch => {
        let div = document.createElement('div');
        div.className = `channel-item ${ch.id === currentContactId ? 'active' : ''}`;
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
        document.getElementById('channelsList').appendChild(div);
    });
}

document.getElementById('channelSearchInput').addEventListener('input', (e) => {
    renderChannelsList(e.target.value);
});

async function switchChannelView(chId) {
    if (unsubscribeMessages && unsubscribeMessages.unsubscribe) unsubscribeMessages.unsubscribe();
    if (unsubscribeTyping && unsubscribeTyping.unsubscribe) unsubscribeTyping.unsubscribe();
    if (unsubscribeMessageUpdates && unsubscribeMessageUpdates.unsubscribe) unsubscribeMessageUpdates.unsubscribe();

    currentContactId = String(chId);
    messagesOffset = 0;
    hasMoreMessages = true;
    renderChannelsList(document.getElementById('channelSearchInput').value);
    let { data: ch, error } = await supabaseClient
        .from('channels')
        .select('*')
        .eq('id', chId)
        .single();
    if (error || !ch) return;
    let badges = '';
    if (ch.badges?.purple) badges += '<span class="verified purple">✓</span>';
    if (ch.badges?.red) badges += '<span class="verified red">✓</span>';
    document.getElementById('chatHeaderTitle').innerHTML = `${ch.name} ${badges}`;
    document.getElementById('chatHeaderSubtitle').textContent = `${ch.subscribers ? ch.subscribers.length : 0} подписчиков`;
    document.getElementById('chatHeaderActions').innerHTML = '';
    let isAdmin = ch.createdBy === currentUser.phone;
    if (!isAdmin) {
        let btn = document.createElement('button');
        btn.textContent = 'Отписаться';
        btn.onclick = async () => {
            let idx = ch.subscribers.indexOf(currentUser.phone);
            if (idx !== -1) ch.subscribers.splice(idx, 1);
            await supabaseClient
                .from('channels')
                .update({ subscribers: ch.subscribers })
                .eq('id', ch.id);
            renderChannelsList();
            clearChatArea();
        };
        document.getElementById('chatHeaderActions').appendChild(btn);
    } else {
        let settingsBtn = document.createElement('button');
        settingsBtn.textContent = '⚙️ Настройки';
        settingsBtn.onclick = () => {
            document.getElementById('channelSettingsName').value = ch.name;
            document.getElementById('channelSettingsUsername').value = ch.username || '';
            document.getElementById('channelSettingsModal').style.display = 'flex';
            window.currentChannelForSettings = ch.id;
        };
        document.getElementById('chatHeaderActions').appendChild(settingsBtn);
    }
    subscribeToMessages(chId);
    if (isAdmin) {
        document.getElementById('chatInput').style.display = 'flex';
        document.getElementById('messageInput').disabled = false;
        document.getElementById('sendButton').disabled = false;
    } else {
        document.getElementById('chatInput').style.display = 'none';
    }
}

// ================== НАСТРОЙКИ КАНАЛОВ ==================
document.getElementById('saveChannelSettings').onclick = async () => {
    let chId = window.currentChannelForSettings;
    if (!chId) return;
    let name = document.getElementById('channelSettingsName').value.trim();
    let username = document.getElementById('channelSettingsUsername').value.trim().toLowerCase();
    let avatar = null;
    if (document.getElementById('channelSettingsAvatarInput').files[0]) {
        let reader = new FileReader();
        reader.onload = async ev => {
            avatar = ev.target.result;
            await updateChannel(chId, name, username, avatar);
        };
        reader.readAsDataURL(document.getElementById('channelSettingsAvatarInput').files[0]);
    } else {
        await updateChannel(chId, name, username, null);
    }
};

async function updateChannel(chId, name, username, avatar) {
    let updates = {};
    if (name) updates.name = name;
    updates.username = username || null;
    if (avatar) updates.avatar = avatar;

    let { error } = await supabaseClient
        .from('channels')
        .update(updates)
        .eq('id', chId);

    if (error) {
        alert('Ошибка при сохранении: ' + error.message);
        return;
    }

    document.getElementById('channelSettingsModal').style.display = 'none';
    renderChannelsList();
    switchChannelView(chId);
}

document.getElementById('deleteChannelBtn').onclick = async () => {
    let chId = window.currentChannelForSettings;
    if (!chId) return;
    if (!confirm('Вы уверены, что хотите удалить этот канал? Это действие необратимо.')) return;
    await supabaseClient
        .from('channels')
        .delete()
        .eq('id', chId);
    document.getElementById('channelSettingsModal').style.display = 'none';
    initMode('channels');
    clearChatArea();
};

document.getElementById('closeChannelSettings').onclick = () => {
    document.getElementById('channelSettingsModal').style.display = 'none';
};

document.getElementById('createChannelBtn').addEventListener('click', () => {
    document.getElementById('createChannelModal').style.display = 'flex';
});

document.getElementById('confirmCreateChannel').addEventListener('click', async () => {
    let name = document.getElementById('channelNameInput').value.trim();
    let username = document.getElementById('channelUsernameInput').value.trim().toLowerCase();
    if (!name) return;

    if (username) {
        let { data: existing } = await supabaseClient
            .from('channels')
            .select('id')
            .eq('username', username)
            .maybeSingle();
        if (existing) {
            alert('Этот @юзернейм уже занят');
            return;
        }
    }

    if (document.getElementById('channelAvatarInput').files[0]) {
        let reader = new FileReader();
        reader.onload = async ev => {
            let avatar = ev.target.result;
            await finishCreate(name, username, avatar);
        };
        reader.readAsDataURL(document.getElementById('channelAvatarInput').files[0]);
    } else {
        await finishCreate(name, username, null);
    }
});

async function finishCreate(name, username, avatar) {
    let newCh = {
        name,
        username,
        avatar,
        createdBy: currentUser.phone,
        subscribers: [currentUser.phone],
        badges: {}
    };
    let { data, error } = await supabaseClient
        .from('channels')
        .insert([newCh])
        .select()
        .single();
    if (error) {
        alert('Ошибка создания канала: ' + error.message);
        return;
    }
    document.getElementById('channelNameInput').value = '';
    document.getElementById('channelUsernameInput').value = '';
    document.getElementById('channelAvatarInput').value = '';
    document.getElementById('createChannelModal').style.display = 'none';
    initMode('channels');
    switchChannelView(data.id);
}

document.getElementById('cancelCreateChannel').addEventListener('click', () => {
    document.getElementById('createChannelModal').style.display = 'none';
    document.getElementById('channelNameInput').value = '';
    document.getElementById('channelUsernameInput').value = '';
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
    document.getElementById('channelActions').appendChild(allChannelsBtn);
}

allChannelsBtn.addEventListener('click', async () => {
    let { data: allChannels } = await supabaseClient
        .from('channels')
        .select('*');
    document.getElementById('allChannelsList').innerHTML = '';
    (allChannels || []).forEach(ch => {
        let div = document.createElement('div');
        div.style.padding = '10px'; div.style.borderBottom = '1px solid #2b3945';
        let isSub = ch.subscribers && ch.subscribers.includes(currentUser.phone);
        div.innerHTML = `
            <strong>${ch.name}</strong> (${ch.subscribers ? ch.subscribers.length : 0} подписчиков)<br>
            <small>Создатель: ${ch.createdBy ? ch.createdBy.slice(0,5) + '...' : 'неизвестно'}</small>
        `;
        let btn = document.createElement('button');
        btn.textContent = isSub ? '✓ Подписан' : 'Подписаться';
        btn.disabled = isSub;
        btn.onclick = async () => {
            if (!isSub) {
                if (!ch.subscribers) ch.subscribers = [];
                ch.subscribers.push(currentUser.phone);
                await supabaseClient
                    .from('channels')
                    .update({ subscribers: ch.subscribers })
                    .eq('id', ch.id);
                btn.disabled = true;
                btn.textContent = '✓ Подписан';
                renderChannelsList();
            }
        };
        div.appendChild(btn);
        document.getElementById('allChannelsList').appendChild(div);
    });
    document.getElementById('allChannelsModal').style.display = 'flex';
});

document.getElementById('closeAllChannelsModal').addEventListener('click', () => {
    document.getElementById('allChannelsModal').style.display = 'none';
});

// ================== ДРУЗЬЯ ==================
async function renderFriendsView() {
    ensureFriends(currentUser);
    const friendsView = document.getElementById('friendsView');
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
        document.getElementById('addFriendModal').style.display = 'flex';
        document.getElementById('friendSearchResult').innerHTML = '';
    };
    friendsView.appendChild(addBtn);

    // Мои друзья
    let friendsSection = document.createElement('div');
    friendsSection.className = 'friend-section';
    friendsSection.innerHTML = '<h3>Мои друзья</h3>';
    if (currentUser.friends.list.length === 0) {
        friendsSection.innerHTML += '<p style="color:#8e9aa6;">Список пуст</p>';
    } else {
        const uniquePhones = [...new Set(currentUser.friends.list)];
        let { data: friendsData } = await supabaseClient
            .from('users')
            .select('*')
            .in('phone', uniquePhones);
        if (friendsData) {
            friendsData.forEach(f => friendsCache.set(f.phone, f));
        }
        uniquePhones.forEach(phone => {
            let friend = friendsCache.get(phone);
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
    if (currentUser.friends.incoming.length === 0) {
        incomingSection.innerHTML += '<p style="color:#8e9aa6;">Нет входящих заявок</p>';
    } else {
        for (let phone of currentUser.friends.incoming) {
            let { data: user } = await supabaseClient
                .from('users')
                .select('*')
                .eq('phone', phone)
                .single();
            if (!user) continue;
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
        }
    }
    friendsView.appendChild(incomingSection);

    // Исходящие заявки
    let outgoingSection = document.createElement('div');
    outgoingSection.className = 'friend-section';
    outgoingSection.innerHTML = '<h3>Исходящие заявки</h3>';
    if (currentUser.friends.outgoing.length === 0) {
        outgoingSection.innerHTML += '<p style="color:#8e9aa6;">Нет исходящих заявок</p>';
    } else {
        for (let phone of currentUser.friends.outgoing) {
            let { data: user } = await supabaseClient
                .from('users')
                .select('*')
                .eq('phone', phone)
                .single();
            if (!user) continue;
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
        }
    }
    friendsView.appendChild(outgoingSection);
}

// Поиск друга
document.getElementById('searchFriendBtn').addEventListener('click', async () => {
    ensureFriends(currentUser);
    let username = document.getElementById('friendUsername').value.trim();
    if (username.startsWith('@')) username = username.slice(1);
    if (!username) {
        document.getElementById('friendSearchResult').innerHTML = '<p style="color:#ff9800;">Введите юзернейм</p>';
        return;
    }
    let foundUser = await findUserByUsername(username);

    document.getElementById('friendSearchResult').innerHTML = '';
    if (!foundUser) {
        document.getElementById('friendSearchResult').innerHTML = '<p style="color:#f44336;">Пользователь не найден</p>';
        return;
    }
    if (foundUser.phone === currentUser.phone) {
        document.getElementById('friendSearchResult').innerHTML = '<p style="color:#f44336;">Это вы сами</p>';
        return;
    }
    if (currentUser.friends.list.includes(foundUser.phone)) {
        document.getElementById('friendSearchResult').innerHTML = '<p style="color:#4caf50;">Уже в друзьях</p>';
        return;
    }
    if (currentUser.friends.outgoing.includes(foundUser.phone)) {
        document.getElementById('friendSearchResult').innerHTML = '<p style="color:#ff9800;">Заявка уже отправлена</p>';
        return;
    }
    if (currentUser.friends.incoming.includes(foundUser.phone)) {
        document.getElementById('friendSearchResult').innerHTML = '<p style="color:#ff9800;">Этот пользователь отправил вам заявку. Примите её во входящих.</p>';
        return;
    }

    document.getElementById('addFriendModal').style.display = 'none';
    document.getElementById('friendUsername').value = '';
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

    document.getElementById('sendFriendRequestFromProfileBtn').onclick = async () => {
        await sendFriendRequest(user.phone);
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

async function sendFriendRequest(targetPhone) {
    ensureFriends(currentUser);
    if (!currentUser.friends.outgoing.includes(targetPhone)) {
        currentUser.friends.outgoing.push(targetPhone);
    }
    let { data: targetUser } = await supabaseClient
        .from('users')
        .select('*')
        .eq('phone', targetPhone)
        .single();
    if (targetUser) {
        ensureFriends(targetUser);
        if (!targetUser.friends.incoming.includes(currentUser.phone)) {
            targetUser.friends.incoming.push(currentUser.phone);
        }
        await supabaseClient.from('users').update({ friends: targetUser.friends }).eq('phone', targetPhone);
    }
    await supabaseClient.from('users').update({ friends: currentUser.friends }).eq('phone', currentUser.phone);
    renderFriendsView();
    alert('Заявка отправлена');
}

async function acceptFriendRequest(phone) {
    ensureFriends(currentUser);
    currentUser.friends.incoming = currentUser.friends.incoming.filter(p => p !== phone);
    if (!currentUser.friends.list.includes(phone)) currentUser.friends.list.push(phone);
    let { data: other } = await supabaseClient
        .from('users')
        .select('*')
        .eq('phone', phone)
        .single();
    if (other) {
        ensureFriends(other);
        other.friends.outgoing = other.friends.outgoing.filter(p => p !== currentUser.phone);
        if (!other.friends.list.includes(currentUser.phone)) other.friends.list.push(currentUser.phone);
        await supabaseClient.from('users').update({ friends: other.friends }).eq('phone', phone);
    }
    await supabaseClient.from('users').update({ friends: currentUser.friends }).eq('phone', currentUser.phone);
    renderFriendsView();
    renderContacts();
    alert('Заявка принята');
}

async function rejectFriendRequest(phone) {
    ensureFriends(currentUser);
    currentUser.friends.incoming = currentUser.friends.incoming.filter(p => p !== phone);
    let { data: other } = await supabaseClient
        .from('users')
        .select('*')
        .eq('phone', phone)
        .single();
    if (other) {
        ensureFriends(other);
        other.friends.outgoing = other.friends.outgoing.filter(p => p !== currentUser.phone);
        await supabaseClient.from('users').update({ friends: other.friends }).eq('phone', phone);
    }
    await supabaseClient.from('users').update({ friends: currentUser.friends }).eq('phone', currentUser.phone);
    renderFriendsView();
}

async function cancelFriendRequest(phone) {
    ensureFriends(currentUser);
    currentUser.friends.outgoing = currentUser.friends.outgoing.filter(p => p !== phone);
    let { data: other } = await supabaseClient
        .from('users')
        .select('*')
        .eq('phone', phone)
        .single();
    if (other) {
        ensureFriends(other);
        other.friends.incoming = other.friends.incoming.filter(p => p !== currentUser.phone);
        await supabaseClient.from('users').update({ friends: other.friends }).eq('phone', phone);
    }
    await supabaseClient.from('users').update({ friends: currentUser.friends }).eq('phone', currentUser.phone);
    renderFriendsView();
}

document.getElementById('closeAddFriendModal').addEventListener('click', () => {
    document.getElementById('addFriendModal').style.display = 'none';
    document.getElementById('friendUsername').value = '';
    document.getElementById('friendSearchResult').innerHTML = '';
});

// ================== РЕДАКТИРОВАНИЕ СООБЩЕНИЯ ==================
document.getElementById('saveEditBtn').addEventListener('click', async () => {
    if (editMessageId) {
        let { msg } = editMessageId;
        let newText = document.getElementById('editMessageText').value.trim();
        if (newText) {
            await supabaseClient
                .from('messages')
                .update({ text: newText })
                .eq('id', msg.id);
        }
        document.getElementById('editMessageModal').style.display = 'none';
        editMessageId = null;
    }
});
document.getElementById('cancelEditBtn').addEventListener('click', () => {
    document.getElementById('editMessageModal').style.display = 'none';
    editMessageId = null;
});

// ================== ГОЛОСОВОЙ ВВОД ==================
function initSpeech() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        document.getElementById('micButton').style.display = 'none';
        return;
    }
    let SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    let rec = new SR();
    rec.lang = 'ru-RU';
    rec.interimResults = false;
    document.getElementById('micButton').addEventListener('click', () => {
        document.getElementById('micButton').style.backgroundColor = '#f44336';
        rec.start();
    });
    rec.onresult = e => {
        document.getElementById('messageInput').value = e.results[0][0].transcript;
        document.getElementById('micButton').style.backgroundColor = '';
    };
    rec.onerror = () => document.getElementById('micButton').style.backgroundColor = '';
    rec.onend = () => document.getElementById('micButton').style.backgroundColor = '';
}

// ================== ТЕМА ==================
document.getElementById('themeToggle').addEventListener('click', () => {
    let b = document.body;
    b.classList.toggle('light');
    b.classList.toggle('dark');
    document.getElementById('themeToggle').textContent = b.classList.contains('dark') ? '🌙' : '☀️';
});

function updateStats() {
    // можно реализовать подсчёт подписчиков
}

// ================== ИНИЦИАЛИЗАЦИЯ ==================
document.getElementById('phoneInput').value = '+7';
document.getElementById('passwordInput').value = '';
updateLoginButtonState();
