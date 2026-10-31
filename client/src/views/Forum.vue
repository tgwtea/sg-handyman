<script setup>
import { computed, onMounted, ref } from 'vue'
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
const postToDelete = ref(null)
const deletingPost = ref(false)
const searchInput = ref('')
const searchTerm = ref('')
const selectedCategory = ref('')

const popularCategories = [
  'Leaking tap',
  'Aircon servicing',
  'Power trip',
  'Door lock',
  'Wall mounting',
  'Others'
]

const filteredPosts = computed(() => {
  const lcSearchTerm = searchTerm.value.toLowerCase() // Searched text in searchbar 
  const lcCategory = selectedCategory.value.toLowerCase() // Selected category 

  if (searchTerm.value.length === 0 && selectedCategory.value.length === 0) {
    return posts.value
  }

  return posts.value.filter(post => {
    let postText = post.title + ' ' + post.category + ' ' + post.content //make all the post data into a string 

    for (const reply of post.replies) {
      postText = postText + ' ' + reply.content
    } // add the replies into the post's string 

    postText = postText.toLowerCase()

    const matchesSearch = postText.includes(lcSearchTerm) // check if each post and replies contains what the user searched 
    const postCategory = (post.category || '').toLowerCase()
    const matchesCategory = lcCategory.length === 0 || postCategory === lcCategory

    return matchesSearch && matchesCategory
  })
})

// Loads the posts from the server and shows any errors
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

// Applies filtering by the text entered in the search bar
function searchPosts() {
  searchTerm.value = searchInput.value.trim()
  selectedCategory.value = ''
}

// Filters posts by a popular category while ensuring it filters by both text and select category
function searchByCategory(categoryName) {
  selectedCategory.value = categoryName
  searchTerm.value = searchInput.value.trim() 
}

// Clears the search bar and shows all posts again
function showAllPosts() {
  selectedCategory.value = ''
  searchInput.value = ''
  searchTerm.value = ''
}

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

// Creates a post or saves changes, then reloads the posts
async function savePost() {
  message.value = ''

  if (!category.value) {
    message.value = 'Please choose a category.'
    return
  }

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

  // Opens the confirmation dialog for deleting a post.
  function deletePost(post) {
    postToDelete.value = post
  }

  // Deletes the selected post after the user confirms.
  async function confirmDeletePost() {
    if (!postToDelete.value) {
      return
    }

    deletingPost.value = true
    try {
      await api.delete(`/forum/${postToDelete.value._id}`)
      message.value = 'Post deleted.'
      postToDelete.value = null
      await loadPosts()
    } catch (error) {
      message.value = errorMessage(error)
      postToDelete.value = null
    } finally {
      deletingPost.value = false
    }
  }

  // Closes the dialog without deleting the post.
  function cancelDeletePost() {
    postToDelete.value = null
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

      <form v-if="auth.isLoggedIn" class="post-form" @submit.prevent="savePost">
        <label for="post-title">Title</label>
        <input
          id="post-title"
          v-model="title"
          maxlength="120"
          placeholder="What do you need help with?"
          required
        />

        <label id="post-category-label">Category</label>
        <div class="category-radio-options" role="radiogroup" aria-labelledby="post-category-label">
          <label
            v-for="popularCategory in popularCategories"
            :key="popularCategory"
            class="category-radio-option"
          >
            <input
              v-model="category"
              type="radio"
              name="post-category"
              :value="popularCategory"
              required
            />
            {{ popularCategory }}
          </label>
        </div>

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
      <div class="posts-heading">
        <h2>Posts</h2>
        <form class="search-form" @submit.prevent="searchPosts">
          <input
            v-model="searchInput"
            type="search"
            aria-label="Search forum posts"
            placeholder="Search posts..."
          />
          <button type="submit" class="btn btn-primary">Search</button>
        </form>
      </div>
      <p v-if="loading">Loading posts...</p>
      <p v-else-if="posts.length === 0">There are no posts yet. Start the discussion!</p>

      <div class="post-search">
        <div class="popular-searches">
          <span>Popular:</span>
          <button
            v-for="popularCategory in popularCategories"
            :key="popularCategory"
            type="button"
            class="btn btn-light"
            :class="{ 'active-category': selectedCategory === popularCategory }"
            @click="searchByCategory(popularCategory)"
          >
            {{ popularCategory }}
          </button>
          <button
            v-if="searchTerm || selectedCategory"
            type="button"
            class="btn btn-light"
            @click="showAllPosts"
          >
            All posts
          </button>
        </div>
      </div>

      <p v-if="posts.length > 0 && filteredPosts.length === 0">
        No matching posts found.
      </p>

      <article v-for="post in filteredPosts" :key="post._id" class="post">
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

    <div
      v-if="postToDelete"
      class="delete-dialog-backdrop"
      @click.self="cancelDeletePost"
    >
      <section
        class="delete-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-message"
      >
        <header class="delete-dialog-header">
          <span aria-hidden="true">🗑</span>
          <h2 id="delete-dialog-title">Confirm Deletion</h2>
          <button
            type="button"
            class="close-button"
            :disabled="deletingPost"
            aria-label="Close confirmation"
            @click="cancelDeletePost"
          >
            ×
          </button>
        </header>
        <div class="delete-dialog-body">
          <p id="delete-dialog-message" class="delete-warning">
            <span class="warning-icon" aria-hidden="true">!</span>
            <span>Are you sure you want to delete this DIY post? This action cannot be undone.</span>
          </p>
          <p class="delete-dialog-note">
            Note: Deleting will permanently erase this topic and all associated replies.
          </p>
        </div>
        <footer class="delete-dialog-actions">
          <button
            type="button"
            class="btn btn-secondary"
            :disabled="deletingPost"
            autofocus
            @click="cancelDeletePost"
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-success"
            :disabled="deletingPost"
            @click="confirmDeletePost"
          >
            {{ deletingPost ? 'Deleting...' : '✓ Yes, Delete Post' }}
          </button>
        </footer>
      </section>
    </div>
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

.delete-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.5);
}

