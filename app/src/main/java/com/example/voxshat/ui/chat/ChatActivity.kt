package com.example.voxshat.ui.chat

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.voxshat.R
import com.example.voxshat.VoxShatApplication
import com.example.voxshat.data.Repository
import com.example.voxshat.data.model.Message
import com.example.voxshat.databinding.ActivityChatBinding
import kotlinx.coroutines.launch

class ChatActivity : AppCompatActivity() {

    private lateinit var binding: ActivityChatBinding
    private lateinit var repository: Repository
    private lateinit var adapter: MessageAdapter
    private var chatId: Long = 0
    private var currentUserId: Long = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityChatBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        chatId = intent.getLongExtra("chat_id", 0)
        currentUserId = intent.getLongExtra("current_user_id", 0)

        repository = Repository((application as VoxShatApplication).database)

        adapter = MessageAdapter(currentUserId) { message ->
            showMessageOptions(message)
        }

        binding.recyclerView.layoutManager = LinearLayoutManager(this).apply {
            stackFromEnd = true
        }
        binding.recyclerView.adapter = adapter

        lifecycleScope.launch {
            repository.getMessagesForChat(chatId).collect { messages ->
                adapter.submitList(messages.reversed())
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
                chatId = chatId,
                senderId = currentUserId,
                text = text,
                timestamp = System.currentTimeMillis(),
                isSent = true
            )
            repository.insertMessage(message)

            val chat = repository.getChatById(chatId)
            if (chat != null) {
                chat.lastMessage = text
                chat.lastMessageTime = System.currentTimeMillis()
                repository.updateChat(chat)
            }
        }
    }

    private fun showMessageOptions(message: Message) {
        val options = mutableListOf("Копировать")
        if (message.senderId == currentUserId) {
            options.add("Удалить")
        }
        AlertDialog.Builder(this)
            .setItems(options.toTypedArray()) { _, which ->
                when (options[which]) {
                    "Копировать" -> copyToClipboard(message.text)
                    "Удалить" -> deleteMessage(message)
                }
            }
            .show()
    }

    private fun copyToClipboard(text: String) {
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("Сообщение", text)
        clipboard.setPrimaryClip(clip)
        Toast.makeText(this, "Скопировано", Toast.LENGTH_SHORT).show()
    }

    private fun deleteMessage(message: Message) {
        lifecycleScope.launch {
            repository.deleteMessage(message)
        }
    }

    override fun onSupportNavigateUp(): Boolean {
        onBackPressed()
        return true
    }
}
