
const e = React.createElement;

// ======= Function to sign up =======
function RegisterForm({switchToLogin}) {
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
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@#$])([^\s]{6,8})$/;

    // Real-time validation functions
    function validateName(val) {
        return /\d/.test(val) ? 'Full Name cannot contain numbers' : '';
    }

    function validateEmail(val) {
        if (!emailRegex.test(val)) return 'Invalid email format';
        return '';
    }

    // ===== Password requirements =====
    function getPasswordRequirements(val) {
        return {
            length: val.length >= 6 && val.length <= 8,
            uppercase: /[A-Z]/.test(val),
            number: /\d/.test(val),
            specialChar: /[@#$]/.test(val),
            noSpaces: !/\s/.test(val)
        };
    }

    // ===== Optional helper to map to color =====
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
    function handleSubmit(e) {
        e.preventDefault();
        console.log("Submitting form");
         // Run validations
        const newErrors = {
            name: validateName(name),
            email: validateEmail(email),
            password: validatePassword(password),
            confirmPassword: validateConfirmPassword(confirmPassword),
            role: validateRole(role)
        };
        setErrors(newErrors);
        console.log(newErrors);
        const hasError = Object.values(newErrors).some(err => err);
        if (hasError) return; // stop submission if any error

        // Check email availability on server
        fetch(`http://localhost/earth-hero/src/backend/signUp.php?action=checkEmail&email=${encodeURIComponent(email)}`)
            .then(res => res.json())
            .then(data => {
                if (data.exists) {
                    console.log("Stop: existing account");
                    // Update error state
                    setErrors(prev => ({ ...prev, email: 'Account already exists. Please log in or try again.' }));
                    return; // stop process
                }

                // if email is available
                // sign up account to backend
                fetch("http://localhost/earth-hero/src/backend/signUp.php?action=register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, password, role }) 
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        console.log("Sucess register");
                        alert(`User ${data.name} registered!`);
                        // Save token in memory
                        window.csrfToken = data.csrf_token;
                        console.log(data);
                        // reset the input field if success
                        setName(''); setEmail(''); setPassword(''); setConfirmPassword(''); setRole('');
                        // reset error states
                        setErrors({name:'', email:'', password:'', confirmPassword:'', role:''});
                    } else {
                        setError(data.message || "Registration failed.");
                        setErrors(prev => ({ ...prev, email: data.message }));
                    }
                });
            });
    }

    // return sign Up Form
    return e('form', { onSubmit: handleSubmit, className: "register-form"  },
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
            e('button', { className:'button', type: 'submit' }, 'Sign Up')),

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
    function handleSubmit(e) {
        e.preventDefault();
        // Run validations
        const newErrors = {
            email: validateEmail(email),
            role: validateRole(role)
        };
        setErrors(newErrors);
        console.log(newErrors);
        const hasError = Object.values(newErrors).some(err => err);
        if (hasError) return;

        console.log("Logging");
        fetch("http://localhost/earth-hero/src/backend/login.php?action=login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, role })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                console.log(data);
                alert(`Welcome back, ${data.name}`);
                setEmail(''); setPassword(''); setRole('');
                // Save token in memory
                window.csrfToken = data.csrf_token;  // temporary storage
            } else {
                setError(data.message);
            }
        });
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
            e('button', { className:'button', type: 'submit' }, 'Login')
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
    const [page, setPage] = React.useState('signup'); // default
    const [overlayVisible, setOverlayVisible] = React.useState(false);
    const [overlayType, setOverlayType] = React.useState('');

    // openOverlay
    function openOverlay(type) {
        setOverlayType(type);  // store type
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
                    ? "Privacy Policy content goes here..."
                    : "Terms & Conditions content goes here..."),
                e('button', { className: 'button', onClick: closeOverlay }, 'Close')
            )
        )
        
    );
}

// Render disclaimer
function Disclaimer({page, openOverlay}) {
    const isSignup = page === 'signup';

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