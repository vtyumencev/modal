import {createNanoEvents, Emitter} from "nanoevents";

export interface SXModalOptions {
    closable?: boolean,
    onOpening?: (modal: HTMLElement) => Promise<void>,
    onOpen?: (modal: HTMLElement) => void,
    onClosing?: (modal: HTMLElement) => Promise<void>,
    onClose?: (modal: HTMLElement) => void,
    transitionDuration?: number,
}

export interface BindEvent {
    el: Element,
    name: string,
    callback: () => {}
}

export interface ModalItem {
    previousActiveElement: HTMLElement,
    el: HTMLElement,
    options: SXModalOptions,
    events: BindEvent[]
}

export interface HookOptions {
    modalId: string,
    options: SXModalOptions
}

export interface IModal {
    modals: ModalItem[],
    init(querySelectorOrId: HTMLElement|string, options?: SXModalOptions): void,
    emitter: Emitter
}

export interface IModule {
    modalInit(): void,
    modalDestroy(): void,
}

export interface IModuleConstructable {
    new(modalActions: IModal): IModule,
}

export interface EventParams {
    modal: ModalItem,
    callback: () => void
}

export interface Events {
    dialogDestroying: (params: EventParams) => void,
    dialogDestroy: (modal: ModalItem) => void
}

class Modal implements IModal {

    protected isInitialized = false;

    protected BASE_Z_INDEX = 100;
    protected TAB_QUERY_SELECTORS = '' +
        'a[href]:not([disabled]),' +
        'button:not([disabled]),' +
        'textarea:not([disabled]),' +
        'input[type="submit"]:not([disabled]),' +
        'input[type="text"]:not([disabled]),' +
        'input[type="radio"]:not([disabled]),' +
        'input[type="checkbox"]:not([disabled]),' +
        'select:not([disabled])';
    protected modalsEnabled = false;
    protected hookOptionsList: HookOptions[] = [];
    protected connectedModules: IModule[] = [];
    protected keyDownEvent: () => void;

    public modals: ModalItem[] = [];
    public emitter: Emitter;

    constructor() {
        this.emitter = createNanoEvents<Events>();
        this.updateScrollbarBuffer();
    }

    on<E extends keyof Events>(event: E, callback: Events[E]) {
        return this.emitter.on(event, callback)
    }

    // https://stackoverflow.com/questions/13382516/getting-scroll-bar-width-using-javascript
    protected updateScrollbarBuffer () {

        // Creating invisible container
        const outer = document.createElement('div');
        outer.style.visibility = 'hidden';
        outer.style.overflow = 'scroll'; // forcing scrollbar to appear
        //outer.style.msOverflowStyle = 'scrollbar'; // needed for WinJS apps
        document.body.appendChild(outer);

        // Creating inner element and placing it in the container
        const inner = document.createElement('div');
        outer.appendChild(inner);

        // Calculating difference between container's full width and the child width
        const scrollbarWidth = (outer.offsetWidth - inner.offsetWidth);

        // Removing temporary elements from the DOM
        outer.parentNode.removeChild(outer);

        document.body.style.setProperty('--scroll-bar-buffer', scrollbarWidth + 'px');
    }

    protected async openModal(modalEl: HTMLElement, options: SXModalOptions = {}): Promise<void> {

        // Prevent initializing already initialized modals
        for (const modal of this.modals) {
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
            transitionDuration: 300,
        }

        let alteredOptions = {...defaultOptions};

        for (const hook of this.hookOptionsList) {
            if (hook.modalId === modalEl.getAttribute('id')) {
                alteredOptions = {...alteredOptions, ...hook.options};
            }
        }

        alteredOptions = {...alteredOptions, ...options};

        modalEl.style.zIndex = (this.BASE_Z_INDEX + this.modals.length).toString();
        modalEl.setAttribute("tabindex", "-1");
        modalEl.classList.add('showing');
        modalEl.classList.add('shown');

        if (modalEl.querySelector('.sx-modal-dialog').clientHeight > window.innerHeight) {
            modalEl.classList.add('scrollable');
        } else {
            modalEl.classList.remove('scrollable');
        }

        if (alteredOptions.onOpening) {

            let isFullFilled = false;

            setTimeout(() => {
                if (! isFullFilled) {
                    modalEl.classList.add('loading');
                }
            }, 20);

            await alteredOptions.onOpening(modalEl).catch(() => {
                modalEl.classList.remove('loading');
                modalEl.classList.remove('shown');
                modalEl.classList.remove('showing');
                throw new Error('Impossible to create a modal window with an opening callback: ' + alteredOptions.onOpening);
            })

            isFullFilled = true;

            modalEl.classList.remove('loading');
        }

        void modalEl.offsetWidth;

        modalEl.classList.add('visible');

        setTimeout(() => {
            modalEl.classList.add('released');
            modalEl.classList.remove('showing');
            (modalEl.querySelectorAll(this.TAB_QUERY_SELECTORS)[0] as HTMLElement)?.focus();
        }, alteredOptions.transitionDuration + 100);

        const events: BindEvent[] = [];

        modalEl.querySelectorAll('.action-close').forEach((closeEl) => {
            events.push({
                el: closeEl,
                name: 'click',
                callback: this.destroyModalClickEvent.bind(this)
            });
        });

        events.push({
            el: modalEl,
            name: 'click',
            callback: this.onDocumentClick.bind(this)
        });

        events.push({
            el: modalEl,
            name: 'keydown',
            callback: this.onKeyEvent.bind(this)
        });

        for (const event of events) {
            event.el.addEventListener(event.name, event.callback);
        }

        this.modals.push({
            previousActiveElement: (document.activeElement as HTMLElement),
            el: modalEl,
            options: alteredOptions,
            events: events
        });

        this.updateModals();
    }

