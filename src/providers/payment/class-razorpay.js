const Razorpay = require('razorpay');
const Logger = require('../../utils/logs/Logger');
const MySQL = require('../../utils/db/Mysql');
const tables = require('../../config/tables');
const axios = require('axios');

class RazorpayConnector {
    constructor(sandbox = false) {
        this.logger = new Logger();
        this.db = new MySQL();
        this.razorpay = null;
        this.sandbox = sandbox;
        this.pgId = null;
        this.accountNumber = null;
        this.auth = null;;

    }

    async #setup() {
        try {
            await this.db.connect();

            const razorpayConfig = await this.db.table(tables.TBL_PAYMENT_GATEWAY + " pg")
                .join(tables.TBL_BANK_DETAILS + " b", "b.bankId=pg.pgBankAccountLinked")
                .select('pg.pgId', 'pg.pgToken', 'pg.pgSecret', "b.bankAccountNumber")
                .where('pg.pgName', 'Razorpay')
                .where('pg.pgSandBox', this.sandbox ? '1' : '0')
                .where('pg.pgIsActive', '1')
                .orderBy('pg.pgId', 'desc')
                .first();

            if (razorpayConfig) {
                this.razorpay = new Razorpay({
                    key_id: razorpayConfig.pgToken,
                    key_secret: razorpayConfig.pgSecret,
                });
                this.pgId = razorpayConfig.pgId;
                this.accountNumber = razorpayConfig.bankAccountNumber;
                this.auth = Buffer.from(`${razorpayConfig.pgToken}:${razorpayConfig.pgSecret}`).toString('base64');
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

    async createPayoutLink(linkConfig, payoutType) {
        const setupSuccess = await this.#setup();
        if (!setupSuccess) return false;

        var fundAccount = {};
        var mode = linkConfig.mode;
        try {
            switch (payoutType) {
                case "upi":
                    fundAccount = {
                        account_type: "vpa",
                        vpa: {
                            address: linkConfig.upiId
                        }
                    }
                    break;

                case "bank":
                    fundAccount = {
                        account_type: "bank_account",
                        bank_account: {
                            name: linkConfig.bankDetails.customerName,
                            account_number: linkConfig.bankDetails.accountNumber,
                            ifsc: linkConfig.bankDetails.ifscCode
                        }
                    };
                    break;

                case "cards":
                    fundAccount = {
                        account_type: "card",
                        card: {
                            card_number: linkConfig.cardDetails.cardNumber,
                            card_network: linkConfig.cardDetails.cardType
                        }
                    };
                    break;
            }

            const request = {
                account_number: this.accountNumber,
                reference_id: linkConfig.linkIdFormatted,
                amount: parseFloat(linkConfig.linkAmount) * 100,
                currency: linkConfig.currency,
                purpose: linkConfig.purpose,
                fund_account: fundAccount,
                recipient: linkConfig.customerDetails.customer_name,
                description: linkConfig.description,
                notes: {},
                queue_if_low_balance: true
            }

            const pgResponse = await axios.post(
                'https://api.razorpay.com/v1/payout-links',
                request,
                {   
                    headers: {
                        Authorization: `Basic ${this.auth}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            // const pgResponse = await this.razorpay.payoutLink.create(request);
            if (pgResponse.error) {
                this.logger.write("Something went wrong in link creation: " + JSON.stringify(pgResponse), "payout/razorpay/payout-link/create");
                return false;
            } else {
                // const response = {
                //     linkId: pgResponse.id,
                //     linkIdFormatted: pgResponse.reference_id,
                //     linkGateway: this.pgId,
                //     linkUrl: pgResponse.short_url,
                //     linkQr: "",
                //     linkPurpose: pgResponse.description,
                //     linkAmount: pgResponse.amount
                // };
                this.logger.write("link created Successfully: " + JSON.stringify(pgResponse), "payout/razorpay/payout-link/create");
                return pgResponse;
            }
        } catch (error) {
            console.log(error);
            
            // Log any setup errors
            this.logger.write("Something went wrong in link creation: " + JSON.stringify(error), "payout/razorpay/payout-link/create");

            return false;  // Setup failure due to error
        }
    }
}

module.exports = RazorpayConnector;