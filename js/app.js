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
    const premiumBadgeHeader = document.getElementById('premiumBadgeHeader');
    const premiumStatus = document.getElementById('premiumStatus');
    if (currentUser && isPremium(currentUser)) {
        if (premiumBadgeHeader) premiumBadgeHeader.style.display = 'inline';
        if (premiumStatus) premiumStatus.innerHTML = '⭐ Premium активен';
    } else {
        if (premiumBadgeHeader) premiumBadgeHeader.style.display = 'none';
        if (premiumStatus) premiumStatus.innerHTML = '';
    }
}
function clearChatArea() {
    const chatHeaderTitle = document.getElementById('chatHeaderTitle');
    const chatHeaderSubtitle = document.getElementById('chatHeaderSubtitle');
    const chatHeaderActions = document.getElementById('chatHeaderActions');
    const messagesContainer = document.getElementById('messagesContainer');
    const chatInput = document.getElementById('chatInput');
    const typingIndicator = document.getElementById('typingIndicator');
    if (chatHeaderTitle) chatHeaderTitle.textContent = 'Выберите чат';
    if (chatHeaderSubtitle) chatHeaderSubtitle.textContent = '';
    if (chatHeaderActions) chatHeaderActions.innerHTML = '';
    if (messagesContainer) messagesContainer.innerHTML = '';
    if (chatInput) chatInput.style.display = 'none';
    if (typingIndicator) typingIndicator.textContent = '';
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
    const selectCountryBtn = document.getElementById('selectCountryBtn');
    const phoneInput = document.getElementById('phoneInput');
    if (selectCountryBtn) selectCountryBtn.innerHTML = `${currentCountry.flag} ${currentCountry.name} (${currentCountry.code}) ▼`;
    if (phoneInput) phoneInput.value = currentCountry.code;
}
function populateCountryList() {
    const list = document.getElementById('countryList');
    if (!list) return;
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
            const countryModal = document.getElementById('countryModal');
            if (countryModal) countryModal.style.display = 'none';
        };
        list.appendChild(btn);
    });
}
const selectCountryBtn = document.getElementById('selectCountryBtn');
if (selectCountryBtn) {
    selectCountryBtn.onclick = () => {
        const countryModal = document.getElementById('countryModal');
        if (countryModal) countryModal.style.display = 'flex';
    };
}
const closeCountryModal = document.getElementById('closeCountryModal');
if (closeCountryModal) {
    closeCountryModal.onclick = () => {
        const countryModal = document.getElementById('countryModal');
        if (countryModal) countryModal.style.display = 'none';
    };
}
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
if (emojiPicker) {
    emojis.forEach(e => {
        let s = document.createElement('span');
        s.textContent = e;
        s.onclick = () => {
            const messageInput = document.getElementById('messageInput');
            if (messageInput) messageInput.value += e;
        };
        emojiPicker.appendChild(s);
    });
}

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

const openSettingsBtn = document.getElementById('openSettingsBtn');
const openSettingsAppBtn = document.getElementById('openSettingsAppBtn');
const styleModal = document.getElementById('styleModal');
if (openSettingsBtn) openSettingsBtn.onclick = () => { if (styleModal) styleModal.style.display = 'flex'; };
if (openSettingsAppBtn) openSettingsAppBtn.onclick = () => { if (styleModal) styleModal.style.display = 'flex'; };
const classicStyleBtn = document.getElementById('classicStyleBtn');
if (classicStyleBtn) classicStyleBtn.onclick = () => { applyStyle('classic'); if (styleModal) styleModal.style.display = 'none'; };
const voxStyleBtn = document.getElementById('voxStyleBtn');
if (voxStyleBtn) voxStyleBtn.onclick = () => { applyStyle('vox'); if (styleModal) styleModal.style.display = 'none'; };
const closeStyleModal = document.getElementById('closeStyleModal');
if (closeStyleModal) closeStyleModal.onclick = () => { if (styleModal) styleModal.style.display = 'none'; };

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
    const phoneInput = document.getElementById('phoneInput');
    const passwordInput = document.getElementById('passwordInput');
    const loginBtn = document.getElementById('loginBtn');
    const debugInfo = document.getElementById('debugInfo');
    if (!phoneInput || !passwordInput || !loginBtn) return;
    let phoneValid = validatePhone(phoneInput.value);
    let pwdValid = passwordInput.value.length >= 3;
    loginBtn.disabled = !(phoneValid && pwdValid);
    if (debugInfo) debugInfo.innerHTML = 
        `📱 Телефон: ${phoneValid ? '✅' : '❌'}  🔐 Пароль: ${pwdValid ? '✅' : '❌'}`;
}
const phoneInput = document.getElementById('phoneInput');
const passwordInput = document.getElementById('passwordInput');
if (phoneInput) phoneInput.addEventListener('input', updateLoginButtonState);
if (passwordInput) passwordInput.addEventListener('input', updateLoginButtonState);

