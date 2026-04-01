package com.example.voxshat.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "users")
data class User(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    var name: String,
    var username: String = "",
    var avatar: String? = null,
    var status: String = "онлайн",
    var role: String = "user", // user, support, moderator, admin, business, partner, celebrity
    var verifiedType: String? = null, // support, moderator, admin, business, partner, celebrity
    var verifiedAt: Long? = null
)
