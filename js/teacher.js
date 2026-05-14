/* TEACHER DASHBOARD CORE LOGIC */

document.addEventListener('DOMContentLoaded', initTeacherPortal);
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    initTeacherPortal();
}

function initTeacherPortal() {
    if (window.teacherPortalInitialized) return;
    window.teacherPortalInitialized = true;

    // Disable transitions during initialization
    document.documentElement.classList.add('no-transition');

    // --- GLOBAL CONSTANTS & STATE ---
    const ANNOUNCEMENT_STORAGE_KEY = 'sigma-admin-announcements-v1';
    let activeHomeAnnouncementTab = 'all';
    window._tcAssessmentDetailIdx = null;

    const sectionMap = {
        'nav-dashboard': 'section-dashboard',
        'nav-profile': 'user-profile-view',
        'nav-classes': 'section-classes',
        'nav-subjects': 'section-subjects',
        'nav-materials': 'section-materials',
        'nav-assessments': 'section-assessments',
        'nav-grades': 'section-grades',
        'nav-analytics': 'section-analytics',
        'nav-attendance': 'section-attendance',
        'nav-topic-detail': 'section-topic-detail',
        'nav-topic-content': 'section-topic-content'
    };

    const navIdByPage = {
        'dashboard': 'nav-dashboard',
        'classes': 'nav-classes',
        'materials': 'nav-materials',
        'assessments': 'nav-assessments',
        'grades': 'nav-grades',
        'attendance': 'nav-attendance',
        'analytics': 'nav-analytics',
        'subjects': 'nav-subjects',
        'profile': 'nav-profile'
    };

    // --- BRANDING LOGO SYNC ---
    const customNavLogo = localStorage.getItem('sigma-custom-nav-logo');
    if (customNavLogo) {
        const navLogos = document.querySelectorAll('header img[alt="ICC Logo"], .sidebar img[alt="ICC Logo"]');
        navLogos.forEach(img => img.src = customNavLogo);
    }

    // --- WELCOME PANEL SYNC ---
    const welcomePanel = localStorage.getItem('sigma-welcome-panel');
    if (welcomePanel && document.getElementById('welcome-panel-teacher-img')) {
        document.getElementById('welcome-panel-teacher-img').src = welcomePanel;
    }

    const sidebar = document.getElementById('sidebar');
    const subSidebar = document.getElementById('sub-sidebar');
    const layoutWrapper = document.getElementById('layout-wrapper');
    const navLinks = document.querySelectorAll('#sidebar nav a');
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    let isMobileStatus = window.innerWidth < 1024;
    let overlay = document.getElementById('sidebar-overlay');

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

    // Close sidebar on link click (Mobile)
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth >= 1024) return;
            // Subjects: has its own overlay/toggle logic &mdash; skip
            if (link.id === 'nav-subjects') return;
            // Sections: skip when inside a room (handled by nav-classes click handler)
            if (link.id === 'nav-classes' && currentClassroomKey) return;

            const sidebar = document.getElementById('sidebar');
            const overlayEl = document.getElementById('sidebar-overlay');
            if (sidebar) sidebar.classList.remove('sidebar-visible');
            if (overlayEl) overlayEl.classList.add('hidden');
        });
    });


    // Sidebar Overlay Click
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            window.toggleSidebar();
        });
    }

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
                subSidebar.style.zIndex = '900'; // Match student portal z-index for consistency
                subSidebar.style.boxShadow = '15px 0 30px rgba(0,0,0,0.08)';
            } else {
                subSidebar.classList.remove('sub-sidebar-overlay-mode');
                subSidebar.style.zIndex = '';
                subSidebar.style.boxShadow = '';
            }
        }
    }

    window.addEventListener('resize', updateLayout);
    updateLayout();
    window.addEventListener('pageshow', () => {
        updateLayout();
        if (typeof renderTeacherAnnouncements === 'function') renderTeacherAnnouncements();
        if (typeof renderTeacherHomeDashboardPanels === 'function') renderTeacherHomeDashboardPanels();
    });
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            updateLayout();
            if (typeof renderTeacherAnnouncements === 'function') renderTeacherAnnouncements();
            if (typeof renderTeacherHomeDashboardPanels === 'function') renderTeacherHomeDashboardPanels();
        }
    });

    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.toggleSidebar();
        });
    }

    function initSubjectParentSidebar() {
        const parent = document.getElementById('nav-subjects');
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
        const getProgramSubjects = (programKey) => {
            const source = window.subjectsData || { core: [], academic: [], techpro: [], completed: [] };
            const map = {
                'core-subjects': source.core || [],
                'applied-subjects': source.academic || [],
                'specialized-subjects': source.techpro || []
            };
            return [...(map[programKey] || []), ...((programKey === 'core-subjects') ? (source.completed || []) : [])]
                .map(subject => ({ id: subject.id, label: subject.name }));
        };
        const resolveTeacherSubjectId = (programKey, subjectId, label) => {
            if (getTopicData(subjectId)) return subjectId;
            const program = curriculumPrograms[programKey];
            const direct = (program?.subjects || []).find(subject => subject.title === label || subject.text === label);
            if (direct?.id) return direct.id;
            return ensureSubjectDataForTitle(label, items.find(item => item.key === programKey)?.label || 'Subjects').id;
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
        window.resetTeacherSubjectSidebarState = () => {
            activeProgram = null;
            activeGroup = null;
            activeSubjectId = null;
            open = false;
            syncSelectedSubject();
            syncInline();
        };
        window.setTeacherActiveSubject = (id) => {
            activeSubjectId = id;
            syncSelectedSubject();
        };
        const openSubjectTopic = (programKey, subjectId, label) => {
            activeProgram = programKey;
            activeGroup = programKey;
            activeSubjectId = subjectId;

            // Close mobile sidebar when navigating to a subject
            if (window.innerWidth < 1024) {
                const sidebar = document.getElementById('sidebar');
                const sidebarOverlay = document.getElementById('sidebar-overlay');
                if (sidebar) sidebar.classList.remove('sidebar-visible');
                if (sidebarOverlay) sidebarOverlay.classList.add('hidden');
            }

            switchToTopicPage(resolveTeacherSubjectId(programKey, subjectId, label));
            activeSubjectId = subjectId;

            // Restore expanded state on desktop if needed removed

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

                    // Close mobile sidebar before navigating
                    // Close mobile sidebar removed

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
            if (!collapsed() || window.innerWidth < 1024) {
                hideOverlay();
                return;
            }

            // Topic names belong only in topic content. The topic overview page keeps the subject list.
            const isTopicContent = !document.getElementById('section-topic-content')?.classList.contains('hidden');
            const topicSubjectId = isTopicContent ? (currentTopicState.subjectId || activeSubjectId) : activeSubjectId;
            if (isTopicContent && topicSubjectId) {
                const subject = getTopicSubject(topicSubjectId);
                const data = getTopicData(topicSubjectId);
                if (subject && data) {
                    const statusIconClass = {
                        completed: 'fa-check-circle text-green-500',
                        'in-progress': 'fa-circle-half-stroke text-yellow-500',
                        'not-started': 'fa-circle text-gray-300'
                    };
                    loadTopicSubSidebar(subject, data, statusIconClass, currentTopicState.subjectId === topicSubjectId ? currentTopicState.topicIdx : null);
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
            switchTab('nav-subjects');
            requestAnimationFrame(() => {
                if (typeof window.openInlineProgramFocus === 'function') {
                    window.openInlineProgramFocus(programKey);
                }
            });
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

            // On mobile: keep sidebar open, just toggle submenu
            // switchTab('nav-subjects') removed to prevent blank page on toggle
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
            if (!collapsed() && activeSubjectId) {
                open = true;
                activeGroup = activeProgram;
            }
            if (!collapsed()) hideOverlay();
            syncInline();
            if (currentClassroomKey) {
                const [className = '', subject = ''] = currentClassroomKey.split('::');
                if (!collapsed()) {
                    renderClassroomSectionsSidebar(className, subject);
                } else {
                    syncSectionsNavState(false);
                }
            }
        };
        syncInline();
    }
    initSubjectParentSidebar();

    function initGradesParentSidebar() {
        const parent = document.getElementById('nav-grades');
        const submenu = document.getElementById('grades-submenu');
        const chevron = parent?.querySelector('.sidebar-group-chevron');
        const sidebar = document.getElementById('sidebar');
        const subSidebar = document.getElementById('sub-sidebar');
        const subContent = document.getElementById('sub-sidebar-content');
        const subTitle = document.getElementById('sub-sidebar-title');
        const subHeader = document.getElementById('sub-sidebar-header');

        if (!parent || !submenu || !subSidebar || !subContent) return;

        let open = false;
        let hoverTimer = null;
        let activeTab = null;
        const collapsed = () => document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;

        const gradesTabs = [
            { id: 'nav-grades-analytics', key: 'analytics', label: 'Performance', icon: 'fa-chart-pie' },
            { id: 'nav-grades-gradebook', key: 'gradebook', label: 'Gradebooks', icon: 'fa-table-list' }
        ];

        const syncActive = () => {
            document.querySelectorAll('#grades-submenu .nav-sublink').forEach(link => {
                link.classList.toggle('active', link.dataset.gradesTab === activeTab);
            });
        };

        const syncInline = () => {
            submenu.classList.toggle('hidden', collapsed() || !open);
            chevron?.classList.toggle('rotate-90', open);
        };

        const hideOverlay = () => {
            subSidebar.classList.add('hidden');
            subSidebar.classList.remove('sub-sidebar-visible');
        };

        const renderOverlay = () => {
            if (!collapsed() || window.innerWidth < 1024) {
                hideOverlay();
                return;
            }
            if (subTitle) subTitle.textContent = 'Grades';
            subHeader?.classList.remove('hidden');
            subContent.innerHTML = gradesTabs.map(tab => `
                <a href="#" class="subject-nav-child sub-sidebar-link grades-overlay-link ${activeTab === tab.key ? 'active' : ''}"
                   data-grades-tab="${tab.key}">
                    <i class="fa-solid ${tab.icon} subject-nav-child-icon"></i>
                    <span>${tab.label}</span>
                </a>
            `).join('');
            subContent.querySelectorAll('.grades-overlay-link').forEach(link => {
                link.addEventListener('click', event => {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    openGradesTab(link.dataset.gradesTab);
                    hideOverlay();
                });
            });
            subSidebar.classList.remove('hidden');
            subSidebar.classList.add('sub-sidebar-visible');
        };

        const openGradesTab = (tabKey) => {
            activeTab = tabKey;
            switchTab('nav-grades');
            requestAnimationFrame(() => {
                if (typeof window.switchGradesSubTab === 'function') {
                    window.switchGradesSubTab(tabKey);
                }
            });
            syncActive();
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
            syncInline();
            if (open && !activeTab) {
                // Navigate to grades on first open
                switchTab('nav-grades');
                requestAnimationFrame(() => {
                    if (typeof window.switchGradesSubTab === 'function') {
                        window.switchGradesSubTab('analytics');
                    }
                });
                activeTab = 'analytics';
                syncActive();
            }
        }, true);

        document.querySelectorAll('#grades-submenu .nav-sublink').forEach(link => {
            link.addEventListener('click', event => {
                event.preventDefault();
                event.stopImmediatePropagation();
                open = true;
                syncInline();
                openGradesTab(link.dataset.gradesTab);
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

        window.resetTeacherGradesSidebarState = () => {
            activeTab = null;
            open = false;
            syncInline();
            syncActive();
            hideOverlay();
        };

        syncInline();
    }
    initGradesParentSidebar();

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
    const announcementPadLayer = document.getElementById('announcement-pad-layer');
    const announcementPadEditor = document.getElementById('announcement-pad-editor');
    const announcementPostBtn = document.getElementById('announcement-post-btn');
    const classroomSettingsBtn = document.getElementById('classroom-quick-settings-btn');
    const classroomSettingsMenu = document.getElementById('classroom-settings-menu');
    let announcementPadRange = null;
    let classroomSortable = null;
    let sigmaSortable = null;

    // --- Navigation Setup ---
    // Header Logo Link
    const navLogoBtn = document.getElementById('nav-logo-btn');
    if (navLogoBtn) {
        navLogoBtn.onclick = () => switchTab('nav-dashboard');
    }

    // --- Curriculum 3-Panel Listeners ---
    document.querySelectorAll('.subject-path-panel[data-program-key]').forEach(panel => {
        // Avoid double-trigger: teacher.html already uses inline onclick handlers.
        if (panel.getAttribute('onclick')) return;

        panel.addEventListener('click', () => {
            const programKey = panel.dataset.programKey;
            if (!programKey) return;
            if (typeof window.openInlineProgramFocus === 'function') {
                window.openInlineProgramFocus(programKey);
            } else {
                openInlineProgramFocus(programKey);
            }
        });
    });

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
            display.textContent = `SY ${yearRange}   ${quarterText}`;
        } else if (!anyQuarterStarted) {
            display.textContent = `SY ${yearRange}   UPCOMING`;
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

    // Force reflow and re-enable transitions
    window.getComputedStyle(document.documentElement).opacity;
    document.documentElement.classList.remove('no-transition');

    // SIGMA AI Dashboard Cards (Removed)

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

        // Update header calendar icon date
        const dateEl = document.getElementById('calendar-date-number');
        if (dateEl) {
            dateEl.textContent = new Date().getDate();
        }
    }

    initCalendarEvents();

    // --- SIGMA Panels Sortable ---
    function initSigmaPanelsSortable() {
        const container = document.getElementById('sigma-panels-container');
        if (!container || typeof Sortable === 'undefined') return;

        // Load saved order
        const savedOrder = localStorage.getItem('sigma-teacher-panels-order');
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

        sigmaSortable = new Sortable(container, {
            animation: 150,
            delay: 50, // More responsive feel
            delayOnTouchOnly: false,
            touchStartThreshold: 5,
            forceFallback: true, // Match admin portal
            fallbackClass: 'sortable-drag',
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            chosenClass: 'sortable-chosen',
            scroll: true,
            dataIdAttr: 'data-id',
            onStart: () => {
                document.body.style.cursor = 'grabbing';
                container.classList.add('is-dragging');
            },
            onEnd: () => {
                document.body.style.cursor = '';
                container.classList.remove('is-dragging');
                const order = sigmaSortable.toArray();
                localStorage.setItem('sigma-teacher-panels-order', JSON.stringify(order));
            }
        });
    }
    initSigmaPanelsSortable();

    // Force layout update on load
    updateLayout();

    // --- Sample Data ---
    window.subjectsData = {
        core: [
            { id: 'core-effective-communication', name: 'Effective Communication', icon: 'fa-solid fa-comments', grade: 'Grade 11', programKey: 'core-subjects', sections: ['Grade 11 - ICT A'] },
            { id: 'core-life-and-career-skills', name: 'Life and Career Skills', icon: 'fa-solid fa-heart-circle-check', grade: 'Grade 11', programKey: 'core-subjects', sections: ['Grade 11 - ICT B'] },
            { id: 'core-general-mathematics', name: 'General Mathematics', icon: 'fa-solid fa-square-root-variable', grade: 'Grade 11', programKey: 'core-subjects', sections: ['Grade 11 - STEM A'] },
            { id: 'core-general-science', name: 'General Science', icon: 'fa-solid fa-flask', grade: 'Grade 11', programKey: 'core-subjects', sections: ['Grade 11 - STEM B'] },
            { id: 'core-history-society', name: 'Pag-aaral ng Kasaysayan at Lipunang Pilipino', icon: 'fa-solid fa-landmark', grade: 'Grade 11', programKey: 'core-subjects', sections: ['Grade 11 - HUMSS A'] }

        ],
        academic: [
            { id: 'subj-arts-1', name: 'Arts 1 - Creative Industries', icon: 'fa-solid fa-palette', grade: 'Grade 11', programKey: 'applied-subjects', sections: ['Grade 11 - Arts A'] },
            { id: 'subj-lit-1', name: 'Contemporary Literature 1', icon: 'fa-solid fa-book-open', grade: 'Grade 11', programKey: 'applied-subjects', sections: ['Grade 11 - HUMSS B'] },
            { id: 'subj-civic', name: 'Citizenship and Civic Engagement', icon: 'fa-solid fa-people-arrows', grade: 'Grade 12', programKey: 'applied-subjects', sections: ['Grade 12 - GAS A'] }
        ],
        techpro: [
            { id: 'subj-prog1', name: 'Programming 1', icon: 'fa-solid fa-code', grade: 'Grade 11', programKey: 'specialized-subjects', sections: ['Grade 11 - ICT C'] },
            { id: 'subj-dbms', name: 'Database Management', icon: 'fa-solid fa-database', grade: 'Grade 11', programKey: 'specialized-subjects', sections: ['Grade 11 - ICT D'] },
            { id: 'subj-css', name: 'Computer Systems Servicing', icon: 'fa-solid fa-screwdriver-wrench', grade: 'Grade 11', programKey: 'specialized-subjects', sections: ['Grade 11 - ICT E'] },
            { id: 'subj-anim', name: 'Animation', icon: 'fa-solid fa-clapperboard', grade: 'Grade 11', programKey: 'specialized-subjects', sections: ['Grade 11 - ICT F'] }
        ],
        completed: []
    };

    const currentStudentCurriculumLabel = 'MATATAG Curriculum';

    const curriculumPrograms = {
        'core-subjects': {
            title: 'Core Subjects',
            kicker: 'Shared Foundation',
            image: 'image/core-subjects.jpg',
            overview: 'Core subjects build the shared academic foundation for every learner through communication, mathematics, science, life readiness, and society-focused learning before students move deeper into specialized study.',
            subjects: [
                { id: 'core-effective-communication', title: 'Effective Communication', overview: 'Speech, writing, listening, and communication for academic and real-life use.', image: 'image/book1.jpg' },
                { id: 'core-life-and-career-skills', title: 'Life and Career Skills', overview: 'Career planning, self-management, and workplace readiness.', image: 'image/book4.jpg' },
                { id: 'core-general-mathematics', title: 'General Mathematics', overview: 'Functions, interest, business math, and logical problem solving.', image: 'image/book2.jpg' },
                { id: 'core-general-science', title: 'General Science', overview: 'Earth systems, life science, matter, energy, and scientific reasoning.', image: 'image/book3.jpg' },
                { id: 'core-history-society', title: 'Pag-aaral ng Kasaysayan at Lipunang Pilipino', overview: 'Philippine society, governance, citizenship, and historical identity.', image: 'image/book5.jpg' }
            ]
        },
        'applied-subjects': {
            title: 'Applied Subjects',
            kicker: currentStudentCurriculumLabel,
            image: 'image/academic-track.jpg',
            overview: 'Practical subjects that develop essential skills and competencies across various tracks, focusing on real-world applications of learning.',
            k12Groups: [
                { key: 'k12-stem', title: 'STEM Strand', track: 'Academic Track', image: 'image/academic-track.jpg', sourceKeys: ['acad-stem'] },
                { key: 'k12-abm', title: 'ABM Strand', track: 'Academic Track', image: 'image/book6.jpg', sourceKeys: ['acad-business'] },
                { key: 'k12-humss', title: 'HUMSS Strand', track: 'Academic Track', image: 'image/book7.jpg', sourceKeys: ['acad-arts-social'] },
                { key: 'k12-gas', title: 'GAS Strand', track: 'Academic Track', image: 'image/book5.jpg', sourceKeys: ['acad-field-exp', 'acad-sports-wellness'] },
                { key: 'k12-ict', title: 'ICT Strand', track: 'TVL Track', image: 'image/techpro-track.jpg', sourceKeys: ['tech-ict'] },
                { key: 'k12-he', title: 'Home Economics Strand', track: 'TVL Track', image: 'image/book2.jpg', sourceKeys: ['tech-hospitality', 'tech-aesthetic'] },
                { key: 'k12-ia', title: 'Industrial Arts Strand', track: 'TVL Track', image: 'image/book3.jpg', sourceKeys: ['tech-construction', 'tech-industrial', 'tech-automotive'] },
                { key: 'k12-afa', title: 'Agri-Fishery Arts Strand', track: 'TVL Track', image: 'image/book5.jpg', sourceKeys: ['tech-agri'] },
                { key: 'k12-sports', title: 'Sports Track', track: 'Sports Track', image: 'image/book4.jpg', sourceKeys: ['acad-sports-wellness'] },
                { key: 'k12-arts', title: 'Arts and Design Track', track: 'Arts and Design Track', image: 'image/book1.jpg', sourceKeys: ['tech-creative-media', 'acad-arts-social'] }
            ],
            clusters: [
                {
                    key: 'acad-arts-social',
                    track: 'Academic Track',
                    title: 'Arts, Social Sciences, and Humanities',
                    overview: 'Learners explore creative expression, literature, citizenship, and human-centered inquiry in this cluster.',
                    image: 'image/book7.jpg',
                    subjectCount: 5,
                    subjects: [
                        'Arts 1 - Creative Industries',
                        'Contemporary Literature 1',
                        'Citizenship and Civic Engagement',
                        'Philippine Politics and Governance',
                        'Biology 1'
                    ]
                },
                {
                    key: 'acad-stem',
                    track: 'Academic Track',
                    title: 'Science, Technology, Engineering, and Mathematics',
                    overview: 'Students focus on analytical thinking, scientific exploration, and math-centered preparation for technical paths.',
                    image: 'image/book2.jpg',
                    subjectCount: 5,
                    subjects: [
                        'General Mathematics',
                        'General Science',
                        'Biology 1',
                        'Finite Mathematics 1',
                        'Physics 1'
                    ]
                },
                {
                    key: 'acad-sports-wellness',
                    track: 'Academic Track',
                    title: 'Sports, Health, and Wellness',
                    overview: 'This cluster highlights physical literacy, health learning, and well-being related study paths.',
                    image: 'image/book4.jpg',
                    subjectCount: 4,
                    subjects: [
                        'Human Movement 1',
                        'Physical Education 1',
                        'Health and Wellness Foundations',
                        'Fitness and Recreation'
                    ]
                },
                {
                    key: 'acad-business',
                    track: 'Academic Track',
                    title: 'Business and Entrepreneurship',
                    overview: 'Learners develop business awareness, enterprise thinking, and decision-making for work and livelihood.',
                    image: 'image/book6.jpg',
                    subjectCount: 4,
                    subjects: [
                        'Business Math',
                        'Entrepreneurship Fundamentals',
                        'Applied Economics',
                        'Financial Literacy'
                    ]
                },
                {
                    key: 'acad-field-exp',
                    track: 'Academic Track',
                    title: 'Field Experience',
                    overview: 'This cluster centers on practical application, exposure, and field-based learning experiences.',
                    image: 'image/book5.jpg',
                    subjectCount: 3,
                    subjects: [
                        'Field Research',
                        'Community Immersion',
                        'Applied Project Work'
                    ]
                },
                { key: 'tech-aesthetic', track: 'TechPro Track', title: 'Aesthetic, Wellness, and Human Care', overview: 'Hands-on learning for care, service, and wellness-related work.', image: 'image/book4.jpg', subjectCount: 4, subjects: ['Contact Center Services', 'Health Care Fundamentals', 'Beauty and Wellness Services', 'Caregiving Basics'] },
                { key: 'tech-agri', track: 'TechPro Track', title: 'Agri-Fishery Business and Food Innovation', overview: 'Skills for agriculture, food handling, and production work.', image: 'image/book5.jpg', subjectCount: 4, subjects: ['Agri-Food Processing', 'Crop Production', 'Fishery Basics', 'Food Innovation'] },
                { key: 'tech-artisanry', track: 'TechPro Track', title: 'Artisanry and Creative Enterprise', overview: 'Creative production and enterprise-based craft learning.', image: 'image/book7.jpg', subjectCount: 4, subjects: ['Creative Design', 'Artisan Product Development', 'Visual Merchandising', 'Small Creative Business'] },
                { key: 'tech-automotive', track: 'TechPro Track', title: 'Automotive and Small Engine Technologies', overview: 'Technical work focused on vehicles, engines, and maintenance systems.', image: 'image/book3.jpg', subjectCount: 4, subjects: ['Automotive Servicing', 'Engine Troubleshooting', 'Maintenance Procedures', 'Safety and Diagnostics'] },
                { key: 'tech-construction', track: 'TechPro Track', title: 'Construction and Building Technologies', overview: 'Practical building, installation, and construction skills for technical work.', image: 'image/book6.jpg', subjectCount: 4, subjects: ['Construction Basics', 'Tool Handling', 'Blueprint Reading', 'Site Safety'] },
                { key: 'tech-creative-media', track: 'TechPro Track', title: 'Creative Arts and Design Technologies', overview: 'Digital design, media production, and creative content work.', image: 'image/book1.jpg', subjectCount: 4, subjects: ['Graphic Design', 'Layout Production', 'Digital Illustration', 'Media Design'] },
                { key: 'tech-hospitality', track: 'TechPro Track', title: 'Hospitality and Tourism', overview: 'Service, customer care, and tourism operations learning.', image: 'image/book2.jpg', subjectCount: 4, subjects: ['Front Office Services', 'Food and Beverage', 'Tourism Basics', 'Guest Service'] },
                { key: 'tech-industrial', track: 'TechPro Track', title: 'Industrial Technologies', overview: 'Machine handling, production support, and technical systems skills.', image: 'image/book3.jpg', subjectCount: 4, subjects: ['Machine Operations', 'Industrial Safety', 'Basic Fabrication', 'Workshop Practice'] },
                { key: 'tech-maritime', track: 'TechPro Track', title: 'Maritime Transport', overview: 'Sea transport, navigation basics, and marine safety learning.', image: 'image/book5.jpg', subjectCount: 4, subjects: ['Navigation Basics', 'Marine Safety', 'Deck Operations', 'Maritime Communications'] },
                { key: 'tech-ict', track: 'TechPro Track', title: 'ICT Support and Computer Programming Technologies', overview: 'Digital systems, support work, networking, and programming learning.', image: 'image/book8.jpg', subjectCount: 5, subjects: ['Broadband Installation', 'Computer Programming - Java', 'Computer Systems Servicing', 'Electrical Installation Maintenance', 'Contact Center Services'] }
            ]
        },
        'specialized-subjects': {
            title: 'Specialized Subjects',
            kicker: 'Field Mastery',
            image: 'image/work-immersion.jpg',
            overview: 'Advanced subjects specific to your chosen strand, providing in-depth knowledge and specialized training for your future career path.',
            stages: [
                { key: 'immersion-stage-1', title: 'Pre-Immersion', overview: 'Orientation, clearance, forms, and worksite readiness requirements.', image: 'image/book6.jpg', requirements: ['Orientation', 'Clearance', 'Forms', 'Safety Rules'] },
                { key: 'immersion-stage-2', title: 'Immersion Proper', overview: 'Supervised performance with logs, tasks, and supervisor monitoring.', image: 'image/book7.jpg', requirements: ['Attendance Logs', 'Assigned Tasks', 'Supervisor Feedback', 'Output Documentation'] },
                { key: 'immersion-stage-3', title: 'Post-Immersion', overview: 'Reflection, portfolio building, and final presentation requirements.', image: 'image/book8.jpg', requirements: ['Reflection Journal', 'Portfolio', 'Final Evaluation', 'Presentation'] }
            ]
        }
    };

    const curriculumTopicCatalog = {
        'core-effective-communication': {
            text: 'Effective Communication',
            subtitle: 'Core Subject &bull; Grade 11',
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
            subtitle: 'Core Subject &bull; Grade 11',
            instructor: 'DepEd Core Curriculum',
            icon: 'fa-solid fa-heart-circle-check',
            bg: 'image/book4.jpg',
            q1Percent: 85,
            q2Percent: 60,
            q3Percent: 0,
            q4Percent: 0,
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
            subtitle: 'Core Subject &bull; Grade 11',
            instructor: 'DepEd Core Curriculum',
            icon: 'fa-solid fa-square-root-variable',
            bg: 'image/book2.jpg',
            q1Percent: 92,
            q2Percent: 75,
            q3Percent: 40,
            q4Percent: 0,
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
            subtitle: 'Core Subject &bull; Grade 11',
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
        'subj-prog1': {
            text: 'Programming 1',
            subtitle: 'Applied Subject &bull; Grade 11',
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
            ]
        },
        'subj-dbms': {
            text: 'Database Management',
            subtitle: 'Specialized Subject • Grade 11',
            instructor: 'TechPro Faculty',
            icon: 'fa-solid fa-database',
            bg: 'image/techpro-track.jpg',
            q1Percent: 85,
            q2Percent: 0,
            summary: 'Fundamentals of database design, SQL, and data management systems.',
            q1Topics: [
                { title: 'Introduction to Databases', status: 'completed' },
                { title: 'Entity Relationship Modeling', status: 'completed' },
                { title: 'SQL Basics', status: 'in-progress' }
            ]
        },
        'subj-css': {
            text: 'Computer Systems Servicing',
            subtitle: 'Specialized Subject • Grade 11',
            instructor: 'TechPro Faculty',
            icon: 'fa-solid fa-screwdriver-wrench',
            bg: 'image/techpro-track.jpg',
            q1Percent: 90,
            q2Percent: 0,
            summary: 'Installing and configuring computer systems, networking, and hardware maintenance.',
            q1Topics: [
                { title: 'Course Overview', status: 'completed' },
                { title: 'Basic Logic', status: 'completed' },
                { title: 'Principles of Writing', status: 'in-progress' },
                { title: 'Speech Context', status: 'not-started' }
            ]
        },
        'subj-lit-1': {
            text: 'Contemporary Literature 1',
            subtitle: 'Applied Subject • Grade 11',
            instructor: 'Arts Faculty',
            icon: 'fa-solid fa-book-open',
            bg: 'image/book1.jpg',
            q1Percent: 70,
            q2Percent: 0,
            summary: 'Exploring modern literature, critical analysis, and creative expression.',
            q1Topics: [
                { title: 'Modern Literary Movements', status: 'completed' },
                { title: 'Analyzing Prose', status: 'in-progress' },
                { title: 'Creative Writing Workshop', status: 'not-started' }
            ]
        },
        'subj-arts-1': {
            text: 'Arts 1 - Creative Industries',
            subtitle: 'Applied Subject • Grade 11',
            instructor: 'Arts Faculty',
            icon: 'fa-solid fa-palette',
            bg: 'image/book2.jpg',
            q1Percent: 88,
            q2Percent: 0,
            summary: 'Introduction to the creative industries, visual arts, and design principles.',
            q1Topics: [
                { title: 'Visual Arts Fundamentals', status: 'completed' },
                { title: 'Graphic Design Basics', status: 'in-progress' },
                { title: 'Digital Illustration', status: 'not-started' }
            ]
        },
        'subj-civic': {
            text: 'Citizenship and Civic Engagement',
            subtitle: 'Applied Subject • Grade 12',
            instructor: 'Social Science Faculty',
            icon: 'fa-solid fa-people-arrows',
            bg: 'image/book3.jpg',
            q1Percent: 95,
            q2Percent: 0,
            summary: 'Understanding civic duties, governance, and active community participation.',
            q1Topics: [
                { title: 'Foundations of Citizenship', status: 'completed' },
                { title: 'Community Organizing', status: 'in-progress' },
                { title: 'Public Policy Analysis', status: 'not-started' }
            ]
        },
        'subj-anim': {
            text: 'Animation',
            subtitle: 'Specialized Subject • Grade 11',
            instructor: 'Alex Reyes',
            icon: 'fa-solid fa-clapperboard',
            bg: 'image/techpro-track.jpg',
            q1Percent: 80,
            q2Percent: 45,
            q3Percent: 0,
            q4Percent: 0,
            summary: 'A comprehensive course on animation techniques, covering principles, 2D/3D character design, and visual effects.',
            q1Topics: [
                { title: 'Principles of Animation', status: 'completed' },
                { title: 'Storyboarding Basics', status: 'completed' },
                { title: 'History of Animation', status: 'completed' }
            ],
            q2Topics: [
                { title: '2D Character Design', status: 'completed' },
                { title: 'Frame-by-Frame Techniques', status: 'in-progress' },
                { title: 'Digital Ink and Paint', status: 'not-started' }
            ],
            q3Topics: [
                { title: '3D Modeling Fundamentals', status: 'not-started' },
                { title: 'Texturing and Lighting', status: 'not-started' },
                { title: 'Keyframe Animation', status: 'not-started' }
            ],
            q4Topics: [
                { title: 'Visual Effects (VFX)', status: 'not-started' },
                { title: 'Compositing and Rendering', status: 'not-started' },
                { title: 'Final Short Film Project', status: 'not-started' }
            ]
        },
        'core-history-society': {
            text: 'Pag-aaral ng Kasaysayan at Lipunang Pilipino',
            subtitle: 'Core Subject &bull; Grade 11',
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
        }
    };

    const dynamicCurriculumSubjects = {};

    const topicVideos = {
        default: [
            { id: 1, title: 'Lecture 1: Introduction & Overview', duration: '24:15', teacher: 'Alex Reyes', thumb: null, url: '' },
            { id: 2, title: 'Lecture 2: Core Concepts Explained', duration: '18:42', teacher: 'Alex Reyes', thumb: null, url: '' },
            { id: 3, title: 'Lecture 3: Practical Demonstration', duration: '31:08', teacher: 'Alex Reyes', thumb: null, url: '' },
        ]
    };

    function getTopicOverview(title) {
        const o = {
            'Introduction to Java': 'Learn Java syntax, data types, and basic program structure.',
            'Variables & Data Types': 'Explore how Java stores and manages different kinds of data.',
            'Control Structures': 'Master program flow using conditions and loop constructs.',
            'Methods & Functions': 'Organize code into reusable blocks using method declarations.',
            'Arrays & Collections': 'Work with ordered data using arrays and Java collection classes.',
            'Object-Oriented Programming': 'Apply OOP concepts: classes, objects, encapsulation, abstraction.',
            'HTML5 Fundamentals': 'Build well-structured web pages using semantic HTML5 elements.',
            'CSS3 & Flexbox': 'Style web layouts with modern CSS3 and the flexible box model.',
            'Number Systems & Binary': 'Understand binary, octal, hex and their conversions.',
            'CPU Architecture': 'Explore how the CPU executes instructions and manages data.',
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
            'Political Ideologies and Social Change': 'Compare political ideas and the social changes they can influence.'
        };
        return o[title] || 'This topic covers key concepts and practical applications essential to mastering this subject.';
    }

    const topicHandouts = {
        'core-effective-communication': [
            { name: 'Comm Basics.pdf', size: '1.2 MB', type: 'PDF', url: 'text/07_Laboratory_Exercise_1(23).pdf' },
            { name: 'Response Letter.docx', size: '320 KB', type: 'DOCX', url: 'text/Response Letter.docx' },
            { name: 'TLE Presentation.pptx', size: '4.1 MB', type: 'PPTX', url: 'text/TLE.pptx' }
        ]
    };

    let currentInlineProgram = null;
    let currentCurriculumProgram = null;
    let currentCurriculumCluster = null;
    let inlineAnimationToken = 0;
    let inlineAnimationTimers = [];

    function setSubjectsPageScrollLocked(locked) {
        // Standardize: Main scrollbar should always be visible/available
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
    }

    function getTopicData(subjectId) {
        let data = curriculumTopicCatalog[subjectId] || dynamicCurriculumSubjects[subjectId];
        
        // Failsafe: If data is missing but the subject is valid, generate fallback topics
        // so the workstation page can still render and link correctly.
        if (!data) {
            const subject = getTopicSubject(subjectId);
            if (subject) {
                data = {
                    text: subject.name || subject.title || 'Subject Content',
                    subtitle: (subject.grade || 'Grade 11') + ' • ' + (subject.programKey === 'specialized-subjects' ? 'Specialized' : 'Applied') + ' Subject',
                    instructor: 'Faculty',
                    icon: subject.icon || 'fa-solid fa-book-open',
                    bg: 'image/book1.jpg',
                    q1Topics: [
                        { title: 'Course Overview', status: 'completed' },
                        { title: 'Basic Logic', status: 'completed' },
                        { title: 'Principles of Writing', status: 'in-progress' },
                        { title: 'Speech Context', status: 'not-started' }
                    ]
                };
                dynamicCurriculumSubjects[subjectId] = data;
            }
        }
        return data || null;
    }

    function getTopicSubject(subjectId) {
        const programSubjects = [];
        Object.values(curriculumPrograms).forEach(p => {
            if (p.subjects) programSubjects.push(...p.subjects);
            if (p.stages) programSubjects.push(...p.stages);
        });
        const exactMatch = programSubjects.find(s => (s.id === subjectId || s.key === subjectId));
        if (exactMatch) return { ...exactMatch, name: exactMatch.title || exactMatch.text || exactMatch.name };

        // Fallback 1: Check window.subjectsData (Assigned subjects)
        const allAssigned = Object.values(window.subjectsData || {}).flat();
        const assignedMatch = allAssigned.find(s => s.id === subjectId);
        if (assignedMatch) return assignedMatch;

        // Fallback 2: Check curriculumTopicCatalog (Catalog entries)
        const catalogEntry = curriculumTopicCatalog[subjectId];
        if (catalogEntry) return { id: subjectId, name: catalogEntry.text, icon: catalogEntry.icon };

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
                subtitle: `${clusterTitle} &bull; Grade 11`,
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
                ]
            };
        }
        return dynamicCurriculumSubjects[subjectId];
    }

    // Add specialized subjects stages to the catalog for completeness
    curriculumTopicCatalog['immersion-stage-1'] = {
        text: 'Pre-Immersion',
        subtitle: 'Specialized Stage &bull; Grade 12',
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
    };
    curriculumTopicCatalog['immersion-stage-2'] = {
        text: 'Immersion Proper',
        subtitle: 'Specialized Stage &bull; Grade 12',
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
    };
    curriculumTopicCatalog['immersion-stage-3'] = {
        text: 'Post-Immersion',
        subtitle: 'Specialized Stage &bull; Grade 12',
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
    };

    function slugify(text) {
        return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }


    const sectionNames = [
        'Grade 11 - ICT A', 'Grade 11 - ICT B', 'Grade 11 - ICT C', 'Grade 11 - ICT D',
        'Grade 11 - ICT E', 'Grade 11 - ICT F', 'Grade 11 - STEM A', 'Grade 11 - STEM B',
        'Grade 11 - HUMSS A', 'Grade 11 - HUMSS B', 'Grade 11 - Arts A', 'Grade 12 - GAS A',
        'Grade 10 - ICT A'
    ];

    const studentsBySection = {};
    sectionNames.forEach(section => {
        studentsBySection[section] = Array.from({ length: 25 }, (_, i) => {
            const lastNames = ['Vargas', 'Santos', 'Reyes', 'Mercado', 'Lim', 'Lopez', 'Garcia', 'Dizon', 'Castro', 'Aquino', 'Santiago', 'Pascual', 'Mendoza', 'Luna', 'Jose', 'Gomez', 'Flores', 'Estacio', 'Diaz', 'Cruz', 'Bautista', 'Arroyo', 'Alvarez', 'Abad', 'Zosa'];
            const firstNames = ['Stanley', 'John', 'Jane', 'Mary', 'Mark', 'Paul', 'Anna', 'Beth', 'Cathy', 'Dave', 'Eric', 'Fay', 'Gary', 'Hope', 'Ian', 'Jill', 'Ken', 'Lea', 'Mike', 'Noel', 'Oma', 'Pete', 'Quinn', 'Rose', 'Seth'];
            const middleNames = ['Vargas', 'Peralta', 'Delos Santos', 'Ramos', 'Guanzon', 'Dela Cruz', 'Marasigan', 'Bautista', 'Corpuz', 'Ocampo', 'Ignacio', 'Rivera', 'Soriano', 'Villanueva', 'Gonzales', 'Pineda', 'Roxas', 'Belmonte', 'Pangilinan', 'Estrada', 'Recto', 'Aquino', 'Legarda', 'Lapid', 'Binay'];

            const lastName = lastNames[i % 25];
            const firstName = firstNames[i % 25];
            const middleName = middleNames[i % 25];

            return {
                id: `2026-${section.split(' ').pop()}-${String(i + 1).padStart(3, '0')}`,
                name: `${lastName}, ${firstName}`,
                status: 'Active',
                attendance: 90 + (i % 10)
            };
        });
    });

    const classroomMetaBySubject = {
        'Grade 11 - ICT A::Programming 1': { room: 'Room 302', teacher: 'Alex Reyes' },
        'Grade 11 - ICT A::Database Management': { room: 'Lab 2', teacher: 'Sarah Lim' },
        'Grade 11 - STEM A::General Mathematics': { room: 'Room 406', teacher: 'Elena Cruz' },
        'Grade 11 - ICT B::Animation': { room: 'Lab 3', teacher: 'Paolo Santos' },
        'Grade 11 - ICT A::Effective Communication': { room: 'Room 301', teacher: 'Elena Reyes' },
        'Grade 11 - ICT B::Life and Career Skills': { room: 'Room 310', teacher: 'Elena Reyes' },
        'Grade 11 - STEM B::General Science': { room: 'Room 304', teacher: 'Elena Reyes' },
        'Grade 11 - HUMSS A::Pag-aaral ng Kasaysayan at Lipunang Pilipino': { room: 'Room 311', teacher: 'Elena Reyes' },
        'Grade 11 - Arts A::Arts 1 - Creative Industries': { room: 'Room 305', teacher: 'Elena Reyes' },
        'Grade 11 - HUMSS B::Contemporary Literature 1': { room: 'Room 306', teacher: 'Elena Reyes' },
        'Grade 12 - GAS A::Citizenship and Civic Engagement': { room: 'Room 307', teacher: 'Elena Reyes' },
        'Grade 11 - ICT C::Programming 1': { room: 'Room 312', teacher: 'Elena Reyes' },
        'Grade 11 - ICT D::Database Management': { room: 'Room 313', teacher: 'Elena Reyes' },
        'Grade 11 - ICT E::Computer Systems Servicing': { room: 'Lab 4', teacher: 'Elena Reyes' },
        'Grade 11 - ICT F::Animation': { room: 'Lab 5', teacher: 'Elena Reyes' },
        'Grade 10 - ICT A::Intro to ICT': { room: 'Room 309', teacher: 'Elena Reyes' }
    };

    const classroomScheduleBySubject = {
        'Grade 11 - ICT A::Programming 1': 'Mon / Wed / Fri   8:00   9:30 AM',
        'Grade 11 - ICT A::Database Management': 'Mon / Wed   11:30 AM   1:00 PM',
        'Grade 11 - STEM A::General Mathematics': 'Mon / Wed / Fri   1:00   2:30 PM',
        'Grade 11 - ICT B::Animation': 'Tue / Thu   1:30   3:00 PM',
        'Grade 11 - ICT A::Effective Communication': 'Tue / Thu   8:00   9:30 AM',
        'Grade 11 - ICT B::Life and Career Skills': 'Mon / Wed   9:45   11:15 AM',
        'Grade 11 - STEM B::General Science': 'Tue / Thu   10:30 AM   12:00 PM',
        'Grade 11 - HUMSS A::Pag-aaral ng Kasaysayan at Lipunang Pilipino': 'Mon / Wed   3:15   4:45 PM',
        'Grade 11 - Arts A::Arts 1 - Creative Industries': 'Tue / Thu   1:30   3:00 PM',
        'Grade 11 - HUMSS B::Contemporary Literature 1': 'Tue / Thu   10:30 AM   12:00 PM',
        'Grade 12 - GAS A::Citizenship and Civic Engagement': 'Mon / Wed   1:00   2:30 PM',
        'Grade 11 - ICT C::Programming 1': 'Mon / Wed / Fri   8:00   9:30 AM',
        'Grade 11 - ICT D::Database Management': 'Mon / Wed   11:30 AM   1:00 PM',
        'Grade 11 - ICT E::Computer Systems Servicing': 'Tue / Thu   9:45   11:15 AM',
        'Grade 11 - ICT F::Animation': 'Tue / Thu   1:30   3:00 PM',
        'Grade 10 - ICT A::Intro to ICT': 'Mon / Wed / Fri   10:00   11:30 AM'
    };

    const SHARED_ANNOUNCEMENTS_KEY = 'sigma-room-announcements-v1';

    const SHARED_ATTENDANCE_RECORDS_KEY = 'sigma-attendance-records-v1';
    const SHARED_COMMENT_MODE_KEY = 'sigma-room-comment-mode-v1';
    const SHARED_ANNOUNCEMENT_COMMENTS_KEY = 'sigma-room-announcement-comments-v1';
    const ADMIN_SUBJECTS_STORAGE_KEY = 'sigma-admin-subjects';

    function loadSharedState(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch {
            return fallback;
        }
    }

    function saveSharedState(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
        }
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

    function applyClassroomBannerCover(subjectName) {
        const banner = document.querySelector('.classroom-detail-banner');
        const bannerImage = banner?.querySelector('img');
        if (!banner || !bannerImage) return;

        const config = getAdminSubjectCoverConfig(subjectName);
        const hasCover = Boolean(config?.cover);
        const isVisible = config?.coverVisibleToUsers !== false;

        if (hasCover && isVisible) {
            bannerImage.src = config.cover;
            bannerImage.style.display = 'block';
            return;
        }

        if (config && !isVisible) {
            bannerImage.style.display = 'none';
            return;
        }

        // Assign book1–book8 deterministically by subject name
        const bookImages = ['image/book1.jpg', 'image/book2.jpg', 'image/book3.jpg', 'image/book4.jpg',
            'image/book5.jpg', 'image/book6.jpg', 'image/book7.jpg', 'image/book8.jpg'];
        let nameHash = 0;
        for (let i = 0; i < subjectName.length; i++) nameHash += subjectName.charCodeAt(i);
        bannerImage.src = bookImages[nameHash % bookImages.length];
        bannerImage.style.display = 'block';
    }

    let currentClassroomMeta = null;
    let currentClassroomKey = '';
    let currentClassroomSectionName = '';
    let announcementPostsByClassroom = loadSharedState(SHARED_ANNOUNCEMENTS_KEY, {});

    // Seed mock teacher post for General Mathematics if missing
    if (!announcementPostsByClassroom['Grade 11 - STEM A::General Mathematics'] || announcementPostsByClassroom['Grade 11 - STEM A::General Mathematics'].length === 0) {
        announcementPostsByClassroom['Grade 11 - STEM A::General Mathematics'] = [
            {
                id: 'genmath-mock-' + Date.now(),
                text: 'Please complete the exercise on Rational Functions by tomorrow. This will be the basis for our next discussion.',
                author: 'Jose Santos',
                timestamp: new Date(Date.now() - 86400000).toISOString(),
                type: 'regular'
            }
        ];
        saveSharedState(SHARED_ANNOUNCEMENTS_KEY, announcementPostsByClassroom);
    }

    let attendanceRecordsByClassroom = loadSharedState(SHARED_ATTENDANCE_RECORDS_KEY, {});
    let commentModeByClassroom = loadSharedState(SHARED_COMMENT_MODE_KEY, {});
    let announcementCommentsByClassroom = loadSharedState(SHARED_ANNOUNCEMENT_COMMENTS_KEY, {});

    let attendanceViewingMonth = new Date().getMonth();
    let attendanceViewingYear = new Date().getFullYear();
    let expandedAttendanceCol = -1; // 1-based day index
    let attendanceLastScrollLeft = -1; // Persistent scroll position, -1 means fresh month/tab

    window.navAttendanceMonth = function (dir) {
        attendanceViewingMonth += dir;
        if (attendanceViewingMonth > 11) {
            attendanceViewingMonth = 0;
            attendanceViewingYear++;
        } else if (attendanceViewingMonth < 0) {
            attendanceViewingMonth = 11;
            attendanceViewingYear--;
        }
        expandedAttendanceCol = -1; // Reset expansion on month change
        renderClassroomAttendanceTab(true);
    };

    window.toggleAttendanceExpansion = function (day) {
        let shouldScroll = false;
        if (expandedAttendanceCol === day) {
            expandedAttendanceCol = -1;
            shouldScroll = false; // Stay here when closing
        } else {
            expandedAttendanceCol = day;
            shouldScroll = true; // Scroll to front when opening
        }
        renderClassroomAttendanceTab(shouldScroll);
    };

    window.setAttendanceStatus = function (studentName, dateString, status, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const statuses = getCurrentAttendanceStatuses(dateString);

        // If the same status is clicked again, clear it (toggle behavior)
        if (statuses[studentName] === status) {
            statuses[studentName] = '';
        } else {
            statuses[studentName] = status;
        }

        saveCurrentAttendanceStatuses(statuses, dateString);
        renderClassroomAttendanceTab(false); // Do not scroll when marking
    };

    function renderClassroomAttendanceTab(shouldScroll = false) {
        const container = document.getElementById('detail-section-attendance');
        if (!container) return;

        // Capture current scroll position from the actual DOM if it exists
        // Only restore if we are NOT doing a fresh scroll-to-today
        const oldSlider = container.querySelector('.attendance-grid-container');
        if (oldSlider && !shouldScroll) {
            attendanceLastScrollLeft = oldSlider.scrollLeft;
        }

        const students = (studentsBySection[currentClassroomSectionName] || [])
            .sort((a, b) => a.name.localeCompare(b.name));
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const daysInMonth = new Date(attendanceViewingYear, attendanceViewingMonth + 1, 0).getDate();

        let html = `
            <div class="attendance-monthly-card">
                <div class="attendance-monthly-header flex items-center justify-between w-full">
                    <button class="attendance-month-btn" onclick="window.navAttendanceMonth(-1)">
                        <i class="fa-solid fa-chevron-left text-xs"></i>
                    </button>
                    <span class="attendance-month-display">
                        ${monthNames[attendanceViewingMonth]} ${attendanceViewingYear}
                    </span>
                    <button class="attendance-month-btn" onclick="window.navAttendanceMonth(1)">
                        <i class="fa-solid fa-chevron-right text-xs"></i>
                    </button>
                </div>
                <div class="attendance-grid-container">
                    <table class="attendance-month-table font-['Inter'] text-black">
                        <thead>
                            <tr>
                                <th class="student-name-col">Students</th>
                                ${Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const date = new Date(attendanceViewingYear, attendanceViewingMonth, day);
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            const label = `${m}/${d}`;
            const isExpanded = expandedAttendanceCol === day;
            return `<th class="day-col ${isExpanded ? 'is-expanded' : ''}" onclick="window.toggleAttendanceExpansion(${day})">${label}</th>`;
        }).join('')}
                            </tr>
                        </thead>
                        <tbody>
        `;

        students.forEach(student => {
            const nameParts = student.name.split(', ');
            const lastName = nameParts[0];
            const firstNameFirstPart = nameParts[1] ? nameParts[1].split(' ')[0] : '';
            const displayName = `${lastName}, ${firstNameFirstPart}`;

            html += `
                <tr>
                    <td class="student-name-col">
                        <div class="flex items-center gap-3">
                            <span class="text-[11px] md:text-[13px] font-bold text-black line-clamp-1">${displayName}</span>
                        </div>
                    </td>`;
            for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(attendanceViewingYear, attendanceViewingMonth, d);
                const dateString = date.toISOString().split('T')[0];
                const status = getCurrentAttendanceStatuses(dateString)[student.name] || '';
                const statusClass = status ? `status-${status.toLowerCase()}` : '';
                const isExpanded = expandedAttendanceCol === d;

                html += `
                    <td class="day-col ${isExpanded ? 'is-expanded' : ''}">
                        <div class="attendance-day-cell ${isExpanded ? 'is-expanded' : ''} ${statusClass}" 
                             onclick="${!isExpanded ? `window.toggleAttendanceExpansion(${d})` : ''}">
                            ${isExpanded ? (
                        status ? `
                                    <div class="attendance-selected-label ${statusClass}" onclick="window.setAttendanceStatus('${student.name.replace(/'/g, "\\'")}', '${dateString}', '${status}', event)">
                                        ${status === 'P' ? 'Present' : status === 'A' ? 'Absent' : 'Late'}
                                    </div>
                                ` : `
                                    <div class="attendance-opt-container">
                                        <button class="attendance-opt-btn p-btn" onclick="window.setAttendanceStatus('${student.name.replace(/'/g, "\\'")}', '${dateString}', 'P', event)">P</button>
                                        <button class="attendance-opt-btn a-btn" onclick="window.setAttendanceStatus('${student.name.replace(/'/g, "\\'")}', '${dateString}', 'A', event)">A</button>
                                        <button class="attendance-opt-btn l-btn" onclick="window.setAttendanceStatus('${student.name.replace(/'/g, "\\'")}', '${dateString}', 'L', event)">L</button>
                                    </div>
                                `
                    ) : (status ? status[0].toUpperCase() : '')}
                        </div>
                    </td>
                `;
            }
            html += `</tr>`;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        container.innerHTML = html;

        // Restore or apply auto-scroll logic
        const slider = container.querySelector('.attendance-grid-container');
        if (slider) {
            if (!shouldScroll && attendanceLastScrollLeft >= 0) {
                // Restore previous scroll position immediately
                slider.scrollLeft = attendanceLastScrollLeft;
                requestAnimationFrame(() => {
                    slider.scrollLeft = attendanceLastScrollLeft;
                });
            } else if (expandedAttendanceCol !== -1 && shouldScroll) {
                // Scroll to target expansion ONLY if it's not already at the front
                const colWidth = window.innerWidth <= 768 ? 70 : 100;
                const targetLeft = (expandedAttendanceCol - 1) * colWidth;

                if (Math.abs(attendanceLastScrollLeft - targetLeft) > 5) {
                    setTimeout(() => {
                        slider.scrollTo({ left: targetLeft, behavior: 'smooth' });
                    }, 50);
                } else {
                    // Already there, just make sure it's perfectly aligned
                    slider.scrollLeft = targetLeft;
                }
            } else if (attendanceLastScrollLeft >= 0 && !shouldScroll) {
                // Stay where we are
                slider.scrollLeft = attendanceLastScrollLeft;
            } else {
                // Auto-scroll to today's column using actual DOM position
                const now = new Date();
                if (now.getMonth() === attendanceViewingMonth && now.getFullYear() === attendanceViewingYear) {
                    requestAnimationFrame(() => {
                        // Find today's <th> by its position (index = today - 1, +1 for students col)
                        const ths = slider.querySelectorAll('thead th');
                        const todayTh = ths[now.getDate()]; // index 0 = Students, index N = day N
                        if (todayTh) {
                            slider.scrollTo({ left: todayTh.offsetLeft - (ths[1] ? ths[1].offsetLeft : 0), behavior: 'smooth' });
                        }
                    });
                }
            }
        }

        initAttendanceDragScroll();
    }

    function initAttendanceDragScroll() {
        const slider = document.querySelector('.attendance-grid-container');
        if (!slider) return;

        let isDown = false;
        let startX;
        let scrollLeft;
        let hasMoved = false;

        slider.addEventListener('scroll', () => {
            attendanceLastScrollLeft = slider.scrollLeft;
        });

        slider.addEventListener('mousedown', (e) => {
            isDown = true;
            hasMoved = false;
            slider.classList.add('dragging');
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        });

        slider.addEventListener('mouseleave', () => {
            isDown = false;
            slider.classList.remove('dragging');
        });

        slider.addEventListener('mouseup', () => {
            isDown = false;
            slider.classList.remove('dragging');
        });

        slider.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 1.5;
            if (Math.abs(walk) > 5) {
                hasMoved = true;
                e.preventDefault();
                slider.scrollLeft = scrollLeft - walk;
            }
        });

        // Prevent clicks if we were dragging
        slider.addEventListener('click', (e) => {
            if (hasMoved) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);
    }

    function refreshSharedAnnouncements() {
        announcementPostsByClassroom = loadSharedState(SHARED_ANNOUNCEMENTS_KEY, {});
        return announcementPostsByClassroom;
    }



    function refreshAttendanceRecords() {
        attendanceRecordsByClassroom = loadSharedState(SHARED_ATTENDANCE_RECORDS_KEY, {});
        return attendanceRecordsByClassroom;
    }

    function refreshCommentModes() {
        commentModeByClassroom = loadSharedState(SHARED_COMMENT_MODE_KEY, {});
        return commentModeByClassroom;
    }

    function refreshAnnouncementComments() {
        announcementCommentsByClassroom = loadSharedState(SHARED_ANNOUNCEMENT_COMMENTS_KEY, {});
        return announcementCommentsByClassroom;
    }



    function getCurrentAttendanceStatuses(dateString = new Date().toISOString().split('T')[0]) {
        refreshAttendanceRecords();
        const classroomData = attendanceRecordsByClassroom[currentClassroomKey] || {};
        if (classroomData.date === dateString) return classroomData.statuses || {};
        return (classroomData[dateString] || {}).statuses || {};
    }

    function getCurrentAttendanceExcuses(dateString = new Date().toISOString().split('T')[0]) {
        refreshAttendanceRecords();
        const classroomData = attendanceRecordsByClassroom[currentClassroomKey] || {};
        if (classroomData.date === dateString) return classroomData.excuses || {};
        return (classroomData[dateString] || {}).excuses || {};
    }



    function saveCurrentAttendanceStatuses(statuses, dateString = new Date().toISOString().split('T')[0], excuses = getCurrentAttendanceExcuses(dateString)) {
        if (!currentClassroomKey) return;
        refreshAttendanceRecords();
        if (!attendanceRecordsByClassroom[currentClassroomKey]) {
            attendanceRecordsByClassroom[currentClassroomKey] = {};
        }
        attendanceRecordsByClassroom[currentClassroomKey][dateString] = {
            updatedAt: new Date().toISOString(),
            statuses,
            excuses
        };
        saveSharedState(SHARED_ATTENDANCE_RECORDS_KEY, attendanceRecordsByClassroom);
    }

    function getCurrentCommentMode() {
        refreshCommentModes();
        return commentModeByClassroom[currentClassroomKey] || 'disabled';
    }

    function saveCurrentCommentMode(mode) {
        if (!currentClassroomKey) return;
        commentModeByClassroom[currentClassroomKey] = mode;
        saveSharedState(SHARED_COMMENT_MODE_KEY, commentModeByClassroom);
    }

    function buildAnnouncementId(classroomKey, post, index) {
        if (post?.id) return post.id;
        const author = (post?.author || 'teacher').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const stamp = (post?.timestamp || `post-${index + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return `${classroomKey}-${author}-${stamp}`;
    }

    function ensureAnnouncementIdsForClassroom(classroomKey) {
        refreshSharedAnnouncements();
        const posts = announcementPostsByClassroom[classroomKey] || [];
        let changed = false;
        posts.forEach((post, index) => {
            if (!post.id) {
                post.id = buildAnnouncementId(classroomKey, post, index);
                changed = true;
            }
        });
        if (changed) {
            announcementPostsByClassroom[classroomKey] = posts;
            saveSharedState(SHARED_ANNOUNCEMENTS_KEY, announcementPostsByClassroom);
        }
        return posts;
    }

    function getAnnouncementComments(postId) {
        refreshAnnouncementComments();
        return announcementCommentsByClassroom[currentClassroomKey]?.[postId] || [];
    }

    function getAttendanceStatusLabel(status) {
        if (status === 'P') return 'Present';
        if (status === 'A') return 'Absent';
        if (status === 'L') return 'Late';
        return 'Waiting';
    }

    function getAttendanceStatusBadge(status) {
        if (status === 'P') return 'px-4 py-2 rounded-xl bg-icc text-white text-[10px] font-black uppercase tracking-widest';
        if (status === 'A') return 'px-4 py-2 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest';
        if (status === 'L') return 'px-4 py-2 rounded-xl bg-yellow-500 text-white text-[10px] font-black uppercase tracking-widest';
        return 'px-4 py-2 rounded-xl bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest';
    }
    // --- Grades Sub-Tabs Logic ---
    window.switchGradesSubTab = function (tabId) {
        const analyticsContent = document.getElementById('grades-content-analytics');
        const gradebookContent = document.getElementById('grades-content-gradebook');

        if (tabId === 'gradebook' && !sectionFeatureInit.gradebook) {
            sectionFeatureInit.gradebook = true;
            initGradebook();
        }

        if (tabId === 'analytics') {
            analyticsContent?.classList.remove('hidden');
            gradebookContent?.classList.add('hidden');
            analyticsContent?.classList.add('flex-1', 'overflow-y-auto');
            setupAnalyticsTab();
        } else {
            analyticsContent?.classList.add('hidden');
            gradebookContent?.classList.remove('hidden');
            gradebookContent?.classList.add('flex-1', 'flex', 'flex-col', 'overflow-hidden');
            if (typeof renderGradebookSpreadsheet === 'function') {
                renderGradebookSpreadsheet();
            }
        }

        // Sidebar Highlighting
        document.querySelectorAll('#sub-sidebar .section-nav-child').forEach(el => {
            el.classList.remove('active', 'bg-icc-light', 'text-icc');
            const iconBox = el.querySelector('div');
            if (iconBox) iconBox.classList.replace('bg-icc', 'bg-slate-50');
            if (iconBox) iconBox.classList.replace('text-white', 'text-slate-400');
            const label = el.querySelector('span');
            if (label) label.classList.replace('text-icc', 'text-slate-600');
        });

        const activeId = `grades-nav-${tabId}`;
        const activeLink = document.getElementById(activeId);
        if (activeLink) {
            activeLink.classList.add('active', 'bg-icc-light', 'text-icc');
            const iconBox = activeLink.querySelector('div');
            if (iconBox) iconBox.classList.replace('bg-slate-50', 'bg-icc');
            if (iconBox) iconBox.classList.replace('text-slate-400', 'text-white');
            const label = activeLink.querySelector('span');
            if (label) label.classList.replace('text-slate-600', 'text-icc');
        }
    };


    // --- Sub-Sidebar Logic ---
    function updateSubSidebar(tabId, clusterSubjects = null, clusterTitle = null) {
        const subSidebar = document.getElementById('sub-sidebar');
        const content = document.getElementById('sub-sidebar-content');
        const title = document.getElementById('sub-sidebar-title');
        const header = document.getElementById('sub-sidebar-header');

        if (!subSidebar || !content) return;

        // Don't reset visibility if we have an active classroom
        if (currentClassroomKey) {
            return;
        }

        // Reset visibility
        if (!clusterSubjects) {
            subSidebar.classList.add('hidden');
            document.body.classList.remove('sub-sidebar-open');
            if (header) header.classList.add('hidden');
            content.innerHTML = '';
        }

        if (tabId === 'nav-subjects') {
            // High-fidelity subjects use inline explorer or sub-sidebar for topic nav.
            // Reset state if coming from sidebar click.
            if (!clusterSubjects) {
                resetSubjectsInlineExplorer(true);
            }
            return;
        }

        if (tabId === 'nav-topic-nav') {
            subSidebar.classList.remove('hidden');
            document.body.classList.add('sub-sidebar-open');
            if (header) header.classList.add('hidden');

            const subject = getTopicSubject(clusterTitle); // Using clusterTitle param as subjectId
            if (!subject) return;

            content.innerHTML = `
                <div class="px-4 py-6">
                    <button onclick="switchTab('nav-subjects')" class="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest mb-6 hover:text-icc transition-colors">
                        <i class="fa-solid fa-arrow-left"></i> Back to Subjects
                    </button>
                    <div class="mb-8">
                        <p class="text-[10px] font-black text-icc uppercase tracking-widest mb-1">Current Subject</p>
                        <h3 class="text-sm font-black text-gray-900 leading-tight">${subject.text}</h3>
                    </div>
                </div>
            `;
        }
    }

    function resetCompactSubSidebar(content, title, header) {
        if (content) content.innerHTML = '';
        if (title) title.innerHTML = '';
        if (header) header.classList.add('hidden');
    }

    function renderSubjectsLandingSidebar() {
        // Sub-sidebar is removed for Subjects as per user request.
        const subSidebar = document.getElementById('sub-sidebar');
        if (subSidebar) {
            subSidebar.classList.add('hidden');
            subSidebar.classList.remove('sub-sidebar-visible');
            document.body.classList.remove('sub-sidebar-open');
        }
    }

    function renderGradesSubSidebar() {
        const subSidebar = document.getElementById('sub-sidebar');
        const content = document.getElementById('sub-sidebar-content');
        const title = document.getElementById('sub-sidebar-title');
        const header = document.getElementById('sub-sidebar-header');

        if (!subSidebar || !content || !title || !header) return;

        title.textContent = 'Grades';
        header.classList.remove('hidden');
        content.innerHTML = '';

        const navItems = [
            { id: 'grades-nav-analytics', label: 'Performance', icon: 'fa-chart-pie', tab: 'analytics' },
            { id: 'grades-nav-gradebook', label: 'Gradebooks', icon: 'fa-table-list', tab: 'gradebook' }
        ];

        navItems.forEach(item => {
            const btn = document.createElement('button');
            btn.id = item.id;
            btn.className = `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group text-left section-nav-child`;
            btn.onclick = () => window.switchGradesSubTab(item.tab);

            btn.innerHTML = `
                <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-icc group-hover:text-white transition-all text-slate-400">
                    <i class="fa-solid ${item.icon} text-sm"></i>
                </div>
                <span class="text-[13px] font-bold text-slate-600 group-hover:text-icc transition-colors">${item.label}</span>
            `;

            content.appendChild(btn);
        });

        subSidebar.classList.remove('hidden');
        subSidebar.classList.add('sub-sidebar-visible');
        document.body.classList.add('sub-sidebar-open');
        updateLayout();
    }

    function getTeacherSectionCards() {
        const subjectsData = window.subjectsData || { core: [], academic: [], techpro: [], completed: [] };
        const allActive = [
            ...(subjectsData.core || []).map(s => ({ ...s, type: 'core' })),
            ...(subjectsData.academic || []).map(s => ({ ...s, type: 'applied' })),
            ...(subjectsData.techpro || []).map(s => ({ ...s, type: 'specialized' })),
            ...(subjectsData.completed || []).map(s => ({ ...s, type: s.type || 'applied' }))
        ];

        const sectionCards = [];
        allActive.forEach(subj => {
            (subj.sections || []).forEach(sectionName => {
                const key = `${sectionName}::${subj.name}`;
                sectionCards.push({
                    ...subj,
                    sectionName,
                    room: classroomMetaBySubject[key]?.room || `Room ${300 + sectionCards.length}`,
                    teacher: classroomMetaBySubject[key]?.teacher || 'Elena Reyes',
                    schedule: classroomScheduleBySubject[key] || 'Mon / Wed / Fri   8:00   9:30 AM'
                });
            });
        });

        sectionCards.sort((a, b) => a.name.localeCompare(b.name));

        const savedOrder = localStorage.getItem('teacher_classroom_order');
        if (savedOrder) {
            try {
                const orderArr = JSON.parse(savedOrder);
                sectionCards.sort((a, b) => {
                    const idA = `${a.id}|${a.sectionName}`;
                    const idB = `${b.id}|${b.sectionName}`;
                    const idxA = orderArr.indexOf(idA);
                    const idxB = orderArr.indexOf(idB);
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                    if (idxA !== -1) return -1;
                    if (idxB !== -1) return 1;
                    return 0;
                });
            } catch (e) { console.error(e); }
        }

        return sectionCards;
    }

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

    function getTeacherUpcomingSectionClasses(limit = 2) {
        const classes = getTeacherSectionCards()
            .filter(card => !card.sectionName.includes('Grade 10'))
            .map(card => ({ ...card, scheduleInfo: parseClassSchedule(card.schedule) }))
            .sort((a, b) => a.scheduleInfo.startMinutes - b.scheduleInfo.startMinutes || a.name.localeCompare(b.name));
        if (!classes.length) return [];
        const now = new Date();
        const nowMinutes = (now.getHours() * 60) + now.getMinutes();
        const startIndex = classes.findIndex(item => item.scheduleInfo.startMinutes >= nowMinutes);
        const initialIndex = startIndex >= 0 ? startIndex : 0;
        return Array.from({ length: Math.min(limit, classes.length) }, (_, index) => classes[(initialIndex + index) % classes.length]);
    }

    function formatHomeAssessmentWhen(date, prefix = 'Submitted') {
        if (!date) return `${prefix} date TBA`;
        const d = date instanceof Date ? date : new Date(date);
        if (Number.isNaN(d.getTime())) return String(date);
        const today = new Date();
        const sameDay = d.toDateString() === today.toDateString();
        const dateLabel = sameDay ? `${prefix} Today` : `${prefix} ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        const timeLabel = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${dateLabel} ${timeLabel}`;
    }

    function getTeacherSubmittedAssessmentItems(limit = 3) {
        return buildAssessmentRows()
            .filter(row => row.status === 'waiting')
            .sort((a, b) => b.submittedOn - a.submittedOn)
            .slice(0, limit);
    }

    function renderTeacherHomeDashboardPanels() {
        const combinedList = document.getElementById('teacher-home-dashboard-combined-list');
        if (!combinedList) return;

        let classes = [];
        let dueItems = [];

        try {
            classes = getTeacherUpcomingSectionClasses(2) || [];
        } catch (error) {
            console.warn('Unable to load teacher upcoming classes', error);
        }

        try {
            dueItems = (buildAssessmentRows() || []).filter(row => row.status === 'waiting');
        } catch (error) {
            console.warn('Unable to load teacher submission rows', error);
        }

        if (!classes.length) {
            classes = [
                {
                    name: 'Effective Communication',
                    sectionName: 'Grade 11 - ICT A',
                    room: 'Room 301',
                    scheduleInfo: { label: '8:00 AM - 9:30 AM' }
                },
                {
                    name: 'Programming 1',
                    sectionName: 'Grade 11 - ICT C',
                    room: 'Room 312',
                    scheduleInfo: { label: '8:00 AM - 9:30 AM' }
                }
            ];
        }

        if (!dueItems.length) {
            dueItems = [
                {
                    subject: 'Effective Communication',
                    subjectId: 'fallback-effective-communication',
                    activity: 'Activity #3: Practical Application',
                    submissions: new Array(12)
                },
                {
                    subject: 'Life and Career Skills',
                    subjectId: 'fallback-life-career-skills',
                    activity: 'Activity #3: Practical Application',
                    submissions: new Array(10)
                }
            ];
        }

        // Group submissions by subject
        const groupedSubmissions = dueItems.reduce((acc, row) => {
            if (!acc[row.subjectId]) {
                acc[row.subjectId] = {
                    subjectName: row.subject,
                    subjectId: row.subjectId,
                    activities: []
                };
            }
            acc[row.subjectId].activities.push(row);
            return acc;
        }, {});

        const submissionGroups = Object.values(groupedSubmissions);

        let html = '';

        if (classes.length === 0 && submissionGroups.length === 0) {
            html = `
                <div class="home-dashboard-card">
                    <strong class="home-dashboard-card__title">No activity</strong>
                    <span class="home-dashboard-card__meta">Your schedule and tasks will appear here.</span>
                </div>
            `;
        } else {
            if (classes.length > 0) {
                html += '<div class="home-dashboard-card home-dashboard-card--combined">';
                html += classes.map((item, index) => `
                    <div class="home-dashboard-item">
                        <span class="home-dashboard-card__eyebrow">${index === 0 ? 'Next Class' : 'Upcoming Class'}</span>
                        <button type="button" class="home-dashboard-subject-link" data-home-section="${escapeHtml(item.sectionName)}" data-home-subject="${escapeHtml(item.name)}">${escapeHtml(item.name)}</button>
                        <span class="home-dashboard-card__meta">${escapeHtml(item.sectionName)}</span>
                        <span class="home-dashboard-card__meta">${escapeHtml(item.room)}</span>
                        <span class="home-dashboard-card__time">${escapeHtml(item.scheduleInfo.label)}</span>
                    </div>
                `).join('');
                html += '</div>';
            }

            if (submissionGroups.length > 0) {
                html += '<div class="home-dashboard-card home-dashboard-card--combined" style="margin-top: 1.5rem;">';
                html += `<h3 class="home-dashboard-panel-heading">Submissions</h3>`;
                html += submissionGroups.map(group => `
                    <div class="home-dashboard-item">
                        <button type="button" class="home-dashboard-subject-link home-dashboard-subject-toggle" data-toggle-subject="${escapeHtml(group.subjectId)}">
                            ${escapeHtml(group.subjectName)}
                        </button>
                        <div class="home-dashboard-activity-list" id="activity-list-${escapeHtml(group.subjectId)}">
                            ${group.activities.map(act => `
                                <div class="home-dashboard-activity-item">
                                    <span>${escapeHtml(act.activity)}</span>
                                    <span class="home-dashboard-activity-count">${act.submissions?.length || 12}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('');
                html += '</div>';
            }
        }

        combinedList.innerHTML = html;

        // Listeners for classes
        combinedList.querySelectorAll('[data-home-section]').forEach(card => {
            card.addEventListener('click', () => showStudentList(card.dataset.homeSection, card.dataset.homeSubject));
        });

        // Listeners for toggles
        combinedList.querySelectorAll('.home-dashboard-subject-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const listId = `activity-list-${btn.dataset.toggleSubject}`;
                const list = document.getElementById(listId);
                if (list) {
                    list.classList.toggle('home-dashboard-activity-list--visible');
                }
            });
        });
    }

    function getCompactSectionName(sectionName) {
        return String(sectionName || '').replace(/^Grade\s+\d+\s+-\s+/i, '').trim();
    }

    function getClassroomRoomSubtitle(card) {
        return `${getCompactSectionName(card.sectionName)} - ${card.room || 'Room'}`.trim();
    }

    function ensureSectionsSubmenu() {
        const parent = document.getElementById('nav-classes');
        if (!parent) return null;

        parent.classList.add('nav-link--group');
        if (!parent.querySelector('.sidebar-group-chevron')) {
            const chevron = document.createElement('i');
            chevron.className = 'fa-solid fa-chevron-right sidebar-group-chevron';
            parent.appendChild(chevron);
        }

        let submenu = document.getElementById('sections-submenu');
        if (!submenu) {
            submenu = document.createElement('div');
            submenu.id = 'sections-submenu';
            submenu.className = 'sidebar-submenu hidden teacher-section-nav-children';
            parent.insertAdjacentElement('afterend', submenu);
        }

        return submenu;
    }

    function renderSectionsNavChildren(activeClassName = '', activeSubject = '') {
        const submenu = ensureSectionsSubmenu();
        if (!submenu) return;

        submenu.innerHTML = getTeacherSectionCards()
            .filter(card => !card.sectionName.includes('Grade 10'))
            .map(card => {
                const active = card.sectionName === activeClassName && card.name === activeSubject;
                return `
                <button type="button"
                    class="teacher-section-room-link ${active ? 'active' : ''}"
                    data-section-name="${card.sectionName.replace(/"/g, '&quot;')}"
                    data-section-subject="${card.name.replace(/"/g, '&quot;')}">
                    <i class="fa-solid fa-door-open teacher-section-room-link__icon"></i>
                    <span class="teacher-section-room-link__content">
                        <span class="teacher-section-room-link__title">${card.name}</span>
                        <span class="teacher-section-room-link__meta">${getClassroomRoomSubtitle(card)}</span>
                    </span>
                </button>
            `;
            }).join('');

        submenu.querySelectorAll('[data-section-name][data-section-subject]').forEach(button => {
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
                showStudentList(button.dataset.sectionName, button.dataset.sectionSubject, 'room');
            });
        });
    }

    function syncSectionsNavState(showChildren = Boolean(currentClassroomKey)) {
        const parent = document.getElementById('nav-classes');
        const submenu = ensureSectionsSubmenu();
        if (!parent || !submenu) return;

        const isCollapsed = document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;
        const isGridVisible = !document.getElementById('section-classes')?.classList.contains('hidden');
        const isDetailVisible = !document.getElementById('section-classroom-detail')?.classList.contains('hidden');

        parent.classList.toggle('active', isGridVisible || isDetailVisible);
        parent.classList.toggle('open', showChildren && !isCollapsed);

        const chevron = parent.querySelector('.sidebar-group-chevron');
        if (chevron) {
            chevron.classList.toggle('hidden', !isDetailVisible);
            chevron.classList.toggle('rotate-90', showChildren && !isCollapsed);
        }

        submenu.classList.toggle('hidden', !showChildren || isCollapsed);
    }

    function renderClassroomSectionsSidebar(activeClassName = '', activeSubject = '', showCollapsedOverlay = false) {
        const subSidebar = document.getElementById('sub-sidebar');
        const content = document.getElementById('sub-sidebar-content');
        const title = document.getElementById('sub-sidebar-title');
        const header = document.getElementById('sub-sidebar-header');
        if (!subSidebar || !content || !title) return;

        renderSectionsNavChildren(activeClassName, activeSubject);
        syncSectionsNavState(true);

        const isCollapsed = document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;

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


        title.textContent = 'Sections';
        header?.classList.remove('hidden');

        content.innerHTML = `
            <div class="teacher-section-room-list">
                ${getTeacherSectionCards().map(card => {
            const active = card.sectionName === activeClassName && card.name === activeSubject;
            return `
                        <button type="button"
                            class="teacher-section-room-link ${active ? 'active' : ''}"
                            data-section-name="${card.sectionName.replace(/"/g, '&quot;')}"
                            data-section-subject="${card.name.replace(/"/g, '&quot;')}">
                            <i class="fa-solid fa-door-open teacher-section-room-link__icon"></i>
                            <span class="teacher-section-room-link__content">
                                <span class="teacher-section-room-link__title">${card.name}</span>
                                <span class="teacher-section-room-link__meta">${getClassroomRoomSubtitle(card)}</span>
                            </span>
                        </button>
                    `;
        }).join('')}
            </div>
        `;

        content.querySelectorAll('[data-section-name][data-section-subject]').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showStudentList(button.dataset.sectionName, button.dataset.sectionSubject, 'room');
            });
        });

        subSidebar.classList.remove('hidden');
        subSidebar.classList.add('sub-sidebar-visible');
        document.body.classList.add('sub-sidebar-open');
        updateLayout();
    }

    // Track whether the sections inline submenu is open
    let sectionsSubmenuOpen = true;

    document.getElementById('nav-classes')?.addEventListener('click', event => {
        if (!currentClassroomKey) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const [className = '', subject = ''] = currentClassroomKey.split('::');
        const isCollapsed = document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;

        if (isCollapsed) {
            // Collapsed sidebar: always show overlay sub-sidebar
            renderClassroomSectionsSidebar(className, subject, true);
        } else {
            // Expanded sidebar: toggle the inline submenu open/closed
            sectionsSubmenuOpen = !sectionsSubmenuOpen;
            renderSectionsNavChildren(className, subject);
            syncSectionsNavState(sectionsSubmenuOpen);
        }
    }, true);

    document.getElementById('nav-classes')?.addEventListener('mouseenter', () => {
        const isCollapsed = document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;
        if (!currentClassroomKey || !isCollapsed) return;
        const [className = '', subject = ''] = currentClassroomKey.split('::');
        renderClassroomSectionsSidebar(className, subject, true);
    });

    function hideClassroomSectionsSidebar() {
        // Never hide the sidebar when we have an active classroom
        if (currentClassroomKey) {
            return;
        }
        const subSidebar = document.getElementById('sub-sidebar');
        const content = document.getElementById('sub-sidebar-content');
        const header = document.getElementById('sub-sidebar-header');
        const submenu = ensureSectionsSubmenu();
        if (subSidebar) {
            subSidebar.classList.add('hidden');
            subSidebar.classList.remove('sub-sidebar-visible');
        }
        if (content) content.innerHTML = '';
        if (submenu) {
            submenu.innerHTML = '';
            submenu.classList.add('hidden');
        }
        document.getElementById('nav-classes')?.classList.remove('open');
        document.getElementById('nav-classes')?.querySelector('.sidebar-group-chevron')?.classList.remove('rotate-90');
        header?.classList.add('hidden');
        document.body.classList.remove('sub-sidebar-open');
        updateLayout();
    }


    function renderClassroomsGrid() {
        const grid = document.getElementById('classrooms-grid');
        if (!grid) return;

        const sectionCards = getTeacherSectionCards();

        let html = '';
        sectionCards.forEach((card, index) => {
            const subj = card;
            const sectionName = card.sectionName;
            const schedule = parseClassSchedule(subj.schedule);

            let bgClass = 'bg-[#15803d]'; // Core
            let textClass = 'text-white';
            if (subj.type === 'applied') {
                bgClass = 'bg-[#FFD000]';
                textClass = 'text-white';
            } else if (subj.type === 'specialized') {
                bgClass = 'bg-[#78350f]';
                textClass = 'text-white';
            }

            let badge = '';
            if (index === 0) {
                badge = `<span style="font-size:13px;font-weight:900;letter-spacing:.06em;color:#dc2626;font-family:'Inter',sans-serif;text-transform:uppercase;">No class</span>`;
            } else if (index === 2) {
                badge = `<span style="font-size:13px;font-weight:900;letter-spacing:.06em;color:#16a34a;font-family:'Inter',sans-serif;text-transform:uppercase;">Class today</span>`;
            } else if (index === 5) {
                badge = `<span style="font-size:13px;font-weight:900;letter-spacing:.06em;color:#ca8a04;font-family:'Inter',sans-serif;text-transform:uppercase;">Class tomorrow</span>`;
            }

            const isAdvisory = subj.id === 'subj-effcomm' && sectionName === 'Grade 11 - ICT A';
            const advisoryLabel = isAdvisory ? `<p style="font-size:13px;font-weight:900;letter-spacing:.06em;color:#000000;font-family:'Inter',sans-serif;margin-bottom:2px;">Adviser</p>` : '';
            const iconClass = subj.icon || 'fa-solid fa-book';

            // Assign a book image cycling book1–book8 by card index
            const bookIdx = (index % 8) + 1;
            const bookImg = `image/book${bookIdx}.jpg`;

            const bannerContent = `<img src="${bookImg}" class="absolute inset-0 w-full h-full object-cover opacity-30">
                   <i class="${iconClass} absolute -left-4 -top-4 text-white/20 text-7xl transform -rotate-12"></i>`;

            html += `
                <div class="classroom-card bg-white border border-gray-100 rounded-[24px] overflow-hidden standard-panel-shadow transition-all group flex flex-col h-full relative"
                     data-id="${subj.id}|${sectionName}">
                    <!-- Header / Banner -->
                    <div class="h-28 ${bgClass} w-full flex items-center justify-center px-6 rounded-t-[24px] classroom-card-banner relative overflow-hidden">
                         ${bannerContent}
                         <h3 class="${textClass} font-black tracking-widest text-center leading-tight cursor-pointer hover:underline transition-none relative z-10"
                             style="color:#ffffff !important;font-size:16px;font-family:'Inter',sans-serif;text-shadow: 0 2px 4px rgba(0,0,0,0.3);"
                             onclick="window.showStudentList && window.showStudentList('${sectionName}', '${subj.name}')">${subj.name}</h3>
                    </div>
                    
                    <!-- Card Body -->
                    <div class="p-6 pt-10 flex flex-col flex-1 card-body-main" style="font-family:'Inter',sans-serif;">
                        <div class="flex items-start justify-between mb-4">
                            <div class="flex flex-col">
                                ${advisoryLabel}
                            </div>
                            ${badge}
                        </div>

                        <div class="mt-auto flex flex-col gap-2.5 pt-4 border-t border-gray-50">
                            <!-- Section code &mdash; green + icon -->
                            <div class="flex items-center gap-1.5">
                                <i class="fa-solid fa-users" style="font-size:13px;color:#15803d;width:16px;text-align:center;"></i>
                                <span style="font-size:18px;font-weight:900;line-height:1;color:#15803d;font-family:'Inter',sans-serif;">${sectionName.split(' - ').pop().replace(/\s+/g, '-')}</span>
                            </div>
                            <!-- Grade -->
                            <div class="flex items-center gap-1.5">
                                <i class="fa-solid fa-graduation-cap" style="font-size:12px;color:#6b7280;width:16px;text-align:center;"></i>
                                <span style="font-size:13px;font-weight:800;letter-spacing:.04em;line-height:1;color:#000000;font-family:'Inter',sans-serif;">${subj.grade}</span>
                            </div>
                            <!-- Room &mdash; icon -->
                            <div class="flex items-center gap-1.5">
                                <i class="fa-solid fa-door-open" style="font-size:12px;color:#6b7280;width:16px;text-align:center;"></i>
                                <span style="font-size:13px;font-weight:800;letter-spacing:.04em;line-height:1;color:#000000;font-family:'Inter',sans-serif;">${subj.room}</span>
                            </div>
                            <!-- Schedule + School Year -->
                            <div class="flex items-center justify-between w-full">
                                <div class="flex items-center gap-1.5">
                                    <i class="fa-regular fa-clock" style="font-size:12px;color:#6b7280;width:16px;text-align:center;"></i>
                                    <span style="font-size:13px;font-weight:800;letter-spacing:.04em;line-height:1;color:#000000;font-family:'Inter',sans-serif;">${schedule.label}</span>
                                </div>
                                <span style="font-size:13px;font-weight:800;letter-spacing:.04em;line-height:1;color:#000000;font-family:'Inter',sans-serif;">${subj.schoolYear || '2026-2027'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        grid.innerHTML = html;
    }

    function renderTeacherSubjectsGrid() {
        const grid = document.getElementById('teacher-subjects-grid');
        if (!grid) return;

        const subjectsData = window.subjectsData || { core: [], academic: [], techpro: [] };

        // Flatten all assigned subjects
        const allAssigned = [
            ...(subjectsData.core || []),
            ...(subjectsData.academic || []),
            ...(subjectsData.techpro || [])
        ].sort((a, b) => a.name.localeCompare(b.name));

        if (allAssigned.length === 0) {
            grid.innerHTML = `<div class="col-span-full py-20 text-center text-slate-400 font-medium italic">No subjects currently assigned.</div>`;
            return;
        }

        grid.innerHTML = allAssigned.map(subj => {
            let bgClass = 'bg-slate-600';

            if (subj.programKey === 'core-subjects') {
                bgClass = 'bg-[#15803d]';
            } else if (subj.programKey === 'applied-subjects') {
                bgClass = 'bg-[#FFD000]';
            } else if (subj.programKey === 'specialized-subjects' || (subj.programKey && subj.programKey.includes('immersion'))) {
                bgClass = 'bg-[#78350f]';
            }

            const iconClass = subj.icon || 'fa-solid fa-book';
            const sectionsText = subj.sections ? subj.sections.join(', ') : 'No Sections';
            const sIdx = allAssigned.indexOf(subj);
            const sBookIdx = (sIdx % 8) + 1;
            const sBookImg = `image/book${sBookIdx}.jpg`;

            return `
                <div class="classroom-card bg-white border border-gray-100 rounded-2xl overflow-hidden standard-panel-shadow hover:shadow-lg transition-all group flex flex-col h-full">
                    <div class="h-24 ${bgClass} w-full flex items-end justify-end px-8 pb-4 relative overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                         onclick="window.openSubjectsProgramFocus && window.openSubjectsProgramFocus('${subj.programKey || 'core-subjects'}')">
                        <img src="${sBookImg}" class="absolute inset-0 w-full h-full object-cover opacity-30">
                        <i class="${iconClass} absolute -left-4 -top-4 text-white/20 text-7xl transform -rotate-12"></i>
                        <span class="relative z-10 text-white font-black tracking-widest text-[14px] drop-shadow-sm text-right leading-tight max-w-[80%]">${subj.name}</span>
                    </div>
                    <div class="p-6">
                        <div class="mb-4">
                            <h3 class="text-[16px] font-black text-black leading-tight mb-1">${subj.name}</h3>
                            <p class="text-[10px] font-bold text-black uppercase tracking-widest">${subj.grade}</p>
                        </div>
                        <div class="space-y-2 pt-4 border-t border-gray-50">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                                    <i class="fa-solid fa-users-rectangle text-xs"></i>
                                </div>
                                <div class="flex flex-col">
                                    <span class="text-[9px] font-black text-black uppercase tracking-widest leading-none mb-1">Sections</span>
                                    <span class="text-[11px] font-bold text-black truncate max-w-[150px]">${sectionsText}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function slugify(text) {
        return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }

    function buildGenericSubjectData(title, subjectId, clusterTitle) {
        const baseTopics = [
            `Introduction`,
            `Core Concepts`,
            `Applied Practice`,
            `Assessment and Reflection`
        ];
        return {
            id: subjectId,
            text: title,
            subtitle: `${clusterTitle} &bull; Grade 11`,
            instructor: 'Cluster Faculty',
            icon: 'fa-solid fa-book-open',
            bg: 'image/book1.jpg',
            q1Percent: 0,
            q2Percent: 0,
            summary: `${title} is part of the ${clusterTitle} cluster and introduces the essential ideas, skills, and outputs learners will study in this learning path.`,
            q1Topics: baseTopics.map((topic, index) => ({
                title: topic,
                status: index === 0 ? 'completed' : index === 1 ? 'in-progress' : 'not-started',
                grades: index === 0 ? { quiz: 90, assignment: 88, activity: 90, performance: 89 } : index === 1 ? { quiz: 0, assignment: 82, activity: 0, performance: 0 } : null
            }))
        };
    }

    function ensureSubjectDataForTitle(title, clusterTitle) {
        const subjectId = `gen-${slugify(title)}`;
        if (!dynamicCurriculumSubjects[subjectId]) {
            dynamicCurriculumSubjects[subjectId] = buildGenericSubjectData(title, subjectId, clusterTitle);
        }
        return dynamicCurriculumSubjects[subjectId];
    }

    function getInlineAnchor(programKey) {
        return 'left';
    }

    window.resetSubjectsInlineExplorer = function (animate = false) {
        inlineAnimationToken += 1;
        inlineAnimationTimers.forEach(timerId => window.clearTimeout(timerId));
        inlineAnimationTimers = [];
        const row = document.querySelector('.subject-paths-row');
        const detail = document.getElementById('subjects-inline-detail');
        if (!row || !detail) return;
        const programKey = currentInlineProgram;
        const anchor = programKey ? getInlineAnchor(programKey) : null;
        const panels = Array.from(row.querySelectorAll('.subject-path-panel[data-program-key]'));
        const selectedPanel = programKey ? panels.find(panel => panel.dataset.programKey === programKey) : null;
        const shouldAnimateReset = animate && programKey && selectedPanel && (row.classList.contains('inline-active-left') || row.classList.contains('inline-active-right'));

        row.getAnimations().forEach(animation => animation.cancel());
        detail.getAnimations().forEach(animation => animation.cancel());
        panels.forEach(panel => panel.getAnimations().forEach(animation => animation.cancel()));

        if (shouldAnimateReset) {
            const animationDuration = 560;
            const selectedIndex = panels.findIndex(panel => panel.dataset.programKey === programKey);
            const selectedStartRect = selectedPanel.getBoundingClientRect();

            detail.style.transition = 'opacity 180ms ease';
            detail.style.opacity = '0';
            detail.style.pointerEvents = 'none';
            detail.style.transform = '';
            row.classList.remove('inline-active-left', 'inline-active-right');
            detail.classList.add('hidden');
            detail.innerHTML = '';
            detail.style.visibility = '';

            panels.forEach(panel => {
                panel.classList.remove('is-hidden-left', 'is-hidden-right', 'is-selected-left', 'is-selected-right', 'is-collapsed');
                panel.style.transition = 'none';
                panel.style.opacity = '';
                panel.style.transform = '';
                panel.style.visibility = 'visible';
                panel.style.pointerEvents = '';
            });

            const selectedEndRect = selectedPanel.getBoundingClientRect();
            const selectedDeltaX = selectedStartRect.left - selectedEndRect.left;
            panels.forEach((panel, panelIndex) => {
                panel.getAnimations().forEach(animation => animation.cancel());
                if (panel.dataset.programKey === programKey) {
                    panel.animate(
                        [
                            { transform: `translateX(${selectedDeltaX}px)`, opacity: 1 },
                            { transform: 'translateX(0)', opacity: 1 }
                        ],
                        { duration: animationDuration, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' }
                    );
                } else {
                    const direction = panelIndex < selectedIndex ? -1 : 1;
                    panel.animate(
                        [
                            { transform: `translateX(${direction * 140}%)`, opacity: 0 },
                            { transform: 'translateX(0)', opacity: 1 }
                        ],
                        { duration: animationDuration, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' }
                    );
                }
            });

            const cleanupTimer = window.setTimeout(() => {
                row.classList.remove('inline-active-left', 'inline-active-right');
                detail.classList.add('hidden');
                detail.innerHTML = '';
                panels.forEach(panel => {
                    panel.getAnimations().forEach(animation => animation.cancel());
                    panel.classList.remove('is-hidden-left', 'is-hidden-right', 'is-selected-left', 'is-selected-right', 'is-collapsed', 'is-locked');
                    panel.removeAttribute('style');
                });
                detail.removeAttribute('style');
            }, animationDuration + 60);
            inlineAnimationTimers.push(cleanupTimer);

            currentInlineProgram = null;
            currentCurriculumProgram = null;
            currentCurriculumCluster = null;
            setSubjectsPageScrollLocked(true);
            return;
        }

        currentInlineProgram = null;
        currentCurriculumProgram = null;
        currentCurriculumCluster = null;
        setSubjectsPageScrollLocked(true);
        row.classList.remove('inline-active-left', 'inline-active-right');
        detail.classList.add('hidden');
        detail.innerHTML = '';
        detail.removeAttribute('style');
        row.querySelectorAll('.subject-path-panel').forEach(panel => {
            panel.getAnimations().forEach(animation => animation.cancel());
            panel.classList.remove('is-hidden-left', 'is-hidden-right', 'is-selected-left', 'is-selected-right', 'is-collapsed', 'is-locked');
            panel.removeAttribute('style');
        });
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
                        const progress = 0;
                        items.push({
                            kind: 'subject',
                            id: subject.id,
                            title,
                            copy: subject.summary || `${title} is one of the elective subjects under ${group.title}.`,
                            media: subject.bg || group.image || program.image,
                            meta: group.title,
                            aiInsight: subject.summary || `${title} belongs to ${group.title} under ${group.track}.`,
                            progress
                        });
                    });
                });
            });
        } else if (mode === 'matatag') {
            (program.clusters || []).forEach(cluster => {
                if (!trackMap.has(cluster.track)) trackMap.set(cluster.track, []);
                const items = trackMap.get(cluster.track);

                (cluster.subjects || []).forEach(title => {
                    const subject = ensureSubjectDataForTitle(title, cluster.title);
                    const progress = 0;
                    items.push({
                        kind: 'subject',
                        id: subject.id,
                        title,
                        copy: subject.summary || `${title} is one of the subjects under ${cluster.title}.`,
                        media: subject.bg || cluster.image || program.image,
                        meta: cluster.title,
                        aiInsight: subject.summary || `${title} belongs to ${cluster.title} under ${cluster.track}.`,
                        progress
                    });
                });
            });
        } else {
            return [
                {
                    title: 'Track',
                    items: [
                        {
                            kind: 'subject',
                            id: 'default-subject-placeholder',
                            title: 'Subject',
                            copy: 'This area will show the assigned subject once the curriculum, track, and subject records are connected.',
                            media: 'image/book6.jpg',
                            meta: 'Strand/Cluster',
                            aiInsight: 'This is a default subject placeholder for the elective curriculum panel.',
                            progress: 0
                        }
                    ]
                }
            ];
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
        if (programKey === 'applied-subjects') {
            return [];
        }
        if (program.subjects) {
            return program.subjects.map(item => {
                const subjectData = getTopicData(item.id) || {};
                const progress = 0;
                return {
                    kind: 'subject',
                    id: item.id,
                    title: item.title,
                    copy: subjectData.summary || item.overview,
                    media: item.image,
                    meta: programKey === 'core-subjects' ? '' : (subjectData.subtitle || ''),
                    aiInsight: '',
                    progress
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
                meta: `${item.track} &bull; ${item.subjectCount} Subjects`
            }));
        }
        if (program.stages) {
            return program.stages.map(item => ({
                kind: 'stage',
                key: item.key,
                title: item.title,
                copy: item.overview,
                media: item.image || '',
                meta: 'Open Stage'
            }));
        }
        return [];
    }

    window.handleInlineCardSelection = function (programKey, item) {
        if (item.kind === 'subject') {
            switchToTopicPage(item.id);
            return;
        }
        if (item.kind === 'stage') {
            switchToTopicPage(item.key);
            return;
        }
        if (item.kind === 'cluster') {
            currentCurriculumCluster = item.key;
            renderSubjectsInlineDetail(programKey);
            const detail = document.getElementById('subjects-inline-detail');
            if (detail) detail.scrollTo({ top: 0, behavior: 'auto' });
            return;
        }
        const subject = ensureSubjectDataForTitle(item.title, curriculumPrograms[programKey]?.title || 'Program');
        switchToTopicPage(subject.id);
    }

    function getAssignedTeacherSubject(item, programKey) {
        const allAssigned = Object.values(window.subjectsData || {}).flat();
        const itemTitle = item?.title || item?.text || item?.name || '';
        const itemId = item?.id || item?.key || '';
        const assigned = allAssigned.find(subject =>
            subject.id === itemId ||
            subject.name === itemTitle ||
            slugify(subject.name) === slugify(itemTitle)
        );

        if (assigned) return assigned;

        return {
            id: itemId || slugify(itemTitle || 'subject'),
            name: itemTitle || 'Subject',
            icon: item?.icon || 'fa-solid fa-book',
            grade: item?.subtitle?.match(/Grade\s+\d+/i)?.[0] || 'Grade 11',
            programKey: programKey || item?.programKey || 'core-subjects',
            sections: ['Grade 11 - ICT A']
        };
    }

    function openTeacherSubjectManagement(item, programKey) {
        const page = document.getElementById('section-topic-detail');
        if (!page) return;

        page.innerHTML = '<div id="subject-management-content" class="h-full w-full"></div>';
        hideAllSections();
        showSection('section-topic-detail');
        document.body.classList.remove('subjects-panels-mode', 'sub-sidebar-visible', 'sub-sidebar-open');
        document.body.classList.add('sidebar-collapsed');
        sidebar?.classList.add('sidebar-collapsed');

        navLinks.forEach(l => l.classList.remove('active'));
        document.getElementById('nav-subjects')?.classList.add('active');

        const subSidebar = document.getElementById('sub-sidebar');
        if (subSidebar) {
            subSidebar.classList.add('hidden');
            subSidebar.classList.remove('sub-sidebar-visible');
        }

        renderSubjectManagement(getAssignedTeacherSubject(item, programKey));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function getProgramCluster(programKey, clusterKey) {
        const program = curriculumPrograms[programKey];
        if (!program?.clusters) return null;
        return program.clusters.find(cluster => cluster.key === clusterKey) || null;
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
                        copy: subject.summary || `${title} is one of the elective subjects under ${k12Group.title}.`,
                        media: subject.bg || k12Group.image || 'image/book1.jpg',
                        meta: `${k12Group.title} &bull; ${k12Group.track}`,
                        aiInsight: subject.summary || `${title} is part of ${k12Group.title} and supports the learning requirements of this elective path.`,
                        progress: 0
                    };
                });
            }

            const clusters = (curriculumPrograms[programKey]?.clusters || []).filter(cluster => cluster.key === clusterKey);
            if (clusters.length) {
                const cluster = clusters[0];
                return cluster.subjects.map(title => {
                    const subject = ensureSubjectDataForTitle(title, cluster.title);
                    return {
                        kind: 'subject',
                        id: subject.id,
                        title,
                        copy: subject.summary || `${title} is one of the elective subjects under ${cluster.title}.`,
                        media: subject.bg || cluster.image || 'image/book1.jpg',
                        meta: `${cluster.title} &bull; ${cluster.track}`,
                        aiInsight: subject.summary || `${title} is part of ${cluster.title} and helps learners build the knowledge and outputs expected from this elective path.`,
                        progress: 0
                    };
                });
            }
        }

        const cluster = getProgramCluster(programKey, clusterKey);
        if (!cluster) return [];
        return cluster.subjects.map(title => {
            const subject = ensureSubjectDataForTitle(title, cluster.title);
            return {
                kind: 'subject',
                id: subject.id,
                title,
                copy: subject.summary || `${title} is part of the ${cluster.title} cluster and introduces the key lessons, activities, and outputs learners will complete in this track.`,
                media: subject.bg || cluster.image || 'image/book1.jpg',
                meta: `${cluster.track} &bull; ${cluster.title}`,
                aiInsight: subject.summary || `${title} is part of the ${cluster.title} cluster and helps students build knowledge, practice skills, and prepare for the requirements of this learning path.`,
                progress: 0
            };
        });
    }

    function askSigmaAbout(title, insight) {
        const subjectTitle = title || 'This subject';
        const subjectInsight = insight || 'This subject helps build useful academic and real-life skills for students.';
        openAiPanel();
        addAiMessage(`What is ${subjectTitle} about?`, true);
        window.setTimeout(() => {
            addAiMessage(`<strong>${subjectTitle}</strong>: ${subjectInsight}`, false);
        }, 220);
    }
    window.askSigmaAbout = askSigmaAbout;

    function getProgressVisuals(progress) {
        if (progress === 0) {
            return {
                color: '#64748b',
                gradient: 'transparent'
            };
        }
        if (progress >= 91) {
            return {
                color: '#15803d',
                gradient: '#15803d'
            };
        }
        if (progress >= 71) {
            return {
                color: '#16a34a',
                gradient: '#86efac'
            };
        }
        if (progress >= 51) {
            return {
                color: '#ca8a04',
                gradient: '#eab308'
            };
        }
        if (progress >= 31) {
            return {
                color: '#ea580c',
                gradient: '#f97316'
            };
        }
        return {
            color: '#dc2626',
            gradient: '#ef4444'
        };
    }

    function syncInlinePanelBackButtons() {
        document.querySelectorAll('.subject-path-back-btn').forEach(btn => btn.remove());
        document.querySelectorAll('.subject-path-panel.is-locked').forEach(panel => panel.classList.remove('is-locked'));
    }

    function renderSubjectsInlineDetail(programKey) {
        const detail = document.getElementById('subjects-inline-detail');
        const program = curriculumPrograms[programKey];
        if (!detail || !program) return;
        const items = buildInlineItems(programKey);
        const isCoreSubjects = programKey === 'core-subjects';
        const isTrackClusterProgram = programKey === 'applied-subjects';
        const isSpecializedSubjects = programKey === 'specialized-subjects';
        detail.className = `subjects-inline-detail${isCoreSubjects ? ' subjects-inline-detail--core' : ''}${isTrackClusterProgram ? ' subjects-inline-detail--track' : ''}${isSpecializedSubjects ? ' subjects-inline-detail--immersion' : ''}`;

        function renderSubjectCards(subjectList) {
            return subjectList.map(item => {
                const progressVisuals = getProgressVisuals(item.progress ?? 0);
                const progress = item.progress ?? 0;
                return `
                    <div class="subjects-inline-card subjects-inline-card--row ${progress > 85 ? 'text-white-all' : progress > 40 ? 'text-white-desc' : ''}" role="button" tabindex="0" data-inline-kind="${item.kind}" data-inline-id="${item.id || item.key || ''}">
                        ${item.media ? `<img src="${item.media}" alt="${item.title}" class="subjects-inline-card-media">` : '<div class="subjects-inline-card-media"></div>'}
                        
                        <div class="subjects-inline-card-progress-fill-bg" style="height:${progress}%;background:${progressVisuals.gradient};opacity:${progress === 0 ? 0 : progress > 90 ? 1 : 0.3}"></div>

                        <div class="subjects-inline-card-body">
                            <h4 class="subjects-inline-card-title">${item.title}</h4>
                            <p class="subjects-inline-card-copy">${item.copy}</p>
                        </div>

                        <div class="subjects-inline-card-footer">
                            <button type="button" class="subjects-inline-ai-icon" title="Ask SIGMA AI" aria-label="Ask SIGMA AI about ${item.title}" data-ai-subject="${item.title}" data-ai-insight="${item.aiInsight || ''}">
                                <i class="fa-solid fa-bolt"></i>
                            </button>
                            <span class="subjects-inline-card-progress-value" style="color:${progress > 15 ? '#ffffff' : progressVisuals.color}">${progress}%</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function renderGroup(title, subjectList) {
            if (!subjectList || subjectList.length === 0) return '';
            return `
                <div class="subjects-group-container mb-12">
                    <div class="subjects-group-header mb-8 px-0">
                        <h3 class="text-[1.4rem] font-bold text-black font-['Inter']">${title}</h3>
                        <div class="h-[3px] bg-[#15803d] w-1/2 mt-2"></div>
                    </div>
                    <div class="subjects-inline-grid subjects-inline-grid--list">
                        ${renderSubjectCards(subjectList)}
                    </div>
                </div>
            `;
        }

        if (isTrackClusterProgram) {
            if (currentCurriculumCluster) {
                const subjectItems = buildTrackClusterSubjectItems(programKey, currentCurriculumCluster);
                const enrolled = subjectItems.filter(s => (s.progress ?? 0) < 100);
                const completed = subjectItems.filter(s => (s.progress ?? 0) >= 100);

                detail.innerHTML = `
                    <div class="subjects-inline-shell subjects-inline-shell--core px-12 py-10">
                        <button type="button" class="group flex items-center gap-3 mb-12 text-slate-400 hover:text-slate-900 transition-colors" onclick="currentCurriculumCluster = null; renderSubjectsInlineDetail('${programKey}')">
                            <div class="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center group-hover:border-slate-900 transition-colors">
                                <i class="fa-solid fa-arrow-left text-[12px]"></i>
                            </div>
                            <span class="text-[11px] font-black uppercase tracking-widest font-['Inter']">Back to Clusters</span>
                        </button>
                        ${renderGroup('Enrolled Subjects', enrolled)}
                        ${renderGroup('Completed Subjects', completed)}
                    </div>
                `;
                detail.classList.remove('hidden');
                detail.querySelectorAll('.subjects-inline-card').forEach((card, index) => {
                    card.addEventListener('click', () => handleInlineCardSelection(programKey, subjectItems[index]));
                    card.addEventListener('keydown', event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleInlineCardSelection(programKey, subjectItems[index]);
                        }
                    });
                });
                detail.querySelectorAll('.subjects-inline-ai-icon').forEach(btn => {
                    btn.addEventListener('click', event => {
                        event.stopPropagation();
                        askSigmaAbout(btn.dataset.aiSubject, btn.dataset.aiInsight);
                    });
                });
                syncInlinePanelBackButtons();
                return;
            }

            const sections = buildElectiveTrackSections();
            detail.innerHTML = `
                <div class="subjects-inline-shell subjects-inline-shell--core px-12 py-10">
                    <div class="subjects-track-sections">
                    ${sections.map(section => {
                const enrolled = section.items.filter(s => (s.progress ?? 0) < 100);
                const completed = section.items.filter(s => (s.progress ?? 0) >= 100);
                return `
                        <section class="subjects-track-section mb-12">
                            ${renderGroup('Enrolled Subjects', enrolled)}
                            ${renderGroup('Completed Subjects', completed)}
                        </section>
                    `;
            }).join('')}
                    </div>
                </div>
            `;
            detail.classList.remove('hidden');
            const sectionItems = sections.flatMap(section => section.items);
            detail.querySelectorAll('.subjects-inline-card').forEach((card, index) => {
                card.addEventListener('click', () => handleInlineCardSelection(programKey, sectionItems[index]));
                card.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleInlineCardSelection(programKey, sectionItems[index]);
                    }
                });
            });
            detail.querySelectorAll('.subjects-inline-ai-icon').forEach(btn => {
                btn.addEventListener('click', event => {
                    event.stopPropagation();
                    askSigmaAbout(btn.dataset.aiSubject, btn.dataset.aiInsight);
                });
            });
            syncInlinePanelBackButtons();
            return;
        }

        const enrolled = items.filter(s => (s.progress ?? 0) < 100);
        const completed = items.filter(s => (s.progress ?? 0) >= 100);

        detail.innerHTML = `
            <div class="subjects-inline-shell${isCoreSubjects ? ' subjects-inline-shell--core' : ''} px-12 py-10">
                ${renderGroup('Enrolled Subjects', enrolled)}
                ${renderGroup('Completed Subjects', completed)}
            </div>
        `;
        detail.classList.remove('hidden');
        detail.querySelectorAll('.subjects-inline-card').forEach((card, index) => {
            card.addEventListener('click', () => handleInlineCardSelection(programKey, items[index]));
            card.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleInlineCardSelection(programKey, items[index]);
                }
            });
        });
        detail.querySelectorAll('.subjects-inline-ai-icon').forEach(btn => {
            btn.addEventListener('click', event => {
                event.stopPropagation();
                askSigmaAbout(btn.dataset.aiSubject, btn.dataset.aiInsight);
            });
        });
        syncInlinePanelBackButtons();
    }

    function openInlineProgramFocus(programKey, pushState = true, animate = true) {
        const row = document.querySelector('.subject-paths-row');
        const panels = Array.from(document.querySelectorAll('.subject-path-panel[data-program-key]'));
        if (!row || !panels.length) return;
        if (currentInlineProgram === programKey && pushState) {
            resetSubjectsInlineExplorer(true);
            return;
        }
        resetSubjectsInlineExplorer();
        const animationToken = inlineAnimationToken;
        currentInlineProgram = programKey;
        currentCurriculumProgram = programKey;
        currentCurriculumCluster = null;
        // Show browser/main scrollbar once a panel detail is open.
        setSubjectsPageScrollLocked(false);

        const anchor = getInlineAnchor(programKey);
        const selectedIndex = panels.findIndex(p => p.dataset.programKey === programKey);
        if (selectedIndex === -1) return;

        const targetIndex = anchor === 'left' ? 0 : panels.length - 1;
        const animationDuration = 460;
        const selectedPanel = panels[selectedIndex];
        if (!selectedPanel) return;

        const selectedOffsetPercent = (selectedIndex - targetIndex) * 100;
        const detail = document.getElementById('subjects-inline-detail');
        if (!detail) return;

        if (!animate) {
            panels.forEach(panel => {
                panel.getAnimations().forEach(animation => animation.cancel());
                panel.style.transition = '';
                panel.style.transform = '';
                panel.style.visibility = '';
                panel.classList.remove('is-hidden-left', 'is-hidden-right', 'is-selected-left', 'is-selected-right', 'is-collapsed', 'is-locked');
            });
            row.classList.toggle('inline-active-left', anchor === 'left');
            row.classList.toggle('inline-active-right', anchor === 'right');
            selectedPanel.classList.add(anchor === 'left' ? 'is-selected-left' : 'is-selected-right');
            panels.forEach(panel => {
                if (panel.dataset.programKey !== programKey) {
                    panel.classList.add('is-collapsed');
                }
            });
            renderSubjectsInlineDetail(programKey);
            return;
        }

        panels.forEach((panel, panelIndex) => {
            const panelKey = panel.dataset.programKey;
            panel.style.transition = 'none';
            panel.style.transform = 'translateX(0)';
            if (panelKey === programKey) {
                return;
            }
            const direction = panelIndex < selectedIndex ? -1 : 1;
        });

        panels.forEach(panel => panel.getBoundingClientRect());
        requestAnimationFrame(() => {
            if (animationToken !== inlineAnimationToken) return;
            panels.forEach((panel, panelIndex) => {
                panel.style.transition = `transform ${animationDuration}ms cubic-bezier(0.22, 1, 0.36, 1)`;
                if (panel.dataset.programKey === programKey) {
                    const directionToTarget = anchor === 'left' ? -1 : 1;
                    panel.style.transform = `translateX(${Math.abs(selectedOffsetPercent) * directionToTarget}%)`;
                } else {
                    const direction = panelIndex < selectedIndex ? -1 : 1;
                    panel.style.transform = `translateX(${direction * 260}%)`;
                }
            });
        });

        const settleTimer = window.setTimeout(() => {
            if (animationToken !== inlineAnimationToken) return;
            const selectedStartRect = selectedPanel.getBoundingClientRect();
            row.classList.toggle('inline-active-left', anchor === 'left');
            row.classList.toggle('inline-active-right', anchor === 'right');
            selectedPanel.classList.add(anchor === 'left' ? 'is-selected-left' : 'is-selected-right');
            renderSubjectsInlineDetail(programKey);
            panels.forEach(panel => {
                if (panel.dataset.programKey !== programKey) {
                    panel.classList.add('is-collapsed');
                }
                panel.style.transition = 'none';
                panel.style.transform = '';
            });
            const selectedEndRect = selectedPanel.getBoundingClientRect();
            const selectedDeltaX = selectedStartRect.left - selectedEndRect.left;
            const detailOffsetX = anchor === 'left' ? 72 : -72;
            selectedPanel.style.transform = `translateX(${selectedDeltaX}px)`;
            detail.style.transition = 'none';
            detail.style.opacity = '0';
            detail.style.transform = `translateX(${detailOffsetX}px)`;
            detail.style.visibility = '';
            detail.style.pointerEvents = 'none';
            requestAnimationFrame(() => {
                if (animationToken !== inlineAnimationToken) return;
                selectedPanel.style.transition = `transform 320ms cubic-bezier(0.22, 1, 0.36, 1)`;
                detail.style.transition = 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease';
                selectedPanel.style.transform = 'translateX(0)';
                detail.style.transform = 'translateX(0)';
                detail.style.opacity = '1';
            });
            const cleanupTimer = window.setTimeout(() => {
                if (animationToken !== inlineAnimationToken) return;
                panels.forEach(panel => {
                    panel.removeAttribute('style');
                });
                detail.removeAttribute('style');
            }, 360);
            inlineAnimationTimers.push(cleanupTimer);
        }, animationDuration);
        inlineAnimationTimers.push(settleTimer);
    }
    window.openInlineProgramFocus = openInlineProgramFocus;


    function switchToTopicPage(subjectId, pushHistory = true, activeTopicIdx = null, initialTab = 'videos') {
        const data = getTopicData(subjectId);
        const subject = getTopicSubject(subjectId);
        if (!data || !subject) return;

        const resolvedTopicIdx = Number.isInteger(activeTopicIdx)
            ? activeTopicIdx
            : (currentTopicState.subjectId === subjectId && Number.isInteger(currentTopicState.topicIdx) ? currentTopicState.topicIdx : 0);
        const resolvedSection = currentTopicState.subjectId === subjectId ? (currentTopicState.selectedSection || '') : '';
        const resolvedStudent = currentTopicState.subjectId === subjectId ? (currentTopicState.selectedStudent || '') : '';

        if (pushHistory) {
            history.pushState({ type: 'topic', subjectId, topicIdx: resolvedTopicIdx }, '', '#topic:' + subjectId);
            localStorage.setItem('sigma-teacher-nav-state', JSON.stringify({ type: 'topic', subjectId, topicIdx: resolvedTopicIdx }));
        }

        navLinks.forEach(link => link.classList.remove('active'));
        document.getElementById('nav-subjects')?.classList.add('active');

        resetClassroomDetailLayout();

        const navContextText = document.getElementById('nav-context-text');
        if (navContextText) navContextText.textContent = subject.name || 'Subjects';

        if (window.setTeacherActiveSubject) window.setTeacherActiveSubject(subjectId);
        currentTopicState = { subjectId, topicIdx: resolvedTopicIdx, activeTab: initialTab, videoIdx: 0, activeIdx: null, selectedSection: resolvedSection, selectedStudent: resolvedStudent, showGradebookPanel: false };

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
            'not-started': 'fa-circle text-gray-300'
        };

        buildTopicPage(subjectId, subject, data, statusIconClass);
        hideAllSections();
        showSection('section-topic-detail');

        // document.body.classList.add('sidebar-collapsed');
        // sidebar.classList.add('sidebar-collapsed');
        // Do not hide the sub-sidebar, let it persist so the user can continue navigating subjects
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function loadTopicSubSidebar(subject, data, statusIconClass, activeIdx = null) {
        const content = document.getElementById('sub-sidebar-content');
        const title = document.getElementById('sub-sidebar-title');
        const header = document.getElementById('sub-sidebar-header');
        if (!content) return;
        const subjectId = subject.id || subject.key;
        const resolvedActiveIdx = activeIdx ?? (currentTopicState.subjectId === subjectId ? currentTopicState.topicIdx : null);
        if (header) header.classList.remove('hidden');
        if (title) title.textContent = data.text || subject.name || 'Topics';

        content.innerHTML = data.q1Topics.map((t, i) => {
            const isActive = i === resolvedActiveIdx;
            return `
            <button onclick="openTopicContent('${subjectId}', ${i})" class="topic-nav-item w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 group ${isActive ? 'active' : 'hover:bg-gray-50'}">
                <i class="fa-solid ${statusIconClass[t.status] || 'fa-circle text-gray-200'} mt-1 flex-shrink-0"></i>
                <div class="min-w-0">
                    <p class="text-[10px] font-black text-black uppercase tracking-widest mb-0.5">Topic ${i + 1}</p>
                    <p class="topic-nav-title text-[13px] font-bold leading-tight transition-colors truncate">${t.title}</p>
                </div>
            </button>
        `;
        }).join('');
    }

    function buildTopicPage(subjectId, subject, data, statusIconClass) {
        const page = document.getElementById('section-topic-detail');
        if (!page) return;
        // Only show real progress when a section is selected
        const sectionSelected = Boolean(currentTopicState.selectedSection);
        const quarter1Pct = sectionSelected ? (data.q1Percent || 0) : 0;
        const quarter2Pct = sectionSelected ? (data.q2Percent || 0) : 0;
        const quarter3Pct = sectionSelected ? (data.q3Percent || 0) : 0;
        const quarter4Pct = sectionSelected ? (data.q4Percent || 0) : 0;
        const overallPct = sectionSelected ? Math.round((quarter1Pct + quarter2Pct + quarter3Pct + quarter4Pct) / 4) : 0;
        const topicImages = ['image/Topic.jpg', 'image/Topic2.jpg'];
        const topicOverview = {
            'Nature and Elements of Communication': 'Identify how messages are created, sent, received, and interpreted in real situations.',
            'Functions of Communication': 'See how communication informs, influences, regulates, and builds relationships.',
            'Communication Models': 'Compare common models and how feedback moves across each communication process.',
            'Communication Breakdown': 'Recognize barriers that interrupt meaning and plan ways to avoid them.',
            'Speech Context, Style, and Act': 'Practice choosing language, tone, and delivery for specific audiences.',
            'Principles of Speech Writing and Delivery': 'Prepare clear speeches with organized points and confident delivery.',
            'Origin and Structure of the Earth': 'Explore the history of the solar system and the geological layers that form our planet.',
            'Earth Materials and Processes': 'Study the minerals, rocks, and tectonic movements that shape the Earth\'s surface.',
            'Natural Hazards, Mitigation, and Adaptation': 'Understand environmental risks and develop strategies for community safety and resilience.',
            'Matter, Light, and the Cosmos': 'Examine the fundamental properties of matter and the vast structures of the universe.',
            'Perpetuation of Life and Reproduction': 'Learn about biological inheritance and the diverse mechanisms that sustain life across generations.'
        };
        const statusText = {
            completed: 'Done',
            'in-progress': 'In Progress',
            'not-started': 'Locked'
        };
        const overallColor = overallPct >= 90 ? 'text-green-600' : overallPct >= 80 ? 'text-icc' : overallPct >= 75 ? 'text-yellow-600' : overallPct > 0 ? 'text-red-500' : 'text-gray-400';
        const renderTopicCard = (topic, index) => `
            <div class="teacher-topic-card" onclick="openTopicContent('${subjectId}', ${index})">
                <div class="teacher-topic-card__image-container">
                    <img src="${topicImages[index % topicImages.length]}" alt="" class="teacher-topic-card__image">
                </div>
                <div class="teacher-topic-card__body">
                    <div class="teacher-topic-card__meta">
                        <span>Topic ${index + 1}</span>
                        <i class="fa-solid text-xl ${statusIconClass[topic.status] || 'fa-circle text-gray-200'}"></i>
                    </div>
                    <h3>${topic.title}</h3>
                    <p>${topicOverview[topic.title] || `Review the key concepts, activities, and learning outputs.`}</p>
                    <div class="mt-auto pt-4 text-right">
                        <button class="teacher-topic-open-btn inline-flex items-center gap-2 px-6 py-2.5 bg-icc text-white rounded-full font-bold text-sm shadow">
                            Open Topic <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        page.innerHTML = `
            <div class="w-full">
                <div class="teacher-topic-page-shell min-h-screen">
                    <div class="teacher-topic-page-grid">
                        <div class="teacher-topic-main-shell">
                            <div class="teacher-topic-header">
                                <h1>${data.text || 'Topics'}</h1>
                            </div>
                            <div class="teacher-topic-list">
                                ${data.q1Topics.map((topic, index) => renderTopicCard(topic, index)).join('')}
                            </div>
                        </div>

                        ${_buildProgressRail(data)}
                    </div>
                </div>
            </div>
        `;
    }

    // --- TOPIC CONTENT SYSTEM (Standardized) ---
    const TAB_LABELS = { videos: 'Videos', handouts: 'Lessons', assignments: 'Assignments', quiz: 'Quizzes', activity: 'Activities', performance: 'Performance Tasks' };
    const TAB_ICONS = {
        videos: 'fa-solid fa-play',
        handouts: 'fa-solid fa-book-open',
        assignments: 'fa-solid fa-file-pen',
        quiz: 'fa-solid fa-square-poll-vertical',
        activity: 'fa-solid fa-flask',
        performance: 'fa-solid fa-star'
    };

    const assessmentData = {
        default: {
            startDate: '&nbsp;', startTime: '&nbsp;',
            dueDate: '&nbsp;', dueTime: '&nbsp;',
            maxScore: 0, maxAttempts: 0,
            latePermission: false,
            instructionType: 'text', // 'text' or 'pdf'
            instructionPdf: { title: 'Activity Instructions Sheet', pages: 4, size: '0.6 MB', uploader: 'Teacher' },
            submission: null // null = not yet submitted
        }
    };

    let currentTopicState = {
        subjectId: null,
        topicIdx: null,
        activeTab: 'videos',
        videoIdx: 0,
        selectedSection: '',
        showGradebookPanel: false
    };

    window.openTopicContent = function (subjectId, topicIdx, tab = 'videos', subIdx = null, pushHistory = true, stateOverrides = {}) {
        const data = getTopicData(subjectId);
        const subject = getTopicSubject(subjectId);
        if (!data || !subject) return;

        if (pushHistory) {
            const hash = `#topic-content:${subjectId}:${topicIdx}:${tab}:${subIdx}`;
            history.pushState({ type: 'topic-content', subjectId, topicIdx, tab, subIdx }, '', hash);
            localStorage.setItem('sigma-teacher-nav-state', JSON.stringify({ type: 'topic-content', subjectId, topicIdx, tab, subIdx }));
        }

        // Preserve the selected section when navigating within the same subject
        let preservedSection = currentTopicState.subjectId === subjectId ? (currentTopicState.selectedSection || '') : '';
        let preservedStudent = currentTopicState.subjectId === subjectId ? (currentTopicState.selectedStudent || '') : '';
        
        // Apply overrides if provided (e.g. from Gradebook)
        if (stateOverrides.selectedSection) preservedSection = stateOverrides.selectedSection;
        if (stateOverrides.selectedStudent) preservedStudent = stateOverrides.selectedStudent;

        currentTopicState = { 
            subjectId, 
            topicIdx, 
            activeTab: tab, 
            videoIdx: subIdx, 
            activeIdx: subIdx, 
            selectedSection: preservedSection, 
            selectedStudent: preservedStudent, 
            showGradebookPanel: false 
        };
        window._tcAssessmentDetailIdx = subIdx;
        window._scAssessmentDetailIdx = subIdx; // Support both naming conventions for parity

        // Manage sidebar active state manually to avoid switchTab fallback to Home
        navLinks.forEach(l => l.classList.remove('active'));
        const subjectsLink = document.getElementById('nav-subjects');
        if (subjectsLink) subjectsLink.classList.add('active');
        
        // Clear any lingering sub-navigation highlights (e.g. from Gradebooks)
        if (typeof window.clearSubNavigationHighlights === 'function') {
            window.clearSubNavigationHighlights();
        }
        
        // Ensure the correct sections are toggled
        hideAllSections();
        showSection('section-topic-content');

        const navContextText = document.getElementById('nav-context-text');
        if (navContextText) navContextText.textContent = 'Subjects';

        buildTopicContentPage(subjectId, topicIdx);

        // On desktop, swap sub-sidebar to topic contents
        if (window.innerWidth >= 1024) {
            renderTopicContentsSidebar(subjectId, topicIdx, tab);
        }

        // Auto-scroll to player
        setTimeout(() => {
            const player = document.getElementById('topic-video-player-container');
            if (player) {
                const headerOffset = 100;
                const elementPosition = player.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }, 100);
    };

    window.switchTopicTab = function (tab, assessmentIdx = null) {
        scrollToTop();
        if (!currentTopicState.subjectId) return;

        // Stop all videos and iframes in the main container before switching
        const container = document.getElementById('topic-content-main');
        if (container) {
            container.querySelectorAll('iframe, video').forEach(media => {
                const src = media.src;
                media.src = '';
                if (media.pause) media.pause();
            });
        }

        currentTopicState.activeTab = tab;
        currentTopicState.videoIdx = null;
        currentTopicState.showGradebookPanel = false;
        window._tcAssessmentDetailIdx = assessmentIdx;

        // Persist tab switch in hash and localStorage with PUSH state for back button
        const { subjectId, topicIdx } = currentTopicState;
        const hash = `#topic-content:${subjectId}:${topicIdx}:${tab}:${assessmentIdx}`;
        history.pushState(currentTopicState, '', hash);
        localStorage.setItem('sigma-teacher-nav-state', JSON.stringify({ type: 'topic-content', subjectId, topicIdx, activeTab: tab, videoIdx: null, assessmentIdx }));

        _renderTopicContentMain();
        renderTopicContentsSidebar(currentTopicState.subjectId, currentTopicState.topicIdx, tab);

        // Auto Refresh Scroll Position
        const mainScroll = document.querySelector('.teacher-topic-main-shell > .overflow-y-auto');
        if (mainScroll) {
            mainScroll.scrollTop = 0;
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    function getTopicTabs() {
        return ['videos', 'handouts', 'assignments', 'quiz', 'activity', 'performance'];
    }

    function buildTopicContentPage(subjectId, topicIdx) {
        const page = document.getElementById('section-topic-content');
        if (!page) return;

        page.innerHTML = `
            <div class="teacher-topic-page-shell pt-0 px-0 pb-0 min-h-screen overflow-visible">
                <div class="teacher-topic-page-grid">
                    <!-- Main Content Panel (1024px) -->
                    <div class="teacher-topic-main-shell standard-panel-shadow h-[calc(100vh-var(--shell-offset))] flex flex-col bg-white">
                        <div id="topic-breadcrumb-container" class="px-10 py-0 flex-shrink-0">
                            <!-- Breadcrumb injected here -->
                        </div>
                        <div id="topic-content-header" class="px-0 py-0 border-b border-gray-50 flex-shrink-0">
                            <!-- tabNav injected here -->
                        </div>
                        <div id="topic-content-main" class="px-10 py-0 flex-1 overflow-y-auto">
                            <!-- Content injected by _renderTopicContentMain() -->
                        </div>
                    </div>

                    <!-- Progress Rail -->
                    <div id="topic-right-section" class="teacher-topic-progress-rail">
                        <!-- Context/Details Injected here -->
                    </div>
                </div>
            </div>
        `;

        _renderTopicContentMain();
    }

    function normalizeTopicSubjectName(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/^computer\s+/i, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function getCurrentTopicSectionCards(data) {
        const subject = getTopicSubject(currentTopicState.subjectId);
        const candidates = [
            subject?.name,
            subject?.text,
            subject?.title,
            data?.text,
            data?.name,
            data?.title
        ].map(normalizeTopicSubjectName).filter(Boolean);

        return getTeacherSectionCards()
            .filter(card => {
                const cardName = normalizeTopicSubjectName(card.name);
                const isCurrentSubject = candidates.includes(cardName) || candidates.some(name => cardName.includes(name) || name.includes(cardName));
                const isAllowedGrade = /^Grade\s+(11|12)\b/i.test(card.sectionName || '');
                return isCurrentSubject && isAllowedGrade;
            })
            .filter((card, index, cards) => cards.findIndex(item => item.sectionName === card.sectionName) === index);
    }

    function _buildTopicSectionSelectorCard(data) {
        const selectedSection = currentTopicState.selectedSection || '';
        const selectedStudent = currentTopicState.selectedStudent || '';
        const sectionOptions = getCurrentTopicSectionCards(data)
            .map(card => `<option value="${escapeHtml(card.sectionName)}" ${card.sectionName === selectedSection ? 'selected' : ''}>${escapeHtml(card.sectionName)}</option>`)
            .join('');

        const isAssessmentTab = ['assignments', 'quiz', 'activity', 'performance'].includes(currentTopicState.activeTab);
        const isLocked = !selectedSection;

        return `
            <div class="teacher-topic-progress-card teacher-topic-nav-card sharp-shadow border border-gray-100">
                <label for="topic-content-section-select" class="teacher-topic-progress-kicker">Sections</label>
                <div class="teacher-topic-select-wrap">
                    <select id="topic-content-section-select" class="teacher-topic-section-select" onchange="window.openTopicSectionFromRail?.(this.value)">
                        <option value="" disabled ${selectedSection ? '' : 'selected'}>Select section</option>
                        ${sectionOptions}
                    </select>
                    <i class="fa-solid fa-chevron-down"></i>
                </div>
                <button
                    type="button"
                    id="topic-student-picker-btn"
                    class="teacher-topic-student-btn ${isLocked ? 'teacher-topic-student-btn--locked' : ''}"
                    onclick="${isLocked ? '' : 'window.openTopicStudentPicker?.()'}"
                    ${isLocked ? 'disabled' : ''}
                    title="${isLocked ? 'Select a section first' : 'Pick a student'}"
                >
                    <i class="fa-solid fa-user-graduate"></i>
                    <span>${selectedStudent ? escapeHtml(selectedStudent) : 'Students'}</span>
                </button>
                ${(isAssessmentTab && window._tcAssessmentDetailIdx !== null) ? `
                    <button type="button" class="teacher-topic-gradebook-link teacher-topic-gradebook-link--inside" onclick="window.openGradebookFromWorkstation?.()">
                        <i class="fa-solid fa-book"></i>
                        <span>Gradebooks</span>
                    </button>
                ` : ''}

            </div>
        `;
    }

    // â”€â”€ Student Picker Overlay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    window.openTopicStudentPicker = function () {
        const section = currentTopicState.selectedSection || '';
        if (!section) return;

        const students = (typeof studentsBySection !== 'undefined' ? studentsBySection[section] : []) || [];
        const selected = currentTopicState.selectedStudent || '';

        const overlay = document.createElement('div');
        overlay.id = 'topic-student-picker-overlay';
        overlay.className = 'topic-student-picker-overlay';
        overlay.innerHTML = `
            <div class="topic-student-picker-panel">
                <div class="topic-student-picker-header">
                    <div>
                        <p class="topic-student-picker-kicker">Students</p>
                        <p class="topic-student-picker-section">${escapeHtml(section)}</p>
                    </div>
                    <button type="button" class="topic-student-picker-exit" onclick="window.closeTopicStudentPicker?.()">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="topic-student-picker-search-wrap">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <input
                        id="topic-student-search"
                        type="text"
                        class="topic-student-picker-search"
                        placeholder="Search student..."
                        oninput="window._filterTopicStudents?.(this.value)"
                        autocomplete="off"
                    />
                </div>
                <div class="topic-student-picker-list" id="topic-student-picker-list">
                    ${students.map(s => `
                        <button type="button"
                            class="topic-student-item ${s.name === selected ? 'topic-student-item--active' : ''}"
                            onclick="window.selectTopicStudent?.('${escapeHtml(s.name)}')"
                            data-name="${escapeHtml(s.name)}"
                        >
                            <span class="topic-student-item-avatar">${escapeHtml(s.name.charAt(0))}</span>
                            <span class="topic-student-item-name">${escapeHtml(s.name)}</span>
                            ${s.name === selected ? '<i class="fa-solid fa-check topic-student-item-check"></i>' : ''}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('topic-student-picker-overlay--visible'));
        document.getElementById('topic-student-search')?.focus();
    };

    window.closeTopicStudentPicker = function () {
        const overlay = document.getElementById('topic-student-picker-overlay');
        if (!overlay) return;
        overlay.classList.remove('topic-student-picker-overlay--visible');
        overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    };

    window.selectTopicStudent = function (name) {
        const isToggle = currentTopicState.selectedStudent === name;
        
        if (isToggle) {
            currentTopicState.selectedStudent = '';
            if (typeof window.clearGradebookHighlights === 'function') {
                window.clearGradebookHighlights(false, true); // Clear inner
                window.clearGradebookHighlights(true, true);  // Clear outer
            }
            const btn = document.getElementById('topic-student-picker-btn');
            if (btn) {
                const span = btn.querySelector('span');
                if (span) span.textContent = 'Select Student';
            }
        } else {
            currentTopicState.selectedStudent = name;
            window.closeTopicStudentPicker();

            // Directly update the button label in the DOM instantly
            const btn = document.getElementById('topic-student-picker-btn');
            if (btn) {
                const span = btn.querySelector('span');
                if (span) span.textContent = name;
                btn.classList.remove('teacher-topic-student-btn--locked');
                btn.disabled = false;
            }

            // Synchronize Gradebook highlight if visible
            const gbPrefixes = ['gradebook-', 'gradebook-outer-'];
            gbPrefixes.forEach(prefix => {
                const table = document.getElementById(prefix + 'spreadsheet');
                if (table) {
                    const rows = table.querySelectorAll('tbody tr');
                    rows.forEach(tr => {
                        const nameCell = tr.querySelector('td:first-child p:first-child');
                        if (nameCell && nameCell.textContent.trim() === name) {
                            if (typeof window.highlightGradebookRow === 'function') {
                                window.highlightGradebookRow(tr, prefix.includes('outer'));
                            }
                        }
                    });
                }
            });
        }

        // Refresh the progress panel after the overlay fade-out completes
        setTimeout(() => {
            const topicContentVisible = !document.getElementById('section-topic-content')?.classList.contains('hidden');
            const topicPageVisible = !document.getElementById('section-topic-detail')?.classList.contains('hidden');
            if (topicContentVisible) {
                _renderTopicContentMain();   // re-renders progress rail inside topic content page
            } else if (topicPageVisible) {
                _refreshTopicPageRail();      // patches just the progress rail on topic overview page
            }
        }, 280); // matches overlay close transition duration
    };

    window._filterTopicStudents = function (query) {
        const list = document.getElementById('topic-student-picker-list');
        if (!list) return;
        const q = query.toLowerCase().trim();
        list.querySelectorAll('.topic-student-item').forEach(btn => {
            const name = (btn.dataset.name || '').toLowerCase();
            btn.style.display = name.includes(q) ? '' : 'none';
        });
    };



    /**
     * Deterministic per-student quarter progress calculator.
     * Uses a hash of (studentName + topicIndex + assessmentType) to decide
     * whether each assessment slot was "submitted" by this student.
     * Respects topic status: completed &rarr; high chance, in-progress &rarr; partial, not-started &rarr; 0.
     */
    function _calcStudentQuarterProgress(studentName, topics, quarter) {
        if (!topics || topics.length === 0) return null;
        
        const subjectId = currentTopicState.subjectId;
        // Resolve student ID
        const student = getGradebookStudents().find(s => s.name === studentName);
        if (!student) return 0;
        const studentId = student.id;

        const assessmentTypes = ['assignment', 'quiz', 'activity', 'perf. task'];
        let total = 0, done = 0;

        topics.forEach((topic, ti) => {
            assessmentTypes.forEach((type) => {
                // There are 2 assessments per category per topic based on our generation logic
                for (let i = 0; i < 2; i++) {
                    total++;
                    const idx = (ti * 2) + i;
                    const score = gradebookScores[subjectId]?.[quarter]?.[studentId]?.[type]?.[idx];
                    const status = gradebookStatuses[subjectId]?.[quarter]?.[studentId]?.[type]?.[idx];
                    
                    // Count as "done" if there's a score or a status (like Absent/Missing)
                    if ((score !== undefined && score !== null && score !== '') || (status && status !== '')) {
                        done++;
                    }
                }
            });
        });

        return total > 0 ? Math.round((done / total) * 100) : 0;
    }

    function _buildProgressRail(data) {
        // Progress requires both a section AND a student to be selected
        const studentSelected = Boolean(currentTopicState.selectedStudent);
        const sectionSelected = Boolean(currentTopicState.selectedSection);
        const showProgress = sectionSelected && studentSelected;

        const studentName = currentTopicState.selectedStudent || '';
        const q1Topics = data.q1Topics || [];
        const q2Topics = data.q2Topics || [];
        const q3Topics = data.q3Topics || [];
        const q4Topics = data.q4Topics || [];

        // Calculate per-student quarter completion from this subject's topic data
        const quarter1Pct = showProgress ? (_calcStudentQuarterProgress(studentName, q1Topics, 1) ?? 0) : 0;
        const quarter2Pct = showProgress && q2Topics.length > 0 ? (_calcStudentQuarterProgress(studentName, q2Topics, 2) ?? 0) : (q2Topics.length > 0 ? 0 : null);
        const quarter3Pct = showProgress && q3Topics.length > 0 ? (_calcStudentQuarterProgress(studentName, q3Topics, 3) ?? 0) : (q3Topics.length > 0 ? 0 : null);
        const quarter4Pct = showProgress && q4Topics.length > 0 ? (_calcStudentQuarterProgress(studentName, q4Topics, 4) ?? 0) : (q4Topics.length > 0 ? 0 : null);

        // Overall = (Q1 + Q2 + Q3 + Q4) / 4 &mdash; always divided by 4
        const activeVals = [quarter1Pct, quarter2Pct, quarter3Pct, quarter4Pct].filter(v => v !== null);
        const overallPct = showProgress && activeVals.length > 0
            ? Math.round((quarter1Pct + (quarter2Pct ?? 0) + (quarter3Pct ?? 0) + (quarter4Pct ?? 0)) / 4)
            : 0;

        const renderBar = (label, pct) => {
            if (pct === null) {
                return `
                    <div class="mt-3">
                        <div class="flex justify-between items-center">
                            <span class="teacher-topic-progress-label" style="color:#d1d5db">${label}</span>
                            <span class="text-[10px] font-black" style="color:#d1d5db">&mdash;</span>
                        </div>
                        <div class="teacher-topic-progress-bar mt-1.5" style="background:#f3f4f6">
                            <div class="h-full rounded-full" style="width:0%;background:#e5e7eb"></div>
                        </div>
                    </div>`;
            }
            return `
                    <div class="mt-3">
                        <div class="flex justify-between items-center">
                            <span class="teacher-topic-progress-label">${label}</span>
                            <span class="text-[10px] font-black text-black">${pct}%</span>
                        </div>
                        <div class="teacher-topic-progress-bar bg-gray-100 mt-1.5">
                            <div class="h-full bg-icc rounded-full transition-all" style="width:${pct}%"></div>
                        </div>
                    </div>`;
        };

        return `
            <div class="teacher-topic-progress-rail">
                ${_buildTopicSectionSelectorCard(data)}
                <div class="teacher-topic-progress-card sharp-shadow border border-gray-100">
                    <p class="teacher-topic-progress-kicker">Progress</p>
                    <div class="text-center py-1">
                        <div class="teacher-topic-progress-percent text-black">${overallPct}%</div>
                    </div>
                    <div>
                        <div class="flex justify-between items-center mb-1.5">
                            <span class="teacher-topic-progress-label">1st Quarter</span>
                            <span class="text-[10px] font-black text-black">${quarter1Pct}%</span>
                        </div>
                        <div class="teacher-topic-progress-bar bg-gray-100">
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

    /** Re-renders only the progress rail on the topic OVERVIEW page (section-topic-detail). */
    function _refreshTopicPageRail() {
        const subjectId = currentTopicState.subjectId;
        const data = subjectId ? getTopicData(subjectId) : null;
        if (!data) return;
        const detail = document.getElementById('section-topic-detail');
        if (!detail) return;
        const oldRail = detail.querySelector('.teacher-topic-progress-rail');
        if (!oldRail) return;
        const temp = document.createElement('div');
        temp.innerHTML = _buildProgressRail(data);
        const newRail = temp.querySelector('.teacher-topic-progress-rail');
        if (newRail) oldRail.replaceWith(newRail);
    }



    window.openTopicSectionFromRail = function (sectionName) {
        // Clear selected student when section changes
        if (currentTopicState.selectedSection !== (sectionName || '')) {
            currentTopicState.selectedStudent = '';
        }
        currentTopicState.selectedSection = sectionName || '';
        window._tcAssessmentDetailIdx = null;
        const topicContentVisible = !document.getElementById('section-topic-content')?.classList.contains('hidden');
        if (topicContentVisible) {
            _renderTopicContentMain();
            return;
        }

        if (currentTopicState.subjectId) {
            const subject = getTopicSubject(currentTopicState.subjectId);
            const data = getTopicData(currentTopicState.subjectId);
            const statusIconClass = {
                completed: 'fa-check-circle text-green-500',
                'in-progress': 'fa-circle-half-stroke text-yellow-500',
                'not-started': 'fa-circle text-gray-300'
            };
            if (subject && data) buildTopicPage(currentTopicState.subjectId, subject, data, statusIconClass);
        }
    };

    window.openTopicGradebooks = function () {
        if (typeof window.openGradebookOuterLayer === 'function') {
            window.openGradebookOuterLayer();
        }
    };

    window.openGradebookFromWorkstation = function() {
        if (typeof window.openGradebookOuterLayer !== 'function') return;
        
        const categoryMap = {
            'assignments': 'assignment',
            'quiz': 'quiz',
            'activity': 'activity',
            'performance': 'perf. task'
        };
        
        const category = categoryMap[currentTopicState.activeTab];
        const globalIdx = (Number(currentTopicState.topicIdx) * 2) + Number(window._tcAssessmentDetailIdx);
        
        window.openGradebookOuterLayer(category, globalIdx);
    };

    function _buildTopicGradebookPanel(tab, subject, topic) {
        const selectedSection = currentTopicState.selectedSection || '';
        const tabLabel = TAB_LABELS[tab] || 'Assessment';
        const subjectName = subject?.name || subject?.text || subject?.title || 'Subject';

        if (!selectedSection) {
            return `
                <div class="space-y-4 mt-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div class="teacher-topic-empty-panel">
                        <p>Select a section to view its gradebook file panel.</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="space-y-4 mt-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div class="teacher-topic-gradebook-file-panel handout-card group flex items-center gap-6 p-6 bg-white border border-gray-100 rounded-[22px] sharp-shadow hover:border-black transition-all cursor-pointer" onclick="switchTab('nav-grades')">
                    <div class="w-14 h-14 rounded-2xl bg-icc-light flex items-center justify-center text-icc flex-shrink-0">
                        <i class="fa-solid fa-book text-xl"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-[10px] font-black uppercase tracking-widest text-[#15803d] mb-1">${escapeHtml(selectedSection)}</p>
                        <h4 class="text-xl font-bold text-black leading-tight group-hover:text-yellow-500 transition-colors font-['Inter']">${escapeHtml(subjectName)} Gradebook</h4>
                    </div>
                    <i class="fa-solid fa-chevron-right text-black/40 group-hover:text-yellow-500 transition-colors"></i>
                </div>
            </div>
        `;
    }

    function _renderTopicContentMain() {
        const breadcrumbContainer = document.getElementById('topic-breadcrumb-container');
        const header = document.getElementById('topic-content-header');
        const container = document.getElementById('topic-content-main');
        const rightSection = document.getElementById('topic-right-section');
        if (!container || !header) return;

        const { subjectId, topicIdx, activeTab, videoIdx } = currentTopicState;
        const data = getTopicData(subjectId);
        const subject = getTopicSubject(subjectId);
        
        if (!data || !data.q1Topics) {
            console.error('Topic data missing for subject:', subjectId);
            return;
        }
        
        const topic = data.q1Topics[topicIdx] || { title: 'Unknown Topic' };

        header.innerHTML = _tabNav(activeTab);

        let html = '';
        let rightHtml = `
            <div class="teacher-topic-progress-rail-direct font-['Inter']">
                ${_buildProgressRail(data)}
            </div>
        `;

        try {
            if (activeTab === 'videos') {
                html = _buildVideosTab(subject, topic, subjectId, topicIdx, videoIdx);
            } else if (activeTab === 'handouts') {
                html = _buildHandoutsTab(subject, topic, subjectId, topicIdx);
            } else {
                // Assessment tabs (Assignments, Quiz, etc)
                const result = _buildAssessmentTab(activeTab, subject, topic, data, subjectId, topicIdx);
                html = result.mainHtml;
                if (result.rightHtml) {
                    rightHtml = result.rightHtml;
                }
            }
        } catch (err) {
            console.error('Workstation rendering error:', err);
            html = `
                <div class="p-20 text-center font-['Inter']">
                    <div class="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i class="fa-solid fa-triangle-exclamation text-3xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 mb-2">Something went wrong</h3>
                    <p class="text-gray-500 max-w-xs mx-auto">There was an error rendering the ${activeTab} tab. Please try switching tabs or reloading.</p>
                </div>
            `;
        }

        if (breadcrumbContainer) {
            breadcrumbContainer.innerHTML = '';
        }

        container.innerHTML = html;

        // Inject the focused progress rail
        if (rightSection) {
            rightSection.innerHTML = rightHtml;
            const isAssessmentDetail = ['assignments', 'quiz', 'activity', 'performance'].includes(activeTab)
                && window._tcAssessmentDetailIdx !== null
                && window._tcAssessmentDetailIdx !== undefined;
            rightSection.classList.toggle('teacher-topic-right-section--fixed', isAssessmentDetail);
        }

        // Trigger Auto-Refresh Animation
        container.classList.remove('animate-in', 'fade-in');
        void container.offsetWidth;
        container.classList.add('animate-in', 'fade-in');

        // Initialize any sliders if needed
        const handouts = topic.handouts || topicHandouts[subjectId] || [];
        if (activeTab === 'handouts' && handouts.length) {
            handouts.forEach((h, i) => {
                if (h.type === 'ppt' && h.slides) {
                    new HandoutSlider(`handout-slider-${i}`, h.slides);
                }
            });
        }
    }

    window.openHandoutOuterLayer = function (url, title) {
        if (!url || url === '#') return;

        const isPdf = url.toLowerCase().endsWith('.pdf');
        if (isPdf) {
            window.open(url, '_blank');
            return;
        }

        const isDocx = url.toLowerCase().endsWith('.docx');
        const isPptx = url.toLowerCase().endsWith('.pptx') || url.toLowerCase().endsWith('.ppt');

        // Construct absolute URL
        let absoluteUrl = url;
        if (!url.startsWith('http')) {
            absoluteUrl = new URL(url, window.location.origin).href;
        }

        if (isDocx || isPptx) {
            const newWindow = window.open('', '_blank');
            if (newWindow) {
                newWindow.document.write(`
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <title>Sigma Pro Viewer | ${title}</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
                        <!-- DOCX Preview Libraries -->
                        <script src="https://unpkg.com/jszip/dist/jszip.min.js"></script>
                        <script src="https://unpkg.com/docx-preview/dist/docx-preview.js"></script>
                        <style>
                            body { font-family: 'Inter', sans-serif; background-color: #525659; margin: 0; overflow: hidden; height: 100vh; display: flex; flex-direction: column; }
                            .bg-icc { background-color: #008148; }
                            .bg-icc-dark { background-color: #006b3c; }
                            .custom-scrollbar::-webkit-scrollbar { width: 12px; height: 12px; }
                            .custom-scrollbar::-webkit-scrollbar-track { background: #323639; }
                            .custom-scrollbar::-webkit-scrollbar-thumb { background: #525659; border: 3px solid #323639; border-radius: 6px; }
                            #preview-container { background: white; min-height: 100%; width: 100%; box-shadow: 0 0 50px rgba(0,0,0,0.3); }
                            /* Overwrite docx-preview styles to match our clean aesthetic */
                            .docx-wrapper { background-color: transparent !important; padding: 0 !important; }
                            .docx { box-shadow: none !important; margin-bottom: 0 !important; }
                        </style>
                    </head>
                    <body>
                        <!-- Sigma Pro Toolbar -->
                        <div class="h-12 bg-[#323639] border-b border-white/5 flex items-center justify-between px-4 text-white shadow-lg shrink-0">
                            <div class="flex items-center gap-1">
                                <button onclick="window.close()" class="w-8 h-8 rounded hover:bg-white/10 transition-all flex items-center justify-center text-white/80 hover:text-white" title="Close">
                                    <i class="fa-solid fa-xmark text-sm"></i>
                                </button>
                                <div class="w-px h-6 bg-white/10 mx-1"></div>
                                <button class="w-8 h-8 rounded hover:bg-white/10 transition-all flex items-center justify-center text-white/80 hover:text-white" onclick="window.print()" title="Print">
                                    <i class="fa-solid fa-print text-sm"></i>
                                </button>
                                <button class="w-8 h-8 rounded hover:bg-white/10 transition-all flex items-center justify-center text-white/80 hover:text-white" title="Thumbnails">
                                    <i class="fa-solid fa-table-cells-large text-sm"></i>
                                </button>
                            </div>

                            <div class="flex items-center gap-4">
                                <div class="flex items-center gap-3 bg-black/20 px-3 py-1 rounded-md border border-white/5">
                                    <button class="text-white/60 hover:text-white"><i class="fa-solid fa-minus text-xs"></i></button>
                                    <div class="w-24 h-1 bg-white/10 rounded-full overflow-hidden relative">
                                        <div class="absolute inset-0 bg-icc w-3/4"></div>
                                    </div>
                                    <button class="text-white/60 hover:text-white"><i class="fa-solid fa-plus text-xs"></i></button>
                                    <span class="text-[10px] font-bold min-w-[30px] text-center">80%</span>
                                </div>
                                <div class="w-px h-6 bg-white/10"></div>
                                <div class="flex items-center gap-2">
                                    <button class="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center text-white/40"><i class="fa-solid fa-chevron-left text-[10px]"></i></button>
                                    <input type="text" value="1" class="w-8 h-6 bg-black/40 border border-white/10 rounded text-[10px] text-center font-bold focus:outline-none focus:border-icc">
                                    <span class="text-[10px] text-white/40">/ 1</span>
                                    <button class="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center text-white/40"><i class="fa-solid fa-chevron-right text-[10px]"></i></button>
                                </div>
                            </div>

                            <div class="flex items-center gap-3">
                                <div class="relative">
                                    <input type="text" placeholder="Search..." class="w-48 h-8 bg-black/40 border border-white/10 rounded-full px-4 py-1 text-[10px] text-white focus:outline-none focus:border-icc transition-all placeholder:text-white/20">
                                    <i class="fa-solid fa-magnifying-glass absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-[10px]"></i>
                                </div>
                                <a href="${absoluteUrl}" download class="h-8 px-4 rounded bg-icc hover:bg-icc-dark text-white text-[10px] font-bold uppercase tracking-widest no-underline flex items-center gap-2 transition-all shadow-lg">
                                    <i class="fa-solid fa-download text-xs"></i> Save
                                </a>
                            </div>
                        </div>

                        <!-- Main Viewing Area -->
                        <div class="flex-1 overflow-auto p-4 md:p-8 flex justify-center custom-scrollbar" id="viewport">
                            <div class="w-full max-w-5xl h-fit min-h-full flex flex-col items-center justify-center text-center bg-white" id="preview-container">
                                <div id="loader" class="flex flex-col items-center gap-4">
                                    <div class="w-12 h-12 border-4 border-icc border-t-transparent rounded-full animate-spin"></div>
                                    <p class="text-gray-400 text-xs font-bold uppercase tracking-widest">Preparing Document...</p>
                                </div>
                            </div>
                        </div>

                        <script>
                            async function loadPreview() {
                                const container = document.getElementById('preview-container');
                                const loader = document.getElementById('loader');
                                const fileUrl = '${absoluteUrl}';
                                const isDocx = fileUrl.toLowerCase().endsWith('.docx');
                                const isPptx = fileUrl.toLowerCase().endsWith('.pptx') || fileUrl.toLowerCase().endsWith('.ppt');

                                try {
                                    if (isDocx) {
                                        const response = await fetch(fileUrl);
                                        if (!response.ok) throw new Error('Failed to fetch file');
                                        const arrayBuffer = await response.arrayBuffer();
                                        
                                        loader.remove();
                                        container.classList.remove('justify-center');
                                        
                                        await docx.renderAsync(arrayBuffer, container);
                                    } else if (isPptx) {
                                        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                                        if (isLocal) {
                                            loader.innerHTML = \`
                                                <div class="w-24 h-24 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-gray-100">
                                                    <i class="fa-solid fa-file-powerpoint text-orange-500 text-5xl"></i>
                                                </div>
                                                <h3 class="text-2xl font-bold text-gray-900 mb-4">Development Preview</h3>
                                                <p class="text-gray-500 text-sm leading-relaxed mb-10 max-w-sm mx-auto">
                                                    PowerPoint previews require a live internet connection to render. Once your site is hosted, this will preview perfectly.
                                                </p>
                                                <a href="\${fileUrl}" download class="inline-flex items-center justify-center gap-3 px-10 py-5 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl">
                                                    <i class="fa-solid fa-download"></i> Download File
                                                </a>
                                            \`;
                                        } else {
                                            const mViewer = \`https://view.officeapps.live.com/op/embed.aspx?src=\${encodeURIComponent(fileUrl)}\`;
                                            container.innerHTML = \`<iframe src="\${mViewer}" class="w-full h-full border-none flex-1 min-h-[800px]" allow="fullscreen"></iframe>\`;
                                        }
                                    }
                                } catch (err) {
                                    console.error(err);
                                    loader.innerHTML = \`
                                        <i class="fa-solid fa-circle-exclamation text-red-500 text-4xl mb-4"></i>
                                        <h3 class="text-xl font-bold text-gray-900 mb-2">Oops! Preview failed</h3>
                                        <p class="text-gray-500 text-sm mb-6">We couldn't load the document directly.</p>
                                        <a href="\${fileUrl}" download class="inline-flex items-center justify-center gap-3 px-8 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all">
                                            <i class="fa-solid fa-download"></i> Download File
                                        </a>
                                    \`;
                                }
                            }
                            loadPreview();
                        </script>
                    </body>
                    </html>
                `);
                newWindow.document.close();
            }
            return;
        }

        window.open(url, '_blank');
    };

    function _tabNav(currentTab) {
        const tabs = getTopicTabs();
        const idx = tabs.indexOf(currentTab);
        const prev = idx > 0 ? tabs[idx - 1] : null;
        const next = idx < tabs.length - 1 ? tabs[idx + 1] : null;

        const { subjectId, topicIdx } = currentTopicState;
        const data = getTopicData(currentTopicState.subjectId);
        const topic = data.q1Topics[topicIdx];
        const tabLabel = TAB_LABELS[currentTab] || currentTab;

        return `
            <div class="flex flex-col w-full py-0 border-b border-gray-100 bg-white shadow-sm relative z-10">
                <!-- Header Row (Breadcrumbs) -->
                <div class="px-10 pt-6 pb-0">
                    <div class="flex items-center gap-2 text-black flex-wrap">
                        <span class="text-sm md:text-xl font-bold text-gray-900 tracking-tight leading-tight">${topic.title}</span>
                        <i class="fa-solid fa-chevron-right text-[10px] md:text-xs text-black/20 mx-1 flex-shrink-0"></i>
                        <span class="text-sm md:text-xl font-bold text-gray-900 tracking-tight whitespace-nowrap">${tabLabel}</span>
                    </div>
                </div>

                <!-- Action Row (Buttons) -->
                <div class="flex items-center justify-between w-full px-10 pt-4 pb-4">
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
                    
                    <!-- Desktop Action Buttons - Forced Visible -->
                    <div class="flex items-center gap-1 ml-4 flex-shrink-0">
                        <button onclick="switchToTopicPage('${subjectId}', true, ${topicIdx})" class="w-9 h-9 rounded-full flex items-center justify-center text-black hover:bg-slate-100 transition-colors" title="Back to Topics">
                            <i class="fa-solid fa-book text-lg"></i>
                        </button>
                        <button onclick="window.returnToRoomFromTopic?.('${subjectId}')" class="w-9 h-9 rounded-full flex items-center justify-center text-black hover:bg-slate-100 transition-colors" title="Back to Sections">
                            <i class="fa-solid fa-door-open text-lg"></i>
                        </button>

                    </div>
                </div>
            </div>
        `;
    }

    function _buildVideosTab(subject, topic, subjectId, topicIdx, activeIdx) {
        const videos = topic.videos || (topicVideos[subjectId] && typeof topicVideos[subjectId] === 'string' ? [{ id: 1, title: topic.title, duration: '12:45', url: topicVideos[subjectId] }] : (topicVideos[subjectId] || topicVideos.default || []));

        if (!videos.length) {
            return `
                <div class="p-20 text-center font-['Inter']">
                    <div class="w-24 h-24 rounded-[32px] bg-slate-50 flex items-center justify-center mx-auto mb-8 text-slate-200">
                        <i class="fa-solid fa-play-circle text-5xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-slate-900 mb-3">No videos</h3>
                </div>
            `;
        }

        if (activeIdx === null || activeIdx === undefined) {
            return `
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-10 mt-10 px-6 md:px-10">
                    ${videos.map((video, i) => `
                        <button type="button" class="video-selection-card group bg-white border border-gray-100 p-4 text-left sharp-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:border-black transition-all duration-300" onclick="openTopicContent('${subjectId}', ${topicIdx}, 'videos', ${i})">
                            <div class="bg-gray-900 overflow-hidden mb-4 flex items-center justify-center" style="aspect-ratio:16/9;">
                                <div class="text-center text-white/40">
                                    <i class="fa-solid fa-play-circle text-4xl mb-2 block"></i>
                                </div>
                            </div>
                            <p class="text-base font-bold text-gray-800 leading-tight group-hover:text-yellow-500 transition-colors font-['Inter']">${video.title}</p>
                            <p class="text-sm text-black mt-2 leading-relaxed font-['Inter']">${getTopicOverview(video.title)}</p>
                            <div class="mt-3 flex items-center justify-between">
                            </div>
                        </button>
                    `).join('')}
                </div>
            `;
        }

        const activeVideo = videos[activeIdx] || videos[0];
        const otherVideos = videos.filter((_, idx) => idx !== activeIdx);

        return `
            <div id="topic-video-player-container" class="max-w-[960px] mb-4 lg:mx-auto mt-10">
                <div class="bg-gray-900 rounded-none md:rounded-2xl overflow-hidden flex items-center justify-center w-full" style="aspect-ratio:16/9;">
                    ${activeVideo.url ? `
                        <iframe src="${activeVideo.url}" class="w-full h-full border-none" allowfullscreen></iframe>
                    ` : `
                        <div class="text-center text-white/40 px-6">
                            <i class="fa-solid fa-play-circle text-4xl md:text-6xl mb-3 block"></i>
                            <p class="text-[10px] md:text-sm font-bold">${activeVideo.title}</p>
                            <p class="text-[8px] md:text-[10px] mt-4 text-white/20">Video player &bull; connect to backend to stream</p>
                        </div>
                    `}
                </div>
            </div>

            <div class="mb-10 px-6 md:px-10 font-['Inter']">
                <p class="text-base md:text-xl font-bold text-black mt-1 font-['Inter']">${activeVideo.title}</p>
                <p class="text-xs md:text-sm text-black mt-2 leading-relaxed font-['Inter']">${getTopicOverview(activeVideo.title)}</p>
            </div>

            ${otherVideos.length ? `
            <div class="space-y-4 pb-10 px-6 md:px-10 font-['Inter']">
                <div class="flex items-center justify-between">
                    <p class="text-xs font-black text-black uppercase tracking-widest">More Videos</p>
                    <span class="text-[10px] text-black/40 font-bold">${otherVideos.length} videos</span>
                </div>
                <div class="space-y-4">
                    ${otherVideos.map((video) => {
            const originalIdx = videos.indexOf(video);
            return `
                            <button type="button" class="w-full bg-white border border-gray-100 rounded-2xl overflow-hidden flex text-left standard-panel-shadow hover:shadow-md hover:border-black transition-all duration-300 group" onclick="openTopicContent('${subjectId}', ${topicIdx}, 'videos', ${originalIdx})">
                                <div class="w-44 flex-shrink-0 bg-gray-900 flex items-center justify-center" style="aspect-ratio:16/9;">
                                    <i class="fa-solid fa-play text-white/60 text-xl"></i>
                                </div>
                                <div class="flex-1 p-5 min-w-0 font-['Inter']">
                                    <p class="text-base font-black text-black leading-tight group-hover:text-yellow-500 transition-colors">${video.title}</p>
                                    <p class="text-sm text-black/60 mt-2 line-clamp-2">${getTopicOverview(video.title)}</p>
                                    <div class="mt-4 flex items-center justify-between">
                                    </div>
                                </div>
                            </button>
                        `;
        }).join('')}
                </div>
            </div>` : ''}
        `;
    }

    function _buildHandoutsTab(subject, topic, subjectId, topicIdx) {
        const handouts = topic.handouts || topicHandouts[subjectId] || [];

        if (!handouts.length) {
            return `
                <div class="p-20 text-center font-['Inter']">
                    <div class="w-24 h-24 rounded-[32px] bg-slate-50 flex items-center justify-center mx-auto mb-8 text-slate-200">
                        <i class="fa-solid fa-file-pdf text-5xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-slate-900 mb-3">No lessons</h3>
                </div>
            `;
        }

        return `
            <div class="space-y-4 mt-10 px-6 md:px-10">
                ${handouts.map((h, i) => {
            const isPpt = h.type.toLowerCase() === 'ppt' || h.type.toLowerCase() === 'pptx';
            const icon = isPpt ? 'fa-file-powerpoint text-orange-500' : (h.type === 'DOC' || h.type === 'DOCX' ? 'fa-file-word text-blue-500' : 'fa-file-pdf text-red-500');
            const bg = isPpt ? 'bg-orange-50' : (h.type === 'DOC' || h.type === 'DOCX' ? 'bg-blue-50' : 'bg-red-50');


            return `
                        <div onclick="openHandoutOuterLayer('${h.url || h.file || '#'}', '${h.title || h.name}')" class="group flex items-center gap-6 p-6 bg-white border border-gray-100 rounded-none md:rounded-[20px] sharp-shadow hover:border-black transition-all cursor-pointer">
                            <div class="w-16 h-16 ${bg} rounded-none md:rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105">
                                <i class="fa-solid ${icon} text-2xl"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h4 class="text-[16px] font-bold text-black leading-tight mb-1 group-hover:text-yellow-500 transition-colors font-['Inter']">${(h.title || h.name || '').replace(/\.(pdf|docx|pptx|ppt)$/i, '')}</h4>
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    }

    function getAssessmentReleaseType(tab) {
        return {
            assignments: 'Assignment',
            quiz: 'Quiz',
            activity: 'Activity',
            performance: 'Performance Task'
        }[tab] || '';
    }

    function isAssessmentReleasedForSelectedSection(tab, topic) {
        const section = currentTopicState.selectedSection || '';
        const releaseType = getAssessmentReleaseType(tab);
        if (!section || !releaseType) return false;
        return releasedTopics.some(item =>
            item.section === section &&
            item.quarter === currentReleaseQuarter &&
            (item.topicId === topic.id || item.topicTitle === topic.title) &&
            item.type === releaseType
        );
    }

    function _buildAssessmentTab(tab, subject, topic, data, subjectId, topicIdx) {
        const labels = { assignments: 'Assignment', quiz: 'Quiz', activity: 'Activity', performance: 'Performance Task' };
        const label = labels[tab] || 'Assessment';
        const icons = { assignments: 'fa-file-pen', quiz: 'fa-square-poll-vertical', activity: 'fa-flask', performance: 'fa-star' };
        const colors = { assignments: 'bg-blue-50 text-blue-500', quiz: 'bg-purple-50 text-purple-500', activity: 'bg-amber-50 text-amber-500', performance: 'bg-icc-light text-icc' };

        // Wireframe Mock Data
        const descriptions = {
            assignments: 'Complete the provided exercises based on the latest lecture. Submit your work in PDF format.',
            quiz: 'Assessment quiz covering the core concepts of this module. Please ensure you have a stable internet connection.',
            activity: 'Hands-on activity to apply what you\'ve learned. Follow the step-by-step instructions in the attached guide.',
            performance: 'Final performance task for this module. Refer to the rubric for grading details.'
        };

        const category = tab === 'performance' ? 'perf. task' : tab === 'assignments' ? 'assignment' : tab;
        const details = getCategoryDetails(category);

        // Map topicIdx to gradebook indices (assume 2 assessments per topic)
        const assessments = [];
        const startIdx = topicIdx * 2;
        if (details[startIdx]) assessments.push({ ...details[startIdx], id: 1 });
        if (details[startIdx + 1]) assessments.push({ ...details[startIdx + 1], id: 2 });

        // Fallback if no specific assessments found for this topic range
        if (assessments.length === 0) {
            const topicTitle = topic?.title || 'Topic';
            assessments.push({ id: 1, title: `${label} #1: Introduction to ${topicTitle}`, description: descriptions[tab] || 'Assessment instructions and materials.', type: 'PDF', size: '1.2 MB', max: 100, date: 'Mar 10, 2026' });
            assessments.push({ id: 2, title: `${label} #2: Advanced concepts in ${topicTitle}`, description: 'Continuing our exploration with practical exercises and case studies.', type: 'DOCX', size: '850 KB', max: 100, date: 'Mar 17, 2026' });
        } else {
            // Add metadata for rendering
            assessments[0].description = descriptions[tab] || 'Assessment instructions and materials.';
            assessments[0].type = 'PDF';
            assessments[0].size = '1.2 MB';
            if (assessments[1]) {
                assessments[1].description = 'Continuing our exploration with practical exercises and case studies.';
                assessments[1].type = 'DOCX';
                assessments[1].size = '850 KB';
            }
        }

        // Force selection logic: ensure we always have a section and a student context
        let selectedSection = currentTopicState.selectedSection || '';
        const sections = getCurrentTopicSectionCards(data);
        if (!selectedSection && sections.length > 0) {
            selectedSection = sections[0].sectionName;
            currentTopicState.selectedSection = selectedSection;
        }

        let selectedStudent = currentTopicState.selectedStudent || '';
        if (selectedSection && !selectedStudent) {
            const students = (typeof studentsBySection !== 'undefined' ? studentsBySection[selectedSection] : []) || [];
            if (students.length > 0) {
                selectedStudent = students[0].name;
                currentTopicState.selectedStudent = selectedStudent;
            }
        }

        const sectionSelected = Boolean(selectedSection);
        const studentSelected = Boolean(selectedStudent);

        const shouldShowAssessmentFiles = sectionSelected;
        const emptyLabels = {
            assignments: 'No assignments',
            quiz: 'No quiz',
            activity: 'No activities',
            performance: 'No Performance Tasks'
        };

        let mainHtml = '';
        let rightHtml = null;

        const buildAssessmentRightRail = (content = '') => `
            <div class="space-y-6 font-['Inter']">
                ${_buildTopicSectionSelectorCard(data)}
                ${content}
            </div>
        `;

        const buildAssessmentOverviewRail = () => `
            <div class="teacher-topic-progress-rail-direct font-['Inter']">
                ${_buildProgressRail(data)}
            </div>
        `;



        // Show detail view if we have a specific assessment index (from Gradebook navigation or task click)
        if (window._tcAssessmentDetailIdx !== null && window._tcAssessmentDetailIdx !== undefined) {
            const activeIdx = window._tcAssessmentDetailIdx;
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
                                <p class="text-[11px] font-bold text-black uppercase tracking-widest font-['Inter']">${ass.type} &bull; ${ass.size}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            let assMaxScore = sectionSelected ? ass.max : 100;
            let assStartDate = sectionSelected ? ass.date : '-';
            let assDueDate = sectionSelected ? ass.date : '-';

            let scoreValue = '0';
            let isGraded = false;

            if (studentSelected && sectionSelected) {
                const students = studentsBySection[currentTopicState.selectedSection] || [];
                const student = students.find(s => s.name === currentTopicState.selectedStudent);
                if (student) {
                    const gradebookIdx = startIdx + activeIdx;
                    const subjectId = currentTopicState.subjectId;
                    const quarter = gradebookState.currentQuarter;
                    const studentId = student.id;

                    // Pull persistent data
                    const savedScore = gradebookScores[subjectId]?.[quarter]?.[studentId]?.[category]?.[gradebookIdx];
                    const savedStatus = gradebookStatuses[subjectId]?.[quarter]?.[studentId]?.[category]?.[gradebookIdx];

                    if (savedScore !== undefined && savedScore !== null && savedScore !== '') {
                        scoreValue = savedScore;
                        isGraded = true;
                    }

                    if (savedStatus && savedStatus !== '') {
                        const statusLabel = savedStatus.charAt(0).toUpperCase() + savedStatus.slice(1);
                        isGraded = true;
                        window._tempStatusLabel = statusLabel; 
                    } else {
                        window._tempStatusLabel = isGraded ? 'Graded' : 'Not Graded';
                    }
                }
            }

            let assMaxAttempts = sectionSelected ? assData.maxAttempts : 0;
            let assLatePermission = sectionSelected ? assData.latePermission : false;
            let lateLabel = sectionSelected ? (assLatePermission ? 'Permitted' : 'Not Permitted') : 'Not Permitted';
            let lateColor = sectionSelected ? (assLatePermission ? 'text-icc' : 'text-red-500') : 'text-red-500';


            rightHtml = buildAssessmentRightRail(`
                    <!-- Tasks Panel (formerly Progress) -->
                    <div class="bg-white border border-gray-100 rounded-[16px] sharp-shadow flex flex-col overflow-hidden relative select-none">
                        <div class="px-4 py-2 flex items-center border-b border-gray-50 bg-white">
                            <h4 class="text-[10px] font-bold text-[#15803d] tracking-widest uppercase">Tasks</h4>
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
                        <p class="text-[10px] font-bold text-[#15803d] uppercase tracking-widest text-left mb-2">Score</p>
                        <div id="workstation-score-value" class="text-[36px] font-black text-icc leading-none mb-0">${scoreValue}</div>
                        <p class="text-[8px] font-bold text-black uppercase tracking-widest mb-3">Out of ${assMaxScore}</p>

                        <div class="pt-2 border-t border-gray-50 text-right">
                            <span id="workstation-graded-status" class="text-[8px] font-bold text-black uppercase tracking-widest">${window._tempStatusLabel || (isGraded ? 'Graded' : 'Not Graded')}</span>
                        </div>
                    </div>

                    <!-- Assessment Panel -->
                    <div class="bg-white border border-gray-100 rounded-[16px] sharp-shadow p-3 flex flex-col space-y-2">
                        <p class="text-[10px] font-bold text-[#15803d] uppercase tracking-widest mb-1">Assessment</p>
                            
                            <div class="flex items-center gap-2">
                                <div class="w-7 h-7 rounded-lg bg-icc-light flex items-center justify-center text-icc">
                                    <i class="fa-solid fa-star text-[10px]"></i>
                                </div>
                                <div class="text-left">
                                    <p class="text-[8px] font-bold text-black uppercase tracking-widest leading-none">Max Score</p>
                                    <p class="text-[12px] font-bold text-black">${assMaxScore} Points</p>
                                </div>
                            </div>

                            <div class="flex items-center gap-2">
                                <div class="w-7 h-7 rounded-lg bg-icc-light flex items-center justify-center text-icc">
                                    <i class="fa-solid fa-calendar text-[10px]"></i>
                                </div>
                                <div class="text-left">
                                    <p class="text-[8px] font-bold text-black uppercase tracking-widest leading-none">Start</p>
                                    <p class="text-[12px] font-bold text-black">${assStartDate}</p>
                                </div>
                            </div>

                            <div class="flex items-center gap-2">
                                <div class="w-7 h-7 rounded-lg bg-icc-light flex items-center justify-center text-icc">
                                    <i class="fa-solid fa-calendar-check text-[10px]"></i>
                                </div>
                                <div class="text-left">
                                    <p class="text-[8px] font-bold text-black uppercase tracking-widest leading-none">Due</p>
                                    <p class="text-[12px] font-bold text-black">${assDueDate}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Submission Panel -->
                    <div class="bg-white border border-gray-100 rounded-[16px] sharp-shadow p-3 flex flex-col">
                        <p class="text-[10px] font-bold text-[#15803d] uppercase tracking-widest mb-2">Submission</p>
                            <div class="space-y-1.5">
                                <div class="flex items-center justify-between">
                                    <span class="text-[12px] font-bold text-black">Max Attempts</span>
                                    <span class="text-[12px] font-bold text-black">${assMaxAttempts}</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-[12px] font-bold text-black">Attempts Used</span>
                                    <span class="text-[12px] font-bold text-black">0</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-[12px] font-bold text-black">Late Permission</span>
                                    <span class="text-[12px] font-bold ${lateColor}">${lateLabel}</span>
                                </div>
                        </div>
                    </div>
            `);
        } else {
            mainHtml = `
                <div class="space-y-4 mt-10 animate-in fade-in slide-in-from-bottom-4 duration-700 px-6 md:px-10">
                    ${shouldShowAssessmentFiles ? assessments.map((ass, i) => {
                return `
                        <div onclick="window.switchTopicTab('${tab}', ${i})" class="handout-card group flex items-center gap-6 p-6 bg-white border border-gray-100 rounded-none md:rounded-[22px] sharp-shadow hover:border-black transition-all cursor-pointer">
                            <div class="flex-1 min-w-0">
                                <h4 class="text-xl font-bold text-black leading-tight group-hover:text-yellow-500 transition-colors font-['Inter']">${ass.title}</h4>
                            </div>
                        </div>
                    `;
            }).join('') : `
                        <div class="teacher-topic-empty-panel">
                            <p>${selectedSection ? `No released ${label.toLowerCase()} file title panels for ${escapeHtml(selectedSection)}.` : emptyLabels[tab]}</p>
                        </div>
                    `}
                </div>
            `;
        }

        if (!rightHtml) {
            rightHtml = buildAssessmentOverviewRail();
        }

        return { mainHtml, rightHtml };
    }

    function renderTopicContentsSidebar(subjectId, topicIdx, activeTab) {
        const content = document.getElementById('sub-sidebar-content');
        const title = document.getElementById('sub-sidebar-title');
        const header = document.getElementById('sub-sidebar-header');
        if (!content) return;

        if (header) header.classList.remove('hidden');
        document.getElementById('sub-sidebar')?.classList.add('sub-sidebar-visible');

        const data = getTopicData(subjectId);
        const subject = getTopicSubject(subjectId);
        if (title) title.textContent = subject?.name || 'Topics';
        const topic = data.q1Topics[topicIdx];
        const tabs = getTopicTabs();

        content.innerHTML = `
            <div class="p-2 space-y-1">
                ${tabs.map(t => `
                    <button onclick="switchTopicTab('${t}')" class="w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 group ${t === activeTab ? 'bg-icc-light text-icc' : 'hover:bg-gray-50 text-gray-500'}">
                        <i class="${TAB_ICONS[t]} text-sm ${t === activeTab ? 'text-icc' : 'text-gray-300 group-hover:text-icc'}"></i>
                        <span class="text-[11px] font-bold uppercase tracking-widest ${t === activeTab ? 'text-icc' : 'text-gray-500'}">${TAB_LABELS[t]}</span>
                    </button>
                `).join('')}
            </div>
            <div class="mt-4 pt-4 border-t border-gray-50 px-2 pb-8">
                <p class="text-[10px] font-black text-black uppercase tracking-widest mb-4 px-2">Course Topics</p>
                <div class="space-y-1">
                    ${data.q1Topics.map((t, i) => {
            let iconHtml = '<div class="w-4 h-4 rounded-full border border-gray-200"></div>';
            if (t.status === 'completed') {
                iconHtml = '<i class="fa-solid fa-circle-check text-green-500 text-sm"></i>';
            } else if (t.status === 'in-progress') {
                iconHtml = '<i class="fa-solid fa-circle-half-stroke text-yellow-500 text-sm"></i>';
            }

            const isActive = i === topicIdx;

            return `
                            <button onclick="openTopicContent('${subjectId}', ${i})" class="topic-nav-item w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 group ${isActive ? 'active' : 'hover:bg-gray-50'}">
                                <div class="mt-1 flex-shrink-0">${iconHtml}</div>
                                <div class="min-w-0">
                                    <p class="text-[10px] font-black text-black uppercase tracking-widest mb-0.5">Topic ${i + 1}</p>
                                    <p class="topic-nav-title text-[13px] font-bold leading-tight">${t.title}</p>
                                </div>
                            </button>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    }

    class HandoutSlider {
        constructor(containerId, slides) {
            this.containerId = containerId;
            this.slides = slides;
            this.currentIndex = 0;
            this.render();
        }
        render() {
            const container = document.getElementById(this.containerId);
            if (!container) return;
            const slide = this.slides[this.currentIndex];
            container.innerHTML = `
                <div class="relative bg-gray-50 rounded-2xl overflow-hidden aspect-video flex flex-col border border-gray-100">
                    <div class="flex-1 flex items-center justify-center p-8 text-center">
                        <div class="space-y-4">
                            <i class="fa-solid fa-file-powerpoint text-5xl text-orange-400"></i>
                            <p class="text-base font-black text-gray-800">${slide.title || `Slide ${this.currentIndex + 1}`}</p>
                            <p class="text-xs text-gray-500 leading-relaxed max-w-md mx-auto">${slide.content || 'Instructional material for this lesson segment.'}</p>
                        </div>
                    </div>
                    <div class="p-4 bg-white/50 border-t border-gray-100 flex items-center justify-between">
                        <div class="flex items-center gap-1.5">
                            <button onclick="window.handleHandoutSlider('${this.containerId}', -1)" class="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-all shadow-sm">
                                <i class="fa-solid fa-chevron-left text-[10px]"></i>
                            </button>
                            <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">${this.currentIndex + 1} / ${this.slides.length}</span>
                            <button onclick="window.handleHandoutSlider('${this.containerId}', 1)" class="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-all shadow-sm">
                                <i class="fa-solid fa-chevron-right text-[10px]"></i>
                            </button>
                        </div>
                        <span class="text-[9px] font-black text-gray-300 uppercase tracking-widest">Interactive Slides</span>
                    </div>
                </div>
            `;
            // Store instance globally for the simple callback
            if (!window.handoutSliders) window.handoutSliders = {};
            window.handoutSliders[this.containerId] = this;
        }
        move(delta) {
            this.currentIndex = (this.currentIndex + delta + this.slides.length) % this.slides.length;
            this.render();
        }
    }

    window.handleHandoutSlider = function (id, delta) {
        if (window.handoutSliders && window.handoutSliders[id]) {
            window.handoutSliders[id].move(delta);
        }
    };





    const sectionFeatureInit = {
        dashboard: false,
        attendance: false,
        assessments: false,
        gradebook: false,
        analytics: false,
        materials: false
    };

    function initializeSectionFeatures(navId) {
        if (navId === 'nav-subjects') {
            resetSubjectsInlineExplorer(true);
            return;
        }

        if (navId === 'nav-materials' && !sectionFeatureInit.materials) {
            sectionFeatureInit.materials = true;
            return;
        }

        if (navId === 'nav-dashboard') {
            if (!sectionFeatureInit.dashboard) {
                sectionFeatureInit.dashboard = true;
                setTimeout(() => setupInsightsCarousel(), 100);
            }
            return;
        }

        if (navId === 'nav-attendance') {
            if (!sectionFeatureInit.attendance) {
                sectionFeatureInit.attendance = true;
                setTimeout(() => setupAttendanceCalendar(), 100);
            }
            return;
        }

        if (navId === 'nav-assessments') {
            // Always ensure the Assessments UI is rendered when the tab is opened.
            // (Some navigation paths can show the section before initial render, resulting in a blank pane.)
            sectionFeatureInit.assessments = true;
            renderAssessmentsPage();
            return;
        }

        if (navId === 'nav-grades') {
            if (!sectionFeatureInit.gradebook) {
                sectionFeatureInit.gradebook = true;
                setTimeout(() => initGradebook(), 100);
            } else {
                // Reset the Gradebook page to its initial state on every return visit
                resetGradebookPage();
            }
            return;
        }

        if (navId === 'nav-analytics' && !sectionFeatureInit.analytics) {
            sectionFeatureInit.analytics = true;
            setTimeout(() => setupAnalyticsTab(), 100);
        }
    }

    function hideAllSections() {
        document.querySelectorAll('.dynamic-section').forEach(sec => sec.classList.add('hidden'));
    }

    function showSection(id) {
        const sec = document.getElementById(id);
        if (sec) sec.classList.remove('hidden');

        // AUTO-HIDE Gradebook Panel if we leave the workstation
        if (id !== 'section-topic-content' && typeof window.closeGradebookOuterLayer === 'function') {
            window.closeGradebookOuterLayer();
        }

        if (id === 'section-topic-detail') {
            document.body.classList.add('curriculum-mode');
        } else if (id !== 'section-topic-content') {
            document.body.classList.remove('curriculum-mode');
        }
    }

    function setSubjectsPanelsMode(enabled) {
        document.body.classList.toggle('subjects-panels-mode', enabled && window.innerWidth >= 1024);
    }

    // Keep the 3-panel sliding layout in sync with viewport size (matches student behavior)
    window.addEventListener('resize', () => {
        const subjectsVisible = !document.getElementById('section-subjects')?.classList.contains('hidden') && !currentCurriculumProgram;
        setSubjectsPanelsMode(subjectsVisible);
    });

    // --- Navigation Logic ---
    function scrollToTop() {
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
        const mainContent = document.getElementById('main-content');
        if (mainContent) mainContent.scrollTop = 0;
        const layoutWrapper = document.getElementById('layout-wrapper');
        if (layoutWrapper) layoutWrapper.scrollTop = 0;
    }

    // Helper to clear all sub-navigation highlights across sidebar and sub-sidebar
    window.clearSubNavigationHighlights = function() {
        document.querySelectorAll('#sub-sidebar .active, #sub-sidebar .bg-icc-light, #sub-sidebar .text-icc, .sidebar-submenu .active, .section-nav-child.active, .sub-sidebar-link.active').forEach(el => {
            el.classList.remove('active', 'bg-icc-light', 'text-icc');
        });
        // Specifically clear Grades submenu links
        document.querySelectorAll('#grades-submenu .nav-sublink').forEach(link => {
            link.classList.remove('active');
        });
    };

    function switchTab(navId, pushHistory = true) {
        scrollToTop();
        const requestedNavId = navId;
        if (!sectionMap[navId] || !document.getElementById(sectionMap[navId])) {
            navId = navId && navId.startsWith('nav-subjects-') ? 'nav-subjects' : 'nav-dashboard';
            if (!sectionMap[navId] || !document.getElementById(sectionMap[navId])) navId = 'nav-dashboard';
            console.warn(`Unknown teacher tab "${requestedNavId}". Falling back to "${navId}".`);
        }
        window.scrollTo(0, 0);

        // Stop all videos and iframes globally when switching main tabs
        document.querySelectorAll('iframe, video').forEach(media => {
            try {
                if (media.tagName.toLowerCase() === 'iframe') {
                    const src = media.src;
                    media.src = '';
                    media.src = src;
                } else if (media.pause) {
                    media.pause();
                    media.currentTime = 0;
                }
            } catch (e) { }
        });
        // Auto-close mobile sidebar - DISABLED per user request
        /*
        if (window.innerWidth < 1024) {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (sidebar) sidebar.classList.remove('sidebar-visible');
            if (overlay) overlay.classList.add('hidden');
        }
        */

        const targetSectionId = sectionMap[navId];
        // Continue even if no direct section exists (allows highlighting parent tabs without landing pages)

        if (pushHistory) {
            const pageKey = Object.entries(navIdByPage).find(([k, v]) => v === navId)?.[0] || 'dashboard';
            history.pushState({ type: 'tab', navId }, '', '#' + pageKey);
            localStorage.setItem('sigma-teacher-nav-state', JSON.stringify({ type: 'tab', navId, pageKey }));
        }

        // Reset classroom detail view when switching main tabs
        resetClassroomDetailLayout();

        // Close side panels when switching main sections (skip if we have an active classroom and are staying on nav-classes)
        if (!(currentClassroomKey && navId === 'nav-classes')) {
            closeAiPanel();
            document.querySelectorAll('[id$="Menu"], [id$="Panel"], [id$="dropdown"]').forEach(m => {
                if (m.id !== 'user-profile-tab-panel' && m.id !== 'layout-wrapper') m.classList.add('hidden');
            });
            document.querySelectorAll('.relative button').forEach(b => b.classList.remove('active'));

            // Clear sub-sidebar highlights and submenu states
            window.clearSubNavigationHighlights();

            if (typeof window.resetTeacherGradesSidebarState === 'function') {
                    window.resetTeacherGradesSidebarState();
                }
            }

            if (typeof window.resetTeacherSubjectSidebarState === 'function') {
                window.resetTeacherSubjectSidebarState();
            }

        // Reset Gradebook highlights when switching tabs
        if (typeof window.clearGradebookHighlights === 'function') {
            window.clearGradebookHighlights(false, true); // inner
            window.clearGradebookHighlights(true, true);  // outer
        }


        // Update active nav link
        navLinks.forEach(l => l.classList.remove('active'));

        const activeLink = document.getElementById(navId);
        if (activeLink) activeLink.classList.add('active');

        // Handle Sections
        hideAllSections();
        if (targetSectionId) showSection(targetSectionId);

        // Auto-refresh sections on switch
        if (navId === 'nav-dashboard') {
            if (typeof renderTeacherAnnouncements === 'function') renderTeacherAnnouncements();
            if (typeof renderTeacherHomeDashboardPanels === 'function') renderTeacherHomeDashboardPanels();
        }

        if (navId === 'nav-classes') {
            if (typeof renderClassroomsGrid === 'function') renderClassroomsGrid();
        }

        // Hard-link assessments tab to its renderer immediately so it never opens blank.
        if (navId === 'nav-assessments') {
            sectionFeatureInit.assessments = true;
            if (typeof renderAssessmentsPage === 'function') renderAssessmentsPage();
        }

        // Hard-link grades tab so it never opens blank.
        if (navId === 'nav-grades') {
            if (!sectionFeatureInit.gradebook) {
                sectionFeatureInit.gradebook = true;
                if (typeof initGradebook === 'function') initGradebook();
            }
            if (typeof window.resetGradebookState === 'function') {
                window.resetGradebookState();
            }
            if (typeof switchGradesSubTab === 'function') switchGradesSubTab('analytics');
        }

        // --- Navigation context ---

        // Update Nav Context Title
        const navContextText = document.getElementById('nav-context-text');
        if (navContextText) {
            const navContextMap = {
                'nav-dashboard': 'Interface Computer College',
                'nav-classes': 'Sections',
                'nav-subjects': 'Subjects',
                'nav-assessments': 'Assessments',
                'nav-grades': 'Grades'
            };
            navContextText.textContent = navContextMap[navId] || 'Interface Computer College';
        }

        // Update Sub-Sidebar
        if (!(currentClassroomKey && navId === 'nav-classes')) {
            updateSubSidebar(navId);
        }

        // --- Subjects scroll behavior ---
        if (navId === 'nav-subjects') {
            setSubjectsPageScrollLocked(!currentInlineProgram);
        } else {
            setSubjectsPageScrollLocked(false);
        }

        // --- Full-width layout pages (match admin dashboard placement) ---
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            if (navId === 'nav-profile' || navId === 'nav-dashboard' || navId === 'nav-classroom-detail') {
                mainContent.classList.remove('pt-3', 'px-4', 'pb-4');
                mainContent.classList.add('p-0');
            } else {
                mainContent.classList.remove('p-0');
                mainContent.classList.add('pt-3', 'px-4', 'pb-4');
            }
        }

        // --- Populate profile page when navigating to it ---
        if (navId === 'nav-profile') {
            if (typeof window.populateUserProfilePage === 'function') {
                window.populateUserProfilePage();
            }
        }

        initializeSectionFeatures(navId);

        if (navId === 'nav-classes') {
            renderClassroomsGrid();
            requestAnimationFrame(() => initCardSortable(true));
        }

        if (navId === 'nav-dashboard') {
            if (typeof renderTeacherHomeDashboardPanels === 'function') {
                renderTeacherHomeDashboardPanels();
            }
        }

        updateLayout();

        // Sync Sections chevron visibility
        if (typeof syncSectionsNavState === 'function') {
            syncSectionsNavState();
        }
    }

    // Expose switchTab globally for inline event handlers (logo button etc.)
    window.switchTab = switchTab;

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(link.id);
        });
    });

    document.querySelectorAll('a[href="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
        });
    });

    const setupNavigationHistory = () => {
        const hash = window.location.hash || '';

        // 1. High-Priority Hash Check (Deep Links)
        // If we have a hash that looks like a deep link, use it immediately regardless of state
        if (hash.startsWith('#classroom:')) {
            const parts = hash.split(':');
            if (parts.length >= 4) {
                const className = decodeURIComponent(parts[1]);
                const subject = decodeURIComponent(parts[2]);
                const initialTab = parts[3] || 'room';
                if (!history.state || history.state.type !== 'classroom') {
                    history.replaceState({ type: 'classroom', className, subject, initialTab }, '', hash);
                }
                showStudentList(className, subject, initialTab, false);
                return;
            }
        } else if (hash.startsWith('#topic:')) {
            const subjectId = hash.replace('#topic:', '');
            if (!history.state || history.state.type !== 'topic') {
                history.replaceState({ type: 'topic', subjectId }, '', hash);
            }
            switchToTopicPage(subjectId, false, history.state?.topicIdx);
            return;
        } else if (hash.startsWith('#topic-content:')) {
            const parts = hash.split(':');
            if (parts.length >= 5) {
                const subjectId = parts[1];
                const topicIdx = parseInt(parts[2]);
                const tab = parts[3];
                const vIdxStr = parts[4];
                const videoIdx = (vIdxStr === 'null' || vIdxStr === 'undefined' || !vIdxStr) ? null : parseInt(vIdxStr);

                if (!history.state || history.state.type !== 'topic-content') {
                    history.replaceState({ type: 'topic-content', subjectId, topicIdx, tab, videoIdx }, '', hash);
                }
                window.openTopicContent(subjectId, topicIdx, tab, videoIdx, false);
                return;
            }
        }

        // Standard tab hashes should beat stale history.state/localStorage.
        // Browser refresh and DevTools can preserve an old state object while
        // the visible URL is already pointing at another tab.
        if (!hash) {
            history.replaceState({ type: 'tab', navId: 'nav-dashboard' }, '', `${window.location.pathname}${window.location.search}`);
            localStorage.setItem('sigma-teacher-nav-state', JSON.stringify({
                type: 'tab',
                navId: 'nav-dashboard',
                pageKey: 'dashboard'
            }));
            switchTab('nav-dashboard', false);
            return;
        }

        const hashPageKey = hash.replace('#', '');
        if (hashPageKey && navIdByPage[hashPageKey]) {
            switchTab(navIdByPage[hashPageKey], false);
            return;
        }

        // 2. State-Based Restoration (Standard Tabs)
        let state = history.state;
        const savedState = JSON.parse(localStorage.getItem('sigma-teacher-nav-state') || 'null');

        // Initialize root if absolutely empty
        if (!state) {
            history.replaceState({ type: 'root' }, '', '');
            state = { type: 'root' };
        }

        // Fallback to persistent storage if state is generic
        if (state.type === 'root' || !state.type) {
            state = savedState || state;
        }

        if (state && state.type && state.type !== 'root') {
            const { type, navId, className, subject, initialTab, subjectId, topicIdx, tab, videoIdx } = state;
            if (type === 'tab' && navId) {
                switchTab(navId, false);
            } else if (type === 'classroom') {
                showStudentList(className, subject, initialTab, false);
            } else if (type === 'topic') {
                switchToTopicPage(subjectId, false, topicIdx);
            } else if (type === 'topic-content') {
                window.openTopicContent(subjectId, topicIdx, tab, videoIdx, false);
            } else {
                switchTab('nav-dashboard', false);
            }
        } else {
            // 3. Final Fallback (Hash-to-Tab or Dashboard)
            const pageKey = hash.replace('#', '') || 'dashboard';
            const navId = navIdByPage[pageKey] || 'nav-dashboard';
            switchTab(navId, false);
        }
    };

    window.addEventListener('popstate', (event) => {
        if (!event.state || event.state.type === 'root') {
            const hash = window.location.hash || '';
            if (hash.startsWith('#classroom:')) {
                const parts = hash.split(':');
                if (parts.length >= 4) {
                    const className = decodeURIComponent(parts[1]);
                    const subject = decodeURIComponent(parts[2]);
                    const initialTab = parts[3] || 'room';
                    showStudentList(className, subject, initialTab, false);
                    return;
                }
            } else if (hash.startsWith('#topic:')) {
                const subjectId = hash.replace('#topic:', '');
                switchToTopicPage(subjectId, false, history.state?.topicIdx);
                return;
            } else if (hash.startsWith('#topic-content:')) {
                const parts = hash.split(':');
                if (parts.length >= 5) {
                    window.openTopicContent(parts[1], parseInt(parts[2]), parts[3], parseInt(parts[4]), false);
                    return;
                }
            }
            const pageKey = hash.replace('#', '') || 'dashboard';
            const navId = navIdByPage[pageKey] || 'nav-dashboard';
            switchTab(navId, false);
            return;
        }

        const state = event.state;
        if (state.type === 'tab') {
            // Determine if we should close the classroom view
            const grid = document.getElementById('classrooms-grid');
            const detailView = document.getElementById('classroom-detail-view');
            if (detailView && !detailView.classList.contains('hidden')) {
                grid.classList.remove('hidden');
                grid.style.setProperty('display', 'grid', 'important');
                detailView.classList.add('hidden');
                detailView.style.setProperty('display', 'none', 'important');
                setClassroomDetailHeader({ showDetail: false });
                hideClassroomSectionsSidebar();

                const rightPanel = document.getElementById('classes-right-panel');
                const mainCol = document.getElementById('classes-main-col');
                const mainContent = document.getElementById('main-content');

                if (rightPanel) {
                    rightPanel.classList.remove('hidden');
                    rightPanel.style.setProperty('display', 'block', 'important');
                }
                if (mainCol) {
                    mainCol.classList.add('lg:col-span-2');
                    mainCol.classList.remove('lg:col-span-3');
                }
                if (mainContent) {
                    mainContent.style.removeProperty('padding-top');
                    mainContent.style.removeProperty('padding-bottom');
                    mainContent.classList.add('pt-3');
                    mainContent.classList.remove('pt-0');
                    mainContent.classList.add('pb-4');
                    mainContent.classList.remove('pb-0');
                }
            }
            switchTab(state.navId, false);
        } else if (state.type === 'classroom') {
            showStudentList(state.className, state.subject, state.initialTab, false);
        } else if (state.type === 'topic') {
            switchToTopicPage(state.subjectId, false, state.topicIdx);
        } else if (state.type === 'topic-content') {
            window.openTopicContent(state.subjectId, state.topicIdx, state.tab, state.videoIdx, false);
        }
    });

    function setClassroomDetailHeader({ title = 'Sections', subject = '', showDetail = false, className = '', room = '' }) {
        const navContextText = document.getElementById('nav-context-text');
        const navContextSection = document.getElementById('nav-context-section');
        const navContextSectionDivider = document.getElementById('nav-context-section-divider');
        const detailTabs = document.getElementById('classes-detail-tabs');
        const classesHeader = document.getElementById('classes-header');

        // New Enhanced Header Elements
        const detailHeaderSubject = document.getElementById('detail-header-subject');

        const mainTitle = document.getElementById('classes-section-title');
        const classesPageHeader = document.getElementById('classes-page-header');

        if (navContextText) {
            navContextText.textContent = 'Sections';
            navContextText.classList.toggle('cursor-pointer', showDetail);
            navContextText.classList.toggle('pointer-events-auto', showDetail);
            navContextText.classList.toggle('pointer-events-none', !showDetail);
            navContextText.onclick = showDetail ? () => backToClassrooms() : null;
        }
        if (mainTitle) mainTitle.textContent = showDetail ? '' : 'Classrooms';
        if (classesHeader) classesHeader.classList.toggle('hidden', showDetail);
        if (classesPageHeader) classesPageHeader.classList.toggle('hidden', showDetail);

        if (showDetail) {
            if (navContextSection) {
                navContextSection.textContent = room || '';
                navContextSection.classList.toggle('hidden', !(room || '').trim());
            }
            if (navContextSectionDivider) navContextSectionDivider.classList.toggle('hidden', !(room || '').trim());
            if (detailHeaderSubject) detailHeaderSubject.textContent = subject;
        } else {
            if (navContextSection) navContextSection.classList.add('hidden');
            if (navContextSectionDivider) navContextSectionDivider.classList.add('hidden');
        }

        if (detailTabs) detailTabs.classList.toggle('hidden', !showDetail);
    }

    function resetClassroomDetailLayout() {
        const grid = document.getElementById('classrooms-grid');
        const detailView = document.getElementById('classroom-detail-view');
        const rightPanel = document.getElementById('classes-right-panel');
        const mainCol = document.getElementById('classes-main-col');
        const mainContent = document.getElementById('main-content');

        closeAnnouncementPad();

        if (detailView) {
            detailView.classList.add('hidden');
            detailView.style.setProperty('display', 'none', 'important');
        }

        if (grid) {
            grid.classList.remove('hidden');
            grid.style.setProperty('display', 'grid', 'important');
        }

        if (rightPanel) {
            rightPanel.classList.remove('hidden');
            rightPanel.style.setProperty('display', 'block', 'important');
        }

        if (mainCol) {
            mainCol.classList.remove('lg:col-span-3');
            mainCol.classList.add('lg:col-span-2');
        }

        if (mainContent) {
            mainContent.style.removeProperty('padding-top');
            mainContent.style.removeProperty('padding-bottom');
            mainContent.style.removeProperty('padding-left');
            mainContent.style.removeProperty('padding-right');
            mainContent.classList.add('pt-3', 'px-4', 'pb-4');
            mainContent.classList.remove('pt-0', 'pb-0', 'p-0');
        }

        const gridWrapper = document.getElementById('classrooms-grid-wrapper');
        if (gridWrapper) gridWrapper.classList.remove('hidden');

        currentClassroomMeta = null;
        currentClassroomKey = '';
        currentClassroomSectionName = '';
        setClassroomDetailHeader({ title: 'Sections', showDetail: false });
        hideClassroomSectionsSidebar();
        requestAnimationFrame(() => initCardSortable(true));
    }

    function renderRoomPeoplePanel(className, subject) {
        const teacherList = document.getElementById('room-teacher-list');
        const studentList = document.getElementById('room-student-list');
        const meta = classroomMetaBySubject[`${className}::${subject}`] || {};
        const students = studentsBySection[className] || [];

        if (teacherList) {
            teacherList.innerHTML = meta.teacher
                ? `<button type="button" class="classroom-room-person">${meta.teacher}</button>`
                : `<button type="button" class="classroom-room-person">Teacher Name</button>`;
        }

        if (studentList) {
            studentList.innerHTML = [...students]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(student => {
                    const parts = student.name.split(', ');
                    const displayName = parts[0] + (parts[1] ? ', ' + parts[1].split(' ')[0] : '');
                    return `<button type="button" class="classroom-room-person">${displayName}</button>`;
                })
                .join('');
        }
    }

    function renderRoomAnnouncementsFeed() {
        const feed = document.getElementById('room-announcements-feed');
        if (!feed) return;

        const posts = ensureAnnouncementIdsForClassroom(currentClassroomKey);
        const commentsEnabled = getCurrentCommentMode() === 'enabled';
        if (!posts.length) {
            feed.classList.add('hidden');
            feed.innerHTML = '';
            return;
        }

        // Parse classroom info for card metadata
        const [gradeSection, subjectName] = (currentClassroomKey || '').split('::');

        feed.classList.remove('hidden');
        feed.innerHTML = posts.map(post => {
            const comments = commentsEnabled ? getAnnouncementComments(post.id) : [];
            const dateLabel = post.timestamp || '';

            return `
            <article id="room-post-${post.id}" class="bg-white border border-slate-200 rounded-[22px] relative w-full overflow-hidden transition-all duration-500 group mb-4 standard-panel-shadow">
                <div class="p-8 flex flex-col min-w-0">
                    <!-- Header: avatar + name + date -->
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 flex-shrink-0">
                                ${post.authorImg ? `<img src="${post.authorImg}" class="w-full h-full object-cover rounded-full">` : `<i class="fa-solid fa-user text-xs text-black"></i>`}
                            </div>
                            <div class="flex flex-col">
                                <span class="text-[13px] font-black text-slate-900 leading-none mb-0.5">${post.author}</span>
                                <span class="text-[10px] font-bold text-slate-400">Teacher</span>
                            </div>
                        </div>
                        <span class="text-[10px] font-medium text-slate-400 tracking-tight mt-0.5">${formatAnnouncementDate(post.timestamp)}</span>
                    </div>

                    <!-- Subject title + grade/section -->
                    <div class="mb-3 pl-[3.25rem]">
                        <h3 class="text-[17px] font-black text-slate-900 leading-tight">${subjectName || 'Classroom Post'}</h3>
                        ${gradeSection ? `<p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">${gradeSection}</p>` : ''}
                    </div>

                    <!-- Post body -->
                    <div class="pl-[3.25rem] text-[15px] text-slate-700 leading-relaxed classroom-announcement-content">
                        ${post.html || ''}
                    </div>

                    ${commentsEnabled && comments.length ? `
                        <div class="mt-6 pt-4 border-t border-slate-50 space-y-3 pl-[3.25rem]">
                            <p class="text-[11px] font-black text-slate-400 uppercase tracking-widest">Student Feedback (${comments.length})</p>
                            ${comments.map(comment => `
                                <div class="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                    <div class="flex items-center justify-between mb-1">
                                        <p class="text-[13px] font-black text-slate-900">${comment.author}</p>
                                        <p class="text-[11px] font-medium text-slate-400">${comment.timestamp}</p>
                                    </div>
                                    <p class="text-[14px] text-slate-600 leading-normal">${comment.text}</p>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>

                <!-- Footer: 3-dot delete menu -->
                <div class="px-6 pb-4 pt-2 border-t border-slate-100 bg-white flex items-center justify-end relative">
                    <button onclick="window.togglePostMenu('room-${post.id}')" class="w-9 h-9 rounded-full flex items-center justify-center text-black hover:bg-slate-100 transition-all">
                        <i class="fa-solid fa-ellipsis text-lg"></i>
                    </button>
                    <div id="menu-room-${post.id}" class="hidden absolute bottom-full right-6 mb-2 w-40 bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 py-2 z-50 overflow-hidden">
                        <button onclick="window.deleteRoomAnnouncement('${post.id}')" class="w-full px-4 py-2 text-left text-[13px] font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2">
                            <i class="fa-solid fa-trash-can text-xs opacity-40"></i> Delete post
                        </button>
                    </div>
                </div>
            </article>
        `;
        }).reverse().join('');
    }

    window.deleteRoomAnnouncement = function (postId) {
        if (!confirm('Are you sure you want to delete this announcement?')) return;

        // 1. Remove from classroom (room) storage
        refreshSharedAnnouncements();
        const posts = announcementPostsByClassroom[currentClassroomKey] || [];
        announcementPostsByClassroom[currentClassroomKey] = posts.filter(p => p.id !== postId);
        saveSharedState(SHARED_ANNOUNCEMENTS_KEY, announcementPostsByClassroom);

        // 2. Also remove from dashboard feed storage (bidirectional sync)
        const dashPosts = JSON.parse(localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY) || '[]');
        localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, JSON.stringify(dashPosts.filter(p => p.id !== postId)));
        if (typeof renderTeacherAnnouncements === 'function') renderTeacherAnnouncements();

        renderRoomAnnouncementsFeed();
    };

    function applyAttendanceRowStatus(row, status) {
        if (!row) return;
        row.dataset.status = status || '';
        row.querySelectorAll('.attendance-mark-btn').forEach(button => {
            button.classList.remove('bg-icc', 'text-white', 'border-icc', 'bg-red-500', 'border-red-500', 'bg-yellow-500', 'border-yellow-500');
            button.classList.add('bg-white', 'text-gray-400', 'border-gray-100');
        });

        const activeButton = row.querySelector(`.attendance-mark-btn[data-value="${status}"]`);
        if (!activeButton) return;

        activeButton.classList.remove('bg-white', 'text-gray-400', 'border-gray-100');
        if (status === 'P') activeButton.classList.add('bg-icc', 'text-white', 'border-icc');
        if (status === 'A') activeButton.classList.add('bg-red-500', 'text-white', 'border-red-500');
        if (status === 'L') activeButton.classList.add('bg-yellow-500', 'text-white', 'border-yellow-500');
    }

    function renderAttendanceRecordingRows() {
        updateAttendanceHeaderDate();
        const recordingBody = document.getElementById('attendance-recording-body');

        const students = studentsBySection[currentClassroomSectionName] || [];

        const savedStatuses = getCurrentAttendanceStatuses();
        const savedExcuses = getCurrentAttendanceExcuses();

        if (!recordingBody) return;

        if (note) {
            note.classList.add('hidden');
            note.textContent = '';
        }

        recordingBody.innerHTML = students.map(student => {
            const currentStatus = savedStatuses[student.name] || '';
            const excuse = savedExcuses[student.name];
            const nameParts = student.name.split(', ');
            const lastName = nameParts[0];
            const firstNameFirstPart = nameParts[1] ? nameParts[1].split(' ')[0] : '';
            const displayName = `${lastName}, ${firstNameFirstPart}`;
            return `
                <tr class="hover:bg-gray-50/50 transition-colors group" data-student-name="${student.name}" data-status="${currentStatus}">
                    <td class="px-2 md:px-3 py-3 md:py-4 sticky left-0 z-10 bg-white border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] group-hover:bg-gray-50/50 transition-colors">
                        <div class="flex items-center gap-3">
                            <span class="text-xs md:text-sm font-bold text-gray-800 line-clamp-2 md:line-clamp-1 leading-tight">${displayName}</span>
                        </div>
                    </td>
                    <td class="px-3 md:px-6 py-3 md:py-4">
                        <div class="flex items-center justify-center gap-2 md:gap-3">
                            <button type="button" onclick="markAttendance(this, 'P')" data-value="P" class="attendance-mark-btn w-9 h-9 md:w-10 md:h-10 rounded-xl border border-gray-100 bg-white text-[10px] font-black text-gray-400 transition-all">P</button>
                            <button type="button" onclick="markAttendance(this, 'A')" data-value="A" class="attendance-mark-btn w-9 h-9 md:w-10 md:h-10 rounded-xl border border-gray-100 bg-white text-[10px] font-black text-gray-400 transition-all">A</button>
                            <button type="button" onclick="markAttendance(this, 'L')" data-value="L" class="attendance-mark-btn w-9 h-9 md:w-10 md:h-10 rounded-xl border border-gray-100 bg-white text-[10px] font-black text-gray-400 transition-all">L</button>
                        </div>
                    </td>
                    <td class="px-3 md:px-6 py-3 md:py-4">
                        <div class="flex justify-center">
                            <span class="${getAttendanceStatusBadge(currentStatus)}">${getAttendanceStatusLabel(currentStatus)}</span>
                        </div>
                    </td>
                    <td class="px-3 md:px-6 py-3 md:py-4">
                        ${excuse
                    ? `<button type="button" onclick="viewAttendanceExcuse('${student.name.replace(/'/g, "\\'")}')" class="px-4 py-2 rounded-xl bg-white border border-gray-100 text-[10px] font-black uppercase tracking-widest text-icc hover:bg-icc-light transition-all whitespace-nowrap">View Excuse</button>`
                    : `<span class="text-[10px] md:text-xs font-bold text-gray-300 whitespace-nowrap">No excuse</span>`}
                    </td>
                </tr>
            `;
        }).join('');

        recordingBody.querySelectorAll('tr').forEach(row => {
            applyAttendanceRowStatus(row, row.dataset.status || '');
        });
    }

    function updateAttendanceHeaderDate() {
        const dateEl = document.getElementById('attendance-current-date');
        if (!dateEl) return;
        const now = new Date();
        const dateText = now.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        }).toUpperCase();
        const timeText = now.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        }).toUpperCase();
        dateEl.textContent = `${dateText} &bull; ${timeText}`;
    }

    function applyClassroomSettingsUI() {
        const commentMode = getCurrentCommentMode();
        classroomSettingsMenu?.querySelectorAll('[data-comment-mode]').forEach(button => {
            button.classList.toggle('is-active', button.dataset.commentMode === commentMode);
        });
    }

    function closeClassroomSettingsMenu() {
        classroomSettingsMenu?.classList.add('hidden');
    }

    function toggleClassroomSettingsMenu() {
        if (!classroomSettingsMenu) return;
        classroomSettingsMenu.classList.toggle('hidden');
        applyClassroomSettingsUI();
    }

    document.getElementById('viewCalendarBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        hideHeaderOverlays();
        switchTab('nav-attendance');
    });

    // --- Attendance Search Finder ---
    window.toggleAttendanceFinder = function () {
        const title = document.getElementById('attendance-header-title');
        const input = document.getElementById('attendance-search-input');
        if (title && input) {
            title.classList.add('hidden');
            input.classList.remove('hidden');
            input.focus();
        }
    };

    window.hideAttendanceFinder = function () {
        const title = document.getElementById('attendance-header-title');
        const input = document.getElementById('attendance-search-input');
        if (title && input && !input.value.trim()) {
            title.classList.remove('hidden');
            input.classList.add('hidden');
        }
    };

    window.filterAttendanceRows = function (query) {
        const rows = document.querySelectorAll('#attendance-recording-body tr');
        if (!rows.length) return;
        const q = (query || "").toLowerCase().trim();
        rows.forEach(row => {
            const nameEl = row.querySelector('span.text-sm.font-bold');
            if (nameEl) {
                const name = nameEl.textContent.toLowerCase();
                row.style.display = name.includes(q) ? '' : 'none';
            }
        });
    };

    // --- Classroom Navigation ---
    function showStudentList(className, subject, initialTab = 'room', pushHistory = true) {
        scrollToTop();
        if (pushHistory) {
            const hash = `#classroom:${encodeURIComponent(className)}:${encodeURIComponent(subject)}:${initialTab}`;
            history.pushState({ type: 'classroom', className, subject, initialTab }, '', hash);
            localStorage.setItem('sigma-teacher-nav-state', JSON.stringify({ type: 'classroom', className, subject, initialTab }));
        }

        currentClassroomKey = `${className}::${subject}`;
        currentClassroomSectionName = className;
        currentClassroomMeta = classroomMetaBySubject[`${className}::${subject}`] || null;

        // Ensure the sidebar reflects the correct tab (Sections)
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(l => l.classList.remove('active'));
        const classesLink = document.getElementById('nav-classes');
        if (classesLink) classesLink.classList.add('active');
        const navContextText = document.getElementById('nav-context-text');
        if (navContextText) navContextText.textContent = 'Sections';

        // 1. IMPACTFUL UI TRANSITION (Hide room-adjacent panels only)

        const grid = document.getElementById('classrooms-grid');
        const detailView = document.getElementById('classroom-detail-view');
        const rightPanel = document.getElementById('classes-right-panel');
        const mainCol = document.getElementById('classes-main-col');
        const mainContent = document.getElementById('main-content');
        const recordingBody = document.getElementById('attendance-recording-body');

        if (grid) {
            grid.classList.add('hidden');
            grid.style.setProperty('display', 'none', 'important');
        }
        if (rightPanel) {
            rightPanel.classList.add('hidden');
            rightPanel.style.setProperty('display', 'none', 'important');
        }
        if (detailView) {
            detailView.classList.remove('hidden');
            detailView.style.setProperty('display', 'block', 'important');
        }

        if (mainCol) {
            mainCol.classList.remove('lg:col-span-2');
            mainCol.classList.add('lg:col-span-3');
        }

        const sectionClasses = document.getElementById('section-classes');
        const sectionDetail = document.getElementById('section-classroom-detail');

        hideAllSections();
        if (sectionDetail) sectionDetail.classList.remove('hidden');

        if (mainContent) {
            mainContent.classList.remove('pt-3', 'px-4', 'pb-4');
            mainContent.classList.add('p-0', 'pt-0', 'pb-0');
            mainContent.style.setProperty('padding-top', '0', 'important');
            mainContent.style.setProperty('padding-bottom', '0', 'important');
            mainContent.style.setProperty('padding-left', '0', 'important');
            mainContent.style.setProperty('padding-right', '0', 'important');
        }

        // 2. Update Header
        if (typeof setClassroomDetailHeader === 'function') {
            setClassroomDetailHeader({
                title: 'Classroom',
                subject,
                showDetail: true,
                className,
                room: currentClassroomMeta?.room || ''
            });
        }
        applyClassroomBannerCover(subject);
        const subSidebar = document.getElementById('sub-sidebar');
        const isSubSidebarVisible = subSidebar && subSidebar.classList.contains('sub-sidebar-visible');
        renderClassroomSectionsSidebar(className, subject, isSubSidebarVisible);

        renderRoomPeoplePanel(className, subject);
        renderRoomAnnouncementsFeed();
        applyClassroomSettingsUI();

        // 3. Attendance Recording Setup (Data Part)
        if (recordingBody && studentsBySection[className]) renderAttendanceRecordingRows();

        // Open the section room in the requested tab.
        if (typeof switchClassDetailTab === 'function') {
            switchClassDetailTab(initialTab || 'room');
        }

        // Reset Gradebook highlights when switching sections
        if (typeof window.clearGradebookHighlights === 'function') {
            window.clearGradebookHighlights(false, true); // inner
            window.clearGradebookHighlights(true, true);  // outer
        }
    };

    window.openCurrentClassroomTopics = function () {
        const subjectName = (currentClassroomKey || '').split('::')[1] || '';
        if (!subjectName) return;

        // 1. Find the subject across all programs, clusters, and stages
        let targetId = null;
        for (const progKey in curriculumPrograms) {
            const prog = curriculumPrograms[progKey];

            // Check direct subjects
            const foundDirect = (prog.subjects || []).find(s => s.title === subjectName || s.text === subjectName || s.name === subjectName);
            if (foundDirect) {
                targetId = foundDirect.id;
                break;
            }

            // Check clusters
            if (prog.clusters) {
                for (const cluster of prog.clusters) {
                    const foundInCluster = (cluster.subjects || []).find(s => (typeof s === 'string' ? s === subjectName : (s.title === subjectName || s.text === subjectName)));
                    if (foundInCluster) {
                        targetId = typeof foundInCluster === 'string' ? `gen-${slugify(foundInCluster)}` : foundInCluster.id;
                        if (typeof foundInCluster === 'string' && typeof ensureSubjectDataForTitle === 'function') {
                            ensureSubjectDataForTitle(foundInCluster, cluster.title);
                        }
                        break;
                    }
                }
            }
            if (targetId) break;

            // Check stages
            const foundStage = (prog.stages || []).find(s => s.title === subjectName || s.text === subjectName || s.name === subjectName);
            if (foundStage) {
                targetId = foundStage.key || foundStage.id;
                break;
            }
        }

        if (targetId) {
            switchToTopicPage(targetId);
        } else {
            // 2. Fallback: try matching by name in window.subjectsData
            const allSubjects = Object.values(window.subjectsData || {}).flat();
            const matched = allSubjects.find(s => s.name === subjectName || s.title === subjectName);
            if (matched && matched.id) {
                switchToTopicPage(matched.id);
            }
        }
    };

    function slugify(text) {
        return (text || '').toString().toLowerCase().trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-');
    }

    window.leaveRoom = function () {
        const modal = document.getElementById('leaveRoomModal');
        if (modal) modal.classList.remove('hidden');
    };

    window.closeLeaveRoomModal = function () {
        const modal = document.getElementById('leaveRoomModal');
        if (modal) modal.classList.add('hidden');
    };

    window.confirmLeaveRoom = function () {
        closeLeaveRoomModal();
        const grid = document.getElementById('classrooms-grid');
        const detailView = document.getElementById('classroom-detail-view');
        const rightPanel = document.getElementById('classes-right-panel');
        const mainCol = document.getElementById('classes-main-col');
        const mainContent = document.getElementById('main-content');

        if (!grid || !detailView) return;

        if (grid) {
            grid.classList.remove('hidden');
            grid.style.setProperty('display', 'grid', 'important');
        }

        if (detailView) {
            detailView.classList.add('hidden');
            detailView.style.setProperty('display', 'none', 'important');
        }

        if (rightPanel) {
            rightPanel.classList.remove('hidden');
            rightPanel.style.setProperty('display', 'block', 'important');
        }
        if (mainCol) {
            mainCol.classList.remove('lg:col-span-3');
            mainCol.classList.add('lg:col-span-2');
        }
        const sectionClasses = document.getElementById('section-classes');
        const sectionDetail = document.getElementById('section-classroom-detail');

        if (sectionClasses) sectionClasses.classList.remove('hidden');
        if (sectionDetail) sectionDetail.classList.add('hidden');

        if (mainContent) {
            mainContent.style.removeProperty('padding-top');
            mainContent.style.removeProperty('padding-bottom');
            mainContent.style.removeProperty('padding-left');
            mainContent.style.removeProperty('padding-right');
            mainContent.classList.add('pt-3', 'px-4', 'pb-4');
            mainContent.classList.remove('pt-0', 'pb-0', 'p-0');
        }

        currentClassroomMeta = null;
        currentClassroomKey = '';
        setClassroomDetailHeader({ title: 'Sections', showDetail: false });
        hideClassroomSectionsSidebar();
    };

    window.openAnnouncementPad = function () {
        if (!announcementPadLayer) return;
        announcementPadLayer.classList.remove('hidden');
        document.body.classList.add('announcement-overlay-open');
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(() => {
            focusAnnouncementPadEditor();
            saveAnnouncementPadSelection();
            updateAnnouncementPostButton();
        });
    };

    // --- Classroom Announcement Pad ---
    function closeAnnouncementPad() {
        if (!announcementPadLayer) return;
        announcementPadLayer.classList.add('hidden');
        document.body.classList.remove('announcement-overlay-open');
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';

        // Reset Pad on Cancel/Close
        if (announcementPadEditor) {
            announcementPadEditor.innerHTML = '';
            announcementPadRange = null;
            updateAnnouncementPostButton();
        }
    };

    function isSelectionInsideAnnouncementPad() {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || !announcementPadEditor) return false;
        const anchorNode = selection.anchorNode;
        return !!anchorNode && announcementPadEditor.contains(anchorNode);
    }

    function saveAnnouncementPadSelection() {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || !isSelectionInsideAnnouncementPad()) return;
        announcementPadRange = selection.getRangeAt(0).cloneRange();
    }

    function focusAnnouncementPadEditor() {
        if (!announcementPadEditor) return;
        announcementPadEditor.focus();

        const selection = window.getSelection();
        if (!selection) return;

        selection.removeAllRanges();

        if (announcementPadRange) {
            selection.addRange(announcementPadRange.cloneRange());
            return;
        }

        const range = document.createRange();
        range.selectNodeContents(announcementPadEditor);
        range.collapse(false);
        selection.addRange(range);
        announcementPadRange = range.cloneRange();
    }

    function placeCaretInsideNode(node) {
        if (!node) return;
        const selection = window.getSelection();
        if (!selection) return;

        const range = document.createRange();
        range.selectNodeContents(node);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        announcementPadRange = range.cloneRange();
    }

    function placeCaretAtEndOfNode(node) {
        if (!node) return;
        const selection = window.getSelection();
        if (!selection) return;

        const range = document.createRange();
        range.selectNodeContents(node);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        announcementPadRange = range.cloneRange();
    }

    function execAnnouncementPadCommand(command, value = null) {
        if (!announcementPadEditor) return;
        focusAnnouncementPadEditor();
        document.execCommand(command, false, value);
        if (command === 'insertUnorderedList' || command === 'insertOrderedList') {
            requestAnimationFrame(() => {
                const listSelector = command === 'insertOrderedList' ? 'ol' : 'ul';
                const activeList = announcementPadEditor.querySelector(`${listSelector}:last-of-type`);
                const targetLi = activeList?.lastElementChild;
                if (targetLi) {
                    placeCaretAtEndOfNode(targetLi);
                }
                saveAnnouncementPadSelection();
                updateAnnouncementPostButton();
            });
            return;
        }
        updateAnnouncementPostButton();
    }

    function updateAnnouncementPostButton() {
        if (!announcementPostBtn || !announcementPadEditor) return;
        // TextContent ignores BR, but lets trim to be sure
        const hasText = announcementPadEditor.textContent.trim().length > 0;
        // Check if there is at least one non-empty list item or any list item if purposefully clicked
        const hasListItem = announcementPadEditor.querySelector('li') !== null;

        // If it's a completely empty list structure, we might want to let the user post 
        // as per previous requirement, but if they erase it all, it should disable.
        announcementPostBtn.disabled = !hasText && !hasListItem;
    }

    if (announcementPadEditor) {
        announcementPadEditor.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const container = range.startContainer;
                    const li = container.nodeType === 3 ? container.parentElement.closest('li') : container.closest('li');

                    // If we are at the start of an empty LI, erase the list format immediately (1 time)
                    if (li && li.textContent.trim() === '' && range.startOffset === 0) {
                        e.preventDefault();
                        const isOrdered = li.parentElement.tagName === 'OL';
                        document.execCommand(isOrdered ? 'insertOrderedList' : 'insertUnorderedList', false, null);
                        updateAnnouncementPostButton();
                        return;
                    }
                }

                // Fallback cleanup
                setTimeout(() => {
                    const text = announcementPadEditor.textContent.trim();
                    const html = announcementPadEditor.innerHTML.toLowerCase();
                    if (text.length === 0 && !announcementPadEditor.querySelector('li')) {
                        if (html === '<br>' || html === '<div><br></div>' || html === '<p><br></p>') {
                            announcementPadEditor.innerHTML = '';
                        }
                    }
                    updateAnnouncementPostButton();
                }, 0);
            } else if (e.key === 'Delete') {
                setTimeout(() => updateAnnouncementPostButton(), 0);
            }
        });

        ['keyup', 'mouseup', 'input', 'focus'].forEach((eventName) => {
            announcementPadEditor.addEventListener(eventName, () => {
                saveAnnouncementPadSelection();
                updateAnnouncementPostButton();
            });
        });
    }

    document.addEventListener('selectionchange', () => {
        if (announcementPadLayer?.classList.contains('hidden')) return;
        saveAnnouncementPadSelection();
    });

    document.querySelectorAll('.announcement-pad-layer__tool[data-command]').forEach((button) => {
        button.addEventListener('mousedown', (event) => {
            event.preventDefault();
        });

        button.addEventListener('click', () => {
            const command = button.dataset.command;
            if (!command) return;
            execAnnouncementPadCommand(command);
        });
    });

    if (announcementPostBtn) {
        announcementPostBtn.addEventListener('click', () => {
            if (!announcementPadEditor || !currentClassroomKey) return;
            const html = announcementPadEditor.innerHTML.trim();
            const text = announcementPadEditor.textContent.trim();
            if (!html || !text) return;

            const postId = `${currentClassroomKey}-${Date.now()}`;
            const nowIso = new Date().toISOString();
            const teacherName = currentClassroomMeta?.teacher || 'Teacher';
            // Parse the classroom key: "Grade 11 - ICT A::Programming 1"
            const [gradeSection, subjectName] = currentClassroomKey.split('::');

            const roomPost = {
                id: postId,
                author: teacherName,
                timestamp: new Date().toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                }),
                html
            };

            const posts = announcementPostsByClassroom[currentClassroomKey] || [];
            posts.unshift(roomPost);
            announcementPostsByClassroom[currentClassroomKey] = posts;
            saveSharedState(SHARED_ANNOUNCEMENTS_KEY, announcementPostsByClassroom);

            // --- Also push to the dashboard Posts feed ---
            const dashPost = {
                id: postId,
                title: subjectName || 'Classroom Post',
                subtitle: gradeSection || '',
                body: text,
                audience: 'all',
                type: 'regular',
                isImportant: false,
                createdAt: nowIso,
                author: teacherName,
                isAdmin: false,
                isClassroomPost: true,
                classroomKey: currentClassroomKey
            };
            const dashPosts = JSON.parse(localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY) || '[]');
            dashPosts.unshift(dashPost);
            localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, JSON.stringify(dashPosts));
            // Refresh dashboard feed if visible
            if (typeof renderTeacherAnnouncements === 'function') renderTeacherAnnouncements();

            renderRoomAnnouncementsFeed();
            closeAnnouncementPad();
        });
    }

    function setAttendanceCycleState(btn, status) {
        if (!btn) return;

        const label = btn.querySelector('.attendance-cycle-label');
        const dot = btn.querySelector('.attendance-cycle-dot');
        const states = {
            '': { text: 'Unset', btn: ['bg-white', 'text-gray-500', 'border-gray-200'], dot: 'bg-gray-300' },
            P: { text: 'Present', btn: ['bg-icc', 'text-white', 'border-icc'], dot: 'bg-white' },
            A: { text: 'Absent', btn: ['bg-red-500', 'text-white', 'border-red-500'], dot: 'bg-white' },
            L: { text: 'Late', btn: ['bg-yellow-500', 'text-white', 'border-yellow-500'], dot: 'bg-white' }
        };
        const currentState = states[status] || states[''];

        btn.dataset.status = status;
        btn.className = 'attendance-cycle-btn min-w-[112px] px-4 py-2 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest';
        btn.classList.add(...currentState.btn);

        if (label) label.textContent = currentState.text;
        if (dot) dot.className = `attendance-cycle-dot w-2 h-2 rounded-full ${currentState.dot}`;
    }

    window.cycleAttendanceStatus = function (btn) {
        const currentStatus = btn?.dataset.status || '';
        const sequence = ['', 'P', 'A', 'L'];
        const nextStatus = sequence[(sequence.indexOf(currentStatus) + 1) % sequence.length];
        setAttendanceCycleState(btn, nextStatus);
    };

    window.markAttendance = function (btn, status) {
        const row = btn?.closest('tr');
        if (!row) return;
        applyAttendanceRowStatus(row, status);
    };

    window.viewAttendanceExcuse = function (studentName) {
        if (!studentName) return;
        const excuses = getCurrentAttendanceExcuses();
        const excuse = excuses[studentName];
        if (!excuse) return;

        const files = (excuse.files || []).length
            ? excuse.files.map(file => `- ${file.name}`).join('\n')
            : 'No files attached.';
        const message = [
            `Student: ${studentName}`,
            `Submitted: ${excuse.submittedAt || 'Unknown time'}`,
            '',
            `Comment: ${excuse.comment || 'No comment provided.'}`,
            '',
            'Attached files:',
            files
        ].join('\n');
        window.alert(message);
    };

    window.submitAttendance = function () {
        const btn = event.target.closest('button');
        if (!btn) return;

        const rows = document.querySelectorAll('#attendance-recording-body tr');

        const savedStatuses = getCurrentAttendanceStatuses();
        const savedExcuses = getCurrentAttendanceExcuses();
        const statuses = {};
        rows.forEach(row => {
            const name = row.dataset.studentName;
            if (!name) return;
            statuses[name] = row.dataset.status || '';
        });
        saveCurrentAttendanceStatuses(statuses, savedExcuses);

        btn.disabled = true;

        setTimeout(() => {
            btn.disabled = false;
            switchClassDetailTab('room');
        }, 150);
    };

    window.switchClassDetailTab = function (tabId) {
        scrollToTop();
        const sections = ['room', 'attendance', 'materials'];
        sections.forEach(id => {
            const section = document.getElementById(`detail-section-${id}`);
            const btn = document.getElementById(`tab-btn-${id}`);
            if (section) section.classList.toggle('hidden', id !== tabId);
            if (btn) {
                if (id === tabId) {
                    btn.classList.add('active');
                    btn.classList.add('border-icc');
                    btn.classList.remove('border-transparent');
                } else {
                    btn.classList.remove('active');
                    btn.classList.remove('border-icc');
                    btn.classList.add('border-transparent');
                }
            }
        });
        const analyticsSection = document.getElementById('detail-section-analytics');
        if (analyticsSection) analyticsSection.classList.add('hidden');
        if (tabId === 'attendance') {
            // Reset scroll so the table always snaps to today's column on mobile
            attendanceLastScrollLeft = -1;
            renderClassroomAttendanceTab(true);
        }

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
                    panel.querySelectorAll('.classroom-room-people__list').forEach(list => list.scrollTop = 0);

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
                        // Enough drag &mdash; close
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

    window.toggleMaterialsPopup = function () {
        const panel = document.getElementById('materials-popup-panel');

        if (panel) panel.classList.toggle('hidden');
    };

    window.toggleUploadMaterialOverlay = function (show) {
        const overlay = document.getElementById('teacher-material-upload-overlay');
        if (!overlay) return;
        if (show) {
            overlay.classList.remove('hidden');
            document.body.classList.add('overflow-hidden');
            // Reset to main view
            const mainView = document.getElementById('teacher-materials-main-view');
            const editorView = document.getElementById('teacher-material-editor-view');
            if (mainView) mainView.classList.remove('hidden');
            if (editorView) editorView.classList.add('hidden');

            // Close the trigger popup
            const panel = document.getElementById('materials-popup-panel');
            if (panel) panel.classList.add('hidden');
        } else {
            overlay.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        }
    };

    window.toggleTeacherMaterialDropdown = function (event) {
        if (event) event.stopPropagation();
        const dropdown = document.getElementById('teacher-add-material-dropdown');
        if (dropdown) dropdown.classList.toggle('hidden');
    };

    window.addTeacherMaterial = function (type) {
        const mainView = document.getElementById('teacher-materials-main-view');
        const editorView = document.getElementById('teacher-material-editor-view');
        if (!mainView || !editorView) return;

        // Hide dropdown
        const dropdown = document.getElementById('teacher-add-material-dropdown');
        if (dropdown) dropdown.classList.add('hidden');

        // Switch Views
        mainView.classList.add('hidden');
        editorView.classList.remove('hidden');

        // Prepare Editor Content based on type
        const displayType = type;

        if (type === 'Video') {
            editorView.innerHTML = `
                <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div class="flex items-center gap-6">
                        <button onclick="window.cancelTeacherMaterialEditor()" class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 hover:bg-[#FFD000] hover:text-black transition-all flex items-center justify-center">
                            <i class="fa-solid fa-chevron-left text-sm"></i>
                        </button>
                        <div>
                            <h3 class="text-2xl font-black text-black tracking-tight">Add Video</h3>
                        </div>
                    </div>
                    
                    <div class="bg-white border border-slate-100 rounded-[40px] p-10 shadow-2xl shadow-slate-200/40 space-y-10">
                        <div class="grid gap-8">
                            <div class="space-y-3">
                                <label class="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Title</label>
                                <input type="text" id="teacher-mat-editor-title"
                                    placeholder="Enter video title..."
                                    class="w-full bg-slate-50 border border-slate-100 px-8 py-5 rounded-[24px] text-base font-medium text-black outline-none focus:border-black transition-all shadow-inner">
                            </div>
                            
                            <div class="space-y-3">
                                <label class="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Description</label>
                                <textarea id="teacher-mat-editor-desc"
                                    placeholder="Enter video description..."
                                    class="w-full bg-slate-50 border border-slate-100 px-8 py-6 rounded-[32px] text-base font-medium text-black outline-none focus:border-black transition-all shadow-inner min-h-[180px] resize-none"></textarea>
                            </div>
                        </div>

                        <div class="space-y-6">
                            <label class="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Video Source</label>
                            
                            <div class="flex p-1.5 bg-slate-100 rounded-[20px] w-fit">
                                <button onclick="window.switchTeacherVideoSourceTab('embedded')" id="teacher-tab-video-embedded"
                                    class="px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all bg-white text-black shadow-sm">
                                    Embedded (YouTube)
                                </button>
                                <button onclick="window.switchTeacherVideoSourceTab('mp4')" id="teacher-tab-video-mp4"
                                    class="px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all text-slate-400 hover:text-black">
                                    MP4 File
                                </button>
                            </div>

                            <div id="teacher-video-source-input-container">
                                <div class="space-y-4">
                                    <input type="text" id="teacher-mat-video-url"
                                        oninput="window.handleTeacherVideoUrlChange(this.value)"
                                        placeholder="Paste YouTube URL here..."
                                        class="w-full bg-slate-50 border border-slate-100 px-8 py-5 rounded-[24px] text-base font-medium text-black outline-none focus:border-black transition-all">
                                </div>
                            </div>

                            <div id="teacher-mat-video-preview-container" class="aspect-video w-full bg-black rounded-[32px] overflow-hidden shadow-2xl relative group flex items-center justify-center">
                                <i class="fa-solid fa-play text-white/20 text-6xl group-hover:scale-110 transition-transform"></i>
                            </div>
                        </div>

                        <div class="flex items-center justify-end gap-4 pt-4">
                            <button onclick="window.cancelTeacherMaterialEditor()" class="px-10 py-4 bg-white border border-slate-200 text-black text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all">
                                Cancel
                            </button>
                            <button class="px-12 py-4 bg-[#15803d] text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#166534] transition-all shadow-lg shadow-green-100">
                                Add Material
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else if (type === 'Quiz') {
            editorView.innerHTML = `
                <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div class="flex items-center gap-6">
                        <button onclick="window.cancelTeacherMaterialEditor()" class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 hover:bg-[#FFD000] hover:text-black transition-all flex items-center justify-center">
                            <i class="fa-solid fa-chevron-left text-sm"></i>
                        </button>
                        <div>
                            <h3 class="text-2xl font-black text-black tracking-tight">Add Quiz</h3>
                        </div>
                    </div>
                    
                    <div class="bg-white border border-slate-100 rounded-[40px] p-10 shadow-2xl shadow-slate-200/40 space-y-10">
                        <div class="grid gap-8">
                            <div class="space-y-3">
                                <label class="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Title</label>
                                <input type="text" id="teacher-mat-editor-title"
                                    placeholder="Enter quiz title..."
                                    class="w-full bg-slate-50 border border-slate-100 px-8 py-5 rounded-[24px] text-base font-medium text-black outline-none focus:border-black transition-all shadow-inner">
                            </div>
                            
                            <div class="space-y-3">
                                <label class="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Description</label>
                                <textarea id="teacher-mat-editor-desc"
                                    placeholder="Enter quiz description..."
                                    class="w-full bg-slate-50 border border-slate-100 px-8 py-6 rounded-[32px] text-base font-medium text-black outline-none focus:border-black transition-all shadow-inner min-h-[150px] resize-none"></textarea>
                            </div>
                        </div>

                        <div class="space-y-8">
                            <label class="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Creation Method</label>
                            <div class="flex p-1.5 bg-slate-100 rounded-[20px] w-fit">
                                <button onclick="window.switchTeacherQuizMethod('upload')" id="teacher-tab-quiz-upload"
                                    class="px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all bg-white text-black shadow-sm">
                                    Upload File
                                </button>
                                <button onclick="window.switchTeacherQuizMethod('draft')" id="teacher-tab-quiz-draft"
                                    class="px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all text-slate-400 hover:text-black">
                                    Create Quiz
                                </button>
                                <button onclick="window.switchTeacherQuizMethod('ai')" id="teacher-tab-quiz-ai"
                                    class="px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all text-slate-400 hover:text-black">
                                    <i class="fa-solid fa-bolt-lightning mr-2"></i>
                                    Generate Quiz
                                </button>
                            </div>

                            <div id="teacher-quiz-method-container" class="space-y-6">
                                <div class="flex items-center gap-4">
                                    <div id="teacher-mat-gen-file-label" class="flex-1 bg-slate-50 border border-slate-100 px-8 py-5 rounded-[24px] text-slate-400 text-base font-medium truncate">
                                        No file selected
                                    </div>
                                    <button class="px-8 py-5 bg-[#15803d] text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#166534] transition-all whitespace-nowrap shadow-lg shadow-green-100">
                                        Upload DOCX
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="flex items-center justify-end gap-4 pt-4">
                            <button onclick="window.cancelTeacherMaterialEditor()" class="px-10 py-4 bg-white border border-slate-200 text-black text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all">
                                Cancel
                            </button>
                            <button class="px-12 py-4 bg-[#15803d] text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#166534] transition-all shadow-lg shadow-green-100">
                                Add Material
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Generic (Lesson, Assignment, Activity, Performance Task)
            editorView.innerHTML = `
                <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div class="flex items-center gap-6">
                        <button onclick="window.cancelTeacherMaterialEditor()" class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 hover:bg-[#FFD000] hover:text-black transition-all flex items-center justify-center">
                            <i class="fa-solid fa-chevron-left text-sm"></i>
                        </button>
                        <div>
                            <h3 class="text-2xl font-black text-black tracking-tight">Add ${displayType}</h3>
                        </div>
                    </div>
                    
                    <div class="bg-white border border-slate-100 rounded-[40px] p-10 shadow-2xl shadow-slate-200/40 space-y-10">
                        <div class="grid gap-8">
                            <div class="space-y-3">
                                <label class="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Title</label>
                                <input type="text" id="teacher-mat-editor-title"
                                    placeholder="Enter ${displayType.toLowerCase()} title..."
                                    class="w-full bg-slate-50 border border-slate-100 px-8 py-5 rounded-[24px] text-base font-medium text-black outline-none focus:border-black transition-all shadow-inner">
                            </div>
                            
                            <div class="space-y-3">
                                <label class="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Description</label>
                                <textarea id="teacher-mat-editor-desc"
                                    placeholder="Enter ${displayType.toLowerCase()} description..."
                                    class="w-full bg-slate-50 border border-slate-100 px-8 py-6 rounded-[32px] text-base font-medium text-black outline-none focus:border-black transition-all shadow-inner min-h-[150px] resize-none"></textarea>
                            </div>
                        </div>

                        <div class="space-y-6">
                            <label class="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">File Type</label>
                            
                            <div class="flex p-1.5 bg-slate-100 rounded-[20px] w-fit">
                                <button onclick="window.switchTeacherGenericFileTab('docx')" id="teacher-tab-gen-docx"
                                    class="px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all bg-white text-black shadow-sm">
                                    DOCX
                                </button>
                                <button onclick="window.switchTeacherGenericFileTab('pdf')" id="teacher-tab-gen-pdf"
                                    class="px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all text-slate-400 hover:text-black">
                                    PDF
                                </button>
                                <button onclick="window.switchTeacherGenericFileTab('pptx')" id="teacher-tab-gen-pptx"
                                    class="px-8 py-3 rounded-[15px] text-[11px] font-black uppercase tracking-widest transition-all text-slate-400 hover:text-black">
                                    PPTX
                                </button>
                            </div>

                            <div id="teacher-gen-file-input-container">
                                <div class="flex items-center gap-4">
                                    <div id="teacher-mat-gen-file-label" class="flex-1 bg-slate-50 border border-slate-100 px-8 py-5 rounded-[24px] text-slate-400 text-base font-medium truncate">
                                        No file selected
                                    </div>
                                    <button class="px-8 py-5 bg-[#15803d] text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#166534] transition-all whitespace-nowrap shadow-lg shadow-green-100">
                                        Upload DOCX
                                    </button>
                                </div>
                            </div>

                            <div id="teacher-mat-gen-preview-container" class="aspect-video w-full bg-slate-50 border border-dashed border-slate-200 rounded-[32px] overflow-hidden flex flex-col items-center justify-center gap-4">
                                <i id="teacher-mat-gen-icon" class="fa-solid fa-file-word text-slate-200 text-6xl"></i>
                                <p class="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No file uploaded</p>
                            </div>
                        </div>

                        <div class="flex items-center justify-end gap-4 pt-4">
                            <button onclick="window.cancelTeacherMaterialEditor()" class="px-10 py-4 bg-white border border-slate-200 text-black text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all">
                                Cancel
                            </button>
                            <button class="px-12 py-4 bg-[#15803d] text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#166534] transition-all shadow-lg shadow-green-100">
                                Add Material
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    };

    window.cancelTeacherMaterialEditor = function () {
        const mainView = document.getElementById('teacher-materials-main-view');
        const editorView = document.getElementById('teacher-material-editor-view');
        if (mainView) mainView.classList.remove('hidden');
        if (editorView) editorView.classList.add('hidden');
    };

    window.switchTeacherVideoSourceTab = function (source) {
        const embeddedBtn = document.getElementById('teacher-tab-video-embedded');
        const mp4Btn = document.getElementById('teacher-tab-video-mp4');
        const container = document.getElementById('teacher-video-source-input-container');

        if (source === 'embedded') {
            embeddedBtn?.classList.add('bg-white', 'text-black', 'shadow-sm');
            embeddedBtn?.classList.remove('text-slate-400');
            mp4Btn?.classList.remove('bg-white', 'text-black', 'shadow-sm');
            mp4Btn?.classList.add('text-slate-400');

            container.innerHTML = `
                <div class="space-y-4">
                    <input type="text" id="teacher-mat-video-url"
                        oninput="window.handleTeacherVideoUrlChange(this.value)"
                        placeholder="Paste YouTube URL here..."
                        class="w-full bg-slate-50 border border-slate-100 px-8 py-5 rounded-[24px] text-base font-medium text-black outline-none focus:border-black transition-all">
                </div>
            `;
        } else {
            mp4Btn?.classList.add('bg-white', 'text-black', 'shadow-sm');
            mp4Btn?.classList.remove('text-slate-400');
            embeddedBtn?.classList.remove('bg-white', 'text-black', 'shadow-sm');
            embeddedBtn?.classList.add('text-slate-400');

            container.innerHTML = `
                <div class="flex items-center gap-4">
                    <div id="teacher-mat-video-file-label" class="flex-1 bg-slate-50 border border-slate-100 px-8 py-5 rounded-[24px] text-slate-400 text-base font-medium truncate">
                        No video file selected
                    </div>
                    <button class="px-8 py-5 bg-[#15803d] text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#166534] transition-all whitespace-nowrap shadow-lg shadow-green-100">
                        Upload MP4
                    </button>
                </div>
            `;
        }
    };

    window.handleTeacherVideoUrlChange = function (url) {
        const preview = document.getElementById('teacher-mat-video-preview-container');
        if (!preview) return;

        const videoId = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);

        if (videoId) {
            preview.innerHTML = `<iframe class="w-full h-full" src="https://www.youtube.com/embed/${videoId[1]}" frameborder="0" allowfullscreen></iframe>`;
        } else {
            preview.innerHTML = `<i class="fa-solid fa-play text-white/20 text-6xl group-hover:scale-110 transition-transform"></i>`;
        }
    };

    window.switchTeacherQuizMethod = function (method) {
        const tabs = ['upload', 'draft', 'ai'];
        tabs.forEach(t => {
            const btn = document.getElementById(`teacher-tab-quiz-${t}`);
            if (t === method) {
                btn?.classList.add('bg-white', 'text-black', 'shadow-sm');
                btn?.classList.remove('text-slate-400');
            } else {
                btn?.classList.remove('bg-white', 'text-black', 'shadow-sm');
                btn?.classList.add('text-slate-400');
            }
        });

        const container = document.getElementById('teacher-quiz-method-container');
        if (method === 'upload') {
            container.innerHTML = `
                <div class="flex items-center gap-4">
                    <div id="teacher-mat-gen-file-label" class="flex-1 bg-slate-50 border border-slate-100 px-8 py-5 rounded-[24px] text-slate-400 text-base font-medium truncate">
                        No file selected
                    </div>
                    <button class="px-8 py-5 bg-[#15803d] text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#166534] transition-all whitespace-nowrap shadow-lg shadow-green-100">
                        Upload DOCX
                    </button>
                </div>
            `;
        } else if (method === 'draft') {
            container.innerHTML = `
                <div class="p-12 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center gap-4 text-slate-400">
                    <i class="fa-solid fa-pen-nib text-4xl"></i>
                    <p class="text-xs font-bold uppercase tracking-widest">Manual Creation Interface Placeholder</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="p-12 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center gap-4 text-slate-400">
                    <i class="fa-solid fa-robot text-4xl"></i>
                    <p class="text-xs font-bold uppercase tracking-widest">AI Generation Workspace Placeholder</p>
                </div>
            `;
        }
    };

    window.switchTeacherGenericFileTab = function (type) {
        const types = ['docx', 'pdf', 'pptx'];
        types.forEach(t => {
            const btn = document.getElementById(`teacher-tab-gen-${t}`);
            if (t === type) {
                btn?.classList.add('bg-white', 'text-black', 'shadow-sm');
                btn?.classList.remove('text-slate-400');
            } else {
                btn?.classList.remove('bg-white', 'text-black', 'shadow-sm');
                btn?.classList.add('text-slate-400');
            }
        });

        const label = document.getElementById('teacher-mat-gen-file-label');
        if (label) label.textContent = `No ${type.toUpperCase()} file selected`;

        const btn = label?.nextElementSibling;
        if (btn) btn.textContent = `Upload ${type.toUpperCase()}`;

        const icon = document.getElementById('teacher-mat-gen-icon');
        if (icon) {
            icon.className = `fa-solid ${type === 'docx' ? 'fa-file-word' : type === 'pdf' ? 'fa-file-pdf' : 'fa-file-powerpoint'} text-slate-200 text-6xl`;
        }
    };

    // Close popups when clicking outside
    document.addEventListener('click', (e) => {
        const materialsPanel = document.getElementById('materials-popup-panel');
        const materialsBtn = e.target.closest('button[onclick="toggleMaterialsPopup()"]');
        if (materialsPanel && !materialsPanel.contains(e.target) && !materialsBtn) {
            materialsPanel.classList.add('hidden');
        }

        const materialDropdown = document.getElementById('teacher-add-material-dropdown');
        const materialBtn = document.getElementById('teacher-add-material-trigger');
        if (materialDropdown && !materialDropdown.contains(e.target) && !materialBtn?.contains(e.target)) {
            materialDropdown.classList.add('hidden');
        }

        const peoplePanel = document.getElementById('classroom-mobile-people-panel');
        const peopleBtn = document.getElementById('classroom-mobile-people-btn');
        if (peoplePanel && peoplePanel.classList.contains('active') && !peoplePanel.contains(e.target) && (!peopleBtn || !peopleBtn.contains(e.target))) {
            peoplePanel.classList.remove('active');
            document.body.classList.remove('overflow-hidden');
        }
    });

    window.backToClassrooms = function () {
        const grid = document.getElementById('classrooms-grid');
        const detailView = document.getElementById('classroom-detail-view');
        const rightPanel = document.getElementById('classes-right-panel');
        const mainCol = document.getElementById('classes-main-col');
        const mainContent = document.getElementById('main-content');

        if (grid && detailView) {
            closeAnnouncementPad();

            detailView.classList.add('hidden');
            detailView.style.setProperty('display', 'none', 'important');

            grid.classList.remove('hidden');
            grid.style.setProperty('display', 'grid', 'important');

            // Restore sidebar
            document.body.classList.remove('sidebar-hidden');

            // Reset main content headers
            currentClassroomMeta = null;
            currentClassroomKey = '';
            currentClassroomSectionName = '';
            setClassroomDetailHeader({ title: 'Sections', showDetail: false });
            hideClassroomSectionsSidebar();

            // Show advisory panel again
            if (rightPanel) {
                rightPanel.classList.remove('hidden');
                rightPanel.style.setProperty('display', 'block', 'important');
            }
            if (mainCol) {
                mainCol.classList.remove('lg:col-span-3');
                mainCol.classList.add('lg:col-span-2');
            }
            if (mainContent) {
                mainContent.style.removeProperty('padding-top');
                mainContent.style.removeProperty('padding-bottom');
                mainContent.classList.remove('pt-0');
                mainContent.classList.add('pt-3');
                mainContent.classList.remove('pb-0');
                mainContent.classList.add('pb-4');
            }

            requestAnimationFrame(() => initCardSortable(true));
        }
    };

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && announcementPadLayer && !announcementPadLayer.classList.contains('hidden')) {
            closeAnnouncementPad();
        }
        if (event.key === 'Escape') closeClassroomSettingsMenu();
    });

    classroomSettingsBtn?.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleClassroomSettingsMenu();
    });

    classroomSettingsMenu?.querySelectorAll('[data-comment-mode]').forEach(button => {
        button.addEventListener('click', () => {
            const mode = button.dataset.commentMode;
            localStorage.setItem(`classroom-comment-mode-${currentClassroomKey}`, mode);
            applyClassroomSettingsUI();
            closeClassroomSettingsMenu();
            renderRoomAnnouncementsFeed();
        });
    });

    document.addEventListener('click', (event) => {
        if (!classroomSettingsMenu || classroomSettingsMenu.classList.contains('hidden')) return;
        if (classroomSettingsMenu.contains(event.target) || classroomSettingsBtn?.contains(event.target)) return;
        closeClassroomSettingsMenu();
    });

    window.addEventListener('storage', (event) => {
        if (!currentClassroomKey) return;
        if (![SHARED_ANNOUNCEMENTS_KEY, SHARED_ATTENDANCE_RECORDS_KEY, SHARED_COMMENT_MODE_KEY, SHARED_ANNOUNCEMENT_COMMENTS_KEY, ADMIN_SUBJECTS_STORAGE_KEY].includes(event.key)) return;
        if (event.key === ADMIN_SUBJECTS_STORAGE_KEY && currentClassroomKey) {
            const [, subjectLabel = ''] = currentClassroomKey.split('::');
            applyClassroomBannerCover(subjectLabel);
        }
        renderRoomAnnouncementsFeed();
        renderAttendanceRecordingRows();
        applyClassroomSettingsUI();
    });

    // --- Sigma AI Insights Carousel ---
    function setupInsightsCarousel() {
        const wrapper = document.getElementById('ai-insights-wrapper');
        const dotsContainer = document.getElementById('insight-dots');
        const prevBtn = document.getElementById('prev-insight');
        const nextBtn = document.getElementById('next-insight');

        if (!wrapper || !dotsContainer || !prevBtn || !nextBtn) return;

        const insights = [
            {
                icon: 'fa-solid fa-triangle-exclamation',
                iconColor: 'text-red-500',
                bgColor: 'bg-red-50',
                borderColor: 'border-red-200',
                title: 'Critical Student Concerns',
                text: `<div class="space-y-2">
                    <div class="bg-white/50 p-3 rounded-lg">
                        <div class="font-semibold text-red-700 mb-1">At-Risk Students (5 total)</div>
                        <div class="text-xs space-y-1">
                            <div>&bull; Maria Santos: Gen Math (72%)</div>
                            <div>&bull; Juan Dela Cruz: Programming (68%)</div>
                            <div>&bull; Ana Reyes: Empowerment Tech (71%)</div>
                        </div>
                    </div>
                    <div class="bg-white/30 p-3 rounded-lg">
                        <div class="font-semibold text-red-600 mb-1">Immediate Actions Required</div>
                        <div class="text-xs space-y-1">
                            <div>&bull; Schedule parent-teacher conferences</div>
                            <div>&bull; Arrange tutoring for Programming</div>
                            <div>&bull; Monitor progress weekly</div>
                        </div>
                    </div>
                </div>`
            },
            {
                icon: 'fa-solid fa-user-shield',
                iconColor: 'text-amber-600',
                bgColor: 'bg-amber-50',
                borderColor: 'border-amber-200',
                title: 'Behavioral & Participation',
                text: `<div class="space-y-3">
                    <div class="bg-white/50 p-3 rounded-lg">
                        <div class="font-semibold text-amber-700 mb-2">Engagement Drop: -15%</div>
                        <div class="text-xs space-y-1">
                            <div>&bull; 4 students consistently silent in class</div>
                            <div>&bull; Reduced participation in forum discussions</div>
                            <div>&bull; Late logins to LMS recorded for 6 students</div>
                        </div>
                    </div>
                    <div class="bg-white/30 p-3 rounded-lg">
                        <div class="font-semibold text-amber-600 mb-1">Suggested Outreach</div>
                        <div class="text-xs">Individual check-ins during advisory hour recommended.</div>
                    </div>
                </div>`
            },
            {
                icon: 'fa-solid fa-file-circle-exclamation',
                iconColor: 'text-orange-600',
                bgColor: 'bg-orange-50',
                borderColor: 'border-orange-200',
                title: 'Submission Trends',
                text: `<div class="space-y-3">
                    <div class="bg-white/50 p-3 rounded-lg">
                        <div class="font-semibold text-orange-700 mb-2">Missing Lab Exercises</div>
                        <div class="text-xs space-y-1">
                            <div>&bull; Lab #4: 8 students have not submitted</div>
                            <div>&bull; Quiz #2: 3 students missed deadline</div>
                        </div>
                    </div>
                    <div class="bg-white/30 p-3 rounded-lg">
                        <div class="font-semibold text-orange-600 mb-1">Auto-Reminders</div>
                        <div class="text-xs">SIGMA has drafted reminders for these students. Review and send?</div>
                    </div>
                </div>`
            },
            {
                icon: 'fa-solid fa-chart-line',
                iconColor: 'text-green-500',
                bgColor: 'bg-green-50',
                borderColor: 'border-green-200',
                title: 'Section Performance Alert',
                text: `<div class="space-y-3">
                    <div class="bg-white/50 p-3 rounded-lg">
                        <div class="font-semibold text-green-700 mb-2">Performance Drop: -8% GPA</div>
                        <div class="grid grid-cols-2 gap-2 text-xs">
                            <div>&bull; Database normalization: 45% errors</div>
                            <div>&bull; CSS Grid layouts: 38% incomplete</div>
                        </div>
                    </div>
                    <div class="bg-white/30 p-3 rounded-lg">
                        <div class="font-semibold text-green-600 mb-2">Recommended Interventions</div>
                        <div class="text-xs space-y-1">
                            <div>&bull; Schedule review sessions</div>
                            <div>&bull; Provide practice materials</div>
                            <div>&bull; One-on-one consultations</div>
                        </div>
                    </div>
                </div>`
            },
            {
                icon: 'fa-solid fa-person-chalkboard',
                iconColor: 'text-blue-500',
                bgColor: 'bg-blue-50',
                borderColor: 'border-blue-200',
                title: 'Teaching Intervention Needed',
                text: `<div class="space-y-3">
                    <div class="bg-white/50 p-3 rounded-lg">
                        <div class="font-semibold text-blue-700 mb-2">Learning Gap: OOP Concepts</div>
                        <div class="text-xs space-y-1">
                            <div>&bull; 12 students affected</div>
                            <div>&bull; Inheritance: 65% struggling</div>
                            <div>&bull; Polymorphism: 58% incomplete</div>
                        </div>
                    </div>
                    <div class="bg-white/30 p-3 rounded-lg">
                        <div class="font-semibold text-blue-600 mb-2">Implementation Plan</div>
                        <div class="text-xs space-y-1">
                            <div>&bull; Peer tutoring program</div>
                            <div>&bull; Interactive coding exercises</div>
                            <div>&bull; Visual learning aids</div>
                        </div>
                    </div>
                </div>`
            },
            {
                icon: 'fa-solid fa-calendar-check',
                iconColor: 'text-orange-500',
                bgColor: 'bg-orange-50',
                borderColor: 'border-orange-200',
                title: 'Attendance & Engagement',
                text: `<div class="space-y-3">
                    <div class="bg-white/50 p-3 rounded-lg">
                        <div class="font-semibold text-orange-700 mb-2">Attendance Issues</div>
                        <div class="text-xs space-y-1">
                            <div>&bull; Carlo Mendoza: 3 consecutive days</div>
                            <div>&bull; Sofia Garcia: 2 consecutive days</div>
                            <div>&bull; Assignment submissions: -15%</div>
                        </div>
                    </div>
                    <div class="bg-white/30 p-3 rounded-lg">
                        <div class="font-semibold text-orange-600 mb-2">Follow-up Actions</div>
                        <div class="text-xs space-y-1">
                            <div>&bull; Contact parents immediately</div>
                            <div>&bull; Provide catch-up materials</div>
                            <div>&bull; Monitor engagement patterns</div>
                        </div>
                    </div>
                </div>`
            },
            {
                icon: 'fa-solid fa-brain',
                iconColor: 'text-purple-500',
                bgColor: 'bg-purple-50',
                borderColor: 'border-purple-200',
                title: 'Academic Progress Insights',
                text: `<div class="space-y-3">
                    <div class="bg-white/50 p-3 rounded-lg">
                        <div class="font-semibold text-purple-700 mb-2">Performance Trends</div>
                        <div class="text-xs space-y-1">
                            <div class="text-green-600">&check; 8 students improved in Web Dev (+12% avg)</div>
                            <div class="text-red-600">&#9888; 6 students showing burnout signs</div>
                            <div>&bull; Declining quiz scores despite attendance</div>
                        </div>
                    </div>
                    <div class="bg-white/30 p-3 rounded-lg">
                        <div class="font-semibold text-purple-600 mb-2">Support Recommendations</div>
                        <div class="text-xs space-y-1">
                            <div>&bull; Adjust workload distribution</div>
                            <div>&bull; Provide mental health resources</div>
                            <div>&bull; Implement progress check-ins</div>
                        </div>
                    </div>
                </div>`
            }
        ];

        let currentIndex = 0;

        function renderInsights() {
            wrapper.innerHTML = insights.map(insight => `
                <div class="flex-shrink-0 p-4" style="width: ${100 / insights.length}%">
                    <div class="p-6 rounded-xl border-l-4 ${insight.borderColor} ${insight.bgColor} h-full flex flex-col">
                        <div class="flex items-center gap-3 mb-4">
                            <div class="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0">
                                <i class="${insight.icon} ${insight.iconColor} text-base"></i>
                            </div>
                            <h4 class="font-bold text-gray-800 text-base leading-tight">${insight.title}</h4>
                        </div>
                        <div class="flex-1 text-sm text-gray-700 leading-relaxed whitespace-normal break-words space-y-3">
                            ${insight.text}
                        </div>
                        <div class="mt-4 pt-3 border-t border-white/30">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Priority</span>
                                <div class="flex items-center gap-1">
                                    <div class="w-2 h-2 rounded-full bg-red-400"></div>
                                    <div class="w-2 h-2 rounded-full bg-yellow-400"></div>
                                    <div class="w-2 h-2 rounded-full bg-green-400"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');

            // Set wrapper width for proper sliding
            wrapper.style.width = `${insights.length * 100}%`;

            dotsContainer.innerHTML = insights.map((_, i) => `
                <button class="w-2 h-2 rounded-full ${i === currentIndex ? 'bg-[#78350f]' : 'bg-gray-300'} transition-colors"></button>
            `).join('');

            // Add dot listeners
            dotsContainer.querySelectorAll('button').forEach((dot, i) => {
                dot.addEventListener('click', () => {
                    currentIndex = i;
                    updateCarousel();
                });
            });
        }

        function updateCarousel() {
            const translateX = -currentIndex * (100 / insights.length);
            wrapper.style.transform = `translateX(${translateX}%)`;
            // Update dots
            dotsContainer.querySelectorAll('button').forEach((dot, i) => {
                dot.className = `w-2 h-2 rounded-full ${i === currentIndex ? 'bg-[#78350f]' : 'bg-gray-300'} transition-colors`;
            });
        }

        prevBtn.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + insights.length) % insights.length;
            updateCarousel();
        });

        nextBtn.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % insights.length;
            updateCarousel();
        });

        renderInsights();
        updateCarousel();
    }

    // --- Attendance Calendar (Full-Screen Design) ---
    let attendanceCurrentDate = new Date(2026, 2, 27); // Default to March 27, 2026
    let attendanceOpenDateKey = '';

    window.closeAttendanceTimePanel = () => {
        const panel = document.getElementById('attendance-time-panel');
        if (panel) {
            panel.classList.add('hidden');
            panel.classList.remove('flex');
            panel.style.top = '';
            panel.style.left = '';
        }
        attendanceOpenDateKey = '';
    };

    window.stepAttendanceSelect = (selectId, direction) => {
        const select = document.getElementById(selectId);
        if (!select) return;

        const nextIndex = select.selectedIndex + direction;
        if (nextIndex < 0 || nextIndex >= select.options.length) return;

        select.selectedIndex = nextIndex;
        select.dispatchEvent(new Event('change'));
    };

    function setupAttendanceCalendar() {
        const yearSelect = document.getElementById('attendance-year-select');
        const monthSelect = document.getElementById('attendance-month-select');
        const todayBtn = document.getElementById('attendance-today-btn');
        const calendarGrid = document.getElementById('attendance-full-calendar-grid');
        const calendarShell = document.getElementById('attendance-calendar-shell');
        const timePanel = document.getElementById('attendance-time-panel');

        if (!yearSelect || !monthSelect || !calendarGrid || !calendarShell) return;

        function renderCalendar() {
            const year = parseInt(yearSelect.value);
            const month = parseInt(monthSelect.value);

            calendarGrid.innerHTML = '';

            // Get first day and total days in month
            const firstDayOfMonth = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            // Calculate total visible cells first to determine last rows
            const totalCells = firstDayOfMonth + daysInMonth;
            const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
            const totalVisibleCells = totalCells + remainingCells;

            // Render leading empty slots before the first day of the month
            for (let i = 0; i < firstDayOfMonth; i++) {
                const colIndex = i % 7;
                const isLastRow = i >= totalVisibleCells - 7;
                renderEmptyDayCell(colIndex, isLastRow);
            }

            // Render Current Month's days
            for (let i = 1; i <= daysInMonth; i++) {
                const dayIndex = firstDayOfMonth + i - 1;
                const colIndex = dayIndex % 7;
                const isLastRow = dayIndex >= totalVisibleCells - 7;
                const isToday = i === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
                renderDayCell(i, true, 'current', isToday, colIndex, isLastRow);
            }

            // Fill remaining cells
            for (let i = 1; i <= remainingCells; i++) {
                const dayIndex = totalCells + i - 1;
                const colIndex = dayIndex % 7;
                const isLastRow = dayIndex >= totalVisibleCells - 7;
                renderEmptyDayCell(colIndex, isLastRow);
            }

            const totalVisibleCellsMath = totalCells + remainingCells;
            const totalWeeks = Math.max(1, totalVisibleCellsMath / 7);

            requestAnimationFrame(() => {
                const shellHeight = calendarShell.clientHeight;
                const headerRow = calendarShell.querySelector('.grid.grid-cols-7.border-b');
                const headerHeight = headerRow ? headerRow.offsetHeight : 0;

                // Maximize height to absolute bottom
                const availableGridHeight = Math.max(280, shellHeight - headerHeight);
                const weekRowHeight = Math.floor(availableGridHeight / totalWeeks);

                calendarGrid.style.gridTemplateRows = `repeat(${totalWeeks}, ${weekRowHeight}px)`;
                calendarGrid.style.height = `${availableGridHeight}px`; // Force exact fit
                calendarGrid.style.backgroundColor = 'white';
                calendarGrid.style.gap = '0'; // No gap, we use borders

                calendarGrid.style.gridTemplateColumns = "";
                calendarGrid.style.justifyContent = "";
                if (headerRow) {
                    headerRow.style.gridTemplateColumns = "";
                    headerRow.style.justifyContent = "";
                    headerRow.style.gap = "0";
                }
            });
        }

        function renderEmptyDayCell(colIndex = 0, isLastRow = false) {
            const cell = document.createElement('div');
            cell.className = 'min-h-0 h-full p-3 bg-white border-r border-b border-black';
            calendarGrid.appendChild(cell);
        }

        function renderDayCell(day, isCurrentMonth, type, isToday = false, colIndex = 0, isLastRow = false) {
            const cell = document.createElement('div');
            cell.className = `min-h-0 h-full p-3 cursor-pointer flex flex-col gap-2 group border-r border-b border-black ${isToday ? 'bg-icc' : 'bg-white'}`;

            const selectedYear = yearSelect.value;
            const selectedMonth = monthSelect.value;
            const dateStr = `${monthSelect.options[monthSelect.selectedIndex].text} ${day}, ${selectedYear}`;
            const dateKey = `${selectedYear}-${selectedMonth}-${day}-${type}`;

            cell.innerHTML = `
                <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-black ${isToday ? 'text-white' : 'text-black group-hover:text-icc-yellow'} transition-colors">${day}</span>
                </div>
            `;

            cell.onclick = () => {
                attendanceOpenDateKey = dateKey;
            };

            calendarGrid.appendChild(cell);
        }

        yearSelect.onchange = renderCalendar;
        monthSelect.onchange = renderCalendar;

        todayBtn.onclick = () => {
            const today = new Date();
            yearSelect.value = today.getFullYear();
            monthSelect.value = today.getMonth();
            renderCalendar();
        };

        window.addEventListener('resize', renderCalendar);

        // Initialize to current month/year
        const todayOnLoad = new Date();
        yearSelect.value = todayOnLoad.getFullYear();
        monthSelect.value = todayOnLoad.getMonth();

        renderCalendar();
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

    window.hideHeaderOverlays = function (exceptDropdown = null, exceptToggle = null, isOutsideClick = false) {
        const dropdowns = [
            { toggle: calendarToggle, menu: calendarDropdown },
            { toggle: notiToggle, menu: notiDropdown },
            { toggle: profileDropdownBtn, menu: profileDropdownMenu }
        ];

        dropdowns.forEach(d => {
            if (d.menu && d.menu !== exceptDropdown) {
                d.menu.classList.add('hidden');
                // Reset icon colors if applicable
                if (d.toggle === profileDropdownBtn) {
                    const icon = d.toggle.querySelector('.fa-chevron-down');
                    if (icon) icon.classList.replace('text-[#FFD000]', 'text-slate-400');
                }
            }
        });

        if (isOutsideClick) {
            // Optional: additional logic for outside clicks
        }
    }

    function setupDropdown(toggle, menu) {
        if (!toggle || !menu) return;
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = menu.classList.contains('hidden');
            hideHeaderOverlays(menu, toggle, true);
            menu.classList.toggle('hidden', !isHidden);

            // Handle specific icon color changes for profile dropdown
            if (toggle === profileDropdownBtn) {
                const icon = toggle.querySelector('.fa-chevron-down');
                if (icon) {
                    if (isHidden) { // menu was hidden, now opening
                        icon.classList.replace('text-slate-400', 'text-[#FFD000]');
                    } else { // menu was open, now closing
                        icon.classList.replace('text-[#FFD000]', 'text-slate-400');
                    }
                }
            }
            syncHeaderToggleState();
        });
        menu.addEventListener('click', e => e.stopPropagation());
    }

    // Setup all Header Dropdowns
    setupDropdown(calendarToggle, calendarDropdown);
    setupDropdown(notiToggle, notiDropdown);

    setupDropdown(profileDropdownBtn, profileDropdownMenu);

    function renderTeacherNotificationPanels() {
        const notifications = [
            { icon: 'fa-file-arrow-up', tone: 'text-icc', label: 'New Submission', title: 'Juan Abad submitted Logic Gates Quiz', body: 'Grade 11 - ICT A submitted a new assessment at 10:45 AM.' },
            { icon: 'fa-bullhorn', tone: 'text-blue-600', label: 'Admin Announcement', title: 'Faculty coordination update', body: 'Administrator Jubileen Gonzales posted a new institutional announcement.' },
            { icon: 'fa-hourglass-half', tone: 'text-red-600', label: 'Pending Due Submissions', title: '8 submissions still pending', body: 'Programming 1 activities need follow-up before the deadline closes.' }
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

    renderTeacherNotificationPanels();



    // Close dropdowns on outside click
    window.addEventListener('click', () => {
        if (suppressNextHeaderClose) return;
        hideHeaderOverlays(null, null, true);
    });

    // --- Daily Schedule / Notifications ---
    const dailySchedule = [
        { time: '08:00', endTime: '09:30', subject: 'Programming 1', section: 'Grade 11 - ICT A', room: 'Lab 1' },
        { time: '10:30', endTime: '12:00', subject: 'Empowerment Tech', section: 'Grade 11 - HUMSS B', room: 'Room 304' },
        { time: '13:30', endTime: '15:00', subject: 'Programming 1', section: 'Grade 11 - ICT B', room: 'Lab 2' }
    ];
    const upcomingAssessmentItems = [
        { title: 'Quiz 4 &bull; Programming 1', when: 'Due Today &bull; 11:59 PM', status: 'Due' },
        { title: 'Lab Activity 3 &bull; Empowerment Tech', when: 'Apr 11 &bull; 10:00 AM', status: 'Upcoming' },
        { title: 'Performance Task &bull; Database Management', when: 'Apr 12 &bull; 3:00 PM', status: 'Upcoming' }
    ];

    function timeToMinutes(value) {
        if (!value) return 0;
        const [hour, minute] = value.split(':').map(Number);
        return (hour * 60) + minute;
    }

    function getUpcomingClasses(limit = 2) {
        if (typeof getTeacherUpcomingSectionClasses === 'function') {
            const sectionClasses = getTeacherUpcomingSectionClasses(limit);
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

    function renderCalendarDropdownSummary() {
        const classesWrap = document.getElementById('calendarDropdownUpcomingClassList');
        const assessmentsWrap = document.getElementById('calendarDropdownAssessmentList');
        if (!classesWrap || !assessmentsWrap) return;

        // Removed as per request to hide Next Class, Upcoming Class, and Submissions in dropdown
        classesWrap.innerHTML = '';
        assessmentsWrap.innerHTML = '';
    }

    renderCalendarDropdownSummary();



    // --- Topic Release Storage ---
    const topicStorage = [
        { id: 't1', title: 'Nature and Elements of Communication', quarter: 1 },
        { id: 't2', title: 'Functions of Communication', quarter: 1 },
        { id: 't3', title: 'Communication Models', quarter: 1 },
        { id: 't4', title: 'Functions and Their Graphs', quarter: 2 },
        { id: 't5', title: 'Rational Functions', quarter: 2 },
        { id: 't6', title: 'Simple and Compound Interest', quarter: 3 },
        { id: 't7', title: 'Stocks, Bonds, and Logic', quarter: 3 }
    ];

    let currentReleaseQuarter = 1;
    let releasedTopics = []; // Format: { id, topicId, topicTitle, type, quarter, section }
    let selectedTopicForRelease = null;
    let releaseMode = 'single'; // 'single' or 'batch'
    let batchSelected = []; // Array of types

    function getMaterialIcon(type) {
        switch (type) {
            case 'Handouts': return 'fa-file-lines';
            case 'Assignment': return 'fa-file-signature';
            case 'Quiz': return 'fa-file-circle-question';
            case 'Activity': return 'fa-file-pen';
            case 'Performance Task': return 'fa-file-video';
            default: return 'fa-file';
        }
    }

    function renderSubjectManagement(subject) {
        const container = document.getElementById('subject-management-content');
        if (!container) return;

        // Ensure the parent section doesn't have extra spacing and fits the screen
        const parentSection = container.closest('#section-subjects');
        if (parentSection) {
            parentSection.classList.remove('space-y-8');
            parentSection.style.height = 'calc(100vh - 80px)'; // Adjusted for top nav
            parentSection.style.overflow = 'hidden';
            parentSection.style.marginTop = '0';
            parentSection.style.paddingTop = '0';
            // Hide the default header to maximize space
            const header = parentSection.querySelector('div:first-child');
            if (header && !header.id) header.classList.add('hidden');
        }

        if (!subject) {
            container.innerHTML = `
                <div class="lg:col-span-4 flex flex-col items-center justify-center h-full bg-white rounded-none border border-dashed border-gray-200">
                    <i class="fa-solid fa-hand-pointer text-4xl text-gray-200 mb-4"></i>
                    <p class="text-gray-400 font-medium text-sm font-black uppercase tracking-widest">Select a subject from the sidebar</p>
                </div>
            `;
            return;
        }

        // Reset container classes for full height/width
        container.className = 'h-full w-full block';
        container.style.marginTop = '0';

        container.innerHTML = `
            <div class="h-full flex flex-col bg-white border border-gray-100 shadow-sm rounded-none overflow-hidden">
                <!-- Top Toolbar -->
                <div class="p-4 border-b border-gray-100 flex items-center bg-gray-50/50 flex-shrink-0">
                    <div class="relative w-48">
                        <select id="section-selector" class="w-full pl-4 pr-10 py-2 bg-white border border-gray-200 rounded-none text-[12px] font-bold text-gray-800 focus:outline-none focus:border-icc appearance-none cursor-pointer transition-all hover:bg-gray-50 shadow-sm">
                            <option value="" disabled selected>Select section...</option>
                            ${subject.sections.map(section => `<option value="${section}">${section}</option>`).join('')}
                        </select>
                        <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <i class="fa-solid fa-chevron-down text-gray-400 text-[9px]"></i>
                        </div>
                    </div>
                </div>

                <!-- Main Release Interface -->
                <div id="release-panel" class="flex-1 flex hidden overflow-hidden">
                    <!-- Left: Materials (Storage) -->
                    <div class="w-1/2 border-r border-gray-100 flex flex-col bg-[#F9FAFB]">
                        <div class="h-12 px-6 bg-white border-b border-gray-100 flex justify-between items-center flex-shrink-0">
                            <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Materials Storage</h4>
                            
                            <div class="flex items-center gap-3">
                                <!-- Top Level Release Button -->
                                <button id="top-release-btn" onclick="executeTopRelease()" class="w-8 h-8 bg-gray-50 text-gray-400 hover:bg-icc hover:text-white transition-all flex items-center justify-center shadow-sm opacity-50 cursor-not-allowed" disabled>
                                    <i class="fa-solid fa-paper-plane text-[12px]"></i>
                                </button>

                                <!-- Options Dropdown -->
                                <div class="relative">
                                    <button id="release-options-btn" class="text-[9px] font-black text-icc uppercase tracking-widest hover:underline flex items-center gap-1 leading-none">
                                        Release <i class="fa-solid fa-chevron-down text-[8px]"></i>
                                    </button>
                                    <div id="release-options-menu" class="hidden absolute right-0 top-full mt-2 w-36 bg-white border border-gray-100 shadow-xl z-30 rounded-none">
                                        <button onclick="setReleaseMode('single')" class="w-full text-left px-4 py-3 text-[10px] font-bold text-gray-700 hover:bg-gray-50 border-b border-gray-50 flex items-center justify-between">
                                            Release <i class="fa-solid fa-check text-[8px] text-icc ${releaseMode === 'single' ? '' : 'hidden'}"></i>
                                        </button>
                                        <button onclick="setReleaseMode('batch')" class="w-full text-left px-4 py-3 text-[10px] font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-between">
                                            Batch Release <i class="fa-solid fa-check text-[8px] text-icc ${releaseMode === 'batch' ? '' : 'hidden'}"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="flex-1 overflow-y-auto p-6" id="storage-container">
                            <div id="storage-list" class="space-y-4"></div>
                            <div id="release-options" class="hidden h-full flex flex-col -m-6">
                                <div class="h-12 px-6 border-b border-gray-100 flex items-center gap-3 flex-shrink-0 bg-white">
                                    <button id="back-to-storage" class="text-gray-400 hover:text-icc transition-colors"><i class="fa-solid fa-arrow-left text-xs"></i></button>
                                    <span id="selected-topic-title" class="text-xs font-bold text-gray-800 truncate"></span>
                                </div>
                                <div class="p-6 space-y-4 flex-1 overflow-y-auto bg-gray-50/50">
                                    <div id="options-list-header" class="mb-2">
                                        <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Select Materials</p>
                                    </div>
                                    <div id="options-list" class="space-y-4"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right: Quarter View (Released) -->
                    <div class="w-1/2 flex flex-col bg-[#F3F4F6]">
                        <div class="h-12 px-6 bg-white border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                            <button id="prev-quarter" class="text-gray-400 hover:text-icc transition-colors flex items-center justify-center"><i class="fa-solid fa-chevron-left text-[10px]"></i></button>
                            <h4 id="current-quarter-label" class="text-[10px] font-black text-icc uppercase tracking-widest leading-none">1st Quarter</h4>
                            <button id="next-quarter" class="text-gray-400 hover:text-icc transition-colors flex items-center justify-center"><i class="fa-solid fa-chevron-right text-[10px]"></i></button>
                        </div>
                        <div class="flex-1 overflow-y-auto p-6" id="released-container">
                            <div id="released-list" class="space-y-4"></div>
                        </div>
                    </div>
                </div>

                <!-- Initial Empty State -->
                <div id="release-empty-state" class="flex-1 flex flex-col items-center justify-center text-gray-300 bg-white">
                    <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <i class="fa-solid fa-layer-group text-2xl opacity-20"></i>
                    </div>
                    <p class="text-[11px] font-black text-gray-400 uppercase tracking-widest">Select a section to manage materials</p>
                </div>
            </div>
        `;

        // Logic for dropdown
        const optionsBtn = document.getElementById('release-options-btn');
        const optionsMenu = document.getElementById('release-options-menu');
        if (optionsBtn && optionsMenu) {
            optionsBtn.onclick = (e) => {
                e.stopPropagation();
                optionsMenu.classList.toggle('hidden');
            };
            window.addEventListener('click', () => {
                if (optionsMenu) optionsMenu.classList.add('hidden');
            });
        }

        // Re-attach logic
        const selector = document.getElementById('section-selector');
        const releasePanel = document.getElementById('release-panel');
        const emptyState = document.getElementById('release-empty-state');
        const backBtn = document.getElementById('back-to-storage');

        selector.onchange = () => {
            const section = selector.value;
            if (section) {
                releasePanel.classList.remove('hidden');
                emptyState.classList.add('hidden');
                selectedTopicForRelease = null;
                showStorageList(section);
                updateReleasedView(section);
            }
        };

        if (backBtn) {
            backBtn.onclick = () => {
                const section = selector.value;
                selectedTopicForRelease = null;
                batchSelected = [];
                showStorageList(section);
            };
        }
    }

    window.setReleaseMode = (mode) => {
        releaseMode = mode;
        const section = document.getElementById('section-selector')?.value;
        const optionsBtn = document.getElementById('release-options-btn');
        const topReleaseBtn = document.getElementById('top-release-btn');

        // Reset state when switching modes
        batchSelected = [];
        if (topReleaseBtn) {
            topReleaseBtn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-gray-50', 'text-gray-400');
            topReleaseBtn.classList.remove('bg-icc', 'text-white');
            topReleaseBtn.disabled = true;
        }

        if (optionsBtn) {
            const label = mode === 'batch' ? 'Batch Release' : 'Release';
            optionsBtn.innerHTML = `${label} <i class="fa-solid fa-chevron-down text-[8px]"></i>`;
        }

        if (section) {
            showStorageList(section);
            if (selectedTopicForRelease) {
                selectTopic(selectedTopicForRelease.id, section);
            }
        }
        // Update checkmarks in menu
        document.querySelectorAll('#release-options-menu i.fa-check').forEach((i, idx) => {
            if ((idx === 0 && mode === 'single') || (idx === 1 && mode === 'batch')) {
                i.classList.remove('hidden');
            } else {
                i.classList.add('hidden');
            }
        });
    };

    function showStorageList(section) {
        const storageList = document.getElementById('storage-list');
        const releaseOptions = document.getElementById('release-options');
        const topReleaseBtn = document.getElementById('top-release-btn');

        if (!storageList) return;

        storageList.parentElement.classList.remove('hidden');
        storageList.classList.remove('hidden');
        releaseOptions.classList.add('hidden');

        // Hide top release button when in topic list
        if (topReleaseBtn) topReleaseBtn.classList.add('hidden');

        // Filter topics: Only show topics that have AT LEAST ONE material NOT yet released for THIS quarter/section
        const materialTypes = ['Handouts', 'Assignment', 'Quiz', 'Activity', 'Performance Task'];
        const filteredTopics = topicStorage.filter(topic => {
            const existingReleases = releasedTopics.filter(rt => rt.topicId === topic.id && rt.section === section && rt.quarter === currentReleaseQuarter);
            return existingReleases.length < materialTypes.length;
        });

        storageList.innerHTML = filteredTopics.map(topic => `
            <div onclick="selectTopic('${topic.id}', '${section}')" class="p-4 bg-white border border-gray-100 hover:border-icc hover:bg-gray-50 cursor-pointer transition-all group flex items-center justify-between shadow-sm">
                <span class="text-sm font-bold text-gray-700 group-hover:text-icc">${topic.title}</span>
            </div>
        `).join('');
    }

    window.selectTopic = (topicId, section) => {
        const topic = topicStorage.find(t => t.id === topicId);
        selectedTopicForRelease = topic;
        batchSelected = [];

        const storageList = document.getElementById('storage-list');
        const releaseOptions = document.getElementById('release-options');
        const titleLabel = document.getElementById('selected-topic-title');
        const optionsList = document.getElementById('options-list');
        const topReleaseBtn = document.getElementById('top-release-btn');

        if (storageList) storageList.classList.add('hidden');
        if (releaseOptions) releaseOptions.classList.remove('hidden');
        if (titleLabel) titleLabel.textContent = topic.title;

        // Show and reset top release button
        if (topReleaseBtn) {
            topReleaseBtn.classList.remove('hidden');
            topReleaseBtn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-gray-50', 'text-gray-400');
            topReleaseBtn.classList.remove('bg-icc', 'text-white');
            topReleaseBtn.disabled = true;
        }

        // Only show materials NOT yet released for this topic in this quarter
        const materialTypes = ['Handouts', 'Assignment', 'Quiz', 'Activity', 'Performance Task'];
        const existingReleases = releasedTopics.filter(rt => rt.topicId === topicId && rt.section === section && rt.quarter === currentReleaseQuarter);
        const availableTypes = materialTypes.filter(type => !existingReleases.some(rt => rt.type === type));

        if (optionsList) {
            optionsList.innerHTML = availableTypes.map(type => `
                <div onclick="toggleMaterialSelection(this, '${type}')" class="flex items-center gap-3 p-4 bg-white border border-gray-100 hover:bg-gray-50 cursor-pointer transition-all group shadow-sm material-option-panel">
                    <div class="flex-1">
                        <span class="text-xs font-bold text-gray-700 group-hover:text-icc">${type}</span>
                    </div>
                </div>
            `).join('');
        }
    };

    window.toggleMaterialSelection = (el, type) => {
        if (!selectedTopicForRelease) {
            alert('Please choose a topic first.');
            return;
        }

        const topReleaseBtn = document.getElementById('top-release-btn');

        if (releaseMode === 'single') {
            // Deselect others
            document.querySelectorAll('.material-option-panel').forEach(p => p.classList.remove('bg-icc/5', 'border-icc'));
            batchSelected = [type];
            el.classList.add('bg-icc/5', 'border-icc');
        } else {
            // Toggle
            const index = batchSelected.indexOf(type);
            if (index > -1) {
                batchSelected.splice(index, 1);
                el.classList.remove('bg-icc/5', 'border-icc');
            } else {
                batchSelected.push(type);
                el.classList.add('bg-icc/5', 'border-icc');
            }
        }

        // Update button state
        if (topReleaseBtn) {
            if (batchSelected.length > 0) {
                topReleaseBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-gray-50', 'text-gray-400');
                topReleaseBtn.classList.add('bg-icc', 'text-white');
                topReleaseBtn.disabled = false;
            } else {
                topReleaseBtn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-gray-50', 'text-gray-400');
                topReleaseBtn.classList.remove('bg-icc', 'text-white');
                topReleaseBtn.disabled = true;
            }
        }
    };

    window.executeTopRelease = () => {
        if (!selectedTopicForRelease || batchSelected.length === 0) return;
        const section = document.getElementById('section-selector').value;

        batchSelected.forEach(type => {
            releasedTopics.push({
                id: Date.now() + Math.random(),
                topicId: selectedTopicForRelease.id,
                topicTitle: selectedTopicForRelease.title,
                type: type,
                quarter: currentReleaseQuarter,
                section: section
            });
        });

        batchSelected = [];
        updateReleasedView(section);
        showStorageList(section);
    };

    window.confirmRelease = (materialType) => {
        if (!selectedTopicForRelease) return;

        const section = document.getElementById('section-selector').value;
        // Direct release logic

        releasedTopics.push({
            id: Date.now(),
            topicId: selectedTopicForRelease.id,
            topicTitle: selectedTopicForRelease.title,
            type: materialType,
            quarter: currentReleaseQuarter,
            section: section
        });
        updateReleasedView(section);
        showStorageList(section);
    };

    function updateReleasedView(section) {
        const releasedList = document.getElementById('released-list');
        const quarterLabel = document.getElementById('current-quarter-label');

        if (!releasedList) return;

        const quarterNames = ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter'];
        if (quarterLabel) quarterLabel.textContent = quarterNames[currentReleaseQuarter - 1];

        const currentReleased = releasedTopics.filter(rt => rt.section === section && rt.quarter === currentReleaseQuarter);

        if (currentReleased.length === 0) {
            releasedList.innerHTML = `
                <div class="flex flex-col items-center justify-center py-20 text-gray-300">
                    <i class="fa-solid fa-inbox text-3xl mb-3 opacity-20"></i>
                    <p class="text-[10px] font-black uppercase tracking-widest">No materials released</p>
                </div>`;
        } else {
            // Group materials by topic
            const grouped = currentReleased.reduce((acc, item) => {
                if (!acc[item.topicTitle]) acc[item.topicTitle] = [];
                acc[item.topicTitle].push(item);
                return acc;
            }, {});

            releasedList.innerHTML = Object.entries(grouped).map(([topicTitle, materials]) => `
                <div class="flex flex-col bg-white border border-gray-100 shadow-sm rounded-none mb-4 animate-slide-down overflow-hidden">
                    <!-- Clickable Topic Header -->
                    <div class="p-4 border-b border-gray-50 bg-white flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-all" 
                         onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('i').classList.toggle('rotate-180')">
                        <span class="text-sm font-bold text-icc">${topicTitle}</span>
                        <i class="fa-solid fa-chevron-down text-[10px] text-gray-300 transition-transform"></i>
                    </div>
                    
                    <!-- Table Body (Hidden by default) -->
                    <div class="divide-y divide-gray-50 hidden">
                        ${materials.map(rt => `
                            <div class="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-all group/item">
                                <div class="flex items-center gap-4">
                                    <div class="w-2 h-2 rounded-full bg-green-500"></div>
                                    <span class="text-[13px] font-bold text-gray-700">${rt.type}</span>
                                </div>
                                <div class="flex items-center gap-4">
                                    <span class="text-[10px] font-black text-gray-300 uppercase tracking-widest">Released</span>
                                    <button onclick="removeReleased('${rt.id}', '${section}')" class="text-gray-200 hover:text-red-500 transition-colors opacity-0 group-hover/item:opacity-100">
                                        <i class="fa-solid fa-trash-can text-[10px]"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        }

        const prevBtn = document.getElementById('prev-quarter');
        const nextBtn = document.getElementById('next-quarter');
        if (prevBtn) prevBtn.onclick = () => { if (currentReleaseQuarter > 1) { currentReleaseQuarter--; updateReleasedView(section); showStorageList(section); } };
        if (nextBtn) nextBtn.onclick = () => { if (currentReleaseQuarter < 4) { currentReleaseQuarter++; updateReleasedView(section); showStorageList(section); } };
    }

    window.removeReleased = (id, section) => {
        releasedTopics = releasedTopics.filter(rt => rt.id.toString() !== id.toString());
        updateReleasedView(section);
    };

    // --- Gradebook Logic ---
    const GRADEBOOK_WEIGHTS_STORAGE_KEY = 'sigma-teacher-gradebook-weights';

    function loadGradebookWeights() {
        try {
            const raw = localStorage.getItem(GRADEBOOK_WEIGHTS_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            const ww = Number(parsed?.ww);
            const pt = Number(parsed?.pt);
            const qa = Number(parsed?.qa);
            const safe = {
                ww: Number.isFinite(ww) ? ww : 25,
                pt: Number.isFinite(pt) ? pt : 50,
                qa: Number.isFinite(qa) ? qa : 25
            };
            return safe;
        } catch {
            return { ww: 25, pt: 50, qa: 25 };
        }
    }

    function saveGradebookWeights(weights) {
        try {
            localStorage.setItem(GRADEBOOK_WEIGHTS_STORAGE_KEY, JSON.stringify(weights));
        } catch {
        }
    }

    let gradebookState = {
        currentQuarter: 1,
        currentView: 'overview', // 'overview' or 'assignment', 'quiz', etc.
        currentMode: 'quarters', // Default to quarters
        selectedSection: '',
        selectedSubject: '',
        weights: loadGradebookWeights(),
        isOuter: false
    };

    // Data storage for scores and statuses with persistence (Scoped by Subject)
    const SCORES_STORAGE_KEY = 'sigma-teacher-gradebook-scores-v2';
    const STATUSES_STORAGE_KEY = 'sigma-teacher-gradebook-statuses-v2';

    let gradebookScores = {}; // { subjectId: { quarter: { studentId: { category: { itemId: score } } } } }
    let gradebookStatuses = {}; // { subjectId: { quarter: { studentId: { category: { itemId: status } } } } }

    function loadGradebookData() {
        try {
            const s = localStorage.getItem(SCORES_STORAGE_KEY);
            const st = localStorage.getItem(STATUSES_STORAGE_KEY);
            if (s) gradebookScores = JSON.parse(s);
            if (st) gradebookStatuses = JSON.parse(st);
        } catch (e) {
            console.error('Failed to load gradebook data:', e);
        }
    }

    function saveGradebookData() {
        try {
            localStorage.setItem(SCORES_STORAGE_KEY, JSON.stringify(gradebookScores));
            localStorage.setItem(STATUSES_STORAGE_KEY, JSON.stringify(gradebookStatuses));
        } catch (e) {
            console.error('Failed to save gradebook data:', e);
        }
    }
    loadGradebookData();

    window.resetGradebookState = () => {
        gradebookState.selectedSection = '';
        gradebookState.selectedSubject = '';
        gradebookState.currentQuarter = 1;
        gradebookState.currentView = 'overview';
        const pickerSubjectLabel = document.getElementById('gradebook-picker-subject-label');
        const pickerSectionLabel = document.getElementById('gradebook-picker-section-label');
        if (pickerSubjectLabel) pickerSubjectLabel.textContent = 'Select Subject';
        if (pickerSectionLabel) pickerSectionLabel.textContent = 'Grade · Section';

        if (typeof renderGradebookSpreadsheet === 'function') {
            renderGradebookSpreadsheet();
        }
    };

    window.openGradebookWeightPicker = (anchorEl) => {
        let panel = document.getElementById('gradebook-weight-picker-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'gradebook-weight-picker-panel';
            panel.className = 'fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4 transition-opacity duration-200';
            document.body.appendChild(panel);

            const gradingSystems = [
                { label: 'Core subjects', ww: 25, pt: 50, qa: 25 },
                { label: 'Academic track — all other subjects', ww: 25, pt: 45, qa: 30 },
                { label: 'Academic track — work immersion / research / business enterprise simulation / exhibit / performance', ww: 0, pt: 100, qa: 0 },
                { label: 'TVL / Sports / Arts & Design — all other subjects', ww: 35, pt: 40, qa: 25 },
                { label: 'TVL / Sports / Arts & Design — work immersion / research / exhibit / performance', ww: 20, pt: 60, qa: 20 }
            ];

            window.selectGradebookWeights = (ww, pt, qa) => {
                const weights = { ww, pt, qa };
                gradebookState.weights = weights;
                if (typeof saveGradebookWeights === 'function') saveGradebookWeights(weights);
                document.getElementById('gradebook-weight-picker-panel').classList.add('hidden');
                if (typeof renderGradebookSpreadsheet === 'function') {
                    renderGradebookSpreadsheet();
                }
            };

            const modalContent = `
                <div class="bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden w-full max-w-[500px] flex flex-col" onclick="event.stopPropagation()">
                    <div class="px-5 pt-4 pb-3 border-b border-slate-100 flex justify-between items-center bg-gray-50">
                        <p class="text-[11px] font-black text-black uppercase tracking-widest">Select Component Weights</p>
                        <button class="text-gray-400 hover:text-red-500 transition-colors p-1" onclick="document.getElementById('gradebook-weight-picker-panel').classList.add('hidden')">
                            <i class="fa-solid fa-xmark text-[16px]"></i>
                        </button>
                    </div>
                    <div class="max-h-[60vh] overflow-y-auto divide-y divide-slate-50">
                        ${gradingSystems.map((sys) => `
                            <button type="button" 
                                    class="w-full px-5 py-4 flex flex-col items-start text-left hover:bg-slate-50 transition-colors group"
                                    onclick="window.selectGradebookWeights(${sys.ww}, ${sys.pt}, ${sys.qa})">
                                <span class="text-[13px] font-bold text-black leading-tight mb-2 group-hover:text-black">${sys.label}</span>
                                <div class="flex items-center gap-3">
                                    <span class="text-[10px] font-black text-black uppercase tracking-widest bg-gray-100 px-2 py-1 rounded">WW: ${sys.ww}%</span>
                                    <span class="text-[10px] font-black text-black uppercase tracking-widest bg-gray-100 px-2 py-1 rounded">PT: ${sys.pt}%</span>
                                    <span class="text-[10px] font-black text-black uppercase tracking-widest bg-gray-100 px-2 py-1 rounded">QA: ${sys.qa}%</span>
                                </div>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;

            panel.innerHTML = modalContent;

            // Close on background overlay click
            panel.addEventListener('mousedown', (e) => {
                if (e.target === panel) {
                    panel.classList.add('hidden');
                }
            });
        }

        panel.classList.remove('hidden');
    };

    function setupAnalyticsTab() {
        // Analytics Elements
        const avgGradeEl = document.getElementById('analytics-avg-grade');
        const avgGradeFill = document.getElementById('analytics-avg-grade-fill');
        const passingRateEl = document.getElementById('analytics-passing-rate');
        const passingRateFill = document.getElementById('analytics-passing-rate-fill');
        const riskList = document.getElementById('analytics-risk-list');
        const totalCountEl = document.getElementById('analytics-total-count');
        const strandEl = document.getElementById('analytics-active-strand');

        // Logic for Dynamic Data
        const students = gradebookStudents || [];
        totalCountEl.textContent = students.length || 0;

        // Calculate class average from gradebookScores if populated
        let totalAvg = 0;
        let studentsWithGrades = 0;
        let failingCount = 0;

        students.forEach(student => {
            // Simplified average calculation for simulation
            // In a real app, this would sum all categories from gradebookScores
            const mockGrade = 85 + Math.random() * 10;
            totalAvg += mockGrade;
            studentsWithGrades++;
            if (mockGrade < 75) failingCount++;
        });

        const classAvg = (studentsWithGrades > 0 ? (totalAvg / studentsWithGrades) : 88.4).toFixed(1);
        const passingRate = studentsWithGrades > 0 ? (((studentsWithGrades - failingCount) / studentsWithGrades) * 100).toFixed(0) : 92;

        // Update UI with smooth transitions
        if (avgGradeEl) avgGradeEl.textContent = `${classAvg}%`;
        if (avgGradeFill) avgGradeFill.style.width = `${classAvg}%`;
        if (passingRateEl) passingRateEl.textContent = `${passingRate}%`;
        if (passingRateFill) passingRateFill.style.width = `${passingRate}%`;

        // Render Risk List
        if (riskList) {
            const riskStudents = [
                { name: 'Juan Santos', risk: '85%', level: 'High Risk', class: 'bg-red-50', text: 'text-red-700', border: 'border-red-100', icon: 'bg-red-200' },
                { name: 'Carlo Diaz', risk: '42%', level: 'Medium Risk', class: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', icon: 'bg-amber-200' }
            ];

            riskList.innerHTML = riskStudents.map(s => `
                <div class="flex items-center justify-between p-3 ${s.class} rounded-xl border ${s.border}">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full ${s.icon} flex items-center justify-center ${s.text} font-bold text-xs">
                            ${s.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                            <p class="text-xs font-bold text-gray-800 leading-tight">${s.name}</p>
                            <p class="text-[9px] ${s.text.replace('700', '500')} font-bold uppercase mt-0.5">${s.level} (${s.risk})</p>
                        </div>
                    </div>
                    <button class="p-2 ${s.text.replace('700', '400')} hover:${s.text.replace('700', '600')} transition-colors">
                        <i class="fa-solid fa-envelope-circle-check"></i>
                    </button>
                </div>
            `).join('') + '<p class="text-[9px] text-gray-400 font-medium text-center italic mt-2">Risk factors: Recent quiz scores & Attendance patterns</p>';
        }
    }


    function getAllSubjectsRaw() {
        const data = window.subjectsData || {};
        return [
            ...(Array.isArray(data.core) ? data.core : []),
            ...(Array.isArray(data.academic) ? data.academic : []),
            ...(Array.isArray(data.techpro) ? data.techpro : [])
        ].filter(s => s && s.name);
    }

    function resetGradebookPage() {
        // Hide the quarter tabs (they show once a subject is selected)
        const tabs = document.getElementById('gradebook-quarter-tabs');
        if (tabs) tabs.classList.add('hidden');

        // Reset subject picker label back to "Select a Subject"
        const pickerSubjectLabel = document.getElementById('gradebook-picker-subject-label');
        const pickerSectionLabel = document.getElementById('gradebook-picker-section-label');
        if (pickerSubjectLabel) pickerSubjectLabel.textContent = 'Select a Subject';
        if (pickerSectionLabel) pickerSectionLabel.textContent = 'No section selected';

        // Clear the spreadsheet body and header
        const head = document.querySelector('#gradebook-spreadsheet thead');
        const body = document.getElementById('gradebook-body');
        if (head) head.innerHTML = '';
        if (body) body.innerHTML = `
            <tr>
                <td colspan="10" class="py-20 text-center">
                    <p class="text-[11px] font-black text-[#15803d] uppercase tracking-[0.25em]">Please select section and subject</p>
                </td>
            </tr>`;

        // Reset gradebook state
        gradebookState.selectedSubject = null;
        gradebookState.selectedSection = null;
        gradebookState.currentView = 'overview';
    }

    function initGradebook() {

        // Keep hidden selectors for any downstream code that reads them
        const sectionSelector = document.getElementById('gradebook-section-selector');
        const subjectSelector = document.getElementById('gradebook-subject-selector');
        const tabs = document.getElementById('gradebook-quarter-tabs');
        const pickerBtn = document.getElementById('gradebook-subject-picker-btn');
        const pickerSubjectLabel = document.getElementById('gradebook-picker-subject-label');
        const pickerSectionLabel = document.getElementById('gradebook-picker-section-label');
        const pickerChevron = document.getElementById('gradebook-picker-chevron');
        setupGradebookDragScroll();
        // setupGradebookSelection(); // Disabled legacy selection logic to prevent conflicts with targeted highlighting

        if (!pickerBtn) return;

        // ── Create the dropdown panel as a BODY-LEVEL portal ──────────────
        // This prevents it from being clipped by any overflow:auto ancestor.
        let panel = document.getElementById('gradebook-subject-picker-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'gradebook-subject-picker-panel';
            panel.className = 'hidden fixed w-[360px] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden';
            panel.style.cssText = 'z-index: 9999;';
            panel.innerHTML = `
                <div class="px-4 pt-3 pb-2 border-b border-slate-100">
                    <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Select Subject</p>
                </div>
                <div id="gradebook-subject-picker-list" class="max-h-[320px] overflow-y-auto divide-y divide-slate-50"></div>
            `;
            document.body.appendChild(panel);
        }
        const pickerList = panel.querySelector('#gradebook-subject-picker-list');

        // ── Populate list ──────────────────────────────────────────────────
        const populatePicker = () => {
            const all = getAllSubjectsRaw();
            const entries = [];
            all.forEach(sub => {
                const secs = Array.isArray(sub.sections) && sub.sections.length ? sub.sections : ['—'];
                secs.forEach(sec => {
                    entries.push({ id: sub.id, name: sub.name, grade: sub.grade || '', section: sec });
                });
            });
            entries.sort((a, b) => a.name.localeCompare(b.name));

            pickerList.innerHTML = entries.map(e => `
                <button
                    type="button"
                    class="gradebook-picker-item w-full px-4 py-3 flex flex-col items-start text-left hover:bg-slate-50 transition-colors"
                    onclick="window.selectGradebookSubject('${e.name.replace(/'/g, "\\'")}', '${e.section.replace(/'/g, "\\'")}', '${(e.grade || '').replace(/'/g, "\\'")}')"
                >
                    <span class="text-[13px] font-bold text-gray-800 leading-tight">${e.name}</span>
                    <span class="text-[10px] font-medium text-gray-400 mt-0.5">${e.grade ? e.grade + ' · ' : ''}${e.section}</span>
                </button>
            `).join('');
        };
        populatePicker();

        // ── Toggle: open anchored below the button ─────────────────────────
        const closePanel = () => {
            panel.classList.add('hidden');
            pickerChevron?.classList.remove('rotate-180');
        };

        window.toggleGradebookSubjectPicker = () => {
            if (!panel.classList.contains('hidden')) {
                closePanel();
                return;
            }
            // Position the panel fixed, below the button
            const rect = pickerBtn.getBoundingClientRect();
            panel.style.top = (rect.bottom + 6) + 'px';
            panel.style.right = (window.innerWidth - rect.right) + 'px';
            panel.style.left = 'auto';
            panel.classList.remove('hidden');
            pickerChevron?.classList.add('rotate-180');
        };

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!panel.contains(e.target) && e.target !== pickerBtn && !pickerBtn.contains(e.target)) {
                closePanel();
            }
        });

        // Reposition on scroll / resize so panel stays aligned
        window.addEventListener('scroll', (e) => {
            if (panel.contains(e.target)) return;
            if (!panel.classList.contains('hidden')) closePanel();
        }, true);
        window.addEventListener('resize', () => { if (!panel.classList.contains('hidden')) closePanel(); });

        // ── Selection handler ──────────────────────────────────────────────
        window.selectGradebookSubject = (subjectName, section, grade) => {
            if (pickerSubjectLabel) pickerSubjectLabel.textContent = subjectName;
            if (pickerSectionLabel) pickerSectionLabel.textContent = (grade ? grade + ' · ' : '') + section;
            closePanel();

            // Sync hidden selectors
            if (sectionSelector) {
                if (!sectionSelector.querySelector(`option[value="${section}"]`)) {
                    const opt = document.createElement('option');
                    opt.value = section; opt.textContent = section;
                    sectionSelector.appendChild(opt);
                }
                sectionSelector.value = section;
            }
            if (subjectSelector) {
                if (!subjectSelector.querySelector(`option[value="${subjectName}"]`)) {
                    const opt = document.createElement('option');
                    opt.value = subjectName; opt.textContent = subjectName;
                    subjectSelector.appendChild(opt);
                }
                subjectSelector.value = subjectName;
            }

            gradebookState.selectedSection = section;
            gradebookState.selectedSubject = subjectName;
            gradebookState.currentView = 'overview';
            gradebookState.currentQuarter = 1;
            
            // Auto-refresh the background Topic Content workstation if it's currently visible
            const topicContent = document.getElementById('section-topic-content');
            if (topicContent && !topicContent.classList.contains('hidden')) {
                let actualId = subjectName;
                const all = typeof getAllSubjectsRaw === 'function' ? getAllSubjectsRaw() : [];
                const found = all.find(s => s.name === subjectName || s.id === subjectName);
                if (found) actualId = found.id;
                
                if (typeof window.openTopicContent === 'function') {
                    // Switch to the new subject/section in the background workstation
                    // We set pushHistory to false to avoid cluttering the history stack
                    window.openTopicContent(actualId, 0, 'overview', 0, false);
                }
            }

            tabs?.classList.remove('hidden');
            updateGradebookTabLabels();
            setGradebookQuarter(1);
            resetGradebookScrollPosition();


        };
    }




    function setupGradebookDragScroll() {
        const scrollArea = document.getElementById('gradebook-scroll-area');
        if (!scrollArea || scrollArea.dataset.dragScrollBound === 'true') return;

        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let startScrollLeft = 0;
        let startScrollTop = 0;

        const endDrag = () => {
            isDragging = false;
            scrollArea.classList.remove('drag-scrolling');
        };

        scrollArea.addEventListener('mousedown', (event) => {
            if (event.button !== 0) return;
            if (event.target.closest('input, button, select, textarea, a, [draggable="true"]')) return;

            // Blur any active input to exit editing mode when clicking empty space
            if (document.activeElement && document.activeElement.tagName === 'INPUT') {
                document.activeElement.blur();
            }

            isDragging = true;
            startX = event.clientX;
            startY = event.clientY;
            startScrollLeft = scrollArea.scrollLeft;
            startScrollTop = scrollArea.scrollTop;
            scrollArea.classList.add('drag-scrolling');
            event.preventDefault();
        });

        scrollArea.addEventListener('mousemove', (event) => {
            if (!isDragging) return;

            const deltaX = event.clientX - startX;
            const deltaY = event.clientY - startY;
            scrollArea.scrollTop = startScrollTop - deltaY;

            if (scrollArea.scrollWidth > scrollArea.clientWidth) {
                scrollArea.scrollLeft = startScrollLeft - deltaX;
            }
        });

        scrollArea.addEventListener('mouseleave', endDrag);
        window.addEventListener('mouseup', endDrag);
        scrollArea.dataset.dragScrollBound = 'true';
    }

    function resetGradebookScrollPosition() {
        // Global page reset to top (Simulate refresh button)
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        const scrollArea = document.getElementById('gradebook-scroll-area');
        if (scrollArea) {
            scrollArea.scrollTop = 0;
            scrollArea.scrollLeft = 0;
        }
        clearGradebookSelection();

        // Brief flash to simulate refresh button feel
        const main = document.getElementById('main-content');
        if (main) {
            main.style.opacity = '0';
            requestAnimationFrame(() => {
                main.style.transition = 'opacity 0.1s ease-out';
                main.style.opacity = '1';
            });
        }
    }

    function clearGradebookSelection() {
        const body = document.getElementById('gradebook-body');
        const spreadsheet = document.getElementById('gradebook-spreadsheet');
        if (body) body.querySelectorAll('tr.gb-row-selected').forEach(row => row.classList.remove('gb-row-selected'));
        if (spreadsheet) spreadsheet.querySelectorAll('.gb-col-selected').forEach(c => c.classList.remove('gb-col-selected'));
    }

    function scrollToGradebookColumn(element) {
        const scrollArea = document.getElementById('gradebook-scroll-area');
        if (!scrollArea) return;
        const cell = element.closest('td, th');
        if (!cell || cell.classList.contains('sticky')) return;

        // The sticky student column is roughly 200px.
        const stickyWidth = 200;
        const cellLeft = cell.offsetLeft;

        scrollArea.scrollTo({
            left: cellLeft - stickyWidth,
            behavior: 'smooth'
        });
    }

    function setupGradebookSelection() {
        const spreadsheet = document.getElementById('gradebook-spreadsheet');
        if (!spreadsheet || spreadsheet.dataset.selectionBound === 'true') return;

        const body = document.getElementById('gradebook-body');
        if (!body) return;

        const clearSelection = () => {
            clearGradebookSelection();
        };

        const selectCell = (cell) => {
            if (!cell) return;
            const tr = cell.closest('tr');
            if (!tr || tr.classList.contains('placeholder-row')) return;

            const index = cell.cellIndex;

            clearSelection();

            // Select Row (only if it's a data row in the body)
            if (body.contains(tr)) {
                tr.classList.add('gb-row-selected');
            }

            // Select Column (include th in header and td in body, ignore index 0/Students)
            if (index > 0) {
                spreadsheet.querySelectorAll(`tr td:nth-child(${index + 1}), tr th:nth-child(${index + 1})`).forEach(c => {
                    c.classList.add('gb-col-selected');
                });
            }
        };

        // Handle focus (for inputs)
        spreadsheet.addEventListener('focusin', (e) => {
            const cell = e.target.closest('td, th');
            if (cell && body.contains(cell)) {
                selectCell(cell);

                // Auto-scroll when input is focused
                if (!cell.classList.contains('sticky')) {
                    scrollToGradebookColumn(e.target);
                }
            }
        });

        spreadsheet.addEventListener('mousedown', (e) => {
            const cell = e.target.closest('td, th');
            if (!cell) {
                clearSelection();
                return;
            }

            // Trigger selection logic
            selectCell(cell);

            // Auto-scroll to clicked column
            if (!cell.classList.contains('sticky')) {
                scrollToGradebookColumn(cell);
            }
        });

        // Global click-away to clear selection
        const handleOutsideClick = (e) => {
            // If click is outside the spreadsheet, clear highlights
            if (!spreadsheet.contains(e.target)) {
                clearSelection();
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);

        spreadsheet.dataset.selectionBound = 'true';
    }

    function getGradebookPeriodLabel() {
        const period = gradebookState.currentQuarter;
        const quarterLabels = ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter'];
        return quarterLabels[period - 1] || `Quarter ${period}`;
    }

    function updateGradebookTabLabels() {
        const labels = ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter'];

        for (let i = 1; i <= 4; i++) {
            const btn = document.getElementById(`quarter-btn-${i}`);
            if (btn) {
                btn.textContent = labels[i - 1];
                btn.classList.remove('hidden');
            }
        }
    }

    window.setGradebookQuarter = (quarter) => {
        gradebookState.currentQuarter = quarter;
        // Auto-reset view to overview when switching quarters for a "fresh" screen
        gradebookState.currentView = 'overview';

        // Update tab buttons
        for (let i = 1; i <= 4; i++) {
            const btn = document.getElementById(`quarter-btn-${i}`);
            if (btn) {
                if (i === quarter) {
                    btn.classList.add('bg-white', 'text-[#FFD000]', 'shadow-sm');
                    btn.classList.remove('text-black');
                } else {
                    btn.classList.remove('bg-white', 'text-[#FFD000]', 'shadow-sm');
                    btn.classList.add('text-black');
                }
            }
        }
        renderGradebookSpreadsheet();
        resetGradebookScrollPosition(); // This also clears selections
    };

    window.setGradebookView = (view) => {
        gradebookState.currentView = view;
        renderGradebookSpreadsheet();
        resetGradebookScrollPosition();
    };



    function renderGradebookSpreadsheet() {
        const isOuter = gradebookState.isOuter;
        const prefix = isOuter ? 'gradebook-outer-' : 'gradebook-';

        const section = gradebookState.selectedSection;
        const subject = gradebookState.selectedSubject;
        const body = document.getElementById(`${prefix}body`);
        const spreadsheet = document.getElementById(`${prefix}spreadsheet`);
        const tableHead = spreadsheet?.querySelector('thead');

        if (!section || !subject) {
            if (body) body.innerHTML = `<tr class="placeholder-row"><td colspan="10" class="py-20 text-center text-gray-400 text-xs font-medium uppercase tracking-widest">Please select section and subject</td></tr>`;
            if (tableHead) tableHead.innerHTML = '';
            return;
        }

        if (gradebookState.currentView === 'overview') {
            renderQuarterlyOverview(isOuter);
        } else if (gradebookState.currentView === 'ww-sub') {
            renderWWSubCategories(isOuter);
        } else {
            renderGradebookDetailView(gradebookState.currentView, isOuter);
        }

        // Apply refresh animation
        if (spreadsheet) {
            spreadsheet.classList.remove('gradebook-refresh-anim');
            void spreadsheet.offsetWidth; // Force reflow
            spreadsheet.classList.add('gradebook-refresh-anim');
        }
    }

    // --- Gradebook Highlighting & Navigation ---
    window.highlightGradebookColumn = function (index, isOuter = false) {
        const prefix = isOuter ? 'gradebook-outer-' : 'gradebook-';
        const table = document.getElementById(`${prefix}spreadsheet`);
        if (!table) return;

        // Clear previous
        table.querySelectorAll('.gb-col-selected').forEach(el => el.classList.remove('gb-col-selected'));

        if (index === -1) return;

        // Highlight cells in this column (excluding student column index 0)
        if (index === 0) return;

        table.querySelectorAll('tr').forEach(row => {
            const cell = row.cells[index];
            if (cell) cell.classList.add('gb-col-selected');
        });
    };

    window.highlightGradebookRow = function (row, isOuter = false) {
        const prefix = isOuter ? 'gradebook-outer-' : 'gradebook-';
        const table = document.getElementById(`${prefix}spreadsheet`);
        if (!table) return;

        // Clear previous
        table.querySelectorAll('.gb-row-selected').forEach(el => el.classList.remove('gb-row-selected'));

        if (row) {
            row.classList.add('gb-row-selected');
        }
    };

    window.clearGradebookHighlights = function (isOuter = false, forceClearRows = false) {
        const prefix = isOuter ? 'gradebook-outer-' : 'gradebook-';
        const table = document.getElementById(`${prefix}spreadsheet`);
        if (!table) return;
        table.querySelectorAll('.gb-col-selected').forEach(el => el.classList.remove('gb-col-selected'));
        if (forceClearRows) {
            table.querySelectorAll('.gb-row-selected').forEach(el => el.classList.remove('gb-row-selected'));
        }
    };

    window.initGradebookInteractions = function (isOuter = false) {
        const prefix = isOuter ? 'gradebook-outer-' : 'gradebook-';
        const container = document.getElementById(`${prefix}spreadsheet-container`);
        if (!container) return;
        
        // Prevent multiple initializations
        if (container._gbInteractionsInited) return;
        container._gbInteractionsInited = true;

        // Drag to Scroll — distinguish drag vs click by movement distance
        let isDown = false;
        let startX, startY;
        let scrollLeft, scrollTop;
        let hasDragged = false;
        const DRAG_THRESHOLD = 5; // px — below this = click, above = drag

        container.addEventListener('mousedown', (e) => {
            // Only allow left click
            if (e.button !== 0) return;
            if (e.target.tagName === 'INPUT' || e.target.closest('button') || e.target.closest('span[onclick]')) return;
            
            isDown = true;
            hasDragged = false;
            const rect = container.getBoundingClientRect();
            startX = e.pageX - rect.left;
            startY = e.pageY - rect.top;
            scrollLeft = container.scrollLeft;
            scrollTop = container.scrollTop;
            
            container.style.cursor = 'grabbing';
            document.body.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            
            const rect = container.getBoundingClientRect();
            const x = e.pageX - rect.left;
            const y = e.pageY - rect.top;
            const dx = Math.abs(x - startX);
            const dy = Math.abs(y - startY);

            if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
                hasDragged = true;
                e.preventDefault();
                container.scrollLeft = scrollLeft - (x - startX) * 2;
                container.scrollTop = scrollTop - (y - startY) * 2;
            }
        });

        window.addEventListener('mouseup', () => {
            if (!isDown) return;
            isDown = false;
            container.style.cursor = 'grab';
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        });

        // Only clear highlights on a real click (not end-of-drag)
        container.addEventListener('click', (e) => {
            if (hasDragged) {
                e.stopPropagation();
                hasDragged = false;
                return;
            }
            if (e.target.tagName !== 'INPUT') {
                clearGradebookHighlights(isOuter);
            }
        });

        container.style.cursor = 'grab';
    };

    window.anchorGradebookColumn = function (input) {
        const td = input.closest('td');
        const tr = input.closest('tr');
        const table = td.closest('table');
        const container = td.closest('div'); // The overflow container
        if (!td || !container || !table) return;

        const isOuter = table.id.includes('outer');

        // Selection Highlights
        highlightGradebookColumn(td.cellIndex, isOuter);
        highlightGradebookRow(tr, isOuter);


        // Snap to Student Column: selected cell should be immediately to the right of the sticky column
        const studentWidth = 200; // Width of the sticky student name column
        const targetScroll = td.offsetLeft - studentWidth;

        // Only scroll if we are not already in a good position or if it's a new selection
        container.scrollTo({ left: targetScroll, behavior: 'smooth' });
    };
    let isDraggingGradebook = false;
    let startY = 0;
    let startHeight = 0;

    function initGradebookDrag() {
        const handle = document.getElementById('gradebook-outer-drag-handle');
        const panel = document.getElementById('gradebook-outer-panel');
        if (!handle || !panel) return;

        handle.addEventListener('mousedown', (e) => {
            isDraggingGradebook = true;
            startY = e.clientY;
            startHeight = panel.offsetHeight;
            document.body.style.cursor = 'ns-resize';
            document.body.style.userSelect = 'none';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDraggingGradebook) return;
            const deltaY = startY - e.clientY;
            const newHeight = startHeight + deltaY;
            
            // Limit to at least 1/8 (12.5%) and at most 98%
            const minH = window.innerHeight * 0.125;
            const maxH = window.innerHeight * 0.98;
            
            const clampedHeight = Math.min(maxH, Math.max(minH, newHeight));
            panel.style.height = `${clampedHeight}px`;
        });

        window.addEventListener('mouseup', () => {
            if (isDraggingGradebook) {
                isDraggingGradebook = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }

    window.openGradebookOuterLayer = function (targetCategory = null, targetIndex = null, force = false) {
        // RESTRICTION: Only open the pull-up panel if we are in the Topic Content (Workstation) view
        // Skip this check when force=true (e.g. navigating here FROM the Gradebook)
        if (!force) {
            const topicSection = document.getElementById('section-topic-content');
            if (!topicSection || topicSection.classList.contains('hidden')) return;
        }

        const layer = document.getElementById('gradebook-outer-layer');
        if (!layer) return;

        const { subjectId, selectedSection } = currentTopicState;
        const subject = getTopicSubject(subjectId);
        
        // Sync Gradebook state
        gradebookState.selectedSubject = subjectId;
        gradebookState.selectedSection = selectedSection;
        
        if (targetCategory) {
            gradebookState.currentView = targetCategory;
        } else {
            gradebookState.currentView = 'overview'; 
        }
        
        gradebookState.isOuter = true; // Set outer mode

        // Update UI Labels
        const titleEl = document.getElementById('gradebook-outer-title');
        if (titleEl) titleEl.textContent = subject ? (subject.text || subject.name) : 'Gradebooks';

        layer.classList.remove('hidden');
        renderGradebookSpreadsheet();

        // Target Scrolling Logic
        if (targetIndex !== null && targetIndex !== undefined) {
            setTimeout(() => {
                const spreadsheet = document.getElementById('gradebook-outer-spreadsheet');
                const container = document.getElementById('gradebook-outer-spreadsheet-container');
                if (spreadsheet && container) {
                    // +2 because 1st column is students and nth-child is 1-based
                    const headerCell = spreadsheet.querySelector(`thead th:nth-child(${targetIndex + 2})`);
                    if (headerCell) {
                        const studentWidth = 200;
                        container.scrollTo({ left: headerCell.offsetLeft - studentWidth, behavior: 'smooth' });
                        highlightGradebookColumn(targetIndex + 1, true); // +1 because cellIndex 0 is students
                    }
                }
            }, 600);
        }

        // Initialize drag if not already done
        if (!window._gbDragInitialized) {
            initGradebookDrag();
            window._gbDragInitialized = true;
        }
    };

    window.closeGradebookOuterLayer = function () {
        const layer = document.getElementById('gradebook-outer-layer');
        if (layer) layer.classList.add('hidden');
        gradebookState.isOuter = false; // Reset outer mode
    };

    window.navigateToAssessmentFromGradebook = function (category, index) {
        const subjectId = gradebookState.selectedSubject;
        const section = gradebookState.selectedSection;
        
        if (!subjectId) {
            console.error('No subject selected in Gradebook');
            return;
        }

        // Get the items to find the specific topic and assessment index
        const items = getCategoryDetails(category);
        const item = items[index];
        if (!item) return;

        const topicIdx = item.topicIdx !== undefined ? item.topicIdx : 0;
        const itemIdx = item.itemIdx !== undefined ? item.itemIdx : 0;
        let tab = category;
        if (category === 'assignment') tab = 'assignments';
        if (category === 'perf. task') tab = 'performance';
        
        let actualSubjectId = item.subjectId || subjectId;
        
        // Ensure we always use the system ID ('core-1') rather than the name ('General Mathematics')
        if (typeof getAllSubjectsRaw === 'function') {
            const allSubjects = getAllSubjectsRaw();
            const foundSub = allSubjects.find(s => s.name === actualSubjectId || s.id === actualSubjectId);
            if (foundSub) {
                actualSubjectId = foundSub.id;
            }
        }
        // 1. Sync section state BEFORE jumping to ensure workstation loads correctly
        currentTopicState.selectedSection = section;
        currentTopicState.subjectId = actualSubjectId;
        
        if (typeof gradebookStudents !== 'undefined' && gradebookStudents.length > 0) {
            currentTopicState.selectedStudent = gradebookStudents[0].name;
        }
        
        // 2. Jump directly to the specific Topic and Assessment in the Workstation
        if (typeof window.openTopicContent === 'function') {
            const stateOverrides = {
                selectedSection: section,
                selectedStudent: '' // Let the workstation pick the first student automatically for consistency
            };
            if (typeof gradebookStudents !== 'undefined' && gradebookStudents.length > 0) {
                stateOverrides.selectedStudent = gradebookStudents[0].name;
            }
            window.openTopicContent(actualSubjectId, topicIdx, tab, itemIdx, true, stateOverrides);
        }

        // 3. Automatically open the outer layer panel and scroll to the relevant column
        if (typeof window.openGradebookOuterLayer === 'function') {
            window.openGradebookOuterLayer(category, index, true);
        }
    };

    window.setGradebookOuterQuarter = function (q) {
        gradebookState.currentQuarter = q;
        
        // Update UI tabs
        document.querySelectorAll('.gradebook-outer-q-btn').forEach(btn => {
            const btnQ = parseInt(btn.getAttribute('data-q'));
            if (btnQ === q) {
                btn.classList.add('bg-white', 'text-[#FFD000]', 'shadow-sm');
                btn.classList.remove('text-black');
            } else {
                btn.classList.remove('bg-white', 'text-[#FFD000]', 'shadow-sm');
                btn.classList.add('text-black');
            }
        });

        const subtitleEl = document.getElementById('gradebook-outer-subtitle');
        if (subtitleEl) {
            const parts = subtitleEl.textContent.split(' • ');
            subtitleEl.textContent = `${parts[0]} • Quarter ${q}`;
        }

        renderGradebookSpreadsheet();
    };

    // Extended Student List
    function getGradebookStudents() {
        const section = gradebookState.selectedSection;
        if (typeof studentsBySection !== 'undefined' && studentsBySection[section]) {
            return studentsBySection[section];
        }
        // Fallback to legacy demo data if section not found
        return [
            { id: '2601031', name: 'Aquino, Paolo' },
            { id: '2601032', name: 'Bautista, Elena' },
            { id: '2601033', name: 'Castro, Miguel' },
            { id: '2601034', name: 'Dela Cruz, Juan' },
            { id: '2601035', name: 'Domingo, Clara' },
            { id: '2601036', name: 'Estrada, Luis' },
            { id: '2601037', name: 'Fernando, Gina' },
            { id: '2601038', name: 'Garcia, Anna' },
            { id: '2601039', name: 'Guevarra, Rico' },
            { id: '2601040', name: 'Hernandez, Rosa' },
            { id: '2601041', name: 'Ibarra, Simon' },
            { id: '2601042', name: 'Javier, Teresa' },
            { id: '2601043', name: 'Mendoza, Carlo' },
            { id: '2601044', name: 'Reyes, Sofia' },
            { id: '2601045', name: 'Santos, Maria' }
        ].sort((a, b) => a.name.localeCompare(b.name));
    }

    function calculateCategoryPercentage(studentId, category) {
        let subjectId = gradebookState.selectedSubject;
        if (typeof getAllSubjectsRaw === 'function') {
            const found = getAllSubjectsRaw().find(s => s.name === subjectId || s.id === subjectId);
            if (found) subjectId = found.id;
        }

        const currentQ = gradebookState.currentQuarter;
        const studentScores = gradebookScores[subjectId]?.[currentQ]?.[studentId]?.[category];
        if (!studentScores) return null;

        const details = getCategoryDetails(category);
        let totalScore = 0;
        let totalMax = 0;
        let count = 0;

        details.forEach((item, index) => {
            const score = studentScores[index];
            if (score !== undefined && score !== null && score !== '') {
                totalScore += parseFloat(score);
                totalMax += item.max;
                count++;
            }
        });

        if (count === 0) return null;
        return ((totalScore / totalMax) * 100).toFixed(1);
    }

    function calculateCategoryTotalScore(studentId, category) {
        const studentScores = gradebookScores[gradebookState.currentQuarter]?.[studentId]?.[category];
        if (!studentScores) return null;

        const details = getCategoryDetails(category);
        let totalScore = 0;
        let hasAny = false;

        details.forEach((item, index) => {
            const score = studentScores[index];
            if (score !== undefined && score !== null && score !== '') {
                totalScore += parseFloat(score);
                hasAny = true;
            }
        });

        return hasAny ? Number(totalScore.toFixed(1)) : null;
    }

    function getAssessmentsForSubject(subjectId, category) {
        const data = getTopicData(subjectId);
        const quarterKey = `q${gradebookState.currentQuarter}Topics`;
        const topics = data ? data[quarterKey] : null;
        if (!topics) return [];

        const generated = [];
        const labels = {
            'assignment': 'Assignment',
            'quiz': 'Quiz',
            'activity': 'Activity',
            'perf. task': 'PT'
        };
        const label = labels[category] || category;

        topics.forEach((topic, tIdx) => {
            generated.push({
                title: `${label} #1: Introduction to ${topic.title}`,
                date: 'Mar 10, 2026',
                max: 100,
                subjectId: subjectId,
                topicIdx: tIdx,
                itemIdx: 0
            });
            generated.push({
                title: `${label} #2: Advanced concepts in ${topic.title}`,
                date: 'Mar 17, 2026',
                max: 100,
                subjectId: subjectId,
                topicIdx: tIdx,
                itemIdx: 1
            });
        });
        return generated;
    }

    const gradebookCategoryDetails = {
        1: {
            'assignment': [
                { title: 'Assignment #1: Course Overview', date: 'Mar 10, 2026', max: 100 },
                { title: 'Assignment #2: Basic Logic', date: 'Mar 15, 2026', max: 100 },
                { title: 'Assignment #3: Speech Context', date: 'Mar 22, 2026', max: 100 },
                { title: 'Assignment #4: Principles of Writing', date: 'Apr 02, 2026', max: 100 },
                { title: 'Assignment #5: Self-Assessment', date: 'Apr 09, 2026', max: 100 }
            ],
            'quiz': [
                { title: 'Quiz 1: Elements and Models', date: 'Mar 12, 2026', max: 100 },
                { title: 'Quiz 2: Communication Models', date: 'Mar 26, 2026', max: 100 }
            ],
            'activity': [
                { title: 'Activity #1: Introduction to Introduction', date: 'Mar 08, 2026', max: 100 },
                { title: 'Activity #2: Advanced concepts in Introduction', date: 'Mar 18, 2026', max: 100 }
            ],
            'perf. task': [
                { title: 'PT 1: Communication Project', date: 'Mar 20, 2026', max: 100 }
            ],
            'qa': [
                { title: 'Quarterly Assessment', date: 'Mar 30, 2026', max: 100 }
            ]
        },
        2: {
            'assignment': [
                { title: 'Assignment #1: Q2 Launch', date: 'Jun 10, 2026', max: 100 },
                { title: 'Assignment #2: Midterm Research', date: 'Jun 15, 2026', max: 100 },
                { title: 'Assignment #3: Applied Concepts', date: 'Jun 22, 2026', max: 100 }
            ],
            'quiz': [
                { title: 'Quiz 1: Q2 Fundamentals', date: 'Jun 12, 2026', max: 100 },
                { title: 'Quiz 2: Applied Logic', date: 'Jun 26, 2026', max: 100 }
            ],
            'activity': [
                { title: 'Activity #1: Group Discussion', date: 'Jun 08, 2026', max: 100 },
                { title: 'Activity #2: Field Work', date: 'Jun 18, 2026', max: 100 }
            ],
            'perf. task': [
                { title: 'PT 1: Midterm Project', date: 'Jun 20, 2026', max: 100 }
            ],
            'qa': [
                { title: '2nd Quarterly Exam', date: 'Jun 30, 2026', max: 100 }
            ]
        },
        3: {
            'assignment': [
                { title: 'Assignment #1: Advanced Study', date: 'Sep 10, 2026', max: 100 },
                { title: 'Assignment #2: Case Analysis', date: 'Sep 15, 2026', max: 100 }
            ],
            'quiz': [
                { title: 'Quiz 1: Advanced Topics', date: 'Sep 12, 2026', max: 100 },
                { title: 'Quiz 2: Specialized Concepts', date: 'Sep 26, 2026', max: 100 }
            ],
            'activity': [
                { title: 'Activity #1: Workshop', date: 'Sep 08, 2026', max: 100 },
                { title: 'Activity #2: Simulation', date: 'Sep 18, 2026', max: 100 }
            ],
            'perf. task': [
                { title: 'PT 1: Specialized Project', date: 'Sep 20, 2026', max: 100 }
            ],
            'qa': [
                { title: '3rd Quarterly Exam', date: 'Sep 30, 2026', max: 100 }
            ]
        },
        4: {
            'assignment': [
                { title: 'Assignment #1: Final Review', date: 'Dec 10, 2026', max: 100 },
                { title: 'Assignment #2: Portfolio Prep', date: 'Dec 15, 2026', max: 100 }
            ],
            'quiz': [
                { title: 'Quiz 1: Final Assessment', date: 'Dec 12, 2026', max: 100 },
                { title: 'Quiz 2: Year-end Review', date: 'Dec 26, 2026', max: 100 }
            ],
            'activity': [
                { title: 'Activity #1: Reflection', date: 'Dec 08, 2026', max: 100 },
                { title: 'Activity #2: Exhibition', date: 'Dec 18, 2026', max: 100 }
            ],
            'perf. task': [
                { title: 'PT 1: Graduation Project', date: 'Dec 20, 2026', max: 100 }
            ],
            'qa': [
                { title: 'Final Quarterly Exam', date: 'Dec 30, 2026', max: 100 }
            ]
        }
    };

    function getCategoryDetails(category) {
        // Dynamic connection: If a subject is selected in Gradebook, generate columns from topic data
        const subjectKey = gradebookState.selectedSubject;
        if (subjectKey) {
            const all = getAllSubjectsRaw();
            // Search by id first, then fall back to name match
            const sub = all.find(s => s.id === subjectKey) || all.find(s => s.name === subjectKey);
            if (sub) {
                const dynamic = getAssessmentsForSubject(sub.id, category);
                if (dynamic && dynamic.length > 0) return dynamic;
            }
        }
        return (gradebookCategoryDetails[gradebookState.currentQuarter] || {})[category] || [];
    }




    function isGradebookDateEditable(category) {
        return category === 'qa';
    }

    function toInputDateValue(value) {
        if (!value) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return '';

        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function toDisplayDateValue(value) {
        if (!value) return '';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

        const [year, month, day] = value.split('-').map(Number);
        const parsed = new Date(year, month - 1, day);
        return parsed.toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric'
        });
    }

    window.updateGradebookDate = (category, itemIndex, value) => {
        if (!gradebookCategoryDetails[category] || !gradebookCategoryDetails[category][itemIndex]) return;
        gradebookCategoryDetails[category][itemIndex].date = toDisplayDateValue(value);
    };

    function renderQuarterlyOverview(isOuter = false) {
        const prefix = isOuter ? 'gradebook-outer-' : 'gradebook-';
        const body = document.getElementById(`${prefix}body`);
        const avgEl = document.getElementById(`${prefix}avg`);
        const passingEl = document.getElementById(`${prefix}passing`);
        const spreadsheet = document.getElementById(`${prefix}spreadsheet`);
        const tableHead = spreadsheet?.querySelector('thead');
        if (!body || !tableHead) return;

        const nameTh = `
            <th class="w-48 px-6 py-4 text-[10px] font-black text-black uppercase tracking-widest text-left border-r border-gray-50 bg-white sticky left-0 z-40">
                Students
            </th>`;

        // Quarterly Categories (WW, PT, QA)
        const categories = [
            { id: 'ww-sub', key: 'ww', label: 'Written Works' },
            { id: 'pt', key: 'pt', label: 'Performance Task' },
            { id: 'qa', key: 'qa', label: 'Quarterly Assessment' }
        ];

        let headerHtml = nameTh;
        categories.forEach(cat => {
            const weightValue = Number(gradebookState.weights?.[cat.key]);
            const weightLabel = Number.isFinite(weightValue) ? weightValue : 0;
            headerHtml += `
                <th onclick="window.setGradebookView('${cat.id}')" 
                    class="w-40 px-2 py-4 text-[10px] font-black text-black uppercase tracking-widest text-center bg-gray-100 border-r border-gray-50 cursor-pointer hover:bg-gray-200 transition-colors group">
                    <div class="flex flex-col items-center gap-1.5">
                        <span class="group-hover:text-[#FFD000] transition-colors">${cat.label}</span>
                        <span
                            class="gradebook-weight text-black normal-case text-[12px] font-black tracking-tight cursor-pointer hover:underline"
                            role="button"
                            tabindex="0"
                            data-weight-key="${cat.key}"
                            onclick="event.stopPropagation();"
                        >${weightLabel}%</span>
                        <i class="fa-solid fa-chevron-right text-[7px] text-gray-300 group-hover:text-[#FFD000]"></i>
                    </div>
                </th>`;
        });

        headerHtml += `
            <th class="w-24 px-4 py-4 text-[10px] font-black text-[#FFD000] uppercase tracking-widest text-center bg-[#FFD000]/5 border-r border-[#FFD000]/10">Initial</th>
            <th class="w-24 px-4 py-4 text-[10px] font-black text-[#FFD000] uppercase tracking-widest text-center bg-[#FFD000]/10">Quarterly</th>
        `;

        tableHead.innerHTML = `<tr class="border-b border-gray-200">${headerHtml}</tr>`;
        initGradebookInteractions(isOuter);

        const weightsEls = tableHead.querySelectorAll('.gradebook-weight[data-weight-key]');
        weightsEls.forEach(el => {
            el.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (typeof window.openGradebookWeightPicker === 'function') {
                    window.openGradebookWeightPicker(event.currentTarget);
                }
            });
        });

        // Render Rows for Quarterly Mode
        body.innerHTML = getGradebookStudents().map((student, index) => {
            const wwPct = calculateWrittenWorksComponent(student.id);
            const ptPct = calculatePTPercentage(student.id);
            const qaPct = calculateQAPercentage(student.id);
            const initialGrade = calculateQuarterlyInitialGrade(student.id);

            return `
                <tr class="bg-gray-50/30 transition-colors group">
                    <td class="px-4 py-2 border-r border-gray-50 bg-white sticky left-0 z-10 transition-colors cursor-pointer hover:bg-gray-100" onclick="event.stopPropagation(); highlightGradebookRow(this.closest('tr'), ${isOuter}); if(typeof window.selectTopicStudent === 'function') window.selectTopicStudent('${student.name.replace(/'/g, "\\'")}');">
                        <p class="text-[12px] font-bold text-black whitespace-nowrap overflow-hidden text-ellipsis w-[160px]">${student.name}</p>
                        <p class="text-[8px] text-gray-400 font-medium uppercase tracking-widest">ID: ${student.id}</p>
                    </td>
                    <td class="px-2 py-2 text-center border-r border-gray-50 text-xs font-black cursor-pointer hover:bg-gray-100 transition-all ${wwPct ? 'text-blue-600' : 'text-black'}">${wwPct ? wwPct + '%' : '<span class="gradebook-dash">-</span>'}</td>
                    <td class="px-2 py-2 text-center border-r border-gray-50 text-xs font-black cursor-pointer hover:bg-gray-100 transition-all ${ptPct ? 'text-green-600' : 'text-black'}">${ptPct ? ptPct + '%' : '<span class="gradebook-dash">-</span>'}</td>
                    <td class="px-2 py-2 text-center border-r border-gray-50 text-xs font-black cursor-pointer hover:bg-gray-100 transition-all ${qaPct ? 'text-purple-600' : 'text-black'}">${qaPct ? qaPct + '%' : '<span class="gradebook-dash">-</span>'}</td>
                    
                    <td class="px-4 py-2 text-center bg-icc/5 border-r border-icc/10 text-xs font-black text-[#15803d] tracking-widest cursor-pointer hover:bg-green-50 transition-all">${initialGrade !== null ? formatInitialGrade(initialGrade) : '<span class="gradebook-dash">-</span>'}</td>
                    <td class="px-4 py-2 text-center bg-icc/10 text-xs font-black text-[#15803d] tracking-widest cursor-pointer hover:bg-green-100 transition-all">${initialGrade !== null ? formatFinalGrade(initialGrade) : '<span class="gradebook-dash">-</span>'}</td>
                </tr>
            `;
        }).join('');

        const quarterlyScores = getGradebookStudents().map(student => calculateQuarterlyInitialGrade(student.id)).filter(value => value !== null);
        if (avgEl) avgEl.textContent = quarterlyScores.length
            ? `${(quarterlyScores.reduce((sum, value) => sum + value, 0) / quarterlyScores.length).toFixed(1)}%`
            : '-';
        if (passingEl) passingEl.textContent = quarterlyScores.length
            ? `${Math.round((quarterlyScores.filter(value => value >= 75).length / quarterlyScores.length) * 100)}%`
            : '-';
    }

    function calculateWWTotalScore(studentId) {
        const cats = ['assignment', 'quiz', 'activity'];
        let totalScore = 0;
        let hasAnyScore = false;

        cats.forEach(cat => {
            const scores = gradebookScores[gradebookState.currentQuarter]?.[studentId]?.[cat];
            if (scores) {
                const details = getCategoryDetails(cat);
                details.forEach((item, index) => {
                    const score = scores[index];
                    if (score !== undefined && score !== null && score !== '') {
                        totalScore += parseFloat(score);
                        hasAnyScore = true;
                    }
                });
            }
        });

        return hasAnyScore ? totalScore : null;
    }

    function calculateWWPercentageScore(studentId) {
        const totalScore = calculateWWTotalScore(studentId);
        if (totalScore === null) return null;
        // Requested logic: total Written Works score divided by 100.
        const percentageScore = (totalScore / 100) * 100;
        return Math.max(0, Math.min(100, Number(percentageScore.toFixed(1))));
    }

    function calculateWrittenWorksComponent(studentId) {
        const percentageScore = calculateWWPercentageScore(studentId);
        if (percentageScore === null) return null;
        const wwWeight = Math.max(0, Math.min(100, Number(gradebookState.weights?.ww) || 0));
        return Number((percentageScore * (wwWeight / 100)).toFixed(1));
    }

    function calculatePTPercentage(studentId) {
        return calculateCategoryPercentage(studentId, 'perf. task');
    }

    function calculateQAPercentage(studentId) {
        return calculateCategoryPercentage(studentId, 'qa');
    }

    function calculateWeightedInitialGrade(parts) {
        let total = 0;
        let hasAnyScore = false;

        parts.forEach(part => {
            if (part.value !== null && part.value !== undefined && part.value !== '') {
                total += parseFloat(part.value) * part.weight;
                hasAnyScore = true;
            }
        });

        return hasAnyScore ? total : null;
    }

    function formatInitialGrade(value) {
        return value === null ? '-' : `${value.toFixed(1)}%`;
    }

    function formatFinalGrade(value) {
        return value === null ? '-' : `${Math.round(value)}%`;
    }

    function calculateQuarterlyInitialGrade(studentId) {
        const weights = gradebookState.weights || { ww: 25, pt: 50, qa: 25 };
        const ww = Math.max(0, Math.min(100, Number(weights.ww) || 0));
        const pt = Math.max(0, Math.min(100, Number(weights.pt) || 0));
        const qa = Math.max(0, Math.min(100, Number(weights.qa) || 0));
        return calculateWeightedInitialGrade([
            { value: calculateWWPercentageScore(studentId), weight: ww / 100 },
            { value: calculatePTPercentage(studentId), weight: pt / 100 },
            { value: calculateQAPercentage(studentId), weight: qa / 100 }
        ]);
    }

    function renderWWSubCategories(isOuter = false) {
        const prefix = isOuter ? 'gradebook-outer-' : 'gradebook-';
        const body = document.getElementById(`${prefix}body`);
        const spreadsheet = document.getElementById(`${prefix}spreadsheet`);
        const tableHead = spreadsheet?.querySelector('thead');
        if (!body || !tableHead) return;

        const subCats = [
            { id: 'assignment', label: 'Assignment', icon: 'fa-file-pen', color: 'text-blue-500' },
            { id: 'quiz', label: 'Quiz', icon: 'fa-vial', color: 'text-orange-500' },
            { id: 'activity', label: 'Activity', icon: 'fa-puzzle-piece', color: 'text-indigo-500' }
        ];

        let headerHtml = `
            <th class="w-48 px-6 py-4 text-[10px] font-black text-black uppercase tracking-widest text-left border-r border-gray-50 bg-white sticky left-0 z-20">
                <div class="flex items-center gap-2">
                    <button onclick="window.setGradebookView('overview')" class="w-8 h-8 rounded-full bg-[#15803d] flex items-center justify-center text-white hover:bg-[#116631] transition-colors">
                        <i class="fa-solid fa-chevron-left text-[11px]"></i>
                    </button>
                    <span>Students</span>
                </div>
            </th>`;

        subCats.forEach(cat => {
            const details = getCategoryDetails(cat.id);
            const includedItemIndexes = new Set();

            getGradebookStudents().forEach(student => {
                const scores = gradebookScores[gradebookState.currentQuarter]?.[student.id]?.[cat.id];
                if (!scores) return;
                details.forEach((item, index) => {
                    const value = scores[index];
                    if (value !== undefined && value !== null && value !== '') {
                        includedItemIndexes.add(index);
                    }
                });
            });

            const totalPerfectScore = Array.from(includedItemIndexes).reduce(
                (sum, index) => sum + (Number(details[index]?.max) || 0),
                0
            );

            headerHtml += `
                <th onclick="window.setGradebookView('${cat.id}')" 
                    class="w-40 px-2 py-4 text-[10px] font-black text-black uppercase tracking-widest text-center bg-gray-100 border-r border-gray-50 cursor-pointer hover:bg-gray-200 transition-colors group">
                    <div class="flex flex-col items-center gap-1.5">
                        <span class="group-hover:text-[#FFD000] transition-colors">${cat.label}</span>
                        <span class="normal-case text-[10px] font-extrabold tracking-normal text-gray-400">Max Score:${includedItemIndexes.size ? ` ${totalPerfectScore}` : ''}</span>
                    </div>
                </th>`;
        });

        headerHtml += `
            <th class="w-24 px-4 py-2 text-[9px] font-black text-icc uppercase tracking-widest text-center bg-icc/5 border-r border-icc/10">Percentage Score %</th>
        `;

        tableHead.innerHTML = `<tr class="border-b border-gray-200">${headerHtml}</tr>`;
        initGradebookInteractions(isOuter);

        // Render Rows
        body.innerHTML = gradebookStudents.map((student, index) => {
            const asgTotal = calculateCategoryTotalScore(student.id, 'assignment');
            const quizTotal = calculateCategoryTotalScore(student.id, 'quiz');
            const actTotal = calculateCategoryTotalScore(student.id, 'activity');
            const percentageScore = calculateWWPercentageScore(student.id);

            return `
                 <tr class="bg-gray-50/30 transition-colors group">
                     <td class="px-4 py-2 border-r border-gray-50 bg-white sticky left-0 z-10 transition-colors cursor-pointer hover:bg-gray-100" onclick="event.stopPropagation(); highlightGradebookRow(this.closest('tr'), ${isOuter}); if(typeof window.selectTopicStudent === 'function') window.selectTopicStudent('${student.name.replace(/'/g, "\\'")}');">
                         <p class="text-[12px] font-bold text-black whitespace-nowrap overflow-hidden text-ellipsis w-[160px]">${student.name}</p>
                         <p class="text-[8px] text-gray-400 font-medium uppercase tracking-widest">ID: ${student.id}</p>
                     </td>
                    <td class="px-2 py-2 text-center border-r border-gray-50 text-xs font-black cursor-pointer hover:bg-gray-100 transition-all ${asgTotal !== null ? 'text-blue-600' : 'text-black'}">${asgTotal !== null ? asgTotal : '<span class="gradebook-dash">-</span>'}</td>
                    <td class="px-2 py-2 text-center border-r border-gray-50 text-xs font-black cursor-pointer hover:bg-gray-100 transition-all ${quizTotal !== null ? 'text-orange-600' : 'text-black'}">${quizTotal !== null ? quizTotal : '<span class="gradebook-dash">-</span>'}</td>
                    <td class="px-2 py-2 text-center border-r border-gray-50 text-xs font-black cursor-pointer hover:bg-gray-100 transition-all ${actTotal !== null ? 'text-indigo-600' : 'text-black'}">${actTotal !== null ? actTotal : '<span class="gradebook-dash">-</span>'}</td>
                    <td class="px-4 py-2 text-center bg-icc/5 border-r border-icc/10 text-xs font-black cursor-pointer hover:bg-green-50 transition-all ${percentageScore !== null ? 'text-icc' : 'text-black'}">${percentageScore !== null ? percentageScore + '%' : '<span class="gradebook-dash">-</span>'}</td>
                 </tr>
            `;
        }).join('');
    }

    function renderGradebookDetailView(category, isOuter = false) {
        const prefix = isOuter ? 'gradebook-outer-' : 'gradebook-';
        if (!isOuter) document.getElementById('gradebook-drag-toolbar')?.classList.remove('hidden');
        
        const body = document.getElementById(`${prefix}body`);
        const spreadsheet = document.getElementById(`${prefix}spreadsheet`);
        const tableHead = spreadsheet?.querySelector('thead');
        if (!body || !tableHead) return;

        const detailCategory = category === 'pt' ? 'perf. task' : category;
        const items = getCategoryDetails(detailCategory);

        const isWWSub = ['assignment', 'quiz', 'activity'].includes(detailCategory);
        const backView = isWWSub ? 'ww-sub' : 'overview';

        const nameHeaderCell = `
            <th class="w-48 px-4 py-2 text-[10px] font-black text-black uppercase tracking-widest text-left border-r border-gray-50 bg-white sticky left-0 z-40 min-w-[200px]">
                <div class="flex items-center gap-5">
                    <button onclick="window.setGradebookView('${backView}')" class="bg-[#15803d] w-8 h-8 flex items-center justify-center rounded-full text-white hover:bg-[#116631] transition-all shadow-sm">
                        <i class="fa-solid fa-chevron-left text-[11px]"></i>
                    </button>
                    <div>
                        <p class="text-black font-black text-[10px]">Students</p>
                    </div>
                </div>
            </th>
        `;

        let headerHtml = `<tr class="border-b border-gray-200">${nameHeaderCell}`;

        items.forEach((item, idx) => {
            headerHtml += `
                <th class="w-[140px] min-w-[140px] max-w-[140px] px-2 py-2 text-[8px] font-black text-gray-400 uppercase tracking-widest text-center bg-white border-r border-gray-50">
                    <div class="flex flex-col items-center gap-1 w-full">
                        ${isGradebookDateEditable(detailCategory)
                    ? `<input type="date"
                                      value="${toInputDateValue(item.date)}"
                                      onkeydown="if(event.key === 'Enter') this.blur();"
                                      onchange="updateGradebookDate('${detailCategory}', ${items.indexOf(item)}, this.value)"
                                      class="w-full max-w-[122px] bg-transparent border-none text-[9px] font-black text-[#FFD000] tracking-widest text-center focus:ring-1 focus:ring-[#FFD000]/20 rounded outline-none">`
                    : `<span class="text-[9px] font-black text-[#FFD000] uppercase tracking-widest">${item.date}</span>`}
                        <span class="text-black text-[10px] font-bold cursor-pointer hover:text-[#FFD000] whitespace-normal break-words w-full" 
                              onclick="event.stopPropagation(); window.navigateToAssessmentFromGradebook('${detailCategory}', ${idx})">
                            ${item.title}
                        </span>
                        <span class="text-[8px] text-black font-bold mt-1">/${item.max}</span>
                    </div>
                </th>`;
        });

        // Add 10 empty placeholder columns for "Excel" feel
        for (let i = 0; i < 10; i++) {
            headerHtml += `<th class="w-[140px] min-w-[140px] max-w-[140px] bg-white border-r border-gray-50 gb-empty-cell"></th>`;
        }

        headerHtml += `</tr>`;
        tableHead.innerHTML = headerHtml;
        initGradebookInteractions(isOuter);

        // Render Rows
        body.innerHTML = getGradebookStudents().map((student, index) => `
            <tr class="bg-gray-50/30 transition-colors group">
                <td class="px-4 py-2 border-r border-gray-50 bg-white sticky left-0 z-10 transition-colors cursor-pointer hover:bg-gray-100" onclick="event.stopPropagation(); highlightGradebookRow(this.closest('tr'), ${isOuter}); if(typeof window.selectTopicStudent === 'function') window.selectTopicStudent('${student.name.replace(/'/g, "\\'")}');">
                    <p class="text-[12px] font-bold text-black whitespace-nowrap overflow-hidden text-ellipsis w-[160px]">${student.name}</p>
                    <p class="text-[8px] text-gray-400 font-medium uppercase tracking-widest">ID: ${student.id}</p>
                </td>
        ${items.map((item, idx) => {
            const subjectId = gradebookState.selectedSubject;
            const currentQ = gradebookState.currentQuarter;
            const savedScore = gradebookScores[subjectId]?.[currentQ]?.[student.id]?.[detailCategory]?.[idx] || '-';
            const savedStatus = gradebookStatuses[subjectId]?.[currentQ]?.[student.id]?.[detailCategory]?.[idx] || '';

            let statusClass = '';
            if (savedStatus === 'missing') statusClass = 'gradebook-status-missing';
            else if (savedStatus === 'incomplete') statusClass = 'gradebook-status-incomplete';
            else if (savedStatus === 'absent') statusClass = 'gradebook-status-absent';
            else if (savedStatus === 'excuse') statusClass = 'gradebook-status-excuse';

            return `
                        <td class="w-[140px] min-w-[140px] max-w-[140px] px-2 py-2 text-center border-r border-gray-50 transition-all duration-300 group ${statusClass}"
                            ondragover="handleGradebookDragOver(event)"
                            ondragleave="handleGradebookDragLeave(event)"
                            ondrop="handleGradebookDrop(event)">
                            <div class="flex flex-col items-center gap-1 pointer-events-none w-full">
                                <input type="number" placeholder="-" 
                                       value="${savedScore}"
                                       min="0"
                                       max="${item.max}"
                                       onfocus="anchorGradebookColumn(this);"
                                       onblur="/* Selection remains */"
                                       onkeydown="if(event.key === 'Enter') { clearGradebookHighlights(${isOuter}, true); this.blur(); }"
                                       oninput="enforceStudentScoreInput(this, '${detailCategory}', ${idx}); window.updateStudentScore('${student.id}', '${detailCategory}', ${idx}, this.value, '${student.name.replace(/'/g, "\\'")}')"
                                       onchange=""
                                       class="w-16 py-0.5 bg-transparent border-none text-[11px] font-bold text-center outline-none rounded transition-all hover:bg-gray-100 pointer-events-auto">
                                

                                <div class="status-group flex items-center justify-center gap-1 opacity-0 focus-within:opacity-100 transition-opacity pointer-events-auto">
                                    <button onclick="event.stopPropagation(); toggleStudentStatus(this, 'missing', '${student.id}', '${detailCategory}', ${idx})" title="Missing" class="status-btn w-6 h-6 rounded-full border border-transparent bg-gray-200 flex items-center justify-center text-[10px] text-black transition-all ${savedStatus === 'missing' ? 'active-status' : ''}">
                                        <i class="fa-solid fa-circle-xmark"></i>
                                    </button>
                                    <button onclick="event.stopPropagation(); toggleStudentStatus(this, 'incomplete', '${student.id}', '${detailCategory}', ${idx})" title="Incomplete" class="status-btn w-6 h-6 rounded-full border border-transparent bg-gray-200 flex items-center justify-center text-[10px] text-black transition-all ${savedStatus === 'incomplete' ? 'active-status' : ''}">
                                        <i class="fa-solid fa-circle-exclamation"></i>
                                    </button>
                                    <button onclick="event.stopPropagation(); toggleStudentStatus(this, 'absent', '${student.id}', '${detailCategory}', ${idx})" title="Absent" class="status-btn w-6 h-6 rounded-full border border-transparent bg-gray-200 flex items-center justify-center text-[10px] text-black transition-all ${savedStatus === 'absent' ? 'active-status' : ''}">
                                        <i class="fa-solid fa-user-slash"></i>
                                    </button>
                                    <button onclick="event.stopPropagation(); toggleStudentStatus(this, 'excuse', '${student.id}', '${detailCategory}', ${idx})" title="Excuse" class="status-btn w-6 h-6 rounded-full border border-transparent bg-gray-200 flex items-center justify-center text-[10px] text-black transition-all ${savedStatus === 'excuse' ? 'active-status' : ''}">
                                        <i class="fa-solid fa-file-signature"></i>
                                    </button>
                                </div>
                            </div>
                        </td>
                    `;
        }).join('')}
                ${Array(10).fill('<td class="min-w-[140px] border-r border-gray-50 gb-empty-cell"></td>').join('')}
            </tr>
        `).join('');
    }

    window.syncWorkstationScore = (studentId, category, itemIndex, value, studentName) => {
        const wsValue = document.getElementById('workstation-score-value');
        const wsStatus = document.getElementById('workstation-graded-status');
        if (!wsValue) return;

        // Auto-Follow Focus: Switch workstation focus to the student being graded
        const currentStudentName = currentTopicState.selectedStudent || '';
        if (studentName && currentStudentName !== studentName) {
            currentTopicState.selectedStudent = studentName;
            const btn = document.getElementById('topic-student-picker-btn');
            if (btn) {
                const span = btn.querySelector('span');
                if (span) span.textContent = studentName;
            }
        }

        // Context Matching: Ensure we are in the correct tab and assessment
        const workstationCategory = { 'assignments': 'assignment', 'quiz': 'quiz', 'activity': 'activity', 'performance': 'perf. task' }[currentTopicState.activeTab];
        if (workstationCategory !== category) return;

        const workstationGlobalIdx = (Number(currentTopicState.topicIdx) * 2) + Number(window._tcAssessmentDetailIdx);
        if (Number(itemIndex) !== workstationGlobalIdx) return;

        // Visual Update
        const normalizedValue = value === '' ? '0' : value;
        if (wsValue.tagName === 'INPUT') {
            wsValue.value = normalizedValue;
        } else {
            wsValue.textContent = normalizedValue;
        }

        const subjectId = currentTopicState.subjectId;
        const currentQ = gradebookState.currentQuarter;
        const savedStatus = gradebookStatuses[subjectId]?.[currentQ]?.[studentId]?.[category]?.[itemIndex];
        
        if (savedStatus && savedStatus !== '') {
            if (wsStatus) wsStatus.textContent = savedStatus.charAt(0).toUpperCase() + savedStatus.slice(1);
        } else {
            if (wsStatus) wsStatus.textContent = value !== '' ? 'Graded' : 'Not Graded';
        }

        // Subtly highlight the change
        wsValue.classList.add('text-yellow-500');
        setTimeout(() => wsValue.classList.remove('text-yellow-500'), 800);

        // Refresh Progress Panel if it exists
        const rail = document.getElementById('topic-contents-rail');
        if (rail) {
            const subjectData = getTopicData(currentTopicState.subjectId);
            if (subjectData) {
                const railContainer = rail.querySelector('.teacher-topic-progress-card')?.parentElement;
                if (railContainer) {
                    railContainer.innerHTML = _buildProgressRail(subjectData);
                }
            }
        }
    };

    window.updateStudentScoreFromWorkstation = (value) => {
        const { subjectId, topicIdx, selectedStudent, activeTab } = currentTopicState;
        if (!subjectId || !selectedStudent) return;

        const section = currentTopicState.selectedSection;
        const students = (typeof studentsBySection !== 'undefined' ? studentsBySection[section] : []) || [];
        const student = students.find(s => s.name === selectedStudent);
        if (!student) return;

        const categoryMap = { 'assignments': 'assignment', 'quiz': 'quiz', 'activity': 'activity', 'performance': 'perf. task' };
        const category = categoryMap[activeTab];
        if (!category) return;

        const itemIndex = (Number(topicIdx) * 2) + Number(window._tcAssessmentDetailIdx);

        // Standardize the update through the main handler
        window.updateStudentScore(student.id, category, itemIndex, value, student.name);
        
        // Visual feedback for the panel score
        const wsValue = document.getElementById('workstation-score-value');
        if (wsValue) {
            wsValue.classList.add('text-green-600');
            setTimeout(() => wsValue.classList.remove('text-green-600'), 500);
        }
    };

    window.updateStudentScore = (studentId, category, itemIndex, value, studentName) => {
        // Resolve subjectId: Always use the ID even if a name was passed
        let subjectId = gradebookState.selectedSubject || currentTopicState.subjectId;
        if (typeof getAllSubjectsRaw === 'function') {
            const all = getAllSubjectsRaw();
            const found = all.find(s => s.name === subjectId || s.id === subjectId);
            if (found) subjectId = found.id;
        }

        const currentQ = gradebookState.currentQuarter;

        // Initialize nested structure
        if (!gradebookScores[subjectId]) gradebookScores[subjectId] = {};
        if (!gradebookScores[subjectId][currentQ]) gradebookScores[subjectId][currentQ] = {};
        if (!gradebookScores[subjectId][currentQ][studentId]) gradebookScores[subjectId][currentQ][studentId] = {};
        if (!gradebookScores[subjectId][currentQ][studentId][category]) gradebookScores[subjectId][currentQ][studentId][category] = {};

        const itemMax = getCategoryDetails(category)?.[itemIndex]?.max || 100;
        const numericValue = value === '' ? '' : Number(value);
        const normalizedValue = value === ''
            ? ''
            : Math.min(itemMax, Math.max(0, numericValue));
        
        gradebookScores[subjectId][currentQ][studentId][category][itemIndex] = normalizedValue;
        saveGradebookData(); // SAVE AUTOMATICALLY TO LOCALSTORAGE

        // Sync with Workstation Panel
        window.syncWorkstationScore(studentId, category, itemIndex, normalizedValue, studentName);

        // Sync with Gradebook Spreadsheet (if visible)
        const prefix = gradebookState.isOuter ? 'gradebook-outer-' : 'gradebook-';
        const table = document.getElementById(prefix + 'spreadsheet');
        if (table) {
            // Find the row for this student and the column for this index
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach(tr => {
                const nameCell = tr.querySelector('td:first-child p:first-child');
                if (nameCell && nameCell.textContent.trim() === studentName) {
                    const inputs = tr.querySelectorAll('input[type="number"]');
                    // Find the input corresponding to the category being edited
                    // Note: This logic assumes only one category is shown in detail view
                    if (inputs[itemIndex]) {
                        inputs[itemIndex].value = normalizedValue;
                        inputs[itemIndex].classList.add('bg-green-50');
                        setTimeout(() => inputs[itemIndex].classList.remove('bg-green-50'), 500);
                    }
                }
            });
        }
    };




    window.enforceStudentScoreInput = (input, category, itemIndex) => {
        if (!input) return;

        const itemMax = getCategoryDetails(category)?.[itemIndex]?.max;
        if (input.value === '') return;

        const numericValue = Number(input.value);
        if (Number.isNaN(numericValue)) {
            input.value = '';
            return;
        }

        const normalizedValue = Math.min(itemMax ?? numericValue, Math.max(0, numericValue));
        input.value = normalizedValue;
    };

    window.calculateGrades = (input) => {
        // Logic to re-calculate row and summary stats
        const row = input.closest('tr');
        input.classList.add('bg-yellow-50');
        setTimeout(() => input.classList.remove('bg-yellow-50'), 1000);
    };

    window.saveGrades = () => {
        const btn = event.currentTarget;
        const originalContent = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch animate-spin mr-2"></i>Saving...';

        setTimeout(() => {
            btn.innerHTML = '<i class="fa-solid fa-check mr-2"></i>Changes Saved';
            btn.classList.add('bg-green-600');
            setTimeout(() => {
                btn.innerHTML = originalContent;
                btn.classList.remove('bg-green-600');
                btn.disabled = false;
            }, 2000);
        }, 1000);
    };

    window.exportGradebook = () => {
        alert('Gradebook data prepared for export to .xlsx format.');
    };

    window.toggleStudentStatus = (btn, type, studentId, category, itemIndex) => {
        const td = btn.closest('td');
        if (!td) return;

        const currentQ = gradebookState.currentQuarter;
        if (!gradebookStatuses[currentQ]) gradebookStatuses[currentQ] = {};
        if (!gradebookStatuses[currentQ][studentId]) gradebookStatuses[currentQ][studentId] = {};
        if (!gradebookStatuses[currentQ][studentId][category]) gradebookStatuses[currentQ][studentId][category] = {};

        const table = btn.closest('table');
        const isOuter = table && table.id.includes('outer');

        // Clear highlights
        if (typeof window.clearGradebookHighlights === 'function') {
            window.clearGradebookHighlights(isOuter, true);
        }
        
        const isActive = btn.classList.contains('active-status');

        // 1. Reset all buttons in this cell
        const statusGroup = td.querySelector('.status-group');
        td.querySelectorAll('.status-btn').forEach(b => {
            b.classList.remove('active-status');
            b.classList.add('text-black');
        });

        // 2. Reset cell UI
        td.classList.remove('gradebook-status-missing', 'gradebook-status-incomplete', 'gradebook-status-absent', 'gradebook-status-excuse');

        // 3. Save and Activate
        // 3. Save and Activate
        const subjectId = gradebookState.selectedSubject;
        if (!gradebookStatuses[subjectId]) gradebookStatuses[subjectId] = {};
        if (!gradebookStatuses[subjectId][currentQ]) gradebookStatuses[subjectId][currentQ] = {};
        if (!gradebookStatuses[subjectId][currentQ][studentId]) gradebookStatuses[subjectId][currentQ][studentId] = {};
        if (!gradebookStatuses[subjectId][currentQ][studentId][category]) gradebookStatuses[subjectId][currentQ][studentId][category] = {};

        if (!isActive) {
            gradebookStatuses[subjectId][currentQ][studentId][category][itemIndex] = type;
            btn.classList.add('active-status');
            btn.classList.remove('text-black');
            
            if (type === 'missing') {
                td.classList.add('gradebook-status-missing');
            } else if (type === 'incomplete') {
                td.classList.add('gradebook-status-incomplete');
            } else if (type === 'absent') {
                td.classList.add('gradebook-status-absent');
            } else if (type === 'excuse') {
                td.classList.add('gradebook-status-excuse');
            }
        } else {
            // Deactivate
            gradebookStatuses[subjectId][currentQ][studentId][category][itemIndex] = '';
        }

        saveGradebookData();

        // Sync with Workstation
        const currentScore = gradebookScores[subjectId]?.[currentQ]?.[studentId]?.[category]?.[itemIndex] || '';
        window.syncWorkstationScore(studentId, category, itemIndex, currentScore, '');

        // Hide icons again by blurring and removing forced opacity
        if (statusGroup) statusGroup.classList.remove('!opacity-100');
        btn.blur();
        document.activeElement?.blur();
    };
    function parseTime(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
    function formatTime12(t) { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; }

    function getScheduleStatus() {
        const now = new Date(), nowMins = now.getHours() * 60 + now.getMinutes();
        if (nowMins < parseTime(dailySchedule[0].time)) return { type: 'before', next: dailySchedule[0] };
        if (nowMins >= parseTime(dailySchedule[dailySchedule.length - 1].endTime)) return { type: 'done' };
        for (let i = 0; i < dailySchedule.length; i++) {
            const s = dailySchedule[i];
            if (nowMins >= parseTime(s.time) && nowMins < parseTime(s.endTime)) return { type: 'ongoing', current: s, next: dailySchedule[i + 1] || null };
            if (nowMins < parseTime(s.time)) return { type: 'between', next: s };
        }
        return { type: 'done' };
    }

    const featureNotifications = [
        { icon: 'fa-solid fa-users-rectangle', title: 'Advisory Alert', message: '3 students in Grade 11-ICT A are at risk of failing.', nav: 'nav-advisory' },
        { icon: 'fa-solid fa-calendar-check', title: 'Gradebook Sync', message: 'Quarter 1 grades have been successfully synced to the registrar.', nav: 'nav-grades' },
        { icon: 'fa-solid fa-envelope', title: 'Faculty Inbox', message: 'You have 2 unread messages from the administration.', nav: 'nav-mail' },
        { icon: 'fa-solid fa-clock', title: 'Upcoming Meeting', message: 'General faculty meeting at 4:00 PM in the auditorium.', nav: 'nav-dashboard' }
    ];

    function buildScheduleNotifications() {
        const notifList = document.getElementById('notif-list');
        const notifBadge = document.getElementById('notifBadge');
        if (!notifList) return;

        let html = `<div class="px-6 py-4">`;
        let hasAlert = featureNotifications.length > 0;
        featureNotifications.forEach(item => {
            html += `
                <div class="notif-item px-5 py-5 hover:bg-white cursor-pointer border border-transparent hover:border-gray-100 hover:shadow-sm rounded-xl mb-3 transition-all" 
                     data-nav="${item.nav}">
                    <div class="flex gap-4 items-start">
                        <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-600 text-sm shadow-sm border border-gray-50">
                            <i class="${item.icon}"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-[13px] font-bold text-gray-800 leading-tight">${item.title}</p>
                            <p class="text-[12px] text-gray-500 mt-1.5 leading-normal">${item.message}</p>
                        </div>
                    </div>
                </div>`;
        });
        html += `</div>`;

        notifList.innerHTML = html;

        // Attach listeners to new items
        notifList.querySelectorAll('.notif-item[data-nav]').forEach(item => {
            item.addEventListener('click', () => {
                switchTab(item.dataset.nav);
                hideHeaderOverlays();
            });
        });

        if (notifBadge) notifBadge.classList.toggle('hidden', !hasAlert);
    }

    // Initialize schedule components
    buildScheduleNotifications();

    setInterval(buildScheduleNotifications, 60000);


    // Initialize layout
    updateLayout();

    // â”€â”€â”€ SIGMA AI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const WELCOME_MSG = `Hello, <strong>Teacher Maria!</strong> I'm <span class="font-black">SIGMA</span>, your system AI. What do you need today?`;

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
                .map(file => `&bull; ${escapeSigmaAiText(file.name)} (${getSigmaAiFileKindLabel(file, isPhotoUpload)} &bull; ${formatSigmaAiFileSize(file.size)})`)
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
                .map(file => `&bull; ${escapeSigmaAiText(file.name)}`)
                .join('\n');
            addAiMessage(
                `Upload failed. Supported ${isPhotoUpload ? 'images' : 'documents'} only.\n${failedLines}`,
                false
            );
        }

        if (oversizedFiles.length) {
            const failedLines = oversizedFiles
                .map(file => `&bull; ${escapeSigmaAiText(file.name)} (${formatSigmaAiFileSize(file.size)})`)
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
        if (!sigmaAiPanel || !sigmaAiNotch) return;
        closeMobilePullUpSurfacesForAi();
        window.__closeMobileSidebarForOverlay?.();
        window.__pushMobileOverlayHistory?.('sigma-ai');
        sigmaAiPanel.classList.remove('hidden');
        setTimeout(() => {
            sigmaAiPanel.classList.add('open');
            sigmaAiNotch.classList.add('open');
            updateNotchPosition();
        }, 10);
        sessionStorage.setItem('sigmaTeacherPanelOpen', 'true');
    }

    function closeAiPanel() {
        if (!sigmaAiPanel || !sigmaAiNotch) return;
        sigmaAiPanel.classList.remove('open');
        sigmaAiNotch.classList.remove('open');
        updateNotchPosition();
        closeAiAttachMenu();
        sessionStorage.setItem('sigmaTeacherPanelOpen', 'false');
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

        // Close AI attach menu if AI panel is closing or if specifically requested
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
            setTimeout(() => addAiMessage('Full faculty AI integration coming soon!', false), 600);
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
            addAiMessage('Faculty wireframe mode &mdash; Gemini AI integration in progress.', false);
            setSigmaAiWaiting(false);
        }, 600);
    }

    if (sigmaAiSendBtn) sigmaAiSendBtn.addEventListener('click', sendAiMessage);
    if (sigmaAiCloseBtn) sigmaAiCloseBtn.addEventListener('click', closeAiPanel);
    if (sigmaAiInput) sigmaAiInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendAiMessage(); });

    const isFirstVisit = sessionStorage.getItem('sigmaTeacherFirstVisit') !== 'true';
    const panelWasOpen = sessionStorage.getItem('sigmaTeacherPanelOpen') === 'true';

    if (isFirstVisit) {
        sessionStorage.setItem('sigmaTeacherFirstVisit', 'true');
        // setTimeout(() => {
        //     openAiPanel();
        //     addAiMessage(WELCOME_MSG, false);
        // }, 1200);
        addAiMessage(WELCOME_MSG, false);
    } else {
        addAiMessage(WELCOME_MSG, false);
    }

    // Ensure all header overlays are hidden on load
    hideHeaderOverlays(null, null, false);

    // if (panelWasOpen) openAiPanel();

    // --- Card Drag & Drop (SortableJS) ---
    function initCardSortable(forceRebind = false) {
        const grid = document.getElementById('classrooms-grid');
        if (!grid || typeof Sortable === 'undefined') return;

        if (classroomSortable) {
            if (!forceRebind && classroomSortable.el === grid) return;
            classroomSortable.destroy();
            classroomSortable = null;
        }

        classroomSortable = new Sortable(grid, {
            animation: 150,
            draggable: '.classroom-card',
            dataIdAttr: 'data-id',
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag-original',   // on the original card in-grid
            chosenClass: 'sortable-chosen',
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
                    // Only the body clone gets sortable-drag-clone — unambiguous.
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
                    // uses those to track the cursor; overriding them breaks dragging.
                    // DO NOT override background — clone inherits card's real background
                    // (colored banner) via its own CSS classes.
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
                    dragEl.style.transition = 'none';
                });
            },
            onEnd: () => {
                document.body.style.cursor = '';
                document.body.classList.remove('classroom-card-sorting');
                const order = classroomSortable.toArray();
                localStorage.setItem('teacher_classroom_order', JSON.stringify(order));
            },
            onCancel: () => {
                document.body.style.cursor = '';
                document.body.classList.remove('classroom-card-sorting');
            }
        });
    }

    initCardSortable();

    // --- Assessments Tab Logic ---
    function formatAssessmentDate(date) {
        if (!date) return '-';
        const d = (date instanceof Date) ? date : new Date(date);
        if (isNaN(d.getTime())) return date;
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${dateStr}<br><span class="text-[9px] md:text-[10px] text-gray-500 font-medium">${timeStr}</span>`;
    }

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
        const rows = [];
        const baseDate = new Date('2026-03-26T08:00:00');

        const normalizeSubject = (value, fallbackPrefix, index) => {
            if (!value) return null;
            if (typeof value === 'string') {
                const label = value.trim();
                if (!label) return null;
                return {
                    id: `${fallbackPrefix}-${index}`,
                    label
                };
            }

            const label = value.text || value.name || value.title || '';
            if (!label) return null;
            return {
                id: value.id || `${fallbackPrefix}-${index}`,
                label
            };
        };

        const flattenedAcademic = (subjectsData.academic || []).flatMap((entry, entryIdx) => {
            if (entry && Array.isArray(entry.subjects)) {
                return entry.subjects.map((subject, subjectIdx) =>
                    normalizeSubject(subject, `acad-${entryIdx}`, subjectIdx)
                ).filter(Boolean);
            }
            return [normalizeSubject(entry, 'acad', entryIdx)].filter(Boolean);
        });

        const allSubjects = [
            ...(subjectsData.core || []).map((subject, idx) => normalizeSubject(subject, 'core', idx)),
            ...flattenedAcademic,
            ...(subjectsData.techpro || []).map((subject, idx) => normalizeSubject(subject, 'techpro', idx))
        ].filter(Boolean);

        allSubjects.forEach((subject, sIdx) => {
            const categories = ['assignment', 'quiz', 'activity', 'perf. task'];

            categories.forEach(cat => {
                const assessments = getAssessmentsForSubject(subject.id, cat);
                assessments.forEach((ass, aIdx) => {
                    const startDate = new Date(baseDate);
                    startDate.setDate(baseDate.getDate() - (aIdx * 5 + (sIdx * 2) + 2));
                    const dueDate = new Date(startDate);
                    dueDate.setDate(startDate.getDate() + 7);

                    let status = 'not-started';
                    if (aIdx % 4 === 0) status = 'graded';
                    else if (aIdx % 4 === 1) status = 'submitted';
                    else if (aIdx % 4 === 2) status = 'waiting';

                    const score = status === 'graded' ? 85 + (aIdx % 15) : 0;

                    const tabMap = { 'assignment': 'assignments', 'quiz': 'quiz', 'activity': 'activity', 'perf. task': 'performance' };
                    
                    rows.push({
                        subjectId: subject.id,
                        subject: subject.label,
                        activity: ass.title,
                        category: cat,
                        tab: tabMap[cat] || 'activity',
                        topicIdx: ass.topicIdx,
                        itemIdx: ass.itemIdx,
                        status: status,
                        score: score,
                        max: ass.max,
                        startDate: startDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
                        dueDate: dueDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
                        submittedOn: status !== 'not-started' ? new Date(startDate.getTime() + 86400000).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : null,
                        gradedOn: status === 'graded' ? new Date(startDate.getTime() + 259200000).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : null
                    });
                });
            });
        });

        return rows;
    }



    function renderAssessmentsPage() {
        const layout = document.getElementById('assessments-layout');
        if (!layout) return;

        try {
            const rows = buildAssessmentRows();
            const subjects = [...new Set(rows.map(row => row.subject))].sort((a, b) => a.localeCompare(b));

            const statusBadge = status => {
                if (status === 'graded') return '<span class="text-green-600 font-bold text-[11px]">Graded</span>';
                if (status === 'submitted') return '<span class="text-green-600 font-bold text-[11px]">Submitted</span>';
                if (status === 'waiting') return '<span class="text-amber-500 font-bold text-[11px]">Waiting</span>';
                if (status === 'overdue') return '<span class="text-red-600 font-bold text-[11px]">Overdue</span>';
                return '<span class="text-black font-bold text-[11px]">-</span>';
            };

            layout.innerHTML = `
                <div class="teacher-topic-page-shell">
                    <div class="teacher-topic-page-grid">
                        <!-- LEFT: Assessment Panel -->
                        <div class="teacher-topic-main-shell" style="display: flex; flex-direction: column;">
                            <div class="teacher-topic-header border-b border-black flex flex-col md:flex-row items-center justify-between gap-4 p-4 md:px-10 md:py-6">
                                <div class="w-full md:w-auto flex items-center gap-4">
                                    <select id="assessments-subject-filter" class="px-4 py-2.5 rounded-xl border border-black bg-white text-xs md:text-sm font-semibold text-gray-700 focus:outline-none focus:border-black w-full md:w-[320px]">
                                        <option value="all">Subjects and Sections</option>
                                        ${(typeof getTeacherSectionCards === 'function' ? getTeacherSectionCards() : []).map(card => `<option value="${card.name}">${card.name} - ${card.sectionName}</option>`).join('')}
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

            function renderAssessmentPageRows() {
                const fRows = getFilteredRows();
                updateSidebarPanels(fRows);

                const totalPages = Math.max(1, Math.ceil(fRows.length / pageSize));
                currentPage = Math.min(currentPage, totalPages);
                const startIndex = (currentPage - 1) * pageSize;
                const vRows = fRows.slice(startIndex, startIndex + pageSize);

                let html = '';
                for (let i = 0; i < pageSize; i++) {
                    const row = vRows[i];
                    if (row) {
                        html += `
                        <tr class="hover:bg-gray-50/50 transition-colors ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}">
                            <td class="sticky left-0 bg-white z-20 px-2 md:px-5 py-3 text-[10px] md:text-sm font-bold text-black whitespace-normal leading-tight shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-b border-gray-100">
                                <button type="button" class="text-left text-icc hover:text-icc-dark hover:underline transition-colors" onclick="event.stopPropagation(); window.openTopicContent('${row.subjectId}', ${row.topicIdx}, '${row.tab}', ${row.itemIdx})">${row.activity}</button>
                            </td>
                            <td class="px-1 md:px-5 py-3 text-[9px] md:text-sm text-black text-center whitespace-normal leading-tight border-b border-gray-100">${row.startDate ? formatAssessmentDate(row.startDate) : '-'}</td>
                            <td class="px-1 md:px-5 py-3 text-[9px] md:text-sm text-black text-center whitespace-normal leading-tight border-b border-gray-100">${row.dueDate ? formatAssessmentDate(row.dueDate) : '-'}</td>
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
            }

            filter?.addEventListener('change', () => {
                currentPage = 1;
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
        } catch (error) {
            console.error('Failed to render teacher assessments page:', error);
        }
    }

    // showMyProfile is now defined above to ensure it has access to hideHeaderOverlays and switchTab

    // â”€â”€â”€ User Profile Logic (Synchronized with Student) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const USER_STORAGE_KEY = 'sigma-admin-users';
    const USER_AVATAR_STORAGE_KEY = 'sigma_user_avatar_base64';

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
            users.push({ ...authUser, ...profileData });
            idx = users.length - 1;
        } else {
            users[idx] = { ...users[idx], ...profileData };
        }

        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));

        const updatedSession = { ...authUser, ...profileData };
        sessionStorage.setItem('sigma-authenticated-user', JSON.stringify(updatedSession));
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

                saveProfileTarget({ ...target.data, uploads: dedupedUploads });

                window.populateUserProfilePage();
                window.renderUserProfilePictureUploads();
                if (event.target) event.target.value = '';
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    };

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    window.populateUserProfilePage = function () {
        const target = getProfileTarget();
        const data = target.data;

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
        if (roleEl) roleEl.textContent = String(data.role || data.type || 'Teacher');
        if (idEl) idEl.textContent = `ID: #${userId}`;
        if (emailEl) emailEl.textContent = String(data.email || 'example@gmail.com');
        if (dropFirstName) dropFirstName.textContent = firstName;
        if (dropLastName) dropLastName.textContent = lastName;

        // Welcome Banner
        const welcomeName = document.getElementById('welcome-user-firstName');
        if (welcomeName) welcomeName.textContent = "Teacher " + (firstName || "");

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

        let currentTab = document.querySelector('.dynamic-section:not(.hidden) p[id^="profile-tab-"][class*="border-[#15803d]"]')?.id?.replace('profile-tab-', '') || 'bio';

        if (perms[currentTab] === false && firstVisibleTab) {
            window.switchUserProfileTab(firstVisibleTab);
        } else {
            window.renderUserProfileTab(currentTab);
        }
    };

    window.switchUserProfileTab = function (tabId) {
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
        bio: ``, // Handled by renderUserProfileTab
        achievements: `
            <div class="flex flex-col items-center justify-center py-16 gap-3 text-slate-300">
                <i class="fa-solid fa-trophy text-4xl"></i>
                <p class="text-[11px] font-medium uppercase tracking-[0.3em]">No achievements documented</p>
            </div>
        `,
        subjects: `
            <div class="flex flex-col items-center justify-center py-16 gap-3 text-slate-300">
                <i class="fa-solid fa-book-open text-4xl"></i>
                <p class="text-[11px] font-medium uppercase tracking-[0.3em]">No subjects assigned</p>
            </div>
        `,
        sections: `
            <div class="flex flex-col items-center justify-center py-16 gap-3 text-slate-300">
                <i class="fa-solid fa-users-viewfinder text-4xl"></i>
                <p class="text-[11px] font-medium uppercase tracking-[0.3em]">No sections assigned</p>
            </div>
        `
    };

    window.renderUserProfileTab = function (tabId = 'bio') {
        const panel = document.getElementById('user-profile-tab-panel');
        if (!panel) return;

        const target = getProfileTarget();
        const data = target.data;
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

    window.showMyProfile = function (event) {
        if (event) event.preventDefault();
        hideHeaderOverlays();
        switchTab('nav-profile');
        window.populateUserProfilePage();
    };

    window.populateUserProfilePage();
    initCardSortable();

    // â”€â”€â”€ ANNOUNCEMENT SYSTEM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    function formatAnnouncementDate(dateValue) {
        if (!dateValue) return '';
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return dateValue;

        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    function loadInstitutionalAnnouncements() {
        const adminPosts = JSON.parse(localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY) || '[]');

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

        const welcomePostTitle = '2nd Quarter Academic & School Updates';
        const existingWelcomePost = adminPosts.find(p => p.title === welcomePostTitle);
        if (!existingWelcomePost) {
            adminPosts.unshift({
                id: 'sys-welcome-' + Date.now(),
                title: welcomePostTitle,
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
            });
        } else if (existingWelcomePost.type !== 'urgent') {
            existingWelcomePost.type = 'urgent';
        }

        localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, JSON.stringify(adminPosts));
        const genMathMockTitle = 'General Mathematics';
        const existingGenMathPost = adminPosts.find(p => p.title === genMathMockTitle);

        if (!existingGenMathPost) {
            adminPosts.unshift({
                id: 'genmath-dash-mock-' + Date.now(),
                title: genMathMockTitle,
                subtitle: 'GRADE 11 - STEM A',
                body: 'Please complete the exercise on Rational Functions by tomorrow. This will be the basis for our next discussion.',
                audience: 'all',
                type: 'regular',
                isImportant: false,
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                author: 'Jose Santos',
                isAdmin: false,
                isClassroomPost: true,
                classroomKey: 'Grade 11 - STEM A::General Mathematics'
            });
            localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, JSON.stringify(adminPosts));
        }

        return {
            combined: adminPosts,
            teacherOnly: adminPosts.filter(p => !p.isAdmin)
        };
    }

    function renderTeacherAnnouncements() {
        const feed = document.getElementById('admin-announcements-feed');
        if (!feed) return;

        const { combined, teacherOnly } = loadInstitutionalAnnouncements();
        let filtered = combined;

        if (activeHomeAnnouncementTab === 'important') {
            filtered = combined.filter(p => p.type === 'urgent' || p.isImportant);
        } else if (activeHomeAnnouncementTab === 'posts') {
            const teacher = getProfileTarget().data;
            const currentAuthorName = `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || 'Teacher';
            filtered = teacherOnly.filter(p => p.author === currentAuthorName || (!teacher.firstName && p.author === 'Jose Santos'));
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
            const isClassroom = !!post.classroomKey;
            const [gradeSection, subjectName] = (post.classroomKey || '').split('::');
            const isTeacher = !post.isAdmin;
            const roleLabel = isTeacher ? 'Teacher' : 'Administrator';
            const roleClass = isTeacher ? 'text-slate-400' : 'text-slate-400';

            const fullBody = post.body || '';
            const hasImage = post.imageUrl && post.imageUrl.trim() !== '';
            const hasText = (post.title && post.title.trim() !== '') || (fullBody.trim() !== '');

            // Card configuration based on content
            let cardHeight = "h-[260px]";
            let isImageOnly = false;
            let isImageWithText = false;
            if (isClassroom) {
                cardHeight = 'h-auto';
            } else {
                const isMobile = window.innerWidth < 1024;
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
            }

            const isMobile = window.innerWidth < 1024;
            const textLimit = isMobile ? (isImageWithText ? 25 : 80) : (isImageWithText ? 30 : 100);
            const isLong = !isClassroom && fullBody.length > textLimit;
            const truncatedBody = isLong ? fullBody.substring(0, textLimit) + '...' : fullBody;

            const formattedFull = escapeHtml(fullBody).replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
            const formattedTruncated = escapeHtml(truncatedBody).replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');

            // --- Classroom post card (special design) ---
            if (isClassroom) {
                return `
                    <article id="${post.id}"
                             class="bg-white border border-slate-200 rounded-[22px] relative w-full overflow-hidden group standard-panel-shadow">
                        <div class="p-8 flex flex-col min-w-0">
                            <!-- Header: avatar + name + date -->
                            <div class="flex items-start justify-between mb-3">
                                <div class="flex items-center gap-3">
                                    <div class="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 flex-shrink-0">
                                        <i class="fa-solid fa-user text-xs text-black"></i>
                                    </div>
                                    <div class="flex flex-col">
                                        <span class="text-[12px] font-black text-slate-900 leading-none mb-1">${escapeHtml(post.author || 'Teacher')}</span>
                                        <span class="text-[9px] font-bold ${roleClass}">${roleLabel}</span>
                                    </div>
                                </div>
                                <span class="text-[10px] font-medium text-slate-400 tracking-tight mt-0.5">${formatAnnouncementDate(post.createdAt)}</span>
                            </div>

                            <!-- Subject title + grade/section subtitle -->
                            <div class="mb-3 pl-[3.25rem] space-y-1">
                                <h3 class="text-[20px] lg:text-[22px] font-bold text-slate-900 leading-tight">${escapeHtml(subjectName || post.title || 'Classroom Post')}</h3>
                                ${gradeSection ? `<p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">${escapeHtml(gradeSection)}</p>` : ''}
                            </div>

                            <!-- Post body -->
                            <div class="pl-[3.25rem] text-[15px] lg:text-[16px] text-black leading-relaxed font-normal">
                                ${formattedFull}
                            </div>
                        </div>

                        <!-- Footer with 3-dot menu -->
                        <div class="px-6 pb-4 pt-2 border-t border-slate-100 bg-white flex items-center justify-end relative">
                            <button onclick="togglePostMenu('${post.id}')" class="w-9 h-9 rounded-full flex items-center justify-center text-black hover:bg-slate-100 transition-all">
                                <i class="fa-solid fa-ellipsis text-lg"></i>
                            </button>
                            <!-- Dropdown Menu -->
                            <div id="menu-${post.id}" class="hidden absolute bottom-full right-6 mb-2 w-40 bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 py-2 z-50 overflow-hidden">
                                <button onclick="deleteDashPost('${post.id}')" class="w-full px-4 py-2 text-left text-[13px] font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2">
                                    <i class="fa-solid fa-trash-can text-xs opacity-40"></i> Delete post
                                </button>
                            </div>
                        </div>
                    </article>
                `;
            }

            // --- Standard announcement card (admin / teacher dashboard post) ---
            return `
                <article id="${post.id}" 
                         data-original-height="${cardHeight}"
                         class="bg-white border border-slate-200 rounded-[22px] relative w-full ${cardHeight} overflow-hidden group standard-panel-shadow">
                    <div class="p-8 pb-6 flex flex-col min-w-0">
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
                                <span class="text-[10px] font-medium text-slate-400 tracking-tight">${formatAnnouncementDate(post.createdAt)}</span>
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
                        ${!post.isAdmin ? `
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
                        ` : ''}
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

    window.togglePostMenu = function (id) {
        // Close all other menus first
        document.querySelectorAll('[id^="menu-"]').forEach(m => {
            if (m.id !== `menu-${id}`) m.classList.add('hidden');
        });
        const menu = document.getElementById(`menu-${id}`);
        if (menu) menu.classList.toggle('hidden');

        // Prevent click from propagating to document
        event.stopPropagation();
    };

    window.deleteAnnouncement = function (id) {
        if (!confirm('Are you sure you want to delete this announcement?')) return;
        const posts = JSON.parse(localStorage.getItem('sigma-admin-announcements-v1') || '[]');
        const updated = posts.filter(p => p.id !== id);
        localStorage.setItem('sigma-admin-announcements-v1', JSON.stringify(updated));
        renderTeacherAnnouncements();
    };

    // Delete action used by the 3-dots menu in dashboard announcement cards
    window.deleteDashPost = function (id) {
        if (!confirm('Are you sure you want to delete this post?')) return;

        // 1. Remove from dashboard feed storage
        const posts = JSON.parse(localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY) || '[]');
        const deletedPost = posts.find(p => p.id === id);
        localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, JSON.stringify(posts.filter(p => p.id !== id)));

        // 2. If this was a classroom post, also remove from the room feed storage (bidirectional sync)
        if (deletedPost && deletedPost.isClassroomPost && deletedPost.classroomKey) {
            refreshSharedAnnouncements();
            const roomPosts = announcementPostsByClassroom[deletedPost.classroomKey] || [];
            announcementPostsByClassroom[deletedPost.classroomKey] = roomPosts.filter(p => p.id !== id);
            saveSharedState(SHARED_ANNOUNCEMENTS_KEY, announcementPostsByClassroom);
            // Re-render room feed if currently viewing that classroom
            if (currentClassroomKey === deletedPost.classroomKey) renderRoomAnnouncementsFeed();
        }

        renderTeacherAnnouncements();
    };

    // Close menus on click outside
    document.addEventListener('click', () => {
        document.querySelectorAll('[id^="menu-"]').forEach(m => m.classList.add('hidden'));
    });

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
                renderTeacherAnnouncements();
            };
        }
    });

    // Announcement Modal Logic
    const trigger = document.getElementById('trigger-announcement-composer');
    const modal = document.getElementById('announcement-modal');
    const closeBtn = document.getElementById('close-announcement-modal');
    const annForm = document.getElementById('dashboard-announcement-form');
    const discardModal = document.getElementById('discard-confirmation-modal');
    const confirmDiscardBtn = document.getElementById('confirm-discard-post');
    const cancelDiscardBtn = document.getElementById('confirm-cancel-discard');

    if (trigger) {
        trigger.onclick = () => {
            modal.classList.remove('hidden');
            document.body.classList.add('announcement-overlay-open');
        };
    }

    function actuallyCloseAnnouncementModal() {
        modal.classList.add('hidden');
        discardModal.classList.add('hidden');
        document.body.classList.remove('announcement-overlay-open');
        annForm.reset();
    }

    if (closeBtn) {
        closeBtn.onclick = () => {
            const title = document.getElementById('dash-announcement-title').value;
            const body = document.getElementById('dash-announcement-body').value;
            if (title || body) {
                discardModal.classList.remove('hidden');
            } else {
                actuallyCloseAnnouncementModal();
            }
        };
    }

    if (confirmDiscardBtn) {
        confirmDiscardBtn.onclick = actuallyCloseAnnouncementModal;
    }

    if (cancelDiscardBtn) {
        cancelDiscardBtn.onclick = () => discardModal.classList.add('hidden');
    }

    if (annForm) {
        annForm.onsubmit = (e) => {
            e.preventDefault();
            const submitBtn = document.querySelector('button[form="dashboard-announcement-form"]');
            const originalContent = submitBtn.innerHTML;

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Posting...';
            submitBtn.classList.add('opacity-80', 'cursor-not-allowed');

            const title = document.getElementById('dash-announcement-title').value;
            const body = document.getElementById('dash-announcement-body').value;
            const teacher = getProfileTarget().data;
            const authorName = `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || 'Teacher';

            const newPost = {
                id: 'ann-' + Date.now(),
                title,
                body,
                audience: 'all',
                type: 'regular',
                isImportant: false,
                createdAt: new Date().toISOString(),
                author: authorName,
                isAdmin: false
            };

            setTimeout(() => {
                const posts = JSON.parse(localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY) || '[]');
                posts.unshift(newPost);
                localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, JSON.stringify(posts));

                submitBtn.disabled = false;
                submitBtn.innerHTML = originalContent;
                submitBtn.classList.remove('opacity-80', 'cursor-not-allowed');

                actuallyCloseAnnouncementModal();
                renderTeacherAnnouncements();
            }, 1500);
        };
    }

    renderTeacherAnnouncements();

    renderTeacherHomeDashboardPanels();

    // Pre-render assessments once so the tab never shows an empty pane.
    if (typeof renderAssessmentsPage === 'function') {
        renderAssessmentsPage();
        sectionFeatureInit.assessments = true;
    }

    // â”€â”€ Force-close ALL panels on every load / refresh â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    window.hideHeaderOverlays();

    // Ensure all header dropdown menus and panels are hidden
    ['calendar-dropdown', 'noti-dropdown', 'profileDropdownMenu'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    // Expose functions to window for event handlers defined in HTML or other scripts
    window.switchTab = switchTab;
    window.showStudentList = showStudentList;
    window.closeAnnouncementPad = closeAnnouncementPad;

    window.returnToSections = function () {
        currentClassroomKey = '';
        currentClassroomMeta = null;
        currentClassroomSectionName = '';
        if (typeof window.switchTab === 'function') {
            window.switchTab('nav-classes');
        }
    };

    window.returnToRoomFromTopic = function (subjectId) {
        const section = currentTopicState.selectedSection;
        const subject = getTopicSubject(subjectId);
        if (section && subject) {
            window.showStudentList(section, subject.name || subject.text || subject.title, 'room', true);
        } else if (currentClassroomKey) {
            const [className, subjectName] = currentClassroomKey.split('::');
            window.showStudentList(className, subjectName, 'room', true);
        } else {
            if (typeof window.switchTab === 'function') window.switchTab('nav-classes');
        }
    };

    // Finally initialize navigation history
    setupNavigationHistory();


    /**
     * Navigation Bridge: Switches to the Subjects tab and focuses on a specific program.
     * Used by subject cards and section links.
     *
     * NOTE: This must NOT shadow the real `openInlineProgramFocus()` (sliding panels).
     */
    function openSubjectsProgramFocus(programKey) {
        window.__pendingSubjectsProgramKey = programKey;
        // 1. Switch to the Subjects tab
        if (typeof window.switchTab === 'function') {
            window.switchTab('nav-subjects');
        }

        // 2. Reset the explorer and trigger the specific program selection
        // Using a slight delay to ensure the DOM is ready after the tab switch
        setTimeout(() => {
            if (typeof window.resetSubjectsInlineExplorer === 'function') {
                window.resetSubjectsInlineExplorer();
            }

            if (typeof window.openInlineProgramFocus === 'function') {
                window.__pendingSubjectsProgramKey = null;
                window.openInlineProgramFocus(programKey);
                return;
            }

            // Fallback: simulate click if the sliding function isn't available yet
            const row = document.querySelector('.subject-paths-row');
            const panel = row?.querySelector(`.subject-path-panel[data-program-key="${programKey}"]`);
            panel?.click();
            window.__pendingSubjectsProgramKey = null;
        }, 50);
    }


    window.openSubjectsProgramFocus = openSubjectsProgramFocus;

    // --- Mobile App Bar & Sigma Sheet Logic ---

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

        // Auto-reset scroll position
        const cardsContainer = document.getElementById('mobile-sigma-cards');
        if (cardsContainer) cardsContainer.scrollTop = 0;

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

        const panelEl = document.getElementById(id);
        if (panelEl) {
            panelEl.classList.add('open');
            // Auto-reset scroll position
            panelEl.scrollTop = 0;
            const scrollContainers = panelEl.querySelectorAll('.mobile-pull-up-content, .overflow-y-auto, .overflow-y-scroll');
            scrollContainers.forEach(container => container.scrollTop = 0);
        }
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

    // Global Search Functionality
    const searchBar = document.getElementById('searchBar');
    const searchBtn = document.getElementById('globalSearchBtn');

    const triggerGlobalSearch = () => {
        const query = (searchBar?.value || '').trim();
        const visibleSection = Array.from(document.querySelectorAll('.dynamic-section:not(.hidden)'))[0];
        if (!visibleSection) return;
        const sectionId = visibleSection.id;

        if (sectionId === 'section-dashboard') {
            renderTeacherHomeDashboardPanels();
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
            const header = document.getElementById('teacher-header');
            if (!header?.classList.contains('mobile-search-active')) {
                header?.classList.add('mobile-search-active');
                searchBar?.focus();
            }
        }
    });

    // Mobile Search Back Button
    document.getElementById('mobileSearchBackBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('teacher-header')?.classList.remove('mobile-search-active');
        if (searchBar) searchBar.value = '';
    });

    // Re-render announcements ONLY when switching between mobile and desktop layouts
    document.addEventListener('mousedown', (e) => {
        if (window.innerWidth < 1024) {
            const header = document.getElementById('teacher-header');
            const searchShell = document.querySelector('.header-search-shell');
            if (header?.classList.contains('mobile-search-active') && !searchShell?.contains(e.target)) {
                header?.classList.remove('mobile-search-active');
            }
        }
    });

    // Re-render announcements ONLY when switching between mobile and desktop layouts
    let lastWidth = window.innerWidth;
    window.addEventListener('resize', () => {
        const currentWidth = window.innerWidth;
        const wasMobile = lastWidth < 1024;
        const isMobile = currentWidth < 1024;

        if (wasMobile !== isMobile) {
            if (typeof renderTeacherAnnouncements === 'function') {
                renderTeacherAnnouncements();
            }
        }
        lastWidth = currentWidth;
    });
}

