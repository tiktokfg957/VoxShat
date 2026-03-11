// settings.js - настройки профиля, премиум, удаление аккаунта, тема

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

function loadProfileToForm() {
    app.elements.profileUsername.value = app.currentUser.username || '';
    app.elements.profileName.value = app.currentUser.name || '';
    if (app.currentUser.avatar) {
        app.elements.profileAvatar.innerHTML = `<img src="${app.currentUser.avatar}" style="width:100%;height:100%;object-fit:cover;">`;
    } else {
        app.elements.profileAvatar.innerHTML = '<span>👤</span>';
    }
}

function initSettings() {
    app.elements.profileAvatarInput.onchange = function(e) {
        let file = e.target.files[0];
        if (file) {
            let reader = new FileReader();
            reader.onload = ev => {
                app.elements.profileAvatar.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
                app.currentUser.avatar = ev.target.result;
            };
            reader.readAsDataURL(file);
        }
    };

    app.elements.profileSaveBtn.addEventListener('click', () => {
        let newUsername = app.elements.profileUsername.value.trim().toLowerCase();
        if (newUsername !== app.currentUser.username) {
            let existing = findUserByUsername(newUsername);
            if (existing && existing.phone !== app.currentUser.phone) {
                alert('Этот @юзернейм уже занят');
                return;
            }
        }
        app.currentUser.username = newUsername;
        app.currentUser.name = app.elements.profileName.value.trim();
        saveUser(app.currentUser);
        alert('Сохранено');
        renderContacts();
    });

    app.elements.showPremiumBtn.addEventListener('click', () => {
        app.elements.premiumModal.style.display = 'flex';
    });
    app.elements.closePremiumModal.addEventListener('click', () => {
        app.elements.premiumModal.style.display = 'none';
    });

    document.querySelectorAll('.premium-option').forEach(btn => {
        btn.addEventListener('click', function() {
            let months = parseInt(this.dataset.months);
            if (confirm(`Оформить Premium на ${months} мес. за ${this.dataset.price}₽?`)) {
                let until = Date.now() + months * 30 * 24 * 60 * 60 * 1000;
                app.currentUser.premiumUntil = until;
                if (!app.currentUser.badges) app.currentUser.badges = {};
                app.currentUser.badges.red = true;
                saveUser(app.currentUser);
                updatePremiumUI();
                app.elements.premiumModal.style.display = 'none';
                alert('Premium активирован!');
                renderContacts();
            }
        });
    });

    app.elements.deleteAccountBtn.addEventListener('click', () => {
        if (!confirm('Вы уверены, что хотите удалить свой аккаунт? Это действие необратимо.')) return;
        let db = loadDB();
        db.messages = db.messages.filter(m => m.sender !== app.currentUser.phone);
        db.channels = db.channels.filter(c => c.createdBy !== app.currentUser.phone);
        db.users.forEach(u => {
            if (u.friends) {
                u.friends.list = u.friends.list.filter(p => p !== app.currentUser.phone);
                u.friends.incoming = u.friends.incoming.filter(p => p !== app.currentUser.phone);
                u.friends.outgoing = u.friends.outgoing.filter(p => p !== app.currentUser.phone);
            }
        });
        db.users = db.users.filter(u => u.phone !== app.currentUser.phone);
        saveDB(db);
        alert('Аккаунт удалён. До свидания!');
        app.elements.logoutBtn.click();
    });

    // Обработчики для стилей
    app.elements.classicStyleBtn.addEventListener('click', () => {
        applyStyle('classic');
        app.elements.styleModal.style.display = 'none';
    });
    app.elements.voxStyleBtn.addEventListener('click', () => {
        applyStyle('vox');
        app.elements.styleModal.style.display = 'none';
    });
    app.elements.closeStyleModal.addEventListener('click', () => {
        app.elements.styleModal.style.display = 'none';
    });
    app.elements.openSettingsBtn.addEventListener('click', () => {
        app.elements.styleModal.style.display = 'flex';
    });
    app.elements.openSettingsAppBtn.addEventListener('click', () => {
        app.elements.styleModal.style.display = 'flex';
    });
}

// Экспорт
window.applyStyle = applyStyle;
window.loadProfileToForm = loadProfileToForm;
window.initSettings = initSettings;
