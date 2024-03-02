export interface SXModalOptions {
    closable?: boolean,
    onOpening?: (modal: HTMLElement) => Promise<void>,
    onOpen?: (modal: HTMLElement) => void,
    onClosing?: (modal: HTMLElement) => Promise<void>,
    onClose?: (modal: HTMLElement) => void,
}

export interface ModalItem {
    previousActiveElement: HTMLElement,
    el: HTMLElement,
    options: SXModalOptions,
}

export default (() => {

    let isInitialized = false;
    let hashCatchPrefix = `modal`;

    const BASE_Z_INDEX = 100;
    const TAB_KEY = 9;
    const TAB_QUERY_SELECTORS = 'a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input[type="submit"]:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled])';
    let modalsEnabled = false;
    let modals: ModalItem[] = [];
    let hookOptionsList = [];

    const getModalNameFromHash = (hash: string) => {
        const searchResult = hash.match(new RegExp(`^#(${hashCatchPrefix}-[a-zA-Z0-9-]+)$`));
        return searchResult ? searchResult[1] : null;
    }

    const openModalFromHash = (hash: string) => {
        const modalId = getModalNameFromHash(hash);

        if (!modalId) {
            return;
        }

        if (!document.getElementById(modalId)) {
            console.warn(`No modal with id ${hash} found`)
            return;
        }

        void openModal(document.getElementById(modalId));
    }

    const openModal = async (modalEl: HTMLElement, options: SXModalOptions = {}): Promise<void> => {

        // Prevent initializing already initialized modals
        for (const modal of modals) {
            if (modal.el === modalEl) {
                return;
            }
        }

        const defaultOptions: SXModalOptions = {
            closable: true,
            onOpening: null,
            onOpen: null,
            onClosing: null,
            onClose: null,
        }

        let alteredOptions = {...defaultOptions};

        for (const hook of hookOptionsList) {
            if (hook.modalId === modalEl.getAttribute('id')) {
                alteredOptions = {...alteredOptions, ...hook.options};
            }
        }

        alteredOptions = {...alteredOptions, ...options};

        modalEl.style.zIndex = (BASE_Z_INDEX + modals.length).toString();
        modalEl.classList.add('shown');

        if (alteredOptions.onOpening) {

            setTimeout(() => {
                modalEl.classList.add('loading');
            }, 20);

            await alteredOptions.onOpening(modalEl).catch(() => {
                modalEl.classList.remove('loading');
                modalEl.classList.remove('shown');
                throw new Error('Impossible to create a modal window with an opening callback: ' + alteredOptions.onOpening);
            });

            modalEl.classList.remove('loading');

        }

        setTimeout(() => {
            modalEl.classList.add('visible');
            (modalEl.querySelectorAll(TAB_QUERY_SELECTORS)[0] as HTMLElement)?.focus();
        }, 20);

        if (alteredOptions.onOpen) {
            alteredOptions.onOpen(modalEl);
        }

        modalEl.querySelectorAll('.action-close').forEach((closeEl) => {
            closeEl.addEventListener('click', destroyModalClickEvent);
        });
        modals.push({
            previousActiveElement: (document.activeElement as HTMLElement),
            el: modalEl,
            options: alteredOptions,
        });

        updateModals();
    }

    const destroyModal = (modal: ModalItem) => {
        const modalEl = modal.el;
        modalEl.classList.remove('visible');
        setTimeout(() => {
            modalEl.classList.remove('shown');
        }, 300);

        modalEl.querySelectorAll('.action-close').forEach((closeEl) => {
            closeEl.removeEventListener('click', destroyModalClickEvent);
        });

        if (modal.options.onClose) {
            modal.options.onClose(modalEl);
        }

        modals = modals.filter((modal) => {
            return modalEl !== modal.el;
        });

        modal.previousActiveElement?.focus();

        if (window.location.hash === '#' + modalEl.getAttribute('id')) {
            if (modals.length) {
                window.history.pushState({}, "", "#" + modals[modals.length - 1].el.getAttribute('id'));
            } else {
                window.history.pushState({}, "", "#");
            }
        }

        updateModals();
    }

    const onDocumentClick = (e) => {
        if (! e.target.closest('.sx-modal-wrapper')) {
            return;
        }
        if (e.target.closest('.sx-modal__container')) {
            return;
        }

        if (modals[modals.length - 1].options.closable === true) {
            destroyModal(modals[modals.length - 1]);
        }
    }

    const onKeyEvent = (e) => {
        if (e.keyCode === 27 && modals[modals.length - 1].options.closable === true) {
            destroyModal(modals[modals.length - 1]);
            return;
        }

        const focusableEls = modals[modals.length - 1].el.querySelectorAll(TAB_QUERY_SELECTORS);

        const firstFocusableEl = (focusableEls[0] as HTMLElement);
        const lastFocusableEl = (focusableEls[focusableEls.length - 1] as HTMLElement);

        const isTabPressed = (e.key === 'Tab' || e.keyCode === TAB_KEY);
        if (! isTabPressed) {
            return;
        }

        if (! modals[modals.length - 1].el.contains(document.activeElement)) {
            if (firstFocusableEl) {
                firstFocusableEl.focus();
            }
            e.preventDefault();
        }

        else if (e.shiftKey) /* shift + tab */ {
            if (document.activeElement === firstFocusableEl) {
                lastFocusableEl.focus();
                e.preventDefault();
            }
        } else /* tab */ {
            if (document.activeElement === lastFocusableEl) {
                firstFocusableEl.focus();
                e.preventDefault();
            }
        }

    }
    const destroyModalClickEvent = (e: Event) => {
        const modalEl = (e.target as HTMLElement).closest('.sx-modal-wrapper');

        const modal = modals.find((modal: ModalItem): boolean => {
            return modalEl === modal.el;
        });

        if (! modal) {
            return;
        }

        destroyModal(modal);
    }

    const updateModals = () => {
        if (modals.length > 0) {
            if (modalsEnabled) {
                return;
            }
            modalsEnabled = true;
            document.addEventListener('keydown', onKeyEvent);
            document.addEventListener('click', onDocumentClick);
            document.body.classList.add('has-active-sx-modal');
        } else {
            if (! modalsEnabled) {
                return;
            }
            modalsEnabled = false;
            document.removeEventListener('keydown', onKeyEvent);
            document.removeEventListener('click', onDocumentClick);
            document.body.classList.remove('has-active-sx-modal');
        }
    }

    // const markup = () => {
    //
    // }

    return {
        start() {
            if (isInitialized) {
                console.warn("SXModal: Already initialized")
                return this;
            }

            if (window.location.hash) {
                openModalFromHash(window.location.hash);
            }

            window.addEventListener("popstate", () => {
                openModalFromHash(window.location.hash);
            });

            isInitialized = true;
        },

        addOptionsHook(modalId: string, options: SXModalOptions) {
            hookOptionsList.push({modalId, options});
        },

        init(querySelectorOrId: HTMLElement|string, options: SXModalOptions = {}) {
            let modalEl: HTMLElement;

            if (querySelectorOrId instanceof HTMLElement) {
                modalEl = querySelectorOrId;
            } else if (typeof querySelectorOrId === 'string') {
                modalEl = document.querySelector(querySelectorOrId);
            }

            if (! modalEl) {
                return;
            }

            void openModal(modalEl, options);
        }
    }
})();