.delete-dialog {
  width: 100%;
  max-width: 440px;
  overflow: hidden;
  border: 3px solid #c8201c;
  border-radius: 8px;
  background: #fff1f0;
}

.delete-dialog-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #c8201c;
  color: white;
}

.delete-dialog-header h2 {
  flex: 1;
  margin: 0;
  font-size: 18px;
}

.close-button {
  margin: 0;
  padding: 0 4px;
  border: 0;
  background: transparent;
  color: white;
  font-size: 24px;
}

.delete-dialog-body {
  padding: 16px;
  background: #fff1f0;
}

.delete-warning {
  display: flex;
  gap: 10px;
  margin: 0;
  padding: 12px;
  border: 1px solid #f0a8a5;
  border-radius: 6px;
  background: #fff1f0;
  color: #244b38;
  font-size: 14px;
}

.warning-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #a31916;
  color: white;
  text-align: center;
  font-weight: bold;
}

.delete-dialog-note {
  margin: 12px 0 0;
  color: #68758a;
  font-size: 12px;
  font-style: italic;
}

.delete-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #f0a8a5;
  background: #fee2e2;
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

.posts-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.posts-heading h2 {
  margin-bottom: 0;
}

.post-search {
  margin: 16px 0 20px;
  padding: 0;
}

.search-form {
  display: flex;
  gap: 12px;
  width: min(100%, 360px);
}

.search-form input {
  flex: 1;
  min-width: 0;
  width: auto;
  margin: 0;
  border: 1px solid #d5d9e2;
  border-radius: 6px;
  font: inherit;
}

.search-form button {
  margin: 0;
}

.popular-searches,
.category-radio-options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.popular-searches {
  margin-top: 0;
}

.popular-searches .btn {
  margin: 0;
  border-radius: 20px;
}

.popular-searches .active-category {
  background: #fbd000;
}

.post-form .category-radio-option {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 8px 12px;
  border: 2px solid #1a1a2e;
  border-radius: 20px;
  background: white;
  font-family: var(--font-display);
  font-size: 0.9rem;
  cursor: pointer;
}

.category-radio-option input[type='radio'] {
  display: inline-block;
  width: auto;
  margin: 0;
  padding: 0;
}

form label {
  display: block;
  font-weight: bold;
  margin: 12px 0 5px;
}

.post-form label {
  font-family: var(--font-display);
  font-size: 25px;
}

input,
select,
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

@media (max-width: 500px) {
  .posts-heading {
    align-items: stretch;
    flex-direction: column;
    gap: 8px;
  }

  .search-form {
    width: 100%;
  }
}
</style>
