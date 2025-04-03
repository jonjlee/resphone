document.addEventListener('DOMContentLoaded', () => {
    // R2 Configuration
    const r2Url = 'https://pub-64c5ab9ca3b24895a1f7903d51639e2d.r2.dev/resphone.json';
    const WORKER_URL = 'https://resphone.jonjlee.workers.dev';

    // Check if user is authenticated
    if (!sessionStorage.getItem('authenticated')) {
        window.location.href = 'index.html';
        return;
    }

    const applyButton = document.getElementById('applyButton');
    const editContactsButton = document.getElementById('editContactsButton');
    const customOption = document.getElementById('customOption');
    const customNumberField = document.getElementById('customNumberField');
    const customNumberInput = document.getElementById('customNumberInput');
    const customNumberError = document.getElementById('customNumberError');
    const numberOptions = document.querySelector('.number-options');
    const toggleUpdates = document.getElementById('toggleUpdates');
    const updatesContent = document.getElementById('updatesContent');
    const updatesList = document.getElementById('updatesList');

    let selectedOption = null;
    let currentConfig = null;
    let editModeConfig = null;
    let isEditMode = false;

    // Handle edit mode toggle
    editContactsButton.addEventListener('click', () => {
        // Deselect Other Number if it's selected before entering edit mode
        if (!isEditMode && customOption.classList.contains('selected')) {
            customOption.classList.remove('selected');
            customNumberField.style.display = 'none';
            customNumberInput.value = '';
            customNumberError.style.display = 'none';
            selectedOption = null;
        }

        isEditMode = !isEditMode;
        const iconSpan = editContactsButton.querySelector('.icon');
        const iconElement = iconSpan?.querySelector('i');
        if (isEditMode) {
            // Create a deep copy of the current config for edit mode
            editModeConfig = JSON.parse(JSON.stringify(currentConfig));
            iconSpan.style.display = 'inline-block';
            if (iconElement) {
                iconElement.className = 'fas fa-times';
            }
            editContactsButton.querySelector('span:not(.icon)').textContent = 'Discard Changes';
        } else {
            // Discard changes by clearing the edit mode config
            editModeConfig = null;
            iconSpan.style.display = 'inline-block';
            if (iconElement) {
                iconElement.className = 'fas fa-edit';
            }
            editContactsButton.querySelector('span:not(.icon)').textContent = 'Edit Contacts';
        }
        applyButton.textContent = isEditMode ? 'Save Changes' : 'Apply Forwarding';
        displayContacts(isEditMode ? editModeConfig : currentConfig);
    });

    // Handle updates expander toggle
    toggleUpdates.addEventListener('click', () => {
        const isHidden = updatesContent.style.display === 'none';
        updatesContent.style.display = isHidden ? 'block' : 'none';
        toggleUpdates.querySelector('.icon i').className = isHidden ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
    });

    // Function to display updates from config
    function displayUpdates(updates) {
        // Clear existing updates
        updatesList.innerHTML = '';

        // Add each update in reverse chronological order
        updates.slice().reverse().forEach(update => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${update.ts}:</strong> ${update.update}`;
            updatesList.appendChild(li);
        });
    }

    // Handle logout
    document.querySelector('.logout-button').addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('authenticated');
        sessionStorage.removeItem('password');
        window.location.href = 'index.html';
    });

    // Function to display contacts
    function displayContacts(config) {
        if (!config) return;

        // Clear existing options except custom and loading
        const existingOptions = numberOptions.querySelectorAll('.number-option:not(#customOption)');
        existingOptions.forEach(opt => opt.remove());

        // Remove loading message if it exists
        const loadingMessage = numberOptions.querySelector('.has-text-centered');
        if (loadingMessage) {
            loadingMessage.remove();
        }

        // Hide custom option in edit mode
        customOption.style.display = isEditMode ? 'none' : 'block';
        customNumberField.style.display = 'none';
        customNumberInput.value = '';
        customNumberError.style.display = 'none';

        if (isEditMode) {
            // Display contacts in edit mode
            config.contacts.forEach((contact, index) => {
                const option = document.createElement('div');
                option.className = 'number-option edit-mode';
                option.innerHTML = `
                    <div class="field is-horizontal">
                        <div class="field-body">
                            <div class="field">
                                <div class="control">
                                    <input class="input contact-name" type="text" value="${contact.name}" placeholder="Name">
                                </div>
                            </div>
                            <div class="field">
                                <div class="control">
                                    <input class="input contact-phone" type="tel" value="${contact.phone}" placeholder="Phone">
                                </div>
                            </div>
                            <div class="field">
                                <div class="control buttons">
                                    <button class="button is-small move-up" title="Move Up">
                                        <span class="icon">
                                            <i class="fas fa-arrow-up"></i>
                                        </span>
                                    </button>
                                    <button class="button is-small move-down" title="Move Down">
                                        <span class="icon">
                                            <i class="fas fa-arrow-down"></i>
                                        </span>
                                    </button>
                                    <button class="button is-small delete-contact">
                                        <span class="icon">
                                            <i class="far fa-trash-alt"></i>
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                numberOptions.insertBefore(option, customOption);

                // Add input blur handlers to update config
                const nameInput = option.querySelector('.contact-name');
                const phoneInput = option.querySelector('.contact-phone');

                nameInput.addEventListener('blur', () => {
                    config.contacts[index].name = nameInput.value;
                });

                phoneInput.addEventListener('blur', () => {
                    config.contacts[index].phone = phoneInput.value;
                });

                // Add delete button handler
                option.querySelector('.delete-contact').addEventListener('click', () => {
                    config.contacts.splice(index, 1);
                    displayContacts(config);
                });

                // Add move up handler
                option.querySelector('.move-up').addEventListener('click', () => {
                    if (index > 0) {
                        const temp = config.contacts[index];
                        config.contacts[index] = config.contacts[index - 1];
                        config.contacts[index - 1] = temp;
                        // Update selected contact if this one was selected
                        if (config.selected === temp.phone) {
                            config.selected = temp.phone;
                        }
                        displayContacts(config);
                        // Highlight the moved contact
                        const movedOption = numberOptions.querySelector(`.edit-mode:nth-child(${index})`);
                        if (movedOption) {
                            movedOption.classList.add('selected');
                        }
                    }
                });

                // Add move down handler
                option.querySelector('.move-down').addEventListener('click', () => {
                    if (index < config.contacts.length - 1) {
                        const temp = config.contacts[index];
                        config.contacts[index] = config.contacts[index + 1];
                        config.contacts[index + 1] = temp;
                        // Update selected contact if this one was selected
                        if (config.selected === temp.phone) {
                            config.selected = temp.phone;
                        }
                        displayContacts(config);
                        // Highlight the moved contact
                        const movedOption = numberOptions.querySelector(`.edit-mode:nth-child(${index + 2})`);
                        if (movedOption) {
                            movedOption.classList.add('selected');
                        }
                    }
                });
            });

            // Add "Add Contact" button
            const addButton = document.createElement('div');
            addButton.className = 'number-option';
            addButton.innerHTML = `
                <div class="has-text-right">
                    <button class="button is-primary is-rounded is-small">
                        <span class="icon">
                            <i class="fas fa-plus"></i>
                        </span>
                        <span>Add Contact</span>
                    </button>
                </div>
            `;
            numberOptions.insertBefore(addButton, customOption);

            // Add new contact handler
            addButton.querySelector('button').addEventListener('click', () => {
                // Add new contact
                config.contacts.push({ name: '', phone: '' });
                displayContacts(config);
            });
        } else {
            // Display contacts in normal mode
            config.contacts.forEach(contact => {
                const option = document.createElement('div');
                option.className = 'number-option';
                option.dataset.value = contact.phone;
                option.dataset.name = contact.name;
                option.textContent = `${contact.name} - (${contact.phone.slice(0, 3)}) ${contact.phone.slice(3, 6)}-${contact.phone.slice(6)}`;
                numberOptions.insertBefore(option, customOption);
            });

            // Select the current forwarding number
            const selectedPhone = config.selected;
            const matchingOption = numberOptions.querySelector(`[data-value="${selectedPhone}"]`);

            if (matchingOption) {
                matchingOption.classList.add('selected');
                selectedOption = matchingOption;
            } else {
                customOption.classList.add('selected');
                selectedOption = customOption;
                customNumberField.style.display = 'block';
                customNumberInput.value = selectedPhone;
            }
        }

        // Reattach event listeners
        attachOptionListeners();
    }

    function attachOptionListeners() {
        const options = numberOptions.querySelectorAll('.number-option');
        options.forEach(option => {
            option.addEventListener('click', function () {
                // Remove selected class from all options
                options.forEach(opt => opt.classList.remove('selected'));

                // Add selected class to clicked option
                this.classList.add('selected');
                selectedOption = this;

                // Handle custom number field visibility
                if (this.dataset.value === 'custom') {
                    customNumberField.style.display = 'block';
                } else {
                    customNumberField.style.display = 'none';
                    customNumberInput.value = '';
                    customNumberError.style.display = 'none';
                }
            });
        });
    }

    // Validate custom phone number
    customNumberInput.addEventListener('input', function () {
        const phoneNumber = this.value.trim();
        if (phoneNumber && !/^\d+$/.test(phoneNumber)) {
            customNumberError.style.display = 'block';
        } else {
            customNumberError.style.display = 'none';
        }
    });

    // Handle apply button click
    applyButton.addEventListener('click', async function () {
        if (isEditMode) {
            // Handle contact editing
            const contacts = [];
            const editOptions = numberOptions.querySelectorAll('.edit-mode');
            let hasInvalidPhone = false;

            editOptions.forEach(option => {
                const name = option.querySelector('.contact-name').value.trim();
                const phone = option.querySelector('.contact-phone').value.trim();

                // Check if phone is valid (10 digits or 1+10 digits)
                const isValidPhone = /^(1?\d{10})$/.test(phone);

                if (name && phone) {
                    if (isValidPhone) {
                        contacts.push({ name, phone });
                    } else {
                        hasInvalidPhone = true;
                    }
                }
            });

            if (hasInvalidPhone) {
                showNotification('Phone numbers must be 10 digits', 'danger');
                return;
            }

            if (contacts.length === 0) {
                showNotification('Please add at least one valid contact', 'danger');
                return;
            }

            try {
                applyButton.disabled = true;
                applyButton.textContent = 'Saving...';
                showNotification('Saving contacts...', 'info');

                const password = sessionStorage.getItem('password');
                const utc = Math.floor(Date.now() / 1000);
                const hash = await crypto.subtle.digest('SHA-256',
                    new TextEncoder().encode(`${utc}|${password}`))
                    .then(hash => Array.from(new Uint8Array(hash))
                        .map(b => b.toString(16).padStart(2, '0'))
                        .join(''));

                const response = await fetch(`${WORKER_URL}/update`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        hash,
                        utc,
                        contacts: editModeConfig.contacts,
                        selected: currentConfig.selected
                    }),
                });

                if (!response.ok) {
                    throw new Error('Failed to update contacts');
                }

                currentConfig = await response.json();
                editModeConfig = null;  // Clear edit mode config after successful save
                displayUpdates(currentConfig.updates);
                showNotification('Contacts updated successfully', 'success');
                isEditMode = false;
                editContactsButton.querySelector('span:not(.icon)').textContent = 'Edit Contacts';
                applyButton.textContent = 'Apply Forwarding';
                displayContacts(currentConfig);
            } catch (error) {
                console.error('Error updating contacts:', error);
                showNotification('Failed to update contacts', 'danger');
            } finally {
                applyButton.disabled = false;
            }
        } else {
            // Handle forwarding number update (existing code)
            if (!selectedOption) {
                alert('Please select a forwarding number');
                return;
            }

            let phoneNumber;
            if (selectedOption.dataset.value === 'custom') {
                phoneNumber = customNumberInput.value.trim();
                if (!phoneNumber || !/^\d+$/.test(phoneNumber)) {
                    customNumberError.style.display = 'block';
                    return;
                }

                const matchingContact = currentConfig.contacts.find(contact => contact.phone === phoneNumber);
                if (matchingContact) {
                    const matchingOption = numberOptions.querySelector(`[data-value="${phoneNumber}"]`);
                    if (matchingOption) {
                        numberOptions.querySelectorAll('.number-option').forEach(opt => opt.classList.remove('selected'));
                        matchingOption.classList.add('selected');
                        selectedOption = matchingOption;
                        customNumberField.style.display = 'none';
                        customNumberInput.value = '';
                        phoneNumber = matchingContact.phone;
                    }
                }
            } else {
                phoneNumber = selectedOption.dataset.value;
            }

            try {
                applyButton.disabled = true;
                applyButton.textContent = 'Applying...';
                showNotification('Applying forwarding number...', 'info');

                const password = sessionStorage.getItem('password');
                const utc = Math.floor(Date.now() / 1000);
                const hash = await crypto.subtle.digest('SHA-256',
                    new TextEncoder().encode(`${utc}|${password}`))
                    .then(hash => Array.from(new Uint8Array(hash))
                        .map(b => b.toString(16).padStart(2, '0'))
                        .join(''));

                const response = await fetch(`${WORKER_URL}/update`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        hash,
                        utc,
                        contacts: currentConfig.contacts,
                        selected: phoneNumber
                    }),
                });

                if (!response.ok) {
                    throw new Error('Failed to update configuration');
                }

                currentConfig = await response.json();
                displayUpdates(currentConfig.updates);
                showNotification('Forwarding number updated successfully', 'success');

                const matchingOption = numberOptions.querySelector(`[data-value="${currentConfig.selected}"]`);
                if (matchingOption) {
                    numberOptions.querySelectorAll('.number-option').forEach(opt => opt.classList.remove('selected'));
                    matchingOption.classList.add('selected');
                    selectedOption = matchingOption;
                    customNumberField.style.display = 'none';
                    customNumberInput.value = '';
                }
            } catch (error) {
                console.error('Error updating forwarding number:', error);
                showNotification('Failed to update forwarding number', 'danger');
            } finally {
                applyButton.disabled = false;
                applyButton.textContent = 'Apply Forwarding';
            }
        }
    });

    function showNotification(message, type = 'info') {
        // Remove any existing notifications
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification is-${type}`;
        notification.textContent = message;

        // Insert notification after the box
        const box = document.querySelector('.box');
        box.parentNode.insertBefore(notification, box.nextSibling);
    }

    // Fetch and display numbers
    async function fetchAndDisplayNumbers() {
        try {
            const response = await fetch(r2Url, {
                cache: 'no-store' // Prevent caching of the response
            });
            if (!response.ok) {
                throw new Error('Failed to fetch configuration');
            }
            currentConfig = await response.json();

            // Display contacts
            displayContacts(currentConfig);

            // Display updates from config
            if (currentConfig.updates) {
                displayUpdates(currentConfig.updates);
            }
        } catch (error) {
            console.error('Error fetching configuration:', error);
            showNotification('Failed to load forwarding numbers', 'danger');
        }
    }

    // Initial load
    fetchAndDisplayNumbers();
}); 