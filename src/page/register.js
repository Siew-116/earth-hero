const e = React.createElement;

// ======= Function to sign up =======
function RegisterForm({switchToLogin}) {
    const [successMsg, setSuccessMsg] = React.useState('');
    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [role, setRole] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [error, setError] = React.useState('');
    const [passwordFocused, setPasswordFocused] = React.useState(false);
    // Validation state
    const [errors, setErrors] = React.useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: ''
    });

    // Regex patterns
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Real-time validation functions
    function validateName(val) {
        return /\d/.test(val) ? 'Full Name cannot contain numbers' : '';
    }

    function validateEmail(val) {
        if (!emailRegex.test(val)) return 'Invalid email format';
        return '';
    }

    // Password requirements 
    function getPasswordRequirements(val) {
        return {
            length: val.length >= 6 && val.length <= 8,
            uppercase: /[A-Z]/.test(val),
            number: /\d/.test(val),
            specialChar: /[@#$]/.test(val),
            noSpaces: !/\s/.test(val)
        };
    }

    // helper to map to color
    function requirementColor(isValid) {
        return isValid ? 'green' : 'red';
    }

    function validatePassword(val) {
        const r = getPasswordRequirements(val);
        const allPassed = Object.values(r).every(Boolean);
        return allPassed ? '' : 'Password does not meet requirements';
    }


    function validateConfirmPassword(val) {
        if (val !== password) return 'Passwords do not match';
        return '';
    }

    function validateRole(val) {
        if (!val) return 'Role must be selected';
        return '';
    }

    // Handle submit
    async function handleSubmit(e) {
        e.preventDefault();

        // Run validations
        const newErrors = {
            name: validateName(name),
            email: validateEmail(email),
            password: validatePassword(password),
            confirmPassword: validateConfirmPassword(confirmPassword),
            role: validateRole(role)
        };
        setErrors(newErrors);

        const hasError = Object.values(newErrors).some(err => err);
        if (hasError) return; // stop submission if any error

        try {
            // Check email availability on server
            const resCheck = await fetch(`/earth-hero/src/backend/signUp.php?action=checkEmail&email=${encodeURIComponent(email)}`);
            const dataCheck = await resCheck.json();

            if (dataCheck.exists) {
                // Update error state
                setErrors(prev => ({ ...prev, email: 'Account already exists. Please log in or try again.' }));
                return; // stop process
            }

            // if email is available, sign up account to backend
            const resRegister = await fetch("/earth-hero/src/backend/signUp.php?action=register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include", // REQUIRED for session cookie
                body: JSON.stringify({ name, email, password, role })
            });
            const dataRegister = await resRegister.json();

            if (dataRegister.success) {
                setSuccessMsg("Register successfully! Please login now.");

                // Save token in memory
                //window.csrfToken = dataRegister.csrf_token;
                localStorage.setItem('csrf_token', dataRegister.csrf_token);

                // reset the input field if success
                setName(''); setEmail(''); setPassword(''); setConfirmPassword(''); setRole('');
                // reset error states
                setErrors({ name: '', email: '', password: '', confirmPassword: '', role: '' });
            } else {
                setError(dataRegister.message || "Registration failed.");
                setErrors(prev => ({ ...prev, email: dataRegister.message }));
                localStorage.removeItem('csrf_token');
            }
        } catch (err) {
            console.error('Registration failed', err);
            localStorage.removeItem('csrf_token');
        }
    }

    React.useEffect(() => {
        if (!successMsg) return;

        const timer = setTimeout(() => {
            setSuccessMsg('');
            switchToLogin();
        }, 1500); // 3 seconds

        return () => clearTimeout(timer);
    }, [successMsg]);

    // return sign Up Form
    return e('form', { onSubmit: handleSubmit, className: "register-form"  },
        
        // Success overlay
        successMsg && e(SuccessOverlay, {
            message: successMsg,
            onClose: () => setSuccessMsg('')
        }),
        e('div', { className: 'form-title' }, 'Sign up New Account'),

        // Email
        e('div', { className: 'input-wrapper' },
        e('i', { className: 'fa fa-envelope' }),
        e('input', {className: 'input', 
            type: 'email', 
            value: email, 
            onChange: e => {
                setEmail(e.target.value);
                setErrors(prev => ({ ...prev, email: validateEmail(e.target.value) }));
            }, 
            placeholder: 'Email', 
            required: true })
            
        ),errors.email && e('div', { className: 'error' }, errors.email),
        
        // Full name
        e('div', { className: 'input-wrapper' },
        e('i', { className: 'fa fa-user' }),
        e('input', { className: 'input', 
            type: 'text', 
            value: name, 
            onChange: e => {
                setName(e.target.value);
                setErrors(prev => ({ ...prev, name: validateName(e.target.value) }));
            }, 
            placeholder: 'Full Name', 
            required: true })
           
        ), errors.name && e('div', {className: 'error' }, errors.name),
        
        // Password
        e('div', { className: 'input-wrapper' },
        e('i', { className: 'fa fa-lock' }),
        e('input', {
            className: 'input',
            type: showPassword ? 'text' : 'password',
            value: password,
            placeholder: 'Password',
            onChange: e => {
                setPassword(e.target.value);
                setErrors(prev => ({ ...prev, password: validatePassword(e.target.value) }));
            }, 
            onFocus: () => setPasswordFocused(true),    // show requirements
            onBlur: () => setPasswordFocused(false),     // hide on blur
            required: true
        }),
        e('i', {
            className: showPassword ? 'fa fa-eye' : 'fa fa-eye-slash',
            onClick: () => setShowPassword(!showPassword),
        })
        ),errors.password && e('div', { className: 'error' }, errors.password),

        // Password requirements message
        passwordFocused && (() => {
            const reqs = getPasswordRequirements(password); // check current password
            return e('ul', { className: 'password-requirements' },
                e('li', { style: { color: requirementColor(reqs.length) } }, '6–8 characters long'),
                e('li', { style: { color: requirementColor(reqs.uppercase) } }, 'At least one uppercase letter'),
                e('li', { style: { color: requirementColor(reqs.number) } }, 'At least one number'),
                e('li', { style: { color: requirementColor(reqs.specialChar) } }, 'At least one special character (@, #, $)'),
                e('li', { style: { color: requirementColor(reqs.noSpaces) } }, 'No spaces allowed')
            );
        })(),

        // Confirm password
        e('div', { className: 'input-wrapper' },
        e('i', { className: 'fa fa-lock' }),
        e('input', {
            className: 'input',
            type: showPassword ? 'text' : 'password',
            value: confirmPassword,
            onChange: e => {
                setConfirmPassword(e.target.value);
                setErrors(prev => ({ ...prev, confirmPassword: validateConfirmPassword(e.target.value) }));
            }, 
            placeholder: 'Confirm Password',
            required: true
        }),
        e('i', {
            className: showPassword ? 'fa fa-eye' : 'fa fa-eye-slash',
            onClick: () => setShowPassword(!showPassword),
            style: { cursor: 'pointer' }
        })
        ),errors.confirmPassword && e('div', { className: 'error' }, errors.confirmPassword),
        
        // Role
        e('div', { className: 'role-group' },
        e('i', { className: 'fa fa-briefcase' }),
        e('label', null,
            // admin
            e('input', {
                    className: 'role-input',
                    type: 'radio',
                    name: 'role',
                    value: 'Admin',
                    checked: role === 'Admin',
                    onChange: e => setRole(e.target.value)
                }),
                ' Admin'
            ),
            // user
            e('label', null,
                e('input', {
                    className: 'role-input',
                    type: 'radio',
                    name: 'role',
                    value: 'User',
                    checked: role === 'User',
                    onChange: e => setRole(e.target.value)
                }),
                ' User'
            )
    ),errors.role && e('div', { className: 'error' }, errors.role),

        // Register button
        e('div', { className: 'register-btn-container' },
            e('button', { className:'long-button', type: 'submit' }, 'Sign Up')),

        // Change to login
        e('div', { className: 'center-container' },
            e('p',{className: 'sub-text'}, "No account? ",
                e('span', {className: 'link', onClick: switchToLogin}, "Login")
            )
        ),
    error && e(ErrorOverlay, { message: error, onClose: () => setError('') })

    );    
}