const loginBtn = document.getElementById('loginBtn');
if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        const phoneInput = document.getElementById('phoneInput');
        const passwordInput = document.getElementById('passwordInput');
        const loginError = document.getElementById('loginError');
        if (!phoneInput || !passwordInput) return;
        let phone = phoneInput.value.trim();
        let pwd = passwordInput.value.trim();
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
                const loginScreen = document.getElementById('loginScreen');
                const app = document.getElementById('app');
                if (loginScreen) loginScreen.classList.add('fade-out');
                setTimeout(() => {
                    if (loginScreen) loginScreen.style.display = 'none';
                    if (app) {
                        app.style.display = 'flex';
                        setTimeout(() => app.classList.add('visible'), 50);
                    }
                }, 300);
                afterLogin(phone);
            } else {
                if (loginError) loginError.textContent = 'Неверный пароль';
            }
        } else {
            // Регистрация
            const registerModal = document.getElementById('registerModal');
            const registerUsername = document.getElementById('registerUsername');
            const registerPassword = document.getElementById('registerPassword');
            const registerPasswordConfirm = document.getElementById('registerPasswordConfirm');
            const registerError = document.getElementById('registerError');
            if (!registerModal || !registerUsername || !registerPassword || !registerPasswordConfirm) return;
            registerModal.style.display = 'flex';
            registerUsername.value = '';
            registerPassword.value = '';
            registerPasswordConfirm.value = '';
            if (registerError) registerError.textContent = '';
            const validateRegForm = () => {
                let username = registerUsername.value.trim();
                let p1 = registerPassword.value;
                let p2 = registerPasswordConfirm.value;
                let usernameValid = username.length >= 3;
                let passwordValid = p1.length >= 6 && /[a-zA-Z]/.test(p1) && /[0-9]/.test(p1) && p1 === p2;
                const confirmRegister = document.getElementById('confirmRegister');
                if (confirmRegister) confirmRegister.disabled = !(usernameValid && passwordValid);
                if (registerError) {
                    if (!usernameValid && username.length > 0) {
                        registerError.textContent = 'Юзернейм должен быть не менее 3 символов';
                    } else if (p1 !== p2 && p2.length > 0) {
                        registerError.textContent = 'Пароли не совпадают';
                    } else if (!passwordValid && p1.length > 0) {
                        registerError.textContent = 'Пароль: минимум 6 символов, буквы и цифры';
                    } else {
                        registerError.textContent = '';
                    }
                }
            };
            registerUsername.addEventListener('input', validateRegForm);
            registerPassword.addEventListener('input', validateRegForm);
            registerPasswordConfirm.addEventListener('input', validateRegForm);
            const confirmRegister = document.getElementById('confirmRegister');
            if (confirmRegister) {
                confirmRegister.onclick = async () => {
                    let username = registerUsername.value.trim().toLowerCase();
                    let p1 = registerPassword.value;
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
                    registerModal.style.display = 'none';
                    const loginScreen = document.getElementById('loginScreen');
                    if (loginScreen) loginScreen.classList.add('fade-out');
                    setTimeout(() => {
                        if (loginScreen) loginScreen.style.display = 'none';
                        const app = document.getElementById('app');
                        if (app) {
                            app.style.display = 'flex';
                            setTimeout(() => app.classList.add('visible'), 50);
                        }
                    }, 300);
                    afterLogin(phone);
                };
            }
            const cancelRegister = document.getElementById('cancelRegister');
            if (cancelRegister) {
                cancelRegister.onclick = () => { registerModal.style.display = 'none'; };
            }
        }
    });
}

async function afterLogin(phone) {
    ensureFriends(currentUser);
    currentUserPhone = phone;
    const userPhoneDisplay = document.getElementById('userPhoneDisplay');
    if (userPhoneDisplay) userPhoneDisplay.textContent = phone.length > 10 ? phone.slice(0,10)+'…' : phone;
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
        const chatHeaderTitle = document.getElementById('chatHeaderTitle');
        const chatHeaderSubtitle = document.getElementById('chatHeaderSubtitle');
        if (chatHeaderTitle) chatHeaderTitle.textContent = 'Нет чатов';
        if (chatHeaderSubtitle) chatHeaderSubtitle.textContent = 'Добавьте друзей, чтобы начать общение';
    }
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        const app = document.getElementById('app');
        const loginScreen = document.getElementById('loginScreen');
        if (app) app.classList.remove('visible');
        setTimeout(() => {
            if (app) app.style.display = 'none';
            if (loginScreen) {
                loginScreen.style.display = 'block';
                loginScreen.classList.remove('fade-out');
            }
        }, 300);
        const phoneInput = document.getElementById('phoneInput');
        const passwordInput = document.getElementById('passwordInput');
        const loginBtn = document.getElementById('loginBtn');
        const loginError = document.getElementById('loginError');
        if (phoneInput) phoneInput.value = '+7';
        if (passwordInput) passwordInput.value = '';
        if (loginBtn) loginBtn.disabled = true;
        if (loginError) loginError.textContent = '';
        if (unsubscribeMessages && unsubscribeMessages.unsubscribe) unsubscribeMessages.unsubscribe();
        if (unsubscribeTyping && unsubscribeTyping.unsubscribe) unsubscribeTyping.unsubscribe();
        if (unsubscribeMessageUpdates && unsubscribeMessageUpdates.unsubscribe) unsubscribeMessageUpdates.unsubscribe();
        currentUser = null;
        currentUserPhone = null;
        const debugInfo = document.getElementById('debugInfo');
        if (debugInfo) debugInfo.innerHTML = '';
    });
}

