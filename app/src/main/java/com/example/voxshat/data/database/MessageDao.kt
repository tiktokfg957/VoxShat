package com.example.voxshat.data.database

import androidx.room.*
import com.example.voxshat.data.model.Message
import kotlinx.coroutines.flow.Flow

@Dao
interface MessageDao {
    @Query("SELECT * FROM messages WHERE chatId = :chatId ORDER BY timestamp DESC")
    fun getMessagesForChat(chatId: Long): Flow<List<Message>>

    @Insert
    suspend fun insert(message: Message)

    @Update
    suspend fun update(message: Message)

    @Delete
    suspend fun delete(message: Message)

    @Query("UPDATE messages SET isRead = 1 WHERE chatId = :chatId AND senderId != :currentUserId")
    suspend fun markMessagesAsRead(chatId: Long, currentUserId: Long)
}
