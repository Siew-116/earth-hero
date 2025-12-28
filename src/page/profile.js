function MyProfile() {
    const [errorMsg, setErrorMsg] = React.useState('');
    const [successMsg, setSuccessMsg] = React.useState('');
    const [isEditing, setIsEditing] = React.useState(false);
    const [originalData, setOriginalData] = React.useState(null);
    // User info
    const [username, setUsername] = React.useState('');
    const [fullname, setFullname] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [gender, setGender] = React.useState('');
    const [birthday, setBirthday] = React.useState('');

    // Address info (default address)
    const [recipient, setRecipient] = React.useState('');
    const [address, setAddress] = React.useState('');
    const [postcode, setPostcode] = React.useState('');
    const [city, setCity] = React.useState('');
    const [state, setState] = React.useState('');
    const [country, setCountry] = React.useState('');
    const [availableStates, setAvailableStates] = React.useState([]);
    const [availableCities, setAvailableCities] = React.useState([]);
    const [availablePhoneCodes, setAvailablePhoneCodes] = React.useState([]);
    const [countries, setCountries] = React.useState([]);
    const [phoneCode, setPhoneCode] = React.useState('');
    const [contactNumber, setContactNumber] = React.useState('');

    // Validate user and fetch information
    React.useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch('/earth-hero/src/backend/users.php?action=getUser', {
                    credentials: 'include'
                });
                const data = await res.json();
                if (!data) return;
                const user = data.user || {};
                window.csrfToken = data.csrf_token;

                // User table
                setUsername(user.username || ''); 
                setFullname(user.name || '');
                setEmail(user.email || '');
                setGender(user.gender || '');
                setBirthday(user.birthday && user.birthday !== '0000-00-00' ? user.birthday : '');

                // Address table (default address)
                const addr = data.default_address || {};
                setRecipient(addr.recipient || '');
                setAddress(addr.address || '');
                setPostcode(addr.postcode || '');
                setCity(addr.city || '');
                setState(addr.state || '');
                setCountry(addr.country || '');
                setPhoneCode(addr.phoneCode || '');
                setContactNumber(addr.contact || '');
            } catch (err) {
                console.error('Failed to fetch user data', err);
            }
        };
        fetchUser();
    }, []);


    // Update profile
    async function handleSave(e) {
        e.preventDefault();
        const payload = {
            username, fullname, gender, birthday,
            recipient, address, postcode, city, state, country, phoneCode, contactNumber
        };

        try {
            const res = await fetch('/earth-hero/src/backend/users.php?action=updateUser', {
                method: 'POST',
                credentials: 'include',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': window.csrfToken 
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.success) {
                setSuccessMsg('Profile updated successfully');
                setIsEditing(false);
            } else {
                setErrorMsg('Update failed: ' + data.message);
            }
        } catch (err) {
            console.error('Update failed', err);
        }
    }


    React.useEffect(() => {
        if (!successMsg) return;

        const timer = setTimeout(() => {
            setSuccessMsg('');
        }, 1500); // 3 seconds

        return () => clearTimeout(timer);
    }, [successMsg]);
    
    // Load JSON once
    React.useEffect(() => {
        fetch('../data/countries+states+cities.json')
            .then(res => res.json())
            .then(data => {
                setCountries(data);
                setAvailablePhoneCodes(data.map(c => ({ name: c.name, code: c.phone_code })));
            })
            .catch(err => console.error('Failed to load countries JSON', err));
    }, []);

    // Populate states when country changes
    function handleCountryChange(e) {
        const countryName = e.target.value;
        const selected = countries.find(c => c.name === countryName);
        if (selected) {
            setCountry(countryName);
            setAvailableStates(selected.states || []);
            setState('');
            setCity('');
            setAvailableCities([]);
            // Only set phone code if currently empty
            if (!phoneCode) setPhoneCode(selected.phone_code || '');
            // Only clear contact number if currently empty
            if (!contactNumber) setContactNumber('');
        } else {
            setCountry('');
            setAvailableStates([]);
            setState('');
            setCity('');
            setAvailableCities([]);
            // Only reset if currently empty
            if (!phoneCode) setPhoneCode('');
            if (!contactNumber) setContactNumber('');
        }
    }

    // Populate cities when state changes
    function handleStateChange(e) {
        const stateName = e.target.value;
        setState(stateName);

        // Find selected state object
        const selectedState = availableStates.find(s => s.name === stateName);

        // Populate cities
        setAvailableCities(selectedState?.cities || []);
        setCity(''); // reset city selection

        // Autofill postcode only if JSON has it
        if (selectedState?.postcode) {
            setPostcode(selectedState.postcode);
        }
    }


    React.useEffect(() => {
        if (!countries.length) return;

        if (country) {
            const selectedCountry = countries.find(c => c.name === country);
            if (selectedCountry) {
                setAvailableStates(selectedCountry.states || []);

                if (state) {
                    const selectedState = selectedCountry.states.find(s => s.name === state);
                    setAvailableCities(selectedState?.cities || []);
                }
            }
        }
    }, [countries, country, state]);

    return e('div', { className: 'section-page' },
        successMsg && e(SuccessOverlay, {
            message: successMsg,
            onClose: () => setSuccessMsg('')
        }),
        errorMsg && e(ErrorOverlay, {
            message: errorMsg,
            onClose: () => setErrorMsg('')
        }),
        e('p', { className: 'section-title' }, "Edit Profile"),
        e('div', { className: 'section-content' },
            e('form', {
                className: `user-profile-form ${isEditing ? 'edit-mode' : 'view-mode'}`,
                onSubmit: handleSave
            },

                e('div', { className: 'form-content' },
        
                    e('div', { className: 'labels-col' },
                        e('label', null, 'Username'),
                        e('label', null, 'Name'),
                        e('label', null, 'Email'),
                        e('label', null, 'Password'),
                        e('label', null, 'Gender'),
                        e('label', null, 'Birthday'),
                        e('label', null, 'Shipping Details'),
                    ),

                    e('div', { className: 'inputs-col' },
                        e('input', { 
                            type: 'text', 
                            placeholder: 'Enter username', 
                            disabled: !isEditing,
                            value: username,
                            onChange: e => setUsername(e.target.value)
                        }),
                        e('input', { 
                            type: 'text', 
                            placeholder: 'Enter full name', 
                            disabled: !isEditing,
                            value: fullname,
                            onChange: e => setFullname(e.target.value)  
                        }),
                        e('input', { 
                            type: 'email', 
                            placeholder: 'Enter email address', 
                            disabled: true,
                            value: email,
                            onChange: e => setEmail(e.target.value)  
                        }),
                        e('input', { 
                            type: 'password', 
                            placeholder: 'Enter password', 
                            value: '********',
                            disabled: true 
                        }),
                        e('div', { className: 'gender-group' },
                            e('label', null,
                                e('input', {
                                    type: 'radio',
                                    name: 'gender',
                                    value: 'Female',
                                    disabled: !isEditing,
                                    checked: gender === 'Female',
                                    onChange: e => setGender(e.target.value)
                                }),
                                ' Female'
                            ),
                            e('label', null,
                                e('input', {
                                    type: 'radio',
                                    name: 'gender',
                                    value: 'Male',
                                    disabled: !isEditing,
                                    checked: gender === 'Male',
                                    onChange: e => setGender(e.target.value)
                                }),
                                ' Male'
                            ),
                            e('label', null,
                                e('input', {
                                    type: 'radio',
                                    name: 'gender',
                                    value: 'Others',
                                    disabled: !isEditing,
                                    checked: gender === 'Others',
                                    onChange: e => setGender(e.target.value)
                                }),
                                ' Others'
                            )
                        ),
                        e('input', { 
                            type: 'date', 
                            disabled: !isEditing,
                            value: birthday,
                            onChange: e => setBirthday(e.target.value) 
                        }),
                        e('input', { 
                            type: 'text', 
                            placeholder: 'Enter Recipient Name', 
                            disabled: !isEditing,
                            value: recipient,
                            onChange: e => setRecipient(e.target.value) 
                            }),
                        e('input', { 
                            type: 'text', 
                            placeholder: 'Enter address', 
                            disabled: !isEditing,
                            value: address,
                            onChange: e => setAddress(e.target.value)  
                        }),
                        e('input', { type: 'number', className:'address-field', placeholder: 'Postcode', disabled: !isEditing, value: postcode, onChange: e => setPostcode(e.target.value) }),

                        // Country dropdown
                        e('select', { disabled: !isEditing, className:'address-field', value: country, onChange: handleCountryChange },
                            e('option', { value: '' }, 'Select Country'),
                            countries.map((c, idx) => e('option', { key: `country-${idx}`, value: c.name }, c.name))
                        ),

                        // State dropdown
                        e('select', { disabled: !isEditing || !availableStates.length, className:'address-field', value: state, onChange: handleStateChange },
                            e('option', { value: '' }, 'Select State'),
                            availableStates.map((s, idx) => e('option', { key: `state-${s.name}-${idx}`, value: s.name }, s.name))
                        ),

                        // City dropdown
                        e('select', { disabled: !isEditing || !availableCities.length, className:'address-field', value: city, onChange: e => setCity(e.target.value) },
                            e('option', { value: '' }, 'Select City'),
                            availableCities.map((c, idx) => e('option', { key: `city-${c.name}-${idx}`, value: c.name }, c.name))
                        ),

                        e('div', { className: 'phone-row' },
                            // Phone code dropdown
                            e('select', { 
                                className:'phone-code-field',
                                disabled: !isEditing, 
                                value: phoneCode, 
                                onChange: e => setPhoneCode(e.target.value)
                            },
                                e('option', { value: '' }, 'Code'),
                                availablePhoneCodes.map((c, idx) => e('option', { key: `phone-${c.code}-${idx}`, value: c.code }, `+${c.code} (${c.name})`))
                            ),
                            // Contact number input
                            e('input', { 
                                type: 'tel', 
                                className:'contact-input',
                                placeholder: 'Contact Number', 
                                disabled: !isEditing, 
                                value: contactNumber, 
                                onChange: e => setContactNumber(e.target.value),
                                style: { flex: 1 }
                            })
                        ),

                        e('div', { className: 'form-btn-group' },

                            !isEditing && e('button', {
                                id: 'edit-btn',
                                className: 'button',
                                type: 'button',
                                onClick: () => {
                                    setOriginalData({
                                        username,
                                        fullname,
                                        gender,
                                        birthday,
                                        recipient,
                                        address,
                                        postcode,
                                        city,
                                        state,
                                        country,
                                        phoneCode,
                                        contactNumber
                                    });
                                    setIsEditing(true);
                                }
                            }, 'Edit'),

                            isEditing && e('button', {
                                className: 'button cancel-btn',
                                type: 'button',
                                onClick: () => {
                                    if (!originalData) return;

                                    setUsername(originalData.username);
                                    setFullname(originalData.fullname);
                                    setGender(originalData.gender);
                                    setBirthday(originalData.birthday);
                                    setRecipient(originalData.recipient);
                                    setAddress(originalData.address);
                                    setPostcode(originalData.postcode);
                                    setCity(originalData.city);
                                    setState(originalData.state);
                                    setCountry(originalData.country);
                                    setPhoneCode(originalData.phoneCode);
                                    setContactNumber(originalData.contactNumber);

                                    setIsEditing(false);
                                }
                            }, 'Cancel'),

                            isEditing && e('button', {
                                id: 'save-btn',
                                className: 'button',
                                type: 'submit'
                            }, 'Save')
                        )
                    )
                )

                
             )
        )
    );

}
function ProfilePage() {
    const query = new URLSearchParams(window.location.search);
    const initialSection = query.get('section') || 'my-profile';
    const [section, setSection] = React.useState(initialSection);

    let content;
    if (section === 'my-profile') content = e(MyProfile)
    else if (section === 'subscription') content = e(Subscription);
    else if (section === 'rewards') content = e(RewardsVoucher);
    else if (section === 'help') content = e(HelpCentre);
    else if (section === 'privacy') content = e(PrivacyPolicy);
    else if (section === 'terms-condition') content = e(TermsCondition);

    return e('div', {className: 'section-container'},
        // MENU
        e('div', {className: 'section-menu'},
            e('button', {className: `section-btn ${section === 'my-profile' ? 'active' : ''}`, onClick: () => setSection('my-profile')}, 'My Profile'),
            e('button', {className: `section-btn ${section === 'subscription' ? 'active' : ''}`, onClick: () => setSection('subscription')}, 'Subscription'),
            e('button', {className: `section-btn ${section === 'rewards' ? 'active' : ''}`, onClick: () => setSection('rewards')}, 'Rewards & Voucher'),
            e('button', {className: `section-btn ${section === 'help' ? 'active' : ''}`, onClick: () => setSection('help')}, 'Help Centre'),
            e('button', {className: `section-btn ${section === 'privacy' ? 'active' : ''}`, onClick: () => setSection('privacy')}, 'Privacy Policy'),
            e('button', {className: `section-btn ${section === 'terms-condition' ? 'active' : ''}`, onClick: () => setSection('terms-condition')}, 'Terms & Condition'),
        ),

        // CONTENT
        content
    );
}

// ====== Rendering =======
const profileContainer = document.getElementById('section-container');
ReactDOM.createRoot(profileContainer).render(e(ProfilePage));