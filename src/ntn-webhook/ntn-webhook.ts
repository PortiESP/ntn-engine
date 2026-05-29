import { BaseWebhookPayload, PagePropertiesUpdatedWebhookPayload } from "@notionhq/client";
import crypto from "crypto";

const getWebhookToken = (): string => process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN ?? "";

/**
 * Handles the Notion webhook verification.
 * 
 * 1. Check if the body contains a verification token (only happens when the webhook is created).
 * 2. Check request integrity using the verification token.
 * 
 * @param body Request body.
 * @param signature Request signature from the request headers ["x-notion-signature"].
 */
export const handleWebhookVerification = async (body: BaseWebhookPayload, signature: string): Promise<void> => {
    // If the body contains a verification token, print it and return. (that's not a real webhook event)
    if (checkIsVerificationTokenMessage(body)) return;

    // Check request integrity — throws on failure so callers can handle it
    if (!checkRequestIntegrity(body, signature)) throw new Error("Invalid Notion signature");
}


/**
 * Checks if the body contains a verification token.
 * 
 * The verification token is a token that is sent by Notion to verify that the webhook is working. Is only sent when the webhook is created (we can ask Notion to resend the token).
 * We will need to copy this token into the Notion private integrations page, in our integration settings, in the Webhook tab (click the verify button).
 * Once the verification is done, we can use this token to verify future webhook requests integrity. Thats why we should copy the token also in the NOTION_WEBHOOK_VERIFICATION_TOKEN variable in the .env file.
 * 
 * @param body Request body.
 * @returns True if the request is a verification token message, false otherwise.
 */
function checkIsVerificationTokenMessage(body: Record<string, any>): boolean {
    if (body.verification_token) {
        console.log(`[NOTION VERIFICATION TOKEN]: ${body.verification_token}`);
        console.log('[INFO] Copy and paste the verification token:');
        console.log('          1. In the NOTION_WEBHOOK_VERIFICATION_TOKEN variable in the .env file');
        console.log('          2. In the Notion integrations page, in the Webhook tab (click the verify button)');
        return true
    }

    return false
}

/**
 * Verifies the webhook signature to ensure the request is from Notion.
 */
function checkRequestIntegrity(body: Record<string, any>, signature: string): boolean {
    const secret = getWebhookToken();
    if (!secret) {
        console.error("[ERROR] WebhookVerificationError: NOTION_WEBHOOK_VERIFICATION_TOKEN not configured");
        return false;
    }

    if (!signature?.startsWith("sha256=")) {
        console.error("[ERROR] WebhookVerificationError: Invalid Notion signature format");
        return false;
    }

    // Stringify the parsed body to compute the HMAC hash
    const rawBody = JSON.stringify(body);
    const expected = `sha256=${crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex")}`;

    if (signature.length !== expected.length) {
        console.error("[ERROR] WebhookVerificationError: Invalid Notion signature length");
        return false;
    }

    // Use timing-safe comparison to prevent timing attacks.
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        console.error("[ERROR] WebhookVerificationError: Invalid Notion signature mismatch");
        return false;
    }

    return true;
}