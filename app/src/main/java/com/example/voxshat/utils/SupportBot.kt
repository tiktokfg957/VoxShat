package com.example.voxshat.utils

import com.example.voxshat.data.Repository
import com.example.voxshat.data.model.Chat
import com.example.voxshat.data.model.Message
import com.example.voxshat.data.model.User
import kotlinx.coroutines.flow.first

object SupportBot {
    suspend fun ensureSupportChat(repository: Repository, currentUserId: Long) {
        val allChats = repository.getAllChats().first()
        val supportChatExists = allChats.any { it.name == "Поддержка" && it.isChannel && it.adminId == 0L }
        if (!supportChatExists) {
            val supportChat = Chat(
                name = "Поддержка",
                username = "voxshat_support",
                isChannel = true,
                adminId = 0L
            )
            repository.insertChat(supportChat)

            val botUser = User(
                id = 0,
                name = "VoxShat Бот",
                username = "voxshat_bot",
                role = "support",
                verifiedType = "support",
                verifiedAt = System.currentTimeMillis()
            )
            val existingBot = repository.getUserById(0)
            if (existingBot == null) {
                repository.insertUser(botUser)
            }
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
