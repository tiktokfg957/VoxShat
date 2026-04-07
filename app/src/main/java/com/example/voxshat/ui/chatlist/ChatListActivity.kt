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

    override fun onCreateOptionsMenu(menu: Menu?): Boolean {
    menuInflater.inflate(R.menu.menu_chat_list, menu)
    return true
}

override fun onOptionsItemSelected(item: MenuItem): Boolean {
    if (item.itemId == R.id.action_profile) {
        startActivity(Intent(this, ProfileActivity::class.java))
        return true
    }
    return super.onOptionsItemSelected(item)
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