// ================== ЗАБЫЛИ ПАРОЛЬ ==================
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        const resetModal = document.getElementById('resetModal');
        const resetPhone = document.getElementById('resetPhone');
        const resetCodeInput = document.getElementById('resetCodeInput');
        if (resetModal) resetModal.style.display = 'flex';
        if (resetPhone) resetPhone.value = '+7';
        if (resetCodeInput) resetCodeInput.value = '';
        resetCode = null;
    });
}
const sendResetCodeBtn = document.getElementById('sendResetCodeBtn');
if (sendResetCodeBtn) {
    sendResetCodeBtn.addEventListener('click', () => {
        const resetPhone = document.getElementById('resetPhone');
        if (!resetPhone) return;
        let phone = resetPhone.value.trim();
        if (validatePhone(phone)) {
            resetCode = Math.floor(1000 + Math.random() * 9000).toString();
            alert(`Код подтверждения: ${resetCode}`);
        } else {
            alert('Введите корректный номер');
        }
    });
}
const verifyResetBtn = document.getElementById('verifyResetBtn');
if (verifyResetBtn) {
    verifyResetBtn.addEventListener('click', () => {
        const resetPhone = document.getElementById('resetPhone');
        const resetCodeInput = document.getElementById('resetCodeInput');
        if (!resetPhone || !resetCodeInput) return;
        let phone = resetPhone.value.trim();
        let code = resetCodeInput.value.trim();
        if (!validatePhone(phone)) { alert('Некорректный номер'); return; }
        if (code !== resetCode) { alert('Неверный код'); return; }
        window.resetPhoneForPassword = phone;
        const resetModal = document.getElementById('resetModal');
        const newPasswordModal = document.getElementById('newPasswordModal');
        if (resetModal) resetModal.style.display = 'none';
        if (newPasswordModal) newPasswordModal.style.display = 'flex';
    });
}
const cancelResetBtn = document.getElementById('cancelResetBtn');
if (cancelResetBtn) {
    cancelResetBtn.addEventListener('click', () => {
        const resetModal = document.getElementById('resetModal');
        if (resetModal) resetModal.style.display = 'none';
    });
}
const setNewPasswordBtn = document.getElementById('setNewPasswordBtn');
if (setNewPasswordBtn) {
    setNewPasswordBtn.addEventListener('click', async () => {
        const newPassword = document.getElementById('newPassword');
        const newPasswordConfirm = document.getElementById('newPasswordConfirm');
        if (!newPassword || !newPasswordConfirm) return;
        let p1 = newPassword.value;
        let p2 = newPasswordConfirm.value;
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
        const newPasswordModal = document.getElementById('newPasswordModal');
        if (newPasswordModal) newPasswordModal.style.display = 'none';
        newPassword.value = '';
        newPasswordConfirm.value = '';
    });
}
const cancelNewPasswordBtn = document.getElementById('cancelNewPasswordBtn');
if (cancelNewPasswordBtn) {
    cancelNewPasswordBtn.addEventListener('click', () => {
        const newPasswordModal = document.getElementById('newPasswordModal');
        if (newPasswordModal) newPasswordModal.style.display = 'none';
    });
}

// ================== ПРОФИЛЬ ==================
const profileAvatarInput = document.getElementById('profileAvatarInput');
if (profileAvatarInput) {
    profileAvatarInput.onchange = function(e) {
        let file = e.target.files[0];
        if (file) {
            let reader = new FileReader();
            reader.onload = ev => {
                const profileAvatar = document.getElementById('profileAvatar');
                if (profileAvatar) profileAvatar.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
                currentUser.avatar = ev.target.result;
            };
            reader.readAsDataURL(file);
        }
    };
}
const profileSaveBtn = document.getElementById('profileSaveBtn');
if (profileSaveBtn) {
    profileSaveBtn.addEventListener('click', async () => {
        const profileUsername = document.getElementById('profileUsername');
        const profileName = document.getElementById('profileName');
        if (!profileUsername || !profileName) return;
        let newUsername = profileUsername.value.trim().toLowerCase();
        if (newUsername !== currentUser.username) {
            let existing = await findUserByUsername(newUsername);
            if (existing && existing.phone !== currentUser.phone) {
                alert('Этот @юзернейм уже занят');
                return;
            }
        }
        currentUser.username = newUsername;
        currentUser.name = profileName.value.trim();
        await saveUser(currentUser);
        alert('Сохранено');
        renderContacts();
    });
}
function loadProfileToForm() {
    const profileUsername = document.getElementById('profileUsername');
    const profileName = document.getElementById('profileName');
    const profileAvatar = document.getElementById('profileAvatar');
    if (profileUsername) profileUsername.value = currentUser.username || '';
    if (profileName) profileName.value = currentUser.name || '';
    if (profileAvatar) {
        if (currentUser.avatar) {
            profileAvatar.innerHTML = `<img src="${currentUser.avatar}" style="width:100%;height:100%;object-fit:cover;">`;
        } else {
            profileAvatar.innerHTML = '<span>👤</span>';
        }
    }
}

