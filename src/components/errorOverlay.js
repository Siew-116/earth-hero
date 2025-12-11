

function ErrorOverlay({ message, onClose }) {
    return e('div', { className: 'error-overlay' },
        e('div', { className: 'error-content' },
            e('i', { className: 'fa fa-triangle-exclamation' }),
            e('p', null, message),
            e('button', { className:'button', onClick: onClose }, "OK")
        )
    );
}
