package com.example.voxshat.ui.auth

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.voxshat.VoxShatApplication
import com.example.voxshat.data.Repository
import com.example.voxshat.data.model.User
import com.example.voxshat.databinding.ActivityLoginBinding
import com.example.voxshat.ui.chatlist.ChatListActivity
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding
    private lateinit var repository: Repository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        repository = Repository((application as VoxShatApplication).database)

        binding.btnLogin.setOnClickListener {
            val username = binding.etUsername.text.toString().trim()
            if (username.isNotEmpty()) {
                login(username)
            } else {
                Toast.makeText(this, "Введите имя пользователя", Toast.LENGTH_SHORT).show()
            }
        }

        binding.btnDemo.setOnClickListener {
            login("Гость")
        }
    }

    private fun login(username: String) {
        lifecycleScope.launch {
            // Получаем всех пользователей из базы (поток, но мы берём первый элемент списка)
            val users = repository.getAllUsers().firstOrNull() ?: emptyList()
            val existingUser = users.find { it.name == username }
            if (existingUser != null) {
                // Вход существующего
                startChatList(existingUser.id)
            } else {
                // Создаём нового пользователя
                val newUser = User(name = username)
                repository.insertUser(newUser)
                // Добавляем демо-чаты, если ещё нет
                repository.populateDemoData()
                startChatList(newUser.id)
            }
        }
    }

    private fun startChatList(userId: Long) {
        val intent = Intent(this, ChatListActivity::class.java)
        intent.putExtra("current_user_id", userId)
        startActivity(intent)
        finish()
    }
}