// ================== PREMIUM ==================
const showPremiumBtn = document.getElementById('showPremiumBtn');
const closePremiumModal = document.getElementById('closePremiumModal');
const premiumModal = document.getElementById('premiumModal');
if (showPremiumBtn) showPremiumBtn.addEventListener('click', () => { if (premiumModal) premiumModal.style.display = 'flex'; });
if (closePremiumModal) closePremiumModal.addEventListener('click', () => { if (premiumModal) premiumModal.style.display = 'none'; });
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
            if (premiumModal) premiumModal.style.display = 'none';
            alert('Premium активирован!');
            renderContacts();
        }
    });
});

// ================== УДАЛЕНИЕ АККАУНТА ==================
const deleteAccountBtn = document.getElementById('deleteAccountBtn');
if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', async () => {
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
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.click();
    });
}

// ================== ПЕРЕКЛЮЧЕНИЕ РЕЖИМОВ ==================
function initMode(mode) {
    currentMode = mode;
    const chatsModeBtn = document.getElementById('chatsModeBtn');
    const channelsModeBtn = document.getElementById('channelsModeBtn');
    const friendsModeBtn = document.getElementById('friendsModeBtn');
    const profileModeBtn = document.getElementById('profileModeBtn');
    const settingsModeBtn = document.getElementById('settingsModeBtn');
    const contactsList = document.getElementById('contactsList');
    const channelsList = document.getElementById('channelsList');
    const friendsView = document.getElementById('friendsView');
    const profileView = document.getElementById('profileView');
    const settingsView = document.getElementById('settingsView');
    const channelActions = document.getElementById('channelActions');
    [chatsModeBtn, channelsModeBtn, friendsModeBtn, profileModeBtn, settingsModeBtn].forEach(b => { if (b) b.classList.remove('active'); });
    if (contactsList) contactsList.style.display = 'none';
    if (channelsList) channelsList.style.display = 'none';
    if (friendsView) friendsView.style.display = 'none';
    if (profileView) profileView.style.display = 'none';
    if (settingsView) settingsView.style.display = 'none';
    if (channelActions) channelActions.style.display = 'none';

    if (mode === 'chats') {
        if (chatsModeBtn) chatsModeBtn.classList.add('active');
        if (contactsList) contactsList.style.display = 'block';
        renderContacts();
        if (!currentContactId || currentContactId === '') {
            if (currentUser && currentUser.friends && currentUser.friends.list.length > 0) {
                switchContact(currentUser.friends.list[0]);
            } else {
                clearChatArea();
                const chatHeaderTitle = document.getElementById('chatHeaderTitle');
                const chatHeaderSubtitle = document.getElementById('chatHeaderSubtitle');
                if (chatHeaderTitle) chatHeaderTitle.textContent = 'Нет чатов';
                if (chatHeaderSubtitle) chatHeaderSubtitle.textContent = 'Добавьте друзей, чтобы начать общение';
            }
        }
    } else if (mode === 'channels') {
        if (channelsModeBtn) channelsModeBtn.classList.add('active');
        if (channelsList) channelsList.style.display = 'block';
        if (channelActions) channelActions.style.display = 'flex';
        renderChannelsList();
        clearChatArea();
    } else if (mode === 'friends') {
        if (friendsModeBtn) friendsModeBtn.classList.add('active');
        if (friendsView) friendsView.style.display = 'block';
        ensureFriends(currentUser);
        renderFriendsView();
        clearChatArea();
    } else if (mode === 'profile') {
        if (profileModeBtn) profileModeBtn.classList.add('active');
        if (profileView) profileView.style.display = 'flex';
        loadProfileToForm();
        updatePremiumUI();
        clearChatArea();
    } else if (mode === 'settings') {
        if (settingsModeBtn) settingsModeBtn.classList.add('active');
        if (settingsView) settingsView.style.display = 'flex';
        updateStats();
        clearChatArea();
    }
}

const chatsModeBtn = document.getElementById('chatsModeBtn');
const channelsModeBtn = document.getElementById('channelsModeBtn');
const friendsModeBtn = document.getElementById('friendsModeBtn');
const profileModeBtn = document.getElementById('profileModeBtn');
const settingsModeBtn = document.getElementById('settingsModeBtn');
if (chatsModeBtn) chatsModeBtn.onclick = () => initMode('chats');
if (channelsModeBtn) channelsModeBtn.onclick = () => initMode('channels');
if (friendsModeBtn) friendsModeBtn.onclick = () => initMode('friends');
if (profileModeBtn) profileModeBtn.onclick = () => initMode('profile');
if (settingsModeBtn) settingsModeBtn.onclick = () => initMode('settings');

