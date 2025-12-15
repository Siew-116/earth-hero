function MyProfile() {
    const [isEditing, setIsEditing] = React.useState(false);
    function editProfile() {

    }

    function handleSave() {

    }
    return e('div', { className: 'section-page' },
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
                        e('input', { type: 'text', placeholder: 'Enter username', disabled: !isEditing }),
                        e('input', { type: 'text', placeholder: 'Enter full name', disabled: !isEditing }),
                        e('input', { type: 'email', placeholder: 'Enter email address', disabled: true }),
                        e('input', { type: 'password', placeholder: 'Enter password', disabled: true }),
                        e('input', { type: 'radio', disabled: !isEditing }),
                        e('input', { type: 'date', disabled: !isEditing }),
                        e('input', { type: 'text', placeholder: 'Enter Recipient Name', disabled: !isEditing }),
                        e('input', { type: 'text', placeholder: 'Enter address', disabled: !isEditing }),
                        e('input', { type: 'text', placeholder: 'Postcode', disabled: !isEditing }),
                        e('input', { type: 'text', placeholder: 'City', disabled: !isEditing }),
                        e('input', { type: 'text', placeholder: 'Country', disabled: !isEditing }),
                        e('input', { type: 'text', placeholder: 'Contact Number', disabled: !isEditing })
                    )
                ),

                e('button', {
                    id: 'edit-btn',
                    className: 'button',
                    type: 'button',
                    onClick: () => setIsEditing(!isEditing)
                }, 'Edit'),

                e('button', {
                    id: 'save-btn',
                    className: 'button',
                    type: 'submit'
                }, 'Save')
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
            e('button', {onClick: () => setSection('my-profile')}, 'My Profile'),
            e('button', {onClick: () => setSection('subscription')}, 'Subscription'),
            e('button', {onClick: () => setSection('rewards')}, 'Rewards & Voucher'),
            e('button', {onClick: () => setSection('help')}, 'Help Centre'),
            e('button', {onClick: () => setSection('privacy')}, 'Privacy Policy'),
            e('button', {onClick: () => setSection('terms-condition')}, 'Terms & Condition'),
        ),
        // CONTENT
        content
    );
}

// ====== Rendering =======
const profileContainer = document.getElementById('section-container');
ReactDOM.createRoot(profileContainer).render(e(ProfilePage));