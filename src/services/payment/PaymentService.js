const CashFree = require('../../providers/payment/class-cashfree');
const Logger = require('../../utils/logs/Logger');  // Import Logger class for logging purposes
const MySQL = require('../../utils/db/Mysql');  // Import MySQL class for database operations
const tables = require('../../config/tables');  // Import table configuration constants
const { getOption, setOption, stringPad } = require('../../utils/functions');
const WhatsappService = require('../WhatsappService');

class PaymentService {
    constructor(sandbox = false) {
        this.logger = new Logger();
        this.db = new MySQL();
        this.cf = new CashFree(sandbox);
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
                "meta": {}
            }

            // Create a payment link for the unique payment ID
            const paymentLink = await this.cf.createPaymentLink(request);

            const linkDetails = {
                linkPgId: paymentLink.cf_link_id,
                linkIdFormatted: paymentLink.link_id,
                linkGateway: 1,
                linkContactId: contactId,
                linkUrl: paymentLink.link_url,
                linkPurpose: paymentLink.link_purpose,
                linkAmount: paymentLink.link_amount,
                linkStatus: '0',
                linkExpiry: paymentLink.link_expiry_time,
                linkNotification: linkConfig.linkNotify,
            };

            // Store the payment link in the database
            await this.db.table(tables.TBL_PAYMENT_LINKS).insert(linkDetails);

            const templateParams = [
                customerDetails.customer_name,
                paymentLink.link_purpose,
                paymentLink.link_amount.toString(),
                paymentLink.link_expiry_time,
                paymentLink.link_url,
                paymentLink.link_url.split('/').pop()
            ];

            const whatsapp = new WhatsappService();
            const templateId = await whatsapp.getTemplateIdByName('payment_link');
            const response = await whatsapp.sendTemplateMessage(customerDetails.customer_phone, templateId, templateParams);

            return paymentLink;
        } catch (error) {
            this.logger.write('Error creating payment link:' + error, 'payment/error');
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
}

module.exports = PaymentService;
