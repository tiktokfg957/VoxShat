// Авторизация: вход, регистрация, сброс пароля

function updateLoginButtonState() {
    let phoneValid = validatePhone(app.elements.phoneInput.value);
    let pwdValid = app.elements.passwordInput.value.length >= 3;
    app.elements.loginBtn.disabled = !(phoneValid && pwdValid);
    document.getElementById('debugInfo').innerHTML = 
        `📱 Телефон: ${phoneValid ? '✅' : '❌'}  🔐 Пароль: ${pwdValid ? '✅' : '❌'}`;
}

function afterLogin(phone) {
    ensureFriends(app.currentUser);
    app.currentUserPhone = phone;
    app.elements.userPhoneDisplay.textContent = phone.length > 10 ? phone.slice(0,10)+'…' : phone;
    updatePremiumUI();
    initMode('chats');
    initSpeech();
    loadProfileToForm();
    renderContacts();
    renderFriendsView();
    renderChannelsList();
    if (app.currentUser.friends.list.length > 0) {
        switchContact(app.currentUser.friends.list[0]);
    } else {
        clearChatArea();
        app.elements.chatHeaderTitle.textContent = 'Нет чатов';
        app.elements.chatHeaderSubtitle.textContent = 'Добавьте друзей, чтобы начать общение';
    }
}