// ================== КОНТАКТЫ ==================
async function renderContacts() {
    const contactsList = document.getElementById('contactsList');
    if (!contactsList) return;
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
        const chatHeaderTitle = document.getElementById('chatHeaderTitle');
        if (chatHeaderTitle) chatHeaderTitle.innerHTML = `${friend.name || friend.username || id} ${badges}`;
        let status = 'онлайн';
        if (friend.last_seen) {
            let diff = Date.now() - new Date(friend.last_seen).getTime();
            if (diff > 120000) {
                let date = new Date(friend.last_seen);
                status = 'был ' + date.toLocaleTimeString().slice(0,5);
            }
        }
        const chatHeaderSubtitle = document.getElementById('chatHeaderSubtitle');
        if (chatHeaderSubtitle) chatHeaderSubtitle.textContent = status;
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
                const chatHeaderTitle = document.getElementById('chatHeaderTitle');
                if (chatHeaderTitle) chatHeaderTitle.innerHTML = `${data.name || data.username || id} ${badges}`;
                let status = 'онлайн';
                if (data.last_seen) {
                    let diff = Date.now() - new Date(data.last_seen).getTime();
                    if (diff > 120000) {
                        let date = new Date(data.last_seen);
                        status = 'был ' + date.toLocaleTimeString().slice(0,5);
                    }
                }
                const chatHeaderSubtitle = document.getElementById('chatHeaderSubtitle');
                if (chatHeaderSubtitle) chatHeaderSubtitle.textContent = status;
            }
        })();
    }
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) typingIndicator.textContent = '';
    subscribeToMessages(id);
    subscribeToTyping(id);
    const chatHeaderActions = document.getElementById('chatHeaderActions');
    if (chatHeaderActions) chatHeaderActions.innerHTML = '';
    const chatInput = document.getElementById('chatInput');
    if (chatInput) chatInput.style.display = 'flex';
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    if (messageInput) messageInput.disabled = false;
    if (sendButton) sendButton.disabled = false;
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
                    const typingIndicator = document.getElementById('typingIndicator');
                    if (typingIndicator) typingIndicator.textContent = 'печатает...';
                    clearTimeout(activeTimers.typing);
                    activeTimers.typing = setTimeout(() => {
                        if (typingIndicator) typingIndicator.textContent = '';
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

const messageInput = document.getElementById('messageInput');
if (messageInput) {
    messageInput.addEventListener('input', () => {
        sendTyping();
    });
}

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
    if (!messagesContainer) return;
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
    const chatInput = document.getElementById('chatInput');
    if (!chatInput) return;
    chatInput.parentNode.insertBefore(bar, chatInput);
    document.getElementById('cancelReplyBtn').onclick = () => {
        bar.remove();
        replyToMessage = null;
        const messageInput = document.getElementById('messageInput');
        if (messageInput) messageInput.placeholder = 'Сообщение...';
    };
    const messageInput = document.getElementById('messageInput');
    if (messageInput) messageInput.placeholder = 'Ваш ответ...';
}

function appendMessage(msg) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;
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
        const reactionPickerModal = document.getElementById('reactionPickerModal');
        if (reactionPickerModal) reactionPickerModal.style.display = 'flex';
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
    if (!messagesContainer) return;
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
        const reactionPickerModal = document.getElementById('reactionPickerModal');
        if (reactionPickerModal) reactionPickerModal.style.display = 'flex';
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
            const reactionPickerModal = document.getElementById('reactionPickerModal');
            if (reactionPickerModal) reactionPickerModal.style.display = 'none';
            currentReactionMsg = null;
            showFloatingReaction(reaction, window.innerWidth/2, window.innerHeight/2);
        } catch (error) {
            console.error('Ошибка при обновлении реакции:', error);
            alert('Не удалось поставить реакцию.');
        }
    };
});
const closeReactionPicker = document.getElementById('closeReactionPicker');
if (closeReactionPicker) {
    closeReactionPicker.onclick = () => {
        const reactionPickerModal = document.getElementById('reactionPickerModal');
        if (reactionPickerModal) reactionPickerModal.style.display = 'none';
        currentReactionMsg = null;
    };
}

// ================== ОТПРАВКА СООБЩЕНИЯ ==================
const sendButton = document.getElementById('sendButton');
if (sendButton) {
    sendButton.onclick = async () => {
        const messageInput = document.getElementById('messageInput');
        if (!messageInput) return;
        let text = messageInput.value.trim();
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

        messageInput.value = '';
        let bar = document.getElementById('replyBar');
        if (bar) bar.remove();
        replyToMessage = null;
        messageInput.placeholder = 'Сообщение...';
    };
}

// Обработчик нажатия Enter (используем уже объявленный messageInput)
if (messageInput) {
    messageInput.onkeypress = e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const sendButton = document.getElementById('sendButton');
            if (sendButton) sendButton.click();
        }
    };
}

