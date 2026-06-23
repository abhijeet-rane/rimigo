import { useState, useMemo, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Pencil, Trash2, Send, X, Check } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { contentCollectionApi } from '../api/contentCollectionApi'
import { travelerCollectionApi } from '../api/travelerCollectionApi'
import { useUserInfo } from '@/hooks/useUserInfo'
import { useTravelerExpert } from '../hooks/useTravelerExpert'
import type { Block, CommentBlockValue } from '../types/contentCollection'

const CommentAuthorAvatar: React.FC<{ authorId?: string; authorName?: string }> = ({ authorId, authorName }) => {
    const { data } = useTravelerExpert(authorId)
    const iconUrl = data?.user_icon_url
    const initial = (authorName ?? '?')[0]

    if (iconUrl) {
        return (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-grey-3 overflow-hidden">
                <img
                    src={iconUrl}
                    alt={authorName ?? ''}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        const img = e.currentTarget
                        img.style.display = 'none'
                        const parent = img.parentElement
                        if (parent) {
                            parent.classList.add('flex', 'items-center', 'justify-center')
                            parent.innerHTML = `<span class="text-[12px] font-bold text-white uppercase font-red-hat-display">${initial}</span>`
                        }
                    }}
                />
            </div>
        )
    }

    return (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-grey-3 flex items-center justify-center overflow-hidden">
            <span className="text-[12px] font-bold text-white uppercase font-red-hat-display">{initial}</span>
        </div>
    )
}

interface SectionCommentsProps {
    sectionId: string
    allBlocks: Block[]
    collectionIdentifier: string
    collectionType: 'content' | 'traveler'
    isRimigoInternal: boolean
    queryKeyPrefix: string
}

