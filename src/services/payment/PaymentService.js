const Logger = require('../../utils/logs/Logger');  // Import Logger class for logging purposes
const MySQL = require('../../utils/db/Mysql');  // Import MySQL class for database operations
const tables = require('../../config/tables');  // Import table configuration constants
const { getOption, setOption, stringPad, date } = require('../../utils/functions');
const WhatsappService = require('../WhatsappService');
const Email = require('../../utils/mail/Mail');

class PaymentService {
    constructor(sandbox = false) {
        this.logger = new Logger();
        this.db = new MySQL();
        this.paymentGateway = null;
        this.sandbox = sandbox;
    }

    async #setup() {
        try {
            // Retrieve the active payment gateway from the database or configuration
            const activeGateway = await getOption('activePaymentGateway'); // Example: 'cashfree' or 'razorpay'

            // Dynamically construct the file path and load the corresponding class
            const gatewayClassPath = `../../providers/payment/class-${activeGateway}.js`;            
            const GatewayClass = require(gatewayClassPath);

            // Initialize the payment gateway class
            this.paymentGateway = new GatewayClass(this.sandbox); // Example: use sandbox flag
            
            return true;
        } catch (error) {
            this.logger.write('Error initializing payment gateway: ' + JSON.stringify(error), 'payment/error');
            return false;
        }
    }

    async createPaymentLink(linkConfig, contactId, linkType) {
        try {
            await this.db.connect();
            const paymentId = await this.#generatePaymentId(linkType);

            const customer = await this.db.table(tables.TBL_CONTACTS + " c")
                .join(tables.TBL_CONTACT_INFORMATIONS + " ci", "ci.contactId=c.contactId")
                .select("c.contactFirstName", "c.contactLastName", "ci.contactInformationCategory", "ci.contactInformationValue")
                .where("c.contactId", contactId)
                .where("ci.contactInformationType", "0")
                .where("ci.contactInformationIsActive", "1")
                .rawWhere("ci.contactInformationCategory IN ('0', '2')")
                .get();

            const customerDetails = {
                customer_name: customer[0].contactFirstName + " " + customer[0].contactLastName
            };

            customer.forEach(contactDetail => {
                if (contactDetail.contactInformationCategory == 0) {
                    customerDetails.customer_phone = contactDetail.contactInformationValue;
                } else if (contactDetail.contactInformationCategory == 2) {
                    customerDetails.customer_email = contactDetail.contactInformationValue;
                }
            });

            const request = {
                "linkAmount": linkConfig.amount,
                "currency": "INR",
                "partialAmount": "0",
                "linkIdFormatted": paymentId,
                "partialPayments": false,
                "customerDetails": customerDetails,
                "linkExpiry": linkConfig.linkExpiryTime,
                "linkPurpose": linkConfig.linkPurpose,
                "linkNotification": linkConfig.linkNotify,
                "autoReminders": false,
                "notes": {},
                "meta": {
                    "notify_url": "https://www.dj-jay.in",
                    "upi_intent": false,
                    "return_url": "https://www.dj-jay.in"
                }
            }

            await this.#setup();
            // Create a payment link for the unique payment ID
            const paymentLink = await this.paymentGateway.createPaymentLink(request);

            const linkDetails = {
                linkPgId: paymentLink.linkId,
                linkIdFormatted: paymentLink.linkIdFormatted,
                linkGateway: paymentLink.linkGateway,
                linkContactId: contactId,
                linkUrl: paymentLink.linkUrl,
                linkQr: paymentLink.linkQr,
                linkPurpose: paymentLink.linkPurpose,
                linkAmount: paymentLink.linkAmount,
                linkStatus: '0',
                linkExpiry: linkConfig.linkExpiryTime,
                linkNotification: linkConfig.linkNotify,
            };

            // Store the payment link in the database
            await this.db.table(tables.TBL_PAYMENT_LINKS).insert(linkDetails);

            const templateParams = [
                customerDetails.customer_name,
                paymentLink.linkPurpose,
                (parseFloat(paymentLink.linkAmount) / 100).toString(),
                "2 Hours",
                paymentLink.linkUrl,
                paymentLink.linkUrl.replace("https://rzp.io/", "")
            ];

            const whatsapp = new WhatsappService();
            const templateId = await whatsapp.getTemplateIdByName('payment_link_razorpay');
            await whatsapp.sendTemplateMessage(customerDetails.customer_phone, templateId, templateParams);

            // const to = customerDetails.customer_email; // Get the recipient's email address from the request body

            // // Prepare the email template data from the request body
            // const templateData = {
            //     name: customerDetails.customer_name,
            //     linkPurpose: paymentLink.linkPurpose,
            //     linkAmount: paymentLink.link_amount.toString(),
            //     linkExpiryTime: date("DD MMMM, YYYY HH:mm A", linkConfig.linkExpiryTime),
            //     linkUrl: paymentLink.linkUrl,
            // };
            // const email = new Email(); // Create a new instance of the Email utility
            // await email.sendEmailTemplate(5, templateData, to); // Send the email using the specified template and data

            return paymentLink;
        } catch (error) {
            this.logger.write('Error creating payment link:' + error, 'payment/error');
            return false;
        }
    }

    async handleWebhook(data) {
        try {
            switch (data.type) {
                case 'PAYMENT_LINK_EVENT':
                    const details = data.data;
                    const linkConfig = {
                        pgLinkId: details.cf_link_id,
                        linkIdFormated: details.link_id,
                        paidAmount: details.link_amount_paid,
                        linkStatus: details.link_status,
                        eventTime: data.event_time
                    };
                    return await this.#updatePaymentLinkStatus(linkConfig);
            }
        } catch (error) {
            this.logger.write('Error handling webhook: ' + error, 'payment/error');
            return false;
        }
    }
    async #generatePaymentId(linkType) {
        try {
            var linkNumber = await getOption('paymentLinkNumber');
            var paymentLinkIdPrefix = await getOption('paymentLinkIdPrefix');
            paymentLinkIdPrefix = JSON.parse(paymentLinkIdPrefix);
            var currentFinancialYear = await getOption('currentFinancialYear');
            const paymentId = paymentLinkIdPrefix[linkType] + '-' + currentFinancialYear + '-' + stringPad((parseInt(linkNumber) + 1), 6, '0');
            await setOption('paymentLinkNumber', (parseInt(linkNumber) + 1));
            return paymentId;
        } catch (error) {
            this.logger.write('Error generating payment ID:' + error, 'payment/error');
            return false;
        }
    }

    async #updatePaymentLinkStatus(linkConfig) {
        try {
            await this.db.connect();
            const linkStatus = JSON.parse(await getOption("cashfreeLinkStatusMap"))[linkConfig.linkStatus];

            var updateDetails = {
                linkStatus: linkStatus,
            };
            switch (linkConfig.linkStatus) {
                case "PAID":
                    updateDetails["linkPaidAt"] = date("YYYY-MM-DD HH:mm:ss", linkConfig.eventTime);
                    break;
                case "EXPIRED":
                    updateDetails["linkExpiredAt"] = date("YYYY-MM-DD HH:mm:ss", linkConfig.eventTime);
                    break;
                case "CANCELLED":
                    updateDetails["linkFailedAt"] = date("YYYY-MM-DD HH:mm:ss", linkConfig.eventTime);
                    break;
                case "PARTIALLY_PAID":
                    updateDetails["linkFailedAt"] = date("YYYY-MM-DD HH:mm:ss", linkConfig.eventTime);
                    break;
            }

            return await this.db.table(tables.TBL_PAYMENT_LINKS)
                .where("linkPgId", linkConfig.pgLinkId)
                .where("linkIdFormatted", linkConfig.linkIdFormated)
                .update(updateDetails);
        } catch (error) {
            this.logger.write('Error updating link details: ' + error, 'payment/error');
            return false;
        }
    }

    async createPayoutLink(linkConfig, contactId, linkType) {
        try {
            this.db.connect();
            const paymentId = await this.#generatePaymentId(linkType);

            const customer = await this.db.table(tables.TBL_CONTACTS + " c")
                .join(tables.TBL_CONTACT_INFORMATIONS + " ci", "ci.contactId=c.contactId")
                .select("c.contactFirstName", "c.contactLastName", "ci.contactInformationCategory", "ci.contactInformationValue")
                .where("c.contactId", contactId)
                .where("ci.contactInformationType", "0")
                .where("ci.contactInformationIsActive", "1")
                .rawWhere("ci.contactInformationCategory IN ('0', '2')")
                .get();

            const customerDetails = {
                customer_name: customer[0].contactFirstName + " " + customer[0].contactLastName
            };

            customer.forEach(contactDetail => {
                if (contactDetail.contactInformationCategory == 0) {
                    customerDetails.customer_phone = contactDetail.contactInformationValue;
                } else if (contactDetail.contactInformationCategory == 2) {
                    customerDetails.customer_email = contactDetail.contactInformationValue;
                }
            });

            const request = {
                linkAmount: linkConfig.amount,
                currency: "INR",
                partialAmount: "0",
                linkIdFormatted: paymentId,
                customerDetails: customerDetails,
                linkPurpose: linkConfig.linkPurpose,
                description: linkConfig.description,
                linkNotification: linkConfig.linkNotify,
                autoReminders: false,
                upiId: linkConfig.upiId,
                bankDetails: linkConfig.bankDetails,
                cardDetails: linkConfig.cardDetails,
                notes: {}
            }

            await this.#setup();
            const payoutLink = await this.paymentGateway.createPayoutLink(request, linkConfig.type);
            return payoutLink;
        } catch (error) {
            this.logger.write('Error creating payout link:' + error, 'payout/error');
            return false;
        }
    }
}

module.exports = PaymentService;
