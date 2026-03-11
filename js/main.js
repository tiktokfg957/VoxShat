// Глобальное состояние приложения
window.app = {
    currentUser: null,
    currentUserPhone: null,
    currentContactId: '',
    currentMode: 'chats',
    unsubscribeMessages: null,
    unsubscribeTyping: null,
    unsubscribeMessageUpdates: null,
    activeTimers: {},
    resetCode: null,
    editMessageId: null,
    replyToMessage: null,
    isLoadingMessages: false,
    hasMoreMessages: true,
    messagesLimit: 30,
    messagesOffset: 0,
    friendsCache: new Map(),
    elements: {}
};

// Функции для работы с localStorage (база данных)
window.loadDB = function() {
    return {
        users: JSON.parse(localStorage.getItem('voxchat_users')) || [],
        messages: JSON.parse(localStorage.getItem('voxchat_messages')) || [],
        channels: JSON.parse(localStorage.getItem('voxchat_channels')) || []
    };
};

window.saveDB = function(db) {
    localStorage.setItem('voxchat_users', JSON.stringify(db.users));
    localStorage.setItem('voxchat_messages', JSON.stringify(db.messages));
    localStorage.setItem('voxchat_channels', JSON.stringify(db.channels));
};

// Функции для работы с пользователями (будут переопределены в auth.js, но здесь нужны для тестового пользователя)
window.findUserByPhone = function(phone) {
    let db = loadDB();
    return db.users.find(u => u.phone === phone);
};

window.findUserByUsername = function(username) {
    let db = loadDB();
    return db.users.find(u => u.username && u.username.toLowerCase() === username.toLowerCase());
};

