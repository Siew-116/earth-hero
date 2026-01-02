function MyProfile() {
    const csrf = localStorage.getItem('csrf_token');
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
                //window.csrfToken = data.csrf_token;
                localStorage.setItem('csrf_token', data.csrf_token);

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
                    'X-CSRF-Token': csrf
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

function Subscription() {
    return e('div', {className:'section-page'},
        e('p', { className: 'section-title' }, "My Subscription"),
        e('div', {className:'about-row'},
            e('div', {className:'member-card-container'},
                e('h3', null, 'EarthHero VIP'),
                e('div', {className:'member-info'},
                    e('p',{className:'sub-text'}, "Member ID"),
                    e('p',{className:'word-text'}, "MB23232344")
                ),
                e('div', {className:'member-info'},
                    e('p',{className:'sub-text'}, "Subscription Plan"),
                    e('p',{className:'word-text'}, "Yearly Pro Member")
                ),
                e('div', {className:'member-info'},
                    e('p',{className:'sub-text'}, "Price"),
                    e('p',{className:'word-text'}, "RM329.99")
                ),
                e('div', {className:'member-info'},
                    e('p',{className:'sub-text'}, "Last Payment"),
                    e('p',{className:'word-text'}, "12-11-2025")
                ),
                e('div', {className:'member-info'},
                    e('p',{className:'sub-text'}, "Next Payment"),
                    e('p',{className:'word-text'}, "12-11-2026")
                ),
                e('div', {className:'member-info'},
                    e('p',{className:'sub-text'}, "Status"),
                    e('p',null , "Active")
                )
            ),
            e('div', {className:'about-col'},
                e('h4', {className: 'payment-method-title'}, "Payment Method"),
                e('div', {className: 'pm-row'},
                    e('p', {className: 'word-text'}, "MasterCard"),
                    e('p', {className: 'change-btn'}, "Change")
                )
            )
        ),
        e('p', null, "Change Subscription Plan"),
        e('p', {className: 'error'}, "Cancel Subscription"),
        e('p', {className: 'section-title ps-title'}, "Product Subscription"),
        
        e('p', {className: 'subs-id'}, "Subscription ID: PS2323232"),
        e('div', {className:'product-card subs-card'},
           e('div', { className: 'img-container subs-img' },
            e('img', { className: 'product-img', src: "../assets/Blanket (oat).png", alt: "product" }),
                ),
            e('div', { className: 'product-details' },
                e('div', {className:'subs-title'},
                    e('p', { className: 'word-text' }, "Eco Organic Logo Jeans "),
                    e('p', {className: 'word-text'}, "x100")
                ),
                e('p', { className: 'title-text' }, "Cloth & Accessories"),
                e('h3', { id: 'product-price' }, null, "RM54.00"),
                e('p', {className: 'sub-text'}, "Variation: XL"),
                e('div', {className: 'subs-row'},
                    e('p', {className:'period'}, "Period: 23/12/2025 - 25/12/2026"),
                    e('p', {className:'sub-text'}, "Every 2 weeks"),
                    e('h3', {id:'product-price'}, "Total: RM54.00")
                )
                
            )
        ),

        e('p', {className: 'subs-id'}, "Subscription ID: PS2323232"),
        e('div', {className:'product-card subs-card'},
           e('div', { className: 'img-container subs-img' },
            e('img', { className: 'product-img', src: "../assets/Blanket (oat).PNG", alt: "product" }),
                ),
            e('div', { className: 'product-details' },
                e('div', {className:'subs-title'},
                    e('p', { className: 'word-text' }, "Eco Organic Logo Jeans "),
                    e('p', {className: 'word-text'}, "x100")
                ),
                e('p', { className: 'title-text' }, "Cloth & Accessories"),
                e('h3', { id: 'product-price' }, null, "RM54.00"),
                e('p', {className: 'sub-text'}, "Variation: XL"),
                e('div', {className: 'subs-row'},
                    e('p', {className:'period'}, "Period: 23/12/2025 - 25/12/2026"),
                    e('p', {className:'sub-text'}, "Every 2 weeks"),
                    e('h3', {id:'product-price'}, "Total: RM54.00")
                )
                
            )
        )

    )
}


function RewardsVoucher() {
    return e('div', {className: 'section-page'},
        e('p', {className: 'section-title ps-title'}, "My EcoPoints"),
        e('div', {className:'rw-top'},
            e('div', {className:'rw-card'},
                e('img',{ className: 'rw-logo', src: "../assets/earthhero-green.jpg", alt: "logo" }),
                e('h1', null, "1200pts")
            ),
            e('div', {className:'pts-overlay'},
                e('i', {className:'fa fa-lock'}),
                e('p', {className: 'word-text'}, "Unlock EcoPoints collection now"),
                e('p', {className: 'word-text'}, "to enjoy exclusive discount!"),
                e('button', {className: 'button join-btn'}, "Join Member")
            ),
        ),

        e('div', {className:'about-row rewards-tips'},
            // LEFT
            e('div', {className: 'about-col tips-section'},
                e('h3',null, "How to earn EcoPoints?"),
                e('div', {className:'tips-row'},
                    e('p',{className:'word-text'}, "Join as Green Member"),
                    e('div', {className: 'pts'},
                        e('img',{ className: 'rw-coin', src: "../assets/earthhero-green.jpg", alt: "logo" }),
                        e('p', {className: 'title-text pts-num'}, "500")
                    ),
                    e('button', {className:'go-btn'}, "Go")
                ),
                e('div', {className:'tips-row'},
                    e('p',{className:'word-text'}, "Upgrade to Pro Member"),
                    e('div', {className: 'pts'},
                        e('img',{ className: 'rw-coin', src: "../assets/earthhero-green.jpg", alt: "logo" }),
                        e('p', {className: 'title-text pts-num'}, "1000")
                    ),
                    e('button', {className:'go-btn'}, "Go")
                ),
                e('div', {className:'tips-row'},
                    e('p',{className:'word-text'}, "Make a purchase"),
                    e('div', {className: 'pts'},
                        e('img',{ className: 'rw-coin', src: "../assets/earthhero-green.jpg", alt: "logo" }),
                        e('p', {className: 'title-text pts-num'}, "100")
                    ),
                    e('button', {className:'go-btn'}, "Go")
                ),
                e('div', {className:'tips-row'},
                    e('p',{className:'word-text'}, "Leave a product review"),
                    e('div', {className: 'pts'},
                        e('img',{ className: 'rw-coin', src: "../assets/earthhero-green.jpg", alt: "logo" }),
                        e('p', {className: 'title-text pts-num'}, "50")
                    ),
                    e('button', {className:'go-btn'}, "Go")
                ),
                e('div', {className:'tips-row'},
                    e('p',{className:'word-text'}, "Share our store on social media"),
                    e('div', {className: 'pts'},
                        e('img',{ className: 'rw-coin', src: "../assets/earthhero-green.jpg", alt: "logo" }),
                        e('p', {className: 'title-text pts-num'}, "10")
                    ),
                    e('button', {className:'go-btn'}, "Go")
                )
            ),
            // RIGHT
            e('div', {className: 'about-col tips-section'},
                e('h3',null, "Redeem EcoPoints"),
                e('div', {className:'tips-row'},
                    e('p',{className:'word-text'}, "RM8 Off Voucher"),
                    e('div', {className: 'pts'},
                        e('img',{ className: 'rw-coin', src: "../assets/earthhero-green.jpg", alt: "logo" }),
                        e('p', {className: 'title-text pts-num'}, "500")
                    ),
                    e('button', {className:'go-btn'}, "Claim")
                ),
                e('div', {className:'tips-row'},
                    e('p',{className:'word-text'}, "RM15 Off Voucher"),
                    e('div', {className: 'pts'},
                        e('img',{ className: 'rw-coin', src: "../assets/earthhero-green.jpg", alt: "logo" }),
                        e('p', {className: 'title-text pts-num'}, "800")
                    ),
                    e('button', {className:'go-btn'}, "Claim")
                ),
                e('div', {className:'tips-row'},
                    e('p',{className:'word-text'}, "RM20 Off Voucher"),
                    e('div', {className: 'pts'},
                        e('img',{ className: 'rw-coin', src: "../assets/earthhero-green.jpg", alt: "logo" }),
                        e('p', {className: 'title-text pts-num'}, "1000")
                    ),
                    e('button', {className:'go-btn'}, "Claim")
                ),
                e('div', {className:'tips-row'},
                    e('p',{className:'word-text'}, "Plant a Tree"),
                    e('div', {className: 'pts'},
                        e('img',{ className: 'rw-coin', src: "../assets/earthhero-green.jpg", alt: "logo" }),
                        e('p', {className: 'title-text pts-num'}, "100")
                    ),
                    e('button', {className:'go-btn'}, "Plant")
                ),
                e('div', {className:'progress-bar'},
                    e('div', {className:'grey-bar'},
                        e('div', {className:'green-bar'})
                    ),
                    e('p', null, "10/200")
                ),
                e('p', {className:'sub-text'}, "You've help plant 10 tress in our reforestation project."),
                e('p', {className:'sub-text'}, "Plant more to get RM50 off voucher."),
                e('div', {className:'tips-row'},
                    e('p',{className:'word-text'}, "Cleanup Ocean"),
                    e('div', {className: 'pts'},
                        e('img',{ className: 'rw-coin', src: "../assets/earthhero-green.jpg", alt: "logo" }),
                        e('p', {className: 'title-text pts-num'}, "100")
                    ),
                    e('button', {className:'go-btn'}, "Clean"),
                ),
                e('div', {className:'progress-bar'},
                    e('div', {className:'grey-bar'},
                        e('div', {className:'green-bar'})
                    ),
                    e('p', null, "10/200")
                ),
                e('p', {className:'sub-text'}, "You've help remove 10kg of wastes in our ocean cleanup project."),
                e('p', {className:'sub-text'}, "Clean more to get RM50 off voucher.")
            ),
        ),

        e('p', {className: 'section-title ps-title'}, "My Vouchers"),
        e('div', {className: 'voucher-row' }, 
            // Voucher card
            e('div', {className: 'voucher-card'},
                    // Name
                    e('div', { className: 'voucher-name' },
                        e('h4', null, "RM5 Off Voucher")
                    ),
                    // Details
                    e('div', { className: 'voucher-details' },
                            e('p', null, "Min spend of RM10"),
                            e('p', null, "Available for All Vendors"),
                            e('div', { className: 'voucher-expired' },
                                e('i', { className: "fa-regular fa-clock" }),
                                e('p', null, "Expires in 10 day")
                            )
                    ),
                    // Use button
                    e('div', { className: 'voucher-button' },
                        e('button', { className: 'button use-btn' }, "Use")
                    )
            ),
            // Qty
            e('div', { className: 'sub-text voucher-qty' },
                e('p', null, "x 10")
            )
        ),
        e('div', {className: 'voucher-row' }, 
            // Voucher card
            e('div', {className: 'voucher-card'},
                    // Name
                    e('div', { className: 'voucher-name' },
                        e('h4', null, "RM10 Off Voucher")
                    ),
                    // Details
                    e('div', { className: 'voucher-details' },
                            e('p', null, "Min spend of RM10"),
                            e('p', null, "Available for All Vendors"),
                            e('div', { className: 'voucher-expired' },
                                e('i', { className: "fa-regular fa-clock" }),
                                e('p', null, "Expires in 10 day")
                            )
                    ),
                    // Use button
                    e('div', { className: 'voucher-button' },
                        e('button', { className: 'button use-btn' }, "Use")
                    )
            ),
            // Qty
            e('div', { className: 'sub-text voucher-qty' },
                e('p', null, "x 10")
            )
        )
    )
}

function HelpCentre() {
    return e('div', {className:'section-page'},
        e('h2', null, "Category"),
        e('div', {className:'about-row category-row'},
            e('button', {className:'help-category'}, "General"),
            e('button', {className:'help-category'}, "Orders & Shipping"),
            e('button', {className:'help-category'}, "Refunds & Cancellation"),
            e('button', {className:'help-catefory'}, "Payments"),
            e('button', {className:'help-category'}, "EcoPoints & Vouchers")
        ),

        e('h2', null, "Frequently-Asked Question"),
        e('p', {className:'word-text'}, "Can I track my order?"),
        e('p', {className:'word-text'}, "What should I do if my order hasn't arrived?"),
        e('p', {className:'word-text'}, "Is the international shipping available?"),
        e('p', {className:'word-text'}, "Do you offer cash-on-delivery?"),
        e('p', {className:'word-text'}, "What's the difference between Green Member and Pro Member?"),
        e('p', {className:'word-text'}, "Are your packaging materials eco-friendly?"),

        e('h2', {className:'quest-title'}, "Do you have any other question?"),
        e('div', {className:'about-row quest-section'},
            e('div', {className:'contact-box'},
                e('i', {className:'fa fa-phone'}),
                e('div', {className:'about-col'},
                    e('h4', null, "Give Us A Call!"),
                    e('p', null, "EarthHero: +0323232(8am - 5pm)")
                )
            ),

            e('div', {className:'contact-box'},
                e('i', {className:'fa fa-envelope'}),
                e('div', {className:'about-col'},
                    e('h4', null, "Send Us An Email"),
                    e('p', null, "earthHero@gmail.com")
                )
            )
        )
    )
}


function PrivacyPolicy() {
    return e('div', {className: 'section-page'},
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
    return e('div', {className: 'section-page'},
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