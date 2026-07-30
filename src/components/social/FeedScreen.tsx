import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../services/firebase';
import {
  subscribeToFeed,
  subscribeToComments,
  createPost,
  repostPost,
  sharePost,
  likePost,
  unlikePost,
  deletePost,
  addComment,
  deleteComment,
} from '../../services/socialService';
import type { Post, PostComment } from '../../types';
import {
  Heart, MessageCircle, Send, Trash2, Plus, X, Loader2,
  BookOpen, User, Repeat2, Share2, Bookmark, MoreHorizontal, Hash, Image as ImageIcon, Link as LinkIcon,
} from 'lucide-react';
import SharePostCard from './SharePostCard';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString();
}

function formatCaption(text: string) {
  const parts = text.split(/(#\w+)/g);
  return parts.map((part, i) =>
    part.startsWith('#')
      ? <span key={i} className="text-indigo-500 dark:text-indigo-400 hover:underline cursor-pointer">{part}</span>
      : <span key={i}>{part}</span>
  );
}

function PostCard({ post, uid, onLike, onDelete, onComment, onRepost, onShare, onShareImage, comments, expandedComments, toggleComments, commentInputs, setCommentInputs, submittingComment, getAvatar }: {
  post: Post;
  uid: string;
  onLike: (p: Post) => void;
  onDelete: (id: string) => void;
  onComment: (id: string) => void;
  onRepost: (id: string) => void;
  onShare: (id: string) => void;
  onShareImage: (post: Post) => void;
  comments: PostComment[];
  expandedComments: boolean;
  toggleComments: (id: string) => void;
  commentInputs: Record<string, string>;
  setCommentInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  submittingComment: string | null;
  getAvatar: (photo: string | null, name: string, size?: string) => React.ReactNode;
}) {
  const isLiked = post.likes.includes(uid);
  const [saved, setSaved] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showShareMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) setShowShareMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showShareMenu]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {getAvatar(post.authorPhoto, post.authorName, 'w-9 h-9')}
          <div>
            <p className="text-sm font-semibold text-white">{post.authorName}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{timeAgo(post.createdAt)}</p>
          </div>
        </div>
        {post.authorUid === uid ? (
          <button onClick={() => onDelete(post.id)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition text-gray-400 hover:text-red-400">
            <Trash2 className="w-4 h-4" />
          </button>
        ) : (
          <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition text-gray-400">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Repost indicator */}
      {post.repostOf && (
        <div className="px-4 pb-1 flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
          <Repeat2 size={11} /> Reposted
        </div>
      )}

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-[15px] text-gray-200 leading-relaxed whitespace-pre-wrap">{post.content}</p>
      </div>

      {/* Action bar */}
      <div className="px-4 py-2.5 flex items-center gap-1">
        <button onClick={() => onLike(post)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition group">
          <Heart className={`w-5 h-5 transition-transform group-hover:scale-110 ${isLiked ? 'text-red-500 fill-red-500' : 'text-gray-400 dark:text-gray-300'}`} />
        </button>
        <button onClick={() => toggleComments(post.id)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition group">
          <MessageCircle className="w-5 h-5 text-gray-400 dark:text-gray-300 group-hover:scale-110 transition-transform" />
        </button>
        <button onClick={() => setShowShareMenu(!showShareMenu)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition group relative">
          <Share2 className="w-5 h-5 text-gray-400 dark:text-gray-300 group-hover:scale-110 transition-transform" />
          {showShareMenu && (
            <div ref={shareMenuRef} className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden z-50 w-44">
              <button
                onClick={() => { setShowShareMenu(false); onShareImage(post); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
              >
                <ImageIcon size={16} className="text-indigo-500" /> Share as Image
              </button>
              <button
                onClick={() => { setShowShareMenu(false); onShare(post.id); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
              >
                <LinkIcon size={16} className="text-gray-400" /> Share Link
              </button>
            </div>
          )}
        </button>
        <div className="flex-1" />
        <button onClick={() => onRepost(post.id)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition group">
          <Repeat2 className={`w-5 h-5 group-hover:scale-110 transition-transform ${post.reposts.includes(uid) ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-300'}`} />
        </button>
        <button onClick={() => setSaved(!saved)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition group">
          <Bookmark className={`w-5 h-5 group-hover:scale-110 transition-transform ${saved ? 'text-yellow-500 dark:text-yellow-400 fill-yellow-500 dark:fill-yellow-400' : 'text-gray-400 dark:text-gray-300'}`} />
        </button>
      </div>

      {/* Likes */}
      {(post.likes.length > 0 || post.shares > 0) && (
        <div className="px-4 pb-1 space-y-0.5">
          {post.likes.length > 0 && (
            <p className="text-sm font-bold text-gray-800 dark:text-white">{post.likes.length.toLocaleString()} {post.likes.length === 1 ? 'like' : 'likes'}</p>
          )}
        </div>
      )}

      {/* Caption */}
      {post.content && (
        <div className="px-4 pb-1">
          <p className="text-sm text-gray-700 dark:text-gray-200">
            <span className="font-bold text-gray-900 dark:text-white mr-1.5">{post.authorName}</span>
            {formatCaption(post.content)}
          </p>
        </div>
      )}

      {/* View comments */}
      {(post.commentCount > 0 || expandedComments) && (
        <button onClick={() => toggleComments(post.id)} className="px-4 pb-1 text-left w-full">
          <p className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition">
            {post.commentCount > 0 && !expandedComments
              ? `View all ${post.commentCount} comment${post.commentCount !== 1 ? 's' : ''}`
              : post.commentCount > 0 ? 'Hide comments' : ''
            }
          </p>
        </button>
      )}

      {/* Comments section */}
      {expandedComments && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 space-y-3 max-h-64 overflow-y-auto">
          {comments.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">No comments yet</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2.5 group">
                {getAvatar(c.authorPhoto, c.authorName, 'w-7 h-7')}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 dark:text-gray-200">
                    <span className="font-semibold text-gray-900 dark:text-white mr-1.5">{c.authorName}</span>
                    {c.content}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{timeAgo(c.createdAt)}</span>
                    {c.authorUid === uid && (
                      <button onClick={() => onDelete(c.id)} className="text-[10px] text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition">Delete</button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Comment input */}
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
        <input
          type="text"
          value={commentInputs[post.id] || ''}
          onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onComment(post.id); } }}
          placeholder="Add a comment..."
          className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none"
        />
        <button
          onClick={() => onComment(post.id)}
          disabled={!commentInputs[post.id]?.trim() || submittingComment === post.id}
          className="text-indigo-400 font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:text-indigo-300 transition"
        >
          {submittingComment === post.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
        </button>
      </div>
    </div>
  );
}

export default function FeedScreen() {
  const { user } = useAuth();
  const uid = auth.currentUser?.uid || '';

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [postText, setPostText] = useState('');
  const [posting, setPosting] = useState(false);

  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, PostComment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);
  const [showRepost, setShowRepost] = useState<string | null>(null);
  const [repostCaption, setRepostCaption] = useState('');
  const [shareCardPost, setShareCardPost] = useState<Post | null>(null);

  const commentUnsubs = useRef<Record<string, () => void>>({});

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToFeed(uid, (list) => { setPosts(list); setLoading(false); });
    return unsub;
  }, [uid]);

  useEffect(() => {
    const expanded = Array.from(expandedComments);
    const currentUnsubs = commentUnsubs.current;
    for (const postId of expanded) {
      if (!currentUnsubs[postId]) {
        currentUnsubs[postId] = subscribeToComments(postId, (list) => {
          setComments((prev) => ({ ...prev, [postId]: list }));
        });
      }
    }
    for (const postId of Object.keys(currentUnsubs)) {
      if (!expanded.includes(postId)) { currentUnsubs[postId](); delete currentUnsubs[postId]; }
    }
  }, [expandedComments]);

  useEffect(() => () => { Object.values(commentUnsubs.current).forEach((u) => u()); }, []);

  const toggleComments = useCallback((id: string) => {
    setExpandedComments((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);

  const handleCreatePost = async () => {
    if (!postText.trim() || !uid) return;
    setPosting(true);
    try {
      await createPost({ uid, name: user?.fullName || 'Student', photo: user?.photoURL || null }, postText.trim());
      setPostText(''); setShowComposer(false);
    } catch (err) {
      console.error('Failed to create post:', err);
      alert('Failed to post. Please try again.');
    } finally { setPosting(false); }
  };

  const handleRepost = async (postId: string) => {
    if (!uid) return;
    await repostPost({ uid, name: user?.fullName || 'Student', photo: user?.photoURL || null }, postId, repostCaption.trim());
    setShowRepost(null); setRepostCaption('');
  };

  const handleShare = async (postId: string) => {
    await sharePost(postId);
    if (navigator.share) { try { await navigator.share({ text: 'Check this out on STand!' }); } catch { } }
  };

  const handleLike = async (post: Post) => {
    if (!uid) return;
    try { if (post.likes.includes(uid)) await unlikePost(post.id, uid); else await likePost(post.id, uid); } catch { }
  };

  const handleDeletePost = async (id: string) => { await deletePost(id); };

  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text || !uid) return;
    setSubmittingComment(postId);
    try {
      await addComment(postId, { uid, name: user?.fullName || 'Student', photo: user?.photoURL || null }, text);
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    } finally { setSubmittingComment(null); }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => { await deleteComment(postId, commentId); };

  const getAvatar = (photoURL: string | null, name: string, size: string = 'w-9 h-9') => {
    if (photoURL) return <img src={photoURL} alt="" className={`${size} rounded-full object-cover`} />;
    return (
      <div className={`${size} rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
        {name.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pt-2">
        <BookOpen className="w-6 h-6 text-indigo-400" />
        <h1 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">Feed</h1>
        <span className="text-[10px] text-gray-400 dark:text-gray-600 uppercase tracking-widest ml-auto font-medium">Public</span>
      </div>

      {/* Composer */}
      <button
        onClick={() => setShowComposer(true)}
        className="w-full mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors group"
      >
        {getAvatar(user?.photoURL || null, user?.fullName || 'Student', 'w-10 h-10')}
        <span className="text-gray-400 dark:text-gray-500 text-sm group-hover:text-gray-600 dark:group-hover:text-gray-400 transition">Share something with the community...</span>
        <Plus className="w-5 h-5 text-indigo-400 ml-auto" />
      </button>

      {/* Composer modal */}
      {showComposer && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowComposer(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-base font-bold text-gray-800 dark:text-white">New Post</h3>
              <button onClick={() => setShowComposer(false)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-4">
              <div className="flex items-start gap-3 mb-3">
                {getAvatar(user?.photoURL || null, user?.fullName || 'Student')}
                <textarea
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  placeholder="What's on your mind? Use #hashtags"
                  rows={4}
                  className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none resize-none"
                  autoFocus
                />
              </div>
              <button
                onClick={handleCreatePost}
                disabled={!postText.trim() || posting}
                className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-sm font-bold transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repost modal */}
      {showRepost && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowRepost(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 shadow-2xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2"><Repeat2 size={16} className="text-green-500" /> Repost</h3>
              <button onClick={() => setShowRepost(null)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <textarea
              value={repostCaption}
              onChange={(e) => setRepostCaption(e.target.value)}
              placeholder="Add a caption..."
              rows={2}
              className="w-full bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none border border-gray-200 dark:border-gray-600 focus:border-indigo-400 dark:focus:border-indigo-500 resize-none mb-3"
            />
            <button onClick={() => handleRepost(showRepost)} className="w-full py-2.5 bg-green-500 hover:bg-green-400 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
              <Repeat2 size={14} /> Repost
            </button>
          </div>
        </div>
      )}

      {/* Posts */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-16 text-center">
          <BookOpen className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No posts yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Be the first to share!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              uid={uid}
              onLike={handleLike}
              onDelete={handleDeletePost}
              onComment={handleAddComment}
              onRepost={(id) => setShowRepost(id)}
              onShare={handleShare}
              onShareImage={(p) => setShareCardPost(p)}
              comments={comments[post.id] || []}
              expandedComments={expandedComments.has(post.id)}
              toggleComments={toggleComments}
              commentInputs={commentInputs}
              setCommentInputs={setCommentInputs}
              submittingComment={submittingComment}
              getAvatar={getAvatar}
            />
          ))}
        </div>
      )}

      {/* Share as Image card */}
      <SharePostCard
        post={shareCardPost || { id: '', authorUid: '', authorName: '', authorPhoto: null, content: '', type: 'text', mediaUrl: '', mediaType: '', likes: [], commentCount: 0, reposts: [], shares: 0, createdAt: '' }}
        isOpen={!!shareCardPost}
        onClose={() => setShareCardPost(null)}
      />
    </div>
  );
}
