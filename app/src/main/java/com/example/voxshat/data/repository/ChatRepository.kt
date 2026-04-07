package com.example.voxshat.data.repository

import com.example.voxshat.data.database.AppDatabase
import com.example.voxshat.data.model.Chat
import com.example.voxshat.data.model.Message
import com.example.voxshat.data.model.User
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.tasks.await

class ChatRepository(private val db: AppDatabase) {
    private val firestore = FirebaseFirestore.getInstance()

    // Local
    fun getAllChats(): Flow<List<Chat>> = db.chatDao().getAllChats()
    suspend fun insertChat(chat: Chat) = db.chatDao().insert(chat)
    suspend fun updateChat(chat: Chat) = db.chatDao().update(chat)
    suspend fun deleteChat(chat: Chat) = db.chatDao().delete(chat)

    fun getMessagesForChat(chatId: String): Flow<List<Message>> = db.messageDao().getMessagesForChat(chatId)
    suspend fun insertMessage(message: Message) = db.messageDao().insert(message)
    suspend fun updateMessage(message: Message) = db.messageDao().update(message)
    suspend fun deleteMessage(message: Message) = db.messageDao().delete(message)
    suspend fun markMessagesAsRead(chatId: String, currentUserId: String) = db.messageDao().markMessagesAsRead(chatId, currentUserId)

    suspend fun getUser(uid: String): User? = db.userDao().getUser(uid)
    suspend fun insertUser(user: User) = db.userDao().insert(user)
    suspend fun updateUser(user: User) = db.userDao().update(user)

    // Firestore sync
    suspend fun syncChatsFromFirestore(userId: String) {
        val snapshot = firestore.collection("chats").whereArrayContains("participants", userId).get().await()
        for (doc in snapshot.documents) {
            val chat = doc.toObject(Chat::class.java)?.copy(chatId = doc.id) ?: continue
            insertChat(chat)
        }
    }

    suspend fun syncMessagesFromFirestore(chatId: String) {
        val snapshot = firestore.collection("chats").document(chatId).collection("messages")
            .orderBy("timestamp").get().await()
        for (doc in snapshot.documents) {
            val message = doc.toObject(Message::class.java)?.copy(messageId = doc.id) ?: continue
            insertMessage(message)
        }
    }
}
