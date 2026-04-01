package com.example.voxshat.ui.chatlist

import android.content.Intent
import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.widget.SearchView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.example.voxshat.R
import com.example.voxshat.VoxShatApplication
import com.example.voxshat.data.Repository
import com.example.voxshat.data.model.Chat
import com.example.voxshat.databinding.ActivityChatListBinding
import com.example.voxshat.ui.chat.ChatActivity
import com.example.voxshat.ui.channel.CreateChannelActivity
import com.example.voxshat.ui.profile.ProfileActivity
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class ChatListActivity : AppCompatActivity() {

    private lateinit var binding: ActivityChatListBinding
    private lateinit var repository: Repository
    private lateinit var adapter: ChatListAdapter
    private var currentUserId: Long = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityChatListBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        supportActionBar?.title = getString(R.string.chats)

        currentUserId = intent.getLongExtra("current_user_id", 0)
        if (currentUserId == 0L) {
            // Если не передан, возможно, пользователь не авторизован, но для демо поставим 1
            currentUserId = 1L
        }

        repository = Repository((application as VoxShatApplication).database)

        adapter = ChatListAdapter(
            onChatClick = { chat -> openChat(chat) },
            onChatLongClick = { chat -> deleteChatWithConfirm(chat) }
        )

        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.recyclerView.adapter = adapter

        lifecycleScope.launch {
            repository.getAllChats().collectLatest { chats ->
                adapter.submitList(chats)
                binding.swipeRefresh.isRefreshing = false
            }
        }

        binding.swipeRefresh.setOnRefreshListener {
            refreshChats()
        }

        setupSearch()

        binding.fab.setOnClickListener {
            val intent = Intent(this, CreateChannelActivity::class.java)
            intent.putExtra("current_user_id", currentUserId)
            startActivity(intent)
        }
        binding.fab.visibility = View.VISIBLE
    }

    private fun refreshChats() {
        lifecycleScope.launch {
            repository.getAllChats().collectLatest { chats ->
                adapter.submitList(chats)
                binding.swipeRefresh.isRefreshing = false
            }
        }
    }

    private fun setupSearch() {
        binding.searchView.setOnQueryTextListener(object : SearchView.OnQueryTextListener {
            override fun onQueryTextSubmit(query: String?): Boolean = false
            override fun onQueryTextChange(newText: String?): Boolean {
                filterChats(newText ?: "")
                return true
            }
        })
    }

    private fun filterChats(query: String) {
        lifecycleScope.launch {
            repository.getAllChats().collectLatest { chats ->
                val filtered = if (query.isEmpty()) chats
                else chats.filter { it.name.contains(query, ignoreCase = true) || it.username.contains(query, ignoreCase = true) }
                adapter.submitList(filtered)
            }
        }
    }

    private fun openChat(chat: Chat) {
        val intent = Intent(this, ChatActivity::class.java)
        intent.putExtra("chat_id", chat.id)
        intent.putExtra("current_user_id", currentUserId)
        startActivity(intent)
    }

    private fun deleteChatWithConfirm(chat: Chat) {
        android.app.AlertDialog.Builder(this)
            .setTitle("Удалить чат")
            .setMessage("Вы уверены, что хотите удалить чат с ${chat.name}?")
            .setPositiveButton("Удалить") { _, _ ->
                lifecycleScope.launch {
                    repository.deleteChat(chat)
                }
            }
            .setNegativeButton("Отмена", null)
            .show()
    }

    override fun onCreateOptionsMenu(menu: Menu?): Boolean {
        menuInflater.inflate(R.menu.menu_chat_list, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_profile -> {
                val intent = Intent(this, ProfileActivity::class.java)
                intent.putExtra("current_user_id", currentUserId)
                startActivity(intent)
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }
}
