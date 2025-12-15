function PageFooter() {
  const e = React.createElement;
  return React.createElement('footer', { className: 'site-footer' },
        e("div", {className:"footer-content"},
            e("div", {className:"footer-title"},
                e('img', { className: 'logo-img', src: '../assets/earthhero-white 1.png', alt: 'logo'}),
                e("div", {className:"footer-title"},
                    e("h2",{className:"footer-text"}, "EarthHero"),
                    e("p",{className:"footer-text"}, "Shop Smart, Live Green"),
                ),
            ),
            e("div", {className:"footer-col"},
                e("h5",{className:"footer-text"}, "Quick Links"),
                e("p",{className:"footer-text"},
                    e("br"),
                    "Home", e("br"),
                    "Shop", e("br"),
                    "Learn", e("br"),
                    "About", e("br"),
                    "Membership", e("br"),
                    "Ambassador", e("br"),
                    "Partnership", e("br"),
                    "Contact"
                )
            ),
            e("div", {className:"footer-col"},
                e("h5",{className:"footer-text"}, "Customer Service"),
                e("p",{className:"footer-text"},
                    e("br"),
                    "FAQ", e("br"),
                    "Shipping & Returns", e("br"),
                    "Privacy Policy", e("br"),
                    "Terms of Service", e("br"),
                    "Contact Us"
                )
            ),
            e("div", {className:"footer-col"},
                e("h5",{className:"footer-text"}, "Payment Method"),
                e("div",{className:"footer-row"},
                    e("i", { className: "fa-brands fa-cc-visa" }),
                    e("i", { className: "fa-brands fa-cc-mastercard" }),
                    e("i", { className: "fa-brands fa-cc-paypal" })
                )
            ),
            e("div", {className:"footer-col"},
                e("h5",{className:"footer-text"}, "Follow us on"),
                e("div",{className:"footer-row"},
                    e("i", { className: "fa-brands fa-instagram" }),
                    e("i", { className: "fa-brands fa-x-twitter" }),
                    e("i", { className: "fa-brands fa-facebook" }),
                    e("i", { className: "fa-brands fa-tiktok" }),
                    e("i", { className: "fa-brands fa-cc-visa" })
                )
            )

        ),
        
        e("div", {className:"license"},
            e("p",{className:"license-text"}, "© 2025 EarthHero. All rights reserved. Designed with CS-4567")
        )
  );
}

const footer = document.getElementById('footer-container');
ReactDOM.createRoot(footer).render(React.createElement(PageFooter));
