const USER_STORAGE_KEY = 'sigma-admin-users';
const SUBJECTS_STORAGE_KEY = 'sigma-admin-subjects';
const SECTIONS_STORAGE_KEY = 'sigma-admin-sections';
const MANAGED_USERS_RESET_KEY = 'sigma-managed-users-reset-v1';
const LOGIN_SECURITY_KEY = 'sigma-login-security-config';

window.sectionSearchState = window.sectionSearchState || {
    name: '',
    room: '',
    grade: ''
};

// MASTER RESET SCRIPT: Clear all created accounts and reset sequence counters
(function masterResetUsers() {
    const RESET_FLAG = 'sigma-admin-master-reset-v5';
    if (localStorage.getItem(RESET_FLAG) === 'true') return;

    try {
        // Clear managed users
        localStorage.removeItem('sigma-admin-users');

        // Clear all ID sequences
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('sigma_id_seq_')) {
                localStorage.removeItem(key);
            }
        });

        localStorage.setItem(RESET_FLAG, 'true');
        console.log('Institutional Reset V5: All managed users cleared and sequences reset.');
    } catch (e) {
        console.error('Reset failed:', e);
    }
})();

// SEED MASTER ADMIN: Ensure Stanley Vargas Garcia exists
(function seedMasterAdmin() {
    const USER_STORAGE_KEY = 'sigma-admin-users';
    const masterAdmin = {
        id: "0000000",
        uid: "0000000",
        firstName: "Stanley",
        middleName: "Vargas",
        lastName: "Garcia",
        email: "stanley@gmail.com",
        password: "garcia0000000",
        role: "Master Admin",
        type: "Master Admin",
        status: "Active",
        createdVia: "system-seed"
    };

    try {
        const users = JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || '[]');
        const exists = users.some(u => String(u.uid || u.id) === masterAdmin.id);
        if (!exists) {
            users.push(masterAdmin);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
            console.log('Master Admin "Stanley" seeded successfully.');
        }
    } catch (e) {
        console.error('Failed to seed Master Admin:', e);
    }
})();

window.passMasterAdmin = function (targetUserId) {
    const authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
    const currentUserId = String(authUser.uid || authUser.id || '');

    if (!targetUserId || targetUserId === currentUserId) return;

    window.showUserConfirm(
        "Transfer Master Ownership",
        "Are you sure you want to pass your Master Admin status to this user? You will be demoted to a regular Admin.",
        () => {
            const users = JSON.parse(localStorage.getItem('sigma-admin-users') || '[]');
            const currentIndex = users.findIndex(u => String(u.uid || u.id) === currentUserId);
            const targetIndex = users.findIndex(u => String(u.uid || u.id) === targetUserId);

            if (currentIndex !== -1 && targetIndex !== -1) {
                // Transfer roles
                users[targetIndex].role = "Master Admin";
                users[targetIndex].type = "Master Admin";
                
                users[currentIndex].role = "Admin";
                users[currentIndex].type = "Admin";

                localStorage.setItem('sigma-admin-users', JSON.stringify(users));

                // Update session for the current user
                authUser.role = "Admin";
                sessionStorage.setItem('sigma-authenticated-user', JSON.stringify(authUser));

                alert("Master Admin ownership has been transferred. Your session will now reflect your new role.");
                window.location.reload();
            }
        }
    );
};

// Global Input Capitalization Logic
document.addEventListener('input', function (e) {
    const target = e.target;
    const isTextBox = (target.tagName === 'INPUT' && (target.type === 'text' || target.type === 'search')) || target.tagName === 'TEXTAREA';

    if (isTextBox && !target.readOnly && !target.disabled) {
        // Skip capitalization for specific fields like Email
        if (target.id === 'edit-user-email') return;

        const start = target.selectionStart;
        const end = target.selectionEnd;
        const val = target.value;

        if (val.length > 0) {
            const newVal = val.charAt(0).toUpperCase() + val.slice(1);
            if (newVal !== val) {
                target.value = newVal;
                // Maintain cursor position
                if (target.setSelectionRange) {
                    target.setSelectionRange(start, end);
                }
            }
        }
    }
});
const ORG_PROFILE_STORAGE_KEY = 'sigma-admin-organization';
const ADMIN_ANNOUNCEMENTS_STORAGE_KEY = 'sigma-admin-announcements-v1';
const ADMIN_ANNOUNCEMENT_DRAFT_KEY = 'sigma-admin-announcement-draft-v1';
const DEFAULT_ORG_PROFILE = {
    schoolName: "Interface Computer College Caloocan",
    location: "Caloocan City",
    address: "10th Avenue corner Rizal Avenue Extension",
    contactNumber: "09947669267",
    emailAddress: "information@interface.edu.ph",
    bios: [],
    logo: 'image/ICC logo.jpg',
    profileUploads: ['image/ICC logo.jpg'],
    administratorId: '',
    administratorName: '',
    status: 'Active'
};

let switchTabHandler = null;
let activeAnnouncementType = 'regular';

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const escapeSigmaAiText = escapeHtml;

window.selectTableRow = function (row) {
    const table = row.closest('table');
    if (table) {
        table.querySelectorAll('tr').forEach(r => r.classList.remove('bg-slate-100'));
    }
    row.classList.add('bg-slate-100');
};

function loadAdminAnnouncements() {
    try {
        const stored = JSON.parse(localStorage.getItem(ADMIN_ANNOUNCEMENTS_STORAGE_KEY) || '[]');
        return Array.isArray(stored) ? stored : [];
    } catch (e) {
        return [];
    }
}

function saveAdminAnnouncements(posts) {
    localStorage.setItem(ADMIN_ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(posts));
}

function getAnnouncementAudienceLabel(audience) {
    return {
        all: 'Everyone',
        students: 'Students',
        teachers: 'Teachers',
        specific: 'Specific Strand / Dept'
    }[audience] || 'Everyone';
}

function formatAnnouncementDate(dateValue) {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'Just now';
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function renderAnnouncementActivePosts() {
    const announcementActivePosts = document.getElementById('announcement-active-posts');
    if (!announcementActivePosts) return;
    const posts = loadAdminAnnouncements();

    if (!posts.length) {
        announcementActivePosts.innerHTML = `
            <div class="py-12 border-2 border-dashed border-slate-100 rounded-[32px] flex flex-col items-center justify-center gap-3 text-slate-300">
                <i class="fa-solid fa-bullhorn text-3xl opacity-20"></i>
                <p class="text-[10px] font-black uppercase tracking-widest">No active posts</p>
            </div>
        `;
        return;
    }

    announcementActivePosts.innerHTML = posts.map(post => `
        <article class="admin-card p-5 border border-slate-100">
            <div class="flex items-start justify-between gap-4">
                <div class="min-w-0 space-y-3">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${post.type === 'urgent' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}">${post.type}</span>
                        <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-black border border-slate-200">${escapeHtml(getAnnouncementAudienceLabel(post.audience))}</span>
                    </div>
                    <div>
                        <h5 class="text-base font-black text-slate-900 leading-tight">${escapeHtml(post.title)}</h5>
                        <p class="mt-2 text-sm text-black leading-relaxed">${escapeHtml(post.body)}</p>
                    </div>
                    <p class="text-[11px] font-bold text-black uppercase tracking-widest">${escapeHtml(post.author || 'Admin Office')} • ${formatAnnouncementDate(post.createdAt)}</p>
                </div>
                <button type="button" data-announcement-delete="${escapeHtml(post.id)}" class="w-10 h-10 rounded-2xl bg-slate-50 text-black hover:bg-red-50 hover:text-red-500 transition-colors flex items-center justify-center" aria-label="Delete announcement">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        </article>
    `).join('');
}

function setAnnouncementType(type) {
    activeAnnouncementType = type === 'urgent' ? 'urgent' : 'regular';
    const buttons = document.querySelectorAll('[data-announcement-type]');
    buttons.forEach(button => {
        const isActive = button.dataset.announcementType === activeAnnouncementType;
        button.classList.toggle('border-super-accent', isActive && activeAnnouncementType === 'regular');
        button.classList.toggle('bg-super-accent/5', isActive && activeAnnouncementType === 'regular');
        button.classList.toggle('text-super-accent', isActive && activeAnnouncementType === 'regular');
        button.classList.toggle('border-red-300', isActive && activeAnnouncementType === 'urgent');
        button.classList.toggle('bg-red-50', isActive && activeAnnouncementType === 'urgent');
        button.classList.toggle('text-red-600', isActive && activeAnnouncementType === 'urgent');
        button.classList.toggle('border-slate-100', !isActive);
        button.classList.toggle('text-black', !isActive);
    });
}

function getStoredJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
        return fallback;
    }
}

// Global Click Outside Handler for Filter Menus
document.addEventListener('click', function (event) {
    const filterMenus = [
        { btnId: 'subject-filter-btn', menuId: 'subject-filter-menu' },
        { btnId: 'user-filter-btn', menuId: 'user-filter-menu' },
        { btnId: 'section-filter-btn', menuId: 'section-filter-menu' }
    ];

    filterMenus.forEach(config => {
        const btn = document.getElementById(config.btnId);
        const menu = document.getElementById(config.menuId);

        if (menu && !menu.classList.contains('hidden')) {
            const isClickInsideMenu = menu.contains(event.target);
            const isClickOnBtn = btn && btn.contains(event.target);

            if (!isClickInsideMenu && !isClickOnBtn) {
                menu.classList.add('hidden');
            }
        }
    });
});

function saveStoredJson(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving to local storage:', error);
    }
}

function buildManagedUserPassword(lastName, userId) {
    const safeLastName = String(lastName || 'user')
        .trim()
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase();
    return `${safeLastName}${String(userId || '').trim()}`;
}

function purgeLegacyManagedUsers() {
    if (localStorage.getItem(MANAGED_USERS_RESET_KEY) === 'true') {
        return;
    }

    const users = getStoredJson(USER_STORAGE_KEY, []);
    const managedUsers = users.filter((user) => user && user.createdVia === 'admin-panel');
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(managedUsers));
    localStorage.setItem(MANAGED_USERS_RESET_KEY, 'true');
}

purgeLegacyManagedUsers();

function getOrganizationProfile() {
    return {
        ...DEFAULT_ORG_PROFILE,
        ...getStoredJson(ORG_PROFILE_STORAGE_KEY, {})
    };
}

function saveOrganizationProfile(profile) {
    try {
        localStorage.setItem(ORG_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
        console.error("Failed to save organization profile:", e);
        // If it fails, try to save without the upload history to recover space
        if (profile.profileUploads) {
            console.warn("Storage full, clearing school profile upload history...");
            const slimProfile = { ...profile, profileUploads: [] };
            localStorage.setItem(ORG_PROFILE_STORAGE_KEY, JSON.stringify(slimProfile));
        }
    }
}

function getRegisteredAdministrators() {
    const users = getStoredJson(USER_STORAGE_KEY, []);
    const seen = new Set();

    return users
        .filter((user) => {
            const role = String(user?.type || user?.role || '').toLowerCase();
            return role === 'admin' || role === 'institutional admin';
        })
        .map((user, index) => {
            const name = [
                user?.firstName,
                user?.middleName,
                user?.lastName
            ].filter(Boolean).join(' ').trim() || user?.fullName || user?.name || user?.email || `Administrator ${index + 1}`;
            const id = String(user?.id || user?.uid || user?.email || `admin-${index}`);
            return { id, name };
        })
        .filter((admin) => {
            if (seen.has(admin.id)) {
                return false;
            }
            seen.add(admin.id);
            return true;
        });
}

const SCHOOL_PROFILE_TAB_CONTENT = {
    bio: {
        eyebrow: '',
        title: '',
        body: '',
        items: []
    }
};

function renderUserAccountsTable() {
    const tableBody = document.getElementById('userTableBody');
    if (!tableBody) return;

    const idQuery = String(window.userAccountSearchState?.id || '').trim().toLowerCase();
    const nameQuery = String(window.userAccountSearchState?.name || '').trim().toLowerCase();
    const roleQuery = String(window.userAccountSearchState?.role || '').trim().toLowerCase();
    const statusQuery = String(window.userAccountSearchState?.status || '').trim().toLowerCase();
    const displayUsers = getFilteredUsersBySearch({ id: idQuery, name: nameQuery, role: roleQuery, status: statusQuery });
    const hasActiveFilters = Boolean(idQuery || nameQuery || roleQuery || statusQuery);

    if (!hasActiveFilters) {
        tableBody.innerHTML = `
            <tr id="user-empty-state" class="bg-white">
                <td colspan="6" class="py-32 text-center">
                    <div class="flex flex-col items-center justify-center space-y-4 opacity-25">
                        <i class="fa-solid fa-users text-6xl text-black"></i>
                        <p class="text-base font-bold text-black font-['Inter']">Search Accounts</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    if (displayUsers.length === 0) {
        tableBody.innerHTML = `
            <tr id="user-empty-state" class="bg-white">
                <td colspan="6" class="py-32 text-center">
                    <div class="flex flex-col items-center justify-center space-y-4 opacity-25">
                        <i class="fa-solid fa-magnifying-glass text-6xl text-black"></i>
                        <p class="text-base font-bold text-black font-['Inter']">No matching accounts found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    if (displayUsers.length === 0) {
        tableBody.innerHTML = `
            <tr id="user-empty-state" class="bg-white">
                <td colspan="6" class="py-32 text-center">
                    <div class="flex flex-col items-center justify-center space-y-4 opacity-25">
                        <i class="fa-solid fa-users-viewfinder text-6xl text-black"></i>
                        <p class="text-base font-bold text-black font-['Inter']">No matching accounts found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = displayUsers.map(user => {
        const fullName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
        const firstName = user.firstName || fullName.split(' ').filter(Boolean)[0] || 'N/A';
        const lastName = user.lastName || fullName.split(' ').filter(Boolean).slice(1).join(' ') || 'N/A';
        const role = normalizeUserRole(user.type || user.role || 'Student');
        const id = user.uid || user.id || 'N/A';
        const status = user.status || 'Active';

        const lowerStatus = status.toLowerCase();
        const statusClass = lowerStatus === 'active'
            ? 'text-[#15803d]'
            : (lowerStatus === 'locked' || lowerStatus === 'inactive')
                ? 'text-red-500'
                : 'text-slate-400';

        return `
            <tr class="transition-colors">
                <td class="px-8 py-6 text-center">
                    <div class="text-sm font-medium text-black text-center tracking-wide">${id}</div>
                </td>
                <td class="px-8 py-6 text-center">
                    <div class="text-sm font-medium text-black text-center tracking-tight">${escapeHtml(firstName)}</div>
                </td>
                <td class="px-8 py-6 text-center">
                    <div class="text-sm font-medium text-black text-center tracking-tight">${escapeHtml(lastName)}</div>
                </td>
                <td class="px-8 py-6 text-center">
                    <div class="text-sm font-medium text-black text-center">${escapeHtml(role)}</div>
                </td>
                <td class="px-8 py-6 text-center">
                    <div class="text-sm font-medium ${statusClass} text-center">${escapeHtml(status)}</div>
                </td>
                <td class="px-8 py-6 text-center">
                    <div class="flex justify-center">
                        <div class="action-dropdown-container">
                            <button onclick="window.toggleUserActionDropdown('${id}', event)" 
                                id="dots-btn-${id}"
                                class="action-dots-btn" 
                                title="Actions">
                                <i class="fa-solid fa-ellipsis"></i>
                            </button>
                            <div id="action-menu-${id}" class="action-dropdown-menu">
                                <button onclick="window.viewUserProfile('${id}')" class="action-dropdown-item">
                                    <i class="fa-solid fa-user-circle"></i>
                                    <span>View Profile</span>
                                </button>
                                <button onclick="window.editUser('${id}', false)" class="action-dropdown-item">
                                    <i class="fa-solid fa-user-pen"></i>
                                    <span>Edit Account</span>
                                </button>
                                <button onclick="window.editUserPermissions('${id}')" class="action-dropdown-item">
                                    <i class="fa-solid fa-user-shield"></i>
                                    <span>${(role === 'Master Admin' || role === 'Admin') ? 'Edit Roles and Permissions' : 'Edit Permissions'}</span>
                                </button>
                                <div class="h-px bg-slate-100 my-1"></div>
                                ${status === 'Inactive' || status === 'Deactivated' ? `
                                <button onclick="window.requestActivateUser('${id}')" class="action-dropdown-item text-green-600">
                                    <i class="fa-solid fa-user-check text-green-600"></i>
                                    <span>Activate Account</span>
                                </button>
                                ` : `
                                <button onclick="window.requestDeactivateUser('${id}')" class="action-dropdown-item text-red-600">
                                    <i class="fa-solid fa-user-slash text-red-600"></i>
                                    <span>Deactivate Account</span>
                                </button>
                                `}
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

window.toggleUserActionDropdown = function (userId, event) {
    if (event) event.stopPropagation();

    const menuId = `action-menu-${userId}`;
    const btnId = `dots-btn-${userId}`;
    const menu = document.getElementById(menuId);
    const btn = document.getElementById(btnId);

    // Close all other menus first
    document.querySelectorAll('.action-dropdown-menu').forEach(m => {
        if (m.id !== menuId) m.classList.remove('show');
    });
    document.querySelectorAll('.action-dots-btn').forEach(b => {
        if (b.id !== btnId) b.classList.remove('active');
    });

    if (menu && btn) {
        const isShowing = menu.classList.contains('show');
        menu.classList.toggle('show', !isShowing);
        btn.classList.toggle('active', !isShowing);
    }
};

window.editUserPermissions = function (userId) {
    // Set current editing user
    window.currentEditingUserId = userId;
    window.permissionsChanged = false;

    // Fetch user details
    const users = getStoredJson(USER_STORAGE_KEY, []);
    const user = users.find(u => String(u.uid || u.id || '') === String(userId));

    if (user) {
        // Apply existing permissions or defaults (Bio ON, others OFF)
        const perms = user.permissions || { bio: true, achievements: false, subjects: false, sections: false };
        window.initialPermissions = { ...perms };

        document.getElementById('perm-profile-bio').checked = !!perms.bio;
        document.getElementById('perm-profile-achievements').checked = !!perms.achievements;
        document.getElementById('perm-profile-subjects').checked = !!perms.subjects;
        document.getElementById('perm-profile-sections').checked = !!perms.sections;

        // Update Header Text
        const header = document.getElementById('user-permissions-header');
        if (header) {
            header.innerText = (user.role === 'Master Admin' || user.role === 'Admin') ? 'Edit Roles and Permissions' : 'Edit Permissions';
        }

        const roleSection = document.getElementById('perm-role-section');
        const masterToggle = document.getElementById('perm-role-master');

        if (roleSection && masterToggle) {
            const authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
            const authRole = normalizeUserRole(authUser.role);
            const targetRole = normalizeUserRole(user.role);

            const isMaster = authRole === 'Master Admin';
            const isTargetAdmin = targetRole === 'Admin' || targetRole === 'Master Admin';

            // Show role section if user is Admin or Master Admin
            roleSection.classList.toggle('hidden', !isTargetAdmin);

            const isTargetMaster = targetRole === 'Master Admin';
            masterToggle.checked = isTargetMaster;

            // LOCK LOGIC: 
            // 1. If editing self: lock it.
            // 2. If NOT a Master Admin: lock it.
            // 3. Only an external Master Admin can toggle someone else's Master status.
            const isSelf = String(authUser.uid || authUser.id || '') === String(userId);
            const isDisabled = isSelf || !isMaster;
            masterToggle.disabled = isDisabled;

            // Update Lock Icon and Design
            const lockIcon = document.getElementById('perm-role-master-lock');
            if (lockIcon) lockIcon.classList.toggle('hidden', !isDisabled);

            // Add visual dimming if disabled
            const row = masterToggle.closest('label');
            if (row) {
                row.style.opacity = isDisabled ? '0.6' : '1';
                row.style.cursor = isDisabled ? 'not-allowed' : 'pointer';
            }

            // Pass Master Admin logic
            const passContainer = document.getElementById('perm-role-pass-container');
            if (passContainer) {
                // Show only if I'm a Master Admin, editing someone else who is an Admin
                const canPass = isMaster && !isSelf && targetRole === 'Admin';
                passContainer.classList.toggle('hidden', !canPass);
            }
        }
    }

    // Lock save button initially
    const saveBtn = document.getElementById('save-permissions-btn');
    if (saveBtn) saveBtn.disabled = true;

    // Show permissions overlay
    const overlay = document.getElementById('user-permissions-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        overlay.scrollTo({ top: 0, behavior: 'smooth' });
    }

    console.log('Editing permissions for user:', userId);
};

window.handleMasterAdminToggle = function (checkbox) {
    const isPromoting = checkbox.checked;

    const title = isPromoting ? 'Master Admin Elevation' : 'Master Admin Revocation';
    const desc = isPromoting
        ? 'Do you want to promote this account to Master Admin?'
        : 'Do you want to demote this account back to a regular Admin?';

    window.showUserConfirm(
        title,
        desc,
        () => {
            // User clicked Yes
            checkbox.checked = isPromoting;
            window.permissionsChanged = true;
            const saveBtn = document.getElementById('save-permissions-btn');
            if (saveBtn) saveBtn.disabled = false;
        },
        false, // isSuccess
        () => {
            // User clicked Cancel
            checkbox.checked = !isPromoting;
            window.trackPermissionChanges(); // Sync save button state
        }
    );
};

window.trackPermissionChanges = function () {
    const currentPerms = {
        bio: document.getElementById('perm-profile-bio').checked,
        achievements: document.getElementById('perm-profile-achievements').checked,
        subjects: document.getElementById('perm-profile-subjects').checked,
        sections: document.getElementById('perm-profile-sections').checked
    };

    const hasChanged = JSON.stringify(currentPerms) !== JSON.stringify(window.initialPermissions);
    window.permissionsChanged = hasChanged;

    const saveBtn = document.getElementById('save-permissions-btn');
    if (saveBtn) saveBtn.disabled = !hasChanged;
};

window.handlePermissionsExit = function () {
    if (window.permissionsChanged) {
        const modal = document.getElementById('permissions-discard-modal');
        if (modal) modal.classList.remove('hidden');
    } else {
        const overlay = document.getElementById('user-permissions-overlay');
        if (overlay) overlay.classList.add('hidden');
    }
};

window.confirmPermissionsDiscard = function () {
    window.permissionsChanged = false;
    const modal = document.getElementById('permissions-discard-modal');
    const overlay = document.getElementById('user-permissions-overlay');
    if (modal) modal.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');
};

window.cancelPermissionsDiscard = function () {
    const modal = document.getElementById('permissions-discard-modal');
    if (modal) modal.classList.add('hidden');
};

window.saveUserPermissions = function () {
    const userId = window.currentViewingUserId || window.currentEditingUserId;
    if (!userId) return;

    const users = getStoredJson(USER_STORAGE_KEY, []);
    const userIndex = users.findIndex(u => String(u.uid || u.id || '') === String(userId));

    if (userIndex !== -1) {
        // Collect permission states
        const perms = {
            bio: document.getElementById('perm-profile-bio').checked,
            achievements: document.getElementById('perm-profile-achievements').checked,
            subjects: document.getElementById('perm-profile-subjects').checked,
            sections: document.getElementById('perm-profile-sections').checked
        };

        // Save to user object
        users[userIndex].permissions = perms;

        // Handle Role change
        const masterToggle = document.getElementById('perm-role-master');
        if (masterToggle && !masterToggle.disabled) {
            const currentMasterStatus = masterToggle.checked;
            const newRole = currentMasterStatus ? 'Master Admin' : 'Admin';
            users[userIndex].role = newRole;
            users[userIndex].type = newRole;
        }

        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));

        // Reset tracking
        window.permissionsChanged = false;
        window.initialPermissions = { ...perms };

        console.log('Permissions saved for user:', userId, perms);

        // Hide overlay
        window.handlePermissionsExit();

        // Refresh table if needed
        if (typeof renderUserAccountsTable === 'function') renderUserAccountsTable();
    }
};

window.toggleProfileSettingsMenu = function (event, forceClose = false) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('profile-settings-menu');
    const btn = document.getElementById('profile-settings-btn');
    if (!menu) return;

    if (forceClose) {
        menu.classList.add('hidden');
        if (btn) btn.classList.remove('active');
        return;
    }

    const isHidden = menu.classList.contains('hidden');
    menu.classList.toggle('hidden', !isHidden);
    if (btn) btn.classList.toggle('active', !isHidden);
};

window.showDeleteAccountModal1 = function () {
    const modal = document.getElementById('delete-account-modal-1');
    if (modal) modal.classList.remove('hidden');
};

window.showDeleteAccountModal2 = function () {
    document.getElementById('delete-account-modal-1').classList.add('hidden');
    const modal = document.getElementById('delete-account-modal-2');
    if (modal) {
        modal.classList.remove('hidden');
        const input = document.getElementById('delete-account-input');
        const btn = document.getElementById('final-delete-btn');
        if (input) {
            input.value = '';
            input.focus();
        }
        if (btn) btn.disabled = true;
    }
};

window.executeDeleteAccount = function () {
    const input = document.getElementById('delete-account-input');
    const userId = window.currentViewingUserId;
    if (!input || !userId) return;

    if (input.value.trim().toUpperCase() !== 'DELETE') {
        alert('Please type DELETE to confirm');
        return;
    }

    const users = getStoredJson(USER_STORAGE_KEY, []);
    const filteredUsers = users.filter(u => String(u.uid || u.id || '') !== String(userId));
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(filteredUsers));

    // Hide modals and exit profile view
    document.getElementById('delete-account-modal-2').classList.add('hidden');
    window.switchTab('nav-users-accounts');
    renderUserAccountsTable();

    alert('Account successfully deleted');
};

window.toggleUserLock = function (userId) {
    if (!userId) return;

    const users = getStoredJson(USER_STORAGE_KEY, []);
    const userIdx = users.findIndex(u => String(u.uid || u.id || '') === String(userId));

    if (userIdx !== -1) {
        const currentStatus = (users[userIdx].status || 'Active').toLowerCase();
        const newStatus = currentStatus === 'locked' ? 'Active' : 'Locked';
        const confirmMsg = newStatus === 'Locked' ? 'Do you want to lock this account?' : 'Do you want to unlock this account?';

        if (!confirm(confirmMsg)) return;

        users[userIdx].status = newStatus;
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));

        // Update local state if currently viewing this user
        if (window.currentUserProfileData && String(window.currentUserProfileData.id) === String(userId)) {
            window.currentUserProfileData.status = newStatus;
        }

        // Refresh UI
        window.populateUserProfilePage();
        if (typeof renderUserAccountsTable === 'function') renderUserAccountsTable();

        // Success feedback
        const msg = newStatus === 'Locked' ? 'Account successfully locked.' : 'Account successfully unlocked.';
        alert(msg);
    }
};

// Global click listener to close action dropdowns
document.addEventListener('click', (e) => {
    if (!e.target.closest('.action-dropdown-container')) {
        document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));
        document.querySelectorAll('.action-dots-btn').forEach(b => b.classList.remove('active'));
    }
    // Close profile settings menu
    if (!e.target.closest('#profile-settings-btn') && !e.target.closest('#profile-settings-menu')) {
        window.toggleProfileSettingsMenu(null, true);
    }
});

function getFilteredUsersBySearch(searchState) {
    const users = getStoredJson(USER_STORAGE_KEY, []);
    const idQuery = String(searchState?.id || '').trim().toLowerCase();
    const nameQuery = String(searchState?.name || '').trim().toLowerCase();
    const roleQuery = String(searchState?.role || '').trim().toLowerCase();

    // Get current authenticated user ID to exclude
    const authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
    const authUserId = String(authUser.uid || authUser.id || '');

    return users.filter(user => {
        const id = String(user.uid || user.id || '');
        const idLower = id.toLowerCase();

        // EXCLUDE SELF: If this is the logged-in user, skip
        if (authUserId && id === authUserId) return false;

        const firstName = String(user.firstName || '').trim();
        const lastName = String(user.lastName || '').trim();
        const middleName = String(user.middleName || '').trim();
        const fullName = String(
            user.fullName || [firstName, middleName, lastName].filter(Boolean).join(' ')
        ).trim().toLowerCase();
        const normalizedRole = normalizeUserRole(user.type || user.role || '').toLowerCase();

        const matchesId = !idQuery || idLower.includes(idQuery);
        const matchesName = !nameQuery
            || fullName.includes(nameQuery)
            || firstName.toLowerCase().includes(nameQuery)
            || lastName.toLowerCase().includes(nameQuery);
        const matchesRole = !roleQuery || normalizedRole === roleQuery;

        return matchesId && matchesName && matchesRole;
    });
}

window.userAccountSearchState = window.userAccountSearchState || {
    id: '',
    name: '',
    role: '',
    status: ''
};

window.applyUserAccountSearch = function () {
    window.userAccountSearchState = {
        id: String(document.getElementById('user-search-id')?.value || '').trim(),
        name: String(document.getElementById('user-search-name')?.value || '').trim(),
        role: normalizeUserRole(document.getElementById('user-search-role')?.value || '')
    };
    renderUserAccountsTable();
};

function bindUserAccountSearch() {
    const idInput = document.getElementById('user-search-id');
    const nameInput = document.getElementById('user-search-name');
    const roleSelect = document.getElementById('user-search-role');
    const searchBtn = document.getElementById('user-search-btn');

    [idInput, nameInput].forEach((input) => {
        if (!input || input.dataset.enterBound === 'true') return;
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                window.applyUserAccountSearch();
            }
        });
        input.dataset.enterBound = 'true';
    });

    if (searchBtn && searchBtn.dataset.searchBound !== 'true') {
        searchBtn.addEventListener('click', window.applyUserAccountSearch);
        searchBtn.dataset.searchBound = 'true';
    }
}

window.rolesPermissionSearchState = window.rolesPermissionSearchState || {
    id: '',
    name: '',
    role: ''
};

function renderRolesPermissionsTable() {
    const tableBody = document.getElementById('rolesPermissionTableBody');
    if (!tableBody) return;

    const idQuery = String(window.rolesPermissionSearchState?.id || '').trim().toLowerCase();
    const nameQuery = String(window.rolesPermissionSearchState?.name || '').trim().toLowerCase();
    const roleQuery = String(window.rolesPermissionSearchState?.role || '').trim().toLowerCase();
    const displayUsers = getFilteredUsersBySearch({ id: idQuery, name: nameQuery, role: roleQuery });
    const hasActiveFilters = Boolean(idQuery || nameQuery || roleQuery);

    if (!hasActiveFilters) {
        tableBody.innerHTML = `
            <tr id="roles-empty-state" class="bg-white">
                <td colspan="6" class="py-32 text-center">
                    <div class="flex flex-col items-center justify-center space-y-4 opacity-20">
                        <i class="fa-solid fa-user-shield text-5xl"></i>
                        <p class="text-[11px] font-black uppercase tracking-[0.3em]">Search to reveal roles</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    if (displayUsers.length === 0) {
        tableBody.innerHTML = `
            <tr id="roles-empty-state" class="bg-white">
                <td colspan="6" class="py-32 text-center">
                    <div class="flex flex-col items-center justify-center space-y-4 opacity-20">
                        <i class="fa-solid fa-user-shield text-5xl"></i>
                        <p class="text-[11px] font-black uppercase tracking-[0.3em]">No matching roles found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = displayUsers.map(user => {
        const fullName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
        const firstName = user.firstName || fullName.split(' ').filter(Boolean)[0] || 'N/A';
        const lastName = user.lastName || fullName.split(' ').filter(Boolean).slice(1).join(' ') || 'N/A';
        const role = normalizeUserRole(user.type || user.role || 'Student');
        const id = user.uid || user.id || 'N/A';
        const status = user.status || 'Active';

        const statusClass = status.toLowerCase() === 'active'
            ? 'text-[#15803d]'
            : 'text-slate-400';

        return `
            <tr class="group hover:bg-slate-50 transition-colors">
                <td class="px-8 py-6 text-center">
                    <div class="text-sm font-medium text-black text-center tracking-wide">${id}</div>
                </td>
                <td class="px-8 py-6 text-center">
                    <div class="text-sm font-medium text-black text-center tracking-tight">${escapeHtml(firstName)}</div>
                </td>
                <td class="px-8 py-6 text-center">
                    <div class="text-sm font-medium text-black text-center tracking-tight">${escapeHtml(lastName)}</div>
                </td>
                <td class="px-8 py-6 text-center">
                    <div class="text-sm font-medium text-black text-center">${escapeHtml(role)}</div>
                </td>
                <td class="px-8 py-6 text-center">
                    <div class="text-sm font-medium ${statusClass} text-center">${escapeHtml(status)}</div>
                </td>
                <td class="px-8 py-6 text-center">
                    <button onclick="editUserPermissions('${id}')" class="inline-flex items-center justify-center w-10 h-10 rounded-full text-black hover:text-[#FFD000] transition-colors" title="Edit Permissions" aria-label="Edit Permissions">
                        <i class="fa-solid fa-user-shield text-base"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

window.applyRolesPermissionSearch = function () {
    window.rolesPermissionSearchState = {
        id: String(document.getElementById('roles-search-id')?.value || '').trim(),
        name: String(document.getElementById('roles-search-name')?.value || '').trim(),
        role: normalizeUserRole(document.getElementById('roles-search-role')?.value || '')
    };
    renderRolesPermissionsTable();
};

function bindRolesPermissionSearch() {
    const idInput = document.getElementById('roles-search-id');
    const nameInput = document.getElementById('roles-search-name');
    const roleSelect = document.getElementById('roles-search-role');
    const searchBtn = document.getElementById('roles-search-btn');

    [idInput, nameInput].forEach((input) => {
        if (!input || input.dataset.enterBound === 'true') return;
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                window.applyRolesPermissionSearch();
            }
        });
        input.dataset.enterBound = 'true';
    });

    if (roleSelect && roleSelect.dataset.enterBound !== 'true') {
        roleSelect.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                window.applyRolesPermissionSearch();
            }
        });
        roleSelect.dataset.enterBound = 'true';
    }

    if (searchBtn && searchBtn.dataset.searchBound !== 'true') {
        searchBtn.addEventListener('click', window.applyRolesPermissionSearch);
        searchBtn.dataset.searchBound = 'true';
    }
}


window.toggleAdminForm = function () {
    const form = document.getElementById('provision-admin-form');
    if (form) {
        form.classList.toggle('hidden');
    }
};

window.showUserAccounts = function () {
    if (switchTabHandler) {
        switchTabHandler('nav-users-accounts', 'users-view');
        bindUserAccountSearch();
        renderUserAccountsTable();
    }
};

function populateAdministratorSelect(selectedId = '') {
    const select = document.getElementById('org-administrator');
    if (!select) {
        return;
    }

    const admins = getRegisteredAdministrators();
    const baseOption = '<option value="">Select administrator</option>';
    const adminOptions = admins.map((admin) => `
        <option value="${admin.id}">${admin.name}</option>
    `).join('');

    select.innerHTML = baseOption + adminOptions;
    select.value = admins.some((admin) => admin.id === selectedId) ? selectedId : '';
}

function setOrganizationLogoPreview(src) {
    const preview = document.getElementById('org-logo-preview');
    if (preview) {
        preview.src = src || DEFAULT_ORG_PROFILE.logo;
    }
}

function fillOrganizationForm() {
    const profile = getOrganizationProfile();
    const schoolNameInput = document.getElementById('org-school-name');
    const addressInput = document.getElementById('org-school-address');
    const cityInput = document.getElementById('org-school-city');
    const contactInput = document.getElementById('org-contact-number');
    const emailInput = document.getElementById('org-email-address');

    // Select new fields via placeholder/name
    const regForm = document.getElementById('organization-registration-form');
    const mottoInput = regForm?.querySelector('input[placeholder*="Excellence"]');
    const schoolIdInput = regForm?.querySelector('input[placeholder*="405123"]');
    const visionInput = regForm?.querySelector('textarea[placeholder*="vision"]');
    const missionInput = regForm?.querySelector('textarea[placeholder*="mission"]');

    if (schoolNameInput) schoolNameInput.value = profile.schoolName;
    if (addressInput) addressInput.value = profile.address;
    if (cityInput) cityInput.value = profile.city || '';
    if (contactInput) contactInput.value = profile.contactNumber;
    if (emailInput) emailInput.value = profile.emailAddress;

    if (mottoInput) mottoInput.value = profile.motto || '';
    if (schoolIdInput) schoolIdInput.value = profile.schoolId || '';
    if (visionInput) visionInput.value = profile.vision || '';
    if (missionInput) missionInput.value = profile.mission || '';

    populateAdministratorSelect(profile.administratorId);
    setOrganizationLogoPreview(profile.logo);
}

function renderSchoolYearCard(data) {
    const container = document.getElementById('sy-list-container');
    const emptyState = document.getElementById('sy-empty-state');
    if (!container) {
        return;
    }

    if (emptyState) {
        emptyState.remove();
    }

    const fmtStart = data.start !== 'Not set'
        ? new Date(data.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Not set';
    const fmtEnd = data.end !== 'Not set'
        ? new Date(data.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Not set';

    container.innerHTML = `
        <div class="admin-card border-l-4 border-super-accent bg-super-accent/[0.02] animate-slide-up">
            <div class="flex justify-between items-start mb-6">
                <div class="px-3 py-1 bg-super-accent text-white text-[8px] font-black rounded uppercase tracking-widest">Current Cycle</div>
                <button class="text-black hover:text-slate-900 transition-all"><i class="fa-solid fa-ellipsis-vertical"></i></button>
            </div>
            <h4 class="text-2xl font-black text-slate-900 tracking-tighter mb-1">SY ${data.year}</h4>
            <p class="text-sm font-bold text-black mb-6">${data.semester}</p>

            <div class="space-y-4">
                <div class="flex items-center justify-between text-[10px] font-bold">
                    <span class="text-black uppercase tracking-widest">Progress</span>
                    <span class="text-super-accent font-black">Active</span>
                </div>
                <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full bg-super-accent w-[5%] rounded-full animate-pulse"></div>
                </div>
                <div class="flex gap-10 pt-4">
                    <div>
                        <p class="text-[9px] text-black font-black uppercase tracking-widest mb-1">Start Date</p>
                        <p class="text-xs font-bold text-slate-700">${fmtStart}</p>
                    </div>
                    <div>
                        <p class="text-[9px] text-black font-black uppercase tracking-widest mb-1">Expected End</p>
                        <p class="text-xs font-bold text-slate-700">${fmtEnd}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function updateGlobalSYDisplay() {
    const display = document.getElementById('global-sy-display');
    if (!display) return;

    // Use the logic from the school year module if available
    if (typeof getActiveSchoolYearRecord === 'function') {
        const activeRecord = getActiveSchoolYearRecord();
        if (!activeRecord) {
            display.textContent = '';
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let currentQuarter = null;
        let anyQuarterStarted = false;
        let hasAnyDates = false;

        const quarters = [
            { name: '1st Quarter', start: activeRecord.q1Start, end: activeRecord.q1End },
            { name: '2nd Quarter', start: activeRecord.q2Start, end: activeRecord.q2End },
            { name: '3rd Quarter', start: activeRecord.q3Start, end: activeRecord.q3End },
            { name: '4th Quarter', start: activeRecord.q4Start, end: activeRecord.q4End }
        ];

        for (const q of quarters) {
            if (q.start && q.end) {
                hasAnyDates = true;
                const startDate = new Date(`${q.start}T00:00:00`);
                if (today >= startDate) {
                    anyQuarterStarted = true;
                    currentQuarter = q.name;
                }
            }
        }

        let allQuartersEnded = true;
        if (anyQuarterStarted) {
            for (const q of quarters) {
                if (q.end) {
                    const endDate = new Date(`${q.end}T23:59:59`);
                    if (today <= endDate) { allQuartersEnded = false; break; }
                }
            }
        } else {
            allQuartersEnded = false;
        }

        const yearRange = `${activeRecord.yearStart}-${activeRecord.yearEnd}`;

        if (!hasAnyDates) {
            display.textContent = '';
        } else if (anyQuarterStarted && !allQuartersEnded) {
            const quarterText = currentQuarter ? currentQuarter.toUpperCase() : 'TRANSITION';
            display.textContent = `SY ${yearRange} • ${quarterText}`;
        } else if (!anyQuarterStarted) {
            display.textContent = `SY ${yearRange} • UPCOMING`;
        } else {
            display.textContent = '';
        }
        return;
    }

    // Fallback to legacy behavior if module not loaded
    display.textContent = '';
}

window.toggleAdminForm = function () {
    const form = document.getElementById('provision-admin-form');
    if (form) {
        form.classList.toggle('hidden');
    }
};

window.toggleOrgForm = function () {
    window.openOrganizationRegistrationView();
};

window.toggleSYForm = function () {
    const form = document.getElementById('sy-form');
    if (form) {
        form.classList.toggle('hidden');
    }
};

window.toggleTableEdit = function (tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const actionCols = table.querySelectorAll('.actions-column');
    actionCols.forEach(col => {
        col.classList.toggle('hidden');
    });
};

window.selectTableRow = function (row) {
    const table = row.closest('table');
    const editBtn = document.getElementById('top-edit-btn');

    // Check if current row is already selected
    const isSelected = row.classList.contains('admin-row-selected');

    // Clear all other selections in this table
    table.querySelectorAll('tr').forEach(r => {
        r.classList.remove('admin-row-selected');
    });

    if (!isSelected) {
        // Select this row
        row.classList.add('admin-row-selected');

        if (editBtn) {
            editBtn.disabled = false;
            editBtn.classList.remove('text-black');
            editBtn.classList.add('text-[#15803d]');
        }
    } else {
        // Deselect
        if (editBtn) {
            editBtn.disabled = true;
            editBtn.classList.add('text-black');
            editBtn.classList.remove('text-[#15803d]');
        }
    }
};

window.openUserEditView = function () {
    if (switchTabHandler) {
        switchTabHandler('nav-users', 'users-edit-view');
    }
}

window.closeUserEditView = function () {
    if (switchTabHandler) {
        switchTabHandler('nav-users');
    }
};

// Add listener for the top Edit button to open edit view
document.addEventListener('DOMContentLoaded', () => {
    const editBtn = document.getElementById('top-edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            const selectedRow = document.querySelector('tr.admin-row-selected');
            if (selectedRow) {
                window.openUserEditView();
            }
        });
    }
});

window.activateSchoolYear = function () {
    const year = document.getElementById('sy-input-year')?.value;
    const semester = document.getElementById('sy-input-semester')?.value;
    const startDate = document.getElementById('sy-input-start')?.value;
    const endDate = document.getElementById('sy-input-end')?.value;

    if (!year || !semester) {
        alert('Please fill in both School Year and Quarter');
        return;
    }

    const syData = {
        year,
        semester,
        start: startDate || 'Not set',
        end: endDate || 'Not set'
    };

    localStorage.setItem('sigma_school_year', JSON.stringify(syData));
    window.deleteBio = function (index) {
        if (!confirm('Are you sure you want to delete this bio entry?')) return;

        const profile = getOrganizationProfile();
        const nextBios = [...(profile.bios || [])];
        nextBios.splice(index, 1);

        saveOrganizationProfile({
            ...profile,
            bios: nextBios
        });
        renderSchoolProfileTab('bio');
    };

    updateGlobalSYDisplay();
    renderSchoolYearCard(syData);
    window.toggleSYForm();
    alert(`School Year ${year} - ${semester} has been activated globally.`);
};

window.toggleEditAboutField = function (field, shouldSave) {
    const viewEl = document.getElementById(`view-${field}`);
    const containerEl = document.getElementById(`edit-${field}-container`);
    const inputEl = document.getElementById(`edit-${field}-input`);
    const editBtn = document.getElementById(`edit-${field}-btn`);
    if (!viewEl || !containerEl || !inputEl) return;

    const isEditing = !containerEl.classList.contains('hidden');

    if (isEditing) {
        if (shouldSave) {
            const newValue = inputEl.value.trim();
            if (newValue) {
                const profile = getOrganizationProfile();
                const nextProfile = { ...profile };

                if (field === 'address') nextProfile.address = newValue;
                if (field === 'contact') nextProfile.contactNumber = newValue;
                if (field === 'email') nextProfile.emailAddress = newValue;

                // Sync with branchRecords as well (assuming first record is the one being viewed)
                if (typeof branchRecords !== 'undefined' && branchRecords[0]) {
                    if (field === 'address') branchRecords[0].street = newValue;
                    if (field === 'contact') branchRecords[0].contact = newValue;
                    if (field === 'email') branchRecords[0].email = newValue;

                    // Update localStorage for branchRecords if it exists
                    localStorage.setItem('sigma_branches', JSON.stringify(branchRecords));
                }

                saveOrganizationProfile(nextProfile);
                syncProfileDisplay();

                // If there's a function to refresh the branch list UI, call it
                if (typeof renderBranchTable === 'function') {
                    renderBranchTable();
                }
            }
        }
        // Exit edit mode
        containerEl.classList.add('hidden');
        viewEl.classList.remove('hidden');
        if (editBtn) editBtn.classList.remove('hidden');
    } else {
        // Enter edit mode
        inputEl.value = viewEl.textContent.trim();
        viewEl.classList.add('hidden');
        if (editBtn) editBtn.classList.add('hidden');
        containerEl.classList.remove('hidden');
        inputEl.focus();

        // Handle Escape key only (Save/Discard buttons handle the rest)
        inputEl.onkeydown = (e) => {
            if (e.key === 'Escape') {
                window.toggleEditAboutField(field, false);
            }
        };
    }
};

window.openOrganizationRegistrationView = function () {
    fillOrganizationForm();
    if (switchTabHandler) {
        switchTabHandler('nav-organizations', 'organization-registration-view');
    }
}

window.closeOrganizationRegistrationView = function () {
    if (switchTabHandler) {
        switchTabHandler('nav-organizations');
    }
};

const SETTINGS_TAB_META = {
    appearance: {
        section: 'System Settings',
        title: 'Appearance',
        description: 'Manage branding, academic cycle controls, and global visual assets.',
        badge: 'Appearance'
    },
    api: {
        section: 'System Settings',
        title: 'API',
        description: 'Configure AI providers, credentials, and external integration endpoints.',
        badge: 'API'
    },
    security: {
        section: 'System Settings',
        title: 'Security',
        description: 'Adjust platform protection, verification, and session controls.',
        badge: 'Security'
    },
    storage: {
        section: 'System Settings',
        title: 'Storage',
        description: 'Control Drive connectivity, allocation limits, and asset routing.',
        badge: 'Storage'
    },

};



function updateSettingsPanel(tabId, overrides = {}) {
    const meta = SETTINGS_TAB_META[tabId] || SETTINGS_TAB_META.appearance;
    const eyebrow = document.getElementById('settings-panel-eyebrow');
    const title = document.getElementById('settings-panel-title');
    const description = document.getElementById('settings-panel-description');
    const badge = document.getElementById('settings-panel-badge');

    if (eyebrow) eyebrow.textContent = overrides.section || meta.section;
    if (title) title.textContent = overrides.title || meta.title;
    if (description) description.textContent = overrides.description || meta.description;
    if (badge) badge.textContent = overrides.badge || meta.badge;
}



window.switchSettingsTab = function (tabId) {
    const links = document.querySelectorAll('[data-settings-tab]');
    links.forEach(link => {
        const isActive = link.dataset.settingsTab === tabId;
        link.classList.toggle('active', isActive);
        link.classList.toggle('text-black', !isActive);
    });

    const views = document.querySelectorAll('[id^="set-view-"]');
    views.forEach(view => {
        view.classList.remove('hidden');
    });

    const target = document.getElementById(`set-view-${tabId}`);
    if (target) {
        const headerOffset = 100; // Account for fixed header + extra padding
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }

    updateSettingsPanel(tabId);
};

window.saveSettings = function () {
    const btn = document.querySelector('#settings-action-bar button:last-child');
    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Saving...';

    setTimeout(() => {
        btn.innerHTML = '<i class="fa-solid fa-check mr-2"></i> Settings Saved';
        btn.classList.replace('bg-[#123524]', 'bg-emerald-600');

        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = originalText;
            btn.classList.replace('bg-emerald-600', 'bg-[#123524]');
            alert('System settings have been updated successfully.');
        }, 1500);
    }, 1000);
};

window.saveSecuritySettings = function () {
    const btn = document.getElementById('security-save-btn');
    const icon = btn?.querySelector('i');
    if (btn) btn.disabled = true;
    if (icon) {
        icon.classList.remove('hidden');
        icon.style.display = 'inline-block';
    }

    const loginIdInput = document.getElementById('login-id-attempts');
    const passwordInput = document.getElementById('password-lockout-attempts');

    if (loginIdInput && passwordInput) {
        const config = {
            loginIdAttempts: parseInt(loginIdInput.value) || 3,
            passwordAttempts: parseInt(passwordInput.value) || 8
        };
        localStorage.setItem('sigma-login-security-config', JSON.stringify(config));

        setTimeout(() => {
            if (btn) btn.disabled = false;
            if (icon) icon.style.display = 'none';
            if (window.showToast) window.showToast('Security settings saved');
            else alert('Security settings saved');
        }, 800);
    }
};

window.loadLoginSecuritySettings = function () {
    const raw = localStorage.getItem('sigma-login-security-config');
    if (raw) {
        const config = JSON.parse(raw);
        const loginIdInput = document.getElementById('login-id-attempts');
        const passwordInput = document.getElementById('password-lockout-attempts');
        if (loginIdInput) loginIdInput.value = config.loginIdAttempts;
        if (passwordInput) passwordInput.value = config.passwordAttempts;
    }
};

window.resetSettings = function () {
    if (confirm('Are you sure you want to discard all unsaved changes?')) {
        location.reload();
    }
};

window.handleSliderUpload = function () {
    const count = document.querySelectorAll('#slider-manager-grid .group').length;
    if (count >= 7) {
        alert('Maximum of 7 slides allowed.');
        return;
    }
    alert('Image upload dialog would open here.');
};

window.removeSlide = function (btn) {
    const slide = btn.closest('.group');
    if (slide) {
        slide.remove();
        updateSliderCount();
    }
};

function updateSliderCount() {
    const count = document.querySelectorAll('#slider-manager-grid .group').length;
    const display = document.getElementById('slider-count');
    if (display) display.textContent = count;
}

document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link, .nav-sublink');
    const sections = document.querySelectorAll('.dynamic-section');
    const sidebar = document.getElementById('sidebar');
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const subSidebar = document.getElementById('sub-sidebar');
    const subSidebarTitle = document.getElementById('sub-sidebar-title');
    const subSidebarContent = document.getElementById('sub-sidebar-content');
    const headerBrandTitle = document.getElementById('header-brand-title');

    // Initialize logged-in user display in dropdown
    const authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
    const userProfile = JSON.parse(localStorage.getItem('sigma_user_profile') || '{}');
    // Merge: prioritize session data (the actual logged-in user) over the persistent institutional profile
    const loggedUser = { ...userProfile, ...authUser };
    const dropFName = document.getElementById('header-dropdown-firstName');
    const dropLName = document.getElementById('header-dropdown-lastName');
    if (dropFName) dropFName.textContent = loggedUser.firstName || 'Firstname';
    if (dropLName) dropLName.textContent = loggedUser.lastName || 'Lastname';

    // Welcome Banner
    const welcomeName = document.getElementById('welcome-user-firstName');
    if (welcomeName) welcomeName.textContent = loggedUser.firstName || 'Firstname';

    // Initialize logged-in user avatar in global locations
    const loggedInAvatar = loggedUser.avatar || '';
    const headerImg = document.getElementById('header-avatar-img');
    const headerPlaceholder = document.getElementById('header-avatar-placeholder');
    const sidebarImg = document.getElementById('sidebar-avatar-img');
    const sidebarPlaceholder = document.getElementById('sidebar-avatar-placeholder');

    if (headerImg && headerPlaceholder) {
        if (loggedInAvatar) {
            headerImg.src = loggedInAvatar;
            headerImg.classList.remove('hidden');
            headerPlaceholder.classList.add('hidden');
        } else {
            headerImg.src = '';
            headerImg.classList.add('hidden');
            headerPlaceholder.classList.remove('hidden');
        }
    }

    if (sidebarImg && sidebarPlaceholder) {
        if (loggedInAvatar) {
            sidebarImg.src = loggedInAvatar;
            sidebarImg.classList.remove('hidden');
            sidebarPlaceholder.classList.add('hidden');
        } else {
            sidebarImg.src = '';
            sidebarImg.classList.add('hidden');
            sidebarPlaceholder.classList.remove('hidden');
        }
    }

    const navSectionMap = {
        'nav-dashboard': 'dashboard-view',
        'nav-organizations': 'organization-registration-view',
        'nav-reports-ai': 'reports-ai-view',
        'nav-reports-attendance': 'reports-attendance-view',
        'nav-reports-performance': 'reports-performance-view',
        'nav-resources': 'resources-view',
        'nav-users': 'users-view',
        'nav-users-accounts': 'users-view',
        'nav-school-grades': 'school-grades-view',
        'nav-school-library': 'school-library-view',
        'nav-school-branch': 'branches-view',
        'nav-school-profile': 'school-profile-view',
        'nav-school-year': 'school-year-view',
        'nav-school-subjects': 'school-subjects-view',
        'nav-school-sections': 'school-sections-view',
        'nav-announcements': 'announcements-view',
        'nav-settings-preference': 'settings-view',
        'nav-profile-dropdown': 'user-profile-view',
        'nav-settings-api': 'settings-view',
        'nav-settings-security': 'settings-view',
        'nav-settings-storage': 'settings-view',
        'nav-audit-ai': 'audit-ai-view',
        'nav-audit-activity': 'audit-activity-view',
        'nav-audit-auth': 'audit-auth-view',

    };

    const schoolMgmtBtn = document.getElementById('nav-school-mgmt');
    const schoolMgmtSubmenu = document.getElementById('school-mgmt-submenu');
    const schoolMgmtChevron = document.getElementById('school-mgmt-chevron');
    const reportsBtn = document.getElementById('nav-reports');
    const reportsSubmenu = document.getElementById('reports-submenu');
    const reportsChevron = document.getElementById('reports-chevron');
    const settingsBtn = document.getElementById('nav-settings');
    const settingsSubmenu = document.getElementById('settings-submenu');
    const settingsChevron = document.getElementById('settings-chevron');


    // Handle Dropdown Toggles
    const notiToggle = document.getElementById('noti-toggle');
    const notiDropdown = document.getElementById('noti-dropdown');
    const profileToggle = document.getElementById('profile-toggle');
    const profileDropdown = document.getElementById('profile-dropdown');
    const calendarToggle = document.getElementById('calendar-toggle');
    const calendarDropdown = document.getElementById('calendar-dropdown');
    const sigmaAiNotch = document.getElementById('sigmaAiNotch');
    const sigmaAiPanel = document.getElementById('sigmaAiPanel');
    const sigmaAiMessages = document.getElementById('sigmaAiMessages');
    const sigmaAiInput = document.getElementById('sigmaAiInput');
    const sigmaAiSendBtn = document.getElementById('sigmaAiSendBtn');
    const sigmaAiCloseBtn = document.getElementById('sigmaAiCloseBtn');
    const sigmaAiAttachBtn = document.getElementById('sigmaAiAttachBtn');
    const sigmaAiAttachMenu = document.getElementById('sigmaAiAttachMenu');
    const sigmaAiFileInput = document.getElementById('sigmaAiFileInput');
    const sigmaAiPhotoInput = document.getElementById('sigmaAiPhotoInput');
    let sigmaAiWaiting = false;

    const syncHeaderToggleState = () => {
        if (notiToggle && notiDropdown) {
            notiToggle.classList.toggle('active', !notiDropdown.classList.contains('hidden'));
        }
        if (profileToggle && profileDropdown) {
            profileToggle.classList.toggle('active', !profileDropdown.classList.contains('hidden'));
        }
        if (calendarToggle && calendarDropdown) {
            calendarToggle.classList.toggle('active', !calendarDropdown.classList.contains('hidden'));
        }
    };

    let suppressNextHeaderClose = false;

    const setupDropdown = (btn, menu) => {
        if (!btn || !menu) return;
        btn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = !menu.classList.contains('hidden');
            hideHeaderOverlays(menu, btn, false);

            if (isOpen) {
                menu.classList.add('hidden');
                btn.classList.remove('active');
            } else {
                menu.classList.remove('hidden');
                btn.classList.add('active');
            }

            syncHeaderToggleState();
        });
        menu.addEventListener('click', e => e.stopPropagation());
    };

    setupDropdown(notiToggle, notiDropdown);
    setupDropdown(profileToggle, profileDropdown);
    setupDropdown(calendarToggle, calendarDropdown);

    let activeOverlayGroup = null;
    let manualSubSidebarDismiss = false;

    function hideSubSidebarOverlay() {
        activeOverlayGroup = null;
        if (subSidebar) {
            subSidebar.classList.remove('sub-sidebar-visible');
            subSidebar.classList.add('hidden');
        }
        if (subSidebarContent) {
            subSidebarContent.innerHTML = '';
        }
    }

    function getNavLabelText(navId) {
        const link = document.getElementById(navId);
        if (!link) return '';

        const fullLabel = link.querySelector('.full-label');
        if (fullLabel) {
            return fullLabel.textContent.trim();
        }

        const spanLabels = Array.from(link.querySelectorAll('span'))
            .map((span) => span.textContent.trim())
            .filter(Boolean);
        if (spanLabels.length) {
            return spanLabels[spanLabels.length - 1];
        }

        return link.textContent.trim();
    }


    function executeNavActionById(navId) {
        const link = document.getElementById(navId);
        if (!link) return;

        if (link.dataset.settingsTab) {
            groupStates.settings = true;
            switchTab(link.id);
            window.switchSettingsTab(link.dataset.settingsTab);
            return;
        }



        switchTab(link.id);
    }

    function renderSubSidebar(groupName) {
        const group = sidebarGroups[groupName];
        if (!group || !subSidebar || !subSidebarTitle || !subSidebarContent) {
            return;
        }

        subSidebarTitle.textContent = group.title;
        subSidebarContent.innerHTML = '';

        group.childIds.forEach((childId) => {
            const sourceLink = document.getElementById(childId);
            if (!sourceLink) return;

            const item = document.createElement('a');
            item.href = '#';
            item.className = 'sub-sidebar-link';
            if (currentNavId === childId) {
                item.classList.add('active');
            }

            const iconClass = sourceLink.querySelector('i')?.className || 'fa-solid fa-circle';
            const labelText = sourceLink.querySelector('span')?.textContent?.trim() || sourceLink.textContent.trim();
            item.innerHTML = `<i class="${iconClass}"></i><span>${escapeHtml(labelText)}</span>`;

            item.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation(); // Keep sub-sidebar open
                executeNavActionById(childId);
                renderSubSidebar(groupName);
            });

            subSidebarContent.appendChild(item);
        });

        subSidebar.classList.remove('hidden');
        subSidebar.classList.add('sub-sidebar-visible');
        activeOverlayGroup = groupName;
    }

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
        const isHeaderOverlayClick = [notiDropdown, profileDropdown, calendarDropdown].some(d => d && d.contains(e.target));
        const isHeaderToggleClick = [notiToggle, profileToggle, calendarToggle].some(t => t && t.contains(e.target));
        const isAiClick = [sigmaAiPanel, sigmaAiNotch].some(el => el && el.contains(e.target));

        if (!isHeaderOverlayClick && !isHeaderToggleClick && !isAiClick) {
            hideHeaderOverlays();
        }

        if (
            document.body.classList.contains('sidebar-collapsed') &&
            subSidebar &&
            !subSidebar.contains(e.target) &&
            sidebar &&
            !sidebar.contains(e.target) &&
            sidebarToggleBtn &&
            !sidebarToggleBtn.contains(e.target)
        ) {
            hideSubSidebarOverlay();
        }

        syncHeaderToggleState();
    });

    syncHeaderToggleState();

    if (sidebarToggleBtn && sidebar) {
        sidebarToggleBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation(); // Prevent document click listener from hiding it immediately
            const isCollapsed = document.body.classList.toggle('sidebar-collapsed');

            // Visual feedback for burger removed as per user request

            if (!isCollapsed) {
                // Expanding: always hide overlay
                hideSubSidebarOverlay();
                manualSubSidebarDismiss = false;
            } else {
                // Collapsing: ensure we reset dismiss flag so Priority 2 logic in syncSidebarGroups() works
                manualSubSidebarDismiss = false;
                activeOverlayGroup = null;
            }

            syncSidebarGroups();
        });
    }

    const WELCOME_MSG = `Hello, <strong>User!</strong> I'm <span class="font-black">SIGMA</span>, your system AI. What do you need today?`;

    let isDragging = false;
    let startX = 0;
    let startRight = 0;
    let wasDragged = false;

    const SIGMA_AI_MAX_FILE_SIZE = 20 * 1024 * 1024;
    const SIGMA_AI_MAX_IMAGE_SIZE = 10 * 1024 * 1024;
    const SIGMA_AI_ALLOWED_DOC_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'csv', 'txt', 'rtf', 'odt', 'ods', 'odp']);
    const SIGMA_AI_ALLOWED_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp']);
    const sigmaAiTimestampFormatter = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });

    function getSigmaAiTimestamp() {
        return sigmaAiTimestampFormatter.format(new Date());
    }

    function formatSigmaAiFileSize(bytes) {
        if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        if (bytes >= 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
        return `${bytes} B`;
    }

    function getSigmaAiFileExtension(fileName) {
        const parts = String(fileName || '').toLowerCase().split('.');
        return parts.length > 1 ? parts.pop() : '';
    }

    function getSigmaAiFileKindLabel(file, isPhotoUpload) {
        const ext = getSigmaAiFileExtension(file.name);
        if (isPhotoUpload) return `${ext ? ext.toUpperCase() : 'IMAGE'} image`;
        return ext ? `${ext.toUpperCase()} file` : 'Document file';
    }

    function updateSigmaAiMessage(messageEl, content) {
        const bubble = messageEl?.querySelector('.sigma-ai-message__bubble');
        if (bubble) bubble.innerHTML = content;
    }

    function addAiMessage(content, isUser = false) {
        if (!sigmaAiMessages) return;
        const msg = document.createElement('div');
        msg.className = `sigma-ai-message ${isUser ? 'sigma-ai-message--user' : ''}`;
        const stamp = getSigmaAiTimestamp();
        msg.innerHTML = `${!isUser ? `<div class="sigma-ai-message__icon"><i class="fa-solid fa-bolt text-[10px]"></i></div>` : ''}<div class="sigma-ai-message__stack"><div class="sigma-ai-message__meta">${stamp}</div><div class="sigma-ai-message__bubble ${isUser ? 'sigma-ai-message__bubble--user' : 'sigma-ai-message__bubble--assistant'}">${content}</div></div>`;
        sigmaAiMessages.appendChild(msg);
        sigmaAiMessages.scrollTop = sigmaAiMessages.scrollHeight;
        return msg;
    }

    function showSigmaAiUploads(files, sourceLabel, isPhotoUpload = false) {
        const sizeLimit = isPhotoUpload ? SIGMA_AI_MAX_IMAGE_SIZE : SIGMA_AI_MAX_FILE_SIZE;
        const allowedSet = isPhotoUpload ? SIGMA_AI_ALLOWED_IMAGE_EXTENSIONS : SIGMA_AI_ALLOWED_DOC_EXTENSIONS;
        const validFiles = [];
        const invalidFiles = [];
        const oversizedFiles = [];

        files.forEach(file => {
            const ext = getSigmaAiFileExtension(file.name);
            if (!allowedSet.has(ext)) {
                invalidFiles.push(file);
                return;
            }
            if (file.size > sizeLimit) {
                oversizedFiles.push(file);
                return;
            }
            validFiles.push(file);
        });

        if (validFiles.length) {
            const uploadLines = validFiles
                .map(file => `• ${escapeSigmaAiText(file.name)} (${getSigmaAiFileKindLabel(file, isPhotoUpload)} • ${formatSigmaAiFileSize(file.size)})`)
                .join('\n');
            addAiMessage(`${sourceLabel}\n${uploadLines}`, true);

            const loadingMessage = addAiMessage(`Reading uploaded ${validFiles.length > 1 ? 'files' : 'file'}...`, false);
            setTimeout(() => {
                updateSigmaAiMessage(
                    loadingMessage,
                    `Upload ready for future AI reading.\n${uploadLines}`
                );
            }, 700);
        }

        if (invalidFiles.length) {
            const failedLines = invalidFiles
                .map(file => `• ${escapeSigmaAiText(file.name)}`)
                .join('\n');
            addAiMessage(
                `Upload failed. Supported ${isPhotoUpload ? 'images' : 'documents'} only.\n${failedLines}`,
                false
            );
        }

        if (oversizedFiles.length) {
            const failedLines = oversizedFiles
                .map(file => `• ${escapeSigmaAiText(file.name)} (${formatSigmaAiFileSize(file.size)})`)
                .join('\n');
            addAiMessage(
                `Upload failed. Each ${isPhotoUpload ? 'image' : 'document'} must be ${isPhotoUpload ? '10 MB' : '20 MB'} or smaller.\n${failedLines}`,
                false
            );
        }
    }

    function closeAiAttachMenu() {
        if (sigmaAiAttachMenu) sigmaAiAttachMenu.classList.add('hidden');
    }

    function setSigmaAiWaiting(waiting) {
        sigmaAiWaiting = waiting;
        if (sigmaAiSendBtn) {
            sigmaAiSendBtn.disabled = waiting;
            sigmaAiSendBtn.classList.toggle('is-loading', waiting);
        }
    }

    function openAiPanel() {
        if (!sigmaAiPanel || !sigmaAiNotch) return;
        sigmaAiPanel.classList.add('open');
        sigmaAiNotch.classList.add('open');
        sessionStorage.setItem('sigmaPanelOpen', 'true');
    }

    function closeAiPanel() {
        if (!sigmaAiPanel || !sigmaAiNotch) return;
        sigmaAiPanel.classList.remove('open');
        sigmaAiNotch.classList.remove('open');
        closeAiAttachMenu();
        sessionStorage.setItem('sigmaPanelOpen', 'false');
    }

    function hideHeaderOverlays(exceptMenu = null, exceptButton = null, keepAiOpen = false) {
        document.querySelectorAll('.header-panel').forEach(panel => {
            if (panel !== exceptMenu) panel.classList.add('hidden');
        });
        document.querySelectorAll('.relative button').forEach(button => {
            if (button !== exceptButton) button.classList.remove('active');
        });
        if (!keepAiOpen) closeAiPanel();
    }

    function handleNotchInteraction(e) {
        if (!sigmaAiPanel || !sigmaAiNotch) return;
        hideHeaderOverlays(null, null, true);
        e.preventDefault();
        isDragging = true;
        wasDragged = false;
        startX = e.clientX;
        startRight = parseInt(window.getComputedStyle(sigmaAiPanel).right, 10);

        sigmaAiPanel.classList.add('dragging');
        sigmaAiNotch.classList.add('dragging');

        document.onmousemove = (moveEvent) => {
            if (!isDragging) return;
            wasDragged = true;
            const deltaX = moveEvent.clientX - startX;
            let newRight = startRight - deltaX;

            if (newRight > 0) newRight = 0;
            if (newRight < -400) newRight = -400;

            sigmaAiPanel.style.right = `${newRight}px`;
            sigmaAiNotch.style.right = `${newRight + 400}px`;
        };

        document.onmouseup = () => {
            isDragging = false;
            sigmaAiPanel.classList.remove('dragging');
            sigmaAiNotch.classList.remove('dragging');
            sigmaAiPanel.style.right = '';
            sigmaAiNotch.style.right = '';
            document.onmousemove = null;
            document.onmouseup = null;

            const currentRight = parseInt(window.getComputedStyle(sigmaAiPanel).right, 10);

            if (wasDragged) {
                if (currentRight > -200) {
                    openAiPanel();
                } else {
                    closeAiPanel();
                }
            } else {
                sigmaAiPanel.classList.contains('open') ? closeAiPanel() : openAiPanel();
            }
        };
    }

    if (sigmaAiNotch) sigmaAiNotch.addEventListener('mousedown', handleNotchInteraction);

    document.querySelectorAll('.sigma-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            addAiMessage(chip.textContent.trim(), true);
            setTimeout(() => addAiMessage('Full AI integration coming soon!', false), 600);
        });
    });

    if (sigmaAiAttachBtn && sigmaAiAttachMenu) {
        sigmaAiAttachBtn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            sigmaAiAttachMenu.classList.toggle('hidden');
        });
    }

    if (sigmaAiAttachMenu) {
        sigmaAiAttachMenu.addEventListener('click', e => {
            const option = e.target.closest('.sigma-ai-attach-option');
            if (!option) return;
            closeAiAttachMenu();
            document.getElementById(option.dataset.attachTarget)?.click();
        });
    }

    // ─── Calendar Dropdown Logic ───────────────────────────────
    let currentCalDate = new Date();

    function renderCalendar() {
        const monthYearLabel = document.getElementById('calendarDropdownMonthYear');
        const daysGrid = document.getElementById('calendarDropdownDaysGrid');
        if (!monthYearLabel || !daysGrid) return;

        const year = currentCalDate.getFullYear();
        const month = currentCalDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        monthYearLabel.textContent = currentCalDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        let html = '';
        // Padding for first day
        for (let i = 0; i < firstDay; i++) {
            html += '<div></div>';
        }

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const baseClasses = "w-9 h-9 flex items-center justify-center text-[12px] font-bold transition-all cursor-pointer rounded-full mx-auto";
            const stateClasses = isToday
                ? "bg-[#15803d] text-white"
                : "text-black hover:bg-slate-100";

            html += `<div class="${baseClasses} ${stateClasses}">${day}</div>`;
        }

        daysGrid.innerHTML = html;
    }

    const prevMonthBtn = document.getElementById('calendarDropdownPrevMonthBtn');
    const nextMonthBtn = document.getElementById('calendarDropdownNextMonthBtn');

    if (prevMonthBtn) {
        prevMonthBtn.onclick = (e) => {
            e.stopPropagation();
            currentCalDate.setMonth(currentCalDate.getMonth() - 1);
            renderCalendar();
        };
    }

    if (nextMonthBtn) {
        nextMonthBtn.onclick = (e) => {
            e.stopPropagation();
            currentCalDate.setMonth(currentCalDate.getMonth() + 1);
            renderCalendar();
        };
    }

    // Initial render
    renderCalendar();

    [sigmaAiFileInput, sigmaAiPhotoInput].forEach(input => {
        if (!input) return;
        input.addEventListener('change', () => {
            closeAiAttachMenu();
            const files = Array.from(input.files || []);
            if (files.length) {
                const isPhotoUpload = input === sigmaAiPhotoInput;
                const sourceLabel = isPhotoUpload ? 'Uploaded photo' : 'Uploaded file';
                showSigmaAiUploads(files, sourceLabel, isPhotoUpload);
            }
            input.value = '';
        });
    });

    document.addEventListener('click', e => {
        if (!sigmaAiAttachMenu || sigmaAiAttachMenu.classList.contains('hidden')) return;
        if (sigmaAiAttachMenu.contains(e.target) || sigmaAiAttachBtn?.contains(e.target)) return;
        closeAiAttachMenu();
    });

    function sendAiMessage() {
        if (sigmaAiWaiting) return;
        const v = sigmaAiInput?.value.trim();
        if (!v) return;
        closeAiAttachMenu();
        addAiMessage(v, true);
        sigmaAiInput.value = '';
        sigmaAiInput.style.height = 'auto';
        setSigmaAiWaiting(true);
        setTimeout(() => {
            addAiMessage('Wireframe mode — Gemini AI coming next semester.', false);
            setSigmaAiWaiting(false);
        }, 600);
    }

    if (sigmaAiSendBtn) sigmaAiSendBtn.addEventListener('click', sendAiMessage);
    if (sigmaAiCloseBtn) sigmaAiCloseBtn.addEventListener('click', closeAiPanel);
    if (sigmaAiInput) {
        sigmaAiInput.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
        sigmaAiInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendAiMessage();
            }
        });
    }

    const isFirstVisit = sessionStorage.getItem('sigmaFirstVisit') !== 'true';
    const panelWasOpen = sessionStorage.getItem('sigmaPanelOpen') === 'true';

    if (isFirstVisit) {
        sessionStorage.setItem('sigmaFirstVisit', 'true');
        setTimeout(() => {
            // openAiPanel(); // Disabled auto-open on login
            addAiMessage(WELCOME_MSG, false);
        }, 900);
    } else {
        addAiMessage(WELCOME_MSG, false);
    }

    if (panelWasOpen) openAiPanel();

    // Final Reset
    if (notiDropdown) notiDropdown.classList.add('hidden');
    if (profileDropdown) profileDropdown.classList.add('hidden');

    // Ensure sidebar state is synced on initialization
    setTimeout(() => {
        if (typeof syncSidebarGroups === 'function') {
            syncSidebarGroups();
        }
    }, 100);

    let currentNavId = 'nav-dashboard';
    const groupStates = {
        users: false,
        reports: false,
        settings: false,
        'audit-logs': false
    };
    const sidebarGroups = {
        'school-mgmt': {
            button: schoolMgmtBtn, submenu: schoolMgmtSubmenu, chevron: schoolMgmtChevron,
            title: 'School Management',
            childIds: ['nav-school-branch', 'nav-school-profile', 'nav-school-year', 'nav-school-sections', 'nav-school-subjects']
        },
        'reports': {
            button: reportsBtn, submenu: reportsSubmenu, chevron: reportsChevron,
            title: 'Reports',
            childIds: ['nav-reports-ai', 'nav-reports-attendance', 'nav-reports-performance']
        },
        'settings': {
            button: settingsBtn, submenu: settingsSubmenu, chevron: settingsChevron,
            title: 'System Settings',
            childIds: ['nav-settings-security', 'nav-settings-preference', 'nav-settings-storage', 'nav-settings-api']
        },
        'audit-logs': {
            button: document.getElementById('nav-audit-logs'),
            submenu: document.getElementById('audit-logs-submenu'),
            chevron: document.getElementById('audit-logs-chevron'),
            title: 'Audit Logs',
            childIds: ['nav-audit-ai', 'nav-audit-activity', 'nav-audit-auth']
        },

    };

    function getGroupIdForNav(navId) {
        for (const [groupId, group] of Object.entries(sidebarGroups)) {
            if (group.childIds && group.childIds.includes(navId)) {
                return groupId;
            }
        }
        return null;
    }

    function getParentTitleForNav(navId) {
        if (navId === 'nav-dashboard') {
            return 'HOME';
        }

        const groupId = getGroupIdForNav(navId);
        if (groupId && sidebarGroups[groupId]?.button) {
            return getNavLabelText(sidebarGroups[groupId].button.id);
        }

        return getNavLabelText(navId);
    }


    function resetOtherGroups(activeName) {
        Object.keys(groupStates).forEach((key) => {
            if (key !== activeName) {
                groupStates[key] = false;
            }
        });
    }

    function clearAllGroups() {
        Object.keys(groupStates).forEach((key) => {
            groupStates[key] = false;
        });
    }

    function getActiveParentId() {
        const groupId = getGroupIdForNav(currentNavId);
        const group = groupId ? sidebarGroups[groupId] : null;

        // If it's a standalone link or a group with no button
        if (!groupId || !group?.button) {
            return currentNavId;
        }

        return group.button.id;
    }

    function syncSidebarGroups() {
        const isSidebarCollapsed = document.body.classList.contains('sidebar-collapsed');
        const activeParentId = getActiveParentId();

        // 1. Handle Sidebar Groups (Expand/Collapse states)
        Object.entries(sidebarGroups).forEach(([name, group]) => {
            if (!group.button || !group.submenu || !group.chevron) return;
            const shouldOpen = groupStates[name];
            group.submenu.classList.toggle('hidden', isSidebarCollapsed || !shouldOpen);
            group.chevron.classList.toggle('rotate-90', shouldOpen);
        });

        // 2. Dual Highlight Logic (Parent + Child)
        navLinks.forEach(link => {
            const isTargetChild = link.id === currentNavId;
            const isTargetParent = link.id === activeParentId;

            // Highlight if it's the specific child OR the active parent
            link.classList.toggle('active', isTargetChild || isTargetParent);

            // Ensure standalone links (like Home) are always visible and not hidden by group logic
            if (!getGroupIdForNav(link.id)) {
                link.classList.remove('hidden');
            }
        });

        const activeGroupId = getGroupIdForNav(currentNavId);

        if (!isSidebarCollapsed) {
            hideSubSidebarOverlay();
            manualSubSidebarDismiss = false;
        } else {
            // We are in Icon Mode (Collapsed)
            // Priority 1: If there is an active overlay group (via hover or click), show it
            if (activeOverlayGroup) {
                renderSubSidebar(activeOverlayGroup);
            }
            // Priority 2: In Hover mode, we don't force it open based on the active page.
            // Hide if no overlay is active.
            else {
                hideSubSidebarOverlay();
            }
        }

        // Burger icon active state sync removed as per user request
    }

    function bindGroupToggle(name, onOpen = null) {
        const group = sidebarGroups[name];
        if (!group?.button) {
            return;
        }

        group.button.addEventListener('click', (event) => {
            // Force focus and trigger overlay
            event.preventDefault();
            event.stopPropagation();

            console.log(`[Sidebar] Group Clicked: ${name}`);

            if (document.body.classList.contains('sidebar-collapsed')) {
                const isSidebarVisible = subSidebar && !subSidebar.classList.contains('hidden');
                const isCurrentlyShown = (activeOverlayGroup === name) || (!activeOverlayGroup && getGroupIdForNav(currentNavId) === name && isSidebarVisible);

                resetOtherGroups(name);

                if (isCurrentlyShown) {
                    hideSubSidebarOverlay();
                    manualSubSidebarDismiss = true;
                } else {
                    manualSubSidebarDismiss = false;
                    renderSubSidebar(name);
                }
                syncSidebarGroups();
                return;
            }

            // Normal Toggle logic
            const wasOpen = groupStates[name];
            resetOtherGroups(name);
            groupStates[name] = !wasOpen;

            if (groupStates[name] && typeof onOpen === 'function') {
                onOpen();
            }
            syncSidebarGroups();
        });

        // Hover mode behavior
        group.button.addEventListener('mouseenter', () => {
            if (document.body.classList.contains('sidebar-collapsed')) {
                // Preview this group
                manualSubSidebarDismiss = false;
                renderSubSidebar(name);
                syncSidebarGroups();
            }
        });
    }

    bindGroupToggle('school-mgmt');
    bindGroupToggle('users');
    bindGroupToggle('reports');
    bindGroupToggle('settings');
    bindGroupToggle('audit-logs');
    window.loadLoginSecuritySettings();

    window.updateNavState = function (navId) {
        currentNavId = navId;
        const currentGroupId = getGroupIdForNav(navId);

        if (currentGroupId) {
            groupStates[currentGroupId] = true;
        } else {
            clearAllGroups();
            hideSubSidebarOverlay();
        }

        // Reset manual dismissal when navigating to a new section
        manualSubSidebarDismiss = false;

        syncSidebarGroups();
    }


    let hoverResetTimer = null;

    if (sidebar) {
        sidebar.addEventListener('mouseleave', () => {
            if (document.body.classList.contains('sidebar-collapsed')) {
                hoverResetTimer = setTimeout(() => {
                    activeOverlayGroup = null;
                    syncSidebarGroups();
                }, 150);
            }
        });
        sidebar.addEventListener('mouseenter', () => {
            if (hoverResetTimer) clearTimeout(hoverResetTimer);
        });
    }

    if (subSidebar) {
        subSidebar.addEventListener('mouseenter', () => {
            if (hoverResetTimer) clearTimeout(hoverResetTimer);
        });
        subSidebar.addEventListener('mouseleave', (e) => {
            if (document.body.classList.contains('sidebar-collapsed')) {
                // If moving back to sidebar, don't hide immediately
                if (sidebar && sidebar.contains(e.relatedTarget)) return;

                activeOverlayGroup = null;
                syncSidebarGroups();
            }
        });
    }
    const announcementForm = document.getElementById('announcement-form');
    const typeButtons = document.querySelectorAll('[data-announcement-type]');
    const announcementActivePosts = document.getElementById('announcement-active-posts');

    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            setAnnouncementType(btn.dataset.announcementType);
        });
    });

    announcementForm?.addEventListener('submit', event => {
        event.preventDefault();
        const titleInput = document.getElementById('announcement-title-input');
        const bodyInput = document.getElementById('announcement-body-input');
        const audienceSelect = document.getElementById('announcement-audience-select');
        const submitBtn = document.getElementById('announcement-submit-btn');

        const title = titleInput?.value.trim() || '';
        const body = bodyInput?.value.trim() || '';
        const audience = audienceSelect?.value || 'all';

        if (!title || !body) return;

        const posts = loadAdminAnnouncements();
        posts.unshift({
            id: `admin-${Date.now()}`,
            title,
            body,
            audience,
            type: activeAnnouncementType,
            author: 'Admin Office',
            createdAt: new Date().toISOString()
        });
        saveAdminAnnouncements(posts.slice(0, 25));

        titleInput.value = '';
        bodyInput.value = '';
        setAnnouncementType('regular');
        renderAnnouncementActivePosts();

        if (submitBtn) {
            const original = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fa-solid fa-check mr-2"></i> Posted';
            submitBtn.classList.add('bg-emerald-500', 'shadow-emerald-500/20');
            setTimeout(() => {
                submitBtn.innerHTML = original;
                submitBtn.classList.remove('bg-emerald-500', 'shadow-emerald-500/20');
            }, 1800);
        }
    });

    announcementActivePosts?.addEventListener('click', event => {
        const button = event.target.closest('[data-announcement-delete]');
        if (!button) return;
        const postId = button.dataset.announcementDelete;
        if (!postId) return;

        // Use a simple confirm for now since openConfirmPanel might not be defined in admin.js
        if (confirm('Remove this announcement from all feeds?')) {
            const filtered = loadAdminAnnouncements().filter(post => post.id !== postId);
            saveAdminAnnouncements(filtered);
            renderAnnouncementActivePosts();
        }
    });

    window.showSection = function (sectionId, navId) {
        updateNavState(navId);

        sections.forEach((section) => {
            section.classList.add('hidden');
        });

        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            // Reset page residue (clear search inputs and filters)
            const inputs = targetSection.querySelectorAll('input:not([readonly])');
            inputs.forEach(input => {
                if (input.type === 'text' || input.type === 'search') input.value = '';
            });
            const selects = targetSection.querySelectorAll('select');
            selects.forEach(select => select.selectedIndex = 0);

            targetSection.classList.remove('hidden');
        }

        // Reset specific search states
        if (sectionId === 'users-view') {
            window.userAccountSearchState = { id: '', name: '', role: '', status: '' };
        }
        if (sectionId === 'school-subjects-view') {
            window.subjectSearchState = { code: '', name: '', type: '' };
        }
        if (sectionId === 'school-sections-view') {
            window.sectionSearchState = { name: '', room: '', grade: '' };
        }



        // Restore original brand header if leaving user-profile-view
        if (sectionId !== 'user-profile-view') {
            const brandHeader = document.getElementById('header-brand-title');
            if (brandHeader) {
                brandHeader.textContent = 'Interface Computer College';
            }
        }

        if (sectionId === 'announcements-view') {
            renderAnnouncementActivePosts();
        }

        if (sectionId === 'users-view') {
            bindUserAccountSearch();
            renderUserAccountsTable();
        }

        if (sectionId === 'school-subjects-view') {
            bindSubjectSearch();
            renderSubjectsTable();
        }

        if (sectionId === 'school-sections-view') {
            bindSectionSearch();
            renderSectionsTable();
        }


        if (headerBrandTitle) {
            if (navId === 'nav-dashboard') {
                headerBrandTitle.textContent = 'Interface Computer College';
            } else {
                const parentTitle = getParentTitleForNav(navId);
                headerBrandTitle.textContent = parentTitle || 'Home';
            }
            headerBrandTitle.style.fontWeight = '700';
            headerBrandTitle.style.letterSpacing = '-0.01em';
            headerBrandTitle.style.textTransform = 'none';
        }

        if (sectionId === 'logs-view') {
            const logsContainer = document.getElementById('logs-terminal');
            if (logsContainer) {
                logsContainer.scrollTop = logsContainer.scrollHeight;
            }
        }

        const adminMain = document.getElementById('admin-main');
        if (adminMain) {
            adminMain.scrollTop = 0;
        }
    };

    window.switchTab = function (tabId, skipHashUpdate = false) {
        let sectionId;

        if (tabId === 'nav-users-accounts') sectionId = 'users-view';
        else if (tabId === 'nav-school-profile') sectionId = 'school-profile-view';
        else if (tabId === 'nav-school-year') sectionId = 'school-year-view';
        else if (tabId.startsWith('nav-settings-')) sectionId = 'settings-view';
        else sectionId = tabId.replace('nav-', '') + '-view';

        hideHeaderOverlays();
        window.showSection(sectionId, tabId);

        if (!skipHashUpdate) {
            window.location.hash = tabId;
        }
    };

    switchTabHandler = window.switchTab;

    let branchRecords = [
        {
            name: "Interface Computer College Caloocan",
            street: "10th Avenue corner Rizal Avenue Extension",
            barangay: "Grace Park West",
            city: "Caloocan City",
            region: "NCR",
            zip: "1406",
            contact: "09947669267",
            email: "information@interface.edu.ph"
        }
    ];
    let editingBranchIndex = -1;
    let initialBranchValues = {};

    window.getSchoolBranchOptions = function () {
        return branchRecords.map((branch, index) => ({
            name: String(branch?.name || '').trim(),
            code: String(index + 1).padStart(2, '0')
        })).filter(branch => branch.name);
    };

    window.getDefaultSchoolBranch = function () {
        return branchRecords[0] ? { ...branchRecords[0], code: '01' } : { name: '', code: '01' };
    };

    window.getSchoolBranchCode = function (branchName) {
        const matchedBranch = window.getSchoolBranchOptions().find((branch) => branch.name === String(branchName || '').trim());
        return matchedBranch?.code || window.getDefaultSchoolBranch().code;
    };

    window.populateUserSchoolBranchSelect = function (selectedBranchName = '') {
        const branchSelect = document.getElementById('edit-user-school-branch');
        if (!branchSelect) return;

        const branchOptions = window.getSchoolBranchOptions();
        const fallbackBranch = window.getDefaultSchoolBranch().name;
        const resolvedBranch = branchOptions.some((branch) => branch.name === selectedBranchName)
            ? selectedBranchName
            : fallbackBranch;

        branchSelect.innerHTML = branchOptions
            .map((branch) => `<option value="${escapeHtml(branch.name)}">${escapeHtml(branch.name)}</option>`)
            .join('');
        branchSelect.value = resolvedBranch;
        branchSelect.disabled = branchOptions.length <= 1;
        branchSelect.classList.toggle('cursor-not-allowed', branchOptions.length <= 1);
        branchSelect.classList.toggle('bg-slate-100', branchOptions.length <= 1);
        branchSelect.classList.toggle('text-black/70', branchOptions.length <= 1);
        branchSelect.classList.toggle('cursor-pointer', branchOptions.length > 1);
        branchSelect.classList.toggle('bg-slate-50', branchOptions.length > 1);
        branchSelect.classList.toggle('text-black', branchOptions.length > 1);
    };

    window.syncManagedUsersToSchoolBranch = function () {
        const users = getStoredJson(USER_STORAGE_KEY, []);
        if (!Array.isArray(users) || users.length === 0) return;

        const branchOptions = window.getSchoolBranchOptions();
        const defaultBranch = branchOptions[0];
        if (!defaultBranch) return;

        let didUpdate = false;
        const nextUsers = users.map((user) => {
            if (!user || user.createdVia !== 'admin-panel') {
                return user;
            }

            const currentBranch = String(user.schoolBranch || '').trim();
            const nextBranchName = branchOptions.length === 1
                ? defaultBranch.name
                : (branchOptions.some((branch) => branch.name === currentBranch) ? currentBranch : defaultBranch.name);
            const nextBranchCode = window.getSchoolBranchCode(nextBranchName);

            if (currentBranch === nextBranchName && String(user.branchCode || '') === nextBranchCode) {
                return user;
            }

            didUpdate = true;
            return {
                ...user,
                schoolBranch: nextBranchName,
                branchCode: nextBranchCode
            };
        });

        if (didUpdate) {
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUsers));
        }
    };

    window.renderBranchTable = function () {
        const tableBody = document.getElementById('branchTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        branchRecords.forEach((branch, index) => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-slate-50 transition-colors group';
            row.innerHTML = `
                <td class="px-10 py-6 text-center">
                    <button onclick="window.openBranchEditor(${index})" 
                        class="text-sm font-medium text-black text-center hover:text-[#FFD000] transition-colors cursor-pointer outline-none">
                        ${branch.name}
                    </button>
                </td>
                <td class="px-10 py-6 text-center">
                    <div class="text-sm font-medium text-black text-center">${branch.city}</div>
                </td>
                <td class="px-10 py-6 text-center">
                    <div class="flex justify-center">
                        <button onclick="window.openBranchEditor(${index})"
                            class="w-10 h-10 rounded-full flex items-center justify-center text-black hover:text-[#FFD000] transition-colors"
                            title="Edit Branch">
                            <i class="fa-regular fa-pen-to-square text-lg"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Add placeholders for striped effect
        for (let i = branchRecords.length; i < 8; i++) {
            const row = document.createElement('tr');
            row.className = 'h-16';
            row.innerHTML = '<td></td><td></td><td></td>';
            tableBody.appendChild(row);
        }
    };

    window.openBranchEditor = function (index) {
        editingBranchIndex = index;
        const titleEl = document.getElementById('branch-editor-title');
        const saveLabel = document.getElementById('branch-save-label');

        if (titleEl) titleEl.textContent = 'Edit Branch';
        if (saveLabel) saveLabel.textContent = 'Save Changes';

        const branch = branchRecords[index];
        document.getElementById('edit-branch-name').value = branch.name;
        document.getElementById('edit-branch-street').value = branch.street;
        document.getElementById('edit-branch-barangay').value = branch.barangay;
        document.getElementById('edit-branch-city').value = branch.city;
        document.getElementById('edit-branch-region').value = branch.region;
        document.getElementById('edit-branch-zip').value = branch.zip;
        document.getElementById('edit-branch-contact').value = branch.contact;
        document.getElementById('edit-branch-email').value = branch.email;

        window.toggleBranchOverlay(true);
    };

    window.toggleBranchOverlay = function (show) {
        const overlay = document.getElementById('branch-edit-overlay');
        if (!overlay) return;

        if (show) {
            document.body.classList.add('branch-edit-mode');
            overlay.classList.remove('hidden');
            overlay.scrollTop = 0;
            // Capture initial values to detect changes
            initialBranchValues = {
                name: document.getElementById('edit-branch-name').value,
                street: document.getElementById('edit-branch-street').value,
                barangay: document.getElementById('edit-branch-barangay').value,
                city: document.getElementById('edit-branch-city').value,
                region: document.getElementById('edit-branch-region').value,
                zip: document.getElementById('edit-branch-zip').value,
                contact: document.getElementById('edit-branch-contact').value,
                email: document.getElementById('edit-branch-email').value
            };
        } else {
            overlay.classList.add('hidden');
            overlay.scrollTop = 0;
            document.body.classList.remove('branch-edit-mode');
        }
    };

    window.hasBranchChanges = function () {
        const currentValues = {
            name: document.getElementById('edit-branch-name').value,
            street: document.getElementById('edit-branch-street').value,
            barangay: document.getElementById('edit-branch-barangay').value,
            city: document.getElementById('edit-branch-city').value,
            region: document.getElementById('edit-branch-region').value,
            zip: document.getElementById('edit-branch-zip').value,
            contact: document.getElementById('edit-branch-contact').value,
            email: document.getElementById('edit-branch-email').value
        };
        // Simple string comparison for equality
        return JSON.stringify(initialBranchValues) !== JSON.stringify(currentValues);
    };

    window.showBranchConfirm = function (title, desc, onProceed) {
        const overlay = document.getElementById('branch-confirm-overlay');
        const titleEl = document.getElementById('branch-confirm-title');
        const descEl = document.getElementById('branch-confirm-desc');
        const cancelBtn = document.getElementById('branch-confirm-cancel');
        const proceedBtn = document.getElementById('branch-confirm-proceed');

        if (!overlay || !titleEl || !descEl || !cancelBtn || !proceedBtn) return;

        titleEl.textContent = title;
        descEl.textContent = desc;
        overlay.classList.remove('hidden');

        const close = () => overlay.classList.add('hidden');

        cancelBtn.onclick = close;
        proceedBtn.onclick = () => {
            onProceed();
            close();
        };
    };

    window.handleBranchExit = function () {
        if (window.hasBranchChanges()) {
            window.showBranchConfirm(
                'Discard Changes?',
                'You have unsaved modifications. Are you sure you want to exit and discard all changes?',
                () => window.toggleBranchOverlay(false)
            );
        } else {
            window.toggleBranchOverlay(false);
        }
    };

    window.handleBranchDiscard = window.handleBranchExit;

    window.handleBranchSave = function () {
        const name = document.getElementById('edit-branch-name').value.trim();
        const city = document.getElementById('edit-branch-city').value.trim();

        if (!name || !city) {
            alert('Branch Name and City are required.');
            return;
        }

        window.showBranchConfirm(
            'Save Changes?',
            'Are you sure you want to apply these updates to the branch profile?',
            () => {
                const saveBtn = document.getElementById('branch-save-btn');
                const loading = document.getElementById('branch-save-loading');

                if (saveBtn && loading) {
                    saveBtn.disabled = true;
                    loading.classList.remove('hidden');

                    // Simulate API Call
                    setTimeout(() => {
                        const branchData = {
                            name: name,
                            street: document.getElementById('edit-branch-street').value.trim(),
                            barangay: document.getElementById('edit-branch-barangay').value.trim(),
                            city: city,
                            region: document.getElementById('edit-branch-region').value.trim(),
                            zip: document.getElementById('edit-branch-zip').value.trim(),
                            contact: document.getElementById('edit-branch-contact').value.trim(),
                            email: document.getElementById('edit-branch-email').value.trim()
                        };

                        branchRecords[editingBranchIndex] = branchData;
                        window.syncManagedUsersToSchoolBranch();

                        saveBtn.disabled = false;
                        loading.classList.add('hidden');
                        window.renderBranchTable();
                        syncProfileDisplay();
                        window.toggleBranchOverlay(false);
                    }, 800);
                }
            }
        );
    };

    // Initial render
    window.renderBranchTable();
    window.syncManagedUsersToSchoolBranch();

    window.switchSettingsTab = function (tabName) {
        const targetView = document.getElementById(`set-view-${tabName}`);
        const brandHeader = document.getElementById('header-brand-title');
        const navLink = document.querySelector(`[data-settings-tab="${tabName}"]`);

        if (targetView) {
            // Update the brand header with the specific settings title
            if (brandHeader && navLink) {
                const tabTitle = navLink.querySelector('span')?.textContent || tabName;
                brandHeader.textContent = `System Settings / ${tabTitle}`;
            }

            // Scroll the main content area to the section
            const headerOffset = 130;
            const elementPosition = targetView.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };

    navLinks.forEach((link) => {
        link.addEventListener('click', (event) => {
            const isGroupParent = link.dataset.toggle === 'submenu';
            const groupId = getGroupIdForNav(link.id);

            if (isGroupParent) {
                // bindGroupToggle handles this.
                return;
            }

            // For other links (Standalone or Child tabs)
            event.preventDefault();
            executeNavActionById(link.id);

            // Only clear groups if we're switching to a truly standalone section (like Home or Broadcast)
            if (!groupId) {
                clearAllGroups();
                syncSidebarGroups();
            }
        });

        // Hover behavior for standalone links in collapsed mode
        link.addEventListener('mouseenter', () => {
            if (document.body.classList.contains('sidebar-collapsed')) {
                const isGroupParent = link.dataset.toggle === 'submenu';
                // If it's a standalone link (e.g. HOME, BROADCAST), hide the active sub-sidebar overlay on hover
                if (!isGroupParent) {
                    hideSubSidebarOverlay();
                    syncSidebarGroups();
                }
            }
        });
    });

    // Add event listener for profile dropdown link
    const profileDropdownLink = document.getElementById('nav-profile-dropdown');
    if (profileDropdownLink) {
        profileDropdownLink.addEventListener('click', (event) => {
            event.preventDefault();
            executeNavActionById(profileDropdownLink.id);
        });
    }





    switchSettingsTab('appearance');
    syncSidebarGroups();

    const logoInput = document.getElementById('org-logo-file');
    if (logoInput) {
        logoInput.addEventListener('change', (event) => {
            const file = event.target.files?.[0];
            if (!file) {
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                setOrganizationLogoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        });
    }

    // --- BRANDING LOGO SYNC ---
    const brandingLogos = [
        { inputId: 'login-logo-input', previewId: 'login-logo-preview', storageKey: 'sigma-custom-login-logo', cancelId: 'login-logo-cancel' },
        { inputId: 'login-bar-logo-input', previewId: 'login-bar-logo-preview', storageKey: 'sigma-custom-login-bar-logo', cancelId: 'login-bar-logo-cancel' },
        { inputId: 'nav-logo-input', previewId: 'nav-logo-preview', storageKey: 'sigma-custom-nav-logo', cancelId: 'nav-logo-cancel' }
    ];

    brandingLogos.forEach(logo => {
        const input = document.getElementById(logo.inputId);
        const preview = document.getElementById(logo.previewId);

        // Load existing
        const saved = localStorage.getItem(logo.storageKey);
        if (saved) {
            if (preview) {
                preview.src = saved;
            }

            // Apply to live instances
            if (logo.storageKey === 'sigma-custom-nav-logo') {
                const navLogos = document.querySelectorAll('header img[alt="ICC Logo"], .sidebar img[alt="ICC Logo"]');
                navLogos.forEach(img => img.src = saved);
            }
        }

        if (input) {
            input.addEventListener('change', (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = () => {
                    const img = new Image();
                    img.onload = () => {
                        // Compress/Downscale image to keep localStorage healthy
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 800; // Sufficient for any logo
                        let width = img.width;
                        let height = img.height;

                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        const compressedUrl = canvas.toDataURL('image/jpeg', 0.7);
                        if (preview) {
                            preview.src = compressedUrl;
                            const cancelBtn = document.getElementById(logo.cancelId);
                            if (cancelBtn) cancelBtn.classList.remove('hidden');
                        }
                    };
                    img.src = reader.result;
                };
                reader.readAsDataURL(file);
            });
        }
    });

    window.saveBrandingSettings = () => {
        const btn = document.getElementById('branding-save-btn');
        const icon = btn?.querySelector('i');
        if (btn) btn.disabled = true;
        if (icon) {
            icon.classList.remove('hidden');
            icon.style.display = 'inline-block';
        }

        try {
            brandingLogos.forEach(logo => {
                const preview = document.getElementById(logo.previewId);
                if (preview) {
                    if (preview.src.startsWith('data:')) {
                        // Save new upload
                        localStorage.setItem(logo.storageKey, preview.src);
                    } else if (preview.src.includes('image/ICC logo.jpg')) {
                        // Reverted to default, remove from storage
                        localStorage.removeItem(logo.storageKey);
                    }
                    // If it's the existing saved URL, we just leave it as is

                    // Live update for the current page (Dashboard Navbar)
                    if (logo.storageKey === 'sigma-custom-nav-logo') {
                        const saved = localStorage.getItem(logo.storageKey);
                        const currentSrc = saved || 'image/ICC logo.jpg';
                        const navLogos = document.querySelectorAll('header img[alt="ICC Logo"], .sidebar img[alt="ICC Logo"]');
                        navLogos.forEach(img => img.src = currentSrc);
                    }
                }
            });
        } catch (err) {
            console.error('Branding Save Error:', err);
            alert('Failed to save branding. The image might be too large.');
        } finally {
            setTimeout(() => {
                if (btn) btn.disabled = false;
                if (icon) icon.style.display = 'none';
                if (window.showToast) window.showToast('Branding settings saved successfully');
                else alert('Branding settings saved successfully');
            }, 800);
        }
    };

    const profilePictureInput = document.getElementById('profile-picture-input');
    if (profilePictureInput) {
        profilePictureInput.addEventListener('change', (event) => {
            const file = event.target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 300;
                    const MAX_HEIGHT = 300;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const nextImage = canvas.toDataURL('image/jpeg', 0.6);
                    if (!nextImage) return;

                    const profile = getOrganizationProfile();
                    const uploads = Array.isArray(profile.profileUploads) ? [...profile.profileUploads] : [];
                    const dedupedUploads = uploads.filter((src) => src !== nextImage);
                    dedupedUploads.unshift(nextImage);

                    // Limit school profile uploads too
                    if (dedupedUploads.length > 6) dedupedUploads.pop();

                    saveOrganizationProfile({
                        ...profile,
                        logo: nextImage,
                        profileUploads: dedupedUploads
                    });
                    syncProfileDisplay();
                    renderProfilePictureUploads();
                    profilePictureInput.value = '';
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }

    const userProfilePictureInput = document.getElementById('user-profile-picture-input');
    if (userProfilePictureInput) {
        userProfilePictureInput.addEventListener('change', (event) => {
            const file = event.target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 300;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const nextImage = canvas.toDataURL('image/jpeg', 0.6);
                    if (!nextImage) return;

                    const target = getProfileTarget();
                    const uploads = Array.isArray(target.data.uploads) ? [...target.data.uploads] : [];
                    const dedupedUploads = uploads.filter((src) => src !== nextImage);
                    dedupedUploads.unshift(nextImage);

                    if (dedupedUploads.length > 6) dedupedUploads.pop();

                    target.data.uploads = dedupedUploads;
                    saveProfileTarget(target.data);

                    syncUserProfileDisplay();
                    renderUserProfilePictureUploads();
                    userProfilePictureInput.value = '';
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }

    const registrationForm = document.getElementById('organization-registration-form');
    if (registrationForm) {
        registrationForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const profile = getOrganizationProfile();
            const administratorSelect = document.getElementById('org-administrator');
            const logoPreview = document.getElementById('org-logo-preview');

            // Get values from all fields (including new ones)
            const schoolName = document.getElementById('org-school-name')?.value.trim() || DEFAULT_ORG_PROFILE.schoolName;
            const motto = registrationForm.querySelector('input[placeholder*="Excellence"]')?.value.trim() || '';
            const schoolId = registrationForm.querySelector('input[placeholder*="405123"]')?.value.trim() || '';
            const vision = registrationForm.querySelector('textarea[placeholder*="vision"]')?.value.trim() || '';
            const mission = registrationForm.querySelector('textarea[placeholder*="mission"]')?.value.trim() || '';

            const address = document.getElementById('org-school-address')?.value.trim() || DEFAULT_ORG_PROFILE.address;
            const city = document.getElementById('org-school-city')?.value.trim() || '';
            const contactNumber = document.getElementById('org-contact-number')?.value.trim() || '';
            const emailAddress = document.getElementById('org-email-address')?.value.trim() || '';
            const administratorId = administratorSelect?.value || '';
            const administratorName = administratorId
                ? administratorSelect.options[administratorSelect.selectedIndex]?.text || ''
                : '';

            const nextProfile = {
                ...profile,
                schoolName,
                motto,
                schoolId,
                vision,
                mission,
                address,
                city,
                contactNumber,
                emailAddress,
                administratorId,
                administratorName,
                logo: logoPreview?.src || profile.logo || DEFAULT_ORG_PROFILE.logo,
                location: DEFAULT_ORG_PROFILE.location,
                status: 'Active'
            };

            saveOrganizationProfile(nextProfile);
            syncProfileDisplay();
            toggleProfileEditMode();
            console.log('Institutional profile updated successfully.');
        });
    }

    window.toggleProfileEditMode = function () {
        // View is currently blank
    };

    window.toggleEditBio = function (shouldSave, index = null) {
        const panel = document.getElementById('school-profile-tab-panel');
        if (!panel) return;
        const isEditing = panel.querySelector('#edit-bio-form') !== null;

        if (isEditing) {
            if (shouldSave) {
                const title = document.getElementById('edit-bio-title').value.trim();
                const description = document.getElementById('edit-bio-description').value.trim();

                const profile = getOrganizationProfile();
                let nextBios = [...(profile.bios || [])];

                if (index !== null && index >= 0) {
                    if (!title && !description) {
                        // Delete if both are empty
                        nextBios.splice(index, 1);
                    } else {
                        nextBios[index] = { title, description };
                    }
                } else if (nextBios.length < 5) {
                    if (title || description) {
                        nextBios.push({ title, description });
                    }
                }

                saveOrganizationProfile({
                    ...profile,
                    bios: nextBios
                });
            }
            renderSchoolProfileTab('bio');
        } else {
            const profile = getOrganizationProfile();
            const bioToEdit = (index !== null && profile.bios && profile.bios[index])
                ? profile.bios[index]
                : { title: '', description: '' };

            panel.innerHTML = `
            <div id="edit-bio-form" class="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <div class="flex items-center justify-between">
                    <h4 class="text-sm font-bold text-black uppercase tracking-widest font-['Inter']">Edit bio</h4>
                </div>
                <div class="space-y-4">
                    <div class="space-y-2">
                        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 font-['Inter']">Title</label>
                        <input type="text" id="edit-bio-title" placeholder="Title" maxlength="20" 
                            value="${escapeHtml(bioToEdit.title)}"
                            class="w-full bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium text-black outline-none focus:border-[#FFD000] transition-all font-['Inter']">
                    </div>
                    <div class="space-y-2">
                        <div class="flex items-center justify-between ml-1">
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-['Inter']">Description</label>
                            <span id="bio-char-counter" class="text-[10px] font-bold text-slate-400 font-['Inter']">${bioToEdit.description.length}/200</span>
                        </div>
                        <textarea id="edit-bio-description" placeholder="Description" maxlength="200" rows="3"
                            class="w-full bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium text-black outline-none focus:border-[#FFD000] transition-all font-['Inter'] resize-none font-['Inter']">${escapeHtml(bioToEdit.description)}</textarea>
                    </div>
                </div>
                <div class="flex items-center justify-between pt-2">
                    <button onclick="document.getElementById('edit-bio-title').value=''; document.getElementById('edit-bio-description').value=''; document.getElementById('bio-char-counter').textContent='0/200';" 
                        class="text-[10px] font-bold text-black hover:bg-slate-100 transition-all uppercase tracking-widest font-['Inter'] px-3 py-2 rounded-lg">Clear</button>
                    <div class="flex items-center gap-3">
                        <button onclick="window.toggleEditBio(false)" class="text-[10px] font-bold text-black hover:bg-slate-100 px-3 py-2 rounded-lg transition-colors uppercase tracking-widest font-['Inter']">Cancel</button>
                        <button onclick="window.toggleEditBio(true, ${index})" class="bg-[#15803d] text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-[#15803d]/90 transition-colors font-['Inter']">Save</button>
                    </div>
                </div>
            </div>
        `;

            const titleInput = document.getElementById('edit-bio-title');
            const descInput = document.getElementById('edit-bio-description');
            const counter = document.getElementById('bio-char-counter');

            if (descInput && counter) {
                descInput.oninput = () => {
                    counter.textContent = `${descInput.value.length}/200`;
                };
            }

            if (titleInput) titleInput.focus();
        }
    };

    function renderSchoolProfileTab(tabId = 'bio') {
        const panel = document.getElementById('school-profile-tab-panel');
        if (!panel) return;

        const profile = getOrganizationProfile();
        const bios = profile.bios || [];

        if (tabId === 'bio') {
            panel.innerHTML = `
                <div class="space-y-4">
                    ${bios.length > 0 ? `
                        <div class="space-y-10">
                            ${bios.map((bio, index) => `
                                <div class="flex items-center justify-between group">
                                    <div class="space-y-4 animate-in fade-in duration-500">
                                        <h3 class="text-[1.65rem] font-medium text-black tracking-tight font-['Inter']">${escapeHtml(bio.title)}</h3>
                                        <p class="text-sm leading-7 text-black max-w-[680px] font-['Inter']">${escapeHtml(bio.description)}</p>
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <button class="text-black/20 hover:text-[#FFD000] transition-colors" onclick="window.toggleEditBio(false, ${index})">
                                            <i class="fa-solid fa-pen text-[14px]"></i>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    <div class="flex items-center gap-2 text-slate-400 ${bios.length >= 5 ? 'hidden' : ''} cursor-pointer hover:text-[#FFD000] transition-colors font-['Inter']" onclick="window.toggleEditBio()">
                        <p class="text-[10px] font-bold tracking-[0.24em] uppercase font-['Inter']">Add bio</p>
                        <i class="fa-solid fa-pen text-[14px]"></i>
                    </div>
                </div>
            `;
            return;
        }

        const content = SCHOOL_PROFILE_TAB_CONTENT[tabId] || SCHOOL_PROFILE_TAB_CONTENT.bio;
        panel.innerHTML = `
            <div class="space-y-4">
                <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-black/40 font-['Inter']">${escapeHtml(content.eyebrow)}</p>
                <h3 class="text-[1.65rem] font-bold text-black tracking-tight font-['Inter']">${escapeHtml(content.title)}</h3>
                <p class="text-sm leading-7 text-black/70 max-w-[680px] font-['Inter']">${escapeHtml(content.body)}</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                ${content.items.map((item) => `
                    <div class="rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-5 text-sm font-medium text-black/75 leading-6 font-['Inter']">
                        ${escapeHtml(item)}
                    </div>
                `).join('')}
            </div>
        `;
    }

    window.switchSchoolProfileTab = function () {
        renderSchoolProfileTab('bio');
    };



    window.toggleProfilePictureOverlay = function (show) {
        const overlay = document.getElementById('profile-picture-overlay');
        if (!overlay) return;

        overlay.classList.toggle('hidden', !show);
        if (show) {
            renderProfilePictureUploads();
        }
    };

    function renderProfilePictureUploads() {
        const uploadsContainer = document.getElementById('profile-picture-uploads');
        if (!uploadsContainer) return;

        const profile = getOrganizationProfile();
        const uploads = Array.isArray(profile.profileUploads) && profile.profileUploads.length
            ? profile.profileUploads
            : [profile.logo || DEFAULT_ORG_PROFILE.logo];
        const activeLogo = profile.logo || uploads[0] || DEFAULT_ORG_PROFILE.logo;

        uploadsContainer.innerHTML = uploads.map((src, index) => `
            <div class="group relative h-24 rounded-2xl border ${src === activeLogo ? 'border-[#15803d] bg-[#f1f8f3]' : 'border-slate-200 bg-slate-50'} overflow-hidden transition-colors hover:border-[#15803d]">
                <button type="button"
                    onclick="window.selectProfilePicture('${encodeURIComponent(src)}')"
                    class="w-full h-full flex items-center justify-center">
                    <img src="${src}" alt="Profile upload ${index + 1}" class="w-16 h-16 object-contain">
                </button>
                <button type="button"
                    onclick="event.stopPropagation(); window.deleteProfilePicture('${encodeURIComponent(src)}')"
                    class="absolute top-2 right-2 w-7 h-7 rounded-full bg-white border border-slate-200 text-black/70 hover:text-red-600 hover:border-red-200 transition-colors flex items-center justify-center"
                    title="Delete photo">
                    <i class="fa-solid fa-trash-can text-xs"></i>
                </button>
            </div>
        `).join('');
    }

    window.selectProfilePicture = function (encodedSrc) {
        const src = decodeURIComponent(encodedSrc);
        const profile = getOrganizationProfile();
        const uploads = Array.isArray(profile.profileUploads) && profile.profileUploads.length
            ? profile.profileUploads
            : [profile.logo || DEFAULT_ORG_PROFILE.logo];

        saveOrganizationProfile({
            ...profile,
            logo: src,
            profileUploads: uploads
        });
        syncProfileDisplay();
        window.toggleProfilePictureOverlay(false);
    };

    window.deleteProfilePicture = function (encodedSrc) {
        const src = decodeURIComponent(encodedSrc);
        const profile = getOrganizationProfile();
        const uploads = Array.isArray(profile.profileUploads) && profile.profileUploads.length
            ? [...profile.profileUploads]
            : [profile.logo || DEFAULT_ORG_PROFILE.logo];

        if (uploads.length <= 1) {
            return;
        }

        const nextUploads = uploads.filter((item) => item !== src);
        const nextLogo = profile.logo === src
            ? (nextUploads[0] || DEFAULT_ORG_PROFILE.logo)
            : (profile.logo || nextUploads[0] || DEFAULT_ORG_PROFILE.logo);

        saveOrganizationProfile({
            ...profile,
            logo: nextLogo,
            profileUploads: nextUploads
        });
        syncProfileDisplay();
        renderProfilePictureUploads();
    };

    window.toggleUserProfilePictureOverlay = function (show) {
        const overlay = document.getElementById('user-profile-picture-overlay');
        if (!overlay) return;
        overlay.classList.toggle('hidden', !show);
        if (show) renderUserProfilePictureUploads();
    };

    function getProfileTarget() {
        const currentId = window.currentUserProfileData?.id;
        // 0000000 is the hardcoded superadmin ID
        if (!currentId || currentId === '0000000') {
            return {
                data: JSON.parse(localStorage.getItem('sigma_user_profile') || '{}'),
                isLoggedIn: true
            };
        } else {
            const users = getStoredJson(USER_STORAGE_KEY, []);
            return {
                data: users.find(u => String(u.uid || u.id) === String(currentId)) || {},
                isLoggedIn: false
            };
        }
    }

    function saveProfileTarget(profileData) {
        const currentId = window.currentUserProfileData?.id;
        if (!currentId || currentId === '0000000') {
            localStorage.setItem('sigma_user_profile', JSON.stringify(profileData));
            // Also sync the global currentUserProfileData if we are on the profile page
            if (window.currentUserProfileData) {
                window.currentUserProfileData.avatar = profileData.avatar || '';
                window.currentUserProfileData.uploads = profileData.uploads || [];
            }
        } else {
            const users = getStoredJson(USER_STORAGE_KEY, []);
            const idx = users.findIndex(u => String(u.uid || u.id) === String(currentId));
            if (idx !== -1) {
                users[idx] = { ...users[idx], ...profileData };
                saveStoredJson(USER_STORAGE_KEY, users);

                // Sync viewing state
                if (window.currentUserProfileData) {
                    window.currentUserProfileData.avatar = profileData.avatar || '';
                    window.currentUserProfileData.uploads = profileData.uploads || [];
                }
            }
        }
    }

    function renderUserProfilePictureUploads() {
        const container = document.getElementById('user-profile-picture-uploads');
        if (!container) return;

        const target = getProfileTarget();
        const uploads = Array.isArray(target.data.uploads) ? target.data.uploads : [];
        const activeAvatar = target.data.avatar || '';

        if (uploads.length === 0) {
            container.innerHTML = '<p class="text-[11px] font-bold uppercase tracking-widest text-slate-300 col-span-full text-center py-10">No photos</p>';
            return;
        }

        container.innerHTML = uploads.map((src, index) => {
            const isSelected = src === activeAvatar;
            return `
                <div class="group relative aspect-square rounded-2xl border ${isSelected ? 'border-[#FFD000] ring-2 ring-[#FFD000]/20' : 'border-black/5'} bg-slate-50 transition-all">
                    <div class="w-full h-full overflow-hidden rounded-2xl">
                        <img src="${src}" alt="Profile upload ${index + 1}" class="w-full h-full object-cover">
                    </div>
                    
                    <button type="button"
                        onclick="window.toggleUserAvatarMenu(event, ${index})"
                        class="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 text-black flex items-center justify-center z-10 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Actions">
                        <i class="fa-solid fa-ellipsis text-[12px]"></i>
                    </button>

                    <div id="user-avatar-menu-${index}" class="absolute top-10 right-2 w-28 bg-white rounded-xl shadow-xl border border-slate-100 py-1 hidden z-20">
                        <button type="button" onclick="window.selectUserProfilePicture('${encodeURIComponent(src)}')" class="w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-[#15803d] transition-colors">Select</button>
                        <button type="button" onclick="window.deleteUserProfilePicture('${encodeURIComponent(src)}')" class="w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-red-500 transition-colors">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.toggleUserAvatarMenu = function (event, index) {
        if (event) event.stopPropagation();

        // Close all other menus
        const allMenus = document.querySelectorAll('[id^="user-avatar-menu-"]');
        allMenus.forEach((menu) => {
            if (menu.id !== `user-avatar-menu-${index}`) {
                menu.classList.add('hidden');
            }
        });

        const menu = document.getElementById(`user-avatar-menu-${index}`);
        if (menu) {
            menu.classList.toggle('hidden');
        }

        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (menu && !menu.contains(e.target)) {
                menu.classList.add('hidden');
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    };

    window.selectUserProfilePicture = function (encodedSrc) {
        const src = decodeURIComponent(encodedSrc);
        const target = getProfileTarget();
        target.data.avatar = src;
        saveProfileTarget(target.data);
        syncUserProfileDisplay();
        renderUserProfilePictureUploads();
    };

    window.deleteUserProfilePicture = function (encodedSrc) {
        const src = decodeURIComponent(encodedSrc);
        const target = getProfileTarget();
        const uploads = Array.isArray(target.data.uploads) ? target.data.uploads : [];
        const nextUploads = uploads.filter((item) => item !== src);

        const nextAvatar = target.data.avatar === src ? (nextUploads.length > 0 ? nextUploads[0] : '') : target.data.avatar;

        target.data.avatar = nextAvatar;
        target.data.uploads = nextUploads;
        saveProfileTarget(target.data);
        syncUserProfileDisplay();
        renderUserProfilePictureUploads();
    };

    function syncUserProfileDisplay() {
        const target = getProfileTarget();
        const avatarSrc = target.data.avatar || '';

        // 1. Update the profile banner avatar (Always the target user)
        const bannerImg = document.getElementById('user-avatar-img');
        const bannerPlaceholder = document.getElementById('user-avatar-placeholder');
        if (bannerImg && bannerPlaceholder) {
            if (avatarSrc) {
                bannerImg.src = avatarSrc;
                bannerImg.classList.remove('hidden');
                bannerPlaceholder.classList.add('hidden');
            } else {
                bannerImg.src = '';
                bannerImg.classList.add('hidden');
                bannerPlaceholder.classList.remove('hidden');
            }
        }

        // 2. Update global identity (ONLY if the target is the logged-in user)
        if (target.isLoggedIn) {
            const globalElements = [
                { id: 'header-avatar-img', placeholderId: 'header-avatar-placeholder' },
                { id: 'sidebar-avatar-img', placeholderId: 'sidebar-avatar-placeholder' }
            ];

            globalElements.forEach(({ id, placeholderId }) => {
                const imgEl = document.getElementById(id);
                const placeholderEl = document.getElementById(placeholderId);
                if (imgEl && placeholderEl) {
                    if (avatarSrc) {
                        imgEl.src = avatarSrc;
                        imgEl.classList.remove('hidden');
                        placeholderEl.classList.add('hidden');
                    } else {
                        imgEl.src = '';
                        imgEl.classList.add('hidden');
                        placeholderEl.classList.remove('hidden');
                    }
                }
            });
        }
    }

    function syncProfileDisplay() {
        const profile = getOrganizationProfile();
        const defaultBranch = window.getDefaultSchoolBranch();
        const branchName = profile.schoolName || defaultBranch.name || `${DEFAULT_ORG_PROFILE.schoolName} ${DEFAULT_ORG_PROFILE.location}`.trim();
        const logoSrc = profile.logo || DEFAULT_ORG_PROFILE.logo;

        const branchNameEl = document.getElementById('view-school-branch-name');
        const addressEl = document.getElementById('view-address');
        const contactEl = document.getElementById('view-contact');
        const emailEl = document.getElementById('view-email');
        const logoEl = document.getElementById('view-school-logo');

        if (branchNameEl) branchNameEl.textContent = branchName;
        if (addressEl) addressEl.textContent = defaultBranch.street || profile.address || DEFAULT_ORG_PROFILE.address;
        if (contactEl) contactEl.textContent = defaultBranch.contact || profile.contactNumber || DEFAULT_ORG_PROFILE.contactNumber;
        if (emailEl) emailEl.textContent = defaultBranch.email || profile.emailAddress || DEFAULT_ORG_PROFILE.emailAddress;
        if (logoEl) logoEl.src = logoSrc;

        window.switchSchoolProfileTab('bio');
        renderProfilePictureUploads();
        syncUserProfileDisplay();
    }

    // Handle User Registration (Provisioning)
    const adminRegisterForm = document.querySelector('#provision-admin-form form');
    if (adminRegisterForm) {
        adminRegisterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const inputs = adminRegisterForm.querySelectorAll('input, select');
            const generatedUid = 'USR' + Math.floor(Math.random() * 9999).toString().padStart(4, '0');
            const rawNameParts = String(inputs[0].value || '').trim().split(/\s+/).filter(Boolean);
            const generatedLastName = rawNameParts.slice(1).join(' ') || 'User';
            const defaultBranch = window.getDefaultSchoolBranch();
            const userRole = inputs[2].value;
            let defaultPerms = { bio: true, achievements: false, subjects: false, sections: false };
            if (userRole === 'Teacher') {
                defaultPerms = { bio: true, achievements: false, subjects: true, sections: true };
            } else if (userRole === 'Student') {
                defaultPerms = { bio: true, achievements: true, subjects: true, sections: true };
            }

            const userData = {
                id: 'USER-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
                uid: generatedUid,
                firstName: rawNameParts[0] || 'New',
                lastName: generatedLastName,
                email: inputs[1].value,
                role: userRole,
                type: userRole,
                schoolBranch: defaultBranch.name,
                branchCode: defaultBranch.code,
                status: 'Active',
                regDate: new Date().toLocaleDateString(),
                createdVia: 'admin-panel',
                password: buildManagedUserPassword(generatedLastName, generatedUid),
                permissions: defaultPerms
            };

            const users = getStoredJson(USER_STORAGE_KEY, []);
            users.unshift(userData);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));

            adminRegisterForm.reset();
            toggleAdminForm();
            renderUserAccountsTable();
            populateAdministratorSelect();

            alert(`${userData.role} Account Created Successfully!`);
        });
    }

    updateGlobalSYDisplay();
    fillOrganizationForm();
    syncProfileDisplay();
    bindUserAccountSearch();
    renderUserAccountsTable();

    // ─── CHARTS INITIALIZATION ───────────────────────────────────────────
    const userChartCtx = document.getElementById('userDistributionChart');
    let userChart;

    function renderUserChart(data) {
        if (!userChartCtx) return;
        if (userChart) userChart.destroy();

        userChart = new Chart(userChartCtx, {
            type: 'pie',
            data: {
                labels: ['Students', 'Teachers', 'Admins'],
                datasets: [{
                    data: data,
                    backgroundColor: ['#15803d', '#FFD000', '#0f172a'],
                    borderWidth: 0,
                    hoverOffset: 15
                }]
            },
            options: {
                layout: { padding: 20 },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true }
                }
            }
        });
    }

    const subjectChartCtx = document.getElementById('subjectDistributionChart');
    let subjectChart;

    function renderSubjectChart(data) {
        if (!subjectChartCtx) return;
        if (subjectChart) subjectChart.destroy();

        subjectChart = new Chart(subjectChartCtx, {
            type: 'pie',
            data: {
                labels: ['Core', 'Applied', 'Specialized'],
                datasets: [{
                    data: data,
                    backgroundColor: ['#15803d', '#FFD000', '#0f172a'],
                    borderWidth: 0,
                    hoverOffset: 15
                }]
            },
            options: {
                layout: { padding: 20 },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true }
                }
            }
        });
    }

    const sectionChartCtx = document.getElementById('sectionDistributionChart');
    let sectionChart;

    function renderSectionChart(data) {
        if (!sectionChartCtx) return;
        if (sectionChart) sectionChart.destroy();

        sectionChart = new Chart(sectionChartCtx, {
            type: 'pie',
            data: {
                labels: ['Grade 11', 'Grade 12', 'Specialized'],
                datasets: [{
                    data: data,
                    backgroundColor: ['#15803d', '#FFD000', '#0f172a'],
                    borderWidth: 0,
                    hoverOffset: 15
                }]
            },
            options: {
                layout: { padding: 20 },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true }
                }
            }
        });
    }

    const tabOverall = document.getElementById('tab-overall-users');
    const tabActive = document.getElementById('tab-active-users');
    const tabInactive = document.getElementById('tab-inactive-users');

    function setActiveTab(activeTab) {
        [tabOverall, tabActive, tabInactive].forEach(tab => {
            if (!tab) return;
            if (tab === activeTab) {
                tab.classList.add('bg-[#15803d]', 'text-white');
                tab.classList.remove('text-black', 'hover:bg-slate-100');
            } else {
                tab.classList.add('text-black', 'hover:bg-slate-100');
                tab.classList.remove('bg-[#15803d]', 'text-white', 'shadow-sm');
            }
        });
    }

    if (tabOverall) {
        tabOverall.addEventListener('click', () => {
            setActiveTab(tabOverall);
            if (currentOverviewPage === 1) {
                document.getElementById('count-students').textContent = '366';
                document.getElementById('count-teachers').textContent = '47';
                document.getElementById('count-admins').textContent = '9';
                renderUserChart([366, 47, 9]);
            }
        });
    }

    if (tabActive) {
        tabActive.addEventListener('click', () => {
            setActiveTab(tabActive);
            if (currentOverviewPage === 1) {
                document.getElementById('count-students').textContent = '342';
                document.getElementById('count-teachers').textContent = '42';
                document.getElementById('count-admins').textContent = '8';
                renderUserChart([342, 42, 8]);
            }
        });
    }

    if (tabInactive) {
        tabInactive.addEventListener('click', () => {
            setActiveTab(tabInactive);
            if (currentOverviewPage === 1) {
                document.getElementById('count-students').textContent = '24';
                document.getElementById('count-teachers').textContent = '5';
                document.getElementById('count-admins').textContent = '1';
                renderUserChart([24, 5, 1]);
            }
        });
    }

    // ─── USERS OVERVIEW PAGINATION ───────────────────────────────────────
    let currentOverviewPage = 1;
    const totalOverviewPages = 3;

    function updateOverviewPageUI() {
        const titleEl = document.getElementById('overview-header-title');
        const statusControls = document.getElementById('overview-status-controls');

        const titles = {
            1: 'Users Overview',
            2: 'Subjects Overview',
            3: 'Sections Overview'
        };

        if (titleEl) titleEl.textContent = titles[currentOverviewPage];

        // Only show status controls on page 1
        if (statusControls) {
            if (currentOverviewPage === 1) {
                statusControls.classList.remove('hidden');
            } else {
                statusControls.classList.add('hidden');
            }
        }

        for (let i = 1; i <= totalOverviewPages; i++) {
            const page = document.getElementById(`overview-page-${i}`);
            if (page) {
                if (i === currentOverviewPage) {
                    page.classList.remove('hidden');
                } else {
                    page.classList.add('hidden');
                }
            }
        }
    }

    const btnPrevPage = document.getElementById('prev-overview-page');
    const btnNextPage = document.getElementById('next-overview-page');

    if (btnPrevPage && btnNextPage) {
        btnPrevPage.addEventListener('click', () => {
            currentOverviewPage = currentOverviewPage > 1 ? currentOverviewPage - 1 : totalOverviewPages;
            updateOverviewPageUI();
        });

        btnNextPage.addEventListener('click', () => {
            currentOverviewPage = currentOverviewPage < totalOverviewPages ? currentOverviewPage + 1 : 1;
            updateOverviewPageUI();
        });
    }

    // --- Dashboard Announcements & Composer ---
    let activeHomeAnnouncementTab = 'overall';
    let dashAnnouncementSeverity = 'regular';

    const annModal = document.getElementById('announcement-modal');
    const annTrigger = document.getElementById('trigger-announcement-composer');
    const annClose = document.getElementById('close-announcement-modal');
    const annForm = document.getElementById('dashboard-announcement-form');

    // Modal Control
    if (annTrigger) {
        annTrigger.addEventListener('click', () => {
            if (annModal) {
                annModal.classList.remove('hidden');
                document.body.classList.add('overflow-hidden');
            }
        });
    }

    // Confirmation Modal Logic
    const discardModal = document.getElementById('discard-confirmation-modal');
    const btnCancelDiscard = document.getElementById('confirm-cancel-discard');
    const btnConfirmDiscard = document.getElementById('confirm-discard-post');

    const closeAnnouncementModalWithCheck = () => {
        const titleVal = document.getElementById('dash-announcement-title').value.trim();
        const bodyVal = document.getElementById('dash-announcement-body').value.trim();

        if (titleVal !== '' || bodyVal !== '') {
            if (discardModal) discardModal.classList.remove('hidden');
        } else {
            actuallyCloseAnnouncementModal();
        }
    };

    const actuallyCloseAnnouncementModal = () => {
        if (annModal) {
            annModal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        }
        if (discardModal) discardModal.classList.add('hidden');
    };

    if (annClose) {
        annClose.addEventListener('click', closeAnnouncementModalWithCheck);
    }

    if (annModal) {
        annModal.addEventListener('click', (e) => {
            if (e.target === annModal) {
                closeAnnouncementModalWithCheck();
            }
        });
    }

    if (btnCancelDiscard) {
        btnCancelDiscard.addEventListener('click', () => {
            if (discardModal) discardModal.classList.add('hidden');
        });
    }

    if (btnConfirmDiscard) {
        btnConfirmDiscard.addEventListener('click', () => {
            if (annForm) annForm.reset();
            actuallyCloseAnnouncementModal();
        });
    }

    // Severity Toggles in Modal
    document.querySelectorAll('[data-dash-type]').forEach(btn => {
        btn.addEventListener('click', () => {
            dashAnnouncementSeverity = btn.dataset.dashType;
            document.querySelectorAll('[data-dash-type]').forEach(b => {
                b.classList.remove('border-[#15803d]', 'bg-[#15803d]/5', 'text-[#15803d]', 'border-red-500', 'bg-red-50', 'text-red-500');
                b.classList.add('border-slate-100', 'text-black');
            });

            if (dashAnnouncementSeverity === 'regular') {
                btn.classList.replace('border-slate-100', 'border-[#15803d]');
                btn.classList.replace('text-black', 'text-[#15803d]');
                btn.classList.add('bg-[#15803d]/5');
            } else {
                btn.classList.replace('border-slate-100', 'border-red-500');
                btn.classList.replace('text-black', 'text-red-500');
                btn.classList.add('bg-red-50');
            }
        });
    });

    // Form Submission with Loading State
    if (annForm) {
        annForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const submitBtn = document.querySelector('button[form="dashboard-announcement-form"]');
            const originalContent = submitBtn ? submitBtn.innerHTML : 'Post Announcement';

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Posting...';
                submitBtn.classList.add('opacity-80', 'cursor-not-allowed');
            }

            const title = document.getElementById('dash-announcement-title').value;
            const body = document.getElementById('dash-announcement-body').value;

            const newPost = {
                id: 'ann-' + Date.now(),
                title,
                body,
                audience: 'all', // Fixed for this simplified version
                type: dashAnnouncementSeverity,
                isImportant: dashAnnouncementSeverity === 'urgent',
                createdAt: new Date().toISOString(),
                author: 'Jubileen Gonzales',
                isAdmin: true
            };

            setTimeout(() => {
                let posts = JSON.parse(localStorage.getItem('sigma-admin-announcements-v1') || '[]');
                if (!Array.isArray(posts)) posts = [];
                posts.unshift(newPost);
                localStorage.setItem('sigma-admin-announcements-v1', JSON.stringify(posts));

                // Reset and close
                annForm.reset();
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalContent;
                    submitBtn.classList.remove('opacity-80', 'cursor-not-allowed');
                }

                actuallyCloseAnnouncementModal();
                renderAdminAnnouncements();
            }, 1500);
        });
    }

    function loadInstitutionalAnnouncements() {
        let adminPosts = JSON.parse(localStorage.getItem('sigma-admin-announcements-v1') || '[]');
        if (!Array.isArray(adminPosts)) adminPosts = [];

        // Standard high-fidelity system posts (Only if missing)
        const imagePostTitle = 'Institutional School Modernization Project';
        if (!adminPosts.some(p => p.title === imagePostTitle)) {
            adminPosts.unshift({
                id: 'sys-img-' + Date.now(),
                title: imagePostTitle,
                body: 'We are excited to share the progress of our new campus facility expansion. The construction of the North Wing is now 75% complete.',
                imageUrl: 'image/ICC Welcome.jpg',
                audience: 'all',
                type: 'regular',
                createdAt: new Date(Date.now() - 3600000).toISOString(),
                author: 'Jubileen Gonzales',
                isAdmin: true
            });
        }

        const imgOnlyId = 'sys-img-only-id';
        if (!adminPosts.some(p => p.id === imgOnlyId)) {
            adminPosts.unshift({
                id: imgOnlyId,
                title: '',
                body: '',
                imageUrl: 'image/ICC Shs.jpg',
                audience: 'all',
                type: 'regular',
                createdAt: new Date(Date.now() - 7200000).toISOString(),
                author: 'Jubileen Gonzales',
                isAdmin: true
            });
        }

        localStorage.setItem('sigma-admin-announcements-v1', JSON.stringify(adminPosts));

        const highFidelityPost = {
            id: 'sys-welcome-' + Date.now(),
            title: '2nd Quarter Academic & School Updates',
            body: `Welcome to the 2nd Quarter Academic Cycle. Please be advised of the following critical updates: 
1. The General Mathematics final examination will be held on Monday, March 25th, starting exactly at 8:00 AM in the Main Hall.
2. Students are required to present their validated permits and institutional IDs before entry.
3. The Oral Communication project submissions are due by midnight on Friday; late submissions will incur a 10% penalty per day.
4. School health protocols remain in effect; please ensure you have your medical clearances updated at the clinic.
5. Digital Resource Access will be under maintenance this Saturday from 10:00 PM to 2:00 AM.
6. The upcoming Institutional Sports Fest registration is now open at the Student Affairs Office.
7. Please coordinate with your respective strand coordinators for the final research defense schedules.
8. Attendance for the Monday morning assembly is mandatory for all students and faculty members.`,
            audience: 'all',
            type: 'urgent',
            createdAt: new Date().toISOString(),
            author: 'Jubileen Gonzales',
            isAdmin: true
        };

        const existingWelcomePost = adminPosts.find(p => p.title === highFidelityPost.title);
        if (!existingWelcomePost) {
            adminPosts.unshift(highFidelityPost);
            localStorage.setItem('sigma-admin-announcements-v1', JSON.stringify(adminPosts));
        } else if (existingWelcomePost.type !== 'urgent') {
            existingWelcomePost.type = 'urgent';
            localStorage.setItem('sigma-admin-announcements-v1', JSON.stringify(adminPosts));
        }

        let teacherPosts = JSON.parse(localStorage.getItem('sigma-room-announcements-v1') || '[]');
        if (!Array.isArray(teacherPosts)) teacherPosts = [];

        // Ensure everything is sorted by latest first
        if (Array.isArray(adminPosts)) adminPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        teacherPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        let combined = [...adminPosts, ...teacherPosts];
        combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return { combined, adminOnly: adminPosts };
    }

    function formatAnnouncementDate(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) {
            return diffInSeconds <= 1 ? '1sec' : `${diffInSeconds}secs`;
        }
        const mins = Math.floor(diffInSeconds / 60);
        if (mins < 60) {
            return mins === 1 ? '1min' : `${mins}mins`;
        }
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) {
            return hrs === 1 ? '1hr' : `${hrs}hrs`;
        }

        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();

        if (date.toDateString() === yesterday.toDateString()) {
            return `Yesterday at ${timeStr}`;
        }

        if (diffInSeconds < 7 * 24 * 3600) {
            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
            return `${dayName} at ${timeStr}`;
        }

        const monthDayYear = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        return `${monthDayYear} at ${timeStr}`;
    }

    function renderAdminAnnouncements() {
        const feed = document.getElementById('admin-announcements-feed');
        if (!feed) return;

        const { combined, adminOnly } = loadInstitutionalAnnouncements();
        let filtered = combined;

        if (activeHomeAnnouncementTab === 'important') {
            filtered = combined.filter(p => p.type === 'urgent' || p.isImportant);
        } else if (activeHomeAnnouncementTab === 'posts') {
            filtered = adminOnly; // Show only posts created by admin
        }

        if (!filtered.length) {
            feed.innerHTML = `
                <div class="py-20 flex flex-col items-center justify-center gap-4 bg-white border border-slate-100 rounded-[32px] opacity-40">
                    <i class="fa-solid fa-bullhorn text-5xl text-black"></i>
                    <p class="text-[10px] font-black uppercase tracking-widest text-black">No active announcements</p>
                </div>
            `;
            return;
        }

        feed.innerHTML = filtered.map(post => {
            const isTeacher = post.roomName || post.sectionName;
            const roleLabel = isTeacher ? 'Teacher' : 'Administrator';
            const roleClass = isTeacher ? 'text-emerald-600' : 'text-slate-500';

            const fullBody = post.body || '';
            const hasImage = post.imageUrl && post.imageUrl.trim() !== '';
            const hasText = (post.title && post.title.trim() !== '') || (post.body && post.body.trim() !== '');

            // Layout logic
            let cardHeight = "h-[260px]";
            let isImageOnly = false;
            let isImageWithText = false;

            if (hasImage && hasText) {
                cardHeight = "h-[520px]";
                isImageWithText = true;
            } else if (hasImage && !hasText) {
                cardHeight = "h-[420px]";
                isImageOnly = true;
            }

            const textLimit = isImageWithText ? 90 : 180;
            const isLong = fullBody.length > textLimit;
            const truncatedBody = isLong ? fullBody.substring(0, textLimit) + '...' : fullBody;

            // HTML-safe formatting with line breaks
            const formattedFull = escapeHtml(fullBody).replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
            const formattedTruncated = escapeHtml(truncatedBody).replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');

            return `
                <article id="${post.id}" 
                         data-original-height="${cardHeight}"
                         class="bg-white border border-slate-200 rounded-[22px] relative w-full ${cardHeight} overflow-hidden transition-all duration-500 group">
                    
                    <!-- Content Area -->
                    <div class="p-6 pb-[60px] flex flex-col min-w-0">
                        <!-- Top Section -->
                        <div class="flex items-start justify-between mb-4">
                            <div class="flex items-center gap-3">
                                <div class="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                    <i class="fa-solid fa-user text-xs text-black"></i>
                                </div>
                                <div class="flex flex-col">
                                    <span class="text-[12px] font-black text-slate-900 leading-none mb-1">${escapeHtml(isTeacher ? (post.author || 'Teacher') : 'Jubileen Gonzales')}</span>
                                    <span class="text-[9px] font-bold ${roleClass}">${roleLabel}</span>
                                </div>
                            </div>
                            <div class="flex flex-col items-end gap-1">
                                <span class="text-[10px] font-medium text-slate-400 tracking-tight">${formatAnnouncementDate(post.createdAt)}</span>
                            </div>
                        </div>

                        <!-- Content Section -->
                        ${hasText ? `
                            <div class="space-y-1">
                                <h3 class="text-[22px] font-bold text-slate-900 leading-tight ${isImageWithText ? 'line-clamp-2' : 'line-clamp-1'} text-left">${escapeHtml(post.title)}</h3>
                                <div class="relative">
                                    <p class="announcement-body text-[16px] text-black leading-relaxed font-normal text-left" 
                                       data-full="${formattedFull}" 
                                       data-truncated="${formattedTruncated}">
                                        ${formattedTruncated}
                                        ${isLong ? `<span onclick="toggleAnnouncement('${post.id}')" class="see-more-btn cursor-pointer font-bold text-slate-900 hover:underline ml-1">See more</span>` : ''}
                                    </p>
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    ${hasImage ? `
                        <!-- Fixed 300px Image Area (Anchored above footer) -->
                        <div class="absolute bottom-[52px] left-0 right-0 h-[300px] overflow-hidden border-t border-slate-50 bg-black">
                            <img src="${post.imageUrl}" 
                                 onclick="enlargeAnnouncementImage('${post.imageUrl}')" 
                                 class="w-full h-full object-contain cursor-pointer" 
                                 alt="Announcement Image">
                        </div>
                    ` : ''}

                    <!-- Absolute Fixed Footer & Actions -->
                    <div class="absolute bottom-0 left-0 right-0 h-[52px] px-6 border-t border-slate-100 bg-white flex items-center justify-end z-10">
                        <button onclick="togglePostMenu('${post.id}')" class="w-9 h-9 rounded-full flex items-center justify-center text-black hover:bg-slate-100 transition-all">
                            <i class="fa-solid fa-ellipsis text-lg"></i>
                        </button>
                        
                        <!-- Dropdown Menu -->
                        <div id="menu-${post.id}" class="hidden absolute bottom-full right-6 mb-2 w-40 bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 py-2 z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <button onclick="editDashPost('${post.id}')" class="w-full px-4 py-2 text-left text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
                                <i class="fa-solid fa-pen-to-square text-xs opacity-40"></i> Edit post
                            </button>
                            <button onclick="deleteDashPost('${post.id}')" class="w-full px-4 py-2 text-left text-[13px] font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 border-t border-slate-50">
                                <i class="fa-solid fa-trash-can text-xs opacity-40"></i> Delete post
                            </button>
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    }

    window.enlargeAnnouncementImage = function (url) {
        let overlay = document.getElementById('announcement-image-lightbox');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'announcement-image-lightbox';
            overlay.className = 'fixed inset-0 bg-black/90 z-[9999] hidden flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-300';
            overlay.onclick = () => overlay.classList.add('hidden');
            overlay.innerHTML = `
                <div class="relative w-screen h-screen flex items-center justify-center">
                    <img src="" class="max-w-full max-h-full object-contain shadow-2xl animate-in zoom-in-95 duration-300" id="lightbox-img">
                    <button class="absolute top-8 right-8 text-white hover:text-slate-300 transition-colors text-3xl">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        const img = overlay.querySelector('#lightbox-img');
        img.src = url;
        overlay.classList.remove('hidden');
    };

    window.togglePostMenu = function (id) {
        document.querySelectorAll('[id^="menu-"]').forEach(m => {
            if (m.id !== `menu-${id}`) m.classList.add('hidden');
        });
        const menu = document.getElementById(`menu-${id}`);
        if (menu) menu.classList.toggle('hidden');
    };

    window.toggleAnnouncement = function (id) {
        const card = document.getElementById(id);
        if (!card) return;

        const body = card.querySelector('.announcement-body');
        const fullText = body.getAttribute('data-full');
        const truncatedText = body.getAttribute('data-truncated');
        const originalHeight = card.getAttribute('data-original-height');

        if (!card.classList.contains('h-auto')) {
            // Expand
            card.classList.remove(originalHeight);
            card.classList.add('h-auto');
            body.innerHTML = `${fullText} <span onclick="toggleAnnouncement('${id}')" class="see-more-btn cursor-pointer font-bold text-slate-900 hover:underline ml-1">See less</span>`;
        } else {
            // Collapse
            card.classList.add(originalHeight);
            card.classList.remove('h-auto');
            body.innerHTML = `${truncatedText} <span onclick="toggleAnnouncement('${id}')" class="see-more-btn cursor-pointer font-bold text-slate-900 hover:underline ml-1">See more</span>`;
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    };

    window.editDashPost = function (id) {
        alert('Edit functionality initialized for: ' + id);
        // Implementation for editing would go here (opening a modal with pre-filled data)
    };

    // Global Delete function
    window.deleteDashPost = function (id) {
        const posts = JSON.parse(localStorage.getItem('sigma-admin-announcements-v1') || '[]');
        const updated = posts.filter(p => p.id !== id);
        localStorage.setItem('sigma-admin-announcements-v1', JSON.stringify(updated));
        renderAdminAnnouncements();
    };

    // Tab Listeners
    const tabs = {
        'overall': document.getElementById('tab-announcement-overall'),
        'important': document.getElementById('tab-announcement-important'),
        'posts': document.getElementById('tab-announcement-posts')
    };

    Object.entries(tabs).forEach(([key, btn]) => {
        if (!btn) return;
        btn.addEventListener('click', () => {
            activeHomeAnnouncementTab = key;
            Object.values(tabs).forEach(b => {
                b.classList.remove('bg-[#15803d]', 'text-white', 'shadow-sm');
                b.classList.add('text-slate-900', 'hover:bg-slate-50');
            });
            btn.classList.remove('text-slate-900', 'hover:bg-slate-50');
            btn.classList.add('bg-[#15803d]', 'text-white', 'shadow-sm');
            renderAdminAnnouncements();
        });
    });

    renderAdminAnnouncements();
    renderUserChart([342, 42, 8]);
    renderSubjectChart([15, 12, 4]);
    renderSectionChart([10, 12, 4]);

    // AI Model Switcher Listeners
    const geminiBtn = document.getElementById('btn-ai-gemini');
    const groqBtn = document.getElementById('btn-ai-groq');
    if (geminiBtn) geminiBtn.addEventListener('click', () => setAiModel('gemini'));
    if (groqBtn) groqBtn.addEventListener('click', () => setAiModel('groq'));

    // AI Period Switcher Listeners
    const periodDailyBtn = document.getElementById('btn-period-daily');
    const periodMonthlyBtn = document.getElementById('btn-period-monthly');
    if (periodDailyBtn) periodDailyBtn.addEventListener('click', () => setAiPeriod('daily'));
    if (periodMonthlyBtn) periodMonthlyBtn.addEventListener('click', () => setAiPeriod('monthly'));
});

const SYSTEM_STATUS_CONFIG = {
    operational: {
        label: 'Operational',
        message: 'All systems running normally',
        color: '#15803d',
        latency: 'Fast',
        uptime: '99.9',
        latencyPercent: '100%'
    },
    stable: {
        label: 'Stable',
        message: 'System is running with minor issues',
        color: '#2563eb',
        latency: 'Normal',
        uptime: '95.2',
        latencyPercent: '85%'
    },
    degraded: {
        label: 'Degraded',
        message: 'Some services are experiencing slowdowns',
        color: '#ca8a04',
        latency: 'Slow',
        uptime: '75.4',
        latencyPercent: '50%'
    },
    partial_outage: {
        label: 'Partial Outage',
        message: 'Some modules are currently unavailable',
        color: '#ea580c',
        latency: 'Slow',
        uptime: '55.0',
        latencyPercent: '30%'
    },
    critical: {
        label: 'Critical',
        message: 'System is experiencing major failures',
        color: '#dc2626',
        latency: 'Very Slow',
        uptime: '30.1',
        latencyPercent: '10%'
    },
    offline: {
        label: 'Offline',
        message: 'System is currently offline',
        color: '#000000',
        latency: 'Very Slow',
        uptime: '0',
        latencyPercent: '0%'
    }
};

window.updateSystemStatus = function (statusKey) {
    const config = SYSTEM_STATUS_CONFIG[statusKey];
    if (!config) return;

    const label = document.getElementById('system-status-label');
    const indicator = document.getElementById('system-status-indicator');
    const uptimeValue = document.getElementById('system-uptime-value');
    const statusMessage = document.getElementById('system-status-message');
    const latencyLabel = document.getElementById('system-latency-label');
    const latencyBar = document.getElementById('system-latency-bar');

    if (label) {
        label.innerText = config.label;
        label.style.color = config.color;
    }
    if (indicator) {
        indicator.style.backgroundColor = config.color;
    }
    if (uptimeValue) {
        uptimeValue.innerText = config.uptime;
    }
    if (statusMessage) {
        statusMessage.innerText = config.message;
    }
    if (latencyLabel) {
        latencyLabel.innerText = config.latency;
        latencyLabel.style.color = config.color;
    }
    if (latencyBar) {
        latencyBar.style.backgroundColor = config.color;
        latencyBar.style.width = config.latencyPercent;
    }
};

// Initialize with operational state
document.addEventListener('DOMContentLoaded', () => {
    const DASHBOARD_METRICS_ORDER_KEY = 'sigma-dashboard-metrics-order';
    const SECTIONS_GRID_ORDER_KEY = 'sigma-sections-grid-order';

    function applySavedOrder(containerId, storageKey) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const savedOrder = localStorage.getItem(storageKey);
        if (savedOrder) {
            try {
                const order = JSON.parse(savedOrder);
                order.forEach(id => {
                    const el = container.querySelector(`[data-id="${id}"]`);
                    if (el) container.appendChild(el);
                });
            } catch (e) {
                console.error("Error restoring order:", e);
            }
        }
    }

    applySavedOrder('dashboard-metrics-container', DASHBOARD_METRICS_ORDER_KEY);
    applySavedOrder('sections-grid', SECTIONS_GRID_ORDER_KEY);

    // Initialize Dashboard Metrics Sortable
    const metricsContainer = document.getElementById('dashboard-metrics-container');
    if (metricsContainer && typeof Sortable !== 'undefined') {
        const metricsSortable = new Sortable(metricsContainer, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            forceFallback: true,
            fallbackClass: 'sortable-drag',
            scroll: true,
            bubbleScroll: true,
            dataIdAttr: 'data-id',
            onStart: () => document.body.style.cursor = 'grabbing',
            onEnd: () => {
                document.body.style.cursor = '';
                const order = metricsSortable.toArray();
                localStorage.setItem(DASHBOARD_METRICS_ORDER_KEY, JSON.stringify(order));
            }
        });
    }

    const sectionsGrid = document.getElementById('sections-grid');
    if (sectionsGrid && typeof Sortable !== 'undefined') {
        const sectionsSortable = new Sortable(sectionsGrid, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            forceFallback: true,
            fallbackClass: 'sortable-drag',
            scroll: true,
            bubbleScroll: true,
            dataIdAttr: 'data-id',
            onStart: () => document.body.style.cursor = 'grabbing',
            onEnd: () => {
                document.body.style.cursor = '';
                const order = sectionsSortable.toArray();
                localStorage.setItem(SECTIONS_GRID_ORDER_KEY, JSON.stringify(order));
            }
        });
    }

    setTimeout(() => {
        if (typeof window.updateSystemStatus === 'function') {
            window.updateSystemStatus('operational');
        }
        if (typeof window.updateAiUsage === 'function') {
            window.updateAiUsage(42, 18);
        }
        if (typeof window.updateStorageUsage === 'function') {
            window.updateStorageUsage(83, 12.4);
        }
    }, 500);
});

const AI_USAGE_LEVELS = [
    { max: 40, label: 'EFFICIENT', color: '#15803d' },
    { max: 60, label: 'NORMAL', color: '#2563eb' },
    { max: 75, label: 'MODERATE', color: '#ca8a04' },
    { max: 90, label: 'HEAVY', color: '#ea580c' },
    { max: 99, label: 'CRITICAL', color: '#dc2626' },
    { max: 100, label: 'EXCEEDED', color: '#000000' }
];

window.updateAiUsage = function (percent) {
    const level = AI_USAGE_LEVELS.find(l => percent <= l.max) || AI_USAGE_LEVELS[AI_USAGE_LEVELS.length - 1];
    const label = document.getElementById('ai-status-label');
    const icon = document.getElementById('ai-status-icon');
    const usagePercent = document.getElementById('ai-usage-percent');
    const bar = document.getElementById('ai-usage-bar');

    if (label) {
        label.innerText = level.label;
        label.style.color = level.color;
    }
    if (icon) {
        icon.style.color = level.color;
    }
    if (usagePercent) {
        usagePercent.innerText = `${percent}%`;
    }
    if (bar) {
        bar.style.width = `${percent}%`;
        bar.style.backgroundColor = level.color;
    }
};



const AI_MODEL_DATA = {
    gemini: {
        daily: { requests: '1,242', percent: 42, label: 'Requests Today', sub: '(Sunday)' },
        monthly: { requests: '45,820', percent: 18, label: 'Requests in this Month', sub: '(April)' }
    },
    groq: {
        daily: { requests: '842', percent: 65, label: 'Requests Today', sub: '(Sunday)' },
        monthly: { requests: '24,150', percent: 12, label: 'Requests in this Month', sub: '(April)' }
    }
};

let currentAiModel = 'gemini';
let currentAiPeriod = 'daily';

window.setAiModel = function (model) {
    currentAiModel = model;
    const geminiBtn = document.getElementById('btn-ai-gemini');
    const groqBtn = document.getElementById('btn-ai-groq');

    const activeClasses = ['bg-[#15803d]', 'text-white'];
    const inactiveClasses = ['text-black', 'hover:bg-slate-100'];

    if (model === 'gemini') {
        geminiBtn?.classList.add(...activeClasses);
        geminiBtn?.classList.remove(...inactiveClasses);
        groqBtn?.classList.remove(...activeClasses);
        groqBtn?.classList.add(...inactiveClasses);
    } else {
        groqBtn?.classList.add(...activeClasses);
        groqBtn?.classList.remove(...inactiveClasses);
        geminiBtn?.classList.remove(...activeClasses);
        geminiBtn?.classList.add(...inactiveClasses);
    }
    updateAiDisplay();
};

window.setAiPeriod = function (period) {
    currentAiPeriod = period;
    const dailyBtn = document.getElementById('btn-period-daily');
    const monthlyBtn = document.getElementById('btn-period-monthly');

    const activeClasses = ['bg-[#15803d]', 'text-white'];
    const inactiveClasses = ['text-black', 'hover:bg-slate-100'];

    if (period === 'daily') {
        dailyBtn?.classList.add(...activeClasses);
        dailyBtn?.classList.remove(...inactiveClasses);
        monthlyBtn?.classList.remove(...activeClasses);
        monthlyBtn?.classList.add(...inactiveClasses);
    } else {
        monthlyBtn?.classList.add(...activeClasses);
        monthlyBtn?.classList.remove(...inactiveClasses);
        dailyBtn?.classList.remove(...activeClasses);
        dailyBtn?.classList.add(...inactiveClasses);
    }
    updateAiDisplay();
};

function updateAiDisplay() {
    const data = AI_MODEL_DATA[currentAiModel][currentAiPeriod];
    const descEl = document.getElementById('ai-period-desc');
    const reqVal = document.getElementById('ai-requests-value');
    const quotaLabel = document.getElementById('ai-quota-label');

    if (descEl) descEl.innerText = `${data.label} ${data.sub}`;
    if (reqVal) reqVal.innerText = data.requests;
    if (quotaLabel) quotaLabel.innerText = currentAiPeriod === 'daily' ? 'Daily Quota' : 'Monthly Quota';

    window.updateAiUsage(data.percent);
}

window.updateStorageUsage = function (percent, usedGB) {
    const label = document.getElementById('storage-status-label');
    const usedValue = document.getElementById('storage-used-value');
    const percentLabel = document.getElementById('storage-percent-label');
    const bar = document.getElementById('storage-usage-bar');

    let statusLabel = 'HEALTHY';
    let color = '#15803d';

    if (percent > 95) {
        statusLabel = 'FULL';
        color = '#000000';
    } else if (percent > 85) {
        statusLabel = 'CRITICAL';
        color = '#dc2626';
    } else if (percent > 70) {
        statusLabel = 'WARNING';
        color = '#ea580c';
    } else if (percent > 50) {
        statusLabel = 'MODERATE';
        color = '#2563eb';
    }

    if (label) {
        label.innerText = statusLabel;
        label.style.color = color;
    }
    if (usedValue) usedValue.innerText = usedGB;
    if (percentLabel) percentLabel.innerText = `${percent}% full`;
    if (bar) {
        bar.style.width = `${percent}%`;
        bar.style.backgroundColor = color;
    }
};

// =============================================================
// SCHOOL YEAR MANAGEMENT LOGIC
// =============================================================

const schoolYearQuarterOrder = {
    '1st Quarter': 1,
    '2nd Quarter': 2,
    '3rd Quarter': 3,
    '4th Quarter': 4
};

const schoolYearSemesterOrder = {
    '1st Semester': 1,
    '2nd Semester': 2
};

let schoolYearRecords = [];

// Persistence Helpers
const saveSYToStorage = () => {
    localStorage.setItem('sigma_school_year_records', JSON.stringify(schoolYearRecords));
};

const loadSYFromStorage = () => {
    const saved = localStorage.getItem('sigma_school_year_records');
    if (saved) {
        try {
            schoolYearRecords = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to parse school year records', e);
            schoolYearRecords = [];
        }
    }
};

// Initial Load
loadSYFromStorage();

let initialSYValues = {};
let currentSYRecordId = null;

const formatSchoolYearDate = (value) => {
    if (!value) return '—';

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;

    // Returns MM/DD/YYYY
    return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    });
};

const getSortedSchoolYearRecords = () => [...schoolYearRecords].sort((left, right) => {
    if (left.status === 'Active' && right.status !== 'Active') return -1;
    if (left.status !== 'Active' && right.status === 'Active') return 1;

    const leftYear = Number(left.yearStart) || 0;
    const rightYear = Number(right.yearStart) || 0;
    if (leftYear !== rightYear) return leftYear - rightYear;

    const leftSemester = schoolYearSemesterOrder[left.semester] || 99;
    const rightSemester = schoolYearSemesterOrder[right.semester] || 99;
    if (leftSemester !== rightSemester) return leftSemester - rightSemester;

    const leftQuarter = schoolYearQuarterOrder[left.quarter] || 99;
    const rightQuarter = schoolYearQuarterOrder[right.quarter] || 99;
    return leftQuarter - rightQuarter;
});

const getActiveSchoolYearRecord = () => schoolYearRecords.find((record) => record.status === 'Active') || getSortedSchoolYearRecords()[0] || null;

const getSYFormValues = () => ({
    yearStart: document.getElementById('edit-sy-year-start').value.trim(),
    yearEnd: document.getElementById('edit-sy-year-end').value.trim(),
    q1Start: document.getElementById('edit-sy-q1-start').value,
    q1End: document.getElementById('edit-sy-q1-end').value,
    q2Start: document.getElementById('edit-sy-q2-start').value,
    q2End: document.getElementById('edit-sy-q2-end').value,
    q3Start: document.getElementById('edit-sy-q3-start').value,
    q3End: document.getElementById('edit-sy-q3-end').value,
    q4Start: document.getElementById('edit-sy-q4-start').value,
    q4End: document.getElementById('edit-sy-q4-end').value
});

const setSYFormValues = (record) => {
    document.getElementById('edit-sy-year-start').value = record.yearStart || '';

    // Trigger the update of Year End options before setting value
    if (window.updateEndOptions) window.updateEndOptions();

    document.getElementById('edit-sy-year-end').value = record.yearEnd || '';
    document.getElementById('edit-sy-q1-start').value = record.q1Start || '';
    document.getElementById('edit-sy-q1-end').value = record.q1End || '';
    document.getElementById('edit-sy-q2-start').value = record.q2Start || '';
    document.getElementById('edit-sy-q2-end').value = record.q2End || '';
    document.getElementById('edit-sy-q3-start').value = record.q3Start || '';
    document.getElementById('edit-sy-q3-end').value = record.q3End || '';
    document.getElementById('edit-sy-q4-start').value = record.q4Start || '';
    document.getElementById('edit-sy-q4-end').value = record.q4End || '';

    // Apply date constraints based on year values
    window.updateSYDateConstraints();
};

const populateSYYearOptions = () => {
    const startSelect = document.getElementById('edit-sy-year-start');
    const endSelect = document.getElementById('edit-sy-year-end');
    if (!startSelect || !endSelect) return;

    const currentYear = new Date().getFullYear();
    const startValue = startSelect.value;

    // Populate Year Start (Starts at Current Year)
    startSelect.innerHTML = '';
    for (let i = currentYear; i <= currentYear + 10; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i;
        startSelect.appendChild(opt);
    }
    if (startValue) startSelect.value = startValue;

    // Helper to update Year End based on Start
    window.updateEndOptions = () => {
        const selectedStart = parseInt(startSelect.value);
        if (selectedStart) {
            endSelect.value = selectedStart + 1;
        } else {
            endSelect.value = '';
        }
    };

    startSelect.onchange = () => {
        window.updateEndOptions();
        window.updateSYDateConstraints();
    };
    endSelect.onchange = window.updateSYDateConstraints;

    window.updateEndOptions();
};

window.updateSYDateConstraints = function () {
    const yearStart = document.getElementById('edit-sy-year-start')?.value;
    const yearEnd = document.getElementById('edit-sy-year-end')?.value;

    const dateIds = [
        'edit-sy-q1-start', 'edit-sy-q1-end',
        'edit-sy-q2-start', 'edit-sy-q2-end',
        'edit-sy-q3-start', 'edit-sy-q3-end',
        'edit-sy-q4-start', 'edit-sy-q4-end'
    ];

    let lastDate = null;

    dateIds.forEach((id) => {
        const input = document.getElementById(id);
        if (!input) return;

        // 1. Global constraints from year selection
        let min = yearStart ? `${yearStart}-01-01` : '';
        let max = yearEnd ? `${yearEnd}-12-31` : '';

        // 2. Sequential constraints (Next date must be at least 1 day after the previous)
        if (lastDate) {
            const nextDay = new Date(lastDate);
            nextDay.setDate(nextDay.getDate() + 1);
            const minStr = nextDay.toISOString().split('T')[0];
            if (!min || minStr > min) min = minStr;
        }

        if (min) input.min = min; else input.removeAttribute('min');
        if (max) input.max = max; else input.removeAttribute('max');

        // 3. Validation: If current value is invalid based on new constraints, clear it
        if (input.value && min && input.value < min) {
            input.value = '';
        }

        // Update lastDate for the next input in sequence
        if (input.value) {
            lastDate = input.value;
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    populateSYYearOptions();
    renderSchoolYearSummaryBar();
    renderSchoolYearTable();

    // Bind sequential date validation
    const dateIds = [
        'edit-sy-q1-start', 'edit-sy-q1-end',
        'edit-sy-q2-start', 'edit-sy-q2-end',
        'edit-sy-q3-start', 'edit-sy-q3-end',
        'edit-sy-q4-start', 'edit-sy-q4-end'
    ];
    dateIds.forEach(id => {
        document.getElementById(id)?.addEventListener('change', window.updateSYDateConstraints);
    });
});

const renderSchoolYearSummaryBar = () => {
    const activeRecord = getActiveSchoolYearRecord();
    const schoolYearEl = document.getElementById('sy-bar-year');
    const quarterEl = document.getElementById('sy-bar-quarter');
    const globalDisplay = document.getElementById('global-sy-display');

    const now = new Date();
    const currentYear = now.getFullYear();
    const defaultYearRange = `${currentYear}-${currentYear + 1}`;

    if (!activeRecord) {
        if (schoolYearEl) schoolYearEl.textContent = defaultYearRange;
        if (quarterEl) quarterEl.textContent = 'END OF SCHOOL YEAR';
        if (globalDisplay) globalDisplay.textContent = '';
        return;
    }

    // Determine current quarter based on today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentQuarter = null;
    let anyQuarterStarted = false;
    let hasAnyDates = false;

    const quarters = [
        { name: '1st Quarter', start: activeRecord.q1Start, end: activeRecord.q1End },
        { name: '2nd Quarter', start: activeRecord.q2Start, end: activeRecord.q2End },
        { name: '3rd Quarter', start: activeRecord.q3Start, end: activeRecord.q3End },
        { name: '4th Quarter', start: activeRecord.q4Start, end: activeRecord.q4End }
    ];

    for (const q of quarters) {
        if (q.start && q.end) {
            hasAnyDates = true;
            const startDate = new Date(`${q.start}T00:00:00`);

            if (today >= startDate) {
                anyQuarterStarted = true;
                currentQuarter = q.name;
            }
        }
    }

    let allQuartersEnded = true;
    if (anyQuarterStarted) {
        for (const q of quarters) {
            if (q.end) {
                const endDate = new Date(`${q.end}T23:59:59`);
                if (today <= endDate) {
                    allQuartersEnded = false;
                    break;
                }
            }
        }
    } else {
        allQuartersEnded = false;
    }

    const yearRange = `${activeRecord.yearStart}-${activeRecord.yearEnd}`;

    if (!hasAnyDates) {
        // NO SCHEDULE CREATED
        if (schoolYearEl) schoolYearEl.textContent = yearRange;
        if (quarterEl) quarterEl.textContent = 'END OF SCHOOL YEAR';
        if (globalDisplay) globalDisplay.textContent = '';
    } else if (anyQuarterStarted && !allQuartersEnded) {
        // ACTIVE
        const quarterText = currentQuarter ? currentQuarter.toUpperCase() : 'TRANSITION';
        if (schoolYearEl) schoolYearEl.textContent = yearRange;
        if (quarterEl) quarterEl.textContent = quarterText;
        if (globalDisplay) globalDisplay.textContent = `SY ${yearRange} • ${quarterText}`;
    } else if (!anyQuarterStarted) {
        // UPCOMING
        if (schoolYearEl) schoolYearEl.textContent = yearRange;
        if (quarterEl) quarterEl.textContent = 'UPCOMING';
        if (globalDisplay) globalDisplay.textContent = `SY ${yearRange} • UPCOMING`;
    } else {
        // COMPLETED (Year has ended)
        if (schoolYearEl) schoolYearEl.textContent = yearRange;
        if (quarterEl) quarterEl.textContent = 'END OF SCHOOL YEAR';
        if (globalDisplay) globalDisplay.textContent = '';
    }
};

const renderSchoolYearTable = () => {
    const tableBody = document.getElementById('schoolYearTableBody');
    if (!tableBody) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let allQuarters = [];

    schoolYearRecords.forEach((record) => {
        const quarters = [
            { name: '1st Quarter', semester: '1st Semester', start: record.q1Start, end: record.q1End, yearStart: record.yearStart, yearEnd: record.yearEnd, id: record.id },
            { name: '2nd Quarter', semester: '1st Semester', start: record.q2Start, end: record.q2End, yearStart: record.yearStart, yearEnd: record.yearEnd, id: record.id },
            { name: '3rd Quarter', semester: '2nd Semester', start: record.q3Start, end: record.q3End, yearStart: record.yearStart, yearEnd: record.yearEnd, id: record.id },
            { name: '4th Quarter', semester: '2nd Semester', start: record.q4Start, end: record.q4End, yearStart: record.yearStart, yearEnd: record.yearEnd, id: record.id }
        ];

        quarters.forEach((q) => {
            if (q.start) {
                allQuarters.push(q);
            }
        });
    });

    // Sort by startDate DESCENDING so the latest quarters are on top
    allQuarters.sort((a, b) => new Date(b.start) - new Date(a.start));

    const rows = allQuarters.map((q) => {
        let status = 'InActive';
        let statusClass = 'text-red-500';
        let rowClass = '';

        // Robust date parsing (ensures local time consistency)
        const startDate = new Date(`${q.start}T00:00:00`);
        const endDate = new Date(`${q.end || q.start}T23:59:59`);

        if (today > endDate) {
            status = 'Completed';
            statusClass = 'text-black';
            rowClass = '';
        } else if (today >= startDate && today <= endDate) {
            status = 'Active';
            statusClass = 'text-[#15803d]';
            rowClass = 'bg-green-50/20';
        } else {
            // Future dates
            status = 'InActive';
            statusClass = 'text-red-500';
            rowClass = '';
        }

        return `
            <tr class="transition-colors border-b border-slate-50 ${rowClass}">
                <td class="px-4 py-6 text-center">
                    <div class="text-sm font-medium text-black">${q.yearStart}</div>
                </td>
                <td class="px-4 py-6 text-center">
                    <div class="text-sm font-medium text-black">${q.yearEnd}</div>
                </td>
                <td class="px-4 py-6 text-center">
                    <div class="text-sm font-medium text-black">${q.name}</div>
                </td>
                <td class="px-4 py-6 text-center">
                    <div class="text-sm font-medium text-black">${formatSchoolYearDate(q.start)}</div>
                </td>
                <td class="px-4 py-6 text-center">
                    <div class="text-sm font-medium text-black">${formatSchoolYearDate(q.end)}</div>
                </td>
                <td class="px-4 py-6 text-center">
                    <div class="text-sm font-medium ${statusClass}">${status}</div>
                </td>
                <td class="px-4 py-6 text-center">
                    <div class="flex justify-center items-center">
                        <button onclick="window.openSYEditor(${q.id})" 
                            class="w-10 h-10 rounded-full flex items-center justify-center text-black transition-colors group" 
                            title="Edit School Year">
                            <i class="fa-regular fa-pen-to-square text-lg group-hover:text-[#FFD000]"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    const fillerRows = Array.from({ length: Math.max(0, 8 - rows.length) }, () => (
        '<tr class="h-16"><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>'
    ));

    tableBody.innerHTML = [...rows, ...fillerRows].join('');
    renderSchoolYearSummaryBar();
};

window.openSYEditor = function (recordId = null) {
    const overlay = document.getElementById('sy-edit-overlay');
    const title = document.getElementById('sy-editor-title');
    const saveLabel = document.getElementById('sy-save-label');
    if (!overlay || !title || !saveLabel) return;

    const existingRecord = recordId !== null ? schoolYearRecords.find((record) => String(record.id) === String(recordId)) : null;
    const activeRecord = getActiveSchoolYearRecord();

    currentSYRecordId = existingRecord ? existingRecord.id : null;

    if (existingRecord) {
        setSYFormValues(existingRecord);
        title.textContent = 'Edit School Year';
        saveLabel.textContent = 'Save Changes';
        document.getElementById('sy-delete-btn')?.classList.remove('hidden');
        document.getElementById('sy-discard-btn')?.classList.add('hidden');
    } else {
        setSYFormValues({
            yearStart: activeRecord?.yearStart || String(new Date().getFullYear()),
            yearEnd: activeRecord?.yearEnd || String(new Date().getFullYear() + 1),
            semester: activeRecord?.semester || '1st Semester',
            quarter: activeRecord?.quarter || '1st Quarter',
            dateStart: '',
            dateEnd: '',
            status: 'Inactive'
        });
        title.textContent = 'Create School Year';
        saveLabel.textContent = 'Create School Year';
        document.getElementById('sy-delete-btn')?.classList.add('hidden');
        document.getElementById('sy-discard-btn')?.classList.remove('hidden');
    }

    document.body.classList.add('sy-edit-mode');
    overlay.classList.remove('hidden');
    overlay.scrollTop = 0;
    initialSYValues = getSYFormValues();
};

window.toggleSYOverlay = function (show) {
    const overlay = document.getElementById('sy-edit-overlay');
    if (!overlay) return;

    if (show) {
        window.openSYEditor();
        return;
    }

    overlay.classList.add('hidden');
    overlay.scrollTop = 0;
    document.body.classList.remove('sy-edit-mode');
    currentSYRecordId = null;
};

window.hasSYChanges = function () {
    return JSON.stringify(initialSYValues) !== JSON.stringify(getSYFormValues());
};

window.showSYConfirm = function (title, desc, onProceed, proceedLabel = 'Proceed', cancelLabel = 'Cancel') {
    const overlay = document.getElementById('sy-confirm-overlay');
    const titleEl = document.getElementById('sy-confirm-title');
    const descEl = document.getElementById('sy-confirm-desc');
    const cancelBtn = document.getElementById('sy-confirm-cancel');
    const proceedBtn = document.getElementById('sy-confirm-proceed');

    if (!overlay || !titleEl || !descEl || !cancelBtn || !proceedBtn) return;

    titleEl.textContent = title;
    descEl.textContent = desc;
    proceedBtn.textContent = proceedLabel;
    cancelBtn.textContent = cancelLabel;

    // Change button color to red if it's a delete action
    if (proceedLabel === 'Delete') {
        proceedBtn.className = 'py-4 bg-red-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-100 transition-all';
    } else {
        proceedBtn.className = 'py-4 bg-[#15803d] text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#166534] shadow-lg shadow-green-100 transition-all';
    }

    overlay.classList.remove('hidden');

    const close = () => overlay.classList.add('hidden');

    cancelBtn.onclick = close;
    proceedBtn.onclick = () => {
        onProceed();
        close();
    };
};

window.handleSYExit = function () {
    if (window.hasSYChanges()) {
        window.showSYConfirm(
            'Discard Changes?',
            'You have unsaved modifications to the school year settings. Are you sure you want to exit?',
            () => window.toggleSYOverlay(false)
        );
    } else {
        window.toggleSYOverlay(false);
    }
};

window.handleSYDiscard = window.handleSYExit;

window.handleSYDelete = function () {
    window.showSYConfirm(
        'Delete Schedule Data?',
        'Are you sure you want to delete all the dates for the quarters in this school year? This action will update the schedule immediately.',
        () => {
            const dateInputs = [
                'edit-sy-q1-start', 'edit-sy-q1-end',
                'edit-sy-q2-start', 'edit-sy-q2-end',
                'edit-sy-q3-start', 'edit-sy-q3-end',
                'edit-sy-q4-start', 'edit-sy-q4-end'
            ];
            dateInputs.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });

            // Auto-save after clearing
            const formValues = getSYFormValues();
            formValues.status = currentSYRecordId !== null
                ? (schoolYearRecords.find(r => r.id === currentSYRecordId)?.status || 'Inactive')
                : 'Inactive';
            window.performSYSave(formValues);
        },
        'Delete',
        'Cancel'
    );
};

window.performSYSave = function (formValues) {
    const saveBtn = document.getElementById('sy-save-btn');
    const loading = document.getElementById('sy-save-loading');

    if (saveBtn && loading) {
        saveBtn.disabled = true;
        loading.classList.remove('hidden');

        // Simulate API Call
        setTimeout(() => {
            const savedRecord = {
                id: currentSYRecordId || Date.now(),
                ...formValues,
                status: 'Active'
            };

            if (currentSYRecordId !== null) {
                schoolYearRecords = schoolYearRecords.map((record) => (
                    record.id === currentSYRecordId ? savedRecord : { ...record, status: 'Inactive' }
                ));
            } else {
                schoolYearRecords = schoolYearRecords.map(r => ({ ...r, status: 'Inactive' }));
                schoolYearRecords = [savedRecord, ...schoolYearRecords];
            }

            renderSchoolYearTable();
            updateGlobalSYDisplay();
            saveSYToStorage(); // Save to localStorage
            initialSYValues = {};
            saveBtn.disabled = false;
            loading.classList.add('hidden');
            window.toggleSYOverlay(false);
        }, 1500);
    }
};

window.handleSYSave = function () {
    const formValues = getSYFormValues();
    const isEditing = currentSYRecordId !== null;
    const actionLabel = isEditing ? 'Save School Year?' : 'Create School Year?';
    const actionDescription = isEditing
        ? 'Are you sure you want to apply these updates to the school year configuration?'
        : 'Are you sure you want to create this school year configuration?';

    if (!formValues.yearStart || !formValues.yearEnd) {
        alert('Please provide both Year Start and Year End.');
        return;
    }

    if (Number(formValues.yearEnd) < Number(formValues.yearStart)) {
        alert('Year End must be equal to or greater than Year Start.');
        return;
    }

    formValues.status = isEditing ? (schoolYearRecords.find(r => r.id === currentSYRecordId)?.status || 'Inactive') : 'Inactive';

    window.showSYConfirm(
        actionLabel,
        actionDescription,
        () => window.performSYSave(formValues)
    );
};



// =============================================================
// SCHOOL PROFILE MANAGEMENT LOGIC
// =============================================================

let initialProfileValues = {};

window.toggleProfileOverlay = function (show) {
    const overlay = document.getElementById('profile-edit-overlay');
    if (show) {
        overlay.classList.remove('hidden');
        // Capture initial values to detect changes
        initialProfileValues = {
            name: document.getElementById('edit-profile-name').value,
            motto: document.getElementById('edit-profile-motto').value,
            id: document.getElementById('edit-profile-id').value,
            vision: document.getElementById('edit-profile-vision').value,
            mission: document.getElementById('edit-profile-mission').value,
            address: document.getElementById('edit-profile-address').value,
            city: document.getElementById('edit-profile-city').value,
            contact: document.getElementById('edit-profile-contact').value,
            email: document.getElementById('edit-profile-email').value
        };
    } else {
        overlay.classList.add('hidden');
    }
};

window.hasProfileChanges = function () {
    const currentValues = {
        name: document.getElementById('edit-profile-name').value,
        motto: document.getElementById('edit-profile-motto').value,
        id: document.getElementById('edit-profile-id').value,
        vision: document.getElementById('edit-profile-vision').value,
        mission: document.getElementById('edit-profile-mission').value,
        address: document.getElementById('edit-profile-address').value,
        city: document.getElementById('edit-profile-city').value,
        contact: document.getElementById('edit-profile-contact').value,
        email: document.getElementById('edit-profile-email').value
    };
    return JSON.stringify(initialProfileValues) !== JSON.stringify(currentValues);
};

window.showProfileConfirm = function (title, desc, onProceed) {
    const overlay = document.getElementById('profile-confirm-overlay');
    const titleEl = document.getElementById('profile-confirm-title');
    const descEl = document.getElementById('profile-confirm-desc');
    const cancelBtn = document.getElementById('profile-confirm-cancel');
    const proceedBtn = document.getElementById('profile-confirm-proceed');

    if (!overlay || !titleEl || !descEl || !cancelBtn || !proceedBtn) return;

    titleEl.textContent = title;
    descEl.textContent = desc;
    overlay.classList.remove('hidden');

    const close = () => overlay.classList.add('hidden');

    cancelBtn.onclick = close;
    proceedBtn.onclick = () => {
        onProceed();
        close();
    };
};

window.handleProfileExit = function () {
    if (window.hasProfileChanges()) {
        window.showProfileConfirm(
            'Discard Changes?',
            'You have unsaved modifications to the institutional profile. Are you sure you want to exit?',
            () => window.toggleProfileOverlay(false)
        );
    } else {
        window.toggleProfileOverlay(false);
    }
};

window.handleProfileDiscard = window.handleProfileExit;

window.handleProfileSave = function () {
    window.showProfileConfirm(
        'Save Institutional Profile?',
        'Are you sure you want to apply these updates to the school profile database?',
        () => {
            const saveBtn = document.getElementById('profile-save-btn');
            const loading = document.getElementById('profile-save-loading');

            if (saveBtn && loading) {
                saveBtn.disabled = true;
                loading.classList.remove('hidden');

                // Simulate API Call
                setTimeout(() => {
                    saveBtn.disabled = false;
                    loading.classList.add('hidden');
                    const profile = getOrganizationProfile();
                    saveOrganizationProfile({
                        ...profile,
                        schoolName: document.getElementById('edit-profile-name').value.trim() || profile.schoolName,
                        motto: document.getElementById('edit-profile-motto').value.trim(),
                        schoolId: document.getElementById('edit-profile-id').value.trim(),
                        vision: document.getElementById('edit-profile-vision').value.trim(),
                        mission: document.getElementById('edit-profile-mission').value.trim(),
                        address: document.getElementById('edit-profile-address').value.trim(),
                        city: document.getElementById('edit-profile-city').value.trim(),
                        contactNumber: document.getElementById('edit-profile-contact').value.trim(),
                        emailAddress: document.getElementById('edit-profile-email').value.trim()
                    });
                    syncProfileDisplay();
                    window.toggleProfileOverlay(false);
                }, 1500);
            }
        }
    );
};

// =============================================================
// SECTION MANAGEMENT LOGIC
// =============================================================

let initialSectionValues = {};
window.currentSectionStep = 1;
window.isEditingSection = false;

window.toggleSectionOverlay = function (show, sectionId = null) {
    const overlay = document.getElementById('section-edit-overlay');
    const titleEl = document.getElementById('section-modal-title');
    window.currentEditingSectionId = sectionId;

    if (show) {
        document.body.classList.add('section-edit-mode');
        overlay.classList.remove('hidden');
        overlay.scrollTop = 0;
        window.currentSectionStep = 1;
        window.handleSectionStep(1);

        window.selectedSectionStudents = [];
        window.renderSelectedStudents();

        if (sectionId) {
            const sections = getStoredJson(SECTIONS_STORAGE_KEY, []);
            const sec = sections.find(s => String(s.id) === String(sectionId));
            if (sec) {
                document.getElementById('edit-section-name').value = sec.name || '';
                document.getElementById('edit-section-grade').value = sec.grade || '';
                document.getElementById('edit-section-room').value = sec.room || '';
                document.getElementById('edit-section-teacher').value = sec.teacher || '';
                document.getElementById('edit-section-role').value = sec.role || 'Teacher';
                document.getElementById('edit-section-subject').value = sec.subject || '';

                window.populateSectionSchoolYearDropdown(sec.schoolYear || '');

                window.selectedSectionStudents = sec.students || [];
                window.renderSelectedStudents();

                if (titleEl) titleEl.textContent = 'Edit Section';
                document.getElementById('section-delete-btn')?.classList.remove('hidden');
            }
        } else {
            // Reset form for new section
            document.getElementById('edit-section-name').value = '';
            document.getElementById('edit-section-grade').value = '';
            document.getElementById('edit-section-room').value = '';
            document.getElementById('edit-section-teacher').value = '';
            document.getElementById('edit-section-role').value = 'Teacher';
            document.getElementById('edit-section-subject').value = '';

            // Pre-select the active school year, if any
            const activeSY = schoolYearRecords.find(r => r.status === 'Active');
            const activeSYLabel = activeSY ? `${activeSY.yearStart}\u2013${activeSY.yearEnd}` : '';
            window.populateSectionSchoolYearDropdown(activeSYLabel);

            if (titleEl) titleEl.textContent = 'Create Section';
            document.getElementById('section-delete-btn')?.classList.add('hidden');
        }

        window.validateSectionStep1();

        // Capture state for change detection
        initialSectionValues = {
            name: document.getElementById('edit-section-name')?.value || '',
            grade: document.getElementById('edit-section-grade')?.value || '',
            room: document.getElementById('edit-section-room')?.value || '',
            schoolYear: document.getElementById('edit-section-school-year')?.value || '',
            teacher: document.getElementById('edit-section-teacher')?.value || '',
            role: document.getElementById('edit-section-role')?.value || '',
            subject: document.getElementById('edit-section-subject')?.value || ''
        };

        // Initialize Teacher, Subject, and Student Dropdowns
        if (typeof window.initSectionDropdowns === 'function') {
            window.initSectionDropdowns();
        }
        if (typeof window.initStudentDropdown === 'function') {
            window.initStudentDropdown();
        }
    } else {
        overlay.classList.add('hidden');
        overlay.scrollTop = 0;
        document.body.classList.remove('section-edit-mode');
    }
};

window.handleSectionStep = function (step) {
    window.currentSectionStep = step;

    const bar1 = document.getElementById('section-step-bar-1-label');
    const track1 = document.getElementById('section-step-bar-1-track');
    const bar2 = document.getElementById('section-step-bar-2-label');
    const track2 = document.getElementById('section-step-bar-2-track');
    const step1 = document.getElementById('section-step-1');
    const step2 = document.getElementById('section-step-2');

    if (step === 1) {
        step1?.classList.remove('hidden');
        step2?.classList.add('hidden');

        // Step 1 Active
        bar1.classList.remove('text-slate-300');
        bar1.classList.add('text-[#15803d]');
        track1.classList.remove('bg-transparent');
        track1.classList.add('bg-[#15803d]');

        // Step 2 Inactive
        bar2.classList.remove('text-[#15803d]');
        bar2.classList.add('text-slate-300');
        track2.classList.remove('bg-[#15803d]');
        track2.classList.add('bg-transparent');

        document.getElementById('section-back-btn')?.classList.add('hidden');
        document.getElementById('section-next-btn')?.classList.remove('hidden');
        document.getElementById('section-draft-btn')?.classList.add('hidden');
        document.getElementById('section-save-btn')?.classList.add('hidden');
        window.validateSectionStep1();
    } else {
        step1?.classList.add('hidden');
        step2?.classList.remove('hidden');

        // Keep Step 1 Colored (Progress)
        bar1.classList.remove('text-slate-300');
        bar1.classList.add('text-[#15803d]');
        track1.classList.remove('bg-transparent');
        track1.classList.add('bg-[#15803d]');

        // Step 2 Active
        bar2.classList.remove('text-slate-300');
        bar2.classList.add('text-[#15803d]');
        track2.classList.remove('bg-transparent');
        track2.classList.add('bg-[#15803d]');

        document.getElementById('section-back-btn')?.classList.remove('hidden');
        document.getElementById('section-next-btn')?.classList.add('hidden');
        document.getElementById('section-draft-btn')?.classList.remove('hidden');
        document.getElementById('section-save-btn')?.classList.remove('hidden');
    }
};

window.validateSectionStep1 = function () {
    const name = document.getElementById('edit-section-name')?.value.trim() || '';
    const grade = document.getElementById('edit-section-grade')?.value || '';
    const room = document.getElementById('edit-section-room')?.value.trim() || '';
    const schoolYear = document.getElementById('edit-section-school-year')?.value || '';
    const nextBtn = document.getElementById('section-next-btn');

    if (nextBtn) {
        nextBtn.disabled = !(name && grade && room && schoolYear);
    }
};

window.populateSectionSchoolYearDropdown = function (selectedValue = '') {
    const select = document.getElementById('edit-section-school-year');
    if (!select) return;

    // Rebuild options
    select.innerHTML = '<option value="" disabled hidden>Select School Year</option>';

    const records = [...schoolYearRecords].sort((a, b) => {
        const ya = Number(a.yearStart) || 0;
        const yb = Number(b.yearStart) || 0;
        return yb - ya; // most recent first
    });

    if (records.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.disabled = true;
        opt.textContent = 'No school years configured';
        select.appendChild(opt);
    } else {
        records.forEach(record => {
            const label = `${record.yearStart}–${record.yearEnd}`;
            const opt = document.createElement('option');
            opt.value = label;
            opt.textContent = label + (record.status === 'Active' ? ' (Active)' : '');
            if (label === selectedValue) opt.selected = true;
            select.appendChild(opt);
        });
    }

    // If nothing matched, fall back to placeholder selected
    if (!selectedValue) {
        select.selectedIndex = 0;
    }
};

window.handleSectionNext = function () {
    if (window.currentSectionStep === 1) {
        window.handleSectionStep(2);
    }
};

window.handleSectionBack = function () {
    if (window.currentSectionStep === 2) {
        window.handleSectionStep(1);
    }
};

window.hasSectionChanges = function () {
    const currentValues = {
        name: document.getElementById('edit-section-name')?.value || '',
        grade: document.getElementById('edit-section-grade')?.value || '',
        room: document.getElementById('edit-section-room')?.value || '',
        schoolYear: document.getElementById('edit-section-school-year')?.value || '',
        teacher: document.getElementById('edit-section-teacher')?.value || '',
        role: document.getElementById('edit-section-role')?.value || '',
        subject: document.getElementById('edit-section-subject')?.value || ''
    };
    return JSON.stringify(initialSectionValues) !== JSON.stringify(currentValues);
};

window.deleteSection = function () {
    if (!window.currentEditingSectionId) return;

    window.showSectionConfirm(
        'Delete Section?',
        'This action cannot be undone. All class records for this section will be removed permanently.',
        () => {
            const sections = getStoredJson(SECTIONS_STORAGE_KEY, []);
            const newSections = sections.filter(s => String(s.id) !== String(window.currentEditingSectionId));
            saveStoredJson(SECTIONS_STORAGE_KEY, newSections);

            window.toggleSectionOverlay(false);
            if (typeof renderSectionsTable === 'function') {
                renderSectionsTable();
            }
        }
    );
};

window.showSectionConfirm = function (title, desc, onProceed) {
    const overlay = document.getElementById('section-confirm-overlay');
    const titleEl = document.getElementById('section-confirm-title');
    const descEl = document.getElementById('section-confirm-desc');
    const cancelBtn = document.getElementById('section-confirm-cancel');
    const proceedBtn = document.getElementById('section-confirm-proceed');

    if (!overlay || !titleEl || !descEl || !cancelBtn || !proceedBtn) return;

    titleEl.textContent = title;
    descEl.textContent = desc;
    overlay.classList.remove('hidden');

    const close = () => overlay.classList.add('hidden');
    cancelBtn.onclick = close;
    proceedBtn.onclick = () => {
        onProceed();
        close();
    };
};

window.handleSectionExit = function () {
    if (window.hasSectionChanges()) {
        window.showSectionConfirm(
            'Discard Changes?',
            'You have unsaved modifications to this section. Are you sure you want to exit?',
            () => window.toggleSectionOverlay(false)
        );
    } else {
        window.toggleSectionOverlay(false);
    }
};

window.editSection = function (id) {
    window.toggleSectionOverlay(true, id);
};

window.validateSectionDeployment = function () {
    const name = document.getElementById('edit-section-name')?.value.trim();
    const grade = document.getElementById('edit-section-grade')?.value;
    const room = document.getElementById('edit-section-room')?.value.trim();
    const teacher = document.getElementById('edit-section-teacher')?.value.trim();
    const role = document.getElementById('edit-section-role')?.value;
    const subject = document.getElementById('edit-section-subject')?.value.trim();
    const studentCount = window.selectedSectionStudents?.length || 0;

    const isEligible = name && grade && room && teacher && role && subject && studentCount > 0;

    const deployBtn = document.getElementById('section-save-btn');
    const draftBtn = document.getElementById('section-draft-btn');

    if (deployBtn) {
        deployBtn.disabled = !isEligible;
        deployBtn.style.opacity = isEligible ? '1' : '0.5';
        deployBtn.style.cursor = isEligible ? 'pointer' : 'not-allowed';
    }
    if (draftBtn) {
        draftBtn.disabled = !isEligible;
        draftBtn.style.opacity = isEligible ? '1' : '0.5';
        draftBtn.style.cursor = isEligible ? 'pointer' : 'not-allowed';
    }
};

window.handleSectionSave = function (status) {
    const title = status === 'Deployed' ? 'Do you want to deploy this section?' : 'Do you want to save this as a draft?';
    const desc = status === 'Deployed'
        ? 'This will make the section available for enrollment and scheduling.'
        : 'The section will be saved as a draft and can be deployed later.';

    window.showSectionConfirm(title, desc, () => {
        const btnId = status === 'Deployed' ? 'section-save-btn' : 'section-draft-btn';
        const loadingId = status === 'Deployed' ? 'section-save-loading' : 'section-draft-loading';

        const saveBtn = document.getElementById(btnId);
        const loading = document.getElementById(loadingId);

        if (saveBtn && loading) {
            saveBtn.disabled = true;
            loading.classList.remove('hidden');

            setTimeout(() => {
                const sectionData = {
                    id: window.currentEditingSectionId || `SEC-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                    name: document.getElementById('edit-section-name').value.trim(),
                    grade: document.getElementById('edit-section-grade').value,
                    room: document.getElementById('edit-section-room').value.trim(),
                    schoolYear: document.getElementById('edit-section-school-year').value,
                    teacher: document.getElementById('edit-section-teacher').value.trim(),
                    role: document.getElementById('edit-section-role').value,
                    subject: document.getElementById('edit-section-subject').value.trim(),
                    students: window.selectedSectionStudents || [],
                    studentsCount: window.selectedSectionStudents.length,
                    status: status, // 'Deployed' or 'Draft'
                    updatedAt: new Date().toISOString(),
                    createdAt: window.currentEditingSectionCreatedAt || new Date().toISOString()
                };

                const sections = getStoredJson(SECTIONS_STORAGE_KEY, []);
                const existingIndex = sections.findIndex(s => String(s.id) === String(sectionData.id));

                if (existingIndex !== -1) {
                    sections[existingIndex] = { ...sections[existingIndex], ...sectionData };
                } else {
                    sections.push(sectionData);
                }

                saveStoredJson(SECTIONS_STORAGE_KEY, sections);

                saveBtn.disabled = false;
                loading.classList.add('hidden');
                window.toggleSectionOverlay(false);

                if (typeof renderSectionsTable === 'function') {
                    renderSectionsTable();
                }
            }, 1500);
        }
    });
};

// =============================================================
// SECTION DROPDOWN LOGIC (TEACHERS & SUBJECTS)
// =============================================================

window.initSectionDropdowns = function () {
    const teacherInput = document.getElementById('edit-section-teacher');
    const teacherList = document.getElementById('teacher-dropdown-list');
    const subjectInput = document.getElementById('edit-section-subject');
    const subjectList = document.getElementById('subject-dropdown-list');

    if (teacherInput && teacherList) {
        teacherInput.addEventListener('focus', () => {
            window.populateTeacherDropdown(teacherInput.value);
            teacherList.classList.remove('hidden');
        });

        teacherInput.addEventListener('input', () => {
            window.populateTeacherDropdown(teacherInput.value);
            teacherList.classList.remove('hidden');
            window.validateSectionDeployment();
        });

        // Close dropdown when clicking outside
        const closeTeacherDropdown = (e) => {
            if (!teacherInput.contains(e.target) && !teacherList.contains(e.target)) {
                teacherList.classList.add('hidden');
            }
        };
        document.addEventListener('click', closeTeacherDropdown);
    }

    if (subjectInput && subjectList) {
        subjectInput.addEventListener('focus', () => {
            window.populateSubjectDropdown(subjectInput.value);
            subjectList.classList.remove('hidden');
        });

        subjectInput.addEventListener('input', () => {
            window.populateSubjectDropdown(subjectInput.value);
            subjectList.classList.remove('hidden');
            window.validateSectionDeployment();
        });

        // Close dropdown when clicking outside
        const closeSubjectDropdown = (e) => {
            if (!subjectInput.contains(e.target) && !subjectList.contains(e.target)) {
                subjectList.classList.add('hidden');
            }
        };
        document.addEventListener('click', closeSubjectDropdown);
    }

    // Add validation listeners for basic fields
    ['edit-section-name', 'edit-section-grade', 'edit-section-room', 'edit-section-role'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => window.validateSectionDeployment());
            el.addEventListener('change', () => window.validateSectionDeployment());
        }
    });
};

window.selectedSectionStudents = [];

window.initStudentDropdown = function () {
    const searchInput = document.getElementById('edit-section-student-search');
    const list = document.getElementById('student-dropdown-list');

    if (searchInput && list) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim();
            if (query.length >= 1) {
                window.populateStudentDropdown(query);
                list.classList.remove('hidden');
            } else {
                list.classList.add('hidden');
            }
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !list.contains(e.target)) {
                list.classList.add('hidden');
            }
        });
    }
};

window.populateStudentDropdown = function (query = '') {
    const list = document.getElementById('student-dropdown-list');
    if (!list) return;

    const users = getStoredJson(USER_STORAGE_KEY, []);

    // Broaden role check to catch any variation of 'student'
    const students = users.filter(u => {
        const r = String(u.role || u.type || '').toLowerCase().trim();
        return r === 'student' || r.startsWith('stud');
    });

    const filtered = students.filter(s => {
        const q = query.toLowerCase().trim();
        if (!q) return false;

        const fname = String(s.firstName || s.firstname || '').toLowerCase();
        const mname = String(s.middleName || s.middlename || '').toLowerCase();
        const lname = String(s.lastName || s.lastname || '').toLowerCase();
        const full = String(s.fullName || '').toLowerCase();
        const sid = String(s.uid || s.id || '').toLowerCase();

        return fname.includes(q) ||
            mname.includes(q) ||
            lname.includes(q) ||
            full.includes(q) ||
            sid.includes(q);
    }).filter(s => {
        // Ensure we don't show students already in the list
        const currentId = String(s.uid || s.id);
        return !window.selectedSectionStudents.some(sel => String(sel.id) === currentId);
    });

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                No students found
            </div>
        `;
        return;
    }

    list.innerHTML = filtered.map(s => {
        const id = s.uid || s.id;
        const lastName = s.lastName || s.lastname || '';
        const firstName = s.firstName || s.firstname || '';
        const middleName = s.middleName || s.middlename || '';
        const name = `${lastName}, ${firstName} ${middleName}`.trim().replace(/\s+,/, ',');

        return `
            <button type="button" 
                onclick="window.addSectionStudent('${id}')"
                class="w-full text-left px-6 py-4 hover:bg-slate-100 transition-all border-b border-slate-50 last:border-0 group">
                <div class="flex items-center">
                    <div class="w-[120px] shrink-0">
                        <p class="text-sm font-bold text-black tracking-tight">${escapeHtml(id)}</p>
                    </div>
                    <div class="flex-1 text-center">
                        <p class="text-sm font-bold text-black tracking-tight">${escapeHtml(name)}</p>
                    </div>
                    <div class="w-[20px] flex justify-end">
                        <i class="fa-solid fa-plus text-[10px] text-slate-300 group-hover:text-black transition-colors"></i>
                    </div>
                </div>
            </button>
        `;
    }).join('');
};

window.addSectionStudent = function (studentId) {
    const users = getStoredJson(USER_STORAGE_KEY, []);
    const student = users.find(u => String(u.uid || u.id) === String(studentId));

    if (student) {
        const id = student.uid || student.id;
        if (!window.selectedSectionStudents.some(s => String(s.id) === String(id))) {
            const lastName = student.lastName || student.lastname || '';
            const firstName = student.firstName || student.firstname || '';
            const middleName = student.middleName || student.middlename || '';
            const name = `${lastName}, ${firstName} ${middleName}`.trim().replace(/\s+,/, ',');

            window.selectedSectionStudents.push({
                id: id,
                lastName: lastName,
                firstName: firstName,
                middleName: middleName,
                name: name,
                email: student.email || ''
            });
            window.renderSelectedStudents();
            window.validateSectionDeployment();

            // Clear search
            const searchInput = document.getElementById('edit-section-student-search');
            if (searchInput) searchInput.value = '';
            document.getElementById('student-dropdown-list')?.classList.add('hidden');
        }
    }
};

window.removeSectionStudent = function (studentId) {
    window.selectedSectionStudents = window.selectedSectionStudents.filter(s => String(s.id) !== String(studentId));
    window.renderSelectedStudents();
    window.validateSectionDeployment();
};

window.renderSelectedStudents = function () {
    const tbody = document.getElementById('selected-students-table-body');
    const countEl = document.getElementById('selected-students-count');
    if (!tbody) return;

    if (countEl) countEl.textContent = `${window.selectedSectionStudents.length} Students`;

    if (window.selectedSectionStudents.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="py-12">
                    <div class="flex flex-col items-center justify-center opacity-30">
                        <i class="fa-solid fa-user-plus text-2xl mb-2 text-black"></i>
                        <span class="text-[9px] font-black uppercase tracking-widest text-black">No students assigned yet</span>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    // Sort alphabetically by last name then first name
    const sorted = [...window.selectedSectionStudents].sort((a, b) => {
        const nameA = `${a.lastName || ''}, ${a.firstName || ''}`.toLowerCase();
        const nameB = `${b.lastName || ''}, ${b.firstName || ''}`.toLowerCase();
        return nameA.localeCompare(nameB);
    });

    tbody.innerHTML = sorted.map((s, index) => `
        <tr class="${index % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'} hover:bg-slate-100/50 transition-colors group">
            <td class="px-6 py-4 text-xs font-bold text-black">${index + 1}</td>
            <td class="px-6 py-4 text-xs font-bold text-black uppercase tracking-tight">${escapeHtml(s.id)}</td>
            <td class="px-6 py-4 text-xs font-bold text-black tracking-tight">${escapeHtml(s.name)}</td>
            <td class="px-6 py-4 text-center">
                <button type="button" onclick="window.removeSectionStudent('${s.id}')"
                    class="w-8 h-8 rounded-full inline-flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all">
                    <i class="fa-solid fa-xmark text-xs"></i>
                </button>
            </td>
        </tr>
    `).join('');
};

window.populateTeacherDropdown = function (query = '') {
    const list = document.getElementById('teacher-dropdown-list');
    if (!list) return;

    const users = getStoredJson(USER_STORAGE_KEY, []);
    const teachers = users.filter(u => {
        const role = (u.type || u.role || '').toLowerCase();
        return role === 'teacher';
    });

    const filtered = teachers.filter(t => {
        const fullName = `${t.firstName || ''} ${t.lastName || ''}`.toLowerCase();
        return fullName.includes(query.toLowerCase());
    });

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">
                No teachers found
            </div>
        `;
        return;
    }

    list.innerHTML = filtered.map(t => `
        <button type="button" 
            onclick="window.selectSectionTeacher('${escapeHtml(t.firstName)} ${escapeHtml(t.lastName)}')"
            class="w-full text-left px-6 py-4 hover:bg-slate-100 transition-all border-b border-slate-50 last:border-0 group">
            <div class="flex items-center gap-3">
                <div>
                    <p class="text-sm font-bold text-black tracking-tight">${escapeHtml(t.firstName)} ${escapeHtml(t.lastName)}</p>
                </div>
            </div>
        </button>
    `).join('');
};

window.selectSectionTeacher = function (name) {
    const input = document.getElementById('edit-section-teacher');
    const list = document.getElementById('teacher-dropdown-list');
    if (input) input.value = name;
    if (list) list.classList.add('hidden');
    window.validateSectionDeployment();
};

window.populateSubjectDropdown = function (query = '') {
    const list = document.getElementById('subject-dropdown-list');
    if (!list) return;

    const subjects = getStoredJson(SUBJECTS_STORAGE_KEY, []);
    const filtered = subjects.filter(s => {
        const name = (s.name || '').toLowerCase();
        const code = (s.code || '').toLowerCase();
        return name.includes(query.toLowerCase()) || code.includes(query.toLowerCase());
    });

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">
                No subjects found
            </div>
        `;
        return;
    }

    list.innerHTML = filtered.map(s => `
        <button type="button" 
            onclick="window.selectSectionSubject('${escapeHtml(s.name)}')"
            class="w-full text-left px-6 py-4 hover:bg-slate-100 transition-all border-b border-slate-50 last:border-0 group">
            <div class="flex items-center gap-3">
                <div>
                    <p class="text-sm font-bold text-black tracking-tight">${escapeHtml(s.name)}</p>
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">${escapeHtml(s.code)}</p>
                </div>
            </div>
        </button>
    `).join('');
};

window.selectSectionSubject = function (name) {
    const input = document.getElementById('edit-section-subject');
    const list = document.getElementById('subject-dropdown-list');
    if (input) input.value = name;
    if (list) list.classList.add('hidden');
    window.validateSectionDeployment();
};

// =============================================================
// SUBJECT MANAGEMENT LOGIC
// =============================================================

let initialSubjectValues = {};
window.currentSubjectTopics = [];
window.topicTemplates = ['image/Topic.jpg', 'image/Topic2.jpg'];
window.uploadedTemplates = []; // Track uploaded separately to allow deletion

window.currentSubjectStep = 1;

window.isEditingSubject = false;
window.originalEditingSubjectState = "";

window.editSubject = function (code) {
    const subjects = getStoredJson(SUBJECTS_STORAGE_KEY, []);
    const subject = subjects.find(s => s.code === code);
    if (!subject) return;

    window.isEditingSubject = true;
    // Capture state for change detection
    window.originalEditingSubjectState = JSON.stringify({
        code: subject.code || "",
        name: subject.name || "",
        units: subject.units || "",
        type: subject.type || "Core",
        strand: subject.strand || "ABM",
        topics: subject.topics || [],
        materials: subject.materials || []
    });

    window.toggleSubjectOverlay(true, subject);
};

window.toggleSubjectOverlay = function (show, subjectData = null) {
    const overlay = document.getElementById('subject-edit-overlay');
    const titleEl = document.getElementById('subject-editor-title');

    if (show) {
        // Lock body scroll
        document.body.style.overflow = 'hidden';

        // Reset or Populate Inputs
        if (subjectData) {
            document.getElementById('edit-subject-code').value = subjectData.code || '';
            document.getElementById('edit-subject-name').value = subjectData.name || '';
            document.getElementById('edit-subject-units').value = subjectData.units || '';
            document.getElementById('edit-subject-type').value = subjectData.type || 'Core';
            document.getElementById('edit-subject-strand').value = subjectData.strand || 'ABM';

            window.currentSubjectTopics = [...(subjectData.topics || [])];
            window.currentSubjectMaterials = [...(subjectData.materials || [])];

            if (titleEl) titleEl.textContent = 'Edit Subject';
        } else {
            document.getElementById('edit-subject-code').value = '';
            document.getElementById('edit-subject-name').value = '';
            document.getElementById('edit-subject-units').value = '';
            document.getElementById('edit-subject-type').value = 'Core';
            document.getElementById('edit-subject-strand').value = 'ABM';

            window.currentSubjectTopics = [];
            window.currentSubjectMaterials = [];

            if (titleEl) titleEl.textContent = 'Create Subject';
        }

        overlay.classList.remove('hidden');

        // Show/Hide delete button
        const deleteBtn = document.getElementById('subject-delete-btn');
        if (deleteBtn) {
            deleteBtn.classList.toggle('hidden', !window.isEditingSubject);
        }

        window.currentSubjectStep = 1;
        window.handleSubjectStep(1);
        window.handleSubjectTypeChange();
        window.checkSubjectDraftStatus();
        window.checkSubjectFormValidity();
        window.renderSubjectTopics();
        window.renderSubjectMaterials();

        // Update initial values for change detection if needed
        initialSubjectValues = {
            code: document.getElementById('edit-subject-code').value,
            name: document.getElementById('edit-subject-name').value,
            units: document.getElementById('edit-subject-units').value,
            type: document.getElementById('edit-subject-type').value,
            strand: document.getElementById('edit-subject-strand').value
        };
    } else {
        // Unlock body scroll
        document.body.style.overflow = '';
        overlay.classList.add('hidden');
        window.isEditingSubject = false;
    }
};

window.handleSubjectStep = function (step) {
    if (step < 1 || step > 3) return;

    window.currentSubjectStep = step;

    // Toggle Containers
    ['subject-step-1', 'subject-step-2', 'subject-step-3'].forEach((id, idx) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', idx + 1 !== step);
    });

    // Toggle Footer Buttons
    const backBtn = document.getElementById('subject-back-btn');
    const nextBtn = document.getElementById('subject-next-btn');
    const saveBtn = document.getElementById('subject-save-btn');
    const draftBtn = document.getElementById('subject-draft-btn');
    const globalFooter = document.getElementById('subject-global-footer');

    if (globalFooter) globalFooter.classList.remove('hidden');

    if (backBtn) backBtn.classList.toggle('hidden', step === 1);
    if (nextBtn) nextBtn.classList.toggle('hidden', step === 3);
    if (saveBtn) saveBtn.classList.toggle('hidden', step !== 3); // Only show save button on step 3
    if (draftBtn) draftBtn.classList.remove('hidden'); // Show draft button on all steps

    // Initial check for button states
    window.checkSubjectFormValidity();

    // Update Progress Bar
    for (let i = 1; i <= 3; i++) {
        const label = document.getElementById(`subject-step-bar-${i}-label`);
        const track = document.getElementById(`subject-step-bar-${i}-track`);
        if (label && track) {
            if (i < step) {
                label.className = 'text-[9px] font-bold uppercase tracking-[0.18em] text-[#15803d]';
                track.className = 'h-[3px] w-full bg-[#15803d] rounded-full transition-all duration-300';
            } else if (i === step) {
                label.className = 'text-[9px] font-bold uppercase tracking-[0.18em] text-[#15803d]';
                track.className = 'h-[3px] w-full bg-[#15803d] rounded-full transition-all duration-300';
            } else {
                label.className = 'text-[9px] font-bold uppercase tracking-[0.18em] text-slate-300';
                track.className = 'h-[3px] w-full bg-slate-100 rounded-full transition-all duration-300';
            }
        }
    }

    if (step === 3) {
        window.subjectMaterialSearchQuery = "";
        const searchInput = document.getElementById('subject-mat-search');
        if (searchInput) searchInput.value = "";
        window.renderSubjectMaterials();
    }
};

window.checkSubjectFormValidity = function () {
    const code = document.getElementById('edit-subject-code')?.value.trim();
    const name = document.getElementById('edit-subject-name')?.value.trim();
    const units = document.getElementById('edit-subject-units')?.value.trim();

    // Both fields must be filled
    const isValid = code && name && units;

    const nextBtn = document.getElementById('subject-next-btn');
    const saveBtn = document.getElementById('subject-save-btn');

    if (nextBtn) {
        nextBtn.disabled = !isValid;
        nextBtn.style.opacity = isValid ? '1' : '0.5';
        nextBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
    }

    if (saveBtn) {
        saveBtn.disabled = !isValid;
        saveBtn.style.opacity = isValid ? '1' : '0.5';
        saveBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
    }

    const draftBtn = document.getElementById('subject-draft-btn');
    if (draftBtn) {
        draftBtn.disabled = !isValid;
        draftBtn.style.opacity = isValid ? '1' : '0.5';
        draftBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
    }

    // --- STEP 2 VALIDATION ---
    if (window.currentSubjectStep === 2) {
        // At least one topic must be SAVED (not in editing mode)
        const hasSavedTopic = window.currentSubjectTopics.some(t => !t.isEditing);

        if (nextBtn) {
            nextBtn.disabled = !hasSavedTopic;
            nextBtn.style.opacity = hasSavedTopic ? '1' : '0.5';
            nextBtn.style.cursor = hasSavedTopic ? 'pointer' : 'not-allowed';
        }
    }

    // --- STEP 3 VALIDATION ---
    if (window.currentSubjectStep === 3) {
        // At least one material must be added to publish
        const hasMaterial = window.currentSubjectMaterials.length > 0;
        if (saveBtn) {
            saveBtn.disabled = !hasMaterial;
            saveBtn.style.opacity = hasMaterial ? '1' : '0.5';
            saveBtn.style.cursor = hasMaterial ? 'pointer' : 'not-allowed';
        }
    }

    // --- CHANGE DETECTION FOR EDIT MODE ---
    if (window.isEditingSubject && window.originalEditingSubjectState) {
        const currentState = JSON.stringify({
            code: document.getElementById('edit-subject-code').value.trim(),
            name: document.getElementById('edit-subject-name').value.trim(),
            units: document.getElementById('edit-subject-units').value.trim(),
            type: document.getElementById('edit-subject-type').value,
            strand: document.getElementById('edit-subject-strand').value,
            topics: window.currentSubjectTopics,
            materials: window.currentSubjectMaterials
        });

        const hasChanges = currentState !== window.originalEditingSubjectState;
        if (saveBtn) {
            saveBtn.disabled = !hasChanges;
            saveBtn.style.opacity = hasChanges ? '1' : '0.5';
            saveBtn.style.cursor = hasChanges ? 'pointer' : 'not-allowed';
        }
    }
};

window.deleteSubject = function () {
    const code = document.getElementById('edit-subject-code').value;
    window.showUserConfirm(
        'Do you want to Delete this subject',
        'This will permanently remove the subject and all its materials.',
        () => {
            const subjects = getStoredJson(SUBJECTS_STORAGE_KEY, []);
            const newSubjects = subjects.filter(s => s.code !== code);
            saveStoredJson(SUBJECTS_STORAGE_KEY, newSubjects);
            renderSubjectsTable();
            window.toggleSubjectOverlay(false);
        }
    );
};

window.handleSubjectBack = function () {
    if (window.currentSubjectStep === 2) {
        // Check if any topic is currently being edited
        const hasUnsaved = window.currentSubjectTopics.some(t => t.isEditing);

        if (hasUnsaved) {
            const proceedBtn = document.getElementById('user-confirm-proceed');
            if (proceedBtn) proceedBtn.textContent = 'Yes';

            window.showUserConfirm(
                'Do you want to go back unsave?',
                'Any unsaved topic changes will be lost if you proceed.',
                () => {
                    // Remove all brand new topics being drafted
                    window.currentSubjectTopics = window.currentSubjectTopics.filter(t => !t.isNew);

                    // Revert any edits to existing topics
                    window.currentSubjectTopics.forEach(t => {
                        if (t.isEditing && t._originalState) {
                            Object.assign(t, t._originalState);
                            delete t._originalState;
                        }
                        t.isEditing = false;
                    });

                    window.renderSubjectTopics();
                    window.handleSubjectStep(1);
                }
            );
            return;
        }
    } else if (window.currentSubjectStep === 3) {
        window.handleSubjectStep(2);
        return;
    }
    window.handleSubjectStep(window.currentSubjectStep - 1);
};

window.handleSubjectNext = function () {
    if (window.currentSubjectStep === 3) return; // Disconnected for Step 3
    if (window.currentSubjectStep === 1) {
        if (!window.validateSubjectStep1()) {
            return;
        }
        window.handleSubjectStep(2);
    } else if (window.currentSubjectStep === 2) {
        const hasUnsaved = window.currentSubjectTopics.some(t => t.isEditing);

        if (hasUnsaved) {
            const proceedBtn = document.getElementById('user-confirm-proceed');
            if (proceedBtn) proceedBtn.textContent = 'Yes';

            window.showUserConfirm(
                'Do you want to go next step unsave?',
                'Any unsaved topic changes will be lost if you proceed.',
                () => {
                    // Discard active drafting sessions
                    window.currentSubjectTopics = window.currentSubjectTopics.filter(t => !t.isNew);
                    window.currentSubjectTopics.forEach(t => {
                        if (t.isEditing && t._originalState) {
                            Object.assign(t, t._originalState);
                            delete t._originalState;
                        }
                        t.isEditing = false;
                    });

                    window.renderSubjectTopics();
                    window.handleSubjectStep(3);
                }
            );
        } else {
            window.handleSubjectStep(3);
        }
    }
};

window.validateSubjectStep1 = function () {
    const code = document.getElementById('edit-subject-code');
    const name = document.getElementById('edit-subject-name');
    const units = document.getElementById('edit-subject-units');

    let isValid = true;

    [code, name, units].forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('border-red-500');
            input.classList.remove('border-slate-200');
            isValid = false;
        } else {
            input.classList.remove('border-red-500');
            input.classList.add('border-slate-200');
        }
    });

    return isValid;
};

window.handleSubjectSaveFinal = function () {
    window.handleSubjectSave('Active');
};

window.addSubjectTopic = function () {
    const id = Date.now();
    window.currentSubjectTopics.push({
        id: id,
        title: '',
        description: '',
        image: window.topicTemplates[0] || 'image/Topic.jpg',
        isEditing: true,
        isNew: true
    });
    window.renderSubjectTopics();

    // Scroll to new topic
    setTimeout(() => {
        const el = document.getElementById(`topic-item-${id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
};

window.removeSubjectTopic = function (index) {
    window.currentSubjectTopics.splice(index, 1);
    window.renderSubjectTopics();
};

window.saveSubjectTopic = function (index) {
    const topic = window.currentSubjectTopics[index];
    if (!topic.title.trim()) {
        alert('Please enter a topic title');
        return;
    }
    topic.isEditing = false;
    topic.isNew = false; // Once saved, it's no longer new
    window.renderSubjectTopics();
};

window.editSubjectTopic = function (index) {
    const topic = window.currentSubjectTopics[index];
    // Store original state to allow for cancellation
    topic._originalState = {
        title: topic.title,
        description: topic.description,
        image: topic.image
    };
    topic.isEditing = true;
    window.renderSubjectTopics();
};

window.cancelSubjectTopic = function (index) {
    const topic = window.currentSubjectTopics[index];
    // If it's a new topic with no name, just remove it
    if (topic.isNew) {
        window.currentSubjectTopics.splice(index, 1);
    } else {
        // Revert to original state
        if (topic._originalState) {
            Object.assign(topic, topic._originalState);
            delete topic._originalState;
        }
        topic.isEditing = false;
    }
    window.renderSubjectTopics();
};

window.toggleMaterialDropdown = function (event) {
    event.stopPropagation();
    const dropdown = document.getElementById('add-material-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');

        // Close when clicking outside
        const closeDropdown = (e) => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
                document.removeEventListener('click', closeDropdown);
            }
        };
        if (!dropdown.classList.contains('hidden')) {
            document.addEventListener('click', closeDropdown);
        }
    }
};

window.addSubjectMaterial = function (type, preserveFields = false, editIndex = -1) {
    const mainView = document.getElementById('subject-materials-main-view');
    const editorView = document.getElementById('subject-material-editor-view');
    if (!mainView || !editorView) return;

    window.currentEditingMaterialIndex = editIndex;
    const isEdit = editIndex !== -1;
    const materialToEdit = isEdit ? window.currentSubjectMaterials[editIndex] : null;

    if (isEdit) {
        type = materialToEdit.type;
        // Store original state for change detection
        window.originalEditingMaterialState = JSON.stringify({
            title: materialToEdit.title,
            desc: materialToEdit.description,
            topicId: materialToEdit.topicId,
            videoUrl: materialToEdit.videoUrl || "",
            videoFile: null,
            genFile: null,
            quizData: materialToEdit.quizData || null
        });
    }

    // Capture current values if we need to preserve them
    let oldTitle = isEdit ? materialToEdit.title : "";
    let oldDesc = isEdit ? materialToEdit.description : "";
    let oldTopic = isEdit ? materialToEdit.topicId : "";

    if (preserveFields && window.pendingMaterialState) {
        oldTitle = window.pendingMaterialState.title || "";
        oldDesc = window.pendingMaterialState.desc || "";
        oldTopic = window.pendingMaterialState.topicId || "";
    } else if (preserveFields) {
        oldTitle = document.getElementById('mat-editor-title')?.value || "";
        oldDesc = document.getElementById('mat-editor-desc')?.value || "";
        oldTopic = document.getElementById('mat-topic-id')?.value || "";
    }

    // Hide dropdown
    const dropdown = document.getElementById('add-material-dropdown');
    if (dropdown) dropdown.classList.add('hidden');

    // Get SAVED Topics for Dropdown
    const savedTopics = window.currentSubjectTopics.filter(t => !t.isEditing);
    const topicsHtml = savedTopics.map(t => `<option value="${t.id}">${t.title}</option>`).join('');
    const topicDropdownHtml = `
        <div class="space-y-3">
            <label class="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Select Topic</label>
            <select id="mat-topic-id" 
                class="w-full bg-slate-50/50 border border-slate-100 px-8 py-5 rounded-[24px] text-base font-medium text-black outline-none focus:border-black focus:bg-white transition-all shadow-inner appearance-none cursor-pointer">
                <option value="">-- Choose Topic --</option>
                ${topicsHtml}
            </select>
        </div>
    `;

    // Switch Views
    mainView.classList.add('hidden');
    editorView.classList.remove('hidden');

    // Hide Global Footer when in Editor
    const globalFooter = document.getElementById('subject-global-footer');
    if (globalFooter) globalFooter.classList.add('hidden');

    // Prepare Editor Content
    if (type === 'Video') {
        editorView.innerHTML = `
            <div class="space-y-8 font-['Inter']">
                <div class="flex items-center gap-6">
                    <button onclick="window.cancelMaterialEditor()" class="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 hover:bg-[#FFD000] hover:text-black transition-all flex items-center justify-center shadow-sm">
                        <i class="fa-solid fa-chevron-left text-sm"></i>
                    </button>
                    <div>
                        <h3 class="text-2xl font-black text-black tracking-tight">${isEdit ? 'Edit' : 'Add'} Video</h3>
                    </div>
                </div>
                
                <div class="bg-white border border-slate-100 rounded-[40px] p-10 shadow-2xl shadow-slate-200/40 space-y-10">
                    <div class="grid gap-8">
                        ${topicDropdownHtml}
                        
                        <div class="space-y-3">
                            <label class="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Title</label>
                            <input type="text" id="mat-editor-title"
                                maxlength="50"
                                value="${oldTitle}"
                                oninput="window.checkMaterialValidity()"
                                placeholder="Enter video title..."
                                class="w-full bg-slate-50/50 border border-slate-100 px-8 py-5 rounded-[24px] text-base font-medium text-black outline-none focus:border-black focus:bg-white transition-all shadow-inner"
                                style="text-transform: none; font-weight: 500;">
                        </div>
                        
                        <div class="space-y-3">
                            <label class="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Description</label>
                            <textarea id="mat-editor-desc"
                                maxlength="5000"
                                oninput="window.checkMaterialValidity()"
                                placeholder="Enter video description..."
                                class="w-full bg-slate-50/50 border border-slate-100 px-8 py-6 rounded-[32px] text-base font-medium text-black outline-none focus:border-black focus:bg-white transition-all shadow-inner min-h-[180px] resize-none"
                                style="text-transform: none; font-weight: 500;">${oldDesc}</textarea>
                        </div>
                    </div>

                    <div class="space-y-6">
                        <label class="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Video Source</label>
                        
                        <div class="flex p-1.5 bg-slate-100 rounded-[20px] w-fit">
                            <button onclick="window.switchVideoSourceTab('embedded')" id="tab-video-embedded"
                                class="px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all bg-white text-black shadow-sm">
                                Embedded (YouTube)
                            </button>
                            <button onclick="window.switchVideoSourceTab('mp4')" id="tab-video-mp4"
                                class="px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all text-slate-400 hover:text-black">
                                MP4 File
                            </button>
                        </div>

                        <div id="video-source-input-container">
                            <div class="space-y-4">
                                <input type="text" id="mat-video-url"
                                    oninput="window.handleVideoUrlChange(this.value)"
                                    placeholder="Paste YouTube URL here..."
                                    class="w-full bg-slate-50 border border-slate-100 px-8 py-5 rounded-[24px] text-base font-medium text-black outline-none focus:border-black transition-all">
                            </div>
                        </div>

                        <div id="mat-video-preview-container" class="aspect-video w-full bg-black rounded-[32px] overflow-hidden shadow-2xl relative group flex items-center justify-center">
                            <div id="video-loading-spinner" class="hidden absolute inset-0 bg-black/50 z-20 flex flex-col items-center justify-center gap-4">
                                <div class="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                                <p class="text-[10px] font-black text-white uppercase tracking-[0.2em]">Loading Video...</p>
                            </div>
                            <i class="fa-solid fa-play text-white/20 text-6xl group-hover:scale-110 transition-transform"></i>
                        </div>
                    </div>

                    <div class="flex items-center justify-between pt-4">
                         ${isEdit ? `
                            <button onclick="window.removeSubjectMaterial(${editIndex}, true)" class="px-8 py-4 bg-white border border-red-100 text-red-500 text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-red-50 transition-all shadow-sm">
                                Delete Material
                            </button>
                         ` : '<div></div>'}
                         <div class="flex items-center gap-4">
                            <button onclick="window.cancelMaterialEditor()" class="px-10 py-4 bg-white border border-slate-200 text-black text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all shadow-sm">
                                Cancel
                            </button>
                            <button id="mat-add-btn" disabled
                                onclick="window.performSaveMaterial()"
                                class="px-12 py-4 bg-[#15803d] opacity-50 cursor-not-allowed text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#166534] transition-all shadow-lg shadow-green-100 flex items-center gap-3">
                                <span>${isEdit ? 'Save Material' : 'Add Material'}</span>
                                <i class="fa-solid fa-circle-notch fa-spin hidden" id="mat-save-loading"></i>
                            </button>
                         </div>
                    </div>
                </div>
            </div>
        `;

        // Restore Video specific logic
        if (isEdit) {
            if (materialToEdit.sourceType === 'mp4') {
                window.switchVideoSourceTab('mp4');
                const label = document.getElementById('mat-video-file-label');
                if (label) label.textContent = materialToEdit.fileName || 'Video file selected';
            } else {
                window.switchVideoSourceTab('embedded');
                const urlInput = document.getElementById('mat-video-url');
                if (urlInput) {
                    urlInput.value = materialToEdit.videoUrl || "";
                    window.handleVideoUrlChange(urlInput.value);
                }
            }
        }
    } else if (type === 'Quiz') {
        editorView.innerHTML = `
            <div class="space-y-8 font-['Inter']">
                <div class="flex items-center gap-6">
                    <button onclick="window.cancelMaterialEditor()" class="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 hover:bg-[#FFD000] hover:text-black transition-all flex items-center justify-center shadow-sm">
                        <i class="fa-solid fa-chevron-left text-sm"></i>
                    </button>
                    <div>
                        <h3 class="text-2xl font-black text-black tracking-tight">${isEdit ? 'Edit' : 'Add'} Quiz</h3>
                    </div>
                </div>
                
                <div class="bg-white border border-slate-100 rounded-[40px] p-10 shadow-2xl shadow-slate-200/40 space-y-10">
                    <div class="grid gap-8">
                        ${topicDropdownHtml}
                        
                        <div class="space-y-3">
                            <label class="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Title</label>
                            <input type="text" id="mat-editor-title"
                                maxlength="50"
                                value="${oldTitle}"
                                oninput="window.checkMaterialValidity()"
                                placeholder="Enter quiz title..."
                                class="w-full bg-slate-50/50 border border-slate-100 px-8 py-5 rounded-[24px] text-base font-medium text-black outline-none focus:border-black focus:bg-white transition-all shadow-inner"
                                style="text-transform: none; font-weight: 500;">
                        </div>
                        
                        <div class="space-y-3">
                            <label class="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Description</label>
                            <textarea id="mat-editor-desc"
                                maxlength="1500"
                                oninput="window.checkMaterialValidity()"
                                placeholder="Enter quiz description..."
                                class="w-full bg-slate-50/50 border border-slate-100 px-8 py-6 rounded-[32px] text-base font-medium text-black outline-none focus:border-black focus:bg-white transition-all shadow-inner min-h-[150px] resize-none"
                                style="text-transform: none; font-weight: 500;">${oldDesc}</textarea>
                        </div>
                    </div>

                    <div class="space-y-8">
                        <div class="space-y-4">
                            <label class="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Creation Method</label>
                            <div class="flex p-1.5 bg-slate-100 rounded-[20px] w-fit">
                                <button onclick="window.switchQuizMethod('upload')" id="tab-quiz-upload"
                                    class="px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all bg-white text-black shadow-sm">
                                    Upload File
                                </button>
                                <button onclick="window.switchQuizMethod('draft')" id="tab-quiz-draft"
                                    class="px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all text-slate-400 hover:text-black">
                                    Create Quiz
                                </button>
                                <button onclick="window.switchQuizMethod('ai')" id="tab-quiz-ai"
                                    class="px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all text-slate-400 hover:text-black flex items-center justify-center">
                                    <i class="fa-solid fa-bolt-lightning mr-2"></i>
                                    Generate Quiz
                                </button>
                            </div>
                        </div>

                        <div id="quiz-method-container" class="space-y-6">
                            <!-- Default: Upload Panel -->
                            <div class="space-y-6">
                                <label class="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">File Type</label>
                                <div class="flex p-1.5 bg-slate-100 rounded-[20px] w-fit">
                                    <button onclick="window.switchGenericFileTab('docx')" id="tab-gen-docx"
                                        class="px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all bg-white text-black shadow-sm">
                                        DOCX
                                    </button>
                                    <button onclick="window.switchGenericFileTab('pdf')" id="tab-gen-pdf"
                                        class="px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all text-slate-400 hover:text-black">
                                        PDF
                                    </button>
                                    <button onclick="window.switchGenericFileTab('pptx')" id="tab-gen-pptx"
                                        class="px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all text-slate-400 hover:text-black">
                                        PPTX
                                    </button>
                                </div>
                                <div id="gen-file-input-container">
                                    <div class="flex items-center gap-4">
                                <div id="mat-gen-file-label" class="flex-1 bg-slate-50 border border-slate-100 px-8 py-5 rounded-[24px] text-slate-400 text-base font-medium truncate">
                                    No file selected (Max ${JSON.parse(localStorage.getItem('sigma-material-limits') || '{}').docx?.ext || 25}MB)
                                </div>
                                <input type="file" id="mat-gen-file-input" accept=".docx" class="hidden" onchange="window.handleGenericFileChange(this, 'docx', ${JSON.parse(localStorage.getItem('sigma-material-limits') || '{}').docx?.ext || 25})">
                                        <button onclick="document.getElementById('mat-gen-file-input').click()" 
                                            class="px-8 py-5 bg-[#15803d] text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#166534] transition-all whitespace-nowrap shadow-lg shadow-green-100">
                                            Upload DOCX
                                        </button>
                                    </div>
                                </div>
                                <div id="mat-gen-preview-container" class="aspect-video w-full bg-slate-50 border border-dashed border-slate-200 rounded-[32px] overflow-hidden flex flex-col items-center justify-center gap-4">
                                    <i id="mat-gen-icon" class="fa-solid fa-file-word text-slate-200 text-6xl"></i>
                                    <p class="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No file uploaded</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center justify-between pt-4">
                         ${isEdit ? `
                            <button onclick="window.removeSubjectMaterial(${editIndex}, true)" class="px-8 py-4 bg-white border border-red-100 text-red-500 text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-red-50 transition-all shadow-sm">
                                Delete Material
                            </button>
                         ` : '<div></div>'}
                         <div class="flex items-center gap-4">
                            <button onclick="window.cancelMaterialEditor()" class="px-10 py-4 bg-white border border-slate-200 text-black text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all shadow-sm">
                                Cancel
                            </button>
                            <button id="mat-add-btn" disabled
                                onclick="window.performSaveMaterial()"
                                class="px-12 py-4 bg-[#15803d] opacity-50 cursor-not-allowed text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#166534] transition-all shadow-lg shadow-green-100 flex items-center gap-3">
                                <span>${isEdit ? 'Save Material' : 'Add Material'}</span>
                                <i class="fa-solid fa-circle-notch fa-spin hidden" id="mat-save-loading"></i>
                            </button>
                         </div>
                    </div>
                </div>
            </div>
        `;

        if (isEdit && materialToEdit.quizData) {
            window.pendingQuizData = materialToEdit.quizData;
            window.performQuizMethodSwitch(materialToEdit.quizData.source === 'ai' ? 'ai' : 'draft');
        } else if (window.pendingQuizData) {
            // Restore even if not editing (e.g. after save draft)
            window.performQuizMethodSwitch(window.pendingQuizData.source === 'ai' ? 'ai' : 'draft');
        } else {
            window.switchQuizMethod('upload');
        }
    } else {
        const displayType = type;
        editorView.innerHTML = `
            <div class="space-y-8 font-['Inter']">
                <div class="flex items-center gap-6">
                    <button onclick="window.cancelMaterialEditor()" class="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 hover:bg-[#FFD000] hover:text-black transition-all flex items-center justify-center shadow-sm">
                        <i class="fa-solid fa-chevron-left text-sm"></i>
                    </button>
                    <div>
                        <h3 class="text-2xl font-black text-black tracking-tight">${isEdit ? 'Edit' : 'Add'} ${displayType}</h3>
                    </div>
                </div>
                
                <div class="bg-white border border-slate-100 rounded-[40px] p-10 shadow-2xl shadow-slate-200/40 space-y-10">
                    <div class="grid gap-8">
                        ${topicDropdownHtml}
                        
                        <div class="space-y-3">
                            <label class="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Title</label>
                            <input type="text" id="mat-editor-title"
                                maxlength="50"
                                value="${oldTitle}"
                                oninput="window.checkMaterialValidity()"
                                placeholder="Enter ${displayType.toLowerCase()} title..."
                                class="w-full bg-slate-50/50 border border-slate-100 px-8 py-5 rounded-[24px] text-base font-medium text-black outline-none focus:border-black focus:bg-white transition-all shadow-inner"
                                style="text-transform: none; font-weight: 500;">
                        </div>
                        
                        <div class="space-y-3">
                            <label class="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Description</label>
                            <textarea id="mat-editor-desc"
                                maxlength="1500"
                                oninput="window.checkMaterialValidity()"
                                placeholder="Enter ${displayType.toLowerCase()} description..."
                                class="w-full bg-slate-50/50 border border-slate-100 px-8 py-6 rounded-[32px] text-base font-medium text-black outline-none focus:border-black focus:bg-white transition-all shadow-inner min-h-[150px] resize-none"
                                style="text-transform: none; font-weight: 500;">${oldDesc}</textarea>
                        </div>
                    </div>

                    <div class="space-y-6">
                        <label class="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">File Type</label>
                        
                        <div class="flex p-1.5 bg-slate-100 rounded-[20px] w-fit">
                            <button onclick="window.switchGenericFileTab('docx')" id="tab-gen-docx"
                                class="px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all bg-white text-black shadow-sm">
                                DOCX
                            </button>
                            <button onclick="window.switchGenericFileTab('pdf')" id="tab-gen-pdf"
                                class="px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all text-slate-400 hover:text-black">
                                PDF
                            </button>
                            <button onclick="window.switchGenericFileTab('pptx')" id="tab-gen-pptx"
                                class="px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all text-slate-400 hover:text-black">
                                PPTX
                            </button>
                        </div>

                        <div id="gen-file-input-container">
                            <div class="flex items-center gap-4">
                                <div id="mat-gen-file-label" class="flex-1 bg-slate-50 border border-slate-100 px-8 py-5 rounded-[24px] text-slate-400 text-base font-medium truncate">
                                    No file selected (Max ${JSON.parse(localStorage.getItem('sigma-material-limits') || '{}').docx?.ext || 25}MB)
                                </div>
                                <input type="file" id="mat-gen-file-input" accept=".docx" class="hidden" onchange="window.handleGenericFileChange(this, 'docx', ${JSON.parse(localStorage.getItem('sigma-material-limits') || '{}').docx?.ext || 25})">
                                <button onclick="document.getElementById('mat-gen-file-input').click()" 
                                    class="px-8 py-5 bg-[#15803d] text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#166534] transition-all whitespace-nowrap shadow-lg shadow-green-100">
                                    Upload DOCX
                                </button>
                            </div>
                        </div>

                        <div id="mat-gen-preview-container" class="aspect-video w-full bg-slate-50 border border-dashed border-slate-200 rounded-[32px] overflow-hidden flex flex-col items-center justify-center gap-4">
                            <i id="mat-gen-icon" class="fa-solid fa-file-word text-slate-200 text-6xl"></i>
                            <p class="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No file uploaded</p>
                        </div>
                    </div>

                    <div class="flex items-center justify-between pt-4">
                         ${isEdit ? `
                            <button onclick="window.removeSubjectMaterial(${editIndex}, true)" class="px-8 py-4 bg-white border border-red-100 text-red-500 text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-red-50 transition-all shadow-sm">
                                Delete Material
                            </button>
                         ` : '<div></div>'}
                         <div class="flex items-center gap-4">
                            <button onclick="window.cancelMaterialEditor()" class="px-10 py-4 bg-white border border-slate-200 text-black text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all shadow-sm">
                                Cancel
                            </button>
                            <button id="mat-add-btn" disabled
                                onclick="window.performSaveMaterial()"
                                class="px-12 py-4 bg-[#15803d] opacity-50 cursor-not-allowed text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#166534] transition-all shadow-lg shadow-green-100 flex items-center gap-3">
                                <span>${isEdit ? 'Save Material' : 'Add Material'}</span>
                                <i class="fa-solid fa-circle-notch fa-spin hidden" id="mat-save-loading"></i>
                            </button>
                         </div>
                    </div>
                </div>
            </div>
        `;

        if (isEdit && materialToEdit.fileType) {
            window.switchGenericFileTab(materialToEdit.fileType);
            const label = document.getElementById('mat-gen-file-label');
            if (label) label.textContent = materialToEdit.fileName || 'File selected';
        } else {
            window.switchGenericFileTab('docx');
        }
    }

    // --- SHARED RESTORATION (TOPIC) ---
    if (oldTopic) {
        const topicSel = document.getElementById('mat-topic-id');
        if (topicSel) {
            topicSel.value = oldTopic;
            if (!topicSel.value && oldTopic) {
                for (let opt of topicSel.options) {
                    if (opt.value == oldTopic) {
                        topicSel.value = opt.value;
                        break;
                    }
                }
            }
        }
    }

    // Initial validity check
    window.checkMaterialValidity();
};

window.performSaveMaterial = function () {
    const isEdit = window.currentEditingMaterialIndex !== -1;
    const materialToEdit = isEdit ? window.currentSubjectMaterials[window.currentEditingMaterialIndex] : null;

    const title = document.getElementById('mat-editor-title')?.value.trim();
    const desc = document.getElementById('mat-editor-desc')?.value.trim();
    const topicId = document.getElementById('mat-topic-id')?.value;
    const typeLabel = document.querySelector('#subject-material-editor-view h3').textContent.replace('Add ', '').replace('Edit ', '');

    const msg = isEdit ? 'do you want to save this material?' : 'do you want to add this material?';

    window.showUserConfirm(
        msg,
        isEdit ? 'Changes will be saved to this material.' : 'This material will be added to your subject.',
        () => {
            const addBtn = document.getElementById('mat-add-btn');
            const loading = document.getElementById('mat-save-loading');

            if (addBtn && loading) {
                addBtn.disabled = true;
                loading.classList.remove('hidden');

                setTimeout(() => {
                    const materialData = {
                        id: isEdit ? materialToEdit.id : Date.now(),
                        type: typeLabel,
                        title: title,
                        description: desc,
                        topicId: topicId,
                        timestamp: new Date().toLocaleString(),
                        isEditing: false,
                        isNew: false
                    };

                    // Type specific data
                    const videoUrl = document.getElementById('mat-video-url')?.value.trim();
                    const videoFile = document.getElementById('mat-video-file-input');

                    if (typeLabel === 'Video') {
                        if (videoFile && videoFile.files.length > 0) {
                            materialData.fileName = videoFile.files[0].name;
                            materialData.sourceType = 'mp4';
                        } else if (isEdit && materialToEdit.sourceType === 'mp4') {
                            materialData.fileName = materialToEdit.fileName;
                            materialData.sourceType = 'mp4';
                        } else if (videoUrl) {
                            materialData.videoUrl = videoUrl;
                            materialData.sourceType = 'embedded';
                        }
                    }

                    const genFile = document.getElementById('mat-gen-file-input');
                    if (genFile && genFile.files.length > 0) {
                        materialData.fileName = genFile.files[0].name;
                        materialData.fileType = document.querySelector('[id^="tab-gen-"].bg-white')?.id.replace('tab-gen-', '') || 'docx';
                    } else if (isEdit && materialToEdit.fileName && !materialData.fileName) {
                        materialData.fileName = materialToEdit.fileName;
                        materialData.fileType = materialToEdit.fileType;
                    }

                    if (typeLabel === 'Quiz' && window.pendingQuizData) {
                        materialData.quizData = window.pendingQuizData;
                    } else if (isEdit && materialToEdit.quizData && !window.pendingQuizData) {
                        materialData.quizData = materialToEdit.quizData;
                    }

                    if (isEdit) {
                        window.currentSubjectMaterials[window.currentEditingMaterialIndex] = materialData;
                    } else {
                        window.currentSubjectMaterials.push(materialData);
                    }

                    // Reset state
                    window.pendingQuizData = null;
                    window.pendingMaterialState = null;
                    window.currentEditingMaterialIndex = -1;

                    // Clear search so the new material is visible
                    window.subjectMaterialSearchQuery = "";
                    const searchInput = document.getElementById('subject-mat-search');
                    if (searchInput) searchInput.value = "";

                    window.renderSubjectMaterials();
                    window.closeMaterialEditor();
                }, 1500);
            }
        }
    );
};

window.handleGenericFileChange = function (input, type, limitMb) {
    const preview = document.getElementById('mat-gen-preview-container');
    const label = document.getElementById('mat-gen-file-label');
    const icon = document.getElementById('mat-gen-icon');
    if (!preview || !label || !icon) return;

    const file = input.files[0];
    if (file) {
        // Check Size
        const sizeMb = file.size / (1024 * 1024);
        if (sizeMb > limitMb) {
            window.showUserConfirm(
                'File too large',
                `This file is ${sizeMb.toFixed(1)}MB. Maximum allowed for ${type.toUpperCase()} is ${limitMb}MB.`,
                () => { input.value = ''; window.handleGenericFileChange(input, type, limitMb); },
                null,
                true // Alert mode
            );
            return;
        }

        label.textContent = file.name;
        label.classList.remove('text-slate-400');
        label.classList.add('text-black');

        // Update Icon based on type
        icon.className = `fa-solid ${type === 'docx' ? 'fa-file-word text-blue-500' : type === 'pdf' ? 'fa-file-pdf text-red-500' : 'fa-file-powerpoint text-orange-500'} text-6xl transition-all scale-110`;
        preview.querySelector('p').textContent = `${(file.size / 1024).toFixed(1)} KB`;
        preview.querySelector('p').classList.remove('text-slate-300');
        preview.querySelector('p').classList.add('text-slate-400');
    } else {
        label.textContent = `No file selected (Max ${limitMb}MB)`;
        label.classList.add('text-slate-400');
        icon.className = `fa-solid ${type === 'docx' ? 'fa-file-word' : type === 'pdf' ? 'fa-file-pdf' : 'fa-file-powerpoint'} text-slate-200 text-6xl`;
        preview.querySelector('p').textContent = 'No file uploaded';
        preview.querySelector('p').classList.add('text-slate-300');
    }
    window.checkMaterialValidity();
};

window.switchGenericFileTab = function (type) {
    const fileInput = document.getElementById('mat-gen-file-input');
    const hasFile = fileInput && fileInput.files.length > 0;
    const currentTab = document.querySelector('[id^="tab-gen-"].bg-white');
    const currentType = currentTab ? currentTab.id.replace('tab-gen-', '') : '';

    if (hasFile && currentType !== type) {
        window.showUserConfirm(
            'do you want to discard this file?',
            'Switching file types will remove your current selection.',
            () => {
                window.performGenericFileTabSwitch(type);
            }
        );
    } else {
        window.performGenericFileTabSwitch(type);
    }
};

window.performGenericFileTabSwitch = function (type) {
    const docxTab = document.getElementById('tab-gen-docx');
    const pdfTab = document.getElementById('tab-gen-pdf');
    const pptxTab = document.getElementById('tab-gen-pptx');
    const inputContainer = document.getElementById('gen-file-input-container');
    const preview = document.getElementById('mat-gen-preview-container');
    const icon = document.getElementById('mat-gen-icon');

    [docxTab, pdfTab, pptxTab].forEach(t => {
        if (t) t.className = 'px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all text-slate-400 hover:text-black';
    });

    const activeTab = type === 'docx' ? docxTab : type === 'pdf' ? pdfTab : pptxTab;
    if (activeTab) activeTab.className = 'px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all bg-white text-black shadow-sm';

    const savedLimits = JSON.parse(localStorage.getItem('sigma-material-limits') || '{}');
    const limit = savedLimits[type]?.ext || (type === 'pptx' ? 100 : 25);
    const accept = type === 'docx' ? '.docx' : type === 'pdf' ? '.pdf' : '.pptx';

    if (inputContainer) {
        inputContainer.innerHTML = `
            <div class="flex items-center gap-4">
                <div id="mat-gen-file-label" class="flex-1 bg-slate-50 border border-slate-100 px-8 py-5 rounded-[24px] text-slate-400 text-base font-medium truncate">
                    No file selected (Max ${limit}MB)
                </div>
                <input type="file" id="mat-gen-file-input" accept="${accept}" class="hidden" onchange="window.handleGenericFileChange(this, '${type}', ${limit})">
                <button onclick="document.getElementById('mat-gen-file-input').click()" 
                    class="px-8 py-5 bg-[#15803d] text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#166534] transition-all whitespace-nowrap shadow-lg shadow-green-100">
                    Upload ${type.toUpperCase()}
                </button>
            </div>
        `;
    }

    // Reset Preview
    if (icon) icon.className = `fa-solid ${type === 'docx' ? 'fa-file-word' : type === 'pdf' ? 'fa-file-pdf' : 'fa-file-powerpoint'} text-slate-200 text-6xl`;
    if (preview) {
        const p = preview.querySelector('p');
        if (p) {
            p.textContent = 'No file uploaded';
            p.classList.add('text-slate-300');
        }
    }

    window.checkMaterialValidity();
};

window.handleVideoUrlChange = function (url) {
    const preview = document.getElementById('mat-video-preview-container');
    const addBtn = document.getElementById('mat-add-btn');
    if (!preview) return;

    // Extract YouTube ID
    let videoId = '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
        videoId = match[2];
    }

    if (videoId) {
        preview.innerHTML = `
            <div id="video-loading-spinner" class="absolute inset-0 bg-black/50 z-20 flex flex-col items-center justify-center gap-4">
                <div class="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                <p class="text-[10px] font-black text-white uppercase tracking-[0.2em]">Validating Duration...</p>
            </div>
            <div id="yt-enforce-player" class="w-full h-full"></div>
        `;

        // Load YouTube API if not present
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }

        const checkDuration = () => {
            if (!window.YT || !window.YT.Player) {
                setTimeout(checkDuration, 100);
                return;
            }

            new YT.Player('yt-enforce-player', {
                height: '100%',
                width: '100%',
                videoId: videoId,
                playerVars: { 'autoplay': 0, 'controls': 0, 'showinfo': 0, 'rel': 0 },
                events: {
                    'onReady': (event) => {
                        const duration = event.target.getDuration();
                        const savedLimits = JSON.parse(localStorage.getItem('sigma-material-limits') || '{}');
                        const maxHours = parseFloat(savedLimits.video?.embed || 1);
                        const maxSeconds = maxHours * 3600;

                        const loadingSpinner = document.getElementById('video-loading-spinner');
                        if (loadingSpinner) loadingSpinner.classList.add('hidden');

                        if (duration > maxSeconds) {
                            const hours = (duration / 3600).toFixed(1);
                            window.showUserConfirm(
                                'Duration Restriction Violation',
                                `This video is ${hours} hours long. Your institution has a strict ${maxHours} hour(s) limit for embedded content.`,
                                () => {
                                    document.getElementById('mat-video-url').value = '';
                                    preview.innerHTML = `<i class="fa-solid fa-play text-white/20 text-6xl group-hover:scale-110 transition-transform"></i>`;
                                    window.checkMaterialValidity();
                                },
                                null,
                                true // Alert mode
                            );
                            if (addBtn) addBtn.disabled = true;
                        } else {
                            window.checkMaterialValidity();
                        }
                    },
                    'onError': () => {
                        const loadingSpinner = document.getElementById('video-loading-spinner');
                        if (loadingSpinner) loadingSpinner.classList.add('hidden');
                        preview.innerHTML = `<div class="text-red-500 text-center p-4"><i class="fa-solid fa-triangle-exclamation text-4xl mb-2"></i><p class="text-[10px] font-bold uppercase">Invalid Video ID or Private Content</p></div>`;
                    }
                }
            });
        };
        checkDuration();

    } else {
        preview.innerHTML = `<i class="fa-solid fa-play text-white/20 text-6xl group-hover:scale-110 transition-transform"></i>`;
    }
    window.checkMaterialValidity();
};

window.handleVideoFileChange = function (input) {
    const preview = document.getElementById('mat-video-preview-container');
    const label = document.getElementById('mat-video-file-label');
    if (!preview || !label) return;

    const file = input.files[0];
    if (file) {
        // Size check for video (500MB)
        const sizeMb = file.size / (1024 * 1024);
        const savedLimits = JSON.parse(localStorage.getItem('sigma-material-limits') || '{}');
        const limitMb = savedLimits.video?.mp4 || 500;
        if (sizeMb > limitMb) {
            window.showUserConfirm(
                'Video too large',
                `This video is ${sizeMb.toFixed(1)}MB. Maximum allowed is ${limitMb}MB.`,
                () => { input.value = ''; window.handleVideoFileChange(input); },
                null,
                true
            );
            return;
        }

        label.textContent = file.name;
        label.classList.remove('text-slate-400');
        label.classList.add('text-black');

        const url = URL.createObjectURL(file);
        preview.innerHTML = `
            <div id="video-loading-spinner" class="absolute inset-0 bg-black/50 z-20 flex flex-col items-center justify-center gap-4">
                <div class="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                <p class="text-[10px] font-black text-white uppercase tracking-[0.2em]">Loading MP4...</p>
            </div>
            <video class="w-full h-full object-contain" controls onloadeddata="document.getElementById('video-loading-spinner')?.classList.add('hidden')">
                <source src="${url}" type="video/mp4">
            </video>
        `;
    } else {
        const savedLimits = JSON.parse(localStorage.getItem('sigma-material-limits') || '{}');
        const limitMb = savedLimits.video?.mp4 || 500;
        label.textContent = `No file selected (Max ${limitMb}MB)`;
        label.classList.add('text-slate-400');
        preview.innerHTML = `<i class="fa-solid fa-play text-white/20 text-6xl group-hover:scale-110 transition-transform"></i>`;
    }
    window.checkMaterialValidity();
};

window.switchQuizMethod = function (method) {
    const uploadTab = document.getElementById('tab-quiz-upload');
    const createTab = document.getElementById('tab-quiz-draft');
    const aiTab = document.getElementById('tab-quiz-ai');
    if (!uploadTab || !createTab || !aiTab) return;

    // GUARD 1: If switching AWAY from 'Create Quiz' (draft) or 'Generate Quiz' (ai) and a created file exists
    if (window.pendingQuizData) {
        const currentSource = window.pendingQuizData.source === 'ai' ? 'ai' : 'draft';
        if (method !== currentSource) {
            window.showUserConfirm(
                'Discard Created File?',
                'Do you want to switch tab and discard the file? This will permanently remove your created quiz.',
                () => {
                    window.pendingQuizData = null;
                    window.performQuizMethodSwitch(method);
                }
            );
            return;
        }
    }

    // GUARD 2: Discard Guard: If switching FROM upload and a file exists
    const currentFile = document.getElementById('mat-gen-file-input');
    const isCurrentlyUpload = uploadTab.classList.contains('bg-white');

    if (isCurrentlyUpload && method !== 'upload' && currentFile && currentFile.files.length > 0) {
        window.showUserConfirm(
            'Discard File?',
            'Switching creation methods will remove your uploaded file. Do you want to discard it?',
            () => {
                currentFile.value = '';
                const label = document.getElementById('mat-gen-file-label');
                if (label) {
                    label.textContent = 'No file selected (Max 25MB)';
                    label.classList.add('text-slate-400');
                }
                window.performQuizMethodSwitch(method);
            }
        );
        return;
    }

    window.performQuizMethodSwitch(method);
};

window.saveQuizDraft = function () {
    window.showUserConfirm(
        'Save Quiz as Draft?',
        'Do you want to save quiz as a draft? You can continue editing it later.',
        () => {
            const btn = document.getElementById('quiz-draft-btn');
            const loading = document.getElementById('quiz-draft-loading');
            if (btn && loading) {
                btn.disabled = true;
                loading.classList.remove('hidden');
            }

            setTimeout(() => {
                window.pendingQuizData = {
                    questions: JSON.parse(JSON.stringify(window.currentQuizQuestions)),
                    isDraft: true,
                    timestamp: new Date().toLocaleString(),
                    source: window.quizEditorMode === 'ai' ? 'ai' : 'manual'
                };
                window.addSubjectMaterial('Quiz', true); // Preserve fields
            }, 800);
        }
    );
};

window.finalizeQuizCreation = function () {
    window.showUserConfirm(
        'Finish Creating Quiz?',
        'Are you finish creating quiz? Once finalized, this quiz will be added as a material and you cant edit any more.',
        () => {
            const btn = document.getElementById('quiz-create-btn');
            const loading = document.getElementById('quiz-create-loading');
            if (btn && loading) {
                btn.disabled = true;
                loading.classList.remove('hidden');
            }

            setTimeout(() => {
                window.pendingQuizData = {
                    questions: JSON.parse(JSON.stringify(window.currentQuizQuestions)),
                    isDraft: false,
                    timestamp: new Date().toLocaleString(),
                    source: window.quizEditorMode === 'ai' ? 'ai' : 'manual'
                };
                window.addSubjectMaterial('Quiz', true); // Preserve fields
            }, 800);
        }
    );
};

window.performQuizMethodSwitch = function (method) {
    const uploadTab = document.getElementById('tab-quiz-upload');
    const createTab = document.getElementById('tab-quiz-draft');
    const aiTab = document.getElementById('tab-quiz-ai');
    const container = document.getElementById('quiz-method-container');

    [uploadTab, createTab, aiTab].forEach(t => {
        t.className = 'px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all text-slate-400 hover:text-black';
    });

    const activeTab = method === 'upload' ? uploadTab : method === 'draft' ? createTab : aiTab;
    activeTab.className = `px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all bg-white text-black shadow-sm ${method === 'ai' ? 'flex items-center justify-center' : ''}`;

    if (method === 'upload') {
        container.innerHTML = `
            <div class="space-y-6">
                <label class="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">File Type</label>
                <div class="flex p-1.5 bg-slate-100 rounded-[20px] w-fit">
                    <button onclick="window.switchGenericFileTab('docx')" id="tab-gen-docx"
                        class="px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all bg-white text-black shadow-sm">
                        DOCX
                    </button>
                    <button onclick="window.switchGenericFileTab('pdf')" id="tab-gen-pdf"
                        class="px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all text-slate-400 hover:text-black">
                        PDF
                    </button>
                    <button onclick="window.switchGenericFileTab('pptx')" id="tab-gen-pptx"
                        class="px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all text-slate-400 hover:text-black">
                        PPTX
                    </button>
                </div>
                <div id="gen-file-input-container">
                    <div class="flex items-center gap-4">
                        <div id="mat-gen-file-label" class="flex-1 bg-slate-50 border border-slate-100 px-8 py-5 rounded-[24px] text-slate-400 text-base font-medium truncate">
                            No file selected (Max 25MB)
                        </div>
                        <input type="file" id="mat-gen-file-input" accept=".docx" class="hidden" onchange="window.handleGenericFileChange(this, 'docx', 25)">
                        <button onclick="document.getElementById('mat-gen-file-input').click()" 
                            class="px-8 py-5 bg-[#15803d] text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#166534] transition-all whitespace-nowrap shadow-lg shadow-green-100">
                            Upload DOCX
                        </button>
                    </div>
                </div>
                <div id="mat-gen-preview-container" class="aspect-video w-full bg-slate-50 border border-dashed border-slate-200 rounded-[32px] overflow-hidden flex flex-col items-center justify-center gap-4">
                    <i id="mat-gen-icon" class="fa-solid fa-file-word text-slate-200 text-6xl"></i>
                    <p class="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No file uploaded</p>
                </div>
            </div>
        `;
    } else if (method === 'draft') {
        if (window.pendingQuizData && window.pendingQuizData.source === 'manual') {
            const quiz = window.pendingQuizData;
            container.innerHTML = `
                <div class="space-y-6">
                    <div class="p-8 bg-white border border-slate-100 rounded-[32px] shadow-xl shadow-slate-200/20 flex items-center gap-6">
                        <div class="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-icc">
                            <i class="fa-solid fa-file-signature text-2xl"></i>
                        </div>
                        <div class="flex-1">
                            <h4 class="text-base font-black text-black">Created Quiz File</h4>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                ${quiz.questions.length} Questions • ${quiz.isDraft ? 'DRAFT' : 'FINALIZED'} • ${quiz.timestamp}
                            </p>
                        </div>
                        <div class="flex items-center gap-3">
                            ${quiz.isDraft ? `
                                <button onclick="window.goToQuizCreate('edit')" class="px-6 py-3 bg-slate-50 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#FFD000] transition-all">
                                    Edit Draft
                                </button>
                            ` : `
                                <span class="px-4 py-2 bg-green-50 text-green-600 text-[9px] font-black uppercase tracking-widest rounded-lg">
                                    <i class="fa-solid fa-check mr-1"></i> Ready
                                </span>
                            `}
                            <button onclick="window.pendingQuizData = null; window.performQuizMethodSwitch('draft')" class="w-10 h-10 rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center">
                                <i class="fa-solid fa-trash-can text-sm"></i>
                            </button>
                        </div>
                    </div>
                    ${!quiz.isDraft ? `
                        <div class="p-6 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex gap-4">
                            <i class="fa-solid fa-circle-info text-blue-400 mt-1"></i>
                            <p class="text-[11px] font-medium text-blue-600 leading-relaxed">
                                This quiz has been finalized. You can now add the title and description above and click "Add Material" to save it to your subject topics.
                            </p>
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-20 bg-slate-50 border border-dashed border-slate-200 rounded-[32px] gap-6">
                    <div class="w-20 h-20 rounded-[28px] bg-white shadow-sm flex items-center justify-center text-slate-400">
                        <i class="fa-solid fa-pen-nib text-3xl"></i>
                    </div>
                    <div class="text-center">
                        <h4 class="text-lg font-black text-black">Create Your Quiz</h4>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Build custom questions manually</p>
                    </div>
                    <button onclick="window.goToQuizCreate()" class="px-12 py-5 bg-[#15803d] text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#166534] transition-all shadow-xl shadow-green-100">
                        Create Quiz
                    </button>
                </div>
            `;
        }
    } else if (method === 'ai') {
        if (window.pendingQuizData && window.pendingQuizData.source === 'ai') {
            const quiz = window.pendingQuizData;
            container.innerHTML = `
                <div class="space-y-6">
                    <div class="p-8 bg-white border border-slate-100 rounded-[32px] shadow-xl shadow-slate-200/20 flex items-center gap-6">
                        <div class="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-icc">
                            <i class="fa-solid fa-bolt-lightning text-2xl"></i>
                        </div>
                        <div class="flex-1">
                            <h4 class="text-base font-black text-black">AI Generated Quiz</h4>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                ${quiz.questions.length} Questions • ${quiz.isDraft ? 'DRAFT' : 'FINALIZED'} • ${quiz.timestamp}
                            </p>
                        </div>
                        <div class="flex items-center gap-3">
                            ${quiz.isDraft ? `
                                <button onclick="window.goToQuizAI()" class="px-6 py-3 bg-slate-50 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#FFD000] transition-all">
                                    Edit AI Draft
                                </button>
                            ` : `
                                <span class="px-4 py-2 bg-green-50 text-green-600 text-[9px] font-black uppercase tracking-widest rounded-lg">
                                    <i class="fa-solid fa-check mr-1"></i> Ready
                                </span>
                            `}
                            <button onclick="window.pendingQuizData = null; window.performQuizMethodSwitch('ai')" class="w-10 h-10 rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center">
                                <i class="fa-solid fa-trash-can text-sm"></i>
                            </button>
                        </div>
                    </div>
                    ${!quiz.isDraft ? `
                        <div class="p-6 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex gap-4">
                            <i class="fa-solid fa-circle-info text-blue-400 mt-1"></i>
                            <p class="text-[11px] font-medium text-blue-600 leading-relaxed">
                                This quiz has been finalized. You can now add the title and description above and click "Add Material" to save it to your subject topics.
                            </p>
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-20 bg-slate-50 border border-dashed border-slate-200 rounded-[32px] gap-6">
                    <div class="w-20 h-20 rounded-[28px] bg-white shadow-sm flex items-center justify-center text-icc">
                        <i class="fa-solid fa-bolt-lightning text-3xl"></i>
                    </div>
                    <div class="text-center">
                        <h4 class="text-lg font-black text-black">AI Quiz Generator</h4>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Let AI craft your assessments</p>
                    </div>
                    <button onclick="window.goToQuizAI()" class="px-12 py-5 bg-icc text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-icc-dark transition-all shadow-xl shadow-green-100 flex items-center gap-3">
                        <i class="fa-solid fa-bolt-lightning"></i>
                        Generate Quiz
                    </button>
                </div>
            `;
        }
    }
    window.checkMaterialValidity();
};

window.goToQuizCreate = function (mode = 'create') {
    window.quizEditorMode = mode;

    // Capture current values before switching views
    window.pendingMaterialState = {
        title: document.getElementById('mat-editor-title')?.value || "",
        desc: document.getElementById('mat-editor-desc')?.value || "",
        topicId: document.getElementById('mat-topic-id')?.value || ""
    };

    if (mode === 'edit' && window.pendingQuizData) {
        window.currentQuizQuestions = JSON.parse(JSON.stringify(window.pendingQuizData.questions));
    } else if (mode === 'create') {
        window.currentQuizQuestions = [];
    }

    // Clone for change tracking
    window.currentQuizQuestionsOriginal = JSON.parse(JSON.stringify(window.currentQuizQuestions));

    const mainView = document.getElementById('subject-materials-main-view');
    const editorView = document.getElementById('subject-material-editor-view');
    const globalFooter = document.getElementById('subject-global-footer');

    if (mainView && editorView) {
        mainView.classList.add('hidden');
        editorView.classList.remove('hidden');
        if (globalFooter) globalFooter.classList.add('hidden');
        window.renderQuizCreator();
    }
};

window.renderQuizCreator = function () {
    const editorView = document.getElementById('subject-material-editor-view');
    if (!editorView) return;

    const hasQuestions = window.currentQuizQuestions.length > 0;
    const isAI = window.quizEditorMode === 'ai';
    const modeTitle = isAI ? 'Generate Quiz' : (window.quizEditorMode === 'edit' ? 'Edit Quiz' : 'Create Quiz');

    editorView.innerHTML = `
        <div class="space-y-8 font-['Inter']">
            <div class="flex items-center gap-6">
                <button onclick="window.handleQuizCreatorBack()" class="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 hover:bg-[#FFD000] hover:text-black transition-all flex items-center justify-center shadow-sm">
                    <i class="fa-solid fa-chevron-left text-sm"></i>
                </button>
                <div>
                    <h3 class="text-2xl font-black text-black tracking-tight">${modeTitle}</h3>
                </div>
            </div>

            <div id="quiz-questions-container" class="space-y-6">
                ${window.currentQuizQuestions.length === 0 ? `
                    <div class="py-20 flex flex-col items-center justify-center text-slate-300 opacity-50">
                        <i class="fa-solid fa-clipboard-question text-6xl mb-4"></i>
                        <p class="text-[10px] font-black uppercase tracking-widest">No questions added yet</p>
                    </div>
                ` : window.currentQuizQuestions.map((q, idx) => window.renderQuizQuestionItem(q, idx)).join('')}
            </div>

            <div class="flex pt-2 relative">
                ${isAI ? `
                    <div class="relative group">
                        <button class="text-[#FFD000] hover:text-black text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ml-1 peer">
                            <i class="fa-solid fa-plus text-sm"></i>
                            Add Question
                        </button>
                        <div class="absolute left-1 bottom-full mb-4 w-52 bg-white border border-slate-100 rounded-[24px] shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible hover:opacity-100 hover:visible transition-all z-50 overflow-hidden py-3 p-1">
                            <div class="px-5 py-2 mb-1">
                                <span class="text-[9px] font-black text-slate-300 uppercase tracking-widest">Select Question Type</span>
                            </div>
                            <button onclick="window.aiGenerateQuestion('True or False')" class="w-full text-left px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-[#FFD000] hover:text-black rounded-xl transition-all flex items-center gap-3">
                                <i class="fa-solid fa-circle-check text-[10px]"></i>
                                True or False
                            </button>
                            <button onclick="window.aiGenerateQuestion('Short Answer')" class="w-full text-left px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-[#FFD000] hover:text-black rounded-xl transition-all flex items-center gap-3">
                                <i class="fa-solid fa-i-cursor text-[10px]"></i>
                                Short Answer
                            </button>
                            <button onclick="window.aiGenerateQuestion('Multiple Choice')" class="w-full text-left px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-[#FFD000] hover:text-black rounded-xl transition-all flex items-center gap-3">
                                <i class="fa-solid fa-list-ul text-[10px]"></i>
                                Multiple Choice
                            </button>
                        </div>
                    </div>
                ` : `
                    <button onclick="window.addQuizQuestion()" class="text-[#FFD000] hover:text-black text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ml-1">
                        <i class="fa-solid fa-plus text-sm"></i>
                        Add Question
                    </button>
                `}
            </div>

            <div class="flex items-center justify-end gap-4 pt-10 border-t border-slate-50">
                <button id="quiz-draft-btn" onclick="window.saveQuizDraft()" ${!hasQuestions ? 'disabled' : ''} 
                    class="px-10 py-5 bg-white border border-slate-200 text-black text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all shadow-sm ${!hasQuestions ? 'opacity-50 cursor-not-allowed' : ''} flex items-center gap-3">
                    <i class="fa-solid fa-spinner fa-spin hidden" id="quiz-draft-loading"></i>
                    Save Quiz as Draft
                </button>
                <button id="quiz-create-btn" onclick="window.finalizeQuizCreation()" ${!hasQuestions ? 'disabled' : ''} 
                    class="px-12 py-5 bg-[#15803d] text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#166534] transition-all shadow-xl shadow-green-100 ${!hasQuestions ? 'opacity-50 cursor-not-allowed' : ''} flex items-center gap-3">
                    <i class="fa-solid fa-spinner fa-spin hidden" id="quiz-create-loading"></i>
                    Create Quiz
                </button>
            </div>
        </div>
    `;
};

window.aiGenerateQuestion = function (type) {
    let questionText = "";
    let choices = [];
    let answer = null;

    if (type === 'Multiple Choice') {
        questionText = "Which of the following is a key principle of effective design?";
        choices = ["Complexity", "Consistency", "Randomness", "Clutter"];
        answer = "Consistency";
    } else if (type === 'True or False') {
        questionText = "Visual hierarchy helps users navigate content efficiently.";
        answer = "True";
    } else {
        questionText = "What does 'UI' stand for in web development?";
        answer = "User Interface";
    }

    window.currentQuizQuestions.push({
        type: type,
        question: questionText,
        choices: choices,
        answer: answer,
        points: 0
    });

    window.renderQuizCreator();

    // Auto-scroll
    setTimeout(() => {
        const container = document.getElementById('quiz-questions-container');
        if (container && container.lastElementChild) {
            container.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
};

window.goToQuizAI = function () {
    window.quizEditorMode = 'ai';

    // Capture current values before switching views
    window.pendingMaterialState = {
        title: document.getElementById('mat-editor-title')?.value || "",
        desc: document.getElementById('mat-editor-desc')?.value || "",
        topicId: document.getElementById('mat-topic-id')?.value || ""
    };

    if (window.pendingQuizData && window.pendingQuizData.source === 'ai') {
        window.currentQuizQuestions = JSON.parse(JSON.stringify(window.pendingQuizData.questions));
    } else {
        window.currentQuizQuestions = [];
    }

    window.currentQuizQuestionsOriginal = JSON.parse(JSON.stringify(window.currentQuizQuestions));

    const mainView = document.getElementById('subject-materials-main-view');
    const editorView = document.getElementById('subject-material-editor-view');
    const globalFooter = document.getElementById('subject-global-footer');

    if (mainView && editorView) {
        mainView.classList.add('hidden');
        editorView.classList.remove('hidden');
        if (globalFooter) globalFooter.classList.add('hidden');
        window.renderQuizCreator();
    }
};

window.handleQuizCreatorBack = function () {
    const hasChanges = JSON.stringify(window.currentQuizQuestions) !== JSON.stringify(window.currentQuizQuestionsOriginal);
    const targetTab = window.quizEditorMode === 'ai' ? 'ai' : 'draft';

    if (hasChanges) {
        window.showUserConfirm(
            'Unsaved Changes?',
            'Any changes you made will be lost if you proceed without saving.',
            () => {
                window.addSubjectMaterial('Quiz', true); // Pass true to preserve fields
            }
        );
    } else {
        window.addSubjectMaterial('Quiz', true);
    }
};

window.addQuizQuestion = function () {
    window.currentQuizQuestions.push({
        type: 'Multiple Choice',
        question: '',
        choices: [],
        answer: null,
        points: 0
    });
    window.renderQuizCreator();

    // Auto-scroll to the new question
    setTimeout(() => {
        const container = document.getElementById('quiz-questions-container');
        if (container && container.lastElementChild) {
            container.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
};

window.removeQuizQuestion = function (idx) {
    window.currentQuizQuestions.splice(idx, 1);
    window.renderQuizCreator();
};

window.updateQuestionType = function (idx, type) {
    const q = window.currentQuizQuestions[idx];
    q.type = type;
    q.choices = type === 'Multiple Choice' ? [] : [];
    q.answer = null;
    window.renderQuizCreator();
};

window.addQuizChoice = function (qIdx) {
    window.currentQuizQuestions[qIdx].choices.push('');
    window.renderQuizCreator();
};

window.removeQuizChoice = function (qIdx, cIdx) {
    const q = window.currentQuizQuestions[qIdx];
    const removedChoice = q.choices[cIdx];

    // If the removed choice was the answer, reset the answer
    if (q.answer === removedChoice) {
        q.answer = null;
    }

    q.choices.splice(cIdx, 1);
    window.renderQuizCreator();
};

window.renderQuizQuestionItem = function (q, idx) {
    return `
        <div class="bg-white border border-slate-100 rounded-[40px] p-10 shadow-2xl shadow-slate-200/40 space-y-10 relative group">
            <button onclick="window.removeQuizQuestion(${idx})" class="absolute top-8 right-8 w-10 h-10 rounded-xl bg-slate-50 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center">
                <i class="fa-solid fa-xmark text-sm"></i>
            </button>

            <div class="grid grid-cols-2 gap-8">
                <div class="space-y-3">
                    <label class="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Question Type</label>
                    <select onchange="window.updateQuestionType(${idx}, this.value)" 
                        class="w-full bg-slate-50 border border-slate-100 px-8 py-5 rounded-[24px] text-base font-black text-black outline-none focus:border-black transition-all appearance-none cursor-pointer">
                        <option value="True or False" ${q.type === 'True or False' ? 'selected' : ''}>True or False</option>
                        <option value="Short Answer" ${q.type === 'Short Answer' ? 'selected' : ''}>Short Answer</option>
                        <option value="Multiple Choice" ${q.type === 'Multiple Choice' ? 'selected' : ''}>Multiple Choice</option>
                    </select>
                </div>
            </div>

            <div class="space-y-3">
                <label class="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Question</label>
                <textarea 
                    maxlength="1000"
                    placeholder="Question"
                    oninput="window.currentQuizQuestions[${idx}].question = this.value"
                    class="w-full bg-slate-50/50 border border-slate-100 px-8 py-6 rounded-[32px] text-base font-medium text-black outline-none focus:border-black focus:bg-white transition-all shadow-inner min-h-[120px] resize-none"
                    style="text-transform: none; font-weight: 500;">${q.question}</textarea>
            </div>

            <div class="space-y-6">
                ${window.renderQuestionTypeUI(q, idx)}
            </div>

            <div class="flex items-center justify-between pt-6 border-t border-slate-50">
                <div class="flex items-center gap-4">
                    <span class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Answer Key:</span>
                    <span id="ans-key-${idx}" class="text-base font-medium text-black" style="text-transform: none;">
                        ${q.answer === null ? '<span class="text-red-400 italic text-[11px] font-bold uppercase tracking-widest">No answer selected</span>' : q.answer}
                    </span>
                </div>
                <div class="flex items-center gap-3">
                    <span class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Points:</span>
                    <button onclick="window.editQuizPoints(${idx})" class="w-16 py-2 bg-slate-50 border border-slate-100 rounded-xl text-base font-black text-black hover:border-[#FFD000] transition-all">
                        ${q.points}
                    </button>
                </div>
            </div>
        </div>
    `;
};

window.updateQuizAnswerKey = function (qIdx) {
    const q = window.currentQuizQuestions[qIdx];
    const span = document.getElementById(`ans-key-${qIdx}`);
    if (!span) return;

    if (q.answer === null || q.answer === '') {
        span.innerHTML = '<span class="text-red-400 italic text-[11px] font-bold uppercase tracking-widest">No answer selected</span>';
    } else {
        span.textContent = q.answer;
        span.className = "text-base font-medium text-black";
    }
};

window.syncQuizAnswer = function (qIdx) {
    const q = window.currentQuizQuestions[qIdx];
    const checkedRadio = document.querySelector(`input[name="q-${qIdx}-ans"]:checked`);
    if (checkedRadio) {
        // Find which radio is checked and get its corresponding choice value
        const radios = Array.from(document.querySelectorAll(`input[name="q-${qIdx}-ans"]`));
        const radioIdx = radios.indexOf(checkedRadio);
        if (radioIdx !== -1) {
            const choiceInputs = document.querySelectorAll(`input[oninput*="window.currentQuizQuestions[${qIdx}].choices"]`);
            if (choiceInputs[radioIdx]) {
                q.answer = choiceInputs[radioIdx].value;
            }
        }
    }
    window.updateQuizAnswerKey(qIdx);
};

window.renderQuestionTypeUI = function (q, idx) {
    if (q.type === 'Multiple Choice') {
        return `
            <div class="space-y-4">
                ${q.choices.map((c, cIdx) => `
                    <div class="flex items-center gap-4 group/choice">
                        <input type="radio" name="q-${idx}-ans" ${q.answer === c && c !== '' ? 'checked' : ''} 
                            onchange="window.currentQuizQuestions[${idx}].answer = window.currentQuizQuestions[${idx}].choices[${cIdx}]; window.updateQuizAnswerKey(${idx})"
                            class="w-5 h-5 accent-black cursor-pointer">
                        <div class="flex-1 relative">
                            <input type="text" maxlength="1000" value="${c}"
                                placeholder="Enter choice..."
                                oninput="window.currentQuizQuestions[${idx}].choices[${cIdx}] = this.value; window.syncQuizAnswer(${idx})"
                                class="w-full bg-white border border-slate-200 px-6 py-4 rounded-[18px] text-base font-medium text-black outline-none focus:border-[#FFD000] hover:border-[#FFD000] transition-all"
                                style="text-transform: none;">
                            <button onclick="window.removeQuizChoice(${idx}, ${cIdx})" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover/choice:opacity-100">
                                <i class="fa-solid fa-circle-xmark"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
                <button onclick="window.addQuizChoice(${idx})" class="text-[11px] font-black text-black uppercase tracking-widest hover:text-[#FFD000] transition-all flex items-center gap-2 ml-1 mt-2">
                    <i class="fa-solid fa-plus-circle"></i>
                    Add Choice
                </button>
            </div>
        `;
    } else if (q.type === 'True or False') {
        return `
            <div class="flex gap-8 ml-1">
                <label class="flex items-center gap-3 cursor-pointer group">
                    <input type="radio" name="q-${idx}-tf" ${q.answer === 'True' ? 'checked' : ''} 
                        onchange="window.currentQuizQuestions[${idx}].answer = 'True'; window.updateQuizAnswerKey(${idx})"
                        class="w-6 h-6 accent-black">
                    <span class="text-base font-black text-black group-hover:text-[#FFD000] transition-all">True</span>
                </label>
                <label class="flex items-center gap-3 cursor-pointer group">
                    <input type="radio" name="q-${idx}-tf" ${q.answer === 'False' ? 'checked' : ''} 
                        onchange="window.currentQuizQuestions[${idx}].answer = 'False'; window.updateQuizAnswerKey(${idx})"
                        class="w-6 h-6 accent-black">
                    <span class="text-base font-black text-black group-hover:text-[#FFD000] transition-all">False</span>
                </label>
            </div>
        `;
    } else {
        // Short Answer
        return `
            <div class="space-y-3">
                <label class="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Correct Answer</label>
                <input type="text" maxlength="1000" value="${q.answer || ''}"
                    oninput="window.currentQuizQuestions[${idx}].answer = this.value; window.updateQuizAnswerKey(${idx})"
                    placeholder="Enter the expected answer..."
                    class="w-full bg-white border border-slate-200 px-8 py-5 rounded-[24px] text-base font-medium text-black outline-none focus:border-[#FFD000] hover:border-[#FFD000] transition-all"
                    style="text-transform: none;">
            </div>
        `;
    }
};

window.editQuizPoints = function (idx) {
    const q = window.currentQuizQuestions[idx];
    const val = prompt('Enter points (0-100):', q.points);
    if (val !== null) {
        const pts = parseInt(val);
        if (!isNaN(pts) && pts >= 0 && pts <= 100) {
            q.points = pts;
            window.renderQuizCreator();
        } else {
            alert('Please enter a valid number between 0 and 100');
        }
    }
};

window.switchVideoSourceTab = function (type) {
    const videoUrl = document.getElementById('mat-video-url')?.value.trim();
    const videoFile = document.getElementById('mat-video-file-input');
    const hasContent = videoUrl || (videoFile && videoFile.files.length > 0);
    const currentTab = document.querySelector('[id^="tab-video-"].bg-white');
    const currentType = currentTab ? currentTab.id.replace('tab-video-', '') : '';

    if (hasContent && currentType !== type) {
        window.showUserConfirm(
            'do you want to discard this file?',
            'Switching sources will remove your current video selection.',
            () => {
                window.performVideoSourceTabSwitch(type);
            }
        );
    } else {
        window.performVideoSourceTabSwitch(type);
    }
};

window.performVideoSourceTabSwitch = function (type) {
    const embeddedTab = document.getElementById('tab-video-embedded');
    const mp4Tab = document.getElementById('tab-video-mp4');
    const inputContainer = document.getElementById('video-source-input-container');
    const preview = document.getElementById('mat-video-preview-container');

    // Reset everything when switching
    if (preview) preview.innerHTML = `<i class="fa-solid fa-play text-white/20 text-6xl group-hover:scale-110 transition-transform"></i>`;

    if (type === 'embedded') {
        if (embeddedTab) embeddedTab.className = 'px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all bg-white text-black shadow-sm';
        if (mp4Tab) mp4Tab.className = 'px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all text-slate-400 hover:text-black';
        if (inputContainer) {
            inputContainer.innerHTML = `
                <input type="text" id="mat-video-url"
                    oninput="window.handleVideoUrlChange(this.value)"
                    placeholder="Paste YouTube URL here..."
                    class="w-full bg-slate-50 border border-slate-100 px-8 py-5 rounded-[24px] text-base font-medium text-black outline-none focus:border-black transition-all">
            `;
        }
    } else {
        if (mp4Tab) mp4Tab.className = 'px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all bg-white text-black shadow-sm';
        if (embeddedTab) embeddedTab.className = 'px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all text-slate-400 hover:text-black';
        if (inputContainer) {
            inputContainer.innerHTML = `
                <div class="flex items-center gap-4">
                    <div id="mat-video-file-label" class="flex-1 bg-slate-50 border border-slate-100 px-8 py-5 rounded-[24px] text-slate-400 text-base font-medium truncate">
                        No file selected
                    </div>
                    <input type="file" id="mat-video-file-input" accept="video/mp4" class="hidden" onchange="window.handleVideoFileChange(this)">
                    <button onclick="document.getElementById('mat-video-file-input').click()" 
                        class="px-8 py-5 bg-[#15803d] text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#166534] transition-all whitespace-nowrap shadow-lg shadow-green-100">
                        Upload MP4
                    </button>
                </div>
            `;
        }
    }
    window.checkMaterialValidity();
};

window.checkMaterialValidity = function () {
    const isEdit = window.currentEditingMaterialIndex !== -1;
    const materialToEdit = isEdit ? window.currentSubjectMaterials[window.currentEditingMaterialIndex] : null;

    const title = document.getElementById('mat-editor-title')?.value.trim();
    const desc = document.getElementById('mat-editor-desc')?.value.trim();
    const topicId = document.getElementById('mat-topic-id')?.value;
    const addBtn = document.getElementById('mat-add-btn');

    // Basic Validation
    let isValid = title && desc && topicId;

    // Type-Specific Validation
    if (isValid) {
        // If it's a quiz
        const quizMethodContainer = document.getElementById('quiz-method-container');
        if (quizMethodContainer) {
            const hasExistingQuiz = isEdit && materialToEdit.quizData;
            isValid = window.pendingQuizData !== null || hasExistingQuiz;
        }

        // If it's a video (mp4/youtube)
        const videoUrl = document.getElementById('mat-video-url')?.value.trim();
        const videoFile = document.getElementById('mat-video-file-input');
        if (document.getElementById('video-source-input-container')) {
            const hasExistingVideo = isEdit && (materialToEdit.videoUrl || materialToEdit.fileName);
            isValid = videoUrl || (videoFile && videoFile.files.length > 0) || hasExistingVideo;
        }

        // If it's a generic file (docx/pdf/pptx)
        // If it's a generic file (docx/pdf/pptx) or a quiz via upload
        const genFileContainer = document.getElementById('gen-file-input-container');
        const genFile = document.getElementById('mat-gen-file-input');
        if (genFileContainer) {
            const hasExistingFile = isEdit && materialToEdit.fileName;
            const hasNewFile = genFile && genFile.files.length > 0;

            // If it's a quiz, we also check if it's in upload mode
            const isQuizUpload = quizMethodContainer && document.getElementById('tab-quiz-upload')?.classList.contains('bg-white');

            if (quizMethodContainer) {
                if (isQuizUpload) {
                    isValid = hasNewFile || hasExistingFile;
                } else {
                    // Handled by quizMethodContainer block above (AI/Draft)
                }
            } else {
                isValid = hasNewFile || hasExistingFile;
            }
        }
    }

    if (addBtn) {
        // ADDITIONAL: In Edit mode, also check if ANYTHING has changed from original
        if (isEdit && window.originalEditingMaterialState && isValid) {
            const currentVideoUrl = document.getElementById('mat-video-url')?.value.trim() || "";
            const currentState = JSON.stringify({
                title: title,
                desc: desc,
                topicId: topicId,
                videoUrl: currentVideoUrl,
                videoFile: null,
                genFile: null,
                quizData: window.pendingQuizData
            });

            if (currentState === window.originalEditingMaterialState) {
                isValid = false; // Lock if no changes
            }
        }

        addBtn.disabled = !isValid;
        addBtn.style.opacity = isValid ? '1' : '0.5';
        addBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
    }
};

window.cancelMaterialEditor = function () {
    const isEdit = window.currentEditingMaterialIndex !== -1;
    const title = document.getElementById('mat-editor-title')?.value.trim();
    const desc = document.getElementById('mat-editor-desc')?.value.trim();
    const topicId = document.getElementById('mat-topic-id')?.value;
    const videoUrl = document.getElementById('mat-video-url')?.value.trim();

    // Quick change detection
    if (isEdit && window.originalEditingMaterialState) {
        const currentState = JSON.stringify({
            title: title,
            desc: desc,
            topicId: topicId,
            videoUrl: videoUrl || "",
            videoFile: null, // Hard to detect file input changes without complex logic
            genFile: null,
            quizData: window.pendingQuizData
        });

        // We only check basic fields for simplicity in change detection
        const orig = JSON.parse(window.originalEditingMaterialState);
        const hasChanges = title !== orig.title || desc !== orig.desc || topicId !== orig.topicId || (videoUrl || "") !== (orig.videoUrl || "");

        if (hasChanges) {
            window.showUserConfirm(
                'do you want to go unsave?',
                'Any changes made to this material will be lost.',
                () => {
                    window.closeMaterialEditor();
                }
            );
            return;
        }
    } else {
        const isFilled = title || desc || videoUrl ||
            (document.getElementById('mat-video-file-input')?.files.length > 0) ||
            (document.getElementById('mat-gen-file-input')?.files.length > 0) ||
            window.pendingQuizData;

        if (isFilled) {
            window.showUserConfirm(
                'do you want to cancel?',
                'All progress in this material will be lost.',
                () => {
                    window.closeMaterialEditor();
                }
            );
            return;
        }
    }

    window.closeMaterialEditor();
};

window.closeMaterialEditor = function () {
    const mainView = document.getElementById('subject-materials-main-view');
    const editorView = document.getElementById('subject-material-editor-view');
    const globalFooter = document.getElementById('subject-global-footer');

    if (mainView && editorView) {
        editorView.classList.add('hidden');
        mainView.classList.remove('hidden');
        if (globalFooter) globalFooter.classList.remove('hidden');
    }
};

window.subjectMaterialSearchQuery = "";

window.searchSubjectMaterials = function (query) {
    window.subjectMaterialSearchQuery = (query || "").trim().toLowerCase();
    window.renderSubjectMaterials();
};

window.renderSubjectMaterials = function () {
    const list = document.getElementById('subject-materials-grid');
    const empty = document.getElementById('subject-materials-empty');
    if (!list || !empty) return;

    const query = window.subjectMaterialSearchQuery;
    let materialsToRender = window.currentSubjectMaterials;

    if (query) {
        materialsToRender = materialsToRender.filter(m => {
            const topic = window.currentSubjectTopics.find(t => t.id == m.topicId);
            const topicTitle = topic ? topic.title.toLowerCase() : '';
            const materialTitle = m.title.toLowerCase();
            return materialTitle.includes(query) || topicTitle.includes(query);
        });
    }

    if (materialsToRender.length === 0) {
        list.classList.add('hidden');
        empty.classList.remove('hidden');
        const emptyMsg = empty.querySelector('p');
        if (emptyMsg) {
            emptyMsg.textContent = query ? 'Not Found' : 'No materials added yet';
        }
        return;
    }

    list.classList.remove('hidden');
    empty.classList.add('hidden');

    list.innerHTML = materialsToRender.map((material) => {
        // Find the ORIGINAL index in window.currentSubjectMaterials for actions
        const idx = window.currentSubjectMaterials.findIndex(m => m.id === material.id);
        const topic = window.currentSubjectTopics.find(t => t.id == material.topicId);
        const topicTitle = topic ? topic.title : 'No Topic';

        let iconHtml = '';
        let iconColorClass = 'text-icc';
        let iconBgClass = 'bg-slate-50';

        if (material.type === 'Video') {
            if (material.sourceType === 'mp4') {
                iconHtml = '<i class="fa-solid fa-file-video text-xl"></i>';
                iconColorClass = 'text-blue-600';
                iconBgClass = 'bg-blue-50';
            } else {
                iconHtml = '<i class="fa-brands fa-youtube text-xl"></i>';
                iconColorClass = 'text-red-600';
                iconBgClass = 'bg-red-50';
            }
        } else if (material.type === 'Quiz') {
            if (material.quizData) {
                if (material.quizData.source === 'ai') {
                    iconHtml = '<i class="fa-solid fa-robot text-xl"></i>';
                    iconColorClass = 'text-purple-600';
                    iconBgClass = 'bg-purple-50';
                } else {
                    iconHtml = '<i class="fa-solid fa-file-signature text-xl"></i>';
                    iconColorClass = 'text-amber-600';
                    iconBgClass = 'bg-amber-50';
                }
            } else {
                const ft = material.fileType || 'docx';
                if (ft === 'pdf') {
                    iconHtml = '<i class="fa-solid fa-file-pdf text-xl"></i>';
                    iconColorClass = 'text-red-500';
                    iconBgClass = 'bg-red-50';
                } else if (ft === 'pptx') {
                    iconHtml = '<i class="fa-solid fa-file-powerpoint text-xl"></i>';
                    iconColorClass = 'text-orange-600';
                    iconBgClass = 'bg-orange-50';
                } else {
                    iconHtml = '<i class="fa-solid fa-file-word text-xl"></i>';
                    iconColorClass = 'text-emerald-600';
                    iconBgClass = 'bg-emerald-50';
                }
            }
        } else {
            const ft = material.fileType || 'docx';
            if (ft === 'pdf') {
                iconHtml = '<i class="fa-solid fa-file-pdf text-xl"></i>';
                iconColorClass = 'text-red-500';
                iconBgClass = 'bg-red-50';
            } else if (ft === 'pptx') {
                iconHtml = '<i class="fa-solid fa-file-powerpoint text-xl"></i>';
                iconColorClass = 'text-orange-600';
                iconBgClass = 'bg-orange-50';
            } else {
                iconHtml = '<i class="fa-solid fa-file-word text-xl"></i>';
                iconColorClass = 'text-emerald-600';
                iconBgClass = 'bg-emerald-50';
            }
        }

        // Clean seconds from timestamp: "4/27/2026, 5:33:01 PM" -> "4/27/2026, 5:33 PM"
        const cleanTimestamp = material.timestamp.replace(/:\d{2} /, ' ');

        return `
            <div id="material-item-${material.id}" class="group relative bg-white border border-slate-100 rounded-[32px] p-8 shadow-xl shadow-slate-200/20 transition-all hover:shadow-2xl hover:shadow-slate-200/40">
                <!-- Kebab Menu -->
                <div class="absolute top-6 right-6 z-10">
                    <button onclick="window.toggleMaterialOptions(event, ${idx})" class="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-300 hover:text-black transition-all">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                    <!-- Dropdown -->
                    <div id="mat-options-${idx}" class="hidden absolute right-0 top-full mt-2 w-32 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden">
                        <button onclick="window.addSubjectMaterial('', false, ${idx})" class="w-full text-left px-4 py-3 hover:bg-slate-50 text-[10px] font-bold text-black uppercase tracking-widest transition-all">
                            Edit
                        </button>
                        <button onclick="window.removeSubjectMaterial(${idx})" class="w-full text-left px-4 py-3 hover:bg-red-50 text-[10px] font-bold text-red-500 uppercase tracking-widest transition-all">
                            Delete
                        </button>
                    </div>
                </div>

                <div class="space-y-6">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-2xl ${iconBgClass} flex items-center justify-center ${iconColorClass} transition-all">
                            ${iconHtml}
                        </div>
                        <div class="flex-1">
                            <h4 class="text-base font-bold text-black leading-tight" style="text-transform: none;">${material.title}</h4>
                            <p class="text-[10px] font-medium text-slate-400 mt-1" style="text-transform: none;">${topicTitle}</p>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <p class="text-[11px] text-black leading-relaxed line-clamp-2" style="text-transform: none; font-weight: 500;">
                            ${material.description || 'No description provided.'}
                        </p>
                    </div>

                    <div class="pt-6 border-t border-slate-50 flex items-center justify-between">
                        <span class="text-[10px] font-bold text-black uppercase tracking-widest">${cleanTimestamp}</span>
                        <div class="px-4 py-1.5 bg-slate-50 rounded-full">
                            <span class="text-[9px] font-black text-black uppercase tracking-[0.2em]">${material.type}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    window.checkSubjectFormValidity();
};

window.toggleMaterialOptions = function (event, index) {
    event.stopPropagation();
    // Close all other dropdowns first
    document.querySelectorAll('[id^="mat-options-"]').forEach(el => {
        if (el.id !== `mat-options-${index}`) el.classList.add('hidden');
    });

    const dropdown = document.getElementById(`mat-options-${index}`);
    if (dropdown) {
        dropdown.classList.toggle('hidden');

        const close = (e) => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
                document.removeEventListener('click', close);
            }
        };
        if (!dropdown.classList.contains('hidden')) {
            document.addEventListener('click', close);
        }
    }
};

window.removeSubjectMaterial = function (index, isFromEditor = false) {
    window.showUserConfirm(
        'do you want to delete the material?',
        'This action cannot be undone.',
        () => {
            window.currentSubjectMaterials.splice(index, 1);
            window.renderSubjectMaterials();
            if (isFromEditor) window.closeMaterialEditor();
        }
    );
};

window.handleMaterialTitleInput = function (index, input) {
    window.currentSubjectMaterials[index].title = input.value;
};

window.renderSubjectTopics = function () {
    // Re-check validity whenever topics list changes (for Next button locking)
    window.checkSubjectFormValidity();

    const list = document.getElementById('subject-topics-list');
    const empty = document.getElementById('subject-topics-empty');
    if (!list || !empty) return;

    if (window.currentSubjectTopics.length === 0) {
        list.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    list.classList.remove('hidden');
    empty.classList.add('hidden');

    list.innerHTML = window.currentSubjectTopics.map((topic, idx) => {
        if (topic.isEditing) {
            return `
                <div id="topic-item-${topic.id}" data-id="${topic.id}" class="p-10 bg-slate-50 border border-slate-200 rounded-[40px] relative overflow-hidden transition-all group">
                    <div class="flex flex-col md:flex-row gap-10 items-start">
                        <!-- Topic Image Preview -->
                        <div class="shrink-0 space-y-4">
                            <div class="w-48 h-60 rounded-[32px] border-[3px] border-[#FFD000] overflow-hidden shadow-2xl relative">
                                <img src="${topic.image}" class="w-full h-full object-cover" alt="Topic Image">
                            </div>
                            <button type="button" onclick="window.openTopicImagePicker(${idx})" 
                                class="w-full py-3 bg-white border border-slate-200 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-2">
                                <i class="fa-solid fa-camera text-slate-400"></i>
                                Change Cover
                            </button>
                        </div>

                        <!-- Topic Form -->
                        <div class="flex-1 space-y-8 w-full pt-2">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-xl bg-icc text-white flex items-center justify-center text-xs font-black italic">
                                        ${idx + 1}
                                    </div>
                                </div>
                            </div>
                            
                            <div class="space-y-6">
                                <div class="space-y-3">
                                    <label class="text-[10px] font-black text-black uppercase tracking-widest ml-1">Topic Title</label>
                                    <input type="text" 
                                        maxlength="80"
                                        value="${topic.title}"
                                        oninput="window.handleTopicTitleInput(${idx}, this)"
                                        placeholder="e.g. Fundamental Concepts"
                                        class="w-full bg-white border border-slate-200 px-6 py-4 rounded-2xl text-base font-bold text-black outline-none focus:border-black transition-all shadow-sm">
                                </div>

                                <div class="space-y-3">
                                    <div class="flex items-center justify-between ml-1">
                                        <label class="text-[10px] font-black text-black uppercase tracking-widest">Description</label>
                                        <span id="topic-desc-counter-${idx}" class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${topic.description.length} / 500</span>
                                    </div>
                                    <textarea 
                                        maxlength="500"
                                        rows="3"
                                        oninput="window.handleTopicDescInput(${idx}, this)"
                                        placeholder="Enter topic description..."
                                        class="w-full bg-white border border-slate-200 px-6 py-4 rounded-2xl text-sm font-medium text-black outline-none focus:border-black transition-all shadow-sm resize-none">${topic.description}</textarea>
                                </div>
                            </div>

                            <div class="flex items-center gap-4 pt-6">
                                <button onclick="window.saveSubjectTopic(${idx})" class="px-8 py-4 bg-icc text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-icc-dark transition-all shadow-lg flex-1">
                                    Save Changes
                                </button>
                                <button onclick="window.cancelSubjectTopic(${idx})" class="px-8 py-4 bg-white border border-slate-200 text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all shadow-sm flex-1">
                                    Cancel
                                </button>
                                ${!topic.isNew ? `
                                    <button onclick="window.removeSubjectTopic(${idx})" class="w-12 h-12 rounded-2xl bg-red-50 text-red-500 hover:bg-red-100 transition-all flex items-center justify-center shrink-0">
                                        <i class="fa-regular fa-trash-can"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Saved State: Optimized for wrapping and stretching
            return `
                <div id="topic-item-${topic.id}" data-id="${topic.id}" class="group relative bg-white border border-slate-100 rounded-[40px] overflow-hidden shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-slate-300/50 transition-all duration-500 min-h-[180px] cursor-move">
                    <div class="flex flex-col md:flex-row h-full">
                        <!-- Left: Topic Image -->
                        <div class="md:w-64 shrink-0 overflow-hidden bg-slate-50 border-r border-slate-50">
                            <img src="${topic.image}" class="w-full h-full min-h-[200px] object-cover transition-transform duration-700" alt="Topic Image">
                        </div>

                        <!-- Right: Topic Info -->
                        <div class="flex-1 p-10 pr-16 flex flex-col justify-center relative">
                            <!-- Action Buttons -->
                            <div class="absolute top-8 right-8 flex items-center gap-2">
                                <button onclick="window.editSubjectTopic(${idx})" class="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-icc hover:text-white transition-all flex items-center justify-center">
                                    <i class="fa-solid fa-pen-to-square text-sm"></i>
                                </button>
                                <i class="fa-solid fa-grip-vertical text-slate-200 ml-2"></i>
                            </div>

                            <div class="space-y-4">
                                <span class="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Topic ${idx + 1}</span>
                                <h4 class="text-2xl font-black text-black leading-tight break-words pr-4">${topic.title}</h4>
                                <p class="text-sm font-bold text-black leading-relaxed break-words pr-4 whitespace-pre-wrap">${topic.description || 'No description provided.'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }).join('');

    // Initialize Sortable if not already done
    if (window.Sortable && !list._sortable) {
        list._sortable = new Sortable(list, {
            animation: 150,
            handle: '.group', // Saved cards are draggable
            draggable: '> div',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            scroll: document.getElementById('subject-edit-overlay') || true,
            scrollSensitivity: 150,
            scrollSpeed: 30,
            onEnd: function () {
                // Update array order based on DOM
                const newOrder = [];
                list.querySelectorAll('[data-id]').forEach(el => {
                    const id = parseInt(el.getAttribute('data-id'));
                    const topic = window.currentSubjectTopics.find(t => t.id === id);
                    if (topic) newOrder.push(topic);
                });
                window.currentSubjectTopics = newOrder;
                window.renderSubjectTopics(); // Re-render to update "Topic X" labels
            }
        });
    }
};

window.handleTopicTitleInput = function (index, input) {
    // No regex filtering here as per user request ("symbol" allowed)
    window.currentSubjectTopics[index].title = input.value;
};

window.handleTopicDescInput = function (index, textarea) {
    window.currentSubjectTopics[index].description = textarea.value;
    const counter = document.getElementById(`topic-desc-counter-${index}`);
    if (counter) {
        counter.textContent = `${textarea.value.length} / 500`;
    }
};

window.openTopicImagePicker = function (index) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-6';
    modal.id = 'topic-image-picker-modal';

    const renderGrid = () => {
        const allTemplates = [...window.topicTemplates, ...window.uploadedTemplates];
        return `
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8">
                <!-- Upload Panel -->
                <div class="relative group cursor-pointer aspect-[3/4] rounded-3xl border-2 border-dashed border-slate-200 hover:border-black flex flex-col items-center justify-center bg-slate-50 transition-colors">
                    <div class="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-3">
                        <i class="fa-solid fa-arrow-up-from-bracket text-2xl text-slate-400"></i>
                    </div>
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-500">Upload New</span>
                    <input type="file" class="absolute inset-0 opacity-0 cursor-pointer" onchange="window.handleTopicUpload(${index}, this)">
                </div>

                ${allTemplates.map(img => {
            const isUploaded = window.uploadedTemplates.includes(img);
            return `
                        <div class="relative group aspect-[3/4] rounded-3xl overflow-hidden border-[4px] border-transparent hover:border-[#FFD000] transition-all shadow-md">
                            <img src="${img}" class="w-full h-full object-cover cursor-pointer" onclick="window.setTopicImage(${index}, '${img}', this)">
                            <div onclick="window.setTopicImage(${index}, '${img}', this)" class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                <div class="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                                    <i class="fa-solid fa-check"></i>
                                </div>
                            </div>
                            ${isUploaded ? `
                                <button onclick="window.deleteUploadedTemplate('${img}', ${index}, event)" 
                                    class="absolute top-4 right-4 w-8 h-8 rounded-lg bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg z-10">
                                    <i class="fa-solid fa-trash-can text-xs"></i>
                                </button>
                            ` : ''}
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    };

    modal.innerHTML = `
        <div class="bg-white rounded-[48px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div class="p-10 border-b border-slate-50 flex items-center justify-between shrink-0">
                <div>
                    <h3 class="text-2xl font-black text-black tracking-tight">Design Templates</h3>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Choose or upload a topic cover</p>
                </div>
                <button onclick="this.closest('.fixed').remove()" class="w-12 h-12 rounded-full hover:bg-slate-100 flex items-center justify-center text-black transition-all">
                    <i class="fa-solid fa-xmark text-xl"></i>
                </button>
            </div>
            
            <div id="topic-picker-grid-container" class="flex-1 overflow-y-auto p-10">
                ${renderGrid()}
            </div>
            
            <div class="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-end shrink-0">
                <button onclick="this.closest('.fixed').remove()" class="px-10 py-4 bg-icc text-white text-[10px] font-bold uppercase tracking-widest rounded-2xl hover:bg-icc-dark transition-all shadow-lg">
                    Cancel Selection
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.deleteUploadedTemplate = function (img, index, event) {
    event.stopPropagation();
    window.uploadedTemplates = window.uploadedTemplates.filter(t => t !== img);

    // Fallback logic: If any topic is using this image, switch it to the first default template
    window.currentSubjectTopics.forEach(topic => {
        if (topic.image === img) {
            topic.image = window.topicTemplates[0] || 'image/Topic.jpg';
        }
    });

    // Re-render topics to reflect change if needed
    window.renderSubjectTopics();

    // Refresh the grid without closing the modal
    const container = document.getElementById('topic-picker-grid-container');
    if (container) {
        // We need a way to re-render the grid. I'll just rebuild the innerHTML.
        const allTemplates = [...window.topicTemplates, ...window.uploadedTemplates];
        container.innerHTML = `
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8">
                <!-- Upload Panel -->
                <div class="relative group cursor-pointer aspect-[3/4] rounded-3xl border-2 border-dashed border-slate-200 hover:border-black flex flex-col items-center justify-center bg-slate-50 transition-colors">
                    <div class="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-3">
                        <i class="fa-solid fa-arrow-up-from-bracket text-2xl text-slate-400"></i>
                    </div>
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-500">Upload New</span>
                    <input type="file" class="absolute inset-0 opacity-0 cursor-pointer" onchange="window.handleTopicUpload(${index}, this)">
                </div>

                ${allTemplates.map(t => {
            const isUploaded = window.uploadedTemplates.includes(t);
            return `
                        <div class="relative group aspect-[3/4] rounded-3xl overflow-hidden border-[4px] border-transparent hover:border-[#FFD000] transition-all shadow-md">
                            <img src="${t}" class="w-full h-full object-cover cursor-pointer" onclick="window.setTopicImage(${index}, '${t}', this)">
                            <div onclick="window.setTopicImage(${index}, '${t}', this)" class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                <div class="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                                    <i class="fa-solid fa-check"></i>
                                </div>
                            </div>
                            ${isUploaded ? `
                                <button onclick="window.deleteUploadedTemplate('${t}', ${index}, event)" 
                                    class="absolute top-4 right-4 w-8 h-8 rounded-lg bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg z-10">
                                    <i class="fa-solid fa-trash-can text-xs"></i>
                                </button>
                            ` : ''}
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    }
};

window.handleTopicUpload = function (index, input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const uploadedImg = e.target.result;
            if (!window.uploadedTemplates.includes(uploadedImg)) {
                window.uploadedTemplates.unshift(uploadedImg);
            }
            window.currentSubjectTopics[index].image = uploadedImg;
            window.renderSubjectTopics();
            input.closest('.fixed').remove();
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.checkSubjectDraftStatus = function () {
    // Moved to checkSubjectFormValidity to prevent visibility conflicts
    window.checkSubjectFormValidity();
};

window.handleSubjectTypeChange = function () {
    const typeSelect = document.getElementById('edit-subject-type');
    const strandContainer = document.getElementById('edit-subject-strand-container');
    if (typeSelect && strandContainer) {
        if (typeSelect.value === 'Specialized') {
            strandContainer.classList.remove('hidden');
        } else {
            strandContainer.classList.add('hidden');
        }
    }
};

window.hasSubjectChanges = function () {
    const currentValues = {
        code: document.getElementById('edit-subject-code').value,
        name: document.getElementById('edit-subject-name').value,
        units: document.getElementById('edit-subject-units').value,

        type: document.getElementById('edit-subject-type').value,
        strand: document.getElementById('edit-subject-strand').value
    };
    return JSON.stringify(initialSubjectValues) !== JSON.stringify(currentValues);
};

window.showSubjectConfirm = function (title, desc, onProceed) {
    const overlay = document.getElementById('subject-confirm-overlay');
    const titleEl = document.getElementById('subject-confirm-title');
    const descEl = document.getElementById('subject-confirm-desc');
    const cancelBtn = document.getElementById('subject-confirm-cancel');
    const proceedBtn = document.getElementById('subject-confirm-proceed');

    if (!overlay || !titleEl || !descEl || !cancelBtn || !proceedBtn) return;

    titleEl.textContent = title;
    descEl.textContent = desc;
    overlay.classList.remove('hidden');

    const close = () => overlay.classList.add('hidden');
    cancelBtn.onclick = close;
    proceedBtn.onclick = () => {
        onProceed();
        close();
    };
};

window.handleSubjectExit = function () {
    if (window.hasSubjectChanges()) {
        window.showSubjectConfirm(
            'Discard Changes?',
            'You have unsaved modifications to this subject record. Are you sure you want to exit?',
            () => window.toggleSubjectOverlay(false)
        );
    } else {
        window.toggleSubjectOverlay(false);
    }
};

window.handleSubjectDiscard = function () {
    if (window.hasSubjectChanges()) {
        window.showSubjectConfirm(
            'Discard Changes?',
            'Are you sure you want to discard your progress? All unsaved data will be lost.',
            () => {
                window.toggleSubjectOverlay(false);
            }
        );
    } else {
        window.toggleSubjectOverlay(false);
    }
};

window.handleSubjectSavePrompt = function () {
    const proceedBtn = document.getElementById('subject-confirm-proceed');
    if (proceedBtn) proceedBtn.textContent = 'Save as Draft';

    window.showSubjectConfirm(
        'Save as Draft?',
        'This subject will be saved with a "Draft" status. You can continue adding topics and materials later.',
        () => {
            window.handleSubjectSave('Draft');
        }
    );
};

window.handleSubjectSave = function (status = 'Active') {
    const isDraft = status === 'Draft';
    const msgTitle = isDraft ? 'do you want to save as draft?' : 'do you want to create and publish?';

    let msgBody = "";
    if (isDraft) {
        if (window.currentSubjectMaterials.length > 0) {
            msgBody = "This will save all details including subjects, topics, and materials.";
        } else {
            msgBody = "This will save the current subject and topic details.";
        }
    } else {
        msgBody = "This will publish the subject with all added topics and materials.";
    }

    const proceedBtn = document.getElementById('user-confirm-proceed');
    if (proceedBtn) proceedBtn.textContent = 'Yes';

    window.showUserConfirm(
        msgTitle,
        msgBody,
        () => {
            if (window.currentSubjectStep === 2) {
                // Discard active drafting sessions before saving in Step 2
                window.currentSubjectTopics = window.currentSubjectTopics.filter(t => !t.isNew);
                window.currentSubjectTopics.forEach(t => {
                    if (t.isEditing && t._originalState) {
                        Object.assign(t, t._originalState);
                        delete t._originalState;
                    }
                    t.isEditing = false;
                });
                window.renderSubjectTopics();
            }

            // Proceed with actual saving
            window.performSubjectSaveAction(status);
        }
    );
};

window.performSubjectSaveAction = function (status) {
    const saveBtn = document.getElementById('subject-save-btn');
    const saveLoading = document.getElementById('subject-save-loading');
    const draftBtn = document.getElementById('subject-draft-btn');
    const draftLoading = document.getElementById('subject-draft-loading');

    const activeBtn = status === 'Draft' ? draftBtn : saveBtn;
    const activeLoading = status === 'Draft' ? draftLoading : saveLoading;

    if (activeBtn && activeLoading) {
        activeBtn.disabled = true;
        activeLoading.classList.remove('hidden');

        setTimeout(() => {
            activeBtn.disabled = false;
            activeLoading.classList.add('hidden');

            const subjects = getStoredJson(SUBJECTS_STORAGE_KEY, []);
            const newSubject = {
                code: document.getElementById('edit-subject-code').value.trim(),
                name: document.getElementById('edit-subject-name').value.trim(),
                units: document.getElementById('edit-subject-units').value.trim(),
                type: document.getElementById('edit-subject-type').value,
                strand: document.getElementById('edit-subject-strand').value,
                status: status,
                topics: [...window.currentSubjectTopics], // Save all currently saved topics
                materials: [...window.currentSubjectMaterials] // Save all added materials
            };

            const index = subjects.findIndex(s => s.code === newSubject.code);
            if (index > -1) {
                subjects[index] = newSubject;
            } else {
                subjects.push(newSubject);
            }

            saveStoredJson(SUBJECTS_STORAGE_KEY, subjects);
            renderSubjectsTable();
            window.toggleSubjectOverlay(false);
        }, 1500);
    }
};

window.subjectSearchState = window.subjectSearchState || {
    code: '',
    name: '',
    type: ''
};

window.applySubjectSearch = function () {
    window.subjectSearchState = {
        code: String(document.getElementById('subject-search-code')?.value || '').trim(),
        name: String(document.getElementById('subject-search-name')?.value || '').trim(),
        type: String(document.getElementById('subject-search-type')?.value || '').trim()
    };
    renderSubjectsTable();
};

function bindSubjectSearch() {
    const codeInput = document.getElementById('subject-search-code');
    const nameInput = document.getElementById('subject-search-name');
    const typeSelect = document.getElementById('subject-search-type');
    const searchBtn = document.getElementById('subject-search-btn');

    [codeInput, nameInput].forEach(input => {
        if (input && input.dataset.enterBound !== 'true') {
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    window.applySubjectSearch();
                }
            });
            input.dataset.enterBound = 'true';
        }
    });

    if (typeSelect && typeSelect.dataset.changeBound !== 'true') {
        // Removed auto-search on change as requested by user
        typeSelect.dataset.changeBound = 'true';
    }

    if (searchBtn && searchBtn.dataset.searchBound !== 'true') {
        searchBtn.addEventListener('click', window.applySubjectSearch);
        searchBtn.dataset.searchBound = 'true';
    }
}

// --- SECTIONS SEARCH LOGIC ---

window.applySectionSearch = function () {
    window.sectionSearchState = {
        name: String(document.getElementById('section-search-name')?.value || '').trim(),
        room: String(document.getElementById('section-search-room')?.value || '').trim(),
        grade: String(document.getElementById('section-search-grade')?.value || '').trim()
    };
    renderSectionsTable();
};

function bindSectionSearch() {
    const nameInput = document.getElementById('section-search-name');
    const roomInput = document.getElementById('section-search-room');
    const gradeSelect = document.getElementById('section-search-grade');
    const searchBtn = document.getElementById('section-search-btn');

    [nameInput, roomInput].forEach(input => {
        if (input && input.dataset.enterBound !== 'true') {
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    window.applySectionSearch();
                }
            });
            input.dataset.enterBound = 'true';
        }
    });

    if (searchBtn && searchBtn.dataset.searchBound !== 'true') {
        searchBtn.addEventListener('click', window.applySectionSearch);
        searchBtn.dataset.searchBound = 'true';
    }
}

function getFilteredSectionsBySearch(searchState) {
    const sections = getStoredJson(SECTIONS_STORAGE_KEY, []);
    const name = String(searchState?.name || '').toLowerCase();
    const room = String(searchState?.room || '').toLowerCase();
    const grade = String(searchState?.grade || '').toLowerCase();

    return sections.filter(sec => {
        const matchesName = !name || (sec.name && sec.name.toLowerCase().includes(name));
        const matchesRoom = !room || (sec.room && sec.room.toLowerCase().includes(room));
        const matchesGrade = !grade || (sec.grade && sec.grade.toLowerCase() === grade);
        return matchesName && matchesRoom && matchesGrade;
    });
}

function renderSectionsTable() {
    const tableBody = document.getElementById('sectionTableBody');
    if (!tableBody) return;

    const displaySections = getFilteredSectionsBySearch(window.sectionSearchState);
    const hasActiveFilters = Boolean(window.sectionSearchState.name || window.sectionSearchState.room || window.sectionSearchState.grade);

    if (!hasActiveFilters) {
        tableBody.innerHTML = `
            <tr id="section-empty-state" class="bg-white">
                <td colspan="9" class="py-32 text-center">
                    <div class="flex flex-col items-center justify-center space-y-4 opacity-25">
                        <i class="fa-solid fa-layer-group text-6xl text-black"></i>
                        <p class="text-base font-bold text-black font-['Inter']">Search Sections</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    if (displaySections.length === 0) {
        tableBody.innerHTML = `
            <tr class="bg-white">
                <td colspan="9" class="py-32 text-center">
                    <div class="flex flex-col items-center justify-center space-y-4 opacity-25">
                        <i class="fa-solid fa-layer-group text-6xl text-black"></i>
                        <p class="text-base font-bold text-black font-['Inter']">No Matching Found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = displaySections.map(sec => `
        <tr class="hover:bg-slate-50 transition-all group cursor-pointer" onclick="if(window.editSection) window.editSection('${sec.id}')">
            <td class="px-6 py-5">
                <span class="text-[13px] text-black font-['Inter']">${escapeHtml(sec.name)}</span>
            </td>
            <td class="px-6 py-5 text-center">
                <span class="text-[12px] text-black font-['Inter']">
                    ${escapeHtml(sec.grade)}
                </span>
            </td>
            <td class="px-6 py-5">
                <span class="text-[12px] text-black font-['Inter']">${escapeHtml(sec.subject)}</span>
            </td>
            <td class="px-6 py-5">
                <span class="text-[12px] text-black font-['Inter']">${escapeHtml(sec.teacher)}</span>
            </td>
            <td class="px-6 py-5 text-center">
                <span class="text-[12px] text-black font-['Inter']">${escapeHtml(sec.room)}</span>
            </td>
            <td class="px-6 py-5 text-center">
                <span class="text-[12px] text-black font-['Inter']">${sec.studentsCount || 0}</span>
            </td>
            <td class="px-6 py-5 text-center">
                <span class="text-[12px] text-black font-['Inter']">${escapeHtml(sec.schoolYear || '—')}</span>
            </td>
            <td class="px-6 py-5 text-center">
                <span class="text-[12px] font-medium ${sec.status === 'Deployed' ? 'text-[#15803d]' : 'text-red-500'} font-['Inter']">
                    ${sec.status === 'Deployed' ? 'Deployed' : 'Draft'}
                </span>
            </td>
            <td class="px-6 py-5 text-right">
                <div class="flex justify-end">
                    <button class="w-8 h-8 hover:bg-slate-200 rounded-full flex items-center justify-center transition-all group/btn">
                        <i class="fa-solid fa-pen-to-square text-black group-hover/btn:text-[#FFD000] text-sm transition-colors"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function getFilteredSubjectsBySearch(searchState) {
    const subjects = getStoredJson(SUBJECTS_STORAGE_KEY, []);
    const code = String(searchState?.code || '').toLowerCase();
    const name = String(searchState?.name || '').toLowerCase();
    const type = String(searchState?.type || '').toLowerCase();

    return subjects.filter(sub => {
        const matchesCode = !code || (sub.code && sub.code.toLowerCase().includes(code));
        const matchesName = !name || (sub.name && sub.name.toLowerCase().includes(name));
        const matchesType = !type || (sub.type && sub.type.toLowerCase() === type);
        return matchesCode && matchesName && matchesType;
    });
}

function renderSubjectsTable() {
    const tableBody = document.getElementById('subjectTableBody');
    if (!tableBody) return;

    const displaySubjects = getFilteredSubjectsBySearch(window.subjectSearchState);
    const hasActiveFilters = Boolean(window.subjectSearchState.code || window.subjectSearchState.name || window.subjectSearchState.type);

    if (!hasActiveFilters) {
        tableBody.innerHTML = `
            <tr id="subject-empty-state" class="bg-white">
                <td colspan="7" class="py-32 text-center">
                    <div class="flex flex-col items-center justify-center space-y-4 opacity-25">
                        <i class="fa-solid fa-book-open text-6xl text-black"></i>
                        <p class="text-base font-bold text-black font-['Inter']">Search Subjects</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    if (displaySubjects.length === 0) {
        tableBody.innerHTML = `
            <tr id="subject-empty-state" class="bg-white">
                <td colspan="7" class="py-32 text-center">
                    <div class="flex flex-col items-center justify-center space-y-4 opacity-25">
                        <i class="fa-solid fa-magnifying-glass text-6xl text-black"></i>
                        <p class="text-base font-bold text-black font-['Inter']">No matching subjects found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = displaySubjects.map(sub => {
        const isDraft = sub.status === 'Draft';
        const statusColor = isDraft ? 'text-red-600' : 'text-[#15803d]';

        // Mapping for Type
        let typeDisplay = sub.type;
        if (sub.type.toLowerCase() === 'core') typeDisplay = 'Core Subject';
        else if (sub.type.toLowerCase() === 'applied') typeDisplay = 'Applied Subject';
        else if (sub.type.toLowerCase() === 'specialized') typeDisplay = 'Specialized Subject';

        // Format units to always have .0 if integer
        let unitsDisplay = String(sub.units || '0');
        if (!unitsDisplay.includes('.')) unitsDisplay += '.0';

        return `
            <tr class="transition-colors">
                <td class="px-8 py-6 text-center">
                    <div class="text-[11px] font-medium text-black uppercase tracking-widest leading-relaxed">${sub.code}</div>
                </td>
                <td class="px-8 py-6 text-center">
                    <div class="text-[11px] font-medium text-black tracking-widest leading-relaxed">${escapeHtml(sub.name)}</div>
                </td>
                <td class="px-8 py-6 text-center">
                    <div class="text-[11px] font-medium text-black tracking-widest leading-relaxed">${typeDisplay}</div>
                </td>
                <td class="px-8 py-6 text-center">
                    <div class="text-[11px] font-medium text-black tracking-widest leading-relaxed">${unitsDisplay}</div>
                </td>
                <td class="px-8 py-6 text-center">
                    <div class="text-[11px] font-bold ${statusColor} tracking-widest leading-relaxed">
                        ${sub.status || 'Active'}
                    </div>
                </td>
                <td class="px-8 py-6 text-center">
                    <div class="flex justify-center">
                        <button onclick="window.editSubject('${sub.code}')" class="text-black transition-colors group">
                            <i class="fa-regular fa-pen-to-square text-lg group-hover:text-[#FFD000]"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// =============================================================
// USER ACCOUNT MANAGEMENT LOGIC
// =============================================================

let initialUserValues = {};
let editingUserId = null;
let currentUserEditorStep = 1;

function normalizeUserRole(role) {
    const value = String(role || '').trim().toLowerCase();
    if (value === 'admin') return 'Admin';
    if (value === 'teacher') return 'Teacher';
    if (value === 'student') return 'Student';
    if (value === 'head admin' || value === 'master admin') return 'Master Admin';
    return role || '';
}

window.showUserConfirm = function (title, desc, onProceed, isNotification = false, onCancel = null) {
    const overlay = document.getElementById('user-confirm-overlay');
    const titleEl = document.getElementById('user-confirm-title');
    const descEl = document.getElementById('user-confirm-desc');
    const proceedBtn = document.getElementById('user-confirm-proceed');
    const cancelBtn = document.getElementById('user-confirm-cancel');

    if (!overlay || !titleEl || !descEl || !proceedBtn || !cancelBtn) return;

    titleEl.textContent = title;
    descEl.textContent = desc;

    if (isNotification) {
        cancelBtn.classList.add('hidden');
        proceedBtn.textContent = 'OK';
        proceedBtn.parentElement.classList.remove('grid-cols-2');
        proceedBtn.parentElement.classList.add('grid-cols-1');
    } else {
        cancelBtn.classList.remove('hidden');
        proceedBtn.textContent = 'Proceed';
        proceedBtn.parentElement.classList.remove('grid-cols-1');
        proceedBtn.parentElement.classList.add('grid-cols-2');
    }

    const closeOverlay = () => {
        overlay.classList.add('hidden');
        proceedBtn.removeEventListener('click', handleProceed);
        cancelBtn.removeEventListener('click', handleCancel);
    };

    const handleProceed = () => {
        if (onProceed) onProceed();
        closeOverlay();
    };

    const handleCancel = () => {
        if (onCancel) onCancel();
        closeOverlay();
    };

    proceedBtn.addEventListener('click', handleProceed);
    cancelBtn.addEventListener('click', handleCancel);

    overlay.classList.remove('hidden');
};





// Global variable to store current user profile data
window.currentUserProfileData = {};

// User profile tab content (similar to school profile but adapted for user)
const USER_PROFILE_TAB_CONTENT = {
    bio: {
        eyebrow: 'Personal',
        title: 'Bio',
        content: 'Personal information and background'
    },
    achievements: {
        eyebrow: 'Recognition',
        title: 'Achievements',
        content: 'Awards, certificates, and professional milestones'
    },
    subjects: {
        eyebrow: 'Academic',
        title: 'Subjects',
        content: 'Subjects handled or enrolled in'
    },
    sections: {
        eyebrow: 'Academic',
        title: 'Sections',
        content: 'Class sections handled or enrolled in'
    }
};

window.populateUserProfilePage = function () {
    const authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
    const userData = Object.keys(window.currentUserProfileData).length > 0 ? window.currentUserProfileData : {
        firstName: authUser.firstName || 'Firstname',
        lastName: authUser.lastName || 'Lastname',
        role: authUser.role || 'Institutional Admin',
        id: authUser.id || '0000000',
        email: authUser.email || 'information@interface.edu.ph',
        bios: []
    };

    // Update user name in banner
    const firstNameBanner = document.getElementById('view-user-firstName-banner');
    if (firstNameBanner) {
        firstNameBanner.textContent = userData.firstName;
    }
    const lastNameBanner = document.getElementById('view-user-lastName-banner');
    if (lastNameBanner) {
        lastNameBanner.textContent = userData.lastName;
    }

    // Update main brand header
    const brandHeader = document.getElementById('header-brand-title');
    if (brandHeader) {
        brandHeader.textContent = 'Interface Computer College';
    }

    // Clear the center header as requested (only one header)
    const mainHeader = document.getElementById('main-content-header');
    if (mainHeader) {
        mainHeader.textContent = '';
    }

    // Update user role and ID
    const roleEl = document.getElementById('view-user-role');
    if (roleEl) roleEl.textContent = userData.role || 'Unknown Role';
    const idEl = document.getElementById('view-user-id');
    if (idEl) idEl.textContent = `ID: ${userData.id || '0000000'}`;

    // Update identity fields in sidebar - removed first/last name as requested

    // Update contact information
    const emailEl = document.getElementById('view-user-email');
    if (emailEl) emailEl.textContent = userData.email || 'Not provided';

    const profileActions = document.getElementById('user-profile-actions');
    if (profileActions) profileActions.classList.toggle('hidden', !!userData.isReadOnly);

    // Update Lock/Unlock button
    const lockBtn = document.getElementById('profile-lock-btn');
    const lockIcon = document.getElementById('profile-lock-icon');
    const lockLabel = document.getElementById('profile-lock-label');
    const isLocked = (userData.status || '').toLowerCase() === 'locked';
    const isSelf = userData.id === '0000000' || userData.id === authUser.id;

    if (lockBtn) {
        // Hide lock button if viewing self
        lockBtn.classList.toggle('hidden', isSelf);
        // Also hide the divider above it if it's hidden
        const divider = lockBtn.previousElementSibling;
        if (divider && divider.classList.contains('h-px')) {
            divider.classList.toggle('hidden', isSelf);
        }
    }

    if (lockLabel) lockLabel.textContent = isLocked ? 'Unlock Account' : 'Lock Account';
    if (lockIcon) {
        lockIcon.className = isLocked ? 'fa-solid fa-lock-open text-black text-sm' : 'fa-solid fa-lock text-black text-sm';
    }
    if (lockBtn && !isSelf) {
        lockBtn.className = 'w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-2xl transition-all group';

        const labelEl = lockBtn.querySelector('span');
        if (labelEl) {
            labelEl.className = "text-[11px] font-bold text-black font-['Inter']";
        }
    }

    const settingsBtn = document.getElementById('profile-settings-btn');
    if (settingsBtn) {
        const shouldHide = !!userData.isReadOnly || isSelf;
        settingsBtn.classList.toggle('hidden', shouldHide);
        const container = settingsBtn.closest('.relative');
        if (container) container.classList.toggle('hidden', shouldHide);

        // Dynamic label for permissions based on role
        const permsLabel = document.getElementById('profile-edit-permissions-label');
        if (permsLabel) {
            permsLabel.textContent = userData.role === 'Admin' ? 'Edit Roles and Permissions' : 'Edit Permissions';
        }
    }

    // Profile picture interactivity control
    const avatarTrigger = document.getElementById('user-profile-picture-trigger');
    if (avatarTrigger) {
        if (userData.isReadOnly) {
            avatarTrigger.classList.remove('hover:scale-[1.05]', 'cursor-pointer');
            avatarTrigger.classList.add('cursor-default');
            avatarTrigger.onclick = null;
            avatarTrigger.title = '';
        } else {
            avatarTrigger.classList.add('hover:scale-[1.05]', 'cursor-pointer');
            avatarTrigger.classList.remove('cursor-default');
            avatarTrigger.onclick = () => window.toggleUserProfilePictureOverlay(true);
            avatarTrigger.title = 'Change profile picture';
        }
    }

    const phoneEl = document.getElementById('view-user-phone');
    if (phoneEl) phoneEl.textContent = userData.phone || 'Not provided';
    const addrEl = document.getElementById('view-user-address');
    if (addrEl) addrEl.textContent = userData.address || 'Not provided';

    // Update all avatar locations
    const userProfile = JSON.parse(localStorage.getItem('sigma_user_profile') || '{}');
    const loggedInAvatar = userProfile.avatar || '';
    const viewingUserAvatar = userData.avatar || '';

    // 1. Update the profile banner avatar (Specific to the user being viewed)
    const bannerImg = document.getElementById('user-avatar-img');
    const bannerPlaceholder = document.getElementById('user-avatar-placeholder');
    if (bannerImg && bannerPlaceholder) {
        if (viewingUserAvatar) {
            bannerImg.src = viewingUserAvatar;
            bannerImg.classList.remove('hidden');
            bannerPlaceholder.classList.add('hidden');
        } else {
            bannerImg.src = '';
            bannerImg.classList.add('hidden');
            bannerPlaceholder.classList.remove('hidden');
        }
    }

    // 2. Update global identity avatars (The person currently logged in)
    const globalAvatars = [
        { img: 'header-avatar-img', placeholder: 'header-avatar-placeholder' },
        { img: 'sidebar-avatar-img', placeholder: 'sidebar-avatar-placeholder' }
    ];

    globalAvatars.forEach(loc => {
        const imgEl = document.getElementById(loc.img);
        const placeholderEl = document.getElementById(loc.placeholder);
        if (imgEl && placeholderEl) {
            if (loggedInAvatar) {
                imgEl.src = loggedInAvatar;
                imgEl.classList.remove('hidden');
                placeholderEl.classList.add('hidden');
            } else {
                imgEl.src = '';
                imgEl.classList.add('hidden');
                placeholderEl.classList.remove('hidden');
            }
        }
    });

    // Tab visibility control based on permissions
    const perms = userData.permissions || { bio: true, achievements: false, subjects: false, sections: false };
    const tabs = ['bio', 'achievements', 'subjects', 'sections'];
    let firstVisibleTab = 'bio';
    let foundVisible = false;

    tabs.forEach(t => {
        const tabEl = document.getElementById('profile-tab-' + t);
        if (tabEl) {
            const isVisible = !!perms[t];
            tabEl.classList.toggle('hidden', !isVisible);
            if (isVisible && !foundVisible) {
                firstVisibleTab = t;
                foundVisible = true;
            }
        }
    });

    // Initialize user profile tabs - default to first visible tab
    window.switchUserProfileTab(firstVisibleTab);
};

window.renderUserProfileTab = function (tabId = 'bio') {
    const panel = document.getElementById('user-profile-tab-panel');
    if (!panel) return;

    // Use bios from the current user being viewed
    const userBios = window.currentUserProfileData.bios || [];

    if (tabId === 'bio') {
        panel.innerHTML = `
            <div class="space-y-4">
                ${userBios.length > 0 ? `
                    <div class="space-y-10">
                        ${userBios.map((bio, index) => `
                            <div class="flex items-center justify-between group">
                                <div class="space-y-4 animate-in fade-in duration-500">
                                    <h3 class="text-[1.65rem] font-medium text-black tracking-tight font-['Inter']">${escapeHtml(bio.title)}</h3>
                                    <p class="text-sm leading-7 text-black max-w-[680px] font-['Inter']">${escapeHtml(bio.description)}</p>
                                </div>
                                <div class="flex flex-col gap-2 ${window.currentUserProfileData.isReadOnly ? 'hidden' : ''}">
                                    <button class="text-black/20 hover:text-[#FFD000] transition-colors" onclick="window.toggleEditUserBio(false, ${index})">
                                        <i class="fa-solid fa-pen text-[14px]"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                <div class="flex items-center gap-2 text-slate-400 ${userBios.length >= 5 || window.currentUserProfileData.isReadOnly ? 'hidden' : ''} cursor-pointer hover:text-[#FFD000] transition-colors font-['Inter']" onclick="window.toggleEditUserBio()">
                    <p class="text-[10px] font-bold tracking-[0.24em] uppercase font-['Inter']">Add bio</p>
                    <i class="fa-solid fa-pen text-[14px]"></i>
                </div>

                ${window.currentUserProfileData.isReadOnly && userBios.length === 0 ? `
                    <div class="flex flex-col items-center justify-center py-16 gap-3 text-slate-300">
                        <i class="fa-solid fa-note-sticky text-4xl"></i>
                        <p class="text-[11px] font-medium uppercase tracking-[0.3em]">No bio provided</p>
                    </div>
                ` : ''}
            </div>
        `;
        return;
    }

    const content = USER_PROFILE_TAB_CONTENT[tabId] || USER_PROFILE_TAB_CONTENT.bio;
    panel.innerHTML = `
        <div class="space-y-4">
            <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-black/40 font-['Inter']">${escapeHtml(content.eyebrow)}</p>
            <h3 class="text-[1.65rem] font-bold text-black tracking-tight font-['Inter']">${escapeHtml(content.title)}</h3>
            <p class="text-sm text-black leading-relaxed font-['Inter']">${escapeHtml(content.content || content.body || '')}</p>
        </div>
        <div class="flex flex-col items-center justify-center py-16 gap-3 text-slate-300">
            <i class="fa-solid ${tabId === 'achievements' ? 'fa-trophy' : tabId === 'subjects' ? 'fa-book-open' : 'fa-chalkboard'} text-4xl"></i>
            <p class="text-[11px] font-medium uppercase tracking-[0.3em]">No ${tabId} assigned</p>
        </div>
    `;
};

window.toggleEditUserBio = function (shouldSave, index = null) {
    const panel = document.getElementById('user-profile-tab-panel');
    if (!panel) return;
    const isEditing = panel.querySelector('#edit-user-bio-form') !== null;

    if (isEditing) {
        if (shouldSave) {
            const title = document.getElementById('edit-user-bio-title').value.trim();
            const description = document.getElementById('edit-user-bio-description').value.trim();

            let nextBios = [...(window.currentUserProfileData.bios || [])];

            if (index !== null && index >= 0) {
                if (!title && !description) {
                    nextBios.splice(index, 1);
                } else {
                    nextBios[index] = { title, description };
                }
            } else if (nextBios.length < 5) {
                if (title || description) {
                    nextBios.push({ title, description });
                }
            }

            // Update current memory state
            window.currentUserProfileData.bios = nextBios;

            // Persist to correct storage location
            if (window.currentUserProfileData.id === '0000000') {
                // Logged-in user (Self)
                const userProfile = JSON.parse(localStorage.getItem('sigma_user_profile') || '{}');
                userProfile.bios = nextBios;
                localStorage.setItem('sigma_user_profile', JSON.stringify(userProfile));
            } else {
                // Managed user account
                const users = getStoredJson(USER_STORAGE_KEY, []);
                const uIdx = users.findIndex(u => String(u.uid || u.id) === String(window.currentUserProfileData.id));
                if (uIdx !== -1) {
                    users[uIdx].bios = nextBios;
                    saveStoredJson(USER_STORAGE_KEY, users);
                }
            }
        }
        window.renderUserProfileTab('bio');
    } else {
        const userBios = window.currentUserProfileData.bios || [];
        const bioToEdit = (index !== null && userBios[index])
            ? userBios[index]
            : { title: '', description: '' };

        panel.innerHTML = `
            <div id="edit-user-bio-form" class="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <div class="flex items-center justify-between">
                    <h4 class="text-sm font-bold text-black uppercase tracking-widest font-['Inter']">Edit bio</h4>
                </div>
                <div class="space-y-4">
                    <div class="space-y-2">
                        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 font-['Inter']">Title</label>
                        <input type="text" id="edit-user-bio-title" placeholder="Title" maxlength="20" 
                            value="${escapeHtml(bioToEdit.title)}"
                            class="w-full bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium text-black outline-none focus:border-[#FFD000] transition-all font-['Inter']">
                    </div>
                    <div class="space-y-2">
                        <div class="flex items-center justify-between ml-1">
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-['Inter']">Description</label>
                            <span id="user-bio-char-counter" class="text-[10px] font-bold text-slate-400 font-['Inter']">${bioToEdit.description.length}/200</span>
                        </div>
                        <textarea id="edit-user-bio-description" placeholder="Description" maxlength="200" rows="3"
                            class="w-full bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium text-black outline-none focus:border-[#FFD000] transition-all font-['Inter'] resize-none font-['Inter']">${escapeHtml(bioToEdit.description)}</textarea>
                    </div>
                </div>
                <div class="flex items-center justify-between pt-2">
                    <button onclick="document.getElementById('edit-user-bio-title').value=''; document.getElementById('edit-user-bio-description').value=''; document.getElementById('user-bio-char-counter').textContent='0/200';" 
                        class="text-[10px] font-bold text-black hover:bg-slate-100 transition-all uppercase tracking-widest font-['Inter'] px-3 py-2 rounded-lg">Clear</button>
                    <div class="flex items-center gap-3">
                        <button onclick="window.toggleEditUserBio(false)" class="text-[10px] font-bold text-black hover:bg-slate-100 px-3 py-2 rounded-lg transition-colors uppercase tracking-widest font-['Inter']">Cancel</button>
                        <button onclick="window.toggleEditUserBio(true, ${index})" class="bg-[#15803d] text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-[#15803d]/90 transition-colors font-['Inter']">Save</button>
                    </div>
                </div>
            </div>
        `;

        const titleInput = document.getElementById('edit-user-bio-title');
        const descInput = document.getElementById('edit-user-bio-description');
        const counter = document.getElementById('user-bio-char-counter');

        if (descInput && counter) {
            descInput.oninput = () => {
                counter.textContent = `${descInput.value.length}/200`;
            };
        }

        if (titleInput) titleInput.focus();
    }
};

window.toggleEditUserField = function (field, shouldSave = false) {
    const container = document.getElementById(`edit-user-${field}-container`);
    const viewElement = document.getElementById(`view-user-${field}`);
    const inputElement = document.getElementById(`edit-user-${field}-input`);

    if (!container || !viewElement || !inputElement) return;

    if (container.classList.contains('hidden')) {
        // Show edit mode
        container.classList.remove('hidden');
        inputElement.value = (viewElement.textContent === 'Not provided' || viewElement.textContent === 'Not specified' || viewElement.textContent === 'N/A')
            ? ''
            : viewElement.textContent.trim();
        inputElement.focus();
    } else {
        if (shouldSave) {
            // Save the value
            const newValue = inputElement.value.trim();
            const displayValue = newValue || (field === 'grade' ? 'Not specified' : 'Not provided');
            viewElement.textContent = displayValue;

            // Update the in-memory data
            window.currentUserProfileData[field] = newValue;

            // If it's a name field, update the banner as well
            if (field === 'firstName' || field === 'lastName') {
                const fName = field === 'firstName' ? newValue : (window.currentUserProfileData.firstName || '');
                const lName = field === 'lastName' ? newValue : (window.currentUserProfileData.lastName || '');

                if (field === 'firstName') {
                    const banner = document.getElementById('view-user-firstName-banner');
                    if (banner) banner.textContent = newValue || 'Firstname';
                } else {
                    const banner = document.getElementById('view-user-lastName-banner');
                    if (banner) banner.textContent = newValue || 'Lastname';
                }

                const brandHeader = document.getElementById('header-brand-title');
                if (brandHeader) {
                    brandHeader.textContent = 'Interface Computer College';
                }
            }

            // Persist to storage
            if (window.currentUserProfileData.id === '0000000') {
                // Logged-in admin (Self)
                const userProfile = JSON.parse(localStorage.getItem('sigma_user_profile') || '{}');
                userProfile[field] = newValue;
                localStorage.setItem('sigma_user_profile', JSON.stringify(userProfile));

                // Update dropdown name in real-time
                if (field === 'firstName') {
                    const el = document.getElementById('header-dropdown-firstName');
                    if (el) el.textContent = newValue || 'Firstname';
                } else if (field === 'lastName') {
                    const el = document.getElementById('header-dropdown-lastName');
                    if (el) el.textContent = newValue || 'Lastname';
                }
            } else {
                // Managed user account
                const users = getStoredJson(USER_STORAGE_KEY, []);
                const uIdx = users.findIndex(u => String(u.uid || u.id) === String(window.currentUserProfileData.id));
                if (uIdx !== -1) {
                    users[uIdx][field] = newValue;
                    saveStoredJson(USER_STORAGE_KEY, users);
                }
            }
        }
        // Hide edit mode
        container.classList.add('hidden');
    }
};



// Click outside to hide User Filter Menu
document.addEventListener('click', (e) => {
    const filterMenu = document.getElementById('user-filter-menu');
    const filterBtn = filterMenu?.previousElementSibling; // The filter button

    if (filterMenu && !filterMenu.classList.contains('hidden')) {
        if (!filterMenu.contains(e.target) && !filterBtn?.contains(e.target)) {
            filterMenu.classList.add('hidden');
        }
    }
});

window.showMyProfile = function (event) {
    if (event) event.preventDefault();

    // Load logged-in user profile data
    const userProfile = JSON.parse(localStorage.getItem('sigma_user_profile') || '{}');

    // Simulate current logged in user data (fallback to defaults if not in storage)
    window.currentUserProfileData = {
        id: userProfile.id || '0000000',
        firstName: userProfile.firstName || 'Firstname',
        lastName: userProfile.lastName || 'Lastname',
        email: userProfile.email || 'example@gmail.com',
        phone: userProfile.phone || '09123456789',
        address: userProfile.address || 'Manila, Philippines',
        role: userProfile.role || 'Super Administrator',
        gender: userProfile.gender || 'Male',
        schoolBranch: userProfile.schoolBranch || 'Main Campus',
        bios: userProfile.bios || [],
        avatar: userProfile.avatar || ''
    };

    // Hide all header panels
    document.querySelectorAll('.header-panel').forEach(panel => panel.classList.add('hidden'));

    ['profile-toggle', 'noti-toggle', 'calendar-toggle'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.remove('active', 'active-yellow');
    });

    // Navigate to user profile view
    const sections = document.querySelectorAll('.dynamic-section');
    sections.forEach(s => s.classList.add('hidden'));

    const target = document.getElementById('user-profile-view');
    if (target) target.classList.remove('hidden');

    // Update header
    const header = document.getElementById('main-content-header');
    if (header) header.textContent = '';

    populateUserProfilePage();

    // Close dropdown
    const profileDropdown = document.getElementById('profile-dropdown');
    if (profileDropdown) profileDropdown.classList.add('hidden');
};

// --- USER CREATION MULTI-STEP LOGIC ---
let userStep = 1;

// Setup Enter key listeners for User Creation inputs
(function setupUserCreationEnterListeners() {
    // UI logical order for Step 1
    const step1Ids = ['edit-user-role', 'edit-user-firstname', 'edit-user-lastname', 'edit-user-gender'];
    const step2Ids = ['edit-user-email'];

    document.addEventListener('keydown', (e) => {
        const activeId = document.activeElement?.id;
        if (!activeId || !activeId.startsWith('edit-user-')) return;

        if (e.key === 'Enter') {
            if (step1Ids.includes(activeId)) {
                e.preventDefault();
                const currentIndex = step1Ids.indexOf(activeId);

                // If it's the last input of Step 1, try to proceed
                if (currentIndex === step1Ids.length - 1) {
                    window.handleUserStepNext();
                } else {
                    // Otherwise focus next
                    const nextEl = document.getElementById(step1Ids[currentIndex + 1]);
                    if (nextEl) nextEl.focus();
                }
            } else if (step2Ids.includes(activeId)) {
                e.preventDefault();
                window.handleUserSave();
            }
        }
    });
})();

window.toggleUserOverlay = function (show, userData = null) {
    const overlay = document.getElementById('user-edit-overlay');
    if (!overlay) return;

    const titleEl = document.getElementById('user-editor-title');
    const saveLabel = document.getElementById('user-save-label');
    const roleEl = document.getElementById('edit-user-role');
    const idEl = document.getElementById('edit-user-id');

    if (show) {
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        userStep = 1;
        window.userAccountCreated = false; // Reset creation state
        window.isEditingUser = !!userData;

        // Reset/Populate fields
        if (userData) {
            // EDIT MODE: Integrated Modal style (as requested for "in profile" feel)
            overlay.classList.remove('bg-[#f8fafc]', 'p-0');
            overlay.classList.add('bg-slate-900/60', 'backdrop-blur-sm', 'p-6', 'md:p-12');

            const shell = overlay.querySelector('.branch-edit-shell');
            if (shell) shell.classList.add('max-w-[1024px]', 'my-auto');

            const panel = overlay.querySelector('.branch-edit-panel');
            if (panel) {
                panel.classList.add('rounded-[2.5rem]', 'shadow-2xl', 'overflow-hidden');
                panel.classList.remove('min-h-screen', 'shadow-sm');
            }

            if (titleEl) titleEl.textContent = 'Edit User Account';
            if (saveLabel) saveLabel.textContent = 'Save Changes';

            if (roleEl) roleEl.value = userData.role || '';
            document.getElementById('edit-user-firstname').value = userData.firstName || '';
            document.getElementById('edit-user-middlename').value = userData.middleName || '';
            document.getElementById('edit-user-lastname').value = userData.lastName || '';
            document.getElementById('edit-user-gender').value = userData.gender || '';
            document.getElementById('edit-user-school-branch').value = userData.branch || '';
            document.getElementById('edit-user-email').value = (userData.email || '').split('@')[0];
            if (idEl) {
                idEl.value = userData.id || '';
                idEl.readOnly = true;
            }
        } else {
            // CREATE MODE: Reverted to full-screen outerlayer style
            overlay.classList.add('bg-[#f8fafc]', 'p-0');
            overlay.classList.remove('bg-slate-900/60', 'backdrop-blur-sm', 'p-6', 'md:p-12');

            const shell = overlay.querySelector('.branch-edit-shell');
            if (shell) shell.classList.remove('max-w-[1024px]', 'my-auto');

            const panel = overlay.querySelector('.branch-edit-panel');
            if (panel) {
                panel.classList.remove('rounded-[2.5rem]', 'shadow-2xl', 'overflow-hidden');
                panel.classList.add('min-h-screen', 'shadow-sm');
            }

            if (titleEl) titleEl.textContent = 'Create User Account';
            if (saveLabel) saveLabel.textContent = 'Create Account';
            if (idEl) idEl.readOnly = false;

            const inputs = overlay.querySelectorAll('input, select');
            inputs.forEach(input => {
                if (input.tagName === 'SELECT') {
                    input.selectedIndex = 0;
                } else {
                    input.value = '';
                }
            });
        }

        window.updateUserStepUI();

        // Populate school branch dropdown from live branch records
        if (typeof window.populateUserSchoolBranchSelect === 'function') {
            window.populateUserSchoolBranchSelect();
        }
        overlay.scrollTop = 0;
    } else {
        overlay.classList.add('hidden');
        document.body.style.overflow = '';
        // If closing an edit session, reset hash back to user list
        if (window.location.hash.startsWith('#edit-user-')) {
            window.location.hash = 'nav-users-accounts';
        }
    }
};

window.handleUserExit = function () {
    if (userStep < 3) {
        const role = document.getElementById('edit-user-role')?.value;
        const fname = document.getElementById('edit-user-firstname')?.value;
        const lname = document.getElementById('edit-user-lastname')?.value;
        const email = document.getElementById('edit-user-email')?.value;

        const isFilled = (role && role !== '') || (fname && fname !== '') || (lname && lname !== '') || (email && email !== '');

        if (isFilled) {
            const confirmModal = document.getElementById('user-exit-confirm-modal');
            if (confirmModal) {
                confirmModal.classList.remove('hidden');
                return;
            }
        }
    }
    window.toggleUserOverlay(false);
};

window.confirmDiscard = function () {
    const confirmModal = document.getElementById('user-exit-confirm-modal');
    if (confirmModal) confirmModal.classList.add('hidden');
    window.toggleUserOverlay(false);
};

window.cancelExit = function () {
    const confirmModal = document.getElementById('user-exit-confirm-modal');
    if (confirmModal) confirmModal.classList.add('hidden');
};

window.handleUserStepNext = function () {
    if (userStep < 3) {
        if (userStep === 1) {
            // Validation for step 1
            const role = document.getElementById('edit-user-role').value;
            const fname = document.getElementById('edit-user-firstname').value.trim();
            const mname = document.getElementById('edit-user-middlename').value.trim();
            const lname = document.getElementById('edit-user-lastname').value.trim();
            const gender = document.getElementById('edit-user-gender').value;

            if (!role || !fname || !mname || !lname || !gender) {
                window.showUserConfirm('Missing Fields', 'Please fill in all required fields (Role, Names, and Gender).', null, true);
                return;
            }

            window.generateUserId(role);
        } else if (userStep === 2) {
            // Validation for step 2
            const email = document.getElementById('edit-user-email').value.trim();
            if (!email) {
                window.showUserConfirm('Email Required', 'Please enter a Gmail username.', null, true);
                return;
            }
        }
        userStep++;
        window.updateUserStepUI();
    }
};

window.handleUserStepBack = function () {
    if (userStep > 1) {
        userStep--;
        window.updateUserStepUI();
    }
};

window.updateUserStepUI = function () {
    for (let i = 1; i <= 3; i++) {
        const step = document.getElementById(`user-step-${i}`);
        if (step) step.classList.toggle('hidden', i !== userStep);
    }

    const backBtn = document.getElementById('user-step-back-btn');
    const nextBtn = document.getElementById('user-step-next-btn');
    const saveBtn = document.getElementById('user-save-btn');
    const finishBtn = document.getElementById('user-finish-btn');

    if (backBtn) backBtn.classList.toggle('hidden', userStep !== 2); // Show back on step 2, hide on 1 and 3
    if (nextBtn) nextBtn.classList.toggle('hidden', userStep !== 1); // Only next on step 1
    if (saveBtn) saveBtn.classList.toggle('hidden', userStep !== 2); // Save (Create Account) on step 2
    if (finishBtn) finishBtn.classList.toggle('hidden', userStep !== 3); // Close & Finish only on step 3

    // Explicitly handle footer save button label for the final step
    if (saveBtn && !saveBtn.classList.contains('hidden')) {
        const label = document.getElementById('user-save-label');
        if (label) label.textContent = 'Create Account';
        window.validateUserStep2(); // Run validation when entering step 2
    }

    // Animate bar tracks and labels
    for (let n = 1; n <= 3; n++) {
        const track = document.getElementById(`step-bar-${n}-track`);
        const label = document.getElementById(`step-bar-${n}-label`);
        const isActive = userStep >= n;

        if (track) {
            track.classList.toggle('bg-[#15803d]', isActive);
            track.classList.toggle('bg-slate-200', !isActive);
        }
        if (label) {
            label.classList.toggle('text-[#15803d]', isActive);
            label.classList.toggle('text-slate-400', !isActive);
        }
    }
};

window.handleRoleChange = function (role) {
    const gradeField = document.getElementById('grade-level-field');
    if (gradeField) gradeField.classList.toggle('hidden', role !== 'Student');
    // Auto-generate ID preview immediately when role is selected
    if (role) {
        window.generateUserId(role);
    }
};

// Storage keys for sequential counters
const USER_SEQ_KEY_PREFIX = 'sigma_id_seq_';

window.peekUserSeq = function (role) {
    const key = USER_SEQ_KEY_PREFIX + String(role).toLowerCase();
    return parseInt(localStorage.getItem(key) || '0') + 1;
};

window.commitUserSeq = function (role) {
    const key = USER_SEQ_KEY_PREFIX + String(role).toLowerCase();
    const next = parseInt(localStorage.getItem(key) || '0') + 1;
    localStorage.setItem(key, String(next));
};

window.generateUserId = function (role) {
    if (!role) return;

    // YY — last 2 digits of current year
    const year = String(new Date().getFullYear()).slice(-2);

    // BB — branch code from selected branch dropdown
    const branchSelect = document.getElementById('edit-user-school-branch');
    const selectedBranch = branchSelect ? branchSelect.value.trim() : '';
    const branchCode = (typeof window.getSchoolBranchCode === 'function')
        ? window.getSchoolBranchCode(selectedBranch)
        : '01';

    // RR — role code
    const roleCode = role === 'Admin' ? '01' : role === 'Teacher' ? '02' : '03';

    // S — sequential (peek: what the NEXT number will be, without committing yet)
    const seq = window.peekUserSeq(role);

    const id = `${year}${branchCode}${roleCode}${seq}`;

    const idInput = document.getElementById('edit-user-id');
    if (idInput) idInput.value = id;

    window.updateUserPreview();
};

window.updateUserPreview = function () {
    const idInput = document.getElementById('edit-user-id');
    const lnameInput = document.getElementById('edit-user-lastname');
    const emailInput = document.getElementById('edit-user-email');

    const id = idInput ? idInput.value || 'Not generated yet' : 'Not generated yet';
    const lname = lnameInput ? lnameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';

    // Password = lowercase(lastname) + id  e.g. garcia26-01-03-1
    const password = lname && id !== 'Not generated yet'
        ? `${lname.toLowerCase()}${id}`
        : null;

    const prevId = document.getElementById('user-preview-id');
    const prevPass = document.getElementById('user-preview-password');
    const instEmail = document.getElementById('user-instruction-email');
    const finalId = document.getElementById('user-final-id');
    const finalPass = document.getElementById('user-final-password');
    const passInput = document.getElementById('edit-user-password');
    const instCopy = document.getElementById('user-instruction-copy');

    if (prevId) prevId.textContent = id;
    if (prevPass) prevPass.textContent = password || 'Waiting for last name';
    if (passInput) passInput.value = password || '';
    if (instEmail) instEmail.textContent = email ? `${email}@gmail.com` : 'the provided Gmail';
    if (finalId) finalId.textContent = id;
    if (finalPass) finalPass.textContent = password || '-';
    if (instCopy) instCopy.innerHTML = `Login ID: ${id}<br>Password: ${password || '-'}`;
};

window.validateUserStep2 = function () {
    const email = document.getElementById('edit-user-email')?.value || '';
    const saveBtn = document.getElementById('user-save-btn');
    if (saveBtn) {
        const isDisabled = email.trim() === '';
        saveBtn.disabled = isDisabled;
        saveBtn.style.opacity = isDisabled ? '0.5' : '1';
        saveBtn.style.cursor = isDisabled ? 'not-allowed' : 'pointer';
    }
};

window.handleUserSave = function () {
    const loadingIcon = document.getElementById('user-save-loading');
    const saveLabel = document.getElementById('user-save-label');

    if (loadingIcon) loadingIcon.classList.remove('hidden');
    if (saveLabel) saveLabel.textContent = 'Creating...';

    setTimeout(() => {
        try {
            const users = getStoredJson(USER_STORAGE_KEY, []);

            const idEl = document.getElementById('edit-user-id');
            const fnameEl = document.getElementById('edit-user-firstname');
            const mnameEl = document.getElementById('edit-user-middlename');
            const lnameEl = document.getElementById('edit-user-lastname');
            const emailEl = document.getElementById('edit-user-email');
            const roleEl = document.getElementById('edit-user-role');
            const genderEl = document.getElementById('edit-user-gender');
            const branchEl = document.getElementById('edit-user-school-branch');

            const id = idEl ? idEl.value : '';
            const fname = fnameEl ? fnameEl.value.trim() : '';
            const mname = mnameEl ? mnameEl.value.trim() : '';
            const lname = lnameEl ? lnameEl.value.trim() : '';
            const email = emailEl ? emailEl.value.trim() : '';
            const role = roleEl ? roleEl.value : 'User';
            const gender = genderEl ? genderEl.value : '';
            const branch = branchEl ? branchEl.value : 'Main Campus';

            let defaultPerms = { bio: true, achievements: false, subjects: false, sections: false };
            if (role === 'Teacher') {
                defaultPerms = { bio: true, achievements: false, subjects: true, sections: true };
            } else if (role === 'Student') {
                defaultPerms = { bio: true, achievements: true, subjects: true, sections: true };
            }

            const userData = {
                id: id,
                uid: id,
                firstName: fname,
                middleName: mname,
                lastName: lname,
                fullName: `${fname} ${mname} ${lname}`,
                gender: gender,
                branch: branch,
                email: email ? `${email}@gmail.com` : '',
                role: role,
                type: role.toUpperCase(),
                status: 'Active',
                password: lname ? `${lname.toLowerCase()}${id}` : id,
                permissions: defaultPerms
            };

            const existingIndex = users.findIndex(u => String(u.id) === String(id));
            if (existingIndex !== -1) {
                // Update existing user - preserve createdAt and original data
                users[existingIndex] = {
                    ...users[existingIndex],
                    ...userData,
                    updatedAt: new Date().toISOString()
                };
            } else {
                // Add new user
                userData.createdAt = new Date().toISOString();
                userData.createdVia = 'admin-panel';
                users.unshift(userData);

                // Commit the sequential counter for this role (only for new users)
                if (typeof window.commitUserSeq === 'function') {
                    window.commitUserSeq(role);
                }
            }

            saveStoredJson(USER_STORAGE_KEY, users);

            // After saving, move to Step 3 (Success Screen)
            userStep = 3;
            window.updateUserStepUI();

            if (typeof renderUserAccountsTable === 'function') {
                renderUserAccountsTable();
            }
        } catch (error) {
            console.error('Error saving user:', error);
            window.showUserConfirm('Error', 'An error occurred while creating the account. Please try again.', null, true);
        } finally {
            if (loadingIcon) loadingIcon.classList.add('hidden');
            if (saveLabel) saveLabel.textContent = window.isEditingUser ? 'Save Changes' : 'Create Account';
        }
    }, 1000);
};

window.sendCredentialsViaGmail = function () {
    const email = document.getElementById('edit-user-email')?.value;
    const fullEmail = email ? `${email}@gmail.com` : '';
    const id = document.getElementById('user-final-id')?.textContent || '';
    const pass = document.getElementById('user-final-password')?.textContent || '';

    const subject = encodeURIComponent('Your SIGMA ELMS Login Credentials');
    const body = encodeURIComponent(`Hello,\n\nYour account has been created successfully.\n\nLogin ID: ${id}\nPassword: ${pass}\n\nYou can log in at the portal using either your ID or Gmail address.\n\nBest regards,\nInterface Computer College`);

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${fullEmail}&su=${subject}&body=${body}`;
    window.open(gmailUrl, '_blank');
};

window.handleUserSaveAndClose = function () {
    window.handleUserSave();
};

window.downloadUserCredentialsTXT = function () {
    const finalId = document.getElementById('user-final-id')?.textContent ||
        document.getElementById('edit-user-id')?.value || 'Unknown';
    const finalPass = document.getElementById('user-final-password')?.textContent ||
        document.getElementById('edit-user-password')?.value || 'Unknown';
    const fname = document.getElementById('edit-user-firstname')?.value || '';
    const lname = document.getElementById('edit-user-lastname')?.value || '';
    const role = document.getElementById('edit-user-role')?.value || 'User';

    const textContent = `SIGMA ELMS - ACCOUNT CREDENTIALS
================================

Name: ${fname} ${lname}
Role: ${role}

Login ID: ${finalId}
Password: ${finalPass}

Please keep this file secure. You can use these credentials to log in at the index page.`;

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${lname.toLowerCase()}_credentials.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

window.sendUserCredentialsEmail = function () {
    const email = document.getElementById('edit-user-email')?.value || '';
    if (email) {
        window.showUserConfirm('Success', `Account credentials have been sent to ${email}@gmail.com successfully.`, null, true);
    } else {
        window.showUserConfirm('Sent', 'Account credentials have been sent to the user\'s email.', null, true);
    }
};

window.viewUserProfile = function (userId) {
    window.location.hash = '#profile-' + userId;
};

window.handleUserDiscard = function () {
    window.showUserConfirm('Discard Changes', 'Are you sure you want to discard your changes?', () => {
        window.toggleUserOverlay(false);
    });
};

window.editUser = function (userId, isReadOnly = false) {
    if (!userId) return;

    const targetHash = isReadOnly ? 'profile-' + userId : 'edit-user-' + userId;

    if (window.location.hash.slice(1) !== targetHash) {
        window.location.hash = targetHash;
        return;
    }

    window.currentViewingUserId = userId;
    const sections = document.querySelectorAll('.dynamic-section');
    sections.forEach(s => s.classList.add('hidden'));

    const adminMain = document.getElementById('admin-main');
    if (adminMain) adminMain.scrollTop = 0;
    window.scrollTo(0, 0);

    if (isReadOnly) {
        const target = document.getElementById('user-profile-view');
        if (target) target.classList.remove('hidden');

        if (typeof window.updateNavState === 'function') {
            window.updateNavState('nav-profile-dropdown');
        }

        const header = document.getElementById('main-content-header');
        if (header) header.textContent = '';

        const overlay = document.getElementById('user-edit-overlay');
        if (overlay) overlay.classList.add('hidden');
    } else {
        // Now 'edit' mode from hash or direct call also defaults to profile view
        // The overlay is only triggered by the profile's internal gear menu
        const profileView = document.getElementById('user-profile-view');
        if (profileView) {
            profileView.classList.remove('hidden');
            window.populateUserProfilePage();
        }
    }

    const users = getStoredJson(USER_STORAGE_KEY, []);
    const user = users.find(u => String(u.uid || u.id || '') === String(userId));

    if (user) {
        window.currentUserProfileData = {
            id: user.uid || user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role || user.type,
            status: user.status || 'Active',
            gender: user.gender || 'Not specified',
            phone: user.phone || 'Not provided',
            address: user.address || 'Not provided',
            gradeLevel: user.grade || user.gradeLevel || 'N/A',
            schoolBranch: user.schoolBranch || 'Main Campus',
            bios: user.bios || [],
            avatar: user.avatar || '',
            permissions: user.permissions || { bio: true, achievements: false, subjects: false, sections: false },
            isReadOnly: isReadOnly
        };

        if (typeof window.populateUserProfilePage === 'function') {
            window.populateUserProfilePage();
        }
    } else {
        console.error('User not found:', userId);
    }

    document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));
    document.querySelectorAll('.action-dots-btn').forEach(b => b.classList.remove('active'));
};

window.openUserEditor = function (userId) {
    if (userId) {
        window.editUser(userId);
    } else {
        window.toggleUserOverlay(true);
    }
};

// Return to Dashboard on Logo Click
// Global Search Bar Integration
document.addEventListener('DOMContentLoaded', () => {
    const searchBar = document.getElementById('searchBar');
    const searchBtn = document.getElementById('globalSearchBtn');

    const triggerGlobalSearch = () => {
        const query = (searchBar?.value || '').trim();

        // Check for User Edit Overlay
        const userEditOverlay = document.getElementById('user-edit-overlay');
        if (userEditOverlay && !userEditOverlay.classList.contains('hidden')) {
            if (typeof window.toggleUserOverlay === 'function') {
                window.toggleUserOverlay(false);
                return;
            }
        }

        // Check for Permissions Overlay
        const permOverlay = document.getElementById('user-permissions-overlay');
        if (permOverlay && !permOverlay.classList.contains('hidden')) {
            if (typeof window.toggleUserPermissionsOverlay === 'function') {
                window.toggleUserPermissionsOverlay(false);
                return;
            }
        }

        const visibleSection = Array.from(document.querySelectorAll('.dynamic-section:not(.hidden)'))[0];
        if (!visibleSection) return;

        const sectionId = visibleSection.id;

        // Handle Back from Profile View
        if (sectionId === 'user-profile-view') {
            if (typeof window.switchTab === 'function') {
                window.switchTab('nav-users-accounts');
                // If there's a query, wait for the tab switch then apply it
                if (query) {
                    setTimeout(() => {
                        const nameInput = document.getElementById('user-search-name');
                        if (nameInput) {
                            nameInput.value = query;
                            if (typeof window.applyUserAccountSearch === 'function') window.applyUserAccountSearch();
                        }
                    }, 50);
                }
            }
            return;
        }

        if (sectionId === 'users-view') {
            const nameInput = document.getElementById('user-search-name');
            if (nameInput) {
                nameInput.value = query;
                if (typeof window.applyUserAccountSearch === 'function') window.applyUserAccountSearch();
            }
        } else if (sectionId === 'school-subjects-view') {
            const nameInput = document.getElementById('subject-search-name');
            if (nameInput) {
                nameInput.value = query;
                if (typeof window.applySubjectSearch === 'function') window.applySubjectSearch();
            }
        } else if (sectionId === 'school-sections-view') {
            const nameInput = document.getElementById('section-search-name');
            if (nameInput) {
                nameInput.value = query;
                if (typeof window.applySectionSearch === 'function') window.applySectionSearch();
            }
        }
    };

    if (searchBar) {
        searchBar.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                triggerGlobalSearch();
            }
        });
    }
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            triggerGlobalSearch();
        });
    }

    const logoBtn = document.getElementById('nav-logo-btn');
    if (logoBtn) {
        logoBtn.addEventListener('click', () => {
            if (typeof window.switchTab === 'function') {
                window.switchTab('nav-dashboard');
            }
        });
    }
    // Update header calendar icon date
    const dateNumberEl = document.getElementById('calendar-date-number');
    if (dateNumberEl) {
        dateNumberEl.textContent = new Date().getDate();
    }
    // Handle browser back/forward buttons
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.slice(1);
        if (!hash) return;

        if (hash.startsWith('nav-')) {
            // Close overlays when navigating back to a main tab via browser buttons
            const editOverlay = document.getElementById('user-edit-overlay');
            if (editOverlay && !editOverlay.classList.contains('hidden')) {
                editOverlay.classList.add('hidden');
            }
            window.switchTab(hash, true);
        } else if (hash.startsWith('profile-')) {
            const userId = hash.replace('profile-', '');
            window.editUser(userId, true);
        } else if (hash.startsWith('edit-user-')) {
            const userId = hash.replace('edit-user-', '');
            window.editUser(userId, false);
        }
    });

    // Initial navigation based on hash
    const initialHash = window.location.hash.slice(1);
    if (initialHash) {
        if (initialHash.startsWith('nav-')) {
            setTimeout(() => window.switchTab(initialHash, true), 100);
        } else if (initialHash.startsWith('edit-user-')) {
            const userId = initialHash.replace('edit-user-', '');
            setTimeout(() => window.editUser(userId, false), 100);
        } else if (initialHash.startsWith('profile-')) {
            const userId = initialHash.replace('profile-', '');
            setTimeout(() => window.editUser(userId, true), 100);
        }
    } else {
        // Default to dashboard if no hash
        setTimeout(() => window.switchTab('nav-dashboard', true), 100);
    }
    // --- SLIDER MANAGEMENT ---
    window.handleSlideUpload = (event, index) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const preview = document.getElementById(`login-slide-${index}-preview`);
        const placeholder = document.getElementById(`login-slide-${index}-placeholder`);
        const cancelBtn = document.getElementById(`login-slide-${index}-cancel`);

        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');

                // Proportional resizing (MAX 1920x1080) - NO CROPPING
                const MAX_WIDTH = 1920;
                const MAX_HEIGHT = 1080;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height); // Draws the WHOLE image

                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                if (preview) {
                    preview.src = dataUrl;
                    preview.classList.remove('hidden');
                    if (cancelBtn) cancelBtn.classList.remove('hidden');
                }
                if (placeholder) placeholder.classList.add('hidden');
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    };

    window.saveSlidesSettings = () => {
        const btn = document.getElementById('slides-save-btn');
        const icon = btn?.querySelector('i');
        if (btn) btn.disabled = true;
        if (icon) {
            icon.classList.remove('hidden');
            icon.style.display = 'inline-block';
        }

        try {
            const slides = [];
            for (let i = 1; i <= 7; i++) {
                const preview = document.getElementById(`login-slide-${i}-preview`);
                if (preview && preview.src && !preview.classList.contains('hidden')) {
                    // Check if it's a valid data URL or a default path
                    if (preview.src.includes('data:image') || preview.src.includes('image/')) {
                        slides.push({
                            src: preview.src,
                            alt: `Campus Slide ${i}`
                        });
                    }
                }
            }

            if (slides.length === 0) {
                localStorage.removeItem('sigma-custom-login-slides');
            } else {
                localStorage.setItem('sigma-custom-login-slides', JSON.stringify(slides));
            }
        } catch (err) {
            console.error('Slider Save Error:', err);
            alert('Failed to save slides. Try fewer or smaller images.');
        } finally {
            setTimeout(() => {
                if (btn) btn.disabled = false;
                if (icon) icon.style.display = 'none';

                // Hide all cancel buttons as changes are now saved
                for (let i = 1; i <= 7; i++) {
                    const cancelBtn = document.getElementById(`login-slide-${i}-cancel`);
                    if (cancelBtn) cancelBtn.classList.add('hidden');
                }

                if (window.showToast) window.showToast('Login slideshow saved successfully');
                else alert('Login slideshow saved successfully');
            }, 800);
        }
    };

    // Initialize Slider Previews from Storage
    function initSliderPreviews() {
        const savedRaw = localStorage.getItem('sigma-custom-login-slides');
        if (savedRaw) {
            const saved = JSON.parse(savedRaw);
            saved.forEach((slide, idx) => {
                const i = idx + 1;
                const preview = document.getElementById(`login-slide-${i}-preview`);
                const placeholder = document.getElementById(`login-slide-${i}-placeholder`);
                const cancelBtn = document.getElementById(`login-slide-${i}-cancel`);
                if (preview) {
                    preview.src = slide.src;
                    preview.classList.remove('hidden');
                }
                if (placeholder) placeholder.classList.add('hidden');
            });
            // Hide/Clear others beyond saved length
            for (let i = saved.length + 1; i <= 7; i++) {
                const preview = document.getElementById(`login-slide-${i}-preview`);
                const placeholder = document.getElementById(`login-slide-${i}-placeholder`);
                const cancelBtn = document.getElementById(`login-slide-${i}-cancel`);
                if (preview) {
                    preview.src = '';
                    preview.classList.add('hidden');
                }
                if (placeholder) placeholder.classList.remove('hidden');
                if (cancelBtn) cancelBtn.classList.add('hidden');
            }
        }
    }
    initSliderPreviews();

    // --- CLEARING / CANCELING FUNCTIONS ---
    window.clearBrandingPreview = (logoType) => {
        const preview = document.getElementById(`${logoType}-preview`);
        const placeholder = document.getElementById(`${logoType}-placeholder`);
        const cancelBtn = document.getElementById(`${logoType}-cancel`);

        // Revert to last saved photo in localStorage
        const storageKey = logoType === 'login-logo' ? 'sigma-custom-login-logo' :
            logoType === 'login-bar-logo' ? 'sigma-custom-login-bar-logo' : 'sigma-custom-nav-logo';
        const saved = localStorage.getItem(storageKey);

        if (preview) {
            preview.src = saved ? saved : 'image/ICC logo.jpg';
            preview.classList.remove('hidden');
        }
        if (placeholder) placeholder.classList.add('hidden');
        if (cancelBtn) cancelBtn.classList.add('hidden');

        const input = document.getElementById(`${logoType}-input`);
        if (input) input.value = '';
    };

    window.deleteBranding = (logoType) => {
        const preview = document.getElementById(`${logoType}-preview`);
        const placeholder = document.getElementById(`${logoType}-placeholder`);
        const cancelBtn = document.getElementById(`${logoType}-cancel`);

        if (preview) {
            preview.src = '';
            preview.classList.add('hidden');
        }
        if (placeholder) placeholder.classList.remove('hidden');
        if (cancelBtn) cancelBtn.classList.remove('hidden');

        const input = document.getElementById(`${logoType}-input`);
        if (input) input.value = '';
    };

    window.clearSlidePreview = (index) => {
        const preview = document.getElementById(`login-slide-${index}-preview`);
        const placeholder = document.getElementById(`login-slide-${index}-placeholder`);
        const cancelBtn = document.getElementById(`login-slide-${index}-cancel`);

        if (cancelBtn) cancelBtn.classList.add('hidden');

        // Revert to last saved slide from localStorage
        const savedRaw = localStorage.getItem('sigma-custom-login-slides');
        let restored = false;
        if (savedRaw) {
            const saved = JSON.parse(savedRaw);
            // Check if there is a slide at this index (0-indexed in array)
            if (saved[index - 1]) {
                if (preview) {
                    preview.src = saved[index - 1].src;
                    preview.classList.remove('hidden');
                }
                if (placeholder) placeholder.classList.add('hidden');
                restored = true;
            }
        }

        // If no custom saved slide, check for factory defaults (1-5)
        if (!restored) {
            const defaults = [
                'image/ICC Shs.jpg',
                'image/ICC Enrollment.jpg',
                'image/ICC Immersion.jpg',
                'image/ICC Interfacer.jpg',
                'image/ICC Learning.jpg'
            ];
            const factoryDefault = defaults[index - 1];

            if (factoryDefault) {
                if (preview) {
                    preview.src = factoryDefault;
                    preview.classList.remove('hidden');
                }
                if (placeholder) placeholder.classList.add('hidden');
            } else {
                // Truly blank (Slide 6-7)
                if (preview) {
                    preview.src = '';
                    preview.classList.add('hidden');
                }
                if (placeholder) placeholder.classList.remove('hidden');
            }
        }

        if (cancelBtn) cancelBtn.classList.add('hidden');
        // Clear file input
        const input = document.getElementById(`login-slide-${index}-input`);
        if (input) input.value = '';
    };

    window.deleteSlide = (index) => {
        const preview = document.getElementById(`login-slide-${index}-preview`);
        const placeholder = document.getElementById(`login-slide-${index}-placeholder`);
        const cancelBtn = document.getElementById(`login-slide-${index}-cancel`);

        if (preview) {
            preview.src = '';
            preview.classList.add('hidden');
        }
        if (placeholder) placeholder.classList.remove('hidden');
        if (cancelBtn) cancelBtn.classList.remove('hidden');

        const input = document.getElementById(`login-slide-${index}-input`);
        if (input) input.value = '';
    };

    // --- WELCOME PANEL MANAGEMENT ---
    window.handleWelcomePanelUpload = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const preview = document.getElementById('welcome-panel-preview');
        const cancelBtn = document.getElementById('welcome-panel-cancel');

        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                if (preview) {
                    preview.src = reader.result;
                }
                if (cancelBtn) cancelBtn.classList.remove('hidden');
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    };

    window.saveWelcomePanelSettings = () => {
        const btn = document.getElementById('welcome-panel-save-btn');
        const icon = btn?.querySelector('i');
        const cancelBtn = document.getElementById('welcome-panel-cancel');
        if (btn) btn.disabled = true;
        if (icon) {
            icon.classList.remove('hidden');
            icon.style.display = 'inline-block';
        }

        try {
            const welcomePanel = document.getElementById('welcome-panel-preview')?.src || '';
            localStorage.setItem('sigma-welcome-panel', welcomePanel);

            setTimeout(() => {
                if (btn) btn.disabled = false;
                if (icon) {
                    icon.classList.add('hidden');
                    icon.style.display = 'none';
                }
                if (cancelBtn) cancelBtn.classList.add('hidden');
                if (window.showToast) window.showToast('Welcome panel saved successfully');
                else alert('Welcome panel saved successfully');
            }, 500);
        } catch (error) {
            console.error('Error saving welcome panel:', error);
            if (btn) btn.disabled = false;
            if (icon) {
                icon.classList.add('hidden');
                icon.style.display = 'none';
            }
            alert('Failed to save welcome panel');
        }
    };

    window.clearWelcomePanelPreview = () => {
        const preview = document.getElementById('welcome-panel-preview');
        const cancelBtn = document.getElementById('welcome-panel-cancel');

        if (cancelBtn) cancelBtn.classList.add('hidden');

        const saved = localStorage.getItem('sigma-welcome-panel');
        if (saved) {
            if (preview) preview.src = saved;
        } else {
            if (preview) preview.src = 'image/Welcome.jpg';
        }

        const input = document.getElementById('welcome-panel-input');
        if (input) input.value = '';
    };

    window.deleteWelcomePanel = () => {
        const preview = document.getElementById('welcome-panel-preview');
        const cancelBtn = document.getElementById('welcome-panel-cancel');

        if (preview) {
            preview.src = 'image/Welcome.jpg';
        }
        if (cancelBtn) cancelBtn.classList.remove('hidden');

        const input = document.getElementById('welcome-panel-input');
        if (input) input.value = '';
    };

    function initWelcomePanel() {
        const saved = localStorage.getItem('sigma-welcome-panel');
        if (saved) {
            if (document.getElementById('welcome-panel-preview')) {
                document.getElementById('welcome-panel-preview').src = saved;
            }
            // Load the admin dashboard welcome panel
            if (document.getElementById('welcome-panel-admin-img')) {
                document.getElementById('welcome-panel-admin-img').src = saved;
            }
        }
    }
    initWelcomePanel();

    // --- MATERIAL LIMITS MANAGEMENT ---
    window.saveMaterialLimits = () => {
        const btn = event.currentTarget;
        const originalText = btn.innerText;
        btn.disabled = true;
        btn.innerText = 'Saving...';

        const limits = {
            video: {
                embed: document.getElementById('limit-video-embed')?.value || 1,
                mp4: document.getElementById('limit-video-mp4')?.value || 500
            },
            docx: {
                reg: document.getElementById('limit-docx-reg')?.value || 10,
                ext: document.getElementById('limit-docx-ext')?.value || 25
            },
            pdf: {
                reg: document.getElementById('limit-pdf-reg')?.value || 10,
                ext: document.getElementById('limit-pdf-ext')?.value || 25
            },
            pptx: {
                reg: document.getElementById('limit-pptx-reg')?.value || 50,
                ext: document.getElementById('limit-pptx-ext')?.value || 100
            }
        };

        localStorage.setItem('sigma-material-limits', JSON.stringify(limits));

        setTimeout(() => {
            btn.disabled = false;
            btn.innerText = originalText;
            if (window.showToast) window.showToast('Material limits updated and synced');
            else alert('Material limits updated and synced');
        }, 800);
    };

    function initMaterialLimits() {
        const saved = localStorage.getItem('sigma-material-limits');
        if (saved) {
            const limits = JSON.parse(saved);
            if (document.getElementById('limit-video-embed')) document.getElementById('limit-video-embed').value = limits.video?.embed || 1;
            if (document.getElementById('limit-video-mp4')) document.getElementById('limit-video-mp4').value = limits.video?.mp4 || 500;
            if (document.getElementById('limit-docx-reg')) document.getElementById('limit-docx-reg').value = limits.docx?.reg || 10;
            if (document.getElementById('limit-docx-ext')) document.getElementById('limit-docx-ext').value = limits.docx?.ext || 25;
            if (document.getElementById('limit-pdf-reg')) document.getElementById('limit-pdf-reg').value = limits.pdf?.reg || 10;
            if (document.getElementById('limit-pdf-ext')) document.getElementById('limit-pdf-ext').value = limits.pdf?.ext || 25;
            if (document.getElementById('limit-pptx-reg')) document.getElementById('limit-pptx-reg').value = limits.pptx?.reg || 50;
            if (document.getElementById('limit-pptx-ext')) document.getElementById('limit-pptx-ext').value = limits.pptx?.ext || 100;
        }
    }
    initMaterialLimits();

    // --- AI API KEY VAULT LOGIC ---
    let INSTITUTIONAL_PASS = localStorage.getItem('sigma-api-vault-pass') || "sigma2024";

    window.triggerVault = function (id) {
        const gate = document.getElementById(`gate-${id}`);
        const btn = document.getElementById(`btn-vault-${id}`);

        if (!gate || !btn) return;

        btn.classList.add('hidden');
        gate.classList.remove('hidden');

        const passInput = document.getElementById(`pass-${id}`);
        const errorText = document.getElementById(`error-${id}`);
        if (passInput) passInput.value = '';
        if (errorText) errorText.classList.add('hidden');
        if (passInput) passInput.focus();
    };

    window.closeVault = function (id) {
        const gate = document.getElementById(`gate-${id}`);
        const btn = document.getElementById(`btn-vault-${id}`);
        const keyField = document.getElementById(`key-field-${id}`);

        if (!gate || !btn) return;

        gate.classList.add('hidden');
        if (keyField && keyField.classList.contains('hidden')) {
            btn.classList.remove('hidden');
        }
    };

    window.verifyVault = function (id) {
        const passInput = document.getElementById(`pass-${id}`);
        const errorText = document.getElementById(`error-${id}`);
        const gate = document.getElementById(`gate-${id}`);
        const keyField = document.getElementById(`key-field-${id}`);
        const mask = document.getElementById(`mask-${id}`);
        const changePassBtn = document.getElementById(`btn-change-pass-${id}`);

        if (!passInput || !errorText || !gate || !keyField) return;

        if (passInput.value === INSTITUTIONAL_PASS) {
            gate.classList.add('hidden');
            keyField.classList.remove('hidden');
            if (changePassBtn) changePassBtn.classList.remove('hidden');
            if (mask) {
                mask.textContent = "DECRYPTED ACCESS";
                mask.classList.replace('text-slate-200', 'text-green-500');
            }
        } else {
            errorText.classList.remove('hidden');
            passInput.classList.add('border-red-500');
            setTimeout(() => passInput.classList.remove('border-red-500'), 2000);
        }
    };

    window.triggerPasswordChange = function (id) {
        const changeGate = document.getElementById(`change-gate-${id}`);
        const keyField = document.getElementById(`key-field-${id}`);
        if (changeGate) {
            changeGate.classList.remove('hidden');
            if (keyField) keyField.classList.add('hidden');
            const input = document.getElementById(`new-pass-${id}`);
            if (input) {
                input.value = '';
                input.focus();
            }
        }
    };

    window.closePasswordChange = function (id) {
        const changeGate = document.getElementById(`change-gate-${id}`);
        const keyField = document.getElementById(`key-field-${id}`);
        if (changeGate) changeGate.classList.add('hidden');
        if (keyField) keyField.classList.remove('hidden');
    };

    window.updateVaultPassword = function (id) {
        const input = document.getElementById(`new-pass-${id}`);
        if (!input || !input.value.trim()) return;

        INSTITUTIONAL_PASS = input.value.trim();
        localStorage.setItem('sigma-api-vault-pass', INSTITUTIONAL_PASS);

        window.closePasswordChange(id);
        if (window.showToast) window.showToast('Institutional Password Updated');
        else alert('Institutional Password Updated Globally');
    };

    window.saveApiKeys = function () {
        const keys = {
            gemini: document.getElementById('api-key-gemini')?.value || '',
            groq: document.getElementById('api-key-groq')?.value || '',
            recaptcha: document.getElementById('api-key-recaptcha')?.value || '',
            drive: document.getElementById('api-key-drive')?.value || ''
        };

        localStorage.setItem('sigma-api-keys', JSON.stringify(keys));

        const btn = event.currentTarget;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span>Synchronizing...</span>';
        btn.disabled = true;

        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = '<span>Vault Synchronized</span>';
            btn.classList.replace('bg-[#15803d]', 'bg-black');

            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.classList.replace('bg-black', 'bg-[#15803d]');
            }, 2000);

            if (window.showToast) window.showToast('API Vault Synchronized Successfully');
        }, 1000);
    };

    function initApiVault() {
        const saved = localStorage.getItem('sigma-api-keys');
        if (saved) {
            const keys = JSON.parse(saved);
            if (document.getElementById('api-key-gemini')) document.getElementById('api-key-gemini').value = keys.gemini || '';
            if (document.getElementById('api-key-groq')) document.getElementById('api-key-groq').value = keys.groq || '';
            if (document.getElementById('api-key-recaptcha')) document.getElementById('api-key-recaptcha').value = keys.recaptcha || '';
            if (document.getElementById('api-key-drive')) document.getElementById('api-key-drive').value = keys.drive || '';
        }
    }
    initApiVault();

    window.requestPasswordChange = function (userId) {
        window.currentChangingPasswordUserId = userId;
        const overlay = document.getElementById('user-password-edit-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            const input = document.getElementById('new-user-password');
            const retype = document.getElementById('retype-user-password');
            if (input) {
                input.value = '';
                input.focus();
            }
            if (retype) retype.value = '';
        }
    };

    window.handleUserPasswordExit = function () {
        const overlay = document.getElementById('user-password-edit-overlay');
        const loading = document.getElementById('user-password-save-loading');
        const label = document.getElementById('user-password-save-label');
        const btn = document.getElementById('user-password-save-btn');

        if (overlay) overlay.classList.add('hidden');
        if (loading) loading.classList.add('hidden');
        if (label) label.classList.remove('hidden');
        if (btn) btn.disabled = false;
    };

    window.executePasswordChange = function () {
        const userId = window.currentChangingPasswordUserId;
        const newPass = document.getElementById('new-user-password')?.value;
        const retypePass = document.getElementById('retype-user-password')?.value;

        if (!newPass) return;

        const loading = document.getElementById('user-password-save-loading');
        const label = document.getElementById('user-password-save-label');
        const btn = document.getElementById('user-password-save-btn');

        // Show Loading
        if (loading) loading.classList.remove('hidden');
        if (label) label.classList.add('hidden');
        if (btn) btn.disabled = true;

        // Check Match
        if (newPass !== retypePass) {
            setTimeout(() => {
                // Clear and Reset
                if (document.getElementById('new-user-password')) document.getElementById('new-user-password').value = '';
                if (document.getElementById('retype-user-password')) document.getElementById('retype-user-password').value = '';

                if (loading) loading.classList.add('hidden');
                if (label) label.classList.remove('hidden');
                if (btn) btn.disabled = false;

                if (window.showToast) window.showToast('Passwords do not match. Please try again.', 'error');
                else alert('Passwords do not match. Please try again.');

                document.getElementById('new-user-password')?.focus();
            }, 800);
            return;
        }

        // Logic to update user password in localStorage
        const users = JSON.parse(localStorage.getItem('sigma-admin-users') || '[]');
        const userIndex = users.findIndex(u => String(u.uid || u.id || '') === String(userId));

        if (userIndex !== -1) {
            setTimeout(() => {
                users[userIndex].password = newPass;
                localStorage.setItem('sigma-admin-users', JSON.stringify(users));

                window.handleUserPasswordExit();
                if (window.showToast) window.showToast('Password updated successfully');
                else alert('Password updated successfully');
            }, 1000);
        } else {
            if (loading) loading.classList.add('hidden');
            if (label) label.classList.remove('hidden');
            if (btn) btn.disabled = false;
        }
    };

});

// ============================================================
// USER PROFILE TAB SWITCHING
// ============================================================
window.switchUserProfileTab = function (tab) {
    const tabs = ['bio', 'achievements', 'subjects', 'sections'];

    tabs.forEach(t => {
        const el = document.getElementById('profile-tab-' + t);
        if (!el) return;
        if (t === tab) {
            // Active: yellow text, green border, bold only for bio
            el.classList.remove('border-transparent', 'text-slate-400', 'font-normal', 'font-bold');
            el.classList.add('border-[#15803d]', 'text-[#FFD000]');
            el.classList.add('font-bold'); // Always bold active tab for consistency
        } else {
            // Inactive
            el.classList.remove('border-[#15803d]', 'text-[#FFD000]', 'font-bold');
            el.classList.add('border-transparent', 'text-slate-400', 'font-normal');
        }
    });

    window.renderUserProfileTab(tab);
};



window.requestDeactivateUser = function (userId) {
    window.userToDeactivateId = userId;
    const modal = document.getElementById('deactivate-account-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));
        document.querySelectorAll('.action-dots-btn').forEach(b => b.classList.remove('active'));
    }
};

window.confirmDeactivateUser = function () {
    const userId = window.userToDeactivateId;
    if (!userId) return;

    const users = JSON.parse(localStorage.getItem('sigma-admin-users') || '[]');
    const userIndex = users.findIndex(u => String(u.uid || u.id || '') === String(userId));

    if (userIndex !== -1) {
        users[userIndex].status = 'Inactive';
        localStorage.setItem('sigma-admin-users', JSON.stringify(users));

        document.getElementById('deactivate-account-modal').classList.add('hidden');
        if (typeof renderUserAccountsTable === 'function') renderUserAccountsTable();

        if (window.showToast) window.showToast('Account successfully deactivated');
        else alert('Account successfully deactivated');
    }
};

window.requestActivateUser = function (userId) {
    window.userToActivateId = userId;
    const modal = document.getElementById('activate-account-modal');
    if (modal) {
        modal.classList.remove('hidden');
        // Close dropdown
        document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));
        document.querySelectorAll('.action-dots-btn').forEach(b => b.classList.remove('active'));
    }
};

window.confirmActivateUser = function () {
    const userId = window.userToActivateId;
    if (!userId) return;

    const users = JSON.parse(localStorage.getItem('sigma-admin-users') || '[]');
    const userIndex = users.findIndex(u => String(u.uid || u.id || '') === String(userId));

    if (userIndex !== -1) {
        users[userIndex].status = 'Active';
        localStorage.setItem('sigma-admin-users', JSON.stringify(users));

        document.getElementById('activate-account-modal').classList.add('hidden');
        if (typeof renderUserAccountsTable === 'function') renderUserAccountsTable();

        if (window.showToast) window.showToast('Account successfully activated');
        else alert('Account successfully activated');
    }
};