// ================== ПРОКРУТКА ДЛЯ ПАГИНАЦИИ ==================
const messagesContainer = document.getElementById('messagesContainer');
if (messagesContainer) {
    messagesContainer.addEventListener('scroll', () => {
        if (messagesContainer.scrollTop === 0 && hasMoreMessages && !isLoadingMessages) {
            loadMessages(getChatId(currentContactId), true);
        }
    });
}

// ================== КАНАЛЫ ==================
async function renderChannelsList(searchTerm = '') {
    const channelsList = document.getElementById('channelsList');
    if (!channelsList) return;
    let { data: channels, error } = await supabaseClient
        .from('channels')
        .select('*');
    if (error) {
        console.error('Ошибка загрузки каналов:', error);
        channelsList.innerHTML = '<div style="padding:20px;text-align:center;color:#f44336;">Ошибка загрузки каналов</div>';
        return;
    }
    let filtered = (channels || []).filter(ch => 
        ch.subscribers && ch.subscribers.includes(currentUser.phone) &&
        (ch.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
         (ch.username && ch.username.toLowerCase().includes(searchTerm.toLowerCase())))
    );
    channelsList.innerHTML = '';
    if (!filtered.length) {
        channelsList.innerHTML = '<div style="padding:20px;text-align:center;color:#8e9aa6;">Нет каналов</div>';
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
        channelsList.appendChild(div);
    });
}

const channelSearchInput = document.getElementById('channelSearchInput');
if (channelSearchInput) {
    channelSearchInput.addEventListener('input', (e) => {
        renderChannelsList(e.target.value);
    });
}

async function switchChannelView(chId) {
    if (unsubscribeMessages && unsubscribeMessages.unsubscribe) unsubscribeMessages.unsubscribe();
    if (unsubscribeTyping && unsubscribeTyping.unsubscribe) unsubscribeTyping.unsubscribe();
    if (unsubscribeMessageUpdates && unsubscribeMessageUpdates.unsubscribe) unsubscribeMessageUpdates.unsubscribe();

    currentContactId = String(chId);
    messagesOffset = 0;
    hasMoreMessages = true;
    renderChannelsList(document.getElementById('channelSearchInput')?.value || '');
    let { data: ch, error } = await supabaseClient
        .from('channels')
        .select('*')
        .eq('id', chId)
        .single();
    if (error || !ch) return;
    let badges = '';
    if (ch.badges?.purple) badges += '<span class="verified purple">✓</span>';
    if (ch.badges?.red) badges += '<span class="verified red">✓</span>';
    const chatHeaderTitle = document.getElementById('chatHeaderTitle');
    if (chatHeaderTitle) chatHeaderTitle.innerHTML = `${ch.name} ${badges}`;
    const chatHeaderSubtitle = document.getElementById('chatHeaderSubtitle');
    if (chatHeaderSubtitle) chatHeaderSubtitle.textContent = `${ch.subscribers ? ch.subscribers.length : 0} подписчиков`;
    const chatHeaderActions = document.getElementById('chatHeaderActions');
    if (chatHeaderActions) chatHeaderActions.innerHTML = '';
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
        if (chatHeaderActions) chatHeaderActions.appendChild(btn);
    } else {
        let settingsBtn = document.createElement('button');
        settingsBtn.textContent = '⚙️ Настройки';
        settingsBtn.onclick = () => {
            const channelSettingsName = document.getElementById('channelSettingsName');
            const channelSettingsUsername = document.getElementById('channelSettingsUsername');
            const channelSettingsModal = document.getElementById('channelSettingsModal');
            if (channelSettingsName) channelSettingsName.value = ch.name;
            if (channelSettingsUsername) channelSettingsUsername.value = ch.username || '';
            if (channelSettingsModal) channelSettingsModal.style.display = 'flex';
            window.currentChannelForSettings = ch.id;
        };
        if (chatHeaderActions) chatHeaderActions.appendChild(settingsBtn);
    }
    subscribeToMessages(chId);
    const chatInput = document.getElementById('chatInput');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    if (isAdmin) {
        if (chatInput) chatInput.style.display = 'flex';
        if (messageInput) messageInput.disabled = false;
        if (sendButton) sendButton.disabled = false;
    } else {
        if (chatInput) chatInput.style.display = 'none';
    }
}

