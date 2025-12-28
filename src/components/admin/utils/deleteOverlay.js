export function showDeleteConfirmation(onConfirm) {
    // Create overlay container
    const overlay = document.createElement('div');
    overlay.className = 'delete-overlay';

    overlay.innerHTML = `
        <div class="delete-modal">
            <p>Are you confirm <br> to delete?</p>
            <div class="delete-actions">
                <button class="btn-cancel">Cancel</button>
                <button class="btn-confirm-delete">Delete</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('.btn-cancel').onclick = () => overlay.remove();
    overlay.querySelector('.btn-confirm-delete').onclick = () => {
        onConfirm();
        overlay.remove();
    };

    // // Event listeners
    // const cancelBtn = overlay.querySelector('.btn-cancel');
    // const deleteBtn = overlay.querySelector('.btn-confirm-delete');


    // // Close on clicking outside the modal
    // overlay.onclick = (e) => {
    //     if (e.target === overlay) overlay.remove();
    // };
}