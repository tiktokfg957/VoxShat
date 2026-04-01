package com.example.voxshat.utils

import com.example.voxshat.data.Repository
import com.example.voxshat.data.model.Chat
import com.example.voxshat.data.model.Message
import com.example.voxshat.data.model.User
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking

object SupportBot {
    suspend fun ensureSupportChat(repository: Repository, currentUserId: Long) {
        // Проверяем, существует ли чат с поддержкой
        val allChats = repository.getAllChats().first()
        var supportChat = allChats.find { it.name == "Поддержка" && it.isChannel && it.adminId == 0L }

        if (supportChat == null) {
            // Создаём чат поддержки
            supportChat = Chat(
                name = "Поддержка",
                username = "voxshat_support",
                isChannel = true,
                adminId = 0L
            )
            repository.insertChat(supportChat)
            // Получаем id созданного чата (нужно обновить supportChat.id)
            supportChat = repository.getChatByUsername("voxshat_support") ?: return
        }

        // Создаём бота, если его нет
        var botUser = repository.getUserById(0)
        if (botUser == null) {
            botUser = User(
                id = 0,
                name = "VoxShat Бот",
                username = "voxshat_bot",
                role = "support",
                verifiedType = "support",
                verifiedAt = System.currentTimeMillis()
            )
            repository.insertUser(botUser)
        }

        // Проверяем, есть ли уже приветственное сообщение от бота в этом чате
        val messages = repository.getMessagesForChat(supportChat.id).first()
        val hasWelcomeMessage = messages.any { it.senderId == 0L && it.text.contains("Добро пожаловать") }
        if (!hasWelcomeMessage) {
            val welcomeMessage = Message(
                chatId = supportChat.id,
                senderId = 0,
                text = "Добро пожаловать в VoxShat! 🎉\n\nЯ официальный бот поддержки. Если у вас возникнут вопросы или проблемы с приложением, вы можете написать сюда. Мы постараемся ответить как можно скорее.\n\nСпасибо, что выбрали VoxShat!",
                timestamp = System.currentTimeMillis(),
                isSent = true,
                isRead = false
            )
            repository.insertMessage(welcomeMessage)
        }
    }
}
