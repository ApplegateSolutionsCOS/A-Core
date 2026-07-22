import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SendIcon, TrashIcon, CloseIcon, MessageIcon } from '@/components/icons/Icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Comment {
  id: string;
  record_id: string;
  mini_app_id: string;
  user_id: string;
  user_name: string;
  comment_text: string;
  created_at: string;
}

interface RecordCommentsProps {
  recordId: string;
  miniAppId: string;
  wsColor: { primary: string; rgb: string };
  onClose?: () => void;
  inline?: boolean;
}

const timeAgo = (dateStr: string): string => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const RecordComments: React.FC<RecordCommentsProps> = ({
  recordId, miniAppId, wsColor, onClose, inline = false,
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userId = user ? (user as any).id || (user as any).email || 'anonymous' : 'anonymous';
  const userName = user ? ((user as any).display_name || (user as any).email || 'User') : 'User';

  const loadComments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('record_comments')
        .select('*')
        .eq('record_id', recordId)
        .eq('mini_app_id', miniAppId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setComments(data);
      }
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [recordId, miniAppId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`record-comments-${recordId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'record_comments',
        filter: `record_id=eq.${recordId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setComments(prev => [...prev, payload.new as Comment]);
        } else if (payload.eventType === 'DELETE') {
          setComments(prev => prev.filter(c => c.id !== (payload.old as any).id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [recordId]);

  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    setIsSending(true);
    try {
      const { error } = await supabase
        .from('record_comments')
        .insert({
          record_id: recordId,
          mini_app_id: miniAppId,
          user_id: userId,
          user_name: userName,
          comment_text: newComment.trim(),
        });

      if (error) throw error;
      setNewComment('');
      // Realtime will handle adding it, but also reload as fallback
      await loadComments();
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('record_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  };

  return (
    <div className={`flex flex-col ${inline ? '' : 'h-full'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid rgba(${wsColor.rgb}, 0.2)`, background: `linear-gradient(to right, rgba(${wsColor.rgb}, 0.06), transparent)` }}>
        <div className="flex items-center gap-2">
          <MessageIcon size={15} style={{ color: wsColor.primary }} />
          <h3 className="text-sm font-mono font-medium" style={{ color: wsColor.primary }}>
            Comments
          </h3>
          <span className="text-[10px] text-gray-500 font-mono">({comments.length})</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-white transition-colors">
            <CloseIcon size={14} />
          </button>
        )}
      </div>

      {/* Comments list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 darkwave-scrollbar" style={{ maxHeight: inline ? '300px' : 'calc(100% - 120px)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)`, borderTopColor: wsColor.primary }} />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageIcon size={24} className="mx-auto mb-2 text-gray-700" />
            <p className="text-xs text-gray-600 font-mono">No comments yet</p>
            <p className="text-[10px] text-gray-700 font-mono mt-1">Be the first to comment</p>
          </div>
        ) : (
          comments.map((comment) => {
            const isOwn = comment.user_id === userId;
            const initials = comment.user_name
              .split(' ')
              .map(n => n[0])
              .join('')
              .substring(0, 2)
              .toUpperCase();

            return (
              <div
                key={comment.id}
                className="group bg-gray-900/50 rounded-lg p-3 transition-all hover:bg-gray-900/70"
                style={{ border: `1px solid rgba(${wsColor.rgb}, 0.08)` }}
              >
                <div className="flex items-start gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono font-medium flex-shrink-0"
                    style={{
                      background: `linear-gradient(135deg, rgba(${wsColor.rgb}, 0.25), rgba(0,0,0,0.8))`,
                      color: wsColor.primary,
                      border: `1px solid rgba(${wsColor.rgb}, 0.3)`,
                    }}
                  >
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-white font-medium">{comment.user_name}</span>
                      <span className="text-[10px] text-gray-600 font-mono">{timeAgo(comment.created_at)}</span>
                      {isOwn && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="ml-auto p-1 text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                          title="Delete comment"
                        >
                          <TrashIcon size={12} />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 font-mono whitespace-pre-wrap break-words">{comment.comment_text}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="p-3" style={{ borderTop: `1px solid rgba(${wsColor.rgb}, 0.15)` }}>
        <div className="flex gap-2">
          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment..."
            rows={1}
            className="flex-1 bg-gray-900/80 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none resize-none transition-all"
            style={{ border: `1px solid rgba(${wsColor.rgb}, 0.25)` }}
            onFocus={e => { e.currentTarget.style.borderColor = `rgba(${wsColor.rgb}, 0.5)`; }}
            onBlur={e => { e.currentTarget.style.borderColor = `rgba(${wsColor.rgb}, 0.25)`; }}
          />
          <button
            onClick={handleSendComment}
            disabled={isSending || !newComment.trim()}
            className="p-2 rounded-lg transition-all disabled:opacity-30"
            style={{
              background: `rgba(${wsColor.rgb}, 0.15)`,
              border: `1px solid rgba(${wsColor.rgb}, 0.3)`,
            }}
          >
            <SendIcon size={14} style={{ color: wsColor.primary }} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordComments;