// ================== НАСТРОЙКИ КАНАЛОВ ==================
const saveChannelSettings = document.getElementById('saveChannelSettings');
if (saveChannelSettings) {
    saveChannelSettings.onclick = async () => {
        let chId = window.currentChannelForSettings;
        if (!chId) return;
        const channelSettingsName = document.getElementById('channelSettingsName');
        const channelSettingsUsername = document.getElementById('channelSettingsUsername');
        const channelSettingsAvatarInput = document.getElementById('channelSettingsAvatarInput');
        if (!channelSettingsName || !channelSettingsUsername) return;
        let name = channelSettingsName.value.trim();
        let username = channelSettingsUsername.value.trim().toLowerCase();
        let avatar = null;
        if (channelSettingsAvatarInput && channelSettingsAvatarInput.files[0]) {
            let reader = new FileReader();
            reader.onload = async ev => {
                avatar = ev.target.result;
                await updateChannel(chId, name, username, avatar);
            };
            reader.readAsDataURL(channelSettingsAvatarInput.files[0]);
        } else {
            await updateChannel(chId, name, username, null);
        }
    };
}

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

    const channelSettingsModal = document.getElementById('channelSettingsModal');
    if (channelSettingsModal) channelSettingsModal.style.display = 'none';
    renderChannelsList();
    switchChannelView(chId);
}

const deleteChannelBtn = document.getElementById('deleteChannelBtn');
if (deleteChannelBtn) {
    deleteChannelBtn.onclick = async () => {
        let chId = window.currentChannelForSettings;
        if (!chId) return;
        if (!confirm('Вы уверены, что хотите удалить этот канал? Это действие необратимо.')) return;
        await supabaseClient
            .from('channels')
            .delete()
            .eq('id', chId);
        const channelSettingsModal = document.getElementById('channelSettingsModal');
        if (channelSettingsModal) channelSettingsModal.style.display = 'none';
        initMode('channels');
        clearChatArea();
    };
}

const closeChannelSettings = document.getElementById('closeChannelSettings');
if (closeChannelSettings) {
    closeChannelSettings.onclick = () => {
        const channelSettingsModal = document.getElementById('channelSettingsModal');
        if (channelSettingsModal) channelSettingsModal.style.display = 'none';
    };
}

const createChannelBtn = document.getElementById('createChannelBtn');
if (createChannelBtn) {
    createChannelBtn.addEventListener('click', () => {
        const createChannelModal = document.getElementById('createChannelModal');
        if (createChannelModal) createChannelModal.style.display = 'flex';
    });
}

const confirmCreateChannel = document.getElementById('confirmCreateChannel');
if (confirmCreateChannel) {
    confirmCreateChannel.addEventListener('click', async () => {
        const channelNameInput = document.getElementById('channelNameInput');
        const channelUsernameInput = document.getElementById('channelUsernameInput');
        const channelAvatarInput = document.getElementById('channelAvatarInput');
        if (!channelNameInput || !channelUsernameInput) return;
        let name = channelNameInput.value.trim();
        let username = channelUsernameInput.value.trim().toLowerCase();
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

        if (channelAvatarInput && channelAvatarInput.files[0]) {
            let reader = new FileReader();
            reader.onload = async ev => {
                let avatar = ev.target.result;
                await finishCreate(name, username, avatar);
            };
            reader.readAsDataURL(channelAvatarInput.files[0]);
        } else {
            await finishCreate(name, username, null);
        }
    });
}

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
    const channelNameInput = document.getElementById('channelNameInput');
    const channelUsernameInput = document.getElementById('channelUsernameInput');
    const channelAvatarInput = document.getElementById('channelAvatarInput');
    const createChannelModal = document.getElementById('createChannelModal');
    if (channelNameInput) channelNameInput.value = '';
    if (channelUsernameInput) channelUsernameInput.value = '';
    if (channelAvatarInput) channelAvatarInput.value = '';
    if (createChannelModal) createChannelModal.style.display = 'none';
    initMode('channels');
    switchChannelView(data.id);
}

const cancelCreateChannel = document.getElementById('cancelCreateChannel');
if (cancelCreateChannel) {
    cancelCreateChannel.addEventListener('click', () => {
        const createChannelModal = document.getElementById('createChannelModal');
        if (createChannelModal) createChannelModal.style.display = 'none';
        const channelNameInput = document.getElementById('channelNameInput');
        const channelUsernameInput = document.getElementById('channelUsernameInput');
        if (channelNameInput) channelNameInput.value = '';
        if (channelUsernameInput) channelUsernameInput.value = '';
    });
}

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
    const channelActions = document.getElementById('channelActions');
    if (channelActions) channelActions.appendChild(allChannelsBtn);
}
if (allChannelsBtn) {
    allChannelsBtn.addEventListener('click', async () => {
        let { data: allChannels } = await supabaseClient
            .from('channels')
            .select('*');
        const allChannelsList = document.getElementById('allChannelsList');
        if (!allChannelsList) return;
        allChannelsList.innerHTML = '';
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
            allChannelsList.appendChild(div);
        });
        const allChannelsModal = document.getElementById('allChannelsModal');
        if (allChannelsModal) allChannelsModal.style.display = 'flex';
    });
}

const closeAllChannelsModal = document.getElementById('closeAllChannelsModal');
if (closeAllChannelsModal) {
    closeAllChannelsModal.addEventListener('click', () => {
        const allChannelsModal = document.getElementById('allChannelsModal');
        if (allChannelsModal) allChannelsModal.style.display = 'none';
    });
}

