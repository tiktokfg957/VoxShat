package com.example.voxshat.data.database

import androidx.room.*
import com.example.voxshat.data.model.Chat
import kotlinx.coroutines.flow.Flow

@Dao
interface ChatDao {
    @Query("SELECT * FROM chats ORDER BY lastMessageTime DESC")
    fun getAllChats(): Flow<List<Chat>>

    @Insert
    suspend fun insert(chat: Chat)

    @Update
    suspend fun update(chat: Chat)

    @Delete
    suspend fun delete(chat: Chat)

    @Query("SELECT * FROM chats WHERE id = :chatId")
    suspend fun getChatById(chatId: Long): Chat?

    @Query("SELECT * FROM chats WHERE username = :username")
    suspend fun getChatByUsername(username: String): Chat?
}
