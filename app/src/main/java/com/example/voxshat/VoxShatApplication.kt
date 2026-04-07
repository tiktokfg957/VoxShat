package com.example.voxshat

import android.app.Application
import com.example.voxshat.data.database.AppDatabase
import com.example.voxshat.data.repository.ChatRepository

class VoxShatApplication : Application() {
    val database by lazy { AppDatabase.getDatabase(this) }
    val chatRepository by lazy { ChatRepository(database) }
}