function initAuth() {
    app.elements.phoneInput.addEventListener('input', updateLoginButtonState);
    app.elements.passwordInput.addEventListener('input', updateLoginButtonState);

    app.elements.loginBtn.addEventListener('click', () => {
        let phone = app.elements.phoneInput.value.trim();
        let pwd = app.elements.passwordInput.value.trim();
        if (!validatePhone(phone) || pwd.length < 3) return;

        let user = findUserByPhone(phone);
        if (user) {
            let hashed = hashPassword(pwd);
            if (user.password === pwd || user.password === hashed) {
                if (user.password === pwd) {
                    user.password = hashed;
                    saveUser(user);
                }
                app.currentUser = user;
                app.elements.loginScreen.classList.add('fade-out');
                setTimeout(() => {
                    app.elements.loginScreen.style.display = 'none';
                    app.elements.app.style.display = 'flex';
                    setTimeout(() => app.elements.app.classList.add('visible'), 50);
                }, 300);
                afterLogin(phone);
            } else {
                app.elements.loginError.textContent = 'Неверный пароль';
            }
        } else {
            // Регистрация
            app.elements.registerModal.style.display = 'flex';
            app.elements.registerUsername.value = '';
            app.elements.registerPassword.value = '';
            app.elements.registerPasswordConfirm.value = '';
            app.elements.registerError.textContent = '';
            const validateRegForm = () => {
                let username = app.elements.registerUsername.value.trim();
                let p1 = app.elements.registerPassword.value;
                let p2 = app.elements.registerPasswordConfirm.value;
                let usernameValid = username.length >= 3;
                let passwordValid = p1.length >= 6 && /[a-zA-Z]/.test(p1) && /[0-9]/.test(p1) && p1 === p2;
                app.elements.confirmRegister.disabled = !(usernameValid && passwordValid);
                if (!usernameValid && username.length > 0) {
                    app.elements.registerError.textContent = 'Юзернейм должен быть не менее 3 символов';
                } else if (p1 !== p2 && p2.length > 0) {
                    app.elements.registerError.textContent = 'Пароли не совпадают';
                } else if (!passwordValid && p1.length > 0) {
                    app.elements.registerError.textContent = 'Пароль: минимум 6 символов, буквы и цифры';
                } else {
                    app.elements.registerError.textContent = '';
                }
            };
            app.elements.registerUsername.addEventListener('input', validateRegForm);
            app.elements.registerPassword.addEventListener('input', validateRegForm);
            app.elements.registerPasswordConfirm.addEventListener('input', validateRegForm);
            app.elements.confirmRegister.onclick = () => {
                let username = app.elements.registerUsername.value.trim().toLowerCase();
                let p1 = app.elements.registerPassword.value;
                let existing = findUserByUsername(username);
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
                saveUser(newUser);
                app.currentUser = newUser;
                app.elements.registerModal.style.display = 'none';
                app.elements.loginScreen.classList.add('fade-out');
                setTimeout(() => {
                    app.elements.loginScreen.style.display = 'none';
                    app.elements.app.style.display = 'flex';
                    setTimeout(() => app.elements.app.classList.add('visible'), 50);
                }, 300);
                afterLogin(phone);
            };
            app.elements.cancelRegister.onclick = () => { app.elements.registerModal.style.display = 'none'; };
        }
    });

    app.elements.logoutBtn.addEventListener('click', () => {
        app.elements.app.classList.remove('visible');
        setTimeout(() => {
            app.elements.app.style.display = 'none';
            app.elements.loginScreen.style.display = 'block';
            app.elements.loginScreen.classList.remove('fade-out');
        }, 300);
        app.elements.phoneInput.value = '+7';
        app.elements.passwordInput.value = '';
        app.elements.loginBtn.disabled = true;
        app.elements.loginError.textContent = '';
        if (app.unsubscribeMessages && app.unsubscribeMessages.unsubscribe) app.unsubscribeMessages.unsubscribe();
        if (app.unsubscribeTyping && app.unsubscribeTyping.unsubscribe) app.unsubscribeTyping.unsubscribe();
        if (app.unsubscribeMessageUpdates && app.unsubscribeMessageUpdates.unsubscribe) app.unsubscribeMessageUpdates.unsubscribe();
        app.currentUser = null;
        app.currentUserPhone = null;
        document.getElementById('debugInfo').innerHTML = '';
    });

    app.elements.forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        app.elements.resetModal.style.display = 'flex';
        app.elements.resetPhone.value = '+7';
        app.elements.resetCodeInput.value = '';
        app.resetCode = null;
    });

    app.elements.sendResetCodeBtn.addEventListener('click', () => {
        let phone = app.elements.resetPhone.value.trim();
        if (validatePhone(phone)) {
            app.resetCode = Math.floor(1000 + Math.random() * 9000).toString();
            alert(`Код подтверждения: ${app.resetCode}`);
        } else {
            alert('Введите корректный номер');
        }
    });

    app.elements.verifyResetBtn.addEventListener('click', () => {
        let phone = app.elements.resetPhone.value.trim();
        let code = app.elements.resetCodeInput.value.trim();
        if (!validatePhone(phone)) { alert('Некорректный номер'); return; }
        if (code !== app.resetCode) { alert('Неверный код'); return; }
        window.resetPhoneForPassword = phone;
        app.elements.resetModal.style.display = 'none';
        app.elements.newPasswordModal.style.display = 'flex';
    });

    app.elements.cancelResetBtn.addEventListener('click', () => { app.elements.resetModal.style.display = 'none'; });

    app.elements.setNewPasswordBtn.addEventListener('click', () => {
        let p1 = app.elements.newPassword.value;
        let p2 = app.elements.newPasswordConfirm.value;
        if (p1 !== p2) { alert('Пароли не совпадают'); return; }
        if (!validatePassword(p1)) { alert('Пароль должен быть минимум 6 символов, содержать буквы и цифры'); return; }
        let phone = window.resetPhoneForPassword;
        let user = findUserByPhone(phone);
        if (user) {
            let hashed = hashPassword(p1);
            user.password = hashed;
            saveUser(user);
            alert('Пароль успешно изменён');
        }
        app.elements.newPasswordModal.style.display = 'none';
        app.elements.newPassword.value = '';
        app.elements.newPasswordConfirm.value = '';
    });

    app.elements.cancelNewPasswordBtn.addEventListener('click', () => { app.elements.newPasswordModal.style.display = 'none'; });
}

// Функции поиска пользователей (общие)
function findUserByPhone(phone) {
    let db = loadDB();
    return db.users.find(u => u.phone === phone);
}
function findUserByUsername(username) {
    let db = loadDB();
    return db.users.find(u => u.username && u.username.toLowerCase() === username.toLowerCase());
}
function saveUser(user) {
    let db = loadDB();
    let index = db.users.findIndex(u => u.phone === user.phone);
    if (index !== -1) {
        db.users[index] = user;
    } else {
        db.users.push(user);
    }
    saveDB(db);
}

window.findUserByPhone = findUserByPhone;
window.findUserByUsername = findUserByUsername;
window.saveUser = saveUser;
window.initAuth = initAuth;
window.afterLogin = afterLogin; // может пригодиться