    protected destroyModal(modal: ModalItem) {

        const wrapper: EventParams = {
            modal: modal,
            callback: () => {
                const modalEl = modal.el;
                modalEl.classList.add('hiding');
                modalEl.classList.remove('visible');
                modalEl.classList.remove('released');
                setTimeout(() => {
                    modalEl.classList.remove('shown');
                    modalEl.classList.remove('hiding');
                    modal.previousActiveElement?.focus();
                    this.updateModals();
                }, modal.options.transitionDuration);

                for (const event of modal.events) {
                    event.el.removeEventListener(event.name, event.callback);
                }

                if (modal.options.onClose) {
                    modal.options.onClose(modalEl);
                }

                this.modals = this.modals.filter((modal) => {
                    return modalEl !== modal.el;
                });
            }
        }

        this.emitter.emit('dialogDestroying', wrapper);

        wrapper.callback();
    }

    protected onDocumentClick(e: Event) {
        if (! (e.target as HTMLElement).closest('.sx-modal')) {
            return;
        }
        if ((e.target as HTMLElement).closest('.sx-modal-dialog__container')) {
            return;
        }

        if (this.modals[this.modals.length - 1].options.closable === true) {
            this.destroyModal(this.modals[this.modals.length - 1]);
        }
    }

    protected onKeyEvent(e: KeyboardEvent) {
        if (e.key === 'Escape' && this.modals[this.modals.length - 1].options.closable === true) {
            this.destroyModal(this.modals[this.modals.length - 1]);
            return;
        }

        const focusableEls = this.modals[this.modals.length - 1].el.querySelectorAll(this.TAB_QUERY_SELECTORS);

        const firstFocusableEl = (focusableEls[0] as HTMLElement);
        const lastFocusableEl = (focusableEls[focusableEls.length - 1] as HTMLElement);

        const isTabPressed = (e.key === 'Tab');
        if (! isTabPressed) {
            return;
        }

        if (! this.modals[this.modals.length - 1].el.contains(document.activeElement)) {
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

    protected destroyModalClickEvent(e: Event) {
        const modalEl = (e.target as HTMLElement).closest('.sx-modal');

        const modal = this.modals.find((modal: ModalItem): boolean => {
            return modalEl === modal.el;
        });

        if (! modal) {
            return;
        }

        this.destroyModal(modal);
    }

    protected updateModals() {
        if (this.modals.length > 0) {
            if (this.modalsEnabled) {
                return;
            }
            this.modalsEnabled = true;
            document.body.classList.add('has-active-sx-modal');
        } else {
            if (! this.modalsEnabled) {
                return;
            }
            this.modalsEnabled = false;
            document.body.classList.remove('has-active-sx-modal');
        }
    }

    start(modules?: IModuleConstructable[]) {
        if (this.isInitialized) {
            console.warn("SXModal: Already initialized")
            return this;
        }

        this.keyDownEvent = this.onKeyEvent.bind(this);

        for(const module of modules ?? []) {
            const moduleInstance = new module(this);
            moduleInstance.modalInit();
            this.connectedModules.push(moduleInstance);
        }

        this.isInitialized = true;
    }

    addOptionsHook(modalId: string, options: SXModalOptions) {
        this.hookOptionsList.push({modalId, options});
    }

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

        void this.openModal(modalEl, options);
    }

    destroy(querySelectorOrId: HTMLElement|string) {
        let modalEl: HTMLElement;

        if (querySelectorOrId instanceof HTMLElement) {
            modalEl = querySelectorOrId;
        } else if (typeof querySelectorOrId === 'string') {
            modalEl = document.querySelector(querySelectorOrId);
        }

        if (! modalEl) {
            return;
        }

        for (const modal of this.modals) {
            if (modal.el === modalEl) {
                void this.destroyModal(modal);
            }
        }

    }
}
export default new Modal();