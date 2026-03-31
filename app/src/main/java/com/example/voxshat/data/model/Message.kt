package com.example.voxshat.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "messages")
data class Message(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val chatId: Long,
    val senderId: Long,
    val text: String,
    val timestamp: Long = System.currentTimeMillis(),
    val isSent: Boolean = true,
    val isRead: Boolean = false
)