const SectionComments: React.FC<SectionCommentsProps> = ({
    sectionId,
    allBlocks,
    collectionIdentifier,
    collectionType,
    isRimigoInternal,
    queryKeyPrefix
}) => {
    const queryClient = useQueryClient()
    const { user } = useUserInfo()
    const [newCommentText, setNewCommentText] = useState('')
    const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
    const [editText, setEditText] = useState('')
    const [showInput, setShowInput] = useState(false)

    const api = collectionType === 'content' ? contentCollectionApi : travelerCollectionApi

    const comments = useMemo(() => {
        return allBlocks
            .filter((b) => b.block_type === 'comment')
            .sort((a, b) => {
                const aTime = (a.value as unknown as CommentBlockValue)?.created_at ?? ''
                const bTime = (b.value as unknown as CommentBlockValue)?.created_at ?? ''
                return aTime.localeCompare(bTime)
            })
    }, [allBlocks])

    const invalidate = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: [queryKeyPrefix, collectionIdentifier] })
    }, [queryClient, queryKeyPrefix, collectionIdentifier])

    const addMutation = useMutation({
        mutationFn: async (text: string) => {
            const now = new Date().toISOString()
            return api.addBlockToSection(collectionIdentifier, sectionId, {
                block_type: 'comment',
                value: {
                    text,
                    author_id: user?.id ?? '',
                    author_name: user?.name ?? 'Unknown',
                    created_at: now,
                    updated_at: now
                }
            })
        },
        onSuccess: () => {
            setNewCommentText('')
            setShowInput(false)
            invalidate()
        }
    })

    const editMutation = useMutation({
        mutationFn: async ({ blockId, text, existingValue }: { blockId: string; text: string; existingValue: CommentBlockValue }) => {
            return api.updateBlock(collectionIdentifier, sectionId, blockId, {
                value: {
                    ...existingValue,
                    text,
                    updated_at: new Date().toISOString()
                }
            })
        },
        onSuccess: () => {
            setEditingBlockId(null)
            setEditText('')
            invalidate()
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async (blockId: string) => {
            const remainingBlocks = allBlocks
                .filter((b) => b.id !== blockId)
                .map((b) => ({
                    block_type: b.block_type,
                    label: b.label ?? undefined,
                    description: b.description ?? undefined,
                    value: b.value as Record<string, unknown>
                }))
            return api.updateSectionBlocks(collectionIdentifier, sectionId, remainingBlocks)
        },
        onSuccess: invalidate
    })

    const handleAdd = () => {
        const trimmed = newCommentText.trim()
        if (!trimmed) return
        addMutation.mutate(trimmed)
    }

    const handleEdit = (block: Block) => {
        const val = block.value as unknown as CommentBlockValue
        if (!block.id) return
        const trimmed = editText.trim()
        if (!trimmed || trimmed === val.text) {
            setEditingBlockId(null)
            return
        }
        editMutation.mutate({ blockId: block.id, text: trimmed, existingValue: val })
    }

    const startEdit = (block: Block) => {
        const val = block.value as unknown as CommentBlockValue
        setEditingBlockId(block.id ?? null)
        setEditText(val.text ?? '')
    }

    // Nothing to show for non-internal users with no comments
    if (!isRimigoInternal && comments.length === 0) {
        return null
    }

    const hasComments = comments.length > 0

    const formatTime = (dateStr: string) => {
        try { return formatDistanceToNow(new Date(dateStr), { addSuffix: true }) }
        catch { return '' }
    }

    return (
        <div className={`rounded-b-xl pb-3 px-3 ${hasComments ? 'bg-[#dfdde0] -mt-4 pt-7' : isRimigoInternal ? 'bg-[#dfdde0] -mt-4 pt-6' : ''}`}>
            {/* Comments list */}
            {hasComments && (
                <div className="flex flex-col gap-3">
                    {comments.map((block) => {
                        const val = block.value as unknown as CommentBlockValue
                        const isEditing = editingBlockId === block.id

                        return (
                            <div
                                key={block.id}
                                className="flex items-start gap-2 group">
                                <CommentAuthorAvatar authorId={val.author_id} authorName={val.author_name} />

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-1 flex-wrap">
                                        <span className="text-[12px] font-bold text-grey-0 font-red-hat-display tracking-[-0.24px] leading-4">{val.author_name}</span>
                                        <span className="text-[12px] font-bold italic text-[#00a878] font-red-hat-display tracking-[-0.24px] leading-4">
                                            (Travel expert)
                                        </span>
                                        {(val.updated_at || val.created_at) && (
                                            <span className="text-[10px] text-grey-2 font-medium font-manrope">
                                                · {formatTime(val.updated_at ?? val.created_at)}
                                            </span>
                                        )}
                                    </div>
                                    {isEditing ? (
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <input
                                                type="text"
                                                value={editText}
                                                onChange={(e) => setEditText(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleEdit(block)
                                                    if (e.key === 'Escape') setEditingBlockId(null)
                                                }}
                                                className="flex-1 text-xs font-semibold font-manrope text-grey-0 bg-white rounded px-1.5 py-0.5 outline-none border border-grey-4 focus:border-grey-3"
                                                disabled={editMutation.isPending}
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => handleEdit(block)}
                                                disabled={editMutation.isPending}
                                                className="p-0.5 text-grey-3 hover:text-green-600">
                                                <Check className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={() => setEditingBlockId(null)}
                                                className="p-0.5 text-grey-3 hover:text-grey-0">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-[12px] font-semibold text-grey-1 leading-4 tracking-[-0.24px] font-manrope">{val.text}</p>
                                    )}
                                </div>

                                {/* Edit/Delete — internal users only, not while editing */}
                                {isRimigoInternal && !isEditing && (
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                        <button
                                            onClick={() => startEdit(block)}
                                            className="p-0.5 text-grey-3 hover:text-grey-1">
                                            <Pencil className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={() => block.id && deleteMutation.mutate(block.id)}
                                            disabled={deleteMutation.isPending}
                                            className="p-0.5 text-grey-3 hover:text-red-500">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Add comment — internal users only */}
            {isRimigoInternal && (
                <div className={hasComments ? 'mt-3 pt-2 border-t border-grey-3/30' : ''}>
                    {showInput ? (
                        <div className="flex items-center gap-1.5">
                            <input
                                type="text"
                                placeholder="Add a comment..."
                                value={newCommentText}
                                onChange={(e) => setNewCommentText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAdd()
                                    if (e.key === 'Escape') {
                                        setShowInput(false)
                                        setNewCommentText('')
                                    }
                                }}
                                className="flex-1 text-[12px] font-semibold font-manrope text-grey-0 bg-white rounded-[8px] px-2.5 py-1.5 outline-none border border-grey-4 focus:border-grey-3 placeholder:text-grey-3"
                                disabled={addMutation.isPending}
                                autoFocus
                            />
                            <button
                                onClick={handleAdd}
                                disabled={addMutation.isPending || !newCommentText.trim()}
                                className="p-1.5 text-grey-3 hover:text-grey-0 disabled:opacity-40">
                                <Send className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => { setShowInput(false); setNewCommentText('') }}
                                className="p-1.5 text-grey-3 hover:text-grey-0">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowInput(true)}
                            className="flex items-center gap-1 text-[11px] font-semibold text-grey-1 hover:text-grey-0 transition-colors font-manrope">
                            <MessageSquare className="w-3 h-3" />
                            <span>{hasComments ? 'Add comment' : 'Add a comment'}</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

export default SectionComments
