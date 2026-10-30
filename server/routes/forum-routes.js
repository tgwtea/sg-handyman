import express from 'express';
import forumController from '../controllers/forum-controller.js';
import { requireLogin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', forumController.getPosts);
router.post('/', requireLogin, forumController.createPost);
router.put('/:postId', requireLogin, forumController.updatePost);
router.delete('/:postId', requireLogin, forumController.deletePost);
router.post('/:postId/likes', requireLogin, forumController.likePost);
router.post('/:postId/replies', requireLogin, forumController.createReply);
router.put('/:postId/replies/:replyId', requireLogin, forumController.updateReply);
router.delete('/:postId/replies/:replyId', requireLogin, forumController.deleteReply);

export default router;
