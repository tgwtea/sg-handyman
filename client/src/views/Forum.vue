<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import api, { errorMessage } from '@/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const posts = ref([])
const title = ref('')
const category = ref('')
const content = ref('')
const replyDrafts = ref({})
const editingPostId = ref('')
const editingReplyId = ref('')
const editingReplyContent = ref('')
const message = ref('')
const loading = ref(true)

// Loads the posts from the server and shows any errors.
async function loadPosts() {
  try {
    const response = await api.get('/forum')
    posts.value = response.data
  } catch (error) {
    message.value = errorMessage(error)
  } finally {
    loading.value = false
  }
}

onMounted(loadPosts)

// Checks whether the signed-in user can edit this post or reply.
function canEdit(author) {
  if (!auth.user) {
    return false
  }

  let authorId = author
  if (author && author._id) {
    authorId = author._id
  }

  return auth.user.role === 'admin' || String(authorId) === String(auth.user._id)
}

// Checks whether the signed-in user has liked this post.
function hasLiked(post) {
  if (!auth.user || !Array.isArray(post.likes)) {
    return false
  }

  return post.likes.some(userId => String(userId) === String(auth.user._id))
}

// Adds or removes the signed-in user's thumbs-up and updates the counter.
async function likePost(post) {
  try {
    const response = await api.post(`/forum/${post._id}/likes`)
    post.likes = response.data.likes
  } catch (error) {
    message.value = errorMessage(error)
  }
}

// Shows the author's username or a message if the account was removed.
function authorName(author) {
  if (author && author.username) {
    return author.username
  }

  return 'Former member'
}

// Clears the post form and stops editing.
function clearPostForm() {
  title.value = ''
  category.value = ''
  content.value = ''
  editingPostId.value = ''
}

// Puts the selected post's details into the form.
function editPost(post) {
  title.value = post.title
  category.value = post.category
  content.value = post.content
  editingPostId.value = post._id
  message.value = ''
}

// Creates a post or saves changes, then reloads the posts.
async function savePost() {
  message.value = ''

  const post = {
    title: title.value,
    category: category.value,
    content: content.value
  }

  try {
    if (editingPostId.value) {
      await api.put(`/forum/${editingPostId.value}`, post)
      message.value = 'Post updated.'
    } else {
      await api.post('/forum', post)
      message.value = 'Post created.'
    }

    clearPostForm()
    await loadPosts()
  } catch (error) {
    message.value = errorMessage(error)
  }
}

// Asks before deleting a post and its replies.
async function deletePost(post) {
  const shouldDelete = window.confirm('Delete this post and all its replies?')
  if (!shouldDelete) {
    return
  }

  try {
    await api.delete(`/forum/${post._id}`)
    message.value = 'Post deleted.'
    await loadPosts()
  } catch (error) {
    message.value = errorMessage(error)
  }
}

// Adds a reply and reloads the posts.
async function addReply(post) {
  const replyContent = replyDrafts.value[post._id]

  if (!replyContent || !replyContent.trim()) {
    return
  }

  try {
    await api.post(`/forum/${post._id}/replies`, {
      content: replyContent
    })

    replyDrafts.value[post._id] = ''
    message.value = 'Reply added.'
    await loadPosts()
  } catch (error) {
    message.value = errorMessage(error)
  }
}

// Puts the selected reply's details into the edit form.
function editReply(reply) {
  editingReplyId.value = reply._id
  editingReplyContent.value = reply.content
  message.value = ''
}

// Stops editing the reply and clears the edit form.
function cancelReplyEdit() {
  editingReplyId.value = ''
  editingReplyContent.value = ''
}

// Saves the reply changes and reloads the posts.
async function saveReply(post, reply) {
  try {
    await api.put(`/forum/${post._id}/replies/${reply._id}`, {
      content: editingReplyContent.value
    })

    cancelReplyEdit()
    message.value = 'Reply updated.'
    await loadPosts()
  } catch (error) {
    message.value = errorMessage(error)
  }
}

// Asks before deleting a reply, then reloads the posts.
async function deleteReply(post, reply) {
  const shouldDelete = window.confirm('Delete this reply?')
  if (!shouldDelete) {
    return
  }

  try {
    await api.delete(`/forum/${post._id}/replies/${reply._id}`)
    message.value = 'Reply deleted.'
    await loadPosts()
  } catch (error) {
    message.value = errorMessage(error)
  }
}

// Shows the date and time in the user's local format.
function formatDate(date) {
  return new Date(date).toLocaleString()
}
</script>

