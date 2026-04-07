package com.example.voxshat.ui.chatlist

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.example.voxshat.data.model.Chat
import com.example.voxshat.databinding.ItemChatBinding

class ChatListAdapter(private val onItemClick: (Chat) -> Unit) :
    RecyclerView.Adapter<ChatListAdapter.ViewHolder>() {

    private var chats = listOf<Chat>()

    fun submitList(list: List<Chat>) {
        chats = list
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemChatBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(chats[position])
        holder.itemView.setOnClickListener { onItemClick(chats[position]) }
    }

    override fun getItemCount() = chats.size

    inner class ViewHolder(private val binding: ItemChatBinding) :
        RecyclerView.ViewHolder(binding.root) {
        fun bind(chat: Chat) {
            binding.tvName.text = chat.name
            binding.tvLastMessage.text = chat.lastMessage ?: "Нет сообщений"
        }
    }
}
