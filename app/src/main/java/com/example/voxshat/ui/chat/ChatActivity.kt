package com.example.voxshat.ui.chat

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.voxshat.R
import com.example.voxshat.VoxShatApplication
import com.example.voxshat.data.Repository
import com.example.voxshat.data.model.Chat
import com.example.voxshat.data.model.Message
import com.example.voxshat.databinding.ActivityChatBinding
import kotlinx.coroutines.launch

class ChatActivity : AppCompatActivity() {

    private lateinit var binding: ActivityChatBinding
    private lateinit var repository: Repository
    private lateinit var adapter: MessageAdapter
    private var chatId: Long = 0
    private var currentUserId: Long = 0
    private var currentChat: Chat? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityChatBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        chatId = intent.getLongExtra("chat_id", 0)
        currentUserId = intent.getLongExtra("current_user_id", 0)
        if (currentUserId == 0L) {
            currentUserId = 1L
        }

        repository = Repository((application as VoxShatApplication).database)

        adapter = MessageAdapter(currentUserId) { message ->
            showMessageOptions(message)
        }

        binding.recyclerView.layoutManager = LinearLayoutManager(this).apply {
            stackFromEnd = true
        }
        binding.recyclerView.adapter = adapter

        lifecycleScope.launch {
            val chat = repository.getChatById(chatId)
            currentChat = chat
            supportActionBar?.title = chat?.name ?: "Чат"
            // После загрузки данных пересоздаём меню, чтобы показать шестерёнку
            invalidateOptionsMenu()
        }

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
                isSent = true,
                isRead = false
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

    private fun showChannelSettingsDialog(chat: Chat) {
        val builder = AlertDialog.Builder(this)
        val inflater = layoutInflater
        val dialogView = inflater.inflate(R.layout.dialog_channel_settings, null)
        val etName = dialogView.findViewById<android.widget.EditText>(R.id.etChannelName)
        val etUsername = dialogView.findViewById<android.widget.EditText>(R.id.etChannelUsername)
        etName.setText(chat.name)
        etUsername.setText(chat.username)

        builder.setView(dialogView)
            .setTitle("Настройки канала")
            .setPositiveButton("Сохранить") { _, _ ->
                val newName = etName.text.toString().trim()
                val newUsername = etUsername.text.toString().trim()
                if (newName.isNotEmpty() && newUsername.isNotEmpty()) {
                    lifecycleScope.launch {
                        chat.name = newName
                        chat.username = newUsername
                        repository.updateChat(chat)
                        supportActionBar?.title = newName
                        Toast.makeText(this@ChatActivity, "Сохранено", Toast.LENGTH_SHORT).show()
                    }
                } else {
                    Toast.makeText(this@ChatActivity, "Заполните все поля", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Отмена", null)
            .show()
    }

    override fun onCreateOptionsMenu(menu: Menu?): Boolean {
        menuInflater.inflate(R.menu.menu_chat, menu)
        // Добавляем шестерёнку, если текущий пользователь - владелец канала
        currentChat?.let { chat ->
            if (chat.isChannel && chat.adminId == currentUserId) {
                val settingsItem = menu?.add("Настройки")
                settingsItem?.setIcon(R.drawable.ic_settings)
                settingsItem?.setShowAsAction(MenuItem.SHOW_AS_ACTION_ALWAYS)
                settingsItem?.setOnMenuItemClickListener {
                    showChannelSettingsDialog(chat)
                    true
                }
            }
        }
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            android.R.id.home -> {
                onBackPressed()
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }
}
