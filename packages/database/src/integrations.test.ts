import { describe, expect, it } from "vitest";
import { prisma, getOrgIntegration, setOrgIntegration } from "./index";

const enabled = Boolean(process.env.DATABASE_URL);

describe.skipIf(!enabled)("org integrations (integration)", () => {
  it("upserts partial config (undefined = unchanged, null = clear)", async () => {
    const org = await prisma.organization.create({
      data: { name: "T", slug: `int-${Date.now()}` },
    });

    await setOrgIntegration(org.id, null, {
      slackWebhookUrl: "https://hooks.slack.com/services/x",
      digestEnabled: false,
    });
    expect(await getOrgIntegration(org.id)).toMatchObject({
      slackWebhookUrl: "https://hooks.slack.com/services/x",
      discordWebhookUrl: null,
      digestEnabled: false,
    });

    // Only discord in the patch → slack is left unchanged.
    await setOrgIntegration(org.id, null, {
      discordWebhookUrl: "https://discord.com/api/webhooks/1/x",
    });
    const merged = await getOrgIntegration(org.id);
    expect(merged!.slackWebhookUrl).toBe("https://hooks.slack.com/services/x");
    expect(merged!.discordWebhookUrl).toBe("https://discord.com/api/webhooks/1/x");

    // null clears (disconnect).
    await setOrgIntegration(org.id, null, { slackWebhookUrl: null });
    expect((await getOrgIntegration(org.id))!.slackWebhookUrl).toBeNull();

    await prisma.organization.delete({ where: { id: org.id } });
  });
});