<template>
  <main class="forum">
    <header class="forum-header">
      <h1>DIY Forum</h1>
      <p>Ask questions and share tips about fixing things at home.</p>
    </header>

    <section class="forum-section">
      <h2>{{ editingPostId ? 'Edit your post' : 'Create a post' }}</h2>

      <p v-if="message" class="message" role="status">{{ message }}</p>

      <form v-if="auth.isLoggedIn" @submit.prevent="savePost">
        <label for="post-title">Title</label>
        <input
          id="post-title"
          v-model="title"
          maxlength="120"
          placeholder="What do you need help with?"
          required
        />

        <label for="post-category">Category</label>
        <input
          id="post-category"
          v-model="category"
          maxlength="40"
          placeholder="For example: plumbing"
        />

        <label for="post-content">Details</label>
        <textarea
          id="post-content"
          v-model="content"
          maxlength="5000"
          rows="5"
          placeholder="Describe the problem or share your DIY tip."
          required
        ></textarea>

        <button type="submit" class="btn btn-primary mb-3">{{ editingPostId ? 'Save changes' : 'Create post' }}</button>
        <button v-if="editingPostId" type="button" class="btn btn-primary mb-3" @click="clearPostForm">Cancel</button>
      </form>
      <p v-else>
        <RouterLink :to="{ path: '/login', query: { redirect: '/forum' } }">Log in</RouterLink>
        to create a post or reply.
      </p>
    </section>

    <section class="forum-section">
      <h2>Posts</h2>
      <p v-if="loading">Loading posts...</p>
      <p v-else-if="posts.length === 0">There are no posts yet. Start the discussion!</p>

      <article v-for="post in posts" :key="post._id" class="post">
        <p class="category">{{ post.category || 'General' }}</p>
        <h3>{{ post.title }}</h3>
        <p class="post-content">{{ post.content }}</p>
        <p class="post-info">
          Posted by {{ authorName(post.authorId) }}
          on {{ formatDate(post.createdAt) }}
        </p>

        <div class="post-likes d-flex align-items-center gap-2">
          <p class="mb-3">Was this helpful?</p>
          <button
            v-if="auth.isLoggedIn"
            type="button"
            class="btn btn-success mb-3"
            :aria-pressed="hasLiked(post)"
            @click="likePost(post)"
          >
            👍 ({{ post.likes?.length || 0 }})
          </button>
          <p v-else>
            Likes: {{ post.likes?.length || 0 }} ·
            <RouterLink :to="{ path: '/login', query: { redirect: '/forum' } }">Log in to like</RouterLink>
          </p>
        </div>

        <div v-if="auth.isLoggedIn && canEdit(post.authorId)">
          <button type="button" class="btn btn-primary mb-3" @click="editPost(post)">Edit post</button>
          <button type="button" class="btn btn-primary mb-3" @click="deletePost(post)">Delete post</button>
        </div>

        <section class="replies">
          <h4>Replies ({{ post.replies.length }})</h4>

          <div v-for="reply in post.replies" :key="reply._id" class="reply">
            <p>{{ reply.content }}</p>
            <p class="post-info">
              By {{ authorName(reply.authorId) }}
              on {{ formatDate(reply.createdAt) }}
            </p>

            <form
              v-if="editingReplyId === reply._id"
              @submit.prevent="saveReply(post, reply)"
            >
              <label :for="`edit-reply-${reply._id}`">Edit reply</label>
              <textarea
                :id="`edit-reply-${reply._id}`"
                v-model="editingReplyContent"
                maxlength="2000"
                rows="3"
                required
              ></textarea>
              <button class="btn btn-primary mb-3" type="submit">Save reply</button>
              <button class="btn btn-primary mb-3" type="button" @click="cancelReplyEdit">Cancel</button>
            </form>

            <div v-else-if="auth.isLoggedIn && canEdit(reply.authorId)">
              <button type="button" class="btn btn-primary mb-3" @click="editReply(reply)">Edit reply</button>
              <button type="button" class="btn btn-primary mb-3" @click="deleteReply(post, reply)">Delete reply</button>
            </div>
          </div>

          <form v-if="auth.isLoggedIn" @submit.prevent="addReply(post)">
            <label :for="`reply-${post._id}`">Write a reply</label>
            <textarea
              :id="`reply-${post._id}`"
              v-model="replyDrafts[post._id]"
              maxlength="2000"
              rows="3"
              required
            ></textarea>
            <button class="btn btn-primary mb-3" type="submit">Add reply</button>
          </form>
        </section>
      </article>
    </section>
  </main>
</template>

<style scoped>
.forum {
  max-width: 850px;
  margin: 0 auto;
  padding: 24px;
}

.forum-header {
  background: #234c3e;
  border-radius: 8px;
  color: white;
  margin-bottom: 24px;
  padding: 28px;
}

.forum-header h1 {
  margin-top: 0;
}

.forum-section,
.post {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 20px;
  padding: 20px;
}

.forum-section h2 {
  margin-top: 0;
}

form label {
  display: block;
  font-weight: bold;
  margin: 12px 0 5px;
}

input,
textarea {
  box-sizing: border-box;
  display: block;
  margin-bottom: 12px;
  padding: 10px;
  width: 100%;
}

textarea {
  resize: vertical;
}

button {
  cursor: pointer;
  margin: 4px 6px 4px 0;
  padding: 8px 12px;
}

.post h3 {
  margin-bottom: 8px;
}

.category,
.post-info {
  color: #526159;
  font-size: 0.9rem;
}

.post-content,
.reply p {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.replies {
  border-top: 1px solid #ddd;
  margin-top: 18px;
  padding-top: 12px;
}

.reply {
  border-left: 3px solid #dce7d7;
  margin: 12px 0;
  padding-left: 12px;
}

.message {
  background: #edf5e9;
  border-radius: 4px;
  padding: 10px;
}
</style>
