'use strict';

const crypto = require('crypto');

const PURCHASE_REGEX = /(купить|оплат|заказ|оформит|корзин|подпис|перевест|списат|карт[ауы]|руб|₽|€|\$|buy|pay|checkout|place order|purchase|subscribe|confirm payment|transfer|billing|order now|stripe|paypal)/i;

class SafetyGuard {
  constructor(onChange) {
    this.ALWAYS_CONFIRM_PURCHASES = true;
    this.onChange = onChange;
    this.active = null;
    this._resolver = null;
    this._queue = Promise.resolve();
  }

  looksLikePurchase(text) {
    return PURCHASE_REGEX.test(String(text || ''));
  }

  requestConfirmation({ title, details, isPurchase }) {
    const task = () => new Promise((resolve) => {
      const id = crypto.randomUUID();
      this.active = { id, title, details, isPurchase: Boolean(isPurchase) };
      this._resolver = (approved) => {
        this.active = null;
        this._resolver = null;
        if (this.onChange) this.onChange(null);
        resolve(Boolean(approved));
      };
      if (this.onChange) this.onChange(this.active);
    });
    const next = this._queue.then(task, task);
    this._queue = next.catch(() => {});
    return next;
  }

  resolve(approved) {
    if (this._resolver) this._resolver(Boolean(approved));
  }

  cancelActive() {
    if (this._resolver) this._resolver(false);
  }
}

module.exports = { SafetyGuard };
