

function ErrorOverlay({ message, onClose }) {
    const e = React.createElement;
    return e('div', { className: 'error-overlay' },
        e('div', { className: 'error-content' },
            e('i', { className: 'fa fa-triangle-exclamation' }),
            e('p', null, message),
            e('button', { className:'button', onClick: onClose }, "OK")
        )
    );
}
