// Вспомогательные функции

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
    if (app.currentUser && isPremium(app.currentUser)) {
        app.elements.premiumBadgeHeader.style.display = 'inline';
        app.elements.premiumStatus.innerHTML = '⭐ Premium активен';
    } else {
        app.elements.premiumBadgeHeader.style.display = 'none';
        app.elements.premiumStatus.innerHTML = '';
    }
}

function clearChatArea() {
    app.elements.chatHeaderTitle.textContent = 'Выберите чат';
    app.elements.chatHeaderSubtitle.textContent = '';
    app.elements.chatHeaderActions.innerHTML = '';
    app.elements.messagesContainer.innerHTML = '';
    app.elements.chatInput.style.display = 'none';
    app.elements.typingIndicator.textContent = '';
}

// Экспортируем в глобальную область (чтобы было доступно в других модулях)
window.validatePhone = validatePhone;
window.validatePassword = validatePassword;
window.hashPassword = hashPassword;
window.isPremium = isPremium;
window.ensureFriends = ensureFriends;
window.updatePremiumUI = updatePremiumUI;
window.clearChatArea = clearChatArea;