window.saveUser = function(user) {
    let db = loadDB();
    let index = db.users.findIndex(u => u.phone === user.phone);
    if (index !== -1) {
        db.users[index] = user;
    } else {
        db.users.push(user);
    }
    saveDB(db);
};

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    // Заполняем элементы DOM
    app.elements = {
        loginScreen: document.getElementById('loginScreen'),
        app: document.getElementById('app'),
        phoneInput: document.getElementById('phoneInput'),
        passwordInput: document.getElementById('passwordInput'),
        loginBtn: document.getElementById('loginBtn'),
        loginError: document.getElementById('loginError'),
        forgotPasswordLink: document.getElementById('forgotPasswordLink'),
        userPhoneDisplay: document.getElementById('userPhoneDisplay'),
        premiumBadgeHeader: document.getElementById('premiumBadgeHeader'),
        logoutBtn: document.getElementById('logoutBtn'),
        themeToggle: document.getElementById('themeToggle'),
        chatsModeBtn: document.getElementById('chatsModeBtn'),
        channelsModeBtn: document.getElementById('channelsModeBtn'),
        friendsModeBtn: document.getElementById('friendsModeBtn'),
        profileModeBtn: document.getElementById('profileModeBtn'),
        settingsModeBtn: document.getElementById('settingsModeBtn'),
        contactsListEl: document.getElementById('contactsList'),
        channelsListEl: document.getElementById('channelsList'),
        friendsView: document.getElementById('friendsView'),
        profileView: document.getElementById('profileView'),
        settingsView: document.getElementById('settingsView'),
        profileUsername: document.getElementById('profileUsername'),
        profileName: document.getElementById('profileName'),
        profileAvatar: document.getElementById('profileAvatar'),
        profileAvatarInput: document.getElementById('profileAvatarInput'),
        profileSaveBtn: document.getElementById('profileSaveBtn'),
        showPremiumBtn: document.getElementById('showPremiumBtn'),
        premiumStatus: document.getElementById('premiumStatus'),
        channelActions: document.getElementById('channelActions'),
        createChannelBtn: document.getElementById('createChannelBtn'),
        chatHeaderTitle: document.getElementById('chatHeaderTitle'),
        chatHeaderSubtitle: document.getElementById('chatHeaderSubtitle'),
        typingIndicator: document.getElementById('typingIndicator'),
        chatHeaderActions: document.getElementById('chatHeaderActions'),
        messagesContainer: document.getElementById('messagesContainer'),
        messageInput: document.getElementById('messageInput'),
        sendButton: document.getElementById('sendButton'),
        micButton: document.getElementById('micButton'),
        emojiButton: document.getElementById('emojiButton'),
        emojiPicker: document.getElementById('emojiPicker'),
        attachButton: document.getElementById('attachButton'),
        fileInput: document.getElementById('fileInput'),
        chatInput: document.getElementById('chatInput'),
        createChannelModal: document.getElementById('createChannelModal'),
        channelNameInput: document.getElementById('channelNameInput'),
        channelUsernameInput: document.getElementById('channelUsernameInput'),
        channelAvatarInput: document.getElementById('channelAvatarInput'),
        confirmCreateChannel: document.getElementById('confirmCreateChannel'),
        cancelCreateChannel: document.getElementById('cancelCreateChannel'),
        allChannelsModal: document.getElementById('allChannelsModal'),
        allChannelsList: document.getElementById('allChannelsList'),
        closeAllChannelsModal: document.getElementById('closeAllChannelsModal'),
        registerModal: document.getElementById('registerModal'),
        registerUsername: document.getElementById('registerUsername'),
        registerPassword: document.getElementById('registerPassword'),
        registerPasswordConfirm: document.getElementById('registerPasswordConfirm'),
        confirmRegister: document.getElementById('confirmRegister'),
        cancelRegister: document.getElementById('cancelRegister'),
        registerError: document.getElementById('registerError'),
        resetModal: document.getElementById('resetModal'),
        resetPhone: document.getElementById('resetPhone'),
        resetCodeInput: document.getElementById('resetCode'),
        sendResetCodeBtn: document.getElementById('sendResetCodeBtn'),
        verifyResetBtn: document.getElementById('verifyResetBtn'),
        cancelResetBtn: document.getElementById('cancelResetBtn'),
        newPasswordModal: document.getElementById('newPasswordModal'),
        newPassword: document.getElementById('newPassword'),
        newPasswordConfirm: document.getElementById('newPasswordConfirm'),
        setNewPasswordBtn: document.getElementById('setNewPasswordBtn'),
        cancelNewPasswordBtn: document.getElementById('cancelNewPasswordBtn'),
        statsSubscribers: document.getElementById('statsSubscribers'),
        premiumModal: document.getElementById('premiumModal'),
        closePremiumModal: document.getElementById('closePremiumModal'),
        addFriendModal: document.getElementById('addFriendModal'),
        friendUsername: document.getElementById('friendUsername'),
        searchFriendBtn: document.getElementById('searchFriendBtn'),
        closeAddFriendModal: document.getElementById('closeAddFriendModal'),
        friendSearchResult: document.getElementById('friendSearchResult'),
        editMessageModal: document.getElementById('editMessageModal'),
        editMessageText: document.getElementById('editMessageText'),
        saveEditBtn: document.getElementById('saveEditBtn'),
        cancelEditBtn: document.getElementById('cancelEditBtn'),
        deleteAccountBtn: document.getElementById('deleteAccountBtn'),
        channelSettingsModal: document.getElementById('channelSettingsModal'),
        channelSettingsName: document.getElementById('channelSettingsName'),
        channelSettingsUsername: document.getElementById('channelSettingsUsername'),
        channelSettingsAvatarInput: document.getElementById('channelSettingsAvatarInput'),
        saveChannelSettings: document.getElementById('saveChannelSettings'),
        closeChannelSettings: document.getElementById('closeChannelSettings'),
        deleteChannelBtn: document.getElementById('deleteChannelBtn'),
        channelSearchInput: document.getElementById('channelSearchInput'),
        allChannelsSearch: document.getElementById('allChannelsSearch'),
        openSettingsBtn: document.getElementById('openSettingsBtn'),
        openSettingsAppBtn: document.getElementById('openSettingsAppBtn'),
        styleModal: document.getElementById('styleModal'),
        classicStyleBtn: document.getElementById('classicStyleBtn'),
        voxStyleBtn: document.getElementById('voxStyleBtn'),
        closeStyleModal: document.getElementById('closeStyleModal'),
        selectCountryBtn: document.getElementById('selectCountryBtn'),
        countryModal: document.getElementById('countryModal'),
        countryList: document.getElementById('countryList'),
        closeCountryModal: document.getElementById('closeCountryModal'),
        reactionPickerModal: document.getElementById('reactionPickerModal'),
        closeReactionPicker: document.getElementById('closeReactionPicker'),
        reactionOptions: document.querySelectorAll('.reaction-option')
    };

    // Вызываем инициализацию всех модулей
    if (typeof initAuth === 'function') initAuth();
    if (typeof initFriends === 'function') initFriends();
    if (typeof initChannels === 'function') initChannels();
    if (typeof initChat === 'function') initChat();
    if (typeof initSettings === 'function') initSettings();

    // Создаём тестового пользователя, если база пуста
    let db = loadDB();
    if (db.users.length === 0) {
        let testUser = {
            phone: '+79016135086',
            password: CryptoJS.SHA256('123456').toString(),
            username: 'test',
            name: 'Тестовый',
            avatar: null,
            badges: { blue: false, red: false },
            premiumUntil: null,
            friends: { list: [], incoming: [], outgoing: [] },
            last_seen: new Date().toISOString()
        };
        db.users.push(testUser);
        saveDB(db);
    }

    // Устанавливаем начальные значения полей входа
    app.elements.phoneInput.value = '+7';
    app.elements.passwordInput.value = '';
    if (typeof updateLoginButtonState === 'function') updateLoginButtonState();
});
