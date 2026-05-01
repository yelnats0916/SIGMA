/* =============================================================
   SIGMA ELMS — Login Page JavaScript
   Interface Computer College | Senior High School ELMS
   ============================================================= */

document.addEventListener('DOMContentLoaded', function () {

    const USER_STORAGE_KEY = 'sigma-admin-users';
    const MANAGED_USERS_RESET_KEY = 'sigma-managed-users-reset-v1';
    const AUTH_SESSION_KEY = 'sigma-authenticated-user';
    const LOGIN_SECURITY_KEY = 'sigma-login-security-config';

    // --- CUSTOM LOGO SYNC ---
    const customLoginLogo = localStorage.getItem('sigma-custom-login-logo');
    if (customLoginLogo) {
        const loginFormLogo = document.querySelector('.login-form-logo');
        if (loginFormLogo) loginFormLogo.src = customLoginLogo;
    }

    const customLoginBarLogo = localStorage.getItem('sigma-custom-login-bar-logo');
    if (customLoginBarLogo) {
        const navLogo = document.querySelector('header#mainNav img') || document.querySelector('#backToLoginLogo img');
        if (navLogo) navLogo.src = customLoginBarLogo;
    }

    function getLoginSecurityConfig() {
        try {
            const raw = localStorage.getItem(LOGIN_SECURITY_KEY);
            return raw ? JSON.parse(raw) : { loginIdAttempts: 3, passwordAttempts: 8 };
        } catch (e) {
            return { loginIdAttempts: 3, passwordAttempts: 8 };
        }
    }

    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    /* ===== IMAGE SLIDER: Auto-rotating campus photo slideshow ===== */

    const SLIDER_CONFIG_DEFAULT = [
        { src: 'image/ICC Shs.jpg', alt: 'ICC Senior High School' },
        { src: 'image/ICC Enrollment.jpg', alt: 'ICC Enrollment' },
        { src: 'image/ICC Immersion.jpg', alt: 'ICC Immersion' },
        { src: 'image/ICC Interfacer.jpg', alt: 'ICC Interfacer' },
        { src: 'image/ICC Learning.jpg', alt: 'ICC Learning' }
    ];

    const customSlidesRaw = localStorage.getItem('sigma-custom-login-slides');
    const SLIDER_CONFIG = customSlidesRaw ? JSON.parse(customSlidesRaw) : SLIDER_CONFIG_DEFAULT;


    function initSliderContent(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = SLIDER_CONFIG.map((img, i) => `
            <div class="slide ${i === 0 ? 'active' : ''}" style="position: absolute; inset: 0; transition: opacity 1s ease-in-out; opacity: ${i === 0 ? '1' : '0'}; background: #ffffff;">
                <img class="slide-img" src="${img.src}" alt="${img.alt}" style="width: 100%; height: 100%; object-fit: fill; position: relative; z-index: 10;">
            </div>
        `).join('');
    }

    initSliderContent('slider');

    function createSlider(containerId, dotsId) {
        const container = document.getElementById(containerId);
        const dotsBox = document.getElementById(dotsId);
        if (!container || !dotsBox) return null;

        const slides = Array.from(container.querySelectorAll('.slide'));
        if (slides.length === 0) return null;

        let current = 0;
        let timer;

        dotsBox.innerHTML = '';
        slides.forEach((_, i) => {
            const dot = document.createElement('div');
            dot.className = `dot ${i === 0 ? 'active' : ''}`;
            dot.onclick = () => jumpTo(i);
            dotsBox.appendChild(dot);
        });

        function update() {
            slides.forEach((s, i) => {
                s.style.opacity = (i === current) ? '1' : '0';
                s.classList.toggle('active', i === current);
            });
            Array.from(dotsBox.children).forEach((d, i) => d.classList.toggle('active', i === current));
        }

        function jumpTo(index) {
            current = index;
            update();
            reset();
        }

        function next() {
            current = (current + 1) % slides.length;
            update();
        }

        function reset() {
            clearInterval(timer);
            timer = setInterval(next, 5000);
        }

        reset();
        return { next, jumpTo };
    }

    createSlider('slider', 'dotsContainer');

    /* ===== STATE & CONFIG ===== */

    let submitGuardLocked = false;
    let invalidLoginIdAttempts = 0;
    const passwordFailedAttempts = {};
    const sessionLockedAccounts = new Set();
    let pendingCaptchaFlow = null;
    let pendingCaptchaSubmission = null;

    function getStoredUsers() {
        try {
            const parsed = JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    function buildManagedUserPassword(user) {
        const safeLastName = String(user?.lastName || 'user')
            .trim()
            .replace(/[^a-zA-Z0-9]/g, '')
            .toLowerCase();
        const userId = String(user?.uid || user?.id || '').trim();
        return `${safeLastName}${userId}`;
    }

    function purgeLegacyManagedUsers() {
        if (localStorage.getItem(MANAGED_USERS_RESET_KEY) === 'true') {
            return;
        }

        const managedUsers = getStoredUsers().filter((user) => user && user.createdVia === 'admin-panel');
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(managedUsers));
        localStorage.setItem(MANAGED_USERS_RESET_KEY, 'true');
    }

    function getRedirectForRole(role) {
        const normalizedRole = String(role || '').trim().toLowerCase();
        if (normalizedRole === 'student') return 'student.html';
        if (normalizedRole === 'teacher') return 'teacher.html';
        if (normalizedRole === 'admin' || normalizedRole === 'head admin' || normalizedRole === 'master admin') return 'admin.html';
        return 'index.html';
    }

    function findManagedAccount(loginValue) {
        let submitted = String(loginValue || '').trim().toLowerCase();
        if (!submitted) return null;

        // If no @ is provided, we'll also test it as a gmail prefix
        const submittedAsGmail = submitted.includes('@') ? submitted : `${submitted}@gmail.com`;

        return getStoredUsers()
            .find((user) => {
                if (!user) return false;

                const id = String(user.uid || user.id || '').trim().toLowerCase();
                const email = String(user.email || '').trim().toLowerCase();
                const emailPrefix = email.split('@')[0];

                // Matches ID, Exact Email, or Email Prefix
                return submitted === id ||
                    submitted === email ||
                    submitted === emailPrefix ||
                    submittedAsGmail === email;
            }) || null;
    }

    purgeLegacyManagedUsers();

    const HELP_CATEGORIES = [
        { id: 'faq-help', label: 'FAQ', icon: 'fa-solid fa-circle-question' },
        { id: 'contact-support', label: 'Contact Support', icon: 'fa-solid fa-headset' }
    ];

    const ui = {
        views: {
            landing: document.getElementById('landingMain'),
            help: document.getElementById('helpCenterView'),
            recaptcha: document.getElementById('recaptchaView')
        },
        form: document.getElementById('landingLoginForm'),
        modalForm: document.getElementById('modalLoginForm'),
        inputs: {
            id: document.getElementById('schoolId'),
            pass: document.getElementById('password'),
            modalId: document.getElementById('modalSchoolId'),
            modalPass: document.getElementById('modalPassword')
        },
        errors: {
            general: document.getElementById('loginErrorMessage'),
            modalGeneral: document.getElementById('modalLoginErrorMessage'),
            id: document.getElementById('schoolIdError'),
            pass: document.getElementById('passwordError'),
            modalId: document.getElementById('modalSchoolIdError'),
            modalPass: document.getElementById('modalPasswordError')
        },
        btns: {
            submit: document.getElementById('loginSubmitBtn'),
            modalSubmit: document.getElementById('modalLoginSubmitBtn'),
            entryHelp: [
                document.getElementById('entryHelpCenterBtn'),
                document.getElementById('entryHelpCenterBtnSmall'),
                document.getElementById('openHelpCenterMobileBtn'),
                document.getElementById('openHelpBtn')
            ].filter(btn => btn !== null)
        },
        nav: {
            title: document.getElementById('navTitle'),
            subtitle: document.getElementById('navSubtitle'),
            icon: document.getElementById('navIcon')
        },
        captcha: {
            fullCheck: document.getElementById('fullPageCaptchaCheck'),
            loading: document.getElementById('recaptchaLoadingState'),
            error: document.getElementById('recaptchaError'),
            box: document.getElementById('recaptchaBoxContainer')
        },
        help: {
            desktop: document.getElementById('helpCategoriesDesktop'),
            mobile: document.getElementById('helpCategoriesMobile'),
            content: document.getElementById('helpCenterContentScroll'),
            mobileOverlay: document.getElementById('helpMobileSidebarOverlay'),
            mobilePanel: document.getElementById('helpMobileSidebar'),
            mobileClose: document.getElementById('helpMobileSidebarClose'),
            mobileNavBtn: document.getElementById('helpCenterNavMenuBtn')
        }
    };

    let activeHelpCategoryId = 'faq-help';

    /* ===== HELP CENTER FUNCTIONS ===== */

    function renderHelpCategories() {
        const render = (item) => `
            <button type="button" data-help-target="${item.id}"
                class="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 font-bold transition-colors ${activeHelpCategoryId === item.id ? 'bg-icc-yellow text-black' : 'text-gray-700 hover:bg-gray-100'}">
                <i class="${item.icon} w-6 text-center"></i>
                <span>${item.label}</span>
            </button>
        `;
        if (ui.help.desktop) ui.help.desktop.innerHTML = HELP_CATEGORIES.map(render).join('');
        if (ui.help.mobile) ui.help.mobile.innerHTML = HELP_CATEGORIES.map(render).join('');
    }

    function setActiveHelpCategory(targetId, shouldScroll = true) {
        activeHelpCategoryId = targetId;
        renderHelpCategories();
        if (shouldScroll && ui.help.content) {
            const target = document.getElementById(targetId);
            if (target) {
                const y = target.getBoundingClientRect().top + ui.help.content.scrollTop - ui.help.content.getBoundingClientRect().top - 24;
                ui.help.content.scrollTo({ top: y, behavior: 'smooth' });
            }
        }
    }

    function toggleHelpMobileMenu(open = true) {
        if (!ui.help.mobilePanel || !ui.help.mobileOverlay) return;

        if (open) {
            ui.help.mobileOverlay.classList.remove('hidden');
            ui.help.mobilePanel.classList.remove('hidden');
            // Small delay to allow 'hidden' to be removed before starting transition
            setTimeout(() => {
                ui.help.mobileOverlay.classList.add('opacity-100');
                ui.help.mobilePanel.classList.remove('translate-x-full');
                ui.help.mobilePanel.classList.add('translate-x-0');
            }, 10);
        } else {
            ui.help.mobileOverlay.classList.remove('opacity-100');
            ui.help.mobilePanel.classList.add('translate-x-full');
            ui.help.mobilePanel.classList.remove('translate-x-0');
            // Wait for transition to finish before hiding
            setTimeout(() => {
                ui.help.mobileOverlay?.classList.add('hidden');
                ui.help.mobilePanel?.classList.add('hidden');
            }, 300);
        }
    }

    /* ===== UI HELPERS ===== */

    function showError(field, message, isGeneral = false, inputEl = null) {
        if (field) {
            field.textContent = message;
            field.classList.remove('hidden');
            if (isGeneral) {
                field.classList.add('flex', 'items-center', 'gap-2', 'justify-center');
                field.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> <span>${message}</span>`;
            }
        }
        if (inputEl) inputEl.classList.add('input-error');
    }

    function clearErrors() {
        Object.values(ui.errors).forEach(el => { el?.classList.add('hidden'); if (el) el.textContent = ''; });
        Object.values(ui.inputs).forEach(input => {
            if (input) {
                input.classList.remove('input-error');
                input.style.borderColor = '';
                input.disabled = false;
            }
        });
    }

    function clearLoginInputs() {
        [ui.inputs.id, ui.inputs.pass, ui.inputs.modalId, ui.inputs.modalPass].forEach((input) => {
            if (!input) return;
            input.value = '';
        });
    }

    function setLoading(formType, isLoading) {
        if (!isLoading) submitGuardLocked = false;
        const btn = formType === 'modal' ? ui.btns.modalSubmit : ui.btns.submit;
        if (!btn) return;
        const text = btn.querySelector('.btn-text');
        const spinner = btn.querySelector('.fa-spin');
        btn.disabled = isLoading;
        if (isLoading) {
            if (spinner) {
                spinner.classList.remove('hidden');
                spinner.style.display = 'inline-block';
                spinner.classList.add('text-2xl'); // Make it slightly larger
            }
            if (text) text.style.display = 'none'; // Hide text completely
            btn.classList.add('opacity-80', 'cursor-not-allowed');
            [ui.inputs.id, ui.inputs.pass, ui.inputs.modalId, ui.inputs.modalPass].forEach(i => { if (i) i.disabled = true; });
        } else {
            if (spinner) { spinner.classList.add('hidden'); spinner.style.display = 'none'; }
            if (text) {
                text.style.display = 'inline'; // Show text back
                text.textContent = formType === 'modal' ? 'Sign In' : 'Log In';
            }
            btn.classList.remove('opacity-80', 'cursor-not-allowed');
            [ui.inputs.id, ui.inputs.pass, ui.inputs.modalId, ui.inputs.modalPass].forEach(i => { if (i) i.disabled = false; });
        }
    }

    function setRecaptchaLoading(isLoading) {
        if (ui.captcha.loading) ui.captcha.loading.classList.toggle('hidden', !isLoading);
        if (ui.captcha.fullCheck) ui.captcha.fullCheck.disabled = isLoading;
    }

    function getPasswordAttempts(id) {
        return passwordFailedAttempts[id] || 0;
    }

    function incrementPasswordAttempts(id) {
        passwordFailedAttempts[id] = getPasswordAttempts(id) + 1;
        return passwordFailedAttempts[id];
    }

    function resetPasswordAttempts(id) {
        passwordFailedAttempts[id] = 0;
    }

    function isSameCaptchaFlow(a, b) {
        if (!a || !b) return false;
        return a.type === b.type && (a.id || '') === (b.id || '');
    }

    function prepareCaptchaFlow(flow, submission) {
        if (
            isSameCaptchaFlow(pendingCaptchaFlow, flow) &&
            ui.views.recaptcha &&
            !ui.views.recaptcha.classList.contains('hidden')
        ) {
            return;
        }
        pendingCaptchaFlow = flow;
        pendingCaptchaSubmission = submission;
        if (ui.captcha.fullCheck) ui.captcha.fullCheck.checked = false;
        setRecaptchaLoading(false);
        switchView('recaptcha');
    }

    /* ===== VIEW SWITCHER ===== */
    function switchView(viewName, updateHistory = true, clearForm = true) {
        Object.keys(ui.views).forEach(key => {
            const v = ui.views[key];
            if (v) {
                v.classList.add('hidden', 'opacity-0', 'translate-y-10');
                v.classList.remove('opacity-100', 'translate-y-0');
            }
        });

        const target = ui.views[viewName];
        if (target) {
            target.classList.remove('hidden');
            setTimeout(() => {
                target.classList.remove('opacity-0', 'translate-y-10');
                target.classList.add('opacity-100', 'translate-y-0');
            }, 50);
        }

        if (updateHistory) {
            const hash = viewName === 'landing' ? '#login' : `#${viewName}`;
            history.pushState({ view: viewName }, '', hash);
        }

        // Nav Logic
        if (viewName === 'landing') {
            if (clearForm) {
                clearLoginInputs();
                clearErrors();
            }
            if (ui.views.landing) {
                ui.views.landing.scrollTop = 0;
            }
            window.scrollTo(0, 0); // Always start at the top for the login page
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            ui.nav.title.innerText = "Interface Computer College";
            ui.nav.subtitle?.classList.remove('hidden');
            if (ui.nav.icon) {
                ui.nav.icon.classList.add('hidden');
                ui.nav.icon.style.display = 'none';
            }

            // Hide Hamburger on Login Page
            // Only show Help Center button on DESKTOP (XL)
            // Only show Help Center button on DESKTOP (XL)
            ui.btns.entryHelp.forEach(b => {
                if (b && b.id === 'entryHelpCenterBtn') {
                    // Reset inline style so CSS classes (hidden xl:flex) take over
                    b.style.display = '';
                    // DO NOT remove 'hidden' class here, let Media Query handle it
                } else if (b) {
                    b.style.display = '';
                }
            });

            // Always hide hamburger on landing
            if (ui.help.mobileNavBtn) {
                ui.help.mobileNavBtn.style.display = 'none';
                ui.help.mobileNavBtn.classList.add('hidden');
            }
        } else {
            ui.nav.subtitle?.classList.add('hidden');
            ui.nav.icon?.classList.remove('hidden');
            ui.nav.icon.classList.add('text-gray-400');
            ui.nav.icon.classList.remove('text-icc-yellow');
            ui.nav.icon.style.display = 'block';

            // Hamburger visibility: ONLY in Help View on Mobile
            if (ui.help.mobileNavBtn) {
                const isMobileHelp = (viewName === 'help'); // CSS xl:hidden handles desktop hide
                ui.help.mobileNavBtn.style.display = isMobileHelp ? '' : 'none';
                ui.help.mobileNavBtn.classList.toggle('hidden', !isMobileHelp);
            }

            // Hide help buttons when in Help or reCAPTCHA
            ui.btns.entryHelp.forEach(b => {
                if (b && b.id === 'entryHelpCenterBtn') {
                    b.style.display = 'none';
                    b.classList.add('hidden');
                }
            });

            // Hide help buttons when in Help or reCAPTCHA
            ui.btns.entryHelp.forEach(b => { if (b) b.style.display = 'none'; });

            if (viewName === 'help') {
                clearLoginInputs();
                clearErrors();
                ui.nav.title.innerText = "Help Center";
                renderHelpCategories();
            } else if (viewName === 'recaptcha') {
                ui.nav.title.innerText = "Security Check";
                if (ui.captcha.fullCheck) ui.captcha.fullCheck.checked = false;
                setRecaptchaLoading(false);

                // If we are in reCAPTCHA view but have no pending flow (e.g. from Back button), show error
                if (!pendingCaptchaFlow) {
                    if (ui.captcha.box) ui.captcha.box.classList.add('hidden');
                    if (ui.captcha.error) ui.captcha.error.classList.remove('hidden');
                    if (ui.captcha.fullCheck) ui.captcha.fullCheck.disabled = true;
                } else {
                    if (ui.captcha.box) ui.captcha.box.classList.remove('hidden');
                    if (ui.captcha.error) ui.captcha.error.classList.add('hidden');
                    if (ui.captcha.fullCheck) ui.captcha.fullCheck.disabled = false;
                }
            }
        }
    }

    window.onpopstate = (e) => {
        const view = e.state?.view || 'landing';
        switchView(view, false);
    };

    window.addEventListener('pageshow', () => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        if (ui.views.landing) {
            ui.views.landing.scrollTop = 0;
        }
    });

    /* ===== ACTIONS & EVENTS ===== */

    async function handleLogin(id, pass, formType, options = {}) {
        const { validatedCaptchaFlow = null } = options;
        if (submitGuardLocked) return;
        submitGuardLocked = true;
        clearErrors();

        // Skip delays and loading if returning from successful reCAPTCHA 
        // to make the error "already be there" on arrival.
        if (!validatedCaptchaFlow) {
            setLoading(formType, true);
            await new Promise(r => setTimeout(r, 800)); // Brief simulated check
        } else {
            submitGuardLocked = true;
        }

        // Step 1: Validate ID Presence
        if (!id) {
            const err = formType === 'modal' ? ui.errors.modalId : ui.errors.id;
            const inp = formType === 'modal' ? ui.inputs.modalId : ui.inputs.id;
            showError(err, "ID or Email is required.", false, inp);
            if (!validatedCaptchaFlow) setLoading(formType, false);
            return;
        }

        // Delay for actual credential check ONLY if not from CAPTCHA
        if (!validatedCaptchaFlow) {
            await new Promise(r => setTimeout(r, 1200));
        }

        const matchedUser = findManagedAccount(id);
        const accountKey = String(matchedUser?.uid || matchedUser?.id || id).trim();
        const account = matchedUser ? {
            password: String(matchedUser.password || buildManagedUserPassword(matchedUser)),
            redirect: getRedirectForRole(matchedUser.type || matchedUser.role),
            role: String(matchedUser.type || matchedUser.role || '').trim().toLowerCase(),
            status: String(matchedUser.status || 'active').trim().toLowerCase()
        } : null;

        // Step 2: Match Account ID BEFORE checking password presence
        if (!account) {
            const invalidLoginCaptchaFlow = { type: 'invalid-login-id' };

            const securityConfig = getLoginSecurityConfig();
            if (invalidLoginIdAttempts >= securityConfig.loginIdAttempts && !isSameCaptchaFlow(validatedCaptchaFlow, invalidLoginCaptchaFlow)) {
                setLoading(formType, false);
                prepareCaptchaFlow(invalidLoginCaptchaFlow, { id, pass, formType });
                return;
            }

            invalidLoginIdAttempts++;
            pendingCaptchaFlow = null;
            pendingCaptchaSubmission = null;
            setLoading(formType, false);
            const err = formType === 'modal' ? ui.errors.modalId : ui.errors.id;
            const inp = formType === 'modal' ? ui.inputs.modalId : ui.inputs.id;
            showError(err, "Enter valid ID or email.", false, inp);
            return;
        }

        // Step 3: Validate Password Presence (Only if ID matched)
        if (!pass) {
            const err = formType === 'modal' ? ui.errors.modalPass : ui.errors.pass;
            const inp = formType === 'modal' ? ui.inputs.modalPass : ui.inputs.pass;
            showError(err, "Password is required.", false, inp);
            setLoading(formType, false);
            return;
        }

        if (sessionLockedAccounts.has(accountKey) || account.status === 'locked') {
            setLoading(formType, false);
            const err = formType === 'modal' ? ui.errors.modalPass : ui.errors.pass;
            const inp = formType === 'modal' ? ui.inputs.modalPass : ui.inputs.pass;
            showError(err, "The account is locked. Please contact Administrative personnel", false, inp);
            return;
        }

        // Step 4: Verify Password
        if (account.password !== pass) {
            const currentPasswordAttempts = getPasswordAttempts(accountKey);
            const wrongPasswordCaptchaFlow = { type: 'wrong-password', id: accountKey };

            const securityConfig = getLoginSecurityConfig();
            if (currentPasswordAttempts >= securityConfig.loginIdAttempts && !isSameCaptchaFlow(validatedCaptchaFlow, wrongPasswordCaptchaFlow)) {
                setLoading(formType, false);
                prepareCaptchaFlow(wrongPasswordCaptchaFlow, { id, pass, formType });
                return;
            }

            const nextPasswordAttempts = incrementPasswordAttempts(accountKey);
            pendingCaptchaFlow = null;
            pendingCaptchaSubmission = null;
            setLoading(formType, false);
            const err = formType === 'modal' ? ui.errors.modalPass : ui.errors.pass;
            const inp = formType === 'modal' ? ui.inputs.modalPass : ui.inputs.pass;
            if (nextPasswordAttempts > securityConfig.passwordAttempts) {
                // Persistent Lockout: Update user status in storage
                const users = getStoredUsers();
                const userIdx = users.findIndex(u => String(u.uid || u.id || '') === String(accountKey));
                if (userIdx !== -1) {
                    users[userIdx].status = 'Locked';
                    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
                }

                sessionLockedAccounts.add(accountKey);
                showError(err, "The account is locked. Please contact Administrative personnel", false, inp);
                return;
            }
            showError(err, "Wrong password.", false, inp);
            return;
        }

        if (account.status !== 'active') {
            setLoading(formType, false);
            const err = formType === 'modal' ? ui.errors.modalPass : ui.errors.pass;
            const inp = formType === 'modal' ? ui.inputs.modalPass : ui.inputs.pass;
            showError(err, "Invalid credentials. Please check your Email or Login ID and password.", false, inp);
            pendingCaptchaFlow = null;
            pendingCaptchaSubmission = null;
            return;
        }

        invalidLoginIdAttempts = 0;
        resetPasswordAttempts(accountKey);
        pendingCaptchaFlow = null;
        pendingCaptchaSubmission = null;
        sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({
            id: matchedUser.uid || matchedUser.id || '',
            role: account.role,
            firstName: matchedUser.firstName || '',
            lastName: matchedUser.lastName || '',
            email: matchedUser.email || '',
            avatar: matchedUser.avatar || ''
        }));
        window.location.href = account.redirect;
    }

    // Unified Submission Listeners (Handles both Enter key and Button click)
    ui.form?.addEventListener('submit', (e) => {
        e.preventDefault();
        handleLogin(ui.inputs.id.value, ui.inputs.pass.value, 'landing');
    });

    ui.modalForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        handleLogin(ui.inputs.modalId.value, ui.inputs.modalPass.value, 'modal');
    });

    // Restore explicit Enter key listeners for faster, identical response
    [ui.inputs.id, ui.inputs.pass].forEach(inp => {
        inp?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleLogin(ui.inputs.id.value, ui.inputs.pass.value, 'landing');
            }
        });
    });

    [ui.inputs.modalId, ui.inputs.modalPass].forEach(inp => {
        inp?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleLogin(ui.inputs.modalId.value, ui.inputs.modalPass.value, 'modal');
            }
        });
    });

    /* ===== OTHER UI LISTENERS ===== */

    document.querySelectorAll('.password-toggle-btn').forEach(btn => {
        btn.onmousedown = (e) => e.preventDefault();
        btn.onclick = () => {
            const inp = document.getElementById(btn.dataset.target);
            const icon = btn.querySelector('i');
            const isPass = inp.type === 'password';
            inp.type = isPass ? 'text' : 'password';
            icon.classList.toggle('fa-eye', isPass);
            icon.classList.toggle('fa-eye-slash', !isPass);
        };
    });

    [ui.inputs.pass, ui.inputs.modalPass].forEach(inp => inp?.addEventListener('input', () => {
        const btn = inp.parentElement.querySelector('.password-toggle-btn');
        btn?.classList.toggle('opacity-0', !inp.value);
        btn?.classList.toggle('pointer-events-none', !inp.value);
    }));

    ui.captcha.fullCheck?.addEventListener('change', (e) => {
        const ok = e.target.checked;
        if (!ok) {
            setRecaptchaLoading(false);
            return;
        }
        setRecaptchaLoading(true);
        setTimeout(() => {
            const resolvedCaptchaFlow = pendingCaptchaFlow;
            const resumeSubmission = pendingCaptchaSubmission;
            pendingCaptchaFlow = null;
            pendingCaptchaSubmission = null;
            if (ui.captcha.fullCheck) ui.captcha.fullCheck.checked = false;
            setRecaptchaLoading(false);
            switchView('landing', true, false); // Do NOT clear form so error is "already there"
            if (resumeSubmission && resolvedCaptchaFlow) {
                setTimeout(() => {
                    handleLogin(
                        resumeSubmission.id,
                        resumeSubmission.pass,
                        resumeSubmission.formType,
                        { validatedCaptchaFlow: resolvedCaptchaFlow }
                    );
                }, 50);
            }
        }, 1400);
    });
    ui.btns.entryHelp.forEach(b => b.onclick = () => switchView('help'));
    document.getElementById('backToLoginLogo')?.addEventListener('click', (e) => { e.preventDefault(); switchView('landing'); });

    ui.help.mobileNavBtn?.addEventListener('click', () => {
        const isOpen = !ui.help.mobilePanel?.classList.contains('hidden');
        toggleHelpMobileMenu(!isOpen);
    });
    ui.help.mobileClose?.addEventListener('click', () => toggleHelpMobileMenu(false));
    ui.help.mobileOverlay?.addEventListener('click', () => toggleHelpMobileMenu(false));

    [ui.help.desktop, ui.help.mobile].forEach(c => c?.addEventListener('click', (e) => {
        const t = e.target.closest('[data-help-target]');
        if (t) { setActiveHelpCategory(t.dataset.helpTarget, true); toggleHelpMobileMenu(false); }
    }));

    // Start view
    const hashView = window.location.hash.replace('#', '') || 'landing';
    const finalStart = (hashView === 'help' || hashView === 'recaptcha' || hashView === 'landing') ? hashView : 'landing';
    switchView(finalStart, false);

});
