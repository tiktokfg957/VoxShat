package com.example.voxshat.ui.chatlist

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.voxshat.VoxShatApplication
import com.example.voxshat.databinding.ActivityChatListBinding
import com.example.voxshat.ui.chat.ChatActivity
import kotlinx.coroutines.launch

class ChatListActivity : AppCompatActivity() {

    private lateinit var binding: ActivityChatListBinding
    private lateinit var adapter: ChatListAdapter
    private val repository by lazy { (application as VoxShatApplication).chatRepository }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityChatListBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        supportActionBar?.title = getString(R.string.chats)

        adapter = ChatListAdapter { chat ->
            val intent = Intent(this, ChatActivity::class.java)
            intent.putExtra("chat_id", chat.chatId)
            startActivity(intent)
        }

        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.recyclerView.adapter = adapter

        lifecycleScope.launch {
            repository.getAllChats().collect { chats ->
                adapter.submitList(chats)
            }
        }
    }
}
