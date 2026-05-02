/* TEACHER DASHBOARD CORE LOGIC */

document.addEventListener('DOMContentLoaded', () => {
    // Disable transitions during initialization
    document.documentElement.classList.add('no-transition');

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

    window.toggleSidebar = function () {
        const overlay = document.getElementById('sidebar-overlay');
        if (window.innerWidth < 1024) {
            if (sidebar) {
                const isVisible = sidebar.classList.toggle('sidebar-visible');
                if (overlay) overlay.classList.toggle('hidden', !isVisible);
            }
        } else {
            document.body.classList.toggle('sidebar-collapsed');
            if (sidebar) sidebar.classList.toggle('sidebar-collapsed');
        }
        if (typeof updateLayout === 'function') updateLayout();
    };

    // Close sidebar on link click (Mobile)
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (link.id === 'nav-subjects') return; // Don't close on submenu toggle

            if (window.innerWidth < 1024) {
                if (sidebar) sidebar.classList.remove('sidebar-visible');
                const overlay = document.getElementById('sidebar-overlay');
                if (overlay) overlay.classList.add('hidden');
            }
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
            layoutWrapper.style.marginLeft = '0';
            layoutWrapper.style.width = '100%';
            return;
        }
        const isCollapsed = document.body.classList.contains('sidebar-collapsed');
        const isSubVisible = subSidebar && !subSidebar.classList.contains('hidden') && !subSidebar.classList.contains('subjects-hover-subsidebar');
        const mainWidth = isCollapsed ? 82 : 280;
        const subWidth = isSubVisible ? 240 : 0;
        layoutWrapper.style.marginLeft = (mainWidth + subWidth) + 'px';
        layoutWrapper.style.width = `calc(100% - ${mainWidth + subWidth}px)`;
    }

    window.addEventListener('resize', updateLayout);
    updateLayout();

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
        const openSubjectTopic = (programKey, subjectId, label) => {
            activeProgram = programKey;
            activeGroup = programKey;
            activeSubjectId = subjectId;
            
            // Close mobile sidebar before navigating
            if (window.innerWidth < 1024) {
                sidebar?.classList.remove('sidebar-visible');
                document.getElementById('sidebar-overlay')?.classList.add('hidden');
            }
            
            switchToTopicPage(resolveTeacherSubjectId(programKey, subjectId, label));

            // Restore expanded state on desktop if needed
            if (window.innerWidth >= 1024 && !document.body.classList.contains('sidebar-collapsed')) {
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
                    
                    // Close mobile sidebar before navigating
                    if (window.innerWidth < 1024) {
                        sidebar?.classList.remove('sidebar-visible');
                        document.getElementById('sidebar-overlay')?.classList.add('hidden');
                    }
                    
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
            if (window.innerWidth >= 1024) switchTab('nav-subjects');
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
        'dashboard': 'nav-dashboard', 'classes': 'nav-classes', 'subjects': 'nav-subjects',
        'materials': 'nav-materials', 'assessments': 'nav-assessments', 'grades': 'nav-grades',
        'attendance': 'nav-attendance'
    };

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
    // Start collapsed on desktop, similar to student page
    const isMobile = window.innerWidth < 1024;
    if (!isMobile) {
        document.body.classList.add('sidebar-collapsed');
        if (sidebar) sidebar.classList.add('sidebar-collapsed');
    }

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

    // Force reflow and re-enable transitions
    window.getComputedStyle(document.documentElement).opacity;
    document.documentElement.classList.remove('no-transition');

    // SIGMA AI Dashboard Cards (Removed)

    // ─── Calendar Logic (Admin Copy) ──────────────────────────
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
            const baseClasses = "w-9 h-9 flex items-center justify-center text-[12px] font-bold transition-all cursor-pointer rounded-lg mx-auto";
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
            delay: 150, // "Drag and Hold" feel
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
    setTimeout(() => switchTab('nav-dashboard'), 0);

    // --- Sample Data ---
    window.subjectsData = {
        core: [
            { id: 'subj-effcomm', name: 'Effective Communication', icon: 'fa-solid fa-comments', grade: 'Grade 11', programKey: 'core-subjects', sections: ['Grade 11 - ICT A'] },
            { id: 'subj-lifecareer', name: 'Life and Career Skills', icon: 'fa-solid fa-heart-circle-check', grade: 'Grade 11', programKey: 'core-subjects', sections: ['Grade 11 - ICT B'] },
            { id: 'subj-genmath', name: 'General Mathematics', icon: 'fa-solid fa-square-root-variable', grade: 'Grade 11', programKey: 'core-subjects', sections: ['Grade 11 - STEM A'] },
            { id: 'subj-gensci', name: 'General Science', icon: 'fa-solid fa-flask', grade: 'Grade 11', programKey: 'core-subjects', sections: ['Grade 11 - STEM B'] },
            { id: 'subj-history', name: 'Pag-aaral ng Kasaysayan at Lipunang Pilipino', icon: 'fa-solid fa-landmark', grade: 'Grade 11', programKey: 'core-subjects', sections: ['Grade 11 - HUMSS A'] }
        ],
        academic: [
            { id: 'subj-arts-1', name: 'Arts 1 - Creative Industries', icon: 'fa-solid fa-palette', grade: 'Grade 11', programKey: 'applied-subjects', sections: ['Grade 11 - Arts A'] },
            { id: 'subj-lit-1', name: 'Contemporary Literature 1', icon: 'fa-solid fa-book-open', grade: 'Grade 11', programKey: 'applied-subjects', sections: ['Grade 11 - HUMSS B'] },
            { id: 'subj-civic', name: 'Citizenship and Civic Engagement', icon: 'fa-solid fa-people-arrows', grade: 'Grade 12', programKey: 'applied-subjects', sections: ['Grade 12 - GAS A'] }
        ],
        techpro: [
            { id: 'subj-prog1', name: 'Programming 1', icon: 'fa-solid fa-code', grade: 'Grade 11', programKey: 'applied-subjects', sections: ['Grade 11 - ICT C'] },
            { id: 'subj-dbms', name: 'Database Management', icon: 'fa-solid fa-database', grade: 'Grade 11', programKey: 'applied-subjects', sections: ['Grade 11 - ICT D'] },
            { id: 'subj-css', name: 'Computer Systems Servicing', icon: 'fa-solid fa-screwdriver-wrench', grade: 'Grade 11', programKey: 'applied-subjects', sections: ['Grade 11 - ICT E'] },
            { id: 'subj-anim', name: 'Animation', icon: 'fa-solid fa-clapperboard', grade: 'Grade 11', programKey: 'applied-subjects', sections: ['Grade 11 - ICT F'] }
        ],
        completed: [
            { id: 'subj-intro-ict', name: 'Intro to ICT', icon: 'fa-solid fa-laptop', grade: 'Grade 10', programKey: 'core-subjects', type: 'applied', sections: ['Grade 10 - ICT A'] }
        ]
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
        }
    };

    const dynamicCurriculumSubjects = {};

    const topicVideos = {
        'core-effective-communication': 'https://www.youtube.com/embed/eIrMbAQSU34',
        'core-general-mathematics': 'https://www.youtube.com/embed/LwCRRUa8yTU'
    };

    const topicHandouts = {
        'core-effective-communication': [
            { name: 'Comm Basics.pdf', size: '1.2 MB', type: 'PDF' },
            { name: 'Public Speaking.docx', size: '450 KB', type: 'DOC' }
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
        return curriculumTopicCatalog[subjectId] || dynamicCurriculumSubjects[subjectId] || null;
    }

    function getTopicSubject(subjectId) {
        const programSubjects = [];
        Object.values(curriculumPrograms).forEach(p => {
            if (p.subjects) programSubjects.push(...p.subjects);
            if (p.stages) programSubjects.push(...p.stages);
        });
        const exactMatch = programSubjects.find(s => (s.id === subjectId || s.key === subjectId));
        if (exactMatch) return exactMatch;

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


    const studentsBySection = {
        'Grade 11 - ICT A': Array.from({ length: 25 }, (_, i) => ({
            id: `2026-${String(i + 1).padStart(3, '0')}`,
            name: `${['Abad', 'Bautista', 'Cruz', 'Dela Cruz', 'Estacio', 'Ferrer', 'Garcia', 'Hernandez', 'Ignacio', 'Jimenez', 'Lozano', 'Mendoza', 'Navarro', 'Ocampo', 'Perez', 'Quinto', 'Ramos', 'Santos', 'Torres', 'Umali', 'Valdez', 'Villanueva', 'Wong', 'Yabut', 'Zosa'][i % 25]}, ${['Juan', 'Maria', 'Jose', 'Ana', 'Ricardo', 'Liza', 'Antonio', 'Elena', 'Fernando', 'Gloria', 'Gabriel', 'Hilda', 'Ismael', 'Juliana', 'Kevin', 'Lourdes', 'Manuel', 'Nina', 'Oscar', 'Pilar', 'Quentin', 'Rosa', 'Samuel', 'Teresa', 'Victor'][i % 25]}`,
            status: Math.random() > 0.1 ? 'Active' : 'At Risk',
            attendance: Math.floor(Math.random() * 20) + 80 // 80-100%
        })),
        'Grade 11 - STEM A': Array.from({ length: 25 }, (_, i) => ({
            id: `2026-S-${String(i + 1).padStart(3, '0')}`,
            name: `Student ${i + 1}`,
            status: 'Active',
            attendance: 95
        }))
    };

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

    const SHARED_ANNOUNCEMENTS_KEY = 'sigma-room-announcements-v1';
    const SHARED_ATTENDANCE_MODE_KEY = 'sigma-attendance-mode-v1';
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

        bannerImage.src = 'image/Welcome.jpg';
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
    let attendanceModeByClassroom = loadSharedState(SHARED_ATTENDANCE_MODE_KEY, {});
    let attendanceRecordsByClassroom = loadSharedState(SHARED_ATTENDANCE_RECORDS_KEY, {});
    let commentModeByClassroom = loadSharedState(SHARED_COMMENT_MODE_KEY, {});
    let announcementCommentsByClassroom = loadSharedState(SHARED_ANNOUNCEMENT_COMMENTS_KEY, {});

    function refreshSharedAnnouncements() {
        announcementPostsByClassroom = loadSharedState(SHARED_ANNOUNCEMENTS_KEY, {});
        return announcementPostsByClassroom;
    }

    function refreshAttendanceModes() {
        attendanceModeByClassroom = loadSharedState(SHARED_ATTENDANCE_MODE_KEY, {});
        return attendanceModeByClassroom;
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

    function getCurrentAttendanceMode() {
        refreshAttendanceModes();
        return attendanceModeByClassroom[currentClassroomKey] || 'manual';
    }

    function getCurrentAttendanceStatuses() {
        refreshAttendanceRecords();
        return attendanceRecordsByClassroom[currentClassroomKey]?.statuses || {};
    }

    function getCurrentAttendanceExcuses() {
        refreshAttendanceRecords();
        return attendanceRecordsByClassroom[currentClassroomKey]?.excuses || {};
    }

    function saveCurrentAttendanceMode(mode) {
        if (!currentClassroomKey) return;
        attendanceModeByClassroom[currentClassroomKey] = mode;
        saveSharedState(SHARED_ATTENDANCE_MODE_KEY, attendanceModeByClassroom);
    }

    function saveCurrentAttendanceStatuses(statuses, excuses = getCurrentAttendanceExcuses()) {
        if (!currentClassroomKey) return;
        attendanceRecordsByClassroom[currentClassroomKey] = {
            mode: getCurrentAttendanceMode(),
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
        const analyticsTab = document.getElementById('grades-tab-analytics');
        const gradebookTab = document.getElementById('grades-tab-gradebook');

        // Normalize DOM structure: ensure gradebook pane is a sibling of analytics pane.
        // (If accidentally nested inside analytics, it will always hide when analytics is hidden.)
        if (
            analyticsContent &&
            gradebookContent &&
            analyticsContent.contains(gradebookContent) &&
            analyticsContent.parentElement
        ) {
            analyticsContent.parentElement.insertBefore(gradebookContent, analyticsContent.nextSibling);
        }

        if (tabId === 'gradebook' && !sectionFeatureInit.gradebook) {
            sectionFeatureInit.gradebook = true;
            initGradebook();
        }

        if (tabId === 'analytics') {
            analyticsContent?.classList.remove('hidden');
            gradebookContent?.classList.add('hidden');
            analyticsContent?.classList.add('flex-1', 'overflow-y-auto');
            analyticsTab?.classList.add('text-icc', 'border-icc');
            analyticsTab?.classList.remove('text-gray-400', 'border-transparent');
            gradebookTab?.classList.remove('text-icc', 'border-icc');
            gradebookTab?.classList.add('text-gray-400', 'border-transparent');

            // Trigger analytics update
            setupAnalyticsTab();
        } else {
            analyticsContent?.classList.add('hidden');
            gradebookContent?.classList.remove('hidden');
            gradebookContent?.classList.add('flex-1', 'flex', 'flex-col', 'overflow-hidden');
            analyticsTab?.classList.remove('text-icc', 'border-icc');
            analyticsTab?.classList.add('text-gray-400', 'border-transparent');
            gradebookTab?.classList.add('text-icc', 'border-icc');
            gradebookTab?.classList.remove('text-gray-400', 'border-transparent');

            // Re-render spreadsheet if switching to gradebook
            if (typeof renderGradebookSpreadsheet === 'function') {
                renderGradebookSpreadsheet();
            }
        }
    };


    // --- Sub-Sidebar Logic ---
    function updateSubSidebar(tabId, clusterSubjects = null, clusterTitle = null) {
        const subSidebar = document.getElementById('sub-sidebar');
        const content = document.getElementById('sub-sidebar-content');
        const title = document.getElementById('sub-sidebar-title');
        const header = document.getElementById('sub-sidebar-header');

        if (!subSidebar || !content) return;

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
                    teacher: classroomMetaBySubject[key]?.teacher || 'Elena Reyes'
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

        submenu.innerHTML = getTeacherSectionCards().map(card => {
            const active = card.sectionName === activeClassName && card.name === activeSubject;
            return `
                <button type="button"
                    class="teacher-section-room-link ${active ? 'active' : ''}"
                    data-section-name="${card.sectionName.replace(/"/g, '&quot;')}"
                    data-section-subject="${card.name.replace(/"/g, '&quot;')}">
                    <span class="teacher-section-room-link__title">${card.name}</span>
                    <span class="teacher-section-room-link__meta">${getClassroomRoomSubtitle(card)}</span>
                </button>
            `;
        }).join('');

        submenu.querySelectorAll('[data-section-name][data-section-subject]').forEach(button => {
            button.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                showStudentList(button.dataset.sectionName, button.dataset.sectionSubject, 'room');
            });
        });
    }

    function syncSectionsNavState(showChildren = Boolean(currentClassroomKey)) {
        const parent = document.getElementById('nav-classes');
        const submenu = ensureSectionsSubmenu();
        if (!parent || !submenu) return;

        const isCollapsed = document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;
        parent.classList.toggle('active', Boolean(currentClassroomKey));
        parent.classList.toggle('open', showChildren && !isCollapsed);
        parent.querySelector('.sidebar-group-chevron')?.classList.toggle('rotate-90', showChildren && !isCollapsed);
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
        if (isCollapsed && !showCollapsedOverlay) {
            subSidebar.classList.add('hidden');
            subSidebar.classList.remove('sub-sidebar-visible');
            document.body.classList.remove('sub-sidebar-open');
            updateLayout();
            return;
        }

        if (!isCollapsed) {
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
                            <span class="teacher-section-room-link__title">${card.name}</span>
                            <span class="teacher-section-room-link__meta">${getClassroomRoomSubtitle(card)}</span>
                        </button>
                    `;
        }).join('')}
            </div>
        `;

        content.querySelectorAll('[data-section-name][data-section-subject]').forEach(button => {
            button.addEventListener('click', () => {
                showStudentList(button.dataset.sectionName, button.dataset.sectionSubject, 'room');
            });
        });

        subSidebar.classList.remove('hidden');
        subSidebar.classList.add('sub-sidebar-visible');
        document.body.classList.add('sub-sidebar-open');
        updateLayout();
    }

    document.getElementById('nav-classes')?.addEventListener('click', event => {
        if (!currentClassroomKey) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const [className = '', subject = ''] = currentClassroomKey.split('::');
        const isCollapsed = document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;
        renderClassroomSectionsSidebar(className, subject, isCollapsed);
    }, true);

    document.getElementById('nav-classes')?.addEventListener('mouseenter', () => {
        const isCollapsed = document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;
        if (!currentClassroomKey || !isCollapsed) return;
        const [className = '', subject = ''] = currentClassroomKey.split('::');
        renderClassroomSectionsSidebar(className, subject, true);
    });

    function hideClassroomSectionsSidebar() {
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
                badge = `<span class="text-[10px] font-black tracking-widest" style="color: #dc2626 !important;">No class</span>`;
            } else if (index === 2) {
                badge = `<span class="text-[10px] font-black tracking-widest" style="color: #16a34a !important;">Class today</span>`;
            } else if (index === 5) {
                badge = `<span class="text-[10px] font-black tracking-widest" style="color: #ca8a04 !important;">Class tomorrow</span>`;
            }

            const isAdvisory = subj.id === 'subj-effcomm' && sectionName === 'Grade 11 - ICT A';
            const advisoryLabel = isAdvisory ? `<p class="text-[10px] font-black tracking-widest mb-0.5" style="color: #000000 !important;">Adviser</p>` : '';

            html += `
                <div class="classroom-card bg-white border border-gray-100 rounded-[24px] overflow-hidden shadow-sm transition-all group flex flex-col h-full relative"
                     data-id="${subj.id}|${sectionName}">
                    <!-- Header / Banner -->
                    <div class="h-28 ${bgClass} w-full flex items-center justify-center px-6 rounded-t-[24px] classroom-card-banner">
                         <h3 class="${textClass} font-black tracking-widest text-[14px] text-center leading-tight cursor-pointer hover:opacity-80 transition-opacity"
                             style="color: #ffffff !important;"
                             onclick="window.showStudentList && window.showStudentList('${sectionName}', '${subj.name}')">${subj.name}</h3>
                    </div>
                    
                    <!-- Card Body -->
                    <div class="p-6 flex flex-col flex-1 card-body-main">
                        <div class="flex items-start justify-between mb-4">
                            <div class="flex flex-col">
                                <h4 class="text-[15px] font-black leading-tight" style="color: #000000 !important;">Elena Reyes</h4>
                                ${advisoryLabel}
                            </div>
                            ${badge}
                        </div>

                        <div class="mt-auto flex flex-col gap-2.5 pt-4 border-t border-gray-50">
                            <span class="text-[10px] font-black tracking-widest leading-none" style="color: #000000 !important;">${sectionName.split(' - ').pop()}</span>
                            <span class="text-[10px] font-black tracking-widest leading-none mobile-hide-meta" style="color: #000000 !important;">${subj.grade}</span>
                            <span class="text-[10px] font-black tracking-widest leading-none mobile-hide-meta" style="color: #000000 !important;">${subj.room}</span>
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

            return `
                <div class="classroom-card bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all group flex flex-col h-full">
                    <div class="h-24 ${bgClass} w-full flex items-end justify-end px-8 pb-4 relative overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                         onclick="window.openSubjectsProgramFocus && window.openSubjectsProgramFocus('${subj.programKey || 'core-subjects'}')">
                        <i class="${iconClass} absolute -left-4 -top-4 text-white/10 text-7xl transform -rotate-12"></i>
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
            `Introduction to ${title}`,
            `Core Concepts in ${title}`,
            `Applied Practice in ${title}`,
            `Assessment and Reflection for ${title}`
        ];
        return {
            id: subjectId,
            text: title,
            subtitle: `${clusterTitle} • Grade 11`,
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
                meta: `${item.track} • ${item.subjectCount} Subjects`
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
                        meta: `${k12Group.title} • ${k12Group.track}`,
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
                        meta: `${cluster.title} • ${cluster.track}`,
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
                meta: `${cluster.track} • ${cluster.title}`,
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


    function switchToTopicPage(subjectId) {
        const data = getTopicData(subjectId);
        const subject = getTopicSubject(subjectId);
        if (!data || !subject) return;
        navLinks.forEach(link => link.classList.remove('active'));
        document.getElementById('nav-subjects')?.classList.add('active');
        const navContextText = document.getElementById('nav-context-text');
        if (navContextText) navContextText.textContent = 'Subjects';
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

        document.body.classList.add('sidebar-collapsed');
        sidebar.classList.add('sidebar-collapsed');
        const subSidebar = document.getElementById('sub-sidebar');
        if (subSidebar) {
            subSidebar.classList.add('hidden');
            subSidebar.classList.remove('sub-sidebar-visible');
        }
        loadTopicSubSidebar(subject, data, statusIconClass);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function loadTopicSubSidebar(subject, data, statusIconClass) {
        const content = document.getElementById('sub-sidebar-content');
        const title = document.getElementById('sub-sidebar-title');
        const header = document.getElementById('sub-sidebar-header');
        if (!content) return;
        if (header) header.classList.remove('hidden');
        if (title) title.textContent = 'Topic Navigation';

        content.innerHTML = data.q1Topics.map((t, i) => `
            <button onclick="openTopicContent('${subject.id || subject.key}', ${i})" class="w-full text-left p-3 rounded-xl hover:bg-gray-50 transition-all flex items-start gap-3 group">
                <i class="fa-solid ${statusIconClass[t.status] || 'fa-circle text-gray-200'} mt-1 flex-shrink-0"></i>
                <div class="min-w-0">
                    <p class="text-xs font-black text-gray-400 uppercase tracking-widest mb-0.5">Topic ${i + 1}</p>
                    <p class="text-sm font-bold text-gray-700 leading-tight group-hover:text-icc transition-colors truncate">${t.title}</p>
                </div>
            </button>
        `).join('');
    }

    function buildTopicPage(subjectId, subject, data, statusIconClass) {
        const page = document.getElementById('section-topic-detail');
        if (!page) return;
        const overallPct = Math.round(((data.q1Percent || 0) + (data.q2Percent || 0)) / 2);
        const q1Done = (data.q1Topics || []).filter(topic => topic.status === 'completed').length;
        const q1Total = (data.q1Topics || []).length || 1;
        const quarter1Pct = data.q1Percent || Math.round((q1Done / q1Total) * 100);
        const quarter2Pct = data.q2Percent || 0;
        const topicImages = ['image/Topic.jpg', 'image/Topic2.jpg'];
        const topicOverview = {
            'Nature and Elements of Communication': 'Identify how messages are created, sent, received, and interpreted in real situations.',
            'Functions of Communication': 'See how communication informs, influences, regulates, and builds relationships.',
            'Communication Models': 'Compare common models and how feedback moves across each communication process.',
            'Communication Breakdown': 'Recognize barriers that interrupt meaning and plan ways to avoid them.',
            'Speech Context, Style, and Act': 'Practice choosing language, tone, and delivery for specific audiences.',
            'Principles of Speech Writing and Delivery': 'Prepare clear speeches with organized points and confident delivery.'
        };
        const statusText = {
            completed: 'Done',
            'in-progress': 'In Progress',
            'not-started': 'Locked'
        };
        const overallColor = overallPct >= 90 ? 'text-green-600' : overallPct >= 80 ? 'text-icc' : overallPct >= 75 ? 'text-yellow-600' : overallPct > 0 ? 'text-red-500' : 'text-gray-400';
        const renderTopicCard = (topic, index) => `
            <button type="button" class="teacher-topic-card" onclick="openTopicContent('${subjectId}', ${index})">
                <img src="${topicImages[index % topicImages.length]}" alt="" class="teacher-topic-card__image">
                <div class="teacher-topic-card__body">
                    <div class="teacher-topic-card__meta">
                        <span>Topic ${index + 1}</span>
                        <i class="fa-solid ${statusIconClass[topic.status] || 'fa-circle text-gray-200'}"></i>
                    </div>
                    <h3>${topic.title}</h3>
                    <p>${topicOverview[topic.title] || `Review the key concepts, activities, and learning outputs for ${topic.title}.`}</p>
                    <div class="teacher-topic-card__footer">
                        <span class="teacher-topic-status">${statusText[topic.status] || 'Open'}</span>
                        <span class="teacher-topic-open">Open <i class="fa-solid fa-arrow-right"></i></span>
                    </div>
                </div>
            </button>
        `;

        page.innerHTML = `
            <div class="teacher-topic-page-shell">
                <div class="teacher-topic-page-grid">
                    <div class="teacher-topic-main-shell">
                        <div class="teacher-topic-header">
                            <h1>Topics</h1>
                        </div>
                        <div class="teacher-topic-list">
                            ${data.q1Topics.map((topic, index) => renderTopicCard(topic, index)).join('')}
                        </div>
                    </div>

                    <div class="teacher-topic-progress-rail">
                        <div class="teacher-topic-progress-card">
                            <p class="teacher-topic-progress-kicker">Progress</p>
                            <div class="text-center py-1">
                                <div class="teacher-topic-progress-percent text-gray-900">${overallPct}%</div>
                                <p class="text-[10px] text-gray-400 mt-1">${q1Done} of ${q1Total} topics done</p>
                            </div>
                            <div>
                                <div class="flex justify-between items-center mb-1.5">
                                    <span class="teacher-topic-progress-label">1st Quarter</span>
                                    <span class="text-[10px] font-black text-gray-900">${quarter1Pct}%</span>
                                </div>
                                <div class="teacher-topic-progress-bar bg-gray-100">
                                    <div class="h-full bg-icc rounded-full transition-all" style="width:${quarter1Pct}%"></div>
                                </div>
                            </div>
                            <div class="pt-3 border-t border-gray-100">
                                <div class="flex justify-between items-center">
                                    <span class="teacher-topic-progress-label">2nd Quarter</span>
                                    <span class="text-[10px] font-black text-gray-900">${quarter2Pct}%</span>
                                </div>
                                <div class="teacher-topic-progress-bar bg-gray-100 mt-1.5">
                                    <div class="h-full bg-icc rounded-full transition-all" style="width:${quarter2Pct}%"></div>
                                </div>
                            </div>
                        </div>

                        <div class="teacher-topic-progress-card">
                            <p class="teacher-topic-progress-kicker">Overall</p>
                            <div class="text-center py-3">
                                <div class="teacher-topic-overall-percent ${overallColor}">${overallPct}%</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // --- TOPIC CONTENT SYSTEM (Standardized) ---
    const TAB_LABELS = { videos: 'Videos', handouts: 'Handouts', assignments: 'Assignments', quiz: 'Quiz', activity: 'Activity', performance: 'Performance Task' };
    const TAB_ICONS = {
        videos: 'fa-solid fa-play',
        handouts: 'fa-solid fa-file-pdf',
        assignments: 'fa-solid fa-file-pen',
        quiz: 'fa-solid fa-square-poll-vertical',
        activity: 'fa-solid fa-flask',
        performance: 'fa-solid fa-star'
    };

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

    let currentTopicState = {
        subjectId: null,
        topicIdx: null,
        activeTab: 'videos',
        videoIdx: 0
    };

    window.openTopicContent = function (subjectId, topicIdx, tab = 'videos', videoIdx = 0) {
        const data = getTopicData(subjectId);
        const subject = getTopicSubject(subjectId);
        if (!data || !subject) return;

        currentTopicState = { subjectId, topicIdx, activeTab: tab, videoIdx };

        buildTopicContentPage(subjectId, topicIdx);
        hideAllSections();
        showSection('section-topic-content');
        
        // On desktop, swap sub-sidebar to topic contents
        if (window.innerWidth >= 1024) {
            renderTopicContentsSidebar(subjectId, topicIdx, tab);
        }
    };

    window.switchTopicTab = function (tab) {
        currentTopicState.activeTab = tab;
        currentTopicState.videoIdx = 0;
        _renderTopicContentMain();
        renderTopicContentsSidebar(currentTopicState.subjectId, currentTopicState.topicIdx, tab);
    };

    function getTopicTabs() {
        const { subjectId, topicIdx } = currentTopicState;
        const data = getTopicData(subjectId);
        const topic = data.q1Topics[topicIdx];
        const tabs = [];
        if (topic.videos?.length || topicVideos[subjectId]) tabs.push('videos');
        if (topic.handouts?.length || topicHandouts[subjectId]) tabs.push('handouts');
        tabs.push('assignments', 'quiz', 'activity', 'performance');
        return tabs;
    }

    function buildTopicContentPage(subjectId, topicIdx) {
        const page = document.getElementById('section-topic-content');
        if (!page) return;
        
        page.innerHTML = `
            <div class="mx-auto max-w-[1024px] w-full px-4 py-0 min-w-0">
                <div class="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm min-h-screen overflow-hidden flex flex-col">
                    <!-- Top Navigation Bar -->
                    <div class="px-10 py-6 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0 z-20">
                        <div class="flex items-center gap-3">
                            <button onclick="switchToTopicPage('${subjectId}')" class="text-gray-400 hover:text-icc transition-colors font-bold text-xs flex items-center gap-2 uppercase tracking-widest">
                                <i class="fa-solid fa-arrow-left text-[10px]"></i> Back
                            </button>
                            <span class="text-gray-300">•</span>
                            <span class="text-[11px] font-black text-gray-400 uppercase tracking-widest truncate max-w-[200px]">
                                ${getTopicSubject(subjectId).text}
                            </span>
                        </div>
                        <div class="flex items-center gap-4">
                            <div class="flex items-center gap-1.5 px-3 py-1.5 bg-icc-light rounded-full">
                                <i class="fa-solid fa-bolt text-icc text-[10px]"></i>
                                <span class="text-[10px] font-black text-icc uppercase tracking-widest">SIGMA Optimized</span>
                            </div>
                        </div>
                    </div>

                    <!-- Main Content Area -->
                    <div id="topic-content-main" class="flex-1 overflow-y-auto px-10 py-8 custom-scrollbar">
                        <!-- Content injected by _renderTopicContentMain() -->
                    </div>
                </div>
            </div>
        `;

        _renderTopicContentMain();
    }

    function _renderTopicContentMain() {
        const container = document.getElementById('topic-content-main');
        if (!container) return;

        const { subjectId, topicIdx, activeTab, videoIdx } = currentTopicState;
        const data = getTopicData(subjectId);
        const subject = getTopicSubject(subjectId);
        const topic = data.q1Topics[topicIdx];

        container.innerHTML = '';
        
        let html = '';
        if (activeTab === 'videos') {
            html = _buildVideosTab(subject, topic, subjectId, topicIdx, videoIdx);
        } else if (activeTab === 'handouts') {
            html = _buildHandoutsTab(subject, topic, subjectId, topicIdx);
        } else {
            html = _buildAssessmentTab(activeTab, subject, topic, data);
        }

        container.innerHTML = html;

        // Initialize any sliders if needed
        const handouts = topic.handouts || topicHandouts[subjectId] || [];
        if (activeTab === 'handouts') {
            handouts.forEach((h, i) => {
                if (h.type === 'ppt' && h.slides) {
                    new HandoutSlider(`handout-slider-${i}`, h.slides);
                }
            });
        }
    }

    function _tabNav(currentTab) {
        const tabs = getTopicTabs();
        const idx = tabs.indexOf(currentTab);
        const prev = idx > 0 ? tabs[idx - 1] : null;
        const next = idx < tabs.length - 1 ? tabs[idx + 1] : null;

        return `
            <div class="flex items-center justify-between w-full py-5">
                ${prev ? `
                <button onclick="switchTopicTab('${prev}')"
                    title="${TAB_LABELS[prev]}"
                    class="h-10 min-w-[56px] px-4 rounded-xl bg-icc hover:bg-icc-dark text-white text-xs font-bold transition-all flex items-center justify-center gap-2">
                    <i class="fa-solid fa-chevron-left text-[10px]"></i>
                    <i class="${TAB_ICONS[prev]} text-[14px]"></i>
                </button>` : '<div class="w-10 h-10"></div>'}

                <div class="flex items-center gap-2">
                    ${tabs.map(t => `
                        <button onclick="switchTopicTab('${t}')"
                            class="w-10 h-10 rounded-xl flex items-center justify-center transition-all ${t === currentTab ? 'bg-icc text-white shadow-lg shadow-icc/20' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}">
                            <i class="${TAB_ICONS[t]} text-[14px]"></i>
                        </button>
                    `).join('')}
                </div>

                ${next ? `
                <button onclick="switchTopicTab('${next}')"
                    title="${TAB_LABELS[next]}"
                    class="h-10 min-w-[56px] px-4 rounded-xl bg-icc hover:bg-icc-dark text-white text-xs font-bold transition-all flex items-center justify-center gap-2">
                    <i class="${TAB_ICONS[next]} text-[14px]"></i>
                    <i class="fa-solid fa-chevron-right text-[10px]"></i>
                </button>` : '<div class="w-10 h-10"></div>'}
            </div>
        `;
    }

    function _buildVideosTab(subject, topic, subjectId, topicIdx, activeIdx) {
        const videos = topic.videos || (topicVideos[subjectId] ? [{ id: 1, title: topic.title, duration: '12:45', url: topicVideos[subjectId] }] : []);
        const activeVideo = videos[activeIdx] || videos[0];
        const otherVideos = videos.filter((_, i) => i !== activeIdx);

        if (!activeVideo) {
            return `
                ${_tabNav('videos')}
                <div class="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">
                    <i class="fa-solid fa-video text-4xl text-gray-300 mb-4"></i>
                    <p class="text-xl font-black text-gray-800">No videos yet</p>
                    <p class="text-sm text-gray-500 mt-2">This topic lesson does not have any videos yet.</p>
                </div>
            `;
        }

        return `
            ${_tabNav('videos')}
            <div class="aspect-video bg-black rounded-3xl overflow-hidden mb-8 shadow-2xl relative group">
                <iframe src="${activeVideo.url}" class="w-full h-full border-none" allowfullscreen></iframe>
            </div>
            <div class="mb-10">
                <h3 class="text-2xl font-black text-gray-900">${activeVideo.title}</h3>
                <p class="text-gray-500 mt-2 leading-relaxed">Lesson module video covering the core concepts of ${topic.title}. Watch thoroughly to prepare for the upcoming assessments.</p>
            </div>
            ${otherVideos.length ? `
            <div class="space-y-4">
                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">More in this topic</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${otherVideos.map((v, i) => `
                        <button onclick="openTopicContent('${subjectId}', ${topicIdx}, 'videos', ${videos.indexOf(v)})" class="bg-white border border-gray-100 p-4 rounded-2xl flex items-center gap-4 hover:shadow-md transition-all text-left">
                            <div class="w-20 aspect-video bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <i class="fa-solid fa-play text-gray-300"></i>
                            </div>
                            <div class="min-w-0">
                                <p class="text-sm font-bold text-gray-800 truncate">${v.title}</p>
                                <p class="text-[10px] text-gray-400 font-bold uppercase mt-1">${v.duration}</p>
                            </div>
                        </button>
                    `).join('')}
                </div>
            </div>` : ''}
        `;
    }

    function _buildHandoutsTab(subject, topic, subjectId, topicIdx) {
        const handouts = topic.handouts || topicHandouts[subjectId] || [];
        
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

        return `
            ${_tabNav('handouts')}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                ${handouts.map((h, i) => {
                    const isPpt = h.type === 'ppt';
                    const icon = isPpt ? 'fa-file-powerpoint text-orange-500' : (h.type === 'DOC' || h.type === 'DOCX' ? 'fa-file-word text-blue-500' : 'fa-file-pdf text-red-500');
                    const bg = isPpt ? 'bg-orange-50' : (h.type === 'DOC' || h.type === 'DOCX' ? 'bg-blue-50' : 'bg-red-50');

                    if (isPpt && h.slides) {
                        return `
                            <div class="ppt-handout-container bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4 md:col-span-2">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <h3 class="text-lg font-black text-gray-800">${h.title}</h3>
                                        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Presentation • ${h.slides.length} Slides</p>
                                    </div>
                                    <div class="w-10 h-10 rounded-xl ${bg} flex items-center justify-center">
                                        <i class="fa-solid ${icon} text-lg"></i>
                                    </div>
                                </div>
                                <div id="handout-slider-${i}" class="min-h-[240px]"></div>
                            </div>
                        `;
                    }

                    return `
                        <div class="bg-white border border-gray-100 p-5 rounded-2xl flex items-center gap-4 hover:shadow-md transition-all cursor-pointer">
                            <div class="w-14 h-14 rounded-xl ${bg} flex items-center justify-center flex-shrink-0">
                                <i class="fa-solid ${icon} text-2xl"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-black text-gray-800 leading-tight truncate">${h.title || h.name}</p>
                                <p class="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest">${h.type} • ${h.size || 'N/A'}</p>
                            </div>
                            <button class="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-icc hover:text-white transition-all flex items-center justify-center">
                                <i class="fa-solid fa-download text-xs"></i>
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    function _buildAssessmentTab(tab, subject, topic, data) {
        const labels = { assignments: 'Assignment', quiz: 'Quiz', activity: 'Activity', performance: 'Performance Task' };
        const label = labels[tab];
        const amd = assessmentData.default;

        return `
            ${_tabNav(tab)}
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div class="lg:col-span-2 space-y-6">
                    <div class="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                        <h3 class="text-xl font-black text-gray-900 mb-4">${label} Instructions</h3>
                        <p class="text-gray-600 leading-relaxed">Complete the required output for ${topic.title}. Ensure all criteria in the rubric are met before submission. For technical questions, contact your instructor via the classroom portal.</p>
                        
                        <div class="mt-8 bg-gray-50 rounded-2xl p-6 border border-dashed border-gray-200">
                            <div class="flex items-center gap-4 text-gray-400">
                                <i class="fa-solid fa-cloud-arrow-up text-3xl"></i>
                                <div>
                                    <p class="text-sm font-bold text-gray-500">Submission restricted</p>
                                    <p class="text-xs">Teacher portal: Viewing submission template mode.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white border border-gray-100 rounded-3xl overflow-hidden">
                        <div class="px-8 py-5 border-b border-gray-100">
                            <p class="text-sm font-black text-gray-900 uppercase tracking-widest">Assessment Schedule</p>
                        </div>
                        <div class="p-8 grid grid-cols-2 gap-6">
                            <div class="bg-gray-50 rounded-2xl p-5">
                                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Start Date</p>
                                <p class="text-base font-black text-gray-800">${amd.startDate}</p>
                                <p class="text-xs text-gray-500 mt-0.5">${amd.startTime}</p>
                            </div>
                            <div class="bg-red-50 rounded-2xl p-5">
                                <p class="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Due Date</p>
                                <p class="text-base font-black text-red-600">${amd.dueDate}</p>
                                <p class="text-xs text-red-400 mt-0.5">${amd.dueTime}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="space-y-6">
                    <div class="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm text-center">
                        <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Max Score</p>
                        <div class="text-6xl font-black text-icc mb-2">${amd.maxScore}</div>
                        <p class="text-xs text-gray-400 font-bold">Total Points Possible</p>
                    </div>

                    <div class="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                        <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Settings</p>
                        <div class="space-y-4">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-bold text-gray-500">Max Attempts</span>
                                <span class="text-xs font-black text-gray-900">${amd.maxAttempts}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-bold text-gray-500">Late Permitted</span>
                                <span class="text-xs font-black ${amd.latePermission ? 'text-icc' : 'text-red-500'}">${amd.latePermission ? 'Yes' : 'No'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderTopicContentsSidebar(subjectId, topicIdx, activeTab) {
        const content = document.getElementById('sub-sidebar-content');
        const title = document.getElementById('sub-sidebar-title');
        const header = document.getElementById('sub-sidebar-header');
        if (!content) return;

        if (header) header.classList.remove('hidden');
        if (title) title.textContent = 'Topic Navigator';

        const data = getTopicData(subjectId);
        const topic = data.q1Topics[topicIdx];
        const tabs = getTopicTabs();

        content.innerHTML = `
            <div class="p-2 space-y-1">
                ${tabs.map(t => `
                    <button onclick="switchTopicTab('${t}')" class="w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 group ${t === activeTab ? 'bg-icc-light text-icc' : 'hover:bg-gray-50 text-gray-500'}">
                        <i class="${TAB_ICONS[t]} text-sm ${t === activeTab ? 'text-icc' : 'text-gray-300 group-hover:text-icc'}"></i>
                        <span class="text-[11px] font-black uppercase tracking-widest ${t === activeTab ? 'text-icc' : 'text-gray-500'}">${TAB_LABELS[t]}</span>
                    </button>
                `).join('')}
            </div>
            <div class="mt-4 pt-4 border-t border-gray-50 px-4">
                <p class="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] mb-4">Other Topics</p>
                <div class="space-y-1">
                    ${data.q1Topics.map((t, i) => `
                        <button onclick="openTopicContent('${subjectId}', ${i})" class="w-full text-left p-2 rounded-lg transition-all flex items-start gap-2 group ${i === topicIdx ? 'opacity-40 cursor-default' : 'hover:bg-gray-50'}">
                            <div class="w-1 h-1 rounded-full bg-gray-200 mt-1.5 flex-shrink-0 ${i === topicIdx ? 'bg-icc' : ''}"></div>
                            <span class="text-[11px] font-bold text-gray-500 leading-tight truncate ${i === topicIdx ? 'text-icc' : ''}">${t.title}</span>
                        </button>
                    `).join('')}
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

    window.handleHandoutSlider = function(id, delta) {
        if (window.handoutSliders && window.handoutSliders[id]) {
            window.handoutSliders[id].move(delta);
        }
    };



    // --- Layout Utility ---
    function updateLayout() {
        if (!layoutWrapper) return;

        if (window.innerWidth < 1024) {
            layoutWrapper.style.marginLeft = '0';
            return;
        }

        const subSidebar = document.getElementById('sub-sidebar');
        const isSubVisible = subSidebar && !subSidebar.classList.contains('hidden') && !subSidebar.classList.contains('subjects-hover-subsidebar');
        const isCollapsed = document.body.classList.contains('sidebar-collapsed');

        const mainWidth = isCollapsed ? 82 : 280;
        const subWidth = isSubVisible ? 240 : 0;

        layoutWrapper.style.marginLeft = (mainWidth + subWidth) + 'px';

        if (subSidebar) {
            subSidebar.style.left = mainWidth + 'px';
        }
    }

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
    window.switchTab = function (navId, pushHistory = true) {
        // Auto-close mobile sidebar
        if (window.innerWidth < 1024) {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (sidebar) sidebar.classList.remove('sidebar-visible');
            if (overlay) overlay.classList.add('hidden');
        }

        const targetSectionId = sectionMap[navId];
        if (!targetSectionId) return;

        if (pushHistory) {
            history.pushState({ type: 'tab', navId }, '', '');
        }

        resetClassroomDetailLayout();

        // Close side panels when switching main sections
        closeAiPanel();
        document.querySelectorAll('[id$="Menu"], [id$="Panel"], [id$="dropdown"]').forEach(m => {
            if (m.id !== 'user-profile-tab-panel' && m.id !== 'layout-wrapper') m.classList.add('hidden');
        });
        document.querySelectorAll('.relative button').forEach(b => b.classList.remove('active'));

        // Update active nav link
        navLinks.forEach(l => l.classList.remove('active'));
        const activeLink = document.getElementById(navId);
        if (activeLink) activeLink.classList.add('active');

        // Handle Sections
        document.querySelectorAll('.dynamic-section').forEach(s => s.classList.add('hidden'));
        const targetSection = document.getElementById(targetSectionId);
        if (targetSection) targetSection.classList.remove('hidden');

        // Hard-link assessments tab to its renderer immediately so it never opens blank.
        if (navId === 'nav-assessments') {
            sectionFeatureInit.assessments = true;
            renderAssessmentsPage();
        }

        // Hard-link grades tab to gradebook view so it never opens blank.
        if (navId === 'nav-grades') {
            if (!sectionFeatureInit.gradebook) {
                sectionFeatureInit.gradebook = true;
                initGradebook();
            }
            switchGradesSubTab('gradebook');
        }

        // Special layout modes
        if (navId === 'nav-subjects') {
            resetSubjectsInlineExplorer(true);
            currentInlineProgram = null;
            currentCurriculumProgram = null;
        }
        setSubjectsPanelsMode(navId === 'nav-subjects');

        // Update Nav Context Title
        const navContextText = document.getElementById('nav-context-text');
        if (navContextText) {
            if (navId === 'nav-classes') {
                navContextText.textContent = 'Sections';
            } else {
                navContextText.textContent = 'Interface Computer College';
            }
        }

        // Update Sub-Sidebar
        updateSubSidebar(navId);

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
            if (typeof window.renderHomeSubjectRail === 'function') {
                window.renderHomeSubjectRail();
            }
        }

        updateLayout();
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
        const loginPage = 'index.html';

        // Initialize root state to prevent back to login
        if (!history.state) {
            history.replaceState({ type: 'root' }, '', '');
            history.pushState({ type: 'tab', navId: 'nav-dashboard' }, '', '');
        }

        window.addEventListener('popstate', (event) => {
            // If they hit back beyond the entry dashboard (type root or null)
            if (!event.state || event.state.type === 'root') {
                // Bounce them back into the teacher portal dashboard
                history.pushState({ type: 'tab', navId: 'nav-dashboard' }, '', '');
                switchTab('nav-dashboard', false);
                return;
            }

            const { type, navId, className, subject, initialTab } = event.state;

            if (type === 'tab') {
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
                switchTab(navId, false);
            } else if (type === 'classroom') {
                showStudentList(className, subject, initialTab, false);
            }
        });
    };

    setupNavigationHistory();

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
            studentList.innerHTML = students
                .slice(0, 10)
                .map(student => `<button type="button" class="classroom-room-person">${student.name}</button>`)
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
            <article id="room-post-${post.id}" class="bg-white border border-slate-200 rounded-[22px] relative w-full overflow-hidden transition-all duration-500 group mb-4">
                <div class="p-6 flex flex-col min-w-0">
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
                        <span class="text-[10px] font-medium text-slate-400 tracking-tight mt-0.5">${dateLabel}</span>
                    </div>

                    <!-- Subject title + grade/section -->
                    <div class="mb-3 pl-[3.25rem]">
                        <h3 class="text-[17px] font-black text-slate-900 leading-tight">${subjectName || 'Classroom Post'}</h3>
                        ${gradeSection ? `<p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">${gradeSection}</p>` : ''}
                    </div>

                    <!-- Post body -->
                    <div class="pl-[3.25rem] text-[15px] text-slate-700 leading-relaxed classroom-announcement-content">
                        ${post.html}
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
        const note = document.getElementById('attendance-mode-note');
        const students = studentsBySection[currentClassroomSectionName] || [];
        const mode = getCurrentAttendanceMode();
        const savedStatuses = getCurrentAttendanceStatuses();
        const savedExcuses = getCurrentAttendanceExcuses();

        if (!recordingBody) return;

        if (note) {
            if (mode === 'trust') {
                note.textContent = 'Students Press Present is on. This list updates as students check themselves in from their attendance tab.';
                note.classList.remove('hidden');
            } else {
                note.classList.add('hidden');
                note.textContent = '';
            }
        }

        recordingBody.innerHTML = students.map(student => {
            const currentStatus = savedStatuses[student.name] || '';
            const excuse = savedExcuses[student.name];
            return `
                <tr class="hover:bg-gray-50/50 transition-colors group" data-student-name="${student.name}" data-status="${currentStatus}">
                    <td class="px-2 md:px-3 py-3 md:py-4 sticky left-0 z-10 bg-white border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] group-hover:bg-gray-50/50 transition-colors">
                        <div class="flex items-center gap-2 md:gap-3">
                            <div class="w-8 h-8 rounded-lg bg-icc-light flex items-center justify-center text-icc font-bold text-xs uppercase flex-shrink-0">
                                ${student.name.split(', ')[1][0]}${student.name[0]}
                            </div>
                            <span class="text-xs md:text-sm font-bold text-gray-800 line-clamp-2 md:line-clamp-1 leading-tight">${student.name}</span>
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
                    : `<span class="text-[10px] md:text-xs font-bold text-gray-300 whitespace-nowrap">${mode === 'trust' ? 'No submission' : 'No excuse'}</span>`}
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
        dateEl.textContent = `${dateText} • ${timeText}`;
    }

    function applyClassroomSettingsUI() {
        const mode = getCurrentAttendanceMode();
        const commentMode = getCurrentCommentMode();
        classroomSettingsMenu?.querySelectorAll('[data-attendance-mode]').forEach(button => {
            button.classList.toggle('is-active', button.dataset.attendanceMode === mode);
        });
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
    window.showStudentList = function (className, subject, initialTab = 'room', pushHistory = true) {
        if (pushHistory) {
            history.pushState({ type: 'classroom', className, subject, initialTab }, '', '');
        }

        currentClassroomKey = `${className}::${subject}`;
        currentClassroomSectionName = className;
        currentClassroomMeta = classroomMetaBySubject[`${className}::${subject}`] || null;

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

        if (sectionClasses) sectionClasses.classList.add('hidden');
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
        renderClassroomSectionsSidebar(className, subject);

        renderRoomPeoplePanel(className, subject);
        renderRoomAnnouncementsFeed();
        applyClassroomSettingsUI();

        // 3. Attendance Recording Setup (Data Part)
        if (recordingBody && studentsBySection[className]) renderAttendanceRecordingRows();

        // Open the section room in the requested tab.
        if (typeof switchClassDetailTab === 'function') {
            switchClassDetailTab(initialTab || 'room');
        }
    };

    window.openCurrentClassroomTopics = function () {
        const subjectName = (currentClassroomKey || '').split('::')[1] || '';
        if (!subjectName) return;
        const allSubjects = Object.values(window.subjectsData || {}).flat();
        const matched = allSubjects.find(subject => subject.name === subjectName);
        const programKey = matched?.programKey || 'core-subjects';
        const program = curriculumPrograms[programKey];
        const direct = (program?.subjects || []).find(subject => subject.title === subjectName || subject.text === subjectName);
        const targetId = direct?.id || (matched?.id && getTopicData(matched.id) ? matched.id : ensureSubjectDataForTitle(subjectName, program?.title || 'Subjects').id);
        switchToTopicPage(targetId);
    };

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

    window.closeAnnouncementPad = function () {
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
        const mode = getCurrentAttendanceMode();
        const savedStatuses = getCurrentAttendanceStatuses();
        const savedExcuses = getCurrentAttendanceExcuses();
        const statuses = {};
        rows.forEach(row => {
            const name = row.dataset.studentName;
            if (!name) return;
            statuses[name] = mode === 'trust' ? (savedStatuses[name] || '') : (row.dataset.status || '');
        });
        saveCurrentAttendanceStatuses(statuses, savedExcuses);

        btn.disabled = true;

        setTimeout(() => {
            btn.disabled = false;
            switchClassDetailTab('room');
        }, 150);
    };

    window.switchClassDetailTab = function (tabId) {
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
        if (tabId === 'attendance') renderAttendanceRecordingRows();

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
            const header = document.getElementById('teacher-header');
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

    classroomSettingsMenu?.querySelectorAll('[data-attendance-mode]').forEach(button => {
        button.addEventListener('click', () => {
            const mode = button.dataset.attendanceMode;
            if (!mode) return;
            saveCurrentAttendanceMode(mode);
            applyClassroomSettingsUI();
            renderAttendanceRecordingRows();
        });
    });

    classroomSettingsMenu?.querySelectorAll('[data-comment-mode]').forEach(button => {
        button.addEventListener('click', () => {
            const mode = button.dataset.commentMode;
            if (!mode) return;
            saveCurrentCommentMode(mode);
            applyClassroomSettingsUI();
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
                            <div>• Maria Santos: Gen Math (72%)</div>
                            <div>• Juan Dela Cruz: Programming (68%)</div>
                            <div>• Ana Reyes: Empowerment Tech (71%)</div>
                        </div>
                    </div>
                    <div class="bg-white/30 p-3 rounded-lg">
                        <div class="font-semibold text-red-600 mb-1">Immediate Actions Required</div>
                        <div class="text-xs space-y-1">
                            <div>• Schedule parent-teacher conferences</div>
                            <div>• Arrange tutoring for Programming</div>
                            <div>• Monitor progress weekly</div>
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
                            <div>• 4 students consistently silent in class</div>
                            <div>• Reduced participation in forum discussions</div>
                            <div>• Late logins to LMS recorded for 6 students</div>
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
                            <div>• Lab #4: 8 students have not submitted</div>
                            <div>• Quiz #2: 3 students missed deadline</div>
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
                            <div>• Database normalization: 45% errors</div>
                            <div>• CSS Grid layouts: 38% incomplete</div>
                        </div>
                    </div>
                    <div class="bg-white/30 p-3 rounded-lg">
                        <div class="font-semibold text-green-600 mb-2">Recommended Interventions</div>
                        <div class="text-xs space-y-1">
                            <div>• Schedule review sessions</div>
                            <div>• Provide practice materials</div>
                            <div>• One-on-one consultations</div>
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
                            <div>• 12 students affected</div>
                            <div>• Inheritance: 65% struggling</div>
                            <div>• Polymorphism: 58% incomplete</div>
                        </div>
                    </div>
                    <div class="bg-white/30 p-3 rounded-lg">
                        <div class="font-semibold text-blue-600 mb-2">Implementation Plan</div>
                        <div class="text-xs space-y-1">
                            <div>• Peer tutoring program</div>
                            <div>• Interactive coding exercises</div>
                            <div>• Visual learning aids</div>
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
                            <div>• Carlo Mendoza: 3 consecutive days</div>
                            <div>• Sofia Garcia: 2 consecutive days</div>
                            <div>• Assignment submissions: -15%</div>
                        </div>
                    </div>
                    <div class="bg-white/30 p-3 rounded-lg">
                        <div class="font-semibold text-orange-600 mb-2">Follow-up Actions</div>
                        <div class="text-xs space-y-1">
                            <div>• Contact parents immediately</div>
                            <div>• Provide catch-up materials</div>
                            <div>• Monitor engagement patterns</div>
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
                            <div class="text-green-600">✓ 8 students improved in Web Dev (+12% avg)</div>
                            <div class="text-red-600">⚠ 6 students showing burnout signs</div>
                            <div>• Declining quiz scores despite attendance</div>
                        </div>
                    </div>
                    <div class="bg-white/30 p-3 rounded-lg">
                        <div class="font-semibold text-purple-600 mb-2">Support Recommendations</div>
                        <div class="text-xs space-y-1">
                            <div>• Adjust workload distribution</div>
                            <div>• Provide mental health resources</div>
                            <div>• Implement progress check-ins</div>
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
        { title: 'Quiz 4 • Programming 1', when: 'Due Today • 11:59 PM', status: 'Due' },
        { title: 'Lab Activity 3 • Empowerment Tech', when: 'Apr 11 • 10:00 AM', status: 'Upcoming' },
        { title: 'Performance Task • Database Management', when: 'Apr 12 • 3:00 PM', status: 'Upcoming' }
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
                    <p class="text-[11px] text-gray-500 mt-0.5">${item.room}${item.section ? ` - ${item.section}` : ''}</p>
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
        weights: loadGradebookWeights()
    };

    // Data storage for scores
    let gradebookScores = {}; // { studentId: { category: { itemId: score } } }

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


    function initGradebook() {
        const sectionSelector = document.getElementById('gradebook-section-selector');
        const subjectSelector = document.getElementById('gradebook-subject-selector');
        const tabs = document.getElementById('gradebook-quarter-tabs');
        setupGradebookDragScroll();

        if (!sectionSelector || !subjectSelector) return;

        const buildAllSubjects = () => {
            const data = window.subjectsData || {};
            const all = [
                ...(Array.isArray(data.core) ? data.core : []),
                ...(Array.isArray(data.academic) ? data.academic : []),
                ...(Array.isArray(data.techpro) ? data.techpro : [])
            ];

            const filtered = all.filter(s => s && s.name);

            // Unique by name (case-insensitive)
            const seen = new Set();
            return filtered
                .filter(s => {
                    const key = String(s.name).trim().toLowerCase();
                    if (!key || seen.has(key)) return false;
                    seen.add(key);
                    return true;
                })
                .sort((a, b) => String(a.name).localeCompare(String(b.name)));
        };

        const populateSubjectSelector = () => {
            const subjects = buildAllSubjects();
            subjectSelector.innerHTML = `
                <option value="" disabled selected>Select Subject</option>
                ${subjects.map(s => `<option value="${String(s.name).replace(/"/g, '&quot;')}">${s.name}</option>`).join('')}
            `;
        };

        // Always preload the full subject list (even while disabled).
        populateSubjectSelector();

        sectionSelector.onchange = () => {
            gradebookState.selectedSection = sectionSelector.value;
            if (sectionSelector.value) {
                subjectSelector.disabled = false;
                subjectSelector.classList.remove('cursor-not-allowed', 'opacity-50');
                subjectSelector.classList.add('cursor-pointer', 'hover:bg-white');
                const firstOption = subjectSelector.querySelector('option[disabled]');
                if (firstOption) firstOption.textContent = 'Select Subject';
                populateSubjectSelector();
            } else {
                subjectSelector.disabled = true;
                subjectSelector.value = "";
                subjectSelector.classList.add('cursor-not-allowed', 'opacity-50');
                subjectSelector.classList.remove('cursor-pointer', 'hover:bg-white');
                tabs?.classList.add('hidden');
                populateSubjectSelector();
            }
            gradebookState.currentView = 'overview';
            gradebookState.selectedSubject = '';
            subjectSelector.value = "";
            renderGradebookSpreadsheet();
        };

        subjectSelector.onchange = () => {
            gradebookState.selectedSubject = subjectSelector.value;
            gradebookState.currentView = 'overview';
            gradebookState.currentQuarter = 1;
            if (subjectSelector.value) {
                tabs?.classList.remove('hidden');
            } else {
                tabs?.classList.add('hidden');
            }

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
        const scrollArea = document.getElementById('gradebook-scroll-area');
        if (!scrollArea) return;
        scrollArea.scrollTop = 0;
        scrollArea.scrollLeft = 0;
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
        // Update tab buttons
        for (let i = 1; i <= 4; i++) {
            const btn = document.getElementById(`quarter-btn-${i}`);
            if (btn) {
                if (i === quarter) {
                    btn.classList.add('bg-white', 'text-icc', 'shadow-sm');
                    btn.classList.remove('text-gray-400');
                } else {
                    btn.classList.remove('bg-white', 'text-icc', 'shadow-sm');
                    btn.classList.add('text-gray-400');
                }
            }
        }
        renderGradebookSpreadsheet();
        resetGradebookScrollPosition();
    };

    window.setGradebookView = (view) => {
        gradebookState.currentView = view;
        renderGradebookSpreadsheet();
        resetGradebookScrollPosition();
    };

    window.handleGradebookDragStart = (e, status) => {
        e.dataTransfer.setData('text/plain', status);
    };

    window.handleGradebookDragOver = (e) => {
        e.preventDefault();
        const td = e.target.closest('td');
        if (td) td.classList.add('bg-gray-100', 'ring-2', 'ring-icc/20', 'ring-inset');
    };

    window.handleGradebookDragLeave = (e) => {
        const td = e.target.closest('td');
        if (td) td.classList.remove('bg-gray-100', 'ring-2', 'ring-icc/20', 'ring-inset');
    };

    window.handleGradebookDrop = (e) => {
        e.preventDefault();
        const td = e.target.closest('td');
        if (!td) return;

        td.classList.remove('bg-gray-100', 'ring-2', 'ring-icc/20', 'ring-inset');

        const status = e.dataTransfer.getData('text/plain');
        const colors = {
            'missing': 'bg-red-50',
            'incomplete': 'bg-amber-50',
            'absent': 'bg-gray-100',
            'excuse': 'bg-blue-50'
        };

        // Clear existing status bg colors
        Object.values(colors).forEach(c => td.classList.remove(c));

        const input = td.querySelector('input');
        if (colors[status]) {
            td.classList.add(colors[status]);
            if (input) {
                input.value = ''; // Clear score if status is dropped
                input.placeholder = status.charAt(0).toUpperCase() + status.slice(1, 3);
            }

            // Sync with status button if present
            const btn = td.querySelector(`.status-btn[title="${status.charAt(0).toUpperCase() + status.slice(1)}"]`);
            if (btn) toggleStudentStatus(btn, status);
        }
    };

    function renderGradebookSpreadsheet() {
        const section = gradebookState.selectedSection;
        const subject = gradebookState.selectedSubject;
        const body = document.getElementById('gradebook-body');
        const spreadsheet = document.getElementById('gradebook-spreadsheet');
        const tableHead = spreadsheet?.querySelector('thead');

        if (!section || !subject) {
            if (body) body.innerHTML = `<tr><td colspan="10" class="py-20 text-center text-gray-400 text-xs font-medium uppercase tracking-widest">Please select section and subject</td></tr>`;
            if (tableHead) tableHead.innerHTML = '';
            return;
        }

        if (gradebookState.currentView === 'overview') {
            renderQuarterlyOverview();
        } else if (gradebookState.currentView === 'ww-sub') {
            renderWWSubCategories();
        } else {
            renderGradebookDetailView(gradebookState.currentView);
        }
    }

    // Extended Student List
    const gradebookStudents = [
        { id: '2024-001', name: 'Dela Cruz, Juan' },
        { id: '2024-002', name: 'Santos, Maria' },
        { id: '2024-003', name: 'Garcia, Anna' },
        { id: '2024-004', name: 'Mendoza, Carlo' },
        { id: '2024-005', name: 'Reyes, Sofia' },
        { id: '2024-006', name: 'Aquino, Paolo' },
        { id: '2024-007', name: 'Bautista, Elena' },
        { id: '2024-008', name: 'Castro, Miguel' },
        { id: '2024-009', name: 'Domingo, Clara' },
        { id: '2024-010', name: 'Estrada, Luis' },
        { id: '2024-011', name: 'Fernando, Gina' },
        { id: '2024-012', name: 'Guevarra, Rico' },
        { id: '2024-013', name: 'Hernandez, Rosa' },
        { id: '2024-014', name: 'Ibarra, Simon' },
        { id: '2024-015', name: 'Javier, Teresa' }
    ].sort((a, b) => a.name.localeCompare(b.name));

    function calculateCategoryPercentage(studentId, category) {
        const studentScores = gradebookScores[studentId]?.[category];
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
        const studentScores = gradebookScores[studentId]?.[category];
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

    const gradebookCategoryDetails = {
        'assignment': [
            { title: 'ASG #1', date: 'Mar 10, 2026', max: 20 },
            { title: 'ASG #2', date: 'Mar 15, 2026', max: 20 },
            { title: 'ASG #3', date: 'Mar 22, 2026', max: 20 },
            { title: 'ASG #4', date: 'Apr 02, 2026', max: 20 },
            { title: 'ASG #5', date: 'Apr 09, 2026', max: 20 },
            { title: 'ASG #6', date: 'Apr 16, 2026', max: 20 },
            { title: 'ASG #7', date: 'Apr 23, 2026', max: 20 },
            { title: 'ASG #8', date: 'Apr 30, 2026', max: 20 },
            { title: 'ASG #9', date: 'May 07, 2026', max: 20 },
            { title: 'ASG #10', date: 'May 14, 2026', max: 20 },
            { title: 'ASG #11', date: 'May 21, 2026', max: 20 },
            { title: 'ASG #12', date: 'May 28, 2026', max: 20 }
        ],
        'quiz': [
            { title: 'Quiz 1', date: 'Mar 12, 2026', max: 30 },
            { title: 'Quiz 2', date: 'Mar 26, 2026', max: 30 },
            { title: 'Quiz 3', date: 'Apr 08, 2026', max: 30 },
            { title: 'Quiz 4', date: 'Apr 22, 2026', max: 30 },
            { title: 'Quiz 5', date: 'May 06, 2026', max: 30 },
            { title: 'Quiz 6', date: 'May 20, 2026', max: 30 },
            { title: 'Quiz 7', date: 'Jun 03, 2026', max: 30 },
            { title: 'Quiz 8', date: 'Jun 17, 2026', max: 30 }
        ],
        'activity': [
            { title: 'ACT #1', date: 'Mar 08, 2026', max: 50 },
            { title: 'ACT #2', date: 'Mar 18, 2026', max: 50 },
            { title: 'ACT #3', date: 'Apr 01, 2026', max: 50 },
            { title: 'ACT #4', date: 'Apr 15, 2026', max: 50 },
            { title: 'ACT #5', date: 'Apr 29, 2026', max: 50 },
            { title: 'ACT #6', date: 'May 13, 2026', max: 50 },
            { title: 'ACT #7', date: 'May 27, 2026', max: 50 },
            { title: 'ACT #8', date: 'Jun 10, 2026', max: 50 }
        ],
        'perf. task': [
            { title: 'Scoring 1', date: 'Mar 20, 2026', max: 50 },
            { title: 'Scoring 2', date: 'Apr 10, 2026', max: 60 },
            { title: 'Scoring 3', date: 'May 01, 2026', max: 75 },
            { title: 'Scoring 4', date: 'May 22, 2026', max: 80 },
            { title: 'Scoring 5', date: 'Jun 12, 2026', max: 90 },
            { title: 'Scoring 6', date: 'Jul 03, 2026', max: 100 },
            { title: 'Scoring 7', date: 'Jul 24, 2026', max: 85 },
            { title: 'Scoring 8', date: 'Aug 14, 2026', max: 95 }
        ],
        'qa': [
            { title: 'Quarterly Exam', date: 'Mar 30, 2026', max: 100 }
        ]
    };

    function getCategoryDetails(category) {
        return gradebookCategoryDetails[category] || [];
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

    function renderQuarterlyOverview() {
        const body = document.getElementById('gradebook-body');
        const avgEl = document.getElementById('gradebook-avg');
        const passingEl = document.getElementById('gradebook-passing');
        const spreadsheet = document.getElementById('gradebook-spreadsheet');
        const tableHead = spreadsheet.querySelector('thead');

        const nameTh = `
            <th class="w-48 px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-left border-r border-gray-50 bg-gray-100 sticky left-0 z-20">
                Student Name
            </th>`;

        // Quarterly Categories (WW, PT, QA)
        const categories = [
            { id: 'ww-sub', key: 'ww', label: 'Written Works', color: 'text-blue-600' },
            { id: 'pt', key: 'pt', label: 'PETA', color: 'text-green-600' },
            { id: 'qa', key: 'qa', label: 'Quarterly Assessment', color: 'text-purple-600' }
        ];

        let headerHtml = nameTh;
        categories.forEach(cat => {
            const weightValue = Number(gradebookState.weights?.[cat.key]);
            const weightLabel = Number.isFinite(weightValue) ? weightValue : 0;
            headerHtml += `
                <th onclick="setGradebookView('${cat.id}')" 
                    class="w-40 px-2 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center bg-gray-100 border-r border-gray-50 cursor-pointer hover:bg-gray-200 transition-colors group">
                    <div class="flex flex-col items-center gap-1.5">
                        <span class="group-hover:text-icc transition-colors">${cat.label}</span>
                        <span
                            class="gradebook-weight ${cat.color} normal-case text-[10px] font-black tracking-tight cursor-pointer hover:underline"
                            role="button"
                            tabindex="0"
                            data-weight-key="${cat.key}"
                            onclick="event.stopPropagation();"
                        >${weightLabel}%</span>
                        <i class="fa-solid fa-chevron-right text-[7px] text-gray-300 group-hover:text-icc"></i>
                    </div>
                </th>`;
        });

        headerHtml += `
            <th class="w-24 px-4 py-4 text-[10px] font-black text-icc uppercase tracking-widest text-center bg-icc/5 border-r border-icc/10">Initial</th>
            <th class="w-24 px-4 py-4 text-[10px] font-black text-icc uppercase tracking-widest text-center bg-icc/10">Quarterly</th>
        `;
        tableHead.innerHTML = `<tr class="border-b border-gray-200">${headerHtml}</tr>`;

        const clampToInt = (value) => {
            const cleaned = String(value ?? '').replace(/[^\d]/g, '');
            if (!cleaned) return null;
            const parsed = Math.floor(Number(cleaned));
            if (!Number.isFinite(parsed)) return null;
            return Math.min(100, Math.max(0, parsed));
        };

        const applyWeightUpdate = (key, nextValue) => {
            const weights = { ...(gradebookState.weights || { ww: 25, pt: 50, qa: 25 }) };
            const current = Number(weights[key]);
            const next = clampToInt(nextValue);
            if (next === null) return false;

            const otherKeys = ['ww', 'pt', 'qa'].filter(k => k !== key);
            const finalValue = Math.min(100, Math.max(0, next));
            weights[key] = finalValue;

            // Keep TOTAL <= 100 by reducing other weights automatically.
            let total = ['ww', 'pt', 'qa'].reduce((sum, k) => sum + (Number(weights[k]) || 0), 0);
            if (total > 100) {
                let overflow = total - 100;
                // Reduce other keys first (largest-first) so the edited value stays as requested.
                const reducers = otherKeys
                    .map(k => ({ k, v: Number(weights[k]) || 0 }))
                    .sort((a, b) => b.v - a.v);

                for (const item of reducers) {
                    if (overflow <= 0) break;
                    const take = Math.min(item.v, overflow);
                    weights[item.k] = item.v - take;
                    overflow -= take;
                }
            }

            if (!Number.isFinite(current) || finalValue !== current) {
                gradebookState.weights = weights;
                saveGradebookWeights(weights);
                renderGradebookSpreadsheet();
            }
            return true;
        };

        const weightsEls = tableHead.querySelectorAll('.gradebook-weight[data-weight-key]');
        weightsEls.forEach(el => {
            const key = el.dataset.weightKey;
            if (!key) return;

            const startEdit = () => {
                el.setAttribute('contenteditable', 'true');
                el.classList.add('underline');
                el.textContent = String(Number(gradebookState.weights?.[key] ?? 0));
                el.focus();
                document.getSelection()?.selectAllChildren(el);
            };

            const finishEdit = (commit = true) => {
                el.removeAttribute('contenteditable');
                el.classList.remove('underline');
                const committed = commit ? applyWeightUpdate(key, el.textContent) : false;
                const shown = Number(gradebookState.weights?.[key] ?? 0);
                el.textContent = `${shown}%`;
                return committed;
            };

            const sanitizeLive = () => {
                // Enforce: digits only, max 100 while typing/pasting
                const rawDigits = String(el.textContent ?? '').replace(/[^\d]/g, '').slice(0, 3);
                const next = rawDigits ? Math.floor(Number(rawDigits)) : 0;
                const clamped = Math.min(100, Math.max(0, Number.isFinite(next) ? next : 0));

                const desired = String(clamped);
                if (el.textContent !== desired) {
                    el.textContent = desired;
                    const range = document.createRange();
                    range.selectNodeContents(el);
                    range.collapse(false);
                    const sel = window.getSelection();
                    sel?.removeAllRanges();
                    sel?.addRange(range);
                }
            };

            el.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                startEdit();
            });

            el.addEventListener('input', () => {
                if (el.isContentEditable) sanitizeLive();
            });

            el.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    finishEdit(true);
                } else if (event.key === 'Escape') {
                    event.preventDefault();
                    finishEdit(false);
                } else {
                    // Only allow digits + control keys
                    const allowedKeys = new Set(['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab']);
                    if (allowedKeys.has(event.key)) return;
                    if (!/^\d$/.test(event.key)) {
                        event.preventDefault();
                    }
                }
            });

            el.addEventListener('blur', () => finishEdit(true));
        });

        // Render Rows for Quarterly Mode
        body.innerHTML = gradebookStudents.map((student, index) => {
            const wwPct = calculateWrittenWorksComponent(student.id);
            const ptPct = calculatePTPercentage(student.id);
            const qaPct = calculateQAPercentage(student.id);
            const initialGrade = calculateQuarterlyInitialGrade(student.id);

            return `
                <tr class="bg-gray-50/30 hover:bg-gray-50/60 transition-colors group">
                    <td class="px-4 py-2 border-r border-gray-50 bg-gray-50 sticky left-0 z-10 group-hover:bg-gray-100 transition-colors">
                        <p class="text-[12px] font-bold text-gray-800">${student.name}</p>
                        <p class="text-[8px] text-gray-400 font-medium uppercase tracking-widest">ID: ${student.id}</p>
                    </td>
                    <td class="px-2 py-2 text-center border-r border-gray-50 text-xs font-black ${wwPct ? 'text-blue-600' : 'text-gray-300'}">${wwPct ? wwPct + '%' : '—'}</td>
                    <td class="px-2 py-2 text-center border-r border-gray-50 text-xs font-black ${ptPct ? 'text-green-600' : 'text-gray-300'}">${ptPct ? ptPct + '%' : '—'}</td>
                    <td class="px-2 py-2 text-center border-r border-gray-50 text-xs font-black ${qaPct ? 'text-purple-600' : 'text-gray-300'}">${qaPct ? qaPct + '%' : '—'}</td>
                    
                    <td class="px-4 py-2 text-center bg-icc/5 border-r border-icc/10 text-xs font-black text-icc">${formatInitialGrade(initialGrade)}</td>
                    <td class="px-4 py-2 text-center bg-icc/10 text-xs font-black text-icc">${formatFinalGrade(initialGrade)}</td>
                </tr>
            `;
        }).join('');

        const quarterlyScores = gradebookStudents.map(student => calculateQuarterlyInitialGrade(student.id)).filter(value => value !== null);
        if (avgEl) avgEl.textContent = quarterlyScores.length
            ? `${(quarterlyScores.reduce((sum, value) => sum + value, 0) / quarterlyScores.length).toFixed(1)}%`
            : '—';
        if (passingEl) passingEl.textContent = quarterlyScores.length
            ? `${Math.round((quarterlyScores.filter(value => value >= 75).length / quarterlyScores.length) * 100)}%`
            : '—';
    }

    function calculateWWTotalScore(studentId) {
        const cats = ['assignment', 'quiz', 'activity'];
        let totalScore = 0;
        let hasAnyScore = false;

        cats.forEach(cat => {
            const scores = gradebookScores[studentId]?.[cat];
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
        return value === null ? '—' : `${value.toFixed(1)}%`;
    }

    function formatFinalGrade(value) {
        return value === null ? '—' : `${Math.round(value)}%`;
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

    function renderWWSubCategories() {
        document.getElementById('gradebook-drag-toolbar')?.classList.add('hidden');
        const body = document.getElementById('gradebook-body');
        const spreadsheet = document.getElementById('gradebook-spreadsheet');
        const tableHead = spreadsheet.querySelector('thead');

        const nameTh = `
            <th class="w-48 px-4 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest text-left border-r border-gray-50 bg-gray-100 sticky left-0 z-20 min-w-[200px]">
                <div class="flex items-center gap-2">
                    <button onclick="setGradebookView('overview')" class="bg-gray-50 w-6 h-6 flex items-center justify-center border border-gray-200 rounded hover:border-icc hover:text-icc transition-all">
                        <i class="fa-solid fa-arrow-left text-[9px]"></i>
                    </button>
                    <div>
                        <p class="text-icc font-black text-[10px]">WRITTEN WORKS</p>
                        <p class="text-[8px] text-gray-400 mt-0.5">${getGradebookPeriodLabel()}</p>
                    </div>
                </div>
            </th>`;

        const subCats = [
            { id: 'assignment', label: 'Assignment', icon: 'fa-book-open', color: 'text-blue-500' },
            { id: 'quiz', label: 'Quiz', icon: 'fa-vial', color: 'text-orange-500' },
            { id: 'activity', label: 'Activity', icon: 'fa-puzzle-piece', color: 'text-indigo-500' }
        ];

        let headerHtml = nameTh;
        subCats.forEach(cat => {
            const details = getCategoryDetails(cat.id);
            const includedItemIndexes = new Set();

            gradebookStudents.forEach(student => {
                const scores = gradebookScores[student.id]?.[cat.id];
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
                <th onclick="setGradebookView('${cat.id}')" 
                    class="w-40 px-2 py-2 text-[8px] font-black text-gray-400 uppercase tracking-widest text-center bg-gray-100 border-r border-gray-50 cursor-pointer hover:bg-gray-200 transition-colors group">
                    <div class="flex flex-col items-center gap-1">
                        <div class="w-5 h-5 rounded bg-gray-50 flex items-center justify-center ${cat.color} group-hover:bg-white transition-all shadow-sm border border-gray-100">
                            <i class="fa-solid ${cat.icon} text-[9px]"></i>
                        </div>
                        <span class="group-hover:text-icc transition-colors">${cat.label}</span>
                        <span class="normal-case text-[9px] font-extrabold tracking-normal text-gray-500">Total Perfect:${includedItemIndexes.size ? ` ${totalPerfectScore}` : ''}</span>
                        <i class="fa-solid fa-chevron-right text-[6px] text-gray-300 group-hover:text-icc"></i>
                    </div>
                </th>`;
        });

        headerHtml += `
            <th class="w-24 px-4 py-2 text-[9px] font-black text-icc uppercase tracking-widest text-center bg-icc/5 border-r border-icc/10">Percentage Score %</th>
        `;

        tableHead.innerHTML = `<tr class="border-b border-gray-200">${headerHtml}</tr>`;

        // Render Rows
        body.innerHTML = gradebookStudents.map((student, index) => {
            const asgTotal = calculateCategoryTotalScore(student.id, 'assignment');
            const quizTotal = calculateCategoryTotalScore(student.id, 'quiz');
            const actTotal = calculateCategoryTotalScore(student.id, 'activity');
            const percentageScore = calculateWWPercentageScore(student.id);

            return `
                 <tr class="bg-gray-50/30 hover:bg-gray-50/60 transition-colors group">
                     <td class="px-4 py-2 border-r border-gray-50 bg-gray-50 sticky left-0 z-10 group-hover:bg-gray-100 transition-colors">
                         <p class="text-[12px] font-bold text-gray-800">${student.name}</p>
                         <p class="text-[8px] text-gray-400 font-medium uppercase tracking-widest">ID: ${student.id}</p>
                     </td>
                    <td class="px-2 py-2 text-center border-r border-gray-50 text-xs font-black ${asgTotal !== null ? 'text-blue-600' : 'text-gray-300'}">${asgTotal !== null ? asgTotal : '—'}</td>
                    <td class="px-2 py-2 text-center border-r border-gray-50 text-xs font-black ${quizTotal !== null ? 'text-orange-600' : 'text-gray-300'}">${quizTotal !== null ? quizTotal : '—'}</td>
                    <td class="px-2 py-2 text-center border-r border-gray-50 text-xs font-black ${actTotal !== null ? 'text-indigo-600' : 'text-gray-300'}">${actTotal !== null ? actTotal : '—'}</td>
                    <td class="px-4 py-2 text-center bg-icc/5 border-r border-icc/10 text-xs font-black text-icc">${percentageScore !== null ? percentageScore + '%' : '—'}</td>
                 </tr>
            `;
        }).join('');
    }

    function renderGradebookDetailView(category) {
        document.getElementById('gradebook-drag-toolbar')?.classList.remove('hidden');
        const body = document.getElementById('gradebook-body');
        const spreadsheet = document.getElementById('gradebook-spreadsheet');
        const tableHead = spreadsheet.querySelector('thead');
        const detailCategory = category === 'pt' ? 'perf. task' : category;

        const items = getCategoryDetails(detailCategory);

        const isWWSub = ['assignment', 'quiz', 'activity'].includes(detailCategory);
        const backView = isWWSub ? 'ww-sub' : 'overview';

        const nameHeaderCell = `
            <th class="w-48 px-4 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest text-left border-r border-gray-50 bg-gray-100 sticky left-0 z-20 min-w-[200px]">
                <div class="flex items-center gap-2">
                    <button onclick="setGradebookView('${backView}')" class="bg-gray-50 w-6 h-6 flex items-center justify-center border border-gray-200 rounded hover:border-icc hover:text-icc transition-all">
                        <i class="fa-solid fa-arrow-left text-[9px]"></i>
                    </button>
                    <div>
                        <p class="text-icc font-black text-[10px]">${detailCategory.toUpperCase()}</p>
                        <p class="text-[8px] text-gray-400 mt-0.5">${getGradebookPeriodLabel()}</p>
                    </div>
                </div>
            </th>
        `;

        let headerHtml = `<tr class="border-b border-gray-200">${nameHeaderCell}`;

        items.forEach(item => {
            headerHtml += `
                <th class="w-32 min-w-[140px] px-2 py-2 text-[8px] font-black text-gray-400 uppercase tracking-widest text-center bg-white border-r border-gray-50">
                    <div class="flex flex-col items-center gap-1">
                        ${isGradebookDateEditable(detailCategory)
                    ? `<input type="date"
                                      value="${toInputDateValue(item.date)}"
                                      onchange="updateGradebookDate('${detailCategory}', ${items.indexOf(item)}, this.value)"
                                      class="w-full max-w-[122px] bg-transparent border-none text-[9px] font-black text-icc tracking-widest text-center focus:ring-1 focus:ring-icc/20 rounded outline-none">`
                    : `<span class="text-[9px] font-black text-icc uppercase tracking-widest">${item.date}</span>`}
                        <span class="text-gray-800 text-[10px] font-bold">${item.title}</span>
                        <span class="text-[8px] opacity-50">/${item.max}</span>
                    </div>
                </th>`;
        });

        headerHtml += `</tr>`;
        tableHead.innerHTML = headerHtml;

        // Render Rows
        body.innerHTML = gradebookStudents.map((student, index) => `
            <tr class="bg-gray-50/30 hover:bg-gray-50/60 transition-colors group">
                <td class="px-4 py-2 border-r border-gray-50 bg-gray-50 sticky left-0 z-10 group-hover:bg-gray-100 transition-colors">
                    <p class="text-[12px] font-bold text-gray-800">${student.name}</p>
                    <p class="text-[8px] text-gray-400 font-medium uppercase tracking-widest">ID: ${student.id}</p>
                </td>
                ${items.map((item, index) => {
            const savedScore = gradebookScores[student.id]?.[detailCategory]?.[index] || '';
            return `
                        <td class="min-w-[140px] px-2 py-2 text-center border-r border-gray-50 transition-all duration-300"
                            ondragover="handleGradebookDragOver(event)"
                            ondragleave="handleGradebookDragLeave(event)"
                            ondrop="handleGradebookDrop(event)">
                            <div class="flex flex-col items-center gap-1 pointer-events-none">
                                <input type="number" placeholder="—" 
                                       value="${savedScore}"
                                       min="0"
                                       max="${item.max}"
                                       onmousedown="event.stopPropagation()"
                                       onclick="event.stopPropagation()"
                                       onpointerdown="event.stopPropagation()"
                                       oninput="enforceStudentScoreInput(this, '${detailCategory}', ${index})"
                                       onchange="updateStudentScore('${student.id}', '${detailCategory}', ${index}, this.value)"
                                       class="w-16 py-0.5 bg-transparent border-none text-[11px] font-bold text-center focus:ring-1 focus:ring-icc/30 outline-none rounded transition-all hover:bg-gray-100 pointer-events-auto">
                                
                                <div class="status-group flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                                    <button onclick="toggleStudentStatus(this, 'missing')" title="Missing" class="status-btn w-4 h-4 rounded-full border border-gray-200 flex items-center justify-center text-[7px] text-gray-300 hover:border-red-400 transition-all">
                                        <i class="fa-solid fa-circle-xmark"></i>
                                    </button>
                                    <button onclick="toggleStudentStatus(this, 'incomplete')" title="Incomplete" class="status-btn w-4 h-4 rounded-full border border-gray-200 flex items-center justify-center text-[7px] text-gray-300 hover:border-amber-400 transition-all">
                                        <i class="fa-solid fa-circle-exclamation"></i>
                                    </button>
                                    <button onclick="toggleStudentStatus(this, 'absent')" title="Absent" class="status-btn w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center text-[7px] text-gray-400 hover:border-black transition-all">
                                        <i class="fa-solid fa-user-slash"></i>
                                    </button>
                                    <button onclick="toggleStudentStatus(this, 'excuse')" title="Excuse" class="status-btn w-4 h-4 rounded-full border border-gray-200 flex items-center justify-center text-[7px] text-gray-300 hover:border-blue-400 transition-all">
                                        <i class="fa-solid fa-file-signature"></i>
                                    </button>
                                </div>
                            </div>
                        </td>
                    `;
        }).join('')}
            </tr>
        `).join('');
    }

    window.updateStudentScore = (studentId, category, itemIndex, value) => {
        if (!gradebookScores[studentId]) gradebookScores[studentId] = {};
        if (!gradebookScores[studentId][category]) gradebookScores[studentId][category] = {};
        const itemMax = getCategoryDetails(category)?.[itemIndex]?.max;
        const numericValue = value === '' ? '' : Number(value);
        const normalizedValue = value === ''
            ? ''
            : Math.min(itemMax ?? numericValue, Math.max(0, numericValue));
        gradebookScores[studentId][category][itemIndex] = normalizedValue;

        // Visual feedback
        const input = event.target;
        if (input && value !== '') input.value = normalizedValue;
        const td = input.closest('td');

        // Clear any status bg if manual score entered
        if (td) {
            const statusColors = ['bg-red-100', 'bg-amber-100', 'bg-gray-200', 'bg-blue-100'];
            statusColors.forEach(c => td.classList.remove(c));

            // Also reset status buttons
            const statusGroup = td.querySelector('.status-group');
            if (statusGroup) {
                statusGroup.querySelectorAll('.status-btn').forEach(b => {
                    b.classList.remove('text-red-700', 'bg-red-100', 'border-red-300',
                        'text-amber-700', 'bg-amber-100', 'border-amber-300',
                        'text-black', 'bg-gray-200', 'border-black',
                        'text-blue-700', 'bg-blue-100', 'border-blue-300');
                    b.classList.add('text-gray-300', 'bg-transparent', 'border-gray-200');
                });
            }
        }

        input.classList.add('bg-green-50');
        setTimeout(() => input.classList.remove('bg-green-50'), 500);
    };

    window.toggleStudentStatus = (btn, type) => {
        const colors = {
            missing: { text: 'text-red-700', bg: 'bg-red-100', border: 'border-red-300' },
            incomplete: { text: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-300' },
            absent: { text: 'text-black', bg: 'bg-gray-200', border: 'border-black' },
            excuse: { text: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-300' }
        };

        const td = btn.closest('td');
        const isActive = btn.classList.contains(colors[type].text);

        // Reset all in group
        const group = btn.closest('.status-group');
        group.querySelectorAll('.status-btn').forEach(b => {
            Object.values(colors).forEach(c => {
                b.classList.remove(c.text, c.bg, c.border);
            });
            b.classList.add('text-gray-300', 'bg-transparent', 'border-gray-200');
        });

        // Clear td bg
        if (td) {
            Object.values(colors).forEach(c => td.classList.remove(c.bg));
        }

        if (!isActive) {
            btn.classList.remove('text-gray-200', 'bg-transparent', 'border-gray-100');
            btn.classList.add(colors[type].text, colors[type].bg, colors[type].border);
            if (td) td.classList.add(colors[type].bg);
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

    // ─── SIGMA AI ──────────────────────────────────────────────
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
            addAiMessage('Faculty wireframe mode — Gemini AI integration in progress.', false);
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

    // --- Card Drag & Drop Implementation ---
    function initCardDraggable() {
        const grid = document.getElementById('classrooms-grid');
        if (!grid) return;

        let draggedItem = null;

        grid.addEventListener('dragstart', (e) => {
            const target = e.target.closest('.classroom-card');
            if (target) {
                draggedItem = target;
                draggedItem.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                // Optional: set drag image if needed
            }
        });

        grid.addEventListener('dragover', (e) => {
            e.preventDefault();
            const target = e.target.closest('.classroom-card');
            if (target && target !== draggedItem) {
                const rect = target.getBoundingClientRect();
                const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
                grid.insertBefore(draggedItem, next ? target.nextSibling : target);
            }
        });

        grid.addEventListener('dragend', () => {
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
            }
        });
    }

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
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            forceFallback: true,
            fallbackClass: 'sortable-drag',
            fallbackOnBody: true,
            swapThreshold: 0.65,
            invertSwap: true,
            scroll: true,
            bubbleScroll: true,
            scrollSensitivity: 100,
            scrollSpeed: 20,
            onStart: (evt) => {
                document.body.style.cursor = 'grabbing';
                // Lock the width to exactly what it was before picking it up
                const item = evt.item;
                const dragEl = document.querySelector('.sortable-drag');
                if (dragEl) {
                    dragEl.style.width = item.offsetWidth + 'px';
                }
            },
            onEnd: () => {
                document.body.style.cursor = '';
                const order = classroomSortable.toArray();
                localStorage.setItem('teacher_classroom_order', JSON.stringify(order));
            }
        });
    }

    initCardSortable();

    // --- Assessments Tab Logic ---
    function formatAssessmentDate(date) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
            // Generate 3-5 assessments per subject
            const count = 3 + (sIdx % 3);
            for (let i = 0; i < count; i++) {
                const startDate = new Date(baseDate);
                startDate.setDate(baseDate.getDate() - (i * 5 + (sIdx * 2) + 2));

                const dueDate = new Date(startDate);
                dueDate.setDate(startDate.getDate() + 7);

                const submissions = 20 + (i * 2) + (sIdx % 5);
                const graded = i === 0 ? submissions : Math.floor(submissions * 0.8);
                const rawScore = 75 + (sIdx % 15) + (i % 10);

                let status = 'pending';
                if (dueDate < baseDate) {
                    status = graded === submissions ? 'completed' : 'overdue';
                }
                const submittedOn = status === 'pending'
                    ? null
                    : new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000);
                const gradedOn = status === 'completed'
                    ? new Date(startDate.getTime() + 4 * 24 * 60 * 60 * 1000)
                    : null;
                const avgScore = status === 'pending' ? 0 : rawScore;

                rows.push({
                    subjectId: subject.id,
                    subject: subject.label,
                    activity: `${['Quiz', 'Assignment', 'Activity', 'Project'][i % 4]} #${i + 1}: ${['Fundamentals', 'Advanced Concepts', 'Practical Application', 'Analysis', 'Evaluation'][i % 5]}`,
                    startDate,
                    dueDate,
                    submittedOn,
                    gradedOn,
                    submissions,
                    graded,
                    score: avgScore,
                    equivalent: avgScore > 0 ? getEquivalentGrade(avgScore) : '-',
                    status
                });
            }
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

            const concernItems = [];
            const overdueRows = rows.filter(row => row.status === 'overdue').slice(0, 3);
            const pendingRows = rows.filter(row => row.status === 'pending').slice(0, 2);

            if (overdueCount > 0) {
                concernItems.push(`There are ${overdueCount} assessments with pending submissions that are past the deadline.`);
            }
            overdueRows.forEach(row => {
                concernItems.push(`Grade pending submissions for ${row.activity} in ${row.subject}.`);
            });
            if (pendingCount > 0) {
                concernItems.push(`You have ${pendingCount} upcoming assessments scheduled for this month.`);
            }

            if (!concernItems.length) {
                concernItems.push('All current assessments are up to date. No immediate grading actions required.');
            }

            const statusBadge = status => {
                if (status === 'completed') return '<span class="px-2.5 py-1 bg-green-100 text-green-700 text-[9px] font-bold uppercase rounded-lg">Completed</span>';
                if (status === 'overdue') return '<span class="px-2.5 py-1 bg-red-100 text-red-600 text-[9px] font-bold uppercase rounded-lg">Overdue</span>';
                return '<span class="px-2.5 py-1 bg-amber-100 text-amber-700 text-[9px] font-bold uppercase rounded-lg">Pending</span>';
            };

            const renderAssessmentRow = row => `
            <tr class="hover:bg-gray-50/50 transition-colors" data-subject="${row.subject}">
                <td class="px-3 py-4 text-sm font-bold text-gray-800">${row.activity}</td>
                <td class="px-3 py-4 text-sm text-gray-600 font-bold">${row.subject}</td>
                <td class="px-3 py-4 text-sm text-gray-500">${formatAssessmentDate(row.startDate)}</td>
                <td class="px-3 py-4 text-sm ${row.status === 'overdue' ? 'text-red-500 font-bold' : 'text-gray-500'}">${formatAssessmentDate(row.dueDate)}</td>
                <td class="px-3 py-4 text-sm text-gray-500">${row.submittedOn ? formatAssessmentDate(row.submittedOn) : '-'}</td>
                <td class="px-3 py-4 text-sm text-gray-500">${row.gradedOn ? formatAssessmentDate(row.gradedOn) : '-'}</td>
                <td class="px-3 py-4 text-sm font-bold ${row.score >= 90 ? 'text-green-600' : row.score >= 80 ? 'text-icc' : row.score >= 75 ? 'text-amber-600' : row.score > 0 ? 'text-red-500' : 'text-gray-400'}">${row.score > 0 ? `${row.score}%` : '-'}</td>
                <td class="px-3 py-4 text-sm font-bold text-gray-700">${row.equivalent}</td>
                <td class="px-5 py-4">${statusBadge(row.status)}</td>
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
            const pageSize = 10;
            let currentPage = 1;

            function getFilteredRows() {
                const selectedSubject = filter?.value || 'all';
                return selectedSubject === 'all'
                    ? rows
                    : rows.filter(row => row.subject === selectedSubject);
            }

            function renderAssessmentPageRows() {
                const filteredRows = getFilteredRows();
                const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
                currentPage = Math.min(currentPage, totalPages);
                const startIndex = (currentPage - 1) * pageSize;
                const visibleRows = filteredRows.slice(startIndex, startIndex + pageSize);

                body.innerHTML = visibleRows.length
                    ? visibleRows.map(renderAssessmentRow).join('')
                    : '<tr><td colspan="9" class="px-5 py-10 text-center text-sm font-bold text-gray-400 uppercase tracking-widest">No assessments found for this filter.</td></tr>';

                info.textContent = filteredRows.length
                    ? `Showing ${startIndex + 1}-${Math.min(startIndex + pageSize, filteredRows.length)} of ${filteredRows.length}`
                    : 'Showing 0 of 0';
                indicator.textContent = `Page ${currentPage} of ${totalPages}`;
                prevBtn.disabled = currentPage === 1;
                nextBtn.disabled = currentPage === totalPages;
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
        }
    }

    // showMyProfile is now defined above to ensure it has access to hideHeaderOverlays and switchTab

    // ─── User Profile Logic (Synchronized with Student) ──────────
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

    // ─── ANNOUNCEMENT SYSTEM ──────────────────────────────────
    let activeHomeAnnouncementTab = 'all';
    const ANNOUNCEMENT_STORAGE_KEY = 'sigma-admin-announcements-v1';

    function formatAnnouncementDate(dateValue) {
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) return 'Just now';

        const now = new Date();
        const diffMs = now - date;
        const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
        const diffMins = Math.floor(diffSecs / 60);
        const diffHrs = Math.floor(diffMins / 60);

        if (diffSecs < 60) {
            return diffSecs <= 1 ? '1sec' : `${diffSecs}secs`;
        }
        if (diffMins < 60) {
            return diffMins === 1 ? '1min' : `${diffMins}mins`;
        }
        if (diffHrs < 24) {
            return diffHrs === 1 ? '1hr' : `${diffHrs}hrs`;
        }

        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        const isYesterday = date.getDate() === yesterday.getDate() &&
            date.getMonth() === yesterday.getMonth() &&
            date.getFullYear() === yesterday.getFullYear();

        const timeString = date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();

        if (isYesterday) {
            return `Yesterday at ${timeString}`;
        }

        const daysDiff = Math.floor(diffHrs / 24);
        if (daysDiff < 7) {
            const dayName = date.toLocaleString('en-US', { weekday: 'long' });
            return `${dayName} at ${timeString}`;
        }

        const monthDay = date.toLocaleString('en-US', { month: 'long', day: 'numeric' });
        return `${monthDay} at ${timeString}`;
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
            const isClassroom = post.isClassroomPost === true;
            const roleLabel = post.isAdmin ? 'Administrator' : 'Teacher';
            const roleClass = post.isAdmin ? 'text-slate-500' : 'text-emerald-600';

            const fullBody = post.body || '';
            const hasImage = post.imageUrl && post.imageUrl.trim() !== '';
            const hasText = (post.title && post.title.trim() !== '') || (post.body && post.body.trim() !== '');

            // Layout logic
            let cardHeight = "h-[260px]";
            let isImageOnly = false;
            let isImageWithText = false;

            if (isClassroom) {
                // Classroom posts expand to fit their content
                cardHeight = 'h-auto';
            } else if (hasImage && hasText) {
                cardHeight = "h-[520px]";
                isImageWithText = true;
            } else if (hasImage && !hasText) {
                cardHeight = "h-[420px]";
                isImageOnly = true;
            }

            const textLimit = isImageWithText ? 90 : 180;
            const isLong = !isClassroom && fullBody.length > textLimit;
            const truncatedBody = isLong ? fullBody.substring(0, textLimit) + '...' : fullBody;

            const formattedFull = escapeHtml(fullBody).replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
            const formattedTruncated = escapeHtml(truncatedBody).replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');

            // --- Classroom post card (special design) ---
            if (isClassroom) {
                const [gradeSection, subjectName] = (post.classroomKey || '').split('::');
                return `
                    <article id="${post.id}"
                             class="bg-white border border-slate-200 rounded-[22px] relative w-full overflow-hidden transition-all duration-500 group">
                        <div class="p-6 flex flex-col min-w-0">
                            <!-- Header: avatar + name + date -->
                            <div class="flex items-start justify-between mb-3">
                                <div class="flex items-center gap-3">
                                    <div class="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 flex-shrink-0">
                                        <i class="fa-solid fa-user text-xs text-black"></i>
                                    </div>
                                    <div class="flex flex-col">
                                        <span class="text-[13px] font-black text-slate-900 leading-none mb-0.5">${escapeHtml(post.author || 'Teacher')}</span>
                                        <span class="text-[10px] font-bold text-slate-400">Teacher</span>
                                    </div>
                                </div>
                                <span class="text-[10px] font-medium text-slate-400 tracking-tight mt-0.5">${formatAnnouncementDate(post.createdAt)}</span>
                            </div>

                            <!-- Subject title + grade/section subtitle -->
                            <div class="mb-3 pl-[3.25rem]">
                                <h3 class="text-[17px] font-black text-slate-900 leading-tight">${escapeHtml(subjectName || post.title || 'Classroom Post')}</h3>
                                ${gradeSection ? `<p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">${escapeHtml(gradeSection)}</p>` : ''}
                            </div>

                            <!-- Post body -->
                            <div class="pl-[3.25rem] text-[15px] text-slate-700 leading-relaxed">
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
                         class="bg-white border border-slate-200 rounded-[22px] relative w-full ${cardHeight} overflow-hidden transition-all duration-500 group">
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
                                <span class="text-[10px] font-medium text-slate-400 tracking-tight">${formatAnnouncementDate(post.createdAt)}</span>
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

                    <!-- Absolute Fixed Footer & Actions -->
                    <div class="absolute bottom-0 left-0 right-0 h-[52px] px-6 border-t border-slate-100 bg-white flex items-center justify-end z-10">
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
            art.classList.remove(art.dataset.originalHeight);
            art.classList.add('h-auto');
        } else {
            p.innerHTML = p.dataset.truncated + ` <span onclick="toggleAnnouncement('${id}')" class="see-more-btn cursor-pointer font-bold text-slate-900 hover:underline ml-1">See more</span>`;
            art.classList.remove('h-auto');
            art.classList.add(art.dataset.originalHeight);
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

    // --- Subject Rail Initialization ---
    if (typeof initHomeSubjectRail === 'function') {
        initHomeSubjectRail();
    }

    // Pre-render assessments once so the tab never shows an empty pane.
    if (typeof renderAssessmentsPage === 'function') {
        renderAssessmentsPage();
        sectionFeatureInit.assessments = true;
    }

    // ── Force-close ALL panels on every load / refresh ──────────────
    window.hideHeaderOverlays();

    // Ensure all header dropdown menus and panels are hidden
    ['calendar-dropdown', 'noti-dropdown', 'profileDropdownMenu'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
});

/**
 * Subject Rail Logic - Re-implemented for Parity
 * Manages the dynamic subject list in the Teacher Portal home view.
 */

function renderHomeSubjectRail() {
    const enrolledContainer = document.getElementById('home-enrolled-subject-list');
    const completedContainer = document.getElementById('home-completed-subject-list');
    const completedBlock = document.getElementById('home-completed-subject-block');

    if (!enrolledContainer) return;

    const subjectsData = window.subjectsData || { core: [], academic: [], techpro: [], completed: [] };
    const searchTerm = (document.getElementById('home-subject-search-input')?.value || '').toLowerCase();
    const hideCompleted = document.getElementById('home-subject-hide-completed-toggle')?.checked ?? false;
    const activeFilter = document.querySelector('input[name="home-subject-filter"]:checked')?.value || 'all';

    // Flatten active subjects with type information
    let allActive = [];
    if (activeFilter === 'all' || activeFilter === 'core')
        allActive = [...allActive, ...subjectsData.core.map(s => ({ ...s, type: 'core' }))];
    if (activeFilter === 'all' || activeFilter === 'applied')
        allActive = [...allActive, ...subjectsData.academic.map(s => ({ ...s, type: 'applied' }))];
    if (activeFilter === 'all' || activeFilter === 'specialized')
        allActive = [...allActive, ...subjectsData.techpro.map(s => ({ ...s, type: 'specialized' }))];

    const filteredActive = allActive
        .filter(s => s.name.toLowerCase().includes(searchTerm))
        .sort((a, b) => a.name.localeCompare(b.name));

    const filteredCompleted = (subjectsData.completed || [])
        .filter(s => s.name.toLowerCase().includes(searchTerm))
        .sort((a, b) => a.name.localeCompare(b.name));

    // Helper to render items in the simplified dot format
    const renderItems = (items, isCompleted = false) => {
        if (items.length === 0) {
            return `<div class="py-10 text-center text-slate-400 text-[11px] font-medium italic opacity-60">No subjects found</div>`;
        }
        return items.map(subj => {
            // Determine dot color based on type
            let dotColor = '#94a3b8'; // fallback
            if (subj.type === 'core') dotColor = '#15803d';
            if (subj.type === 'applied') dotColor = '#FFD000';
            if (subj.type === 'specialized' || subj.type === 'immersion') dotColor = '#78350f';

            return `
                <div class="home-subject-rail-item ${isCompleted ? 'home-subject-rail-item--completed' : ''}" 
                        data-program-key="${subj.programKey || 'core-subjects'}" 
                        data-subject-id="${subj.id}"
                        onclick="window.openSubjectsProgramFocus('${subj.programKey || 'core-subjects'}')"
                        style="display: flex; align-items: center; gap: 0.85rem; padding: 0.65rem 0.5rem; cursor: pointer; border-radius: 0.5rem;">
                    <div class="home-subject-rail-item__dot" style="background-color: ${dotColor}; width: 11px; height: 11px; min-width: 11px; min-height: 11px; border-radius: 50%; flex-shrink: 0; display: block; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);"></div>
                    <div class="home-subject-rail-item__info" style="flex: 1; min-width: 0;">
                        <div class="home-subject-rail-item__name" style="font-weight: 800; color: #000000; font-size: 1.05rem;">${subj.name}</div>
                    </div>
                </div>
            `;
        }).join('');
    };

    enrolledContainer.innerHTML = renderItems(filteredActive);

    if (completedContainer) {
        completedContainer.innerHTML = renderItems(filteredCompleted, true);
    }

    if (completedBlock) {
        // Only hide if the toggle is on OR if there are no subjects and no search query
        completedBlock.classList.toggle('hidden', hideCompleted || (filteredCompleted.length === 0 && !searchTerm));
    }

    // Attach click listeners
    document.querySelectorAll('.home-subject-rail-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const programKey = item.dataset.programKey;
            if (programKey && typeof window.openSubjectsProgramFocus === 'function') {
                window.openSubjectsProgramFocus(programKey);
            }
        });
    });
}

function initHomeSubjectRail() {
    const searchToggle = document.getElementById('home-subject-search-toggle');
    const searchBox = document.getElementById('home-subject-search-box');
    const searchInput = document.getElementById('home-subject-search-input');
    const settingsToggle = document.getElementById('home-subject-settings-toggle');
    const settingsMenu = document.getElementById('home-subject-settings-menu');
    const hideCompletedToggle = document.getElementById('home-subject-hide-completed-toggle');
    const filterRadios = document.querySelectorAll('input[name="home-subject-filter"]');

    if (searchToggle && searchBox) {
        searchToggle.addEventListener('click', () => {
            searchBox.classList.toggle('hidden');
            if (!searchBox.classList.contains('hidden')) {
                searchInput?.focus();
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => renderHomeSubjectRail());
    }

    if (settingsToggle && settingsMenu) {
        settingsToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsMenu.classList.toggle('hidden');
        });
        document.addEventListener('click', () => settingsMenu.classList.add('hidden'));
        settingsMenu.addEventListener('click', (e) => e.stopPropagation());
    }

    if (hideCompletedToggle) {
        hideCompletedToggle.addEventListener('change', () => renderHomeSubjectRail());
    }

    filterRadios.forEach(radio => {
        radio.addEventListener('change', () => renderHomeSubjectRail());
    });

    renderHomeSubjectRail();
}

window.renderHomeSubjectRail = renderHomeSubjectRail;

/**
 * Navigation Bridge: Switches to the Subjects tab and focuses on a specific program.
 * Used by the Subject Rail cards on the Dashboard.
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

    // Global Search Functionality
    const searchBar = document.getElementById('searchBar');
    const searchBtn = document.getElementById('globalSearchBtn');

    const triggerGlobalSearch = () => {
        const query = (searchBar?.value || '').trim();
        const visibleSection = Array.from(document.querySelectorAll('.dynamic-section:not(.hidden)'))[0];
        if (!visibleSection) return;
        const sectionId = visibleSection.id;

        if (sectionId === 'section-dashboard') {
            const dashSearchInput = document.getElementById('home-subject-search-input');
            if (dashSearchInput) {
                dashSearchInput.value = query;
                renderHomeSubjectRail();
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

    // Close mobile search if clicking outside
    document.addEventListener('mousedown', (e) => {
        if (window.innerWidth < 1024) {
            const header = document.getElementById('teacher-header');
            const searchShell = document.querySelector('.header-search-shell');
            if (header?.classList.contains('mobile-search-active') && !searchShell?.contains(e.target)) {
                header?.classList.remove('mobile-search-active');
            }
        }
    });
});
