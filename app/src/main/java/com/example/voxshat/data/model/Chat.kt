package com.example.voxshat.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "chats")
data class Chat(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    val avatar: String? = null,
    val lastMessage: String? = null,
    val lastMessageTime: Long = System.currentTimeMillis(),
    val unreadCount: Int = 0
)
