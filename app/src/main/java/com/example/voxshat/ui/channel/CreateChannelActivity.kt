package com.example.voxshat.ui.channel

import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.voxshat.VoxShatApplication
import com.example.voxshat.data.Repository
import com.example.voxshat.data.model.Chat
import com.example.voxshat.databinding.ActivityCreateChannelBinding
import kotlinx.coroutines.launch

class CreateChannelActivity : AppCompatActivity() {

    private lateinit var binding: ActivityCreateChannelBinding
    private lateinit var repository: Repository
    private var currentUserId: Long = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCreateChannelBinding.inflate(layoutInflater)
        setContentView(binding.root)

        currentUserId = intent.getLongExtra("current_user_id", 0)
        repository = Repository((application as VoxShatApplication).database)

        binding.btnCreate.setOnClickListener {
            val name = binding.etChannelName.text.toString().trim()
            val username = binding.etChannelUsername.text.toString().trim()
            if (name.isNotEmpty() && username.isNotEmpty()) {
                createChannel(name, username)
            } else {
                Toast.makeText(this, "Заполните все поля", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun createChannel(name: String, username: String) {
        lifecycleScope.launch {
            val existingChat = repository.getChatByUsername(username)
            if (existingChat != null) {
                Toast.makeText(this@CreateChannelActivity, "Юзернейм уже занят", Toast.LENGTH_SHORT).show()
                return@launch
            }

            val chat = Chat(
                name = name,
                username = username,
                isChannel = true,
                adminId = currentUserId
            )
            repository.insertChat(chat)

            Toast.makeText(this@CreateChannelActivity, "Канал создан", Toast.LENGTH_SHORT).show()
            finish()
        }
    }
}
