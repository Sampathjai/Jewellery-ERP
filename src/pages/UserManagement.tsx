import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { UserProfile, UserRole, PermissionCode } from '@/types';
import { formatDateTime, ROLE_PERMISSIONS } from '@/lib/utils';
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
  Search,
  Filter,
  Phone,
  Edit,
  Shield,
  Sparkles,
  Users,
  Check,
} from 'lucide-react';

export const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');

  // Modals state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserProfile | null>(null);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<UserProfile | null>(null);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<UserProfile | null>(null);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<UserProfile | null>(null);

  // Add User Form State
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newConfirmPassword, setNewConfirmPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('billing_staff');
  const [newBranch, setNewBranch] = useState('Trichy - Sandhukadai');
  const [newIsActive, setNewIsActive] = useState(true);

  // Edit User Form State
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('billing_staff');
  const [editBranch, setEditBranch] = useState('Trichy - Sandhukadai');
  const [editIsActive, setEditIsActive] = useState(true);

  // Change Password Form State
  const [changePasswordVal, setChangePasswordVal] = useState('');
  const [confirmPasswordVal, setConfirmPasswordVal] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);

  // Submission & error handling
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

  // Derived Summary Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.is_active !== false).length;
    const inactive = total - active;
    const admins = users.filter((u) => u.role === 'admin' || u.role === 'super_admin').length;
    const counsellors = users.filter((u) => u.role === 'counsellor').length;
    const trainers = users.filter((u) => u.role === 'trainer').length;
    const accountants = users.filter((u) => u.role === 'accountant').length;
    const receptionists = users.filter((u) => u.role === 'receptionist').length;
    const billingStaff = users.filter((u) => u.role === 'billing_staff').length;

    return { total, active, inactive, admins, counsellors, trainers, accountants, receptionists, billingStaff };
  }, [users]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.user_id && u.user_id.toLowerCase().includes(q)) ||
        (u.phone && u.phone.includes(q));

      const matchesRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;
      const matchesStatus =
        selectedStatusFilter === 'all' ||
        (selectedStatusFilter === 'active' && u.is_active !== false) ||
        (selectedStatusFilter === 'inactive' && u.is_active === false);

      const matchesBranch = selectedBranchFilter === 'all' || u.branch === selectedBranchFilter;

      return matchesSearch && matchesRole && matchesStatus && matchesBranch;
    });
  }, [users, searchQuery, selectedRoleFilter, selectedStatusFilter, selectedBranchFilter]);

  // Handle Create User
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

    if (newPassword !== newConfirmPassword) {
      setModalError('Passwords do not match.');
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
        phone: newPhone,
      });

      showToast(`New staff account for ${created.full_name} (${created.email}) created successfully.`);

      // Reset Form
      setNewFullName('');
      setNewEmail('');
      setNewUserId('');
      setNewPhone('');
      setNewPassword('');
      setNewConfirmPassword('');
      setNewRole('billing_staff');
      setNewBranch('Trichy - Sandhukadai');
      setNewIsActive(true);
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

  // Open Edit User Modal
  const openEditModal = (u: UserProfile) => {
    setSelectedUserForEdit(u);
    setEditFullName(u.full_name);
    setEditEmail(u.email);
    setEditPhone(u.phone || '');
    setEditRole(u.role);
    setEditBranch(u.branch || 'Trichy - Sandhukadai');
    setEditIsActive(u.is_active !== false);
    setModalError(null);
  };

  // Handle Edit User Profile
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;
    setModalError(null);

    try {
      setIsSubmitting(true);
      await dataService.updateUserProfile(selectedUserForEdit.id, {
        full_name: editFullName,
        email: editEmail.trim().toLowerCase(),
        phone: editPhone,
        role: editRole,
        branch: editBranch,
        is_active: editIsActive,
      });

      showToast(`User profile for ${editFullName} updated successfully.`);
      setSelectedUserForEdit(null);
      await loadUsers();
    } catch (err: any) {
      console.error('Update user error:', err);
      setModalError(err.message || 'Failed to update user profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate Random Password Helper
  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$';
    let pass = 'Jewel@';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (selectedUserForPassword) {
      setChangePasswordVal(pass);
      setConfirmPasswordVal(pass);
    } else {
      setNewPassword(pass);
      setNewConfirmPassword(pass);
    }
  };

  // Handle Direct Password Change
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

  // Handle Enable/Disable User Toggle
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

  // Handle Delete User
  const handleDeleteUserLogin = async (userToDelete: UserProfile) => {
    if (
      (userToDelete.role === 'admin' || userToDelete.role === 'super_admin') &&
      userToDelete.email.includes('owner')
    ) {
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

  const handleForceLogout = (userName: string) => {
    showToast(`Active session for ${userName} has been revoked.`);
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="User Administration & Direct Password Control"
        subtitle="Manage shop employees, goldsmith accounts, login credentials, and direct password access"
        breadcrumb={['Home', 'Settings', 'User Administration']}
        actionBtn={
          <button
            onClick={() => {
              setIsAddUserOpen(true);
              setModalError(null);
            }}
            className="flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600 transition-all active:scale-95"
          >
            <UserPlus className="h-4 w-4" />
            Add New User Account
          </button>
        }
      />

      {/* Notifications & Error Alerts */}
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

      {/* STATS SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</p>
          <p className="text-xl font-bold text-charcoal-950 dark:text-slate-100">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-950/40 dark:bg-emerald-950/20 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Active</p>
          <p className="text-xl font-bold text-emerald-900 dark:text-emerald-200">{stats.active}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 dark:border-red-950/40 dark:bg-red-950/20 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">Disabled</p>
          <p className="text-xl font-bold text-red-900 dark:text-red-200">{stats.inactive}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-950/40 dark:bg-amber-950/20 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Admins</p>
          <p className="text-xl font-bold text-amber-900 dark:text-amber-200">{stats.admins}</p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-950/40 dark:bg-sky-950/20 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">Billing</p>
          <p className="text-xl font-bold text-sky-900 dark:text-sky-200">{stats.billingStaff}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-950/40 dark:bg-indigo-950/20 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Counsellors</p>
          <p className="text-xl font-bold text-indigo-900 dark:text-indigo-200">{stats.counsellors}</p>
        </div>
        <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 dark:border-purple-950/40 dark:bg-purple-950/20 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Trainers</p>
          <p className="text-xl font-bold text-purple-900 dark:text-purple-200">{stats.trainers}</p>
        </div>
        <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3 dark:border-teal-950/40 dark:bg-teal-950/20 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">Accountants</p>
          <p className="text-xl font-bold text-teal-900 dark:text-teal-200">{stats.accountants}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-950/40 dark:bg-rose-950/20 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">Reception</p>
          <p className="text-xl font-bold text-rose-900 dark:text-rose-200">{stats.receptionists}</p>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Name, Email, Username, Phone..."
            className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100"
          >
            <option value="all">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Owner / Admin</option>
            <option value="manager">Shop Manager</option>
            <option value="counsellor">Counsellor</option>
            <option value="trainer">Trainer</option>
            <option value="accountant">Accountant</option>
            <option value="receptionist">Receptionist</option>
            <option value="billing_staff">Billing Staff</option>
            <option value="inventory_staff">Inventory Staff</option>
            <option value="viewer">Viewer</option>
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Accounts</option>
            <option value="inactive">Disabled Accounts</option>
          </select>

          <select
            value={selectedBranchFilter}
            onChange={(e) => setSelectedBranchFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100"
          >
            <option value="all">All Branches</option>
            <option value="Trichy - Sandhukadai">Trichy - Sandhukadai</option>
            <option value="Coimbatore - Cross Cut">Coimbatore - Cross Cut</option>
            <option value="Salem - Bazaar">Salem - Bazaar</option>
            <option value="Madurai - Main">Madurai - Main</option>
          </select>

          <button
            onClick={loadUsers}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-300 dark:hover:bg-charcoal-700"
            title="Refresh User List"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-gold-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* USER DATA TABLE */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-gold-600" />
            User Accounts List ({filteredUsers.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
            <RefreshCw className="h-8 w-8 animate-spin text-gold-600" />
            <p className="text-xs font-medium">Loading user profiles from database...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
            <UserIcon className="h-10 w-10 text-slate-300 dark:text-charcoal-700" />
            <p className="text-sm font-bold text-charcoal-900 dark:text-slate-100">No user accounts found</p>
            <p className="text-xs max-w-sm">No user matches your current search or filter criteria.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800">
                  <tr>
                    <th className="p-3">User Name</th>
                    <th className="p-3">User ID / Email</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Branch</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Created</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-charcoal-800/40">
                      <td className="p-3 font-bold text-charcoal-900 dark:text-slate-100 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-500/20 text-gold-700 font-bold text-xs uppercase">
                          {u.full_name.charAt(0)}
                        </div>
                        <div>
                          <p>{u.full_name}</p>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {u.user_id || u.id}</span>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{u.email}</td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{u.phone || '-'}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-800 dark:bg-charcoal-800 dark:text-slate-200 uppercase">
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-600 dark:text-slate-400">
                        {u.branch || 'Trichy - Sandhukadai'}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleToggleStatus(u.id)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase transition-all ${
                            u.is_active !== false
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                          }`}
                        >
                          {u.is_active !== false ? <CheckCircle className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                          {u.is_active !== false ? 'ACTIVE' : 'DISABLED'}
                        </button>
                      </td>
                      <td className="p-3 text-[11px] text-slate-400 font-mono">
                        {formatDateTime(u.created_at)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(u)}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-300"
                            title="Edit User Profile Details"
                          >
                            <Edit className="h-3.5 w-3.5 inline mr-1 text-slate-500" /> Edit
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUserForPassword(u);
                              setChangePasswordVal('');
                              setConfirmPasswordVal('');
                              setModalError(null);
                            }}
                            className="rounded-lg border border-gold-400 bg-gold-50/50 px-2 py-1 text-[11px] font-bold text-amber-950 hover:bg-gold-100 dark:border-gold-800 dark:bg-gold-950/40 dark:text-gold-300"
                            title="Direct Password Control (Set/Reset)"
                          >
                            <KeyRound className="h-3.5 w-3.5 inline mr-1 text-gold-600" /> Pass
                          </button>
                          <button
                            onClick={() => setSelectedUserForPermissions(u)}
                            className="rounded-lg border border-indigo-200 bg-indigo-50/50 px-2 py-1 text-[11px] font-semibold text-indigo-800 hover:bg-indigo-100 dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-300"
                            title="View Granted Role Permissions"
                          >
                            <Shield className="h-3.5 w-3.5 inline mr-1 text-indigo-600" /> Perms
                          </button>
                          <button
                            onClick={() => setSelectedUserForDelete(u)}
                            className="rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-600 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                            title="Delete User Login Access"
                          >
                            <Trash2 className="h-3.5 w-3.5 inline mr-1 text-red-600" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile & Tablet Card View */}
            <div className="block lg:hidden space-y-3">
              {filteredUsers.map((u) => (
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
                        u.is_active !== false
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                      }`}
                    >
                      {u.is_active !== false ? 'ACTIVE' : 'DISABLED'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60 dark:border-charcoal-700/60">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Role</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 uppercase mt-0.5">
                        {u.role.replace('_', ' ')}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Branch</span>
                      <p className="font-medium text-slate-700 dark:text-slate-300 truncate mt-0.5">
                        {u.branch || 'Trichy - Sandhukadai'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-charcoal-700/60">
                    <button
                      onClick={() => openEditModal(u)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white py-1.5 text-center text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-300"
                    >
                      <Edit className="h-3.5 w-3.5 inline mr-1" /> Edit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUserForPassword(u);
                        setChangePasswordVal('');
                        setConfirmPasswordVal('');
                        setModalError(null);
                      }}
                      className="flex-1 rounded-lg border border-gold-400 bg-gold-50/50 py-1.5 text-center text-xs font-bold text-amber-950 hover:bg-gold-100 dark:border-gold-800 dark:bg-gold-950/40 dark:text-gold-300"
                    >
                      <KeyRound className="h-3.5 w-3.5 inline mr-1 text-gold-600" /> Password
                    </button>
                    <button
                      onClick={() => setSelectedUserForDelete(u)}
                      className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5 inline mr-1" /> Delete
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
          <div className="w-full max-w-md rounded-2xl border border-gold-400/40 bg-white p-6 shadow-2xl dark:border-charcoal-700 dark:bg-charcoal-900 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-charcoal-800">
              <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-gold-600" />
                Add New ERP User Account
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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Full Name *</label>
                <div className="relative mt-1">
                  <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    disabled={isSubmitting}
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="e.g. Sumathy Ramesh"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Username / User ID</label>
                  <input
                    type="text"
                    disabled={isSubmitting}
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    placeholder="ramesh_counter"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 disabled:opacity-50 font-mono"
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
                    placeholder="sumathy@shankarjewellery.com"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 disabled:opacity-50 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Phone Number</label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    disabled={isSubmitting}
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Initial Password (Admin Set) *
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] font-bold text-gold-600 hover:text-gold-700 dark:text-gold-400 flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" /> Generate Password
                  </button>
                </div>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    required
                    disabled={isSubmitting}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6-8 characters"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-10 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 font-mono disabled:opacity-50"
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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Confirm Password *</label>
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  required
                  disabled={isSubmitting}
                  value={newConfirmPassword}
                  onChange={(e) => setNewConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 font-mono disabled:opacity-50"
                />
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
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Owner / Admin</option>
                    <option value="manager">Shop Manager</option>
                    <option value="counsellor">Counsellor</option>
                    <option value="trainer">Trainer</option>
                    <option value="accountant">Accountant</option>
                    <option value="receptionist">Receptionist</option>
                    <option value="billing_staff">Billing Staff</option>
                    <option value="inventory_staff">Inventory Staff</option>
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

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-charcoal-800">
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
                      <span>Creating User...</span>
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

      {/* EDIT USER PROFILE MODAL */}
      {selectedUserForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-300 bg-white p-6 shadow-2xl dark:border-charcoal-700 dark:bg-charcoal-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-charcoal-800">
              <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100 flex items-center gap-2">
                <Edit className="h-5 w-5 text-gold-600" />
                Edit User Profile Details
              </h3>
              <button
                onClick={() => setSelectedUserForEdit(null)}
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

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Full Name</label>
                <input
                  type="text"
                  required
                  disabled={isSubmitting}
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Email Address</label>
                <input
                  type="email"
                  required
                  disabled={isSubmitting}
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Phone Number</label>
                <input
                  type="text"
                  disabled={isSubmitting}
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Access Role</label>
                  <select
                    disabled={isSubmitting}
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100"
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Owner / Admin</option>
                    <option value="manager">Shop Manager</option>
                    <option value="counsellor">Counsellor</option>
                    <option value="trainer">Trainer</option>
                    <option value="accountant">Accountant</option>
                    <option value="receptionist">Receptionist</option>
                    <option value="billing_staff">Billing Staff</option>
                    <option value="inventory_staff">Inventory Staff</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Branch Location</label>
                  <input
                    type="text"
                    disabled={isSubmitting}
                    value={editBranch}
                    onChange={(e) => setEditBranch(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-charcoal-800">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setSelectedUserForEdit(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-charcoal-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-gold-500 px-5 py-2 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
                >
                  {isSubmitting ? 'Saving Profile...' : 'Save Profile Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIRECT PASSWORD CONTROL MODAL */}
      {selectedUserForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-gold-400/40 bg-white p-6 shadow-2xl dark:border-charcoal-700 dark:bg-charcoal-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-charcoal-800">
              <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100 flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-gold-600" />
                Direct Password Control (Set/Reset)
              </h3>
              <button
                onClick={() => setSelectedUserForPassword(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-charcoal-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 text-xs text-amber-900 dark:bg-gold-950/30 dark:border-gold-800/40 dark:text-gold-300 flex items-center justify-between">
              <div>
                <p className="font-bold">{selectedUserForPassword.full_name}</p>
                <p className="text-[11px] font-mono">{selectedUserForPassword.email}</p>
              </div>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="text-[11px] font-bold text-gold-700 dark:text-gold-400 bg-gold-200/50 dark:bg-gold-900/50 px-2.5 py-1 rounded-lg hover:bg-gold-200"
              >
                <Sparkles className="h-3 w-3 inline mr-1" /> Generate Pass
              </button>
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
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-10 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 font-mono disabled:opacity-50"
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
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-100 font-mono disabled:opacity-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-charcoal-800">
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
                      <span>Updating Password...</span>
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

      {/* VIEW ROLE PERMISSIONS MODAL */}
      {selectedUserForPermissions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-indigo-400/40 bg-white p-6 shadow-2xl dark:border-charcoal-700 dark:bg-charcoal-900 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-charcoal-800">
              <h3 className="font-serif text-lg font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-600" />
                Role Permissions — {selectedUserForPermissions.full_name}
              </h3>
              <button
                onClick={() => setSelectedUserForPermissions(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-charcoal-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl bg-indigo-50 p-3 border border-indigo-200 text-xs text-indigo-950 dark:bg-indigo-950/40 dark:border-indigo-900/40 dark:text-indigo-300 flex items-center justify-between">
              <div>
                <p className="font-bold">Assigned Role: <span className="uppercase">{selectedUserForPermissions.role.replace('_', ' ')}</span></p>
                <p className="text-[11px] font-mono">{selectedUserForPermissions.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Granted Permission Codes:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(ROLE_PERMISSIONS[selectedUserForPermissions.role] || []).map((code) => (
                  <div key={code} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] font-mono font-semibold text-slate-800 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-200">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>{code}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-charcoal-800">
              <button
                onClick={() => setSelectedUserForPermissions(null)}
                className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-bold text-white hover:bg-slate-900"
              >
                Close
              </button>
            </div>
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
                Delete User Login Access?
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
                <strong>Data Safety Guarantee:</strong> Historical invoices, retail sales, wholesale bills, and stock transactions created by this user will remain completely preserved in database history.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setSelectedUserForDelete(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-charcoal-700 dark:text-slate-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDeleteUserLogin(selectedUserForDelete)}
                className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Login Access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
