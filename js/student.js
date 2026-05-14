document.addEventListener('DOMContentLoaded', initStudentPortal);
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    initStudentPortal();
}

function initStudentPortal() {
    if (window.studentPortalInitialized) return;
    window.studentPortalInitialized = true;

    document.documentElement.classList.add('no-transition');

    // --- BRANDING LOGO SYNC ---
    const customNavLogo = localStorage.getItem('sigma-custom-nav-logo');
    if (customNavLogo) {
        const navLogos = document.querySelectorAll('header img[alt="ICC Logo"], .sidebar img[alt="ICC Logo"]');
        navLogos.forEach(img => img.src = customNavLogo);
    }

    // --- WELCOME PANEL SYNC ---
    const welcomePanel = localStorage.getItem('sigma-welcome-panel');
    if (welcomePanel && document.getElementById('welcome-panel-student-img')) {
        document.getElementById('welcome-panel-student-img').src = welcomePanel;
    }

    const sidebar = document.getElementById('sidebar');
    const subSidebar = document.getElementById('sub-sidebar');
    const layoutWrapper = document.getElementById('layout-wrapper');
    const navLinks = document.querySelectorAll('.nav-link, .nav-sublink');
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    let isMobileStatus = window.innerWidth < 1024;
    let overlay = document.getElementById('sidebar-overlay');
    window._scAssessmentDetailIdx = null;

    window.toggleSidebar = function () {
        const overlay = document.getElementById('sidebar-overlay');
        const sidebar = document.getElementById('sidebar');
        if (window.innerWidth < 1024) {
            if (sidebar) {
                const isVisible = sidebar.classList.toggle('sidebar-visible');
                if (overlay) overlay.classList.toggle('hidden', !isVisible);
            }
        } else {
            document.body.classList.toggle('sidebar-collapsed');
            if (sidebar) sidebar.classList.toggle('sidebar-collapsed');
            // Force hide overlay on desktop
            if (overlay) overlay.classList.add('hidden');
        }
        if (typeof updateLayout === 'function') updateLayout();
    };

    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.toggleSidebar();
        });
    }

    // --- Sidebar Default State ---
    isMobileStatus = window.innerWidth < 1024;
    overlay = document.getElementById('sidebar-overlay');

    if (!isMobileStatus) {
        document.body.classList.add('sidebar-collapsed');
        if (sidebar) {
            sidebar.classList.add('sidebar-collapsed');
            sidebar.classList.remove('sidebar-visible');
        }
        if (overlay) overlay.classList.add('hidden');
    } else {
        // Ensure clean mobile start
        if (sidebar) sidebar.classList.remove('sidebar-visible');
        if (overlay) overlay.classList.add('hidden');
    }

    if (typeof updateLayout === 'function') updateLayout();

    // Close sidebar on link click (Mobile)
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 1024) {
                // EXCEPTION: Don't close if this is a submenu toggle (parent with chevron)
                if (link.dataset.toggle === 'submenu' || link.classList.contains('nav-link--group')) {
                    return;
                }
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('sidebar-overlay');
                if (sidebar) sidebar.classList.remove('sidebar-visible');
                if (overlay) overlay.classList.add('hidden');
            }
        });
    });

    const sidebarOverlay = document.getElementById('sidebar-overlay');
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            window.toggleSidebar();
        });
    }

    // SIGMA AI Elements
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

    // Header Dropdowns
    let suppressNextHeaderClose = false;
    const calendarToggle = document.getElementById('calendar-toggle');
    const calendarDropdown = document.getElementById('calendar-dropdown');
    const notiToggle = document.getElementById('noti-toggle');
    const notiDropdown = document.getElementById('noti-dropdown');
    const profileDropdownBtn = document.getElementById('profileDropdownBtn');
    const profileDropdownMenu = document.getElementById('profileDropdownMenu');

    let currentInlineProgram = null;
    let currentCurriculumProgram = null;
    let currentCurriculumCluster = null;
    let inlineAnimationToken = 0;
    let inlineAnimationTimers = [];
    let dynamicCurriculumSubjects = {};

    const sectionMap = {
        'nav-home': 'section-home',
        'nav-courses': 'section-courses',
        'nav-classrooms': 'section-classrooms',
        'nav-assignments': 'section-assignments',
        'nav-grades': 'section-grades',
        'nav-attendance': 'section-attendance',
        'nav-profile': 'user-profile-view',
        'nav-topic-detail': 'section-topic-detail',
        'nav-topic-content': 'section-topic-content'
    };

    const navIdByPage = {
        'home': 'nav-home',
        'classrooms': 'nav-classrooms',
        'assignments': 'nav-assignments',
        'grades': 'nav-grades',
        'attendance': 'nav-attendance',
        'profile': 'nav-profile',
        'courses': 'nav-courses',
        'topic-detail': 'nav-topic-detail',
        'topic-content': 'nav-topic-content'
    };

    const USER_STORAGE_KEY = 'sigma-admin-users';
    const USER_AVATAR_STORAGE_KEY = 'sigma_user_avatar_base64';



    function getProfileTarget() {
        let authUser = {};
        try {

            authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');

        }
        catch (e) { console.error('Auth parse error', e); }
        let users = [];
        try {

            users = JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || '[]');

        }
        catch (e) { console.error('Users parse error', e); }
        const matchedUser = users.find(u => String(u.uid || u.id) === String(authUser.id)) || {};
        return {

            data: { ...authUser, ...matchedUser },

            isLoggedIn: !!authUser.id

        };

    }
    function saveProfileTarget(profileData) {
        const authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
        const users = JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || '[]');
        let idx = users.findIndex(u => String(u.uid || u.id) === String(authUser.id));
        if (idx === -1) {
            // If user not in list, add them

            users.push({ ...authUser, ...profileData });

            idx = users.length - 1;

        }
        else {

            users[idx] = { ...users[idx], ...profileData };

        }



        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
        // Also sync session storage

        const updatedSession = { ...authUser, ...profileData };

        sessionStorage.setItem('sigma-authenticated-user', JSON.stringify(updatedSession));
        // Sync local state

        if (window.currentUserProfileData) {
            window.currentUserProfileData.avatar = profileData.avatar || '';
            window.currentUserProfileData.uploads = profileData.uploads || [];

        }

    }
    window.toggleUserProfilePictureOverlay = function (show) {
        const overlay = document.getElementById('user-profile-picture-overlay');
        if (!overlay) return;

        overlay.classList.toggle('hidden', !show);
        if (show) window.renderUserProfilePictureUploads();

    };
    window.renderUserProfilePictureUploads = function () {
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

                <div class="group relative aspect-square rounded-2xl border ${isSelected ? 'border-[#FFD000] ring-2 ring-[#FFD000]/20' : 'border-black/5'} bg-slate-50 transition-all overflow-hidden">

                    <div class="w-full h-full">

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

    };
    window.toggleMobilePeoplePanel = function () {
        const panel = document.getElementById('classroom-mobile-people-panel');
        if (!panel) return;
        // Remove any stale backdrop
        const oldBackdrop = document.getElementById('classroom-people-backdrop');
        if (oldBackdrop) oldBackdrop.remove();
        const isActive = panel.classList.contains('active');
        if (!isActive) {
            // Teleport to body to escape parent stacking contexts
            if (!panel._originalParent) {
                panel._originalParent = panel.parentElement;
                panel._originalNextSibling = panel.nextSibling;
            }
            document.body.appendChild(panel);
            // Show until the top of the screen
            panel.style.top = '0';
            // Rest exactly on top of the bottom app bar (68px height)
            panel.style.bottom = '68px';
            panel.style.borderRadius = '0';
            // Double rAF: first frame paints panel in off-screen start position,
            // second frame triggers the CSS transition so it slides up cleanly
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    // Auto-reset scroll position
                    panel.scrollTop = 0;
                    panel.querySelectorAll('.student-room-people__list').forEach(list => list.scrollTop = 0);

                    panel.classList.add('active');
                });
            });
            // Attach swipe-to-close only once
            if (!panel._swipeInit) {
                panel._swipeInit = true;
                let startY = 0;
                let currentY = 0;
                let isDragging = false;

                panel.addEventListener('touchstart', (e) => {
                    // Only initiate drag when at the top of the panel scroll
                    if (panel.scrollTop > 0) return;
                    startY = e.touches[0].clientY;
                    isDragging = true;
                    panel.style.transition = 'none';
                }, { passive: true });

                panel.addEventListener('touchmove', (e) => {
                    if (!isDragging) return;
                    currentY = e.touches[0].clientY;
                    const deltaY = currentY - startY;
                    if (deltaY > 0) {
                        panel.style.transform = `translateY(${deltaY}px)`;
                    }
                }, { passive: true });

                panel.addEventListener('touchend', () => {
                    if (!isDragging) return;
                    isDragging = false;
                    const deltaY = currentY - startY;
                    panel.style.transition = '';
                    if (deltaY > 80) {
                        // Enough drag   close
                        window.toggleMobilePeoplePanel();
                    }
                    else {
                        // Snap back to open position
                        panel.style.transform = 'translateY(0)';
                    }
                }, { passive: true });
            }
        }
        else {
            panel.style.transform = '';
            panel.classList.remove('active');
            // Restore to original position after transition ends
            setTimeout(() => {
                if (panel._originalParent && !panel.classList.contains('active')) {
                    panel._originalParent.insertBefore(panel, panel._originalNextSibling || null);
                    panel._originalParent = null;
                    // Reset inline styles
                    panel.style.top = '';
                    panel.style.bottom = '';
                    panel.style.borderRadius = '';
                }
            }, 320);
        }
    };
    window.toggleUserAvatarMenu = function (event, index) {
        if (event) event.stopPropagation();
        const allMenus = document.querySelectorAll('[id^="user-avatar-menu-"]');

        allMenus.forEach((menu) => {
            if (menu.id !== `user-avatar-menu-${index}`) menu.classList.add('hidden');

        });
        const menu = document.getElementById(`user-avatar-menu-${index}`);
        if (menu) menu.classList.toggle('hidden');
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
        window.populateUserProfilePage();
        window.renderUserProfilePictureUploads();

    };
    window.deleteUserProfilePicture = function (encodedSrc) {
        const src = decodeURIComponent(encodedSrc);
        const target = getProfileTarget();
        const uploads = Array.isArray(target.data.uploads) ? target.data.uploads : [];
        const nextUploads = uploads.filter(s => s !== src);
        let nextAvatar = target.data.avatar;
        if (nextAvatar === src) {

            nextAvatar = nextUploads.length > 0 ? nextUploads[0] : '';

        }



        saveProfileTarget({

            ...target.data,

            avatar: nextAvatar,

            uploads: nextUploads

        });
        window.populateUserProfilePage();
        window.renderUserProfilePictureUploads();

    };
    window.handleUserProfilePictureUpload = function (event) {
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

                }
                else {
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
                window.populateUserProfilePage();
                window.renderUserProfilePictureUploads();
                if (event.target) event.target.value = '';

            };

            img.src = reader.result;

        };

        reader.readAsDataURL(file);

    };
    window.populateUserProfilePage = function () {
        const target = getProfileTarget();
        const data = target.data;
        // Update name, role, ID in view

        const firstNameBanner = document.getElementById('view-user-firstName-banner');
        const lastNameBanner = document.getElementById('view-user-lastName-banner');
        const roleEl = document.getElementById('view-user-role');
        const idEl = document.getElementById('view-user-id');
        const emailEl = document.getElementById('view-user-email');
        const dropFirstName = document.getElementById('header-dropdown-firstName');
        const dropLastName = document.getElementById('header-dropdown-lastName');
        const firstName = String(data.firstName || data.fname || 'Firstname');
        const lastName = String(data.lastName || data.lname || 'Lastname');
        const userId = String(data.uid || data.id || '0000000');
        if (firstNameBanner) firstNameBanner.textContent = firstName;
        if (lastNameBanner) lastNameBanner.textContent = lastName;
        if (roleEl) roleEl.textContent = String(data.role || data.type || 'Student');
        if (idEl) idEl.textContent = `ID: #${userId}`;
        if (emailEl) emailEl.textContent = String(data.email || 'example@gmail.com');
        if (dropFirstName) dropFirstName.textContent = firstName;
        if (dropLastName) dropLastName.textContent = lastName;
        // Tab Visibility Permissions

        const perms = data.permissions || { bio: true, achievements: true, subjects: true, sections: true };
        const tabMapping = {

            'bio': 'profile-tab-bio',

            'achievements': 'profile-tab-achievements',

            'subjects': 'profile-tab-subjects',

            'sections': 'profile-tab-sections'

        };
        let firstVisibleTab = null;

        Object.keys(tabMapping).forEach(key => {
            const el = document.getElementById(tabMapping[key]);
            if (el) {
                const isVisible = perms[key] !== false;

                el.classList.toggle('hidden', !isVisible);
                if (isVisible && !firstVisibleTab) firstVisibleTab = key;

            }

        });
        // Sync all avatar locations

        const avatarLocations = [

            { img: 'user-avatar-img', placeholder: 'user-avatar-placeholder' },

            { img: 'header-avatar-img', placeholder: 'header-avatar-placeholder' },

            { img: 'sidebar-avatar-img', placeholder: 'sidebar-avatar-placeholder' }

        ];
        const savedAvatar = data.avatar || localStorage.getItem(USER_AVATAR_STORAGE_KEY);



        avatarLocations.forEach(loc => {
            const imgEl = document.getElementById(loc.img);
            const placeholderEl = document.getElementById(loc.placeholder);
            if (imgEl && placeholderEl) {
                if (savedAvatar) {

                    imgEl.src = savedAvatar;

                    imgEl.classList.remove('hidden');

                    placeholderEl.classList.add('hidden');

                }
                else {

                    imgEl.src = '';

                    imgEl.classList.add('hidden');

                    placeholderEl.classList.remove('hidden');

                }

            }

        });
        // Render tab if visible, else switch to first visible

        let currentTab = document.querySelector('.dynamic-section:not(.hidden) p[id^="profile-tab-"][class*="border-[#15803d]"]')?.id?.replace('profile-tab-', '') || 'bio';
        if (perms[currentTab] === false && firstVisibleTab) {
            window.switchUserProfileTab(firstVisibleTab);

        }
        else {
            window.renderUserProfileTab(currentTab);

        }

    };
    window.switchUserProfileTab = function (tabId) {
        // Update tab styles

        const tabs = ['bio', 'achievements', 'subjects', 'sections'];

        tabs.forEach(t => {
            const el = document.getElementById(`profile-tab-${t}`);
            if (el) {
                if (t === tabId) {

                    el.classList.add('border-[#15803d]', 'text-[#FFD000]', 'font-bold');

                    el.classList.remove('border-transparent', 'text-slate-400', 'font-normal');

                }
                else {

                    el.classList.remove('border-[#15803d]', 'text-[#FFD000]', 'font-bold');

                    el.classList.add('border-transparent', 'text-slate-400', 'font-normal');

                }

            }

        });
        window.renderUserProfileTab(tabId);

    };
    const USER_PROFILE_TAB_CONTENT = {
        bio: '',
        achievements: `
            <div class="flex flex-col items-center justify-center py-16 gap-3 text-slate-300">
                <i class="fa-solid fa-trophy text-4xl"></i>
                <p class="text-[11px] font-medium uppercase tracking-[0.3em] text-center">No achievements documented</p>
            </div>
        `,
        subjects: `
            <div class="flex flex-col items-center justify-center py-16 gap-3 text-slate-300">
                <i class="fa-solid fa-book-open text-4xl"></i>
                <p class="text-[11px] font-medium uppercase tracking-[0.3em] text-center">No subjects enrolled</p>
            </div>
        `,
        sections: `
            <div class="flex flex-col items-center justify-center py-16 gap-3 text-slate-300">
                <i class="fa-solid fa-users-viewfinder text-4xl"></i>
                <p class="text-[11px] font-medium uppercase tracking-[0.3em] text-center">No sections assigned</p>
            </div>
        `
    };
    window.renderUserProfileTab = function (tabId = 'bio') {
        const panel = document.getElementById('user-profile-tab-panel');
        if (!panel) return;
        const data = getProfileTarget().data;
        const userBios = data.bios || [];
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

                                    <div class="flex flex-col gap-2 ${data.isReadOnly ? 'hidden' : ''}">

                                        <button class="text-black/20 hover:text-[#FFD000] transition-colors" onclick="window.toggleEditUserBio(false, ${index})">

                                            <i class="fa-solid fa-pen text-[14px]"></i>

                                        </button>

                                    </div>

                                </div>

                            `).join('')}

                        </div>

                    ` : ''}

                    

                    <div class="flex items-center gap-2 text-slate-400 ${userBios.length >= 5 || data.isReadOnly ? 'hidden' : ''} cursor-pointer hover:text-[#FFD000] transition-colors font-['Inter']" onclick="window.toggleEditUserBio()">

                        <p class="text-[10px] font-bold tracking-[0.24em] uppercase font-['Inter']">Add bio</p>

                        <i class="fa-solid fa-pen text-[14px]"></i>

                    </div>



                    ${data.isReadOnly && userBios.length === 0 ? `

                        <div class="flex flex-col items-center justify-center py-16 gap-3 text-slate-300">

                            <i class="fa-solid fa-note-sticky text-4xl"></i>

                            <p class="text-[11px] font-medium uppercase tracking-[0.3em]">No bio provided</p>

                        </div>

                    ` : ''}

                </div>

            `;

        }
        else {

            panel.innerHTML = USER_PROFILE_TAB_CONTENT[tabId] || '';

        }

    };
    window.toggleEditUserBio = function (shouldSave, index = null) {
        const panel = document.getElementById('user-profile-tab-panel');
        if (!panel) return;
        const isEditing = panel.querySelector('#edit-user-bio-form') !== null;
        const target = getProfileTarget();
        const userBios = [...(target.data.bios || [])];
        if (isEditing) {
            if (shouldSave) {
                const titleInput = document.getElementById('edit-user-bio-title');
                const descInput = document.getElementById('edit-user-bio-description');
                if (titleInput && descInput) {
                    const title = titleInput.value.trim();
                    const description = descInput.value.trim();
                    if (index !== null && index >= 0) {
                        if (!title && !description) {

                            userBios.splice(index, 1);

                        }
                        else {

                            userBios[index] = { title, description };

                        }

                    }
                    else if (userBios.length < 5) {
                        if (title || description) {

                            userBios.push({ title, description });

                        }

                    }



                    saveProfileTarget({ ...target.data, bios: userBios });

                }

            }
            window.renderUserProfileTab('bio');

        }
        else {
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

                        <button onclick="document.getElementById('edit-user-bio-title').value='';
document.getElementById('edit-user-bio-description').value='';
document.getElementById('user-bio-char-counter').textContent='0/200';" 

                            class="text-[10px] font-bold text-black hover:bg-slate-100 transition-all uppercase tracking-widest font-['Inter'] px-3 py-2 rounded-lg">Clear</button>

                        <div class="flex items-center gap-3">

                            <button onclick="window.toggleEditUserBio(false)" class="text-[10px] font-bold text-black hover:bg-slate-100 px-3 py-2 rounded-lg transition-colors uppercase tracking-widest font-['Inter']">Cancel</button>

                            <button onclick="window.toggleEditUserBio(true, ${index})" class="bg-[#15803d] text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-[#15803d]/90 transition-colors font-['Inter']">Save</button>

                        </div>

                    </div>

                </div>

            `;
            const descInput = document.getElementById('edit-user-bio-description');
            const counter = document.getElementById('user-bio-char-counter');
            if (descInput && counter) {

                descInput.oninput = () => {

                    counter.textContent = `${descInput.value.length}/200`;

                };

            }

        }

    };
    const hasSubSidebar = [];
    isMobileStatus = window.innerWidth < 1024;
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
    const loadSYFromStorage = () => {
        const saved = localStorage.getItem('sigma_school_year_records');
        if (saved) {
            try {

                schoolYearRecords = JSON.parse(saved);

            }
            catch (e) {

                console.error('Failed to parse school year records', e);

                schoolYearRecords = [];

            }

        }

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
    const getActiveSchoolYearRecord = () => {

        loadSYFromStorage();
        return schoolYearRecords.find((record) => record.status === 'Active') || getSortedSchoolYearRecords()[0] || null;

    };
    function updateGlobalSYDisplay() {
        const display = document.getElementById('global-sy-display');
        if (!display) return;
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

        }
        else {

            allQuartersEnded = false;

        }
        const yearRange = `${activeRecord.yearStart}-${activeRecord.yearEnd}`;
        if (!hasAnyDates) {

            display.textContent = '';

        }
        else if (anyQuarterStarted && !allQuartersEnded) {
            const quarterText = currentQuarter ? currentQuarter.toUpperCase() : 'TRANSITION';

            display.textContent = `SY ${yearRange}   ${quarterText}`;

        }
        else if (!anyQuarterStarted) {

            display.textContent = `SY ${yearRange}   UPCOMING`;

        }
        else {

            display.textContent = '';

        }

    }

    updateGlobalSYDisplay();
    // Sync with Admin changes in other tabs

    window.addEventListener('storage', (e) => {
        if (e.key === 'sigma_school_year_records') {

            updateGlobalSYDisplay();

        }

    });
    window.getComputedStyle(document.documentElement).opacity;
    document.documentElement.classList.remove('no-transition');
    //   Layout  

    function updateLayout() {
        if (!layoutWrapper) return;
        if (window.innerWidth < 1024) {
            layoutWrapper.style.setProperty('margin-left', '0', 'important');
            layoutWrapper.style.setProperty('width', '100%', 'important');
            return;
        }

        const isCollapsed = document.body.classList.contains('sidebar-collapsed');
        const subSidebar = document.getElementById('sub-sidebar');
        const isSubVisible = subSidebar && !subSidebar.classList.contains('hidden') && !subSidebar.classList.contains('subjects-hover-subsidebar');

        // CHECK: Are we in the classroom room detail view?
        const sectionDetail = document.getElementById('section-classroom-detail');
        const isRoomDetailView = sectionDetail && !sectionDetail.classList.contains('hidden');

        const mainWidth = isCollapsed ? 82 : 280;

        // If we are in room detail view, the sub-sidebar should act as an overlay (don't shift content)
        const subWidth = (isSubVisible && !isRoomDetailView) ? 240 : 0;

        layoutWrapper.style.setProperty('margin-left', (mainWidth + subWidth) + 'px', 'important');
        layoutWrapper.style.setProperty('width', `calc(100% - ${mainWidth + subWidth}px)`, 'important');

        if (subSidebar) {
            subSidebar.style.left = mainWidth + 'px';
            // Ensure overlay mode looks correct when in room view
            if (isRoomDetailView && isSubVisible) {
                subSidebar.classList.add('sub-sidebar-overlay-mode');
                subSidebar.style.zIndex = '900'; // Higher in student portal per HTML structure
                subSidebar.style.boxShadow = '15px 0 30px rgba(0,0,0,0.08)';
            } else {
                subSidebar.classList.remove('sub-sidebar-overlay-mode');
                subSidebar.style.zIndex = '';
                subSidebar.style.boxShadow = '';
            }
        }
    }
    // Submenu Toggles

    document.querySelectorAll('[data-toggle="submenu"]').forEach(btn => {

        btn.addEventListener('click', (e) => {

            e.preventDefault();
            const submenuId = btn.id.replace('nav-', '') + '-submenu';
            const submenu = document.getElementById(submenuId);
            const chevron = btn.querySelector('.sidebar-group-chevron');
            if (submenu) {
                const isHidden = submenu.classList.contains('hidden');

                submenu.classList.toggle('hidden', !isHidden);
                if (chevron) {

                    chevron.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';

                }

            }

        });

    });
    function setSubjectsPanelsMode(enabled) {
        document.body.classList.toggle('subjects-panels-mode', enabled && window.innerWidth >= 1024);

    }
    function setCurriculumMode(enabled) {
        document.body.classList.toggle('curriculum-mode', enabled);

    }
    function hideAllSections() {
        document.querySelectorAll('.dynamic-section').forEach(s => {

            s.classList.add('hidden');

            s.style.display = 'none';

        });

    }
    function showSection(id) {
        const el = document.getElementById(id);
        if (!el) return;

        el.classList.remove('hidden');

        el.style.display = '';

    }
    //   Nav Context Title  

    function setNavContext(text) {
        const ctxText = document.getElementById('nav-context-text');
        if (!ctxText) return;
        if (text) {

            ctxText.textContent = text;

            ctxText.parentElement.classList.remove('hidden');

        }
        else {

            ctxText.parentElement.classList.add('hidden');

        }

    }
    const SHARED_ANNOUNCEMENTS_KEY = 'sigma-room-announcements-v1';
    // Seed mock teacher post for General Mathematics if missing
    try {
        let store = JSON.parse(localStorage.getItem(SHARED_ANNOUNCEMENTS_KEY) || '{}');
        if (!store['Grade 11 - STEM A::General Mathematics'] || store['Grade 11 - STEM A::General Mathematics'].length === 0) {
            store['Grade 11 - STEM A::General Mathematics'] = [
                {
                    id: 'genmath-mock-' + Date.now(),
                    text: 'Please complete the exercise on Rational Functions by tomorrow. This will be the basis for our next discussion.',
                    author: 'Jose Santos',
                    timestamp: new Date(Date.now() - 86400000).toISOString(),
                    type: 'regular'
                }
            ];
            localStorage.setItem(SHARED_ANNOUNCEMENTS_KEY, JSON.stringify(store));
        }
    }
    catch (e) { }
    const SHARED_ATTENDANCE_MODE_KEY = 'sigma-attendance-mode-v1';
    const SHARED_ATTENDANCE_RECORDS_KEY = 'sigma-attendance-records-v1';
    const SHARED_COMMENT_MODE_KEY = 'sigma-room-comment-mode-v1';
    const SHARED_ANNOUNCEMENT_COMMENTS_KEY = 'sigma-room-announcement-comments-v1';
    const ADMIN_SUBJECTS_STORAGE_KEY = 'sigma-admin-subjects';
    const SHARED_ADMIN_ANNOUNCEMENTS_KEY = 'sigma-admin-announcements-v1';
    const currentStudentName = 'Abad, Juan';
    const currentStudentSection = 'ICT-11A';
    let activeHomeAnnouncementTab = 'overall';
    let currentStudentAttendance = {

        name: currentStudentName,

        sharedKey: 'Grade 11 - ICT A::Programming 1',

        subject: 'Computer Programming 1',

        time: 'April 8, 2026   8:00 AM'

    };
    function loadSharedState(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;

        }
        catch {
            return fallback;

        }

    }
    function escapeHtml(value) {
        return String(value || '')

            .replace(/&/g, '&amp;')

            .replace(/</g, '&lt;')

            .replace(/>/g, '&gt;')

            .replace(/"/g, '&quot;')

            .replace(/'/g, '&#39;');

    }
    function stripHtmlTags(value) {
        return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    }
    function formatAdminAnnouncementBody(body) {
        return escapeHtml(body).replace(/\n/g, '<br>');

    }
    function parseAnnouncementDateValue(value) {
        if (!value) return 0;
        const direct = new Date(value);
        if (!Number.isNaN(direct.getTime())) return direct.getTime();
        const currentYear = new Date().getFullYear();
        const normalized = new Date(`${value}, ${currentYear}`);
        if (!Number.isNaN(normalized.getTime())) return normalized.getTime();
        return 0;

    }
    function formatAnnouncementTimestamp(value) {
        const timestamp = parseAnnouncementDateValue(value);
        if (!timestamp) return 'Just now';
        return new Date(timestamp).toLocaleString('en-US', {

            month: 'short',

            day: 'numeric',

            hour: 'numeric',

            minute: '2-digit'

        });

    }
    function seedDefaultAdminAnnouncements() {
        try {
            const raw = localStorage.getItem(SHARED_ADMIN_ANNOUNCEMENTS_KEY);
            if (raw !== null && Array.isArray(JSON.parse(raw))) return;

        }
        catch { }

        localStorage.setItem(SHARED_ADMIN_ANNOUNCEMENTS_KEY, JSON.stringify([

            {

                id: 'admin-default-exam-schedule',

                title: 'Quarterly Examination Schedule Released',

                body: 'The 2nd Quarter examinations will be held from March 25th to March 27th. Please ensure all clearance requirements are settled before the examination period begins.',

                audience: 'students',

                type: 'urgent',

                author: 'Admin Office',

                createdAt: new Date().toISOString()

            }

        ]));

    }
    function getAdminAnnouncements() {

        seedDefaultAdminAnnouncements();
        const posts = loadSharedState(SHARED_ADMIN_ANNOUNCEMENTS_KEY, []);
        return Array.isArray(posts) ? posts : [];

    }
    function normalizeSubjectKey(value) {
        return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

    }
    function getAdminSubjectCoverConfig(subjectName) {
        const normalized = normalizeSubjectKey(subjectName);
        if (!normalized) return null;
        const subjects = loadSharedState(ADMIN_SUBJECTS_STORAGE_KEY, []);
        if (!Array.isArray(subjects)) return null;
        return subjects.find(item => {
            const subjectLabel = normalizeSubjectKey(item?.name);
            if (!subjectLabel) return false;
            return subjectLabel === normalized || normalized.includes(subjectLabel) || subjectLabel.includes(normalized);

        }) || null;

    }
    function getSharedAnnouncements(sharedKey, fallback = []) {
        const store = loadSharedState(SHARED_ANNOUNCEMENTS_KEY, {});
        return store[sharedKey]?.length ? store[sharedKey] : fallback;

    }
    function getSharedCommentMode(sharedKey) {
        const store = loadSharedState(SHARED_COMMENT_MODE_KEY, {});
        return store[sharedKey] || 'disabled';

    }
    function buildAnnouncementId(sharedKey, post, index) {
        if (post?.id) return post.id;
        const author = (post?.author || 'teacher').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const stamp = (post?.timestamp || `post-${index + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return `${sharedKey}-${author}-${stamp}`;

    }
    function getSharedAnnouncementComments(sharedKey, postId) {
        const store = loadSharedState(SHARED_ANNOUNCEMENT_COMMENTS_KEY, {});
        return store[sharedKey]?.[postId] || [];

    }
    function saveStudentAnnouncementComment(sharedKey, postId, text) {
        const store = loadSharedState(SHARED_ANNOUNCEMENT_COMMENTS_KEY, {});
        if (!store[sharedKey]) store[sharedKey] = {};
        if (!store[sharedKey][postId]) store[sharedKey][postId] = [];

        store[sharedKey][postId].push({

            author: currentStudentName,

            text,

            timestamp: new Date().toLocaleString('en-US', {

                month: 'short',

                day: 'numeric',

                hour: 'numeric',

                minute: '2-digit'

            })

        });

        localStorage.setItem(SHARED_ANNOUNCEMENT_COMMENTS_KEY, JSON.stringify(store));

    }
    function saveStudentSelfPresent(sharedKey) {
        const modeStore = loadSharedState(SHARED_ATTENDANCE_MODE_KEY, {});
        const recordStore = loadSharedState(SHARED_ATTENDANCE_RECORDS_KEY, {});
        const mode = modeStore[sharedKey] || 'manual';
        if (!recordStore[sharedKey]) {

            recordStore[sharedKey] = {

                mode,

                updatedAt: new Date().toISOString(),

                statuses: {}

            };

        }
        if (!recordStore[sharedKey].statuses) recordStore[sharedKey].statuses = {};
        if (!recordStore[sharedKey].excuses) recordStore[sharedKey].excuses = {};

        recordStore[sharedKey].mode = mode;

        recordStore[sharedKey].updatedAt = new Date().toISOString();

        recordStore[sharedKey].statuses[currentStudentName] = 'P';

        localStorage.setItem(SHARED_ATTENDANCE_RECORDS_KEY, JSON.stringify(recordStore));

    }
    function saveStudentAbsentExcuse(sharedKey, comment, files) {
        const modeStore = loadSharedState(SHARED_ATTENDANCE_MODE_KEY, {});
        const recordStore = loadSharedState(SHARED_ATTENDANCE_RECORDS_KEY, {});
        const mode = modeStore[sharedKey] || 'manual';
        if (!recordStore[sharedKey]) {

            recordStore[sharedKey] = {

                mode,

                updatedAt: new Date().toISOString(),

                statuses: {},

                excuses: {}

            };

        }
        if (!recordStore[sharedKey].statuses) recordStore[sharedKey].statuses = {};
        if (!recordStore[sharedKey].excuses) recordStore[sharedKey].excuses = {};

        recordStore[sharedKey].mode = mode;

        recordStore[sharedKey].updatedAt = new Date().toISOString();

        recordStore[sharedKey].statuses[currentStudentName] = 'A';

        recordStore[sharedKey].excuses[currentStudentName] = {

            comment,

            files,

            submittedAt: new Date().toLocaleString('en-US', {

                month: 'short',

                day: 'numeric',

                hour: 'numeric',

                minute: '2-digit'

            })

        };

        localStorage.setItem(SHARED_ATTENDANCE_RECORDS_KEY, JSON.stringify(recordStore));

    }
    function getStudentAttendanceSnapshot(attendanceContext = currentStudentAttendance) {
        const modeStore = loadSharedState(SHARED_ATTENDANCE_MODE_KEY, {});
        const recordStore = loadSharedState(SHARED_ATTENDANCE_RECORDS_KEY, {});
        const mode = modeStore[attendanceContext.sharedKey] || 'manual';
        const status = recordStore[attendanceContext.sharedKey]?.statuses?.[attendanceContext.name] || '';
        const excuse = recordStore[attendanceContext.sharedKey]?.excuses?.[attendanceContext.name] || null;
        let label = 'Pending';
        let meta = mode === 'trust'

            ? `Tap Present to confirm you are inside ${attendanceContext.subject}.`

            : 'Waiting for teacher attendance confirmation.';
        let badgeClass = 'bg-gray-100 text-gray-500';
        if (status === 'P') {

            label = 'Present';

            meta = mode === 'trust'

                ? `You marked yourself present for ${attendanceContext.subject}.`

                : `Teacher marked you present for ${attendanceContext.subject}.`;

            badgeClass = 'bg-green-50 text-green-600';

        }
        else if (status === 'A') {

            label = 'Absent';

            meta = excuse

                ? `Your absence and excuse were submitted for ${attendanceContext.subject}.`

                : `Teacher marked you absent for ${attendanceContext.subject}.`;

            badgeClass = 'bg-red-50 text-red-600';

        }
        else if (status === 'L') {

            label = 'Late';

            meta = `Teacher marked you late for ${attendanceContext.subject}.`;

            badgeClass = 'bg-yellow-50 text-yellow-600';

        }
        return {

            label,

            meta,

            badgeClass,

            mode,

            status,

            time: attendanceContext.time,

            excuse

        };

    }
    function updateStudentAttendanceStatus(attendanceContext = currentStudentAttendance) {
        const valueEl = document.getElementById('student-attendance-live-value');
        const metaEl = document.getElementById('student-attendance-live-meta');
        const badgeEl = document.getElementById('student-attendance-live-badge');
        if (!valueEl || !metaEl || !badgeEl) return;
        const snapshot = getStudentAttendanceSnapshot(attendanceContext);



        valueEl.textContent = snapshot.label;

        metaEl.textContent = `${snapshot.meta} ${snapshot.time}`;

        badgeEl.textContent = snapshot.label;

        badgeEl.className = `px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${snapshot.badgeClass}`;
    }

    let studentAttendanceRecords = [];
    let studentAttendancePage = 1;
    const studentAttendancePerPage = 10;

    function renderAttendanceHistoryTable(bodyId, paginationId, emptyStateId, subjectFilter = null) {
        const body = document.getElementById(bodyId);
        const pagination = document.getElementById(paginationId);
        const emptyState = document.getElementById(emptyStateId);
        if (!body) return;

        // Initialize persistent records if they don't exist
        if (studentAttendanceRecords.length === 0) {
            const subjects = [
                'Computer Programming 1',
                'Web Development 1',
                'Oral Communication',
                'General Mathematics',
                'Physical Education',
                'Earth Science'
            ];

            const startDateLimit = new Date('2026-02-01');
            const end = new Date('2026-03-24');

            for (let d = new Date(startDateLimit); d <= end; d.setDate(d.getDate() + 1)) {
                // Monday to Friday classes
                if (d.getDay() !== 0 && d.getDay() !== 6) {
                    // Randomly pick subjects for this day to simulate a schedule
                    const dailySubjects = subjects.filter(() => Math.random() > 0.4);
                    dailySubjects.forEach(s => {
                        const rand = Math.random();
                        let status = 'P';
                        if (rand > 0.92) status = 'A';
                        else if (rand > 0.82) status = 'L';

                        studentAttendanceRecords.push({
                            date: d.toISOString().split('T')[0],
                            subject: s,
                            status: status
                        });
                    });
                }
            }
            // Sort descending (latest first) once at the beginning
            studentAttendanceRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        let mockRecords = [...studentAttendanceRecords];

        if (subjectFilter) {
            mockRecords = mockRecords.filter(r => r.subject === subjectFilter);
        }

        const totalPages = Math.max(1, Math.ceil(mockRecords.length / studentAttendancePerPage));
        if (studentAttendancePage > totalPages) {
            studentAttendancePage = 1;
        }

        const start = (studentAttendancePage - 1) * studentAttendancePerPage;
        const paginatedRecords = mockRecords.slice(start, start + studentAttendancePerPage);

        if (mockRecords.length === 0) {
            body.innerHTML = '';
            if (emptyState) emptyState.classList.remove('hidden');
            if (pagination) pagination.innerHTML = '';
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');

        body.innerHTML = paginatedRecords.map(record => {
            const dateObj = new Date(record.date);
            const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

            let statusLabel = 'Present';
            let statusColor = 'text-green-600';
            if (record.status === 'A') { statusLabel = 'Absent'; statusColor = 'text-red-600'; }
            if (record.status === 'L') { statusLabel = 'Late'; statusColor = 'text-yellow-600'; }

            return `
                <tr class="hover:bg-gray-100/30 transition-colors border-b border-slate-200">
                    <td class="py-5 text-center">
                        <p class="text-[15px] font-medium text-black">${formattedDate}</p>
                    </td>
                    <td class="py-5 text-center">
                        <span class="text-[15px] font-bold ${statusColor} inline-block">
                            ${statusLabel}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');

        if (pagination) {
            pagination.innerHTML = ''; // Explicitly clear before rendering
            pagination.className = "flex items-center justify-center gap-2 w-full";

            let pagesHtml = '';
            // Show up to 5 page buttons
            const startPage = Math.max(1, Math.min(studentAttendancePage - 2, totalPages - 4));
            const endPage = Math.min(totalPages, startPage + 4);

            for (let i = startPage; i <= endPage; i++) {
                pagesHtml += `
                    <button onclick="window.gotoStudentAttendancePage(${i}, '${bodyId}', '${paginationId}', '${emptyStateId}', ${subjectFilter ? `'${subjectFilter}'` : 'null'})"
                            class="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${studentAttendancePage === i ? 'bg-[#15803d] text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50'}">
                        ${i}
                    </button>
                `;
            }

            pagination.innerHTML = `
                <button ${studentAttendancePage > 1 ? `onclick="window.changeStudentAttendancePage(-1, '${bodyId}', '${paginationId}', '${emptyStateId}', ${subjectFilter ? `'${subjectFilter}'` : 'null'})"` : 'disabled'}
                        class="w-8 h-8 rounded-full flex items-center justify-center bg-[#15803d] text-white transition-all shadow-sm ${studentAttendancePage > 1 ? 'hover:bg-[#166534]' : 'invisible'}">
                    <i class="fa-solid fa-chevron-left text-xs"></i>
                </button>
                ${pagesHtml}
                <button ${studentAttendancePage < totalPages ? `onclick="window.changeStudentAttendancePage(1, '${bodyId}', '${paginationId}', '${emptyStateId}', ${subjectFilter ? `'${subjectFilter}'` : 'null'})"` : 'disabled'}
                        class="w-8 h-8 rounded-full flex items-center justify-center bg-[#15803d] text-white transition-all shadow-sm ${studentAttendancePage < totalPages ? 'hover:bg-[#166534]' : 'invisible'}">
                    <i class="fa-solid fa-chevron-right text-xs"></i>
                </button>
            `;
        }
    }

    window.gotoStudentAttendancePage = function (page, bodyId, paginationId, emptyStateId, subjectFilter) {
        studentAttendancePage = page;
        renderAttendanceHistoryTable(bodyId, paginationId, emptyStateId, subjectFilter);
    };

    window.renderStudentAttendanceHistory = function () {
        renderAttendanceHistoryTable('student-attendance-history-body', 'student-attendance-pagination-controls', 'student-attendance-empty-state');
    };

    window.gotoStudentAttendancePage = function (pageNum, bodyId, paginationId, emptyStateId, subjectFilter) {
        studentAttendancePage = pageNum;
        scrollToTop();
        renderAttendanceHistoryTable(bodyId, paginationId, emptyStateId, subjectFilter);
    };

    window.changeStudentAttendancePage = function (dir, bodyId, paginationId, emptyStateId, subjectFilter) {
        // Calculate total pages for boundary check
        let filteredRecords = [...studentAttendanceRecords];
        if (subjectFilter) {
            filteredRecords = filteredRecords.filter(r => r.subject === subjectFilter);
        }
        const totalPages = Math.max(1, Math.ceil(filteredRecords.length / studentAttendancePerPage));

        const newPage = studentAttendancePage + dir;
        if (newPage >= 1 && newPage <= totalPages) {
            studentAttendancePage = newPage;
            scrollToTop();
            renderAttendanceHistoryTable(bodyId, paginationId, emptyStateId, subjectFilter);
        }
    };

    function setGreenNavContext(trackText) {
        const gradeEl = document.getElementById('green-grade-label');
        const trackEl = document.getElementById('green-track-label');
        if (gradeEl) gradeEl.textContent = 'Grade 11';
        if (trackEl) trackEl.textContent = 'AY 2025-2026   2nd Term';

    }
    //   Tab Switching (internal   no history push)  

    function scrollToTop() {
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
        const mainContent = document.getElementById('main-content');
        if (mainContent) mainContent.scrollTop = 0;
        const layoutWrapper = document.getElementById('layout-wrapper');
        if (layoutWrapper) layoutWrapper.scrollTop = 0;
    }

    function _applyTab(navId) {
        scrollToTop();
        const requestedNavId = navId;
        if (!sectionMap[navId] || !document.getElementById(sectionMap[navId])) {
            navId = navId && navId.startsWith('nav-subjects-') ? 'nav-courses' : 'nav-home';
            if (!sectionMap[navId] || !document.getElementById(sectionMap[navId])) navId = 'nav-home';
            console.warn(`Unknown student tab "${requestedNavId}". Falling back to "${navId}".`);
        }
        // Auto-close mobile sidebar - REMOVED per user request
        /*
        if (window.innerWidth < 1024) {
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');
if (sidebar) sidebar.classList.remove('sidebar-visible');
if (overlay) overlay.classList.add('hidden');
        }
        */

        const targetSectionId = sectionMap[navId];
        // Reset context-specific state if moving to main landing pages
        setCurriculumMode(false);
        // Close other open side panels, but keep AI panel if user wants it persistent

        // closeAiPanel();
        // Removed

        document.querySelectorAll('[id$="Menu"], [id$="Panel"]').forEach(m => m.classList.add('hidden'));
        document.querySelectorAll('.relative button').forEach(b => b.classList.remove('active'));
        const navCtx = document.getElementById('nav-subject-context');
        if (navCtx) { navCtx.classList.add('hidden'); navCtx.classList.remove('flex'); }
        // Clear sub-sidebar highlights and submenu states
        document.querySelectorAll('#sub-sidebar .active, #sub-sidebar .bg-icc-light, .sidebar-submenu .active, .subject-nav-child.active, .student-section-room-link.active').forEach(el => {
            el.classList.remove('active', 'bg-icc-light', 'text-icc');
        });
        // Reset subject-sidebar internal variables
        if (typeof window.resetStudentSubjectSidebarState === 'function') {
            window.resetStudentSubjectSidebarState();
        }

        navLinks.forEach(l => l.classList.remove('active'));
        const activeLink = document.getElementById(navId);
        if (activeLink) {

            activeLink.classList.add('active');
            // Also update context text

            const labelEl = activeLink.querySelector('.full-label') || activeLink.querySelector('span');
            if (labelEl) setNavContext(labelEl.textContent);

        }



        hideAllSections();

        showSection(targetSectionId);
        if (navId === 'nav-assignments') {

            renderAssessmentsPage();

        }
        else if (navId === 'nav-grades') {

            renderGradesPage();

        }
        else if (navId === 'nav-attendance') {
            updateStudentAttendanceStatus();
            renderStudentAttendanceHistory();
        }
        else if (navId === 'nav-classrooms') {
            activeStudentClassroomId = '';
            hideStudentClassroomSectionsSidebar();
            renderClassroomsGrid();
        }
        else if (navId === 'nav-profile') {
            hideStudentClassroomSectionsSidebar();
            window.populateUserProfilePage();
        }
        else if (navId === 'nav-home') {
            hideStudentClassroomSectionsSidebar();
            if (typeof renderStudentHomeDashboardPanels === 'function') renderStudentHomeDashboardPanels();
            if (typeof renderInstitutionalAnnouncements === 'function') renderInstitutionalAnnouncements();
        }
        else {
            hideStudentClassroomSectionsSidebar();
        }
        // Nav context title per tab

        const navContextMap = {

            'nav-home': 'Interface Computer College', 'nav-classrooms': 'Sections', 'nav-courses': 'Subjects',

            'nav-assignments': 'Assessments', 'nav-grades': 'Grades',

            'nav-attendance': 'Attendance', 'nav-mail': 'Mail'

        };
        const ctx = navContextMap[navId] || '';

        setNavContext(ctx);
        const shouldShowSub = hasSubSidebar.includes(navId);
        if (shouldShowSub) {

            _showSubSidebarInstant();

            updateSubSidebar(navId);

        }
        else {

            _hideSubSidebarInstant();

        }



        updateLayout();
        if (window.innerWidth < 1024) sidebar.classList.remove('sidebar-visible');
        // Sync Sections chevron visibility
        if (typeof syncStudentSectionsNavState === 'function') {
            syncStudentSectionsNavState();
        }
        window.scrollTo({ top: 0 });
    }
    //   Sub-sidebar instant show/hide (NO slide animation)  

    function _hideSubSidebarInstant() {

        subSidebar.style.transition = 'none';

        subSidebar.classList.remove('sub-sidebar-visible');

        subSidebar.classList.add('hidden');
        // restore transition after frame

        requestAnimationFrame(() => { subSidebar.style.transition = ''; });

    }
    function _showSubSidebarInstant() {

        subSidebar.style.transition = 'none';

        subSidebar.classList.remove('hidden');

        subSidebar.classList.add('sub-sidebar-visible');

        requestAnimationFrame(() => { subSidebar.style.transition = ''; });

    }
    //   Public switchTab   pushes history  

    function switchTab(navId, pushState = true) {
        const pageKey = Object.entries(navIdByPage).find(([k, v]) => v === navId)?.[0] || 'home';
        if (pushState) {
            history.pushState({ page: pageKey }, '', '#' + pageKey);
            localStorage.setItem('sigma-student-nav-state', JSON.stringify({ type: 'tab', page: pageKey, navId }));
        }

        _applyTab(navId);
    }
    window.switchTab = switchTab;



    navLinks.forEach(link => {

        link.addEventListener('click', e => {
            // If it's a submenu toggle, don't trigger switchTab

            if (link.dataset.toggle === 'submenu') return;



            e.preventDefault();

            switchTab(link.id);

        });

    });
    function initSubjectParentSidebar() {
        const parent = document.getElementById('nav-courses');
        const submenu = document.getElementById('subjects-submenu');
        const chevron = parent?.querySelector('.sidebar-group-chevron');
        const subSidebar = document.getElementById('sub-sidebar');
        const subTitle = document.getElementById('sub-sidebar-title');
        const subHeader = document.getElementById('sub-sidebar-header');
        const subContent = document.getElementById('sub-sidebar-content');
        const items = [
            { id: 'nav-subjects-core', key: 'core-subjects', label: 'Core Subjects', icon: 'fa-solid fa-layer-group' },
            { id: 'nav-subjects-applied', key: 'applied-subjects', label: 'Applied Subjects', icon: 'fa-solid fa-book-open' },
            { id: 'nav-subjects-specialized', key: 'specialized-subjects', label: 'Specialized Subjects', icon: 'fa-solid fa-briefcase' }
        ];
        if (!parent || !submenu || !subSidebar || !subContent) return;
        let open = false;
        let hoverTimer = null;
        // Exposed state for switchTab to reset
        let activeProgram = null;
        let activeGroup = null;
        let activeSubjectId = null;
        window.resetStudentSubjectSidebarState = function () {
            activeProgram = null;
            activeGroup = null;
            activeSubjectId = null;
            // Also close all groups in the DOM
            document.querySelectorAll('.subject-nav-group').forEach(g => {
                g.classList.remove('open');
                const children = g.querySelector('.subject-nav-children');
                if (children) children.classList.add('hidden');
            });
        };
        window.setStudentActiveSubject = function (id) {
            activeSubjectId = id;
            syncSelectedSubject();
        };
        const collapsed = () => document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;
        const escapeText = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
        const programCategory = { 'core-subjects': 'core', 'applied-subjects': 'applied', 'specialized-subjects': 'specialized' };
        const getProgramSubjects = (programKey) => {
            try {
                const category = programCategory[programKey];
                return [...(subjectsData.enrolled || []), ...(subjectsData.completed || [])]
                    .filter(subject => getHomeSubjectCategory(subject) === category)
                    .map(subject => ({ id: subject.id, label: subject.text }));
            }
            catch (error) {
                return [];
            }
        };
        const syncSelectedSubject = () => {
            document.querySelectorAll('.subject-nav-child').forEach(child => {
                child.classList.toggle('active', child.dataset.subjectId === activeSubjectId);
            });
            document.querySelectorAll('.subject-nav-group-toggle').forEach(group => {
                group.classList.toggle('active', group.dataset.subjectGroup === activeProgram);
            });
            document.querySelectorAll('#subjects-submenu .nav-sublink').forEach(link => {
                link.classList.toggle('active', link.dataset.programKey === activeProgram);
            });
        };
        const openSubjectTopic = (programKey, subjectId, label) => {
            activeProgram = programKey;
            activeGroup = programKey;
            activeSubjectId = subjectId;
            const targetId = resolveHomeSubjectTopicSourceId(subjectId, label);
            switchToTopicPage(targetId);
            // On mobile: auto-close removed
            if (window.innerWidth < 1024) {
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('sidebar-overlay');
                if (sidebar) sidebar.classList.remove('sidebar-visible');
                if (overlay) overlay.classList.add('hidden');
            }
            // Restore expanded state on desktop if needed
            if (!document.body.classList.contains('sidebar-collapsed')) {
                sidebar?.classList.remove('sidebar-collapsed');
            }
            parent.classList.add('active');
            document.querySelectorAll('#subjects-submenu .nav-sublink').forEach(link => {
                link.classList.toggle('active', link.dataset.programKey === programKey);
            });
            syncSelectedSubject();
            if (!collapsed()) hideOverlay();
        };
        const renderGroup = (item, surface) => {
            const isOpen = activeGroup === item.key;
            const subjects = getProgramSubjects(item.key);
            return `
                <div class="subject-nav-group ${isOpen ? 'open' : ''}">
                    <button type="button" class="${surface === 'overlay' ? 'sub-sidebar-link' : 'nav-sublink'} subject-nav-group-toggle w-full ${activeProgram === item.key ? 'active' : ''}" data-subject-group="${item.key}">
                        <i class="${item.icon}"></i>
                        <span>${item.label}</span>
                        <i class="fa-solid fa-chevron-right subject-nav-chevron"></i>
                    </button>
                    <div class="subject-nav-children ${isOpen ? '' : 'hidden'}">
                        ${subjects.map(subject => `
                            <button type="button" class="subject-nav-child ${activeSubjectId === subject.id ? 'active' : ''}" data-subject-program="${item.key}" data-subject-id="${escapeText(subject.id)}" data-subject-label="${escapeText(subject.label)}">
                                <i class="fa-solid fa-book subject-nav-child-icon" aria-hidden="true"></i>
                                <span>${escapeText(subject.label)}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        };
        const bindSubjectNav = (root, surface) => {
            root.querySelectorAll('[data-subject-group]').forEach(btn => {
                btn.addEventListener('click', event => {
                    event.preventDefault();
                    event.stopPropagation();
                    activeGroup = activeGroup === btn.dataset.subjectGroup ? null : btn.dataset.subjectGroup;
                    activeProgram = btn.dataset.subjectGroup;
                    if (surface === 'overlay') renderOverlay();
                    else renderInline();
                });
            });
            root.querySelectorAll('[data-subject-id]').forEach(btn => {
                btn.addEventListener('click', event => {
                    event.preventDefault();
                    event.stopPropagation();
                    const _prog = btn.dataset.subjectProgram;
                    const _sid = btn.dataset.subjectId;
                    const _lbl = btn.dataset.subjectLabel;
                    activeProgram = _prog;
                    activeGroup = _prog;
                    activeSubjectId = _sid;
                    // Close mobile sidebar removed
                    if (window.innerWidth < 1024) {
                        const sidebar = document.getElementById('sidebar');
                        const overlay = document.getElementById('sidebar-overlay');
                        if (sidebar) sidebar.classList.remove('sidebar-visible');
                        if (overlay) overlay.classList.add('hidden');
                    }
                    const _targetId = resolveHomeSubjectTopicSourceId(_sid, _lbl);
                    if (_targetId && window.switchToTopicPage) window.switchToTopicPage(_targetId);
                    parent.classList.add('active');
                    syncSelectedSubject();
                    if (!collapsed()) hideOverlay();
                });
            });
        };
        const renderInline = () => {
            submenu.innerHTML = items.map(item => renderGroup(item, 'inline')).join('');
            bindSubjectNav(submenu, 'inline');
        };
        const syncInline = () => {
            if (!collapsed() && open) renderInline();
            submenu.classList.toggle('hidden', collapsed() || !open);
            chevron?.classList.toggle('rotate-90', open);
        };
        const hideOverlay = () => {
            subSidebar.classList.add('hidden');
            subSidebar.classList.remove('sub-sidebar-visible');
            subSidebar.classList.remove('subjects-hover-subsidebar');
        };
        const renderOverlay = () => {
            // Sub-sidebar overlay not needed on mobile
            if (!collapsed() || window.innerWidth < 1024) {
                hideOverlay();
                return;
            }

            // Topic names belong only in topic content. The topic overview page keeps the subject list.
            const isTopicContent = !document.getElementById('section-topic-content')?.classList.contains('hidden');
            const topicSubjectId = isTopicContent ? (_tcSubjectId || activeSubjectId) : activeSubjectId;
            if (isTopicContent && topicSubjectId) {
                const subject = getTopicSubject(topicSubjectId);
                const data = getTopicData(topicSubjectId);
                if (subject && data) {
                    const statusIconClass = {
                        completed: 'fa-check-circle text-green-500',
                        'in-progress': 'fa-circle-half-stroke text-yellow-500',
                        'not-started': 'fa-circle text-gray-300',
                        locked: 'fa-lock text-gray-300'
                    };
                    loadTopicSubSidebar(subject, data, statusIconClass, _tcSubjectId === topicSubjectId ? _tcTopicIdx : null);
                    subSidebar.classList.remove('hidden');
                    subSidebar.classList.add('sub-sidebar-visible');
                    subSidebar.classList.add('subjects-hover-subsidebar');
                    return;
                }
            }

            if (subTitle) subTitle.textContent = 'Subjects';
            subHeader?.classList.remove('hidden');
            subContent.innerHTML = items.map(item => renderGroup(item, 'overlay')).join('');
            bindSubjectNav(subContent, 'overlay');
            subSidebar.classList.remove('hidden');
            subSidebar.classList.add('sub-sidebar-visible');
            subSidebar.classList.add('subjects-hover-subsidebar');
        };
        const openProgram = (programKey) => {
            activeProgram = programKey;
            document.querySelectorAll('#subjects-submenu .nav-sublink').forEach(link => {
                link.classList.toggle('active', link.dataset.programKey === programKey);
            });
            if (typeof window.openCurriculumProgram === 'function') {
                window.openCurriculumProgram(programKey);
            }
            else {
                switchTab('nav-courses');
            }
            if (!collapsed()) hideOverlay();
        };

        parent.addEventListener('click', event => {
            event.preventDefault();
            if (collapsed()) {
                renderOverlay();
                return;
            }
            open = !open;
            if (open && !activeGroup) activeGroup = 'core-subjects';
            syncInline();
            // On mobile: keep sidebar open, just toggle submenu
            // switchTab('nav-courses') removed to prevent blank page and highlight on toggle
        });
        document.querySelectorAll('#subjects-submenu .nav-sublink').forEach(link => {
            link.addEventListener('click', event => {
                event.preventDefault();
                event.stopImmediatePropagation();
                open = true;
                syncInline();
                openProgram(link.dataset.programKey);
            }, true);
        });
        parent.addEventListener('mouseenter', () => {
            if (hoverTimer) clearTimeout(hoverTimer);
            if (collapsed()) renderOverlay();
        });
        sidebar?.addEventListener('mouseleave', () => {
            if (!collapsed()) return;
            hoverTimer = setTimeout(hideOverlay, 160);
        });
        subSidebar.addEventListener('mouseenter', () => {
            if (hoverTimer) clearTimeout(hoverTimer);
        });
        subSidebar.addEventListener('mouseleave', event => {
            if (!collapsed() || sidebar?.contains(event.relatedTarget)) return;
            hideOverlay();
        });
        document.addEventListener('click', event => {
            if (!collapsed()) return;
            if (!subSidebar.contains(event.target) && !parent.contains(event.target)) hideOverlay();
        });
        const originalToggle = window.toggleSidebar;
        window.toggleSidebar = function () {
            originalToggle?.();
            if (!collapsed() && activeSubjectId) {
                open = true;
                activeGroup = activeProgram;
            }
            if (!collapsed()) hideOverlay();
            syncInline();
            if (activeStudentClassroomId) {
                const isCollapsed = collapsed();
                renderStudentClassroomSectionsSidebar(activeStudentClassroomId, isCollapsed);
            }
        };
        syncInline();
    }
    function resolvePageStateFromLocation(state) {
        const hash = window.location.hash || '';
        if (!hash) return state?.page || 'home';
        const clean = hash.replace(/^#/, '');
        if (clean === 'home' || clean === 'classrooms' || clean === 'courses' || clean === 'assignments' || clean === 'grades' || clean === 'attendance') {
            return clean;

        }
        if (clean.startsWith('subjects-')) {
            const parts = clean.replace('subjects-', '').split('-');
            if (parts.length >= 2) {
                const programKey = parts[0] === 'core' ? 'core-subjects'

                    : parts[0] === 'elective' ? 'applied-subjects'

                        : parts[0] === 'work' ? 'specialized-subjects'

                            : parts[0];
                const remainder = clean.replace(`subjects-${programKey}-`, '');
                if (remainder !== clean) return `inline-cluster:${programKey}:${remainder}`;
                return `inline:${programKey}`;

            }

        }
        if (clean.startsWith('classroom-')) return `classroom:${clean.replace('classroom-', '')}`;
        if (clean.startsWith('topic-')) return `topic:${clean.replace('topic-', '')}`;
        if (clean.startsWith('tc-')) {
            const parts = clean.replace('tc-', '').split('-');
            if (parts.length >= 4 && /^v\d+$/.test(parts[parts.length - 1])) {
                const videoPart = parts.pop();
                const tab = parts.pop();
                const topicIdx = parts.pop();
                const subjectId = parts.join('-');
                return `topic-content:${subjectId}:${topicIdx}:${tab}:${videoPart.replace('v', '')}`;

            }
            if (parts.length >= 3) {
                const tab = parts.pop();
                const topicIdx = parts.pop();
                const subjectId = parts.join('-');
                return `topic-content:${subjectId}:${topicIdx}:${tab}`;

            }

        }
        return state?.page || 'home';

    }
    function applyHistoryPage(page, state = null) {
        if (!page) {
            _applyTab('nav-home');
            return;
        }
        if (page.startsWith('curriculum:')) {
            _applyTab('nav-courses');
            openCurriculumProgram(page.replace('curriculum:', ''), false);
        }
        else if (page.startsWith('cluster:')) {
            _applyTab('nav-courses');
            const [, programKey, clusterKey] = page.split(':');
            openCurriculumCluster(programKey, clusterKey, false);
        }
        else if (page.startsWith('topic-content:')) {
            _applyTab('nav-topic-content');
            const [, subjectId, topicIdx, tab, videoIdx] = page.split(':');
            _showTopicContent(subjectId, parseInt(topicIdx), tab || 'videos', videoIdx !== undefined ? parseInt(videoIdx) : null);
        }
        else if (page.startsWith('classroom:')) {
            _applyTab('nav-classrooms');
            showClassroomDetail(page.replace('classroom:', ''), false);
        }
        else if (page.startsWith('topic:')) {
            _applyTab('nav-topic-detail');
            const subjectId = page.replace('topic:', '');
            const resolvedTopicIdx = Number.isInteger(state?.topicIdx)
                ? state.topicIdx
                : (_tcSubjectId === subjectId && Number.isInteger(_tcTopicIdx) ? _tcTopicIdx : 0);
            _tcSubjectId = subjectId;
            _tcTopicIdx = resolvedTopicIdx;
            _buildAndShowTopicPage(subjectId);
        }
        else {
            const navId = navIdByPage[page] || 'nav-home';
            if (navId === 'nav-home' || navId === 'nav-profile') {
                hideStudentClassroomSectionsSidebar();
            }
            _applyTab(navId);
        }
    }
    //   Browser back/forward  

    window.addEventListener('popstate', e => {
        const page = resolvePageStateFromLocation(e.state);

        applyHistoryPage(page, e.state);

    });
    //   Subjects Data (q1Percent + q2Percent for bar)  

    const subjectsData = {

        enrolled: [
            { id: 'card-prog1', text: 'Computer Programming 1', subtitle: 'Core Subject', instructor: 'Elena Reyes', icon: 'fa-solid fa-code', bg: 'image/book1.jpg', q1Percent: 84, q2Percent: 82, q3Percent: 80, q4Percent: 82, summary: 'Learn the fundamentals of programming using modern languages.' },
            { id: 'card-webdev', text: 'Web Development 1', subtitle: 'Applied Subject', instructor: 'Sarah Lim', icon: 'fa-solid fa-globe', bg: 'image/book4.jpg', q1Percent: 82, q2Percent: 82, q3Percent: 81, q4Percent: 82, summary: 'Build responsive websites using HTML, CSS, and JavaScript.' },
            { id: 'card-database', text: 'Database Management 1', subtitle: 'Specialized Subject', instructor: 'Elena Reyes', icon: 'fa-solid fa-database', bg: 'image/book2.jpg', q1Percent: 88, q2Percent: 85, q3Percent: 86, q4Percent: 86, summary: 'Master SQL and database design principles.' },
            { id: 'card-empowerment', text: 'Empowerment Technologies', subtitle: 'Core Subject', instructor: 'Roberto Diaz', icon: 'fa-solid fa-bolt', bg: 'image/book3.jpg', q1Percent: 73, q2Percent: 74, q3Percent: 74, q4Percent: 74, summary: 'Developing ICT skills for professional environments.' },
            { id: 'card-stats', text: 'Statistics & Probability', subtitle: 'Core Subject', instructor: 'Jennifer Santos', icon: 'fa-solid fa-chart-line', bg: 'image/book5.jpg', q1Percent: 69, q2Percent: 69, q3Percent: 67, q4Percent: 68, summary: 'Understanding data analysis and probability theory.' },
            { id: 'card-system', text: 'System Architecture', subtitle: 'Specialized Subject', instructor: 'Roberto Diaz', icon: 'fa-solid fa-sitemap', bg: 'image/book6.jpg', q1Percent: 76, q2Percent: 78, q3Percent: 77, q4Percent: 77, summary: 'Exploring how complex software systems are structured.' },
            { id: 'card-introcomp', text: 'Intro to Computing', subtitle: 'Applied Subject', instructor: 'Alex Reyes', icon: 'fa-solid fa-desktop', bg: 'image/book7.jpg', q1Percent: 99, q2Percent: 99, q3Percent: 99, q4Percent: 99, summary: 'The history and future of computer technology.' },
            { id: 'card-animation', text: 'Animation', subtitle: 'Specialized Subject', instructor: 'Tricia Villanueva', icon: 'fa-solid fa-film', bg: 'image/book8.jpg', q1Percent: 99, q2Percent: 99, q3Percent: 99, q4Percent: 99, summary: 'Introduction to 2D and 3D animation techniques.' },
            { id: 'card-oralcomm', text: 'Oral Communication', subtitle: 'Core Subject', instructor: 'Ana Reyes', icon: 'fa-solid fa-comments', bg: 'image/book1.jpg', q1Percent: 95, q2Percent: 94, q3Percent: 96, q4Percent: 95, summary: 'Developing effective speaking and listening skills.' },
            { id: 'card-genmath', text: 'General Mathematics', subtitle: 'Core Subject', instructor: 'Jose Santos', icon: 'fa-solid fa-infinity', bg: 'image/book2.jpg', q1Percent: 92, q2Percent: 91, q3Percent: 93, q4Percent: 92, summary: 'Mastering mathematical concepts and problem solving.' }
        ],

        completed: []

    };
    const currentStudentCurriculumLabel = 'Curriculum';
    function getHomeSubjectCategory(subject) {
        const subtitle = String(subject?.subtitle || '').toLowerCase();
        const subjectId = String(subject?.id || '').toLowerCase();
        const subjectText = String(subject?.text || '').toLowerCase();
        if (

            subtitle.includes('specialized')

            || subtitle.includes('immersion')

            || subjectId.includes('immersion')

            || subjectText.includes('specialized')

        ) {
            return 'specialized';

        }
        if (String(subject?.id || '').startsWith('core-') || subtitle.includes('core subject')) {
            return 'core';

        }
        // Specialized logic: Contains "Cluster" or "Strand"

        if (subtitle.includes('cluster') || subtitle.includes('strand')) {
            return 'specialized';

        }
        return 'applied';

    }
    const curriculumPrograms = {

        'core-subjects': {

            title: 'Core Subjects',

            kicker: 'Shared Foundation',

            image: 'image/core-subjects.jpg',

            overview: 'Core subjects build the shared academic foundation for every learner through communication, mathematics, science, life readiness, and society-focused learning.',

            subjects: [

                { id: 'core-effective-communication', title: 'Effective Communication', overview: 'Speech, writing, listening, and communication for academic and real-life use.', image: 'image/book1.jpg' },

                { id: 'core-life-and-career-skills', title: 'Life and Career Skills', overview: 'Career planning, self-management, and workplace readiness.', image: 'image/book4.jpg' },

                { id: 'core-general-mathematics', title: 'General Mathematics', overview: 'Functions, interest, business math, and logical problem solving.', image: 'image/book2.jpg' },

                { id: 'core-general-science', title: 'General Science', overview: 'Earth systems, life science, matter, energy, and scientific reasoning.', image: 'image/book3.jpg' },

                { id: 'core-history-society', title: 'Kasaysayan at Lipunang Pilipino', overview: 'Philippine society, governance, citizenship, and historical identity.', image: 'image/book5.jpg' },

                { id: 'card-oralcomm', title: 'Oral Communication', overview: 'Developing effective speaking and listening skills for various contexts.', image: 'image/book1.jpg' }

            ]

        },

        'applied-subjects': {

            title: 'Applied Subjects',

            kicker: 'Essential Skills',

            image: 'image/academic-track.jpg',

            overview: 'Practical subjects that develop essential skills and competencies across various tracks, focusing on real-world applications of learning.',

            subjects: [

                { id: 'card-introcomp', title: 'Intro to Computing', overview: 'Basic computer concepts, hardware, software, and digital literacy foundations.', image: 'image/book4.jpg' }

            ]

        },

        'specialized-subjects': {

            title: 'Specialized Subjects',

            kicker: 'Field Mastery',

            image: 'image/work-immersion.jpg',

            overview: 'Advanced subjects specific to your chosen strand, providing in-depth knowledge and specialized training for your future career path.',

            subjects: [

                { id: 'acad-biology-1', title: 'Biology 1', overview: 'Covers cell structure, heredity, living systems, and biological processes.', image: 'image/book6.jpg' },

                { id: 'acad-contemporary-literature-1', title: 'Contemporary Literature 1', overview: 'Studies modern texts, themes, and literary forms.', image: 'image/book7.jpg' },

                { id: 'acad-citizenship-civic-engagement', title: 'Citizenship and Civic Engagement', overview: 'Focuses on rights, duties, participation, and community involvement.', image: 'image/book8.jpg' },

                { id: 'card-animation', title: 'Animation', overview: 'Principles of animation, character design, and basic movement techniques.', image: 'image/book3.jpg' }

            ]

        }

    };
    const curriculumTopicCatalog = {
        'core-effective-communication': {
            text: 'Effective Communication',
            subtitle: 'Core Subject   Grade 11',
            instructor: 'DepEd Core Curriculum',
            icon: 'fa-solid fa-comments',
            bg: 'image/book1.jpg',
            q1Percent: 100,
            q2Percent: 100,
            summary: 'A core communication subject that strengthens speaking, listening, and writing for everyday and academic use.',
            q1Topics: [
                { title: 'Nature and Elements of Communication', status: 'completed', grades: { quiz: 92, assignment: 90, activity: 94, performance: 91 } },
                { title: 'Functions of Communication', status: 'completed', grades: { quiz: 90, assignment: 88, activity: 92, performance: 89 } },
                { title: 'Communication Models', status: 'completed', grades: { quiz: 88, assignment: 85, activity: 90, performance: 87 } },
                { title: 'Communication Breakdown', status: 'completed', grades: { quiz: 86, assignment: 84, activity: 88, performance: 85 } },
                { title: 'Speech Context, Style, and Act', status: 'in-progress', grades: { quiz: 0, assignment: 82, activity: 0, performance: 0 } },
                { title: 'Principles of Speech Writing and Delivery', status: 'not-started', grades: null }
            ],
            q2Topics: [
                { title: 'Public Speaking Fundamentals', status: 'completed', grades: { quiz: 91, assignment: 89, activity: 93, performance: 90 } },
                { title: 'Persuasive Communication', status: 'completed', grades: { quiz: 88, assignment: 86, activity: 91, performance: 88 } },
                { title: 'Intercultural Communication', status: 'completed', grades: { quiz: 87, assignment: 85, activity: 89, performance: 86 } },
                { title: 'Digital Communication Literacy', status: 'completed', grades: { quiz: 89, assignment: 87, activity: 91, performance: 88 } }
            ],
            q3Topics: [
                { title: 'Oral Reading and Interpretation', status: 'in-progress', grades: { quiz: 85, assignment: 82, activity: 0, performance: 0 } },
                { title: 'Group Discussion Dynamics', status: 'not-started', grades: null },
                { title: 'Formal and Informal Registers', status: 'not-started', grades: null }
            ],
            q4Topics: [
                { title: 'Research-Based Speech', status: 'not-started', grades: null },
                { title: 'Capstone Oral Presentation', status: 'not-started', grades: null }
            ]
        },
        'core-life-and-career-skills': {
            text: 'Life and Career Skills',
            subtitle: 'Core Subject   Grade 11',
            instructor: 'DepEd Core Curriculum',
            icon: 'fa-solid fa-heart-circle-check',
            bg: 'image/book4.jpg',
            q1Percent: 100,
            q2Percent: 100,
            summary: 'A core subject that prepares learners for career planning, self-management, financial literacy, and workplace readiness.',
            q1Topics: [
                { title: 'Self-Assessment and Personal Strengths', status: 'completed', grades: { quiz: 91, assignment: 90, activity: 92, performance: 90 } },
                { title: 'Career Choices and Pathways', status: 'completed', grades: { quiz: 89, assignment: 87, activity: 90, performance: 88 } },
                { title: 'Factors Affecting Goal Fulfillment', status: 'completed', grades: { quiz: 87, assignment: 86, activity: 88, performance: 86 } },
                { title: 'Work Readiness and Professional Habits', status: 'completed', grades: { quiz: 90, assignment: 89, activity: 92, performance: 90 } },
                { title: 'Rights, Responsibilities, and Entrepreneurial Mindset', status: 'in-progress', grades: { quiz: 0, assignment: 84, activity: 0, performance: 0 } },
                { title: 'Career Portfolio and Financial Literacy', status: 'not-started', grades: null }
            ],
            q2Topics: [
                { title: 'Financial Planning Basics', status: 'completed', grades: { quiz: 90, assignment: 88, activity: 91, performance: 89 } },
                { title: 'Entrepreneurship and Innovation', status: 'completed', grades: { quiz: 88, assignment: 86, activity: 90, performance: 87 } },
                { title: 'Job Application Skills', status: 'completed', grades: { quiz: 87, assignment: 85, activity: 89, performance: 86 } },
                { title: 'Digital Work Tools', status: 'completed', grades: { quiz: 89, assignment: 87, activity: 90, performance: 88 } }
            ],
            q3Topics: [
                { title: 'Workplace Communication', status: 'in-progress', grades: { quiz: 84, assignment: 82, activity: 0, performance: 0 } },
                { title: 'Project Planning and Execution', status: 'not-started', grades: null }
            ],
            q4Topics: [
                { title: 'Career Capstone Project', status: 'not-started', grades: null },
                { title: 'Portfolio Presentation', status: 'not-started', grades: null }
            ]
        },
        'core-general-mathematics': {
            text: 'General Mathematics',
            subtitle: 'Core Subject   Grade 11',
            instructor: 'DepEd Core Curriculum',
            icon: 'fa-solid fa-square-root-variable',
            bg: 'image/book2.jpg',
            q1Percent: 100,
            q2Percent: 100,
            summary: 'A core mathematics subject focused on functions, business math, interest, loans, and logic for real-life use.',
            q1Topics: [
                { title: 'Functions and Their Graphs', status: 'completed', grades: { quiz: 92, assignment: 90, activity: 91, performance: 89 } },
                { title: 'Rational Functions, Equations, and Inequalities', status: 'completed', grades: { quiz: 88, assignment: 86, activity: 89, performance: 87 } },
                { title: 'Simple and Compound Interest', status: 'completed', grades: { quiz: 90, assignment: 88, activity: 91, performance: 89 } },
                { title: 'Stocks, Bonds, Loans, and Logic', status: 'in-progress', grades: { quiz: 0, assignment: 80, activity: 0, performance: 0 } }
            ],
            q2Topics: [
                { title: 'Exponential and Logarithmic Functions', status: 'completed', grades: { quiz: 89, assignment: 87, activity: 90, performance: 88 } },
                { title: 'Logic and Sets', status: 'completed', grades: { quiz: 87, assignment: 85, activity: 88, performance: 86 } },
                { title: 'Permutations and Combinations', status: 'completed', grades: { quiz: 85, assignment: 84, activity: 87, performance: 85 } }
            ],
            q3Topics: [
                { title: 'Probability and Expected Value', status: 'in-progress', grades: { quiz: 82, assignment: 80, activity: 0, performance: 0 } },
                { title: 'Statistics and Data Analysis', status: 'not-started', grades: null }
            ],
            q4Topics: [
                { title: 'Math in Business and Finance', status: 'not-started', grades: null },
                { title: 'Culminating Math Project', status: 'not-started', grades: null }
            ]
        },
        'core-general-science': {
            text: 'General Science',
            subtitle: 'Core Subject   Grade 11',
            instructor: 'DepEd Core Curriculum',
            icon: 'fa-solid fa-flask',
            bg: 'image/book3.jpg',
            q1Percent: 100,
            q2Percent: 100,
            summary: 'A science foundation that connects earth systems, life science, matter, energy, and real-world scientific reasoning.',
            q1Topics: [
                { title: 'Origin and Structure of the Earth', status: 'completed', grades: { quiz: 91, assignment: 89, activity: 92, performance: 90 } },
                { title: 'Earth Materials and Processes', status: 'completed', grades: { quiz: 88, assignment: 86, activity: 89, performance: 87 } },
                { title: 'Natural Hazards, Mitigation, and Adaptation', status: 'completed', grades: { quiz: 90, assignment: 88, activity: 91, performance: 89 } },
                { title: 'Perpetuation of Life and Reproduction', status: 'completed', grades: { quiz: 89, assignment: 87, activity: 90, performance: 88 } },
                { title: 'Evolution, Classification, and Ecosystems', status: 'completed', grades: { quiz: 87, assignment: 85, activity: 89, performance: 86 } },
                { title: 'Matter, Light, and the Cosmos', status: 'in-progress', grades: { quiz: 0, assignment: 82, activity: 0, performance: 0 } }
            ],
            q2Topics: [
                { title: 'Energy Transformation', status: 'completed', grades: { quiz: 88, assignment: 86, activity: 90, performance: 87 } },
                { title: 'Forces and Motion', status: 'completed', grades: { quiz: 86, assignment: 84, activity: 88, performance: 85 } },
                { title: 'Chemical Reactions and Substances', status: 'completed', grades: { quiz: 90, assignment: 88, activity: 92, performance: 89 } },
                { title: 'Waves, Sound, and Light', status: 'in-progress', grades: { quiz: 84, assignment: 82, activity: 0, performance: 0 } }
            ],
            q3Topics: [
                { title: 'Electricity and Magnetism', status: 'not-started', grades: null },
                { title: 'Modern Physics Concepts', status: 'not-started', grades: null }
            ],
            q4Topics: [
                { title: 'Environmental Science and Sustainability', status: 'not-started', grades: null },
                { title: 'Integrated Science Capstone', status: 'not-started', grades: null }
            ]
        },
        'core-history-society': {
            text: 'Pag-aaral ng Kasaysayan at Lipunang Pilipino',
            subtitle: 'Core Subject â€¢ Grade 11',
            instructor: 'DepEd Core Curriculum',
            icon: 'fa-solid fa-landmark',
            bg: 'image/book5.jpg',
            q1Percent: 100,
            q2Percent: 100,
            summary: 'A core subject that builds understanding of Philippine society, governance, citizenship, and historical identity.',
            q1Topics: [
                { title: 'Enculturation and Socialization', status: 'completed', grades: { quiz: 90, assignment: 88, activity: 91, performance: 89 } },
                { title: 'How Society Is Organized', status: 'completed', grades: { quiz: 88, assignment: 86, activity: 90, performance: 87 } },
                { title: 'The Philippine Constitution and Governance', status: 'completed', grades: { quiz: 89, assignment: 87, activity: 90, performance: 88 } },
                { title: 'Elections, Suffrage, and Political Parties', status: 'completed', grades: { quiz: 86, assignment: 84, activity: 88, performance: 85 } },
                { title: 'Civil Society, Social Movements, and Citizenship', status: 'completed', grades: { quiz: 91, assignment: 89, activity: 92, performance: 90 } },
                { title: 'Political Ideologies and Social Change', status: 'in-progress', grades: { quiz: 0, assignment: 83, activity: 0, performance: 0 } }
            ],
            q2Topics: [
                { title: 'Economic Systems and Institutions', status: 'completed', grades: { quiz: 89, assignment: 87, activity: 90, performance: 88 } },
                { title: 'Philippine Economic Issues', status: 'completed', grades: { quiz: 87, assignment: 85, activity: 89, performance: 86 } },
                { title: 'Cultural Heritage and Identity', status: 'completed', grades: { quiz: 88, assignment: 86, activity: 90, performance: 87 } },
                { title: 'Media, Information, and Society', status: 'in-progress', grades: { quiz: 84, assignment: 82, activity: 0, performance: 0 } }
            ],
            q3Topics: [
                { title: 'Contemporary Social Issues', status: 'not-started', grades: null },
                { title: 'Human Rights and Justice', status: 'not-started', grades: null }
            ],
            q4Topics: [
                { title: 'Philippine Development Goals', status: 'not-started', grades: null },
                { title: 'Civic Action and Community Service', status: 'not-started', grades: null }
            ]
        },
        'subj-prog1': {
            text: 'Programming 1',
            subtitle: 'Applied Subject â€¢ Grade 11',
            instructor: 'Alex Reyes',
            icon: 'fa-solid fa-code',
            bg: 'image/techpro-track.jpg',
            q1Percent: 75,
            q2Percent: 0,
            q3Percent: 0,
            q4Percent: 0,
            summary: 'Introduction to computer programming using Java, covering syntax, logic, and object-oriented concepts.',
            q1Topics: [
                { title: 'Introduction to Java', status: 'completed', grades: { quiz: 85, assignment: 92, activity: 88, performance: 90 } },
                { title: 'Variables & Data Types', status: 'completed', grades: { quiz: 88, assignment: 85, activity: 90, performance: 87 } },
                { title: 'Control Structures', status: 'in-progress', grades: { quiz: 0, assignment: 80, activity: 0, performance: 0 } },
                { title: 'Methods & Functions', status: 'not-started', grades: null }
            ],
            q2Topics: [
                { title: 'Arrays & Collections', status: 'not-started', grades: null },
                { title: 'Object-Oriented Programming', status: 'not-started', grades: null },
                { title: 'File Handling & I/O', status: 'not-started', grades: null }
            ],
            q3Topics: [
                { title: 'Recursion and Algorithms', status: 'not-started', grades: null },
                { title: 'Exception Handling', status: 'not-started', grades: null }
            ],
            q4Topics: [
                { title: 'GUI Programming', status: 'not-started', grades: null },
                { title: 'Capstone Project', status: 'not-started', grades: null }
            ]
        },
        'immersion-stage-1': {
            text: 'Pre-Immersion',
            subtitle: 'Specialized Stage â€¢ Grade 12',
            instructor: 'Immersion Coordinator',
            icon: 'fa-solid fa-user-clock',
            bg: 'image/book6.jpg',
            q1Percent: 100,
            q2Percent: 0,
            summary: 'Orientation and readiness for work immersion placement.',
            q1Topics: [
                { title: 'Orientation and Clearance', status: 'completed', grades: { quiz: 95, assignment: 98, activity: 100, performance: 100 } },
                { title: 'Forms and Safety Rules', status: 'completed', grades: { quiz: 92, assignment: 95, activity: 98, performance: 95 } }
            ]
        },
        'immersion-stage-2': {
            text: 'Immersion Proper',
            subtitle: 'Specialized Stage â€¢ Grade 12',
            instructor: 'Company Supervisor',
            icon: 'fa-solid fa-briefcase',
            bg: 'image/book7.jpg',
            q1Percent: 45,
            q2Percent: 0,
            summary: 'Supervised performance and practical training in a real work environment.',
            q1Topics: [
                { title: 'Attendance Logs and Weekly Reports', status: 'in-progress', grades: { quiz: 0, assignment: 88, activity: 0, performance: 0 } },
                { title: 'Assigned Technical Tasks', status: 'not-started', grades: null }
            ]
        },
        'immersion-stage-3': {
            text: 'Post-Immersion',
            subtitle: 'Specialized Stage â€¢ Grade 12',
            instructor: 'Immersion Coordinator',
            icon: 'fa-solid fa-graduation-cap',
            bg: 'image/book8.jpg',
            q1Percent: 0,
            q2Percent: 0,
            summary: 'Final evaluation and portfolio building after the immersion period.',
            q1Topics: [
                { title: 'Reflection Journal and Portfolio', status: 'not-started', grades: null },
                { title: 'Final Presentation and Evaluation', status: 'not-started', grades: null }
            ]
        },
        'acad-biology-1': {
            text: 'Biology 1',
            subtitle: 'Academic Track   Grade 11',
            instructor: 'Academic Track Faculty',
            icon: 'fa-solid fa-dna',
            bg: 'image/book3.jpg',
            q1Percent: 91,
            q2Percent: 91,
            summary: 'Introduces living systems, cell structures, heredity, and the diversity of life.',
            q1Topics: [
                { title: 'Introduction to Biology', status: 'completed', grades: { quiz: 92, assignment: 90, activity: 91, performance: 89 } },
                { title: 'Cell Structure and Function', status: 'completed', grades: { quiz: 88, assignment: 86, activity: 89, performance: 87 } },
                { title: 'Genetics and Heredity', status: 'completed', grades: { quiz: 90, assignment: 88, activity: 91, performance: 89 } },
                { title: 'Diversity of Organisms', status: 'in-progress', grades: { quiz: 0, assignment: 82, activity: 0, performance: 0 } },
                { title: 'Biological Systems and Interactions', status: 'not-started', grades: null }
            ]
        },
        'acad-contemporary-literature-1': {
            text: 'Contemporary Literature 1',
            subtitle: 'Academic Track   Grade 11',
            instructor: 'Academic Track Faculty',
            icon: 'fa-solid fa-book-open',
            bg: 'image/book1.jpg',
            q1Percent: 88,
            q2Percent: 88,
            summary: 'Introduces modern literary forms, themes, and interpretations through reading and discussion.',
            q1Topics: [
                { title: 'Literature in the Modern Context', status: 'completed', grades: { quiz: 92, assignment: 90, activity: 91, performance: 89 } },
                { title: 'Themes in Contemporary Texts', status: 'completed', grades: { quiz: 88, assignment: 86, activity: 89, performance: 87 } },
                { title: 'Poetry, Fiction, and Creative Nonfiction', status: 'completed', grades: { quiz: 86, assignment: 84, activity: 88, performance: 85 } },
                { title: 'Literary Criticism and Response', status: 'in-progress', grades: { quiz: 0, assignment: 82, activity: 0, performance: 0 } },
                { title: 'Writing a Critical Reflection', status: 'not-started', grades: null }
            ]
        },
        'acad-citizenship-civic-engagement': {
            text: 'Citizenship and Civic Engagement',
            subtitle: 'Academic Track   Grade 11',
            instructor: 'Academic Track Faculty',
            icon: 'fa-solid fa-people-arrows',
            bg: 'image/book5.jpg',
            q1Percent: 87,
            q2Percent: 87,
            summary: 'Builds civic participation through rights, duties, community action, and service-oriented learning.',
            q1Topics: [
                { title: 'Rights, Duties, and Citizenship', status: 'completed', grades: { quiz: 90, assignment: 88, activity: 91, performance: 89 } },
                { title: 'Community Participation', status: 'completed', grades: { quiz: 88, assignment: 86, activity: 89, performance: 87 } },
                { title: 'Social Issues and Public Service', status: 'completed', grades: { quiz: 86, assignment: 84, activity: 88, performance: 85 } },
                { title: 'Advocacy and Volunteerism', status: 'in-progress', grades: { quiz: 0, assignment: 82, activity: 0, performance: 0 } },
                { title: 'Civic Action Project', status: 'not-started', grades: null }
            ]
        },
        'card-introcomp': {
            text: 'Intro to Computing',
            subtitle: 'Foundations   Grade 11',
            instructor: 'Carlo Bautista',
            icon: 'fa-solid fa-desktop',
            bg: 'image/book4.jpg',
            q1Percent: 100,
            q2Percent: 100,
            summary: 'Basic computer concepts, hardware, software, and digital literacy foundations.',
            q1Topics: [
                { title: 'Introduction to Hardware', status: 'completed', grades: { quiz: 95, assignment: 98, activity: 96, performance: 97 } },
                { title: 'Software Ecosystems', status: 'completed', grades: { quiz: 94, assignment: 96, activity: 95, performance: 94 } }
            ]
        },
        'card-oralcomm': {
            text: 'Oral Communication',
            subtitle: 'Core Subject   Grade 11',
            instructor: 'Ana Reyes',
            icon: 'fa-solid fa-comments',
            bg: 'image/book1.jpg',
            q1Percent: 100,
            q2Percent: 100,
            summary: 'Developing effective speaking and listening skills for various contexts.',
            q1Topics: [
                { title: 'Nature and Elements of Communication', status: 'completed', grades: { quiz: 95, assignment: 92, activity: 94, performance: 93 } },
                { title: 'Models of Communication', status: 'completed', grades: { quiz: 90, assignment: 88, activity: 92, performance: 90 } },
                { title: 'Principles of Speech Writing and Delivery', status: 'in-progress', grades: { quiz: 0, assignment: 85, activity: 0, performance: 0 } }
            ]
        },
        'card-prog1': {
            text: 'Computer Programming 1',
            subtitle: 'Core Subject   Grade 11',
            instructor: 'Elena Reyes',
            icon: 'fa-solid fa-code',
            bg: 'image/book1.jpg',
            q1Percent: 84,
            q2Percent: 0,
            summary: 'Learn the fundamentals of programming using modern languages.',
            q1Topics: [
                { title: 'Introduction to Algorithms', status: 'completed', grades: { quiz: 88, assignment: 85, activity: 90, performance: 87 } },
                { title: 'Variables and Data Types', status: 'completed', grades: { quiz: 85, assignment: 82, activity: 88, performance: 84 } },
                { title: 'Object-Oriented Programming', status: 'in-progress', grades: { quiz: 0, assignment: 80, activity: 0, performance: 0 } }
            ],
            q2Topics: [
                { title: 'Control Flow and Loops', status: 'not-started', grades: null },
                { title: 'Arrays and Lists', status: 'not-started', grades: null },
                { title: 'Functions and Scope', status: 'not-started', grades: null }
            ],
            q3Topics: [
                { title: 'File I/O and Error Handling', status: 'not-started', grades: null },
                { title: 'Libraries and APIs', status: 'not-started', grades: null }
            ],
            q4Topics: [
                { title: 'Mini App Development', status: 'not-started', grades: null },
                { title: 'Code Review and Testing', status: 'not-started', grades: null }
            ]
        },
        'card-webdev': {
            text: 'Web Development 1',
            subtitle: 'Applied Subject   Grade 11',
            instructor: 'Sarah Lim',
            icon: 'fa-solid fa-globe',
            bg: 'image/book4.jpg',
            q1Percent: 79,
            q2Percent: 0,
            summary: 'Build responsive websites using HTML, CSS, and JavaScript.',
            q1Topics: [
                { title: 'HTML5 Semantic Structure', status: 'completed', grades: { quiz: 85, assignment: 88, activity: 82, performance: 84 } },
                { title: 'CSS Layouts and Flexbox', status: 'completed', grades: { quiz: 82, assignment: 85, activity: 80, performance: 81 } },
                { title: 'DOM Manipulation', status: 'in-progress', grades: { quiz: 0, assignment: 78, activity: 0, performance: 0 } }
            ],
            q2Topics: [
                { title: 'JavaScript ES6+ Fundamentals', status: 'not-started', grades: null },
                { title: 'Responsive Design and Media Queries', status: 'not-started', grades: null },
                { title: 'AJAX and Fetch API', status: 'not-started', grades: null }
            ],
            q3Topics: [
                { title: 'Web Frameworks Introduction', status: 'not-started', grades: null },
                { title: 'REST APIs and JSON', status: 'not-started', grades: null }
            ],
            q4Topics: [
                { title: 'Full-Stack Mini Project', status: 'not-started', grades: null },
                { title: 'Deployment and Testing', status: 'not-started', grades: null }
            ]
        },
        'card-database': {
            text: 'Database Management 1',
            subtitle: 'Specialized Subject   Grade 11',
            instructor: 'Elena Reyes',
            icon: 'fa-solid fa-database',
            bg: 'image/book2.jpg',
            q1Percent: 88,
            q2Percent: 0,
            summary: 'Master SQL and database design principles.',
            q1Topics: [
                { title: 'Entity Relationship Diagrams', status: 'completed', grades: { quiz: 92, assignment: 90, activity: 88, performance: 91 } },
                { title: 'SQL Queries and Joins', status: 'in-progress', grades: { quiz: 0, assignment: 85, activity: 0, performance: 0 } }
            ],
            q2Topics: [
                { title: 'Normalization and Schema Design', status: 'not-started', grades: null },
                { title: 'Stored Procedures and Triggers', status: 'not-started', grades: null }
            ],
            q3Topics: [
                { title: 'Database Security and Administration', status: 'not-started', grades: null },
                { title: 'NoSQL Databases Overview', status: 'not-started', grades: null }
            ],
            q4Topics: [
                { title: 'Database Capstone Project', status: 'not-started', grades: null }
            ]
        },
        'card-empowerment': {
            text: 'Empowerment Technologies',
            subtitle: 'Core Subject   Grade 11',
            instructor: 'Roberto Diaz',
            icon: 'fa-solid fa-bolt',
            bg: 'image/book3.jpg',
            q1Percent: 73,
            q2Percent: 0,
            summary: 'Developing ICT skills for professional environments.',
            q1Topics: [
                { title: 'Digital Literacy Foundations', status: 'completed', grades: { quiz: 78, assignment: 75, activity: 80, performance: 77 } },
                { title: 'Online Security and Ethics', status: 'in-progress', grades: { quiz: 0, assignment: 70, activity: 0, performance: 0 } }
            ],
            q2Topics: [
                { title: 'Cloud Computing Basics', status: 'not-started', grades: null },
                { title: 'Productivity Suites and Collaboration Tools', status: 'not-started', grades: null }
            ],
            q3Topics: [
                { title: 'Emerging Technologies', status: 'not-started', grades: null },
                { title: 'ICT Policy and Governance', status: 'not-started', grades: null }
            ],
            q4Topics: [
                { title: 'Digital Portfolio Development', status: 'not-started', grades: null }
            ]
        },
        'card-stats': {
            text: 'Statistics & Probability',
            subtitle: 'Core Subject   Grade 11',
            instructor: 'Jennifer Santos',
            icon: 'fa-solid fa-chart-line',
            bg: 'image/book5.jpg',
            q1Percent: 69,
            q2Percent: 0,
            summary: 'Understanding data analysis and probability theory.',
            q1Topics: [
                { title: 'Descriptive Statistics', status: 'completed', grades: { quiz: 72, assignment: 70, activity: 75, performance: 71 } },
                { title: 'Probability Distributions', status: 'in-progress', grades: { quiz: 0, assignment: 65, activity: 0, performance: 0 } }
            ],
            q2Topics: [
                { title: 'Hypothesis Testing', status: 'not-started', grades: null },
                { title: 'Correlation and Regression', status: 'not-started', grades: null }
            ],
            q3Topics: [
                { title: 'Sampling and Estimation', status: 'not-started', grades: null },
                { title: 'Statistical Decision Making', status: 'not-started', grades: null }
            ],
            q4Topics: [
                { title: 'Statistics in Real-World Applications', status: 'not-started', grades: null }
            ]
        },
        'card-system': {
            text: 'System Architecture',
            subtitle: 'Specialized Subject   Grade 11',
            instructor: 'Roberto Diaz',
            icon: 'fa-solid fa-sitemap',
            bg: 'image/book6.jpg',
            q1Percent: 76,
            q2Percent: 0,
            summary: 'Exploring how complex software systems are structured.',
            q1Topics: [
                { title: 'Computer System Components', status: 'completed', grades: { quiz: 80, assignment: 78, activity: 82, performance: 79 } },
                { title: 'Networking Fundamentals', status: 'in-progress', grades: { quiz: 0, assignment: 72, activity: 0, performance: 0 } }
            ],
            q2Topics: [
                { title: 'Memory and Storage Systems', status: 'not-started', grades: null },
                { title: 'CPU Scheduling Algorithms', status: 'not-started', grades: null }
            ],
            q3Topics: [
                { title: 'Operating Systems Design', status: 'not-started', grades: null },
                { title: 'Distributed Systems', status: 'not-started', grades: null }
            ],
            q4Topics: [
                { title: 'Cloud and Virtualization', status: 'not-started', grades: null }
            ]
        },
        'card-animation': {
            text: 'Animation',
            subtitle: 'Specialized Subject   Grade 11',
            instructor: 'Tricia Villanueva',
            icon: 'fa-solid fa-film',
            bg: 'image/book8.jpg',
            q1Percent: 64,
            q2Percent: 0,
            summary: 'Introduction to 2D and 3D animation techniques.',
            q1Topics: [
                { title: 'Principles of Animation', status: 'completed', grades: { quiz: 70, assignment: 68, activity: 72, performance: 69 } },
                { title: 'Storyboarding Basics', status: 'in-progress', grades: { quiz: 0, assignment: 60, activity: 0, performance: 0 } }
            ],
            q2Topics: [
                { title: 'Character Design and Rigging', status: 'not-started', grades: null },
                { title: 'Frame-by-Frame Animation', status: 'not-started', grades: null }
            ],
            q3Topics: [
                { title: 'Motion Graphics and Compositing', status: 'not-started', grades: null },
                { title: '3D Modeling Introduction', status: 'not-started', grades: null }
            ],
            q4Topics: [
                { title: 'Animation Capstone Project', status: 'not-started', grades: null }
            ]
        },
        'card-genmath': {
            text: 'General Mathematics',
            subtitle: 'Core Subject   Grade 11',
            instructor: 'Jose Santos',
            icon: 'fa-solid fa-infinity',
            bg: 'image/book2.jpg',
            q1Percent: 100,
            q2Percent: 100,
            summary: 'Strengthens practical mathematical thinking through functions and logical problem-solving.',
            q1Topics: [
                { title: 'Advanced Algebra', status: 'completed', grades: { quiz: 88, assignment: 90, activity: 89, performance: 91 } },
                { title: 'Mathematical Logic', status: 'completed', grades: { quiz: 87, assignment: 89, activity: 88, performance: 90 } }
            ]
        },
        'card-animation': {
            text: 'Animation',
            subtitle: 'ICT Strand   Grade 11',
            instructor: 'Tricia Villanueva',
            icon: 'fa-solid fa-palette',
            bg: 'image/book3.jpg',
            q1Percent: 100,
            q2Percent: 100,
            summary: 'Principles of animation, character design, and basic movement techniques.',
            q1Topics: [
                { title: '12 Principles of Animation', status: 'completed', grades: { quiz: 96, assignment: 98, activity: 96, performance: 97 } },
                { title: 'Keyframing Techniques', status: 'completed', grades: { quiz: 95, assignment: 97, activity: 95, performance: 96 } }
            ]
        }
    };
    function getAssessmentsForSubject(subjectId, category) {
        const data = getTopicData(subjectId);
        if (!data) return [];
        
        const labels = {
            'assignment': 'Assignment',
            'quiz': 'Quiz',
            'activity': 'Activity',
            'perf. task': 'PT'
        };
        const label = labels[category] || category;
        const generated = [];

        ['q1Topics', 'q2Topics', 'q3Topics', 'q4Topics'].forEach((termKey, termIdx) => {
            const topics = data[termKey] || [];
            topics.forEach((topic, tIdx) => {
                generated.push({
                    title: `${label} #${tIdx + 1}: Introduction to ${topic.title}`,
                    date: 'Mar 10, 2026',
                    max: 100,
                    subjectId: subjectId,
                    term: termIdx + 1,
                    topicIdx: tIdx,
                    itemIdx: 0
                });
                generated.push({
                    title: `${label} #${tIdx + 1}.2: Advanced concepts in ${topic.title}`,
                    date: 'Mar 17, 2026',
                    max: 100,
                    subjectId: subjectId,
                    term: termIdx + 1,
                    topicIdx: tIdx,
                    itemIdx: 1
                });
            });
        });
        return generated;
    }

    function buildAssessmentRows() {
        const rows = [];
        const baseDate = new Date('2026-03-26T08:00:00');
        const seen = new Set();
        const sources = [
            ...subjectsData.enrolled.map(subject => subject.id),
            ...subjectsData.completed.map(subject => subject.id)
        ];

        sources.forEach((subjectId, sIdx) => {
            if (seen.has(subjectId)) return;
            seen.add(subjectId);
            
            const subject = getTopicSubject(subjectId);
            const subjectName = getSubjectDisplayName(subject);
            if (!subject || !subjectName) return;

            const categories = ['assignment', 'quiz', 'activity', 'perf. task'];

            categories.forEach(cat => {
                const assessments = getAssessmentsForSubject(subjectId, cat);
                assessments.forEach((ass, aIdx) => {
                    const startDate = new Date(baseDate);
                    startDate.setDate(baseDate.getDate() - (aIdx * 5 + (sIdx * 2) + 2));
                    const dueDate = new Date(startDate);
                    dueDate.setDate(startDate.getDate() + 7);

                    let status = 'not-started';
                    if (aIdx % 4 === 0) status = 'graded';
                    else if (aIdx % 4 === 1) status = 'submitted';
                    else if (aIdx % 4 === 2) status = 'waiting';
                    else if (aIdx % 5 === 0) status = 'overdue';

                    const score = status === 'graded' ? 85 + (aIdx % 15) : 0;
                    const tabMap = { 'assignment': 'assignments', 'quiz': 'quiz', 'activity': 'activity', 'perf. task': 'performance' };
                    
                    rows.push({
                        subjectId: subjectId,
                        subject: subjectName,
                        activity: ass.title,
                        category: cat,
                        tab: tabMap[cat] || 'activity',
                        topicIdx: ass.topicIdx,
                        itemIdx: ass.itemIdx,
                        status: status,
                        score: score,
                        max: ass.max,
                        startDate: startDate,
                        dueDate: dueDate,
                        submittedOn: status !== 'not-started' ? new Date(startDate.getTime() + 86400000) : null,
                        gradedOn: status === 'graded' ? new Date(startDate.getTime() + 259200000) : null
                    });
                });
            });
        });

        return rows.sort((a, b) => b.startDate - a.startDate);
    }
    function renderAssessmentsPage() {
        const layout = document.getElementById('assessments-layout');
        if (!layout) return;
        try {
            const rows = buildAssessmentRows();
            const pendingCount = rows.filter(row => row.status === 'pending').length;
            const completedCount = rows.filter(row => row.status === 'completed').length;
            const overdueCount = rows.filter(row => row.status === 'overdue').length;
            const subjects = [...new Set(rows.map(row => row.subject))].sort((a, b) => a.localeCompare(b));
            const overdueRows = rows.filter(row => row.status === 'overdue').slice(0, 3);
            const pendingRows = rows.filter(row => row.status === 'pending').slice(0, 2);
            const concernItems = [];
            if (overdueCount > 0) {
                concernItems.push(`You have ${overdueCount} overdue ${overdueCount === 1 ? 'activity' : 'activities'} that need immediate attention.`);
            }

            overdueRows.forEach(row => {
                concernItems.push(`Submit ${row.activity} in ${row.subject} as soon as possible.`);
            });
            if (pendingCount > 0) {
                concernItems.push(`You still have ${pendingCount} pending ${pendingCount === 1 ? 'activity' : 'activities'} scheduled next.`);
            }

            pendingRows.forEach(row => {
                concernItems.push(`Prepare ${row.activity} for ${row.subject} before ${formatAssessmentDate(row.dueDate)}.`);
            });
            if (!concernItems.length) {
                concernItems.push('No urgent concerns right now. Keep maintaining your completed activities and upcoming deadlines.');
            }
            const statusBadge = status => {
                if (status === 'graded') return '<span class="text-green-600 font-bold text-[11px]">Graded</span>';
                if (status === 'submitted') return '<span class="text-green-600 font-bold text-[11px]">Submitted</span>';
                if (status === 'waiting') return '<span class="text-amber-500 font-bold text-[11px]">Waiting</span>';
                if (status === 'overdue') return '<span class="text-red-600 font-bold text-[11px]">Overdue</span>';
                return '<span class="text-black font-bold text-[11px]">-</span>';
            };

            const sigmaLimited = concernItems.slice(0, 3);
            let assignmentCount = 0;
            let quizCount = 0;
            let performanceTaskCount = 0;
            let activityCount = 0;
            rows.forEach(row => {
                // For students, TO DO means things they haven't submitted yet
                if (row.status === 'graded' || row.status === 'submitted' || row.status === 'waiting') return;
                const lowerActivity = row.activity.toLowerCase();
                if (lowerActivity.includes('assignment')) {
                    assignmentCount++;
                } else if (lowerActivity.includes('quiz')) {
                    quizCount++;
                } else if (lowerActivity.includes('performance') || lowerActivity.includes('task')) {
                    performanceTaskCount++;
                } else {
                    activityCount++;
                }
            });

            layout.innerHTML = `
                <div class="teacher-topic-page-shell">
                <div class="teacher-topic-page-grid">
                    <div class="teacher-topic-main-shell overflow-visible" style="display: flex; flex-direction: column;">
                        <div class="teacher-topic-header border-b border-black flex flex-col md:flex-row items-center justify-between gap-4 p-4 md:px-10 md:py-6">
                            <div class="w-full md:w-auto flex items-center gap-4">
                                <select id="assessments-subject-filter" class="px-4 py-2.5 rounded-xl border border-black bg-white text-xs md:text-sm font-semibold text-gray-700 focus:outline-none focus:border-black w-full md:w-[320px]">
                                    <option value="all">All Subjects</option>
                                    ${subjects.map(subject => `<option value="${subject}">${subject}</option>`).join('')}
                                </select>
                            </div>

                        </div>

                        <div class="overflow-x-auto w-full scrollbar-hide" style="-webkit-overflow-scrolling: touch;">
                            <table class="w-full text-left border-separate border-spacing-0 min-w-[650px] md:min-w-0">
                                <thead>
                                    <tr class="bg-white">
                                        <th class="sticky left-0 bg-white z-30 w-[140px] md:w-[22%] px-2 md:px-5 py-3 md:py-4 text-[8px] md:text-[10px] font-bold text-black uppercase tracking-widest whitespace-normal leading-tight shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-b border-gray-100">Assessment</th>
                                        <th class="px-1 md:px-5 py-3 md:py-4 text-[8px] md:text-[10px] font-bold text-black uppercase tracking-widest text-center whitespace-normal leading-tight border-b border-gray-100">Start</th>
                                        <th class="px-1 md:px-5 py-3 md:py-4 text-[8px] md:text-[10px] font-bold text-black uppercase tracking-widest text-center whitespace-normal leading-tight border-b border-gray-100">Due</th>
                                        <th class="px-1 md:px-5 py-3 md:py-4 text-[8px] md:text-[10px] font-bold text-black uppercase tracking-widest text-center whitespace-normal leading-tight border-b border-gray-100">Submitted</th>
                                        <th class="px-1 md:px-5 py-3 md:py-4 text-[8px] md:text-[10px] font-bold text-black uppercase tracking-widest text-center whitespace-normal leading-tight border-b border-gray-100">Graded</th>
                                        <th class="px-1 md:px-3 py-3 md:py-4 text-[8px] md:text-[10px] font-bold text-black uppercase tracking-widest text-center whitespace-normal leading-tight border-b border-gray-100">Score</th>
                                        <th class="px-2 md:px-5 py-3 md:py-4 text-[8px] md:text-[10px] font-bold text-black uppercase tracking-widest text-left whitespace-normal leading-tight border-b border-gray-100">Status</th>
                                    </tr>
                                </thead>
                                <tbody id="assessments-body"></tbody>
                            </table>
                        </div>
                        
                        <div class="p-4 border-t border-gray-100 flex items-center justify-center gap-2 mt-auto">
                            <button id="assessments-prev-page" type="button" class="w-8 h-8 rounded-full border border-transparent bg-[#116631] text-white hover:bg-green-800 transition-all shadow-sm flex items-center justify-center"><i class="fa-solid fa-chevron-left text-[10px]"></i></button>
                            <div id="assessments-page-numbers" class="flex items-center gap-1 justify-center px-2"></div>
                            <button id="assessments-next-page" type="button" class="w-8 h-8 rounded-full border border-transparent bg-[#116631] text-white hover:bg-green-800 transition-all shadow-sm flex items-center justify-center"><i class="fa-solid fa-chevron-right text-[10px]"></i></button>
                        </div>

                    </div>

                    <!-- RIGHT: SIGMA and TODO Panels -->
                    <div id="assessments-right-rail" class="flex flex-col gap-4" style="grid-area: rail;">
                        <div id="assessments-sigma-panel" class="transition-all duration-300"></div>
                        <div id="assessments-todo-panel" class="transition-all duration-300"></div>
                    </div>
                </div>
                </div>
            `;
            const body = layout.querySelector('#assessments-body');
            const filter = layout.querySelector('#assessments-subject-filter');
            const indicator = layout.querySelector('#assessments-page-indicator');
            const prevBtn = layout.querySelector('#assessments-prev-page');
            const nextBtn = layout.querySelector('#assessments-next-page');
            const sigmaPanel = layout.querySelector('#assessments-sigma-panel');
            const todoPanel = layout.querySelector('#assessments-todo-panel');
            const pageSize = 7;
            let currentPage = 1;
            const tableScrollWrap = body?.closest('.overflow-auto');

            function getFilteredRows() {
                const selectedSubject = filter?.value || 'all';
                return selectedSubject === 'all'
                    ? rows
                    : rows.filter(row => row.subject === selectedSubject);
            }

            function updateSidebarPanels(fRows) {
                if (!sigmaPanel || !todoPanel) return;

                const concernItems = [];
                const overdueRows = fRows.filter(row => row.status === 'overdue').slice(0, 3);
                const pendingRows = fRows.filter(row => row.status === 'pending').slice(0, 2);

                if (overdueRows.length > 0) {
                    concernItems.push(`There are ${overdueRows.length} assessments with pending submissions that are past the deadline.`);
                    overdueRows.forEach(row => {
                        concernItems.push(`Grade pending submissions for ${row.activity} in ${row.subject}.`);
                    });
                }
                if (pendingRows.length > 0) {
                    concernItems.push(`You have ${pendingRows.length} upcoming assessments scheduled for this month.`);
                }
                if (!concernItems.length) {
                    concernItems.push('All current assessments are up to date. No immediate grading actions required.');
                }

                const sigmaLimited = concernItems.slice(0, 3);
                let assignmentCount = 0;
                let quizCount = 0;
                let performanceTaskCount = 0;
                let activityCount = 0;

                fRows.forEach(row => {
                    if (row.status !== 'waiting') return;
                    const lowerActivity = row.activity.toLowerCase();
                    if (lowerActivity.includes('assignment')) {
                        assignmentCount++;
                    } else if (lowerActivity.includes('quiz')) {
                        quizCount++;
                    } else if (lowerActivity.includes('performance') || lowerActivity.includes('task')) {
                        performanceTaskCount++;
                    } else {
                        activityCount++;
                    }
                });

                const sigmaDate = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

                sigmaPanel.innerHTML = `
                    <div class="bg-white border border-gray-100 rounded-[22px] standard-panel-shadow flex flex-col overflow-hidden relative select-none">
                        <div class="px-5 py-4 flex items-center border-b border-gray-50">
                            <div class="flex items-center gap-2">
                                <i class="fa-solid fa-bolt text-[#FFD000] text-[12px]"></i>
                                <h4 class="text-[11px] font-black text-black tracking-widest uppercase">SIGMA</h4>
                            </div>
                            <span class="ml-auto text-[10px] text-slate-400 font-normal">${sigmaDate}</span>
                        </div>
                        <div class="p-5">
                            <div class="space-y-4">
                                ${sigmaLimited.map(item => `
                                    <div class="flex items-start gap-3">
                                        <i class="fa-solid fa-angle-right text-icc mt-1 text-[10px]"></i>
                                        <p class="text-[11px] text-gray-700 leading-relaxed font-semibold">${item}</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `;

                todoPanel.innerHTML = `
                    <div class="bg-white border border-gray-100 rounded-[22px] standard-panel-shadow flex flex-col overflow-hidden relative select-none">
                        <div class="px-5 py-4 flex items-center border-b border-gray-50">
                            <div class="flex items-center gap-2">
                                <i class="fa-solid fa-list-check text-black text-[12px]"></i>
                                <h4 class="text-[11px] font-black text-black tracking-widest uppercase">TO DO</h4>
                            </div>
                            <span class="ml-auto text-[10px] text-slate-400 font-normal">${sigmaDate}</span>
                        </div>
                        <div class="p-5">
                            <div class="space-y-3">
                                ${assignmentCount > 0 ? `
                                    <div class="flex items-center gap-3">
                                        <i class="fa-solid fa-clipboard-list text-icc text-[10px]"></i>
                                        <p class="text-[11px] text-gray-700 font-semibold">${assignmentCount} ${assignmentCount === 1 ? 'Assignment' : 'Assignments'} due</p>
                                    </div>
                                ` : ''}
                                ${quizCount > 0 ? `
                                    <div class="flex items-center gap-3">
                                        <i class="fa-solid fa-clipboard-question text-icc text-[10px]"></i>
                                        <p class="text-[11px] text-gray-700 font-semibold">${quizCount} ${quizCount === 1 ? 'Quiz' : 'Quizzes'} due</p>
                                    </div>
                                ` : ''}
                                ${performanceTaskCount > 0 ? `
                                    <div class="flex items-center gap-3">
                                        <i class="fa-solid fa-clipboard-user text-icc text-[10px]"></i>
                                        <p class="text-[11px] text-gray-700 font-semibold">${performanceTaskCount} ${performanceTaskCount === 1 ? 'Performance task' : 'Performance tasks'} due</p>
                                    </div>
                                ` : ''}
                                ${activityCount > 0 ? `
                                    <div class="flex items-center gap-3">
                                        <i class="fa-solid fa-clipboard text-icc text-[10px]"></i>
                                        <p class="text-[11px] text-gray-700 font-semibold">${activityCount} ${activityCount === 1 ? 'Activity' : 'Activities'} due</p>
                                    </div>
                                ` : ''}
                                ${assignmentCount === 0 && quizCount === 0 && performanceTaskCount === 0 && activityCount === 0 ? `
                                    <div class="flex flex-col items-center justify-center py-4">
                                        <i class="fa-solid fa-circle-check text-green-500 text-3xl"></i>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }

            function bindAssessmentSubjectLinks() {
                layout.querySelectorAll('.assessment-subject-link').forEach(button => {
                    button.addEventListener('click', event => {
                        event.preventDefault();
                        event.stopPropagation();
                        openTopicContent(button.dataset.subjectId, 0);
                    });
                });
            }

            function renderAssessmentPageRows() {
                const filteredRows = getFilteredRows();

                // Auto-refresh the sidebar panels as well
                updateSidebarPanels(filteredRows);

                const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
                currentPage = Math.min(currentPage, totalPages);
                const startIndex = (currentPage - 1) * pageSize;
                const vRows = filteredRows.slice(startIndex, startIndex + pageSize);

                let html = '';
                for (let i = 0; i < pageSize; i++) {
                    const row = vRows[i];
                    if (row) {
                        html += `
                        <tr class="group hover:bg-gray-50/50 transition-colors ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}">
                            <td class="sticky left-0 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'} group-hover:bg-gray-50/50 transition-colors z-20 px-2 md:px-5 py-3 text-[10px] md:text-sm font-bold text-gray-800 whitespace-normal leading-tight shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-b border-gray-100">
                                <button type="button" class="text-left text-icc hover:text-icc-dark hover:underline transition-colors block" onclick="event.stopPropagation(); window.openTopicContent('${row.subjectId}', ${row.topicIdx}, '${row.tab}', ${row.itemIdx})">${row.activity}</button>
                            </td>
                            <td class="px-1 md:px-5 py-3 text-[9px] md:text-sm text-black text-center whitespace-normal leading-tight border-b border-gray-100">${formatAssessmentDate(row.startDate)}</td>
                            <td class="px-1 md:px-5 py-3 text-[9px] md:text-sm text-black text-center whitespace-normal leading-tight border-b border-gray-100">${formatAssessmentDate(row.dueDate)}</td>
                            <td class="px-1 md:px-5 py-3 text-[9px] md:text-sm text-black text-center whitespace-normal leading-tight border-b border-gray-100">${row.submittedOn ? formatAssessmentDate(row.submittedOn) : '-'}</td>
                            <td class="px-1 md:px-5 py-3 text-[9px] md:text-sm text-black text-center whitespace-normal leading-tight border-b border-gray-100">${row.gradedOn ? formatAssessmentDate(row.gradedOn) : '-'}</td>
                            <td class="px-1 md:px-3 py-3 text-[9px] md:text-sm font-bold text-center whitespace-normal leading-tight text-black border-b border-gray-100">${row.score > 0 ? row.score : '-'}</td>
                            <td class="px-2 md:px-5 py-3 text-[9px] md:text-sm text-left whitespace-normal leading-tight border-b border-gray-100">${statusBadge(row.status)}</td>
                        </tr>
`;
                    } else {
                        html += `<tr class="${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'} h-[56px]"><td colspan="7"></td></tr>`;
                    }
                }
                body.innerHTML = html;
                const pageNumbersContainer = layout.querySelector('#assessments-page-numbers');
                if (pageNumbersContainer) {
                    let startPage = Math.max(1, currentPage - 2);
                    let endPage = Math.min(totalPages, startPage + 4);
                    if (endPage - startPage < 4) {
                        startPage = Math.max(1, endPage - 4);
                    }
                    
                    let pageHtml = '';
                    for (let p = startPage; p <= endPage; p++) {
                        const isActive = p === currentPage;
                        const btnClass = isActive 
                            ? 'w-8 h-8 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold bg-[#116631] text-white shadow-sm' 
                            : 'w-8 h-8 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer';
                        
                        pageHtml += `<button type="button" class="assessment-page-btn ${btnClass}" data-page="${p}">${p}</button>`;
                    }
                    pageNumbersContainer.innerHTML = pageHtml;

                    pageNumbersContainer.querySelectorAll('.assessment-page-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const newPage = parseInt(e.currentTarget.dataset.page, 10);
                            if (newPage !== currentPage) {
                                currentPage = newPage;
                                renderAssessmentPageRows();
                            }
                        });
                    });
                }
                prevBtn.disabled = currentPage === 1;
                nextBtn.disabled = currentPage === totalPages;
                prevBtn.classList.toggle('opacity-40', prevBtn.disabled);
                nextBtn.classList.toggle('opacity-40', nextBtn.disabled);
                
                // Reset scroll to top on page change
                window.scrollTo({ top: 0, behavior: 'smooth' });

                if (tableScrollWrap) tableScrollWrap.scrollTo({ top: 0, behavior: 'auto' });
                bindAssessmentSubjectLinks();
            }

            filter?.addEventListener('change', () => {
                currentPage = 1;
                // Visual refresh feedback
                if (body) body.style.opacity = '0.5';
                if (sigmaPanel) sigmaPanel.style.opacity = '0.5';
                if (todoPanel) todoPanel.style.opacity = '0.5';

                setTimeout(() => {
                    renderAssessmentPageRows();
                    if (body) body.style.opacity = '1';
                    if (sigmaPanel) sigmaPanel.style.opacity = '1';
                    if (todoPanel) todoPanel.style.opacity = '1';
                }, 100);
            });

            prevBtn?.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage -= 1;
                    renderAssessmentPageRows();
                }
            });

            nextBtn?.addEventListener('click', () => {
                const totalPages = Math.max(1, Math.ceil(getFilteredRows().length / pageSize));
                if (currentPage < totalPages) {
                    currentPage += 1;
                    renderAssessmentPageRows();
                }
            });

            renderAssessmentPageRows();

        }
        catch (error) {
            console.error('Failed to render assessments page:', error);
            layout.innerHTML = `
                <div class="bg-white rounded-2xl border border-red-100 shadow-sm p-8">
                    <p class="text-[11px] font-black uppercase tracking-widest text-red-500">Assessments</p>
                    <h3 class="text-2xl font-black text-gray-900 mt-2">Assessment content could not load.</h3>
                    <p class="text-sm text-gray-500 mt-3">We hit a render error while building this page. The student script has been hardened, so after a refresh this section should recover instead of staying blank.</p>
                </div>
            `;
        }
    }


    let currentGradesView = 'overall';
    let currentGradesAnalyticsMode = 'terms';
    let gradesCarouselIndex = 0;
    function clampPercent(value) {
        return Math.max(0, Math.min(100, Math.round(value || 0)));

    }
    function getTopicAveragePercent(topic) {
        if (!topic?.grades) return null;
        const values = ['quiz', 'assignment', 'activity', 'performance']

            .map(key => topic.grades[key])

            .filter(value => typeof value === 'number' && value > 0);
        if (!values.length) return null;
        return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

    }
    function getSubjectGradeRows() {
        return subjectsData.enrolled.map(subject => {
            const data = getTopicData(subject.id) || subject;
            
            const calculateTermAverage = (topics, fallbackPercent) => {
                const topicAverages = (topics || [])
                    .map(getTopicAveragePercent)
                    .filter(value => value !== null);
                
                return clampPercent(topicAverages.length
                    ? topicAverages.reduce((sum, value) => sum + value, 0) / topicAverages.length
                    : (fallbackPercent || 0));
            };

            const term1 = calculateTermAverage(data.q1Topics, data.q1Percent || subject.q1Percent);
            const term2 = calculateTermAverage(data.q2Topics, data.q2Percent || subject.q2Percent);
            const term3 = calculateTermAverage(data.q3Topics, data.q3Percent || subject.q3Percent);
            const term4 = calculateTermAverage(data.q4Topics, data.q4Percent || subject.q4Percent);

            const overall = clampPercent((term1 + term2 + term3 + term4) / 4);
            const completedTopics = ['q1Topics', 'q2Topics', 'q3Topics', 'q4Topics'].reduce((count, key) => {
                return count + (data[key] || []).filter(topic => topic.status === 'completed').length;
            }, 0);
            const totalTopics = ['q1Topics', 'q2Topics', 'q3Topics', 'q4Topics'].reduce((count, key) => {
                return count + (data[key] || []).length;
            }, 0) || 1;
            const completion = clampPercent((completedTopics / totalTopics) * 100);

            const remark = overall >= 90 ? 'Outstanding'
                : overall >= 85 ? 'Very Good'
                : overall >= 80 ? 'Good'
                : overall >= 75 ? 'Passing'
                : 'At Risk';

            return {
                id: subject.id,
                subject: getSubjectDisplayName(subject),
                teacher: subject.instructor || 'Subject Teacher',
                track: getSubjectDisplaySubtitle(subject),
                term1,
                term2,
                term3,
                term4,
                overall,
                completion,
                remark
            };
        });
    }
    function renderGradesAnalytics(rows) {
        if (!rows || !rows.length) return '';
        // Sort a copy so we don't mutate the original array used by the table

        const sorted = rows.slice().sort((a, b) => b.overall - a.overall);
        const gwa = rows.reduce((sum, r) => sum + r.overall, 0) / rows.length;
        const scoreColorClass = value => value >= 90 ? 'text-green-600' : value >= 80 ? 'text-icc' : value >= 75 ? 'text-amber-600' : 'text-red-500';
        const barColorClass = value => value >= 90 ? 'bg-green-500' : value >= 80 ? 'bg-icc' : value >= 75 ? 'bg-amber-400' : 'bg-red-400';
        // Build subject cards using string concat to avoid nested template literal issues

        let subjectCards = '';

        rows.forEach(function (row) {

            // Fetch all assessments for this subject to get individual scores

            const allAssessments = [];

            ['Assignment', 'Quiz', 'Activity', 'Performance Task'].forEach(cat => {

                const assessments = getAssessmentsForSubject(row.id, cat);

                assessments.forEach(a => {

                    const score = parseInt(a.score) || 0;
                    let total = parseInt(a.total) || 100;
                    allAssessments.push((score / total) * 100);
                });
            });

            // Calculate SVG points
            const graphWidth = 180;
            const leftOffset = 30;
            const bottomY = 120;
            const topY = 10;
            const h = bottomY - topY; // 110 units height

            // Use quarterly averages (restored the 0-baseline as requested)
            const chartValues = [0, row.term1, row.term2, row.term3, row.term4];
            
            const points = chartValues.map((val, i) => {
                const x = (i / (chartValues.length - 1)) * graphWidth + leftOffset;
                const y = bottomY - (val / 100 * h);
                return { x, y };
            });

            // Generate a smooth cubic bezier path
            let pathD = `M ${points[0].x},${points[0].y}`;
            for (let i = 0; i < points.length - 1; i++) {
                const p0 = points[i];
                const p1 = points[i + 1];
                const cp1x = p0.x + (p1.x - p0.x) / 2;
                pathD += ` C ${cp1x},${p0.y} ${cp1x},${p1.y} ${p1.x},${p1.y}`;
            }

            const fillPath = `${pathD} L 210,${bottomY} L 30,${bottomY} Z`;

            const strokeColor = row.overall >= 90 ? '#16a34a' : row.overall >= 80 ? '#15803d' : row.overall >= 75 ? '#d97706' : '#ef4444';
            const maxVal = Math.max(row.term1, row.term2, row.term3, row.term4);
            const maxIdx = [row.term1, row.term2, row.term3, row.term4].indexOf(maxVal);
            const maxTermLabel = `Q${maxIdx + 1}`;

            const svgTrend = `
                <div class="flex items-end gap-3 mt-auto">
                    <div class="flex-grow">
                        <div class="relative h-[120px] w-full">
                            <svg viewBox="0 0 240 130" class="w-full h-full overflow-visible">
                                <defs>
                                    <linearGradient id="grad-${row.id}" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" style="stop-color:${strokeColor};stop-opacity:0.1" />
                                        <stop offset="100%" style="stop-color:${strokeColor};stop-opacity:0" />
                                    </linearGradient>
                                </defs>

                                <g fill="#000000" font-size="6" font-weight="900" text-anchor="end" font-family="'Inter'">
                                    ${[100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0].map(v => {
                                        const y = bottomY - (v / 100 * h) + 2; 
                                        return `<text x="25" y="${y}">${v}</text>`;
                                    }).join('')}
                                </g>

                                ${[100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0].map(v => {
                                    const y = bottomY - (v / 100 * h);
                                    return `<line x1="30" y1="${y}" x2="220" y2="${y}" stroke="#f1f5f9" stroke-width="0.5" />`;
                                }).join('')}

                                <path d="${fillPath}" fill="url(#grad-${row.id})" stroke="none" />
                                <path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                                
                                ${points.map((p, i) => `
                                    <circle cx="${p.x}" cy="${p.y}" r="2" fill="white" stroke="${strokeColor}" stroke-width="1.5" />
                                `).join('')}
                            </svg>
                        </div>
                        <div class="flex justify-between mt-3 pl-[35px] pr-[15px] text-[8px] font-bold text-black uppercase tracking-widest">
                            <span>Q1</span>
                            <span>Q2</span>
                            <span>Q3</span>
                            <span>Q4</span>
                        </div>
                    </div>
                    
                    <div class="flex flex-col justify-center gap-0.5 min-w-[50px] border-l border-gray-100 pl-4 mb-4">
                        <span class="text-[7px] font-black text-gray-400 uppercase tracking-wider">Highest</span>
                        <div class="flex items-baseline gap-1">
                            <span class="text-sm font-black text-black">${maxVal}</span>
                            <span class="text-[8px] font-bold text-gray-400">${maxTermLabel}</span>
                        </div>
                    </div>
                </div>
            `;

            subjectCards += '<div class="subject-performance-card bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 font-[\'Inter\'] group flex flex-col justify-between h-[220px]">'
                + '<div class="flex justify-between items-start font-[\'Inter\']">'
                + '<div class="flex-grow pr-2">'
                + '<h4 class="text-sm font-bold text-icc leading-tight font-[\'Inter\']">' + row.subject + '</h4>'
                + '</div>'
                + '<div class="text-xl font-black ' + scoreColorClass(row.overall) + ' font-[\'Inter\'] flex-shrink-0">' + row.overall + '</div>'
                + '</div>'
                + '<div class="grade-mini-chart font-[\'Inter\'] h-auto block">' + svgTrend + '</div>'
                + '</div>';

        });
        return {
            top: `
            <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div class="lg:col-span-1 gwa-card rounded-[32px] p-8 flex flex-col justify-between shadow-lg font-['Inter']">
                    <div class="font-['Inter']">
                        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-white font-['Inter']">General Weighted Average</p>
                        <h2 class="gwa-value mt-4 font-['Inter']">${gwa.toFixed(1)}</h2>
                    </div>
                </div>

                <div class="lg:col-span-3 bg-white rounded-[32px] border border-gray-100 p-6 shadow-sm flex flex-col justify-center gap-4 font-['Inter']">
                    <div class="flex items-center gap-2 font-['Inter']">
                        <div class="w-8 h-8 bg-icc-yellow rounded-lg flex items-center justify-center shadow-md flex-shrink-0 font-['Inter']">
                            <i class="fa-solid fa-bolt text-black text-sm"></i>
                        </div>
                        <span class="text-xs font-bold uppercase tracking-[0.25em] text-gray-900 font-['Inter']">SIGMA</span>
                    </div>

                    <div class="bg-gray-50 rounded-2xl rounded-tl-sm px-5 py-4 border border-gray-100 font-['Inter']">
                        <p class="text-sm text-gray-700 font-medium leading-relaxed font-['Inter']">
                            Hi <span class="font-bold text-gray-900">User</span>! You're currently enrolled in <span class="text-icc font-bold">${rows.length} subjects</span>.
                            Your strongest subject this quarter is <span class="text-icc font-bold">${sorted[0] ? sorted[0].subject : ' '}</span> great work!
                            Keep pushing across all four quarters and you're on track for an excellent GWA.
                        </p>
                    </div>
                </div>
            </div>
            `,
            breakdown: `
            <div class="font-['Inter']">
                <div class="flex items-center justify-between mb-6 px-2 font-['Inter']">
                    <h3 class="text-xl font-bold text-gray-900 font-['Inter']">Performance</h3>
                    <div class="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest font-['Inter']">
                        <span class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-icc"></div> Q1-Q4 Trend</span>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                    ${subjectCards}
                </div>
            </div>
            `
        };

    }
    function renderGradesPage() {
        const layout = document.getElementById('grades-layout');
        if (!layout) return;
        try {
            const rows = getSubjectGradeRows();
            const termButtonClass = view => currentGradesView === view

                ? 'bg-icc text-white border-icc'

                : 'bg-white text-gray-500 border-gray-200 hover:border-icc hover:text-icc';
            const scoreColorClass = value => value >= 90

                ? 'text-green-600'

                : value >= 80

                    ? 'text-icc'

                    : value >= 75

                        ? 'text-amber-600'

                        : 'text-red-500';
            const remarkBadge = remark => {
                if (remark === 'Outstanding') return 'bg-green-100 text-green-700';
                if (remark === 'Very Good') return 'bg-emerald-50 text-emerald-700';
                if (remark === 'Good') return 'bg-blue-50 text-blue-700';
                if (remark === 'Passing') return 'bg-amber-50 text-amber-700';
                return 'bg-red-100 text-red-600';

            };



            const analytics = renderGradesAnalytics(rows);

            layout.innerHTML = `

            <div class="space-y-8 font-['Inter']">

                <!-- Analytics Top -->

                ${analytics.top}



                <div class="overflow-x-auto font-['Inter']">

                        <table class="w-full text-left border-collapse font-['Inter']">

                            <thead>

                                <tr class="bg-gray-50/60">

                                    <th class="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest">Subject</th>

                                    <th class="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest">Teacher</th>

                                    <th class="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest text-center ${currentGradesView === 'term1' ? 'text-icc' : ''}">1st Quarter</th>

                                    <th class="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest text-center ${currentGradesView === 'term2' ? 'text-icc' : ''}">2nd Quarter</th>

                                    <th class="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest text-center ${currentGradesView === 'term3' ? 'text-icc' : ''}">3rd Quarter</th>

                                    <th class="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest text-center ${currentGradesView === 'term4' ? 'text-icc' : ''}">4th Quarter</th>

                                    <th class="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest text-center ${currentGradesView === 'overall' ? 'text-icc' : ''}">Overall</th>

                                </tr>

                            </thead>

                            <tbody class="divide-y divide-gray-50">

                                ${rows.map((row, i) => `

                                    <tr class="hover:bg-gray-50/60 transition-colors ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}">

                                        <td class="px-6 py-5">

                                            <button type="button" class="grade-subject-link text-left" data-subject-id="${row.id}">

                                                <span class="block text-sm font-bold text-icc hover:text-icc-dark hover:underline transition-colors">${row.subject}</span>

                                                <span class="block text-[11px] text-gray-500 mt-1 font-medium capitalize tracking-normal">${row.track.toLowerCase()}</span>

                                            </button>

                                        </td>

                                        <td class="px-6 py-5">

                                            <span class="text-xs font-semibold text-gray-700">${row.teacher}</span>

                                        </td>

                                        <td class="px-6 py-5 text-center">

                                            <span class="text-sm font-bold ${scoreColorClass(row.term1)}">${row.term1}</span>

                                        </td>

                                        <td class="px-6 py-5 text-center">

                                            <span class="text-sm font-bold ${scoreColorClass(row.term2)}">${row.term2}</span>

                                        </td>

                                        <td class="px-6 py-5 text-center">

                                            <span class="text-sm font-bold ${scoreColorClass(row.term3)}">${row.term3}</span>

                                        </td>

                                        <td class="px-6 py-5 text-center">

                                            <span class="text-sm font-bold ${scoreColorClass(row.term4)}">${row.term4}</span>

                                        </td>

                                        <td class="px-6 py-5 text-center">

                                            <span class="text-base font-bold ${scoreColorClass(row.overall)}">${row.overall}</span>

                                        </td>

                                    </tr>

                                `).join('')}

                            </tbody>

                        </table>

                </div>



                <!-- Subject Breakdown (Moved Below Table) -->

                ${analytics.breakdown}

            </div>

            `;



            layout.querySelectorAll('.grade-view-tab').forEach(button => {

                button.addEventListener('click', () => {

                    currentGradesView = button.dataset.gradeView;

                    renderGradesPage();

                });

            });



            layout.querySelectorAll('.grade-subject-link').forEach(button => {

                button.addEventListener('click', event => {

                    event.preventDefault();

                    event.stopPropagation();

                    scrollToSubjectCard(button.dataset.subjectId);

                });

            });
            //   Carousel init  

            const carousel = layout.querySelector('#grade-subject-carousel');
            if (carousel) {
                const track = carousel.querySelector('.grade-carousel-track');
                const dots = carousel.querySelectorAll('.grade-carousel-dot');
                const prevBtn = carousel.querySelector('.grade-carousel-prev');
                const nextBtn = carousel.querySelector('.grade-carousel-next');
                const totalSlides = rows.length;
                function updateCarousel() {

                    track.style.transform = 'translateX(-' + (gradesCarouselIndex * 100) + '%)';

                    dots.forEach(function (dot, i) {
                        if (i === gradesCarouselIndex) {

                            dot.style.background = '#15803d';

                            dot.style.width = '24px';

                            dot.style.borderRadius = '9999px';

                        }
                        else {

                            dot.style.background = '#e2e8f0';

                            dot.style.width = '8px';

                        }

                    });

                    prevBtn.style.opacity = totalSlides <= 1 ? '0.3' : '1';

                    nextBtn.style.opacity = totalSlides <= 1 ? '0.3' : '1';

                }



                prevBtn.addEventListener('click', function () {

                    gradesCarouselIndex = (gradesCarouselIndex - 1 + totalSlides) % totalSlides;

                    updateCarousel();

                });



                nextBtn.addEventListener('click', function () {

                    gradesCarouselIndex = (gradesCarouselIndex + 1) % totalSlides;

                    updateCarousel();

                });



                dots.forEach(function (dot, i) {

                    dot.addEventListener('click', function () {

                        gradesCarouselIndex = i;

                        updateCarousel();

                    });

                });
                // Clamp index in case subject count changed

                if (gradesCarouselIndex >= totalSlides) gradesCarouselIndex = 0;

                updateCarousel();

            }

        }
        catch (error) {

            console.error('Failed to render grades page:', error);

            layout.innerHTML = `

                <div class="bg-white rounded-2xl border border-red-100 shadow-sm p-8">

                    <p class="text-[11px] font-black uppercase tracking-widest text-red-500">Grades</p>

                    <h3 class="text-2xl font-black text-gray-900 mt-2">Grade content could not load.</h3>

                    <p class="text-sm text-gray-500 mt-3">We hit a render error while building this page. The student script has been hardened, so after a refresh this section should recover instead of staying blank.</p>

                </div>

            `;

        }

    }
    //   Calendar Logic (Admin Copy)  

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
        for (let i = 0; i < firstDay; i++) html += '<div></div>';
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const baseClasses = "w-9 h-9 flex items-center justify-center text-[12px] font-bold transition-all cursor-pointer rounded-full mx-auto";
            const stateClasses = isToday ? "bg-[#15803d] text-white" : "text-black hover:bg-slate-100";

            html += `<div class="${baseClasses} ${stateClasses}">${day}</div>`;

        }

        daysGrid.innerHTML = html;

    }
    const dailySchedule = [
        { time: '08:00', endTime: '09:30', subject: 'Effective Communication', room: 'Room 201' },
        { time: '10:00', endTime: '11:30', subject: 'General Mathematics', room: 'Room 305' },
        { time: '13:00', endTime: '14:30', subject: 'Intro to Computing', room: 'Lab 1' }
    ];
    const upcomingAssessmentItems = [
        { title: 'Quiz 3   Effective Communication', when: 'Due Today   11:59 PM', status: 'Due' },
        { title: 'Lab 2   Intro to Computing', when: 'May 5   10:00 AM', status: 'Upcoming' },
        { title: 'Assignment 1   General Math', when: 'May 6   3:00 PM', status: 'Upcoming' }
    ];
    function timeToMinutes(value) {
        if (!value) return 0;
        const [hour, minute] = value.split(':').map(Number);
        return (hour * 60) + minute;
    }
    function getUpcomingClasses(limit = 2) {
        if (typeof getStudentUpcomingSectionClasses === 'function') {
            const sectionClasses = getStudentUpcomingSectionClasses(limit);
            if (sectionClasses.length) return sectionClasses;
        }
        if (!dailySchedule.length) return [];
        const now = new Date();
        const nowMinutes = (now.getHours() * 60) + now.getMinutes();
        const sorted = [...dailySchedule].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
        const startIndex = sorted.findIndex(item => timeToMinutes(item.time) >= nowMinutes);
        const initialIndex = startIndex >= 0 ? startIndex : 0;
        const result = [];
        for (let i = 0; i < Math.min(limit, sorted.length); i += 1) {
            result.push(sorted[(initialIndex + i) % sorted.length]);
        }
        return result;
    }
    function getTopicData(subjectId) {
        return curriculumTopicCatalog[subjectId] || dynamicCurriculumSubjects[subjectId] || subjectDetails?.[subjectId] || null;
    }
    function getTopicSubject(subjectId) {
        const programSubjects = [];
        Object.values(curriculumPrograms).forEach(p => {
            if (p.subjects) programSubjects.push(...p.subjects);
            if (p.stages) programSubjects.push(...p.stages);
        });
        const exactMatch = programSubjects.find(s => (s.id === subjectId || s.key === subjectId));
        if (exactMatch) return exactMatch;
        if (curriculumTopicCatalog[subjectId]) {
            return { id: subjectId, title: curriculumTopicCatalog[subjectId].text, ...curriculumTopicCatalog[subjectId] };
        }
        if (subjectDetails?.[subjectId]) {
            return { id: subjectId, text: subjectDetails[subjectId].text || subjectDetails[subjectId].title || 'Subject', ...subjectDetails[subjectId] };
        }
        // Check clusters
        for (const p of Object.values(curriculumPrograms)) {
            if (p.clusters) {
                for (const cluster of p.clusters) {
                    const titleMatch = (cluster.subjects || []).find(t => `gen-${slugify(t)}` === subjectId);
                    if (titleMatch) return ensureSubjectDataForTitle(titleMatch, cluster.title);
                }
            }
        }
        return dynamicCurriculumSubjects[subjectId] || null;
    }
    function ensureSubjectDataForTitle(title, clusterTitle) {
        const subjectId = `gen-${slugify(title)}`;
        if (!dynamicCurriculumSubjects[subjectId]) {
            // Generate deterministic but unique-ish progress for each subject
            const seed = (title.length * 7) % 100;
            const q1 = 65 + (seed % 30);
            const q2 = 20 + (seed % 40);

            dynamicCurriculumSubjects[subjectId] = {
                id: subjectId,
                text: title,
                subtitle: `${clusterTitle} â€¢ Grade 11`,
                instructor: 'Cluster Faculty',
                icon: 'fa-solid fa-book-open',
                bg: 'image/book1.jpg',
                q1Percent: q1,
                q2Percent: q2,
                q3Percent: 0,
                q4Percent: 0,
                summary: `${title} is part of the ${clusterTitle} cluster and introduces the essential ideas, skills, and outputs learners will study in this learning path.`,
                q1Topics: [
                    { title: `Module 1: Introduction to ${title}`, status: 'completed', grades: { quiz: 85 + (seed % 10), assignment: 90, activity: 88, performance: 92 } },
                    { title: `Module 2: Core Concepts and Principles`, status: 'completed', grades: { quiz: 82 + (seed % 15), assignment: 85, activity: 87, performance: 88 } },
                    { title: `Module 3: Specialized Applications`, status: 'in-progress', grades: { quiz: 0, assignment: 80 + (seed % 5), activity: 0, performance: 0 } },
                    { title: `Module 4: Practical Evaluation`, status: 'not-started', grades: null }
                ],
                q2Topics: [
                    { title: `Module 5: Advanced ${title} Techniques`, status: seed > 30 ? 'completed' : 'not-started', grades: seed > 30 ? { quiz: 80 + (seed % 12), assignment: 83, activity: 81, performance: 85 } : null },
                    { title: `Module 6: Applied Case Studies`, status: 'not-started', grades: null },
                    { title: `Module 7: Research and Analysis`, status: 'not-started', grades: null }
                ],
                q3Topics: [
                    { title: `Module 8: Professional Practice`, status: 'not-started', grades: null },
                    { title: `Module 9: Industry Standards`, status: 'not-started', grades: null }
                ],
                q4Topics: [
                    { title: `Module 10: Capstone Project`, status: 'not-started', grades: null },
                    { title: `Module 11: Final Portfolio`, status: 'not-started', grades: null }
                ]
            };
        }
        return dynamicCurriculumSubjects[subjectId];
    }
    function slugify(text) {
        return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }
    function setSubjectsPageScrollLocked(locked) {
        // Standardize: Main scrollbar should always be visible/available
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
    }
    function getInlineAnchor(programKey) {
        return 'left';
    }
    function getElectiveMode() {
        if (currentStudentCurriculumLabel === 'K to 12 Curriculum') return 'k12';
        if (currentStudentCurriculumLabel === 'MATATAG Curriculum') return 'matatag';
        return 'default';
    }
    function buildElectiveTrackSections() {
        const program = curriculumPrograms['applied-subjects'];
        if (!program) return [];
        const mode = getElectiveMode();
        const trackMap = new Map();
        if (mode === 'k12') {
            (program.k12Groups || []).forEach(group => {
                if (!trackMap.has(group.track)) trackMap.set(group.track, []);
                const items = trackMap.get(group.track);
                const sourceClusters = (program.clusters || []).filter(cluster => (group.sourceKeys || []).includes(cluster.key));

                sourceClusters.forEach(cluster => {
                    (cluster.subjects || []).forEach(title => {
                        const subject = ensureSubjectDataForTitle(title, group.title);
                        items.push({
                            kind: 'subject',
                            id: subject.id,
                            title,
                            copy: subject.summary || `${title} is one of the elective subjects under ${group.title}.`,
                            media: subject.bg || group.image || program.image,
                            meta: group.title,
                            aiInsight: subject.summary || `${title} belongs to ${group.title} under ${group.track}.`,
                            progress: 0
                        });
                    });
                });
            });
        }
        else {
            (program.clusters || []).forEach(cluster => {
                if (!trackMap.has(cluster.track)) trackMap.set(cluster.track, []);
                const items = trackMap.get(cluster.track);
                (cluster.subjects || []).forEach(title => {
                    const subject = ensureSubjectDataForTitle(title, cluster.title);
                    items.push({
                        kind: 'subject',
                        id: subject.id,
                        title,
                        copy: subject.summary || `${title} is one of the subjects under ${cluster.title}.`,
                        media: subject.bg || cluster.image || program.image,
                        meta: cluster.title,
                        aiInsight: subject.summary || `${title} belongs to ${cluster.title} under ${cluster.track}.`,
                        progress: 0
                    });
                });
            });
        }
        return Array.from(trackMap.entries()).map(([track, items]) => {
            const seen = new Set();
            return {
                title: track,
                items: items.filter(item => {
                    const key = `${track}:${item.title}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                })
            };
        });
    }
    function buildInlineItems(programKey) {
        const program = curriculumPrograms[programKey];
        if (!program) return [];
        if (program.subjects) {
            return program.subjects.map(item => {
                const subjectData = getTopicData(item.id) || {};
                return {
                    kind: 'subject',
                    id: item.id,
                    title: item.title,
                    copy: subjectData.summary || item.overview,
                    media: item.image,
                    meta: programKey === 'core-subjects' ? '' : (subjectData.subtitle || ''),
                    aiInsight: '',
                    progress: 0
                };
            });
        }
        if (program.clusters) {
            return program.clusters.map(item => ({
                kind: 'cluster',
                key: item.key,
                title: item.title,
                copy: item.overview,
                media: item.image || '',
                meta: `${item.track}   ${item.subjectCount} Subjects`
            }));
        }
        return [];
    }
    function buildTrackClusterSubjectItems(programKey, clusterKey) {
        if (programKey === 'applied-subjects') {
            const k12Group = (curriculumPrograms[programKey]?.k12Groups || []).find(group => group.key === clusterKey);
            if (k12Group) {
                const sourceClusters = (curriculumPrograms[programKey]?.clusters || []).filter(cluster => (k12Group.sourceKeys || []).includes(cluster.key));
                const seen = new Set();
                const titles = [];
                sourceClusters.forEach(cluster => {
                    (cluster.subjects || []).forEach(title => {
                        if (!seen.has(title)) {
                            seen.add(title);
                            titles.push(title);
                        }
                    });
                });
                return titles.map(title => {
                    const subject = ensureSubjectDataForTitle(title, k12Group.title);
                    return {
                        kind: 'subject',
                        id: subject.id,
                        title,
                        copy: subject.summary,
                        media: subject.bg,
                        progress: 0
                    };
                });
            }
        }
        return [];
    }
    function getProgressVisuals(progress) {
        if (progress >= 100) return { color: '#15803d', gradient: 'linear-gradient(to top, #15803d, #166534)' };
        if (progress >= 50) return { color: '#ca8a04', gradient: 'linear-gradient(to top, #ca8a04, #a16207)' };
        return { color: '#b91c1c', gradient: 'linear-gradient(to top, #b91c1c, #991b1b)' };
    }
    function askSigmaAbout(title, insight) {
        openAiPanel();
        addAiMessage(`Tell me about ${title}. ${insight}`, true);
        setSigmaAiWaiting(true);
        setTimeout(() => {
            setSigmaAiWaiting(false);
            addAiMessage(`SIGMA AI analysis for ${title}: This subject is an essential part of your curriculum, focusing on practical skills and foundational knowledge required for your chosen track.`);
        }, 1500);
    }
    function syncInlinePanelBackButtons() {
        // Implementation for syncing back buttons if needed
    }
    function handleInlineCardSelection(programKey, item) {
        if (item.kind === 'subject') {
            switchToTopicPage(item.id);
            return;
        }
        const subject = ensureSubjectDataForTitle(item.title, curriculumPrograms[programKey]?.title || 'Program');
        switchToTopicPage(subject.id);
    }
    function getSubjectDisplayName(subject) {
        if (!subject) return '';
        return subject.text || subject.title || '';
    }
    function getSubjectDisplaySubtitle(subject) {
        if (!subject) return '';
        return subject.subtitle || subject.kicker || '';
    }
    function formatAssessmentDate(date) {
        if (!date) return '-';
        const d = (date instanceof Date) ? date : new Date(date);
        if (isNaN(d.getTime())) return date;
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${dateStr}<br><span class="text-[9px] md:text-[10px] text-gray-500 font-medium">${timeStr}</span>`;
    }
    function scrollToSubjectCard(subjectId) {
        const subject = [...(subjectsData.enrolled || []), ...(subjectsData.completed || [])].find(item => item.id === subjectId);
        switchToTopicPage(resolveHomeSubjectTopicSourceId(subjectId, subject?.text));
    }
    function renderCalendarDropdownSummary() {
        const classesWrap = document.getElementById('calendarDropdownUpcomingClassList');
        const assessmentsWrap = document.getElementById('calendarDropdownAssessmentList');
        if (!classesWrap || !assessmentsWrap) return;

        // Removed as per request to hide Next Class, Upcoming Class, and Submissions in dropdown
        classesWrap.innerHTML = '';
        assessmentsWrap.innerHTML = '';
    }
    function initCalendarEvents() {
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

        renderCalendar();
        renderCalendarDropdownSummary();
        // Update header calendar icon date
        const dateEl = document.getElementById('calendar-date-number');
        if (dateEl) {
            dateEl.textContent = new Date().getDate();
        }
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
    function escapeSigmaAiText(value) {
        return String(value)

            .replace(/&/g, '&amp;')

            .replace(/</g, '&lt;')

            .replace(/>/g, '&gt;')

            .replace(/"/g, '&quot;')

            .replace(/'/g, '&#39;');

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
                .map(file => `  ${escapeSigmaAiText(file.name)} (${getSigmaAiFileKindLabel(file, isPhotoUpload)}   ${formatSigmaAiFileSize(file.size)})`)
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
                .map(file => `  ${escapeSigmaAiText(file.name)}`)
                .join('\n');
            addAiMessage(
                `Upload failed. Supported ${isPhotoUpload ? 'images' : 'documents'} only.\n${failedLines}`,
                false
            );
        }
        if (oversizedFiles.length) {
            const failedLines = oversizedFiles
                .map(file => `  ${escapeSigmaAiText(file.name)} (${formatSigmaAiFileSize(file.size)})`)
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
    function updateNotchPosition() {
        if (!sigmaAiNotch || !sigmaAiPanel) return;
        const isMobile = window.innerWidth < 1024;
        const isOpen = sigmaAiPanel.classList.contains('open');
        if (isMobile) {
            sigmaAiNotch.style.right = '0';
        }
        else {
            if (isOpen) {
                sigmaAiNotch.style.right = '400px';
            }
            else {
                sigmaAiNotch.style.right = '0';
            }
        }
    }
    function closeMobilePullUpSurfacesForAi() {
        if (window.innerWidth >= 1024) return;
        document.querySelectorAll('.mobile-pull-up-panel').forEach(panel => panel.classList.remove('open'));
        document.getElementById('mobile-sigma-sheet')?.classList.remove('open');
        document.getElementById('mobile-sigma-sheet-backdrop')?.classList.remove('open');
        window.updateMobileAppBarActiveState?.();
    }
    window.__pushMobileOverlayHistory = window.__pushMobileOverlayHistory || function (kind) {
        if (window.innerWidth >= 1024) return;
        if (history.state?.mobileOverlay === kind) return;
        history.pushState({ ...(history.state || {}), mobileOverlay: kind }, '', window.location.href);
    };
    window.__hasOpenMobileOverlay = window.__hasOpenMobileOverlay || function () {
        return window.innerWidth < 1024 && Boolean(
            document.getElementById('sigmaAiPanel')?.classList.contains('open') ||
            document.getElementById('mobile-sigma-sheet')?.classList.contains('open') ||
            document.querySelector('.mobile-pull-up-panel.open')
        );
    };
    window.__closeOpenMobileOverlay = window.__closeOpenMobileOverlay || function () {
        document.getElementById('sigmaAiPanel')?.classList.remove('open');
        document.getElementById('sigmaAiNotch')?.classList.remove('open');
        document.getElementById('mobile-sigma-sheet')?.classList.remove('open');
        document.querySelectorAll('.mobile-pull-up-panel').forEach(panel => panel.classList.remove('open'));
        document.getElementById('mobile-sigma-sheet-backdrop')?.classList.remove('open');
        window.updateMobileAppBarActiveState?.();
    };
    window.__closeMobileSidebarForOverlay = window.__closeMobileSidebarForOverlay || function () {
        if (window.innerWidth >= 1024) return;
        document.getElementById('sidebar')?.classList.remove('sidebar-visible');
        document.getElementById('sub-sidebar')?.classList.remove('sub-sidebar-visible');
    };
    window.addEventListener('popstate', event => {
        if (!window.__hasOpenMobileOverlay?.()) return;
        window.__closeOpenMobileOverlay?.();
        event.stopImmediatePropagation();
    }, true);
    function openAiPanel() {
        closeMobilePullUpSurfacesForAi();
        window.__closeMobileSidebarForOverlay?.();
        window.__pushMobileOverlayHistory?.('sigma-ai');
        sigmaAiPanel.classList.add('open');
        sigmaAiNotch.classList.add('open');
        updateNotchPosition();
        sessionStorage.setItem('sigmaPanelOpen', 'true');
    }
    function closeAiPanel() {
        sigmaAiPanel.classList.remove('open');
        sigmaAiNotch.classList.remove('open');
        updateNotchPosition();
        closeAiAttachMenu();
        sessionStorage.setItem('sigmaPanelOpen', 'false');
    }
    window.addEventListener('resize', updateNotchPosition);
    updateNotchPosition();
    function hideHeaderOverlays(exceptMenu = null, exceptButton = null, keepAiOpen = false) {
        document.querySelectorAll('.header-panel').forEach(panel => {
            if (panel !== exceptMenu) panel.classList.add('hidden');

        });

        [calendarToggle, notiToggle, profileDropdownBtn].forEach(button => {
            if (button && button !== exceptButton) button.classList.remove('active');

        });
        if (!keepAiOpen) {

            closeAiPanel();

            closeAiAttachMenu();

        }

    }
    function handleNotchInteraction(e) {

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
                if (currentRight < -200) {

                    openAiPanel();

                }
                else {

                    closeAiPanel();

                }

            }
            else {

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

        setSigmaAiWaiting(true);

        setTimeout(() => {

            addAiMessage('Wireframe mode   Gemini AI coming next semester.', false);

            setSigmaAiWaiting(false);

        }, 600);

    }
    if (sigmaAiSendBtn) sigmaAiSendBtn.addEventListener('click', sendAiMessage);
    if (sigmaAiCloseBtn) sigmaAiCloseBtn.addEventListener('click', closeAiPanel);
    if (sigmaAiInput) sigmaAiInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') sendAiMessage();
    });
    const isFirstVisit = sessionStorage.getItem('sigmaFirstVisit') !== 'true';
    const panelWasOpen = sessionStorage.getItem('sigmaPanelOpen') === 'true';
    if (isFirstVisit) {

        sessionStorage.setItem('sigmaFirstVisit', 'true');

        setTimeout(() => {

            addAiMessage(WELCOME_MSG, false);

        }, 900);

    }
    else {

        addAiMessage(WELCOME_MSG, false);

    }
    // Ensure all header overlays are hidden on load

    hideHeaderOverlays(null, null, false);
    // if (panelWasOpen) openAiPanel();
    //   Sub-Sidebar (Subjects list)  

    function resetCompactSubSidebar(content, title, header) {
        if (!content) return;
        if (title) title.innerHTML = '';
        if (header) header.classList.add('hidden');

        content.style.paddingTop = '8px';

        content.innerHTML = '';

    }
    function updateSubSidebar(tabId) {
        const content = document.getElementById('sub-sidebar-content');
        const title = document.getElementById('sub-sidebar-title');
        const header = document.getElementById('sub-sidebar-header');
        if (!content) return;
        // Hide header on subjects list   no redundancy

        if (header) header.classList.add('hidden');

        content.innerHTML = '';

    }
    function renderCurriculumSidebar(programKey) {
        const content = document.getElementById('sub-sidebar-content');
        const title = document.getElementById('sub-sidebar-title');
        const header = document.getElementById('sub-sidebar-header');
        if (!content) return;
        // Hide header and reset content

        if (header) header.classList.add('hidden');

        content.style.paddingTop = '';

        content.innerHTML = '';
        // Set the title to "Subjects"

        if (title) {

            title.innerHTML = 'Subjects';

        }
        // Create subjects list with only Core Subjects

        const subjectsContainer = document.createElement('div');

        subjectsContainer.className = 'px-2 pb-3 space-y-1';
        // Core Subjects section only

        const coreSection = document.createElement('div');

        coreSection.className = 'mb-3';

        coreSection.innerHTML = `

            <div class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Core Subjects</div>

        `;



        subjectsContainer.appendChild(coreSection);
        // No click handlers needed - headers are display only



        content.appendChild(subjectsContainer);

    }
    function renderTopicContentsSidebar(subjectId, topicIdx, tab) {
        const content = document.getElementById('sub-sidebar-content');
        const title = document.getElementById('sub-sidebar-title');
        const header = document.getElementById('sub-sidebar-header');
        if (!content) return;
        // Hide header and reset content

        if (header) header.classList.add('hidden');

        content.style.paddingTop = '';

        content.innerHTML = '';
        // Set the title to "Contents"

        if (title) {

            title.innerHTML = 'Contents';

        }
        // Get topic data

        const sourceId = subjectId;
        const data = getTopicData(sourceId);
        if (!data || !data.q1Topics || !data.q1Topics[topicIdx]) return;
        const topic = data.q1Topics[topicIdx];
        // Create contents container

        const contentsContainer = document.createElement('div');

        contentsContainer.className = 'px-2 pb-3 space-y-1';
        // Add content items based on the current tab

        const contentItems = [];
        // Add Videos

        if (topic.videos && topic.videos.length > 0) {

            contentItems.push({

                title: 'Videos',

                icon: 'fa-play-circle',

                count: topic.videos.length,

                active: tab === 'videos'

            });

        }
        // Add Handouts

        if (topic.handouts && topic.handouts.length > 0) {

            contentItems.push({

                title: 'Handouts',

                icon: 'fa-file-pdf',

                count: topic.handouts.length,

                active: tab === 'handouts'

            });

        }
        // Add Activities

        if (topic.activities && topic.activities.length > 0) {

            contentItems.push({

                title: 'Activities',

                icon: 'fa-flask',

                count: topic.activities.length,

                active: tab === 'activities'

            });

        }
        // Add Assignments

        if (topic.assignments && topic.assignments.length > 0) {

            contentItems.push({

                title: 'Assignments',

                icon: 'fa-file-pen',

                count: topic.assignments.length,

                active: tab === 'assignments'

            });

        }
        // Add Quiz

        if (topic.quiz) {

            contentItems.push({

                title: 'Quiz',

                icon: 'fa-square-poll-vertical',

                count: 1,

                active: tab === 'quiz'

            });

        }
        // Add Performance Tasks

        if (topic.performanceTasks && topic.performanceTasks.length > 0) {

            contentItems.push({

                title: 'Performance Tasks',

                icon: 'fa-star',

                count: topic.performanceTasks.length,

                active: tab === 'performance'

            });

        }
        // Create buttons for each content item

        contentItems.forEach(item => {
            const contentBtn = document.createElement('button');

            contentBtn.className = `sub-sidebar-link w-full text-left px-4 py-2.5 text-[12px] font-bold text-gray-700 hover:bg-gray-100 rounded-lg transition-all flex items-center gap-3 ${item.active ? 'active' : ''}`;

            contentBtn.innerHTML = `

                <i class="fas ${item.icon} ${item.active ? 'text-yellow-500' : 'text-gray-400'}"></i>

                <span>${item.title}</span>

                <span class="ml-auto text-xs ${item.active ? 'text-black' : 'text-gray-400'}">${item.count}</span>

            `;
            // Add click handler to navigate to content tab

            contentBtn.addEventListener('click', () => {

                openTopicContent(subjectId, topicIdx, item.title.toLowerCase());

            });



            contentsContainer.appendChild(contentBtn);

        });
        // If no content available

        if (contentItems.length === 0) {
            const emptyMsg = document.createElement('div');

            emptyMsg.className = 'px-4 py-8 text-center';

            emptyMsg.innerHTML = `

                <i class="fas fa-folder-open text-3xl text-gray-300 mb-3 block"></i>

                <p class="text-xs text-gray-400 font-medium">No content available</p>

            `;

            contentsContainer.appendChild(emptyMsg);

        }



        content.appendChild(contentsContainer);

    }
    function renderTopicNamesSidebar(subjectId) {
        const content = document.getElementById('sub-sidebar-content');
        const title = document.getElementById('sub-sidebar-title');
        const header = document.getElementById('sub-sidebar-header');
        if (!content) return;
        // Hide header and reset content
        if (header) header.classList.add('hidden');
        content.style.paddingTop = '';
        content.innerHTML = '';
        // Set the title to "Topics"
        if (title) {
            title.innerHTML = 'Topics';
        }
        // Get topic data
        const data = getTopicData(subjectId);
        if (!data || !data.q1Topics) return;
        // Create topics container
        const topicsContainer = document.createElement('div');
        topicsContainer.className = 'px-2 pb-3 space-y-1';
        // Add each topic as a button
        data.q1Topics.forEach((topic, index) => {
            const topicBtn = document.createElement('button');
            topicBtn.className = 'sub-sidebar-link w-full text-left px-4 py-2.5 hover:bg-gray-100 rounded-lg transition-all flex items-center gap-3';

            let iconHtml = '<div class="w-4 h-4 rounded-full border border-gray-200"></div>';
            if (topic.status === 'completed') {
                iconHtml = '<i class="fa-solid fa-circle-check text-[#15803d] text-sm"></i>';
            } else if (topic.status === 'in-progress') {
                iconHtml = '<i class="fa-solid fa-circle-half-stroke text-black text-sm"></i>';
            }

            topicBtn.innerHTML = `
                <div class="flex-shrink-0 flex items-center justify-center w-4 h-4">
                    ${iconHtml}
                </div>
                <span class="text-[11px] font-bold text-black uppercase tracking-widest truncate">TOPIC ${index + 1}</span>
            `;
            // Add click handler to navigate to topic content
            topicBtn.addEventListener('click', () => {
                openTopicContent(subjectId, index, 'videos');
            });

            topicsContainer.appendChild(topicBtn);
        });

        content.appendChild(topicsContainer);
    }
    function openCurriculumProgram(programKey, pushState = true) {
        const program = curriculumPrograms[programKey];
        if (!program) return;
        // Keep elective subjects inside the existing panel flow (no separate curriculum page).

        if (programKey === 'applied-subjects') {

            _applyTab('nav-courses');
            // openInlineProgramFocus removed

            return;

        }
        if (programKey === 'specialized-subjects') {

            _applyTab('nav-courses');
            // openInlineProgramFocus removed

            return;

        }



        currentCurriculumProgram = programKey;

        currentCurriculumCluster = null;

        setSubjectsPanelsMode(false);

        setCurriculumMode(true);
        if (pushState) history.pushState({ page: `curriculum:${programKey}` }, '', `#${programKey}`);



        hideAllSections();

        showSection('section-curriculum-page');

        navLinks.forEach(l => l.classList.remove('bg-white/20'));
        document.getElementById('nav-courses')?.classList.add('bg-white/20');

        setNavContext(program.title);



        _hideSubSidebarInstant();

        updateLayout();

        renderCurriculumPage(programKey);
        window.scrollTo({ top: 0, behavior: 'smooth' });

    }
    window.openCurriculumProgram = openCurriculumProgram;
    function openCurriculumCluster(programKey, clusterKey, pushState = true) {
        const program = curriculumPrograms[programKey];
        const cluster = (program?.clusters || []).find(c => c.key === clusterKey) || (program?.stages || []).find(s => s.key === clusterKey);
        if (!program || !cluster) return;
        // Keep elective clusters inside the existing panel flow (no separate curriculum page).

        if (programKey === 'applied-subjects' || programKey === 'specialized-subjects') {

            _applyTab('nav-courses');
            // openInlineProgramFocus removed

            currentCurriculumCluster = clusterKey;
            // renderSubjectsInlineDetail removed

            syncInlinePanelBackButtons();
            if (pushState) {

                history.pushState({ page: `inline-cluster:${programKey}:${clusterKey}` }, '', `#subjects-${programKey}-${clusterKey}`);

            }
            return;

        }



        currentCurriculumProgram = programKey;

        currentCurriculumCluster = clusterKey;

        setSubjectsPanelsMode(false);

        setCurriculumMode(true);
        if (pushState) history.pushState({ page: `cluster:${programKey}:${clusterKey}` }, '', `#${programKey}-${clusterKey}`);



        hideAllSections();

        showSection('section-curriculum-page');

        navLinks.forEach(l => l.classList.remove('bg-white/20'));
        document.getElementById('nav-courses')?.classList.add('bg-white/20');

        setNavContext(cluster.title);



        _hideSubSidebarInstant();

        updateLayout();

        renderCurriculumPage(programKey, clusterKey);
        window.scrollTo({ top: 0, behavior: 'smooth' });

    }
    window.openCurriculumCluster = openCurriculumCluster;
    function renderCurriculumPage(programKey, clusterKey = null) {
        const shell = document.getElementById('curriculum-page-shell');
        const program = curriculumPrograms[programKey];
        if (!shell || !program) return;
        const currentCluster = clusterKey

            ? (program.clusters || program.stages || []).find(c => c.key === clusterKey)

            : null;
        const isSubjectPage = !!currentCluster || !!program.subjects;
        const items = currentCluster

            ? (currentCluster.subjects || currentCluster.requirements || []).map(item => typeof item === 'string' ? item : item.title)

            : (program.subjects || program.clusters || program.stages || []);
        const pageTitle = currentCluster ? currentCluster.title : program.title;
        const pageKicker = currentCluster ? (programKey === 'specialized-subjects' ? 'Stage Requirements' : 'Cluster Overview') : program.kicker;
        const pageOverview = currentCluster ? currentCluster.overview : program.overview;
        const image = currentCluster ? currentCluster.image : program.image;
        const hideHeroImage = !currentCluster && programKey === 'core-subjects';
        const cardHtml = currentCluster

            ? items.map((label, index) => `

                <article class="curriculum-subject-card" data-subject-title="${label}" data-cluster-title="${currentCluster.title}">

                    <h4 class="curriculum-subject-title">${label}</h4>

                    <p class="curriculum-subject-text">${programKey === 'specialized-subjects' ? 'Requirement ' + (index + 1) + ' for this stage.' : buildCurriculumCardText(programKey, label)}</p>

                </article>

            `).join('')

            : program.subjects

                ? items.map(item => {
                    const progress = Math.floor(Math.random() * 80) + 10;
                    return `

                    <article class="curriculum-subject-card curriculum-core-card horizontal-panel" data-subject-id="${item.id}">

                        <img src="${item.image}" alt="${item.title}" class="curriculum-cluster-image">

                        <div class="subject-info-col">

                            <h4 class="curriculum-subject-title">${item.title}</h4>

                            <p class="curriculum-subject-text">${item.overview}</p>

                        </div>

                        <div class="subject-progress-bar">

                            <div class="subject-progress-fill" style="width:${progress}%"></div>

                        </div>

                    </article>

                `;

                }).join('')

                : items.map(item => `

                    <article class="curriculum-subject-card curriculum-cluster-card curriculum-track-card" data-cluster-key="${item.key}">

                        <h4 class="curriculum-subject-title">${item.title}</h4>

                        <p class="curriculum-subject-text">${item.overview}</p>

                        <p class="text-[10px] font-black uppercase tracking-widest text-green-700 mt-auto">${programKey === 'specialized-subjects' ? 'Open Stage' : `${item.subjectCount} Subjects`}</p>

                    </article>

                `).join('');



        shell.innerHTML = `

            <div class="flex flex-col">

                <div class="curriculum-hero ${hideHeroImage ? 'curriculum-hero--no-image' : ''}">

                    ${hideHeroImage ? '' : `<img src="${image}" alt="${pageTitle}" class="curriculum-hero-image">`}

                    <div class="curriculum-hero-copy">

                        <h2 class="curriculum-hero-title">${pageTitle}</h2>

                    </div>

                </div>

                <div class="curriculum-subject-grid ${program.subjects ? 'core-horizontal-list' : ''} ${isSubjectPage && !program.subjects ? 'curriculum-subject-grid--list' : ''}">

                    ${cardHtml}

                </div>

            </div>

        `;
        if (currentCluster) {

            shell.querySelectorAll('.curriculum-subject-card[data-subject-title]').forEach(card => {

                card.addEventListener('click', () => {
                    const subject = ensureSubjectDataForTitle(card.dataset.subjectTitle, currentCluster.title);

                    switchToTopicPage(subject.id, subject.text);

                });

            });

        }
        else if (program.subjects) {

            shell.querySelectorAll('.curriculum-core-card[data-subject-id]').forEach(card => {

                card.addEventListener('click', () => switchToTopicPage(card.dataset.subjectId));

            });

        }
        else {

            shell.querySelectorAll('.curriculum-cluster-card[data-cluster-key]').forEach(card => {

                card.addEventListener('click', () => openCurriculumCluster(programKey, card.dataset.clusterKey));

            });

        }

    }
    window.addEventListener('resize', () => {
        const subjectsVisible = !document.getElementById('section-courses')?.classList.contains('hidden') && !currentCurriculumProgram;

        setSubjectsPanelsMode(subjectsVisible);

    });
    function buildCurriculumCardText(programKey, label) {
        const copy = {

            'core-subjects': {

                'Effective Communication': 'Focuses on communication models, speech contexts, speech acts, and writing and delivering effective speeches.',

                'Life and Career Skills': 'Covers self-assessment, career pathways, work readiness, financial literacy, and practical career planning.',

                'General Mathematics': 'Builds real-life math skills through functions, interest, loans, business math, and logic.',

                'General Science': 'Introduces earth systems, life processes, matter, energy, and scientific reasoning for everyday use.',

                'Pag-aaral ng Kasaysayan at Lipunang Pilipino': 'Explores Philippine society, governance, citizenship, history, and social change in local context.'

            }[label] || `This subject gives students a readable overview of the core learning area and the topics they will study across the shared curriculum foundation.`,

            'applied-subjects': `${label} is part of the applied pathway and may belong to either the Academic Track or the TechPro Track depending on the learner's assigned cluster and curriculum setup.`,

            'specialized-subjects': `${label} represents a staged work experience where students prepare, perform, and reflect on workplace-style tasks and outputs.`

        };
        return copy[programKey];

    }
    //   Sub-sidebar topic mode (no animation   instant swap)  

    function loadTopicSubSidebar(subject, data, statusIconClass, activeIdx = null) {
        const content = document.getElementById('sub-sidebar-content');
        const title = document.getElementById('sub-sidebar-title');
        const header = document.getElementById('sub-sidebar-header');
        if (!content) return;
        if (header) header.classList.remove('hidden');
        const subjectTitle = data.text || subject.name || subject.text || 'Topics';
        if (title) title.innerHTML = `<span class="truncate">${escapeHtml(subjectTitle)}</span>`;
        const q1Done = data.q1Topics.filter(t => t.status === 'completed').length;
        const q1Total = data.q1Topics.length;

        content.innerHTML = `
            <div class="px-2 pt-4 space-y-1 pb-4">
                ${data.q1Topics.map((t, i) => {
            const isActive = i === activeIdx;
            let iconHtml = '<i class="fa-regular fa-circle text-gray-300 text-sm"></i>';
            if (t.status === 'completed') {
                iconHtml = '<i class="fa-solid fa-circle-check text-green-500 text-sm"></i>';
            } else if (t.status === 'in-progress') {
                iconHtml = '<i class="fa-solid fa-circle-half-stroke text-yellow-500 text-sm"></i>';
            }

            return `
                        <button onclick="openTopicContent('${subject.id}', ${i})" class="topic-nav-item w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 group ${isActive ? 'active' : 'hover:bg-gray-50'}">
                            <div class="mt-1 flex-shrink-0">
                                ${iconHtml}
                            </div>
                            <div class="min-w-0">
                                <p class="text-[10px] font-black text-black uppercase tracking-widest mb-0.5">Topic ${i + 1}</p>
                                <p class="topic-nav-title text-[13px] font-bold leading-tight">${t.title}</p>
                            </div>
                        </button>
                    `;
        }).join('')}
            </div>
        `;
        // Nav items scroll to topic card in main content

        content.querySelectorAll('.topic-nav-item').forEach(item => {

            item.addEventListener('click', () => {
                const list = document.getElementById('q1-topics-list');
                const idx = parseInt(item.dataset.topicIdx);
                if (list?.children[idx]) {

                    list.children[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });

                }

            });

        });

    }















    // Nav items scroll to topic card in main content

    //   Subject Details  

    const subjectDetails = {

        'card-graphics': { bg: 'image/book7.jpg', q1Percent: 70, q2Percent: 0, q1Topics: [{ title: 'Design Principles', status: 'completed', grades: { quiz: 90, assignment: 88, activity: 94, performance: 91 } }, { title: 'Color Theory', status: 'completed', grades: { quiz: 88, assignment: 85, activity: 92, performance: 89 } }, { title: 'Typography Fundamentals', status: 'completed', grades: { quiz: 85, assignment: 82, activity: 88, performance: 86 } }, { title: 'Layout & Composition', status: 'in-progress', grades: { quiz: 0, assignment: 80, activity: 0, performance: 0 } }, { title: 'Digital Illustration', status: 'not-started', grades: null }] },

        'card-mobile': { bg: 'image/book8.jpg', q1Percent: 30, q2Percent: 0, q1Topics: [{ title: 'Mobile UI/UX Principles', status: 'completed', grades: { quiz: 88, assignment: 85, activity: 90, performance: 87 } }, { title: 'Flutter Basics', status: 'in-progress', grades: { quiz: 0, assignment: 72, activity: 0, performance: 0 } }, { title: 'Widgets & Layouts', status: 'not-started', grades: null }, { title: 'State Management', status: 'not-started', grades: null }] },

        'card-introcomp': { bg: 'image/book4.jpg', q1Percent: 100, q2Percent: 100, q1Topics: [{ title: 'History of Computing', status: 'completed', grades: { quiz: 95, assignment: 92, activity: 90, performance: 94 } }, { title: 'Computer Hardware Components', status: 'completed', grades: { quiz: 92, assignment: 90, activity: 88, performance: 91 } }, { title: 'Operating Systems Basics', status: 'completed', grades: { quiz: 90, assignment: 88, activity: 92, performance: 90 } }, { title: 'Software & Applications', status: 'completed', grades: { quiz: 88, assignment: 85, activity: 90, performance: 87 } }] },

        'card-oralcomm': { bg: 'image/book1.jpg', q1Percent: 100, q2Percent: 100, q1Topics: [{ title: 'Nature & Elements of Communication', status: 'completed', grades: { quiz: 88, assignment: 90, activity: 92, performance: 89 } }, { title: 'Models of Communication', status: 'completed', grades: { quiz: 85, assignment: 88, activity: 90, performance: 87 } }, { title: 'Communication Breakdown', status: 'completed', grades: { quiz: 82, assignment: 85, activity: 88, performance: 84 } }, { title: 'Types of Speech Context', status: 'completed', grades: { quiz: 90, assignment: 88, activity: 92, performance: 91 } }, { title: 'Types of Speech Act', status: 'completed', grades: { quiz: 88, assignment: 86, activity: 90, performance: 88 } }] },

        'card-genmath': { bg: 'image/book2.jpg', q1Percent: 100, q2Percent: 100, q1Topics: [{ title: 'Functions & Their Graphs', status: 'completed', grades: { quiz: 82, assignment: 80, activity: 85, performance: 83 } }, { title: 'Rational Functions', status: 'completed', grades: { quiz: 80, assignment: 78, activity: 82, performance: 80 } }, { title: 'Inverse Functions', status: 'completed', grades: { quiz: 78, assignment: 76, activity: 80, performance: 78 } }, { title: 'Exponential & Logarithmic Functions', status: 'completed', grades: { quiz: 75, assignment: 74, activity: 78, performance: 76 } }, { title: 'Simple & Compound Interest', status: 'completed', grades: { quiz: 85, assignment: 82, activity: 88, performance: 84 } }] },

        'card-animation': { bg: 'image/book3.jpg', q1Percent: 100, q2Percent: 100, q1Topics: [{ title: '12 Principles of Animation', status: 'completed', grades: { quiz: 92, assignment: 90, activity: 94, performance: 92 } }, { title: 'Animation Tools Overview', status: 'completed', grades: { quiz: 90, assignment: 88, activity: 92, performance: 90 } }, { title: 'Keyframing Basics', status: 'completed', grades: { quiz: 88, assignment: 85, activity: 90, performance: 88 } }, { title: 'Character Design Fundamentals', status: 'completed', grades: { quiz: 92, assignment: 90, activity: 95, performance: 93 } }] },

        'default-subject-placeholder': {

            text: 'Subject',

            subtitle: 'Strand/Cluster',

            instructor: 'Curriculum Placeholder',

            icon: 'fa-solid fa-book-open',

            bg: 'image/book6.jpg',

            q1Percent: 0,

            q2Percent: 0,

            summary: 'This subject is a placeholder while the actual elective subject records are still being connected.',

            q1Topics: [

                { title: 'Topic Lesson', status: 'not-started', grades: null }

            ]

        }

    };
    //   Topic Page  

    function switchToTopicPage(subjectId, activeTopicIdx = null) {
        const resolvedTopicIdx = Number.isInteger(activeTopicIdx)
            ? activeTopicIdx
            : (_tcSubjectId === subjectId && Number.isInteger(_tcTopicIdx) ? _tcTopicIdx : 0);
        _tcSubjectId = subjectId;
        _tcTopicIdx = resolvedTopicIdx;

        navLinks.forEach(link => link.classList.remove('active'));
        document.getElementById('nav-courses')?.classList.add('active');
        setNavContext('Subjects');

        history.pushState({ page: `topic:${subjectId}`, topicIdx: resolvedTopicIdx }, '', `#topic-${subjectId}`);
        if (window.setStudentActiveSubject) window.setStudentActiveSubject(subjectId);

        _buildAndShowTopicPage(subjectId);

    }
    window.switchToTopicPage = switchToTopicPage;

    function _buildAndShowTopicPage(subjectId) {
        const data = getTopicData(subjectId);
        const subject = getTopicSubject(subjectId);
        if (!data || !subject) return;

        const statusIconClass = {
            completed: 'fa-check-circle text-green-500',
            'in-progress': 'fa-circle-half-stroke text-yellow-500',
            'not-started': 'fa-circle text-gray-300',
            locked: 'fa-lock text-gray-300'
        };

        setNavContext(subject.name || 'Subjects');
        buildTopicPage(subjectId, subject, data, statusIconClass);
        setSubjectsPanelsMode(false);
        setCurriculumMode(true);
        hideAllSections();
        showSection('section-topic-detail');

        navLinks.forEach(l => l.classList.remove('bg-white/20'));
        setNavContext('Subjects');

        _hideSubSidebarInstant();
        updateLayout();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * Calculates progress for a quarter's topics based on how many assessments
     * have been submitted (grade > 0 = done, regardless of score).
     * Each topic has 4 assessment types: quiz, assignment, activity, performance.
     * Progress = submitted assessments / total possible assessments Ã— 100.
     * A "not-started" topic with no grades contributes 0 submitted but 4 total.
     */
    function _calcQuarterProgress(topics) {
        if (!topics || topics.length === 0) return null; // null = quarter has no topics (skip)
        const assessmentTypes = ['quiz', 'assignment', 'activity', 'performance'];
        let totalPossible = 0;
        let totalSubmitted = 0;
        topics.forEach(topic => {
            assessmentTypes.forEach(type => {
                totalPossible++;
                const grade = topic.grades?.[type];
                // Count as submitted if grade > 0 (any score means it was done)
                if (grade != null && grade > 0) totalSubmitted++;
            });
        });
        if (totalPossible === 0) return null;
        return Math.round((totalSubmitted / totalPossible) * 100);
    }

    function _buildProgressRail(data) {
        const q1Topics = data.q1Topics || [];
        const q2Topics = data.q2Topics || [];
        const q3Topics = data.q3Topics || [];
        const q4Topics = data.q4Topics || [];

        const quarter1Pct = _calcQuarterProgress(q1Topics) ?? 0;
        // Only show a quarter bar if that quarter has topics defined
        const quarter2Pct = q2Topics.length > 0 ? (_calcQuarterProgress(q2Topics) ?? 0) : (data.q2Percent ?? null);
        const quarter3Pct = q3Topics.length > 0 ? (_calcQuarterProgress(q3Topics) ?? 0) : (data.q3Percent ?? null);
        const quarter4Pct = q4Topics.length > 0 ? (_calcQuarterProgress(q4Topics) ?? 0) : (data.q4Percent ?? null);

        // Overall = average of quarters that actually exist (have topics or explicit percent)
        const activeQuarters = [quarter1Pct, quarter2Pct, quarter3Pct, quarter4Pct].filter(v => v !== null);
        const overallPct = activeQuarters.length > 0
            ? Math.round(activeQuarters.reduce((a, b) => a + b, 0) / 4)
            : 0;

        const renderBar = (label, pct) => {
            if (pct === null) {
                // Quarter has no topics yet â€” show locked/upcoming
                return `
                    <div class="mt-3">
                        <div class="flex justify-between items-center">
                            <span class="student-topic-progress-label text-gray-300">${label}</span>
                            <span class="text-[10px] font-black text-gray-300">â€”</span>
                        </div>
                        <div class="student-topic-progress-bar bg-gray-50 mt-1.5">
                            <div class="h-full bg-gray-200 rounded-full" style="width:0%"></div>
                        </div>
                    </div>`;
            }
            const color = pct >= 100 ? 'bg-icc' : pct > 0 ? 'bg-icc' : 'bg-gray-300';
            return `
                    <div class="mt-3">
                        <div class="flex justify-between items-center">
                            <span class="student-topic-progress-label">${label}</span>
                            <span class="text-[10px] font-black text-black">${pct}%</span>
                        </div>
                        <div class="student-topic-progress-bar bg-gray-100 mt-1.5">
                            <div class="h-full ${color} rounded-full transition-all" style="width:${pct}%"></div>
                        </div>
                    </div>`;
        };

        return `
            <div class="student-topic-progress-rail">
                <div class="student-topic-progress-card sharp-shadow border border-gray-100">
                    <p class="student-topic-progress-kicker">Progress</p>
                    <div class="text-center py-1">
                        <div class="student-topic-progress-percent text-black">${overallPct}%</div>
                    </div>
                    <div>
                        <div class="flex justify-between items-center mb-1.5">
                            <span class="student-topic-progress-label">1st Quarter</span>
                            <span class="text-[10px] font-black text-black">${quarter1Pct}%</span>
                        </div>
                        <div class="student-topic-progress-bar bg-gray-100">
                            <div class="h-full bg-icc rounded-full transition-all" style="width:${quarter1Pct}%"></div>
                        </div>
                    </div>
                    ${renderBar('2nd Quarter', quarter2Pct)}
                    ${renderBar('3rd Quarter', quarter3Pct)}
                    ${renderBar('4th Quarter', quarter4Pct)}
                </div>
            </div>
        `;
    }



    function buildTopicPage(subjectId, subject, data, statusIconClass) {
        const page = document.getElementById('section-topic-detail');
        if (!page) return;
        const topicImages = ['image/Topic.jpg', 'image/Topic2.jpg'];

        const renderTopicCard = (topic, index) => `
            <div class="student-topic-card" onclick="openTopicContent('${subjectId}', ${index})">
                <div class="student-topic-card__image-container">
                    <img src="${topicImages[index % topicImages.length]}" alt="" class="student-topic-card__image">
                </div>
                <div class="student-topic-card__body">
                    <div class="student-topic-card__meta">
                        <span>Topic ${index + 1}</span>
                        <i class="fa-solid text-xl ${statusIconClass[topic.status] || 'fa-circle text-gray-200'} ml-auto"></i>
                    </div>
                    <h3>${topic.title}</h3>
                    <p>${getTopicOverview(topic.title) || `Review the key concepts, activities, and learning outputs.`}</p>
                    <div class="mt-auto pt-4 text-right">
                        <button class="student-topic-open-btn inline-flex items-center gap-2 px-6 py-2.5 bg-icc text-white rounded-full font-bold text-sm shadow">
                            Open Topic <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        page.innerHTML = `
            <div class="student-topic-page-shell px-0 pb-0 min-h-screen overflow-x-hidden">
                <div class="topic-detail-grid">
                    <div class="student-topic-main-shell">
                        <div class="student-topic-header">
                            <h1>${subject.text || 'Topics'}</h1>
                        </div>
                        <div class="student-topic-list" id="q1-topics-list">
                            ${data.q1Topics.map((topic, index) => renderTopicCard(topic, index)).join('')}
                        </div>
                    </div>
                    ${_buildProgressRail(data)}
                </div>
            </div>`;
    }

    function getTopicOverview(title) {
        const o = { 'Introduction to Java': 'Learn Java syntax, data types, and basic program structure.', 'Variables & Data Types': 'Explore how Java stores and manages different kinds of data.', 'Control Structures': 'Master program flow using conditions and loop constructs.', 'Methods & Functions': 'Organize code into reusable blocks using method declarations.', 'Arrays & Collections': 'Work with ordered data using arrays and Java collection classes.', 'Object-Oriented Programming': 'Apply OOP concepts: classes, objects, encapsulation, abstraction.', 'HTML5 Fundamentals': 'Build well-structured web pages using semantic HTML5 elements.', 'CSS3 & Flexbox': 'Style web layouts with modern CSS3 and the flexible box model.', 'Number Systems & Binary': 'Understand binary, octal, hex and their conversions.', 'CPU Architecture': 'Explore how the CPU executes instructions and manages data.' };
        Object.assign(o, {
            'Nature and Elements of Communication': 'Identify how messages are created, sent, received, and interpreted in real situations.',
            'Functions of Communication': 'See how communication informs, influences, regulates, and builds relationships.',
            'Communication Models': 'Study common communication models and how messages move through different channels.',
            'Communication Breakdown': 'Recognize barriers to communication and practice ways to reduce misunderstanding.',
            'Speech Context, Style, and Act': 'Match speech behavior to audience, purpose, and communication setting.',
            'Principles of Speech Writing and Delivery': 'Plan, organize, and present clear speeches for academic and public use.',
            'Self-Assessment and Personal Strengths': 'Reflect on your abilities, interests, and values as the basis for career planning.',
            'Career Choices and Pathways': 'Compare career paths, course options, and work opportunities that fit your goals.',
            'Factors Affecting Goal Fulfillment': 'Identify personal and external factors that affect achievement and decision-making.',
            'Work Readiness and Professional Habits': 'Practice habits, behavior, and communication expected in school-to-work settings.',
            'Rights, Responsibilities, and Entrepreneurial Mindset': 'Understand workplace responsibilities and the basics of initiative and enterprise.',
            'Career Portfolio and Financial Literacy': 'Build a simple career portfolio while learning how money decisions affect goals.',
            'Functions and Their Graphs': 'Interpret function behavior and connect algebraic rules to real-life graph patterns.',
            'Rational Functions, Equations, and Inequalities': 'Solve rational expressions and inequalities that appear in practical problem solving.',
            'One-to-One and Inverse Functions': 'Analyze one-to-one relationships and use inverses to reverse processes.',
            'Exponential and Logarithmic Functions': 'Model growth and decay with exponents and logarithms in real contexts.',
            'Simple and Compound Interest': 'Compute savings and loan growth using standard interest formulas.',
            'Stocks, Bonds, Loans, and Logic': 'Apply business math and logical reasoning to financial decisions.',
            'Origin and Structure of the Earth': 'Explore Earth s formation, layers, and the processes that shape the planet.',
            'Earth Materials and Processes': 'Study rocks, minerals, and the forces that change Earth s surface.',
            'Natural Hazards, Mitigation, and Adaptation': 'Connect science to preparedness for earthquakes, floods, and other hazards.',
            'Perpetuation of Life and Reproduction': 'Examine heredity, reproduction, and the continuity of life.',
            'Evolution, Classification, and Ecosystems': 'Understand how organisms change, are grouped, and interact in ecosystems.',
            'Matter, Light, and the Cosmos': 'Relate matter, energy, light, and space science to everyday phenomena.',
            'Enculturation and Socialization': 'Trace how families, schools, and communities shape values and behavior.',
            'How Society Is Organized': 'Study social institutions, roles, and how communities are structured.',
            'The Philippine Constitution and Governance': 'Review the Constitution, branches of government, and civic participation.',
            'Elections, Suffrage, and Political Parties': 'Learn how citizens vote and how political groups shape public choice.',
            'Civil Society, Social Movements, and Citizenship': 'Explore citizen action, advocacy, and responsible participation in society.',
            'Political Ideologies and Social Change': 'Compare political ideas and the social changes they can influence.',
            'Arts 1 - Creative Industries': 'Discover creative sectors, visual expression, and industry-based artistic work.',
            'Contemporary Literature 1': 'Read and discuss modern literary forms, themes, and critical responses.',
            'Citizenship and Civic Engagement': 'Build informed participation through community service, rights, and responsibilities.',
            'Philippine Politics and Governance': 'Understand institutions, public policy, and how governance works in the country.',
            'Biology 1': 'Study living organisms, cell processes, genetics, and biodiversity foundations.',
            'Broadband Installation': 'Learn the practical steps for setting up and maintaining broadband connections.',
            'Computer Programming - Java': 'Write structured Java programs for real-world problem solving.',
            'Computer Systems Servicing': 'Work with hardware setup, troubleshooting, and basic system maintenance.',
            'Electrical Installation Maintenance': 'Practice wiring, safety, and installation procedures used in technical work.',
            'Contact Center Services': 'Develop communication, customer handling, and workplace service skills.',
            'Orientation and Program Briefing': 'Learn the purpose, schedule, and expectations of immersion.',
            'Worksite Matching and Clearance': 'Match students with an appropriate immersion site and complete paperwork.',
            'Parent Consent and Forms': 'Secure the required permission and student information forms.',
            'Safety, Dress Code, and Attendance Rules': 'Follow the conduct, appearance, and attendance procedures of the workplace.',
            'Pre-Immersion Plan Submission': 'Submit a plan that shows readiness for the worksite placement.',
            'Daily Attendance and Time Logs': 'Track arrival, departure, and daily work hours accurately.',
            'Assigned Work Tasks': 'Complete the tasks given by the workplace supervisor.',
            'Supervisor Feedback and Monitoring': 'Use supervisor comments to improve performance during immersion.',
            'Output Documentation': 'Document work outputs, evidence, and task completion.',
            'Workplace Conduct and Compliance': 'Maintain proper behavior and follow workplace rules.',
            'Reflection Journal and Learning Log': 'Write reflections on learning experiences during immersion.',
            'Portfolio Compilation': 'Gather evidence and outputs into a final immersion portfolio.',
            'Final Supervisor Evaluation': 'Review the final performance result from the worksite supervisor.',
            'Presentation and Defense': 'Present the immersion experience and explain the learning gained.',
            'Completion and Exit Requirements': 'Finish the final submission steps required to complete immersion.'
        });
        return o[title] || 'This topic covers key concepts and practical applications essential to mastering this subject.';
    }

    //   Topic Content System  

    let _tcSubjectId = null, _tcTopicIdx = 0, _tcTab = 'videos', _tcVideoIdx = null;

    const topicVideos = {
        default: [
            { id: 1, title: 'Lecture 1: Introduction & Overview', duration: '24:15', teacher: 'Alex Reyes', thumb: null, url: '' },
            { id: 2, title: 'Lecture 2: Core Concepts Explained', duration: '18:42', teacher: 'Alex Reyes', thumb: null, url: '' },
            { id: 3, title: 'Lecture 3: Practical Demonstration', duration: '31:08', teacher: 'Alex Reyes', thumb: null, url: '' },
        ]
    };

    window.openTopicContent = function (subjectId, topicIdx, tab = 'videos', videoIdx = null) {
        _tcSubjectId = subjectId;
        _tcTopicIdx = topicIdx;
        _tcTab = tab;
        _tcVideoIdx = videoIdx;
        window._scAssessmentDetailIdx = videoIdx;
        window._tcAssessmentDetailIdx = videoIdx; // Support both naming conventions for parity
        const data = getTopicData(subjectId);
        const subject = getTopicSubject(subjectId);
        if (!data || !subject) return;
        const topic = data.q1Topics[topicIdx];
        if (!topic) return;
        const pageId = videoIdx === null || videoIdx === undefined
            ? `topic-content:${subjectId}:${topicIdx}:${tab}`
            : `topic-content:${subjectId}:${topicIdx}:${tab}:${videoIdx}`;
        const hashId = videoIdx === null || videoIdx === undefined
            ? `#tc-${subjectId}-${topicIdx}-${tab}`
            : `#tc-${subjectId}-${topicIdx}-${tab}-v${videoIdx}`;

        history.pushState({ page: pageId }, '', hashId);
        _showTopicContent(subjectId, topicIdx, tab, videoIdx);

        // Update sidebar to only highlight SUBJECTS (nav-courses)
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const activeLink = document.getElementById('nav-courses');
        if (activeLink) {
            activeLink.classList.add('active');
            if (typeof setNavContext === 'function') setNavContext('Subjects');
        }
    };

    window.returnToTopicsPage = function () {
        if (_tcSubjectId) {
            switchToTopicPage(_tcSubjectId);
            return;
        }
        history.back();
    };

    window.switchTopicTab = function (tab, assessmentIdx = null) {
        if (!_tcSubjectId) return;
        _tcTab = tab;
        _tcVideoIdx = null;
        window._scAssessmentDetailIdx = assessmentIdx;

        history.replaceState({ page: `topic-content:${_tcSubjectId}:${_tcTopicIdx}:${tab}` }, '', `#tc-${_tcSubjectId}:${_tcTopicIdx}:${tab}`);
        _renderTopicContentMain(_tcSubjectId, _tcTopicIdx, tab);
        window.scrollTo({ top: 0, behavior: 'smooth' });

        document.querySelectorAll('.topic-content-nav-item').forEach(el => {
            el.classList.toggle('active', el.dataset.tab === tab);
        });
    };

    function _showTopicContent(subjectId, topicIdx, tab, videoIdx = null) {
        _tcSubjectId = subjectId;
        _tcTopicIdx = topicIdx;
        _tcTab = tab;
        _tcVideoIdx = videoIdx;

        const data = getTopicData(subjectId);
        const subject = getTopicSubject(subjectId);
        if (!data || !subject) return;

        setSubjectsPanelsMode(false);
        setCurriculumMode(true);
        hideAllSections();
        showSection('section-topic-content');

        const statusIconClass = {
            completed: 'fa-check-circle text-green-500',
            'in-progress': 'fa-circle-half-stroke text-yellow-500',
            'not-started': 'fa-circle text-gray-300',
            locked: 'fa-lock text-gray-300'
        };
        loadTopicSubSidebar(subject, data, statusIconClass, topicIdx);
        _buildTopicContentSubSidebar(subject, data, subjectId, topicIdx, tab);

        updateLayout();

        _renderTopicContentMain(subjectId, topicIdx, tab);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function _buildTopicContentSubSidebar(subject, data, subjectId, topicIdx, tab) {
        const title = document.getElementById('sub-sidebar-title');
        const content = document.getElementById('sub-sidebar-content');
        const header = document.getElementById('sub-sidebar-header');
        if (!title || !content) return;
        if (header) header.classList.remove('hidden');
        const topic = data.q1Topics[topicIdx];

        title.innerHTML = `<span class="truncate">${topic.title}</span>`;
        const navItems = [
            { tab: 'videos', icon: 'fa-solid fa-play-circle', label: 'Videos' },
            { tab: 'handouts', icon: 'fa-solid fa-file-pdf', label: 'Lessons' },
            { tab: 'assignments', icon: 'fa-solid fa-file-pen', label: 'Assignments' },
            { tab: 'quiz', icon: 'fa-solid fa-square-poll-vertical', label: 'Quizzes' },
            { tab: 'activity', icon: 'fa-solid fa-flask', label: 'Activities' },
            { tab: 'performance', icon: 'fa-solid fa-star', label: 'Performance Tasks' }
        ];

        content.innerHTML = `
            <div class="px-2 pt-3 space-y-0.5">
                ${navItems.map(item => `
                    <button class="topic-content-nav-item ${tab === item.tab ? 'active' : ''}" data-tab="${item.tab}"
                        onclick="switchTopicTab('${item.tab}')">
                        <i class="${item.icon} text-sm"></i>
                        <span>${item.label}</span>
                    </button>
                `).join('')}
            </div>
        `;
    }

    function _renderTopicContentMain(subjectId, topicIdx, tab) {
        const page = document.getElementById('section-topic-content');
        if (!page) return;

        const data = getTopicData(subjectId);
        const subject = getTopicSubject(subjectId);
        const topic = data.q1Topics[topicIdx];
        const assessmentTabs = ['assignments', 'quiz', 'activity', 'performance'];
        const isAssessment = assessmentTabs.includes(tab);

        let tabResult = { mainHtml: '', rightHtml: null };
        if (tab === 'videos') tabResult = _buildVideosTab(subject, topic, subjectId, topicIdx);
        else if (tab === 'handouts') tabResult = _buildHandoutsTab(subject, topic, subjectId, topicIdx);
        else if (isAssessment) tabResult = _buildAssessmentTab(tab, subject, topic, data);
        else tabResult = { mainHtml: _buildComingSoonTab(tab, subject, topic), rightHtml: null };

        const tabNavHtml = _tabNav(tab);

        page.innerHTML = `
            <div class="student-topic-page-shell px-0 pb-0 min-h-screen overflow-visible">
                <div class="topic-detail-grid">
                    <!-- Main Content Panel -->
                    <div class="student-topic-main-shell standard-panel-shadow min-h-screen flex flex-col flex-1">
                        <div class="px-0 py-0 border-b border-gray-100 bg-white">
                            ${tabNavHtml}
                        </div>
                        <div class="px-10 py-0 flex-1">
                            ${tabResult.mainHtml}
                        </div>
                    </div>

                    <!-- Right Section: Progress Rail + Tab Specific Sidebar -->
                    <div class="student-topic-progress-rail">
                        ${tabResult.rightHtml || ''}
                        ${(isAssessment && window._scAssessmentDetailIdx !== null) ? '' : _buildProgressRail(data)}
                    </div>
                </div>
            </div>`;

        if (tab === 'handouts') {
            const handouts = topic.handouts || topicHandouts[`${subjectId}-${topicIdx}`] || topicHandouts.default;
            handouts.forEach((h, i) => {
                if (h.type === 'ppt' && h.slides) {
                    new HandoutSlider(`handout-slider-${i}`, h.slides);
                }
            });
        }
    }

    //   Tab linear navigation helper  

    const TAB_ORDER = ['videos', 'handouts', 'assignments', 'quiz', 'activity', 'performance'];
    const TAB_LABELS = { videos: 'Videos', handouts: 'Lessons', assignments: 'Assignments', quiz: 'Quizzes', activity: 'Activities', performance: 'Performance Tasks' };
    const TAB_ICONS = {
        videos: 'fa-solid fa-play-circle',
        handouts: 'fa-solid fa-file-pdf',
        assignments: 'fa-solid fa-file-pen',
        quiz: 'fa-solid fa-square-poll-vertical',
        activity: 'fa-solid fa-flask',
        performance: 'fa-solid fa-star'
    };
    function getTopicTabs() {
        return TAB_ORDER;
    }
    function _tabNav(currentTab) {
        const tabs = getTopicTabs();
        const idx = tabs.indexOf(currentTab);
        const prev = idx > 0 ? tabs[idx - 1] : null;
        const next = idx < tabs.length - 1 ? tabs[idx + 1] : null;

        const subjectId = _tcSubjectId;
        const topicIdx = _tcTopicIdx;
        const data = getTopicData(subjectId);
        const topic = data.q1Topics[topicIdx];
        const tabLabel = TAB_LABELS[currentTab] || currentTab;

        return `
            <div class="flex flex-col w-full py-0 border-b border-gray-100 bg-white shadow-sm relative z-10">
                <!-- Header Row (Breadcrumbs) -->
                <div class="px-4 pt-6 pb-0">
                    <div class="flex items-center gap-2 text-black font-['Inter'] flex-wrap">
                        <span class="text-sm md:text-xl font-bold text-gray-900 tracking-tight leading-tight">${topic.title}</span>
                        <i class="fa-solid fa-chevron-right text-[10px] md:text-xs text-black/20 mx-1 flex-shrink-0"></i>
                        <span class="text-sm md:text-xl font-bold text-gray-900 tracking-tight whitespace-nowrap">${tabLabel}</span>
                    </div>
                </div>

                <!-- Action Row (Buttons) -->
                <div class="flex items-center justify-between w-full px-4 pt-4 pb-4">
                    ${prev ? `
                    <button onclick="switchTopicTab('${prev}')"
                        class="h-8 w-20 md:h-10 md:w-28 rounded-xl bg-icc hover:bg-icc-dark text-white text-[10px] md:text-xs font-bold transition-all flex items-center justify-center flex-shrink-0">
                        Previous
                    </button>` : '<div class="w-20 md:w-28"></div>'}

                    ${next ? `
                    <button onclick="switchTopicTab('${next}')"
                        class="h-8 w-20 md:h-10 md:w-28 rounded-xl bg-icc hover:bg-icc-dark text-white text-[10px] md:text-xs font-bold transition-all flex items-center justify-center flex-shrink-0">
                        Next
                    </button>` : '<div class="w-20 md:w-28"></div>'}
                </div>

                <!-- Tab Row -->
                <div class="flex items-center justify-between border-t border-gray-50 px-10 py-2 w-full">
                    <div class="flex items-center gap-2 md:gap-8 flex-wrap flex-1 mr-2">
                        ${tabs.map(tab => `
                            <button onclick="switchTopicTab('${tab}')"
                                class="relative h-10 md:h-12 px-2 text-[10px] md:text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${currentTab === tab ? 'text-yellow-500' : 'text-gray-900 hover:text-gray-600'}">
                                ${TAB_LABELS[tab]}
                                ${currentTab === tab ? '<div class="absolute bottom-0 left-0 w-full h-1 bg-icc"></div>' : ''}
                            </button>
                        `).join('')}
                    </div>
                    
                    <!-- Desktop Action Buttons -->
                    <div class="hidden md:flex items-center gap-1 ml-4 flex-shrink-0">
                        <button onclick="switchToTopicPage('${subjectId}', ${topicIdx})" class="w-9 h-9 rounded-full flex items-center justify-center text-black hover:bg-slate-100 transition-colors" title="Back to Topics">
                            <i class="fa-solid fa-book text-lg"></i>
                        </button>
                        <button onclick="window.returnToStudentRoomFromTopic?.('${subjectId}')" class="w-9 h-9 rounded-full flex items-center justify-center text-black hover:bg-slate-100 transition-colors" title="Back to Sections">
                            <i class="fa-solid fa-door-open text-lg"></i>
                        </button>
                    </div>

                    <!-- Mobile Ellipsis Menu -->
                    <div class="flex md:hidden items-center ml-2 flex-shrink-0 relative z-50">
                        <button onclick="this.nextElementSibling.classList.toggle('hidden')" class="w-8 h-8 rounded-full flex items-center justify-center text-black hover:bg-slate-100 transition-colors focus:outline-none" title="More Actions">
                            <i class="fa-solid fa-ellipsis-vertical text-lg"></i>
                        </button>
                        <div class="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-100 rounded-xl shadow-lg hidden transition-all flex flex-col py-2">
                            <button onclick="switchToTopicPage('${subjectId}', ${topicIdx})" class="flex items-center gap-3 px-4 py-2 text-xs font-bold text-gray-800 hover:bg-slate-50 transition-colors text-left w-full">
                                <i class="fa-solid fa-book w-4 text-center"></i> Topics
                            </button>
                            <button onclick="window.returnToStudentRoomFromTopic?.('${subjectId}')" class="flex items-center gap-3 px-4 py-2 text-xs font-bold text-gray-800 hover:bg-slate-50 transition-colors text-left w-full">
                                <i class="fa-solid fa-door-open w-4 text-center"></i> Section
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    function _buildVideosTab(subject, topic, subjectId, topicIdx) {
        const videos = topicVideos[`${subjectId}-${topicIdx}`] ?? topicVideos.default;
        if (!videos.length) {
            return {
                mainHtml: `
                    <div class="p-20 text-center font-['Inter']">
                        <div class="w-24 h-24 rounded-[32px] bg-slate-50 flex items-center justify-center mx-auto mb-8 text-slate-200">
                            <i class="fa-solid fa-play-circle text-5xl"></i>
                        </div>
                        <h3 class="text-2xl font-bold text-slate-900 mb-3">No videos</h3>
                    </div>
                `,
                rightHtml: null
            };
        }

        if (_tcVideoIdx === null || _tcVideoIdx === undefined || Number.isNaN(_tcVideoIdx)) {
            return {
                mainHtml: `
                    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-10 mt-10 px-6 md:px-10">
                        ${videos.map((video, i) => `
                            <button type="button" class="video-selection-card group bg-white border border-gray-100 rounded-2xl p-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:border-black transition-all duration-300" onclick="openTopicContent('${subjectId}', ${topicIdx}, 'videos', ${i})">
                                <div class="bg-gray-900 rounded-2xl overflow-hidden mb-4 flex items-center justify-center" style="aspect-ratio:16/9;">
                                    <div class="text-center text-white/40">
                                        <i class="fa-solid fa-play-circle text-4xl mb-2 block"></i>
                                    </div>
                                </div>
                                <p class="text-base font-bold text-black leading-tight group-hover:text-yellow-500 transition-colors font-['Inter']">${video.title}</p>
                                <p class="text-sm text-black mt-2 leading-relaxed font-['Inter']">${getTopicOverview(video.title)}</p>
                                <div class="mt-3 flex items-center justify-between text-black/40 text-[10px] font-bold">
                                    <span>${video.duration}</span>
                                </div>
                            </button>
                        `).join('')}
                    </div>
                `,
                rightHtml: null
            };
        }

        const activeVideo = videos[_tcVideoIdx] || videos[0];
        const otherVideos = videos.filter((_, idx) => idx !== _tcVideoIdx);

        return {
            mainHtml: `
                <div class="space-y-6 pb-10 mt-10 px-6 md:px-10">
                    <div id="topic-video-player-container" class="bg-black rounded-2xl overflow-hidden shadow-2xl aspect-video relative group">
                        <iframe class="w-full h-full" src="${activeVideo.url}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                    </div>

                    <div class="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
                        <h2 class="text-2xl font-black text-gray-900 mb-2">${activeVideo.title}</h2>
                        <div class="flex items-center gap-4 text-sm font-bold text-gray-400 mb-4">
                            <span><i class="fa-regular fa-clock"></i> ${activeVideo.duration}</span>
                            <span><i class="fa-regular fa-calendar"></i> ${activeVideo.date || 'March 2026'}</span>
                        </div>
                        <p class="text-base text-gray-600 leading-relaxed font-medium">${getTopicOverview(activeVideo.title) || 'Learn about this topic through our comprehensive video lesson.'}</p>
                    </div>

                    ${otherVideos.length > 0 ? `
                        <div class="space-y-4 pt-4">
                            <div class="flex items-center justify-between px-2 mb-4">
                                <h3 class="text-lg font-black text-gray-900">More Videos</h3>
                                <span class="text-xs font-bold text-gray-400">${otherVideos.length} videos</span>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                ${otherVideos.map((v) => {
                const originalIdx = videos.indexOf(v);
                return `
                                    <button class="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl hover:border-black transition-all text-left shadow-sm group" onclick="openTopicContent('${subjectId}', ${topicIdx}, 'videos', ${originalIdx})">
                                        <div class="w-24 aspect-video bg-gray-900 rounded-lg flex-shrink-0 flex items-center justify-center">
                                            <i class="fa-solid fa-play text-white/40 text-sm group-hover:text-yellow-500 transition-colors"></i>
                                        </div>
                                        <div class="min-w-0">
                                            <p class="font-bold text-gray-900 group-hover:text-yellow-500 transition-colors truncate">${v.title}</p>
                                            <p class="text-xs font-bold text-gray-400 mt-1">${v.duration}</p>
                                        </div>
                                    </button>
                                `;
            }).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `,
            rightHtml: null
        };
    }
    //   HANDOUTS TAB  

    function _buildHandoutsTab(subject, topic, subjectId, topicIdx) {
        const handouts = topic.handouts || topicHandouts[`${subjectId}-${topicIdx}`] || topicHandouts.default;

        if (!handouts.length) {
            return {
                mainHtml: `
                    <div class="p-20 text-center font-['Inter']">
                        <div class="w-24 h-24 rounded-[32px] bg-slate-50 flex items-center justify-center mx-auto mb-8 text-slate-200">
                            <i class="fa-solid fa-file-pdf text-5xl"></i>
                        </div>
                        <h3 class="text-2xl font-bold text-slate-900 mb-3">No lessons</h3>
                    </div>
                `,
                rightHtml: null
            };
        }
        const handoutCards = handouts.map((h, i) => {
            const isPpt = h.type?.toLowerCase() === 'ppt' || h.type?.toLowerCase() === 'pptx';
            const isDocs = h.type?.toLowerCase() === 'docs' || h.type?.toLowerCase() === 'doc' || h.type?.toLowerCase() === 'docx';
            const iconCls = isPpt ? 'fa-file-powerpoint text-orange-500' : (isDocs ? 'fa-file-word text-blue-500' : 'fa-file-pdf text-red-500');
            const bgCls = isPpt ? 'bg-orange-50' : (isDocs ? 'bg-blue-50' : 'bg-red-50');

            return `
                <div class="handout-card group flex items-center gap-6 p-6 bg-white border border-gray-100 rounded-none md:rounded-[20px] shadow-sm hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:border-black transition-all cursor-pointer"
                     onclick="openHandoutModal(${i},'${subjectId}',${topicIdx})">
                    <div class="w-16 h-16 ${bgCls} rounded-none md:rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105">
                        <i class="fa-solid ${iconCls} text-2xl"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="text-[16px] font-bold text-black leading-tight mb-1.5 font-['Inter'] group-hover:text-yellow-500 transition-colors">${(h.title || '').replace(/\.(pdf|docx|pptx|ppt)$/i, '')}</h4>
                    </div>
                </div>
            `;
        }).join('');

        return {
            mainHtml: `
                <div class="space-y-4 mt-10 pb-10 px-6 md:px-10" id="handout-list">
                    ${handoutCards}
                </div>
            `,
            rightHtml: null
        };
    }

    // Open PDF as full-screen browser-layout modal

    window.openHandoutModal = function (idx, subjectId, topicIdx) {
        const handouts = topicHandouts[`${subjectId}-${topicIdx}`] || topicHandouts.default;
        const h = handouts[idx];
        if (!h) return;
        document.getElementById('handout-modal')?.remove();
        const modal = document.createElement('div');

        modal.id = 'handout-modal';

        modal.style.cssText = 'position:fixed;inset:0;z-index:9000;display:flex;flex-direction:column;background:#404040;';
        const iframeAttr = h.url

            ? `src="${h.url}"`

            : `srcdoc="<html><body style='margin:0;display:flex;align-items:center;justify-content:center;height:100%;background:#f8fafc;font-family:sans-serif;'><div style='text-align:center;color:#94a3b8;'><div style='font-size:72px;margin-bottom:16px'> </div><p style='font-size:18px;font-weight:800;color:#374151'>${h.title}</p><p style='font-size:13px;margin-top:8px'>${h.pages} pages   ${h.size}</p><p style='font-size:11px;margin-top:20px;color:#cbd5e1;max-width:340px;line-height:1.6'>PDF will render here once connected to backend.</p></div></body></html>"`;

        modal.innerHTML = `

            <!-- Minimal top bar   just back button and filename -->

            <div style="height:48px;background:#1e1e2e;display:flex;align-items:center;padding:0 16px;gap:14px;flex-shrink:0;">

                <button onclick="document.getElementById('handout-modal').remove()"

                    style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,0.1);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s"

                    onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">

                    <i class="fa-solid fa-xmark" style="color:white;font-size:13px"></i>

                </button>

                <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">

                    <i class="fa-solid fa-file-pdf" style="color:#ef4444;font-size:14px;flex-shrink:0"></i>

                    <span style="font-size:13px;font-weight:700;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${h.title}</span>

                    <span style="font-size:11px;color:rgba(255,255,255,0.4);flex-shrink:0">  ${h.pages} pages   ${h.size}</span>

                </div>

                <span style="font-size:11px;color:rgba(255,255,255,0.35);white-space:nowrap;flex-shrink:0">Uploaded by ${h.uploader}</span>

            </div>

            <!-- PDF iframe fills all remaining height   Chrome renders its own toolbar inside -->

            <iframe ${iframeAttr}

                style="flex:1;border:none;width:100%;display:block;background:#404040"

            ></iframe>`;
        document.body.appendChild(modal);
        const esc = e => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', esc);
            }
        };
        document.addEventListener('keydown', esc);

    };
    window.toggleHandoutPreview = window.openHandoutModal;
    window.previewHandout = window.openHandoutModal;
    window.closePdfPreview = function () {
        document.getElementById('handout-modal')?.remove();
    };
    //   Sample handout data (future: from backend)  

    const topicHandouts = {

        default: [

            { title: 'Lesson Notes   Chapter 1', pages: 12, size: '1.2 MB', uploader: 'Admin', url: '' },

            { title: 'Reference Guide &     Glossary', pages: 8, size: '0.8 MB', uploader: 'Admin', url: '' },

            { title: 'Practice Exercises Sheet', pages: 4, size: '0.4 MB', uploader: 'Admin', url: '' },

        ],

        'default-subject-placeholder-0': []

    };
    //   ASSESSMENT TABS (assignments/quiz/activity/performance)  

    // Sample assessment data   teacher/admin will populate via backend

    const assessmentData = {

        default: {

            startDate: 'March 20, 2026', startTime: '8:00 AM',

            dueDate: 'March 27, 2026', dueTime: '5:00 PM',

            maxScore: 100, maxAttempts: 3,

            latePermission: true,

            instructionType: 'text', // 'text' or 'pdf'

            instructionPdf: { title: 'Activity Instructions Sheet', pages: 4, size: '0.6 MB', uploader: 'Teacher' },

            submission: null // null = not yet submitted
        }
    };

    function _buildAssessmentTab(tab, subject, topic, data) {
        const labels = { assignments: 'Assignment', quiz: 'Quiz', activity: 'Activity', performance: 'Performance Task' };
        const label = labels[tab];
        const icons = { assignments: 'fa-file-pen', quiz: 'fa-square-poll-vertical', activity: 'fa-flask', performance: 'fa-star' };
        const colors = { assignments: 'bg-blue-50 text-blue-500', quiz: 'bg-purple-50 text-purple-500', activity: 'bg-amber-50 text-amber-500', performance: 'bg-icc-light text-icc' };

        // Wireframe Mock Data
        const descriptions = {
            assignments: 'Complete the provided exercises based on the latest lecture. Submit your work in PDF format.',
            quiz: 'Assessment quiz covering the core concepts of this module. Please ensure you have a stable internet connection.',
            activity: 'Hands-on activity to apply what you\'ve learned. Follow the step-by-step instructions in the attached guide.',
            performance: 'Final performance task for this module. Refer to the rubric for grading details.'
        };

        const assessments = [
            { id: 1, title: `${label} #1: Introduction to ${topic.title}`, description: descriptions[tab] || 'Assessment instructions and materials.', type: 'PDF', size: '1.2 MB' },
            { id: 2, title: `${label} #2: Advanced concepts in ${topic.title}`, description: 'Continuing our exploration with practical exercises and case studies.', type: 'DOCX', size: '850 KB' }
        ];

        let mainHtml = '';
        let rightHtml = null;

        if (window._scAssessmentDetailIdx !== null && window._scAssessmentDetailIdx !== undefined) {
            const activeIdx = window._scAssessmentDetailIdx;
            const ass = assessments[activeIdx];
            const assData = assessmentData.default;

            const isPpt = ass.type?.toLowerCase() === 'ppt' || ass.type?.toLowerCase() === 'pptx';
            const isDoc = ass.type?.toLowerCase() === 'doc' || ass.type?.toLowerCase() === 'docx';
            const icon = isPpt ? 'fa-file-powerpoint text-orange-500' : (isDoc ? 'fa-file-word text-blue-500' : 'fa-file-pdf text-red-500');
            const bg = isPpt ? 'bg-orange-50' : (isDoc ? 'bg-blue-50' : 'bg-red-50');

            mainHtml = `
                <div class="animate-in fade-in slide-in-from-bottom-4 duration-700 mt-10 space-y-12 pb-20">
                    <div class="px-0 md:px-10">
                        <h2 class="text-3xl font-bold text-black mb-4 leading-tight font-['Inter']">${ass.title}</h2>
                    </div>

                    <div class="space-y-6 px-6 md:px-10">
                        <h3 class="text-xl font-bold text-black font-['Inter']">Instructions</h3>
                        <p class="text-black leading-relaxed font-medium font-['Inter']">
                            ${ass.description} This is a wireframe detail view. It provides the structured layout for future content integration.
                        </p>
                    </div>

                    <div class="pt-8 border-t border-gray-100 px-0 md:px-10">
                        <div onclick="openHandoutOuterLayer('#', '${ass.title}')" class="group flex items-center gap-6 p-6 bg-white border border-gray-100 rounded-none md:rounded-[20px] sharp-shadow hover:border-black transition-all cursor-pointer">
                            <div class="w-16 h-16 ${bg} rounded-none md:rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105">
                                <i class="fa-solid ${icon} text-2xl"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h4 class="text-[16px] font-bold text-black leading-tight mb-1 group-hover:text-yellow-500 transition-colors font-['Inter']">${ass.title}</h4>
                                <p class="text-[11px] font-bold text-black uppercase tracking-widest font-['Inter']">${ass.type} â€¢ ${ass.size}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            rightHtml = `
                <div class="space-y-6 font-['Inter']">
                    <!-- Tasks Panel (formerly Progress) -->
                    <div class="bg-white border border-gray-100 rounded-[16px] sharp-shadow flex flex-col overflow-hidden relative select-none">
                        <div class="px-4 py-2 flex items-center border-b border-gray-50 bg-white">
                            <h4 class="text-[8px] font-bold text-[#15803d] tracking-widest uppercase">Tasks</h4>
                        </div>
                        <div class="p-3">
                            <div class="space-y-1.5">
                                ${assessments.map((a, i) => `
                                    <div onclick="window.switchTopicTab('${tab}', ${i})" class="flex items-start gap-2 cursor-pointer group">
                                        <div class="w-1 h-1 rounded-full bg-black mt-2 flex-shrink-0"></div>
                                        <span class="min-w-0 text-[13px] font-bold leading-snug break-words ${i === activeIdx ? 'text-yellow-500' : 'text-black group-hover:text-yellow-500'} transition-colors">${a.title}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Score Panel -->
                    <div class="bg-white border border-gray-100 rounded-[16px] sharp-shadow p-3 flex flex-col text-center">
                        <p class="text-[8px] font-bold text-[#15803d] uppercase tracking-widest text-left mb-2">Score</p>
                        <div class="text-[36px] font-black text-icc leading-none mb-0">${topic.grades?.[tab.slice(0, -1)] || topic.grades?.[tab] || 0}</div>
                        <p class="text-[8px] font-bold text-black uppercase tracking-widest mb-3">Out of 100</p>
                        <div class="pt-2 border-t border-gray-50 text-right">
                            <span class="text-[8px] font-bold text-black uppercase tracking-widest">${(topic.grades?.[tab.slice(0, -1)] || topic.grades?.[tab]) ? 'Graded' : 'Not Graded'}</span>
                        </div>
                    </div>

                    <!-- Assessment Details Panel -->
                    <div class="bg-white border border-gray-100 rounded-[16px] sharp-shadow p-3 flex flex-col space-y-2">
                        <p class="text-[8px] font-bold text-[#15803d] uppercase tracking-widest mb-1">Assessment</p>
                        
                        <div class="flex items-center gap-2">
                            <div class="w-7 h-7 rounded-lg bg-icc-light flex items-center justify-center text-icc">
                                <i class="fa-solid fa-star text-[10px]"></i>
                            </div>
                            <div class="text-left">
                                <p class="text-[8px] font-bold text-black uppercase tracking-widest leading-none">Max Score</p>
                                <p class="text-[12px] font-bold text-black">${assData.maxScore} Points</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-2">
                            <div class="w-7 h-7 rounded-lg bg-icc-light flex items-center justify-center text-icc">
                                <i class="fa-solid fa-calendar text-[10px]"></i>
                            </div>
                            <div class="text-left">
                                <p class="text-[8px] font-bold text-black uppercase tracking-widest leading-none">Start</p>
                                <p class="text-[12px] font-bold text-black">${assData.startDate}</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-2">
                            <div class="w-7 h-7 rounded-lg bg-icc-light flex items-center justify-center text-icc">
                                <i class="fa-solid fa-calendar-check text-[10px]"></i>
                            </div>
                            <div class="text-left">
                                <p class="text-[8px] font-bold text-black uppercase tracking-widest leading-none">Due</p>
                                <p class="text-[12px] font-bold text-black">${assData.dueDate}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Submission Details Panel -->
                    <div class="bg-white border border-gray-100 rounded-[16px] sharp-shadow p-3 flex flex-col">
                        <p class="text-[8px] font-bold text-[#15803d] uppercase tracking-widest mb-2">Submission</p>
                        <div class="space-y-1.5">
                            <div class="flex items-center justify-between">
                                <span class="text-[12px] font-bold text-black">Max Attempts</span>
                                <span class="text-[12px] font-bold text-black">${assData.maxAttempts}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-[12px] font-bold text-black">Attempts Used</span>
                                <span class="text-[12px] font-bold text-black">0</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-[12px] font-bold text-black">Late Permission</span>
                                <span class="text-[12px] font-bold ${assData.latePermission ? 'text-icc' : 'text-red-500'}">${assData.latePermission ? 'Permitted' : 'Not Permitted'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            mainHtml = `
                <div class="space-y-4 mt-10 animate-in fade-in slide-in-from-bottom-4 duration-700 font-['Inter'] px-6 md:px-10">
                    ${assessments.map((ass, i) => {
                return `
                        <div onclick="window.switchTopicTab('${tab}', ${i})" class="handout-card group flex items-center gap-6 p-6 bg-white border border-gray-100 rounded-none md:rounded-[20px] sharp-shadow hover:border-black transition-all cursor-pointer">
                            <div class="flex-1 min-w-0">
                                <h4 class="text-[18px] font-bold text-black leading-tight group-hover:text-yellow-500 transition-colors">${ass.title}</h4>
                            </div>
                        </div>
                    `;
            }).join('')}
                </div>
            `;
        }

        return { mainHtml, rightHtml };
    }

    function _buildComingSoonTab(tab, subject, topic) {
        const labels = { assignments: 'Assignments', quiz: 'Quiz', activity: 'Activity', performance: 'Performance Task' };
        const icons = { assignments: 'fa-file-pen', quiz: 'fa-square-poll-vertical', activity: 'fa-flask', performance: 'fa-star' };
        return {
            mainHtml: `
                <div class="bg-white border border-gray-100 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
                    <i class="fa-solid ${icons[tab] || 'fa-folder'} text-5xl text-gray-200 mb-4"></i>
                    <p class="text-base font-black text-gray-400">${labels[tab] || tab}</p>
                    <p class="text-sm text-gray-300 mt-1">Content will appear here when uploaded by your teacher.</p>
                </div>
            `,
            rightHtml: null
        };
    }

    const syncHeaderToggleState = () => {
        if (calendarToggle && calendarDropdown) {
            calendarToggle.classList.toggle('active', !calendarDropdown.classList.contains('hidden'));
        }
        if (notiToggle && notiDropdown) {
            notiToggle.classList.toggle('active', !notiDropdown.classList.contains('hidden'));
        }
        if (profileDropdownBtn && profileDropdownMenu) {
            profileDropdownBtn.classList.toggle('active', !profileDropdownMenu.classList.contains('hidden'));
        }
    };

    const setupDropdown = (btn, menu) => {
        if (!btn || !menu) return;
        btn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = !menu.classList.contains('hidden');
            hideHeaderOverlays(menu, btn, true);
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

    setupDropdown(calendarToggle, calendarDropdown);
    setupDropdown(notiToggle, notiDropdown);
    setupDropdown(profileDropdownBtn, profileDropdownMenu);

    function renderStudentNotificationPanels() {
        const notifications = [
            { icon: 'fa-book-open', tone: 'text-icc', label: 'Material Posted', title: 'New module: Logic Gates', body: 'Teacher Alex Reyes posted new material in Computer Programming 1.' },
            { icon: 'fa-bullhorn', tone: 'text-blue-600', label: 'Announcement', title: '2nd Quarter academic update', body: 'Administrator Jubileen Gonzales shared a school announcement.' },
            { icon: 'fa-clipboard-check', tone: 'text-green-600', label: 'Graded Submission', title: 'Your Logic Gates Quiz was graded', body: 'Teacher Sarah Lim returned your submission with feedback.' },
            { icon: 'fa-trophy', tone: 'text-yellow-600', label: 'Milestone', title: 'Achievement unlocked', body: 'You reached a new learning milestone for weekly study streaks.' },
            { icon: 'fa-calendar-day', tone: 'text-red-600', label: 'Due Date', title: 'E-Portfolio Draft due soon', body: 'Your submission is due May 10 at 11:59 PM.' },
            { icon: 'fa-user-check', tone: 'text-emerald-600', label: 'Attendance', title: 'Attendance recorded', body: 'Teacher Maria marked your Web Development 1 attendance as Present.' }
        ];
        const desktopList = document.querySelector('#noti-dropdown .flex-1 > .px-6.py-4');
        const mobileList = document.querySelector('#mobile-noti-panel .mobile-pull-up-content .space-y-4');
        const desktopHtml = notifications.map(item => `
            <div class="notif-item px-4 py-4 hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-100 rounded-xl mb-2 transition-all">
                <div class="flex gap-4 items-start">
                    <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center ${item.tone} text-sm shadow-sm border border-slate-200/60">
                        <i class="fa-solid ${item.icon}"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-[10px] font-black ${item.tone} uppercase tracking-widest mb-1">${item.label}</p>
                        <p class="text-[13px] font-bold text-gray-800 leading-tight font-['Inter']">${item.title}</p>
                        <p class="text-[12px] text-gray-500 mt-1 font-['Inter'] leading-relaxed">${item.body}</p>
                    </div>
                </div>
            </div>
        `).join('');
        const mobileHtml = notifications.map(item => `
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p class="text-xs font-black ${item.tone} uppercase tracking-widest mb-1">${item.label}</p>
                <p class="text-sm font-bold text-slate-800">${item.title}</p>
                <p class="text-[11px] text-slate-500 mt-1">${item.body}</p>
            </div>
        `).join('');
        if (desktopList) desktopList.innerHTML = desktopHtml;
        if (mobileList) mobileList.innerHTML = mobileHtml;
    }

    renderStudentNotificationPanels();
    // --- User Profile Initialization ---
    const initUserProfile = () => {
        const authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
        const dropFName = document.getElementById('header-dropdown-firstName');
        const dropLName = document.getElementById('header-dropdown-lastName');
        if (dropFName) dropFName.textContent = authUser.firstName || 'Firstname';
        if (dropLName) dropLName.textContent = authUser.lastName || 'Lastname';
        const welcomeName = document.getElementById('welcome-user-firstName');
        if (welcomeName) welcomeName.textContent = 'Student';
        const headerImg = document.getElementById('header-avatar-img');
        const headerPlaceholder = document.getElementById('header-avatar-placeholder');
        const dropdownImg = document.getElementById('sidebar-avatar-img');
        const dropdownPlaceholder = document.getElementById('sidebar-avatar-placeholder');
        const avatarUrl = authUser.avatar || '';
        if (avatarUrl) {
            if (headerImg) { headerImg.src = avatarUrl; headerImg.classList.remove('hidden'); }
            if (headerPlaceholder) headerPlaceholder.classList.add('hidden');
            if (dropdownImg) { dropdownImg.src = avatarUrl; dropdownImg.classList.remove('hidden'); }
            if (dropdownPlaceholder) dropdownPlaceholder.classList.add('hidden');

        }
        else {
            if (headerImg) headerImg.classList.add('hidden');
            if (headerPlaceholder) headerPlaceholder.classList.remove('hidden');
            if (dropdownImg) dropdownImg.classList.add('hidden');
            if (dropdownPlaceholder) dropdownPlaceholder.classList.remove('hidden');

        }

    };

    initUserProfile();
    window.showMyProfile = (e) => {
        if (e) e.preventDefault();

        hideHeaderOverlays();

        switchTab('nav-profile');

    };
    document.getElementById('viewCalendarBtn')?.addEventListener('click', e => {

        e.preventDefault();

        hideHeaderOverlays();

        switchTab('nav-attendance');

    });
    window.addEventListener('click', () => {
        if (suppressNextHeaderClose) return;

        hideHeaderOverlays(null, null, true);

    });
    document.querySelectorAll('[data-assignment]').forEach(el => el.addEventListener('click', () => switchTab('nav-assignments')));
    //   Classroom Detail  

    const classroomPeopleBySection = {

        'ICT-11A': [

            'Abad, Juan',

            'Bautista, Maria',

            'Cruz, Jose',

            'Dela Cruz, Ana',

            'Estacio, Ricardo',

            'Ferrer, Liza',

            'Garcia, Antonio',

            'Hernandez, Elena'

        ]

    };
    const classroomAnnouncementById = {

        'card-prog1': [
            {
                author: 'Alex Reyes',
                timestamp: 'Apr 7, 9:26 AM',
                html: '<p>Please review loops and methods before tomorrow&apos;s hands-on activity.</p>'
            }
        ],
        'card-genmath': [
            {
                author: 'Jose Santos',
                timestamp: 'Apr 9, 10:15 AM',
                html: '<p>Please complete the exercise on Rational Functions by tomorrow. This will be the basis for our next discussion.</p>'
            }
        ],
        'card-webdev': [
            {
                author: 'Sarah Lim',
                timestamp: 'Apr 7, 8:10 AM',
                html: '<p>Bring your latest wireframe draft for our responsive layout check.</p>'
            }
        ],
        'card-database': [
            {
                author: 'Elena Reyes',
                timestamp: 'Apr 6, 4:15 PM',
                html: '<p>Database design consultation starts 15 minutes before class inside Lab 1.</p>'
            }
        ]

    };
    const classroomData = {

        'card-prog1': {
            subject: 'Computer Programming 1',
            teacher: 'Alex Reyes',
            section: 'ICT-11A',
            room: 'Room 301',
            sharedKey: 'Grade 11 - ICT A::Programming 1',
            students: 38,
            schedule: 'Mon / Wed / Fri   8:00   9:30 AM',
            icon: 'fa-solid fa-code',
            bgColor: 'bg-[#15803d]',
            color: 'text-icc',
            topicColor: 'bg-icc-light'
        },
        'card-webdev': {
            subject: 'Web Development 1',
            teacher: 'Sarah Lim',
            section: 'ICT-11A',
            room: 'Lab 2',
            sharedKey: 'ICT-11A::Web Development 1',
            students: 38,
            schedule: 'Tue / Thu   9:45   11:15 AM',
            icon: 'fa-solid fa-globe',
            bgColor: 'bg-[#FFD000]',
            color: 'text-blue-600',
            topicColor: 'bg-blue-50'
        },
        'card-database': {
            subject: 'Database Management 1',
            teacher: 'Elena Reyes',
            section: 'ICT-11A',
            room: 'Lab 1',
            sharedKey: 'Grade 11 - ICT A::Database Management',
            students: 40,
            schedule: 'Mon / Wed   11:30 AM   1:00 PM',
            icon: 'fa-solid fa-database',
            bgColor: 'bg-[#78350f]',
            color: 'text-orange-600',
            topicColor: 'bg-orange-50'
        },
        'card-empowerment': {
            subject: 'Empowerment Technology',
            teacher: 'Roberto Diaz',
            section: 'ICT-11A',
            room: 'Room 304',
            sharedKey: 'ICT-11A::Empowerment Technology',
            students: 42,
            schedule: 'Tue / Thu   1:30   3:00 PM',
            icon: 'fa-solid fa-laptop-code',
            bgColor: 'bg-[#15803d]',
            color: 'text-emerald-600',
            topicColor: 'bg-emerald-50'
        },
        'card-stats': {
            subject: 'Statistics & Probability',
            teacher: 'Jennifer Santos',
            section: 'ICT-11A',
            room: 'Room 406',
            sharedKey: 'ICT-11A::Statistics & Probability',
            students: 38,
            schedule: 'Mon / Wed   3:15   4:45 PM',
            icon: 'fa-solid fa-chart-column',
            bgColor: 'bg-[#15803d]',
            color: 'text-rose-600',
            topicColor: 'bg-rose-50'
        },
        'card-introcomp': {
            subject: 'Intro to Computing',
            teacher: 'Alex Reyes',
            section: 'ICT-11A',
            room: 'Lab 1',
            sharedKey: 'ICT-11A::Intro to Computing',
            students: 40,
            schedule: 'Mon / Wed / Fri   8:00   9:30 AM',
            icon: 'fa-solid fa-desktop',
            bgColor: 'bg-[#FFD000]',
            color: 'text-indigo-600',
            topicColor: 'bg-indigo-50'
        },
        'card-animation': {
            subject: 'Animation',
            teacher: 'Elena Reyes',
            section: 'ICT-11A',
            room: 'Lab 3',
            sharedKey: 'Grade 11 - ICT B::Animation',
            students: 36,
            schedule: 'Tue / Thu   1:30   3:00 PM',
            icon: 'fa-solid fa-palette',
            bgColor: 'bg-[#78350f]',
            color: 'text-pink-600',
            topicColor: 'bg-pink-50'
        },
        'card-system': {
            subject: 'System Architecture',
            teacher: 'Roberto Diaz',
            section: 'ICT-11A',
            room: 'Room 305',
            sharedKey: 'ICT-11A::System Architecture',
            students: 39,
            schedule: 'Tue / Thu   10:30 AM   12:00 PM',
            icon: 'fa-solid fa-sitemap',
            bgColor: 'bg-[#78350f]',
            color: 'text-slate-700',
            topicColor: 'bg-slate-100'
        },
        'card-genmath': {
            subject: 'General Mathematics',
            teacher: 'Jose Santos',
            section: 'STEM A',
            room: 'Room 406',
            sharedKey: 'Grade 11 - STEM A::General Mathematics',
            students: 42,
            schedule: 'Mon / Wed / Fri   1:00   2:30 PM',
            icon: 'fa-solid fa-infinity',
            bgColor: 'bg-[#15803d]',
            color: 'text-indigo-600',
            topicColor: 'bg-indigo-50'
        },
        'card-oralcomm': {
            subject: 'Oral Communication',
            teacher: 'Ana Reyes',
            section: 'ICT A',
            room: 'Room 204',
            sharedKey: 'Grade 11 - ICT A::Oral Communication',
            students: 35,
            schedule: 'Tue / Thu   8:00   9:30 AM',
            icon: 'fa-solid fa-comments',
            bgColor: 'bg-[#15803d]',
            color: 'text-icc',
            topicColor: 'bg-icc-light'
        }
    };

    function formatClockValue(value, fallbackMeridiem = '') {
        const raw = String(value || '').trim();
        if (!raw) return '';
        const match = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
        if (!match) return raw;
        let hour = Number(match[1]);
        const minute = match[2] || '00';
        let meridiem = (match[3] || fallbackMeridiem || '').toUpperCase();
        if (!meridiem) meridiem = hour >= 12 ? 'PM' : 'AM';
        if (hour > 12) hour -= 12;
        if (hour === 0) hour = 12;
        return `${hour}:${minute} ${meridiem}`;
    }

    function clockValueToMinutes(value, fallbackMeridiem = '') {
        const raw = String(value || '').trim();
        const match = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
        if (!match) return 0;
        let hour = Number(match[1]);
        const minute = Number(match[2] || '00');
        const meridiem = (match[3] || fallbackMeridiem || '').toUpperCase();
        if (meridiem === 'PM' && hour < 12) hour += 12;
        if (meridiem === 'AM' && hour === 12) hour = 0;
        return (hour * 60) + minute;
    }

    function parseClassSchedule(schedule) {
        const value = String(schedule || '').replace(/\s+/g, ' ').trim();
        const matches = [...value.matchAll(/(\d{1,2}:\d{2})\s*(AM|PM)?/gi)];
        if (matches.length < 2) {
            return { days: value, start: '', end: '', label: value || 'Schedule TBA', startMinutes: 0 };
        }
        const startPeriod = (matches[0][2] || matches[1][2] || '').toUpperCase();
        const endPeriod = (matches[1][2] || startPeriod || '').toUpperCase();
        const days = value.slice(0, matches[0].index).trim();
        const start = formatClockValue(matches[0][1], startPeriod || endPeriod);
        const end = formatClockValue(matches[1][1], endPeriod);
        return {
            days,
            start,
            end,
            label: `${start} - ${end}`,
            startMinutes: clockValueToMinutes(matches[0][1], startPeriod || endPeriod)
        };
    }

    function getStudentSectionClassItems() {
        return Object.entries(classroomData || {}).map(([id, data]) => {
            const schedule = parseClassSchedule(data.schedule);
            return {
                id,
                subject: data.subject || 'Subject',
                section: data.section || currentStudentSection || 'Section',
                room: data.room || 'Room TBA',
                teacher: data.teacher || '',
                schedule,
                schoolYear: data.schoolYear || '2026-2027',
                bgColor: data.bgColor || 'bg-[#15803d]'
            };
        }).sort((a, b) => a.schedule.startMinutes - b.schedule.startMinutes || a.subject.localeCompare(b.subject));
    }

    function getStudentUpcomingSectionClasses(limit = 2) {
        const classes = getStudentSectionClassItems();
        if (!classes.length) return [];
        const now = new Date();
        const nowMinutes = (now.getHours() * 60) + now.getMinutes();
        const startIndex = classes.findIndex(item => item.schedule.startMinutes >= nowMinutes);
        const initialIndex = startIndex >= 0 ? startIndex : 0;
        return Array.from({ length: Math.min(limit, classes.length) }, (_, index) => classes[(initialIndex + index) % classes.length]);
    }

    function formatHomeAssessmentWhen(date) {
        if (!date) return 'Due date TBA';
        const d = date instanceof Date ? date : new Date(date);
        if (Number.isNaN(d.getTime())) return String(date);
        const today = new Date();
        const sameDay = d.toDateString() === today.toDateString();
        const dateLabel = sameDay ? 'Due Today' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const timeLabel = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${dateLabel} ${timeLabel}`;
    }

    function getStudentDueSubmissionItems(limit = 3) {
        const dueStatuses = new Set(['overdue']);
        return buildAssessmentRows()
            .filter(row => dueStatuses.has(row.status))
            .sort((a, b) => a.dueDate - b.dueDate)
            .slice(0, limit);
    }

    function getStudentUpcomingSubmissionItems(limit = 3) {
        return buildAssessmentRows()
            .filter(row => row.status === 'not-started')
            .sort((a, b) => a.dueDate - b.dueDate)
            .slice(0, limit);
    }

    function renderStudentHomeDashboardPanels() {
        const nextList = document.getElementById('student-home-next-class-list');
        const dueList = document.getElementById('student-home-due-submission-list');
        if (!nextList && !dueList) return;

        if (nextList) {
            const classes = getStudentUpcomingSectionClasses(2);
            nextList.innerHTML = classes.length ? `
                <div class="home-dashboard-card home-dashboard-card--combined">
                    ${classes.map((item, index) => `
                        <div class="home-dashboard-item">
                            <span class="home-dashboard-card__eyebrow">${index === 0 ? 'Next Class' : 'Upcoming Class'}</span>
                            <button type="button" class="home-dashboard-subject-link" data-home-classroom-id="${escapeHtml(item.id)}">${escapeHtml(item.subject)}</button>
                            <span class="home-dashboard-card__meta">${escapeHtml(item.section)}</span>
                            <span class="home-dashboard-card__meta">${escapeHtml(item.room)}</span>
                            <span class="home-dashboard-card__time">${escapeHtml(item.schedule.label)}</span>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="home-dashboard-card">
                    <strong class="home-dashboard-card__title">No scheduled class</strong>
                    <span class="home-dashboard-card__meta">Sections will appear here once assigned.</span>
                </div>
            `;
            nextList.querySelectorAll('[data-home-classroom-id]').forEach(card => {
                card.addEventListener('click', () => showClassroomDetail(card.dataset.homeClassroomId));
            });
        }

        if (dueList) {
            const dueItems = getStudentDueSubmissionItems(3);
            const upcomingItems = getStudentUpcomingSubmissionItems(3);

            if (dueItems.length === 0 && upcomingItems.length === 0) {
                dueList.innerHTML = `
                    <div class="home-dashboard-card">
                        <h3 class="home-dashboard-panel-heading">DUE SUBMISSIONS</h3>
                        <strong class="home-dashboard-card__title">No submissions</strong>
                        <span class="home-dashboard-card__meta">You are clear for now.</span>
                        <h3 class="home-dashboard-panel-heading home-dashboard-panel-heading--spaced">UPCOMING SUBMISSIONS</h3>
                        <strong class="home-dashboard-card__title">No upcoming items</strong>
                        <span class="home-dashboard-card__meta">Check back later for new tasks.</span>
                    </div>
                `;
            } else {
                let html = '<div class="home-dashboard-card home-dashboard-card--combined">';

                // Section 1: Due Submissions
                html += `<h3 class="home-dashboard-panel-heading">DUE SUBMISSIONS</h3>`;
                if (dueItems.length > 0) {
                    html += dueItems.map(row => `
                        <div class="home-dashboard-item">
                            <div class="home-dashboard-card__row">
                                <strong class="home-dashboard-card__title">${escapeHtml(row.activity)}</strong>
                                <span class="home-dashboard-badge home-dashboard-badge--danger">Due</span>
                            </div>
                            <button type="button" class="home-dashboard-subject-link home-dashboard-subject-link--meta" data-home-assessment-subject="${escapeHtml(row.subjectId)}" data-home-assessment-topic="${row.topicIdx}">${escapeHtml(row.subject)}</button>
                            <span class="home-dashboard-card__time">${escapeHtml(formatHomeAssessmentWhen(row.dueDate))}</span>
                        </div>
                    `).join('');
                } else {
                    html += `<div class="home-dashboard-item"><strong class="home-dashboard-card__title">No submissions</strong><span class="home-dashboard-card__meta">You are clear for now.</span></div>`;
                }

                // Section 2: Upcoming Submissions
                html += `<h3 class="home-dashboard-panel-heading home-dashboard-panel-heading--spaced">UPCOMING SUBMISSIONS</h3>`;
                if (upcomingItems.length > 0) {
                    html += upcomingItems.map(row => `
                        <div class="home-dashboard-item">
                            <div class="home-dashboard-card__row">
                                <strong class="home-dashboard-card__title">${escapeHtml(row.activity)}</strong>
                                <span class="home-dashboard-badge home-dashboard-badge--info">Upcoming</span>
                            </div>
                            <button type="button" class="home-dashboard-subject-link home-dashboard-subject-link--meta" data-home-assessment-subject="${escapeHtml(row.subjectId)}" data-home-assessment-topic="${row.topicIdx}">${escapeHtml(row.subject)}</button>
                            <span class="home-dashboard-card__time">${escapeHtml(formatHomeAssessmentWhen(row.dueDate))}</span>
                        </div>
                    `).join('');
                } else {
                    html += `<div class="home-dashboard-item"><strong class="home-dashboard-card__title">No upcoming items</strong><span class="home-dashboard-card__meta">Check back later.</span></div>`;
                }

                html += '</div>';
                dueList.innerHTML = html;
            }

            dueList.querySelectorAll('[data-home-assessment-subject]').forEach(card => {
                card.addEventListener('click', () => window.openTopicContent(card.dataset.homeAssessmentSubject, Number(card.dataset.homeAssessmentTopic || 0), 'activity'));
            });
        }

    }

    const classroomTopicSourceById = {
        'card-prog1': 'card-prog1',
        'card-webdev': 'card-webdev',
        'card-database': 'card-database',
        'card-empowerment': 'card-empowerment',
        'card-stats': 'gen-statistics-probability',
        'card-introcomp': 'card-introcomp',

        'card-animation': 'card-animation',

        'card-system': 'card-sysarch',

        'card-genmath': 'core-general-mathematics',

        'card-oralcomm': 'card-oralcomm'

    };
    const classroomTopicSourceBySubject = {
        'computer programming 1': 'card-prog1',
        'web development 1': 'card-webdev',
        'database management 1': 'card-database',
        'empowerment technology': 'card-empowerment',
        'empowerment technologies': 'card-empowerment',
        'statistics & probability': 'gen-statistics-probability',
        'statistics and probability': 'gen-statistics-probability',
        'intro to computing': 'card-introcomp',
        'animation': 'card-animation',
        'system architecture': 'card-sysarch',
        'general mathematics': 'core-general-mathematics',
        'oral communication': 'card-oralcomm'
    };
    function normalizeTopicSubjectTitle(value) {
        return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
    }
    function findTopicSourceIdByTitle(title) {
        const normalizedTitle = normalizeTopicSubjectTitle(title);
        if (!normalizedTitle) return '';
        const aliasId = classroomTopicSourceBySubject[normalizedTitle];
        if (aliasId) return aliasId;
        const catalogMatch = Object.entries(curriculumTopicCatalog).find(([, item]) => (
            normalizeTopicSubjectTitle(item?.text || item?.title) === normalizedTitle
        ));
        if (catalogMatch) return catalogMatch[0];
        const detailMatch = Object.entries(subjectDetails || {}).find(([, item]) => (
            normalizeTopicSubjectTitle(item?.text || item?.title) === normalizedTitle
        ));
        if (detailMatch) return detailMatch[0];
        return '';
    }
    function resolveClassroomTopicSourceId(classroomId, classroom = classroomData[classroomId]) {
        const mappedId = classroomTopicSourceById[classroomId];
        if (mappedId && getTopicData(mappedId)) return mappedId;
        const titleMatchedId = findTopicSourceIdByTitle(classroom?.subject);
        if (titleMatchedId && getTopicData(titleMatchedId)) return titleMatchedId;
        if (getTopicData(classroomId)) return classroomId;
        const fallbackId = mappedId || titleMatchedId;
        if (fallbackId && classroom?.subject) {
            ensureSubjectDataForTitle(classroom.subject, 'Subjects');
            if (getTopicData(fallbackId)) return fallbackId;
        }
        if (classroom?.subject) return ensureSubjectDataForTitle(classroom.subject, 'Subjects').id;
        return classroomId;
    }
    function resolveHomeSubjectTopicSourceId(subjectId, subjectTitle = '') {
        const mappedId = classroomTopicSourceById[subjectId];
        if (mappedId && getTopicData(mappedId)) return mappedId;
        const titleMatchedId = findTopicSourceIdByTitle(subjectTitle);
        if (titleMatchedId && getTopicData(titleMatchedId)) return titleMatchedId;
        if (getTopicData(subjectId)) return subjectId;
        if (mappedId && subjectTitle) {
            ensureSubjectDataForTitle(subjectTitle, 'Subjects');
            if (getTopicData(mappedId)) return mappedId;
        }
        if (subjectTitle) return ensureSubjectDataForTitle(subjectTitle, 'Subjects').id;
        return mappedId || subjectId;
    }
    function getStudentVisibleAdminAnnouncements() {
        return getAdminAnnouncements()

            .filter(post => ['all', 'students', 'specific'].includes(post?.audience || 'all'))

            .map(post => ({

                id: post.id || `admin-${post.createdAt || Date.now()}`,

                kind: 'admin',

                priority: post.type === 'urgent' ? 'Important' : 'Admin Update',

                channelLabel: 'Admin Announcement',

                title: post.title || 'School Announcement',

                bodyHtml: formatAdminAnnouncementBody(post.body || ''),

                bodyText: String(post.body || '').trim(),

                author: post.author || 'Admin Office',

                meta: getAdminAnnouncementAudienceLabel(post.audience),

                stamp: formatAnnouncementTimestamp(post.createdAt),

                sortValue: parseAnnouncementDateValue(post.createdAt),

                type: post.type || 'regular'

            }));

    }
    function getAdminAnnouncementAudienceLabel(audience) {
        return {

            all: 'All Roles',

            students: 'Students',

            teachers: 'Teachers',

            specific: 'Specific Strand / Dept'

        }[audience] || 'All Roles';

    }
    function getTeacherSectionAnnouncements() {
        return Object.entries(classroomData)

            .filter(([, data]) => data.section === currentStudentSection)

            .flatMap(([classroomId, data]) => {
                const posts = getSharedAnnouncements(data.sharedKey || classroomId, classroomAnnouncementById[classroomId] || []);
                return posts.map((post, index) => ({

                    id: buildAnnouncementId(data.sharedKey || classroomId, post, index),

                    kind: 'teacher',

                    priority: 'Section Update',

                    channelLabel: 'Teacher Announcement',

                    title: data.subject,

                    bodyHtml: post.html || `<p>${escapeHtml(post.text || '')}</p>`,

                    bodyText: stripHtmlTags(post.html || post.text || ''),

                    author: post.author || data.teacher,

                    meta: `${data.section}   ${data.subject}`,

                    stamp: formatAnnouncementTimestamp(post.createdAt || post.timestamp),

                    sortValue: parseAnnouncementDateValue(post.createdAt || post.timestamp),

                    type: 'regular'

                }));

            });

    }
    function getStudentHomeAnnouncements(tab = activeHomeAnnouncementTab) {
        const adminPosts = getStudentVisibleAdminAnnouncements();
        const teacherPosts = getTeacherSectionAnnouncements();
        if (tab === 'important') {
            return [...adminPosts, ...teacherPosts]

                .filter(p => p.type === 'urgent' || p.isImportant)

                .sort((a, b) => b.sortValue - a.sortValue);

        }
        // overall / default

        return [...adminPosts, ...teacherPosts].sort((a, b) => b.sortValue - a.sortValue);

    }
    function renderStudentHomeAnnouncements() {
        const feed = document.getElementById('admin-announcements-feed');
        if (!feed) return;
        const adminPosts = JSON.parse(localStorage.getItem('sigma-admin-announcements-v1') || '[]');
        let filtered = adminPosts;
        if (activeHomeAnnouncementTab === 'important') {

            filtered = adminPosts.filter(p => p.type === 'urgent' || p.isImportant);

        }
        else if (activeHomeAnnouncementTab === 'posts') {

            filtered = adminPosts.filter(p => !p.isAdmin);

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
            const isTeacher = !post.isAdmin;
            const [gradeSection, subjectName] = (post.classroomKey || '').split('::');
            const roleLabel = isTeacher ? 'Teacher' : 'Administrator';
            const roleClass = isTeacher ? 'text-slate-400' : 'text-slate-400';
            const fullBody = post.body || '';
            const hasImage = post.imageUrl && post.imageUrl.trim() !== '';
            const hasText = (post.title && post.title.trim() !== '') || (fullBody.trim() !== '');
            // Layout logic
            const isMobile = window.innerWidth < 1024;
            let cardHeight = "h-auto";
            let isImageOnly = false;
            let isImageWithText = false;

            if (!isMobile) {
                if (hasImage && hasText) {
                    cardHeight = "h-auto";
                    isImageWithText = true;
                } else if (hasImage && !hasText) {
                    cardHeight = "h-auto";
                    isImageOnly = true;
                } else {
                    cardHeight = "h-auto";
                }
            } else {
                cardHeight = "h-auto";
                if (hasImage && hasText) isImageWithText = true;
                else if (hasImage && !hasText) isImageOnly = true;
            }
            const textLimit = isMobile ? (isImageWithText ? 25 : 80) : (isImageWithText ? 30 : 100);
            const isLong = fullBody.length > textLimit;
            const truncatedBody = isLong ? fullBody.substring(0, textLimit) + '...' : fullBody;
            const formattedFull = escapeHtml(fullBody).replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
            const formattedTruncated = escapeHtml(truncatedBody).replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
            return `

                <article id="${post.id}" 
                         data-original-height="${cardHeight}"
                         class="announcement-card bg-white border border-slate-200 rounded-[22px] relative w-full ${cardHeight} overflow-hidden group standard-panel-shadow">

                    <div class="p-8 pb-6 flex flex-col min-w-0">

                        <div class="flex items-start justify-between mb-4 mt-6">

                            <div class="flex items-center gap-3">

                                <div class="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">

                                    <i class="fa-solid fa-user text-xs text-black"></i>

                                </div>

                                <div class="flex flex-col">

                                    <span class="text-[12px] font-black text-slate-900 leading-none mb-1">${escapeHtml(post.author || 'Institutional Member')}</span>

                                    <span class="text-[9px] font-bold ${roleClass}">${roleLabel}</span>

                                </div>

                            </div>

                            <div class="flex flex-col items-end gap-1">

                                <span class="text-[10px] font-medium text-slate-400 tracking-tight">${formatAnnouncementTimestamp(post.createdAt)}</span>

                            </div>

                        </div>



                        ${hasText ? `

                            <div class="space-y-1 pl-[3.25rem] relative z-20 ${hasImage ? 'pb-6' : ''}">

                                <h3 class="text-[20px] lg:text-[22px] font-bold text-slate-900 leading-tight ${isImageWithText ? 'line-clamp-2' : 'line-clamp-1'} text-left">${escapeHtml(subjectName || post.title)}</h3>
                                ${gradeSection ? `<p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">${escapeHtml(gradeSection)}</p>` : ''}

                                <div class="relative">

                                    <p class="announcement-body text-[15px] lg:text-[16px] text-black leading-relaxed font-normal text-left" 

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
                        <div class="announcement-image-container relative w-full overflow-hidden border-t border-slate-100 bg-white">
                            <img src="${post.imageUrl}" 
                                 onclick="enlargeAnnouncementImage('${post.imageUrl}')" 
                                 class="w-full h-auto max-h-[420px] object-contain cursor-pointer" 
                                 alt="Announcement Image">
                        </div>
                    ` : ''}

                    <div class="h-[52px] px-6 border-t border-slate-100 bg-white flex items-center justify-end z-10">
                    </div>
                </article>

            `;

        }).join('');

    }
    window.toggleAnnouncement = function (id) {
        const art = document.getElementById(id);
        if (!art) return;
        const p = art.querySelector('.announcement-body');
        const btn = art.querySelector('.see-more-btn');
        if (!p || !btn) return;
        const isExpanded = art.classList.contains('h-auto');
        if (!isExpanded) {
            p.innerHTML = p.dataset.full + ` <span onclick="toggleAnnouncement('${id}')" class="see-more-btn cursor-pointer font-bold text-slate-900 hover:underline ml-1">See less</span>`;
            if (art.dataset.originalHeight) {
                art.classList.remove(art.dataset.originalHeight);
            }
            art.classList.add('h-auto');
        } else {
            p.innerHTML = p.dataset.truncated + ` <span onclick="toggleAnnouncement('${id}')" class="see-more-btn cursor-pointer font-bold text-slate-900 hover:underline ml-1">See more</span>`;
            art.classList.remove('h-auto');
            if (art.dataset.originalHeight) {
                art.classList.add(art.dataset.originalHeight);
            }
        }
    };
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
    // Announcement Tabs Event Listeners

    ['all', 'important', 'posts'].forEach(tabId => {
        const btn = document.getElementById(`announcement-tab-${tabId}`);
        if (btn) {

            btn.onclick = () => {

                activeHomeAnnouncementTab = tabId;

                ['all', 'important', 'posts'].forEach(t => {
                    const b = document.getElementById(`announcement-tab-${t}`);
                    if (b) {

                        b.classList.remove('bg-[#15803d]', 'text-white', 'shadow-sm');

                        b.classList.add('text-slate-900', 'hover:bg-slate-50');

                    }

                });

                btn.classList.remove('text-slate-900', 'hover:bg-slate-50');

                btn.classList.add('bg-[#15803d]', 'text-white', 'shadow-sm');

                renderStudentHomeAnnouncements();

            };

        }

    });
    let activeStudentClassroomId = '';
    let activeStudentRoomTab = 'room';
    function getStudentClassroomCards() {
        return Object.entries(classroomData || {})
            .map(([id, data]) => ({ id, ...data }))
            .sort((left, right) => String(left.subject || '').localeCompare(String(right.subject || '')));
    }
    function getStudentRoomSubtitle(data) {
        return `${data.section || 'Section'} - ${data.room || 'Room'}`.trim();
    }
    function ensureStudentSectionsSubmenu() {
        const parent = document.getElementById('nav-classrooms');
        if (!parent) return null;

        parent.classList.add('nav-link--group');
        if (!parent.querySelector('.sidebar-group-chevron')) {
            const chevron = document.createElement('i');
            chevron.className = 'fa-solid fa-chevron-right sidebar-group-chevron';
            parent.appendChild(chevron);
        }
        let submenu = document.getElementById('student-sections-submenu');
        if (!submenu) {
            submenu = document.createElement('div');
            submenu.id = 'student-sections-submenu';
            submenu.className = 'sidebar-submenu hidden student-section-nav-children';
            parent.insertAdjacentElement('afterend', submenu);
        }
        return submenu;
    }
    function renderStudentSectionsNavChildren(activeClassroomId = activeStudentClassroomId) {
        const submenu = ensureStudentSectionsSubmenu();
        if (!submenu) return;

        submenu.innerHTML = getStudentClassroomCards().map(card => {
            const active = card.id === activeClassroomId;
            return `
                <button type="button"
                    class="student-section-room-link ${active ? 'active' : ''}"
                    data-classroom-id="${card.id}">
                    <i class="fa-solid fa-door-open student-section-room-link__icon"></i>
                    <span class="student-section-room-link__content">
                        <span class="student-section-room-link__title">${card.subject}</span>
                        <span class="student-section-room-link__meta">${getStudentRoomSubtitle(card)}</span>
                    </span>
                </button>
            `;
        }).join('');

        submenu.querySelectorAll('[data-classroom-id]').forEach(button => {
            button.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                // Close mobile sidebar when selecting a section room
                if (window.innerWidth < 1024) {
                    const sidebar = document.getElementById('sidebar');
                    const sidebarOverlay = document.getElementById('sidebar-overlay');
                    if (sidebar) sidebar.classList.remove('sidebar-visible');
                    if (sidebarOverlay) sidebarOverlay.classList.add('hidden');
                }
                showClassroomDetail(button.dataset.classroomId);
            });
        });
    }
    function syncStudentSectionsNavState(showChildren = Boolean(activeStudentClassroomId)) {
        const parent = document.getElementById('nav-classrooms');
        const submenu = ensureStudentSectionsSubmenu();
        if (!parent || !submenu) return;
        const isCollapsed = document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;
        const isGridVisible = !document.getElementById('section-classrooms')?.classList.contains('hidden');
        const isDetailVisible = isStudentClassroomDetailVisible();
        const shouldShowChildren = showChildren && isDetailVisible;
        if (shouldShowChildren) {
            document.querySelectorAll('#sidebar .nav-link, #sidebar .nav-sublink').forEach(link => {
                if (link !== parent) link.classList.remove('active');
            });
        }

        parent.classList.toggle('active', isGridVisible || isDetailVisible);
        parent.classList.toggle('open', shouldShowChildren && !isCollapsed);
        const chevron = parent.querySelector('.sidebar-group-chevron');
        if (chevron) {
            chevron.classList.toggle('hidden', !isDetailVisible);
            chevron.classList.toggle('rotate-90', shouldShowChildren && !isCollapsed);
        }

        submenu.classList.toggle('hidden', !shouldShowChildren || isCollapsed);
    }
    function isStudentClassroomDetailVisible() {
        const detailSection = document.getElementById('section-classroom-detail');
        return Boolean(activeStudentClassroomId && detailSection && !detailSection.classList.contains('hidden'));
    }
    function hideStudentClassroomSectionsSidebar() {
        const subSidebar = document.getElementById('sub-sidebar');
        const content = document.getElementById('sub-sidebar-content');
        const header = document.getElementById('sub-sidebar-header');
        const submenu = ensureStudentSectionsSubmenu();
        if (submenu) {
            submenu.innerHTML = '';
            submenu.classList.add('hidden');
        }
        const parent = document.getElementById('nav-classrooms');
        parent?.classList.remove('open');
        parent?.querySelector('.sidebar-group-chevron')?.classList.remove('rotate-90');
        if (subSidebar) {
            subSidebar.classList.add('hidden');
            subSidebar.classList.remove('sub-sidebar-visible');
        }
        if (content) content.innerHTML = '';
        header?.classList.add('hidden');
        document.body.classList.remove('sub-sidebar-open');
    }
    function renderStudentClassroomSectionsSidebar(activeClassroomId = activeStudentClassroomId, showCollapsedOverlay = true) {
        const subSidebar = document.getElementById('sub-sidebar');
        const content = document.getElementById('sub-sidebar-content');
        const title = document.getElementById('sub-sidebar-title');
        const header = document.getElementById('sub-sidebar-header');
        if (!subSidebar || !content) return;

        renderStudentSectionsNavChildren(activeClassroomId);
        syncStudentSectionsNavState(true);
        const isCollapsed = document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;
        if (!isStudentClassroomDetailVisible()) {
            hideStudentClassroomSectionsSidebar();
            updateLayout();
            return;
        }
        // If sidebar is expanded (not collapsed), hide the sub-sidebar
        if (!isCollapsed) {
            subSidebar.classList.add('hidden');
            subSidebar.classList.remove('sub-sidebar-visible');
            document.body.classList.remove('sub-sidebar-open');
            updateLayout();
            return;
        }

        // If explicitly asked to stay hidden (e.g. on refresh/load), hide it
        if (!showCollapsedOverlay) {
            subSidebar.classList.add('hidden');
            subSidebar.classList.remove('sub-sidebar-visible');
            document.body.classList.remove('sub-sidebar-open');
            updateLayout();
            return;
        }
        if (title) title.textContent = 'Sections';
        header?.classList.remove('hidden');
        content.innerHTML = `
            <div class="student-section-room-list">
                ${getStudentClassroomCards().map(card => `
                    <button type="button"
                        class="student-section-room-link ${card.id === activeClassroomId ? 'active' : ''}"
                        data-classroom-id="${card.id}">
                        <i class="fa-solid fa-door-open student-section-room-link__icon"></i>
                        <span class="student-section-room-link__content">
                            <span class="student-section-room-link__title">${card.subject}</span>
                            <span class="student-section-room-link__meta">${getStudentRoomSubtitle(card)}</span>
                        </span>
                    </button>
                `).join('')}
            </div>
        `;

        content.querySelectorAll('[data-classroom-id]').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showClassroomDetail(button.dataset.classroomId);
            });
        });

        subSidebar.classList.remove('hidden');
        subSidebar.classList.add('sub-sidebar-visible');
        document.body.classList.add('sub-sidebar-open');
        updateLayout();
        // Sync Sections chevron visibility
        if (typeof syncSectionsNavState === 'function') {
            syncSectionsNavState();
        }
    }
    // Track whether the student sections inline submenu is open
    let studentSectionsSubmenuOpen = true;

    document.getElementById('nav-classrooms')?.addEventListener('click', event => {
        const isMobile = window.innerWidth < 1024;
        const hasChildren = isStudentClassroomDetailVisible();

        if (isMobile && !hasChildren) {
            // No child items: close sidebar like a normal nav link
            const sidebar = document.getElementById('sidebar');
            const sidebarOverlay = document.getElementById('sidebar-overlay');
            if (sidebar) sidebar.classList.remove('sidebar-visible');
            if (sidebarOverlay) sidebarOverlay.classList.add('hidden');
            return;
        }

        if (!hasChildren) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const isCollapsed = document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;

        if (isCollapsed) {
            // Collapsed desktop sidebar: show overlay sub-sidebar
            renderStudentClassroomSectionsSidebar(activeStudentClassroomId, true);
        } else {
            // Expanded or mobile with children: toggle the inline submenu
            studentSectionsSubmenuOpen = !studentSectionsSubmenuOpen;
            renderStudentSectionsNavChildren(activeStudentClassroomId);
            syncStudentSectionsNavState(studentSectionsSubmenuOpen);
        }
        // On mobile with children, keep sidebar open (do NOT close it)
    }, true);
    document.getElementById('nav-classrooms')?.addEventListener('mouseenter', () => {
        const isCollapsed = document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;
        if (!isStudentClassroomDetailVisible() || !isCollapsed) return;
        renderStudentClassroomSectionsSidebar(activeStudentClassroomId, true);
    });
    function getClassroomMaterialTopics(classroomId) {
        const sourceId = resolveClassroomTopicSourceId(classroomId);
        const data = getTopicData(sourceId);
        return {

            sourceId,

            topics: data?.q1Topics || []

        };

    }
    function renderStudentRoomPanel(classroomId, data, announcements) {
        if (activeStudentRoomTab === 'attendance') {
            return `
                <div class="student-room-panel student-room-attendance pb-8">
                    <div class="overflow-x-auto">
                        <table class="w-full border-collapse">
                            <thead>
                                <tr class="border-b border-slate-300 relative z-10">
                                    <th class="py-4 text-[11px] font-black text-black uppercase tracking-widest text-center">Date</th>
                                    <th class="py-4 text-[11px] font-black text-black uppercase tracking-widest text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody id="classroom-attendance-history-body" class="divide-y divide-slate-200"></tbody>
                        </table>
                    </div>
                    <div class="flex items-center justify-center mt-6">
                        <div id="classroom-attendance-pagination-controls" class="flex items-center gap-2"></div>
                    </div>
                    <div id="classroom-attendance-empty-state" class="hidden p-20 text-center">
                        <i class="fa-solid fa-calendar-xmark text-4xl text-gray-200 mb-4 block"></i>
                        <p class="text-sm font-medium text-gray-400 italic">No records found for this subject.</p>
                    </div>
                </div>
            `;
        }
        if (activeStudentRoomTab === 'materials') {
            const materialData = getClassroomMaterialTopics(classroomId);
            const releasedTopics = materialData.topics

                .map((topic, idx) => ({ topic, idx }))

                .filter(({ topic }) => topic.status !== 'not-started' && topic.status !== 'locked');
            const materialCards = releasedTopics.length

                ? releasedTopics.map(({ topic, idx }) => {
                    const released = true;
                    const isLecture = idx % 2 === 1;
                    const materialLabel = isLecture ? 'Lecture' : `Module ${idx + 1}`;
                    const materialMeta = isLecture ? 'Video   15:20   Updated 1 week ago' : 'PDF   2.4 MB   Updated 2 days ago';
                    const iconWrapClass = isLecture

                        ? 'student-room-material-card__icon-wrap student-room-material-card__icon-wrap--video'

                        : 'student-room-material-card__icon-wrap student-room-material-card__icon-wrap--pdf';
                    const iconClass = isLecture ? 'fa-solid fa-video' : 'fa-solid fa-file-pdf';
                    return `

                        <article class="student-room-material-card ${released ? 'student-room-material-card--released' : 'student-room-material-card--locked'}"

                            ${released ? `data-topic-subject-id="${materialData.sourceId}" data-topic-index="${idx}"` : ''}>

                            <div class="student-room-material-card__head">

                                <div class="${iconWrapClass}">

                                    <i class="${iconClass}"></i>

                                </div>

                                <span class="student-room-material-card__label">${materialLabel}</span>

                            </div>

                            <h3 class="student-room-material-card__title">${topic.title}</h3>

                            <p class="student-room-material-card__meta">${materialMeta}</p>

                            <div class="student-room-material-card__footer">

                                <span class="student-room-material-card__status ${released ? 'student-room-material-card__status--released' : 'student-room-material-card__status--locked'}">${released ? 'Published' : 'Not released'}</span>

                                <div class="student-room-material-card__actions">

                                    <button type="button"

                                        class="student-room-material-card__action"

                                        onclick="event.stopPropagation()"

                                        ${released ? `data-topic-subject-id="${materialData.sourceId}" data-topic-index="${idx}"` : 'disabled'}

                                        aria-label="${released ? 'Open topic contents' : 'Material not released'}">

                                        <i class="${isLecture ? 'fa-solid fa-play' : 'fa-solid fa-download'}"></i>

                                    </button>

                                    <button type="button"

                                        class="student-room-material-card__action"

                                        onclick="event.stopPropagation()"

                                        ${released ? `data-topic-subject-id="${materialData.sourceId}" data-topic-index="${idx}"` : 'disabled'}

                                        aria-label="Open more topic contents">

                                        <i class="fa-solid fa-ellipsis-vertical"></i>

                                    </button>

                                </div>

                            </div>

                        </article>

                    `;

                }).join('')

                : `

                    <article class="student-room-feed-card student-room-feed-card--empty">

                        <div class="student-room-feed-card__body">

                            <p>No released materials yet.</p>

                        </div>

                    </article>

                `;
            return `<div class="student-room-panel student-room-materials"><div class="student-room-materials-grid">${materialCards}</div></div>`;

        }
        const commentsEnabled = getSharedCommentMode(data.sharedKey) === 'enabled';
        const announcementFeed = announcements.length

            ? announcements.map((post, index) => {
                const postId = buildAnnouncementId(data.sharedKey, post, index);
                const comments = commentsEnabled ? getSharedAnnouncementComments(data.sharedKey, postId) : [];
                return `
                <article class="announcement-card bg-white border border-slate-200 rounded-[22px] relative w-full overflow-hidden transition-all duration-500 mb-3 standard-panel-shadow">
                    <div class="p-8 flex flex-col min-w-0">
                        <!-- Header: avatar + name + date -->
                        <div class="flex items-start justify-between mb-3">
                            <div class="flex items-center gap-3">
                                <div class="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 flex-shrink-0">
                                    <i class="fa-solid fa-user text-xs text-black"></i>
                                </div>
                                <div class="flex flex-col">
                                    <span class="text-[13px] font-black text-slate-900 leading-none mb-0.5">${post.author || 'Teacher'}</span>
                                    <span class="text-[10px] font-bold text-slate-400">Teacher</span>
                                </div>
                            </div>
                            <span class="text-[10px] font-medium text-slate-400 tracking-tight mt-0.5">${formatAnnouncementTimestamp(post.timestamp)}</span>
                        </div>

                        <!-- Subject title + section subtitle -->
                        <div class="mb-3 pl-[3.25rem]">
                            <h3 class="text-[17px] font-black text-slate-900 leading-tight">${data.subject || ''}</h3>
                            ${data.section ? `<p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">${data.section}</p>` : ''}
                        </div>

                        <!-- Post body -->
                        <div class="pl-[3.25rem] text-[15px] text-slate-700 leading-relaxed">${post.html || ''}</div>

                        ${commentsEnabled ? `
                            <div class="mt-6 pt-4 border-t border-slate-50 space-y-3 pl-[3.25rem]">
                                <p class="text-[11px] font-black text-slate-400 uppercase tracking-widest">Comments (${comments.length})</p>
                                <div class="space-y-3">
                                    ${comments.length
                            ? comments.map(comment => `
                                        <div class="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                            <div class="flex items-center justify-between mb-1">
                                                <p class="text-[13px] font-black text-slate-900">${comment.author}</p>
                                                <p class="text-[11px] font-medium text-slate-400">${comment.timestamp}</p>
                                            </div>
                                            <p class="text-[14px] text-slate-600 leading-normal">${comment.text}</p>
                                        </div>
                                    `).join('')
                            : `<p class="text-[13px] italic text-slate-400 opacity-60">No comments yet.</p>`}
                                </div>
                                <div class="flex items-center gap-2 mt-3">
                                    <input type="text" class="flex-1 bg-slate-100 rounded-full px-4 py-2 text-[13px] outline-none placeholder:text-slate-400" data-comment-input="${postId}" placeholder="Write a comment...">
                                    <button type="button" class="px-4 py-2 bg-icc text-white text-[12px] font-bold rounded-full hover:opacity-90 transition-all" data-student-comment-submit="${postId}">Post</button>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </article>
            `;

            }).join('')

            : `
                <article class="announcement-card bg-white border border-slate-200 rounded-[22px] p-8 text-center">
                    <p class="text-[13px] italic text-slate-400 opacity-60">No room announcements yet.</p>
                </article>
            `;
        return `
            <div class="room-announcements-feed">
                ${announcementFeed}
            </div>
        `;

    }

    function renderRoomPeoplePanel(classroomId) {
        const teacherList = document.getElementById('room-teacher-list');
        const studentList = document.getElementById('room-student-list');
        const data = classroomData[classroomId];
        if (!data) return;

        const classmates = classroomPeopleBySection[data.section] || classroomPeopleBySection['ICT-11A'] || [];

        if (teacherList) {
            teacherList.innerHTML = `<button type="button" class="student-room-person">${data.teacher || 'Teacher Name'}</button>`;
        }

        if (studentList) {
            studentList.innerHTML = [...classmates]
                .sort()
                .map(name => {
                    const parts = name.split(', ');
                    const displayName = parts[0] + (parts[1] ? ', ' + parts[1].split(' ')[0] : '');
                    return `<button type="button" class="student-room-person">${displayName}</button>`;
                })
                .join('');
        }
    }
    function showClassroomDetail(classroomId, pushState = true) {
        scrollToTop();
        const data = classroomData[classroomId];
        if (!data) return;
        if (activeStudentClassroomId !== classroomId) {
            activeStudentRoomTab = 'room';
        }

        if (pushState) {
            localStorage.setItem('sigma-student-nav-state', JSON.stringify({ type: 'classroom', classroomId }));
        }
        const content = document.getElementById('classroom-detail-content');
        if (!content) return;
        const classmates = classroomPeopleBySection[data.section] || classroomPeopleBySection['ICT-11A'] || [];
        const announcements = getSharedAnnouncements(data.sharedKey || classroomId, classroomAnnouncementById[classroomId] || []);
        const showPeoplePanel = activeStudentRoomTab === 'room';
        const subjectCoverConfig = getAdminSubjectCoverConfig(data.subject);
        const showBannerImage = subjectCoverConfig?.coverVisibleToUsers !== false;
        const bookImages = ['image/book1.jpg', 'image/book2.jpg', 'image/book3.jpg', 'image/book4.jpg',
            'image/book5.jpg', 'image/book6.jpg', 'image/book7.jpg', 'image/book8.jpg'];
        let _nameHash = 0;
        for (let i = 0; i < (data.subject || '').length; i++) _nameHash += (data.subject || '').charCodeAt(i);
        const defaultBannerImg = bookImages[_nameHash % bookImages.length];
        const bannerImage = subjectCoverConfig?.cover || defaultBannerImg;



        activeStudentClassroomId = classroomId;

        currentStudentAttendance = {

            name: currentStudentName,

            sharedKey: data.sharedKey || classroomId,

            subject: data.subject,

            time: `April 8, 2026   ${data.schedule.split(' ')[1]?.trim() || ''}`.trim()

        };
        // Switch from classrooms grid to classroom detail view
        const sectionClassrooms = document.getElementById('section-classrooms');
        const sectionDetail = document.getElementById('section-classroom-detail');
        if (sectionClassrooms) { sectionClassrooms.classList.add('hidden'); sectionClassrooms.style.display = 'none'; }
        if (sectionDetail) { sectionDetail.classList.remove('hidden'); sectionDetail.style.display = ''; }

        setNavContext('Sections');

        // Ensure the sidebar reflects the correct tab (Sections)
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(l => l.classList.remove('active'));
        const sectionsLink = document.getElementById('nav-classrooms');
        if (sectionsLink) sectionsLink.classList.add('active');

        // Pass false to ensure sub-sidebar doesn't auto-show on refresh/load
        renderStudentClassroomSectionsSidebar(classroomId, false);



        content.innerHTML = `

            <div class="student-room-shell">

                <div class="student-room-hero">

                    <div class="student-room-banner">

                        ${showBannerImage ? `<img src="${bannerImage}" alt="${data.subject}" class="student-room-banner__image">` : ''}

                        <div class="student-room-banner__overlay"></div>

                        <div class="student-room-banner__content">

                            <h2 class="student-room-banner__title">${data.subject}</h2>

                        </div>

                    </div>

                </div>



                <div class="student-room-tabs">

                    <div class="student-room-tabs__inner">

                        <div class="student-room-tabs__group">

                            <button type="button" class="student-room-tab ${activeStudentRoomTab === 'room' ? 'student-room-tab--active' : ''}" data-room-tab="room">Room</button>

                            <button type="button" class="student-room-tab ${activeStudentRoomTab === 'attendance' ? 'student-room-tab--active' : ''}" data-room-tab="attendance">Attendance</button>

                            <button type="button" class="student-room-tab ${activeStudentRoomTab === 'materials' ? 'student-room-tab--active' : ''}" data-room-tab="materials">Materials</button>

                        </div>

                        <div class="student-room-tabs__actions">

                            <button type="button" class="student-room-topics-btn hide-on-mobile" data-room-topic-btn title="Topics">

                                <i class="fa-solid fa-book"></i>

                            </button>

                            <button type="button" class="student-room-topics-btn hide-on-mobile" data-room-back-btn title="Back to Sections">

                                <i class="fa-solid fa-door-open"></i>

                            </button>

                            <!-- Mobile Ellipsis Dropdown -->
                            <div class="relative show-on-mobile">
                                <button type="button" class="student-room-topics-btn" onclick="document.getElementById('student-mobile-dropdown').classList.toggle('hidden')">
                                    <i class="fa-solid fa-ellipsis-vertical"></i>
                                </button>
                                <div id="student-mobile-dropdown" class="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-[14px] shadow-lg hidden z-50 flex flex-col py-2" style="font-family:'Inter', sans-serif;">
                                    <button type="button" data-room-topic-btn onclick="document.getElementById('student-mobile-dropdown').classList.add('hidden')" class="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 w-full text-left transition-colors" style="color:#000000; font-weight:400; font-size:15px;">
                                        <i class="fa-solid fa-book w-5 text-center text-slate-700"></i>
                                        <span style="color:#000000; font-weight:400; text-transform:capitalize;">Topics</span>
                                    </button>
                                    <button type="button" data-room-back-btn onclick="document.getElementById('student-mobile-dropdown').classList.add('hidden')" class="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 w-full text-left transition-colors" style="color:#000000; font-weight:400; font-size:15px;">
                                        <i class="fa-solid fa-door-open w-5 text-center text-slate-700"></i>
                                        <span style="color:#000000; font-weight:400; text-transform:capitalize;">Sections</span>
                                    </button>
                                    ${activeStudentRoomTab === 'room' ? `
                                    <button type="button" onclick="window.toggleMobilePeoplePanel && window.toggleMobilePeoplePanel(); document.getElementById('student-mobile-dropdown').classList.add('hidden')" class="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 w-full text-left transition-colors" style="color:#000000; font-weight:400; font-size:15px;">
                                        <i class="fa-solid fa-users w-5 text-center text-slate-700"></i>
                                        <span style="color:#000000; font-weight:400; text-transform:capitalize;">People</span>
                                    </button>
                                    ` : ''}
                                </div>
                            </div>

                        </div>

                    </div>

                </div>

                <div class="student-room-layout ${activeStudentRoomTab !== 'room' ? 'student-room-layout--full' : ''}">
                    <div class="student-room-main">
                        ${renderStudentRoomPanel(classroomId, data, announcements)}
                    </div>

                    ${activeStudentRoomTab === 'room' ? `
                    <div class="student-room-people" id="classroom-mobile-people-panel">
                        <div class="student-room-people__section">
                            <h3 class="student-room-people__label">Teacher</h3>
                            <div id="room-teacher-list" class="student-room-people__list"></div>
                        </div>
                        <div class="student-room-people__divider"></div>
                        <div class="student-room-people__section">
                            <h3 class="student-room-people__label">Classmates</h3>
                            <div id="room-student-list" class="student-room-people__list"></div>
                        </div>
                    </div>
                    ` : ''}
                </div>

            </div>

        `;

        if (activeStudentRoomTab === 'room') {
            renderRoomPeoplePanel(classroomId);
        }



        if (activeStudentRoomTab === 'attendance') {
            studentAttendancePage = 1;
            renderAttendanceHistoryTable('classroom-attendance-history-body', 'classroom-attendance-pagination-controls', 'classroom-attendance-empty-state', data.subject);
        }

        content.querySelectorAll('[data-room-tab]').forEach(button => {

            button.addEventListener('click', () => {

                activeStudentRoomTab = button.dataset.roomTab;

                showClassroomDetail(classroomId);

            });

        });

        content.querySelectorAll('[data-room-back-btn]').forEach(btn => btn.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            if (window.switchTab) {
                window.switchTab('nav-classrooms');
            }
        }));

        content.querySelectorAll('[data-room-topic-btn]').forEach(btn => btn.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            const targetId = resolveClassroomTopicSourceId(classroomId, data);
            switchToTopicPage(targetId);
        }));



        content.querySelectorAll('[data-topic-subject-id][data-topic-index]').forEach(target => {

            target.addEventListener('click', () => {
                const subjectId = target.dataset.topicSubjectId;
                const topicIdx = Number(target.dataset.topicIndex);

                openTopicContent(subjectId, topicIdx, 'videos');

            });

        });



        content.querySelectorAll('[data-student-comment-submit]').forEach(button => {

            button.addEventListener('click', () => {
                const postId = button.dataset.studentCommentSubmit;
                const input = content.querySelector(`[data-comment-input="${postId}"]`);
                const text = input?.value.trim();
                if (!postId || !text) return;

                saveStudentAnnouncementComment(data.sharedKey, postId, text);

                showClassroomDetail(classroomId);

            });

        });



        content.querySelectorAll('[data-comment-input]').forEach(input => {

            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {

                    event.preventDefault();
                    const postId = input.dataset.commentInput;
                    const button = content.querySelector(`[data-student-comment-submit="${postId}"]`);

                    button?.click();

                }

            });

        });



        content.querySelectorAll('[data-student-present]').forEach(button => {

            button.addEventListener('click', () => {

                saveStudentSelfPresent(button.dataset.studentPresent);

                updateStudentAttendanceStatus(currentStudentAttendance);

                showClassroomDetail(classroomId);

            });

        });



        content.querySelectorAll('[data-student-absent-toggle]').forEach(button => {

            button.addEventListener('click', () => {
                const panel = content.querySelector('[data-student-absent-panel]');

                panel?.classList.toggle('hidden');

            });

        });



        content.querySelectorAll('[data-student-absent-files]').forEach(input => {

            input.addEventListener('change', () => {
                const list = content.querySelector('[data-student-absent-file-list]');
                const files = Array.from(input.files || []).slice(0, 10);
                if (list) {

                    list.innerHTML = files.length

                        ? files.map(file => `<span class="student-room-attendance-excuse__file-chip">${file.name}</span>`).join('')

                        : '';

                }

            });

        });



        content.querySelectorAll('[data-student-absent-submit]').forEach(button => {

            button.addEventListener('click', () => {
                const sharedKey = button.dataset.studentAbsentSubmit;
                const commentInput = content.querySelector('[data-student-absent-comment]');
                const filesInput = content.querySelector('[data-student-absent-files]');
                const comment = commentInput?.value.trim() || '';
                const files = Array.from(filesInput?.files || []).slice(0, 10).map(file => ({

                    name: file.name,

                    size: file.size,

                    type: file.type || 'file'

                }));
                if (!sharedKey) return;
                if (!comment && !files.length) return;

                saveStudentAbsentExcuse(sharedKey, comment, files);

                updateStudentAttendanceStatus(currentStudentAttendance);

                showClassroomDetail(classroomId);

            });

        });



        hideAllSections();

        showSection('section-classroom-detail');
        window.scrollTo({ top: 0 });
        if (pushState && (!history.state || history.state.page !== `classroom:${classroomId}`)) {
            history.pushState({ page: `classroom:${classroomId}` }, '', `#classroom-${classroomId}`);
        }

    }
    window.showClassroomDetail = showClassroomDetail;
    window.addEventListener('storage', () => {

        renderStudentHomeAnnouncements();

        updateStudentAttendanceStatus();
        const detailSection = document.getElementById('section-classroom-detail');
        if (activeStudentClassroomId && detailSection && !detailSection.classList.contains('hidden')) {
            const currentScroll = window.scrollY;

            showClassroomDetail(activeStudentClassroomId);
            window.scrollTo({ top: currentScroll });

        }

    });
    //  

    window.addEventListener('resize', updateLayout);
    window.addEventListener('pageshow', () => {
        updateLayout();
        if (typeof renderStudentHomeDashboardPanels === 'function') renderStudentHomeDashboardPanels();
        if (typeof renderInstitutionalAnnouncements === 'function') renderInstitutionalAnnouncements();
    });
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            updateLayout();
            if (typeof renderStudentHomeDashboardPanels === 'function') renderStudentHomeDashboardPanels();
            if (typeof renderInstitutionalAnnouncements === 'function') renderInstitutionalAnnouncements();
        }
    });
    const savedState = JSON.parse(localStorage.getItem('sigma-student-nav-state') || 'null');
    let initialPage = resolvePageStateFromLocation(history.state);

    // Live Server opens student.html without a hash. In that case always start
    // from Home instead of restoring a stale classroom/tab from localStorage.
    if (!window.location.hash) {
        initialPage = 'home';
        localStorage.setItem('sigma-student-nav-state', JSON.stringify({
            type: 'tab',
            page: 'home',
            navId: 'nav-home'
        }));
    } else if (initialPage === 'home' && savedState) {
        if (savedState.type === 'tab') initialPage = savedState.page;
        else if (savedState.type === 'classroom') initialPage = `classroom:${savedState.classroomId}`;
    }

    if (!history.state?.page) {
        history.replaceState(
            { page: initialPage },
            '',
            `${window.location.pathname}${window.location.search}${window.location.hash || (initialPage !== 'home' ? '#' + initialPage.replace('classroom:', 'classroom-') : '')}`
        );
    }
    const featureNotifications = [
        { icon: 'fa-solid fa-graduation-cap', title: 'Grade Update', message: 'Your final grade for Computer Programming 1 has been posted.', nav: 'nav-grades' },
        { icon: 'fa-solid fa-calendar-check', title: 'Attendance Alert', message: 'You have been marked present for all classes today.', nav: 'nav-home' },
        { icon: 'fa-solid fa-clipboard-list', title: 'New Quiz', message: 'Teacher Sarah Lim posted a new quiz in Web Development 1.', nav: 'nav-assignments' },
        { icon: 'fa-solid fa-envelope', title: 'New Message', message: 'You have an unread message from Prof. Maria Clara.', nav: 'nav-home' }
    ];
    function buildScheduleNotifications() {
        const notifList = document.getElementById('noti-dropdown');
        const notifBadge = document.getElementById('noti-badge');
        if (!notifList) return;
        const container = notifList.querySelector('.overflow-y-auto > div');
        if (!container) return;
        let html = '';
        featureNotifications.forEach(item => {
            html += `
                <div class="notif-item px-4 py-4 hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-100 rounded-xl mb-2 transition-all" 
                     data-nav="${item.nav}">
                    <div class="flex gap-4 items-start">
                        <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black text-sm shadow-sm border border-slate-200/60">
                            <i class="${item.icon}"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-[13px] font-bold text-gray-800 leading-tight font-['Inter']">${item.title}</p>
                            <p class="text-[12px] text-gray-500 mt-1 font-['Inter']">${item.message}</p>
                        </div>
                    </div>
                </div>`;
        });

        container.innerHTML = html;

        container.querySelectorAll('.notif-item[data-nav]').forEach(item => {
            item.addEventListener('click', () => {
                switchTab(item.dataset.nav);
                hideHeaderOverlays();
            });
        });
        if (notifBadge) notifBadge.classList.toggle('hidden', featureNotifications.length === 0);
    }

    applyHistoryPage(initialPage);

    initCalendarEvents();
    // renderHomeReels removed as it's missing from both HTML and JS

    renderStudentHomeAnnouncements();

    renderStudentHomeDashboardPanels();

    updateStudentAttendanceStatus();

    renderAssessmentsPage();

    renderGradesPage();

    renderClassroomsGrid();

    buildScheduleNotifications();

    setInterval(buildScheduleNotifications, 60000);
    function renderClassroomsGrid() {
        const grid = document.getElementById('classrooms-grid');
        if (!grid) return;
        const savedOrder = JSON.parse(localStorage.getItem('sigma-student-classroom-order') || '[]');
        let enrolled = getStudentSectionClassItems();
        if (savedOrder.length > 0) {
            enrolled.sort((a, b) => {
                const idxA = savedOrder.indexOf(a.id);
                const idxB = savedOrder.indexOf(b.id);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return (a.text || '').localeCompare(b.text || '');
            });
        }
        else {
            enrolled.sort((a, b) => (a.subject || '').localeCompare(b.subject || ''));
        }
        let html = '';
        enrolled.forEach((subj, index) => {
            let bgClass = subj.bgColor || 'bg-[#15803d]';
            let textClass = 'text-white';
            const iconClass = subj.icon || 'fa-solid fa-book';

            // Assign a book image cycling book1–book8 by card index
            const bookIdx = (index % 8) + 1;
            const bookImg = `image/book${bookIdx}.jpg`;

            const bannerContent = `<img src="${bookImg}" class="absolute inset-0 w-full h-full object-cover opacity-30">
                   <i class="${iconClass} absolute -left-4 -top-4 text-white/20 text-7xl transform -rotate-12"></i>`;

            // Badges (Synchronized with teacher)
            let badge = '';
            if (index === 0) {
                badge = `<span style="font-size:13px;font-weight:900;letter-spacing:.06em;color:#dc2626;font-family:'Inter',sans-serif;text-transform:uppercase;">No class</span>`;
            }
            else if (index === 2 || subj.subject.includes('Programming')) {
                badge = `<span style="font-size:13px;font-weight:900;letter-spacing:.06em;color:#16a34a;font-family:'Inter',sans-serif;text-transform:uppercase;">Class today</span>`;
            }
            else if (index === 5) {
                badge = `<span style="font-size:13px;font-weight:900;letter-spacing:.06em;color:#ca8a04;font-family:'Inter',sans-serif;text-transform:uppercase;">Class tomorrow</span>`;
            }

            html += `
                <div class="classroom-card bg-white border border-gray-100 rounded-[24px] overflow-hidden standard-panel-shadow transition-all group flex flex-col h-full relative" data-id="${subj.id}">
                    <!-- Header / Banner -->
                    <div class="h-28 ${bgClass} w-full flex items-center justify-center px-6 rounded-t-[24px] classroom-card-banner relative overflow-hidden">
                         ${bannerContent}
                         <h3 class="${textClass} font-black tracking-widest text-center leading-tight drop-shadow-sm cursor-pointer hover:underline transition-none relative z-10"
                             style="font-size:16px;font-family:'Inter',sans-serif;text-shadow: 0 2px 4px rgba(0,0,0,0.3);"
                             onclick="showClassroomDetail('${subj.id}')">${escapeHtml(subj.subject)}</h3>
                    </div>
                    
                    <!-- Overlapping Avatar -->
                    <div class="relative px-6">
                        <div class="absolute top-0 left-6 -translate-y-1/2 w-16 h-16 rounded-full bg-white p-1 shadow-sm">
                            <div class="w-full h-full rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 overflow-hidden">
                                <i class="fa-solid fa-user text-gray-400 text-xl"></i>
                            </div>
                        </div>
                    </div>

                    <div class="p-6 pt-10 flex flex-col flex-1 card-body-main">
                        <div class="flex items-start justify-end">
                            ${badge}
                        </div>

                        <div class="mt-auto flex flex-col gap-2.5">
                            <h4 style="font-size:15px;font-weight:900;line-height:1.2;color:#000000;font-family:'Inter',sans-serif;">${escapeHtml(subj.teacher)}</h4>
                            <!-- Section code - green + icon -->
                            <div class="flex items-center gap-1.5 mt-1">
                                <i class="fa-solid fa-users" style="font-size:13px;color:#15803d;width:16px;text-align:center;"></i>
                                <span style="font-size:18px;font-weight:900;line-height:1;color:#15803d;font-family:'Inter',sans-serif;">${escapeHtml(subj.section).split(' - ').pop().replace(/\s+/g, '-')}</span>
                            </div>
                            <!-- Grade -->
                            <div class="flex items-center gap-1.5">
                                <i class="fa-solid fa-graduation-cap" style="font-size:12px;color:#6b7280;width:16px;text-align:center;"></i>
                                <span style="font-size:13px;font-weight:800;letter-spacing:.04em;line-height:1;color:#000000;font-family:'Inter',sans-serif;">Grade 11</span>
                            </div>
                            <!-- Room - icon -->
                            <div class="flex items-center gap-1.5">
                                <i class="fa-solid fa-door-open" style="font-size:12px;color:#6b7280;width:16px;text-align:center;"></i>
                                <span style="font-size:13px;font-weight:800;letter-spacing:.04em;line-height:1;color:#000000;font-family:'Inter',sans-serif;">${escapeHtml(subj.room)}</span>
                            </div>
                            <!-- Schedule + School Year -->
                            <div class="flex items-center justify-between w-full">
                                <div class="flex items-center gap-1.5">
                                    <i class="fa-regular fa-clock" style="font-size:12px;color:#6b7280;width:16px;text-align:center;"></i>
                                    <span style="font-size:13px;font-weight:800;letter-spacing:.04em;line-height:1;color:#000000;font-family:'Inter',sans-serif;">${escapeHtml(subj.schedule?.label || subj.schedule)}</span>
                                </div>
                                <span style="font-size:13px;font-weight:800;letter-spacing:.04em;line-height:1;color:#000000;font-family:'Inter',sans-serif;">${escapeHtml(subj.schoolYear || '2026-2027')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        grid.innerHTML = html;
        if (typeof initCardSortable === 'function') initCardSortable();
    }
    // --- Card Drag & Drop (SortableJS) ---

    function initCardSortable() {
        const grid = document.getElementById('classrooms-grid');
        if (!grid) return;
        const existing = Sortable.get(grid);
        if (existing) existing.destroy();

        new Sortable(grid, {
            animation: 150,
            draggable: '.classroom-card',
            dataIdAttr: 'data-id',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag-original',   // on the original card in-grid
            forceFallback: true,
            fallbackClass: 'sortable-drag-clone',  // on the floating body clone ONLY
            fallbackOnBody: true,
            fallbackTolerance: 4,
            swapThreshold: 0.28,
            invertedSwapThreshold: 0.75,
            invertSwap: false,
            direction: () => window.innerWidth < 1024 ? 'vertical' : 'horizontal',
            scroll: true,
            bubbleScroll: true,
            scrollSensitivity: 100,
            scrollSpeed: 20,
            onChoose: (evt) => {
                // Snapshot size BEFORE sortable-chosen styles can shift layout.
                const rect = evt.item.getBoundingClientRect();
                evt.item.dataset.dragWidth = `${Math.round(rect.width)}`;
                // Cap height: grid cells can be taller than card content.
                // A bloated clone + mt-auto creates a huge gap — cap to 300px.
                evt.item.dataset.dragHeight = `${Math.min(Math.round(rect.height), 300)}`;
            },
            onStart: (evt) => {
                document.body.style.cursor = 'grabbing';
                document.body.classList.add('classroom-card-sorting');

                requestAnimationFrame(() => {
                    // Only the body clone gets class sortable-drag-clone — unambiguous.
                    const dragEl = document.querySelector('body > .sortable-drag-clone');
                    if (!dragEl) return;

                    const width = parseInt(evt.item.dataset.dragWidth, 10)
                        || Math.round(evt.item.getBoundingClientRect().width)
                        || 280;
                    const height = parseInt(evt.item.dataset.dragHeight, 10)
                        || Math.round(evt.item.getBoundingClientRect().height)
                        || 280;

                    // ONLY override size + appearance.
                    // DO NOT touch position / transform / top / left — SortableJS
                    // uses those to track the cursor and moving them breaks dragging.
                    dragEl.style.width = `${width}px`;
                    dragEl.style.height = `${height}px`;
                    dragEl.style.minWidth = `${width}px`;
                    dragEl.style.minHeight = `${height}px`;
                    dragEl.style.maxWidth = `${width}px`;
                    dragEl.style.maxHeight = `${height}px`;
                    dragEl.style.boxSizing = 'border-box';
                    dragEl.style.opacity = '1';
                    dragEl.style.zIndex = '99999';
                    dragEl.style.borderRadius = '24px';
                    dragEl.style.overflow = 'hidden';
                    dragEl.style.display = 'flex';
                    dragEl.style.flexDirection = 'column';
                    dragEl.style.boxShadow = '0 24px 64px rgba(0,0,0,0.28)';
                    dragEl.style.pointerEvents = 'none';
                    dragEl.style.cursor = 'grabbing';
                });
            },
            onEnd: () => {
                document.body.style.cursor = '';
                document.body.classList.remove('classroom-card-sorting');
                const order = Array.from(grid.querySelectorAll('.classroom-card')).map(card => card.dataset.id);
                localStorage.setItem('sigma-student-classroom-order', JSON.stringify(order));
            },
            onCancel: () => {
                document.body.style.cursor = '';
                document.body.classList.remove('classroom-card-sorting');
            }
        });

    }
    // --- SIGMA AI Panels Drag & Drop (SortableJS) ---

    function initSigmaPanelsSortable() {
        const container = document.getElementById('sigma-panels-container');
        if (!container || typeof Sortable === 'undefined') return;

        const existing = Sortable.get(container);
        if (existing) existing.destroy();

        // Load saved order
        const savedOrder = localStorage.getItem('sigma-student-panels-order');
        if (savedOrder) {
            try {
                const order = JSON.parse(savedOrder);
                const panels = Array.from(container.children);
                order.forEach(id => {
                    const panel = panels.find(p => p.dataset.id === id);
                    if (panel) container.appendChild(panel);
                });
            } catch (e) {
                console.error("Failed to restore SIGMA panel order", e);
            }
        }

        const sortableInstance = new Sortable(container, {
            animation: 150,
            delay: 50,
            delayOnTouchOnly: false,
            touchStartThreshold: 5,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            forceFallback: true,
            fallbackClass: 'sortable-drag',
            fallbackOnBody: true,
            swapThreshold: 0.65,
            invertSwap: false,
            scroll: true,
            bubbleScroll: true,
            onStart: () => {
                document.body.style.cursor = 'grabbing';
            },
            onEnd: () => {
                document.body.style.cursor = '';
                const order = sortableInstance.toArray();
                localStorage.setItem('sigma-student-panels-order', JSON.stringify(order));
            }
        });
    }



    initCardSortable();

    initSigmaPanelsSortable();
    // Subjects tab hover subsidebar disabled   no hover popup
    function initSubjectsHoverSubsidebar() {
        // Hover sub-sidebar removed per design requirement
    }

    initSubjectsHoverSubsidebar();
    // ... (rest of the code remains the same)


    //   Global Search Functionality (Matched with Admin)  

    const searchBar = document.getElementById('searchBar');
    const searchBtn = document.getElementById('globalSearchBtn');
    const triggerGlobalSearch = () => {
        const query = (searchBar?.value || '').trim();
        const visibleSection = Array.from(document.querySelectorAll('.dynamic-section:not(.hidden)'))[0];
        if (!visibleSection) return;
        const sectionId = visibleSection.id;
        // Keep dashboard panels fresh when searching from Home.

        if (sectionId === 'section-home') {
            renderStudentHomeDashboardPanels();

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
    // Mobile Search Toggle
    document.querySelector('.header-search-shell')?.addEventListener('click', (e) => {
        if (window.innerWidth < 1024) {
            const header = document.getElementById('student-header');
            if (!header?.classList.contains('mobile-search-active')) {
                header?.classList.add('mobile-search-active');
                searchBar?.focus();
            }
        }
    });
    // Mobile Search Back Button
    document.getElementById('mobileSearchBackBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('student-header')?.classList.remove('mobile-search-active');
        if (searchBar) searchBar.value = '';
    });
    // Close mobile search if clicking outside
    document.addEventListener('mousedown', (e) => {
        if (window.innerWidth < 1024) {
            const header = document.getElementById('student-header');
            const searchShell = document.querySelector('.header-search-shell');
            if (header?.classList.contains('mobile-search-active') && !searchShell?.contains(e.target)) {
                header?.classList.remove('mobile-search-active');
            }
        }
    });
    // Global function to locate current curriculum subject
    window.locateCurriculumSubject = function () {
        // Try to get the current subject from various sources
        const activeElement = document.querySelector('.topic-content-nav-item.active');
        if (activeElement && activeElement.dataset.subjectId) {
            const subjectId = activeElement.dataset.subjectId;
            // Check core subjects
            const coreMatch = curriculumPrograms['core-subjects']?.subjects?.find(item => item.id === subjectId);
            if (coreMatch) {
                return { programKey: 'core-subjects', subjectId };
            }
            // Check applied subjects
            const appliedMatch = curriculumPrograms['applied-subjects']?.subjects?.find(item => item.id === subjectId);
            if (appliedMatch) {
                return { programKey: 'applied-subjects', subjectId };
            }
            // Check specialized subjects
            const specializedMatch = curriculumPrograms['specialized-subjects']?.subjects?.find(item => item.id === subjectId);
            if (specializedMatch) {
                return { programKey: 'specialized-subjects', subjectId };
            }
        }
        return null;
    };

    // --- MOBILE APP BAR LOGIC (Ported from Teacher) ---
    const mobileAppBar = document.getElementById('mobile-bottom-appbar');
    const profileBtn = document.getElementById('mobile-appbar-profile');
    const calendarBtn = document.getElementById('mobile-appbar-calendar');
    const sigmaBtn = document.getElementById('mobile-appbar-sigma');
    const notiBtn = document.getElementById('mobile-appbar-notifications');
    const sigmaSheet = document.getElementById('mobile-sigma-sheet');
    const sigmaBackdrop = document.getElementById('mobile-sigma-sheet-backdrop');
    const sigmaClose = document.getElementById('mobile-sigma-sheet-close');
    const sigmaCards = document.getElementById('mobile-sigma-cards');

    if (mobileAppBar && sigmaSheet && sigmaBackdrop && sigmaCards) {
        const isMobile = () => window.innerWidth <= 1023;

        const updateMobileAppBarActiveState = () => {
            if (!isMobile()) return;
            [profileBtn, calendarBtn, sigmaBtn, notiBtn].forEach(btn => btn?.classList.remove('active'));

            if (sigmaSheet && sigmaSheet.classList.contains('open')) {
                sigmaBtn?.classList.add('active');
                return;
            }

            const openPanel = document.querySelector('.mobile-pull-up-panel.open');
            if (openPanel) {
                if (openPanel.id === 'mobile-calendar-panel') calendarBtn?.classList.add('active');
                if (openPanel.id === 'mobile-noti-panel') notiBtn?.classList.add('active');
                return;
            }

            const profileView = document.getElementById('user-profile-view');
            if (profileView && window.getComputedStyle(profileView).display !== 'none' && !profileView.classList.contains('hidden')) {
                profileBtn?.classList.add('active');
            }
        };

        window.updateMobileAppBarActiveState = updateMobileAppBarActiveState;

        const hydrateSigmaCards = () => {
            sigmaCards.innerHTML = '';
            const source = document.getElementById('sigma-panels-container');
            if (!source) return;
            const cards = Array.from(source.children || []);
            cards.forEach((card, index) => {
                const clone = card.cloneNode(true);
                clone.classList.remove('cursor-grab', 'select-none');
                clone.dataset.id = card.dataset.id || `sigma-card-${index}`;
                sigmaCards.appendChild(clone);
            });
        };

        const openSigmaSheet = () => {
            if (!isMobile()) return;
            document.querySelectorAll('.mobile-pull-up-panel').forEach(p => p.classList.remove('open'));
            sigmaSheet.classList.add('open');
            sigmaBackdrop.classList.add('open');
            hydrateSigmaCards();

            // Auto-reset scroll position
            const cardsContainer = document.getElementById('mobile-sigma-cards');
            if (cardsContainer) cardsContainer.scrollTop = 0;

            updateMobileAppBarActiveState();
        };

        const closeSigmaSheet = () => {
            sigmaSheet.classList.remove('open');
            sigmaBackdrop.classList.remove('open');
            updateMobileAppBarActiveState();
        };

        window.closeMobilePanel = (id) => {
            document.getElementById(id)?.classList.remove('open');
            if (!sigmaSheet.classList.contains('open') && !document.querySelector('.mobile-pull-up-panel.open')) {
                sigmaBackdrop.classList.remove('open');
            }
            updateMobileAppBarActiveState();
        };

        const openMobilePanel = (id) => {
            if (!isMobile()) return;
            document.querySelectorAll('.mobile-pull-up-panel').forEach(p => p.classList.remove('open'));
            closeSigmaSheet();

            const panelEl = document.getElementById(id);
            if (panelEl) {
                panelEl.classList.add('open');
                // Auto-reset scroll position
                panelEl.scrollTop = 0;
                const scrollContainers = panelEl.querySelectorAll('.mobile-pull-up-content, .overflow-y-auto, .overflow-y-scroll');
                scrollContainers.forEach(container => container.scrollTop = 0);
            }

            sigmaBackdrop.classList.add('open');
            updateMobileAppBarActiveState();
        };

        profileBtn?.addEventListener('click', () => {
            closeSigmaSheet();
            document.querySelectorAll('.mobile-pull-up-panel').forEach(p => p.classList.remove('open'));
            sigmaBackdrop.classList.remove('open');
            _applyTab('nav-profile');
            updateMobileAppBarActiveState();
        });

        calendarBtn?.addEventListener('click', () => {
            if (document.getElementById('mobile-calendar-panel')?.classList.contains('open')) {
                window.closeMobilePanel('mobile-calendar-panel');
            } else {
                openMobilePanel('mobile-calendar-panel');
            }
        });

        sigmaBtn?.addEventListener('click', () => {
            if (sigmaSheet.classList.contains('open')) {
                closeSigmaSheet();
            } else {
                openSigmaSheet();
            }
        });

        notiBtn?.addEventListener('click', () => {
            if (document.getElementById('mobile-noti-panel')?.classList.contains('open')) {
                window.closeMobilePanel('mobile-noti-panel');
            } else {
                openMobilePanel('mobile-noti-panel');
            }
        });

        sigmaClose?.addEventListener('click', closeSigmaSheet);
        sigmaBackdrop?.addEventListener('click', () => {
            closeSigmaSheet();
            document.querySelectorAll('.mobile-pull-up-panel').forEach(p => p.classList.remove('open'));
            sigmaBackdrop.classList.remove('open');
            updateMobileAppBarActiveState();
        });

        const bindPullDownToClose = (panel, closeFn) => {
            if (!panel) return;
            let startY = 0;
            let latestY = 0;
            let dragging = false;

            const canStartDrag = target => {
                if (target.closest('button, a, input, select, textarea, [contenteditable="true"]')) return false;
                return Boolean(target.closest('.mobile-pull-up-header, .mobile-sigma-sheet__head, .mobile-sigma-sheet__grab'));
            };

            panel.addEventListener('pointerdown', event => {
                if (!isMobile() || !panel.classList.contains('open') || !canStartDrag(event.target)) return;
                dragging = true;
                startY = event.clientY;
                latestY = startY;
                panel.style.transition = 'none';
                panel.setPointerCapture?.(event.pointerId);
            });

            panel.addEventListener('pointermove', event => {
                if (!dragging) return;
                latestY = event.clientY;
                const deltaY = Math.max(0, latestY - startY);
                panel.style.transform = `translateY(${deltaY}px)`;
            });

            const endDrag = () => {
                if (!dragging) return;
                const deltaY = Math.max(0, latestY - startY);
                dragging = false;
                panel.style.transition = '';
                panel.style.transform = '';
                if (deltaY > 90) closeFn();
            };

            panel.addEventListener('pointerup', endDrag);
            panel.addEventListener('pointercancel', endDrag);
        };

        bindPullDownToClose(sigmaSheet, () => {
            closeSigmaSheet();
            updateMobileAppBarActiveState();
        });
        document.querySelectorAll('.mobile-pull-up-panel').forEach(panel => {
            bindPullDownToClose(panel, () => window.closeMobilePanel(panel.id));
        });
    }

    buildScheduleNotifications();

    setInterval(buildScheduleNotifications, 60000);

    // Initial population
    window.populateUserProfilePage();
    if (typeof initSubjectParentSidebar === 'function') initSubjectParentSidebar();

    // Re-render announcements ONLY when switching between mobile and desktop layouts
    let lastWidth = window.innerWidth;
    window.addEventListener('resize', () => {
        const currentWidth = window.innerWidth;
        const wasMobile = lastWidth < 1024;
        const isMobile = currentWidth < 1024;

        if (wasMobile !== isMobile) {
            if (typeof renderStudentHomeAnnouncements === 'function') {
                renderStudentHomeAnnouncements();
            }
        }
        lastWidth = currentWidth;
    });

    window.returnToStudentRoomFromTopic = function (subjectId) {
        if (activeStudentClassroomId && typeof showClassroomDetail === 'function') {
            showClassroomDetail(activeStudentClassroomId);
        } else {
            if (typeof window.switchTab === 'function') window.switchTab('nav-classrooms');
        }
    };
}

