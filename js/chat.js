// Работа с чатами и сообщениями

function getChatId(contactId) {
    if (!contactId) return '';
    contactId = String(contactId);
    if (contactId.startsWith('+')) {
        if (!app.currentUser) return '';
        return `private_${[app.currentUser.phone, contactId].sort().join('_')}`;
    }
    return contactId; // канал
}

function loadMessages(chatId, loadMore = false) {
    if (app.isLoadingMessages) return;
    app.isLoadingMessages = true;
    if (!loadMore) {
        app.messagesOffset = 0;
        app.elements.messagesContainer.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            let skeleton = document.createElement('div');
            skeleton.className = 'skeleton-message';
            app.elements.messagesContainer.appendChild(skeleton);
        }
    }
    try {
        let db = loadDB();
        let msgs = db.messages
            .filter(m => m.chat_id === chatId)
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(app.messagesOffset, app.messagesOffset + app.messagesLimit);
        if (!loadMore) app.elements.messagesContainer.innerHTML = '';
        if (msgs.length < app.messagesLimit) app.hasMoreMessages = false;
        msgs.reverse();
        if (loadMore) {
            msgs.forEach(m => {
                m.isMe = (m.sender === app.currentUser.phone);
                prependMessage(m);
            });
        } else {
            msgs.forEach(m => {
                m.isMe = (m.sender === app.currentUser.phone);
                appendMessage(m);
            });
        }
        app.messagesOffset += msgs.length;
    } catch (e) {
        console.error('Ошибка загрузки сообщений:', e);
        if (!loadMore) app.elements.messagesContainer.innerHTML = '<div style="text-align:center;color:#f44336;">Ошибка загрузки</div>';
    } finally {
        app.isLoadingMessages = false;
    }
}

function appendMessage(msg) {
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

        let db = loadDB();
        let originalMsg = db.messages.find(m => m.id == msg.reply_to);
        if (!originalMsg) {
            replyDiv.textContent = '↩️ Сообщение не найдено';
        } else {
            let replyText = originalMsg.text || (originalMsg.image ? '📷 Изображение' : '');
            replyDiv.textContent = `↩️ ${replyText}`;
        }
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

    // Кнопка ответа
    let replyBtn = document.createElement('button');
    replyBtn.className = 'reply-btn';
    replyBtn.innerHTML = '↩️';
    replyBtn.onclick = (e) => {
        e.stopPropagation();
        app.replyToMessage = msg;
        showReplyBar(msg);
    };
    f.appendChild(replyBtn);

    w.appendChild(md);
    w.appendChild(t);
    w.appendChild(f);
    app.elements.messagesContainer.appendChild(w);
    app.elements.messagesContainer.scrollTop = app.elements.messagesContainer.scrollHeight;
}

function prependMessage(msg) {
    // Аналогично appendMessage, но вставляем в начало
    // (для краткости опущено, но код такой же, только insertBefore)
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
    app.elements.chatInput.parentNode.insertBefore(bar, app.elements.chatInput);
    document.getElementById('cancelReplyBtn').onclick = () => {
        bar.remove();
        app.replyToMessage = null;
        app.elements.messageInput.placeholder = 'Сообщение...';
    };
    app.elements.messageInput.placeholder = 'Ваш ответ...';
}

// Инициализация чата
function initChat() {
    app.elements.sendButton.addEventListener('click', () => {
        let text = app.elements.messageInput.value.trim();
        if (!text || !app.currentUser || !app.currentContactId) return;
        let chatId = getChatId(app.currentContactId);
        let msgObj = {
            id: Date.now() + Math.random(),
            chat_id: chatId,
            sender: app.currentUser.phone,
            text: text,
            time: new Date().toISOString()
        };
        if (app.replyToMessage) {
            msgObj.reply_to = app.replyToMessage.id;
        }
        let db = loadDB();
        db.messages.push(msgObj);
        saveDB(db);
        msgObj.isMe = true;
        appendMessage(msgObj);

        app.elements.messageInput.value = '';
        let bar = document.getElementById('replyBar');
        if (bar) bar.remove();
        app.replyToMessage = null;
        app.elements.messageInput.placeholder = 'Сообщение...';
    });

    app.elements.messageInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            app.elements.sendButton.click();
        }
    });

    app.elements.messagesContainer.addEventListener('scroll', () => {
        if (app.elements.messagesContainer.scrollTop === 0 && app.hasMoreMessages && !app.isLoadingMessages) {
            loadMessages(getChatId(app.currentContactId), true);
        }
    });

    app.elements.saveEditBtn.addEventListener('click', () => {
        if (app.editMessageId) {
            let { msg } = app.editMessageId;
            let newText = app.elements.editMessageText.value.trim();
            if (newText) {
                let db = loadDB();
                let index = db.messages.findIndex(m => m.id === msg.id);
                if (index !== -1) {
                    db.messages[index].text = newText;
                    saveDB(db);
                }
            }
            app.elements.editMessageModal.style.display = 'none';
            app.editMessageId = null;
        }
    });

    app.elements.cancelEditBtn.addEventListener('click', () => {
        app.elements.editMessageModal.style.display = 'none';
        app.editMessageId = null;
    });
}

window.getChatId = getChatId;
window.loadMessages = loadMessages;
window.initChat = initChat;
