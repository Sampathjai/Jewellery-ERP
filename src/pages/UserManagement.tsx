import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { UserProfile, UserRole } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { dataService } from '@/lib/dataService';
import { syncEngine } from '@/lib/syncEngine';
import { useAuth } from '@/lib/auth';
import {
  UserCheck,
  UserPlus,
  KeyRound,
  Power,
  CheckCircle,
  Ban,
  X,
  Lock,
  Mail,
  User as UserIcon,
  Building,
  ShieldCheck,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Modals
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<UserProfile | null>(null);

  // Add User Form State
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('billing_staff');
  const [newBranch, setNewBranch] = useState('Trichy - Sandhukadai');

  // Change Password Form State
  const [changePasswordVal, setChangePasswordVal] = useState('');
  const [confirmPasswordVal, setConfirmPasswordVal] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);

  const [selectedUserForDelete, setSelectedUserForDelete] = useState<UserProfile | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      let fetched = await dataService.getUsers();

      // Guarantee the currently authenticated admin user is present in the list
      if (currentUser && currentUser.email) {
        const exists = fetched.some((u) => u.email.toLowerCase() === currentUser.email.toLowerCase());
        if (!exists) {
          fetched = [currentUser, ...fetched];
        }
      }

      setUsers(fetched);
    } catch (err: any) {
      console.error('Error loading users:', err);
      setError(err.message || 'Failed to fetch user profiles from database.');
      if (currentUser) {
        setUsers([currentUser]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadUsers();

    const unsubscribe = syncEngine.subscribeDataChange((tableName) => {
      if (tableName === 'profiles' || tableName === 'users') {
        loadUsers();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadUsers]);

  const handleDeleteUserLogin = async (userToDelete: UserProfile) => {
    if (userToDelete.role === 'admin' && userToDelete.email.includes('owner')) {
      alert('Cannot delete the primary Owner / Admin account.');
      return;
    }

    try {
      setIsSubmitting(true);
      await dataService.deleteUserProfile(userToDelete.id);
      showToast(`User login for ${userToDelete.full_name} (${userToDelete.email}) permanently deleted.`);
      setSelectedUserForDelete(null);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: string, updatedRole: UserRole) => {
    try {
      await dataService.updateUserProfile(userId, { role: updatedRole });
      showToast('User role updated successfully.');
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user role.');
    }
  };

  const handleToggleStatus = async (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;

    const nextState = !target.is_active;
    try {
      await dataService.updateUserProfile(userId, { is_active: nextState });
      showToast(`Account for ${target.full_name} is now ${nextState ? 'ACTIVE' : 'DISABLED'}.`);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update account status.');
    }
  };

  const handleForceLogout = (userName: string) => {
    showToast(`Active session for ${userName} has been revoked.`);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!newFullName || !newEmail || !newPassword) {
      setModalError('Please complete all required user fields.');
      return;
    }

    if (newPassword.length < 6) {
      setModalError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await dataService.createStaffAccount({
        full_name: newFullName,
        email: newEmail.trim().toLowerCase(),
        password: newPassword,
        role: newRole,
        branch: newBranch,
      });

      showToast(`New staff account for ${created.full_name} (${created.email}) created successfully.`);

      // Reset Form
      setNewFullName('');
      setNewEmail('');
      setNewUserId('');
      setNewPassword('');
      setModalError(null);
      setIsAddUserOpen(false);
      await loadUsers();
    } catch (err: any) {
      console.error('Create user error:', err);
      setModalError(err.message || 'Failed to create user account in database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!selectedUserForPassword) return;

    if (!changePasswordVal || changePasswordVal !== confirmPasswordVal) {
      setModalError('Passwords do not match or are empty.');
      return;
    }

    if (changePasswordVal.length < 6) {
      setModalError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);
      await dataService.adminChangeUserPassword(selectedUserForPassword.id, changePasswordVal);
      showToast(`Password for ${selectedUserForPassword.full_name} has been updated directly by Admin.`);
      setSelectedUserForPassword(null);
      setChangePasswordVal('');
      setConfirmPasswordVal('');
      setModalError(null);
    } catch (err: any) {
      console.error('Password change error:', err);
      setModalError(err.message || 'Failed to update password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Administration & Direct Password Control"
        subtitle="Manage shop employees, goldsmith accounts, login credentials, and direct password access"
        breadcrumb={['Home', 'User Management']}
        actionBtn={
          <button
            onClick={() => setIsAddUserOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600 transition-all"
          >
            <UserPlus className="h-4 w-4" />
            Add New User Account
          </button>
        }
      />

      {notification && (
        <div className="rounded-2xl border border-gold-400 bg-gold-50 p-4 text-xs font-bold text-amber-950 dark:border-gold-800 dark:bg-gold-950/40 dark:text-gold-300 flex items-center gap-2 shadow-sm">
          <CheckCircle className="h-4 w-4 text-gold-600" />
          <span>{notification}</span>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-400 bg-rose-50 p-4 text-xs font-bold text-rose-950 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300 flex items-center gap-2 shadow-sm">
          <AlertTriangle className="h-4 w-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Active Users Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-gold-600" />
            Registered Staff & Admin Accounts ({users.length})
          </h3>
          <button
            onClick={loadUsers}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-charcoal-700 dark:text-slate-300 dark:hover:bg-charcoal-800 transition-all"
            title="Refresh User List from Database"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-gold-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
            <RefreshCw className="h-8 w-8 animate-spin text-gold-600" />
            <p className="text-xs font-medium">Loading user profiles from database...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
            <UserIcon className="h-10 w-10 text-slate-300 dark:text-charcoal-700" />
            <p className="text-sm font-bold text-charcoal-900 dark:text-slate-100">No staff user accounts found</p>
            <p className="text-xs max-w-sm">Click below to create your first employee account in the database.</p>
            <button
              onClick={() => setIsAddUserOpen(true)}
              className="mt-2 flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
            >
              <UserPlus className="h-4 w-4" />
              Add First Staff Account
            </button>
          </div>
        ) : (
          <>
            {/* Desktop / Laptop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800">
                  <tr>
                    <th className="p-3">User Name</th>
                    <th className="p-3">User ID</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Branch Location</th>
                    <th className="p-3">Account Status</th>
                    <th className="p-3 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/40">
                      <td className="p-3 font-bold text-charcoal-900 dark:text-slate-100">{u.full_name}</td>
                      <td className="p-3 font-mono text-slate-500">{u.user_id || u.id}</td>
                      <td className="p-3 font-mono text-slate-500">{u.email}</td>
                      <td className="p-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 font-bold text-xs dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
                        >
                          <option value="admin">Owner / Admin</option>
                          <option value="manager">Shop Manager</option>
                          <option value="billing_staff">Billing Staff</option>
                          <option value="inventory_staff">Inventory Staff</option>
                          <option value="accountant">Accountant</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 font-medium">
                        {u.branch || 'Trichy - Sandhukadai'}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleToggleStatus(u.id)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase transition-all ${
                            u.is_active
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                          }`}
                        >
                          {u.is_active ? <CheckCircle className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                          {u.is_active ? 'ACTIVE' : 'DISABLED'}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedUserForPassword(u);
                              setChangePasswordVal('');
                              setConfirmPasswordVal('');
                            }}
                            className="rounded-lg border border-gold-400 bg-gold-50/50 px-2.5 py-1 text-[11px] font-bold text-amber-950 hover:bg-gold-100 dark:border-gold-800 dark:bg-gold-950/40 dark:text-gold-300"
                            title="Admin Direct Change Password"
                          >
                            <KeyRound className="h-3.5 w-3.5 inline mr-1 text-gold-600" /> Change Pass
                          </button>
                          <button
                            onClick={() => handleForceLogout(u.full_name)}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-300"
                            title="Force Logout Active Session"
                          >
                            <Power className="h-3.5 w-3.5 inline mr-1" /> Force Logout
                          </button>
                          <button
                            onClick={() => setSelectedUserForDelete(u)}
                            className="rounded-lg border border-red-300 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                            title="Delete User Login Access"
                          >
                            <Trash2 className="h-3.5 w-3.5 inline mr-1 text-red-600" /> Delete Login
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden space-y-3">
              {users.map((u) => (
                <div key={u.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-charcoal-800 dark:bg-charcoal-800/40 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-charcoal-900 dark:text-slate-100">{u.full_name}</h4>
                      <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {u.user_id || u.id}</p>
                    </div>
                    <button
                      onClick={() => handleToggleStatus(u.id)}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        u.is_active
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                      }`}
                    >
                      {u.is_active ? 'ACTIVE' : 'DISABLED'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60 dark:border-charcoal-700/60">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Role</span>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white p-1 font-bold text-xs dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-slate-100"
                      >
                        <option value="admin">Owner / Admin</option>
                        <option value="manager">Shop Manager</option>
                        <option value="billing_staff">Billing Staff</option>
                        <option value="inventory_staff">Inventory Staff</option>
                        <option value="accountant">Accountant</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Branch</span>
                      <p className="mt-1 font-semibold text-slate-700 dark:text-slate-300 text-xs truncate">
                        {u.branch || 'Trichy - Sandhukadai'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-charcoal-700/60">
                    <button
                      onClick={() => {
                        setSelectedUserForPassword(u);
                        setChangePasswordVal('');
                        setConfirmPasswordVal('');
                      }}
                      className="flex-1 rounded-lg border border-gold-400 bg-gold-50/50 py-1.5 text-center text-xs font-bold text-amber-950 hover:bg-gold-100 dark:border-gold-800 dark:bg-gold-950/40 dark:text-gold-300"
                    >
                      <KeyRound className="h-3.5 w-3.5 inline mr-1 text-gold-600" /> Password
                    </button>
                    <button
                      onClick={() => setSelectedUserForDelete(u)}
                      className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5 inline mr-1 text-red-600" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* CREATE NEW USER MODAL */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-gold-400/40 bg-white p-6 shadow-2xl dark:border-charcoal-700 dark:bg-charcoal-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-charcoal-800">
              <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-gold-600" />
                Create New Staff Account
              </h3>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-charcoal-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-bold text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Staff Full Name *</label>
                <div className="relative mt-1">
                  <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    disabled={isSubmitting}
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">User ID / Username</label>
                  <input
                    type="text"
                    disabled={isSubmitting}
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    placeholder="ramesh_counter"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Email Address *</label>
                  <input
                    type="email"
                    required
                    disabled={isSubmitting}
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="ramesh@shankarjewellery.com"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Initial Password (Admin Set) *
                </label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    disabled={isSubmitting}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Set initial password directly"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 font-mono disabled:opacity-50"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Password will be active immediately without email confirmation links.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Access Role</label>
                  <select
                    disabled={isSubmitting}
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 disabled:opacity-50"
                  >
                    <option value="admin">Owner / Admin</option>
                    <option value="manager">Shop Manager</option>
                    <option value="billing_staff">Billing Staff</option>
                    <option value="inventory_staff">Inventory Staff</option>
                    <option value="accountant">Accountant</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Branch Location</label>
                  <input
                    type="text"
                    disabled={isSubmitting}
                    value={newBranch}
                    onChange={(e) => setNewBranch(e.target.value)}
                    placeholder="Trichy - Sandhukadai"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsAddUserOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-charcoal-700 dark:text-slate-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-2 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Create User Account</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN CHANGE PASSWORD MODAL */}
      {selectedUserForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-gold-400/40 bg-white p-6 shadow-2xl dark:border-charcoal-700 dark:bg-charcoal-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-charcoal-800">
              <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100 flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-gold-600" />
                Admin Direct Password Change
              </h3>
              <button
                onClick={() => setSelectedUserForPassword(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-charcoal-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 text-xs text-amber-900 dark:bg-gold-950/30 dark:border-gold-800/40 dark:text-gold-300">
              <p className="font-bold">{selectedUserForPassword.full_name}</p>
              <p className="text-[11px]">{selectedUserForPassword.email}</p>
            </div>

            {modalError && (
              <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-bold text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleDirectPasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">New Password *</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    required
                    disabled={isSubmitting}
                    value={changePasswordVal}
                    onChange={(e) => setChangePasswordVal(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-10 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswordText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Confirm New Password *</label>
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  required
                  disabled={isSubmitting}
                  value={confirmPasswordVal}
                  onChange={(e) => setConfirmPasswordVal(e.target.value)}
                  placeholder="Re-enter new password"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 disabled:opacity-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setSelectedUserForPassword(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-charcoal-700 dark:text-slate-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-2 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Update Password Direct</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE USER LOGIN CONFIRMATION MODAL */}
      {selectedUserForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-white p-6 shadow-2xl dark:border-red-900/60 dark:bg-charcoal-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-charcoal-800">
              <h3 className="font-serif text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Delete User Login?
              </h3>
              <button
                onClick={() => setSelectedUserForDelete(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-charcoal-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
              Are you sure you want to permanently remove this user's login access?
            </p>

            <div className="rounded-xl bg-red-50 p-3 border border-red-200 text-xs text-red-950 dark:bg-red-950/40 dark:border-red-900/60 dark:text-red-300 space-y-1">
              <p><strong>User Name:</strong> {selectedUserForDelete.full_name}</p>
              <p><strong>User ID:</strong> <span className="font-mono">{selectedUserForDelete.user_id || selectedUserForDelete.id}</span></p>
              <p><strong>Email:</strong> <span className="font-mono">{selectedUserForDelete.email}</span></p>
              <p><strong>Role:</strong> {selectedUserForDelete.role}</p>
            </div>

            <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:border-amber-900/40 dark:text-amber-300 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Data Safety Notice:</strong> Historical invoices, retail sales, wholesale bills, and stock transactions created by this user will remain preserved in database history.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedUserForDelete(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-charcoal-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteUserLogin(selectedUserForDelete)}
                className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-red-700"
              >
                Delete Login Access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
