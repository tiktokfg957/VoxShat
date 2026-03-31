package com.example.voxshat

import android.app.Application
import com.example.voxshat.data.database.AppDatabase

class VoxShatApplication : Application() {
    val database: AppDatabase by lazy {
        AppDatabase.getDatabase(this)
    }
}
