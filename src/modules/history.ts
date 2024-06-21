import {IModule, IModal, ModalItem, EventParams} from "../index";
import {Unsubscribe} from "nanoevents";

export default class History implements IModule {

    private hashCatchPrefix = `modal`;
    private modalContext: IModal;

    private popStateChange = this.popState.bind(this);

    private dialogDestroyingUnsubscribe: Unsubscribe;

    constructor(modalContext: IModal) {
        this.modalContext = modalContext;
    }

    popState() {
        this.openModalFromHash(window.location.hash);
    }

    modalInit() {
        if (window.location.hash) {
            this.openModalFromHash(window.location.hash);
        }

        window.addEventListener("popstate", this.popStateChange);

        // Example of overriding the callback
        // this.modalContext.emitter.on('dialogDestroying', (params: EventParams) => {
        //     const mainStream = params.callback;
        //     params.callback = (modal: ModalItem) => {
        //         this.dialogDestroy(modal);
        //         mainStream(modal);
        //     }
        // });

        this.modalContext.emitter.on('dialogDestroying', (params: EventParams) => {
            this.dialogDestroy(params.modal);
        });
    }

    modalDestroy() {
        this.dialogDestroyingUnsubscribe();
        window.removeEventListener("popstate", this.popStateChange);
    }

    dialogDestroy(modal: ModalItem): void {
        if (window.location.hash === '#' + modal.el.getAttribute('id')) {
            if (this.modalContext.modals.length - 1) {
                window.history.pushState({}, "", "#" + this.modalContext.modals[this.modalContext.modals.length - 1].el.getAttribute('id'));
            } else {
                window.history.pushState({}, "", "#");
            }
        }
    }

    openModalFromHash = (hash: string) => {
        const modalId = this.getModalNameFromHash(hash);

        if (!modalId) {
            return;
        }

        if (!document.getElementById(modalId)) {
            console.warn(`No modal with id ${hash} found`)
            return;
        }

        void this.modalContext?.init(document.getElementById(modalId));
    }

    getModalNameFromHash = (hash: string) => {
        const searchResult = hash.match(new RegExp(`^#(${this.hashCatchPrefix}-[a-zA-Z0-9-]+)$`));
        return searchResult ? searchResult[1] : null;
    }
}