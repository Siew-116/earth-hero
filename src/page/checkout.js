function CheckoutPage() {
    console.log(window.csrfToken)

    // Handle Submit (Checkout)
    
    return e('div', { className: 'checkout-container' },
        e('h1', {className:'title-text'}, "Checkout"),
        e('div', {className:'checkout-content'},
            // CHECKOUT FORM
            e('form', {className:'checkout-form', onSubmit: handleSubmit},
                e('label', {className:'title-text'},"Shipping Details")
            ),
            // PAYMENT SUMMARY
            e('div', {className:'payment-summary'},

            )
        )
    );
}

// ====== Rendering =======
const checkoutContainer = document.getElementById('checkout-container');
ReactDOM.createRoot(checkoutContainer).render(e(CheckoutPage));