package com.example.voxshat.data

import com.example.voxshat.data.database.AppDatabase
import com.example.voxshat.data.model.Chat
import com.example.voxshat.data.model.Message
import com.example.voxshat.data.model.User
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first

class Repository(private val db: AppDatabase) {

    // Users
    fun getAllUsers(): Flow<List<User>> = db.userDao().getAllUsers()
    suspend fun insertUser(user: User) = db.userDao().insert(user)
    suspend fun updateUser(user: User) = db.userDao().update(user)
    suspend fun getUserById(id: Long): User? = db.userDao().getUserById(id)

    // Chats
    fun getAllChats(): Flow<List<Chat>> = db.chatDao().getAllChats()
    suspend fun insertChat(chat: Chat) = db.chatDao().insert(chat)
    suspend fun updateChat(chat: Chat) = db.chatDao().update(chat)
    suspend fun deleteChat(chat: Chat) = db.chatDao().delete(chat)
    suspend fun getChatById(id: Long): Chat? = db.chatDao().getChatById(id)

    // Messages
    fun getMessagesForChat(chatId: Long): Flow<List<Message>> = db.messageDao().getMessagesForChat(chatId)
    suspend fun insertMessage(message: Message) = db.messageDao().insert(message)
    suspend fun deleteMessage(message: Message) = db.messageDao().delete(message)
    suspend fun markMessagesAsRead(chatId: Long, currentUserId: Long) = db.messageDao().markMessagesAsRead(chatId, currentUserId)

    // Demo data
    suspend fun populateDemoData() {
        // Проверяем, есть ли уже чаты
        val chats = db.chatDao().getAllChats().first()
        if (chats.isNotEmpty()) return

        // Создаём тестовых пользователей
        val user1 = User(name = "Я")
        val user2 = User(name = "Анна")
        val user3 = User(name = "Дмитрий")
        insertUser(user1)
        insertUser(user2)
        insertUser(user3)

        val chat1 = Chat(name = "Анна", lastMessage = "Привет!", lastMessageTime = System.currentTimeMillis() - 3600000)
        val chat2 = Chat(name = "Дмитрий", lastMessage = "Как дела?", lastMessageTime = System.currentTimeMillis() - 7200000)
        insertChat(chat1)
        insertChat(chat2)

        val currentUserId = user1.id
        insertMessage(Message(chatId = chat1.id, senderId = user2.id, text = "Привет!", timestamp = System.currentTimeMillis() - 3600000))
        insertMessage(Message(chatId = chat1.id, senderId = currentUserId, text = "Привет! Как ты?", timestamp = System.currentTimeMillis() - 3500000))
        insertMessage(Message(chatId = chat2.id, senderId = user3.id, text = "Как дела?", timestamp = System.currentTimeMillis() - 7200000))
        insertMessage(Message(chatId = chat2.id, senderId = currentUserId, text = "Нормально, а у тебя?", timestamp = System.currentTimeMillis() - 7100000))
    }
}