// ======= Function to login =======
function LoginForm({switchToSignUp}) {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [role, setRole] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [error, setError] = React.useState('');
    // Validation state
    const [errors, setErrors] = React.useState({
        email: '',
        password: '',
        role: ''
    });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    function validateEmail(val) {
        if (!emailRegex.test(val)) return 'Invalid email format';
        return '';
    }

    function validateRole(val) {
        if (!val) return 'Role must be selected';
        return '';
    }

    // Send login credentials to server
    async function handleSubmit(e) {
        e.preventDefault();

        // Run validations
        const newErrors = {
            email: validateEmail(email),
            role: validateRole(role)
        };
        setErrors(newErrors);
        const hasError = Object.values(newErrors).some(err => err);
        if (hasError) return;

        try {
            const res = await fetch("/earth-hero/src/backend/login.php?action=login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email, password, role })
            });

            const data = await res.json();
            if (!res.ok) throw data;

            //window.csrfToken = data.csrf_token;
            localStorage.setItem('csrf_token', data.csrf_token);

            if (data.role === "Admin") {
                window.location.href = "/earth-hero/src/dashboard.html";
            } else {
                window.location.href = "/earth-hero/src/index.html";
            }
        } catch (err) {
            setError(err.message || "Login failed");
            localStorage.removeItem('csrf_token');
        }
    }


    // return sign Up Form
    return e('form', { onSubmit: handleSubmit, className: "register-form" },
        e('div', { className: 'form-title' }, 'Login to Continue'),

        // Role buttons
        e('div', {className: 'role-container'},
            e('button', { className:'role-btn' + (role === 'User' ? ' selected' : ''), type: 'button', onClick: () => setRole('User') }, 
                e('i', { className: 'fa fa-users' }),
                'User'),
            e('button', { className:'role-btn' + (role === 'Admin' ? ' selected' : ''), type: 'button', onClick: () => setRole('Admin') }, 
                e('i', { className: 'fa fa-user-tie' }),
                'Admin')
        ),errors.role && e('span', { className: 'error' }, errors.role),

        // Email
        e('div', { className: 'input-wrapper' },
            e('i', { className: 'fa fa-envelope' }),
            e('input', { className: 'input', 
                type: 'email', value: email, 
                onChange: e => {
                setEmail(e.target.value);
                setErrors(prev => ({ ...prev, email: validateEmail(e.target.value) }));
            }, 
            placeholder: 'Email', 
            required: true })
        ),errors.email && e('div', { className: 'error' }, errors.email),

        // Password
        e('div', { className: 'input-wrapper' },
            e('i', { className: 'fa fa-lock' }),
            e('input', {
                className: 'input',
                type: showPassword ? 'text' : 'password',
                value: password,
                onChange: e => setPassword(e.target.value),
                placeholder: 'Password',
                required: true
            }),
            e('i', {
                className: showPassword ? 'fa fa-eye' : 'fa fa-eye-slash',
                onClick: () => setShowPassword(!showPassword),
                style: { cursor: 'pointer' }
            })
        ), errors.password && e('div', { className: 'error' }, errors.password),

        // Login button
        e('div', { className: 'register-btn-container' },
            e('button', { className:'long-button', type: 'submit' }, 'Login')
        ),

        // Switch to signup
        e('div', { className: 'center-container' },
            e('p',{className: 'sub-text'}, "No account? ",
                e('span', {className: 'link', onClick: switchToSignUp}, "Sign Up")
            )
        ),
        error && e(ErrorOverlay, { message: error, onClose: () => setError('') })

    );
}



