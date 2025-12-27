// Global Text Input Uppercase Handler
// Türkçe karakterleri doğru şekilde büyük harfe çevirir

function toTurkishUpperCase(text) {
    const turkishMap = {
        'i': 'İ',
        'ı': 'I',
        'ş': 'Ş',
        'ğ': 'Ğ',
        'ü': 'Ü',
        'ö': 'Ö',
        'ç': 'Ç'
    };

    return text.split('').map(char => {
        return turkishMap[char] || char.toUpperCase();
    }).join('');
}

function initUppercaseInputs() {
    // Get all text inputs, textareas, and select elements
    const inputs = document.querySelectorAll('input[type="text"], input[type="search"], textarea');

    inputs.forEach(input => {
        // Skip email and password fields
        if (input.type === 'email' || input.type === 'password') return;

        // Skip if explicitly marked to not uppercase
        if (input.dataset.noUppercase === 'true') return;

        input.addEventListener('input', function (e) {
            const start = this.selectionStart;
            const end = this.selectionEnd;

            this.value = toTurkishUpperCase(this.value);

            // Restore cursor position
            this.setSelectionRange(start, end);
        });
    });
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initUppercaseInputs);

// Re-initialize when new content is loaded (for dynamic pages)
const observer = new MutationObserver(() => {
    initUppercaseInputs();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

export { toTurkishUpperCase, initUppercaseInputs };
