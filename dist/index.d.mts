import * as nanoevents from 'nanoevents';
import { Emitter } from 'nanoevents';

interface SXModalOptions {
    closable?: boolean;
    onOpening?: (modal: HTMLElement) => Promise<void>;
    onOpen?: (modal: HTMLElement) => void;
    onClosing?: (modal: HTMLElement) => Promise<void>;
    onClose?: (modal: HTMLElement) => void;
    transitionDuration?: number;
}
interface BindEvent {
    el: Element;
    name: string;
    callback: () => {};
}
interface ModalItem {
    previousActiveElement: HTMLElement;
    el: HTMLElement;
    options: SXModalOptions;
    events: BindEvent[];
}
interface HookOptions {
    modalId: string;
    options: SXModalOptions;
}
interface IModal {
    modals: ModalItem[];
    init(querySelectorOrId: HTMLElement | string, options?: SXModalOptions): void;
    emitter: Emitter;
}
interface IModule {
    modalInit(): void;
    modalDestroy(): void;
}
interface IModuleConstructable {
    new (modalActions: IModal): IModule;
}
interface EventParams {
    modal: ModalItem;
    callback: () => void;
}
interface Events {
    dialogDestroying: (params: EventParams) => void;
    dialogDestroy: (modal: ModalItem) => void;
}
declare class Modal implements IModal {
    protected isInitialized: boolean;
    protected BASE_Z_INDEX: number;
    protected TAB_QUERY_SELECTORS: string;
    protected modalsEnabled: boolean;
    protected hookOptionsList: HookOptions[];
    protected connectedModules: IModule[];
    protected keyDownEvent: () => void;
    modals: ModalItem[];
    emitter: Emitter;
    constructor();
    on<E extends keyof Events>(event: E, callback: Events[E]): nanoevents.Unsubscribe;
    protected updateScrollbarBuffer(): void;
    protected openModal(modalEl: HTMLElement, options?: SXModalOptions): Promise<void>;
    protected destroyModal(modal: ModalItem): void;
    protected onDocumentClick(e: Event): void;
    protected onKeyEvent(e: KeyboardEvent): void;
    protected destroyModalClickEvent(e: Event): void;
    protected updateModals(): void;
    start(modules?: IModuleConstructable[]): this;
    addOptionsHook(modalId: string, options: SXModalOptions): void;
    init(querySelectorOrId: HTMLElement | string, options?: SXModalOptions): void;
    destroy(querySelectorOrId: HTMLElement | string): void;
}
declare const _default: Modal;

export { type BindEvent, type EventParams, type Events, type HookOptions, type IModal, type IModule, type IModuleConstructable, type ModalItem, type SXModalOptions, _default as default };
