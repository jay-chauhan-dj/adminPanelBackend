const { Cashfree } = require("cashfree-pg");
const Logger = require('../../utils/logs/Logger');
const MySQL = require('../../utils/db/Mysql');
const tables = require('../../config/tables');

class CashFree {
    constructor(sandbox = false) {
        this.logger = new Logger();
        this.db = new MySQL();
        this.cf = null;
        this.apiVersion = null;
        this.sandbox = sandbox;
    }

    async #setup() {
        try {
            await this.db.connect();

            const cashfreeConfig = await this.db.table(tables.TBL_PAYMENT_GATEWAY)
                .select('pgToken', 'pgSecret', 'pgApiVersion')
                .where('pgName', 'Cashfree')
                .where('pgSandBox', this.sandbox ? '1' : '0')
                .where('pgIsActive', '1')
                .orderBy('pgId', 'desc')
                .first();

            if (cashfreeConfig) {
                Cashfree.XClientId = cashfreeConfig.pgToken;
                Cashfree.XClientSecret = cashfreeConfig.pgSecret;
                if (this.sandbox)
                    Cashfree.XEnvironment = Cashfree.Environment.SANDBOX;
                else
                    Cashfree.XEnvironment = Cashfree.Environment.PRODUCTION;
                this.cf = Cashfree;
                this.apiVersion = cashfreeConfig.pgApiVersion;
                return true;
            }
            else {
                return false;
            }

        } catch (error) {
            // Log any setup errors
            this.logger.write("Something went wrong in setup: " + error, "payment/cashfree/error");
            return false;  // Setup failure due to error
        }
    }

    async createPaymentLink(linkConfig) {
        const setupSuccess = await this.#setup();
        if (!setupSuccess) return false;

        try {
            const request = {
                "link_amount": linkConfig.linkAmount,
                "link_currency": linkConfig.currency,
                "link_minimum_partial_amount": linkConfig.partialAmount,
                "link_id": linkConfig.linkIdFormatted,
                "link_partial_payments": linkConfig.partialPayments,
                "customer_details": linkConfig.customerDetails,
                "link_expiry_time": linkConfig.linkExpiry,
                "link_purpose": linkConfig.linkPurpose,
                "link_notify": linkConfig.linkNotification,
                "link_auto_reminders": linkConfig.autoReminders,
                "link_notes": linkConfig.notes,
                "link_meta": linkConfig.meta
            }

            console.log(request);
            const response = await this.cf.PGCreateLink(this.apiVersion, request);
            this.logger.write("link created Successfully: " + JSON.stringify(response.data), "payment/cashfree/success");
            return response.data;
        } catch (error) {
            // Log any setup errors
            this.logger.write("Something went wrong in link creation: " + JSON.stringify(error), "payment/cashfree/error");

            return false;  // Setup failure due to error
        }
    }
}

module.exports = CashFree;