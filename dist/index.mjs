var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/index.ts
import { createNanoEvents } from "nanoevents";
var Modal = class {
  constructor() {
    this.isInitialized = false;
    this.BASE_Z_INDEX = 100;
    this.TAB_QUERY_SELECTORS = 'a[href]:not([disabled]),button:not([disabled]),textarea:not([disabled]),input[type="submit"]:not([disabled]),input[type="text"]:not([disabled]),input[type="radio"]:not([disabled]),input[type="checkbox"]:not([disabled]),select:not([disabled])';
    this.modalsEnabled = false;
    this.hookOptionsList = [];
    this.connectedModules = [];
    this.modals = [];
    this.emitter = createNanoEvents();
    this.updateScrollbarBuffer();
  }
  on(event, callback) {
    return this.emitter.on(event, callback);
  }
  // https://stackoverflow.com/questions/13382516/getting-scroll-bar-width-using-javascript
  updateScrollbarBuffer() {
    const outer = document.createElement("div");
    outer.style.visibility = "hidden";
    outer.style.overflow = "scroll";
    document.body.appendChild(outer);
    const inner = document.createElement("div");
    outer.appendChild(inner);
    const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
    outer.parentNode.removeChild(outer);
    document.body.style.setProperty("--scroll-bar-buffer", scrollbarWidth + "px");
  }
  openModal(_0) {
    return __async(this, arguments, function* (modalEl, options = {}) {
      for (const modal of this.modals) {
        if (modal.el === modalEl) {
          return;
        }
      }
      const defaultOptions = {
        closable: true,
        onOpening: null,
        onOpen: null,
        onClosing: null,
        onClose: null,
        transitionDuration: 300
      };
      let alteredOptions = __spreadValues({}, defaultOptions);
      for (const hook of this.hookOptionsList) {
        if (hook.modalId === modalEl.getAttribute("id")) {
          alteredOptions = __spreadValues(__spreadValues({}, alteredOptions), hook.options);
        }
      }
      alteredOptions = __spreadValues(__spreadValues({}, alteredOptions), options);
      modalEl.style.zIndex = (this.BASE_Z_INDEX + this.modals.length).toString();
      modalEl.setAttribute("tabindex", "-1");
      modalEl.classList.add("showing");
      modalEl.classList.add("shown");
      if (alteredOptions.onOpening) {
        let isFullFilled = false;
        setTimeout(() => {
          if (!isFullFilled) {
            modalEl.classList.add("loading");
          }
        }, 20);
        yield alteredOptions.onOpening(modalEl).catch(() => {
          modalEl.classList.remove("loading");
          modalEl.classList.remove("shown");
          modalEl.classList.remove("showing");
          throw new Error("Impossible to create a modal window with an opening callback: " + alteredOptions.onOpening);
        });
        isFullFilled = true;
        modalEl.classList.remove("loading");
      }
      if (modalEl.querySelector(".sx-modal-dialog").clientHeight > window.innerHeight) {
        modalEl.classList.add("scrollable");
      } else {
        modalEl.classList.remove("scrollable");
      }
      void modalEl.offsetWidth;
      modalEl.classList.add("visible");
      setTimeout(() => {
        var _a;
        modalEl.classList.add("released");
        modalEl.classList.remove("showing");
        (_a = modalEl.querySelectorAll(this.TAB_QUERY_SELECTORS)[0]) == null ? void 0 : _a.focus();
      }, alteredOptions.transitionDuration + 100);
      const events = [];
      modalEl.querySelectorAll(".js-action-close").forEach((closeEl) => {
        events.push({
          el: closeEl,
          name: "click",
          callback: this.destroyModalClickEvent.bind(this)
        });
      });
      events.push({
        el: modalEl,
        name: "click",
        callback: this.onDocumentClick.bind(this)
      });
      events.push({
        el: modalEl,
        name: "keydown",
        callback: this.onKeyEvent.bind(this)
      });
      for (const event of events) {
        event.el.addEventListener(event.name, event.callback);
      }
      this.modals.push({
        previousActiveElement: document.activeElement,
        el: modalEl,
        options: alteredOptions,
        events
      });
      this.updateModals();
    });
  }
  destroyModal(modal) {
    const wrapper = {
      modal,
      callback: () => {
        const modalEl = modal.el;
        modalEl.classList.add("hiding");
        modalEl.classList.remove("visible");
        modalEl.classList.remove("released");
        setTimeout(() => {
          var _a;
          modalEl.classList.remove("shown");
          modalEl.classList.remove("hiding");
          (_a = modal.previousActiveElement) == null ? void 0 : _a.focus();
          this.updateModals();
        }, modal.options.transitionDuration);
        for (const event of modal.events) {
          event.el.removeEventListener(event.name, event.callback);
        }
        if (modal.options.onClose) {
          modal.options.onClose(modalEl);
        }
        this.modals = this.modals.filter((modal2) => {
          return modalEl !== modal2.el;
        });
      }
    };
    this.emitter.emit("dialogDestroying", wrapper);
    wrapper.callback();
  }
  onDocumentClick(e) {
    if (e.target.closest(".js-sx-modal-dialog-body")) {
      return;
    }
    if (this.modals[this.modals.length - 1].options.closable === true) {
      this.destroyModal(this.modals[this.modals.length - 1]);
    }
  }
  onKeyEvent(e) {
    if (e.key === "Escape" && this.modals[this.modals.length - 1].options.closable === true) {
      this.destroyModal(this.modals[this.modals.length - 1]);
      return;
    }
    const focusableEls = this.modals[this.modals.length - 1].el.querySelectorAll(this.TAB_QUERY_SELECTORS);
    const firstFocusableEl = focusableEls[0];
    const lastFocusableEl = focusableEls[focusableEls.length - 1];
    const isTabPressed = e.key === "Tab";
    if (!isTabPressed) {
      return;
    }
    if (!this.modals[this.modals.length - 1].el.contains(document.activeElement)) {
      if (firstFocusableEl) {
        firstFocusableEl.focus();
      }
      e.preventDefault();
    } else if (e.shiftKey) {
      if (document.activeElement === firstFocusableEl) {
        lastFocusableEl.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastFocusableEl) {
        firstFocusableEl.focus();
        e.preventDefault();
      }
    }
  }
  destroyModalClickEvent(e) {
    const modalEl = e.target.closest(".sx-modal");
    const modal = this.modals.find((modal2) => {
      return modalEl === modal2.el;
    });
    if (!modal) {
      return;
    }
    this.destroyModal(modal);
  }
  updateModals() {
    if (this.modals.length > 0) {
      if (this.modalsEnabled) {
        return;
      }
      this.modalsEnabled = true;
      document.body.classList.add("has-active-sx-modal");
    } else {
      if (!this.modalsEnabled) {
        return;
      }
      this.modalsEnabled = false;
      document.body.classList.remove("has-active-sx-modal");
    }
  }
  start(modules) {
    if (this.isInitialized) {
      console.warn("SXModal: Already initialized");
      return this;
    }
    this.keyDownEvent = this.onKeyEvent.bind(this);
    for (const module of modules != null ? modules : []) {
      const moduleInstance = new module(this);
      moduleInstance.modalInit();
      this.connectedModules.push(moduleInstance);
    }
    this.isInitialized = true;
  }
  addOptionsHook(modalId, options) {
    this.hookOptionsList.push({ modalId, options });
  }
  init(querySelectorOrId, options = {}) {
    let modalEl;
    if (querySelectorOrId instanceof HTMLElement) {
      modalEl = querySelectorOrId;
    } else if (typeof querySelectorOrId === "string") {
      modalEl = document.querySelector(querySelectorOrId);
    }
    if (!modalEl) {
      return;
    }
    void this.openModal(modalEl, options);
  }
  destroy(querySelectorOrId) {
    let modalEl;
    if (querySelectorOrId instanceof HTMLElement) {
      modalEl = querySelectorOrId;
    } else if (typeof querySelectorOrId === "string") {
      modalEl = document.querySelector(querySelectorOrId);
    }
    if (!modalEl) {
      return;
    }
    for (const modal of this.modals) {
      if (modal.el === modalEl) {
        void this.destroyModal(modal);
      }
    }
  }
};
var src_default = new Modal();
export {
  src_default as default
};
//# sourceMappingURL=index.mjs.map