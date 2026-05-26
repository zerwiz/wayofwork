import React, { useState, useEffect } from 'react';
import { X, Users, Globe, Lock, UserPlus, Trash2, Check, ExternalLink, HelpCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { projectsService } from '../../services/projectsService'; // For fetching project members
import { AuthInfo } from '../../../server/router'; // Assuming AuthInfo is available or defined
import { getAuth } from '../../utils/auth'; // Assuming a utility to get auth info

// Define a type for the resource permission
interface ResourcePermission {
    resource_id: string;
    resource_type: 'kanban_board' | 'workspace_file' | 'document' | 'task';
    owner_id: string;
    visibility: 'private' | 'shared' | 'tenant';
    created_at: string;
    updated_at: string;
}

// Define a type for a resource share
interface ResourceShare {
    shared_with_id: string;
    username: string;
    full_name?: string;
    permission: 'read' | 'write';
}

// Define props for the modal
interface BoardShareModalProps {
    boardId: string;
    currentUserId: string;
    isOpen: boolean;
    onClose: () => void;
    onUpdated: () => void; // Callback to refresh board data in parent
}

export function BoardShareModal({ boardId, currentUserId, isOpen, onClose, onUpdated }: BoardShareModalProps) {
    const { showToast } = useToast();
    const [resourcePermission, setResourcePermission] = useState<ResourcePermission | null>(null);
    const [shares, setShares] = useState<ResourceShare[]>([]);
    const [newShareUserId, setNewShareUserId] = useState('');
    const [newSharePermission, setNewSharePermission] = useState<'read' | 'write'>('read');
    const [allUsers, setAllUsers] = useState<{ id: string; username: string; full_name?: string }[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<{ id: string; username: string; full_name?: string }[]>([]);
    const [searchUserQuery, setSearchUserQuery] = useState('');
    const [showPermissionHelp, setShowPermissionHelp] = useState(false);

    // Fetch initial data
    useEffect(() => {
        if (isOpen) {
            loadResourcePermission();
            loadShares();
            loadAllUsers();
        }
    }, [isOpen]);

    // Filter users based on search query
    useEffect(() => {
        if (searchUserQuery) {
            setFilteredUsers(
                allUsers.filter(user =>
                    user.username.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
                    (user.full_name && user.full_name.toLowerCase().includes(searchUserQuery.toLowerCase()))
                )
            );
        } else {
            // Exclude already shared users from the list of all users
            const sharedUserIds = new Set(shares.map(s => s.shared_with_id));
            setFilteredUsers(allUsers.filter(user => !sharedUserIds.has(user.id) && user.id !== currentUserId));
        }
    }, [searchUserQuery, allUsers, shares, currentUserId]);


    const loadResourcePermission = async () => {
        try {
            // Need to directly fetch resource permission via a new API if projectsService.getBoard doesn't return it
            // For now, assume projectsService.getBoard provides it or we'll make a new API
            // For this implementation, I will call the new API endpoint directly.
            const token = getAuth()?.token;
            const res = await fetch(`/api/access/${boardId}/permissions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                throw new Error(`Error fetching resource permissions: ${res.statusText}`);
            }
            const data = await res.json();
            setResourcePermission(data);
        } catch (error) {
            console.error('Failed to load resource permission:', error);
            showToast({ type: 'error', message: 'Failed to load resource permissions', duration: 3000 });
        }
    };

    const loadShares = async () => {
        try {
            const token = getAuth()?.token;
            const res = await fetch(`/api/access/${boardId}/shares`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                throw new Error(`Error fetching shares: ${res.statusText}`);
            }
            const data = await res.json();
            setShares(data);
        } catch (error) {
            console.error('Failed to load shares:', error);
            showToast({ type: 'error', message: 'Failed to load shares', duration: 3000 });
        }
    };

    const loadAllUsers = async () => {
        try {
            const users = await projectsService.getProjectMembers(boardId); // This might be project-specific, need a more general user endpoint
            // For simplicity, let's assume we can get all users in the tenant via a new endpoint /api/users
            // Or use the existing /api/admin/users if the current user is admin
            const token = getAuth()?.token;
            const res = await fetch(`/api/admin/users`, { // Assuming /api/admin/users returns all users in tenant for admin
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                throw new Error(`Error fetching users: ${res.statusText}`);
            }
            const data = await res.json();
            setAllUsers(data);
        } catch (error) {
            console.error('Failed to load users:', error);
            showToast({ type: 'error', message: 'Failed to load users for sharing', duration: 3000 });
        }
    };

    const handleChangeVisibility = async (newVisibility: 'private' | 'shared' | 'tenant') => {
        try {
            const token = getAuth()?.token;
            const res = await fetch(`/api/access/${boardId}/visibility`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ visibility: newVisibility })
            });
            if (!res.ok) {
                throw new Error(`Error changing visibility: ${res.statusText}`);
            }
            showToast({ type: 'success', message: 'Visibility updated', duration: 2000 });
            loadResourcePermission();
            onUpdated(); // Notify parent to refresh board data
        } catch (error) {
            console.error('Failed to change visibility:', error);
            showToast({ type: 'error', message: 'Failed to update visibility', duration: 3000 });
        }
    };

    const handleAddShare = async () => {
        if (!newShareUserId) {
            showToast({ type: 'error', message: 'Please select a user to share with', duration: 3000 });
            return;
        }
        try {
            const token = getAuth()?.token;
            const res = await fetch(`/api/access/${boardId}/share`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ sharedWithId: newShareUserId, permission: newSharePermission })
            });
            if (!res.ok) {
                throw new Error(`Error adding share: ${res.statusText}`);
            }
            showToast({ type: 'success', message: 'User added to shares', duration: 2000 });
            setNewShareUserId('');
            setSearchUserQuery('');
            loadShares();
            onUpdated();
        } catch (error) {
            console.error('Failed to add share:', error);
            showToast({ type: 'error', message: 'Failed to add user to shares', duration: 3000 });
        }
    };

    const handleRemoveShare = async (sharedWithId: string) => {
        try {
            const token = getAuth()?.token;
            const res = await fetch(`/api/access/${boardId}/share/${sharedWithId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                throw new Error(`Error removing share: ${res.statusText}`);
            }
            showToast({ type: 'success', message: 'Share removed', duration: 2000 });
            loadShares();
            onUpdated();
        } catch (error) {
            console.error('Failed to remove share:', error);
            showToast({ type: 'error', message: 'Failed to remove share', duration: 3000 });
        }
    };

    if (!isOpen || !resourcePermission) return null;

    const isOwner = resourcePermission.owner_id === currentUserId;
    const canManageShares = isOwner; // Only owner can manage shares for now

    return (
        <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                className="glass-card rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-orange-500/30 animate-scale-in flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-orange-500/20 flex items-center justify-between flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold gradient-text">Share Board</h2>
                        <p className="text-sm text-orange-300/70 mt-1">Manage who can access this board</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-[#858585] hover:text-white transition-all duration-200 hover:bg-gradient-to-r hover:from-orange-600/20 hover:to-orange-600/20 hover:shadow-lg hover:shadow-orange-500/10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Current Visibility */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-white flex items-center gap-2">
                            Visibility
                            <HelpCircle
                                className="w-4 h-4 text-[#858585] cursor-pointer"
                                onMouseEnter={() => setShowPermissionHelp(true)}
                                onMouseLeave={() => setShowPermissionHelp(false)}
                            />
                        </label>
                        {showPermissionHelp && (
                            <div className="bg-[#333333] text-sm text-[#a0a0a0] p-3 rounded-lg border border-[#444444]">
                                <p><strong>Private:</strong> Only the owner can access.</p>
                                <p><strong>Shared:</strong> Owner and explicitly shared users can access.</p>
                                <p><strong>Tenant:</strong> All users within the tenant can access.</p>
                            </div>
                        )}
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => handleChangeVisibility('private')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border ${
                                    resourcePermission.visibility === 'private'
                                        ? 'bg-orange-600 border-orange-600 text-white'
                                        : 'bg-[#252526] border-[#333333] text-[#a0a0a0] hover:bg-[#333333]'
                                }`}
                                disabled={!canManageShares}
                            >
                                <Lock className="w-4 h-4" /> Private
                            </button>
                            <button
                                onClick={() => handleChangeVisibility('shared')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border ${
                                    resourcePermission.visibility === 'shared'
                                        ? 'bg-orange-600 border-orange-600 text-white'
                                        : 'bg-[#252526] border-[#333333] text-[#a0a0a0] hover:bg-[#333333]'
                                }`}
                                disabled={!canManageShares}
                            >
                                <Users className="w-4 h-4" /> Shared
                            </button>
                            <button
                                onClick={() => handleChangeVisibility('tenant')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border ${
                                    resourcePermission.visibility === 'tenant'
                                        ? 'bg-orange-600 border-orange-600 text-white'
                                        : 'bg-[#252526] border-[#333333] text-[#a0a0a0] hover:bg-[#333333]'
                                }`}
                                disabled={!canManageShares}
                            >
                                <Globe className="w-4 h-4" /> Tenant
                            </button>
                        </div>
                    </div>

                    {/* Owner Information */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-white">Owner</label>
                        <div className="flex items-center gap-3 p-3 bg-[#252526] border border-[#333333] rounded-lg">
                            <Users className="w-5 h-5 text-orange-400" />
                            <span className="text-white">{allUsers.find(u => u.id === resourcePermission.owner_id)?.full_name || resourcePermission.owner_id} (You)</span>
                        </div>
                    </div>

                    {/* Add Users to Share */}
                    {canManageShares && resourcePermission.visibility === 'shared' && (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-white">Add people</label>
                            <div className="flex flex-col gap-2">
                                <input
                                    type="text"
                                    placeholder="Search by username or full name"
                                    className="w-full bg-[#252526] border border-[#333333] rounded-lg px-3 py-2 text-white placeholder-[#6e6e6e] focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                                    value={searchUserQuery}
                                    onChange={(e) => setSearchUserQuery(e.target.value)}
                                />
                                {searchUserQuery && filteredUsers.length > 0 && (
                                    <div className="bg-[#252526] border border-[#333333] rounded-lg max-h-40 overflow-y-auto">
                                        {filteredUsers.map(user => (
                                            <button
                                                key={user.id}
                                                onClick={() => {
                                                    setNewShareUserId(user.id);
                                                    setSearchUserQuery(user.full_name || user.username);
                                                }}
                                                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#333333]"
                                            >
                                                {user.full_name} ({user.username})
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    <select
                                        value={newSharePermission}
                                        onChange={(e) => setNewSharePermission(e.target.value as 'read' | 'write')}
                                        className="bg-[#252526] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    >
                                        <option value="read">Can Read</option>
                                        <option value="write">Can Write</option>
                                    </select>
                                    <button
                                        onClick={handleAddShare}
                                        className="btn-primary flex items-center gap-2 px-4 py-2"
                                        disabled={!newShareUserId || newShareUserId === currentUserId}
                                    >
                                        <UserPlus className="w-4 h-4" /> Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Currently Shared With */}
                    {resourcePermission.visibility === 'shared' && shares.length > 0 && (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-white">People with access</label>
                            <div className="space-y-2">
                                {shares.map(share => (
                                    <div key={share.shared_with_id} className="flex items-center justify-between p-3 bg-[#252526] border border-[#333333] rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <Users className="w-5 h-5 text-[#858585]" />
                                            <span className="text-white">{share.full_name || share.username}</span>
                                            <span className="text-sm text-[#858585]">({share.permission})</span>
                                        </div>
                                        {canManageShares && (
                                            <button
                                                onClick={() => handleRemoveShare(share.shared_with_id)}
                                                className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                                title="Remove share"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