// ======= Render Register Page =======
function RegisterPage() {
    const [page, setPage] = React.useState('login'); // default
    const [overlayVisible, setOverlayVisible] = React.useState(false);
    const [overlayType, setOverlayType] = React.useState('');

    // openOverlay
    function openOverlay(type) {
        setOverlayType(type);  
        setOverlayVisible(true);
    }

    // closeOverlay
    function closeOverlay() {
        setOverlayVisible(false);
        setOverlayType('');
    }

    return e('div', { className: 'register-container' },
        // Header
        e('div', { className: 'header' },
        e('h1', null, 'EarthHero'),
        e('img', { src: '../assets/earthhero-green.jpg', alt: 'logo' })
        ),

        // Form
        e('div', { className: 'form-container' },
        page === 'signup'
            ? e(RegisterForm, { switchToLogin: () => setPage('login') })
            : e(LoginForm, { switchToSignUp: () => setPage('signup') })
        ),

        // Disclaimer
        e(Disclaimer, { page, openOverlay }),
        // Modal rendering
        overlayVisible && e('div', { className: 'modal-overlay', onClick: closeOverlay },
            e('div', { className: 'modal-content', onClick: e => e.stopPropagation() },
                e('h2', null, overlayType === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'),
                e('p', null, overlayType === 'privacy'
                    ? e(PrivacyPolicy)
                    : e(TermsCondition)),
                e('button', { className: 'button', onClick: closeOverlay }, 'Close')
            )
        )
        
    );
}

function PrivacyPolicy() {
    return e('div', {className:'pc-content'}, 
        e('h2', null, "Privacy Policy"),
        e('h3', {className:'sub-text'}, "Effective Date: Nov 12, 2025"),
        e('p', {className:'paragraph'}, "At EarthHero, your privacy and trust are our top priorities. This Privacy Policy explains how we collect, use, and protect your personal information when you interact with our website. By accessing or using our site, you agree to the terms outlined below. We are committed to maintaining transparency and ensuring that your personal data is handled securely and responsibly."),
        e('h3', {className:'sub-text'},"What information we collect?"),
        e('p', {className:'paragraph'},"We collect information to provide better services and improve your shopping experience. This includes:"),
        e('p', {className:'paragraph'},"-Personal Information: Name, email address, phone number, and shipping/billing address when you register, make a purchase, or contact us."),
        e('p', {className:'paragraph'},"-Payment Information: Securely processed payment details (handled by trusted third-party payment providers)."),
        e('p', {className:'paragraph'},"-Technical Data: Browser type, device information, IP address, and usage statistics collected through cookies to help us improve website performance."),
        e('p', {className:'paragraph'},"-Optional Information: Feedback, reviews, or responses to surveys that you voluntarily provide."),
        e('h3', {className:'sub-text'},"How we use your information?"),
        e('p', {className:'paragraph'},"Your information helps us to:"),
        e('p', {className:'paragraph'},"-Process and deliver your orders efficiently."),
        e('p', {className:'paragraph'},"-Provide customer support and respond to inquiries."),
        e('p', {className:'paragraph'},"-Send order confirmations, updates, and promotional offers (only with your consent)."),
        e('p', {className:'paragraph'},"-Improve our website design, functionality, and shopping experience."),
        e('p', {className:'paragraph'},"-Ensure compliance with legal requirements and prevent fraudulent activities."),
        e('h3', {className:'sub-text'},"Data protection and security"),
        e('p', {className:'paragraph'},"We use appropriate technical and organizational measures to protect your personal information from unauthorized access, loss, misuse, or alteration. Sensitive data such as payment information is encrypted and securely processed through trusted third-party payment gateways. Our website uses HTTPS encryption to safeguard your online transactions and account details.")
    )
}

function TermsCondition() {
    return e('div', {className:'tc-content'}, 
        e('h2', null, "Terms & Condition"),
        e('h3', {className:'sub-text'}, "Effective Date: Nov 12, 2025"),
        e('h4', {className:'word-text'},"Welcome to EarthHero! By using our website, you agree to the following terms:"),
        e('p', {className:'paragraph'}, "At EarthHero, your privacy and trust are our top priorities. This Privacy Policy explains how we collect, use, and protect your personal information when you interact with our website. By accessing or using our site, you agree to the terms outlined below. We are committed to maintaining transparency and ensuring that your personal data is handled securely and responsibly."),
        e('p', {className:'paragraph'}, "1. Eligibility & Account"),
        e('p', {className:'paragraph'}, "You must be at least 18 years old to shop with us. If you create an account, keep your login details private. You are responsible for any actions made through your account, including orders and communications."),
        e('p', {className:'paragraph'}, "2. Products, Orders & Payment"),
        e('p', {className:'paragraph'}, "You must be at least 18 years old to shop with us. If you create an account, keep your login details private. You are responsible for any actions made through your account, including orders and communications."),
        e('p', {className:'paragraph'}, "3. Shipping & Delivery"),
        e('p', {className:'paragraph'}, "We aim to ship orders as quickly as possible. Delivery times may vary based on your location and courier delays. Once your order is shipped, we are not responsible for delays caused by the courier. Please ensure your shipping address is correct — we are not liable for lost packages due to incorrect information."),
        e('p', {className:'paragraph'}, "4. Returns & Refunds"),
        e('p', {className:'paragraph'}, "If you receive a damaged or incorrect item, contact us within 7 days of delivery with proof (photo or video). Items must be unused and in their original packaging. We may offer a replacement, exchange, or refund depending on the situation. We do not accept returns for change of mind unless stated otherwise."),
        e('p', {className:'paragraph'}, "5. User Conduct"),
        e('p', {className:'paragraph'}, "You agree not to misuse our website, including attempting to hack, damage, or disrupt our services. Any fraudulent activities will result in account termination and possible legal action."),
        e('p', {className:'paragraph'}, "6. Privacy"),
        e('p', {className:'paragraph'}, "We collect certain information to process your orders and improve your shopping experience. We do not sell or disclose your personal data to third parties except for essential services such as payment processing or shipping."),
        e('p', {className:'paragraph'}, "7. Changes to Terms"),
        e('p', {className:'paragraph'}, "Earth Hero may update these Terms & Conditions at any time. Continued use of our website means you accept the updated terms."),
        e('p', {className:'paragraph'}, "8. Contact Us"),
        e('p', {className:'paragraph'}, "If you have questions about our Terms & Conditions, reach out to us at our official contact channels."),
    )
}
// Render disclaimer
function Disclaimer({page, openOverlay}) {

    return e('div', { className: 'disclaimer' },
        e('p', null,
            page === 'signup'
                ? [
                    "By signing up, you are creating an EcoMart account," ,
                    e('br',{key: 'br1'}),"and you agree to EcoMart’s ",
                    e('span', { key: 'privacy', className: 'link', onClick: () => openOverlay('privacy') }, "Privacy Policy"),
                    " and ",
                    e('span', { key: 'tc', className: 'link', onClick: () => openOverlay('tc') }, "Terms & Conditions"),
                    "."
                  ]
                : [
                    e('span', { key: 'privacy', className: 'link', onClick: () => openOverlay('privacy') }, "Privacy Policy"),
                    " | ",
                    e('span', { key: 'tc', className: 'link', onClick: () => openOverlay('tc') }, "Terms & Condition"),
                  ]
        )
    );
}


// ====== Rendering =======
const container = document.getElementById('register-container');
ReactDOM.createRoot(container).render(e(RegisterPage));