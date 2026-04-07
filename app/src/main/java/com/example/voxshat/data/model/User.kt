package com.example.voxshat.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "users")
data class User(
    @PrimaryKey
    val uid: String,
    val phoneNumber: String,
    val name: String = "",
    val photoUrl: String? = null,
    val status: String = "онлайн"
)
