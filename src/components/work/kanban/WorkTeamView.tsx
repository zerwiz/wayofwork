/**
 * Board Members Management Component
 * Add/remove members, manage roles, invite by email
 */

import React, { useState, useEffect } from 'react';
import { X, UserPlus, Mail, Search, Shield, Eye, User, Trash2 } from 'lucide-react';
import type { Board, BoardMember } from '../../../types/kanban';
import { kanbanService } from '../../../services/mockKanbanService';
import { useToast } from '../../../context/ToastContext';
import { ConfirmationModal } from '../../modals/ConfirmationModal';

interface BoardMembersProps {
  board: Board;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export const WorkTeamView: React.FC<BoardMembersProps> = ({ board, isOpen, onClose, onUpdated }) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (isOpen && board) {
      loadMembers();
    }
  }, [isOpen, board]);

  const loadMembers = async () => {
    try {
      const boardMembers = await kanbanService.getBoardMembers(board.id);
      // If no members, add the creator as owner
      if (boardMembers.length === 0 && board.createdBy) {
        const ownerMember: BoardMember = {
          id: `member-${board.createdBy}`,
          userId: board.createdBy,
          email: `${board.createdBy}@example.com`, // Mock email
          displayName: 'Board Owner',
          role: 'owner',
          addedAt: board.createdAt || new Date().toISOString(),
        };
        setMembers([ownerMember]);
      } else {
        setMembers(boardMembers);
      }
    } catch (error) {
      console.error('Failed to load members:', error);
      setMembers([]);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      showToast({
        type: 'error',
        message: 'Please enter an email address',
        duration: 2000,
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      showToast({
        type: 'error',
        message: 'Please enter a valid email address',
        duration: 2000,
      });
      return;
    }

    setIsLoading(true);
    try {
      await kanbanService.inviteBoardMember(board.id, inviteEmail.trim(), inviteRole);
      showToast({
        type: 'success',
        message: `Invitation sent to ${inviteEmail}`,
        duration: 2000,
      });
      setInviteEmail('');
      setInviteRole('member');
      setShowInviteForm(false);
      loadMembers();
      if (onUpdated) onUpdated();
    } catch (error: any) {
      console.error('Failed to invite member:', error);
      showToast({
        type: 'error',
        message: error.message || 'Failed to invite member',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMemberClick = (memberId: string, memberName: string) => {
    setMemberToRemove({ id: memberId, name: memberName });
    setShowRemoveConfirm(true);
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    setIsLoading(true);
    try {
      await kanbanService.removeBoardMember(board.id, memberToRemove.id);
      showToast({
        type: 'success',
        message: 'Member removed successfully',
        duration: 2000,
      });
      loadMembers();
      if (onUpdated) onUpdated();
      setShowRemoveConfirm(false);
      setMemberToRemove(null);
    } catch (error: any) {
      console.error('Failed to remove member:', error);
      showToast({
        type: 'error',
        message: error.message || 'Failed to remove member',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: 'admin' | 'member' | 'viewer') => {
    setIsLoading(true);
    try {
      await kanbanService.updateBoardMemberRole(board.id, memberId, newRole);
      showToast({
        type: 'success',
        message: 'Member role updated successfully',
        duration: 2000,
      });
      loadMembers();
      if (onUpdated) onUpdated();
    } catch (error: any) {
      console.error('Failed to change role:', error);
      showToast({
        type: 'error',
        message: error.message || 'Failed to update member role',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Shield className="w-4 h-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'viewer':
        return <Eye className="w-4 h-4 text-[#858585]" />;
      default:
        return <User className="w-4 h-4 text-[#858585]" />;
    }
  };

  const getRoleLabel = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  if (!isOpen) return null;

  const filteredMembers = members.filter((member) =>
    member.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-[#1e1e1e] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#1e1e1e] border-b border-gray-700 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-[#cccccc]">Board Members</h2>
            <p className="text-sm text-[#858585] mt-1">Manage who can access this board</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#252526] rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5 text-[#858585]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Search and Invite */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#858585]" />
              <input
                type="text"
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#252526] border border-[#3c3c3c] rounded-lg text-[#cccccc] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="px-4 py-2 bg-orange-600 text-[#cccccc] rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Invite
            </button>
          </div>

          {/* Invite Form */}
          {showInviteForm && (
            <div className="p-4 bg-[#252526] rounded-lg border border-[#3c3c3c]">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="w-4 h-4 text-[#858585]" />
                <label className="text-sm font-semibold text-[#cccccc]">Invite by Email</label>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isLoading) handleInvite();
                    }}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg text-[#cccccc] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member' | 'viewer')}
                    disabled={isLoading}
                    className="px-3 py-2 bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg text-[#cccccc] focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleInvite}
                    disabled={isLoading || !inviteEmail.trim()}
                    className="flex-1 px-4 py-2 bg-orange-600 text-[#cccccc] rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Sending...' : 'Send Invite'}
                  </button>
                  <button
                    onClick={() => {
                      setShowInviteForm(false);
                      setInviteEmail('');
                      setInviteRole('member');
                    }}
                    disabled={isLoading}
                    className="px-4 py-2 bg-gray-600 text-[#cccccc] rounded-lg hover:bg-gray-500 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Members List */}
          <div className="space-y-2">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-[#858585]">
                <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No members found</p>
              </div>
            ) : (
              filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-[#252526] rounded-lg hover:bg-gray-650 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center text-[#cccccc] font-semibold flex-shrink-0">
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.displayName} className="w-full h-full rounded-full" />
                      ) : (
                        member.displayName.charAt(0).toUpperCase()
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[#cccccc] font-medium truncate">{member.displayName}</span>
                        {getRoleIcon(member.role)}
                        <span className="text-xs text-[#858585]">{getRoleLabel(member.role)}</span>
                      </div>
                      <p className="text-xs text-[#858585] truncate">{member.email}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  {member.role !== 'owner' && (
                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        onChange={(e) =>
                          handleChangeRole(member.id, e.target.value as 'admin' | 'member' | 'viewer')
                        }
                        className="px-3 py-1 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-sm text-[#cccccc] focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        onClick={() => handleRemoveMemberClick(member.id, member.displayName)}
                        disabled={isLoading}
                        className="p-2 text-red-400 hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Remove Member Confirmation Modal */}
      {memberToRemove && (
        <ConfirmationModal
          isOpen={showRemoveConfirm}
          onClose={() => {
            setShowRemoveConfirm(false);
            setMemberToRemove(null);
          }}
          onConfirm={handleRemoveMember}
          title="Remove Member"
          message={`Remove ${memberToRemove.name} from this board?`}
          type="warning"
          confirmText="Remove"
          cancelText="Cancel"
        />
      )}
    </div>
  );
};
