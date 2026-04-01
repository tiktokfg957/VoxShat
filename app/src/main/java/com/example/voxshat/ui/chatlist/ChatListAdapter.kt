package com.example.voxshat.ui.chatlist

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.example.voxshat.R
import com.example.voxshat.data.model.Chat
import com.example.voxshat.utils.DateUtils
import com.example.voxshat.utils.getVerifiedIcon

class ChatListAdapter(
    private val onChatClick: (Chat) -> Unit,
    private val onChatLongClick: (Chat) -> Unit
) : RecyclerView.Adapter<ChatListAdapter.ChatViewHolder>() {

    private var chats = listOf<Chat>()

    fun submitList(list: List<Chat>) {
        chats = list
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ChatViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_chat, parent, false)
        return ChatViewHolder(view)
    }

    override fun onBindViewHolder(holder: ChatViewHolder, position: Int) {
        val chat = chats[position]
        holder.bind(chat)
        holder.itemView.setOnClickListener { onChatClick(chat) }
        holder.itemView.setOnLongClickListener {
            onChatLongClick(chat)
            true
        }
    }

    override fun getItemCount() = chats.size

    class ChatViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val ivAvatar: ImageView = itemView.findViewById(R.id.ivAvatar)
        private val tvName: TextView = itemView.findViewById(R.id.tvName)
        private val ivVerified: ImageView = itemView.findViewById(R.id.ivVerified)
        private val tvLastMessage: TextView = itemView.findViewById(R.id.tvLastMessage)
        private val tvTime: TextView = itemView.findViewById(R.id.tvTime)
        private val tvUnread: TextView = itemView.findViewById(R.id.tvUnread)

        fun bind(chat: Chat) {
            tvName.text = chat.name
            tvLastMessage.text = chat.lastMessage ?: "Нет сообщений"
            tvTime.text = DateUtils.formatChatTime(chat.lastMessageTime)
            if (chat.unreadCount > 0) {
                tvUnread.visibility = View.VISIBLE
                tvUnread.text = chat.unreadCount.toString()
            } else {
                tvUnread.visibility = View.GONE
            }

            val verifiedType = when (chat.username) {
                "voxshat_support" -> "support"
                "voxshat_admin" -> "admin"
                else -> null
            }
            if (verifiedType != null) {
                ivVerified.visibility = View.VISIBLE
                ivVerified.setImageResource(getVerifiedIcon(verifiedType))
                ivVerified.setOnClickListener {
                    android.widget.Toast.makeText(
                        itemView.context,
                        "Официальный аккаунт ${when(verifiedType){"support"->"поддержки" else->verifiedType}}",
                        android.widget.Toast.LENGTH_SHORT
                    ).show()
                }
            } else {
                ivVerified.visibility = View.GONE
            }
        }
    }
}
