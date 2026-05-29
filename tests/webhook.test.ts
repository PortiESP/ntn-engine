/**
 * Webhook signature verification tests.
 * These are pure logic tests — no Notion API calls are made.
 * They generate valid/invalid HMAC signatures in-process.
 */
import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { handleWebhookVerification } from "../src/ntn-webhook/ntn-webhook.js";

// A real payload and a matching signature we compute ourselves
const SECRET  = "test_webhook_secret_abc123";
const PAYLOAD = { type: "page.content_updated", data: { parent: { data_source_id: "db-1" } } };
const BODY    = JSON.stringify(PAYLOAD);
const VALID_SIG = `sha256=${crypto.createHmac("sha256", SECRET).update(BODY).digest("hex")}`;

describe("handleWebhookVerification", () => {
    // Set the env var inside hooks — module-level assignments run before any tests
    // execute, so they would be overwritten by the module-level restore at the bottom.
    before(() => { process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN = SECRET; });
    after(() => { delete process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN; });
    describe("verification token handshake", () => {
        test("does not throw when body contains a verification_token", async () => {
            // Notion sends this during webhook setup — it is not a real event
            await assert.doesNotReject(
                () => handleWebhookVerification({ verification_token: "abc" } as any, "any")
            );
        });
    });

    describe("signature validation", () => {
        test("does not throw for a valid signature", async () => {
            await assert.doesNotReject(
                () => handleWebhookVerification(PAYLOAD as any, VALID_SIG)
            );
        });

        test("throws for a completely wrong signature", async () => {
            await assert.rejects(
                () => handleWebhookVerification(PAYLOAD as any, "sha256=deadbeef"),
                /signature/i
            );
        });

        test("throws for a signature without the sha256= prefix", async () => {
            const raw = crypto.createHmac("sha256", SECRET).update(BODY).digest("hex");
            await assert.rejects(
                () => handleWebhookVerification(PAYLOAD as any, raw),
                /signature/i
            );
        });

        test("throws for an empty signature", async () => {
            await assert.rejects(
                () => handleWebhookVerification(PAYLOAD as any, ""),
                /signature/i
            );
        });

        test("throws when signature is for a different payload", async () => {
            const otherSig = `sha256=${crypto.createHmac("sha256", SECRET).update("{}").digest("hex")}`;
            await assert.rejects(
                () => handleWebhookVerification(PAYLOAD as any, otherSig),
                /signature/i
            );
        });

        test("throws when NOTION_WEBHOOK_VERIFICATION_TOKEN is not set", async () => {
            const saved = process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN;
            delete process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN;
            await assert.rejects(
                () => handleWebhookVerification(PAYLOAD as any, VALID_SIG)
            );
            process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN = saved;
        });
    });
});
