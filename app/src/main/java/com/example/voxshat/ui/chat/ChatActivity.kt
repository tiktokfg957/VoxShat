package com.example.voxshat.ui.chat

import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.voxshat.VoxShatApplication
import com.example.voxshat.data.model.Message
import com.example.voxshat.databinding.ActivityChatBinding
import kotlinx.coroutines.launch
import java.util.UUID

class ChatActivity : AppCompatActivity() {

    private lateinit var binding: ActivityChatBinding
    private lateinit var adapter: MessageAdapter
    private val repository by lazy { (application as VoxShatApplication).chatRepository }
    private var chatId: String = ""
    private val currentUserId = "current_user_id_placeholder" // заменить на реальный uid после авторизации

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityChatBinding.inflate(layoutInflater)
        setContentView(binding.root)

        chatId = intent.getStringExtra("chat_id") ?: return

        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        adapter = MessageAdapter(currentUserId) { message ->
            // долгое нажатие – удаление (пока заглушка)
            Toast.makeText(this, "Удалить: ${message.text}", Toast.LENGTH_SHORT).show()
        }

        binding.recyclerView.layoutManager = LinearLayoutManager(this).apply {
            stackFromEnd = true
        }
        binding.recyclerView.adapter = adapter

        lifecycleScope.launch {
            repository.getMessagesForChat(chatId).collect { messages ->
                adapter.submitList(messages)
                binding.recyclerView.scrollToPosition(adapter.itemCount - 1)
            }
        }

        binding.btnSend.setOnClickListener {
            val text = binding.etMessage.text.toString().trim()
            if (text.isNotEmpty()) {
                sendMessage(text)
                binding.etMessage.text.clear()
            }
        }

        lifecycleScope.launch {
            repository.markMessagesAsRead(chatId, currentUserId)
        }
    }

    private fun sendMessage(text: String) {
        lifecycleScope.launch {
            val message = Message(
                messageId = UUID.randomUUID().toString(),
                chatId = chatId,
                senderId = currentUserId,
                text = text,
                timestamp = System.currentTimeMillis(),
                isRead = false,
                isDelivered = true
            )
            repository.insertMessage(message)

            // обновить lastMessage в чате
            val chat = repository.getChat(chatId)
            if (chat != null) {
                chat.lastMessage = text
                chat.lastMessageTime = System.currentTimeMillis()
                repository.updateChat(chat)
            }
        }
    }
}