// ================== ДРУЗЬЯ ==================
async function renderFriendsView() {
    const friendsView = document.getElementById('friendsView');
    if (!friendsView) return;
    ensureFriends(currentUser);
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
        const addFriendModal = document.getElementById('addFriendModal');
        const friendSearchResult = document.getElementById('friendSearchResult');
        if (addFriendModal) addFriendModal.style.display = 'flex';
        if (friendSearchResult) friendSearchResult.innerHTML = '';
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
const searchFriendBtn = document.getElementById('searchFriendBtn');
if (searchFriendBtn) {
    searchFriendBtn.addEventListener('click', async () => {
        ensureFriends(currentUser);
        const friendUsername = document.getElementById('friendUsername');
        const friendSearchResult = document.getElementById('friendSearchResult');
        if (!friendUsername || !friendSearchResult) return;
        let username = friendUsername.value.trim();
        if (username.startsWith('@')) username = username.slice(1);
        if (!username) {
            friendSearchResult.innerHTML = '<p style="color:#ff9800;">Введите юзернейм</p>';
            return;
        }
        let foundUser = await findUserByUsername(username);

        friendSearchResult.innerHTML = '';
        if (!foundUser) {
            friendSearchResult.innerHTML = '<p style="color:#f44336;">Пользователь не найден</p>';
            return;
        }
        if (foundUser.phone === currentUser.phone) {
            friendSearchResult.innerHTML = '<p style="color:#f44336;">Это вы сами</p>';
            return;
        }
        if (currentUser.friends.list.includes(foundUser.phone)) {
            friendSearchResult.innerHTML = '<p style="color:#4caf50;">Уже в друзьях</p>';
            return;
        }
        if (currentUser.friends.outgoing.includes(foundUser.phone)) {
            friendSearchResult.innerHTML = '<p style="color:#ff9800;">Заявка уже отправлена</p>';
            return;
        }
        if (currentUser.friends.incoming.includes(foundUser.phone)) {
            friendSearchResult.innerHTML = '<p style="color:#ff9800;">Этот пользователь отправил вам заявку. Примите её во входящих.</p>';
            return;
        }

        const addFriendModal = document.getElementById('addFriendModal');
        if (addFriendModal) addFriendModal.style.display = 'none';
        friendUsername.value = '';
        showUserProfile(foundUser);
    });
}

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

const closeAddFriendModal = document.getElementById('closeAddFriendModal');
if (closeAddFriendModal) {
    closeAddFriendModal.addEventListener('click', () => {
        const addFriendModal = document.getElementById('addFriendModal');
        const friendUsername = document.getElementById('friendUsername');
        const friendSearchResult = document.getElementById('friendSearchResult');
        if (addFriendModal) addFriendModal.style.display = 'none';
        if (friendUsername) friendUsername.value = '';
        if (friendSearchResult) friendSearchResult.innerHTML = '';
    });
}

// ================== РЕДАКТИРОВАНИЕ СООБЩЕНИЯ ==================
const saveEditBtn = document.getElementById('saveEditBtn');
if (saveEditBtn) {
    saveEditBtn.addEventListener('click', async () => {
        if (editMessageId) {
            let { msg } = editMessageId;
            const editMessageText = document.getElementById('editMessageText');
            if (!editMessageText) return;
            let newText = editMessageText.value.trim();
            if (newText) {
                await supabaseClient
                    .from('messages')
                    .update({ text: newText })
                    .eq('id', msg.id);
            }
            const editMessageModal = document.getElementById('editMessageModal');
            if (editMessageModal) editMessageModal.style.display = 'none';
            editMessageId = null;
        }
    });
}
const cancelEditBtn = document.getElementById('cancelEditBtn');
if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
        const editMessageModal = document.getElementById('editMessageModal');
        if (editMessageModal) editMessageModal.style.display = 'none';
        editMessageId = null;
    });
}

// ================== ГОЛОСОВОЙ ВВОД ==================
function initSpeech() {
    const micButton = document.getElementById('micButton');
    if (!micButton) return;
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        micButton.style.display = 'none';
        return;
    }
    let SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    let rec = new SR();
    rec.lang = 'ru-RU';
    rec.interimResults = false;
    micButton.addEventListener('click', () => {
        micButton.style.backgroundColor = '#f44336';
        rec.start();
    });
    rec.onresult = e => {
        const messageInput = document.getElementById('messageInput');
        if (messageInput) messageInput.value = e.results[0][0].transcript;
        micButton.style.backgroundColor = '';
    };
    rec.onerror = () => micButton.style.backgroundColor = '';
    rec.onend = () => micButton.style.backgroundColor = '';
}

// ================== ТЕМА ==================
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        let b = document.body;
        b.classList.toggle('light');
        b.classList.toggle('dark');
        themeToggle.textContent = b.classList.contains('dark') ? '🌙' : '☀️';
    });
}

function updateStats() {
    // можно реализовать подсчёт подписчиков
}

// ================== ИНИЦИАЛИЗАЦИЯ ==================
document.getElementById('phoneInput').value = '+7';
document.getElementById('passwordInput').value = '';
updateLoginButtonState();
