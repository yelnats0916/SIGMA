document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.classList.add('no-transition');    // --- BRANDING LOGO SYNC ---    const customNavLogo = localStorage.getItem('sigma-custom-nav-logo');    if (customNavLogo) {        const navLogos = document.querySelectorAll('header img[alt="ICC Logo"], .sidebar img[alt="ICC Logo"]');        navLogos.forEach(img => img.src = customNavLogo);    }    // --- WELCOME PANEL SYNC ---    const welcomePanel = localStorage.getItem('sigma-welcome-panel');    if (welcomePanel && document.getElementById('welcome-panel-student-img')) {        document.getElementById('welcome-panel-student-img').src = welcomePanel;    }    const sidebar = document.getElementById('sidebar');    const subSidebar = document.getElementById('sub-sidebar');    const layoutWrapper = document.getElementById('layout-wrapper');    const navLinks = document.querySelectorAll('.nav-link, .nav-sublink');    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');    window.toggleSidebar = function () {        const sidebar = document.getElementById('sidebar');        const overlay = document.getElementById('sidebar-overlay');        if (window.innerWidth < 1024) {            if (sidebar) {                const isVisible = sidebar.classList.toggle('sidebar-visible');                if (overlay) overlay.classList.toggle('hidden', !isVisible);            }        } else {            document.body.classList.toggle('sidebar-collapsed');        }        if (typeof updateLayout === 'function') updateLayout();    };    if (sidebarToggleBtn) {        sidebarToggleBtn.addEventListener('click', (e) => {            e.preventDefault();            window.toggleSidebar();        });    }    // Close sidebar on link click (Mobile)    navLinks.forEach(link => {        link.addEventListener('click', () => {            if (window.innerWidth < 1024) {                const sidebar = document.getElementById('sidebar');                const overlay = document.getElementById('sidebar-overlay');                if (sidebar) sidebar.classList.remove('sidebar-visible');                if (overlay) overlay.classList.add('hidden');            }        });    });    // Close sidebar when clicking overlay on mobile    const sidebarOverlay = document.getElementById('sidebar-overlay');    if (sidebarOverlay) {        sidebarOverlay.addEventListener('click', () => {            window.toggleSidebar();        });    }    // SIGMA AI Elements    const sigmaAiNotch = document.getElementById('sigmaAiNotch');    const sigmaAiPanel = document.getElementById('sigmaAiPanel');    const sigmaAiMessages = document.getElementById('sigmaAiMessages');    const sigmaAiInput = document.getElementById('sigmaAiInput');    const sigmaAiSendBtn = document.getElementById('sigmaAiSendBtn');    const sigmaAiCloseBtn = document.getElementById('sigmaAiCloseBtn');    const sigmaAiAttachBtn = document.getElementById('sigmaAiAttachBtn');    const sigmaAiAttachMenu = document.getElementById('sigmaAiAttachMenu');    const sigmaAiFileInput = document.getElementById('sigmaAiFileInput');    const sigmaAiPhotoInput = document.getElementById('sigmaAiPhotoInput');    let sigmaAiWaiting = false;    // Header Dropdowns    let suppressNextHeaderClose = false;    const calendarToggle = document.getElementById('calendar-toggle');    const calendarDropdown = document.getElementById('calendar-dropdown');    const notiToggle = document.getElementById('noti-toggle');    const notiDropdown = document.getElementById('noti-dropdown');    const profileDropdownBtn = document.getElementById('profileDropdownBtn');    const profileDropdownMenu = document.getElementById('profileDropdownMenu');    let currentInlineProgram = null;    let currentCurriculumProgram = null;    let currentCurriculumCluster = null;    let inlineAnimationToken = 0;    let inlineAnimationTimers = [];    let dynamicCurriculumSubjects = {};    const sectionMap = {        'nav-home': 'section-home',        'nav-classrooms': 'section-classrooms',        'nav-courses': 'section-courses',        'nav-assignments': 'section-assignments',        'nav-grades': 'section-grades',        'nav-attendance': 'section-attendance',        'nav-profile': 'user-profile-view',        'nav-topic-detail': 'section-topic-detail',        'nav-topic-content': 'section-topic-content'    };    const navIdByPage = {        'home': 'nav-home', 'classrooms': 'nav-classrooms',        'courses': 'nav-courses',        'assignments': 'nav-assignments', 'grades': 'nav-grades',        'attendance': 'nav-attendance',        'profile': 'nav-profile'    };    // â”€â”€â”€ User Profile Logic (Standardized with Admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€    const USER_STORAGE_KEY = 'sigma-admin-users';    const USER_AVATAR_STORAGE_KEY = 'sigma_user_avatar_base64'; // Fallback for old storage    function getProfileTarget() {        let authUser = {};        try {            authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');        } catch (e) { console.error('Auth parse error', e); }        let users = [];        try {            users = JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || '[]');        } catch (e) { console.error('Users parse error', e); }        const matchedUser = users.find(u => String(u.uid || u.id) === String(authUser.id)) || {};        return {            data: { ...authUser, ...matchedUser },            isLoggedIn: !!authUser.id        };    }    function saveProfileTarget(profileData) {        const authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');        const users = JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || '[]');        let idx = users.findIndex(u => String(u.uid || u.id) === String(authUser.id));        if (idx === -1) {            // If user not in list, add them            users.push({ ...authUser, ...profileData });            idx = users.length - 1;        } else {            users[idx] = { ...users[idx], ...profileData };        }        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));        // Also sync session storage        const updatedSession = { ...authUser, ...profileData };        sessionStorage.setItem('sigma-authenticated-user', JSON.stringify(updatedSession));        // Sync local state        if (window.currentUserProfileData) {            window.currentUserProfileData.avatar = profileData.avatar || '';            window.currentUserProfileData.uploads = profileData.uploads || [];        }    }    window.toggleUserProfilePictureOverlay = function (show) {        const overlay = document.getElementById('user-profile-picture-overlay');        if (!overlay) return;        overlay.classList.toggle('hidden', !show);        if (show) window.renderUserProfilePictureUploads();    };    window.renderUserProfilePictureUploads = function () {        const container = document.getElementById('user-profile-picture-uploads');        if (!container) return;        const target = getProfileTarget();        const uploads = Array.isArray(target.data.uploads) ? target.data.uploads : [];        const activeAvatar = target.data.avatar || '';        if (uploads.length === 0) {            container.innerHTML = '<p class="text-[11px] font-bold uppercase tracking-widest text-slate-300 col-span-full text-center py-10">No photos</p>';            return;        }        container.innerHTML = uploads.map((src, index) => {            const isSelected = src === activeAvatar;            return `                <div class="group relative aspect-square rounded-2xl border ${isSelected ? 'border-[#FFD000] ring-2 ring-[#FFD000]/20' : 'border-black/5'} bg-slate-50 transition-all overflow-hidden">                    <div class="w-full h-full">                        <img src="${src}" alt="Profile upload ${index + 1}" class="w-full h-full object-cover">                    </div>                                        <button type="button"                        onclick="window.toggleUserAvatarMenu(event, ${index})"                        class="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 text-black flex items-center justify-center z-10 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"                        title="Actions">                        <i class="fa-solid fa-ellipsis text-[12px]"></i>                    </button>                    <div id="user-avatar-menu-${index}" class="absolute top-10 right-2 w-28 bg-white rounded-xl shadow-xl border border-slate-100 py-1 hidden z-20">                        <button type="button" onclick="window.selectUserProfilePicture('${encodeURIComponent(src)}')" class="w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-[#15803d] transition-colors">Select</button>                        <button type="button" onclick="window.deleteUserProfilePicture('${encodeURIComponent(src)}')" class="w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-red-500 transition-colors">Delete</button>                    </div>                </div>            `;        }).join('');    };    window.toggleMobilePeoplePanel = function () {        const panel = document.getElementById('classroom-mobile-people-panel');        if (!panel) return;        // Remove any stale backdrop        const oldBackdrop = document.getElementById('classroom-people-backdrop');        if (oldBackdrop) oldBackdrop.remove();        const isActive = panel.classList.contains('active');        if (!isActive) {            // Teleport to body to escape parent stacking contexts            if (!panel._originalParent) {                panel._originalParent = panel.parentElement;                panel._originalNextSibling = panel.nextSibling;            }            document.body.appendChild(panel);            // Position panel to start below the nav bar            const header = document.getElementById('student-header');            const navBottom = header ? header.getBoundingClientRect().bottom : 0;            panel.style.top = navBottom + 'px';            panel.style.bottom = '0';            panel.style.borderRadius = '1.5rem 1.5rem 0 0';            // Double rAF: first frame paints panel in off-screen start position,            // second frame triggers the CSS transition so it slides up cleanly            requestAnimationFrame(() => {                requestAnimationFrame(() => {                    panel.classList.add('active');                });            });            // Attach swipe-to-close only once            if (!panel._swipeInit) {                panel._swipeInit = true;                let startY = 0;                let currentY = 0;                let isDragging = false;                panel.addEventListener('touchstart', (e) => {                    // Only initiate drag when at the top of the panel scroll                    if (panel.scrollTop > 0) return;                    startY = e.touches[0].clientY;                    isDragging = true;                    panel.style.transition = 'none';                }, { passive: true });                panel.addEventListener('touchmove', (e) => {                    if (!isDragging) return;                    currentY = e.touches[0].clientY;                    const deltaY = currentY - startY;                    if (deltaY > 0) {                        panel.style.transform = `translateY(${deltaY}px)`;                    }                }, { passive: true });                panel.addEventListener('touchend', () => {                    if (!isDragging) return;                    isDragging = false;                    const deltaY = currentY - startY;                    panel.style.transition = '';                    if (deltaY > 80) {                        // Enough drag â€” close                        window.toggleMobilePeoplePanel();                    } else {                        // Snap back to open position                        panel.style.transform = 'translateY(0)';                    }                }, { passive: true });            }        } else {            panel.style.transform = '';            panel.classList.remove('active');            // Restore to original position after transition ends            setTimeout(() => {                if (panel._originalParent && !panel.classList.contains('active')) {                    panel._originalParent.insertBefore(panel, panel._originalNextSibling || null);                    panel._originalParent = null;                    // Reset inline styles                    panel.style.top = '';                    panel.style.bottom = '';                    panel.style.borderRadius = '';                }            }, 320);        }    };    window.toggleUserAvatarMenu = function (event, index) {        if (event) event.stopPropagation();        const allMenus = document.querySelectorAll('[id^="user-avatar-menu-"]');        allMenus.forEach((menu) => {            if (menu.id !== `user-avatar-menu-${index}`) menu.classList.add('hidden');        });        const menu = document.getElementById(`user-avatar-menu-${index}`);        if (menu) menu.classList.toggle('hidden');        const closeMenu = (e) => {            if (menu && !menu.contains(e.target)) {                menu.classList.add('hidden');                document.removeEventListener('click', closeMenu);            }        };        setTimeout(() => document.addEventListener('click', closeMenu), 0);    };    window.selectUserProfilePicture = function (encodedSrc) {        const src = decodeURIComponent(encodedSrc);        const target = getProfileTarget();        target.data.avatar = src;        saveProfileTarget(target.data);        window.populateUserProfilePage();        window.renderUserProfilePictureUploads();    };    window.deleteUserProfilePicture = function (encodedSrc) {        const src = decodeURIComponent(encodedSrc);        const target = getProfileTarget();        const uploads = Array.isArray(target.data.uploads) ? target.data.uploads : [];        const nextUploads = uploads.filter(s => s !== src);        let nextAvatar = target.data.avatar;        if (nextAvatar === src) {            nextAvatar = nextUploads.length > 0 ? nextUploads[0] : '';        }        saveProfileTarget({            ...target.data,            avatar: nextAvatar,            uploads: nextUploads        });        window.populateUserProfilePage();        window.renderUserProfilePictureUploads();    };    window.handleUserProfilePictureUpload = function (event) {        const file = event.target.files?.[0];        if (!file) return;        const reader = new FileReader();        reader.onload = () => {            const img = new Image();            img.onload = () => {                const canvas = document.createElement('canvas');                const MAX_SIZE = 300;                let width = img.width;                let height = img.height;                if (width > height) {                    if (width > MAX_SIZE) {                        height *= MAX_SIZE / width;                        width = MAX_SIZE;                    }                } else {                    if (height > MAX_SIZE) {                        width *= MAX_SIZE / height;                        height = MAX_SIZE;                    }                }                canvas.width = width;                canvas.height = height;                const ctx = canvas.getContext('2d');                ctx.drawImage(img, 0, 0, width, height);                const nextImage = canvas.toDataURL('image/jpeg', 0.6);                if (!nextImage) return;                const target = getProfileTarget();                const uploads = Array.isArray(target.data.uploads) ? [...target.data.uploads] : [];                const dedupedUploads = uploads.filter((src) => src !== nextImage);                dedupedUploads.unshift(nextImage);                if (dedupedUploads.length > 6) dedupedUploads.pop();                target.data.uploads = dedupedUploads;                saveProfileTarget(target.data);                window.populateUserProfilePage();                window.renderUserProfilePictureUploads();                if (event.target) event.target.value = '';            };            img.src = reader.result;        };        reader.readAsDataURL(file);    };    window.populateUserProfilePage = function () {        const target = getProfileTarget();        const data = target.data;        // Update name, role, ID in view        const firstNameBanner = document.getElementById('view-user-firstName-banner');        const lastNameBanner = document.getElementById('view-user-lastName-banner');        const roleEl = document.getElementById('view-user-role');        const idEl = document.getElementById('view-user-id');        const emailEl = document.getElementById('view-user-email');        const dropFirstName = document.getElementById('header-dropdown-firstName');        const dropLastName = document.getElementById('header-dropdown-lastName');        const firstName = String(data.firstName || data.fname || 'Firstname');        const lastName = String(data.lastName || data.lname || 'Lastname');        const userId = String(data.uid || data.id || '0000000');        if (firstNameBanner) firstNameBanner.textContent = firstName;        if (lastNameBanner) lastNameBanner.textContent = lastName;        if (roleEl) roleEl.textContent = String(data.role || data.type || 'Student');        if (idEl) idEl.textContent = `ID: #${userId}`;        if (emailEl) emailEl.textContent = String(data.email || 'example@gmail.com');        if (dropFirstName) dropFirstName.textContent = firstName;        if (dropLastName) dropLastName.textContent = lastName;        // Tab Visibility Permissions        const perms = data.permissions || { bio: true, achievements: true, subjects: true, sections: true };        const tabMapping = {            'bio': 'profile-tab-bio',            'achievements': 'profile-tab-achievements',            'subjects': 'profile-tab-subjects',            'sections': 'profile-tab-sections'        };        let firstVisibleTab = null;        Object.keys(tabMapping).forEach(key => {            const el = document.getElementById(tabMapping[key]);            if (el) {                const isVisible = perms[key] !== false;                el.classList.toggle('hidden', !isVisible);                if (isVisible && !firstVisibleTab) firstVisibleTab = key;            }        });        // Sync all avatar locations        const avatarLocations = [            { img: 'user-avatar-img', placeholder: 'user-avatar-placeholder' },            { img: 'header-avatar-img', placeholder: 'header-avatar-placeholder' },            { img: 'sidebar-avatar-img', placeholder: 'sidebar-avatar-placeholder' }        ];        const savedAvatar = data.avatar || localStorage.getItem(USER_AVATAR_STORAGE_KEY);        avatarLocations.forEach(loc => {            const imgEl = document.getElementById(loc.img);            const placeholderEl = document.getElementById(loc.placeholder);            if (imgEl && placeholderEl) {                if (savedAvatar) {                    imgEl.src = savedAvatar;                    imgEl.classList.remove('hidden');                    placeholderEl.classList.add('hidden');                } else {                    imgEl.src = '';                    imgEl.classList.add('hidden');                    placeholderEl.classList.remove('hidden');                }            }        });        // Render tab if visible, else switch to first visible        let currentTab = document.querySelector('.dynamic-section:not(.hidden) p[id^="profile-tab-"][class*="border-[#15803d]"]')?.id?.replace('profile-tab-', '') || 'bio';        if (perms[currentTab] === false && firstVisibleTab) {            window.switchUserProfileTab(firstVisibleTab);        } else {            window.renderUserProfileTab(currentTab);        }    };    window.switchUserProfileTab = function (tabId) {        // Update tab styles        const tabs = ['bio', 'achievements', 'subjects', 'sections'];        tabs.forEach(t => {            const el = document.getElementById(`profile-tab-${t}`);            if (el) {                if (t === tabId) {                    el.classList.add('border-[#15803d]', 'text-[#FFD000]', 'font-bold');                    el.classList.remove('border-transparent', 'text-slate-400', 'font-normal');                } else {                    el.classList.remove('border-[#15803d]', 'text-[#FFD000]', 'font-bold');                    el.classList.add('border-transparent', 'text-slate-400', 'font-normal');                }            }        });        window.renderUserProfileTab(tabId);    };    const USER_PROFILE_TAB_CONTENT = {        bio: '',        achievements: `            <div class="flex flex-col items-center justify-center py-16 gap-3 text-slate-300">                <i class="fa-solid fa-trophy text-4xl"></i>                <p class="text-[11px] font-medium uppercase tracking-[0.3em] text-center">No achievements documented</p>            </div>        `,        subjects: `            <div class="flex flex-col items-center justify-center py-16 gap-3 text-slate-300">                <i class="fa-solid fa-book-open text-4xl"></i>                <p class="text-[11px] font-medium uppercase tracking-[0.3em] text-center">No subjects enrolled</p>            </div>        `,        sections: `            <div class="flex flex-col items-center justify-center py-16 gap-3 text-slate-300">                <i class="fa-solid fa-users-viewfinder text-4xl"></i>                <p class="text-[11px] font-medium uppercase tracking-[0.3em] text-center">No sections assigned</p>            </div>        `    };    window.renderUserProfileTab = function (tabId = 'bio') {        const panel = document.getElementById('user-profile-tab-panel');        if (!panel) return;        const data = getProfileTarget().data;        const userBios = data.bios || [];        if (tabId === 'bio') {            panel.innerHTML = `                <div class="space-y-4">                    ${userBios.length > 0 ? `                        <div class="space-y-10">                            ${userBios.map((bio, index) => `                                <div class="flex items-center justify-between group">                                    <div class="space-y-4 animate-in fade-in duration-500">                                        <h3 class="text-[1.65rem] font-medium text-black tracking-tight font-['Inter']">${escapeHtml(bio.title)}</h3>                                        <p class="text-sm leading-7 text-black max-w-[680px] font-['Inter']">${escapeHtml(bio.description)}</p>                                    </div>                                    <div class="flex flex-col gap-2 ${data.isReadOnly ? 'hidden' : ''}">                                        <button class="text-black/20 hover:text-[#FFD000] transition-colors" onclick="window.toggleEditUserBio(false, ${index})">                                            <i class="fa-solid fa-pen text-[14px]"></i>                                        </button>                                    </div>                                </div>                            `).join('')}                        </div>                    ` : ''}                                        <div class="flex items-center gap-2 text-slate-400 ${userBios.length >= 5 || data.isReadOnly ? 'hidden' : ''} cursor-pointer hover:text-[#FFD000] transition-colors font-['Inter']" onclick="window.toggleEditUserBio()">                        <p class="text-[10px] font-bold tracking-[0.24em] uppercase font-['Inter']">Add bio</p>                        <i class="fa-solid fa-pen text-[14px]"></i>                    </div>                    ${data.isReadOnly && userBios.length === 0 ? `                        <div class="flex flex-col items-center justify-center py-16 gap-3 text-slate-300">                            <i class="fa-solid fa-note-sticky text-4xl"></i>                            <p class="text-[11px] font-medium uppercase tracking-[0.3em]">No bio provided</p>                        </div>                    ` : ''}                </div>            `;        } else {            panel.innerHTML = USER_PROFILE_TAB_CONTENT[tabId] || '';        }    };    window.toggleEditUserBio = function (shouldSave, index = null) {        const panel = document.getElementById('user-profile-tab-panel');        if (!panel) return;        const isEditing = panel.querySelector('#edit-user-bio-form') !== null;        const target = getProfileTarget();        const userBios = [...(target.data.bios || [])];        if (isEditing) {            if (shouldSave) {                const titleInput = document.getElementById('edit-user-bio-title');                const descInput = document.getElementById('edit-user-bio-description');                if (titleInput && descInput) {                    const title = titleInput.value.trim();                    const description = descInput.value.trim();                    if (index !== null && index >= 0) {                        if (!title && !description) {                            userBios.splice(index, 1);                        } else {                            userBios[index] = { title, description };                        }                    } else if (userBios.length < 5) {                        if (title || description) {                            userBios.push({ title, description });                        }                    }                    saveProfileTarget({ ...target.data, bios: userBios });                }            }            window.renderUserProfileTab('bio');        } else {            const bioToEdit = (index !== null && userBios[index])                ? userBios[index]                : { title: '', description: '' };            panel.innerHTML = `                <div id="edit-user-bio-form" class="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">                    <div class="flex items-center justify-between">                        <h4 class="text-sm font-bold text-black uppercase tracking-widest font-['Inter']">Edit bio</h4>                    </div>                    <div class="space-y-4">                        <div class="space-y-2">                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 font-['Inter']">Title</label>                            <input type="text" id="edit-user-bio-title" placeholder="Title" maxlength="20"                                 value="${escapeHtml(bioToEdit.title)}"                                class="w-full bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium text-black outline-none focus:border-[#FFD000] transition-all font-['Inter']">                        </div>                        <div class="space-y-2">                            <div class="flex items-center justify-between ml-1">                                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-['Inter']">Description</label>                                <span id="user-bio-char-counter" class="text-[10px] font-bold text-slate-400 font-['Inter']">${bioToEdit.description.length}/200</span>                            </div>                            <textarea id="edit-user-bio-description" placeholder="Description" maxlength="200" rows="3"                                class="w-full bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium text-black outline-none focus:border-[#FFD000] transition-all font-['Inter'] resize-none font-['Inter']">${escapeHtml(bioToEdit.description)}</textarea>                        </div>                    </div>                    <div class="flex items-center justify-between pt-2">                        <button onclick="document.getElementById('edit-user-bio-title').value=''; document.getElementById('edit-user-bio-description').value=''; document.getElementById('user-bio-char-counter').textContent='0/200';"                             class="text-[10px] font-bold text-black hover:bg-slate-100 transition-all uppercase tracking-widest font-['Inter'] px-3 py-2 rounded-lg">Clear</button>                        <div class="flex items-center gap-3">                            <button onclick="window.toggleEditUserBio(false)" class="text-[10px] font-bold text-black hover:bg-slate-100 px-3 py-2 rounded-lg transition-colors uppercase tracking-widest font-['Inter']">Cancel</button>                            <button onclick="window.toggleEditUserBio(true, ${index})" class="bg-[#15803d] text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-[#15803d]/90 transition-colors font-['Inter']">Save</button>                        </div>                    </div>                </div>            `;            const descInput = document.getElementById('edit-user-bio-description');            const counter = document.getElementById('user-bio-char-counter');            if (descInput && counter) {                descInput.oninput = () => {                    counter.textContent = `${descInput.value.length}/200`;                };            }        }    };    const hasSubSidebar = ['nav-mail'];    const isMobile = window.innerWidth < 1024;    const schoolYearQuarterOrder = {        '1st Quarter': 1,        '2nd Quarter': 2,        '3rd Quarter': 3,        '4th Quarter': 4    };    const schoolYearSemesterOrder = {        '1st Semester': 1,        '2nd Semester': 2    };    let schoolYearRecords = [];    const loadSYFromStorage = () => {        const saved = localStorage.getItem('sigma_school_year_records');        if (saved) {            try {                schoolYearRecords = JSON.parse(saved);            } catch (e) {                console.error('Failed to parse school year records', e);                schoolYearRecords = [];            }        }    };    const getSortedSchoolYearRecords = () => [...schoolYearRecords].sort((left, right) => {        if (left.status === 'Active' && right.status !== 'Active') return -1;        if (left.status !== 'Active' && right.status === 'Active') return 1;        const leftYear = Number(left.yearStart) || 0;        const rightYear = Number(right.yearStart) || 0;        if (leftYear !== rightYear) return leftYear - rightYear;        const leftSemester = schoolYearSemesterOrder[left.semester] || 99;        const rightSemester = schoolYearSemesterOrder[right.semester] || 99;        if (leftSemester !== rightSemester) return leftSemester - rightSemester;        const leftQuarter = schoolYearQuarterOrder[left.quarter] || 99;        const rightQuarter = schoolYearQuarterOrder[right.quarter] || 99;        return leftQuarter - rightQuarter;    });    const getActiveSchoolYearRecord = () => {        loadSYFromStorage();        return schoolYearRecords.find((record) => record.status === 'Active') || getSortedSchoolYearRecords()[0] || null;    };    function updateGlobalSYDisplay() {        const display = document.getElementById('global-sy-display');        if (!display) return;        const activeRecord = getActiveSchoolYearRecord();        if (!activeRecord) {            display.textContent = '';            return;        }        const today = new Date();        today.setHours(0, 0, 0, 0);        let currentQuarter = null;        let anyQuarterStarted = false;        let hasAnyDates = false;        const quarters = [            { name: '1st Quarter', start: activeRecord.q1Start, end: activeRecord.q1End },            { name: '2nd Quarter', start: activeRecord.q2Start, end: activeRecord.q2End },            { name: '3rd Quarter', start: activeRecord.q3Start, end: activeRecord.q3End },            { name: '4th Quarter', start: activeRecord.q4Start, end: activeRecord.q4End }        ];        for (const q of quarters) {            if (q.start && q.end) {                hasAnyDates = true;                const startDate = new Date(`${q.start}T00:00:00`);                if (today >= startDate) {                    anyQuarterStarted = true;                    currentQuarter = q.name;                }            }        }        let allQuartersEnded = true;        if (anyQuarterStarted) {            for (const q of quarters) {                if (q.end) {                    const endDate = new Date(`${q.end}T23:59:59`);                    if (today <= endDate) { allQuartersEnded = false; break; }                }            }        } else {            allQuartersEnded = false;        }        const yearRange = `${activeRecord.yearStart}-${activeRecord.yearEnd}`;        if (!hasAnyDates) {            display.textContent = '';        } else if (anyQuarterStarted && !allQuartersEnded) {            const quarterText = currentQuarter ? currentQuarter.toUpperCase() : 'TRANSITION';            display.textContent = `SY ${yearRange} Ã¢â‚¬Â¢ ${quarterText}`;        } else if (!anyQuarterStarted) {            display.textContent = `SY ${yearRange} Ã¢â‚¬Â¢ UPCOMING`;        } else {            display.textContent = '';        }    }    updateGlobalSYDisplay();    // Sync with Admin changes in other tabs    window.addEventListener('storage', (e) => {        if (e.key === 'sigma_school_year_records') {            updateGlobalSYDisplay();        }    });    window.getComputedStyle(document.documentElement).opacity;    document.documentElement.classList.remove('no-transition');    // â”€â”€â”€ Layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€    function updateLayout() {        if (window.innerWidth < 1024) { layoutWrapper.style.marginLeft = '0'; return; }        const isCollapsed = document.body.classList.contains('sidebar-collapsed');        const isSubVisible = subSidebar.classList.contains('sub-sidebar-visible');        const mainWidth = isCollapsed ? 82 : 280;        const subWidth = isSubVisible ? 240 : 0;        layoutWrapper.style.marginLeft = (mainWidth + subWidth) + 'px';    }    // Submenu Toggles    document.querySelectorAll('[data-toggle="submenu"]').forEach(btn => {        btn.addEventListener('click', (e) => {            e.preventDefault();            const submenuId = btn.id.replace('nav-', '') + '-submenu';            const submenu = document.getElementById(submenuId);            const chevron = btn.querySelector('.sidebar-group-chevron');            if (submenu) {                const isHidden = submenu.classList.contains('hidden');                submenu.classList.toggle('hidden', !isHidden);                if (chevron) {                    chevron.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';                }            }        });    });    function setSubjectsPanelsMode(enabled) {        document.body.classList.toggle('subjects-panels-mode', enabled && window.innerWidth >= 1024);    }    function setCurriculumMode(enabled) {        document.body.classList.toggle('curriculum-mode', enabled && window.innerWidth >= 1024);    }    function hideAllSections() {        document.querySelectorAll('.dynamic-section').forEach(s => {            s.classList.add('hidden');            s.style.display = 'none';        });    }    function showSection(id) {        const el = document.getElementById(id);        if (!el) return;        el.classList.remove('hidden');        el.style.display = '';    }    // â”€â”€â”€ Nav Context Title â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€    function setNavContext(text) {        const ctxText = document.getElementById('nav-context-text');        if (!ctxText) return;        if (text) {            ctxText.textContent = text;            ctxText.parentElement.classList.remove('hidden');        } else {            ctxText.parentElement.classList.add('hidden');        }    }    const SHARED_ANNOUNCEMENTS_KEY = 'sigma-room-announcements-v1';    const SHARED_ATTENDANCE_MODE_KEY = 'sigma-attendance-mode-v1';    const SHARED_ATTENDANCE_RECORDS_KEY = 'sigma-attendance-records-v1';    const SHARED_COMMENT_MODE_KEY = 'sigma-room-comment-mode-v1';    const SHARED_ANNOUNCEMENT_COMMENTS_KEY = 'sigma-room-announcement-comments-v1';    const ADMIN_SUBJECTS_STORAGE_KEY = 'sigma-admin-subjects';    const SHARED_ADMIN_ANNOUNCEMENTS_KEY = 'sigma-admin-announcements-v1';    const currentStudentName = 'Abad, Juan';    const currentStudentSection = 'ICT-11A';    let activeHomeAnnouncementTab = 'overall';    let currentStudentAttendance = {        name: currentStudentName,        sharedKey: 'Grade 11 - ICT A::Programming 1',        subject: 'Computer Programming 1',        time: 'April 8, 2026 Ã¢â‚¬Â¢ 8:00 AM'    };    function loadSharedState(key, fallback) {        try {            const raw = localStorage.getItem(key);            return raw ? JSON.parse(raw) : fallback;        } catch {            return fallback;        }    }    function escapeHtml(value) {        return String(value || '')            .replace(/&/g, '&amp;')            .replace(/</g, '&lt;')            .replace(/>/g, '&gt;')            .replace(/"/g, '&quot;')            .replace(/'/g, '&#39;');    }    function stripHtmlTags(value) {        return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();    }    function formatAdminAnnouncementBody(body) {        return escapeHtml(body).replace(/\n/g, '<br>');    }    function parseAnnouncementDateValue(value) {        if (!value) return 0;        const direct = new Date(value);        if (!Number.isNaN(direct.getTime())) return direct.getTime();        const currentYear = new Date().getFullYear();        const normalized = new Date(`${value}, ${currentYear}`);        if (!Number.isNaN(normalized.getTime())) return normalized.getTime();        return 0;    }    function formatAnnouncementTimestamp(value) {        const timestamp = parseAnnouncementDateValue(value);        if (!timestamp) return 'Just now';        return new Date(timestamp).toLocaleString('en-US', {            month: 'short',            day: 'numeric',            hour: 'numeric',            minute: '2-digit'        });    }    function seedDefaultAdminAnnouncements() {        try {            const raw = localStorage.getItem(SHARED_ADMIN_ANNOUNCEMENTS_KEY);            if (raw !== null && Array.isArray(JSON.parse(raw))) return;        } catch { }        localStorage.setItem(SHARED_ADMIN_ANNOUNCEMENTS_KEY, JSON.stringify([            {                id: 'admin-default-exam-schedule',                title: 'Quarterly Examination Schedule Released',                body: 'The 2nd Quarter examinations will be held from March 25th to March 27th. Please ensure all clearance requirements are settled before the examination period begins.',                audience: 'students',                type: 'urgent',                author: 'Admin Office',                createdAt: new Date().toISOString()            }        ]));    }    function getAdminAnnouncements() {        seedDefaultAdminAnnouncements();        const posts = loadSharedState(SHARED_ADMIN_ANNOUNCEMENTS_KEY, []);        return Array.isArray(posts) ? posts : [];    }    function normalizeSubjectKey(value) {        return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');    }    function getAdminSubjectCoverConfig(subjectName) {        const normalized = normalizeSubjectKey(subjectName);        if (!normalized) return null;        const subjects = loadSharedState(ADMIN_SUBJECTS_STORAGE_KEY, []);        if (!Array.isArray(subjects)) return null;        return subjects.find(item => {            const subjectLabel = normalizeSubjectKey(item?.name);            if (!subjectLabel) return false;            return subjectLabel === normalized || normalized.includes(subjectLabel) || subjectLabel.includes(normalized);        }) || null;    }    function getSharedAnnouncements(sharedKey, fallback = []) {        const store = loadSharedState(SHARED_ANNOUNCEMENTS_KEY, {});        return store[sharedKey]?.length ? store[sharedKey] : fallback;    }    function getSharedCommentMode(sharedKey) {        const store = loadSharedState(SHARED_COMMENT_MODE_KEY, {});        return store[sharedKey] || 'disabled';    }    function buildAnnouncementId(sharedKey, post, index) {        if (post?.id) return post.id;        const author = (post?.author || 'teacher').toLowerCase().replace(/[^a-z0-9]+/g, '-');        const stamp = (post?.timestamp || `post-${index + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, '-');        return `${sharedKey}-${author}-${stamp}`;    }    function getSharedAnnouncementComments(sharedKey, postId) {        const store = loadSharedState(SHARED_ANNOUNCEMENT_COMMENTS_KEY, {});        return store[sharedKey]?.[postId] || [];    }    function saveStudentAnnouncementComment(sharedKey, postId, text) {        const store = loadSharedState(SHARED_ANNOUNCEMENT_COMMENTS_KEY, {});        if (!store[sharedKey]) store[sharedKey] = {};        if (!store[sharedKey][postId]) store[sharedKey][postId] = [];        store[sharedKey][postId].push({            author: currentStudentName,            text,            timestamp: new Date().toLocaleString('en-US', {                month: 'short',                day: 'numeric',                hour: 'numeric',                minute: '2-digit'            })        });        localStorage.setItem(SHARED_ANNOUNCEMENT_COMMENTS_KEY, JSON.stringify(store));    }    function saveStudentSelfPresent(sharedKey) {        const modeStore = loadSharedState(SHARED_ATTENDANCE_MODE_KEY, {});        const recordStore = loadSharedState(SHARED_ATTENDANCE_RECORDS_KEY, {});        const mode = modeStore[sharedKey] || 'manual';        if (!recordStore[sharedKey]) {            recordStore[sharedKey] = {                mode,                updatedAt: new Date().toISOString(),                statuses: {}            };        }        if (!recordStore[sharedKey].statuses) recordStore[sharedKey].statuses = {};        if (!recordStore[sharedKey].excuses) recordStore[sharedKey].excuses = {};        recordStore[sharedKey].mode = mode;        recordStore[sharedKey].updatedAt = new Date().toISOString();        recordStore[sharedKey].statuses[currentStudentName] = 'P';        localStorage.setItem(SHARED_ATTENDANCE_RECORDS_KEY, JSON.stringify(recordStore));    }    function saveStudentAbsentExcuse(sharedKey, comment, files) {        const modeStore = loadSharedState(SHARED_ATTENDANCE_MODE_KEY, {});        const recordStore = loadSharedState(SHARED_ATTENDANCE_RECORDS_KEY, {});        const mode = modeStore[sharedKey] || 'manual';        if (!recordStore[sharedKey]) {            recordStore[sharedKey] = {                mode,                updatedAt: new Date().toISOString(),                statuses: {},                excuses: {}            };        }        if (!recordStore[sharedKey].statuses) recordStore[sharedKey].statuses = {};        if (!recordStore[sharedKey].excuses) recordStore[sharedKey].excuses = {};        recordStore[sharedKey].mode = mode;        recordStore[sharedKey].updatedAt = new Date().toISOString();        recordStore[sharedKey].statuses[currentStudentName] = 'A';        recordStore[sharedKey].excuses[currentStudentName] = {            comment,            files,            submittedAt: new Date().toLocaleString('en-US', {                month: 'short',                day: 'numeric',                hour: 'numeric',                minute: '2-digit'            })        };        localStorage.setItem(SHARED_ATTENDANCE_RECORDS_KEY, JSON.stringify(recordStore));    }    function getStudentAttendanceSnapshot(attendanceContext = currentStudentAttendance) {        const modeStore = loadSharedState(SHARED_ATTENDANCE_MODE_KEY, {});        const recordStore = loadSharedState(SHARED_ATTENDANCE_RECORDS_KEY, {});        const mode = modeStore[attendanceContext.sharedKey] || 'manual';        const status = recordStore[attendanceContext.sharedKey]?.statuses?.[attendanceContext.name] || '';        const excuse = recordStore[attendanceContext.sharedKey]?.excuses?.[attendanceContext.name] || null;        let label = 'Pending';        let meta = mode === 'trust'            ? `Tap Present to confirm you are inside ${attendanceContext.subject}.`            : 'Waiting for teacher attendance confirmation.';        let badgeClass = 'bg-gray-100 text-gray-500';        if (status === 'P') {            label = 'Present';            meta = mode === 'trust'                ? `You marked yourself present for ${attendanceContext.subject}.`                : `Teacher marked you present for ${attendanceContext.subject}.`;            badgeClass = 'bg-green-50 text-green-600';        } else if (status === 'A') {            label = 'Absent';            meta = excuse                ? `Your absence and excuse were submitted for ${attendanceContext.subject}.`                : `Teacher marked you absent for ${attendanceContext.subject}.`;            badgeClass = 'bg-red-50 text-red-600';        } else if (status === 'L') {            label = 'Late';            meta = `Teacher marked you late for ${attendanceContext.subject}.`;            badgeClass = 'bg-yellow-50 text-yellow-600';        }        return {            label,            meta,            badgeClass,            mode,            status,            time: attendanceContext.time,            excuse        };    }    function updateStudentAttendanceStatus(attendanceContext = currentStudentAttendance) {        const valueEl = document.getElementById('student-attendance-live-value');        const metaEl = document.getElementById('student-attendance-live-meta');        const badgeEl = document.getElementById('student-attendance-live-badge');        if (!valueEl || !metaEl || !badgeEl) return;        const snapshot = getStudentAttendanceSnapshot(attendanceContext);        valueEl.textContent = snapshot.label;        metaEl.textContent = `${snapshot.meta} ${snapshot.time}`;        badgeEl.textContent = snapshot.label;        badgeEl.className = `px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${snapshot.badgeClass}`;    }    function setGreenNavContext(trackText) {        const gradeEl = document.getElementById('green-grade-label');        const trackEl = document.getElementById('green-track-label');        if (gradeEl) gradeEl.textContent = 'Grade 11';        if (trackEl) trackEl.textContent = 'AY 2025-2026 Ã¢â‚¬Â¢ 2nd Term';    }    // â”€â”€â”€ Tab Switching (internal â”€â”€ no history push) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€    function _applyTab(navId) {        // Auto-close mobile sidebar        if (window.innerWidth < 1024) {            const sidebar = document.getElementById('sidebar');            const overlay = document.getElementById('sidebar-overlay');            if (sidebar) sidebar.classList.remove('sidebar-visible');            if (overlay) overlay.classList.add('hidden');        }        const targetSectionId = sectionMap[navId];        if (!targetSectionId) return;        // Special handling for Subjects Landing        if (navId === 'nav-courses') {            // switchToSubjectsPanelsView removed            return;        }        // Reset context-specific state if moving to main landing pages        const isSubjectsLanding = navId === 'nav-courses' && !currentCurriculumProgram;        setSubjectsPanelsMode(isSubjectsLanding);        setCurriculumMode(false);        // Close other open side panels, but keep AI panel if user wants it persistent        // closeAiPanel(); // Removed        document.querySelectorAll('[id$="Menu"], [id$="Panel"]').forEach(m => m.classList.add('hidden'));        document.querySelectorAll('.relative button').forEach(b => b.classList.remove('active'));        const navCtx = document.getElementById('nav-subject-context');        if (navCtx) { navCtx.classList.add('hidden'); navCtx.classList.remove('flex'); }        navLinks.forEach(l => l.classList.remove('active'));        const activeLink = document.getElementById(navId);        if (activeLink) {            activeLink.classList.add('active');            // Also update context text            const labelEl = activeLink.querySelector('.full-label') || activeLink.querySelector('span');            if (labelEl) setNavContext(labelEl.textContent);        }        hideAllSections();        showSection(targetSectionId);        if (navId === 'nav-assignments') {            renderAssessmentsPage();        } else if (navId === 'nav-grades') {            renderGradesPage();        } else if (navId === 'nav-attendance') {            updateStudentAttendanceStatus();        } else if (navId === 'nav-classrooms') {            renderClassroomsGrid();        } else if (navId === 'nav-profile') {            window.populateUserProfilePage();        }        // Nav context title per tab        const navContextMap = {            'nav-home': 'Interface Computer College', 'nav-classrooms': 'Sections',            'nav-assignments': 'Assessments', 'nav-grades': 'Grades',            'nav-attendance': 'Attendance', 'nav-mail': 'Mail'        };        const ctx = navContextMap[navId] || '';        setNavContext(ctx);        const shouldShowSub = hasSubSidebar.includes(navId);        if (shouldShowSub) {            _showSubSidebarInstant();            updateSubSidebar(navId);        } else {            _hideSubSidebarInstant();        }        updateLayout();        if (window.innerWidth < 1024) sidebar.classList.remove('sidebar-visible');        window.scrollTo({ top: 0 });    }    // â”€â”€â”€ Sub-sidebar instant show/hide (NO slide animation) â”€â”€â”€    function _hideSubSidebarInstant() {        subSidebar.style.transition = 'none';        subSidebar.classList.remove('sub-sidebar-visible');        subSidebar.classList.add('hidden');        // restore transition after frame        requestAnimationFrame(() => { subSidebar.style.transition = ''; });    }    function _showSubSidebarInstant() {        subSidebar.style.transition = 'none';        subSidebar.classList.remove('hidden');        subSidebar.classList.add('sub-sidebar-visible');        requestAnimationFrame(() => { subSidebar.style.transition = ''; });    }    // â”€â”€â”€ Public switchTab â”€â”€ pushes history â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€    function switchTab(navId, pushState = true) {        const pageKey = Object.entries(navIdByPage).find(([k, v]) => v === navId)?.[0] || 'home';        if (pushState) history.pushState({ page: pageKey }, '', '#' + pageKey);        _applyTab(navId);    }    window.switchTab = switchTab;    navLinks.forEach(link => {        link.addEventListener('click', e => {            // If it's a submenu toggle, don't trigger switchTab            if (link.dataset.toggle === 'submenu') return;            e.preventDefault();            switchTab(link.id);        });    });    function resolvePageStateFromLocation(state) {        if (state?.page) return state.page;        const hash = window.location.hash || '';        if (!hash) return 'home';        const clean = hash.replace(/^#/, '');        if (clean === 'home' || clean === 'classrooms' || clean === 'courses' || clean === 'assignments' || clean === 'grades' || clean === 'attendance') {            return clean;        }        if (clean.startsWith('subjects-')) {            const parts = clean.replace('subjects-', '').split('-');            if (parts.length >= 2) {                const programKey = parts[0] === 'core' ? 'core-subjects'                    : parts[0] === 'elective' ? 'applied-subjects'                        : parts[0] === 'work' ? 'specialized-subjects'                            : parts[0];                const remainder = clean.replace(`subjects-${programKey}-`, '');                if (remainder !== clean) return `inline-cluster:${programKey}:${remainder}`;                return `inline:${programKey}`;            }        }        if (clean.startsWith('classroom-')) return `classroom:${clean.replace('classroom-', '')}`;        if (clean.startsWith('topic-')) return `topic:${clean.replace('topic-', '')}`;        if (clean.startsWith('tc-')) {            const parts = clean.replace('tc-', '').split('-');            if (parts.length >= 4 && /^v\d+$/.test(parts[parts.length - 1])) {                const videoPart = parts.pop();                const tab = parts.pop();                const topicIdx = parts.pop();                const subjectId = parts.join('-');                return `topic-content:${subjectId}:${topicIdx}:${tab}:${videoPart.replace('v', '')}`;            }            if (parts.length >= 3) {                const tab = parts.pop();                const topicIdx = parts.pop();                const subjectId = parts.join('-');                return `topic-content:${subjectId}:${topicIdx}:${tab}`;            }        }        return 'home';    }    function applyHistoryPage(page) {        if (!page) {            _applyTab('nav-home');            return;        }        if (page.startsWith('inline-cluster:')) {            const [, programKey, clusterKey] = page.split(':');            _applyTab('nav-courses');            // openInlineProgramFocus removed            currentCurriculumCluster = clusterKey;            // renderSubjectsInlineDetail removed            syncInlinePanelBackButtons();        } else if (page.startsWith('inline-track:')) {            const [, programKey, clusterKey] = page.split(':');            _applyTab('nav-courses');            // openInlineProgramFocus removed            currentCurriculumCluster = clusterKey;            // renderSubjectsInlineDetail removed        } else if (page.startsWith('inline:')) {            _applyTab('nav-courses');            openInlineProgramFocus(page.replace('inline:', ''), false, false);        } else if (page.startsWith('curriculum:')) {            openCurriculumProgram(page.replace('curriculum:', ''), false);        } else if (page.startsWith('cluster:')) {            const [, programKey, clusterKey] = page.split(':');            openCurriculumCluster(programKey, clusterKey, false);        } else if (page.startsWith('topic-content:')) {            const [, subjectId, topicIdx, tab, videoIdx] = page.split(':');            _showTopicContent(subjectId, parseInt(topicIdx), tab || 'videos', videoIdx !== undefined ? parseInt(videoIdx) : null);        } else if (page.startsWith('classroom:')) {            showClassroomDetail(page.replace('classroom:', ''), false);        } else if (page.startsWith('topic:')) {            _buildAndShowTopicPage(page.replace('topic:', ''));        } else {            _applyTab(navIdByPage[page] || 'nav-home');        }    }    // â”€â”€â”€ Browser back/forward â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€    window.addEventListener('popstate', e => {        const page = resolvePageStateFromLocation(e.state);        applyHistoryPage(page);    });    // â”€â”€â”€ Subjects Data (q1Percent + q2Percent for bar) â”€â”€â”€â”€â”€â”€    const subjectsData = {        enrolled: [            { id: 'card-prog1', text: 'Computer Programming 1', subtitle: 'Core Subject', instructor: 'Elena Reyes', icon: 'fa-solid fa-code', bg: 'image/book1.jpg', q1Percent: 84, q2Percent: 0, summary: 'Learn the fundamentals of programming using modern languages.' },            { id: 'card-webdev', text: 'Web Development 1', subtitle: 'Applied Subject', instructor: 'Sarah Lim', icon: 'fa-solid fa-globe', bg: 'image/book4.jpg', q1Percent: 79, q2Percent: 0, summary: 'Build responsive websites using HTML, CSS, and JavaScript.' },            { id: 'card-database', text: 'Database Management 1', subtitle: 'Specialized Subject', instructor: 'Elena Reyes', icon: 'fa-solid fa-database', bg: 'image/book2.jpg', q1Percent: 88, q2Percent: 0, summary: 'Master SQL and database design principles.' },            { id: 'card-empowerment', text: 'Empowerment Technologies', subtitle: 'Core Subject', instructor: 'Roberto Diaz', icon: 'fa-solid fa-bolt', bg: 'image/book3.jpg', q1Percent: 73, q2Percent: 0, summary: 'Developing ICT skills for professional environments.' },            { id: 'card-stats', text: 'Statistics & Probability', subtitle: 'Core Subject', instructor: 'Jennifer Santos', icon: 'fa-solid fa-chart-line', bg: 'image/book5.jpg', q1Percent: 69, q2Percent: 0, summary: 'Understanding data analysis and probability theory.' },            { id: 'card-system', text: 'System Architecture', subtitle: 'Specialized Subject', instructor: 'Roberto Diaz', icon: 'fa-solid fa-sitemap', bg: 'image/book6.jpg', q1Percent: 76, q2Percent: 0, summary: 'Exploring how complex software systems are structured.' },            { id: 'card-introcomp', text: 'Intro to Computing', subtitle: 'Applied Subject', instructor: 'Alex Reyes', icon: 'fa-solid fa-desktop', bg: 'image/book7.jpg', q1Percent: 82, q2Percent: 0, summary: 'The history and future of computer technology.' },            { id: 'card-animation', text: 'Animation', subtitle: 'Specialized Subject', instructor: 'Tricia Villanueva', icon: 'fa-solid fa-film', bg: 'image/book8.jpg', q1Percent: 64, q2Percent: 0, summary: 'Introduction to 2D and 3D animation techniques.' }        ],        completed: [            { id: 'card-oralcomm', text: 'Oral Communication', subtitle: 'Core Subject Ã¢â‚¬Â¢ Grade 11', instructor: 'Ana Reyes', grade: '1.50 Very Good', q1Percent: 100, q2Percent: 100, icon: 'fa-solid fa-comments', bg: 'image/book1.jpg' },            { id: 'card-genmath', text: 'General Mathematics', subtitle: 'Core Subject Ã¢â‚¬Â¢ Grade 11', instructor: 'Jose Santos', grade: '1.75 Good', q1Percent: 100, q2Percent: 100, icon: 'fa-solid fa-infinity', bg: 'image/book2.jpg' }        ]    };    const currentStudentCurriculumLabel = 'Curriculum';    const homeSubjectRailState = {        query: '',        hideCompleted: false,        filter: 'all'    };    function getHomeSubjectCategory(subject) {        const subtitle = String(subject?.subtitle || '').toLowerCase();        const subjectId = String(subject?.id || '').toLowerCase();        const subjectText = String(subject?.text || '').toLowerCase();        if (            subtitle.includes('specialized')            || subtitle.includes('immersion')            || subjectId.includes('immersion')            || subjectText.includes('specialized')        ) {            return 'specialized-subjects';        }        if (String(subject?.id || '').startsWith('core-') || subtitle.includes('core subject')) {            return 'core';        }        // Specialized logic: Contains "Cluster" or "Strand"        if (subtitle.includes('cluster') || subtitle.includes('strand')) {            return 'specialized';        }        return 'applied';    }    function getHomeSubjectDotClass(subject) {        const category = getHomeSubjectCategory(subject);        if (category === 'core') return 'home-subject-rail__dot home-subject-rail__dot--core';        if (category === 'specialized-subjects' || category === 'specialized') return 'home-subject-rail__dot home-subject-rail__dot--immersion';        return 'home-subject-rail__dot home-subject-rail__dot--applied';    }    function normalizeHomeSubjectName(value) {        return String(value || '').trim().toLowerCase();    }    function sortSubjectsAlphabetically(list) {        return [...list].sort((a, b) => a.text.localeCompare(b.text));    }    function filterHomeSubjects(list) {        const query = normalizeHomeSubjectName(homeSubjectRailState.query);        return list.filter(subject => {            const category = getHomeSubjectCategory(subject);            const matchesFilter = homeSubjectRailState.filter === 'all' || homeSubjectRailState.filter === category;            if (!matchesFilter) return false;            if (!query) return true;            return normalizeHomeSubjectName(subject.text).includes(query);        });    }    function renderHomeSubjectRail() {        const enrolledList = document.getElementById('home-enrolled-subject-list');        const completedList = document.getElementById('home-completed-subject-list');        const completedBlock = document.getElementById('home-completed-subject-block');        if (!enrolledList || !completedList || !completedBlock) return;        const enrolledSubjects = filterHomeSubjects(sortSubjectsAlphabetically(subjectsData.enrolled));        const completedSubjects = filterHomeSubjects(sortSubjectsAlphabetically(subjectsData.completed));        enrolledList.innerHTML = enrolledSubjects.length            ? enrolledSubjects.map(subject => `                <button type="button" class="home-subject-rail__link" data-home-subject-open="${subject.id}">                    <span class="${getHomeSubjectDotClass(subject)}" aria-hidden="true"></span>                    <span class="home-subject-rail__link-text">${subject.text}</span>                </button>            `).join('')            : '<p class="home-subject-rail__empty">No enrolled subjects found.</p>';        if (homeSubjectRailState.hideCompleted) {            completedBlock.classList.add('hidden');        } else {            completedBlock.classList.remove('hidden');            completedList.innerHTML = completedSubjects.length                ? completedSubjects.map(subject => `                    <button type="button" class="home-subject-rail__link" data-home-subject-open="${subject.id}">                        <span class="${getHomeSubjectDotClass(subject)}" aria-hidden="true"></span>                        <span class="home-subject-rail__link-text">${subject.text}</span>                    </button>                `).join('')                : '<p class="home-subject-rail__empty">No completed subjects found.</p>';        }    }    function initHomeSubjectRail() {        const rail = document.getElementById('home-subject-rail');        const searchToggle = document.getElementById('home-subject-search-toggle');        const searchBox = document.getElementById('home-subject-search-box');        const searchInput = document.getElementById('home-subject-search-input');        const settingsToggle = document.getElementById('home-subject-settings-toggle');        const settingsMenu = document.getElementById('home-subject-settings-menu');        const hideCompletedToggle = document.getElementById('home-subject-hide-completed-toggle');        const filterOptions = document.querySelectorAll('input[name="home-subject-filter"]');        if (!rail) return;        searchToggle?.addEventListener('click', () => {            searchBox?.classList.toggle('hidden');            if (!searchBox?.classList.contains('hidden')) {                searchInput?.focus();            }        });        searchInput?.addEventListener('input', () => {            homeSubjectRailState.query = searchInput.value || '';            renderHomeSubjectRail();        });        settingsToggle?.addEventListener('click', (event) => {            event.stopPropagation();            settingsMenu?.classList.toggle('hidden');        });        settingsMenu?.addEventListener('click', event => event.stopPropagation());        document.addEventListener('click', () => settingsMenu?.classList.add('hidden'));        hideCompletedToggle?.addEventListener('change', () => {            homeSubjectRailState.hideCompleted = !!hideCompletedToggle.checked;            renderHomeSubjectRail();        });        filterOptions.forEach(option => {            option.addEventListener('change', () => {                homeSubjectRailState.filter = option.value || 'all';                renderHomeSubjectRail();            });        });        rail.addEventListener('click', (event) => {            const subjectsTrigger = event.target.closest('[data-home-subjects-nav]');            if (subjectsTrigger) {                switchTab('nav-courses');                return;            }            const trigger = event.target.closest('[data-home-subject-open]');            if (!trigger) return;            const subjectId = trigger.dataset.homeSubjectOpen;            if (!subjectId) return;            scrollToSubjectCard(subjectId);        });        renderHomeSubjectRail();    }    const curriculumPrograms = {        'core-subjects': {            title: 'Core Subjects',            kicker: 'Shared Foundation',            image: 'image/core-subjects.jpg',            overview: 'Core subjects build the shared academic foundation for every learner through communication, mathematics, science, life readiness, and society-focused learning.',            subjects: [                { id: 'core-effective-communication', title: 'Effective Communication', overview: 'Speech, writing, listening, and communication for academic and real-life use.', image: 'image/book1.jpg' },                { id: 'core-life-and-career-skills', title: 'Life and Career Skills', overview: 'Career planning, self-management, and workplace readiness.', image: 'image/book4.jpg' },                { id: 'core-general-mathematics', title: 'General Mathematics', overview: 'Functions, interest, business math, and logical problem solving.', image: 'image/book2.jpg' },                { id: 'core-general-science', title: 'General Science', overview: 'Earth systems, life science, matter, energy, and scientific reasoning.', image: 'image/book3.jpg' },                { id: 'core-history-society', title: 'Kasaysayan at Lipunang Pilipino', overview: 'Philippine society, governance, citizenship, and historical identity.', image: 'image/book5.jpg' },                { id: 'card-oralcomm', title: 'Oral Communication', overview: 'Developing effective speaking and listening skills for various contexts.', image: 'image/book1.jpg' }            ]        },        'applied-subjects': {            title: 'Applied Subjects',            kicker: 'Essential Skills',            image: 'image/academic-track.jpg',            overview: 'Practical subjects that develop essential skills and competencies across various tracks, focusing on real-world applications of learning.',            subjects: [                { id: 'card-introcomp', title: 'Intro to Computing', overview: 'Basic computer concepts, hardware, software, and digital literacy foundations.', image: 'image/book4.jpg' }            ]        },        'specialized-subjects': {            title: 'Specialized Subjects',            kicker: 'Field Mastery',            image: 'image/work-immersion.jpg',            overview: 'Advanced subjects specific to your chosen strand, providing in-depth knowledge and specialized training for your future career path.',            subjects: [                { id: 'acad-biology-1', title: 'Biology 1', overview: 'Covers cell structure, heredity, living systems, and biological processes.', image: 'image/book6.jpg' },                { id: 'acad-contemporary-literature-1', title: 'Contemporary Literature 1', overview: 'Studies modern texts, themes, and literary forms.', image: 'image/book7.jpg' },                { id: 'acad-citizenship-civic-engagement', title: 'Citizenship and Civic Engagement', overview: 'Focuses on rights, duties, participation, and community involvement.', image: 'image/book8.jpg' },                { id: 'card-animation', title: 'Animation', overview: 'Principles of animation, character design, and basic movement techniques.', image: 'image/book3.jpg' }            ]        }    };    const curriculumTopicCatalog = {        'core-effective-communication': {            text: 'Effective Communication',            subtitle: 'Core Subject â€¢ Grade 11',            instructor: 'DepEd Core Curriculum',            icon: 'fa-solid fa-comments',            bg: 'image/book1.jpg',            q1Percent: 100,            q2Percent: 100,            summary: 'A core communication subject that strengthens speaking, listening, and writing for everyday and academic use.',            q1Topics: [                { title: 'Nature and Elements of Communication', status: 'completed', grades: { quiz: 92, assignment: 90, activity: 94, performance: 91 } },                { title: 'Functions of Communication', status: 'completed', grades: { quiz: 90, assignment: 88, activity: 92, performance: 89 } },                { title: 'Communication Models', status: 'completed', grades: { quiz: 88, assignment: 85, activity: 90, performance: 87 } },                { title: 'Communication Breakdown', status: 'completed', grades: { quiz: 86, assignment: 84, activity: 88, performance: 85 } },                { title: 'Speech Context, Style, and Act', status: 'in-progress', grades: { quiz: 0, assignment: 82, activity: 0, performance: 0 } },                { title: 'Principles of Speech Writing and Delivery', status: 'not-started', grades: null }            ]        },        'core-life-and-career-skills': {            text: 'Life and Career Skills',            subtitle: 'Core Subject â€¢ Grade 11',            instructor: 'DepEd Core Curriculum',            icon: 'fa-solid fa-heart-circle-check',            bg: 'image/book4.jpg',            q1Percent: 100,            q2Percent: 100,            summary: 'A core subject that prepares learners for career planning, self-management, financial literacy, and workplace readiness.',            q1Topics: [                { title: 'Self-Assessment and Personal Strengths', status: 'completed', grades: { quiz: 91, assignment: 90, activity: 92, performance: 90 } },                { title: 'Career Choices and Pathways', status: 'completed', grades: { quiz: 89, assignment: 87, activity: 90, performance: 88 } },                { title: 'Factors Affecting Goal Fulfillment', status: 'completed', grades: { quiz: 87, assignment: 86, activity: 88, performance: 86 } },                { title: 'Work Readiness and Professional Habits', status: 'completed', grades: { quiz: 90, assignment: 89, activity: 92, performance: 90 } },                { title: 'Rights, Responsibilities, and Entrepreneurial Mindset', status: 'in-progress', grades: { quiz: 0, assignment: 84, activity: 0, performance: 0 } },                { title: 'Career Portfolio and Financial Literacy', status: 'not-started', grades: null }            ]        },        'core-general-mathematics': {            text: 'General Mathematics',            subtitle: 'Core Subject â€¢ Grade 11',            instructor: 'DepEd Core Curriculum',            icon: 'fa-solid fa-square-root-variable',            bg: 'image/book2.jpg',            q1Percent: 100,            q2Percent: 100,            summary: 'A core mathematics subject focused on functions, business math, interest, loans, and logic for real-life use.',            q1Topics: [                { title: 'Functions and Their Graphs', status: 'completed', grades: { quiz: 92, assignment: 90, activity: 91, performance: 89 } },                { title: 'Rational Functions, Equations, and Inequalities', status: 'completed', grades: { quiz: 88, assignment: 86, activity: 89, performance: 87 } },                { title: 'One-to-One and Inverse Functions', status: 'completed', grades: { quiz: 87, assignment: 85, activity: 88, performance: 86 } },                { title: 'Exponential and Logarithmic Functions', status: 'completed', grades: { quiz: 84, assignment: 82, activity: 86, performance: 83 } },                { title: 'Simple and Compound Interest', status: 'completed', grades: { quiz: 90, assignment: 88, activity: 91, performance: 89 } },                { title: 'Stocks, Bonds, Loans, and Logic', status: 'in-progress', grades: { quiz: 0, assignment: 80, activity: 0, performance: 0 } }            ]        },        'core-general-science': {            text: 'General Science',            subtitle: 'Core Subject â€¢ Grade 11',            instructor: 'DepEd Core Curriculum',            icon: 'fa-solid fa-flask',            bg: 'image/book3.jpg',            q1Percent: 100,            q2Percent: 100,            summary: 'A science foundation that connects earth systems, life science, matter, energy, and real-world scientific reasoning.',            q1Topics: [                { title: 'Origin and Structure of the Earth', status: 'completed', grades: { quiz: 91, assignment: 89, activity: 92, performance: 90 } },                { title: 'Earth Materials and Processes', status: 'completed', grades: { quiz: 88, assignment: 86, activity: 89, performance: 87 } },                { title: 'Natural Hazards, Mitigation, and Adaptation', status: 'completed', grades: { quiz: 90, assignment: 88, activity: 91, performance: 89 } },                { title: 'Perpetuation of Life and Reproduction', status: 'completed', grades: { quiz: 89, assignment: 87, activity: 90, performance: 88 } },                { title: 'Evolution, Classification, and Ecosystems', status: 'completed', grades: { quiz: 87, assignment: 85, activity: 89, performance: 86 } },                { title: 'Matter, Light, and the Cosmos', status: 'in-progress', grades: { quiz: 0, assignment: 82, activity: 0, performance: 0 } }            ]        },        'core-history-society': {            text: 'Pag-aaral ng Kasaysayan at Lipunang Pilipino',            subtitle: 'Core Subject â€¢ Grade 11',            instructor: 'DepEd Core Curriculum',            icon: 'fa-solid fa-landmark',            bg: 'image/book5.jpg',            q1Percent: 100,            q2Percent: 100,            summary: 'A core subject that builds understanding of Philippine society, governance, citizenship, and historical identity.',            q1Topics: [                { title: 'Enculturation and Socialization', status: 'completed', grades: { quiz: 90, assignment: 88, activity: 91, performance: 89 } },                { title: 'How Society Is Organized', status: 'completed', grades: { quiz: 88, assignment: 86, activity: 90, performance: 87 } },                { title: 'The Philippine Constitution and Governance', status: 'completed', grades: { quiz: 89, assignment: 87, activity: 90, performance: 88 } },                { title: 'Elections, Suffrage, and Political Parties', status: 'completed', grades: { quiz: 86, assignment: 84, activity: 88, performance: 85 } },                { title: 'Civil Society, Social Movements, and Citizenship', status: 'completed', grades: { quiz: 91, assignment: 89, activity: 92, performance: 90 } },                { title: 'Political Ideologies and Social Change', status: 'in-progress', grades: { quiz: 0, assignment: 83, activity: 0, performance: 0 } }            ]        },        'acad-biology-1': {            text: 'Biology 1',            subtitle: 'Academic Track â€¢ Grade 11',            instructor: 'Academic Track Faculty',            icon: 'fa-solid fa-dna',            bg: 'image/book3.jpg',            q1Percent: 91,            q2Percent: 91,            summary: 'Introduces living systems, cell structures, heredity, and the diversity of life.',            q1Topics: [                { title: 'Introduction to Biology', status: 'completed', grades: { quiz: 92, assignment: 90, activity: 91, performance: 89 } },                { title: 'Cell Structure and Function', status: 'completed', grades: { quiz: 88, assignment: 86, activity: 89, performance: 87 } },                { title: 'Genetics and Heredity', status: 'completed', grades: { quiz: 90, assignment: 88, activity: 91, performance: 89 } },                { title: 'Diversity of Organisms', status: 'in-progress', grades: { quiz: 0, assignment: 82, activity: 0, performance: 0 } },                { title: 'Biological Systems and Interactions', status: 'not-started', grades: null }            ]        },        'acad-contemporary-literature-1': {            text: 'Contemporary Literature 1',            subtitle: 'Academic Track â€¢ Grade 11',            instructor: 'Academic Track Faculty',            icon: 'fa-solid fa-book-open',            bg: 'image/book1.jpg',            q1Percent: 88,            q2Percent: 88,            summary: 'Introduces modern literary forms, themes, and interpretations through reading and discussion.',            q1Topics: [                { title: 'Literature in the Modern Context', status: 'completed', grades: { quiz: 92, assignment: 90, activity: 91, performance: 89 } },                { title: 'Themes in Contemporary Texts', status: 'completed', grades: { quiz: 88, assignment: 86, activity: 89, performance: 87 } },                { title: 'Poetry, Fiction, and Creative Nonfiction', status: 'completed', grades: { quiz: 86, assignment: 84, activity: 88, performance: 85 } },                { title: 'Literary Criticism and Response', status: 'in-progress', grades: { quiz: 0, assignment: 82, activity: 0, performance: 0 } },                { title: 'Writing a Critical Reflection', status: 'not-started', grades: null }            ]        },        'acad-citizenship-civic-engagement': {            text: 'Citizenship and Civic Engagement',            subtitle: 'Academic Track â€¢ Grade 11',            instructor: 'Academic Track Faculty',            icon: 'fa-solid fa-people-arrows',            bg: 'image/book5.jpg',            q1Percent: 87,            q2Percent: 87,            summary: 'Builds civic participation through rights, duties, community action, and service-oriented learning.',            q1Topics: [                { title: 'Rights, Duties, and Citizenship', status: 'completed', grades: { quiz: 90, assignment: 88, activity: 91, performance: 89 } },                { title: 'Community Participation', status: 'completed', grades: { quiz: 88, assignment: 86, activity: 89, performance: 87 } },                { title: 'Social Issues and Public Service', status: 'completed', grades: { quiz: 86, assignment: 84, activity: 88, performance: 85 } },                { title: 'Advocacy and Volunteerism', status: 'in-progress', grades: { quiz: 0, assignment: 82, activity: 0, performance: 0 } },                { title: 'Civic Action Project', status: 'not-started', grades: null }            ]        },        'card-introcomp': {            text: 'Intro to Computing',            subtitle: 'Foundations â€¢ Grade 11',            instructor: 'Carlo Bautista',            icon: 'fa-solid fa-desktop',            bg: 'image/book4.jpg',            q1Percent: 100,            q2Percent: 100,            summary: 'Basic computer concepts, hardware, software, and digital literacy foundations.',            q1Topics: [                { title: 'Introduction to Hardware', status: 'completed', grades: { quiz: 95, assignment: 98, activity: 96, performance: 97 } },                { title: 'Software Ecosystems', status: 'completed', grades: { quiz: 94, assignment: 96, activity: 95, performance: 94 } }            ]        },        'card-oralcomm': {            text: 'Oral Communication',            subtitle: 'Core Subject â€¢ Grade 11',            instructor: 'Ana Reyes',            icon: 'fa-solid fa-comments',            bg: 'image/book1.jpg',            q1Percent: 100,            q2Percent: 100,            summary: 'Developing effective speaking and listening skills for various contexts.',            q1Topics: [                { title: 'Public Speaking Basics', status: 'completed', grades: { quiz: 92, assignment: 94, activity: 93, performance: 95 } },                { title: 'Interpersonal Communication', status: 'completed', grades: { quiz: 91, assignment: 93, activity: 92, performance: 94 } }            ]        },        'card-genmath': {            text: 'General Mathematics',            subtitle: 'Core Subject â€¢ Grade 11',            instructor: 'Jose Santos',            icon: 'fa-solid fa-infinity',            bg: 'image/book2.jpg',            q1Percent: 100,            q2Percent: 100,            summary: 'Strengthens practical mathematical thinking through functions and logical problem-solving.',            q1Topics: [                { title: 'Advanced Algebra', status: 'completed', grades: { quiz: 88, assignment: 90, activity: 89, performance: 91 } },                { title: 'Mathematical Logic', status: 'completed', grades: { quiz: 87, assignment: 89, activity: 88, performance: 90 } }            ]        },        'card-animation': {            text: 'Animation',            subtitle: 'ICT Strand â€¢ Grade 11',            instructor: 'Tricia Villanueva',            icon: 'fa-solid fa-palette',            bg: 'image/book3.jpg',            q1Percent: 100,            q2Percent: 100,            summary: 'Principles of animation, character design, and basic movement techniques.',            q1Topics: [                { title: '12 Principles of Animation', status: 'completed', grades: { quiz: 96, assignment: 98, activity: 96, performance: 97 } },                { title: 'Keyframing Techniques', status: 'completed', grades: { quiz: 95, assignment: 97, activity: 95, performance: 96 } }            ]        }    };    function getEquivalentGrade(score) {        if (score >= 98) return '1.00';        if (score >= 95) return '1.25';        if (score >= 92) return '1.50';        if (score >= 89) return '1.75';        if (score >= 86) return '2.00';        if (score >= 83) return '2.25';        if (score >= 80) return '2.50';        if (score >= 77) return '2.75';        if (score >= 75) return '3.00';        return '5.00';    }    function buildAssessmentRows() {        const seen = new Set();        const sources = [            ...subjectsData.enrolled.map(subject => subject.id),            ...subjectsData.completed.map(subject => subject.id),            ...Object.keys(curriculumTopicCatalog),            ...Object.keys(dynamicCurriculumSubjects)        ];        const baseDate = new Date('2026-03-26T08:00:00');        const rows = [];        sources.forEach(subjectId => {            if (seen.has(subjectId)) return;            seen.add(subjectId);            const subject = getTopicSubject(subjectId);            const data = getTopicData(subjectId);            const subjectName = getSubjectDisplayName(subject);            const topics = Array.isArray(data?.q1Topics) ? data.q1Topics : [];            if (!subject || !subjectName || !topics.length) return;            topics.forEach((topic, index) => {                const startDate = new Date(baseDate);                startDate.setDate(baseDate.getDate() - (index * 3 + (subjectName.length % 5) + 2));                const dueDate = new Date(startDate);                dueDate.setDate(startDate.getDate() + 7);                const activityScore = topic.grades?.activity || 0;                const submittedOn = topic.status === 'not-started' ? null : new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000);                const gradedOn = activityScore > 0 ? new Date(startDate.getTime() + 4 * 24 * 60 * 60 * 1000) : null;                let status = 'pending';                if (topic.status === 'completed' || (submittedOn && !gradedOn) || (submittedOn && gradedOn)) status = 'completed';                else if (dueDate < baseDate) status = 'overdue';                rows.push({                    subjectId,                    topicIdx: index,                    subject: subjectName,                    activity: topic.title,                    startDate,                    dueDate,                    submittedOn,                    gradedOn,                    score: activityScore,                    equivalent: activityScore > 0 ? getEquivalentGrade(activityScore) : '-',                    status                });            });        });        return rows.sort((a, b) => a.dueDate - b.dueDate);    }    function renderAssessmentsPage() {        const layout = document.getElementById('assessments-layout');        if (!layout) return;        try {            const rows = buildAssessmentRows();            const pendingCount = rows.filter(row => row.status === 'pending').length;            const completedCount = rows.filter(row => row.status === 'completed').length;            const overdueCount = rows.filter(row => row.status === 'overdue').length;            const subjects = [...new Set(rows.map(row => row.subject))].sort((a, b) => a.localeCompare(b));            const overdueRows = rows.filter(row => row.status === 'overdue').slice(0, 3);            const pendingRows = rows.filter(row => row.status === 'pending').slice(0, 2);            const concernItems = [];            if (overdueCount > 0) {                concernItems.push(`You have ${overdueCount} overdue ${overdueCount === 1 ? 'activity' : 'activities'} that need immediate attention.`);            }            overdueRows.forEach(row => {                concernItems.push(`Submit ${row.activity} in ${row.subject} as soon as possible.`);            });            if (pendingCount > 0) {                concernItems.push(`You still have ${pendingCount} pending ${pendingCount === 1 ? 'activity' : 'activities'} scheduled next.`);            }            pendingRows.forEach(row => {                concernItems.push(`Prepare ${row.activity} for ${row.subject} before ${formatAssessmentDate(row.dueDate)}.`);            });            if (!concernItems.length) {                concernItems.push('No urgent concerns right now. Keep maintaining your completed activities and upcoming deadlines.');            }            const statusBadge = status => {                if (status === 'completed') return '<span class="px-2.5 py-1 bg-green-100 text-green-700 text-[9px] font-bold uppercase rounded-lg">Completed</span>';                if (status === 'overdue') return '<span class="px-2.5 py-1 bg-red-100 text-red-600 text-[9px] font-bold uppercase rounded-lg">Overdue</span>';                return '<span class="px-2.5 py-1 bg-amber-100 text-amber-700 text-[9px] font-bold uppercase rounded-lg">Pending</span>';            };            const renderAssessmentRow = row => `            <tr class="hover:bg-gray-50/50 transition-colors" data-subject="${row.subject}">                <td class="px-3 py-4 text-sm font-bold text-gray-800">                    <button type="button" class="text-left text-icc hover:text-icc-dark hover:underline transition-colors" onclick="event.stopPropagation(); openTopicContent('${row.subjectId}', ${row.topicIdx}, 'activity')">${row.activity}</button>                </td>                <td class="px-3 py-4 text-sm text-gray-600 font-medium">                    <button type="button" class="assessment-subject-link block w-full text-left text-icc font-bold hover:text-icc-dark hover:underline transition-colors cursor-pointer" data-subject-id="${row.subjectId}" onclick="event.preventDefault(); event.stopPropagation(); openAssessmentSubjectLink('${row.subjectId}')" title="Open ${row.subject}">                        ${row.subject}                    </button>                </td>                <td class="px-3 py-4 text-sm text-gray-500">${formatAssessmentDate(row.startDate)}</td>                <td class="px-3 py-4 text-sm ${row.status === 'overdue' ? 'text-red-500 font-bold' : 'text-gray-500'}">${formatAssessmentDate(row.dueDate)}</td>                <td class="px-3 py-4 text-sm text-gray-500">${row.submittedOn ? formatAssessmentDate(row.submittedOn) : '-'}</td>                <td class="px-3 py-4 text-sm text-gray-500">${row.gradedOn ? formatAssessmentDate(row.gradedOn) : '-'}</td>                <td class="px-3 py-4 text-sm font-bold ${row.score >= 90 ? 'text-green-600' : row.score >= 80 ? 'text-icc' : row.score >= 75 ? 'text-amber-600' : row.score > 0 ? 'text-red-500' : 'text-gray-400'}">${row.score > 0 ? `${row.score}%` : '-'}</td>                <td class="px-3 py-4 text-sm font-bold text-gray-700">${row.equivalent && row.equivalent !== '-' ? row.equivalent : '-'}</td>                <td class="px-3 py-4">${statusBadge(row.status)}</td>            </tr>        `;            layout.innerHTML = `            <div class="max-w-[1024px] mx-auto bg-white rounded-2xl flex flex-col gap-6 p-0 overflow-hidden">                <div class="w-full border-b border-gray-100">                    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col">                        <div class="px-5 py-4 bg-white border-b border-gray-100 flex items-center gap-3">                            <div class="w-10 h-10 rounded-xl bg-icc-yellow flex items-center justify-center flex-shrink-0">                                <i class="fa-solid fa-bolt text-black text-base"></i>                            </div>                            <p class="text-sm font-black uppercase tracking-widest text-gray-900">SIGMA</p>                        </div>                        <div class="p-5 space-y-3 overflow-y-auto">                            ${concernItems.map(item => `                                <div class="flex items-start gap-3">                                    <i class="fa-solid fa-angle-right text-icc mt-1 text-xs"></i>                                    <p class="text-sm text-gray-700 leading-relaxed font-medium">${item}</p>                                </div>                            `).join('')}                        </div>                    </div>                </div>                <div class="flex-1 min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">                    <div class="px-5 py-4 border-b border-gray-100 bg-gray-50/40">                        <div class="flex items-end justify-between gap-4">                            <div>                                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assessment Overview</p>                                <div class="flex flex-wrap gap-3 mt-3">                                    <div class="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100">                                        <i class="fa-solid fa-hourglass-half text-amber-500 text-sm"></i>                                        <span class="text-[10px] font-black text-amber-700 uppercase tracking-widest">Pending</span>                                        <span class="text-sm font-black text-gray-800">${pendingCount}</span>                                    </div>                                    <div class="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-100">                                        <i class="fa-solid fa-check-double text-green-500 text-sm"></i>                                        <span class="text-[10px] font-black text-green-700 uppercase tracking-widest">Completed</span>                                        <span class="text-sm font-black text-gray-800">${completedCount}</span>                                    </div>                                    <div class="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-100">                                        <i class="fa-solid fa-circle-exclamation text-red-500 text-sm"></i>                                        <span class="text-[10px] font-black text-red-700 uppercase tracking-widest">Overdue</span>                                        <span class="text-sm font-black text-gray-800">${overdueCount}</span>                                    </div>                                </div>                            </div>                            <select id="assessments-subject-filter" class="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 focus:outline-none focus:border-icc min-w-[220px]">                                <option value="all">All Subjects</option>                                ${subjects.map(subject => `<option value="${subject}">${subject}</option>`).join('')}                            </select>                        </div>                    </div>                    <div class="overflow-auto flex-1">                        <table class="w-full text-left border-collapse">                            <thead>                                <tr class="bg-gray-50/60">                                    <th class="px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Activity</th>                                    <th class="px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subject</th>                                    <th class="px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Start</th>                                    <th class="px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Due</th>                                    <th class="px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Submitted On</th>                                    <th class="px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Graded On</th>                                    <th class="px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Score %</th>                                    <th class="px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Equivalent Grade</th>                                    <th class="px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>                                </tr>                            </thead>                            <tbody id="assessments-body" class="divide-y divide-gray-50"></tbody>                        </table>                    </div>                    <div class="px-5 py-4 border-t border-gray-100 bg-white flex items-center justify-between gap-4 flex-wrap">                        <p id="assessments-pagination-info" class="text-xs font-bold text-gray-500 uppercase tracking-widest">Showing 0 of 0</p>                        <div class="flex items-center gap-2">                            <button id="assessments-prev-page" type="button" class="px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-black text-gray-700 hover:bg-gray-50 transition-all">Previous</button>                            <span id="assessments-page-indicator" class="text-xs font-black text-gray-500 uppercase tracking-widest">Page 1 of 1</span>                            <button id="assessments-next-page" type="button" class="px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-black text-gray-700 hover:bg-gray-50 transition-all">Next</button>                        </div>                    </div>                </div>            </div>            `;            const body = layout.querySelector('#assessments-body');            const filter = layout.querySelector('#assessments-subject-filter');            const info = layout.querySelector('#assessments-pagination-info');            const indicator = layout.querySelector('#assessments-page-indicator');            const prevBtn = layout.querySelector('#assessments-prev-page');            const nextBtn = layout.querySelector('#assessments-next-page');            const pageSize = 8;            let currentPage = 1;            const tableScrollWrap = body?.closest('.overflow-auto');            function getFilteredRows() {                const selectedSubject = filter?.value || 'all';                return selectedSubject === 'all'                    ? rows                    : rows.filter(row => row.subject === selectedSubject);            }            function bindAssessmentSubjectLinks() {                layout.querySelectorAll('.assessment-subject-link').forEach(button => {                    button.addEventListener('click', event => {                        event.preventDefault();                        event.stopPropagation();                        scrollToSubjectCard(button.dataset.subjectId);                    });                });            }            function renderAssessmentPageRows() {                const filteredRows = getFilteredRows();                const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));                currentPage = Math.min(currentPage, totalPages);                const startIndex = (currentPage - 1) * pageSize;                const visibleRows = filteredRows.slice(startIndex, startIndex + pageSize);                body.innerHTML = visibleRows.length                    ? visibleRows.map(renderAssessmentRow).join('')                    : '<tr><td colspan="9" class="px-5 py-10 text-center text-sm font-medium text-gray-400">No activities found for this filter.</td></tr>';                info.textContent = filteredRows.length                    ? `Showing ${startIndex + 1}-${Math.min(startIndex + pageSize, filteredRows.length)} of ${filteredRows.length}`                    : 'Showing 0 of 0';                indicator.textContent = `Page ${currentPage} of ${totalPages}`;                prevBtn.disabled = currentPage === 1;                nextBtn.disabled = currentPage === totalPages;                prevBtn.classList.toggle('opacity-40', prevBtn.disabled);                nextBtn.classList.toggle('opacity-40', nextBtn.disabled);                if (tableScrollWrap) tableScrollWrap.scrollTo({ top: 0, behavior: 'auto' });                bindAssessmentSubjectLinks();            }            filter?.addEventListener('change', () => {                currentPage = 1;                renderAssessmentPageRows();            });            prevBtn?.addEventListener('click', () => {                if (currentPage > 1) {                    currentPage -= 1;                    renderAssessmentPageRows();                }            });            nextBtn?.addEventListener('click', () => {                const totalPages = Math.max(1, Math.ceil(getFilteredRows().length / pageSize));                if (currentPage < totalPages) {                    currentPage += 1;                    renderAssessmentPageRows();                }            });            renderAssessmentPageRows();        } catch (error) {            console.error('Failed to render assessments page:', error);            layout.innerHTML = `                <div class="bg-white rounded-2xl border border-red-100 shadow-sm p-8">                    <p class="text-[11px] font-black uppercase tracking-widest text-red-500">Assessments</p>                    <h3 class="text-2xl font-black text-gray-900 mt-2">Assessment content could not load.</h3>                    <p class="text-sm text-gray-500 mt-3">We hit a render error while building this page. The student script has been hardened, so after a refresh this section should recover instead of staying blank.</p>                </div>            `;        }    }    let currentGradesView = 'overall';    let currentGradesAnalyticsMode = 'terms';    let gradesCarouselIndex = 0;    function clampPercent(value) {        return Math.max(0, Math.min(100, Math.round(value || 0)));    }    function getTopicAveragePercent(topic) {        if (!topic?.grades) return null;        const values = ['quiz', 'assignment', 'activity', 'performance']            .map(key => topic.grades[key])            .filter(value => typeof value === 'number' && value > 0);        if (!values.length) return null;        return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);    }    function getSubjectGradeRows() {        return subjectsData.enrolled.map(subject => {            const data = getTopicData(subject.id) || subject;            const topicAverages = (data.q1Topics || [])                .map(getTopicAveragePercent)                .filter(value => value !== null);            const completedTopics = (data.q1Topics || []).filter(topic => topic.status === 'completed').length;            const totalTopics = (data.q1Topics || []).length || 1;            const completion = clampPercent((completedTopics / totalTopics) * 100);            const term1 = clampPercent(topicAverages.length                ? topicAverages.reduce((sum, value) => sum + value, 0) / topicAverages.length                : (data.q1Percent || subject.q1Percent || 0));            const subjectNameRef = subject.text || subject.title || '';            const term2Seed = (subjectNameRef.length % 7) - 3;            const term2 = clampPercent((data.q2Percent && data.q2Percent > 0)                ? data.q2Percent                : term1 + term2Seed);            const term3Seed = (subject.id.length % 5) - 2;            const term3Base = typeof data.q3Percent === 'number' && data.q3Percent > 0 ? data.q3Percent : term2 + term3Seed;            const term3 = clampPercent(term3Base);            const overall = clampPercent((term1 + term2 + term3) / 3);            const equivalent = getEquivalentGrade(overall);            const remark = overall >= 90 ? 'Outstanding'                : overall >= 85 ? 'Very Good'                    : overall >= 80 ? 'Good'                        : overall >= 75 ? 'Passing'                            : 'At Risk';            return {                id: subject.id,                subject: getSubjectDisplayName(subject),                teacher: subject.instructor || 'Subject Teacher',                track: getSubjectDisplaySubtitle(subject),                term1,                term2,                term3,                overall,                equivalent,                completion,                remark            };        });    }    function renderGradesAnalytics(rows) {        if (!rows || !rows.length) return '';        // Sort a copy so we don't mutate the original array used by the table        const sorted = rows.slice().sort((a, b) => b.overall - a.overall);        const gwa = rows.reduce((sum, r) => sum + r.overall, 0) / rows.length;        const scoreColorClass = value => value >= 90 ? 'text-green-600' : value >= 80 ? 'text-icc' : value >= 75 ? 'text-amber-600' : 'text-red-500';        const barColorClass = value => value >= 90 ? 'bg-green-500' : value >= 80 ? 'bg-icc' : value >= 75 ? 'bg-amber-400' : 'bg-red-400';        // Build subject cards using string concat to avoid nested template literal issues        let subjectCards = '';        rows.forEach(function (row) {            const quarters = ['term1', 'term2', 'term3', 'term4'];            let bars = '';            quarters.forEach(function (term, i) {                const val = row[term] || 0;                bars += '<div class="grade-bar-wrapper">'                    + '<div class="grade-bar">'                    + '<div class="grade-bar-fill ' + barColorClass(val) + '" style="height:' + val + '%"></div>'                    + '</div>'                    + '<span class="grade-bar-label">Q' + (i + 1) + '</span>'                    + '</div>';            });            const remarkColor = row.overall >= 75 ? 'text-icc' : 'text-red-500';            subjectCards += '<div class="grade-card group">'                + '<div class="flex justify-between items-start">'                + '<div class="min-w-0">'                + '<h4 class="text-sm font-black text-gray-900 truncate group-hover:text-icc transition-colors">' + row.subject + '</h4>'                + '<p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">' + row.teacher + '</p>'                + '</div>'                + '<span class="text-xl font-black ' + scoreColorClass(row.overall) + '">' + row.overall + '%</span>'                + '</div>'                + '<div class="grade-mini-chart">' + bars + '</div>'                + '<div class="pt-2 border-t border-gray-50 flex items-center justify-between">'                + '<span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Remark</span>'                + '<span class="text-[10px] font-black uppercase tracking-widest ' + remarkColor + '">' + row.remark + '</span>'                + '</div>'                + '</div>';        });        return `        <div class="grades-analytic-container space-y-8">            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">                <div class="lg:col-span-1 gwa-card rounded-[32px] p-8 flex flex-col justify-between shadow-lg">                    <div>                        <p class="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">General Weighted Average</p>                        <h2 class="gwa-value mt-4">${gwa.toFixed(1)}%</h2>                    </div>                    <div class="mt-8">                        <span class="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-xl text-xs font-black uppercase tracking-widest text-white border border-white/10">                            <i class="fa-solid fa-award"></i> ${getEquivalentGrade(gwa)}                        </span>                    </div>                </div>                <div class="lg:col-span-2 bg-white rounded-[32px] border border-gray-100 p-6 shadow-sm flex flex-col justify-center gap-4">                    <div class="flex items-center gap-2">                        <div class="w-8 h-8 bg-icc-yellow rounded-lg flex items-center justify-center shadow-md flex-shrink-0">                            <i class="fa-solid fa-bolt text-black text-sm"></i>                        </div>                        <span class="text-xs font-black uppercase tracking-[0.25em] text-gray-900">SIGMA</span>                    </div>                    <div class="bg-gray-50 rounded-2xl rounded-tl-sm px-5 py-4 border border-gray-100">                        <p class="text-sm text-gray-700 font-medium leading-relaxed">                            Hi <span class="font-black text-gray-900">User</span>! You're currently enrolled in <span class="text-icc font-black">${rows.length} subjects</span>.                            Your strongest subject this quarter is <span class="text-icc font-black">${sorted[0] ? sorted[0].subject : 'Ã¢â‚¬â€'}</span> great work!                            Keep pushing across all four quarters and you're on track for an excellent GWA.                        </p>                    </div>                </div>            </div>            <div>                <div class="flex items-center justify-between mb-6 px-2">                    <h3 class="text-lg font-black text-gray-900 uppercase tracking-widest">Subject Breakdown</h3>                    <div class="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">                        <span class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-icc"></div> Q1Ã¢â‚¬â€œQ4 Trend</span>                    </div>                </div>                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">                    ${subjectCards}                </div>            </div>        </div>        `;    }    function renderGradesPage() {        const layout = document.getElementById('grades-layout');        if (!layout) return;        try {            const rows = getSubjectGradeRows();            const termButtonClass = view => currentGradesView === view                ? 'bg-icc text-white border-icc'                : 'bg-white text-gray-500 border-gray-200 hover:border-icc hover:text-icc';            const scoreColorClass = value => value >= 90                ? 'text-green-600'                : value >= 80                    ? 'text-icc'                    : value >= 75                        ? 'text-amber-600'                        : 'text-red-500';            const remarkBadge = remark => {                if (remark === 'Outstanding') return 'bg-green-100 text-green-700';                if (remark === 'Very Good') return 'bg-emerald-50 text-emerald-700';                if (remark === 'Good') return 'bg-blue-50 text-blue-700';                if (remark === 'Passing') return 'bg-amber-50 text-amber-700';                return 'bg-red-100 text-red-600';            };            layout.innerHTML = `            <div class="space-y-6">                <!-- Analytics Panel -->                ${renderGradesAnalytics(rows)}                <div class="bg-white rounded-[28px] border border-gray-100 shadow-sm overflow-hidden">                    <div class="overflow-x-auto">                        <table class="w-full text-left border-collapse">                            <thead>                                <tr class="bg-gray-50/60">                                    <th class="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject</th>                                    <th class="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Teacher</th>                                    <th class="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center ${currentGradesView === 'term1' ? 'text-icc' : ''}">1st Quarter</th>                                    <th class="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center ${currentGradesView === 'term2' ? 'text-icc' : ''}">2nd Quarter</th>                                    <th class="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center ${currentGradesView === 'term3' ? 'text-icc' : ''}">3rd Quarter</th>                                    <th class="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center ${currentGradesView === 'term4' ? 'text-icc' : ''}">4th Quarter</th>                                    <th class="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center ${currentGradesView === 'overall' ? 'text-icc' : ''}">Overall</th>                                    <th class="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Equivalent</th>                                    <th class="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Completion</th>                                    <th class="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Remark</th>                                </tr>                            </thead>                            <tbody class="divide-y divide-gray-50">                                ${rows.map(row => `                                    <tr class="hover:bg-gray-50/60 transition-colors">                                        <td class="px-6 py-5">                                            <button type="button" class="grade-subject-link text-left" data-subject-id="${row.id}">                                                <span class="block text-base font-black text-icc hover:text-icc-dark hover:underline transition-colors">${row.subject}</span>                                                <span class="block text-xs text-gray-500 mt-1">${row.track}</span>                                            </button>                                        </td>                                        <td class="px-6 py-5">                                            <span class="text-sm font-semibold text-gray-700">${row.teacher}</span>                                        </td>                                        <td class="px-6 py-5 text-center">                                            <span class="text-base font-black ${scoreColorClass(row.term1)}">${row.term1}%</span>                                        </td>                                        <td class="px-6 py-5 text-center">                                            <span class="text-base font-black ${scoreColorClass(row.term2)}">${row.term2}%</span>                                        </td>                                        <td class="px-6 py-5 text-center">                                            <span class="text-base font-black ${scoreColorClass(row.term3)}">${row.term3}%</span>                                        </td>                                        <td class="px-6 py-5 text-center">                                            <span class="text-base font-black text-gray-300">Ã¢â‚¬â€</span>                                        </td>                                        <td class="px-6 py-5 text-center">                                            <span class="text-lg font-black ${scoreColorClass(row.overall)}">${row.overall}%</span>                                        </td>                                        <td class="px-6 py-5 text-center">                                            <span class="text-sm font-black text-gray-800">${row.equivalent}</span>                                        </td>                                        <td class="px-6 py-5 text-center">                                            <div class="mx-auto max-w-[92px]">                                                <span class="text-sm font-black ${scoreColorClass(row.completion)}">${row.completion}%</span>                                                <div class="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">                                                    <div class="h-full rounded-full bg-[linear-gradient(90deg,#ef4444_0%,#f59e0b_55%,#22c55e_100%)]" style="width:${row.completion}%"></div>                                                </div>                                            </div>                                        </td>                                        <td class="px-6 py-5 text-center">                                            <span class="inline-flex px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest ${remarkBadge(row.remark)}">${row.remark}</span>                                        </td>                                    </tr>                                `).join('')}                            </tbody>                        </table>                    </div>                </div>            </div>            `;            layout.querySelectorAll('.grade-view-tab').forEach(button => {                button.addEventListener('click', () => {                    currentGradesView = button.dataset.gradeView;                    renderGradesPage();                });            });            layout.querySelectorAll('.grade-subject-link').forEach(button => {                button.addEventListener('click', event => {                    event.preventDefault();                    event.stopPropagation();                    scrollToSubjectCard(button.dataset.subjectId);                });            });            // Ã¢â€â‚¬Ã¢â€â‚¬ Carousel init Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬            const carousel = layout.querySelector('#grade-subject-carousel');            if (carousel) {                const track = carousel.querySelector('.grade-carousel-track');                const dots = carousel.querySelectorAll('.grade-carousel-dot');                const prevBtn = carousel.querySelector('.grade-carousel-prev');                const nextBtn = carousel.querySelector('.grade-carousel-next');                const totalSlides = rows.length;                function updateCarousel() {                    track.style.transform = 'translateX(-' + (gradesCarouselIndex * 100) + '%)';                    dots.forEach(function (dot, i) {                        if (i === gradesCarouselIndex) {                            dot.style.background = '#15803d';                            dot.style.width = '24px';                            dot.style.borderRadius = '9999px';                        } else {                            dot.style.background = '#e2e8f0';                            dot.style.width = '8px';                        }                    });                    prevBtn.style.opacity = totalSlides <= 1 ? '0.3' : '1';                    nextBtn.style.opacity = totalSlides <= 1 ? '0.3' : '1';                }                prevBtn.addEventListener('click', function () {                    gradesCarouselIndex = (gradesCarouselIndex - 1 + totalSlides) % totalSlides;                    updateCarousel();                });                nextBtn.addEventListener('click', function () {                    gradesCarouselIndex = (gradesCarouselIndex + 1) % totalSlides;                    updateCarousel();                });                dots.forEach(function (dot, i) {                    dot.addEventListener('click', function () {                        gradesCarouselIndex = i;                        updateCarousel();                    });                });                // Clamp index in case subject count changed                if (gradesCarouselIndex >= totalSlides) gradesCarouselIndex = 0;                updateCarousel();            }        } catch (error) {            console.error('Failed to render grades page:', error);            layout.innerHTML = `                <div class="bg-white rounded-2xl border border-red-100 shadow-sm p-8">                    <p class="text-[11px] font-black uppercase tracking-widest text-red-500">Grades</p>                    <h3 class="text-2xl font-black text-gray-900 mt-2">Grade content could not load.</h3>                    <p class="text-sm text-gray-500 mt-3">We hit a render error while building this page. The student script has been hardened, so after a refresh this section should recover instead of staying blank.</p>                </div>            `;        }    }    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Calendar Logic (Admin Copy) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬    let currentCalDate = new Date();    function renderCalendar() {        const monthYearLabel = document.getElementById('calendarDropdownMonthYear');        const daysGrid = document.getElementById('calendarDropdownDaysGrid');        if (!monthYearLabel || !daysGrid) return;        const year = currentCalDate.getFullYear();        const month = currentCalDate.getMonth();        const firstDay = new Date(year, month, 1).getDay();        const daysInMonth = new Date(year, month + 1, 0).getDate();        const today = new Date();        monthYearLabel.textContent = currentCalDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });        let html = '';        for (let i = 0; i < firstDay; i++) html += '<div></div>';        for (let day = 1; day <= daysInMonth; day++) {            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();            const baseClasses = "w-9 h-9 flex items-center justify-center text-[12px] font-bold transition-all cursor-pointer rounded-full mx-auto";            const stateClasses = isToday ? "bg-[#15803d] text-white" : "text-black hover:bg-slate-100";            html += `<div class="${baseClasses} ${stateClasses}">${day}</div>`;        }        daysGrid.innerHTML = html;    }    const dailySchedule = [        { time: '08:00', endTime: '09:30', subject: 'Effective Communication', room: 'Room 201' },        { time: '10:00', endTime: '11:30', subject: 'General Mathematics', room: 'Room 305' },        { time: '13:00', endTime: '14:30', subject: 'Intro to Computing', room: 'Lab 1' }    ];    const upcomingAssessmentItems = [        { title: 'Quiz 3 â€¢ Effective Communication', when: 'Due Today â€¢ 11:59 PM', status: 'Due' },        { title: 'Lab 2 â€¢ Intro to Computing', when: 'May 5 â€¢ 10:00 AM', status: 'Upcoming' },        { title: 'Assignment 1 â€¢ General Math', when: 'May 6 â€¢ 3:00 PM', status: 'Upcoming' }    ];    function timeToMinutes(value) {        if (!value) return 0;        const [hour, minute] = value.split(':').map(Number);        return (hour * 60) + minute;    }    function getUpcomingClasses(limit = 2) {        if (!dailySchedule.length) return [];        const now = new Date();        const nowMinutes = (now.getHours() * 60) + now.getMinutes();        const sorted = [...dailySchedule].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));        const startIndex = sorted.findIndex(item => timeToMinutes(item.time) >= nowMinutes);        const initialIndex = startIndex >= 0 ? startIndex : 0;        const result = [];        for (let i = 0; i < Math.min(limit, sorted.length); i += 1) {            result.push(sorted[(initialIndex + i) % sorted.length]);        }        return result;    }    function getTopicData(subjectId) {        return curriculumTopicCatalog[subjectId] || dynamicCurriculumSubjects[subjectId] || null;    }    function getTopicSubject(subjectId) {        const programSubjects = [];        Object.values(curriculumPrograms).forEach(p => {            if (p.subjects) programSubjects.push(...p.subjects);            if (p.stages) programSubjects.push(...p.stages);        });        const exactMatch = programSubjects.find(s => (s.id === subjectId || s.key === subjectId));        if (exactMatch) return exactMatch;        // Check clusters        for (const p of Object.values(curriculumPrograms)) {            if (p.clusters) {                for (const cluster of p.clusters) {                    const titleMatch = (cluster.subjects || []).find(t => `gen-${slugify(t)}` === subjectId);                    if (titleMatch) return ensureSubjectDataForTitle(titleMatch, cluster.title);                }            }        }        return dynamicCurriculumSubjects[subjectId] || null;    }    function ensureSubjectDataForTitle(title, clusterTitle) {        const subjectId = `gen-${slugify(title)}`;        if (!dynamicCurriculumSubjects[subjectId]) {            dynamicCurriculumSubjects[subjectId] = {                id: subjectId,                text: title,                subtitle: `${clusterTitle} â€¢ Grade 11`,                instructor: 'Cluster Faculty',                icon: 'fa-solid fa-book-open',                bg: 'image/book1.jpg',                q1Percent: 0,                q2Percent: 0,                summary: `${title} is part of the ${clusterTitle} cluster and introduces the essential ideas, skills, and outputs learners will study in this learning path.`,                q1Topics: [                    { title: `Introduction to ${title}`, status: 'completed' },                    { title: `Core Concepts in ${title}`, status: 'in-progress' },                    { title: `Applied Practice in ${title}`, status: 'not-started' },                    { title: `Assessment and Reflection for ${title}`, status: 'not-started' }                ]            };        }        return dynamicCurriculumSubjects[subjectId];    }    function slugify(text) {        return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');    }    function setSubjectsPageScrollLocked(locked) {        // Standardize: Main scrollbar should always be visible/available        document.documentElement.style.overflow = '';        document.body.style.overflow = '';    }    function getInlineAnchor(programKey) {        return 'left';    }    function getElectiveMode() {        if (currentStudentCurriculumLabel === 'K to 12 Curriculum') return 'k12';        if (currentStudentCurriculumLabel === 'MATATAG Curriculum') return 'matatag';        return 'default';    }    function buildElectiveTrackSections() {        const program = curriculumPrograms['applied-subjects'];        if (!program) return [];        const mode = getElectiveMode();        const trackMap = new Map();        if (mode === 'k12') {            (program.k12Groups || []).forEach(group => {                if (!trackMap.has(group.track)) trackMap.set(group.track, []);                const items = trackMap.get(group.track);                const sourceClusters = (program.clusters || []).filter(cluster => (group.sourceKeys || []).includes(cluster.key));                sourceClusters.forEach(cluster => {                    (cluster.subjects || []).forEach(title => {                        const subject = ensureSubjectDataForTitle(title, group.title);                        items.push({                            kind: 'subject',                            id: subject.id,                            title,                            copy: subject.summary || `${title} is one of the elective subjects under ${group.title}.`,                            media: subject.bg || group.image || program.image,                            meta: group.title,                            aiInsight: subject.summary || `${title} belongs to ${group.title} under ${group.track}.`,                            progress: 0                        });                    });                });            });        } else {            (program.clusters || []).forEach(cluster => {                if (!trackMap.has(cluster.track)) trackMap.set(cluster.track, []);                const items = trackMap.get(cluster.track);                (cluster.subjects || []).forEach(title => {                    const subject = ensureSubjectDataForTitle(title, cluster.title);                    items.push({                        kind: 'subject',                        id: subject.id,                        title,                        copy: subject.summary || `${title} is one of the subjects under ${cluster.title}.`,                        media: subject.bg || cluster.image || program.image,                        meta: cluster.title,                        aiInsight: subject.summary || `${title} belongs to ${cluster.title} under ${cluster.track}.`,                        progress: 0                    });                });            });        }        return Array.from(trackMap.entries()).map(([track, items]) => {            const seen = new Set();            return {                title: track,                items: items.filter(item => {                    const key = `${track}:${item.title}`;                    if (seen.has(key)) return false;                    seen.add(key);                    return true;                })            };        });    }    function buildInlineItems(programKey) {        const program = curriculumPrograms[programKey];        if (!program) return [];        if (program.subjects) {            return program.subjects.map(item => {                const subjectData = getTopicData(item.id) || {};                return {                    kind: 'subject',                    id: item.id,                    title: item.title,                    copy: subjectData.summary || item.overview,                    media: item.image,                    meta: programKey === 'core-subjects' ? '' : (subjectData.subtitle || ''),                    aiInsight: '',                    progress: 0                };            });        }        if (program.clusters) {            return program.clusters.map(item => ({                kind: 'cluster',                key: item.key,                title: item.title,                copy: item.overview,                media: item.image || '',                meta: `${item.track} â€¢ ${item.subjectCount} Subjects`            }));        }        return [];    }    function buildTrackClusterSubjectItems(programKey, clusterKey) {        if (programKey === 'applied-subjects') {            const k12Group = (curriculumPrograms[programKey]?.k12Groups || []).find(group => group.key === clusterKey);            if (k12Group) {                const sourceClusters = (curriculumPrograms[programKey]?.clusters || []).filter(cluster => (k12Group.sourceKeys || []).includes(cluster.key));                const seen = new Set();                const titles = [];                sourceClusters.forEach(cluster => {                    (cluster.subjects || []).forEach(title => {                        if (!seen.has(title)) {                            seen.add(title);                            titles.push(title);                        }                    });                });                return titles.map(title => {                    const subject = ensureSubjectDataForTitle(title, k12Group.title);                    return {                        kind: 'subject',                        id: subject.id,                        title,                        copy: subject.summary,                        media: subject.bg,                        progress: 0                    };                });            }        }        return [];    }    function getProgressVisuals(progress) {        if (progress >= 100) return { color: '#15803d', gradient: 'linear-gradient(to top, #15803d, #166534)' };        if (progress >= 50) return { color: '#ca8a04', gradient: 'linear-gradient(to top, #ca8a04, #a16207)' };        return { color: '#b91c1c', gradient: 'linear-gradient(to top, #b91c1c, #991b1b)' };    }    function askSigmaAbout(title, insight) {        openAiPanel();        addAiMessage(`Tell me about ${title}. ${insight}`, true);        setSigmaAiWaiting(true);        setTimeout(() => {            setSigmaAiWaiting(false);            addAiMessage(`SIGMA AI analysis for ${title}: This subject is an essential part of your curriculum, focusing on practical skills and foundational knowledge required for your chosen track.`);        }, 1500);    }    function syncInlinePanelBackButtons() {        // Implementation for syncing back buttons if needed    }    function handleInlineCardSelection(programKey, item) {        if (item.kind === 'subject') {            switchToTopicPage(item.id);            return;        }        if (item.kind === 'cluster') {            currentCurriculumCluster = item.key;            // renderSubjectsInlineDetail removed            const detail = document.getElementById('subjects-inline-detail');            if (detail) detail.scrollTo({ top: 0, behavior: 'auto' });            return;        }        const subject = ensureSubjectDataForTitle(item.title, curriculumPrograms[programKey]?.title || 'Program');        switchToTopicPage(subject.id);    }    function getEquivalentGrade(score) {        if (score >= 98) return '1.00';        if (score >= 95) return '1.25';        if (score >= 92) return '1.50';        if (score >= 89) return '1.75';        if (score >= 86) return '2.00';        if (score >= 83) return '2.25';        if (score >= 80) return '2.50';        if (score >= 77) return '2.75';        if (score >= 75) return '3.00';        return '5.00';    }    function getSubjectDisplayName(subject) {        if (!subject) return '';        return subject.text || subject.title || '';    }    function getSubjectDisplaySubtitle(subject) {        if (!subject) return '';        return subject.subtitle || subject.kicker || '';    }    function formatAssessmentDate(date) {        if (!date) return '-';        const d = (date instanceof Date) ? date : new Date(date);        if (isNaN(d.getTime())) return date;        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });    }    function scrollToSubjectCard(subjectId) {        switchTab('nav-home');        setTimeout(() => {            const card = document.querySelector(`.home-subject-rail-item[data-subject-id="${subjectId}"]`);            if (card) {                card.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });                card.classList.add('ring-4', 'ring-icc-yellow', 'ring-offset-2');                setTimeout(() => card.classList.remove('ring-4', 'ring-icc-yellow', 'ring-offset-2'), 2000);            }        }, 300);    }    function renderCalendarDropdownSummary() {        const classesWrap = document.getElementById('calendarDropdownUpcomingClassList');        const assessmentsWrap = document.getElementById('calendarDropdownAssessmentList');        if (!classesWrap || !assessmentsWrap) return;        const upcomingClasses = getUpcomingClasses(2);        classesWrap.innerHTML = upcomingClasses.length            ? upcomingClasses.map((item, index) => `                <div class="rounded-xl border border-gray-100 bg-gray-50/40 p-3">                    <p class="text-[9px] font-black uppercase tracking-widest ${index === 0 ? 'text-icc' : 'text-gray-400'}">${index === 0 ? 'Next Class' : 'Upcoming Class'}</p>                    <p class="text-sm font-bold text-gray-800 mt-1">${item.subject}</p>                    <p class="text-[11px] text-gray-500 mt-0.5">${item.room}</p>                    <p class="text-[11px] font-bold text-gray-600 mt-1">${item.time} - ${item.endTime}</p>                </div>            `).join('')            : `                <div class="py-5 text-center border border-dashed border-gray-100 rounded-xl">                    <p class="text-[10px] font-black text-gray-300 uppercase tracking-widest">No classes scheduled</p>                </div>            `;        assessmentsWrap.innerHTML = upcomingAssessmentItems.map(item => `            <div class="rounded-xl border border-gray-100 bg-white p-3">                <div class="flex items-center justify-between gap-2">                    <p class="text-sm font-bold text-gray-800 leading-tight">${item.title}</p>                    <span class="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${item.status === 'Due' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}">${item.status}</span>                </div>                <p class="text-[11px] text-gray-500 mt-1">${item.when}</p>            </div>        `).join('');    }    function initCalendarEvents() {        const prevMonthBtn = document.getElementById('calendarDropdownPrevMonthBtn');        const nextMonthBtn = document.getElementById('calendarDropdownNextMonthBtn');        if (prevMonthBtn) {            prevMonthBtn.onclick = (e) => {                e.stopPropagation();                currentCalDate.setMonth(currentCalDate.getMonth() - 1);                renderCalendar();            };        }        if (nextMonthBtn) {            nextMonthBtn.onclick = (e) => {                e.stopPropagation();                currentCalDate.setMonth(currentCalDate.getMonth() + 1);                renderCalendar();            };        }        renderCalendar();        renderCalendarDropdownSummary();        // Update header calendar icon date        const dateEl = document.getElementById('calendar-date-number');        if (dateEl) {            dateEl.textContent = new Date().getDate();        }    }    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ SIGMA AI Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬    const WELCOME_MSG = `Hello, <strong>User!</strong> I'm <span class="font-black">SIGMA</span>, your system AI. What do you need today?`;    let isDragging = false;    let startX = 0;    let startRight = 0;    let wasDragged = false;    const SIGMA_AI_MAX_FILE_SIZE = 20 * 1024 * 1024;    const SIGMA_AI_MAX_IMAGE_SIZE = 10 * 1024 * 1024;    const SIGMA_AI_ALLOWED_DOC_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'csv', 'txt', 'rtf', 'odt', 'ods', 'odp']);    const SIGMA_AI_ALLOWED_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp']);    const sigmaAiTimestampFormatter = new Intl.DateTimeFormat('en-US', {        weekday: 'short',        month: 'short',        day: 'numeric',        hour: 'numeric',        minute: '2-digit'    });    function getSigmaAiTimestamp() {        return sigmaAiTimestampFormatter.format(new Date());    }    function escapeSigmaAiText(value) {        return String(value)            .replace(/&/g, '&amp;')            .replace(/</g, '&lt;')            .replace(/>/g, '&gt;')            .replace(/"/g, '&quot;')            .replace(/'/g, '&#39;');    }    function formatSigmaAiFileSize(bytes) {        if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;        if (bytes >= 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;        return `${bytes} B`;    }    function getSigmaAiFileExtension(fileName) {        const parts = String(fileName || '').toLowerCase().split('.');        return parts.length > 1 ? parts.pop() : '';    }    function getSigmaAiFileKindLabel(file, isPhotoUpload) {        const ext = getSigmaAiFileExtension(file.name);        if (isPhotoUpload) return `${ext ? ext.toUpperCase() : 'IMAGE'} image`;        return ext ? `${ext.toUpperCase()} file` : 'Document file';    }    function updateSigmaAiMessage(messageEl, content) {        const bubble = messageEl?.querySelector('.sigma-ai-message__bubble');        if (bubble) bubble.innerHTML = content;    }    function addAiMessage(content, isUser = false) {        const msg = document.createElement('div');        msg.className = `sigma-ai-message ${isUser ? 'sigma-ai-message--user' : ''}`;        const stamp = getSigmaAiTimestamp();        msg.innerHTML = `${!isUser ? `<div class="sigma-ai-message__icon"><i class="fa-solid fa-bolt text-[10px]"></i></div>` : ''}<div class="sigma-ai-message__stack"><div class="sigma-ai-message__meta">${stamp}</div><div class="sigma-ai-message__bubble ${isUser ? 'sigma-ai-message__bubble--user' : 'sigma-ai-message__bubble--assistant'}">${content}</div></div>`;        sigmaAiMessages.appendChild(msg);        sigmaAiMessages.scrollTop = sigmaAiMessages.scrollHeight;        return msg;    }    function showSigmaAiUploads(files, sourceLabel, isPhotoUpload = false) {        const sizeLimit = isPhotoUpload ? SIGMA_AI_MAX_IMAGE_SIZE : SIGMA_AI_MAX_FILE_SIZE;        const allowedSet = isPhotoUpload ? SIGMA_AI_ALLOWED_IMAGE_EXTENSIONS : SIGMA_AI_ALLOWED_DOC_EXTENSIONS;        const validFiles = [];        const invalidFiles = [];        const oversizedFiles = [];        files.forEach(file => {            const ext = getSigmaAiFileExtension(file.name);            if (!allowedSet.has(ext)) {                invalidFiles.push(file);                return;            }            if (file.size > sizeLimit) {                oversizedFiles.push(file);                return;            }            validFiles.push(file);        });        if (validFiles.length) {            const uploadLines = validFiles                .map(file => `â€¢ ${escapeSigmaAiText(file.name)} (${getSigmaAiFileKindLabel(file, isPhotoUpload)} â€¢ ${formatSigmaAiFileSize(file.size)})`)                .join('\n');            addAiMessage(`${sourceLabel}\n${uploadLines}`, true);            const loadingMessage = addAiMessage(`Reading uploaded ${validFiles.length > 1 ? 'files' : 'file'}...`, false);            setTimeout(() => {                updateSigmaAiMessage(                    loadingMessage,                    `Upload ready for future AI reading.\n${uploadLines}`                );            }, 700);        }        if (invalidFiles.length) {            const failedLines = invalidFiles                .map(file => `â€¢ ${escapeSigmaAiText(file.name)}`)                .join('\n');            addAiMessage(                `Upload failed. Supported ${isPhotoUpload ? 'images' : 'documents'} only.\n${failedLines}`,                false            );        }        if (oversizedFiles.length) {            const failedLines = oversizedFiles                .map(file => `â€¢ ${escapeSigmaAiText(file.name)} (${formatSigmaAiFileSize(file.size)})`)                .join('\n');            addAiMessage(                `Upload failed. Each ${isPhotoUpload ? 'image' : 'document'} must be ${isPhotoUpload ? '10 MB' : '20 MB'} or smaller.\n${failedLines}`,                false            );        }    }    function closeAiAttachMenu() {        if (sigmaAiAttachMenu) sigmaAiAttachMenu.classList.add('hidden');    }    function setSigmaAiWaiting(waiting) {        sigmaAiWaiting = waiting;        if (sigmaAiSendBtn) {            sigmaAiSendBtn.disabled = waiting;            sigmaAiSendBtn.classList.toggle('is-loading', waiting);        }    }    function updateNotchPosition() {        if (!sigmaAiNotch || !sigmaAiPanel) return;        const isMobile = window.innerWidth < 1024;        const isOpen = sigmaAiPanel.classList.contains('open');        if (isMobile) {            sigmaAiNotch.style.right = '0';        } else {            if (isOpen) {                sigmaAiNotch.style.right = '400px';            } else {                sigmaAiNotch.style.right = '0';            }        }    }    function closeMobilePullUpSurfacesForAi() {        if (window.innerWidth >= 1024) return;        document.querySelectorAll('.mobile-pull-up-panel').forEach(panel => panel.classList.remove('open'));        document.getElementById('mobile-sigma-sheet')?.classList.remove('open');        document.getElementById('mobile-sigma-sheet-backdrop')?.classList.remove('open');        window.updateMobileAppBarActiveState?.();    }    window.__pushMobileOverlayHistory = window.__pushMobileOverlayHistory || function (kind) {        if (window.innerWidth >= 1024) return;        if (history.state?.mobileOverlay === kind) return;        history.pushState({ ...(history.state || {}), mobileOverlay: kind }, '', window.location.href);    };    window.__hasOpenMobileOverlay = window.__hasOpenMobileOverlay || function () {        return window.innerWidth < 1024 && Boolean(            document.getElementById('sigmaAiPanel')?.classList.contains('open') ||            document.getElementById('mobile-sigma-sheet')?.classList.contains('open') ||            document.querySelector('.mobile-pull-up-panel.open')        );    };    window.__closeOpenMobileOverlay = window.__closeOpenMobileOverlay || function () {        document.getElementById('sigmaAiPanel')?.classList.remove('open');        document.getElementById('sigmaAiNotch')?.classList.remove('open');        document.getElementById('mobile-sigma-sheet')?.classList.remove('open');        document.querySelectorAll('.mobile-pull-up-panel').forEach(panel => panel.classList.remove('open'));        document.getElementById('mobile-sigma-sheet-backdrop')?.classList.remove('open');        window.updateMobileAppBarActiveState?.();    };    window.__closeMobileSidebarForOverlay = window.__closeMobileSidebarForOverlay || function () {        if (window.innerWidth >= 1024) return;        document.getElementById('sidebar')?.classList.remove('sidebar-visible');        document.getElementById('sub-sidebar')?.classList.remove('sub-sidebar-visible');    };    window.addEventListener('popstate', event => {        if (!window.__hasOpenMobileOverlay?.()) return;        window.__closeOpenMobileOverlay?.();        event.stopImmediatePropagation();    }, true);    function openAiPanel() {        closeMobilePullUpSurfacesForAi();        window.__closeMobileSidebarForOverlay?.();        window.__pushMobileOverlayHistory?.('sigma-ai');        sigmaAiPanel.classList.add('open');        sigmaAiNotch.classList.add('open');        updateNotchPosition();        sessionStorage.setItem('sigmaPanelOpen', 'true');    }    function closeAiPanel() {        sigmaAiPanel.classList.remove('open');        sigmaAiNotch.classList.remove('open');        updateNotchPosition();        closeAiAttachMenu();        sessionStorage.setItem('sigmaPanelOpen', 'false');    }    window.addEventListener('resize', updateNotchPosition);    updateNotchPosition();    function hideHeaderOverlays(exceptMenu = null, exceptButton = null, keepAiOpen = false) {        document.querySelectorAll('.header-panel').forEach(panel => {            if (panel !== exceptMenu) panel.classList.add('hidden');        });        [calendarToggle, notiToggle, profileDropdownBtn].forEach(button => {            if (button && button !== exceptButton) button.classList.remove('active');        });        if (!keepAiOpen) {            closeAiPanel();            closeAiAttachMenu();        }    }    function handleNotchInteraction(e) {        e.preventDefault();        isDragging = true;        wasDragged = false;        startX = e.clientX;        startRight = parseInt(window.getComputedStyle(sigmaAiPanel).right, 10);        sigmaAiPanel.classList.add('dragging');        sigmaAiNotch.classList.add('dragging');        document.onmousemove = (moveEvent) => {            if (!isDragging) return;            wasDragged = true;            const deltaX = moveEvent.clientX - startX;            let newRight = startRight - deltaX;            if (newRight > 0) newRight = 0;            if (newRight < -400) newRight = -400;            sigmaAiPanel.style.right = `${newRight}px`;            sigmaAiNotch.style.right = `${newRight + 400}px`;        };        document.onmouseup = () => {            isDragging = false;            sigmaAiPanel.classList.remove('dragging');            sigmaAiNotch.classList.remove('dragging');            sigmaAiPanel.style.right = '';            sigmaAiNotch.style.right = '';            document.onmousemove = null;            document.onmouseup = null;            const currentRight = parseInt(window.getComputedStyle(sigmaAiPanel).right, 10);            if (wasDragged) {                if (currentRight < -200) {                    openAiPanel();                } else {                    closeAiPanel();                }            } else {                sigmaAiPanel.classList.contains('open') ? closeAiPanel() : openAiPanel();            }        };    }    if (sigmaAiNotch) sigmaAiNotch.addEventListener('mousedown', handleNotchInteraction);    document.querySelectorAll('.sigma-chip').forEach(chip => {        chip.addEventListener('click', () => {            addAiMessage(chip.textContent.trim(), true);            setTimeout(() => addAiMessage('Full AI integration coming soon!', false), 600);        });    });    if (sigmaAiAttachBtn && sigmaAiAttachMenu) {        sigmaAiAttachBtn.addEventListener('click', e => {            e.preventDefault();            e.stopPropagation();            sigmaAiAttachMenu.classList.toggle('hidden');        });    }    if (sigmaAiAttachMenu) {        sigmaAiAttachMenu.addEventListener('click', e => {            const option = e.target.closest('.sigma-ai-attach-option');            if (!option) return;            closeAiAttachMenu();            document.getElementById(option.dataset.attachTarget)?.click();        });    }    [sigmaAiFileInput, sigmaAiPhotoInput].forEach(input => {        if (!input) return;        input.addEventListener('change', () => {            closeAiAttachMenu();            const files = Array.from(input.files || []);            if (files.length) {                const isPhotoUpload = input === sigmaAiPhotoInput;                const sourceLabel = isPhotoUpload ? 'Uploaded photo' : 'Uploaded file';                showSigmaAiUploads(files, sourceLabel, isPhotoUpload);            }            input.value = '';        });    });    document.addEventListener('click', e => {        if (!sigmaAiAttachMenu || sigmaAiAttachMenu.classList.contains('hidden')) return;        if (sigmaAiAttachMenu.contains(e.target) || sigmaAiAttachBtn?.contains(e.target)) return;        closeAiAttachMenu();    });    function sendAiMessage() {        if (sigmaAiWaiting) return;        const v = sigmaAiInput?.value.trim();        if (!v) return;        closeAiAttachMenu();        addAiMessage(v, true);        sigmaAiInput.value = '';        setSigmaAiWaiting(true);        setTimeout(() => {            addAiMessage('Wireframe mode Ã¢â‚¬â€ Gemini AI coming next semester.', false);            setSigmaAiWaiting(false);        }, 600);    }    if (sigmaAiSendBtn) sigmaAiSendBtn.addEventListener('click', sendAiMessage);    if (sigmaAiCloseBtn) sigmaAiCloseBtn.addEventListener('click', closeAiPanel);    if (sigmaAiInput) sigmaAiInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendAiMessage(); });    const isFirstVisit = sessionStorage.getItem('sigmaFirstVisit') !== 'true';    const panelWasOpen = sessionStorage.getItem('sigmaPanelOpen') === 'true';    if (isFirstVisit) {        sessionStorage.setItem('sigmaFirstVisit', 'true');        setTimeout(() => {            addAiMessage(WELCOME_MSG, false);        }, 900);    } else {        addAiMessage(WELCOME_MSG, false);    }    // Ensure all header overlays are hidden on load    hideHeaderOverlays(null, null, false);    // if (panelWasOpen) openAiPanel();    document.querySelectorAll('[data-program-key]').forEach(panel => {        panel.addEventListener('click', () => {            if (                currentCurriculumCluster &&                currentInlineProgram === panel.dataset.programKey &&                panel.dataset.programKey === 'applied-subjects'            ) {                return;            }            // openInlineProgramFocus removed        });    });    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Sub-Sidebar (Subjects list) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬    function resetCompactSubSidebar(content, title, header) {        if (!content) return;        if (title) title.innerHTML = '';        if (header) header.classList.add('hidden');        content.style.paddingTop = '8px';        content.innerHTML = '';    }    function updateSubSidebar(tabId) {        const content = document.getElementById('sub-sidebar-content');        const title = document.getElementById('sub-sidebar-title');        const header = document.getElementById('sub-sidebar-header');        if (!content) return;        // Hide header on subjects list Ã¢â‚¬â€ no redundancy        if (header) header.classList.add('hidden');        content.innerHTML = '';    }        const content = document.getElementById('sub-sidebar-content');        const title = document.getElementById('sub-sidebar-title');        const header = document.getElementById('sub-sidebar-header');        if (!content) return;        resetCompactSubSidebar(content, title, header);        // Set the title to "Subjects"        if (title) {            title.innerHTML = 'Subjects';        }        const categoryLinks = document.createElement('div');        categoryLinks.className = 'px-2 pb-3 space-y-1';        categoryLinks.innerHTML = `            <button class="sub-sidebar-link w-full text-left px-4 py-2.5 text-[12px] font-bold text-gray-700 hover:bg-gray-100 rounded-lg transition-all" data-program-nav="core-subjects">Core Subjects</button>            <button class="sub-sidebar-link w-full text-left px-4 py-2.5 text-[12px] font-bold text-gray-700 hover:bg-gray-100 rounded-lg transition-all" data-program-nav="applied-subjects">Applied Subjects</button>            <button class="sub-sidebar-link w-full text-left px-4 py-2.5 text-[12px] font-bold text-gray-700 hover:bg-gray-100 rounded-lg transition-all" data-program-nav="specialized-subjects">Specialized Subjects</button>        `;        categoryLinks.querySelectorAll('[data-program-nav]').forEach(btn => {            btn.addEventListener('click', () => {                const programKey = btn.dataset.programNav;                // Remove active class and inline styles from all child tabs                categoryLinks.querySelectorAll('.sub-sidebar-link').forEach(b => {                    b.classList.remove('active');                    // Clear inline styles                    b.style.background = '';                    b.style.color = '';                    b.style.border = '';                    b.style.boxShadow = '';                    b.style.fontWeight = '';                });                // Add yellow highlight to clicked child tab using inline styles                btn.classList.add('active');                // Force inline styles for yellow highlight                btn.style.background = 'rgba(255, 208, 0, 0.3)';                btn.style.color = '#000000';                btn.style.border = '2px solid #FFD000';                btn.style.boxShadow = '0 0 0 2px rgba(255, 208, 0, 0.4)';                btn.style.fontWeight = '700';                // Remove active class from all sidebar items first                document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));                // Highlight parent Subjects tab                const subjectsTab = document.getElementById('nav-courses');                if (subjectsTab) {                    subjectsTab.classList.add('active');                }                // Open the corresponding subject panels                if (programKey === 'core-subjects') {                    // Go directly to three main panels instead of curriculum page                    // switchToSubjectsPanelsView removed                } else if (programKey === 'applied-subjects') {                    // Go to three panels view and open Applied Subjects panel                    // switchToSubjectsPanelsView removed                    setTimeout(() => openInlineProgramFocus('applied-subjects'), 100);                } else if (programKey === 'specialized-subjects') {                    // Go to three panels view and open Specialized Subjects panel                    // switchToSubjectsPanelsView removed                    setTimeout(() => openInlineProgramFocus('specialized-subjects'), 100);                }            });        });        content.appendChild(categoryLinks);    }    function renderCurriculumSidebar(programKey) {        const content = document.getElementById('sub-sidebar-content');        const title = document.getElementById('sub-sidebar-title');        const header = document.getElementById('sub-sidebar-header');        if (!content) return;        // Hide header and reset content        if (header) header.classList.add('hidden');        content.style.paddingTop = '';        content.innerHTML = '';        // Set the title to "Subjects"        if (title) {            title.innerHTML = 'Subjects';        }        // Create subjects list with only Core Subjects        const subjectsContainer = document.createElement('div');        subjectsContainer.className = 'px-2 pb-3 space-y-1';        // Core Subjects section only        const coreSection = document.createElement('div');        coreSection.className = 'mb-3';        coreSection.innerHTML = `            <div class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Core Subjects</div>        `;        subjectsContainer.appendChild(coreSection);        // No click handlers needed - headers are display only        content.appendChild(subjectsContainer);    }    function renderTopicContentsSidebar(subjectId, topicIdx, tab) {        const content = document.getElementById('sub-sidebar-content');        const title = document.getElementById('sub-sidebar-title');        const header = document.getElementById('sub-sidebar-header');        if (!content) return;        // Hide header and reset content        if (header) header.classList.add('hidden');        content.style.paddingTop = '';        content.innerHTML = '';        // Set the title to "Contents"        if (title) {            title.innerHTML = 'Contents';        }        // Get topic data        const sourceId = subjectId;        const data = getTopicData(sourceId);        if (!data || !data.q1Topics || !data.q1Topics[topicIdx]) return;        const topic = data.q1Topics[topicIdx];        // Create contents container        const contentsContainer = document.createElement('div');        contentsContainer.className = 'px-2 pb-3 space-y-1';        // Add content items based on the current tab        const contentItems = [];        // Add Videos        if (topic.videos && topic.videos.length > 0) {            contentItems.push({                title: 'Videos',                icon: 'fa-play-circle',                count: topic.videos.length,                active: tab === 'videos'            });        }        // Add Handouts        if (topic.handouts && topic.handouts.length > 0) {            contentItems.push({                title: 'Handouts',                icon: 'fa-file-pdf',                count: topic.handouts.length,                active: tab === 'handouts'            });        }        // Add Activities        if (topic.activities && topic.activities.length > 0) {            contentItems.push({                title: 'Activities',                icon: 'fa-flask',                count: topic.activities.length,                active: tab === 'activities'            });        }        // Add Assignments        if (topic.assignments && topic.assignments.length > 0) {            contentItems.push({                title: 'Assignments',                icon: 'fa-file-pen',                count: topic.assignments.length,                active: tab === 'assignments'            });        }        // Add Quiz        if (topic.quiz) {            contentItems.push({                title: 'Quiz',                icon: 'fa-square-poll-vertical',                count: 1,                active: tab === 'quiz'            });        }        // Add Performance Tasks        if (topic.performanceTasks && topic.performanceTasks.length > 0) {            contentItems.push({                title: 'Performance Tasks',                icon: 'fa-star',                count: topic.performanceTasks.length,                active: tab === 'performance'            });        }        // Create buttons for each content item        contentItems.forEach(item => {            const contentBtn = document.createElement('button');            contentBtn.className = `sub-sidebar-link w-full text-left px-4 py-2.5 text-[12px] font-bold text-gray-700 hover:bg-gray-100 rounded-lg transition-all flex items-center gap-3 ${item.active ? 'active' : ''}`;            contentBtn.innerHTML = `                <i class="fas ${item.icon} ${item.active ? 'text-yellow-500' : 'text-gray-400'}"></i>                <span>${item.title}</span>                <span class="ml-auto text-xs ${item.active ? 'text-black' : 'text-gray-400'}">${item.count}</span>            `;            // Add click handler to navigate to content tab            contentBtn.addEventListener('click', () => {                openTopicContent(subjectId, topicIdx, item.title.toLowerCase());            });            contentsContainer.appendChild(contentBtn);        });        // If no content available        if (contentItems.length === 0) {            const emptyMsg = document.createElement('div');            emptyMsg.className = 'px-4 py-8 text-center';            emptyMsg.innerHTML = `                <i class="fas fa-folder-open text-3xl text-gray-300 mb-3 block"></i>                <p class="text-xs text-gray-400 font-medium">No content available</p>            `;            contentsContainer.appendChild(emptyMsg);        }        content.appendChild(contentsContainer);    }    function renderTopicNamesSidebar(subjectId) {        const content = document.getElementById('sub-sidebar-content');        const title = document.getElementById('sub-sidebar-title');        const header = document.getElementById('sub-sidebar-header');        if (!content) return;        // Hide header and reset content        if (header) header.classList.add('hidden');        content.style.paddingTop = '';        content.innerHTML = '';        // Set the title to "Topics"        if (title) {            title.innerHTML = 'Topics';        }        // Get topic data        const data = getTopicData(subjectId);        if (!data || !data.q1Topics) return;        // Create topics container        const topicsContainer = document.createElement('div');        topicsContainer.className = 'px-2 pb-3 space-y-1';        // Add each topic as a button        data.q1Topics.forEach((topic, index) => {            const topicBtn = document.createElement('button');            topicBtn.className = 'sub-sidebar-link w-full text-left px-4 py-2.5 text-[12px] font-bold text-gray-700 hover:bg-gray-100 rounded-lg transition-all flex items-center gap-3';            topicBtn.innerHTML = `                <i class="fas fa-book-open text-gray-400"></i>                <span>${topic.title}</span>            `;            // Add click handler to navigate to topic content            topicBtn.addEventListener('click', () => {                openTopicContent(subjectId, index, 'videos');            });            topicsContainer.appendChild(topicBtn);        });        content.appendChild(topicsContainer);    }    function openCurriculumProgram(programKey, pushState = true) {        const program = curriculumPrograms[programKey];        if (!program) return;        // Keep elective subjects inside the existing panel flow (no separate curriculum page).        if (programKey === 'applied-subjects') {            _applyTab('nav-courses');            // openInlineProgramFocus removed            return;        }        if (programKey === 'specialized-subjects') {            _applyTab('nav-courses');            // openInlineProgramFocus removed            return;        }        currentCurriculumProgram = programKey;        currentCurriculumCluster = null;        setSubjectsPanelsMode(false);        setCurriculumMode(true);        if (pushState) history.pushState({ page: `curriculum:${programKey}` }, '', `#${programKey}`);        hideAllSections();        showSection('section-curriculum-page');        navLinks.forEach(l => l.classList.remove('bg-white/20'));        document.getElementById('nav-courses')?.classList.add('bg-white/20');        setNavContext(program.title);        _hideSubSidebarInstant();        updateLayout();        renderCurriculumPage(programKey);        window.scrollTo({ top: 0, behavior: 'smooth' });    }    window.openCurriculumProgram = openCurriculumProgram;    function openCurriculumCluster(programKey, clusterKey, pushState = true) {        const program = curriculumPrograms[programKey];        const cluster = (program?.clusters || []).find(c => c.key === clusterKey) || (program?.stages || []).find(s => s.key === clusterKey);        if (!program || !cluster) return;        // Keep elective clusters inside the existing panel flow (no separate curriculum page).        if (programKey === 'applied-subjects' || programKey === 'specialized-subjects') {            _applyTab('nav-courses');            // openInlineProgramFocus removed            currentCurriculumCluster = clusterKey;            // renderSubjectsInlineDetail removed            syncInlinePanelBackButtons();            if (pushState) {                history.pushState({ page: `inline-cluster:${programKey}:${clusterKey}` }, '', `#subjects-${programKey}-${clusterKey}`);            }            return;        }        currentCurriculumProgram = programKey;        currentCurriculumCluster = clusterKey;        setSubjectsPanelsMode(false);        setCurriculumMode(true);        if (pushState) history.pushState({ page: `cluster:${programKey}:${clusterKey}` }, '', `#${programKey}-${clusterKey}`);        hideAllSections();        showSection('section-curriculum-page');        navLinks.forEach(l => l.classList.remove('bg-white/20'));        document.getElementById('nav-courses')?.classList.add('bg-white/20');        setNavContext(cluster.title);        _hideSubSidebarInstant();        updateLayout();        renderCurriculumPage(programKey, clusterKey);        window.scrollTo({ top: 0, behavior: 'smooth' });    }    window.openCurriculumCluster = openCurriculumCluster;    function renderCurriculumPage(programKey, clusterKey = null) {        const shell = document.getElementById('curriculum-page-shell');        const program = curriculumPrograms[programKey];        if (!shell || !program) return;        const currentCluster = clusterKey            ? (program.clusters || program.stages || []).find(c => c.key === clusterKey)            : null;        const isSubjectPage = !!currentCluster || !!program.subjects;        const items = currentCluster            ? (currentCluster.subjects || currentCluster.requirements || []).map(item => typeof item === 'string' ? item : item.title)            : (program.subjects || program.clusters || program.stages || []);        const pageTitle = currentCluster ? currentCluster.title : program.title;        const pageKicker = currentCluster ? (programKey === 'specialized-subjects' ? 'Stage Requirements' : 'Cluster Overview') : program.kicker;        const pageOverview = currentCluster ? currentCluster.overview : program.overview;        const image = currentCluster ? currentCluster.image : program.image;        const hideHeroImage = !currentCluster && programKey === 'core-subjects';        const cardHtml = currentCluster            ? items.map((label, index) => `                <article class="curriculum-subject-card" data-subject-title="${label}" data-cluster-title="${currentCluster.title}">                    <h4 class="curriculum-subject-title">${label}</h4>                    <p class="curriculum-subject-text">${programKey === 'specialized-subjects' ? 'Requirement ' + (index + 1) + ' for this stage.' : buildCurriculumCardText(programKey, label)}</p>                </article>            `).join('')            : program.subjects                ? items.map(item => {                    const progress = Math.floor(Math.random() * 80) + 10;                    return `                    <article class="curriculum-subject-card curriculum-core-card horizontal-panel" data-subject-id="${item.id}">                        <img src="${item.image}" alt="${item.title}" class="curriculum-cluster-image">                        <div class="subject-info-col">                            <h4 class="curriculum-subject-title">${item.title}</h4>                            <p class="curriculum-subject-text">${item.overview}</p>                        </div>                        <div class="subject-progress-bar">                            <div class="subject-progress-fill" style="width:${progress}%"></div>                        </div>                    </article>                `;                }).join('')                : items.map(item => `                    <article class="curriculum-subject-card curriculum-cluster-card curriculum-track-card" data-cluster-key="${item.key}">                        <h4 class="curriculum-subject-title">${item.title}</h4>                        <p class="curriculum-subject-text">${item.overview}</p>                        <p class="text-[10px] font-black uppercase tracking-widest text-green-700 mt-auto">${programKey === 'specialized-subjects' ? 'Open Stage' : `${item.subjectCount} Subjects`}</p>                    </article>                `).join('');        shell.innerHTML = `            <div class="flex flex-col">                <div class="curriculum-hero ${hideHeroImage ? 'curriculum-hero--no-image' : ''}">                    ${hideHeroImage ? '' : `<img src="${image}" alt="${pageTitle}" class="curriculum-hero-image">`}                    <div class="curriculum-hero-copy">                        <h2 class="curriculum-hero-title">${pageTitle}</h2>                    </div>                </div>                <div class="curriculum-subject-grid ${program.subjects ? 'core-horizontal-list' : ''} ${isSubjectPage && !program.subjects ? 'curriculum-subject-grid--list' : ''}">                    ${cardHtml}                </div>            </div>        `;        if (currentCluster) {            shell.querySelectorAll('.curriculum-subject-card[data-subject-title]').forEach(card => {                card.addEventListener('click', () => {                    const subject = ensureSubjectDataForTitle(card.dataset.subjectTitle, currentCluster.title);                    switchToTopicPage(subject.id, subject.text);                });            });        } else if (program.subjects) {            shell.querySelectorAll('.curriculum-core-card[data-subject-id]').forEach(card => {                card.addEventListener('click', () => switchToTopicPage(card.dataset.subjectId));            });        } else {            shell.querySelectorAll('.curriculum-cluster-card[data-cluster-key]').forEach(card => {                card.addEventListener('click', () => openCurriculumCluster(programKey, card.dataset.clusterKey));            });        }    }    window.addEventListener('resize', () => {        const subjectsVisible = !document.getElementById('section-courses')?.classList.contains('hidden') && !currentCurriculumProgram;        setSubjectsPanelsMode(subjectsVisible);    });    function buildCurriculumCardText(programKey, label) {        const copy = {            'core-subjects': {                'Effective Communication': 'Focuses on communication models, speech contexts, speech acts, and writing and delivering effective speeches.',                'Life and Career Skills': 'Covers self-assessment, career pathways, work readiness, financial literacy, and practical career planning.',                'General Mathematics': 'Builds real-life math skills through functions, interest, loans, business math, and logic.',                'General Science': 'Introduces earth systems, life processes, matter, energy, and scientific reasoning for everyday use.',                'Pag-aaral ng Kasaysayan at Lipunang Pilipino': 'Explores Philippine society, governance, citizenship, history, and social change in local context.'            }[label] || `This subject gives students a readable overview of the core learning area and the topics they will study across the shared curriculum foundation.`,            'applied-subjects': `${label} is part of the applied pathway and may belong to either the Academic Track or the TechPro Track depending on the learner's assigned cluster and curriculum setup.`,            'specialized-subjects': `${label} represents a staged work experience where students prepare, perform, and reflect on workplace-style tasks and outputs.`        };        return copy[programKey];    }    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Sub-sidebar topic mode (no animation Ã¢â‚¬â€ instant swap) Ã¢â€â‚¬Ã¢â€â‚¬    function loadTopicSubSidebar(subject, data, statusIconClass) {        const content = document.getElementById('sub-sidebar-content');        const title = document.getElementById('sub-sidebar-title');        const header = document.getElementById('sub-sidebar-header');        if (!content || !title) return;        if (header) header.classList.remove('hidden');        const q1Done = data.q1Topics.filter(t => t.status === 'completed').length;        const q1Total = data.q1Topics.length;        title.innerHTML = `<span class="truncate">${subject.text}</span>`;        content.innerHTML = `            <div class="px-4 pt-4 pb-2">                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Topics</p>                <p class="text-sm font-bold text-gray-700">${q1Done}/${q1Total} completed</p>            </div>            <div class="px-2 space-y-0.5 pb-4">                ${data.q1Topics.map((t, i) => `                    <button class="topic-nav-item w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-icc flex items-center gap-2.5 transition-colors min-w-0" data-topic-idx="${i}">                        <i class="fa-solid ${statusIconClass[t.status]} text-xs flex-shrink-0"></i>                        <span class="truncate">${t.title}</span>                    </button>                `).join('')}            </div>        `;        // Nav items scroll to topic card in main content        content.querySelectorAll('.topic-nav-item').forEach(item => {            item.addEventListener('click', () => {                const list = document.getElementById('q1-topics-list');                const idx = parseInt(item.dataset.topicIdx);                if (list?.children[idx]) {                    list.children[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });                }            });        });    }    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Subject Details Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬    const subjectDetails = {        'card-prog1': { bg: 'image/book1.jpg', q1Percent: 80, q2Percent: 0, q1Topics: [{ title: 'Introduction to Java', status: 'completed', grades: { quiz: 92, assignment: 88, activity: 95, performance: 90 } }, { title: 'Variables & Data Types', status: 'completed', grades: { quiz: 85, assignment: 90, activity: 88, performance: 87 } }, { title: 'Control Structures', status: 'completed', grades: { quiz: 78, assignment: 82, activity: 80, performance: 84 } }, { title: 'Methods & Functions', status: 'in-progress', grades: { quiz: 0, assignment: 75, activity: 0, performance: 0 } }, { title: 'Arrays & Collections', status: 'not-started', grades: null }, { title: 'Object-Oriented Programming', status: 'not-started', grades: null }] },        'card-webdev': { bg: 'image/book2.jpg', q1Percent: 67, q2Percent: 0, q1Topics: [{ title: 'HTML5 Fundamentals', status: 'completed', grades: { quiz: 95, assignment: 92, activity: 90, performance: 93 } }, { title: 'CSS3 & Flexbox', status: 'completed', grades: { quiz: 88, assignment: 85, activity: 90, performance: 87 } }, { title: 'CSS Grid Layout', status: 'completed', grades: { quiz: 82, assignment: 80, activity: 85, performance: 83 } }, { title: 'Responsive Design', status: 'completed', grades: { quiz: 90, assignment: 88, activity: 92, performance: 91 } }, { title: 'JavaScript Basics', status: 'in-progress', grades: { quiz: 0, assignment: 78, activity: 0, performance: 0 } }, { title: 'DOM Manipulation', status: 'not-started', grades: null }] },        'card-sysarch': { bg: 'image/book3.jpg', q1Percent: 50, q2Percent: 0, q1Topics: [{ title: 'Number Systems & Binary', status: 'completed', grades: { quiz: 88, assignment: 85, activity: 90, performance: 87 } }, { title: 'CPU Architecture', status: 'completed', grades: { quiz: 82, assignment: 80, activity: 78, performance: 83 } }, { title: 'Memory Hierarchy', status: 'in-progress', grades: { quiz: 0, assignment: 70, activity: 0, performance: 0 } }, { title: 'Input/Output Systems', status: 'not-started', grades: null }, { title: 'Instruction Set Architecture', status: 'not-started', grades: null }] },        'card-empowerment': { bg: 'image/book4.jpg', q1Percent: 20, q2Percent: 0, q1Topics: [{ title: 'Digital Literacy Overview', status: 'completed', grades: { quiz: 90, assignment: 88, activity: 92, performance: 89 } }, { title: 'Online Safety & Privacy', status: 'in-progress', grades: { quiz: 0, assignment: 75, activity: 0, performance: 0 } }, { title: 'Social Media Responsibility', status: 'not-started', grades: null }, { title: 'Digital Citizenship', status: 'not-started', grades: null }] },        'card-networks': { bg: 'image/book5.jpg', q1Percent: 40, q2Percent: 0, q1Topics: [{ title: 'Network Fundamentals', status: 'completed', grades: { quiz: 85, assignment: 82, activity: 88, performance: 84 } }, { title: 'OSI Model', status: 'in-progress', grades: { quiz: 0, assignment: 72, activity: 0, performance: 0 } }, { title: 'IP Addressing & Subnetting', status: 'not-started', grades: null }, { title: 'Network Topologies', status: 'not-started', grades: null }] },        'card-database': { bg: 'image/book6.jpg', q1Percent: 60, q2Percent: 0, q1Topics: [{ title: 'Database Concepts', status: 'completed', grades: { quiz: 92, assignment: 90, activity: 88, performance: 91 } }, { title: 'Entity-Relationship Diagrams', status: 'completed', grades: { quiz: 88, assignment: 85, activity: 90, performance: 87 } }, { title: 'SQL: DDL & DML', status: 'completed', grades: { quiz: 85, assignment: 82, activity: 86, performance: 84 } }, { title: 'Normalization', status: 'in-progress', grades: { quiz: 0, assignment: 78, activity: 0, performance: 0 } }, { title: 'Joins & Subqueries', status: 'not-started', grades: null }] },        'card-graphics': { bg: 'image/book7.jpg', q1Percent: 70, q2Percent: 0, q1Topics: [{ title: 'Design Principles', status: 'completed', grades: { quiz: 90, assignment: 88, activity: 94, performance: 91 } }, { title: 'Color Theory', status: 'completed', grades: { quiz: 88, assignment: 85, activity: 92, performance: 89 } }, { title: 'Typography Fundamentals', status: 'completed', grades: { quiz: 85, assignment: 82, activity: 88, performance: 86 } }, { title: 'Layout & Composition', status: 'in-progress', grades: { quiz: 0, assignment: 80, activity: 0, performance: 0 } }, { title: 'Digital Illustration', status: 'not-started', grades: null }] },        'card-mobile': { bg: 'image/book8.jpg', q1Percent: 30, q2Percent: 0, q1Topics: [{ title: 'Mobile UI/UX Principles', status: 'completed', grades: { quiz: 88, assignment: 85, activity: 90, performance: 87 } }, { title: 'Flutter Basics', status: 'in-progress', grades: { quiz: 0, assignment: 72, activity: 0, performance: 0 } }, { title: 'Widgets & Layouts', status: 'not-started', grades: null }, { title: 'State Management', status: 'not-started', grades: null }] },        'card-introcomp': { bg: 'image/book4.jpg', q1Percent: 100, q2Percent: 100, q1Topics: [{ title: 'History of Computing', status: 'completed', grades: { quiz: 95, assignment: 92, activity: 90, performance: 94 } }, { title: 'Computer Hardware Components', status: 'completed', grades: { quiz: 92, assignment: 90, activity: 88, performance: 91 } }, { title: 'Operating Systems Basics', status: 'completed', grades: { quiz: 90, assignment: 88, activity: 92, performance: 90 } }, { title: 'Software & Applications', status: 'completed', grades: { quiz: 88, assignment: 85, activity: 90, performance: 87 } }] },        'card-oralcomm': { bg: 'image/book1.jpg', q1Percent: 100, q2Percent: 100, q1Topics: [{ title: 'Nature & Elements of Communication', status: 'completed', grades: { quiz: 88, assignment: 90, activity: 92, performance: 89 } }, { title: 'Models of Communication', status: 'completed', grades: { quiz: 85, assignment: 88, activity: 90, performance: 87 } }, { title: 'Communication Breakdown', status: 'completed', grades: { quiz: 82, assignment: 85, activity: 88, performance: 84 } }, { title: 'Types of Speech Context', status: 'completed', grades: { quiz: 90, assignment: 88, activity: 92, performance: 91 } }, { title: 'Types of Speech Act', status: 'completed', grades: { quiz: 88, assignment: 86, activity: 90, performance: 88 } }] },        'card-genmath': { bg: 'image/book2.jpg', q1Percent: 100, q2Percent: 100, q1Topics: [{ title: 'Functions & Their Graphs', status: 'completed', grades: { quiz: 82, assignment: 80, activity: 85, performance: 83 } }, { title: 'Rational Functions', status: 'completed', grades: { quiz: 80, assignment: 78, activity: 82, performance: 80 } }, { title: 'Inverse Functions', status: 'completed', grades: { quiz: 78, assignment: 76, activity: 80, performance: 78 } }, { title: 'Exponential & Logarithmic Functions', status: 'completed', grades: { quiz: 75, assignment: 74, activity: 78, performance: 76 } }, { title: 'Simple & Compound Interest', status: 'completed', grades: { quiz: 85, assignment: 82, activity: 88, performance: 84 } }] },        'card-animation': { bg: 'image/book3.jpg', q1Percent: 100, q2Percent: 100, q1Topics: [{ title: '12 Principles of Animation', status: 'completed', grades: { quiz: 92, assignment: 90, activity: 94, performance: 92 } }, { title: 'Animation Tools Overview', status: 'completed', grades: { quiz: 90, assignment: 88, activity: 92, performance: 90 } }, { title: 'Keyframing Basics', status: 'completed', grades: { quiz: 88, assignment: 85, activity: 90, performance: 88 } }, { title: 'Character Design Fundamentals', status: 'completed', grades: { quiz: 92, assignment: 90, activity: 95, performance: 93 } }] },        'default-subject-placeholder': {            text: 'Subject',            subtitle: 'Strand/Cluster',            instructor: 'Curriculum Placeholder',            icon: 'fa-solid fa-book-open',            bg: 'image/book6.jpg',            q1Percent: 0,            q2Percent: 0,            summary: 'This subject is a placeholder while the actual elective subject records are still being connected.',            q1Topics: [                { title: 'Topic Lesson', status: 'not-started', grades: null }            ]        }    };    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Topic Page Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬    function switchToTopicPage(subjectId) {        const data = getTopicData(subjectId);        const subject = getTopicSubject(subjectId);        if (!data || !subject) return;        history.pushState({ page: `topic:${subjectId}` }, '', `#topic-${subjectId}`);        _buildAndShowTopicPage(subjectId);    }    window.switchToTopicPage = switchToTopicPage;    function _buildAndShowTopicPage(subjectId) {        const data = getTopicData(subjectId);        const subject = getTopicSubject(subjectId);        if (!data || !subject) return;        const statusIconClass = {            completed: 'fa-check-circle text-green-500',            'in-progress': 'fa-circle-half-stroke text-yellow-500',            'not-started': 'fa-circle text-gray-300',            locked: 'fa-lock text-gray-300'        };        buildTopicPage(subjectId, subject, data, statusIconClass);        setSubjectsPanelsMode(false);        setCurriculumMode(false);        hideAllSections();        showSection('section-topic-detail');        navLinks.forEach(l => l.classList.remove('bg-white/20'));        setNavContext('Subjects');        _showSubSidebarInstant();        subSidebar.classList.add('sub-sidebar-visible');        // Show other subjects from the same category instead of topics        const targetLocation = locateCurriculumSubject();        if (targetLocation) {            // renderSubjectsListSidebar removed        }        updateLayout();        window.scrollTo({ top: 0, behavior: 'smooth' });    }    function buildTopicPage(subjectId, subject, data, statusIconClass) {        const page = document.getElementById('section-topic-detail');        if (!page) return;        const q1Done = data.q1Topics.filter(t => t.status === 'completed').length;        const q1Total = data.q1Topics.length;        const quarter1Pct = data.q1Percent ?? 0;        const quarter2Pct = data.q2Percent ?? 0;        const overallPct = Math.round((quarter1Pct + quarter2Pct) / 2);        const statusLabel = { completed: 'Done', 'in-progress': 'In Progress', 'not-started': 'Not Started', locked: 'Locked' };        const statusBadgeClass = { completed: 'bg-green-50 text-green-600', 'in-progress': 'bg-yellow-50 text-yellow-700', locked: 'bg-gray-100 text-gray-400', 'not-started': 'bg-red-50 text-red-500' };        const getTopicImg = i => i === 1 ? 'image/Topic2.jpg' : 'image/Topic.jpg';        const quarter1BarColor = quarter1Pct === 100 ? 'bg-icc' : 'bg-icc-yellow';        const quarter2BarColor = quarter2Pct === 100 ? 'bg-icc' : 'bg-gray-300';        const subjectCluster = currentCurriculumCluster ? (curriculumPrograms[currentCurriculumProgram]?.clusters || curriculumPrograms[currentCurriculumProgram]?.stages || []).find(c => c.key === currentCurriculumCluster) : null;        const renderTopicCard = (t, i) => `            <div class="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden flex transition-all group/tc cursor-pointer hover:border-icc-yellow"                 onclick="openTopicContent('${subjectId}', ${i})">                <div class="w-48 h-48 flex-shrink-0 overflow-hidden">                    <img src="${getTopicImg(i)}" alt="Topic ${i + 1}" class="w-full h-full object-cover">                </div>                <div class="flex-1 p-6 flex flex-col justify-between min-w-0">                    <div>                        <div class="flex items-center gap-2 mb-2">                            <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Topic ${i + 1}</span>                            <i class="fa-solid ${statusIconClass[t.status]} text-lg ml-auto"></i>                        </div>                        <p class="text-xl font-black text-gray-800 leading-tight group-hover/tc:text-icc-yellow transition-colors">${t.title}</p>                        <p class="text-sm text-gray-500 mt-2 leading-relaxed line-clamp-2">${getTopicOverview(t.title)}</p>                    </div>                    <div class="flex items-center justify-between mt-4">                        <div class="flex items-center gap-2">                            <span class="text-xs font-bold px-3 py-1.5 rounded-full ${statusBadgeClass[t.status]}">${statusLabel[t.status]}</span>                            <button type="button" class="subjects-inline-ai-icon topic-ai-btn" title="Ask SIGMA AI" aria-label="Ask SIGMA AI about ${t.title}" data-ai-subject="${t.title}" data-ai-insight="${getTopicOverview(t.title)}">                                <i class="fa-solid fa-bolt"></i>                            </button>                        </div>                        <span class="text-xs font-bold text-gray-400 flex items-center gap-1">Open <i class="fa-solid fa-arrow-right text-[10px]"></i></span>                    </div>                </div>            </div>        `;        const overallColor = overallPct >= 90 ? 'text-green-600' : overallPct >= 80 ? 'text-icc' : overallPct >= 75 ? 'text-yellow-600' : overallPct > 0 ? 'text-red-500' : 'text-gray-400';        page.innerHTML = `            <div class="student-topic-page-shell">                <div class="topic-detail-grid">                    <!-- Topics list -->                    <div class="student-topic-main-shell">                        <div class="student-topic-header">                            <h1>Topics</h1>                        </div>                        <div class="student-topic-list" id="q1-topics-list">                            ${data.q1Topics.map((t, i) => renderTopicCard(t, i)).join('')}                        </div>                    </div>                    <!-- RIGHT: progress panel â€” aligned with topic cards, not page top -->                    <div class="student-topic-progress-rail">                        <div class="student-topic-progress-card">                            <p class="student-topic-progress-kicker">Progress</p>                            <!-- Q1 big % -->                            <div class="text-center py-1">                                <div class="student-topic-progress-percent text-gray-900">${overallPct}%</div>                                <p class="text-[10px] text-gray-400 mt-1">${q1Done} of ${q1Total} topics done</p>                            </div>                            <!-- Quarter bars -->                            <div>                                <div class="flex justify-between items-center mb-1.5">                                    <span class="student-topic-progress-label">1st Quarter</span>                                    <span class="text-[10px] font-black text-gray-900">${quarter1Pct}%</span>                                </div>                                <div class="student-topic-progress-bar bg-gray-100">                                    <div class="h-full ${quarter1BarColor} rounded-full transition-all" style="width:${quarter1Pct}%"></div>                                </div>                            </div>                            <div class="pt-3 border-t border-gray-100">                                <div class="flex justify-between items-center">                                    <span class="student-topic-progress-label">2nd Quarter</span>                                    <span class="text-[10px] font-black text-gray-900">${quarter2Pct}%</span>                                </div>                                <div class="student-topic-progress-bar bg-gray-100 mt-1.5">                                    <div class="h-full ${quarter2BarColor} rounded-full transition-all" style="width:${quarter2Pct}%"></div>                                </div>                            </div>                        </div>                        <!-- Overall Average panel -->                        <div class="student-topic-progress-card student-topic-progress-card--overall">                            <p class="student-topic-progress-kicker">Overall</p>                            <div class="text-center py-3">                                <div class="student-topic-overall-percent ${overallColor}">${overallPct}%</div>                            </div>                        </div>                    </div>                </div>            </div>        `;        page.querySelectorAll('.topic-ai-btn').forEach(btn => {            btn.addEventListener('click', event => {                event.stopPropagation();                askSigmaAbout(btn.dataset.aiSubject, btn.dataset.aiInsight);            });        });    }    function getTopicOverview(title) {        const o = { 'Introduction to Java': 'Learn Java syntax, data types, and basic program structure.', 'Variables & Data Types': 'Explore how Java stores and manages different kinds of data.', 'Control Structures': 'Master program flow using conditions and loop constructs.', 'Methods & Functions': 'Organize code into reusable blocks using method declarations.', 'Arrays & Collections': 'Work with ordered data using arrays and Java collection classes.', 'Object-Oriented Programming': 'Apply OOP concepts: classes, objects, encapsulation, abstraction.', 'HTML5 Fundamentals': 'Build well-structured web pages using semantic HTML5 elements.', 'CSS3 & Flexbox': 'Style web layouts with modern CSS3 and the flexible box model.', 'Number Systems & Binary': 'Understand binary, octal, hex and their conversions.', 'CPU Architecture': 'Explore how the CPU executes instructions and manages data.' };        Object.assign(o, {            'Nature and Elements of Communication': 'Identify how messages are created, sent, received, and interpreted in real situations.',            'Functions of Communication': 'See how communication informs, influences, regulates, and builds relationships.',            'Communication Models': 'Study common communication models and how messages move through different channels.',            'Communication Breakdown': 'Recognize barriers to communication and practice ways to reduce misunderstanding.',            'Speech Context, Style, and Act': 'Match speech behavior to audience, purpose, and communication setting.',            'Principles of Speech Writing and Delivery': 'Plan, organize, and present clear speeches for academic and public use.',            'Self-Assessment and Personal Strengths': 'Reflect on your abilities, interests, and values as the basis for career planning.',            'Career Choices and Pathways': 'Compare career paths, course options, and work opportunities that fit your goals.',            'Factors Affecting Goal Fulfillment': 'Identify personal and external factors that affect achievement and decision-making.',            'Work Readiness and Professional Habits': 'Practice habits, behavior, and communication expected in school-to-work settings.',            'Rights, Responsibilities, and Entrepreneurial Mindset': 'Understand workplace responsibilities and the basics of initiative and enterprise.',            'Career Portfolio and Financial Literacy': 'Build a simple career portfolio while learning how money decisions affect goals.',            'Functions and Their Graphs': 'Interpret function behavior and connect algebraic rules to real-life graph patterns.',            'Rational Functions, Equations, and Inequalities': 'Solve rational expressions and inequalities that appear in practical problem solving.',            'One-to-One and Inverse Functions': 'Analyze one-to-one relationships and use inverses to reverse processes.',            'Exponential and Logarithmic Functions': 'Model growth and decay with exponents and logarithms in real contexts.',            'Simple and Compound Interest': 'Compute savings and loan growth using standard interest formulas.',            'Stocks, Bonds, Loans, and Logic': 'Apply business math and logical reasoning to financial decisions.',            'Origin and Structure of the Earth': 'Explore EarthÃ¢â‚¬â„¢s formation, layers, and the processes that shape the planet.',            'Earth Materials and Processes': 'Study rocks, minerals, and the forces that change EarthÃ¢â‚¬â„¢s surface.',            'Natural Hazards, Mitigation, and Adaptation': 'Connect science to preparedness for earthquakes, floods, and other hazards.',            'Perpetuation of Life and Reproduction': 'Examine heredity, reproduction, and the continuity of life.',            'Evolution, Classification, and Ecosystems': 'Understand how organisms change, are grouped, and interact in ecosystems.',            'Matter, Light, and the Cosmos': 'Relate matter, energy, light, and space science to everyday phenomena.',            'Enculturation and Socialization': 'Trace how families, schools, and communities shape values and behavior.',            'How Society Is Organized': 'Study social institutions, roles, and how communities are structured.',            'The Philippine Constitution and Governance': 'Review the Constitution, branches of government, and civic participation.',            'Elections, Suffrage, and Political Parties': 'Learn how citizens vote and how political groups shape public choice.',            'Civil Society, Social Movements, and Citizenship': 'Explore citizen action, advocacy, and responsible participation in society.',            'Political Ideologies and Social Change': 'Compare political ideas and the social changes they can influence.',            'Arts 1 - Creative Industries': 'Discover creative sectors, visual expression, and industry-based artistic work.',            'Contemporary Literature 1': 'Read and discuss modern literary forms, themes, and critical responses.',            'Citizenship and Civic Engagement': 'Build informed participation through community service, rights, and responsibilities.',            'Philippine Politics and Governance': 'Understand institutions, public policy, and how governance works in the country.',            'Biology 1': 'Study living organisms, cell processes, genetics, and biodiversity foundations.',            'Broadband Installation': 'Learn the practical steps for setting up and maintaining broadband connections.',            'Computer Programming - Java': 'Write structured Java programs for real-world problem solving.',            'Computer Systems Servicing': 'Work with hardware setup, troubleshooting, and basic system maintenance.',            'Electrical Installation Maintenance': 'Practice wiring, safety, and installation procedures used in technical work.',            'Contact Center Services': 'Develop communication, customer handling, and workplace service skills.',            'Orientation and Program Briefing': 'Learn the purpose, schedule, and expectations of immersion.',            'Worksite Matching and Clearance': 'Match students with an appropriate immersion site and complete paperwork.',            'Parent Consent and Forms': 'Secure the required permission and student information forms.',            'Safety, Dress Code, and Attendance Rules': 'Follow the conduct, appearance, and attendance procedures of the workplace.',            'Pre-Immersion Plan Submission': 'Submit a plan that shows readiness for the worksite placement.',            'Daily Attendance and Time Logs': 'Track arrival, departure, and daily work hours accurately.',            'Assigned Work Tasks': 'Complete the tasks given by the workplace supervisor.',            'Supervisor Feedback and Monitoring': 'Use supervisor comments to improve performance during immersion.',            'Output Documentation': 'Document work outputs, evidence, and task completion.',            'Workplace Conduct and Compliance': 'Maintain proper behavior and follow workplace rules.',            'Reflection Journal and Learning Log': 'Write reflections on learning experiences during immersion.',            'Portfolio Compilation': 'Gather evidence and outputs into a final immersion portfolio.',            'Final Supervisor Evaluation': 'Review the final performance result from the worksite supervisor.',            'Presentation and Defense': 'Present the immersion experience and explain the learning gained.',            'Completion and Exit Requirements': 'Finish the final submission steps required to complete immersion.'        });        return o[title] || 'This topic covers key concepts and practical applications essential to mastering this subject.';    }    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Topic Content System Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬    // Tracks current context for topic content pages    let _tcSubjectId = null, _tcTopicIdx = 0, _tcTab = 'videos', _tcVideoIdx = null;    // Sample video data per topic (future: from backend)    const topicVideos = {        default: [            { id: 1, title: 'Lecture 1: Introduction & Overview', duration: '24:15', teacher: 'Alex Reyes', thumb: null, url: '' },            { id: 2, title: 'Lecture 2: Core Concepts Explained', duration: '18:42', teacher: 'Alex Reyes', thumb: null, url: '' },            { id: 3, title: 'Lecture 3: Practical Demonstration', duration: '31:08', teacher: 'Alex Reyes', thumb: null, url: '' },        ],        'default-subject-placeholder-0': []    };    // Expose globally so onclick in rendered HTML can call it    window.openTopicContent = function (subjectId, topicIdx, tab = 'videos', videoIdx = null) {        _tcSubjectId = subjectId;        _tcTopicIdx = topicIdx;        _tcTab = tab;        _tcVideoIdx = videoIdx;        const data = getTopicData(subjectId);        const subject = getTopicSubject(subjectId);        if (!data || !subject) return;        const topic = data.q1Topics[topicIdx];        if (!topic) return;        const pageId = videoIdx === null || videoIdx === undefined            ? `topic-content:${subjectId}:${topicIdx}:${tab}`            : `topic-content:${subjectId}:${topicIdx}:${tab}:${videoIdx}`;        const hashId = videoIdx === null || videoIdx === undefined            ? `#tc-${subjectId}-${topicIdx}-${tab}`            : `#tc-${subjectId}-${topicIdx}-${tab}-v${videoIdx}`;        history.pushState({ page: pageId }, '', hashId);        _showTopicContent(subjectId, topicIdx, tab, videoIdx);    };    window.returnToTopicsPage = function () {        if (_tcSubjectId) {            switchToTopicPage(_tcSubjectId);            return;        }        history.back();    };    window.switchTopicTab = function (tab) {        if (!_tcSubjectId) return;        _tcTab = tab;        _tcVideoIdx = null;        history.replaceState({ page: `topic-content:${_tcSubjectId}:${_tcTopicIdx}:${tab}` }, '', `#tc-${_tcSubjectId}-${_tcTopicIdx}-${tab}`);        _renderTopicContentMain(_tcSubjectId, _tcTopicIdx, tab);        // Update sub-sidebar active item        document.querySelectorAll('.topic-content-nav-item').forEach(el => {            el.classList.toggle('active', el.dataset.tab === tab);        });    };    function _showTopicContent(subjectId, topicIdx, tab, videoIdx = null) {        _tcSubjectId = subjectId;        _tcTopicIdx = topicIdx;        _tcTab = tab;        _tcVideoIdx = videoIdx;        const data = getTopicData(subjectId);        const subject = getTopicSubject(subjectId);        if (!data || !subject) return;        const topic = data.q1Topics[topicIdx];        setSubjectsPanelsMode(false);        setCurriculumMode(false);        hideAllSections();        showSection('section-topic-content');        navLinks.forEach(l => l.classList.remove('bg-white/20'));        document.getElementById('nav-courses')?.classList.add('bg-white/20');        // Nav header = Topics        setNavContext('Topics');        _showSubSidebarInstant();        subSidebar.classList.add('sub-sidebar-visible');        renderTopicContentsSidebar(subjectId, topicIdx, tab);        updateLayout();        _renderTopicContentMain(subjectId, topicIdx, tab);        window.scrollTo({ top: 0, behavior: 'smooth' });    }    function _buildTopicContentSubSidebar(subject, data, subjectId, topicIdx, tab) {        const title = document.getElementById('sub-sidebar-title');        const content = document.getElementById('sub-sidebar-content');        const header = document.getElementById('sub-sidebar-header');        if (!title || !content) return;        if (header) header.classList.remove('hidden');        const topic = data.q1Topics[topicIdx];        title.innerHTML = `<span class="truncate">${topic.title}</span>`;        const navItems = [            { tab: 'videos', icon: 'fa-solid fa-play-circle', label: 'Videos' },            { tab: 'handouts', icon: 'fa-solid fa-file-pdf', label: 'Handouts' },            { tab: 'assignments', icon: 'fa-solid fa-file-pen', label: 'Assignments' },            { tab: 'quiz', icon: 'fa-solid fa-square-poll-vertical', label: 'Quiz' },            { tab: 'activity', icon: 'fa-solid fa-flask', label: 'Activity' },            { tab: 'performance', icon: 'fa-solid fa-star', label: 'Performance Task' },        ];        content.innerHTML = `            <div class="px-2 pt-3 space-y-0.5">                ${navItems.map(item => `                    <button class="topic-content-nav-item ${tab === item.tab ? 'active' : ''}" data-tab="${item.tab}"                        onclick="switchTopicTab('${item.tab}')">                        <i class="${item.icon} text-sm"></i>                        <span>${item.label}</span>                    </button>                `).join('')}            </div>        `;    }    function _renderTopicContentMain(subjectId, topicIdx, tab) {        const page = document.getElementById('section-topic-content');        if (!page) return;        const data = getTopicData(subjectId);        const subject = getTopicSubject(subjectId);        const topic = data.q1Topics[topicIdx];        const assessmentTabs = ['assignments', 'quiz', 'activity', 'performance'];        const isAssessment = assessmentTabs.includes(tab);        // Main content by tab Ã¢â‚¬â€ no right panel on any tab        // Main content by tab        let mainContent = '';        if (tab === 'videos') mainContent = _buildVideosTab(subject, topic, subjectId, topicIdx);        else if (tab === 'handouts') mainContent = _buildHandoutsTab(subject, topic, subjectId, topicIdx);        else if (isAssessment) mainContent = _buildAssessmentTab(tab, subject, topic, data);        else mainContent = _buildComingSoonTab(tab, subject, topic);        page.innerHTML = `<div class="flex-1 p-8 min-w-0">${mainContent}</div>`;        if (tab === 'handouts') {            const handouts = topic.handouts || topicHandouts[`${subjectId}-${topicIdx}`] || topicHandouts.default;            handouts.forEach((h, i) => {                if (h.type === 'ppt' && h.slides) {                    new HandoutSlider(`handout-slider-${i}`, h.slides);                }            });        }    }    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Tab linear navigation helper Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬    const TAB_ORDER = ['videos', 'handouts', 'assignments', 'quiz', 'activity', 'performance'];    const TAB_LABELS = { videos: 'Videos', handouts: 'Handouts', assignments: 'Assignments', quiz: 'Quiz', activity: 'Activity', performance: 'Performance Task' };    const TAB_ICONS = {        videos: 'fa-solid fa-play-circle',        handouts: 'fa-solid fa-file-pdf',        assignments: 'fa-solid fa-file-pen',        quiz: 'fa-solid fa-square-poll-vertical',        activity: 'fa-solid fa-flask',        performance: 'fa-solid fa-star'    };    function getTopicTabs() {        return TAB_ORDER;    }    function _tabNav(currentTab) {        const tabs = getTopicTabs();        const idx = tabs.indexOf(currentTab);        const prev = idx > 0 ? tabs[idx - 1] : null;        const next = idx < tabs.length - 1 ? tabs[idx + 1] : null;        return `            <div class="flex items-center justify-between w-full mb-6">                ${prev ? `                <button onclick="switchTopicTab('${prev}')"                    title="${TAB_LABELS[prev]}"                    aria-label="${TAB_LABELS[prev]}"                    class="h-10 min-w-[56px] px-4 rounded-xl bg-icc hover:bg-icc-dark text-white text-xs font-bold transition-all flex items-center justify-center gap-2">                    <i class="fa-solid fa-chevron-left text-[10px]"></i>                    <i class="${TAB_ICONS[prev] || 'fa-solid fa-circle'} text-[14px]"></i>                </button>` : '<div class="w-10 h-10"></div>'}                ${next ? `                <button onclick="switchTopicTab('${next}')"                    title="${TAB_LABELS[next]}"                    aria-label="${TAB_LABELS[next]}"                    class="h-10 min-w-[56px] px-4 rounded-xl bg-icc hover:bg-icc-dark text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2">                    <i class="${TAB_ICONS[next] || 'fa-solid fa-circle'} text-[14px]"></i>                    <i class="fa-solid fa-chevron-right text-[10px]"></i>                </button>` : '<div class="w-10 h-10"></div>'}            </div>        `;    }    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ VIDEOS TAB Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬    function _buildVideosTab(subject, topic, subjectId, topicIdx) {        const videos = topicVideos[`${subjectId}-${topicIdx}`] ?? topicVideos.default;        const subjectCluster = currentCurriculumCluster ? (curriculumPrograms[currentCurriculumProgram]?.clusters || curriculumPrograms[currentCurriculumProgram]?.stages || []).find(c => c.key === currentCurriculumCluster) : null;        if (!videos.length) {            return `                ${_tabNav('videos')}                <div class="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">                    <i class="fa-solid fa-play-circle text-4xl text-gray-300 mb-4"></i>                    <p class="text-xl font-black text-gray-800">No videos yet</p>                    <p class="text-sm text-gray-500 mt-2">This topic lesson does not have any videos yet.</p>                </div>            `;        }        if (_tcVideoIdx === null || _tcVideoIdx === undefined || Number.isNaN(_tcVideoIdx)) {            return `                ${_tabNav('videos')}                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">                    ${videos.map((video, i) => `                        <button type="button" class="video-selection-card bg-white border border-gray-100 rounded-2xl p-4 text-left hover:shadow-[inset_0_0_0_2px_rgba(255,200,18,1)] transition-shadow" onclick="openTopicContent('${subjectId}', ${topicIdx}, 'videos', ${i})">                            <div class="bg-gray-900 rounded-2xl overflow-hidden mb-4 flex items-center justify-center" style="aspect-ratio:16/9;">                                <div class="text-center text-white/40">                                    <i class="fa-solid fa-play-circle text-4xl mb-2 block"></i>                                </div>                            </div>                            <p class="text-base font-black text-gray-800 leading-tight">${video.title}</p>                            <p class="text-sm text-gray-500 mt-2 leading-relaxed">${getTopicOverview(video.title)}</p>                            <div class="mt-3 flex items-center justify-between">                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${video.duration}</span>                            </div>                        </button>                    `).join('')}                </div>            `;        }        const activeVideo = videos[_tcVideoIdx] || videos[0];        const otherVideos = videos.filter((_, idx) => idx !== _tcVideoIdx);        return `                        ${_tabNav('videos')}            <div class="max-w-[960px] mx-auto mb-4">                <div class="bg-gray-900 rounded-2xl overflow-hidden flex items-center justify-center w-full" style="aspect-ratio:16/9;">                    <div class="text-center text-white/40 px-6">                        <i class="fa-solid fa-play-circle text-6xl mb-3 block"></i>                        <p class="text-sm font-bold">${activeVideo.title}</p>                        <p class="text-xs mt-1 text-white/30">${activeVideo.duration}</p>                        <p class="text-[10px] mt-4 text-white/20">Video player Ã¢â‚¬â€ connect to backend to stream</p>                    </div>                </div>            </div>            <div class="mb-6">                <p class="text-xs text-gray-400 font-bold uppercase tracking-widest">Now Playing</p>                <p class="text-2xl font-black text-gray-800 mt-1">${activeVideo.title}</p>                <p class="text-sm text-gray-500 mt-2">${getTopicOverview(activeVideo.title)}</p>                <p class="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-4">${activeVideo.duration}</p>            </div>            <div class="space-y-4">                <div class="flex items-center justify-between">                    <p class="text-xs font-black text-gray-800 uppercase tracking-widest">More Videos</p>                    <span class="text-[10px] text-gray-400 font-bold">${otherVideos.length} videos</span>                </div>                <div class="space-y-4">                    ${otherVideos.map((video) => {            const originalIdx = videos.findIndex(item => item.id === video.id);            return `                            <button type="button" class="w-full bg-white border border-gray-100 rounded-2xl overflow-hidden flex text-left hover:shadow-[inset_0_0_0_2px_rgba(255,200,18,1)] transition-shadow" onclick="openTopicContent('${subjectId}', ${topicIdx}, 'videos', ${originalIdx})">                                <div class="w-44 flex-shrink-0 bg-gray-900 flex items-center justify-center" style="aspect-ratio:16/9;">                                    <i class="fa-solid fa-play text-white/60 text-xl"></i>                                </div>                                <div class="flex-1 p-5 min-w-0">                                    <p class="text-lg font-black text-gray-800 leading-tight">${video.title}</p>                                    <p class="text-sm text-gray-500 mt-2 line-clamp-2">${getTopicOverview(video.title)}</p>                                    <div class="mt-4 flex items-center justify-between">                                        <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${video.duration}</span>                                    </div>                                </div>                            </button>                        `;        }).join('')}                </div>            </div>        `;    }    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ HANDOUTS TAB Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬    function _buildHandoutsTab(subject, topic, subjectId, topicIdx) {        const handouts = topic.handouts || topicHandouts[`${subjectId}-${topicIdx}`] || topicHandouts.default;        const subjectCluster = currentCurriculumCluster ? (curriculumPrograms[currentCurriculumProgram]?.clusters || curriculumPrograms[currentCurriculumProgram]?.stages || []).find(c => c.key === currentCurriculumCluster) : null;        if (!handouts.length) {            return `                                ${_tabNav('handouts')}                <div class="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">                    <i class="fa-solid fa-file-pdf text-4xl text-gray-300 mb-4"></i>                    <p class="text-xl font-black text-gray-800">No handouts yet</p>                    <p class="text-sm text-gray-500 mt-2">This topic lesson does not have any handouts yet.</p>                </div>            `;        }        const handoutCards = handouts.map((h, i) => {            if (h.type === 'ppt') {                return `                    <div class="ppt-handout-container bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">                        <div class="flex items-center justify-between">                            <div>                                <h3 class="text-lg font-black text-gray-800 tracking-tight">${h.title}</h3>                                <p class="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Powerpoint Presentation Ã¢â‚¬Â¢ ${h.slides.length} Slides</p>                            </div>                            <button type="button"                                onclick="askSigmaAbout('${h.title.replace(/'/g, "\\'")}', 'Analyzing Powerpoint: ${h.title.replace(/'/g, "\\'")}. This presentation contains ${h.slides.length} slides of instructional material.')"                                class="w-10 h-10 rounded-xl bg-icc hover:bg-icc-dark flex items-center justify-center transition-all shadow-sm">                                <i class="fa-solid fa-bolt text-icc-yellow text-lg"></i>                            </button>                        </div>                        <div id="handout-slider-${i}" class="min-h-[200px]"></div>                        ${h.details ? `                        <div class="bg-gray-50 rounded-xl p-4">                            <p class="text-sm text-gray-600 leading-relaxed font-medium">${h.details}</p>                        </div>` : ''}                    </div>                `;            }            const isDocs = h.type === 'docs';            const iconCls = isDocs ? 'fa-file-word text-blue-500' : 'fa-file-pdf text-red-500';            const bgCls = isDocs ? 'bg-blue-50' : 'bg-red-50';            return `                <div class="handout-card bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm cursor-pointer"                     onclick="openHandoutModal(${i},'${subjectId}',${topicIdx})">                    <div class="w-16 h-16 rounded-xl ${bgCls} flex items-center justify-center flex-shrink-0">                        <i class="fa-solid ${iconCls} text-3xl"></i>                    </div>                    <div class="flex-1 min-w-0">                        <p class="text-sm font-black text-gray-800 leading-tight">${h.title}</p>                        <p class="text-[11px] text-gray-400 mt-0.5">${h.type?.toUpperCase() || 'PDF'} Ã¢â‚¬Â¢ ${h.pages || 'Ã¢â‚¬â€'} pages Ã¢â‚¬Â¢ ${h.size || 'Size N/A'} Ã¢â‚¬Â¢ Uploaded by ${h.uploader || 'Admin'}</p>                    </div>                    <button type="button"                        data-ai-subject="${h.title}"                        data-ai-insight="This handout supports ${topic.title}. It contains reference material to help the student review the lesson in a clearer, more structured way."                        onclick="event.stopPropagation();askSigmaAbout(this.dataset.aiSubject, this.dataset.aiInsight)"                        title="SIGMA AI Summary"                        class="handout-ai-btn w-12 h-12 rounded-xl bg-icc hover:bg-icc-dark flex items-center justify-center transition-all shadow-sm flex-shrink-0">                        <i class="fa-solid fa-bolt text-icc-yellow text-xl"></i>                    </button>                </div>            `;        }).join('');        return `                        ${_tabNav('handouts')}            <div class="space-y-4" id="handout-list">                ${handoutCards}            </div>        `;    }    // Open PDF as full-screen browser-layout modal    window.openHandoutModal = function (idx, subjectId, topicIdx) {        const handouts = topicHandouts[`${subjectId}-${topicIdx}`] || topicHandouts.default;        const h = handouts[idx];        if (!h) return;        document.getElementById('handout-modal')?.remove();        const modal = document.createElement('div');        modal.id = 'handout-modal';        modal.style.cssText = 'position:fixed;inset:0;z-index:9000;display:flex;flex-direction:column;background:#404040;';        const iframeAttr = h.url            ? `src="${h.url}"`            : `srcdoc="<html><body style='margin:0;display:flex;align-items:center;justify-content:center;height:100%;background:#f8fafc;font-family:sans-serif;'><div style='text-align:center;color:#94a3b8;'><div style='font-size:72px;margin-bottom:16px'>Ã°Å¸â€œâ€ž</div><p style='font-size:18px;font-weight:800;color:#374151'>${h.title}</p><p style='font-size:13px;margin-top:8px'>${h.pages} pages Ã¢â‚¬Â¢ ${h.size}</p><p style='font-size:11px;margin-top:20px;color:#cbd5e1;max-width:340px;line-height:1.6'>PDF will render here once connected to backend.</p></div></body></html>"`;        modal.innerHTML = `            <!-- Minimal top bar Ã¢â‚¬â€ just back button and filename -->            <div style="height:48px;background:#1e1e2e;display:flex;align-items:center;padding:0 16px;gap:14px;flex-shrink:0;">                <button onclick="document.getElementById('handout-modal').remove()"                    style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,0.1);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s"                    onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">                    <i class="fa-solid fa-xmark" style="color:white;font-size:13px"></i>                </button>                <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">                    <i class="fa-solid fa-file-pdf" style="color:#ef4444;font-size:14px;flex-shrink:0"></i>                    <span style="font-size:13px;font-weight:700;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${h.title}</span>                    <span style="font-size:11px;color:rgba(255,255,255,0.4);flex-shrink:0">Ã¢â‚¬Â¢ ${h.pages} pages Ã¢â‚¬Â¢ ${h.size}</span>                </div>                <span style="font-size:11px;color:rgba(255,255,255,0.35);white-space:nowrap;flex-shrink:0">Uploaded by ${h.uploader}</span>            </div>            <!-- PDF iframe fills all remaining height Ã¢â‚¬â€ Chrome renders its own toolbar inside -->            <iframe ${iframeAttr}                style="flex:1;border:none;width:100%;display:block;background:#404040"            ></iframe>`;        document.body.appendChild(modal);        const esc = e => { if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', esc); } };        document.addEventListener('keydown', esc);    };    window.toggleHandoutPreview = window.openHandoutModal;    window.previewHandout = window.openHandoutModal;    window.closePdfPreview = function () { document.getElementById('handout-modal')?.remove(); };    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Sample handout data (future: from backend) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬    const topicHandouts = {        default: [            { title: 'Lesson Notes Ã¢â‚¬â€ Chapter 1', pages: 12, size: '1.2 MB', uploader: 'Admin', url: '' },            { title: 'Reference Guide &     Glossary', pages: 8, size: '0.8 MB', uploader: 'Admin', url: '' },            { title: 'Practice Exercises Sheet', pages: 4, size: '0.4 MB', uploader: 'Admin', url: '' },        ],        'default-subject-placeholder-0': []    };    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ ASSESSMENT TABS (assignments/quiz/activity/performance) Ã¢â€â‚¬    // Sample assessment data Ã¢â‚¬â€ teacher/admin will populate via backend    const assessmentData = {        default: {            startDate: 'March 20, 2026', startTime: '8:00 AM',            dueDate: 'March 27, 2026', dueTime: '5:00 PM',            maxScore: 100, maxAttempts: 3,            latePermission: true,            instructionType: 'text', // 'text' or 'pdf'            instructionPdf: { title: 'Activity Instructions Sheet', pages: 4, size: '0.6 MB', uploader: 'Teacher' },            submission: null // null = not yet submitted        }    };    function _buildAssessmentTab(tab, subject, topic, data) {        if (subject.id === 'default-subject-placeholder' && tab === 'activity') {            const breadcrumb = buildSubjectBreadcrumb(subject, null, true, topic);            return `                                ${_tabNav('activity')}                <div class="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">                    <i class="fa-solid fa-flask text-4xl text-gray-300 mb-4"></i>                    <p class="text-xl font-black text-gray-800">No activity yet</p>                    <p class="text-sm text-gray-500 mt-2">This topic lesson does not have any activity inside yet.</p>                </div>            `;        }        const labels = { assignments: 'Assignment', quiz: 'Quiz', activity: 'Activity', performance: 'Performance Task' };        const icons = { assignments: 'fa-file-pen', quiz: 'fa-square-poll-vertical', activity: 'fa-flask', performance: 'fa-star' };        const iconColors = {            assignments: 'bg-blue-100 text-blue-600',            quiz: 'bg-purple-100 text-purple-600',            activity: 'bg-amber-100 text-amber-600',            performance: 'bg-icc-light text-icc'        };        const label = labels[tab];        const icon = icons[tab];        const iconCls = iconColors[tab];        const subjectCluster = currentCurriculumCluster ? (curriculumPrograms[currentCurriculumProgram]?.clusters || curriculumPrograms[currentCurriculumProgram]?.stages || []).find(c => c.key === currentCurriculumCluster) : null;        const gradeKey = { assignments: 'assignment', quiz: 'quiz', activity: 'activity', performance: 'performance' }[tab];        const gradeVal = topic.grades ? topic.grades[gradeKey] : null;        const gradeColor = !gradeVal || gradeVal === 0 ? 'text-gray-300'            : gradeVal >= 90 ? 'text-green-600' : gradeVal >= 80 ? 'text-icc'                : gradeVal >= 75 ? 'text-yellow-600' : 'text-red-500';        const gradeLabel = gradeVal && gradeVal > 0 ? gradeVal : 'Ã¢â‚¬â€';        const gradeRemarks = !gradeVal || gradeVal === 0 ? 'Not yet graded'            : gradeVal >= 90 ? 'Excellent' : gradeVal >= 80 ? 'Very Good'                : gradeVal >= 75 ? 'Good' : 'Needs Improvement';        const instructionTexts = {            assignments: `Write a structured program in Java that demonstrates the concepts covered in <strong>${topic.title}</strong>. Your code must include proper variable declarations, control structures, and methods. Include comments for each major section. Save your file as <strong>LastName_Assignment.java</strong> and submit via the upload form.`,            quiz: `Answer all questions in the quiz for <strong>${topic.title}</strong>. This is a closed-book assessment Ã¢â‚¬â€ do not use reference materials unless specified. Each item is worth equal points. Read each question carefully before answering. Once submitted, your responses cannot be changed.`,            activity: `Complete the hands-on activity for <strong>${topic.title}</strong>. Follow the step-by-step instructions in the provided reference sheet. Document your results with screenshots or written output as required. Submit your completed activity report in PDF format.`,            performance: `Create a comprehensive output that demonstrates your mastery of <strong>${topic.title}</strong>. Your work will be graded based on accuracy, completeness, creativity, and adherence to the rubric. Review the rubric carefully before starting. Submit all required files before the deadline.`        };        const amd = assessmentData.default;        const isPdf = amd.instructionType === 'pdf';        const isSubmitted = !!amd.submission;        const sub = amd.submission;        const statusBadge = topic.status === 'completed'            ? `<span class="px-3 py-1.5 text-xs font-black rounded-full bg-green-100 text-green-700 uppercase">Submitted</span>`            : topic.status === 'in-progress'                ? `<span class="px-3 py-1.5 text-xs font-black rounded-full bg-yellow-100 text-yellow-700 uppercase">In Progress</span>`                : `<span class="px-3 py-1.5 text-xs font-black rounded-full bg-gray-100 text-gray-500 uppercase">Not Started</span>`;        // Instructions block        const instructionBlock = isPdf ? `            <div class="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm">                <div class="w-14 h-14 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">                    <i class="fa-solid fa-file-pdf text-red-500 text-3xl"></i>                </div>                <div class="flex-1 min-w-0">                    <p class="text-base font-black text-gray-900 leading-tight">${amd.instructionPdf.title}</p>                    <p class="text-sm text-gray-400 mt-0.5">${amd.instructionPdf.pages} pages Ã¢â‚¬Â¢ ${amd.instructionPdf.size} Ã¢â‚¬Â¢ By ${amd.instructionPdf.uploader}</p>                </div>                <div class="flex items-center gap-2.5 flex-shrink-0">                    <button type="button"                        onclick="askSigmaAbout('${label.replace(/'/g, "\\'")} Instructions', 'These instructions explain the requirements, expected output, submission rules, and preparation steps for ${label.toLowerCase()} in ${topic.title.replace(/'/g, "\\'")}. Review them before starting so the work matches the rubric and deadline.')"                        title="SIGMA AI"                        class="w-11 h-11 rounded-xl bg-icc hover:bg-icc-dark flex items-center justify-center transition-all shadow-sm">                        <i class="fa-solid fa-bolt text-icc-yellow text-lg"></i>                    </button>                    <button title="Download" class="w-11 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-all">                        <i class="fa-solid fa-download text-lg"></i>                    </button>                </div>            </div>` : `            <div class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">                <div class="flex items-start justify-between gap-4 mb-3">                    <p class="text-lg font-black text-gray-900">Instructions</p>                    <button type="button"                        onclick="askSigmaAbout('${label.replace(/'/g, "\\'")} Instructions', 'These instructions explain the task, expected output, and submission requirements for ${label.toLowerCase()} in ${topic.title.replace(/'/g, "\\'")}. Use them as the guide before completing the work.')"                        title="SIGMA AI"                        class="w-11 h-11 rounded-xl bg-icc hover:bg-icc-dark flex items-center justify-center transition-all shadow-sm flex-shrink-0">                        <i class="fa-solid fa-bolt text-icc-yellow text-lg"></i>                    </button>                </div>                <p class="text-base text-gray-800 leading-relaxed font-medium">${instructionTexts[tab]}</p>            </div>`;        const barColor = gradeVal && gradeVal >= 90 ? 'bg-green-500'            : gradeVal && gradeVal >= 80 ? 'bg-icc'                : gradeVal && gradeVal >= 75 ? 'bg-icc-yellow'                    : gradeVal && gradeVal > 0 ? 'bg-red-400' : 'bg-gray-200';        return `            <!-- Header -->                        ${_tabNav(tab)}            <!-- Two-column layout -->            <div class="flex gap-6 min-w-0 items-start">                <!-- LEFT: Instructions first, then Activity Details -->                <div class="flex-1 min-w-0 space-y-5">                    ${instructionBlock}                    <!-- Activity Details -->                    <div class="bg-white border border-gray-100 rounded-2xl overflow-hidden">                        <div class="px-6 py-4 border-b border-gray-100">                            <p class="text-base font-black text-gray-900">${label} Details</p>                        </div>                        <div class="p-6">                            <div class="grid grid-cols-3 gap-4">                                <div class="bg-gray-50 rounded-2xl p-4">                                    <div class="flex items-center gap-2 mb-2">                                        <i class="fa-solid fa-calendar-check text-icc text-sm"></i>                                        <p class="text-xs font-black text-gray-500 uppercase tracking-widest">Start</p>                                    </div>                                    <p class="text-base font-black text-gray-900">${amd.startDate}</p>                                    <p class="text-sm text-gray-500 font-medium mt-0.5">${amd.startTime}</p>                                </div>                                <div class="bg-red-50 rounded-2xl p-4">                                    <div class="flex items-center gap-2 mb-2">                                        <i class="fa-solid fa-clock text-red-500 text-sm"></i>                                        <p class="text-xs font-black text-red-400 uppercase tracking-widest">Due</p>                                    </div>                                    <p class="text-base font-black text-gray-900">${amd.dueDate}</p>                                    <p class="text-sm text-red-500 font-bold mt-0.5">${amd.dueTime}</p>                                </div>                                <div class="bg-icc-light rounded-2xl p-4">                                    <div class="flex items-center gap-2 mb-2">                                        <i class="fa-solid fa-star text-icc text-sm"></i>                                        <p class="text-xs font-black text-icc uppercase tracking-widest">Max Score</p>                                    </div>                                    <p class="text-3xl font-black text-icc leading-none">${amd.maxScore}</p>                                    <p class="text-sm text-icc/60 font-medium mt-1">points</p>                                </div>                            </div>                        </div>                    </div>                </div>                <!-- RIGHT: Grade + Submission info -->                <div class="w-64 flex-shrink-0 space-y-4">                    <!-- Grade panel -->                    <div class="bg-white border border-gray-100 rounded-2xl overflow-hidden">                        <div class="px-5 py-4 border-b border-gray-100">                            <p class="text-sm font-black text-gray-900">Your Grade</p>                        </div>                        <div class="p-5 text-center">                            <div class="text-6xl font-black ${gradeColor} mb-1">${gradeLabel}</div>                            <p class="text-xs text-gray-400 font-bold uppercase tracking-widest">out of ${amd.maxScore}</p>                            <div class="mt-3 h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">                                <div class="h-full rounded-full ${barColor}" style="width:${gradeVal && gradeVal > 0 ? gradeVal : 0}%"></div>                            </div>                            <p class="text-xs text-gray-400 mt-1.5 text-right font-medium">${gradeRemarks}</p>                        </div>                    </div>                    <!-- Submission info panel -->                    <div class="bg-white border border-gray-100 rounded-2xl overflow-hidden">                        <div class="px-5 py-4 border-b border-gray-100">                            <p class="text-sm font-black text-gray-900">Submission</p>                        </div>                        <div class="p-5 space-y-3 text-sm">                            <div class="flex justify-between items-center">                                <span class="text-gray-500 font-medium">Max Attempts</span>                                <span class="font-black text-gray-900">${amd.maxAttempts}</span>                            </div>                            <div class="flex justify-between items-center">                                <span class="text-gray-500 font-medium">Attempts Used</span>                                <span class="font-black text-gray-900">${isSubmitted ? '1' : '0'} / ${amd.maxAttempts}</span>                            </div>                            <div class="flex justify-between items-center">                                <span class="text-gray-500 font-medium">Late Permission</span>                                <span class="font-black ${amd.latePermission ? 'text-icc' : 'text-red-500'}">${amd.latePermission ? 'Permitted' : 'Not Allowed'}</span>                            </div>                            ${isSubmitted ? `                            <div class="pt-3 border-t border-gray-100 space-y-2.5">                                <div class="flex justify-between items-center">                                    <span class="text-gray-500 font-medium">Submitted</span>                                    <span class="font-black text-gray-900">1 / ${amd.maxAttempts}</span>                                </div>                                <div>                                    <span class="text-gray-500 font-medium block">Submitted On</span>                                    <span class="font-bold text-gray-800">${sub.date}</span>                                    <span class="text-gray-400 font-medium block text-xs">${sub.time}</span>                                </div>                                ${sub.isLate ? `<div class="flex justify-between items-center"><span class="text-gray-500 font-medium">Overdue</span><span class="font-black text-red-500">Yes</span></div>` : ''}                                <button class="w-full py-2.5 bg-icc-light hover:bg-icc/20 text-icc font-black text-sm rounded-xl transition-all flex items-center justify-center gap-2">                                    <i class="fa-solid fa-eye text-sm"></i> View Submission                                </button>                            </div>` : `                            <div class="pt-3 border-t border-gray-100">                                <p class="text-xs text-gray-400 text-center font-medium">No submission yet.</p>                            </div>`}                        </div>                    </div>                </div>            </div>        `;    }    function _buildComingSoonTab(tab, subject, topic) {        const labels = { assignments: 'Assignments', quiz: 'Quiz', activity: 'Activity', performance: 'Performance Task' };        const icons = { assignments: 'fa-file-pen', quiz: 'fa-square-poll-vertical', activity: 'fa-flask', performance: 'fa-star' };        const subjectCluster = currentCurriculumCluster ? (curriculumPrograms[currentCurriculumProgram]?.clusters || curriculumPrograms[currentCurriculumProgram]?.stages || []).find(c => c.key === currentCurriculumCluster) : null;        return `            ${_tabNav(tab)}            <div class="bg-white border border-gray-100 rounded-2xl p-16 flex flex-col items-center justify-center text-center">                <i class="fa-solid ${icons[tab] || 'fa-folder'} text-5xl text-gray-200 mb-4"></i>                <p class="text-base font-black text-gray-400">${labels[tab] || tab}</p>                <p class="text-sm text-gray-300 mt-1">Content will appear here when uploaded by your teacher.</p>            </div>        `;    }    const syncHeaderToggleState = () => {        if (calendarToggle && calendarDropdown) {            calendarToggle.classList.toggle('active', !calendarDropdown.classList.contains('hidden'));        }        if (notiToggle && notiDropdown) {            notiToggle.classList.toggle('active', !notiDropdown.classList.contains('hidden'));        }        if (profileDropdownBtn && profileDropdownMenu) {            profileDropdownBtn.classList.toggle('active', !profileDropdownMenu.classList.contains('hidden'));        }    };    const setupDropdown = (btn, menu) => {        if (!btn || !menu) return;        btn.addEventListener('click', e => {            e.preventDefault();            e.stopPropagation();            const isOpen = !menu.classList.contains('hidden');            hideHeaderOverlays(menu, btn, true);            if (isOpen) {                menu.classList.add('hidden');                btn.classList.remove('active');            } else {                menu.classList.remove('hidden');                btn.classList.add('active');            }            syncHeaderToggleState();        });        menu.addEventListener('click', e => e.stopPropagation());    };    setupDropdown(calendarToggle, calendarDropdown);    setupDropdown(notiToggle, notiDropdown);    setupDropdown(profileDropdownBtn, profileDropdownMenu);    function renderStudentNotificationPanels() {        const notifications = [            { icon: 'fa-book-open', tone: 'text-icc', label: 'Material Posted', title: 'New module: Logic Gates', body: 'Teacher Alex Reyes posted new material in Computer Programming 1.' },            { icon: 'fa-bullhorn', tone: 'text-blue-600', label: 'Announcement', title: '2nd Quarter academic update', body: 'Administrator Jubileen Gonzales shared a school announcement.' },            { icon: 'fa-clipboard-check', tone: 'text-green-600', label: 'Graded Submission', title: 'Your Logic Gates Quiz was graded', body: 'Teacher Sarah Lim returned your submission with feedback.' },            { icon: 'fa-trophy', tone: 'text-yellow-600', label: 'Milestone', title: 'Achievement unlocked', body: 'You reached a new learning milestone for weekly study streaks.' },            { icon: 'fa-calendar-day', tone: 'text-red-600', label: 'Due Date', title: 'E-Portfolio Draft due soon', body: 'Your submission is due May 10 at 11:59 PM.' },            { icon: 'fa-user-check', tone: 'text-emerald-600', label: 'Attendance', title: 'Attendance recorded', body: 'Teacher Maria marked your Web Development 1 attendance as Present.' }        ];        const desktopList = document.querySelector('#noti-dropdown .flex-1 > .px-6.py-4');        const mobileList = document.querySelector('#mobile-noti-panel .mobile-pull-up-content .space-y-4');        const desktopHtml = notifications.map(item => `            <div class="notif-item px-4 py-4 hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-100 rounded-xl mb-2 transition-all">                <div class="flex gap-4 items-start">                    <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center ${item.tone} text-sm shadow-sm border border-slate-200/60">                        <i class="fa-solid ${item.icon}"></i>                    </div>                    <div class="flex-1 min-w-0">                        <p class="text-[10px] font-black ${item.tone} uppercase tracking-widest mb-1">${item.label}</p>                        <p class="text-[13px] font-bold text-gray-800 leading-tight font-['Inter']">${item.title}</p>                        <p class="text-[12px] text-gray-500 mt-1 font-['Inter'] leading-relaxed">${item.body}</p>                    </div>                </div>            </div>        `).join('');        const mobileHtml = notifications.map(item => `            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">                <p class="text-xs font-black ${item.tone} uppercase tracking-widest mb-1">${item.label}</p>                <p class="text-sm font-bold text-slate-800">${item.title}</p>                <p class="text-[11px] text-slate-500 mt-1">${item.body}</p>            </div>        `).join('');        if (desktopList) desktopList.innerHTML = desktopHtml;        if (mobileList) mobileList.innerHTML = mobileHtml;    }    renderStudentNotificationPanels();    // --- User Profile Initialization ---    const initUserProfile = () => {        const authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');        const dropFName = document.getElementById('header-dropdown-firstName');        const dropLName = document.getElementById('header-dropdown-lastName');        if (dropFName) dropFName.textContent = authUser.firstName || 'Firstname';        if (dropLName) dropLName.textContent = authUser.lastName || 'Lastname';        // Welcome Banner        const welcomeName = document.getElementById('welcome-user-firstName');        if (welcomeName) welcomeName.textContent = 'Student';        // Avatars        const headerImg = document.getElementById('header-avatar-img');        const headerPlaceholder = document.getElementById('header-avatar-placeholder');        const dropdownImg = document.getElementById('sidebar-avatar-img');        const dropdownPlaceholder = document.getElementById('sidebar-avatar-placeholder');        const avatarUrl = authUser.avatar || '';        if (avatarUrl) {            if (headerImg) { headerImg.src = avatarUrl; headerImg.classList.remove('hidden'); }            if (headerPlaceholder) headerPlaceholder.classList.add('hidden');            if (dropdownImg) { dropdownImg.src = avatarUrl; dropdownImg.classList.remove('hidden'); }            if (dropdownPlaceholder) dropdownPlaceholder.classList.add('hidden');        } else {            if (headerImg) headerImg.classList.add('hidden');            if (headerPlaceholder) headerPlaceholder.classList.remove('hidden');            if (dropdownImg) dropdownImg.classList.add('hidden');            if (dropdownPlaceholder) dropdownPlaceholder.classList.remove('hidden');        }    };    initUserProfile();    window.showMyProfile = (e) => {        if (e) e.preventDefault();        hideHeaderOverlays();        switchTab('nav-profile');    };    document.getElementById('viewCalendarBtn')?.addEventListener('click', e => {        e.preventDefault();        hideHeaderOverlays();        switchTab('nav-attendance');    });    window.addEventListener('click', () => {        if (suppressNextHeaderClose) return;        hideHeaderOverlays(null, null, true);    });    document.querySelectorAll('[data-assignment]').forEach(el => el.addEventListener('click', () => switchTab('nav-assignments')));    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Classroom Detail Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬    const classroomPeopleBySection = {        'ICT-11A': [            'Abad, Juan',            'Bautista, Maria',            'Cruz, Jose',            'Dela Cruz, Ana',            'Estacio, Ricardo',            'Ferrer, Liza',            'Garcia, Antonio',            'Hernandez, Elena'        ]    };    const classroomAnnouncementById = {        'card-prog1': [            {                author: 'Alex Reyes',                timestamp: 'Apr 7, 9:26 AM',                html: '<p>Please review loops and methods before tomorrow&apos;s hands-on activity.</p>'            }        ],        'card-webdev': [            {                author: 'Sarah Lim',                timestamp: 'Apr 7, 8:10 AM',                html: '<p>Bring your latest wireframe draft for our responsive layout check.</p>'            }        ],        'card-database': [            {                author: 'Elena Reyes',                timestamp: 'Apr 6, 4:15 PM',                html: '<p>Database design consultation starts 15 minutes before class inside Lab 1.</p>'            }        ]    };    const classroomData = {        'card-prog1': {            subject: 'Computer Programming 1',            teacher: 'Alex Reyes',            section: 'ICT-11A',            room: 'Room 301',            sharedKey: 'Grade 11 - ICT A::Programming 1',            students: 38,            schedule: 'Mon / Wed / Fri Ã¢â‚¬Â¢ 8:00 Ã¢â‚¬â€œ 9:30 AM',            icon: 'fa-solid fa-code',            bgColor: 'bg-[#15803d]',            color: 'text-icc',            topicColor: 'bg-icc-light'        },        'card-webdev': {            subject: 'Web Development 1',            teacher: 'Sarah Lim',            section: 'ICT-11A',            room: 'Lab 2',            sharedKey: 'ICT-11A::Web Development 1',            students: 38,            schedule: 'Tue / Thu â€¢ 9:45 â€“ 11:15 AM',            icon: 'fa-solid fa-globe',            bgColor: 'bg-[#FFD000]',            color: 'text-blue-600',            topicColor: 'bg-blue-50'        },        'card-database': {            subject: 'Database Management 1',            teacher: 'Elena Reyes',            section: 'ICT-11A',            room: 'Lab 1',            sharedKey: 'Grade 11 - ICT A::Database Management',            students: 40,            schedule: 'Mon / Wed Ã¢â‚¬Â¢ 11:30 AM Ã¢â‚¬â€œ 1:00 PM',            icon: 'fa-solid fa-database',            bgColor: 'bg-[#78350f]',            color: 'text-orange-600',            topicColor: 'bg-orange-50'        },        'card-empowerment': {            subject: 'Empowerment Technology',            teacher: 'Roberto Diaz',            section: 'ICT-11A',            room: 'Room 304',            sharedKey: 'ICT-11A::Empowerment Technology',            students: 42,            schedule: 'Tue / Thu Ã¢â‚¬Â¢ 1:30 Ã¢â‚¬â€œ 3:00 PM',            icon: 'fa-solid fa-laptop-code',            bgColor: 'bg-[#15803d]',            color: 'text-emerald-600',            topicColor: 'bg-emerald-50'        },        'card-stats': {            subject: 'Statistics & Probability',            teacher: 'Jennifer Santos',            section: 'ICT-11A',            room: 'Room 406',            sharedKey: 'ICT-11A::Statistics & Probability',            students: 38,            schedule: 'Mon / Wed Ã¢â‚¬Â¢ 3:15 Ã¢â‚¬â€œ 4:45 PM',            icon: 'fa-solid fa-chart-column',            bgColor: 'bg-[#15803d]',            color: 'text-rose-600',            topicColor: 'bg-rose-50'        },        'card-introcomp': {            subject: 'Intro to Computing',            teacher: 'Alex Reyes',            section: 'ICT-11A',            room: 'Lab 1',            sharedKey: 'ICT-11A::Intro to Computing',            students: 40,            schedule: 'Mon / Wed / Fri Ã¢â‚¬Â¢ 8:00 Ã¢â‚¬â€œ 9:30 AM',            icon: 'fa-solid fa-desktop',            bgColor: 'bg-[#FFD000]',            color: 'text-indigo-600',            topicColor: 'bg-indigo-50'        },        'card-animation': {            subject: 'Animation',            teacher: 'Elena Reyes',            section: 'ICT-11A',            room: 'Lab 3',            sharedKey: 'Grade 11 - ICT B::Animation',            students: 36,            schedule: 'Tue / Thu Ã¢â‚¬Â¢ 1:30 Ã¢â‚¬â€œ 3:00 PM',            icon: 'fa-solid fa-palette',            bgColor: 'bg-[#78350f]',            color: 'text-pink-600',            topicColor: 'bg-pink-50'        },        'card-system': {            subject: 'System Architecture',            teacher: 'Roberto Diaz',            section: 'ICT-11A',            room: 'Room 305',            sharedKey: 'ICT-11A::System Architecture',            students: 39,            schedule: 'Tue / Thu Ã¢â‚¬Â¢ 10:30 AM Ã¢â‚¬â€œ 12:00 PM',            icon: 'fa-solid fa-sitemap',            bgColor: 'bg-[#78350f]',            color: 'text-slate-700',            topicColor: 'bg-slate-100'        },        'card-genmath': {            subject: 'General Mathematics',            teacher: 'Jose Santos',            section: 'Grade 11 - STEM A',            room: 'Room 406',            sharedKey: 'Grade 11 - STEM A::General Mathematics',            students: 42,            schedule: 'Mon / Wed / Fri Ã¢â‚¬Â¢ 1:00 Ã¢â‚¬â€œ 2:30 PM',            icon: 'fa-solid fa-infinity',            bgColor: 'bg-[#15803d]',            color: 'text-indigo-600',            topicColor: 'bg-indigo-50'        },        'card-oralcomm': {            subject: 'Oral Communication',            teacher: 'Ana Reyes',            section: 'Grade 11 - ICT A',            room: 'Room 204',            sharedKey: 'Grade 11 - ICT A::Oral Communication',            students: 35,            schedule: 'Tue / Thu Ã¢â‚¬Â¢ 8:00 Ã¢â‚¬â€œ 9:30 AM',            icon: 'fa-solid fa-comments',            bgColor: 'bg-[#15803d]',            color: 'text-icc',            topicColor: 'bg-icc-light'        }    };    const classroomTopicSourceById = {        'card-prog1': 'card-prog1',        'card-webdev': 'card-webdev',        'card-database': 'card-database',        'card-empowerment': 'card-empowerment',        'card-stats': 'card-genmath',        'card-introcomp': 'card-introcomp',        'card-animation': 'card-animation',        'card-system': 'card-sysarch'    };    function getStudentVisibleAdminAnnouncements() {        return getAdminAnnouncements()            .filter(post => ['all', 'students', 'specific'].includes(post?.audience || 'all'))            .map(post => ({                id: post.id || `admin-${post.createdAt || Date.now()}`,                kind: 'admin',                priority: post.type === 'urgent' ? 'Important' : 'Admin Update',                channelLabel: 'Admin Announcement',                title: post.title || 'School Announcement',                bodyHtml: formatAdminAnnouncementBody(post.body || ''),                bodyText: String(post.body || '').trim(),                author: post.author || 'Admin Office',                meta: getAdminAnnouncementAudienceLabel(post.audience),                stamp: formatAnnouncementTimestamp(post.createdAt),                sortValue: parseAnnouncementDateValue(post.createdAt),                type: post.type || 'regular'            }));    }    function getAdminAnnouncementAudienceLabel(audience) {        return {            all: 'All Roles',            students: 'Students',            teachers: 'Teachers',            specific: 'Specific Strand / Dept'        }[audience] || 'All Roles';    }    function getTeacherSectionAnnouncements() {        return Object.entries(classroomData)            .filter(([, data]) => data.section === currentStudentSection)            .flatMap(([classroomId, data]) => {                const posts = getSharedAnnouncements(data.sharedKey || classroomId, classroomAnnouncementById[classroomId] || []);                return posts.map((post, index) => ({                    id: buildAnnouncementId(data.sharedKey || classroomId, post, index),                    kind: 'teacher',                    priority: 'Section Update',                    channelLabel: 'Teacher Announcement',                    title: data.subject,                    bodyHtml: post.html || `<p>${escapeHtml(post.text || '')}</p>`,                    bodyText: stripHtmlTags(post.html || post.text || ''),                    author: post.author || data.teacher,                    meta: `${data.section} Ã¢â‚¬Â¢ ${data.subject}`,                    stamp: formatAnnouncementTimestamp(post.createdAt || post.timestamp),                    sortValue: parseAnnouncementDateValue(post.createdAt || post.timestamp),                    type: 'regular'                }));            });    }    function getStudentHomeAnnouncements(tab = activeHomeAnnouncementTab) {        const adminPosts = getStudentVisibleAdminAnnouncements();        const teacherPosts = getTeacherSectionAnnouncements();        if (tab === 'important') {            return [...adminPosts, ...teacherPosts]                .filter(p => p.type === 'urgent' || p.isImportant)                .sort((a, b) => b.sortValue - a.sortValue);        }        // overall / default        return [...adminPosts, ...teacherPosts].sort((a, b) => b.sortValue - a.sortValue);    }    function renderStudentHomeAnnouncements() {        const feed = document.getElementById('admin-announcements-feed');        if (!feed) return;        const adminPosts = JSON.parse(localStorage.getItem('sigma-admin-announcements-v1') || '[]');        let filtered = adminPosts;        if (activeHomeAnnouncementTab === 'important') {            filtered = adminPosts.filter(p => p.type === 'urgent' || p.isImportant);        } else if (activeHomeAnnouncementTab === 'posts') {            filtered = adminPosts.filter(p => !p.isAdmin);        }        if (!filtered.length) {            feed.innerHTML = `                <div class="py-20 flex flex-col items-center justify-center gap-4 bg-white border border-slate-100 rounded-[32px] opacity-40">                    <i class="fa-solid fa-bullhorn text-5xl text-black"></i>                    <p class="text-[10px] font-black uppercase tracking-widest text-black">No active announcements</p>                </div>            `;            return;        }        feed.innerHTML = filtered.map(post => {            const isTeacher = !post.isAdmin;            const roleLabel = isTeacher ? 'Teacher' : 'Administrator';            const roleClass = isTeacher ? 'text-emerald-600' : 'text-slate-500';            const fullBody = post.body || '';            const hasImage = post.imageUrl && post.imageUrl.trim() !== '';            const hasText = (post.title && post.title.trim() !== '') || (fullBody.trim() !== '');            // Layout logic            let cardHeight = "h-[260px]";            let isImageOnly = false;            let isImageWithText = false;            if (hasImage && hasText) {                cardHeight = "h-[520px]";                isImageWithText = true;            } else if (hasImage && !hasText) {                cardHeight = "h-[420px]";                isImageOnly = true;            }            const textLimit = isImageWithText ? 90 : 180;            const isLong = fullBody.length > textLimit;            const truncatedBody = isLong ? fullBody.substring(0, textLimit) + '...' : fullBody;            const formattedFull = escapeHtml(fullBody).replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');            const formattedTruncated = escapeHtml(truncatedBody).replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');            return `                <article id="${post.id}"                          data-original-height="${cardHeight}"                         class="announcement-card bg-white border border-slate-200 rounded-[22px] relative w-full ${cardHeight} overflow-hidden transition-all duration-500 group shadow-sm">                    <div class="p-6 pb-[60px] flex flex-col min-w-0">                        <div class="flex items-start justify-between mb-4">                            <div class="flex items-center gap-3">                                <div class="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">                                    <i class="fa-solid fa-user text-xs text-black"></i>                                </div>                                <div class="flex flex-col">                                    <span class="text-[12px] font-black text-slate-900 leading-none mb-1">${escapeHtml(post.author || 'Institutional Member')}</span>                                    <span class="text-[9px] font-bold ${roleClass}">${roleLabel}</span>                                </div>                            </div>                            <div class="flex flex-col items-end gap-1">                                <span class="text-[10px] font-medium text-slate-400 tracking-tight">${formatAnnouncementTimestamp(post.createdAt)}</span>                            </div>                        </div>                        ${hasText ? `                            <div class="space-y-1">                                <h3 class="text-[22px] font-bold text-slate-900 leading-tight ${isImageWithText ? 'line-clamp-2' : 'line-clamp-1'} text-left">${escapeHtml(post.title)}</h3>                                <div class="relative">                                    <p class="announcement-body text-[16px] text-black leading-relaxed font-normal text-left"                                        data-full="${formattedFull}"                                        data-truncated="${formattedTruncated}">                                        ${formattedTruncated}                                        ${isLong ? `<span onclick="toggleAnnouncement('${post.id}')" class="see-more-btn cursor-pointer font-bold text-slate-900 hover:underline ml-1">See more</span>` : ''}                                    </p>                                </div>                            </div>                        ` : ''}                    </div>                    ${hasImage ? `                        <div class="absolute bottom-[52px] left-0 right-0 h-[300px] overflow-hidden border-t border-slate-50 bg-black">                            <img src="${post.imageUrl}"                                  onclick="enlargeAnnouncementImage('${post.imageUrl}')"                                  class="w-full h-full object-contain cursor-pointer"                                  alt="Announcement Image">                        </div>                    ` : ''}                </article>            `;        }).join('');    }    window.toggleAnnouncement = function (id) {        const art = document.getElementById(id);        if (!art) return;        const p = art.querySelector('.announcement-body');        const btn = art.querySelector('.see-more-btn');        if (!p || !btn) return;        const isExpanded = art.classList.contains('h-auto');        if (!isExpanded) {            p.innerHTML = p.dataset.full + ` <span onclick="toggleAnnouncement('${id}')" class="see-more-btn cursor-pointer font-bold text-slate-900 hover:underline ml-1">See less</span>`;            art.classList.remove(art.dataset.originalHeight);            art.classList.add('h-auto');        } else {            p.innerHTML = p.dataset.truncated + ` <span onclick="toggleAnnouncement('${id}')" class="see-more-btn cursor-pointer font-bold text-slate-900 hover:underline ml-1">See more</span>`;            art.classList.remove('h-auto');            art.classList.add(art.dataset.originalHeight);        }    };    window.enlargeAnnouncementImage = function (url) {        let overlay = document.getElementById('announcement-image-lightbox');        if (!overlay) {            overlay = document.createElement('div');            overlay.id = 'announcement-image-lightbox';            overlay.className = 'fixed inset-0 bg-black/90 z-[9999] hidden flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-300';            overlay.onclick = () => overlay.classList.add('hidden');            overlay.innerHTML = `                <div class="relative w-screen h-screen flex items-center justify-center">                    <img src="" class="max-w-full max-h-full object-contain shadow-2xl animate-in zoom-in-95 duration-300" id="lightbox-img">                    <button class="absolute top-8 right-8 text-white hover:text-slate-300 transition-colors text-3xl">                        <i class="fa-solid fa-xmark"></i>                    </button>                </div>            `;            document.body.appendChild(overlay);        }        const img = overlay.querySelector('#lightbox-img');        img.src = url;        overlay.classList.remove('hidden');    };    // Announcement Tabs Event Listeners    ['all', 'important', 'posts'].forEach(tabId => {        const btn = document.getElementById(`announcement-tab-${tabId}`);        if (btn) {            btn.onclick = () => {                activeHomeAnnouncementTab = tabId;                ['all', 'important', 'posts'].forEach(t => {                    const b = document.getElementById(`announcement-tab-${t}`);                    if (b) {                        b.classList.remove('bg-[#15803d]', 'text-white', 'shadow-sm');                        b.classList.add('text-slate-900', 'hover:bg-slate-50');                    }                });                btn.classList.remove('text-slate-900', 'hover:bg-slate-50');                btn.classList.add('bg-[#15803d]', 'text-white', 'shadow-sm');                renderStudentHomeAnnouncements();            };        }    });    let activeStudentClassroomId = '';    let activeStudentRoomTab = 'room';    function getClassroomMaterialTopics(classroomId) {        const sourceId = classroomTopicSourceById[classroomId] || classroomId;        const data = getTopicData(sourceId);        return {            sourceId,            topics: data?.q1Topics || []        };    }    function renderStudentRoomPanel(classroomId, data, announcements) {        if (activeStudentRoomTab === 'attendance') {            const attendanceContext = {                name: currentStudentName,                sharedKey: data.sharedKey,                subject: data.subject,                time: `April 8, 2026 Ã¢â‚¬Â¢ ${data.schedule.split('Ã¢â‚¬Â¢')[1]?.trim() || ''}`.trim()            };            const snapshot = getStudentAttendanceSnapshot(attendanceContext);            const attendanceModeLabel = snapshot.mode === 'trust' ? 'Student self check-in' : 'Teacher roll call';            return `                <div class="student-room-panel student-room-attendance">                    <article class="student-room-attendance-card">                        <div class="student-room-attendance-card__head">                            <div>                                <p class="student-room-attendance-card__eyebrow">Attendance Status</p>                                <h3 class="student-room-attendance-card__title">${snapshot.label}</h3>                            </div>                            ${snapshot.mode === 'trust' && !snapshot.status                    ? `<div class="student-room-attendance-card__actions">                                        <button type="button" class="student-room-attendance-card__present-btn" data-student-present="${data.sharedKey}">Present</button>                                        <button type="button" class="student-room-attendance-card__absent-btn" data-student-absent-toggle="true">Absent</button>                                    </div>`                    : `<span class="student-room-attendance-card__badge ${snapshot.badgeClass}">${snapshot.label}</span>`}                        </div>                        <p class="student-room-attendance-card__meta">${snapshot.meta}</p>                        ${snapshot.mode === 'trust' && !snapshot.status ? `                            <div class="student-room-attendance-excuse hidden" data-student-absent-panel>                                <p class="student-room-attendance-excuse__label">Absent Submission</p>                                <textarea class="student-room-attendance-excuse__textarea" data-student-absent-comment placeholder="Write your excuse comment here..."></textarea>                                <div class="student-room-attendance-excuse__upload">                                    <input type="file" data-student-absent-files multiple accept=".jpg,.jpeg,.png,.pdf,.doc,.docx" class="student-room-attendance-excuse__file-input">                                    <p class="student-room-attendance-excuse__hint">Upload up to 10 files only. You can submit your attendance only once.</p>                                    <div class="student-room-attendance-excuse__file-list" data-student-absent-file-list></div>                                </div>                                <button type="button" class="student-room-attendance-excuse__submit" data-student-absent-submit="${data.sharedKey}">Send Absence</button>                            </div>                        ` : ''}                        <div class="student-room-attendance-card__grid">                            <div class="student-room-attendance-card__info">                                <span class="student-room-attendance-card__info-label">Room</span>                                <span class="student-room-attendance-card__info-value">${data.room}</span>                            </div>                            <div class="student-room-attendance-card__info">                                <span class="student-room-attendance-card__info-label">Schedule</span>                                <span class="student-room-attendance-card__info-value">${data.schedule}</span>                            </div>                            <div class="student-room-attendance-card__info">                                <span class="student-room-attendance-card__info-label">Mode</span>                                <span class="student-room-attendance-card__info-value">${attendanceModeLabel}</span>                            </div>                            <div class="student-room-attendance-card__info">                                <span class="student-room-attendance-card__info-label">Teacher</span>                                <span class="student-room-attendance-card__info-value">${data.teacher}</span>                            </div>                        </div>                    </article>                </div>            `;        }        if (activeStudentRoomTab === 'materials') {            const materialData = getClassroomMaterialTopics(classroomId);            const releasedTopics = materialData.topics                .map((topic, idx) => ({ topic, idx }))                .filter(({ topic }) => topic.status !== 'not-started' && topic.status !== 'locked');            const materialCards = releasedTopics.length                ? releasedTopics.map(({ topic, idx }) => {                    const released = true;                    const isLecture = idx % 2 === 1;                    const materialLabel = isLecture ? 'Lecture' : `Module ${idx + 1}`;                    const materialMeta = isLecture ? 'Video Ã¢â‚¬Â¢ 15:20 Ã¢â‚¬Â¢ Updated 1 week ago' : 'PDF Ã¢â‚¬Â¢ 2.4 MB Ã¢â‚¬Â¢ Updated 2 days ago';                    const iconWrapClass = isLecture                        ? 'student-room-material-card__icon-wrap student-room-material-card__icon-wrap--video'                        : 'student-room-material-card__icon-wrap student-room-material-card__icon-wrap--pdf';                    const iconClass = isLecture ? 'fa-solid fa-video' : 'fa-solid fa-file-pdf';                    return `                        <article class="student-room-material-card ${released ? 'student-room-material-card--released' : 'student-room-material-card--locked'}"                            ${released ? `data-topic-subject-id="${materialData.sourceId}" data-topic-index="${idx}"` : ''}>                            <div class="student-room-material-card__head">                                <div class="${iconWrapClass}">                                    <i class="${iconClass}"></i>                                </div>                                <span class="student-room-material-card__label">${materialLabel}</span>                            </div>                            <h3 class="student-room-material-card__title">${topic.title}</h3>                            <p class="student-room-material-card__meta">${materialMeta}</p>                            <div class="student-room-material-card__footer">                                <span class="student-room-material-card__status ${released ? 'student-room-material-card__status--released' : 'student-room-material-card__status--locked'}">${released ? 'Published' : 'Not released'}</span>                                <div class="student-room-material-card__actions">                                    <button type="button"                                        class="student-room-material-card__action"                                        onclick="event.stopPropagation()"                                        ${released ? `data-topic-subject-id="${materialData.sourceId}" data-topic-index="${idx}"` : 'disabled'}                                        aria-label="${released ? 'Open topic contents' : 'Material not released'}">                                        <i class="${isLecture ? 'fa-solid fa-play' : 'fa-solid fa-download'}"></i>                                    </button>                                    <button type="button"                                        class="student-room-material-card__action"                                        onclick="event.stopPropagation()"                                        ${released ? `data-topic-subject-id="${materialData.sourceId}" data-topic-index="${idx}"` : 'disabled'}                                        aria-label="Open more topic contents">                                        <i class="fa-solid fa-ellipsis-vertical"></i>                                    </button>                                </div>                            </div>                        </article>                    `;                }).join('')                : `                    <article class="student-room-feed-card student-room-feed-card--empty">                        <div class="student-room-feed-card__body">                            <p>No released materials yet.</p>                        </div>                    </article>                `;            return `<div class="student-room-panel student-room-materials"><div class="student-room-materials-grid">${materialCards}</div></div>`;        }        const commentsEnabled = getSharedCommentMode(data.sharedKey) === 'enabled';        const announcementFeed = announcements.length            ? announcements.map((post, index) => {                const postId = buildAnnouncementId(data.sharedKey, post, index);                const comments = commentsEnabled ? getSharedAnnouncementComments(data.sharedKey, postId) : [];                return `                <article class="bg-white border border-slate-200 rounded-[22px] relative w-full overflow-hidden transition-all duration-500 mb-3">                    <div class="p-6 flex flex-col min-w-0">                        <!-- Header: avatar + name + date -->                        <div class="flex items-start justify-between mb-3">                            <div class="flex items-center gap-3">                                <div class="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 flex-shrink-0">                                    <i class="fa-solid fa-user text-xs text-black"></i>                                </div>                                <div class="flex flex-col">                                    <span class="text-[13px] font-black text-slate-900 leading-none mb-0.5">${post.author || 'Teacher'}</span>                                    <span class="text-[10px] font-bold text-slate-400">Teacher</span>                                </div>                            </div>                            <span class="text-[10px] font-medium text-slate-400 tracking-tight mt-0.5">${post.timestamp || ''}</span>                        </div>                        <!-- Subject title + section subtitle -->                        <div class="mb-3 pl-[3.25rem]">                            <h3 class="text-[17px] font-black text-slate-900 leading-tight">${data.subject || ''}</h3>                            ${data.section ? `<p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">${data.section}</p>` : ''}                        </div>                        <!-- Post body -->                        <div class="pl-[3.25rem] text-[15px] text-slate-700 leading-relaxed">${post.html}</div>                        ${commentsEnabled ? `                            <div class="mt-6 pt-4 border-t border-slate-50 space-y-3 pl-[3.25rem]">                                <p class="text-[11px] font-black text-slate-400 uppercase tracking-widest">Comments (${comments.length})</p>                                <div class="space-y-3">                                    ${comments.length                                    ? comments.map(comment => `                                        <div class="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">                                            <div class="flex items-center justify-between mb-1">                                                <p class="text-[13px] font-black text-slate-900">${comment.author}</p>                                                <p class="text-[11px] font-medium text-slate-400">${comment.timestamp}</p>                                            </div>                                            <p class="text-[14px] text-slate-600 leading-normal">${comment.text}</p>                                        </div>                                    `).join('')                                    : `<p class="text-[13px] italic text-slate-400 opacity-60">No comments yet.</p>`}                                </div>                                <div class="flex items-center gap-2 mt-3">                                    <input type="text" class="flex-1 bg-slate-100 rounded-full px-4 py-2 text-[13px] outline-none placeholder:text-slate-400" data-comment-input="${postId}" placeholder="Write a comment...">                                    <button type="button" class="px-4 py-2 bg-icc text-white text-[12px] font-bold rounded-full hover:opacity-90 transition-all" data-student-comment-submit="${postId}">Post</button>                                </div>                            </div>                        ` : ''}                    </div>                </article>            `;            }).join('')            : `                <article class="bg-white border border-slate-200 rounded-[22px] p-8 text-center">                    <p class="text-[13px] italic text-slate-400 opacity-60">No room announcements yet.</p>                </article>            `;        return `            <div class="student-room-feed">                ${announcementFeed}            </div>        `;    }    function showClassroomDetail(classroomId, pushState = true) {        const data = classroomData[classroomId];        if (!data) return;        if (activeStudentClassroomId !== classroomId) {            activeStudentRoomTab = 'room';        }        const content = document.getElementById('classroom-detail-content');        if (!content) return;        const classmates = classroomPeopleBySection[data.section] || classroomPeopleBySection['ICT-11A'] || [];        const announcements = getSharedAnnouncements(data.sharedKey || classroomId, classroomAnnouncementById[classroomId] || []);        const showPeoplePanel = activeStudentRoomTab === 'room';        const subjectCoverConfig = getAdminSubjectCoverConfig(data.subject);        const showBannerImage = subjectCoverConfig?.coverVisibleToUsers !== false;        const bannerImage = subjectCoverConfig?.cover || 'image/Welcome.jpg';        activeStudentClassroomId = classroomId;        currentStudentAttendance = {            name: currentStudentName,            sharedKey: data.sharedKey || classroomId,            subject: data.subject,            time: `April 8, 2026 Ã¢â‚¬Â¢ ${data.schedule.split('Ã¢â‚¬Â¢')[1]?.trim() || ''}`.trim()        };        setNavContext('Sections');        content.innerHTML = `            <div class="student-room-shell">                <div class="student-room-hero">                    <div class="student-room-banner">                        ${showBannerImage ? `<img src="${bannerImage}" alt="${data.subject}" class="student-room-banner__image">` : ''}                        <div class="student-room-banner__overlay"></div>                        <div class="student-room-banner__content">                            <h2 class="student-room-banner__title">${data.subject}</h2>                        </div>                    </div>                </div>                <div class="student-room-tabs">                    <div class="student-room-tabs__inner">                        <div class="student-room-tabs__group">                            <button type="button" class="student-room-tab ${activeStudentRoomTab === 'room' ? 'student-room-tab--active' : ''}" data-room-tab="room">Room</button>                            <button type="button" class="student-room-tab ${activeStudentRoomTab === 'attendance' ? 'student-room-tab--active' : ''}" data-room-tab="attendance">Attendance</button>                            <button type="button" class="student-room-tab ${activeStudentRoomTab === 'materials' ? 'student-room-tab--active' : ''}" data-room-tab="materials">Materials</button>                        </div>                        <div class="student-room-tabs__actions">                            <button type="button" class="student-room-topics-btn" data-room-tab="materials" title="Topics">                                <i class="fa-solid fa-book"></i>                            </button>                        </div>                    </div>                </div>                <div class="student-room-layout">                    <div class="student-room-main ${showPeoplePanel ? '' : 'student-room-main--full'}">                        ${renderStudentRoomPanel(classroomId, data, announcements)}                    </div>                    ${showPeoplePanel ? `                    <aside id="classroom-mobile-people-panel" class="student-room-people hidden">                        <!-- Mobile Pull Down Handle -->                        <div class="md:hidden w-full flex justify-center pb-4 pt-2 cursor-pointer" onclick="window.toggleMobilePeoplePanel()">                            <div class="w-12 h-1.5 bg-gray-200 rounded-full"></div>                        </div>                        <div class="student-room-people__section">                            <p class="student-room-people__label">Teacher</p>                            <div class="student-room-people__list">                                <button type="button" class="student-room-person">${data.teacher}</button>                            </div>                        </div>                        <div class="student-room-people__divider"></div>                        <div class="student-room-people__section">                            <p class="student-room-people__label">Students</p>                            <div class="student-room-people__list">                                ${classmates.map(name => `<button type="button" class="student-room-person">${name}</button>`).join('')}                            </div>                        </div>                    </aside>                    ` : ''}                </div>            </div>        `;        content.querySelectorAll('[data-room-tab]').forEach(button => {            button.addEventListener('click', () => {                activeStudentRoomTab = button.dataset.roomTab;                showClassroomDetail(classroomId);            });        });        content.querySelectorAll('[data-topic-subject-id][data-topic-index]').forEach(target => {            target.addEventListener('click', () => {                const subjectId = target.dataset.topicSubjectId;                const topicIdx = Number(target.dataset.topicIndex);                openTopicContent(subjectId, topicIdx, 'videos');            });        });        content.querySelectorAll('[data-student-comment-submit]').forEach(button => {            button.addEventListener('click', () => {                const postId = button.dataset.studentCommentSubmit;                const input = content.querySelector(`[data-comment-input="${postId}"]`);                const text = input?.value.trim();                if (!postId || !text) return;                saveStudentAnnouncementComment(data.sharedKey, postId, text);                showClassroomDetail(classroomId);            });        });        content.querySelectorAll('[data-comment-input]').forEach(input => {            input.addEventListener('keydown', (event) => {                if (event.key === 'Enter') {                    event.preventDefault();                    const postId = input.dataset.commentInput;                    const button = content.querySelector(`[data-student-comment-submit="${postId}"]`);                    button?.click();                }            });        });        content.querySelectorAll('[data-student-present]').forEach(button => {            button.addEventListener('click', () => {                saveStudentSelfPresent(button.dataset.studentPresent);                updateStudentAttendanceStatus(currentStudentAttendance);                showClassroomDetail(classroomId);            });        });        content.querySelectorAll('[data-student-absent-toggle]').forEach(button => {            button.addEventListener('click', () => {                const panel = content.querySelector('[data-student-absent-panel]');                panel?.classList.toggle('hidden');            });        });        content.querySelectorAll('[data-student-absent-files]').forEach(input => {            input.addEventListener('change', () => {                const list = content.querySelector('[data-student-absent-file-list]');                const files = Array.from(input.files || []).slice(0, 10);                if (list) {                    list.innerHTML = files.length                        ? files.map(file => `<span class="student-room-attendance-excuse__file-chip">${file.name}</span>`).join('')                        : '';                }            });        });        content.querySelectorAll('[data-student-absent-submit]').forEach(button => {            button.addEventListener('click', () => {                const sharedKey = button.dataset.studentAbsentSubmit;                const commentInput = content.querySelector('[data-student-absent-comment]');                const filesInput = content.querySelector('[data-student-absent-files]');                const comment = commentInput?.value.trim() || '';                const files = Array.from(filesInput?.files || []).slice(0, 10).map(file => ({                    name: file.name,                    size: file.size,                    type: file.type || 'file'                }));                if (!sharedKey) return;                if (!comment && !files.length) return;                saveStudentAbsentExcuse(sharedKey, comment, files);                updateStudentAttendanceStatus(currentStudentAttendance);                showClassroomDetail(classroomId);            });        });        hideAllSections();        showSection('section-classroom-detail');        window.scrollTo({ top: 0 });        if (pushState && (!history.state || history.state.page !== `classroom:${classroomId}`)) {            history.pushState({ page: `classroom:${classroomId}` }, '', `#classroom-${classroomId}`);        }    }    window.showClassroomDetail = showClassroomDetail;    window.addEventListener('storage', () => {        renderStudentHomeAnnouncements();        updateStudentAttendanceStatus();        const detailSection = document.getElementById('section-classroom-detail');        if (activeStudentClassroomId && detailSection && !detailSection.classList.contains('hidden')) {            const currentScroll = window.scrollY;            showClassroomDetail(activeStudentClassroomId);            window.scrollTo({ top: currentScroll });        }    });    // â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”    window.addEventListener('resize', updateLayout);    const initialPage = resolvePageStateFromLocation(history.state);    if (!history.state?.page) {        history.replaceState(            { page: initialPage },            '',            `${window.location.pathname}${window.location.search}${window.location.hash}`        );    }    const featureNotifications = [        { icon: 'fa-solid fa-graduation-cap', title: 'Grade Update', message: 'Your final grade for Computer Programming 1 has been posted.', nav: 'nav-grades' },        { icon: 'fa-solid fa-calendar-check', title: 'Attendance Alert', message: 'You have been marked present for all classes today.', nav: 'nav-home' },        { icon: 'fa-solid fa-clipboard-list', title: 'New Quiz', message: 'Teacher Sarah Lim posted a new quiz in Web Development 1.', nav: 'nav-assignments' },        { icon: 'fa-solid fa-envelope', title: 'New Message', message: 'You have an unread message from Prof. Maria Clara.', nav: 'nav-home' }    ];    function buildScheduleNotifications() {        const notifList = document.getElementById('noti-dropdown');        const notifBadge = document.getElementById('noti-badge');        if (!notifList) return;        const container = notifList.querySelector('.overflow-y-auto > div');        if (!container) return;        let html = '';        featureNotifications.forEach(item => {            html += `                <div class="notif-item px-4 py-4 hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-100 rounded-xl mb-2 transition-all"                      data-nav="${item.nav}">                    <div class="flex gap-4 items-start">                        <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black text-sm shadow-sm border border-slate-200/60">                            <i class="${item.icon}"></i>                        </div>                        <div class="flex-1 min-w-0">                            <p class="text-[13px] font-bold text-gray-800 leading-tight font-['Inter']">${item.title}</p>                            <p class="text-[12px] text-gray-500 mt-1 font-['Inter']">${item.message}</p>                        </div>                    </div>                </div>`;        });        container.innerHTML = html;        container.querySelectorAll('.notif-item[data-nav]').forEach(item => {            item.addEventListener('click', () => {                switchTab(item.dataset.nav);                hideHeaderOverlays();            });        });        if (notifBadge) notifBadge.classList.toggle('hidden', featureNotifications.length === 0);    }    applyHistoryPage(initialPage);    initCalendarEvents();    // renderHomeReels removed as it's missing from both HTML and JS    renderStudentHomeAnnouncements();    initHomeSubjectRail();    updateStudentAttendanceStatus();    renderAssessmentsPage();    renderGradesPage();    renderClassroomsGrid();    buildScheduleNotifications();    setInterval(buildScheduleNotifications, 60000);    function renderClassroomsGrid() {        const grid = document.getElementById('classrooms-grid');        if (!grid) return;        const savedOrder = JSON.parse(localStorage.getItem('sigma-student-classroom-order') || '[]');        let enrolled = [...(subjectsData.enrolled || []), ...(subjectsData.completed || [])];        if (savedOrder.length > 0) {            enrolled.sort((a, b) => {                const idxA = savedOrder.indexOf(a.id);                const idxB = savedOrder.indexOf(b.id);                if (idxA !== -1 && idxB !== -1) return idxA - idxB;                if (idxA !== -1) return -1;                if (idxB !== -1) return 1;                return (a.text || '').localeCompare(b.text || '');            });        } else {            enrolled.sort((a, b) => (a.text || '').localeCompare(b.text || ''));        }        let html = '';        enrolled.forEach((subj, index) => {            let bgClass = 'bg-[#15803d]'; // Core            let textClass = 'text-white';            if (subj.subtitle.toLowerCase().includes('applied') || subj.subtitle.toLowerCase().includes('academic')) {                bgClass = 'bg-[#FFD000]';                textClass = 'text-white';            }            if (subj.subtitle.toLowerCase().includes('specialized') || subj.subtitle.toLowerCase().includes('ict')) {                bgClass = 'bg-[#78350f]';                textClass = 'text-white';            }            // Badges (Synchronized with teacher)            let badge = '';            if (index === 0) {                badge = `<span class="text-[10px] font-black tracking-widest uppercase" style="color: #dc2626 !important;">No Class</span>`;            } else if (index === 2 || subj.text.includes('Programming')) {                badge = `<span class="text-[10px] font-black tracking-widest uppercase" style="color: #16a34a !important;">Class Today</span>`;            } else if (index === 5) {                badge = `<span class="text-[10px] font-black tracking-widest uppercase" style="color: #ca8a04 !important;">Class Tomorrow</span>`;            }            html += `                <div class="classroom-card bg-white border border-gray-100 rounded-[24px] overflow-hidden shadow-sm transition-all group flex flex-col h-full" data-id="${subj.id}">                    <!-- Header / Banner -->                    <div class="h-28 ${bgClass} w-full flex items-center justify-center px-6 rounded-t-[24px] relative classroom-card-banner">                         <h3 class="${textClass} font-black tracking-widest text-[14px] text-center leading-tight drop-shadow-sm cursor-pointer hover:opacity-80 transition-opacity"                             onclick="showClassroomDetail('${subj.id}')">${subj.text}</h3>                    </div>                                        <!-- Overlapping Avatar -->                    <div class="relative px-6">                        <div class="absolute top-0 left-6 -translate-y-1/2 w-16 h-16 rounded-full bg-white p-1 shadow-sm mobile-hide-avatar">                            <div class="w-full h-full rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">                                <i class="fa-solid fa-user text-gray-400 text-xl"></i>                            </div>                        </div>                    </div>                    <div class="p-6 pt-10 flex flex-col flex-1 card-body-main">                        <div class="flex items-start justify-between mb-4">                            <div class="flex flex-col">                                <h4 class="text-[15px] font-black leading-tight" style="color: #000000 !important;">${subj.instructor}</h4>                            </div>                        </div>                        <div class="mt-auto flex flex-col gap-2.5 pt-4 border-t border-gray-50">                            <div class="flex items-center justify-between">                                <span class="text-[10px] font-black tracking-widest leading-none" style="color: #000000 !important;">ICT-11A</span>                                ${badge}                            </div>                            <span class="text-[10px] font-black tracking-widest leading-none mobile-hide-meta" style="color: #000000 !important;">Grade 11</span>                            <span class="text-[10px] font-black tracking-widest leading-none mobile-hide-meta" style="color: #000000 !important;">Room ${301 + index}</span>                            <span class="text-[10px] font-black tracking-widest leading-none mobile-hide-meta" style="color: #000000 !important;">08:00 AM - 09:30 AM</span>                        </div>                    </div>                </div>            `;        });        grid.innerHTML = html;        if (typeof initCardSortable === 'function') initCardSortable();    }    // --- Card Drag & Drop (SortableJS) ---    function initCardSortable() {        const grid = document.getElementById('classrooms-grid');        if (!grid) return;        const existing = Sortable.get(grid);        if (existing) existing.destroy();        new Sortable(grid, {            animation: 150,            ghostClass: 'sortable-ghost',            chosenClass: 'sortable-chosen',            dragClass: 'sortable-drag',            forceFallback: true,            fallbackClass: 'sortable-drag',            fallbackOnBody: true,            swapThreshold: 0.65,            invertSwap: true,            scroll: true,            bubbleScroll: true,            scrollSensitivity: 100, // Start scrolling when 100px from edge            scrollSpeed: 20, // Faster scroll speed            onStart: () => {                document.body.style.cursor = 'grabbing';            },            onEnd: () => {                document.body.style.cursor = '';                const order = Array.from(grid.querySelectorAll('.classroom-card')).map(card => card.dataset.id);                localStorage.setItem('sigma-student-classroom-order', JSON.stringify(order));            }        });    }    // --- SIGMA AI Panels Drag & Drop (SortableJS) ---    function initSigmaPanelsSortable() {        const container = document.getElementById('sigma-panels-container');        if (!container) return;        new Sortable(container, {            animation: 150,            delay: 200,            delayOnTouchOnly: true,            touchStartThreshold: 5,            ghostClass: 'sortable-ghost',            dragClass: 'sortable-drag',            forceFallback: true,            fallbackClass: 'sortable-drag',            fallbackOnBody: true,            swapThreshold: 0.65,            invertSwap: false,            scroll: true,            bubbleScroll: true,            handle: '[data-id]', // Only allow dragging by the panels themselves            onStart: () => {                document.body.style.cursor = 'grabbing';            },            onEnd: () => {                document.body.style.cursor = '';            }        });    }    initCardSortable();    initSigmaPanelsSortable();    // Subjects tab hover subsidebar disabled â€” no hover popup    function initSubjectsHoverSubsidebar() {        // Hover sub-sidebar removed per design requirement    }    initSubjectsHoverSubsidebar();    // ... (rest of the code remains the same)    // â”€â”€â”€ Global Search Functionality (Matched with Admin) â”€â”€â”€    const searchBar = document.getElementById('searchBar');    const searchBtn = document.getElementById('globalSearchBtn');    const triggerGlobalSearch = () => {        const query = (searchBar?.value || '').trim();        const visibleSection = Array.from(document.querySelectorAll('.dynamic-section:not(.hidden)'))[0];        if (!visibleSection) return;        const sectionId = visibleSection.id;        // Link to specific section searches (e.g., Home Subjects)        if (sectionId === 'section-home') {            const homeSearchInput = document.getElementById('home-subject-search-input');            if (homeSearchInput) {                homeSearchInput.value = query;                // Trigger the internal home search logic                if (typeof homeSubjectRailState !== 'undefined') {                    homeSubjectRailState.query = query;                    renderHomeSubjectRail();                }            }        }    };    if (searchBar) {        searchBar.addEventListener('keydown', (e) => {            if (e.key === 'Enter') {                e.preventDefault();                triggerGlobalSearch();            }        });    }    if (searchBtn) {        searchBtn.addEventListener('click', (e) => {            e.preventDefault();            triggerGlobalSearch();        });    }    // Mobile Search Toggle    document.querySelector('.header-search-shell')?.addEventListener('click', (e) => {        if (window.innerWidth < 1024) {            const header = document.getElementById('student-header');            if (!header?.classList.contains('mobile-search-active')) {                header?.classList.add('mobile-search-active');                searchBar?.focus();            }        }    });    // Mobile Search Back Button    document.getElementById('mobileSearchBackBtn')?.addEventListener('click', (e) => {        e.stopPropagation();        document.getElementById('student-header')?.classList.remove('mobile-search-active');        if (searchBar) searchBar.value = '';    });    // Close mobile search if clicking outside    document.addEventListener('mousedown', (e) => {        if (window.innerWidth < 1024) {            const header = document.getElementById('student-header');            const searchShell = document.querySelector('.header-search-shell');            if (header?.classList.contains('mobile-search-active') && !searchShell?.contains(e.target)) {                header?.classList.remove('mobile-search-active');            }        }    });    // Global function to locate current curriculum subject    window.locateCurriculumSubject = function () {        // Try to get the current subject from various sources        const activeElement = document.querySelector('.topic-content-nav-item.active');        if (activeElement && activeElement.dataset.subjectId) {            const subjectId = activeElement.dataset.subjectId;            // Check core subjects            const coreMatch = curriculumPrograms['core-subjects']?.subjects?.find(item => item.id === subjectId);            if (coreMatch) {                return { programKey: 'core-subjects', subjectId };            }            // Check applied subjects            const appliedMatch = curriculumPrograms['applied-subjects']?.subjects?.find(item => item.id === subjectId);            if (appliedMatch) {                return { programKey: 'applied-subjects', subjectId };            }            // Check specialized subjects            const specializedMatch = curriculumPrograms['specialized-subjects']?.subjects?.find(item => item.id === subjectId);            if (specializedMatch) {                return { programKey: 'specialized-subjects', subjectId };            }        }        return null;    };    buildScheduleNotifications();    initCardSortable();    initSigmaPanelsSortable();    setInterval(buildScheduleNotifications, 60000);    // Initial population    window.populateUserProfilePage();});document.addEventListener('DOMContentLoaded', () => {    const mobileAppBar = document.getElementById('mobile-bottom-appbar');    const profileBtn = document.getElementById('mobile-appbar-profile');    const calendarBtn = document.getElementById('mobile-appbar-calendar');    const sigmaBtn = document.getElementById('mobile-appbar-sigma');    const notiBtn = document.getElementById('mobile-appbar-notifications');    const sigmaSheet = document.getElementById('mobile-sigma-sheet');    const sigmaBackdrop = document.getElementById('mobile-sigma-sheet-backdrop');    const sigmaClose = document.getElementById('mobile-sigma-sheet-close');    const sigmaCards = document.getElementById('mobile-sigma-cards');    let mobileSigmaSortable = null;    if (!mobileAppBar || !sigmaSheet || !sigmaBackdrop || !sigmaCards) return;    const isMobile = () => window.innerWidth <= 1023;    const updateMobileAppBarActiveState = () => {        if (!isMobile()) return;        // Clear all        [profileBtn, calendarBtn, sigmaBtn, notiBtn].forEach(btn => btn?.classList.remove('active'));        // Priority 1: Sigma Sheet        if (sigmaSheet && sigmaSheet.classList.contains('open')) {            sigmaBtn?.classList.add('active');            return;        }        // Priority 2: Pull-up Panels        const openPanel = document.querySelector('.mobile-pull-up-panel.open');        if (openPanel) {            if (openPanel.id === 'mobile-calendar-panel') calendarBtn?.classList.add('active');            if (openPanel.id === 'mobile-noti-panel') notiBtn?.classList.add('active');            return;        }        // Priority 3: Current Visible Section (Profile)        const profileView = document.getElementById('user-profile-view');        if (profileView && window.getComputedStyle(profileView).display !== 'none' && !profileView.classList.contains('hidden')) {            profileBtn?.classList.add('active');        }    };    // Export to window so switchTab can call it    window.updateMobileAppBarActiveState = updateMobileAppBarActiveState;    const hydrateSigmaCards = () => {        sigmaCards.innerHTML = '';        const source = document.getElementById('sigma-panels-container');        if (!source) return;        const cards = Array.from(source.children || []);        cards.forEach((card, index) => {            const clone = card.cloneNode(true);            clone.classList.remove('cursor-grab', 'select-none');            clone.dataset.id = card.dataset.id || `sigma-card-${index}`;            clone.querySelectorAll('h4').forEach(title => {                const label = title.textContent.trim();                if (label && label === label.toUpperCase()) {                    title.textContent = label.charAt(0) + label.slice(1).toLowerCase();                }                title.style.fontFamily = 'Inter, sans-serif';                title.style.fontWeight = '700';                title.style.letterSpacing = '0';                title.style.textTransform = 'none';            });            sigmaCards.appendChild(clone);        });        initMobileSigmaSortable();    };    const initMobileSigmaSortable = () => {        if (mobileSigmaSortable) {            mobileSigmaSortable.destroy();            mobileSigmaSortable = null;        }        if (typeof Sortable === 'undefined') return;        mobileSigmaSortable = new Sortable(sigmaCards, {            animation: 150,            delay: 160,            delayOnTouchOnly: true,            touchStartThreshold: 6,            forceFallback: true,            fallbackClass: 'sortable-drag',            ghostClass: 'sortable-ghost',            dragClass: 'sortable-drag',            chosenClass: 'sortable-chosen',            scroll: true,            bubbleScroll: true,            dataIdAttr: 'data-id',            onEnd: () => {                const source = document.getElementById('sigma-panels-container');                if (!source || !mobileSigmaSortable) return;                const sourceCards = Array.from(source.children);                mobileSigmaSortable.toArray().forEach(id => {                    const card = sourceCards.find(item => item.dataset.id === id);                    if (card) source.appendChild(card);                });            }        });    };    const openSigmaSheet = () => {        if (!isMobile()) return;        window.__closeMobileSidebarForOverlay?.();        document.querySelectorAll('.mobile-pull-up-panel').forEach(p => p.classList.remove('open'));        document.getElementById('sigmaAiPanel')?.classList.remove('open');        document.getElementById('sigmaAiNotch')?.classList.remove('open');        window.__pushMobileOverlayHistory?.('sigma-sheet');        hydrateSigmaCards();        sigmaSheet.classList.add('open');        sigmaBackdrop.classList.add('open');        updateMobileAppBarActiveState();    };    const closeSigmaSheet = () => {        sigmaSheet.classList.remove('open');        sigmaBackdrop.classList.remove('open');    };    const closeAllMobileSurfaces = () => {        closeSigmaSheet();        document.querySelectorAll('.mobile-pull-up-panel').forEach(p => p.classList.remove('open'));        sigmaBackdrop.classList.remove('open');        updateMobileAppBarActiveState();    };    window.closeMobilePanel = (id) => {        document.getElementById(id)?.classList.remove('open');        if (!sigmaSheet.classList.contains('open') && !document.querySelector('.mobile-pull-up-panel.open')) {            document.getElementById('mobile-sigma-sheet-backdrop')?.classList.remove('open');        }        updateMobileAppBarActiveState();    };    const openMobilePanel = (id) => {        if (!isMobile()) return;        window.__closeMobileSidebarForOverlay?.();        // Close others first        document.querySelectorAll('.mobile-pull-up-panel').forEach(p => p.classList.remove('open'));        closeSigmaSheet();        document.getElementById('sigmaAiPanel')?.classList.remove('open');        document.getElementById('sigmaAiNotch')?.classList.remove('open');        window.__pushMobileOverlayHistory?.(id);        document.getElementById(id)?.classList.add('open');        document.getElementById('mobile-sigma-sheet-backdrop')?.classList.add('open');        updateMobileAppBarActiveState();    };    profileBtn?.addEventListener('click', () => {        closeAllMobileSurfaces();        if (typeof window.switchTab === 'function') {            window.switchTab('nav-profile');        } else {            document.getElementById('profileDropdownBtn')?.click();        }        updateMobileAppBarActiveState();    });    calendarBtn?.addEventListener('click', () => {        if (document.getElementById('mobile-calendar-panel')?.classList.contains('open')) {            window.closeMobilePanel('mobile-calendar-panel');        } else {            openMobilePanel('mobile-calendar-panel');        }        updateMobileAppBarActiveState();    });    notiBtn?.addEventListener('click', () => {        if (document.getElementById('mobile-noti-panel')?.classList.contains('open')) {            window.closeMobilePanel('mobile-noti-panel');        } else {            openMobilePanel('mobile-noti-panel');        }        updateMobileAppBarActiveState();    });    sigmaBtn?.addEventListener('click', () => {        if (sigmaSheet.classList.contains('open')) {            closeSigmaSheet();        } else {            openSigmaSheet();        }        updateMobileAppBarActiveState();    });    sigmaClose.addEventListener('click', () => {        closeSigmaSheet();        updateMobileAppBarActiveState();    });    sigmaBackdrop.addEventListener('click', () => {        closeAllMobileSurfaces();    });    const bindPullDownToClose = (panel, closeFn) => {        if (!panel) return;        let startY = 0;        let latestY = 0;        let dragging = false;        const canStartDrag = target => {            if (target.closest('button, a, input, select, textarea, [contenteditable="true"]')) return false;            return Boolean(target.closest('.mobile-pull-up-header, .mobile-sigma-sheet__head, .mobile-sigma-sheet__grab'));        };        panel.addEventListener('pointerdown', event => {            if (!isMobile() || !panel.classList.contains('open') || !canStartDrag(event.target)) return;            dragging = true;            startY = event.clientY;            latestY = startY;            panel.style.transition = 'none';            panel.setPointerCapture?.(event.pointerId);        });        panel.addEventListener('pointermove', event => {            if (!dragging) return;            latestY = event.clientY;            const deltaY = Math.max(0, latestY - startY);            panel.style.transform = `translateY(${deltaY}px)`;        });        const endDrag = () => {            if (!dragging) return;            const deltaY = Math.max(0, latestY - startY);            dragging = false;            panel.style.transition = '';            panel.style.transform = '';            if (deltaY > 90) closeFn();        };        panel.addEventListener('pointerup', endDrag);        panel.addEventListener('pointercancel', endDrag);    };    bindPullDownToClose(sigmaSheet, () => {        closeSigmaSheet();        updateMobileAppBarActiveState();    });    document.querySelectorAll('.mobile-pull-up-panel').forEach(panel => {        bindPullDownToClose(panel, () => window.closeMobilePanel(panel.id));    });    // Make header toggles also work for mobile    document.getElementById('noti-toggle')?.addEventListener('click', (e) => {        if (isMobile()) {            e.preventDefault();            e.stopPropagation();            openMobilePanel('mobile-noti-panel');        }    });    document.getElementById('calendar-toggle')?.addEventListener('click', (e) => {        if (isMobile()) {            e.preventDefault();            e.stopPropagation();            openMobilePanel('mobile-calendar-panel');        }    });    window.addEventListener('resize', () => {        if (!isMobile()) {            closeSigmaSheet();            document.querySelectorAll('.mobile-pull-up-panel').forEach(p => p.classList.remove('open'));            sigmaBackdrop.classList.remove('open');        }    });});document.addEventListener('DOMContentLoaded', () => {

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



    window.toggleSidebar = function () {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');

        if (window.innerWidth < 1024) {
            if (sidebar) {
                const isVisible = sidebar.classList.toggle('sidebar-visible');
                if (overlay) overlay.classList.toggle('hidden', !isVisible);
            }
        } else {
            document.body.classList.toggle('sidebar-collapsed');
        }
        if (typeof updateLayout === 'function') updateLayout();
    };

    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.toggleSidebar();
        });
    }

    // Close sidebar on link click (Mobile)
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 1024) {
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('sidebar-overlay');
                if (sidebar) sidebar.classList.remove('sidebar-visible');
                if (overlay) overlay.classList.add('hidden');
            }
        });
    });

    // Close sidebar when clicking overlay on mobile
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

        'nav-classrooms': 'section-classrooms',

        'nav-courses': 'section-courses',

        'nav-assignments': 'section-assignments',

        'nav-grades': 'section-grades',

        'nav-attendance': 'section-attendance',


        'nav-profile': 'user-profile-view',

        'nav-topic-detail': 'section-topic-detail',

        'nav-topic-content': 'section-topic-content'

    };



    const navIdByPage = {

        'home': 'nav-home', 'classrooms': 'nav-classrooms',

        'courses': 'nav-courses',

        'assignments': 'nav-assignments', 'grades': 'nav-grades',

        'attendance': 'nav-attendance',

        'profile': 'nav-profile'

    };



    // ─── User Profile Logic (Standardized with Admin) ──────────

    const USER_STORAGE_KEY = 'sigma-admin-users';

    const USER_AVATAR_STORAGE_KEY = 'sigma_user_avatar_base64'; // Fallback for old storage



    function getProfileTarget() {

        let authUser = {};

        try {

            authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');

        } catch (e) { console.error('Auth parse error', e); }



        let users = [];

        try {

            users = JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || '[]');

        } catch (e) { console.error('Users parse error', e); }



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

        } else {

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

            // Position panel to start below the nav bar
            const header = document.getElementById('student-header');
            const navBottom = header ? header.getBoundingClientRect().bottom : 0;
            panel.style.top = navBottom + 'px';
            panel.style.bottom = '0';
            panel.style.borderRadius = '1.5rem 1.5rem 0 0';

            // Double rAF: first frame paints panel in off-screen start position,
            // second frame triggers the CSS transition so it slides up cleanly
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
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
                        // Enough drag — close
                        window.toggleMobilePeoplePanel();
                    } else {
                        // Snap back to open position
                        panel.style.transform = 'translateY(0)';
                    }
                }, { passive: true });
            }
        } else {
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

                } else {

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

        } else {

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

                } else {

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

        } else {

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

                        } else {

                            userBios[index] = { title, description };

                        }

                    } else if (userBios.length < 5) {

                        if (title || description) {

                            userBios.push({ title, description });

                        }

                    }



                    saveProfileTarget({ ...target.data, bios: userBios });

                }

            }

            window.renderUserProfileTab('bio');

        } else {

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



            const descInput = document.getElementById('edit-user-bio-description');

            const counter = document.getElementById('user-bio-char-counter');

            if (descInput && counter) {

                descInput.oninput = () => {

                    counter.textContent = `${descInput.value.length}/200`;

                };

            }

        }

    };



    const hasSubSidebar = ['nav-mail'];



    const isMobile = window.innerWidth < 1024;



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

            } catch (e) {

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



    // ─── Layout ──────────────────────────────────────────────

    function updateLayout() {

        if (window.innerWidth < 1024) { layoutWrapper.style.marginLeft = '0'; return; }

        const isCollapsed = document.body.classList.contains('sidebar-collapsed');

        const isSubVisible = subSidebar.classList.contains('sub-sidebar-visible') && !subSidebar.classList.contains('subjects-hover-subsidebar');

        const mainWidth = isCollapsed ? 82 : 280;

        const subWidth = isSubVisible ? 240 : 0;

        layoutWrapper.style.marginLeft = (mainWidth + subWidth) + 'px';

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

        document.body.classList.toggle('curriculum-mode', enabled && window.innerWidth >= 1024);

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



    // ─── Nav Context Title ──────────────────────────

    function setNavContext(text) {

        const ctxText = document.getElementById('nav-context-text');

        if (!ctxText) return;

        if (text) {

            ctxText.textContent = text;

            ctxText.parentElement.classList.remove('hidden');

        } else {

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
    } catch (e) { }

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

        time: 'April 8, 2026 â€¢ 8:00 AM'

    };



    function loadSharedState(key, fallback) {

        try {

            const raw = localStorage.getItem(key);

            return raw ? JSON.parse(raw) : fallback;

        } catch {

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

        } catch { }

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

        } else if (status === 'A') {

            label = 'Absent';

            meta = excuse

                ? `Your absence and excuse were submitted for ${attendanceContext.subject}.`

                : `Teacher marked you absent for ${attendanceContext.subject}.`;

            badgeClass = 'bg-red-50 text-red-600';

        } else if (status === 'L') {

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



    function setGreenNavContext(trackText) {

        const gradeEl = document.getElementById('green-grade-label');

        const trackEl = document.getElementById('green-track-label');

        if (gradeEl) gradeEl.textContent = 'Grade 11';

        if (trackEl) trackEl.textContent = 'AY 2025-2026 â€¢ 2nd Term';

    }



    // ─── Tab Switching (internal ── no history push) ──────────

    function _applyTab(navId) {
        // Auto-close mobile sidebar
        if (window.innerWidth < 1024) {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (sidebar) sidebar.classList.remove('sidebar-visible');
            if (overlay) overlay.classList.add('hidden');
        }

        const targetSectionId = sectionMap[navId];

        if (!targetSectionId) return;



        // Subjects tab — content will be added later
        if (navId === 'nav-courses') {
            hideAllSections();
            showSection('section-courses');
            setNavContext('Subjects');
            _hideSubSidebarInstant();
            updateLayout();
            return;
        }



        // Reset context-specific state if moving to main landing pages

        const isSubjectsLanding = navId === 'nav-courses' && !currentCurriculumProgram;

        setSubjectsPanelsMode(isSubjectsLanding);

        setCurriculumMode(false);



        // Close other open side panels, but keep AI panel if user wants it persistent

        // closeAiPanel(); // Removed

        document.querySelectorAll('[id$="Menu"], [id$="Panel"]').forEach(m => m.classList.add('hidden'));

        document.querySelectorAll('.relative button').forEach(b => b.classList.remove('active'));



        const navCtx = document.getElementById('nav-subject-context');

        if (navCtx) { navCtx.classList.add('hidden'); navCtx.classList.remove('flex'); }



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

        } else if (navId === 'nav-grades') {

            renderGradesPage();

        } else if (navId === 'nav-attendance') {

            updateStudentAttendanceStatus();

        } else if (navId === 'nav-classrooms') {
            renderClassroomsGrid();
        } else if (navId === 'nav-profile') {

            window.populateUserProfilePage();

        }



        // Nav context title per tab

        const navContextMap = {

            'nav-home': 'Interface Computer College', 'nav-classrooms': 'Sections',

            'nav-assignments': 'Assessments', 'nav-grades': 'Grades',

            'nav-attendance': 'Attendance', 'nav-mail': 'Mail'

        };

        const ctx = navContextMap[navId] || '';

        setNavContext(ctx);

        const shouldShowSub = hasSubSidebar.includes(navId);



        if (shouldShowSub) {

            _showSubSidebarInstant();

            updateSubSidebar(navId);

        } else {

            _hideSubSidebarInstant();

        }



        updateLayout();

        if (window.innerWidth < 1024) sidebar.classList.remove('sidebar-visible');

        window.scrollTo({ top: 0 });

    }



    // ─── Sub-sidebar instant show/hide (NO slide animation) ───

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



    // ─── Public switchTab ── pushes history ──────────────────

    function switchTab(navId, pushState = true) {

        const pageKey = Object.entries(navIdByPage).find(([k, v]) => v === navId)?.[0] || 'home';

        if (pushState) history.pushState({ page: pageKey }, '', '#' + pageKey);

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
        let activeProgram = null;
        let activeGroup = null;
        let activeSubjectId = null;
        const collapsed = () => document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;
        const escapeText = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
        const programCategory = { 'core-subjects': 'core', 'applied-subjects': 'applied', 'specialized-subjects': 'specialized' };
        const getProgramSubjects = (programKey) => {
            try {
                const category = programCategory[programKey];
                return [...(subjectsData.enrolled || []), ...(subjectsData.completed || [])]
                    .filter(subject => getHomeSubjectCategory(subject) === category)
                    .map(subject => ({ id: subject.id, label: subject.text }));
            } catch (error) {
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
                link.classList.toggle('active', link.dataset.subjectGroup === activeProgram);
            });
        };
        const openSubjectTopic = (programKey, subjectId, label) => {
            activeProgram = programKey;
            activeGroup = programKey;
            activeSubjectId = subjectId;
            const targetId = resolveHomeSubjectTopicSourceId(subjectId, label);
            switchToTopicPage(targetId);
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
                                ${escapeText(subject.label)}
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
                    openSubjectTopic(btn.dataset.subjectProgram, btn.dataset.subjectId, btn.dataset.subjectLabel);
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
            if (!collapsed()) {
                hideOverlay();
                return;
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
            } else {
                switchTab('nav-courses');
            }
            if (!collapsed()) hideOverlay();
        };

        parent.addEventListener('click', event => {
            event.preventDefault();
            event.stopImmediatePropagation();
            if (collapsed()) {
                renderOverlay();
                return;
            }
            open = !open;
            if (open && !activeGroup) activeGroup = 'core-subjects';
            syncInline();
            switchTab('nav-courses');
        }, true);
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
            if (!collapsed()) hideOverlay();
            syncInline();
        };
        syncInline();
    }
    initSubjectParentSidebar();



    function resolvePageStateFromLocation(state) {

        if (state?.page) return state.page;

        const hash = window.location.hash || '';

        if (!hash) return 'home';

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

        return 'home';

    }



    function applyHistoryPage(page) {

        if (!page) {

            _applyTab('nav-home');

            return;

        }

        if (false) {

            // inline/cluster navigation removed with 3-panel subjects

        } else if (page.startsWith('curriculum:')) {

            openCurriculumProgram(page.replace('curriculum:', ''), false);

        } else if (page.startsWith('cluster:')) {

            const [, programKey, clusterKey] = page.split(':');

            openCurriculumCluster(programKey, clusterKey, false);

        } else if (page.startsWith('topic-content:')) {

            const [, subjectId, topicIdx, tab, videoIdx] = page.split(':');

            _showTopicContent(subjectId, parseInt(topicIdx), tab || 'videos', videoIdx !== undefined ? parseInt(videoIdx) : null);

        } else if (page.startsWith('classroom:')) {

            showClassroomDetail(page.replace('classroom:', ''), false);

        } else if (page.startsWith('topic:')) {

            _buildAndShowTopicPage(page.replace('topic:', ''));

        } else {

            _applyTab(navIdByPage[page] || 'nav-home');

        }

    }



    // ─── Browser back/forward ──────────────────────────────

    window.addEventListener('popstate', e => {

        const page = resolvePageStateFromLocation(e.state);

        applyHistoryPage(page);

    });



    // ─── Subjects Data (q1Percent + q2Percent for bar) ──────

    const subjectsData = {

        enrolled: [
            { id: 'card-prog1', text: 'Computer Programming 1', subtitle: 'Core Subject', instructor: 'Elena Reyes', icon: 'fa-solid fa-code', bg: 'image/book1.jpg', q1Percent: 84, q2Percent: 0, summary: 'Learn the fundamentals of programming using modern languages.' },
            { id: 'card-webdev', text: 'Web Development 1', subtitle: 'Applied Subject', instructor: 'Sarah Lim', icon: 'fa-solid fa-globe', bg: 'image/book4.jpg', q1Percent: 79, q2Percent: 0, summary: 'Build responsive websites using HTML, CSS, and JavaScript.' },
            { id: 'card-database', text: 'Database Management 1', subtitle: 'Specialized Subject', instructor: 'Elena Reyes', icon: 'fa-solid fa-database', bg: 'image/book2.jpg', q1Percent: 88, q2Percent: 0, summary: 'Master SQL and database design principles.' },
            { id: 'card-empowerment', text: 'Empowerment Technologies', subtitle: 'Core Subject', instructor: 'Roberto Diaz', icon: 'fa-solid fa-bolt', bg: 'image/book3.jpg', q1Percent: 73, q2Percent: 0, summary: 'Developing ICT skills for professional environments.' },
            { id: 'card-stats', text: 'Statistics & Probability', subtitle: 'Core Subject', instructor: 'Jennifer Santos', icon: 'fa-solid fa-chart-line', bg: 'image/book5.jpg', q1Percent: 69, q2Percent: 0, summary: 'Understanding data analysis and probability theory.' },
            { id: 'card-system', text: 'System Architecture', subtitle: 'Specialized Subject', instructor: 'Roberto Diaz', icon: 'fa-solid fa-sitemap', bg: 'image/book6.jpg', q1Percent: 76, q2Percent: 0, summary: 'Exploring how complex software systems are structured.' },
            { id: 'card-introcomp', text: 'Intro to Computing', subtitle: 'Applied Subject', instructor: 'Alex Reyes', icon: 'fa-solid fa-desktop', bg: 'image/book7.jpg', q1Percent: 82, q2Percent: 0, summary: 'The history and future of computer technology.' },
            { id: 'card-animation', text: 'Animation', subtitle: 'Specialized Subject', instructor: 'Tricia Villanueva', icon: 'fa-solid fa-film', bg: 'image/book8.jpg', q1Percent: 64, q2Percent: 0, summary: 'Introduction to 2D and 3D animation techniques.' }
        ],

        completed: [

            { id: 'card-oralcomm', text: 'Oral Communication', subtitle: 'Core Subject â€¢ Grade 11', instructor: 'Ana Reyes', grade: '1.50 Very Good', q1Percent: 100, q2Percent: 100, icon: 'fa-solid fa-comments', bg: 'image/book1.jpg' },

            { id: 'card-genmath', text: 'General Mathematics', subtitle: 'Core Subject â€¢ Grade 11', instructor: 'Jose Santos', grade: '1.75 Good', q1Percent: 100, q2Percent: 100, icon: 'fa-solid fa-infinity', bg: 'image/book2.jpg' }

        ]

    };



    const currentStudentCurriculumLabel = 'Curriculum';

    const homeSubjectRailState = {

        query: '',

        hideCompleted: false,

        filter: 'all'

    };



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

            return 'specialized-subjects';

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



    function getHomeSubjectDotClass(subject) {

        const category = getHomeSubjectCategory(subject);

        if (category === 'core') return 'home-subject-rail__dot home-subject-rail__dot--core';

        if (category === 'specialized-subjects' || category === 'specialized') return 'home-subject-rail__dot home-subject-rail__dot--immersion';

        return 'home-subject-rail__dot home-subject-rail__dot--applied';

    }



    function normalizeHomeSubjectName(value) {

        return String(value || '').trim().toLowerCase();

    }



    function sortSubjectsAlphabetically(list) {

        return [...list].sort((a, b) => a.text.localeCompare(b.text));

    }



    function filterHomeSubjects(list) {

        const query = normalizeHomeSubjectName(homeSubjectRailState.query);

        return list.filter(subject => {

            const category = getHomeSubjectCategory(subject);

            const matchesFilter = homeSubjectRailState.filter === 'all' || homeSubjectRailState.filter === category;

            if (!matchesFilter) return false;

            if (!query) return true;

            return normalizeHomeSubjectName(subject.text).includes(query);

        });

    }



    function renderHomeSubjectRail() {

        const enrolledList = document.getElementById('home-enrolled-subject-list');

        const completedList = document.getElementById('home-completed-subject-list');

        const completedBlock = document.getElementById('home-completed-subject-block');

        if (!enrolledList || !completedList || !completedBlock) return;



        const enrolledSubjects = filterHomeSubjects(sortSubjectsAlphabetically(subjectsData.enrolled));

        const completedSubjects = filterHomeSubjects(sortSubjectsAlphabetically(subjectsData.completed));



        enrolledList.innerHTML = enrolledSubjects.length

            ? enrolledSubjects.map(subject => `

                <button type="button" class="home-subject-rail__link" data-home-subject-open="${subject.id}">

                    <span class="${getHomeSubjectDotClass(subject)}" aria-hidden="true"></span>

                    <span class="home-subject-rail__link-text">${subject.text}</span>

                </button>

            `).join('')

            : '<p class="home-subject-rail__empty">No enrolled subjects found.</p>';



        if (homeSubjectRailState.hideCompleted) {

            completedBlock.classList.add('hidden');

        } else {

            completedBlock.classList.remove('hidden');

            completedList.innerHTML = completedSubjects.length

                ? completedSubjects.map(subject => `

                    <button type="button" class="home-subject-rail__link" data-home-subject-open="${subject.id}">

                        <span class="${getHomeSubjectDotClass(subject)}" aria-hidden="true"></span>

                        <span class="home-subject-rail__link-text">${subject.text}</span>

                    </button>

                `).join('')

                : '<p class="home-subject-rail__empty">No completed subjects found.</p>';

        }

    }



    function initHomeSubjectRail() {

        const rail = document.getElementById('home-subject-rail');

        const searchToggle = document.getElementById('home-subject-search-toggle');

        const searchBox = document.getElementById('home-subject-search-box');

        const searchInput = document.getElementById('home-subject-search-input');

        const settingsToggle = document.getElementById('home-subject-settings-toggle');

        const settingsMenu = document.getElementById('home-subject-settings-menu');

        const hideCompletedToggle = document.getElementById('home-subject-hide-completed-toggle');

        const filterOptions = document.querySelectorAll('input[name="home-subject-filter"]');

        if (!rail) return;



        searchToggle?.addEventListener('click', () => {

            searchBox?.classList.toggle('hidden');

            if (!searchBox?.classList.contains('hidden')) {

                searchInput?.focus();

            }

        });



        searchInput?.addEventListener('input', () => {

            homeSubjectRailState.query = searchInput.value || '';

            renderHomeSubjectRail();

        });



        settingsToggle?.addEventListener('click', (event) => {

            event.stopPropagation();

            settingsMenu?.classList.toggle('hidden');

        });



        settingsMenu?.addEventListener('click', event => event.stopPropagation());

        document.addEventListener('click', () => settingsMenu?.classList.add('hidden'));



        hideCompletedToggle?.addEventListener('change', () => {

            homeSubjectRailState.hideCompleted = !!hideCompletedToggle.checked;

            renderHomeSubjectRail();

        });



        filterOptions.forEach(option => {

            option.addEventListener('change', () => {

                homeSubjectRailState.filter = option.value || 'all';

                renderHomeSubjectRail();

            });

        });



        rail.addEventListener('click', (event) => {

            const subjectsTrigger = event.target.closest('[data-home-subjects-nav]');

            if (subjectsTrigger) {

                switchTab('nav-courses');

                return;

            }



            const trigger = event.target.closest('[data-home-subject-open]');

            if (!trigger) return;

            const subjectId = trigger.dataset.homeSubjectOpen;

            if (!subjectId) return;

            const subject = [...subjectsData.enrolled, ...subjectsData.completed].find(item => item.id === subjectId);

            switchToTopicPage(resolveHomeSubjectTopicSourceId(subjectId, subject?.text));

        });



        renderHomeSubjectRail();

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
            subtitle: 'Core Subject • Grade 11',
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
            ]
        },
        'core-life-and-career-skills': {
            text: 'Life and Career Skills',
            subtitle: 'Core Subject • Grade 11',
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
            ]
        },
        'core-general-mathematics': {
            text: 'General Mathematics',
            subtitle: 'Core Subject • Grade 11',
            instructor: 'DepEd Core Curriculum',
            icon: 'fa-solid fa-square-root-variable',
            bg: 'image/book2.jpg',
            q1Percent: 100,
            q2Percent: 100,
            summary: 'A core mathematics subject focused on functions, business math, interest, loans, and logic for real-life use.',
            q1Topics: [
                { title: 'Functions and Their Graphs', status: 'completed', grades: { quiz: 92, assignment: 90, activity: 91, performance: 89 } },
                { title: 'Rational Functions, Equations, and Inequalities', status: 'completed', grades: { quiz: 88, assignment: 86, activity: 89, performance: 87 } },
                { title: 'One-to-One and Inverse Functions', status: 'completed', grades: { quiz: 87, assignment: 85, activity: 88, performance: 86 } },
                { title: 'Exponential and Logarithmic Functions', status: 'completed', grades: { quiz: 84, assignment: 82, activity: 86, performance: 83 } },
                { title: 'Simple and Compound Interest', status: 'completed', grades: { quiz: 90, assignment: 88, activity: 91, performance: 89 } },
                { title: 'Stocks, Bonds, Loans, and Logic', status: 'in-progress', grades: { quiz: 0, assignment: 80, activity: 0, performance: 0 } }
            ]
        },
        'core-general-science': {
            text: 'General Science',
            subtitle: 'Core Subject • Grade 11',
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
            ]
        },
        'core-history-society': {
            text: 'Pag-aaral ng Kasaysayan at Lipunang Pilipino',
            subtitle: 'Core Subject • Grade 11',
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
            ]
        },
        'acad-biology-1': {
            text: 'Biology 1',
            subtitle: 'Academic Track • Grade 11',
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
            subtitle: 'Academic Track • Grade 11',
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
            subtitle: 'Academic Track • Grade 11',
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
            subtitle: 'Foundations • Grade 11',
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
            subtitle: 'Core Subject • Grade 11',
            instructor: 'Ana Reyes',
            icon: 'fa-solid fa-comments',
            bg: 'image/book1.jpg',
            q1Percent: 100,
            q2Percent: 100,
            summary: 'Developing effective speaking and listening skills for various contexts.',
            q1Topics: [
                { title: 'Public Speaking Basics', status: 'completed', grades: { quiz: 92, assignment: 94, activity: 93, performance: 95 } },
                { title: 'Interpersonal Communication', status: 'completed', grades: { quiz: 91, assignment: 93, activity: 92, performance: 94 } }
            ]
        },
        'card-genmath': {
            text: 'General Mathematics',
            subtitle: 'Core Subject • Grade 11',
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
            subtitle: 'ICT Strand • Grade 11',
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

    function getEquivalentGrade(score) {
        if (score >= 98) return '1.00';
        if (score >= 95) return '1.25';
        if (score >= 92) return '1.50';
        if (score >= 89) return '1.75';
        if (score >= 86) return '2.00';
        if (score >= 83) return '2.25';
        if (score >= 80) return '2.50';
        if (score >= 77) return '2.75';
        if (score >= 75) return '3.00';
        return '5.00';
    }

    function buildAssessmentRows() {
        const seen = new Set();
        const sources = [
            ...subjectsData.enrolled.map(subject => subject.id),
            ...subjectsData.completed.map(subject => subject.id),
            ...Object.keys(curriculumTopicCatalog),
            ...Object.keys(dynamicCurriculumSubjects)
        ];



        const baseDate = new Date('2026-03-26T08:00:00');

        const rows = [];



        sources.forEach(subjectId => {

            if (seen.has(subjectId)) return;

            seen.add(subjectId);



            const subject = getTopicSubject(subjectId);

            const data = getTopicData(subjectId);

            const subjectName = getSubjectDisplayName(subject);

            const topics = Array.isArray(data?.q1Topics) ? data.q1Topics : [];

            if (!subject || !subjectName || !topics.length) return;



            topics.forEach((topic, index) => {

                const startDate = new Date(baseDate);

                startDate.setDate(baseDate.getDate() - (index * 3 + (subjectName.length % 5) + 2));



                const dueDate = new Date(startDate);

                dueDate.setDate(startDate.getDate() + 7);



                const activityScore = topic.grades?.activity || 0;

                const submittedOn = topic.status === 'not-started' ? null : new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000);

                const gradedOn = activityScore > 0 ? new Date(startDate.getTime() + 4 * 24 * 60 * 60 * 1000) : null;



                let status = 'pending';

                if (topic.status === 'completed' || (submittedOn && !gradedOn) || (submittedOn && gradedOn)) status = 'completed';

                else if (dueDate < baseDate) status = 'overdue';



                rows.push({

                    subjectId,

                    topicIdx: index,

                    subject: subjectName,

                    activity: topic.title,

                    startDate,

                    dueDate,

                    submittedOn,

                    gradedOn,

                    score: activityScore,

                    equivalent: activityScore > 0 ? getEquivalentGrade(activityScore) : '-',

                    status

                });

            });

        });



        return rows.sort((a, b) => a.dueDate - b.dueDate);

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

                if (status === 'completed') return '<span class="px-2.5 py-1 bg-green-100 text-green-700 text-[9px] font-bold uppercase rounded-lg">Completed</span>';

                if (status === 'overdue') return '<span class="px-2.5 py-1 bg-red-100 text-red-600 text-[9px] font-bold uppercase rounded-lg">Overdue</span>';

                return '<span class="px-2.5 py-1 bg-amber-100 text-amber-700 text-[9px] font-bold uppercase rounded-lg">Pending</span>';

            };



            const renderAssessmentRow = row => `

            <tr class="hover:bg-gray-50/50 transition-colors" data-subject="${row.subject}">

                <td class="px-3 py-4 text-sm font-bold text-gray-800">

                    <button type="button" class="text-left text-icc hover:text-icc-dark hover:underline transition-colors" onclick="event.stopPropagation(); openTopicContent('${row.subjectId}', ${row.topicIdx}, 'activity')">${row.activity}</button>

                </td>

                <td class="px-3 py-4 text-sm text-gray-600 font-medium">

                    <button type="button" class="assessment-subject-link block w-full text-left text-icc font-bold hover:text-icc-dark hover:underline transition-colors cursor-pointer" data-subject-id="${row.subjectId}" onclick="event.preventDefault(); event.stopPropagation(); openAssessmentSubjectLink('${row.subjectId}')" title="Open ${row.subject}">

                        ${row.subject}

                    </button>

                </td>

                <td class="px-3 py-4 text-sm text-gray-500">${formatAssessmentDate(row.startDate)}</td>

                <td class="px-3 py-4 text-sm ${row.status === 'overdue' ? 'text-red-500 font-bold' : 'text-gray-500'}">${formatAssessmentDate(row.dueDate)}</td>

                <td class="px-3 py-4 text-sm text-gray-500">${row.submittedOn ? formatAssessmentDate(row.submittedOn) : '-'}</td>

                <td class="px-3 py-4 text-sm text-gray-500">${row.gradedOn ? formatAssessmentDate(row.gradedOn) : '-'}</td>

                <td class="px-3 py-4 text-sm font-bold ${row.score >= 90 ? 'text-green-600' : row.score >= 80 ? 'text-icc' : row.score >= 75 ? 'text-amber-600' : row.score > 0 ? 'text-red-500' : 'text-gray-400'}">${row.score > 0 ? `${row.score}%` : '-'}</td>

                <td class="px-3 py-4 text-sm font-bold text-gray-700">${row.equivalent && row.equivalent !== '-' ? row.equivalent : '-'}</td>

                <td class="px-3 py-4">${statusBadge(row.status)}</td>

            </tr>

        `;



            layout.innerHTML = `
            <div class="max-w-[1024px] mx-auto bg-white rounded-2xl flex flex-col gap-6 p-0 overflow-hidden">

                <div class="w-full border-b border-gray-100">

                    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col">

                        <div class="px-5 py-4 bg-white border-b border-gray-100 flex items-center gap-3">

                            <div class="w-10 h-10 rounded-xl bg-icc-yellow flex items-center justify-center flex-shrink-0">

                                <i class="fa-solid fa-bolt text-black text-base"></i>

                            </div>

                            <p class="text-sm font-black uppercase tracking-widest text-gray-900">SIGMA</p>

                        </div>

                        <div class="p-5 space-y-3 overflow-y-auto">

                            ${concernItems.map(item => `

                                <div class="flex items-start gap-3">

                                    <i class="fa-solid fa-angle-right text-icc mt-1 text-xs"></i>

                                    <p class="text-sm text-gray-700 leading-relaxed font-medium">${item}</p>

                                </div>

                            `).join('')}

                        </div>

                    </div>

                </div>

                <div class="flex-1 min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">

                    <div class="px-5 py-4 border-b border-gray-100 bg-gray-50/40">

                        <div class="flex items-end justify-between gap-4">

                            <div>

                                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assessment Overview</p>

                                <div class="flex flex-wrap gap-3 mt-3">

                                    <div class="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100">

                                        <i class="fa-solid fa-hourglass-half text-amber-500 text-sm"></i>

                                        <span class="text-[10px] font-black text-amber-700 uppercase tracking-widest">Pending</span>

                                        <span class="text-sm font-black text-gray-800">${pendingCount}</span>

                                    </div>

                                    <div class="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-100">

                                        <i class="fa-solid fa-check-double text-green-500 text-sm"></i>

                                        <span class="text-[10px] font-black text-green-700 uppercase tracking-widest">Completed</span>

                                        <span class="text-sm font-black text-gray-800">${completedCount}</span>

                                    </div>

                                    <div class="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-100">

                                        <i class="fa-solid fa-circle-exclamation text-red-500 text-sm"></i>

                                        <span class="text-[10px] font-black text-red-700 uppercase tracking-widest">Overdue</span>

                                        <span class="text-sm font-black text-gray-800">${overdueCount}</span>

                                    </div>

                                </div>

                            </div>

                            <select id="assessments-subject-filter" class="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 focus:outline-none focus:border-icc min-w-[220px]">

                                <option value="all">All Subjects</option>

                                ${subjects.map(subject => `<option value="${subject}">${subject}</option>`).join('')}

                            </select>

                        </div>

                    </div>

                    <div class="overflow-auto flex-1">

                        <table class="w-full text-left border-collapse">

                            <thead>

                                <tr class="bg-gray-50/60">

                                    <th class="px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Activity</th>

                                    <th class="px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subject</th>

                                    <th class="px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Start</th>

                                    <th class="px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Due</th>

                                    <th class="px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Submitted On</th>

                                    <th class="px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Graded On</th>

                                    <th class="px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Score %</th>

                                    <th class="px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Equivalent Grade</th>

                                    <th class="px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>

                                </tr>

                            </thead>

                            <tbody id="assessments-body" class="divide-y divide-gray-50"></tbody>

                        </table>

                    </div>

                    <div class="px-5 py-4 border-t border-gray-100 bg-white flex items-center justify-between gap-4 flex-wrap">

                        <p id="assessments-pagination-info" class="text-xs font-bold text-gray-500 uppercase tracking-widest">Showing 0 of 0</p>

                        <div class="flex items-center gap-2">

                            <button id="assessments-prev-page" type="button" class="px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-black text-gray-700 hover:bg-gray-50 transition-all">Previous</button>

                            <span id="assessments-page-indicator" class="text-xs font-black text-gray-500 uppercase tracking-widest">Page 1 of 1</span>

                            <button id="assessments-next-page" type="button" class="px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-black text-gray-700 hover:bg-gray-50 transition-all">Next</button>

                        </div>

                    </div>

                </div>

            </div>

            `;



            const body = layout.querySelector('#assessments-body');

            const filter = layout.querySelector('#assessments-subject-filter');

            const info = layout.querySelector('#assessments-pagination-info');

            const indicator = layout.querySelector('#assessments-page-indicator');

            const prevBtn = layout.querySelector('#assessments-prev-page');

            const nextBtn = layout.querySelector('#assessments-next-page');

            const pageSize = 8;

            let currentPage = 1;

            const tableScrollWrap = body?.closest('.overflow-auto');



            function getFilteredRows() {

                const selectedSubject = filter?.value || 'all';

                return selectedSubject === 'all'

                    ? rows

                    : rows.filter(row => row.subject === selectedSubject);

            }



            function bindAssessmentSubjectLinks() {

                layout.querySelectorAll('.assessment-subject-link').forEach(button => {

                    button.addEventListener('click', event => {

                        event.preventDefault();

                        event.stopPropagation();

                        scrollToSubjectCard(button.dataset.subjectId);

                    });

                });

            }



            function renderAssessmentPageRows() {

                const filteredRows = getFilteredRows();

                const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

                currentPage = Math.min(currentPage, totalPages);

                const startIndex = (currentPage - 1) * pageSize;

                const visibleRows = filteredRows.slice(startIndex, startIndex + pageSize);



                body.innerHTML = visibleRows.length

                    ? visibleRows.map(renderAssessmentRow).join('')

                    : '<tr><td colspan="9" class="px-5 py-10 text-center text-sm font-medium text-gray-400">No activities found for this filter.</td></tr>';



                info.textContent = filteredRows.length

                    ? `Showing ${startIndex + 1}-${Math.min(startIndex + pageSize, filteredRows.length)} of ${filteredRows.length}`

                    : 'Showing 0 of 0';

                indicator.textContent = `Page ${currentPage} of ${totalPages}`;

                prevBtn.disabled = currentPage === 1;

                nextBtn.disabled = currentPage === totalPages;

                prevBtn.classList.toggle('opacity-40', prevBtn.disabled);

                nextBtn.classList.toggle('opacity-40', nextBtn.disabled);

                if (tableScrollWrap) tableScrollWrap.scrollTo({ top: 0, behavior: 'auto' });

                bindAssessmentSubjectLinks();

            }



            filter?.addEventListener('change', () => {

                currentPage = 1;

                renderAssessmentPageRows();

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

        } catch (error) {

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

            const topicAverages = (data.q1Topics || [])

                .map(getTopicAveragePercent)

                .filter(value => value !== null);

            const completedTopics = (data.q1Topics || []).filter(topic => topic.status === 'completed').length;

            const totalTopics = (data.q1Topics || []).length || 1;

            const completion = clampPercent((completedTopics / totalTopics) * 100);

            const term1 = clampPercent(topicAverages.length

                ? topicAverages.reduce((sum, value) => sum + value, 0) / topicAverages.length

                : (data.q1Percent || subject.q1Percent || 0));

            const subjectNameRef = subject.text || subject.title || '';
            const term2Seed = (subjectNameRef.length % 7) - 3;

            const term2 = clampPercent((data.q2Percent && data.q2Percent > 0)

                ? data.q2Percent

                : term1 + term2Seed);

            const term3Seed = (subject.id.length % 5) - 2;

            const term3Base = typeof data.q3Percent === 'number' && data.q3Percent > 0 ? data.q3Percent : term2 + term3Seed;

            const term3 = clampPercent(term3Base);

            const overall = clampPercent((term1 + term2 + term3) / 3);

            const equivalent = getEquivalentGrade(overall);

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

                overall,

                equivalent,

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

            const quarters = ['term1', 'term2', 'term3', 'term4'];

            let bars = '';

            quarters.forEach(function (term, i) {

                const val = row[term] || 0;

                bars += '<div class="grade-bar-wrapper">'

                    + '<div class="grade-bar">'

                    + '<div class="grade-bar-fill ' + barColorClass(val) + '" style="height:' + val + '%"></div>'

                    + '</div>'

                    + '<span class="grade-bar-label">Q' + (i + 1) + '</span>'

                    + '</div>';

            });



            const remarkColor = row.overall >= 75 ? 'text-icc' : 'text-red-500';



            subjectCards += '<div class="grade-card group">'

                + '<div class="flex justify-between items-start">'

                + '<div class="min-w-0">'

                + '<h4 class="text-sm font-black text-gray-900 truncate group-hover:text-icc transition-colors">' + row.subject + '</h4>'

                + '<p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">' + row.teacher + '</p>'

                + '</div>'

                + '<span class="text-xl font-black ' + scoreColorClass(row.overall) + '">' + row.overall + '%</span>'

                + '</div>'

                + '<div class="grade-mini-chart">' + bars + '</div>'

                + '<div class="pt-2 border-t border-gray-50 flex items-center justify-between">'

                + '<span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Remark</span>'

                + '<span class="text-[10px] font-black uppercase tracking-widest ' + remarkColor + '">' + row.remark + '</span>'

                + '</div>'

                + '</div>';

        });



        return `

        <div class="grades-analytic-container space-y-8">

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

                <div class="lg:col-span-1 gwa-card rounded-[32px] p-8 flex flex-col justify-between shadow-lg">

                    <div>

                        <p class="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">General Weighted Average</p>

                        <h2 class="gwa-value mt-4">${gwa.toFixed(1)}%</h2>

                    </div>

                    <div class="mt-8">

                        <span class="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-xl text-xs font-black uppercase tracking-widest text-white border border-white/10">

                            <i class="fa-solid fa-award"></i> ${getEquivalentGrade(gwa)}

                        </span>

                    </div>

                </div>



                <div class="lg:col-span-2 bg-white rounded-[32px] border border-gray-100 p-6 shadow-sm flex flex-col justify-center gap-4">

                    <div class="flex items-center gap-2">

                        <div class="w-8 h-8 bg-icc-yellow rounded-lg flex items-center justify-center shadow-md flex-shrink-0">

                            <i class="fa-solid fa-bolt text-black text-sm"></i>

                        </div>

                        <span class="text-xs font-black uppercase tracking-[0.25em] text-gray-900">SIGMA</span>

                    </div>

                    <div class="bg-gray-50 rounded-2xl rounded-tl-sm px-5 py-4 border border-gray-100">

                        <p class="text-sm text-gray-700 font-medium leading-relaxed">

                            Hi <span class="font-black text-gray-900">User</span>! You're currently enrolled in <span class="text-icc font-black">${rows.length} subjects</span>.

                            Your strongest subject this quarter is <span class="text-icc font-black">${sorted[0] ? sorted[0].subject : 'â€”'}</span> great work!

                            Keep pushing across all four quarters and you're on track for an excellent GWA.

                        </p>

                    </div>

                </div>

            </div>



            <div>

                <div class="flex items-center justify-between mb-6 px-2">

                    <h3 class="text-lg font-black text-gray-900 uppercase tracking-widest">Subject Breakdown</h3>

                    <div class="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">

                        <span class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-icc"></div> Q1â€“Q4 Trend</span>

                    </div>

                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

                    ${subjectCards}

                </div>

            </div>

        </div>

        `;

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



            layout.innerHTML = `

            <div class="space-y-6">

                <!-- Analytics Panel -->

                ${renderGradesAnalytics(rows)}



                <div class="bg-white rounded-[28px] border border-gray-100 shadow-sm overflow-hidden">

                    <div class="overflow-x-auto">

                        <table class="w-full text-left border-collapse">

                            <thead>

                                <tr class="bg-gray-50/60">

                                    <th class="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject</th>

                                    <th class="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Teacher</th>

                                    <th class="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center ${currentGradesView === 'term1' ? 'text-icc' : ''}">1st Quarter</th>

                                    <th class="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center ${currentGradesView === 'term2' ? 'text-icc' : ''}">2nd Quarter</th>

                                    <th class="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center ${currentGradesView === 'term3' ? 'text-icc' : ''}">3rd Quarter</th>

                                    <th class="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center ${currentGradesView === 'term4' ? 'text-icc' : ''}">4th Quarter</th>

                                    <th class="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center ${currentGradesView === 'overall' ? 'text-icc' : ''}">Overall</th>

                                    <th class="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Equivalent</th>

                                    <th class="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Completion</th>

                                    <th class="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Remark</th>

                                </tr>

                            </thead>

                            <tbody class="divide-y divide-gray-50">

                                ${rows.map(row => `

                                    <tr class="hover:bg-gray-50/60 transition-colors">

                                        <td class="px-6 py-5">

                                            <button type="button" class="grade-subject-link text-left" data-subject-id="${row.id}">

                                                <span class="block text-base font-black text-icc hover:text-icc-dark hover:underline transition-colors">${row.subject}</span>

                                                <span class="block text-xs text-gray-500 mt-1">${row.track}</span>

                                            </button>

                                        </td>

                                        <td class="px-6 py-5">

                                            <span class="text-sm font-semibold text-gray-700">${row.teacher}</span>

                                        </td>

                                        <td class="px-6 py-5 text-center">

                                            <span class="text-base font-black ${scoreColorClass(row.term1)}">${row.term1}%</span>

                                        </td>

                                        <td class="px-6 py-5 text-center">

                                            <span class="text-base font-black ${scoreColorClass(row.term2)}">${row.term2}%</span>

                                        </td>

                                        <td class="px-6 py-5 text-center">

                                            <span class="text-base font-black ${scoreColorClass(row.term3)}">${row.term3}%</span>

                                        </td>

                                        <td class="px-6 py-5 text-center">

                                            <span class="text-base font-black text-gray-300">â€”</span>

                                        </td>

                                        <td class="px-6 py-5 text-center">

                                            <span class="text-lg font-black ${scoreColorClass(row.overall)}">${row.overall}%</span>

                                        </td>

                                        <td class="px-6 py-5 text-center">

                                            <span class="text-sm font-black text-gray-800">${row.equivalent}</span>

                                        </td>

                                        <td class="px-6 py-5 text-center">

                                            <div class="mx-auto max-w-[92px]">

                                                <span class="text-sm font-black ${scoreColorClass(row.completion)}">${row.completion}%</span>

                                                <div class="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">

                                                    <div class="h-full rounded-full bg-[linear-gradient(90deg,#ef4444_0%,#f59e0b_55%,#22c55e_100%)]" style="width:${row.completion}%"></div>

                                                </div>

                                            </div>

                                        </td>

                                        <td class="px-6 py-5 text-center">

                                            <span class="inline-flex px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest ${remarkBadge(row.remark)}">${row.remark}</span>

                                        </td>

                                    </tr>

                                `).join('')}

                            </tbody>

                        </table>

                    </div>

                </div>

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



            // â”€â”€ Carousel init â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

                        } else {

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

        } catch (error) {

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



    // â”€â”€â”€ Calendar Logic (Admin Copy) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
        { title: 'Quiz 3 • Effective Communication', when: 'Due Today • 11:59 PM', status: 'Due' },
        { title: 'Lab 2 • Intro to Computing', when: 'May 5 • 10:00 AM', status: 'Upcoming' },
        { title: 'Assignment 1 • General Math', when: 'May 6 • 3:00 PM', status: 'Upcoming' }
    ];

    function timeToMinutes(value) {
        if (!value) return 0;
        const [hour, minute] = value.split(':').map(Number);
        return (hour * 60) + minute;
    }

    function getUpcomingClasses(limit = 2) {
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
            dynamicCurriculumSubjects[subjectId] = {
                id: subjectId,
                text: title,
                subtitle: `${clusterTitle} • Grade 11`,
                instructor: 'Cluster Faculty',
                icon: 'fa-solid fa-book-open',
                bg: 'image/book1.jpg',
                q1Percent: 0,
                q2Percent: 0,
                summary: `${title} is part of the ${clusterTitle} cluster and introduces the essential ideas, skills, and outputs learners will study in this learning path.`,
                q1Topics: [
                    { title: `Introduction to ${title}`, status: 'completed' },
                    { title: `Core Concepts in ${title}`, status: 'in-progress' },
                    { title: `Applied Practice in ${title}`, status: 'not-started' },
                    { title: `Assessment and Reflection for ${title}`, status: 'not-started' }
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
        } else {
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
                meta: `${item.track} • ${item.subjectCount} Subjects`
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
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function scrollToSubjectCard(subjectId) {
        switchTab('nav-home');
        setTimeout(() => {
            const card = document.querySelector(`.home-subject-rail-item[data-subject-id="${subjectId}"]`);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                card.classList.add('ring-4', 'ring-icc-yellow', 'ring-offset-2');
                setTimeout(() => card.classList.remove('ring-4', 'ring-icc-yellow', 'ring-offset-2'), 2000);
            }
        }, 300);
    }

    function renderCalendarDropdownSummary() {
        const classesWrap = document.getElementById('calendarDropdownUpcomingClassList');
        const assessmentsWrap = document.getElementById('calendarDropdownAssessmentList');
        if (!classesWrap || !assessmentsWrap) return;

        const upcomingClasses = getUpcomingClasses(2);
        classesWrap.innerHTML = upcomingClasses.length
            ? upcomingClasses.map((item, index) => `
                <div class="rounded-xl border border-gray-100 bg-gray-50/40 p-3">
                    <p class="text-[9px] font-black uppercase tracking-widest ${index === 0 ? 'text-icc' : 'text-gray-400'}">${index === 0 ? 'Next Class' : 'Upcoming Class'}</p>
                    <p class="text-sm font-bold text-gray-800 mt-1">${item.subject}</p>
                    <p class="text-[11px] text-gray-500 mt-0.5">${item.room}</p>
                    <p class="text-[11px] font-bold text-gray-600 mt-1">${item.time} - ${item.endTime}</p>
                </div>
            `).join('')
            : `
                <div class="py-5 text-center border border-dashed border-gray-100 rounded-xl">
                    <p class="text-[10px] font-black text-gray-300 uppercase tracking-widest">No classes scheduled</p>
                </div>
            `;

        assessmentsWrap.innerHTML = upcomingAssessmentItems.map(item => `
            <div class="rounded-xl border border-gray-100 bg-white p-3">
                <div class="flex items-center justify-between gap-2">
                    <p class="text-sm font-bold text-gray-800 leading-tight">${item.title}</p>
                    <span class="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${item.status === 'Due' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}">${item.status}</span>
                </div>
                <p class="text-[11px] text-gray-500 mt-1">${item.when}</p>
            </div>
        `).join('');
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







    // â”€â”€â”€ SIGMA AI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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



    function updateNotchPosition() {
        if (!sigmaAiNotch || !sigmaAiPanel) return;
        const isMobile = window.innerWidth < 1024;
        const isOpen = sigmaAiPanel.classList.contains('open');

        if (isMobile) {
            sigmaAiNotch.style.right = '0';
        } else {
            if (isOpen) {
                sigmaAiNotch.style.right = '400px';
            } else {
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

            addAiMessage('Wireframe mode â€” Gemini AI coming next semester.', false);

            setSigmaAiWaiting(false);

        }, 600);

    }



    if (sigmaAiSendBtn) sigmaAiSendBtn.addEventListener('click', sendAiMessage);

    if (sigmaAiCloseBtn) sigmaAiCloseBtn.addEventListener('click', closeAiPanel);

    if (sigmaAiInput) sigmaAiInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendAiMessage(); });



    const isFirstVisit = sessionStorage.getItem('sigmaFirstVisit') !== 'true';

    const panelWasOpen = sessionStorage.getItem('sigmaPanelOpen') === 'true';



    if (isFirstVisit) {

        sessionStorage.setItem('sigmaFirstVisit', 'true');

        setTimeout(() => {

            addAiMessage(WELCOME_MSG, false);

        }, 900);

    } else {

        addAiMessage(WELCOME_MSG, false);

    }



    // Ensure all header overlays are hidden on load

    hideHeaderOverlays(null, null, false);



    // if (panelWasOpen) openAiPanel();





    // â”€â”€â”€ Sub-Sidebar (Subjects list) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

        // Hide header on subjects list â€” no redundancy

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
            topicBtn.className = 'sub-sidebar-link w-full text-left px-4 py-2.5 text-[12px] font-bold text-gray-700 hover:bg-gray-100 rounded-lg transition-all flex items-center gap-3';
            topicBtn.innerHTML = `
                <i class="fas fa-book-open text-gray-400"></i>
                <span>${topic.title}</span>
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

        } else if (program.subjects) {

            shell.querySelectorAll('.curriculum-core-card[data-subject-id]').forEach(card => {

                card.addEventListener('click', () => switchToTopicPage(card.dataset.subjectId));

            });

        } else {

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



    // â”€â”€â”€ Sub-sidebar topic mode (no animation â€” instant swap) â”€â”€

    function loadTopicSubSidebar(subject, data, statusIconClass) {

        const content = document.getElementById('sub-sidebar-content');

        const title = document.getElementById('sub-sidebar-title');

        const header = document.getElementById('sub-sidebar-header');

        if (!content || !title) return;

        if (header) header.classList.remove('hidden');



        const q1Done = data.q1Topics.filter(t => t.status === 'completed').length;

        const q1Total = data.q1Topics.length;



        title.innerHTML = `<span class="truncate">${subject.text}</span>`;



        content.innerHTML = `

            <div class="px-4 pt-4 pb-2">

                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Topics</p>

                <p class="text-sm font-bold text-gray-700">${q1Done}/${q1Total} completed</p>

            </div>

            <div class="px-2 space-y-0.5 pb-4">

                ${data.q1Topics.map((t, i) => `

                    <button class="topic-nav-item w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-icc flex items-center gap-2.5 transition-colors min-w-0" data-topic-idx="${i}">

                        <i class="fa-solid ${statusIconClass[t.status]} text-xs flex-shrink-0"></i>

                        <span class="truncate">${t.title}</span>

                    </button>

                `).join('')}

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



    // â”€â”€â”€ Subject Details â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const subjectDetails = {

        'card-prog1': { bg: 'image/book1.jpg', q1Percent: 80, q2Percent: 0, q1Topics: [{ title: 'Introduction to Java', status: 'completed', grades: { quiz: 92, assignment: 88, activity: 95, performance: 90 } }, { title: 'Variables & Data Types', status: 'completed', grades: { quiz: 85, assignment: 90, activity: 88, performance: 87 } }, { title: 'Control Structures', status: 'completed', grades: { quiz: 78, assignment: 82, activity: 80, performance: 84 } }, { title: 'Methods & Functions', status: 'in-progress', grades: { quiz: 0, assignment: 75, activity: 0, performance: 0 } }, { title: 'Arrays & Collections', status: 'not-started', grades: null }, { title: 'Object-Oriented Programming', status: 'not-started', grades: null }] },

        'card-webdev': { bg: 'image/book2.jpg', q1Percent: 67, q2Percent: 0, q1Topics: [{ title: 'HTML5 Fundamentals', status: 'completed', grades: { quiz: 95, assignment: 92, activity: 90, performance: 93 } }, { title: 'CSS3 & Flexbox', status: 'completed', grades: { quiz: 88, assignment: 85, activity: 90, performance: 87 } }, { title: 'CSS Grid Layout', status: 'completed', grades: { quiz: 82, assignment: 80, activity: 85, performance: 83 } }, { title: 'Responsive Design', status: 'completed', grades: { quiz: 90, assignment: 88, activity: 92, performance: 91 } }, { title: 'JavaScript Basics', status: 'in-progress', grades: { quiz: 0, assignment: 78, activity: 0, performance: 0 } }, { title: 'DOM Manipulation', status: 'not-started', grades: null }] },

        'card-sysarch': { bg: 'image/book3.jpg', q1Percent: 50, q2Percent: 0, q1Topics: [{ title: 'Number Systems & Binary', status: 'completed', grades: { quiz: 88, assignment: 85, activity: 90, performance: 87 } }, { title: 'CPU Architecture', status: 'completed', grades: { quiz: 82, assignment: 80, activity: 78, performance: 83 } }, { title: 'Memory Hierarchy', status: 'in-progress', grades: { quiz: 0, assignment: 70, activity: 0, performance: 0 } }, { title: 'Input/Output Systems', status: 'not-started', grades: null }, { title: 'Instruction Set Architecture', status: 'not-started', grades: null }] },

        'card-empowerment': { bg: 'image/book4.jpg', q1Percent: 20, q2Percent: 0, q1Topics: [{ title: 'Digital Literacy Overview', status: 'completed', grades: { quiz: 90, assignment: 88, activity: 92, performance: 89 } }, { title: 'Online Safety & Privacy', status: 'in-progress', grades: { quiz: 0, assignment: 75, activity: 0, performance: 0 } }, { title: 'Social Media Responsibility', status: 'not-started', grades: null }, { title: 'Digital Citizenship', status: 'not-started', grades: null }] },

        'card-networks': { bg: 'image/book5.jpg', q1Percent: 40, q2Percent: 0, q1Topics: [{ title: 'Network Fundamentals', status: 'completed', grades: { quiz: 85, assignment: 82, activity: 88, performance: 84 } }, { title: 'OSI Model', status: 'in-progress', grades: { quiz: 0, assignment: 72, activity: 0, performance: 0 } }, { title: 'IP Addressing & Subnetting', status: 'not-started', grades: null }, { title: 'Network Topologies', status: 'not-started', grades: null }] },

        'card-database': { bg: 'image/book6.jpg', q1Percent: 60, q2Percent: 0, q1Topics: [{ title: 'Database Concepts', status: 'completed', grades: { quiz: 92, assignment: 90, activity: 88, performance: 91 } }, { title: 'Entity-Relationship Diagrams', status: 'completed', grades: { quiz: 88, assignment: 85, activity: 90, performance: 87 } }, { title: 'SQL: DDL & DML', status: 'completed', grades: { quiz: 85, assignment: 82, activity: 86, performance: 84 } }, { title: 'Normalization', status: 'in-progress', grades: { quiz: 0, assignment: 78, activity: 0, performance: 0 } }, { title: 'Joins & Subqueries', status: 'not-started', grades: null }] },

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



    // â”€â”€â”€ Topic Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    function switchToTopicPage(subjectId) {

        const data = getTopicData(subjectId);

        const subject = getTopicSubject(subjectId);

        if (!data || !subject) return;

        navLinks.forEach(link => link.classList.remove('active'));
        document.getElementById('nav-courses')?.classList.add('active');
        setNavContext('Subjects');

        history.pushState({ page: `topic:${subjectId}` }, '', `#topic-${subjectId}`);

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



        buildTopicPage(subjectId, subject, data, statusIconClass);

        setSubjectsPanelsMode(false);

        setCurriculumMode(false);

        hideAllSections();

        showSection('section-topic-detail');



        navLinks.forEach(l => l.classList.remove('bg-white/20'));

        setNavContext('Subjects');



        _showSubSidebarInstant();

        subSidebar.classList.add('sub-sidebar-visible');



        // Show other subjects from the same category instead of topics

        const targetLocation = locateCurriculumSubject();

        if (targetLocation) {

            // renderSubjectsListSidebar removed

        }



        updateLayout();

        window.scrollTo({ top: 0, behavior: 'smooth' });

    }



    function buildTopicPage(subjectId, subject, data, statusIconClass) {

        const page = document.getElementById('section-topic-detail');

        if (!page) return;



        const q1Done = data.q1Topics.filter(t => t.status === 'completed').length;

        const q1Total = data.q1Topics.length;

        const quarter1Pct = data.q1Percent ?? 0;

        const quarter2Pct = data.q2Percent ?? 0;

        const overallPct = Math.round((quarter1Pct + quarter2Pct) / 2);



        const statusLabel = { completed: 'Done', 'in-progress': 'In Progress', 'not-started': 'Not Started', locked: 'Locked' };

        const statusBadgeClass = { completed: 'bg-green-50 text-green-600', 'in-progress': 'bg-yellow-50 text-yellow-700', locked: 'bg-gray-100 text-gray-400', 'not-started': 'bg-red-50 text-red-500' };

        const getTopicImg = i => i === 1 ? 'image/Topic2.jpg' : 'image/Topic.jpg';

        const quarter1BarColor = quarter1Pct === 100 ? 'bg-icc' : 'bg-icc-yellow';

        const quarter2BarColor = quarter2Pct === 100 ? 'bg-icc' : 'bg-gray-300';

        const subjectCluster = currentCurriculumCluster ? (curriculumPrograms[currentCurriculumProgram]?.clusters || curriculumPrograms[currentCurriculumProgram]?.stages || []).find(c => c.key === currentCurriculumCluster) : null;



        const renderTopicCard = (t, i) => `

            <div class="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden flex transition-all group/tc cursor-pointer hover:border-icc-yellow"

                 onclick="openTopicContent('${subjectId}', ${i})">

                <div class="w-48 h-48 flex-shrink-0 overflow-hidden">

                    <img src="${getTopicImg(i)}" alt="Topic ${i + 1}" class="w-full h-full object-cover">

                </div>

                <div class="flex-1 p-6 flex flex-col justify-between min-w-0">

                    <div>

                        <div class="flex items-center gap-2 mb-2">

                            <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Topic ${i + 1}</span>

                            <i class="fa-solid ${statusIconClass[t.status]} text-lg ml-auto"></i>

                        </div>

                        <p class="text-xl font-black text-gray-800 leading-tight group-hover/tc:text-icc-yellow transition-colors">${t.title}</p>

                        <p class="text-sm text-gray-500 mt-2 leading-relaxed line-clamp-2">${getTopicOverview(t.title)}</p>

                    </div>

                    <div class="flex items-center justify-between mt-4">

                        <div class="flex items-center gap-2">

                            <span class="text-xs font-bold px-3 py-1.5 rounded-full ${statusBadgeClass[t.status]}">${statusLabel[t.status]}</span>

                            <button type="button" class="subjects-inline-ai-icon topic-ai-btn" title="Ask SIGMA AI" aria-label="Ask SIGMA AI about ${t.title}" data-ai-subject="${t.title}" data-ai-insight="${getTopicOverview(t.title)}">

                                <i class="fa-solid fa-bolt"></i>

                            </button>

                        </div>

                        <span class="text-xs font-bold text-gray-400 flex items-center gap-1">Open <i class="fa-solid fa-arrow-right text-[10px]"></i></span>

                    </div>

                </div>

            </div>

        `;



        const overallColor = overallPct >= 90 ? 'text-green-600' : overallPct >= 80 ? 'text-icc' : overallPct >= 75 ? 'text-yellow-600' : overallPct > 0 ? 'text-red-500' : 'text-gray-400';



        page.innerHTML = `

            <div class="student-topic-page-shell">

                <div class="topic-detail-grid">

                    <!-- Topics list -->

                    <div class="student-topic-main-shell">

                        <div class="student-topic-header">

                            <h1>Topics</h1>

                        </div>

                        <div class="student-topic-list" id="q1-topics-list">

                            ${data.q1Topics.map((t, i) => renderTopicCard(t, i)).join('')}

                        </div>

                    </div>



                    <!-- RIGHT: progress panel — aligned with topic cards, not page top -->

                    <div class="student-topic-progress-rail">

                        <div class="student-topic-progress-card">

                            <p class="student-topic-progress-kicker">Progress</p>



                            <!-- Q1 big % -->

                            <div class="text-center py-1">

                                <div class="student-topic-progress-percent text-gray-900">${overallPct}%</div>

                                <p class="text-[10px] text-gray-400 mt-1">${q1Done} of ${q1Total} topics done</p>

                            </div>



                            <!-- Quarter bars -->

                            <div>

                                <div class="flex justify-between items-center mb-1.5">

                                    <span class="student-topic-progress-label">1st Quarter</span>

                                    <span class="text-[10px] font-black text-gray-900">${quarter1Pct}%</span>

                                </div>

                                <div class="student-topic-progress-bar bg-gray-100">

                                    <div class="h-full ${quarter1BarColor} rounded-full transition-all" style="width:${quarter1Pct}%"></div>

                                </div>

                            </div>



                            <div class="pt-3 border-t border-gray-100">

                                <div class="flex justify-between items-center">

                                    <span class="student-topic-progress-label">2nd Quarter</span>

                                    <span class="text-[10px] font-black text-gray-900">${quarter2Pct}%</span>

                                </div>

                                <div class="student-topic-progress-bar bg-gray-100 mt-1.5">

                                    <div class="h-full ${quarter2BarColor} rounded-full transition-all" style="width:${quarter2Pct}%"></div>

                                </div>

                            </div>

                        </div>



                        <!-- Overall Average panel -->

                        <div class="student-topic-progress-card student-topic-progress-card--overall">

                            <p class="student-topic-progress-kicker">Overall</p>

                            <div class="text-center py-3">

                                <div class="student-topic-overall-percent ${overallColor}">${overallPct}%</div>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        `;



        page.querySelectorAll('.topic-ai-btn').forEach(btn => {

            btn.addEventListener('click', event => {

                event.stopPropagation();

                askSigmaAbout(btn.dataset.aiSubject, btn.dataset.aiInsight);

            });

        });

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

            'Origin and Structure of the Earth': 'Explore Earthâ€™s formation, layers, and the processes that shape the planet.',

            'Earth Materials and Processes': 'Study rocks, minerals, and the forces that change Earthâ€™s surface.',

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



    // â”€â”€â”€ Topic Content System â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    // Tracks current context for topic content pages

    let _tcSubjectId = null, _tcTopicIdx = 0, _tcTab = 'videos', _tcVideoIdx = null;



    // Sample video data per topic (future: from backend)

    const topicVideos = {

        default: [

            { id: 1, title: 'Lecture 1: Introduction & Overview', duration: '24:15', teacher: 'Alex Reyes', thumb: null, url: '' },
            { id: 2, title: 'Lecture 2: Core Concepts Explained', duration: '18:42', teacher: 'Alex Reyes', thumb: null, url: '' },
            { id: 3, title: 'Lecture 3: Practical Demonstration', duration: '31:08', teacher: 'Alex Reyes', thumb: null, url: '' },

        ],

        'default-subject-placeholder-0': []

    };



    // Expose globally so onclick in rendered HTML can call it

    window.openTopicContent = function (subjectId, topicIdx, tab = 'videos', videoIdx = null) {

        _tcSubjectId = subjectId;

        _tcTopicIdx = topicIdx;

        _tcTab = tab;

        _tcVideoIdx = videoIdx;



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

    };



    window.returnToTopicsPage = function () {

        if (_tcSubjectId) {

            switchToTopicPage(_tcSubjectId);

            return;

        }

        history.back();

    };



    window.switchTopicTab = function (tab) {

        if (!_tcSubjectId) return;

        _tcTab = tab;

        _tcVideoIdx = null;

        history.replaceState({ page: `topic-content:${_tcSubjectId}:${_tcTopicIdx}:${tab}` }, '', `#tc-${_tcSubjectId}-${_tcTopicIdx}-${tab}`);

        _renderTopicContentMain(_tcSubjectId, _tcTopicIdx, tab);

        // Update sub-sidebar active item

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

        const topic = data.q1Topics[topicIdx];



        setSubjectsPanelsMode(false);

        setCurriculumMode(false);

        hideAllSections();

        showSection('section-topic-content');



        navLinks.forEach(l => l.classList.remove('bg-white/20'));

        document.getElementById('nav-courses')?.classList.add('bg-white/20');



        // Nav header = Topics

        setNavContext('Topics');



        _showSubSidebarInstant();

        subSidebar.classList.add('sub-sidebar-visible');

        renderTopicContentsSidebar(subjectId, topicIdx, tab);

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

            { tab: 'handouts', icon: 'fa-solid fa-file-pdf', label: 'Handouts' },

            { tab: 'assignments', icon: 'fa-solid fa-file-pen', label: 'Assignments' },

            { tab: 'quiz', icon: 'fa-solid fa-square-poll-vertical', label: 'Quiz' },

            { tab: 'activity', icon: 'fa-solid fa-flask', label: 'Activity' },

            { tab: 'performance', icon: 'fa-solid fa-star', label: 'Performance Task' },

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



        // Main content by tab â€” no right panel on any tab



        // Main content by tab

        let mainContent = '';

        if (tab === 'videos') mainContent = _buildVideosTab(subject, topic, subjectId, topicIdx);

        else if (tab === 'handouts') mainContent = _buildHandoutsTab(subject, topic, subjectId, topicIdx);

        else if (isAssessment) mainContent = _buildAssessmentTab(tab, subject, topic, data);

        else mainContent = _buildComingSoonTab(tab, subject, topic);



        page.innerHTML = `<div class="flex-1 p-8 min-w-0">${mainContent}</div>`;



        if (tab === 'handouts') {

            const handouts = topic.handouts || topicHandouts[`${subjectId}-${topicIdx}`] || topicHandouts.default;

            handouts.forEach((h, i) => {

                if (h.type === 'ppt' && h.slides) {

                    new HandoutSlider(`handout-slider-${i}`, h.slides);

                }

            });

        }

    }



    // â”€â”€â”€ Tab linear navigation helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const TAB_ORDER = ['videos', 'handouts', 'assignments', 'quiz', 'activity', 'performance'];

    const TAB_LABELS = { videos: 'Videos', handouts: 'Handouts', assignments: 'Assignments', quiz: 'Quiz', activity: 'Activity', performance: 'Performance Task' };

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

        return `

            <div class="flex items-center justify-between w-full mb-6">

                ${prev ? `

                <button onclick="switchTopicTab('${prev}')"

                    title="${TAB_LABELS[prev]}"

                    aria-label="${TAB_LABELS[prev]}"

                    class="h-10 min-w-[56px] px-4 rounded-xl bg-icc hover:bg-icc-dark text-white text-xs font-bold transition-all flex items-center justify-center gap-2">

                    <i class="fa-solid fa-chevron-left text-[10px]"></i>

                    <i class="${TAB_ICONS[prev] || 'fa-solid fa-circle'} text-[14px]"></i>

                </button>` : '<div class="w-10 h-10"></div>'}

                ${next ? `

                <button onclick="switchTopicTab('${next}')"

                    title="${TAB_LABELS[next]}"

                    aria-label="${TAB_LABELS[next]}"

                    class="h-10 min-w-[56px] px-4 rounded-xl bg-icc hover:bg-icc-dark text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2">

                    <i class="${TAB_ICONS[next] || 'fa-solid fa-circle'} text-[14px]"></i>

                    <i class="fa-solid fa-chevron-right text-[10px]"></i>

                </button>` : '<div class="w-10 h-10"></div>'}

            </div>

        `;

    }



    // â”€â”€â”€ VIDEOS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    function _buildVideosTab(subject, topic, subjectId, topicIdx) {

        const videos = topicVideos[`${subjectId}-${topicIdx}`] ?? topicVideos.default;

        const subjectCluster = currentCurriculumCluster ? (curriculumPrograms[currentCurriculumProgram]?.clusters || curriculumPrograms[currentCurriculumProgram]?.stages || []).find(c => c.key === currentCurriculumCluster) : null;




        if (!videos.length) {

            return `

                ${_tabNav('videos')}

                <div class="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">

                    <i class="fa-solid fa-play-circle text-4xl text-gray-300 mb-4"></i>

                    <p class="text-xl font-black text-gray-800">No videos yet</p>

                    <p class="text-sm text-gray-500 mt-2">This topic lesson does not have any videos yet.</p>

                </div>

            `;

        }



        if (_tcVideoIdx === null || _tcVideoIdx === undefined || Number.isNaN(_tcVideoIdx)) {

            return `

                ${_tabNav('videos')}

                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

                    ${videos.map((video, i) => `

                        <button type="button" class="video-selection-card bg-white border border-gray-100 rounded-2xl p-4 text-left hover:shadow-[inset_0_0_0_2px_rgba(255,200,18,1)] transition-shadow" onclick="openTopicContent('${subjectId}', ${topicIdx}, 'videos', ${i})">

                            <div class="bg-gray-900 rounded-2xl overflow-hidden mb-4 flex items-center justify-center" style="aspect-ratio:16/9;">

                                <div class="text-center text-white/40">

                                    <i class="fa-solid fa-play-circle text-4xl mb-2 block"></i>

                                </div>

                            </div>

                            <p class="text-base font-black text-gray-800 leading-tight">${video.title}</p>

                            <p class="text-sm text-gray-500 mt-2 leading-relaxed">${getTopicOverview(video.title)}</p>

                            <div class="mt-3 flex items-center justify-between">

                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${video.duration}</span>

                            </div>

                        </button>

                    `).join('')}

                </div>

            `;

        }



        const activeVideo = videos[_tcVideoIdx] || videos[0];

        const otherVideos = videos.filter((_, idx) => idx !== _tcVideoIdx);



        return `

            
            ${_tabNav('videos')}

            <div class="max-w-[960px] mx-auto mb-4">

                <div class="bg-gray-900 rounded-2xl overflow-hidden flex items-center justify-center w-full" style="aspect-ratio:16/9;">

                    <div class="text-center text-white/40 px-6">

                        <i class="fa-solid fa-play-circle text-6xl mb-3 block"></i>

                        <p class="text-sm font-bold">${activeVideo.title}</p>

                        <p class="text-xs mt-1 text-white/30">${activeVideo.duration}</p>

                        <p class="text-[10px] mt-4 text-white/20">Video player â€” connect to backend to stream</p>

                    </div>

                </div>

            </div>

            <div class="mb-6">

                <p class="text-xs text-gray-400 font-bold uppercase tracking-widest">Now Playing</p>

                <p class="text-2xl font-black text-gray-800 mt-1">${activeVideo.title}</p>

                <p class="text-sm text-gray-500 mt-2">${getTopicOverview(activeVideo.title)}</p>

                <p class="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-4">${activeVideo.duration}</p>

            </div>

            <div class="space-y-4">

                <div class="flex items-center justify-between">

                    <p class="text-xs font-black text-gray-800 uppercase tracking-widest">More Videos</p>

                    <span class="text-[10px] text-gray-400 font-bold">${otherVideos.length} videos</span>

                </div>

                <div class="space-y-4">

                    ${otherVideos.map((video) => {

            const originalIdx = videos.findIndex(item => item.id === video.id);

            return `

                            <button type="button" class="w-full bg-white border border-gray-100 rounded-2xl overflow-hidden flex text-left hover:shadow-[inset_0_0_0_2px_rgba(255,200,18,1)] transition-shadow" onclick="openTopicContent('${subjectId}', ${topicIdx}, 'videos', ${originalIdx})">

                                <div class="w-44 flex-shrink-0 bg-gray-900 flex items-center justify-center" style="aspect-ratio:16/9;">

                                    <i class="fa-solid fa-play text-white/60 text-xl"></i>

                                </div>

                                <div class="flex-1 p-5 min-w-0">

                                    <p class="text-lg font-black text-gray-800 leading-tight">${video.title}</p>

                                    <p class="text-sm text-gray-500 mt-2 line-clamp-2">${getTopicOverview(video.title)}</p>

                                    <div class="mt-4 flex items-center justify-between">

                                        <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${video.duration}</span>

                                    </div>

                                </div>

                            </button>

                        `;

        }).join('')}

                </div>

            </div>

        `;

    }



    // â”€â”€â”€ HANDOUTS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    function _buildHandoutsTab(subject, topic, subjectId, topicIdx) {

        const handouts = topic.handouts || topicHandouts[`${subjectId}-${topicIdx}`] || topicHandouts.default;

        const subjectCluster = currentCurriculumCluster ? (curriculumPrograms[currentCurriculumProgram]?.clusters || curriculumPrograms[currentCurriculumProgram]?.stages || []).find(c => c.key === currentCurriculumCluster) : null;




        if (!handouts.length) {

            return `

                
                ${_tabNav('handouts')}

                <div class="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">

                    <i class="fa-solid fa-file-pdf text-4xl text-gray-300 mb-4"></i>

                    <p class="text-xl font-black text-gray-800">No handouts yet</p>

                    <p class="text-sm text-gray-500 mt-2">This topic lesson does not have any handouts yet.</p>

                </div>

            `;

        }



        const handoutCards = handouts.map((h, i) => {

            if (h.type === 'ppt') {

                return `

                    <div class="ppt-handout-container bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">

                        <div class="flex items-center justify-between">

                            <div>

                                <h3 class="text-lg font-black text-gray-800 tracking-tight">${h.title}</h3>

                                <p class="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Powerpoint Presentation â€¢ ${h.slides.length} Slides</p>

                            </div>

                            <button type="button"

                                onclick="askSigmaAbout('${h.title.replace(/'/g, "\\'")}', 'Analyzing Powerpoint: ${h.title.replace(/'/g, "\\'")}. This presentation contains ${h.slides.length} slides of instructional material.')"

                                class="w-10 h-10 rounded-xl bg-icc hover:bg-icc-dark flex items-center justify-center transition-all shadow-sm">

                                <i class="fa-solid fa-bolt text-icc-yellow text-lg"></i>

                            </button>

                        </div>

                        <div id="handout-slider-${i}" class="min-h-[200px]"></div>

                        ${h.details ? `

                        <div class="bg-gray-50 rounded-xl p-4">

                            <p class="text-sm text-gray-600 leading-relaxed font-medium">${h.details}</p>

                        </div>` : ''}

                    </div>

                `;

            }



            const isDocs = h.type === 'docs';

            const iconCls = isDocs ? 'fa-file-word text-blue-500' : 'fa-file-pdf text-red-500';

            const bgCls = isDocs ? 'bg-blue-50' : 'bg-red-50';



            return `

                <div class="handout-card bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm cursor-pointer"

                     onclick="openHandoutModal(${i},'${subjectId}',${topicIdx})">

                    <div class="w-16 h-16 rounded-xl ${bgCls} flex items-center justify-center flex-shrink-0">

                        <i class="fa-solid ${iconCls} text-3xl"></i>

                    </div>

                    <div class="flex-1 min-w-0">

                        <p class="text-sm font-black text-gray-800 leading-tight">${h.title}</p>

                        <p class="text-[11px] text-gray-400 mt-0.5">${h.type?.toUpperCase() || 'PDF'} â€¢ ${h.pages || 'â€”'} pages â€¢ ${h.size || 'Size N/A'} â€¢ Uploaded by ${h.uploader || 'Admin'}</p>

                    </div>

                    <button type="button"

                        data-ai-subject="${h.title}"

                        data-ai-insight="This handout supports ${topic.title}. It contains reference material to help the student review the lesson in a clearer, more structured way."

                        onclick="event.stopPropagation();askSigmaAbout(this.dataset.aiSubject, this.dataset.aiInsight)"

                        title="SIGMA AI Summary"

                        class="handout-ai-btn w-12 h-12 rounded-xl bg-icc hover:bg-icc-dark flex items-center justify-center transition-all shadow-sm flex-shrink-0">

                        <i class="fa-solid fa-bolt text-icc-yellow text-xl"></i>

                    </button>

                </div>

            `;

        }).join('');



        return `

            
            ${_tabNav('handouts')}

            <div class="space-y-4" id="handout-list">

                ${handoutCards}

            </div>

        `;

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

            : `srcdoc="<html><body style='margin:0;display:flex;align-items:center;justify-content:center;height:100%;background:#f8fafc;font-family:sans-serif;'><div style='text-align:center;color:#94a3b8;'><div style='font-size:72px;margin-bottom:16px'>ðŸ“„</div><p style='font-size:18px;font-weight:800;color:#374151'>${h.title}</p><p style='font-size:13px;margin-top:8px'>${h.pages} pages â€¢ ${h.size}</p><p style='font-size:11px;margin-top:20px;color:#cbd5e1;max-width:340px;line-height:1.6'>PDF will render here once connected to backend.</p></div></body></html>"`;

        modal.innerHTML = `

            <!-- Minimal top bar â€” just back button and filename -->

            <div style="height:48px;background:#1e1e2e;display:flex;align-items:center;padding:0 16px;gap:14px;flex-shrink:0;">

                <button onclick="document.getElementById('handout-modal').remove()"

                    style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,0.1);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s"

                    onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">

                    <i class="fa-solid fa-xmark" style="color:white;font-size:13px"></i>

                </button>

                <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">

                    <i class="fa-solid fa-file-pdf" style="color:#ef4444;font-size:14px;flex-shrink:0"></i>

                    <span style="font-size:13px;font-weight:700;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${h.title}</span>

                    <span style="font-size:11px;color:rgba(255,255,255,0.4);flex-shrink:0">â€¢ ${h.pages} pages â€¢ ${h.size}</span>

                </div>

                <span style="font-size:11px;color:rgba(255,255,255,0.35);white-space:nowrap;flex-shrink:0">Uploaded by ${h.uploader}</span>

            </div>

            <!-- PDF iframe fills all remaining height â€” Chrome renders its own toolbar inside -->

            <iframe ${iframeAttr}

                style="flex:1;border:none;width:100%;display:block;background:#404040"

            ></iframe>`;

        document.body.appendChild(modal);

        const esc = e => { if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', esc); } };

        document.addEventListener('keydown', esc);

    };



    window.toggleHandoutPreview = window.openHandoutModal;

    window.previewHandout = window.openHandoutModal;

    window.closePdfPreview = function () { document.getElementById('handout-modal')?.remove(); };





    // â”€â”€â”€ Sample handout data (future: from backend) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const topicHandouts = {

        default: [

            { title: 'Lesson Notes â€” Chapter 1', pages: 12, size: '1.2 MB', uploader: 'Admin', url: '' },

            { title: 'Reference Guide &     Glossary', pages: 8, size: '0.8 MB', uploader: 'Admin', url: '' },

            { title: 'Practice Exercises Sheet', pages: 4, size: '0.4 MB', uploader: 'Admin', url: '' },

        ],

        'default-subject-placeholder-0': []

    };





    // â”€â”€â”€ ASSESSMENT TABS (assignments/quiz/activity/performance) â”€

    // Sample assessment data â€” teacher/admin will populate via backend

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

        if (subject.id === 'default-subject-placeholder' && tab === 'activity') {

            const breadcrumb = buildSubjectBreadcrumb(subject, null, true, topic);

            return `

                
                ${_tabNav('activity')}

                <div class="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">

                    <i class="fa-solid fa-flask text-4xl text-gray-300 mb-4"></i>

                    <p class="text-xl font-black text-gray-800">No activity yet</p>

                    <p class="text-sm text-gray-500 mt-2">This topic lesson does not have any activity inside yet.</p>

                </div>

            `;

        }



        const labels = { assignments: 'Assignment', quiz: 'Quiz', activity: 'Activity', performance: 'Performance Task' };

        const icons = { assignments: 'fa-file-pen', quiz: 'fa-square-poll-vertical', activity: 'fa-flask', performance: 'fa-star' };

        const iconColors = {

            assignments: 'bg-blue-100 text-blue-600',

            quiz: 'bg-purple-100 text-purple-600',

            activity: 'bg-amber-100 text-amber-600',

            performance: 'bg-icc-light text-icc'

        };

        const label = labels[tab];

        const icon = icons[tab];

        const iconCls = iconColors[tab];

        const subjectCluster = currentCurriculumCluster ? (curriculumPrograms[currentCurriculumProgram]?.clusters || curriculumPrograms[currentCurriculumProgram]?.stages || []).find(c => c.key === currentCurriculumCluster) : null;




        const gradeKey = { assignments: 'assignment', quiz: 'quiz', activity: 'activity', performance: 'performance' }[tab];

        const gradeVal = topic.grades ? topic.grades[gradeKey] : null;

        const gradeColor = !gradeVal || gradeVal === 0 ? 'text-gray-300'

            : gradeVal >= 90 ? 'text-green-600' : gradeVal >= 80 ? 'text-icc'

                : gradeVal >= 75 ? 'text-yellow-600' : 'text-red-500';

        const gradeLabel = gradeVal && gradeVal > 0 ? gradeVal : 'â€”';

        const gradeRemarks = !gradeVal || gradeVal === 0 ? 'Not yet graded'

            : gradeVal >= 90 ? 'Excellent' : gradeVal >= 80 ? 'Very Good'

                : gradeVal >= 75 ? 'Good' : 'Needs Improvement';



        const instructionTexts = {

            assignments: `Write a structured program in Java that demonstrates the concepts covered in <strong>${topic.title}</strong>. Your code must include proper variable declarations, control structures, and methods. Include comments for each major section. Save your file as <strong>LastName_Assignment.java</strong> and submit via the upload form.`,

            quiz: `Answer all questions in the quiz for <strong>${topic.title}</strong>. This is a closed-book assessment â€” do not use reference materials unless specified. Each item is worth equal points. Read each question carefully before answering. Once submitted, your responses cannot be changed.`,

            activity: `Complete the hands-on activity for <strong>${topic.title}</strong>. Follow the step-by-step instructions in the provided reference sheet. Document your results with screenshots or written output as required. Submit your completed activity report in PDF format.`,

            performance: `Create a comprehensive output that demonstrates your mastery of <strong>${topic.title}</strong>. Your work will be graded based on accuracy, completeness, creativity, and adherence to the rubric. Review the rubric carefully before starting. Submit all required files before the deadline.`

        };



        const amd = assessmentData.default;

        const isPdf = amd.instructionType === 'pdf';

        const isSubmitted = !!amd.submission;

        const sub = amd.submission;



        const statusBadge = topic.status === 'completed'

            ? `<span class="px-3 py-1.5 text-xs font-black rounded-full bg-green-100 text-green-700 uppercase">Submitted</span>`

            : topic.status === 'in-progress'

                ? `<span class="px-3 py-1.5 text-xs font-black rounded-full bg-yellow-100 text-yellow-700 uppercase">In Progress</span>`

                : `<span class="px-3 py-1.5 text-xs font-black rounded-full bg-gray-100 text-gray-500 uppercase">Not Started</span>`;



        // Instructions block

        const instructionBlock = isPdf ? `

            <div class="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm">

                <div class="w-14 h-14 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">

                    <i class="fa-solid fa-file-pdf text-red-500 text-3xl"></i>

                </div>

                <div class="flex-1 min-w-0">

                    <p class="text-base font-black text-gray-900 leading-tight">${amd.instructionPdf.title}</p>

                    <p class="text-sm text-gray-400 mt-0.5">${amd.instructionPdf.pages} pages â€¢ ${amd.instructionPdf.size} â€¢ By ${amd.instructionPdf.uploader}</p>

                </div>

                <div class="flex items-center gap-2.5 flex-shrink-0">

                    <button type="button"

                        onclick="askSigmaAbout('${label.replace(/'/g, "\\'")} Instructions', 'These instructions explain the requirements, expected output, submission rules, and preparation steps for ${label.toLowerCase()} in ${topic.title.replace(/'/g, "\\'")}. Review them before starting so the work matches the rubric and deadline.')"

                        title="SIGMA AI"

                        class="w-11 h-11 rounded-xl bg-icc hover:bg-icc-dark flex items-center justify-center transition-all shadow-sm">

                        <i class="fa-solid fa-bolt text-icc-yellow text-lg"></i>

                    </button>

                    <button title="Download" class="w-11 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-all">

                        <i class="fa-solid fa-download text-lg"></i>

                    </button>

                </div>

            </div>` : `

            <div class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">

                <div class="flex items-start justify-between gap-4 mb-3">

                    <p class="text-lg font-black text-gray-900">Instructions</p>

                    <button type="button"

                        onclick="askSigmaAbout('${label.replace(/'/g, "\\'")} Instructions', 'These instructions explain the task, expected output, and submission requirements for ${label.toLowerCase()} in ${topic.title.replace(/'/g, "\\'")}. Use them as the guide before completing the work.')"

                        title="SIGMA AI"

                        class="w-11 h-11 rounded-xl bg-icc hover:bg-icc-dark flex items-center justify-center transition-all shadow-sm flex-shrink-0">

                        <i class="fa-solid fa-bolt text-icc-yellow text-lg"></i>

                    </button>

                </div>

                <p class="text-base text-gray-800 leading-relaxed font-medium">${instructionTexts[tab]}</p>

            </div>`;



        const barColor = gradeVal && gradeVal >= 90 ? 'bg-green-500'

            : gradeVal && gradeVal >= 80 ? 'bg-icc'

                : gradeVal && gradeVal >= 75 ? 'bg-icc-yellow'

                    : gradeVal && gradeVal > 0 ? 'bg-red-400' : 'bg-gray-200';



        return `

            <!-- Header -->

            
            ${_tabNav(tab)}



            <!-- Two-column layout -->

            <div class="flex gap-6 min-w-0 items-start">

                <!-- LEFT: Instructions first, then Activity Details -->

                <div class="flex-1 min-w-0 space-y-5">



                    ${instructionBlock}



                    <!-- Activity Details -->

                    <div class="bg-white border border-gray-100 rounded-2xl overflow-hidden">

                        <div class="px-6 py-4 border-b border-gray-100">

                            <p class="text-base font-black text-gray-900">${label} Details</p>

                        </div>

                        <div class="p-6">

                            <div class="grid grid-cols-3 gap-4">

                                <div class="bg-gray-50 rounded-2xl p-4">

                                    <div class="flex items-center gap-2 mb-2">

                                        <i class="fa-solid fa-calendar-check text-icc text-sm"></i>

                                        <p class="text-xs font-black text-gray-500 uppercase tracking-widest">Start</p>

                                    </div>

                                    <p class="text-base font-black text-gray-900">${amd.startDate}</p>

                                    <p class="text-sm text-gray-500 font-medium mt-0.5">${amd.startTime}</p>

                                </div>

                                <div class="bg-red-50 rounded-2xl p-4">

                                    <div class="flex items-center gap-2 mb-2">

                                        <i class="fa-solid fa-clock text-red-500 text-sm"></i>

                                        <p class="text-xs font-black text-red-400 uppercase tracking-widest">Due</p>

                                    </div>

                                    <p class="text-base font-black text-gray-900">${amd.dueDate}</p>

                                    <p class="text-sm text-red-500 font-bold mt-0.5">${amd.dueTime}</p>

                                </div>

                                <div class="bg-icc-light rounded-2xl p-4">

                                    <div class="flex items-center gap-2 mb-2">

                                        <i class="fa-solid fa-star text-icc text-sm"></i>

                                        <p class="text-xs font-black text-icc uppercase tracking-widest">Max Score</p>

                                    </div>

                                    <p class="text-3xl font-black text-icc leading-none">${amd.maxScore}</p>

                                    <p class="text-sm text-icc/60 font-medium mt-1">points</p>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>



                <!-- RIGHT: Grade + Submission info -->

                <div class="w-64 flex-shrink-0 space-y-4">



                    <!-- Grade panel -->

                    <div class="bg-white border border-gray-100 rounded-2xl overflow-hidden">

                        <div class="px-5 py-4 border-b border-gray-100">

                            <p class="text-sm font-black text-gray-900">Your Grade</p>

                        </div>

                        <div class="p-5 text-center">

                            <div class="text-6xl font-black ${gradeColor} mb-1">${gradeLabel}</div>

                            <p class="text-xs text-gray-400 font-bold uppercase tracking-widest">out of ${amd.maxScore}</p>

                            <div class="mt-3 h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">

                                <div class="h-full rounded-full ${barColor}" style="width:${gradeVal && gradeVal > 0 ? gradeVal : 0}%"></div>

                            </div>

                            <p class="text-xs text-gray-400 mt-1.5 text-right font-medium">${gradeRemarks}</p>

                        </div>

                    </div>



                    <!-- Submission info panel -->

                    <div class="bg-white border border-gray-100 rounded-2xl overflow-hidden">

                        <div class="px-5 py-4 border-b border-gray-100">

                            <p class="text-sm font-black text-gray-900">Submission</p>

                        </div>

                        <div class="p-5 space-y-3 text-sm">

                            <div class="flex justify-between items-center">

                                <span class="text-gray-500 font-medium">Max Attempts</span>

                                <span class="font-black text-gray-900">${amd.maxAttempts}</span>

                            </div>

                            <div class="flex justify-between items-center">

                                <span class="text-gray-500 font-medium">Attempts Used</span>

                                <span class="font-black text-gray-900">${isSubmitted ? '1' : '0'} / ${amd.maxAttempts}</span>

                            </div>

                            <div class="flex justify-between items-center">

                                <span class="text-gray-500 font-medium">Late Permission</span>

                                <span class="font-black ${amd.latePermission ? 'text-icc' : 'text-red-500'}">${amd.latePermission ? 'Permitted' : 'Not Allowed'}</span>

                            </div>

                            ${isSubmitted ? `

                            <div class="pt-3 border-t border-gray-100 space-y-2.5">

                                <div class="flex justify-between items-center">

                                    <span class="text-gray-500 font-medium">Submitted</span>

                                    <span class="font-black text-gray-900">1 / ${amd.maxAttempts}</span>

                                </div>

                                <div>

                                    <span class="text-gray-500 font-medium block">Submitted On</span>

                                    <span class="font-bold text-gray-800">${sub.date}</span>

                                    <span class="text-gray-400 font-medium block text-xs">${sub.time}</span>

                                </div>

                                ${sub.isLate ? `<div class="flex justify-between items-center"><span class="text-gray-500 font-medium">Overdue</span><span class="font-black text-red-500">Yes</span></div>` : ''}

                                <button class="w-full py-2.5 bg-icc-light hover:bg-icc/20 text-icc font-black text-sm rounded-xl transition-all flex items-center justify-center gap-2">

                                    <i class="fa-solid fa-eye text-sm"></i> View Submission

                                </button>

                            </div>` : `

                            <div class="pt-3 border-t border-gray-100">

                                <p class="text-xs text-gray-400 text-center font-medium">No submission yet.</p>

                            </div>`}

                        </div>

                    </div>



                </div>

            </div>

        `;

    }



    function _buildComingSoonTab(tab, subject, topic) {

        const labels = { assignments: 'Assignments', quiz: 'Quiz', activity: 'Activity', performance: 'Performance Task' };

        const icons = { assignments: 'fa-file-pen', quiz: 'fa-square-poll-vertical', activity: 'fa-flask', performance: 'fa-star' };

        const subjectCluster = currentCurriculumCluster ? (curriculumPrograms[currentCurriculumProgram]?.clusters || curriculumPrograms[currentCurriculumProgram]?.stages || []).find(c => c.key === currentCurriculumCluster) : null;

        return `

            ${_tabNav(tab)}

            <div class="bg-white border border-gray-100 rounded-2xl p-16 flex flex-col items-center justify-center text-center">

                <i class="fa-solid ${icons[tab] || 'fa-folder'} text-5xl text-gray-200 mb-4"></i>

                <p class="text-base font-black text-gray-400">${labels[tab] || tab}</p>

                <p class="text-sm text-gray-300 mt-1">Content will appear here when uploaded by your teacher.</p>

            </div>

        `;

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

        } else {

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



    // â”€â”€â”€ Classroom Detail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
            schedule: 'Mon / Wed / Fri â€¢ 8:00 â€“ 9:30 AM',
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
            schedule: 'Tue / Thu • 9:45 – 11:15 AM',
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
            schedule: 'Mon / Wed â€¢ 11:30 AM â€“ 1:00 PM',
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
            schedule: 'Tue / Thu â€¢ 1:30 â€“ 3:00 PM',
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
            schedule: 'Mon / Wed â€¢ 3:15 â€“ 4:45 PM',
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
            schedule: 'Mon / Wed / Fri â€¢ 8:00 â€“ 9:30 AM',
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
            schedule: 'Tue / Thu â€¢ 1:30 â€“ 3:00 PM',
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
            schedule: 'Tue / Thu â€¢ 10:30 AM â€“ 12:00 PM',
            icon: 'fa-solid fa-sitemap',
            bgColor: 'bg-[#78350f]',
            color: 'text-slate-700',
            topicColor: 'bg-slate-100'
        },
        'card-genmath': {
            subject: 'General Mathematics',
            teacher: 'Jose Santos',
            section: 'Grade 11 - STEM A',
            room: 'Room 406',
            sharedKey: 'Grade 11 - STEM A::General Mathematics',
            students: 42,
            schedule: 'Mon / Wed / Fri â€¢ 1:00 â€“ 2:30 PM',
            icon: 'fa-solid fa-infinity',
            bgColor: 'bg-[#15803d]',
            color: 'text-indigo-600',
            topicColor: 'bg-indigo-50'
        },
        'card-oralcomm': {
            subject: 'Oral Communication',
            teacher: 'Ana Reyes',
            section: 'Grade 11 - ICT A',
            room: 'Room 204',
            sharedKey: 'Grade 11 - ICT A::Oral Communication',
            students: 35,
            schedule: 'Tue / Thu â€¢ 8:00 â€“ 9:30 AM',
            icon: 'fa-solid fa-comments',
            bgColor: 'bg-[#15803d]',
            color: 'text-icc',
            topicColor: 'bg-icc-light'
        }
    };



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

                    meta: `${data.section} â€¢ ${data.subject}`,

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

        } else if (activeHomeAnnouncementTab === 'posts') {

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

            const roleLabel = isTeacher ? 'Teacher' : 'Administrator';

            const roleClass = isTeacher ? 'text-emerald-600' : 'text-slate-500';



            const fullBody = post.body || '';

            const hasImage = post.imageUrl && post.imageUrl.trim() !== '';

            const hasText = (post.title && post.title.trim() !== '') || (fullBody.trim() !== '');



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



            const formattedFull = escapeHtml(fullBody).replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');

            const formattedTruncated = escapeHtml(truncatedBody).replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');



            return `

                <article id="${post.id}" 

                         data-original-height="${cardHeight}"

                         class="announcement-card bg-white border border-slate-200 rounded-[22px] relative w-full ${cardHeight} overflow-hidden transition-all duration-500 group shadow-sm">

                    <div class="p-6 pb-[60px] flex flex-col min-w-0">

                        <div class="flex items-start justify-between mb-4">

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

                        <div class="absolute bottom-[52px] left-0 right-0 h-[300px] overflow-hidden border-t border-slate-50 bg-black">

                            <img src="${post.imageUrl}" 

                                 onclick="enlargeAnnouncementImage('${post.imageUrl}')" 

                                 class="w-full h-full object-contain cursor-pointer" 

                                 alt="Announcement Image">

                        </div>

                    ` : ''}

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

            art.classList.remove(art.dataset.originalHeight);

            art.classList.add('h-auto');

        } else {

            p.innerHTML = p.dataset.truncated + ` <span onclick="toggleAnnouncement('${id}')" class="see-more-btn cursor-pointer font-bold text-slate-900 hover:underline ml-1">See more</span>`;

            art.classList.remove('h-auto');

            art.classList.add(art.dataset.originalHeight);

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

            const attendanceContext = {

                name: currentStudentName,

                sharedKey: data.sharedKey,

                subject: data.subject,

                time: `April 8, 2026 â€¢ ${data.schedule.split('â€¢')[1]?.trim() || ''}`.trim()

            };

            const snapshot = getStudentAttendanceSnapshot(attendanceContext);

            const attendanceModeLabel = snapshot.mode === 'trust' ? 'Student self check-in' : 'Teacher roll call';



            return `

                <div class="student-room-panel student-room-attendance">

                    <article class="student-room-attendance-card">

                        <div class="student-room-attendance-card__head">

                            <div>

                                <p class="student-room-attendance-card__eyebrow">Attendance Status</p>

                                <h3 class="student-room-attendance-card__title">${snapshot.label}</h3>

                            </div>

                            ${snapshot.mode === 'trust' && !snapshot.status

                    ? `<div class="student-room-attendance-card__actions">

                                        <button type="button" class="student-room-attendance-card__present-btn" data-student-present="${data.sharedKey}">Present</button>

                                        <button type="button" class="student-room-attendance-card__absent-btn" data-student-absent-toggle="true">Absent</button>

                                    </div>`

                    : `<span class="student-room-attendance-card__badge ${snapshot.badgeClass}">${snapshot.label}</span>`}

                        </div>

                        <p class="student-room-attendance-card__meta">${snapshot.meta}</p>

                        ${snapshot.mode === 'trust' && !snapshot.status ? `

                            <div class="student-room-attendance-excuse hidden" data-student-absent-panel>

                                <p class="student-room-attendance-excuse__label">Absent Submission</p>

                                <textarea class="student-room-attendance-excuse__textarea" data-student-absent-comment placeholder="Write your excuse comment here..."></textarea>

                                <div class="student-room-attendance-excuse__upload">

                                    <input type="file" data-student-absent-files multiple accept=".jpg,.jpeg,.png,.pdf,.doc,.docx" class="student-room-attendance-excuse__file-input">

                                    <p class="student-room-attendance-excuse__hint">Upload up to 10 files only. You can submit your attendance only once.</p>

                                    <div class="student-room-attendance-excuse__file-list" data-student-absent-file-list></div>

                                </div>

                                <button type="button" class="student-room-attendance-excuse__submit" data-student-absent-submit="${data.sharedKey}">Send Absence</button>

                            </div>

                        ` : ''}

                        <div class="student-room-attendance-card__grid">

                            <div class="student-room-attendance-card__info">

                                <span class="student-room-attendance-card__info-label">Room</span>

                                <span class="student-room-attendance-card__info-value">${data.room}</span>

                            </div>

                            <div class="student-room-attendance-card__info">

                                <span class="student-room-attendance-card__info-label">Schedule</span>

                                <span class="student-room-attendance-card__info-value">${data.schedule}</span>

                            </div>

                            <div class="student-room-attendance-card__info">

                                <span class="student-room-attendance-card__info-label">Mode</span>

                                <span class="student-room-attendance-card__info-value">${attendanceModeLabel}</span>

                            </div>

                            <div class="student-room-attendance-card__info">

                                <span class="student-room-attendance-card__info-label">Teacher</span>

                                <span class="student-room-attendance-card__info-value">${data.teacher}</span>

                            </div>

                        </div>

                    </article>

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

                    const materialMeta = isLecture ? 'Video â€¢ 15:20 â€¢ Updated 1 week ago' : 'PDF â€¢ 2.4 MB â€¢ Updated 2 days ago';

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
                <article class="bg-white border border-slate-200 rounded-[22px] relative w-full overflow-hidden transition-all duration-500 mb-3">
                    <div class="p-6 flex flex-col min-w-0">
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
                            <span class="text-[10px] font-medium text-slate-400 tracking-tight mt-0.5">${post.timestamp || ''}</span>
                        </div>

                        <!-- Subject title + section subtitle -->
                        <div class="mb-3 pl-[3.25rem]">
                            <h3 class="text-[17px] font-black text-slate-900 leading-tight">${data.subject || ''}</h3>
                            ${data.section ? `<p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">${data.section}</p>` : ''}
                        </div>

                        <!-- Post body -->
                        <div class="pl-[3.25rem] text-[15px] text-slate-700 leading-relaxed">${post.html}</div>

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
                <article class="bg-white border border-slate-200 rounded-[22px] p-8 text-center">
                    <p class="text-[13px] italic text-slate-400 opacity-60">No room announcements yet.</p>
                </article>
            `;



        return `

            <div class="student-room-feed">

                ${announcementFeed}

            </div>

        `;

    }



    function showClassroomDetail(classroomId, pushState = true) {

        const data = classroomData[classroomId];

        if (!data) return;



        if (activeStudentClassroomId !== classroomId) {

            activeStudentRoomTab = 'room';

        }



        const content = document.getElementById('classroom-detail-content');

        if (!content) return;



        const classmates = classroomPeopleBySection[data.section] || classroomPeopleBySection['ICT-11A'] || [];

        const announcements = getSharedAnnouncements(data.sharedKey || classroomId, classroomAnnouncementById[classroomId] || []);

        const showPeoplePanel = activeStudentRoomTab === 'room';

        const subjectCoverConfig = getAdminSubjectCoverConfig(data.subject);

        const showBannerImage = subjectCoverConfig?.coverVisibleToUsers !== false;

        const bannerImage = subjectCoverConfig?.cover || 'image/Welcome.jpg';



        activeStudentClassroomId = classroomId;

        currentStudentAttendance = {

            name: currentStudentName,

            sharedKey: data.sharedKey || classroomId,

            subject: data.subject,

            time: `April 8, 2026 â€¢ ${data.schedule.split('â€¢')[1]?.trim() || ''}`.trim()

        };

        setNavContext('Sections');



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

                            <button type="button" class="student-room-topics-btn" data-room-topic-btn title="Topics">

                                <i class="fa-solid fa-book"></i>

                            </button>

                        </div>

                    </div>

                </div>



                <div class="student-room-layout">

                    <div class="student-room-main ${showPeoplePanel ? '' : 'student-room-main--full'}">

                        ${renderStudentRoomPanel(classroomId, data, announcements)}

                    </div>



                    ${showPeoplePanel ? `

                    <aside id="classroom-mobile-people-panel" class="student-room-people">
                        <!-- Mobile Pull Down Handle -->
                        <div class="md:hidden w-full flex justify-center pb-4 pt-2 cursor-pointer" onclick="window.toggleMobilePeoplePanel()">
                            <div class="w-12 h-1.5 bg-gray-200 rounded-full"></div>
                        </div>

                        <div class="student-room-people__section">

                            <p class="student-room-people__label">Teacher</p>

                            <div class="student-room-people__list">

                                <button type="button" class="student-room-person">${data.teacher}</button>

                            </div>

                        </div>

                        <div class="student-room-people__divider"></div>

                        <div class="student-room-people__section">

                            <p class="student-room-people__label">Students</p>

                            <div class="student-room-people__list">

                                ${classmates.map(name => `<button type="button" class="student-room-person">${name}</button>`).join('')}

                            </div>

                        </div>

                    </aside>

                    ` : ''}

                </div>

            </div>

        `;



        content.querySelectorAll('[data-room-tab]').forEach(button => {

            button.addEventListener('click', () => {

                activeStudentRoomTab = button.dataset.roomTab;

                showClassroomDetail(classroomId);

            });

        });

        content.querySelector('[data-room-topic-btn]')?.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            const targetId = resolveClassroomTopicSourceId(classroomId, data);
            switchToTopicPage(targetId);
        });



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



    // ——————————————————————————————————————————————————————————————————————————

    window.addEventListener('resize', updateLayout);

    const initialPage = resolvePageStateFromLocation(history.state);

    if (!history.state?.page) {

        history.replaceState(

            { page: initialPage },

            '',

            `${window.location.pathname}${window.location.search}${window.location.hash}`

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

    initHomeSubjectRail();

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

        let enrolled = [...(subjectsData.enrolled || []), ...(subjectsData.completed || [])];

        if (savedOrder.length > 0) {
            enrolled.sort((a, b) => {
                const idxA = savedOrder.indexOf(a.id);
                const idxB = savedOrder.indexOf(b.id);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return (a.text || '').localeCompare(b.text || '');
            });
        } else {
            enrolled.sort((a, b) => (a.text || '').localeCompare(b.text || ''));
        }

        let html = '';
        enrolled.forEach((subj, index) => {
            let bgClass = 'bg-[#15803d]'; // Core
            let textClass = 'text-white';
            if (subj.subtitle.toLowerCase().includes('applied') || subj.subtitle.toLowerCase().includes('academic')) {
                bgClass = 'bg-[#FFD000]';
                textClass = 'text-white';
            }
            if (subj.subtitle.toLowerCase().includes('specialized') || subj.subtitle.toLowerCase().includes('ict')) {
                bgClass = 'bg-[#78350f]';
                textClass = 'text-white';
            }

            // Badges (Synchronized with teacher)
            let badge = '';
            if (index === 0) {
                badge = `<span class="text-[10px] font-black tracking-widest uppercase" style="color: #dc2626 !important;">No Class</span>`;
            } else if (index === 2 || subj.text.includes('Programming')) {
                badge = `<span class="text-[10px] font-black tracking-widest uppercase" style="color: #16a34a !important;">Class Today</span>`;
            } else if (index === 5) {
                badge = `<span class="text-[10px] font-black tracking-widest uppercase" style="color: #ca8a04 !important;">Class Tomorrow</span>`;
            }

            html += `
                <div class="classroom-card bg-white border border-gray-100 rounded-[24px] overflow-hidden shadow-sm transition-all group flex flex-col h-full" data-id="${subj.id}">
                    <!-- Header / Banner -->
                    <div class="h-28 ${bgClass} w-full flex items-center justify-center px-6 rounded-t-[24px] relative classroom-card-banner">
                         <h3 class="${textClass} font-black tracking-widest text-[14px] text-center leading-tight drop-shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                             onclick="showClassroomDetail('${subj.id}')">${subj.text}</h3>
                    </div>
                    
                    <!-- Overlapping Avatar -->
                    <div class="relative px-6">
                        <div class="absolute top-0 left-6 -translate-y-1/2 w-16 h-16 rounded-full bg-white p-1 shadow-sm mobile-hide-avatar">
                            <div class="w-full h-full rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                                <i class="fa-solid fa-user text-gray-400 text-xl"></i>
                            </div>
                        </div>
                    </div>

                    <div class="p-6 pt-10 flex flex-col flex-1 card-body-main">
                        <div class="flex items-start justify-between mb-4">
                            <div class="flex flex-col">
                                <h4 class="text-[15px] font-black leading-tight" style="color: #000000 !important;">${subj.instructor}</h4>
                            </div>
                            ${badge}
                        </div>

                        <div class="mt-auto flex flex-col gap-2.5 pt-4 border-t border-gray-50">
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] font-black tracking-widest leading-none" style="color: #000000 !important;">ICT-11A</span>

                            </div>
                            <span class="text-[10px] font-black tracking-widest leading-none mobile-hide-meta" style="color: #000000 !important;">Grade 11</span>
                            <span class="text-[10px] font-black tracking-widest leading-none mobile-hide-meta" style="color: #000000 !important;">Room ${301 + index}</span>
                            <div class="flex items-center justify-between w-full">
                                <span class="text-[10px] font-black tracking-widest leading-none mobile-hide-meta" style="color: #000000 !important;">08:00 AM - 09:30 AM</span>
                                <span class="text-[10px] font-black tracking-widest leading-none mobile-hide-meta text-right" style="color: #000000 !important;">${subj.schoolYear || '2026-2027'}</span>
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
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            forceFallback: true,
            fallbackClass: 'sortable-drag',
            fallbackOnBody: true,
            swapThreshold: 0.65,
            invertSwap: true,
            scroll: true,
            bubbleScroll: true,
            scrollSensitivity: 100, // Start scrolling when 100px from edge
            scrollSpeed: 20, // Faster scroll speed
            onStart: () => {
                document.body.style.cursor = 'grabbing';
            },
            onEnd: () => {
                document.body.style.cursor = '';
                const order = Array.from(grid.querySelectorAll('.classroom-card')).map(card => card.dataset.id);
                localStorage.setItem('sigma-student-classroom-order', JSON.stringify(order));
            }
        });

    }



    // --- SIGMA AI Panels Drag & Drop (SortableJS) ---

    function initSigmaPanelsSortable() {

        const container = document.getElementById('sigma-panels-container');

        if (!container) return;



        new Sortable(container, {

            animation: 150,
            delay: 200,
            delayOnTouchOnly: true,
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

            handle: '[data-id]', // Only allow dragging by the panels themselves

            onStart: () => {

                document.body.style.cursor = 'grabbing';

            },

            onEnd: () => {

                document.body.style.cursor = '';

            }

        });

    }



    initCardSortable();

    initSigmaPanelsSortable();


    // Subjects tab hover subsidebar disabled — no hover popup
    function initSubjectsHoverSubsidebar() {
        // Hover sub-sidebar removed per design requirement
    }

    initSubjectsHoverSubsidebar();

    // ... (rest of the code remains the same)


    // ─── Global Search Functionality (Matched with Admin) ───

    const searchBar = document.getElementById('searchBar');

    const searchBtn = document.getElementById('globalSearchBtn');



    const triggerGlobalSearch = () => {

        const query = (searchBar?.value || '').trim();

        const visibleSection = Array.from(document.querySelectorAll('.dynamic-section:not(.hidden)'))[0];

        if (!visibleSection) return;



        const sectionId = visibleSection.id;



        // Link to specific section searches (e.g., Home Subjects)

        if (sectionId === 'section-home') {

            const homeSearchInput = document.getElementById('home-subject-search-input');

            if (homeSearchInput) {

                homeSearchInput.value = query;

                // Trigger the internal home search logic

                if (typeof homeSubjectRailState !== 'undefined') {

                    homeSubjectRailState.query = query;

                    renderHomeSubjectRail();

                }

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

    buildScheduleNotifications();

    initCardSortable();
    initSigmaPanelsSortable();

    setInterval(buildScheduleNotifications, 60000);

    // Initial population
    window.populateUserProfilePage();

});

document.addEventListener('DOMContentLoaded', () => {
    const mobileAppBar = document.getElementById('mobile-bottom-appbar');
    const profileBtn = document.getElementById('mobile-appbar-profile');
    const calendarBtn = document.getElementById('mobile-appbar-calendar');
    const sigmaBtn = document.getElementById('mobile-appbar-sigma');
    const notiBtn = document.getElementById('mobile-appbar-notifications');
    const sigmaSheet = document.getElementById('mobile-sigma-sheet');
    const sigmaBackdrop = document.getElementById('mobile-sigma-sheet-backdrop');
    const sigmaClose = document.getElementById('mobile-sigma-sheet-close');
    const sigmaCards = document.getElementById('mobile-sigma-cards');
    let mobileSigmaSortable = null;

    if (!mobileAppBar || !sigmaSheet || !sigmaBackdrop || !sigmaCards) return;

    const isMobile = () => window.innerWidth <= 1023;

    const updateMobileAppBarActiveState = () => {
        if (!isMobile()) return;

        // Clear all
        [profileBtn, calendarBtn, sigmaBtn, notiBtn].forEach(btn => btn?.classList.remove('active'));

        // Priority 1: Sigma Sheet
        if (sigmaSheet && sigmaSheet.classList.contains('open')) {
            sigmaBtn?.classList.add('active');
            return;
        }

        // Priority 2: Pull-up Panels
        const openPanel = document.querySelector('.mobile-pull-up-panel.open');
        if (openPanel) {
            if (openPanel.id === 'mobile-calendar-panel') calendarBtn?.classList.add('active');
            if (openPanel.id === 'mobile-noti-panel') notiBtn?.classList.add('active');
            return;
        }

        // Priority 3: Current Visible Section (Profile)
        const profileView = document.getElementById('user-profile-view');
        if (profileView && window.getComputedStyle(profileView).display !== 'none' && !profileView.classList.contains('hidden')) {
            profileBtn?.classList.add('active');
        }
    };

    // Export to window so switchTab can call it
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
            clone.querySelectorAll('h4').forEach(title => {
                const label = title.textContent.trim();
                if (label && label === label.toUpperCase()) {
                    title.textContent = label.charAt(0) + label.slice(1).toLowerCase();
                }
                title.style.fontFamily = 'Inter, sans-serif';
                title.style.fontWeight = '700';
                title.style.letterSpacing = '0';
                title.style.textTransform = 'none';
            });
            sigmaCards.appendChild(clone);
        });
        initMobileSigmaSortable();
    };

    const initMobileSigmaSortable = () => {
        if (mobileSigmaSortable) {
            mobileSigmaSortable.destroy();
            mobileSigmaSortable = null;
        }

        if (typeof Sortable === 'undefined') return;

        mobileSigmaSortable = new Sortable(sigmaCards, {
            animation: 150,
            delay: 160,
            delayOnTouchOnly: true,
            touchStartThreshold: 6,
            forceFallback: true,
            fallbackClass: 'sortable-drag',
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            chosenClass: 'sortable-chosen',
            scroll: true,
            bubbleScroll: true,
            dataIdAttr: 'data-id',
            onEnd: () => {
                const source = document.getElementById('sigma-panels-container');
                if (!source || !mobileSigmaSortable) return;
                const sourceCards = Array.from(source.children);
                mobileSigmaSortable.toArray().forEach(id => {
                    const card = sourceCards.find(item => item.dataset.id === id);
                    if (card) source.appendChild(card);
                });
            }
        });
    };

    const openSigmaSheet = () => {
        if (!isMobile()) return;
        window.__closeMobileSidebarForOverlay?.();
        document.querySelectorAll('.mobile-pull-up-panel').forEach(p => p.classList.remove('open'));
        document.getElementById('sigmaAiPanel')?.classList.remove('open');
        document.getElementById('sigmaAiNotch')?.classList.remove('open');
        window.__pushMobileOverlayHistory?.('sigma-sheet');
        hydrateSigmaCards();
        sigmaSheet.classList.add('open');
        sigmaBackdrop.classList.add('open');
        updateMobileAppBarActiveState();
    };

    const closeSigmaSheet = () => {
        sigmaSheet.classList.remove('open');
        sigmaBackdrop.classList.remove('open');
    };

    const closeAllMobileSurfaces = () => {
        closeSigmaSheet();
        document.querySelectorAll('.mobile-pull-up-panel').forEach(p => p.classList.remove('open'));
        sigmaBackdrop.classList.remove('open');
        updateMobileAppBarActiveState();
    };

    window.closeMobilePanel = (id) => {
        document.getElementById(id)?.classList.remove('open');
        if (!sigmaSheet.classList.contains('open') && !document.querySelector('.mobile-pull-up-panel.open')) {
            document.getElementById('mobile-sigma-sheet-backdrop')?.classList.remove('open');
        }
        updateMobileAppBarActiveState();
    };

    const openMobilePanel = (id) => {
        if (!isMobile()) return;
        window.__closeMobileSidebarForOverlay?.();
        // Close others first
        document.querySelectorAll('.mobile-pull-up-panel').forEach(p => p.classList.remove('open'));
        closeSigmaSheet();
        document.getElementById('sigmaAiPanel')?.classList.remove('open');
        document.getElementById('sigmaAiNotch')?.classList.remove('open');
        window.__pushMobileOverlayHistory?.(id);

        document.getElementById(id)?.classList.add('open');
        document.getElementById('mobile-sigma-sheet-backdrop')?.classList.add('open');

        updateMobileAppBarActiveState();
    };

    profileBtn?.addEventListener('click', () => {
        closeAllMobileSurfaces();

        if (typeof window.switchTab === 'function') {
            window.switchTab('nav-profile');
        } else {
            document.getElementById('profileDropdownBtn')?.click();
        }

        updateMobileAppBarActiveState();
    });

    calendarBtn?.addEventListener('click', () => {
        if (document.getElementById('mobile-calendar-panel')?.classList.contains('open')) {
            window.closeMobilePanel('mobile-calendar-panel');
        } else {
            openMobilePanel('mobile-calendar-panel');
        }
        updateMobileAppBarActiveState();
    });

    notiBtn?.addEventListener('click', () => {
        if (document.getElementById('mobile-noti-panel')?.classList.contains('open')) {
            window.closeMobilePanel('mobile-noti-panel');
        } else {
            openMobilePanel('mobile-noti-panel');
        }
        updateMobileAppBarActiveState();
    });

    sigmaBtn?.addEventListener('click', () => {
        if (sigmaSheet.classList.contains('open')) {
            closeSigmaSheet();
        } else {
            openSigmaSheet();
        }
        updateMobileAppBarActiveState();
    });

    sigmaClose.addEventListener('click', () => {
        closeSigmaSheet();
        updateMobileAppBarActiveState();
    });

    sigmaBackdrop.addEventListener('click', () => {
        closeAllMobileSurfaces();
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

    // Make header toggles also work for mobile
    document.getElementById('noti-toggle')?.addEventListener('click', (e) => {
        if (isMobile()) {
            e.preventDefault();
            e.stopPropagation();
            openMobilePanel('mobile-noti-panel');
        }
    });

    document.getElementById('calendar-toggle')?.addEventListener('click', (e) => {
        if (isMobile()) {
            e.preventDefault();
            e.stopPropagation();
            openMobilePanel('mobile-calendar-panel');
        }
    });

    window.addEventListener('resize', () => {
        if (!isMobile()) {
            closeSigmaSheet();
            document.querySelectorAll('.mobile-pull-up-panel').forEach(p => p.classList.remove('open'));
            sigmaBackdrop.classList.remove('open');
        }
    });
});
