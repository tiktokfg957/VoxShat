package com.example.voxshat.ui.chat

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.example.voxshat.R
import com.example.voxshat.data.model.Message
import com.example.voxshat.utils.DateUtils

class MessageAdapter(
    private val currentUserId: Long,
    private val onMessageLongClick: (Message) -> Unit
) : RecyclerView.Adapter<MessageAdapter.MessageViewHolder>() {

    private var messages = listOf<Message>()

    fun submitList(list: List<Message>) {
        messages = list
        notifyDataSetChanged()
    }

    override fun getItemViewType(position: Int): Int {
        return if (messages[position].senderId == currentUserId) TYPE_ME else TYPE_OTHER
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): MessageViewHolder {
        val layout = if (viewType == TYPE_ME) R.layout.item_message_me else R.layout.item_message_other
        val view = LayoutInflater.from(parent.context).inflate(layout, parent, false)
        return MessageViewHolder(view)
    }

    override fun onBindViewHolder(holder: MessageViewHolder, position: Int) {
        val message = messages[position]
        holder.bind(message)
        holder.itemView.setOnLongClickListener {
            onMessageLongClick(message)
            true
        }
    }

    override fun getItemCount() = messages.size

    inner class MessageViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvMessage: TextView = itemView.findViewById(R.id.tvMessage)
        private val tvTime: TextView = itemView.findViewById(R.id.tvTime)
        private val ivReadStatus: ImageView? = itemView.findViewById(R.id.ivReadStatus)

        fun bind(message: Message) {
            tvMessage.text = message.text
            tvTime.text = DateUtils.formatMessageTime(message.timestamp)

            // Галочка только для своих сообщений
            if (message.senderId == currentUserId && ivReadStatus != null) {
                ivReadStatus.visibility = View.VISIBLE
                if (message.isRead) {
                    ivReadStatus.setImageResource(R.drawable.ic_read)
                } else {
                    ivReadStatus.setImageResource(R.drawable.ic_sent)
                }
            }
        }
    }

    companion object {
        private const val TYPE_ME = 0
        private const val TYPE_OTHER = 1
    }
}
