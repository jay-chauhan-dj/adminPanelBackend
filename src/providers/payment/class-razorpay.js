const Razorpay = require('razorpay');
const Logger = require('../../utils/logs/Logger');
const MySQL = require('../../utils/db/Mysql');
const tables = require('../../config/tables');

class RazorpayConnector {
    constructor(sandbox = false) {
        this.logger = new Logger();
        this.db = new MySQL();
        this.razorpay = null;
        this.sandbox = sandbox;
        this.pgId = null;
    }

    async #setup() {
        try {
            await this.db.connect();

            const razorpayConfig = await this.db.table(tables.TBL_PAYMENT_GATEWAY)
                .select('pgId', 'pgToken', 'pgSecret')
                .where('pgName', 'Razorpay')
                .where('pgSandBox', this.sandbox ? '1' : '0')
                .where('pgIsActive', '1')
                .orderBy('pgId', 'desc')
                .first();

            if (razorpayConfig) {
                this.razorpay = new Razorpay({
                    key_id: razorpayConfig.pgToken,
                    key_secret: razorpayConfig.pgSecret,
                });
                this.pgId = razorpayConfig.pgId;
                return true;
            }
            else {
                return false;
            }

        } catch (error) {
            // Log any setup errors
            this.logger.write("Something went wrong in setup: " + error, "payment/razorpay/setup");
            return false;  // Setup failure due to error
        } finally {
            this.db.disconnect();
        }
    }

    async createPaymentLink(linkConfig) {
        const setupSuccess = await this.#setup();
        if (!setupSuccess) return false;

        try {
            const request = {
                reference_id: linkConfig.linkIdFormatted,
                amount: parseFloat(linkConfig.linkAmount) * 100,
                currency: linkConfig.currency,
                accept_partial: linkConfig.partialPayments,
                description: linkConfig.linkPurpose,
                customer: {
                    name: linkConfig.customerDetails.customer_name,
                    email: linkConfig.customerDetails.customer_email,
                    contact: linkConfig.customerDetails.customer_phone,
                },
                notify: linkConfig.linkNotification,
                reminder_enable: linkConfig.autoReminders,
                notes: linkConfig.notes,
            }

            const pgResponse = await this.razorpay.paymentLink.create(request);
            if (pgResponse.error) {
                this.logger.write("Something went wrong in link creation: " + JSON.stringify(pgResponse), "payment/razorpay/payment-link/create");
                return false; 
            } else {
                const response = {
                    linkId: pgResponse.id,
                    linkIdFormatted: pgResponse.reference_id,
                    linkGateway: this.pgId,
                    linkUrl: pgResponse.short_url,
                    linkQr: "",
                    linkPurpose: pgResponse.description,
                    linkAmount: pgResponse.amount
                };
                this.logger.write("link created Successfully: " + JSON.stringify(pgResponse), "payment/razorpay/payment-link/create");
                return response;
            }
        } catch (error) {
            // Log any setup errors
            this.logger.write("Something went wrong in link creation: " + JSON.stringify(error), "payment/razorpay/payment-link/create");

            return false;  // Setup failure due to error
        }
    }
}

module.exports = RazorpayConnector;