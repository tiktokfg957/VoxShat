package com.example.voxshat.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "chats")
data class Chat(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    var name: String,
    var username: String = "",
    var avatar: String? = null,
    var lastMessage: String? = null,
    var lastMessageTime: Long = System.currentTimeMillis(),
    var unreadCount: Int = 0,
    var isChannel: Boolean = false,
    var adminId: Long = 0
)
